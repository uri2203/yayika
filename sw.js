const CACHE = 'yayika-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/Portales/index.html',
  '/modulo1.html',
  '/modulo2.html',
  '/modulo3.html',
  '/modulo4.html',
  '/modulo5.html',
  '/css/shared.css',
  '/js/app.js',
  '/icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
