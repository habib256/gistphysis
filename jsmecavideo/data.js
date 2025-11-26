class Data {
    constructor() {
        this.numMobiles = 1; // Nombre de mobiles à suivre
        this.currentMobile = 0; // Mobile actuellement sélectionné (0-indexé)
        this.points = [[]]; // Tableau de tableaux de points (un par mobile)
        
        // Couleurs pour différencier les mobiles
        this.colors = [
            { r: 255, g: 0, b: 0 },     // Rouge
            { r: 0, g: 0, b: 255 },     // Bleu
            { r: 0, g: 200, b: 0 },     // Vert
            { r: 255, g: 165, b: 0 }    // Orange
        ];
    }

    // Définit le nombre de mobiles à suivre
    setNumMobiles(num) {
        this.numMobiles = Math.min(num, 4); // Maximum 4 mobiles
        // Initialise les tableaux de points pour chaque mobile
        while (this.points.length < this.numMobiles) {
            this.points.push([]);
        }
        this.currentMobile = 0;
    }

    // Retourne le mobile courant
    getCurrentMobile() {
        return this.currentMobile;
    }

    // Passe au mobile suivant (appelé après chaque pointage)
    nextMobile() {
        this.currentMobile = (this.currentMobile + 1) % this.numMobiles;
        return this.currentMobile;
    }

    // Retourne la couleur du mobile spécifié
    getColor(mobileIndex) {
        return this.colors[mobileIndex % this.colors.length];
    }

    // Retourne la couleur du mobile courant
    getCurrentColor() {
        return this.getColor(this.currentMobile);
    }

    // Ajoute un nouveau point à la liste pour le mobile courant
    // avec le temps en seconde ainsi que x et y en mètres.
    addPoint(time, x, y) {
        this.points[this.currentMobile].push({
            time: time, 
            x: x, 
            y: y,
            mobile: this.currentMobile
        });
        
        // Passe au mobile suivant si multi-points
        if (this.numMobiles > 1) {
            this.nextMobile();
        }
    }

    // Renvoie tous les points de tous les mobiles (format plat)
    getAllPoints() {
        let allPoints = [];
        for (let i = 0; i < this.points.length; i++) {
            for (let j = 0; j < this.points[i].length; j++) {
                allPoints.push(this.points[i][j]);
            }
        }
        return allPoints;
    }

    // Renvoie les points d'un mobile spécifique
    getPointsForMobile(mobileIndex) {
        if (mobileIndex >= 0 && mobileIndex < this.points.length) {
            return this.points[mobileIndex];
        }
        return [];
    }

    // Supprime tous les points
    clearAllPoints() {
        this.points = [];
        for (let i = 0; i < this.numMobiles; i++) {
            this.points.push([]);
        }
        this.currentMobile = 0;
    }

    // Supprime le dernier point (du mobile précédent si multi-points)
    removeLastPoint() {
        if (this.numMobiles > 1) {
            // Revient au mobile précédent
            this.currentMobile = (this.currentMobile - 1 + this.numMobiles) % this.numMobiles;
        }
        
        if (this.points[this.currentMobile].length > 0) {
            this.points[this.currentMobile].pop();
        }
    }

    // Calcule les vitesses pour un mobile donné
    // Utilise la dérivation centrée : v[i] = (pos[i+1] - pos[i-1]) / (2 * dt)
    getVelocities(mobileIndex = 0) {
        let pts = this.getPointsForMobile(mobileIndex);
        let velocities = [];
        
        if (pts.length < 3) return velocities;
        
        for (let i = 1; i < pts.length - 1; i++) {
            let dt = pts[i + 1].time - pts[i - 1].time;
            if (dt > 0) {
                let vx = (pts[i + 1].x - pts[i - 1].x) / dt;
                let vy = (pts[i + 1].y - pts[i - 1].y) / dt;
                let v = Math.sqrt(vx * vx + vy * vy);
                velocities.push({
                    time: pts[i].time,
                    vx: vx,
                    vy: vy,
                    v: v,
                    x: pts[i].x,
                    y: pts[i].y
                });
            }
        }
        
        return velocities;
    }

    // Calcule les accélérations pour un mobile donné
    // Utilise la dérivation centrée sur les vitesses
    getAccelerations(mobileIndex = 0) {
        let velocities = this.getVelocities(mobileIndex);
        let accelerations = [];
        
        if (velocities.length < 3) return accelerations;
        
        for (let i = 1; i < velocities.length - 1; i++) {
            let dt = velocities[i + 1].time - velocities[i - 1].time;
            if (dt > 0) {
                let ax = (velocities[i + 1].vx - velocities[i - 1].vx) / dt;
                let ay = (velocities[i + 1].vy - velocities[i - 1].vy) / dt;
                let a = Math.sqrt(ax * ax + ay * ay);
                accelerations.push({
                    time: velocities[i].time,
                    ax: ax,
                    ay: ay,
                    a: a,
                    x: velocities[i].x,
                    y: velocities[i].y
                });
            }
        }
        
        return accelerations;
    }

    // Retourne le nombre de points pour le mobile courant
    getPointCount(mobileIndex = 0) {
        if (mobileIndex < this.points.length) {
            return this.points[mobileIndex].length;
        }
        return 0;
    }

    // Retourne le nombre total de points tous mobiles confondus
    getTotalPointCount() {
        let total = 0;
        for (let i = 0; i < this.points.length; i++) {
            total += this.points[i].length;
        }
        return total;
    }
}
