// Horloge de la simulation : temps écoulé en jours terrestres depuis le dernier « Chrono à zéro ».
// Chaque image fait avancer tous les astres de JOURS_PAR_PAS × multiplicateur jours (planets.js) :
// l'horloge compte exactement le même temps que celui des orbites.
let enPause = false;
let tempsSimuleJours = 0;
let reperesDepart = null; // Map astre -> angle au départ du chrono (null : pas de repères)
let imagesDepuisAffichage = 0;
const horodatagesImages = [];

function chronoAZero() {
    tempsSimuleJours = 0;
    reperesDepart = new Map();
    planets.forEach(p => {
        reperesDepart.set(p, p.angle);
        (p.satellites || []).forEach(s => reperesDepart.set(s, s.angle));
    });
    mettreAJourHorloge(true);
}

// Images par seconde mesurées sur la dernière seconde (60 par défaut au démarrage).
function imagesParSeconde() {
    const n = horodatagesImages.length;
    if (n < 10) return 60;
    return (n - 1) / ((horodatagesImages[n - 1] - horodatagesImages[0]) / 1000);
}

function chiffresSignificatifs(x) {
    const d = x >= 10 ? 0 : 1;
    return formaterNombre(x, d);
}

function texteVitesse(joursParSeconde) {
    if (joursParSeconde * 24 < 1) return chiffresSignificatifs(joursParSeconde * 24 * 60) + " min";
    if (joursParSeconde < 1) return chiffresSignificatifs(joursParSeconde * 24) + " h";
    if (joursParSeconde < 30.44) return chiffresSignificatifs(joursParSeconde) + (joursParSeconde < 2 ? " jour" : " jours");
    if (joursParSeconde < 365.25) return chiffresSignificatifs(joursParSeconde / 30.44) + " mois";
    const ans = joursParSeconde / 365.25;
    return chiffresSignificatifs(ans) + (ans < 2 ? " an" : " ans");
}

function texteDuree(jours) {
    if (jours < 1000) {
        const d = jours < 100 ? 1 : 0;
        const ans = jours / 365.25;
        return {
            principal: formaterNombre(jours, d) + (jours < 2 ? " jour" : " jours"),
            secondaire: "soit " + formaterNombre(ans, 2) + (ans < 2 ? " an" : " ans")
        };
    }
    const ans = jours / 365.25;
    return {
        principal: formaterNombre(ans, ans < 100 ? 1 : 0) + " ans",
        secondaire: "soit " + formaterNombre(jours, 0) + " jours"
    };
}

function mettreAJourHorloge(forcer) {
    if (!forcer && ++imagesDepuisAffichage < 6) return;
    imagesDepuisAffichage = 0;
    const valeur = document.getElementById("chronoValeur");
    const equivalent = document.getElementById("chronoEquivalent");
    const vitesse = document.getElementById("chronoVitesse");
    if (!valeur) return;
    const t = texteDuree(tempsSimuleJours);
    if (valeur.textContent !== t.principal) valeur.textContent = t.principal;
    if (equivalent.textContent !== t.secondaire) equivalent.textContent = t.secondaire;
    const v = (enPause || timeMultiplier === 0) ? "Vitesse : en pause"
        : "Vitesse : 1 s ≈ " + texteVitesse(JOURS_PAR_PAS * timeMultiplier * imagesParSeconde());
    if (vitesse.textContent !== v) vitesse.textContent = v;
}

// Étiquettes des noms : placées après le dessin, sans chevauchement.
// Ordre de priorité : astre suivi, planètes, comète et planètes naines, satellites.
// Une étiquette qui ne trouve aucune place libre n'est pas écrite (zoomer pour la voir).
function dessinerEtiquettes(ctx, etiquettes) {
    const places = [];
    const chevauche = b => places.some(o => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h);
    etiquettes.sort((a, b) => a.priorite - b.priorite);
    for (const e of etiquettes) {
        ctx.font = e.taille + "px sans-serif";
        const w = ctx.measureText(e.texte).width;
        const h = e.taille + 2;
        const ecart = e.r + 3;
        const essais = [
            {x: e.x + ecart, y: e.y + ecart - h + 2},
            {x: e.x + ecart, y: e.y - ecart - h},
            {x: e.x - ecart - w, y: e.y + ecart - h + 2},
            {x: e.x - ecart - w, y: e.y - ecart - h}
        ];
        let choix = essais.find(b => !chevauche({x: b.x, y: b.y, w, h}));
        if (!choix && e.priorite === 0) choix = essais[0];
        if (!choix) continue;
        places.push({x: choix.x, y: choix.y, w, h});
        ctx.fillStyle = "white";
        ctx.fillText(e.texte, choix.x, choix.y + h - 3);
    }
}

function drawFrame() {
    const maintenant = performance.now();
    horodatagesImages.push(maintenant);
    while (horodatagesImages.length > 2 && maintenant - horodatagesImages[0] > 1000) horodatagesImages.shift();

    // Pas de temps de cette image (0 en pause) : il sert à toutes les mises à jour d'angles.
    const pas = enPause ? 0 : timeMultiplier;
    tempsSimuleJours += JOURS_PAR_PAS * pas;
    const etiquettes = [];

    updateAngles(pas);
    
    // Centre de la vue en pixels CSS (le contexte est déjà mis à l'échelle de l'écran).
    const centerX = viewWidth / 2;
    const centerY = viewHeight / 2;
    
    if (selectedPlanet) {
        // Calculer la position de la planète à partir du centre du canvas
        const tmpPos = getPlanetPosition(selectedPlanet, centerX, centerY, zoom);
        // Optionnel : Si la planète a des satellites, on peut ajouter un décalage vertical
        const offsetYExtra = (selectedPlanet.satellites && selectedPlanet.satellites.length > 0) ? 50 : 0;
        // Calculer le décalage nécessaire pour centrer la planète
        const newOffsetX = centerX - tmpPos.x;
        const newOffsetY = (centerY + offsetYExtra) - tmpPos.y;
        setViewOffsets(newOffsetX, newOffsetY);
    }
    
    // Calcul de l'origine (centre du canvas ajusté par le décalage)
    const originX = centerX + viewOffsetX;
    const originY = centerY + viewOffsetY;
    
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    
    // Dessiner les traces, orbites, astéroïdes, Soleil, planètes, etc.
    drawTraces(ctx);
    
    planets.forEach(planet => {
        drawOrbit(ctx, planet, originX, originY, zoom);
    });
    
    asteroidBelt.forEach(asteroid => {
        drawAsteroid(ctx, asteroid, originX, originY, zoom, pas);
    });

    drawStartMarks(ctx, reperesDepart, originX, originY, zoom);
    
    ctx.beginPath();
    ctx.fillStyle = "yellow";
    ctx.arc(originX, originY, 50 * zoom, 0, Math.PI * 2);
    ctx.fill();
    
    if (traceEnabled("Soleil")) {
        updateTrace("Soleil", { x: originX, y: originY });
    }
    
    planets.forEach(planet => {
        const pos = getPlanetPosition(planet, originX, originY, zoom);
        if (traceEnabled(planet.name)) {
            updateTrace(planet.name, pos);
        }
        
        // Traitement particulier pour certaines planètes...
        if (planet.name.toLowerCase() === "jupiter") {
            drawImprovedJupiter(ctx, pos.x, pos.y, planet.radius * 1.3, zoom);
        } else if (planet.name.toLowerCase() === "saturne") {
            let outerRadiusX = planet.radius * zoom * 1.7;
            let outerRadiusY = planet.radius * zoom * 0.65;
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(0.4);
            ctx.beginPath();
            ctx.ellipse(0, 0, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
            ctx.lineWidth = planet.radius * zoom * 0.3;
            ctx.strokeStyle = "#d4a26c";
            ctx.stroke();
            ctx.restore();
            
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
        
        // Affichage d'une éventuelle traînée pour une comète (si définie)
        if (planet.isComet) {
            const dxSun = pos.x - originX;
            const dySun = pos.y - originY;
            const dist = Math.hypot(dxSun, dySun);
            const threshold = 1100 * zoom;
            if (dist < threshold) {
                const tailLength = (threshold - dist) * 0.15;
                let vx = dxSun, vy = dySun;
                const norm = Math.hypot(vx, vy);
                if (norm > 0) {
                    vx /= norm;
                    vy /= norm;
                }
                const tailEndX = pos.x + vx * tailLength;
                const tailEndY = pos.y + vy * tailLength;
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
        
        if (showNames) {
            etiquettes.push({
                texte: planet.name, x: pos.x, y: pos.y, r: planet.radius * zoom, taille: 12,
                priorite: planet === selectedPlanet ? 0 : (planet.isComet || planet.dwarf ? 2 : 1)
            });
        }

        if (planet.satellites) {
            planet.satellites.forEach(sat => {
                drawSatellite(ctx, sat, pos.x, pos.y, zoom, etiquettes);
            });
        }
    });
    
    asteroidBelt2.forEach(asteroid => {
        drawAsteroid(ctx, asteroid, originX, originY, zoom, pas);
    });

    if (showNames) dessinerEtiquettes(ctx, etiquettes);
    mettreAJourHorloge(false);

    requestAnimationFrame(drawFrame);
}

// L'angle du satellite est mis à jour une seule fois par image, dans updateAngles (planets.js).
// (Il l'était aussi ici : les satellites tournaient deux fois trop vite.)
function drawSatellite(ctx, sat, planetX, planetY, zoom, etiquettes) {
    const satX = planetX + sat.orbit * zoom * Math.cos(sat.angle);
    const satY = planetY + sat.orbit * zoom * Math.sin(sat.angle);
    
    if (showOrbits) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.arc(planetX, planetY, sat.orbit * zoom, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    if (sat.name.toLowerCase() === "jupiter") {
        drawImprovedJupiter(ctx, satX, satY, sat.radius, zoom);
    } else if (sat.name.toLowerCase() === "saturne") {
        let outerRadiusX = sat.radius * zoom * 1.7;
        let outerRadiusY = sat.radius * zoom * 0.65;
        ctx.save();
        ctx.translate(satX, satY);
        ctx.rotate(0.4);
        ctx.beginPath();
        ctx.ellipse(0, 0, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
        ctx.lineWidth = sat.radius * zoom * 0.3;
        ctx.strokeStyle = "#d4a26c";
        ctx.stroke();
        ctx.restore();
        
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
    
    if (zoom >= 1.5 && showNames) {
        etiquettes.push({texte: sat.name, x: satX, y: satY, r: sat.radius * zoom + 1, taille: 11, priorite: 3});
    }
    
    // Mise à jour de la trace pour la Lune (ou tout autre satellite pour lequel le checkbox est coché)
    if (traceEnabled(sat.name)) {
        updateTrace(sat.name, { x: satX, y: satY });
    }
} 