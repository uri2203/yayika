// ============================================================
// Yayika — AI Growth Coach (Impulso)
// Competitive motivation with cycle-aware timing
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

    const body = await req.json();
    const { user_id, lang = "es", action = "get Coaching" } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get affiliate data
    const { data: affiliate } = await supabase
      .from("yayika_affiliates")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (!affiliate) {
      // Not an affiliate yet - send onboarding message
      return new Response(JSON.stringify({
        is_affiliate: false,
        message: getOnboardingMessage(lang),
        action: "join_affiliates"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get competitive stats
    const { data: stats } = await supabase
      .rpc("yayika_get_competitive_stats", { p_user_id: user_id });

    // Get cycle phase for timing
    const { data: cyclePhase } = await supabase
      .rpc("yayika_get_cycle_message_type", { p_user_id: user_id });

    // Get leaderboard position
    const { data: leaderboard } = await supabase
      .rpc("yayika_get_leaderboard_position", { p_user_id: user_id });

    // Get recent competitive feed
    const { data: feed } = await supabase
      .rpc("yayika_get_competitive_feed", { p_limit: 5 });

    // Generate message based on cycle phase + stats
    const message = generateMessage({
      lang,
      cyclePhase: cyclePhase || "competition",
      stats: stats?.[0] || {},
      leaderboard: leaderboard?.[0] || {},
      affiliate,
      feed: feed || []
    });

    // Get active challenge
    const { data: challenge } = await supabase
      .from("yayika_growth_challenges")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", new Date().toISOString())
      .gte("end_date", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return new Response(JSON.stringify({
      is_affiliate: true,
      message,
      cycle_phase: cyclePhase || "competition",
      stats: stats?.[0] || {},
      leaderboard: leaderboard?.[0] || {},
      feed: feed || [],
      challenge: challenge || null,
      level: affiliate.level,
      ref_code: affiliate.ref_code,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Growth Coach error:", error);
    return new Response(JSON.stringify({
      error: "Internal error",
      fallback: getFallbackMessage("es")
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// MESSAGE GENERATION (Cycle-aware + Psychology)
// ============================================================

function generateMessage(params: {
  lang: string;
  cyclePhase: string;
  stats: any;
  leaderboard: any;
  affiliate: any;
  feed: any[];
}): string {
  const { lang, cyclePhase, stats, leaderboard, affiliate, feed } = params;
  const t = translations[lang] || translations["es"];

  const myRank = leaderboard?.user_position || 0;
  const myReferrals = stats?.my_referrals || affiliate?.active_referrals || 0;
  const myEarnings = stats?.my_earnings || affiliate?.total_earned || 0;
  const topEarner = stats?.top_earner_name || "María";
  const topAmount = stats?.top_earner_amount || 0;
  const avgReferrals = stats?.avg_referrals || 0;
  const progress = stats?.progress_to_next_level || {};
  const newThisWeek = stats?.new_this_week || 0;

  // CYCLE-AWARE MESSAGING
  switch (cyclePhase) {
    case "support":
      // MENSTRUAL: Gentle, supportive
      return t.support
        .replace("{name}", affiliate.full_name || "Guerrera")
        .replace("{referrals}", String(myReferrals))
        .replace("{earnings}", String(myEarnings.toFixed(2)));

    case "strategy":
      // FOLLICULAR: Planning, strategy
      return t.strategy
        .replace("{name}", affiliate.full_name || "Guerrera")
        .replace("{top}", topEarner)
        .replace("{top_amount}", String(topAmount.toFixed(2)))
        .replace("{progress_pct}", String(progress.percentage || 0));

    case "competition":
      // OVULATORY: AGGRESSIVE, competitive
      return t.competition
        .replace("{name}", affiliate.full_name || "Guerrera")
        .replace("{rank}", String(myRank))
        .replace("{total}", String(leaderboard.total_affiliates || 0))
        .replace("{top}", topEarner)
        .replace("{top_amount}", String(topAmount.toFixed(2)))
        .replace("{referrals}", String(myReferrals))
        .replace("{new_week}", String(newThisWeek));

    case "urgency":
      // LUTEAL: Close the week
      return t.urgency
        .replace("{name}", affiliate.full_name || "Guerrera")
        .replace("{referrals}", String(myReferrals))
        .replace("{earnings}", String(myEarnings.toFixed(2)))
        .replace("{avg}", String(avgReferrals));

    default:
      return t.competition
        .replace("{name}", affiliate.full_name || "Guerrera")
        .replace("{rank}", String(myRank))
        .replace("{total}", String(leaderboard.total_affiliates || 0))
        .replace("{top}", topEarner)
        .replace("{top_amount}", String(topAmount.toFixed(2)))
        .replace("{referrals}", String(myReferrals))
        .replace("{new_week}", String(newThisWeek));
  }
}

function getOnboardingMessage(lang: string): string {
  const t = translations[lang] || translations["es"];
  return t.onboarding;
}

function getFallbackMessage(lang: string): string {
  const t = translations[lang] || translations["es"];
  return t.fallback;
}

// ============================================================
// TRANSLATIONS
// ============================================================

const translations: Record<string, any> = {
  es: {
    // OVULATORY (aggressive, competitive)
    competition: "🔥 {name}, tu ranking es #{rank} de {total} afiliadas. {top} ganó ${top_amount} este mes. Tú llevas {referrals} referrals. {new_week} mujeres se unieron esta semana. No te quedes atrás — comparte tu código HOY",
    // MENSTRUAL (supportive)
    support: "💜 {name}, descansa hoy. Tu comunidad de {referrals} mujeres te espera cuando estés lista. Llevas ${earnings} en comisiones. No es debilidad, es estrategia. Mañana vuelves con todo.",
    // FOLLICULAR (strategy)
    strategy: "🌱 {name}, planifica tu semana. {top} ganó ${top_amount} este mes con estrategia. Ya llevas {progress_pct}% camino a tu siguiente nivel. ¿Qué 3 amigas vas a invitar esta semana?",
    // LUTEAL (urgency)
    urgency: "⏰ {name}, la semana termina. Llevas {referrals} referrals y ${earnings} en comisiones. El promedio es {avg} referrals por afiliada. Cierra fuerte — comparte tu código antes del domingo",
    // Onboarding
    onboarding: "👋 ¡Hola! Aún no eres afiliada. Únete al programa y gana 30% de comisión por cada mujer que invites. Tu código será único. ¿Empezamos?",
    // Fallback
    fallback: "🚀 Tu código de afiliada está activo. Compártelo con tus amigas y gana comisiones por cada venta."
  },
  en: {
    competition: "🔥 {name}, your rank is #{rank} of {total} affiliates. {top} earned ${top_amount} this month. You have {referrals} referrals. {new_week} women joined this week. Don't fall behind — share your code TODAY",
    support: "💜 {name}, rest today. Your community of {referrals} women is waiting for you. You've earned ${earnings} in commissions. It's not weakness, it's strategy. Tomorrow you'll be back stronger.",
    strategy: "🌱 {name}, plan your week. {top} earned ${top_amount} this month with strategy. You're {progress_pct}% to your next level. Which 3 friends will you invite this week?",
    urgency: "⏰ {name}, the week ends. You have {referrals} referrals and ${earnings} in commissions. The average is {avg} referrals per affiliate. Close strong — share your code before Sunday",
    onboarding: "👋 Hi! You're not an affiliate yet. Join the program and earn 30% commission for each woman you invite. Your code will be unique. Shall we start?",
    fallback: "🚀 Your affiliate code is active. Share it with your friends and earn commissions on every sale."
  },
  pt: {
    competition: "🔥 {name}, sua posição é #{rank} de {total} afiliadas. {top} ganhou ${top_amount} este mês. Você tem {referrals} indicações. {new_week} mulheres se juntaram esta semana. Não fique pra trás — compartilhe seu código HOJE",
    support: "💜 {name}, descanse hoje. Sua comunidade de {referrals} mulheres espera por você. Você ganhou ${earnings} em comissões. Não é fraqueza, é estratégia. Amanhã você volta com tudo.",
    strategy: "🌱 {name}, planeje sua semana. {top} ganhou ${top_amount} este mês com estratégia. Você está a {progress_pct}% do próximo nível. Quais 3 amigas você vai convidar esta semana?",
    urgency: "⏰ {name}, a semana termina. Você tem {referrals} indicações e ${earnings} em comissões. A média é {avg} indicações por afiliada. Feche forte — compartilhe seu código antes de domingo",
    onboarding: "👋 Olá! Você ainda não é afiliada. Junte-se ao programa e ganhe 30% de comissão para cada mulher que convidar. Seu código será único. Vamos começar?",
    fallback: "🚀 Seu código de afiliada está ativo. Compartilhe com suas amigas e ganhe comissões em cada venda."
  },
  fr: {
    competition: "🔥 {name}, ton rang est #{rank} sur {total} affiliées. {top} a gagné ${top_amount} ce mois. Tu as {referrals} referrals. {new_week} femmes ont rejoint cette semaine. Ne reste pas en arrière — partage ton code AUJOURD'HUI",
    support: "💜 {name}, repose-toi aujourd'hui. Ta communauté de {referrals} femmes t'attend. Tu as gagné ${earnings} en commissions. Ce n'est pas de la faiblesse, c'est de la stratégie. Demain tu reviens plus forte.",
    strategy: "🌱 {name}, planifie ta semaine. {top} a gagné ${top_amount} ce mois avec stratégie. Tu es à {progress_pct}% du prochain niveau. Quelles 3 amies vas-tu inviter cette semaine?",
    urgency: "⏰ {name}, la semaine se termine. Tu as {referrals} referrals et ${earnings} en commissions. La moyenne est de {avg} referrals par affiliée. Termine fort — partage ton code avant dimanche",
    onboarding: "👋 Salut ! Tu n'es pas encore affiliée. Rejoins le programme et gagne 30% de commission pour chaque femme invitée. Ton code sera unique. On commence ?",
    fallback: "🚀 Ton code d'affiliée est actif. Partage-le avec tes amies et gagne des commissions sur chaque vente."
  },
  de: {
    competition: "🔥 {name}, dein Rang ist #{rank} von {total} Partnerinnen. {top} hat ${top_amount} diesen Monat verdient. Du hast {referrals} Empfehlungen. {new_week} Frauen sind diese Woche beigetreten. Bleib nicht zurück — teile deinen Code HEUTE",
    support: "💜 {name}, ruh dich heute aus. Deine Community von {referrals} Frauen wartet auf dich. Du hast ${earnings} an Provisionen verdient. Das ist keine Schwäche, das ist Strategie. Morgen kommst du zurück.",
    strategy: "🌱 {name}, plane deine Woche. {top} hat ${top_amount} diesen Monat mit Strategie verdient. Du bist bei {progress_pct}% zum nächsten Level. Welche 3 Freundinnen wirst du diese Woche einladen?",
    urgency: "⏰ {name}, die Woche endet. Du hast {referrals} Empfehlungen und ${earnings} an Provisionen. Der Durchschnitt ist {avg} Empfehlungen pro Partnerin. Schließe stark — teile deinen Code vor Sonntag",
    onboarding: "👋 Hallo! Du bist noch keine Partnerin. Tritt dem Programm bei und verdiene 30% Provision für jede eingeladene Frau. Dein Code wird einzigartig sein. Fangen wir an?",
    fallback: "🚀 Dein Partnerinnen-Code ist aktiv. Teile ihn mit deinen Freundinnen und verdiene Provisionen bei jedem Verkauf."
  }
};
