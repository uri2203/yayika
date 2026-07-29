-- Yayika — Weekly Digests table
CREATE TABLE IF NOT EXISTS yayika_weekly_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE yayika_weekly_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own digests" ON yayika_weekly_digests
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_digests_user ON yayika_weekly_digests(user_id, sent_at DESC);
