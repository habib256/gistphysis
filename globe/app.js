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

// Gestion du menu déroulant pour recentrer la caméra
const dropDown = document.getElementById("camera-dropdown");
dropDown.addEventListener("change", function() {
    if (dropDown.value === "sun") {
        currentTarget = system.sun.position;
    } else if (dropDown.value === "earth") {
        currentTarget = system.earth.mesh.position;
    } else if (dropDown.value === "moon") {
        currentTarget = system.moon.mesh.position;
    } else if (dropDown.value === "mars") {
        currentTarget = system.mars.mesh.position;
    }
    // On recentre immédiatement la caméra sur la nouvelle cible
    camera.lookAt(currentTarget);
});

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
    toggleOrbitBtn.textContent = orbitsVisible ? "Masquer les orbites" : "Afficher les orbites";
  });
});

// Fonction d'animation
function animate() {
    requestAnimationFrame(animate);
    
    // Mise à jour des orbites et rotations des planètes
    system.earth.update();
    system.moon.update();
    system.mars.update();
    
    // Mise à jour de la position de la caméra en ciblant currentTarget
    updateCameraPosition(camera, currentTarget, controls);
    
    renderer.render(scene, camera);
    

}

animate(); 