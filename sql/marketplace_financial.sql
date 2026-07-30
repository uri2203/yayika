-- ============================================================
-- YAYIKA MARKETPLACE FINANCIAL SYSTEM
-- Stripe Connect + Seller Dashboard + Payouts
-- ============================================================

-- 1. Seller profiles (Stripe Connect accounts)
CREATE TABLE IF NOT EXISTS yayika_seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT,                          -- acct_xxxxx (Stripe Connect)
  stripe_account_status TEXT DEFAULT 'pending',    -- pending, active, restricted, disconnected
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  category TEXT DEFAULT 'general',
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  platform_fee_percent DECIMAL(5,2) DEFAULT 15.00, -- Yayika takes 15%
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  country_code TEXT DEFAULT 'MX',
  currency_code TEXT DEFAULT 'MXN',
  payout_schedule TEXT DEFAULT 'weekly',            -- weekly, biweekly, monthly, manual
  minimum_payout_cents INTEGER DEFAULT 50000,       -- $500 MXN minimum
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Marketplace products (enhanced from existing)
CREATE TABLE IF NOT EXISTS yayika_marketplace_products_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES yayika_seller_profiles(id) ON DELETE CASCADE,
  stripe_price_id TEXT,                             -- price_xxxxx (Stripe Price)
  stripe_product_id TEXT,                           -- prod_xxxxx (Stripe Product)
  name TEXT NOT NULL,
  description TEXT,
  long_description TEXT,
  category TEXT NOT NULL,                           -- templates, courses, ebooks, planners, coaching, other
  price_cents INTEGER NOT NULL,
  currency_code TEXT DEFAULT 'MXN',
  comparison_price_cents INTEGER,                   -- "antes de $X"
  images TEXT[] DEFAULT '{}',
  preview_images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  download_url TEXT,
  file_size TEXT,
  page_count INTEGER,
  lesson_count INTEGER,
  duration_minutes INTEGER,
  type TEXT DEFAULT 'digital',                      -- digital, course, coaching, physical
  status TEXT DEFAULT 'active',                     -- draft, active, paused, archived
  total_sales INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Marketplace sales (transactions)
CREATE TABLE IF NOT EXISTS yayika_marketplace_sales_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES yayika_profiles(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES yayika_seller_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES yayika_marketplace_products_v2(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  stripe_charge_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency_code TEXT DEFAULT 'MXN',
  platform_fee_cents INTEGER NOT NULL,
  seller_net_cents INTEGER NOT NULL,
  buyer_email TEXT,
  buyer_name TEXT,
  status TEXT DEFAULT 'pending',                    -- pending, completed, refunded, disputed, cancelled
  refund_amount_cents INTEGER DEFAULT 0,
  refund_reason TEXT,
  commission_paid BOOLEAN DEFAULT FALSE,           -- affiliate commission paid?
  affiliate_id UUID REFERENCES yayika_profiles(id),
  commission_amount_cents INTEGER DEFAULT 0,
  ip_address TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- 4. Seller balance (real-time balance tracking)
CREATE TABLE IF NOT EXISTS yayika_seller_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES yayika_seller_profiles(id) ON DELETE CASCADE UNIQUE,
  available_cents INTEGER DEFAULT 0,               -- Can withdraw now
  pending_cents INTEGER DEFAULT 0,                  -- In transit (Stripe holds)
  reserved_cents INTEGER DEFAULT 0,                 -- Held for refunds/disputes
  lifetime_earned_cents INTEGER DEFAULT 0,
  lifetime_paid_out_cents INTEGER DEFAULT 0,
  lifetime_platform_fees_cents INTEGER DEFAULT 0,
  lifetime_refunded_cents INTEGER DEFAULT 0,
  last_payout_at TIMESTAMPTZ,
  last_sale_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payout requests & history
CREATE TABLE IF NOT EXISTS yayika_payout_requests_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES yayika_seller_profiles(id) ON DELETE CASCADE,
  stripe_transfer_id TEXT,                          -- tr_xxxxx
  stripe_payout_id TEXT,                            -- po_xxxxx
  amount_cents INTEGER NOT NULL,
  currency_code TEXT DEFAULT 'MXN',
  fee_cents INTEGER DEFAULT 0,                      -- Stripe payout fee
  net_amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',                    -- pending, processing, completed, failed, cancelled
  payout_method TEXT DEFAULT 'bank_transfer',       -- bank_transfer, stripe_balance
  bank_last4 TEXT,
  bank_name TEXT,
  estimated_arrival DATE,
  failure_reason TEXT,
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Financial transactions ledger (immutable audit log)
CREATE TABLE IF NOT EXISTS yayika_financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES yayika_seller_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                               -- sale, payout, refund, dispute, adjustment, fee, commission
  direction TEXT NOT NULL,                          -- credit, debit
  amount_cents INTEGER NOT NULL,
  currency_code TEXT DEFAULT 'MXN',
  balance_after_cents INTEGER NOT NULL,
  reference_type TEXT,                              -- sale, payout_request, refund
  reference_id UUID,
  stripe_event_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Reviews
CREATE TABLE IF NOT EXISTS yayika_marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES yayika_marketplace_products_v2(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES yayika_seller_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, buyer_id)
);

-- 8. Payout schedule tracking
CREATE TABLE IF NOT EXISTS yayika_payout_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES yayika_seller_profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_sales_cents INTEGER DEFAULT 0,
  total_fees_cents INTEGER DEFAULT 0,
  total_platform_fees_cents INTEGER DEFAULT 0,
  net_payout_cents INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',                    -- pending, scheduled, processing, paid
  scheduled_payout_date DATE,
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user ON yayika_seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_stripe ON yayika_seller_profiles(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_mv2_seller ON yayika_marketplace_products_v2(seller_id);
CREATE INDEX IF NOT EXISTS idx_mv2_category ON yayika_marketplace_products_v2(category);
CREATE INDEX IF NOT EXISTS idx_mv2_status ON yayika_marketplace_products_v2(status);
CREATE INDEX IF NOT EXISTS idx_ms2_seller ON yayika_marketplace_sales_v2(seller_id);
CREATE INDEX IF NOT EXISTS idx_ms2_product ON yayika_marketplace_sales_v2(product_id);
CREATE INDEX IF NOT EXISTS idx_ms2_buyer ON yayika_marketplace_sales_v2(buyer_id);
CREATE INDEX IF NOT EXISTS idx_ms2_status ON yayika_marketplace_sales_v2(status);
CREATE INDEX IF NOT EXISTS idx_ms2_created ON yayika_marketplace_sales_v2(created_at);
CREATE INDEX IF NOT EXISTS idx_payout_requests_seller ON yayika_payout_requests_v2(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON yayika_payout_requests_v2(status);
CREATE INDEX IF NOT EXISTS idx_financial_tx_seller ON yayika_financial_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_financial_tx_type ON yayika_financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_tx_created ON yayika_financial_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON yayika_marketplace_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON yayika_marketplace_reviews(seller_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get seller dashboard summary
CREATE OR REPLACE FUNCTION yayika_seller_dashboard(p_user_id UUID)
RETURNS TABLE (
  seller_id UUID,
  display_name TEXT,
  account_status TEXT,
  total_products BIGINT,
  total_sales BIGINT,
  total_revenue_cents BIGINT,
  available_cents BIGINT,
  pending_cents BIGINT,
  reserved_cents BIGINT,
  platform_fee_percent DECIMAL,
  rating_avg DECIMAL,
  rating_count BIGINT,
  last_sale_at TIMESTAMPTZ,
  last_payout_at TIMESTAMPTZ,
  month_sales BIGINT,
  month_revenue_cents BIGINT
) AS $$
DECLARE
  v_seller_id UUID;
BEGIN
  SELECT sp.id INTO v_seller_id FROM yayika_seller_profiles sp WHERE sp.user_id = p_user_id;
  IF v_seller_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    sp.id,
    sp.display_name,
    sp.stripe_account_status,
    (SELECT COUNT(*) FROM yayika_marketplace_products_v2 mp WHERE mp.seller_id = v_seller_id AND mp.status = 'active'),
    sp.total_sales,
    sp.total_revenue_cents,
    COALESCE(sb.available_cents, 0),
    COALESCE(sb.pending_cents, 0),
    COALESCE(sb.reserved_cents, 0),
    sp.platform_fee_percent,
    sp.rating_avg,
    sp.rating_count,
    sb.last_sale_at,
    sb.last_payout_at,
    (SELECT COUNT(*) FROM yayika_marketplace_sales_v2 ms WHERE ms.seller_id = v_seller_id AND ms.status = 'completed' AND ms.created_at >= date_trunc('month', NOW())),
    (SELECT COALESCE(SUM(ms.amount_cents), 0) FROM yayika_marketplace_sales_v2 ms WHERE ms.seller_id = v_seller_id AND ms.status = 'completed' AND ms.created_at >= date_trunc('month', NOW()))
  FROM yayika_seller_profiles sp
  LEFT JOIN yayika_seller_balances sb ON sb.seller_id = sp.id
  WHERE sp.id = v_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get seller transactions with pagination
CREATE OR REPLACE FUNCTION yayika_seller_transactions(
  p_user_id UUID,
  p_type TEXT DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  direction TEXT,
  amount_cents INTEGER,
  balance_after_cents INTEGER,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ,
  product_name TEXT,
  buyer_email TEXT
) AS $$
DECLARE
  v_seller_id UUID;
BEGIN
  SELECT sp.id INTO v_seller_id FROM yayika_seller_profiles sp WHERE sp.user_id = p_user_id;
  IF v_seller_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    ft.id,
    ft.type,
    ft.direction,
    ft.amount_cents,
    ft.balance_after_cents,
    ft.description,
    ft.reference_id,
    ft.created_at,
    CASE WHEN ft.type = 'sale' THEN
      (SELECT mp.name FROM yayika_marketplace_products_v2 mp WHERE mp.id = ft.reference_id)
    ELSE NULL END,
    CASE WHEN ft.type = 'sale' THEN
      (SELECT ms.buyer_email FROM yayika_marketplace_sales_v2 ms WHERE ms.id = ft.reference_id)
    ELSE NULL END
  FROM yayika_financial_transactions ft
  WHERE ft.seller_id = v_seller_id
    AND (p_type IS NULL OR ft.type = p_type)
    AND (p_from IS NULL OR ft.created_at >= p_from)
    AND (p_to IS NULL OR ft.created_at <= p_to)
  ORDER BY ft.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get seller products with sales data
CREATE OR REPLACE FUNCTION yayika_seller_products(p_user_id UUID)
RETURNS TABLE (
  product_id UUID,
  name TEXT,
  category TEXT,
  price_cents INTEGER,
  total_sales BIGINT,
  total_revenue_cents BIGINT,
  rating_avg DECIMAL,
  rating_count BIGINT,
  view_count BIGINT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_seller_id UUID;
BEGIN
  SELECT sp.id INTO v_seller_id FROM yayika_seller_profiles sp WHERE sp.user_id = p_user_id;
  IF v_seller_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    mp.id,
    mp.name,
    mp.category,
    mp.price_cents,
    mp.total_sales,
    mp.total_revenue_cents,
    mp.rating_avg,
    mp.rating_count,
    mp.view_count,
    mp.status,
    mp.created_at
  FROM yayika_marketplace_products_v2 mp
  WHERE mp.seller_id = v_seller_id
  ORDER BY mp.total_revenue_cents DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process a sale and update balances
CREATE OR REPLACE FUNCTION yayika_process_marketplace_sale(
  p_seller_id UUID,
  p_product_id UUID,
  p_amount_cents INTEGER,
  p_stripe_session_id TEXT,
  p_buyer_email TEXT,
  p_buyer_name TEXT DEFAULT NULL,
  p_buyer_id UUID DEFAULT NULL,
  p_country_code TEXT DEFAULT 'MX',
  p_affiliate_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_platform_fee INTEGER;
  v_seller_net INTEGER;
  v_commission INTEGER;
  v_new_balance INTEGER;
  v_seller_record RECORD;
BEGIN
  -- Get seller info
  SELECT * INTO v_seller_record FROM yayika_seller_profiles WHERE id = p_seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller not found'; END IF;

  -- Calculate fees
  v_platform_fee := ROUND(p_amount_cents * v_seller_record.platform_fee_percent / 100);
  v_seller_net := p_amount_cents - v_platform_fee;
  v_commission := 0;

  -- Affiliate commission (10% of platform fee)
  IF p_affiliate_id IS NOT NULL THEN
    v_commission := ROUND(v_platform_fee * 0.10);
    v_platform_fee := v_platform_fee - v_commission;
    v_seller_net := p_amount_cents - v_platform_fee - v_commission;
  END IF;

  -- Create sale record
  INSERT INTO yayika_marketplace_sales_v2 (
    buyer_id, seller_id, product_id, stripe_session_id,
    amount_cents, platform_fee_cents, seller_net_cents,
    buyer_email, buyer_name, status, country_code,
    affiliate_id, commission_amount_cents, completed_at
  ) VALUES (
    p_buyer_id, p_seller_id, p_product_id, p_stripe_session_id,
    p_amount_cents, v_platform_fee, v_seller_net,
    p_buyer_email, p_buyer_name, 'completed', p_country_code,
    p_affiliate_id, v_commission, NOW()
  ) RETURNING id INTO v_sale_id;

  -- Update seller stats
  UPDATE yayika_seller_profiles SET
    total_sales = total_sales + 1,
    total_revenue_cents = total_revenue_cents + v_seller_net,
    updated_at = NOW()
  WHERE id = p_seller_id;

  -- Update product stats
  UPDATE yayika_marketplace_products_v2 SET
    total_sales = total_sales + 1,
    total_revenue_cents = total_revenue_cents + v_seller_net,
    updated_at = NOW()
  WHERE id = p_product_id;

  -- Update balance
  INSERT INTO yayika_seller_balances (seller_id, available_cents, last_sale_at)
  VALUES (p_seller_id, v_seller_net, NOW())
  ON CONFLICT (seller_id) DO UPDATE SET
    available_cents = yayika_seller_balances.available_cents + v_seller_net,
    pending_cents = yayika_seller_balances.pending_cents + v_platform_fee,
    lifetime_earned_cents = yayika_seller_balances.lifetime_earned_cents + p_amount_cents,
    lifetime_platform_fees_cents = yayika_seller_balances.lifetime_platform_fees_cents + v_platform_fee,
    last_sale_at = NOW(),
    updated_at = NOW();

  -- Get new balance for ledger
  SELECT available_cents INTO v_new_balance FROM yayika_seller_balances WHERE seller_id = p_seller_id;

  -- Record in ledger
  INSERT INTO yayika_financial_transactions (
    seller_id, type, direction, amount_cents, balance_after_cents,
    reference_type, reference_id, description, metadata
  ) VALUES (
    p_seller_id, 'sale', 'credit', v_seller_net, v_new_balance,
    'sale', v_sale_id, 'Venta de producto',
    jsonb_build_object('product_id', p_product_id, 'buyer_email', p_buyer_email, 'platform_fee', v_platform_fee)
  );

  -- Process affiliate if exists
  IF p_affiliate_id IS NOT NULL AND v_commission > 0 THEN
    INSERT INTO yayika_financial_transactions (
      seller_id, type, direction, amount_cents, balance_after_cents,
      reference_type, reference_id, description
    ) VALUES (
      p_seller_id, 'commission', 'debit', v_commission, v_new_balance,
      'sale', v_sale_id, 'Comisión de afiliada'
    );
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Request a payout
CREATE OR REPLACE FUNCTION yayika_request_payout(
  p_user_id UUID,
  p_amount_cents INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_seller_id UUID;
  v_available INTEGER;
  v_request_id UUID;
  v_new_balance INTEGER;
BEGIN
  SELECT sp.id, sb.available_cents INTO v_seller_id, v_available
  FROM yayika_seller_profiles sp
  JOIN yayika_seller_balances sb ON sb.seller_id = sp.id
  WHERE sp.user_id = p_user_id;

  IF v_seller_id IS NULL THEN RAISE EXCEPTION 'Seller profile not found'; END IF;
  IF p_amount_cents <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_amount_cents > v_available THEN RAISE EXCEPTION 'Insufficient balance. Available: %', v_available; END IF;

  -- Check minimum payout
  IF p_amount_cents < (SELECT minimum_payout_cents FROM yayika_seller_profiles WHERE id = v_seller_id) THEN
    RAISE EXCEPTION 'Below minimum payout amount';
  END IF;

  -- Create payout request
  INSERT INTO yayika_payout_requests_v2 (seller_id, amount_cents, net_amount_cents, status)
  VALUES (v_seller_id, p_amount_cents, p_amount_cents, 'pending')
  RETURNING id INTO v_request_id;

  -- Deduct from available balance
  UPDATE yayika_seller_balances SET
    available_cents = available_cents - p_amount_cents,
    reserved_cents = reserved_cents + p_amount_cents,
    updated_at = NOW()
  WHERE seller_id = v_seller_id;

  SELECT available_cents INTO v_new_balance FROM yayika_seller_balances WHERE seller_id = v_seller_id;

  -- Record in ledger
  INSERT INTO yayika_financial_transactions (
    seller_id, type, direction, amount_cents, balance_after_cents,
    reference_type, reference_id, description
  ) VALUES (
    v_seller_id, 'payout', 'debit', p_amount_cents, v_new_balance,
    'payout_request', v_request_id, 'Solicitud de retiro'
  );

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE yayika_seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_marketplace_products_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_marketplace_sales_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_seller_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_payout_requests_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_payout_schedule ENABLE ROW LEVEL SECURITY;

-- seller_profiles
CREATE POLICY "Sellers can view own profile" ON yayika_seller_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Sellers can update own profile" ON yayika_seller_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active sellers" ON yayika_seller_profiles FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Service role manages sellers" ON yayika_seller_profiles FOR ALL USING (auth.role() = 'service_role');

-- marketplace products v2
CREATE POLICY "Anyone can view active products" ON yayika_marketplace_products_v2 FOR SELECT USING (status = 'active');
CREATE POLICY "Sellers can view own products" ON yayika_marketplace_products_v2 FOR SELECT USING (
  seller_id IN (SELECT id FROM yayika_seller_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Sellers can manage own products" ON yayika_marketplace_products_v2 FOR ALL USING (
  seller_id IN (SELECT id FROM yayika_seller_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages products" ON yayika_marketplace_products_v2 FOR ALL USING (auth.role() = 'service_role');

-- sales v2
CREATE POLICY "Sellers can view own sales" ON yayika_marketplace_sales_v2 FOR SELECT USING (
  seller_id IN (SELECT id FROM yayika_seller_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Buyers can view own purchases" ON yayika_marketplace_sales_v2 FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Service role manages sales" ON yayika_marketplace_sales_v2 FOR ALL USING (auth.role() = 'service_role');

-- balances
CREATE POLICY "Sellers can view own balance" ON yayika_seller_balances FOR SELECT USING (
  seller_id IN (SELECT id FROM yayika_seller_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages balances" ON yayika_seller_balances FOR ALL USING (auth.role() = 'service_role');

-- payout requests
CREATE POLICY "Sellers can view own payouts" ON yayika_payout_requests_v2 FOR SELECT USING (
  seller_id IN (SELECT id FROM yayika_seller_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Sellers can create own payouts" ON yayika_payout_requests_v2 FOR INSERT WITH CHECK (
  seller_id IN (SELECT id FROM yayika_seller_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages payouts" ON yayika_payout_requests_v2 FOR ALL USING (auth.role() = 'service_role');

-- financial transactions
CREATE POLICY "Sellers can view own transactions" ON yayika_financial_transactions FOR SELECT USING (
  seller_id IN (SELECT id FROM yayika_seller_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages transactions" ON yayika_financial_transactions FOR ALL USING (auth.role() = 'service_role');

-- reviews
CREATE POLICY "Anyone can view reviews" ON yayika_marketplace_reviews FOR SELECT USING (is_visible = TRUE);
CREATE POLICY "Buyers can create reviews" ON yayika_marketplace_reviews FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can update own reviews" ON yayika_marketplace_reviews FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "Service role manages reviews" ON yayika_marketplace_reviews FOR ALL USING (auth.role() = 'service_role');

-- payout schedule
CREATE POLICY "Sellers can view own schedule" ON yayika_payout_schedule FOR SELECT USING (
  seller_id IN (SELECT id FROM yayika_seller_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages schedule" ON yayika_payout_schedule FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SEED: Create seller profile for Laura (test)
-- ============================================================
DO $$
DECLARE
  v_user_id UUID;
  v_seller_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM yayika_profiles WHERE email = 'laura@yayika.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO yayika_seller_profiles (user_id, display_name, bio, category, country_code, currency_code, is_active, stripe_account_status)
    VALUES (v_user_id, 'Laura Yayika', 'Creadora de Yayika. Productos para mujeres que quieren más.', 'wellness', 'MX', 'MXN', TRUE, 'pending')
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO v_seller_id;

    IF v_seller_id IS NOT NULL THEN
      INSERT INTO yayika_seller_balances (seller_id)
      VALUES (v_seller_id)
      ON CONFLICT (seller_id) DO NOTHING;
    END IF;
  END IF;
END $$;
