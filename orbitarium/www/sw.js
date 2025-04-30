// Importer Workbox (servi depuis un CDN)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

// Attendre que Workbox soit chargé
workbox.loadModule('workbox-core');
workbox.loadModule('workbox-routing');
workbox.loadModule('workbox-strategies');
workbox.loadModule('workbox-precaching');
workbox.loadModule('workbox-cacheable-response');
workbox.loadModule('workbox-expiration');

if (workbox) {
  console.log(`Workbox est chargé !`);

  // 1. Pré-mise en cache des ressources essentielles (App Shell)
  // Ces fichiers seront mis en cache lors de l'installation du service worker.
  // Le 'revision' peut être un hash de fichier pour la gestion de version, ou null si géré autrement.
  workbox.precaching.precacheAndRoute([
    { url: './index.html', revision: null },
    // Assurez-vous que le chemin vers votre CSS est correct
    // { url: '/style.css', revision: null }, // Décommentez et ajustez si vous avez un fichier CSS séparé
    { url: './canvas.js', revision: null },
    { url: './controls.js', revision: null },
    { url: './traces.js', revision: null },
    { url: './planets.js', revision: null },
    { url: './drawing.js', revision: null },
    { url: './animation.js', revision: null },
    { url: './simulation.js', revision: null },
    // Ajoutez l'icône principale référencée dans index.html (attention au chemin)
    // { url: '/resources/icon.png', revision: null }, // A vérifier, chemin relatif depuis www?

    // Ajoutez d'autres fichiers si nécessaire
    { url: './icons/icon-192.png', revision: null },
    { url: './icons/icon-512.png', revision: null },
    { url: './manifest.json', revision: null }
  ]);

  // 2. Stratégie de mise en cache pour les ressources non pré-cachées (Runtime Caching)

  // Stratégie pour les fichiers JS et CSS (StaleWhileRevalidate)
  // Donne la priorité au réseau, mais utilise le cache si hors ligne, puis met à jour le cache.
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' ||
                     request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'orbitarium-static-resources',
    })
  );

  // Stratégie pour les images (CacheFirst)
  // Utilise le cache d'abord, puis le réseau si l'image n'est pas en cache.
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'orbitarium-images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60, // Limite le nombre d'images en cache
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
        }),
      ],
    })
  );

  // Stratégie pour les polices (CacheFirst)
  workbox.routing.registerRoute(
      ({request}) => request.destination === 'font',
      new workbox.strategies.CacheFirst({
          cacheName: 'orbitarium-fonts',
          plugins: [
              new workbox.expiration.ExpirationPlugin({
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              }),
          ],
      })
  );

  // Stratégie par défaut pour la navigation (HTML)
  // Utilise NetworkFirst pour obtenir la version la plus récente de la page,
  // mais revient au cache (pré-cache de index.html) si hors ligne.
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'orbitarium-html-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Optionnel : Forcer le service worker à prendre le contrôle immédiatement
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

} else {
  console.log(`Workbox n'a pas pu être chargé.`);
} 