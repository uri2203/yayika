/* ============================================================
   Yayika — Weekly Email Digest + Weekly Challenges Schema
   ============================================================ */

-- ============================================================
-- WEEKLY DIGEST
-- ============================================================

-- Digest configuration per user
CREATE TABLE IF NOT EXISTS yayika_digest_prefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  send_day INT DEFAULT 1, -- 0=Sun, 1=Mon, ... 6=Sat
  send_hour INT DEFAULT 9, -- local hour
  lang TEXT DEFAULT 'es',
  sections JSONB DEFAULT '["cycle","streak","badge","tip"]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digest history (what was sent)
CREATE TABLE IF NOT EXISTS yayika_digest_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT,
  sections JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent' -- sent, failed, skipped
);

-- ============================================================
-- WEEKLY CHALLENGES
-- ============================================================

-- Challenge definitions
CREATE TABLE IF NOT EXISTS yayika_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  category TEXT NOT NULL, -- cycle, fitness, mindfulness, finance, social, streak
  difficulty TEXT DEFAULT 'easy', -- easy, medium, hard
  xp_reward INT DEFAULT 50,
  badge_id TEXT, -- references badge system
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#00B4D8',
  duration_days INT DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User challenge enrollments
CREATE TABLE IF NOT EXISTS yayika_user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES yayika_challenges(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active', -- active, completed, failed, abandoned
  progress_pct INT DEFAULT 0,
  days_completed INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_id, started_at)
);

-- Daily check-ins for challenges
CREATE TABLE IF NOT EXISTS yayika_challenge_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_id UUID REFERENCES yayika_user_challenges(id) ON DELETE CASCADE NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, enrollment_id, checkin_date)
);

-- Weekly challenge leaderboard
CREATE OR REPLACE VIEW yayika_challenge_leaderboard AS
SELECT
  uc.user_id,
  p.display_name,
  p.avatar_url,
  COUNT(*) FILTER (WHERE uc.status = 'completed') AS challenges_completed,
  SUM(c.xp_reward) FILTER (WHERE uc.status = 'completed') AS total_xp,
  SUM(uc.days_completed) AS total_days,
  MAX(uc.completed_at) AS last_completion
FROM yayika_user_challenges uc
JOIN yayika_challenges c ON c.id = uc.challenge_id
LEFT JOIN yayika_profiles p ON p.id = uc.user_id
GROUP BY uc.user_id, p.display_name, p.avatar_url
ORDER BY total_xp DESC, challenges_completed DESC;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dp_user ON yayika_digest_prefs(user_id);
CREATE INDEX IF NOT EXISTS idx_dh_user ON yayika_digest_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_ch_cat ON yayika_challenges(category, is_active);
CREATE INDEX IF NOT EXISTS idx_uc_user ON yayika_user_challenges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_uc_ends ON yayika_user_challenges(ends_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_cc_enroll ON yayika_challenge_checkins(enrollment_id, checkin_date);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get weekly challenges for user
CREATE OR REPLACE FUNCTION yayika_get_weekly_challenges(p_user_id UUID)
RETURNS TABLE(
  available JSONB,
  active JSONB,
  completed JSONB,
  stats JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Available challenges (not enrolled)
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'description', c.description,
        'category', c.category, 'difficulty', c.difficulty,
        'xp_reward', c.xp_reward, 'icon', c.icon, 'color', c.color,
        'duration_days', c.duration_days
      ))
      FROM yayika_challenges c
      WHERE c.is_active = true
        AND c.id NOT IN (SELECT challenge_id FROM yayika_user_challenges WHERE user_id = p_user_id AND status = 'active')
    ), '[]'::jsonb),

    -- Active challenges
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', uc.id, 'challenge_id', uc.challenge_id,
        'name', c.name, 'description', c.description,
        'category', c.category, 'icon', c.icon, 'color', c.color,
        'xp_reward', c.xp_reward, 'days_completed', uc.days_completed,
        'progress_pct', uc.progress_pct, 'ends_at', uc.ends_at,
        'days_left', GREATEST(0, EXTRACT(DAY FROM uc.ends_at - NOW())::INT)
      ))
      FROM yayika_user_challenges uc
      JOIN yayika_challenges c ON c.id = uc.challenge_id
      WHERE uc.user_id = p_user_id AND uc.status = 'active'
    ), '[]'::jsonb),

    -- Completed challenges (last 30 days)
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', c.name, 'icon', c.icon, 'xp_reward', c.xp_reward,
        'completed_at', uc.completed_at
      ) ORDER BY uc.completed_at DESC)
      FROM yayika_user_challenges uc
      JOIN yayika_challenges c ON c.id = uc.challenge_id
      WHERE uc.user_id = p_user_id AND uc.status = 'completed'
        AND uc.completed_at > NOW() - INTERVAL '30 days'
      LIMIT 10
    ), '[]'::jsonb),

    -- Stats
    (SELECT jsonb_build_object(
      'active_count', COUNT(*) FILTER (WHERE uc.status = 'active'),
      'completed_count', COUNT(*) FILTER (WHERE uc.status = 'completed'),
      'total_xp_earned', COALESCE(SUM(c.xp_reward) FILTER (WHERE uc.status = 'completed'), 0),
      'current_streak', (
        SELECT COUNT(*) FROM yayika_challenge_checkins cc
        WHERE cc.user_id = p_user_id AND cc.checkin_date >= CURRENT_DATE - INTERVAL '7 days'
      )
    )
    FROM yayika_user_challenges uc
    JOIN yayika_challenges c ON c.id = uc.challenge_id
    WHERE uc.user_id = p_user_id);

  IF NOT FOUND THEN
    available := '[]'::jsonb;
    active := '[]'::jsonb;
    completed := '[]'::jsonb;
    stats := '{"active_count":0,"completed_count":0,"total_xp_earned":0,"current_streak":0}'::jsonb;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enroll in challenge
CREATE OR REPLACE FUNCTION yayika_enroll_challenge(p_user_id UUID, p_challenge_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_challenge RECORD;
  v_enrollment UUID;
BEGIN
  SELECT * INTO v_challenge FROM yayika_challenges WHERE id = p_challenge_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN '{"error":"Challenge not found"}'::jsonb;
  END IF;

  -- Check if already enrolled
  IF EXISTS (SELECT 1 FROM yayika_user_challenges WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND status = 'active') THEN
    RETURN '{"error":"Already enrolled"}'::jsonb;
  END IF;

  INSERT INTO yayika_user_challenges (user_id, challenge_id, ends_at)
  VALUES (p_user_id, p_challenge_id, NOW() + (v_challenge.duration_days || ' days')::INTERVAL)
  RETURNING id INTO v_enrollment;

  RETURN jsonb_build_object('success', true, 'enrollment_id', v_enrollment, 'ends_at', NOW() + (v_challenge.duration_days || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check in for challenge
CREATE OR REPLACE FUNCTION yayika_checkin_challenge(p_user_id UUID, p_enrollment_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_enrollment RECORD;
  v_challenge RECORD;
  v_total_days INT;
  v_new_pct INT;
BEGIN
  SELECT * INTO v_enrollment FROM yayika_user_challenges WHERE id = p_enrollment_id AND user_id = p_user_id AND status = 'active';
  IF NOT FOUND THEN RETURN '{"error":"Enrollment not found"}'::jsonb; END IF;

  SELECT * INTO v_challenge FROM yayika_challenges WHERE id = v_enrollment.challenge_id;

  -- Insert checkin
  INSERT INTO yayika_challenge_checkins (user_id, enrollment_id, notes)
  VALUES (p_user_id, p_enrollment_id, p_notes)
  ON CONFLICT (user_id, enrollment_id, checkin_date) DO NOTHING;

  -- Update progress
  SELECT COUNT(*) INTO v_total_days FROM yayika_challenge_checkins WHERE enrollment_id = p_enrollment_id;
  v_new_pct := LEAST(100, (v_total_days * 100) / GREATEST(1, v_challenge.duration_days));

  UPDATE yayika_user_challenges SET
    days_completed = v_total_days,
    progress_pct = v_new_pct,
    status = CASE WHEN v_new_pct >= 100 THEN 'completed' ELSE 'active' END,
    completed_at = CASE WHEN v_new_pct >= 100 THEN NOW() ELSE NULL END
  WHERE id = p_enrollment_id;

  RETURN jsonb_build_object(
    'success', true, 'days_completed', v_total_days,
    'progress_pct', v_new_pct, 'completed', v_new_pct >= 100,
    'xp_earned', CASE WHEN v_new_pct >= 100 THEN v_challenge.xp_reward ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED: Weekly Challenges
-- ============================================================

INSERT INTO yayika_challenges (name, name_en, description, description_en, category, difficulty, xp_reward, icon, color, duration_days) VALUES
('Check-in Diario', 'Daily Check-in', 'Registra tu ciclo y ánimo todos los días por 7 días.', 'Log your cycle and mood every day for 7 days.', 'cycle', 'easy', 70, '📝', '#00B4D8', 7),
('Hidratación Perfecta', 'Perfect Hydration', 'Bebe al menos 8 vasos de agua diarios por 7 días.', 'Drink at least 8 glasses of water daily for 7 days.', 'fitness', 'easy', 80, '💧', '#00B4D8', 7),
('Meditación Matutina', 'Morning Meditation', 'Medita 5 minutos al despertar por 7 días.', 'Meditate 5 minutes upon waking for 7 days.', 'mindfulness', 'medium', 120, '🧘', '#7B5EA7', 7),
('Sin Compras Impulsivas', 'No Impulse Buys', 'No hagas compras no planificadas por 7 días.', 'Make no unplanned purchases for 7 days.', 'finance', 'hard', 150, '💰', '#B8943A', 7),
('Paso a Paso', 'Step by Step', 'Camina al menos 30 minutos diarios por 7 días.', 'Walk at least 30 minutes daily for 7 days.', 'fitness', 'medium', 100, '🚶', '#3BAF7A', 7),
('Gratitud Activa', 'Active Gratitude', 'Escribe 3 cosas por las que estás agradecida cada día.', 'Write 3 things you are grateful for each day.', 'mindfulness', 'easy', 90, '🙏', '#E91E63', 7),
('Ciclo Consciente', 'Conscious Cycle', 'Registra todos los síntomas de tu ciclo por 7 días.', 'Log all your cycle symptoms for 7 days.', 'cycle', 'medium', 110, '🌙', '#7B5EA7', 7),
('Ahorro Semanal', 'Weekly Savings', 'Ahorra una pequeña cantidad cada día por 7 días.', 'Save a small amount each day for 7 days.', 'finance', 'easy', 80, '🐷', '#B8943A', 7),
('Sin Pantallas', 'Screen Free', 'Pasa 1 hora sin pantallas cada día por 5 días.', 'Spend 1 hour screen-free each day for 5 days.', 'mindfulness', 'hard', 140, '📵', '#C96B7A', 5),
('Reto Comunitario', 'Community Challenge', 'Comparte 1 logro o reflexión en la comunidad.', 'Share 1 achievement or reflection in the community.', 'social', 'easy', 60, '💬', '#3BAF7A', 7)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE yayika_digest_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_digest_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_challenge_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_digest" ON yayika_digest_prefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_upsert_own_digest" ON yayika_digest_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_own_digest" ON yayika_digest_prefs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_read_own_history" ON yayika_digest_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "public_read_challenges" ON yayika_challenges FOR SELECT USING (is_active = true);
CREATE POLICY "user_read_own_enrollments" ON yayika_user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_enrollment" ON yayika_user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_enrollment" ON yayika_user_challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_read_own_checkins" ON yayika_challenge_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_checkin" ON yayika_challenge_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "svc_all_digest_prefs" ON yayika_digest_prefs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_digest_history" ON yayika_digest_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_challenges" ON yayika_challenges FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_enrollments" ON yayika_user_challenges FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_checkins" ON yayika_challenge_checkins FOR ALL USING (auth.role() = 'service_role');
