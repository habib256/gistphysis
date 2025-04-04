class PhysicsController {
    constructor() {
        // Récupérer les modules Matter.js
        this.Engine = Matter.Engine;
        this.Render = Matter.Render;
        this.Runner = Matter.Runner;
        this.Bodies = Matter.Bodies;
        this.Body = Matter.Body;
        this.Composite = Matter.Composite;
        this.Vector = Matter.Vector;
        this.Events = Matter.Events;
        
        // Toujours utiliser Matter Attractors
        console.log("Utilisation de Matter Attractors: OUI");
        
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
        this.rocketModel = null;
        
        // Conserver les paramètres supplémentaires
        this.timeScale = 1.0;
        this.gravitationalConstant = PHYSICS.G;
        this.collisionDamping = PHYSICS.COLLISION_DAMPING;
        
        // Visualisation des forces (pour le débogage)
        this.showForces = false;
        this.thrustForces = {
            main: { x: 0, y: 0 },
            rear: { x: 0, y: 0 },
            left: { x: 0, y: 0 },
            right: { x: 0, y: 0 }
        };
        this.gravityForce = { x: 0, y: 0 }; // Pour visualiser la force gravitationnelle
    }
    
    // Initialiser les objets physiques
    initPhysics(rocketModel, universeModel) {
        console.log("Initialisation du moteur physique Matter.js avec Matter Attractors");
        
        // Vider le monde physique
        this.Composite.clear(this.engine.world);
        this.celestialBodies = [];
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
                    angularDamping: 0.2, // Ajouter de l'amortissement angulaire pour arrêter la rotation
                    sleepThreshold: -1, // Désactiver le repos pour le corps de la fusée
                    collisionFilter: {
                        category: 0x0001,
                        mask: 0xFFFFFFFF
                    },
                    // Configurer la fusée comme un attracteur également
                    plugin: {
                        attractors: [
                            // Utiliser directement la fonction de gravité de Matter Attractors
                            MatterAttractors.Attractors.gravity
                        ]
                    }
                }
            );
            
            // Définir explicitement les propriétés de vélocité initiales
            if (this.rocketBody) {
                this.Body.setVelocity(this.rocketBody, { 
                    x: rocketModel.velocity.x, 
                    y: rocketModel.velocity.y 
                });
                this.Body.setAngularVelocity(this.rocketBody, rocketModel.angularVelocity);
                console.log("Fusée configurée comme attracteur gravitationnel");
            }
            
            // Ajouter la fusée au monde
            if (this.rocketBody) {
                this.Composite.add(this.engine.world, this.rocketBody);
                console.log("Corps physique de la fusée créé et ajouté au monde");
            } else {
                console.error("Échec de la création du corps physique de la fusée");
            }
            
            // Créer les corps célestes
            for (const body of universeModel.celestialBodies) {
                // Options de base pour le corps céleste
                const options = {
                    mass: body.mass,
                    isStatic: true, // Les corps célestes ne bougent pas dans cette simplification
                    label: body.name,
                    collisionFilter: {
                        category: 0x0002,
                        mask: 0x0001
                    },
                    restitution: PHYSICS.RESTITUTION,
                    friction: 0.05
                };
                
                // Ajouter les propriétés d'attracteur spécifiquement pour la Terre
                if (body.name === 'Terre') {
                    // Configurer l'attracteur en utilisant directement la fonction du plugin pour la Terre
                    options.plugin = {
                        attractors: [
                            // Utiliser directement la fonction de gravité de Matter Attractors
                            MatterAttractors.Attractors.gravity
                        ]
                    };
                    console.log("Terre configurée comme attracteur gravitationnel");
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
                    this.celestialBodies.push({
                        body: celestialBody,
                        model: body
                    });
                    console.log(`Corps physique de ${body.name} créé et ajouté au monde${body.name === 'Terre' ? ' avec attraction gravitationnelle' : ''}`);
                }
            }
            
            // Configuration pour visualiser la force gravitationnelle
            Matter.Events.on(this.engine, 'beforeUpdate', () => {
                // Réinitialiser la force gravitationnelle
                this.gravityForce = { x: 0, y: 0 };
                
                // Si la fusée est présente, calculer la force gravitationnelle totale pour la visualisation
                if (this.rocketBody) {
                    for (let i = 0; i < this.celestialBodies.length; i++) {
                        const celestialBody = this.celestialBodies[i].body;
                        // Ne calculer que si c'est la Terre (seul corps avec attraction)
                        if (celestialBody.label === 'Terre') {
                            // Calculer le vecteur pour la visualisation
                            const dx = celestialBody.position.x - this.rocketBody.position.x;
                            const dy = celestialBody.position.y - this.rocketBody.position.y;
                            const distanceSq = dx * dx + dy * dy;
                            const distance = Math.sqrt(distanceSq);
                            const forceMagnitude = this.gravitationalConstant * celestialBody.mass * this.rocketBody.mass / distanceSq;
                            
                            this.gravityForce.x = forceMagnitude * (dx / distance);
                            this.gravityForce.y = forceMagnitude * (dy / distance);
                        }
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
        // Événement déclenché au début d'une collision
        this.Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                
                // Vérifier si la fusée est impliquée dans la collision
                if (pair.bodyA === this.rocketBody || pair.bodyB === this.rocketBody) {
                    const rocketBody = pair.bodyA === this.rocketBody ? pair.bodyA : pair.bodyB;
                    const otherBody = pair.bodyA === this.rocketBody ? pair.bodyB : pair.bodyA;
                    
                    // Calculer la vitesse d'impact
                    const relVelX = rocketBody.velocity.x - (otherBody.isStatic ? 0 : otherBody.velocity.x);
                    const relVelY = rocketBody.velocity.y - (otherBody.isStatic ? 0 : otherBody.velocity.y);
                    
                    // Calculer la vitesse d'impact à partir du vecteur de vélocité relative et de la normale
                    const impactVelocity = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
                    
                    // Détecter un atterrissage en douceur (vitesse faible)
                    if (impactVelocity < 1.0 && otherBody.label === 'Terre') {
                        // Signaler un atterrissage
                        this.rocketModel.isLanded = true;
                        console.log("Contact avec la surface détecté, vitesse: " + impactVelocity.toFixed(2));
                    } else {
                        // Collision normale, appliquer des dégâts en fonction de la vitesse d'impact
                        const impactDamage = impactVelocity * PHYSICS.IMPACT_DAMAGE_FACTOR;
                        this.rocketModel.applyDamage(impactDamage);
                        
                        if (otherBody.label === 'Terre') {
                            console.log(`Collision avec ${otherBody.label}: Vitesse d'impact=${impactVelocity.toFixed(2)}, Dégâts=${impactDamage.toFixed(2)}`);
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
                
                // Si la fusée est impliquée et qu'elle est au sol
                if ((pair.bodyA === this.rocketBody || pair.bodyB === this.rocketBody) && this.rocketModel.isLanded) {
                    // Vérifier si un propulseur est actif
                    const mainThrusterActive = this.rocketModel.thrusters.main.power > 0;
                    
                    // Ne pas amortir les mouvements si la fusée essaie de décoller
                    if (!mainThrusterActive) {
                        // Amortir les mouvements pendant le contact avec le sol seulement si le propulseur principal n'est pas actif
                        this.Body.setVelocity(this.rocketBody, { x: 0, y: 0 });
                        this.Body.setAngularVelocity(this.rocketBody, 0);
                    } else {
                        // Si le propulseur principal est actif, forcer le décollage
                        this.rocketModel.isLanded = false;
                        
                        // Appliquer une impulsion vers le haut pour aider au décollage
                        const impulseY = -2.0;
                        this.Body.applyForce(
                            this.rocketBody,
                            this.rocketBody.position,
                            { x: 0, y: impulseY }
                        );
                        
                        console.log("Décollage forcé avec le propulseur principal");
                    }
                }
            }
        });
        
        // Événement de fin de collision
        this.Events.on(this.engine, 'collisionEnd', (event) => {
            const pairs = event.pairs;
            
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                
                // Si la fusée quitte le contact avec un corps
                if (pair.bodyA === this.rocketBody || pair.bodyB === this.rocketBody) {
                    // La fusée n'est plus posée si elle s'éloigne d'un corps
                    const otherBody = pair.bodyA === this.rocketBody ? pair.bodyB : pair.bodyA;
                    
                    if (otherBody.label === 'Terre' && this.rocketModel.isLanded) {
                        // Transition de posé à vol
                        this.rocketModel.isLanded = false;
                        console.log("Décollage détecté");
                    }
                }
            }
        });
    }
    
    // Mettre à jour la physique de la fusée
    updateRocketPhysics(rocketModel, universeModel, deltaTime) {
        // Si la fusée n'est pas initialisée, la créer
        if (!this.rocketBody) {
            this.initPhysics(rocketModel, universeModel);
        }
        
        // Si la fusée est déjà posée, vérifier si l'utilisateur essaie de décoller
        if (rocketModel.isLanded) {
            // Si le propulseur principal est activé avec assez de puissance, permettre le décollage immédiatement
            if (rocketModel.thrusters.main.power > 0) {
                // Forcer le décollage immédiat si le propulseur principal est actif
                rocketModel.isLanded = false;
                
                // Appliquer une forte impulsion vers le haut pour garantir le décollage
                if (this.rocketBody) {
                    const impulseY = -3.0; // Impulsion vers le haut considérablement augmentée
                    this.Body.applyForce(this.rocketBody, 
                        this.rocketBody.position, 
                        { x: 0, y: impulseY }
                    );
                    
                    // Ajouter une vitesse initiale vers le haut pour garantir le décollage
                    this.Body.setVelocity(this.rocketBody, { x: 0, y: -1.0 });
                    
                    // Désactiver temporairement les contraintes physiques pour permettre le décollage
                    this.Body.setStatic(this.rocketBody, false);
                }
                
                console.log("Décollage immédiat avec propulseur principal");
            }
        }
        
        // Appliquer les forces des propulseurs actifs
        this.updateThrusters(rocketModel);
        
        // Mettre à jour le moteur physique
        this.Engine.update(this.engine, deltaTime * this.timeScale);
        
        // Mettre à jour le modèle de la fusée à partir du corps physique
        // Vérifier que le corps physique existe avant de faire les mises à jour
        if (this.rocketBody) {
            rocketModel.position.x = this.rocketBody.position.x;
            rocketModel.position.y = this.rocketBody.position.y;
            rocketModel.angle = this.rocketBody.angle;
            rocketModel.velocity.x = this.rocketBody.velocity.x;
            rocketModel.velocity.y = this.rocketBody.velocity.y;
            rocketModel.angularVelocity = this.rocketBody.angularVelocity;
        }
    }
    
    // Mettre à jour et appliquer toutes les forces des propulseurs
    updateThrusters(rocketModel) {
        if (!this.rocketBody) return;
        
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
                thrustForce = PHYSICS.MAIN_THRUST * (powerPercentage / 100);
                break;
            case 'rear': 
                thrustForce = PHYSICS.REAR_THRUST * (powerPercentage / 100);
                break;
            case 'left':
            case 'right': 
                thrustForce = PHYSICS.LATERAL_THRUST * (powerPercentage / 100);
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
        
        // Pour les propulseurs latéraux, appliquer principalement une rotation
        if (thrusterName === 'left' || thrusterName === 'right') {
            // Appliquer un couple (torque) pour faire tourner la fusée
            const rotationDirection = thrusterName === 'left' ? 1 : -1; // left = sens horaire, right = sens anti-horaire
            const torque = rotationDirection * thrustForce * 0.1; // Ajuster le facteur pour contrôler la vitesse de rotation
            
            // Appliquer le couple directement
            this.Body.setAngularVelocity(this.rocketBody, this.rocketBody.angularVelocity + torque);
            
            // Stocker les forces pour la visualisation en debug (simplifié pour la visualisation)
            this.thrustForces[thrusterName] = { 
                x: Math.cos(rocketModel.angle + Math.PI/2) * thrustForce * 0.2, 
                y: Math.sin(rocketModel.angle + Math.PI/2) * thrustForce * 0.2 
            };
            
            // Afficher les informations de débogage
            console.log(`Propulseur ${thrusterName}: Couple de rotation ${torque.toFixed(2)} appliqué`);
            
            return; // Sortir après avoir appliqué la rotation
        }
        
        // Pour les propulseurs principaux (main et rear), continuer avec le code existant
        // Calculer la direction de la poussée
        let thrustAngle;
        switch (thrusterName) {
            case 'main': 
                thrustAngle = rocketModel.angle - Math.PI/2; // Poussée vers le haut (correction: inversé)
                break;
            case 'rear': 
                thrustAngle = rocketModel.angle + Math.PI/2; // Poussée vers le bas (correction: inversé)
                break;
            default:
                thrustAngle = rocketModel.angle;
        }
        
        // Calculer les composantes vectorielles de la force
        const thrustX = Math.cos(thrustAngle) * thrustForce;
        const thrustY = Math.sin(thrustAngle) * thrustForce;
        
        // Stocker les forces pour la visualisation en debug
        this.thrustForces[thrusterName] = { x: thrustX, y: thrustY };
        
        // Calculer le point d'application de la force (position du propulseur)
        const leverX = thruster.position.x;
        const leverY = thruster.position.y;
        
        // Calculer le point d'application dans les coordonnées du monde
        const offsetX = Math.cos(rocketModel.angle) * leverX - Math.sin(rocketModel.angle) * leverY;
        const offsetY = Math.sin(rocketModel.angle) * leverX + Math.cos(rocketModel.angle) * leverY;
        
        const position = {
            x: this.rocketBody.position.x + offsetX,
            y: this.rocketBody.position.y + offsetY
        };
        
        // Appliquer la force au corps physique
        this.Body.applyForce(this.rocketBody, position, { x: thrustX, y: thrustY });
        
        // Afficher les informations de débogage
        console.log(`Propulseur ${thrusterName}: Force (${thrustX.toFixed(2)}, ${thrustY.toFixed(2)}) appliquée à la position (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);
    }
    
    // Mettre à jour la physique des corps célestes
    updateCelestialBodiesPhysics(universeModel, deltaTime) {
        // Pour cette simplification, nous ne permettons pas aux corps célestes de bouger
        // Mais nous pourrions implémenter leurs mouvements si nécessaire
    }
    
    // Définir l'échelle de temps de la simulation
    setTimeScale(scale) {
        this.timeScale = Math.max(PHYSICS.TIME_SCALE_MIN, Math.min(PHYSICS.TIME_SCALE_MAX, scale));
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
        
        // Dessiner le vecteur de force gravitationnelle avec une flèche
        if (this.gravityForce && (this.gravityForce.x !== 0 || this.gravityForce.y !== 0)) {
            const gravityScale = scale * 20; // Échelle augmentée pour la gravité
            const gravityColor = '#FF00FF'; // Magenta pour la gravité (plus visible)
            
            // Calculer l'extrémité de la flèche
            const endX = rocketX + this.gravityForce.x * gravityScale * camera.zoom;
            const endY = rocketY + this.gravityForce.y * gravityScale * camera.zoom;
            
            // Dessiner la ligne de la flèche
            ctx.beginPath();
            ctx.moveTo(rocketX, rocketY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = gravityColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dessiner la pointe de la flèche
            const angle = Math.atan2(this.gravityForce.y, this.gravityForce.x);
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
            
            // Calculer la magnitude de la force gravitationnelle
            const forceMagnitude = Math.sqrt(
                this.gravityForce.x * this.gravityForce.x + 
                this.gravityForce.y * this.gravityForce.y
            );
            
            // Afficher la magnitude de la force
            ctx.font = `${12 * camera.zoom}px Arial`;
            ctx.fillStyle = gravityColor;
            ctx.fillText(
                `G: ${forceMagnitude.toFixed(1)}`,
                endX + 5 * camera.zoom,
                endY - 5 * camera.zoom
            );
        }
    }
    
    // Activer/désactiver l'affichage des forces
    toggleForceVectors() {
        this.showForces = !this.showForces;
        return this.showForces;
    }
} 