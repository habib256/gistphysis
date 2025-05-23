class Graph {
    constructor(data,canvas) {
        this.data = data;
        this.ctx = canvas;
        this.chart = null; // Ajoutez cette ligne
    }

    create() {

        let points = this.data.getAllPoints();
        let labels = points.map((point, index) => index);
        let dataX = points.map(point => point.x);
        let dataY = points.map(point => point.y);

        this.chart = new Chart(this.ctx.elt, { 
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'JSMECAVIDEO GRAPH',
                    data: points.map(point => ({x: point.x, y: point.y})),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    x: {
                        min: 0,
                        max: 800
                    },
                    y: {
                        min: 0,
                        max: 600
                    }
                }
            }
        });
    }
    
    destroy() {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}
