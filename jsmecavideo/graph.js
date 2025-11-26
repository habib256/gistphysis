class Graph {
    constructor(data, canvas) {
        this.data = data;
        this.ctx = canvas;
        this.chart = null;
        this.graphType = 'y(x)'; // Type de graphique par défaut
        this.selector = null;
        this.mobileSelector = null;
    }

    create() {
        // Crée le sélecteur de type de graphique
        this.createSelectors();
        
        // Crée le graphique initial
        this.updateChart();
    }

    createSelectors() {
        // Sélecteur de type de graphique
        this.selector = createSelect();
        this.selector.parent('menu');
        this.selector.style("font-size", "20px");
        this.selector.option('Trajectoire y(x)', 'y(x)');
        this.selector.option('Position x(t)', 'x(t)');
        this.selector.option('Position y(t)', 'y(t)');
        this.selector.option('Vitesse v(t)', 'v(t)');
        this.selector.option('Vitesse vx(t)', 'vx(t)');
        this.selector.option('Vitesse vy(t)', 'vy(t)');
        this.selector.option('Accélération a(t)', 'a(t)');
        this.selector.changed(() => {
            this.graphType = this.selector.value();
            this.updateChart();
        });

        // Sélecteur de mobile (si multi-points)
        this.mobileSelector = createSelect();
        this.mobileSelector.parent('menu');
        this.mobileSelector.style("font-size", "20px");
        this.updateMobileSelector();
        this.mobileSelector.changed(() => {
            this.updateChart();
        });
    }

    updateMobileSelector() {
        // Vide le sélecteur
        this.mobileSelector.elt.innerHTML = '';
        
        if (this.data.numMobiles === 1) {
            this.mobileSelector.option('Mobile 1', 0);
        } else {
            this.mobileSelector.option('Tous les mobiles', -1);
            for (let i = 0; i < this.data.numMobiles; i++) {
                this.mobileSelector.option('Mobile ' + (i + 1), i);
            }
        }
    }

    getChartConfig() {
        let datasets = [];
        let selectedMobile = parseInt(this.mobileSelector.value());
        let mobilesToShow = selectedMobile === -1 
            ? [...Array(this.data.numMobiles).keys()] 
            : [selectedMobile];

        // Configuration des axes selon le type de graphique
        let xAxisConfig = {};
        let yAxisConfig = {};
        let xLabel = '';
        let yLabel = '';

        for (let m of mobilesToShow) {
            let points = this.data.getPointsForMobile(m);
            let velocities = this.data.getVelocities(m);
            let accelerations = this.data.getAccelerations(m);
            let col = this.data.getColor(m);
            let colorStr = `rgba(${col.r}, ${col.g}, ${col.b}, 1)`;
            let colorStrLight = `rgba(${col.r}, ${col.g}, ${col.b}, 0.3)`;

            let chartData = [];

            switch (this.graphType) {
                case 'y(x)':
                    chartData = points.map(p => ({ x: p.x, y: p.y }));
                    xLabel = 'x (m)';
                    yLabel = 'y (m)';
                    break;

                case 'x(t)':
                    chartData = points.map(p => ({ x: p.time, y: p.x }));
                    xLabel = 't (s)';
                    yLabel = 'x (m)';
                    break;

                case 'y(t)':
                    chartData = points.map(p => ({ x: p.time, y: p.y }));
                    xLabel = 't (s)';
                    yLabel = 'y (m)';
                    break;

                case 'v(t)':
                    chartData = velocities.map(v => ({ x: v.time, y: v.v }));
                    xLabel = 't (s)';
                    yLabel = 'v (m/s)';
                    break;

                case 'vx(t)':
                    chartData = velocities.map(v => ({ x: v.time, y: v.vx }));
                    xLabel = 't (s)';
                    yLabel = 'vx (m/s)';
                    break;

                case 'vy(t)':
                    chartData = velocities.map(v => ({ x: v.time, y: v.vy }));
                    xLabel = 't (s)';
                    yLabel = 'vy (m/s)';
                    break;

                case 'a(t)':
                    chartData = accelerations.map(a => ({ x: a.time, y: a.a }));
                    xLabel = 't (s)';
                    yLabel = 'a (m/s²)';
                    break;
            }

            datasets.push({
                label: 'Mobile ' + (m + 1),
                data: chartData,
                borderColor: colorStr,
                backgroundColor: colorStrLight,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colorStr,
                showLine: true,
                tension: 0
            });
        }

        // Calcule les limites des axes automatiquement
        let allX = datasets.flatMap(d => d.data.map(p => p.x));
        let allY = datasets.flatMap(d => d.data.map(p => p.y));
        
        // Inclut toujours le zéro comme référence
        allX.push(0);
        allY.push(0);
        
        let xMin = Math.min(...allX);
        let xMax = Math.max(...allX);
        let yMin = Math.min(...allY);
        let yMax = Math.max(...allY);

        // Ajoute une marge de 10%
        let xMargin = (xMax - xMin) * 0.1 || 0.1;
        let yMargin = (yMax - yMin) * 0.1 || 0.1;

        return {
            type: 'scatter',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: this.getGraphTitle(),
                        font: { size: 18 }
                    },
                    legend: {
                        display: this.data.numMobiles > 1
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: xMin - xMargin,
                        max: xMax + xMargin,
                        title: {
                            display: true,
                            text: xLabel,
                            font: { size: 14 }
                        }
                    },
                    y: {
                        min: yMin - yMargin,
                        max: yMax + yMargin,
                        title: {
                            display: true,
                            text: yLabel,
                            font: { size: 14 }
                        }
                    }
                }
            }
        };
    }

    getGraphTitle() {
        switch (this.graphType) {
            case 'y(x)': return 'Trajectoire y = f(x)';
            case 'x(t)': return 'Position horizontale x = f(t)';
            case 'y(t)': return 'Position verticale y = f(t)';
            case 'v(t)': return 'Vitesse v = f(t)';
            case 'vx(t)': return 'Vitesse horizontale vx = f(t)';
            case 'vy(t)': return 'Vitesse verticale vy = f(t)';
            case 'a(t)': return 'Accélération a = f(t)';
            default: return 'Graphique';
        }
    }

    updateChart() {
        // Détruit le graphique précédent s'il existe
        if (this.chart) {
            this.chart.destroy();
        }

        // Met à jour le sélecteur de mobile si nécessaire
        this.updateMobileSelector();

        // Crée le nouveau graphique
        let config = this.getChartConfig();
        this.chart = new Chart(this.ctx.elt, config);
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        if (this.selector) {
            this.selector.remove();
            this.selector = null;
        }
        if (this.mobileSelector) {
            this.mobileSelector.remove();
            this.mobileSelector = null;
        }
    }
}
