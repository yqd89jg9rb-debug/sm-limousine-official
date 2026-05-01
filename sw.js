self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('sm-limo-store').then((cache) => cache.addAll([
      '/',
      '/index.html',
      '/styles.css',
      '/script.js',
      '/manifest.json'
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
