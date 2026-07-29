// ============================================================
// Yayika — Service Worker v4
// Enhanced PWA: navigation preload, better offline, period sync
// ============================================================

const CACHE_VERSION = 'yayika-v4';
const STATIC_CACHE = 'yayika-static-v4';
const DYNAMIC_CACHE = 'yayika-dynamic-v4';
const OFFLINE_URL = '/offline.html';

// Static assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/splash.html',
  '/offline.html',
  '/Portales/index.html',
  '/afiliadas.html',
  '/soporte.html',
  '/modulo1.html',
  '/modulo2.html',
  '/modulo3.html',
  '/modulo4.html',
  '/modulo5.html',
  '/blog/',
  '/css/shared.css',
  '/js/app.js',
  '/js/i18n.js',
  '/js/cycle-tracker.js',
  '/js/financial-tracker.js',
  '/js/badges.js',
  '/js/ai-agent.js',
  '/js/admin.js',
  '/js/affiliate.js',
  '/js/theme.js',
  '/js/courses.js',
  '/manifest.json',
  '/icon.svg',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png'
];

// Install — pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches + enable navigation preload
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => {
      // Enable navigation preload where supported
      if (self.registration.navigationPreload) {
        return self.registration.navigationPreload.enable();
      }
    }).then(() => self.clients.claim())
  );
});

// Fetch — different strategies for different request types
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase/Stripe/Plausible API calls (always go to network)
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('api.stripe.com') ||
      url.hostname.includes('plausible.io') ||
      url.hostname.includes('pagead2.googlesyndication.com') ||
      url.hostname.includes('resend.com')) {
    event.respondWith(fetch(request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  // Skip cross-origin requests (CDN scripts, fonts, etc.) — stale-while-revalidate
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // HTML pages — network-first with navigation preload + offline fallback
  if (request.destination === 'document' || 
      request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (self.registration.navigationPreload
        ? self.registration.navigationPreload.response
        : Promise.resolve(null)
      ).then(preloadResponse => {
        if (preloadResponse) {
          // Cache the preload response
          const clone = preloadResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          return preloadResponse;
        }
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        });
      }).catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets — cache-first
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.webp')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        });
      }).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Default — cache-first with network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
        return response;
      });
    }).catch(() => caches.match(OFFLINE_URL))
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-cycle-log') {
    event.waitUntil(syncCycleLog());
  }
  if (event.tag === 'sync-finance') {
    event.waitUntil(syncFinance());
  }
});

async function syncCycleLog() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE', tag: 'cycle-log' });
  });
}

async function syncFinance() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE', tag: 'finance' });
  });
}

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Yayika';
  const body = data.body || 'Tienes una nueva notificación';
  
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/assets/img/icon-192.png',
      badge: '/icon.svg',
      vibrate: [200, 100, 200],
      tag: data.tag || 'yayika-notification',
      renotify: true,
      data: data.url || '/',
      actions: [
        { action: 'open', title: 'Abrir', icon: '/assets/img/icon-192.png' },
        { action: 'dismiss', title: 'Cerrar' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// Periodic background sync (for reminders, streaks)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'daily-reminder') {
    event.waitUntil(showDailyReminder());
  }
});

async function showDailyReminder() {
  const clients = await self.clients.matchAll();
  if (clients.length === 0) {
    self.registration.showNotification('Yayika', {
      body: '¡No olvides registrar tu día! Tu racha está en juego 🔥',
      icon: '/assets/img/icon-192.png',
      badge: '/icon.svg',
      tag: 'daily-reminder',
      data: '/Portales/'
    });
  }
}
