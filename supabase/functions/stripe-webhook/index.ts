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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

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
    // CHECKOUT.COMPLETED - New purchase or subscription
    // ============================================================
    if (eventType === "checkout.session.completed") {
      const customerEmail = data.customer_email || data.customer_details?.email;
      const customerId = data.customer;
      const subscriptionId = data.subscription;
      const amountPaid = (data.amount_total || 0) / 100;
      const paymentStatus = data.payment_status;
      const metadata = data.metadata || {};

      // ============================================================
      // MARKETPLACE PURCHASE — REMOVED
      // Yayika is a community. Sellers handle their own payments.
      // Marketplace checkout code has been removed.
      // ============================================================

      // ============================================================
      // MEMBERSHIP PURCHASE (existing logic)
      // ============================================================
      // Find user by email
      const { data: profiles } = await supabase
        .from("yayika_profiles")
        .select("id")
        .eq("email", customerEmail)
        .single();

      if (!profiles) {
        console.log(`User not found for email: ${customerEmail}`);
        return new Response(JSON.stringify({ received: true, note: "User not found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = profiles.id;

      // Determine plan from metadata or amount
      let plan = metadata.plan || "unknown";
      if (plan === "unknown") {
        if (amountPaid <= 15) plan = "semilla";
        else if (amountPaid <= 25) plan = "guerrera";
        else plan = "diamante";
      }

      // Create or update subscription
      const { error: subError } = await supabase
        .from("yayika_subscriptions")
        .upsert(
          {
            user_id: userId,
            plan: plan,
            status: "active",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId || "",
            stripe_session_id: data.id,
            amount_paid: amountPaid,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (subError) {
        console.error("Subscription upsert error:", subError);
      }

      // Record payment
      await supabase.from("yayika_activity_log").insert({
        user_id: userId,
        action: "purchase",
        details: JSON.stringify({
          plan,
          amount: amountPaid,
          stripe_session_id: data.id,
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
      };

      // If going to past_due, set grace period (only if not already set by invoice.payment_failed)
      if (status === "past_due") {
        const { data: existingSub } = await supabase
          .from("yayika_subscriptions")
          .select("grace_period_end")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

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
        .update({ status: "cancelled" })
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
        .single();

      if (sub) {
        // Clear grace period if recovering from past_due
        const { data: currentSub } = await supabase
          .from("yayika_subscriptions")
          .select("status")
          .eq("stripe_customer_id", customerId)
          .single();

        if (currentSub && currentSub.status === "past_due") {
          await supabase
            .from("yayika_subscriptions")
            .update({
              status: "active",
              grace_period_end: null,
              payment_fail_count: 0,
              last_payment_failure: null,
            })
            .eq("stripe_customer_id", customerId);

          console.log(`Subscription recovered from past_due: ${customerId}`);

          // Send recovery email
          try {
            const { data: userProfile } = await supabase
              .from("yayika_profiles")
              .select("email")
              .eq("id", sub.user_id)
              .single();

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

    // ============================================================
    // CHARGE.REFUNDED - Marketplace refund
    // ============================================================
    if (eventType === "charge.refunded") {
      const chargeId = data.id;
      const refundAmount = (data.amount_refunded || 0) / 100;
      const paymentIntent = data.payment_intent;

      console.log(`Charge refunded: ${chargeId}, amount: $${refundAmount}`);

      // Find the sale by stripe_charge_id or payment_intent
      const { data: sale } = await supabase
        .from("yayika_marketplace_sales_v2")
        .select("*")
        .or(`stripe_charge_id.eq.${chargeId},stripe_payment_intent.eq.${paymentIntent}`)
        .single();

      if (sale) {
        // Update sale status
        await supabase
          .from("yayika_marketplace_sales_v2")
          .update({
            status: "refunded",
            refund_amount_cents: Math.round(refundAmount * 100),
            refunded_at: new Date().toISOString(),
          })
          .eq("id", sale.id);

        // Deduct from seller balance
        const { data: balance } = await supabase
          .from("yayika_seller_balances")
          .select("available_cents")
          .eq("seller_id", sale.seller_id)
          .single();

        if (balance) {
          const refundSellerPortion = Math.round(sale.seller_net_cents * (refundAmount * 100 / sale.amount_cents));
          await supabase
            .from("yayika_seller_balances")
            .update({
              available_cents: Math.max(0, (balance.available_cents || 0) - refundSellerPortion),
              lifetime_refunded_cents: (balance.lifetime_refunded_cents || 0) + refundSellerPortion,
              updated_at: new Date().toISOString(),
            })
            .eq("seller_id", sale.seller_id);

          // Record in ledger
          const { data: newBalance } = await supabase
            .from("yayika_seller_balances")
            .select("available_cents")
            .eq("seller_id", sale.seller_id)
            .single();

          await supabase.from("yayika_financial_transactions").insert({
            seller_id: sale.seller_id,
            type: "refund",
            direction: "debit",
            amount_cents: refundSellerPortion,
            balance_after_cents: newBalance?.available_cents || 0,
            reference_type: "sale",
            reference_id: sale.id,
            description: `Reembolso de compra - $${refundAmount.toFixed(2)}`,
            metadata: JSON.stringify({ charge_id: chargeId, refund_amount: refundAmount }),
          });
        }

        console.log(`Refund processed for sale ${sale.id}`);
      }
    }

    // ============================================================
    // TRANSFER.CREATED - Track Connect transfers
    // ============================================================
    if (eventType === "transfer.created") {
      const transferId = data.id;
      const destination = data.destination;
      const amount = (data.amount || 0) / 100;

      console.log(`Transfer created: ${transferId} → ${destination}, amount: $${amount}`);

      // Find seller by stripe_account_id
      const { data: seller } = await supabase
        .from("yayika_seller_profiles")
        .select("id")
        .eq("stripe_account_id", destination)
        .single();

      if (seller) {
        // Update payout request status
        await supabase
          .from("yayika_payout_requests_v2")
          .update({
            status: "processing",
            stripe_transfer_id: transferId,
            processed_at: new Date().toISOString(),
          })
          .eq("seller_id", seller.id)
          .eq("status", "pending");
      }
    }

    // ============================================================
    // TRANSFER.PAID - Payout completed
    // ============================================================
    if (eventType === "transfer.paid") {
      const transferId = data.id;
      console.log(`Transfer paid: ${transferId}`);

      // Update payout status
      await supabase
        .from("yayika_payout_requests_v2")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("stripe_transfer_id", transferId);

      // Update seller balance
      const { data: payout } = await supabase
        .from("yayika_payout_requests_v2")
        .select("seller_id, amount_cents")
        .eq("stripe_transfer_id", transferId)
        .single();

      if (payout) {
        // Read current balance to calculate new lifetime_paid_out_cents
        const { data: currentBalance } = await supabase
          .from("yayika_seller_balances")
          .select("lifetime_paid_out_cents")
          .eq("seller_id", payout.seller_id)
          .single();

        const newLifetimePaid = (currentBalance?.lifetime_paid_out_cents || 0) + (payout.amount_cents || 0);

        await supabase
          .from("yayika_seller_balances")
          .update({
            reserved_cents: 0,
            lifetime_paid_out_cents: newLifetimePaid,
            last_payout_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("seller_id", payout.seller_id);
      }
    }

    // ============================================================
    // TRANSFER.FAILED - Payout failed
    // ============================================================
    if (eventType === "transfer.failed") {
      const transferId = data.id;
      const failureMessage = data.failure_message || "Transfer failed";

      console.log(`Transfer failed: ${transferId}: ${failureMessage}`);

      // Update payout status
      const { data: payout } = await supabase
        .from("yayika_payout_requests_v2")
        .select("seller_id, amount_cents")
        .eq("stripe_transfer_id", transferId)
        .single();

      if (payout) {
        await supabase
          .from("yayika_payout_requests_v2")
          .update({
            status: "failed",
            failure_reason: failureMessage,
          })
          .eq("stripe_transfer_id", transferId);

        // Restore balance
        const { data: balance } = await supabase
          .from("yayika_seller_balances")
          .select("available_cents")
          .eq("seller_id", payout.seller_id)
          .single();

        if (balance) {
          await supabase
            .from("yayika_seller_balances")
            .update({
              available_cents: balance.available_cents + payout.amount_cents,
              reserved_cents: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("seller_id", payout.seller_id);
        }
      }
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
