let selectedPlanet = null;
let timeMultiplier = 0.25;
let showOrbits = true;
let showNames = true;

function initControls() {
    // Boutons de contrôle du temps
    const slowTimeBtn = document.getElementById("slowTime");
    const fastTimeBtn = document.getElementById("fastTime");
    if (slowTimeBtn) {
        slowTimeBtn.addEventListener("click", () => {
            timeMultiplier /= 2;
            console.log("Temps ralenti, multiplicateur =", timeMultiplier);
        });
    }
    if (fastTimeBtn) {
        fastTimeBtn.addEventListener("click", () => {
            timeMultiplier *= 2;
            console.log("Temps accéléré, multiplicateur =", timeMultiplier);
        });
    }
    
    // Gestion du zoom avec la molette sur le canvas
    canvas.addEventListener("wheel", function(event) {
        event.preventDefault();
        const newZoom = zoom * (1 - event.deltaY * 0.001);
        setZoom(Math.max(0.05, Math.min(newZoom, 5)));
        // Vous pourrez par la suite effacer les traces lors du zoom si besoin
    });
    
    // Gestion du zoom par pinch pour smartphone (comportement identique à la molette)
    let initialDistance = 0;
    let initialZoom = zoom;
    let initialViewOffsetX = viewOffsetX;
    let initialViewOffsetY = viewOffsetY;

    canvas.addEventListener('touchstart', function(event) {
        if (event.touches.length === 2) {
            initialDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
            // Enregistrer l'état initial du zoom et des offsets
            initialZoom = zoom;
            initialViewOffsetX = viewOffsetX;
            initialViewOffsetY = viewOffsetY;
        }
    });

    canvas.addEventListener('touchmove', function(event) {
        if (event.touches.length === 2) {
            event.preventDefault(); // Empêche le comportement par défaut
            const newDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
            const scaleFactor = newDistance / initialDistance;
            const newZoom = initialZoom * scaleFactor;

            // Calcul du point médian des deux touches
            const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

            const newViewOffsetX = midX - (newZoom / initialZoom) * (midX - initialViewOffsetX);
            const newViewOffsetY = midY - (newZoom / initialZoom) * (midY - initialViewOffsetY);

            setZoom(newZoom);
            setViewOffsets(newViewOffsetX, newViewOffsetY);
        }
    }, { passive: false });
    
    // Gestion du clic sur le canvas pour recentrer la vue
    canvas.addEventListener("click", function(event) {
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const originX = centerX + viewOffsetX;
        const originY = centerY + viewOffsetY;

        // Vérifier si le Soleil est cliqué (rayon de 20*zoom)
        const dxSun = clickX - originX;
        const dySun = clickY - originY;
        if (Math.hypot(dxSun, dySun) < 20 * zoom) {
            selectedPlanet = null;
            setViewOffsets(0, 0);
            return;
        }

        // Vérifier le clic sur une planète
        for (let planet of planets) {
            const pos = getPlanetPosition(planet, originX, originY, zoom);
            if (Math.hypot(clickX - pos.x, clickY - pos.y) < planet.radius * zoom + 5) {
                selectedPlanet = planet;
                break;
            }
        }

        // Si la planète possède des satellites, forcer un zoom minimal
        if (
            selectedPlanet &&
            selectedPlanet.satellites &&
            selectedPlanet.satellites.length > 0 &&
            zoom < 1.5
        ) {
            setZoom(1.5);
        }
    });
    
    // Gestion du menu déroulant pour choisir la planète centrée
    const planetSelect = document.getElementById("planetSelect");
    if (planetSelect) {
        planetSelect.value = "soleil";
        planetSelect.addEventListener("change", function() {
            const selectedName = this.value.toLowerCase();
            // Vous pouvez vider les traces ici via traces.js si nécessaire
            clearAllTraces();
            if (selectedName === "soleil") {
                resizeCanvas(); // recalculer le zoom
                selectedPlanet = null;
                setViewOffsets(0, 0);
            } else if (selectedName.includes("halley")) {
                selectedPlanet = planets.find(p => p.isComet);
            } else {
                selectedPlanet = planets.find(p => p.name.toLowerCase() === selectedName);
                if (
                    selectedPlanet &&
                    selectedPlanet.satellites &&
                    selectedPlanet.satellites.length > 0 &&
                    zoom < 1.5
                ) {
                    setZoom(1.5);
                }
            }
        });
    }
    
    // Bouton pour afficher/masquer les orbites
    const toggleOrbitsBtn = document.getElementById("toggleOrbits");
    if (toggleOrbitsBtn) {
        toggleOrbitsBtn.addEventListener("click", () => {
            showOrbits = !showOrbits;
            toggleOrbitsBtn.textContent = showOrbits ? "Masquer les orbites" : "Afficher les orbites";
        });
    }
    
    // Bouton pour afficher/masquer les noms
    const toggleNamesBtn = document.getElementById("toggleNames");
    if (toggleNamesBtn) {
        toggleNamesBtn.addEventListener("click", () => {
            showNames = !showNames;
            toggleNamesBtn.textContent = showNames ? "Masquer les noms" : "Afficher les noms";
        });
    }
} 