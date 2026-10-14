// Minimal service worker — only caches assets that can never go stale:
//   • /_app/immutable/*  (SvelteKit build output, content-hashed filenames)
//   • /uploads/*         (uploaded images, unique generated filenames)
// Everything else (pages, page-data, API, dev-server modules, manifest, …) goes straight to
// the network. Caching unhashed files cache-first made normal refreshes serve stale JS/Svelte
// modules (e.g. an admin editor missing newly added features) until a hard reload.
const CACHE = 'vendwiz-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Evict all caches from previous versions (v2 and earlier cached unhashed files)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const cacheable =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_app/immutable/') || url.pathname.startsWith('/uploads/'));

  // Not cacheable: don't intercept — the browser handles it normally.
  if (!cacheable) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
