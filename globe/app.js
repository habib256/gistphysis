// Initialisation de la scène, de la caméra et du rendu
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Chargement des textures de la Terre
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('textures/fullmapb.jpg'); // Assurez-vous que le chemin est correct
const bumpMap = textureLoader.load('textures/bump.jpg'); // Remplacez par une URL de carte de relief si nécessaire
const specularMap = textureLoader.load('textures/earth_specular.jpg'); // Remplacez par une URL de carte spéculaire si nécessaire

// Création de la sphère représentant la Terre
const earthGeometry = new THREE.SphereGeometry(5, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: bumpMap,
    bumpScale: 0.05,
    specularMap: specularMap,
    specular: new THREE.Color('grey')
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// Création de la sphère représentant la Lune
const moonTexture = textureLoader.load('textures/moon.jpg'); // Assurez-vous d'avoir une texture pour la Lune
const moonBumpMap = textureLoader.load('textures/moon_bump.jpg'); // Fichier de bump pour la Lune
const moonGeometry = new THREE.SphereGeometry(1.35, 32, 32);
const moonMaterial = new THREE.MeshPhongMaterial({
    map: moonTexture,
    bumpMap: moonBumpMap,
    bumpScale: 0.05 // Ajustez la valeur de bumpScale selon le résultat souhaité
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moon);

// Ajout de la lumière
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// Ajout du soleil qui éclaire la scène de loin
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
// Position du soleil éloigné (à vous d'ajuster pour obtenir l'effet désiré)
sunLight.position.set(100, 100, 100);
scene.add(sunLight);

// Positionnement de la caméra en orbite autour de la Terre
let cameraRadius = 15;
let cameraTheta = 0;            // angle horizontal (azimuth)
let cameraPhi = Math.PI / 2;      // angle vertical (polar), 90° pour être à hauteur d'équateur

// Variables pour l'orbite de la Lune
let moonOrbitRadius = 10;
let moonOrbitSpeed = 0.01;
let moonAngle = 0;

// Variables pour la rotation avec la souris
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Fonction d'animation
function animate() {
    requestAnimationFrame(animate);
    
    // Rotation de la Terre
    earth.rotation.y += 0.001;
    
    // Calcul de la position de la Lune
    moonAngle += moonOrbitSpeed;
    moon.position.x = earth.position.x + moonOrbitRadius * Math.cos(moonAngle);
    moon.position.z = earth.position.z + moonOrbitRadius * Math.sin(moonAngle);
    
    // Mise à jour de la position de la caméra en coordonnées sphériques
    camera.position.x = cameraRadius * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    camera.position.y = cameraRadius * Math.cos(cameraPhi);
    camera.position.z = cameraRadius * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    camera.lookAt(earth.position);
    
    renderer.render(scene, camera);
}

animate();

// Gestion du zoom avec la molette de la souris
window.addEventListener('wheel', function(event) {
    event.preventDefault();
    cameraRadius += event.deltaY * 0.01; // Ajustez le facteur de zoom si nécessaire
    cameraRadius = Math.max(5, Math.min(50, cameraRadius)); // Limite le zoom
});

// Gestion de la rotation avec la souris pour un contrôle orbital complet
window.addEventListener('mousedown', function(event) {
    isDragging = true;
    previousMousePosition = { x: event.clientX, y: event.clientY };
});

window.addEventListener('mousemove', function(event) {
    if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        // Mise à jour des angles horizontal et vertical
        cameraTheta -= deltaX * 0.005;
        cameraPhi   -= deltaY * 0.005;
        // Limiter cameraPhi pour éviter un retournement vertical
        cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi));
    }
    previousMousePosition = { x: event.clientX, y: event.clientY };
});

window.addEventListener('mouseup', function(event) {
    isDragging = false;
}); 