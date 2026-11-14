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

// Décimales utiles pour une grandeur dont la plus petite variation mesurable vaut `pas`
// (négatif pour les grands nombres : -6 = arrondi au million, pour l'animation en km)
function decimalesUtiles(pas, max = 6) {
    if (!(pas > 0)) return 0;
    return Math.max(-9, Math.min(max, Math.ceil(-Math.log10(pas) - 1e-9)));
}

function arrondi(x, dec) {
    const f = Math.pow(10, dec);
    return Math.round(x * f) / f;
}

class Data {
    constructor() {
        this.numMobiles = 1;     // nombre de mobiles suivis (1 à 4)
        this.points = [[]];      // un tableau par mobile, trié par numéro d'image
        this.dureeImage = 0.04;  // durée entre deux images (dans l'unité de temps)
        this.instants = null;    // webcam : instant réel de chaque image (s), sinon null
        this.uniteTemps = 's';   // 's' ou 'jour' (animation astronomique)
        this.uniteLongueur = 'm';// unité d'affichage après étalonnage : 'm' ou 'km'
        this.echelle = null;     // mètres par pixel vidéo (null = pas d'étalonnage)
        this.historique = [];    // actions annulables : {m, image, ancien}
        this.colors = MOBILES_STYLE;
    }

    // Cadence et unités de la source (appelé à chaque changement de vidéo)
    configurer({ dureeImage, uniteTemps, uniteLongueur, instants }) {
        this.dureeImage = dureeImage;
        this.uniteTemps = uniteTemps || 's';
        this.uniteLongueur = uniteLongueur || 'm';
        this.instants = instants || null;
    }

    facteurLongueur() { return this.uniteLongueur === 'km' ? 1000 : 1; }

    // Instant de l'image k dans l'unité de temps, depuis la première image du fichier
    tempsImage(k) {
        if (this.instants && this.instants.length) {
            const i = Math.max(0, Math.min(k, this.instants.length - 1));
            return this.instants[i] - this.instants[0];
        }
        return k * this.dureeImage;
    }

    // Instant t de l'image k compté depuis le premier point (définition unique : ligne
    // d'état, tableau, graphiques, fichier)
    instant(k) {
        return this.tempsImage(k) - this.tempsImage(this.premiereImagePointee());
    }

    libelleTemps() { return this.uniteTemps === 'jour' ? 'jours' : 's'; }
    uniteVitesse() { return this.getUnite() + '/' + (this.uniteTemps === 'jour' ? 'jour' : 's'); }

    // Décimales communes à tout l'affichage (tableau, résumé, infobulles, fichier) :
    // positions et distances à 1 pixel vidéo près, vitesses à la même finesse, temps exacts
    formats() {
        const pasPos = this.echelle ? this.echelle / this.facteurLongueur() : 1;
        let dtMin = Infinity;
        for (let m = 0; m < this.numMobiles; m++) {
            this.intervallesBruts(m).forEach(iv => { if (iv.duree < dtMin) dtMin = iv.duree; });
        }
        if (!isFinite(dtMin)) dtMin = this.dureeImage * Math.max(1, typeof imagesParPoint !== 'undefined' ? imagesParPoint : 1);
        let decT;
        if (this.uniteTemps === 'jour') decT = decimalesPas(this.dureeImage);
        else if (this.instants) decT = 3;
        else decT = Math.abs(this.dureeImage * 1000 - Math.round(this.dureeImage * 1000)) < 1e-6 ? 3 : 4;
        // v est calculée avec les valeurs exactes, puis arrondie à la finesse de la mesure.
        // d reçoit assez de chiffres pour que d affichée / Δt affichée redonne v affichée à une
        // unité près de son dernier chiffre (erreur d'arrondi de d / Δt ≤ ½ unité de v).
        const pos = decimalesUtiles(pasPos);
        const v = decimalesUtiles(pasPos / dtMin);
        const d = Math.max(pos, Math.min(6, Math.ceil(v - Math.log10(dtMin) - 1e-9)));
        return { pos: pos, d: d, v: v, t: decT };
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

    // Points d'un mobile (copie), avec t = instant compté depuis le premier point
    getPointsForMobile(m) {
        return (this.points[m] || []).map(p => ({
            image: p.image,
            xpx: p.xpx,
            ypx: p.ypx,
            time: this.instant(p.image),
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

    // Unité des positions : « m » (ou « km ») si une échelle est validée, sinon « px »
    getUnite() { return this.echelle ? this.uniteLongueur : 'px'; }

    // Positions d'un mobile dans l'unité courante
    getPositions(m = 0) {
        let f = this.echelle ? this.echelle / this.facteurLongueur() : 1;
        return this.getPointsForMobile(m).map((p, i) => ({
            numero: i + 1,
            image: p.image,
            time: p.time,
            x: p.xpx * f,
            y: p.ypx * f
        }));
    }

    // Intervalles avant arrondi (d exact)
    intervallesBruts(m = 0) {
        let pos = this.getPositions(m);
        let intervalles = [];
        for (let i = 1; i < pos.length; i++) {
            let a = pos[i - 1], b = pos[i];
            let duree = b.time - a.time;
            if (!(duree > 1e-12)) continue;
            intervalles.push({ de: a.numero, a: b.numero, imageDe: a.image, imageA: b.image, tDe: a.time, tA: b.time,
                duree: duree, d: Math.hypot(b.x - a.x, b.y - a.y) });
        }
        return intervalles;
    }

    // Lecture de la chronophotographie : pour chaque intervalle entre deux points successifs,
    // la distance d parcourue, la durée Δt et la vitesse v = d / Δt (valeurs exactes ; elles sont
    // arrondies seulement à l'affichage, avec les décimales de formats()).
    getIntervalles(m = 0) {
        return this.intervallesBruts(m).map(iv => Object.assign(iv, { v: iv.d / iv.duree }));
    }

    // Vrai si toutes les durées Δt (tous mobiles) sont égales (à 2 % près)
    dureesEgales() {
        let durees = [];
        for (let m = 0; m < this.numMobiles; m++) durees = durees.concat(this.intervallesBruts(m).map(iv => iv.duree));
        if (durees.length < 2) return true;
        const min = Math.min(...durees), max = Math.max(...durees);
        return max - min <= 0.02 * min;
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

    // Vérifie strictement une sauvegarde ; renvoie faux (sans rien changer) si elle est
    // incohérente. nbImages : nombre d'images de la vidéo (0 si inconnu).
    static sauvegardeValide(o, nbImages) {
        if (!o || typeof o !== 'object') return false;
        const n = o.numMobiles;
        if (!Number.isInteger(n) || n < 1 || n > 4) return false;
        if (!Array.isArray(o.points) || o.points.length !== n) return false;
        const pointValide = p => p && typeof p === 'object' && Number.isInteger(p.image) && p.image >= 0 &&
            (!nbImages || p.image < nbImages) && Number.isFinite(p.xpx) && Number.isFinite(p.ypx) &&
            p.xpx >= 0 && p.ypx >= 0 && p.xpx < 10000 && p.ypx < 10000;
        for (const pts of o.points) {
            if (!Array.isArray(pts) || !pts.every(pointValide)) return false;
            if (new Set(pts.map(p => p.image)).size !== pts.length) return false;
        }
        if (o.historique !== undefined) {
            if (!Array.isArray(o.historique)) return false;
            for (const a of o.historique) {
                if (!a || !Number.isInteger(a.m) || a.m < 0 || a.m >= n || !Number.isInteger(a.image) || a.image < 0) return false;
                if (nbImages && a.image >= nbImages) return false;
                if (a.ancien !== null && a.ancien !== undefined && (!pointValide(a.ancien) || a.ancien.image !== a.image)) return false;
            }
        }
        return true;
    }

    restaurer(o, nbImages = 0) {
        if (!Data.sauvegardeValide(o, nbImages)) return false;
        this.numMobiles = o.numMobiles;
        this.points = o.points.map(pts => pts.map(p => ({ image: p.image, xpx: p.xpx, ypx: p.ypx })).sort((a, b) => a.image - b.image));
        this.historique = (o.historique || []).map(a => ({ m: a.m, image: a.image, ancien: a.ancien ? { image: a.ancien.image, xpx: a.ancien.xpx, ypx: a.ancien.ypx } : null }));
        return true;
    }
}
