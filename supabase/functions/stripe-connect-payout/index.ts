// ============================================================
// Yayika — Stripe Connect Payout Edge Function
// Process payouts for marketplace sellers
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Get seller profile
    const { data: seller } = await supabase
      .from("yayika_seller_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!seller) {
      return new Response(JSON.stringify({ error: "Not a seller" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "request_payout") {
      const { amount_cents } = body;

      if (!amount_cents || amount_cents <= 0) {
        throw new Error("Invalid amount");
      }

      // Get available balance
      const { data: balance } = await supabase
        .from("yayika_seller_balances")
        .select("available_cents")
        .eq("seller_id", seller.id)
        .single();

      if (!balance || balance.available_cents < amount_cents) {
        throw new Error(`Saldo insuficiente. Disponible: $${((balance?.available_cents || 0) / 100).toFixed(2)}`);
      }

      if (amount_cents < seller.minimum_payout_cents) {
        throw new Error(`Mínimo de retiro: $${(seller.minimum_payout_cents / 100).toFixed(2)}`);
      }

      // Check if there's already a pending payout
      const { data: existingPayout } = await supabase
        .from("yayika_payout_requests_v2")
        .select("id")
        .eq("seller_id", seller.id)
        .in("status", ["pending", "processing"])
        .limit(1);

      if (existingPayout && existingPayout.length > 0) {
        throw new Error("Ya tienes un retiro en proceso. Espera a que se complete.");
      }

      // Create payout request
      const { data: payoutRequest, error: payoutError } = await supabase
        .from("yayika_payout_requests_v2")
        .insert({
          seller_id: seller.id,
          amount_cents: amount_cents,
          net_amount_cents: amount_cents,
          status: "pending",
          currency_code: seller.currency_code || "MXN",
        })
        .select()
        .single();

      if (payoutError) throw payoutError;

      // Deduct from available balance
      await supabase
        .from("yayika_seller_balances")
        .update({
          available_cents: balance.available_cents - amount_cents,
          reserved_cents: supabase.rpc ? 0 : undefined, // Will be handled by trigger
          updated_at: new Date().toISOString(),
        })
        .eq("seller_id", seller.id);

      // Get new balance for ledger
      const { data: newBalance } = await supabase
        .from("yayika_seller_balances")
        .select("available_cents")
        .eq("seller_id", seller.id)
        .single();

      // Record in ledger
      await supabase.from("yayika_financial_transactions").insert({
        seller_id: seller.id,
        type: "payout",
        direction: "debit",
        amount_cents: amount_cents,
        balance_after_cents: newBalance?.available_cents || 0,
        reference_type: "payout_request",
        reference_id: payoutRequest.id,
        description: `Solicitud de retiro - $${(amount_cents / 100).toFixed(2)}`,
      });

      return new Response(JSON.stringify({
        payout_id: payoutRequest.id,
        amount_cents,
        status: "pending",
        message: "Solicitud de retiro creada. Será procesada en 1-3 días hábiles.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "process_pending_payouts") {
      // Admin/system action - process all pending payouts via Stripe Transfer
      const { data: pendingPayouts } = await supabase
        .from("yayika_payout_requests_v2")
        .select("*, seller:yayika_seller_profiles(stripe_account_id, user_id)")
        .eq("status", "pending");

      if (!pendingPayouts || pendingPayouts.length === 0) {
        return new Response(JSON.stringify({ message: "No pending payouts" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];

      for (const payout of pendingPayouts) {
        const stripeAccountId = payout.seller?.stripe_account_id;
        if (!stripeAccountId) continue;

        try {
          // Create Stripe Transfer to seller's connected account
          const transferResponse = await fetch("https://api.stripe.com/v1/transfers", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              amount: String(payout.amount_cents),
              currency: (payout.currency_code || "mxn").toLowerCase(),
              destination: stripeAccountId,
              description: `Yayika payout - ${payout.id}`,
              metadata: `payout_id:${payout.id}`,
            }),
          });

          if (transferResponse.ok) {
            const transfer = await transferResponse.json();

            // Update payout status
            await supabase
              .from("yayika_payout_requests_v2")
              .update({
                status: "processing",
                stripe_transfer_id: transfer.id,
                processed_at: new Date().toISOString(),
              })
              .eq("id", payout.id);

            // Update balance reserved
            await supabase
              .from("yayika_seller_balances")
              .update({
                reserved_cents: 0,
                last_payout_at: new Date().toISOString(),
                lifetime_paid_out_cents: supabase.rpc ? undefined : 0,
                updated_at: new Date().toISOString(),
              })
              .eq("seller_id", payout.seller_id);

            results.push({ payout_id: payout.id, transfer_id: transfer.id, status: "processing" });
          } else {
            const error = await transferResponse.text();
            console.error(`Transfer failed for ${payout.id}:`, error);

            await supabase
              .from("yayika_payout_requests_v2")
              .update({ status: "failed", failure_reason: error })
              .eq("id", payout.id);

            results.push({ payout_id: payout.id, status: "failed", error });
          }
        } catch (e) {
          console.error(`Transfer error for ${payout.id}:`, e);
          results.push({ payout_id: payout.id, status: "error", error: e.message });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_payout_history") {
      const { data: payouts } = await supabase
        .from("yayika_payout_requests_v2")
        .select("*")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ payouts: payouts || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancel_payout") {
      const { payout_id } = body;

      const { data: payout } = await supabase
        .from("yayika_payout_requests_v2")
        .select("*")
        .eq("id", payout_id)
        .eq("seller_id", seller.id)
        .single();

      if (!payout) throw new Error("Payout not found");
      if (payout.status !== "pending") throw new Error("Only pending payouts can be cancelled");

      // Restore balance
      const { data: balance } = await supabase
        .from("yayika_seller_balances")
        .select("available_cents")
        .eq("seller_id", seller.id)
        .single();

      await supabase
        .from("yayika_seller_balances")
        .update({
          available_cents: (balance?.available_cents || 0) + payout.amount_cents,
          reserved_cents: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("seller_id", seller.id);

      // Cancel payout
      await supabase
        .from("yayika_payout_requests_v2")
        .update({ status: "cancelled" })
        .eq("id", payout_id);

      // Record in ledger
      const { data: newBalance } = await supabase
        .from("yayika_seller_balances")
        .select("available_cents")
        .eq("seller_id", seller.id)
        .single();

      await supabase.from("yayika_financial_transactions").insert({
        seller_id: seller.id,
        type: "payout_cancelled",
        direction: "credit",
        amount_cents: payout.amount_cents,
        balance_after_cents: newBalance?.available_cents || 0,
        reference_type: "payout_request",
        reference_id: payout.id,
        description: "Retiro cancelado - fondos restaurados",
      });

      return new Response(JSON.stringify({ message: "Retiro cancelado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Payout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
