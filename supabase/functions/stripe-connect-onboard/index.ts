// ============================================================
// Yayika — Stripe Connect Onboarding Edge Function
// Creates Connect accounts for marketplace sellers
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

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

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

    // Get or create seller profile
    let { data: seller } = await supabase
      .from("yayika_seller_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!seller) {
      // Create seller profile
      const { data: newSeller, error: createError } = await supabase
        .from("yayika_seller_profiles")
        .insert({
          user_id: user.id,
          display_name: user.email?.split("@")[0] || "Vendedora",
          category: "general",
          is_active: true,
        })
        .select()
        .single();

      if (createError) throw createError;
      seller = newSeller;

      // Create balance record
      await supabase.from("yayika_seller_balances").insert({
        seller_id: seller.id,
      });
    }

    if (action === "get_status") {
      return new Response(JSON.stringify({
        seller_id: seller.id,
        account_status: seller.stripe_account_status,
        onboarding_complete: seller.stripe_onboarding_complete,
        stripe_account_id: seller.stripe_account_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_account" || action === "refresh_onboarding") {
      let accountId = seller.stripe_account_id;

      if (!accountId) {
        // Get user profile for name
        const { data: profile } = await supabase
          .from("yayika_profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        // Create Stripe Connect account
        const accountResponse = await fetch("https://api.stripe.com/v1/accounts", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            type: "express",
            country: seller.country_code || "MX",
            email: profile?.email || user.email || "",
            "capabilities[card_payments][requested]": "true",
            "capabilities[transfers][requested]": "true",
            "business_type": "individual",
            "individual[first_name]": (profile?.full_name || "").split(" ")[0] || "Vendedora",
            "individual[last_name]": (profile?.full_name || "").split(" ").slice(1).join(" ") || "Yayika",
            "metadata[0]": `user_id:${user.id}`,
            "metadata[1]": `seller_id:${seller.id}`,
            "metadata[2]": "platform:yayika",
          }),
        });

        if (!accountResponse.ok) {
          const error = await accountResponse.text();
          console.error("Stripe account creation failed:", error);
          throw new Error(`Stripe error: ${error}`);
        }

        const account = await accountResponse.json();
        accountId = account.id;

        // Update seller profile
        await supabase
          .from("yayika_seller_profiles")
          .update({ stripe_account_id: accountId, updated_at: new Date().toISOString() })
          .eq("id", seller.id);
      }

      // Create onboarding link
      const baseUrl = Deno.env.get("SITE_URL") || "https://yayika.com";
      const onboardingResponse = await fetch(
        `https://api.stripe.com/v1/account_links`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            account: accountId,
            refresh_url: `${baseUrl}/Portales/?section=gana`,
            return_url: `${baseUrl}/Portales/?section=gana&stripe=connected`,
            type: "account_onboarding",
          }),
        }
      );

      if (!onboardingResponse.ok) {
        const error = await onboardingResponse.text();
        console.error("Account link creation failed:", error);
        throw new Error(`Account link error: ${error}`);
      }

      const accountLink = await onboardingResponse.json();

      return new Response(JSON.stringify({
        url: accountLink.url,
        account_id: accountId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_dashboard_link") {
      if (!seller.stripe_account_id) {
        throw new Error("No Stripe account connected");
      }

      // Create login link for Express Dashboard
      const loginResponse = await fetch(
        `https://api.stripe.com/v1/accounts/${seller.stripe_account_id}/login_links`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (!loginResponse.ok) {
        throw new Error("Failed to create dashboard link");
      }

      const loginLink = await loginResponse.json();

      return new Response(JSON.stringify({
        url: loginLink.url,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Connect onboard error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
