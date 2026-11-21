// tests/verifier-physique.mjs — contrôles rejouables du modèle physique (Node seul, sans navigateur)
//
//   node tests/verifier-physique.mjs [--seulement 1,4,…]
//
// Le moteur (simulation.js, scenes.js) est déterministe : hasard à graine fixe. Chaque contrôle
// dit ce qu'il vérifie. Durée : environ 25 minutes.
//   1. Conservation de la masse : bac à sable (toutes les transformations), cycle de l'eau,
//      expérience de fusion ; outils (une paroi ou une plaque posée ne change pas la masse, l'eau
//      posée l'augmente exactement de ce qui est posé) ; sublimation dans l'air sec et froid.
//   2. Surface d'un liquide horizontale (à une case près).
//   3. Bac à sable de départ : givre sur la plaque froide sans rien poser ; thermomètre 1 dans l'eau
//      du bécher pendant toute l'ébullition ; thermomètre 2 dans l'eau de fonte du récipient.
//   4. Palier à 0 °C (expérience de fusion, relevé toutes les 15 s) : trois parties de courbe, des
//      points sur le palier pour tous les réglages, avec ou sans agitateur.
//   5. Ébullition à 100 °C ; évaporation sous 100 °C dans l'air sec, sans bulle.
//   6. Cycle de l'eau : nuages en altitude, pluie, givre au sommet (et glace qui ne s'accumule pas
//      sans fin), océan à une température vraisemblable, pas de fausse ébullition ; sans vent,
//      la vapeur monte encore.
//   7. Eau souterraine et rivières : infiltration (front d'humidité qui descend), nappe qui monte
//      après une averse puis redescend, sources, rivières en eau en permanence, cavité qui se
//      remplit et déborde par la résurgence, masse conservée.
//   8. Cycle sur 80 000 pas (mers au même niveau, pas d'eau qui s'entasse hors des lits, nappe
//      épaisse, périodes sans pluie avec des rivières en eau) ; source qui faiblit quand la nappe
//      baisse ; cavité qui ne gèle pas ; neige ou glace chauffées par-dessous (bain proche de 0 °C) ;
//      panache de brume au-dessus de l'eau qui bout, air chaud et non saturé juste au-dessus de l'eau ;
//      eau chauffée d'un seul côté qui se mélange ; calcul alterné ou non (mêmes nuages, pluie, vapeur).
// Le script n'est pas nécessaire au fonctionnement de l'app.

import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const CE = require('../simulation.js');
const SC = require('../scenes.js');
const {AIR, EAU, GLACE, VERRE, SOL, CHAUD, FROID, GRAIN, GIVRE, satLiquide} = CE;

const iSeul = process.argv.indexOf('--seulement');
const PARTIES = iSeul > 0 ? process.argv[iSeul + 1].split(',').map(Number) : null;
const partie = (k, titre) => { if (PARTIES && !PARTIES.includes(k)) return false; console.log(k + '. ' + titre); return true; };

const echecs = [];
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 700) : ''));
  if (!ok) echecs.push(nom);
}
const arrondi = (x, n = 3) => Math.round(x * 10 ** n) / 10 ** n;
const sansNaN = monde => ['m', 'h', 'T', 'v', 'd', 'c', 'p'].every(k => monde[k].every(Number.isFinite));
const avancer = (monde, n) => { for (let k = 0; k < n; k++) monde.avancer(); };
// dimensions de la grille du bac à sable pour une zone de scène donnée (comme dans app.js)
const dims = (w, h) => { const rap = Math.min(2.4, Math.max(0.6, w / h)); const nx = Math.round(Math.sqrt(15000 * rap)); return [nx, Math.round(15000 / nx)]; };

// ---------------------------------------------------------------- 1. Conservation de la masse
if (partie(1, 'Conservation de la masse')) {
  {
    const {monde} = SC.bacASable(150, 100, 20);
    const {nx, ny} = monde;
    for (let y = Math.round(ny * 0.3); y < Math.round(ny * 0.3) + 6; y++) for (let x = nx - 7; x < nx - 3; x++) monde.poser(y * nx + x, EAU, 20);
    for (let x = 60; x < 75; x += 2) monde.poser(5 * nx + x, GLACE, -5, {drap: GRAIN});
    const m0 = monde.masses().total;
    let ecartMax = 0;
    for (let k = 1; k <= 20000; k++) { monde.avancer(); if (k % 1000 === 0) ecartMax = Math.max(ecartMax, Math.abs(monde.masses().total - m0)); }
    const c = monde.compteurs;
    verifier(`bac à sable, 20 000 pas : masse totale constante (${arrondi(m0, 1)} g, écart maximal ${ecartMax.toExponential(2)} g)`, ecartMax < 1e-6 * m0 && sansNaN(monde));
    const faits = ['fusion', 'solidification', 'evaporation', 'ebullition', 'condensationLiquide', 'condensationSolide'];
    verifier('bac à sable : fusion, solidification, évaporation, ébullition, condensation liquide et solide ont eu lieu',
      faits.every(f => c[f] > 0), Object.fromEntries(faits.map(f => [f, arrondi(c[f])])));
  }
  {
    // Outils : traits de paroi, de plaques, d'eau, de glace, de neige dans un air humide et brumeux
    const {monde} = SC.bacASable(150, 100, 20);
    avancer(monde, 1500);   // l'eau bout : brume et vapeur dans l'air
    const traits = {verre: [VERRE, 20, {}], chaud: [CHAUD, 130, {}], froid: [FROID, -25, {}], eau: [EAU, 20, {}], glace: [GLACE, -10, {}], neige: [GLACE, -5, {drap: GRAIN}]};
    const res = {};
    let y = 8;
    for (const [nom, [t, T, opts]] of Object.entries(traits)) {
      const avant = monde.masses().total;
      let poses = 0;
      for (let x = 10; x < 140; x++) for (let yy = y; yy < y + 3; yy++) {
        const i = yy * monde.nx + x;
        if (monde.typ[i] !== AIR) continue;
        monde.poser(i, t, T, opts); if (t === EAU || t === GLACE) poses += 1;
      }
      res[nom] = {ajoute: poses, ecart: monde.masses().total - avant - poses};
      y += 6;
      avancer(monde, 30);
    }
    verifier('outils : un trait de paroi ou de plaque ne change pas la masse ; un trait d’eau, de glace ou de neige l’augmente exactement de ce qui est posé',
      Object.values(res).every(r => Math.abs(r.ecart) < 1e-9), Object.fromEntries(Object.entries(res).map(([k, r]) => [k, {ajoute: r.ajoute, ecart: r.ecart.toExponential(1)}])));
  }
  {
    const {monde} = SC.cycle(20);
    monde.r.soleil = 3;
    const m0 = monde.masses().total;
    let ecartMax = 0;
    for (let k = 1; k <= 12000; k++) { monde.avancer(); if (k % 1000 === 0) ecartMax = Math.max(ecartMax, Math.abs(monde.masses().total - m0)); }
    verifier(`cycle de l’eau (nappe, cavité, rivières), 12 000 pas : masse totale constante (${arrondi(m0, 1)} g, écart maximal ${ecartMax.toExponential(2)} g)`, ecartMax < 1e-6 * m0 && sansNaN(monde));
  }
  {
    const {monde} = SC.fusion(150, 6, true);
    const m0 = monde.masses().total;
    let ecartMax = 0;
    for (let k = 1; k <= 20000; k++) { monde.avancer(); if (k % 1000 === 0) ecartMax = Math.max(ecartMax, Math.abs(monde.masses().total - m0)); }
    verifier(`fusion jusqu’à l’ébullition, 20 000 pas : masse totale constante (écart maximal ${ecartMax.toExponential(2)} g)`,
      ecartMax < 1e-6 * m0 && sansNaN(monde) && monde.compteurs.bulles > 0, {bulles: monde.compteurs.bulles});
  }
  {
    const {monde} = SC.bacASable(80, 60, -15, {vide: true});
    const {nx, ny} = monde;
    monde.rectangle(20, ny - 8, 40, ny - 1, GLACE, -15);
    for (let i = 0; i < monde.n; i++) if (monde.typ[i] === AIR) monde.v[i] = 0;
    monde.r.sortieHaut = 0;
    const m0 = monde.masses();
    avancer(monde, 6000);
    const m1 = monde.masses();
    verifier(`sublimation : dans l’air très sec à −15 °C, la glace devient de la vapeur sans fondre (glace ${arrondi(m0.glace, 1)} → ${arrondi(m1.glace, 1)} g)`,
      monde.compteurs.sublimation > 0.1 && monde.compteurs.fusion === 0 && Math.abs(m1.total - m0.total) < 1e-9 * m0.total);
  }
}

// ---------------------------------------------------------------- 2. Surface horizontale
if (partie(2, 'Surface d’un liquide horizontale')) {
  for (const larg of [40, 100]) {
    const {monde} = SC.bacASable(160, 90, 20, {vide: true});
    const {nx, ny} = monde, x0 = 20, x1 = x0 + larg + 1, fond = ny - 2;
    monde.rectangle(x0, fond, x1, fond, VERRE, 20); monde.rectangle(x0, 30, x0, fond, VERRE, 20); monde.rectangle(x1, 30, x1, fond, VERRE, 20);
    monde.rectangle(x0 + 1, 35, x0 + 15, fond - 1, EAU, 20);
    const hauteurs = () => { const h = []; for (let x = x0 + 1; x < x1; x++) { let y = 0; while (y < fond && monde.typ[y * nx + x] !== EAU) y++; h.push(fond - y); } return h; };
    avancer(monde, 3000);
    const h = hauteurs(), ecart = Math.max(...h) - Math.min(...h);
    verifier(`récipient de ${larg} cases rempli d’un côté : après 3 000 pas, la surface est horizontale à une case près (écart ${ecart})`, ecart <= 1, h.join(','));
  }
}

// ---------------------------------------------------------------- 3. Bac à sable de départ
if (partie(3, 'Bac à sable de départ')) {
  for (const [w, h] of [[770, 714], [360, 330]]) {
    const [nx, ny] = dims(w, h);
    const {monde, thermometres} = SC.bacASable(nx, ny, 20);
    const [th1, th2] = thermometres;
    const caseSous = th => monde.typ[Math.floor(th.y) * nx + Math.floor(th.x)];
    let givre = 0, l1 = [], dansEau1 = true, l2 = [], dansEau2 = true, finGlace = -1, finEau = -1;
    for (let k = 1; k <= 4000; k++) {
      monde.avancer();
      if (k % 50) continue;
      // dans l'eau, ou dans une bulle de vapeur qui passe (de l'eau juste au-dessus)
      if (!monde.thermometreDansLEau(th1)) { if (k < 20 * 120) dansEau1 = false; else finEau = finEau < 0 ? k : finEau; }
      // ébullition installée : des bulles et l'eau du thermomètre arrivée vers 99 °C (les premières
      // bulles naissent au fond, contre le verre chaud, quand le reste de l'eau est encore tiède)
      const t1 = monde.lireTemperature(th1.x, th1.y);
      if (finEau < 0 && monde.compteurs.bulles > 0 && (l1.length || t1 >= 99)) l1.push(t1);
      const t2 = caseSous(th2);
      if (t2 !== EAU && t2 !== GLACE) dansEau2 = false;
      let glace = 0;
      for (let i = 0; i < monde.n; i++) if (monde.typ[i] === GLACE && !(monde.drap[i] & GIVRE) && (i % nx) < nx * 0.8) glace += monde.m[i];
      l2.push({T: monde.lireTemperature(th2.x, th2.y), glace});
      if (finGlace < 0 && glace < 1) finGlace = l2.length - 1;
      if (k === 3000) for (let i = 0; i < monde.n; i++) if ((i % nx) >= nx - 8 && monde.typ[i] === GLACE) givre += monde.m[i];
    }
    verifier(`grille ${nx}×${ny} : du givre se forme sur la plaque froide sans rien poser (${arrondi(givre, 1)} g de glace contre la plaque après 3 000 pas)`, givre >= 1);
    const tri = l1.slice().sort((a, b) => a - b), med = tri[Math.floor(tri.length / 2)];
    verifier(`grille ${nx}×${ny} : le thermomètre 1 reste dans l’eau du bécher au moins 20 min (l’eau passe sous lui ${finEau < 0 ? 'après 33 min' : 'à ' + arrondi(finEau / 120, 1) + ' min'}) et lit, une fois l’ébullition installée et tant qu’il est dans l’eau, entre ${arrondi(tri[0], 2)} et ${arrondi(tri[tri.length - 1], 2)} °C (médiane ${arrondi(med, 2)})`,
      dansEau1 && tri.length > 10 && tri[0] >= 98.5 && tri[tri.length - 1] <= 100.0001 && med >= 99.4);
    const glace0 = l2[0].glace;
    const debut = l2.findIndex(e => e.T >= -0.5);   // une fois la glace réchauffée jusqu'à 0 °C
    const pendant = l2.slice(debut).filter(e => e.glace > 0.25 * glace0).map(e => e.T), apres = l2.slice(finGlace + 5).map(e => e.T);
    verifier(`grille ${nx}×${ny} : le thermomètre 2 reste dans l’eau du récipient de la glace ; à 0 °C (±0,5) tant qu’il reste au moins un quart de la glace, puis la température monte (jusqu’à ${arrondi(Math.max(...apres), 1)} °C)`,
      dansEau2 && debut >= 0 && pendant.length > 3 && pendant.every(T => Math.abs(T) <= 0.5) && finGlace > 0 && Math.max(...apres) > 8);
  }
}

// ---------------------------------------------------------------- 4. Palier de fusion
function experienceFusion(masse, niveau, agitation, minutes) {
  const {monde, thermometres, infos} = SC.fusion(masse, niveau, agitation);
  const th = thermometres[0], mesures = [], pasParMesure = Math.round(infos.releve / monde.r.dt);
  const dansBecher = () => {
    let glace = 0, liquide = 0;
    for (let y = infos.yHaut; y < infos.yFond; y++) for (let x = infos.x0; x <= infos.x1; x++) {
      const i = y * monde.nx + x;
      if (monde.typ[i] === GLACE) glace += monde.m[i]; else if (monde.typ[i] === EAU) liquide += monde.m[i];
    }
    return {glace: glace * infos.gParCase, liquide: liquide * infos.gParCase};
  };
  for (let k = 0; k <= minutes * 60 / infos.releve; k++) {
    mesures.push({t: k * infos.releve, T: monde.lireTemperature(th.x, th.y), ...dansBecher()});
    avancer(monde, pasParMesure);
  }
  return mesures;
}
if (partie(4, 'Palier à 0 °C (expérience de fusion, relevé toutes les 15 s)')) {
  {
    const mes = experienceFusion(150, 3, true, 20);
    const montee = mes.filter(m => m.T < -0.5).length, palier = mes.filter(m => Math.abs(m.T) <= 0.5 && m.glace > 0).length;
    const fin = mes.findIndex(m => m.glace === 0), apres = fin > 0 ? mes.slice(fin).filter(m => m.T > 1).length : 0;
    verifier(`réglages par défaut (150 g, plaque 3, agitateur) : la glace se réchauffe (${montee} points sous −0,5 °C), palier (${palier} points à 0 °C ± 0,5 avec de la glace), l’eau se réchauffe (${apres} points)`,
      montee >= 3 && palier >= 10 && apres >= 10, mes.slice(0, 12).map(m => arrondi(m.T, 1)));
  }
  for (const [masse, niveau] of [[150, 3], [100, 3], [200, 3], [150, 5], [100, 6], [200, 1]]) {
    for (const agitation of [true, false]) {
      const mes = experienceFusion(masse, niveau, agitation, masse * 0.75 / Math.max(1, niveau) + 6);
      const palier = mes.filter(m => Math.abs(m.T) <= 0.5 && m.glace > 0 && m.liquide > 1);
      const debutPalier = mes.findIndex(m => m.T >= -0.5);   // après le réchauffement de la glace
      const coexist = mes.slice(Math.max(0, debutPalier)).filter(m => m.glace > 0.25 * masse && m.liquide > 0.02 * masse).map(m => m.T).sort((a, b) => a - b);
      const med = coexist.length ? coexist[Math.floor(coexist.length / 2)] : NaN;
      const ok = palier.length >= 3 && (!agitation || (coexist.every(T => T > -0.5 && T < 1) && Math.abs(med) <= 0.3));
      verifier(`${masse} g, plaque ${niveau}, ${agitation ? 'agitateur en marche' : 'sans agitateur'} : ${palier.length} points sur le palier à 0 °C`
        + (agitation ? ` ; tant qu’il reste un quart de la glace, lectures entre −0,5 et +1 °C (médiane ${arrondi(med, 2)})` : ''), ok);
    }
  }
  {
    const duree = (masse, niveau) => experienceFusion(masse, niveau, true, 40).findIndex(m => m.glace === 0) * 15 / 60;
    const d100 = duree(100, 3), d200 = duree(200, 3), d5 = duree(150, 5), d2 = duree(150, 2);
    verifier('la fusion dure plus longtemps avec plus de glace, moins longtemps avec une plaque plus puissante', d200 > d100 && d2 > d5,
      {'100 g': d100, '200 g': d200, 'plaque 2': d2, 'plaque 5': d5});
  }
}

// ---------------------------------------------------------------- 5. Ébullition, évaporation
if (partie(5, 'Ébullition à 100 °C, évaporation sous 100 °C')) {
  {
    const mes = experienceFusion(150, 6, true, 24);
    const debut = mes.findIndex(m => m.T > 99);
    const palier = debut > 0 ? mes.slice(debut + 2, debut + 18) : [];
    verifier(`expérience de fusion, plaque 6 : palier d’ébullition lu entre 99,5 et 100 °C pendant 4 min, la masse d’eau du bécher diminue`,
      palier.length === 16 && palier.every(m => m.T >= 99.5 && m.T <= 100.0001) && palier[15].liquide < palier[0].liquide - 3,
      palier.map(m => arrondi(m.T, 2)));
    let tMax = -Infinity;
    const {monde} = SC.fusion(150, 6, true);
    for (let k = 0; k < 15000; k++) { monde.avancer(); if (k % 50 === 0) for (let i = 0; i < monde.n; i++) if (monde.typ[i] === EAU && monde.T[i] > tMax) tMax = monde.T[i]; }
    verifier('aucune case d’eau liquide au-dessus de 100 °C', tMax <= 100 + 1e-9, {tMax});
  }
  {
    const {monde} = SC.bacASable(120, 80, 20, {vide: true});
    const {ny} = monde;
    monde.rectangle(30, ny - 2, 90, ny - 1, EAU, 20);
    for (let i = 0; i < monde.n; i++) if (monde.typ[i] === AIR) monde.v[i] = 0;
    monde.r.sortieHaut = 0.5 * satLiquide(20);
    const avant = monde.masses();
    let tMax = -Infinity;
    for (let k = 0; k < 4000; k++) { monde.avancer(); if (k % 100 === 0) for (let i = 0; i < monde.n; i++) if (monde.typ[i] === EAU && monde.T[i] > tMax) tMax = monde.T[i]; }
    const apres = monde.masses();
    verifier(`flaque à 20 °C dans l’air sec : elle perd de l’eau (${arrondi(avant.liquide, 1)} → ${arrondi(apres.liquide, 1)} g), sans aucune bulle, loin de 100 °C (au plus ${arrondi(tMax, 1)} °C)`,
      apres.liquide < avant.liquide * 0.9 && monde.compteurs.bulles === 0 && tMax < 25);
  }
}

// ---------------------------------------------------------------- 6. Cycle de l'eau : air, nuages, givre
if (partie(6, 'Cycle de l’eau : nuages, pluie, givre, océan')) {
  const {monde, infos} = SC.cycle(20);
  monde.r.soleil = 3;
  let nuagesMax = 0, plusBas = Infinity, pluieVue = 0, tOcean = -Infinity;
  for (let k = 1; k <= 8000; k++) {
    monde.avancer();
    if (k % 500) continue;
    let n = 0, p = 0;
    for (let i = 0; i < monde.n; i++) {
      if (monde.typ[i] !== AIR || ((i / monde.nx) | 0) > infos.surface[i % monde.nx]) continue;
      if (monde.d[i] > 0.0015) { n++; plusBas = Math.min(plusBas, infos.altitude((i / monde.nx) | 0)); }
      if (monde.p[i] > 0.0005) p++;
    }
    nuagesMax = Math.max(nuagesMax, n); pluieVue = Math.max(pluieVue, p);
    for (let x = 0; x < infos.xCote - 12; x++) tOcean = Math.max(tOcean, monde.T[(infos.ySea + 1) * monde.nx + x]);
  }
  let givre = 0;
  for (let i = 0; i < monde.n; i++) if (monde.typ[i] === GLACE && (monde.drap[i] & GIVRE)) givre += monde.m[i];
  verifier(`des nuages apparaissent (jusqu’à ${nuagesMax} cases de gouttelettes, aucune sous ${Math.round(plusBas)} m) et il pleut (jusqu’à ${pluieVue} cases de pluie)`,
    nuagesMax > 150 && plusBas > 100 && pluieVue > 10);
  verifier(`givre (condensation solide) au sommet aux réglages par défaut : ${arrondi(givre, 1)} g`, givre >= 1);
  verifier(`surface de l’océan au plus à 28 °C avec le Soleil (au plus ${arrondi(tOcean, 1)} °C ; air à 20 °C)`, tOcean <= 28);
  verifier('aucune fausse ébullition dans le cycle', monde.compteurs.bulles === 0, {bulles: monde.compteurs.bulles});
  // à 10 °C : glace et givre ne s'accumulent pas sans fin
  const froid = SC.cycle(10).monde;
  froid.r.soleil = 3;
  const glaces = [];
  for (let k = 1; k <= 30000; k++) {
    froid.avancer();
    if (k % 5000) continue;
    let g = 0; for (let i = 0; i < froid.n; i++) if (froid.typ[i] === GLACE) g += froid.m[i];
    glaces.push(arrondi(g, 1));
  }
  verifier(`air à 10 °C au bord de la mer, 30 000 pas : la glace du sommet ne grossit pas sans fin (${glaces.join(', ')} g)`,
    glaces[5] <= 1.3 * Math.max(glaces[2], glaces[3]));
  // sans vent : la vapeur monte encore (brassage)
  const calme = SC.cycle(20).monde;
  calme.r.soleil = 3; calme.r.vent = null;
  const vapeurHaute = () => { let s = 0; for (let i = 0; i < calme.n; i++) if (calme.typ[i] === AIR && ((i / calme.nx) | 0) < calme.r.brassageYMin - 10) s += calme.v[i]; return s; };
  const avant = vapeurHaute();
  avancer(calme, 6000);
  verifier(`sans vent, la vapeur monte encore dans l’air (vapeur au-dessus de la couche d’air marin : ${arrondi(avant, 2)} → ${arrondi(vapeurHaute(), 2)} g)`, vapeurHaute() > 1.05 * avant);
}

// ---------------------------------------------------------------- 7. Eau souterraine et rivières
if (partie(7, 'Eau souterraine et rivières (cycle)')) {
  const eauDans = (monde, x0, x1, y0, y1) => { let s = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * monde.nx + x; if (monde.typ[i] === EAU) s += monde.m[i]; } return s; };
  {
    // Rivières en eau en permanence, sources qui coulent
    const {monde, infos} = SC.cycle(20);
    monde.r.soleil = 3;
    const riviereVent = () => eauDans(monde, infos.xCote - 2, infos.xSourceVent, 0, infos.ySea);
    const riviereAbri = () => eauDans(monde, infos.xResurgence, infos.xCoteSousLeVent - 1, 0, infos.ySea);
    let minVent = Infinity, minAbri = Infinity, source0 = 0;
    const sources = [];
    for (let k = 1; k <= 12000; k++) {
      monde.avancer();
      if (k === 2000) source0 = monde.compteurs.source;
      if (k >= 2000 && k % 250 === 0) { minVent = Math.min(minVent, riviereVent()); minAbri = Math.min(minAbri, riviereAbri()); }
      if (k > 2000 && k % 2000 === 0) sources.push(arrondi(monde.compteurs.source - source0, 1));
    }
    verifier(`les deux rivières ont de l’eau en permanence après la mise en route (au moins ${arrondi(minVent, 1)} g dans la rivière issue de la nappe, ${arrondi(minAbri, 1)} g dans celle issue de la cavité)`,
      minVent >= 3 && minAbri >= 2);
    verifier(`la source de la nappe coule sans s’arrêter (eau sortie, cumulée : ${sources.join(', ')} g) et l’eau de pluie et des sources arrive à l’océan (${arrondi(monde.compteurs.versOcean, 1)} g)`,
      sources.every((s, k) => s > (k ? sources[k - 1] : 0)) && monde.compteurs.versOcean > 5);
  }
  {
    // Averse sur le sol perméable : front d'humidité qui descend, nappe qui monte puis redescend
    const {monde, infos} = SC.cycle(20);
    monde.r.soleil = 0; monde.r.vent = null;
    avancer(monde, 1500);
    const xs = [];
    for (let x = infos.xSourceVent + 6; x < infos.xSommet - 2; x++) xs.push(x);
    const xc = xs[Math.floor(xs.length / 2)];
    const profil = () => [0, 1, 2, 3, 4, 5].map(k => monde.m[(infos.haut[xc] + k) * monde.nx + xc]);
    const niveau = () => { let s = 0; for (const x of xs) { const y = monde.niveauNappe(x); s += y < 0 ? 0 : infos.haut[x] + infos.epaisseurSol - y; } return s / xs.length; };   // épaisseur saturée moyenne
    // saison sèche : le haut de la couche de sol est sec, la nappe n'occupe que le fond
    for (const x of xs) for (let k = 0; k < infos.epaisseurSol - 1; k++) monde.m[(infos.haut[x] + k) * monde.nx + x] = 0.03;
    const m0 = monde.masses().total;
    const n0 = niveau(), p0 = profil();
    const arrivee = [-1, -1, -1, -1];
    const niveaux = [];
    let ajoute = 0;
    for (let k = 1; k <= 16000; k++) {   // la nappe se vide lentement par la source (réservoir)
      if (k <= 150) for (const x of xs) { const i = (infos.haut[x] - 2) * monde.nx + x; if (monde.typ[i] === AIR) { monde.p[i] += 0.006; ajoute += 0.006; } }
      monde.avancer();
      const pr = profil();
      for (let j = 0; j < 4; j++) if (arrivee[j] < 0 && pr[j] > p0[j] + 0.1) arrivee[j] = k;
      if (k % 800 === 0) niveaux.push(arrondi(niveau(), 2));
    }
    verifier(`averse sur le sol perméable : l’eau arrive d’abord en surface puis plus profond (premiers pas d’arrivée par profondeur : ${arrivee.join(', ')})`,
      arrivee.every(a => a > 0) && arrivee[0] < arrivee[1] && arrivee[1] < arrivee[2] && arrivee[2] < arrivee[3] && arrivee[3] < 1500);
    const max = Math.max(...niveaux), kMax = niveaux.indexOf(max);
    verifier(`la nappe monte après l’averse puis redescend (épaisseur moyenne : ${arrondi(n0, 2)} au départ, jusqu’à ${max}, puis ${niveaux[niveaux.length - 1]} cases)`,
      max > n0 + 0.3 && kMax < niveaux.length - 3 && niveaux[niveaux.length - 1] < max - 0.2, niveaux);
    verifier(`masse conservée pendant l’averse (eau ajoutée ${arrondi(ajoute, 1)} g ; écart ${(monde.masses().total - m0 - ajoute).toExponential(1)} g)`,
      Math.abs(monde.masses().total - m0 - ajoute) < 1e-6);
  }
  {
    // Cavité : se remplit après des pluies, déborde par la résurgence
    const {monde, infos} = SC.cycle(20);
    monde.r.soleil = 0; monde.r.vent = null;
    const c = infos.cavite;
    const cavite = () => eauDans(monde, c.x0, c.x1, c.y0, c.y1);
    const riviere = () => eauDans(monde, infos.xResurgence, infos.xCoteSousLeVent - 1, 0, infos.ySea);
    avancer(monde, 3000);
    // saison sèche : la cavité a baissé sous sa sortie (on retire deux rangées d'eau, masse comptée)
    let retire = 0;
    for (let y = infos.sortieCavite; y <= infos.sortieCavite + 1; y++) for (let x = c.x0; x <= c.x1; x++) {
      const i = y * monde.nx + x;
      if (monde.typ[i] === EAU) { retire += monde.m[i]; monde.viderCase(i); monde.T[i] = monde.tAmb[i]; }
    }
    const pleine = c.x1 - c.x0 + 1;   // eau d'une rangée
    const c0 = cavite(), r0 = riviere(), m0 = monde.masses().total;
    let ajoute = 0, cMax = c0, rMax = r0;
    const xs = [];
    for (let x = infos.xSommet + 1; x <= infos.xFinSol - 1; x++) xs.push(x);
    for (let k = 1; k <= 5000; k++) {
      if (k <= 400) for (const x of xs) { const i = (infos.haut[x] - 2) * monde.nx + x; if (monde.typ[i] === AIR) { monde.p[i] += 0.01; ajoute += 0.01; } }
      monde.avancer();
      cMax = Math.max(cMax, cavite());
      const rv = riviere();
      if (rv > rMax) rMax = rv;
    }
    verifier(`après des pluies au-dessus de la roche fissurée, la cavité se remplit (${arrondi(c0, 1)} → jusqu’à ${arrondi(cMax, 1)} g, eau tombée du plafond depuis le début : ${arrondi(monde.compteurs.goutteCavite, 1)} g) jusqu’à sa sortie, puis déborde : la rivière de la résurgence grossit (${arrondi(r0, 1)} → jusqu’à ${arrondi(rMax, 1)} g)`,
      cMax >= c0 + pleine && rMax > r0 + 1, {retire: arrondi(retire, 1)});
    verifier(`masse conservée (écart ${(monde.masses().total - m0 - ajoute).toExponential(1)} g)`, Math.abs(monde.masses().total - m0 - ajoute) < 1e-6);
  }
}

// ---------------------------------------------------------------- 8. Longue durée et cas particuliers
if (partie(8, 'Longue durée du cycle, nappe, cavité au froid, glace chauffée par-dessous, panache')) {
  const eauDans = (monde, x0, x1, y0, y1) => { let s = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * monde.nx + x; if (monde.typ[i] === EAU) s += monde.m[i]; } return s; };
  {
    const {monde, infos} = SC.cycle(20);
    monde.r.soleil = 3;
    const {nx, ny} = monde, oc = monde.r.ocean, c = infos.cavite;
    const niveau = b => { const ys = []; for (let x = b.x0; x <= b.x1; x++) { let y = 0; while (y < ny && !(oc[y * nx + x] && monde.typ[y * nx + x] === EAU)) y++; ys.push(y); } ys.sort((a, e) => a - e); return ys[ys.length >> 1]; };
    const dansLit = x => (x >= infos.xCote - 2 && x <= infos.xSourceVent) || (x >= infos.xResurgence && x <= infos.xCoteSousLeVent + 2);
    const horsLits = () => { let s = 0; for (let y = 0; y <= infos.ySea; y++) for (let x = 0; x < nx; x++) { const i = y * nx + x; if (monde.typ[i] === EAU && !oc[i] && !dansLit(x) && !(x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1)) s += monde.m[i]; } return s; };
    // zone non saturée (sol au-dessus de la nappe) et présence de la nappe, colonne par colonne
    const nappeCols = () => { let nonSat = 0, avec = 0, n = 0; for (let x = infos.xSourceVent + 1; x <= infos.xFinSol; x++) { const y = monde.niveauNappe(x); n++; const ep = y < 0 ? 0 : infos.haut[x] + infos.epaisseurSol - y; if (infos.epaisseurSol - ep >= 3) nonSat++; if (ep >= 2) avec++; } return {nonSat: nonSat / n, avec}; };
    const m0 = monde.masses().total;
    let ecartNiveaux = 0, horsMax = 0, nonSatMin = 1, avecMin = Infinity, nappeMin = Infinity, sec = 0, secMax = 0, riviereSec = Infinity;
    for (let k = 1; k <= 80000; k++) {
      monde.avancer();
      if (k % 250) continue;
      let pluie = 0;   // gouttes de pluie au-dessus de l'île (pas de la mer)
      for (let i = 0; i < monde.n; i++) if (monde.typ[i] === AIR && monde.p[i] > 0.0004 && ((i / nx) | 0) <= infos.haut[i % nx] && infos.haut[i % nx] <= infos.ySea + 1) pluie++;
      if (pluie <= 2) { sec += 250; secMax = Math.max(secMax, sec); riviereSec = Math.min(riviereSec, eauDans(monde, infos.xCote - 2, infos.xSourceVent, 0, infos.ySea)); } else sec = 0;
      if (k % 2000) continue;
      ecartNiveaux = Math.max(ecartNiveaux, Math.abs(niveau(monde.r.mers[0]) - niveau(monde.r.mers[1])));
      if (k >= 10000) horsMax = Math.max(horsMax, horsLits());
      if (k >= 10000 && k <= 60000) { const c = nappeCols(); nonSatMin = Math.min(nonSatMin, c.nonSat); avecMin = Math.min(avecMin, c.avec); nappeMin = Math.min(nappeMin, monde.masses().nappe); }
    }
    verifier(`cycle, 80 000 pas : les deux mers restent au même niveau (écart maximal ${ecartNiveaux} case)`, ecartNiveaux <= 1);
    verifier(`cycle, 80 000 pas : pas d’eau qui s’accumule sur l’île hors des lits des rivières (au plus ${arrondi(horsMax, 1)} g, ruissellement en cours compris)`, horsMax <= 8);
    verifier(`entre 10 000 et 60 000 pas, sol non saturé sur au moins 3 cases (sur 6) dans au moins la moitié des colonnes (au moins ${Math.round(100 * nonSatMin)} %)`, nonSatMin >= 0.5);
    verifier(`entre 10 000 et 60 000 pas, la nappe reste présente (au moins ${avecMin} colonnes où elle a 2 cases d’épaisseur ou plus ; au moins ${arrondi(nappeMin, 1)} g)`, avecMin >= 5 && nappeMin >= 5);
    verifier(`des périodes sans pluie sur l’île (au plus 2 gouttes, jusqu’à ${secMax} pas de suite, quand les alizés faiblissent) pendant lesquelles la rivière garde de l’eau (au moins ${arrondi(riviereSec, 1)} g)`, secMax >= 2000 && riviereSec >= 3);
    verifier(`masse conservée sur 80 000 pas (écart ${(monde.masses().total - m0).toExponential(1)} g)`, Math.abs(monde.masses().total - m0) < 1e-6 * m0);
  }
  {
    // niveau ABSOLU de la mer sur 150 000 pas (20 °C et 12 °C) ; aucune case d'eau trop pleine
    for (const tMer of [20, 12]) {
      const {monde} = SC.cycle(tMer);
      monde.r.soleil = 3;
      const {nx, ny, typ, m} = monde, oc = monde.r.ocean;
      const niveau = b => { let s = 0, k = 0; for (let x = b.x0; x <= b.x1; x++) { let y = 0; while (y < ny && !(oc[y * nx + x] && typ[y * nx + x] === EAU)) y++; if (y < ny) { s += y + 1 - Math.min(1, m[y * nx + x]); k++; } } return s / k; };
      const niveaux = [];
      let mMax = 0;
      for (let k = 1; k <= 150000; k++) {
        monde.avancer();
        if (k % 250 === 0) for (let i = 0; i < monde.n; i++) if (typ[i] === EAU && m[i] > mMax) mMax = m[i];
        if (k % 2000 === 0 && k >= 10000) niveaux.push(niveau(monde.r.mers[0]), niveau(monde.r.mers[1]));
      }
      const tri = niveaux.slice().sort((a, b) => a - b), med = tri[tri.length >> 1];
      verifier(`air à ${tMer} °C, 150 000 pas : la surface des deux mers reste à ±1 ligne de sa hauteur habituelle (de ${arrondi(tri[0], 2)} à ${arrondi(tri[tri.length - 1], 2)} ; médiane ${arrondi(med, 2)}) ; aucune case d’eau au-delà de 1,5 g (au plus ${arrondi(mMax, 2)} g)`,
        tri[0] >= med - 1 && tri[tri.length - 1] <= med + 1 && mMax <= 1.5);
    }
  }
  {
    // calcul plus rapide (transformations lentes un pas sur deux) : mêmes nuages, pluie et vapeur
    const bilan = alt => {
      const {monde, infos} = SC.cycle(20);
      monde.r.soleil = 3; monde.r.alterner = alt;
      const nx = monde.nx; let sn = 0, sp = 0, sv = 0, k0 = 0;
      for (let k = 1; k <= 24000; k++) {
        monde.avancer();
        if (k < 2000 || k % 100) continue;
        for (let i = 0; i < monde.n; i++) {
          if (monde.typ[i] !== AIR) continue;
          sv += monde.v[i];
          if (((i / nx) | 0) > infos.haut[i % nx]) continue;
          if (monde.d[i] > 0.0008) sn++;
          if (monde.p[i] > 0.0004) sp++;
        }
        k0++;
      }
      return {nuages: sn / k0, pluie: sp / k0, vapeur: sv / k0};
    };
    const a = bilan(true), b = bilan(false);
    const ec = c => Math.abs(a[c] - b[c]) / b[c];
    verifier(`calcul alterné ou non : nuages (${Math.round(a.nuages)} / ${Math.round(b.nuages)} cases en moyenne), pluie (${Math.round(a.pluie)} / ${Math.round(b.pluie)}), vapeur (${arrondi(a.vapeur, 1)} / ${arrondi(b.vapeur, 1)} g) à 15 % près`,
      ['nuages', 'pluie', 'vapeur'].every(c => ec(c) <= 0.15));
  }
  {
    // cycle libre pendant 40 000 pas, puis une averse : le front d'humidité descend dans un sol plus clair
    const {monde, infos} = SC.cycle(20);
    monde.r.soleil = 3;
    avancer(monde, 40000);
    const nx = monde.nx, cap = monde.r.capaciteSol;
    const xs = [];
    for (let x = infos.xSourceVent + 6; x < infos.xSommet - 2; x++) { const y = monde.niveauNappe(x); if (y < 0 || y > infos.haut[x] + 3) xs.push(x); }   // colonnes où la nappe est profonde
    const humidite = k => xs.reduce((s, x) => s + monde.m[(infos.haut[x] + k) * nx + x], 0) / Math.max(1, xs.length);
    const avant = [0, 1, 2].map(humidite);
    const arrivee = [-1, -1, -1];
    for (let k = 1; k <= 1500; k++) {
      if (k <= 100) for (const x of xs) { const i = (infos.haut[x] - 2) * nx + x; if (monde.typ[i] === AIR) monde.p[i] += 0.006; }
      monde.avancer();
      for (let j = 0; j < 3; j++) if (arrivee[j] < 0 && humidite(j) > avant[j] + 0.08 * cap) arrivee[j] = k;
    }
    verifier(`averse tardive (après 40 000 pas) : sur ${xs.length} colonnes à nappe profonde, le sol était peu mouillé (${avant.map(a => arrondi(a / cap, 2)).join(', ')} de la capacité) et le front d’humidité descend (arrivée par profondeur aux pas ${arrivee.join(', ')})`,
      xs.length >= 10 && avant[0] < 0.6 * cap && arrivee.every(a => a > 0) && arrivee[0] <= arrivee[1] && arrivee[1] <= arrivee[2] && arrivee[0] < arrivee[2]);
  }
  {
    // sans pluie (Soleil caché, pas de vent) : la nappe baisse et la source faiblit
    const {monde} = SC.cycle(20);
    monde.r.soleil = 0; monde.r.vent = null; monde.r.ventVariable = 0;
    const debits = [], nappes = [];
    let s0 = monde.compteurs.source;
    for (let k = 1; k <= 16000; k++) { monde.avancer(); if (k % 4000 === 0) { debits.push(arrondi(monde.compteurs.source - s0, 2)); s0 = monde.compteurs.source; nappes.push(arrondi(monde.masses().nappe, 1)); } }
    verifier(`sans pluie, la nappe baisse (${nappes.join(' → ')} g) et la source faiblit après la mise en route (eau sortie par 4 000 pas : ${debits.join(', ')} g) sans s’arrêter d’un coup`,
      nappes[3] < nappes[0] && debits[3] < Math.max(debits[0], debits[1]) && debits[3] > 0);
  }
  {
    // air à 10 °C au bord de la mer : la cavité (sous-sol) ne gèle pas
    const {monde, infos} = SC.cycle(10);
    monde.r.soleil = 3;
    avancer(monde, 20000);
    const c = infos.cavite;
    let glace = 0; for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (monde.typ[y * monde.nx + x] === GLACE) glace++;
    verifier(`air à 10 °C au bord de la mer : la cavité ne gèle pas (${glace} case de glace ; eau à ${arrondi(monde.T[c.y1 * monde.nx + c.x0], 1)} °C)`, glace === 0 && eauDans(monde, c.x0, c.x1, c.y0, c.y1) > 5);
  }
  {
    // neige et bloc de glace chauffés par-dessous dans un récipient construit
    for (const [nom, grain, tChaud] of [['neige, plaque 160 °C', true, 160], ['bloc de glace, plaque 160 °C', false, 160], ['neige, plaque 60 °C', true, 60]]) {
      const {monde} = SC.bacASable(160, 94, 20, {vide: true});
      monde.r.tChaud = tChaud;
      const x0 = 60, x1 = 90, fond = 88, nx = monde.nx;
      monde.rectangle(x0 - 1, 55, x0 - 1, fond, VERRE, 20); monde.rectangle(x1 + 1, 55, x1 + 1, fond, VERRE, 20); monde.rectangle(x0 - 1, fond, x1 + 1, fond, VERRE, 20);
      monde.rectangle(x0 - 4, fond + 1, x1 + 4, fond + 3, CHAUD, tChaud);
      for (let y = fond - 20; y < fond; y++) for (let x = x0; x <= x1; x++) monde.poser(y * nx + x, GLACE, -5, grain ? {drap: GRAIN} : {});
      let gl0 = 0, maxi = -Infinity, n = 0;
      for (let k = 0; k <= 1500; k++) {
        if (k % 10 === 0) {
          let gl = 0; for (let y = 30; y < fond; y++) for (let x = x0; x <= x1; x++) { const i = y * nx + x; if (monde.typ[i] === GLACE) gl += monde.m[i]; }
          if (!gl0) gl0 = gl;
          const bas = monde.lireTemperature((x0 + x1) / 2, fond - 3.5), mi = monde.lireTemperature((x0 + x1) / 2, fond - 10);
          if (gl >= 0.25 * gl0 && k > 30) { maxi = Math.max(maxi, bas, mi); n++; }
        }
        monde.avancer();
      }
      verifier(`${nom}, dans un récipient construit : tant qu’il reste un quart de la glace, l’eau au fond et à mi-hauteur reste sous 2 °C (au plus ${arrondi(maxi, 2)} °C, ${n} mesures)`, n >= 3 && maxi <= 2);
    }
  }
  {
    // eau chauffée d'un seul côté : les courants de convection mélangent toute l'eau (pas de côté froid)
    const cas = [
      {nom: 'plaque contre la paroi de droite', poser: m => { m.rectangle(59, 55, 59, 88, VERRE, 20); m.rectangle(81, 55, 81, 88, VERRE, 20); m.rectangle(59, 88, 81, 88, VERRE, 20); m.rectangle(60, 66, 80, 87, EAU, 20); m.rectangle(82, 60, 84, 88, CHAUD, 160); }, xs: [62, 70, 78], y: 84},
      {nom: 'récipient de 50 cases, plaque sous un seul bord', poser: m => { m.rectangle(39, 60, 39, 87, VERRE, 20); m.rectangle(90, 60, 90, 87, VERRE, 20); m.rectangle(39, 87, 90, 87, VERRE, 20); m.rectangle(40, 70, 89, 86, EAU, 20); m.rectangle(38, 88, 52, 90, CHAUD, 160); }, xs: [45, 65, 85], y: 82},
    ];
    for (const c of cas) {
      const {monde} = SC.bacASable(164, 91, 20, {vide: true});
      c.poser(monde);
      let ecartMax = 0, tMax = 0, bulles0 = 0;
      for (let k = 1; k <= 4000; k++) {
        monde.avancer();
        if (k < 400 || k % 100) continue;
        const ts = c.xs.map(x => monde.lireTemperature(x, c.y));
        ecartMax = Math.max(ecartMax, Math.max(...ts) - Math.min(...ts)); tMax = Math.max(tMax, ...ts);
      }
      verifier(`${c.nom} : l’eau se mélange, l’écart entre le côté chauffé (où l’eau bout sur la plaque), le milieu et l’autre côté reste petit (au plus ${arrondi(ecartMax, 1)} °C ; jusqu’à ${arrondi(tMax, 1)} °C ; ${monde.compteurs.bulles} bulles)`, ecartMax <= 8);
    }
  }
  {
    // pendant toute l'ébullition : air chaud et clair au ras de l'eau, brume plus haut, panache qui sort
    // du bécher (le bécher ne se remplit pas de brume)
    const [nx, ny] = dims(770, 714);
    const {monde, thermometres} = SC.bacASable(nx, ny, 20);
    const th = thermometres[0], xc = Math.round(th.x), yt = Math.round(th.y);
    let xg = xc; while (monde.typ[yt * nx + xg] !== VERRE) xg--;
    let xd = xc; while (monde.typ[yt * nx + xd] !== VERRE) xd++;
    let yh = yt; while (yh > 0 && monde.typ[yh * nx + xg] === VERRE) yh--; yh++;
    const visible = i => 0.97 * (1 - Math.exp(-monde.d[i] / 0.0025)) > 0.4;
    let mesures = 0, clairMin = Infinity, fracMax = 0, panacheMax = 0, sursat = 0, nCouche = 0, tCouche = 0, plusChaud = 0, comparables = 0;
    for (let k = 1; k <= 4200; k++) {
      monde.avancer();
      if (k % 200 || monde.compteurs.bulles < 5) continue;
      let y = 0; while (y < ny && monde.typ[y * nx + xc] !== EAU) y++;
      if (y >= yt) break;   // presque plus d'eau
      let clair = 0;
      for (let yy = y - 1; yy >= 0; yy--) { const i = yy * nx + xc; if (monde.typ[i] !== AIR || visible(i)) break; clair++; }
      let br = 0, tot = 0;
      for (let yy = yh; yy < y; yy++) for (let x = xg + 1; x < xd; x++) { const i = yy * nx + x; if (monde.typ[i] !== AIR) continue; tot++; if (visible(i)) br++; }
      let pan = 0, Tb = 0;
      for (let yy = Math.max(0, yh - 40); yy < yh; yy++) for (let x = xg - 15; x <= xd + 15; x++) { if (x < 0 || x >= nx) continue; const i = yy * nx + x; if (monde.typ[i] === AIR && visible(i)) { pan++; Tb += monde.T[i]; } }
      let Tc = 0, nc = 0;
      for (let x = xc - 4; x <= xc + 4; x++) {
        let yy = 0; while (yy < ny && monde.typ[yy * nx + x] !== EAU) yy++;
        const i = (yy - 1) * nx + x;
        if (yy < 1 || monde.typ[i] !== AIR) continue;
        nCouche++; nc++; Tc += monde.T[i]; tCouche += monde.T[i];
        if (monde.v[i] > 1.05 * satLiquide(monde.T[i])) sursat++;
      }
      clairMin = Math.min(clairMin, clair); fracMax = Math.max(fracMax, tot ? br / tot : 0); panacheMax = Math.max(panacheMax, pan);
      if (pan > 20 && nc) { comparables++; if (Tc / nc > Tb / pan + 10) plusChaud++; }
      mesures++;
    }
    verifier(`bac à sable, pendant toute l’ébullition (${mesures} mesures) : au moins ${clairMin} cases d’air clair au-dessus de l’eau, au plus ${Math.round(100 * fracMax)} % du haut du bécher dans la brume, panache au-dessus du bécher (jusqu’à ${panacheMax} cases)`,
      mesures >= 8 && clairMin >= 3 && fracMax <= 0.5 && panacheMax >= 100);
    verifier(`bac à sable : l’air au ras de l’eau qui bout est chaud (${arrondi(tCouche / Math.max(1, nCouche), 1)} °C en moyenne), non sursaturé (${sursat} cases sur ${nCouche} au-delà de 105 %) et plus chaud que la brume du panache (${plusChaud} mesures sur ${comparables})`,
      nCouche > 0 && tCouche / nCouche >= 50 && sursat <= 0.02 * nCouche && comparables >= 3 && plusChaud === comparables);
  }
}

console.log(echecs.length ? '\n' + echecs.length + ' échec(s) : ' + echecs.join(' | ') : '\nTout est vérifié.');
process.exit(echecs.length ? 1 : 0);
