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

function updateZoom(newZoom) {
    if (simulation.zoom !== newZoom) {
        simulation.zoom = newZoom;
        simulation.zoomChanged = true; // On indique qu'un changement de zoom a eu lieu
    }
} 

// Insertion d'un écouteur d'événement pour la molette (exemple)
window.addEventListener('wheel', function(e) {
    if (e.ctrlKey) { // Le zoom s'utilise avec Ctrl + molette
        e.preventDefault(); // Empêche le défilement de la page
        let newZoom = simulation.zoom + e.deltaY * -0.001;
        if (newZoom < 0.1) {
            newZoom = 0.1;
        }
        updateZoom(newZoom); // Utilise la fonction updateZoom pour mettre à jour le zoom et effacer les traces
    }
}); 

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