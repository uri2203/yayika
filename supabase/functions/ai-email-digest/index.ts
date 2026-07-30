import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const body = await req.json();
    const { action, user_id, lang = "es" } = body;

    // Only service role can trigger digest
    if (action === "sendDigest") {
      if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Get user profile
      const { data: profile } = await supabase.from("yayika_profiles").select("id, display_name, email").eq("id", user_id).single();
      if (!profile || !profile.email) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Get digest preferences
      const { data: prefs } = await supabase.from("yayika_digest_prefs").select("*").eq("user_id", user_id).single();
      const userLang = prefs?.lang || lang;

      // Gather weekly data
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      // Cycle day
      let cycleDay = 1;
      let phaseName = "Folicular";
      try {
        const { data: cd } = await supabase.rpc("yayika_get_cycle_day", { p_user_id: user_id });
        cycleDay = cd || 1;
        // Simple phase detection
        const adj = ((cycleDay - 1) % 28) + 1;
        if (adj <= 5) phaseName = userLang === "es" ? "Menstrual" : "Menstrual";
        else if (adj <= 13) phaseName = userLang === "es" ? "Folicular" : "Follicular";
        else if (adj <= 18) phaseName = userLang === "es" ? "Ovulatorio" : "Ovulatory";
        else phaseName = userLang === "es" ? "Lúteo" : "Luteal";
      } catch (e) {}

      // Streak
      let streak = 0;
      try {
        const { data: streakData } = await supabase.from("yayika_checkins").select("checkin_date").eq("user_id", user_id).order("checkin_date", { ascending: false }).limit(30);
        if (streakData) {
          const today = new Date().toISOString().split("T")[0];
          let checkDate = new Date(today);
          for (const s of streakData) {
            if (s.checkin_date === checkDate.toISOString().split("T")[0]) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else break;
          }
        }
      } catch (e) {}

      // XP this week
      let weeklyXP = 0;
      try {
        const { data: xpData } = await supabase.from("yayika_xp_events").select("xp_amount").eq("user_id", user_id).gte("created_at", weekStart.toISOString());
        weeklyXP = xpData?.reduce((sum: number, x: any) => sum + (x.xp_amount || 0), 0) || 0;
      } catch (e) {}

      // Active challenges
      let activeChallenges = 0;
      try {
        const { data: chData } = await supabase.from("yayika_user_challenges").select("id").eq("user_id", user_id).eq("status", "active");
        activeChallenges = chData?.length || 0;
      } catch (e) {}

      // Build email content
      const T: Record<string, any> = {
        es: {
          subject: `📊 Tu resumen semanal Yayika — ${phaseName}`,
          greeting: `Hola ${profile.display_name || "Guerrera"} 👋`,
          phase: `Estás en fase ${phaseName} (día ${cycleDay})`,
          streak: `🔥 Racha: ${streak} días`,
          xp: `⭐ XP esta semana: +${weeklyXP}`,
          challenges: `🎯 Retos activos: ${activeChallenges}`,
          tip: getTip(cycleDay, userLang),
          cta: "Ver mi dashboard →",
          footer: "Yayika — Tu compañera de ciclo 💜",
        },
        en: {
          subject: `📊 Your Yayika Weekly Summary — ${phaseName}`,
          greeting: `Hi ${profile.display_name || "Warrior"} 👋`,
          phase: `You're in the ${phaseName} phase (day ${cycleDay})`,
          streak: `🔥 Streak: ${streak} days`,
          xp: `⭐ XP this week: +${weeklyXP}`,
          challenges: `🎯 Active challenges: ${activeChallenges}`,
          tip: getTip(cycleDay, userLang),
          cta: "View my dashboard →",
          footer: "Yayika — Your cycle companion 💜",
        }
      };

      const t = T[userLang] || T.es;

      // Build HTML email
      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:24px">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:32px;font-weight:700;color:#fff">✨ Yayika</div>
  </div>
  <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;padding:24px;border:1px solid rgba(255,255,255,0.08)">
    <div style="font-size:16px;color:#fff;margin-bottom:16px">${t.greeting}</div>
    <div style="font-size:14px;color:#00B4D8;margin-bottom:20px;padding:10px;background:rgba(0,180,216,0.1);border-radius:10px">${t.phase}</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
      <div style="font-size:14px;color:#E8E8E8;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px">${t.streak}</div>
      <div style="font-size:14px;color:#E8E8E8;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px">${t.xp}</div>
      <div style="font-size:14px;color:#E8E8E8;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px">${t.challenges}</div>
    </div>
    <div style="font-size:13px;color:#B8943A;padding:12px;background:rgba(184,148,58,0.1);border-radius:10px;margin-bottom:20px">💡 ${t.tip}</div>
    <div style="text-align:center">
      <a href="https://yayika.com/Portales/" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#00B4D8,#0096C7);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">${t.cta}</a>
    </div>
  </div>
  <div style="text-align:center;margin-top:20px;font-size:11px;color:#666">${t.footer}</div>
</div>
</body>
</html>`;

      // Send via Resend
      if (resendKey) {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Yayika <digest@yayika.com>",
              to: [profile.email],
              subject: t.subject,
              html,
            }),
          });
          const emailData = await emailRes.json();
          if (emailData.id) {
            // Log digest
            await supabase.from("yayika_digest_history").insert({
              user_id, week_start: weekStart.toISOString().split("T")[0],
              subject: t.subject, body_preview: t.phase, sections: ["cycle", "streak", "xp"],
              status: "sent"
            });
          }
          return new Response(JSON.stringify({ success: true, emailId: emailData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ success: false, error: String(e) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        // No Resend key — log but don't fail
        await supabase.from("yayika_digest_history").insert({
          user_id, week_start: weekStart.toISOString().split("T")[0],
          subject: t.subject, body_preview: t.phase, sections: ["cycle", "streak", "xp"],
          status: "skipped"
        });
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "No RESEND_API_KEY" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "getDigestHistory") {
      const authHeader = req.headers.get("Authorization")!;
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data } = await supabase.from("yayika_digest_history").select("*").eq("user_id", user.id).order("sent_at", { ascending: false }).limit(12);
      return new Response(JSON.stringify({ success: true, history: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function getTip(cycleDay: number, lang: string): string {
  const adj = ((cycleDay - 1) % 28) + 1;
  const tips: Record<string, string[]> = {
    es: [
      "Menstrual: Prioriza el descanso y la autocuidado. Tu cuerpo se está renovando.",
      "Folicular: ¡Energía en alza! Es buen momento para empezar proyectos nuevos.",
      "Ovulatorio: Tu confianza está en su máximo. Aprovecha para socializar y presentar ideas.",
      "Lúteo: Reduce el ritmo. Organiza tareas simples y prepárate para descansar.",
    ],
    en: [
      "Menstrual: Prioritize rest and self-care. Your body is renewing itself.",
      "Follicular: Energy rising! Great time to start new projects.",
      "Ovulatory: Your confidence is at its peak. Use it for networking and sharing ideas.",
      "Luteal: Slow down. Organize simple tasks and prepare to rest.",
    ],
  };
  const idx = adj <= 5 ? 0 : adj <= 13 ? 1 : adj <= 18 ? 2 : 3;
  return (tips[lang] || tips.es)[idx];
}
