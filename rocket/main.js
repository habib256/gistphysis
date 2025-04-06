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
    
    // Configurer le style du canvas
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = 'black';
    
    // Créer l'EventBus pour la communication
    eventBus = new EventBus();
    
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