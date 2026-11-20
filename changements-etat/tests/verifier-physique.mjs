// tests/verifier-physique.mjs — contrôles rejouables du modèle physique (Node seul, sans navigateur)
//
//   node tests/verifier-physique.mjs
//
// Le moteur (simulation.js, scenes.js) est déterministe : hasard à graine fixe. Chaque contrôle
// dit ce qu'il vérifie. Durée : une à deux minutes.
//   1. Conservation de la masse : bac à sable (toutes les transformations), cycle de l'eau,
//      expérience de fusion, sur de longues simulations.
//   2. Palier à 0 °C lu par le thermomètre pendant la coexistence glace / eau liquide, puis montée
//      après la disparition de la dernière glace (plusieurs masses et puissances).
//   3. Ébullition à 100 °C : bulles, température lue, aucune eau liquide au-dessus de 100 °C.
//   4. Évaporation sous 100 °C dans l'air sec, sans aucune bulle.
//   5. Cycle de l'eau : nuages en altitude, pluie, infiltration, retour de l'eau à l'océan, givre
//      au sommet ; moins d'évaporation quand le Soleil est caché.
// Le script n'est pas nécessaire au fonctionnement de l'app.

import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const CE = require('../simulation.js');
const SC = require('../scenes.js');
const {AIR, EAU, GLACE, FROID, satLiquide, H_EBU} = CE;

const echecs = [];
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 700) : ''));
  if (!ok) echecs.push(nom);
}
const arrondi = (x, n = 3) => Math.round(x * 10 ** n) / 10 ** n;
const sansNaN = monde => ['m', 'h', 'T', 'v', 'd', 'c', 'p'].every(k => monde[k].every(Number.isFinite));

// ---------------------------------------------------------------- 1. Conservation de la masse
console.log('1. Conservation de la masse');
{
  const {monde} = SC.bacASable(150, 100, 20);
  // De l'eau contre la plaque froide (solidification) et de la neige (grains) en plus de la scène
  const {nx, ny} = monde;
  for (let y = Math.round(ny * 0.3); y < Math.round(ny * 0.3) + 6; y++) for (let x = nx - 7; x < nx - 3; x++) monde.poser(y * nx + x, EAU, 20);
  for (let x = 60; x < 75; x += 2) monde.poser(5 * nx + x, GLACE, -5, {drap: CE.GRAIN});
  const m0 = monde.masses().total;
  let ecartMax = 0;
  for (let k = 1; k <= 20000; k++) {
    monde.avancer();
    if (k % 1000 === 0) ecartMax = Math.max(ecartMax, Math.abs(monde.masses().total - m0));
  }
  const c = monde.compteurs;
  verifier(`bac à sable, 20 000 pas : masse totale constante (${arrondi(m0, 1)} g, écart maximal ${ecartMax.toExponential(2)} g)`, ecartMax < 1e-6 * m0, {ecartMax});
  verifier('bac à sable : aucune valeur non numérique', sansNaN(monde));
  const faits = ['fusion', 'solidification', 'evaporation', 'ebullition', 'condensationLiquide', 'condensationSolide'];
  verifier('bac à sable : fusion, solidification, évaporation, ébullition, condensation liquide et solide ont eu lieu (masses transformées, en cases)',
    faits.every(f => c[f] > 0), Object.fromEntries(faits.map(f => [f, arrondi(c[f])])));
}
{
  // Sublimation : dans l'air de la pièce (30 % d'humidité), la glace à 0 °C reçoit plutôt du givre ;
  // elle se sublime dans un air très sec et froid.
  const {monde} = SC.bacASable(80, 60, -15, {vide: true});
  const {nx, ny} = monde;
  monde.rectangle(20, ny - 8, 40, ny - 1, GLACE, -15);
  for (let x = 50; x < 70; x += 3) monde.poser((ny - 1) * nx + x, GLACE, -15, {drap: CE.GRAIN});
  for (let i = 0; i < monde.n; i++) if (monde.typ[i] === AIR) monde.v[i] = 0;
  monde.r.sortieHaut = 0;
  const m0 = monde.masses();
  for (let k = 0; k < 6000; k++) monde.avancer();
  const m1 = monde.masses();
  verifier(`sublimation : dans l’air très sec à −15 °C, la glace devient de la vapeur sans fondre (glace ${arrondi(m0.glace, 2)} → ${arrondi(m1.glace, 2)} g, vapeur ${arrondi(m0.vapeur, 2)} → ${arrondi(m1.vapeur, 2)} g)`,
    monde.compteurs.sublimation > 0.1 && m1.glace < m0.glace && monde.compteurs.fusion === 0 && Math.abs(m1.total - m0.total) < 1e-9 * m0.total,
    {sublimation: arrondi(monde.compteurs.sublimation, 3), liquide: m1.liquide});
}
{
  const {monde} = SC.cycle(20);
  monde.r.soleil = 4;
  const m0 = monde.masses().total;
  let ecartMax = 0;
  for (let k = 1; k <= 12000; k++) { monde.avancer(); if (k % 1000 === 0) ecartMax = Math.max(ecartMax, Math.abs(monde.masses().total - m0)); }
  verifier(`cycle de l'eau, 12 000 pas : masse totale constante (${arrondi(m0, 1)} g, écart maximal ${ecartMax.toExponential(2)} g)`, ecartMax < 1e-6 * m0 && sansNaN(monde), {ecartMax});
}
{
  const {monde} = SC.fusion(150, 4, true);
  const m0 = monde.masses().total;
  let ecartMax = 0;
  for (let k = 1; k <= 20000; k++) { monde.avancer(); if (k % 1000 === 0) ecartMax = Math.max(ecartMax, Math.abs(monde.masses().total - m0)); }
  const ms = monde.masses();
  verifier(`fusion jusqu'à l'ébullition, 20 000 pas (33 min simulées) : masse totale constante (${arrondi(m0, 2)} g, écart maximal ${ecartMax.toExponential(2)} g)`,
    ecartMax < 1e-6 * m0 && sansNaN(monde) && monde.compteurs.bulles > 0, {ecartMax, bulles: monde.compteurs.bulles, liquide: arrondi(ms.liquide, 1), dehors: arrondi(ms.dehors, 1)});
}

// ---------------------------------------------------------------- 2. Palier de fusion
console.log('2. Palier à 0 °C (expérience de fusion, relevé toutes les 30 s)');
function experienceFusion(masse, niveau, minutes) {
  const {monde, thermometres, infos} = SC.fusion(masse, niveau, true);
  const th = thermometres[0];
  const dansBecher = () => {
    let glace = 0, liquide = 0;
    for (let y = infos.yHaut; y < infos.yFond; y++) for (let x = infos.x0; x <= infos.x1; x++) {
      const i = y * monde.nx + x;
      if (monde.typ[i] === GLACE) glace += monde.m[i]; else if (monde.typ[i] === EAU) liquide += monde.m[i];
    }
    return {glace: glace * infos.gParCase, liquide: liquide * infos.gParCase};
  };
  const mesures = [];
  const pasParMesure = Math.round(30 / monde.r.dt);
  for (let k = 0; k <= minutes * 2; k++) {
    mesures.push({t: k / 2, T: monde.lireTemperature(th.x, th.y), ...dansBecher()});
    for (let j = 0; j < pasParMesure; j++) monde.avancer();
  }
  return mesures;
}
for (const [masse, niveau] of [[150, 3], [100, 3], [200, 3], [150, 5], [150, 2]]) {
  const mes = experienceFusion(masse, niveau, 12);
  // Coexistence : tant qu'il reste au moins un quart de la glace, la lecture doit rester à 0 °C aux
  // arrondis près ; à la toute fin de la fusion (peu de glace, donc peu de contact avec l'eau),
  // l'eau peut dépasser 0 °C d'un peu plus, comme dans un vrai bécher.
  const coexist = mes.filter(m => m.glace > 0.25 * masse && m.liquide > 0.02 * masse);
  const finFusion = mes.filter(m => m.glace > 0.1 * masse && m.liquide > 0.02 * masse);
  const resume = mes.slice(0, 16).map(m => `${m.t}:${arrondi(m.T, 1)}`).join(' ');
  const tri = coexist.map(m => m.T).sort((a, b) => a - b), mediane = tri.length ? tri[Math.floor(tri.length / 2)] : NaN;
  verifier(`${masse} g, plaque ${niveau} : tant qu’il reste au moins 25 % de la glace (${coexist.length} mesures), la température lue reste entre −0,5 et +1 °C, médiane ${arrondi(mediane, 2)} °C (au plus 0,3 °C d’écart avec 0 °C)`,
    coexist.length >= 2 && coexist.every(m => m.T > -0.5 && m.T < 1) && Math.abs(mediane) <= 0.3, resume);
  verifier(`${masse} g, plaque ${niveau} : tant qu’il reste au moins 10 % de la glace, elle reste sous +1,5 °C (au plus ${arrondi(Math.max(...finFusion.map(m => m.T)), 2)} °C)`,
    finFusion.every(m => m.T > -0.5 && m.T < 1.5));
  const fin = mes.findIndex(m => m.glace === 0);
  const apres = fin > 0 ? mes.slice(fin, fin + 4) : [];
  verifier(`${masse} g, plaque ${niveau} : après la disparition de la dernière glace (${fin >= 0 ? mes[fin].t + ' min' : 'jamais'}), la température monte de plus de 5 °C en 1,5 min`,
    apres.length >= 4 && apres[3].T - apres[0].T > 5, apres.map(m => arrondi(m.T, 1)));
}
{
  const duree = (masse, niveau) => { const mes = experienceFusion(masse, niveau, 16); return mes.findIndex(m => m.glace === 0) / 2; };
  const d100 = duree(100, 3), d200 = duree(200, 3), d5 = duree(150, 5), d2 = duree(150, 2);
  verifier('la fusion dure plus longtemps avec plus de glace, moins longtemps avec une plaque plus puissante', d200 > d100 && d2 > d5,
    {'100 g': d100, '200 g': d200, 'plaque 2': d2, 'plaque 5': d5});
}

// ---------------------------------------------------------------- 3. Ébullition
console.log('3. Ébullition à 100 °C');
{
  const {monde, thermometres} = SC.bacASable(150, 100, 20);
  const th = thermometres[0];
  let lectures = [], tMaxLiquide = -Infinity, premiereBulle = -1;
  for (let k = 1; k <= 3000; k++) {
    monde.avancer();
    for (let i = 0; i < monde.n; i++) if (monde.typ[i] === EAU && monde.T[i] > tMaxLiquide) tMaxLiquide = monde.T[i];
    if (premiereBulle < 0 && monde.compteurs.bulles > 0) premiereBulle = k;
    // lecture quand le réservoir du thermomètre a au moins 2 cases d'eau au-dessus de lui
    const ib = Math.floor(th.y) * monde.nx + Math.floor(th.x);
    if (premiereBulle > 0 && k > premiereBulle + 200 && k % 50 === 0 && monde.typ[ib] === EAU && monde.typ[ib - 2 * monde.nx] === EAU) lectures.push(monde.lireTemperature(th.x, th.y));
  }
  verifier('bac à sable : des bulles se forment dans l’eau chauffée', monde.compteurs.bulles > 20, {bulles: monde.compteurs.bulles, premiereBulle});
  const triB = lectures.slice().sort((a, b) => a - b), medB = triB[Math.floor(triB.length / 2)];
  verifier(`bac à sable : pendant l’ébullition, le thermomètre lit entre 98,5 et 100 °C, médiane ${arrondi(medB, 2)} °C (au moins 99,5) (${lectures.length} lectures, de ${arrondi(triB[0], 2)} à ${arrondi(triB[triB.length - 1], 2)} °C)`,
    lectures.length > 5 && lectures.every(T => T >= 98.5 && T <= 100.0001) && medB >= 99.5);
  verifier('aucune case d’eau liquide au-dessus de 100 °C', tMaxLiquide <= 100 + 1e-9, {tMaxLiquide});
}
{
  const mes = experienceFusion(150, 4, 24);
  const debut = mes.findIndex(m => m.T > 99);
  const palier = debut > 0 ? mes.slice(debut + 1, debut + 9) : [];
  verifier('expérience de fusion, plaque 4 : palier d’ébullition lu entre 99,3 et 100 °C pendant 4 min', palier.length === 8 && palier.every(m => m.T >= 99.3 && m.T <= 100.0001),
    palier.map(m => arrondi(m.T, 2)));
  verifier('expérience de fusion : la masse d’eau du bécher diminue pendant l’ébullition', palier.length === 8 && palier[7].liquide < palier[0].liquide - 5,
    palier.length ? [arrondi(palier[0].liquide, 1), arrondi(palier[7].liquide, 1)] : null);
}

// ---------------------------------------------------------------- 4. Évaporation sous 100 °C
console.log('4. Évaporation sous 100 °C, dans l’air sec');
{
  const {monde} = SC.bacASable(120, 80, 20, {vide: true});
  const {nx, ny} = monde;
  monde.rectangle(30, ny - 2, 90, ny - 1, EAU, 20);          // une flaque à 20 °C
  for (let i = 0; i < monde.n; i++) if (monde.typ[i] === AIR) monde.v[i] = 0;   // air sec
  monde.r.sortieHaut = 0.5 * satLiquide(20);
  const avant = monde.masses();
  let tMax = -Infinity;
  for (let k = 0; k < 4000; k++) {
    monde.avancer();
    if (k % 100 === 0) for (let i = 0; i < monde.n; i++) if (monde.typ[i] === EAU && monde.T[i] > tMax) tMax = monde.T[i];
  }
  const apres = monde.masses();
  verifier(`la flaque perd de l’eau liquide (${arrondi(avant.liquide, 1)} g → ${arrondi(apres.liquide, 1)} g) et l’air gagne de la vapeur (${arrondi(avant.vapeur, 1)} → ${arrondi(apres.vapeur + apres.dehors, 1)} g)`,
    apres.liquide < avant.liquide * 0.9 && apres.vapeur + apres.dehors > avant.vapeur);
  verifier('aucune bulle : ce n’est pas une ébullition', monde.compteurs.bulles === 0 && monde.compteurs.ebullition === 0);
  verifier(`l’eau de la flaque reste loin de 100 °C (au plus ${arrondi(tMax, 1)} °C)`, tMax < 25);
}

// ---------------------------------------------------------------- 5. Cycle de l'eau
console.log('5. Cycle de l’eau à La Réunion');
function cycle(soleil, pas, vent = true) {
  const {monde, infos} = SC.cycle(20);
  monde.r.soleil = soleil;
  if (!vent) monde.r.vent = null;
  let nuagesMax = 0, nuagesAltitude = 0, pluieVue = 0, plusBas = Infinity;
  for (let k = 1; k <= pas; k++) {
    monde.avancer();
    if (k % 500 === 0) {
      let n = 0, haut = 0, p = 0;
      for (let i = 0; i < monde.n; i++) {
        if (monde.typ[i] !== AIR) continue;
        const y = (i / monde.nx) | 0;
        if (monde.d[i] > 0.0015) { n++; if (infos.altitude(y) > 500) haut++; plusBas = Math.min(plusBas, infos.altitude(y)); }
        if (monde.p[i] > 0.0005) p++;
      }
      if (n > nuagesMax) { nuagesMax = n; nuagesAltitude = haut / n; }
      pluieVue = Math.max(pluieVue, p);
    }
  }
  let givre = 0;
  for (let i = 0; i < monde.n; i++) if (monde.typ[i] === GLACE) givre++;
  return {monde, infos, nuagesMax, nuagesAltitude, pluieVue, givre, plusBas};
}
{
  const r = cycle(4, 8000);
  const c = r.monde.compteurs;
  verifier(`des nuages apparaissent en altitude (jusqu’à ${r.nuagesMax} cases de gouttelettes ; ${Math.round(100 * r.nuagesAltitude)} % à plus de 500 m ; aucun sous ${Math.round(r.plusBas)} m)`,
    r.nuagesMax > 150 && r.nuagesAltitude > 0.5 && r.plusBas > 100);
  verifier(`il pleut (pluie formée : ${arrondi(c.pluie, 1)} g ; jusqu’à ${r.pluieVue} cases de pluie visibles)`, c.pluie > 20 && r.pluieVue > 10);
  verifier(`l’eau de pluie s’infiltre dans le sol (${arrondi(c.infiltration, 1)} g) et l’eau revient à l’océan par ruissellement et par le sol (${arrondi(c.versOcean, 1)} g)`,
    c.infiltration > 5 && c.versOcean > 5);
  verifier(`du givre se forme au sommet du Piton des Neiges (${r.givre} cases de glace, condensation solide : ${arrondi(c.condensationSolide, 2)} g)`,
    r.givre > 0 && c.condensationSolide > 0);
  const sansSoleil = cycle(0, 8000);
  verifier(`Soleil caché : moins d’évaporation (${arrondi(sansSoleil.monde.compteurs.evaporation, 1)} g au lieu de ${arrondi(c.evaporation, 1)} g)`,
    sansSoleil.monde.compteurs.evaporation < 0.8 * c.evaporation);
}

console.log(echecs.length ? '\n' + echecs.length + ' échec(s) : ' + echecs.join(' | ') : '\nTout est vérifié.');
process.exit(echecs.length ? 1 : 0);
