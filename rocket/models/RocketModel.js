class RocketModel {
    constructor() {
        // Position et mouvement
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.angle = 0;
        this.angularVelocity = 0;
        
        // Propriétés physiques
        this.mass = ROCKET.MASS;
        this.momentOfInertia = ROCKET.MASS * 1.5;
        this.radius = ROCKET.WIDTH / 2;
        
        // Propulsion
        this.thrusters = {
            main: { 
                power: 0, 
                maxPower: ROCKET.THRUSTER_POWER.MAIN, 
                position: { 
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.MAIN.angle) * ROCKET.THRUSTER_POSITIONS.MAIN.distance, 
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.MAIN.angle) * ROCKET.THRUSTER_POSITIONS.MAIN.distance 
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
            },
            rear: { 
                power: 0, 
                maxPower: ROCKET.THRUSTER_POWER.REAR, 
                position: { 
                    x: Math.cos(ROCKET.THRUSTER_POSITIONS.REAR.angle) * ROCKET.THRUSTER_POSITIONS.REAR.distance, 
                    y: Math.sin(ROCKET.THRUSTER_POSITIONS.REAR.angle) * ROCKET.THRUSTER_POSITIONS.REAR.distance 
                } 
            }
        };
        
        // État
        this.fuel = ROCKET.FUEL_MAX;
        this.health = ROCKET.MAX_HEALTH;
        this.isDestroyed = false;
        this.isLanded = false; // Indique si la fusée est posée sur un corps céleste
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
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.isDestroyed = true;
        }
    }
} 