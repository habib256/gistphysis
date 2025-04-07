class RocketModel {
    constructor() {
        // Identité
        this.name = 'Rocket';
        
        // Position et mouvement
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.angle = 0;
        this.angularVelocity = 0;
        
        // Propriétés physiques
        this.mass = ROCKET.MASS;
        this.width = ROCKET.WIDTH;
        this.height = ROCKET.HEIGHT;
        this.friction = ROCKET.FRICTION;
        this.momentOfInertia = ROCKET.MASS * 1.5;
        this.radius = ROCKET.WIDTH / 2;
        
        // Propulsion
        // Les positions des propulseurs sont définies en coordonnées polaires dans constants.js
        // L'angle définit la direction depuis le centre de la fusée (0 = droite, PI/2 = bas, PI = gauche, 3PI/2 = haut)
        // La distance définit l'éloignement du propulseur par rapport au centre de la fusée
        // Ces positions influencent:
        //  1. Le point d'application des forces, ce qui affecte la rotation et la stabilité
        //  2. La direction de la poussée qui est perpendiculaire pour les propulseurs latéraux
        //  3. Le moment (couple) créé lors de l'activation des propulseurs
        this.thrusters = {
            main: {
                power: 0,
                maxPower: ROCKET.THRUSTER_POWER.MAIN,
                position: {
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.MAIN.angle) * ROCKET.THRUSTER_POSITIONS.MAIN.distance,
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.MAIN.angle) * ROCKET.THRUSTER_POSITIONS.MAIN.distance
                },
                angle: ROCKET.THRUSTER_POSITIONS.MAIN.angle
            },
            rear: {
                power: 0,
                maxPower: ROCKET.THRUSTER_POWER.REAR,
                position: {
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.REAR.angle) * ROCKET.THRUSTER_POSITIONS.REAR.distance,
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.REAR.angle) * ROCKET.THRUSTER_POSITIONS.REAR.distance
                },
                angle: ROCKET.THRUSTER_POSITIONS.REAR.angle
            },
            left: {
                power: 0,
                maxPower: ROCKET.THRUSTER_POWER.LEFT,
                position: {
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.LEFT.angle) * ROCKET.THRUSTER_POSITIONS.LEFT.distance,
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.LEFT.angle) * ROCKET.THRUSTER_POSITIONS.LEFT.distance
                },
                angle: ROCKET.THRUSTER_POSITIONS.LEFT.angle
            },
            right: {
                power: 0,
                maxPower: ROCKET.THRUSTER_POWER.RIGHT,
                position: {
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.RIGHT.angle) * ROCKET.THRUSTER_POSITIONS.RIGHT.distance,
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.RIGHT.angle) * ROCKET.THRUSTER_POSITIONS.RIGHT.distance
                },
                angle: ROCKET.THRUSTER_POSITIONS.RIGHT.angle
            }
        };
        
        // État
        this.fuel = ROCKET.FUEL_MAX;
        this.health = ROCKET.MAX_HEALTH;
        this.isDestroyed = false;
        this.isLanded = false;
        this.landedOn = null;
        
        // Position relative au corps céleste sur lequel on s'est crashé
        this.relativePosition = null; // Position par rapport au corps céleste
        this.attachedTo = null; // Référence au corps céleste auquel la fusée est attachée
    }
    
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
    }
    
    setVelocity(vx, vy) {
        this.velocity.x = vx;
        this.velocity.y = vy;
    }
    
    setAngle(angle) {
        this.angle = angle;
    }
    
    setAngularVelocity(angularVel) {
        this.angularVelocity = angularVel;
    }
    
    setThrusterPower(thrusterName, power) {
        if (this.thrusters[thrusterName]) {
            // Limiter la puissance entre 0 et la puissance maximale du propulseur
            const maxPower = this.thrusters[thrusterName].maxPower;
            this.thrusters[thrusterName].power = Math.max(0, Math.min(maxPower, power));
        }
    }
    
    consumeFuel(amount) {
        this.fuel = Math.max(0, this.fuel - amount);
        return this.fuel > 0;
    }
    
    applyDamage(amount) {
        if (this.isDestroyed) return;
        
        this.health -= amount;
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDestroyed = true;
            
            // Si on est sur la Lune quand on est détruit, enregistrer la position relative
            if (this.landedOn === 'Lune') {
                // Conserver l'information qu'on est attaché à la lune pour le mouvement
                this.attachedTo = 'Lune';
            }
            
            this.isLanded = false;
            this.landedOn = null;
            console.log(`Fusée détruite${this.attachedTo ? ' sur ' + this.attachedTo : ''}!`);
            
            // Désactiver tous les propulseurs
            for (const thrusterName in this.thrusters) {
                this.setThrusterPower(thrusterName, 0);
            }
            
            // Jouer le son de crash
            try {
                const crashSound = new Audio('assets/sound/crash.mp3');
                crashSound.volume = 1.0; // Volume maximum
                crashSound.play().catch(error => {
                    console.error("Erreur lors de la lecture du son de crash:", error);
                });
            } catch (error) {
                console.error("Erreur lors de la lecture du fichier crash.mp3:", error);
            }
        }
    }
    
    // Calcule et met à jour la position relative par rapport à un corps céleste
    updateRelativePosition(celestialBody) {
        if (!celestialBody || !this.attachedTo) return;
        
        if (!this.relativePosition) {
            // Calculer la position relative si elle n'existe pas encore
            this.relativePosition = {
                x: this.position.x - celestialBody.position.x,
                y: this.position.y - celestialBody.position.y,
                angle: this.angle // Conserver l'angle aussi
            };
        }
    }
    
    // Met à jour la position absolue en fonction de la position du corps céleste auquel on est attaché
    updateAbsolutePosition(celestialBody) {
        if (!celestialBody || !this.relativePosition || !this.attachedTo) return;
        
        // Mettre à jour la position absolue en fonction de la position relative
        this.position.x = celestialBody.position.x + this.relativePosition.x;
        this.position.y = celestialBody.position.y + this.relativePosition.y;
        // L'angle reste le même car les débris ne tournent pas avec la lune
    }
} 