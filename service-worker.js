/**
 * SERVICE WORKER
 *
 * Handles:
 * - Caching app shell (HTML, CSS, JS) for offline support
 * - Installation and activation
 * - Network requests fallback to cache
 *
 * Note: Audio files are NOT cached (they're accessed directly from IndexedDB File objects)
 */

const CACHE_NAME = 'music-player-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/db.js',
  '/metadata.js',
  '/components/now-playing.js',
  '/components/progress-bar.js',
  '/components/player-controls.js',
  '/components/file-selector.js',
  '/components/playlist-view.js',
  '/components/library-browser.js',
  '/manifest.json'
];

// Install: cache app shell
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        // Non-critical: some files might not exist yet
        console.warn('Service Worker: Some assets could not be cached:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first strategy for app shell, network-first for others
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // For app shell files: cache-first (try cache, fallback to network)
  if (ASSETS_TO_CACHE.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(response => {
          // Cache new versions of app files
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        });
      }).catch(() => {
        // Offline fallback for HTML
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
    );
  }
});
