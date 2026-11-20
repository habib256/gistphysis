/*
 * OptGeo (portage JavaScript) — moteur, partie 2 : la scène.
 *
 * Une scène réunit les options globales (espace de travail, grille, normales,
 * segments fantômes, indices et longueurs d'onde par défaut…), la liste des
 * objets optiques, les groupes et le commentaire. Elle remplace les variables
 * globales de ray1.pas / unit222.pas (xxmin…yymax, listemiroirplan, listegroupe…).
 *
 *   var s = new OptGeo.Scene();                  // espace par défaut (ray1.pas, metazero)
 *   var r = s.ajouter('lmc', {a1x:…, focale:…});  // {ok, id} ou {ok:false, erreur}
 *   s.modifier(r.id, {focale: 120});
 *   s.translater([r.id], 10, 0);  s.tourner([r.id], Math.PI/6);
 *   var t = s.tracer();                           // résultat mis en cache (30-trace.js)
 *
 * Chaque objet est un objet JS simple { id, type, ...paramètres } ; les paramètres
 * sont exactement ce que le fichier .opt contient (noms des champs Pascal).
 * L'ordre des objets d'un même type est celui des listes Pascal : il fixe l'ordre
 * d'écriture du .opt et l'ordre de tracé (donc la numérotation des segments,
 * utilisée par les « segments fantômes »).
 */
(function (racine) {
  'use strict';
  var OptGeo = racine.OptGeo;
  var C = OptGeo.couleurs, T = OptGeo.types;

  function copie(o) { return OptGeo.copie(o); }

  /** Options par défaut d'une scène neuve (ray1.pas metazero + unit222.pas initialization). */
  function optionsParDefaut(largeur, hauteur) {
    largeur = largeur || 1000; hauteur = hauteur || 700;
    var gx = largeur / 20, gy = hauteur / 20;
    var M = OptGeo.math;
    gx = M.intp(gx * 1.001 / M.puissance(10, M.partieentiere(Math.log10(gx)))) * M.puissance(10, M.partieentiere(Math.log10(gx)));
    gy = M.intp(gy * 1.001 / M.puissance(10, M.partieentiere(Math.log10(gy)))) * M.puissance(10, M.partieentiere(Math.log10(gy)));
    return {
      versionfichier: OptGeo.constantes.versionprogramme,
      xxmin: 0, xxmax: largeur, yymin: 0, yymax: hauteur,
      respectrapport: true,
      unitelongueur: 'mm',
      tracergrille: false, attractiongrille: false, grillex: gx, grilley: gy,
      optionnormale: true, optionangles: false, pourcentagenormale: 0.05,
      couleurnormale: C.clBlack, epaisseurnormale: 1, decimalesangles: 0,
      fantomespresents: false, listefantomes: '',
      maxrayonsrecherchesurfacesonde: 20,
      indice_vert_par_defaut: 1, indice_bleu_par_defaut: 1, indice_rouge_par_defaut: 1,
      // Longueurs d'onde : valeurs initiales d'unit222.pas (pas remises à zéro par metazero).
      longueur_donde_red: 632e-9, longueur_donde_blue: 450e-9, longueur_donde_green: 520e-9,
      couleurfondsimulation: C.clWhite,
      positionempennage: 500, tailleempennage: 5,
      afficher_longueurs_segments: false,
      // Propre au portage : taille (en pixels) de la zone d'affichage supposée, qui
      // fixe « taillemini » (tform1.taillemini : 2 pixels / 10) ; et la préférence
      // « désactiver le contrôle des points trop proches » (faux par défaut).
      largeurEcranPx: 1000, hauteurEcranPx: 700,
      desactiverControle: false
    };
  }
  OptGeo.optionsParDefaut = optionsParDefaut;

  var compteurId = 0;
  function nouvelId() { compteurId++; return 'o' + compteurId; }

  /**
   * Scène OptGeo.
   * @param {object} [options] options globales (complétées par les valeurs par défaut)
   */
  function Scene(options) {
    this.options = optionsParDefaut();
    if (options) for (var k in options) if (Object.prototype.hasOwnProperty.call(options, k)) this.options[k] = options[k];
    this.objets = [];          // [{id, type, ...paramètres}]
    this.groupes = [];         // [{membres: [id, …]}]
    this.commentaire = '';
    this._geom = Object.create(null);
    this._trace = null;
    this._version = 0;
  }
  OptGeo.Scene = Scene;

  /** Contexte de validation (espace de travail, taille minimale). */
  Scene.prototype.contexte = function () {
    var o = this.options;
    var t1 = 2 / (o.largeurEcranPx || 1000) * (o.xxmax - o.xxmin);
    var t2 = 2 / (o.hauteurEcranPx || 700) * (o.yymax - o.yymin);
    return {
      xxmin: o.xxmin, xxmax: o.xxmax, yymin: o.yymin, yymax: o.yymax,
      taillemini: Math.min(t1, t2) / 10,
      desactiverControle: !!o.desactiverControle
    };
  };

  /** Complète les paramètres avec les valeurs par défaut du type. */
  function completer(type, params) {
    var t = T[type], p = copie(params || {});
    if (t.defauts) for (var k in t.defauts) if (p[k] === undefined) p[k] = copie(t.defauts[k]);
    return p;
  }

  /** Valide des paramètres ; renvoie {ok, g, p} ou {ok:false, erreur}. */
  Scene.prototype.valider = function (type, params) {
    var t = T[type];
    if (!t) return { ok: false, erreur: 'Type d’objet inconnu : ' + type };
    var p = completer(type, params);
    try {
      var r = t.calculer(p, this.contexte());
      if (!r.ok) return r;
      return { ok: true, g: r.g, p: r.p };
    } catch (e) {
      return { ok: false, erreur: 'Objet invalide (' + e.message + ').' };
    }
  };

  Scene.prototype._modifie = function () { this._trace = null; this._version++; };

  /**
   * Ajoute un objet. Comme OptGeo, refuse un objet invalide (create = false).
   * @returns {{ok:boolean, id?:string, erreur?:string}}
   */
  Scene.prototype.ajouter = function (type, params) {
    var r = this.valider(type, params);
    if (!r.ok) return r;
    var obj = { id: (params && params.id) || nouvelId(), type: type };
    for (var k in r.p) if (k !== 'id' && k !== 'type') obj[k] = r.p[k];
    this.objets.push(obj);
    this._geom[obj.id] = r.g;
    this._modifie();
    return { ok: true, id: obj.id };
  };

  /** Ajout sans validation ni normalisation (lecture permissive) ; usage interne. */
  Scene.prototype._ajouterBrut = function (type, params) {
    var obj = { id: nouvelId(), type: type };
    for (var k in params) if (k !== 'id' && k !== 'type') obj[k] = params[k];
    this.objets.push(obj);
    this._modifie();
    return obj.id;
  };

  Scene.prototype.objet = function (id) {
    for (var i = 0; i < this.objets.length; i++) if (this.objets[i].id === id) return this.objets[i];
    return null;
  };
  Scene.prototype.indexDe = function (id) {
    for (var i = 0; i < this.objets.length; i++) if (this.objets[i].id === id) return i;
    return -1;
  };

  /** Paramètres d'un objet (copie), sans id ni type. */
  Scene.prototype.parametres = function (id) {
    var o = this.objet(id); if (!o) return null;
    var p = {};
    for (var k in o) if (k !== 'id' && k !== 'type') p[k] = copie(o[k]);
    return p;
  };

  /** Géométrie dérivée (create Pascal) d'un objet, recalculée si besoin. */
  Scene.prototype.geometrie = function (id) {
    if (this._geom[id]) return this._geom[id];
    var o = this.objet(id); if (!o) return null;
    var r = T[o.type].calculer(this.parametres(id), this.contexte());
    this._geom[id] = r.ok ? r.g : null;
    if (!r.ok) o._invalide = r.erreur;
    return this._geom[id];
  };

  /** Liste des objets d'un type, dans l'ordre des listes Pascal. */
  Scene.prototype.objetsDuType = function (type) {
    return this.objets.filter(function (o) { return o.type === type; });
  };

  /**
   * Modifie des paramètres. Si l'objet devient invalide, rien n'est changé.
   * @returns {{ok:boolean, erreur?:string}}
   */
  Scene.prototype.modifier = function (id, changements) {
    var o = this.objet(id);
    if (!o) return { ok: false, erreur: 'Objet introuvable.' };
    var p = this.parametres(id);
    for (var k in changements) if (k !== 'id' && k !== 'type') p[k] = copie(changements[k]);
    var r = this.valider(o.type, p);
    if (!r.ok) return r;
    this._remplacer(o, r);
    this._modifie();
    return { ok: true };
  };

  Scene.prototype._remplacer = function (o, r) {
    for (var k in o) if (k !== 'id' && k !== 'type') delete o[k];
    for (var k2 in r.p) if (k2 !== 'id' && k2 !== 'type') o[k2] = r.p[k2];
    delete o._invalide;
    this._geom[o.id] = r.g;
  };

  /** Supprime un objet (et le retire des groupes ; un groupe vide disparaît). */
  Scene.prototype.supprimer = function (id) {
    var i = this.indexDe(id);
    if (i < 0) return false;
    this.objets.splice(i, 1);
    delete this._geom[id];
    this.groupes.forEach(function (g) { g.membres = g.membres.filter(function (m) { return m !== id; }); });
    this.groupes = this.groupes.filter(function (g) { return g.membres.length > 0; });
    this._modifie();
    return true;
  };

  /** Duplique un objet, décalé de (dx, dy). @returns {{ok, id?, erreur?}} */
  Scene.prototype.dupliquer = function (id, dx, dy) {
    var o = this.objet(id);
    if (!o) return { ok: false, erreur: 'Objet introuvable.' };
    var p = OptGeo.transformerParametres(o.type, this.parametres(id),
      function (x, y) { return [x + (dx || 0), y + (dy || 0)]; }, null, 0);
    return this.ajouter(o.type, p);
  };

  /** Applique une transformation à plusieurs objets, tout ou rien (comme groupe.translate). */
  Scene.prototype._transformer = function (ids, fPoint, fVecteur, dAngle) {
    var self = this, nouveaux = [], i;
    for (i = 0; i < ids.length; i++) {
      var o = self.objet(ids[i]);
      if (!o) return { ok: false, erreur: 'Objet introuvable : ' + ids[i] };
      var p = OptGeo.transformerParametres(o.type, self.parametres(o.id), fPoint, fVecteur, dAngle);
      var r = self.valider(o.type, p);
      if (!r.ok) return { ok: false, erreur: r.erreur, id: o.id };
      nouveaux.push([o, r]);
    }
    nouveaux.forEach(function (c) { self._remplacer(c[0], c[1]); });
    this._modifie();
    return { ok: true };
  };

  /** Translation de plusieurs objets. */
  Scene.prototype.translater = function (ids, dx, dy) {
    return this._transformer(ids, function (x, y) { return [x + dx, y + dy]; }, null, 0);
  };

  /** Rotation d'angle a (radians, sens direct) autour de (cx, cy) ; centre par défaut : isobarycentre. */
  Scene.prototype.tourner = function (ids, a, cx, cy) {
    if (cx === undefined || cy === undefined) { var c = this.centre(ids); cx = c.x; cy = c.y; }
    var co = Math.cos(a), si = Math.sin(a);
    return this._transformer(ids,
      function (x, y) { var u = x - cx, v = y - cy; return [cx + co * u - si * v, cy + si * u + co * v]; },
      function (u, v) { return [co * u - si * v, si * u + co * v]; }, a);
  };

  /** Isobarycentre des points de référence (groupe.recalculeiso). */
  Scene.prototype.centre = function (ids) {
    var sx = 0, sy = 0, n = 0, self = this;
    ids.forEach(function (id) {
      var o = self.objet(id), g = self.geometrie(id);
      if (!o || !g) return;
      var c = OptGeo.centreObjet(o.type, g);
      sx += c.x; sy += c.y; n++;
    });
    return n ? { x: sx / n, y: sy / n } : { x: 0, y: 0 };
  };

  /* ---------------- Groupes ---------------- */
  Scene.prototype.grouper = function (ids) {
    var self = this;
    var membres = ids.filter(function (id, i) { return self.objet(id) && ids.indexOf(id) === i; });
    if (membres.length === 0) return -1;
    if (membres.length > OptGeo.constantes.maxelementsgroupe) membres = membres.slice(0, OptGeo.constantes.maxelementsgroupe);
    this.groupes.push({ membres: membres });
    this._modifie();
    return this.groupes.length - 1;
  };
  Scene.prototype.degrouper = function (indice) {
    if (indice < 0 || indice >= this.groupes.length) return false;
    this.groupes.splice(indice, 1);
    this._modifie();
    return true;
  };
  /** Groupes contenant un objet (indices). */
  Scene.prototype.groupesDe = function (id) {
    var r = [];
    this.groupes.forEach(function (g, i) { if (g.membres.indexOf(id) >= 0) r.push(i); });
    return r;
  };

  /* ---------------- Options ---------------- */
  /** Change des options. Changer l'espace de travail revalide tous les objets. */
  Scene.prototype.modifierOptions = function (changements) {
    var anc = copie(this.options);
    for (var k in changements) this.options[k] = changements[k];
    if (['xxmin', 'xxmax', 'yymin', 'yymax', 'largeurEcranPx', 'hauteurEcranPx', 'desactiverControle'].some(function (c) { return c in changements; })) {
      this._geom = Object.create(null);
      var invalides = [], self = this;
      this.objets.forEach(function (o) { if (!self.geometrie(o.id)) invalides.push(o.id); });
      if (invalides.length) {   // comme retaille_espace_possible : on refuse
        this.options = anc; this._geom = Object.create(null);
        return { ok: false, erreur: 'Des objets sortiraient de l’espace de travail.', ids: invalides };
      }
    }
    this._modifie();
    return { ok: true };
  };

  /** Le milieu est-il dispersif (unmilieudispersif) ? */
  Scene.prototype.unMilieuDispersif = function () {
    var self = this;
    return this.objets.some(function (o) {
      if (!OptGeo.estMilieu(o.type)) return false;
      var g = self.geometrie(o.id);
      return g && g.dispersif;
    });
  };

  /* ---------------- Tracé ---------------- */
  /** Trace tous les rayons (résultat mis en cache jusqu'à la prochaine modification). */
  Scene.prototype.tracer = function (opts) {
    if (this._trace && !opts) return this._trace;
    var t = OptGeo.tracerScene(this, opts);
    if (!opts) this._trace = t;
    return t;
  };
  /** À appeler si l'on a modifié scene.objets ou scene.options à la main. */
  Scene.prototype.invalider = function () { this._geom = Object.create(null); this._modifie(); };

  /* ---------------- Sérialisation (annuler / rétablir) ---------------- */
  Scene.prototype.versJSON = function () {
    return {
      format: 'optgeo-js-1',
      options: copie(this.options),
      objets: this.objets.map(function (o) { var c = copie(o); delete c._invalide; return c; }),
      groupes: copie(this.groupes),
      commentaire: this.commentaire
    };
  };
  Scene.depuisJSON = function (j) {
    if (typeof j === 'string') j = JSON.parse(j);
    var s = new Scene(j.options);
    s.objets = copie(j.objets || []);
    s.objets.forEach(function (o) {
      var n = /^o(\d+)$/.exec(o.id);
      if (n && +n[1] > compteurId) compteurId = +n[1];
    });
    s.groupes = copie(j.groupes || []);
    s.commentaire = j.commentaire || '';
    return s;
  };
  Scene.prototype.cloner = function () { return Scene.depuisJSON(this.versJSON()); };
  /** Remplace le contenu de la scène par un état (versJSON) — pour annuler/rétablir. */
  Scene.prototype.restaurer = function (j) {
    var s = Scene.depuisJSON(j);
    this.options = s.options; this.objets = s.objets; this.groupes = s.groupes; this.commentaire = s.commentaire;
    this._geom = Object.create(null);
    this._modifie();
  };

  /**
   * Historique annuler / rétablir par instantanés (OptGeo garde de même des copies
   * texte de la simulation : sauvevirtuel / charge_virtuel).
   *   var h = new OptGeo.Historique(scene); h.memoriser(); … h.annuler(); h.retablir();
   */
  function Historique(scene, max) {
    this.scene = scene; this.max = max || 100;
    this.pile = [JSON.stringify(scene.versJSON())]; this.position = 0;
  }
  Historique.prototype.memoriser = function () {
    var etat = JSON.stringify(this.scene.versJSON());
    if (etat === this.pile[this.position]) return false;
    this.pile = this.pile.slice(0, this.position + 1);
    this.pile.push(etat);
    if (this.pile.length > this.max) this.pile.shift();
    this.position = this.pile.length - 1;
    return true;
  };
  Historique.prototype.peutAnnuler = function () { return this.position > 0; };
  Historique.prototype.peutRetablir = function () { return this.position < this.pile.length - 1; };
  Historique.prototype.annuler = function () {
    if (!this.peutAnnuler()) return false;
    this.position--; this.scene.restaurer(this.pile[this.position]); return true;
  };
  Historique.prototype.retablir = function () {
    if (!this.peutRetablir()) return false;
    this.position++; this.scene.restaurer(this.pile[this.position]); return true;
  };
  OptGeo.Historique = Historique;
})(typeof globalThis !== 'undefined' ? globalThis : this);
