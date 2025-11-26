class Visor {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.color = color(255, 0, 0, 255); // Couleur du viseur (modifiable)
        this.mobileNumber = 1; // Numéro du mobile à afficher
        // Initialisation pour le suivi du curseur
        this.cursorX = 0;
        this.targetX = 0;
        // Valeurs par défaut pour les marges
        this.leftMargin = 0;
        this.rightMargin = width || 800;
    }

    update(mouseX, mouseY) {
        this.x = mouseX;
        this.y = mouseY;
    }

    setMobileNumber(num) {
        this.mobileNumber = num;
    }

    draw() {
        push();
        stroke(this.color);
        strokeWeight(2);
        noFill();
        
        // Cercle principal
        ellipse(this.x, this.y, 24, 24);
        
        // Croix centrale
        line(this.x - 12, this.y, this.x - 4, this.y);
        line(this.x + 4, this.y, this.x + 12, this.y);
        line(this.x, this.y - 12, this.x, this.y - 4);
        line(this.x, this.y + 4, this.x, this.y + 12);
        
        // Affiche le numéro du mobile si multi-points
        if (this.mobileNumber > 0) {
            fill(this.color);
            noStroke();
            textSize(12);
            textAlign(LEFT, TOP);
            text('M' + this.mobileNumber, this.x + 14, this.y - 14);
        }
        
        pop();
    }

    // Dessine une légende des mobiles en haut à droite
    drawLegend(data) {
        if (data.numMobiles <= 1) return;
        
        push();
        let legendX = width - 120;
        let legendY = 10;
        let lineHeight = 20;
        
        // Fond de la légende
        fill(0, 0, 0, 180);
        noStroke();
        rect(legendX - 10, legendY - 5, 120, data.numMobiles * lineHeight + 10, 5);
        
        textSize(14);
        textAlign(LEFT, CENTER);
        
        for (let i = 0; i < data.numMobiles; i++) {
            let col = data.getColor(i);
            let y = legendY + i * lineHeight + lineHeight / 2;
            
            // Indicateur de couleur
            fill(col.r, col.g, col.b);
            noStroke();
            ellipse(legendX, y, 12, 12);
            
            // Texte
            fill(255);
            let pointCount = data.getPointCount(i);
            let label = 'Mobile ' + (i + 1) + ' (' + pointCount + ')';
            
            // Surbrillance si c'est le mobile courant
            if (i === data.getCurrentMobile()) {
                label = '▶ ' + label;
            }
            
            text(label, legendX + 12, y);
        }
        
        pop();
    }

    updateCursor() {
        // Calcul de la position cible selon la valeur du slider
        this.targetX = map(slider.value(), 0, 1, this.leftMargin, this.rightMargin);
        // Interpolation plus rapide pour une meilleure réactivité du curseur
        this.cursorX = lerp(this.cursorX, this.targetX, 0.5);
    }
}
