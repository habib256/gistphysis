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
        
        // Référence au modèle d'univers pour les calculs de gravité
        this.universeModel = null;
    }
    
    // Nouveau rendu avec support de la caméra
    render(ctx, rocketModel, camera) {
        ctx.save();
        
        // Appliquer la transformation de la caméra
        ctx.translate(camera.offsetX, camera.offsetY);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);
        
        // Translater au centre de la fusée
        ctx.translate(rocketModel.position.x, rocketModel.position.y);
        
        // Dessiner la fusée
        ctx.save(); // Sauvegarder le contexte pour la rotation de la fusée
        
        // Pivoter selon l'angle de la fusée
        ctx.rotate(rocketModel.angle);
        
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
                this.drawRocketShape(ctx, rocketModel);
            }
        } else {
            // Sinon, dessiner une forme simple comme secours
            this.drawRocketShape(ctx, rocketModel);
        }
        
        ctx.restore(); // Restaurer le contexte sans la rotation pour les vecteurs
        
        // Dessiner les vecteurs si activés (APRÈS la fusée)
        if (this.showGravityVector && this.universeModel) {
            this.renderGravityVector(ctx, rocketModel);
        }
        
        // Dessiner le vecteur de poussée des propulseurs
        if (this.showThrustVector) {
            this.renderThrustVectors(ctx, rocketModel);
        }
        
        // Dessiner les indicateurs de santé
        this.drawHealthBar(ctx, rocketModel, -this.height / 2 - 15);
        
        ctx.restore();
    }
    
    // Affiche le vecteur de gravité agissant sur la fusée
    renderGravityVector(ctx, rocketModel) {
        // Sauvegarder le contexte avant rotation
        ctx.save();
        
        // S'assurer que le modèle de l'univers est disponible
        if (!this.universeModel || !this.universeModel.celestialBodies) {
            ctx.restore();
            return;
        }
        
        // Variables pour collecter la force gravitationnelle totale
        let totalGravityX = 0;
        let totalGravityY = 0;
        
        // Calculer la gravité de chaque corps céleste, exactement comme dans PhysicsController
        for (const body of this.universeModel.celestialBodies) {
            // Vecteur de la fusée vers le corps céleste
            const dx = body.position.x - rocketModel.position.x;
            const dy = body.position.y - rocketModel.position.y;
            const distanceSquared = dx * dx + dy * dy;
            const distance = Math.sqrt(distanceSquared);
            
            // Force gravitationnelle
            const gravitationalConstant = PHYSICS.G;
            const forceMagnitude = gravitationalConstant * body.mass * rocketModel.mass / distanceSquared;
            
            // Composantes de la force
            const forceX = forceMagnitude * (dx / distance);
            const forceY = forceMagnitude * (dy / distance);
            
            // Accélération (F = ma => a = F/m)
            const accelerationX = forceX / rocketModel.mass;
            const accelerationY = forceY / rocketModel.mass;
            
            // Ajouter à la force totale
            totalGravityX += accelerationX;
            totalGravityY += accelerationY;
        }
        
        // Calculer la magnitude de la gravité totale
        const gravityMagnitude = Math.sqrt(totalGravityX * totalGravityX + totalGravityY * totalGravityY);
        
        if (gravityMagnitude > 0.0000001) { // Vérifier si la gravité est significative
            // Normaliser la direction
            const dirX = totalGravityX / gravityMagnitude;
            const dirY = totalGravityY / gravityMagnitude;
            
            // Échelle de visualisation (la gravité est très petite, donc nous multiplions)
            const scale = 100000; // Facteur d'échelle pour rendre le vecteur visible
            const vectorLength = Math.min(gravityMagnitude * scale, 100); // Limiter la longueur max
            
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
        this.renderVelocityVector(ctx, rocketModel);
        
        ctx.restore();
    }
    
    // Affiche le vecteur de vitesse de la fusée
    renderVelocityVector(ctx, rocketModel) {
        const velocityX = rocketModel.velocity.x;
        const velocityY = rocketModel.velocity.y;
        const velocityMagnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        
        if (velocityMagnitude > 0.00001) {
            // Normaliser
            const dirX = velocityX / velocityMagnitude;
            const dirY = velocityY / velocityMagnitude;
            
            // Calculer l'échelle pour le vecteur de vitesse
            const vectorLength = Math.min(velocityMagnitude * 50, 80);
            
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
    drawRocketShape(ctx, rocketModel) {
        const radius = rocketModel.radius;
        
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
    
    // Dessine une barre de santé au-dessus de la fusée
    drawHealthBar(ctx, rocketModel, offsetY) {
        const width = 50;
        const height = 5;
        const x = -width / 2;
        const y = offsetY;
        
        // Fond de la barre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, width, height);
        
        // Barre de santé
        const healthPercent = rocketModel.health / 100;
        ctx.fillStyle = this.getHealthColor(healthPercent);
        ctx.fillRect(x, y, width * healthPercent, height);
    }
    
    // Renvoie une couleur en fonction du pourcentage de santé
    getHealthColor(percent) {
        if (percent > 0.6) return 'rgba(0, 255, 0, 0.7)';
        if (percent > 0.3) return 'rgba(255, 255, 0, 0.7)';
        return 'rgba(255, 0, 0, 0.7)';
    }
    
    // Affiche les vecteurs de poussée des propulseurs de la fusée
    renderThrustVectors(ctx, rocketModel) {
        ctx.save();
        
        // Vérifier si des propulseurs sont actifs
        const thrusters = rocketModel.thrusters;
        
        for (const thrusterName in thrusters) {
            const thruster = thrusters[thrusterName];
            
            // Si le propulseur est actif
            if (thruster.power > 0) {
                // Calculer la direction de la poussée en fonction du type de propulseur
                let thrustAngle;
                let color = "#FF5500"; // Couleur par défaut (orange)
                
                switch (thrusterName) {
                    case 'main': 
                        thrustAngle = rocketModel.angle + Math.PI/2; // Poussée vers le bas de la fusée
                        color = "#FF3300"; // Rouge orangé
                        break;
                    case 'rear': 
                        thrustAngle = rocketModel.angle - Math.PI/2; // Poussée vers le haut de la fusée
                        color = "#FF9900"; // Orange
                        break;
                    case 'left': 
                        thrustAngle = rocketModel.angle + 0; // Poussée vers la droite
                        color = "#FFCC00"; // Jaune orangé
                        break;
                    case 'right': 
                        thrustAngle = rocketModel.angle + Math.PI; // Poussée vers la gauche
                        color = "#FFCC00"; // Jaune orangé
                        break;
                    default:
                        thrustAngle = rocketModel.angle;
                }
                
                // Déterminer la force du propulseur
                let thrustForce;
                switch (thrusterName) {
                    case 'main': 
                        thrustForce = PHYSICS.MAIN_THRUST * (thruster.power / 100);
                        break;
                    case 'rear': 
                        thrustForce = PHYSICS.REAR_THRUST * (thruster.power / 100);
                        break;
                    case 'left':
                    case 'right': 
                        thrustForce = PHYSICS.LATERAL_THRUST * (thruster.power / 100);
                        break;
                    default:
                        thrustForce = 0;
                }
                
                // La direction opposée à la poussée (direction dans laquelle la fusée se déplace)
                const dirX = -Math.cos(thrustAngle);
                const dirY = -Math.sin(thrustAngle);
                
                // Calculer la longueur du vecteur basée sur la puissance du propulseur
                const vectorLength = thrustForce * 10000; // Facteur d'échelle pour la visualisation
                
                // Dessiner le vecteur
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(dirX * vectorLength, dirY * vectorLength);
                
                // Style de ligne
                ctx.lineWidth = 3;
                ctx.strokeStyle = color;
                ctx.stroke();
                
                // Dessiner la flèche
                const arrowSize = RENDER.GRAVITY_ARROW_SIZE * 1.2;
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
                ctx.fillStyle = color;
                ctx.fill();
                
                // Ajouter un texte explicatif
                ctx.fillStyle = color;
                ctx.font = "12px Arial";
                ctx.textAlign = "center";
                
                // Ajouter le nom du propulseur et sa puissance
                const thrusterLabels = {
                    'main': 'P',  // Propulseur principal
                    'rear': 'R',  // Propulseur arrière
                    'left': 'G',  // Propulseur gauche
                    'right': 'D'  // Propulseur droit
                };
                
                const label = thrusterLabels[thrusterName] || thrusterName;
                ctx.fillText(label, dirX * vectorLength + dirX * 15, dirY * vectorLength + dirY * 15);
                ctx.font = "10px Arial";
                ctx.fillText(`${thruster.power}%`, dirX * vectorLength + dirX * 25, dirY * vectorLength + dirY * 25);
            }
        }
        
        ctx.restore();
    }
} 