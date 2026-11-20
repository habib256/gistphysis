/*
 * OptGeo web — interface, partie 4 : panneau des propriétés de chaque objet.
 *
 * Reprend les boîtes de saisie d'OptGeo 3.03 (saisiemp, saisielmc, saisieray,
 * saisiesp1, saisieop1, saisiesphere, unit6, saisiecercle, saisiepri, saisieoe,
 * saisief1, saisiejoli1, unit10, unit13, unit14… ; SPEC-INTERFACE.md §10) :
 * mêmes champs, mêmes libellés (orthographe corrigée), dans un panneau non
 * modal. Les erreurs s'affichent sous le champ fautif et le panneau reste
 * ouvert (écart volontaire : OptGeo fermait la boîte). Virgule ou point
 * acceptés ; angles saisis en degrés (le fichier garde les radians).
 */
(function () {
  'use strict';
  var OGW = window.OGW, OptGeo = window.OptGeo, el = OGW.el, N = OGW.nombre;
  var PI = Math.PI;

  /* ------------------------------------------------------------------ */
  /* Descriptions des boîtes                                             */
  /* ------------------------------------------------------------------ */
  function pt(lib, x, y) { return { k: 'point', libelle: lib, x: x, y: y }; }
  function nb(lib, cle, o) { return Object.assign({ k: 'nombre', libelle: lib, cle: cle }, o || {}); }
  function ent(lib, cle, min, max) { return { k: 'entier', libelle: lib, cle: cle, min: min, max: max }; }
  function coul(lib, cle) { return { k: 'couleur', libelle: lib, cle: cle || 'couleur' }; }
  function cas(lib, cle) { return { k: 'case', libelle: lib, cle: cle }; }
  function choix(lib, cle, options) { return { k: 'choix', libelle: lib, cle: cle, options: options }; }
  function ang(lib, cle, o) { return Object.assign({ k: 'angle', libelle: lib, cle: cle }, o || {}); }
  function section(t) { return { k: 'section', titre: t }; }
  function note(t) { return { k: 'note', texte: t }; }
  var EPAISSEUR = ent('Épaisseur du trait à l’écran (pixels)', 'epaisseur', 1, 20);
  var PROLONGEMENTS = [section('Tracer en pointillé le prolongement des segments'),
    note('Liste des numéros de segments, par exemple (1,4,10). Les formes « 1, 4, 10 », « 1 4 10 » et « 2-5 » sont aussi acceptées.'),
    { k: 'liste', libelle: 'Vers l’avant', cle: 'vav' }, { k: 'liste', libelle: 'Vers l’arrière', cle: 'vaa' }];
  var REFLECHI = [
    { v: 1, t: 'Toujours' }, { v: 2, t: 'Jamais' }, { v: 3, t: 'Seulement si le réfracté existe' }, { v: 4, t: 'Seulement si le réfracté n’existe pas' }];
  var MILIEU = [section('Indice de réfraction du milieu'), { k: 'indices' },
    section('Rayon réfléchi'),
    choix('Sens entrant (le rayon arrive de l’extérieur)', 'reflechientrant', REFLECHI),
    choix('Sens sortant (le rayon est à l’intérieur et va sortir)', 'reflechisortant', REFLECHI),
    note('Avec « Jamais » en sens sortant, la réflexion totale n’est pas tracée : le rayon s’arrête.'),
    note('Un rayon réfléchi tracé en même temps qu’un rayon réfracté est un « rayon enfant ».')];
  var SURFACES = [section('Surfaces d’onde'), cas('Tracer des surfaces d’onde', 'tracersurfacesonde'),
    { k: 'chemins', libelle: 'Chemins optiques (séparés par des espaces, par exemple 120 145 276)', cle: 'listechemins' },
    note('Si la simulation comprend au moins une lentille mince ou un miroir paraxial, ces surfaces ne sont pas tracées.')];

  var BOITES = {
    miroirplan: { titre: 'miroir plan', champs: [pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y'), coul('Couleur à l’écran'), EPAISSEUR, cas('Hachures', 'hachures'),
      note('L’ordre des points 1 et 2 fixe la face réfléchissante ; les hachures sont du côté de la face absorbante.')] },
    reseau: { titre: 'réseau', champs: [pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y'), coul('Couleur à l’écran'), EPAISSEUR,
      choix('Type de réseau', 'entransmission', [{ v: true, t: 'En transmission' }, { v: false, t: 'En réflexion' }]),
      cas('Hachures si réseau en réflexion', 'hachures'),
      nb('Nombre de traits par mm', '_traits', { min: 1, max: 100000, positif: true }),
      ent('Ordre minimum', 'ordre_min', -10000, 10000), ent('Ordre maximum', 'ordre_max', -10000, 10000),
      note('Remarque importante : ce réseau doit être éclairé par une onde plane. Un rayon unique est diffracté selon la loi des réseaux sin i = ± sin i0 + k·λ/a, mais cela n’a pas de sens pour un rayon unique.'),
      note('Les longueurs d’onde se règlent dans Options › Indices du milieu ambiant et longueurs d’onde.')] },
    mscopa: { titre: 'miroir concave (idéal)', champs: msPara() },
    mscepa: { titre: 'miroir convexe (idéal)', champs: msPara() },
    mscore: { titre: 'miroir concave', champs: msReel() },
    mscere: { titre: 'miroir convexe', champs: msReel() },
    miroirconique: { titre: 'miroir conique', champs: [pt('Foyer F', 'fx', 'fy'), nb('Paramètre P', 'parametre', { unite: true, abs: true }),
      nb('Excentricité e', 'excentricite', { abs: true }), { k: 'nature' },
      ang('Angle polaire de l’axe focal t0', 'theta0'), ang('Angle polaire FM1 (extrémité 1) t1', 'theta1'), ang('Angle polaire FM2 (extrémité 2) t2', 'theta2'),
      choix('Concave ou convexe ?', 'concave', [{ v: true, t: 'Concave' }, { v: false, t: 'Convexe' }]),
      coul('Couleur du miroir'), coul('Couleur de l’axe', 'couleuraxe'), cas('Hachures', 'hachures'), cas('Axe focal', 'axefocal'),
      note('Équation polaire depuis le foyer : r = P / (1 + e·cos(θ − t0)) ; e < 1 ellipse, e = 1 parabole, e > 1 hyperbole.')] },
    lmc: { titre: 'lentille convergente', champs: lm() },
    lmd: { titre: 'lentille divergente', champs: lm() },
    lsr: { titre: 'lame semi-réfléchissante', champs: [pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y'), coul('Couleur à l’écran'), EPAISSEUR,
      note('Un rayon incident donne un rayon réfléchi et un rayon transmis sans décalage ; le transmis est un « rayon enfant ».')] },
    ecran: { titre: 'écran', champs: [pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y'), coul('Couleur à l’écran'), EPAISSEUR, note('Les deux faces de l’écran absorbent la lumière.')] },
    diaphragme: { titre: 'diaphragme', champs: [pt('Centre C', 'cx', 'cy'), nb('Rayon intérieur Rint (ouverture)', 'rint', { unite: true, abs: true }),
      nb('Rayon extérieur Rext', 'rext', { unite: true, abs: true }), ang('Angle polaire du diaphragme t', 'anglepolaire'),
      coul('Couleur du diaphragme'), ent('Épaisseur du trait (pixels)', 'epaisseur', 1, 5)] },
    lec: { titre: 'lentille épaisse', champs: [section('Sommets des faces'), pt('Sommet S1', 's1x', 's1y'), pt('Sommet S2', 's2x', 's2y'),
      section('Rayons de courbure des faces'), note('Signe + si le centre de courbure Ci est à gauche de Si sur l’axe orienté de S1 vers S2, signe − sinon.'),
      nb('R1', 'r1', { unite: true, nonNul: true }), nb('R2', 'r2', { unite: true, nonNul: true }), nb('Diamètre D', 'diametre', { unite: true, abs: true }),
      note('Si le diamètre est trop grand pour les rayons de courbure, il est réduit automatiquement.'),
      coul('Couleur à l’écran', 'couleurfond'), coul('Couleur de l’axe', 'couleuraxe'), cas('Axe optique', 'axefocal')].concat(MILIEU) },
    rayon: { titre: 'rayon', champs: [pt('Origine (point 1)', 'ax', 'ay'), pt('Point 2 (direction)', '_bx', '_by'),
      { k: 'couleurRayon', libelle: 'Couleur du rayon', cle: 'couleur' }, ent('Épaisseur à l’écran (pixels)', 'epaisseur', 1, 20)]
      .concat(PROLONGEMENTS, [ent('Rayons enfants : nombre maximal', 'nombremaxenfant', 0, 50), ent('Nombre maximal de segments', 'maxsegment', 1, 500)]) },
    sourceponctuelle: { titre: 'source ponctuelle', champs: [choix('Type de source', 'sourcevirtuelle', [{ v: false, t: 'Réelle' }, { v: true, t: 'Virtuelle' }]),
      pt('Source S', 'sx', 'sy'), pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y'),
      note('Les rayons sont répartis entre S-1 et S-2 en tournant dans le sens direct (inverse des aiguilles d’une montre).'),
      { k: 'couleurRayon', libelle: 'Couleur de la source', cle: 'couleur' }, ent('Épaisseur à l’écran (pixels)', 'epaisseur', 1, 20),
      ent('Nombre de rayons', 'nombrederayon', 2, 500)].concat(PROLONGEMENTS,
      [ent('Pour chaque rayon, rayons enfants : nombre maximal', 'maxenfantparrayon', 0, 50), ent('Nombre maximal de segments par rayon', 'maxsegment', 1, 500)], SURFACES) },
    ondeplane: { titre: 'onde plane', champs: [pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y'), pt('Extrémité du rayon 1 (point D)', 'sx', 'sy'),
      note('Le point 2 est ramené sur la perpendiculaire à 1D passant par 1. Le plan 1-2 est l’origine du chemin optique.'),
      { k: 'couleurRayon', libelle: 'Couleur des rayons', cle: 'couleur' }, ent('Épaisseur à l’écran (pixels)', 'epaisseur', 1, 20),
      ent('Nombre de rayons', 'nombrederayon', 2, 500)].concat(PROLONGEMENTS,
      [ent('Pour chaque rayon, rayons enfants : nombre maximal', 'maxenfantparrayon', 0, 50), ent('Nombre maximal de segments par rayon', 'maxsegment', 1, 500)], SURFACES) },
    sphere: { titre: 'sphère', champs: [pt('Centre', 'cx', 'cy'), nb('Rayon de courbure R', 'rayon', { unite: true, abs: true }), coul('Couleur à l’écran', 'couleurfond')].concat(MILIEU) },
    polyhedre: { titre: 'polygone', champs: [{ k: 'sommets' }, coul('Couleur à l’écran', 'couleurfond')].concat(MILIEU) },
    polycercle: { titre: 'polycercle', champs: [{ k: 'sommets', arcs: true }, coul('Couleur à l’écran', 'couleurfond')].concat(MILIEU) },
    prisme: { titre: 'prisme', champs: [pt('Centre d’inertie G', 'gx', 'gy'), ang('Angle au sommet A', '_A', { min: 0.01, max: 179.99 }),
      ang('Angle polaire de la hauteur principale t', '_t'), nb('Hauteur', '_h', { unite: true, positif: true }), coul('Couleur du prisme', 'couleurfond')].concat(MILIEU) },
    oeil: { titre: 'œil stylisé', champs: [coul('Couleur de l’œil'), EPAISSEUR, pt('Point 1 (rétine)', 'cx', 'cy'), pt('Point 2 (centre de la pupille)', 'ax', 'ay'),
      note('Toutes les parties de cet œil absorbent la lumière ; il ne simule pas l’image rétinienne.')] },
    fleche: { titre: 'trait', champs: [
      choix('Forme de la première extrémité', 'ext1', extremites()), choix('Forme de la seconde extrémité', 'ext2', extremites()),
      ent('Taille de la première extrémité (en ‰ de la diagonale de l’espace de travail)', 'taille1', 1, 1000),
      ent('Taille de la seconde extrémité (en ‰ de la diagonale)', 'taille2', 1, 1000),
      ent('Épaisseur du trait (pixels)', 'epaisseur', 1, 10),
      choix('Style du trait', 'styletrait', [{ v: 'pssolid', t: 'Plein' }, { v: 'psdot', t: 'Pointillés' }, { v: 'psdash', t: 'Tirets' },
        { v: 'psdashdot', t: 'Tirets - points' }, { v: 'psdashdotdot', t: 'Tirets - points - points' }]),
      coul('Couleur du trait'), pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y')] },
    texte: { titre: 'texte', champs: [{ k: 'texte', libelle: 'Texte', cle: 'texte' }, { k: 'police' },
      pt('Coin supérieur gauche du texte', 'x', 'y')] },
    metre: { titre: 'mesure de distance', champs: [pt('1er point', 'a1x', 'a1y'), pt('2nd point', 'a2x', 'a2y'), { k: 'mesure' }] },
    angle: { titre: 'mesure d’angle', champs: [pt('Sommet C', 'cx', 'cy'), pt('1er point', 'a1x', 'a1y'), pt('2nd point', 'a2x', 'a2y'), { k: 'mesure' },
      note('L’angle est mesuré du 1er côté vers le 2nd dans le sens direct.')] },
    jolipoint: { titre: 'point', champs: [choix('Forme', 'style', stylesPoint()), ent('Taille (en ‰ de la diagonale de l’espace de travail)', 'taille', 1, 1000),
      coul('Couleur'), ent('Épaisseur (pixels)', 'epaisseur', 1, 100), pt('Coordonnées du point', 'a1x', 'a1y')] }
  };
  function msPara() {
    return [pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y'), nb('Focale |f|', 'focale', { unite: true, abs: true, nonNul: true }),
      coul('Couleur du miroir'), coul('Couleur de l’axe', 'couleuraxe'), EPAISSEUR, cas('Hachures', 'hachures'), cas('Axe optique', 'axefocal'),
      section('Trouer le miroir en son centre'), cas('Trouer', 'trou'), nb('Diamètre du trou', 'diametretrou', { unite: true, abs: true, siCase: 'trou' }),
      note('L’ordre des points 1 et 2 fixe la face réfléchissante.')];
  }
  function msReel() {
    return [pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y'), nb('Rayon de courbure R', 'rayoncourbure', { unite: true, abs: true, nonNul: true }),
      choix('Angle d’ouverture', 'aigu', [{ v: true, t: 'Aigu' }, { v: false, t: 'Obtus' }]),
      coul('Couleur du miroir'), coul('Couleur de l’axe', 'couleuraxe'), EPAISSEUR, cas('Hachures', 'hachures'), cas('Axe de symétrie', 'axefocal'),
      section('Trouer le miroir en son centre'), cas('Trouer', 'trou'), ang('Diamètre angulaire du trou (vu depuis le centre C)', 'diametretrou', { siCase: 'trou', min: 0 })];
  }
  function lm() {
    return [pt('Point 1', 'a1x', 'a1y'), pt('Point 2', 'a2x', 'a2y'), coul('Couleur de la lentille'), coul('Couleur de l’axe optique', 'couleuraxe'),
      nb('Focale (valeur absolue) |f|', 'focale', { unite: true, abs: true, nonNul: true }), EPAISSEUR, cas('Axe optique', 'axefocal'),
      note('Les normales et les angles ne sont jamais tracés sur une lentille mince.')];
  }
  function extremites() {
    return [{ v: 'trien', t: 'Normale' }, { v: 'tffleche', t: 'Flèche' }, { v: 'ttrait', t: 'Trait perpendiculaire' }, { v: 'trond', t: 'Cercle' },
      { v: 'tcroix', t: 'Croix +' }, { v: 'tcroixx', t: 'Croix ×' }, { v: 'tdisque', t: 'Disque' }];
  }
  function stylesPoint() {
    return [{ v: 'tpcercle', t: 'Cercle' }, { v: 'tpcroixp', t: 'Croix +' }, { v: 'tpcroixx', t: 'Croix ×' }, { v: 'tpdisque', t: 'Disque' },
      { v: 'tpcarre', t: 'Carré' }, { v: 'tpcarreplein', t: 'Carré plein' }, { v: 'tptriangle', t: 'Triangle' }, { v: 'tptriangleplein', t: 'Triangle plein' }];
  }
  OGW.BOITES = BOITES;
  OGW.extremites = extremites; OGW.stylesPoint = stylesPoint;

  /* ------------------------------------------------------------------ */
  /* Valeurs virtuelles (champs qui ne sont pas directement des paramètres) */
  /* ------------------------------------------------------------------ */
  function versChamps(type, p, g) {
    var v = JSON.parse(JSON.stringify(p));
    if (type === 'rayon') { v._bx = p.ax + p.kx; v._by = p.ay + p.ky; }
    if (type === 'reseau') v._traits = 1e-3 / p.pas;
    if (type === 'prisme' && g) { v._A = g.angle_sommet; v._t = g.angle_axe; v._h = g.hauteur; }
    return v;
  }
  function depuisChamps(type, v, o) {
    var p = v;
    if (type === 'rayon') {
      if (!(o && v._bx === o._bx && v._by === o._by && v.ax === o.ax && v.ay === o.ay)) { p.kx = v._bx - v.ax; p.ky = v._by - v.ay; }
      delete p._bx; delete p._by;
    }
    if (type === 'reseau') { if (!(o && v._traits === o._traits)) p.pas = 1e-3 / v._traits; delete p._traits; }
    if (type === 'prisme' && o && v._A === o._A && v._t === o._t && v._h === o._h && v.gx === o.gx && v.gy === o.gy) { delete p._A; delete p._t; delete p._h; }
    if (type === 'prisme' && p._A !== undefined) {
      var h = v._h, A = v._A, t = v._t, G = { x: v.gx, y: v.gy };
      var ux = Math.cos(t), uy = Math.sin(t), H = { x: G.x - h / 3 * ux, y: G.y - h / 3 * uy }, demi = h * Math.tan(A / 2);
      p.ax = G.x + 2 * h / 3 * ux; p.ay = G.y + 2 * h / 3 * uy; p.bx = H.x - demi * uy; p.by = H.y + demi * ux;
      delete p._A; delete p._t; delete p._h;
    }
    return p;
  }

  /** Normalise une liste de segments vers la forme d'OptGeo « (1,4,10) ». */
  function normaliserListe(s) {
    s = String(s || '').trim();
    if (!s) return { ok: true, v: '' };
    var corps = s.replace(/^\(|\)$/g, ''), res = [];
    var morceaux = corps.split(/[\s,;]+/).filter(Boolean);
    for (var i = 0; i < morceaux.length; i++) {
      var m = /^(\d+)(?:-(\d+))?$/.exec(morceaux[i]);
      if (!m) return { ok: false, erreur: '« ' + morceaux[i] + ' » n’est pas un numéro de segment.' };
      var a = +m[1], b = m[2] ? +m[2] : a;
      if (a < 1 || b < 1 || a > 10000 || b > 10000) return { ok: false, erreur: 'Numéros de 1 à 10 000.' };
      for (var k = Math.min(a, b); k <= Math.max(a, b); k++) if (res.indexOf(k) < 0) res.push(k);
    }
    return { ok: true, v: '(' + res.join(',') + ')' };
  }
  OGW.normaliserListe = normaliserListe;
  /** Liste de chemins optiques : séparateurs souples, virgule décimale acceptée. */
  function normaliserChemins(s) {
    var m = String(s || '').trim().split(/[\s;]+/).filter(Boolean), res = [];
    for (var i = 0; i < m.length; i++) {
      var x = OGW.lireNombre(m[i]);
      if (!isFinite(x)) return { ok: false, erreur: '« ' + m[i] + ' » n’est pas un nombre.' };
      res.push(String(x));
    }
    return { ok: true, v: res.join(' ') };
  }

  /* ------------------------------------------------------------------ */
  /* Construction des champs                                             */
  /* ------------------------------------------------------------------ */
  var compteur = 0;
  function idChamp() { return 'ch' + (++compteur); }
  function valeurDe(inp) {
    if (inp._orig !== undefined && inp.value === inp._init) return inp._orig;
    return OGW.lireNombre(inp.value);
  }
  function erreurChamp(boite, texte) {
    var e = boite.querySelector('.erreur-champ');
    if (!e) { e = el('div', { class: 'erreur-champ', role: 'alert' }); boite.appendChild(e); }
    e.textContent = texte || ''; e.hidden = !texte;
    if (texte) boite.classList.add('en-erreur'); else boite.classList.remove('en-erreur');
  }
  /**
   * Champ numérique. Si l'utilisateur ne change pas le texte affiché (arrondi à 10 chiffres),
   * la valeur exacte d'origine est gardée : valider sans rien toucher ne modifie rien.
   */
  function champTexteNombre(valeur, unite, mode, origine) {
    var id = idChamp();
    var inp = el('input', { type: 'text', inputmode: mode || 'decimal', id: id, autocomplete: 'off', spellcheck: 'false', value: valeur });
    inp._init = String(valeur); inp._orig = origine;
    return { id: id, input: inp, ligne: el('span', { class: 'saisie' }, [inp, unite ? el('span', { class: 'unite', texte: unite }) : null]) };
  }
  /** Compteur entier avec boutons − et + de 44 px (SpinEdit d'OptGeo). */
  OGW.champEntier = function (valeur, min, max) {
    var c = champTexteNombre(String(valeur), '', 'numeric');
    function changer(d) { var v = Math.round(OGW.lireNombre(c.input.value)); if (!isFinite(v)) v = min; c.input.value = String(Math.max(min, Math.min(max, v + d))); c.input.dispatchEvent(new Event('input')); }
    var moins = el('button', { type: 'button', class: 'pas', 'aria-label': 'Diminuer', html: OGW.icone('moins'), onclick: function () { changer(-1); } });
    var plus = el('button', { type: 'button', class: 'pas', 'aria-label': 'Augmenter', html: OGW.icone('plus'), onclick: function () { changer(1); } });
    return { id: c.id, input: c.input, element: el('span', { class: 'compteur' }, [moins, c.input, plus]),
      lire: function () { var v = OGW.lireNombre(c.input.value); return (isFinite(v) && Math.round(v) === v && v >= min && v <= max) ? v : NaN; } };
  };
  /** Nuancier : bouton qui montre la couleur et son nom, liste de couleurs nommées dessinées. */
  OGW.champCouleur = function (valeur, choixFermes) {
    var courant = valeur;
    var liste = choixFermes || OGW.COULEURS;
    var bouton = el('button', { type: 'button', class: 'nuance-courante', 'aria-expanded': 'false' });
    var grille = el('div', { class: 'nuancier', hidden: true, role: 'listbox' });
    function majBouton() {
      OGW.vider(bouton);
      bouton.appendChild(pastille(courant)); bouton.appendChild(el('span', { texte: nomDe(courant) }));
    }
    function nomDe(v) {
      var c = liste.filter(function (k) { return k.v === v; })[0];
      return c ? c.nom : OGW.nomCouleur(v);
    }
    liste.forEach(function (c) {
      var b = el('button', { type: 'button', class: 'nuance', role: 'option', title: c.nom, onclick: function () {
        courant = c.v; majBouton(); grille.hidden = true; bouton.setAttribute('aria-expanded', 'false');
      } }, [pastille(c.v, c.blanche), el('span', { texte: c.nom })]);
      grille.appendChild(b);
    });
    if (!choixFermes) {
      var autre = el('input', { type: 'color', value: OptGeo.couleurCss(valeur), 'aria-label': 'Autre couleur', oninput: function () {
        courant = OptGeo.couleurDepuisCss(autre.value); majBouton();
      } });
      grille.appendChild(el('label', { class: 'nuance autre' }, [autre, el('span', { texte: 'Autre…' })]));
    }
    bouton.addEventListener('click', function () { grille.hidden = !grille.hidden; bouton.setAttribute('aria-expanded', String(!grille.hidden)); });
    majBouton();
    return { element: el('div', { class: 'champ-couleur' }, [bouton, grille]), lire: function () { return courant; }, input: bouton };
  };
  function pastille(v, blanche) {
    var s = el('span', { class: 'pastille' + (blanche ? ' blanche' : '') });
    if (!blanche) s.style.background = OptGeo.couleurCss(v);
    return s;
  }
  /** Couleur d'un rayon : choix fermé d'OptGeo (rouge, vert, bleu, lumière blanche). */
  function champCouleurRayon(valeur) {
    var nom = 'cr' + (++compteur), g = el('div', { class: 'radios', role: 'radiogroup' });
    var connue = OGW.COULEURS_RAYON.some(function (c) { return c.v === valeur; });
    OGW.COULEURS_RAYON.forEach(function (c) {
      g.appendChild(el('label', { class: 'radio' }, [el('input', { type: 'radio', name: nom, value: String(c.v), checked: c.v === valeur }),
        pastille(c.v, c.v === 0), c.nom]));
    });
    if (!connue) g.appendChild(el('label', { class: 'radio' }, [el('input', { type: 'radio', name: nom, value: String(valeur), checked: true }), pastille(valeur), 'Couleur du fichier (calculée comme le vert)']));
    g.appendChild(el('p', { class: 'note', texte: 'La lumière blanche est tracée en noir tant qu’aucun milieu dispersif ni réseau n’est présent ; sinon elle se décompose en rouge, vert et bleu.' }));
    return { element: g, lire: function () { var r = g.querySelector('input:checked'); return r ? +r.value : valeur; } };
  }

  /* ------------------------------------------------------------------ */
  /* Le panneau                                                          */
  /* ------------------------------------------------------------------ */
  /**
   * Ouvre le panneau des propriétés.
   * @param app      l'application
   * @param type     type d'objet
   * @param id       objet existant (null : création par le menu Ajouter)
   * @param params   paramètres de départ pour une création
   */
  function ouvrir(app, type, id, params) {
    var scene = app.scene, boite = BOITES[type];
    if (!boite) return;
    var creation = !id;
    var p0 = creation ? params : scene.parametres(id), g0 = creation ? scene.valider(type, params).g : scene.geometrie(id);
    var v = versChamps(type, p0, g0);
    var unite = scene.options.unitelongueur || '';
    var lecteurs = [];
    var corps = el('div', { class: 'formulaire' });
    var dependances = [];

    boite.champs.forEach(function (f) {
      var bloc, c, lecteur = null;
      switch (f.k) {
        case 'section':
          corps.appendChild(el('h3', { texte: f.titre })); return;
        case 'note':
          corps.appendChild(el('p', { class: 'note', texte: f.texte })); return;
        case 'point': {
          var cx = champTexteNombre(N(v[f.x], 10), unite, null, v[f.x]), cy = champTexteNombre(N(v[f.y], 10), unite, null, v[f.y]);
          bloc = el('fieldset', { class: 'champ point' }, [el('legend', { texte: f.libelle }),
            el('label', { for: cx.id, texte: 'x =' }), cx.ligne, el('label', { for: cy.id, texte: 'y =' }), cy.ligne]);
          lecteur = function (q) {
            var x = valeurDe(cx.input), y = valeurDe(cy.input);
            if (!isFinite(x)) return 'Valeur inacceptable pour x.';
            if (!isFinite(y)) return 'Valeur inacceptable pour y.';
            q[f.x] = x; q[f.y] = y;
          };
          break;
        }
        case 'nombre': case 'angle': {
          var estAngle = f.k === 'angle';
          var val = v[f.cle];
          c = champTexteNombre(estAngle ? N(OGW.deg(val), 10) : N(val, 10), estAngle ? '°' : (f.unite ? unite : ''), null, estAngle ? OGW.deg(val) : val);
          var rad = estAngle ? el('span', { class: 'conversion' }) : null;
          if (rad) {
            var majRad = function () { var d = OGW.lireNombre(c.input.value); rad.textContent = isFinite(d) ? '= ' + N(OGW.rad(d), 8) + ' rad' : ''; };
            c.input.addEventListener('input', majRad); majRad();
          }
          bloc = el('div', { class: 'champ' }, [el('label', { for: c.id, texte: f.libelle }), c.ligne, rad]);
          if (f.siCase) dependances.push({ cle: f.siCase, bloc: bloc });
          lecteur = function (q) {
            if (f.siCase && !q[f.siCase]) { q[f.cle] = 0; return; }
            var inchange = c.input.value === c.input._init;
            var x = valeurDe(c.input);
            if (!isFinite(x)) return 'Valeur inacceptable.';
            if (estAngle) x = inchange ? val : OGW.rad(x);
            if (f.abs) x = Math.abs(x);
            if (f.nonNul && x === 0) return 'La valeur doit être non nulle.';
            if (f.positif && !(x > 0)) return 'La valeur doit être positive.';
            if (f.min !== undefined && (estAngle ? OGW.deg(x) : x) < f.min) return 'Valeur trop petite (minimum ' + N(f.min) + ').';
            if (f.max !== undefined && (estAngle ? OGW.deg(x) : x) > f.max) return 'Valeur trop grande (maximum ' + N(f.max) + ').';
            q[f.cle] = x;
          };
          break;
        }
        case 'entier': {
          c = OGW.champEntier(v[f.cle] === undefined ? f.min : v[f.cle], f.min, f.max);
          bloc = el('div', { class: 'champ' }, [el('label', { for: c.id, texte: f.libelle }), c.element]);
          lecteur = function (q) { var x = c.lire(); if (!isFinite(x)) return 'Entier de ' + f.min + ' à ' + f.max + '.'; q[f.cle] = x; };
          break;
        }
        case 'couleur': {
          c = OGW.champCouleur(v[f.cle]);
          bloc = el('div', { class: 'champ' }, [el('span', { class: 'etiquette', texte: f.libelle }), c.element]);
          lecteur = function (q) { q[f.cle] = c.lire(); };
          break;
        }
        case 'couleurRayon': {
          c = champCouleurRayon(v[f.cle]);
          bloc = el('fieldset', { class: 'champ' }, [el('legend', { texte: f.libelle }), c.element]);
          lecteur = function (q) { q[f.cle] = c.lire(); };
          break;
        }
        case 'case': {
          var idc = idChamp(), cb = el('input', { type: 'checkbox', id: idc, checked: !!v[f.cle] });
          bloc = el('div', { class: 'champ case' }, [el('label', { for: idc, class: 'interrupteur' }, [cb, el('span', { texte: f.libelle })])]);
          cb.addEventListener('change', function () { majDependances(); });
          bloc._lire = function () { return cb.checked; };
          bloc._cle = f.cle;
          lecteur = function (q) { q[f.cle] = cb.checked; };
          break;
        }
        case 'choix': {
          var nomg = 'g' + (++compteur), gr = el('div', { class: 'radios', role: 'radiogroup' });
          f.options.forEach(function (o) {
            gr.appendChild(el('label', { class: 'radio' }, [el('input', { type: 'radio', name: nomg, value: JSON.stringify(o.v), checked: v[f.cle] === o.v }), o.t]));
          });
          bloc = el('fieldset', { class: 'champ' }, [el('legend', { texte: f.libelle }), gr]);
          gr.addEventListener('change', function () { majDependances(); });
          bloc._cle = f.cle;
          bloc._lire = function () { var r = gr.querySelector('input:checked'); return r ? JSON.parse(r.value) : v[f.cle]; };
          lecteur = function (q) { q[f.cle] = bloc._lire(); };
          break;
        }
        case 'texte': {
          var idt = idChamp(), t = el('input', { type: 'text', id: idt, value: v[f.cle] || '', maxlength: 255 });
          bloc = el('div', { class: 'champ' }, [el('label', { for: idt, texte: f.libelle }), t]);
          lecteur = function (q) { q[f.cle] = t.value; };
          break;
        }
        case 'liste': case 'chemins': {
          var idl = idChamp(), l = el('input', { type: 'text', id: idl, value: v[f.cle] || '', autocomplete: 'off', spellcheck: 'false' });
          bloc = el('div', { class: 'champ' }, [el('label', { for: idl, texte: f.libelle }), l]);
          if (f.k === 'chemins') dependances.push({ cle: 'tracersurfacesonde', bloc: bloc });
          lecteur = function (q) {
            var r = f.k === 'liste' ? normaliserListe(l.value) : normaliserChemins(l.value);
            if (!r.ok) return r.erreur;
            q[f.cle] = r.v;
          };
          break;
        }
        case 'indices': {
          var sel = el('select', { 'aria-label': 'Matériau' }, [el('option', { value: '-1', texte: 'Saisie libre' })].concat(
            OGW.MATERIAUX.map(function (m, i) { return el('option', { value: String(i), texte: m.nom }); })));
          var ir = champTexteNombre(N(v.indicerouge, 10), '', null, v.indicerouge), iv = champTexteNombre(N(v.indicevert, 10), '', null, v.indicevert), ib = champTexteNombre(N(v.indicebleu, 10), '', null, v.indicebleu);
          sel.addEventListener('change', function () {
            var m = OGW.MATERIAUX[+sel.value]; if (!m) return;
            ir.input.value = N(m.rouge, 8); iv.input.value = N(m.vert, 8); ib.input.value = N(m.bleu, 8);
          });
          [ir, iv, ib].forEach(function (z) { z.input.addEventListener('input', function () { sel.value = '-1'; }); });
          bloc = el('div', { class: 'champ indices' }, [
            el('label', { class: 'etiquette', texte: 'Matériau' }), sel,
            el('div', { class: 'trois' }, [
              el('label', { for: ir.id }, [pastille(255), 'Rouge']), ir.ligne,
              el('label', { for: iv.id }, [pastille(32768), 'Vert']), iv.ligne,
              el('label', { for: ib.id }, [pastille(0xFF0000), 'Bleu']), ib.ligne]),
            el('p', { class: 'note', texte: 'Matériaux : indices à 656,3 nm (rouge), 587,6 nm (vert) et 486,1 nm (bleu). Trois indices différents : milieu dispersif.' })]);
          lecteur = function (q) {
            var a = valeurDe(ir.input), b = valeurDe(iv.input), d = valeurDe(ib.input);
            if (!(a > 0)) return 'Valeur inacceptable pour l’indice rouge.';
            if (!(b > 0)) return 'Valeur inacceptable pour l’indice vert.';
            if (!(d > 0)) return 'Valeur inacceptable pour l’indice bleu.';
            q.indicerouge = a; q.indicevert = b; q.indicebleu = d;
          };
          break;
        }
        case 'sommets': {
          var r = construireSommets(v, f.arcs, unite);
          bloc = r.element; lecteur = r.lire;
          break;
        }
        case 'police': {
          var r2 = construirePolice(v);
          bloc = r2.element; lecteur = r2.lire;
          break;
        }
        case 'nature':
          bloc = el('p', { class: 'note', texte: 'Nature actuelle : ' + OGW.natureConique(Math.abs(v.excentricite)).replace('Miroir ', 'miroir ') + '.' });
          break;
        case 'mesure': {
          var gm = g0, txt = '';
          if (type === 'metre') txt = 'Distance : ' + N(Math.sqrt(Math.pow(gm.a2x - gm.a1x, 2) + Math.pow(gm.a2y - gm.a1y, 2)), 6) + ' ' + unite;
          else {
            var t1 = Math.atan2(gm.a1y - gm.cy, gm.a1x - gm.cx), t2 = Math.atan2(gm.a2y - gm.cy, gm.a2x - gm.cx), dd = t2 - t1;
            while (dd < 0) dd += 2 * PI;
            txt = 'Angle : ' + N(OGW.deg(dd), 6) + '°';
          }
          bloc = el('p', { class: 'mesure', texte: txt });
          break;
        }
      }
      if (!bloc) return;
      corps.appendChild(bloc);
      if (lecteur) lecteurs.push({ bloc: bloc, lire: lecteur });
    });

    function majDependances() {
      var etat = {};
      lecteurs.forEach(function (l) { if (l.bloc._cle) etat[l.bloc._cle] = l.bloc._lire(); });
      dependances.forEach(function (d) {
        var actif = etat[d.cle] !== undefined ? !!etat[d.cle] : true;
        d.bloc.classList.toggle('inactif', !actif);
        OGW.$$('input,select,button', d.bloc).forEach(function (i) { i.disabled = !actif; });
      });
      // source virtuelle : pas de surfaces d'onde
      if (type === 'sourceponctuelle' && etat.sourcevirtuelle !== undefined) {
        OGW.$$('.champ', corps).forEach(function (b) {
          if (b._cle === 'tracersurfacesonde') { var i = b.querySelector('input'); i.disabled = etat.sourcevirtuelle; b.classList.toggle('inactif', etat.sourcevirtuelle); }
        });
      }
    }
    majDependances();

    var general = el('div', { class: 'erreur-generale', role: 'alert', hidden: true });
    corps.appendChild(general);

    function lireTout() {
      var q = JSON.parse(JSON.stringify(v)), premier = null;
      general.hidden = true;
      lecteurs.forEach(function (l) {
        var e = l.lire(q);
        erreurChamp(l.bloc, e || '');
        if (e && !premier) premier = l.bloc;
      });
      if (premier) { premier.scrollIntoView({ block: 'center' }); var i = premier.querySelector('input,select,button'); if (i) i.focus(); return null; }
      return depuisChamps(type, q, v);
    }
    function erreurGenerale(t) { general.textContent = t; general.hidden = false; general.scrollIntoView({ block: 'nearest' }); }

    var titre = (creation ? 'Ajout d’un' + (/^[aeéiouœ]/i.test(boite.titre) ? ' ' : (feminin(type) ? 'e ' : ' ')) : 'Propriétés de ' + demonstratif(type)) + boite.titre;
    if (creation) titre = titreCreation(type, boite.titre);
    if (!creation && type === 'miroirconique') titre = 'Propriétés de ce ' + OGW.natureConique(Math.abs(p0.excentricite)).toLowerCase();
    var boutons = [];
    if (!creation) boutons.push({ texte: 'Supprimer', classe: 'danger', icone: 'supprimer', action: function () { app.supprimer(id); app.fermerPanneau(); } });
    if (OGW.AIDE[type]) boutons.push({ texte: 'Aide', icone: 'aide', action: function () { app.ouvrirAide(OGW.AIDE[type]); return false; } });
    boutons.push({ texte: 'Annuler', action: function () { app.fermerPanneau(); } });
    boutons.push({ texte: 'Valider', principal: true, icone: 'valider', action: function () {
      var q = lireTout();
      if (!q) return false;
      if (type === 'mscore' && !scene.options.desactiverControle) {
        var corde = Math.sqrt(Math.pow(q.a2x - q.a1x, 2) + Math.pow(q.a2y - q.a1y, 2));
        if (corde > 2 * q.rayoncourbure) { erreurGenerale('La distance entre les points 1 et 2 doit être inférieure au double du rayon !'); return false; }
      }
      var r = creation ? app.ajouterObjet(type, q) : app.modifierObjet(id, q);
      if (!r.ok) { erreurGenerale(messageRefus(type) + (r.erreur ? ' (' + r.erreur + ')' : '')); return false; }
      app.fermerPanneau();
      if (creation && r.id) app.selectionner(r.id);
    } });
    app.ouvrirPanneau({ titre: titre, corps: corps, boutons: boutons, idObjet: id });
  }

  function feminin(t) { return ['lmc', 'lmd', 'lec', 'lsr', 'sourceponctuelle', 'ondeplane', 'sphere', 'metre', 'angle'].indexOf(t) >= 0; }
  function demonstratif(t) {
    if (t === 'oeil') return 'cet ';
    if (t === 'polyhedre') return 'ce ';
    return feminin(t) ? 'cette ' : 'ce ';
  }
  function titreCreation(type, t) {
    var art = feminin(type) ? 'une ' : 'un ';
    return 'Ajout d’' + art + t;
  }
  function messageRefus(t) {
    switch (t) {
      case 'miroirplan': case 'mscopa': case 'mscepa': return 'Taille du miroir trop petite !';
      case 'mscore': case 'mscere': return 'Taille du miroir trop petite, ou débordant de l’espace de travail !';
      case 'reseau': return 'Taille du réseau trop petite !';
      case 'lsr': return 'Taille de la lame trop petite !';
      case 'ecran': return 'Taille de l’écran trop petite !';
      case 'oeil': return 'Taille de l’œil trop petite !';
      case 'fleche': return 'Taille du trait trop petite ou points hors de l’espace de travail !';
      case 'sourceponctuelle': case 'ondeplane': return 'Valeurs entrées aberrantes !';
      case 'polyhedre': case 'polycercle': return 'Points aberrants !';
      case 'jolipoint': return 'Point trop petit ou en dehors de l’espace de travail !';
      case 'texte': return 'Valeurs non autorisées pour x ou y !';
      case 'metre': case 'angle': return 'Points trop proches ou hors de l’espace de travail !';
      case 'sphere': return 'Sphère trop grande ou débordant de l’espace de travail !';
      case 'rayon': return 'Points confondus ou hors de l’espace de travail !';
    }
    return 'Données aberrantes !';
  }

  /** Tableau des sommets (polyèdre, polycercle) : un sommet par ligne, ajout et retrait. */
  function construireSommets(v, arcs, unite) {
    var lignes = [];
    var conteneur = el('fieldset', { class: 'champ sommets' }, [el('legend', { texte: 'Sommets' })]);
    var table = el('div', { class: 'table-sommets' });
    conteneur.appendChild(table);
    var n0 = v.sommets.length;
    // côtés du polycercle : rectiligne / arc (rayon, côté, petit ou grand arc)
    function infoArc(i) {
      var A = v.sommets[i], B = v.sommets[(i + 1) % n0], T = v.mess ? v.mess[i] : null;
      var d = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2)) || 1;
      if (!T || (v.rectiligne && v.rectiligne[i])) return { droit: true, R: d, gauche: true, aigu: true };
      var I = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, n = { x: -(B.y - A.y) / d, y: (B.x - A.x) / d };
      var s = (T.x - I.x) * n.x + (T.y - I.y) * n.y, h = Math.abs(s) || 1e-9;
      var R = (h * h + d * d / 4) / (2 * h);
      return { droit: false, R: R, gauche: s > 0, aigu: h <= R };
    }
    function ajouterLigne(s, i, arc) {
      var cx = champTexteNombre(N(s.x, 10), unite, null, s.x), cy = champTexteNombre(N(s.y, 10), unite, null, s.y);
      var l = { cx: cx, cy: cy };
      var tete = el('div', { class: 'tete-sommet' }, [el('strong', { class: 'num' }), el('span', { class: 'outils' })]);
      var ligne = el('div', { class: 'ligne-sommet' }, [tete, el('label', { for: cx.id, texte: 'x =' }), cx.ligne, el('label', { for: cy.id, texte: 'y =' }), cy.ligne]);
      var suppr = el('button', { type: 'button', class: 'petit', texte: 'Retirer', onclick: function () {
        if (lignes.length <= (arcs ? 2 : 3)) return;
        var k = lignes.indexOf(l); lignes.splice(k, 1); ligne.remove(); renumeroter();
      } });
      var ins = el('button', { type: 'button', class: 'petit', texte: 'Insérer après', onclick: function () {
        var k = lignes.indexOf(l), suiv = lignes[(k + 1) % lignes.length];
        var x = (OGW.lireNombre(cx.input.value) + OGW.lireNombre(suiv.cx.input.value)) / 2, y = (OGW.lireNombre(cy.input.value) + OGW.lireNombre(suiv.cy.input.value)) / 2;
        var nl = ajouterLigne({ x: x, y: y }, k + 1, arc ? { droit: true, R: 1, gauche: true, aigu: true } : null);
        lignes.splice(lignes.indexOf(nl), 1); lignes.splice(k + 1, 0, nl);
        table.insertBefore(nl.ligne, ligne.nextSibling);
        renumeroter();
      } });
      tete.querySelector('.outils').appendChild(ins); tete.querySelector('.outils').appendChild(suppr);
      if (arcs) {
        var nomg = 'c' + (++compteur), info = arc || { droit: true, R: 1, gauche: true, aigu: true };
        var radD = el('input', { type: 'radio', name: nomg + 'd', value: '1', checked: info.droit }), radA = el('input', { type: 'radio', name: nomg + 'd', value: '0', checked: !info.droit });
        var cr = champTexteNombre(N(info.R, 8), unite);
        var radG = el('input', { type: 'radio', name: nomg + 'g', checked: info.gauche }), radDr = el('input', { type: 'radio', name: nomg + 'g', checked: !info.gauche });
        var radAi = el('input', { type: 'radio', name: nomg + 'a', checked: info.aigu }), radOb = el('input', { type: 'radio', name: nomg + 'a', checked: !info.aigu });
        var detail = el('div', { class: 'detail-arc' }, [
          el('div', { class: 'radios' }, [el('label', { class: 'radio' }, [radG, 'Renflement à gauche']), el('label', { class: 'radio' }, [radDr, 'Renflement à droite'])]),
          el('div', { class: 'radios' }, [el('label', { class: 'radio' }, [radAi, 'Angle au centre aigu (petit arc)']), el('label', { class: 'radio' }, [radOb, 'Obtus (grand arc)'])]),
          el('label', { for: cr.id, texte: 'Rayon de courbure Ri =' }), cr.ligne]);
        var cote = el('div', { class: 'cote' }, [el('span', { class: 'etiquette cote-titre' }),
          el('div', { class: 'radios' }, [el('label', { class: 'radio' }, [radD, 'Segment de droite']), el('label', { class: 'radio' }, [radA, 'Arc de cercle'])]), detail]);
        function majDetail() { detail.hidden = radD.checked; }
        radD.addEventListener('change', majDetail); radA.addEventListener('change', majDetail); majDetail();
        ligne.appendChild(cote);
        l.cote = { droit: function () { return radD.checked; }, R: cr, gauche: function () { return radG.checked; }, aigu: function () { return radAi.checked; }, titre: cote.querySelector('.cote-titre') };
      }
      l.ligne = ligne;
      lignes.push(l);
      table.appendChild(ligne);
      return l;
    }
    function renumeroter() {
      lignes.forEach(function (l, i) {
        l.ligne.querySelector('.num').textContent = 'Sommet ' + (i + 1);
        if (l.cote) l.cote.titre.textContent = 'Côté ' + (i + 1) + ' → ' + ((i + 1) % lignes.length + 1) + ' :';
      });
    }
    var modifie = false;
    conteneur.addEventListener('input', function () { modifie = true; });
    conteneur.addEventListener('change', function () { modifie = true; });
    conteneur.addEventListener('click', function (e) { if (e.target.closest('button.petit')) modifie = true; });
    v.sommets.forEach(function (s, i) { ajouterLigne(s, i, arcs ? infoArc(i) : null); });
    renumeroter();
    return {
      element: conteneur,
      lire: function (q) {
        var S = [], i;
        for (i = 0; i < lignes.length; i++) {
          var x = valeurDe(lignes[i].cx.input), y = valeurDe(lignes[i].cy.input);
          if (!isFinite(x) || !isFinite(y)) return 'Valeur inacceptable pour le sommet ' + (i + 1) + '.';
          S.push({ x: x, y: y });
        }
        q.sommets = S;
        if (!arcs) return;
        if (!modifie && lignes.length === n0) return;          // rien touché : on garde les sommets d'arc exacts
        var n = S.length, mess = [], rect = [];
        for (i = 0; i < n; i++) {
          var A = S[i], B = S[(i + 1) % n], d = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
          if (d === 0) return 'Deux sommets consécutifs confondus…';
          var I = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
          var c = lignes[i].cote;
          if (c.droit()) { rect.push(true); mess.push(I); continue; }
          var R = Math.abs(OGW.lireNombre(c.R.input.value));
          if (!isFinite(R)) return 'Valeur inacceptable pour Ri (côté ' + (i + 1) + ').';
          if (R < d / 2) return 'Ri (côté ' + (i + 1) + ') doit être au moins égal à la moitié de la corde (' + N(d / 2, 5) + ').';
          var racine = Math.sqrt(Math.max(0, R * R - d * d / 4)), h = c.aigu() ? R - racine : R + racine;
          var nn = { x: -(B.y - A.y) / d, y: (B.x - A.x) / d }, sg = c.gauche() ? 1 : -1;
          rect.push(false); mess.push({ x: I.x + sg * h * nn.x, y: I.y + sg * h * nn.y });
        }
        q.mess = mess; q.rectiligne = rect;
      }
    };
  }

  /** Police du texte : trois familles, taille, gras, italique, souligné, barré, couleur. */
  var FAMILLES = [{ v: 'Arial', t: 'Sans empattement (Arial)' }, { v: 'Times New Roman', t: 'Avec empattement (Times)' }, { v: 'Courier New', t: 'Chasse fixe (Courier)' }];
  OGW.FAMILLES_POLICE = FAMILLES;
  function construirePolice(v) {
    var nomg = 'p' + (++compteur), gr = el('div', { class: 'radios' });
    var connue = FAMILLES.some(function (f) { return f.v === v.policename; });
    FAMILLES.forEach(function (f) {
      gr.appendChild(el('label', { class: 'radio' }, [el('input', { type: 'radio', name: nomg, value: f.v, checked: f.v === v.policename || (!connue && f.v === 'Arial') }), f.t]));
    });
    var taille = OGW.champEntier(v.policesize || 10, 6, 72);
    var cases = [['policefsbold', 'Gras'], ['policefsitalic', 'Italique'], ['policefsunderline', 'Souligné'], ['policefsstrikeout', 'Barré']].map(function (c) {
      var i = el('input', { type: 'checkbox', checked: !!v[c[0]] });
      return { cle: c[0], input: i, el: el('label', { class: 'interrupteur' }, [i, el('span', { texte: c[1] })]) };
    });
    var couleur = OGW.champCouleur(v.policecolor);
    var element = el('fieldset', { class: 'champ police' }, [el('legend', { texte: 'Police' }), gr,
      !connue ? el('p', { class: 'note', texte: 'Police du fichier : « ' + v.policename + ' » (remplacée à l’affichage si elle manque sur l’appareil).' }) : null,
      el('div', { class: 'champ' }, [el('label', { for: taille.id, texte: 'Taille (points)' }), taille.element]),
      el('div', { class: 'cases' }, cases.map(function (c) { return c.el; })),
      el('div', { class: 'champ' }, [el('span', { class: 'etiquette', texte: 'Couleur' }), couleur.element])]);
    return {
      element: element,
      lire: function (q) {
        var r = gr.querySelector('input:checked');
        if (r && (connue || r.value !== 'Arial' || q.policename === undefined)) q.policename = r.value;
        if (r && !connue && r.value !== 'Arial') q.policename = r.value;
        var t = taille.lire(); if (!isFinite(t)) return 'Taille de 6 à 72.';
        q.policesize = t;
        cases.forEach(function (c) { q[c.cle] = c.input.checked; });
        q.policecolor = couleur.lire();
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Petites boîtes de création (texte, style du point)                  */
  /* ------------------------------------------------------------------ */
  OGW.dialogueTexte = function (depart, ok, annuler) {
    var v = Object.assign({}, OptGeo.types.texte.defauts, depart || {}, { texte: (depart && depart.texte) || '' });
    var t = el('input', { type: 'text', maxlength: 255, value: v.texte, 'aria-label': 'Texte' });
    var pol = construirePolice(v);
    var corps = el('div', { class: 'formulaire' }, [el('div', { class: 'champ' }, [el('label', { texte: 'Texte à afficher' }), t]), pol.element]);
    OGW.Dialogue({ titre: 'Saisir le texte à afficher', corps: corps, focus: t, boutons: [
      { texte: 'Annuler', annuler: true, action: function () { if (annuler) annuler(); } },
      { texte: 'Valider', principal: true, action: function () {
        var q = { texte: t.value };
        var e = pol.lire(q); if (e) { OGW.message(e); return false; }
        ok(q);
      } }] });
  };
  OGW.dialogueStylePoint = function (ok, annuler) {
    var prec = OGW.stockage.lire('stylePoint') || { style: 'tpcercle', taille: 10, epaisseur: 1, couleur: 0 };
    var nomg = 'sp' + (++compteur), gr = el('div', { class: 'radios' });
    stylesPoint().forEach(function (s) { gr.appendChild(el('label', { class: 'radio' }, [el('input', { type: 'radio', name: nomg, value: s.v, checked: s.v === prec.style }), s.t])); });
    var taille = OGW.champEntier(prec.taille, 1, 1000), ep = OGW.champEntier(prec.epaisseur, 1, 100), couleur = OGW.champCouleur(prec.couleur);
    var corps = el('div', { class: 'formulaire' }, [el('fieldset', { class: 'champ' }, [el('legend', { texte: 'Forme' }), gr]),
      el('div', { class: 'champ' }, [el('label', { for: taille.id, texte: 'Taille (en ‰ de la diagonale de l’espace de travail)' }), taille.element]),
      el('div', { class: 'champ' }, [el('span', { class: 'etiquette', texte: 'Couleur' }), couleur.element]),
      el('div', { class: 'champ' }, [el('label', { for: ep.id, texte: 'Épaisseur (pixels)' }), ep.element])]);
    OGW.Dialogue({ titre: 'Ajout d’un point', corps: corps, boutons: [
      { texte: 'Annuler', annuler: true, action: function () { if (annuler) annuler(); } },
      { texte: 'Valider', principal: true, action: function () {
        var s = { style: gr.querySelector('input:checked').value, taille: taille.lire(), epaisseur: ep.lire(), couleur: couleur.lire() };
        if (!isFinite(s.taille) || !isFinite(s.epaisseur)) { OGW.message('Valeur inacceptable.'); return false; }
        OGW.stockage.ecrire('stylePoint', s);
        ok(s);
      } }] });
  };

  OGW.Proprietes = { ouvrir: ouvrir, normaliserListe: normaliserListe };
})();
