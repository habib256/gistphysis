// Importation des modules du système solaire et des contrôles
import { setupSolarSystem } from './System.js';
import { setupControls, updateCameraPosition } from './Control.js';

// Création de la scène, de la caméra et du rendu
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// *** Ajout d'une ambient light très faible ***
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Intensité très faible (0.1)
scene.add(ambientLight);

// Position initiale de la caméra avec une élévation de 45°:
// Pour 45°, le rapport entre la composante verticale et la distance horizontale doit être égal à tan(45°)=1
// On choisit par exemple posX = posZ = 20, ce qui impose y = √(20²+20²) ≈ 28.28.
const posX = 20;
const posZ = 20;
camera.position.set(posX, Math.sqrt(posX * posX + posZ * posZ), posZ);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Création du système solaire et ajout des planètes dans la scène
const system = setupSolarSystem(scene);

// Lumière ponctuelle (Soleil) pour éclairer toutes les planètes
const sunLight = new THREE.PointLight(0xffffff, 1.0, 0, 2);
sunLight.position.copy(system.sun.position); // Positionne la lumière au centre du Soleil
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
// Ajout de la lumière à la scène
scene.add(sunLight);

// Configuration des contrôles via Control.js
const controls = setupControls(camera);

// Variable contenant la cible actuelle de la caméra
// Par défaut, la cible est le Soleil.
let currentTarget = system.sun.position;

// Variables pour le référentiel du laboratoire (satellite géostationnaire)
let isLabReferential = false;
const labDistance = 15; // Distance du satellite géostationnaire par rapport au centre de la Terre
let labInitialRotation = 0; // Angle initial du satellite par rapport à la Terre

// Variables pour les contrôles de rotation autour de la Terre dans le référentiel du laboratoire
const labControls = {
    theta: 0, // Angle horizontal autour de la Terre
    phi: Math.PI / 4, // Angle vertical (élévation)
    radius: labDistance, // Distance par rapport à la Terre
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 }
};

// Création d'un objet 3D pour représenter le référentiel du laboratoire
const labReferential = new THREE.Object3D();
labReferential.position.set(0, 0, 0);
scene.add(labReferential);

// Point fixe sur la Terre que le satellite géostationnaire va suivre
const fixedPointOnEarth = new THREE.Object3D();
system.earth.mesh.add(fixedPointOnEarth);
fixedPointOnEarth.position.set(0, 0, system.earth.mesh.geometry.parameters.radius);
fixedPointOnEarth.rotation.y = labInitialRotation;

// Gestion du menu déroulant pour recentrer la caméra
const dropDown = document.getElementById("camera-dropdown");
dropDown.addEventListener("change", function() {
    isLabReferential = false; // Réinitialisation par défaut
    
    if (dropDown.value === "sun") {
        currentTarget = system.sun.position;
    } else if (dropDown.value === "earth") {
        currentTarget = system.earth.mesh.position;
    } else if (dropDown.value === "moon") {
        currentTarget = system.moon.mesh.position;
    } else if (dropDown.value === "mars") {
        currentTarget = system.mars.mesh.position;
    } else if (dropDown.value === "lab") {
        // Pour le référentiel du laboratoire, on active le mode satellite géostationnaire
        isLabReferential = true;
        // On capture la rotation actuelle de la Terre comme référence
        labInitialRotation = system.earth.mesh.rotation.y;
        // Réinitialisation des contrôles du laboratoire
        labControls.theta = 0;
        labControls.phi = Math.PI / 4;
        labControls.radius = labDistance;
        // On positionne initialement la caméra par rapport à la Terre
        updateLabReferential();
    }
    
    // On recentre immédiatement la caméra sur la nouvelle cible si ce n'est pas le référentiel du laboratoire
    if (!isLabReferential) {
        camera.lookAt(currentTarget);
    }
});

// Gestion des événements de souris pour le référentiel du laboratoire
window.addEventListener('mousedown', function(event) {
    if (isLabReferential) {
        labControls.isDragging = true;
        labControls.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
});

window.addEventListener('mousemove', function(event) {
    if (isLabReferential && labControls.isDragging) {
        const deltaX = event.clientX - labControls.previousMousePosition.x;
        const deltaY = event.clientY - labControls.previousMousePosition.y;
        
        // Mise à jour des angles de rotation
        labControls.theta += deltaX * 0.01;
        labControls.phi -= deltaY * 0.01;
        
        // Limiter l'angle vertical pour éviter les problèmes aux pôles
        labControls.phi = Math.max(0.1, Math.min(Math.PI - 0.1, labControls.phi));
        
        labControls.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
});

window.addEventListener('mouseup', function() {
    labControls.isDragging = false;
});

// Gestion du zoom avec la molette de la souris dans le référentiel du laboratoire
window.addEventListener('wheel', function(event) {
    if (isLabReferential) {
        event.preventDefault();
        labControls.radius += event.deltaY * 0.05;
        labControls.radius = Math.max(5, Math.min(50, labControls.radius));
    }
}, { passive: false });

// Fonction pour mettre à jour la position de la caméra dans le référentiel du laboratoire
function updateLabReferential() {
    // On calcule la position du point fixe sur la Terre dans l'espace mondial
    const worldPosition = new THREE.Vector3();
    fixedPointOnEarth.getWorldPosition(worldPosition);
    
    // On calcule la direction du vecteur allant du centre de la Terre au point fixe
    const earthToFixedPoint = new THREE.Vector3().subVectors(worldPosition, system.earth.mesh.position).normalize();
    
    // Création d'un système de coordonnées local autour du point fixe
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, earthToFixedPoint).normalize();
    const newUp = new THREE.Vector3().crossVectors(earthToFixedPoint, right).normalize();
    
    // Calcul de la position de la caméra en coordonnées sphériques autour du point fixe
    const x = labControls.radius * Math.sin(labControls.phi) * Math.cos(labControls.theta);
    const y = labControls.radius * Math.cos(labControls.phi);
    const z = labControls.radius * Math.sin(labControls.phi) * Math.sin(labControls.theta);
    
    // Conversion des coordonnées sphériques en coordonnées cartésiennes dans le système local
    const offset = new THREE.Vector3();
    offset.addScaledVector(earthToFixedPoint, z);
    offset.addScaledVector(newUp, y);
    offset.addScaledVector(right, x);
    
    // Position finale de la caméra
    camera.position.copy(system.earth.mesh.position).add(offset);
    
    // La caméra regarde toujours vers la Terre
    camera.lookAt(system.earth.mesh.position);
}

document.addEventListener('DOMContentLoaded', function() {
  // Récupération de l'élément bouton pour masquer/afficher les orbites
  const toggleOrbitBtn = document.getElementById("toggle-orbits-btn");
  let orbitsVisible = true;

  toggleOrbitBtn.addEventListener("click", function() {
    // Bascule de l'état de visibilité
    orbitsVisible = !orbitsVisible;
    
    // Récupération des orbites par leur nom et modification de leur visibilité
    const earthOrbit = scene.getObjectByName("earthOrbitPath");
    if (earthOrbit) earthOrbit.visible = orbitsVisible;
    
    const marsOrbit = scene.getObjectByName("marsOrbitPath");
    if (marsOrbit) marsOrbit.visible = orbitsVisible;
    
    // Pour la Lune, l'orbite est ajoutée au maillage de la Terre
    const moonOrbit = system.earth.mesh.getObjectByName("moonOrbitPath");
    if (moonOrbit) moonOrbit.visible = orbitsVisible;
    
    // Mise à jour du texte du bouton
    toggleOrbitBtn.textContent = orbitsVisible ? "🛰️ Masquer les orbites" : "🛰️ Afficher les orbites";
  });
});

// Fonction d'animation
function animate() {
    requestAnimationFrame(animate);
    
    // Mise à jour des orbites et rotations des planètes
    system.earth.update();
    system.moon.update();
    system.mars.update();
    
    // Si nous sommes dans le référentiel du laboratoire, on met à jour la position de la caméra
    // pour qu'elle reste fixe par rapport à un point de la surface terrestre (comme un satellite géostationnaire)
    if (isLabReferential) {
        updateLabReferential();
    } else {
        // Sinon, on utilise la mise à jour normale de la caméra
        updateCameraPosition(camera, currentTarget, controls);
    }
    
    renderer.render(scene, camera);
}

animate(); 