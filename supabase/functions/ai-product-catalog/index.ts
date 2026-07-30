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
    let user: any = null;
    let userClient: any = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user: u } } = await userClient.auth.getUser();
      user = u;
    }

    const body = await req.json();
    const { action, category, product_id, lang = "es" } = body;

    const T: Record<string, Record<string, string>> = {
      es: {
        title: "📚 Catálogo de Productos", courses: "Cursos", guides: "Guías", templates: "Plantillas",
        memberships: "Membresías", featured: "Destacados", free: "Gratis", lessons: "lecciones",
        hours: "horas", buy: "Comenzar", access: "Acceder", progress: "Progreso",
        myProducts: "Mis Productos", noProducts: "Aún no tienes productos. Explora el catálogo.",
        noAccess: "Obtén acceso para desbloquear todo el contenido", included: "Incluido",
        beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado",
      },
      en: {
        title: "📚 Product Catalog", courses: "Courses", guides: "Guides", templates: "Templates",
        memberships: "Memberships", featured: "Featured", free: "Free", lessons: "lessons",
        hours: "hours", buy: "Start", access: "Access", progress: "Progress",
        myProducts: "My Products", noProducts: "No products yet. Explore the catalog.",
        noAccess: "Get access to unlock all content", included: "Included",
        beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
      },
    };
    const t = (k: string) => (T[lang] || T.es)[k] || (T.es)[k] || k;

    if (action === "getCatalog") {
      const { data, error } = await supabase.rpc("yayika_get_catalog", { p_category: category || null });
      if (error) throw error;

      // Group by category
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((p: any) => {
        if (!grouped[p.category]) grouped[p.category] = [];
        grouped[p.category].push(p);
      });

      return new Response(JSON.stringify({
        success: true,
        products: data || [],
        grouped,
        translations: {
          title: t("title"), courses: t("courses"), guides: t("guides"),
          templates: t("templates"), memberships: t("memberships"), featured: t("featured"),
          free: t("free"), lessons: t("lessons"), hours: t("hours"),
          buy: t("buy"), access: t("access"), progress: t("progress"),
          myProducts: t("myProducts"), noProducts: t("noProducts"),
          noAccess: t("noAccess"), included: t("included"),
          beginner: t("beginner"), intermediate: t("intermediate"), advanced: t("advanced"),
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "getMyProducts") {
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data, error } = await supabase.rpc("yayika_get_my_products", { p_user_id: user.id });
      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        products: data || [],
        translations: {
          myProducts: t("myProducts"), noProducts: t("noProducts"), progress: t("progress"),
          access: t("access"),
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "getProductDetail") {
      if (!product_id) return new Response(JSON.stringify({ error: "product_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: product } = await supabase.from("yayika_products").select("*").eq("id", product_id).single();
      const { data: lessons } = await supabase.from("yayika_product_lessons").select("*").eq("product_id", product_id).order("sort_order");

      let hasAccess = false;
      let progressPct = 0;
      if (user) {
        const { data: purchase } = await supabase.from("yayika_user_purchases").select("id").eq("user_id", user.id).eq("product_id", product_id).eq("status", "active").single();
        hasAccess = !!purchase || (product?.price_cents === 0);

        if (hasAccess && lessons && lessons.length > 0) {
          const { data: completed } = await supabase.from("yayika_user_lesson_progress").select("id").eq("user_id", user.id).eq("completed", true).in("lesson_id", lessons.map((l: any) => l.id));
          progressPct = Math.round(((completed?.length || 0) / lessons.length) * 100);
        }
      } else if (product?.price_cents === 0) {
        hasAccess = true;
      }

      return new Response(JSON.stringify({
        success: true,
        product,
        lessons: lessons || [],
        hasAccess,
        progressPct,
        translations: {
          buy: t("buy"), access: t("access"), progress: t("progress"),
          lessons: t("lessons"), hours: t("hours"), included: t("included"),
          noAccess: t("noAccess"),
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
