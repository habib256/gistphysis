class UIView {
    constructor() {
        this.font = '16px Arial';
        this.colors = {
            white: 'white',
            red: 'red',
            orange: 'orange',
            green: 'green',
            success: 'rgba(0, 255, 0, 0.8)'
        };
    }

    renderPause(ctx, canvas) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = '48px Arial';
        ctx.fillStyle = this.colors.white;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSE', canvas.width / 2, canvas.height / 2);
    }

    renderRocketInfo(ctx, rocketModel) {
        ctx.font = this.font;
        ctx.fillStyle = this.colors.white;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const barWidth = 100;
        const barHeight = 10;
        const barX = 100;
        
        // Texte de santé (toujours en blanc)
        ctx.fillText(`Santé:`, 20, 20);
        
        // Barre de santé
        const barYHealth = 25;
        
        // Fond de la barre
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barYHealth, barWidth, barHeight);
        
        // Barre de progression pour la santé
        const health = Math.floor(rocketModel.health);
        if (health < 30) {
            ctx.fillStyle = this.colors.red;
        } else if (health < 70) {
            ctx.fillStyle = this.colors.orange;
        } else {
            ctx.fillStyle = this.colors.green;
        }
        const healthWidth = (health / ROCKET.MAX_HEALTH) * barWidth;
        ctx.fillRect(barX, barYHealth, healthWidth, barHeight);
        
        // Retour à la couleur blanche pour le texte
        ctx.fillStyle = this.colors.white;
        
        // Afficher le carburant
        ctx.fillText(`Carburant:`, 20, 50);
        
        // Barre de carburant
        const barYFuel = 55;
        
        // Fond de la barre
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barYFuel, barWidth, barHeight);
        
        // Barre de progression pour le carburant
        const fuel = rocketModel.fuel;
        const fuelPercentage = (fuel / ROCKET.FUEL_MAX) * 100;
        
        // Changer la couleur en fonction du niveau de carburant
        if (fuelPercentage < 30) {
            ctx.fillStyle = this.colors.red;
        } else if (fuelPercentage < 70) {
            ctx.fillStyle = this.colors.orange;
        } else {
            ctx.fillStyle = this.colors.green;
        }
        
        const fuelWidth = (fuel / ROCKET.FUEL_MAX) * barWidth;
        ctx.fillRect(barX, barYFuel, fuelWidth, barHeight);
        
        // Retour à la couleur blanche pour le texte
        ctx.fillStyle = this.colors.white;
        
        // Calculer et afficher la vitesse
        const speed = this.calculateSpeed(rocketModel);
        this.renderSpeed(ctx, speed, 20, 80);
    }

    calculateSpeed(rocketModel) {
        if (!rocketModel || !rocketModel.velocity) return 0;
        
        // Calculer la vitesse absolue (amplitude du vecteur vitesse)
        const vx = rocketModel.velocity.x;
        const vy = rocketModel.velocity.y;
        
        // On utilise la vitesse absolue pour l'affichage de la jauge
        // C'est plus représentatif de l'état réel de la fusée
        return Math.sqrt(vx * vx + vy * vy);
    }

    renderSpeed(ctx, speed, x, y) {
        // Texte de vitesse (toujours en blanc)
        ctx.fillStyle = this.colors.white;
        ctx.fillText(`Vitesse:`, x, y);
        
        // Barre de vitesse
        const barWidth = 100;
        const barHeight = 10;
        const barX = 100;
        const barYSpeed = y + 5;
        
        // Fond de la barre (gris clair)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barYSpeed, barWidth, barHeight);
        
        // Paramètres pour l'échelle exponentielle
        const maxDisplaySpeed = 80000.0;        // Réduit la vitesse maximale à afficher
        const threshold = 0.1;              // Seuil pour la vitesse "nulle"
        const exponent = 0.5;               // Exposant pour l'échelle (racine carrée)
        
        // Limiter la vitesse à la plage d'affichage
        const displaySpeed = Math.min(Math.abs(speed), maxDisplaySpeed);
        
        // Log de débogage
        //console.log(`Vitesse: ${speed.toFixed(2)}, Vitesse affichée: ${displaySpeed.toFixed(2)}`);
        
        // Si la vitesse est quasi-nulle, on garde la barre vide
        if (displaySpeed < threshold) {
            return;
        }
        
        // Calcul du ratio de vitesse avec échelle non linéaire (racine carrée)
        const speedRatio = Math.pow(displaySpeed, exponent) / Math.pow(maxDisplaySpeed, exponent);
        
        // Calcul de la largeur de la partie "pleine" de la barre
        const filledWidth = speedRatio * barWidth;
        
        // Détermination de la couleur basée sur la vitesse
        let barColor;
        const speedPercentage = (displaySpeed / maxDisplaySpeed) * 100;
        
        // Log de débogage
        //console.log(`Pourcentage de vitesse: ${speedPercentage.toFixed(2)}%`);
        
        if (speedPercentage < 20) {
            barColor = this.colors.green;    // Vert pour vitesses faibles
        } else if (speedPercentage < 50) {
            barColor = this.colors.orange;   // Orange pour vitesses moyennes
        } else {
            barColor = this.colors.red;      // Rouge pour vitesses élevées
        }
        
        // Dessiner la partie "pleine" de la barre
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barYSpeed, filledWidth, barHeight);
    }

    renderLandingGuidance(ctx, canvas, rocketModel, universeModel) {
        if (!rocketModel.isLanded) {
            const earth = universeModel.celestialBodies.find(body => body.name === 'Terre');
            if (earth) {
                const dx = rocketModel.position.x - earth.position.x;
                const dy = rocketModel.position.y - earth.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = rocketModel.radius + earth.radius + earth.atmosphere.height;
                
                if (distance < minDistance + 100) {
                    const surfaceAngle = Math.atan2(dy, dx);
                    const rocketOrientation = rocketModel.angle % (Math.PI * 2);
                    const isUpright = Math.abs(rocketOrientation - (surfaceAngle - Math.PI/2)) < Math.PI/4 || 
                                    Math.abs(rocketOrientation - (surfaceAngle - Math.PI/2) - Math.PI*2) < Math.PI/4;
                    
                    if (!rocketModel.isLanded && rocketModel.velocity.y > 0.1) {
                        ctx.textAlign = 'center';
                        if (!isUpright) {
                            ctx.fillStyle = this.colors.red;
                            ctx.fillText('Redressez la fusée!', canvas.width / 2, 110);
                        } else {
                            ctx.fillStyle = this.colors.green;
                            ctx.fillText('Orientation correcte', canvas.width / 2, 110);
                        }
                        
                        const speed = this.calculateSpeed(rocketModel);
                        if (Math.abs(speed) > 1.0) {
                            ctx.fillStyle = this.colors.red;
                            ctx.fillText('Ralentissez!', canvas.width / 2, 140);
                        }
                    }
                }
            }
        }
    }

    renderLandingSuccess(ctx, canvas) {
        ctx.font = '24px Arial';
        ctx.fillStyle = this.colors.success;
        ctx.textAlign = 'center';
        ctx.fillText('Vous êtes posé', canvas.width / 2, 30);
        ctx.font = this.font;
        ctx.fillText('Utilisez les propulseurs pour décoller', canvas.width / 2, 60);
    }

    render(ctx, canvas, rocketModel, universeModel, isPaused) {
        if (isPaused) {
            this.renderPause(ctx, canvas);
            return;
        }

        if (rocketModel) {
            this.renderRocketInfo(ctx, rocketModel);
            this.renderLandingGuidance(ctx, canvas, rocketModel, universeModel);
            
            if (rocketModel.isLanded) {
                this.renderLandingSuccess(ctx, canvas);
            }
        }
    }
} 