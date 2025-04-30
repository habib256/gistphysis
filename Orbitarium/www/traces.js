// Gestion des traces

let traceData = {};
const traceMaxLength = 3000;

function updateTrace(bodyName, pos) {
    if (!traceData[bodyName]) {
        traceData[bodyName] = [];
    }
    traceData[bodyName].push({ x: pos.x, y: pos.y });
    if (traceData[bodyName].length > traceMaxLength) {
        traceData[bodyName].shift();
    }
}

function traceEnabled(bodyName) {
    let id;
    if (bodyName.toLowerCase() === "comète halley") {
        id = "traceComèteHALLEY";
    } else {
        id = "trace" + bodyName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    }
    const checkbox = document.getElementById(id);
    return checkbox && checkbox.checked;
}

function clearTrace(bodyName) {
    if (traceData[bodyName]) {
        delete traceData[bodyName];
    }
}

function clearAllTraces() {
    traceData = {};
}

function resetTraceCheckboxes() {
    const checkboxes = document.querySelectorAll("#traceControls input[type=checkbox]");
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

function initTraceCheckboxes() {
    const traceMapping = {
        traceSoleil: "Soleil",
        traceMercure: "Mercure",
        traceVenus: "Vénus",
        traceTerre: "Terre",
        traceLune: "Lune",
        traceMars: "Mars",
        traceJupiter: "Jupiter",
        traceSaturne: "Saturne",
        traceUranus: "Uranus",
        traceNeptune: "Neptune",
        tracePluton: "Pluton",
        traceHalley: "Halley"
    };

    const traceCheckboxes = document.querySelectorAll("#traceControls input[type=checkbox]");
    traceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            if (!checkbox.checked) {
                const body = traceMapping[checkbox.id];
                clearTrace(body);
            }
        });
    });
}

function drawTraces(ctx) {
    for (let body in traceData) {
        if (traceData[body].length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = getBodyColor(body);
            ctx.lineWidth = 2;
            let p0 = transformToCanvasCoords(traceData[body][0].x, traceData[body][0].y);
            ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < traceData[body].length; i++) {
                let p = transformToCanvasCoords(traceData[body][i].x, traceData[body][i].y);
                ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }
    }
}

function getBodyColor(bodyName) {
    if (bodyName.toLowerCase() === "soleil") {
        return "yellow";
    }
    for (const planet of planets) {
        if (planet.name.toLowerCase() === bodyName.toLowerCase()) return planet.color;
        if (planet.satellites) {
            for (const sat of planet.satellites) {
                if (sat.name.toLowerCase() === bodyName.toLowerCase()) return sat.color;
            }
        }
    }
    return "white";
}

function initTraces() {
    clearAllTraces();
    resetTraceCheckboxes();
    initTraceCheckboxes();
}

// Ajout d'une fonction pour convertir des coordonnées simulées en coordonnées canvas
function transformToCanvasCoords(simX, simY) {
    const canvas = document.getElementById('canvas');
    // On utilise uniquement le zoom et le décalage de la caméra,
    // car l'animation applique déjà une transformation sur le contexte.
    let cameraX = 0, cameraY = 0, zoom = 1;
    if (typeof simulation !== 'undefined') {
        cameraX = simulation.cameraX;
        cameraY = simulation.cameraY;
        zoom = simulation.zoom;
    }
    return {
        x: (simX - cameraX) * zoom,
        y: (simY - cameraY) * zoom,
    };
} 