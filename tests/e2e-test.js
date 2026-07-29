const { chromium } = require('playwright');

const BASE_URL = 'https://yayika.com';
const TEST_USER = { email: 'laura@yayika.com', password: 'Yayika2025!' };
let passed = 0, failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    results.push({ name, status: 'PASS' });
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message.substring(0, 100)}`);
    results.push({ name, status: 'FAIL', error: e.message.substring(0, 100) });
    failed++;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  
  console.log('\n🧪 YAYIKA END-TO-END TESTS\n');
  
  // ===== 1. LANDING PAGE =====
  console.log('📄 1. LANDING PAGE');
  const page = await context.newPage();
  
  await test('Landing page loads', async () => {
    const resp = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!resp.ok()) throw new Error(`HTTP ${resp.status()}`);
  });
  
  await test('Title contains Yayika', async () => {
    const title = await page.title();
    if (!title.includes('Yayika')) throw new Error(`Title: ${title}`);
  });
  
  await test('Meta description exists', async () => {
    const desc = await page.$eval('meta[name="description"]', el => el.content);
    if (!desc || desc.length < 20) throw new Error('Missing or short');
  });
  
  await test('JSON-LD structured data', async () => {
    const ld = await page.$('script[type="application/ld+json"]');
    if (!ld) throw new Error('No JSON-LD found');
  });
  
  await test('Manifest link exists', async () => {
    const manifest = await page.$('link[rel="manifest"]');
    if (!manifest) throw new Error('No manifest link');
  });
  
  await test('Plausible analytics loaded', async () => {
    const plausible = await page.$('script[data-domain="yayika.com"]');
    if (!plausible) throw new Error('No Plausible script');
  });
  
  // ===== 2. LOGIN FLOW =====
  console.log('\n🔐 2. LOGIN FLOW');
  
  await test('Portales page loads', async () => {
    const resp = await page.goto(`${BASE_URL}/Portales/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!resp.ok()) throw new Error(`HTTP ${resp.status()}`);
  });
  
  await test('Login form visible', async () => {
    const emailInput = await page.$('input[type="email"], input[name="email"], #loginEmail');
    const passInput = await page.$('input[type="password"], input[name="password"], #loginPass');
    if (!emailInput || !passInput) throw new Error('Login form not found');
  });
  
  await test('Login with test user', async () => {
    // Fill email
    const emailInput = await page.$('input[type="email"], input[name="email"], #loginEmail');
    await emailInput.fill(TEST_USER.email);
    
    // Fill password
    const passInput = await page.$('input[type="password"], input[name="password"], #loginPass');
    await passInput.fill(TEST_USER.password);
    
    // Click login button
    const loginBtn = await page.$('button[type="submit"], button:has-text("Iniciar"), button:has-text("Entrar"), button:has-text("Log")');
    if (!loginBtn) throw new Error('Login button not found');
    await loginBtn.click();
    
    // Wait for dashboard
    await page.waitForTimeout(5000);
    
    // Check if we're past the login screen
    const url = page.url();
    const hasDashboard = await page.$('.dashboard, #dashboard, [class*="widget"], [class*="portal"]');
    if (!hasDashboard && url.includes('Portales')) {
      // Check for user-specific content
      const bodyText = await page.textContent('body');
      if (bodyText.includes('Laura') || bodyText.includes('Dashboard') || bodyText.includes('Mi Portal')) {
        return; // Login successful
      }
      throw new Error('Dashboard not loaded after login');
    }
  });
  
  await test('User greeting visible', async () => {
    const bodyText = await page.textContent('body');
    if (!bodyText.includes('Laura') && !bodyText.includes('Bienvenida') && !bodyText.includes('Mi Portal')) {
      throw new Error('No user greeting found');
    }
  });
  
  // ===== 3. DASHBOARD WIDGETS =====
  console.log('\n📊 3. DASHBOARD WIDGETS');
  
  await test('Cycle tracker widget loads', async () => {
    const cycleWidget = await page.$('#cycleWidget, [class*="cycle"], [class*="Ciclo"]');
    if (!cycleWidget) {
      const body = await page.textContent('body');
      if (!body.includes('Ciclo') && !body.includes('cycle') && !body.includes('Fase')) {
        throw new Error('Cycle widget not found');
      }
    }
  });
  
  await test('Finance tracker widget loads', async () => {
    const financeWidget = await page.$('#financeWidget, [class*="finance"], [class*="Finance"]');
    if (!financeWidget) {
      const body = await page.textContent('body');
      if (!body.includes('Finanzas') && !body.includes('Presupuesto') && !body.includes('finance')) {
        throw new Error('Finance widget not found');
      }
    }
  });
  
  await test('Badges widget loads', async () => {
    const badgesWidget = await page.$('#badgesWidget, [class*="badge"], [class*="Badge"]');
    if (!badgesWidget) {
      const body = await page.textContent('body');
      if (!body.includes('Badge') && !body.includes('Logro') && !body.includes('badge')) {
        throw new Error('Badges widget not found');
      }
    }
  });
  
  await test('AI Chat widget loads', async () => {
    const aiWidget = await page.$('#aiChatWidget, [class*="ai-chat"], [class*="AI"]');
    if (!aiWidget) {
      const body = await page.textContent('body');
      if (!body.includes('Laura') && !body.includes('Chat') && !body.includes('Asistente')) {
        throw new Error('AI Chat widget not found');
      }
    }
  });
  
  await test('Dark mode toggle exists', async () => {
    const themeToggle = await page.$('[class*="theme"], [class*="dark"], [id*="theme"], button:has-text("🌙"), button:has-text("☀")');
    if (!themeToggle) {
      const body = await page.textContent('body');
      if (!body.includes('🌙') && !body.includes('☀') && !body.includes('Tema')) {
        throw new Error('Theme toggle not found');
      }
    }
  });
  
  // ===== 4. CYCLE TRACKER =====
  console.log('\n🩸 4. CYCLE TRACKER');
  
  await test('Cycle log button exists', async () => {
    const logBtn = await page.$('button:has-text("Registrar"), button:has-text("Log"), button:has-text("Añadir"), [class*="register-cycle"]');
    if (!logBtn) {
      const body = await page.textContent('body');
      if (!body.includes('Registrar') && !body.includes('Register') && !body.includes('Añadir')) {
        throw new Error('Cycle log button not found');
      }
    }
  });
  
  await test('Freeze token section exists', async () => {
    const freezeSection = await page.$('#freezeTokenSection, [class*="freeze"]');
    // It may be hidden (display:none) - that's OK, just check it exists
    if (!freezeSection) {
      const html = await page.content();
      if (!html.includes('freeze') && !html.includes('congelar')) {
        throw new Error('Freeze token section not in DOM');
      }
    }
  });
  
  // ===== 5. AI CHAT =====
  console.log('\n🤖 5. AI CHAT');
  
  await test('AI chat widget container exists', async () => {
    const html = await page.content();
    if (!html.includes('aiChatWidget') && !html.includes('AIAgent')) {
      throw new Error('AI chat widget not in DOM');
    }
  });
  
  // ===== 6. AFFILIATE PAGE =====
  console.log('\n🤝 6. AFFILIATE PAGE');
  
  await test('Afiliadas page loads', async () => {
    const resp = await page.goto(`${BASE_URL}/afiliadas.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!resp.ok()) throw new Error(`HTTP ${resp.status()}`);
  });
  
  await test('Affiliate registration inputs exist', async () => {
    const emailInput = await page.$('#affEmail, input[type="email"]');
    const passInput = await page.$('#affPassword, input[type="password"]');
    if (!emailInput || !passInput) throw new Error('Registration inputs not found');
  });
  
  await test('Commission info visible', async () => {
    const body = await page.textContent('body');
    if (!body.includes('30%') && !body.includes('comisión') && !body.includes('commission')) {
      throw new Error('Commission info not found');
    }
  });
  
  // ===== 7. STATIC PAGES =====
  console.log('\n📄 7. STATIC PAGES');
  
  const pages = [
    { url: '/privacidad.html', name: 'Privacy', check: 'privacidad' },
    { url: '/terminos.html', name: 'Terms', check: 'términos' },
    { url: '/blog/', name: 'Blog', check: 'Blog' },
    { url: '/sitemap.xml', name: 'Sitemap', check: 'urlset' },
    { url: '/robots.txt', name: 'Robots', check: 'User-agent' },
    { url: '/manifest.json', name: 'Manifest', check: 'name' }
  ];
  
  for (const p of pages) {
    await test(`${p.name} loads (${p.url})`, async () => {
      const resp = await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      if (!resp.ok()) throw new Error(`HTTP ${resp.status()}`);
      const body = await page.textContent('body');
      if (!body.toLowerCase().includes(p.check.toLowerCase())) {
        throw new Error(`Content "${p.check}" not found`);
      }
    });
  }
  
  // ===== 8. SUPABASE API =====
  console.log('\n🗄️  8. SUPABASE API');
  
  const SUPABASE_URL = 'https://odbhxiymteppgaqqdsoy.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';
  
  await test('Supabase auth API responds', async () => {
    const resp = await page.goto(`${SUPABASE_URL}/auth/v1/health`, { waitUntil: 'domcontentloaded' });
    // 200 or 401 both mean the endpoint is reachable
    if (!resp.ok() && resp.status() !== 401) throw new Error(`HTTP ${resp.status()}`);
  });
  
  await test('User login via API', async () => {
    const resp = await page.evaluate(async ({ url, key, email, pass }) => {
      const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      return { status: r.status, ok: r.ok };
    }, { url: SUPABASE_URL, key: ANON_KEY, email: TEST_USER.email, pass: TEST_USER.password });
    if (!resp.ok) throw new Error(`Auth failed: ${resp.status}`);
  });
  
  await test('Edge Functions accessible', async () => {
    const resp = await page.goto(`${SUPABASE_URL}/functions/v1/stripe-webhook`, { waitUntil: 'domcontentloaded' });
    // 200, 401, or 405 (method not allowed) all mean the endpoint exists
    if (resp.status() >= 500) throw new Error(`HTTP ${resp.status()}`);
  });
  
  // ===== SUMMARY =====
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}\n`);
  
  if (failed > 0) {
    console.log('❌ FAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
