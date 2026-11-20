/*
 * Test 2 : vérifications physiques indépendantes.
 *   node optgeo/tests/physique.js
 * Chaque valeur attendue est calculée ici, par une formule d'optique (ou une petite
 * minimisation numérique pour le chemin optique), sans utiliser le moteur.
 * Les tolérances sont indiquées à chaque contrôle.
 */
'use strict';
const { charger } = require('./charger-moteur.js');
const OptGeo = charger();
const C = OptGeo.couleurs;
const PI = Math.PI, deg = PI / 180;

let reussis = 0, echecs = 0;
function controle(ok, message, detail) {
  if (ok) reussis++;
  else { echecs++; console.log('  ÉCHEC : ' + message + (detail !== undefined ? ' (' + detail + ')' : '')); }
}
function proche(a, b, tol, message) {
  controle(Math.abs(a - b) <= tol, message, 'obtenu ' + a + ', attendu ' + b + ', tolérance ' + tol);
}
function titre(t) { console.log('— ' + t); }

function scene(opts) {
  return new OptGeo.Scene(Object.assign({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 1000, optionnormale: false }, opts || {}));
}
function ajouter(s, type, p) {
  const r = s.ajouter(type, p);
  if (!r.ok) throw new Error('ajout ' + type + ' refusé : ' + r.erreur);
  return r.id;
}
function angleSeg(sg) { return Math.atan2(sg.a2y - sg.a1y, sg.a2x - sg.a1x); }
function normAngle(a) { while (a > PI) a -= 2 * PI; while (a <= -PI) a += 2 * PI; return a; }
/** Distance du point (px,py) à la droite portant le segment. */
function distDroite(px, py, sg) {
  const dx = sg.a2x - sg.a1x, dy = sg.a2y - sg.a1y;
  return Math.abs((px - sg.a1x) * dy - (py - sg.a1y) * dx) / Math.hypot(dx, dy);
}
function rayon(s, x, y, a, couleur, extra) {
  return ajouter(s, 'rayon', Object.assign({ ax: x, ay: y, kx: 100 * Math.cos(a), ky: 100 * Math.sin(a), couleur: couleur === undefined ? C.clRed : couleur,
    epaisseur: 1, nombremaxenfant: 10, vav: '', vaa: '', maxsegment: 500 }, extra || {}));
}
function bloc(s, x1, y1, x2, y2, n, extra) {
  return ajouter(s, 'polyhedre', Object.assign({ sommets: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }],
    indicerouge: n, indicevert: n, indicebleu: n, couleurbord: 0, couleurfond: C.clAqua, reflechientrant: 2, reflechisortant: 4 }, extra || {}));
}

/* ------------------------------------------------------------------ */
titre('Réfraction (Snell-Descartes) air -> verre n = 1,5 -> air, tolérance 1e-9 rad');
for (const i1 of [0, 10, 30, 45, 60, 80]) {
  const s = scene();
  bloc(s, 500, 100, 800, 900, 1.5);
  rayon(s, 500 - 200 * Math.cos(i1 * deg), 500 - 200 * Math.sin(i1 * deg), i1 * deg);   // vise le point (500, 500)
  const t = s.tracer();
  controle(t.segments.length === 3, 'trois segments pour i1 = ' + i1 + '°', t.segments.length);
  const r = Math.asin(Math.sin(i1 * deg) / 1.5);
  proche(angleSeg(t.segments[1]), r, 1e-9, 'angle réfracté pour i1 = ' + i1 + '°');
  proche(angleSeg(t.segments[2]), i1 * deg, 1e-9, 'angle émergent pour i1 = ' + i1 + '°');
  proche(t.segments[0].a2x, 500, 1e-9, 'point d’incidence sur la face');
}

titre('Réflexion totale à l’angle limite (n = 1,5 -> 1), tolérance 1e-9 rad');
{
  const lim = Math.asin(1 / 1.5);
  for (const d of [-0.01, -0.001, 0.001, 0.01]) {
    const s = scene();
    bloc(s, 200, 100, 800, 900, 1.5);
    const th = lim + d;
    rayon(s, 650 - 100 * Math.cos(th), 500 - 100 * Math.sin(th), th);
    const t = s.tracer(), sg = t.segments[1];
    if (d < 0) {
      proche(angleSeg(sg), Math.asin(1.5 * Math.sin(th)), 1e-9, 'réfraction juste sous l’angle limite (écart ' + d + ' rad)');
      controle(sg.a1x === 800 || Math.abs(sg.a1x - 800) < 1e-9, 'le rayon sort par la face x = 800');
    } else {
      proche(normAngle(angleSeg(sg)), normAngle(PI - th), 1e-9, 'réflexion totale juste au-dessus de l’angle limite (écart ' + d + ' rad)');
    }
  }
  // Sans réflexion autorisée (« jamais réfléchi ») le rayon s'arrête à la surface
  const s = scene();
  bloc(s, 200, 100, 800, 900, 1.5, { reflechisortant: 2 });
  rayon(s, 650 - 100 * Math.cos(lim + 0.05), 500 - 100 * Math.sin(lim + 0.05), lim + 0.05);
  controle(s.tracer().segments.length === 1, 'réflexion totale interdite : le rayon est arrêté (comportement d’OptGeo)');
}

/* ------------------------------------------------------------------ */
titre('Lentilles minces : 1/OA\' − 1/OA = 1/f\', tolérance 1e-7 (distance du point image à chaque rayon émergent)');
function lentille(type, f, OA, h) {
  const s = scene();
  ajouter(s, type, { a1x: 500, a1y: 200, a2x: 500, a2y: 800, focale: Math.abs(f), epaisseur: 1, couleur: C.clBlue, couleuraxe: C.clFuchsia, axefocal: true });
  const ax = 500 + OA, ay = 500 + h;
  ajouter(s, 'sourceponctuelle', { nombrederayon: 9, sx: ax, sy: ay, a1x: 500, a1y: 300, a2x: 500, a2y: 700, couleur: C.clRed, epaisseur: 1,
    maxenfantparrayon: 0, vav: '', vaa: '', sourcevirtuelle: false, tracersurfacesonde: false, listechemins: '', maxsegment: 500 });
  const t = s.tracer();
  const OAp = 1 / (1 / f + 1 / OA), gamma = OAp / OA;
  const xi = 500 + OAp, yi = 500 + gamma * h;
  const emergents = t.segments.filter((sg) => Math.abs(sg.a1x - 500) < 1e-9);
  controle(emergents.length === 9, type + ' : 9 rayons émergents', emergents.length);
  let dmax = 0;
  emergents.forEach((sg) => { dmax = Math.max(dmax, distDroite(xi, yi, sg)); });
  controle(dmax < 1e-7, type + ' f\' = ' + f + ', OA = ' + OA + ', h = ' + h + ' : image en OA\' = ' + OAp.toFixed(3), 'écart max ' + dmax);
}
lentille('lmc', 100, -300, 0);
lentille('lmc', 100, -300, 50);
lentille('lmc', 100, -60, 30);      // image virtuelle
lentille('lmd', -100, -300, 50);    // divergente : image virtuelle
lentille('lmd', -150, -200, -40);

/* ------------------------------------------------------------------ */
titre('Miroir plan : image symétrique, tolérance 1e-9');
{
  const s = scene();
  ajouter(s, 'miroirplan', { a1x: 700, a1y: 100, a2x: 700, a2y: 900, epaisseur: 1, couleur: 0, hachures: true });
  ajouter(s, 'sourceponctuelle', { nombrederayon: 7, sx: 300, sy: 450, a1x: 600, a1y: 200, a2x: 600, a2y: 700, couleur: C.clRed,
    epaisseur: 1, maxenfantparrayon: 0, vav: '', vaa: '', sourcevirtuelle: false, tracersurfacesonde: false, listechemins: '', maxsegment: 500 });
  const t = s.tracer();
  const refl = t.segments.filter((sg) => Math.abs(sg.a1x - 700) < 1e-9);
  controle(refl.length === 7, 'sept rayons réfléchis', refl.length);
  let dmax = 0; refl.forEach((sg) => { dmax = Math.max(dmax, distDroite(1100, 450, sg)); });
  controle(dmax < 1e-9, 'les rayons réfléchis semblent venir de A* = (1100, 450)', dmax);
  // face arrière : absorbe
  const s2 = scene();
  ajouter(s2, 'miroirplan', { a1x: 700, a1y: 100, a2x: 700, a2y: 900, epaisseur: 1, couleur: 0, hachures: true });
  rayon(s2, 900, 500, PI);
  const t2 = s2.tracer();
  controle(t2.segments.length === 1 && Math.abs(t2.segments[0].a2x - 700) < 1e-9, 'rayon arrivant par l’arrière arrêté sur le miroir');
}

/* ------------------------------------------------------------------ */
titre('Miroir sphérique concave paraxial : 1/p + 1/q = 1/f, tolérance 1e-7');
for (const [p, h] of [[400, 40], [150, -20], [60, 10]]) {
  const s = scene();
  ajouter(s, 'mscopa', { a1x: 700, a1y: 200, a2x: 700, a2y: 800, focale: 100, epaisseur: 1, couleur: 0, couleuraxe: C.clBlue,
    hachures: true, axefocal: true, trou: false, diametretrou: 0 });
  ajouter(s, 'sourceponctuelle', { nombrederayon: 7, sx: 700 - p, sy: 500 + h, a1x: 700, a1y: 350, a2x: 700, a2y: 650, couleur: C.clRed,
    epaisseur: 1, maxenfantparrayon: 0, vav: '', vaa: '', sourcevirtuelle: false, tracersurfacesonde: false, listechemins: '', maxsegment: 500 });
  const t = s.tracer();
  const q = 1 / (1 / 100 - 1 / p), xi = 700 - q, yi = 500 - h * q / p;
  const refl = t.segments.filter((sg) => Math.abs(sg.a1x - 700) < 1e-9);
  let dmax = 0; refl.forEach((sg) => { dmax = Math.max(dmax, distDroite(xi, yi, sg)); });
  controle(refl.length === 7 && dmax < 1e-7, 'p = ' + p + ' : image à q = ' + q.toFixed(3) + ' (γ = ' + (-q / p).toFixed(3) + ')', 'écart max ' + dmax);
}

titre('Miroir sphérique réel concave : un rayon parallèle à la hauteur h coupe l’axe à CP = R/(2 cos α), sin α = h/R ; tolérance 1e-9');
{
  const R = 400, cx = 300, cy = 500;
  const a1 = [cx + R * Math.cos(-30 * deg), cy + R * Math.sin(-30 * deg)], a2 = [cx + R * Math.cos(30 * deg), cy + R * Math.sin(30 * deg)];
  let ok = false;
  for (const aigu of [true, false]) {
    const s = scene();
    const res = s.ajouter('mscore', { a1x: a1[0], a1y: a1[1], a2x: a2[0], a2y: a2[1], rayoncourbure: R, epaisseur: 1, couleur: 0,
      couleuraxe: C.clBlue, hachures: true, axefocal: true, aigu: aigu, trou: false, diametretrou: 0 });
    if (!res.ok) continue;     // l'autre centre possible sort de l'espace de travail
    const g = s.geometrie(res.id);
    if (Math.abs(g.cx - cx) > 1e-6 || Math.abs(g.cy - cy) > 1e-6) continue;
    ok = true;
    for (const h of [5, 40, 100, 150]) {
      const s2 = s.cloner();
      rayon(s2, 100, cy + h, 0);
      const t = s2.tracer(), sg = t.segments[1];
      const xAxe = sg.a1x + (cy - sg.a1y) * (sg.a2x - sg.a1x) / (sg.a2y - sg.a1y);
      const alpha = Math.asin(h / R);
      proche(xAxe, cx + R / (2 * Math.cos(alpha)), 1e-9, 'h = ' + h + ' : intersection avec l’axe');
    }
  }
  controle(ok, 'centre du miroir conforme (création à partir de la corde et du rayon)');
}

titre('Miroir parabolique (conique e = 1) : stigmatisme rigoureux au foyer, tolérance 1e-7');
{
  const s = scene();
  // foyer (600,500), axe vers -x (theta0 = π), paramètre 200 : sommet en (500,500)
  ajouter(s, 'miroirconique', { fx: 600, fy: 500, excentricite: 1, parametre: 200, theta0: PI, theta1: PI - 1.2, theta2: PI + 1.2,
    couleur: 0, couleuraxe: C.clBlue, hachures: true, axefocal: true, concave: true });
  for (const h of [-120, -60, 10, 90, 120]) rayon(s, 950, 500 + h, PI);
  const t = s.tracer();
  const refl = t.segments.filter((sg, i) => i % 2 === 1);
  let dmax = 0; refl.forEach((sg) => { dmax = Math.max(dmax, distDroite(600, 500, sg)); });
  controle(refl.length === 5 && dmax < 1e-7, 'rayons parallèles à l’axe réfléchis par le foyer', 'écart max ' + dmax);
}
titre('Miroir elliptique : d’un foyer à l’autre, tolérance 1e-7');
{
  const s = scene();
  // Ellipse de grand axe 2a = 600, centre (500, 500), foyers F1 = (500 - c, 500) et F2 = (500 + c, 500).
  // Vu de F1, le sommet le plus proche est dans la direction theta0 = π, à la distance p/(1 + e) = a − c.
  const e = 0.5, a = 300, c = a * e, b2 = a * a - c * c, p = b2 / a;
  ajouter(s, 'miroirconique', { fx: 500 - c, fy: 500, excentricite: e, parametre: p, theta0: PI, theta1: PI - 1.5, theta2: PI + 1.5,
    couleur: 0, couleuraxe: C.clBlue, hachures: false, axefocal: false, concave: true });
  ajouter(s, 'sourceponctuelle', { nombrederayon: 7, sx: 500 - c, sy: 500, a1x: 500 - c - 100, a1y: 600, a2x: 500 - c - 100, a2y: 400,
    couleur: C.clRed, epaisseur: 1, maxenfantparrayon: 0, vav: '', vaa: '', sourcevirtuelle: false, tracersurfacesonde: false, listechemins: '', maxsegment: 2 });
  const t = s.tracer();
  const fx2 = 500 + c;
  const refl = t.segments.filter((sg, i) => i % 2 === 1);
  let dmax = 0; refl.forEach((sg) => { dmax = Math.max(dmax, distDroite(fx2, 500, sg)); });
  controle(refl.length === 7 && dmax < 1e-7, 'rayons issus d’un foyer passant par l’autre (' + fx2 + ', 500)', 'écart max ' + dmax);
}

/* ------------------------------------------------------------------ */
titre('Prisme : déviation minimale D = 2 asin(n sin(A/2)) − A, tolérance 1e-9 rad');
{
  const n = 1.5, A = 60 * deg, cote = 300;
  const ax = 500, ay = 700, h = cote * Math.sqrt(3) / 2;
  const B = [ax - cote / 2, ay - h], gx = ax, gy = ay - 2 * h / 3;
  const Dm = 2 * Math.asin(n * Math.sin(A / 2)) - A;
  function deviation(i) {
    const s = scene();
    ajouter(s, 'prisme', { gx, gy, ax, ay, bx: B[0], by: B[1], indicerouge: n, indicevert: n, indicebleu: n,
      couleurbord: 0, couleurfond: C.clAqua, reflechientrant: 2, reflechisortant: 4 });
    const dir = -30 * deg + i, mx = (ax + B[0]) / 2, my = (ay + B[1]) / 2;
    rayon(s, mx - 200 * Math.cos(dir), my - 200 * Math.sin(dir), dir);
    const t = s.tracer();
    return { D: normAngle(angleSeg(t.segments[0]) - angleSeg(t.segments[2])), interieur: angleSeg(t.segments[1]), n: t.segments.length };
  }
  const iMin = (A + Dm) / 2, r = deviation(iMin);
  controle(r.n === 3, 'trois segments');
  proche(r.D, Dm, 1e-9, 'déviation à l’incidence symétrique i = ' + (iMin / deg).toFixed(3) + '°');
  proche(r.interieur, 0, 1e-9, 'trajet intérieur parallèle à la base');
  controle(deviation(iMin - 2 * deg).D > Dm && deviation(iMin + 2 * deg).D > Dm, 'la déviation est plus grande de part et d’autre');
}

/* ------------------------------------------------------------------ */
titre('Réseaux : sin θk − sin θ0 = k λ / a (transmission), sin θk + sin θ0 = k λ / a (réflexion) ; tolérance 1e-9 rad');
{
  const lambda = { [C.clRed]: 632e-9, [C.clGreen]: 520e-9, [C.clBlue]: 450e-9 };
  for (const coul of [C.clRed, C.clGreen, C.clBlue]) for (const th0 of [0, 10 * deg, -20 * deg]) {
    const s = scene();
    ajouter(s, 'reseau', { a1x: 500, a1y: 50, a2x: 500, a2y: 950, epaisseur: 1, couleur: C.clBlue, pas: 1e-6, entransmission: true,
      hachures: false, ordre_min: -2, ordre_max: 2 });
    rayon(s, 500 - 300 * Math.cos(th0), 500 - 300 * Math.sin(th0), th0, coul);
    const t = s.tracer();
    const enfants = t.segments.slice(2);   // segment 1 : incident ; 2 : ordre 0 ; puis les ordres non nuls
    const attendus = [];
    for (let k = -2; k <= 2; k++) if (k !== 0 && Math.abs(Math.sin(th0) + k * lambda[coul] / 1e-6) < 1) attendus.push(Math.asin(Math.sin(th0) + k * lambda[coul] / 1e-6));
    controle(enfants.length === attendus.length, 'nombre d’ordres (λ = ' + lambda[coul] * 1e9 + ' nm, θ0 = ' + (th0 / deg) + '°)', enfants.length + ' / ' + attendus.length);
    proche(angleSeg(t.segments[1]), th0, 1e-9, 'ordre 0 non dévié');
    enfants.forEach((sg, j) => proche(angleSeg(sg), attendus[j], 1e-9, 'ordre n° ' + (j + 1) + ', λ = ' + lambda[coul] * 1e9 + ' nm, θ0 = ' + (th0 / deg) + '°'));
  }
  // réflexion
  const s = scene();
  ajouter(s, 'reseau', { a1x: 500, a1y: 50, a2x: 500, a2y: 950, epaisseur: 1, couleur: C.clBlue, pas: 1e-6, entransmission: false,
    hachures: true, ordre_min: -1, ordre_max: 1 });
  const th0 = 15 * deg;
  rayon(s, 500 - 300 * Math.cos(th0), 500 - 300 * Math.sin(th0), th0);
  const t = s.tracer();
  // normale côté incident : direction -x ; angle mesuré depuis -x dans le sens direct
  const mesure = (sg) => normAngle(angleSeg(sg) - PI);
  proche(mesure(t.segments[1]), -th0, 1e-9, 'réflexion : ordre 0 spéculaire');
  const kl = 632e-9 / 1e-6;
  const obtenus = t.segments.slice(2).map(mesure).sort((a, b) => a - b);
  const att = [-1, 1].map((k) => Math.asin(-Math.sin(th0) + k * kl)).filter((x) => !isNaN(x)).sort((a, b) => a - b);
  controle(obtenus.length === att.length, 'réflexion : nombre d’ordres', obtenus.length);
  obtenus.forEach((x, j) => proche(x, att[j], 1e-9, 'réflexion : ordre ' + (j + 1)));
}

/* ------------------------------------------------------------------ */
titre('Dispersion : lumière blanche décomposée, chaque couleur suit Snell avec son indice ; tolérance 1e-9 rad');
{
  const s = scene();
  bloc(s, 500, 100, 800, 900, 1.5, { indicerouge: 1.50, indicevert: 1.55, indicebleu: 1.62 });
  rayon(s, 100, 300, 40 * deg, C.clBlack);
  const t = s.tracer();
  controle(t.segments.length === 9, 'trois rayons (rouge, vert, bleu) de trois segments', t.segments.length);
  const n = { [C.clRed]: 1.50, [C.clGreen]: 1.55, [C.clBlue]: 1.62 };
  [C.clRed, C.clGreen, C.clBlue].forEach((c) => {
    const segs = t.segments.filter((sg) => sg.couleur === c);
    proche(angleSeg(segs[1]), Math.asin(Math.sin(40 * deg) / n[c]), 1e-9, 'couleur ' + c + ' : angle réfracté');
  });
  // sans milieu dispersif ni réseau, la lumière blanche n'est pas décomposée
  const s2 = scene(); bloc(s2, 500, 100, 800, 900, 1.5); rayon(s2, 100, 300, 40 * deg, C.clBlack);
  controle(s2.tracer().segments.length === 3, 'milieu non dispersif : un seul rayon noir');
}

/* ------------------------------------------------------------------ */
titre('Source ponctuelle et onde plane : nombre et direction des rayons, tolérance 1e-12');
{
  const s = scene();
  ajouter(s, 'sourceponctuelle', { nombrederayon: 7, sx: 200, sy: 500, a1x: 400, a1y: 300, a2x: 400, a2y: 700, couleur: C.clRed, epaisseur: 1,
    maxenfantparrayon: 0, vav: '', vaa: '', sourcevirtuelle: false, tracersurfacesonde: false, listechemins: '', maxsegment: 500 });
  const t = s.tracer();
  controle(t.segments.length === 7, 'sept rayons', t.segments.length);
  t.segments.forEach((sg, i) => {
    proche(Math.hypot(sg.a1x - 200, sg.a1y - 500), 0, 1e-12, 'rayon ' + (i + 1) + ' issu de la source');
    proche(angleSeg(sg), -45 * deg + i * 15 * deg, 1e-12, 'rayon ' + (i + 1) + ' : direction');
  });
  const sv = scene();
  ajouter(sv, 'sourceponctuelle', { nombrederayon: 5, sx: 600, sy: 500, a1x: 400, a1y: 300, a2x: 400, a2y: 700, couleur: C.clRed, epaisseur: 1,
    maxenfantparrayon: 0, vav: '', vaa: '', sourcevirtuelle: true, tracersurfacesonde: false, listechemins: '', maxsegment: 500 });
  const tv = sv.tracer();
  controle(tv.segments.length === 5, 'source virtuelle : cinq rayons');
  tv.segments.forEach((sg, i) => {
    proche(distDroite(600, 500, sg), 0, 1e-9, 'source virtuelle : rayon ' + (i + 1) + ' dirigé vers S');
    controle((600 - sg.a1x) * (sg.a2x - sg.a1x) + (500 - sg.a1y) * (sg.a2y - sg.a1y) > 0, 'source virtuelle : rayon ' + (i + 1) + ' convergent');
  });
  const so = scene();
  ajouter(so, 'ondeplane', { nombrederayon: 5, sx: 300, sy: 300, a1x: 200, a1y: 300, a2x: 200, a2y: 700, couleur: C.clRed, epaisseur: 1,
    maxenfantparrayon: 0, vav: '', vaa: '', tracersurfacesonde: false, listechemins: '', maxsegment: 500 });
  const to = so.tracer();
  controle(to.segments.length === 5, 'onde plane : cinq rayons');
  to.segments.forEach((sg, i) => {
    proche(angleSeg(sg), 0, 1e-12, 'onde plane : rayon ' + (i + 1) + ' parallèle à la direction');
    proche(sg.a1y, 300 + 100 * i, 1e-9, 'onde plane : rayon ' + (i + 1) + ' régulièrement espacé');
  });
}

/* ------------------------------------------------------------------ */
titre('Chemin optique et surfaces d’onde : n1·d1 + n2·d2 = L (minimum de Fermat calculé à part), tolérance 1e-6');
{
  const L = 420, n2 = 1.5;
  const s = scene();
  bloc(s, 450, 50, 950, 950, n2);
  ajouter(s, 'sourceponctuelle', { nombrederayon: 2, sx: 200, sy: 500, a1x: 400, a1y: 300, a2x: 400, a2y: 700, couleur: C.clRed, epaisseur: 1,
    maxenfantparrayon: 0, vav: '', vaa: '', sourcevirtuelle: false, tracersurfacesonde: true, listechemins: String(L), maxsegment: 500 });
  const t = s.tracer();
  controle(t.surfacesOnde.length === 19, '20 points de surface d’onde (option par défaut), 19 segments', t.surfacesOnde.length);
  // chemin optique minimal de S à P (Fermat) par section dorée sur la face x = 450
  function cheminMin(px, py) {
    let a = -2000, b = 3000;
    const f = (y) => Math.hypot(450 - 200, y - 500) + n2 * Math.hypot(px - 450, py - y);
    for (let k = 0; k < 200; k++) {
      const c = b - (b - a) * 0.618033988749895, d = a + (b - a) * 0.618033988749895;
      if (f(c) < f(d)) b = d; else a = c;
    }
    return f((a + b) / 2);
  }
  let emax = 0;
  t.surfacesOnde.forEach((w) => [[w.a1x, w.a1y], [w.a2x, w.a2y]].forEach(([x, y]) => {
    const l = x <= 450 ? Math.hypot(x - 200, y - 500) : cheminMin(x, y);
    emax = Math.max(emax, Math.abs(l - L));
  }));
  controle(emax < 1e-6, 'tous les points de la surface d’onde sont au chemin optique L = ' + L, 'écart max ' + emax);
}

/* ------------------------------------------------------------------ */
titre('Lame semi-réfléchissante, écran, diaphragme, œil, sphère');
{
  const s = scene();
  ajouter(s, 'lsr', { a1x: 300, a1y: 300, a2x: 700, a2y: 700, epaisseur: 1, couleur: 0 });
  rayon(s, 100, 500, 0);
  const t = s.tracer();
  controle(t.segments.length === 3, 'lame : rayon réfléchi + rayon transmis (enfant)', t.segments.length);
  proche(angleSeg(t.segments[1]), PI / 2, 1e-12, 'lame à 45° : réflexion vers le haut');
  proche(angleSeg(t.segments[2]), 0, 1e-12, 'lame : transmission sans déviation');

  const s2 = scene();
  ajouter(s2, 'ecran', { a1x: 600, a1y: 100, a2x: 600, a2y: 900, epaisseur: 2, couleur: 0 });
  rayon(s2, 100, 500, 0.2);
  const t2 = s2.tracer();
  controle(t2.segments.length === 1 && Math.abs(t2.segments[0].a2x - 600) < 1e-9, 'écran : le rayon s’arrête sur l’écran');

  const s3 = scene();
  ajouter(s3, 'diaphragme', { cx: 500, cy: 500, anglepolaire: PI / 2, rint: 50, rext: 300, epaisseur: 1, couleur: 0 });
  rayon(s3, 100, 520, 0); rayon(s3, 100, 600, 0); rayon(s3, 100, 420, 0);
  const t3 = s3.tracer();
  controle(t3.segments.length === 3, 'diaphragme : un segment par rayon');
  proche(t3.segments[0].a2x, 1000, 1e-9, 'diaphragme : le rayon à 20 du centre passe');
  proche(t3.segments[1].a2x, 500, 1e-9, 'diaphragme : le rayon à 100 du centre est arrêté');
  proche(t3.segments[2].a2x, 500, 1e-9, 'diaphragme : le rayon à −80 du centre est arrêté');

  const s4 = scene();
  ajouter(s4, 'oeil', { cx: 700, cy: 500, ax: 600, ay: 500, epaisseur: 1, couleur: C.clGreen });
  rayon(s4, 100, 500, 0);
  const t4 = s4.tracer();
  controle(t4.segments.length === 1 && t4.segments[0].a2x < 700, 'œil : le rayon est absorbé');

  // Sphère : réfraction à l'entrée calculée indépendamment (angle d'incidence par rapport à la normale)
  const s5 = scene(), R = 200, n = 1.5, h = 80;
  ajouter(s5, 'sphere', { cx: 500, cy: 500, rayon: R, indicerouge: n, indicevert: n, indicebleu: n, couleurbord: 0, couleurfond: C.clAqua,
    reflechientrant: 2, reflechisortant: 4 });
  rayon(s5, 100, 500 + h, 0);
  const t5 = s5.tracer();
  const i1 = Math.asin(h / R), r1 = Math.asin(Math.sin(i1) / n);
  // normale entrante au point d'incidence : direction de I vers le centre ; angle -(i1) au-dessus de l'axe
  proche(angleSeg(t5.segments[1]), -(i1 - r1), 1e-9, 'sphère : déviation à l’entrée i1 − r1');
  proche(angleSeg(t5.segments[2]), -2 * (i1 - r1), 1e-9, 'sphère : déviation totale 2(i1 − r1)');
}

/* ------------------------------------------------------------------ */
titre('Prolongements virtuels et segments fantômes');
{
  const s = scene({ fantomespresents: true, listefantomes: '(2)' });
  bloc(s, 500, 100, 800, 900, 1.5);
  rayon(s, 100, 500, 0.3, C.clRed, { vav: '(1)', vaa: '(3)' });
  const t = s.tracer();
  controle(t.segments[0].virtuelavant && !t.segments[0].virtuelarriere, 'vav (1) : prolongement avant du segment 1');
  controle(t.segments[2].virtuelarriere && !t.segments[2].virtuelavant, 'vaa (3) : prolongement arrière du segment 3');
  controle(t.segments[1].fantome && !t.segments[0].fantome, 'segment 2 fantôme');
}

console.log('\nPhysique : ' + reussis + ' contrôles réussis, ' + echecs + ' échoués.');
process.exit(echecs ? 1 : 0);
