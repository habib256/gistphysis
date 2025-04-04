class CelestialBodyView {
    constructor() {
        this.bodyImages = {}; // Cache pour les images des corps célestes
    }
    
    render(ctx, celestialBodyModel) {
        ctx.save();
        
        // Dessiner le corps céleste
        this.drawBody(ctx, celestialBodyModel);
        
        // Dessiner l'atmosphère si elle existe
        if (celestialBodyModel.atmosphere.exists) {
            this.drawAtmosphere(ctx, celestialBodyModel);
        }
        
        // Dessiner les anneaux si le corps en possède
        if (celestialBodyModel.hasRings) {
            this.drawRings(ctx, celestialBodyModel);
        }
        
        // Optionnel : Dessiner le nom du corps céleste
        this.drawName(ctx, celestialBodyModel);
        
        ctx.restore();
    }
    
    drawBody(ctx, body) {
        // Vérifier si une image existe pour ce corps
        if (this.bodyImages[body.name] && this.bodyImages[body.name].complete) {
            const img = this.bodyImages[body.name];
            ctx.drawImage(
                img, 
                body.position.x - body.radius, 
                body.position.y - body.radius, 
                body.radius * 2, 
                body.radius * 2
            );
            return;
        }
        
        // Sinon, dessiner une forme simple
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.fill();
        
        // Ajouter des détails selon le type de corps céleste
        if (body.mass > 1e24) { // Planète
            this.drawPlanetDetails(ctx, body);
        } else if (body.mass > 1e20) { // Lune
            this.drawMoonDetails(ctx, body);
        }
    }
    
    drawPlanetDetails(ctx, body) {
        // Dessiner des détails sur la surface de la planète
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        
        // Simuler des continents/océans
        for (let i = 0; i < 5; i++) {
            const x = body.position.x + (Math.random() - 0.5) * body.radius * 1.5;
            const y = body.position.y + (Math.random() - 0.5) * body.radius * 1.5;
            const size = body.radius * (0.2 + Math.random() * 0.3);
            const color = this.getLighterColor(body.color);
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawMoonDetails(ctx, body) {
        // Dessiner des cratères sur la lune
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * body.radius * 0.8;
            const x = body.position.x + Math.cos(angle) * distance;
            const y = body.position.y + Math.sin(angle) * distance;
            const size = body.radius * (0.05 + Math.random() * 0.15);
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(80, 80, 80, 0.3)';
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawAtmosphere(ctx, body) {
        const gradient = ctx.createRadialGradient(
            body.position.x, body.position.y, body.radius,
            body.position.x, body.position.y, body.radius + body.atmosphere.height
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, body.atmosphere.color);
        
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, body.radius + body.atmosphere.height, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    drawRings(ctx, body) {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        
        // Créer un dégradé pour les anneaux
        const gradient = ctx.createLinearGradient(0, -body.radius * 2, 0, body.radius * 2);
        gradient.addColorStop(0, 'rgba(200, 200, 200, 0.7)');
        gradient.addColorStop(0.5, 'rgba(150, 150, 150, 0.3)');
        gradient.addColorStop(1, 'rgba(200, 200, 200, 0.7)');
        
        // Dessiner les anneaux
        ctx.beginPath();
        ctx.ellipse(0, 0, body.radius * 2, body.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = body.radius * 0.2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawName(ctx, body) {
        // Afficher le nom du corps céleste
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(body.name, body.position.x, body.position.y - body.radius - 10);
    }
    
    // Utilitaire pour éclaircir une couleur
    getLighterColor(hexColor) {
        // Convertir la couleur hex en RGB
        let r = parseInt(hexColor.substr(1, 2), 16);
        let g = parseInt(hexColor.substr(3, 2), 16);
        let b = parseInt(hexColor.substr(5, 2), 16);
        
        // Éclaircir la couleur
        r = Math.min(255, r + 40);
        g = Math.min(255, g + 40);
        b = Math.min(255, b + 40);
        
        // Reconvertir en hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // Précharge une image pour un corps céleste
    loadImage(bodyName, imagePath) {
        const img = new Image();
        img.src = imagePath;
        this.bodyImages[bodyName] = img;
    }
} 