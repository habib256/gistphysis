// Fonctions de dessin

function getPlanetPosition(planet, originX, originY, zoom) {
    if (planet.isComet) {
        // Loi de Kepler et distances converties à l'échelle des planètes (planets.js).
        const p = positionComete(planet, planet.angle);
        return { x: originX + p.x * zoom, y: originY + p.y * zoom };
    } else if (planet.name === "Pluton") {
        const angle = planet.angle;
        const x = planet.orbit * Math.cos(angle);
        const y = planet.orbit * Math.sin(angle);
        const cosR = Math.cos(0.3);
        const sinR = Math.sin(0.3);
        return {
            x: originX + (x * cosR - y * sinR) * zoom,
            y: originY + (x * sinR + y * cosR * 0.956) * zoom
        };
    } else {
        return {
            x: originX + planet.orbit * zoom * Math.cos(planet.angle),
            y: originY + planet.orbit * zoom * Math.sin(planet.angle)
        };
    }
}

function drawOrbit(ctx, planet, originX, originY, zoom) {
    if (!showOrbits) return;
    if (planet.hideOrbit) return; // orbite de Cérès non tracée (lisibilité)

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    
    if (planet.isComet) {
        const pts = orbiteComete(planet);
        ctx.moveTo(originX + pts[0].x * zoom, originY + pts[0].y * zoom);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(originX + pts[i].x * zoom, originY + pts[i].y * zoom);
        ctx.stroke();
    } else if (planet.name === "Pluton") {
        ctx.save();
        ctx.translate(originX, originY);
        ctx.rotate(0.3);
        ctx.scale(1, 0.956);
        ctx.beginPath();
        ctx.arc(0, 0, planet.orbit * zoom, 0, Math.PI * 2);
        ctx.restore();
        ctx.stroke();
    } else {
        ctx.arc(originX, originY, planet.orbit * zoom, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawAsteroid(ctx, asteroid, originX, originY, zoom, timeMultiplier) {
    asteroid.angle += asteroid.speed * timeMultiplier;
    const ax = originX + asteroid.orbit * zoom * Math.cos(asteroid.angle);
    const ay = originY + asteroid.orbit * zoom * Math.sin(asteroid.angle);
    ctx.beginPath();
    ctx.fillStyle = "#777777";
    ctx.arc(ax, ay, asteroid.radius * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 0.5 * zoom;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
}

function drawImprovedJupiter(ctx, centerX, centerY, planetRadius, zoom) {
    const r = planetRadius * zoom;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.clip();

    const grad = ctx.createLinearGradient(centerX, centerY - r, centerX, centerY + r);
    grad.addColorStop(0, "#ffdd99");
    grad.addColorStop(0.2, "#cc7700");
    grad.addColorStop(0.5, "#ffcc66");
    grad.addColorStop(0.8, "#cc7700");
    grad.addColorStop(1, "#ffdd99");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Repères de départ (bouton « Chrono à zéro ») : un petit trait en travers de l'orbite marque
// la place de chaque astre au départ du chrono. Quand l'astre repasse sur son trait,
// il a fait un tour complet : on lit alors la durée sur le chrono.
function positionAvecAngle(planet, angle, originX, originY, zoom) {
    const sauve = planet.angle;
    planet.angle = angle;
    const pos = getPlanetPosition(planet, originX, originY, zoom);
    planet.angle = sauve;
    return pos;
}

function dessinerTrait(ctx, cx, cy, x, y, couleur) {
    let ux = x - cx, uy = y - cy;
    const n = Math.hypot(ux, uy);
    if (n < 1) return;
    ux /= n; uy /= n;
    ctx.beginPath();
    ctx.moveTo(x - ux * 9, y - uy * 9);
    ctx.lineTo(x + ux * 9, y + uy * 9);
    ctx.strokeStyle = couleur;
    ctx.lineWidth = 2.5;
    ctx.stroke();
}

function drawStartMarks(ctx, reperes, originX, originY, zoom) {
    if (!reperes) return;
    planets.forEach(planet => {
        const depart = reperes.get(planet);
        if (depart === undefined) return;
        const pos = positionAvecAngle(planet, depart, originX, originY, zoom);
        dessinerTrait(ctx, originX, originY, pos.x, pos.y, planet.color);
        // Satellites : repère autour de la position actuelle de leur planète, quand on les voit.
        if (planet.satellites && zoom >= 1.5) {
            const pp = getPlanetPosition(planet, originX, originY, zoom);
            planet.satellites.forEach(sat => {
                const a = reperes.get(sat);
                if (a === undefined) return;
                dessinerTrait(ctx, pp.x, pp.y, pp.x + sat.orbit * zoom * Math.cos(a), pp.y + sat.orbit * zoom * Math.sin(a), sat.color);
            });
        }
    });
}
