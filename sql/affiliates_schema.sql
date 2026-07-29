-- ============================================================
-- Yayika — Affiliate System Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. AFFILIATES TABLE
CREATE TABLE IF NOT EXISTS yayika_affiliates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  ref_code TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  level TEXT DEFAULT 'standard', -- standard, silver, gold
  commission_pct DECIMAL(5,2) DEFAULT 30.00,
  is_founder BOOLEAN DEFAULT false,
  lang TEXT DEFAULT 'es',
  active_referrals INT DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  pending_payout DECIMAL(10,2) DEFAULT 0.00,
  paid_out DECIMAL(10,2) DEFAULT 0.00,
  payout_method TEXT DEFAULT 'bank', -- bank, paypal
  payout_details TEXT DEFAULT '{}', -- JSON: bank account, paypal email, etc.
  status TEXT DEFAULT 'active', -- active, paused, banned
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. REFERRALS TABLE (tracks who was referred by whom)
CREATE TABLE IF NOT EXISTS yayika_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES yayika_affiliates(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  referred_email TEXT NOT NULL,
  referral_source TEXT DEFAULT 'link', -- link, code, email
  status TEXT DEFAULT 'pending', -- pending, converted, expired
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. COMMISSIONS TABLE (tracks each commission earned)
CREATE TABLE IF NOT EXISTS yayika_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES yayika_affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_id UUID REFERENCES yayika_referrals(id) ON DELETE SET NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sale_amount DECIMAL(10,2) NOT NULL,
  commission_pct DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  product_type TEXT NOT NULL, -- product, membership_semilla, membership_guerrera, membership_diamante
  product_name TEXT DEFAULT '',
  stripe_payment_id TEXT DEFAULT '',
  status TEXT DEFAULT 'pending', -- pending, approved, paid, rejected
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PAYOUTS TABLE (tracks bulk payout batches)
CREATE TABLE IF NOT EXISTS yayika_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES yayika_affiliates(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payout_method TEXT DEFAULT 'bank',
  payout_details TEXT DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  stripe_transfer_id TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. AFFILIATE LINK CLICKS (for analytics)
CREATE TABLE IF NOT EXISTS yayika_link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES yayika_affiliates(id) ON DELETE CASCADE NOT NULL,
  ref_code TEXT NOT NULL,
  clicked_url TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_affiliates_user ON yayika_affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_ref_code ON yayika_affiliates(ref_code);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON yayika_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON yayika_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON yayika_commissions(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON yayika_commissions(status);
CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON yayika_payouts(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_clicks_affiliate ON yayika_link_clicks(affiliate_id, created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE yayika_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_link_clicks ENABLE ROW LEVEL SECURITY;

-- Affiliates: users can read their own, admins can read all
CREATE POLICY "Affiliates read own" ON yayika_affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Affiliates insert own" ON yayika_affiliates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Affiliates update own" ON yayika_affiliates FOR UPDATE USING (auth.uid() = user_id);

-- Referrals: affiliates can see referrals they generated
CREATE POLICY "Referrals read own" ON yayika_referrals FOR SELECT USING (
  affiliate_id IN (SELECT id FROM yayika_affiliates WHERE user_id = auth.uid())
);
CREATE POLICY "Referrals insert system" ON yayika_referrals FOR INSERT WITH CHECK (true);

-- Commissions: affiliates read their own
CREATE POLICY "Commissions read own" ON yayika_commissions FOR SELECT USING (
  affiliate_id IN (SELECT id FROM yayika_affiliates WHERE user_id = auth.uid())
);
CREATE POLICY "Commissions insert system" ON yayika_commissions FOR INSERT WITH CHECK (true);

-- Payouts: affiliates read their own
CREATE POLICY "Payouts read own" ON yayika_payouts FOR SELECT USING (
  affiliate_id IN (SELECT id FROM yayika_affiliates WHERE user_id = auth.uid())
);

-- Link clicks: system can insert
CREATE POLICY "Clicks insert system" ON yayika_link_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Clicks read own" ON yayika_link_clicks FOR SELECT USING (
  affiliate_id IN (SELECT id FROM yayika_affiliates WHERE user_id = auth.uid())
);

-- ============================================================
-- FUNCTION: Generate unique referral code
-- ============================================================
CREATE OR REPLACE FUNCTION yayika_generate_ref_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'YKI-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM yayika_affiliates WHERE ref_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Process a referral (called when referred user subscribes)
-- ============================================================
CREATE OR REPLACE FUNCTION yayika_process_referral(
  p_ref_code TEXT,
  p_referred_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_affiliate_id UUID;
  v_referral_id UUID;
BEGIN
  -- Find affiliate
  SELECT id INTO v_affiliate_id FROM yayika_affiliates WHERE ref_code = p_ref_code AND status = 'active';
  IF v_affiliate_id IS NULL THEN RETURN 'INVALID_CODE'; END IF;
  
  -- Check not self-referral
  IF EXISTS(SELECT 1 FROM yayika_affiliates WHERE user_id = p_referred_user_id) THEN
    RETURN 'SELF_REFERRAL';
  END IF;
  
  -- Check not already referred
  IF EXISTS(SELECT 1 FROM yayika_referrals WHERE referred_user_id = p_referred_user_id) THEN
    RETURN 'ALREADY_REFERRED';
  END IF;
  
  -- Create referral
  INSERT INTO yayika_referrals (affiliate_id, referred_user_id, referred_email, status)
  VALUES (v_affiliate_id, p_referred_user_id, 
    (SELECT email FROM auth.users WHERE id = p_referred_user_id),
    'pending')
  RETURNING id INTO v_referral_id;
  
  -- Update affiliate referral count
  UPDATE yayika_affiliates SET active_referrals = active_referrals + 1, updated_at = now() WHERE id = v_affiliate_id;
  
  RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Record commission (called on successful payment)
-- ============================================================
CREATE OR REPLACE FUNCTION yayika_record_commission(
  p_affiliate_id UUID,
  p_referred_user_id UUID,
  p_sale_amount DECIMAL,
  p_product_type TEXT,
  p_product_name TEXT DEFAULT '',
  p_stripe_payment_id TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  v_commission_id UUID;
  v_commission_pct DECIMAL;
  v_commission_amount DECIMAL;
  v_referral_id UUID;
BEGIN
  -- Get commission percentage
  SELECT commission_pct INTO v_commission_pct FROM yayika_affiliates WHERE id = p_affiliate_id;
  IF v_commission_pct IS NULL OR v_commission_pct <= 0 THEN v_commission_pct := 30.00; END IF;
  
  -- Calculate commission
  v_commission_amount := ROUND(p_sale_amount * (v_commission_pct / 100), 2);
  
  -- Find the referral
  SELECT id INTO v_referral_id FROM yayika_referrals 
  WHERE affiliate_id = p_affiliate_id AND referred_user_id = p_referred_user_id;
  
  -- Create commission record
  INSERT INTO yayika_commissions (
    affiliate_id, referral_id, referred_user_id,
    sale_amount, commission_pct, commission_amount,
    product_type, product_name, stripe_payment_id, status
  ) VALUES (
    p_affiliate_id, v_referral_id, p_referred_user_id,
    p_sale_amount, v_commission_pct, v_commission_amount,
    p_product_type, p_product_name, p_stripe_payment_id, 'approved'
  ) RETURNING id INTO v_commission_id;
  
  -- Update referral status
  UPDATE yayika_referrals SET status = 'converted', converted_at = now() WHERE id = v_referral_id;
  
  -- Update affiliate totals
  UPDATE yayika_affiliates SET
    total_earned = total_earned + v_commission_amount,
    pending_payout = pending_payout + v_commission_amount,
    updated_at = now()
  WHERE id = p_affiliate_id;
  
  RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Request payout
-- ============================================================
CREATE OR REPLACE FUNCTION yayika_request_payout(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS TEXT AS $$
DECLARE
  v_affiliate_id UUID;
  v_pending DECIMAL;
  v_payout_id UUID;
  v_details JSONB;
BEGIN
  SELECT id, pending_payout, payout_details::jsonb 
  INTO v_affiliate_id, v_pending, v_details
  FROM yayika_affiliates WHERE user_id = p_user_id AND status = 'active';
  
  IF v_affiliate_id IS NULL THEN RETURN 'NOT_AFFILIATE'; END IF;
  IF p_amount > v_pending THEN RETURN 'INSUFFICIENT'; END IF;
  IF p_amount < 50 THEN RETURN 'MINIMUM_50'; END IF;
  
  -- Create payout request
  INSERT INTO yayika_payouts (affiliate_id, amount, payout_method, payout_details, status)
  VALUES (v_affiliate_id, p_amount, 
    COALESCE(v_details->>'method', 'bank'),
    v_details::text, 'pending')
  RETURNING id INTO v_payout_id;
  
  -- Deduct from pending
  UPDATE yayika_affiliates SET 
    pending_payout = pending_payout - p_amount,
    updated_at = now()
  WHERE id = v_affiliate_id;
  
  -- Mark commissions as paid
  UPDATE yayika_commissions SET status = 'paid', paid_at = now()
  WHERE affiliate_id = v_affiliate_id AND status = 'approved'
  AND id IN (
    SELECT id FROM yayika_commissions 
    WHERE affiliate_id = v_affiliate_id AND status = 'approved'
    ORDER BY created_at 
    LIMIT (SELECT CEIL(p_amount / commission_amount)::INT FROM yayika_commissions WHERE affiliate_id = v_affiliate_id AND status = 'approved' LIMIT 1)
  );
  
  RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEW: Affiliate dashboard stats
-- ============================================================
CREATE OR REPLACE VIEW yayika_affiliate_stats AS
SELECT
  a.id AS affiliate_id,
  a.user_id,
  a.ref_code,
  a.total_earned,
  a.pending_payout,
  a.paid_out,
  a.active_referrals,
  a.commission_pct,
  (SELECT COUNT(*) FROM yayika_commissions c WHERE c.affiliate_id = a.id AND c.status = 'approved') AS pending_commissions,
  (SELECT COUNT(*) FROM yayika_commissions c WHERE c.affiliate_id = a.id AND c.status = 'paid') AS paid_commissions,
  (SELECT COALESCE(SUM(c.commission_amount), 0) FROM yayika_commissions c WHERE c.affiliate_id = a.id AND c.created_at >= date_trunc('month', now())) AS this_month_earned,
  (SELECT COUNT(*) FROM yayika_link_clicks cl WHERE cl.affiliate_id = a.id) AS total_clicks,
  (SELECT COUNT(*) FROM yayika_link_clicks cl WHERE cl.affiliate_id = a.id AND cl.converted = true) AS converted_clicks
FROM yayika_affiliates a;
