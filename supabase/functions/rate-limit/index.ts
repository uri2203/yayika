// ============================================================
// Yayika — Server-side Rate Limiting Edge Function
// Contract:
//   POST { mode: "check" | "record", action: "<bucket e.g. login>",
//          identifier: "<who e.g. email or ip>", type?: "auth"|"api"|"checkout"|"email" }
//   check  -> reads the window count, never writes (allowed?)
//   record -> counts, enforces 429, writes the entry
//   Both modes use the SAME (identifier, action) bucket, so counts match.
// verify_jwt stays false on purpose: rate limiting must be callable
// before authentication (login brute force). Inputs are tightly
// validated so it cannot be abused as a storage hole.
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

const SAFE_KEY = /^[a-zA-Z0-9._@:\-]{1,128}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { action, identifier, type = "api" } = payload ?? {};
    // mode defaults to "record": a bare call must still be counted/enforced,
    // otherwise unlimited "check"-only traffic would never consume budget.
    const mode = payload?.mode ?? "record";

    if (typeof action !== "string" || !action || typeof identifier !== "string" || !identifier) {
      return json({ error: "Missing action or identifier" }, 400);
    }
    if (!SAFE_KEY.test(action) || !SAFE_KEY.test(identifier)) {
      return json({ error: "Invalid action or identifier format" }, 400);
    }
    if (mode !== "check" && mode !== "record") {
      return json({ error: "mode must be 'check' or 'record'" }, 400);
    }
    const typeKey = typeof type === "string" && RATE_LIMITS[type] ? type : "api";

    const limit = RATE_LIMITS[typeKey];
    const windowStart = Date.now() - limit.windowMs;

    // Count entries for THIS bucket inside the window (same query for both modes)
    const { data: entries, error } = await supabase
      .from("yayika_rate_limits")
      .select("created_at")
      .eq("identifier", identifier)
      .eq("action", action)
      .gt("created_at", new Date(windowStart).toISOString());

    if (error) {
      // Table missing or transient failure - fail open but flag it
      console.error("Rate limit query error:", error);
      return json({ allowed: true, remaining: limit.maxRequests, degraded: true });
    }

    const currentCount = entries?.length || 0;

    if (mode === "check") {
      return json({
        allowed: currentCount < limit.maxRequests,
        remaining: Math.max(0, limit.maxRequests - currentCount),
        limit: limit.maxRequests,
        windowMs: limit.windowMs,
      });
    }

    // mode === "record"
    if (currentCount >= limit.maxRequests) {
      // The slot frees when the OLDEST entry in the window expires
      const oldestMs = Math.min(
        ...(entries ?? []).map((e: { created_at: string }) => new Date(e.created_at).getTime()),
      );
      const retryAfterMs = Number.isFinite(oldestMs)
        ? Math.max(1000, oldestMs + limit.windowMs - Date.now())
        : limit.windowMs;
      return json({ allowed: false, remaining: 0, retryAfterMs }, 429);
    }

    const { error: insertError } = await supabase.from("yayika_rate_limits").insert({
      identifier,
      action,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      // Fail open on write errors so auth flows never brick, but flag it
      console.error("Rate limit insert error:", insertError);
      return json({ allowed: true, remaining: limit.maxRequests - currentCount, degraded: true });
    }

    // Opportunistic cleanup (~1 in 100 records) of expired rows
    if (Math.random() < 0.01) {
      await supabase
        .from("yayika_rate_limits")
        .delete()
        .lt("created_at", new Date(Date.now() - limit.windowMs * 2).toISOString());
    }

    return json({
      allowed: true,
      remaining: Math.max(0, limit.maxRequests - currentCount - 1),
    });
  } catch (error) {
    console.error("Rate limit error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
