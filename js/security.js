/**
 * Yayika Security Module
 * Rate limiting, CSRF, brute force protection, session timeout, audit log
 */

const YayikaSecurity = (() => {
  // ============ CONFIGURATION ============
  const CONFIG = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    SESSION_TIMEOUT: 30 * 60 * 1000,  // 30 minutes
    CSRF_TOKEN_LENGTH: 32,
    RATE_LIMIT_WINDOW: 60 * 1000,     // 1 minute
    RATE_LIMIT_MAX: 10,                // 10 requests per window
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MIN_UPPER: 1,
    PASSWORD_MIN_LOWER: 1,
    PASSWORD_MIN_DIGIT: 1,
    PASSWORD_MIN_SPECIAL: 1,
  };

  // ============ RATE LIMITING ============
  function checkRateLimit(key) {
    const now = Date.now();
    const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;
    const storeKey = 'yayika_rl_' + key;
    
    let entries = [];
    try { entries = JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch(e) {}
    
    entries = entries.filter(t => t > windowStart);
    
    if (entries.length >= CONFIG.RATE_LIMIT_MAX) {
      localStorage.setItem(storeKey, JSON.stringify(entries));
      return false;
    }
    
    entries.push(now);
    localStorage.setItem(storeKey, JSON.stringify(entries));
    return true;
  }

  function getRateLimitRemaining(key) {
    const now = Date.now();
    const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;
    const storeKey = 'yayika_rl_' + key;
    
    let entries = [];
    try { entries = JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch(e) {}
    
    entries = entries.filter(t => t > windowStart);
    return Math.max(0, CONFIG.RATE_LIMIT_MAX - entries.length);
  }

  // ============ BRUTE FORCE PROTECTION ============
  function recordFailedAttempt(identifier) {
    const storeKey = 'yayika_bf_' + identifier;
    let data = { count: 0, firstAttempt: Date.now(), lastAttempt: Date.now() };
    try { data = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch(e) {}
    if (!data.count) data = { count: 0, firstAttempt: Date.now(), lastAttempt: Date.now() };
    data.count++;
    data.lastAttempt = Date.now();
    localStorage.setItem(storeKey, JSON.stringify(data));
  }

  function isLocked(identifier) {
    const storeKey = 'yayika_bf_' + identifier;
    let data = {};
    try { data = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch(e) {}
    if (!data || !data.count) return false;
    
    if (data.count >= CONFIG.MAX_LOGIN_ATTEMPTS) {
      const elapsed = Date.now() - data.lastAttempt;
      if (elapsed < CONFIG.LOCKOUT_DURATION) {
        return true;
      } else {
        localStorage.removeItem(storeKey);
        return false;
      }
    }
    return false;
  }

  function getRemainingLockoutTime(identifier) {
    const storeKey = 'yayika_bf_' + identifier;
    let data = {};
    try { data = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch(e) {}
    if (!data || data.count < CONFIG.MAX_LOGIN_ATTEMPTS) return 0;
    const elapsed = Date.now() - data.lastAttempt;
    const remaining = CONFIG.LOCKOUT_DURATION - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  function resetAttempts(identifier) {
    localStorage.removeItem('yayika_bf_' + identifier);
  }

  // ============ CSRF TOKEN ============
  function generateCSRFToken() {
    const array = new Uint8Array(CONFIG.CSRF_TOKEN_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  function setCSRFToken() {
    let token = sessionStorage.getItem('yayika_csrf');
    if (!token) {
      token = generateCSRFToken();
      sessionStorage.setItem('yayika_csrf', token);
    }
    return token;
  }

  function validateCSRFToken(token) {
    const stored = sessionStorage.getItem('yayika_csrf');
    return stored && stored === token;
  }

  // ============ CSRF FETCH WRAPPER ============
  function secureFetch(url, options = {}) {
    const token = sessionStorage.getItem('yayika_csrf');
    if (!options.headers) options.headers = {};
    options.headers['X-CSRF-Token'] = token;
    return fetch(url, options);
  }

  // ============ INPUT SANITIZATION ============
  function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  function sanitizeHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    const eventHandlers = ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur'];
    doc.querySelectorAll('*').forEach(el => {
      eventHandlers.forEach(handler => {
        if (el.hasAttribute(handler)) {
          el.removeAttribute(handler);
        }
      });
    });
    return doc.body.innerHTML;
  }

  // ============ PASSWORD VALIDATION ============
  function validatePasswordStrength(password) {
    const issues = [];
    
    // Common password check
    const common = ['password','123456','12345678','qwerty','abc123','letmein','admin','welcome','yayika','contraseña','123456789','1234567890','iloveyou','princess','rockyou','1234567','trustno1','sunshine','master','hello','charlie','donald','login','passw0rd','michael','shadow','123123','654321','superman','qwerty123','jessica','pepper','000000','harley','hunter2','test','dragon','summer','qwerty1','access','flower','hottie','loveme','zaq1zaq1','password1','password123','admin123','root','toor','pass','guest','master123','changeme','secret','1234','12345','1234567890','abc','abcdef','abcdefg','abcdef123','password!','password1!','letmein1','welcome1','monkey','dragon1','baseball','soccer','hockey','batman','thomas','ashley','michael1','jordan','superman1','harley1','ranger','buster','thunder','falcon','eagle','society','pussy','fuck','love','sex','money','weed','nigger','ass','hello1','charlie1','donald1','login1','master1','passw0rd1','shadow1','qwerty1','dragon1','summer1','flower1','access1'];
    const lang = document.documentElement.lang || 'es';
    const msgs = {
      es: { min: 'Mínimo', upper: 'Al menos 1 mayúscula', lower: 'Al menos 1 minúscula', digit: 'Al menos 1 número', special: 'Al menos 1 carácter especial', common: 'Contraseña demasiado común' },
      en: { min: 'Minimum', upper: 'At least 1 uppercase', lower: 'At least 1 lowercase', digit: 'At least 1 number', special: 'At least 1 special character', common: 'Password too common' },
      pt: { min: 'Mínimo', upper: 'Pelo menos 1 maiúscula', lower: 'Pelo menos 1 minúscula', digit: 'Pelo menos 1 número', special: 'Pelo menos 1 caractere especial', common: 'Senha muito comum' },
      fr: { min: 'Minimum', upper: 'Au moins 1 majuscule', lower: 'Au moins 1 minuscule', digit: 'Au moins 1 chiffre', special: 'Au moins 1 caractère spécial', common: 'Mot de passe trop commun' },
      de: { min: 'Minimum', upper: 'Mindestens 1 Großbuchstabe', lower: 'Mindestens 1 Kleinbuchstabe', digit: 'Mindestens 1 Ziffer', special: 'Mindestens 1 Sonderzeichen', common: 'Passwort zu häufig verwendet' }
    };
    const m = msgs[lang] || msgs.es;
    if (password.length < CONFIG.PASSWORD_MIN_LENGTH) {
      issues.push(m.min + ' ' + CONFIG.PASSWORD_MIN_LENGTH);
    }
    if ((password.match(/[A-Z]/g) || []).length < CONFIG.PASSWORD_MIN_UPPER) {
      issues.push(m.upper);
    }
    if ((password.match(/[a-z]/g) || []).length < CONFIG.PASSWORD_MIN_LOWER) {
      issues.push(m.lower);
    }
    if ((password.match(/[0-9]/g) || []).length < CONFIG.PASSWORD_MIN_DIGIT) {
      issues.push(m.digit);
    }
    if ((password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length < CONFIG.PASSWORD_MIN_SPECIAL) {
      issues.push(m.special);
    }
    if (common.some(c => password.toLowerCase().includes(c))) {
      issues.push(m.common);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      strength: getStrengthScore(password)
    };
  }

  function getStrengthScore(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    return score; // 0-5
  }

  function getStrengthLabel(score) {
    const lang = document.documentElement.lang || 'es';
    const labels = {
      es: ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte', 'Muy fuerte'],
      en: ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'],
      pt: ['Muito fraca', 'Fraca', 'Regular', 'Boa', 'Forte', 'Muito forte'],
      fr: ['Très faible', 'Faible', 'Passable', 'Bonne', 'Forte', 'Très forte'],
      de: ['Sehr schwach', 'Schwach', 'Mäßig', 'Gut', 'Stark', 'Sehr stark']
    };
    const colors = ['#dc2626', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#16a34a'];
    const l = labels[lang] || labels.es;
    return { label: l[score] || l[0], color: colors[score] || colors[0] };
  }

  // ============ SESSION TIMEOUT ============
  let sessionTimer = null;
  let lastActivity = Date.now();
  let sessionListeners = [];

  function startSessionTimeout(onTimeout) {
    // Clean up previous listeners
    stopSessionTimeout();
    
    lastActivity = Date.now();
    
    const resetTimer = () => {
      lastActivity = Date.now();
      if (sessionTimer) clearTimeout(sessionTimer);
      sessionTimer = setTimeout(() => {
        // Check if still inactive
        if (Date.now() - lastActivity >= CONFIG.SESSION_TIMEOUT) {
          if (onTimeout) onTimeout();
        }
      }, CONFIG.SESSION_TIMEOUT);
    };

    // Reset on user activity
    sessionListeners = [];
    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
      sessionListeners.push({ event, handler: resetTimer });
    });

    resetTimer();
  }

  function stopSessionTimeout() {
    if (sessionTimer) clearTimeout(sessionTimer);
    sessionListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler);
    });
    sessionListeners = [];
  }

  // ============ AUDIT LOG ============
  const auditLog = [];

  function logAction(action, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      userId: details.userId || 'anonymous',
      ip: details.ip || 'client-side',
      userAgent: navigator.userAgent,
      ...details
    };
    
    auditLog.push(entry);
    
    // Store in localStorage (limit to last 100 entries)
    try {
      const stored = JSON.parse(localStorage.getItem('yayika_audit_log') || '[]');
      stored.push(entry);
      if (stored.length > 100) stored.shift();
      localStorage.setItem('yayika_audit_log', JSON.stringify(stored));
    } catch (e) {}
    
    return entry;
  }

  function getAuditLog() {
    try {
      return JSON.parse(localStorage.getItem('yayika_audit_log') || '[]');
    } catch (e) {
      return [];
    }
  }

  // ============ DATA ENCRYPTION (AES-256-GCM via Web Crypto API) ============
  const ENCRYPTION_ALGO = 'AES-GCM';
  const ENCRYPTION_KEY_LENGTH = 256;
  const ENCRYPTION_IV_LENGTH = 12;

  async function deriveKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('yayika-salt-v1'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: ENCRYPTION_ALGO, length: ENCRYPTION_KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptData(data, password) {
    try {
      const key = await deriveKey(password || 'yayika-default-key');
      const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_IV_LENGTH));
      const enc = new TextEncoder();
      const encrypted = await crypto.subtle.encrypt(
        { name: ENCRYPTION_ALGO, iv },
        key,
        enc.encode(JSON.stringify(data))
      );
      // Combine IV + ciphertext and base64 encode
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      return btoa(String.fromCharCode(...combined));
    } catch (e) {
      return null;
    }
  }

  async function decryptData(encrypted, password) {
    try {
      const key = await deriveKey(password || 'yayika-default-key');
      const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
      const iv = combined.slice(0, ENCRYPTION_IV_LENGTH);
      const ciphertext = combined.slice(ENCRYPTION_IV_LENGTH);
      const decrypted = await crypto.subtle.decrypt(
        { name: ENCRYPTION_ALGO, iv },
        key,
        ciphertext
      );
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
      return null;
    }
  }

  // ============ REQUEST SIZE LIMITS ============
  const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

  function validateRequestSize(data) {
    const size = new Blob([JSON.stringify(data)]).size;
    return size <= MAX_REQUEST_SIZE;
  }

  function sanitizeFormData(formData) {
    const sanitized = {};
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value).substring(0, 10000); // Max 10KB per field
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // ============ CORS VALIDATION ============
  const ALLOWED_ORIGINS = [
    'https://yayika.com',
    'https://www.yayika.com',
    'http://localhost:3000', // Development
    'http://localhost:5500'  // Live Server
  ];

  function validateCORS(origin) {
    return ALLOWED_ORIGINS.includes(origin);
  }

  // ============ HELPER: SAFE QUERY SELECTOR ============
  function safeQuerySelector(selector) {
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  // ============ PUBLIC API ============
  return {
    CONFIG,
    rateLimit: { check: checkRateLimit, remaining: getRateLimitRemaining },
    bruteForce: { record: recordFailedAttempt, isLocked, getRemainingLockoutTime, reset: resetAttempts },
    csrf: { generate: generateCSRFToken, set: setCSRFToken, validate: validateCSRFToken, secureFetch },
    sanitize: { input: sanitizeInput, html: sanitizeHTML },
    password: { validate: validatePasswordStrength, getStrengthScore, getStrengthLabel },
    session: { start: startSessionTimeout, stop: stopSessionTimeout },
    audit: { log: logAction, get: getAuditLog },
    encryption: { encrypt: encryptData, decrypt: decryptData, ENCRYPTION_ALGO },
    requestSize: { validate: validateRequestSize, sanitizeForm: sanitizeFormData, MAX: MAX_REQUEST_SIZE },
    cors: { validate: validateCORS, origins: ALLOWED_ORIGINS },
    safeQuerySelector
  };
})();

// Auto-initialize
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    YayikaSecurity.csrf.set();
  });
}
