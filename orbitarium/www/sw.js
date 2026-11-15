// Service worker d'Orbitarium : fonctionne hors ligne, sans bibliothèque externe.
// Stratégie « réseau d'abord » : en ligne, on sert toujours la dernière version publiée ;
// hors ligne, on sert la copie mise en cache lors de la dernière visite.
// v5 (15/11/2026) : pastilles de couleur dessinées en CSS à la place des émojis ; fichiers mis en cache
// sans passer par le cache HTTP du navigateur.
// v6 (15/11/2026) : couleurs propres pour la comète de Halley (cyan pâle) et Saturne (beige de son dessin),
// Pluton et Cérès légèrement retouchées pour rester distinctes de Saturne.
const CACHE = 'orbitarium-v6';
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

// Les requêtes du service worker passent par le cache HTTP du navigateur : sans précaution, une mise à
// jour recevait le nouvel index.html avec les anciens scripts gardés une heure (max-age=3600 sur le
// serveur du site), et le nouveau cache les reprenait. On contourne donc ce cache : « reload » à
// l'installation (copie neuve de chaque fichier), « no-cache » (revalidation auprès du serveur) ensuite.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, {cache: 'reload'}))))
      .then(() => self.skipWaiting())
  );
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
  // Une requête de navigation ne se recopie pas avec d'autres options : on la refait à partir de son adresse.
  const frais = request.mode === 'navigate'
    ? new Request(request.url, {cache: 'no-cache', credentials: 'same-origin'})
    : new Request(request, {cache: 'no-cache'});
  event.respondWith(
    fetch(frais)
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
