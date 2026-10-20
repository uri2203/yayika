// Yayika — Admin API proxy.
// Replaces the admin panel's direct anon-key REST calls: every request
// must carry the HMAC session token issued by admin-login; queries run
// with the service role so RLS no longer needs wide-open policies.
//   POST { token, action: query|update|insert|delete,
//          table, select?, filters?, data? }
// verify_jwt stays false (pre-session auth); token is validated here.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TABLES = new Set([
  "yayika_profiles",
  "yayika_subscriptions",
  "yayika_affiliates",
  "yayika_purchases",
  "yayika_products",
  "yayika_product_lessons",
  "yayika_badges",
  "yayika_weekly_challenges",
  "yayika_push_subscriptions",
  "yayika_push_notifications",
  "yayika_feature_flags",
  "yayika_admin_logs",
  "yayika_rate_limits",
]);

const SAFE_CHARS = /^[A-Za-z0-9_.,=&<>|\- *()']+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

async function validToken(token: unknown): Promise<boolean> {
  const secret = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";
  if (!secret || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expPart = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const exp = Number.parseInt(expPart, 10);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await hmacHex(expPart, secret);
  if (mac.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function safe(value: unknown, name: string): string {
  if (typeof value !== "string" || !SAFE_CHARS.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!(await validToken(payload.token))) {
      return json({ error: "Unauthorized" }, 401);
    }

    const table = typeof payload.table === "string" ? payload.table : "";
    if (!ALLOWED_TABLES.has(table)) {
      return json({ error: "Table not allowed" }, 400);
    }

    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const base = `${Deno.env.get("SUPABASE_URL")}/rest/v1/${table}`;
    const action = payload.action;

    if (action === "query") {
      const select =
        payload.select === undefined || payload.select === null || payload.select === "*"
          ? "*"
          : safe(payload.select, "select");
      let url = `${base}?select=${select}`;
      if (payload.filters !== undefined && payload.filters !== null && String(payload.filters) !== "") {
        url += `&${safe(payload.filters, "filters")}`;
      }
      const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const filters = safe(payload.filters ?? "", "filters");
      if (!filters) return json({ error: "filters required" }, 400);
      const res = await fetch(`${base}?${filters}`, {
        method: "PATCH",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload.data ?? {}),
      });
      if (!res.ok) return json({ error: await res.text() }, 400);
      return json({ ok: true });
    }

    if (action === "insert") {
      const res = await fetch(base, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload.data ?? {}),
      });
      if (!res.ok) return json({ error: await res.text() }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const filters = safe(payload.filters ?? "", "filters");
      if (!filters) return json({ error: "filters required" }, 400);
      const res = await fetch(`${base}?${filters}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return json({ error: await res.text() }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
