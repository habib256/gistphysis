/**
 * Fichier de constantes centralisées pour la simulation de fusée
 */

// Constantes physiques
const PHYSICS = {
    // Gravité
    G: 1,                // Constante gravitationnelle 
    
    // Limites et seuils
    MAX_SPEED: 10000.0,        // Vitesse maximale de la fusée
    MAX_COORDINATE: 10000,      // Valeur maximale de coordonnée autorisée
    
    // Collisions
    COLLISION_DELAY: 2000,      // Délai avant d'activer les collisions (ms)
    REPULSION_STRENGTH: 0.05,   // Force de répulsion lors des collisions
    COLLISION_DAMPING: 0.7,     // Facteur d'amortissement des collisions
    IMPACT_DAMAGE_FACTOR: 10,   // Facteur de dommages lors des impacts
    RESTITUTION: 0.2,           // Coefficient de restitution (rebond)
    
    // Simulation
    TIME_SCALE_MIN: 0.1,        // Échelle de temps minimale
    TIME_SCALE_MAX: 10.0,       // Échelle de temps maximale
    
    // Multiplicateur de propulsion
    // Ajustez cette valeur pour augmenter la puissance de tous les propulseurs
    THRUST_MULTIPLIER: 10.0     // Multiplicateur global pour toutes les forces de propulsion
};

// Constantes de rendu
const RENDER = {
    // Dimensions
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    
    // Caméra
    CAMERA_SMOOTHING: 1,      // Facteur de lissage du mouvement de caméra
    ZOOM_SMOOTHING: 0.1,        // Facteur de lissage du zoom
    ZOOM_SPEED: 0.2,            // Vitesse de zoom avec la molette 
    MIN_ZOOM: 0.01,              // Zoom minimum
    MAX_ZOOM: 4.0,              // Zoom maximum 
    
    // Vecteur de gravité
    GRAVITY_VECTOR_SCALE: 150,  // Échelle du vecteur de gravité pour le rendu
    GRAVITY_ARROW_SIZE: 15,     // Taille de la flèche du vecteur de gravité
    
    // Vecteurs de visualisation
    GRAVITY_SCALE_FACTOR: 3000,   // Facteur d'échelle pour rendre le vecteur gravitationnel visible 
    GRAVITY_MAX_LENGTH: 120,        // Longueur maximale du vecteur gravitationnel (augmentée à 120)
    VELOCITY_SCALE_FACTOR: 50,      // Facteur d'échelle pour le vecteur de vitesse
    VELOCITY_MAX_LENGTH: 80,        // Longueur maximale du vecteur de vitesse
    THRUST_SCALE_FACTOR: 0.01,      // Facteur d'échelle pour les vecteurs de poussée
    THRUST_ARROW_SIZE: 5,           // Taille de la flèche des vecteurs de poussée
    
    // Couleurs et affichage
    SPACE_COLOR: '#000022',     // Couleur de fond de l'espace
    STAR_TWINKLE_FACTOR: 0.1,   // Facteur de scintillement des étoiles
    STAR_BRIGHTNESS_BASE: 0.5,  // Luminosité de base des étoiles
    STAR_BRIGHTNESS_RANGE: 0.3, // Variation de luminosité des étoiles
    MARGIN_FACTOR: 2            // Facteur de marge pour la visibilité à l'écran
};

// Constantes de la fusée
const ROCKET = {
    // Propriétés physiques
    MASS: 1500,                 // Masse de la fusée en kg
    WIDTH: 30,                  // Largeur de la hitbox
    HEIGHT: 60,                 // Hauteur de la hitbox
    FRICTION: 0.0,              // Friction de la fusée
    MAX_HEALTH: 100,            // Santé maximale de la fusée
    ROTATION_SPEED: 100,        // Vitesse de rotation
    
    // Carburant
    FUEL_MAX: 5000,             // Quantité maximale de carburant
    FUEL_CONSUMPTION: {
        MAIN: 0.2,              // Consommation du propulseur principal
        REAR: 0.2,              // Consommation du propulseur arrière
        LATERAL: 0.05           // Consommation des propulseurs latéraux
    },
    
    // Propulseurs - Forces
    MAIN_THRUST: 5500.0,         // Force du propulseur principal 
    LATERAL_THRUST: 20.0,       // Force des propulseurs latéraux 
    REAR_THRUST: 3000.0,         // Force du propulseur arrière
    
    // Propulseurs - Puissance maximale
    THRUSTER_POWER: {
        MAIN: 1000,            // Puissance maximale du propulseur principal 
        REAR: 200,             // Puissance maximale du propulseur arrière 
        LEFT: 20,              // Puissance maximale du propulseur gauche 
        RIGHT: 20              // Puissance maximale du propulseur droit 
    },
    
    // Positionnement des propulseurs
    THRUSTER_POSITIONS: {
        MAIN: { angle: -Math.PI/2, distance: 30 },    // Propulseur principal 
        REAR: { angle: Math.PI/2, distance: 30 },     // Propulseur arrière 
        LEFT: { angle: Math.PI, distance: 15 },       // Propulseur gauche 
        RIGHT: { angle: 0, distance: 15 }             // Propulseur droit 
    }
};

// Constantes du corps céleste
const CELESTIAL_BODY = {
    MASS: 200000000000,             // Masse de l'astre 
    RADIUS: 720,                  // Rayon de l'astre
    ORBIT_DISTANCE: 820,          // Distance orbitale initiale (rayon + 100)
    ATMOSPHERE_RATIO: 0.1666,     // Ratio du rayon pour la hauteur de l'atmosphère (120/720 ≈ 0.1666)
    ATMOSPHERE_THRESHOLD: 1000000  // Seuil de masse pour avoir une atmosphère
};

// Constantes pour les particules
const PARTICLES = {
    STAR_COUNT: 800,           // Nombre d'étoiles dans l'espace
    VISIBLE_RADIUS: 25000,      // Rayon visible de l'espace (doublé de 12000 à 24000)
    
    // Propriétés des émetteurs de particules
    EMITTER: {
        MAIN: {
            SPEED: 5,
            COLOR_START: '#FF5500',
            COLOR_END: '#FF9500',
            LIFETIME: 1.5,
            COUNT: 3
        },
        LATERAL: {
            SPEED: 3,
            COLOR_START: '#FF8800',
            COLOR_END: '#FFAA00',
            LIFETIME: 1.0,
            COUNT: 2
        },
        REAR: {
            SPEED: 4,
            COLOR_START: '#FF5500',
            COLOR_END: '#FF9500',
            LIFETIME: 1.2,
            COUNT: 2
        }
    },
    
    // Particules de collision
    COLLISION: {
        COUNT: 50,
        SPEED_MIN: 3,
        SPEED_MAX: 8,
        SIZE_MIN: 1,
        SIZE_MAX: 5,
        LIFETIME_MIN: 20,
        LIFETIME_MAX: 60,
        COLORS: ['#FF4500', '#FF6347', '#FF8C00', '#FFD700']
    }
}; 