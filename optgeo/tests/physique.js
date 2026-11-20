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

/* Outils vectoriels pour les calculs indépendants ci-dessous */
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, k) => [a[0] * k, a[1] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1], rot: (a, t) => [a[0] * Math.cos(t) - a[1] * Math.sin(t), a[0] * Math.sin(t) + a[1] * Math.cos(t)],
  unit: (a) => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; }
};
/** Snell-Descartes vectoriel : d unitaire, m normale unitaire tournée vers le rayon incident ; null si réflexion totale. */
function snellVec(d, m, n1, n2) {
  const c = -V.dot(d, m), r = n1 / n2, k = 1 - r * r * (1 - c * c);
  return k < 0 ? null : V.unit(V.add(V.mul(d, r), V.mul(m, r * c - Math.sqrt(k))));
}
const reflechiVec = (d, u) => V.sub(d, V.mul(u, 2 * V.dot(d, u)));
/**
 * Tracé indépendant dans un polygone convexe d'indice n (air autour), réflexion « jamais » :
 * points d'impact successifs et direction finale, ou arrêt sur une réflexion totale.
 */
function traverserPolygone(S, n, P, d) {
  const g = [S.reduce((a, p) => a + p[0], 0) / S.length, S.reduce((a, p) => a + p[1], 0) / S.length];
  const pts = [P];
  for (let k = 0; k < 10; k++) {
    let best = null;
    S.forEach((A, i) => {
      const B = S[(i + 1) % S.length], e = V.sub(B, A), den = d[0] * e[1] - d[1] * e[0];
      if (den === 0) return;
      const w = V.sub(A, P), t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den;
      if (t > 1e-9 && u >= 0 && u <= 1 && (!best || t < best.t)) best = { t, A, B };
    });
    if (!best) return { pts, d, arret: false };
    const I = V.add(P, V.mul(d, best.t)), e = V.unit(V.sub(best.B, best.A));
    let nOut = [e[1], -e[0]];
    if (V.dot(nOut, V.sub(V.mul(V.add(best.A, best.B), 0.5), g)) < 0) nOut = V.mul(nOut, -1);
    const entre = V.dot(d, nOut) < 0;
    const d2 = snellVec(d, entre ? nOut : V.mul(nOut, -1), entre ? 1 : n, entre ? n : 1);
    pts.push(I);
    if (!d2) return { pts, d, arret: true };
    P = I; d = d2;
  }
  return { pts, d, arret: false };
}
/** Compare le tracé du moteur (segments d'un seul rayon) au tracé indépendant ; renvoie l'écart max ou un message. */
function ecartTrace(segs, att) {
  const attendu = att.arret ? att.pts.length - 1 : att.pts.length;
  if (segs.length !== attendu) return 'segments : ' + segs.length + ' au lieu de ' + attendu;
  let e = 0;
  for (let i = 1; i < att.pts.length; i++) e = Math.max(e, Math.hypot(segs[i - 1].a2x - att.pts[i][0], segs[i - 1].a2y - att.pts[i][1]));
  if (!att.arret) e = Math.max(e, Math.abs(normAngle(angleSeg(segs[segs.length - 1]) - Math.atan2(att.d[1], att.d[0]))) * 1000);
  return e;
}

/* ------------------------------------------------------------------ */
titre('Prisme tourné de 0 à 360° (pas de 0,25°) : rayons visant le milieu de chaque face, Snell calculé à part sur chaque face ; tolérance 1e-9');
{
  // Défaut de l'original corrigé (unit222.pas:39554) : normale du côté 3 fausse de 69° à 158° environ.
  const n = 1.5, G = [500, 500], A0 = [500, 600], B0 = [500 - 100 * Math.sin(60 * deg) * 1.0, 450];
  const fautes = [];
  let nb = 0, pire = 0;
  for (let q = 0; q < 1440; q++) {
    const a = q * 0.25 * deg;
    const A = V.add(G, V.rot(V.sub(A0, G), a)), B = V.add(G, V.rot(V.sub(B0, G), a));
    const H = V.sub(G, V.mul(V.sub(A, G), 0.5)), Cc = V.sub(V.mul(H, 2), B), S = [A, B, Cc];
    for (let f = 0; f < 3; f++) for (const inc of [-35 * deg, 25 * deg]) {
      const P1 = S[f], P2 = S[(f + 1) % 3], M = V.mul(V.add(P1, P2), 0.5), e = V.unit(V.sub(P2, P1));
      let nIn = [e[1], -e[0]]; if (V.dot(nIn, V.sub(G, M)) < 0) nIn = V.mul(nIn, -1);
      const d = V.rot(nIn, inc), P = V.sub(M, V.mul(d, 300));
      const s = scene();
      ajouter(s, 'prisme', { gx: G[0], gy: G[1], ax: A[0], ay: A[1], bx: B[0], by: B[1], indicerouge: n, indicevert: n, indicebleu: n,
        couleurbord: 0, couleurfond: C.clAqua, reflechientrant: 2, reflechisortant: 2 });
      rayon(s, P[0], P[1], Math.atan2(d[1], d[0]), C.clRed, { nombremaxenfant: 0 });
      const r = ecartTrace(s.tracer().segments, traverserPolygone(S, n, P, d));
      nb++;
      if (typeof r === 'string' || r > 1e-9) { if (fautes.length < 5) fautes.push((q * 0.25) + '° face ' + (f + 1) + ' : ' + r); fautes.n = (fautes.n || 0) + 1; }
      else pire = Math.max(pire, r);
    }
  }
  controle(fautes.length === 0, nb + ' rayons : impacts et direction émergente conformes au calcul indépendant (écart max ' + pire.toExponential(1) + ')',
    (fautes.n || 0) + ' écarts, dont ' + fautes.join(' ; '));
}

/* ------------------------------------------------------------------ */
titre('Prisme neuf (n rouge 1,4 ; vert 1,6 ; bleu 1,8) et lumière blanche : chaque couleur suit Snell, tolérance 1e-9');
{
  const s = scene();
  const p = OptGeo.objetParDefaut(s, 'prisme', 500, 500);
  ajouter(s, 'prisme', p);
  const g = s.geometrie(s.objets[0].id), S = [1, 2, 3].map((i) => [g.messommets[i].ax, g.messommets[i].ay]);
  const M = V.mul(V.add(S[0], S[1]), 0.5), d = V.unit([Math.cos(30 * deg), Math.sin(30 * deg)]), P = V.sub(M, V.mul(d, 200));
  rayon(s, P[0], P[1], 30 * deg, C.clBlack, { nombremaxenfant: 0 });
  const t = s.tracer().segments, dirs = {};
  [[C.clRed, 1.4], [C.clGreen, 1.6], [C.clBlue, 1.8]].forEach(([c, n]) => {
    const segs = t.filter((sg) => sg.couleur === c), att = traverserPolygone(S, n, P, d), r = ecartTrace(segs, att);
    controle(typeof r === 'number' && r <= 1e-9 && !att.arret, 'couleur ' + c + ' (n = ' + n + ') : trajet conforme au calcul indépendant', r);
    dirs[c] = Math.atan2(att.d[1], att.d[0]);
  });
  controle(Math.abs(dirs[C.clRed] - dirs[C.clBlue]) > 10 * deg, 'les couleurs sont séparées (rouge et bleu à plus de 10°)',
    (dirs[C.clRed] - dirs[C.clBlue]) / deg);
}

/* ------------------------------------------------------------------ */
titre('Réglages « rayon réfléchi (sens entrant / sortant) » : lentille épaisse, arc et côté droit de polycercle, sphère, polyèdre ; tolérance 1e-9');
{
  // Défaut de l'original corrigé (lentille épaisse et arcs de polycercle : réglages inversés).
  // Réflexion totale d'un rayon qui sort : seul « sortant » compte (1 toujours, 4 si pas réfracté : réfléchi ;
  // 2 jamais, 3 si réfracté : le rayon s'arrête). Rayon qui entre (réfracté) : seul « entrant » compte
  // (1 toujours, 3 si réfracté : rayon réfléchi enfant ; 2, 4 : rien).
  const n = 1.5, diag = Math.hypot(1000, 1000);
  const cas = [];
  // lentille épaisse biconvexe : face 2 de centre (230, 500), R = 300
  cas.push({ nom: 'lentille épaisse (face 2)', type: 'lec', p: { s1x: 470, s1y: 500, s2x: 530, s2y: 500, r1: -300, r2: 300, diametre: 200,
    couleurfond: C.clAqua, couleuraxe: C.clRed, axefocal: true }, c: [230, 500], R: 300, phi: 10 * deg,
    dedans: (P) => Math.hypot(P[0] - 770, P[1] - 500) < 300 && Math.hypot(P[0] - 230, P[1] - 500) < 300 && Math.abs(P[1] - 500) < 100 });
  // lentille épaisse : face 1 de centre (770, 500)
  cas.push({ nom: 'lentille épaisse (face 1)', type: 'lec', p: cas[0].p, c: [770, 500], R: 300, phi: (180 - 8) * deg, dedans: cas[0].dedans });
  // polycercle en D : arc de centre (cx, 500)
  const cx = (560 * 560 - 450 * 450 - 150 * 150) / (2 * (560 - 450));
  const D = { sommets: [{ x: 450, y: 350 }, { x: 450, y: 650 }], mess: [{ x: 450, y: 500 }, { x: 560, y: 500 }], rectiligne: [true, false] };
  const dansD = (P) => P[0] > 450 && Math.hypot(P[0] - cx, P[1] - 500) < 560 - cx;
  cas.push({ nom: 'arc de polycercle', type: 'polycercle', p: D, c: [cx, 500], R: 560 - cx, phi: 25 * deg, dedans: dansD });
  // côtés droits et autres milieux (même convention, déjà juste dans l'original) : normale u sortante en I
  cas.push({ nom: 'côté droit de polycercle', type: 'polycercle', p: D, I: [450, 520], u: [-1, 0], dedans: dansD });
  cas.push({ nom: 'polyèdre', type: 'polyhedre', p: { sommets: [{ x: 400, y: 400 }, { x: 600, y: 400 }, { x: 600, y: 600 }, { x: 400, y: 600 }] },
    I: [600, 470], u: [1, 0], dedans: (P) => P[0] > 400 && P[0] < 600 && P[1] > 400 && P[1] < 600 });
  cas.push({ nom: 'sphère', type: 'sphere', p: { cx: 500, cy: 500, rayon: 150 }, c: [500, 500], R: 150, phi: 40 * deg,
    dedans: (P) => Math.hypot(P[0] - 500, P[1] - 500) < 150 });
  cas.forEach((k) => {
    const I = k.I || V.add(k.c, [k.R * Math.cos(k.phi), k.R * Math.sin(k.phi)]);
    const u = k.u || V.unit(V.sub(I, k.c));   // normale sortante (milieux convexes ici)
    const tracer = (ent, sor, P, d, enfants) => {
      const s = scene();
      ajouter(s, k.type, Object.assign({}, k.p, { indicerouge: n, indicevert: n, indicebleu: n, reflechientrant: ent, reflechisortant: sor }));
      rayon(s, P[0], P[1], Math.atan2(d[1], d[0]), C.clRed, { nombremaxenfant: enfants });
      return s.tracer().segments;
    };
    // 1) réflexion totale d'un rayon qui sort (incidence 55° > angle limite 41,8°)
    const d = V.rot(u, 55 * deg), P = V.sub(I, V.mul(d, 30)), r = reflechiVec(d, u);
    controle(k.dedans(P), k.nom + ' : départ à l’intérieur');
    for (let ent = 1; ent <= 4; ent++) for (let sor = 1; sor <= 4; sor++) {
      const t = tracer(ent, sor, P, d, 0), attenduRefl = (sor === 1 || sor === 4);
      const impact = t.length >= 1 && Math.hypot(t[0].a2x - I[0], t[0].a2y - I[1]) < 1e-9;
      const ok = attenduRefl
        ? impact && t.length >= 2 && Math.hypot(t[1].a1x - I[0], t[1].a1y - I[1]) < 1e-9 && Math.abs(normAngle(angleSeg(t[1]) - Math.atan2(r[1], r[0]))) < 1e-9
        : impact && t.length === 1;
      controle(ok, k.nom + ', réflexion totale, entrant ' + ent + ' sortant ' + sor + ' : ' + (attenduRefl ? 'rayon réfléchi' : 'rayon arrêté'),
        t.slice(0, 2).map((sg) => [sg.a1x, sg.a1y, sg.a2x, sg.a2y].map((v) => v.toFixed(3)).join(',')).join(' | '));
    }
    // 2) rayon qui entre (incidence 30°) : réfléchi partiel = rayon enfant
    const d2 = V.rot(V.mul(u, -1), 30 * deg), P2 = V.sub(I, V.mul(d2, 200)), r2 = reflechiVec(d2, u);
    controle(!k.dedans(P2), k.nom + ' : départ à l’extérieur');
    for (let ent = 1; ent <= 4; ent++) for (let sor = 1; sor <= 4; sor++) {
      const t = tracer(ent, sor, P2, d2, 3), attenduEnfant = (ent === 1 || ent === 3);
      const enfant = t.some((sg) => Math.hypot(sg.a1x - I[0], sg.a1y - I[1]) < diag / 5000 && Math.abs(normAngle(angleSeg(sg) - Math.atan2(r2[1], r2[0]))) < 1e-9);
      controle(Math.hypot(t[0].a2x - I[0], t[0].a2y - I[1]) < 1e-9 && enfant === attenduEnfant,
        k.nom + ', rayon entrant, entrant ' + ent + ' sortant ' + sor + ' : ' + (attenduEnfant ? 'rayon réfléchi enfant' : 'pas de réfléchi'));
    }
  });
}

console.log('\nPhysique : ' + reussis + ' contrôles réussis, ' + echecs + ' échoués.');
process.exit(echecs ? 1 : 0);
