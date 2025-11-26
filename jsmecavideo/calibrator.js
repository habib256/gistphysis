class Calibrator {
    constructor() {
        this.point1 = null;
        this.point2 = null;
        this.realDistance = null;
        this.isCalibrated = false;
        this.state = 'waiting_point1'; // 'waiting_point1', 'waiting_point2', 'waiting_distance', 'calibrated'
        this.pixelDistance = 0;
        this.scaleFactor = 1; // mètres par pixel
    }

    // Réinitialise la calibration
    reset() {
        this.point1 = null;
        this.point2 = null;
        this.realDistance = null;
        this.isCalibrated = false;
        this.state = 'waiting_point1';
        this.pixelDistance = 0;
        this.scaleFactor = 1;
    }

    // Ajoute un point de calibration (appelé lors d'un clic)
    addPoint(x, y) {
        if (this.state === 'waiting_point1') {
            this.point1 = { x: x, y: y };
            this.state = 'waiting_point2';
            return 'point1_set';
        } else if (this.state === 'waiting_point2') {
            this.point2 = { x: x, y: y };
            this.pixelDistance = this.calculatePixelDistance();
            this.state = 'waiting_distance';
            return 'point2_set';
        }
        return null;
    }

    // Calcule la distance en pixels entre les deux points
    calculatePixelDistance() {
        if (this.point1 && this.point2) {
            let dx = this.point2.x - this.point1.x;
            let dy = this.point2.y - this.point1.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
        return 0;
    }

    // Définit la distance réelle et calcule le facteur d'échelle
    setRealDistance(distance) {
        if (distance > 0 && this.pixelDistance > 0) {
            this.realDistance = distance;
            this.scaleFactor = distance / this.pixelDistance;
            this.isCalibrated = true;
            this.state = 'calibrated';
            return true;
        }
        return false;
    }

    // Convertit une distance en pixels vers des mètres
    pixelsToMeters(pixels) {
        return pixels * this.scaleFactor;
    }

    // Convertit une coordonnée x en pixels vers des mètres
    convertX(pixelX) {
        return pixelX * this.scaleFactor;
    }

    // Convertit une coordonnée y en pixels vers des mètres (inverse l'axe y)
    convertY(pixelY, canvasHeight) {
        return (canvasHeight - pixelY) * this.scaleFactor;
    }

    // Retourne le message d'instruction selon l'état
    getInstructionMessage() {
        switch (this.state) {
            case 'waiting_point1':
                return '📏 Calibration : Cliquez sur le premier point de référence';
            case 'waiting_point2':
                return '📏 Calibration : Cliquez sur le deuxième point de référence';
            case 'waiting_distance':
                return '📏 Calibration : Entrez la distance réelle (en mètres)';
            case 'calibrated':
                return '✅ Calibration terminée : 1 pixel = ' + this.scaleFactor.toFixed(6) + ' m';
            default:
                return '';
        }
    }

    // Dessine les éléments de calibration sur le canvas
    draw() {
        push();
        strokeWeight(2);
        
        // Dessine le premier point si défini
        if (this.point1) {
            stroke(0, 255, 0);
            fill(0, 255, 0);
            ellipse(this.point1.x, this.point1.y, 12, 12);
            noFill();
            ellipse(this.point1.x, this.point1.y, 20, 20);
        }

        // Dessine le deuxième point si défini
        if (this.point2) {
            stroke(0, 255, 0);
            fill(0, 255, 0);
            ellipse(this.point2.x, this.point2.y, 12, 12);
            noFill();
            ellipse(this.point2.x, this.point2.y, 20, 20);
        }

        // Dessine la ligne entre les deux points
        if (this.point1 && this.point2) {
            stroke(0, 255, 0);
            strokeWeight(2);
            line(this.point1.x, this.point1.y, this.point2.x, this.point2.y);

            // Affiche la distance en pixels au milieu de la ligne
            let midX = (this.point1.x + this.point2.x) / 2;
            let midY = (this.point1.y + this.point2.y) / 2;
            fill(255);
            stroke(0);
            strokeWeight(3);
            textSize(16);
            textAlign(CENTER, CENTER);
            text(this.pixelDistance.toFixed(1) + ' px', midX, midY - 15);
            
            if (this.isCalibrated) {
                text(this.realDistance.toFixed(3) + ' m', midX, midY + 15);
            }
        }
        
        pop();
    }
}

