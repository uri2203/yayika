/**
 * Cookie Consent Banner — Yayika
 * GDPR-compliant with "Reject All" equally prominent, GPC support, granular consent
 * Also covers CCPA/CPRA "Do Not Sell" and LGPD consent
 */

(function() {
  'use strict';

  // Helper: use i18n if available, otherwise fallback to Spanish
  function ct(key) {
    try {
      if (typeof t === 'function') return t(key);
    } catch(e) {}
    // Fallback to ES
    const es = {
      cookie_title: '🍪 Utilizamos cookies para mejorar tu experiencia',
      cookie_desc: 'Yayika utiliza cookies <strong>estrictamente necesarias</strong> para el funcionamiento de la plataforma (sesiones, preferencias). Opcionalmente, utilizamos <strong>Plausible Analytics</strong> para mejorar nuestro servicio — es un sistema de análisis respetuoso con la privacidad que no utiliza cookies de rastreo publicitario. Consulta nuestra <a href="/politica-cookies.html" style="color: #7c3aed; text-decoration: underline;">Política de Cookies</a> para más detalles.',
      cookie_necessary: 'Necesarias — Siempre activas (sesiones, seguridad, preferencias)',
      cookie_analytics: 'Análisis — Plausible Analytics (privacidad, sin publicidad)',
      cookie_reject: 'Rechazar todo',
      cookie_accept: 'Aceptar todo',
      cookie_save: 'Guardar selección',
      cookie_ccpa: 'No vender ni compartir mi información personal',
      cookie_ccpa_note: ' (CCPA/CPRA — California)',
      cookie_gpc_notice: '🔒 Se detectó Global Privacy Control (GPC) activo. Las cookies de análisis han sido deshabilitadas automáticamente.',
      cookie_ccpa_alert: 'Se ha deshabilitado el rastreo de análisis. Yayika no vende ni comparte información personal con terceros.',
    };
    return es[key] || key;
  }

  const STORAGE_KEY = 'yayika_cookie_consent';
  const CONSENT_VERSION = '1.0';

  // Check if Global Privacy Control is enabled
  function detectGPC() {
    return navigator.globalPrivacyControl === true;
  }

  // Get stored consent
  function getStoredConsent() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && stored.version === CONSENT_VERSION) return stored;
    } catch(e) {}
    return null;
  }

  // Save consent
  function saveConsent(preferences) {
    const consent = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      gpc: detectGPC(),
      categories: {
        necessary: true, // Always true
        analytics: preferences.analytics || false,
        preferences: preferences.preferences || false
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    
    // Dispatch event for other scripts to react
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));
    
    // Apply consent
    applyConsent(consent);
  }

  // Apply consent decisions
  function applyConsent(consent) {
    // Plausible Analytics — only load if analytics consent is given
    if (consent.categories.analytics) {
      if (!document.querySelector('script[data-plausible]')) {
        const script = document.createElement('script');
        script.defer = true;
        script.dataset.plausible = '';
        script.src = 'https://plausible.io/js/script.js';
        script.dataset.domain = 'yayika.com';
        document.head.appendChild(script);
      }
    } else {
      // Remove Plausible script if it exists
      const plausible = document.querySelector('script[data-plausible]');
      if (plausible) plausible.remove();
      // Plausible uses cookies by default — if analytics is denied, we ensure no Plausible cookies
      if (window.plausible) {
        // Plausible doesn't have a built-in disable, but removing the script stops tracking
      }
    }
  }

  // Create banner HTML
  function createBannerHTML() {
    const isGPC = detectGPC();
    const gpcNotice = isGPC 
      ? '<p style="font-size:12px; color:#888; margin-top:8px;">' + ct('cookie_gpc_notice') + '</p>'
      : '';

    return `
    <div id="yayika-cookie-banner" role="dialog" aria-label="Consentimiento de cookies" aria-modal="false" style="
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;
      background: #fff; border-top: 1px solid #e5e7eb;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.1); padding: 20px 24px;
      font-family: 'DM Sans', sans-serif; font-size: 14px; color: #333;
      max-height: 50vh; overflow-y: auto;
    ">
      <div style="max-width: 900px; margin: 0 auto;">
        <p style="margin: 0 0 12px 0; font-weight: 500;">
          ${ct('cookie_title')}
        </p>
        <p style="margin: 0 0 16px 0; line-height: 1.6; font-size: 13px; color: #555;">
          ${ct('cookie_desc')}
        </p>
        ${gpcNotice}
        
        <!-- Granular consent -->
        <div style="margin: 16px 0; padding: 12px; background: #f9fafb; border-radius: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: default;">
            <input type="checkbox" checked disabled style="accent-color: #7c3aed;">
            <span><strong>${ct('cookie_necessary')}</strong></span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;">
            <input type="checkbox" id="yayika-analytics-consent" ${isGPC ? '' : 'checked'} style="accent-color: #7c3aed;">
            <span><strong>${ct('cookie_analytics')}</strong></span>
          </label>
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <button id="yayika-cookie-reject" style="
            padding: 10px 20px; border: 1px solid #d1d5db; border-radius: 8px;
            background: #fff; color: #374151; font-weight: 500; cursor: pointer;
            font-size: 14px; flex: 1; min-width: 120px;
          ">${ct('cookie_reject')}</button>
          
          <button id="yayika-cookie-accept" style="
            padding: 10px 20px; border: none; border-radius: 8px;
            background: #7c3aed; color: #fff; font-weight: 500; cursor: pointer;
            font-size: 14px; flex: 1; min-width: 120px;
          ">${ct('cookie_accept')}</button>
          
          <button id="yayika-cookie-save" style="
            padding: 10px 20px; border: 1px solid #7c3aed; border-radius: 8px;
            background: #fff; color: #7c3aed; font-weight: 500; cursor: pointer;
            font-size: 14px; flex: 1; min-width: 120px;
          ">${ct('cookie_save')}</button>
        </div>

        <!-- CCPA Do Not Sell link for US visitors -->
        <p style="margin-top: 12px; font-size: 12px; color: #888;">
          <a href="#" id="yayika-do-not-sell" style="color: #888; text-decoration: underline;">${ct('cookie_ccpa')}</a>${ct('cookie_ccpa_note')}
        </p>
      </div>
    </div>`;
  }

  // Initialize
  function init() {
    // Check if consent already stored
    const existing = getStoredConsent();
    if (existing) {
      applyConsent(existing);
      return;
    }

    // If GPC is detected, auto-apply no-analytics
    if (detectGPC()) {
      saveConsent({ analytics: false, preferences: false });
      return;
    }

    // Show banner
    document.body.insertAdjacentHTML('beforeend', createBannerHTML());

    // Button handlers
    document.getElementById('yayika-cookie-reject').addEventListener('click', function() {
      saveConsent({ analytics: false, preferences: false });
      removeBanner();
    });

    document.getElementById('yayika-cookie-accept').addEventListener('click', function() {
      saveConsent({ analytics: true, preferences: true });
      removeBanner();
    });

    document.getElementById('yayika-cookie-save').addEventListener('click', function() {
      const analytics = document.getElementById('yayika-analytics-consent').checked;
      saveConsent({ analytics: analytics, preferences: analytics });
      removeBanner();
    });

    // CCPA Do Not Sell
    document.getElementById('yayika-do-not-sell').addEventListener('click', function(e) {
      e.preventDefault();
      saveConsent({ analytics: false, preferences: false });
      removeBanner();
      alert(ct('cookie_ccpa_alert'));
    });
  }

  function removeBanner() {
    const banner = document.getElementById('yayika-cookie-banner');
    if (banner) {
      banner.style.transition = 'opacity 0.3s, transform 0.3s';
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(100%)';
      setTimeout(() => banner.remove(), 300);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for programmatic access
  window.YayikaCookieConsent = {
    getConsent: getStoredConsent,
    updateConsent: saveConsent,
    hasConsent: function(category) {
      const c = getStoredConsent();
      return c ? c.categories[category] === true : false;
    }
  };
})();
