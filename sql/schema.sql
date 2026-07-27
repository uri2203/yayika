-- ============================================================
-- Yayika — Schema para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS yayika_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  initials TEXT DEFAULT '??',
  avatar_color TEXT DEFAULT '#7B5EA7',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Progreso del usuario (XP, nivel, racha)
CREATE TABLE IF NOT EXISTS yayika_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE UNIQUE,
  xp_total INT DEFAULT 0,
  level INT DEFAULT 1,
  streak_days INT DEFAULT 0,
  last_active_date DATE,
  current_module INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Completación de módulos
CREATE TABLE IF NOT EXISTS yayika_module_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  module_number INT NOT NULL CHECK (module_number BETWEEN 1 AND 5),
  xp_earned INT DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_number)
);

-- 4. Registros diarios del tracker
CREATE TABLE IF NOT EXISTS yayika_daily_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  feeling TEXT,
  task_plan TEXT,
  check_date DATE DEFAULT CURRENT_DATE,
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Respuestas de ejercicios
CREATE TABLE IF NOT EXISTS yayika_exercise_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  module_number INT NOT NULL,
  exercise_type TEXT NOT NULL,
  response TEXT,
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Brainstorm ideas guardadas
CREATE TABLE IF NOT EXISTS yayika_saved_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  idea_name TEXT NOT NULL,
  module_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Suscripciones / Pagos
CREATE TABLE IF NOT EXISTS yayika_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('semilla', 'guerrera', 'diamante')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Log de actividad (feed del círculo)
CREATE TABLE IF NOT EXISTS yayika_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yayika_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_detail TEXT,
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE yayika_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_module_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_daily_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_exercise_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_saved_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuario solo ve sus propios datos
CREATE POLICY "Users can view own profile" ON yayika_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON yayika_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON yayika_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own progress" ON yayika_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON yayika_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON yayika_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own completions" ON yayika_module_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON yayika_module_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own checks" ON yayika_daily_checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checks" ON yayika_daily_checks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own exercises" ON yayika_exercise_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exercises" ON yayika_exercise_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own ideas" ON yayika_saved_ideas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ideas" ON yayika_saved_ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ideas" ON yayika_saved_ideas FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription" ON yayika_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON yayika_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON yayika_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Activity log: todos pueden leer (para el feed del círculo), solo propio para insertar
CREATE POLICY "Anyone can view activity" ON yayika_activity_log FOR SELECT USING (true);
CREATE POLICY "Users can insert own activity" ON yayika_activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Función para actualizar streak al hacer login
CREATE OR REPLACE FUNCTION yayika_update_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  last_date DATE;
  today DATE := CURRENT_DATE;
BEGIN
  SELECT last_active_date INTO last_date
  FROM yayika_progress WHERE user_id = p_user_id;

  IF last_date IS NULL THEN
    UPDATE yayika_progress
    SET streak_days = 1, last_active_date = today, updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF last_date = today THEN
    -- Ya activo hoy, no hacer nada
    RETURN;
  ELSIF last_date = today - INTERVAL '1 day' THEN
    UPDATE yayika_progress
    SET streak_days = streak_days + 1, last_active_date = today, updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    -- Racha rota
    UPDATE yayika_progress
    SET streak_days = 1, last_active_date = today, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para agregar XP y actualizar nivel
CREATE OR REPLACE FUNCTION yayika_add_xp(p_user_id UUID, p_xp INT)
RETURNS INT AS $$
DECLARE
  new_xp INT;
  new_level INT;
BEGIN
  UPDATE yayika_progress
  SET xp_total = xp_total + p_xp, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING xp_total INTO new_xp;

  -- Nivel basado en XP: 100 XP por nivel
  new_level := GREATEST(1, (new_xp / 100) + 1);

  UPDATE yayika_progress
  SET level = new_level
  WHERE user_id = p_user_id AND level != new_level;

  RETURN new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-crear profile al registrarse
CREATE OR REPLACE FUNCTION yayika_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO yayika_profiles (id, full_name, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    UPPER(SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 1, 2))
  );

  INSERT INTO yayika_progress (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION yayika_handle_new_user();
