const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({ storageState: 'auth-state.json', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  const btn = await page.waitForSelector('text=/Nuevo proyecto|New project/i', { timeout: 10000 });
  if (btn) await btn.click();
  await page.waitForTimeout(5000);
  
  console.log('=== PASO 1: Abrir selector de modelo ===');
  // Click the Nano Banana 2 button to open the picker
  const modelBtn = await page.$('button:has-text("Nano Banana")');
  if (modelBtn) {
    await modelBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'debug-2-picker-open.png' });
    console.log('Picker abierto');
    
    // Get the picker HTML structure
    const pickerInfo = await page.evaluate(() => {
      const popper = document.querySelector('[data-radix-popper-content-wrapper]');
      if (!popper) return { error: 'no popper' };
      
      const html = popper.innerHTML;
      
      // Find all clickable elements in the popper
      const clickable = [];
      const els = popper.querySelectorAll('*');
      for (const el of els) {
        if (el.offsetParent !== null && el.textContent?.trim().length > 0 && el.textContent?.trim().length < 50) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            clickable.push({
              tag: el.tagName,
              text: el.textContent?.trim(),
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              role: el.getAttribute('role'),
              ariaSelected: el.getAttribute('aria-selected'),
              className: el.className?.substring(0, 60)
            });
          }
        }
      }
      
      return { htmlLength: html.length, elements: clickable };
    });
    console.log('Picker elements:', JSON.stringify(pickerInfo, null, 2));
    
    // PASO 2: Find and click the Video tab
    console.log('=== PASO 2: Click en tab Video ===');
    const videoClicked = await page.evaluate(() => {
      const popper = document.querySelector('[data-radix-popper-content-wrapper]');
      if (!popper) return 'no popper';
      
      // Find elements that contain "Video" text
      const els = popper.querySelectorAll('*');
      for (const el of els) {
        const text = el.textContent?.trim();
        // Match "Video" but not "videos" (to avoid sidebar menu items)
        if (text === 'Video' && el.offsetParent !== null) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && rect.y > 400) {
            el.click();
            return 'clicked: ' + el.tagName + ' at y=' + Math.round(rect.y);
          }
        }
      }
      
      // Try role=tab
      const tabs = popper.querySelectorAll('[role="tab"]');
      for (const tab of tabs) {
        if (tab.textContent?.includes('Video')) {
          tab.click();
          return 'clicked tab: ' + tab.textContent?.trim();
        }
      }
      
      return 'Video not found in popper';
    });
    console.log('Video click result:', videoClicked);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'debug-3-video-selected.png' });
    
    // Check what model is now shown
    const modelNow = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent?.includes('Omni') || b.textContent?.includes('Veo') || b.textContent?.includes('Video')) {
          if (b.offsetParent !== null) {
            return b.textContent?.trim();
          }
        }
      }
      return 'unknown';
    });
    console.log('Modelo actual:', modelNow);
    
    // PASO 3: Close the popup
    console.log('=== PASO 3: Cerrar popup ===');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    await page.click('body', { position: { x: 640, y: 400 }, force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'debug-4-popup-closed.png' });
    
    // PASO 4: Type prompt
    console.log('=== PASO 4: Escribir prompt ===');
    const inputEl = await page.$('[contenteditable="true"]');
    if (inputEl) {
      await inputEl.click({ force: true });
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await inputEl.fill('Cinematic close-up of a young professional woman sitting at a desk with coffee, morning golden light. 4K.');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'debug-5-prompt-typed.png' });
      console.log('Prompt escrito');
      
      // PASO 5: Click submit
      console.log('=== PASO 5: Click enviar ===');
      const submitBtn = await page.$('button:has-text("arrow_forward")');
      if (submitBtn) {
        await submitBtn.click({ force: true });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'debug-6-after-submit.png' });
        console.log('Enviado! Screenshot tomado');
        
        // Wait and check for generation
        for (let i = 0; i < 12; i++) {
          await page.waitForTimeout(5000);
          const hasVideo = await page.evaluate(() => {
            const v = document.querySelector('video');
            return v && v.offsetParent !== null;
          });
          const hasDl = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const b of btns) {
              if ((b.textContent?.includes('Download') || b.textContent?.includes('Descargar')) && b.offsetParent !== null) {
                return true;
              }
            }
            return false;
          });
          console.log(`Check ${i+1}: video=${hasVideo} download=${hasDl}`);
          if (hasDl || hasVideo) {
            await page.screenshot({ path: 'debug-7-video-ready.png' });
            console.log('VIDEO LISTO!');
            break;
          }
        }
      } else {
        console.log('Submit button not found');
        // List all buttons
        const btns = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null).map(b => b.textContent?.trim().substring(0, 40));
        });
        console.log('Available buttons:', btns);
      }
    } else {
      console.log('Input not found');
    }
  }
  
  await browser.close();
  console.log('Done');
})();
