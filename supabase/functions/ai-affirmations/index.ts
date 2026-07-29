// ============================================================
// Yayika — AI Daily Affirmations Edge Function
// Generates personalized daily affirmations based on cycle phase
// Deploy: supabase functions deploy ai-affirmations --no-verify-jwt
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

    const { user_id, cycle_phase, energy_level, mood, intention, lang, recent_affirmations } = await req.json();

    // Get today's affirmation
    const today = new Date().toISOString().split("T")[0];
    
    // Try to get from DB first (cached for today)
    let cachedAffirmation = null;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl && supabaseKey && user_id) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from("yayika_daily_affirmations")
          .select("affirmation_text, affirmation_type")
          .eq("user_id", user_id)
          .eq("affirmation_date", today)
          .maybeSingle();
        cachedAffirmation = data;
      }
    } catch (e) {
      console.warn("Cache read error:", e);
    }

    // Return cached if exists
    if (cachedAffirmation) {
      return new Response(JSON.stringify({
        affirmation: cachedAffirmation.affirmation_text,
        type: cachedAffirmation.affirmation_type,
        phase: cycle_phase,
        lang: lang || "es",
        cached: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let affirmation = "";
    let affirmationType = "phase";

    // If LLM available, generate with AI
    if (apiKey) {
      try {
        const langNames: Record<string, string> = {
          es: "español", en: "English", pt: "português", fr: "français", de: "Deutsch"
        };
        const targetLang = langNames[lang] || "español";

        const avoidList = (recent_affirmations || []).slice(0, 5).map((a: string) => `- "${a}"`).join("\n");

        const systemPrompt = `Eres Laura, la coach de bienestar de Yayika. Generas afirmaciones diarias personalizadas para mujeres.

REGLAS:
1. Res SIEMPRE en ${targetLang}
2. Máximo 2 oraciones, máximo 25 palabras
3. Usa lenguaje positivo en presente ("Soy", "Tengo", "Elijo", "Merezco")
4. Sé cálida pero poderosa — no suene a cliché
5. NUNCA repitas afirmaciones recientes de la lista
6. Adapta al ciclo: menstrual (descanso/compasión), folicular (creatividad/expansión), ovulatoria (poder/confianza), luteal (organización/cierre)
7. Incluye 1 emoji al inicio
8. Si hay mood, refleja ese estado

TIPOS de afirmación:
- "phase": basada en la fase del ciclo
- "energy": basada en el nivel de energía
- "intention": basada en la intención del día
- "mood": basada del mood

Responde SOLO con la afirmación, sin comillas ni explicaciones.`;

        const userMessage = `Genera una afirmación diaria para hoy.
Fase: ${cycle_phase || "desconocida"}
Energía: ${energy_level || "?"}/5
Mood: ${mood || "no registrado"}
Intención: ${intention || "no definida"}

Afirmaciones recientes (NO repetir):
${avoidList || "Ninguna"}`;

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
            max_tokens: 80,
            temperature: 0.9,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          affirmation = data.choices?.[0]?.message?.content?.trim() || "";
          affirmationType = mood ? "mood" : intention ? "intention" : energy_level ? "energy" : "phase";
        }
      } catch (e) {
        console.warn("LLM error, falling back:", e);
      }
    }

    // Fallback: rule-based affirmation
    if (!affirmation) {
      affirmation = getFallbackAffirmation(cycle_phase, energy_level, mood, lang || "es");
      affirmationType = "phase";
    }

    // Store in DB
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl && supabaseKey && user_id) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("yayika_daily_affirmations").upsert({
          user_id,
          affirmation_text: affirmation,
          affirmation_type: affirmationType,
          cycle_phase: cycle_phase || null,
          energy_level: energy_level || null,
          mood: mood || null,
          affirmation_date: today,
        }, { onConflict: "user_id,affirmation_date" });
      }
    } catch (e) {
      console.warn("Failed to store affirmation:", e);
    }

    return new Response(JSON.stringify({
      affirmation,
      type: affirmationType,
      phase: cycle_phase,
      lang: lang || "es",
      cached: false,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Affirmations error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// FALLBACK AFFIRMATIONS (rule-based pool)
// ============================================================

function getFallbackAffirmation(phase: string | null, energy: number | null, mood: string | null, lang: string): string {
  const pools: Record<string, Record<string, string[]>> = {
    es: {
      menstrual: [
        "🩸 Merezco descanso sin culpa. Mi cuerpo se está renovando y eso es poderoso.",
        "🩸 Hoy elijo la compasión conmigo misma. No necesito ser productiva para ser valiosa.",
        "🩸 Mi ciclo es sabio. Confío en el ritmo de mi cuerpo.",
        "🩸 Hoy me permito estar en baja energía. Eso no me hace menos.",
        "🩸 Merezco ternura. Hoy cuido mi interior.",
        "🩸 Mi descanso es tan productivo como mi acción. Lo elijo sin culpa.",
        "🩸 Hoy escucho a mi cuerpo. Él sabe lo que necesita."
      ],
      follicular: [
        "🌱 Mi energía sube y el mundo está lleno de posibilidades. ¡Hoy creo!",
        "🌱 Soy capaz de empezar cualquier cosa. Mi creatividad está en su máximo.",
        "🌱 Hoy elijo expandirme. Merezco crecer y aprender cosas nuevas.",
        "🌱 Tengo todo lo necesario para lograr lo que me proponga hoy.",
        "🌱 Mi mente está clara y mi corazón está abierto. ¡Aprovéchalo!",
        "🌱 Hoy es un día perfecto para ese proyecto que llevas postergando.",
        "🌱 Merezco invertir en mí y en mis sueños."
      ],
      ovulatory: [
        "✨ Mi voz tiene poder. Hoy me expreso con confianza y carisma.",
        "✨ Soy líder natural. Las personas me escuchan y me respetan.",
        "✨ Hoy brillo con luz propia. Nadie puede apagar lo que soy.",
        "✨ Merezco ocupar espacio. Mi presencia importa.",
        "✨ Hoy negocio, presento y conecto con mi mejor versión.",
        "✨ Tengo el poder de crear cambios positivos a mi alrededor.",
        "✨ Mi energía es contagiosa. Hoy inspiro a otros."
      ],
      luteal: [
        "🌙 Soy organizada y detallista. Hoy cierro lo que empecé con excelencia.",
        "🌙 Mi capacidad de análisis es mi superpoder. Hoy la uso con sabiduría.",
        "🌙 Hoy termino lo pendiente con satisfacción. Merezco ese cierre.",
        "🌙 Mi intuición está agudizada. Confío en lo que siento.",
        "🌙 Soy disciplinada y constante. Cada pequeño paso cuenta.",
        "🌙 Hoy simplifico mi vida. Lo que no sirve, lo suelto.",
        "🌙 Merezco paz mental. Hoy organization mi mundo interior."
      ],
      general: [
        "💜 Soy una mujer poderosa ymerecedora de todo lo bueno.",
        "💜 Hoy elijo creer en mí misma más que nunca.",
        "💜 Mi camino es único y lo recorro con confianza.",
        "💜 Merezco amor, abundancia y alegría. Hoy los recibo.",
        "💜 Soy suficiente tal como soy. Eso nunca cambia.",
        " Hoy creo la vida que quiero con cada decisión.",
        "💜 Mi potencial es ilimitado. Hoy doy un paso más."
      ]
    },
    en: {
      menstrual: [
        "🩸 I deserve rest without guilt. My body is renewing and that's powerful.",
        "🩸 Today I choose self-compassion. I don't need to be productive to be valuable.",
        "🩸 My cycle is wise. I trust my body's rhythm.",
        "🩸 Today I allow myself low energy. That doesn't make me less.",
        "🩸 I deserve tenderness. Today I nurture my inner world.",
        "🩸 My rest is as productive as my action. I choose it guilt-free.",
        "🩸 Today I listen to my body. It knows what it needs."
      ],
      follicular: [
        "🌱 My energy is rising and the world is full of possibilities. Today I create!",
        "🌱 I am capable of starting anything. My creativity is at its peak.",
        "🌱 Today I choose to expand. I deserve to grow and learn new things.",
        "🌱 I have everything I need to achieve what I set my mind to today.",
        "🌱 My mind is clear and my heart is open. Make the most of it!",
        "🌱 Today is perfect for that project you've been putting off.",
        "🌱 I deserve to invest in myself and my dreams."
      ],
      ovulatory: [
        "✨ My voice has power. Today I express myself with confidence and charisma.",
        "✨ I am a natural leader. People listen to and respect me.",
        "✨ Today I shine with my own light. No one can dim what I am.",
        "✨ I deserve to take up space. My presence matters.",
        "✨ Today I negotiate, present, and connect with my best self.",
        "✨ I have the power to create positive change around me.",
        "✨ My energy is contagious. Today I inspire others."
      ],
      luteal: [
        "🌙 I am organized and detail-oriented. Today I close what I started with excellence.",
        "🌙 My analytical ability is my superpower. Today I use it wisely.",
        "🌙 Today I finish what's pending with satisfaction. I deserve that closure.",
        "🌙 My intuition is heightened. I trust what I feel.",
        "🌙 I am disciplined and consistent. Every small step counts.",
        "🌙 Today I simplify my life. What doesn't serve me, I release.",
        "🌙 I deserve mental peace. Today I organize my inner world."
      ],
      general: [
        "💜 I am a powerful woman deserving of all good things.",
        "💜 Today I choose to believe in myself more than ever.",
        "💜 My path is unique and I walk it with confidence.",
        "💜 I deserve love, abundance, and joy. Today I receive them.",
        "💜 I am enough just as I am. That never changes.",
        "💜 Today I create the life I want with every decision.",
        "💜 My potential is unlimited. Today I take one more step."
      ]
    }
  };

  const langPools = pools[lang] || pools['es'];
  const phasePool = langPools[phase || 'general'] || langPools['general'];
  
  // Pick random from pool
  const idx = Math.floor(Math.random() * phasePool.length);
  let affirmation = phasePool[idx];

  // Energy-based modification
  if (energy !== null && energy <= 2) {
    const lowEnergyAdditions: Record<string, string> = {
      es: " Tu cuerpo te pide descanso. Honralo.",
      en: " Your body asks for rest. Honor it."
    };
    affirmation += lowEnergyAdditions[lang] || lowEnergyAdditions['es'];
  } else if (energy !== null && energy >= 5) {
    const highEnergyAdditions: Record<string, string> = {
      es: " ¡Tu energía es magnética hoy!",
      en: " Your energy is magnetic today!"
    };
    affirmation += highEnergyAdditions[lang] || highEnergyAdditions['es'];
  }

  return affirmation;
}
