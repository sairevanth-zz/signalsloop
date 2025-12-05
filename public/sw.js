/**
 * Service Worker for SignalsLoop PWA
 * Handles push notifications and offline caching
 */

const CACHE_NAME = 'signalsloop-v1';
const STATIC_ASSETS = [
  '/icon-192x192.png',
  '/badge-72x72.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    return;
  }

  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    image: data.image,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      ...data.data,
    },
    actions: data.actions || [],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: data.timestamp || Date.now(),
    renotify: !!data.tag, // Renotify if using tags
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SignalsLoop', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || '/';

  // Handle different actions
  if (action === 'dismiss') {
    return;
  }

  // Default action: open URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Navigate to the notification URL
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: url,
            action: action,
          });
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Notification close event (for analytics)
self.addEventListener('notificationclose', (event) => {
  // Could send analytics here
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - Network first strategy for API, cache first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For API requests, use network first
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // For static assets, use cache first
  if (STATIC_ASSETS.some((asset) => url.pathname === asset)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
  }
});
