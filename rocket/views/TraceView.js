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
        
        // Si l'état d'attachement change, réinitialiser les traces
        if (this.attachedToMoon !== isAttachedToMoon) {
            this.traces = [];
            this.moonRelativeTraces = [];
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
            
            const screenPos = camera.worldToScreen(point.x, point.y);
            
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
            if (i < this.moonRelativeTraces.length) {
                const relativePos = this.moonRelativeTraces[i];
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