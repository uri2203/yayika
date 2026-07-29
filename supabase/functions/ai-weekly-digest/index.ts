// ============================================================
// Yayika — AI Weekly Digest Edge Function
// Sends personalized weekly email summary
// Deploy: supabase functions deploy ai-weekly-digest --no-verify-jwt
// Env vars needed: RESEND_API_KEY
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
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, user_email, user_name, lang } = await req.json();
    const targetLang = lang || "es";

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather weekly data
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    // 1. Cycle logs this week
    const { data: cycleLogs } = await supabase
      .from("yayika_cycle_log")
      .select("*")
      .eq("user_id", user_id)
      .gte("log_date", weekAgoStr)
      .order("log_date", { ascending: false });

    // 2. Daily moods this week
    const { data: moodLogs } = await supabase
      .from("yayika_daily_mood")
      .select("*")
      .eq("user_id", user_id)
      .gte("check_date", weekAgoStr)
      .order("check_date", { ascending: false });

    // 3. Finance summary
    const { data: transactions } = await supabase
      .from("yayika_transactions")
      .select("*")
      .eq("user_id", user_id)
      .gte("date", weekAgoStr);

    // 4. XP and streak
    const { data: progress } = await supabase
      .from("yayika_progress")
      .select("xp_total, streak_days")
      .eq("user_id", user_id)
      .maybeSingle();

    // 5. Challenges completed
    const { data: challenges } = await supabase
      .from("yayika_weekly_challenges")
      .select("challenges, completed, xp_earned")
      .eq("user_id", user_id)
      .gte("week_start", weekAgoStr)
      .maybeSingle();

    // Calculate stats
    const daysChecked = moodLogs?.length || 0;
    const daysCycleLogged = cycleLogs?.length || 0;
    const totalIncome = transactions?.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0) || 0;
    const totalExpenses = transactions?.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0) || 0;
    const challengesCompleted = challenges?.completed?.length || 0;
    const challengesTotal = challenges?.challenges?.length || 4;
    const xpEarned = challenges?.xp_earned || 0;

    // Get dominant phase
    const phases = moodLogs?.map(m => m.cycle_phase).filter(Boolean) || [];
    const dominantPhase = phases.length > 0
      ? phases.sort((a, b) => phases.filter(v => v === a).length - phases.filter(v => v === b).length).pop()
      : null;

    // Get average energy
    const energies = moodLogs?.map(m => m.energy_level).filter(Boolean) || [];
    const avgEnergy = energies.length > 0
      ? (energies.reduce((s, e) => s + e, 0) / energies.length).toFixed(1)
      : null;

    // Build email HTML
    const emailHTML = buildDigestEmail({
      name: user_name || "Guerrera",
      lang: targetLang,
      daysChecked,
      daysCycleLogged,
      totalIncome,
      totalExpenses,
      challengesCompleted,
      challengesTotal,
      xpEarned,
      xpTotal: progress?.xp_total || 0,
      streakDays: progress?.streak_days || 0,
      dominantPhase,
      avgEnergy,
      topSymptoms: getTopSymptoms(cycleLogs || []),
    });

    // Determine subject
    const subjects: Record<string, string> = {
      es: `💜 Tu resumen semanal de Yayika`,
      en: `💜 Your Yayika weekly summary`,
      pt: `💜 Seu resumo semanal do Yayika`,
      fr: `💜 Ton récapitulatif hebdomadaire Yayika`,
      de: `💜 Dein Yayika-Wochenzusammenfassung`
    };

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Yayika <hola@yayika.com>",
        to: user_email,
        subject: subjects[targetLang] || subjects["es"],
        html: emailHTML,
      }),
    });

    if (!emailResponse.ok) {
      const err = await emailResponse.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: "Email send failed", details: err }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store digest record
    await supabase.from("yayika_weekly_digests").insert({
      user_id,
      digest_data: {
        daysChecked, daysCycleLogged, totalIncome, totalExpenses,
        challengesCompleted, xpEarned, dominantPhase, avgEnergy
      },
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, sent_to: user_email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Weekly Digest error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getTopSymptoms(logs: any[]): string[] {
  const freq: Record<string, number> = {};
  logs.forEach(log => {
    if (log.symptoms && Array.isArray(log.symptoms)) {
      log.symptoms.forEach((s: string) => { freq[s] = (freq[s] || 0) + 1; });
    }
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([symptom]) => symptom);
}

function buildDigestEmail(data: {
  name: string; lang: string; daysChecked: number; daysCycleLogged: number;
  totalIncome: number; totalExpenses: number; challengesCompleted: number;
  challengesTotal: number; xpEarned: number; xpTotal: number; streakDays: number;
  dominantPhase: string | null; avgEnergy: string | null; topSymptoms: string[];
}): string {
  const { name, lang } = data;
  
  const phaseNames: Record<string, Record<string, string>> = {
    es: { menstrual: "Menstrual", follicular: "Folicular", ovulatory: "Ovulatoria", luteal: "Lútea" },
    en: { menstrual: "Menstrual", follicular: "Follicular", ovulatory: "Ovulatory", luteal: "Luteal" },
  };
  
  const labels: Record<string, Record<string, string>> = {
    es: {
      greeting: "Hola",
      subtitle: "Aquí está tu resumen de esta semana",
      cycleTitle: "🌕 Tu Ciclo",
      cycleLogged: "días registrados",
      moodTitle: "☀️ Tu Estado de Ánimo",
      moodLogged: "check-ins realizados",
      avgEnergy: "Energía promedio",
      financeTitle: "💰 Tus Finanzas",
      income: "Ingresos",
      expenses: "Gastos",
      balance: "Balance",
      challengeTitle: "🎯 Retos Semanales",
      completed: "completados",
      xpTitle: "⭐ Tu Progreso",
      xpEarned: "XP ganados esta semana",
      xpTotal: "XP totales",
      streak: "días de racha",
      topSymptoms: "Síntomas más frecuentes",
      phase: "Fase dominante",
      cta: "Abrir portal",
      footer: "Enviamos este resumen cada lunes para que mantengas el seguimiento de tu ciclo, finanzas y bienestar.",
    },
    en: {
      greeting: "Hi",
      subtitle: "Here's your summary for this week",
      cycleTitle: "🌕 Your Cycle",
      cycleLogged: "days logged",
      moodTitle: "☀️ Your Mood",
      moodLogged: "check-ins done",
      avgEnergy: "Average energy",
      financeTitle: "💰 Your Finances",
      income: "Income",
      expenses: "Expenses",
      balance: "Balance",
      challengeTitle: "🎯 Weekly Challenges",
      completed: "completed",
      xpTitle: "⭐ Your Progress",
      xpEarned: "XP earned this week",
      xpTotal: "Total XP",
      streak: "day streak",
      topSymptoms: "Top symptoms",
      phase: "Dominant phase",
      cta: "Open portal",
      footer: "We send this summary every Monday so you can track your cycle, finances, and wellness.",
    }
  };

  const l = labels[lang] || labels["es"];
  const phaseName = data.dominantPhase ? (phaseNames[lang] || phaseNames["es"])[data.dominantPhase] || data.dominantPhase : "—";
  const symptomsList = data.topSymptoms.length > 0 ? data.topSymptoms.join(", ") : "—";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f5ff;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:white">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4E3470,#7B5EA7);padding:32px 24px;text-align:center">
      <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:white">Yay<span style="color:#D4B8F5">ika</span></div>
      <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px">${l.subtitle}</div>
    </div>
    
    <!-- Greeting -->
    <div style="padding:24px">
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#2C2240;margin:0 0 4px">${l.greeting}, ${name} 💜</h1>
      <p style="font-size:14px;color:#7A6E85;margin:0 0 24px">${l.subtitle}</p>
      
      <!-- Stats Grid -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr>
          <td width="50%" style="padding:8px">
            <div style="background:#F0EBF8;border-radius:12px;padding:16px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#4E3470">${data.daysCycleLogged}</div>
              <div style="font-size:11px;color:#7A6E85">${l.cycleLogged}</div>
            </div>
          </td>
          <td width="50%" style="padding:8px">
            <div style="background:#E6F7F5;border-radius:12px;padding:16px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#0E7A6D">${data.daysChecked}</div>
              <div style="font-size:11px;color:#7A6E85">${l.moodLogged}</div>
            </div>
          </td>
        </tr>
      </table>

      ${data.avgEnergy ? `
      <div style="background:#FBF6E8;border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:center">
        <span style="font-size:14px;color:#7A6E85">${l.avgEnergy}: </span>
        <span style="font-size:18px;font-weight:600;color:#B8943A">${data.avgEnergy}/5</span>
        ${phaseName !== "—" ? ` · <span style="font-size:13px;color:#7A6E85">${l.phase}: <strong style="color:#4E3470">${phaseName}</strong></span>` : ''}
      </div>
      ` : ''}

      ${data.topSymptoms.length > 0 ? `
      <div style="background:#FDF0F2;border-radius:12px;padding:14px 16px;margin-bottom:16px">
        <div style="font-size:12px;font-weight:600;color:#C96B7A;margin-bottom:4px">🩺 ${l.topSymptoms}</div>
        <div style="font-size:13px;color:#2C2240">${symptomsList}</div>
      </div>
      ` : ''}

      <!-- Finance -->
      ${data.totalIncome > 0 || data.totalExpenses > 0 ? `
      <div style="background:#F8F5FF;border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;color:#4E3470;margin-bottom:10px">${l.financeTitle}</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#3BAF7A">💰 ${l.income}</td>
            <td style="padding:4px 0;font-size:13px;color:#3BAF7A;text-align:right;font-weight:600">$${data.totalIncome.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#C96B7A">💸 ${l.expenses}</td>
            <td style="padding:4px 0;font-size:13px;color:#C96B7A;text-align:right;font-weight:600">-$${data.totalExpenses.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0 0;font-size:14px;font-weight:600;color:#2C2240;border-top:1px solid rgba(123,94,167,0.15)">${l.balance}</td>
            <td style="padding:8px 0 0;font-size:14px;font-weight:700;color:${(data.totalIncome - data.totalExpenses) >= 0 ? '#3BAF7A' : '#C96B7A'};text-align:right;border-top:1px solid rgba(123,94,167,0.15)">$${(data.totalIncome - data.totalExpenses).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      ` : ''}

      <!-- Challenges -->
      <div style="background:#E8F8F1;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="font-size:13px;font-weight:600;color:#1F7A4E;margin-bottom:6px">${l.challengeTitle}</div>
        <div style="font-size:24px;font-weight:700;color:#3BAF7A">${data.challengesCompleted}/${data.challengesTotal}</div>
        <div style="font-size:11px;color:#7A6E85">${l.completed}</div>
      </div>

      <!-- XP -->
      <div style="background:linear-gradient(135deg,#4E3470,#7B5EA7);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
        <div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${l.xpTitle}</div>
        <div style="font-size:32px;font-weight:700;color:#F5D878">+${data.xpEarned}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.7)">${l.xpEarned} · ${data.xpTotal} ${l.xpTotal} · 🔥 ${data.streakDays} ${l.streak}</div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px">
        <a href="https://yayika.com/Portales/" style="display:inline-block;background:#1A9E8F;color:white;padding:12px 32px;border-radius:100px;text-decoration:none;font-size:14px;font-weight:500">${l.cta}</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="padding:16px 24px;background:#F8F5FF;text-align:center">
      <div style="font-size:11px;color:#7A6E85;line-height:1.6">${l.footer}</div>
      <div style="font-size:11px;color:rgba(123,94,167,0.4);margin-top:8px">© 2025 Yayika · yayika.com</div>
    </div>
  </div>
</body>
</html>`;
}
