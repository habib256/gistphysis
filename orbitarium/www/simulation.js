// Suppression des déclarations import : on travaille en mode script global

// Déclaration globale de l'objet simulation avec des valeurs initiales
let simulation = {
    cameraX: 0,
    cameraY: 0,
    zoom: 1,
    zoomChanged: false
};

window.addEventListener('load', () => {
    // Initialisation du canvas
    initCanvas();
    
    // Initialisation des contrôles (boutons, événements, menu…)
    initControls();
    
    // Initialisation des planètes et des astéroïdes
    initPlanets();
    
    // Réinitialisation et initialisation des traces et cases à cocher
    initTraces();
    
    // Lancement de la boucle d'animation
    drawFrame();
}); 

// Le zoom (molette, Ctrl + molette, pincement) est géré uniquement dans controls.js.
// L'ancien écouteur Ctrl + molette modifiait la transformation du contexte et
// faussait l'affichage (pincement du pavé tactile d'un Mac, notamment).

// Enregistrement du Service Worker pour la PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js') // Chemin corrigé : relatif au dossier courant
      .then(
        (registration) => { // Fonction fléchée explicite pour then
          console.log('Service Worker enregistré avec succès:', registration);
        })
      .catch(
        (error) => { // Fonction fléchée explicite pour catch
          console.log('Échec de l\'enregistrement du Service Worker:', error);
      });
  });
} 