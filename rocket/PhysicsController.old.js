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
                    label: body.name, // Utiliser le nom du corps comme label
                    collisionFilter: {
                        category: 0x0002,
                        mask: 0x0001 // Collision uniquement avec la fusée (catégorie 1)
                    },
                    restitution: PHYSICS.RESTITUTION,
                    friction: 0.05,
                    // Configurer tous les corps célestes comme attracteurs gravitationnels
                    plugin: {
                        attractors: [
                            // Utiliser l'attracteur standard de Matter Attractors (relation en 1/r²)
                            MatterAttractors.Attractors.gravity
                        ]
                    }
                };
                
                // Créer le corps céleste
                const celestialBody = this.Bodies.circle(
                    body.position.x,
                    body.position.y,
                    body.radius,
                    options
                );
                
                // Ajouter au monde et à notre liste unifiée
                if (celestialBody) {
                    this.Composite.add(this.engine.world, celestialBody);
                    this.celestialBodies.push({
                        body: celestialBody,
                        model: body // Conserver la référence au modèle original
                    });
                    // Optionnel : log pour confirmer l'ajout
                    // console.log(`Corps physique pour ${body.name} créé et ajouté au monde.`);
                } else {
                     console.error(`Échec de la création du corps physique pour ${body.name}`);
                }
            }
            
            // Configuration pour visualiser la force gravitationnelle
            Matter.Events.on(this.engine, 'beforeUpdate', () => {
                // Réinitialiser la force gravitationnelle pour la visualisation
                this.gravityForce = { x: 0, y: 0 };
                
                // Si la fusée est présente, calculer la force gravitationnelle totale pour la visualisation
                if (this.rocketBody) {
                    // Calculer la force de TOUS les corps célestes
                    for (let i = 0; i < this.celestialBodies.length; i++) {
                        const celestialInfo = this.celestialBodies[i];
                        const celestialBody = celestialInfo.body;
                        const celestialModel = celestialInfo.model; // Utiliser le modèle pour la masse
                        
                        // Calculer le vecteur pour la visualisation
                        const dx = celestialBody.position.x - this.rocketBody.position.x;
                        const dy = celestialBody.position.y - this.rocketBody.position.y;
                        const distanceSq = dx * dx + dy * dy;

                        // Éviter la division par zéro si la distance est nulle
                        if (distanceSq === 0) continue; 
                        
                        const distance = Math.sqrt(distanceSq);
                        
                        // Utiliser une relation inverse quadratique (1/r²) pour la visualisation
                        // Utiliser la masse du modèle qui peut être plus précise ou dynamique
                        const forceMagnitude = this.gravitationalConstant * celestialModel.mass * this.rocketBody.mass / distanceSq;
                        
                        // Ajouter à la force totale visualisée
                        this.gravityForce.x += forceMagnitude * (dx / distance);
                        this.gravityForce.y += forceMagnitude * (dy / distance);
                    }
                }
            });
            
            // Configurer les événements de collision avec Matter.js
            this.setupCollisionEvents();
            
        } catch (error) {
            console.error("Erreur lors de l'initialisation de la physique:", error);
        }
    }
    
    // Configurer les événements de collision
    setupCollisionEvents() {
        // Variable locale pour stocker la référence au modèle de la fusée
        const rocketModel = this.rocketModel;
        
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
                    if (otherBody.label !== 'rocket' && this.isRocketLanded(rocketModel, otherBody)) {
                        rocketModel.isLanded = true;
                        rocketModel.landedOn = otherBody.label; // Indiquer le corps sur lequel on a atterri

                        // Calculer l'angle correct par rapport à la surface du corps céleste
                        const angleToBody = Math.atan2(
                            rocketModel.position.y - otherBody.position.y,
                            rocketModel.position.x - otherBody.position.x
                        );

                        // Orientation verticale : la fusée pointe vers l'extérieur du corps céleste
                        const correctAngle = angleToBody + Math.PI/2;

                        // Appliquer l'angle correct
                        rocketModel.angle = correctAngle;
                        if (this.rocketBody) {
                            this.Body.setAngle(this.rocketBody, correctAngle);
                        }

                        // Synchroniser immédiatement la vitesse
                        rocketModel.setVelocity(0, 0);
                        rocketModel.setAngularVelocity(0);
                        this.syncPhysicsWithModel(rocketModel);

                        console.log(`Atterrissage réussi sur ${otherBody.label}`);
                    } else {
                        // Collision normale, appliquer des dégâts en fonction de la vitesse d'impact
                        const impactDamage = impactVelocity * PHYSICS.IMPACT_DAMAGE_FACTOR;

                        // Si c'est une collision avec un corps céleste et que la vitesse d'impact dépasse le seuil
                        // Condition généralisée: collision avec un corps céleste
                        if (otherBody.label !== 'rocket' && impactVelocity > COLLISION_THRESHOLD) {
                            // Ne pas appliquer de dégâts ni afficher de messages si la fusée est déjà détruite
                            if (!rocketModel.isDestroyed) {
                                // Mémoriser d'abord sur quel corps la collision a eu lieu
                                rocketModel.landedOn = otherBody.label;

                                // Appliquer les dégâts immédiatement
                                rocketModel.applyDamage(impactDamage);

                                // NOTE: La logique de position relative en cas de destruction sur une lune
                                // a été supprimée ici. Elle pourrait être gérée ailleurs si nécessaire.

                                // Jouer le son de collision importante
                                this.playCollisionSound(impactVelocity);

                                console.log(`Collision IMPORTANTE avec ${otherBody.label}: Vitesse d'impact=${impactVelocity.toFixed(2)}, Dégâts=${impactDamage.toFixed(2)}`);
                            }
                        // Condition généralisée: collision douce avec un corps céleste
                        } else if (otherBody.label !== 'rocket') {
                            // Ne pas afficher de messages si la fusée est déjà détruite
                            if (!rocketModel.isDestroyed) {
                                console.log(`Collision avec ${otherBody.label}: Vitesse d'impact=${impactVelocity.toFixed(2)}, Pas de dégâts`);
                            }
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
                    // Condition généralisée: collision avec un corps céleste
                    if (otherBody.label !== 'rocket') {
                        // Utiliser la méthode améliorée pour détecter l'atterrissage
                        if (!rocketModel.isLanded && this.isRocketLanded(rocketModel, otherBody)) {
                            rocketModel.isLanded = true;
                            rocketModel.landedOn = otherBody.label;
                            console.log(`Fusée posée sur ${otherBody.label}`);
                            
                            // Réinitialiser la vitesse dans le modèle
                            rocketModel.setVelocity(0, 0);
                            rocketModel.setAngularVelocity(0);
                            
                            // Réinitialiser la vitesse dans le corps physique
                            this.Body.setVelocity(this.rocketBody, { x: 0, y: 0 });
                            this.Body.setAngularVelocity(this.rocketBody, 0);
                        }
                        
                        // Stabiliser la fusée: maintenir l'orientation correcte par rapport à la surface
                        // Condition généralisée: stabiliser sur n'importe quel corps céleste si angle faible ou si on est posé
                        if (rocketModel.isLanded || Math.abs(rocketModel.angle) < 0.3) {
                            // Calculer l'angle correct par rapport à la surface
                            const angleToBody = Math.atan2(
                                rocketModel.position.y - otherBody.position.y,
                                rocketModel.position.x - otherBody.position.x
                            );
                            
                            // Orientation verticale : la fusée pointe vers l'extérieur du corps céleste
                            const correctAngle = angleToBody + Math.PI/2;
                            
                            // Appliquer l'angle correct
                            this.Body.setAngle(this.rocketBody, correctAngle);
                            this.Body.setAngularVelocity(this.rocketBody, 0);
                        }
                        
                        // Vérifier si un propulseur est actif avec suffisamment de puissance
                        const mainThrusterActive = rocketModel.thrusters.main.power > 50; // Seuil de puissance minimum
                        
                        // Ne pas amortir les mouvements si la fusée essaie de décoller
                        if (!mainThrusterActive) {
                            // Forcer la vitesse à zéro
                            this.Body.setVelocity(this.rocketBody, { x: 0, y: 0 });
                            this.Body.setAngularVelocity(this.rocketBody, 0);
                        } else {
                            // Si le propulseur principal est actif avec suffisamment de puissance, forcer le décollage
                            rocketModel.isLanded = false;
                            rocketModel.landedOn = null;
                            
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
                    
                    // Condition généralisée: fin de collision avec un corps céleste et on était posé
                    if ((otherBody.label !== 'rocket') && rocketModel.isLanded) {
                        // Utiliser une méthode plus précise pour vérifier si on est toujours posé
                        // Si on n'est plus posé, mettre à jour l'état
                        if (!this.isRocketLanded(rocketModel, otherBody)) {
                            rocketModel.isLanded = false;
                            rocketModel.landedOn = null;
                            console.log(`Décollage de ${otherBody.label} confirmé`);
                        }
                    }
                }
            }
        });
    }
    
    // Jouer le son de collision en fonction de la vitesse d'impact
    playCollisionSound(impactVelocity) {
        // Si la fusée est déjà détruite, ne pas jouer de son supplémentaire
        if (this.rocketModel && this.rocketModel.isDestroyed) {
            return;
        }
        
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
            // Trouver le corps sur lequel la fusée est posée
            const landedOnInfo = this.celestialBodies.find(cb => cb.model.name === rocketModel.landedOn);

            // Si la fusée est posée sur un corps céleste mobile et n'est pas détruite
            // On vérifie si le modèle existe et a une méthode d'orbite (ou une propriété indiquant qu'il est mobile)
            if (landedOnInfo && landedOnInfo.model && typeof landedOnInfo.model.updateOrbit === 'function' && !rocketModel.isDestroyed) {
                const landedOnModel = landedOnInfo.model; // Le modèle du corps mobile

                // Calculer et stocker la position relative si ce n'est pas déjà fait
                if (!rocketModel.relativePosition) {
                    // Calculer l'angle correct par rapport à la surface du corps
                    const angleToBody = Math.atan2(
                        rocketModel.position.y - landedOnModel.position.y,
                        rocketModel.position.x - landedOnModel.position.x
                    );

                    // Ajuster l'angle de la fusée pour qu'elle soit perpendiculaire à la surface
                    const correctAngle = angleToBody + Math.PI/2;
                    rocketModel.angle = correctAngle;

                    if (this.rocketBody) {
                        this.Body.setAngle(this.rocketBody, correctAngle);
                        this.Body.setAngularVelocity(this.rocketBody, 0);
                    }

                    // Maintenant calculer la position relative avec l'angle correct
                    rocketModel.updateRelativePosition(landedOnModel);

                    // Attendre une frame avant de mettre à jour la position absolue
                    return; // Important pour éviter des calculs basés sur une position non synchronisée
                }

                // Mettre à jour la position absolue de la fusée en fonction de la position du corps mobile
                rocketModel.updateAbsolutePosition(landedOnModel);

                // Mettre à jour la position du corps physique de la fusée
                if (this.rocketBody) {
                    this.Body.setPosition(this.rocketBody, {
                        x: rocketModel.position.x,
                        y: rocketModel.position.y
                    });

                    // Maintenir l'orientation verticale par rapport à la surface
                    this.Body.setAngle(this.rocketBody, rocketModel.angle);
                    this.Body.setAngularVelocity(this.rocketBody, 0); // Réinitialiser la vitesse angulaire
                }
            }

            // Stabiliser la fusée au sol lorsqu'elle est posée et que le moteur principal est coupé
            if (this.rocketBody && rocketModel.thrusters.main.power === 0) {
                // Forcer la vitesse à zéro
                this.Body.setVelocity(this.rocketBody, { x: 0, y: 0 });
                this.Body.setAngularVelocity(this.rocketBody, 0);

                // Maintenir l'orientation perpendiculaire à la surface
                // Recherche générique du corps sur lequel on est posé (landedOnInfo déjà trouvé plus haut)
                const landedOnBodyModel = landedOnInfo ? landedOnInfo.model : null;

                if (landedOnBodyModel) {
                    // Calculer l'angle correct par rapport à la surface
                    const angleToBody = Math.atan2(
                        rocketModel.position.y - landedOnBodyModel.position.y,
                        rocketModel.position.x - landedOnBodyModel.position.x
                    );

                    // Orientation verticale : la fusée pointe vers l'extérieur du corps céleste
                    const correctAngle = angleToBody + Math.PI/2;

                    // Appliquer l'angle correct
                    this.Body.setAngle(this.rocketBody, correctAngle);
                }
            }

            // Si le propulseur principal est activé avec assez de puissance, permettre le décollage
            if (rocketModel.thrusters.main.power > 50) { // Seuil de puissance minimum
                 // Forcer le décollage immédiat si le propulseur principal est actif
                rocketModel.isLanded = false;
                rocketModel.landedOn = null; // Réinitialiser landedOn

                // Appliquer une forte impulsion vers le haut pour garantir le décollage
                if (this.rocketBody) {
                    const impulseY = -5.0; // Force augmentée
                    // Calculer la direction de l'impulsion basée sur l'angle actuel (perpendiculaire à la surface)
                    const angle = this.rocketBody.angle - Math.PI / 2;
                    const impulse = {
                         x: Math.cos(angle) * impulseY, // Inverser Y car -5 est la magnitude
                         y: Math.sin(angle) * impulseY
                    };
                    this.Body.applyForce(this.rocketBody,
                        this.rocketBody.position,
                        impulse // Appliquer l'impulsion dans la bonne direction
                    );

                    // Ajouter une vitesse initiale dans la direction de l'impulsion
                    const initialVelMagnitude = 2.0;
                    this.Body.setVelocity(this.rocketBody, {
                         x: Math.cos(angle) * -initialVelMagnitude, // Vitesse initiale vers le "haut"
                         y: Math.sin(angle) * -initialVelMagnitude
                    });

                    // Désactiver temporairement les contraintes physiques (si le corps était statique avant)
                    // Note : la fusée n'est jamais statique, donc setStatic(false) n'est pas utile ici.
                }

                console.log(`Décollage immédiat de ${landedOnInfo ? landedOnInfo.model.name : 'surface inconnue'} avec propulseur principal`);
            }
        }
        
        // Appliquer les forces des propulseurs actifs
        this.updateThrusters(rocketModel);
        
        // Vérifier périodiquement l'état d'atterrissage (environ 10 fois par seconde)
        if (universeModel && (!this._lastLandedCheck || Date.now() - this._lastLandedCheck > 100)) {
            this._lastLandedCheck = Date.now();
            this.checkRocketLandedStatus(rocketModel, universeModel);
        }
        
        // Si la fusée est détruite et attachée à un corps céleste mobile
        if (rocketModel.isDestroyed && rocketModel.attachedTo) {
             // Trouver le modèle du corps auquel la fusée est attachée
            const attachedToInfo = this.celestialBodies.find(cb => cb.model.name === rocketModel.attachedTo);
            const attachedToModel = attachedToInfo ? attachedToInfo.model : null;

            // Vérifier si ce corps est mobile (a une méthode d'orbite ou une propriété)
            if (attachedToModel && typeof attachedToModel.updateOrbit === 'function') {
                // Si la position relative n'est pas encore calculée, le faire maintenant
                if (!rocketModel.relativePosition) {
                    rocketModel.updateRelativePosition(attachedToModel);
                    console.log(`Position relative aux débris sur ${rocketModel.attachedTo} calculée.`);
                }

                // Mettre à jour la position absolue des débris en fonction de la position du corps
                rocketModel.updateAbsolutePosition(attachedToModel);

                // Mettre à jour la position du corps physique des débris
                if (this.rocketBody) { // Assumant que le rocketBody représente les débris
                    this.Body.setPosition(this.rocketBody, {
                        x: rocketModel.position.x,
                        y: rocketModel.position.y
                    });
                    // Mettre à jour l'angle du corps physique des débris
                    this.Body.setAngle(this.rocketBody, rocketModel.angle);
                     // Les débris ne devraient pas avoir de vélocité propre une fois attachés
                    this.Body.setVelocity(this.rocketBody, { x: 0, y: 0 });
                    this.Body.setAngularVelocity(this.rocketBody, 0);
                }
            }
        }
        
        // Mettre à jour le moteur physique
        this.Engine.update(this.engine, deltaTime * this.timeScale);
        
        // Synchroniser le modèle avec le corps physique après la mise à jour
        // Sauf si la fusée est détruite et attachée à un corps mobile
        const isDestroyedAndAttachedToMovingBody = rocketModel.isDestroyed &&
                                                  rocketModel.attachedTo &&
                                                  this.celestialBodies.some(cb => cb.model.name === rocketModel.attachedTo && typeof cb.model.updateOrbit === 'function');

        if (!isDestroyedAndAttachedToMovingBody) {
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
                // Jouer le son du propulseur principal
                try {
                    if (!this.mainThrusterSound) {
                        this.mainThrusterSound = new Audio('assets/sound/rocketthrustmaxx.mp3');
                        this.mainThrusterSound.loop = true;
                        this.mainThrusterSound.volume = 0.7; // Volume un peu réduit pour ne pas être trop fort
                    }
                    
                    if (!this.mainThrusterSoundPlaying) {
                        this.mainThrusterSound.play().catch(error => {
                            console.error("Erreur lors de la lecture du son du propulseur principal:", error);
                        });
                        this.mainThrusterSoundPlaying = true;
                    }
                } catch (error) {
                    console.error("Erreur lors de la lecture du fichier rocketthrustmaxx.mp3:", error);
                }
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
            
            // Arrêter le son du propulseur principal si actif
            if (thrusterName === 'main' && this.mainThrusterSoundPlaying) {
                if (this.mainThrusterSound) {
                    this.mainThrusterSound.pause();
                    this.mainThrusterSound.currentTime = 0;
                    this.mainThrusterSoundPlaying = false;
                }
            }
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
        
        // Arrêter le son du propulseur principal si la puissance est à 0
        if (thrusterName === 'main' && powerPercentage <= 0 && this.mainThrusterSoundPlaying) {
            if (this.mainThrusterSound) {
                this.mainThrusterSound.pause();
                this.mainThrusterSound.currentTime = 0;
                this.mainThrusterSoundPlaying = false;
            }
        }
        
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
            const text = `a: ${forceMagnitude.toFixed(1)}`;
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
        
        // Récupérer l'universeModel depuis le gameController si disponible
        const universeModel = this.gameController ? this.gameController.universeModel : null;
        
        // *** AJOUT IMPORTANT ***
        // S'assurer que la position des modèles des corps mobiles est à jour
        // AVANT de synchroniser leurs corps physiques.
        // Cela dépend de l'endroit où l'orbite est calculée. Si c'est dans UniverseModel:
        if (universeModel && typeof universeModel.updateOrbits === 'function') {
             universeModel.updateOrbits(deltaTime);
        }

        // *** AJOUT IMPORTANT ***
        // Synchroniser la position des corps physiques mobiles avec leurs modèles
        this.syncMovingBodyPositions(deltaTime);

        // Mettre à jour la physique de la fusée (qui utilise maintenant les positions à jour des corps)
        this.updateRocketPhysics(this.rocketModel, universeModel, deltaTime);

        // Afficher les informations de débogage
        if (this.rocketBody) {
            //console.log(`Position: (${this.rocketBody.position.x.toFixed(2)}, ${this.rocketBody.position.y.toFixed(2)}), Vélocité: (${this.rocketBody.velocity.x.toFixed(2)}, ${this.rocketBody.velocity.y.toFixed(2)})`);
        }
        // NOTE: L'appel à Engine.update est maintenant dans updateRocketPhysics.
        // Si ce n'était pas le cas, il faudrait l'appeler ici après toutes les mises à jour de forces/positions.
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

    // Renommage et adaptation de l'ancienne fonction updateMoons
    syncMovingBodyPositions(deltaTime) {
        // Itérer sur tous les corps célestes enregistrés
        for (const celestialInfo of this.celestialBodies) {
            // Vérifier si le modèle existe et s'il a une méthode pour mettre à jour sa position (orbite, etc.)
            // ou une propriété indiquant qu'il est mobile (par ex., !celestialInfo.model.isStatic)
            // Ici, nous utilisons l'existence de `updateOrbit` comme indicateur.
            if (celestialInfo.model && typeof celestialInfo.model.updateOrbit === 'function') {
                 // La mise à jour de la position du *modèle* (ex: celestialInfo.model.updateOrbit(deltaTime))
                 // doit être appelée *avant* cette synchronisation.
                 // On suppose ici qu'elle a déjà été faite ailleurs.

                // Mettre à jour la position du corps physique pour correspondre au modèle mis à jour
                if (celestialInfo.body) {
                    this.Body.setPosition(celestialInfo.body, {
                        x: celestialInfo.model.position.x,
                        y: celestialInfo.model.position.y
                    });
                    // Optionnel: Mettre à jour la vitesse aussi si le modèle la fournit
                    // if (celestialInfo.model.velocity) {
                    //     this.Body.setVelocity(celestialInfo.body, {
                    //         x: celestialInfo.model.velocity.x,
                    //         y: celestialInfo.model.velocity.y
                    //     });
                    // }
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

    // Nouvelle méthode pour vérifier si la fusée est posée sur un corps céleste
    isRocketLanded(rocketModel, otherBody) {
        if (!this.rocketBody || !otherBody) return false;
        
        // On considère la fusée déjà comme posée si elle est en état "landed"
        // sauf si elle a changé de corps céleste
        if (rocketModel.isLanded && rocketModel.landedOn === otherBody.label) {
            return true;
        }
        
        // Position de la fusée
        const rocketX = this.rocketBody.position.x;
        const rocketY = this.rocketBody.position.y;
        
        // Position du corps céleste
        const bodyX = otherBody.position.x;
        const bodyY = otherBody.position.y;
        
        // Calculer la distance entre le centre de la fusée et le centre du corps céleste
        const dx = rocketX - bodyX;
        const dy = rocketY - bodyY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculer l'angle de la normale (direction du centre du corps vers la fusée)
        const surfaceAngle = Math.atan2(dy, dx);
        
        // Calculer la distance à la surface du corps céleste
        const bodyRadius = otherBody.circleRadius;
        const distanceToSurface = distance - bodyRadius - this.rocketBody.circleRadius;
        
        // Orientation actuelle de la fusée (entre -π et π)
        const rocketOrientation = this.rocketBody.angle % (Math.PI * 2);
        
        // Angle que la fusée devrait avoir pour être perpendiculaire à la surface
        const correctOrientation = surfaceAngle + Math.PI/2;
        
        // Calculer la différence d'angle, en tenant compte du wrap-around à 2π
        let angleDiff = Math.abs(rocketOrientation - correctOrientation);
        // Corriger l'angle pour être entre 0 et π
        if (angleDiff > Math.PI) {
            angleDiff = Math.PI * 2 - angleDiff;
        }
        
        // Considérer que la fusée est orientée correctement si la différence est inférieure à 30 degrés
        const isCorrectlyOriented = angleDiff < Math.PI/6;
        
        // S'assurer que distanceToSurface n'est pas NaN
        const validDistanceToSurface = isNaN(distanceToSurface) ? 0 : distanceToSurface;
        
        // Utiliser Math.abs pour éviter les problèmes avec des valeurs négatives
        // Suppression de l'ajustement spécifique à la Lune
        const proximityThreshold = 30; // Seuil de proximité standard
        const isCloseToSurface = Math.abs(validDistanceToSurface) < proximityThreshold;
        
        // Vérifier si la vitesse est suffisamment basse
        const velocity = this.rocketBody.velocity;
        const speedSquared = velocity.x * velocity.x + velocity.y * velocity.y;
        const speed = Math.sqrt(speedSquared);
        
        // Suppression de l'ajustement spécifique à la Lune
        const velocityThreshold = 1.0; // Seuil de vitesse standard
        const hasLowVelocity = speed < velocityThreshold;
        
        // Vérifier si la vitesse angulaire est suffisamment basse
        const angularVelocity = Math.abs(this.rocketBody.angularVelocity);
        const hasLowAngularVelocity = angularVelocity < 0.1; // Seuil standard
        
        // DÉTECTION DE CRASH 1: Fusée couchée sur le sol et immobile
        const isLyingDown = (angleDiff > Math.PI/3) && isCloseToSurface && hasLowVelocity && hasLowAngularVelocity;
        
        // DÉTECTION DE CRASH 2: Fusée non verticale en contact avec le sol (orientation > 45° par rapport à la normale)
        // et soit en mouvement rapide, soit avec rotation rapide
        const isBadAngle = angleDiff > Math.PI/4; // Plus de 45° d'inclinaison par rapport à la normale
        const isMovingFast = speed > 1.0; // Utilisation du seuil standard
        const isRotatingFast = angularVelocity > 0.2;
        const isRollingOrTumbling = isCloseToSurface && isBadAngle && (isMovingFast || isRotatingFast);
        
        // DÉTECTION DE CRASH 3: Fusée à l'envers (inclinaison > 90° par rapport à la normale)
        const isUpsideDown = angleDiff > Math.PI/2;
        
        // Si la fusée est couchée, en train de rouler/culbuter sur la surface, ou à l'envers, déclencher un crash
        if ((isLyingDown || isRollingOrTumbling || isUpsideDown) && !rocketModel.isDestroyed) {
            console.log(`Crash détecté sur ${otherBody.label}! ${isLyingDown ? 'Fusée couchée' : isRollingOrTumbling ? 'Fusée en mouvement anormal' : 'Fusée à l\'envers'}`);
            console.log(`Vitesse: ${speed.toFixed(2)}, Rotation: ${angularVelocity.toFixed(2)}, Angle: ${(angleDiff * 180 / Math.PI).toFixed(2)}°`);
            
            // Mémoriser où la fusée a été détruite avant d'appliquer les dégâts
            rocketModel.landedOn = otherBody.label;
            
            // Appliquer des dégâts pour détruire la fusée
            const crashDamage = 100; // Dommages suffisants pour détruire la fusée
            rocketModel.applyDamage(crashDamage);
            
            // NOTE: La logique de position relative/attachement en cas de crash sur la Lune
            // a été supprimée ici. À gérer ailleurs si besoin.
            
            return false; // Ne pas considérer comme "posé" mais comme "crashé"
        }
        
        // Enregistrer les valeurs pour le débogage - protection contre NaN
        const formattedDistance = isNaN(distance) ? "N/A" : distance.toFixed(2);
        const formattedDistanceToSurface = validDistanceToSurface.toFixed(2);
        
        // Si la fusée est correctement orientée, proche de la surface et a une vitesse et rotation basses
        // on la considère comme posée
        return isCorrectlyOriented && isCloseToSurface && hasLowVelocity && hasLowAngularVelocity;
    }

    // Vérifier périodiquement l'état de la fusée par rapport aux corps célestes
    checkRocketLandedStatus(rocketModel, universeModel) {
        // Ne vérifier que si la fusée n'est pas détruite
        if (rocketModel.isDestroyed) return;
        
        // Parcourir tous les corps célestes
        for (const body of universeModel.celestialBodies) {
            // Créer un objet avec les propriétés nécessaires pour isRocketLanded
            const celestialBodyObject = {
                position: { x: body.position.x, y: body.position.y },
                radius: body.radius,
                label: body.name
            };
            
            // Si la fusée est actuellement considérée comme posée sur ce corps
            if (rocketModel.isLanded && rocketModel.landedOn === body.name) {
                // Vérifier si elle est toujours posée
                if (!this.isRocketLanded(rocketModel, celestialBodyObject)) {
                    // Si elle n'est plus posée, mettre à jour l'état
                    rocketModel.isLanded = false;
                    rocketModel.landedOn = null;
                    console.log(`État de décollage détecté lors de la vérification périodique de ${body.name}`);
                }
            } 
            // Si la fusée n'est pas considérée comme posée mais qu'elle l'est en réalité
            else if (!rocketModel.isLanded) {
                // Vérifier la distance pour éviter de tester des corps trop éloignés
                const dx = body.position.x - rocketModel.position.x;
                const dy = body.position.y - rocketModel.position.y;
                const distanceSquared = dx * dx + dy * dy;
                const maxDistanceCheck = (body.radius + ROCKET.HEIGHT * 2) * (body.radius + ROCKET.HEIGHT * 2);
                
                // Ne vérifier que si la fusée est suffisamment proche du corps
                if (distanceSquared <= maxDistanceCheck) {
                    // Vérifier si la fusée est posée
                    if (this.isRocketLanded(rocketModel, celestialBodyObject)) {
                        // Mettre à jour l'état
                        rocketModel.isLanded = true;
                        rocketModel.landedOn = body.name;
                        
                        // Réinitialiser la vitesse
                        rocketModel.setVelocity(0, 0);
                        rocketModel.setAngularVelocity(0);
                        if (this.rocketBody) {
                            this.Body.setVelocity(this.rocketBody, { x: 0, y: 0 });
                            this.Body.setAngularVelocity(this.rocketBody, 0);
                        }
                        
                        console.log(`État d'atterrissage détecté lors de la vérification périodique sur ${body.name}`);
                    }
                }
            }
        }
    }

    // Stocker la référence vers GameController
    setGameController(gameController) {
        this.gameController = gameController;
    }
} 