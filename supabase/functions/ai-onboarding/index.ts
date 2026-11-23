// ============================================================
// Yayika — Onboarding Inteligente Edge Function
// 7-day guided flow for new users
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// User-visible copy for the 7-day guided flow. Catalog rows may only carry
// Spanish text, so keep a 5-language fallback keyed by day number / task_key.
// The caller's `lang` decides which text is returned to the UI.
const TASK_COPY: Record<string, Record<string, { title: string; description: string }>> = {
  es: {
    "1": { title: "Bienvenida a Yayika", description: "Explora la app y conoce las herramientas que te acompañarán en tu camino." },
    "2": { title: "Registra tu ciclo", description: "Anota tu fase y cómo te sientes hoy para empezar a conocer tu ritmo." },
    "3": { title: "Revisa tu energía", description: "Registra tu energía y tu ánimo para detectar patrones con el tiempo." },
    "4": { title: "Conoce tus finanzas", description: "Registra un ingreso o gasto y observa cómo evoluciona tu balance." },
    "5": { title: "Establece una meta", description: "Define un objetivo pequeño y alcanzable para esta semana." },
    "6": { title: "Únete a la comunidad", description: "Comparte tu experiencia en el Círculo de Mujeres y conecta con otras." },
    "7": { title: "Celebra tu primera semana", description: "Revisa tu progreso y celebra todo lo que has logrado." },
  },
  en: {
    "1": { title: "Welcome to Yayika", description: "Explore the app and discover the tools that will support your journey." },
    "2": { title: "Log your cycle", description: "Record your phase and how you feel today to start learning your rhythm." },
    "3": { title: "Check your energy", description: "Log your energy and mood to spot patterns over time." },
    "4": { title: "Get to know your finances", description: "Log an income or expense and watch your balance evolve." },
    "5": { title: "Set a goal", description: "Define a small, achievable goal for this week." },
    "6": { title: "Join the community", description: "Share your experience in the Women's Circle and connect with others." },
    "7": { title: "Celebrate your first week", description: "Review your progress and celebrate everything you've achieved." },
  },
  pt: {
    "1": { title: "Bem-vinda ao Yayika", description: "Explore o app e conheça as ferramentas que vão acompanhar sua jornada." },
    "2": { title: "Registre seu ciclo", description: "Anote sua fase e como você se sente hoje para conhecer seu ritmo." },
    "3": { title: "Acompanhe sua energia", description: "Registre sua energia e seu humor para identificar padrões ao longo do tempo." },
    "4": { title: "Conheça suas finanças", description: "Registre uma receita ou despesa e acompanhe seu saldo." },
    "5": { title: "Defina uma meta", description: "Defina uma meta pequena e alcançável para esta semana." },
    "6": { title: "Entre na comunidade", description: "Compartilhe sua experiência no Círculo de Mulheres e conecte-se com outras." },
    "7": { title: "Celebre sua primeira semana", description: "Revise seu progresso e celebre tudo o que conquistou." },
  },
  fr: {
    "1": { title: "Bienvenue sur Yayika", description: "Explore l'application et découvrez les outils qui vous accompagneront." },
    "2": { title: "Note ton cycle", description: "Indique ta phase et ton ressenti du jour pour découvrir ton rythme." },
    "3": { title: "Note ton énergie", description: "Enregistre ton énergie et ton humeur pour repérer les tendances." },
    "4": { title: "Découvre tes finances", description: "Note un revenu ou une dépense et suis ton solde." },
    "5": { title: "Fixe un objectif", description: "Définis un objectif petit et réalisable pour cette semaine." },
    "6": { title: "Rejoins la communauté", description: "Partage ton expérience dans le Cercle de Femmes et connecte-toi aux autres." },
    "7": { title: "Célèbre ta première semaine", description: "Fais le point sur tes progrès et célèbre tes réussites." },
  },
  de: {
    "1": { title: "Willkommen bei Yayika", description: "Entdecke die App und die Tools, die dich auf deinem Weg begleiten." },
    "2": { title: "Zyklus erfassen", description: "Trage deine Phase und dein heutiges Gefühl ein, um deinen Rhythmus kennenzulernen." },
    "3": { title: "Energie prüfen", description: "Trage Energie und Stimmung ein, um Muster zu erkennen." },
    "4": { title: "Finanzen im Blick", description: "Erfasse Einnahme oder Ausgabe und verfolge deinen Saldo." },
    "5": { title: "Ziel setzen", description: "Setze dir ein kleines, erreichbares Ziel für diese Woche." },
    "6": { title: "Der Community beitreten", description: "Teile deine Erfahrung im Frauenkreis und vernetze dich mit anderen." },
    "7": { title: "Feiere deine erste Woche", description: "Schau auf deinen Fortschritt zurück und feiere deine Erfolge." },
  },
};

// Prefer a translation already present in the catalog; otherwise use the
// 5-language table for the requested language, keeping Spanish DB text intact.
function localizedTaskText(dbValue: any, lang: string, fallback: string): string {
  if (dbValue && typeof dbValue === "object") {
    return dbValue[lang] || dbValue.es || fallback;
  }
  if (typeof dbValue === "string" && dbValue.trim()) {
    return lang === "es" ? dbValue : (fallback || dbValue);
  }
  return fallback || "";
}

function localizeTask(task: any, lang: string): any {
  if (!task) return task;
  const table = TASK_COPY[lang] || TASK_COPY.es;
  const fallback = table[String(task.task_key || "")] || table[String(task.day_number || "")];
  return {
    ...task,
    title: localizedTaskText(task.title, lang, fallback?.title || ""),
    description: localizedTaskText(task.description, lang, fallback?.description || ""),
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Service client: must NOT inherit the caller's Authorization header,
    // otherwise PostgREST runs as the user role and RLS blocks catalog tables.
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user identity from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { action, lang = "es" } = body;

    const user_id = user.id;

    switch (action) {
      // ===== GET STATE =====
      case "getState": {
        // Initialize if not exists (direct insert, avoid RPC)
        const { data: existingOb } = await supabase
          .from("yayika_onboarding")
          .select("id")
          .eq("user_id", user_id)
          .single();

        if (!existingOb) {
          // Create onboarding record
          await supabase.from("yayika_onboarding").insert({
            user_id: user_id,
            current_day: 1,
            started_at: new Date().toISOString(),
          });
        }

        // Idempotent: ensure day progress rows exist (users created before the
        // fix have an onboarding record but no day rows - pre-create only ran
        // when the record was missing).
        const { data: tasks } = await supabase
          .from("yayika_onboarding_tasks")
          .select("day_number, task_key")
          .eq("is_active", true)
          .order("sort_order");

        if (tasks && tasks.length) {
          const { data: existingDays } = await supabase
            .from("yayika_onboarding_days")
            .select("day_number")
            .eq("user_id", user_id);
          const have = new Set((existingDays || []).map((d: any) => d.day_number));
          const missing = tasks
            .filter((t: any) => !have.has(t.day_number))
            .map((t: any) => ({
              user_id: user_id,
              day_number: t.day_number,
              task_key: t.task_key,
              completed: false,
              xp_earned: 0,
            }));
          if (missing.length) {
            await supabase.from("yayika_onboarding_days").insert(missing);
          }
        }

        // Get full state
        const { data: ob } = await supabase
          .from("yayika_onboarding")
          .select("*")
          .eq("user_id", user_id)
          .single();

        const { data: days } = await supabase
          .from("yayika_onboarding_days")
          .select("*")
          .eq("user_id", user_id)
          .order("day_number");

        const completedDays = (days || []).filter((d: any) => d.completed).length;
        const totalDays = 7;

        // Get current task
        const { data: currentTask } = await supabase
          .from("yayika_onboarding_tasks")
          .select("*")
          .eq("day_number", ob?.current_day || 1)
          .eq("is_active", true)
          .single();

        const state = ob ? {
          current_day: ob.current_day,
          started_at: ob.started_at,
          is_completed: ob.is_completed,
          is_skipped: ob.is_skipped,
          total_xp_earned: ob.total_xp_earned,
          completed_days: completedDays,
          total_days: totalDays,
          days_data: (days || []).map((d: any) => ({
            day: d.day_number,
            task_key: d.task_key,
            completed: d.completed,
            completed_at: d.completed_at,
            xp_earned: d.xp_earned,
          })),
          current_task: currentTask ? localizeTask(currentTask, lang) : {},
        } : null;

        // Check if user should see onboarding
        let showOnboarding = false;
        if (state && !state.is_completed && !state.is_skipped) {
          showOnboarding = state.completed_days < state.total_days;
        }

        return json({ state, showOnboarding });
      }

      // ===== COMPLETE DAY =====
      case "completeDay": {
        const { day_number } = body;
        if (!day_number || day_number < 1 || day_number > 7) {
          return json({ error: "Invalid day_number (1-7)" }, 400);
        }

        // Get task info
        const { data: task } = await supabase
          .from("yayika_onboarding_tasks")
          .select("*")
          .eq("day_number", day_number)
          .eq("is_active", true)
          .single();

        if (!task) return json({ error: "Task not found" }, 400);

        // Mark day as completed
        await supabase
          .from("yayika_onboarding_days")
          .update({
            completed: true,
            completed_at: new Date().toISOString(),
            xp_earned: task.xp_reward,
            badge_key: task.badge_key,
          })
          .eq("user_id", user_id)
          .eq("day_number", day_number)
          .eq("completed", false);

        // Count completed days
        const { count: completedCount } = await supabase
          .from("yayika_onboarding_days")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user_id)
          .eq("completed", true);

        const nextDay = Math.min(day_number + 1, 7);
        const allDone = (completedCount || 0) >= 7;

        // Update onboarding state
        const { data: obState } = await supabase
          .from("yayika_onboarding")
          .select("total_xp_earned")
          .eq("user_id", user_id)
          .single();

        await supabase
          .from("yayika_onboarding")
          .update({
            current_day: nextDay,
            total_xp_earned: (obState?.total_xp_earned || 0) + task.xp_reward,
            is_completed: allDone,
            completed_at: allDone ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user_id);

        return json({
          ok: true,
          day: day_number,
          xp_earned: task.xp_reward,
          badge_key: task.badge_key,
          completed_days: completedCount || 0,
          total_days: 7,
          is_all_done: allDone,
          next_day: nextDay,
        });
      }

      // ===== SKIP ONBOARDING =====
      case "skip": {
        await supabase
          .from("yayika_onboarding")
          .update({ is_skipped: true, skipped_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("user_id", user_id);
        return json({ ok: true });
      }

      // ===== GET TASKS =====
      case "getTasks": {
        const { data, error } = await supabase
          .from("yayika_onboarding_tasks")
          .select("*")
          .eq("is_active", true)
          .order("sort_order");
        if (error) throw error;
        return json({ tasks: (data || []).map((task: any) => localizeTask(task, lang)) });
      }

      // ===== CHECK IF NEW USER =====
      case "isNewUser": {
        const { data } = await supabase
          .from("yayika_onboarding")
          .select("id")
          .eq("user_id", user_id)
          .single();

        // Check if user has any activity
        const { data: activity } = await supabase
          .from("yayika_share_stats")
          .select("total_shares")
          .eq("user_id", user_id)
          .single();

        const isNew = !data && (!activity || activity.total_shares === 0);
        return json({ isNew });
      }

      // ===== SAVE PREFERENCES =====
      case "savePreferences": {
        const { goals, cycle_phase, income_range, notifications } = body;
        await supabase.from("yayika_profiles").update({
          goals: goals || [],
          cycle_phase: cycle_phase || null,
          income_range: income_range || null,
          notifications: notifications || { push: true, email: true },
        }).eq("id", user_id);
        return json({ success: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    return json({ error: e.message || "Internal error" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
