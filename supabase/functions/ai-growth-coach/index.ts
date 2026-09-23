// ============================================================
// Yayika — AI Growth Coach (Impulso)
// Returns GrowthPlan shape expected by GrowthCoachScreen
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing authorization header");
    }

    const body = await req.json();
    const { lang = "es" } = body;

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }
    const user_id = user.id;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [{ data: progress }, { data: todayCompletions }, { data: weekCompletions }, { data: challenges }] =
      await Promise.all([
        supabase.from("yayika_progress").select("xp_total, streak_days, level").eq("user_id", user_id).maybeSingle(),
        supabase.from("yayika_daily_action_completions")
          .select("action_id, completed_at, xp_earned")
          .eq("user_id", user_id)
          .gte("completed_at", startOfDay.toISOString()),
        supabase.from("yayika_daily_action_completions")
          .select("completed_at")
          .eq("user_id", user_id)
          .gte("completed_at", startOfWeek.toISOString()),
        supabase.from("yayika_growth_challenges")
          .select("id, title, description, target, current, xp_reward, status, created_at")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    const streak = progress?.streak_days || 0;
    const level = progress?.level || 1;
    const xp = progress?.xp_total || 0;

    const allChallenges = challenges || [];
    const activeChallenges = allChallenges.filter((c: any) => c.status === "active" || c.status === "pending");
    const completedChallenges = allChallenges.filter((c: any) => c.status === "completed");

    const primary = activeChallenges[0] || completedChallenges[0] || null;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();

    const monthlyGoal = {
      title: primary?.title || defaultGoalTitle(lang),
      description: primary?.description || defaultGoalDesc(lang),
      progress: primary && primary.target > 0
        ? Math.min(100, Math.round(((primary.current || 0) / primary.target) * 100))
        : Math.min(100, Math.round((dayOfMonth / daysInMonth) * 100)),
      daysCompleted: primary?.current || dayOfMonth,
      totalDays: primary?.target || daysInMonth,
    };

    const milestones = [
      ...activeChallenges.slice(0, 4).map((c: any) => ({
        id: c.id,
        title: c.title,
        completed: c.status === "completed",
      })),
      { id: "streak-7", title: milestoneTitle(7, lang), completed: streak >= 7 },
      { id: "streak-30", title: milestoneTitle(30, lang), completed: streak >= 30 },
      { id: "level-5", title: milestoneTitle(5, lang), completed: level >= 5 },
    ].slice(0, 6);

    const weeklyActionIds = new Set<string>();
    const weekData: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const calendarWeekStart = new Date(now);
    calendarWeekStart.setDate(now.getDate() - mondayOffset);
    calendarWeekStart.setHours(0, 0, 0, 0);
    for (const c of weekCompletions || []) {
      const d = new Date(c.completed_at);
      if (d < calendarWeekStart) continue;
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      weekData[idx] = (weekData[idx] || 0) + 1;
    }

    const uniqueActionIds = [...new Set((todayCompletions || []).map((c: any) => c.action_id))];
    const dailyActions = [
      ...uniqueActionIds.slice(0, 5).map((id: string) => ({
        id,
        title: actionTitle(id, lang),
        completed: true,
      })),
      { id: "log-cycle", title: actionTitle("log-cycle", lang), completed: uniqueActionIds.includes("log-cycle") },
      { id: "checkin", title: actionTitle("checkin", lang), completed: uniqueActionIds.includes("checkin") },
    ].filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i).slice(0, 5);

    if (dailyActions.length < 3) {
      const defaults = defaultActions(lang);
      for (const d of defaults) {
        if (dailyActions.length >= 5) break;
        if (!dailyActions.find((a) => a.id === d.id)) dailyActions.push({ ...d, completed: false });
      }
    }

    const plan = {
      monthlyGoal,
      milestones,
      dailyActions,
      quote: quoteFor(lang, streak, level),
      weekData,
    };

    return new Response(JSON.stringify({ plan, lang }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Growth Coach error:", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
        ? String((error as any).message)
        : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function defaultGoalTitle(lang: string): string {
  const m: Record<string, string> = {
    es: "Constancia diaria",
    en: "Daily consistency",
    pt: "Consistência diária",
    fr: "Constance quotidienne",
    de: "Tägliche Konstanz",
  };
  return m[lang] || m.es;
}

function defaultGoalDesc(lang: string): string {
  const m: Record<string, string> = {
    es: "Completa tus acciones diarias y mantén tu racha viva",
    en: "Complete your daily actions and keep your streak alive",
    pt: "Complete suas ações diárias e mantenha sua sequência viva",
    fr: "Complète tes actions quotidiennes et garde ta série en vie",
    de: "Erledige deine täglichen Aktionen und halte deine Serie am Leben",
  };
  return m[lang] || m.es;
}

function milestoneTitle(days: number, lang: string): string {
  const m: Record<string, string> = {
    es: `Racha de ${days} días`,
    en: `${days}-day streak`,
    pt: `Sequência de ${days} dias`,
    fr: `Série de ${days} jours`,
    de: `${days}-Tage-Serie`,
  };
  return m[lang] || m.es;
}

function actionTitle(id: string, lang: string): string {
  const titles: Record<string, Record<string, string>> = {
    "log-cycle": {
      es: "Registrar mi ciclo",
      en: "Log my cycle",
      pt: "Registrar meu ciclo",
      fr: "Enregistrer mon cycle",
      de: "Zyklus eintragen",
    },
    checkin: {
      es: "Check-in emocional",
      en: "Emotional check-in",
      pt: "Check-in emocional",
      fr: "Check-in émotionnel",
      de: "Emotionaler Check-in",
    },
    "drink-water": {
      es: "Beber agua",
      en: "Drink water",
      pt: "Beber água",
      fr: "Boire de l'eau",
      de: "Wasser trinken",
    },
    move: {
      es: "Moverme 10 minutos",
      en: "Move for 10 minutes",
      pt: "Mexer-se 10 minutos",
      fr: "Bouger 10 minutes",
      de: "10 Minuten bewegen",
    },
    rest: {
      es: "Descansar 7 horas",
      en: "Sleep 7 hours",
      pt: "Dormir 7 horas",
      fr: "Dormir 7 heures",
      de: "7 Stunden schlafen",
    },
    connect: {
      es: "Conectar con una amiga",
      en: "Connect with a friend",
      pt: "Conectar com uma amiga",
      fr: "Contacter une amie",
      de: "Freundin kontaktieren",
    },
  };
  const t = titles[id] || { es: id, en: id, pt: id, fr: id, de: id };
  return t[lang] || t.es;
}

function defaultActions(lang: string) {
  return [
    { id: "log-cycle", title: actionTitle("log-cycle", lang) },
    { id: "checkin", title: actionTitle("checkin", lang) },
    { id: "move", title: actionTitle("move", lang) },
  ];
}

function quoteFor(lang: string, streak: number, level: number): string {
  const quotes: Record<string, string[]> = {
    es: [
      "Cada día que te eliges, te vuelves más fuerte 💜",
      "Tu constencia es tu superpoder — sigue brillando ✨",
      "No tienes que ser perfecta, solo constante 🌱",
      streak > 0
        ? `Llevas ${streak} días seguidos contigo misma 🔥`
        : `Nivel ${level} y subiendo — tú puedes 💪`,
    ],
    en: [
      "Every day you choose yourself, you grow stronger 💜",
      "Your consistency is your superpower — keep shining ✨",
      "You don't have to be perfect, just consistent 🌱",
      streak > 0
        ? `${streak} days in a row with yourself 🔥`
        : `Level ${level} and rising — you've got this 💪`,
    ],
    pt: [
      "Cada dia que você se escolce, fica mais forte 💜",
      "Sua consistência é seu superpoder — continue brilhando ✨",
      "Você não precisa ser perfeita, apenas constante 🌱",
      streak > 0
        ? `${streak} dias seguidos consigo mesma 🔥`
        : `Nível ${level} e subindo — você consegue 💪`,
    ],
    fr: [
      "Chaque jour où tu te choisis, tu deviens plus forte 💜",
      "Ta constance est ton superpouvoir — continue de briller ✨",
      "Tu n'as pas à être parfaite, juste constante 🌱",
      streak > 0
        ? `${streak} jours d'affilée avec toi-même 🔥`
        : `Niveau ${level} et en hausse — tu as ça 💪`,
    ],
    de: [
      "Jeden Tag, den du dich wählst, wirst du stärker 💜",
      "Deine Konstanz ist deine Superkraft — schwe weiter ✨",
      "Du musst nicht perfekt sein, nur konsequent 🌱",
      streak > 0
        ? `${streak} Tage in Folge bei dir selbst 🔥`
        : `Level ${level} und steigend — du schaffst das 💪`,
    ],
  };
  const list = quotes[lang] || quotes.es;
  const idx = (streak + level) % list.length;
  return list[idx];
}
