class UniverseModel {
    constructor() {
        // Collections d'objets
        this.celestialBodies = [];
        this.stars = [];
        
        // Propriétés de l'univers
        this.width = PHYSICS.MAX_COORDINATE * 2;
        this.height = PHYSICS.MAX_COORDINATE * 2;
        this.starCount = PARTICLES.STAR_COUNT;
        
        // Propriétés physiques
        this.gravitationalConstant = PHYSICS.G;
        
        // Génération des étoiles d'arrière-plan
        this.generateStars();
    }
    
    generateStars() {
        this.stars = [];
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.5,
                color: this.getRandomStarColor()
            });
        }
    }
    
    getRandomStarColor() {
        const colors = [
            '#FFFFFF', // Blanc
            '#FFD700', // Jaune doré
            '#87CEEB', // Bleu ciel
            '#FF4500', // Rouge orangé
            '#E6E6FA'  // Lavande
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    addCelestialBody(body) {
        this.celestialBodies.push(body);
    }
    
    removeCelestialBody(body) {
        const index = this.celestialBodies.indexOf(body);
        if (index !== -1) {
            this.celestialBodies.splice(index, 1);
        }
    }
    
    // Trouve le corps céleste le plus proche d'une position donnée
    findNearestBody(position, excludeBody = null) {
        let nearestBody = null;
        let minDistance = Infinity;
        
        for (const body of this.celestialBodies) {
            if (body === excludeBody) continue;
            
            const dx = body.position.x - position.x;
            const dy = body.position.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestBody = body;
            }
        }
        
        return { body: nearestBody, distance: minDistance };
    }
} 