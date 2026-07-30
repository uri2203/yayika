// ============================================================
// Yayika — AI Community Edge Function
// Handles community feed, posts, reactions, comments, moderation
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

    const body = await req.json();
    const { action, user_id, lang = "es" } = body;

    switch (action) {
      case "getFeed": {
        const { category_slug = null, limit = 20, offset = 0 } = body;
        const { data, error } = await supabase.rpc("yayika_get_community_feed", {
          p_user_id: user_id || null,
          p_category_slug: category_slug,
          p_limit: limit,
          p_offset: offset,
        });
        if (error) throw error;
        return json({ posts: data || [] });
      }

      case "createPost": {
        const { content, category_slug = "logros", post_type = "text", achievement_type = null, achievement_data = {} } = body;
        if (!content || content.trim().length === 0) {
          return json({ error: "Content required" }, 400);
        }
        if (content.length > 1000) {
          return json({ error: "Content too long (max 1000 chars)" }, 400);
        }

        // Basic moderation: check for spam/banned words
        const isClean = moderateContent(content);
        if (!isClean) {
          return json({ error: "Content flagged for review" }, 400);
        }

        const { data, error } = await supabase.rpc("yayika_create_post", {
          p_user_id: user_id,
          p_content: content.trim(),
          p_category_slug: category_slug,
          p_post_type: post_type,
          p_achievement_type: achievement_type,
          p_achievement_data: achievement_data,
        });
        if (error) throw error;
        return json({ post_id: data });
      }

      case "toggleReaction": {
        const { post_id, reaction_type = "like" } = body;
        const { data, error } = await supabase.rpc("yayika_toggle_reaction", {
          p_user_id: user_id,
          p_post_id: post_id,
          p_reaction_type: reaction_type,
        });
        if (error) throw error;
        return json({ status: data });
      }

      case "addComment": {
        const { post_id, content, parent_id = null } = body;
        if (!content || content.trim().length === 0) {
          return json({ error: "Content required" }, 400);
        }
        if (content.length > 500) {
          return json({ error: "Content too long (max 500 chars)" }, 400);
        }

        const isClean = moderateContent(content);
        if (!isClean) {
          return json({ error: "Content flagged for review" }, 400);
        }

        const { data, error } = await supabase.rpc("yayika_add_comment", {
          p_user_id: user_id,
          p_post_id: post_id,
          p_content: content.trim(),
          p_parent_id: parent_id,
        });
        if (error) throw error;
        return json({ comment_id: data });
      }

      case "getComments": {
        const { post_id, limit = 20, offset = 0 } = body;
        const { data, error } = await supabase
          .from("yayika_community_comments")
          .select("*, yayika_affiliates(full_name, email)")
          .eq("post_id", post_id)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .range(offset, offset + limit - 1);
        if (error) throw error;
        return json({ comments: data || [] });
      }

      case "getNotifications": {
        const { data, error } = await supabase
          .from("yayika_community_notifications")
          .select("*, yayika_community_posts(content), yayika_community_comments(content)")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(30);
        if (error) throw error;

        const { count } = await supabase
          .from("yayika_community_notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user_id)
          .eq("read", false);

        return json({ notifications: data || [], unread_count: count || 0 });
      }

      case "markRead": {
        const { error } = await supabase.rpc("yayika_mark_notifications_read", {
          p_user_id: user_id,
        });
        if (error) throw error;
        return json({ success: true });
      }

      case "getCategories": {
        const { data, error } = await supabase
          .from("yayika_community_categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order");
        if (error) throw error;
        return json({ categories: data || [] });
      }

      case "getUserStats": {
        const { data, error } = await supabase
          .from("yayika_community_user_stats")
          .select("*")
          .eq("user_id", user_id)
          .single();
        if (error) throw error;
        return json({ stats: data });
      }

      case "reportPost": {
        const { post_id } = body;
        const { error } = await supabase
          .from("yayika_community_posts")
          .update({ reports_count: supabase.rpc ? 1 : 1 })
          .eq("id", post_id);
        if (error) throw error;
        return json({ success: true });
      }

      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (error) {
    console.error("Community error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// HELPERS
// ============================================================

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}

function moderateContent(content: string): boolean {
  const banned = [
    "spam", "estafa", "hack", "porn", "xxx",
    "buy now", "click here", "www.", "http",
    "whatsapp", "telegram", "onlyfans"
  ];
  const lower = content.toLowerCase();
  return !banned.some(word => lower.includes(word));
}
