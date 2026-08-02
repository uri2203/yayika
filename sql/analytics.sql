-- ============================================================
-- Yayika — Analytics Schema
-- Custom event tracking for conversion funnels
-- ============================================================

CREATE TABLE IF NOT EXISTS yayika_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_url TEXT,
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  screen_width INT,
  session_id TEXT,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event ON yayika_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON yayika_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON yayika_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON yayika_analytics(session_id);

-- RLS: Only service role can write/read
ALTER TABLE yayika_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc_all_analytics" ON yayika_analytics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "anon_insert_analytics" ON yayika_analytics FOR INSERT WITH CHECK (true);

-- ============================================================
-- Useful Views for reporting
-- ============================================================

-- Daily active users
CREATE OR REPLACE VIEW yayika_daily_active_users AS
SELECT
  DATE(created_at) AS day,
  COUNT(DISTINCT user_id) AS dau,
  COUNT(*) AS total_events
FROM yayika_analytics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Funnel conversion rates
CREATE OR REPLACE VIEW yayika_funnel_conversion AS
SELECT
  properties->>'funnel' AS funnel,
  properties->>'step' AS step,
  COUNT(DISTINCT user_id) AS users,
  COUNT(*) AS events
FROM yayika_analytics
WHERE event_name = 'funnel_step'
GROUP BY properties->>'funnel', properties->>'step'
ORDER BY properties->>'funnel', properties->>'step';

-- Top pages
CREATE OR REPLACE VIEW yayika_top_pages AS
SELECT
  page_path,
  COUNT(*) AS views,
  COUNT(DISTINCT user_id) AS unique_users
FROM yayika_analytics
WHERE event_name = 'page_view'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY page_path
ORDER BY views DESC
LIMIT 50;

-- Purchase summary
CREATE OR REPLACE VIEW yayika_purchase_summary AS
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS purchases,
  COUNT(DISTINCT user_id) AS unique_buyers,
  SUM((properties->>'amount')::DECIMAL) AS total_revenue
FROM yayika_analytics
WHERE event_name = 'purchase'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;
