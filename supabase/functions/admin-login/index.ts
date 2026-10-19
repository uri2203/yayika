// ============================================================
// Yayika — Admin Login Edge Function
// The admin password lives ONLY in the ADMIN_PASSWORD env var
// (never in client JS). Sessions are HMAC-signed tokens.
//   POST { action: "login", password }  -> { token, expiresAt }
//   POST { action: "verify", token }    -> { valid: true }
// Rate limited: 5 attempts / 15 min per IP (yayika_rate_limits).
// verify_jwt stays false (login happens pre-session) but every
// request is validated inside this function.
// Deploy: supabase functions deploy admin-login --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h
const RATE_MAX = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacHex(msg: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(msg: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// constant-time string compare over sha256 digests
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  if (ha.length !== hb.length) return false;
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const password = Deno.env.get("ADMIN_PASSWORD");
    const secret = Deno.env.get("ADMIN_SESSION_SECRET");
    if (!password || !secret) {
      console.error("ADMIN_PASSWORD / ADMIN_SESSION_SECRET not configured");
      return json({ error: "Server not configured" }, 500);
    }

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const action = payload.action;

    if (action === "verify") {
      const token = typeof payload.token === "string" ? payload.token : "";
      const dot = token.indexOf(".");
      if (dot <= 0) return json({ error: "Invalid token" }, 401);
      const expPart = token.slice(0, dot);
      const mac = token.slice(dot + 1);
      const expected = await hmacHex(expPart, secret);
      // constant-time mac compare
      let diff = 0;
      if (mac.length !== expected.length) return json({ error: "Invalid token" }, 401);
      for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
      if (diff !== 0) return json({ error: "Invalid token" }, 401);
      const exp = Number.parseInt(expPart, 10);
      if (!Number.isFinite(exp) || Date.now() > exp) {
        return json({ error: "Session expired" }, 401);
      }
      return json({ valid: true, expiresAt: new Date(exp).toISOString() });
    }

    if (action !== "login") {
      return json({ error: "Unknown action" }, 400);
    }

    // ---- rate limit: 5 attempts / 15 min per IP ----
    const ip =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { data: attempts, error: rateErr } = await supabase
      .from("yayika_rate_limits")
      .select("created_at")
      .eq("identifier", `admin:${ip}`)
      .eq("action", "admin_login")
      .gt("created_at", windowStart);

    if (!rateErr && (attempts?.length ?? 0) >= RATE_MAX) {
      return json({ error: "Demasiados intentos. Intenta en 15 minutos." }, 429);
    }

    const attempt = typeof payload.password === "string" ? payload.password : "";
    const ok = attempt.length > 0 && (await safeEqual(attempt, password));

    // record every attempt (success or failure) - fail open on insert error
    await supabase.from("yayika_rate_limits").insert({
      identifier: `admin:${ip}`,
      action: "admin_login",
      created_at: new Date().toISOString(),
    });

    if (!ok) {
      return json({ error: "Contraseña incorrecta" }, 401);
    }

    const exp = Date.now() + SESSION_TTL_MS;
    const expStr = String(exp);
    const mac = await hmacHex(expStr, secret);
    return json({ token: `${expStr}.${mac}`, expiresAt: new Date(exp).toISOString() });
  } catch (error) {
    console.error("admin-login error:", error);
    return json({ error: "Internal error" }, 500);
  }
});
