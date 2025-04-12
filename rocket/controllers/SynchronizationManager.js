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

    // Met à jour la position des corps physiques (y compris ceux qui orbitent/tournent) pour correspondre à leur modèle
    syncMovingBodyPositions() {
        const celestialBodies = this.physicsController.celestialBodies; // Accès via physicsController
        for (const celestialInfo of celestialBodies) {
            // Synchroniser si le modèle et le corps physique existent et le modèle a une position
            if (celestialInfo.model && celestialInfo.model.position && celestialInfo.body) {
                // La mise à jour de la position du *modèle* (ex: celestialInfo.model.updateMoon(deltaTime))
                // est supposée avoir été faite ailleurs (dans GameController ou UniverseModel)

                // Mettre à jour la position du corps physique pour correspondre au modèle
                this.Body.setPosition(celestialInfo.body, {
                    x: celestialInfo.model.position.x,
                    y: celestialInfo.model.position.y
                });
                
                // Optionnel: Synchroniser l'angle si le modèle en a un (pour rotation)
                if (typeof celestialInfo.model.angle === 'number') {
                    this.Body.setAngle(celestialInfo.body, celestialInfo.model.angle);
                }
                
                // Optionnel: Synchroniser la vitesse si elle est calculée dans le modèle
                // if (celestialInfo.model.velocity) {
                //     this.Body.setVelocity(celestialInfo.body, celestialInfo.model.velocity);
                // }
            }
        }
    }

    // Gère la position et l'orientation de la fusée lorsqu'elle est posée ou attachée
    handleLandedOrAttachedRocket(rocketModel) {
        const rocketBody = this.physicsController.rocketBody;
        const celestialBodies = this.physicsController.celestialBodies;

        if (!rocketBody || !rocketModel) return;

        // CAS 1: Fusée posée sur un corps
        if (rocketModel.isLanded && rocketModel.landedOn) {
            const landedOnInfo = celestialBodies.find(cb => cb.model.name === rocketModel.landedOn);
            const landedOnModel = landedOnInfo ? landedOnInfo.model : null;

            if (landedOnModel) {
                const mainThrusterPower = rocketModel.thrusters.main.power;
                // Définir un seuil clair pour le décollage
                const TAKEOFF_THRUST_THRESHOLD = 50; // Ex: 50% de puissance
                const isTryingToLiftOff = mainThrusterPower > TAKEOFF_THRUST_THRESHOLD;

                if (isTryingToLiftOff) {
                    // --- TENTATIVE DE DÉCOLLAGE ---
                    console.log(`Tentative de décollage de ${rocketModel.landedOn} détectée (Poussée: ${mainThrusterPower.toFixed(0)}%)`);
                    rocketModel.isLanded = false;
                    rocketModel.landedOn = null;
                    rocketModel.relativePosition = null; // Important pour arrêter le suivi de position
                    // L'impulsion de décollage sera gérée par ThrusterPhysics lors de l'application de la poussée
                } else {
                    // --- STABILISATION ACTIVE (Pas de tentative de décollage) ---
                    // Détecter si le corps est mobile (orbite OU rotation)
                    const isMobile = typeof landedOnModel.updateOrbit === 'function' || typeof landedOnModel.rotationAngle === 'number';

                    // 1. Forcer les vitesses à zéro (Physique)
                    this.Body.setVelocity(rocketBody, { x: 0, y: 0 });
                    this.Body.setAngularVelocity(rocketBody, 0);

                    // 2. Calculer et forcer l'angle correct par rapport à la surface (Physique ET Modèle)
                    //    Utiliser la position PHYSIQUE actuelle pour le calcul de l'angle, car c'est elle qu'on stabilise.
                    const angleToBody = Math.atan2(
                        rocketBody.position.y - landedOnModel.position.y, // Utiliser la position physique pour le calcul de l'angle
                        rocketBody.position.x - landedOnModel.position.x
                    );
                    const correctAngle = angleToBody + Math.PI / 2; // Perpendiculaire à la surface
                    this.Body.setAngle(rocketBody, correctAngle);
                    rocketModel.angle = correctAngle; // Synchro modèle immédiate pour cohérence

                    // 3. Gérer la position (Physique)
                    if (isMobile) {
                        // Corps mobile: Suivre la position du corps parent
                        if (!rocketModel.relativePosition) {
                            // Première frame posée sur mobile OU après un recalcul: calculer relative.
                            rocketModel.updateRelativePosition(landedOnModel);
                            console.log(`Position relative sur ${landedOnModel.name} calculée/recalculée.`);
                        }
                        // Mettre à jour la position absolue du modèle EN PREMIER
                        rocketModel.updateAbsolutePosition(landedOnModel);
                        // Puis forcer la position PHYSIQUE à correspondre au modèle
                        this.Body.setPosition(rocketBody, rocketModel.position);

                    } else {
                        // Corps statique (Terre ou autre): Maintenir la position où l'atterrissage s'est produit.
                        // La position physique ne devrait pas changer si les vitesses sont nulles.
                        // On peut s'assurer que la position du modèle correspond à la physique actuelle.
                        rocketModel.position.x = rocketBody.position.x;
                        rocketModel.position.y = rocketBody.position.y;
                        // Pas besoin de recalculer la position relative pour les corps statiques une fois posé.
                        if (!rocketModel.relativePosition) {
                           // Stocker la position absolue au moment de l'atterrissage si nécessaire
                           rocketModel.updateRelativePosition(landedOnModel);
                        }
                    }
                    // Forcer la synchro du modèle avec la physique stabilisée (surtout pour vitesse/angle)
                    this.syncModelWithPhysics(rocketModel);
                } // Fin else (Stabilisation active)

            } else {
                 // Cas où landedOn est défini mais le corps n'est pas trouvé (ne devrait pas arriver)
                 console.warn(`Corps ${rocketModel.landedOn} non trouvé pour la stabilisation.`);
                 rocketModel.isLanded = false; // Forcer le décollage pour éviter blocage
                 rocketModel.landedOn = null;
                 rocketModel.relativePosition = null;
            }
        } // fin if(rocketModel.isLanded)

        // CAS 2: Fusée détruite et attachée (logique existante semble correcte)
        else if (rocketModel.isDestroyed && rocketModel.attachedTo) {
            const attachedToInfo = celestialBodies.find(cb => cb.model.name === rocketModel.attachedTo);
            const attachedToModel = attachedToInfo ? attachedToInfo.model : null;

            // Vérifier si le corps est mobile (orbite OU rotation)
            const isAttachedToMobile = attachedToModel && (typeof attachedToModel.updateOrbit === 'function' || typeof attachedToModel.rotationAngle === 'number');

            if (isAttachedToMobile) {
                // Calculer la position relative si pas encore fait
                if (!rocketModel.relativePosition) {
                    // Utiliser l'angle actuel des débris pour calculer la position relative initiale
                    rocketModel.updateRelativePosition(attachedToModel);
                    console.log(`Position relative initiale des débris sur ${rocketModel.attachedTo} calculée.`);
                }

                // Mettre à jour la position absolue des débris
                rocketModel.updateAbsolutePosition(attachedToModel);

                // Mettre à jour la position ET l'angle du corps physique des débris
                this.Body.setPosition(rocketBody, rocketModel.position);
                this.Body.setAngle(rocketBody, rocketModel.angle);

                // Les débris attachés ne bougent pas par eux-mêmes
                this.Body.setVelocity(rocketBody, { x: 0, y: 0 });
                this.Body.setAngularVelocity(rocketBody, 0);

                 // Synchroniser le modèle une dernière fois pour être sûr
                 this.syncModelWithPhysics(rocketModel);
            } else if (attachedToModel) {
                 // Attaché à un corps statique: juste s'assurer que la physique ne bouge pas
                 this.Body.setVelocity(rocketBody, { x: 0, y: 0 });
                 this.Body.setAngularVelocity(rocketBody, 0);
                 // S'assurer que la position physique correspond au modèle (qui ne devrait pas changer)
                 this.Body.setPosition(rocketBody, rocketModel.position);
                 this.Body.setAngle(rocketBody, rocketModel.angle);
            }
        } // fin if(rocketModel.isDestroyed)
    }

    // Vérifier périodiquement l'état d'atterrissage de la fusée
    checkRocketLandedStatusPeriodically(rocketModel, universeModel) {
        // Ne vérifier que toutes les ~100ms et si la fusée n'est pas détruite
        // Augmenter légèrement le délai pour éviter les vérifications trop fréquentes
        if (rocketModel.isDestroyed || (this._lastLandedCheck && Date.now() - this._lastLandedCheck < 150)) {
            return;
        }
        this._lastLandedCheck = Date.now();

        const rocketBody = this.physicsController.rocketBody;
        const collisionHandler = this.physicsController.collisionHandler; // Besoin pour isRocketLanded
        if (!rocketBody || !collisionHandler || !universeModel || !universeModel.celestialBodies) return;

        let isNowConsideredLanded = false;
        let currentLandedOnBody = null;

        for (const bodyModel of universeModel.celestialBodies) {
            // Créer un objet simulé pour isRocketLanded
            const bodyToCheck = {
                 position: bodyModel.position,
                 radius: bodyModel.radius,
                 label: bodyModel.name,
                 circleRadius: bodyModel.radius // Simuler pour la fonction
            };

            // Calculer la distance pour un test rapide
            const dx = bodyToCheck.position.x - rocketModel.position.x; // Utiliser la position du modèle de fusée ici
            const dy = bodyToCheck.position.y - rocketModel.position.y;
            const distanceSquared = dx * dx + dy * dy;
            const checkRadius = bodyToCheck.radius + this.ROCKET.HEIGHT * 1.5; // Marge suffisante
            const maxDistanceCheckSq = checkRadius * checkRadius;

            if (distanceSquared <= maxDistanceCheckSq) {
                // Utiliser la méthode isRocketLanded de CollisionHandler
                if (collisionHandler.isRocketLanded(rocketModel, bodyToCheck)) {
                     isNowConsideredLanded = true;
                     currentLandedOnBody = bodyToCheck.label;
                     break; // Trouvé un corps sur lequel on est posé
                }
            }
        }

        // --- MISE À JOUR DE L'ÉTAT ---

        // CAS 1: Actuellement posé (selon le modèle)
        if (rocketModel.isLanded) {
            // Si la vérification montre qu'on n'est PLUS posé sur AUCUN corps
            if (!isNowConsideredLanded) {
                 // Vérifier si ce n'est pas dû à une tentative de décollage en cours
                 if (rocketModel.thrusters.main.power <= 50) {
                     console.log(`État de décollage confirmé (périodique) de ${rocketModel.landedOn}`);
                     rocketModel.isLanded = false;
                     rocketModel.landedOn = null;
                     rocketModel.relativePosition = null;
                 } else {
                     // Décollage en cours, l'état a probablement déjà été mis à jour par handleLanded...
                     // Ne rien faire ici pour éviter conflit.
                 }
            // Si la vérification montre qu'on est posé, mais sur un AUTRE corps (très improbable, mais gérons le cas)
            } else if (currentLandedOnBody !== rocketModel.landedOn) {
                 console.warn(`Changement de corps d'atterrissage détecté (périodique): ${rocketModel.landedOn} -> ${currentLandedOnBody}`);
                 rocketModel.landedOn = currentLandedOnBody;
                 rocketModel.relativePosition = null; // Recalculer la position relative
                 // Déclencher la stabilisation immédiate peut être utile ici
                 this.handleLandedOrAttachedRocket(rocketModel);
            }
            // Si on est posé et la vérification confirme le même corps, ne rien faire.

        // CAS 2: Actuellement PAS posé (selon le modèle)
        } else {
            // Si la vérification montre qu'on EST maintenant posé
            if (isNowConsideredLanded) {
                 console.log(`État d'atterrissage détecté (périodique) sur ${currentLandedOnBody}`);
                 rocketModel.isLanded = true;
                 rocketModel.landedOn = currentLandedOnBody;
                 rocketModel.relativePosition = null; // Calculer la position relative
                 // Appeler handleLandedOrAttachedRocket pour appliquer la stabilisation immédiatement
                 this.handleLandedOrAttachedRocket(rocketModel);
                 // Forcer les vitesses à zéro immédiatement dans le modèle aussi pour cohérence
                 rocketModel.setVelocity(0, 0);
                 rocketModel.setAngularVelocity(0);
            }
            // Si on n'était pas posé et la vérification confirme, ne rien faire.
        }
    }
} 