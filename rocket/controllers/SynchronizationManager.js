class SynchronizationManager {
    constructor(physicsController, Body, ROCKET, PHYSICS) {
        this.physicsController = physicsController; // Pour accéder à rocketBody, celestialBodies, etc.
        this.Body = Body;
        this.ROCKET = ROCKET;
        this.PHYSICS = PHYSICS;
        this._lastLandedCheck = null;
    }

    // Synchronise le modèle logique avec les données du corps physique
    syncModelWithPhysics(rocketModel) {
        const rocketBody = this.physicsController.rocketBody;
        if (!rocketBody || !rocketModel) return;

        rocketModel.position.x = rocketBody.position.x;
        rocketModel.position.y = rocketBody.position.y;
        rocketModel.angle = rocketBody.angle;
        rocketModel.velocity.x = rocketBody.velocity.x;
        rocketModel.velocity.y = rocketBody.velocity.y;
        rocketModel.angularVelocity = rocketBody.angularVelocity;
    }

    // Synchronise le corps physique avec les données du modèle logique
    syncPhysicsWithModel(rocketModel) {
        const rocketBody = this.physicsController.rocketBody;
        if (!rocketBody || !rocketModel) return;

        this.Body.setPosition(rocketBody, {
            x: rocketModel.position.x,
            y: rocketModel.position.y
        });
        this.Body.setAngle(rocketBody, rocketModel.angle);
        this.Body.setVelocity(rocketBody, {
            x: rocketModel.velocity.x,
            y: rocketModel.velocity.y
        });
        this.Body.setAngularVelocity(rocketBody, rocketModel.angularVelocity);
    }

    // Met à jour la position des corps physiques statiques (lunes) pour correspondre à leur modèle
    syncMovingBodyPositions() {
        const celestialBodies = this.physicsController.celestialBodies; // Accès via physicsController
        for (const celestialInfo of celestialBodies) {
            // Vérifier si le modèle est mobile (ex: a une méthode updateOrbit)
            if (celestialInfo.model && typeof celestialInfo.model.updateOrbit === 'function') {
                 // La mise à jour de la position du *modèle* (ex: celestialInfo.model.updateOrbit(deltaTime))
                 // est supposée avoir été faite ailleurs (dans GameController ou UniverseModel)

                // Mettre à jour la position du corps physique
                if (celestialInfo.body) {
                    this.Body.setPosition(celestialInfo.body, {
                        x: celestialInfo.model.position.x,
                        y: celestialInfo.model.position.y
                    });
                    // Optionnel: Synchroniser la vitesse si elle est calculée dans le modèle
                    // if (celestialInfo.model.velocity) {
                    //     this.Body.setVelocity(celestialInfo.body, celestialInfo.model.velocity);
                    // }
                }
            }
        }
    }

    // Gère la position et l'orientation de la fusée lorsqu'elle est posée ou attachée
    handleLandedOrAttachedRocket(rocketModel) {
        const rocketBody = this.physicsController.rocketBody;
        const celestialBodies = this.physicsController.celestialBodies;
        const thrusterPhysics = this.physicsController.thrusterPhysics; // Besoin pour vérifier la poussée

        if (!rocketBody || !rocketModel) return;

        // CAS 1: Fusée posée sur un corps (potentiellement mobile)
        if (rocketModel.isLanded && rocketModel.landedOn) {
            const landedOnInfo = celestialBodies.find(cb => cb.model.name === rocketModel.landedOn);
            const landedOnModel = landedOnInfo ? landedOnInfo.model : null;

            if (landedOnModel) {
                const isMobile = typeof landedOnModel.updateOrbit === 'function';

                // Si posé sur un corps mobile, maintenir la position relative
                if (isMobile) {
                    if (!rocketModel.relativePosition) {
                        // Recalculer l'angle correct au moment de l'atterrissage si pas déjà fait
                        const angleToBody = Math.atan2(
                            rocketModel.position.y - landedOnModel.position.y,
                            rocketModel.position.x - landedOnModel.position.x
                        );
                        const correctAngle = angleToBody + Math.PI/2;
                        rocketModel.angle = correctAngle;
                        this.Body.setAngle(rocketBody, correctAngle);
                        this.Body.setAngularVelocity(rocketBody, 0);

                        rocketModel.updateRelativePosition(landedOnModel);
                        // Ne pas synchroniser la position absolue immédiatement, attendre la prochaine frame
                         return; // Sortir pour cette frame
                    }
                    // Mettre à jour la position absolue à partir de la position relative
                    rocketModel.updateAbsolutePosition(landedOnModel);
                    // Synchroniser le corps physique avec la nouvelle position absolue
                    this.Body.setPosition(rocketBody, rocketModel.position);
                }

                // Stabilisation : maintenir l'orientation et arrêter le mouvement si pas de poussée
                // Vérifier si le propulseur principal est actif (via rocketModel ou ThrusterPhysics?)
                 const mainThrusterPower = rocketModel.thrusters.main.power;
                 const isTryingToLiftOff = mainThrusterPower > 50;

                if (!isTryingToLiftOff) {
                    // Forcer la vitesse à zéro
                    this.Body.setVelocity(rocketBody, { x: 0, y: 0 });
                    this.Body.setAngularVelocity(rocketBody, 0);

                    // Maintenir l'orientation perpendiculaire
                    const angleToBody = Math.atan2(
                        rocketModel.position.y - landedOnModel.position.y,
                        rocketModel.position.x - landedOnModel.position.x
                    );
                    const correctAngle = angleToBody + Math.PI/2;
                    // Appliquer doucement pour éviter des sauts brusques?
                    // Ou forcer comme actuellement:
                    this.Body.setAngle(rocketBody, correctAngle);
                    // Mettre à jour l'angle du modèle aussi pour la cohérence
                    rocketModel.angle = correctAngle;
                } else {
                     // La logique de décollage (handleLiftoff) est dans ThrusterPhysics
                     // et est déclenchée par applyThrusterForce.
                     // On s'assure ici que l'état isLanded est bien mis à false
                     // si ThrusterPhysics a initié le décollage.
                     // (Normalement déjà fait dans handleLiftoff)
                     // if (rocketModel.isLanded) {
                     //     rocketModel.isLanded = false;
                     //     rocketModel.landedOn = null;
                     // }
                }
            }
        }
        // CAS 2: Fusée détruite et attachée à un corps mobile
        else if (rocketModel.isDestroyed && rocketModel.attachedTo) {
            const attachedToInfo = celestialBodies.find(cb => cb.model.name === rocketModel.attachedTo);
            const attachedToModel = attachedToInfo ? attachedToInfo.model : null;

            if (attachedToModel && typeof attachedToModel.updateOrbit === 'function') {
                if (!rocketModel.relativePosition) {
                    rocketModel.updateRelativePosition(attachedToModel);
                    console.log(`Position relative des débris sur ${rocketModel.attachedTo} calculée.`);
                }
                rocketModel.updateAbsolutePosition(attachedToModel);

                // Mettre à jour la position et l'angle du corps physique (débris)
                this.Body.setPosition(rocketBody, rocketModel.position);
                this.Body.setAngle(rocketBody, rocketModel.angle);
                 // Les débris ne devraient pas avoir de vélocité propre une fois attachés
                this.Body.setVelocity(rocketBody, { x: 0, y: 0 });
                this.Body.setAngularVelocity(rocketBody, 0);
            }
        }
    }

    // Vérifier périodiquement l'état d'atterrissage de la fusée
    checkRocketLandedStatusPeriodically(rocketModel, universeModel) {
        // Ne vérifier que toutes les ~100ms et si la fusée n'est pas détruite
        if (rocketModel.isDestroyed || (this._lastLandedCheck && Date.now() - this._lastLandedCheck < 100)) {
            return;
        }
        this._lastLandedCheck = Date.now();

        const rocketBody = this.physicsController.rocketBody;
        const collisionHandler = this.physicsController.collisionHandler; // Besoin pour isRocketLanded
        if (!rocketBody || !collisionHandler || !universeModel || !universeModel.celestialBodies) return;

        let newlyLanded = false;
        let stillLandedOn = null;

        for (const bodyModel of universeModel.celestialBodies) {
            // Créer un objet simulé pour isRocketLanded si le corps physique n'est pas directement accessible
            // ou utiliser le body physique s'il est dans this.physicsController.celestialBodies?
            // Pour l'instant, utilisons le modèle qui a les infos nécessaires (pos, radius, label)
            const bodyToCheck = {
                 position: bodyModel.position,
                 radius: bodyModel.radius,
                 label: bodyModel.name,
                 // On simule circleRadius pour la méthode isRocketLanded
                 // Attention: ceci suppose que bodyModel.radius est le rayon physique
                 circleRadius: bodyModel.radius
            };

            // Calculer la distance pour un test rapide
            const dx = bodyToCheck.position.x - rocketModel.position.x;
            const dy = bodyToCheck.position.y - rocketModel.position.y;
            const distanceSquared = dx * dx + dy * dy;
            // Seuil basé sur le rayon du corps + hauteur fusée + marge
            const checkRadius = bodyToCheck.radius + this.ROCKET.HEIGHT * 1.5;
            const maxDistanceCheckSq = checkRadius * checkRadius;

            // Ne vérifier que si la fusée est assez proche
            if (distanceSquared <= maxDistanceCheckSq) {
                if (collisionHandler.isRocketLanded(rocketModel, bodyToCheck)) {
                    // Si on détecte un atterrissage sur ce corps
                    if (!rocketModel.isLanded) {
                        // Si on n'était pas déjà posé -> Nouvel atterrissage
                        rocketModel.isLanded = true;
                        rocketModel.landedOn = bodyToCheck.label;
                        newlyLanded = true;
                        console.log(`État d'atterrissage détecté (périodique) sur ${bodyToCheck.label}`);
                        // Réinitialiser vitesse/rotation
                        rocketModel.setVelocity(0, 0);
                        rocketModel.setAngularVelocity(0);
                        this.Body.setVelocity(rocketBody, { x: 0, y: 0 });
                        this.Body.setAngularVelocity(rocketBody, 0);
                        // Important: Recalculer la position relative si mobile
                        const landedOnInfo = this.physicsController.celestialBodies.find(cb => cb.model.name === bodyToCheck.label);
                        if (landedOnInfo && typeof landedOnInfo.model.updateOrbit === 'function'){
                            rocketModel.relativePosition = null; // Forcer le recalcul
                            this.handleLandedOrAttachedRocket(rocketModel); // Recalcul immédiat
                        }
                        break; // Sortir de la boucle, on a trouvé notre corps d'atterrissage
                    } else if (rocketModel.landedOn === bodyToCheck.label) {
                        // Si on était déjà posé sur CE corps, confirmer qu'on l'est toujours
                        stillLandedOn = bodyToCheck.label;
                        break; // Pas besoin de vérifier les autres
                    }
                }
            }
        }

        // Si on était posé, mais qu'on n'a confirmé être posé sur AUCUN corps proche
        if (rocketModel.isLanded && !newlyLanded && !stillLandedOn) {
            // Vérifier si la raison n'est pas un décollage actif
            if (rocketModel.thrusters.main.power <= 50) {
                console.log(`État de décollage détecté (périodique) de ${rocketModel.landedOn}`);
                rocketModel.isLanded = false;
                rocketModel.landedOn = null;
                rocketModel.relativePosition = null;
            }
        }
    }
} 