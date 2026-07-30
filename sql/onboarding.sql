/* ============================================================
   Yayika — Onboarding Inteligente Schema
   7-day guided flow for new users
   ============================================================ */

-- ============================================================
-- TABLES
-- ============================================================

-- User onboarding state
CREATE TABLE IF NOT EXISTS yayika_onboarding (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_day INT DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  is_skipped BOOLEAN DEFAULT false,
  total_xp_earned INT DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual day completions
CREATE TABLE IF NOT EXISTS yayika_onboarding_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_number INT NOT NULL, -- 1-7
  task_key TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INT DEFAULT 0,
  badge_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_number)
);

-- Onboarding task definitions (seed data)
CREATE TABLE IF NOT EXISTS yayika_onboarding_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number INT UNIQUE NOT NULL, -- 1-7
  task_key TEXT UNIQUE NOT NULL,
  title JSONB NOT NULL,
  description JSONB NOT NULL,
  icon TEXT,
  color TEXT,
  gradient TEXT,
  cta_text JSONB,
  cta_action TEXT, -- 'navigate', 'open_modal', 'external_link'
  cta_target TEXT, -- tab name or URL
  xp_reward INT DEFAULT 50,
  badge_key TEXT,
  tips JSONB, -- array of tips
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ob_user ON yayika_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_obd_user ON yayika_onboarding_days(user_id);
CREATE INDEX IF NOT EXISTS idx_obd_day ON yayika_onboarding_days(user_id, day_number);

-- ============================================================
-- SEED: 7-Day Onboarding Tasks
-- ============================================================

INSERT INTO yayika_onboarding_tasks (day_number, task_key, title, description, icon, color, gradient, cta_text, cta_action, cta_target, xp_reward, badge_key, tips, sort_order) VALUES

(1, 'welcome_profile', 
 '{"es":"Bienvenida y perfil","en":"Welcome & Profile","pt":"Boas-vindas e perfil","fr":"Bienvenue et profil","de":"Willkommen & Profil"}',
 '{"es":"Completa tu perfil para personalizar tu experiencia en Yayika","en":"Complete your profile to personalize your Yayika experience","pt":"Complete seu perfil para personalizar sua experiencia no Yayika","fr":"Complétez votre profil pour personnaliser votre expérience Yayika","de":"Vervollständige dein Profil um deine Yayika-Erfahrung zu personalisieren"}',
 '👋', '#7B5EA7', 'linear-gradient(135deg, #7B5EA7 0%, #A78BDB 50%, #D4B8F5 100%)',
 '{"es":"Completar perfil","en":"Complete profile","pt":"Completar perfil","fr":"Compléter le profil","de":"Profil vervollständigen"}',
 'navigate', 'profile', 50, 'first_checkin',
 '{"es":["Agrega tu nombre y una foto","Selecciona tus intereses"],"en":["Add your name and a photo","Select your interests"],"pt":["Adicione seu nome e foto","Selecione seus interesses"],"fr":["Ajoutez votre nom et une photo","Sélectionnez vos intérêts"],"de":["Füge deinen Namen und ein Foto hinzu","Wähle deine Interessen"]}',
 1),

(2, 'first_checkin',
 '{"es":"Tu primer check-in","en":"Your first check-in","pt":"Seu primeiro check-in","fr":"Votre premier check-in","de":"Dein erstes Check-in"}',
 '{"es":"Registra cómo te sientes hoy. Es rápido y nos ayuda a conocerte mejor","en":"Record how you feel today. It\'s quick and helps us know you better","pt":"Registre como você se sente hoje. É rápido e nos ajuda a conhecê-lo melhor","fr":"Enregistrez comment vous vous sentez aujourd\'hui. C\'est rapide et ça nous aide à vous connaître","de":"Protokolliere wie du dich fühlst. Es ist schnell und hilft uns dich besser kennenzulernen"}',
 '📝', '#B8943A', 'linear-gradient(135deg, #B8943A 0%, #D4AF37 50%, #F0D060 100%)',
 '{"es":"Hacer check-in","en":"Do check-in","pt":"Fazer check-in","fr":"Faire le check-in","de":"Check-in machen"}',
 'navigate', 'dashboard', 50, NULL,
 '{"es":["Tómate 30 segundos","Puedes registrar emociones, energía y síntomas"],"en":["Take 30 seconds","You can log emotions, energy and symptoms"],"pt":["Leve 30 segundos","Você pode registrar emoções, energia e sintomas"],"fr":["Prenez 30 secondes","Vous pouvez enregistrer émotions, énergie et symptômes"],"de":["Nimm dir 30 Sekunden","Du kannst Emotionen, Energie und Symptome protokollieren"]}',
 2),

(3, 'cycle_log',
 '{"es":"Registra tu ciclo","en":"Track your cycle","pt":"Registre seu ciclo","fr":"Suivez votre cycle","de":"Erfasse deinen Zyklus"}',
 '{"es":"Añade tu primer registro de ciclo. Esto desbloquea predicciones personalizadas","en":"Add your first cycle log. This unlocks personalized predictions","pt":"Adicione seu primeiro registro de ciclo. Isso desbloqueia previsões personalizadas","fr":"Ajoutez votre premier suivi de cycle. Cela débloque des prédictions personnalisées","de":"Füge deinen ersten Zyklus-Eintrag hinzu. Das schaltet personalisierte Vorhersagen frei"}',
 '🌙', '#C96B7A', 'linear-gradient(135deg, #C96B7A 0%, #E88A9E 50%, #FFB5C2 100%)',
 '{"es":"Registrar ciclo","en":"Log cycle","pt":"Registrar ciclo","fr":"Enregistrer le cycle","de":"Zyklus erfassen"}',
 'navigate', 'cycle', 75, 'first_cycle_log',
 '{"es":["Solo necesitas tu fecha de inicio","Puedes añadir síntomas si quieres"],"en":["You only need your start date","You can add symptoms if you want"],"pt":["Você só precisa da data de início","Você pode adicionar sintomas se quiser"],"fr":["Vous avez besoin de votre date de début","Vous pouvez ajouter des symptômes si vous le souhaitez"],"de":["Du brauchst nur dein Startdatum","Du kannst Symptome hinzufügen wenn du möchtest"]}',
 3),

(4, 'explore_planner',
 '{"es":"Explora tu planificador","en":"Explore your planner","pt":"Explore seu planejador","fr":"Explorez votre planificateur","de":"Erkunde deinen Planer"}',
 '{"es":"Descubre herramientas diseñadas para tu productividad femenina","en":"Discover tools designed for your female productivity","pt":"Descubra ferramentas projetadas para sua produtividade feminina","fr":"Découvrez des outils conçus pour votre productivité féminine","de":"Entdecke Werkzeuge die für deine weibliche Produktivität entwickelt wurden"}',
 '📋', '#1A9E8F', 'linear-gradient(135deg, #1A9E8F 0%, #5ED4C5 50%, #A8F0E4 100%)',
 '{"es":"Ver planificador","en":"View planner","pt":"Ver planejador","fr":"Voir le planificateur","de":"Planer ansehen"}',
 'navigate', 'planner', 50, NULL,
 '{"es":["Hay plantillas para cada fase de tu ciclo","Prueba la planner de bienestar"],"en":["There are templates for each phase of your cycle","Try the wellness planner"],"pt":["Existem templates para cada fase do seu ciclo","Experimente o planejador de bem-estar"],"fr":["Il y a des modèles pour chaque phase de votre cycle","Essayez le planificateur de bien-être"],"de":["Es gibt Vorlagen für jede Phase deines Zyklus","Probiere den Wellness-Planer"]}',
 4),

(5, 'community_join',
 '{"es":"Únete a la comunidad","en":"Join the community","pt":"Junte-se à comunidade","fr":"Rejoignez la communauté","de":"Tritt der Community bei"}',
 '{"es":"Conecta con otras mujeres. Comparte experiencias y aprende de sus historias","en":"Connect with other women. Share experiences and learn from their stories","pt":"Conecte-se com outras mulheres. Compartilhe experiências e aprenda com suas histórias","fr":"Connectez-vous avec d\'autres femmes. Partagez des expériences et apprenez de leurs histoires","de":"Verbinde dich mit anderen Frauen. Teile Erfahrungen und lerne von ihren Geschichten"}',
 '💜', '#C96B7A', 'linear-gradient(135deg, #C96B7A 0%, #7B5EA7 50%, #5ED4C5 100%)',
 '{"es":"Ver círculos","en":"See circles","pt":"Ver círculos","fr":"Voir les cercles","de":"Kreise ansehen"}',
 'navigate', 'community', 50, 'first_circle',
 '{"es":["Los círculos son espacios seguros","Puedes compartir anónimamente si prefieres"],"en":["Circles are safe spaces","You can share anonymously if you prefer"],"pt":["Os círculos são espaços seguros","Você pode compartilhar anonimamente se preferir"],"fr":["Les cercles sont des espaces sûrs","Vous pouvez partager anonymement si vous préférez"],"de":["Kreise sind sichere Räume","Du kannst anonym teilen wenn du möchtest"]}',
 5),

(6, 'share_invite',
 '{"es":"Comparte y gana","en":"Share & earn","pt":"Compartilhe e ganhe","fr":"Partagez et gagnez","de":"Teile und verdiene"}',
 '{"es":"Invita a una amiga y ambas ganarán beneficios exclusivos","en":"Invite a friend and you\'ll both earn exclusive benefits","pt":"Convide uma amiga e ambas ganharão benefícios exclusivos","fr":"Invitez une amie et vous gagnerez toutes les deux des avantages exclusifs","de":"Lade eine Freundin ein und ihr bekommt beide exklusive Vorteile"}',
 '🌱', '#1A9E8F', 'linear-gradient(135deg, #1A9E8F 0%, #3BAF7A 50%, #5ED4A0 100%)',
 '{"es":"Crear tarjeta para compartir","en":"Create share card","pt":"Criar cartão para compartilhar","fr":"Créer une carte à partager","de":"Sharing-Karte erstellen"}',
 'navigate', 'dashboard', 75, NULL,
 '{"es":["Usa el widget Share & Earn","Puedes compartir en Instagram, WhatsApp o TikTok"],"en":["Use the Share & Earn widget","You can share on Instagram, WhatsApp or TikTok"],"pt":["Use o widget Compartilhar e Ganhar","Você pode compartilhar no Instagram, WhatsApp ou TikTok"],"fr":["Utilisez le widget Partager & Gagner","Vous pouvez partager sur Instagram, WhatsApp ou TikTok"],"de":["Nutze das Teilen & Verdienen Widget","Du kannst auf Instagram, WhatsApp oder TikTok teilen"]}',
 6),

(7, 'celebration',
 '{"es":"¡Felicidades!","en":"Congratulations!","pt":"Parabéns!","fr":"Félicitations!","de":"Herzlichen Glückwunsch!"}',
 '{"es":"Has completado tu primera semana en Yayika. ¡Sigue así!","en":"You\'ve completed your first week on Yayika. Keep going!","pt":"Você completou sua primeira semana no Yayika. Continue assim!","fr":"Vous avez complété votre première semaine sur Yayika. Continuez!","de":"Du hast deine erste Woche bei Yayika abgeschlossen. Mach weiter so!"}',
 '🎉', '#B8943A', 'linear-gradient(135deg, #B8943A 0%, #5ED4A0 50%, #7B5EA7 100%)',
 '{"es":"¡Ver mis logros!","en":"See my achievements!","pt":"Ver minhas conquistas!","fr":"Voir mes réalisations!","de":"Meine Erfolge ansehen!"}',
 'navigate', 'dashboard', 100, 'first_checkin',
 '{"es":["Cada día ganaste XP y badges","Tu próximo paso: mantén tu racha activa"],"en":["Each day you earned XP and badges","Your next step: keep your streak active"],"pt":["Cada dia você ganhou XP e badges","Próximo passo: mantenha sua sequência ativa"],"fr":["Chaque jour vous avez gagné des XP et badges","Prochaine étape: maintenez votre série"],"de":["Jeden Tag hast du XP und Badges verdient","Nächster Schritt: Halte deine Serie aufrecht"]}',
 7)
ON CONFLICT (day_number) DO NOTHING;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Initialize onboarding for a user
CREATE OR REPLACE FUNCTION yayika_init_onboarding(p_user_id UUID) RETURNS INT AS $$
DECLARE
  v_exists BOOLEAN;
  v_current_day INT;
BEGIN
  SELECT EXISTS(SELECT 1 FROM yayika_onboarding WHERE user_id = p_user_id) INTO v_exists;
  IF v_exists THEN
    SELECT current_day INTO v_current_day FROM yayika_onboarding WHERE user_id = p_user_id;
    RETURN v_current_day;
  END IF;

  INSERT INTO yayika_onboarding (user_id, current_day, started_at) VALUES (p_user_id, 1, NOW());
  v_current_day := 1;

  -- Pre-create day records
  INSERT INTO yayika_onboarding_days (user_id, day_number, task_key, completed, xp_earned)
  SELECT p_user_id, t.day_number, t.task_key, false, 0
  FROM yayika_onboarding_tasks t WHERE t.is_active = true
  ON CONFLICT (user_id, day_number) DO NOTHING;

  RETURN v_current_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete an onboarding day
CREATE OR REPLACE FUNCTION yayika_complete_onboarding_day(
  p_user_id UUID,
  p_day_number INT
) RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_xp INT;
  v_next_day INT;
  v_total_days INT;
  v_completed_days INT;
  v_result JSONB;
BEGIN
  -- Get task info
  SELECT * INTO v_task FROM yayika_onboarding_tasks WHERE day_number = p_day_number AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  -- Mark day as completed
  UPDATE yayika_onboarding_days SET completed = true, completed_at = NOW(), xp_earned = v_task.xp_reward, badge_key = v_task.badge_key
  WHERE user_id = p_user_id AND day_number = p_day_number AND completed = false;

  v_xp := v_task.xp_reward;

  -- Count completed days
  SELECT COUNT(*) INTO v_completed_days FROM yayika_onboarding_days WHERE user_id = p_user_id AND completed = true;
  SELECT COUNT(*) INTO v_total_days FROM yayika_onboarding_tasks WHERE is_active = true;

  -- Calculate next day
  v_next_day := LEAST(p_day_number + 1, v_total_days);

  -- Update onboarding state
  UPDATE yayika_onboarding SET
    current_day = v_next_day,
    total_xp_earned = total_xp_earned + v_xp,
    is_completed = (v_completed_days >= v_total_days),
    completed_at = CASE WHEN v_completed_days >= v_total_days THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record growth activity
  PERFORM yayika_record_growth_activity(p_user_id, 'badge_earned', jsonb_build_object('day', p_day_number, 'task_key', v_task.task_key));

  v_result := jsonb_build_object(
    'ok', true,
    'day', p_day_number,
    'xp_earned', v_xp,
    'badge_key', v_task.badge_key,
    'completed_days', v_completed_days,
    'total_days', v_total_days,
    'is_all_done', (v_completed_days >= v_total_days),
    'next_day', v_next_day
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get onboarding state
CREATE OR REPLACE FUNCTION yayika_get_onboarding_state(p_user_id UUID)
RETURNS TABLE(
  current_day INT,
  started_at TIMESTAMPTZ,
  is_completed BOOLEAN,
  is_skipped BOOLEAN,
  total_xp_earned INT,
  completed_days INT,
  total_days INT,
  days_data JSONB,
  current_task JSONB
) AS $$
DECLARE
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM yayika_onboarding_tasks WHERE is_active = true;

  RETURN QUERY
  SELECT
    o.current_day,
    o.started_at,
    o.is_completed,
    o.is_skipped,
    o.total_xp_earned,
    (SELECT COUNT(*)::INT FROM yayika_onboarding_days od WHERE od.user_id = p_user_id AND od.completed = true),
    v_total,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day', od2.day_number,
        'task_key', od2.task_key,
        'completed', od2.completed,
        'completed_at', od2.completed_at,
        'xp_earned', od2.xp_earned
      ) ORDER BY od2.day_number)
      FROM yayika_onboarding_days od2 WHERE od2.user_id = p_user_id
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_build_object(
        'day_number', ot.day_number,
        'task_key', ot.task_key,
        'title', ot.title,
        'description', ot.description,
        'icon', ot.icon,
        'color', ot.color,
        'gradient', ot.gradient,
        'cta_text', ot.cta_text,
        'cta_action', ot.cta_action,
        'cta_target', ot.cta_target,
        'xp_reward', ot.xp_reward,
        'badge_key', ot.badge_key,
        'tips', ot.tips
      )
      FROM yayika_onboarding_tasks ot WHERE ot.day_number = o.current_day AND ot.is_active = true
    ), '{}'::jsonb)
  FROM yayika_onboarding o WHERE o.user_id = p_user_id;

  IF NOT FOUND THEN
    current_day := 0;
    started_at := NULL;
    is_completed := false;
    is_skipped := false;
    total_xp_earned := 0;
    completed_days := 0;
    total_days := v_total;
    days_data := '[]'::jsonb;
    current_task := '{}'::jsonb;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Skip onboarding
CREATE OR REPLACE FUNCTION yayika_skip_onboarding(p_user_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE yayika_onboarding SET is_skipped = true, skipped_at = NOW(), updated_at = NOW() WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE yayika_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_onboarding_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- Tasks: public read
CREATE POLICY "pub_read_tasks" ON yayika_onboarding_tasks FOR SELECT USING (is_active = true);

-- Onboarding: user reads own
CREATE POLICY "user_read_own_ob" ON yayika_onboarding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_ob" ON yayika_onboarding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_own_ob" ON yayika_onboarding FOR UPDATE USING (auth.uid() = user_id);

-- Days: user reads own
CREATE POLICY "user_read_own_days" ON yayika_onboarding_days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_days" ON yayika_onboarding_days FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_own_days" ON yayika_onboarding_days FOR UPDATE USING (auth.uid() = user_id);

-- Service role
CREATE POLICY "svc_all_ob" ON yayika_onboarding FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_days" ON yayika_onboarding_days FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_all_tasks" ON yayika_onboarding_tasks FOR ALL USING (auth.role() = 'service_role');
