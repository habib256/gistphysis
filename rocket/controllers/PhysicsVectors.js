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

        const scale = 0.02; // Échelle de visualisation des forces de poussée
        const rocketX = (rocketBody.position.x - camera.x) * camera.zoom + camera.offsetX;
        const rocketY = (rocketBody.position.y - camera.y) * camera.zoom + camera.offsetY;

        // Dessiner les vecteurs de force des propulseurs
        for (const thrusterName in this.thrustForces) {
            const force = this.thrustForces[thrusterName];
            if (force.x === 0 && force.y === 0) continue;

            let color;
            switch (thrusterName) {
                case 'main': color = '#FF0000'; break; // Rouge
                case 'rear': color = '#00FF00'; break; // Vert
                case 'left': color = '#0000FF'; break; // Bleu
                case 'right': color = '#FFFF00'; break; // Jaune
                default: color = '#FFFFFF';
            }

            ctx.beginPath();
            ctx.moveTo(rocketX, rocketY);
            ctx.lineTo(
                rocketX + force.x * scale * camera.zoom,
                rocketY + force.y * scale * camera.zoom
            );
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Dessiner le vecteur de vitesse
        if (rocketBody.velocity && (rocketBody.velocity.x !== 0 || rocketBody.velocity.y !== 0)) {
            const velocityColor = '#00FFFF'; // Cyan
            const velocityMagnitude = Math.sqrt(rocketBody.velocity.x**2 + rocketBody.velocity.y**2);
            const velocityScale = 10; // Échelle plus grande pour la vitesse

            const endX = rocketX + rocketBody.velocity.x * velocityScale * camera.zoom;
            const endY = rocketY + rocketBody.velocity.y * velocityScale * camera.zoom;

            // Dessiner la ligne et la pointe
            this.drawArrow(ctx, rocketX, rocketY, endX, endY, velocityColor, 2, 10 * camera.zoom);

            // Afficher la magnitude
            ctx.font = `${(12 * camera.zoom).toFixed(0)}px Arial`;
            ctx.fillStyle = velocityColor;
            ctx.fillText(
                `V: ${velocityMagnitude.toFixed(1)} m/s`,
                endX + 5 * camera.zoom,
                endY - 5 * camera.zoom
            );
        }

        // Dessiner le vecteur de force gravitationnelle (calculé dans PhysicsController)
        if (this.gravityForce && (this.gravityForce.x !== 0 || this.gravityForce.y !== 0)) {
            const gravityColor = '#FF00FF'; // Magenta
            const forceMagnitude = Math.sqrt(this.gravityForce.x**2 + this.gravityForce.y**2);
            const angle = Math.atan2(this.gravityForce.y, this.gravityForce.x);

            // Échelle adaptative
            const adaptiveScale = 0.0001 * Math.max(1, 500000 / forceMagnitude);
            let displayLength = forceMagnitude * adaptiveScale * camera.zoom;
            const maxLength = this.RENDER.GRAVITY_MAX_LENGTH * camera.zoom;
            const minLength = 30 * camera.zoom;
            displayLength = Math.max(minLength, Math.min(displayLength, maxLength));

            const endX = rocketX + Math.cos(angle) * displayLength;
            const endY = rocketY + Math.sin(angle) * displayLength;

            // Dessiner la ligne et la pointe
            this.drawArrow(ctx, rocketX, rocketY, endX, endY, gravityColor, 2, 10 * camera.zoom);

            // Afficher la magnitude avec fond
            ctx.font = `${(12 * camera.zoom).toFixed(0)}px Arial`;
            const text = `G: ${forceMagnitude.toFixed(1)}`; // G pour Gravité
            const textWidth = ctx.measureText(text).width;
            const textHeight = 14 * camera.zoom;
            const padding = 4 * camera.zoom;
            const textX = endX - (textWidth / 2) * Math.cos(angle + Math.PI / 2) + 10 * Math.cos(angle);
            const textY = endY - (textHeight / 2) * Math.sin(angle + Math.PI / 2) + 10 * Math.sin(angle);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(
                textX - padding,
                textY - textHeight + padding, // Ajustement pour position verticale
                textWidth + padding * 2,
                textHeight + padding
            );
            ctx.fillStyle = gravityColor;
            ctx.fillText(text, textX, textY);
        }
    }

    // Helper pour dessiner une flèche
    drawArrow(ctx, fromX, fromY, toX, toY, color, lineWidth, headLength) {
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // Corps de la flèche
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Pointe de la flèche
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6),
                   toY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6),
                   toY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }
} 