// Ce fichier utilise Three.js pour dessiner la molécule de méthane.
// La molécule est représentée avec une sphère noire (carbone) au centre
// et quatre sphères blanches (hydrogènes) positionnées en tétraèdre.

// Assurez-vous d'avoir inclus Three.js dans votre projet, par exemple via un CDN ou en l'important comme module.

function init() {
    // Création de la scène
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // Fond blanc

    // Création de la caméra
    const camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 10;

    // Création du renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const modelContainer = document.getElementById("model-viewer") || document.body;
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
    const d = 1.5; // distance rapprochée depuis le carbone central
    const hPositions = [
        new THREE.Vector3(d, d, d),
        new THREE.Vector3(d, -d, -d),
        new THREE.Vector3(-d, d, -d),
        new THREE.Vector3(-d, -d, d)
    ];

    const hGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const hMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    hPositions.forEach(position => {
        const hSphere = new THREE.Mesh(hGeometry, hMaterial);
        hSphere.position.copy(position);
        // Ajout d'un contour noir (wireframe) pour surligner la sphère d'hydrogène
        const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
        const outline = new THREE.Mesh(hGeometry, outlineMaterial);
        outline.scale.set(1.1, 1.1, 1.1);
        hSphere.add(outline);
        molecule.add(hSphere);
    });

    // Création des liaisons entre le carbone central et chaque hydrogène
    function createBond(start, end) {
        const distance = start.distanceTo(end);
        const bondGeometry = new THREE.CylinderGeometry(0.1, 0.1, distance, 16);
        const bondMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
        const bond = new THREE.Mesh(bondGeometry, bondMaterial);

        // Positionner la liaison au milieu entre les deux points
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        bond.position.copy(midPoint);

        // Orienter la liaison
        // Le cylindre est défini verticalement (le long de l'axe Y) par défaut.
        // On calcule la rotation nécessaire pour l'aligner avec le vecteur allant de start à end.
        const v = new THREE.Vector3().subVectors(end, start).normalize();
        const axis = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, v);
        bond.quaternion.copy(quaternion);

        return bond;
    }

    hPositions.forEach(position => {
        const bond = createBond(new THREE.Vector3(0, 0, 0), position);
        molecule.add(bond);
    });

    // Ajout du groupe complet de la molécule à la scène
    scene.add(molecule);

    // Gestion de la redimension de la fenêtre
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Fonction d'animation
    function animate() {
        requestAnimationFrame(animate);
        // Rotation de l'ensemble de la molécule
        molecule.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}

init(); 