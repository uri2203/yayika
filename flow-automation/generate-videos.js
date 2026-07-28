const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const AUTH_FILE = path.join(__dirname, 'auth-state.json');
const PROMPTS_FILE = path.join(__dirname, 'prompts.json');
const DOWNLOAD_DIR = path.join(__dirname, '..', 'videos', 'modulo1');
const FLOW_URL = 'https://labs.google/fx/tools/flow';

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function ensureVideoMode(page) {
  // Check if already in video mode
  const alreadyVideo = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      const text = b.textContent?.trim();
      if (text && b.offsetParent !== null) {
        const rect = b.getBoundingClientRect();
        if (rect.y > 700 && rect.x > 600) {
          if (text.includes('Video') || text.includes('Veo') || text.includes('Omni') || text.includes('Fotogramas')) {
            return true;
          }
        }
      }
    }
    return false;
  });

  if (alreadyVideo) {
    console.log('  Ya en modo VIDEO');
    return true;
  }

  console.log('  Cambiando a modo VIDEO...');
  
  // Find the model button at bottom area
  const modelBtnClicked = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.offsetParent !== null) {
        const rect = b.getBoundingClientRect();
        if (rect.y > 700 && rect.x > 600 && rect.width > 80 && rect.width < 250) {
          const text = b.textContent?.trim();
          if (text && text.length > 3 && !text.includes('arrow_forward')) {
            b.click();
            return text.substring(0, 40);
          }
        }
      }
    }
    return null;
  });

  if (!modelBtnClicked) {
    console.log('  ERROR: No se encontro boton de modelo');
    return false;
  }

  console.log(`  Picker abierto: "${modelBtnClicked}"`);
  await sleep(2500);

  // Find and click Video/Vídeo tab in the picker
  // The tab text is "videocamVídeo" or contains "Vídeo" with accent
  const videoClicked = await page.evaluate(() => {
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      const text = el.textContent?.trim();
      if (text && el.offsetParent !== null) {
        const rect = el.getBoundingClientRect();
        // Look for the Video/Vídeo tab button in the picker area
        if (rect.y > 400 && rect.y < 550 && rect.width > 50 && rect.height > 20 && rect.height < 50) {
          // Match "Vídeo" (with accent) or "videocam" prefix
          if (text.includes('Vídeo') || text.includes('videocam') || text === 'Video') {
            el.click();
            return 'clicked: ' + text.substring(0, 30);
          }
        }
      }
    }
    return 'not found';
  });

  console.log('  Click Video:', videoClicked);
  await sleep(2500);

  // Verify video mode
  const switched = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      const text = b.textContent?.trim();
      if (text && b.offsetParent !== null) {
        const rect = b.getBoundingClientRect();
        if (rect.y > 700 && rect.x > 600) {
          if (text.includes('Video') || text.includes('Veo') || text.includes('Omni') || text.includes('Fotogramas')) {
            return true;
          }
        }
      }
    }
    return false;
  });

  console.log(switched ? '  Video mode ACTIVADO' : '  WARN: Video mode no confirmado');

  // Close popup
  await page.keyboard.press('Escape');
  await sleep(500);
  await page.click('body', { position: { x: 200, y: 400 }, force: true });
  await sleep(1000);

  return switched;
}

async function generateVideo(page, promptData, index) {
  console.log(`\n[${index + 1}/${prompts.length}] Generando: ${promptData.name}`);

  try {
    console.log('  Navegando a Flow...');
    await page.goto(FLOW_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(3000);

    try {
      const closeBtn = await page.$('button:has-text("×"), [aria-label="Close"]');
      if (closeBtn && await closeBtn.isVisible()) {
        await closeBtn.click({ force: true });
        await sleep(1000);
      }
    } catch (e) {}

    console.log('  Creando nuevo proyecto...');
    const nuevoProyecto = await page.waitForSelector('text=/Nuevo proyecto|New project/i', { timeout: 10000 });
    if (nuevoProyecto) {
      await nuevoProyecto.click({ force: true });
      await sleep(5000);
    } else {
      console.log('  ERROR: No se encontro "Nuevo proyecto"');
      return false;
    }

    await ensureVideoMode(page);
    await page.screenshot({ path: path.join(DOWNLOAD_DIR, `ready-${promptData.name}.png`) });

    console.log('  Escribiendo prompt...');
    const inputEl = await page.$('[contenteditable="true"]');
    if (!inputEl) {
      console.log('  ERROR: No se encontro input');
      return false;
    }

    await inputEl.click({ force: true });
    await sleep(300);
    await page.keyboard.press('Control+A');
    await sleep(100);
    await page.keyboard.press('Backspace');
    await sleep(100);
    await inputEl.fill(promptData.prompt);
    await sleep(1000);

    await page.screenshot({ path: path.join(DOWNLOAD_DIR, `typed-${promptData.name}.png`) });
    console.log('  Prompt escrito');

    console.log('  Enviando...');
    const submitX = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      let maxX = 0;
      for (const b of btns) {
        if (b.offsetParent !== null) {
          const rect = b.getBoundingClientRect();
          if (rect.y > 700 && rect.x > maxX) maxX = rect.x;
        }
      }
      return maxX > 0 ? maxX : null;
    });

    if (submitX) {
      await page.click('body', { position: { x: submitX + 16, y: 730 }, force: true });
      console.log(`  Click enviado (x=${submitX})`);
      await sleep(5000);
    } else {
      console.log('  ERROR: No se encontro boton de envio');
      return false;
    }

    console.log('  Esperando generacion del video...');
    let downloadReady = false;
    let attempts = 0;
    const maxAttempts = 90;

    while (!downloadReady && attempts < maxAttempts) {
      await sleep(5000);
      attempts++;

      const dlBtn = await page.$('button:has-text("Download"), button:has-text("Descargar"), [aria-label*="ownload"]');
      if (dlBtn && await dlBtn.isVisible()) {
        downloadReady = true;
        console.log(`  Video listo! (${attempts * 5}s)`);
        break;
      }

      const hasVideo = await page.evaluate(() => {
        const v = document.querySelector('video');
        if (v && v.offsetParent !== null) {
          const src = v.src || v.querySelector('source')?.src;
          if (src && !src.includes('banner') && !src.includes('io2026')) return true;
        }
        return false;
      });
      
      if (hasVideo) {
        console.log(`  Video player detectado (${attempts * 5}s)`);
        await sleep(5000);
        downloadReady = true;
      }

      if (attempts % 6 === 0) {
        console.log(`  Generando... (${attempts * 5}s)`);
        await page.screenshot({ path: path.join(DOWNLOAD_DIR, `progress-${promptData.name}-${attempts}.png`) });
      }
    }

    if (!downloadReady) {
      console.log('  WARN: Timeout');
      await page.screenshot({ path: path.join(DOWNLOAD_DIR, `timeout-${promptData.name}.png`) });
      return false;
    }

    console.log('  Descargando...');
    const downloadPath = path.join(DOWNLOAD_DIR, `${String(index + 1).padStart(2, '0')}-${promptData.name}.mp4`);

    try {
      const dlBtn = await page.$('button:has-text("Download"), button:has-text("Descargar"), [aria-label*="ownload"]');
      if (dlBtn && await dlBtn.isVisible()) {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 60000 }),
          dlBtn.click({ force: true })
        ]);
        await download.saveAs(downloadPath);
        console.log(`  Guardado: ${downloadPath}`);
        return true;
      }

      const videoUrl = await page.evaluate(() => {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (v.closest('[class*="banner"]')) continue;
          const src = v.src || v.querySelector('source')?.src;
          if (src && !src.includes('banner') && !src.includes('io2026')) return src;
        }
        return null;
      });

      if (videoUrl) {
        const videoBuffer = await page.evaluate(async (url) => {
          const res = await fetch(url);
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }, videoUrl);
        
        const base64Data = videoBuffer.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(downloadPath, buffer);
        console.log(`  Guardado: ${downloadPath} (${buffer.length} bytes)`);
        return true;
      }

    } catch (e) {
      console.log(`  ERROR descarga: ${e.message}`);
      return false;
    }

    return false;

  } catch (error) {
    console.log(`  ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== GOOGLE FLOW VIDEO AUTOMATION v9 ===');
  console.log(`Prompts: ${prompts.length}`);
  console.log(`Output: ${DOWNLOAD_DIR}\n`);

  if (!fs.existsSync(AUTH_FILE)) {
    console.log('ERROR: Ejecuta primero: node setup-login.js');
    return;
  }

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
  });

  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  const results = [];
  for (let i = 0; i < prompts.length; i++) {
    const success = await generateVideo(page, prompts[i], i);
    results.push({ ...prompts[i], success });
    if (i < prompts.length - 1) {
      console.log('  Pausa de 10s...');
      await sleep(10000);
    }
  }

  console.log('\n=== RESUMEN ===');
  const ok = results.filter(r => r.success).length;
  const fail = results.filter(r => !r.success).length;
  console.log(`Exitosos: ${ok}/${results.length}`);
  console.log(`Fallidos: ${fail}/${results.length}`);
  if (fail > 0) {
    results.filter(r => !r.success).forEach(r => console.log(`  - ${r.name}`));
  }

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  console.log('\n=== COMPLETADO ===');
}

main().catch(console.error);
