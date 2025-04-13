class UIView {
    constructor(eventBus) {
        this.font = '16px Arial';
        this.colors = {
            white: 'white',
            red: 'red',
            orange: 'orange',
            green: 'green',
            success: 'rgba(0, 255, 0, 0.8)',
            danger: 'rgba(255, 0, 0, 0.8)',
            moon: 'rgba(200, 200, 200, 0.9)' // Couleur pour les infos de la lune
        };
        this.showMoonInfo = true; // Option pour afficher les informations de la lune
        this.assistedControlsActive = true; // Activés par défaut
        
        // Référence à l'élément d'affichage du cargo
        this.cargoDisplayElement = document.getElementById('cargo-display');
        
        // Gestionnaire d'événements
        this.eventBus = eventBus;
        
        // État du jeu
        this.isPaused = false;
        
        // Police et style
        this.fontFamily = RENDER.FONT_FAMILY;
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
        const barX = 50;
        
        // Texte de santé (toujours en blanc)
        ctx.fillText(`❤️:`, 20, 20);
        
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
        ctx.fillText(`🛢️:`, 20, 50);
        
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
        ctx.fillText(`🚀:`, x, y);
        
        // Barre de vitesse
        const barWidth = 100;
        const barHeight = 10;
        const barX = 50;
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
                        } else {
                            ctx.fillStyle = this.colors.green;
                            ctx.fillText('Orientation correcte', canvas.width / 2, 110);
                        }
                        
                        const speed = this.calculateSpeed(rocketModel);
                        if (Math.abs(speed) > 1.0) {
                            ctx.fillStyle = this.colors.red;
                        }
                    }
                }
            }
        }
    }

    renderLandingSuccess(ctx, canvas, rocketModel) {
        ctx.font = '24px Arial';
        ctx.fillStyle = this.colors.success;
        ctx.textAlign = 'center';
        
        // Adapter le message en fonction de l'astre où on a atterri
        const landedOn = rocketModel.landedOn || 'un corps céleste';
        ctx.fillText(`Vous êtes posé sur ${landedOn}`, canvas.width / 2, 30);
        
        ctx.font = this.font;
        ctx.fillText('Utilisez les propulseurs pour décoller', canvas.width / 2, 60);
    }

    renderCrashed(ctx, canvas, rocketModel) {
        ctx.font = '24px Arial';
        ctx.fillStyle = this.colors.danger;
        ctx.textAlign = 'center';
        const crashLocation = rocketModel && rocketModel.crashedOn ? ` sur ${rocketModel.crashedOn}` : '';
        ctx.fillText(`Vous êtes crashé${crashLocation}`, canvas.width / 2, 30);
        ctx.font = 'bold 28px Arial';
        ctx.fillText('THE END', canvas.width / 2, 70);
        // Ajouter le message de redémarrage
        ctx.font = '16px Arial';
        ctx.fillStyle = this.colors.danger; // Changer la couleur pour le message de redémarrage en rouge
        ctx.fillText('Appuyez sur R pour recommencer', canvas.width / 2, 100);
    }

    renderMoonInfo(ctx, canvas, rocketModel, universeModel) {
        if (!this.showMoonInfo) return;
        
        const earth = universeModel.celestialBodies.find(body => body.name === 'Terre');
        if (!earth || !earth.moon) return;
        
        const moon = earth.moon;
        
        // Calculer la distance entre la fusée et la lune
        const dx = rocketModel.position.x - moon.position.x;
        const dy = rocketModel.position.y - moon.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Afficher les informations de distance uniquement si la fusée est proche de la lune
        const proximityThreshold = moon.radius * 10;
        if (distance < proximityThreshold) {
            ctx.font = '14px Arial';
            ctx.fillStyle = this.colors.moon;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(`Distance de la Lune: ${Math.floor(distance)} m`, canvas.width - 20, 20);
            
            // Si très proche, afficher une alerte
            if (distance < moon.radius * 3) {
                ctx.font = '18px Arial';
                ctx.fillStyle = this.colors.orange;
                ctx.textAlign = 'center';
                ctx.fillText('Proximité lunaire!', canvas.width / 2, 40);
            }
        }
    }

    // Rendre le bouton des contrôles assistés
    renderAssistedControlsButton(ctx, canvas) {
        // Position et dimensions du bouton
        const buttonWidth = 180;
        const buttonHeight = 30;
        const buttonX = 10; // Nouvelle position: à gauche
        const buttonY = canvas.height - 40; // Position en bas de l'écran

        // Dessiner le fond du bouton
        ctx.fillStyle = this.assistedControlsActive ? 'rgba(0, 150, 0, 0.7)' : 'rgba(50, 50, 150, 0.7)';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // Dessiner le contour du bouton
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // Texte du bouton
        ctx.font = '14px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.assistedControlsActive ? "Contrôles assistés: ON" : "Contrôles assistés: OFF", 
            buttonX + buttonWidth / 2, 
            buttonY + buttonHeight / 2
        );
        
        // Retourner les coordonnées du bouton pour la détection de clic
        return {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }

    // Afficher les missions actives et le cargo dans un cadre
    renderMissionAndCargoBox(ctx, canvas, rocketModel, missions) {
        if (!missions && (!rocketModel || !rocketModel.cargo)) {
            return; // Ne rien faire si pas de missions et pas de cargo
        }

        // Dimensions et position (gardons les valeurs précédentes)
        const boxWidth = 120;
        const boxPadding = 8;
        const lineHeight = 16;
        const boxX = canvas.width - boxWidth - 15;
        const boxY = 15;

        // --- 1. Calcul du contenu et de la hauteur nécessaire --- 
        const contentLines = [];
        let calculatedHeight = boxPadding; // Commencer avec padding haut

        // Titre "Missions:"
        contentLines.push({ text: "Missions:", color: this.colors.white, bold: true, isTitle: true });
        calculatedHeight += lineHeight * 1.5; // Hauteur titre + espace après

        const activeMissions = missions.filter(m => m.status === 'pending');
        const missionToShow = activeMissions.length > 0 ? activeMissions[0] : null; // PRENDRE SEULEMENT LA PREMIÈRE

        if (missionToShow) {
            // Ligne 1: Origine -> Destination
            const locationText = `${missionToShow.from} -> ${missionToShow.to}`;
            contentLines.push({ text: locationText, color: this.colors.white, isLocationLine: true });
            calculatedHeight += lineHeight * 1.2; // Hauteur + espace après
            
            // Ligne 2: Détails du cargo sur UNE SEULE ligne
            const detailItems = missionToShow.requiredCargo.map(item => {
                const cargoIcon = item.type === 'Fuel' ? '🛢️' : (item.type === 'Wrench' ? '🔧' : item.type);
                return `${cargoIcon} x${item.quantity}`;
            });
            const detailText = `  ${detailItems.join('  ')}`; // Joindre les items avec des espaces
            contentLines.push({ text: detailText, color: this.colors.white });
            calculatedHeight += lineHeight;

        } else {
            contentLines.push({ text: "Aucune mission active", color: 'grey', italic: true });
            calculatedHeight += lineHeight;
        }
        
        calculatedHeight += lineHeight * 0.5; // Espace avant Cargo

        // Titre "Cargo:"
        contentLines.push({ text: "Cargo:", color: this.colors.white, bold: true, isTitle: true, isCargoTitle: true });
        calculatedHeight += lineHeight * 1.3; // Hauteur titre + espace après (augmenté)

        // Contenu Cargo
        let cargoList = [];
        try { 
            if (rocketModel && rocketModel.cargo && typeof rocketModel.cargo.getCargoList === 'function') {
                cargoList = rocketModel.cargo.getCargoList();
            }
        } catch (e) { console.warn("Impossible de récupérer la liste du cargo:", e); }

        if (cargoList.length > 0) {
            cargoList.forEach(item => {
                if (item.type === 'Fuel') {
                    const iconsPerLine = 5;
                    const totalIcons = item.quantity;
                    let linesNeeded = Math.ceil(totalIcons / iconsPerLine);
                    for(let i=0; i<linesNeeded; i++){
                         const iconsToShow = Math.min(iconsPerLine, totalIcons - (i * iconsPerLine));
                         const cargoText = '🛢️'.repeat(iconsToShow);
                         contentLines.push({ text: cargoText, color: this.colors.white, isIconLine: true });
                         calculatedHeight += lineHeight * 1.3; // Interligne augmentée
                    }
                } else {
                    const cargoText = ` - ${item.type}: ${item.quantity}`;
                    contentLines.push({ text: cargoText, color: this.colors.white });
                    calculatedHeight += lineHeight;
                }
            });
        } else {
            contentLines.push({ text: "Vide", color: 'grey', italic: true });
            calculatedHeight += lineHeight;
        }
        
        calculatedHeight += boxPadding; // Ajouter padding bas
        const finalBoxHeight = Math.max(calculatedHeight, 60); // Hauteur minimale

        // --- 2. Dessin du cadre principal --- 
        ctx.fillStyle = 'rgba(50, 50, 70, 0.7)'; 
        ctx.strokeStyle = this.colors.white; 
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, finalBoxHeight, 5);
        ctx.fill();
        ctx.stroke();

        // --- 3. Dessin du contenu (sans cadres de mission individuels) --- 
        let currentY = boxY + boxPadding;

        contentLines.forEach(line => {
             // Dessiner le texte
            ctx.fillStyle = line.color;
            const fontStyle = line.bold ? 'bold ' : (line.italic ? 'italic ' : '');
            ctx.font = fontStyle + '14px ' + this.fontFamily;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            ctx.fillText(line.text, boxX + boxPadding, currentY);
            
            // Calculer l'incrément Y pour la prochaine ligne
            let yIncrement = lineHeight;
            if(line.isTitle) yIncrement = lineHeight * (line.isCargoTitle ? 1.3 : 1.5);
            else if(line.isLocationLine) yIncrement = lineHeight * 1.2;
            else if(line.isIconLine) yIncrement = lineHeight * 1.3;
            
            currentY += yIncrement;
        });

        // Réinitialiser les styles globaux
        ctx.font = this.font; 
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = this.colors.white;
    }

    /**
     * Met à jour l'affichage des icônes de cargo.
     * @param {Array<{type: string, quantity: number}>} cargoList - La liste du cargo.
     */
    updateCargoDisplay(cargoList = []) {
        if (!this.cargoDisplayElement) return;

        // Vider l'affichage actuel
        this.cargoDisplayElement.innerHTML = '';

        // Boucler sur les items du cargo
        cargoList.forEach(item => {
            let icon = '';
            let title = item.type;
            if (item.type === 'Fuel') { 
                icon = '🛢️';
                title = 'Fuel';
            } else if (item.type === 'Wrench') { // AJOUTER LE CAS POUR WRENCH
                icon = '🔧';
                title = 'Clé à molette';
            }
            // Ajouter d'autres 'else if' pour d'autres types de cargo si nécessaire

            if (icon) { // Si une icône est définie pour ce type
                for (let i = 0; i < item.quantity; i++) {
                    const span = document.createElement('span');
                    span.textContent = icon;
                    span.title = title; // Info-bulle
                    this.cargoDisplayElement.appendChild(span);
                }
            } else {
                // Affichage texte pour les types inconnus (optionnel)
                 const span = document.createElement('span');
                 span.textContent = ` ${item.type}x${item.quantity} `;
                 span.title = title;
                 span.style.fontSize = '12px'; // Plus petit pour le texte
                 span.style.verticalAlign = 'middle';
                 this.cargoDisplayElement.appendChild(span);
            }
        });
        
        // Si le cargo est vide, afficher un message ? (Optionnel)
        if (this.cargoDisplayElement.innerHTML === '') {
            // this.cargoDisplayElement.textContent = 'Vide'; 
        }
    }

    render(ctx, canvas, rocketModel, universeModel, isPaused, activeMissions = [], cargoList = []) {
        if (isPaused) {
            this.renderPause(ctx, canvas);
        } else {
            // Afficher les infos de la fusée (santé, fuel numérique, vitesse)
            if (rocketModel) {
                this.renderRocketInfo(ctx, rocketModel);
                
                // Afficher l'état d'atterrissage ou de crash
                if (rocketModel.isLanded) {
                    this.renderLandingSuccess(ctx, canvas, rocketModel);
                } else if (rocketModel.isDestroyed) {
                    this.renderCrashed(ctx, canvas, rocketModel);
                } else {
                    // Optionnel: Afficher le guide d'atterrissage
                    // this.renderLandingGuidance(ctx, canvas, rocketModel, universeModel);
                }
            }
            
            // Afficher les infos de la lune
            if (universeModel) {
                this.renderMoonInfo(ctx, canvas, rocketModel, universeModel);
            }
            
            // Afficher le bouton des contrôles assistés
            this.renderAssistedControlsButton(ctx, canvas);

            // Afficher les missions et le cargo
            this.renderMissionAndCargoBox(ctx, canvas, rocketModel, activeMissions);
        }
        
    }
    
    // Basculer l'affichage des informations lunaires
    toggleMoonInfo() {
        this.showMoonInfo = !this.showMoonInfo;
        return this.showMoonInfo;
    }
    
    // Basculer les contrôles assistés
    toggleAssistedControls() {
        this.assistedControlsActive = !this.assistedControlsActive;
        return this.assistedControlsActive;
    }
    
    // Vérifier si un point est dans les limites du bouton des contrôles assistés
    isPointInAssistedControlsButton(x, y) {
        if (!this.assistedControlsButtonBounds) return false;
        
        const bounds = this.assistedControlsButtonBounds;
        return (
            x >= bounds.x && 
            x <= bounds.x + bounds.width && 
            y >= bounds.y && 
            y <= bounds.y + bounds.height
        );
    }
} 