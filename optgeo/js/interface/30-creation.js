/*
 * OptGeo web — interface, partie 3 : création des objets point par point.
 *
 * Portage des séquences de clics d'OptGeo 3.03 (ray1.pas, Image1MouseDown ;
 * SPEC-INTERFACE.md §5) : chaque objet se construit en autant de points
 * qu'OptGeo demande de clics, avec la même consigne et le même aperçu ; les
 * points « projetés » (foyer sur l'axe, centre de courbure, bord extérieur du
 * diaphragme, base du prisme, sommet d'arc…) le sont pendant la visée.
 * Les petites boîtes (nombre de rayons, de sommets, « Relier les points »,
 * diamètre de la lentille épaisse, texte, style du point) arrivent au même
 * moment de la séquence, avec un bouton « Annuler » en plus.
 */
(function () {
  'use strict';
  var OGW = window.OGW, OptGeo = window.OptGeo;
  var PI = Math.PI;
  function dist(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); }
  function mil(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  /** Normale « à gauche » (repère y vers le haut) de a→b, unitaire. */
  function normale(a, b) { var d = dist(a, b) || 1; return { x: -(b.y - a.y) / d, y: (b.x - a.x) / d }; }
  function projeterDroite(m, o, u) { var l = (m.x - o.x) * u.x + (m.y - o.y) * u.y; return { x: o.x + l * u.x, y: o.y + l * u.y, l: l }; }

  /* ------------------------------------------------------------------ */
  /* Les outils (boutons de la palette)                                  */
  /* ------------------------------------------------------------------ */
  var P1 = 'Placez le point 1 (premier bord du miroir).', P2 = 'Placez le point 2 (autre bord du miroir).';
  var OUTILS = {
    miroirplan: { type: 'miroirplan', titre: 'Ajouter un miroir plan', court: 'Miroir plan', mode: 'ajout d’un miroir plan', consignes: [P1, P2], erreur: 'Taille du miroir trop petite, ou débordant de l’espace de travail !' },
    lsr: { type: 'lsr', titre: 'Ajouter une lame semi-réfléchissante', court: 'Lame semi-réfl.', mode: 'ajout d’une lame semi-réfléchissante', consignes: ['Placez le point 1 (premier bord de la lame).', 'Placez le point 2 (autre bord de la lame).'], erreur: 'Taille de la lame trop petite !' },
    mscopa: { type: 'mscopa', titre: 'Ajouter un miroir sphérique concave paraxial', court: 'Concave idéal', mode: 'ajout d’un miroir sphérique concave', consignes: [P1, P2, 'Placez le foyer (sur le demi-axe tracé).'], erreur: 'Taille du miroir trop petite ou focale trop courte, ou débordant de l’espace de travail !' },
    mscepa: { type: 'mscepa', titre: 'Ajouter un miroir sphérique convexe paraxial', court: 'Convexe idéal', mode: 'ajout d’un miroir sphérique convexe', consignes: [P1, P2, 'Placez le foyer (sur le demi-axe tracé).'], erreur: 'Taille du miroir trop petite ou focale trop courte, ou débordant de l’espace de travail !' },
    mscore: { type: 'mscore', titre: 'Ajouter un miroir sphérique concave réel', court: 'Concave réel', mode: 'ajout d’un miroir sphérique concave', consignes: [P1, P2, 'Placez le centre de courbure (sur l’axe tracé).'], erreur: 'Taille du miroir trop petite ou focale trop courte, ou miroir débordant de l’espace de travail !' },
    mscere: { type: 'mscere', titre: 'Ajouter un miroir sphérique convexe réel', court: 'Convexe réel', mode: 'ajout d’un miroir sphérique convexe', consignes: [P1, P2, 'Placez le centre de courbure (sur l’axe tracé).'], erreur: 'Taille du miroir trop petite ou focale trop courte, ou miroir débordant de l’espace de travail !' },
    coniqueconcave: { type: 'miroirconique', concave: true, titre: 'Ajouter un miroir parabolique (ou elliptique, hyperbolique) concave', court: 'Conique concave', mode: 'ajout d’un miroir conique concave', consignes: ['Placez le premier bord du miroir (point 1).', 'Placez le foyer de la conique.', 'Placez le sommet de la conique.', 'Pour finir, placez l’autre extrémité du miroir.'], erreur: 'Données de construction du miroir aberrantes !' },
    coniqueconvexe: { type: 'miroirconique', concave: false, titre: 'Ajouter un miroir parabolique (ou elliptique, hyperbolique) convexe', court: 'Conique convexe', mode: 'ajout d’un miroir conique convexe', consignes: ['Placez le premier bord du miroir (point 1).', 'Placez le foyer de la conique.', 'Placez le sommet de la conique.', 'Pour finir, placez l’autre extrémité du miroir.'], erreur: 'Données de construction du miroir aberrantes !' },
    ecran: { type: 'ecran', titre: 'Ajouter un écran', court: 'Écran', mode: 'ajout d’un écran', consignes: ['Placez le point 1 (premier bord de l’écran).', 'Placez le point 2 (autre bord de l’écran).'], erreur: 'Taille de l’écran trop petite !' },
    diaphragme: { type: 'diaphragme', titre: 'Ajouter un diaphragme à iris', court: 'Diaphragme', mode: 'ajout d’un diaphragme', consignes: ['Placez le centre du diaphragme.', 'Placez le bord intérieur (point 1).', 'Placez le bord extérieur (point 2).'], erreur: 'Épaisseur du diaphragme trop petite, ou diaphragme débordant de l’espace de travail !' },
    rayon: { type: 'rayon', titre: 'Ajouter un rayon', court: 'Rayon', mode: 'ajout d’un rayon lumineux', consignes: ['Placez le point 1 (origine du rayon).', 'Placez le point 2 (direction du rayon).'], erreur: 'Points trop proches !' },
    sourcereelle: { type: 'sourceponctuelle', virtuelle: false, titre: 'Ajouter un objet ponctuel réel', court: 'Objet réel', mode: 'ajout d’une source ponctuelle', consignes: ['Placez le point objet réel.', 'Placez le point 1 (rayon 1 limitant le faisceau).', 'Placez le point 2 (rayon 2 limitant le faisceau).'], erreur: 'Valeurs entrées aberrantes !' },
    sourcevirtuelle: { type: 'sourceponctuelle', virtuelle: true, titre: 'Ajouter un objet ponctuel virtuel', court: 'Objet virtuel', mode: 'ajout d’une source ponctuelle', consignes: ['Placez le point objet virtuel.', 'Placez le point 1 (rayon 1 limitant le faisceau).', 'Placez le point 2 (rayon 2 limitant le faisceau).'], erreur: 'Valeurs entrées aberrantes !' },
    ondeplane: { type: 'ondeplane', titre: 'Ajouter une onde plane (faisceau parallèle)', court: 'Onde plane', mode: 'ajout d’une onde plane', consignes: ['Placez le point 1 (origine d’un rayon et du plan d’onde).', 'Placez le point D (direction des rayons).', 'Placez le point 2 (extrémité du plan d’onde).'], erreur: 'Valeurs entrées aberrantes !' },
    lmc: { type: 'lmc', titre: 'Ajouter une lentille mince convergente paraxiale', court: 'Convergente', mode: 'ajout d’une lentille mince convergente', consignes: ['Placez le point 1 (premier bord de la lentille).', 'Placez le point 2 (autre bord de la lentille).', 'Placez un foyer (sur l’axe optique tracé).'], erreur: 'Données aberrantes !' },
    lmd: { type: 'lmd', titre: 'Ajouter une lentille mince divergente paraxiale', court: 'Divergente', mode: 'ajout d’une lentille mince divergente', consignes: ['Placez le point 1 (premier bord de la lentille).', 'Placez le point 2 (autre bord de la lentille).', 'Placez un foyer (sur l’axe optique tracé).'], erreur: 'Données aberrantes !' },
    lec: { type: 'lec', titre: 'Ajouter une lentille épaisse', court: 'Lentille épaisse', mode: 'ajout d’une lentille épaisse', consignes: ['Placez le sommet de la 1re face.', 'Placez le sommet de la 2e face.', 'Placez le centre de courbure de la 1re face (sur l’axe).', 'Placez le centre de courbure de la 2e face (sur l’axe).'], erreur: 'Données aberrantes !' },
    polyhedre: { type: 'polyhedre', titre: 'Ajouter un polygone réfractant', court: 'Polygone', mode: 'ajout d’un polygone réfractant', consignes: [], erreur: 'Points saisis aberrants !' },
    prisme: { type: 'prisme', titre: 'Ajouter un prisme isocèle', court: 'Prisme', mode: 'ajout d’un prisme isocèle', consignes: ['Placez le centre d’inertie G du prisme.', 'Placez le point A (sommet du prisme).', 'Dernier point pour l’angle au sommet (sur la base tracée).'], erreur: 'Données aberrantes !' },
    sphere: { type: 'sphere', titre: 'Ajouter une sphère réfractante', court: 'Sphère', mode: 'ajout d’une sphère réfractante', consignes: ['Placez le centre de la sphère.', 'Placez un point de la surface.'], erreur: 'Rayon de la sphère trop petit ou trop grand !' },
    polycercle: { type: 'polycercle', titre: 'Ajouter un polycercle réfractant', court: 'Polycercle', mode: 'ajout d’un polycercle réfractant', consignes: [], erreur: 'Points saisis aberrants !' },
    metre: { type: 'metre', titre: 'Mesurer la distance entre deux points', court: 'Distance', mode: 'mesure de distance', consignes: ['Placez l’origine du segment.', 'Placez l’extrémité du segment.'], erreur: 'Points trop proches ou hors de l’espace de travail !', sansGrille: true },
    angle: { type: 'angle', titre: 'Mesurer un angle', court: 'Angle', mode: 'mesure d’angle', consignes: ['Placez le sommet de l’angle (intersection des côtés).', 'Placez un point du 1er côté.', 'Placez un point du 2e côté.'], erreur: 'Points trop proches ou hors de l’espace de travail !', sansGrille: true },
    texte: { type: 'texte', titre: 'Ajouter un texte sur le dessin', court: 'Texte', mode: 'ajout d’un texte', consignes: ['Placez le coin supérieur gauche du texte.'], erreur: 'Valeurs non autorisées pour x ou y !' },
    fleche: { type: 'fleche', titre: 'Ajouter un trait, une flèche…', court: 'Trait, flèche', mode: 'ajout d’un trait ou d’une flèche', consignes: ['Placez la première extrémité du trait.', 'Placez l’autre extrémité du trait.'], erreur: 'Taille du trait trop petite !' },
    oeil: { type: 'oeil', titre: 'Ajouter un œil stylisé', court: 'Œil', mode: 'ajout d’un œil', consignes: ['Placez le point 1 (rétine).', 'Placez le point 2 (centre de la pupille).'], erreur: 'Taille de l’œil trop petite !' },
    reseau: { type: 'reseau', titre: 'Ajouter un réseau diffractant', court: 'Réseau', mode: 'ajout d’un réseau diffractant', consignes: ['Placez le point 1 (premier bord du réseau).', 'Placez le point 2 (autre bord du réseau).'], erreur: 'Taille du réseau trop petite, ou débordant de l’espace de travail !' },
    jolipoint: { type: 'jolipoint', titre: 'Ajouter un point', court: 'Point', mode: 'ajout d’un point', consignes: ['Placez le point.'], erreur: 'Point trop petit ou en dehors de l’espace de travail !' }
  };
  Object.keys(OUTILS).forEach(function (k) { OUTILS[k].id = k; OUTILS[k].icone = k; });

  /** Familles de la palette (barres d'outils d'OptGeo). */
  OGW.FAMILLES = [
    { id: 'miroirs', nom: 'Miroirs', icone: 'mscore', outils: ['miroirplan', 'lsr', 'mscopa', 'mscepa', 'mscore', 'mscere', 'coniqueconcave', 'coniqueconvexe'] },
    { id: 'ecrans', nom: 'Écrans', icone: 'ecran', outils: ['ecran', 'diaphragme', 'oeil'] },
    { id: 'sources', nom: 'Sources', icone: 'sourcereelle', outils: ['rayon', 'sourcereelle', 'sourcevirtuelle', 'ondeplane'] },
    { id: 'dioptres', nom: 'Dioptres', icone: 'lmc', outils: ['lmc', 'lmd', 'lec', 'polyhedre', 'prisme', 'sphere', 'polycercle'] },
    { id: 'divers', nom: 'Divers', icone: 'angle', outils: ['metre', 'angle', 'texte', 'fleche', 'reseau', 'jolipoint', '*fantomes', '*commentaire'] }
  ];
  OGW.OUTILS = OUTILS;

  /* ------------------------------------------------------------------ */
  /* Une construction en cours                                           */
  /* ------------------------------------------------------------------ */
  function Creation(app, outil) {
    this.app = app; this.outil = outil; this.type = outil.type;
    this.points = [];          // points validés (monde)
    this.visee = null;         // point visé (monde, contraint) pendant le glisser / survol
    this.data = {};
    this.consignes = outil.consignes.slice();
    this.dernierParams = null;
  }
  OGW.Creation = Creation;

  Creation.prototype.nombrePoints = function () { return this.consignes.length; };
  Creation.prototype.etape = function () { return this.points.length; };
  Creation.prototype.consigne = function () { return this.consignes[this.points.length] || ''; };
  Creation.prototype.attraction = function () { return !this.outil.sansGrille; };
  /** Le dernier point validé (pour l'alignement horizontal / vertical). */
  Creation.prototype.precedent = function () { return this.points.length ? this.points[this.points.length - 1] : null; };

  /**
   * L'étape en cours impose-t-elle une projection (foyer sur l'axe, centre de courbure,
   * bord extérieur du diaphragme, base du prisme, centres de la lentille épaisse, fin du
   * miroir conique, sommet d'arc) ? Ces points ne sont pas attirés par la grille (SPEC O02).
   */
  Creation.prototype.etapeProjetee = function () {
    var k = this.points.length;
    switch (this.type) {
      case 'lmc': case 'lmd': case 'mscopa': case 'mscepa': case 'mscore': case 'mscere': case 'diaphragme': case 'prisme': return k === 2;
      case 'lec': return k >= 2;
      case 'miroirconique': return k === 3;
      case 'polycercle': return !!(this.data.arcs && k >= this.data.n);
    }
    return false;
  };

  /** Contraintes de l'étape en cours : renvoie le point corrigé (projeté). */
  Creation.prototype.contraindre = function (m) {
    var t = this.type, P = this.points, k = P.length, u, n, s, pr;
    switch (t) {
      case 'lmc': case 'lmd':
        if (k === 2) { n = normale(P[0], P[1]); pr = projeterDroite(m, mil(P[0], P[1]), n); return { x: pr.x, y: pr.y }; }
        break;
      case 'mscopa': case 'mscepa':
        if (k === 2) {
          n = normale(P[0], P[1]); if (t === 'mscepa') n = { x: -n.x, y: -n.y };
          s = mil(P[0], P[1]); pr = projeterDroite(m, s, n);
          var l = Math.max(pr.l, this.app.pixelsEnMonde(4));
          return { x: s.x + l * n.x, y: s.y + l * n.y };
        }
        break;
      case 'mscore': case 'mscere':
        if (k === 2) { pr = projeterDroite(m, mil(P[0], P[1]), normale(P[0], P[1])); return { x: pr.x, y: pr.y }; }
        break;
      case 'diaphragme':
        if (k === 2) {
          var d1 = dist(P[0], P[1]) || 1; u = { x: (P[1].x - P[0].x) / d1, y: (P[1].y - P[0].y) / d1 };
          pr = projeterDroite(m, P[0], u);
          var l2 = Math.max(pr.l, d1);
          return { x: P[0].x + l2 * u.x, y: P[0].y + l2 * u.y };
        }
        break;
      case 'lec':
        if (k >= 2) {
          var d2 = dist(P[0], P[1]) || 1; u = { x: (P[1].x - P[0].x) / d2, y: (P[1].y - P[0].y) / d2 };
          pr = projeterDroite(m, P[0], u); return { x: pr.x, y: pr.y };
        }
        break;
      case 'prisme':
        if (k === 2) {
          var G = P[0], A = P[1], H = { x: G.x - (A.x - G.x) / 2, y: G.y - (A.y - G.y) / 2 };
          n = normale(G, A); pr = projeterDroite(m, H, n); return { x: pr.x, y: pr.y };
        }
        break;
      case 'miroirconique':
        if (k === 3) {           // ramené sur la conique dans la direction F→pointeur
          var c = this.coniqueProvisoire();
          if (c) {
            var th = Math.atan2(m.y - c.fy, m.x - c.fx), den = 1 + c.e * Math.cos(th - c.t0);
            if (den > 1e-9) { var r = c.p / den; return { x: c.fx + r * Math.cos(th), y: c.fy + r * Math.sin(th) }; }
          }
        }
        break;
      case 'polycercle':
        if (this.data.arcs && k >= this.data.n) {
          var j = this.data.arcs[k - this.data.n], a = this.points[j], b = this.points[(j + 1) % this.data.n];
          pr = projeterDroite(m, mil(a, b), normale(a, b)); return { x: pr.x, y: pr.y };
        }
        break;
    }
    return m;
  };

  /** Conique provisoire (après M, F, S) : {fx, fy, e, p, t0}. */
  Creation.prototype.coniqueProvisoire = function () {
    var P = this.points;
    if (P.length < 3) return null;
    var q = OptGeo.types.miroirconique.depuisPoints(P[1].x, P[1].y, P[2].x, P[2].y, P[0].x, P[0].y, P[0].x, P[0].y);
    if (!q) return null;
    return { fx: q.fx, fy: q.fy, e: q.excentricite, p: q.parametre, t0: q.theta0 };
  };

  /**
   * Valide le point visé. Renvoie {etat: 'suite'|'fin'|'refus', erreur}.
   * 'fin' : la construction est terminée (objet créé ou boîte ouverte).
   */
  Creation.prototype.valider = function (m) {
    var app = this.app, P = this.points;
    // contrôle « points trop proches » : 8 px à l'écran (désactivable comme dans OptGeo)
    if (!app.scene.options.desactiverControle && this.type !== 'angle') {
      var mini = app.pixelsEnMonde(8);
      var trop = P.some(function (q) { return dist(q, m) < mini; });
      if (this.type === 'polycercle' && this.data.arcs && P.length >= this.data.n) trop = false;
      if (trop && !(this.type === 'polyhedre' && P.length >= 3 && dist(P[0], m) < mini)) return { etat: 'refus', erreur: 'Points trop proches !' };
    }
    // étapes intermédiaires avec refus propres
    if (this.type === 'miroirconique' && P.length === 2) {
      P.push(m);
      if (!this.coniqueProvisoire()) { P.pop(); return { etat: 'refus', erreur: 'Données de construction de la conique aberrantes !' }; }
      return { etat: 'suite' };
    }
    if (this.type === 'polyhedre' && P.length >= 3 && dist(P[0], m) < app.pixelsEnMonde(12)) {
      this.data.n = P.length;             // fermeture anticipée en touchant le premier sommet
      return this.terminer();
    }
    P.push(m);
    if (this.type === 'polycercle' && P.length === this.data.n) return this.demanderCotes();
    if (P.length < this.nombrePoints()) return { etat: 'suite' };
    return this.terminer();
  };

  /** Polycercle : choix segment / arc pour chaque côté (boîte « Relier les points »). */
  Creation.prototype.demanderCotes = function () {
    var self = this, n = this.data.n, choix = [];
    var corps = OGW.el('div', { class: 'liste-cotes' });
    corps.appendChild(OGW.el('p', { texte: 'Relier les points par :' }));
    for (var i = 0; i < n; i++) {
      var nomGr = 'cote' + i, ligne = OGW.el('fieldset', { class: 'choix-ligne' });
      ligne.appendChild(OGW.el('legend', { texte: 'Points ' + (i + 1) + ' et ' + ((i + 1) % n + 1) }));
      ['Un arc de cercle', 'Un segment de droite'].forEach(function (lib, v) {
        var lab = OGW.el('label', { class: 'radio' }, [OGW.el('input', { type: 'radio', name: nomGr, value: String(v), checked: v === 0 }), lib]);
        ligne.appendChild(lab);
      });
      corps.appendChild(ligne);
      choix.push(nomGr);
    }
    if (n === 2) corps.appendChild(OGW.el('p', { class: 'note', texte: 'Avec deux sommets : un côté en arc et un côté droit donnent une lentille plan-convexe.' }));
    OGW.Dialogue({
      titre: 'Relier les points', corps: corps,
      boutons: [
        { texte: 'Annuler', annuler: true, action: function () { self.app.terminerCreation(); } },
        { texte: 'Valider', principal: true, action: function () {
          var rect = choix.map(function (nm) { var r = corps.querySelector('input[name="' + nm + '"]:checked'); return r && r.value === '1'; });
          if (n === 2 && rect[0] && rect[1]) { OGW.message('Cette structure serait un segment…', 'Impossible !'); return false; }
          self.data.rectiligne = rect;
          self.data.arcs = [];
          rect.forEach(function (r, i) { if (!r) self.data.arcs.push(i); });
          self.data.arcs.forEach(function (j) {
            self.consignes.push('Placez le sommet de l’arc de cercle entre les points ' + (j + 1) + ' et ' + ((j + 1) % n + 1) + ' (sur la médiatrice tracée).');
          });
          if (!self.data.arcs.length) { var r2 = self.terminer(); self.app.apresEtape(r2); }
          else self.app.apresEtape({ etat: 'suite' });
        } }
      ]
    });
    return { etat: 'attente' };
  };

  /** Paramètres de base d'un nouvel objet (défauts du moteur + préférences de l'appareil). */
  Creation.prototype.base = function () { return this.app.parametresParDefaut(this.type); };

  /** Construit l'objet à partir des points ; ouvre au besoin la petite boîte finale. */
  Creation.prototype.terminer = function () {
    var self = this, t = this.type, P = this.points, b = this.base(), o = this.outil, p, n;
    switch (t) {
      case 'miroirplan': case 'lsr': case 'ecran': case 'fleche': case 'metre': case 'reseau':
        p = Object.assign(b, { a1x: P[0].x, a1y: P[0].y, a2x: P[1].x, a2y: P[1].y });
        if (t === 'reseau') Object.assign(p, { pas: 1e-3 / 500, entransmission: true, hachures: false, ordre_min: -1, ordre_max: 1 });
        return this.creer(p, (t === 'reseau' || t === 'fleche') ? 'proprietes' : null);
      case 'oeil':
        return this.creer(Object.assign(b, { cx: P[0].x, cy: P[0].y, ax: P[1].x, ay: P[1].y }));
      case 'rayon':
        return this.creer(Object.assign(b, { ax: P[0].x, ay: P[0].y, kx: P[1].x - P[0].x, ky: P[1].y - P[0].y, vav: '', vaa: '', nombremaxenfant: 10, maxsegment: 500 }));
      case 'lmc': case 'lmd':
        return this.creer(Object.assign(b, { a1x: P[0].x, a1y: P[0].y, a2x: P[1].x, a2y: P[1].y, focale: dist(P[2], mil(P[0], P[1])) }));
      case 'mscopa': case 'mscepa':
        return this.creer(Object.assign(b, { a1x: P[0].x, a1y: P[0].y, a2x: P[1].x, a2y: P[1].y, focale: dist(P[2], mil(P[0], P[1])), hachures: true, axefocal: true, trou: false, diametretrou: 0 }));
      case 'mscore': case 'mscere': {
        var C = P[2], t1 = Math.atan2(P[0].y - C.y, P[0].x - C.x), t2 = Math.atan2(P[1].y - C.y, P[1].x - C.x);
        if (t1 < 0) t1 += 2 * PI; if (t2 < t1) t2 += 2 * PI; if (t2 < t1) t2 += 2 * PI;
        return this.creer(Object.assign(b, { a1x: P[0].x, a1y: P[0].y, a2x: P[1].x, a2y: P[1].y, rayoncourbure: dist(C, P[0]),
          aigu: t2 - t1 <= PI, hachures: true, axefocal: true, trou: false, diametretrou: 0 }));
      }
      case 'miroirconique': {
        var q = OptGeo.types.miroirconique.depuisPoints(P[1].x, P[1].y, P[2].x, P[2].y, P[0].x, P[0].y, P[3].x, P[3].y, b);
        if (!q) return { etat: 'fin', erreur: o.erreur };
        q.concave = !!o.concave; q.hachures = true; q.axefocal = true;
        return this.creer(q);
      }
      case 'diaphragme':
        return this.creer(OptGeo.types.diaphragme.depuisPoints(P[0].x, P[0].y, P[1].x, P[1].y, P[2].x, P[2].y, b));
      case 'sphere':
        return this.creer(Object.assign(b, OGW.INDICES_DEFAUT, { cx: P[0].x, cy: P[0].y, rayon: dist(P[0], P[1]), reflechientrant: 2, reflechisortant: 2 }));
      case 'prisme':
        return this.creer(Object.assign(b, OGW.INDICES_DEFAUT, { gx: P[0].x, gy: P[0].y, ax: P[1].x, ay: P[1].y, bx: P[2].x, by: P[2].y, reflechientrant: 2, reflechisortant: 2 }));
      case 'polyhedre':
        n = this.data.n;
        return this.creer(Object.assign(b, OGW.INDICES_DEFAUT, { sommets: P.slice(0, n).map(function (q) { return { x: q.x, y: q.y }; }), reflechientrant: 2, reflechisortant: 2 }));
      case 'polycercle': {
        n = this.data.n;
        var mess = [], k = n;
        for (var i = 0; i < n; i++) {
          if (this.data.rectiligne[i]) mess.push(mil(P[i], P[(i + 1) % n]));
          else mess.push({ x: P[k].x, y: P[k++].y });
        }
        return this.creer(Object.assign(b, OGW.INDICES_DEFAUT, { sommets: P.slice(0, n).map(function (q) { return { x: q.x, y: q.y }; }),
          mess: mess, rectiligne: this.data.rectiligne.slice(), reflechientrant: 2, reflechisortant: 2 }));
      }
      case 'angle':
        return this.creer(Object.assign(b, { cx: P[0].x, cy: P[0].y, a1x: P[1].x, a1y: P[1].y, a2x: P[2].x, a2y: P[2].y }));
      case 'texte':
        return this.creer(Object.assign(b, this.data.texte, { x: P[0].x, y: P[0].y }));
      case 'jolipoint':
        return this.creer(Object.assign(b, this.data.style, { a1x: P[0].x, a1y: P[0].y }));
      case 'sourceponctuelle': case 'ondeplane': {
        var texte = t === 'ondeplane' ? 'Nombre de rayons du faisceau parallèle' :
          (o.virtuelle ? 'Nombre de rayons convergents vers cet objet virtuel' : 'Nombre de rayons émis par cette source ponctuelle');
        var defaut = OGW.stockage.lire('nombreRayons') || 5;
        OGW.demanderNombre({ titre: 'Nombre de rayons', texte: texte, min: 2, max: 50, valeur: defaut,
          ok: function (nb) {
            OGW.stockage.ecrire('nombreRayons', nb);
            var q2;
            if (t === 'sourceponctuelle') {
              // Bords du faisceau rangés dans le sens direct vu de S, pour que le faisceau couvre
              // le petit secteur (écart à OptGeo, qui garde l'ordre des clics : le grand secteur
              // reste possible en déplaçant ensuite une poignée ou dans les propriétés).
              var b1 = Math.atan2(P[1].y - P[0].y, P[1].x - P[0].x), b2 = Math.atan2(P[2].y - P[0].y, P[2].x - P[0].x), bal = b2 - b1;
              while (bal < 0) bal += 2 * PI;
              if (bal > PI) { var tmp = P[1]; P[1] = P[2]; P[2] = tmp; }
            }
            if (t === 'sourceponctuelle') q2 = Object.assign(b, { sx: P[0].x, sy: P[0].y, a1x: P[1].x, a1y: P[1].y, a2x: P[2].x, a2y: P[2].y,
              nombrederayon: nb, sourcevirtuelle: !!o.virtuelle, vav: o.virtuelle ? '(1)' : '', vaa: '', maxenfantparrayon: 10,
              tracersurfacesonde: false, listechemins: '', maxsegment: 500 });
            else q2 = Object.assign(b, { a1x: P[0].x, a1y: P[0].y, sx: P[1].x, sy: P[1].y, a2x: P[2].x, a2y: P[2].y, nombrederayon: nb,
              vav: '', vaa: '', maxenfantparrayon: 10, tracersurfacesonde: false, listechemins: '', maxsegment: 500 });
            self.app.apresEtape(self.creer(q2));
          },
          annuler: function () { self.app.terminerCreation(); } });
        return { etat: 'attente' };
      }
      case 'lec': {
        var S1 = P[0], S2 = P[1], C1 = P[2], C2 = P[3], ax = { x: S2.x - S1.x, y: S2.y - S1.y };
        var r1 = ((C1.x - S1.x) * ax.x + (C1.y - S1.y) * ax.y < 0) ? dist(C1, S1) : -dist(C1, S1);
        var r2 = ((C2.x - S2.x) * ax.x + (C2.y - S2.y) * ax.y < 0) ? dist(C2, S2) : -dist(C2, S2);
        if (dist(S1, S2) === 0 || r1 === 0 || r2 === 0) return { etat: 'fin', erreur: 'Sommets trop proches !' };
        var dmax = 2 * Math.min(Math.abs(r1), Math.abs(r2));
        OGW.demanderNombre({ titre: 'Diamètre de la lentille', texte: 'Saisissez le diamètre de la lentille', decimal: true,
          unite: this.app.scene.options.unitelongueur, valeur: OGW.nombre(Math.min(dmax * 0.8, dist(S1, S2) * 6), 4),
          ok: function (dia) {
            self.app.apresEtape(self.creer(Object.assign(b, OGW.INDICES_DEFAUT, { s1x: S1.x, s1y: S1.y, s2x: S2.x, s2y: S2.y, r1: r1, r2: r2,
              diametre: Math.abs(dia), axefocal: true, reflechientrant: 2, reflechisortant: 2 })));
          },
          annuler: function () { self.app.terminerCreation(); } });
        return { etat: 'attente' };
      }
    }
    return { etat: 'fin', erreur: 'Objet inconnu.' };
  };

  /** Ajoute l'objet à la scène (ou signale l'erreur d'OptGeo). */
  Creation.prototype.creer = function (p, ensuite) {
    var r = this.app.ajouterObjet(this.type, p);
    if (!r.ok) return { etat: 'fin', erreur: this.outil.erreur + (r.erreur ? ' (' + r.erreur + ')' : '') };
    return { etat: 'fin', id: r.id, ensuite: ensuite };
  };

  /** Boîtes à ouvrir AVANT les points (nombre de sommets, texte, style du point). */
  Creation.prototype.preparer = function (suite, abandon) {
    var self = this, t = this.type;
    if (t === 'polyhedre' || t === 'polycercle') {
      var mini = t === 'polyhedre' ? 3 : 2;
      OGW.demanderNombre({ titre: 'Nombre de sommets', texte: t === 'polyhedre' ? 'Sommets de ce polygone' : 'Sommets de ce polycercle',
        min: mini, max: 500, valeur: OGW.stockage.lire('nombreSommets' + t) || 4,
        ok: function (n) {
          OGW.stockage.ecrire('nombreSommets' + t, n);
          self.data.n = n;
          for (var i = 1; i <= n; i++) self.consignes.push(i === 1 ? 'Placez le sommet 1 sur ' + n + '.' :
            'Placez le sommet ' + i + ' sur ' + n + (t === 'polyhedre' && i > 3 ? ' (ou touchez le sommet 1 pour fermer).' : '.'));
          suite();
        }, annuler: abandon });
      return;
    }
    if (t === 'texte') { OGW.dialogueTexte(null, function (d) { self.data.texte = d; suite(); }, abandon); return; }
    if (t === 'jolipoint') { OGW.dialogueStylePoint(function (d) { self.data.style = d; suite(); }, abandon); return; }
    suite();
  };

  /* ------------------------------------------------------------------ */
  /* Aperçu de la construction (repères de l'écran, comme OptGeo)        */
  /* ------------------------------------------------------------------ */
  Creation.prototype.dessinerApercu = function (ctx, vue) {
    var self = this, P = this.points, m = this.visee, t = this.type, o = this.app.scene.options;
    var tous = m ? P.concat([m]) : P.slice();
    function E(p) { return vue.versEcran(p.x, p.y); }
    function ligne(a, b, couleur, tirets, ep) {
      var A = E(a), B = E(b);
      ctx.save(); ctx.setLineDash(tirets || [5, 4]); ctx.lineWidth = ep || 1.5; ctx.strokeStyle = couleur || '#333';
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore();
    }
    function droite(o0, u, couleur) {      // droite infinie (axe)
      var L = 1e6;
      ligne({ x: o0.x - L * u.x, y: o0.y - L * u.y }, { x: o0.x + L * u.x, y: o0.y + L * u.y }, couleur || '#1a5fd0', [8, 4, 2, 4], 1.2);
    }
    function cercle(c, r, couleur) {
      var C = E(c); ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3; ctx.strokeStyle = couleur || '#333';
      ctx.beginPath(); ctx.arc(C[0], C[1], Math.abs(r * vue.sx), 0, 2 * PI); ctx.stroke(); ctx.restore();
    }
    function point(p, couleur, r) {
      var A = E(p); ctx.save(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(A[0], A[1], r || 4.5, 0, 2 * PI);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = couleur || '#0000ff'; ctx.stroke(); ctx.restore();
    }
    function fantome(params) {           // objet provisoire, sans les rayons
      var r = self.app.scene.valider(t, Object.assign(self.base(), params));
      if (!r.ok || !OptGeo.dessinateurs[t]) return false;
      ctx.save(); ctx.globalAlpha = 0.75;
      try { OptGeo.dessinateurs[t](new OptGeo.Dessin(ctx, vue, o), r.g, o); } catch (e) { /* aperçu facultatif */ }
      ctx.restore();
      return true;
    }
    var k = P.length, n;
    switch (t) {
      case 'lmc': case 'lmd': case 'mscopa': case 'mscepa': case 'mscore': case 'mscere':
        if (k >= 2) {
          n = normale(P[0], P[1]); var s = mil(P[0], P[1]);
          if (t === 'mscopa' || t === 'mscepa') { var nn = t === 'mscepa' ? { x: -n.x, y: -n.y } : n; ligne(s, { x: s.x + 1e6 * nn.x, y: s.y + 1e6 * nn.y }, '#1a5fd0', [8, 4, 2, 4], 1.2); }
          else droite(s, n);
          ligne(P[0], P[1], '#000', [], 2);
          if (m && (t === 'mscore' || t === 'mscere')) cercle(m, dist(m, P[0]));
          if (m && (t === 'lmc' || t === 'lmd')) { point({ x: 2 * s.x - m.x, y: 2 * s.y - m.y }, '#00a0b0', 4); }
          if (m) fantomeFinal();
        }
        break;
      case 'miroirconique':
        if (k >= 3) {
          var c = this.coniqueProvisoire();
          if (c) {
            var pts = [], i;
            for (i = 0; i <= 360; i++) {
              var th = c.t0 + PI * (i / 180 - 1), den = 1 + c.e * Math.cos(th - c.t0);
              if (den <= 0.02) { if (pts.length > 1) trace(pts); pts = []; continue; }
              var r = c.p / den; if (r > 1e5) continue;
              pts.push(E({ x: c.fx + r * Math.cos(th), y: c.fy + r * Math.sin(th) }));
            }
            trace(pts);
          }
          ligne(P[1], P[2], '#1a5fd0', [8, 4, 2, 4], 1.2);
        }
        if (m && k === 3) fantomeFinal();
        break;
      case 'diaphragme':
        if (k >= 1 && m) {
          var c0 = P[0], a1 = k >= 2 ? P[1] : m, a2 = k >= 2 ? m : null;
          if (a2) {
            ligne(a1, a2, '#000', [], 2); ligne({ x: 2 * c0.x - a1.x, y: 2 * c0.y - a1.y }, { x: 2 * c0.x - a2.x, y: 2 * c0.y - a2.y }, '#000', [], 2);
          } else { point({ x: 2 * c0.x - a1.x, y: 2 * c0.y - a1.y }); }
        }
        break;
      case 'lec':
        if (k >= 2) {
          var d2 = dist(P[0], P[1]) || 1; droite(P[0], { x: (P[1].x - P[0].x) / d2, y: (P[1].y - P[0].y) / d2 }, '#c00000');
          if (k >= 3) cercle(P[2], dist(P[2], P[0]));
          if (m && k === 2) cercle(m, dist(m, P[0]));
          if (m && k === 3) cercle(m, dist(m, P[1]));
        }
        break;
      case 'sphere':
        if (k === 1 && m) cercle(P[0], dist(P[0], m), '#000');
        break;
      case 'prisme':
        if (k >= 1) {
          var G = P[0], A = k >= 2 ? P[1] : m;
          if (A) {
            var H = { x: G.x - (A.x - G.x) / 2, y: G.y - (A.y - G.y) / 2 };
            point(H, '#d00000', 3.5); point(G, '#d00000', 3.5); point(A, '#d00000', 3.5);
            if (k >= 2) { droite(H, normale(G, A), '#999'); if (m) { var B = m, C2 = { x: 2 * H.x - m.x, y: 2 * H.y - m.y }; ligne(A, B); ligne(B, C2); ligne(C2, A); } }
          }
        }
        break;
      case 'sourceponctuelle':
        if (k >= 1) { if (k >= 2) ligne(P[0], P[1], '#c00000', [5, 4], 1.5); if (m) ligne(P[0], m, '#c00000', [5, 4], 1.5); }
        break;
      case 'ondeplane':
        if (k >= 1) {
          if (k >= 2) {
            ligne(P[0], P[1], '#c00000', [5, 4], 1.5);
            if (m) {
              var dd = { x: P[1].x - P[0].x, y: P[1].y - P[0].y }, ld = Math.sqrt(dd.x * dd.x + dd.y * dd.y) || 1;
              var nr = { x: -dd.y / ld, y: dd.x / ld }, w = (m.x - P[0].x) * nr.x + (m.y - P[0].y) * nr.y;
              var p2 = { x: P[0].x + w * nr.x, y: P[0].y + w * nr.y };
              ligne(P[0], p2, '#333', [3, 3], 1.2); ligne(p2, { x: p2.x + dd.x, y: p2.y + dd.y }, '#c00000', [5, 4], 1.5);
            }
          } else if (m) ligne(P[0], m, '#c00000', [5, 4], 1.5);
        }
        break;
      case 'polyhedre':
        for (n = 1; n < tous.length; n++) ligne(tous[n - 1], tous[n], '#000', n === tous.length - 1 && m ? [5, 4] : [], 1.5);
        if (tous.length === this.data.n || (tous.length >= 3)) ligne(tous[tous.length - 1], tous[0], '#888', [2, 4], 1);
        break;
      case 'polycercle': {
        var N = this.data.n, sommets = tous.slice(0, N);
        for (n = 1; n < sommets.length; n++) ligne(sommets[n - 1], sommets[n], '#000', [5, 4], 1.2);
        if (sommets.length === N) ligne(sommets[N - 1], sommets[0], '#000', [5, 4], 1.2);
        sommets.forEach(function (q, i) {
          var A1 = E(q); ctx.save(); ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#00c'; ctx.fillText(String(i + 1), A1[0] + 6, A1[1] - 6); ctx.restore();
        });
        if (this.data.arcs && k >= N) {
          var idx = k - N;
          if (idx < this.data.arcs.length) {
            var j = this.data.arcs[idx], aa = P[j], bb = P[(j + 1) % N];
            point(aa, '#0000ff'); point(bb, '#0000ff');
            droite(mil(aa, bb), normale(aa, bb), '#999');
            if (m) arc3(aa, m, bb);
          }
          for (n = 0; n < idx; n++) { var jj = this.data.arcs[n]; arc3(P[jj], P[N + n], P[(jj + 1) % N]); }
        }
        break;
      }
      case 'angle':
        if (k >= 1) { if (k >= 2) ligne(P[0], P[1], '#000', [], 1.3); if (m) ligne(P[0], m, '#000', [], 1.3); }
        if (m && k === 2) fantomeFinal();
        break;
      default:
        if (k >= 1 && m) {
          if (['miroirplan', 'lsr', 'ecran', 'reseau', 'fleche', 'metre', 'rayon', 'oeil'].indexOf(t) >= 0) { if (!fantomeFinal()) ligne(P[0], m); }
          else ligne(P[k - 1], m);
        }
    }
    P.forEach(function (q) { point(q); });
    if (m) {
      var M = E(m);
      ctx.save(); ctx.strokeStyle = '#d00000'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(M[0] - 11, M[1]); ctx.lineTo(M[0] - 3, M[1]); ctx.moveTo(M[0] + 3, M[1]); ctx.lineTo(M[0] + 11, M[1]);
      ctx.moveTo(M[0], M[1] - 11); ctx.lineTo(M[0], M[1] - 3); ctx.moveTo(M[0], M[1] + 3); ctx.lineTo(M[0], M[1] + 11); ctx.stroke();
      ctx.restore();
    }
    function trace(pts) {
      if (pts.length < 2) return;
      ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.strokeStyle = '#333'; ctx.beginPath();
      pts.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.restore();
    }
    function arc3(a, s, b) {       // arc de cercle passant par a, s, b
      var ax2 = a.x, ay2 = a.y, bx = s.x, by = s.y, cx = b.x, cy = b.y;
      var d = 2 * (ax2 * (by - cy) + bx * (cy - ay2) + cx * (ay2 - by));
      if (Math.abs(d) < 1e-12) { ligne(a, b); return; }
      var ux = ((ax2 * ax2 + ay2 * ay2) * (by - cy) + (bx * bx + by * by) * (cy - ay2) + (cx * cx + cy * cy) * (ay2 - by)) / d;
      var uy = ((ax2 * ax2 + ay2 * ay2) * (cx - bx) + (bx * bx + by * by) * (ax2 - cx) + (cx * cx + cy * cy) * (bx - ax2)) / d;
      var r = Math.sqrt((ax2 - ux) * (ax2 - ux) + (ay2 - uy) * (ay2 - uy)), pts = [];
      var t1 = Math.atan2(ay2 - uy, ax2 - ux), ts = Math.atan2(by - uy, bx - ux), t2 = Math.atan2(cy - uy, cx - ux);
      function norm(x) { while (x < t1) x += 2 * PI; while (x >= t1 + 2 * PI) x -= 2 * PI; return x; }
      ts = norm(ts); t2 = norm(t2);
      if (ts > t2) t2 -= 2 * PI;
      for (var i = 0; i <= 64; i++) { var th = t1 + (t2 - t1) * i / 64; pts.push(E({ x: ux + r * Math.cos(th), y: uy + r * Math.sin(th) })); }
      trace(pts);
    }
    function fantomeFinal() {
      if (!m || k !== self.nombrePoints() - 1) return false;
      var Q = P.concat([m]);
      switch (t) {
        case 'miroirplan': case 'lsr': case 'ecran': case 'fleche': case 'metre': case 'reseau':
          return fantome({ a1x: Q[0].x, a1y: Q[0].y, a2x: Q[1].x, a2y: Q[1].y });
        case 'rayon': return false;
        case 'oeil': return fantome({ cx: Q[0].x, cy: Q[0].y, ax: Q[1].x, ay: Q[1].y });
        case 'lmc': case 'lmd': case 'mscopa': case 'mscepa':
          return fantome({ a1x: Q[0].x, a1y: Q[0].y, a2x: Q[1].x, a2y: Q[1].y, focale: dist(Q[2], mil(Q[0], Q[1])) });
        case 'mscore': case 'mscere': {
          var C = Q[2], t1 = Math.atan2(Q[0].y - C.y, Q[0].x - C.x), t2 = Math.atan2(Q[1].y - C.y, Q[1].x - C.x);
          if (t1 < 0) t1 += 2 * PI; if (t2 < t1) t2 += 2 * PI; if (t2 < t1) t2 += 2 * PI;
          return fantome({ a1x: Q[0].x, a1y: Q[0].y, a2x: Q[1].x, a2y: Q[1].y, rayoncourbure: dist(C, Q[0]), aigu: t2 - t1 <= PI });
        }
        case 'miroirconique': {
          var q = OptGeo.types.miroirconique.depuisPoints(Q[1].x, Q[1].y, Q[2].x, Q[2].y, Q[0].x, Q[0].y, Q[3].x, Q[3].y);
          if (!q) return false;
          q.concave = !!self.outil.concave;
          return fantome(q);
        }
        case 'angle': return fantome({ cx: Q[0].x, cy: Q[0].y, a1x: Q[1].x, a1y: Q[1].y, a2x: Q[2].x, a2y: Q[2].y });
      }
      return false;
    }
  };
})();
