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
            // La Lune n'a pas d'atmosphère, indépendamment de sa masse
            exists: name !== 'Lune' && mass > CELESTIAL_BODY.ATMOSPHERE_THRESHOLD,
            height: radius * CELESTIAL_BODY.ATMOSPHERE_RATIO, // Hauteur de l'atmosphère
            color: 'rgba(25, 35, 80, 0.4)'  // Bleu très sombre semi-transparent
        };
        
        // Caractéristiques supplémentaires
        this.hasRings = false;
        this.satellites = [];
        this.moon = null; // Référence à la lune
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
    
    // Initialiser la lune comme satellite naturel
    initMoon() {
        console.log("initMoon() appelée pour", this.name);
        
        // Création d'une position pour la lune basée sur les constantes
        const moonPosition = {
            x: this.position.x + CELESTIAL_BODY.MOON.ORBIT_DISTANCE,
            y: this.position.y
        };
        
        // Créer le modèle de la lune
        const moon = new CelestialBodyModel(
            "Lune",
            CELESTIAL_BODY.MOON.MASS,
            CELESTIAL_BODY.MOON.RADIUS,
            moonPosition,
            '#CCCCCC' // Couleur grise pour la lune
        );
        
        // S'assurer que la lune n'a pas d'atmosphère
        moon.atmosphere.exists = false;
        
        // Donner à la lune une vitesse orbitale initiale
        moon.velocity = {
            x: 0,
            y: -Math.sqrt(PHYSICS.G * this.mass / CELESTIAL_BODY.MOON.ORBIT_DISTANCE) * 0.5 // Formule de vitesse orbitale avec un facteur de réduction
        };
        
        // Ajouter la lune aux satellites
        this.satellites.push(moon);
        this.moon = moon;
        
        console.log("Lune créée:", moon);
        return moon;
    }
    
    // Mise à jour manuelle de la position de la lune (sans dépendre du moteur physique)
    updateMoon(deltaTime) {
        if (!this.moon) return;
        
        // Calculer l'angle actuel de la lune par rapport à la planète
        const dx = this.moon.position.x - this.position.x;
        const dy = this.moon.position.y - this.position.y;
        let angle = Math.atan2(dy, dx);
        
        // Calculer la distance actuelle
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Mise à jour de l'angle en fonction de la vitesse orbitale
        angle += CELESTIAL_BODY.MOON.ORBIT_SPEED * deltaTime;
        
        // Stocker l'angle de rotation dans le modèle de la lune
        this.moon.rotationAngle = angle;
        
        // Mettre à jour la position de la lune
        this.moon.position = {
            x: this.position.x + Math.cos(angle) * distance,
            y: this.position.y + Math.sin(angle) * distance
        };
    }
} 