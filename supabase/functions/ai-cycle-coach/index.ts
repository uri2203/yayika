// ============================================================
// Yayika — AI Cycle Coach Edge Function
// Generates personalized daily coaching based on cycle data
// Deploy: supabase functions deploy ai-cycle-coach (JWT verification required)
// Env vars needed: GROQ_API_KEY or OPENAI_API_KEY
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const limited = await enforceAiRateLimit(req, "ai-cycle-coach");
    if (limited) return limited;
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const apiKey = groqKey || openaiKey;

    const { cycle_phase, cycle_day, energy_level, mood, symptoms, recent_logs, lang } = await req.json();
    const user_id = user.id;
    // Normalize locale variants (e.g. pt-BR -> pt) for consistent language lookups.
    const requestedLang = (lang || "es").split("-")[0].toLowerCase();

    // If no LLM key, return rule-based coaching (still useful!)
    if (!apiKey) {
      const coaching = generateFallbackCoaching(cycle_phase, energy_level, mood, symptoms, requestedLang);
      
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
        lang: requestedLang,
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
    const targetLang = langNames[requestedLang] || "español";

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
- Motivación breve

IMPORTANTE: Redacta toda tu respuesta únicamente en ${targetLang}. Aunque estas instrucciones estén en español, tu salida debe ser 100% ${targetLang}; no mezcles español, inglés ni otros idiomas.`;

    const userMessage = contextBlock
      ? `Dame mi coaching personalizado de hoy. Estos son mis datos:\n\n${contextBlock}`
      : "No tengo datos de ciclo registrados. Dame un consejo general y pídeme que registre mi ciclo.";

    // Use Groq if available, else OpenAI
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
      lang: requestedLang,
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
    },
    pt: {
      menstrual: `🩸 **Fase Menstrual** — Seu corpo está se renovando. É normal ter menos energia hoje.\n\n💡 **Dica:** Priorize descanso e reflexão. Não é hora de forçar a produtividade.\n\n✅ **Ações de hoje:**\n1. Reserve 15 minutos para você sem telas\n2. Escreva 3 coisas pelas quais é grata`,
      follicular: `🌱 **Fase Folicular** — Sua energia está subindo. É o momento perfeito para começar coisas novas.\n\n💡 **Dica:** Aproveite essa onda de energia para tirar projetos do papel.\n\n✅ **Ações de hoje:**\n1. Identifique 1 projeto que você quer começar\n2. Planeje sua semana com as tarefas mais importantes`,
      ovulatory: `✨ **Fase Ovulatoria** — Este é seu momento de maior energia e carisma! Sua comunicação está brilhante.\n\n💡 **Dica:** Hoje é ideal para negociar, apresentar ideias ou ter conversas importantes.\n\n✅ **Ações de hoje:**\n1. Tenha aquela conversa que você vem adiando\n2. Compartilhe uma ideia ou proposta com alguém`,
      luteal: `🌙 **Fase Lútea** — Sua energia diminui gradualmente. É hora de organizar e encerrar.\n\n💡 **Dica:** Seu cérebro analítico está no melhor momento. Aproveite para os detalhes e a organização.\n\n✅ **Ações de hoje:**\n1. Organize seu espaço de trabalho\n2. Revise e conclua tarefas pendentes`
    },
    fr: {
      menstrual: `🩸 **Phase Menstruelle** — Votre corps se renouvelle. Il est normal d'avoir moins d'énergie aujourd'hui.\n\n💡 **Conseil :** Privilégiez le repos et la réflexion. Ce n'est pas le moment de forcer la productivité.\n\n✅ **Actions du jour :**\n1. Prenez 15 minutes pour vous, sans écrans\n2. Écrivez 3 choses pour lesquelles vous êtes reconnaissante`,
      follicular: `🌱 **Phase Folliculaire** — Votre énergie monte. C'est le moment idéal pour commencer de nouvelles choses.\n\n💡 **Conseil :** Profitez de cette vague d'énergie pour lancer les projets que vous repoussez.\n\n✅ **Actions du jour :**\n1. Identifiez 1 projet que vous souhaitez démarrer\n2. Planifiez votre semaine avec les tâches les plus importantes`,
      ovulatory: `✨ **Phase Ovulatoire** — C'est votre moment de pointe en énergie et en charisme ! Votre communication rayonne.\n\n💡 **Conseil :** Aujourd'hui est idéal pour négocier, présenter des idées ou avoir des conversations importantes.\n\n✅ **Actions du jour :**\n1. Ayez cette conversation que vous repoussez\n2. Partagez une idée ou une proposition avec quelqu'un`,
      luteal: `🌙 **Phase Lutéale** — Votre énergie diminue progressivement. C'est le moment d'organiser et de conclure.\n\n💡 **Conseil :** Votre cerveau analytique est au meilleur de sa forme. Misez sur les détails et l'organisation.\n\n✅ **Actions du jour :**\n1. Rangez votre espace de travail\n2. Passez en revue et terminez les tâches en attente`
    },
    de: {
      menstrual: `🩸 **Menstruationsphase** — Dein Körper erneuert sich. Es ist normal, heute weniger Energie zu haben.\n\n💡 **Tipp:** Setze auf Ruhe und Reflexion. Jetzt ist nicht die Zeit, Produktivität zu erzwingen.\n\n✅ **Heutige Maßnahmen:**\n1. Nimm dir 15 Minuten ohne Bildschirme für dich\n2. Schreibe 3 Dinge auf, für die du dankbar bist`,
      follicular: `🌱 **Follikelphase** — Deine Energie steigt. Jetzt ist der perfekte Zeitpunkt, etwas Neues zu beginnen.\n\n💡 **Tipp:** Nutze diese Energiewelle, um Projekte zu starten, die du schon lange vor dir herschiebst.\n\n✅ **Heutige Maßnahmen:**\n1. Finde 1 Projekt, das du beginnen möchtest\n2. Plane deine Woche mit den wichtigsten Aufgaben`,
      ovulatory: `✨ **Ovulationsphase** — Das ist dein Höhepunkt an Energie und Charisma! Deine Kommunikation strahlt.\n\n💡 **Tipp:** Heute ist ideal zum Verhandeln, Ideen präsentieren oder wichtige Gespräche zu führen.\n\n✅ **Heutige Maßnahmen:**\n1. Führe das Gespräch, das du schon lange aufschiebst\n2. Teile eine Idee oder einen Vorschlag mit jemandem`,
      luteal: `🌙 **Lutealphase** — Deine Energie lässt allmählich nach. Es ist Zeit zu organisieren und abzuschließen.\n\n💡 **Tipp:** Dein analytisches Gehirn ist in Topform. Nutze es für Details und Ordnung.\n\n✅ **Heutige Maßnahmen:**\n1. Organisiere deinen Arbeitsplatz\n2. Prüfe und schließe offene Aufgaben ab`
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
      },
      pt: {
        'Dolor de cabeza': 'Se você tem dor de cabeça, reduza a cafeína e beba mais água.',
        'Dor de cabeça': 'Se você tem dor de cabeça, reduza a cafeína e beba mais água.',
        'Cólicos': 'Para cólicos, um banho quente ou uma compressa morna podem ajudar.',
        'Cansancio': 'O cansaço é seu corpo pedindo descanso. Ouça-o.',
        'Cansaço': 'O cansaço é seu corpo pedindo descanso. Ouça-o.',
        'Hinchazón': 'Reduza o sódio e beba mais água para o inchaço.',
        'Inchaço': 'Reduza o sódio e beba mais água para o inchaço.',
        'Antojos': 'Os desejos são normais nesta fase. Permita-se um pequeno agrado.',
        'Desejos': 'Os desejos são normais nesta fase. Permita-se um pequeno agrado.'
      },
      fr: {
        'Dolor de cabeza': 'Si vous avez mal à la tête, réduisez la caféine et buvez plus d\'eau.',
        'Maux de tête': 'Si vous avez mal à la tête, réduisez la caféine et buvez plus d\'eau.',
        'Cólicos': 'Pour les crampes, un bain chaud ou une bouillotte peuvent aider.',
        'Crampes': 'Pour les crampes, un bain chaud ou une bouillotte peuvent aider.',
        'Cansancio': 'La fatigue est votre corps qui demande du repos. Écoutez-le.',
        'Fatigue': 'La fatigue est votre corps qui demande du repos. Écoutez-le.',
        'Hinchazón': 'Pour les ballonnements, réduisez le sodium et buvez plus d\'eau.',
        'Ballonnements': 'Pour les ballonnements, réduisez le sodium et buvez plus d\'eau.',
        'Antojos': 'Les envies sont normales dans cette phase. Offrez-vous une petite gâterie.',
        'Envies': 'Les envies sont normales dans cette phase. Offrez-vous une petite gâterie.'
      },
      de: {
        'Dolor de cabeza': 'Bei Kopfschmerzen: weniger Koffein und mehr Wasser trinken.',
        'Kopfschmerzen': 'Bei Kopfschmerzen: weniger Koffein und mehr Wasser trinken.',
        'Cólicos': 'Bei Krämpfen können ein warmes Bad oder eine Wärmflasche helfen.',
        'Krämpfe': 'Bei Krämpfen können ein warmes Bad oder eine Wärmflasche helfen.',
        'Cansancio': 'Müdigkeit ist ein Zeichen deines Körpers, dass er Ruhe braucht. Höre auf ihn.',
        'Müdigkeit': 'Müdigkeit ist ein Zeichen deines Körpers, dass er Ruhe braucht. Höre auf ihn.',
        'Hinchazón': 'Bei Blähungen: weniger Salz und mehr Wasser trinken.',
        'Blähungen': 'Bei Blähungen: weniger Salz und mehr Wasser trinken.',
        'Antojos': 'Heißhunger ist in dieser Phase normal. Gönn dir eine kleine Leckerei.',
        'Heißhunger': 'Heißhunger ist in dieser Phase normal. Gönn dir eine kleine Leckerei.'
      }
    };
    const symptomNoteLabels: Record<string, string> = {
      es: '🩺 **Nota sobre síntomas:** ',
      en: '🩺 **Nota sobre síntomas:** ',
      pt: '🩺 **Nota sobre sintomas:** ',
      fr: '🩺 **Note sur les symptômes :** ',
      de: '🩺 **Hinweis zu Symptomen:** '
    };
    const tips = symptomTips[lang] || symptomTips['es'];
    const relevantSymptoms = symptoms.filter((s: string) => tips[s]);
    if (relevantSymptoms.length > 0) {
      result += '\n\n' + (symptomNoteLabels[lang] || symptomNoteLabels['es']) + relevantSymptoms.map((s: string) => tips[s]).join(' ');
    }
  }

  // Add energy-based modification (es/en strings unchanged, pt/fr/de added)
  const lowEnergyNotes: Record<string, string> = {
    es: '\n\n⚡ **Energía baja detectada:** Permítete un día más ligero. No todo tiene que ser productivo.',
    en: '\n\n⚡ **Low energy detected:** Allow yourself a lighter day. Not everything has to be productive.',
    pt: '\n\n⚡ **Pouca energia detectada:** Permita-se um dia mais leve. Nem tudo precisa ser produtivo.',
    fr: '\n\n⚡ **Faible énergie détectée :** Accordez-vous une journée plus légère. Tout ne doit pas être productif.',
    de: '\n\n⚡ **Wenig Energie erkannt:** Gönn dir einen leichteren Tag. Nicht alles muss produktiv sein.'
  };
  const highEnergyNotes: Record<string, string> = {
    es: '\n\n⚡ **Alta energía:** ¡Aprovecha para hacer lo que más te cuesta en otros días!',
    en: '\n\n⚡ **High energy:** Take advantage to do what\'s hardest on other days!',
    pt: '\n\n⚡ **Alta energia:** Aproveite para fazer o que mais custa em outros dias!',
    fr: '\n\n⚡ **Haute énergie :** Profitez-en pour faire ce qui vous est le plus difficile les autres jours !',
    de: '\n\n⚡ **Hohe Energie:** Nutze sie, um das zu tun, was dir an anderen Tagen am schwersten fällt!'
  };
  if (energy !== null) {
    if (energy <= 2) {
      result += lowEnergyNotes[lang] || lowEnergyNotes['es'];
    } else if (energy >= 4) {
      result += highEnergyNotes[lang] || highEnergyNotes['es'];
    }
  }

  return result;
}
