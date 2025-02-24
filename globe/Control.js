// Fichier: Control.js
// Ce fichier gère les contrôles de la caméra et les interactions utilisateur

export function setupControls(camera) {
    // Objet de contrôle initial
    const controls = {
        cameraTheta: 0,          // Angle horizontal (azimut)
        cameraPhi: Math.PI / 2,    // Angle vertical (polar)
        cameraRadius: 50,         // Distance initiale augmentée pour voir l'orbite de Mars en entier
        isDragging: false,
        previousMousePosition: { x: 0, y: 0 },
    };

    // Gestion du zoom avec la roulette de la souris
    window.addEventListener('wheel', function(event) {
        event.preventDefault();
        controls.cameraRadius += event.deltaY * 0.01;
        controls.cameraRadius = Math.max(5, Math.min(150, controls.cameraRadius));
    }, { passive: false });

    // Début du glissement (clic de souris)
    window.addEventListener('mousedown', function(event) {
        controls.isDragging = true;
        controls.previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    // Mouvement de la souris
    window.addEventListener('mousemove', function(event) {
        if (controls.isDragging) {
            const deltaX = event.clientX - controls.previousMousePosition.x;
            const deltaY = event.clientY - controls.previousMousePosition.y;
            controls.cameraTheta -= deltaX * 0.005;
            controls.cameraPhi   -= deltaY * 0.005;
            // Limiter l'angle vertical pour éviter un retournement
            controls.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, controls.cameraPhi));
        }
        controls.previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    // Fin du glissement (relâchement de la souris)
    window.addEventListener('mouseup', function(event) {
        controls.isDragging = false;
    });

    return controls;
}

// Met à jour la position de la caméra en fonction des paramètres de contrôle et d'une position cible
export function updateCameraPosition(camera, targetPosition, controls) {
    camera.position.x = controls.cameraRadius * Math.sin(controls.cameraPhi) * Math.cos(controls.cameraTheta) + targetPosition.x;
    camera.position.y = controls.cameraRadius * Math.cos(controls.cameraPhi) + targetPosition.y;
    camera.position.z = controls.cameraRadius * Math.sin(controls.cameraPhi) * Math.sin(controls.cameraTheta) + targetPosition.z;
    camera.lookAt(targetPosition);
} 