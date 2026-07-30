/* ============================================================
   Yayika — Cycle Intelligence Dashboard Schema
   Analytics, predictions, and pattern insights
   ============================================================ */

-- ============================================================
-- TABLES
-- ============================================================

-- Cycle analytics (aggregated per user)
CREATE TABLE IF NOT EXISTS yayika_cycle_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_cycles INT DEFAULT 0,
  avg_cycle_length DECIMAL(5,2) DEFAULT 28.0,
  avg_period_length DECIMAL(5,2) DEFAULT 5.0,
  shortest_cycle INT DEFAULT 28,
  longest_cycle INT DEFAULT 28,
  cycle_regularity_score DECIMAL(3,2) DEFAULT 1.0, -- 0-1, 1=perfectly regular
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cycle phase patterns (what happens in each phase)
CREATE TABLE IF NOT EXISTS yayika_cycle_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phase TEXT NOT NULL, -- menstrual, follicular, ovulatory, luteal
  avg_energy DECIMAL(3,2),
  avg_mood DECIMAL(3,2),
  common_symptoms JSONB DEFAULT '[]',
  best_activities JSONB DEFAULT '[]',
  focus_score DECIMAL(3,2), -- 1-5
  exercise_score DECIMAL(3,2),
  social_score DECIMAL(3,2),
  sample_size INT DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly cycle reports
CREATE TABLE IF NOT EXISTS yayika_cycle_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_month DATE NOT NULL, -- first day of month
  cycle_started BOOLEAN DEFAULT false,
  cycle_length INT,
  period_length INT,
  avg_energy DECIMAL(3,2),
  avg_mood DECIMAL(3,2),
  top_symptoms JSONB DEFAULT '[]',
  days_logged INT DEFAULT 0,
  insights JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_month)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ca_user ON yayika_cycle_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_user ON yayika_cycle_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_user ON yayika_cycle_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_month ON yayika_cycle_reports(user_id, report_month DESC);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Calculate cycle analytics from history
CREATE OR REPLACE FUNCTION yayika_calculate_cycle_analytics(p_user_id UUID) RETURNS VOID AS $$
DECLARE
  v_heavy_dates DATE[];
  v_cycle_lengths INT[];
  v_period_lengths INT[];
  v_i INT;
  v_diff INT;
  v_period_start DATE;
  v_period_end DATE;
  v_total_cycles INT;
  v_avg_cycle DECIMAL;
  v_avg_period DECIMAL;
  v_min_cycle INT;
  v_max_cycle INT;
  v_regularity DECIMAL;
BEGIN
  -- Get all heavy flow dates (cycle start markers)
  SELECT array_agg(log_date ORDER BY log_date) INTO v_heavy_dates
  FROM yayika_cycle_log
  WHERE user_id = p_user_id AND flow_intensity = 3;

  IF v_heavy_dates IS NULL OR array_length(v_heavy_dates, 1) < 2 THEN
    INSERT INTO yayika_cycle_analytics (user_id, total_cycles, avg_cycle_length, avg_period_length, cycle_regularity_score, last_calculated)
    VALUES (p_user_id, 0, 28.0, 5.0, 1.0, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_cycles = 0, avg_cycle_length = 28.0, avg_period_length = 5.0,
      cycle_regularity_score = 1.0, last_calculated = NOW(), updated_at = NOW();
    RETURN;
  END IF;

  -- Calculate cycle lengths (gap between consecutive heavy flow starts)
  v_cycle_lengths := '{}';
  FOR v_i IN 2..array_length(v_heavy_dates, 1) LOOP
    v_diff := v_heavy_dates[v_i] - v_heavy_dates[v_i - 1];
    IF v_diff >= 18 AND v_diff <= 45 THEN -- sanity filter
      v_cycle_lengths := array_append(v_cycle_lengths, v_diff);
    END IF;
  END LOOP;

  -- Calculate period lengths (consecutive heavy/medium flow days)
  v_period_lengths := '{}';
  v_period_start := NULL;
  FOR v_i IN 1..array_length(v_heavy_dates, 1) LOOP
    v_period_start := v_heavy_dates[v_i];
    v_period_end := v_period_start;
    -- Look ahead for flow days
    SELECT MAX(log_date) INTO v_period_end
    FROM yayika_cycle_log
    WHERE user_id = p_user_id
      AND log_date >= v_period_start
      AND log_date <= v_period_start + INTERVAL '10 days'
      AND flow_intensity IS NOT NULL;
    IF v_period_end IS NOT NULL THEN
      v_period_lengths := array_append(v_period_lengths, (v_period_end - v_period_start) + 1);
    END IF;
  END LOOP;

  -- Calculate averages
  v_total_cycles := array_length(v_cycle_lengths, 1);
  SELECT AVG(g::INT), MIN(g::INT), MAX(g::INT) INTO v_avg_cycle, v_min_cycle, v_max_cycle
  FROM unnest(v_cycle_lengths) g;

  SELECT AVG(p::INT) INTO v_avg_period FROM unnest(v_period_lengths) p;

  -- Regularity score (1 = perfect, 0 = very irregular)
  IF v_avg_cycle > 0 AND v_total_cycles >= 2 THEN
    v_regularity := GREATEST(0, 1.0 - (v_max_cycle - v_min_cycle)::DECIMAL / (v_avg_cycle * 2));
  ELSE
    v_regularity := 1.0;
  END IF;

  -- Upsert analytics
  INSERT INTO yayika_cycle_analytics (user_id, total_cycles, avg_cycle_length, avg_period_length, shortest_cycle, longest_cycle, cycle_regularity_score, last_calculated)
  VALUES (p_user_id, v_total_cycles, COALESCE(v_avg_cycle, 28), COALESCE(v_avg_period, 5),
          COALESCE(v_min_cycle, 28), COALESCE(v_max_cycle, 28), COALESCE(v_regularity, 1.0), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_cycles = v_total_cycles, avg_cycle_length = COALESCE(v_avg_cycle, 28),
    avg_period_length = COALESCE(v_avg_period, 5), shortest_cycle = COALESCE(v_min_cycle, 28),
    longest_cycle = COALESCE(v_max_cycle, 28), cycle_regularity_score = COALESCE(v_regularity, 1.0),
    last_calculated = NOW(), updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate phase patterns
CREATE OR REPLACE FUNCTION yayika_calculate_phase_patterns(p_user_id UUID) RETURNS VOID AS $$
DECLARE
  v_heavy_date DATE;
  v_cycle_day INT;
  v_phase TEXT;
  v_rec RECORD;
BEGIN
  -- Get last heavy flow date
  SELECT MAX(log_date) INTO v_heavy_date
  FROM yayika_cycle_log
  WHERE user_id = p_user_id AND flow_intensity = 3;

  IF v_heavy_date IS NULL THEN RETURN; END IF;

  -- Calculate patterns for each phase
  FOR v_phase IN SELECT unnest(ARRAY['menstrual', 'follicular', 'ovulatory', 'luteal']) LOOP
    -- Aggregate data for this phase across all cycles
    SELECT
      AVG(energy), AVG(CASE WHEN mood IS NOT NULL THEN 1 END),
      COUNT(*)
    INTO v_rec.avg_energy, v_rec.avg_mood, v_rec.sample_size
    FROM yayika_cycle_log cl
    WHERE cl.user_id = p_user_id
      AND cl.log_date >= v_heavy_date - INTERVAL '365 days'
      AND (
        (v_phase = 'menstrual' AND (cl.log_date - v_heavy_date) % 28 BETWEEN 0 AND 4) OR
        (v_phase = 'follicular' AND (cl.log_date - v_heavy_date) % 28 BETWEEN 5 AND 12) OR
        (v_phase = 'ovulatory' AND (cl.log_date - v_heavy_date) % 28 BETWEEN 13 AND 17) OR
        (v_phase = 'luteal' AND (cl.log_date - v_heavy_date) % 28 BETWEEN 18 AND 27)
      );

    -- Get common symptoms
    SELECT COALESCE(
      jsonb_agg(symptom ORDER BY cnt DESC),
      '[]'::jsonb
    ) INTO v_rec.common_symptoms
    FROM (
      SELECT unnest(cl.symptoms) AS symptom, COUNT(*) AS cnt
      FROM yayika_cycle_log cl
      WHERE cl.user_id = p_user_id
        AND cl.log_date >= v_heavy_date - INTERVAL '365 days'
        AND cl.symptoms IS NOT NULL
        AND array_length(cl.symptoms, 1) > 0
        AND (
          (v_phase = 'menstrual' AND (cl.log_date - v_heavy_date) % 28 BETWEEN 0 AND 4) OR
          (v_phase = 'follicular' AND (cl.log_date - v_heavy_date) % 28 BETWEEN 5 AND 12) OR
          (v_phase = 'ovulatory' AND (cl.log_date - v_heavy_date) % 28 BETWEEN 13 AND 17) OR
          (v_phase = 'luteal' AND (cl.log_date - v_heavy_date) % 28 BETWEEN 18 AND 27)
        )
      GROUP BY 1
      LIMIT 3
    ) sub;

    -- Upsert pattern
    INSERT INTO yayika_cycle_patterns (user_id, phase, avg_energy, avg_mood, common_symptoms, sample_size, calculated_at)
    VALUES (p_user_id, v_phase, COALESCE(v_rec.avg_energy, 3.0), COALESCE(v_rec.avg_mood, 3.0),
            COALESCE(v_rec.common_symptoms, '[]'::jsonb), COALESCE(v_rec.sample_size, 0), NOW())
    ON CONFLICT (user_id, phase) DO UPDATE SET
      avg_energy = COALESCE(v_rec.avg_energy, 3.0), avg_mood = COALESCE(v_rec.avg_mood, 3.0),
      common_symptoms = COALESCE(v_rec.common_symptoms, '[]'::jsonb),
      sample_size = COALESCE(v_rec.sample_size, 0), calculated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get cycle dashboard data
CREATE OR REPLACE FUNCTION yayika_get_cycle_dashboard(p_user_id UUID)
RETURNS TABLE(
  analytics JSONB,
  patterns JSONB,
  current_phase JSONB,
  recent_cycles JSONB,
  predictions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Analytics
    COALESCE((
      SELECT jsonb_build_object(
        'total_cycles', ca.total_cycles,
        'avg_cycle_length', ca.avg_cycle_length,
        'avg_period_length', ca.avg_period_length,
        'shortest_cycle', ca.shortest_cycle,
        'longest_cycle', ca.longest_cycle,
        'regularity_score', ca.cycle_regularity_score,
        'last_calculated', ca.last_calculated
      )
      FROM yayika_cycle_analytics ca WHERE ca.user_id = p_user_id
    ), '{"total_cycles":0,"avg_cycle_length":28,"avg_period_length":5,"regularity_score":1}'::jsonb),

    -- Patterns
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'phase', cp.phase,
        'avg_energy', cp.avg_energy,
        'avg_mood', cp.avg_mood,
        'common_symptoms', cp.common_symptoms,
        'sample_size', cp.sample_size
      ))
      FROM yayika_cycle_patterns cp WHERE cp.user_id = p_user_id
    ), '[]'::jsonb),

    -- Current phase (placeholder, computed client-side)
    '{}'::jsonb,

    -- Recent cycles (last 6 heavy flow dates with lengths)
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'start_date', sub.start_date,
        'cycle_length', sub.cycle_length
      ) ORDER BY sub.start_date DESC)
      FROM (
        SELECT cl.log_date AS start_date,
               LEAD(cl.log_date) OVER (ORDER BY cl.log_date) - cl.log_date AS cycle_length
        FROM yayika_cycle_log cl
        WHERE cl.user_id = p_user_id AND cl.flow_intensity = 3
        ORDER BY cl.log_date DESC LIMIT 6
      ) sub WHERE sub.cycle_length IS NOT NULL AND sub.cycle_length BETWEEN 18 AND 45
    ), '[]'::jsonb),

    -- Predictions (from existing table)
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'event_type', cp.event_type,
        'predicted_date', cp.predicted_date,
        'confidence', cp.confidence
      ) ORDER BY cp.predicted_date)
      FROM yayika_cycle_predictions cp WHERE cp.user_id = p_user_id AND cp.predicted_date >= CURRENT_DATE
      LIMIT 6
    ), '[]'::jsonb);

  IF NOT FOUND THEN
    analytics := '{"total_cycles":0}'::jsonb;
    patterns := '[]'::jsonb;
    current_phase := '{}'::jsonb;
    recent_cycles := '[]'::jsonb;
    predictions := '[]'::jsonb;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE yayika_cycle_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_cycle_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_cycle_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_analytics" ON yayika_cycle_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_analytics" ON yayika_cycle_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_own_analytics" ON yayika_cycle_analytics FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_read_own_patterns" ON yayika_cycle_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_patterns" ON yayika_cycle_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_own_patterns" ON yayika_cycle_patterns FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_read_own_reports" ON yayika_cycle_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_reports" ON yayika_cycle_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "svc_all_analytics" ON yayika_cycle_analytics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_patterns" ON yayika_cycle_patterns FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_reports" ON yayika_cycle_reports FOR ALL USING (auth.role() = 'service_role');
