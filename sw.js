const APP_VERSION = 'v4.11';
const CACHE_NAME = `talous-cache-${APP_VERSION}`;
const urlsToCache = [
  `/Talous/index.html?${APP_VERSION}`,
  `/Talous/manifest.json?${APP_VERSION}`,
  `/Talous/sw.js?${APP_VERSION}`,
  // Core styles/scripts (adjust paths as needed)
  `/Talous/style.css?${APP_VERSION}`,
  `/Talous/index.css?${APP_VERSION}`,
  // Feature pages
  `/Talous/transactions/transactions.html?${APP_VERSION}`,
  `/Talous/charts/charts.html?${APP_VERSION}`,
  `/Talous/tools/tools.html?${APP_VERSION}`,
  `/Talous/settings/settings.html?${APP_VERSION}`,
  // Page-specific styles
  `/Talous/transactions/transactions.css?${APP_VERSION}`,
  `/Talous/charts/charts.css?${APP_VERSION}`,
  `/Talous/tools/tools.css?${APP_VERSION}`,
  `/Talous/settings/settings.css?${APP_VERSION}`,
  // Scripts
  `/Talous/index.js?${APP_VERSION}`,
  `/Talous/transactions/transactions.js?${APP_VERSION}`,
  `/Talous/charts/charts.js?${APP_VERSION}`,
  `/Talous/tools/tools.js?${APP_VERSION}`,
  `/Talous/settings/settings.js?${APP_VERSION}`,
  `/Talous/example/example.js?${APP_VERSION}`,
  `/Talous/example/minimal.js?${APP_VERSION}`,
  // Icons
  `/Talous/icons/favicon.svg?${APP_VERSION}`,
  `/Talous/icons/web-app-manifest-192x192.png?${APP_VERSION}`,
  `/Talous/icons/web-app-manifest-512x512.png?${APP_VERSION}`,
  `/Talous/icons/apple-touch-icon.png?${APP_VERSION}`,
  `/Talous/icons/favicon-96x96.png?${APP_VERSION}`,
  // External CDNs (no versioning)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/luxon@3/build/global/luxon.min.js'
];

// Install event: Cache resources and skip waiting
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => console.error('Service Worker: Cache failed:', error))
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches and claim clients
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Serve from cache or fetch from network
self.addEventListener('fetch', event => {
  const { request } = event;
  // Normalise index.html requests stripping query for fallback
  const url = new URL(request.url);
  const isHTML = request.destination === 'document';
  event.respondWith((async () => {
    try {
      // Try cache first for static assets & HTML shell
      const cached = await caches.match(request);
      if (cached) {
        // Background refresh (non-blocking)
        fetchAndUpdateCache(request);
        return cached;
      }
      const network = await fetchAndUpdateCache(request);
      return network;
    } catch (err) {
      console.warn('Offline fallback triggered:', err);
      if (isHTML) {
        return (await caches.match(`/Talous/index.html?${APP_VERSION}`)) || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
      return new Response('', { status: 504 });
    }
  })());
});

// Function to fetch from network and update cache
async function fetchAndUpdateCache(request) {
  try {
    const networkResponse = await fetch(request);
    // Only cache valid responses (status 200) for GET requests
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      console.log('Service Worker: Updated cache for', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('Network fetch failed:', error);
    throw error;
  }
}

// Notify clients of updates
self.addEventListener('controllerchange', () => {
  console.log('Service Worker: New controller activated');
  self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: APP_VERSION }));
  });
});