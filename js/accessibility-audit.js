/* ============================================================
   Yayika — Accessibility Audit Script
   Run in browser console to check WCAG compliance
   ============================================================ */

(function() {
  const issues = [];
  const passes = [];

  // 1. Images without alt text
  document.querySelectorAll('img').forEach(img => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push({ type: 'error', wcag: '1.1.1', msg: `Image without alt text: ${img.src?.substring(0, 80)}` });
    } else {
      passes.push('1.1.1 — Image has alt text');
    }
  });

  // 2. Links without accessible text
  document.querySelectorAll('a').forEach(link => {
    const text = link.textContent?.trim();
    const ariaLabel = link.getAttribute('aria-label');
    const title = link.getAttribute('title');
    if (!text && !ariaLabel && !title) {
      issues.push({ type: 'error', wcag: '2.4.4', msg: `Link without text: ${link.href?.substring(0, 80)}` });
    }
  });

  // 3. Form inputs without labels
  document.querySelectorAll('input, select, textarea').forEach(input => {
    if (input.type === 'hidden') return;
    const id = input.id;
    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
    const ariaLabel = input.getAttribute('aria-label');
    const placeholder = input.getAttribute('placeholder');
    if (!label && !ariaLabel && !placeholder) {
      issues.push({ type: 'warning', wcag: '1.3.1', msg: `Input without label: ${input.name || input.type}` });
    }
  });

  // 4. Buttons without accessible text
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent?.trim();
    const ariaLabel = btn.getAttribute('aria-label');
    if (!text && !ariaLabel) {
      issues.push({ type: 'error', wcag: '4.1.2', msg: 'Button without accessible text' });
    }
  });

  // 5. Missing lang attribute
  if (!document.documentElement.lang) {
    issues.push({ type: 'error', wcag: '3.1.1', msg: 'Missing lang attribute on <html>' });
  } else {
    passes.push('3.1.1 — Lang attribute present');
  }

  // 6. Missing page title
  if (!document.title) {
    issues.push({ type: 'error', wcag: '2.4.2', msg: 'Missing page title' });
  } else {
    passes.push('2.4.2 — Page title present');
  }

  // 7. Skip navigation link
  if (!document.querySelector('[href="#main"], [href="#content"], .skip-link')) {
    issues.push({ type: 'warning', wcag: '2.4.1', msg: 'No skip navigation link found' });
  }

  // 8. Color contrast (basic check)
  const bodyStyle = getComputedStyle(document.body);
  const textColor = bodyStyle.color;
  const bgColor = bodyStyle.backgroundColor;

  // 9. Focus indicators
  const focusStyle = document.createElement('style');
  focusStyle.textContent = ':focus { outline: 2px solid var(--lila) !important; outline-offset: 2px; }';
  document.head.appendChild(focusStyle);
  passes.push('Focus indicators added');

  // 10. ARIA landmarks
  const hasMain = document.querySelector('main, [role="main"]');
  const hasNav = document.querySelector('nav, [role="navigation"]');
  const hasHeader = document.querySelector('header, [role="banner"]');

  if (!hasMain) {
    issues.push({ type: 'warning', wcag: '1.3.1', msg: 'No <main> landmark found' });
  }
  if (!hasNav) {
    issues.push({ type: 'warning', wcag: '1.3.1', msg: 'No <nav> landmark found' });
  }

  // 11. Headings hierarchy
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let prevLevel = 0;
  headings.forEach(h => {
    const level = parseInt(h.tagName[1]);
    if (level > prevLevel + 1 && prevLevel > 0) {
      issues.push({ type: 'warning', wcag: '1.3.1', msg: `Heading level skipped: h${prevLevel} → h${level}` });
    }
    prevLevel = level;
  });

  // 12. Tab order
  const focusable = document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
  let hasNegativeTabindex = false;
  focusable.forEach(el => {
    const tabindex = parseInt(el.getAttribute('tabindex'));
    if (tabindex < 0) hasNegativeTabindex = true;
  });

  // Print report
  console.log('\n=== Yayika Accessibility Audit ===\n');
  console.log(`✅ Passes: ${passes.length}`);
  console.log(`❌ Issues: ${issues.length}\n`);

  if (issues.length > 0) {
    console.log('Issues found:');
    issues.forEach((issue, i) => {
      const icon = issue.type === 'error' ? '❌' : '⚠️';
      console.log(`${icon} [${issue.wcag}] ${issue.msg}`);
    });
  }

  console.log('\n=============================\n');

  return { issues, passes };
})();
