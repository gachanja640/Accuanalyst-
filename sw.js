const CACHE = 'accuanalyst-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=Rajdhani:wght@300;400;500;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap'
];

// Install — cache app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL).catch(function() {});
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — cache-first for shell, network-first for API
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Never cache Anthropic API calls
  if (url.includes('api.anthropic.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for fonts and local assets
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200 && response.type !== 'opaque') {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});

// Push notifications
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) { data = { title: 'AccuAnalyst', body: e.data ? e.data.text() : 'Time to analyse today\'s fixtures.' }; }

  e.waitUntil(
    self.registration.showNotification(data.title || 'AccuAnalyst', {
      body: data.body || 'Your daily fixture intelligence is ready.',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'accuanalyst-daily',
      renotify: true,
      requireInteraction: false,
      data: { url: data.url || './' }
    })
  );
});

// Notification click — open app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      if (list.length > 0) {
        return list[0].focus();
      }
      return clients.openWindow(e.notification.data.url || './');
    })
  );
});
