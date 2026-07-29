-- Yayika — Push Notifications & Subscriptions

CREATE TABLE IF NOT EXISTS yayika_push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE yayika_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON yayika_push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS yayika_push_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_title TEXT NOT NULL,
  notification_body TEXT NOT NULL,
  notification_type TEXT DEFAULT 'phase',
  notification_icon TEXT DEFAULT '💜',
  cycle_phase TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE yayika_push_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON yayika_push_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_notifications_user ON yayika_push_notifications(user_id, sent_at DESC);
