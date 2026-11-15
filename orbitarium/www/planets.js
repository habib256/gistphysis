// Définition des planètes, astéroïdes et fonctions associées
//
// Durées : chaque astre avance de (2π / période) × orbitSpeedScale × multiplicateur par image.
// Une image fait donc avancer le temps de orbitSpeedScale × multiplicateur jours, pour TOUS les
// astres (planètes, satellites, comète, astéroïdes) : les durées de révolution sont respectées
// les unes par rapport aux autres, et l'horloge de la simulation (animation.js) les mesure.
// Tailles et distances, elles, ne sont pas à l'échelle (voir « Pas à l'échelle » dans index.html).

// Pour la Terre, (2π/365.25) * orbitSpeedScale ≈ 0,03.
const orbitSpeedScale = 1.74;
// Même facteur pour les satellites : sinon la Lune ferait le tour de la Terre trop vite
// (avant correction : facteur 2,0 et avance comptée deux fois par image → 11,9 jours au lieu de 27,3).
const satelliteOrbitSpeedScale = orbitSpeedScale;
// Jours simulés par image pour un multiplicateur de 1.
const JOURS_PAR_PAS = orbitSpeedScale;

const planets = [
    { name: "Mercure", orbit: 500.00, ua: 0.387, radius: 9.00, period: 87.97, speed: (2 * Math.PI / 87.97) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#aaa' },
    { name: "Vénus",   orbit: 700.00, ua: 0.723, radius: 12.00, period: 224.70, speed: (2 * Math.PI / 224.70) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ffcc00' },
    { name: "Terre",   orbit: 900.00, ua: 1.0, radius: 15.00, period: 365.25, speed: (2 * Math.PI / 365.25) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#00aaff',
      satellites: [
          { name: "Lune",  orbit: 35.00,  radius: 3.00, period: 27.32, speed: (2 * Math.PI / 27.32) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#cccccc' }
      ]
    },
    { name: "Mars",    orbit: 1100.00, ua: 1.524, radius: 10.50, period: 686.98, speed: (2 * Math.PI / 686.98) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ff5500',
      satellites: [
          { name: "Phobos", orbit: 35.00, radius: 3.00, period: 0.319, speed: (2 * Math.PI / 0.319) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#bbbbbb' },
          { name: "Deimos", orbit: 45.00, radius: 3.00, period: 1.263, speed: (2 * Math.PI / 1.263) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' }
      ]
    },
    { name: "Cérès", orbit: 1375.00, ua: 2.77, dwarf: true, radius: 7.00, period: 1680.00, speed: (2 * Math.PI / 1680.00) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#c8ac5c', hideOrbit: true },
    { name: "Jupiter", orbit: 1650.00, ua: 5.204, radius: 24.00, period: 4332.82, speed: (2 * Math.PI / 4332.82) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ffaa00',
      satellites: [
          { name: "Io",       orbit: 50.00,  radius: 3.75, period: 1.769, speed: (2 * Math.PI / 1.769) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ffcc99' },
          { name: "Europe",   orbit: 65.00,  radius: 3.25, period: 3.551, speed: (2 * Math.PI / 3.551) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ccccff' },
          { name: "Ganymède", orbit: 85.00,  radius: 4.50, period: 7.155, speed: (2 * Math.PI / 7.155) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ff9999' },
          { name: "Callisto", orbit: 105.00, radius: 4.20, period: 16.689, speed: (2 * Math.PI / 16.689) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ccffcc' }
      ]
    },
    { name: "Saturne", orbit: 2200.00, ua: 9.572, radius: 21.00, period: 10759, speed: (2 * Math.PI / 10759) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#d4a26c', // beige : couleur du dessin, de la trace et de la pastille
      satellites: [
          { name: "Mimas",    orbit: 40.00,  radius: 2.00, period: 0.942, speed: (2 * Math.PI / 0.942) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' },
          { name: "Encelade", orbit: 50.00,  radius: 2.25, period: 1.370, speed: (2 * Math.PI / 1.370) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#66ffff' },
          { name: "Téthys",   orbit: 60.00,  radius: 3.00, period: 1.888, speed: (2 * Math.PI / 1.888) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#eeeeee' },
          { name: "Dioné",    orbit: 65.00,  radius: 3.00, period: 2.736, speed: (2 * Math.PI / 2.736) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' },
          { name: "Rhéa",     orbit: 75.00,  radius: 3.50, period: 4.518, speed: (2 * Math.PI / 4.518) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#cccccc' },
          { name: "Titan",    orbit: 90.00,  radius: 4.50, period: 15.945, speed: (2 * Math.PI / 15.945) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ffaa00' },
          { name: "Japet",    orbit: 110.00, radius: 3.50, period: 79.33, speed: (2 * Math.PI / 79.33) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#bbbbbb' }
      ]
    },
    { name: "Uranus",  orbit: 2800.00, ua: 19.164, radius: 18.00, period: 30685, speed: (2 * Math.PI / 30685) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#66ccff',
      satellites: [
          { name: "Miranda", orbit: 40.00,  radius: 2.00, period: 1.413, speed: (2 * Math.PI / 1.413) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#cccccc' },
          { name: "Ariel",   orbit: 50.00,  radius: 3.00, period: 2.520, speed: (2 * Math.PI / 2.520) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' },
          { name: "Umbriel", orbit: 60.00,  radius: 3.00, period: 4.144, speed: (2 * Math.PI / 4.144) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#bbbbbb' },
          { name: "Titania", orbit: 70.00,  radius: 3.50, period: 8.706, speed: (2 * Math.PI / 8.706) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#eeeeee' },
          { name: "Obéron", orbit: 80.00,  radius: 3.50, period: 13.463, speed: (2 * Math.PI / 13.463) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' }
      ]
    },
    { name: "Neptune", orbit: 3200.00, ua: 30.18, radius: 18.00, period: 60190, speed: (2 * Math.PI / 60190) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#3366ff',
      satellites: [
          { name: "Triton", orbit: 50.00,  radius: 3.50, period: 5.877, speed: -(2 * Math.PI / 5.877) * satelliteOrbitSpeedScale /* rétrograde */, angle: Math.random() * Math.PI * 2, color: '#cccccc' }
      ]
    },
    { name: "Pluton", orbit: 3600.00, dwarf: true, ua: 39.48, radius: 8.00, period: 90560, speed: (2 * Math.PI / 90560) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#b0947c',
      satellites: [
          { name: "Charon", orbit: 30.00, radius: 2.50, period: 6.387, speed: (2 * Math.PI / 6.387) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#aaaaaa' }
      ]
    },
    // Comète de Halley (JPL Small-Body Database, 1P/Halley) : périhélie 0,575 UA, aphélie 35,3 UA,
    // excentricité 0,968, période ≈ 76 ans. Son « angle » est l'anomalie moyenne : elle croît
    // régulièrement et l'équation de Kepler donne la position, rapide près du Soleil, lente au loin.
    // Les distances réelles sont converties avec l'échelle resserrée des planètes (distanceAffichee) :
    // le périhélie tombe entre les orbites de Mercure et de Vénus, l'aphélie entre Neptune et Pluton.
    // (Avant : ellipse de périhélie 60 unités, dans le disque du Soleil dessiné, et mouvement
    // régulier en anomalie excentrique, donc lent près du Soleil, à l'inverse de la réalité.)
    { name: "Halley",
      isComet: true,
      e: 0.968,
      aUA: 17.94,
      rotation: 2.83, // direction du périhélie
      period: 27759, // 76 ans environ en jours
      // Départ sur la branche qui revient vers le Soleil (dernier quart de la période).
      angle: (3 * Math.PI/2) + Math.random() * (Math.PI/2),
      speed: (2 * Math.PI / 27759) * orbitSpeedScale,
      radius: 6.00,
      color: '#99ffee' // cyan pâle : couleur propre (la Lune est #cccccc, Mercure #aaa)
    }
];

let asteroidBelt = [];
let asteroidBelt2 = [];

// ---------- Échelle des distances ----------
// Les rayons d'orbite affichés (champ orbit) sont resserrés : Neptune est 78 fois plus loin du Soleil
// que Mercure, mais seulement 6,4 fois plus loin à l'écran. distanceAffichee convertit une distance
// réelle (en UA) avec à peu près la même échelle : polynôme de degré 3 en ln(UA), ajusté par moindres
// carrés sur les 10 couples (ua, orbit) des planètes, de Cérès et de Pluton (écart ≤ 76 unités, alors
// que deux orbites voisines sont séparées d'au moins 200 unités). Une courbe lisse évite que l'orbite
// de la comète présente des bosses ; elle reste croissante sur tout l'intervalle utile.
const ECHELLE_COEF = [881.458, 424.998, 27.148, 15.408];

function distanceAffichee(ua) {
    const x = Math.log(ua);
    return ECHELLE_COEF[0] + x * (ECHELLE_COEF[1] + x * (ECHELLE_COEF[2] + x * ECHELLE_COEF[3]));
}

// Distance réelle (UA) correspondant à un rayon affiché (fonction réciproque, par dichotomie).
function distanceReelle(rayonAffiche) {
    let lo = Math.log(0.05), hi = Math.log(500);
    for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (distanceAffichee(Math.exp(mid)) < rayonAffiche) lo = mid; else hi = mid;
    }
    return Math.exp((lo + hi) / 2);
}

// ---------- Comète : loi de Kepler ----------
// Position de la comète (repère du Soleil, unités affichées) pour une anomalie moyenne M.
function positionComete(comete, M) {
    const e = comete.e;
    M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let E = e > 0.8 ? Math.PI : M; // équation de Kepler E − e sin E = M (méthode de Newton)
    for (let k = 0; k < 50; k++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < 1e-12) break;
    }
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const R = distanceAffichee(comete.aUA * (1 - e * Math.cos(E)));
    const th = nu + comete.rotation;
    return {x: R * Math.cos(th), y: R * Math.sin(th)};
}

// Orbite de la comète (repère du Soleil, unités affichées), calculée une fois.
let orbiteCometeCache = null;
function orbiteComete(comete) {
    if (orbiteCometeCache) return orbiteCometeCache;
    const e = comete.e, p = comete.aUA * (1 - e * e), pts = [];
    for (let k = 0; k <= 360; k++) {
        const nu = -Math.PI + 2 * Math.PI * k / 360;
        const R = distanceAffichee(p / (1 + e * Math.cos(nu)));
        pts.push({x: R * Math.cos(nu + comete.rotation), y: R * Math.sin(nu + comete.rotation)});
    }
    return (orbiteCometeCache = pts);
}

// Vitesse angulaire d'un astéroïde à partir de son rayon affiché : troisième loi de Kepler
// (période en années = distance en UA puissance 1,5). Les astéroïdes de la ceinture principale
// tournent ainsi moins vite que Mars, ceux de la ceinture de Kuiper moins vite que Neptune.
function vitesseAsteroide(rayonAffiche) {
    const periodeJours = Math.pow(distanceReelle(rayonAffiche), 1.5) * 365.25;
    return (2 * Math.PI / periodeJours) * orbitSpeedScale;
}

function initPlanets() {
    // Chaque satellite connaît sa planète (fiche, toucher d'un satellite).
    planets.forEach(p => (p.satellites || []).forEach(s => { s.parent = p; }));

    const numAsteroids = 200; // Nombre d'astéroïdes
    asteroidBelt = [];
    for (let i = 0; i < numAsteroids; i++) {
        const orbit = 1375.00 + (Math.random() * 200 - 100);
        const speed = vitesseAsteroide(orbit);
        const radius = 0.5 + Math.random() * 1.0;
        asteroidBelt.push({ orbit, angle: Math.random() * Math.PI * 2, speed, radius, color: '#888888' });
    }

    const numAsteroids2 = 400;
    asteroidBelt2 = [];
    for (let i = 0; i < numAsteroids2; i++) {
        const orbit = 3600.00 + Math.random() * 800;
        const speed = vitesseAsteroide(orbit);
        const radius = 0.5 + Math.random() * 1.0;
        asteroidBelt2.push({ orbit, angle: Math.random() * Math.PI * 2, speed, radius, color: '#888888' });
    }
}

function updateAngles(multiplier) {
    planets.forEach(planet => {
        planet.angle += planet.speed * multiplier;
        if (planet.satellites) {
            planet.satellites.forEach(sat => {
                sat.angle += sat.speed * multiplier;
            });
        }
    });
}

// ---------- Fiches des astres (toucher ou clic sur un astre) ----------
// Sources : NASA, Planetary Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet, mise à jour du
// 18/03/2025) et Sun Fact Sheet ; JPL Small-Body Database pour Cérès et la comète de Halley ;
// JPL Planetary Satellite Mean Elements pour les satellites. Valeurs arrondies pour le collège.
// Les périodes de Saturne, Uranus et Neptune diffèrent de moins de 1 % selon les sources
// (NASA : 10 747, 30 589 et 59 800 jours ; périodes sidérales usuelles, utilisées par la
// simulation : 10 759, 30 685 et 60 190 jours) : les fiches donnent des valeurs vraies pour les deux.
const INFOS_ASTRES = {
    "Soleil": { type: "Étoile", lignes: [
        ["Place", "au centre du système solaire"],
        ["Diamètre", "1,39 million de km (109 fois celui de la Terre)"]],
        note: "Il produit sa propre lumière (source primaire). Il attire toutes les planètes : c’est la gravitation qui les maintient sur leur orbite." },
    "Mercure": { type: "Planète tellurique (rocheuse)", lignes: [
        ["Distance moyenne au Soleil", "58 millions de km"],
        ["Révolution (un tour du Soleil)", "88 jours"],
        ["Vitesse sur son orbite", "47,4 km/s"],
        ["Diamètre", "4 879 km (0,4 fois celui de la Terre)"]],
        note: "La planète la plus proche du Soleil : c’est elle qui fait le tour du Soleil le plus vite." },
    "Vénus": { type: "Planète tellurique (rocheuse)", lignes: [
        ["Distance moyenne au Soleil", "108 millions de km"],
        ["Révolution (un tour du Soleil)", "225 jours"],
        ["Vitesse sur son orbite", "35,0 km/s"],
        ["Diamètre", "12 104 km (presque celui de la Terre)"]],
        note: "Très brillante le soir ou le matin, on l’appelle « l’étoile du berger », mais c’est une planète : elle renvoie la lumière du Soleil." },
    "Terre": { type: "Planète tellurique (rocheuse)", lignes: [
        ["Distance moyenne au Soleil", "150 millions de km (1 UA)"],
        ["Révolution (un tour du Soleil)", "365,25 jours (1 an)"],
        ["Vitesse sur son orbite", "29,8 km/s"],
        ["Diamètre", "12 756 km"]],
        note: "Elle tourne aussi sur elle-même en 24 heures (rotation) : c’est ce qui explique l’alternance du jour et de la nuit. Son satellite : la Lune." },
    "Mars": { type: "Planète tellurique (rocheuse)", lignes: [
        ["Distance moyenne au Soleil", "228 millions de km"],
        ["Révolution (un tour du Soleil)", "687 jours (1,9 an)"],
        ["Vitesse sur son orbite", "24,1 km/s"],
        ["Diamètre", "6 792 km (environ la moitié de celui de la Terre)"]],
        note: "Deux petits satellites : Phobos et Deimos." },
    "Cérès": { type: "Planète naine", lignes: [
        ["Distance moyenne au Soleil", "414 millions de km"],
        ["Révolution (un tour du Soleil)", "1 680 jours (4,6 ans)"],
        ["Diamètre", "939 km"]],
        note: "Le plus gros objet de la ceinture d’astéroïdes, entre Mars et Jupiter. Ce n’est pas une planète." },
    "Jupiter": { type: "Planète gazeuse (géante)", lignes: [
        ["Distance moyenne au Soleil", "779 millions de km"],
        ["Révolution (un tour du Soleil)", "11,9 ans"],
        ["Vitesse sur son orbite", "13,1 km/s"],
        ["Diamètre", "142 984 km (11 fois celui de la Terre)"]],
        note: "La plus grosse planète du système solaire. Elle n’a pas de surface solide." },
    "Saturne": { type: "Planète gazeuse (géante)", lignes: [
        ["Distance moyenne au Soleil", "1,43 milliard de km"],
        ["Révolution (un tour du Soleil)", "environ 29 ans et demi"],
        ["Vitesse sur son orbite", "9,7 km/s"],
        ["Diamètre", "120 536 km (plus de 9 fois celui de la Terre)"]],
        note: "Ses anneaux sont faits surtout de morceaux de glace, avec un peu de roche et de poussières." },
    "Uranus": { type: "Planète gazeuse (géante)", lignes: [
        ["Distance moyenne au Soleil", "2,87 milliards de km"],
        ["Révolution (un tour du Soleil)", "84 ans"],
        ["Vitesse sur son orbite", "6,8 km/s"],
        ["Diamètre", "51 118 km (4 fois celui de la Terre)"]],
        note: "" },
    "Neptune": { type: "Planète gazeuse (géante)", lignes: [
        ["Distance moyenne au Soleil", "4,5 milliards de km"],
        ["Révolution (un tour du Soleil)", "près de 165 ans"],
        ["Vitesse sur son orbite", "5,4 km/s"],
        ["Diamètre", "49 528 km (4 fois celui de la Terre)"]],
        note: "Des 8 planètes, c’est la plus éloignée du Soleil : c’est elle qui fait le tour du Soleil le plus lentement." },
    "Pluton": { type: "Planète naine", lignes: [
        ["Distance moyenne au Soleil", "5,9 milliards de km"],
        ["Révolution (un tour du Soleil)", "248 ans"],
        ["Vitesse sur son orbite", "4,7 km/s"],
        ["Diamètre", "2 376 km (plus petite que la Lune)"]],
        note: "Considérée comme une planète jusqu’en 2006, c’est aujourd’hui une planète naine. Le système solaire compte 8 planètes." },
    "Halley": { nom: "Comète de Halley", type: "Comète", lignes: [
        ["Distance au Soleil", "de 86 millions de km (plus près du Soleil que Vénus) à 5,3 milliards de km (plus loin que Neptune)"],
        ["Révolution (un tour du Soleil)", "environ 76 ans"],
        ["Noyau", "environ 15 km sur 8 km, de glace et de poussières"]],
        note: "Son orbite est une ellipse très allongée (ici déformée, car les distances ne sont pas à l’échelle). En se rapprochant du Soleil, elle est accélérée par son attraction : elle va beaucoup plus vite près du Soleil que loin de lui. Dernier passage près du Soleil : 1986 ; prochain : 2061." },
    "Lune": { type: "Satellite naturel de la Terre", lignes: [
        ["Distance à la Terre", "384 000 km"],
        ["Révolution (un tour de la Terre)", "27,3 jours"],
        ["Diamètre", "3 475 km (environ le quart de celui de la Terre)"]],
        note: "Elle ne produit pas de lumière : elle renvoie celle du Soleil (source secondaire). Le cycle de ses phases dure 29,5 jours." },
    "Triton": { note: "Il tourne autour de Neptune dans le sens inverse de la rotation de Neptune : c’est le seul gros satellite du système solaire dans ce cas." }
};

// Durée écrite en français (virgule décimale, « jour » au singulier en dessous de 2).
function formaterNombre(x, decimales) {
    return x.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

function formaterDureeSatellite(jours) {
    if (jours < 1) return formaterNombre(jours * 24, 1) + " heures";
    const d = jours < 100 ? 1 : 0;
    return formaterNombre(jours, d) + (jours < 2 ? " jour" : " jours");
}

// Contenu de la fiche d'un astre (planète, satellite, comète ou "soleil").
function ficheAstre(astre) {
    if (astre === "soleil") return Object.assign({ nom: "Soleil" }, INFOS_ASTRES["Soleil"]);
    const infos = INFOS_ASTRES[astre.name] || {};
    if (astre.parent && !infos.type) {
        // Satellite sans fiche détaillée : type et durée du tour, tirés des données de la simulation.
        return {
            nom: astre.name,
            type: "Satellite naturel de " + astre.parent.name,
            lignes: [["Révolution (un tour de " + astre.parent.name + ")", formaterDureeSatellite(astre.period)]],
            note: infos.note || ""
        };
    }
    return Object.assign({ nom: astre.name, lignes: [], note: "" }, infos);
}
