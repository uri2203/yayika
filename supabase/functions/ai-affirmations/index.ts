// ============================================================
// Yayika — AI Daily Affirmations Edge Function
// Generates personalized daily affirmations based on cycle phase
// Deploy: supabase functions deploy ai-affirmations (JWT verification required)
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
    const limited = await enforceAiRateLimit(req, "ai-affirmations");
    if (limited) return limited;
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const apiKey = groqKey || openaiKey;

    const { cycle_phase, energy_level, mood, intention, lang, recent_affirmations } = await req.json();
    const user_id = user.id;
    // Normalize locale variants (e.g. pt-BR -> pt) so every language-aware
    // lookup (prompt, fallback pools and cache) resolves the same language.
    const requestedLang = (lang || "es").split("-")[0].toLowerCase();

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
          .select("affirmation_text, affirmation_type, lang")
          .eq("user_id", user_id)
          .eq("affirmation_date", today)
          .maybeSingle();
        cachedAffirmation = data;
      }
    } catch (e) {
      console.warn("Cache read error:", e);
    }

    // Return cached only when it was generated in the requested language.
    // A cached row in another language (or with no language tag) is ignored so
    // pt/fr/de requests never receive a Spanish cached affirmation.
    if (cachedAffirmation && cachedAffirmation.lang === requestedLang) {
      return new Response(JSON.stringify({
        affirmation: cachedAffirmation.affirmation_text,
        type: cachedAffirmation.affirmation_type,
        phase: cycle_phase,
        lang: requestedLang,
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
        const targetLang = langNames[requestedLang] || "español";

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

Responde SOLO con la afirmación, sin comillas ni explicaciones.

IMPORTANTE: Escribe la afirmación únicamente en ${targetLang}. Aunque estas reglas estén en español, tu salida debe ser 100% ${targetLang}; no mezcles español, inglés ni otros idiomas.`;

        const userMessage = `Genera una afirmación diaria para hoy.
Fase: ${cycle_phase || "desconocida"}
Energía: ${energy_level || "?"}/5
Mood: ${mood || "no registrado"}
Intención: ${intention || "no definida"}

Afirmaciones recientes (NO repetir):
${avoidList || "Ninguna"}`;

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
      affirmation = getFallbackAffirmation(cycle_phase, energy_level, mood, requestedLang);
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
          lang: requestedLang,
        }, { onConflict: "user_id,affirmation_date" });
      }
    } catch (e) {
      console.warn("Failed to store affirmation:", e);
    }

    return new Response(JSON.stringify({
      affirmation,
      type: affirmationType,
      phase: cycle_phase,
      lang: requestedLang,
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
        "🌙 Merezco paz mental. Hoy organizo mi mundo interior."
      ],
      general: [
        "💜 Soy una mujer poderosa y merecedora de todo lo bueno.",
        "💜 Hoy elijo creer en mí misma más que nunca.",
        "💜 Mi camino es único y lo recorro con confianza.",
        "💜 Merezco amor, abundancia y alegría. Hoy los recibo.",
        "💜 Soy suficiente tal como soy. Eso nunca cambia.",
        "💜 Hoy creo la vida que quiero con cada decisión.",
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
    },
    pt: {
      menstrual: [
        "🩸 Mereço descanso sem culpa. Meu corpo está se renovando e isso é poderoso.",
        "🩸 Hoje escolho compaixão comigo mesma. Não preciso ser produtiva para ter valor.",
        "🩸 Meu ciclo é sábio. Confio no ritmo do meu corpo.",
        "🩸 Hoje me permito estar com pouca energia. Isso não me faz menos.",
        "🩸 Mereço carinho. Hoje cuido do meu interior.",
        "🩸 Meu descanso é tão produtivo quanto minha ação. Escolho-o sem culpa.",
        "🩸 Hoje ouço meu corpo. Ele sabe do que precisa."
      ],
      follicular: [
        "🌱 Minha energia está subindo e o mundo está cheio de possibilidades. Hoje eu crio!",
        "🌱 Sou capaz de começar qualquer coisa. Minha criatividade está no auge.",
        "🌱 Hoje escolho me expandir. Mereço crescer e aprender coisas novas.",
        "🌱 Tenho tudo o que preciso para conquistar o que me proponho hoje.",
        "🌱 Minha mente está clara e meu coração está aberto. Aproveite!",
        "🌱 Hoje é o dia perfeito para aquele projeto que você vem adiando.",
        "🌱 Mereço investir em mim e nos meus sonhos."
      ],
      ovulatory: [
        "✨ Minha voz tem poder. Hoje me expresso com confiança e carisma.",
        "✨ Sou uma líder natural. As pessoas me ouvem e me respeitam.",
        "✨ Hoje brilho com luz própria. Ninguém pode apagar o que eu sou.",
        "✨ Mereço ocupar espaço. Minha presença importa.",
        "✨ Hoje negocio, apresento e me conecto com a minha melhor versão.",
        "✨ Tenho o poder de criar mudanças positivas ao meu redor.",
        "✨ Minha energia é contágio. Hoje inspiro outras pessoas."
      ],
      luteal: [
        "🌙 Sou organizada e detalhista. Hoje concluo o que comecei com excelência.",
        "🌙 Minha capacidade de análise é meu superpoder. Hoje a uso com sabedoria.",
        "🌙 Hoje termino o que está pendente com satisfação. Mereço esse fechamento.",
        "🌙 Minha intuição está aguçada. Confio no que sinto.",
        "🌙 Sou disciplinada e constante. Cada pequeno passo conta.",
        "🌙 Hoje simplifico minha vida. O que não serve, eu solto.",
        "🌙 Mereço paz mental. Hoje organizo meu mundo interior."
      ],
      general: [
        "💜 Sou uma mulher poderosa e merecedora de tudo de bom.",
        "💜 Hoje escolho acreditar em mim mais do que nunca.",
        "💜 Meu caminho é único e eu o percorro com confiança.",
        "💜 Mereço amor, abundância e alegria. Hoje eu os recebo.",
        "💜 Sou suficiente do jeito que sou. Isso nunca muda.",
        "💜 Hoje crio a vida que quero com cada decisão.",
        "💜 Meu potencial é ilimitado. Hoje dou mais um passo."
      ]
    },
    fr: {
      menstrual: [
        "🩸 Je mérite du repos sans culpabilité. Mon corps se renouvelle et c'est puissant.",
        "🩸 Aujourd'hui, je choisis la bienveillance envers moi-même. Je n'ai pas besoin d'être productive pour avoir de la valeur.",
        "🩸 Mon cycle est sage. Je fais confiance au rythme de mon corps.",
        "🩸 Aujourd'hui, je m'autorise une faible énergie. Cela ne me rend pas moindre.",
        "🩸 Je mérite de la tendresse. Aujourd'hui, je prends soin de mon intérieur.",
        "🩸 Mon repos est aussi productif que mon action. Je le choisis sans culpabilité.",
        "🩸 Aujourd'hui, j'écoute mon corps. Il sait ce dont il a besoin."
      ],
      follicular: [
        "🌱 Mon énergie monte et le monde est plein de possibilités. Aujourd'hui, je crée !",
        "🌱 Je suis capable de commencer n'importe quoi. Ma créativité est à son comble.",
        "🌱 Aujourd'hui, je choisis de m'épanouir. Je mérite de grandir et d'apprendre de nouvelles choses.",
        "🌱 J'ai tout ce qu'il me faut pour réaliser ce que je décide aujourd'hui.",
        "🌱 Mon esprit est clair et mon cœur est ouvert. Profites-en !",
        "🌱 Aujourd'hui est le jour idéal pour ce projet que tu repousses.",
        "🌱 Je mérite d'investir en moi et dans mes rêves."
      ],
      ovulatory: [
        "✨ Ma voix a du pouvoir. Aujourd'hui, je m'exprime avec assurance et charisme.",
        "✨ Je suis une leader naturelle. On m'écoute et on me respecte.",
        "✨ Aujourd'hui, je rayonne de ma propre lumière. Personne ne peut éteindre ce que je suis.",
        "✨ Je mérite de prendre ma place. Ma présence compte.",
        "✨ Aujourd'hui, je négocie, je présente et je me connecte à ma meilleure version.",
        "✨ J'ai le pouvoir de créer des changements positifs autour de moi.",
        "✨ Mon énergie est contagieuse. Aujourd'hui, j'inspire les autres."
      ],
      luteal: [
        "🌙 Je suis organisée et méticuleuse. Aujourd'hui, je termine ce que j'ai commencé avec excellence.",
        "🌙 Ma capacité d'analyse est mon super-pouvoir. Aujourd'hui, je l'utilise avec sagesse.",
        "🌙 Aujourd'hui, je règle les tâches en attente avec satisfaction. Je mérite cette clôture.",
        "🌙 Mon intuition est affûtée. Je fais confiance à ce que je ressens.",
        "🌙 Je suis disciplinée et constante. Chaque petit pas compte.",
        "🌙 Aujourd'hui, je simplifie ma vie. Ce qui ne me sert plus, je le lâche.",
        "🌙 Je mérite la paix intérieure. Aujourd'hui, j'organise mon monde intérieur."
      ],
      general: [
        "💜 Je suis une femme puissante qui mérite tout ce qu'il y a de mieux.",
        "💜 Aujourd'hui, je choisis de croire en moi plus que jamais.",
        "💜 Mon chemin est unique et je le parcours avec assurance.",
        "💜 Je mérite l'amour, l'abondance et la joie. Aujourd'hui, je les accueille.",
        "💜 Je suis suffisante telle que je suis. Cela ne change jamais.",
        "💜 Aujourd'hui, je crée la vie que je veux à chaque décision.",
        "💜 Mon potentiel est illimité. Aujourd'hui, je fais un pas de plus."
      ]
    },
    de: {
      menstrual: [
        "🩸 Ich verdiene Ruhe ohne Schuldgefühle. Mein Körper erneuert sich – das ist kraftvoll.",
        "🩸 Heute wähle ich Mitgefühl mit mir selbst. Ich muss nicht produktiv sein, um wertvoll zu sein.",
        "🩸 Mein Zyklus ist weise. Ich vertraue dem Rhythmus meines Körpers.",
        "🩸 Heute erlaube ich mir weniger Energie. Das macht mich nicht weniger.",
        "🩸 Ich verdiene Zärtlichkeit. Heute kümmere ich mich um mein Inneres.",
        "🩸 Meine Ruhe ist genauso produktiv wie mein Handeln. Ich wähle sie ohne Schuldgefühle.",
        "🩸 Heute höre ich auf meinen Körper. Er weiß, was er braucht."
      ],
      follicular: [
        "🌱 Meine Energie steigt und die Welt ist voller Möglichkeiten. Heute gestalte ich!",
        "🌱 Ich kann alles beginnen. Meine Kreativität ist auf ihrem Höhepunkt.",
        "🌱 Heute wähle ich, mich auszudehnen. Ich verdiene es, zu wachsen und Neues zu lernen.",
        "🌱 Ich habe alles, was ich brauche, um heute zu erreichen, was ich mir vornehme.",
        "🌱 Mein Geist ist klar und mein Herz ist offen. Nutze es!",
        "🌱 Heute ist der perfekte Tag für das Projekt, das du schon lange vor dir herschiebst.",
        "🌱 Ich verdiene es, in mich und meine Träume zu investieren."
      ],
      ovulatory: [
        "✨ Meine Stimme hat Kraft. Heute drücke ich mich selbstbewusst und charismatisch aus.",
        "✨ Ich bin eine natürliche Führungskraft. Die Menschen hören mir zu und respektieren mich.",
        "✨ Heute strahle ich aus eigener Kraft. Niemand kann auslöschen, was ich bin.",
        "✨ Ich verdiene es, Raum einzunehmen. Meine Präsenz zählt.",
        "✨ Heute verhandle ich, präsentiere ich und verbinde mich mit meiner besten Version.",
        "✨ Ich habe die Kraft, positive Veränderungen um mich herum zu bewirken.",
        "✨ Meine Energie steckt an. Heute inspiriere ich andere Menschen."
      ],
      luteal: [
        "🌙 Ich bin organisiert und detailorientiert. Heute schließe ich, was ich begonnen habe, mit Sorgfalt ab.",
        "🌙 Meine analytische Fähigkeit ist meine Superkraft. Heute nutze ich sie weise.",
        "🌙 Heute beende ich offene Aufgaben mit Zufriedenheit. Ich verdiene diesen Abschluss.",
        "🌙 Meine Intuition ist geschärft. Ich vertraue auf mein Gefühl.",
        "🌙 Ich bin diszipliniert und beständig. Jeder kleine Schritt zählt.",
        "🌙 Heute vereinfache ich mein Leben. Was mir nicht mehr dient, lasse ich los.",
        "🌙 Ich verdiene innere Ruhe. Heute ordne ich meine innere Welt."
      ],
      general: [
        "💜 Ich bin eine starke Frau, die alles Gute verdient.",
        "💜 Heute wähle ich, mehr als je zuvor an mich zu glauben.",
        "💜 Mein Weg ist einzigartig und ich gehe ihn mit Zuversicht.",
        "💜 Ich verdiene Liebe, Fülle und Freude. Heute nehme ich sie an.",
        "💜 Ich bin genau richtig, so wie ich bin. Das ändert sich nie.",
        "💜 Heute gestalte ich das Leben, das ich will, mit jeder Entscheidung.",
        "💜 Mein Potenzial ist grenzenlos. Heute gehe ich einen Schritt weiter."
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
      en: " Your body asks for rest. Honor it.",
      pt: " Seu corpo pede descanso. Honre isso.",
      fr: " Votre corps demande du repos. Honorez-le.",
      de: " Dein Körper bittet um Ruhe. Ehre sie."
    };
    affirmation += lowEnergyAdditions[lang] || lowEnergyAdditions['es'];
  } else if (energy !== null && energy >= 5) {
    const highEnergyAdditions: Record<string, string> = {
      es: " ¡Tu energía es magnética hoy!",
      en: " Your energy is magnetic today!",
      pt: " Sua energia está magnética hoje!",
      fr: " Votre énergie est magnétique aujourd'hui !",
      de: " Deine Energie ist heute magnetisch!"
    };
    affirmation += highEnergyAdditions[lang] || highEnergyAdditions['es'];
  }

  return affirmation;
}
