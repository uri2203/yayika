-- ============================================================
-- Yayika — Retention V2 Schema
-- Badges, Financial Tracker, Cycle Predictions, Freeze Tokens
-- Execute in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ============================================================
-- 1. BADGES (Gamification System)
-- ============================================================

CREATE TABLE IF NOT EXISTS yayika_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,        -- e.g. 'streak_7', 'first_checkin', 'cycle_master'
  badge_name TEXT NOT NULL,       -- e.g. '🔥 7-Day Streak'
  badge_desc TEXT,                -- e.g. 'Completed 7 consecutive days'
  badge_icon TEXT DEFAULT '🏅',   -- emoji icon
  badge_tier TEXT DEFAULT 'bronze' CHECK (badge_tier IN ('bronze', 'silver', 'gold', 'diamond')),
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE yayika_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges" ON yayika_badges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON yayika_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. FINANCIAL TRACKER
-- ============================================================

-- Presupuesto mensual del usuario
CREATE TABLE IF NOT EXISTS yayika_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,        -- '2026-07' format
  monthly_income DECIMAL(10,2) DEFAULT 0,
  needs_pct INT DEFAULT 50,      -- percentage for needs
  wants_pct INT DEFAULT 30,      -- percentage for wants
  savings_pct INT DEFAULT 20,    -- percentage for savings
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month_key)
);

ALTER TABLE yayika_budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own budget" ON yayika_budget FOR ALL USING (auth.uid() = user_id);

-- Registro de gastos/ingresos
CREATE TABLE IF NOT EXISTS yayika_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('expense', 'income', 'transfer')),
  category TEXT NOT NULL,         -- 'food', 'transport', 'salary', 'freelance', etc.
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  tx_date DATE DEFAULT CURRENT_DATE,
  month_key TEXT NOT NULL,        -- '2026-07' for fast filtering
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE yayika_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own transactions" ON yayika_transactions FOR ALL USING (auth.uid() = user_id);

-- Metas de ahorro
CREATE TABLE IF NOT EXISTS yayika_savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,        -- 'Fondo de emergencia', 'Vacaciones'
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  goal_icon TEXT DEFAULT '💰',
  deadline DATE,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE yayika_savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own savings goals" ON yayika_savings_goals FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 3. CYCLE PREDICTIONS (Enhanced)
-- ============================================================

CREATE TABLE IF NOT EXISTS yayika_cycle_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,  -- 'next_period', 'ovulation', 'phase_start'
  predicted_date DATE NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.8, -- 0.0 to 1.0
  based_on_cycles INT DEFAULT 1,  -- how many cycles used for prediction
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, prediction_type, predicted_date)
);

ALTER TABLE yayika_cycle_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own predictions" ON yayika_cycle_predictions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON yayika_cycle_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON yayika_cycle_predictions
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 4. FREEZE TOKENS (Streak Protection)
-- ============================================================

-- Token de congelación de racha
ALTER TABLE yayika_progress ADD COLUMN IF NOT EXISTS freeze_tokens INT DEFAULT 1;
ALTER TABLE yayika_progress ADD COLUMN IF NOT EXISTS total_freezes_used INT DEFAULT 0;

-- Historial de uso de freezes
CREATE TABLE IF NOT EXISTS yayika_freeze_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  used_date DATE NOT NULL,
  streak_before INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE yayika_freeze_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own freeze log" ON yayika_freeze_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own freeze log" ON yayika_freeze_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. COURSE NOTES & BOOKMARKS
-- ============================================================

CREATE TABLE IF NOT EXISTS yayika_course_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  module_number INT NOT NULL CHECK (module_number BETWEEN 1 AND 5),
  lesson_number INT NOT NULL,
  note_text TEXT NOT NULL,
  timestamp_seconds INT,         -- position in video when note was taken
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE yayika_course_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notes" ON yayika_course_notes FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS yayika_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  module_number INT NOT NULL,
  lesson_number INT NOT NULL,
  lesson_title TEXT,
  bookmark_type TEXT DEFAULT 'lesson' CHECK (bookmark_type IN ('lesson', 'timestamp', 'exercise')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_number, lesson_number, bookmark_type)
);

ALTER TABLE yayika_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bookmarks" ON yayika_bookmarks FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 6. USER PREFERENCES (Language, Notifications, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS yayika_user_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE UNIQUE,
  preferred_lang TEXT DEFAULT 'es',
  notifications_enabled BOOLEAN DEFAULT true,
  notification_time TIME DEFAULT '20:00:00',  -- 8pm peak for wellness
  dark_mode BOOLEAN DEFAULT false,
  cycle_reminder BOOLEAN DEFAULT true,
  challenge_reminder BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE yayika_user_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own prefs" ON yayika_user_prefs FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS: Badge Award System
-- ============================================================

CREATE OR REPLACE FUNCTION yayika_award_badge(
  p_user_id UUID,
  p_badge_key TEXT,
  p_badge_name TEXT,
  p_badge_desc TEXT,
  p_badge_icon TEXT,
  p_badge_tier TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO yayika_badges (user_id, badge_key, badge_name, badge_desc, badge_icon, badge_tier)
  VALUES (p_user_id, p_badge_key, p_badge_name, p_badge_desc, p_badge_icon, p_badge_tier)
  ON CONFLICT (user_id, badge_key) DO NOTHING;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTIONS: Use Freeze Token
-- ============================================================

CREATE OR REPLACE FUNCTION yayika_use_freeze(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  tokens INT;
  current_streak INT;
BEGIN
  SELECT freeze_tokens, streak_days INTO tokens, current_streak
  FROM yayika_progress WHERE user_id = p_user_id;

  IF tokens IS NULL OR tokens <= 0 THEN
    RETURN 'NO_TOKENS';
  END IF;

  -- Use freeze token
  UPDATE yayika_progress
  SET freeze_tokens = freeze_tokens - 1,
      total_freezes_used = total_freezes_used + 1,
      last_active_date = CURRENT_DATE,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the freeze usage
  INSERT INTO yayika_freeze_log (user_id, used_date, streak_before)
  VALUES (p_user_id, CURRENT_DATE, current_streak);

  RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTIONS: Calculate Cycle Predictions
-- ============================================================

CREATE OR REPLACE FUNCTION yayika_calculate_predictions(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  last_period DATE;
  cycle_length INT := 28;
  period_length INT := 5;
  next_period DATE;
  ovulation_date DATE;
  i INT;
BEGIN
  -- Find last period start (intense flow day)
  SELECT log_date INTO last_period
  FROM yayika_cycle_log
  WHERE user_id = p_user_id AND flow_intensity = 3
  ORDER BY log_date DESC LIMIT 1;

  IF last_period IS NULL THEN
    RETURN;
  END IF;

  -- Try to calculate average cycle length from historical data
  WITH period_starts AS (
    SELECT log_date, ROW_NUMBER() OVER (ORDER BY log_date) as rn
    FROM yayika_cycle_log
    WHERE user_id = p_user_id AND flow_intensity = 3
    ORDER BY log_date
  ),
  cycle_lengths AS (
    SELECT EXTRACT(DAY FROM p2.log_date - p1.log_date) as length
    FROM period_starts p1
    JOIN period_starts p2 ON p2.rn = p1.rn + 1
  )
  SELECT ROUND(AVG(length))::INT INTO cycle_length
  FROM cycle_lengths WHERE length BETWEEN 20 AND 45;

  IF cycle_length IS NULL OR cycle_length < 20 THEN
    cycle_length := 28;
  END IF;

  -- Generate next 6 predictions
  FOR i IN 1..6 LOOP
    next_period := last_period + (cycle_length * i);
    ovulation_date := next_period - INTERVAL '14 days';

    -- Next period prediction
    INSERT INTO yayika_cycle_predictions (user_id, prediction_type, predicted_date, confidence, based_on_cycles)
    VALUES (p_user_id, 'next_period', next_period, 0.7 + (i * 0.05), i)
    ON CONFLICT (user_id, prediction_type, predicted_date) DO NOTHING;

    -- Ovulation prediction
    INSERT INTO yayika_cycle_predictions (user_id, prediction_type, predicted_date, confidence, based_on_cycles)
    VALUES (p_user_id, 'ovulation', ovulation_date, 0.7 + (i * 0.05), i)
    ON CONFLICT (user_id, prediction_type, predicted_date) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
