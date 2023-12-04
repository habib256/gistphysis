class Data {
    constructor() {
        this.points = [];
    }

    // Ajoute un nouveau point à la liste
    addPoint(x, y) {
        this.points.push({x: x, y: y});
    }

    // Renvoie tous les points
    getAllPoints() {
        return this.points;
    }

    // Supprime tous les points
    clearPoints() {
        this.points = [];
    }

    removePoint(x, y) {
        this.points.pop();
    }
}
