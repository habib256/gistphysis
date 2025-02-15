// Ce fichier utilise Three.js pour dessiner la molécule de méthane.
// La molécule est représentée avec une sphère noire (carbone) au centre
// et quatre sphères blanches (hydrogènes) positionnées en tétraèdre.

// Assurez-vous d'avoir inclus Three.js dans votre projet, par exemple via un CDN ou en l'important comme module.

function init() {
    // Création de la scène
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // Fond blanc

    // Déclaration du conteneur avant création de la caméra
    const modelContainer = document.getElementById("model-viewer") || document.body;
    // Création de la caméra en utilisant les dimensions du conteneur
    const camera = new THREE.PerspectiveCamera(
        75, 
        modelContainer.clientWidth / modelContainer.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 10;

    // Création du renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(modelContainer.clientWidth, modelContainer.clientHeight);
    modelContainer.appendChild(renderer.domElement);

    // Création d'un groupe pour regrouper tous les atomes et liaisons de la molécule
    const molecule = new THREE.Group();

    // Création de la sphère centrale noire (carbone)
    const centerGeometry = new THREE.SphereGeometry(1, 32, 32);
    const centerMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
    molecule.add(centerSphere);

    // Création des quatre sphères blanches (hydrogènes)
    // Positionnement suivant une configuration tétraédrique.
    // Nous plaçons les hydrogènes aux positions suivantes :
    // (d, d, d), (d, -d, -d), (-d, d, -d) et (-d, -d, d)
    const d = 1.0; // distance rapprochée depuis le carbone central (raccourcie)
    const hPositions = [
        new THREE.Vector3(d, d, d),
        new THREE.Vector3(d, -d, -d),
        new THREE.Vector3(-d, d, -d),
        new THREE.Vector3(-d, -d, d)
    ];

    const hGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const hMaterial = new THREE.MeshPhongMaterial({ 
         color: 0xffffff, 
         specular: 0x111111, 
         shininess: 30 
    });

    hPositions.forEach(position => {
        const hSphere = new THREE.Mesh(hGeometry, hMaterial);
        hSphere.position.copy(position);
        molecule.add(hSphere);
    });

    // Création des liaisons entre le carbone central et chaque hydrogène
    function createBond(start, end) {
        // Utilisation de la distance complète entre le carbone et l'hydrogène
        const fullDistance = start.distanceTo(end);
        const bondGeometry = new THREE.CylinderGeometry(0.15, 0.15, fullDistance, 16);
        const bondMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const bond = new THREE.Mesh(bondGeometry, bondMaterial);

        // Positionner la liaison au milieu entre le carbone et l'hydrogène
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        bond.position.copy(midPoint);

        // Orienter le cylindre pour qu'il suive la direction allant du carbone vers l'hydrogène
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const axis = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);
        bond.quaternion.copy(quaternion);

        return bond;
    }

    hPositions.forEach(position => {
        const bond = createBond(new THREE.Vector3(0, 0, 0), position);
        molecule.add(bond);
    });

    // Ajout du groupe complet de la molécule à la scène
    scene.add(molecule);
    // Mise à l'échelle de la molécule pour remplir le conteneur model-viewer
    molecule.scale.set(2.5, 2.5, 2.5);

    // Gestion de la redimension de la fenêtre
    window.addEventListener("resize", () => {
        const containerWidth = modelContainer.clientWidth;
        const containerHeight = modelContainer.clientHeight;
        camera.aspect = containerWidth / containerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerWidth, containerHeight);
    });

    // Ajout de lumières pour le rendu Phong
    const ambientLight = new THREE.AmbientLight(0x404040); // lumière ambiante douce
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Fonction d'animation
    function animate() {
        requestAnimationFrame(animate);
        var time = Date.now() * 0.001;
        // Détournement créatif de la molécule : rotation dynamique sur plusieurs axes
        molecule.rotation.y += 0.01;
        molecule.rotation.x = Math.sin(time) * 0.3;
        molecule.rotation.z = Math.cos(time) * 0.3;
        renderer.render(scene, camera);
    }
    animate();
}

init(); 