// ============================================================
// Yayika — Share & Earn Edge Function
// Generates shareable achievement cards, tracks shares, awards XP
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    // Verify user identity from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing authorization header");
    }

    const body = await req.json();
    const { action, lang = "es" } = body;

    // Get user_id from JWT token, not from request body
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }
    
    const user_id = user.id;

    switch (action) {
      case "getShareData":
      // getShareData is an alias for getStats (app uses getShareData)
      case "getStats": {
        // Query stats + recent cards directly (avoid RPC issues with complex functions)
        const { data: stats } = await supabase
          .from("yayika_share_stats")
          .select("*")
          .eq("user_id", user_id)
          .single();

        const { data: recentCards } = await supabase
          .from("yayika_share_cards")
          .select("id, card_type, card_title, card_subtitle, card_icon, card_color, share_count, view_count, created_at")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(10);

        return json({
          stats: {
            total_shares: stats?.total_shares || 0,
            total_views: stats?.total_views || 0,
            total_clicks: stats?.total_clicks || 0,
            total_conversions: stats?.total_conversions || 0,
            referral_signups: stats?.referral_signups || 0,
            share_streak: stats?.share_streak || 0,
            best_share_streak: stats?.best_share_streak || 0,
            xp_earned: stats?.xp_earned || 0,
            recent_cards: recentCards || [],
          }
        });
      }

      // ===== GET TEMPLATES =====
      case "getTemplates": {
        const { data, error } = await supabase
          .from("yayika_share_templates")
          .select("template_key, card_type, title, subtitle_template, icon, color, gradient")
          .eq("is_active", true)
          .order("sort_order");
        if (error) throw error;
        return json({ templates: data || [] });
      }

      // ===== CREATE CARD =====
      case "createCard": {
        const { card_type, card_title, card_subtitle, card_icon, card_color, card_data = {}, ref_code } = body;

        // Get user's ref code if not provided
        let finalRefCode = ref_code;
        if (!finalRefCode) {
          const { data: affiliate } = await supabase
            .from("yayika_affiliates")
            .select("ref_code")
            .eq("user_id", user_id)
            .single();
          finalRefCode = affiliate?.ref_code || "YKI-JOIN";
        }

        const { data, error } = await supabase.rpc("yayika_create_share_card", {
          p_user_id: user_id,
          p_card_type: card_type || "achievement",
          p_card_title: card_title || { es: "Mi logro", en: "My achievement" },
          p_card_subtitle: card_subtitle || { es: "En Yayika", en: "On Yayika" },
          p_card_icon: card_icon || "🌟",
          p_card_color: card_color || "#7B5EA7",
          p_card_data: card_data,
          p_ref_code: finalRefCode,
        });
        if (error) throw error;

        // data is the UUID returned by the function
        const cardId = typeof data === "string" ? data : data;
        const { data: card, error: cardErr } = await supabase
          .from("yayika_share_cards")
          .select("*")
          .eq("id", cardId)
          .single();
        if (cardErr) {
          // Fallback: try latest card for this user
          const { data: latestCard } = await supabase
            .from("yayika_share_cards")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          return json({ card: latestCard });
        }

        return json({ card });
      }

      // ===== CREATE CARD FROM TEMPLATE =====
      case "createFromTemplate": {
        const { template_key, custom_data = {} } = body;

        // Get template
        const { data: template, error: tErr } = await supabase
          .from("yayika_share_templates")
          .select("*")
          .eq("template_key", template_key)
          .single();
        if (tErr || !template) return json({ error: "Template not found" }, 404);

        // Get user info for subtitle interpolation
        const { data: affiliate } = await supabase
          .from("yayika_affiliates")
          .select("ref_code, active_referrals")
          .eq("user_id", user_id)
          .single();

        // Interpolate subtitle template
        let subtitle = template.subtitle_template;
        const subtitleObj = typeof template.subtitle_template === "string"
          ? JSON.parse(template.subtitle_template)
          : template.subtitle_template;

        // Process each language
        const finalSubtitle: Record<string, string> = {};
        for (const [key, val] of Object.entries(subtitleObj)) {
          let s = val as string;
          s = s.replace("{count}", String(custom_data.count || affiliate?.active_referrals || 0));
          s = s.replace("{name}", custom_data.name || "Yayika");
          s = s.replace("{desc}", custom_data.desc || "");
          finalSubtitle[key] = s;
        }

        // Get ref code
        let refCode = affiliate?.ref_code || "YKI-JOIN";

        const { data, error } = await supabase.rpc("yayika_create_share_card", {
          p_user_id: user_id,
          p_card_type: template.card_type,
          p_card_title: template.title,
          p_card_subtitle: finalSubtitle,
          p_card_icon: template.icon,
          p_card_color: template.color,
          p_card_data: { ...custom_data, template_key, gradient: template.gradient },
          p_ref_code: refCode,
        });
        if (error) throw error;

        const cardId = typeof data === "string" ? data : data;
        const { data: card, error: cardErr } = await supabase
          .from("yayika_share_cards")
          .select("*")
          .eq("id", cardId)
          .single();
        if (cardErr) {
          const { data: latestCard } = await supabase
            .from("yayika_share_cards")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          return json({ card: latestCard, gradient: template.gradient });
        }

        return json({ card, gradient: template.gradient });
      }

      // ===== RECORD SHARE EVENT =====
      case "recordShare": {
        const { card_id, platform } = body;
        await supabase.rpc("yayika_record_share_event", {
          p_card_id: card_id,
          p_user_id: user_id,
          p_event_type: "share",
          p_platform: platform,
        });
        return json({ ok: true });
      }

      case "recordView": {
        const { card_id } = body;
        await supabase.rpc("yayika_record_share_event", {
          p_card_id: card_id,
          p_user_id: user_id,
          p_event_type: "view",
        });
        return json({ ok: true });
      }

      case "recordClick": {
        const { card_id } = body;
        await supabase.rpc("yayika_record_share_event", {
          p_card_id: card_id,
          p_user_id: user_id,
          p_event_type: "click",
        });
        return json({ ok: true });
      }

      // ===== GET RECENT CARDS =====
      case "getMyCards": {
        const { data, error } = await supabase
          .from("yayika_share_cards")
          .select("*")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        return json({ cards: data || [] });
      }

      // ===== AUTO-GENERATE ACHIEVEMENT CARDS =====
      case "generateAchievementCard": {
        const { achievement_type, achievement_data = {} } = body;

        const langKey = lang || "es";
        let cardConfig: Record<string, any> = {};

        switch (achievement_type) {
          case "first_checkin":
            cardConfig = {
              card_type: "achievement",
              card_title: { es: "Mi primer check-in", en: "My first check-in" },
              card_subtitle: { es: "Empecé mi camino en Yayika", en: "I started my journey on Yayika" },
              card_icon: "🌟",
              card_color: "#B8943A",
            };
            break;
          case "streak_7":
            cardConfig = {
              card_type: "streak",
              card_title: { es: "7 días de racha", en: "7-day streak" },
              card_subtitle: { es: "7 días seguidos cuidándome", en: "7 days straight of self-care" },
              card_icon: "🔥",
              card_color: "#C96B7A",
            };
            break;
          case "streak_30":
            cardConfig = {
              card_type: "streak",
              card_title: { es: "30 días de racha", en: "30-day streak" },
              card_subtitle: { es: "30 días — ¡Una leyenda!", en: "30 days — A legend!" },
              card_icon: "💎",
              card_color: "#7B5EA7",
            };
            break;
          case "badge_earned":
            cardConfig = {
              card_type: "badge",
              card_title: { es: "Badge desbloqueado", en: "Badge unlocked" },
              card_subtitle: achievement_data.badge_name
                ? { es: achievement_data.badge_name, en: achievement_data.badge_name }
                : { es: "Nuevo logro", en: "New achievement" },
              card_icon: achievement_data.badge_icon || "🏆",
              card_color: "#5ED4A0",
            };
            break;
          case "referral":
            cardConfig = {
              card_type: "referral",
              card_title: { es: "Invita a una amiga", en: "Invite a friend" },
              card_subtitle: {
                es: `${achievement_data.referral_count || 1} amigas ya se unieron`,
                en: `${achievement_data.referral_count || 1} friends have joined`,
              },
              card_icon: "🌱",
              card_color: "#1A9E8F",
            };
            break;
          case "earnings":
            cardConfig = {
              card_type: "milestone",
              card_title: { es: "Primera comisión", en: "First commission" },
              card_subtitle: { es: "¡Ya gané dinero con Yayika!", en: "I earned money with Yayika!" },
              card_icon: "💰",
              card_color: "#B8943A",
            };
            break;
          default:
            cardConfig = {
              card_type: "achievement",
              card_title: { es: "Nuevo logro", en: "New achievement" },
              card_subtitle: { es: "Sigue así", en: "Keep going" },
              card_icon: "🌟",
              card_color: "#7B5EA7",
            };
        }

        const { data, error } = await supabase.rpc("yayika_create_share_card", {
          p_user_id: user_id,
          p_card_type: cardConfig.card_type,
          p_card_title: cardConfig.card_title,
          p_card_subtitle: cardConfig.card_subtitle,
          p_card_icon: cardConfig.card_icon,
          p_card_color: cardConfig.card_color,
          p_card_data: achievement_data,
        });
        if (error) throw error;

        const cardId = typeof data === "string" ? data : data;
        const { data: card, error: cardErr } = await supabase
          .from("yayika_share_cards")
          .select("*")
          .eq("id", cardId)
          .single();
        if (cardErr) {
          const { data: latestCard } = await supabase
            .from("yayika_share_cards")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          return json({ card: latestCard });
        }

        return json({ card });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    return json({ error: e.message || "Internal error" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
