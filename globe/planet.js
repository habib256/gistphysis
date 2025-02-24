// Fichier: planet.js
// Ce fichier contient des fonctions pour créer des planètes et des corps en orbite

export function createPlanet(options) {
    // Chargement des textures
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(options.texture);

    // Si materialType est défini à 'basic', on utilise un matériau basique
    if (options.materialType && options.materialType === 'basic') {
        const geometry = new THREE.SphereGeometry(
            options.radius,
            options.widthSegments || 32,
            options.heightSegments || 32
        );
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        if (options.position) {
            mesh.position.copy(options.position);
        }
        if (options.scene) {
            options.scene.add(mesh);
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    
    // Sinon, on utilise un matériau Phong standard pour les planètes avec effet de relief et spéculaire
    const bump = options.bump ? textureLoader.load(options.bump) : null;
    const specular = options.specular ? textureLoader.load(options.specular) : null;
    
    const geometry = new THREE.SphereGeometry(
        options.radius,
        options.widthSegments || 32,
        options.heightSegments || 32
    );
    
    const materialOptions = { map: texture };
    if (bump) {
        materialOptions.bumpMap = bump;
        materialOptions.bumpScale = options.bumpScale || 0.05;
    }
    if (specular) {
        materialOptions.specularMap = specular;
        materialOptions.specular = new THREE.Color(options.specularColor || 'grey');
    }
    
    const material = new THREE.MeshPhongMaterial(materialOptions);
    const mesh = new THREE.Mesh(geometry, material);
    
    if (options.position) {
        mesh.position.copy(options.position);
    }
    if (options.scene) {
        options.scene.add(mesh);
    }
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
}

export function createOrbitingPlanet(options) {
    // Crée une planète (ou satellite) en orbite autour d'un centre donné
    const mesh = createPlanet(options);
    return {
        mesh: mesh,
        orbitCenter: options.orbitCenter || new THREE.Vector3(0, 0, 0),
        orbitRadius: options.orbitRadius,
        orbitSpeed: options.orbitSpeed,
        orbitAngle: options.initialAngle || 0,
        rotationSpeed: options.rotationSpeed || 0,
        update: function() {
            this.orbitAngle += this.orbitSpeed;
            this.mesh.position.x = this.orbitCenter.x + this.orbitRadius * Math.cos(this.orbitAngle);
            this.mesh.position.z = this.orbitCenter.z + this.orbitRadius * Math.sin(this.orbitAngle);
            // Mise à jour de la rotation sur elle-même
            this.mesh.rotation.y += this.rotationSpeed;
        }
    };
} 