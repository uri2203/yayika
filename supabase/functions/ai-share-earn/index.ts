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

const LOCALES = ["es", "en", "pt", "fr", "de"];

// Known share-card strings in all five supported languages. Existing es/en
// values are always preserved verbatim; pt/fr/de are filled from here.
const LOCALIZED_TEXT: Record<string, Record<string, string>> = (() => {
  const groups: Record<string, string>[] = [
    { es: "Mi primer check-in", en: "My first check-in", pt: "Meu primeiro check-in", fr: "Mon premier check-in", de: "Mein erster Check-in" },
    { es: "7 días de racha", en: "7-day streak", pt: "7 dias de sequência", fr: "Série de 7 jours", de: "7-Tage-Serie" },
    { es: "30 días de racha", en: "30-day streak", pt: "30 dias de sequência", fr: "Série de 30 jours", de: "30-Tage-Serie" },
    { es: "Badge desbloqueado", en: "Badge unlocked", pt: "Distintivo desbloqueado", fr: "Badge débloqué", de: "Abzeichen freigeschaltet" },
    { es: "Invita a una amiga", en: "Invite a friend", pt: "Convide uma amiga", fr: "Invite une amie", de: "Lade eine Freundin ein" },
    { es: "Logro desbloqueado", en: "Achievement unlocked", pt: "Conquista desbloqueada", fr: "Réussite débloquée", de: "Erfolg freigeschaltet" },
    { es: "Racha activa", en: "Active streak", pt: "Sequência ativa", fr: "Série active", de: "Aktive Serie" },
    { es: "Nivel alcanzado", en: "Level reached", pt: "Nível alcançado", fr: "Niveau atteint", de: "Level erreicht" },
    { es: "Reto completado", en: "Challenge completed", pt: "Desafio concluído", fr: "Défi relevé", de: "Herausforderung abgeschlossen" },
    { es: "Maestra del ciclo", en: "Cycle Master", pt: "Mestra do ciclo", fr: "Maîtresse du cycle", de: "Zyklus-Meisterin" },
    { es: "Mi primer post", en: "My first post", pt: "Meu primeiro post", fr: "Mon premier post", de: "Mein erster Beitrag" },
    { es: "Primera comisión", en: "First commission", pt: "Primeira comissão", fr: "Première commission", de: "Erste Provision" },
    { es: "Mi logro", en: "My achievement", pt: "Minha conquista", fr: "Ma réussite", de: "Mein Erfolg" },
    { es: "En Yayika", en: "On Yayika", pt: "Na Yayika", fr: "Sur Yayika", de: "Auf Yayika" },
    { es: "Nuevo logro", en: "New achievement", pt: "Nova conquista", fr: "Nouvelle réussite", de: "Neuer Erfolg" },
    { es: "Sigue así", en: "Keep going", pt: "Continue assim", fr: "Continue comme ça", de: "Mach weiter so" },
    { es: "Empecé mi camino en Yayika", en: "I started my journey on Yayika", pt: "Comecei minha jornada na Yayika", fr: "J'ai commencé mon parcours sur Yayika", de: "Ich habe meine Reise auf Yayika begonnen" },
    { es: "7 días seguidos cuidándome", en: "7 days straight of self-care", pt: "7 dias seguidos cuidando de mim", fr: "7 jours d'affilée à prendre soin de moi", de: "7 Tage in Folge Selbstfürsorge" },
    { es: "30 días — ¡Una leyenda!", en: "30 days — A legend!", pt: "30 dias — Uma lenda!", fr: "30 jours — Une légende !", de: "30 Tage — Eine Legende!" },
    { es: "¡Ya gané dinero con Yayika!", en: "I earned money with Yayika!", pt: "Já ganhei dinheiro com a Yayika!", fr: "J'ai gagné de l'argent avec Yayika !", de: "Ich habe mit Yayika Geld verdient!" },
    { es: "{count} amigas ya se unieron", en: "{count} friends have joined", pt: "{count} amigas já se juntaram", fr: "{count} amies ont rejoint", de: "{count} Freundinnen sind beigetreten" },
  ];
  const out: Record<string, Record<string, string>> = {};
  for (const g of groups) {
    out[g.es] = g;
    out[g.en] = g;
  }
  return out;
})();

const EMPTY_LOCALIZED: Record<string, string> = { es: "", en: "", pt: "", fr: "", de: "" };

/** Ensure a localized string object has es/en/pt/fr/de without altering existing values. */
function fillLocales(value: any): Record<string, string> {
  const src: Record<string, any> = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const known = LOCALIZED_TEXT[String(src.es || src.en || "")];
  const generic = String(src.en ?? src.es ?? "");
  const out: Record<string, string> = {};
  for (const loc of LOCALES) {
    const v = src[loc];
    out[loc] = v !== undefined && v !== null ? String(v) : known?.[loc] ?? generic;
  }
  return out;
}

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
            title: fillLocales(d.title || { es: t.name, en: t.name }),
            subtitle_template: fillLocales(d.subtitle_template || EMPTY_LOCALIZED),
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
              title: fillLocales(card_title || LOCALIZED_TEXT["Mi logro"]),
              subtitle: fillLocales(card_subtitle || LOCALIZED_TEXT["En Yayika"]),
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

        const subtitleTemplate = fillLocales(tdata.subtitle_template || EMPTY_LOCALIZED);
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
              title: fillLocales(tdata.title || { es: template.name, en: template.name }),
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
              title: fillLocales(cardConfig.card_title),
              subtitle: fillLocales(cardConfig.card_subtitle),
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
