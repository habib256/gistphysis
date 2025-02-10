function drawFrame() {
  
    updateAngles(timeMultiplier);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
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
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dessiner les traces, orbites, astéroïdes, Soleil, planètes, etc.
    drawTraces(ctx);
    
    planets.forEach(planet => {
        drawOrbit(ctx, planet, originX, originY, zoom);
    });
    
    asteroidBelt.forEach(asteroid => {
        drawAsteroid(ctx, asteroid, originX, originY, zoom, timeMultiplier);
    });
    
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
            ctx.font = "12px sans-serif";
            ctx.fillStyle = "white";
            if (planet.isComet) {
                ctx.fillText(planet.name, pos.x + planet.radius * zoom + 3, pos.y + planet.radius * zoom - 10);
            } else {
                ctx.fillText(planet.name, pos.x + planet.radius * zoom + 3, pos.y + planet.radius * zoom + 3);
            }
        }
        
        if (planet.satellites) {
            planet.satellites.forEach(sat => {
                drawSatellite(ctx, sat, pos.x, pos.y, zoom, timeMultiplier);
            });
        }
    });
    
    asteroidBelt2.forEach(asteroid => {
        drawAsteroid(ctx, asteroid, originX, originY, zoom, timeMultiplier);
    });
    
    requestAnimationFrame(drawFrame);
}

function drawSatellite(ctx, sat, planetX, planetY, zoom, timeMultiplier) {
    sat.angle += sat.speed * timeMultiplier;
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
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText(sat.name, satX + sat.radius * zoom + 4, satY + sat.radius * zoom + 4);
    }
    
    // Mise à jour de la trace pour la Lune (ou tout autre satellite pour lequel le checkbox est coché)
    if (traceEnabled(sat.name)) {
        updateTrace(sat.name, { x: satX, y: satY });
    }
} 