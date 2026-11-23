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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { action, challenge_id, enrollment_id, notes, lang = "es" } = body;

    const T: Record<string, Record<string, string>> = {
      es: {
        title: "🎯 Retos Semanales", join: "Unirse", checkin: "Check-in",
        daysLeft: "días restantes", completed: "Completado", xpEarned: "XP ganados",
        noActive: "No tienes retos activos. ¡Únete a uno!", progress: "Progreso",
        stats: "Tu estadísticas", activeCount: "Activos", completedCount: "Completados",
        streak: "Racha",
      },
      en: {
        title: "🎯 Weekly Challenges", join: "Join", checkin: "Check-in",
        daysLeft: "days left", completed: "Completed", xpEarned: "XP earned",
        noActive: "No active challenges. Join one!", progress: "Progress",
        stats: "Your stats", activeCount: "Active", completedCount: "Completed",
        streak: "Streak",
      },
      pt: {
        title: "🎯 Desafios Semanais", join: "Participar", checkin: "Check-in",
        daysLeft: "dias restantes", completed: "Concluído", xpEarned: "XP ganhos",
        noActive: "Você não tem desafios ativos. Participe de um!", progress: "Progresso",
        stats: "Suas estatísticas", activeCount: "Ativos", completedCount: "Concluídos",
        streak: "Sequência",
      },
      fr: {
        title: "🎯 Défis Hebdomadaires", join: "Rejoindre", checkin: "Check-in",
        daysLeft: "jours restants", completed: "Terminé", xpEarned: "XP gagnés",
        noActive: "Vous n'avez aucun défi actif. Rejoignez-en un !", progress: "Progression",
        stats: "Vos statistiques", activeCount: "Actifs", completedCount: "Terminés",
        streak: "Série",
      },
      de: {
        title: "🎯 Wöchentliche Herausforderungen", join: "Beitreten", checkin: "Check-in",
        daysLeft: "verbleibende Tage", completed: "Abgeschlossen", xpEarned: "XP verdient",
        noActive: "Du hast keine aktiven Herausforderungen. Tritt einer bei!", progress: "Fortschritt",
        stats: "Deine Statistik", activeCount: "Aktiv", completedCount: "Abgeschlossen",
        streak: "Serie",
      },
    };
    const t = (k: string) => (T[lang] || T.es)[k] || (T.es)[k] || k;

    if (action === "getWeeklyChallenges") {
      const { data, error } = await supabase.rpc("yayika_get_weekly_challenges", { p_user_id: user.id });
      if (error) throw error;

      const result = data?.[0] || {};

      return new Response(JSON.stringify({
        success: true,
        available: result.available || [],
        active: result.active || [],
        completed: result.completed || [],
        stats: result.stats || {},
        translations: {
          title: t("title"), join: t("join"), checkin: t("checkin"),
          daysLeft: t("daysLeft"), completed: t("completed"), xpEarned: t("xpEarned"),
          noActive: t("noActive"), progress: t("progress"), stats: t("stats"),
          activeCount: t("activeCount"), completedCount: t("completedCount"), streak: t("streak"),
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "enroll") {
      if (!challenge_id) return new Response(JSON.stringify({ error: "challenge_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data, error } = await supabase.rpc("yayika_enroll_challenge", { p_user_id: user.id, p_challenge_id: challenge_id });
      if (error) throw error;

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "checkin") {
      if (!enrollment_id) return new Response(JSON.stringify({ error: "enrollment_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data, error } = await supabase.rpc("yayika_checkin_challenge", { p_user_id: user.id, p_enrollment_id: enrollment_id, p_notes: notes || null });
      if (error) throw error;

      // Award XP if completed
      if (data?.completed && data?.xp_earned > 0) {
        await supabase.from("yayika_xp_events").insert({
          user_id: user.id,
          event_type: "challenge_complete",
          xp_amount: data.xp_earned,
          metadata: { enrollment_id }
        });
      }

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
