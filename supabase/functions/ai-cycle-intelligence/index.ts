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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { action, lang = "es" } = body;

    const T: Record<string, Record<string, string>> = {
      es: {
        title: "🧠 Dashboard de Ciclo Inteligente",
        overview: "Resumen de tu ciclo",
        avg_cycle: "Ciclo promedio",
        avg_period: "Período promedio",
        cycles_tracked: "Ciclos registrados",
        regularity: "Regularidad",
        days: "días",
        excellent: "Excelente",
        good: "Buena",
        irregular: "Irregular",
        phase_patterns: "Patrones por fase",
        menstrual: "Menstrual",
        follicular: "Folicular",
        ovulatory: "Ovulatorio",
        luteal: "Lúteo",
        energy: "Energía",
        mood: "Ánimo",
        common_symptoms: "Síntomas comunes",
        predictions: "Próximas predicciones",
        period_start: "Inicio de período",
        ovulation: "Ovulación",
        days_remaining: "días restantes",
        recent_cycles: "Historial de ciclos",
        cycle_history: "Ciclo",
        length: "Duración",
        insights: "Insights personalizados",
        no_data: "Registra tu ciclo para ver analytics detallados",
        pattern_insight: "Basado en tus últimos {n} ciclos",
        no_patterns: "Necesitas al menos 2 ciclos registrados para ver patrones",
      },
      en: {
        title: "🧠 Cycle Intelligence Dashboard",
        overview: "Your cycle overview",
        avg_cycle: "Average cycle",
        avg_period: "Average period",
        cycles_tracked: "Cycles tracked",
        regularity: "Regularity",
        days: "days",
        excellent: "Excellent",
        good: "Good",
        irregular: "Irregular",
        phase_patterns: "Phase patterns",
        menstrual: "Menstrual",
        follicular: "Follicular",
        ovulatory: "Ovulatory",
        luteal: "Luteal",
        energy: "Energy",
        mood: "Mood",
        common_symptoms: "Common symptoms",
        predictions: "Upcoming predictions",
        period_start: "Period start",
        ovulation: "Ovulation",
        days_remaining: "days remaining",
        recent_cycles: "Cycle history",
        cycle_history: "Cycle",
        length: "Length",
        insights: "Personalized insights",
        no_data: "Log your cycle to see detailed analytics",
        pattern_insight: "Based on your last {n} cycles",
        no_patterns: "You need at least 2 registered cycles to see patterns",
      },
    };
    const t = (k: string) => (T[lang] || T.es)[k] || (T.es)[k] || k;

    if (action === "getDashboard") {
      // Calculate analytics
      await supabase.rpc("yayika_calculate_cycle_analytics", { p_user_id: user.id });
      await supabase.rpc("yayika_calculate_phase_patterns", { p_user_id: user.id });
      // Also refresh predictions
      await supabase.rpc("yayika_calculate_predictions", { p_user_id: user.id });

      // Fetch dashboard data
      const { data } = await supabase.rpc("yayika_get_cycle_dashboard", { p_user_id: user.id });
      const dashboard = data?.[0] || {};

      // Generate insights
      const insights: string[] = [];
      const analytics = dashboard.analytics || {};
      const patterns = dashboard.patterns || [];
      const recentCycles = dashboard.recent_cycles || [];

      if (analytics.total_cycles >= 2) {
        const avg = analytics.avg_cycle_length;
        const reg = analytics.regularity_score;
        if (reg >= 0.85) {
          insights.push(`Tu ciclo es muy regular (~${Math.round(avg)} días). Esto facilita la planificación.`);
        } else if (reg >= 0.65) {
          insights.push(`Tu ciclo tiene variaciones normales. Promedio: ~${Math.round(avg)} días.`);
        } else {
          insights.push(`Tu ciclo es irregular. Considera consultar a un profesional si persiste.`);
        }
      }

      if (patterns.length > 0) {
        const menst = patterns.find((p: any) => p.phase === "menstrual");
        const follic = patterns.find((p: any) => p.phase === "follicular");
        const ovul = patterns.find((p: any) => p.phase === "ovulatory");
        const lute = patterns.find((p: any) => p.phase === "luteal");

        if (menst && menst.sample_size >= 2) {
          insights.push(`Fase menstrual: energía promedio ${menst.avg_energy?.toFixed(1)}/5. Prioriza descanso.`);
        }
        if (follic && follic.sample_size >= 2) {
          insights.push(`Fase folicular: tu energía sube. Buen momento para proyectos nuevos.`);
        }
        if (ovul && ovul.sample_size >= 2) {
          insights.push(`Ovulación: energía máxima. Ideal para networking y presentaciones.`);
        }
        if (lute && lute.sample_size >= 2) {
          insights.push(`Fase lútea: energía baja gradual. Reduce compromisos pesados.`);
        }
      }

      if (recentCycles.length >= 3) {
        const last3 = recentCycles.slice(0, 3);
        const avgLen = last3.reduce((s: number, c: any) => s + (c.cycle_length || 28), 0) / 3;
        const trend = last3[0].cycle_length - last3[2].cycle_length;
        if (Math.abs(trend) > 3) {
          insights.push(`Tus ciclos están ${trend > 0 ? "alargándose" : "acortándose"} recientemente.`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        dashboard: {
          ...dashboard,
          insights,
          translations: {
            title: t("title"),
            overview: t("overview"),
            avg_cycle: t("avg_cycle"),
            avg_period: t("avg_period"),
            cycles_tracked: t("cycles_tracked"),
            regularity: t("regularity"),
            days: t("days"),
            excellent: t("excellent"),
            good: t("good"),
            irregular: t("irregular"),
            phase_patterns: t("phase_patterns"),
            menstrual: t("menstrual"),
            follicular: t("follicular"),
            ovulatory: t("ovulatory"),
            luteal: t("luteal"),
            energy: t("energy"),
            mood: t("mood"),
            common_symptoms: t("common_symptoms"),
            predictions: t("predictions"),
            period_start: t("period_start"),
            ovulation: t("ovulation"),
            days_remaining: t("days_remaining"),
            recent_cycles: t("recent_cycles"),
            cycle_history: t("cycle_history"),
            length: t("length"),
            insights: t("insights"),
            no_data: t("no_data"),
            pattern_insight: t("pattern_insight"),
            no_patterns: t("no_patterns"),
          }
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
