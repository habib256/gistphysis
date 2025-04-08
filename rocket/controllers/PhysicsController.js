class PhysicsController {
    constructor(eventBus) {
        // Stocker le bus d'événements
        this.eventBus = eventBus;
        
        // Récupérer les modules Matter.js
        this.Engine = Matter.Engine;
        this.Render = Matter.Render;
        this.Runner = Matter.Runner;
        this.Bodies = Matter.Bodies;
        this.Body = Matter.Body;
        this.Composite = Matter.Composite;
        this.Vector = Matter.Vector;
        this.Events = Matter.Events;
        
        // Créer le moteur physique
        this.engine = this.Engine.create({
            enableSleeping: false,
            constraintIterations: 4,
            positionIterations: 6,
            velocityIterations: 4
        });
        
        // Désactiver la gravité par défaut
        this.engine.gravity.x = 0;
        this.engine.gravity.y = 0;
        this.engine.gravity.scale = 0; // Explicitement désactiver la gravité
        
        // Variables pour stocker les objets physiques
        this.rocketBody = null;
        this.celestialBodies = [];
        this.moonBodies = [];  // Pour stocker les références aux lunes
        this.rocketModel = null;
        
        // Conserver les paramètres supplémentaires
        this.timeScale = 1.0;
        this.gravitationalConstant = PHYSICS.G * 0.3; // Réduire l'intensité de l'attraction gravitationnelle
        this.collisionDamping = PHYSICS.COLLISION_DAMPING;
        
        // Contrôles assistés - utilise les constantes
        this.assistedControls = true; // Activés par défaut
        this.angularDamping = PHYSICS.ASSISTED_CONTROLS.NORMAL_ANGULAR_DAMPING;
        this.assistedAngularDamping = PHYSICS.ASSISTED_CONTROLS.ASSISTED_ANGULAR_DAMPING;
        this.rotationStabilityFactor = PHYSICS.ASSISTED_CONTROLS.ROTATION_STABILITY_FACTOR;
        
        // Visualisation des forces (pour le débogage)
        this.showForces = false;
        this.thrustForces = {
            main: { x: 0, y: 0 },
            rear: { x: 0, y: 0 },
            left: { x: 0, y: 0 },
            right: { x: 0, y: 0 }
        };
        this.gravityForce = { x: 0, y: 0 }; // Pour visualiser la force gravitationnelle
        
        // Cache pour les calculs de forces
        this.forceCache = new Map();
        this.cacheTimeout = 1000; // Durée de vie du cache en ms
        this.lastCacheClear = Date.now();
        
        // Délai d'initialisation avant activation des collisions
        this.initTime = Date.now();
        this.collisionsEnabled = false;
    }
    
    // Initialiser les objets physiques
    initPhysics(rocketModel, universeModel) {
       // console.log("Initialisation du moteur physique Matter.js avec Matter Attractors");
        
        // Vider le monde physique
        this.Composite.clear(this.engine.world);
        this.celestialBodies = [];
        this.moonBodies = [];  // Pour stocker les références aux lunes
        this.rocketModel = rocketModel;
        
        try {
            // Créer le corps de la fusée
            this.rocketBody = this.Bodies.rectangle(
                rocketModel.position.x,
                rocketModel.position.y,
                ROCKET.WIDTH,
                ROCKET.HEIGHT,
                {
                    mass: ROCKET.MASS,
                    inertia: ROCKET.MASS * 1.5,
                    friction: ROCKET.FRICTION,
                    restitution: PHYSICS.RESTITUTION,
                    angle: rocketModel.angle,
                    isStatic: false,
                    label: 'rocket',
                    frictionAir: 0.1, // Ajouter de la friction dans l'air pour ralentir naturellement
                    angularDamping: this.assistedControls ? this.assistedAngularDamping : this.angularDamping, // Amortissement angulaire selon le mode
                    sleepThreshold: -1, // Désactiver le repos pour le corps de la fusée
                    collisionFilter: {
                        category: 0x0001,
                        mask: 0xFFFFFFFF
                    },
                    // Configurer la fusée comme attracteur gravitationnel avec la fonction standard 1/r²
                    plugin: {
                        attractors: [
                            // Utiliser l'attracteur standard de Matter Attractors (relation en 1/r²)
                            MatterAttractors.Attractors.gravity
                        ]
                    }
                }
            );
            
            // Synchronisation initiale
            if (this.rocketBody) {
                this.Body.setVelocity(this.rocketBody, { 
                    x: rocketModel.velocity.x, 
                    y: rocketModel.velocity.y 
                });
                this.Body.setAngularVelocity(this.rocketBody, rocketModel.angularVelocity);
                this.Body.setAngle(this.rocketBody, rocketModel.angle);
            }
            
            // Ajouter la fusée au monde
            if (this.rocketBody) {
                this.Composite.add(this.engine.world, this.rocketBody);
               // console.log("Corps physique de la fusée créé et ajouté au monde");
            } else {
                console.error("Échec de la création du corps physique de la fusée");
            }
            
            // Créer les corps célestes
            for (const body of universeModel.celestialBodies) {
                // Options de base pour le corps céleste
                const options = {
                    mass: body.mass,
                    isStatic: true, // Tous les corps célestes sont statiques pour éviter les problèmes
                    label: body.name,
                    collisionFilter: {
                        category: 0x0002,
                        mask: 0x0001
                    },
                    restitution: PHYSICS.RESTITUTION,
                    friction: 0.05
                };
                
                // Ajouter les propriétés d'attracteur spécifiquement pour la Terre et la Lune
                if (body.name === 'Terre' || body.name === 'Lune') {
                    // Configurer l'attracteur standard de Matter Attractors
                    options.plugin = {
                        attractors: [
                            // Utiliser l'attracteur standard de Matter Attractors (relation en 1/r²)
                            MatterAttractors.Attractors.gravity
                        ]
                    };
                    
                    if (body.name === 'Lune') {
                        console.log("Lune configurée comme attracteur gravitationnel");
                    }
                }
                
                // Créer le corps céleste
                const celestialBody = this.Bodies.circle(
                    body.position.x,
                    body.position.y,
                    body.radius,
                    options
                );
                
                // Ajouter au monde et à notre liste
                if (celestialBody) {
                    this.Composite.add(this.engine.world, celestialBody);
                    
                    if (body.name === 'Lune') {
                        // La lune est gérée différemment mais a un corps physique pour les collisions
                        this.moonBodies.push({
                            body: celestialBody,
                            model: body
                        });
                        console.log("Corps physique de la Lune créé et ajouté au monde pour collisions");
                    } else {
                        this.celestialBodies.push({
                            body: celestialBody,
                            model: body
                        });
                    }
                }
            }
            
            // Configuration pour visualiser la force gravitationnelle
            Matter.Events.on(this.engine, 'beforeUpdate', () => {
                // Réinitialiser la force gravitationnelle
                this.gravityForce = { x: 0, y: 0 };
                
                // Si la fusée est présente, calculer la force gravitationnelle totale pour la visualisation
                if (this.rocketBody) {
                    // Force de la Terre
                    for (let i = 0; i < this.celestialBodies.length; i++) {
                        const celestialBody = this.celestialBodies[i].body;
                        if (celestialBody.label === 'Terre') {
                            // Calculer le vecteur pour la visualisation
                            const dx = celestialBody.position.x - this.rocketBody.position.x;
                            const dy = celestialBody.position.y - this.rocketBody.position.y;
                            const distanceSq = dx * dx + dy * dy;
                            const distance = Math.sqrt(distanceSq);
                            
                            // Utiliser une relation inverse quadratique (1/r²) pour la visualisation
                            const forceMagnitude = this.gravitationalConstant * celestialBody.mass * this.rocketBody.mass / distanceSq;
                            
                            this.gravityForce.x = forceMagnitude * (dx / distance);
                            this.gravityForce.y = forceMagnitude * (dy / distance);
                        }
                    }
                    
                    // Ajouter la force de la Lune
                    for (let i = 0; i < this.moonBodies.length; i++) {
                        const moonBody = this.moonBodies[i].body;
                        // Calculer le vecteur pour la visualisation
                        const dx = moonBody.position.x - this.rocketBody.position.x;
                        const dy = moonBody.position.y - this.rocketBody.position.y;
                        const distanceSq = dx * dx + dy * dy;
                        const distance = Math.sqrt(distanceSq);
                        
                        // Force plus faible pour la Lune (masse plus petite)
                        const forceMagnitude = this.gravitationalConstant * moonBody.mass * this.rocketBody.mass / distanceSq;
                        
                        // Ajouter à la force totale
                        this.gravityForce.x += forceMagnitude * (dx / distance);
                        this.gravityForce.y += forceMagnitude * (dy / distance);
                    }
                }
                
                // Mettre à jour la position de la lune dans le modèle 
                this.updateMoons(0.016);
            });
            
            // Configurer les événements de collision avec Matter.js
            this.setupCollisionEvents();
            
        } catch (error) {
            console.error("Erreur lors de l'initialisation de la physique:", error);
        }
    }
    
    // Configurer les événements de collision
    setupCollisionEvents() {
        // Événement déclenché au début d'une collision
        this.Events.on(this.engine, 'collisionStart', (event) => {
            // Vérifier si les collisions sont actives
            if (!this.collisionsEnabled) {
                // Vérifier si le délai d'initialisation est écoulé
                if (Date.now() - this.initTime < PHYSICS.COLLISION_DELAY) {
                    return; // Ignorer les collisions pendant le délai d'initialisation
                } else {
                    this.collisionsEnabled = true;
                    console.log("Collisions activées après le délai d'initialisation");
                }
            }
            
            const pairs = event.pairs;
            
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                
                // Vérifier si la fusée est impliquée dans la collision
                if (!pair.bodyA || !pair.bodyB) continue; // Ignorer si un des corps n'existe pas
                
                if (pair.bodyA === this.rocketBody || pair.bodyB === this.rocketBody) {
                    const rocketBody = pair.bodyA === this.rocketBody ? pair.bodyA : pair.bodyB;
                    const otherBody = pair.bodyA === this.rocketBody ? pair.bodyB : pair.bodyA;
                    
                    if (!rocketBody || !otherBody) continue; // Vérification supplémentaire
                    
                    // Calculer la vitesse d'impact
                    const relVelX = rocketBody.velocity.x - (otherBody.isStatic ? 0 : otherBody.velocity.x);
                    const relVelY = rocketBody.velocity.y - (otherBody.isStatic ? 0 : otherBody.velocity.y);
                    
                    // Calculer la vitesse d'impact à partir du vecteur de vélocité relative et de la normale
                    const impactVelocity = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
                    
                    // Définir le seuil pour une collision importante
                    const COLLISION_THRESHOLD = 2.5; // m/s
                    
                    // Détecter un atterrissage en douceur (vitesse faible)
                    if (impactVelocity < 1.0 && (otherBody.label === 'Terre' || otherBody.label === 'Lune')) {
                        this.rocketModel.isLanded = true;
                        this.rocketModel.landedOn = otherBody.label; // Indiquer la planète ou la lune sur laquelle on a atterri
                        
                        // Synchroniser immédiatement la vitesse
                        this.rocketModel.setVelocity(0, 0);
                        this.rocketModel.setAngularVelocity(0);
                        this.syncPhysicsWithModel(this.rocketModel);
                        
                        console.log(`Atterrissage réussi sur ${otherBody.label}`);
                    } else {
                        // Collision normale, appliquer des dégâts en fonction de la vitesse d'impact
                        const impactDamage = impactVelocity * PHYSICS.IMPACT_DAMAGE_FACTOR;
                        
                        // Si c'est une collision avec un corps céleste et que la vitesse d'impact dépasse le seuil
                        if ((otherBody.label === 'Terre' || otherBody.label === 'Lune') && impactVelocity > COLLISION_THRESHOLD) {
                            // Mémoriser d'abord sur quel corps la collision a eu lieu
                            this.rocketModel.landedOn = otherBody.label;
                            
                            // Appliquer les dégâts immédiatement
                            this.rocketModel.applyDamage(impactDamage);
                            
                            // Si la fusée est détruite par cette collision et qu'elle est sur la Lune
                            if (this.rocketModel.isDestroyed && this.rocketModel.attachedTo === 'Lune') {
                                // Trouver le modèle de la lune pour calculer la position relative
                                const luneModel = this.moonBodies.find(moon => moon.model.name === 'Lune')?.model;
                                if (luneModel) {
                                    // Calculer et stocker la position relative
                                    this.rocketModel.updateRelativePosition(luneModel);
                                    console.log("Position relative à la lune calculée pour les débris");
                                }
                            }
                            
                            // Jouer le son de collision importante
                            this.playCollisionSound(impactVelocity);
                            
                            console.log(`Collision IMPORTANTE avec ${otherBody.label}: Vitesse d'impact=${impactVelocity.toFixed(2)}, Dégâts=${impactDamage.toFixed(2)}`);
                        } else if (otherBody.label === 'Terre' || otherBody.label === 'Lune') {
                            console.log(`Collision avec ${otherBody.label}: Vitesse d'impact=${impactVelocity.toFixed(2)}, Pas de dégâts`);
                        }
                    }
                }
            }
        });
        
        // Événement pour les collisions actives (contact continu)
        this.Events.on(this.engine, 'collisionActive', (event) => {
            const pairs = event.pairs;
            
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                
                // Vérifier si les corps existent
                if (!pair.bodyA || !pair.bodyB) continue;
                
                // Si la fusée est impliquée dans la collision
                if (pair.bodyA === this.rocketBody || pair.bodyB === this.rocketBody) {
                    const otherBody = pair.bodyA === this.rocketBody ? pair.bodyB : pair.bodyA;
                    
                    // Si c'est une collision avec un corps céleste, considérer l'atterrissage
                    if (otherBody.label === 'Terre' || otherBody.label === 'Lune') {
                        // Vérifier la distance au sol
                        const distanceToGround = Math.abs(this.rocketBody.position.y - otherBody.position.y) - otherBody.radius;
                        const isCloseToGround = distanceToGround < ROCKET.HEIGHT * 1.5;
                        
                        // Définir isLanded si pas déjà défini et si on est proche du sol
                        if (!this.rocketModel.isLanded && isCloseToGround) {
                            this.rocketModel.isLanded = true;
                            this.rocketModel.landedOn = otherBody.label;
                            console.log(`Fusée posée sur ${otherBody.label}`);
                            
                            // Réinitialiser la vitesse dans le modèle
                            this.rocketModel.setVelocity(0, 0);
                            this.rocketModel.setAngularVelocity(0);
                            
                            // Réinitialiser la vitesse dans le corps physique
                            this.Body.setVelocity(this.rocketBody, { x: 0, y: 0 });
                            this.Body.setAngularVelocity(this.rocketBody, 0);
                        }
                        
                        // Stabiliser la fusée: fixer l'angle à 0 (verticale) si proche de 0
                        if (Math.abs(this.rocketModel.angle) < 0.3) {  // Environ 17 degrés
                            this.Body.setAngle(this.rocketBody, 0);
                            this.Body.setAngularVelocity(this.rocketBody, 0);
                        }
                        
                        // Vérifier si un propulseur est actif avec suffisamment de puissance
                        const mainThrusterActive = this.rocketModel.thrusters.main.power > 50; // Seuil de puissance minimum
                        
                        // Ne pas amortir les mouvements si la fusée essaie de décoller
                        if (!mainThrusterActive) {
                            // Forcer la vitesse à zéro
                            this.Body.setVelocity(this.rocketBody, { x: 0, y: 0 });
                            this.Body.setAngularVelocity(this.rocketBody, 0);
                        } else {
                            // Si le propulseur principal est actif avec suffisamment de puissance, forcer le décollage
                            this.rocketModel.isLanded = false;
                            this.rocketModel.landedOn = null;
                            
                            // Appliquer une forte impulsion vers le haut pour garantir le décollage
                            const impulseY = -5.0; // Force augmentée
                            this.Body.applyForce(
                                this.rocketBody,
                                this.rocketBody.position,
                                { x: 0, y: impulseY }
                            );
                            
                            // Ajouter une vitesse initiale vers le haut
                            this.Body.setVelocity(this.rocketBody, { x: 0, y: -2.0 });
                            
                            // Désactiver temporairement les contraintes physiques
                            this.Body.setStatic(this.rocketBody, false);
                            
                            console.log(`Décollage de ${otherBody.label} avec le propulseur principal`);
                        }
                    }
                }
            }
        });
        
        // Événement de fin de collision
        this.Events.on(this.engine, 'collisionEnd', (event) => {
            const pairs = event.pairs;
            
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                
                // Vérifier si les corps existent
                if (!pair.bodyA || !pair.bodyB) continue;
                
                // Si la fusée quitte le contact avec un corps
                if (pair.bodyA === this.rocketBody || pair.bodyB === this.rocketBody) {
                    const otherBody = pair.bodyA === this.rocketBody ? pair.bodyB : pair.bodyA;
                    
                    if ((otherBody.label === 'Terre' || otherBody.label === 'Lune') && this.rocketModel.isLanded) {
                        // Vérifier la distance au sol avant de confirmer le décollage
                        const distanceToGround = Math.abs(this.rocketBody.position.y - otherBody.position.y) - otherBody.radius;
                        if (distanceToGround > ROCKET.HEIGHT * 2) {
                            // Transition de posé à vol
                            this.rocketModel.isLanded = false;
                            this.rocketModel.landedOn = null;
                            console.log(`Décollage de ${otherBody.label} confirmé`);
                        }
                    }
                }
            }
        });
    }
    
    // Jouer le son de collision en fonction de la vitesse d'impact
    playCollisionSound(impactVelocity) {
        try {
            // Créer un élément audio pour jouer le son de collision
            const collisionSound = new Audio('assets/sound/collision.mp3');
            
            // Ajuster le volume en fonction de la vitesse d'impact
            // Plus la collision est violente, plus le son est fort
            const maxVolume = 1.0;
            const minVolume = 0.3;
            const volumeScale = Math.min((impactVelocity - 2.5) / 10, 1); // Normaliser entre 0 et 1
            collisionSound.volume = minVolume + volumeScale * (maxVolume - minVolume);
            
            // Jouer le son sans attendre la promesse
            collisionSound.play().catch(error => {
                console.error("Erreur lors de la lecture du son de collision:", error);
            });
        } catch (error) {
            console.error("Erreur lors de la lecture du fichier collision.mp3:", error);
        }
    }
    
    // Mettre à jour la physique de la fusée
    updateRocketPhysics(rocketModel, universeModel, deltaTime) {
        // Si la fusée n'est pas initialisée, la créer
        if (!this.rocketBody) {
            this.initPhysics(rocketModel, universeModel);
            // Appliquer l'amortissement angulaire initial
            const damping = this.assistedControls ? this.assistedAngularDamping : this.angularDamping;
            this.rocketBody.angularDamping = damping;
        }
        
        // Appliquer la stabilisation de rotation lorsque les contrôles assistés sont activés
        if (this.assistedControls && this.rocketBody && !rocketModel.isLanded) {
            // Vérifier si aucun propulseur de rotation n'est actif
            const leftActive = rocketModel.thrusters.left.power > 0;
            const rightActive = rocketModel.thrusters.right.power > 0;
            
            // Si aucun propulseur de rotation n'est actif, stabiliser lentement la rotation
            if (!leftActive && !rightActive && Math.abs(this.rocketBody.angularVelocity) > 0.001) {
                // Appliquer une force opposée à la rotation actuelle pour la ralentir plus rapidement
                const stabilizationForce = -this.rocketBody.angularVelocity * this.rotationStabilityFactor;
                this.Body.setAngularVelocity(this.rocketBody, 
                    this.rocketBody.angularVelocity + stabilizationForce);
            }
        }
        
        // Calculer et afficher les exigences de poussée pour le décollage
        this.calculateThrustRequirements(rocketModel, universeModel);
        
        // Si la fusée est déjà posée, vérifier si l'utilisateur essaie de décoller
        if (rocketModel.isLanded) {
            // Si la fusée est posée sur la Lune, mettre à jour sa position pour suivre le mouvement de la Lune
            if (rocketModel.landedOn === 'Lune' && !rocketModel.isDestroyed) {
                const luneModel = this.moonBodies.find(moon => moon.model.name === 'Lune')?.model;
                if (luneModel) {
                    // Calculer et stocker la position relative si ce n'est pas déjà fait
                    if (!rocketModel.relativePosition) {
                        rocketModel.updateRelativePosition(luneModel);
                    }
                    // Mettre à jour la position absolue de la fusée en fonction de la position de la lune
                    rocketModel.updateAbsolutePosition(luneModel);
                    
                    // Mettre à jour la position du corps physique
                    if (this.rocketBody) {
                        this.Body.setPosition(this.rocketBody, {
                            x: rocketModel.position.x,
                            y: rocketModel.position.y
                        });
                        
                        // Maintenir l'orientation verticale par rapport à la surface de la Lune
                        const angleToLune = Math.atan2(
                            rocketModel.position.y - luneModel.position.y,
                            rocketModel.position.x - luneModel.position.x
                        );
                        
                        // Orientation verticale : la fusée pointe vers l'extérieur de la lune
                        const correctAngle = angleToLune + Math.PI/2;
                        this.Body.setAngle(this.rocketBody, correctAngle);
                        
                        // Mettre à jour l'angle dans le modèle aussi
                        rocketModel.angle = correctAngle;
                        
                        // Réinitialiser la vitesse angulaire
                        this.Body.setAngularVelocity(this.rocketBody, 0);
                    }
                }
            }

            // Stabiliser la fusée au sol lorsqu'elle est posée
            if (this.rocketBody && rocketModel.thrusters.main.power === 0) {
                // Forcer la vitesse à zéro
                this.Body.setVelocity(this.rocketBody, { x: 0, y: 0 });
                this.Body.setAngularVelocity(this.rocketBody, 0);
                
                // Stabiliser l'angle à 0 (verticale) si on n'est pas sur la Lune
                if (rocketModel.landedOn !== 'Lune') {
                    this.Body.setAngle(this.rocketBody, 0);
                }
            }
            
            // Si le propulseur principal est activé avec assez de puissance, permettre le décollage
            if (rocketModel.thrusters.main.power > 50) { // Seuil de puissance minimum
                // Forcer le décollage immédiat si le propulseur principal est actif
                rocketModel.isLanded = false;
                
                // Appliquer une forte impulsion vers le haut pour garantir le décollage
                if (this.rocketBody) {
                    const impulseY = -5.0; // Force augmentée
                    this.Body.applyForce(this.rocketBody, 
                        this.rocketBody.position, 
                        { x: 0, y: impulseY }
                    );
                    
                    // Ajouter une vitesse initiale vers le haut
                    this.Body.setVelocity(this.rocketBody, { x: 0, y: -2.0 });
                    
                    // Désactiver temporairement les contraintes physiques
                    this.Body.setStatic(this.rocketBody, false);
                }
                
                console.log("Décollage immédiat avec propulseur principal");
            }
        }
        
        // Appliquer les forces des propulseurs actifs
        this.updateThrusters(rocketModel);
        
        // Si la fusée est détruite et attachée à la lune, mettre à jour sa position
        // pour qu'elle suive le mouvement de la lune
        if (rocketModel.isDestroyed && rocketModel.attachedTo === 'Lune') {
            // Trouver le modèle de la lune
            const luneModel = this.moonBodies.find(moon => moon.model.name === 'Lune')?.model;
            if (luneModel) {
                // Mettre à jour la position absolue de la fusée en fonction de la position de la lune
                rocketModel.updateAbsolutePosition(luneModel);
            }
        }
        
        // Mettre à jour le moteur physique
        this.Engine.update(this.engine, deltaTime * this.timeScale);
        
        // Synchroniser le modèle avec le corps physique après la mise à jour
        // sauf si la fusée est détruite et attachée à la lune
        if (!(rocketModel.isDestroyed && rocketModel.attachedTo === 'Lune')) {
            this.syncModelWithPhysics(rocketModel);
        }
    }
    
    // Calculer les exigences de poussée pour le décollage
    calculateThrustRequirements(rocketModel, universeModel) {
        // Ne calculer qu'une fois toutes les 60 frames pour éviter de surcharger la console
        if (!this._lastThrustCalculation || Date.now() - this._lastThrustCalculation > 2000) {
            this._lastThrustCalculation = Date.now();
            
            if (!universeModel || !universeModel.celestialBodies || !rocketModel) return;
            
            const earth = universeModel.celestialBodies.find(body => body.name === 'Terre');
            if (!earth) return;
            
            // Calculer la distance entre la fusée et la Terre
            const dx = earth.position.x - rocketModel.position.x;
            const dy = earth.position.y - rocketModel.position.y;
            const distanceSquared = dx * dx + dy * dy;
            const distance = Math.sqrt(distanceSquared);
            
            // Calculer la force gravitationnelle
            const gravitationalForce = PHYSICS.G * earth.mass * rocketModel.mass / distanceSquared;
            
            // Force du propulseur principal à pleine puissance avec multiplicateur
            const mainThrusterForce = ROCKET.MAIN_THRUST * 1.5 * PHYSICS.THRUST_MULTIPLIER;
            
            // Rapport poussée/poids (TWR - Thrust to Weight Ratio)
            const twr = mainThrusterForce / gravitationalForce;
            
            // Pour décoller, TWR doit être > 1
            const canLiftOff = twr > 1;
            
            // Facteur d'augmentation nécessaire si TWR < 1
            const requiredThrustMultiplier = canLiftOff ? 1 : (1 / twr);
            
            // Force nécessaire pour décoller
            const requiredThrust = canLiftOff ? mainThrusterForce : (mainThrusterForce * requiredThrustMultiplier);
            
            // Calculer combien de propulseurs principaux seraient nécessaires avec le multiplicateur actuel
            const mainThrustersNeeded = Math.ceil(requiredThrust / (ROCKET.MAIN_THRUST * PHYSICS.THRUST_MULTIPLIER));
            
            // Afficher les résultats dans la console
            console.log("=== ANALYSE DES EXIGENCES DE POUSSÉE ===");
            console.log(`Masse de la fusée: ${rocketModel.mass.toFixed(0)} kg`);
            console.log(`Force gravitationnelle: ${gravitationalForce.toFixed(2)} N`);
            console.log(`Force du propulseur principal (avec multiplicateur ${PHYSICS.THRUST_MULTIPLIER}x): ${mainThrusterForce.toFixed(2)} N`);
            console.log(`Rapport poussée/poids (TWR): ${twr.toFixed(4)}`);
            console.log(`La fusée ${canLiftOff ? "PEUT" : "NE PEUT PAS"} décoller avec la configuration actuelle`);
            
            if (!canLiftOff) {
                console.log(`Pour décoller, il faudrait:`);
                console.log(`1. Augmenter le multiplicateur de poussée à: ${(PHYSICS.THRUST_MULTIPLIER * requiredThrustMultiplier).toFixed(2)}`);
                console.log(`2. OU ajouter ${mainThrustersNeeded - 1} propulseurs principaux supplémentaires`);
                console.log(`3. OU réduire la constante gravitationnelle (G) à: ${(PHYSICS.G / requiredThrustMultiplier).toFixed(6)}`);
            } else {
                console.log(`Marge de sécurité: ${((twr - 1) * 100).toFixed(2)}% de poussée supplémentaire`);
            }
            
            console.log("======================================");
        }
    }
    
    // Mettre à jour et appliquer toutes les forces des propulseurs
    updateThrusters(rocketModel) {
        if (!this.rocketBody) return;
        
        // Si la fusée est détruite, aucun propulseur ne fonctionne
        if (rocketModel.isDestroyed) {
            return;
        }
        
        // Pour chaque propulseur, vérifier s'il est actif et appliquer la force correspondante
        for (const thrusterName in rocketModel.thrusters) {
            const thruster = rocketModel.thrusters[thrusterName];
            
            // Si le propulseur est actif (puissance > 0), appliquer sa force
            if (thruster.power > 0) {
                this.applyThrusterForce(rocketModel, thrusterName, thruster.power);
            }
        }
    }
    
    // Appliquer la force de poussée des réacteurs
    applyThrusterForce(rocketModel, thrusterName, powerPercentage) {
        if (!rocketModel.thrusters[thrusterName] || !this.rocketBody) return;
        
        // Récupérer les informations sur le réacteur
        const thruster = rocketModel.thrusters[thrusterName];
        
        // Force réelle basée sur le pourcentage de puissance et le type de propulseur
        let thrustForce;
        switch (thrusterName) {
            case 'main': 
                thrustForce = ROCKET.MAIN_THRUST * (powerPercentage / 100) * 1.5 * PHYSICS.THRUST_MULTIPLIER;
                break;
            case 'rear': 
                thrustForce = ROCKET.REAR_THRUST * (powerPercentage / 100) * 1.5 * PHYSICS.THRUST_MULTIPLIER;
                break;
            case 'left':
            case 'right': 
                thrustForce = ROCKET.LATERAL_THRUST * (powerPercentage / 100) * 3 * PHYSICS.THRUST_MULTIPLIER;
                break;
            default:
                thrustForce = 0;
        }
        
        // Si pas de carburant, pas de poussée
        if (rocketModel.fuel <= 0) {
            thrustForce = 0;
        } else {
            // Consommer du carburant en fonction du type de propulseur
            let fuelConsumption;
            switch (thrusterName) {
                case 'main':
                    fuelConsumption = ROCKET.FUEL_CONSUMPTION.MAIN;
                    break;
                case 'rear':
                    fuelConsumption = ROCKET.FUEL_CONSUMPTION.REAR;
                    break;
                case 'left':
                case 'right':
                    fuelConsumption = ROCKET.FUEL_CONSUMPTION.LATERAL;
                    break;
                default:
                    fuelConsumption = 0;
            }
            
            // Consommer le carburant proportionnellement à la puissance
            const fuelUsed = fuelConsumption * (powerPercentage / 100);
            if (!rocketModel.consumeFuel(fuelUsed)) {
                thrustForce = 0; // Plus de carburant
            }
        }
        
        // Si pas de poussée, on sort
        if (thrustForce <= 0) return;
        
        // Calculer le point d'application de la force (position du propulseur)
        // Utiliser les positions définies dans le modèle pour TOUS les propulseurs
        const leverX = thruster.position.x;
        const leverY = thruster.position.y;
        
        // Calculer le point d'application dans les coordonnées du monde
        const offsetX = Math.cos(rocketModel.angle) * leverX - Math.sin(rocketModel.angle) * leverY;
        const offsetY = Math.sin(rocketModel.angle) * leverX + Math.cos(rocketModel.angle) * leverY;
        
        const position = {
            x: this.rocketBody.position.x + offsetX,
            y: this.rocketBody.position.y + offsetY
        };
        
        // Calculer l'angle de poussée selon le type de propulseur
        let thrustAngle;
        
        if (thrusterName === 'left' || thrusterName === 'right') {
            // Pour les propulseurs latéraux, la poussée est perpendiculaire à l'axe du propulseur
            // L'angle dépend de la position du propulseur par rapport au centre de la fusée
            const propAngle = Math.atan2(leverY, leverX);
            
            // Direction perpendiculaire à l'angle du propulseur (+ ou - 90° selon le côté)
            const perpDirection = thrusterName === 'left' ? Math.PI/2 : -Math.PI/2;
            thrustAngle = rocketModel.angle + propAngle + perpDirection;
        } else {
            // Pour les propulseurs principaux (main et rear)
            switch (thrusterName) {
                case 'main': 
                    thrustAngle = rocketModel.angle - Math.PI/2; // Poussée vers le haut
                    break;
                case 'rear': 
                    thrustAngle = rocketModel.angle + Math.PI/2; // Poussée vers le bas
                    break;
                default:
                    thrustAngle = rocketModel.angle;
            }
        }
        
        // Calculer les composantes vectorielles de la force
        const thrustX = Math.cos(thrustAngle) * thrustForce;
        const thrustY = Math.sin(thrustAngle) * thrustForce;
        
        // Stocker les forces pour la visualisation en debug
        this.thrustForces[thrusterName] = { x: thrustX, y: thrustY };
        
        // Appliquer la force au corps physique
        this.Body.applyForce(this.rocketBody, position, { x: thrustX, y: thrustY });
        
        // Si nous sommes en train d'appliquer la poussée du propulseur principal et que la fusée est posée sur la Lune
        // Forcer le passage à l'état "non posé" pour permettre le décollage
        if (thrusterName === 'main' && rocketModel.landedOn === 'Lune' && thrustForce > 0) {
            // Indiquer que la fusée n'est plus posée
            rocketModel.isLanded = false;
            rocketModel.landedOn = null;
            
            // Appliquer une impulsion supplémentaire dans la direction appropriée
            // Utiliser l'angle actuel de la fusée pour déterminer la direction de l'impulsion
            const impulseForce = 5.0; // Force d'impulsion plus grande pour s'échapper de la Lune
            const impulseX = -Math.cos(rocketModel.angle + Math.PI/2) * impulseForce;
            const impulseY = -Math.sin(rocketModel.angle + Math.PI/2) * impulseForce;
            
            this.Body.applyForce(this.rocketBody, this.rocketBody.position, {
                x: impulseX,
                y: impulseY
            });
            
            console.log("Décollage de la Lune initié !");
        }
        
        // Stocker les vecteurs de poussée pour la visualisation dans RocketView
        if (!this.rocketBody.thrustVectors) {
            this.rocketBody.thrustVectors = {};
        }
        
        this.rocketBody.thrustVectors[thrusterName] = {
            position: { x: offsetX, y: offsetY },
            x: Math.cos(thrustAngle),
            y: Math.sin(thrustAngle),
            magnitude: thrustForce
        };
    }
    
    // Mettre à jour la physique des corps célestes
    updateCelestialBodiesPhysics(universeModel, deltaTime) {
        // Pas besoin de mise à jour physique des corps célestes
        // Les lunes sont mises à jour manuellement dans updateMoons
    }
    
    // Définir l'échelle de temps de la simulation
    setTimeScale(scale) {
        // Toujours fixer l'échelle de temps à 1.0 - fonctionnalité désactivée
        this.timeScale = 1.0;
    }
    
    // Réinitialiser le moteur physique
    resetPhysics(rocketModel, universeModel) {
        if (this.rocketBody) {
            // Supprimer le corps physique actuel
            this.Composite.remove(this.engine.world, this.rocketBody);
            this.rocketBody = null;
        }
        
        // Réinitialiser le monde
        this.initPhysics(rocketModel, universeModel);
    }
    
    // Afficher les vecteurs de force pour le débogage
    drawForceVectors(ctx, camera) {
        if (!this.showForces || !this.rocketBody) return;
        
        const scale = 0.02; // Échelle de visualisation des forces
        
        // Position de la fusée dans les coordonnées de la caméra
        const rocketX = (this.rocketBody.position.x - camera.x) * camera.zoom + camera.offsetX;
        const rocketY = (this.rocketBody.position.y - camera.y) * camera.zoom + camera.offsetY;
        
        // Dessiner les vecteurs de force des propulseurs
        for (const thrusterName in this.thrustForces) {
            const force = this.thrustForces[thrusterName];
            
            // Couleur selon le propulseur
            let color;
            switch (thrusterName) {
                case 'main': color = '#FF0000'; break; // Rouge
                case 'rear': color = '#00FF00'; break; // Vert
                case 'left': color = '#0000FF'; break; // Bleu
                case 'right': color = '#FFFF00'; break; // Jaune
                default: color = '#FFFFFF'; // Blanc
            }
            
            // Ne dessiner que si la force existe
            if (force.x !== 0 || force.y !== 0) {
                ctx.beginPath();
                ctx.moveTo(rocketX, rocketY);
                ctx.lineTo(
                    rocketX + force.x * scale * camera.zoom,
                    rocketY + force.y * scale * camera.zoom
                );
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        
        // Dessiner le vecteur de vitesse de la fusée
        if (this.rocketBody.velocity && (this.rocketBody.velocity.x !== 0 || this.rocketBody.velocity.y !== 0)) {
            const velocityColor = '#00FFFF'; // Cyan pour la vitesse
            
            // Calculer la magnitude de la vitesse
            const velocityMagnitude = Math.sqrt(
                this.rocketBody.velocity.x * this.rocketBody.velocity.x + 
                this.rocketBody.velocity.y * this.rocketBody.velocity.y
            );
            
            // Facteur d'échelle pour la vitesse
            const velocityScale = 10; // Échelle augmentée pour la vitesse
            
            // Calculer l'extrémité de la flèche
            const endX = rocketX + this.rocketBody.velocity.x * velocityScale * camera.zoom;
            const endY = rocketY + this.rocketBody.velocity.y * velocityScale * camera.zoom;
            
            // Dessiner la ligne de la flèche
            ctx.beginPath();
            ctx.moveTo(rocketX, rocketY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = velocityColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dessiner la pointe de la flèche
            const angle = Math.atan2(this.rocketBody.velocity.y, this.rocketBody.velocity.x);
            const headLength = 10 * camera.zoom; // Longueur de la pointe de flèche
            
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - headLength * Math.cos(angle - Math.PI / 6),
                endY - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                endX - headLength * Math.cos(angle + Math.PI / 6),
                endY - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fillStyle = velocityColor;
            ctx.fill();
            
            // Afficher la magnitude de la vitesse
            ctx.font = `${12 * camera.zoom}px Arial`;
            ctx.fillStyle = velocityColor;
            ctx.fillText(
                `V: ${velocityMagnitude.toFixed(1)} m/s`,
                endX + 5 * camera.zoom,
                endY - 5 * camera.zoom
            );
        }
        
        // Dessiner le vecteur de force gravitationnelle avec une flèche
        if (this.gravityForce && (this.gravityForce.x !== 0 || this.gravityForce.y !== 0)) {
            const gravityColor = '#FF00FF'; // Magenta pour la gravité (plus visible)
            
            // Calculer la magnitude de la force gravitationnelle
            const forceMagnitude = Math.sqrt(
                this.gravityForce.x * this.gravityForce.x + 
                this.gravityForce.y * this.gravityForce.y
            );
            
            // Calculer la direction du vecteur
            const angle = Math.atan2(this.gravityForce.y, this.gravityForce.x);
            
            // Définir une échelle adaptative en fonction de la magnitude
            // Plus la force est grande, plus l'échelle est petite pour éviter un vecteur trop long
            const adaptiveScale = 0.0001 * Math.max(1, 500000 / forceMagnitude);
            let displayLength = forceMagnitude * adaptiveScale * camera.zoom;
            
            // Limiter la longueur pour qu'elle reste visible mais pas excessive
            const maxLength = RENDER.GRAVITY_MAX_LENGTH * camera.zoom;
            if (displayLength > maxLength) {
                displayLength = maxLength;
            } else if (displayLength < 30 * camera.zoom) {
                // Longueur minimale pour que le vecteur soit toujours visible
                displayLength = 30 * camera.zoom;
            }
            
            // Calculer l'extrémité de la flèche
            const endX = rocketX + Math.cos(angle) * displayLength;
            const endY = rocketY + Math.sin(angle) * displayLength;
            
            // Dessiner la ligne de la flèche
            ctx.beginPath();
            ctx.moveTo(rocketX, rocketY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = gravityColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dessiner la pointe de la flèche
            const headLength = 10 * camera.zoom; // Longueur de la pointe de flèche
            
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - headLength * Math.cos(angle - Math.PI / 6),
                endY - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                endX - headLength * Math.cos(angle + Math.PI / 6),
                endY - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fillStyle = gravityColor;
            ctx.fill();
            
            // Modifier la position du texte pour qu'il soit toujours visible
            // Position décalée dans le sens contraire du vecteur pour éviter le chevauchement
            const textOffsetX = -Math.cos(angle) * 20 * camera.zoom;
            const textOffsetY = -Math.sin(angle) * 20 * camera.zoom;
            
            // Afficher la magnitude de la force avec un fond semi-transparent pour garantir la lisibilité
            ctx.font = `${12 * camera.zoom}px Arial`;
            
            // Créer un fond pour le texte
            const text = `G: ${forceMagnitude.toFixed(1)}`;
            const textWidth = ctx.measureText(text).width;
            const textHeight = 14 * camera.zoom;
            const padding = 4 * camera.zoom;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(
                endX + textOffsetX - padding,
                endY + textOffsetY - textHeight,
                textWidth + padding * 2,
                textHeight + padding * 2
            );
            
            // Dessiner le texte
            ctx.fillStyle = gravityColor;
            ctx.fillText(
                text,
                endX + textOffsetX,
                endY + textOffsetY
            );
        }
    }
    
    // Activer/désactiver l'affichage des forces
    toggleForceVectors() {
        this.showForces = !this.showForces;
        return this.showForces;
    }

    // Calculer et mettre en cache la force gravitationnelle
    calculateGravitationalForce(body1, body2) {
        const cacheKey = `${body1.id}-${body2.id}`;
        const cachedForce = this.forceCache.get(cacheKey);
        
        if (cachedForce && Date.now() - cachedForce.timestamp < this.cacheTimeout) {
            return cachedForce.force;
        }
        
        const dx = body2.position.x - body1.position.x;
        const dy = body2.position.y - body1.position.y;
        const distanceSq = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSq);
        
        // Modification: utiliser une relation inverse linéaire (1/r) au lieu de quadratique (1/r²)
        const forceMagnitude = this.gravitationalConstant * body2.mass * body1.mass / distance;
        const force = {
            x: forceMagnitude * (dx / distance),
            y: forceMagnitude * (dy / distance)
        };
        
        this.forceCache.set(cacheKey, {
            force,
            timestamp: Date.now()
        });
        
        return force;
    }

    // Nettoyer le cache périodiquement
    clearCacheIfNeeded() {
        if (Date.now() - this.lastCacheClear > this.cacheTimeout) {
            this.forceCache.clear();
            this.lastCacheClear = Date.now();
        }
    }

    // Mettre à jour la physique
    update(deltaTime) {
        this.clearCacheIfNeeded();
        
        // Si le modèle de fusée ou le corps physique n'existe pas, sortir
        if (!this.rocketModel || !this.rocketBody) return;
        
        // Mettre à jour la physique de la fusée
        this.updateRocketPhysics(this.rocketModel, null, deltaTime);
        
        // Afficher les informations de débogage
        if (this.rocketBody) {
            //console.log(`Position: (${this.rocketBody.position.x.toFixed(2)}, ${this.rocketBody.position.y.toFixed(2)}), Vélocité: (${this.rocketBody.velocity.x.toFixed(2)}, ${this.rocketBody.velocity.y.toFixed(2)})`);
        }
    }
    
    // Synchroniser la physique avec le modèle de fusée
    syncPhysics(rocketModel, universeModel) {
        // Si le corps physique de la fusée existe, le supprimer
        if (this.rocketBody) {
            this.Composite.remove(this.engine.world, this.rocketBody);
            this.rocketBody = null;
        }
        
        // Réinitialiser la physique avec le modèle de fusée mis à jour
        this.initPhysics(rocketModel, universeModel);
    }

    // Méthode pour synchroniser le modèle avec le corps physique
    syncModelWithPhysics(rocketModel) {
        if (!this.rocketBody) return;
        
        // Mettre à jour le modèle avec les valeurs du corps physique
        rocketModel.position.x = this.rocketBody.position.x;
        rocketModel.position.y = this.rocketBody.position.y;
        rocketModel.angle = this.rocketBody.angle;
        rocketModel.velocity.x = this.rocketBody.velocity.x;
        rocketModel.velocity.y = this.rocketBody.velocity.y;
        rocketModel.angularVelocity = this.rocketBody.angularVelocity;
    }

    // Méthode pour synchroniser le corps physique avec le modèle
    syncPhysicsWithModel(rocketModel) {
        if (!this.rocketBody) return;
        
        // Mettre à jour le corps physique avec les valeurs du modèle
        this.Body.setPosition(this.rocketBody, {
            x: rocketModel.position.x,
            y: rocketModel.position.y
        });
        this.Body.setAngle(this.rocketBody, rocketModel.angle);
        this.Body.setVelocity(this.rocketBody, {
            x: rocketModel.velocity.x,
            y: rocketModel.velocity.y
        });
        this.Body.setAngularVelocity(this.rocketBody, rocketModel.angularVelocity);
    }

    // Méthode pour mettre à jour la position des lunes manuellement
    updateMoons(deltaTime) {
        // Trouver le corps parent (la Terre)
        const earthBody = this.celestialBodies.find(body => body.model.name === 'Terre');
        
        if (!earthBody || !earthBody.model) return;
        
        // Pour chaque lune, mettre à jour son corps physique
        for (const moon of this.moonBodies) {
            if (!moon.model || !moon.body) continue;
            
            // Si la lune est attachée à un corps parent, utiliser updateMoon de ce corps 
            for (const celestialBody of this.celestialBodies) {
                if (celestialBody.model.moon === moon.model && celestialBody.model.updateMoon) {
                    // Mettre à jour la position dans le modèle
                    celestialBody.model.updateMoon(deltaTime);
                    
                    // Mettre à jour le corps physique de la lune pour qu'il suive le modèle
                    this.Body.setPosition(moon.body, {
                        x: moon.model.position.x,
                        y: moon.model.position.y
                    });
                }
            }
        }
    }

    // Activer/désactiver les contrôles assistés
    toggleAssistedControls() {
        this.assistedControls = !this.assistedControls;
        if (this.rocketBody) {
            // Appliquer l'amortissement angulaire approprié directement sur la propriété du corps
            this.rocketBody.angularDamping = this.assistedControls ? this.assistedAngularDamping : this.angularDamping;
            
            // Afficher un message détaillé dans la console
            console.log(`Contrôles assistés: ${this.assistedControls ? 'ACTIVÉS' : 'DÉSACTIVÉS'}`);
            console.log(`Amortissement angulaire: ${this.rocketBody.angularDamping.toFixed(2)} (${this.assistedControls ? '10x plus fort' : 'normal'})`);
            
            if (this.assistedControls) {
                console.log("Stabilisation automatique de la rotation activée");
                console.log("Les rotations seront plus lentes et la fusée se stabilisera plus facilement");
            }
        }
        return this.assistedControls;
    }
} 