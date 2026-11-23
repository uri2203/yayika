// ============================================================
// Yayika — AI Wellness Planner Edge Function
// Meal + Exercise recommendations based on cycle phase
// Deploy: supabase functions deploy ai-wellness-planner (JWT verification required)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A real user session is required. The public anon key is a valid JWT but it
// is not a login, so reject it explicitly before trusting anything in the body.
async function requireUser(req: Request): Promise<{ id: string } | null> {
  const header = req.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    const claims = JSON.parse(atob(payload));
    if (!claims.sub || claims.role === "anon") return null;
  } catch {
    return null;
  }
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? { id: user.id } : null;
  } catch {
    return null;
  }
}

async function enforceAiRateLimit(req: Request, action: string): Promise<Response | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (!supabaseUrl) return null;
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "anon";
    const rl = await fetch(`${supabaseUrl}/functions/v1/rate-limit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "record", action, identifier: ip, type: "ai" }),
    });
    if (rl.status === 429) {
      const j = await rl.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retryAfterMs: (j as any).retryAfterMs ?? 60000 }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return null;
  } catch {
    return null; // fail open: el rate limiter nunca bloquea por su propio error
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const limited = await enforceAiRateLimit(req, "ai-wellness-planner");
    if (limited) return limited;
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const apiKey = groqKey || openaiKey;

    const { cycle_phase, energy_level, mood, symptoms, lang } = await req.json();
    // Normalize locale variants (e.g. pt-BR -> pt) for consistent language lookups.
    const requestedLang = (lang || "es").split("-")[0].toLowerCase();

    let plan = null;

    if (apiKey) {
      try {
        const langNames: Record<string, string> = {
          es: "español", en: "English", pt: "português", fr: "français", de: "Deutsch"
        };

        const systemPrompt = `Eres Laura, la coach de bienestar de Yayika. Generas planes de alimentación y ejercicio personalizados según la fase del ciclo menstrual.

REGLAS:
1. Res SIEMPRE en ${langNames[requestedLang] || "español"}
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
}

IMPORTANTE: Todo el contenido generado (nombres, descripciones, duraciones, why y tip) debe estar únicamente en ${langNames[requestedLang] || "español"}. Aunque estas instrucciones estén en español, tu salida debe ser 100% ${langNames[requestedLang] || "español"}; no mezcles español, inglés ni otros idiomas.`;

        const userMessage = `Genera mi plan de bienestar para hoy.

Fase: ${cycle_phase || "desconocida"}
Energía: ${energy_level || "?"}/5
Mood: ${mood || "no registrado"}
Síntomas: ${(symptoms || []).join(", ") || "ninguno"}`;

        const isGroq = !!groqKey;
        const baseUrl = isGroq ? "https://api.groq.com/openai" : "https://api.openai.com";
        const model = isGroq ? "qwen/qwen3.8-27b" : "gpt-4o-mini";

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
      plan = getFallbackPlan(cycle_phase, energy_level, symptoms, requestedLang);
    }

    return new Response(JSON.stringify({ plan, lang: requestedLang }), {
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
    },
    pt: {
      menstrual: {
        meals: [
          { name: "Aveia com frutas vermelhas", description: "Rica em ferro e antioxidantes para renovação", icon: "🥣" },
          { name: "Salmão com espinafre", description: "Ômega-3 para reduzir inflamação", icon: "🐟" },
          { name: "Chocolate amargo + castanhas", description: "Magnésio para aliviar cólicos", icon: "🍫" }
        ],
        exercise: [
          { name: "Ioga suave", duration: "20 min", why: "Alonga sem forçar, acalma o corpo" },
          { name: "Caminhada leve", duration: "15 min", why: "Ativa sem esgotar" }
        ],
        tip: "Seu corpo está se renovando. Priorize alimentação restaurativa e movimento suave."
      },
      follicular: {
        meals: [
          { name: "Ovos mexidos + abacate", description: "Proteína e gorduras boas para energia em alta", icon: "🥑" },
          { name: "Salada de frango com quinoa", description: "Proteína completa para novos projetos", icon: "🥗" },
          { name: "Shake de proteína + fruta", description: "Recarga rápida de energia", icon: "🥤" }
        ],
        exercise: [
          { name: "HIIT ou corrida", duration: "25 min", why: "Sua energia está subindo, aproveite!" },
          { name: "Pesas leves", duration: "20 min", why: "Construa força na sua melhor fase" }
        ],
        tip: "Sua energia está aumentando. É hora de treinar com intensidade e comer proteína."
      },
      ovulatory: {
        meals: [
          { name: "Bowl de arroz com vegetais", description: "Carboidratos complexos para energia máxima", icon: "🍚" },
          { name: "Massa integral com frango", description: "Combustível para seu dia mais ativo", icon: "🍝" },
          { name: "Fruta tropical + iogurte", description: "Vitaminas para brilhar", icon: "🥝" }
        ],
        exercise: [
          { name: "Treino funcional", duration: "30 min", why: "Seu corpo está no auge" },
          { name: "Dança", duration: "20 min", why: "Libera endorfinas e conecta com seu carisma" }
        ],
        tip: "Energia máxima. Coma carboidratos complexos e mova seu corpo com alegria."
      },
      luteal: {
        meals: [
          { name: "Banana com manteiga de amendoim", description: "Magnésio e potássio para TPM", icon: "🍌" },
          { name: "Sopa de legumes caseira", description: "Alimentação leve e reconfortante", icon: "🍲" },
          { name: "Sementes de abóbora", description: "Zinco e magnésio para equilibrar hormônios", icon: "🎃" }
        ],
        exercise: [
          { name: "Pilates", duration: "25 min", why: "Fortalece sem impacto, organiza a mente" },
          { name: "Caminhada ao ar livre", duration: "20 min", why: "Reduz inchaço e melhora o humor" }
        ],
        tip: "Busque alimentos ricos em magnésio. Exercício moderado para equilibrar hormônios."
      }
    },
    fr: {
      menstrual: {
        meals: [
          { name: "Flocons d'avoine aux fruits rouges", description: "Riche en fer et antioxydants pour le renouvellement", icon: "🥣" },
          { name: "Saumon aux épinards", description: "Oméga-3 pour réduire l'inflammation", icon: "🐟" },
          { name: "Chocolat noir + noix", description: "Magnésium pour apaiser les crampes", icon: "🍫" }
        ],
        exercise: [
          { name: "Yoga doux", duration: "20 min", why: "Étire sans forcer, apaise le corps" },
          { name: "Marche légère", duration: "15 min", why: "Active sans épuiser" }
        ],
        tip: "Votre corps se renouvelle. Privilégiez une alimentation réparatrice et un mouvement doux."
      },
      follicular: {
        meals: [
          { name: "Œufs brouillés + avocat", description: "Protéines et bonnes graisses pour l'énergie qui monte", icon: "🥑" },
          { name: "Salade de poulet au quinoa", description: "Protéine complète pour de nouveaux projets", icon: "🥗" },
          { name: "Shake protéiné + fruits", description: "Recharge d'énergie rapide", icon: "🥤" }
        ],
        exercise: [
          { name: "HIIT ou course", duration: "25 min", why: "Votre énergie monte, profitez-en !" },
          { name: "Poids légers", duration: "20 min", why: "Développez votre force dans votre meilleure phase" }
        ],
        tip: "Votre énergie monte. C'est le moment de vous entraîner sérieusement et de manger des protéines."
      },
      ovulatory: {
        meals: [
          { name: "Bol de riz aux légumes", description: "Glucides complexes pour une énergie maximale", icon: "🍚" },
          { name: "Pâtes complètes au poulet", description: "Carburant pour votre journée la plus active", icon: "🍝" },
          { name: "Fruits tropicaux + yaourt", description: "Vitamines pour rayonner", icon: "🥝" }
        ],
        exercise: [
          { name: "Entraînement fonctionnel", duration: "30 min", why: "Votre corps est à son sommet" },
          { name: "Danse", duration: "20 min", why: "Libère des endorphines et révèle votre charisme" }
        ],
        tip: "Énergie maximale. Mangez des glucides complexes et bougez avec joie."
      },
      luteal: {
        meals: [
          { name: "Banane au beurre de cacahuète", description: "Magnésium et potassium pour le SPM", icon: "🍌" },
          { name: "Soupe de légumes maison", description: "Une alimentation légère et réconfortante", icon: "🍲" },
          { name: "Graines de courge", description: "Zinc et magnésium pour équilibrer les hormones", icon: "🎃" }
        ],
        exercise: [
          { name: "Pilates", duration: "25 min", why: "Renforce sans impact, met de l'ordre dans l'esprit" },
          { name: "Marche en plein air", duration: "20 min", why: "Réduit les ballonnements et améliore l'humeur" }
        ],
        tip: "Privilégiez les aliments riches en magnésium. Un exercice modéré pour équilibrer les hormones."
      }
    },
    de: {
      menstrual: {
        meals: [
          { name: "Haferflocken mit Beeren", description: "Reich an Eisen und Antioxidantien zur Erneuerung", icon: "🥣" },
          { name: "Lachs mit Spinat", description: "Omega-3 zur Entzündungsreduktion", icon: "🐟" },
          { name: "Dunkle Schokolade + Nüsse", description: "Magnesium gegen Krämpfe", icon: "🍫" }
        ],
        exercise: [
          { name: "Sanftes Yoga", duration: "20 min", why: "Dehnt ohne zu belasten, beruhigt den Körper" },
          { name: "Leichter Spaziergang", duration: "15 min", why: "Regt an, ohne zu erschöpfen" }
        ],
        tip: "Dein Körper erneuert sich. Setze auf nährende Kost und sanfte Bewegung."
      },
      follicular: {
        meals: [
          { name: "Rührei + Avocado", description: "Protein und gute Fette für steigende Energie", icon: "🥑" },
          { name: "Hähnchen-Quinoa-Salat", description: "Vollwertiges Protein für neue Projekte", icon: "🥗" },
          { name: "Proteinshake + Obst", description: "Schnelle Energieaufladung", icon: "🥤" }
        ],
        exercise: [
          { name: "HIIT oder Laufen", duration: "25 min", why: "Deine Energie steigt – nutze sie!" },
          { name: "Leichte Gewichte", duration: "20 min", why: "Baue Kraft in deiner besten Phase auf" }
        ],
        tip: "Deine Energie steigt. Jetzt ist die Zeit für intensives Training und Protein."
      },
      ovulatory: {
        meals: [
          { name: "Reisbowl mit Gemüse", description: "Komplexe Kohlenhydrate für maximale Energie", icon: "🍚" },
          { name: "Vollkornpasta mit Hähnchen", description: "Treibstoff für deinen aktivsten Tag", icon: "🍝" },
          { name: "Tropische Früchte + Joghurt", description: "Vitamine zum Strahlen", icon: "🥝" }
        ],
        exercise: [
          { name: "Funktionelles Training", duration: "30 min", why: "Dein Körper ist auf dem Höhepunkt" },
          { name: "Tanz", duration: "20 min", why: "Setzt Endorphine frei und verbindet dich mit deinem Charisma" }
        ],
        tip: "Maximale Energie. Iss komplexe Kohlenhydrate und bewege dich mit Freude."
      },
      luteal: {
        meals: [
          { name: "Banane mit Erdnussbutter", description: "Magnesium und Kalium für PMS", icon: "🍌" },
          { name: "Hausgemachte Gemüsesuppe", description: "Leichte und wohltuende Kost", icon: "🍲" },
          { name: "Kürbiskerne", description: "Zink und Magnesium für den Hormonhaushalt", icon: "🎃" }
        ],
        exercise: [
          { name: "Pilates", duration: "25 min", why: "Kräftigt gelenkschonend und ordnet den Geist" },
          { name: "Spaziergang an der frischen Luft", duration: "20 min", why: "Reduziert Blähungen und hebt die Stimmung" }
        ],
        tip: "Setze auf magnesiumreiche Lebensmittel. Mäßige Bewegung für den Hormonausgleich."
      }
    }
  };

  const langPlan = plans[lang] || plans['es'];
  const phasePlan = langPlan[phase || 'follicular'] || langPlan['follicular'];

  // Symptom adjustments (es/en strings unchanged, pt/fr/de added)
  const crampsTips: Record<string, string> = {
    es: '\n\n🩺 Para cólicos: jengibre, cúrcuma y compresa caliente.',
    en: '\n\n🩺 For cramps: ginger, turmeric, and heating pad.',
    pt: '\n\n🩺 Para cólicos: gengibre, cúrcuma e compressa quente.',
    fr: '\n\n🩺 Pour les crampes : gingembre, curcuma et bouillotte.',
    de: '\n\n🩺 Bei Krämpfen: Ingwer, Kurkuma und eine Wärmflasche.'
  };
  const bloatingTips: Record<string, string> = {
    es: '\n\n🩺 Para hinchazón: reduce sodio y bebe más agua.',
    en: '\n\n🩺 For bloating: reduce sodium and drink more water.',
    pt: '\n\n🩺 Para inchaço: reduza o sódio e beba mais água.',
    fr: '\n\n🩺 Pour les ballonnements : réduisez le sodium et buvez plus d\'eau.',
    de: '\n\n🩺 Bei Blähungen: weniger Salz und mehr Wasser trinken.'
  };
  if (symptoms && symptoms.includes('Cólicos')) {
    phasePlan.tip += crampsTips[lang] || crampsTips['es'];
  }
  if (symptoms && symptoms.includes('Hinchazón')) {
    phasePlan.tip += bloatingTips[lang] || bloatingTips['es'];
  }

  return phasePlan;
}
