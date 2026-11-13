// graph.js — graphiques et lecture des mesures (Chart.js)
//
// Pensé pour le collège : titres et axes en français avec unités, virgule décimale,
// graphiques en barres pour lire la chronophotographie (écart entre deux positions,
// vitesse v = d / t sur chaque intervalle), trajectoire à la même échelle sur les deux
// axes (un cercle reste un cercle). Les graphiques « lycée » restent disponibles.
// Sans étalonnage, les valeurs sont en pixels : les axes l'indiquent et un message le dit.

// Types de graphiques (valeur, libellé du menu, groupe)
const TYPES_GRAPHIQUES = [
    { valeur: 'y(x)', libelle: 'Trajectoire (positions successives)' },
    { valeur: 'ecarts', libelle: 'Écart entre deux positions (d)' },
    { valeur: 'vitesse', libelle: 'Vitesse sur chaque intervalle (v = d / t)' },
    { valeur: 'x(t)', libelle: 'Position x au cours du temps' },
    { valeur: 'y(t)', libelle: 'Position y au cours du temps' },
    { valeur: 'v(t)', libelle: 'Vitesse v(t), méthode centrée', groupe: 'Pour aller plus loin (lycée)' },
    { valeur: 'vx(t)', libelle: 'Vitesse horizontale vx(t)', groupe: 'Pour aller plus loin (lycée)' },
    { valeur: 'vy(t)', libelle: 'Vitesse verticale vy(t)', groupe: 'Pour aller plus loin (lycée)' },
    { valeur: 'a(t)', libelle: 'Accélération a(t)', groupe: 'Pour aller plus loin (lycée)' }
];

class Graph {
    constructor(data, canvas) {
        this.data = data;
        this.ctx = canvas;
        this.chart = null;
        this.graphType = 'y(x)'; // Type de graphique par défaut
        this.selector = null;
        this.mobileSelector = null;
        this.averages = [];
        this.resume = '';     // résumé des mesures affiché sous le graphique
    }

    create() {
        // Crée le sélecteur de type de graphique
        this.createSelectors();

        // Crée le graphique initial
        this.updateChart();
    }

    createSelectors() {
        // Sélecteur de type de graphique (avec un groupe « Pour aller plus loin »)
        this.selector = createSelect();
        this.selector.parent('menu');
        this.selector.class('menu-graphique');
        this.selector.attribute('aria-label', 'Graphique à afficher');
        let groupes = {};
        TYPES_GRAPHIQUES.forEach(t => {
            let option = document.createElement('option');
            option.value = t.valeur;
            option.textContent = t.libelle;
            if (t.groupe) {
                if (!groupes[t.groupe]) {
                    groupes[t.groupe] = document.createElement('optgroup');
                    groupes[t.groupe].label = t.groupe;
                    this.selector.elt.appendChild(groupes[t.groupe]);
                }
                groupes[t.groupe].appendChild(option);
            } else {
                this.selector.elt.appendChild(option);
            }
        });
        this.selector.elt.value = this.graphType;
        this.selector.changed(() => {
            this.graphType = this.selector.value();
            this.updateChart();
            if (typeof majGuide === 'function') majGuide();
        });

        // Sélecteur de mobile (affiché seulement s'il y a plusieurs mobiles)
        this.mobileSelector = createSelect();
        this.mobileSelector.parent('menu');
        this.mobileSelector.class('menu-etroit');
        this.mobileSelector.attribute('aria-label', 'Mobile à afficher');
        this.updateMobileSelector();
        this.mobileSelector.changed(() => {
            this.updateChart();
        });
    }

    updateMobileSelector() {
        let valeur = this.mobileSelector.value();
        // Vide le sélecteur
        this.mobileSelector.elt.innerHTML = '';

        if (this.data.numMobiles === 1) {
            this.mobileSelector.option('Mobile 1', 0);
            this.mobileSelector.style('display', 'none');
        } else {
            this.mobileSelector.option('Tous les mobiles', -1);
            for (let i = 0; i < this.data.numMobiles; i++) {
                this.mobileSelector.option('Mobile ' + (i + 1), i);
            }
            this.mobileSelector.style('display', '');
            if (valeur !== '' && valeur !== null && [...this.mobileSelector.elt.options].some(o => o.value === valeur)) {
                this.mobileSelector.elt.value = valeur;
            }
        }
    }

    // Mobiles à afficher (tous, ou celui choisi)
    mobilesAffiches() {
        let selectedMobile = parseInt(this.mobileSelector.value());
        if (isNaN(selectedMobile)) selectedMobile = 0;
        return selectedMobile === -1 ? [...Array(this.data.numMobiles).keys()] : [selectedMobile];
    }

    // Unité commune des mobiles affichés : 'm' seulement si tous sont étalonnés
    uniteAffichee(mobiles) {
        let avecPoints = mobiles.filter(m => this.data.getPointCount(m) > 0);
        return avecPoints.length > 0 && avecPoints.every(m => this.data.getUnite(m) === 'm') ? 'm' : 'px';
    }

    getGraphTitle() {
        switch (this.graphType) {
            case 'y(x)': return 'Trajectoire : positions successives du mobile';
            case 'ecarts': return 'Écart entre deux positions successives';
            case 'vitesse': return 'Vitesse sur chaque intervalle : v = d / t';
            case 'x(t)': return 'Position horizontale x au cours du temps';
            case 'y(t)': return 'Position verticale y au cours du temps';
            case 'v(t)': return 'Vitesse v au cours du temps (méthode centrée)';
            case 'vx(t)': return 'Vitesse horizontale vx au cours du temps';
            case 'vy(t)': return 'Vitesse verticale vy au cours du temps';
            case 'a(t)': return 'Accélération a au cours du temps';
            default: return 'Graphique';
        }
    }

    // Aide à la lecture, affichée sous le titre
    getSousTitre() {
        switch (this.graphType) {
            case 'y(x)': return ['Points alignés → trajectoire rectiligne ; sur un cercle → circulaire ; sur une courbe → curviligne.',
                'Même échelle sur les deux axes : la forme de la trajectoire n’est pas déformée.'];
            case 'ecarts': return ['Toutes les barres ont presque la même hauteur → vitesse constante → mouvement uniforme.',
                'De plus en plus hautes → accéléré ; de plus en plus basses → ralenti. De petites différences viennent du pointage.'];
            case 'vitesse': return ['d = distance entre deux points, t = durée entre ces deux points.',
                'Même hauteur → uniforme ; de plus en plus haut → accéléré ; de plus en plus bas → ralenti.'];
            default: return [];
        }
    }

    // Nombre de points nécessaires pour ce graphique
    pointsNecessaires() {
        switch (this.graphType) {
            case 'ecarts': case 'vitesse': return 2;
            case 'v(t)': case 'vx(t)': case 'vy(t)': return 3;
            case 'a(t)': return 5;
            default: return 1;
        }
    }

    getChartConfig() {
        let mobilesToShow = this.mobilesAffiches();
        let unite = this.uniteAffichee(mobilesToShow);
        let u = unitesMesure(unite);
        if (this.graphType === 'ecarts' || this.graphType === 'vitesse') {
            return this.configBarres(mobilesToShow, unite, u);
        }

        let datasets = [];
        let xLabel = '';
        let yLabel = '';
        let averages = []; // Stocke les moyennes d'accélération par mobile
        let uniteT = 'temps t (s)';

        for (let m of mobilesToShow) {
            let points = this.data.getPositions(m);
            let col = this.data.getColor(m);
            let colorStr = `rgba(${col.r}, ${col.g}, ${col.b}, 1)`;
            let colorStrLight = `rgba(${col.r}, ${col.g}, ${col.b}, 0.3)`;

            let chartData = [];

            switch (this.graphType) {
                case 'y(x)':
                    chartData = points.map(p => ({ x: p.x, y: p.y }));
                    xLabel = 'position horizontale x (' + u.distance + ')';
                    yLabel = 'position verticale y (' + u.distance + ')';
                    break;

                case 'x(t)':
                    chartData = points.map(p => ({ x: p.time, y: p.x }));
                    xLabel = uniteT;
                    yLabel = 'position x (' + u.distance + ')';
                    break;

                case 'y(t)':
                    chartData = points.map(p => ({ x: p.time, y: p.y }));
                    xLabel = uniteT;
                    yLabel = 'position y (' + u.distance + ')';
                    break;

                case 'v(t)':
                    chartData = this.data.getVelocities(m).map(v => ({ x: v.time, y: v.v }));
                    xLabel = uniteT;
                    yLabel = 'vitesse v (' + u.vitesse + ')';
                    break;

                case 'vx(t)':
                    chartData = this.data.getVelocities(m).map(v => ({ x: v.time, y: v.vx }));
                    xLabel = uniteT;
                    yLabel = 'vitesse horizontale vx (' + u.vitesse + ')';
                    break;

                case 'vy(t)':
                    chartData = this.data.getVelocities(m).map(v => ({ x: v.time, y: v.vy }));
                    xLabel = uniteT;
                    yLabel = 'vitesse verticale vy (' + u.vitesse + ')';
                    break;

                case 'a(t)':
                    chartData = this.data.getAccelerations(m).map(a => ({ x: a.time, y: a.a }));
                    xLabel = uniteT;
                    yLabel = 'accélération a (' + (unite === 'm' ? 'm/s²' : 'px/s²') + ')';
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

            // Ajout de la ligne de moyenne pour le mode accélération
            if (this.graphType === 'a(t)' && chartData.length > 0) {
                let avgA = chartData.reduce((sum, p) => sum + p.y, 0) / chartData.length;
                averages.push({ mobile: m, avg: avgA });
                datasets.push({
                    label: mobilesToShow.length > 1 ? `Moyenne Mobile ${m + 1}` : 'Moyenne',
                    data: [
                        { x: chartData[0].x, y: avgA },
                        { x: chartData[chartData.length - 1].x, y: avgA }
                    ],
                    borderColor: colorStr,
                    borderDash: [8, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    showLine: true,
                    tension: 0
                });
            }
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

        // Stocke les moyennes pour affichage en dehors du graphique
        this.averages = averages;
        this.resume = this.resumeCourbes(unite);

        return {
            type: 'scatter',
            data: { datasets: datasets },
            options: this.optionsCommunes({
                x: {
                    type: 'linear',
                    min: xMin - xMargin,
                    max: xMax + xMargin,
                    title: { display: true, text: xLabel, font: { size: 14 } }
                },
                y: {
                    min: yMin - yMargin,
                    max: yMax + yMargin,
                    title: { display: true, text: yLabel, font: { size: 14 } }
                }
            }, this.data.numMobiles > 1 || averages.length > 0)
        };
    }

    // Graphiques en barres : un intervalle (du point n au point n + 1) par barre
    configBarres(mobilesToShow, unite, u) {
        let grandeur = this.graphType === 'ecarts' ? 'd' : 'v';
        let labels = [];
        let datasets = [];
        let resumes = [];
        for (let m of mobilesToShow) {
            let intervalles = this.data.getIntervalles(m);
            if (intervalles.length > labels.length) {
                labels = intervalles.map(iv => iv.de + '→' + iv.a);
            }
            let col = this.data.getColor(m);
            let valeurs = intervalles.map(iv => iv[grandeur]);
            datasets.push({
                type: 'bar',
                label: 'Mobile ' + (m + 1),
                data: valeurs,
                backgroundColor: `rgba(${col.r}, ${col.g}, ${col.b}, 0.45)`,
                borderColor: `rgba(${col.r}, ${col.g}, ${col.b}, 1)`,
                borderWidth: 1,
                order: 2
            });
            if (valeurs.length > 0) {
                let moyenne = valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
                datasets.push({
                    type: 'line',
                    label: 'Moyenne' + (mobilesToShow.length > 1 ? ' (mobile ' + (m + 1) + ')' : ''),
                    data: valeurs.map(() => moyenne),
                    borderColor: `rgba(${col.r}, ${col.g}, ${col.b}, 1)`,
                    borderDash: [8, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                    order: 1
                });
                resumes.push(this.resumeIntervalles(m, intervalles, grandeur, unite, u, mobilesToShow.length > 1));
            }
        }
        this.averages = [];
        this.resume = resumes.join('\n');

        let yLabel = grandeur === 'd'
            ? 'distance d parcourue (' + u.distance + ')'
            : 'vitesse v (' + u.vitesse + ')';
        return {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: this.optionsCommunes({
                x: {
                    type: 'category',
                    title: { display: true, text: 'intervalle : du point n° … au point n° …', font: { size: 14 } }
                },
                y: {
                    beginAtZero: true, // barres partant de zéro : on compare honnêtement les hauteurs
                    title: { display: true, text: yLabel, font: { size: 14 } }
                }
            }, true)
        };
    }

    optionsCommunes(scales, legende) {
        let sousTitre = this.getSousTitre();
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            locale: 'fr-FR', // virgule décimale sur les axes et dans les bulles
            plugins: {
                title: {
                    display: true,
                    text: this.getGraphTitle(),
                    font: { size: 18 }
                },
                subtitle: {
                    display: sousTitre.length > 0,
                    text: sousTitre,
                    font: { size: 13 },
                    color: '#34495e',
                    padding: { bottom: 8 }
                },
                legend: {
                    display: legende
                }
            },
            scales: scales
        };
    }

    // Résumé d'un mobile pour les graphiques en barres
    resumeIntervalles(m, intervalles, grandeur, unite, u, plusieurs) {
        let valeurs = intervalles.map(iv => iv[grandeur]);
        let min = Math.min(...valeurs), max = Math.max(...valeurs);
        let moyenne = valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
        let durees = intervalles.map(iv => iv.duree);
        let dMin = Math.min(...durees), dMax = Math.max(...durees);
        let prefixe = plusieurs ? 'Mobile ' + (m + 1) + ' : ' : '';
        let texte;
        if (grandeur === 'd') {
            let dec = u.decD;
            texte = prefixe + valeurs.length + ' écart' + (valeurs.length > 1 ? 's' : '') +
                ' · de ' + nombreFr(min, dec) + ' à ' + nombreFr(max, dec) + ' ' + u.distance +
                ' · moyenne ' + nombreFr(moyenne, dec) + ' ' + u.distance +
                (unite === 'm' ? ' (' + nombreFr(moyenne * 100, 1) + ' cm)' : '');
            if (dMax - dMin > 0.02 * dMin) {
                texte += '\n⚠️ Les durées entre les points ne sont pas toutes égales : compare plutôt les vitesses.';
            } else {
                texte += ' · durée entre deux points : ' + nombreFr(dMin, 2) + ' s';
            }
        } else {
            let dec = u.decV;
            texte = prefixe + 'v de ' + nombreFr(min, dec) + ' à ' + nombreFr(max, dec) + ' ' + u.vitesse +
                ' · moyenne ' + nombreFr(moyenne, dec) + ' ' + u.vitesse;
            if (unite === 'm') {
                let kmh = moyenne * 3.6;
                texte += ', soit ' + nombreFr(kmh, kmh < 10 ? 1 : 0) + ' km/h';
            }
        }
        return texte;
    }

    // Résumé pour les courbes : moyenne de l'accélération seulement
    resumeCourbes(unite) {
        if (this.graphType === 'a(t)' && this.averages.length > 0) {
            let ua = unite === 'm' ? 'm/s²' : 'px/s²';
            if (this.averages.length === 1) {
                return 'Moyenne : ' + nombreFr(this.averages[0].avg, 2) + ' ' + ua;
            }
            return this.averages.map(a => 'Moyenne Mobile ' + (a.mobile + 1) + ' : ' + nombreFr(a.avg, 2) + ' ' + ua).join('  |  ');
        }
        return '';
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
        if (this.graphType === 'y(x)') {
            this.egaliserEchelles();
        }

        // Affiche le résumé des mesures sous le graphique
        this.updateAccelerationInfo();
    }

    // Même échelle sur les deux axes (1 m vaut le même nombre de pixels en x et en y) :
    // indispensable pour reconnaître un cercle ou une droite inclinée.
    egaliserEchelles() {
        let chart = this.chart;
        let points = chart.data.datasets.flatMap(d => d.data);
        let xs = points.map(p => p.x).concat([0]);
        let ys = points.map(p => p.y).concat([0]);
        let xMin = Math.min(...xs), xMax = Math.max(...xs);
        let yMin = Math.min(...ys), yMax = Math.max(...ys);
        let mx = (xMax - xMin) * 0.05, my = (yMax - yMin) * 0.05;
        xMin -= mx; xMax += mx; yMin -= my; yMax += my;
        if (!(xMax > xMin)) { xMin -= 0.5; xMax += 0.5; }
        if (!(yMax > yMin)) { yMin -= 0.5; yMax += 0.5; }
        // Deux passes : les graduations changent un peu la taille de la zone de tracé
        for (let passe = 0; passe < 2; passe++) {
            let zone = chart.chartArea;
            if (!zone) return;
            let w = zone.right - zone.left, h = zone.bottom - zone.top;
            if (w <= 0 || h <= 0) return;
            let echelle = Math.max((xMax - xMin) / w, (yMax - yMin) / h);
            let cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2;
            chart.options.scales.x.min = cx - echelle * w / 2;
            chart.options.scales.x.max = cx + echelle * w / 2;
            chart.options.scales.y.min = cy - echelle * h / 2;
            chart.options.scales.y.max = cy + echelle * h / 2;
            chart.update('none');
        }
    }

    // Texte sous le graphique : résumé des mesures, manque de points, absence d'étalonnage
    updateAccelerationInfo() {
        let infoDiv = document.getElementById('acceleration-info');
        if (!infoDiv) return;

        let mobiles = this.mobilesAffiches();
        let maxPoints = Math.max(0, ...mobiles.map(m => this.data.getPointCount(m)));
        let lignes = [];
        if (maxPoints < this.pointsNecessaires()) {
            let n = this.pointsNecessaires();
            lignes.push('Pas encore assez de points pour ce graphique : choisis « 🎯 Pointage vidéo » et pointe au moins ' +
                n + ' position' + (n > 1 ? 's' : '') + ' du mobile.');
        } else {
            if (this.resume) lignes.push(this.resume);
            if (this.uniteAffichee(mobiles) === 'px') lignes.push(MESSAGE_SANS_ETALONNAGE);
        }

        if (lignes.length > 0) {
            infoDiv.textContent = lignes.join('\n');
            infoDiv.style.display = 'block';
        } else {
            infoDiv.textContent = '';
            infoDiv.style.display = 'none';
        }
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        // Masque le résumé des mesures
        let infoDiv = document.getElementById('acceleration-info');
        if (infoDiv) {
            infoDiv.style.display = 'none';
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
