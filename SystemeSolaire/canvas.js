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

// Gestion du zoom par pinch pour smartphone
(function() {
    let initialDistance = 0;
    let currentScale = 1;
    // Nouveaux paramètres pour gérer la translation (déplacement) du zoom
    let currentTranslateX = 0;
    let currentTranslateY = 0;

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Fonction pour calculer la distance entre deux points tactiles
    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Met à jour l'échelle et la translation du canvas via setTransform
    function updateZoom() {
        ctx.setTransform(currentScale, 0, 0, currentScale, currentTranslateX, currentTranslateY);
        // Optionnel : redessiner la scène ici si nécessaire,
        // par exemple en rappelant votre fonction d'animation.
    }

    // Démarrage du geste pinch
    canvas.addEventListener('touchstart', function(event) {
        if (event.touches.length === 2) {
            initialDistance = getDistance(event.touches[0], event.touches[1]);
        }
    });

    // Gestion du mouvement lors du toucher avec zoom centré sur le point de pincement
    canvas.addEventListener('touchmove', function(event) {
        if (event.touches.length === 2) {
            event.preventDefault(); // Empêche le zoom natif du navigateur
            const newDistance = getDistance(event.touches[0], event.touches[1]);
            const scaleFactor = newDistance / initialDistance;
            
            // Calculer le point médian entre les deux touches (centre du pinch)
            const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
            
            // Mettre à jour l'échelle
            currentScale *= scaleFactor;
            
            // Ajuster la translation pour que le point médian reste fixe
            currentTranslateX = midX - scaleFactor * (midX - currentTranslateX);
            currentTranslateY = midY - scaleFactor * (midY - currentTranslateY);
            
            updateZoom();
            // Mettre à jour la distance initiale pour le prochain événement
            initialDistance = newDistance;
        }
    }, { passive: false });
})(); 