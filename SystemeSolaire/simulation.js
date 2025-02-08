// Déclaration des variables globales pour le zoom et le décalage de vue
let zoom = 1.0;
let viewOffsetX = 0;
let viewOffsetY = 0;

// Lorsque la page est entièrement chargée (y compris tous les éléments), on initialise la simulation
window.addEventListener('load', function init() {
    // Récupération du canvas et du contexte
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    // Fonction de redimensionnement du canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Choisir le bon zoom pour afficher l'ensemble du système solaire.
        // On considère que l'orbite maximale est celle de Pluton (3600) et on ajoute une marge pour l'encadrement.
        const maxOrbit = 3600;
        const margin = 50; // marge en pixels
        const halfMinDimension = Math.min(canvas.width, canvas.height) / 2 - margin;
        zoom = halfMinDimension / maxOrbit;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Variable pour stocker la planète sélectionnée pour suivi (null = suivre le Soleil)
    let selectedPlanet = null;

    // Initialisation du multiplicateur de temps et ajout des contrôles
    let timeMultiplier = 0.25; // Simulation plus lente au démarrage
    const slowTimeBtn = document.getElementById("slowTime");
    const fastTimeBtn = document.getElementById("fastTime");

    slowTimeBtn.addEventListener("click", () => {
         timeMultiplier /= 2;
         console.log("Temps ralenti, multiplicateur =", timeMultiplier);
    });
    fastTimeBtn.addEventListener("click", () => {
         timeMultiplier *= 2;
         console.log("Temps accéléré, multiplicateur =", timeMultiplier);
    });

    // Écouteur d'événement pour la molette de la souris pour zoomer/dézoomer
    canvas.addEventListener("wheel", function(event) {
        event.preventDefault();
        zoom *= (1 - event.deltaY * 0.001);
        zoom = Math.max(0.05, Math.min(zoom, 5));
        // Effacer toutes les traces lors du zoom/dézoom
        clearAllTraces();
    });

    // Écouteur pour le clic afin de recentrer la vue sur le Soleil ou une planète
    canvas.addEventListener("click", function(event) {
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const originX = centerX + viewOffsetX;
        const originY = centerY + viewOffsetY;

        // Vérifier si le Soleil est cliqué (dessiné au centre, rayon de 20*zoom)
        const dxSun = clickX - originX;
        const dySun = clickY - originY;
        if (Math.hypot(dxSun, dySun) < 20 * zoom) {
            selectedPlanet = null;
            viewOffsetX = 0;
            viewOffsetY = 0;
            return;
        }

        // Vérification du clic sur une des planètes
        for (let i = 0; i < planets.length; i++) {
            const planet = planets[i];
            const planetPos = getPlanetPosition(planet, originX, originY, zoom);
            if (Math.hypot(clickX - planetPos.x, clickY - planetPos.y) < planet.radius * zoom + 5) {
                selectedPlanet = planet;
                break;
            }
        }
        // Ajuster le zoom pour afficher les noms des satellites si la planète sélectionnée en possède
        if (
            selectedPlanet &&
            selectedPlanet.satellites &&
            selectedPlanet.satellites.length > 0 &&
            zoom < 1.5
        ) {
            zoom = 1.5;
        }
    });

    // Ajouter après la déclaration des autres variables au début
    let showOrbits = true; // Variable pour contrôler l'affichage des orbites

    // Écouteur pour le menu déroulant permettant de choisir la planète centrée
    const planetSelect = document.getElementById("planetSelect");
    // Réinitialiser le menu sur "soleil" au démarrage
    planetSelect.value = "soleil";

    planetSelect.addEventListener("change", function() {
        const selectedName = this.value.toLowerCase();
        // Effacer toutes les traces lors d'un changement de centrage
        clearAllTraces();
        if (selectedName === "soleil") {
            resizeCanvas(); // recalculer le zoom afin d'afficher tout le système solaire
            selectedPlanet = null;
            viewOffsetX = 0;
            viewOffsetY = 0;
        } else if (selectedName.includes("halley")) {
            // Sélectionner la comète (isComet=true) si le nom contient "halley"
            selectedPlanet = planets.find(p => p.isComet);
        } else {
            selectedPlanet = planets.find(p => p.name.toLowerCase() === selectedName);
            // Si la planète possède des satellites, forcer un zoom minimal de 1.5 pour afficher leurs noms
            if (
                selectedPlanet &&
                selectedPlanet.satellites &&
                selectedPlanet.satellites.length > 0 &&
                zoom < 1.5
            ) {
                zoom = 1.5;
            }
        }
    });

    // Ajouter après les autres écouteurs d'événements
    const toggleOrbitsBtn = document.getElementById("toggleOrbits");
    toggleOrbitsBtn.addEventListener("click", () => {
        showOrbits = !showOrbits;
        toggleOrbitsBtn.textContent = showOrbits ? "Masquer les orbites" : "Afficher les orbites";
    });

    // Ajouter une variable de contrôle pour l'affichage des noms
    let showNames = true;
    const toggleNamesBtn = document.getElementById("toggleNames");
    toggleNamesBtn.addEventListener("click", () => {
         showNames = !showNames;
         toggleNamesBtn.textContent = showNames ? "Masquer les noms" : "Afficher les noms";
    });

    // Déclaration pour les traces
    const traceData = {};
    const traceMaxLength = 3000; // Nombre maximal de points à conserver pour chaque trace (doublé)

    // Met à jour la trace pour un corps donné (bodyName)
    function updateTrace(bodyName, pos) {
        if (!traceData[bodyName]) {
            traceData[bodyName] = [];
        }
        traceData[bodyName].push({ x: pos.x, y: pos.y });
        if (traceData[bodyName].length > traceMaxLength) {
            traceData[bodyName].shift();
        }
    }

    // Renvoie true si le checkbox associé à bodyName est coché
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

    // Retourne la couleur associée au corps en cherchant dans planets et satellites, ou pour le Soleil
    function getBodyColor(bodyName) {
        if (bodyName.toLowerCase() === "soleil") {
            return "yellow";
        }
        for (const planet of planets) {
            if (planet.name.toLowerCase() === bodyName.toLowerCase()) {
                return planet.color;
            }
            if (planet.satellites) {
                for (const sat of planet.satellites) {
                    if (sat.name.toLowerCase() === bodyName.toLowerCase()) {
                        return sat.color;
                    }
                }
            }
        }
        return "white";
    }

    // Fonction qui dessine toutes les traces enregistrées
    function drawTraces() {
        for (let body in traceData) {
            if (traceData[body].length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = getBodyColor(body);
                ctx.lineWidth = 2;
                ctx.moveTo(traceData[body][0].x, traceData[body][0].y);
                for (let i = 1; i < traceData[body].length; i++) {
                    ctx.lineTo(traceData[body][i].x, traceData[body][i].y);
                }
                ctx.stroke();
            }
        }
    }

    // Fonction pour effacer la trace d'un corps spécifique
    function clearTrace(bodyName) {
        if (traceData[bodyName]) {
            delete traceData[bodyName];
        }
    }

    // Fonction pour effacer toutes les traces
    function clearAllTraces() {
        for (let key in traceData) {
            delete traceData[key];
        }
    }

    // Nouvelle fonction pour réinitialiser les cases à cocher des traces
    function resetTraceCheckboxes() {
        const checkboxes = document.querySelectorAll("#traceControls input[type=checkbox]");
        checkboxes.forEach(checkbox => {
             checkbox.checked = false;
        });
    }

    // Réinitialiser les traces et les cases à cocher lors d'un rechargement complet de la page
    clearAllTraces();
    resetTraceCheckboxes();

    // Attacher des écouteurs aux cases à cocher des traces : lorsqu'une case est décochée, effacer la trace correspondante
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
        traceComèteHALLEY: "Comète HALLEY"
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

    // Définition des planètes avec leurs caractéristiques
    const planets = [
        { name: "Mercure", orbit: 500, radius: 9, speed: 0.04, angle: Math.random() * Math.PI * 2, color: '#aaa' },
        { name: "Vénus", orbit: 700, radius: 12, speed: 0.035, angle: Math.random() * Math.PI * 2, color: '#ffcc00' },
        { name: "Terre", orbit: 900, radius: 15, speed: 0.03, angle: Math.random() * Math.PI * 2, color: '#00aaff',
          satellites: [
              { name: "Lune", orbit: 35, radius: 3, speed: 0.08, angle: Math.random() * Math.PI * 2, color: '#cccccc' }
          ]
        },
        { name: "Mars", orbit: 1100, radius: 10.5, speed: 0.027, angle: Math.random() * Math.PI * 2, color: '#ff5500',
          satellites: [
              { name: "Phobos", orbit: 35, radius: 3, speed: 0.06, angle: Math.random() * Math.PI * 2, color: '#bbbbbb' },
              { name: "Deimos", orbit: 45, radius: 3, speed: 0.05, angle: Math.random() * Math.PI * 2, color: '#dddddd' }
          ]
        },
        { name: "Jupiter", orbit: 1650, radius: 24, speed: 0.02, angle: Math.random() * Math.PI * 2, color: '#ffaa00',
          satellites: [
              { name: "Io", orbit: 50, radius: 3, speed: 0.05, angle: Math.random() * Math.PI * 2, color: '#ffcc99' },
              { name: "Europe", orbit: 65, radius: 3.75, speed: 0.045, angle: Math.random() * Math.PI * 2, color: '#ccccff' },
              { name: "Ganymède", orbit: 85, radius: 4.5, speed: 0.04, angle: Math.random() * Math.PI * 2, color: '#ff9999' },
              { name: "Callisto", orbit: 105, radius: 4.2, speed: 0.035, angle: Math.random() * Math.PI * 2, color: '#ccffcc' }
          ]
        },
        { name: "Saturne", orbit: 2200, radius: 21, speed: 0.017, angle: Math.random() * Math.PI * 2, color: '#ffdd00',
          satellites: [
              { name: "Mimas", orbit: 40, radius: 2, speed: 0.070, angle: Math.random() * Math.PI * 2, color: '#dddddd' },
              { name: "Encelade", orbit: 50, radius: 2.25, speed: 0.065, angle: Math.random() * Math.PI * 2, color: '#66ffff' },
              { name: "Téthys", orbit: 60, radius: 3, speed: 0.060, angle: Math.random() * Math.PI * 2, color: '#eeeeee' },
              { name: "Dioné", orbit: 65, radius: 3, speed: 0.055, angle: Math.random() * Math.PI * 2, color: '#dddddd' },
              { name: "Rhéa", orbit: 75, radius: 3.5, speed: 0.050, angle: Math.random() * Math.PI * 2, color: '#cccccc' },
              { name: "Titan", orbit: 90, radius: 4.5, speed: 0.045, angle: Math.random() * Math.PI * 2, color: '#ffaa00' },
              { name: "Japet", orbit: 110, radius: 3.5, speed: 0.040, angle: Math.random() * Math.PI * 2, color: '#bbbbbb' }
          ]
        },
        { name: "Uranus", orbit: 2800, radius: 18, speed: 0.014, angle: Math.random() * Math.PI * 2, color: '#66ccff',
          satellites: [
              { name: "Miranda", orbit: 40, radius: 2, speed: 0.060, angle: Math.random() * Math.PI * 2, color: '#cccccc' },
              { name: "Ariel", orbit: 50, radius: 3, speed: 0.055, angle: Math.random() * Math.PI * 2, color: '#dddddd' },
              { name: "Umbriel", orbit: 60, radius: 3, speed: 0.050, angle: Math.random() * Math.PI * 2, color: '#bbbbbb' },
              { name: "Titania", orbit: 70, radius: 3.5, speed: 0.045, angle: Math.random() * Math.PI * 2, color: '#eeeeee' },
              { name: "Obéron", orbit: 80, radius: 3.5, speed: 0.040, angle: Math.random() * Math.PI * 2, color: '#dddddd' }
          ]
        },
        { name: "Neptune", orbit: 3200, radius: 18, speed: 0.012, angle: Math.random() * Math.PI * 2, color: '#3366ff',
          satellites: [
              { name: "Triton", orbit: 50, radius: 3.5, speed: 0.055, angle: Math.random() * Math.PI * 2, color: '#cccccc' }
          ]
        },
        { name: "Pluton", orbit: 3600, radius: 8, speed: 0.010, angle: Math.random() * Math.PI * 2, color: '#bb9977',
          satellites: [
              { name: "Charon", orbit: 30, radius: 2.5, speed: 0.045, angle: Math.random() * Math.PI * 2, color: '#aaaaaa' }
          ]
        },
        { name: "Halley",
          isComet: true,
          e: 0.967,
          a: 1830,
          b: 1830 * Math.sqrt(1 - 0.967 * 0.967),
          rotation: 2.83,
          angle: Math.random() * Math.PI * 2,
          speed: 0.03 / 76,
          radius: 6,
          color: '#cccccc'
        }
    ];

    // Définition de la ceinture d'astéroïdes (ceinture de Kuiper) entre Mars et Jupiter
    const asteroidBelt = [];
    const numAsteroids = 200;
    for (let i = 0; i < numAsteroids; i++) {
        const orbit = 1375 + (Math.random() * 200 - 100);
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.015 + Math.random() * 0.01;
        const radius = 0.5 + Math.random() * 1.0; // rayon entre 0.5 et 1.5
        asteroidBelt.push({ orbit, angle, speed, radius, color: '#888888' });
    }

    // Définition d'une deuxième ceinture d'astéroïdes
    // Placée autour de l'orbite de Pluton (c'est-à-dire le rayon entre le Soleil et Pluton)
    const asteroidBelt2 = [];
    const numAsteroids2 = 400;
    for (let i = 0; i < numAsteroids2; i++) {
        // La ceinture d'astéroïdes démarre à l'orbite de Pluton et s'étend sur 800 unités
        const orbit = 3600 + Math.random() * 800;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.005 + Math.random() * 0.005; // vitesse plus faible en raison de la distance
        const radius = 0.5 + Math.random() * 1.0; // rayon entre 0.5 et 1.5
        asteroidBelt2.push({ orbit, angle, speed, radius, color: '#888888' });
    }

    /*** Fonctions d'aide pour la simulation ***/

    // Met à jour les angles des planètes et de leurs satellites
    function updateAngles() {
        planets.forEach(planet => {
            planet.angle += planet.speed * timeMultiplier;
            if (planet.satellites) {
                planet.satellites.forEach(sat => {
                    sat.angle += sat.speed * timeMultiplier;
                });
            }
        });
    }

    // Calcule la position d'un corps (planète ou comète) dans la simulation
    function getPlanetPosition(planet, originX, originY, zoom) {
        if (planet.isComet) {
            const theta = planet.angle;
            const c = planet.a * planet.e; // Décalage dû à l'excentricité
            const xPos = planet.a * Math.cos(theta) - c;
            const yPos = planet.b * Math.sin(theta);
            const cosR = Math.cos(planet.rotation);
            const sinR = Math.sin(planet.rotation);
            const xComet = xPos * cosR - yPos * sinR;
            const yComet = xPos * sinR + yPos * cosR;
            return { x: originX + xComet * zoom, y: originY + yComet * zoom };
        } else if (planet.name === "Pluton") {
            const angle = planet.angle;
            const x = planet.orbit * Math.cos(angle);
            const y = planet.orbit * Math.sin(angle);
            // Appliquer la rotation de 17 degrés
            const cosR = Math.cos(0.3); // ~17 degrés
            const sinR = Math.sin(0.3);
            return {
                x: originX + (x * cosR - y * sinR) * zoom,
                y: originY + (x * sinR + y * cosR * 0.956) * zoom // 0.956 = cos(17°) pour la perspective
            };
        } else {
            return {
                x: originX + (planet.orbit * zoom) * Math.cos(planet.angle),
                y: originY + (planet.orbit * zoom) * Math.sin(planet.angle)
            };
        }
    }

    // Dessine l'orbite d'un corps (planète ou comète)
    function drawOrbit(ctx, planet, originX, originY, zoom) {
        if (!showOrbits) return; // Ne pas dessiner si showOrbits est false
        
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        
        if (planet.isComet) {
            ctx.save();
            ctx.translate(originX, originY);
            ctx.rotate(planet.rotation);
            ctx.beginPath();
            ctx.ellipse(-planet.a * planet.e * zoom, 0, planet.a * zoom, planet.b * zoom, 0, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();
        } else if (planet.name === "Pluton") {
            // Dessiner l'orbite inclinée de Pluton
            ctx.save();
            ctx.translate(originX, originY);
            ctx.rotate(0.3); // ~17 degrés
            ctx.scale(1, 0.956); // cos(17°) pour l'effet de perspective
            ctx.beginPath();
            ctx.arc(0, 0, planet.orbit * zoom, 0, Math.PI * 2);
            ctx.restore();
            ctx.stroke();
        } else {
            ctx.arc(originX, originY, planet.orbit * zoom, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Dessine un astéroïde en mettant à jour sa position
    function drawAsteroid(ctx, asteroid, originX, originY, zoom) {
        asteroid.angle += asteroid.speed * timeMultiplier;
        const ax = originX + (asteroid.orbit * zoom) * Math.cos(asteroid.angle);
        const ay = originY + (asteroid.orbit * zoom) * Math.sin(asteroid.angle);
        ctx.beginPath();
        ctx.fillStyle = "#777777";
        ctx.arc(ax, ay, asteroid.radius * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 0.5 * zoom;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
    }

    // Dessine l'anneau de Saturne autour de la planète
    // function drawSaturneRing(ctx, planetX, planetY, planetRadius, zoom) {
    //     ctx.save();
    //     ctx.translate(planetX, planetY);
    //     ctx.rotate(0.4); // Inclinaison de l'anneau (~23°)
    //     const outerX = (planetRadius * zoom) * 1.8;
    //     const outerY = (planetRadius * zoom) * 0.7;
    //     const thickness = 8 * zoom; 
    //     const grad = ctx.createLinearGradient(-outerX, 0, outerX, 0);
    //     grad.addColorStop(0, "#edd2a4");
    //     grad.addColorStop(0.25, "#f0c98c");
    //     grad.addColorStop(0.5, "#f7d19c");
    //     grad.addColorStop(0.75, "#e0b37b");
    //     grad.addColorStop(1, "#d4a26c");
    //     ctx.beginPath();
    //     ctx.ellipse(0, 0, outerX, outerY, 0, 0, 2 * Math.PI);
    //     ctx.ellipse(0, 0, outerX - thickness, outerY - thickness, 0, 0, 2 * Math.PI, true);
    //     ctx.fillStyle = grad;
    //     ctx.fill("evenodd");
    //     ctx.restore();
    // }

    // Fonction améliorée pour dessiner Jupiter avec des bandes atmosphériques
    function drawImprovedJupiter(ctx, centerX, centerY, planetRadius, zoom) {
        const r = planetRadius * zoom;
        ctx.save();
        // Définir une région de clipping en forme de cercle
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.clip();

        // Créer un dégradé linéaire vertical pour simuler les bandes atmosphériques
        const grad = ctx.createLinearGradient(centerX, centerY - r, centerX, centerY + r);
        grad.addColorStop(0, "#ffdd99");   // clair en haut
        grad.addColorStop(0.2, "#cc7700");   // bande sombre
        grad.addColorStop(0.5, "#ffcc66");   // intermédiaire
        grad.addColorStop(0.8, "#cc7700");   // bande sombre
        grad.addColorStop(1, "#ffdd99");      // clair en bas

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Nouvelle fonction pour dessiner la Grande Tache Rouge de Jupiter
    function drawJupiterSpot(ctx, centerX, centerY, planetRadius, zoom) {
        // Position de la tache décalée par rapport au centre
        const spotX = centerX + planetRadius * zoom * 0.3; // déplacement vers la droite
        const spotY = centerY - planetRadius * zoom * 0.3; // déplacement vers le haut
        const spotRadius = planetRadius * zoom * 0.4; // taille relative de la tache
        ctx.beginPath();
        ctx.fillStyle = "rgba(204, 51, 0, 0.8)"; // couleur rougeâtre avec transparence
        ctx.arc(spotX, spotY, spotRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Dessine un satellite autour d'une planète
    function drawSatellite(ctx, sat, planetX, planetY, zoom) {
        const satX = planetX + (sat.orbit * zoom) * Math.cos(sat.angle);
        const satY = planetY + (sat.orbit * zoom) * Math.sin(sat.angle);
        
        // Dessiner l'orbite du satellite seulement si showOrbits est true
        if (showOrbits) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 1;
            ctx.arc(planetX, planetY, sat.orbit * zoom, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Mettre à jour la trace du satellite s'il est activé
        if (traceEnabled(sat.name)) {
            updateTrace(sat.name, { x: satX, y: satY });
        }
        
        // Dessiner la planète avec amélioration pour Jupiter
        if (sat.name.toLowerCase() === "jupiter") {
            // Dessiner Jupiter sans la Grande Tache Rouge
            drawImprovedJupiter(ctx, satX, satY, sat.radius, zoom);
        } else if (sat.name.toLowerCase() === "saturne") {
            // Dessiner l'anneau de Saturne sous forme d'ellipse avec un rayon légèrement plus petit
            let outerRadiusX = sat.radius * zoom * 1.7;
            let outerRadiusY = sat.radius * zoom * 0.65;
            ctx.save();
            ctx.translate(satX, satY);
            ctx.rotate(0.4); // inclinaison de ~23°
            ctx.beginPath();
            ctx.ellipse(0, 0, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
            // Définir une épaisseur de trait un peu plus grosse pour les anneaux
            ctx.lineWidth = sat.radius * zoom * 0.3;
            ctx.strokeStyle = "#d4a26c";
            ctx.stroke();
            ctx.restore();

            // Dessiner le disque central de Saturne par-dessus
            ctx.beginPath();
            ctx.fillStyle = "#d4a26c";
            ctx.arc(satX, satY, sat.radius * zoom, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.fillStyle = sat.color;
            ctx.arc(satX, satY, sat.radius * zoom, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Afficher le nom du satellite si zoom >= 1.5 et si l'affichage des noms est activé
        if (zoom >= 1.5 && showNames) {
            ctx.font = "10px sans-serif";
            ctx.fillStyle = "white";
            ctx.fillText(sat.name, satX + sat.radius * zoom + 4, satY + sat.radius * zoom + 4);
        }
    }

    // Fonction principale qui dessine la scène
    function draw() {
        // Mise à jour des angles
        updateAngles();

        // Si une planète est sélectionnée, recalculer le décalage pour la centrer
        if (selectedPlanet) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const tmpPos = getPlanetPosition(selectedPlanet, centerX, centerY, zoom);
            // Si la planète sélectionnée possède des satellites, on ajuste l'offset pour que ceux-ci soient bien visibles.
            let offsetYExtra = 0;
            if (selectedPlanet.satellites && selectedPlanet.satellites.length > 0) {
                offsetYExtra = 50; // Cette valeur peut être ajustée selon vos besoins
            }
            viewOffsetX = centerX - tmpPos.x;
            viewOffsetY = (centerY + offsetYExtra) - tmpPos.y;
        }

        // Calcul de l'origine (centre du canvas ajusté par le décalage)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const originX = centerX + viewOffsetX;
        const originY = centerY + viewOffsetY;

        // Effacer le canvas
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dessiner les traces enregistrées
        drawTraces();

        // Dessiner les orbites des planètes et de la comète
        planets.forEach(planet => {
            drawOrbit(ctx, planet, originX, originY, zoom);
        });

        // Dessiner la ceinture d'astéroïdes (première ceinture)
        asteroidBelt.forEach(asteroid => {
            drawAsteroid(ctx, asteroid, originX, originY, zoom);
        });

        // Dessiner le Soleil
        ctx.beginPath();
        ctx.fillStyle = "yellow";
        ctx.arc(originX, originY, 30 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Mettre à jour la trace du Soleil si le checkbox est coché
        if (traceEnabled("Soleil")) {
            updateTrace("Soleil", { x: originX, y: originY });
        }

        // Dessiner les planètes et leurs satellites
        planets.forEach(planet => {
            const pos = getPlanetPosition(planet, originX, originY, zoom);
            // Mettre à jour la trace si elle est activée pour ce corps
            if (traceEnabled(planet.name)) {
                updateTrace(planet.name, pos);
            }
            // Dessiner la planète, avec une représentation modifiée pour Jupiter
            if (planet.name.toLowerCase() === "jupiter") {
                // Pour Jupiter, on affiche uniquement les bandes sans la tache rouge et on augmente sa taille un peu plus
                drawImprovedJupiter(ctx, pos.x, pos.y, planet.radius * 1.3, zoom);
            } else if (planet.name.toLowerCase() === "saturne") {
                // Dessiner l'anneau de Saturne (ellipse inclinée) et le disque central par-dessus
                let outerRadiusX = planet.radius * zoom * 1.7;
                let outerRadiusY = planet.radius * zoom * 0.65;
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(0.4); // inclinaison de ~23°
                ctx.beginPath();
                ctx.ellipse(0, 0, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
                ctx.lineWidth = planet.radius * zoom * 0.3;
                ctx.strokeStyle = "#d4a26c";
                ctx.stroke();
                ctx.restore();

                // Dessiner le disque central de Saturne
                ctx.beginPath();
                ctx.fillStyle = "#d4a26c";
                ctx.arc(pos.x, pos.y, planet.radius * zoom, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.fillStyle = planet.color;
                ctx.arc(pos.x, pos.y, planet.radius * zoom, 0, Math.PI * 2);
                ctx.fill();
            }
            // Si c'est la comète de HALLEY, dessiner sa traînée lorsqu'elle s'approche du Soleil
            if (planet.isComet) {
                // Calcul de la distance entre la comète et le Soleil (position d'origine)
                const dxSun = pos.x - originX;
                const dySun = pos.y - originY;
                const dist = Math.hypot(dxSun, dySun);
                const threshold = 1100 * zoom; // Seuil correspondant à l'orbite de Mars
                if (dist < threshold) {
                    // La traînée s'allonge à mesure que la comète se rapproche du Soleil
                    const tailLength = (threshold - dist) * 0.15; // Facteur d'allongement réduit (moitié de 0.3)
                    // La direction de la traînée doit être dans le sens opposé du Soleil.
                    // On utilise (pos - Sun) pour obtenir ce vecteur.
                    let vx = dxSun, vy = dySun;
                    const norm = Math.hypot(vx, vy);
                    if (norm > 0) {
                        vx /= norm;
                        vy /= norm;
                    }
                    const tailEndX = pos.x + vx * tailLength;
                    const tailEndY = pos.y + vy * tailLength;
                    // Créer un dégradé pour que la traînée s'estompe
                    const grad = ctx.createLinearGradient(pos.x, pos.y, tailEndX, tailEndY);
                    grad.addColorStop(0, 'rgba(255,255,255,0.7)');
                    grad.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = planet.radius * zoom * 1.5;
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y);
                    ctx.lineTo(tailEndX, tailEndY);
                    ctx.stroke();
                }
            }
            // Afficher le nom du corps
            if (showNames) {
                ctx.font = "12px sans-serif";
                ctx.fillStyle = "white";
                if (planet.isComet) {
                    ctx.fillText(planet.name, pos.x + planet.radius * zoom + 3, pos.y + planet.radius * zoom - 10);
                } else {
                    ctx.fillText(planet.name, pos.x + planet.radius * zoom + 3, pos.y + planet.radius * zoom + 3);
                }
            }

            // Dessiner les satellites s'il y en a (toujours centrés sur la planète)
            if (planet.satellites) {
                planet.satellites.forEach(sat => {
                    drawSatellite(ctx, sat, pos.x, pos.y, zoom);
                });
            }
        });

        // Dessiner la deuxième ceinture d'astéroïdes (autour de l'orbite de Pluton)
        asteroidBelt2.forEach(asteroid => {
            drawAsteroid(ctx, asteroid, originX, originY, zoom);
        });

        // Demande la prochaine frame d'animation
        requestAnimationFrame(draw);
    }

    draw();
}); 