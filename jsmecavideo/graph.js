// graph.js — graphiques et lecture des mesures (Chart.js)
//
// Pensé pour le collège : titres et axes en français avec unités, virgule décimale,
// graduations rondes, graphiques en barres pour lire la chronophotographie (écart entre deux
// positions, vitesse v = d / Δt sur chaque intervalle), trajectoire à la même échelle sur les
// deux axes (un cercle reste un cercle). Chaque mobile a sa couleur ET sa forme (× + ○ □).
// Sans étalonnage, les valeurs sont en pixels : les axes l'indiquent et un message le dit.

const GROUPE_LYCEE = 'Pour aller plus loin (lycée)';
const TYPES_GRAPHIQUES = [
    { valeur: 'y(x)', libelle: 'Trajectoire (positions successives)' },
    { valeur: 'ecarts', libelle: 'Écart entre deux positions (d)' },
    { valeur: 'vitesse', libelle: 'Vitesse sur chaque intervalle (v = d / Δt)' },
    { valeur: 'x(t)', libelle: 'Position x au cours du temps' },
    { valeur: 'y(t)', libelle: 'Position y au cours du temps' },
    { valeur: 'tableau', libelle: 'Tableau des mesures' },
    { valeur: 'v(t)', libelle: 'Vitesse v(t), méthode centrée', groupe: GROUPE_LYCEE },
    { valeur: 'vx(t)', libelle: 'Vitesse horizontale vx(t)', groupe: GROUPE_LYCEE },
    { valeur: 'vy(t)', libelle: 'Vitesse verticale vy(t)', groupe: GROUPE_LYCEE },
    { valeur: 'a(t)', libelle: 'Accélération a(t)', groupe: GROUPE_LYCEE }
];

// Lisible au vidéoprojecteur
Chart.defaults.font.size = 15;
Chart.defaults.color = '#1f2933';

// Pas de graduation « rond » (1, 2, 2,5 ou 5 × 10ⁿ) pour environ n intervalles
function pasRond(etendue, n = 6) {
    if (!(etendue > 0)) return 1;
    const brut = etendue / n;
    const p = Math.pow(10, Math.floor(Math.log10(brut)));
    const m = brut / p;
    const k = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
    return k * p;
}

// Nombre de décimales nécessaires pour écrire les multiples d'un pas
function decimalesPas(pas) {
    for (let d = 0; d < 9; d++) {
        const x = pas * Math.pow(10, d);
        if (Math.abs(x - Math.round(x)) < 1e-6 * Math.max(1, x)) return d;
    }
    return 9;
}

// Bornes rondes contenant [min, max] (zéro inclus si demandé)
function bornesRondes(min, max, inclureZero) {
    if (inclureZero) { min = Math.min(0, min); max = Math.max(0, max); }
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (max - min < 1e-12) {
        const e = Math.abs(max) * 0.1 || 1;
        min -= e; max += e;
        if (inclureZero) { min = Math.min(0, min); max = Math.max(0, max); }
    }
    const pas = pasRond(max - min);
    return { min: Math.floor(min / pas + 1e-9) * pas, max: Math.ceil(max / pas - 1e-9) * pas, pas: pas };
}

// Options d'un axe linéaire à graduations rondes, écrites à la française
function axeRond(b, titre) {
    const dec = decimalesPas(b.pas);
    return {
        type: 'linear',
        min: b.min,
        max: b.max,
        ticks: { stepSize: b.pas, includeBounds: false, callback: (v) => nombreLisible(v, dec) },
        title: { display: true, text: titre }
    };
}

class Graph {
    constructor(data, canvasElt) {
        this.data = data;
        this.canvas = canvasElt;
        this.chart = null;
        this.graphType = 'y(x)';
        this.averages = [];
        this.resume = '';
        this.creerSelecteurs();
    }

    // Sélecteurs du graphique et du mobile, créés une fois dans #choix-graphique
    creerSelecteurs() {
        const zone = document.getElementById('choix-graphique');
        const champ = (legende, select) => {
            const l = document.createElement('label');
            l.className = 'champ';
            const s = document.createElement('span');
            s.className = 'legende';
            s.textContent = legende;
            l.appendChild(s);
            l.appendChild(select);
            zone.appendChild(l);
            return l;
        };
        this.selector = document.createElement('select');
        this.selector.id = 'choix-type-graphique';
        let groupes = {};
        TYPES_GRAPHIQUES.forEach(t => {
            const option = document.createElement('option');
            option.value = t.valeur;
            option.textContent = t.libelle;
            if (t.groupe) {
                if (!groupes[t.groupe]) {
                    groupes[t.groupe] = document.createElement('optgroup');
                    groupes[t.groupe].label = t.groupe;
                    this.selector.appendChild(groupes[t.groupe]);
                }
                groupes[t.groupe].appendChild(option);
            } else {
                this.selector.appendChild(option);
            }
        });
        this.selector.value = this.graphType;
        champ('Graphique', this.selector);
        this.selector.addEventListener('change', () => {
            this.graphType = this.selector.value;
            this.updateChart();
            if (typeof majGuide === 'function') majGuide();
        });

        this.mobileSelector = document.createElement('select');
        this.mobileSelector.id = 'choix-mobile-graphique';
        this.champMobile = champ('Mobile', this.mobileSelector);
        this.mobileSelector.addEventListener('change', () => this.updateChart());
    }

    choisirType(type) {
        this.graphType = type;
        this.selector.value = type;
    }

    updateMobileSelector() {
        const valeur = this.mobileSelector.value;
        const options = this.data.numMobiles === 1 ? [['0', 'Mobile 1']]
            : [['-1', 'Tous les mobiles']].concat([...Array(this.data.numMobiles).keys()].map(i => [String(i), 'Mobile ' + (i + 1) + ' ' + this.data.getColor(i).symbole]));
        const signature = options.map(o => o.join(':')).join('|');
        if (this._signatureMobiles !== signature) {
            this._signatureMobiles = signature;
            this.mobileSelector.innerHTML = '';
            options.forEach(([v, t]) => {
                const o = document.createElement('option');
                o.value = v;
                o.textContent = t;
                this.mobileSelector.appendChild(o);
            });
            // Passage de 1 à plusieurs mobiles : on montre tous les mobiles
            const avantPlusieurs = this._plusieurs === true;
            this._plusieurs = this.data.numMobiles > 1;
            if (this._plusieurs && !avantPlusieurs) this.mobileSelector.value = '-1';
            else if (options.some(o => o[0] === valeur)) this.mobileSelector.value = valeur;
        }
        this.champMobile.hidden = this.data.numMobiles === 1;
    }

    mobilesAffiches() {
        let m = parseInt(this.mobileSelector.value, 10);
        if (isNaN(m) || m >= this.data.numMobiles) m = this.data.numMobiles > 1 ? -1 : 0;
        return m === -1 ? [...Array(this.data.numMobiles).keys()] : [m];
    }

    uniteAffichee() { return this.data.getUnite(); }

    getGraphTitle() {
        switch (this.graphType) {
            case 'y(x)': return 'Trajectoire : positions successives du mobile';
            case 'ecarts': return 'Écart entre deux positions successives';
            case 'vitesse': return 'Vitesse sur chaque intervalle : v = d / Δt';
            case 'x(t)': return 'Position horizontale x au cours du temps';
            case 'y(t)': return 'Position verticale y au cours du temps';
            case 'v(t)': return 'Vitesse v au cours du temps (méthode centrée)';
            case 'vx(t)': return 'Vitesse horizontale vx au cours du temps';
            case 'vy(t)': return 'Vitesse verticale vy au cours du temps';
            case 'a(t)': return 'Accélération a au cours du temps';
            case 'tableau': return 'Tableau des mesures';
            default: return 'Graphique';
        }
    }

    // Aide à la lecture (sous le titre, repliable). Quand les durées Δt ne sont pas toutes
    // égales, l'aide « de plus en plus hautes → accéléré » serait fausse : on ne l'affiche pas.
    getSousTitre() {
        const egales = this.data.dureesEgales();
        switch (this.graphType) {
            case 'y(x)': return 'Points alignés → trajectoire rectiligne ; sur un cercle → circulaire ; sur une courbe → curviligne. ' +
                'Même échelle sur les deux axes : la forme n’est pas déformée.';
            case 'ecarts': return egales
                ? 'Durées Δt toutes égales : barres presque de même hauteur → vitesse constante → mouvement uniforme ; de plus en plus hautes → accéléré ; ' +
                  'de plus en plus basses → ralenti. De petites différences viennent du pointage.'
                : '';
            case 'vitesse': return 'd = distance entre deux points, Δt = durée entre ces deux points. ' +
                'Même hauteur → uniforme ; de plus en plus haut → accéléré ; de plus en plus bas → ralenti.';
            case 'x(t)': case 'y(t)': return 'L’instant t est compté depuis le premier point (t = 0).';
            case 'tableau': return 'Une ligne par point. d, Δt et v sont mesurés depuis le point précédent ; l’instant t est compté depuis le premier point. v est calculée avec le d affiché.';
            default: return '';
        }
    }

    // Avertissement affiché sur le graphique lui-même
    getAlerte() {
        if ((this.graphType === 'ecarts' || this.graphType === 'tableau') && !this.data.dureesEgales()) return MESSAGE_DUREES_INEGALES;
        return '';
    }

    pointsNecessaires() {
        switch (this.graphType) {
            case 'ecarts': case 'vitesse': return 2;
            case 'v(t)': case 'vx(t)': case 'vy(t)': return 3;
            case 'a(t)': return 5;
            default: return 1;
        }
    }

    styleDataset(m) {
        const c = this.data.getColor(m);
        return {
            borderColor: c.hex,
            backgroundColor: c.hex,
            pointStyle: c.chart,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBorderWidth: 2,
            pointBorderColor: c.hex,
            pointBackgroundColor: c.chart === 'circle' || c.chart === 'rect' ? 'rgba(255,255,255,0.6)' : c.hex
        };
    }

    getChartConfig() {
        const mobiles = this.mobilesAffiches();
        const unite = this.uniteAffichee();
        const u = unitesMesure();
        if (this.graphType === 'ecarts' || this.graphType === 'vitesse') {
            return this.configBarres(mobiles, unite, u);
        }

        let datasets = [];
        let xLabel = 'instant t (' + u.temps + ')', yLabel = '';
        let averages = [];
        // Zéro imposé seulement pour le temps et les grandeurs toujours positives
        let zeroX = true, zeroY = false;

        for (let m of mobiles) {
            const points = this.data.getPositions(m);
            let pts = [];
            switch (this.graphType) {
                case 'y(x)':
                    pts = points.map(p => ({ x: p.x, y: p.y }));
                    xLabel = 'position horizontale x (' + u.distance + ')';
                    yLabel = 'position verticale y (' + u.distance + ')';
                    zeroX = false;
                    break;
                case 'x(t)':
                    pts = points.map(p => ({ x: p.time, y: p.x }));
                    yLabel = 'position x (' + u.distance + ')';
                    break;
                case 'y(t)':
                    pts = points.map(p => ({ x: p.time, y: p.y }));
                    yLabel = 'position y (' + u.distance + ')';
                    break;
                case 'v(t)':
                    pts = this.data.getVelocities(m).map(v => ({ x: v.time, y: v.v }));
                    yLabel = 'vitesse v (' + u.vitesse + ')';
                    zeroY = true;
                    break;
                case 'vx(t)':
                    pts = this.data.getVelocities(m).map(v => ({ x: v.time, y: v.vx }));
                    yLabel = 'vitesse horizontale vx (' + u.vitesse + ')';
                    break;
                case 'vy(t)':
                    pts = this.data.getVelocities(m).map(v => ({ x: v.time, y: v.vy }));
                    yLabel = 'vitesse verticale vy (' + u.vitesse + ')';
                    break;
                case 'a(t)':
                    pts = this.data.getAccelerations(m).map(a => ({ x: a.time, y: a.a }));
                    yLabel = 'accélération a (' + u.vitesse + '/' + (data.uniteTemps === 'jour' ? 'jour' : 's') + ')';
                    zeroY = true;
                    break;
            }
            if (pts.length === 0) continue; // pas de légende pour un mobile sans données
            datasets.push(Object.assign({
                label: 'Mobile ' + (m + 1),
                data: pts,
                borderWidth: 2,
                showLine: true,
                tension: 0
            }, this.styleDataset(m)));

            // Ligne de la moyenne (accélération)
            if (this.graphType === 'a(t)' && pts.length > 0) {
                const moy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
                averages.push({ mobile: m, avg: moy });
                if (pts.length >= 2) datasets.push({
                    label: mobiles.length > 1 ? 'Moyenne (mobile ' + (m + 1) + ')' : 'Moyenne',
                    data: [{ x: pts[0].x, y: moy }, { x: pts[pts.length - 1].x, y: moy }],
                    borderColor: this.data.getColor(m).hex,
                    borderDash: [8, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    showLine: true,
                    tension: 0
                });
            }
        }

        const xs = datasets.flatMap(d => d.data.map(p => p.x)).concat(datasets.length ? [] : [0]);
        const ys = datasets.flatMap(d => d.data.map(p => p.y)).concat(datasets.length ? [] : [0]);
        const bx = bornesRondes(Math.min(...xs), Math.max(...xs), zeroX);
        const by = bornesRondes(Math.min(...ys), Math.max(...ys), zeroY);

        this.averages = averages;
        this.resume = this.resumeCourbes(unite);
        return {
            type: 'scatter',
            data: { datasets: datasets },
            options: this.optionsCommunes({ x: axeRond(bx, xLabel), y: axeRond(by, yLabel) },
                this.data.numMobiles > 1 || averages.length > 0)
        };
    }

    // Graphiques en barres : un intervalle par barre. Avec plusieurs mobiles, les barres
    // sont alignées par images (de l'image a à l'image b), pas par numéro de point.
    configBarres(mobiles, unite, u) {
        const grandeur = this.graphType === 'ecarts' ? 'd' : 'v';
        const plusieurs = mobiles.length > 1;
        const parMobile = mobiles.map(m => this.data.getIntervalles(m));
        let cles = [];
        parMobile.forEach(ivs => ivs.forEach(iv => {
            const k = iv.imageDe + '→' + iv.imageA;
            if (!cles.some(c => c.k === k)) cles.push({ k: k, de: iv.imageDe, a: iv.imageA, libelle: plusieurs ? k : iv.de + '→' + iv.a });
        }));
        cles.sort((x, y) => x.de - y.de || x.a - y.a);
        const labels = cles.map(c => c.libelle);
        let datasets = [], resumes = [], max = 0;
        mobiles.forEach((m, i) => {
            const intervalles = parMobile[i];
            const c = this.data.getColor(m);
            const valeurs = cles.map(cle => {
                const iv = intervalles.find(x => x.imageDe === cle.de && x.imageA === cle.a);
                return iv ? iv[grandeur] : null;
            });
            valeurs.forEach(v => { if (v > max) max = v; });
            if (intervalles.length === 0) return;
            datasets.push({
                type: 'bar',
                label: 'Mobile ' + (m + 1) + ' ' + c.symbole,
                data: valeurs,
                backgroundColor: c.hex + '73',
                borderColor: c.hex,
                borderWidth: 2,
                order: 2
            });
            const vals = intervalles.map(iv => iv[grandeur]);
            const moyenne = vals.reduce((s, v) => s + v, 0) / vals.length;
            datasets.push({
                type: 'line',
                label: 'Moyenne' + (plusieurs ? ' (mobile ' + (m + 1) + ')' : ''),
                data: valeurs.map(v => v === null ? null : moyenne),
                borderColor: c.hex,
                borderDash: [8, 4],
                borderWidth: 2,
                pointRadius: 0,
                spanGaps: true,
                fill: false,
                order: 1
            });
            resumes.push(this.resumeIntervalles(m, intervalles, grandeur, unite, u, plusieurs));
        });
        this.averages = [];
        this.resume = resumes.join('\n');
        const yLabel = grandeur === 'd' ? 'distance d parcourue (' + u.distance + ')' : 'vitesse v (' + u.vitesse + ')';
        const by = bornesRondes(0, max, true); // barres partant de zéro : on compare honnêtement les hauteurs
        return {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: this.optionsCommunes({
                x: { type: 'category', title: { display: true, text: plusieurs ? 'intervalle : de l’image n° … à l’image n° …' : 'intervalle : du point n° … au point n° …' } },
                y: axeRond(by, yLabel)
            }, true, grandeur === 'd' ? u.decD : u.decV)
        };
    }

    optionsCommunes(scales, legende, decimales) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            locale: 'fr-FR',
            plugins: {
                legend: { display: legende, labels: { usePointStyle: true, sort: (a, b) => a.datasetIndex - b.datasetIndex } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const y = ctx.parsed.y;
                            const dec = decimales !== undefined ? decimales : unitesMesure().decPos;
                            return ctx.dataset.label + ' : ' + nombreLisible(y, dec);
                        }
                    }
                }
            },
            scales: scales
        };
    }

    // Résumé (mêmes décimales que le tableau et le fichier)
    resumeIntervalles(m, intervalles, grandeur, unite, u, plusieurs) {
        const valeurs = intervalles.map(iv => iv[grandeur]);
        const min = Math.min(...valeurs), max = Math.max(...valeurs);
        const moyenne = valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
        const prefixe = plusieurs ? 'Mobile ' + (m + 1) + ' : ' : '';
        const n = nombreLisible;
        let texte;
        if (grandeur === 'd') {
            const dec = u.decD;
            texte = prefixe + valeurs.length + ' écart' + (valeurs.length > 1 ? 's' : '') +
                ' · de ' + n(min, dec) + ' à ' + n(max, dec) + ' ' + u.distance +
                ' · moyenne ' + n(moyenne, dec) + ' ' + u.distance;
            if (!plusieurs) texte += ' · ' + texteDurees();
        } else {
            const dec = u.decV;
            texte = prefixe + 'v de ' + n(min, dec) + ' à ' + n(max, dec) + ' ' + u.vitesse +
                ' · moyenne ' + n(moyenne, dec) + ' ' + u.vitesse;
            if (u.vitesse === 'm/s') {
                const kmh = moyenne * 3.6;
                texte += ', soit ' + nombreFr(kmh, kmh < 10 ? 1 : 0) + ' km/h';
            } else if (u.vitesse === 'km/jour') {
                texte += ', soit ' + nombreFr(moyenne / 86400, 1) + ' km/s';
            }
        }
        return texte;
    }

    resumeCourbes(unite) {
        if (this.graphType === 'a(t)' && this.averages.length > 0) {
            const ua = data.uniteVitesse() + '/' + (data.uniteTemps === 'jour' ? 'jour' : 's');
            if (this.averages.length === 1) return 'Moyenne : ' + nombreFr(this.averages[0].avg, 2) + ' ' + ua;
            return this.averages.map(a => 'Moyenne mobile ' + (a.mobile + 1) + ' : ' + nombreFr(a.avg, 2) + ' ' + ua).join('  |  ');
        }
        return '';
    }

    // Affiche le graphique choisi (la zone #graphique-zone doit être visible)
    updateChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.updateMobileSelector();
        document.getElementById('graph-titre').textContent = this.getGraphTitle();
        const aide = this.getSousTitre();
        document.getElementById('graph-aide').textContent = aide;
        const bloc = document.getElementById('graph-aide-bloc');
        bloc.hidden = !aide;
        bloc.querySelector('summary').textContent = this.graphType === 'tableau' ? 'Comment lire ce tableau ?' : 'Comment lire ce graphique ?';
        // Aide dépliée seulement s'il y a de la place (sinon : une ligne « Comment lire ce graphique ? »)
        if (!this._aideChoisie) bloc.open = document.getElementById('scene').clientHeight >= 520;
        if (!bloc.dataset.suivi) {
            bloc.dataset.suivi = '1';
            bloc.querySelector('summary').addEventListener('click', () => { this._aideChoisie = true; });
        }
        const alerte = this.getAlerte();
        const pa = document.getElementById('graph-alerte');
        pa.textContent = this.graphType === 'tableau' ? '' : alerte;
        pa.hidden = !alerte || this.graphType === 'tableau';

        const tableau = this.graphType === 'tableau';
        document.getElementById('graph-cadre').hidden = tableau;
        const zone = document.getElementById('tableau-zone');
        zone.hidden = !tableau;
        if (tableau) {
            this.resume = '';
            afficherTableauMesures(zone);
            this.updateAccelerationInfo();
            return;
        }
        zone.innerHTML = '';
        const config = this.getChartConfig();
        this.chart = new Chart(this.canvas, config);
        if (this.graphType === 'y(x)') this.egaliserEchelles();
        this.canvas.setAttribute('aria-label', this.getGraphTitle() + '. ' + (this.resume || ''));
        this.updateAccelerationInfo();
    }

    // Même échelle sur les deux axes (1 m vaut le même nombre de pixels en x et en y)
    egaliserEchelles() {
        const chart = this.chart;
        const points = chart.data.datasets.flatMap(d => d.data);
        if (points.length === 0) return;
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        let xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
        const marge = Math.max(xMax - xMin, yMax - yMin) * 0.06 || 1;
        xMin -= marge; xMax += marge; yMin -= marge; yMax += marge;
        for (let passe = 0; passe < 2; passe++) {
            const zone = chart.chartArea;
            if (!zone) return;
            const w = zone.right - zone.left, h = zone.bottom - zone.top;
            if (w <= 0 || h <= 0) return;
            const echelle = Math.max((xMax - xMin) / w, (yMax - yMin) / h);
            const cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2;
            const pas = pasRond(echelle * Math.max(w, h), Math.max(w, h) > 500 ? 8 : 6);
            const dec = decimalesPas(pas);
            const axes = chart.options.scales;
            axes.x.min = cx - echelle * w / 2;
            axes.x.max = cx + echelle * w / 2;
            axes.y.min = cy - echelle * h / 2;
            axes.y.max = cy + echelle * h / 2;
            [axes.x, axes.y].forEach(a => {
                a.ticks.stepSize = pas;
                a.ticks.includeBounds = false;
                a.ticks.callback = (v) => nombreLisible(v, dec);
            });
            chart.update('none');
        }
    }

    // Texte sous le graphique : résumé des mesures, manque de points, absence d'étalonnage
    updateAccelerationInfo() {
        const info = document.getElementById('acceleration-info');
        if (!info) return;
        const mobiles = this.mobilesAffiches();
        const maxPoints = Math.max(0, ...mobiles.map(m => this.data.getPointCount(m)));
        let lignes = [];
        if (maxPoints < this.pointsNecessaires()) {
            const n = this.pointsNecessaires();
            lignes.push('Pas encore assez de points pour ce graphique : étape « 🎯 Pointer », pointe au moins ' +
                n + ' position' + (n > 1 ? 's' : '') + ' du mobile.');
        } else {
            if (this.resume) lignes.push(this.resume);
            if (this.uniteAffichee() === 'px') lignes.push(MESSAGE_SANS_ETALONNAGE);
        }
        const texte = lignes.join('\n');
        if (info.textContent !== texte) info.textContent = texte;
        info.hidden = !texte;
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        const info = document.getElementById('acceleration-info');
        if (info) {
            info.hidden = true;
            info.textContent = '';
        }
    }
}
