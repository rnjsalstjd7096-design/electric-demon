// Offline support for the web version. Network first, so a fresh deploy reaches players on their next visit
// (the game changes often); the cache only answers when the network does not. Query strings (index.html's ?v=
// cache-busting stamp) are dropped from cache keys so the cache keeps one copy of each file.
// __BUILD__ is replaced by web/build.mjs on every build; a new value makes the browser install a new worker.
const CACHE = 'edd-v3.33-ae87fc09';
const FILES = ['./', 'index.html', 'electric_demon_defense_v2.2.html', 'privacy.html', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('edd-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  url.search = '';
  const key = url.href;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key).then(hit => hit || Response.error())));
});
