// calibrator.js — étalonnage : deux points sur un objet de longueur connue
//
// Les deux points sont gardés en pixels vidéo (repère de l'image, y vers le bas) :
// l'échelle (mètres par pixel vidéo) ne dépend pas de la taille d'affichage.

// Lit une longueur saisie : « 80 cm », « 0,8 », « 0.8 m », « 800 mm », « 1,85m ».
// Sans unité, ce sont des mètres. Renvoie {metres, valeur, unite} ou {erreur}.
function lireLongueur(texte) {
    let s = String(texte || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return { erreur: 'Écris la longueur réelle, par exemple « 80 cm » ou « 0,8 m ».' };
    let m = /^(\d+(?:[.,]\d*)?|[.,]\d+)(mm|cm|dm|m|mètres?|metres?|centimètres?|centimetres?|millimètres?|millimetres?)?$/.exec(s);
    if (!m) return { erreur: 'Je ne comprends pas « ' + String(texte).trim() + ' » : écris un nombre suivi de m, cm ou mm (ex. : 80 cm).' };
    let valeur = parseFloat(m[1].replace(',', '.'));
    let unite = m[2] || 'm';
    if (/^cent/.test(unite)) unite = 'cm';
    else if (/^mil/.test(unite)) unite = 'mm';
    else if (/^m[eè]t/.test(unite)) unite = 'm';
    let facteur = { mm: 0.001, cm: 0.01, dm: 0.1, m: 1 }[unite];
    let metres = valeur * facteur;
    if (!(metres > 0)) return { erreur: 'La longueur doit être plus grande que zéro.' };
    return { metres: metres, valeur: valeur, unite: unite, sansUnite: !m[2] };
}

// « 0,80 m » (ou « 0,005 m ») : écriture en mètres sans zéros inutiles, au moins 2 décimales
function metresFr(metres) {
    let s = nombreFr(metres, 4).replace(/0+$/, '');
    if (/,\d?$/.test(s)) s = nombreFr(metres, 2);
    return s + ' m';
}

class Calibrator {
    constructor() {
        this.reset();
    }

    reset() {
        this.point1 = null;          // {x, y} en pixels vidéo (y vers le bas)
        this.point2 = null;
        this.realDistance = null;    // mètres
        this.saisie = '';            // texte saisi par l'élève (pour le réafficher)
        this.isCalibrated = false;
        this.state = 'waiting_point1'; // 'waiting_point1', 'waiting_point2', 'waiting_distance', 'calibrated'
        this.pixelDistance = 0;
        this.scaleFactor = null;     // mètres par pixel vidéo
    }

    // Ajoute un point d'étalonnage. Renvoie 'point1', 'point2' ou 'complet' (déjà deux points).
    addPoint(x, y) {
        if (this.state === 'waiting_point1') {
            this.point1 = { x: x, y: y };
            this.state = 'waiting_point2';
            return 'point1';
        }
        if (this.state === 'waiting_point2') {
            this.point2 = { x: x, y: y };
            this.pixelDistance = this.calculatePixelDistance();
            this.state = 'waiting_distance';
            return 'point2';
        }
        return 'complet';
    }

    // Déplace un des deux points (glisser) ; l'échelle suit si elle était validée
    deplacerPoint(i, x, y) {
        let p = i === 1 ? this.point1 : this.point2;
        if (!p) return;
        p.x = x;
        p.y = y;
        this.pixelDistance = this.calculatePixelDistance();
        if (this.isCalibrated && this.pixelDistance > 0) {
            this.scaleFactor = this.realDistance / this.pixelDistance;
        }
    }

    calculatePixelDistance() {
        if (this.point1 && this.point2) {
            return Math.hypot(this.point2.x - this.point1.x, this.point2.y - this.point1.y);
        }
        return 0;
    }

    // Définit la distance réelle (mètres) et calcule l'échelle
    setRealDistance(distance) {
        if (distance > 0 && this.pixelDistance > 0.5) {
            this.realDistance = distance;
            this.scaleFactor = distance / this.pixelDistance;
            this.isCalibrated = true;
            this.state = 'calibrated';
            return true;
        }
        return false;
    }

    // Texte de l'échelle : « 1 px = 1,44 mm »
    texteEchelle() {
        return this.scaleFactor ? '1 px = ' + nombreFr(this.scaleFactor * 1000, 2) + ' mm' : '';
    }

    // Consigne d'action selon l'état (pointeur : 'tactile' ou 'souris')
    getInstructionMessage(pointeur) {
        let geste = pointeur === 'tactile' ? 'Touche' : 'Clique sur';
        switch (this.state) {
            case 'waiting_point1':
                return '📏 ' + geste + ' une extrémité d’un objet de longueur connue (une règle dans l’image).';
            case 'waiting_point2':
                return '📏 ' + geste + ' l’autre extrémité de cet objet.';
            case 'waiting_distance':
                return '📏 Écris la longueur réelle entre les deux points (ex. : 80 cm), puis « Valider ».';
            case 'calibrated':
                return '✅ Échelle validée : ' + this.texteEchelle() + '. Tu peux passer au pointage.';
            default:
                return '';
        }
    }

    // Dessine les deux points et le segment (conversion vidéo → écran par versEcran)
    draw(versEcran) {
        push();
        const marque = (p) => {
            let e = versEcran(p.x, p.y);
            noFill();
            stroke(0);
            strokeWeight(5);
            ellipse(e.x, e.y, 20, 20);
            stroke(0, 230, 90);
            strokeWeight(2.5);
            ellipse(e.x, e.y, 20, 20);
            noStroke();
            fill(0, 230, 90);
            ellipse(e.x, e.y, 4, 4);
            return e;
        };
        let a = this.point1 ? marque(this.point1) : null;
        let b = this.point2 ? marque(this.point2) : null;
        if (a && b) {
            stroke(0);
            strokeWeight(5);
            line(a.x, a.y, b.x, b.y);
            stroke(0, 230, 90);
            strokeWeight(2.5);
            line(a.x, a.y, b.x, b.y);
            let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            let etiquette = nombreFr(this.pixelDistance, 1) + ' px';
            if (this.isCalibrated) etiquette += ' = ' + metresFr(this.realDistance);
            textSize(15);
            textStyle(BOLD);
            textAlign(CENTER, BOTTOM);
            stroke(0);
            strokeWeight(4);
            fill(255);
            text(etiquette, constrain(mx, 70, width - 70), my > 30 ? my - 8 : my + 26);
        }
        pop();
    }

    // Pour la sauvegarde de la séance
    serialiser() {
        return { point1: this.point1, point2: this.point2, realDistance: this.realDistance, saisie: this.saisie, state: this.state };
    }

    restaurer(o) {
        this.reset();
        if (!o) return;
        if (o.point1) this.addPoint(+o.point1.x, +o.point1.y);
        if (o.point2) this.addPoint(+o.point2.x, +o.point2.y);
        this.saisie = o.saisie || '';
        if (o.state === 'calibrated' && o.realDistance > 0) this.setRealDistance(+o.realDistance);
    }
}
