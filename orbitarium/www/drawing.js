// Fonctions de dessin

// Variable globale pour stocker le zoom précédent
let lastZoom = null;

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
    if (planet.name === "Ceres") return; // Ne pas tracer l'orbite de Ceres

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
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

function drawSatellite(ctx, sat, planetX, planetY, zoom, timeMultiplier) {
    sat.angle += sat.speed * timeMultiplier;
    const satX = planetX + sat.orbit * zoom * Math.cos(sat.angle);
    const satY = planetY + sat.orbit * zoom * Math.sin(sat.angle);
    
    if (showOrbits) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
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
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText(sat.name, satX + sat.radius * zoom + 4, satY + sat.radius * zoom + 4);
    }
}

// Nouvelle fonction pour dessiner la traînée de la comète
function drawCometTrail(ctx, planet, originX, originY, zoom) {
    // Si le niveau de zoom a changé, réinitialiser les traces pour toutes les comètes
    if (lastZoom === null || lastZoom !== zoom) {
        if (typeof planets !== "undefined") {
            planets.forEach(p => {
                if (p.isComet && p.trail) {
                    p.trail = [];
                }
            });
        }
        lastZoom = zoom;
    }

    if (planet.isComet && planet.trail && planet.trail.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < planet.trail.length; i++) {
            const pt = planet.trail[i];
            const x = originX + pt.x * zoom;
            const y = originY + pt.y * zoom;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.strokeStyle = planet.color; // on utilise la couleur de la comète
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

// Réinitialiser les traces de toutes les comètes dès qu'on utilise la molette de la souris
window.addEventListener('wheel', function(event) {
    if (typeof planets !== "undefined") {
        planets.forEach(p => {
            if (p.isComet && p.trail) {
                p.trail = [];
            }
        });
    }
}); 