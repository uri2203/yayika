// ============================================================
// Yayika — Server-side Rate Limiting Edge Function
// Deploy: supabase functions deploy rate-limit
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 },      // 5 per 15 min
  api: { maxRequests: 60, windowMs: 60 * 1000 },            // 60 per min
  checkout: { maxRequests: 10, windowMs: 60 * 1000 },       // 10 per min
  email: { maxRequests: 5, windowMs: 60 * 1000 },           // 5 per min
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, identifier, type = "api" } = await req.json();

    if (!action || !identifier) {
      return new Response(
        JSON.stringify({ error: "Missing action or identifier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = RATE_LIMITS[type] || RATE_LIMITS.api;
    const windowStart = Date.now() - limit.windowMs;

    // Query rate limit table
    const { data: entries, error } = await supabase
      .from("yayika_rate_limits")
      .select("created_at")
      .eq("identifier", identifier)
      .eq("action", action)
      .gt("created_at", new Date(windowStart).toISOString());

    if (error) {
      // Table might not exist - allow the request
      console.error("Rate limit query error:", error);
      return new Response(
        JSON.stringify({ allowed: true, remaining: limit.maxRequests }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentCount = entries?.length || 0;

    if (action === "check") {
      return new Response(
        JSON.stringify({
          allowed: currentCount < limit.maxRequests,
          remaining: Math.max(0, limit.maxRequests - currentCount),
          limit: limit.maxRequests,
          windowMs: limit.windowMs,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "record") {
      if (currentCount >= limit.maxRequests) {
        return new Response(
          JSON.stringify({
            allowed: false,
            remaining: 0,
            retryAfterMs: limit.windowMs - (Date.now() - windowStart),
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record this request
      await supabase.from("yayika_rate_limits").insert({
        identifier,
        action: action,
        created_at: new Date().toISOString(),
      });

      // Cleanup old entries (every 100th request)
      if (Math.random() < 0.01) {
        await supabase
          .from("yayika_rate_limits")
          .delete()
          .lt("created_at", new Date(Date.now() - limit.windowMs * 2).toISOString());
      }

      return new Response(
        JSON.stringify({
          allowed: true,
          remaining: limit.maxRequests - currentCount - 1,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rate limit error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
