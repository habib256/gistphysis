import { createPlanet, createOrbitingPlanet } from './planet.js';

/**
 * Fonction utilitaire pour créer un tracé d'orbite.
 * @param {number} orbitRadius - Le rayon de l'orbite.
 * @param {THREE.Vector3} orbitCenter - Le centre de l'orbite.
 * @param {number} [segments=64] - Le nombre de segments pour définir la finesse du cercle.
 * @param {number} [color=0xffffff] - La couleur du tracé.
 * @returns {THREE.LineLoop} Le tracé représentant l'orbite.
 */
function createOrbitPath(orbitRadius, orbitCenter, segments = 64, color = 0xffffff) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        points.push(new THREE.Vector3(
            orbitCenter.x + orbitRadius * Math.cos(theta),
            orbitCenter.y,
            orbitCenter.z + orbitRadius * Math.sin(theta)
        ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color });
    return new THREE.LineLoop(geometry, material);
}

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
        orbitSpeed: 0.0016,                         // 0.008 divisé par 5
        initialAngle: 0,
        rotationSpeed: 0.004,                       // 0.02 divisé par 5
        name: 'Earth'
    });

    // Tracé de l'orbite de la Terre autour du Soleil (couleur verte)
    const earthOrbitPath = createOrbitPath(20, sun.position, 64, 0x00ff00);
    earthOrbitPath.name = "earthOrbitPath";
    scene.add(earthOrbitPath);

    // Création de la Lune : orbite hiérarchique autour de la Terre
    const moon = createOrbitingPlanet({
        scene: scene,
        texture: 'textures/moon.jpg',           // Texture de la Lune
        bump: 'textures/moon_bump.jpg',           // Bump map de la Lune
        radius: 0.75,                           // Taille diminuée
        widthSegments: 32,
        heightSegments: 32,
        bumpScale: 0.05,
        orbitCenter: earth.mesh.position,  // L'orbite se base sur la position de la Terre
        orbitRadius: 5,                          // Distance ajustée
        orbitSpeed: 0.008,                       // 0.04 divisé par 5
        initialAngle: 0,
        rotationSpeed: 0.006,                    // 0.03 divisé par 5
        name: 'Moon'
    });
    // Mise à jour hiérarchique pour que la Lune reste proche de la Terre
    moon.update = function() {
        this.orbitAngle += this.orbitSpeed;
        const offset = 5; // distance fixe par rapport à la Terre
        this.mesh.position.x = earth.mesh.position.x + offset * Math.cos(this.orbitAngle);
        this.mesh.position.z = earth.mesh.position.z + offset * Math.sin(this.orbitAngle);
        // On garde la même hauteur que la Terre
        this.mesh.position.y = earth.mesh.position.y;
        this.mesh.rotation.y += this.rotationSpeed;
    };

    // Tracé de l'orbite de la Lune autour de la Terre à l'aide de createOrbitPath
    const moonOrbitPath = createOrbitPath(5, new THREE.Vector3(0, 0, 0), 64, 0xffffff);
    moonOrbitPath.name = "moonOrbitPath";
    earth.mesh.add(moonOrbitPath);

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
        orbitRadius: 42,                         // Distance augmentée pour Mars
        orbitSpeed: 0.0012,                      // 0.006 divisé par 5
        initialAngle: Math.PI / 2,
        rotationSpeed: 0.004,                    // 0.02 divisé par 5
        name: 'Mars'
    });

    // Tracé de l'orbite de Mars autour du Soleil (couleur rouge)
    const marsOrbitPath = createOrbitPath(42, sun.position, 64, 0xff0000);
    marsOrbitPath.name = "marsOrbitPath";
    scene.add(marsOrbitPath);

    return { sun, earth, moon, mars };
} 