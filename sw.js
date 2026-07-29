// ============================================================
// Yayika — Service Worker v3
// Cache-first for static assets, network-first for API calls
// ============================================================

const CACHE_VERSION = 'yayika-v3';
const STATIC_CACHE = 'yayika-static-v3';
const DYNAMIC_CACHE = 'yayika-dynamic-v3';
const OFFLINE_URL = '/offline.html';

// Static assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/Portales/index.html',
  '/afiliadas.html',
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

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — different strategies for different request types
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API calls (always go to network)
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('api.stripe.com') ||
      url.hostname.includes('plausible.io')) {
    event.respondWith(fetch(request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  // Skip cross-origin requests (CDN scripts, fonts, etc.)
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
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
      url.pathname.endsWith('.mp4')) {
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

  // HTML pages — network-first with offline fallback
  if (request.destination === 'document' || 
      request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_URL)))
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
});

async function syncCycleLog() {
  // Read pending logs from IndexedDB and sync when back online
  // This will be implemented in the client-side JS
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE', tag: 'cycle-log' });
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
      data: data.url || '/'
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
