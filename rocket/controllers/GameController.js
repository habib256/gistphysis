class GameController {
    constructor() {
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
        
        // Contrôleurs
        this.inputController = null;
        this.physicsController = null;
        this.particleController = null;
        
        // État du jeu
        this.isRunning = false;
        this.isPaused = false;
        this.lastTimestamp = 0;
        this.elapsedTime = 0;
        
        // Canvas et contexte
        this.canvas = null;
        this.ctx = null;
    }
    
    // Initialiser le jeu
    init(canvas) {
        // Référence au canvas
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Configurer les modèles
        this.setupModels();
        
        // Configurer les vues
        this.setupViews();
        
        // Configurer les contrôleurs
        this.setupControllers();
        
        // Configurer les événements
        this.setupEventHandlers();
        
        // Mettre à jour les instructions
        this.renderInstructions();
        
        // Démarrer la boucle de jeu
        this.start();
    }
    
    // Configurer les modèles
    setupModels() {
        // Créer le modèle de la fusée
        this.rocketModel = new RocketModel();
        this.rocketModel.radius = ROCKET.WIDTH / 2; // Utiliser la constante du rayon de la fusée
        this.rocketModel.fuel = ROCKET.FUEL_MAX; // Initialiser le carburant avec la constante
        
        // Créer le modèle de l'univers
        this.universeModel = new UniverseModel();
        
        // Créer le modèle du système de particules
        this.particleSystemModel = new ParticleSystemModel();
        
        // Ajouter des corps célestes de test
        this.setupCelestialBodies();
        
        // Placer la fusée sur le sol de la Terre au démarrage
        const earth = this.universeModel.celestialBodies.find(body => body.name === 'Terre');
        if (earth) {
            // Calculer la position sur la surface de la Terre (au sommet)
            const surfaceX = earth.position.x;
            const surfaceY = earth.position.y - earth.radius - this.rocketModel.radius;
            
            // Positionner la fusée sur la surface
            this.rocketModel.setPosition(surfaceX, surfaceY);
            
            // Orienter la fusée perpendiculairement à la surface (vers le haut)
            this.rocketModel.angle = 0; // au lieu de -Math.PI/2
            
            // Définir la fusée comme étant posée
            this.rocketModel.isLanded = true;
            
            // Réinitialiser les vitesses
            this.rocketModel.velocity = { x: 0, y: 0 };
            this.rocketModel.angularVelocity = 0;
        } else {
            // Fallback si la Terre n'est pas trouvée
            this.rocketModel.setPosition(this.canvas.width / 2, this.canvas.height / 2 - 100);
        }
    }
    
    // Configurer les corps célestes initiaux
    setupCelestialBodies() {
        // Créer une planète Terre avec un rayon deux fois plus grand
        const earth = new CelestialBodyModel(
            'Terre', 
            CELESTIAL_BODY.MASS, // Utiliser la constante pour la masse
            CELESTIAL_BODY.RADIUS * 2, // Rayon doublé 
            { x: this.canvas.width / 2, y: this.canvas.height / 2 + CELESTIAL_BODY.ORBIT_DISTANCE }, 
            '#3399FF'
        );
        
        earth.atmosphere = {
            exists: true,
            height: CELESTIAL_BODY.RADIUS * 0.4, // 20% du rayon pour l'atmosphère (ajusté pour le rayon doublé)
            color: 'rgba(100, 150, 255, 0.2)'
        };
        
        // Ajouter au modèle de l'univers
        this.universeModel.addCelestialBody(earth);
    }
    
    // Configurer les vues
    setupViews() {
        // Créer la vue des corps célestes
        this.celestialBodyView = new CelestialBodyView();
        
        // Créer la vue de l'univers
        this.universeView = new UniverseView(this.celestialBodyView);
        this.universeView.setCanvasSize(this.canvas.width, this.canvas.height);
        
        // Centrer initialement la caméra sur le centre du canvas
        this.universeView.centerOn(this.canvas.width / 2, this.canvas.height / 2);
        this.universeView.setCameraZoom(RENDER.MIN_ZOOM + (RENDER.MAX_ZOOM - RENDER.MIN_ZOOM) / 2); // Zoom initial moyen
        
        // Créer la vue des particules
        this.particleView = new ParticleView();
        
        // Créer la vue de la trace
        this.traceView = new TraceView();
        
        // Créer la vue de la fusée
        this.rocketView = new RocketView(this.particleView);
        // Ajuster les dimensions selon les constantes
        this.rocketView.width = ROCKET.WIDTH * 2; // Double du rayon pour la largeur
        this.rocketView.height = ROCKET.HEIGHT * 1.6; // Hauteur proportionnelle
    }
    
    // Configurer les contrôleurs
    setupControllers() {
        // Créer le contrôleur d'entrée
        this.inputController = new InputController();
        
        // Créer le contrôleur de physique
        this.physicsController = new PhysicsController();
        
        // Initialiser la physique avec les modèles existants
        if (this.physicsController && this.rocketModel && this.universeModel) {
            this.physicsController.initPhysics(this.rocketModel, this.universeModel);
        }
        
        // Créer le contrôleur de particules
        this.particleController = new ParticleController(this.particleSystemModel);
        
        // Configurer les gestionnaires d'entrée
        this.setupInputHandlers();
    }
    
    // Configurer les gestionnaires d'entrée
    setupInputHandlers() {
        // Propulseur principal (avant)
        this.inputController.onKeyDown('thrustForward', () => {
            if (!this.rocketModel || this.isPaused) return;
            // Utiliser la puissance constante définie dans ROCKET.INITIAL_POWER
            this.rocketModel.setThrusterPower('main', ROCKET.INITIAL_POWER);
            this.particleSystemModel.setEmitterActive('main', true);
        });
        
        this.inputController.onKeyUp('thrustForward', () => {
            if (!this.rocketModel) return;
            this.rocketModel.setThrusterPower('main', 0);
            this.particleSystemModel.setEmitterActive('main', false);
        });
        
        // Propulseur arrière
        this.inputController.onKeyDown('thrustBackward', () => {
            if (!this.rocketModel || this.isPaused) return;
            this.rocketModel.setThrusterPower('rear', ROCKET.INITIAL_POWER);
            this.particleSystemModel.setEmitterActive('rear', true);
        });
        
        this.inputController.onKeyUp('thrustBackward', () => {
            if (!this.rocketModel) return;
            this.rocketModel.setThrusterPower('rear', 0);
            this.particleSystemModel.setEmitterActive('rear', false);
        });
        
        // Rotation gauche
        this.inputController.onKeyDown('rotateLeft', () => {
            if (!this.rocketModel || this.isPaused) return;
            this.rocketModel.setThrusterPower('right', ROCKET.INITIAL_POWER);
            this.particleSystemModel.setEmitterActive('right', true);
        });
        
        this.inputController.onKeyUp('rotateLeft', () => {
            if (!this.rocketModel) return;
            this.rocketModel.setThrusterPower('right', 0);
            this.particleSystemModel.setEmitterActive('right', false);
        });
        
        // Rotation droite
        this.inputController.onKeyDown('rotateRight', () => {
            if (!this.rocketModel || this.isPaused) return;
            this.rocketModel.setThrusterPower('left', ROCKET.INITIAL_POWER);
            this.particleSystemModel.setEmitterActive('left', true);
        });
        
        this.inputController.onKeyUp('rotateRight', () => {
            if (!this.rocketModel) return;
            this.rocketModel.setThrusterPower('left', 0);
            this.particleSystemModel.setEmitterActive('left', false);
        });
        
        // Actions de caméra
        this.inputController.onKeyPress('centerCamera', () => {
            if (!this.universeView || !this.rocketModel) return;
            this.universeView.centerOn(this.rocketModel.position.x, this.rocketModel.position.y);
        });
        
        this.inputController.onKeyDown('zoomIn', () => {
            if (!this.universeView) return;
            this.universeView.setCameraZoom(this.universeView.camera.zoom * (1 + RENDER.ZOOM_SPEED));
        });
        
        this.inputController.onKeyDown('zoomOut', () => {
            if (!this.universeView) return;
            this.universeView.setCameraZoom(this.universeView.camera.zoom / (1 + RENDER.ZOOM_SPEED));
        });
        
        // Actions système
        this.inputController.onKeyPress('pauseGame', () => {
            this.togglePause();
        });
        
        this.inputController.onKeyPress('resetRocket', () => {
            this.resetRocket();
        });
        
        // Toggle de la trace
        this.inputController.onKeyPress('toggleTrace', () => {
            if (this.traceView) {
                this.traceView.toggleVisibility();
                console.log(`Trace ${this.traceView.isVisible ? 'activée' : 'désactivée'}`);
            }
        });
        
        // Touche pour afficher/masquer les vecteurs de force
        window.addEventListener('keydown', (event) => {
            if (event.code === 'KeyV') {
                // Toggle l'affichage des vecteurs de force
                const isShowing = this.physicsController.toggleForceVectors();
                console.log(`Affichage des vecteurs de force: ${isShowing ? 'activé' : 'désactivé'}`);
            }
        });
    }
    
    // Configurer les écouteurs d'événements
    setupEventHandlers() {
        // Redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        // Variables pour le glisser-déposer (drag & drop)
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartRocketX = 0;
        let dragStartRocketY = 0;
        
        // Gestionnaire d'événement mousedown pour commencer le drag
        this.canvas.addEventListener('mousedown', (event) => {
            if (this.isPaused || !this.rocketModel || !this.physicsController || !this.physicsController.rocketBody) return;
            
            // Récupérer les coordonnées de la souris
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // Convertir les coordonnées de la souris en coordonnées du monde
            const worldX = (mouseX - this.universeView.camera.offsetX) / this.universeView.camera.zoom + this.universeView.camera.x;
            const worldY = (mouseY - this.universeView.camera.offsetY) / this.universeView.camera.zoom + this.universeView.camera.y;
            
            // Calculer la distance entre la souris et la fusée
            const dx = worldX - this.rocketModel.position.x;
            const dy = worldY - this.rocketModel.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Si le clic est suffisamment proche de la fusée (en tenant compte du rayon)
            if (distance <= this.rocketModel.radius * 2) {
                // Commencer le drag
                isDragging = true;
                dragStartX = worldX;
                dragStartY = worldY;
                dragStartRocketX = this.rocketModel.position.x;
                dragStartRocketY = this.rocketModel.position.y;
                
                // Mettre la fusée en mode statique temporairement pour le drag
                this.physicsController.Body.setStatic(this.physicsController.rocketBody, true);
                
                // Réinitialiser les vitesses pendant le drag
                this.rocketModel.velocity = { x: 0, y: 0 };
                this.rocketModel.angularVelocity = 0;
                
                // Empêcher les autres actions pendant le drag
                event.preventDefault();
            }
        });
        
        // Gestionnaire d'événement mousemove pour le déplacement
        this.canvas.addEventListener('mousemove', (event) => {
            if (!isDragging) return;
            
            // Récupérer les coordonnées de la souris
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // Convertir les coordonnées de la souris en coordonnées du monde
            const worldX = (mouseX - this.universeView.camera.offsetX) / this.universeView.camera.zoom + this.universeView.camera.x;
            const worldY = (mouseY - this.universeView.camera.offsetY) / this.universeView.camera.zoom + this.universeView.camera.y;
            
            // Calculer le déplacement
            const deltaX = worldX - dragStartX;
            const deltaY = worldY - dragStartY;
            
            // Mettre à jour la position de la fusée
            const newX = dragStartRocketX + deltaX;
            const newY = dragStartRocketY + deltaY;
            
            // Mettre à jour la position dans le modèle et le corps physique
            this.rocketModel.setPosition(newX, newY);
            this.physicsController.Body.setPosition(this.physicsController.rocketBody, { x: newX, y: newY });
            
            // La fusée n'est plus considérée comme "posée" si elle est déplacée
            this.rocketModel.isLanded = false;
            
            // Empêcher les autres actions pendant le drag
            event.preventDefault();
        });
        
        // Gestionnaire d'événement mouseup pour terminer le drag
        this.canvas.addEventListener('mouseup', () => {
            if (isDragging) {
                // Terminer le drag
                isDragging = false;
                
                // Remettre la fusée en mode dynamique
                this.physicsController.Body.setStatic(this.physicsController.rocketBody, false);
            }
        });
        
        // Gestionnaire pour s'assurer que le drag se termine si la souris quitte le canvas
        this.canvas.addEventListener('mouseleave', () => {
            if (isDragging) {
                // Terminer le drag
                isDragging = false;
                
                // Remettre la fusée en mode dynamique
                this.physicsController.Body.setStatic(this.physicsController.rocketBody, false);
            }
        });
        
        // Zoom avec la molette de souris, toujours centré sur la fusée
        this.canvas.addEventListener('wheel', (event) => {
            if (!this.universeView || !this.rocketModel || this.isPaused) return;
            
            // Déterminer la direction du zoom
            const zoomDirection = event.deltaY < 0 ? 1 : -1;
            
            // Ajuster le zoom
            let newZoom = this.universeView.camera.zoom * (1 + zoomDirection * RENDER.ZOOM_SPEED);
            
            // Limiter le zoom
            newZoom = Math.max(RENDER.MIN_ZOOM, Math.min(RENDER.MAX_ZOOM, newZoom));
            
            // Définir le nouveau zoom
            this.universeView.setCameraZoom(newZoom);
            
            // Empêcher le comportement par défaut (défilement de la page)
            event.preventDefault();
        });
        
        // Initialiser la taille du canvas
        this.resizeCanvas();
    }
    
    // Redimensionner le canvas
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Mettre à jour la taille dans les vues
        if (this.universeView) {
            this.universeView.setCanvasSize(this.canvas.width, this.canvas.height);
        }
    }
    
    // Démarrer la boucle de jeu
    start() {
        this.isRunning = true;
        this.lastTimestamp = performance.now();
        window.requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    // Mettre en pause / reprendre le jeu
    togglePause() {
        this.isPaused = !this.isPaused;
    }
    
    // Réinitialiser la fusée
    resetRocket() {
        if (!this.rocketModel) return;
        
        // Récupérer la Terre
        const earth = this.universeModel.celestialBodies.find(body => body.name === 'Terre');
        
        if (earth) {
            // Calculer la position sur la surface de la Terre (au sommet)
            const surfaceX = earth.position.x;
            const surfaceY = earth.position.y - earth.radius - this.rocketModel.radius;
            
            // Positionner la fusée sur la surface
            this.rocketModel.setPosition(surfaceX, surfaceY);
            
            // Orienter la fusée perpendiculairement à la surface (vers le haut)
            this.rocketModel.angle = 0; // au lieu de -Math.PI/2
        } else {
            // Fallback si la Terre n'est pas trouvée
            this.rocketModel.setPosition(this.canvas.width / 2, this.canvas.height / 2 - 100);
            this.rocketModel.angle = 0;
        }
        
        // Réinitialiser la vitesse
        this.rocketModel.velocity = { x: 0, y: 0 };
        this.rocketModel.angularVelocity = 0;
        
        // Définir la fusée comme étant posée
        this.rocketModel.isLanded = true;
        
        // Réinitialiser la trace
        if (this.traceView) {
            this.traceView.clear();
        }
        
        // Réinitialiser les thrusteurs
        this.rocketModel.thrusters = {
            main: { 
                power: 0, 
                maxPower: ROCKET.THRUSTER_POWER.MAIN,
                position: { 
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.MAIN.angle) * ROCKET.THRUSTER_POSITIONS.MAIN.distance, 
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.MAIN.angle) * ROCKET.THRUSTER_POSITIONS.MAIN.distance 
                } 
            },
            rear: { 
                power: 0, 
                maxPower: ROCKET.THRUSTER_POWER.REAR,
                position: { 
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.REAR.angle) * ROCKET.THRUSTER_POSITIONS.REAR.distance, 
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.REAR.angle) * ROCKET.THRUSTER_POSITIONS.REAR.distance 
                } 
            },
            left: { 
                power: 0, 
                maxPower: ROCKET.THRUSTER_POWER.LEFT,
                position: { 
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.LEFT.angle) * ROCKET.THRUSTER_POSITIONS.LEFT.distance, 
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.LEFT.angle) * ROCKET.THRUSTER_POSITIONS.LEFT.distance 
                } 
            },
            right: { 
                power: 0, 
                maxPower: ROCKET.THRUSTER_POWER.RIGHT,
                position: { 
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.RIGHT.angle) * ROCKET.THRUSTER_POSITIONS.RIGHT.distance, 
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.RIGHT.angle) * ROCKET.THRUSTER_POSITIONS.RIGHT.distance 
                } 
            }
        };
        
        // Réinitialiser la santé et le carburant
        this.rocketModel.health = ROCKET.MAX_HEALTH;
        this.rocketModel.fuel = ROCKET.FUEL_MAX;
        
        // Réinitialiser le système de particules
        if (this.particleSystemModel) {
            this.particleSystemModel.clearAllParticles();
        }
        
        // Réinitialiser le moteur physique
        if (this.physicsController) {
            this.physicsController.resetPhysics(this.rocketModel, this.universeModel);
        }
        
        // Centrer la caméra sur la fusée
        if (this.universeView) {
            this.universeView.centerOn(this.rocketModel.position.x, this.rocketModel.position.y);
            this.universeView.setCameraZoom(RENDER.MIN_ZOOM + (RENDER.MAX_ZOOM - RENDER.MIN_ZOOM) / 2); // Zoom moyen
        }
    }
    
    // Boucle principale du jeu
    gameLoop(timestamp) {
        // Calculer le delta time
        const deltaTime = (timestamp - this.lastTimestamp) / 1000; // en secondes
        this.lastTimestamp = timestamp;
        
        // Mettre à jour le temps écoulé
        this.elapsedTime += deltaTime;
        
        // Mettre à jour les entrées
        if (this.inputController) {
            this.inputController.update();
        }
        
        // Si le jeu n'est pas en pause, mettre à jour la physique
        if (!this.isPaused) {
            this.update(deltaTime);
        }
        
        // Dessiner le jeu
        this.render();
        
        // Continuer la boucle si le jeu est en cours
        if (this.isRunning) {
            window.requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    // Mettre à jour l'état du jeu
    update(deltaTime) {
        // Vérifier que tous les composants sont chargés
        if (!this.rocketModel || !this.universeModel || !this.physicsController) return;
        
        // Appliquer les forces de poussée des réacteurs actifs
        for (const thrusterName in this.rocketModel.thrusters) {
            const thruster = this.rocketModel.thrusters[thrusterName];
            if (thruster.power > 0) {
                this.physicsController.applyThrusterForce(
                    this.rocketModel, 
                    thrusterName, 
                    thruster.power // Utiliser directement le pourcentage de puissance (0-100)
                );
            }
        }
        
        // Mettre à jour la physique de la fusée
        this.physicsController.updateRocketPhysics(this.rocketModel, this.universeModel, deltaTime);
        
        // Mettre à jour la physique des corps célestes
        this.physicsController.updateCelestialBodiesPhysics(this.universeModel, deltaTime);
        
        // Mettre à jour la trace de la fusée
        if (this.traceView && this.rocketModel) {
            this.traceView.update(this.rocketModel.position);
        }
        
        // Centrer la caméra sur la fusée
        if (this.universeView && this.rocketModel) {
            this.universeView.centerOn(this.rocketModel.position.x, this.rocketModel.position.y);
            this.universeView.applyStarTwinkle(this.ctx, this.universeModel, this.elapsedTime);
        }
        
        // Mettre à jour les positions des émetteurs de particules
        if (this.particleController) {
            this.particleController.updateEmitterPositions(this.rocketModel);
            this.particleController.update(deltaTime);
        }
    }
    
    // Dessiner le jeu
    render() {
        // Effacer le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Obtenir la caméra pour le rendu
        const camera = this.universeView.camera;
        
        // Dessiner l'arrière-plan (étoiles, etc.)
        this.universeView.renderBackground(this.ctx, this.universeModel);
        
        // Dessiner les corps célestes
        this.universeView.renderCelestialBodies(this.ctx, this.universeModel.celestialBodies);
        
        // Dessiner la trace de la fusée
        if (this.traceView) {
            this.traceView.render(this.ctx, camera);
        }
        
        // Dessiner les particules
        this.particleView.renderParticles(this.ctx, this.particleSystemModel, camera);
        
        // Dessiner la fusée
        this.rocketView.render(this.ctx, this.rocketModel, camera);
        
        // Dessiner les vecteurs de force pour le débogage
        this.physicsController.drawForceVectors(this.ctx, camera);
        
        // Dessiner l'interface utilisateur (HUD)
        this.renderUI();
        
        // Dessiner les instructions
        this.renderInstructions();
    }
    
    // Dessiner l'interface utilisateur
    renderUI() {
        // Si le jeu est en pause, afficher un message
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = '48px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('PAUSE', this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // Afficher les informations sur la fusée
        if (this.rocketModel) {
            this.ctx.font = '16px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            
            this.ctx.fillText(`Santé: ${Math.floor(this.rocketModel.health)}%`, 20, 20);
            this.ctx.fillText(`Carburant: ${Math.floor(this.rocketModel.fuel)}`, 20, 50);
            
            // Calculer la vitesse actuelle
            const velocity = {
                x: this.rocketModel.velocity.x,
                y: this.rocketModel.velocity.y
            };
            
            // Calculer le vecteur de direction de la fusée (avant de la fusée)
            const rocketDirection = {
                x: Math.sin(this.rocketModel.angle),
                y: -Math.cos(this.rocketModel.angle)
            };
            
            // Normaliser le vecteur de direction
            const directionMagnitude = Math.sqrt(rocketDirection.x * rocketDirection.x + rocketDirection.y * rocketDirection.y);
            if (directionMagnitude > 0) {
                rocketDirection.x /= directionMagnitude;
                rocketDirection.y /= directionMagnitude;
            }
            
            // Calculer la vitesse comme produit scalaire (projection de la vitesse sur la direction)
            // Si positif, la fusée avance vers l'avant; si négatif, elle recule
            const speedValue = velocity.x * rocketDirection.x + velocity.y * rocketDirection.y;
            const speed = speedValue.toFixed(1);
            
            // Afficher la vitesse avec indication de couleur
            if (Math.abs(speed) > 1.0) {
                this.ctx.fillStyle = 'red';
            } else if (Math.abs(speed) > 0.5) {
                this.ctx.fillStyle = 'orange';
            } else {
                this.ctx.fillStyle = 'green';
            }
            this.ctx.fillText(`Vitesse: ${speed} m/s`, 20, 80);
            this.ctx.fillStyle = 'white'; // Réinitialiser la couleur du texte
            
            // Afficher un guide d'orientation pour l'atterrissage quand proche de la Terre
            if (!this.rocketModel.isLanded) {
                const earth = this.universeModel.celestialBodies.find(body => body.name === 'Terre');
                if (earth) {
                    const dx = this.rocketModel.position.x - earth.position.x;
                    const dy = this.rocketModel.position.y - earth.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = this.rocketModel.radius + earth.radius + earth.atmosphere.height;
                    
                    // Si la fusée est proche de l'atmosphère terrestre
                    if (distance < minDistance + 100) {
                        const surfaceAngle = Math.atan2(dy, dx);
                        const rocketOrientation = this.rocketModel.angle % (Math.PI * 2);
                        const isUpright = Math.abs(rocketOrientation - (surfaceAngle - Math.PI/2)) < Math.PI/4 || 
                                        Math.abs(rocketOrientation - (surfaceAngle - Math.PI/2) - Math.PI*2) < Math.PI/4;
                        
                        // N'afficher le guide d'orientation que si la fusée n'est pas posée et en mouvement
                        if (!this.rocketModel.isLanded && this.rocketModel.velocity.y > 0.1) {
                            this.ctx.textAlign = 'center';
                            if (!isUpright) {
                                this.ctx.fillStyle = 'red';
                                this.ctx.fillText('Redressez la fusée!', this.canvas.width / 2, 110);
                            } else {
                                this.ctx.fillStyle = 'green';
                                this.ctx.fillText('Orientation correcte', this.canvas.width / 2, 110);
                            }
                            
                            if (Math.abs(speed) > 1.0) {
                                this.ctx.fillStyle = 'red';
                                this.ctx.fillText('Ralentissez!', this.canvas.width / 2, 140);
                            }
                        }
                    }
                }
            }
            
            // Afficher un message si la fusée est posée
            if (this.rocketModel.isLanded) {
                this.ctx.font = '24px Arial';
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Atterrissage réussi!', this.canvas.width / 2, 30);
                this.ctx.font = '16px Arial';
                this.ctx.fillText('Utilisez les propulseurs pour décoller', this.canvas.width / 2, 60);
            }
        }
    }
    
    // Dessiner les instructions
    renderInstructions() {
        const instructionsDiv = document.getElementById('instructions');
        if (instructionsDiv) {
            instructionsDiv.innerHTML = `
                Utilisez les flèches du clavier pour contrôler la fusée<br>
                ↑ : Propulsion principale | ← → : Rotation<br>
                ↓ : Propulsion arrière | R : Réinitialiser<br>
                C : Centrer la caméra | +/- : Zoom | V : Afficher les forces
            `;
        }
    }
    
    // Activer/désactiver l'affichage du vecteur de gravité
    toggleGravityVector() {
        if (this.rocketView) {
            this.rocketView.showGravityVector = !this.rocketView.showGravityVector;
            console.log(`Vecteur de gravité ${this.rocketView.showGravityVector ? 'activé' : 'désactivé'}`);
        }
    }
    
    // Activer/désactiver l'affichage des vecteurs de poussée
    toggleThrustVector() {
        if (this.rocketView) {
            this.rocketView.showThrustVector = !this.rocketView.showThrustVector;
            console.log(`Vecteurs de poussée ${this.rocketView.showThrustVector ? 'activés' : 'désactivés'}`);
        }
    }
    
    // Gérer les entrées clavier
    handleKeyDown(event) {
        if (this.isPaused) return;
        
        // Contrôles d'application
        if (event.key === 'r' || event.key === 'R') {
            this.resetRocket();
            return;
        } else if (event.key === 'c' || event.key === 'C') {
            if (this.rocketModel && this.universeView) {
                this.universeView.centerOn(this.rocketModel.position.x, this.rocketModel.position.y);
            }
            return;
        } else if (event.key === 'Escape') {
            this.togglePause();
            return;
        } else if (event.key === 'g' || event.key === 'G') {
            // Activer/désactiver l'affichage du vecteur de gravité
            this.toggleGravityVector();
            return;
        } else if (event.key === 't' || event.key === 'T') {
            // Activer/désactiver l'affichage des vecteurs de poussée
            this.toggleThrustVector();
            return;
        }
        
        // Si la fusée est détruite, ne pas permettre les contrôles
        if (!this.rocketModel || this.rocketModel.isDestroyed) return;
    }
} 