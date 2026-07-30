-- ============================================================
-- Yayika — Community / Círculos de Mujeres
-- Posts, reactions, comments, categories
-- ============================================================

-- 1. Categories for posts
CREATE TABLE IF NOT EXISTS yayika_community_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  name JSONB NOT NULL, -- { es: 'Logros', en: 'Achievements', ... }
  description JSONB NOT NULL,
  color TEXT DEFAULT '#7B5EA7',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Posts (main feed items)
CREATE TABLE IF NOT EXISTS yayika_community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES yayika_community_categories(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'text', -- 'text', 'achievement', 'question', 'tip', 'milestone'
  achievement_type TEXT, -- 'badge_earned', 'streak', 'level_up', 'referral', 'course_complete'
  achievement_data JSONB DEFAULT '{}', -- { badge_name, streak_count, level, etc }
  is_pinned BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  reactions_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  reports_count INT DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'hidden', 'reported', 'deleted'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_user ON yayika_community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON yayika_community_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON yayika_community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON yayika_community_posts(status);

-- 3. Reactions (likes, etc)
CREATE TABLE IF NOT EXISTS yayika_community_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES yayika_community_posts(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT DEFAULT 'like', -- 'like', 'love', 'fire', 'clap', 'support'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_community_reactions_post ON yayika_community_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_user ON yayika_community_reactions(user_id);

-- 4. Comments (replies to posts)
CREATE TABLE IF NOT EXISTS yayika_community_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES yayika_community_posts(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES yayika_community_comments(id) ON DELETE CASCADE, -- nested replies
  content TEXT NOT NULL,
  reactions_count INT DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'hidden', 'deleted'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post ON yayika_community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user ON yayika_community_comments(user_id);

-- 5. User follows (optional: follow specific women)
CREATE TABLE IF NOT EXISTS yayika_community_follows (
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- 6. Notifications for community interactions
CREATE TABLE IF NOT EXISTS yayika_community_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'reaction', 'comment', 'follow', 'mention', 'featured'
  post_id UUID REFERENCES yayika_community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES yayika_community_comments(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_notif_user ON yayika_community_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_community_notif_read ON yayika_community_notifications(user_id, read);

-- ============================================================
-- SEED: Default categories
-- ============================================================
INSERT INTO yayika_community_categories (slug, icon, name, description, color, sort_order) VALUES
('logros', '🏆', '{"es":"Logros","en":"Achievements","pt":"Conquistas","fr":"Succès","de":"Erfolge"}', '{"es":"Comparte tus victorias y metas alcanzadas","en":"Share your victories and goals","pt":"Comparta suas vitórias e metas","fr":"Partage tes victoires et objectifs","de":"Teile deine Siege und Ziele"}', '#B8943A', 1),
('preguntas', '❓', '{"es":"Preguntas","en":"Questions","pt":"Perguntas","fr":"Questions","de":"Fragen"}', '{"es":"Pide consejo a otras mujeres","en":"Ask other women for advice","pt":"Peça conselho a outras mulheres","fr":"Demande conseil à d\'autres femmes","de":"Frage andere Frauen um Rat"}', '#1A9E8F', 2),
('tips', '💡', '{"es":"Tips","en":"Tips","pt":"Dicas","fr":"Astuces","de":"Tipps"}', '{"es":"Comparte lo que te ha funcionado","en":"Share what has worked for you","pt":"Compartilhe o que funcionou para você","fr":"Partage ce qui a fonctionné pour toi","de":"Teile, was bei dir funktioniert hat"}', '#7B5EA7', 3),
('desahogo', '💜', '{"es":"Desahogo","en":"Vent","pt":"Desabafo","fr":"Épanchement","de":"Luft machen"}', '{"es":"Un espacio seguro para expresar lo que sientes","en":"A safe space to express how you feel","pt":"Um espaço seguro para expressar seus sentimentos","fr":"Un espace sûr pour exprimer ce que tu ressens","de":"Ein sicherer Raum, um deine Gefühle auszudrücken"}', '#C96B7A', 4),
('finanzas', '💰', '{"es":"Finanzas","en":"Finances","pt":"Finanças","fr":"Finances","de":"Finanzen"}', '{"es":"Tips de ahorro, inversión y relación con el dinero","en":"Savings tips, investment and money relationship","pt":"Dicas de economia e investimento","fr":"Conseils épargne et investissement","de":"Spar- und Anlagetipps"}', '#5ED4A0', 5),
('ciclo', '🌙', '{"es":"Ciclo","en":"Cycle","pt":"Ciclo","fr":"Cycle","de":"Zyklus"}', '{"es":"Comparte tu experiencia con tu ciclo menstrual","en":"Share your cycle experience","pt":"Comparte sua experiência com o ciclo","fr":"Partage ton expérience de cycle","de":"Teile deine Zyklerfahrung"}', '#E8A0B0', 6);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Create a post
CREATE OR REPLACE FUNCTION yayika_create_post(
  p_user_id UUID,
  p_content TEXT,
  p_category_slug TEXT DEFAULT 'logros',
  p_post_type TEXT DEFAULT 'text',
  p_achievement_type TEXT DEFAULT NULL,
  p_achievement_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
  v_post_id UUID;
BEGIN
  -- Get category
  SELECT id INTO v_category_id
  FROM yayika_community_categories
  WHERE slug = p_category_slug AND is_active = true;

  -- Create post
  INSERT INTO yayika_community_posts (user_id, category_id, content, post_type, achievement_type, achievement_data)
  VALUES (p_user_id, v_category_id, p_content, p_post_type, p_achievement_type, p_achievement_data)
  RETURNING id INTO v_post_id;

  -- Record activity for growth coach
  PERFORM yayika_record_growth_activity(p_user_id, 'community_post', jsonb_build_object('post_id', v_post_id));

  RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Toggle reaction
CREATE OR REPLACE FUNCTION yayika_toggle_reaction(
  p_user_id UUID,
  p_post_id UUID,
  p_reaction_type TEXT DEFAULT 'like'
)
RETURNS TEXT AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if reaction exists
  SELECT EXISTS(
    SELECT 1 FROM yayika_community_reactions
    WHERE user_id = p_user_id AND post_id = p_post_id AND reaction_type = p_reaction_type
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove reaction
    DELETE FROM yayika_community_reactions
    WHERE user_id = p_user_id AND post_id = p_post_id AND reaction_type = p_reaction_type;

    UPDATE yayika_community_posts SET reactions_count = reactions_count - 1 WHERE id = p_post_id;

    RETURN 'removed';
  ELSE
    -- Add reaction
    INSERT INTO yayika_community_reactions (user_id, post_id, reaction_type)
    VALUES (p_user_id, p_post_id, p_reaction_type);

    UPDATE yayika_community_posts SET reactions_count = reactions_count + 1 WHERE id = p_post_id;

    -- Create notification
    INSERT INTO yayika_community_notifications (user_id, from_user_id, notification_type, post_id)
    SELECT user_id, p_user_id, 'reaction', p_post_id
    FROM yayika_community_posts WHERE id = p_post_id AND user_id != p_user_id;

    RETURN 'added';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Add comment
CREATE OR REPLACE FUNCTION yayika_add_comment(
  p_user_id UUID,
  p_post_id UUID,
  p_content TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_comment_id UUID;
BEGIN
  INSERT INTO yayika_community_comments (user_id, post_id, parent_id, content)
  VALUES (p_user_id, p_post_id, p_parent_id, p_content)
  RETURNING id INTO v_comment_id;

  -- Update comment count
  UPDATE yayika_community_posts SET comments_count = comments_count + 1 WHERE id = p_post_id;

  -- Create notification
  INSERT INTO yayika_community_notifications (user_id, from_user_id, notification_type, post_id, comment_id)
  SELECT user_id, p_user_id, 'comment', p_post_id, v_comment_id
  FROM yayika_community_posts WHERE id = p_post_id AND user_id != p_user_id;

  RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get feed with user reactions
CREATE OR REPLACE FUNCTION yayika_get_community_feed(
  p_user_id UUID DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  post_id UUID,
  user_name TEXT,
  user_avatar_color TEXT,
  category_icon TEXT,
  category_name TEXT,
  content TEXT,
  post_type TEXT,
  achievement_type TEXT,
  achievement_data JSONB,
  reactions_count INT,
  comments_count INT,
  is_pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  my_reactions JSONB,
  recent_comments JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    COALESCE(a.full_name, split_part(a.email, '@', 1))::TEXT,
    ('#' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'))::TEXT,
    c.icon::TEXT,
    (c.name->>'es')::TEXT,
    p.content::TEXT,
    p.post_type::TEXT,
    p.achievement_type::TEXT,
    p.achievement_data,
    p.reactions_count,
    p.comments_count,
    p.is_pinned,
    p.created_at,
    -- My reactions
    COALESCE(
      (SELECT jsonb_agg(r.reaction_type)
       FROM yayika_community_reactions r
       WHERE r.post_id = p.id AND r.user_id = p_user_id),
      '[]'::jsonb
    ),
    -- Recent comments (last 3)
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', cm.id,
          'user_name', COALESCE(ca.full_name, split_part(ca.email, '@', 1)),
          'content', cm.content,
          'created_at', cm.created_at
        )
       )
       FROM (
         SELECT cm2.* FROM yayika_community_comments cm2
         WHERE cm2.post_id = p.id AND cm2.status = 'active'
         ORDER BY cm2.created_at DESC LIMIT 3
       ) cm
       JOIN yayika_community_comments cm2 ON cm2.id = cm.id
       JOIN yayika_affiliates ca ON ca.user_id = cm.user_id
      ),
      '[]'::jsonb
    )
  FROM yayika_community_posts p
  JOIN yayika_affiliates a ON a.user_id = p.user_id
  LEFT JOIN yayika_community_categories c ON c.id = p.category_id
  WHERE p.status = 'active'
    AND (p_category_slug IS NULL OR c.slug = p_category_slug)
  ORDER BY p.is_pinned DESC, p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get unread notification count
CREATE OR REPLACE FUNCTION yayika_get_unread_notifications(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM yayika_community_notifications
  WHERE user_id = p_user_id AND read = false;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark notifications as read
CREATE OR REPLACE FUNCTION yayika_mark_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE yayika_community_notifications
  SET read = true
  WHERE user_id = p_user_id AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEW: User community stats
-- ============================================================
CREATE OR REPLACE VIEW yayika_community_user_stats AS
SELECT
  a.user_id,
  COALESCE(a.full_name, split_part(a.email, '@', 1)) AS display_name,
  COUNT(DISTINCT p.id) AS total_posts,
  COUNT(DISTINCT c.id) AS total_comments,
  COALESCE(SUM(p.reactions_count), 0) AS total_reactions_received,
  (SELECT COUNT(*) FROM yayika_community_notifications n
   WHERE n.user_id = a.user_id AND n.read = false) AS unread_notifications
FROM yayika_affiliates a
LEFT JOIN yayika_community_posts p ON p.user_id = a.user_id AND p.status = 'active'
LEFT JOIN yayika_community_comments c ON c.user_id = a.user_id AND c.status = 'active'
GROUP BY a.user_id, a.full_name, a.email;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE yayika_community_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_community_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE yayika_community_notifications ENABLE ROW LEVEL SECURITY;

-- Everyone can read active content
CREATE POLICY "Anyone read categories" ON yayika_community_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone read active posts" ON yayika_community_posts FOR SELECT USING (status = 'active');
CREATE POLICY "Anyone read reactions" ON yayika_community_reactions FOR SELECT USING (true);
CREATE POLICY "Anyone read active comments" ON yayika_community_comments FOR SELECT USING (status = 'active');

-- Users can create posts
CREATE POLICY "Users create posts" ON yayika_community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own posts
CREATE POLICY "Users update own posts" ON yayika_community_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own posts
CREATE POLICY "Users delete own posts" ON yayika_community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Users can toggle own reactions
CREATE POLICY "Users toggle reactions" ON yayika_community_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Users can add comments
CREATE POLICY "Users add comments" ON yayika_community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own comments
CREATE POLICY "Users update own comments" ON yayika_community_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can follow/unfollow
CREATE POLICY "Users manage follows" ON yayika_community_follows
  FOR ALL USING (auth.uid() = follower_id);

-- Users can read own notifications
CREATE POLICY "Users read own notifications" ON yayika_community_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update own notifications
CREATE POLICY "Users update own notifications" ON yayika_community_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full" ON yayika_community_categories FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full" ON yayika_community_posts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full" ON yayika_community_reactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full" ON yayika_community_comments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full" ON yayika_community_follows FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full" ON yayika_community_notifications FOR ALL USING (auth.role() = 'service_role');
