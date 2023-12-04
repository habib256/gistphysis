class Data {
    constructor() {
        this.points = [];
    }

    // Ajoute un nouveau point à la liste avec le temps
    addPoint(x, y, time) {
        this.points.push({x: x, y: y, time: time});
    }

    // Renvoie tous les points
    getAllPoints() {
        return this.points;
    }

    // Supprime tous les points
    clearPoints() {
        this.points = [];
    }

    // Supprime le dernier point
    removePoint() {
        this.points.pop();
    }
}
