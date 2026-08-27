// ============================================================
// Yayika — send-email Edge Function
// Envía emails transaccionales via Resend
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Yayika <hola@yayika.com>";
const DOMAIN = "https://yayika.com";

interface EmailPayload {
  type: "welcome" | "purchase" | "subscription" | "commission" | "withdrawal" | "custom";
  to: string;
  name?: string;
  product?: string;
  amount?: string;
  plan?: string;
  commission?: string;
  referralName?: string;
  customSubject?: string;
  customHtml?: string;
}

// --- Email Templates ---

function welcomeTemplate(name: string): string {
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

    // Auth validation - require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing or invalid authorization header");
    }

    const payload: EmailPayload = await req.json();
    const { type, to, name = "Guerrera", product, amount, plan, commission, referralName, customSubject, customHtml } = payload;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!to || !emailRegex.test(to)) {
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
        html = withdrawalTemplate(name, amount || "$0", method || "Banco", "pending");
        break;

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
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log(`Email sent: ${type} → ${to} (id: ${result.id})`);

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
