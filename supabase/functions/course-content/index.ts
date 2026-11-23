// Signed, entitlement-checked access to private course assets.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "yayika-course-content";
const corsHeaders = { "Access-Control-Allow-Origin": "*" };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { path } = await req.json();
    if (typeof path !== "string" || !/^(courses|videos)\/[A-Za-z0-9._/-]+$/.test(path) || path.includes("..")) {
      return new Response(JSON.stringify({ error: "Invalid path" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: sub } = await supabase
      .from("yayika_subscriptions")
      .select("status, current_period_end, grace_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    const periodValid = sub?.current_period_end ? new Date(sub.current_period_end).getTime() > now : false;
    const graceValid = sub?.grace_period_end ? new Date(sub.grace_period_end).getTime() > now : false;
    const subscribed = !!sub && (
      ((sub.status === "active" || sub.status === "trialing") && periodValid) ||
      (sub.status === "past_due" && graceValid)
    );

    const { data: purchase } = await supabase
      .from("yayika_user_purchases")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "completed"])
      .limit(1)
      .maybeSingle();

    if (!subscribed && !purchase) {
      return new Response(JSON.stringify({ error: "No access to this content" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 900);
    if (error) throw error;
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
