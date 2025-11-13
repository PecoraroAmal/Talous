const CACHE_NAME = 'talous-cache-v1.0';
const urlsToCache = [
  '/Talous/index.html?v=1.0',
  '/Talous/manifest.json?v=1.0',
  '/Talous/sw.js?v=1.0',
  '/Talous/pages/banks.html?v=1.0',
  '/Talous/pages/charts.html?v=1.0',
  '/Talous/pages/cookies.html?v=1.0',
  '/Talous/pages/goals.html?v=1.0',
  '/Talous/pages/recurring.html?v=1.0',
  '/Talous/pages/settings.html?v=1.0',
  '/Talous/pages/transactions.html?v=1.0',
  '/Talous/src/css/style.css?v=1.0',
  '/Talous/src/css/pages/banks.css?v=1.0',
  '/Talous/src/css/pages/charts.css?v=1.0',
  '/Talous/src/css/pages/dashboard.css?v=1.0',
  '/Talous/src/css/pages/goals.css?v=1.0',
  '/Talous/src/css/pages/recurring.css?v=1.0',
  '/Talous/src/css/pages/settings.css?v=1.0',
  '/Talous/src/css/pages/transactions.css?v=1.0',
  '/Talous/src/js/app.js?v=1.0',
  '/Talous/src/js/charts.js?v=1.0',
  '/Talous/src/js/storage.js?v=1.0',
  '/Talous/src/js/ui.js?v=1.0',
  '/Talous/src/js/utils.js?v=1.0',
  '/Talous/src/js/pages/banks.js?v=1.0',
  '/Talous/src/js/pages/charts-app.js?v=1.0',
  '/Talous/src/js/pages/charts.js?v=1.0',
  '/Talous/src/js/pages/dashboard.js?v=1.0',
  '/Talous/src/js/pages/goals.js?v=1.0',
  '/Talous/src/js/pages/recurring.js?v=1.0',
  '/Talous/src/js/pages/settings.js?v=1.0',
  '/Talous/src/js/pages/transactions.js?v=1.0',
  '/Talous/example/example.js?v=1.0',
  '/Talous/src/icons/site.webmanifest?v=1.0',
  '/Talous/icons/favicon.svg?v=1.0',
  '/Talous/icons/web-app-manifest-192x192.png?v=1.0',
  '/Talous/icons/web-app-manifest-512x512.png?v=1.0',
  '/Talous/icons/apple-touch-icon.png?v=1.0',
  '/Talous/icons/favicon-96x96.png?v=1.0',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2',
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
  console.log('Service Worker: Fetching', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If resource is in cache, return it
        if (cachedResponse) {
          // Try to fetch a fresh version in the background
          fetchAndUpdateCache(event.request);
          return cachedResponse;
        }
        // If not in cache, fetch from network and cache
        return fetchAndUpdateCache(event.request);
      })
      .catch(error => {
        console.error('Fetch failed:', error);
        return caches.match('/Talous/index.html?v=1.0');
      })
  );
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

self.addEventListener('controllerchange', () => {
  console.log('Service Worker: New controller activated');
  // Assuming showMessage is available in the app
  if (typeof showMessage !== 'undefined') {
    showMessage('Talous update!', 'success');
  }
});