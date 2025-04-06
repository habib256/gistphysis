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
        
        // Afficher la santé avec code couleur
        const health = Math.floor(rocketModel.health);
        if (health < 30) {
            ctx.fillStyle = this.colors.red;
        } else if (health < 70) {
            ctx.fillStyle = this.colors.orange;
        } else {
            ctx.fillStyle = this.colors.green;
        }
        
        // Texte de santé (sans valeur numérique)
        ctx.fillText(`Santé:`, 20, 20);
        
        // Barre de santé
        const barYHealth = 25;
        
        // Fond de la barre
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barYHealth, barWidth, barHeight);
        
        // Barre de progression
        if (health < 30) {
            ctx.fillStyle = this.colors.red;
        } else if (health < 70) {
            ctx.fillStyle = this.colors.orange;
        } else {
            ctx.fillStyle = this.colors.green;
        }
        const healthWidth = (health / ROCKET.MAX_HEALTH) * barWidth;
        ctx.fillRect(barX, barYHealth, healthWidth, barHeight);
        
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
        
        // Le carburant est toujours affiché en vert puisqu'il commence plein à 5000
        ctx.fillStyle = 'green';
        
        const fuelWidth = (fuel / ROCKET.MAX_FUEL) * barWidth;
        ctx.fillRect(barX, barYFuel, fuelWidth, barHeight);
        
        ctx.fillStyle = this.colors.white;
        
        // Calculer et afficher la vitesse
        const speed = this.calculateSpeed(rocketModel);
        this.renderSpeed(ctx, speed, 20, 80);
    }

    calculateSpeed(rocketModel) {
        const velocity = {
            x: rocketModel.velocity.x,
            y: rocketModel.velocity.y
        };
        
        const rocketDirection = {
            x: Math.sin(rocketModel.angle),
            y: -Math.cos(rocketModel.angle)
        };
        
        const directionMagnitude = Math.sqrt(rocketDirection.x * rocketDirection.x + rocketDirection.y * rocketDirection.y);
        if (directionMagnitude > 0) {
            rocketDirection.x /= directionMagnitude;
            rocketDirection.y /= directionMagnitude;
        }
        
        return (velocity.x * rocketDirection.x + velocity.y * rocketDirection.y).toFixed(1);
    }

    renderSpeed(ctx, speed, x, y) {
        ctx.fillStyle = this.colors.white;
        ctx.fillText(`Vitesse:`, x, y);
        
        // Barre de vitesse
        const barWidth = 100;
        const barHeight = 10;
        const barX = 100;
        const barYSpeed = y + 5;
        
        // Fond de la barre
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barYSpeed, barWidth, barHeight);
        
        // Calculer la largeur relative de la barre de vitesse
        const maxDisplaySpeed = 2.0;
        const displaySpeed = Math.min(Math.abs(speed), maxDisplaySpeed);
        const speedWidth = (displaySpeed / maxDisplaySpeed) * barWidth;
        const speedPercentage = (displaySpeed / maxDisplaySpeed) * 100;
        
        // Déterminer la couleur basée sur le pourcentage de vitesse
        // Vert pour les 10 premiers %, orange entre 10% et 90%, rouge au-delà
        if (speedPercentage < 10) {
            ctx.fillStyle = 'green'; // Vert quand c'est lent (0-10%)
        } else if (speedPercentage < 90) {
            ctx.fillStyle = this.colors.orange; // Orange pour vitesse moyenne (10-90%)
        } else {
            ctx.fillStyle = 'red'; // Rouge quand c'est rapide (>90%)
        }
        
        // Dessiner la barre
        ctx.fillRect(barX, barYSpeed, speedWidth, barHeight);
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
        ctx.fillText('Atterrissage réussi!', canvas.width / 2, 30);
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