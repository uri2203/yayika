// ============================================================
// Yayika — Stripe Connect Dashboard Edge Function
// ⚠️ DEPRECATED: Yayika is a community, NOT a marketplace.
// Sellers handle their own payments. This function is unused.
// Do NOT deploy. Kept for reference only.
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

    if (action === "get_dashboard") {
      // Get balance
      const { data: balance } = await supabase
        .from("yayika_seller_balances")
        .select("*")
        .eq("seller_id", seller.id)
        .single();

      // Get month stats
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthSales } = await supabase
        .from("yayika_marketplace_sales_v2")
        .select("id, amount_cents, seller_net_cents, created_at, product:yayika_marketplace_products_v2(name)")
        .eq("seller_id", seller.id)
        .eq("status", "completed")
        .gte("created_at", monthStart.toISOString())
        .order("created_at", { ascending: false });

      // Get recent sales (last 10)
      const { data: recentSales } = await supabase
        .from("yayika_marketplace_sales_v2")
        .select("id, amount_cents, seller_net_cents, buyer_email, status, created_at, product:yayika_marketplace_products_v2(name)")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get products
      const { data: products } = await supabase
        .from("yayika_marketplace_products_v2")
        .select("id, name, category, price_cents, total_sales, total_revenue_cents, rating_avg, rating_count, status")
        .eq("seller_id", seller.id)
        .order("total_revenue_cents", { ascending: false });

      // Get payout history
      const { data: payouts } = await supabase
        .from("yayika_payout_requests_v2")
        .select("*")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get pending payouts count
      const { count: pendingPayouts } = await supabase
        .from("yayika_payout_requests_v2")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", seller.id)
        .in("status", ["pending", "processing"]);

      // Get reviews summary
      const { data: reviews } = await supabase
        .from("yayika_marketplace_reviews")
        .select("rating, title, comment, created_at, buyer:yayika_profiles(full_name)")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Stripe live balance (if connected)
      let stripeBalance = null;
      if (seller.stripe_account_id && stripeSecretKey) {
        try {
          const balanceResponse = await fetch(
            `https://api.stripe.com/v1/balance`,
            {
              headers: {
                "Authorization": `Bearer ${stripeSecretKey}`,
                "Stripe-Account": seller.stripe_account_id,
              },
            }
          );
          if (balanceResponse.ok) {
            stripeBalance = await balanceResponse.json();
          }
        } catch (e) {
          console.log("Stripe balance fetch failed (non-blocking):", e);
        }
      }

      // Calculate month totals
      const monthTotal = monthSales?.reduce((sum, s) => sum + (s.amount_cents || 0), 0) || 0;
      const monthNet = monthSales?.reduce((sum, s) => sum + (s.seller_net_cents || 0), 0) || 0;

      return new Response(JSON.stringify({
        seller: {
          id: seller.id,
          display_name: seller.display_name,
          account_status: seller.stripe_account_status,
          onboarding_complete: seller.stripe_onboarding_complete,
          platform_fee_percent: seller.platform_fee_percent,
          rating_avg: seller.rating_avg,
          rating_count: seller.rating_count,
          total_sales: seller.total_sales,
          total_revenue_cents: seller.total_revenue_cents,
          payout_schedule: seller.payout_schedule,
          minimum_payout_cents: seller.minimum_payout_cents,
        },
        balance: {
          available: balance?.available_cents || 0,
          pending: balance?.pending_cents || 0,
          reserved: balance?.reserved_cents || 0,
          lifetime_earned: balance?.lifetime_earned_cents || 0,
          lifetime_paid_out: balance?.lifetime_paid_out_cents || 0,
          last_payout_at: balance?.last_payout_at,
          last_sale_at: balance?.last_sale_at,
        },
        stripe_balance: stripeBalance,
        month: {
          sales_count: monthSales?.length || 0,
          total_revenue: monthTotal,
          net_earnings: monthNet,
        },
        recent_sales: recentSales || [],
        products: products || [],
        payouts: payouts || [],
        pending_payouts_count: pendingPayouts || 0,
        reviews: reviews || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_transactions") {
      const { type, from, to, limit = 50, offset = 0 } = body;

      let query = supabase
        .from("yayika_financial_transactions")
        .select("id, type, direction, amount_cents, balance_after_cents, description, reference_id, created_at, metadata")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) query = query.eq("type", type);
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to);

      const { data: transactions, count } = await query;

      // Get total count
      let countQuery = supabase
        .from("yayika_financial_transactions")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", seller.id);

      if (type) countQuery = countQuery.eq("type", type);

      const { count: totalCount } = await countQuery;

      return new Response(JSON.stringify({
        transactions: transactions || [],
        total: totalCount || 0,
        limit,
        offset,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_product_detail") {
      const { product_id } = body;

      const { data: product } = await supabase
        .from("yayika_marketplace_products_v2")
        .select("*")
        .eq("id", product_id)
        .eq("seller_id", seller.id)
        .single();

      if (!product) throw new Error("Product not found");

      // Get sales for this product
      const { data: sales } = await supabase
        .from("yayika_marketplace_sales_v2")
        .select("id, amount_cents, seller_net_cents, buyer_email, status, created_at")
        .eq("product_id", product_id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Get reviews for this product
      const { data: reviews } = await supabase
        .from("yayika_marketplace_reviews")
        .select("rating, title, comment, created_at, buyer:yayika_profiles(full_name)")
        .eq("product_id", product_id)
        .order("created_at", { ascending: false });

      // Daily sales for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: dailySales } = await supabase
        .from("yayika_marketplace_sales_v2")
        .select("amount_cents, created_at")
        .eq("product_id", product_id)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo.toISOString());

      return new Response(JSON.stringify({
        product,
        sales: sales || [],
        reviews: reviews || [],
        daily_sales: dailySales || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
