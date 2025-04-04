/**
 * Fichier de constantes centralisées pour la simulation de fusée
 */

// Constantes physiques
const PHYSICS = {
    // Gravité
    G: 0.01,                // Constante gravitationnelle (augmentée pour un effet plus visible)
    
    // Forces des propulseurs
    MAIN_THRUST: 1000.0,          // Force du propulseur principal (augmentée significativement)
    LATERAL_THRUST: 50.0,       // Force des propulseurs latéraux (augmentée pour améliorer la rotation)
    REAR_THRUST: 200.0,          // Force du propulseur arrière (augmentée significativement)
    ROTATION_SPEED: 200,        // Vitesse de rotation
    
    // Limites et seuils
    MAX_SPEED: 10.0,             // Vitesse maximale de la fusée
    MAX_COORDINATE: 10000,      // Valeur maximale de coordonnée autorisée
    
    // Collisions
    COLLISION_DELAY: 1000,      // Délai avant d'activer les collisions (ms)
    REPULSION_STRENGTH: 0.05,   // Force de répulsion lors des collisions
    COLLISION_DAMPING: 0.5,     // Facteur d'amortissement des collisions
    IMPACT_DAMAGE_FACTOR: 10,   // Facteur de dommages lors des impacts
    RESTITUTION: 0.4,           // Coefficient de restitution (rebond)
    
    // Simulation
    TIME_SCALE_MIN: 0.1,        // Échelle de temps minimale
    TIME_SCALE_MAX: 10.0        // Échelle de temps maximale
};

// Constantes de rendu
const RENDER = {
    // Dimensions
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    
    // Caméra
    CAMERA_SMOOTHING: 0.3,      // Facteur de lissage du mouvement de caméra
    ZOOM_SMOOTHING: 0.1,        // Facteur de lissage du zoom
    ZOOM_SPEED: 0.1,            // Vitesse de zoom avec la molette
    MIN_ZOOM: 0.2,              // Zoom minimum
    MAX_ZOOM: 2.0,              // Zoom maximum
    
    // Vecteur de gravité
    GRAVITY_VECTOR_SCALE: 15000, // Échelle du vecteur de gravité pour le rendu
    GRAVITY_ARROW_SIZE: 15,      // Taille de la flèche du vecteur de gravité
    
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
    MASS: 100,                 // Masse de la fusée en kg
    WIDTH: 30,                  // Largeur de la hitbox
    HEIGHT: 60,                 // Hauteur de la hitbox
    FRICTION: 0.1,              // Friction de la fusée
    DENSITY: 0.001,             // Densité de la fusée
    MAX_HEALTH: 100,            // Santé maximale de la fusée
    
    // Carburant
    FUEL_MAX: 5000,             // Quantité maximale de carburant
    FUEL_CONSUMPTION: {
        MAIN: 0.2,              // Consommation du propulseur principal
        REAR: 0.2,              // Consommation du propulseur arrière
        LATERAL: 0.05           // Consommation des propulseurs latéraux
    },
    
    // Propulseurs
    THRUSTER_POWER: {
        MAIN: 100,              // Puissance maximale du propulseur principal
        REAR: 50,               // Puissance maximale du propulseur arrière
        LEFT: 20,               // Puissance maximale du propulseur gauche
        RIGHT: 20               // Puissance maximale du propulseur droit
    },
    
    // Positionnement des propulseurs
    THRUSTER_POSITIONS: {
        MAIN: { angle: -Math.PI/2, distance: 30 },    // Propulseur principal (orientation corrigée)
        REAR: { angle: Math.PI/2, distance: 30 },     // Propulseur arrière (orientation corrigée)
        LEFT: { angle: Math.PI, distance: 15 },       // Propulseur gauche (orientation corrigée)
        RIGHT: { angle: 0, distance: 15 }             // Propulseur droit (orientation corrigée)
    },
    
    // Contrôles
    POWER_INCREMENT: 5,         // Incrément de puissance par appui
    INITIAL_POWER: 60,          // Puissance initiale lors de l'activation (augmentée)
    POWER_RAMP_TIME: 2000,      // Temps pour atteindre la puissance max (ms)
    RAPID_REFIRE_TIME: 500      // Temps pour considérer un appui rapide (ms)
};

// Constantes du corps céleste
const CELESTIAL_BODY = {
    MASS: 200000000,             // Masse de l'astre (augmentée 4x)
    RADIUS: 120,                // Rayon de l'astre
    ORBIT_DISTANCE: 220,        // Distance orbitale initiale (rayon + 100)
    ATMOSPHERE_THRESHOLD: 1e23, // Seuil de masse pour avoir une atmosphère
    ATMOSPHERE_RATIO: 0.05      // Ratio du rayon pour la hauteur de l'atmosphère
};

// Constantes pour les particules
const PARTICLES = {
    STAR_COUNT: 2000,           // Nombre d'étoiles dans l'espace
    VISIBLE_RADIUS: 12000,      // Rayon visible de l'espace
    
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