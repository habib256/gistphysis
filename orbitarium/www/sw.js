// Service worker d'Orbitarium : fonctionne hors ligne, sans bibliothèque externe.
// Stratégie « réseau d'abord » : en ligne, on sert toujours la dernière version publiée ;
// hors ligne, on sert la copie mise en cache lors de la dernière visite.
const CACHE = 'orbitarium-v4';
const APP_SHELL = [
  './',
  './index.html',
  './canvas.js',
  './controls.js',
  './traces.js',
  './planets.js',
  './drawing.js',
  './animation.js',
  './simulation.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  // Supprime les anciens caches (dont ceux de l'ancienne version basée sur Workbox).
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
  );
});
