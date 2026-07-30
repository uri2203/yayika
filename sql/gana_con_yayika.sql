/* ============================================================
   Yayika — "Gana con Yayika" Schema
   Regional segmentation, marketplace, mentoring, earnings
   ============================================================ */

-- ============================================================
-- 1. REGIONAL SEGMENTATION
-- ============================================================

-- Price tiers by country
CREATE TABLE IF NOT EXISTS yayika_regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE, -- 'MX', 'CO', 'US', 'BR', 'ES'
  country_name TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD', -- 'USD', 'EUR', 'COP', 'MXN', 'BRL'
  currency_symbol TEXT DEFAULT '$',
  price_tier TEXT NOT NULL DEFAULT 'US', -- 'LATAM', 'EU', 'US', 'ASIA'
  membership_price_cents INT DEFAULT 1900, -- price in local currency cents
  commission_pct DECIMAL(3,2) DEFAULT 0.20, -- 20% referral commission
  payout_methods JSONB DEFAULT '["bank","paypal"]',
  timezone TEXT DEFAULT 'UTC',
  language_default TEXT DEFAULT 'es',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add regional columns to profiles
ALTER TABLE yayika_profiles ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'US';
ALTER TABLE yayika_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE yayika_profiles ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD';
ALTER TABLE yayika_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE yayika_profiles ADD COLUMN IF NOT EXISTS price_tier TEXT DEFAULT 'US';
ALTER TABLE yayika_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE yayika_profiles ADD COLUMN IF NOT EXISTS referred_by UUID;
ALTER TABLE yayika_profiles ADD COLUMN IF NOT EXISTS is_mentor BOOLEAN DEFAULT false;

-- ============================================================
-- 2. MARKETPLACE — "Entre Nosotras"
-- ============================================================

-- User-created products for sale
CREATE TABLE IF NOT EXISTS yayika_marketplace_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'template', -- template, guide, course, coaching, other
  price_cents INT NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  preview_url TEXT,
  file_url TEXT, -- digital product delivery
  tags JSONB DEFAULT '[]',
  features JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft', -- draft, pending, published, rejected
  total_sales INT DEFAULT 0,
  total_revenue_cents INT DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace sales
CREATE TABLE IF NOT EXISTS yayika_marketplace_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES yayika_marketplace_products(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'USD',
  commission_cents INT DEFAULT 0, -- Yayika's cut
  seller_earning_cents INT DEFAULT 0, -- seller's cut
  status TEXT DEFAULT 'completed', -- pending, completed, refunded
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS yayika_marketplace_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES yayika_marketplace_products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ============================================================
-- 3. MENTORING — "Apoyo entre Nosotras"
-- ============================================================

-- Mentor profiles
CREATE TABLE IF NOT EXISTS yayika_mentors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  specialties JSONB DEFAULT '[]', -- 'cycle', 'finance', 'wellness', 'career', 'parenting'
  hourly_rate_cents INT DEFAULT 2500,
  currency TEXT DEFAULT 'USD',
  languages JSONB DEFAULT '["es"]',
  timezone TEXT DEFAULT 'UTC',
  is_available BOOLEAN DEFAULT true,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  total_sessions INT DEFAULT 0,
  total_earnings_cents INT DEFAULT 0,
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentoring sessions
CREATE TABLE IF NOT EXISTS yayika_mentoring_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID REFERENCES yayika_mentors(id) ON DELETE CASCADE NOT NULL,
  mentee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  topic TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  amount_cents INT NOT NULL,
  mentor_earning_cents INT DEFAULT 0,
  platform_commission_cents INT DEFAULT 0,
  meeting_url TEXT, -- video call link
  rating INT CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- 4. EARNINGS TRACKING
-- ============================================================

-- Unified earnings ledger
CREATE TABLE IF NOT EXISTS yayika_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL, -- 'referral_commission', 'marketplace_sale', 'mentoring', 'bonus', 'xp_redemption'
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  reference_id UUID, -- link to referral/sale/session
  reference_type TEXT, -- 'referral', 'sale', 'session', 'bonus'
  status TEXT DEFAULT 'pending', -- pending, available, paid_out
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payout requests
CREATE TABLE IF NOT EXISTS yayika_payout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'USD',
  payout_method TEXT DEFAULT 'paypal', -- paypal, bank, stripe
  payout_details JSONB DEFAULT '{}', -- { paypal_email, bank_account, etc }
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_regions_country ON yayika_regions(country_code);
CREATE INDEX IF NOT EXISTS idx_mp_products_creator ON yayika_marketplace_products(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_mp_products_cat ON yayika_marketplace_products(category, status);
CREATE INDEX IF NOT EXISTS idx_mp_sales_seller ON yayika_marketplace_sales(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_sales_buyer ON yayika_marketplace_sales(buyer_id);
CREATE INDEX IF NOT EXISTS idx_mp_reviews_product ON yayika_marketplace_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_mentors_user ON yayika_mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_avail ON yayika_mentors(is_available, rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_mentoring_mentor ON yayika_mentoring_sessions(mentor_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentoring_mentee ON yayika_mentoring_sessions(mentee_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_user ON yayika_earnings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON yayika_payout_requests(user_id, status);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get user earnings dashboard
CREATE OR REPLACE FUNCTION yayika_get_earnings_dashboard(p_user_id UUID)
RETURNS TABLE(
  total_earned BIGINT,
  pending_balance BIGINT,
  available_balance BIGINT,
  paid_out BIGINT,
  referral_earnings BIGINT,
  marketplace_earnings BIGINT,
  mentoring_earnings BIGINT,
  referrals_count INT,
  products_sold INT,
  mentoring_sessions INT,
  recent_earnings JSONB,
  region JSONB
) AS $fn$ BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(amount_cents) FROM yayika_earnings WHERE user_id = p_user_id), 0)::BIGINT,
    COALESCE((SELECT SUM(amount_cents) FROM yayika_earnings WHERE user_id = p_user_id AND status = 'pending'), 0)::BIGINT,
    COALESCE((SELECT SUM(amount_cents) FROM yayika_earnings WHERE user_id = p_user_id AND status = 'available'), 0)::BIGINT,
    COALESCE((SELECT SUM(amount_cents) FROM yayika_earnings WHERE user_id = p_user_id AND status = 'paid_out'), 0)::BIGINT,
    COALESCE((SELECT SUM(amount_cents) FROM yayika_earnings WHERE user_id = p_user_id AND source = 'referral_commission'), 0)::BIGINT,
    COALESCE((SELECT SUM(amount_cents) FROM yayika_earnings WHERE user_id = p_user_id AND source = 'marketplace_sale'), 0)::BIGINT,
    COALESCE((SELECT SUM(amount_cents) FROM yayika_earnings WHERE user_id = p_user_id AND source = 'mentoring'), 0)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM yayika_referrals WHERE affiliate_id IN (SELECT id FROM yayika_affiliates WHERE user_id = p_user_id)), 0)::INT,
    COALESCE((SELECT SUM(total_sales) FROM yayika_marketplace_products WHERE creator_id = p_user_id), 0)::INT,
    COALESCE((SELECT COUNT(*) FROM yayika_mentoring_sessions ms JOIN yayika_mentors m ON m.id = ms.mentor_id WHERE m.user_id = p_user_id AND ms.status = 'completed'), 0)::INT,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'amount', e.amount_cents, 'source', e.source, 'description', e.description,
        'status', e.status, 'created_at', e.created_at
      ) ORDER BY e.created_at DESC)
      FROM yayika_earnings e WHERE e.user_id = p_user_id LIMIT 10
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_build_object(
        'country_code', p.country_code, 'currency_code', p.currency_code,
        'price_tier', p.price_tier, 'city', p.city
      )
      FROM yayika_profiles p WHERE p.id = p_user_id
    ), '{}'::jsonb);

  IF NOT FOUND THEN
    total_earned := 0; pending_balance := 0; available_balance := 0; paid_out := 0;
    referral_earnings := 0; marketplace_earnings := 0; mentoring_earnings := 0;
    referrals_count := 0; products_sold := 0; mentoring_sessions := 0;
    recent_earnings := '[]'::jsonb; region := '{}'::jsonb;
    RETURN NEXT;
  END IF;
END; $fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get marketplace products
CREATE OR REPLACE FUNCTION yayika_get_marketplace(p_category TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID, creator_id UUID, creator_name TEXT, name TEXT, description TEXT,
  category TEXT, price_cents INT, currency TEXT, image_url TEXT,
  features JSONB, total_sales INT, rating_avg DECIMAL, rating_count INT,
  is_featured BOOLEAN
) AS $fn$ BEGIN
  RETURN QUERY
  SELECT mp.id, mp.creator_id, COALESCE(p.full_name, 'Yayika'),
         mp.name, COALESCE(mp.description, ''), mp.category,
         mp.price_cents, mp.currency, mp.image_url, mp.features,
         mp.total_sales, mp.rating_avg, mp.rating_count, mp.is_featured
  FROM yayika_marketplace_products mp
  LEFT JOIN yayika_profiles p ON p.id = mp.creator_id
  WHERE mp.status = 'published'
    AND (p_category IS NULL OR mp.category = p_category)
    AND (p_search IS NULL OR mp.name ILIKE '%' || p_search || '%')
  ORDER BY mp.is_featured DESC, mp.total_sales DESC, mp.created_at DESC;
END; $fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get available mentors
CREATE OR REPLACE FUNCTION yayika_get_mentors(p_specialty TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID, user_id UUID, display_name TEXT, bio TEXT,
  specialties JSONB, hourly_rate_cents INT, currency TEXT,
  languages JSONB, rating_avg DECIMAL, total_sessions INT,
  profile_image TEXT
) AS $fn$ BEGIN
  RETURN QUERY
  SELECT m.id, m.user_id, COALESCE(m.display_name, p.full_name, 'Mentor'),
         COALESCE(m.bio, ''), m.specialties, m.hourly_rate_cents, m.currency,
         m.languages, m.rating_avg, m.total_sessions, m.profile_image
  FROM yayika_mentors m
  LEFT JOIN yayika_profiles p ON p.id = m.user_id
  WHERE m.is_available = true
    AND (p_specialty IS NULL OR m.specialties ? p_specialty)
  ORDER BY m.rating_avg DESC, m.total_sessions DESC;
END; $fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED: Price tiers by region
-- ============================================================

INSERT INTO yayika_regions (country_code, country_name, currency_code, currency_symbol, price_tier, membership_price_cents, commission_pct, timezone, language_default) VALUES
('US', 'United States', 'USD', '$', 'US', 1900, 0.20, 'America/New_York', 'en'),
('CA', 'Canada', 'CAD', '$', 'US', 2400, 0.20, 'America/Toronto', 'en'),
('MX', 'Mexico', 'MXN', '$', 'LATAM', 14900, 0.20, 'America/Mexico_City', 'es'),
('CO', 'Colombia', 'COP', '$', 'LATAM', 7900, 0.20, 'America/Bogota', 'es'),
('AR', 'Argentina', 'ARS', '$', 'LATAM', 3500, 0.20, 'America/Argentina/Buenos_Aires', 'es'),
('CL', 'Chile', 'CLP', '$', 'LATAM', 1690, 0.20, 'America/Santiago', 'es'),
('PE', 'Peru', 'PEN', 'S/', 'LATAM', 6900, 0.20, 'America/Lima', 'es'),
('EC', 'Ecuador', 'USD', '$', 'LATAM', 1400, 0.20, 'America/Guayaquil', 'es'),
('BR', 'Brazil', 'BRL', 'R$', 'LATAM', 5900, 0.20, 'America/Sao_Paulo', 'pt'),
('ES', 'Spain', 'EUR', '€', 'EU', 1499, 0.20, 'Europe/Madrid', 'es'),
('FR', 'France', 'EUR', '€', 'EU', 1499, 0.20, 'Europe/Paris', 'fr'),
('DE', 'Germany', 'EUR', '€', 'EU', 1499, 0.20, 'Europe/Berlin', 'de'),
('PT', 'Portugal', 'EUR', '€', 'EU', 1299, 0.20, 'Europe/Lisbon', 'pt'),
('IT', 'Italy', 'EUR', '€', 'EU', 1499, 0.20, 'Europe/Rome', 'es'),
('GB', 'United Kingdom', 'GBP', '£', 'EU', 1299, 0.20, 'Europe/London', 'en'),
('JP', 'Japan', 'JPY', '¥', 'ASIA', 1900, 0.20, 'Asia/Tokyo', 'en'),
('AU', 'Australia', 'AUD', '$', 'US', 2490, 0.20, 'Australia/Sydney', 'en')
ON CONFLICT (country_code) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE yayika_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_marketplace_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_mentoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_payout_requests ENABLE ROW LEVEL SECURITY;

-- Regions: public read
CREATE POLICY "public_read_regions" ON yayika_regions FOR SELECT USING (true);

-- Marketplace: public read published, creator manage own
CREATE POLICY "public_read_marketplace" ON yayika_marketplace_products FOR SELECT USING (status = 'published');
CREATE POLICY "creator_read_own_products" ON yayika_marketplace_products FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "creator_insert_products" ON yayika_marketplace_products FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "creator_update_products" ON yayika_marketplace_products FOR UPDATE USING (auth.uid() = creator_id);

-- Sales: buyer/seller read own
CREATE POLICY "seller_read_sales" ON yayika_marketplace_sales FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "buyer_read_sales" ON yayika_marketplace_sales FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "buyer_insert_sales" ON yayika_marketplace_sales FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Reviews: public read, author manage own
CREATE POLICY "public_read_reviews" ON yayika_marketplace_reviews FOR SELECT USING (true);
CREATE POLICY "author_insert_reviews" ON yayika_marketplace_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "author_update_reviews" ON yayika_marketplace_reviews FOR UPDATE USING (auth.uid() = user_id);

-- Mentors: public read available, own profile manage
CREATE POLICY "public_read_mentors" ON yayika_mentors FOR SELECT USING (is_available = true);
CREATE POLICY "mentor_read_own" ON yayika_mentors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mentor_insert_own" ON yayika_mentors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mentor_update_own" ON yayika_mentors FOR UPDATE USING (auth.uid() = user_id);

-- Mentoring sessions: participants read
CREATE POLICY "mentor_read_sessions" ON yayika_mentoring_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM yayika_mentors m WHERE m.id = mentor_id AND m.user_id = auth.uid())
);
CREATE POLICY "mentee_read_sessions" ON yayika_mentoring_sessions FOR SELECT USING (auth.uid() = mentee_id);
CREATE POLICY "mentee_book_session" ON yayika_mentoring_sessions FOR INSERT WITH CHECK (auth.uid() = mentee_id);

-- Earnings: user read own
CREATE POLICY "user_read_earnings" ON yayika_earnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_read_payouts" ON yayika_payout_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_payouts" ON yayika_payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "svc_all_regions" ON yayika_regions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_mp_products" ON yayika_marketplace_products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_mp_sales" ON yayika_marketplace_sales FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_mp_reviews" ON yayika_marketplace_reviews FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_mentors" ON yayika_mentors FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_mentoring" ON yayika_mentoring_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_earnings" ON yayika_earnings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_payouts" ON yayika_payout_requests FOR ALL USING (auth.role() = 'service_role');
