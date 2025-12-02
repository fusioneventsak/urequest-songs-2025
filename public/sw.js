// Service Worker for uRequest Live PWA
const CACHE_NAME = 'urequest-live-v4';
const RUNTIME_CACHE = 'urequest-runtime-v4';
const MAX_CACHE_SIZE = 50; // Maximum number of items in runtime cache
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/index.html',
  '/kiosk',
  '/queue',
  '/manifest.json'
];

// Helper function to clean up old cache entries
async function cleanupCache(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > MAX_CACHE_SIZE) {
    // Delete oldest entries
    const entriesToDelete = keys.slice(0, keys.length - MAX_CACHE_SIZE);
    for (const request of entriesToDelete) {
      await cache.delete(request);
    }
  }
}

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, falling back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip Supabase API requests - always go to network
  if (url.hostname.includes('supabase')) {
    return;
  }

  // For navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();

          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
            cleanupCache(RUNTIME_CACHE);
          });

          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // Fallback to index.html for SPA routing
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For all other requests (JS, CSS, images, etc.)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        // Update cache in background
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, response);
              cleanupCache(RUNTIME_CACHE);
            });
          }
        }).catch(() => {
          // Network error, but we have cache - no problem
        });

        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        // Don't cache if not a success response
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response before caching
        const responseToCache = response.clone();

        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
          cleanupCache(RUNTIME_CACHE);
        });

        return response;
      });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});

// Background sync for offline requests (future feature)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-requests') {
    event.waitUntil(
      // Future: sync offline requests when back online
      Promise.resolve()
    );
  }
});

// Push notifications (future feature)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New song request!',
    icon: 'https://www.fusion-events.ca/wp-content/uploads/2025/03/ulr-wordmark.png',
    badge: 'https://www.fusion-events.ca/wp-content/uploads/2025/03/ulr-wordmark.png',
    vibrate: [200, 100, 200],
    tag: 'urequest-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('uRequest Live', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.openWindow('/dashboard')
  );
});

console.log('[SW] Service worker loaded');
