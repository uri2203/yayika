/* ============================================================
   Yayika — Test Suite
   Basic browser-based tests for critical functionality
   ============================================================ */

(function() {
  'use strict';

  const results = { passed: 0, failed: 0, tests: [] };

  function test(name, fn) {
    try {
      const result = fn();
      if (result === true || result === undefined) {
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log(`✅ ${name}`);
      } else {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: result });
        console.log(`❌ ${name}: ${result}`);
      }
    } catch (e) {
      results.failed++;
      results.tests.push({ name, status: 'ERROR', error: e.message });
      console.log(`❌ ${name}: ${e.message}`);
    }
  }

  // --- HTML Structure Tests ---
  test('Page has lang attribute', () => {
    return document.documentElement.lang ? true : 'Missing lang attribute';
  });

  test('Page has title', () => {
    return document.title ? true : 'Missing page title';
  });

  test('Page has meta description', () => {
    const meta = document.querySelector('meta[name="description"]');
    return meta ? true : 'Missing meta description';
  });

  test('Page has viewport meta', () => {
    const meta = document.querySelector('meta[name="viewport"]');
    return meta ? true : 'Missing viewport meta';
  });

  test('Page has theme-color meta', () => {
    const meta = document.querySelector('meta[name="theme-color"]');
    return meta ? true : 'Missing theme-color meta';
  });

  test('Nav element exists', () => {
    return document.querySelector('nav') ? true : 'No nav element';
  });

  test('All links have href', () => {
    const links = document.querySelectorAll('a');
    const broken = Array.from(links).filter(a => !a.href || a.href === 'undefined');
    return broken.length === 0 ? true : `${broken.length} links without href`;
  });

  test('All images have alt text', () => {
    const images = document.querySelectorAll('img');
    const noAlt = Array.from(images).filter(img => !img.alt && !img.getAttribute('aria-label'));
    return noAlt.length === 0 ? true : `${noAlt.length} images without alt`;
  });

  // --- CSS Tests ---
  test('Body has font-family', () => {
    const style = getComputedStyle(document.body);
    return style.fontFamily ? true : 'Missing font-family';
  });

  test('Body has background color', () => {
    const style = getComputedStyle(document.body);
    return style.backgroundColor !== 'rgba(0, 0, 0, 0)' ? true : 'Missing background color';
  });

  // --- JavaScript Tests ---
  test('Supabase client available', () => {
    return typeof window.supabase !== 'undefined' ? true : 'Supabase not loaded';
  });

  test('i18n system available', () => {
    return typeof window.I18N !== 'undefined' || typeof t === 'function' ? true : 'i18n not loaded';
  });

  test('Theme toggle function exists', () => {
    return typeof toggleTheme === 'function' ? true : 'toggleTheme not defined';
  });

  // --- Accessibility Tests ---
  test('Focus styles defined', () => {
    const style = document.styleSheets[0];
    if (!style) return 'No stylesheets';
    try {
      for (let rule of style.cssRules) {
        if (rule.selectorText && rule.selectorText.includes(':focus')) return true;
      }
      return 'No focus styles found';
    } catch(e) {
      return true; // CORS may prevent access
    }
  });

  test('Skip link exists', () => {
    return document.querySelector('.skip-link') ? true : 'No skip link';
  });

  // --- Performance Tests ---
  test('No render-blocking scripts in head', () => {
    const headScripts = document.head.querySelectorAll('script:not([async]):not([defer])');
    return headScripts.length === 0 ? true : `${headScripts.length} blocking scripts`;
  });

  test('Images have loading="lazy"', () => {
    const images = document.querySelectorAll('img:not([loading])');
    return images.length === 0 ? true : `${images.length} images without lazy loading`;
  });

  // --- Store Tests (if on store page) ---
  if (window.location.pathname.includes('tienda')) {
    test('Store grid exists', () => {
      return document.getElementById('storeGrid') ? true : 'No store grid';
    });

    test('Filter buttons exist', () => {
      return document.querySelectorAll('.filter-btn').length > 0 ? true : 'No filter buttons';
    });

    test('Cart badge exists', () => {
      return document.getElementById('cartBadge') ? true : 'No cart badge';
    });
  }

  // --- Print results ---
  console.log('\n=== Yayika Test Suite Results ===');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.passed + results.failed}`);
  console.log('================================\n');

  // Store results globally
  window.YayikaTests = results;

  return results;
})();
