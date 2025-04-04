class Particle {
    constructor(x, y, angle, speed, color, lifetime) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.size = Math.random() * 3 + 2;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.lifetime--;
        this.size *= 0.95;
        return this.lifetime > 0;
    }

    draw(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.join(',')},${alpha})`;
        ctx.fill();
    }
}

class ParticleEmitter {
    constructor(x, y, angle, spread, particleSpeed, color) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.spread = spread;
        this.particleSpeed = particleSpeed;
        this.color = color;
        this.particles = [];
        this.isActive = false;
    }

    setPosition(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
    }

    emit() {
        if (!this.isActive) return;

        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
            const angleSpread = (Math.random() - 0.5) * this.spread;
            const particleAngle = this.angle + angleSpread;
            const speed = this.particleSpeed * (0.8 + Math.random() * 0.4);
            const lifetime = 20 + Math.random() * 10;
            
            this.particles.push(new Particle(
                this.x,
                this.y,
                particleAngle,
                speed,
                this.color,
                lifetime
            ));
        }
    }

    update(ctx) {
        // Émettre de nouvelles particules
        this.emit();

        // Mettre à jour et dessiner les particules existantes
        this.particles = this.particles.filter(particle => {
            const isAlive = particle.update();
            if (isAlive) {
                particle.draw(ctx);
            }
            return isAlive;
        });
    }
}

class RocketParticleSystem {
    constructor() {
        const lateralSpeed = 4;      // Vitesse uniforme pour les réacteurs latéraux
        const lateralSpread = 0.3;   // Dispersion uniforme pour les réacteurs latéraux
        const lateralColor = [200, 200, 0];  // Couleur uniforme pour les réacteurs latéraux

        this.emitters = {
            main: new ParticleEmitter(0, 0, Math.PI/2, 0.5, 5, [255, 100, 0]),    // Orange pour le réacteur principal
            left: new ParticleEmitter(0, 0, 0, lateralSpread, lateralSpeed, lateralColor),  // Réacteur gauche
            right: new ParticleEmitter(0, 0, Math.PI, lateralSpread, lateralSpeed, lateralColor)  // Réacteur droit
        };
    }

    updateEmitterPositions(rocketBody) {
        const angle = rocketBody.angle;
        const pos = rocketBody.position;
        const radius = 30; // Distance du centre de la fusée aux réacteurs

        // Réacteur principal (bas de la fusée)
        this.emitters.main.setPosition(
            pos.x - Math.sin(angle) * radius,
            pos.y + Math.cos(angle) * radius,
            angle + Math.PI/2
        );

        // Réacteur gauche
        this.emitters.left.setPosition(
            pos.x - Math.cos(angle) * radius,
            pos.y - Math.sin(angle) * radius,
            angle + Math.PI
        );

        // Réacteur droit
        this.emitters.right.setPosition(
            pos.x + Math.cos(angle) * radius,
            pos.y + Math.sin(angle) * radius,
            angle
        );
    }

    setEmitterState(emitterName, isActive) {
        if (this.emitters[emitterName]) {
            this.emitters[emitterName].isActive = isActive;
        }
    }

    update(ctx) {
        Object.values(this.emitters).forEach(emitter => emitter.update(ctx));
    }
} 