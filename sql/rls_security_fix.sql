-- YAYIKA SECURITY AUDIT - RLS POLICY FIXES
-- Date: 2026-07-29
-- Fixes 12 tables with missing or overly permissive RLS policies

-- 1. yayika_activity_log: Remove PUBLIC READ
DROP POLICY IF EXISTS "Anyone can view activity" ON yayika_activity_log;
DROP POLICY IF EXISTS "Users can view own activity" ON yayika_activity_log;
DROP POLICY IF EXISTS "Users can insert own activity" ON yayika_activity_log;
DROP POLICY IF EXISTS "Service role full access activity_log" ON yayika_activity_log;
CREATE POLICY "Users can view own activity" ON yayika_activity_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON yayika_activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access activity_log" ON yayika_activity_log
  FOR ALL USING (auth.role() = 'service_role');

-- 2. yayika_affiliates: Add user_id check to INSERT
DROP POLICY IF EXISTS "Affiliates insert own" ON yayika_affiliates;
CREATE POLICY "Affiliates insert own" ON yayika_affiliates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. yayika_badges: Add user_id check to INSERT
DROP POLICY IF EXISTS "Users can insert own badges" ON yayika_badges;
CREATE POLICY "Users can insert own badges" ON yayika_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4-11 already fixed (budget, transactions, savings, bookmarks, notes, prefs, cycle, mood)

-- 12. yayika_daily_checks: Fix duplicate
DROP POLICY IF EXISTS "Users can manage own checks" ON yayika_daily_checks;
DROP POLICY IF EXISTS "Users can view own checks" ON yayika_daily_checks;
DROP POLICY IF EXISTS "Users can insert own checks" ON yayika_daily_checks;
DROP POLICY IF EXISTS "Users can update own checks" ON yayika_daily_checks;
DROP POLICY IF EXISTS "Service role full access checks" ON yayika_daily_checks;
CREATE POLICY "Users can view own checks" ON yayika_daily_checks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checks" ON yayika_daily_checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checks" ON yayika_daily_checks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access checks" ON yayika_daily_checks
  FOR ALL USING (auth.role() = 'service_role');
