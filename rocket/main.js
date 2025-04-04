// Point d'entrée de l'application

// Fonction d'initialisation
function init() {
    // Créer le canvas
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    
    // Configurer le style du canvas
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = 'black';
    
    // Créer et initialiser le contrôleur de jeu
    const gameController = new GameController();
    gameController.init(canvas);
    
    // Afficher des instructions
    showInstructions();
}

// Afficher des instructions pour le joueur
function showInstructions() {
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.top = '10px';
    instructions.style.right = '10px';
    instructions.style.color = 'white';
    instructions.style.padding = '20px';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    instructions.style.borderRadius = '5px';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.zIndex = '100';
    instructions.style.maxWidth = '300px';
    
    instructions.innerHTML = `
        <h3>Contrôles</h3>
        <p>↑ ou W: Propulsion avant</p>
        <p>↓ ou S: Propulsion arrière</p>
        <p>← ou A: Rotation gauche</p>
        <p>→ ou D: Rotation droite</p>
        <p>R: Réinitialiser la fusée</p>
        <p>C: Centrer la caméra</p>
        <p>+ / -: Zoom</p>
        <p>Echap: Pause</p>
    `;
    
    // Ajouter un bouton pour fermer les instructions
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Fermer';
    closeButton.style.marginTop = '10px';
    closeButton.style.padding = '5px 10px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = function() {
        instructions.style.display = 'none';
    };
    
    instructions.appendChild(closeButton);
    document.body.appendChild(instructions);
}

// Attendre que le DOM soit chargé pour initialiser l'application
document.addEventListener('DOMContentLoaded', init); 