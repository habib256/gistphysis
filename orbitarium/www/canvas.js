// Variables globales pour le canvas et la vue
let canvas;
let ctx;
let zoom = 1.0;
let viewOffsetX = 0;
let viewOffsetY = 0;
// Dimensions de la vue en pixels CSS : tous les dessins et toutes les coordonnées
// (souris, doigts) utilisent ces unités, quelle que soit la densité de l'écran.
let viewWidth = 0;
let viewHeight = 0;
// Densité de pixels du canvas, plafonnée à 2 pour ménager les tablettes modestes.
let pixelRatio = 1;

// Bornes du zoom (le minimum s'adapte aux très petites fenêtres).
const ZOOM_MAX = 5;
let zoomMin = 0.05;

// Rayon de l'orbite la plus lointaine (Pluton) et marge, pour le cadrage d'ensemble.
const MAX_ORBIT = 3600;
const VIEW_MARGIN = 50; // marge en pixels

function initCanvas() {
    canvas = document.getElementById("canvas");
    if (!canvas) {
        console.error("Canvas introuvable");
        return;
    }
    ctx = canvas.getContext("2d");
    resizeCanvas();
    // Redimensionnement ou rotation de la tablette : on garde la portion du système observée.
    window.addEventListener("resize", () => resizeCanvas(false));
}

// Zoom qui fait tenir tout le système solaire dans la vue.
function fitZoom(width, height) {
    return Math.max(0.005, (Math.min(width, height) / 2 - VIEW_MARGIN) / MAX_ORBIT);
}

function clampZoom(value) {
    return Math.max(zoomMin, Math.min(value, ZOOM_MAX));
}

// resetView = true (par défaut) : vue d'ensemble recalculée.
// resetView = false : la vue est mise à l'échelle de la nouvelle taille (rotation, fenêtre).
function resizeCanvas(resetView = true) {
    const oldFit = viewWidth > 0 ? fitZoom(viewWidth, viewHeight) : null;

    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    // Canvas net sur écran haute densité : tampon agrandi, dessin en pixels CSS.
    canvas.width = Math.round(viewWidth * pixelRatio);
    canvas.height = Math.round(viewHeight * pixelRatio);
    canvas.style.width = viewWidth + "px";
    canvas.style.height = viewHeight + "px";
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const fit = fitZoom(viewWidth, viewHeight);
    zoomMin = Math.min(0.05, fit / 2);

    if (resetView || oldFit === null) {
        zoom = fit;
    } else {
        const k = fit / oldFit;
        if (k !== 1) {
            zoom = clampZoom(zoom * k);
            viewOffsetX *= k;
            viewOffsetY *= k;
            // Les traces sont mémorisées en pixels d'écran : elles ne correspondent plus.
            if (typeof clearAllTraces === "function") clearAllTraces();
        }
    }
}

function setZoom(newZoom) {
    zoom = newZoom;
    clearAllTraces();
}

function setViewOffsets(x, y) {
    viewOffsetX = x;
    viewOffsetY = y;
}
