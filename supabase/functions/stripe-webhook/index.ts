// ============================================================
// Yayika — Stripe Webhook Edge Function
// Deploy: Supabase Dashboard → Edge Functions → stripe-webhook
// NOTE: Yayika is a community, NOT a marketplace.
// Sellers handle their own payments. Marketplace code removed.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://yayika.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripeKeyFromEnv(): string {
  const primary = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (primary.startsWith("sk_live_") || primary.startsWith("sk_test_")) return primary;
  // Legacy secret holds a working sk_live_ key; the STRIPE_SECRET_KEY
  // secret currently stores an expired rk_live_ restricted key.
  return Deno.env.get("SERVICE_ROLE_KEY") ?? "";
}

async function resolvePlanFromPrice(priceId: string | null, stripeKey: string): Promise<string | null> {
  if (!priceId || !stripeKey) return null;
  try {
    const r = await fetch(`https://api.stripe.com/v1/prices/${priceId}?expand[]=product`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!r.ok) return null;
    const price = await r.json();
    const product = price.product;
    const plans = ["semilla", "guerrera", "diamante"];
    const metaPlan = product?.metadata?.plan;
    if (metaPlan && plans.includes(metaPlan)) return metaPlan;
    const name = String(product?.name ?? "").toLowerCase();
    for (const p of plans) {
      if (name.includes(p)) return p;
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

    if (!stripeWebhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return new Response(JSON.stringify({ error: "No stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature using HMAC-SHA256
    let event;
    try {
      // Parse the stripe-signature header
      const sigParts: Record<string, string> = {};
      sig.split(',').forEach((part: string) => {
        const [key, value] = part.split('=');
        sigParts[key] = value;
      });

      const timestamp = sigParts['t'];
      const signature = sigParts['v1'];

      if (!timestamp || !signature) {
        return new Response(JSON.stringify({ error: "Invalid signature format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reject events older than 5 minutes (replay protection)
      const eventAge = Math.abs(Date.now() / 1000 - parseInt(timestamp));
      if (eventAge > 300) {
        return new Response(JSON.stringify({ error: "Event too old" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify HMAC signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(stripeWebhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signedPayload = `${timestamp}.${body}`;
      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(signedPayload)
      );
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (signature !== expectedSignature) {
        console.error("Signature mismatch: webhook rejected");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Signature valid - parse the event
      event = JSON.parse(body);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON or signature verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType = event.type;
    const data = event.data?.object;

    console.log(`Stripe webhook: ${eventType}`);

    // ============================================================
    // CHECKOUT.COMPLETED — Subscription or one-time purchase
    // NOTE: Yayika is a community, NOT a marketplace.
    // Sellers are paid directly with their own links. No
    // marketplace checkout/commission branch exists here.
    // ============================================================
    if (eventType === "checkout.session.completed") {
      const session = data;
      const metadata = session.metadata || {};
      const customerEmail = session.customer_details?.email || session.customer_email || null;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      const amountPaid = (session.amount_total || 0) / 100;

      // Resolve user: metadata.user_id first, then lookup by email
      let userId: string | null = metadata.user_id || null;
      if (!userId && customerEmail) {
        const { data: profile } = await supabase
          .from("yayika_profiles")
          .select("id")
          .eq("email", customerEmail)
          .limit(1)
          .maybeSingle();
        userId = profile?.id ?? null;
      }

      if (session.mode === "subscription" || subscriptionId) {
        // ---------------- MEMBERSHIP (payment = usage) ----------------
        if (!userId) {
          console.log(`checkout.session.completed: cannot resolve user for subscription (${customerEmail})`);
          return new Response(JSON.stringify({ received: true, note: "User not found" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Plan: metadata → Stripe price resolver → amount fallback
        let plan: string = metadata.plan || "";
        if (!plan && subscriptionId) {
          const stripeKey = stripeKeyFromEnv();
          if (stripeKey) {
            try {
              const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
                headers: { Authorization: `Bearer ${stripeKey}` },
              });
              if (subRes.ok) {
                const subObj = await subRes.json();
                const priceId = subObj.items?.data?.[0]?.price?.id ?? null;
                const mapped = await resolvePlanFromPrice(priceId, stripeKey);
                if (mapped) plan = mapped;
              }
            } catch (e) {
              console.error("Plan resolution error (non-blocking):", e);
            }
          }
        }
        if (!plan) {
          if (amountPaid <= 15) plan = "semilla";
          else if (amountPaid <= 25) plan = "guerrera";
          else plan = "diamante";
        }

        // Create or update subscription (no unique constraint on user_id → select then update/insert)
        const { data: existingSub } = await supabase
          .from("yayika_subscriptions")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const subRow: Record<string, unknown> = {
          user_id: userId,
          plan: plan,
          status: "active",
          email: customerEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId || "",
          stripe_session_id: session.id,
          amount_paid: amountPaid,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };

        let subError: { message: string } | null = null;
        if (existingSub) {
          const { error } = await supabase
            .from("yayika_subscriptions")
            .update(subRow)
            .eq("id", existingSub.id);
          subError = error;
        } else {
          const { error } = await supabase
            .from("yayika_subscriptions")
            .insert({ ...subRow, created_at: new Date().toISOString() });
          subError = error;
        }

        if (subError) {
          console.error("Subscription save error:", subError);
        }

        // Record payment
        await supabase.from("yayika_activity_log").insert({
          user_id: userId,
          action: "purchase",
          details: JSON.stringify({
            plan,
            amount: amountPaid,
            stripe_session_id: session.id,
          }),
        });

        // Check for affiliate referral
        const referralCode = metadata.ref || metadata.referral_code;
        if (referralCode) {
          // Process affiliate referral
          await supabase.rpc("yayika_process_referral", {
            p_ref_code: referralCode,
            p_referred_user_id: userId,
          });
        }

        console.log(`Subscription created: ${plan} for ${customerEmail}`);

        // --- Send purchase/subscription email ---
        if (customerEmail) {
          try {
            const emailType = subscriptionId ? "subscription" : "purchase";
            const emailPayload = {
              type: emailType,
              to: customerEmail,
              name: customerEmail.split("@")[0],
              product: `Membresía ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
              amount: `$${amountPaid.toFixed(2)}`,
              plan: plan,
            };

            // Call send-email function (internal)
            const emailResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-email`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(emailPayload),
              }
            );

            if (emailResponse.ok) {
              console.log(`Email sent: ${emailType} → ${customerEmail}`);
            } else {
              const emailError = await emailResponse.text();
              console.error("Email send failed:", emailError);
            }
          } catch (emailErr) {
            console.error("Email error (non-blocking):", emailErr);
          }
        }
      } else {
        // ---------------- ONE-TIME PURCHASE (course/product = usage) ----------------
        const { error: purErr } = await supabase.from("yayika_purchases").insert({
          user_id: userId,
          user_email: customerEmail,
          product: metadata.product ?? session.line_items?.data?.[0]?.description ?? "unknown",
          amount_total: session.amount_total ?? 0,
          currency: session.currency ?? "mxn",
          stripe_session_id: session.id,
          stripe_customer_id: customerId,
          payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          insurance_plan_id: metadata.insurance_plan_id ?? null,
        });
        if (purErr) console.error("Error logging purchase:", purErr);

        if (userId) {
          await supabase.from("yayika_activity_log").insert({
            user_id: userId,
            action: "purchase",
            details: JSON.stringify({
              product: metadata.product ?? "unknown",
              amount: amountPaid,
              stripe_session_id: session.id,
            }),
          });
        }

        console.log(`One-time purchase logged: ${customerEmail} → $${amountPaid}`);
      }
    }

    // ============================================================
    // CUSTOMER.SUBSCRIPTION.UPDATED
    // ============================================================
    if (eventType === "customer.subscription.updated") {
      const subscriptionId = data.id;
      const status = data.status; // active, past_due, canceled, etc.
      const currentPeriodEnd = new Date(data.current_period_end * 1000).toISOString();

      const updateData: Record<string, unknown> = {
        status: status === "active" ? "active" : status === "past_due" ? "past_due" : "cancelled",
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      };

      // If going to past_due, set grace period (only if not already set by invoice.payment_failed)
      if (status === "past_due") {
        const { data: existingSub } = await supabase
          .from("yayika_subscriptions")
          .select("grace_period_end")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (!existingSub?.grace_period_end) {
          updateData.grace_period_end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      // If recovering to active, clear grace period
      if (status === "active") {
        updateData.grace_period_end = null;
        updateData.payment_fail_count = 0;
      }

      await supabase
        .from("yayika_subscriptions")
        .update(updateData)
        .eq("stripe_subscription_id", subscriptionId);

      console.log(`Subscription updated: ${subscriptionId} → ${status}`);
    }

    // ============================================================
    // CUSTOMER.SUBSCRIPTION.DELETED
    // ============================================================
    if (eventType === "customer.subscription.deleted") {
      const subscriptionId = data.id;

      await supabase
        .from("yayika_subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscriptionId);

      console.log(`Subscription cancelled: ${subscriptionId}`);
    }

    // ============================================================
    // INVOICE.PAYMENT_FAILED - Dunning / Grace Period
    // ============================================================
    if (eventType === "invoice.payment_failed") {
      const customerId = data.customer;
      const attemptCount = data.attempt_count || 1;
      const nextRetryAt = data.next_payment_attempt
        ? new Date(data.next_payment_attempt * 1000).toISOString()
        : null;

      // Grace period: 7 days from now
      const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Find user by stripe_customer_id
      const { data: sub } = await supabase
        .from("yayika_subscriptions")
        .select("user_id, email, plan")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (sub) {
        // Update subscription: mark as past_due with grace period
        await supabase
          .from("yayika_subscriptions")
          .update({
            status: "past_due",
            grace_period_end: gracePeriodEnd,
            payment_fail_count: attemptCount,
            last_payment_failure: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        // Record activity
        await supabase.from("yayika_activity_log").insert({
          user_id: sub.user_id,
          action: "payment_failed",
          details: JSON.stringify({
            attempt: attemptCount,
            next_retry: nextRetryAt,
            grace_period_end: gracePeriodEnd,
          }),
        });

        // Send payment failure email with grace period warning
        if (sub.email) {
          try {
            const emailPayload = {
              type: "payment_failed",
              to: sub.email,
              name: sub.email.split("@")[0],
              plan: sub.plan || "unknown",
              grace_period_days: "7",
              next_retry: nextRetryAt
                ? new Date(nextRetryAt).toLocaleDateString("es-MX")
                : "en los próximos días",
            };

            const emailResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-email`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(emailPayload),
              }
            );

            if (emailResponse.ok) {
              console.log(`Payment failure email sent to ${sub.email}`);
            }
          } catch (emailErr) {
            console.error("Payment failure email error:", emailErr);
          }
        }

        console.log(
          `Payment failed for ${customerId}: attempt ${attemptCount}, grace period ends ${gracePeriodEnd}`
        );
      }
    }

    // ============================================================
    // INVOICE.PAID - Recurring payment (including recovery from past_due)
    // ============================================================
    if (eventType === "invoice.paid") {
      const customerId = data.customer;
      const amountPaid = (data.amount_paid || 0) / 100;

      // Find user by stripe_customer_id
      const { data: sub } = await supabase
        .from("yayika_subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (sub) {
        // Clear grace period if recovering from past_due
        const { data: currentSub } = await supabase
          .from("yayika_subscriptions")
          .select("status")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (currentSub && currentSub.status === "past_due") {
          await supabase
            .from("yayika_subscriptions")
            .update({
              status: "active",
              grace_period_end: null,
              payment_fail_count: 0,
              last_payment_failure: null,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);

          console.log(`Subscription recovered from past_due: ${customerId}`);

          // Send recovery email
          try {
            const { data: userProfile } = await supabase
              .from("yayika_profiles")
              .select("email")
              .eq("id", sub.user_id)
              .maybeSingle();

            if (userProfile) {
              await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  type: "payment_recovered",
                  to: userProfile.email,
                  name: userProfile.email.split("@")[0],
                }),
              });
            }
          } catch (e) {
            console.error("Recovery email error:", e);
          }
        }

        // Record the recurring payment
        await supabase.from("yayika_activity_log").insert({
          user_id: sub.user_id,
          action: "recurring_payment",
          details: JSON.stringify({
            amount: amountPaid,
            invoice_id: data.id,
          }),
        });
      }

      console.log(`Invoice paid: ${customerId} → $${amountPaid}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
