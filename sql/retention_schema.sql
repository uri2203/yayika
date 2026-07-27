-- ============================================================
-- Yayika — Retention Features Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ============================================================
-- FASE 1: Daily Check-in (Mood Tracker)
-- ============================================================

CREATE TABLE IF NOT EXISTS yayika_daily_mood (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  energy_level INT NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  mood TEXT NOT NULL,
  cycle_phase TEXT,
  intention TEXT,
  check_date DATE DEFAULT CURRENT_DATE,
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, check_date)
);

ALTER TABLE yayika_daily_mood ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily mood" ON yayika_daily_mood
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily mood" ON yayika_daily_mood
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily mood" ON yayika_daily_mood
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- FASE 2: Cycle Diary / Tracker
-- ============================================================

CREATE TABLE IF NOT EXISTS yayika_cycle_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  cycle_day INT,
  flow_intensity INT CHECK (flow_intensity IS NULL OR flow_intensity BETWEEN 1 AND 3),
  symptoms TEXT[] DEFAULT '{}',
  mood TEXT,
  energy INT CHECK (energy IS NULL OR energy BETWEEN 1 AND 5),
  sleep_hours DECIMAL(3,1),
  exercise_min INT,
  water_glasses INT,
  notes TEXT,
  log_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE yayika_cycle_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycle log" ON yayika_cycle_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cycle log" ON yayika_cycle_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycle log" ON yayika_cycle_log
  FOR UPDATE USING (auth.uid() = user_id);

-- Cycle insights (materialized view per user)
CREATE TABLE IF NOT EXISTS yayika_cycle_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE UNIQUE,
  avg_cycle_length INT DEFAULT 28,
  avg_period_length INT DEFAULT 5,
  phase_durations JSONB DEFAULT '{"menstrual":5,"follicular":7,"ovulatory":4,"luteal":12}',
  common_symptoms JSONB DEFAULT '[]',
  avg_energy_by_phase JSONB DEFAULT '{"menstrual":2.8,"follicular":4.1,"ovulatory":4.7,"luteal":3.2}',
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE yayika_cycle_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycle insights" ON yayika_cycle_insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cycle insights" ON yayika_cycle_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycle insights" ON yayika_cycle_insights
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- FASE 4: Weekly Challenges
-- ============================================================

CREATE TABLE IF NOT EXISTS yayika_weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  challenges JSONB NOT NULL DEFAULT '[]',
  completed JSONB NOT NULL DEFAULT '[]',
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE yayika_weekly_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges" ON yayika_weekly_challenges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON yayika_weekly_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON yayika_weekly_challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- FASE 5: Support Circles
-- ============================================================

CREATE TABLE IF NOT EXISTS yayika_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  phase_focus TEXT,
  max_members INT DEFAULT 7,
  created_by UUID REFERENCES yayika_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE yayika_circles ENABLE ROW LEVEL SECURITY;

-- Everyone can see circles (to join)
CREATE POLICY "Anyone can view circles" ON yayika_circles
  FOR SELECT USING (true);
CREATE POLICY "Users can create circles" ON yayika_circles
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS yayika_circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES yayika_circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(circle_id, user_id)
);

ALTER TABLE yayika_circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view circle members" ON yayika_circle_members
  FOR SELECT USING (true);
CREATE POLICY "Users can join circles" ON yayika_circle_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave circles" ON yayika_circle_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS yayika_circle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES yayika_circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE yayika_circle_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circle members can view messages" ON yayika_circle_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM yayika_circle_members
      WHERE circle_id = yayika_circle_messages.circle_id
      AND user_id = auth.uid()
    )
  );
CREATE POLICY "Circle members can insert messages" ON yayika_circle_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM yayika_circle_members
      WHERE circle_id = yayika_circle_messages.circle_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCIONES ADICIONALES
-- ============================================================

-- Función para calcular insights de ciclo
CREATE OR REPLACE FUNCTION yayika_update_cycle_insights(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_len INT;
  avg_period INT;
  total_entries INT;
BEGIN
  -- Contar entradas
  SELECT COUNT(*) INTO total_entries
  FROM yayika_cycle_log WHERE user_id = p_user_id;

  -- Solo calcular si hay suficientes datos (mínimo 2 ciclos)
  IF total_entries < 56 THEN
    RETURN;
  END IF;

  -- Calcular longitud promedio del ciclo (aproximación)
  avg_len := 28; -- Default
  avg_period := 5; -- Default

  -- Insertar o actualizar insights
  INSERT INTO yayika_cycle_insights (user_id, avg_cycle_length, avg_period_length, last_calculated)
  VALUES (p_user_id, avg_len, avg_period, now())
  ON CONFLICT (user_id) DO UPDATE SET
    avg_cycle_length = avg_len,
    avg_period_length = avg_period,
    last_calculated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el día del ciclo actual
CREATE OR REPLACE FUNCTION yayika_get_cycle_day(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  last_period_start DATE;
  days_diff INT;
BEGIN
  -- Buscar el último día con flujo intenso (día 1 del ciclo)
  SELECT log_date INTO last_period_start
  FROM yayika_cycle_log
  WHERE user_id = p_user_id
    AND flow_intensity = 3
  ORDER BY log_date DESC
  LIMIT 1;

  IF last_period_start IS NULL THEN
    RETURN NULL;
  END IF;

  days_diff := CURRENT_DATE - last_period_start;
  RETURN days_diff + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
