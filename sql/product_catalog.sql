/* ============================================================
   Yayika — Active Product Catalog Schema
   Courses, memberships, digital products
   ============================================================ */

-- ============================================================
-- TABLES
-- ============================================================

-- Product catalog
CREATE TABLE IF NOT EXISTS yayika_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  category TEXT NOT NULL DEFAULT 'course', -- course, membership, template, guide, bundle
  price_cents INT NOT NULL DEFAULT 0, -- 0 = free
  currency TEXT DEFAULT 'USD',
  stripe_price_id TEXT,
  image_url TEXT,
  tags JSONB DEFAULT '[]',
  features JSONB DEFAULT '[]',
  lesson_count INT DEFAULT 0,
  duration_hours DECIMAL(5,1) DEFAULT 0,
  difficulty TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced
  language TEXT DEFAULT 'es',
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  access_type TEXT DEFAULT 'purchase', -- purchase, membership, free
  preview_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product lessons/content
CREATE TABLE IF NOT EXISTS yayika_product_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES yayika_products(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  content_type TEXT DEFAULT 'text', -- text, video, audio, quiz, worksheet
  content_url TEXT,
  duration_minutes INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User purchases/access
CREATE TABLE IF NOT EXISTS yayika_user_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES yayika_products(id) ON DELETE CASCADE NOT NULL,
  stripe_session_id TEXT,
  status TEXT DEFAULT 'active', -- active, expired, refunded
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, product_id)
);

-- User progress through lessons
CREATE TABLE IF NOT EXISTS yayika_user_lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES yayika_product_lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_prod_cat ON yayika_products(category);
CREATE INDEX IF NOT EXISTS idx_prod_pub ON yayika_products(is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_prod_feat ON yayika_products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_lesson_prod ON yayika_product_lessons(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_purchase_user ON yayika_user_purchases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_user ON yayika_user_lesson_progress(user_id, completed);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get published catalog
CREATE OR REPLACE FUNCTION yayika_get_catalog(p_category TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID, name TEXT, description TEXT, category TEXT,
  price_cents INT, currency TEXT, image_url TEXT,
  tags JSONB, features JSONB, lesson_count INT,
  duration_hours DECIMAL, difficulty TEXT,
  is_featured BOOLEAN, preview_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, COALESCE(p.description, ''), p.category,
         p.price_cents, p.currency, p.image_url,
         p.tags, p.features, p.lesson_count,
         p.duration_hours, p.difficulty,
         p.is_featured, p.preview_url
  FROM yayika_products p
  WHERE p.is_published = true
    AND (p_category IS NULL OR p.category = p_category)
  ORDER BY p.is_featured DESC, p.sort_order, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's purchased products
CREATE OR REPLACE FUNCTION yayika_get_my_products(p_user_id UUID)
RETURNS TABLE(
  product_id UUID, name TEXT, category TEXT, image_url TEXT,
  purchased_at TIMESTAMPTZ, progress_pct DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.category, p.image_url,
         up.purchased_at,
         CASE WHEN p.lesson_count > 0 THEN
           (SELECT COUNT(*)::DECIMAL / p.lesson_count * 100
            FROM yayika_user_lesson_progress ulp
            JOIN yayika_product_lessons l ON l.id = ulp.lesson_id
            WHERE ulp.user_id = p_user_id AND ulp.completed = true AND l.product_id = p.id)
         ELSE 0 END AS progress_pct
  FROM yayika_user_purchases up
  JOIN yayika_products p ON p.id = up.product_id
  WHERE up.user_id = p_user_id AND up.status = 'active'
  ORDER BY up.purchased_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has access to product
CREATE OR REPLACE FUNCTION yayika_has_product_access(p_user_id UUID, p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM yayika_user_purchases
    WHERE user_id = p_user_id AND product_id = p_product_id AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE yayika_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_product_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Public read for published products
CREATE POLICY "public_read_products" ON yayika_products FOR SELECT USING (is_published = true);
CREATE POLICY "public_read_lessons" ON yayika_product_lessons FOR SELECT USING (true);

-- User read own purchases/progress
CREATE POLICY "user_read_purchases" ON yayika_user_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_purchases" ON yayika_user_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_read_progress" ON yayika_user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_upsert_progress" ON yayika_user_lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_progress" ON yayika_user_lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "svc_all_products" ON yayika_products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_lessons" ON yayika_product_lessons FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_purchases" ON yayika_user_purchases FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_progress" ON yayika_user_lesson_progress FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SEED: Initial Products
-- ============================================================

INSERT INTO yayika_products (name, name_en, description, description_en, category, price_cents, image_url, tags, features, lesson_count, duration_hours, difficulty, is_featured, sort_order) VALUES

-- Free products
('Bienvenida a Yayika', 'Welcome to Yayika', 'Tu primer paso hacia una vida más consciente. Conoce todas las herramientas.', 'Your first step towards a more conscious life.', 'course', 0, '/images/products/welcome.svg',
 '["gratis","onboarding"]',
 '["Tour interactivo","Setup personalizado","Primera semana guiada"]',
 7, 2, 'beginner', true, 1),

('Calculadora de Ciclo', 'Cycle Calculator', 'Aprende a usar tu tracker de ciclo para obtener predicciones precisas.', 'Learn to use your cycle tracker for accurate predictions.', 'guide', 0, '/images/products/cycle-guide.svg',
 '["gratis","ciclo"]',
 '["Guía visual","Predicciones","Consejos personalizados"]',
 5, 1, 'beginner', false, 2),

-- Paid courses
('Maestría en Finanzas Femeninas', 'Women\'s Financial Mastery', 'Transforma tu relación con el dinero. Presupuestos, ahorro, inversiones y abundancia.', 'Transform your relationship with money.', 'course', 4900, '/images/products/finance-mastery.svg',
 '["finanzas","premium","bestseller"]',
 '["12 módulos","Herramientas descargables","Certificado","Comunidad privada","Sesiones Q&A mensuales"]',
 12, 8, 'intermediate', true, 3),

('Mindfulness & Meditación para Mujeres', 'Mindfulness & Meditation for Women', 'Meditaciones guiadas específicas para cada fase de tu ciclo.', 'Guided meditations for each cycle phase.', 'course', 3900, '/images/products/mindfulness.svg',
 '["bienestar","meditación","premium"]',
 '["20 meditaciones","Audio guiado","Música exclusiva","Guía de praktika"]',
 20, 10, 'beginner', true, 4),

('Nutrición Ciclística', 'Cycle-Based Nutrition', 'Come según tu ciclo. Recetas y planes adaptados a cada fase.', 'Eat according to your cycle.', 'course', 5900, '/images/products/nutrition-cycle.svg',
 '["nutrición","ciclo","premium"]',
 '["50+ recetas","Planes semanales","Lista de compras","Adaptaciones dietéticas"]',
 30, 15, 'intermediate', false, 5),

('Productividad con Propósito', 'Purposeful Productivity', 'Sistema de productividad que se adapta a tu energía y ritmo natural.', 'Productivity that adapts to your energy.', 'course', 2900, '/images/products/productivity.svg',
 '["productividad","organización"]',
 '["8 módulos","Templates","Sistema de rutinas","Tracker descargable"]',
 8, 4, 'beginner', false, 6),

('Yoga para Todas las Fases', 'Yoga for All Phases', 'Secuencias de yoga adaptadas a menstrual, folicular, ovulatorio y lúteo.', 'Yoga sequences for each cycle phase.', 'course', 3500, '/images/products/yoga-cycle.svg',
 '["yoga","ejercicio","bienestar"]',
 '["24 sesiones","Video HD","Modificaciones","Nivel todos"]',
 24, 12, 'beginner', false, 7),

('Guía de Sueño Reparador', 'Restful Sleep Guide', 'Optimiza tu descanso según tu fase del ciclo.', 'Optimize your rest based on your cycle phase.', 'guide', 1500, '/images/products/sleep-guide.svg',
 '["sueño","bienestar","guía"]',
 '["Guía completa","Rutinas nocturnas","Tracking del sueño","Tips por fase"]',
 10, 3, 'beginner', false, 8),

-- Memberships
('Yayika Pro', 'Yayika Pro', 'Acceso ilimitado a todos los cursos, plantillas y comunidad privada.', 'Unlimited access to all courses, templates, and private community.', 'membership', 1900, '/images/products/pro-badge.svg',
 '["membership","premium","acceso-total"]',
 '["Todos los cursos","Plantillas premium","Comunidad privada","Coach AI avanzado","Soporte prioritario","Sin anuncios"]',
 0, 0, 'advanced', true, 9),

('Mentoría 1:1', '1:1 Mentoring', 'Sesiones privadas con coaches certificadas para tu transformación personal.', 'Private sessions with certified coaches.', 'membership', 9900, '/images/products/mentoring.svg',
 '["mentoría","premium","personalizado"]',
 '["4 sesiones/mes","Plan personalizado","Seguimiento por WhatsApp","Acceso a todos los cursos"]',
 0, 0, 'advanced', false, 10),

-- Templates
('Pack de Planner Digital', 'Digital Planner Pack', 'Plantillas de planificación para GoodNotes, Notability y más.', 'Planning templates for GoodNotes, Notability, and more.', 'template', 1900, '/images/products/planner-pack.svg',
 '["planner","template","productividad"]',
 '["12 plantillas","Multi-formato","Diseño premium","Actualizaciones gratis"]',
 12, 0, 'beginner', false, 11),

('Templates de Budget', 'Budget Templates', 'Hojas de cálculo y plantillas para gestionar tus finanzas.', 'Spreadsheets and templates for finances.', 'template', 900, '/images/products/budget-templates.svg',
 '["finanzas","template","presupuesto"]',
 '["8 plantillas","Google Sheets","Excel","Automáticas"]',
 8, 0, 'beginner', false, 12)

ON CONFLICT DO NOTHING;

-- Seed lessons for featured course (Maestría Finanzas)
DO $$
DECLARE
  v_prod UUID;
  v_lessons TEXT[][] := ARRAY[
    ARRAY['Bienvenida y Setup', 'Welcome & Setup', 'text', '0'],
    ARRAY['Mentalidad de Abundancia', 'Abundance Mindset', 'text', '10'],
    ARRAY['Presupuesto Femenino', 'Women\'s Budget', 'text', '15'],
    ARRAY['Ahorro Inteligente', 'Smart Saving', 'text', '15'],
    ARRAY['Deudas y Libertad', 'Debt & Freedom', 'text', '20'],
    ARRAY['Inversión Inicial', 'Getting Started Investing', 'video', '25'],
    ARRAY['Fondos de Emergencia', 'Emergency Funds', 'text', '15'],
    ARRAY['Inversión a Largo Plazo', 'Long-term Investing', 'video', '30'],
    ARRAY['Inversiones Éticas', 'Ethical Investing', 'text', '20'],
    ARRAY['Protección y Seguros', 'Protection & Insurance', 'text', '15'],
    ARRAY['Planificación de Metas', 'Goal Planning', 'worksheet', '20'],
    ARRAY['Tu Plan Financiero', 'Your Financial Plan', 'worksheet', '30']
  ];
  i INT;
BEGIN
  SELECT id INTO v_prod FROM yayika_products WHERE name = 'Maestría en Finanzas Femeninas' LIMIT 1;
  IF v_prod IS NOT NULL THEN
    FOR i IN 1..array_length(v_lessons, 1) LOOP
      INSERT INTO yayika_product_lessons (product_id, title, title_en, content_type, duration_minutes, sort_order, is_free_preview)
      VALUES (v_prod, v_lessons[i][1], v_lessons[i][2], v_lessons[i][3], v_lessons[i][4]::INT, i, i <= 2)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Update lesson counts
UPDATE yayika_products p SET lesson_count = (
  SELECT COUNT(*) FROM yayika_product_lessons l WHERE l.product_id = p.id
) WHERE p.lesson_count = 0 AND p.category IN ('course', 'guide');
