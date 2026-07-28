const { chromium } = require('playwright');
const path = require('path');

const AUTH_FILE = path.join(__dirname, 'auth-state.json');
const FLOW_URL = 'https://labs.google/fx/tools/flow';

async function setupLogin() {
  console.log('=== GOOGLE FLOW LOGIN SETUP ===');
  console.log('Abriendo Chrome...\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('========================================');
  console.log('INICIA SESION EN GOOGLE FLOW');
  console.log('========================================');
  console.log('Tienes 120 segundos para hacer login.');
  console.log('Cuando veas la interfaz de Flow, esperamos.');
  console.log('========================================\n');

  // Wait 120 seconds for user to login
  await new Promise(resolve => setTimeout(resolve, 120000));

  // Save session
  console.log('Guardando sesion...');
  await context.storageState({ path: AUTH_FILE });
  console.log(`Sesion guardada en: ${AUTH_FILE}`);

  await browser.close();
  console.log('\n=== LOGIN COMPLETADO ===');
  console.log('Ejecuta ahora: node generate-videos.js');
}

setupLogin().catch(console.error);
