class SputnikModel {
    constructor(position, radius, mass, orbitalVelocity) {
        this.position = position || { x: 0, y: 0 }; // Position initiale, sera recalculée
        this.radius = radius || 10; // Rayon arbitraire pour la physique
        this.mass = mass || 0.1; // Masse très faible
        this.orbitalVelocity = orbitalVelocity || { x: 0, y: 0 }; // Vitesse orbitale, sera calculée
        this.angle = 0; // Angle initial
        this.angularVelocity = 0.1; // Vitesse de rotation sur lui-même
        this.name = 'sputnik';
    }
} 