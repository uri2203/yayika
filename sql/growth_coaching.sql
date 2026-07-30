-- ============================================================
-- Yayika — Growth Coaching System (Impulso)
-- Competitive motivation, cycle-aware timing, leaderboards
-- ============================================================

-- 1. Activity Log (tracks all competitive events)
CREATE TABLE IF NOT EXISTS yayika_growth_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL, -- 'referral_signup', 'commission_earned', 'level_up', 'badge_earned', 'share_click', 'challenge_completed'
  metadata JSONB DEFAULT '{}', -- flexible data: { referred_name, amount, badge_name, challenge_id, etc }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_activity_user ON yayika_growth_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_activity_type ON yayika_growth_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_growth_activity_created ON yayika_growth_activity(created_at DESC);

-- 2. Messages Log (tracks all messages sent to users)
CREATE TABLE IF NOT EXISTS yayika_growth_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL, -- 'push', 'email', 'toast', 'banner', 'widget'
  message_type TEXT NOT NULL, -- 'competition', 'social_proof', 'urgency', 'milestone', 'reengagement', 'cycle_tip'
  title TEXT DEFAULT '',
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- { rank, referrals_count, earnings, cycle_phase, etc }
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_growth_messages_user ON yayika_growth_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_messages_sent ON yayika_growth_messages(sent_at DESC);

-- 3. Weekly Challenges
CREATE TABLE IF NOT EXISTS yayika_growth_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'referrals', 'shares', 'earnings'
  target_value INT NOT NULL, -- e.g., 3 referrals, 10 shares, $50 earned
  bonus_xp INT DEFAULT 0,
  bonus_commission_pct DECIMAL(5,2) DEFAULT 0, -- extra commission % during challenge
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Challenge Progress
CREATE TABLE IF NOT EXISTS yayika_growth_user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES yayika_growth_challenges(id) ON DELETE CASCADE NOT NULL,
  current_value INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  bonus_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- 5. Re-engagement tracking
CREATE TABLE IF NOT EXISTS yayika_growth_reengagement (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  days_inactive INT NOT NULL, -- 7, 14, 21, 30
  message_sent TEXT NOT NULL,
  reactivated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Get user's leaderboard position
CREATE OR REPLACE FUNCTION yayika_get_leaderboard_position(p_user_id UUID)
RETURNS TABLE(
  user_position INT,
  total_affiliates INT,
  user_referrals INT,
  user_earnings DECIMAL(10,2),
  top_3 JSONB
) AS $$
DECLARE
  v_user_referrals INT;
  v_user_earnings DECIMAL(10,2);
BEGIN
  -- Get user's stats
  SELECT COALESCE(active_referrals, 0), COALESCE(total_earned, 0)
  INTO v_user_referrals, v_user_earnings
  FROM yayika_affiliates WHERE user_id = p_user_id;

  -- Get position by total_earned
  SELECT COUNT(*) + 1 INTO user_position
  FROM yayika_affiliates
  WHERE total_earned > v_user_earnings AND status = 'active';

  SELECT COUNT(*) INTO total_affiliates
  FROM yayika_affiliates WHERE status = 'active';

  user_referrals := v_user_referrals;
  user_earnings := v_user_earnings;

  -- Get top 3
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name', COALESCE(full_name, split_part(email, '@', 1)),
        'earnings', total_earned,
        'referrals', active_referrals,
        'level', level
      ) ORDER BY total_earned DESC
    ),
    '[]'::jsonb
  ) INTO top_3
  FROM (
    SELECT full_name, email, total_earned, active_referrals, level
    FROM yayika_affiliates
    WHERE status = 'active' AND total_earned > 0
    ORDER BY total_earned DESC
    LIMIT 3
  ) t;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get competitive stats for a user
CREATE OR REPLACE FUNCTION yayika_get_competitive_stats(p_user_id UUID)
RETURNS TABLE(
  my_referrals INT,
  my_earnings DECIMAL(10,2),
  my_level TEXT,
  my_rank INT,
  avg_referrals DECIMAL(5,1),
  top_earner_name TEXT,
  top_earner_amount DECIMAL(10,2),
  new_this_week INT,
  active_this_week INT,
  my_clicks INT,
  my_converted_clicks INT,
  conversion_rate DECIMAL(5,1),
  progress_to_next_level JSONB,
  current_challenge JSONB
) AS $$
DECLARE
  v_affiliate_id UUID;
  v_referrals INT;
  v_earnings DECIMAL(10,2);
  v_level TEXT;
  v_next_level TEXT;
  v_next_target INT;
BEGIN
  -- Get affiliate data
  SELECT id, COALESCE(active_referrals, 0), COALESCE(total_earned, 0), level
  INTO v_affiliate_id, v_referrals, v_earnings, v_level
  FROM yayika_affiliates WHERE user_id = p_user_id;

  my_referrals := v_referrals;
  my_earnings := v_earnings;
  my_level := v_level;

  -- My rank
  SELECT COUNT(*) + 1 INTO my_rank
  FROM yayika_affiliates
  WHERE total_earned > v_earnings AND status = 'active';

  -- Average referrals per active affiliate
  SELECT ROUND(AVG(active_referrals), 1) INTO avg_referrals
  FROM yayika_affiliates WHERE status = 'active' AND active_referrals > 0;

  -- Top earner
  SELECT full_name, total_earned INTO top_earner_name, top_earner_amount
  FROM yayika_affiliates
  WHERE status = 'active' AND total_earned > 0
  ORDER BY total_earned DESC LIMIT 1;

  -- New affiliates this week
  SELECT COUNT(*) INTO new_this_week
  FROM yayika_affiliates
  WHERE created_at >= NOW() - INTERVAL '7 days';

  -- Active this week (had activity)
  SELECT COUNT(DISTINCT user_id) INTO active_this_week
  FROM yayika_growth_activity
  WHERE created_at >= NOW() - INTERVAL '7 days';

  -- My clicks and conversion
  IF v_affiliate_id IS NOT NULL THEN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE converted = true)
    INTO my_clicks, my_converted_clicks
    FROM yayika_link_clicks WHERE affiliate_id = v_affiliate_id;

    IF my_clicks > 0 THEN
      conversion_rate := ROUND((my_converted_clicks::DECIMAL / my_clicks) * 100, 1);
    ELSE
      conversion_rate := 0;
    END IF;
  ELSE
    my_clicks := 0;
    my_converted_clicks := 0;
    conversion_rate := 0;
  END IF;

  -- Progress to next level
  CASE v_level
    WHEN 'standard' THEN v_next_level := 'silver'; v_next_target := 10;
    WHEN 'silver' THEN v_next_level := 'gold'; v_next_target := 50;
    WHEN 'gold' THEN v_next_level := 'gold'; v_next_target := 50;
    ELSE v_next_level := 'silver'; v_next_target := 10;
  END CASE;

  progress_to_next_level := jsonb_build_object(
    'current_level', v_level,
    'next_level', v_next_level,
    'target', v_next_target,
    'current', v_referrals,
    'percentage', CASE WHEN v_next_target > 0 THEN ROUND((v_referrals::DECIMAL / v_next_target) * 100, 0) ELSE 100 END
  );

  -- Current active challenge
  SELECT COALESCE(
    jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'description', c.description,
      'target', c.target_value,
      'current', COALESCE(uc.current_value, 0),
      'bonus_xp', c.bonus_xp,
      'end_date', c.end_date,
      'completed', COALESCE(uc.completed, false)
    ),
    'null'::jsonb
  ) INTO current_challenge
  FROM yayika_growth_challenges c
  LEFT JOIN yayika_growth_user_challenges uc ON uc.challenge_id = c.id AND uc.user_id = p_user_id
  WHERE c.is_active = true
    AND c.start_date <= NOW()
    AND c.end_date >= NOW()
  ORDER BY c.created_at DESC
  LIMIT 1;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get cycle-aware message type
CREATE OR REPLACE FUNCTION yayika_get_cycle_message_type(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_cycle_day INT;
  v_phase TEXT;
  v_message_type TEXT;
BEGIN
  -- Try to get user's cycle phase
  SELECT cycle_day INTO v_cycle_day
  FROM yayika_cycle_entries
  WHERE user_id = p_user_id
  ORDER BY entry_date DESC LIMIT 1;

  IF v_cycle_day IS NULL THEN
    -- Default to 'competition' if no cycle data
    RETURN 'competition';
  END IF;

  -- Determine phase based on cycle day (assuming 28-day cycle)
  IF v_cycle_day <= 5 THEN
    v_phase := 'menstrual';
    v_message_type := 'support'; -- gentle, supportive
  ELSIF v_cycle_day <= 13 THEN
    v_phase := 'follicular';
    v_message_type := 'strategy'; -- plan sharing
  ELSIF v_cycle_day <= 16 THEN
    v_phase := 'ovulatory';
    v_message_type := 'competition'; -- AGGRESSIVE, competitive
  ELSE
    v_phase := 'luteal';
    v_message_type := 'urgency'; -- close the week
  END IF;

  RETURN v_message_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record growth activity
CREATE OR REPLACE FUNCTION yayika_record_growth_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO yayika_growth_activity (user_id, activity_type, metadata)
  VALUES (p_user_id, p_activity_type, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-level affiliates based on referrals
CREATE OR REPLACE FUNCTION yayika_check_and_update_level(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_referrals INT;
  v_current_level TEXT;
  v_new_level TEXT;
BEGIN
  SELECT active_referrals, level INTO v_referrals, v_current_level
  FROM yayika_affiliates WHERE user_id = p_user_id;

  IF v_referrals >= 50 THEN v_new_level := 'gold';
  ELSIF v_referrals >= 10 THEN v_new_level := 'silver';
  ELSE v_new_level := 'standard';
  END IF;

  IF v_new_level != v_current_level THEN
    UPDATE yayika_affiliates SET level = v_new_level WHERE user_id = p_user_id;

    -- Record level up activity
    PERFORM yayika_record_growth_activity(p_user_id, 'level_up', jsonb_build_object(
      'old_level', v_current_level,
      'new_level', v_new_level
    ));

    RETURN v_new_level;
  END IF;

  RETURN v_current_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get recent competitive activity (for live feed)
CREATE OR REPLACE FUNCTION yayika_get_competitive_feed(p_limit INT DEFAULT 10)
RETURNS TABLE(
  user_name TEXT,
  activity_type TEXT,
  description TEXT,
  amount DECIMAL(10,2),
  created_ago TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(a.full_name, split_part(a.email, '@', 1))::TEXT,
    ga.activity_type::TEXT,
    CASE ga.activity_type
      WHEN 'referral_signup' THEN 'invitó a ' || (ga.metadata->>'referred_name')
      WHEN 'commission_earned' THEN 'ganó $' || (ga.metadata->>'amount')
      WHEN 'level_up' THEN 'pasó a nivel ' || (ga.metadata->>'new_level')
      WHEN 'badge_earned' THEN 'ganó badge ' || (ga.metadata->>'badge_name')
      ELSE ga.activity_type
    END::TEXT,
    CASE WHEN ga.metadata->>'amount' IS NOT NULL
      THEN (ga.metadata->>'amount')::DECIMAL
      ELSE NULL
    END,
    CASE
      WHEN ga.created_at > NOW() - INTERVAL '1 hour' THEN 'hace ' || EXTRACT(MINUTE FROM NOW() - ga.created_at)::INT || ' min'
      WHEN ga.created_at > NOW() - INTERVAL '1 day' THEN 'hace ' || EXTRACT(HOUR FROM NOW() - ga.created_at)::INT || 'h'
      ELSE 'hace ' || EXTRACT(DAY FROM NOW() - ga.created_at)::INT || 'd'
    END::TEXT
  FROM yayika_growth_activity ga
  JOIN yayika_affiliates a ON a.user_id = ga.user_id
  WHERE ga.created_at >= NOW() - INTERVAL '7 days'
  ORDER BY ga.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEW: Leaderboard (pre-computed for fast queries)
-- ============================================================
CREATE OR REPLACE VIEW yayika_growth_leaderboard AS
SELECT
  a.id AS affiliate_id,
  a.user_id,
  COALESCE(a.full_name, split_part(a.email, '@', 1)) AS display_name,
  a.email,
  a.level,
  a.active_referrals,
  COALESCE(a.total_earned, 0) AS total_earned,
  COALESCE(a.pending_payout, 0) AS pending_payout,
  a.commission_pct,
  RANK() OVER (ORDER BY a.total_earned DESC) AS rank_by_earnings,
  RANK() OVER (ORDER BY a.active_referrals DESC) AS rank_by_referrals,
  -- Weekly stats
  (SELECT COUNT(*) FROM yayika_growth_activity ga
   WHERE ga.user_id = a.user_id AND ga.activity_type = 'referral_signup'
   AND ga.created_at >= NOW() - INTERVAL '7 days') AS referrals_this_week,
  (SELECT COALESCE(SUM((ga.metadata->>'amount')::DECIMAL), 0)
   FROM yayika_growth_activity ga
   WHERE ga.user_id = a.user_id AND ga.activity_type = 'commission_earned'
   AND ga.created_at >= NOW() - INTERVAL '7 days') AS earnings_this_week
FROM yayika_affiliates a
WHERE a.status = 'active'
ORDER BY a.total_earned DESC;

-- ============================================================
-- SEED: Active challenge for this week
-- ============================================================
INSERT INTO yayika_growth_challenges (title, description, challenge_type, target_value, bonus_xp, bonus_commission_pct, start_date, end_date)
VALUES (
  'Invita 3 amigas esta semana',
  'Si invitas 3 amigas que se registren, ganas 150 XP extra y 2% de comisión adicional por una semana',
  'referrals',
  3,
  150,
  2.00,
  DATE_TRUNC('week', NOW()),
  DATE_TRUNC('week', NOW()) + INTERVAL '7 days'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE yayika_growth_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_growth_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_growth_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_growth_user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_growth_reengagement ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users read own growth activity" ON yayika_growth_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own messages" ON yayika_growth_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read challenges" ON yayika_growth_challenges
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users read own challenge progress" ON yayika_growth_user_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own reengagement" ON yayika_growth_reengagement
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access activity" ON yayika_growth_activity
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access messages" ON yayika_growth_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access challenges" ON yayika_growth_challenges
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access user challenges" ON yayika_growth_user_challenges
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access reengagement" ON yayika_growth_reengagement
  FOR ALL USING (auth.role() = 'service_role');

-- Anon can read leaderboard
CREATE POLICY "Anon read leaderboard" ON yayika_growth_activity
  FOR SELECT USING (true);
