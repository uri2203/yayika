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
      case "getStats": {
        const { data: stats } = await supabase
          .from("yayika_share_stats")
          .select("*")
          .eq("user_id", user_id)
          .maybeSingle();

        const { data: recentCards, error: cardsErr } = await supabase
          .from("yayika_share_cards")
          .select("id, card_type, template_data, share_url, views, created_at")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (cardsErr) console.error("recent cards:", cardsErr);

        return json({
          stats: {
            total_shares: stats?.total_shares || 0,
            total_views: stats?.total_views || 0,
            total_clicks: stats?.total_clicks || 0,
            total_conversions: stats?.conversions || stats?.total_conversions || 0,
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
          .select("id, name, template_data, is_active")
          .eq("is_active", true)
          .order("created_at");
        if (error) throw error;
        const templates = (data || []).map((t: any) => {
          const d = t.template_data || {};
          return {
            id: t.id,
            template_key: d.template_key || t.name,
            name: t.name,
            card_type: d.type || d.card_type || "achievement",
            title: d.title || { es: t.name, en: t.name },
            subtitle_template: d.subtitle_template || { es: "", en: "" },
            icon: d.icon || "🌟",
            color: d.bg_color || d.color || "#7B5EA7",
            gradient: d.gradient || null,
          };
        });
        return json({ templates });
      }

      // ===== CREATE CARD =====
      case "createCard": {
        const { card_type, card_title, card_subtitle, card_icon, card_color, card_data = {}, ref_code } = body;

        const { data: affiliate } = await supabase
          .from("yayika_affiliates")
          .select("referral_code")
          .eq("user_id", user_id)
          .maybeSingle();
        const finalRefCode = ref_code || affiliate?.referral_code || "YKI-JOIN";

        const shareUrl = `https://yayika.com/share/${finalRefCode}?card=${card_type || "achievement"}`;
        const { data, error } = await supabase
          .from("yayika_share_cards")
          .insert({
            user_id,
            card_type: card_type || "achievement",
            template_data: {
              title: card_title || { es: "Mi logro", en: "My achievement" },
              subtitle: card_subtitle || { es: "En Yayika", en: "On Yayika" },
              icon: card_icon || "🌟",
              color: card_color || "#7B5EA7",
              card_data,
              ref_code: finalRefCode,
            },
            share_url: shareUrl,
            views: 0,
          })
          .select("*")
          .single();
        if (error) throw error;

        await supabase.rpc("yayika_record_growth_activity", {
          p_user_id: user_id,
          p_activity_type: "share_card_created",
          p_metadata: {},
        }).then(() => {}, () => {});

        return json({ card: data });
      }

      // ===== CREATE CARD FROM TEMPLATE =====
      case "createFromTemplate": {
        const { template_key, custom_data = {} } = body;

        const { data: template, error: tErr } = await supabase
          .from("yayika_share_templates")
          .select("id, name, template_data")
          .eq("name", template_key)
          .maybeSingle();
        if (tErr || !template) return json({ error: "Template not found" }, 404);

        const tdata = template.template_data || {};
        const { data: affiliate } = await supabase
          .from("yayika_affiliates")
          .select("referral_code, total_referrals")
          .eq("user_id", user_id)
          .maybeSingle();
        const refCode = affiliate?.referral_code || "YKI-JOIN";

        const subtitleTemplate = tdata.subtitle_template || { es: "", en: "" };
        const finalSubtitle: Record<string, string> = {};
        for (const [key, val] of Object.entries(subtitleTemplate)) {
          let s = String(val);
          s = s.replace("{count}", String(custom_data.count || affiliate?.total_referrals || 0));
          s = s.replace("{name}", custom_data.name || "Yayika");
          s = s.replace("{desc}", custom_data.desc || "");
          finalSubtitle[key] = s;
        }

        const shareUrl = `https://yayika.com/share/${refCode}?card=${tdata.type || "achievement"}`;
        const { data, error } = await supabase
          .from("yayika_share_cards")
          .insert({
            user_id,
            card_type: tdata.type || tdata.card_type || "achievement",
            template_data: {
              title: tdata.title || { es: template.name, en: template.name },
              subtitle: finalSubtitle,
              icon: tdata.icon || "🌟",
              color: tdata.bg_color || tdata.color || "#7B5EA7",
              gradient: tdata.gradient || null,
              card_data: custom_data,
              template_key,
              ref_code: refCode,
            },
            share_url: shareUrl,
            views: 0,
          })
          .select("*")
          .single();
        if (error) throw error;

        return json({ card: data, gradient: tdata.gradient || null });
      }

      // ===== RECORD SHARE EVENT =====
      case "recordShare": {
        const { card_id } = body;
        const { data: cur } = await supabase.from("yayika_share_cards").select("views").eq("id", card_id).maybeSingle();
        if (cur) {
          await supabase.from("yayika_share_cards").update({ views: (cur.views || 0) + 1 }).eq("id", card_id);
        }
        const { data: s0 } = await supabase.from("yayika_share_stats").select("total_shares").eq("user_id", user_id).maybeSingle();
        if (s0) {
          await supabase.from("yayika_share_stats")
            .update({ total_shares: (s0.total_shares || 0) + 1, updated_at: new Date().toISOString() })
            .eq("user_id", user_id);
        } else {
          await supabase.from("yayika_share_stats")
            .insert({ user_id, total_shares: 1, total_clicks: 0, conversions: 0, total_views: 0 });
        }
        return json({ ok: true });
      }

      case "recordView": {
        const { card_id } = body;
        const { data: cur } = await supabase.from("yayika_share_cards").select("views").eq("id", card_id).maybeSingle();
        if (cur) {
          await supabase.from("yayika_share_cards").update({ views: (cur.views || 0) + 1 }).eq("id", card_id);
        }
        const { data: s0 } = await supabase.from("yayika_share_stats").select("total_views").eq("user_id", user_id).maybeSingle();
        if (s0) {
          await supabase.from("yayika_share_stats")
            .update({ total_views: (s0.total_views || 0) + 1, updated_at: new Date().toISOString() })
            .eq("user_id", user_id);
        } else {
          await supabase.from("yayika_share_stats")
            .insert({ user_id, total_shares: 0, total_clicks: 0, conversions: 0, total_views: 1 });
        }
        return json({ ok: true });
      }

      case "recordClick": {
        const { card_id } = body;
        const { data: s0 } = await supabase.from("yayika_share_stats").select("total_clicks").eq("user_id", user_id).maybeSingle();
        if (s0) {
          await supabase.from("yayika_share_stats")
            .update({ total_clicks: (s0.total_clicks || 0) + 1, updated_at: new Date().toISOString() })
            .eq("user_id", user_id);
        } else {
          await supabase.from("yayika_share_stats")
            .insert({ user_id, total_shares: 0, total_clicks: 1, conversions: 0, total_views: 0 });
        }
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

        const { data: affiliate } = await supabase
          .from("yayika_affiliates")
          .select("referral_code")
          .eq("user_id", user_id)
          .maybeSingle();
        const refCode = affiliate?.referral_code || "YKI-JOIN";

        const shareUrl = `https://yayika.com/share/${refCode}?card=${cardConfig.card_type}`;
        const { data, error } = await supabase
          .from("yayika_share_cards")
          .insert({
            user_id,
            card_type: cardConfig.card_type,
            template_data: {
              title: cardConfig.card_title,
              subtitle: cardConfig.card_subtitle,
              icon: cardConfig.card_icon,
              color: cardConfig.card_color,
              card_data: achievement_data,
              ref_code: refCode,
            },
            share_url: shareUrl,
            views: 0,
          })
          .select("*")
          .single();
        if (error) throw error;

        return json({ card: data });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    const message =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
        ? String(e.message)
        : "Internal error";
    return json({ error: message }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
