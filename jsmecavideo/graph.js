class Graph {
    constructor(data) {
        this.data = data;
    }

    draw() {
        stroke(color(255, 0, 0, 255));
        let points = this.data.getAllPoints();

        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            line(point.x - 5, point.y - 5, point.x + 5, point.y + 5);
            line(point.x + 5, point.y - 5, point.x - 5, point.y + 5);
        }
    }
}