-- ============================================================
-- Yayika — Fixes (2026-07-28)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Add missing columns to yayika_progress
ALTER TABLE yayika_progress ADD COLUMN IF NOT EXISTS freeze_tokens INT DEFAULT 1;
ALTER TABLE yayika_progress ADD COLUMN IF NOT EXISTS total_freezes_used INT DEFAULT 0;

-- 2. Add missing RLS policy for yayika_module_completions (needed for upsert UPDATE)
CREATE POLICY "Users can update own completions" ON yayika_module_completions
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Add critical indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON yayika_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_date ON yayika_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circle_members_user ON yayika_circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON yayika_circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_circle ON yayika_circle_messages(circle_id, created_at);
CREATE INDEX IF NOT EXISTS idx_badges_user ON yayika_badges(user_id, earned_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON yayika_transactions(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON yayika_transactions(tx_date);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON yayika_savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_predictions_user ON yayika_cycle_predictions(user_id, predicted_date);
CREATE INDEX IF NOT EXISTS idx_freeze_log_user ON yayika_freeze_log(user_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_user ON yayika_course_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON yayika_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checks_user ON yayika_daily_checks(user_id, check_date);
CREATE INDEX IF NOT EXISTS idx_daily_mood_user ON yayika_daily_mood(user_id, check_date);
CREATE INDEX IF NOT EXISTS idx_cycle_log_user ON yayika_cycle_log(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_budget_user ON yayika_budget(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_circles_created ON yayika_circles(created_by);
CREATE INDEX IF NOT EXISTS idx_module_completions_user ON yayika_module_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON yayika_progress(user_id);

-- 4. Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'yayika_progress'
  AND column_name IN ('freeze_tokens', 'total_freezes_used')
ORDER BY column_name;
