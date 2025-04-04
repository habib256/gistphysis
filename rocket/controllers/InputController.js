class InputController {
    constructor() {
        // État des touches
        this.keys = {};
        this.lastKeys = {};
        
        // Handlers pour les callbacks
        this.keyDownHandlers = {};
        this.keyUpHandlers = {};
        this.keyPressHandlers = {};
        
        // Mapper les touches aux actions
        this.keyMap = {
            'ArrowUp': 'thrustForward',
            'ArrowDown': 'thrustBackward',
            'ArrowLeft': 'rotateLeft',
            'ArrowRight': 'rotateRight',
            'Space': 'fireMainThrusters',
            'KeyW': 'thrustForward',
            'KeyS': 'thrustBackward',
            'KeyA': 'rotateLeft',
            'KeyD': 'rotateRight',
            'ShiftLeft': 'boost',
            'KeyR': 'resetRocket',
            'KeyC': 'centerCamera',
            'KeyG': 'toggleGravityVector',
            'Equal': 'zoomIn',
            'Minus': 'zoomOut',
            'Escape': 'pauseGame'
        };
        
        // Initialiser les événements du clavier
        this.initKeyboardEvents();
    }
    
    initKeyboardEvents() {
        // Écouter les événements du clavier
        window.addEventListener('keydown', (event) => {
            const key = event.code;
            this.keys[key] = true;
            
            // Appeler les handlers pour cette touche
            if (this.keyDownHandlers[key]) {
                this.keyDownHandlers[key](event);
            }
            
            // Appeler les handlers pour l'action mappée
            const action = this.keyMap[key];
            if (action && this.keyDownHandlers[action]) {
                this.keyDownHandlers[action](event);
            }
        });
        
        window.addEventListener('keyup', (event) => {
            const key = event.code;
            this.keys[key] = false;
            
            // Appeler les handlers pour cette touche
            if (this.keyUpHandlers[key]) {
                this.keyUpHandlers[key](event);
            }
            
            // Appeler les handlers pour l'action mappée
            const action = this.keyMap[key];
            if (action && this.keyUpHandlers[action]) {
                this.keyUpHandlers[action](event);
            }
        });
    }
    
    // Mettre à jour l'état des touches à chaque frame
    update() {
        // Vérifier les touches qui viennent d'être pressées
        for (const key in this.keys) {
            if (this.keys[key] && !this.lastKeys[key]) {
                // Touche vient d'être pressée
                if (this.keyPressHandlers[key]) {
                    this.keyPressHandlers[key]();
                }
                
                // Vérifier l'action mappée
                const action = this.keyMap[key];
                if (action && this.keyPressHandlers[action]) {
                    this.keyPressHandlers[action]();
                }
            }
        }
        
        // Sauvegarder l'état actuel des touches pour la prochaine frame
        this.lastKeys = {...this.keys};
    }
    
    // Vérifier si une touche est actuellement pressée
    isKeyDown(keyCode) {
        return this.keys[keyCode] === true;
    }
    
    // Vérifier si une action est actuellement active
    isActionActive(action) {
        // Trouver toutes les touches qui déclenchent cette action
        for (const key in this.keyMap) {
            if (this.keyMap[key] === action && this.keys[key]) {
                return true;
            }
        }
        return false;
    }
    
    // Enregistrer un handler pour un événement keydown
    onKeyDown(key, handler) {
        this.keyDownHandlers[key] = handler;
    }
    
    // Enregistrer un handler pour un événement keyup
    onKeyUp(key, handler) {
        this.keyUpHandlers[key] = handler;
    }
    
    // Enregistrer un handler pour un événement keypress (appuyé puis relâché)
    onKeyPress(key, handler) {
        this.keyPressHandlers[key] = handler;
    }
    
    // Configurer une nouvelle touche pour une action
    mapKey(key, action) {
        this.keyMap[key] = action;
    }
    
    // Réinitialiser la configuration des touches
    resetKeyMap() {
        this.keyMap = {
            'ArrowUp': 'thrustForward',
            'ArrowDown': 'thrustBackward',
            'ArrowLeft': 'rotateLeft',
            'ArrowRight': 'rotateRight',
            'Space': 'fireMainThrusters',
            'KeyW': 'thrustForward',
            'KeyS': 'thrustBackward',
            'KeyA': 'rotateLeft',
            'KeyD': 'rotateRight',
            'ShiftLeft': 'boost',
            'KeyR': 'resetRocket',
            'KeyC': 'centerCamera',
            'KeyG': 'toggleGravityVector',
            'Equal': 'zoomIn',
            'Minus': 'zoomOut',
            'Escape': 'pauseGame'
        };
    }
} 