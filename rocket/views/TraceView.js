class TraceView {
    constructor() {
        this.traces = [];
        this.maxPoints = 10000; // Augmentation du nombre maximum de points dans la trace (de 500 à 2000)
        this.isVisible = true;
        
        // Pour suivre le mouvement avec la lune
        this.moonRelativeTraces = []; // Traces relatives à la lune
        this.attachedToMoon = false; // Si la trace est attachée à la lune
    }
    
    update(position, isAttachedToMoon = false, moonPosition = null) {
        if (!this.isVisible) return;
        
        // Si l'état d'attachement change
        if (this.attachedToMoon !== isAttachedToMoon) {
            // Ne pas réinitialiser les traces lorsqu'on se pose sur la Lune
            // Au lieu de cela, on va calculer les positions relatives pour les traces existantes
            if (isAttachedToMoon && moonPosition) {
                console.log("Attachement à la Lune - conservation des traces");
                
                // Calculer les positions relatives pour toutes les traces existantes
                this.moonRelativeTraces = [];
                for (const trace of this.traces) {
                    if (trace === null) {
                        // Conserver les discontinuités
                        this.moonRelativeTraces.push(null);
                    } else {
                        // Calculer et stocker la position relative à la lune
                        this.moonRelativeTraces.push({
                            x: trace.x - moonPosition.x,
                            y: trace.y - moonPosition.y
                        });
                    }
                }
            } else {
                // Si on se détache de la Lune, ne pas réinitialiser les traces
                // Ajouter uniquement une discontinuité pour marquer le changement
                console.log("Détachement de la Lune - conservation des traces avec discontinuité");
                this.traces.push(null);
                
                // Les coordonnées relatives ne sont plus nécessaires pour les nouveaux points
                // mais on conserve celles des points existants
            }
            
            this.attachedToMoon = isAttachedToMoon;
        }
        
        // Ajouter le point à la trace
        this.traces.push({ ...position });
        
        // Si attaché à la lune, calculer et stocker la position relative
        if (isAttachedToMoon && moonPosition) {
            // Calculer la position relative à la lune
            const relativePosition = {
                x: position.x - moonPosition.x,
                y: position.y - moonPosition.y
            };
            this.moonRelativeTraces.push(relativePosition);
            
            // S'assurer que les tableaux traces et moonRelativeTraces ont la même longueur
            if (this.traces.length !== this.moonRelativeTraces.length) {
                console.warn("Désynchronisation des traces relatives à la lune");
                
                // Tenter de corriger en ajustant la longueur des tableaux
                while (this.traces.length > this.moonRelativeTraces.length && this.traces.length > 0) {
                    this.traces.shift();
                }
            }
        }
        
        // Limiter le nombre de points
        if (this.traces.length > this.maxPoints) {
            this.traces.shift();
            if (this.moonRelativeTraces.length > 0) {
                this.moonRelativeTraces.shift();
            }
        }
    }
    
    render(ctx, camera) {
        if (!this.isVisible || this.traces.length < 2) return;
        
        ctx.save();
        
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        
        let isNewPath = true;
        
        // Tracer la ligne entre les points en gérant les discontinuités
        for (let i = 0; i < this.traces.length; i++) {
            const point = this.traces[i];
            
            // Si le point est null, c'est une discontinuité
            if (point === null) {
                // Terminer le chemin actuel
                if (!isNewPath) {
                    ctx.stroke();
                    isNewPath = true;
                }
                continue;
            }
            
            // Vérifier que le point a des coordonnées x et y valides
            if (point.x === undefined || point.y === undefined || 
                isNaN(point.x) || isNaN(point.y)) {
                console.warn("Point de trace invalide:", point);
                // Commencer un nouveau chemin au prochain point valide
                isNewPath = true;
                continue;
            }
            
            const screenPos = camera.worldToScreen(point.x, point.y);
            
            // S'assurer que les coordonnées d'écran sont des nombres valides
            if (isNaN(screenPos.x) || isNaN(screenPos.y)) {
                console.warn("Coordonnées d'écran invalides:", screenPos);
                isNewPath = true;
                continue;
            }
            
            if (isNewPath) {
                // Commencer un nouveau chemin
                ctx.beginPath();
                ctx.moveTo(screenPos.x, screenPos.y);
                isNewPath = false;
            } else {
                ctx.lineTo(screenPos.x, screenPos.y);
            }
        }
        
        // Terminer le dernier chemin
        if (!isNewPath) {
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // Mise à jour des positions des traces relatives à la lune
    updateTracesForMoon(moonPosition) {
        if (!this.attachedToMoon || this.moonRelativeTraces.length === 0) return;
        
        // Mettre à jour toutes les positions absolues des traces basées sur la position actuelle de la lune
        for (let i = 0; i < this.traces.length; i++) {
            // Ignorer les points null (discontinuités)
            if (this.traces[i] === null) continue;
            
            if (i < this.moonRelativeTraces.length) {
                const relativePos = this.moonRelativeTraces[i];
                
                // Ignorer les points relatifs null (discontinuités)
                if (relativePos === null) continue;
                
                // Mettre à jour la position absolue
                this.traces[i].x = moonPosition.x + relativePos.x;
                this.traces[i].y = moonPosition.y + relativePos.y;
            }
        }
    }
    
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        return this.isVisible;
    }
    
    clear(fullClear = false) {
        if (fullClear) {
            // Effacement complet de toutes les traces
            this.traces = [];
            this.moonRelativeTraces = [];
        } else {
            // Ajouter un point null pour créer une discontinuité dans la trace
            // Cela permet de voir les différentes trajectoires sans les relier
            this.traces.push(null);
            if (this.attachedToMoon) {
                this.moonRelativeTraces.push(null);
            }
        }
    }
} 