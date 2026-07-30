// ============================================================
// Yayika — Stripe Marketplace Checkout Edge Function
// Creates checkout sessions for marketplace products
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
    const siteUrl = Deno.env.get("SITE_URL") || "https://yayika.com";

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user (optional - guests can buy too)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    const body = await req.json();
    const { product_id, action } = body;

    if (action === "get_catalog") {
      // Public catalog - no auth required
      const { data: products, error } = await supabase
        .from("yayika_marketplace_products_v2")
        .select(`
          id, name, description, category, price_cents, currency_code,
          comparison_price_cents, images, tags, type, total_sales,
          rating_avg, rating_count, view_count,
          seller_id:yayika_seller_profiles(display_name, rating_avg)
        `)
        .eq("status", "active")
        .order("total_sales", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ products }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_product") {
      const { data: product, error } = await supabase
        .from("yayika_marketplace_products_v2")
        .select(`
          *, seller:yayika_seller_profiles(display_name, bio, rating_avg, rating_count, avatar_url)
        `)
        .eq("id", product_id)
        .single();

      if (error) throw error;

      // Increment view count
      await supabase.rpc("exec_sql", {
        sql: `UPDATE yayika_marketplace_products_v2 SET view_count = view_count + 1 WHERE id = '${product_id}'`
      }).catch(() => {});

      return new Response(JSON.stringify({ product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_checkout") {
      if (!product_id) throw new Error("product_id required");

      // Get product and seller info
      const { data: product, error: prodError } = await supabase
        .from("yayika_marketplace_products_v2")
        .select("*")
        .eq("id", product_id)
        .eq("status", "active")
        .single();

      if (prodError || !product) throw new Error("Product not found");

      const { data: seller } = await supabase
        .from("yayika_seller_profiles")
        .select("stripe_account_id, platform_fee_percent, display_name")
        .eq("id", product.seller_id)
        .single();

      if (!seller?.stripe_account_id) {
        throw new Error("Seller Stripe account not connected");
      }

      // Calculate platform fee
      const platformFeePercent = seller.platform_fee_percent || 15;
      const platformFeeCents = Math.round(product.price_cents * platformFeePercent / 100);

      // Create Stripe Checkout Session with Connect
      const sessionResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "mode": "payment",
          "payment_method_types[0]": "card",
          "line_items[0][price_data][currency]": (product.currency_code || "mxn").toLowerCase(),
          "line_items[0][price_data][product_data][name]": product.name,
          "line_items[0][price_data][product_data][description]": product.description || "",
          "line_items[0][price_data][unit_amount]": String(product.price_cents),
          "line_items[0][quantity]": "1",
          "payment_intent_data[application_fee_amount]": String(platformFeeCents),
          "payment_intent_data[transfer_data][destination]": seller.stripe_account_id,
          "success_url": `${siteUrl}/Portales/?section=gana&purchase=success&session_id={CHECKOUT_SESSION_ID}`,
          "cancel_url": `${siteUrl}/Portales/?section=gana&purchase=cancelled`,
          "metadata[product_id]": product_id,
          "metadata[seller_id]": product.seller_id,
          "metadata[buyer_id]": userId || "guest",
          "metadata[platform_fee]": String(platformFeeCents),
          ...(userId ? { "customer_email": undefined } : {}),
        }),
      });

      if (!sessionResponse.ok) {
        const error = await sessionResponse.text();
        console.error("Checkout session creation failed:", error);
        throw new Error(`Stripe checkout error: ${error}`);
      }

      const session = await sessionResponse.json();

      // Record pending sale
      await supabase.from("yayika_marketplace_sales_v2").insert({
        buyer_id: userId,
        seller_id: product.seller_id,
        product_id: product_id,
        stripe_session_id: session.id,
        amount_cents: product.price_cents,
        platform_fee_cents: platformFeeCents,
        seller_net_cents: product.price_cents - platformFeeCents,
        buyer_email: session.customer_email,
        status: "pending",
        currency_code: product.currency_code || "MXN",
      });

      return new Response(JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Marketplace checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
