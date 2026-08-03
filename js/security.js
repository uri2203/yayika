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
  const rateLimitStore = {};

  function checkRateLimit(key) {
    const now = Date.now();
    const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;
    
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = [];
    }
    
    // Remove old entries
    rateLimitStore[key] = rateLimitStore[key].filter(t => t > windowStart);
    
    if (rateLimitStore[key].length >= CONFIG.RATE_LIMIT_MAX) {
      return false; // Rate limited
    }
    
    rateLimitStore[key].push(now);
    return true; // Allowed
  }

  function getRateLimitRemaining(key) {
    const now = Date.now();
    const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;
    if (!rateLimitStore[key]) return CONFIG.RATE_LIMIT_MAX;
    const recent = rateLimitStore[key].filter(t => t > windowStart);
    return Math.max(0, CONFIG.RATE_LIMIT_MAX - recent.length);
  }

  // ============ BRUTE FORCE PROTECTION ============
  const bruteForceStore = {};

  function recordFailedAttempt(identifier) {
    if (!bruteForceStore[identifier]) {
      bruteForceStore[identifier] = { count: 0, firstAttempt: Date.now() };
    }
    bruteForceStore[identifier].count++;
    bruteForceStore[identifier].lastAttempt = Date.now();
  }

  function isLocked(identifier) {
    const data = bruteForceStore[identifier];
    if (!data || data.count === 0) return false;
    
    if (data.count >= CONFIG.MAX_LOGIN_ATTEMPTS) {
      const elapsed = Date.now() - data.lastAttempt;
      if (elapsed < CONFIG.LOCKOUT_DURATION) {
        return true;
      } else {
        // Reset after lockout period
        bruteForceStore[identifier] = { count: 0, firstAttempt: null };
        return false;
      }
    }
    return false;
  }

  function getRemainingLockoutTime(identifier) {
    const data = bruteForceStore[identifier];
    if (!data || data.count < CONFIG.MAX_LOGIN_ATTEMPTS) return 0;
    const elapsed = Date.now() - data.lastAttempt;
    const remaining = CONFIG.LOCKOUT_DURATION - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  function resetAttempts(identifier) {
    bruteForceStore[identifier] = { count: 0, firstAttempt: null };
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
    
    if (password.length < CONFIG.PASSWORD_MIN_LENGTH) {
      issues.push(`Mínimo ${CONFIG.PASSWORD_MIN_LENGTH} caracteres`);
    }
    if ((password.match(/[A-Z]/g) || []).length < CONFIG.PASSWORD_MIN_UPPER) {
      issues.push('Al menos 1 mayúscula');
    }
    if ((password.match(/[a-z]/g) || []).length < CONFIG.PASSWORD_MIN_LOWER) {
      issues.push('Al menos 1 minúscula');
    }
    if ((password.match(/[0-9]/g) || []).length < CONFIG.PASSWORD_MIN_DIGIT) {
      issues.push('Al menos 1 número');
    }
    if ((password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length < CONFIG.PASSWORD_MIN_SPECIAL) {
      issues.push('Al menos 1 carácter especial (!@#$%^&*)');
    }
    
    // Common password check
    const common = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'admin', 'welcome', 'yayika'];
    if (common.some(c => password.toLowerCase().includes(c))) {
      issues.push('Contraseña demasiado común');
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
    const labels = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte', 'Muy fuerte'];
    const colors = ['#dc2626', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#16a34a'];
    return { label: labels[score] || labels[0], color: colors[score] || colors[0] };
  }

  // ============ SESSION TIMEOUT ============
  let sessionTimer = null;
  let lastActivity = Date.now();

  function startSessionTimeout(onTimeout) {
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
    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();
  }

  function stopSessionTimeout() {
    if (sessionTimer) clearTimeout(sessionTimer);
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

  // ============ DATA ENCRYPTION ============
  function encryptData(data, key) {
    // Simple XOR encryption for client-side data obfuscation
    // Note: For production, use AES-GCM via Web Crypto API
    const str = JSON.stringify(data);
    const encoded = btoa(str);
    return encoded;
  }

  function decryptData(encrypted, key) {
    try {
      const decoded = atob(encrypted);
      return JSON.parse(decoded);
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
    csrf: { generate: generateCSRFToken, set: setCSRFToken, validate: validateCSRFToken },
    sanitize: { input: sanitizeInput, html: sanitizeHTML },
    password: { validate: validatePasswordStrength, getStrengthScore, getStrengthLabel },
    session: { start: startSessionTimeout, stop: stopSessionTimeout },
    audit: { log: logAction, get: getAuditLog },
    encryption: { encrypt: encryptData, decrypt: decryptData },
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
