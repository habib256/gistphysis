// Variables globales pour le canvas et la vue
let canvas;
let ctx;
let zoom = 1.0;
let viewOffsetX = 0;
let viewOffsetY = 0;

function initCanvas() {
    canvas = document.getElementById("canvas");
    if (!canvas) {
        console.error("Canvas introuvable");
        return;
    }
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const maxOrbit = 3600;
    const margin = 50; // marge en pixels
    const halfMinDimension = Math.min(canvas.width, canvas.height) / 2 - margin;
    zoom = halfMinDimension / maxOrbit;
}

function setZoom(newZoom) {
    zoom = newZoom;
    clearAllTraces();
}

function setViewOffsets(x, y) {
    viewOffsetX = x;
    viewOffsetY = y;
    
}

// Gestion du zoom par pinch pour smartphone (comportement identique à la molette)
(function() {
    // Variables pour stocker l'état initial lors du début du geste pinch
    let initialDistance = 0;
    let initialZoom = 1;
    let initialViewOffsetX = 0;
    let initialViewOffsetY = 0;

    const canvas = document.getElementById('canvas');
    // Suppression de la récupération du contexte car il n'est plus utilisé ici
    // const ctx = canvas.getContext('2d');

    // Fonction pour calculer la distance entre deux points tactiles
    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Démarrage du geste pinch
    canvas.addEventListener('touchstart', function(event) {
        if (event.touches.length === 2) {
            initialDistance = getDistance(event.touches[0], event.touches[1]);
            // Enregistrer l'état initial du zoom et de la translation
            initialZoom = zoom;
            initialViewOffsetX = viewOffsetX;
            initialViewOffsetY = viewOffsetY;
        }
    });

    // Gestion du mouvement lors du toucher avec zoom centré sur le point de pincement
    canvas.addEventListener('touchmove', function(event) {
        if (event.touches.length === 2) {
            event.preventDefault(); // Empêche le zoom natif du navigateur
            const newDistance = getDistance(event.touches[0], event.touches[1]);
            const scaleFactor = newDistance / initialDistance;
            const newZoom = initialZoom * scaleFactor;

            // Calculer le point médian entre les deux touches (centre du pinch)
            const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

            // Ajuster les offsets pour que le point médian reste fixe
            const newViewOffsetX = midX - (newZoom / initialZoom) * (midX - initialViewOffsetX);
            const newViewOffsetY = midY - (newZoom / initialZoom) * (midY - initialViewOffsetY);

            setZoom(newZoom);
            setViewOffsets(newViewOffsetX, newViewOffsetY);
        }
    }, { passive: false });
})(); 