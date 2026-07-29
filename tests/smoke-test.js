// ============================================================
// Yayika — Basic Smoke Tests
// Run: node tests/smoke-test.js
// ============================================================

const SUPABASE_URL = 'https://odbhxiymteppgaqqdsoy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function fetchJSON(path, options = {}) {
  const resp = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, ...options.headers },
    ...options
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function main() {
  console.log('\n🧪 Yayika Smoke Tests\n');
  
  // ===== API Connectivity =====
  console.log('📡 API Connectivity');
  await test('Supabase endpoint reachable', async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
    // 200 or 401 both mean the endpoint is reachable
    assert(r.ok || r.status === 401, `Unreachable: ${r.status}`);
  });
  
  await test('Auth API responds', async () => {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { 'apikey': SUPABASE_KEY } });
    assert(resp.ok, `HTTP ${resp.status}`);
  });
  
  // ===== Tables Exist =====
  console.log('\n🗄️  Tables');
  const requiredTables = [
    'yayika_profiles', 'yayika_progress', 'yayika_activity_log',
    'yayika_module_completions', 'yayika_cycle_log', 'yayika_cycle_insights',
    'yayika_daily_mood', 'yayika_daily_checks',
    'yayika_badges', 'yayika_budget', 'yayika_transactions',
    'yayika_savings_goals', 'yayika_cycle_predictions',
    'yayika_freeze_log', 'yayika_course_notes', 'yayika_bookmarks',
    'yayika_user_prefs', 'yayika_weekly_challenges',
    'yayika_circles', 'yayika_circle_members', 'yayika_circle_messages',
    'yayika_exercise_responses', 'yayika_saved_ideas',
    'yayika_affiliates', 'yayika_referrals', 'yayika_commissions',
    'yayika_payouts', 'yayika_link_clicks', 'yayika_subscriptions'
  ];
  
  for (const table of requiredTables) {
    await test(`Table ${table} exists`, async () => {
      await fetchJSON(`/rest/v1/${table}?limit=1`);
    });
  }
  
  // ===== Columns Check =====
  console.log('\n📋 Columns');
  await test('yayika_progress has freeze_tokens', async () => {
    const r = await fetchJSON('/rest/v1/yayika_progress?select=freeze_tokens&limit=1');
    assert(r.length === 0 || 'freeze_tokens' in r[0], 'Missing freeze_tokens column');
  });
  
  await test('yayika_progress has total_freezes_used', async () => {
    const r = await fetchJSON('/rest/v1/yayika_progress?select=total_freezes_used&limit=1');
    assert(r.length === 0 || 'total_freezes_used' in r[0], 'Missing total_freezes_used column');
  });
  
  await test('yayika_subscriptions has stripe_customer_id', async () => {
    const r = await fetchJSON('/rest/v1/yayika_subscriptions?select=stripe_customer_id&limit=1');
    assert(r.length === 0 || 'stripe_customer_id' in r[0], 'Missing stripe_customer_id column');
  });
  
  // ===== Functions Check =====
  console.log('\n⚙️  Functions');
  await test('Function yayika_generate_ref_code exists', async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/yayika_generate_ref_code`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: '00000000-0000-0000-0000-000000000000' })
    });
    // 200 = success, 401 = requires auth (function exists but needs login), 403 = permission issue
    assert(r.ok || r.status === 401 || r.status === 403, `HTTP ${r.status}`);
  });
  
  await test('Function yayika_process_referral exists', async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/yayika_process_referral`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_ref_code: 'INVALID', p_referred_user_id: '00000000-0000-0000-0000-000000000000' })
    });
    assert(r.ok || r.status === 401 || r.status === 403, `HTTP ${r.status}`);
  });
  
  await test('Function yayika_use_freeze exists', async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/yayika_use_freeze`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: '00000000-0000-0000-0000-000000000000' })
    });
    assert(r.ok || r.status === 401 || r.status === 403, `HTTP ${r.status}`);
  });
  
  await test('Function yayika_request_payout exists', async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/yayika_request_payout`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: '00000000-0000-0000-0000-000000000000', p_amount: 100 })
    });
    assert(r.ok || r.status === 401 || r.status === 403, `HTTP ${r.status}`);
  });
  
  // ===== Static Files =====
  console.log('\n🌐 Static Files');
  const staticFiles = [
    'https://yayika.com/',
    'https://yayika.com/Portales/',
    'https://yayika.com/afiliadas.html',
    'https://yayika.com/js/app.js',
    'https://yayika.com/js/admin.js',
    'https://yayika.com/js/affiliate.js',
    'https://yayika.com/js/ai-agent.js',
    'https://yayika.com/js/i18n.js',
    'https://yayika.com/manifest.json',
    'https://yayika.com/sitemap.xml'
  ];
  
  for (const url of staticFiles) {
    const shortName = url.replace('https://yayika.com/', '/');
    await test(`GET ${shortName}`, async () => {
      const r = await fetch(url);
      assert(r.ok, `HTTP ${r.status}`);
    });
  }
  
  // ===== Summary =====
  console.log(`\n${'='.repeat(40)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Test runner error:', e.message); process.exit(1); });
