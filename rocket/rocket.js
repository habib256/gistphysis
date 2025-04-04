class Rocket {
    constructor(x, y) {
        this.x = x; // Position horizontale
        this.y = y; // Position verticale
        this.engines = {
            main: { isOn: false, power: 0 },
            left: { isOn: false, power: 0 },
            right: { isOn: false, power: 0 }
        };
    }

    // Méthode pour allumer/éteindre un réacteur
    toggleEngine(engineName, isOn) {
        if (this.engines[engineName]) {
            this.engines[engineName].isOn = isOn;
        }
    }

    // Méthode pour régler la puissance d'un réacteur
    setEnginePower(engineName, power) {
        if (this.engines[engineName]) {
            this.engines[engineName].power = Math.max(0, Math.min(100, power));
        }
    }

    // Méthode pour obtenir l'état d'un réacteur
    getEngineStatus(engineName) {
        return this.engines[engineName] ? this.engines[engineName] : null;
    }

    // Méthode pour déplacer la fusée
    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    // Méthode pour obtenir la position actuelle
    getPosition() {
        return { x: this.x, y: this.y };
    }
}

// Exemple d'utilisation :
const rocket = new Rocket(0, 0);
rocket.toggleEngine('main', true);
rocket.setEnginePower('main', 75);
rocket.move(10, 20);
console.log(rocket.getPosition()); 