class RenderingController {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // Références aux vues
        this.rocketView = null;
        this.universeView = null;
        this.celestialBodyView = null;
        this.particleView = null;
        this.traceView = null;
        this.uiView = null;
        
        // Référence au contrôleur de physique pour afficher les forces
        this.physicsController = null;
        
        // États des modèles pour le rendu
        this.rocketState = {
            position: { x: 0, y: 0 },
            angle: 0,
            velocity: { x: 0, y: 0 },
            thrusters: {},
            fuel: 0,
            health: 0,
            isLanded: false,
            isDestroyed: false
        };
        
        this.universeState = {
            celestialBodies: [],
            stars: []
        };
        
        this.particleSystemState = {
            emitters: {},
            debrisParticles: []
        };
        
        // Abonner aux événements de mise à jour d'état
        this.subscribeToEvents();
    }
    
    subscribeToEvents() {
        this.eventBus.subscribe('ROCKET_STATE_UPDATED', (state) => {
            this.updateRocketState(state);
        });
        
        this.eventBus.subscribe('UNIVERSE_STATE_UPDATED', (state) => {
            this.updateUniverseState(state);
        });
        
        this.eventBus.subscribe('PARTICLE_SYSTEM_UPDATED', (state) => {
            this.updateParticleSystemState(state);
        });
    }
    
    // Initialiser les vues
    initViews(rocketView, universeView, celestialBodyView, particleView, traceView, uiView) {
        this.rocketView = rocketView;
        this.universeView = universeView;
        this.celestialBodyView = celestialBodyView;
        this.particleView = particleView;
        this.traceView = traceView;
        this.uiView = uiView;
        
        // Configurer les vues
        if (this.universeView && this.celestialBodyView) {
            this.universeView.setCelestialBodyView(this.celestialBodyView);
        }
        
        // Configurer la vue de trace
        if (this.universeView && this.traceView) {
            this.universeView.setTraceView(this.traceView);
        }
    }
    
    // Mettre à jour les états pour le rendu
    updateRocketState(state) {
        this.rocketState = {
            ...this.rocketState,
            ...state
        };
    }
    
    updateUniverseState(state) {
        this.universeState = {
            ...this.universeState,
            ...state
        };
    }
    
    updateParticleSystemState(state) {
        this.particleSystemState = {
            ...this.particleSystemState,
            ...state
        };
    }
    
    // Définir le contrôleur de physique
    setPhysicsController(physicsController) {
        this.physicsController = physicsController;
    }
    
    // Méthode principale de rendu
    render(ctx, canvas, camera, isPaused) {
        // Effacer le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Rendre le fond
        if (this.universeView) {
            this.universeView.renderBackground(ctx, camera);
        }
        
        // Rendre les étoiles
        if (this.universeView && this.universeState.stars) {
            this.universeView.renderStars(ctx, camera, this.universeState.stars);
        }
        
        // Rendre les corps célestes
        if (this.universeView && this.celestialBodyView && this.universeState.celestialBodies) {
            this.universeView.renderCelestialBodies(ctx, camera, this.universeState.celestialBodies);
        }
        
        // Rendre la trace de la fusée
        if (this.traceView) {
            this.traceView.render(ctx, camera);
        }
        
        // Rendre les particules
        if (this.particleView) {
            this.particleView.renderParticles(ctx, this.particleSystemState, camera);
        }
        
        // Rendre la fusée
        if (this.rocketView) {
            this.rocketView.render(ctx, this.rocketState, camera);
        }
        
        // Dessiner les vecteurs de force si activés
        if (this.physicsController) {
            this.physicsController.drawForceVectors(ctx, camera);
        }
        
        // Rendre l'interface utilisateur
        if (this.uiView) {
            this.uiView.render(ctx, canvas, this.rocketState, this.universeState, isPaused);
        }
    }
    
    // Mettre à jour la trace de la fusée
    updateTrace() {
        if (this.traceView && this.rocketState.position) {
            this.traceView.update(this.rocketState.position);
        }
    }
} 