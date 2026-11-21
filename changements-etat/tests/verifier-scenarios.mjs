// tests/verifier-scenarios.mjs — scénarios de non-régression tirés des relectures indépendantes
//
//   node tests/verifier-scenarios.mjs [--complet] [--seulement 1,3,…]
//
// Chaque scénario ci-dessous a, un jour, révélé un défaut : il reste ici pour que le défaut ne
// revienne pas. Sans --complet, une sélection rapide (quelques minutes) ; avec --complet, tous les
// réglages et toutes les tailles (plus long). À lancer après chaque modification du moteur, avec
// tests/verifier-physique.mjs (qui contient les autres scénarios : surface horizontale, masse avec
// les outils, bloc de glace et thermomètre, neige chauffée par-dessous, mélange de côté, air au ras
// de l'eau qui bout, mers sur 150 000 pas, nappe et infiltration tardive, alternance, cavité,
// rivières).
//   1. Courbe de fusion à tous les réglages : pas de baisse de plus de 0,5 °C sous chauffage
//      constant ; plaque 3 ou plus : l'eau atteint environ 100 °C et bout (bulles).
//   2. Courbe de fusion : le thermomètre sait quand son réservoir n'est plus dans l'eau.
//   3. Récipients construits de tailles variées, chauffés de façons variées : des bulles avec une
//      plaque à 170 °C, et pas de baisse de la température de l'eau sous chauffage constant.
//   4. Gestes d'élève : une touche « Chauffer » puis un récipient (ou l'inverse) : des bulles.
//   5. Bac à sable : sur toute l'ébullition, zone claire au ras de l'eau, panache au-dessus du
//      bécher peu après le début de l'ébullition, pas de bécher rempli de brume ni de « dôme » ;
//      bécher vide sur la plaque chaude : pas de brume dedans.
//   6. Givre de la plaque froide : il reste collé à la plaque (il ne tombe pas).
//   7. Brassage de l'air : l'énergie (air, vapeur et gouttelettes) est conservée.
//   8. Eau souterraine : la source reste la principale sortie de la nappe.

import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const CE = require('../simulation.js');
const SC = require('../scenes.js');
const {AIR, EAU, GLACE, VERRE, CHAUD, FROID, GIVRE} = CE;

const COMPLET = process.argv.includes('--complet');
const iSeul = process.argv.indexOf('--seulement');
const PARTIES = iSeul > 0 ? process.argv[iSeul + 1].split(',').map(Number) : null;
const partie = (k, titre) => { if (PARTIES && !PARTIES.includes(k)) return false; console.log(k + '. ' + titre); return true; };
const echecs = [];
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 600) : ''));
  if (!ok) echecs.push(nom);
}
const r = (x, n = 1) => Math.round(x * 10 ** n) / 10 ** n;
const dims = (w, h) => { const rap = Math.min(2.4, Math.max(0.6, w / h)); const nx = Math.round(Math.sqrt(15000 * rap)); return [nx, Math.round(15000 / nx)]; };
const visible = d => 0.97 * (1 - Math.exp(-d / 0.0025)) > 0.3;
const eauMoyenne = monde => { let s = 0, mm = 0; for (let i = 0; i < monde.n; i++) if (monde.typ[i] === EAU) { s += monde.T[i] * monde.m[i]; mm += monde.m[i]; } return mm ? s / mm : NaN; };

// ---------------------------------------------------------------- 1. Courbe de fusion
if (partie(1, 'Courbe de fusion à tous les réglages')) {
  const cas = [];
  if (COMPLET) { for (const masse of [100, 150, 200]) for (let niv = 1; niv <= 6; niv++) for (const ag of [true, false]) cas.push([masse, niv, ag]); }
  else cas.push([150, 3, true], [150, 3, false], [150, 2, true], [100, 2, true], [200, 4, true], [100, 6, true], [200, 1, false]);
  for (const [masse, niv, ag] of cas) {
    const {monde, thermometres: [th]} = SC.fusion(masse, niv, ag);
    let max = -Infinity, baisse = 0, premiere = -1, Tmax = -Infinity;
    const N = 120 * 600;   // 120 min (pas de 0,1 s)
    for (let k = 0; k <= N; k += 1) {
      if (k % 150 === 0) {
        if (!monde.thermometreDansLEau(th)) break;   // l'eau est passée sous le réservoir
        const T = monde.lireTemperature(th.x, th.y);
        if (T > 1) { max = Math.max(max, T); baisse = Math.max(baisse, max - T); }
        Tmax = Math.max(Tmax, T);
      }
      if (premiere < 0 && monde.compteurs.bulles > 0) premiere = k;
      monde.avancer();
    }
    const nom = `${masse} g, plaque ${niv}, ${ag ? 'agitateur' : 'sans agitateur'}`;
    verifier(`${nom} : pas de baisse de plus de 0,5 °C sous chauffage constant (au plus ${r(baisse, 2)} °C)`, baisse <= 0.5);
    if (niv >= 3) verifier(`${nom} : l’eau bout (première bulle à ${premiere < 0 ? 'jamais' : r(premiere / 600, 1) + ' min'}, jusqu’à ${r(Tmax, 1)} °C)`, premiere >= 0 && Tmax >= 99.5);
  }
}

// ---------------------------------------------------------------- 2. Thermomètre hors de l'eau
if (partie(2, 'Courbe de fusion : thermomètre hors de l’eau')) {
  const {monde, thermometres: [th]} = SC.fusion(100, 6, true);
  let dansAvant = true, sortie = -1, lectureApres = null;
  for (let k = 0; k < 160 * 150; k++) {
    if (k % 150 === 0) {
      const dans = monde.thermometreDansLEau(th);
      if (dansAvant && !dans && sortie < 0) { sortie = k; lectureApres = monde.lireTemperature(th.x, th.y); }
      dansAvant = dans;
    }
    monde.avancer();
  }
  let y = 0; const xc = Math.floor(th.x);
  while (y < monde.ny && monde.typ[y * monde.nx + xc] !== EAU) y++;
  verifier(`100 g, plaque 6 : le thermomètre signale qu’il n’est plus dans l’eau (à ${sortie < 0 ? 'jamais' : r(sortie / 600, 1) + ' min'} ; surface de l’eau ligne ${y}, réservoir ligne ${r(th.y, 1)})`,
    sortie > 0 && !monde.thermometreDansLEau(th));
}

// ---------------------------------------------------------------- 3. Récipients construits
if (partie(3, 'Récipients construits, chauffés de façons variées')) {
  const [nx, ny] = dims(770, 714);
  const minutes = COMPLET ? 40 : 25;
  const tailles = COMPLET ? [[6, 6], [10, 10], [20, 12], [30, 15], [50, 10], [50, 20], [80, 15], [40, 30]] : [[10, 10], [20, 12], [50, 10]];
  const chauffes = ['dessous', 'moitie', 'bord3', 'centre4', 'fond-chaud', 'cote', 'paroi-chaude'];
  const sansBulle = [], baisses = [];
  for (const [W, H] of tailles) for (const chauffe of chauffes) {
    const {monde} = SC.bacASable(nx, ny, 20, {vide: true});
    const sol = ny - 1, epais = 2, x0 = Math.round((nx - W) / 2), x1 = x0 + W - 1, fond = sol - epais;
    const plaque = (xa, xb) => monde.rectangle(xa, fond + 1, xb, sol, CHAUD, monde.r.tChaud);
    monde.rectangle(x0 - 1, fond - H, x0 - 1, fond, VERRE, 20); monde.rectangle(x1 + 1, fond - H, x1 + 1, fond, VERRE, 20); monde.rectangle(x0 - 1, fond, x1 + 1, fond, VERRE, 20);
    const he = Math.max(1, Math.round(H * 0.7));
    monde.rectangle(x0, fond - he, x1, fond - 1, EAU, 20);
    if (chauffe === 'dessous') plaque(x0 - 3, x1 + 3);
    else if (chauffe === 'moitie') plaque(x0, x0 + Math.floor(W / 2));
    else if (chauffe === 'bord3') plaque(x0 - 3, x0 + 2);
    else if (chauffe === 'centre4') plaque(Math.round((x0 + x1) / 2) - 2, Math.round((x0 + x1) / 2) + 1);
    else if (chauffe === 'fond-chaud') monde.rectangle(x0, fond, x1, fond, CHAUD, monde.r.tChaud);
    else if (chauffe === 'cote') monde.rectangle(x1 + 2, fond - he, x1 + 3, fond, CHAUD, monde.r.tChaud);
    else if (chauffe === 'paroi-chaude') monde.rectangle(x1 + 1, fond - he, x1 + 1, fond, CHAUD, monde.r.tChaud);
    let max = -Infinity, baisse = 0;
    for (let k = 1; k <= minutes * 120; k++) {
      monde.avancer();
      if (k % 60 || monde.compteurs.bulles > 0) continue;   // avant l'ébullition : la température monte
      const T = eauMoyenne(monde); max = Math.max(max, T); baisse = Math.max(baisse, max - T);
    }
    if (monde.compteurs.bulles === 0) sansBulle.push(`${W}×${H} ${chauffe} (${r(eauMoyenne(monde), 0)} °C)`);
    if (baisse > 0.5) baisses.push(`${W}×${H} ${chauffe} (${r(baisse, 1)} °C)`);
  }
  const n = tailles.length * chauffes.length;
  verifier(`${n} récipients (plaque à 170 °C, ${minutes} min) : des bulles dans chacun (sans bulle : ${sansBulle.length})`, sansBulle.length === 0, sansBulle);
  verifier(`${n} récipients : avant l’ébullition, la température de l’eau ne baisse pas de plus de 0,5 °C sous chauffage (baisses : ${baisses.length})`, baisses.length === 0, baisses);
}

// ---------------------------------------------------------------- 4. Gestes d'élève
if (partie(4, 'Gestes d’élève : une touche « Chauffer » et un récipient')) {
  const [nx, ny] = dims(770, 714);
  const disque = (monde, gx, gy, R, f) => { for (let y = Math.floor(gy - R); y <= Math.ceil(gy + R); y++) for (let x = Math.floor(gx - R); x <= Math.ceil(gx + R); x++) if (x >= 0 && y >= 0 && x < nx && y < ny && (x + 0.5 - gx) ** 2 + (y + 0.5 - gy) ** 2 <= R * R + 0.3) f(y * nx + x); };
  const chaud = monde => i => { const t = monde.typ[i]; if (t === AIR || t === VERRE || t === FROID) monde.poser(i, CHAUD, monde.r.tChaud); };
  const recipient = (monde, cx, W, H, fondY) => { const x0 = Math.round(cx - W / 2), x1 = x0 + W - 1;
    monde.rectangle(x0 - 1, fondY - H, x0 - 1, fondY, VERRE, 20); monde.rectangle(x1 + 1, fondY - H, x1 + 1, fondY, VERRE, 20); monde.rectangle(x0 - 1, fondY, x1 + 1, fondY, VERRE, 20);
    monde.rectangle(x0, fondY - Math.round(H * 0.7), x1, fondY - 1, EAU, 20); };
  const rates = [];
  let n = 0;
  for (const [W, H] of [[8, 8], [12, 10], [20, 12], [30, 15]]) {
    const gestes = [
      ['posé au sol, une touche sur le fond', m => { recipient(m, nx / 2, W, H, ny - 1); disque(m, nx / 2, ny - 1, 2.5, chaud(m)); }],
      ['une touche au sol, récipient dessus', m => { disque(m, nx / 2, ny - 1, 2.5, chaud(m)); let y = ny - 1; while (m.typ[y * nx + Math.round(nx / 2)] !== AIR) y--; recipient(m, nx / 2, W, H, y); }],
      ['trait sur toute la largeur, récipient dessus', m => { for (let x = nx / 2 - W / 2 - 2; x <= nx / 2 + W / 2 + 2; x += 1.5) disque(m, x, ny - 1, 2.5, chaud(m)); let y = ny - 1; while (m.typ[y * nx + Math.round(nx / 2)] !== AIR) y--; recipient(m, nx / 2, W, H, y); }],
    ];
    for (const [nom, f] of gestes) {
      const {monde} = SC.bacASable(nx, ny, 20, {vide: true});
      f(monde); n++;
      let premiere = -1;
      for (let k = 1; k <= 30 * 120; k++) { monde.avancer(); if (monde.compteurs.bulles > 0) { premiere = k; break; } }
      if (premiere < 0) rates.push(`${W}×${H} ${nom} (${r(eauMoyenne(monde), 0)} °C)`);
    }
  }
  verifier(`${n} gestes d’élève : des bulles en moins de 30 min dans chaque cas (ratés : ${rates.length})`, rates.length === 0, rates);
}

// ---------------------------------------------------------------- 5. Brume et panache du bac à sable
if (partie(5, 'Bac à sable : brume et panache sur toute l’ébullition')) {
  const zones = COMPLET ? [[770, 714], [360, 330], [1000, 560]] : [[770, 714]];
  for (const [w, h] of zones) {
    const [nx, ny] = dims(w, h);
    const {monde, thermometres: [th]} = SC.bacASable(nx, ny, 20);
    const sol = ny - 1, lb = Math.max(14, Math.round(nx * 0.16)), hb = Math.max(18, Math.round(ny * 0.32));
    const B = {x0: Math.round(nx * 0.07) + 2, yHaut: sol - 2 - hb, fond: sol - 2}; B.x1 = B.x0 + lb - 1;
    let premiere = -1, panache = -1, dedansMax = 0, domeMax = 0, clairMin = Infinity, mesures = 0, airTotal = 0;
    for (let i = 0; i < monde.n; i++) if (monde.typ[i] === AIR) airTotal++;
    for (let k = 1; k <= 6000; k++) {
      monde.avancer();
      if (premiere < 0 && monde.compteurs.bulles > 0) premiere = k;
      if (k % 120 || premiere < 0) continue;
      const xc = (B.x0 + B.x1) >> 1;
      let ys = B.yHaut; while (ys < B.fond && monde.typ[ys * nx + xc] !== EAU) ys++;
      if (ys >= Math.floor(th.y)) break;   // l'eau ne recouvre plus le thermomètre
      let dans = 0, air = 0, dessus = 0, total = 0, clair = 0;
      for (let y = B.yHaut; y < ys; y++) for (let x = B.x0; x <= B.x1; x++) { const i = y * nx + x; if (monde.typ[i] !== AIR) continue; air++; if (visible(monde.d[i])) dans++; }
      for (let y = Math.max(0, B.yHaut - 30); y < B.yHaut; y++) for (let x = B.x0 - 4; x <= B.x1 + 4; x++) { const i = y * nx + x; if (monde.typ[i] === AIR && visible(monde.d[i])) dessus++; }
      for (let i = 0; i < monde.n; i++) if (monde.typ[i] === AIR && visible(monde.d[i])) total++;
      for (let y = ys - 1; y >= 0; y--) { const i = y * nx + xc; if (monde.typ[i] !== AIR || visible(monde.d[i])) break; clair++; }
      if (panache < 0 && dessus >= 30) panache = k;
      dedansMax = Math.max(dedansMax, air ? dans / air : 0); domeMax = Math.max(domeMax, total / airTotal); clairMin = Math.min(clairMin, clair);
      mesures++;
    }
    const nom = `grille ${nx}×${ny}`;
    verifier(`${nom} : panache au-dessus du bécher ${panache < 0 ? 'jamais' : r((panache - premiere) / 120, 1) + ' min'} après la première bulle (au plus 8 min)`, panache > 0 && panache - premiere <= 8 * 120);
    verifier(`${nom} : sur toute l’ébullition (${mesures} mesures), zone claire au ras de l’eau (au moins ${clairMin} cases), bécher jamais rempli de brume (au plus ${Math.round(100 * dedansMax)} %), pas de dôme (brume sur au plus ${Math.round(100 * domeMax)} % de l’air de la pièce)`,
      mesures >= 5 && clairMin >= 2 && dedansMax <= 0.4 && domeMax <= 0.12);
  }
  {
    // bécher vide sur la plaque chaude : pas de brume dedans
    const [nx, ny] = dims(770, 714);
    const {monde} = SC.bacASable(nx, ny, 20);
    const sol = ny - 1, lb = Math.max(14, Math.round(nx * 0.16)), hb = Math.max(18, Math.round(ny * 0.32));
    const B = {x0: Math.round(nx * 0.07) + 2, yHaut: sol - 2 - hb, fond: sol - 2}; B.x1 = B.x0 + lb - 1;
    for (let y = B.yHaut; y < B.fond; y++) for (let x = B.x0; x <= B.x1; x++) { const i = y * nx + x; if (monde.typ[i] === EAU) { monde.viderCase(i); monde.T[i] = 20; } }
    let pire = 0;
    for (let k = 1; k <= 3600; k++) { monde.avancer(); if (k % 240) continue;
      let b = 0, a = 0; for (let y = B.yHaut; y < B.fond; y++) for (let x = B.x0; x <= B.x1; x++) { const i = y * nx + x; if (monde.typ[i] !== AIR) continue; a++; if (visible(monde.d[i])) b++; }
      pire = Math.max(pire, b / a); }
    verifier(`bécher vide sur la plaque chaude : pas de brume dedans (au plus ${Math.round(100 * pire)} % de son air)`, pire <= 0.1);
  }
}

// ---------------------------------------------------------------- 6. Givre collé à la plaque froide
if (partie(6, 'Givre de la plaque froide')) {
  const [nx, ny] = dims(770, 714);
  const {monde} = SC.bacASable(nx, ny, 20);
  let collees = 0, libres = 0;
  for (let k = 1; k <= 7200; k++) monde.avancer();
  const touchePlaque = i => [i - 1, i + 1, i - nx, i + nx].some(j => j >= 0 && j < monde.n && monde.typ[j] === FROID);
  // givre relié à la plaque par d'autres cases de givre
  const vu = new Uint8Array(monde.n), pile = [];
  for (let i = 0; i < monde.n; i++) if (monde.typ[i] === GLACE && (monde.drap[i] & GIVRE) && touchePlaque(i)) { vu[i] = 1; pile.push(i); }
  while (pile.length) { const i = pile.pop(); collees++; for (const j of [i - 1, i + 1, i - nx, i + nx]) if (j >= 0 && j < monde.n && !vu[j] && monde.typ[j] === GLACE && (monde.drap[j] & GIVRE)) { vu[j] = 1; pile.push(j); } }
  for (let i = 0; i < monde.n; i++) if (monde.typ[i] === GLACE && (monde.drap[i] & GIVRE) && !vu[i]) libres++;
  verifier(`après 60 min, le givre reste collé à la plaque froide (${collees} cases reliées à la plaque, ${libres} détachées)`, collees >= 5 && libres <= 0.1 * collees);
}

// ---------------------------------------------------------------- 7. Brassage de l'air : énergie conservée
if (partie(7, 'Brassage de l’air : énergie conservée')) {
  for (const nomScene of ['bac', 'fusion']) {
    const monde = nomScene === 'bac' ? SC.bacASable(80, 60, 20, {vide: true}).monde : SC.fusion(150, 3, true).monde;
    const {typ, v, d, T} = monde;
    let graine = 7; const alea = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < monde.n; i++) if (typ[i] === AIR) { T[i] = 20 + 80 * alea(); v[i] = 0.3 * alea(); d[i] = 0.01 * alea(); }
    const kv = monde.r.chaleurVapeur, cA = monde.r.cAir;
    const energie = () => { let E = 0; for (let i = 0; i < monde.n; i++) if (typ[i] === AIR) E += (cA + kv * (v[i] + d[i])) * T[i]; return E; };
    const E0 = energie();
    for (let k = 0; k < 50; k++) monde.brasserVapeur(1);
    const E1 = energie();
    verifier(`${nomScene === 'bac' ? 'bac à sable' : 'expérience de fusion'} : 50 brassages de l’air conservent son énergie (écart relatif ${(Math.abs(E1 - E0) / E0).toExponential(1)})`, Math.abs(E1 - E0) / E0 < 1e-9);
  }
}

// ---------------------------------------------------------------- 8. Sorties de la nappe
if (partie(8, 'Eau souterraine : sorties de la nappe')) {
  const {monde} = SC.cycle(20);
  monde.r.soleil = 3;
  const N = COMPLET ? 60000 : 30000;
  for (let k = 0; k < 5000; k++) monde.avancer();
  const s0 = monde.compteurs.source, p0 = monde.compteurs.profond;
  for (let k = 0; k < N - 5000; k++) monde.avancer();
  const s = monde.compteurs.source - s0, p = monde.compteurs.profond - p0;
  verifier(`cycle libre, ${N} pas : la source est la principale sortie de la nappe (source ${r(s)} g, écoulement profond ${r(p)} g)`, s > p);
}

console.log(echecs.length ? '\n' + echecs.length + ' échec(s) : ' + echecs.join(' | ') : '\nTout est vérifié.');
process.exitCode = echecs.length ? 1 : 0;
