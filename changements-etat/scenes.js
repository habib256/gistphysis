// Les changements d'état de l'eau — construction des trois scènes
// Version 1.1 — 20/11/2026
// M. VERHILLE Arnaud
// Licence GNU GPL v3 (voir README.md)
//
//   bacASable(nx, ny, tAir) : une pièce, un bécher d'eau sur une plaque chauffante, un bloc de
//                             glace, une flaque, une plaque froide contre le mur de droite ;
//   cycle(tMer)             : coupe de l'océan Indien jusqu'au Piton des Neiges, vent (alizés) ;
//   fusion(masse, niveau)   : bécher de glace pilée à −10 °C sur une plaque chauffante réglable.
// Chaque fonction renvoie {monde, thermometres, infos}. Utilisable aussi dans Node (tests).

'use strict';

(function (racine) {
  const CE = racine.ChangementsEtat || (typeof require === 'function' ? require('./simulation.js') : null);
  const {Monde, AIR, EAU, GLACE, VERRE, SOL, ROCHE, CHAUD, FROID, GRAIN, VENUE_DU_CIEL, FISSURE, satLiquide} = CE;

  // Air de départ : température et humidité relative données
  function remplirAir(monde, T, humidite) {
    const {n, typ} = monde;
    for (let i = 0; i < n; i++) {
      monde.tAmb[i] = T;
      if (typ[i] === AIR) { monde.T[i] = T; monde.v[i] = humidite * satLiquide(T); }
    }
  }

  // ---- Bac à sable ---------------------------------------------------------
  function bacASable(nx, ny, tAir = 20, {vide = false} = {}) {
    const monde = new Monde(nx, ny, {
      gParCase: 1, dt: 0.5, relaxAir: 0.002, kEvap: 0.015, kSubl: 0.004, brassage: 0.05, distBrassage: 3, aeration: 0.03,
      convection: 0.8, tChaud: 170, tFroid: -25, evapChaud: 0.05, fenetreAeration: 6, melangeLiquide: 0.03, nucleation: 0.5, seuilPluie: 0.06, seuilGivre: 0.3, dispersion: 8, diffGouttelettes: 0.08, depotGouttelettes: 0.01,
      sortieHaut: 0.5 * satLiquide(tAir),
    });
    monde.rectangle(0, 0, nx - 1, ny - 1, AIR, tAir);
    const thermometres = [];
    if (!vide) {
      const u = Math.max(1, Math.min(nx, ny) / 100);
      const sol = ny - 1;
      // Plaque chauffante et bécher d'eau
      const lb = Math.max(14, Math.round(nx * 0.16)), hb = Math.max(18, Math.round(ny * 0.32));
      const xb = Math.round(nx * 0.07) + 2;
      monde.rectangle(xb - 3, sol - 1, xb + lb + 2, sol, CHAUD, monde.r.tChaud);
      const fond = sol - 2;
      monde.rectangle(xb - 1, fond - hb, xb - 1, fond, VERRE, tAir);
      monde.rectangle(xb + lb, fond - hb, xb + lb, fond, VERRE, tAir);
      monde.rectangle(xb - 1, fond, xb + lb, fond, VERRE, tAir);
      const he = Math.round(hb * 0.7);
      monde.rectangle(xb, fond - he, xb + lb - 1, fond - 1, EAU, tAir);
      thermometres.push({x: xb + lb / 2, y: fond - 2.5});            // près du fond du bécher
      // Bloc de glace dans un récipient de verre (l'eau de fonte y reste), thermomètre au fond
      const lg = Math.round(12 * u), hg = Math.round(10 * u);
      const xg = Math.round(nx * 0.42), fondR = sol;
      monde.rectangle(xg - 3, fondR - hg - 3, xg - 3, fondR, VERRE, tAir);
      monde.rectangle(xg + lg + 2, fondR - hg - 3, xg + lg + 2, fondR, VERRE, tAir);
      monde.rectangle(xg - 3, fondR, xg + lg + 2, fondR, VERRE, tAir);
      monde.rectangle(xg, fondR - hg, xg + lg - 1, fondR - 1, GLACE, -10);
      thermometres.push({x: xg + lg / 2, y: fondR - 0.5});
      // Flaque
      const lf = Math.round(nx * 0.16), xf = Math.round(nx * 0.64);
      monde.rectangle(xf, sol - 1, xf + lf - 1, sol, EAU, tAir);
      // Plaque froide contre le mur de droite
      const hfr = Math.round(ny * 0.3);
      monde.rectangle(nx - 3, Math.round(ny * 0.25), nx - 1, Math.round(ny * 0.25) + hfr, FROID, -25);
    }
    remplirAir(monde, tAir, 0.3);
    return {monde, thermometres};
  }

  // ---- Cycle de l'eau à La Réunion -------------------------------------------
  // Coupe sans échelle de l'île, d'une côte à l'autre, par le Piton des Neiges : l'altitude est
  // exagérée par rapport aux distances. Le vent vient de la gauche (côte au vent).
  // Sous la surface : une couche de sol perméable (où se forme la nappe phréatique) posée sur de
  // la roche peu perméable ; côté gauche, la couche de sol s'arrête au milieu de la pente : la nappe
  // y ressort (source) et donne une rivière. Côté droit, sous le sommet, une cavité dans la roche
  // volcanique (tunnel de lave), alimentée par l'eau qui traverse la roche fissurée : son trop-plein
  // ressort par une source (résurgence) qui donne une autre rivière. Les lits des rivières, creusés
  // dans la roche, descendent en marches avec de petits bassins jusqu'à l'océan.
  const CYCLE = {nx: 160, ny: 100, ySea: 74, yFond: 94, xCote: 50, xSommet: 116, ySommet: 19, xCoteSousLeVent: 150,
    altSommet: 3070, gradient: 0.0075, epaisseurSol: 6, tMerMoyenne: 22, xSourceVent: 78, xFinSol: 127,
    cavite: {x0: 117, x1: 128, y0: 37, y1: 42}, sortieCavite: 40, fissure: {x0: 119, x1: 127}};

  function cycle(tMer = 20) {
    const {nx, ny, ySea, yFond, xCote, xSommet, ySommet, xCoteSousLeVent: xEst, xSourceVent, xFinSol, cavite, fissure} = CYCLE;
    const monde = new Monde(nx, ny, {
      gParCase: 1, dt: 0.5, relaxAir: 0.03, relaxSol: 0.02, relaxOcean: 0.01,
      kEvap: 0.15, kEvapTerre: 0.01, plafondAir: 0.77, brassage: 0.3, distBrassage: 3, brassageYMin: 66, brassageHaut: 0.015, brassageAir: false, chaleurVapeur: 0,
      glissementNeige: true, convection: 0, convectionLiquide: 0, diffGouttelettes: 0.01,
      chuteGouttelettes: 0.004, seuilPluie: 0.0025, tauxPluie: 0.08, evapPluie: 0.004, seuilFlaque: 0.3, seuilGivre: 0.25, tailleGoutte: 0.002,
      sol: true, solFixe: true, alterner: true, bordsSolides: false, conductionAir: 0, capaciteSol: 0.35, kInfiltration: 0.03, kNappe: 0.006, kSource: 0.2, kReservoir: 0.0002, kProfond: 0.0001, ventVariable: 12000,
      kSolBas: 0.025, kSolCote: 0.03, kSortieSol: 0.05, kEvapSol: 0.01, dispersion: 6, soleil: 0,
    });
    // Relief : haut du sol (ou du fond de l'océan) pour chaque colonne
    const haut = new Int32Array(nx);
    const pente = 10, plage = ySea + 1;
    for (let x = 0; x < nx; x++) {
      let y;
      if (x < xCote - pente) y = yFond;
      else if (x < xCote) y = Math.round(yFond + (plage - yFond) * (x - (xCote - pente)) / pente);
      else if (x <= xSommet) { const u = (x - xCote) / (xSommet - xCote); y = Math.round(plage - (plage - ySommet) * (0.55 * u + 0.45 * u * u)); }
      else if (x <= xEst) { const u = (x - xSommet) / (xEst - xSommet); y = Math.round(ySommet + (plage - ySommet) * (0.35 * u + 0.65 * u * u)); }
      else y = Math.min(yFond, Math.round(plage + (yFond - plage) * (x - xEst) / 7));
      haut[x] = y;
    }
    // Résurgence de la cavité : là où la galerie de sortie, horizontale, atteint la pente
    let xResurgence = cavite.x1 + 1;
    while (xResurgence < xEst && haut[xResurgence] <= CYCLE.sortieCavite) xResurgence++;
    // Lits des rivières : creusés de 2 cases, en marches de 3 cases avec un rebord de roche au bout de
    // chaque marche (un petit bassin), de la source à l'océan
    const creuser = (xa, xb, versDroite, plancher = 0) => {
      for (let x = xa; x <= xb; x++) haut[x] = Math.min(yFond, Math.round(Math.max(haut[x] + 2, plancher) / 3) * 3);
      for (let x = xa; x <= xb; x++) {
        const aval = versDroite ? x + 1 : x - 1;
        if (aval < 0 || aval >= nx || haut[x] >= ySea) continue;
        if (haut[aval] > haut[x]) haut[x] -= 1;                  // rebord au bout de la marche
      }
    };
    // en tête de la ravine, le lit est creusé jusque sous la couche de sol : la source sort au contact
    // de la roche peu perméable, au pied de la couche de sol
    creuser(xCote - 2, xSourceVent, false, haut[xSourceVent + 1] + CYCLE.epaisseurSol + 1);
    creuser(xResurgence, xEst + 2, true);
    // embouchures et plages : le lit descend jusqu’à 3 cases sous le niveau de la mer (la rivière se
    // jette dans l'océan ; une mer d'une seule case de profondeur s'assécherait au moindre écart)
    for (let x = 0; x < nx; x++) if (haut[x] >= ySea && haut[x] <= ySea + 3) haut[x] = ySea + 4;
    const altitude = y => (ySea - y) * CYCLE.altSommet / (ySea - ySommet);
    const tAir = y => tMer - CYCLE.gradient * Math.max(0, altitude(y));
    // sous-sol (à plus de 2 cases de la surface) et cavité : température moyenne de l'année à cette
    // altitude, qui ne suit pas la température de l'air du moment (la cavité ne gèle pas)
    const tSousSol = y => CYCLE.tMerMoyenne - CYCLE.gradient * Math.max(0, altitude(Math.min(y, ySea)));
    const dansCavite = (x, y) => x >= cavite.x0 && x <= cavite.x1 && y >= cavite.y0 && y <= cavite.y1;
    const dansGalerie = (x, y) => y === CYCLE.sortieCavite && x > cavite.x1 && x < xResurgence;
    const ocean = new Uint8Array(nx * ny);
    const surface = new Int32Array(nx);   // première case qui n'est pas de l'air, dans chaque colonne
    for (let x = 0; x < nx; x++) {
      surface[x] = Math.min(haut[x], ySea + 1);
      for (let y = 0; y < ny; y++) {
        const i = y * nx + x;
        const prof = y - haut[x];
        if (y >= haut[x] && (dansCavite(x, y) || dansGalerie(x, y))) {
          monde.poser(i, AIR, tSousSol(y));                      // cavité et galerie, dans la roche
        } else if (y >= haut[x]) {
          // Sol perméable (entre la source de gauche et le sommet) sur de la roche peu perméable ;
          // sous le sommet, de la roche fissurée (perméable) mène l'eau jusqu'à la cavité
          const estSol = x > xSourceVent && x <= xFinSol && prof < CYCLE.epaisseurSol;
          const estFissure = x >= fissure.x0 && x <= fissure.x1 && y < cavite.y0 && prof >= CYCLE.epaisseurSol;
          monde.poser(i, estSol || estFissure ? SOL : ROCHE, prof >= 2 ? tSousSol(y) : tAir(Math.min(y, ySea)), estFissure ? {drap: FISSURE} : {});
          // au départ : nappe dans le bas de la couche de sol, sol humide au-dessus
          if (estSol) monde.m[i] = prof >= 3 ? 0.35 : 0.05;
          if (estFissure) monde.m[i] = 0.1;
        } else if (y > ySea) monde.poser(i, EAU, tMer);
        else monde.poser(i, AIR, tAir(y));
        monde.tAmb[i] = y > ySea && y < haut[x] ? tMer : (y >= haut[x] && prof >= 2) || dansCavite(x, y) || dansGalerie(x, y) ? tSousSol(y) : tAir(Math.min(y, ySea));
        if (haut[x] > ySea + 1 && y >= ySea - 3 && y < haut[x]) ocean[i] = 1;   // océan et embouchures
      }
    }
    // Air humide près de la mer, plus sec en altitude (dans la cavité : air humide)
    for (let i = 0; i < nx * ny; i++) {
      if (monde.typ[i] !== AIR) continue;
      const y = (i / nx) | 0, x = i % nx;
      const hum = y > surface[x] ? 0.9 : 0.15 + 0.55 * Math.max(0, Math.min(1, (y - 25) / (ySea - 25)));
      monde.v[i] = hum * satLiquide(monde.T[i]);
    }
    // Au départ : la cavité pleine jusqu'à sa sortie, les bassins des rivières pleins
    for (let y = CYCLE.sortieCavite; y <= cavite.y1; y++) for (let x = cavite.x0; x <= cavite.x1; x++) monde.poser(y * nx + x, EAU, tAir(y));
    for (const [xa, xb] of [[xCote - 2, xSourceVent], [xResurgence, xEst + 2]]) {
      for (let x = xa; x <= xb; x++) {
        const y = haut[x] - 1;
        if (y <= ySea && monde.typ[y * nx + x] === AIR && (monde.typ[y * nx + x - 1] !== AIR || monde.typ[y * nx + x + 1] !== AIR)) {
          // bassin : de l'eau tenue entre deux rebords (l'eau qui ne tient pas s'écoulera)
          monde.poser(y * nx + x, EAU, tAir(y), {drap: ocean[y * nx + x] ? 0 : VENUE_DU_CIEL});
        }
      }
    }
    monde.r.ocean = ocean;
    const colonnes = [];
    for (let x = 0; x < nx; x++) if (haut[x] > ySea + 1) colonnes.push(x);
    monde.r.colonnesSoleil = colonnes;
    monde.r.hautSol = haut;
    // les deux bassins de l'océan (gauche et droite), mis au même niveau
    let g1 = 0; while (g1 + 1 < nx && haut[g1 + 1] > ySea + 1) g1++;
    let d0 = nx - 1; while (d0 - 1 > 0 && haut[d0 - 1] > ySea + 1) d0--;
    monde.r.mers = [{x0: 0, x1: g1}, {x0: d0, x1: nx - 1}];
    monde.r.vent = ventCycle(nx, ny, surface);
    monde.r.ventPeriodique = true;
    return {monde, thermometres: [], infos: {haut, surface, altitude, tAir, xResurgence, ...CYCLE}};
  }

  // Alizés : l'air va de l'océan vers l'île à toutes les altitudes ; il monte le long des pentes,
  // passe au-dessus du Piton des Neiges et redescend de l'autre côté. Ce qui sort à droite de la
  // scène y rentre à gauche (la masse d'eau reste dans la scène). Fonction de courant sur les
  // coins des cases : le débit est le même dans chaque colonne, aucun air ne traverse le sol ni l'océan.
  function ventCycle(nx, ny, haut, debit = 4.5) {
    const psi = new Float64Array((nx + 1) * (ny + 1));
    for (let cx = 0; cx <= nx; cx++) {
      const g = Math.min(haut[(cx - 1 + nx) % nx], haut[cx % nx]);
      for (let cy = 0; cy <= ny; cy++) psi[cy * (nx + 1) + cx] = cy >= g ? 0 : -debit * (g - cy) / g;
    }
    const fx = new Float64Array((nx + 1) * ny), fy = new Float64Array(nx * (ny + 1));
    const P = (cx, cy) => psi[cy * (nx + 1) + cx];
    for (let y = 0; y < ny; y++) for (let x = 0; x <= nx; x++) fx[y * (nx + 1) + x] = P(x, y + 1) - P(x, y);
    for (let y = 0; y <= ny; y++) for (let x = 0; x < nx; x++) fy[y * nx + x] = -(P(x + 1, y) - P(x, y));
    return {fx, fy};
  }

  // ---- Expérience : courbe de fusion -----------------------------------------
  const FUSION = {nx: 56, ny: 68, x0: 16, x1: 39, yHaut: 22, yFond: 58, gParCase: 0.25, wattsParNiveau: 30, tGlace: -18, releve: 15};

  function fusion(masse = 150, niveau = 3, agitation = true) {
    const {nx, ny, x0, x1, yHaut, yFond, gParCase} = FUSION;
    const monde = new Monde(nx, ny, {
      gParCase, dt: 0.1, puissance: niveau * FUSION.wattsParNiveau, cPlaque: 3, relaxAir: 0.002, flottaison: 0, pertes: 0.12, nucleation: 0.5,
      relaxSol: 0.02, kEvap: 0.0004, kSubl: 0.0005, brassage: 0.3, distBrassage: 4, convection: 0.4,
      seuilPluie: 0.08, agitation, zoneAgitation: {x0, x1, y0: yHaut, y1: yFond - 1}, dispersion: 8,
    });
    monde.rectangle(0, 0, nx - 1, ny - 1, AIR, 20);
    monde.rectangle(0, yFond + 4, nx - 1, ny - 1, ROCHE, 20);        // paillasse
    monde.rectangle(x0 - 4, yFond + 1, x1 + 4, yFond + 3, CHAUD, 20); // plaque chauffante
    monde.rectangle(x0 - 1, yHaut, x0 - 1, yFond, VERRE, 20);
    monde.rectangle(x1 + 1, yHaut, x1 + 1, yFond, VERRE, 20);
    monde.rectangle(x0 - 1, yFond, x1 + 1, yFond, VERRE, 20);
    // Glace pilée à −10 °C, en grains, depuis le fond
    let reste = Math.round(masse / gParCase);
    const largeur = x1 - x0 + 1;
    for (let y = yFond - 1; y >= yHaut && reste > 0; y--) {
      for (let x = x0; x <= x1 && reste > 0; x++, reste--) monde.poser(y * nx + x, GLACE, FUSION.tGlace, {drap: GRAIN});
    }
    remplirAir(monde, 20, 0.3);
    monde.r.sortieHaut = 0.3 * satLiquide(20);
    for (let i = 0; i < nx * ny; i++) if (monde.typ[i] === ROCHE || monde.typ[i] === CHAUD) monde.tAmb[i] = 20;
    const hauteurGlace = Math.ceil(masse / gParCase / largeur);
    return {monde, thermometres: [{x: (x0 + x1 + 1) / 2, y: yFond - Math.max(4, Math.round(hauteurGlace * 0.5)), fixe: true}],
      infos: {...FUSION}};
  }

  const api = {bacASable, cycle, fusion, CYCLE, FUSION};
  racine.ScenesEau = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
