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