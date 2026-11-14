// visor.js — viseur et marques des points, de taille constante à l'écran
//
// Toutes les tailles sont en pixels CSS (le canevas est à la taille d'affichage) : une croix
// mesure 12 px quelle que soit la taille de l'image. Chaque marque est d'abord tracée en
// sombre et large (liseré), puis en couleur : elle reste lisible sur une vidéo claire ou sombre.

const TAILLE_MARQUE = 12;   // côté d'une croix (px à l'écran)
const TAILLE_NUMERO = 14;   // numéros des points (px)

// Trace la forme d'un mobile (croix ×, plus +, rond ○, carré □) centrée en (x, y)
function tracerForme(forme, x, y, t) {
    const h = t / 2;
    switch (forme) {
        case 'plus':
            line(x - h, y, x + h, y);
            line(x, y - h, x, y + h);
            break;
        case 'rond':
            ellipse(x, y, t, t);
            break;
        case 'carre':
            rect(x - h + 1, y - h + 1, t - 2, t - 2);
            break;
        default: // croix
            line(x - h, y - h, x + h, y + h);
            line(x + h, y - h, x - h, y + h);
    }
}

function dessinerMarque(style, x, y, t = TAILLE_MARQUE) {
    push();
    noFill();
    stroke(0, 0, 0, 220);
    strokeWeight(5);
    tracerForme(style.forme, x, y, t);
    stroke(style.r, style.g, style.b);
    strokeWeight(2.4);
    tracerForme(style.forme, x, y, t);
    pop();
}

// Numéro d'un point : blanc cerné de noir, en haut à droite de la marque
function dessinerNumero(n, x, y) {
    push();
    textSize(TAILLE_NUMERO);
    textStyle(BOLD);
    textAlign(LEFT, BOTTOM);
    stroke(0);
    strokeWeight(3.5);
    fill(255);
    text(n, x + 6, y - 5);
    pop();
}

class Visor {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.style = MOBILES_STYLE[0];
        this.mobileNumber = 0; // 0 : pas d'étiquette (un seul mobile)
    }

    update(x, y) {
        this.x = x;
        this.y = y;
    }

    setMobileNumber(num) {
        this.mobileNumber = num;
    }

    draw() {
        const s = this.style;
        const brins = [[-14, 0, -5, 0], [5, 0, 14, 0], [0, -14, 0, -5], [0, 5, 0, 14]];
        push();
        noFill();
        stroke(0, 0, 0, 220);
        strokeWeight(4.5);
        ellipse(this.x, this.y, 24, 24);
        brins.forEach(b => line(this.x + b[0], this.y + b[1], this.x + b[2], this.y + b[3]));
        stroke(s.r, s.g, s.b);
        strokeWeight(2);
        ellipse(this.x, this.y, 24, 24);
        brins.forEach(b => line(this.x + b[0], this.y + b[1], this.x + b[2], this.y + b[3]));
        // Numéro du mobile à pointer, seulement s'il y a plusieurs mobiles
        if (this.mobileNumber > 0) {
            textSize(14);
            textStyle(BOLD);
            textAlign(LEFT, TOP);
            stroke(0);
            strokeWeight(3.5);
            fill(255);
            text('M' + this.mobileNumber + ' ' + s.symbole, this.x + 15, this.y - 22);
        }
        pop();
    }

    // Légende des mobiles en haut à droite (plusieurs mobiles)
    drawLegend(data, mobileCourant) {
        if (data.numMobiles <= 1) return;
        push();
        const lh = 22, w = 150;
        const x0 = width - w - 8, y0 = 8;
        noStroke();
        fill(0, 0, 0, 185);
        rect(x0, y0, w, data.numMobiles * lh + 8, 6);
        textSize(14);
        textAlign(LEFT, CENTER);
        for (let i = 0; i < data.numMobiles; i++) {
            const y = y0 + 4 + i * lh + lh / 2;
            dessinerMarque(data.getColor(i), x0 + 16, y, 11);
            noStroke();
            fill(255);
            textStyle(i === mobileCourant ? BOLD : NORMAL);
            text((i === mobileCourant ? '▶ ' : '') + 'Mobile ' + (i + 1) + ' (' + data.getPointCount(i) + ')', x0 + 30, y);
        }
        pop();
    }
}
