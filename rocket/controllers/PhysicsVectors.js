class PhysicsVectors {
    constructor(physicsController, RENDER) {
        this.physicsController = physicsController; // Pour accéder à rocketBody, showForces etc.
        this.RENDER = RENDER;

        this.showForces = false;
        this.thrustForces = {
            main: { x: 0, y: 0 },
            rear: { x: 0, y: 0 },
            left: { x: 0, y: 0 },
            right: { x: 0, y: 0 }
        };
        this.gravityForce = { x: 0, y: 0 }; // Force calculée pour la visualisation
        // Note: La logique de calcul de this.gravityForce reste dans PhysicsController pour l'instant
        // car elle utilise this.celestialBodies qui n'est pas directement dans ce module.
        // On pourrait la déplacer ici si PhysicsVectors reçoit celestialBodies.
    }

    // Méthodes pour mettre à jour les forces depuis d'autres modules (ex: ThrusterPhysics)
    setThrustForce(thrusterName, x, y) {
        if (this.thrustForces[thrusterName]) {
            this.thrustForces[thrusterName] = { x, y };
        }
    }

    clearThrustForce(thrusterName) {
        if (this.thrustForces[thrusterName]) {
            this.thrustForces[thrusterName] = { x: 0, y: 0 };
        }
    }

     // Méthode pour mettre à jour la force de gravité depuis PhysicsController
     setGravityForceForDebug(x, y) {
         this.gravityForce = { x, y };
     }

    // Activer/désactiver l'affichage
    toggleForceVectors() {
        this.showForces = !this.showForces;
        console.log(`Affichage des vecteurs de force: ${this.showForces ? 'Activé' : 'Désactivé'}`);
        return this.showForces;
    }

    // Dessiner les vecteurs sur le canvas
    drawForceVectors(ctx, camera) {
        const rocketBody = this.physicsController.rocketBody;
        if (!this.showForces || !rocketBody || !camera) return;

        const baseScale = 0.02; // Échelle de base pour la force de poussée
        const minVectorScreenLength = 20; // Longueur minimale à l'écran
        const maxVectorScreenLength = 80; // Longueur maximale à l'écran
        const baseLineWidth = 1.5;
        const baseHeadLength = 8;
        const baseFontSize = 11;

        // Position de la fusée à l'écran
        const rocketScreenX = (rocketBody.position.x - camera.x) * camera.zoom + camera.offsetX;
        const rocketScreenY = (rocketBody.position.y - camera.y) * camera.zoom + camera.offsetY;

        // Dessiner les vecteurs de force des propulseurs
        for (const thrusterName in this.thrustForces) {
            const force = this.thrustForces[thrusterName];
            const forceMagnitude = Math.sqrt(force.x**2 + force.y**2);
            if (forceMagnitude === 0) continue;

            let color;
            switch (thrusterName) {
                case 'main': color = '#FF0000'; break; // Rouge
                case 'rear': color = '#00FF00'; break; // Vert
                case 'left': color = '#0000FF'; break; // Bleu
                case 'right': color = '#FFFF00'; break; // Jaune
                default: color = '#FFFFFF';
            }

            // Calculer la longueur à l'écran, limitée
            let screenLength = forceMagnitude * baseScale; // Calculer la longueur souhaitée sans zoom
            screenLength = Math.max(minVectorScreenLength, Math.min(screenLength, maxVectorScreenLength)); // Limiter à l'écran

            // Calculer la position de fin à l'écran
            const endScreenX = rocketScreenX + (force.x / forceMagnitude) * screenLength;
            const endScreenY = rocketScreenY + (force.y / forceMagnitude) * screenLength;

            this.drawArrow(ctx, rocketScreenX, rocketScreenY, endScreenX, endScreenY, color, baseLineWidth, baseHeadLength, camera.zoom);
        }

        // Dessiner le vecteur de vitesse
        if (rocketBody.velocity && (rocketBody.velocity.x !== 0 || rocketBody.velocity.y !== 0)) {
            const velocityColor = '#00FFFF'; // Cyan
            const velocityMagnitude = Math.sqrt(rocketBody.velocity.x**2 + rocketBody.velocity.y**2);
            const velocityBaseScale = 0.1; // Échelle de base pour la vitesse

             // Calculer la longueur à l'écran, limitée
             let screenLength = velocityMagnitude * velocityBaseScale;
             screenLength = Math.max(minVectorScreenLength, Math.min(screenLength, maxVectorScreenLength));

             // Calculer la position de fin à l'écran
             const endScreenX = rocketScreenX + (rocketBody.velocity.x / velocityMagnitude) * screenLength;
             const endScreenY = rocketScreenY + (rocketBody.velocity.y / velocityMagnitude) * screenLength;

            // Dessiner la ligne et la pointe
            this.drawArrow(ctx, rocketScreenX, rocketScreenY, endScreenX, endScreenY, velocityColor, baseLineWidth, baseHeadLength, camera.zoom);

            // Afficher la magnitude (taille fixe à l'écran)
            ctx.font = `${baseFontSize / camera.zoom}px Arial`; // Ajuster la taille de police
            ctx.fillStyle = velocityColor;
            const textX = endScreenX + (5 / camera.zoom); // Décaler en unités "monde" pour un décalage écran constant
            const textY = endScreenY - (5 / camera.zoom);
            const text = `V: ${velocityMagnitude.toFixed(1)} m/s`;
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = baseFontSize / camera.zoom; // Hauteur approximative
            const padding = 4 / camera.zoom;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Fond pour lisibilité
            ctx.fillRect(
                textX - padding, 
                textY - textHeight, 
                textWidth + padding * 2, 
                textHeight + padding * 2 
            );
            ctx.fillStyle = velocityColor;
            ctx.fillText(text, textX, textY);
        }

        // Dessiner le vecteur de force gravitationnelle
        if (this.gravityForce && (this.gravityForce.x !== 0 || this.gravityForce.y !== 0)) {
            const gravityColor = '#FF00FF'; // Magenta
            const forceMagnitude = Math.sqrt(this.gravityForce.x**2 + this.gravityForce.y**2);
            const angle = Math.atan2(this.gravityForce.y, this.gravityForce.x);

            // Échelle de base adaptative pour la gravité (plus petite force = plus grande échelle initiale)
            const gravityBaseScale = 0.00001 * Math.max(1, 50000 / forceMagnitude);

            // Calculer la longueur à l'écran, limitée
            let screenLength = forceMagnitude * gravityBaseScale;
            screenLength = Math.max(minVectorScreenLength, Math.min(screenLength, maxVectorScreenLength));

            const endScreenX = rocketScreenX + Math.cos(angle) * screenLength;
            const endScreenY = rocketScreenY + Math.sin(angle) * screenLength;

            // Dessiner la ligne et la pointe
            this.drawArrow(ctx, rocketScreenX, rocketScreenY, endScreenX, endScreenY, gravityColor, baseLineWidth, baseHeadLength, camera.zoom);

            // Afficher la magnitude avec fond (taille fixe à l'écran)
            ctx.font = `${baseFontSize / camera.zoom}px Arial`; // Ajuster la taille de police
            const text = `G: ${forceMagnitude.toFixed(1)}`;
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = baseFontSize / camera.zoom; // Hauteur approximative
            const padding = 4 / camera.zoom;

            // Positionner le texte légèrement décalé du bout de la flèche (décalage écran constant)
            const textOffsetScreen = 10; // Décalage souhaité en pixels écran
            const textOffsetX = (textOffsetScreen / camera.zoom) * Math.cos(angle);
            const textOffsetY = (textOffsetScreen / camera.zoom) * Math.sin(angle);
            const textX = endScreenX + textOffsetX; 
            const textY = endScreenY + textOffsetY;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(
                textX - padding,
                textY - textHeight, // Ajuster pour alignement vertical
                textWidth + padding * 2,
                textHeight + padding * 2
            );
            ctx.fillStyle = gravityColor;
            ctx.fillText(text, textX, textY);
        }
    }

    // Helper pour dessiner une flèche (avec zoom pour ajuster l'épaisseur/taille)
    drawArrow(ctx, screenFromX, screenFromY, screenToX, screenToY, color, desiredLineWidth, desiredHeadLength, zoom) {
        const angle = Math.atan2(screenToY - screenFromY, screenToX - screenFromX);

        // Épaisseur et taille de pointe ajustées pour l'écran
        const actualLineWidth = desiredLineWidth / zoom;
        const actualHeadLength = desiredHeadLength / zoom;

        // Corps de la flèche
        ctx.beginPath();
        ctx.moveTo(screenFromX, screenFromY);
        ctx.lineTo(screenToX, screenToY);
        ctx.strokeStyle = color;
        ctx.lineWidth = actualLineWidth; // Utiliser l'épaisseur ajustée
        ctx.stroke();

        // Pointe de la flèche (taille ajustée)
        ctx.beginPath();
        ctx.moveTo(screenToX, screenToY);
        ctx.lineTo(screenToX - actualHeadLength * Math.cos(angle - Math.PI / 6),
                   screenToY - actualHeadLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(screenToX - actualHeadLength * Math.cos(angle + Math.PI / 6),
                   screenToY - actualHeadLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }
} 