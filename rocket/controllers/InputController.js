class InputController {
    constructor(eventBus) {
        // Référence à l'EventBus
        this.eventBus = eventBus;
        
        // État des touches
        this.keys = {};
        this.lastKeys = {};
        
        // Initialiser le mappage des touches
        this.initKeyMap();
        
        // Initialiser les événements du clavier
        this.initKeyboardEvents();
    }
    
    // Définir le mappage par défaut des touches
    initKeyMap() {
        this.keyMap = {
            'ArrowUp': 'thrustForward',
            'ArrowDown': 'thrustBackward',
            'ArrowLeft': 'rotateLeft',
            'ArrowRight': 'rotateRight',
            'Space': 'boost',
            'KeyW': 'thrustForward',
            'KeyS': 'thrustBackward',
            'KeyA': 'rotateLeft',
            'KeyD': 'rotateRight',
            'KeyR': 'resetRocket',
            'KeyC': 'centerCamera',
            'KeyV': 'toggleForces',
            'Equal': 'zoomIn',
            'Minus': 'zoomOut',
            'BracketLeft': 'slowDown',
            'BracketRight': 'speedUp',
            'Escape': 'pauseGame'
        };
    }
    
    initKeyboardEvents() {
        // Écouter les événements du clavier
        window.addEventListener('keydown', (event) => {
            const key = event.code;
            this.keys[key] = true;
            
            // Émettre un événement keydown avec l'EventBus
            const action = this.keyMap[key];
            this.eventBus.emit('INPUT_KEYDOWN', { key, action });
        });
        
        window.addEventListener('keyup', (event) => {
            const key = event.code;
            this.keys[key] = false;
            
            // Émettre un événement keyup avec l'EventBus
            const action = this.keyMap[key];
            this.eventBus.emit('INPUT_KEYUP', { key, action });
        });
        
        // Écouter les événements de la souris pour le zoom et le déplacement
        window.addEventListener('wheel', (event) => {
            const delta = Math.sign(event.deltaY) * -1;
            this.eventBus.emit('INPUT_WHEEL', { delta });
        }, { passive: true });
        
        // Méthode d'aide pour créer des gestionnaires d'événements similaires
        this.setupPointerEvents();
    }
    
    // Configuration des événements de pointeur (souris et tactile)
    setupPointerEvents() {
        // Gestionnaires de souris
        this.addPointerEventListener('mousedown', 'INPUT_MOUSEDOWN', true);
        this.addPointerEventListener('mousemove', 'INPUT_MOUSEMOVE', false);
        this.addPointerEventListener('mouseup', 'INPUT_MOUSEUP', true);
        
        // Gestionnaires tactiles
        this.addTouchEventListener('touchstart', 'INPUT_TOUCHSTART', false);
        this.addTouchEventListener('touchmove', 'INPUT_TOUCHMOVE', false);
        this.addTouchEventListener('touchend', 'INPUT_TOUCHEND', false);
    }
    
    // Fonction d'aide pour ajouter des écouteurs d'événements de souris
    addPointerEventListener(eventType, busEventType, includeButton) {
        window.addEventListener(eventType, (event) => {
            const data = {
                x: event.clientX,
                y: event.clientY
            };
            
            if (includeButton) {
                data.button = event.button;
            }
            
            this.eventBus.emit(busEventType, data);
        });
    }
    
    // Fonction d'aide pour ajouter des écouteurs d'événements tactiles
    addTouchEventListener(eventType, busEventType, preventDefault) {
        window.addEventListener(eventType, (event) => {
            let data = {};
            
            if (event.touches && event.touches.length > 0) {
                const touch = event.touches[0];
                data = {
                    x: touch.clientX,
                    y: touch.clientY
                };
            }
            
            this.eventBus.emit(busEventType, data);
            
            if (preventDefault) {
                event.preventDefault();
            }
        }, { passive: !preventDefault });
    }
    
    // Mettre à jour l'état des touches à chaque frame
    update() {
        // Vérifier les touches qui viennent d'être pressées
        for (const key in this.keys) {
            if (this.keys[key] && !this.lastKeys[key]) {
                // Touche vient d'être pressée
                const action = this.keyMap[key];
                if (action) {
                    this.eventBus.emit('INPUT_KEYPRESS', { key, action });
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
    
    // Configurer une nouvelle touche pour une action
    mapKey(key, action) {
        this.keyMap[key] = action;
        this.eventBus.emit('INPUT_KEYMAP_CHANGED', { key, action });
    }
    
    // Réinitialiser la configuration des touches
    resetKeyMap() {
        this.initKeyMap();
        this.eventBus.emit('INPUT_KEYMAP_RESET', {});
    }
} 