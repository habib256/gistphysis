// Les changements d'état de l'eau — construction des trois scènes
// Version 1.0 — 20/11/2026
// VERHILLE Arnaud
// Copyleft GPL2
//
//   bacASable(nx, ny, tAir) : une pièce, un bécher d'eau sur une plaque chauffante, un bloc de
//                             glace, une flaque, une plaque froide contre le mur de droite ;
//   cycle(tMer)             : coupe de l'océan Indien jusqu'au Piton des Neiges, vent (alizés) ;
//   fusion(masse, niveau)   : bécher de glace pilée à −10 °C sur une plaque chauffante réglable.
// Chaque fonction renvoie {monde, thermometres, infos}. Utilisable aussi dans Node (tests).

'use strict';

(function (racine) {
  const CE = racine.ChangementsEtat || (typeof require === 'function' ? require('./simulation.js') : null);
  const {Monde, AIR, EAU, GLACE, VERRE, SOL, ROCHE, CHAUD, FROID, GRAIN, satLiquide} = CE;

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
      gParCase: 1, dt: 0.5, relaxAir: 0.006, kEvap: 0.015, kSubl: 0.004, brassage: 0.3, distBrassage: 3,
      convection: 0.8, tChaud: 160, tFroid: -25, seuilPluie: 0.06, dispersion: 8, diffGouttelettes: 0.08,
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
      monde.rectangle(xb - 3, sol - 1, xb + lb + 2, sol, CHAUD, 160);
      const fond = sol - 2;
      monde.rectangle(xb - 1, fond - hb, xb - 1, fond, VERRE, tAir);
      monde.rectangle(xb + lb, fond - hb, xb + lb, fond, VERRE, tAir);
      monde.rectangle(xb - 1, fond, xb + lb, fond, VERRE, tAir);
      const he = Math.round(hb * 0.5);
      monde.rectangle(xb, fond - he, xb + lb - 1, fond - 1, EAU, tAir);
      thermometres.push({x: xb + lb / 2, y: fond - Math.max(2.5, he * 0.2)});
      // Bloc de glace
      const lg = Math.round(12 * u), hg = Math.round(10 * u);
      const xg = Math.round(nx * 0.46);
      monde.rectangle(xg, sol - hg + 1, xg + lg - 1, sol, GLACE, -10);
      thermometres.push({x: xg + lg / 2, y: sol - hg / 2 + 1});
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
  const CYCLE = {nx: 160, ny: 100, ySea: 74, yFond: 94, xCote: 50, xSommet: 116, ySommet: 19, xCoteSousLeVent: 150,
    altSommet: 3070, gradient: 0.0075, epaisseurSol: 3};

  function cycle(tMer = 20) {
    const {nx, ny, ySea, yFond, xCote, xSommet, ySommet, xCoteSousLeVent: xEst} = CYCLE;
    const monde = new Monde(nx, ny, {
      gParCase: 1, dt: 0.5, relaxAir: 0.03, relaxSol: 0.02, relaxOcean: 0.003,
      kEvap: 0.1, plafondAir: 0.75, brassage: 0.3, distBrassage: 3, brassageYMin: 66, brassageAir: false, convection: 0, convectionLiquide: 0, diffGouttelettes: 0.01,
      chuteGouttelettes: 0.004, seuilPluie: 0.0025, tauxPluie: 0.08, evapPluie: 0.004, seuilFlaque: 0.3, seuilGivre: 0.25,
      sol: true, bordsSolides: false, conductionAir: 0.02, capaciteSol: 0.35, kInfiltration: 0.01,
      kSolBas: 0.05, kSolCote: 0.03, kSortieSol: 0.05, kEvapSol: 0.01, dispersion: 6, soleil: 0,
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
    const altitude = y => (ySea - y) * CYCLE.altSommet / (ySea - ySommet);
    const tAir = y => tMer - CYCLE.gradient * Math.max(0, altitude(y));
    const ocean = new Uint8Array(nx * ny);
    const surface = new Int32Array(nx);   // première case qui n'est pas de l'air, dans chaque colonne
    for (let x = 0; x < nx; x++) {
      surface[x] = Math.min(haut[x], ySea + 1);
      for (let y = 0; y < ny; y++) {
        const i = y * nx + x;
        if (y >= haut[x]) {
          // Sol (qui retient l'eau) sur la terre ; roche dessous et sous la mer
          const estSol = y - haut[x] < CYCLE.epaisseurSol && y <= ySea + 2;
          monde.poser(i, estSol ? SOL : ROCHE, tAir(Math.min(y, ySea)));
          if (estSol) monde.m[i] = 0.32;   // sol déjà bien mouillé (saison des pluies)
        } else if (y > ySea) monde.poser(i, EAU, tMer);
        else monde.poser(i, AIR, tAir(y));
        monde.tAmb[i] = y > ySea && y < haut[x] ? tMer : tAir(Math.min(y, ySea));
        if ((x <= xCote || x >= xEst) && y >= ySea - 3 && y < haut[x]) ocean[i] = 1;
      }
    }
    // Air humide près de la mer, plus sec en altitude
    for (let i = 0; i < nx * ny; i++) {
      if (monde.typ[i] !== AIR) continue;
      const y = (i / nx) | 0, hum = 0.15 + 0.55 * Math.max(0, Math.min(1, (y - 25) / (ySea - 25)));
      monde.v[i] = hum * satLiquide(monde.T[i]);
    }
    monde.r.ocean = ocean;
    const colonnes = [];
    for (let x = 0; x < nx; x++) if (haut[x] > ySea + 1) colonnes.push(x);
    monde.r.colonnesSoleil = colonnes;
    monde.r.vent = ventCycle(nx, ny, surface);
    monde.r.ventPeriodique = true;
    return {monde, thermometres: [], infos: {haut, surface, altitude, tAir, ...CYCLE}};
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
  const FUSION = {nx: 56, ny: 68, x0: 16, x1: 39, yHaut: 22, yFond: 58, gParCase: 0.25, wattsParNiveau: 80};

  function fusion(masse = 150, niveau = 3, agitation = true) {
    const {nx, ny, x0, x1, yHaut, yFond, gParCase} = FUSION;
    const monde = new Monde(nx, ny, {
      gParCase, dt: 0.1, puissance: niveau * FUSION.wattsParNiveau, cPlaque: 3, relaxAir: 0.002, flottaison: 0.02, pertes: 0.12,
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
      for (let x = x0; x <= x1 && reste > 0; x++, reste--) monde.poser(y * nx + x, GLACE, -10, {drap: GRAIN});
    }
    remplirAir(monde, 20, 0.3);
    monde.r.sortieHaut = 0.3 * satLiquide(20);
    for (let i = 0; i < nx * ny; i++) if (monde.typ[i] === ROCHE || monde.typ[i] === CHAUD) monde.tAmb[i] = 20;
    const hauteurGlace = Math.ceil(masse / gParCase / largeur);
    return {monde, thermometres: [{x: (x0 + x1 + 1) / 2, y: yFond - Math.max(4, Math.round(hauteurGlace * 0.35)), fixe: true}],
      infos: {...FUSION}};
  }

  const api = {bacASable, cycle, fusion, CYCLE, FUSION};
  racine.ScenesEau = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
