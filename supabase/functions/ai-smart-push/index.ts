// ============================================================
// Yayika — AI Smart Push Notifications Edge Function
// Generates contextual notifications based on cycle phase
// Deploy: supabase functions deploy ai-smart-push --no-verify-jwt
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
    const { user_id, cycle_phase, cycle_day, energy_level, mood, last_checkin, streak_days, lang } = await req.json();

    // Determine what notification to send based on context
    const notification = generateSmartNotification({
      cycle_phase,
      cycle_day,
      energy_level,
      mood,
      last_checkin,
      streak_days,
      lang: lang || "es"
    });

    // Store notification
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl && supabaseKey && user_id) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("yayika_push_notifications").insert({
          user_id,
          notification_title: notification.title,
          notification_body: notification.body,
          notification_type: notification.type,
          notification_icon: notification.icon,
          cycle_phase,
        });
      }
    } catch (e) {
      console.warn("Failed to store notification:", e);
    }

    return new Response(JSON.stringify(notification), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Smart Push error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// SMART NOTIFICATION GENERATOR
// ============================================================

function generateSmartNotification(ctx: {
  cycle_phase: string | null;
  cycle_day: number | null;
  energy_level: number | null;
  mood: string | null;
  last_checkin: string | null;
  streak_days: number | null;
  lang: string;
}): { title: string; body: string; icon: string; type: string } {
  
  const lang = ctx.lang || "es";
  
  // Priority 1: No check-in today → remind
  if (!ctx.last_checkin || ctx.last_checkin !== new Date().toISOString().split("T")[0]) {
    const reminders: Record<string, { title: string; body: string }> = {
      es: { title: "☀️ Buenos días", body: "¿Cómo amaneciste? Haz tu check-in diario para ganar XP" },
      en: { title: "☀️ Good morning", body: "How did you wake up? Do your daily check-in to earn XP" },
      pt: { title: "☀️ Bom dia", body: "Como você acordou? Faça seu check-in diário para ganhar XP" },
      fr: { title: "☀️ Bonjour", body: "Comment t'es-tu réveillée ? Fais ton check-in quotidien" },
      de: { title: "☀️ Guten Morgen", body: "Wie bist du aufgewacht? Mache dein tägliches Check-in" }
    };
    const r = reminders[lang] || reminders["es"];
    return { title: r.title, body: r.body, icon: "☀️", type: "reminder" };
  }
  
  // Priority 2: Streak milestone
  if (ctx.streak_days && [3, 7, 14, 21, 30].includes(ctx.streak_days)) {
    const streakMsgs: Record<string, Record<number, { title: string; body: string }>> = {
      es: {
        3: { title: "🔥 ¡3 días seguidos!", body: "Llevas 3 días constantes. ¡Sigue así!" },
        7: { title: "🏆 ¡Una semana completa!", body: "7 días de racha. Eres disciplinada" },
        14: { title: "👑 ¡14 días de racha!", body: "2 semanas seguidas. ¡Eres increíble!" },
        21: { title: "💎 ¡21 días!", body: "3 semanas constantes. Ya es un hábito" },
        30: { title: "🌟 ¡30 días de racha!", body: "Un mes entero. ¡Leyenda absoluta!" }
      },
      en: {
        3: { title: "🔥 3 days in a row!", body: "You've been consistent for 3 days. Keep going!" },
        7: { title: "🏆 A full week!", body: "7-day streak. You're disciplined" },
        14: { title: "👑 14-day streak!", body: "2 weeks straight. You're amazing!" },
        21: { title: "💎 21 days!", body: "3 weeks consistent. It's already a habit" },
        30: { title: "🌟 30-day streak!", body: "A whole month. Absolute legend!" }
      }
    };
    const msgs = streakMsgs[lang] || streakMsgs["es"];
    const msg = msgs[ctx.streak_days];
    if (msg) return { title: msg.title, body: msg.body, icon: "🔥", type: "streak" };
  }
  
  // Priority 3: Phase-specific tip
  const phaseTips: Record<string, Record<string, { title: string; body: string }>> = {
    es: {
      menstrual: { title: "🩸 Fase Menstrual", body: "Tu cuerpo se renueva. Prioriza el descanso hoy" },
      follicular: { title: "🌱 Energía subiendo", body: "Tu fase folicular empezó. ¡Es momento de crear!" },
      ovulatory: { title: "✨ Tu momento de brillar", body: "Energía máxima. Hoy es ideal para negociar" },
      luteal: { title: "🌙 Fase Lútea", body: "Tiempo de organizar y cerrar proyectos" }
    },
    en: {
      menstrual: { title: "🩸 Menstrual Phase", body: "Your body is renewing. Prioritize rest today" },
      follicular: { title: "🌱 Energy rising", body: "Your follicular phase started. Time to create!" },
      ovulatory: { title: "✨ Your time to shine", body: "Peak energy. Today is ideal for negotiating" },
      luteal: { title: "🌙 Luteal Phase", body: "Time to organize and wrap up projects" }
    }
  };
  
  const phaseMsgs = (phaseTips[lang] || phaseTips["es"])[ctx.cycle_phase || "follicular"];
  if (phaseMsgs) return { title: phaseMsgs.title, body: phaseMsgs.body, icon: "🌙", type: "phase" };
  
  // Default: motivational
  const defaults: Record<string, { title: string; body: string }> = {
    es: { title: "💜 Yayika", body: "Recuerda: eres poderosa y mereces todo lo bueno" },
    en: { title: "💜 Yayika", body: "Remember: you are powerful and deserve all good things" },
    pt: { title: "💜 Yayika", body: "Lembre-se: você é poderosa e merece tudo de bom" },
    fr: { title: "💜 Yayika", body: "Rappelle-toi : tu es puissante et tu mérites tout le bien" },
    de: { title: "💜 Yayika", body: "Denk daran: Du bist mächtig und verdienst alles Gute" }
  };
  
  const d = defaults[lang] || defaults["es"];
  return { title: d.title, body: d.body, icon: "💜", type: "motivational" };
}
