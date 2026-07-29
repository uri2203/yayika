-- Yayika — AI Cycle Coach table
-- Stores daily coaching generated for each user

CREATE TABLE IF NOT EXISTS yayika_cycle_coaching (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coaching_text TEXT NOT NULL,
  cycle_phase TEXT,
  cycle_day INTEGER,
  energy_level INTEGER,
  mood TEXT,
  symptoms TEXT[] DEFAULT '{}',
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, generated_date)
);

-- RLS: Users can only read their own coaching
ALTER TABLE yayika_cycle_coaching ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own coaching" ON yayika_cycle_coaching
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own coaching" ON yayika_cycle_coaching
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own coaching" ON yayika_cycle_coaching
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_cycle_coaching_user_date 
  ON yayika_cycle_coaching(user_id, generated_date DESC);
