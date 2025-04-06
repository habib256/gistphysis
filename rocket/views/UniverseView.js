class UniverseView {
    constructor(celestialBodyView) {
        this.celestialBodyView = celestialBodyView;
        this.traceView = new TraceView();
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.0,
            width: 0,
            height: 0,
            offsetX: 0,
            offsetY: 0
        };
    }
    
    // Initialise la taille du canvas
    setCanvasSize(width, height) {
        this.camera.width = width;
        this.camera.height = height;
        this.camera.offsetX = width / 2;
        this.camera.offsetY = height / 2;
    }
    
    // Définit la position de la caméra
    setCameraPosition(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }
    
    // Définit le zoom de la caméra
    setCameraZoom(zoom) {
        this.camera.zoom = Math.max(RENDER.MIN_ZOOM, Math.min(RENDER.MAX_ZOOM, zoom));
    }
    
    // Centre la caméra sur une position spécifique
    centerOn(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }
    
    // Convertit des coordonnées du monde en coordonnées écran
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.camera.x) * this.camera.zoom + this.camera.offsetX,
            y: (worldY - this.camera.y) * this.camera.zoom + this.camera.offsetY
        };
    }
    
    // Convertit des coordonnées écran en coordonnées du monde
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.camera.offsetX) / this.camera.zoom + this.camera.x,
            y: (screenY - this.camera.offsetY) / this.camera.zoom + this.camera.y
        };
    }
    
    // Vérifie si un objet est visible à l'écran
    isVisible(x, y, radius) {
        const screen = this.worldToScreen(x, y);
        const radiusOnScreen = radius * this.camera.zoom;
        const margin = radiusOnScreen * RENDER.MARGIN_FACTOR;
        
        return (
            screen.x + margin >= 0 &&
            screen.x - margin <= this.camera.width &&
            screen.y + margin >= 0 &&
            screen.y - margin <= this.camera.height
        );
    }
    
    // Méthode pour appliquer les transformations de caméra au contexte
    applyCameraTransform(ctx) {
        ctx.translate(this.camera.offsetX, this.camera.offsetY);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);
    }
    
    // Rendu complet de l'univers (obsolète, utilisez renderBackground et renderCelestialBodies à la place)
    render(ctx, universeModel) {
        // Appel aux nouvelles méthodes séparées
        this.renderBackground(ctx, universeModel);
        this.renderCelestialBodies(ctx, universeModel.celestialBodies);
    }
    
    // Rendu du fond spatial et des étoiles
    renderBackground(ctx, universeModel) {
        // Effacer le canvas et dessiner le fond
        ctx.fillStyle = RENDER.SPACE_COLOR; // Couleur de fond de l'espace
        ctx.fillRect(0, 0, this.camera.width, this.camera.height);
        
        // Dessiner les étoiles d'arrière-plan
        this.renderStars(ctx, universeModel);
    }
    
    // Rendu des étoiles
    renderStars(ctx, universeModel) {
        ctx.save();
        
        // Appliquer une transformation simplifiée pour les étoiles (effet parallaxe)
        const parallaxFactor = 0.1; // Facteur de parallaxe pour les étoiles
        ctx.translate(this.camera.offsetX, this.camera.offsetY);
        ctx.translate(-this.camera.x * this.camera.zoom * parallaxFactor, -this.camera.y * this.camera.zoom * parallaxFactor);
        
        // Dessiner chaque étoile
        for (const star of universeModel.stars) {
            // Vérifier si l'étoile est visible à l'écran (calcul simplifié pour les étoiles)
            const starX = star.x - this.camera.x * parallaxFactor;
            const starY = star.y - this.camera.y * parallaxFactor;
            
            if (starX < -star.size || starX > this.camera.width / parallaxFactor + star.size ||
                starY < -star.size || starY > this.camera.height / parallaxFactor + star.size) {
                continue;
            }
            
            // Dessiner l'étoile
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.globalAlpha = star.brightness;
            ctx.fill();
        }
        
        // Réinitialiser les transformations et l'opacité
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }
    
    // Rendu des corps célestes
    renderCelestialBodies(ctx, celestialBodies) {
        ctx.save();
        
        // Appliquer la transformation de caméra complète pour les corps célestes
        this.applyCameraTransform(ctx);
        
        // Dessiner la trace avant les corps célestes
        this.traceView.render(ctx);
        
        // Dessiner chaque corps céleste
        for (const body of celestialBodies) {
            // Utiliser la vue des corps célestes pour le rendu
            this.celestialBodyView.render(ctx, body);
        }
        
        ctx.restore();
    }
    
    // Effet de scintillement pour les étoiles
    applyStarTwinkle(ctx, universeModel, time) {
        const twinkleFactor = RENDER.STAR_TWINKLE_FACTOR;
        const twinkleSpeed = RENDER.ZOOM_SPEED * 0.02; // Vitesse de scintillement basée sur ZOOM_SPEED
        
        for (const star of universeModel.stars) {
            // Calculer un facteur de scintillement basé sur le temps et la position de l'étoile
            const twinkling = Math.sin(time * twinkleSpeed + star.x * 0.01 + star.y * 0.01);
            star.brightness = RENDER.STAR_BRIGHTNESS_BASE + twinkling * twinkleFactor + RENDER.STAR_BRIGHTNESS_RANGE;
        }
    }

    // Mettre à jour la trace avec la position de la fusée
    updateTrace(rocketPosition) {
        const screenPos = this.worldToScreen(rocketPosition.x, rocketPosition.y);
        this.traceView.update(screenPos);
    }

    // Effacer la trace
    clearTrace() {
        this.traceView.clear();
    }

    // Basculer la visibilité de la trace
    toggleTraceVisibility() {
        this.traceView.toggleVisibility();
    }
} 