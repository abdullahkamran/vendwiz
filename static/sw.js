// Minimal service worker — network-first for navigations, page-data, and API;
// cache-first only for versioned static assets and uploads.
const CACHE = 'vendwiz-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Evict all caches from previous versions
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-first: navigations, SvelteKit page-data, and all API routes
  if (
    event.request.mode === 'navigate' ||
    url.pathname.includes('/__data.json') ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static assets (JS/CSS bundles have content hashes; images under /uploads/)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
