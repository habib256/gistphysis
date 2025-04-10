class GameController {
    constructor(eventBus) {
        // EventBus
        this.eventBus = eventBus;
        
        // Modèles
        this.rocketModel = null;
        this.universeModel = null;
        this.particleSystemModel = null;
        
        // Vues
        this.rocketView = null;
        this.universeView = null;
        this.particleView = null;
        this.celestialBodyView = null;
        this.traceView = null;
        this.uiView = null;
        
        // Contrôleurs
        this.inputController = null;
        this.physicsController = null;
        this.particleController = null;
        this.renderingController = null;
        this.rocketAgent = null;
        
        // État du jeu
        this.isRunning = false;
        this.isPaused = false;
        this.lastTimestamp = 0;
        this.elapsedTime = 0;
        
        // Canvas et contexte
        this.canvas = null;
        this.ctx = null;
        
        // Variables pour le glisser-déposer
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragStartRocketX = 0;
        this.dragStartRocketY = 0;

        // Initialiser la caméra
        this.camera = new CameraModel();
        
        // Timer pour réinitialisation auto après crash
        this.crashResetTimer = null;
        
        // S'abonner aux événements
        this.subscribeToEvents();
    }
    
    // S'abonner aux événements de l'EventBus
    subscribeToEvents() {
        this.eventBus.subscribe('INPUT_KEYDOWN', (data) => this.handleKeyDown(data));
        this.eventBus.subscribe('INPUT_KEYUP', (data) => this.handleKeyUp(data));
        this.eventBus.subscribe('INPUT_KEYPRESS', (data) => this.handleKeyPress(data));
        this.eventBus.subscribe('INPUT_MOUSEDOWN', (data) => this.handleMouseDown(data));
        this.eventBus.subscribe('INPUT_MOUSEMOVE', (data) => this.handleMouseMove(data));
        this.eventBus.subscribe('INPUT_MOUSEUP', (data) => this.handleMouseUp(data));
        this.eventBus.subscribe('INPUT_WHEEL', (data) => this.handleWheel(data));
        
        // Événement pour les vecteurs (une seule méthode)
        this.eventBus.subscribe('toggleVectors', () => this.toggleVectors());
        
        // Événement pour les mises à jour d'état de la fusée
        this.eventBus.subscribe('ROCKET_STATE_UPDATED', (data) => this.handleRocketStateUpdated(data));
    }
    
    // Gérer les événements d'entrée
    handleKeyDown(data) {
        if (this.isPaused && data.action !== 'pauseGame') return;
        
        switch (data.action) {
            case 'thrustForward':
                if (!this.rocketModel) return;
                this.rocketModel.setThrusterPower('main', ROCKET.THRUSTER_POWER.MAIN);
                this.particleSystemModel.setEmitterActive('main', true);
                break;
            case 'thrustBackward':
                if (!this.rocketModel) return;
                this.rocketModel.setThrusterPower('rear', ROCKET.THRUSTER_POWER.REAR);
                this.particleSystemModel.setEmitterActive('rear', true);
                break;
            case 'rotateLeft':
                if (!this.rocketModel) return;
                this.rocketModel.setThrusterPower('left', ROCKET.THRUSTER_POWER.LEFT);
                this.particleSystemModel.setEmitterActive('left', true);
                break;
            case 'rotateRight':
                if (!this.rocketModel) return;
                this.rocketModel.setThrusterPower('right', ROCKET.THRUSTER_POWER.RIGHT);
                this.particleSystemModel.setEmitterActive('right', true);
                break;
            case 'zoomIn':
                this.camera.setZoom(this.camera.zoom * (1 + RENDER.ZOOM_SPEED));
                break;
            case 'zoomOut':
                this.camera.setZoom(this.camera.zoom / (1 + RENDER.ZOOM_SPEED));
                break;
        }
        
        // Émettre l'état mis à jour
        this.emitUpdatedStates();
    }
    
    handleKeyUp(data) {
        switch (data.action) {
            case 'thrustForward':
                if (!this.rocketModel) return;
                this.rocketModel.setThrusterPower('main', 0);
                this.particleSystemModel.setEmitterActive('main', false);
                
                // Forcer l'arrêt du son du propulseur principal
                if (this.physicsController && this.physicsController.mainThrusterSoundPlaying) {
                    if (this.physicsController.mainThrusterSound) {
                        this.physicsController.mainThrusterSound.pause();
                        this.physicsController.mainThrusterSound.currentTime = 0;
                        this.physicsController.mainThrusterSoundPlaying = false;
                    }
                }
                break;
            case 'thrustBackward':
                if (!this.rocketModel) return;
                this.rocketModel.setThrusterPower('rear', 0);
                this.particleSystemModel.setEmitterActive('rear', false);
                break;
            case 'rotateLeft':
                if (!this.rocketModel) return;
                this.rocketModel.setThrusterPower('left', 0);
                this.particleSystemModel.setEmitterActive('left', false);
                break;
            case 'rotateRight':
                if (!this.rocketModel) return;
                this.rocketModel.setThrusterPower('right', 0);
                this.particleSystemModel.setEmitterActive('right', false);
                break;
        }
        
        // Émettre l'état mis à jour
        this.emitUpdatedStates();
    }
    
    handleKeyPress(data) {
        if (this.isPaused && data.action !== 'pauseGame') return;
        
        switch (data.action) {
            case 'pauseGame':
                this.togglePause();
                break;
            case 'resetRocket':
                this.resetRocket();
                break;
            case 'centerCamera':
                if (this.camera && this.rocketModel) {
                    this.camera.setTarget(this.rocketModel, 'rocket');
                }
                break;
            case 'toggleForces':
                if (this.physicsController) {
                    const showForces = this.physicsController.toggleForceVectors();
                    console.log(`Affichage des forces: ${showForces ? 'activé' : 'désactivé'}`);
                }
                break;
            case 'toggleVectors':
                this.toggleVectors();
                break;
            case 'toggleTraces':
                this.toggleTraceVisibility();
                break;
            case 'increaseThrustMultiplier':
                this.adjustThrustMultiplier(2.0); // Doubler
                break;
            case 'decreaseThrustMultiplier':
                this.adjustThrustMultiplier(0.5); // Réduire de moitié
                break;
            case 'toggleAI':
                this.toggleAIControl();
                break;
        }
    }
    
    handleMouseDown(data) {
        if (this.isPaused) return;
        
        this.isDragging = true;
        this.dragStartX = data.x;
        this.dragStartY = data.y;
        
        if (this.camera) {
            this.dragStartCameraX = this.camera.x;
            this.dragStartCameraY = this.camera.y;
        }
    }
    
    handleMouseMove(data) {
        if (!this.isDragging || this.isPaused) return;
        
        const dx = (data.x - this.dragStartX) / this.camera.zoom;
        const dy = (data.y - this.dragStartY) / this.camera.zoom;
        
        if (this.camera) {
            this.camera.setPosition(
                this.dragStartCameraX - dx,
                this.dragStartCameraY - dy
            );
        }
    }
    
    handleMouseUp(data) {
        this.isDragging = false;
        
        // Vérifier si le clic est sur le bouton des contrôles assistés
        if (this.uiView && this.uiView.isPointInAssistedControlsButton(data.x, data.y)) {
            this.toggleAssistedControls();
        }
    }
    
    handleWheel(data) {
        if (this.isPaused) return;
        
        if (this.camera) {
            const zoomFactor = 1 + RENDER.ZOOM_SPEED;
            if (data.delta > 0) {
                // Zoom out (molette vers le bas)
                this.camera.setZoom(this.camera.zoom / zoomFactor);
            } else {
                // Zoom in (molette vers le haut)
                this.camera.setZoom(this.camera.zoom * zoomFactor);
            }
        }
    }
    
    // Émettre les états mis à jour pour les vues
    emitUpdatedStates() {
        if (this.rocketModel) {
            // Calculer les vecteurs de gravité et de poussée pour le rendu
            const gravityVector = this.calculateGravityVector();
            const thrustVectors = this.calculateThrustVectors();
            const totalThrustVector = this.calculateTotalThrustVector();
            
            // Calculer le vecteur d'attraction lunaire
            const lunarAttraction = this.calculateLunarAttractionVector();
            
            // Calculer la distance à la Terre et le vecteur d'attraction terrestre
            const earthDistance = this.calculateEarthDistance();
            const earthAttractionVector = this.calculateEarthAttractionVector();
            
            // Émettre l'état de la fusée mis à jour
            this.eventBus.emit('ROCKET_STATE_UPDATED', {
                position: { ...this.rocketModel.position },
                velocity: { ...this.rocketModel.velocity },
                angle: this.rocketModel.angle,
                fuel: this.rocketModel.fuel,
                health: this.rocketModel.health,
                isLanded: this.rocketModel.isLanded,
                isDestroyed: this.rocketModel.isDestroyed,
                landedOn: this.rocketModel.landedOn,
                attachedTo: this.rocketModel.attachedTo,
                relativePosition: this.rocketModel.relativePosition ? {...this.rocketModel.relativePosition} : null,
                thrusters: { ...this.rocketModel.thrusters },
                gravityVector,
                thrustVectors,
                totalThrustVector,
                lunarAttractionVector: lunarAttraction ? lunarAttraction.vector : null,
                lunarDistance: lunarAttraction ? lunarAttraction.distance : null,
                earthDistance: earthDistance,
                earthAttractionVector: earthAttractionVector
            });
        }
        
        if (this.universeModel) {
            // S'assurer que les corps célestes sont envoyés correctement
            this.eventBus.emit('UNIVERSE_STATE_UPDATED', {
                celestialBodies: this.universeModel.celestialBodies.map(body => ({
                    name: body.name,
                    mass: body.mass,
                    radius: body.radius,
                    position: { ...body.position },
                    velocity: { ...body.velocity },
                    color: body.color,
                    atmosphere: { ...body.atmosphere }
                })),
                stars: this.universeModel.stars
            });
        }
        
        if (this.particleSystemModel) {
            this.eventBus.emit('PARTICLE_SYSTEM_UPDATED', {
                emitters: this.particleSystemModel.emitters,
                debrisParticles: this.particleSystemModel.debrisParticles
            });
        }
    }
    
    // Calculer le vecteur de gravité pour le rendu
    calculateGravityVector() {
        if (!this.rocketModel || !this.universeModel) return null;
        
        let totalGravityX = 0;
        let totalGravityY = 0;
        
        for (const body of this.universeModel.celestialBodies) {
            const dx = body.position.x - this.rocketModel.position.x;
            const dy = body.position.y - this.rocketModel.position.y;
            const distanceSquared = dx * dx + dy * dy;
            const distance = Math.sqrt(distanceSquared);
            
            const forceMagnitude = PHYSICS.G * body.mass * this.rocketModel.mass / distanceSquared;
            
            const forceX = forceMagnitude * (dx / distance);
            const forceY = forceMagnitude * (dy / distance);
            
            totalGravityX += forceX / this.rocketModel.mass;
            totalGravityY += forceY / this.rocketModel.mass;
        }
        
        return { x: totalGravityX, y: totalGravityY };
    }
    
    // Calculer les vecteurs de poussée pour le rendu
    calculateThrustVectors() {
        if (!this.rocketModel) return null;
        
        const thrustVectors = {};
        
        for (const thrusterName in this.rocketModel.thrusters) {
            const thruster = this.rocketModel.thrusters[thrusterName];
            
            if (thruster.power > 0) {
                let thrustAngle = 0;
                let thrustMagnitude = 0;
                
                switch (thrusterName) {
                    case 'main':
                        thrustAngle = this.rocketModel.angle + Math.PI/2;
                        thrustMagnitude = PHYSICS.MAIN_THRUST * (thruster.power / thruster.maxPower);
                        break;
                    case 'rear':
                        thrustAngle = this.rocketModel.angle - Math.PI/2;
                        thrustMagnitude = PHYSICS.REAR_THRUST * (thruster.power / thruster.maxPower);
                        break;
                    case 'left':
                        thrustAngle = this.rocketModel.angle + 0;
                        thrustMagnitude = PHYSICS.LATERAL_THRUST * (thruster.power / thruster.maxPower);
                        break;
                    case 'right':
                        thrustAngle = this.rocketModel.angle + Math.PI;
                        thrustMagnitude = PHYSICS.LATERAL_THRUST * (thruster.power / thruster.maxPower);
                        break;
                }
                
                thrustVectors[thrusterName] = {
                    position: { 
                        x: thruster.position.x, 
                        y: thruster.position.y 
                    },
                    x: -Math.cos(thrustAngle),
                    y: -Math.sin(thrustAngle),
                    magnitude: thrustMagnitude
                };
            }
        }
        
        return thrustVectors;
    }
    
    // Calculer le vecteur de poussée totale
    calculateTotalThrustVector() {
        if (!this.rocketModel) return null;
        
        let totalX = 0;
        let totalY = 0;
        
        // Parcourir tous les propulseurs actifs
        for (const thrusterName in this.rocketModel.thrusters) {
            const thruster = this.rocketModel.thrusters[thrusterName];
            
            // Ne considérer que les propulseurs actifs
            if (thruster.power > 0) {
                // Récupérer la position du propulseur
                const position = ROCKET.THRUSTER_POSITIONS[thrusterName.toUpperCase()];
                if (!position) continue;
                
                // Calculer l'angle de poussée en fonction du type de propulseur
                let thrustAngle;
                
                if (thrusterName === 'left' || thrusterName === 'right') {
                    // Pour les propulseurs latéraux
                    const propAngle = Math.atan2(position.distance * Math.sin(position.angle), 
                                               position.distance * Math.cos(position.angle));
                    const perpDirection = thrusterName === 'left' ? Math.PI/2 : -Math.PI/2;
                    thrustAngle = this.rocketModel.angle + propAngle + perpDirection;
                } else {
                    // Pour les propulseurs principaux
                    switch (thrusterName) {
                        case 'main': 
                            thrustAngle = this.rocketModel.angle - Math.PI/2; // Vers le haut
                            break;
                        case 'rear':
                            thrustAngle = this.rocketModel.angle + Math.PI/2; // Vers le bas
                            break;
                        default:
                            thrustAngle = this.rocketModel.angle;
                    }
                }
                
                // Calculer la force en fonction de la puissance
                let thrustForce;
                switch (thrusterName) {
                    case 'main': 
                        thrustForce = ROCKET.MAIN_THRUST * (thruster.power / 100) * PHYSICS.THRUST_MULTIPLIER;
                        break;
                    case 'rear': 
                        thrustForce = ROCKET.REAR_THRUST * (thruster.power / 100) * PHYSICS.THRUST_MULTIPLIER;
                        break;
                    case 'left':
                    case 'right': 
                        thrustForce = ROCKET.LATERAL_THRUST * (thruster.power / 100) * PHYSICS.THRUST_MULTIPLIER;
                        break;
                    default:
                        thrustForce = 0;
                }
                
                // Ajouter la contribution de ce propulseur
                totalX += Math.cos(thrustAngle) * thrustForce;
                totalY += Math.sin(thrustAngle) * thrustForce;
            }
        }
        
        // Si aucune poussée, retourner null
        if (Math.abs(totalX) < 0.001 && Math.abs(totalY) < 0.001) {
            return null;
        }
        
        return { x: totalX, y: totalY };
    }
    
    // Initialiser le jeu
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Initialiser les modèles et vues
        this.setupModels();
        this.setupViews();
        
        // Configurer les contrôleurs
        this.setupControllers();
        
        // Configurer la caméra
        this.setupCamera();
        
        // Positionner la fusée à sa position initiale
        this.resetRocket();
        
        // Démarrer la boucle de jeu
        this.start();
    }
    
    // Définir les contrôleurs
    setControllers(controllers) {
        this.inputController = controllers.inputController;
        this.renderingController = controllers.renderingController;
        this.rocketAgent = controllers.rocketAgent;
    }
    
    // Configurer les modèles
    setupModels() {
        try {
            // Créer un modèle d'univers
            this.universeModel = new UniverseModel();
            
            // Ajouter la Terre
            const earth = new CelestialBodyModel(
                'Terre',
                CELESTIAL_BODY.MASS,
                CELESTIAL_BODY.RADIUS,
                { x: 0, y: 0 },
                '#1E88E5'
            );
            
            // L'atmosphère est déjà défini dans le constructeur de CelestialBodyModel
            // Pas besoin d'appeler setAtmosphere
            
            console.log("Ajout de la Terre à l'univers...");
            this.universeModel.addCelestialBody(earth);
            console.log("La Terre a-t-elle une lune?", earth.moon ? "OUI" : "NON");
            
            // Créer la fusée à une position initiale plus éloignée pour éviter les collisions
            this.rocketModel = new RocketModel();
            
            // Positionner la fusée à une distance sécuritaire par rapport à la Terre
            const safeDistanceFromEarth = CELESTIAL_BODY.RADIUS * 2.5; // Augmenter la distance par sécurité
            const initialAngle = -Math.PI / 4; // Légèrement vers le haut-gauche
            this.rocketModel.setPosition(
                Math.cos(initialAngle) * safeDistanceFromEarth,
                Math.sin(initialAngle) * safeDistanceFromEarth
            );
            
            // Initialiser la fusée avec une vitesse tangentielle pour l'orbite
            const initialSpeed = 2.0; // Vitesse tangentielle pour une orbite stable
            const tangentialAngle = initialAngle + Math.PI / 2; // Perpendiculaire à la direction radiale
            this.rocketModel.setVelocity(
                Math.cos(tangentialAngle) * initialSpeed,
                Math.sin(tangentialAngle) * initialSpeed
            );
            
            // Créer le système de particules
            this.particleSystemModel = new ParticleSystemModel();
            
            // Les émetteurs sont déjà créés dans le constructeur de ParticleSystemModel
            // Configurer la position et l'angle des émetteurs si nécessaire
            this.particleSystemModel.updateEmitterAngle('main', Math.PI/2);
            this.particleSystemModel.updateEmitterAngle('rear', -Math.PI/2);
            this.particleSystemModel.updateEmitterAngle('left', 0);
            this.particleSystemModel.updateEmitterAngle('right', Math.PI);
            
        } catch (error) {
            console.error("Erreur lors de l'initialisation des modèles:", error);
        }
    }
    
    // Configurer les vues
    setupViews() {
        // Créer les vues
        this.rocketView = new RocketView();
        this.universeView = new UniverseView(this.canvas);
        this.celestialBodyView = new CelestialBodyView();
        this.particleView = new ParticleView();
        this.traceView = new TraceView();
        this.uiView = new UIView();
        
        // Initialiser le contrôleur de rendu avec les vues
        if (this.renderingController) {
            this.renderingController.initViews(
                this.rocketView,
                this.universeView,
                this.celestialBodyView,
                this.particleView,
                this.traceView,
                this.uiView
            );
        }
    }
    
    // Configurer la caméra
    setupCamera() {
        this.camera.setTarget(this.rocketModel, 'rocket');
        this.camera.offsetX = this.canvas.width / 2;
        this.camera.offsetY = this.canvas.height / 2;
        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;
    }
    
    // Configurer les contrôleurs
    setupControllers() {
        this.physicsController = new PhysicsController({
            eventBus: this.eventBus,
            rocketModel: this.rocketModel,
            universeModel: this.universeModel
        });
        
        this.particleController = new ParticleController(this.particleSystemModel);
        
        // Initialiser les événements
        this.eventBus.emit('CONTROLLERS_SETUP', {});
    }
    
    // Démarrer la boucle de jeu
    start() {
        this.isRunning = true;
        this.lastTimestamp = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    // Mettre le jeu en pause
    togglePause() {
        this.isPaused = !this.isPaused;
    }
    
    // La boucle de jeu principale
    gameLoop(timestamp) {
        // Calculer le delta time
        const deltaTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1); // Limiter à 0.1s
        this.lastTimestamp = timestamp;
        
        this.elapsedTime += deltaTime;
        
        // Mettre à jour l'état de l'entrée
        if (this.inputController) {
            this.inputController.update();
        }
        
        if (!this.isPaused) {
            // Mise à jour de la physique
            if (this.physicsController) {
                this.physicsController.update(deltaTime);
            }
            
            // Mise à jour du système de particules
            if (this.particleController) {
                this.particleController.update(deltaTime);
                this.particleController.updateEmitterPositions(this.rocketModel);
            }
            
            // Mise à jour de la caméra
            if (this.camera) {
                this.camera.update(deltaTime);
            }
            
            // Mise à jour de la trace de la fusée
            if (this.renderingController) {
                this.renderingController.updateTrace();
            }
        }
        
        // Rendu
        if (this.renderingController) {
            this.renderingController.render(this.ctx, this.canvas, this.camera, this.isPaused);
        }
        
        // Émettre les états mis à jour
        this.emitUpdatedStates();
        
        // Planifier la prochaine frame
        if (this.isRunning) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    // Réinitialiser la fusée
    resetRocket() {
        if (!this.rocketModel || !this.universeModel) return;
        
        // Calculer la position initiale
        const earth = this.universeModel.celestialBodies.find(body => body.name === 'Terre');
        if (!earth) return;
        
        // Position sur Terre (sur sa surface)
        const rocketX = earth.position.x;
        const rocketY = earth.position.y - (earth.radius + ROCKET.HEIGHT / 2 + 5);
        
        // Réinitialiser la fusée
        this.rocketModel.setPosition(rocketX, rocketY);
        this.rocketModel.setVelocity(0, 0);
        this.rocketModel.setAngle(0);
        this.rocketModel.setAngularVelocity(0);
        this.rocketModel.health = ROCKET.MAX_HEALTH;
        this.rocketModel.fuel = ROCKET.FUEL_MAX;
        this.rocketModel.attachedTo = null;
        this.rocketModel.relativePosition = null;
        this.rocketModel.landedOn = 'Terre';
        
        // Réinitialiser les propulseurs
        for (const thrusterName in this.rocketModel.thrusters) {
            this.rocketModel.setThrusterPower(thrusterName, 0);
            this.particleSystemModel.setEmitterActive(thrusterName, false);
        }
        
        // Mettre à jour l'état physique
        if (this.physicsController && this.universeModel) {
            // Forcer une réinitialisation complète de la physique
            this.physicsController.resetPhysics(this.rocketModel, this.universeModel);
            setTimeout(() => {
                // S'assurer que la fusée est bien stable après la réinitialisation
                if (this.physicsController.rocketBody) {
                    this.physicsController.Body.setStatic(this.physicsController.rocketBody, true);
                    setTimeout(() => {
                        if (this.physicsController.rocketBody) {
                            this.physicsController.Body.setStatic(this.physicsController.rocketBody, false);
                        }
                    }, 100);
                }
            }, 50);
        }
        
        // Ajouter une discontinuité dans la trace plutôt que de l'effacer complètement
        if (this.traceView) {
            this.traceView.clear(false); // false = ajouter une discontinuité
        }
        
        // Réinitialiser les états
        this.rocketModel.isLanded = true; // Définir comme posée dès le départ
        this.rocketModel.isDestroyed = false;
        
        // Centrer la caméra sur la fusée
        if (this.camera) {
            this.camera.setTarget(this.rocketModel, 'rocket');
            this.camera.x = this.rocketModel.position.x;
            this.camera.y = this.rocketModel.position.y;
        }
        
        // Émettre l'état mis à jour
        this.emitUpdatedStates();
    }
    
    // Nettoyer les ressources
    cleanup() {
        this.isRunning = false;
        
        // Désabonner des événements
        if (this.eventBus) {
            // Les événements seront nettoyés par l'EventBus lui-même
        }
    }

    // Active ou désactive l'affichage des positions des propulseurs
    toggleThrusterPositions() {
        if (this.rocketView) {
            this.rocketView.setShowThrusterPositions(!this.rocketView.showThrusterPositions);
        }
    }

    // Ajuster le multiplicateur de poussée
    adjustThrustMultiplier(factor) {
        const currentMultiplier = PHYSICS.THRUST_MULTIPLIER;
        const newMultiplier = currentMultiplier * factor;
        
        // Limiter le multiplicateur à des valeurs raisonnables
        const minMultiplier = 0.1;
        const maxMultiplier = 1000;
        
        PHYSICS.THRUST_MULTIPLIER = Math.max(minMultiplier, Math.min(maxMultiplier, newMultiplier));
        
        console.log(`Multiplicateur de poussée: ${PHYSICS.THRUST_MULTIPLIER.toFixed(2)}x`);
        
        // Force une mise à jour de l'analyse des exigences de poussée
        if (this.physicsController) {
            this.physicsController._lastThrustCalculation = 0;
        }
    }

    // Activer/désactiver l'affichage de la trace
    toggleTraceVisibility() {
        if (this.traceView) {
            this.traceView.toggleVisibility();
            console.log(`Affichage de la trace: ${this.traceView.isVisible ? 'activé' : 'désactivé'}`);
        }
    }

    // Activer/désactiver tous les vecteurs (gravité, poussée et vitesse)
    toggleVectors() {
        if (this.rocketView) {
            // Définir une valeur commune pour tous les vecteurs
            const newValue = !(this.rocketView.showGravityVector || this.rocketView.showThrustVector || 
                              this.rocketView.showVelocityVector || this.rocketView.showLunarAttractionVector ||
                              this.rocketView.showEarthAttractionVector || this.rocketView.showTotalThrustVector);
            
            // Appliquer à tous les vecteurs
            this.rocketView.showGravityVector = newValue;
            this.rocketView.showThrustVector = newValue;
            this.rocketView.showVelocityVector = newValue;
            this.rocketView.showLunarAttractionVector = newValue;
            this.rocketView.showEarthAttractionVector = newValue;
            this.rocketView.showTotalThrustVector = newValue;
            
            console.log(`Affichage des vecteurs: ${newValue ? 'activé' : 'désactivé'}`);
        }
    }

    // Gérer les mises à jour d'état de la fusée
    handleRocketStateUpdated(data) {
        // Vérifier si la fusée vient d'être détruite
        if (data.isDestroyed && this.rocketModel && !this.crashResetTimer) {
            console.log("Fusée détruite - Appuyez sur R pour réinitialiser");
            
            // Ne pas programmer de réinitialisation automatique
            // pour permettre à l'utilisateur de voir la trace du crash
        }
    }

    // Mettre à jour la trace de la fusée
    updateTrace() {
        if (!this.rocketModel || !this.traceView) return;
        
        // Vérifier si la fusée est attachée à la lune (détruite ou simplement posée)
        const isAttachedToMoon = (this.rocketModel.isDestroyed && (this.rocketModel.attachedTo === 'Lune' || this.rocketModel.landedOn === 'Lune')) || 
                                  (this.rocketModel.landedOn === 'Lune');
        
        // Si la fusée est attachée à la lune, on a besoin de la position de la lune
        let moonPosition = null;
        if (isAttachedToMoon) {
            // Trouver la lune dans l'univers
            const moon = this.universeModel.celestialBodies.find(body => body.name === 'Lune');
            if (moon) {
                moonPosition = moon.position;
                
                // Mettre à jour les traces existantes pour qu'elles suivent la lune
                this.traceView.updateTracesForMoon(moonPosition);
            }
        }
        
        // Ajouter le point à la trace avec l'information d'attachement à la lune
        this.traceView.update(this.rocketModel.position, isAttachedToMoon, moonPosition);
    }

    // Basculer les contrôles assistés
    toggleAssistedControls() {
        if (this.physicsController && this.uiView) {
            // Basculer l'état des contrôles assistés dans le contrôleur physique
            const assistedEnabled = this.physicsController.toggleAssistedControls();
            
            // Synchroniser l'état avec la vue UI
            this.uiView.assistedControlsActive = assistedEnabled;
            
            console.log(`Contrôles assistés: ${assistedEnabled ? 'activés' : 'désactivés'}`);
        }
    }

    // Nettoyer toutes les traces
    clearAllTraces() {
        if (this.traceView) {
            this.traceView.clear(true); // true = effacer toutes les traces
        }
    }

    // Calculer le vecteur d'attraction vers la Lune
    calculateLunarAttractionVector() {
        if (!this.rocketModel || !this.universeModel) return null;
        
        // Trouver la Lune dans les corps célestes
        const moon = this.universeModel.celestialBodies.find(body => body.name === 'Lune');
        if (!moon) return null;
        
        // Calculer le vecteur d'attraction
        const dx = moon.position.x - this.rocketModel.position.x;
        const dy = moon.position.y - this.rocketModel.position.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);
        
        // Retourner le vecteur et la distance
        return { 
            vector: { x: dx / distance, y: dy / distance }, // Vecteur normalisé
            distance: distance // Distance à la Lune
        };
    }

    // Méthode pour activer/désactiver le contrôle par IA
    toggleAIControl() {
        if (!this.rocketAgent) return;
        
        // Émettre l'événement pour activer/désactiver l'agent
        this.eventBus.emit('TOGGLE_AI_CONTROL', {});
        console.log('Basculement du contrôle IA');
    }

    // Calculer la distance à la Terre
    calculateEarthDistance() {
        if (!this.rocketModel || !this.universeModel) return null;
        
        // Trouver la Terre dans les corps célestes
        const earth = this.universeModel.celestialBodies.find(body => body.name === 'Terre');
        if (!earth) return null;
        
        // Calculer la distance entre la fusée et la Terre
        const dx = earth.position.x - this.rocketModel.position.x;
        const dy = earth.position.y - this.rocketModel.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Soustraire le rayon de la Terre pour obtenir la distance à la surface
        const surfaceDistance = Math.max(0, distance - earth.radius);
        
        return surfaceDistance;
    }

    // Calculer le vecteur d'attraction vers la Terre
    calculateEarthAttractionVector() {
        if (!this.rocketModel || !this.universeModel) return null;
        
        // Trouver la Terre dans les corps célestes
        const earth = this.universeModel.celestialBodies.find(body => body.name === 'Terre');
        if (!earth) return null;
        
        // Calculer le vecteur d'attraction
        const dx = earth.position.x - this.rocketModel.position.x;
        const dy = earth.position.y - this.rocketModel.position.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);
        
        // Retourner le vecteur normalisé qui pointe vers la Terre
        return { x: dx / distance, y: dy / distance };
    }
} 