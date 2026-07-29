-- Yayika — Daily Affirmations table
CREATE TABLE IF NOT EXISTS yayika_daily_affirmations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affirmation_text TEXT NOT NULL,
  affirmation_type TEXT DEFAULT 'phase',
  cycle_phase TEXT,
  energy_level INTEGER,
  mood TEXT,
  affirmation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, affirmation_date)
);

ALTER TABLE yayika_daily_affirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own affirmations" ON yayika_daily_affirmations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own affirmations" ON yayika_daily_affirmations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own affirmations" ON yayika_daily_affirmations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_affirmations_user_date
  ON yayika_daily_affirmations(user_id, affirmation_date DESC);
