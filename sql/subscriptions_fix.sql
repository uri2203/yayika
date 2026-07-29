-- Yayika — Add missing columns to yayika_subscriptions
ALTER TABLE yayika_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT '';
ALTER TABLE yayika_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT '';
ALTER TABLE yayika_subscriptions ADD COLUMN IF NOT EXISTS stripe_session_id TEXT DEFAULT '';
ALTER TABLE yayika_subscriptions ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE yayika_subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE yayika_subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Add RLS policies for subscriptions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own subscription' AND tablename = 'yayika_subscriptions') THEN
    CREATE POLICY "Users can view own subscription" ON yayika_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own subscription' AND tablename = 'yayika_subscriptions') THEN
    CREATE POLICY "Users can update own subscription" ON yayika_subscriptions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
