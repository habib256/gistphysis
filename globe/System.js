import { createPlanet, createOrbitingPlanet } from './planet.js';

// Fonction de configuration du système solaire
export function setupSolarSystem(scene) {
    // Création du Soleil
    const sun = createPlanet({
        scene: scene,
        texture: 'textures/sun.jpg',         // Texture du Soleil
        radius: 8,
        widthSegments: 64,
        heightSegments: 64,
        materialType: 'basic',               // Matériau basique pour un rendu lumineux
        position: new THREE.Vector3(0, 0, 0),
        name: 'Sun'
    });
    // Désactivation des ombres pour le Soleil pour éviter qu'il ne bloque la lumière
    sun.castShadow = false;

    // Création de la Terre en orbite autour du Soleil
    const earth = createOrbitingPlanet({
        scene: scene,
        texture: 'textures/fullmapb.jpg',         // Texture de la Terre
        bump: 'textures/bump.jpg',                  // Carte de relief de la Terre
        specular: 'textures/earth_specular.jpg',    // Carte spéculaire de la Terre
        radius: 3.5,                                // Taille ajustée pour être bien visible
        widthSegments: 64,
        heightSegments: 64,
        bumpScale: 0.05,
        orbitCenter: sun.position,                  // Centre d'orbite : le Soleil
        orbitRadius: 20,                            // Distance modifiée pour un rendu équilibré
        orbitSpeed: 0.008,                          // Vitesse d'orbite autour du Soleil
        initialAngle: 0,
        rotationSpeed: 0.02,                        // Rotation sur elle-même
        name: 'Earth'
    });

    // Création de la Lune : orbite hiérarchique autour de la Terre
    const moon = createOrbitingPlanet({
        scene: scene,
        texture: 'textures/moon.jpg',           // Texture de la Lune
        bump: 'textures/moon_bump.jpg',           // Bump map de la Lune
        radius: 0.75,                           // Taille diminuée par 2
        widthSegments: 32,
        heightSegments: 32,
        bumpScale: 0.05,
        // Bien que l'on mette ici earth.mesh.position, nous allons surcharger la méthode update
        orbitCenter: earth.mesh.position,
        orbitRadius: 5,                          // Distance ajustée, un peu plus éloignée de la Terre
        orbitSpeed: 0.04,                         // Vitesse adaptée pour le satellite
        initialAngle: 0,
        rotationSpeed: 0.03,
        name: 'Moon'
    });
    // Mise à jour hiérarchique pour que la Lune reste proche de la Terre
    moon.update = function() {
        this.orbitAngle += this.orbitSpeed;
        const offset = 5; // distance fixe par rapport à la Terre ajustée
        this.mesh.position.x = earth.mesh.position.x + offset * Math.cos(this.orbitAngle);
        this.mesh.position.z = earth.mesh.position.z + offset * Math.sin(this.orbitAngle);
        // On garde la même hauteur que la Terre
        this.mesh.position.y = earth.mesh.position.y;
        this.mesh.rotation.y += this.rotationSpeed;
    };

    // Création de Mars en orbite autour du Soleil
    const mars = createOrbitingPlanet({
        scene: scene,
        texture: 'textures/mars.png',           // Texture de Mars
        bump: 'textures/mars_bump.jpg',           // Bump map de Mars
        radius: 2.5,
        widthSegments: 32,
        heightSegments: 32,
        bumpScale: 0.05,
        orbitCenter: sun.position,               // Centre d'orbite : le Soleil
        orbitRadius: 42,                         // Distance augmentée (28 * 1.5) pour Mars
        orbitSpeed: 0.006,                       // Vitesse d'orbite plus lente
        initialAngle: Math.PI / 2,
        rotationSpeed: 0.02,
        name: 'Mars'
    });

    return { sun, earth, moon, mars };
} 