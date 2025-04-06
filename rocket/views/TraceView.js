class TraceView {
    constructor() {
        this.points = [];
        this.maxPoints = 30000;
        this.color = 'rgba(255, 255, 255, 0.5)';
        this.lineWidth = 2;
        this.isVisible = true;
    }

    update(position) {
        if (!this.isVisible) return;
        
        this.points.push({
            x: position.x,
            y: position.y
        });

        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    clear() {
        this.points = [];
    }

    render(ctx, camera) {
        if (!this.isVisible || this.points.length < 2) return;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        
        // Appliquer les transformations de la caméra
        const firstPoint = {
            x: (this.points[0].x - camera.x) * camera.zoom + camera.offsetX,
            y: (this.points[0].y - camera.y) * camera.zoom + camera.offsetY
        };
        
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        // Appliquer la transformation pour chaque point
        for (let i = 1; i < this.points.length; i++) {
            const transformedPoint = {
                x: (this.points[i].x - camera.x) * camera.zoom + camera.offsetX,
                y: (this.points[i].y - camera.y) * camera.zoom + camera.offsetY
            };
            ctx.lineTo(transformedPoint.x, transformedPoint.y);
        }
        
        ctx.stroke();
        ctx.restore();
    }

    toggleVisibility() {
        this.isVisible = !this.isVisible;
    }

    setColor(color) {
        this.color = color;
    }

    setLineWidth(width) {
        this.lineWidth = width;
    }

    setMaxPoints(max) {
        this.maxPoints = max;
        while (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    getPointCount() {
        return this.points.length;
    }

    getTotalLength() {
        let length = 0;
        for (let i = 1; i < this.points.length; i++) {
            const dx = this.points[i].x - this.points[i-1].x;
            const dy = this.points[i].y - this.points[i-1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }

    getExtremes() {
        if (this.points.length === 0) return null;

        let minX = this.points[0].x;
        let maxX = this.points[0].x;
        let minY = this.points[0].y;
        let maxY = this.points[0].y;

        for (const point of this.points) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }

        return {
            min: { x: minX, y: minY },
            max: { x: maxX, y: maxY }
        };
    }
} 