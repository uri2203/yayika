import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { action, lang = "es", category, search, specialty, product_id, mentor_id, session_data } = body;

    const T: Record<string, Record<string, string>> = {
      es: {
        title: "💰 Gana con Yayika", earnings: "Tus Ganancias", total: "Total ganado",
        pending: "Pendiente", available: "Disponible", paidOut: "Ya cobrado",
        referrals: "Por referidos", marketplace: "Por ventas", mentoring: "Por mentoring",
        inviteTitle: "Invita y Gana", inviteDesc: "Comparte tu código y gana comisiones por cada amiga que se una",
        myCode: "Tu código", copyCode: "Copiar", shareNow: "Compartir ahora",
        marketplaceTitle: "Marketplace Entre Nosotras", sellTitle: "Vende tu producto",
        sellDesc: "Crea y vende templates, guías, cursos a otras mujeres",
        mentoringTitle: "Mentoring", mentoringDesc: "Ofrece o recibe apoyo de otras mujeres expertas",
        roiTitle: "Tu Valor en Yayika", roiDesc: "Mira cuánto has ganado vs cuánto has invertido",
        sessions: "sesiones", sales: "ventas", rating: "rating",
        bookSession: "Agendar sesión", viewProfile: "Ver perfil",
        noEarnings: "Aún no tienes ganancias. ¡Invita amigas o vende tu primer producto!",
        region: "Tu región", country: "País", currency: "Moneda",
        trending: "Popular", new: "Nuevo", free: "Gratis",
        mentors: "Mentoras disponibles",
      },
      en: {
        title: "💰 Earn with Yayika", earnings: "Your Earnings", total: "Total earned",
        pending: "Pending", available: "Available", paidOut: "Paid out",
        referrals: "From referrals", marketplace: "From sales", mentoring: "From mentoring",
        inviteTitle: "Invite & Earn", inviteDesc: "Share your code and earn commissions for each friend who joins",
        myCode: "Your code", copyCode: "Copy", shareNow: "Share now",
        marketplaceTitle: "Entre Nosotras Marketplace", sellTitle: "Sell your product",
        sellDesc: "Create and sell templates, guides, courses to other women",
        mentoringTitle: "Mentoring", mentoringDesc: "Offer or receive support from expert women",
        roiTitle: "Your Value in Yayika", roiDesc: "See how much you've earned vs invested",
        sessions: "sessions", sales: "sales", rating: "rating",
        bookSession: "Book session", viewProfile: "View profile",
        noEarnings: "No earnings yet. Invite friends or sell your first product!",
        region: "Your region", country: "Country", currency: "Currency",
        trending: "Popular", new: "New", free: "Free",
        mentors: "Available mentors",
      },
    };
    const t = (k: string) => (T[lang] || T.es)[k] || (T.es)[k] || k;

    if (action === "getAffiliateData" || action === "getDashboard") {
      // Get earnings dashboard
      const { data: earnings } = await supabase.rpc("yayika_get_earnings_dashboard", { p_user_id: user.id });

      // Get user profile with region
      const { data: profile } = await supabase.from("yayika_profiles").select("country_code, city, currency_code, price_tier, referral_code").eq("id", user.id).single();

      // Get referral code if not set
      let referralCode = profile?.referral_code;
      if (!referralCode) {
        referralCode = `YKI-${user.id.substring(0, 8).toUpperCase()}`;
        await supabase.from("yayika_profiles").update({ referral_code: referralCode }).eq("id", user.id);
      }

      const e = earnings?.[0] || {};

      // Calculate ROI
      const membershipCost = 1900; // cents, simplified
      const totalEarned = e.total_earned || 0;
      const roi = membershipCost > 0 ? Math.round((totalEarned / membershipCost) * 100) : 0;

      return new Response(JSON.stringify({
        success: true,
        dashboard: {
          earnings: {
            total: e.total_earned || 0,
            pending: e.pending_balance || 0,
            available: e.available_balance || 0,
            paidOut: e.paid_out || 0,
            referrals: e.referral_earnings || 0,
            marketplace: e.marketplace_earnings || 0,
            mentoring: e.mentoring_earnings || 0,
          },
          stats: {
            referralsCount: e.referrals_count || 0,
            productsSold: e.products_sold || 0,
            mentoringSessions: e.mentoring_sessions || 0,
          },
          recent: e.recent_earnings || [],
          referralCode,
          roi,
          region: {
            country: profile?.country_code || 'US',
            currency: profile?.currency_code || 'USD',
            tier: profile?.price_tier || 'US',
            city: profile?.city,
          },
          translations: {
            title: t("title"), earnings: t("earnings"), total: t("total"),
            pending: t("pending"), available: t("available"), paidOut: t("paidOut"),
            referrals: t("referrals"), marketplace: t("marketplace"), mentoring: t("mentoring"),
            inviteTitle: t("inviteTitle"), inviteDesc: t("inviteDesc"),
            myCode: t("myCode"), copyCode: t("copyCode"), shareNow: t("shareNow"),
            marketplaceTitle: t("marketplaceTitle"), sellTitle: t("sellTitle"),
            sellDesc: t("sellDesc"), mentoringTitle: t("mentoringTitle"),
            mentoringDesc: t("mentoringDesc"), roiTitle: t("roiTitle"),
            roiDesc: t("roiDesc"), noEarnings: t("noEarnings"),
            region: t("region"), country: t("country"), currency: t("currency"),
            trending: t("trending"), new: t("new"), free: t("free"),
            mentors: t("mentors"), sessions: t("sessions"), sales: t("sales"),
          }
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "getMarketplace") {
      const { data, error } = await supabase.rpc("yayika_get_marketplace", { p_category: category || null, p_search: search || null });
      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        products: data || [],
        translations: {
          marketplaceTitle: t("marketplaceTitle"), sellTitle: t("sellTitle"),
          trending: t("trending"), new: t("new"), free: t("free"),
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "getMentors") {
      const { data, error } = await supabase.rpc("yayika_get_mentors", { p_specialty: specialty || null });
      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        mentors: data || [],
        translations: {
          mentoringTitle: t("mentoringTitle"), mentoringDesc: t("mentoringDesc"),
          bookSession: t("bookSession"), viewProfile: t("viewProfile"),
          sessions: t("sessions"), rating: t("rating"),
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "getRegion") {
      const { data } = await supabase.from("yayika_profiles").select("country_code, city, currency_code, price_tier, timezone").eq("id", user.id).single();
      const { data: regions } = await supabase.from("yayika_regions").select("*").eq("is_active", true).order("country_name");

      return new Response(JSON.stringify({
        success: true,
        profile: data || {},
        regions: regions || [],
        translations: { region: t("region"), country: t("country"), currency: t("currency") }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
