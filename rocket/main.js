// Point d'entrée de l'application

let gameController = null;
let eventBus = null;

// Fonction d'initialisation
function init() {
    // Créer le canvas
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    
    // Créer l'EventBus pour la communication
    eventBus = new EventBus();
    window.eventBus = eventBus; // Rendre l'EventBus accessible globalement
    
    // Créer les contrôleurs avec l'EventBus
    const inputController = new InputController(eventBus);
    const renderingController = new RenderingController(eventBus);
    
    // Créer et initialiser le contrôleur de jeu
    gameController = new GameController(eventBus);
    
    // Initialiser avec les dépendances
    gameController.setControllers({
        inputController,
        renderingController
    });
    
    // Initialiser le jeu
    gameController.init(canvas);
    
    // Afficher les instructions
    showInstructions();
}

// Arrêter le jeu et nettoyer
function cleanup() {
    if (gameController) {
        gameController.cleanup();
    }
}

// Nettoyer lors du déchargement de la page
window.addEventListener('beforeunload', cleanup);

// Attendre que le DOM soit chargé pour initialiser l'application
document.addEventListener('DOMContentLoaded', init);

// Afficher des instructions pour le joueur
function showInstructions() {
    const instructions = document.getElementById('instructions');
    if (!instructions) return; // Si l'élément n'existe pas, ne rien faire
    
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
} 