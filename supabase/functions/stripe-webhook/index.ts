// ============================================================
// Yayika — Stripe Webhook Edge Function
// Deploy: Supabase Dashboard → Edge Functions → stripe-webhook
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

    // Verify webhook signature (basic check - in production use stripe.webhooks.constructEvent)
    // For now, we trust the header and parse the event
    let event;
    try {
      event = JSON.parse(body);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
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
    }

    // ============================================================
    // CUSTOMER.SUBSCRIPTION.UPDATED
    // ============================================================
    if (eventType === "customer.subscription.updated") {
      const subscriptionId = data.id;
      const status = data.status; // active, past_due, canceled, etc.
      const currentPeriodEnd = new Date(data.current_period_end * 1000).toISOString();

      await supabase
        .from("yayika_subscriptions")
        .update({
          status: status === "active" ? "active" : status === "past_due" ? "past_due" : "cancelled",
          current_period_end: currentPeriodEnd,
        })
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
    // INVOICE.PAID - Recurring payment
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
