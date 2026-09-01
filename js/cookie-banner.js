/**
 * Cookie Consent Banner — Yayika
 * GDPR-compliant with "Reject All" equally prominent, GPC support, granular consent
 * Also covers CCPA/CPRA "Do Not Sell" and LGPD consent
 */

(function() {
  'use strict';

  // Detect language: localStorage > browser > fallback to Spanish
  function detectLang() {
    // 1. Check localStorage (user selected)
    const stored = localStorage.getItem('yayika_lang') || localStorage.getItem('yayika-lang');
    if (stored) return stored.split('-')[0];
    // 2. Check browser language
    const browserLang = (navigator.language || navigator.userLanguage || 'es').split('-')[0];
    const supported = ['es', 'en', 'pt', 'fr', 'de'];
    return supported.includes(browserLang) ? browserLang : 'es';
  }

  // Multi-language translations for cookie banner
  const COOKIE_I18N = {
    es: {
      cookie_title: 'Utilizamos cookies para mejorar tu experiencia',
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
    },
    en: {
      cookie_title: 'We use cookies to improve your experience',
      cookie_desc: 'Yayika uses <strong>strictly necessary</strong> cookies for platform functionality (sessions, preferences). Optionally, we use <strong>Plausible Analytics</strong> to improve our service — a privacy-respecting analytics system that does not use advertising tracking cookies. See our <a href="/politica-cookies-en.html" style="color: #7c3aed; text-decoration: underline;">Cookie Policy</a> for details.',
      cookie_necessary: 'Necessary — Always active (sessions, security, preferences)',
      cookie_analytics: 'Analytics — Plausible Analytics (privacy, no ads)',
      cookie_reject: 'Reject all',
      cookie_accept: 'Accept all',
      cookie_save: 'Save selection',
      cookie_ccpa: 'Do not sell or share my personal information',
      cookie_ccpa_note: ' (CCPA/CPRA — California)',
      cookie_gpc_notice: '🔒 Global Privacy Control (GPC) detected. Analytics cookies have been automatically disabled.',
      cookie_ccpa_alert: 'Analytics tracking has been disabled. Yayika does not sell or share personal information with third parties.',
    },
    pt: {
      cookie_title: 'Usamos cookies para melhorar sua experiência',
      cookie_desc: 'Yayika usa cookies <strong>estritamente necessários</strong> para o funcionamento da plataforma (sessões, preferências). Opcionalmente, usamos <strong>Plausible Analytics</strong> para melhorar nosso serviço — um sistema de análise respeitoso com a privacidade que não usa cookies de rastreamento publicitário. Consulte nossa <a href="/politica-cookies-pt.html" style="color: #7c3aed; text-decoration: underline;">Política de Cookies</a> para mais detalhes.',
      cookie_necessary: 'Necessários — Sempre ativos (sessões, segurança, preferências)',
      cookie_analytics: 'Análise — Plausible Analytics (privacidade, sem anúncios)',
      cookie_reject: 'Rejeitar tudo',
      cookie_accept: 'Aceitar tudo',
      cookie_save: 'Salvar seleção',
      cookie_ccpa: 'Não vender nem compartilhar minhas informações pessoais',
      cookie_ccpa_note: ' (CCPA/CPRA — California)',
      cookie_gpc_notice: '🔒 Controle de Privacidade Global (GPC) detectado. Cookies de análise foram desativados automaticamente.',
      cookie_ccpa_alert: 'O rastreamento de análise foi desativado. Yayika não vende nem compartilha informações pessoais com terceiros.',
    },
    fr: {
      cookie_title: 'Nous utilisons des cookies pour améliorer votre expérience',
      cookie_desc: 'Yayika utilise des cookies <strong>strictement nécessaires</strong> au fonctionnement de la plateforme (sessions, préférences). Nous utilisons optionnellement <strong>Plausible Analytics</strong> pour améliorer notre service — un système d\'analyse respectueux de la vie privée qui n\'utilise pas de cookies de suivi publicitaire. Consultez notre <a href="/politica-cookies-fr.html" style="color: #7c3aed; text-decoration: underline;">Politique de Cookies</a> pour plus de détails.',
      cookie_necessary: 'Nécessaires — Toujours actifs (sessions, sécurité, préférences)',
      cookie_analytics: 'Analyse — Plausible Analytics (confidentialité, sans publicité)',
      cookie_reject: 'Tout refuser',
      cookie_accept: 'Tout accepter',
      cookie_save: 'Enregistrer la sélection',
      cookie_ccpa: 'Ne pas vendre ni partager mes informations personnelles',
      cookie_ccpa_note: ' (CCPA/CPRA — Californie)',
      cookie_gpc_notice: '🔒 Contrôle mondial de la confidentialité (GPC) détecté. Les cookies d\'analyse ont été automatiquement désactivés.',
      cookie_ccpa_alert: 'Le suivi analytique a été désactivé. Yayika ne vend ni ne partage d\'informations personnelles avec des tiers.',
    },
    de: {
      cookie_title: 'Wir verwenden Cookies, um Ihr Erlebnis zu verbessern',
      cookie_desc: 'Yayika verwendet <strong>unbedingt notwendige</strong> Cookies für die Plattformfunktion (Sitzungen, Präferenzen). Optional nutzen wir <strong>Plausible Analytics</strong> zur Verbesserung unseres Services — ein datenschutzfreundliches Analyse-System ohne Werbe-Tracking-Cookies. Siehe unsere <a href="/politica-cookies-de.html" style="color: #7c3aed; text-decoration: underline;">Cookie-Richtlinie</a> für Details.',
      cookie_necessary: 'Notwendig — Immer aktiv (Sitzungen, Sicherheit, Präferenzen)',
      cookie_analytics: 'Analyse — Plausible Analytics (Datenschutz, keine Werbung)',
      cookie_reject: 'Alle ablehnen',
      cookie_accept: 'Alle akzeptieren',
      cookie_save: 'Auswahl speichern',
      cookie_ccpa: 'Persönliche Daten nicht verkaufen oder weitergeben',
      cookie_ccpa_note: ' (CCPA/CPRA — Kalifornien)',
      cookie_gpc_notice: '🔒 Global Privacy Control (GPC) erkannt. Analyse-Cookies wurden automatisch deaktiviert.',
      cookie_ccpa_alert: 'Analyse-Tracking wurde deaktiviert. Yayika verkauft oder gibt keine persönlichen Daten an Dritte weiter.',
    },
  };

  function ct(key) {
    const lang = detectLang();
    return (COOKIE_I18N[lang] && COOKIE_I18N[lang][key]) || COOKIE_I18N['es'][key] || key;
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

    const lang = detectLang();
    const cookieUrl = lang === 'es' ? '/politica-cookies.html' : `/politica-cookies-${lang}.html`;
    const cookieDesc = ct('cookie_desc').replace('/politica-cookies.html', cookieUrl);

    return `
    <div id="yayika-cookie-banner" role="dialog" aria-label="${ct('cookie_title')}" aria-modal="false" style="
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
          ${cookieDesc}
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

    // Add body padding so content isn't hidden behind the fixed banner
    var bannerEl = document.getElementById('yayika-cookie-banner');
    if (bannerEl) {
      document.body.style.paddingBottom = bannerEl.offsetHeight + 20 + 'px';
    }

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
      setTimeout(() => {
        banner.remove();
        document.body.style.paddingBottom = '';
      }, 300);
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
