/* Offline shell for the 3D stage.
 *
 * Written by hand instead of generated so the caching policy stays legible:
 *  - navigations are network-first, so a fresh deploy is never masked by an old
 *    cached HTML shell (the usual stale-PWA trap);
 *  - hashed build output (/assets/), models, draco decoders and audio are
 *    stale-while-revalidate, which is safe because they are immutable by name;
 *  - the last successful navigation is cached per URL, so the work pages and
 *    the index both open offline.
 *
 * __BUILD_ID__ is replaced at build time (scripts/build-pwa.mjs) — a new build
 * gets a new cache name and the old one is deleted on activate.
 */
const BUILD_ID = '__BUILD_ID__';
const CACHE = 'stage-' + BUILD_ID;
const NAV_FALLBACK = './index.html';
const PRECACHE = ['./', './index.html', './favicon.svg', './manifest.webmanifest', './icon-192.png'];
const IMMUTABLE = /\/assets\/|\/models\/|\/draco\/|\/audio\//;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('stage-') && k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Range requests (audio scrubbing) cannot be satisfied from a plain cache entry.
  if (req.headers.has('range')) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(event));
    return;
  }
  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});

// Network first, keep the last good copy per URL, fall back to the offline shell.
function networkFirst(event) {
  const req = event.request;
  const cacheP = caches.open(CACHE);
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        return cacheP
          .then((cache) => cache.put(req, res.clone()))
          .then(() => res)
          .catch(() => res);
      }
      return res;
    })
    .catch(async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const fallback = await caches.match(NAV_FALLBACK);
      if (fallback) return fallback;
      return new Response('离线且没有缓存副本 / Offline and no cached copy', {
        status: 503,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    });
}

// Serve the cached copy immediately, refresh it in the background.
function staleWhileRevalidate(event) {
  const req = event.request;
  const cacheP = caches.open(CACHE);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) cacheP.then((cache) => cache.put(req, res.clone())).catch(() => {});
      return res;
    })
    .catch(() => undefined);
  return caches.match(req).then((cached) => cached || network).then((res) => res || fetch(req));
}
