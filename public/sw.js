const CACHE_PREFIX = 'fare-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;

function referencedAssetPaths(html, pageUrl) {
  const keep = new Set();
  const pattern = /(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(pattern)) {
    try {
      const url = new URL(match[1], pageUrl);
      if (url.origin === new URL(pageUrl).origin && url.pathname.includes('/assets/')) {
        keep.add(url.pathname);
      }
    } catch {
      // Skip a malformed URL in the shell.
    }
  }
  return keep;
}

async function pruneHashedAssets(cache, html, pageUrl) {
  const keep = referencedAssetPaths(html, pageUrl);
  if (keep.size === 0) return;
  const keys = await cache.keys();
  await Promise.all(keys.map((request) => {
    const path = new URL(request.url).pathname;
    if (path.includes('/assets/') && !keep.has(path)) return cache.delete(request);
    return undefined;
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(self.registration.scope))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
          try {
            await pruneHashedAssets(cache, await response.clone().text(), response.url || request.url);
          } catch {
            // Keep the navigation response even when the shell cannot be parsed.
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? caches.match(self.registration.scope)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
