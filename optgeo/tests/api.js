/*
 * Tests de l'API du moteur (édition, groupes, annuler/rétablir, interaction,
 * écriture/lecture .opt de tous les types d'objets, encodages).
 *   node optgeo/tests/api.js
 */
'use strict';
const { charger } = require('./charger-moteur.js');
const OptGeo = charger();
const C = OptGeo.couleurs, PI = Math.PI;

let reussis = 0, echecs = 0;
function controle(ok, message, detail) {
  if (ok) reussis++;
  else { echecs++; console.log('  ÉCHEC : ' + message + (detail !== undefined ? ' (' + detail + ')' : '')); }
}
function proche(a, b, tol) { return Math.abs(a - b) <= (tol || 1e-9); }

/* Une scène qui contient un objet de chaque type (26 types) */
function sceneComplete() {
  const s = new OptGeo.Scene({ xxmin: -100, xxmax: 1100, yymin: -50, yymax: 850, tracergrille: true, optionangles: true,
    fantomespresents: true, listefantomes: '(2,5)', afficher_longueurs_segments: true, couleurfondsimulation: 0xF0F0F0,
    indice_rouge_par_defaut: 1.0003, longueur_donde_red: 650e-9 });
  const R = (type, p) => { const r = s.ajouter(type, p); controle(r.ok, 'ajout ' + type, r.erreur); return r.id; };
  const ids = {};
  ids.miroirplan = R('miroirplan', { a1x: 950, a1y: 100, a2x: 1000, a2y: 300, epaisseur: 2, couleur: C.clBlack, hachures: true });
  ids.reseau = R('reseau', { a1x: -50, a1y: 700, a2x: -20, a2y: 800, epaisseur: 1, couleur: C.clBlue, pas: 2e-6, entransmission: true, hachures: false, ordre_min: 2, ordre_max: -2 });
  ids.mscopa = R('mscopa', { a1x: 900, a1y: 400, a2x: 900, a2y: 600, focale: 80, trou: true, diametretrou: 30 });
  ids.mscepa = R('mscepa', { a1x: 850, a1y: 650, a2x: 850, a2y: 780, focale: 60 });
  ids.mscore = R('mscore', { a1x: 800, a1y: 50, a2x: 820, a2y: 200, rayoncourbure: 300, aigu: true, trou: false, diametretrou: 0 });
  ids.mscere = R('mscere', { a1x: 700, a1y: 50, a2x: 720, a2y: 200, rayoncourbure: 250, aigu: true, trou: true, diametretrou: 0.1 });
  ids.lmc = R('lmc', { a1x: 300, a1y: 300, a2x: 300, a2y: 600, focale: 150 });
  ids.lmd = R('lmd', { a1x: 400, a1y: 600, a2x: 400, a2y: 750, focale: -90 });
  ids.rayon = R('rayon', { ax: 0, ay: 450, kx: 50, ky: 3, couleur: C.clRed, epaisseur: 1, nombremaxenfant: 4, vav: '(2)', vaa: '', maxsegment: 50 });
  ids.sourceponctuelle = R('sourceponctuelle', { nombrederayon: 4, sx: 50, sy: 200, a1x: 120, a1y: 150, a2x: 120, a2y: 250, couleur: C.clGreen,
    epaisseur: 1, maxenfantparrayon: 3, vav: '', vaa: '(1,3)', sourcevirtuelle: false, tracersurfacesonde: true, listechemins: '100 200', maxsegment: 20 });
  ids.ondeplane = R('ondeplane', { nombrederayon: 3, sx: 100, sy: 50, a1x: 30, a1y: 20, a2x: 30, a2y: 100, couleur: C.clBlue, epaisseur: 2,
    maxenfantparrayon: 0, vav: '', vaa: '', tracersurfacesonde: false, listechemins: '', maxsegment: 10 });
  ids.ecran = R('ecran', { a1x: 1050, a1y: 0, a2x: 1050, a2y: 800, epaisseur: 3, couleur: C.clGray });
  ids.diaphragme = R('diaphragme', { cx: 200, cy: 450, anglepolaire: PI / 2, rint: 40, rext: 150, epaisseur: 1, couleur: C.clBlack });
  ids.lsr = R('lsr', { a1x: 600, a1y: 700, a2x: 650, a2y: 780, epaisseur: 1, couleur: C.clBlack });
  ids.polyhedre = R('polyhedre', { sommets: [{ x: 500, y: 300 }, { x: 600, y: 300 }, { x: 600, y: 400 }, { x: 520, y: 420 }], indicerouge: 1.5, indicebleu: 1.6, indicevert: 1.55, reflechientrant: 1, reflechisortant: 3 });
  ids.prisme = R('prisme', { gx: 150, gy: 700, ax: 150, ay: 780, bx: 100, by: 650 });
  ids.polycercle = R('polycercle', { sommets: [{ x: 450, y: 100 }, { x: 600, y: 100 }, { x: 600, y: 200 }], mess: [{ x: 525, y: 80 }, { x: 600, y: 150 }, { x: 0, y: 0 }], rectiligne: [false, true, true] });
  ids.sphere = R('sphere', { cx: 700, cy: 500, rayon: 60, indicerouge: 1.33, indicebleu: 1.34, indicevert: 1.335 });
  ids.miroirconique = R('miroirconique', { fx: 250, fy: 100, excentricite: 0.6, parametre: 80, theta0: 0.3, theta1: -0.5, theta2: 1.0 });
  ids.texte = R('texte', { texte: 'Lentille épaisse — n=1,5 « test »', x: 10, y: 830, policesize: 12, policefsbold: true });
  ids.lec = R('lec', { s1x: 480, s1y: 520, s2x: 520, s2y: 520, r1: 120, r2: -150, diametre: 100 });
  ids.angle = R('angle', { cx: 900, cy: 800, a1x: 950, a1y: 800, a2x: 900, a2y: 840 });
  ids.fleche = R('fleche', { a1x: 10, a1y: 10, a2x: 100, a2y: 30, ext1: 'trond', ext2: 'tffleche', styletrait: 'psdash', taille1: 8, taille2: 12 });
  ids.oeil = R('oeil', { cx: 1000, cy: 600, ax: 970, ay: 600 });
  ids.metre = R('metre', { a1x: 0, a1y: -20, a2x: 300, a2y: -20 });
  ids.jolipoint = R('jolipoint', { a1x: 500, a1y: 800, taille: 8, epaisseur: 2, couleur: C.clRed, style: 'tptriangleplein' });
  s.grouper([ids.lmc, ids.lmd, ids.texte]);
  s.grouper([ids.prisme]);
  return { s, ids };
}

/* ---------------- Tous les types : écriture, relecture, retracé ---------------- */
{
  const { s, ids } = sceneComplete();
  controle(Object.keys(ids).length === 26 && OptGeo.ordreTypes.length === 26, '26 types d’objets');
  const t = s.tracer();
  controle(t.segments.length > 0 && !t.tronque, 'tracé de la scène complète', t.segments.length);
  const txt = OptGeo.ecrireOpt(s);
  controle(/^NE PAS MODIFIER CE FICHIER\r\nVERSION\r\n301\r\n/.test(txt), 'en-tête OptGeo 3.03 (VERSION 301, CRLF)');
  controle(txt.indexOf(' 1.0000000000000000E+0002') >= 0 || /E\+000\d/.test(txt), 'format des réels Free Pascal');
  controle(txt.indexOf('-1.0000000000000000E+0002') >= 0, 'réel négatif écrit avec le signe « - »');
  const r = OptGeo.lireOpt(txt, { strict: true });
  controle(r.avertissements.length === 0, 'relecture sans avertissement', r.avertissements.join(' | '));
  const a = s.objets.map((o) => { const c = Object.assign({}, o); delete c.id; return c; });
  const b = r.scene.objets.map((o) => { const c = Object.assign({}, o); delete c.id; return c; });
  // Égalité exacte, sauf les valeurs recalculées à chaque création (angles du miroir conique
  // ramenés dans [0, 2π[, a2 de l'onde plane) qui peuvent dériver de 1e-15 comme dans l'original.
  const diff = []; a.forEach((o, i) => { for (const k in o) if (JSON.stringify(o[k]) !== JSON.stringify(b[i][k]) &&
    !(typeof o[k] === 'number' && Math.abs(o[k] - b[i][k]) <= 1e-12 * Math.max(1, Math.abs(o[k])))) diff.push(o.type + '.' + k + ' ' + JSON.stringify(o[k]) + ' / ' + JSON.stringify(b[i][k])); });
  controle(diff.length === 0, 'mêmes objets après aller-retour (exacts, ou à 1e-12 près pour les valeurs recalculées)', diff.join(' ; '));
  controle(r.scene.groupes.length === 2 && r.scene.groupes[0].membres.length === 3, 'groupes relus');
  controle(r.scene.groupes[0].membres.map((id) => r.scene.objet(id).type).join(',') === 'lmc,lmd,texte', 'membres des groupes relus');
  const o1 = Object.assign({}, s.options), o2 = Object.assign({}, r.scene.options);
  delete o1.versionfichier; delete o2.versionfichier;
  controle(JSON.stringify(o1) === JSON.stringify(o2), 'mêmes options après aller-retour');
  const t2 = r.scene.tracer();
  controle(t2.segments.length === t.segments.length && t2.surfacesOnde.length === t.surfacesOnde.length, 'même tracé après aller-retour');
  // normalisations faites à la création (comme OptGeo)
  controle(s.objet(ids.reseau).ordre_min === -2 && s.objet(ids.reseau).ordre_max === 2, 'réseau : ordres remis dans l’ordre');
  controle(s.objet(ids.lmd).focale === 90, 'lentille divergente : focale positive');
  controle(s.objet(ids.polycercle).mess[2].x === 525 && s.objet(ids.polycercle).mess[2].y === 150, 'polycercle : point de contrôle d’un côté droit = milieu');
  // octets
  const u8 = OptGeo.versOctets(txt);
  controle(OptGeo.depuisOctets(u8) === txt, 'UTF-8 : octets -> texte -> octets');
  const l1 = OptGeo.versOctets('é « »', 'windows-1252');
  controle(l1.length === 5 && l1[0] === 0xE9 && l1[2] === 0xAB, 'Windows-1252 : é et guillemets sur un octet');
  controle(OptGeo.depuisOctets(l1) === 'é « »', 'Windows-1252 relu (repli si l’UTF-8 est invalide)');
  controle(OptGeo.formatReel(1916) === ' 1.9160000000000000E+0003' && OptGeo.formatReel(-6.32e-7) === '-6.3200000000000000E-0007' && OptGeo.formatReel(0) === ' 0.0000000000000000E+0000',
    'formatReel', OptGeo.formatReel(1916));
}

/* ---------------- Lecture permissive / stricte, anciens formats ---------------- */
{
  const ancien = ['NE PAS MODIFIER CE FICHIER', 'VERSION', '1', ' 0.0E+0000  1.0E+0003  0.0E+0000  6.0E+0002', 'TRUE',
    'Nombre de rayons:', '2', 'Numero 1', ' 1.0E+0002  3.0E+0002  1.0E+0002  0.0E+0000 255 1 3', '', '',
    'Numero 2', ' 5.0E+0003  3.0E+0002  1.0E+0002  0.0E+0000 255 1 3', '', ''].join('\r\n');
  const r = OptGeo.lireOpt(ancien);
  controle(r.scene.objets.length === 1 && r.scene.objets[0].maxsegment === 500, 'ancien format : maxsegment par défaut (500)');
  controle(r.avertissements.length === 1, 'objet hors de l’espace signalé', r.avertissements.join(' | '));
  let leve = false;
  try { OptGeo.lireOpt(ancien, { strict: true }); } catch (e) { leve = /endommagé/.test(e.message); }
  controle(leve, 'mode strict : « fichier endommagé » comme OptGeo');
}

/* ---------------- Édition ---------------- */
{
  const s = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 600 });
  const h = new OptGeo.Historique(s);
  const lm = s.ajouter('lmc', { a1x: 500, a1y: 100, a2x: 500, a2y: 500, focale: 100 }).id;
  const ra = s.ajouter('rayon', { ax: 100, ay: 350, kx: 100, ky: 0 }).id;
  h.memoriser();
  controle(s.tracer().segments.length === 2, 'rayon + lentille : 2 segments');
  controle(!s.ajouter('lmc', { a1x: 500, a1y: 100, a2x: 500, a2y: 900, focale: 100 }).ok, 'objet hors de l’espace refusé');
  controle(!s.modifier(lm, { a2y: 2000 }).ok && s.objet(lm).a2y === 500, 'modification invalide refusée sans rien changer');
  controle(s.modifier(lm, { focale: 200 }).ok && s.objet(lm).focale === 200, 'modification de la focale');
  h.memoriser();
  const d = s.dupliquer(lm, 100, 0);
  controle(d.ok && s.objet(d.id).a1x === 600 && s.objetsDuType('lmc').length === 2, 'duplication décalée');
  h.memoriser();
  controle(s.translater([lm, d.id], 10, 20).ok && s.objet(lm).a1x === 510 && s.objet(d.id).a1y === 120, 'translation de deux objets');
  controle(!s.translater([lm, d.id], 450, 0).ok && s.objet(lm).a1x === 510, 'translation refusée en bloc si un objet sortirait');
  controle(s.tourner([ra], PI / 2, 100, 350).ok && proche(s.objet(ra).kx, 0) && proche(s.objet(ra).ky, 100), 'rotation d’un rayon (vecteur tourné)');
  const gi = s.grouper([lm, d.id]);
  controle(gi === 0 && s.groupesDe(lm).length === 1, 'groupe créé');
  h.memoriser();
  s.supprimer(d.id);
  controle(s.groupes[0].membres.length === 1, 'suppression : retiré du groupe');
  h.memoriser();
  controle(h.annuler() && s.objet(d.id) !== null && s.groupes[0].membres.length === 2, 'annuler la suppression');
  controle(h.annuler() && s.groupes.length === 0, 'annuler le groupement (et la rotation)');
  controle(h.retablir() && s.groupes.length === 1, 'rétablir');
  controle(h.annuler() && h.annuler() && s.objetsDuType('lmc').length === 1 && s.objet(lm).focale === 200, 'annuler jusqu’avant la duplication');
  controle(h.annuler() && s.objet(lm).focale === 100, 'annuler la modification de focale');
  controle(h.annuler() && s.objets.length === 0, 'annuler jusqu’à la scène vide de départ');
  controle(!h.annuler(), 'rien de plus à annuler');
  controle(h.retablir() && s.objets.length === 2, 'rétablir les deux objets');
  // options : changement d'espace refusé si un objet en sortirait
  controle(!s.modifierOptions({ xxmax: 400 }).ok && s.options.xxmax === 1000, 'réduction de l’espace refusée');
  controle(s.modifierOptions({ xxmax: 1200 }).ok, 'agrandissement de l’espace accepté');
  // JSON
  const j = JSON.stringify(s.versJSON()), s2 = OptGeo.Scene.depuisJSON(j);
  controle(JSON.stringify(s2.versJSON()) === j, 'sérialisation JSON stable');
}

/* ---------------- Interaction : poignées, objet sous le point ---------------- */
{
  const s = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 600 });
  const lm = s.ajouter('lmc', { a1x: 500, a1y: 100, a2x: 500, a2y: 500, focale: 100 }).id;
  const mi = s.ajouter('miroirplan', { a1x: 800, a1y: 100, a2x: 800, a2y: 500 }).id;
  const sp = s.ajouter('sphere', { cx: 200, cy: 300, rayon: 80 }).id;
  const vue = OptGeo.creerVue(s.options, 1000, 600);
  const tol = vue.pixelsEnMonde(12);       // 12 px : doigt sur tablette
  const p = OptGeo.poignees(s, lm);
  controle(p.map((x) => x.nom).join(',') === 'a1,a2,f1,f2,centre', 'poignées d’une lentille', p.map((x) => x.nom).join(','));
  let r = OptGeo.objetSousPoint(s, 505, 102, tol);
  controle(r && r.id === lm && r.poignee && r.poignee.nom === 'a1', 'poignée a1 sous le doigt');
  r = OptGeo.objetSousPoint(s, 804, 250, tol);
  controle(r && r.id === mi && !r.poignee, 'miroir sous le doigt (tracé)');
  r = OptGeo.objetSousPoint(s, 230, 310, tol);
  controle(r && r.id === sp, 'intérieur de la sphère');
  controle(OptGeo.objetSousPoint(s, 650, 50, tol) === null, 'rien sous le doigt');
  controle(OptGeo.deplacerPoignee(s, lm, 'f2', 640, 300).ok && proche(s.objet(lm).focale, 140), 'déplacer le foyer change la focale', s.objet(lm).focale);
  controle(OptGeo.deplacerPoignee(s, lm, 'centre', 450, 300).ok && proche(s.objet(lm).a1x, 450), 'déplacer le centre translate la lentille');
  controle(OptGeo.deplacerPoignee(s, sp, 'bord', 300, 300).ok && proche(s.objet(sp).rayon, 100), 'rayon de la sphère');
  controle(!OptGeo.deplacerPoignee(s, lm, 'a2', 450, 900).ok, 'poignée hors de l’espace refusée');
  // toutes les poignées de tous les types se déplacent sans exception
  const { s: sc } = sceneComplete();
  let n = 0, erreurs = 0;
  sc.objets.slice().forEach((o) => {
    OptGeo.poignees(sc, o.id).forEach((h) => {
      try { OptGeo.deplacerPoignee(sc, o.id, h.nom, h.x + 1, h.y + 1); n++; } catch (e) { erreurs++; console.log('   ', o.type, h.nom, e.message); }
    });
  });
  controle(erreurs === 0 && n > 60, 'déplacement de toutes les poignées (' + n + ')', erreurs);
  controle(!sc.tracer().tronque, 'tracé après déplacements');
  // vue
  const v = OptGeo.creerVue({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 500, respectrapport: true }, 500, 500);
  const e = v.versEcran(1000, 500), m = v.versMonde(e[0], e[1]);
  controle(proche(e[0], 500) && proche(e[1], 125) && proche(m[0], 1000) && proche(m[1], 500), 'vue : monde <-> écran (y vers le haut, rapport respecté)', e.join(','));
}

/* ---------------- Superposer (SuperposeSimulation) ---------------- */
{
  const s = new OptGeo.Scene({ xxmin: 0, xxmax: 500, yymin: 0, yymax: 400 });
  s.ajouter('lmc', { a1x: 200, a1y: 100, a2x: 200, a2y: 300, focale: 80 });
  const autre = new OptGeo.Scene({ xxmin: -100, xxmax: 1000, yymin: 0, yymax: 600, unitelongueur: 'cm' });
  autre.ajouter('rayon', { ax: 800, ay: 500, kx: -50, ky: 0 });
  autre.ajouter('miroirplan', { a1x: 900, a1y: 100, a2x: 950, a2y: 300 });
  const r = OptGeo.superposerOpt(s, OptGeo.ecrireOpt(autre), { ecraserOptions: false });
  controle(r.ids.length === 2 && s.objets.length === 3, 'superposition : objets ajoutés');
  controle(s.options.xxmin === -100 && s.options.xxmax === 1000 && s.options.yymax === 600, 'superposition : espace de travail réuni');
  controle(s.options.unitelongueur === 'mm' && s.groupes.length === 1 && s.groupes[0].membres.length === 2, 'superposition : options gardées, nouveau groupe');
}

/* ---------------- Objets par défaut (boutons « ajouter ») ---------------- */
{
  const s = new OptGeo.Scene();
  const refus = OptGeo.ordreTypes.filter((t) => !s.ajouter(t, OptGeo.objetParDefaut(s, t, 500, 350)).ok);
  controle(refus.length === 0, 'objet par défaut valide pour les 26 types', refus.join(','));
  controle(!s.tracer().tronque, 'tracé de la scène des objets par défaut');
}

/* ---------------- Polycercle : poignées des sommets et des arcs (unit222.pas 22374-22598) ---------------- */
{
  const EXT = OptGeo.INTERIEUR.EXTERIEUR;
  const mil15 = { indicerouge: 1.5, indicevert: 1.5, indicebleu: 1.5, reflechientrant: 2, reflechisortant: 4 };
  // Pour chaque côté circulaire : sommets sur le cercle, point de l'arc sur la médiatrice.
  function invariants(s, id, quoi) {
    const g = s.geometrie(id), o = s.objet(id), n = o.sommets.length;
    let ecartCercle = 0, ecartMediatrice = 0;
    for (let k = 0; k < n; k++) if (!o.rectiligne[k]) {
      const a = o.sommets[k], b = o.sommets[(k + 1) % n], m = o.mess[k], c = g.mescentres[k + 1], R = g.rayon[k + 1];
      ecartCercle = Math.max(ecartCercle, Math.abs(Math.hypot(a.x - c.ax, a.y - c.ay) - R), Math.abs(Math.hypot(b.x - c.ax, b.y - c.ay) - R));
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      ecartMediatrice = Math.max(ecartMediatrice, Math.abs((m.x - (a.x + b.x) / 2) * (b.x - a.x) + (m.y - (a.y + b.y) / 2) * (b.y - a.y)) / l);
    }
    controle(ecartCercle < 1e-9, quoi + ' : sommets sur le cercle de leur arc', ecartCercle);
    controle(ecartMediatrice < 1e-9, quoi + ' : point de l’arc sur la médiatrice', ecartMediatrice);
  }
  // flèche signée / corde d'un côté (même côté et même angle au centre si elle est conservée)
  function flecheRelative(o, k) {
    const n = o.sommets.length, a = o.sommets[k], b = o.sommets[(k + 1) % n], m = o.mess[k];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    return ((b.x - a.x) * (m.y - (a.y + b.y) / 2) - (b.y - a.y) * (m.x - (a.x + b.x) / 2)) / l / l;
  }
  function deplacer(s, id, nom, x, y) {
    const avant = JSON.parse(JSON.stringify(s.objet(id)));
    const r = OptGeo.deplacerPoignee(s, id, nom, x, y);
    controle(r.ok, 'déplacement ' + nom + ' accepté', r.erreur);
    const o = s.objet(id), n = o.sommets.length;
    let m;
    if ((m = /^sommet(\d+)$/.exec(nom))) {
      const i = +m[1] - 1;
      controle(o.sommets[i].x === x && o.sommets[i].y === y, nom + ' : sommet à la position demandée');
      for (let k = 0; k < n; k++) {
        if (o.rectiligne[k]) continue;
        if (k === i || k === (i - 1 + n) % n) {
          const f0 = flecheRelative(avant, k), f1 = flecheRelative(o, k);
          controle(Math.abs(f1 - f0) <= 1e-12 * Math.max(1, Math.abs(f0)), nom + ' : côté ' + (k + 1) + ', flèche / corde conservée (même côté, même angle au centre)', f0 + ' / ' + f1);
        } else controle(o.mess[k].x === avant.mess[k].x && o.mess[k].y === avant.mess[k].y, nom + ' : arc ' + (k + 1) + ' non voisin inchangé');
      }
    } else if ((m = /^arc(\d+)$/.exec(nom))) {
      const k = +m[1] - 1, a = o.sommets[k], b = o.sommets[(k + 1) % n], q = o.mess[k];
      controle(JSON.stringify(o.sommets) === JSON.stringify(avant.sommets), nom + ' : sommets inchangés');
      // projection orthogonale : (demandé − obtenu) parallèle à la corde
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      controle(Math.abs((x - q.x) * (b.y - a.y) - (y - q.y) * (b.x - a.x)) / l < 1e-9, nom + ' : projection sur la médiatrice');
    }
    invariants(s, id, nom + ' → (' + x + ', ' + y + ')');
  }

  // Le cas du relecteur : polycercle en D, côté 1 droit, côté 2 en arc par (560, 500).
  const s = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 1000 });
  const id = s.ajouter('polycercle', Object.assign({ sommets: [{ x: 450, y: 350 }, { x: 450, y: 650 }],
    mess: [{ x: 450, y: 500 }, { x: 560, y: 500 }], rectiligne: [true, false] }, mil15)).id;
  invariants(s, id, 'polycercle en D');
  deplacer(s, id, 'sommet1', 420, 330);
  deplacer(s, id, 'arc2', 600, 560);
  deplacer(s, id, 'sommet2', 470, 640);
  deplacer(s, id, 'arc2', 520, 400);
  // un rayon horizontal entre par le côté droit et ressort par l'arc
  const o = s.objet(id), g = s.geometrie(id), c = g.mescentres[2], R = g.rayon[2];
  const yr = (o.sommets[0].y + o.sommets[1].y) / 2;
  s.ajouter('rayon', { ax: 100, ay: yr, kx: 50, ky: 0, couleur: C.clRed, nombremaxenfant: 0 });
  const t = s.tracer().segments;
  controle(t.length === 3, 'rayon horizontal : trois segments (entrée, traversée, sortie)', t.length);
  if (t.length === 3) {
    controle(Math.abs(Math.hypot(t[2].a1x - c.ax, t[2].a1y - c.ay) - R) < 1e-9, 'le rayon ressort par l’arc', Math.hypot(t[2].a1x - c.ax, t[2].a1y - c.ay) - R);
    controle(g.estou((t[2].a1x + t[2].a2x) / 2, (t[2].a1y + t[2].a2y) / 2) === EXT && t[2].a2x === 1000, 'après l’arc, le rayon est à l’extérieur jusqu’au bord');
  }

  // Polycercle à trois arcs : chaque sommet puis chaque arc
  const s2 = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 1000 });
  const id2 = s2.ajouter('polycercle', Object.assign({ sommets: [{ x: 400, y: 400 }, { x: 600, y: 400 }, { x: 600, y: 600 }, { x: 400, y: 600 }],
    mess: [{ x: 500, y: 370 }, { x: 630, y: 500 }, { x: 500, y: 600 }, { x: 420, y: 500 }], rectiligne: [false, false, true, false] }, mil15)).id;
  invariants(s2, id2, 'polycercle à trois arcs');
  [['sommet1', 380, 390], ['sommet2', 615, 380], ['sommet3', 620, 610], ['sommet4', 390, 620],
   ['arc1', 470, 300], ['arc2', 700, 480], ['arc4', 450, 530]].forEach((d) => deplacer(s2, id2, d[0], d[1], d[2]));
}

/* ---------------- Milieux neufs : valeurs par défaut d'OptGeo (ray1.pas 1303…2858) ---------------- */
{
  const s = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 700 });
  ['polyhedre', 'polycercle', 'lec', 'sphere', 'prisme'].forEach((t, i) => {
    const r = s.ajouter(t, OptGeo.objetParDefaut(s, t, 150 + 170 * i, 600));
    const o = r.ok && s.objet(r.id);
    controle(o && o.indicerouge === 1.4 && o.indicebleu === 1.8 && o.indicevert === 1.6 && o.reflechientrant === 2 && o.reflechisortant === 2,
      t + ' neuf : n rouge 1,4, n bleu 1,8, n vert 1,6, réflexion « jamais » (2, 2)', o && [o.indicerouge, o.indicebleu, o.indicevert, o.reflechientrant, o.reflechisortant].join(' '));
  });
  // (la dispersion de la lumière blanche par un prisme neuf est vérifiée dans physique.js)
  // un fichier garde ses propres valeurs
  const sf = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 700 });
  sf.ajouter('prisme', Object.assign(OptGeo.objetParDefaut(sf, 'prisme', 500, 350), { indicerouge: 1.5, indicebleu: 1.5, indicevert: 1.5, reflechientrant: 2, reflechisortant: 4 }));
  const relu = OptGeo.lireOpt(OptGeo.ecrireOpt(sf), { strict: true }).scene.objets[0];
  controle(relu.indicerouge === 1.5 && relu.indicebleu === 1.5 && relu.indicevert === 1.5 && relu.reflechientrant === 2 && relu.reflechisortant === 4,
    'un fichier garde ses indices et ses codes de réflexion');
}

/* ---------------- Texte : taille de police négative = hauteur en pixels (TFont de Delphi) ---------------- */
{
  const fs = require('fs'), path = require('path');
  const { DOSSIER_EXEMPLES } = require('./charger-moteur.js');
  // police CSS valide pour Canvas : [italic ][bold ]<entier positif>px "<famille>", Arial, sans-serif
  const valide = (css) => /^(italic )?(bold )?[1-9]\d*px "[^"]*", Arial, sans-serif$/.test(css);
  const P = (g) => OptGeo.policeTexte(Object.assign({ policename: 'Arial', policefsbold: false, policefsitalic: false }, g));
  const cas = [[-8, 8], [-13, 13], [-1, 1], [10, 13], [12, 16], [6, 8], [72, 96]];
  cas.forEach(([t, px]) => {
    const p = P({ policesize: t });
    controle(p.px === px && valide(p.css) && p.css.startsWith(px + 'px '), 'taille ' + t + ' → ' + px + ' px (' + (t < 0 ? 'hauteur en pixels' : 'points × 96/72') + ')', p.css);
  });
  const pg = P({ policesize: -8, policefsbold: true, policefsitalic: true, policename: 'Default' });
  controle(pg.css === 'italic bold 8px "Default", Arial, sans-serif', 'taille −8, gras italique, police « Default »', pg.css);
  // le dessinateur passe bien cette police au canevas (Dessin factice : on relève la police demandée)
  const polices = [];
  const dFactice = { vue: { versEcran: (x, y) => [x, y] }, texte: (x, y, s, police) => polices.push(police), mesure: () => ({ l: 10, h: 10 }), style() {}, ctx: { beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} } };
  OptGeo.dessinateurs.texte(dFactice, { x: 0, y: 0, texte: 'm = 1', policesize: -8, policename: 'Default', policefsunderline: true });
  controle(polices[0] === '8px "Default", Arial, sans-serif', 'dessin d’un texte à −8 : police « 8px » demandée au canevas', polices[0]);
  // les deux exemples Reseaux : textes à −8, valeur lue et réécrite telle quelle, police dessinable
  ['reseau_en_reflexion.opt', 'reseau_en_transmission.opt'].forEach((f) => {
    const txt = fs.readFileSync(path.join(DOSSIER_EXEMPLES, 'Reseaux', f), 'utf8');
    const s = OptGeo.lireOpt(txt, { strict: true }).scene, textes = s.objetsDuType('texte');
    const relus = OptGeo.lireOpt(OptGeo.ecrireOpt(s), { strict: true }).scene.objetsDuType('texte');
    const tailles = textes.map((t) => t.policesize), negatifs = tailles.filter((t) => t === -8).length;
    const css = textes.map((t) => OptGeo.policeTexte(s.geometrie(t.id)).css);
    controle(negatifs >= 3 && relus.map((t) => t.policesize).join(',') === tailles.join(','),
      f + ' : ' + negatifs + ' textes à −8 sur ' + textes.length + ', tailles gardées telles quelles à la lecture et à l’écriture', tailles.join(','));
    controle(css.every(valide) && css.every((c, i) => c.startsWith((tailles[i] === -8 ? 8 : Math.round(tailles[i] * 96 / 72)) + 'px ')),
      f + ' : police CSS valide pour chaque texte (« 8px » pour les tailles −8)', css.join(' | '));
  });
}

/* ---------------- Polycercle à deux arcs : intersection de deux cercles robuste (unit222.pas:1124) ---------------- */
{
  const M = OptGeo.math, deg = PI / 180;
  const mil15 = { indicerouge: 1.5, indicevert: 1.5, indicebleu: 1.5, reflechientrant: 2, reflechisortant: 4 };
  // points de contrôle sur la médiatrice, à la flèche f (> 0 vers l'extérieur)
  function bombe(S, f) {
    const n = S.length, gx = S.reduce((a, p) => a + p.x, 0) / n, gy = S.reduce((a, p) => a + p.y, 0) / n;
    return S.map((p, i) => {
      const q = S[(i + 1) % n], ix = (p.x + q.x) / 2, iy = (p.y + q.y) / 2;
      let nx = -(q.y - p.y), ny = q.x - p.x; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
      if (nx * (ix - gx) + ny * (iy - gy) < 0) { nx = -nx; ny = -ny; }
      return { x: ix + f[i] * nx, y: iy + f[i] * ny };
    });
  }
  const S = [{ x: 470, y: 400 }, { x: 470, y: 600 }, { x: 530, y: 600 }, { x: 530, y: 400 }];
  const lentille = (S2, f) => Object.assign({ sommets: S2, mess: bombe(S2, f), rectiligne: [false, true, false, true] }, mil15);
  const petits = [1e-12, 1e-10, 1e-9, 3e-9, 1e-8, 3e-8, 1e-7, 3e-7, 1e-6, 1e-4, 1e-2];
  const angles = [];
  for (let a = 0; a < 360; a++) angles.push(a);
  [0, 90, 180, 270].forEach((a0) => petits.forEach((e) => { angles.push(a0 + e); angles.push(a0 - e + (a0 === 0 ? 360 : 0)); }));
  // lentille biconvexe (arcs disjoints : acceptée) et arcs bombés vers l'intérieur qui se croisent (refusée)
  const refusBiconvexe = [], acceptCroises = [];
  angles.forEach((a) => {
    const s = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 1000 });
    const id = s.ajouter('polycercle', lentille(S, [30, 0, 30, 0])).id;
    if (a && !s.tourner([id], a * deg, 500, 500).ok) refusBiconvexe.push(a);
    const s2 = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 1000 });
    const rot = (p) => ({ x: 500 + (p.x - 500) * Math.cos(a * deg) - (p.y - 500) * Math.sin(a * deg), y: 500 + (p.x - 500) * Math.sin(a * deg) + (p.y - 500) * Math.cos(a * deg) });
    const r2 = s2.ajouter('polycercle', lentille(S.map(rot), [-45, 0, -45, 0]));
    if (r2.ok || r2.erreur !== 'Deux côtés circulaires se coupent.') acceptCroises.push(a);
  });
  controle(refusBiconvexe.length === 0, 'lentille biconvexe en polycercle acceptée sous ' + angles.length + ' angles (0 à 360°, petits angles autour de 0, 90, 180, 270°)', refusBiconvexe.join(' '));
  controle(acceptCroises.length === 0, 'arcs qui se croisent refusés sous les mêmes angles', acceptCroises.join(' '));
  // centres exactement à la même hauteur (division par zéro dans l'original) : bon résultat
  {
    const s = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 1000 });
    const id = s.ajouter('polycercle', lentille(S, [30, 0, 30, 0])).id, g = s.geometrie(id);
    controle(g.mescentres[1].ay === g.mescentres[3].ay, 'lentille à 0° : centres exactement à la même hauteur (cas y0 = y1)');
    const r = s.ajouter('polycercle', lentille(S.map((p) => ({ x: p.x, y: p.y + 300 })), [-45, 0, -45, 0]));
    controle(!r.ok && r.erreur === 'Deux côtés circulaires se coupent.', 'cas y0 = y1 : arcs croisés refusés', r.erreur);
  }
  // sommets décalés de très peu
  const refusDecales = [];
  [1e-12, 1e-9, 1e-7, 1e-6, 1e-4, 1e-2, 1].forEach((d) => [[0, d], [0, -d], [d, 0], [d, d]].forEach((dd) => {
    const S2 = S.map((p, i) => ({ x: p.x + (i >= 2 ? dd[0] : 0), y: p.y + (i >= 2 ? dd[1] : 0) }));
    const r = new OptGeo.Scene({ xxmin: 0, xxmax: 1000, yymin: 0, yymax: 1000 }).ajouter('polycercle', lentille(S2, [30, 0, 30, 0]));
    if (!r.ok) refusDecales.push(dd.join(','));
  }));
  controle(refusDecales.length === 0, 'lentille aux sommets décalés de 1e-12 à 1 : acceptée', refusDecales.join(' ; '));
  // y0 = y1 : points communs justes, dans l'ordre de l'original (y décroissant à x égal)
  const c = M.lesDeuxCerclesSeCoupentIls(0, 0, 8, 0, 5, 5, 0, 2 * PI, 0, 2 * PI);
  const t0 = Math.atan2(3, 4);
  controle(c.n === 2 && proche(c.para1, t0 / (2 * PI), 1e-15) && proche(c.para2, (PI - t0) / (2 * PI), 1e-15) &&
    proche(c.para3, (2 * PI - t0) / (2 * PI), 1e-15) && proche(c.para4, (PI + t0) / (2 * PI), 1e-15), 'cercles de centres (0,0) et (8,0) : points (4, ±3)', JSON.stringify(c));
  controle(M.lesDeuxCerclesSeCoupentIls(0, 0, 10, 0, 5, 5, 0, 2 * PI, 0, 2 * PI).n === 1, 'cercles tangents (y0 = y1) : un point commun');
  controle(M.lesDeuxCerclesSeCoupentIls(0, 0, 11, 0, 5, 5, 0, 2 * PI, 0, 2 * PI).n === 0, 'cercles disjoints (y0 = y1) : aucun point commun');
  controle(M.lesDeuxCerclesSeCoupentIls(0, 0, 0, 0, 5, 4, 0, 2 * PI, 0, 2 * PI).n === 0, 'cercles concentriques de rayons différents : aucun point commun');
  controle(M.lesDeuxCerclesSeCoupentIls(0, 0, 0, 0, 5, 5, 0, 1, 0.5, 2).n === 1 && M.lesDeuxCerclesSeCoupentIls(0, 0, 0, 0, 5, 5, 0, 1, 1.5, 2).n === 0,
    'même cercle : arcs qui se recouvrent (refus) ou non');
  // cas non dégénérés : même résultat que la formule de l'original (division par y0 − y1)
  function original(x0, y0, x1, y1, r0, r1, t01, t02, t11, t12) {
    const sq = (x) => x * x, r = { n: 0, para1: 10, para2: 10, para3: 10, para4: 10 };
    const pa = (th, a, b, p) => { if (th >= a && th <= b) p = (th - a) / (b - a); if (th - 2 * PI >= a && th - 2 * PI <= b) p = (th - 2 * PI - a) / (b - a); if (th + 2 * PI >= a && th + 2 * PI <= b) p = (th + 2 * PI - a) / (b - a); return p; };
    const N = (sq(r1) - sq(r0) - sq(x1) + sq(x0) - sq(y1) + sq(y0)) / 2 / (y0 - y1), A = sq((x0 - x1) / (y0 - y1)) + 1;
    const B = 2 * y0 * (x0 - x1) / (y0 - y1) - 2 * N * (x0 - x1) / (y0 - y1) - 2 * x0, Cc = sq(x0) + sq(y0) + sq(N) - sq(r0) - 2 * y0 * N, D = sq(B) - 4 * A * Cc;
    if (D < 0) return r;
    const xa = (-B + Math.sqrt(D)) / 2 / A, ya = N - xa * (x0 - x1) / (y0 - y1), xb = (-B - Math.sqrt(D)) / 2 / A, yb = N - xb * (x0 - x1) / (y0 - y1);
    r.para1 = pa(M.donneAnglePolaireDans02Pi(xa - x0, ya - y0), t01, t02, 10); r.para2 = pa(M.donneAnglePolaireDans02Pi(xa - x1, ya - y1), t11, t12, 10);
    r.para3 = pa(M.donneAnglePolaireDans02Pi(xb - x0, yb - y0), t01, t02, 10); r.para4 = pa(M.donneAnglePolaireDans02Pi(xb - x1, yb - y1), t11, t12, 10);
    if (r.para1 >= 0 && r.para1 <= 1 && r.para2 >= 0 && r.para2 <= 1) r.n++;
    if (r.para3 >= 0 && r.para3 <= 1 && r.para4 >= 0 && r.para4 <= 1) { r.n++; if (r.n === 1) { r.para1 = r.para3; r.para2 = r.para4; } }
    return r;
  }
  let graine = 12345, nb = 0, diffN = 0, ecart = 0;
  const alea = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  for (let k = 0; k < 50000; k++) {
    const x0 = alea() * 1000, y0 = alea() * 1000, x1 = alea() * 1000, y1 = alea() * 1000, r0 = 10 + alea() * 600, r1 = 10 + alea() * 600;
    if (Math.abs(y1 - y0) < 0.1 * Math.abs(x1 - x0)) continue;
    const a1 = alea() * 2 * PI, w1 = 0.2 + alea() * 5, a2 = alea() * 2 * PI, w2 = 0.2 + alea() * 5;
    const u = original(x0, y0, x1, y1, r0, r1, a1, a1 + w1, a2, a2 + w2), w = M.lesDeuxCerclesSeCoupentIls(x0, y0, x1, y1, r0, r1, a1, a1 + w1, a2, a2 + w2);
    nb++;
    if (u.n !== w.n) diffN++;
    else ['para1', 'para2', 'para3', 'para4'].forEach((p) => { ecart = Math.max(ecart, Math.abs(u[p] - w[p])); });
  }
  controle(diffN === 0 && ecart < 1e-9, nb + ' paires de cercles bien conditionnées : même nombre de points communs que la formule de l’original, mêmes positions à 1e-9 près', diffN + ' / ' + ecart);
}

console.log('\nAPI : ' + reussis + ' contrôles réussis, ' + echecs + ' échoués.');
process.exit(echecs ? 1 : 0);
