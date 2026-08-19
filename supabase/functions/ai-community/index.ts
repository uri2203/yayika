// ============================================================
// Yayika — AI Community Edge Function
// Handles community feed, posts, reactions, comments, moderation
// Uses direct table queries (RPCs were never created in the DB)
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

        let query = supabase
          .from("yayika_community_posts")
          .select("id, content, category_id, user_id, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .range(offset, offset + Math.min(limit, 50) - 1);

        if (category_slug) {
          const { data: cat } = await supabase
            .from("yayika_community_categories")
            .select("id")
            .eq("slug", category_slug)
            .maybeSingle();
          if (cat) query = query.eq("category_id", cat.id);
        }

        const { data: posts, error } = await query;
        if (error) throw error;

        const all = posts || [];
        if (all.length === 0) return json({ posts: [] });

        const postIds = all.map((p) => p.id);
        const catIds = [...new Set(all.map((p) => p.category_id).filter(Boolean))];
        const userIds = all.map((p) => p.user_id).filter(Boolean);

        const [{ data: cats }, { data: authors }, { data: reactions }, { data: comments }] = await Promise.all([
          supabase.from("yayika_community_categories").select("id, slug, name").in("id", catIds),
          supabase.from("yayika_affiliates").select("id, full_name").in("id", userIds),
          supabase
            .from("yayika_community_reactions")
            .select("post_id, user_id")
            .in("post_id", postIds)
            .eq("reaction_type", "like"),
          supabase
            .from("yayika_community_comments")
            .select("post_id")
            .in("post_id", postIds)
            .eq("status", "active"),
        ]);

        const catMap: Record<string, any> = {};
        for (const c of cats || []) catMap[c.id] = c;

        const authorMap: Record<string, any> = {};
        for (const a of authors || []) authorMap[a.id] = a;

        const likeCounts: Record<string, number> = {};
        const likedByUser = new Set<string>();
        for (const r of reactions || []) {
          likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1;
          if (r.user_id === user_id) likedByUser.add(r.post_id);
        }

        const commentCounts: Record<string, number> = {};
        for (const c of comments || []) commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;

        const postsOut = all.map((p) => ({
          id: p.id,
          content: p.content,
          user_name: authorMap[p.user_id]?.full_name || null,
          category: catMap[p.category_id]?.name || null,
          category_slug: catMap[p.category_id]?.slug || null,
          created_at: p.created_at,
          like_count: likeCounts[p.id] || 0,
          comment_count: commentCounts[p.id] || 0,
          user_has_liked: likedByUser.has(p.id),
        }));

        return json({ posts: postsOut });
      }

      case "createPost": {
        const { content, category_slug = "logros", post_type = "text", achievement_type = null, achievement_data = {} } = body;
        if (!content || content.trim().length === 0) {
          return json({ error: "Content required" }, 400);
        }
        if (content.length > 1000) {
          return json({ error: "Content too long (max 1000 chars)" }, 400);
        }

        const isClean = moderateContent(content);
        if (!isClean) {
          return json({ error: "Content flagged for review" }, 400);
        }

        let categoryId: string | null = null;
        if (category_slug) {
          const { data: cat } = await supabase
            .from("yayika_community_categories")
            .select("id")
            .eq("slug", category_slug)
            .maybeSingle();
          categoryId = cat?.id ?? null;
        }

        const { data, error } = await supabase
          .from("yayika_community_posts")
          .insert({
            user_id,
            content: content.trim(),
            category_id: categoryId,
            post_type,
            achievement_type,
            achievement_data,
            status: "active",
          })
          .select("id")
          .single();
        if (error) throw error;
        return json({ post_id: data.id });
      }

      case "toggleReaction": {
        const { post_id, reaction_type = "like" } = body;
        const { data: existing } = await supabase
          .from("yayika_community_reactions")
          .select("id")
          .eq("user_id", user_id)
          .eq("post_id", post_id)
          .eq("reaction_type", reaction_type)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase.from("yayika_community_reactions").delete().eq("id", existing.id);
          if (error) throw error;
          return json({ status: "removed" });
        }

        const { data, error } = await supabase
          .from("yayika_community_reactions")
          .insert({ user_id, post_id, reaction_type })
          .select("id")
          .single();
        if (error) throw error;
        return json({ status: "added", reaction_id: data.id });
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

        const { data, error } = await supabase
          .from("yayika_community_comments")
          .insert({
            user_id,
            post_id,
            content: content.trim(),
            parent_id,
            status: "active",
          })
          .select("id")
          .single();
        if (error) throw error;
        return json({ comment_id: data.id });
      }

      case "getComments": {
        const { post_id, limit = 20, offset = 0 } = body;
        const { data, error } = await supabase
          .from("yayika_community_comments")
          .select("id, content, user_id, created_at")
          .eq("post_id", post_id)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .range(offset, offset + limit - 1);
        if (error) throw error;

        const rows = data || [];
        const userIds = rows.map((c: any) => c.user_id).filter(Boolean);
        const authorMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: authors } = await supabase
            .from("yayika_affiliates")
            .select("id, full_name, email")
            .in("id", userIds);
          for (const a of authors || []) authorMap[a.id] = a;
        }

        const comments = rows.map((c: any) => ({
          id: c.id,
          content: c.content,
          user_name: authorMap[c.user_id]?.full_name || null,
          user_email: authorMap[c.user_id]?.email || null,
          created_at: c.created_at,
        }));
        return json({ comments });
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
        const { error } = await supabase
          .from("yayika_community_notifications")
          .update({ read: true })
          .eq("user_id", user_id)
          .eq("read", false);
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
        const { data: current } = await supabase
          .from("yayika_community_posts")
          .select("reports_count")
          .eq("id", post_id)
          .maybeSingle();
        const { error } = await supabase
          .from("yayika_community_posts")
          .update({ reports_count: (current?.reports_count || 0) + 1 })
          .eq("id", post_id);
        if (error) throw error;
        return json({ success: true });
      }

      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (error) {
    console.error("Community error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
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