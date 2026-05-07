self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // If the request is for a map tile, try the network first, fallback to cache
  if (event.request.url.includes('basemaps.cartocdn.com/light_all')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        // Let's modify the request to always request subdomain 'a' if we are looking it up in cache, 
        // to simplify. But it's easier to just try network then fallback to cache 
        // wait, we wanted cache first then network. 
        // If we want network first:
        return fetch(event.request).then((networkResponse) => {
          return networkResponse;
        }).catch(async () => {
          // If offline and not in cache, let's also try checking if we cached 'a' subdomain even if request is 'b' or 'c'
          const url = new URL(event.request.url);
          if (url.hostname.match(/^[a-z]\.basemaps\.cartocdn\.com$/)) {
             url.hostname = 'a.basemaps.cartocdn.com';
             const altResponse = await caches.match(url.toString(), { ignoreSearch: true });
             if (altResponse) return altResponse;
          }
          return new Response(null, { status: 404 });
        });
      })
    );
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Emergency Alert';
  const options = {
    body: data.body || 'New alert in your area.',
    icon: '/icon.png', // Fallback icon
    badge: '/badge.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data)
  );
});

// Simulate background sync for alerts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SIMULATE_ALERT') {
    const { title, body, type } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: type === 'Flood' ? '🌊' : '🌪',
      vibrate: [500, 200, 500],
    });
  }
});
