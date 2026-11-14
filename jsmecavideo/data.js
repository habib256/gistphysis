// data.js — points pointés et mesures qui en découlent
//
// Un seul repère pour les données : les pixels natifs de la vidéo (ou de la webcam).
// Chaque point est rattaché à son numéro d'image k ; il garde sa position en pixels vidéo
// (xpx vers la droite, ypx vers le HAUT depuis le coin bas-gauche de l'image). Rien ne
// dépend de la taille d'affichage. Les mètres sont calculés à la lecture avec l'échelle
// courante (mètres par pixel vidéo) : un nouvel étalonnage s'applique à tous les points.

// Couleurs Okabe-Ito (lisibles par les daltoniens) et formes : un mobile se reconnaît
// aussi sans la couleur (× + ○ □), sur l'image comme dans les graphiques.
const MOBILES_STYLE = [
    { r: 213, g: 94, b: 0, hex: '#D55E00', forme: 'croix', symbole: '×', chart: 'crossRot', nom: 'orange foncé' },
    { r: 0, g: 114, b: 178, hex: '#0072B2', forme: 'plus', symbole: '+', chart: 'cross', nom: 'bleu' },
    { r: 0, g: 158, b: 115, hex: '#009E73', forme: 'rond', symbole: '○', chart: 'circle', nom: 'vert' },
    { r: 230, g: 159, b: 0, hex: '#E69F00', forme: 'carre', symbole: '□', chart: 'rect', nom: 'jaune orangé' }
];

class Data {
    constructor() {
        this.numMobiles = 1;     // nombre de mobiles suivis (1 à 4)
        this.points = [[]];      // un tableau par mobile, trié par numéro d'image
        this.framerate = 25;     // images par seconde de la source
        this.echelle = null;     // mètres par pixel vidéo (null = pas d'étalonnage)
        this.historique = [];    // actions annulables : {m, image, ancien}
        this.colors = MOBILES_STYLE;
    }

    setNumMobiles(num) {
        this.numMobiles = Math.max(1, Math.min(num, 4));
        this.clearAllPoints();
    }

    getColor(m) { return MOBILES_STYLE[m % MOBILES_STYLE.length]; }

    // Point du mobile m à l'image k (ou null)
    pointA(m, k) {
        return (this.points[m] || []).find(p => p.image === k) || null;
    }

    // Premier mobile qui n'a pas encore de point à l'image k (-1 si tous en ont un)
    mobileAPointer(k) {
        for (let m = 0; m < this.numMobiles; m++) {
            if (!this.pointA(m, k)) return m;
        }
        return -1;
    }

    // Plus grand numéro d'image pointé (tous mobiles), -1 sans point
    derniereImagePointee() {
        let k = -1;
        this.points.forEach(pts => pts.forEach(p => { if (p.image > k) k = p.image; }));
        return k;
    }

    premiereImagePointee() {
        let k = Infinity;
        this.points.forEach(pts => pts.forEach(p => { if (p.image < k) k = p.image; }));
        return k === Infinity ? 0 : k;
    }

    // Enregistre (ou remplace) le point du mobile m à l'image k.
    // Renvoie 'ajout' (après le dernier point), 'insertion' (avant) ou 'remplacement'.
    placer(m, k, xpx, ypx) {
        let pts = this.points[m];
        let ancien = this.pointA(m, k);
        let derniere = this.derniereImagePointee();
        let nouveau = { image: k, xpx: xpx, ypx: ypx };
        if (ancien) {
            pts[pts.indexOf(ancien)] = nouveau;
        } else {
            pts.push(nouveau);
            pts.sort((a, b) => a.image - b.image);
        }
        this.historique.push({ m: m, image: k, ancien: ancien });
        if (ancien) return 'remplacement';
        return k < derniere ? 'insertion' : 'ajout';
    }

    // Annule la dernière action (ajout ou remplacement) ; renvoie {m, image} ou null
    annuler() {
        let action = this.historique.pop();
        if (!action) return null;
        let pts = this.points[action.m];
        let i = pts.findIndex(p => p.image === action.image);
        if (action.ancien) {
            if (i >= 0) pts[i] = action.ancien;
        } else if (i >= 0) {
            pts.splice(i, 1);
        }
        return { m: action.m, image: action.image };
    }

    // Numéro (1, 2, 3…) du point du mobile m à l'image k
    numeroDuPoint(m, k) {
        return this.points[m].findIndex(p => p.image === k) + 1;
    }

    // Points d'un mobile (copie), avec t = durée depuis la première image pointée
    getPointsForMobile(m) {
        let k0 = this.premiereImagePointee();
        return (this.points[m] || []).map(p => ({
            image: p.image,
            xpx: p.xpx,
            ypx: p.ypx,
            time: (p.image - k0) / this.framerate,
            mobile: m
        }));
    }

    getAllPoints() {
        let tous = [];
        for (let m = 0; m < this.numMobiles; m++) tous = tous.concat(this.getPointsForMobile(m));
        return tous;
    }

    clearAllPoints() {
        this.points = [];
        for (let i = 0; i < this.numMobiles; i++) this.points.push([]);
        this.historique = [];
    }

    getPointCount(m = 0) { return m < this.points.length ? this.points[m].length : 0; }

    getTotalPointCount() {
        return this.points.reduce((s, pts) => s + pts.length, 0);
    }

    // Unité des positions : « m » si une échelle est validée, sinon « px »
    getUnite() { return this.echelle ? 'm' : 'px'; }

    // Positions d'un mobile dans l'unité courante
    getPositions(m = 0) {
        let f = this.echelle || 1;
        return this.getPointsForMobile(m).map((p, i) => ({
            numero: i + 1,
            image: p.image,
            time: p.time,
            x: p.xpx * f,
            y: p.ypx * f
        }));
    }

    // Lecture de la chronophotographie : pour chaque intervalle entre deux points successifs,
    // la distance parcourue d, la durée Δt et la vitesse moyenne v = d / Δt.
    getIntervalles(m = 0) {
        let pos = this.getPositions(m);
        let intervalles = [];
        for (let i = 1; i < pos.length; i++) {
            let a = pos[i - 1], b = pos[i];
            let duree = b.time - a.time;
            if (!(duree > 1e-9)) continue;
            let d = Math.hypot(b.x - a.x, b.y - a.y);
            intervalles.push({ de: a.numero, a: b.numero, duree: duree, d: d, v: d / duree });
        }
        return intervalles;
    }

    // Vitesses par dérivation centrée : v[i] = (pos[i+1] - pos[i-1]) / (t[i+1] - t[i-1])
    getVelocities(m = 0) {
        let pts = this.getPositions(m);
        let velocities = [];
        for (let i = 1; i < pts.length - 1; i++) {
            let dt = pts[i + 1].time - pts[i - 1].time;
            if (dt > 0) {
                let vx = (pts[i + 1].x - pts[i - 1].x) / dt;
                let vy = (pts[i + 1].y - pts[i - 1].y) / dt;
                velocities.push({ time: pts[i].time, vx: vx, vy: vy, v: Math.hypot(vx, vy), x: pts[i].x, y: pts[i].y });
            }
        }
        return velocities;
    }

    // Accélérations par dérivation centrée sur les vitesses
    getAccelerations(m = 0) {
        let velocities = this.getVelocities(m);
        let accelerations = [];
        for (let i = 1; i < velocities.length - 1; i++) {
            let dt = velocities[i + 1].time - velocities[i - 1].time;
            if (dt > 0) {
                let ax = (velocities[i + 1].vx - velocities[i - 1].vx) / dt;
                let ay = (velocities[i + 1].vy - velocities[i - 1].vy) / dt;
                accelerations.push({ time: velocities[i].time, ax: ax, ay: ay, a: Math.hypot(ax, ay), x: velocities[i].x, y: velocities[i].y });
            }
        }
        return accelerations;
    }

    // Pour la sauvegarde de la séance (sessionStorage)
    serialiser() {
        return { numMobiles: this.numMobiles, points: this.points, historique: this.historique };
    }

    restaurer(o) {
        if (!o || !Array.isArray(o.points)) return false;
        this.numMobiles = Math.max(1, Math.min(4, o.numMobiles | 0 || 1));
        this.points = [];
        for (let m = 0; m < this.numMobiles; m++) {
            let pts = Array.isArray(o.points[m]) ? o.points[m] : [];
            this.points.push(pts.filter(p => p && isFinite(p.image) && isFinite(p.xpx) && isFinite(p.ypx))
                .map(p => ({ image: p.image | 0, xpx: +p.xpx, ypx: +p.ypx }))
                .sort((a, b) => a.image - b.image));
        }
        this.historique = Array.isArray(o.historique) ? o.historique.filter(a => a && a.m < this.numMobiles) : [];
        return true;
    }
}
