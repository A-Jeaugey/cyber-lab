/* sw.js — service worker offline pour Cyber Lab.
   - App shell + assets : cache-first.
   - index.json & .md : network-first (contenu frais), fallback cache.
   - Google Fonts : cache-first runtime.
   Bumpe CACHE pour invalider après un gros changement. */

const CACHE = 'cyber-lab-v6';
const CORE = [
  './',
  'index.html',
  'assets/css/styles.css',
  'assets/js/app.js',
  'assets/js/markdown.js',
  'assets/js/search.js',
  'assets/js/ingest.js',
  'assets/js/config.js',
  'content/index.json',
  'assets/manifest.webmanifest',
  'assets/icons/favicon.svg',
  'assets/icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navigation SPA → réseau puis fallback index.html en cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Fonts Google : cache-first
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(req));
    return;
  }

  // Ne pas intercepter les appels API GitHub (ingestion)
  if (url.hostname === 'api.github.com') return;

  if (url.origin === location.origin) {
    // Contenu dynamique : network-first
    if (/index\.json$|\.md$/.test(url.pathname)) {
      e.respondWith(networkFirst(req));
      return;
    }
    // Assets (js/css/html/icônes) : stale-while-revalidate
    // -> sert le cache tout de suite, met à jour en arrière-plan pour le prochain chargement.
    e.respondWith(staleWhileRevalidate(req));
  }
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
    return res;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw err;
  }
}
