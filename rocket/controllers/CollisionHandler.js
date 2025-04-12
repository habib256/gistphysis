class CollisionHandler {
    constructor(physicsController, engine, Events, Body, ROCKET, PHYSICS) {
        this.physicsController = physicsController; // Pour accéder à rocketModel, rocketBody, etc.
        this.engine = engine;
        this.Events = Events;
        this.Body = Body;
        this.ROCKET = ROCKET;
        this.PHYSICS = PHYSICS;

        this.collisionsEnabled = false;
        this.initTime = Date.now();
    }

    setupCollisionEvents() {
        // Variable locale pour stocker la référence au modèle de la fusée
        const rocketModel = this.physicsController.rocketModel;

        // Événement déclenché au début d'une collision
        this.Events.on(this.engine, 'collisionStart', (event) => {
            // Vérifier si les collisions sont actives
            if (!this.collisionsEnabled) {
                // Vérifier si le délai d'initialisation est écoulé
                if (Date.now() - this.initTime < this.PHYSICS.COLLISION_DELAY) {
                    return; // Ignorer les collisions pendant le délai d'initialisation
                } else {
                    this.collisionsEnabled = true;
                    console.log("Collisions activées après le délai d'initialisation");
                }
            }

            const pairs = event.pairs;

            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                const rocketBody = this.physicsController.rocketBody;

                // Vérifier si la fusée est impliquée dans la collision
                if (!pair.bodyA || !pair.bodyB || !rocketBody) continue; // Ignorer si un des corps ou la fusée n'existe pas

                if (pair.bodyA === rocketBody || pair.bodyB === rocketBody) {
                    const otherBody = pair.bodyA === rocketBody ? pair.bodyB : pair.bodyA;

                    if (!otherBody) continue; // Vérification supplémentaire

                    // Calculer la vitesse d'impact
                    const relVelX = rocketBody.velocity.x - (otherBody.isStatic ? 0 : otherBody.velocity.x);
                    const relVelY = rocketBody.velocity.y - (otherBody.isStatic ? 0 : otherBody.velocity.y);
                    const impactVelocity = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
                    const COLLISION_THRESHOLD = 2.5; // m/s

                    // Détecter un atterrissage en douceur (vitesse faible)
                    if (otherBody.label !== 'rocket' && this.isRocketLanded(rocketModel, otherBody)) {
                        rocketModel.isLanded = true;
                        rocketModel.landedOn = otherBody.label; // Indiquer le corps sur lequel on a atterri

                        const angleToBody = Math.atan2(
                            rocketModel.position.y - otherBody.position.y,
                            rocketModel.position.x - otherBody.position.x
                        );
                        const correctAngle = angleToBody + Math.PI/2;
                        rocketModel.angle = correctAngle;
                        this.Body.setAngle(rocketBody, correctAngle);

                        rocketModel.setVelocity(0, 0);
                        rocketModel.setAngularVelocity(0);
                        // La synchro est gérée par SynchronizationManager
                        this.physicsController.synchronizationManager.syncPhysicsWithModel(rocketModel);

                        console.log(`Atterrissage réussi sur ${otherBody.label}`);
                    } else {
                        // Collision normale
                        const impactDamage = impactVelocity * this.PHYSICS.IMPACT_DAMAGE_FACTOR;

                        if (otherBody.label !== 'rocket' && impactVelocity > COLLISION_THRESHOLD) {
                            if (!rocketModel.isDestroyed) {
                                rocketModel.landedOn = otherBody.label;
                                rocketModel.applyDamage(impactDamage);
                                this.playCollisionSound(impactVelocity);
                                console.log(`Collision IMPORTANTE avec ${otherBody.label}: Vitesse d'impact=${impactVelocity.toFixed(2)}, Dégâts=${impactDamage.toFixed(2)}`);
                            }
                        } else if (otherBody.label !== 'rocket') {
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
            const rocketBody = this.physicsController.rocketBody;

            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];

                if (!pair.bodyA || !pair.bodyB || !rocketBody) continue;

                if (pair.bodyA === rocketBody || pair.bodyB === rocketBody) {
                    const otherBody = pair.bodyA === rocketBody ? pair.bodyB : pair.bodyA;

                    if (otherBody.label !== 'rocket') {
                        if (!rocketModel.isLanded && this.isRocketLanded(rocketModel, otherBody)) {
                            rocketModel.isLanded = true;
                            rocketModel.landedOn = otherBody.label;
                            console.log(`Fusée posée sur ${otherBody.label}`);
                            rocketModel.setVelocity(0, 0);
                            rocketModel.setAngularVelocity(0);
                            this.Body.setVelocity(rocketBody, { x: 0, y: 0 });
                            this.Body.setAngularVelocity(rocketBody, 0);
                        }

                        // Stabilisation au sol (déplacée dans SynchronizationManager ou ThrusterPhysics?)
                        // ...

                        // Décollage (déplacé dans ThrusterPhysics?)
                        // ...
                    }
                }
            }
        });

        // Événement de fin de collision
        this.Events.on(this.engine, 'collisionEnd', (event) => {
            const pairs = event.pairs;
            const rocketBody = this.physicsController.rocketBody;

            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                if (!pair.bodyA || !pair.bodyB || !rocketBody) continue;

                if (pair.bodyA === rocketBody || pair.bodyB === rocketBody) {
                    const otherBody = pair.bodyA === rocketBody ? pair.bodyB : pair.bodyA;
                    if ((otherBody.label !== 'rocket') && rocketModel.isLanded) {
                         // Vérifier avec une méthode plus robuste si on est *vraiment* plus posé
                         // Peut-être appeler isRocketLanded ici aussi?
                         // Pour l'instant, on garde la logique simple:
                         // Si on était posé et qu'on quitte le contact, on n'est plus posé.
                         // La vérification périodique dans SynchronizationManager peut confirmer.
                         //if (!this.isRocketLanded(rocketModel, otherBody)) { // Logique plus complexe potentielle
                            rocketModel.isLanded = false;
                            rocketModel.landedOn = null;
                            console.log(`Décollage de ${otherBody.label} détecté par collisionEnd`);
                        //}
                    }
                }
            }
        });
    }

    playCollisionSound(impactVelocity) {
        if (this.physicsController.rocketModel && this.physicsController.rocketModel.isDestroyed) {
            return;
        }
        try {
            const collisionSound = new Audio('assets/sound/collision.mp3');
            const maxVolume = 1.0;
            const minVolume = 0.3;
            const volumeScale = Math.min((impactVelocity - 2.5) / 10, 1); // Normaliser entre 0 et 1
            collisionSound.volume = minVolume + volumeScale * (maxVolume - minVolume);
            collisionSound.play().catch(error => {
                console.error("Erreur lors de la lecture du son de collision:", error);
            });
        } catch (error) {
            console.error("Erreur lors de la lecture du fichier collision.mp3:", error);
        }
    }

    // Note: otherBody ici peut être le corps physique ou un objet modèle simulé
    isRocketLanded(rocketModel, otherBody) {
        const rocketBody = this.physicsController.rocketBody;
        if (!rocketBody || !otherBody || !otherBody.position || otherBody.circleRadius === undefined) return false;

        if (rocketModel.isLanded && rocketModel.landedOn === otherBody.label) {
            // Pour éviter des changements d'état rapides, si on est déjà posé,
            // on le reste sauf si une condition claire de décollage est remplie (ex: poussée).
            // La vérification périodique gèrera les cas limites.
            return true;
        }

        const rocketX = rocketBody.position.x;
        const rocketY = rocketBody.position.y;
        const bodyX = otherBody.position.x;
        const bodyY = otherBody.position.y;
        const dx = rocketX - bodyX;
        const dy = rocketY - bodyY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const surfaceAngle = Math.atan2(dy, dx);

        // Utiliser otherBody.circleRadius (corps physique) ou otherBody.radius (modèle)
        const bodyRadius = otherBody.circleRadius ?? otherBody.radius;
        // Utiliser this.ROCKET.HEIGHT / 2 comme approximation du rayon de la fusée?
        const rocketEffectiveRadius = (this.ROCKET.HEIGHT / 2) * 0.8; // Ajuster si nécessaire
        const distanceToSurface = distance - bodyRadius - rocketEffectiveRadius;

        const rocketOrientation = rocketBody.angle % (Math.PI * 2);
        const correctOrientation = surfaceAngle + Math.PI/2;
        let angleDiff = Math.abs(rocketOrientation - correctOrientation);
        if (angleDiff > Math.PI) {
            angleDiff = Math.PI * 2 - angleDiff;
        }
        const isCorrectlyOriented = angleDiff < Math.PI/6; // Moins de 30 degrés

        const validDistanceToSurface = isNaN(distanceToSurface) ? 0 : distanceToSurface;
        const proximityThreshold = 30; // Seuil de proximité standard
        const isCloseToSurface = Math.abs(validDistanceToSurface) < proximityThreshold;

        const velocity = rocketBody.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const velocityThreshold = 1.0; // Seuil de vitesse standard
        const hasLowVelocity = speed < velocityThreshold;

        const angularVelocity = Math.abs(rocketBody.angularVelocity);
        const hasLowAngularVelocity = angularVelocity < 0.1; // Seuil standard

        // Détection de crash
        const isLyingDown = (angleDiff > Math.PI/3) && isCloseToSurface && hasLowVelocity && hasLowAngularVelocity;
        const isBadAngle = angleDiff > Math.PI/4;
        const isMovingFast = speed > 1.0;
        const isRotatingFast = angularVelocity > 0.2;
        const isRollingOrTumbling = isCloseToSurface && isBadAngle && (isMovingFast || isRotatingFast);
        const isUpsideDown = angleDiff > Math.PI/2;

        if ((isLyingDown || isRollingOrTumbling || isUpsideDown) && !rocketModel.isDestroyed) {
            console.log(`Crash détecté sur ${otherBody.label}! ${isLyingDown ? 'Fusée couchée' : isRollingOrTumbling ? 'Fusée en mouvement anormal' : 'Fusée à l\'envers'}`);
            console.log(`Vitesse: ${speed.toFixed(2)}, Rotation: ${angularVelocity.toFixed(2)}, Angle: ${(angleDiff * 180 / Math.PI).toFixed(2)}°`);
            rocketModel.landedOn = otherBody.label;
            rocketModel.applyDamage(100); // Détruire la fusée
            return false; // Crashé, pas posé
        }

        // Condition d'atterrissage
        return isCorrectlyOriented && isCloseToSurface && hasLowVelocity && hasLowAngularVelocity;
    }
} 