class Graph {
    constructor(data) {
        this.data = data;
    }

    draw() {
        let points = this.data.getAllPoints();

        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            ellipse(point.x, point.y, 5, 5);
        }
    }
}