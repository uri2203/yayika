// ============================================================
// Yayika — AI Cycle Coach Edge Function
// Generates personalized daily coaching based on cycle data
// Deploy: supabase functions deploy ai-cycle-coach --no-verify-jwt
// Env vars needed: GROQ_API_KEY or OPENAI_API_KEY
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const apiKey = groqKey || openaiKey;

    const { user_id, cycle_phase, cycle_day, energy_level, mood, symptoms, recent_logs, lang } = await req.json();

    // If no LLM key, return rule-based coaching (still useful!)
    if (!apiKey) {
      const coaching = generateFallbackCoaching(cycle_phase, energy_level, mood, symptoms, lang || "es");
      
      // Store in DB
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        if (supabaseUrl && supabaseKey && user_id) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase.from("yayika_cycle_coaching").upsert({
            user_id,
            coaching_text: coaching,
            cycle_phase,
            cycle_day,
            energy_level,
            mood,
            symptoms: symptoms || [],
            generated_date: new Date().toISOString().split("T")[0],
          }, { onConflict: "user_id,generated_date" });
        }
      } catch (e) {
        console.warn("Failed to store coaching:", e);
      }

      return new Response(JSON.stringify({
        coaching,
        phase: cycle_phase,
        day: cycle_day,
        lang: lang || "es",
        source: "fallback",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from user data
    let contextBlock = "";
    
    if (cycle_phase) {
      const phaseNames: Record<string, string> = {
        menstrual: "Menstrual (días 1-5)",
        follicular: "Folicular (días 6-13)",
        ovulatory: "Ovulatoria (días 14-18)",
        luteal: "Lútea (días 19-28)"
      };
      contextBlock += `Fase actual: ${phaseNames[cycle_phase] || cycle_phase}\n`;
    }
    if (cycle_day) contextBlock += `Día del ciclo: ${cycle_day}\n`;
    if (energy_level) contextBlock += `Nivel de energía reportado: ${energy_level}/5\n`;
    if (mood) contextBlock += `Estado de ánimo: ${mood}\n`;
    if (symptoms && symptoms.length > 0) contextBlock += `Síntomas hoy: ${symptoms.join(", ")}\n`;
    if (recent_logs && recent_logs.length > 0) {
      contextBlock += `\nHistorial reciente (últimos días):\n`;
      recent_logs.forEach((log: any) => {
        contextBlock += `- ${log.log_date}: energía ${log.energy || "?"}/5, ánimo ${log.mood || "?"}, síntomas [${(log.symptoms || []).join(", ")}]\n`;
      });
    }

    const langNames: Record<string, string> = {
      es: "español", en: "English", pt: "português", fr: "français", de: "Deutsch"
    };
    const targetLang = langNames[lang] || "español";

    const systemPrompt = `Eres Laura, la coach personal de Yayika — una asistente experta en bienestar femenino, ciclos menstruales y productividad hormonal.

Tu trabajo es dar coaching personalizado, cálido y accionable basándote en los datos reales de la usuaria.

REGLAS:
1. Res SIEMPRE en ${targetLang}
2. Sé cálida pero directa — como una amiga experta
3. Máximo 3-4 oraciones por respuesta
4. Incluye SIEMPRE 1-2 acciones concretas que pueda hacer HOY
5. Usa emojis con moderación (1-2 máximo)
6. Nunca des consejos médicos — si hay síntomas severos, sugiere consultar a un profesional
7. Referenciar datos específicos de la usuaria (fase, energía, síntomas)
8. Si no hay datos suficientes, pide que registre su ciclo

ESTRUCTURA de respuesta:
- Observación personalizada (basada en sus datos)
- Consejo específico para su fase/energía
- 1-2 acciones concretas para hoy
- Motivación breve`;

    const userMessage = contextBlock
      ? `Dame mi coaching personalizado de hoy. Estos son mis datos:\n\n${contextBlock}`
      : "No tengo datos de ciclo registrados. Dame un consejo general y pídeme que registre mi ciclo.";

    // Use Groq if available, else OpenAI
    const isGroq = !!groqKey;
    const baseUrl = isGroq ? "https://api.groq.com/openai" : "https://api.openai.com";
    const model = isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`LLM error:`, err);
      return new Response(JSON.stringify({ error: "LLM request failed", details: err }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const coaching = data.choices?.[0]?.message?.content || "No pude generar tu coaching hoy. ¡Intenta de nuevo!";

    // Store coaching in DB for history
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl && supabaseKey && user_id) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("yayika_cycle_coaching").upsert({
          user_id,
          coaching_text: coaching,
          cycle_phase,
          cycle_day,
          energy_level,
          mood,
          symptoms: symptoms || [],
          generated_date: new Date().toISOString().split("T")[0],
        }, { onConflict: "user_id,generated_date" });
      }
    } catch (e) {
      console.warn("Failed to store coaching:", e);
    }

    return new Response(JSON.stringify({
      coaching,
      phase: cycle_phase,
      day: cycle_day,
      lang: lang || "es",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Cycle Coach error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// FALLBACK COACHING (rule-based, no LLM needed)
// ============================================================

function generateFallbackCoaching(phase: string | null, energy: number | null, mood: string | null, symptoms: string[], lang: string): string {
  const coaching: Record<string, Record<string, string>> = {
    es: {
      menstrual: `🩸 **Fase Menstrual** — Tu cuerpo se está renovando. Es normal tener menos energía hoy.\n\n💡 **Consejo:** Prioriza el descanso y la reflexión. No es momento de forzar la productividad.\n\n✅ **Acciones de hoy:**\n1. Toma 15 minutos para ti sin pantallas\n2. Escribe 3 cosas por las que estás agradecida`,
      follicular: `🌱 **Fase Folicular** — Tu energía está subiendo. Es el momento perfecto para empezar cosas nuevas.\n\n💡 **Consejo:** Aprovecha esta ola de energía para arrancar proyectos que has postergado.\n\n✅ **Acciones de hoy:**\n1. Identifica 1 proyecto que quieres empezar\n2. Planifica tu semana con las tareas más importantes`,
      ovulatory: `✨ **Fase Ovulatoria** — ¡Es tu momento de mayor energía y carisma! Tu comunicación está brillante.\n\n💡 **Consejo:** Hoy es ideal para negociar, presentar ideas o tener conversaciones importantes.\n\n✅ **Acciones de hoy:**\n1. Ten esa conversación que has estado posponiendo\n2. Comparte una idea o propuesta con alguien`,
      luteal: `🌙 **Fase Lútea** — Tu energía baja gradualmente. Es momento de organizar y cerrar.\n\n💡 **Consejo:** Tu cerebro analítico está en su mejor momento. Aprovecha para detalles y organización.\n\n✅ **Acciones de hoy:**\n1. Organiza tu espacio de trabajo\n2. Revisa y cierra tareas pendientes`
    },
    en: {
      menstrual: `🩸 **Menstrual Phase** — Your body is renewing itself. It's normal to have less energy today.\n\n💡 **Tip:** Prioritize rest and reflection. Now is not the time to force productivity.\n\n✅ **Today's actions:**\n1. Take 15 minutes for yourself without screens\n2. Write 3 things you're grateful for`,
      follicular: `🌱 **Follicular Phase** — Your energy is rising. Perfect time to start new things.\n\n💡 **Tip:** Ride this wave to launch projects you've been putting off.\n\n✅ **Today's actions:**\n1. Identify 1 project you want to start\n2. Plan your week with the most important tasks`,
      ovulatory: `✨ **Ovulatory Phase** — This is your peak energy and charisma moment! Your communication is shining.\n\n💡 **Tip:** Today is ideal for negotiating, presenting ideas, or having important conversations.\n\n✅ **Today's actions:**\n1. Have that conversation you've been postponing\n2. Share an idea or proposal with someone`,
      luteal: `🌙 **Luteal Phase** — Your energy gradually decreases. Time to organize and wrap up.\n\n💡 **Tip:** Your analytical brain is at its best. Use it for details and organization.\n\n✅ **Today's actions:**\n1. Organize your workspace\n2. Review and close pending tasks`
    }
  };

  const langCoaching = coaching[lang] || coaching['es'];
  let result = langCoaching[phase || 'follicular'] || langCoaching['follicular'];

  // Add symptom-specific advice
  if (symptoms && symptoms.length > 0) {
    const symptomTips: Record<string, Record<string, string>> = {
      es: {
        'Dolor de cabeza': 'Si tienes dolor de cabeza, reduce la cafeína y bebe más agua.',
        'Cólicos': 'Para los cólicos, un baño caliente o una compresa tibia pueden ayudar.',
        'Cansancio': 'El cansancio es tu cuerpo pidiendo descanso. Escúchalo.',
        'Hinchazón': 'Reduce el sodio y bebe más agua para la hinchazón.',
        'Antojos': 'Los antojos son normales en esta fase. Permítete un pequeño gusto.'
      },
      en: {
        'Dolor de cabeza': 'If you have a headache, reduce caffeine and drink more water.',
        'Cólicos': 'For cramps, a warm bath or heating pad can help.',
        'Cansancio': 'Fatigue is your body asking for rest. Listen to it.',
        'Hinchazón': 'Reduce sodium and drink more water for bloating.',
        'Antojos': 'Cravings are normal in this phase. Allow yourself a small treat.'
      }
    };
    const tips = symptomTips[lang] || symptomTips['es'];
    const relevantSymptoms = symptoms.filter((s: string) => tips[s]);
    if (relevantSymptoms.length > 0) {
      result += '\n\n🩺 **Nota sobre síntomas:** ' + relevantSymptoms.map((s: string) => tips[s]).join(' ');
    }
  }

  // Add energy-based modification
  if (energy !== null) {
    if (energy <= 2) {
      result += lang === 'es' 
        ? '\n\n⚡ **Energía baja detectada:** Permítete un día más ligero. No todo tiene que ser productivo.'
        : '\n\n⚡ **Low energy detected:** Allow yourself a lighter day. Not everything has to be productive.';
    } else if (energy >= 4) {
      result += lang === 'es'
        ? '\n\n⚡ **Alta energía:** ¡Aprovecha para hacer lo que más te cuesta en otros días!'
        : '\n\n⚡ **High energy:** Take advantage to do what\'s hardest on other days!';
    }
  }

  return result;
}
