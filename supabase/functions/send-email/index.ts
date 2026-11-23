// ============================================================
// Yayika — send-email Edge Function
// Envía emails transaccionales via Resend
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPPORT_INBOX = Deno.env.get("SUPPORT_INBOX") || "hola@yayika.com";
const FROM_EMAIL = "Yayika <hola@yayika.com>";
const DOMAIN = "https://yayika.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

interface EmailPayload {
  type: "welcome" | "purchase" | "subscription" | "commission" | "withdrawal" | "payment_failed" | "payment_recovered" | "support" | "custom";
  to: string;
  name?: string;
  product?: string;
  amount?: string;
  plan?: string;
  commission?: string;
  referralName?: string;
  method?: string;
  grace_period_days?: string;
  next_retry?: string;
  subject?: string;
  message?: string;
  user_email?: string;
  user_id?: string;
  customSubject?: string;
  customHtml?: string;
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

// Best-effort, per-isolate rate limit. It is not a replacement for a shared
// store, but it stops trivial loops from a single client.
const rateBuckets = new Map<string, { count: number; reset: number }>();
function allowRequest(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  for (const [k, bucket] of rateBuckets) {
    if (bucket.reset <= now) rateBuckets.delete(k);
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.reset <= now) {
    rateBuckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

// --- Email Templates ---

function welcomeTemplate(name: string): string {
  name = escapeHtml(name);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#FAF7F2;padding:40px 20px;color:#2C2240">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-family:Georgia,serif;font-size:32px;color:#4E3470;margin:0">Yay<span style="color:#C96B7A">ika</span></h1>
    </div>
    <h2 style="font-size:22px;color:#2C2240;margin-bottom:12px">¡Bienvenida, ${name}! 🎉</h2>
    <p style="font-size:15px;color:#6B7280;line-height:1.7;margin-bottom:20px">
      Estamos encantadas de tenerte aquí. Yayika fue creado para darte las herramientas que necesitas para organizar tu vida, mejorar tus finanzas y negociar con confianza.
    </p>
    <p style="font-size:15px;color:#6B7280;line-height:1.7;margin-bottom:24px">
      <strong>Tu primer producto gratis ya está esperándote</strong> en el portal. Solo necesitas iniciar sesión:
    </p>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${DOMAIN}/Portales/" style="display:inline-block;background:#1A9E8F;color:white;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:500;text-decoration:none">
        Entrar al portal →
      </a>
    </div>
    <p style="font-size:13px;color:#999;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin:0">
      Si tienes alguna pregunta, responde a este correo. Estamos para ayudarte.<br>
      — El equipo de Yayika 💜
    </p>
  </div>
</body>
</html>`;
}

function purchaseTemplate(name: string, product: string, amount: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#FAF7F2;padding:40px 20px;color:#2C2240">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-family:Georgia,serif;font-size:32px;color:#4E3470;margin:0">Yay<span style="color:#C96B7A">ika</span></h1>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:60px;height:60px;background:#E8F8F5;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px">✅</div>
    </div>
    <h2 style="font-size:22px;color:#2C2240;margin-bottom:12px;text-align:center">¡Pago confirmado!</h2>
    <p style="font-size:15px;color:#6B7280;line-height:1.7;margin-bottom:20px;text-align:center">
      Hola ${name}, tu compra ha sido procesada exitosamente.
    </p>
    <div style="background:#F8F5FF;border-radius:12px;padding:20px;margin-bottom:24px">
      <table style="width:100%;font-size:14px">
        <tr><td style="color:#6B7280;padding:4px 0">Producto:</td><td style="font-weight:600;text-align:right">${product}</td></tr>
        <tr><td style="color:#6B7280;padding:4px 0">Monto:</td><td style="font-weight:600;text-align:right;color:#1A9E8F">${amount}</td></tr>
        <tr><td style="color:#6B7280;padding:4px 0">Estado:</td><td style="font-weight:600;text-align:right;color:#3BAF7A">Pagado ✓</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${DOMAIN}/Portales/" style="display:inline-block;background:#4E3470;color:white;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:500;text-decoration:none">
        Acceder a mi producto →
      </a>
    </div>
    <p style="font-size:13px;color:#999;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin:0">
      Recibiste este correo porque completaste una compra en yayika.com.<br>
      ¿Preguntas? Responde a este correo.<br>
      — El equipo de Yayika 💜
    </p>
  </div>
</body>
</html>`;
}

function subscriptionTemplate(name: string, plan: string): string {
  const planDetails: Record<string, { price: string; features: string }> = {
    semilla: { price: "$179 MXN/mes", features: "3 productos, portal interactivo, sistema XP, circulo de amigas" },
    guerrera: { price: "$349 MXN/mes", features: "Todos los productos, dashboard, Ciclo Productiva, circulos ilimitados" },
    diamante: { price: "$549 MXN/mes", features: "Todo lo de Guerrera + sesion grupal, comision 20%, soporte prioritario" },
  };
  const details = planDetails[plan] || planDetails.guerrera;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#FAF7F2;padding:40px 20px;color:#2C2240">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-family:Georgia,serif;font-size:32px;color:#4E3470;margin:0">Yay<span style="color:#C96B7A">ika</span></h1>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:60px;height:60px;background:#F0EBF8;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px">👑</div>
    </div>
    <h2 style="font-size:22px;color:#2C2240;margin-bottom:12px;text-align:center">¡Bienvenida a tu membresía!</h2>
    <p style="font-size:15px;color:#6B7280;line-height:1.7;margin-bottom:20px;text-align:center">
      Hola ${name}, tu membresía <strong>${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> está activa.
    </p>
    <div style="background:#F0EBF8;border-radius:12px;padding:20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;color:#7B5EA7;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Tu plan incluye</div>
      <p style="font-size:14px;color:#2C2240;margin:0 0 8px"><strong>${details.price}</strong></p>
      <p style="font-size:13px;color:#6B7280;margin:0">${details.features}</p>
    </div>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${DOMAIN}/Portales/" style="display:inline-block;background:#1A9E8F;color:white;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:500;text-decoration:none">
        Explorar mi portal →
      </a>
    </div>
    <p style="font-size:13px;color:#999;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin:0">
      Puedes cancelar tu membresía en cualquier momento desde tu portal.<br>
      — El equipo de Yayika 💜
    </p>
  </div>
</body>
</html>`;
}

function commissionTemplate(name: string, product: string, commission: string, referralName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#FAF7F2;padding:40px 20px;color:#2C2240">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-family:Georgia,serif;font-size:32px;color:#4E3470;margin:0">Yay<span style="color:#C96B7A">ika</span></h1>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:60px;height:60px;background:#FBF6E8;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px">💰</div>
    </div>
    <h2 style="font-size:22px;color:#2C2240;margin-bottom:12px;text-align:center">¡Nueva comisión ganada!</h2>
    <p style="font-size:15px;color:#6B7280;line-height:1.7;margin-bottom:20px;text-align:center">
      Hola ${name}, ¡buenas noticias! Una persona que refiriste acaba de comprar.
    </p>
    <div style="background:#FBF6E8;border-radius:12px;padding:20px;margin-bottom:24px">
      <table style="width:100%;font-size:14px">
        <tr><td style="color:#6B7280;padding:4px 0">Producto:</td><td style="font-weight:600;text-align:right">${product}</td></tr>
        <tr><td style="color:#6B7280;padding:4px 0">Referida:</td><td style="font-weight:600;text-align:right">${referralName}</td></tr>
        <tr><td style="color:#6B7280;padding:4px 0">Tu comisión:</td><td style="font-weight:600;text-align:right;color:#B8943A;font-size:16px">+${commission}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${DOMAIN}/billetera.html" style="display:inline-block;background:#B8943A;color:white;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:500;text-decoration:none">
        Ver mi billetera →
      </a>
    </div>
    <p style="font-size:13px;color:#999;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin:0">
      Recibiste este correo porque ganaste una comisión como afiliada Yayika.<br>
      — El equipo de Yayika 💜
    </p>
  </div>
</body>
</html>`;
}

function withdrawalTemplate(name: string, amount: string, method: string, status: string): string {
  const statusColor = status === 'completed' ? '#3BAF7A' : (status === 'failed' ? '#C96B7A' : '#B8943A');
  const statusLabel = status === 'completed' ? 'Completado' : (status === 'failed' ? 'Fallido' : 'Pendiente');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#FAF7F2;padding:40px 20px;color:#2C2240">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-family:Georgia,serif;font-size:32px;color:#4E3470;margin:0">Yay<span style="color:#C96B7A">ika</span></h1>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:60px;height:60px;background:#E8F8F1;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px">💸</div>
    </div>
    <h2 style="font-size:22px;color:#2C2240;margin-bottom:12px;text-align:center">Solicitud de retiro</h2>
    <p style="font-size:15px;color:#6B7280;line-height:1.7;margin-bottom:20px;text-align:center">
      Hola ${name}, recibimos tu solicitud de retiro.
    </p>
    <div style="background:#E8F8F1;border-radius:12px;padding:20px;margin-bottom:24px">
      <table style="width:100%;font-size:14px">
        <tr><td style="color:#6B7280;padding:4px 0">Monto:</td><td style="font-weight:600;text-align:right;font-size:16px">${amount}</td></tr>
        <tr><td style="color:#6B7280;padding:4px 0">Método:</td><td style="font-weight:600;text-align:right">${method}</td></tr>
        <tr><td style="color:#6B7280;padding:4px 0">Estado:</td><td style="font-weight:600;text-align:right;color:${statusColor}">${statusLabel}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${DOMAIN}/billetera.html" style="display:inline-block;background:#4E3470;color:white;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:500;text-decoration:none">
        Ver mi billetera →
      </a>
    </div>
    <p style="font-size:13px;color:#999;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin:0">
      Los retiros se procesan dentro de 3-5 días hábiles.<br>
      — El equipo de Yayika 💜
    </p>
  </div>
</body>
</html>`;
}

function paymentFailedTemplate(name: string, plan: string, graceDays: string, nextRetry: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#FAF7F2;padding:40px 20px;color:#2C2240">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-family:Georgia,serif;font-size:32px;color:#4E3470;margin:0">Yay<span style="color:#C96B7A">ika</span></h1>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:60px;height:60px;background:#FDF0E8;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px">⚠️</div>
    </div>
    <h2 style="font-size:22px;color:#2C2240;margin-bottom:12px;text-align:center">Tu pago no se pudo procesar</h2>
    <p style="font-size:15px;color:#6B7280;line-height:1.7;margin-bottom:20px;text-align:center">
      Hola ${name}, el pago de tu membresía <strong>${plan}</strong> fue rechazado. No te preocupes: tienes un período de gracia de <strong>${graceDays} días</strong> para actualizar tu método de pago.
    </p>
    <div style="background:#FDF0E8;border-radius:12px;padding:20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;color:#C96B7A;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Próximo intento de cobro</div>
      <p style="font-size:15px;color:#2C2240;margin:0;font-weight:600">${nextRetry}</p>
      <p style="font-size:13px;color:#6B7280;margin:8px 0 0">Si el pago falla de nuevo después del período de gracia, tu membresía se pausará hasta que se resuelva.</p>
    </div>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${DOMAIN}/Portales/" style="display:inline-block;background:#C96B7A;color:white;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:500;text-decoration:none">
        Actualizar mi método de pago →
      </a>
    </div>
    <p style="font-size:13px;color:#999;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin:0">
      Este es un correo automático de tu membresía Yayika.<br>
      — El equipo de Yayika 💜
    </p>
  </div>
</body>
</html>`;
}

function paymentRecoveredTemplate(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#FAF7F2;padding:40px 20px;color:#2C2240">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-family:Georgia,serif;font-size:32px;color:#4E3470;margin:0">Yay<span style="color:#C96B7A">ika</span></h1>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:60px;height:60px;background:#E8F8F1;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px">✅</div>
    </div>
    <h2 style="font-size:22px;color:#2C2240;margin-bottom:12px;text-align:center">¡Pago recuperado!</h2>
    <p style="font-size:15px;color:#6B7280;line-height:1.7;margin-bottom:20px;text-align:center">
      Hola ${name}, recibimos tu pago y tu membresía sigue <strong>activa</strong>. Todo está en orden.
    </p>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${DOMAIN}/Portales/" style="display:inline-block;background:#1A9E8F;color:white;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:500;text-decoration:none">
        Volver a mi portal →
      </a>
    </div>
    <p style="font-size:13px;color:#999;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin:0">
      Este es un correo automático de tu membresía Yayika.<br>
      — El equipo de Yayika 💜
    </p>
  </div>
</body>
</html>`;
}

function supportTemplate(name: string, email: string, subjectText: string, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#FAF7F2;padding:40px 20px;color:#2C2240">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-family:Georgia,serif;font-size:32px;color:#4E3470;margin:0">Yay<span style="color:#C96B7A">ika</span></h1>
    </div>
    <div style="background:#F0EBF8;border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="font-size:11px;font-weight:600;color:#7B5EA7;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">De: ${name} &lt;${email}&gt;</div>
      <div style="font-size:15px;font-weight:600;color:#2C2240;margin-bottom:10px">${subjectText}</div>
      <div style="font-size:14px;color:#6B7280;line-height:1.7;white-space:pre-wrap">${message}</div>
    </div>
    <p style="font-size:13px;color:#999;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin:0">
      Mensaje enviado desde el formulario de soporte de Yayika.<br>
      — El equipo de Yayika 💜
    </p>
  </div>
</body>
</html>`;
}

// --- Main Handler ---

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
      },
    });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment not configured");
    }

    const payload: EmailPayload = await req.json();
    const { type, to, name = "Guerrera", product, amount, plan, commission, referralName, method = "Banco", grace_period_days, next_retry, subject: supportSubject, message: supportMessage, user_email, user_id, customSubject, customHtml } = payload;

    const authHeader = req.headers.get("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

    // Only the service_role key may send transactional email. Browser sessions
    // and the public anon key are handled explicitly below.
    const isInternal = !!bearer && bearer === SERVICE_ROLE_KEY;

    let caller: any = null;
    if (!isInternal && bearer) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user } } = await userClient.auth.getUser();
      caller = user;
    }

    const clientIp = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown")
      .split(",")[0]
      .trim();
    let recipient = to;

    if (isInternal) {
      // Internal callers (stripe-webhook, cron jobs) may send any transactional type.
    } else if (type === "welcome") {
      if (!allowRequest(`welcome:${clientIp}`, 5, 10 * 60 * 1000)) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (caller) {
        if (user_id && user_id !== caller.id) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        recipient = caller.email || "";
      } else {
        // Signup happens before a session exists when email confirmation is on.
        // Accept only an existing user whose email matches and was created recently.
        if (!user_id || !to) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: { user }, error } = await admin.auth.admin.getUserById(user_id);
        if (error || !user?.email || user.email.toLowerCase() !== to.toLowerCase()) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const createdAt = new Date(user.created_at).getTime();
        if (!Number.isFinite(createdAt) || Date.now() - createdAt > 15 * 60 * 1000) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        recipient = user.email;
      }
    } else if (type === "support") {
      if (!allowRequest(`support:${clientIp}`, 5, 10 * 60 * 1000)) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Never let the public form choose the recipient.
      recipient = SUPPORT_INBOX;
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipient || !emailRegex.test(recipient)) {
      throw new Error("Invalid email address");
    }

    // Restrict custom email type - only allow predefined types
    if (type === "custom") {
      throw new Error("Custom email type is not allowed for security reasons");
    }

    let subject: string;
    let html: string;

    switch (type) {
      case "welcome":
        subject = "¡Bienvenida a Yayika! 🎉 Tu primer producto gratis te espera";
        html = welcomeTemplate(name);
        break;

      case "purchase":
        subject = `✅ Confirmación de compra — ${product || "Yayika"}`;
        html = purchaseTemplate(name, product || "Producto Yayika", amount || "$0.00");
        break;

      case "subscription":
        subject = `👑 ¡Tu membresía ${plan || "Guerrera"} está activa!`;
        html = subscriptionTemplate(name, plan || "guerrera");
        break;

      case "commission":
        subject = `💰 ¡Nueva comisión ganada — ${commission || "$0"}!`;
        html = commissionTemplate(name, product || "Producto", commission || "$0", referralName || "Una referida");
        break;

      case "withdrawal":
        subject = `💸 Solicitud de retiro — ${amount || "$0"} MXN`;
        html = withdrawalTemplate(name, amount || "$0", method, "pending");
        break;

      case "payment_failed":
        subject = `⚠️ Pago fallido — ${plan || "tu membresía"} está en período de gracia`;
        html = paymentFailedTemplate(name, plan || "tu membresía", grace_period_days || "7", next_retry || "en los próximos días");
        break;

      case "payment_recovered":
        subject = `✅ Pago recuperado — tu membresía sigue activa`;
        html = paymentRecoveredTemplate(name);
        break;

      case "support": {
        const esc = (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string);
        const cleanSubject = (supportSubject || "Mensaje de soporte").replace(/[<>&"]/g, esc);
        const cleanMessage = (supportMessage || "").replace(/[<>&"]/g, esc);
        const cleanName = name.replace(/[<>&"]/g, esc);
        const cleanUserEmail = (user_email || "").replace(/[<>&"]/g, esc);
        subject = `📨 Soporte: ${cleanSubject}`;
        html = supportTemplate(cleanName, cleanUserEmail, cleanSubject, cleanMessage);
        break;
      }

      case "custom":
        subject = customSubject || "Mensaje de Yayika";
        html = customHtml || "<p>Mensaje personalizado</p>";
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipient],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log(`Email sent: ${type} → ${recipient} (id: ${result.id})`);

    return new Response(
      JSON.stringify({ success: true, id: result.id, type }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Email function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
