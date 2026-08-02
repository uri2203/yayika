/* ============================================================
   Yayika — Performance Module
   Lazy loading, resource hints, image optimization
   ============================================================ */

(function() {
  'use strict';

  // --- Lazy Loading for images ---
  function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
      // Browser supports native lazy loading
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.loading = 'lazy';
      });
    } else {
      // Fallback with Intersection Observer
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });

      document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
    }
  }

  // --- Defer non-critical scripts ---
  function deferScripts() {
    document.querySelectorAll('script[data-defer]').forEach(script => {
      script.defer = true;
    });
  }

  // --- Preload critical resources ---
  function preloadCritical() {
    const criticalFonts = [
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap'
    ];

    criticalFonts.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  // --- Resource hints ---
  function addResourceHints() {
    const hints = [
      { rel: 'dns-prefetch', href: 'https://odbhxiymteppgaqqdsoy.supabase.co' },
      { rel: 'dns-prefetch', href: 'https://js.stripe.com' },
      { rel: 'dns-prefetch', href: 'https://plausible.io' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true }
    ];

    hints.forEach(hint => {
      if (!document.querySelector(`link[href="${hint.href}"]`)) {
        const link = document.createElement('link');
        Object.assign(link, hint);
        document.head.appendChild(link);
      }
    });
  }

  // --- Optimize images with WebP ---
  function supportsWebP() {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // --- Reduce layout shifts ---
  function preventLayoutShifts() {
    // Set explicit dimensions for images without them
    document.querySelectorAll('img:not([width]):not([height])').forEach(img => {
      if (img.naturalWidth && img.naturalHeight) {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
      }
    });

    // Add aspect ratio for product images
    document.querySelectorAll('.product-img, .idea-card .emoji').forEach(el => {
      if (!el.style.aspectRatio) {
        el.style.aspectRatio = '16/10';
      }
    });
  }

  // --- Cache management ---
  function initCache() {
    if ('caches' in window) {
      caches.open('yayika-v1').then(cache => {
        // Cache critical resources
        const criticalUrls = ['/css/shared.css', '/js/i18n.js', '/manifest.json'];
        cache.addAll(criticalUrls).catch(() => {});
      });
    }
  }

  // --- Service Worker registration ---
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  // --- Performance monitoring ---
  function trackPerformance() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'largest-contentful-paint') {
              window.YayikaPerf = window.YayikaPerf || {};
              window.YayikaPerf.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              window.YayikaPerf = window.YayikaPerf || {};
              window.YayikaPerf.fid = entry.processingStart - entry.startTime;
            }
          });
        });
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
      } catch(e) {}
    }

    // Track CLS
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              window.YayikaPerf = window.YayikaPerf || {};
              window.YayikaPerf.cls = clsValue;
            }
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch(e) {}
    }
  }

  // --- Init ---
  function init() {
    addResourceHints();
    preloadCritical();
    deferScripts();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initLazyLoading();
        preventLayoutShifts();
      });
    } else {
      initLazyLoading();
      preventLayoutShifts();
    }

    registerSW();
    trackPerformance();
  }

  init();
})();
