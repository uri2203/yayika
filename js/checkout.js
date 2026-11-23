/* Yayika — Checkout Functions (loaded FIRST, global scope, no IIFE) */
var PRODUCT_LINKS = {
  'ciclo-productiva': 'https://buy.stripe.com/eVq6oH8yWfsS248cX3gA80c',
  'dinero-sin-pena': 'https://buy.stripe.com/4gMbJ16qO5SidMQe17gA80d',
  'mujer-que-negocia': 'https://buy.stripe.com/8x2eVd5mK94uaAE8GNgA80e',
  'semilla': 'https://buy.stripe.com/00wcN502q0xY2481elgA80f',
  'guerrera': 'https://buy.stripe.com/14A4gzeXk0xY4cg3mtgA80g',
  'diamante': 'https://buy.stripe.com/cNi9ATdTgfsSbEI4qxgA80h'
};

// Attach the Supabase user id so the Stripe webhook can identify the buyer.
function yayikaWithClientReference(link) {
  try {
    var userId = (typeof currentUser !== 'undefined' && currentUser && currentUser.id) || null;
    if (!userId) {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf('sb-') !== 0 || key.indexOf('-auth-token') === -1) continue;
        try {
          var session = JSON.parse(localStorage.getItem(key));
          if (session && session.user && session.user.id) {
            userId = session.user.id;
            break;
          }
        } catch (e) {}
      }
    }
    if (!userId) return link;
    var url = new URL(link);
    url.searchParams.set('client_reference_id', userId);
    return url.toString();
  } catch (e) {
    return link;
  }
}

function buyProduct(key) {
  console.log('[Yayika] buyProduct called:', key);
  try {
    if (typeof plausible !== 'undefined') {
      plausible('Checkout Start', { props: { product: key, type: 'one-time' } });
    }
  } catch(e) {}
  var link = PRODUCT_LINKS[key];
  if (!link || link.indexOf('PLACEHOLDER') !== -1) {
    window.location.href = '#membresia';
    return;
  }
  window.location.href = yayikaWithClientReference(link);
}

function startCheckout(plan) {
  console.log('[Yayika] startCheckout called:', plan);
  try {
    if (typeof plausible !== 'undefined') {
      plausible('Checkout Start', { props: { product: plan, type: 'subscription' } });
    }
  } catch(e) {}
  var link = PRODUCT_LINKS[plan];
  if (!link || link.indexOf('PLACEHOLDER') !== -1) {
    var msg = typeof t === 'function' ? t('checkout_membership_coming_soon') : (typeof I18N !== 'undefined' && I18N[currentLang] && I18N[currentLang]['checkout_membership_coming_soon']) || 'Pronto estaran disponibles los planes de membresia.';
    alert(msg);
    return;
  }
  window.location.href = yayikaWithClientReference(link);
}

function dismissInstallBanner() {
  var b = document.getElementById('installBanner');
  if (b) b.style.display = 'none';
  try {
    localStorage.setItem('yayika-ios-dismissed', '1');
    localStorage.setItem('yayika-install-never-show', '1');
  } catch(e) {}
}

function closeIOSModal() {
  var m = document.getElementById('iosInstallModal');
  if (m) m.style.display = 'none';
}

function installApp() {
  try {
    if (typeof isIOS === 'function' && isIOS()) {
      var m = document.getElementById('iosInstallModal');
      if (m) m.style.display = 'flex';
      return;
    }
  } catch(e) {}
  try {
    if (typeof deferredPrompt !== 'undefined' && deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function(c) {
        deferredPrompt = null;
        var b = document.getElementById('installBanner');
        if (b) b.style.display = 'none';
        if (c.outcome === 'accepted') {
          try { localStorage.setItem('yayika-app-installed', '1'); } catch(e) {}
        }
      });
    }
  } catch(e) {}
}

/* =========================================================
   BACKUP: addEventListener fallback for ALL checkout buttons
   Even if onclick handlers fail, this catches clicks
   ========================================================= */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachBackupListeners);
} else {
  attachBackupListeners();
}

function attachBackupListeners() {
  // Product buy buttons
  var productBtns = document.querySelectorAll('.hcard-btn, .btn-buy');
  productBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var oc = this.getAttribute('onclick');
      if (oc) {
        var m = oc.match(/buyProduct\(['"]([^'"]+)['"]\)/);
        if (m) { buyProduct(m[1]); return; }
      }
    }, true);
  });

  // Membership plan buttons
  var planBtns = document.querySelectorAll('.plan-btn');
  planBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var oc = this.getAttribute('onclick');
      if (oc) {
        var m = oc.match(/startCheckout\(['"]([^'"]+)['"]\)/);
        if (m) { startCheckout(m[1]); return; }
      }
    }, true);
  });

  // Install banner buttons
  var dismissBtns = document.querySelectorAll('[onclick*="dismissInstallBanner"]');
  dismissBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      dismissInstallBanner();
    }, true);
  });

  var installBtns = document.querySelectorAll('[onclick*="installApp"]');
  installBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      installApp();
    }, true);
  });

  // IOS modal close
  var iosBtns = document.querySelectorAll('[onclick*="closeIOSModal"]');
  iosBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeIOSModal();
    }, true);
  });

  console.log('[Yayika] Backup listeners attached to', productBtns.length + planBtns.length, 'buttons');
}

console.log('[Yayika] checkout.js v2 loaded — all functions in global scope');
