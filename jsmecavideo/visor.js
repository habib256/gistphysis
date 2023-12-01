class Visor {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.color = color(255, 0, 0, 255); // Couleur du viseur en rouge
    }

    update(mouseX, mouseY) {
        this.x = mouseX;
        this.y = mouseY;
    }

    draw() {
        stroke(this.color); // Couleur du viseur en rouge
        noFill(); // Pas de remplissage
        ellipse(this.x, this.y, 20, 20); // Cercle
        line(this.x - 10, this.y, this.x -2, this.y); // Ligne horizontale
        line(this.x +2, this.y, this.x + 10, this.y); // Ligne horizontale
        line(this.x, this.y - 10, this.x, this.y -2); // Ligne verticale
        line(this.x, this.y +2, this.x, this.y + 10); // Ligne verticale
    }
}





