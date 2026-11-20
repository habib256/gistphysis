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

console.log('\nAPI : ' + reussis + ' contrôles réussis, ' + echecs + ' échoués.');
process.exit(echecs ? 1 : 0);
