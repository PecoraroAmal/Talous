/**
 * Talous – Service Worker (Workbox 7.x)
 * -------------------------------------------------
 * - Precaches the whole offline app shell
 * - Cache-first for local assets
 * - Stale-while-revalidate for CDN libraries
 * - Navigation fallback to index.html
 * -------------------------------------------------
 */

'use strict';

// Import Workbox from the CDN (v7 – latest stable at time of writing)
importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js'
);

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { CacheFirst, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

// ---------------------------------------------------------------------
// 1. PRECACHE MANIFEST (generated at build time – see note below)
// ---------------------------------------------------------------------
const PRECACHE_MANIFEST = [
  // Core pages
  { url: '/', revision: null },
  { url: '/index.html', revision: null },
  { url: '/index.css', revision: null },
  { url: '/index.js', revision: null },
  { url: '/style.css', revision: null },

  // Sections
  { url: '/transactions/transactions.html', revision: null },
  { url: '/transactions/transactions.css', revision: null },
  { url: '/transactions/transactions.js', revision: null },

  { url: '/charts/charts.html', revision: null },
  { url: '/charts/charts.css', revision: null },
  { url: '/charts/charts.js', revision: null },

  { url: '/tools/tools.html', revision: null },
  { url: '/tools/tools.css', revision: null },
  { url: '/tools/tools.js', revision: null },

  { url: '/settings/settings.html', revision: null },
  { url: '/settings/settings.css', revision: null },
  { url: '/settings/settings.js', revision: null },

  // Misc
  { url: '/example/example.js', revision: null },
  { url: '/manifest.json', revision: null },

  // Icons (only the ones used in the manifest)
  { url: '/icons/favicon.svg', revision: null },
  { url: '/icons/web-app-manifest-192x192.png', revision: null },
  { url: '/icons/web-app-manifest-512x512.png', revision: null },
  { url: '/icons/apple-touch-icon.png', revision: null },
  { url: '/icons/favicon-96x96.png', revision: null }
];

precacheAndRoute(PRECACHE_MANIFEST);
cleanupOutdatedCaches();

// ---------------------------------------------------------------------
// 2. RUNTIME CACHING
// ---------------------------------------------------------------------

// 2.1 – Local static assets (CSS, JS, HTML, images) → CacheFirst
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    ['style', 'script', 'image'].includes(request.destination),
  new CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
      })
    ]
  })
);

// 2.2 – CDN libraries (Chart.js, Luxon, adapters) → StaleWhileRevalidate
registerRoute(
  ({ url }) =>
    url.origin.includes('cdn.jsdelivr.net') ||
    url.origin.includes('cdnjs.cloudflare.com'),
  new StaleWhileRevalidate({
    cacheName: 'cdn-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
      })
    ]
  })
);

// ---------------------------------------------------------------------
// 3. NAVIGATION FALLBACK (SPA behaviour)
// ---------------------------------------------------------------------
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      return await caches.match('/index.html');
    } catch (e) {
      return caches.match('/index.html');
    }
  }
);