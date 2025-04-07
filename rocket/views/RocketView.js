class RocketView {
    constructor(particleSystemView) {
        this.particleSystemView = particleSystemView;
        this.rocketImage = new Image();
        this.rocketImage.src = 'assets/image/rocket.png'; // Chemin de l'image de la fusée
        
        // Dimensions de l'image basées sur les constantes
        this.width = ROCKET.WIDTH * 2; // Double de la largeur pour l'affichage
        this.height = ROCKET.HEIGHT * 1.6; // Hauteur proportionnelle
        
        // Affichage des vecteurs
        this.showGravityVector = false; // Option pour activer/désactiver l'affichage
        this.showThrustVector = false;  // Option pour afficher les vecteurs de poussée
        this.showVelocityVector = false; // Option pour afficher le vecteur de vitesse
        this.showThrusterPositions = false; // Option pour afficher la position des propulseurs
    }
    
    // Nouveau rendu avec support de la caméra et prise en charge de l'état
    render(ctx, rocketState, camera) {
        if (!rocketState || !rocketState.position) return;
        
        ctx.save();
        
        // Appliquer la transformation de la caméra
        ctx.translate(camera.offsetX, camera.offsetY);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);
        
        // Translater au centre de la fusée
        ctx.translate(rocketState.position.x, rocketState.position.y);
        
        // Dessiner la fusée
        ctx.save(); // Sauvegarder le contexte pour la rotation de la fusée
        
        // Pivoter selon l'angle de la fusée
        ctx.rotate(rocketState.angle);
        
        // Dessiner la fusée
        if (this.rocketImage.complete && this.rocketImage.naturalWidth > 0) {
            // Si l'image est chargée, l'utiliser
            try {
                ctx.drawImage(
                    this.rocketImage, 
                    -this.width / 2, 
                    -this.height / 2, 
                    this.width, 
                    this.height
                );
            } catch (e) {
                console.error("Erreur de chargement d'image:", e);
                this.drawRocketShape(ctx, rocketState);
            }
        } else {
            // Sinon, dessiner une forme simple comme secours
            this.drawRocketShape(ctx, rocketState);
        }
        
        ctx.restore(); // Restaurer le contexte sans la rotation pour les vecteurs
        
        // Dessiner les vecteurs si activés (APRÈS la fusée)
        if (this.showGravityVector && rocketState.gravityVector) {
            this.renderGravityVector(ctx, rocketState);
        }
        
        // Dessiner le vecteur de poussée des propulseurs
        if (this.showThrustVector && rocketState.thrustVectors) {
            this.renderThrustVectors(ctx, rocketState);
        }
        
        // Dessiner le vecteur de vitesse
        if (this.showVelocityVector && rocketState.velocity) {
            this.renderVelocityVector(ctx, rocketState);
        }
        
        ctx.restore();
    }
    
    // Affiche le vecteur de gravité agissant sur la fusée
    renderGravityVector(ctx, rocketState) {
        if (!rocketState.gravityVector) return;
        
        // Sauvegarder le contexte avant rotation
        ctx.save();
        
        const gravityVector = rocketState.gravityVector;
        
        // Calculer la magnitude de la gravité totale
        const gravityMagnitude = Math.sqrt(gravityVector.x * gravityVector.x + gravityVector.y * gravityVector.y);
        
        if (gravityMagnitude > 0.0000001) { // Vérifier si la gravité est significative
            // Normaliser la direction
            const dirX = gravityVector.x / gravityMagnitude;
            const dirY = gravityVector.y / gravityMagnitude;
            
            // Échelle de visualisation (la gravité est très petite, donc nous multiplions)
            const scale = RENDER.GRAVITY_SCALE_FACTOR; // Utiliser la constante définie
            const vectorLength = Math.min(gravityMagnitude * scale, RENDER.GRAVITY_MAX_LENGTH); // Utiliser la constante définie
            
            // Dessiner le vecteur
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(dirX * vectorLength, dirY * vectorLength);
            
            // Style de ligne
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#FFFF00"; // Jaune pour la gravité
            ctx.stroke();
            
            // Dessiner la flèche
            const arrowSize = RENDER.GRAVITY_ARROW_SIZE;
            const angle = Math.atan2(dirY, dirX);
            ctx.beginPath();
            ctx.moveTo(dirX * vectorLength, dirY * vectorLength);
            ctx.lineTo(
                dirX * vectorLength - arrowSize * Math.cos(angle - Math.PI/6),
                dirY * vectorLength - arrowSize * Math.sin(angle - Math.PI/6)
            );
            ctx.lineTo(
                dirX * vectorLength - arrowSize * Math.cos(angle + Math.PI/6),
                dirY * vectorLength - arrowSize * Math.sin(angle + Math.PI/6)
            );
            ctx.closePath();
            ctx.fillStyle = "#FFFF00";
            ctx.fill();
            
            // Ajouter un texte explicatif
            ctx.fillStyle = "#FFFF00";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText("G", dirX * vectorLength + dirX * 15, dirY * vectorLength + dirY * 15);
            
            // Afficher la valeur de l'accélération gravitationnelle
            ctx.font = "10px Arial";
            ctx.fillText(`${(gravityMagnitude * 1000).toFixed(4)} mm/s²`, 
                dirX * vectorLength + dirX * 25, 
                dirY * vectorLength + dirY * 25);
        }
        
        // Ajouter également le vecteur de vitesse pour référence
        this.renderVelocityVector(ctx, rocketState);
        
        ctx.restore();
    }
    
    // Affiche le vecteur de vitesse de la fusée
    renderVelocityVector(ctx, rocketState) {
        if (!rocketState.velocity) return;
        
        const velocityX = rocketState.velocity.x;
        const velocityY = rocketState.velocity.y;
        const velocityMagnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        
        if (velocityMagnitude > 0.00001) {
            // Normaliser
            const dirX = velocityX / velocityMagnitude;
            const dirY = velocityY / velocityMagnitude;
            
            // Calculer l'échelle pour le vecteur de vitesse
            const vectorLength = Math.min(velocityMagnitude * RENDER.VELOCITY_SCALE_FACTOR, RENDER.VELOCITY_MAX_LENGTH);
            
            // Dessiner le vecteur
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(dirX * vectorLength, dirY * vectorLength);
            
            // Style de ligne
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#00FFFF"; // Cyan pour la vitesse
            ctx.stroke();
            
            // Dessiner la flèche
            const arrowSize = RENDER.GRAVITY_ARROW_SIZE * 0.8;
            const angle = Math.atan2(dirY, dirX);
            ctx.beginPath();
            ctx.moveTo(dirX * vectorLength, dirY * vectorLength);
            ctx.lineTo(
                dirX * vectorLength - arrowSize * Math.cos(angle - Math.PI/6),
                dirY * vectorLength - arrowSize * Math.sin(angle - Math.PI/6)
            );
            ctx.lineTo(
                dirX * vectorLength - arrowSize * Math.cos(angle + Math.PI/6),
                dirY * vectorLength - arrowSize * Math.sin(angle + Math.PI/6)
            );
            ctx.closePath();
            ctx.fillStyle = "#00FFFF";
            ctx.fill();
            
            // Ajouter un texte explicatif
            ctx.fillStyle = "#00FFFF";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText("V", dirX * vectorLength + dirX * 15, dirY * vectorLength + dirY * 15);
            
            // Afficher la valeur de la vitesse
            ctx.font = "10px Arial";
            ctx.fillText(`${velocityMagnitude.toFixed(2)} m/s`, 
                dirX * vectorLength + dirX * 25, 
                dirY * vectorLength + dirY * 25);
        }
    }
    
    // Dessine une forme simple en secours si l'image n'est pas chargée
    drawRocketShape(ctx, rocketState) {
        const radius = ROCKET.WIDTH / 2;
        
        // Corps de la fusée
        ctx.fillStyle = '#CCCCCC';
        ctx.beginPath();
        ctx.moveTo(0, -radius * 2);
        ctx.lineTo(radius, radius);
        ctx.lineTo(-radius, radius);
        ctx.closePath();
        ctx.fill();
        
        // Détails de la fusée
        ctx.fillStyle = '#888888';
        ctx.fillRect(-radius * 0.8, radius * 0.5, radius * 1.6, radius * 0.5);
        
        // Réacteurs
        ctx.fillStyle = '#555555';
        ctx.fillRect(-radius * 0.6, radius, radius * 1.2, radius * 0.5);
    }
    
    // Affiche les vecteurs de poussée des propulseurs de la fusée
    renderThrustVectors(ctx, rocketState) {
        if (!rocketState.thrustVectors) return;
        
        ctx.save();
        
        // Afficher les positions des propulseurs si activé
        if (this.showThrusterPositions) {
            this.renderThrusterPositions(ctx, rocketState);
        }
        
        // Dessiner les vecteurs de poussée pour chaque propulseur
        for (const thrusterName in rocketState.thrustVectors) {
            const thrustVector = rocketState.thrustVectors[thrusterName];
            
            if (thrustVector.magnitude > 0) {
                const scale = RENDER.THRUST_SCALE_FACTOR; // Utiliser la constante définie
                const length = thrustVector.magnitude * scale;
                
                // Couleur en fonction du propulseur
                let color;
                switch (thrusterName) {
                    case 'main': color = '#FF5500'; break;
                    case 'rear': color = '#FF8800'; break;
                    case 'left': color = '#FFAA00'; break;
                    case 'right': color = '#FFAA00'; break;
                    default: color = '#FFFFFF';
                }
                
                // Dessiner le vecteur
                ctx.beginPath();
                ctx.moveTo(thrustVector.position.x, thrustVector.position.y);
                ctx.lineTo(
                    thrustVector.position.x + thrustVector.x * length,
                    thrustVector.position.y + thrustVector.y * length
                );
                
                // Style de ligne
                ctx.lineWidth = 2;
                ctx.strokeStyle = color;
                ctx.stroke();
                
                // Dessiner une flèche au bout du vecteur
                const arrowSize = RENDER.THRUST_ARROW_SIZE;
                const angle = Math.atan2(thrustVector.y, thrustVector.x);
                
                ctx.beginPath();
                ctx.moveTo(
                    thrustVector.position.x + thrustVector.x * length,
                    thrustVector.position.y + thrustVector.y * length
                );
                ctx.lineTo(
                    thrustVector.position.x + thrustVector.x * length - arrowSize * Math.cos(angle - Math.PI/6),
                    thrustVector.position.y + thrustVector.y * length - arrowSize * Math.sin(angle - Math.PI/6)
                );
                ctx.lineTo(
                    thrustVector.position.x + thrustVector.x * length - arrowSize * Math.cos(angle + Math.PI/6),
                    thrustVector.position.y + thrustVector.y * length - arrowSize * Math.sin(angle + Math.PI/6)
                );
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
    
    // Visualise la position des propulseurs
    renderThrusterPositions(ctx, rocketState) {
        // Afficher la position de chaque propulseur défini dans ROCKET.THRUSTER_POSITIONS
        for (const thrusterName in ROCKET.THRUSTER_POSITIONS) {
            const position = ROCKET.THRUSTER_POSITIONS[thrusterName];
            
            // Convertir la position polaire en coordonnées cartésiennes
            const x = Math.cos(position.angle) * position.distance;
            const y = Math.sin(position.angle) * position.distance;
            
            // Appliquer la rotation de la fusée
            const rotatedX = Math.cos(rocketState.angle) * x - Math.sin(rocketState.angle) * y;
            const rotatedY = Math.sin(rocketState.angle) * x + Math.cos(rocketState.angle) * y;
            
            // Couleur selon le propulseur
            let color;
            switch (thrusterName) {
                case 'MAIN': color = '#FF0000'; break;  // Rouge
                case 'REAR': color = '#00FF00'; break;  // Vert
                case 'LEFT': color = '#0000FF'; break;  // Bleu
                case 'RIGHT': color = '#FFFF00'; break; // Jaune
                default: color = '#FFFFFF';              // Blanc
            }
            
            // Dessiner un cercle à la position du propulseur
            ctx.beginPath();
            ctx.arc(rotatedX, rotatedY, 3, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            
            // Ajouter une étiquette avec le nom du propulseur
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(thrusterName, rotatedX, rotatedY - 8);
        }
    }

    // Activer/désactiver l'affichage des positions des propulseurs
    setShowThrusterPositions(enabled) {
        this.showThrusterPositions = enabled;
    }
} 