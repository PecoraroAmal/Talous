/* Workbox 6.6.0 service worker */
/* eslint-disable no-undef */
self.importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.6.0/workbox-sw.js');

if (self.workbox) {
  const { precaching, routing, strategies, expiration, cacheableResponse } = self.workbox;

  // Precache static assets
  precaching.precacheAndRoute([
    { url: 'index.html?v=3.6', revision: null },
    { url: 'pages/transactions.html?v=3.6', revision: null },
    { url: 'pages/charts.html?v=3.6', revision: null },
    { url: 'pages/banks.html?v=3.6', revision: null },
    { url: 'pages/goals.html?v=3.6', revision: null },
    { url: 'pages/recurring.html?v=3.6', revision: null },
    { url: 'pages/settings.html?v=3.6', revision: null },
    { url: 'manifest.json', revision: null },
    { url: 'src/css/style.css', revision: null },
    { url: 'src/js/utils.js', revision: null },
    { url: 'src/js/storage.js', revision: null },
    { url: 'src/js/ui.js', revision: null },
    { url: 'src/js/charts.js', revision: null },
    { url: 'src/js/app.js', revision: null },
    { url: 'src/icons/favicon.svg', revision: null },
  ]);

  // Cache third-party CDNs (Chart.js, Luxon, adapter)
  routing.registerRoute(
    ({ url }) => url.origin.includes('cdn.jsdelivr.net'),
    new strategies.StaleWhileRevalidate({
      cacheName: 'cdn-cache',
      plugins: [
        new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new expiration.ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 })
      ]
    })
  );
  routing.registerRoute(
    ({ url }) => url.origin.includes('cdnjs.cloudflare.com'),
    new strategies.StaleWhileRevalidate({
      cacheName: 'cdn-cache',
      plugins: [
        new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new expiration.ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 })
      ]
    })
  );

  // App shell routing fallback
  routing.registerRoute(new routing.NavigationRoute(precaching.createHandlerBoundToURL('index.html?v=3.6')));
}