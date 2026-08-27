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

    // Verify user identity from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing authorization header");
    }

    const body = await req.json();
    const { action, lang = "es" } = body;

    // Get user_id from JWT token, not from request body
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }
    
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

          // Pre-create day records
          const { data: tasks } = await supabase
            .from("yayika_onboarding_tasks")
            .select("day_number, task_key")
            .eq("is_active", true)
            .order("sort_order");

          if (tasks) {
            const dayRecords = tasks.map((t: any) => ({
              user_id: user_id,
              day_number: t.day_number,
              task_key: t.task_key,
              completed: false,
              xp_earned: 0,
            }));
            await supabase.from("yayika_onboarding_days").insert(dayRecords);
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
          current_task: currentTask || {},
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
        return json({ tasks: data || [] });
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
