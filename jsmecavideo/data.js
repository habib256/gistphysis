class Data {
    constructor() {
        this.trajectories = [];
    }

    // Ajoute une nouvelle trajectoire à la liste
    addTrajectory(x, y) {
        this.trajectories.push({x: x, y: y});
    }

    // Renvoie toutes les trajectoires
    getAllTrajectories() {
        return this.trajectories;
    }

    // Supprime toutes les trajectoires
    clearTrajectories() {
        this.trajectories = [];
    }
}
