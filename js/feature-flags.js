/* ============================================================
   Yayika — Feature Flags (Web)
   Fetches flags from Supabase and caches them
   ============================================================ */

const SB_URL = 'https://odbhxiymteppgaqqdsoy.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';

const DEFAULT_FLAGS = {
  maintenance_mode: false,
  chat_ia: true,
  affiliates: true,
  courses: true,
  community: true,
  wellness_planner: true,
  growth_coach: true,
  push_notifications: true,
  weekly_challenges: true,
  dark_psychology: true,
};

let _flags = { ...DEFAULT_FLAGS };
let _loaded = false;
let _loading = false;

async function loadFlags() {
  if (_loading) return _flags;
  _loading = true;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/yayika_feature_flags?select=flag_key,is_enabled`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      data.forEach(f => { _flags[f.flag_key] = f.is_enabled; });
      _loaded = true;
    }
  } catch (e) {
    console.log('[FeatureFlags] Using defaults');
  }
  _loading = false;
  return _flags;
}

function isEnabled(flagKey) {
  return _flags[flagKey] === true;
}

function getAll() {
  return { ..._flags };
}

function forceRefresh() {
  _loaded = false;
  _loading = false;
  return loadFlags();
}

// Auto-load on script load
loadFlags();

// Refresh every 5 minutes
setInterval(loadFlags, 5 * 60 * 1000);

window.YayikaFlags = { isEnabled, getAll, loadFlags, forceRefresh };
