class Data {
    constructor() {
        this.points = [];
    }

    // Ajoute un nouveau point à la liste avec 
    // le temps en seconde ainsi que x et y en mètres.
    addPoint(time, x, y) {
        this.points.push({time: time, x: x, y: y});
    }

    // Renvoie tous les points
    getAllPoints() {
        return this.points;
    }

    // Supprime tous les points
    clearAllPoints() {
        this.points = [];
    }

    // Supprime le dernier point
    removeLastPoint() {
        this.points.pop();
    }
}
