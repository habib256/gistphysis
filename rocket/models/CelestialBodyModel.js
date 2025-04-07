class CelestialBodyModel {
    constructor(name, mass, radius, position, color) {
        // Identité
        this.name = name;
        
        // Propriétés physiques
        this.mass = mass; // kg
        this.radius = radius; // m
        this.gravitationalConstant = PHYSICS.G; // Utiliser la constante du fichier constants.js
        
        // Position et mouvement
        this.position = position || { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        
        // Apparence
        this.color = color || '#FFFFFF';
        this.atmosphere = {
            exists: mass > CELESTIAL_BODY.ATMOSPHERE_THRESHOLD, // Présence d'atmosphère pour les corps massifs
            height: radius * CELESTIAL_BODY.ATMOSPHERE_RATIO, // Hauteur de l'atmosphère
            color: 'rgba(25, 35, 80, 0.4)'  // Bleu très sombre semi-transparent
        };
        
        // Caractéristiques supplémentaires
        this.hasRings = false;
        this.satellites = [];
    }
    
    setVelocity(vx, vy) {
        this.velocity.x = vx;
        this.velocity.y = vy;
    }
    
    addSatellite(satellite) {
        this.satellites.push(satellite);
    }
    
    // Calcule la force gravitationnelle exercée sur un autre corps
    calculateGravitationalForce(otherBody) {
        const dx = this.position.x - otherBody.position.x;
        const dy = this.position.y - otherBody.position.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);
        
        // Formule de la gravitation universelle modifiée: F = G * (m1 * m2) / r au lieu de F = G * (m1 * m2) / r²
        // pour une diminution plus lente de la gravité avec la distance
        const forceMagnitude = this.gravitationalConstant * this.mass * otherBody.mass / distance;
        
        // Direction de la force (vecteur unitaire)
        const forceX = forceMagnitude * (dx / distance);
        const forceY = forceMagnitude * (dy / distance);
        
        return { x: forceX, y: forceY };
    }
} 