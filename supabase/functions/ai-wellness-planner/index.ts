// ============================================================
// Yayika — AI Wellness Planner Edge Function
// Meal + Exercise recommendations based on cycle phase
// Deploy: supabase functions deploy ai-wellness-planner --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { cycle_phase, energy_level, mood, symptoms, lang } = await req.json();

    let plan = null;

    if (apiKey) {
      try {
        const langNames: Record<string, string> = {
          es: "español", en: "English", pt: "português", fr: "français", de: "Deutsch"
        };

        const systemPrompt = `Eres Laura, la coach de bienestar de Yayika. Generas planes de alimentación y ejercicio personalizados según la fase del ciclo menstrual.

REGLAS:
1. Res SIEMPRE en ${langNames[lang] || "español"}
2. Sé práctica y específica — comidas reales, ejercicios concretos
3. Máximo 3 comidas y 2 ejercicios por recomendación
4. Adapta a la fase: menstrual (nutrición restaurativa, ejercicio suave), folicular (proteína, ejercicio intenso), ovulatoria (energía, ejercicio variado), luteal (magnesio, ejercicio moderado)
5. Si hay síntomas, ajusta (ej: cólicos → antiinflamatorios naturales)
6. Sé breve: 2-3 oraciones por sección
7. Usa emojis con moderación

Responde en formato JSON:
{
  "meals": [
    {"name": "nombre", "description": "por qué", "icon": "emoji"}
  ],
  "exercise": [
    {"name": "nombre", "duration": "duración", "why": "por qué"}
  ],
  "tip": "consejo general breve"
}`;

        const userMessage = `Genera mi plan de bienestar para hoy.

Fase: ${cycle_phase || "desconocida"}
Energía: ${energy_level || "?"}/5
Mood: ${mood || "no registrado"}
Síntomas: ${(symptoms || []).join(", ") || "ninguno"}`;

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
            max_tokens: 400,
            temperature: 0.8,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          // Try to parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            plan = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        console.warn("LLM error:", e);
      }
    }

    // Fallback: rule-based plan
    if (!plan) {
      plan = getFallbackPlan(cycle_phase, energy_level, symptoms, lang || "es");
    }

    return new Response(JSON.stringify({ plan, lang: lang || "es" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Wellness Planner error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// FALLBACK PLAN
// ============================================================

function getFallbackPlan(phase: string | null, energy: number | null, symptoms: string[], lang: string): any {
  const plans: Record<string, any> = {
    es: {
      menstrual: {
        meals: [
          { name: "Avena con frutos rojos", description: "Rica en hierro y antioxidantes para renovación", icon: "🥣" },
          { name: "Salmón con espinacas", description: "Omega-3 para reducir inflamación", icon: "🐟" },
          { name: "Chocolate oscuro + nueces", description: "Magnesio para calmar cólicos", icon: "🍫" }
        ],
        exercise: [
          { name: "Yoga suave", duration: "20 min", why: "Estira sin forzar, calma el cuerpo" },
          { name: "Caminata ligera", duration: "15 min", why: "Activa sin agotar" }
        ],
        tip: "Tu cuerpo se está renovando. Prioriza nutrición restaurativa y movimiento suave."
      },
      follicular: {
        meals: [
          { name: "Huevos revueltos + aguacate", description: "Proteína y grasas buenas para energía creciente", icon: "🥑" },
          { name: "Ensalada de pollo con quinoa", description: "Proteína completa para nuevos proyectos", icon: "🥗" },
          { name: "Batido de proteína + fruta", description: "Recarga rápida de energía", icon: "🥤" }
        ],
        exercise: [
          { name: "HIIT o correr", duration: "25 min", why: "Tu energía sube, ¡aprovéchala!" },
          { name: "Pesas ligeras", duration: "20 min", why: "Construye fuerza en tu mejor fase" }
        ],
        tip: "Tu energía está subiendo. Es el momento de entrenar fuerte y comer proteína."
      },
      ovulatory: {
        meals: [
          { name: "Bowl de arroz con vegetales", description: "Carbohidratos complejos para energía máxima", icon: "🍚" },
          { name: "Pasta integral con pollo", description: "Combustible para tu día más activo", icon: "🍝" },
          { name: "Fruta tropical + yogur", description: "Vitaminas para brillar", icon: "🥝" }
        ],
        exercise: [
          { name: "Entrenamiento funcional", duration: "30 min", why: "Tu cuerpo está en su punto máximo" },
          { name: "Danza o baile", duration: "20 min", why: "Libera endorfinas y conecta con tu carisma" }
        ],
        tip: "Energía máxima. Come carbos complejos y mueve tu cuerpo con alegría."
      },
      luteal: {
        meals: [
          { name: "Plátano con mantequilla de maní", description: "Magnesio y potasio para PMS", icon: "🍌" },
          { name: "Sopa de verduras casera", description: "Nutrición ligera y reconfortante", icon: "🍲" },
          { name: "Semillas de calabaza", description: "Zinc y magnesio para equilibrar hormonas", icon: "🎃" }
        ],
        exercise: [
          { name: "Pilates", duration: "25 min", why: "Fortalece sin impacto, organiza mente" },
          { name: "Caminata al aire libre", duration: "20 min", why: "Reduce hinchazón y mejora ánimo" }
        ],
        tip: "Busca alimentos ricos en magnesio. Ejercicio moderado para equilibrar hormonas."
      }
    },
    en: {
      menstrual: {
        meals: [
          { name: "Oatmeal with berries", description: "Rich in iron and antioxidants for renewal", icon: "🥣" },
          { name: "Salmon with spinach", description: "Omega-3 to reduce inflammation", icon: "🐟" },
          { name: "Dark chocolate + nuts", description: "Magnesium to ease cramps", icon: "🍫" }
        ],
        exercise: [
          { name: "Gentle yoga", duration: "20 min", why: "Stretches without straining, calms the body" },
          { name: "Light walk", duration: "15 min", why: "Activates without exhausting" }
        ],
        tip: "Your body is renewing. Prioritize restorative nutrition and gentle movement."
      },
      follicular: {
        meals: [
          { name: "Scrambled eggs + avocado", description: "Protein and good fats for rising energy", icon: "🥑" },
          { name: "Chicken quinoa salad", description: "Complete protein for new projects", icon: "🥗" },
          { name: "Protein shake + fruit", description: "Quick energy recharge", icon: "🥤" }
        ],
        exercise: [
          { name: "HIIT or running", duration: "25 min", why: "Your energy is rising, use it!" },
          { name: "Light weights", duration: "20 min", why: "Build strength in your best phase" }
        ],
        tip: "Your energy is rising. Time to train hard and eat protein."
      },
      ovulatory: {
        meals: [
          { name: "Rice bowl with vegetables", description: "Complex carbs for maximum energy", icon: "🍚" },
          { name: "Whole wheat pasta with chicken", description: "Fuel for your most active day", icon: "🍝" },
          { name: "Tropical fruit + yogurt", description: "Vitamins to shine", icon: "🥝" }
        ],
        exercise: [
          { name: "Functional training", duration: "30 min", why: "Your body is at its peak" },
          { name: "Dance", duration: "20 min", why: "Releases endorphins and connects with your charisma" }
        ],
        tip: "Peak energy. Eat complex carbs and move your body with joy."
      },
      luteal: {
        meals: [
          { name: "Banana with peanut butter", description: "Magnesium and potassium for PMS", icon: "🍌" },
          { name: "Homemade vegetable soup", description: "Light and comforting nutrition", icon: "🍲" },
          { name: "Pumpkin seeds", description: "Zinc and magnesium to balance hormones", icon: "🎃" }
        ],
        exercise: [
          { name: "Pilates", duration: "25 min", why: "Strengthens without impact, organizes mind" },
          { name: "Outdoor walk", duration: "20 min", why: "Reduces bloating and improves mood" }
        ],
        tip: "Look for magnesium-rich foods. Moderate exercise to balance hormones."
      }
    }
  };

  const langPlan = plans[lang] || plans['es'];
  const phasePlan = langPlan[phase || 'follicular'] || langPlan['follicular'];

  // Symptom adjustments
  if (symptoms && symptoms.includes('Cólicos')) {
    phasePlan.tip += lang === ' es'
      ? '\n\n🩺 Para cólicos: jengibre, cúrcuma y compresa caliente.'
      : '\n\n🩺 For cramps: ginger, turmeric, and heating pad.';
  }
  if (symptoms && symptoms.includes('Hinchazón')) {
    phasePlan.tip += lang === 'es'
      ? '\n\n🩺 Para hinchazón: reduce sodio y bebe más agua.'
      : '\n\n🩺 For bloating: reduce sodium and drink more water.';
  }

  return phasePlan;
}
