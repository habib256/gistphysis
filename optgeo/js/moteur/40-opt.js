/*
 * OptGeo (portage JavaScript) — moteur, partie 4 : lecture et écriture des fichiers .opt.
 *
 * Portage de ray1.pas : procedure enregistrer (écriture, ligne 7555) et
 * TForm1.Ouvrirsimulation (lecture, ligne 8173). Le format est un texte ligne à
 * ligne : un en-tête (« NE PAS MODIFIER CE FICHIER », version, espace de travail,
 * options), puis une section par type d'objet (« Nombre de miroirs plans: »…),
 * puis les groupes et quelques options d'affichage.
 *
 * Lecture : comme readln de Free Pascal, une lecture de nombres prend les jetons de
 * la ligne courante (et des suivantes s'il en manque) puis abandonne la fin de la
 * ligne ; une lecture de chaîne prend la ligne entière. Les sections sont
 * reconnues par leur titre exact, dans n'importe quel ordre ; les lignes inconnues
 * sont ignorées. Les fichiers des versions anciennes (sans « Nombre maximal de
 * segments ») sont pris en charge comme dans l'original (versionfichier < 200).
 *
 * Écriture : même structure que OptGeo 3.03 (VERSION 301), réels au format
 * Free Pascal « ␣1.9160000000000000E+0003 » (17 chiffres significatifs, exposant
 * sur 4 chiffres), booléens TRUE/FALSE, fins de ligne CRLF. Un fichier écrit
 * ici se relit avec OptGeo 3.03.
 *
 * Encodage : les exemples fournis avec OptGeo 3.03 sont en UTF-8 (Lazarus) ; on
 * écrit en UTF-8 par défaut. versOctets / depuisOctets convertissent aussi en
 * Windows-1252 (Latin-1) pour les anciens fichiers.
 */
(function (racine) {
  'use strict';
  var OptGeo = racine.OptGeo;
  var C = OptGeo.couleurs;

  /* ------------------------------------------------------------------ */
  /* Format des nombres                                                  */
  /* ------------------------------------------------------------------ */
  /**
   * Réel au format writeln(extended) de Free Pascal : " 1.9160000000000000E+0003"
   * (signe ou espace, 17 chiffres significatifs, exposant sur 4 chiffres). On écrit
   * les chiffres de la plus courte écriture décimale qui redonne exactement le même
   * nombre (6.32E-7 et non 6.3200000000000003E-7), complétée par des zéros.
   */
  function reel(x) {
    x = Number(x);
    if (!isFinite(x)) x = 0;
    if (x === 0) return ' 0.0000000000000000E+0000';
    var s = Math.abs(x).toExponential();             // "1.916e+3" (écriture la plus courte exacte)
    var m = /^(\d)(?:\.(\d+))?e([+-])(\d+)$/.exec(s);
    var dec = (m[2] || '');
    if (dec.length > 16) { s = Math.abs(x).toExponential(16); m = /^(\d)(?:\.(\d+))?e([+-])(\d+)$/.exec(s); dec = m[2]; }
    while (dec.length < 16) dec += '0';
    var exp = m[4];
    while (exp.length < 4) exp = '0' + exp;
    return (x < 0 ? '-' : ' ') + m[1] + '.' + dec + 'E' + m[3] + exp;
  }
  function entier(x) { var n = Math.round(Number(x)); return String(isFinite(n) ? n : 0); }
  function booleen(b) { return b ? 'TRUE' : 'FALSE'; }
  /** Concaténation sans séparateur (writeln(f,a,b)) ; un espace est ajouté avant un nombre négatif. */
  function colle() {
    var s = '';
    for (var i = 0; i < arguments.length; i++) {
      var t = arguments[i];
      if (i > 0 && t.charAt(0) === '-') s += ' ';
      s += t;
    }
    return s;
  }
  OptGeo.formatReel = reel;

  var REFL_CODES = { 1: '1', 2: '2', 3: '3', 4: '4' };

  /* ------------------------------------------------------------------ */
  /* Écriture                                                            */
  /* ------------------------------------------------------------------ */
  /**
   * Écrit une scène au format .opt (texte, lignes CRLF).
   * @param {OptGeo.Scene} scene
   */
  function ecrireOpt(scene) {
    var o = scene.options, L = [], parType = {}, idxDans = {};
    OptGeo.ordreTypes.forEach(function (t) { parType[t] = []; });
    scene.objets.forEach(function (ob) {
      if (!parType[ob.type]) return;
      idxDans[ob.id] = { type: ob.type, indice: parType[ob.type].length + 1 };
      parType[ob.type].push(ob);
    });
    function w(s) { L.push(s); }
    function section(titre, liste, f) {
      w(titre); w(String(liste.length));
      liste.forEach(function (ob, i) { w('Numero ' + (i + 1)); f(ob); });
    }
    function refl(c) { return REFL_CODES[c] || '2'; }

    w('NE PAS MODIFIER CE FICHIER');
    w('VERSION');
    w(String(OptGeo.constantes.versionprogramme));
    w(reel(o.xxmin) + ' ' + reel(o.xxmax) + ' ' + reel(o.yymin) + ' ' + reel(o.yymax));
    w(booleen(o.respectrapport));
    w('UNITE'); w(o.unitelongueur);
    w('OPTIONS GRILLE'); w(booleen(o.tracergrille)); w(booleen(o.attractiongrille)); w(colle(reel(o.grillex), reel(o.grilley)));
    w('OPTIONS NORMALES'); w(booleen(o.optionnormale)); w(booleen(o.optionangles)); w(reel(o.pourcentagenormale));
    w(entier(o.couleurnormale)); w(entier(o.epaisseurnormale)); w(entier(o.decimalesangles));
    w('OPTIONS SEGMENTS FANTOMES'); w(booleen(o.fantomespresents)); w(o.listefantomes || '');
    w('NOMBRE POINTS TRACE SURFACE ONDE'); w(entier(o.maxrayonsrecherchesurfacesonde));
    w('INDICES PAR DEFAUT'); w(reel(o.indice_vert_par_defaut)); w(reel(o.indice_bleu_par_defaut)); w(reel(o.indice_rouge_par_defaut));
    w('LAMBDA'); w(reel(o.longueur_donde_red)); w(reel(o.longueur_donde_blue)); w(reel(o.longueur_donde_green));

    section('Nombre de miroirs plans:', parType.miroirplan, function (m) {
      w(reel(m.a1x) + ' ' + reel(m.a1y) + ' ' + reel(m.a2x) + ' ' + reel(m.a2y) + ' ' + entier(m.epaisseur) + ' ' + entier(m.couleur));
      w(booleen(m.hachures));
    });
    section('Nombre de reseaux:', parType.reseau, function (m) {
      w(colle(reel(m.a1x), reel(m.a1y), reel(m.a2x), reel(m.a2y)));
      w(entier(m.epaisseur)); w(entier(m.couleur)); w(reel(m.pas));
      w(booleen(m.entransmission)); w(booleen(m.hachures)); w(entier(m.ordre_min)); w(entier(m.ordre_max));
    });
    function msPara(m) {
      w(reel(m.a1x) + ' ' + reel(m.a1y) + ' ' + reel(m.a2x) + ' ' + reel(m.a2y) + ' ' + reel(m.focale) + ' ' +
        entier(m.epaisseur) + ' ' + entier(m.couleur) + ' ' + entier(m.couleuraxe));
      w(booleen(m.hachures)); w(booleen(m.axefocal)); w(booleen(m.trou)); w(reel(m.diametretrou));
    }
    section('Nombre de miroirs concaves paraxiaux:', parType.mscopa, msPara);
    section('Nombre de miroirs convexes paraxiaux:', parType.mscepa, msPara);
    function msReel(m) {
      w(reel(m.a1x) + ' ' + reel(m.a1y) + ' ' + reel(m.a2x) + ' ' + reel(m.a2y) + ' ' + reel(m.rayoncourbure) + ' ' +
        entier(m.epaisseur) + ' ' + entier(m.couleur) + ' ' + entier(m.couleuraxe));
      w(booleen(m.hachures)); w(booleen(m.axefocal)); w(booleen(m.aigu)); w(booleen(m.trou)); w(reel(m.diametretrou));
    }
    section('Nombre de miroirs concaves reels:', parType.mscore, msReel);
    section('Nombre de miroirs convexes reels:', parType.mscere, msReel);
    function lm(m) {
      w(reel(m.a1x) + ' ' + reel(m.a1y) + ' ' + reel(m.a2x) + ' ' + reel(m.a2y) + ' ' + reel(m.focale) + ' ' +
        entier(m.epaisseur) + ' ' + entier(m.couleur) + ' ' + entier(m.couleuraxe));
      w(booleen(m.axefocal));
    }
    section('Nombre de lentiles minces convergentes:', parType.lmc, lm);
    section('Nombre de lentiles minces divergentes:', parType.lmd, lm);
    section('Nombre de rayons:', parType.rayon, function (r) {
      w(reel(r.ax) + ' ' + reel(r.ay) + ' ' + reel(r.kx) + ' ' + reel(r.ky) + ' ' + entier(r.couleur) + ' ' +
        entier(r.epaisseur) + ' ' + entier(r.nombremaxenfant));
      w(r.vav || ''); w(r.vaa || '');
      w('Nombre maximal de segments:'); w(entier(r.maxsegment));
    });
    section('Nombre de sources ponctuelles:', parType.sourceponctuelle, function (s) {
      w(entier(s.nombrederayon) + ' ' + reel(s.sx) + ' ' + reel(s.sy) + ' ' + reel(s.a1x) + ' ' + reel(s.a1y) + ' ' +
        reel(s.a2x) + ' ' + reel(s.a2y) + ' ' + entier(s.couleur) + ' ' + entier(s.epaisseur) + ' ' + entier(s.maxenfantparrayon));
      w(s.vav || ''); w(s.vaa || ''); w(booleen(s.sourcevirtuelle)); w(booleen(s.tracersurfacesonde)); w(s.listechemins || '');
      w('Nombre maximal de segments par rayon:'); w(entier(s.maxsegment));
    });
    section('Nombre d\'ondes planes:', parType.ondeplane, function (s) {
      w(entier(s.nombrederayon) + ' ' + reel(s.sx) + ' ' + reel(s.sy) + ' ' + reel(s.a1x) + ' ' + reel(s.a1y) + ' ' +
        reel(s.a2x) + ' ' + reel(s.a2y) + ' ' + entier(s.couleur) + ' ' + entier(s.epaisseur) + ' ' + entier(s.maxenfantparrayon));
      w(s.vav || ''); w(s.vaa || ''); w(booleen(s.tracersurfacesonde)); w(s.listechemins || '');
      w('Nombre maximal de segments par rayon:'); w(entier(s.maxsegment));
    });
    section('Nombre d\'ecrans:', parType.ecran, function (m) {
      w(reel(m.a1x) + ' ' + reel(m.a1y) + ' ' + reel(m.a2x) + ' ' + reel(m.a2y) + ' ' + entier(m.epaisseur) + ' ' + entier(m.couleur));
    });
    section('Nombre de diaphragmes:', parType.diaphragme, function (m) {
      w(reel(m.cx) + ' ' + reel(m.cy) + ' ' + reel(m.anglepolaire) + ' ' + colle(reel(m.rint), reel(m.rext)) + ' ' +
        entier(m.epaisseur) + ' ' + entier(m.couleur));
    });
    section('Nombre de lames semi reflechissantes:', parType.lsr, function (m) {
      w(reel(m.a1x) + ' ' + reel(m.a1y) + ' ' + reel(m.a2x) + ' ' + reel(m.a2y) + ' ' + entier(m.epaisseur) + ' ' + entier(m.couleur));
    });
    function milieu(m) {
      w(reel(m.indicerouge) + ' ' + reel(m.indicebleu) + ' ' + reel(m.indicevert));
      w(entier(m.couleurbord) + ' ' + entier(m.couleurfond));
      w(refl(m.reflechientrant)); w(refl(m.reflechisortant));
    }
    section('Nombre de polyhedres:', parType.polyhedre, function (m) {
      w(String(m.sommets.length));
      m.sommets.forEach(function (s) { w(reel(s.x) + ' ' + reel(s.y)); });
      milieu(m);
    });
    section('Nombre de prismes:', parType.prisme, function (m) {
      w(reel(m.gx) + ' ' + reel(m.gy)); w(reel(m.ax) + ' ' + reel(m.ay)); w(reel(m.bx) + ' ' + reel(m.by));
      milieu(m);
    });
    section('Nombre de polycercles:', parType.polycercle, function (m) {
      w(String(m.sommets.length));
      m.sommets.forEach(function (s) { w(reel(s.x) + ' ' + reel(s.y)); });
      m.mess.forEach(function (s) { w(reel(s.x) + ' ' + reel(s.y)); });
      m.rectiligne.forEach(function (b) { w(booleen(b)); });
      milieu(m);
    });
    section('Nombre de spheres:', parType.sphere, function (m) {
      w(reel(m.cx) + ' ' + reel(m.cy) + ' ' + reel(m.rayon) + ' ' + reel(m.indicerouge) + ' ' + reel(m.indicebleu) + ' ' + reel(m.indicevert));
      w(entier(m.couleurbord) + ' ' + entier(m.couleurfond));
      w(refl(m.reflechientrant)); w(refl(m.reflechisortant));
    });
    section('Nombre de miroirs coniques:', parType.miroirconique, function (m) {
      w(reel(m.fx) + ' ' + reel(m.fy) + ' ' + reel(m.excentricite) + ' ' + reel(m.parametre) + ' ' +
        reel(m.theta0) + ' ' + reel(m.theta1) + ' ' + reel(m.theta2));
      w(entier(m.couleur) + ' ' + entier(m.couleuraxe));
      w(booleen(m.hachures)); w(booleen(m.axefocal)); w(booleen(m.concave));
    });
    section('Nombre de textes:', parType.texte, function (m) {
      w(m.texte);
      w(reel(m.x) + ' ' + reel(m.y));
      w(entier(m.policecharset) + ' ' + entier(m.policecolor));
      w(m.policename); w(entier(m.policesize));
      w(m.policefsbold ? 'fsbold' : 'no'); w(m.policefsitalic ? 'fsitalic' : 'no');
      w(m.policefsunderline ? 'fsunderline' : 'no'); w(m.policefsstrikeout ? 'fsstrikeout' : 'no');
      w(['fpDefault', 'fpVariable', 'fpFixed'].indexOf(m.policepitch) >= 0 ? m.policepitch : 'fpDefault');
    });
    section('Nombre de lentilles epaisses:', parType.lec, function (m) {
      w(reel(m.s1x) + ' ' + reel(m.s1y) + ' ' + reel(m.s2x) + ' ' + reel(m.s2y) + ' ' + reel(m.r1) + ' ' + reel(m.r2) + ' ' + reel(m.diametre));
      w(entier(m.couleurfond) + ' ' + entier(m.couleuraxe));
      w(booleen(m.axefocal));
      w(reel(m.indicerouge) + ' ' + reel(m.indicebleu) + ' ' + reel(m.indicevert));
      w(refl(m.reflechientrant)); w(refl(m.reflechisortant));
    });
    section('Nombre d\'angles:', parType.angle, function (m) {
      w(reel(m.cx) + ' ' + reel(m.cy) + ' ' + reel(m.a1x) + ' ' + reel(m.a1y) + ' ' + reel(m.a2x) + ' ' + reel(m.a2y));
    });
    section('Nombre de traits:', parType.fleche, function (m) {
      w(reel(m.a1x) + ' ' + reel(m.a1y) + ' ' + reel(m.a2x) + ' ' + reel(m.a2y));
      w(entier(m.epaisseur) + '  ' + entier(m.couleur));
      w(m.ext1); w(m.ext2); w(m.styletrait);
      w(entier(m.taille1) + '  ' + entier(m.taille2));
    });
    section('Nombre d\'oeils:', parType.oeil, function (m) {
      w(reel(m.cx) + ' ' + reel(m.cy) + ' ' + reel(m.ax) + ' ' + reel(m.ay) + ' ' + entier(m.epaisseur) + ' ' + entier(m.couleur));
    });
    section('Nombre de mesures de distances', parType.metre, function (m) {
      w(reel(m.a1x) + '  ' + reel(m.a1y) + '  ' + reel(m.a2x) + '  ' + reel(m.a2y));
    });
    section('Nombre de jolis points', parType.jolipoint, function (m) {
      w(reel(m.a1x) + '  ' + reel(m.a1y));
      w(entier(m.taille) + '  ' + entier(m.epaisseur) + '  ' + entier(m.couleur));
      w(m.style);
    });
    // Groupes
    var groupes = scene.groupes.map(function (g) {
      return g.membres.map(function (id) { return idxDans[id]; }).filter(function (x) { return !!x; });
    }).filter(function (m) { return m.length > 0; });
    w('Nombre de groupes:'); w(String(groupes.length));
    groupes.forEach(function (membres, i) {
      w('Numero groupe' + (i + 1)); w(String(membres.length));
      membres.forEach(function (m) { w(String(m.indice)); w(OptGeo.types[m.type].md); });
    });
    w('couleur fond simulation'); w(entier(o.couleurfondsimulation));
    w('empennage'); w('position'); w(entier(o.positionempennage)); w('taille'); w(entier(o.tailleempennage));
    w('OPTIONS AFFICHER LONGUEUR SEGMENT'); w(booleen(o.afficher_longueurs_segments));
    return L.join('\r\n') + '\r\n';
  }

  /* ------------------------------------------------------------------ */
  /* Lecture                                                             */
  /* ------------------------------------------------------------------ */
  var RE_NOMBRE = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;

  function Lecteur(texte) {
    if (texte.charCodeAt(0) === 0xFEFF) texte = texte.slice(1);
    this.lignes = texte.split(/\r\n|\n|\r/);
    if (this.lignes.length && this.lignes[this.lignes.length - 1] === '') this.lignes.pop();
    this.n = 0;
  }
  Lecteur.prototype.eof = function () { return this.n >= this.lignes.length; };
  /** readln(f, s) : une ligne entière (chaîne vide en fin de fichier). */
  Lecteur.prototype.ligne = function () { return this.eof() ? '' : this.lignes[this.n++]; };
  /** readln(f, a, b, …) : k nombres, en passant aux lignes suivantes si besoin. */
  Lecteur.prototype.nombres = function (k) {
    var res = [];
    while (res.length < k) {
      if (this.eof()) throw OptGeo.Erreur('Fin de fichier inattendue (ligne ' + (this.n + 1) + ').');
      var l = this.lignes[this.n++], m = l.match(RE_NOMBRE) || [];
      for (var i = 0; i < m.length && res.length < k; i++) res.push(parseFloat(m[i]));
    }
    return res;
  };
  Lecteur.prototype.nombre = function () { return this.nombres(1)[0]; };

  function bool(s) { return s === 'TRUE'; }
  function codeRefl(s) { return (s === '1' || s === '2' || s === '3' || s === '4') ? +s : 2; }
  var MD_VERS_TYPE = {};

  /**
   * Lit un texte .opt.
   * @param {string} texte contenu du fichier
   * @param {object} [opts] {strict: true pour lever une erreur sur un objet invalide
   *        (comportement d'OptGeo : « fichier endommagé »), options: options de scène}
   * @returns {{scene: OptGeo.Scene, avertissements: string[], nonPrisEnCharge: string[]}}
   */
  function lireOpt(texte, opts) {
    opts = opts || {};
    if (!Object.keys(MD_VERS_TYPE).length) for (var t in OptGeo.types) MD_VERS_TYPE[OptGeo.types[t].md] = t;
    var scene = new OptGeo.Scene(opts.options);
    var o = scene.options;
    var f = new Lecteur(texte);
    var av = [], inconnues = [];
    var versionfichier = 221;
    var parType = {};
    OptGeo.ordreTypes.forEach(function (ty) { parType[ty] = []; });
    var groupesBruts = [];

    function ajouter(type, p) {
      var r = scene.valider(type, p);
      if (!r.ok) {
        var msg = 'Objet ' + OptGeo.types[type].libelle + ' n° ' + (parType[type].length + 1) + ' refusé : ' + r.erreur;
        if (opts.strict) throw OptGeo.Erreur('Fichier endommagé. ' + msg);
        av.push(msg);
        parType[type].push(null);
        return;
      }
      var id = scene.ajouter(type, r.p).id;
      parType[type].push(id);
    }
    function lireMilieu(p) {
      var ind = f.nombres(3); p.indicerouge = ind[0]; p.indicebleu = ind[1]; p.indicevert = ind[2];
      var cb = f.nombres(2); p.couleurbord = cb[0]; p.couleurfond = cb[1];
      p.reflechientrant = codeRefl(f.ligne()); p.reflechisortant = codeRefl(f.ligne());
    }

    var SECTIONS = {
      'Nombre de miroirs plans:': function () {
        var v = f.nombres(6); var p = { a1x: v[0], a1y: v[1], a2x: v[2], a2y: v[3], epaisseur: v[4], couleur: v[5] };
        p.hachures = bool(f.ligne()); ajouter('miroirplan', p);
      },
      'Nombre de reseaux:': function () {
        var v = f.nombres(4); var p = { a1x: v[0], a1y: v[1], a2x: v[2], a2y: v[3] };
        p.epaisseur = f.nombre(); p.couleur = f.nombre(); p.pas = f.nombre();
        p.entransmission = bool(f.ligne()); p.hachures = bool(f.ligne());
        p.ordre_min = f.nombre(); p.ordre_max = f.nombre();
        ajouter('reseau', p);
      },
      'Nombre de miroirs concaves paraxiaux:': function () { msPara('mscopa'); },
      'Nombre de miroirs convexes paraxiaux:': function () { msPara('mscepa'); },
      'Nombre de miroirs concaves reels:': function () { msReel('mscore'); },
      'Nombre de miroirs convexes reels:': function () { msReel('mscere'); },
      'Nombre de lentiles minces convergentes:': function () { lm('lmc'); },
      'Nombre de lentiles minces divergentes:': function () { lm('lmd'); },
      'Nombre de rayons:': function () {
        var v = f.nombres(7);
        var p = { ax: v[0], ay: v[1], kx: v[2], ky: v[3], couleur: v[4], epaisseur: v[5], nombremaxenfant: v[6] };
        p.vav = f.ligne(); p.vaa = f.ligne();
        if (versionfichier >= 200) { f.ligne(); p.maxsegment = f.nombre(); } else p.maxsegment = OptGeo.constantes.maxmaxsegment;
        ajouter('rayon', p);
      },
      'Nombre de sources ponctuelles:': function () {
        var v = f.nombres(10);
        var p = { nombrederayon: v[0], sx: v[1], sy: v[2], a1x: v[3], a1y: v[4], a2x: v[5], a2y: v[6], couleur: v[7], epaisseur: v[8], maxenfantparrayon: v[9] };
        p.vav = f.ligne(); p.vaa = f.ligne(); p.sourcevirtuelle = bool(f.ligne()); p.tracersurfacesonde = bool(f.ligne());
        p.listechemins = f.ligne();
        if (versionfichier >= 200) { f.ligne(); p.maxsegment = f.nombre(); } else p.maxsegment = OptGeo.constantes.maxmaxsegment;
        ajouter('sourceponctuelle', p);
      },
      'Nombre d\'ondes planes:': function () {
        var v = f.nombres(10);
        var p = { nombrederayon: v[0], sx: v[1], sy: v[2], a1x: v[3], a1y: v[4], a2x: v[5], a2y: v[6], couleur: v[7], epaisseur: v[8], maxenfantparrayon: v[9] };
        p.vav = f.ligne(); p.vaa = f.ligne(); p.tracersurfacesonde = bool(f.ligne()); p.listechemins = f.ligne();
        if (versionfichier >= 200) { f.ligne(); p.maxsegment = f.nombre(); } else p.maxsegment = OptGeo.constantes.maxmaxsegment;
        ajouter('ondeplane', p);
      },
      'Nombre d\'ecrans:': function () {
        var v = f.nombres(6); ajouter('ecran', { a1x: v[0], a1y: v[1], a2x: v[2], a2y: v[3], epaisseur: v[4], couleur: v[5] });
      },
      'Nombre de diaphragmes:': function () {
        var v = f.nombres(7);
        ajouter('diaphragme', { cx: v[0], cy: v[1], anglepolaire: v[2], rint: v[3], rext: v[4], epaisseur: v[5], couleur: v[6] });
      },
      'Nombre de lames semi reflechissantes:': function () {
        var v = f.nombres(6); ajouter('lsr', { a1x: v[0], a1y: v[1], a2x: v[2], a2y: v[3], epaisseur: v[4], couleur: v[5] });
      },
      'Nombre de polyhedres:': function () {
        var n = f.nombre(), p = { sommets: [] };
        for (var j = 0; j < n; j++) { var s = f.nombres(2); p.sommets.push({ x: s[0], y: s[1] }); }
        lireMilieu(p); ajouter('polyhedre', p);
      },
      'Nombre de prismes:': function () {
        var g = f.nombres(2), a = f.nombres(2), b = f.nombres(2);
        var p = { gx: g[0], gy: g[1], ax: a[0], ay: a[1], bx: b[0], by: b[1] };
        lireMilieu(p); ajouter('prisme', p);
      },
      'Nombre de polycercles:': function () {
        var n = f.nombre(), p = { sommets: [], mess: [], rectiligne: [] }, j, s;
        for (j = 0; j < n; j++) { s = f.nombres(2); p.sommets.push({ x: s[0], y: s[1] }); }
        for (j = 0; j < n; j++) { s = f.nombres(2); p.mess.push({ x: s[0], y: s[1] }); }
        for (j = 0; j < n; j++) p.rectiligne.push(bool(f.ligne()));
        lireMilieu(p); ajouter('polycercle', p);
      },
      'Nombre de spheres:': function () {
        var v = f.nombres(6);
        var p = { cx: v[0], cy: v[1], rayon: v[2], indicerouge: v[3], indicebleu: v[4], indicevert: v[5] };
        var cb = f.nombres(2); p.couleurbord = cb[0]; p.couleurfond = cb[1];
        p.reflechientrant = codeRefl(f.ligne()); p.reflechisortant = codeRefl(f.ligne());
        ajouter('sphere', p);
      },
      'Nombre de miroirs coniques:': function () {
        var v = f.nombres(7);
        var p = { fx: v[0], fy: v[1], excentricite: v[2], parametre: v[3], theta0: v[4], theta1: v[5], theta2: v[6] };
        var c = f.nombres(2); p.couleur = c[0]; p.couleuraxe = c[1];
        p.hachures = bool(f.ligne()); p.axefocal = bool(f.ligne()); p.concave = bool(f.ligne());
        ajouter('miroirconique', p);
      },
      'Nombre de textes:': function () {
        var p = { texte: f.ligne() };
        var xy = f.nombres(2); p.x = xy[0]; p.y = xy[1];
        var cc = f.nombres(2); p.policecharset = cc[0]; p.policecolor = cc[1];
        p.policename = f.ligne(); p.policesize = f.nombre();
        p.policefsbold = f.ligne() === 'fsbold'; p.policefsitalic = f.ligne() === 'fsitalic';
        p.policefsunderline = f.ligne() === 'fsunderline'; p.policefsstrikeout = f.ligne() === 'fsstrikeout';
        var pitch = f.ligne(); p.policepitch = (['fpDefault', 'fpVariable', 'fpFixed'].indexOf(pitch) >= 0) ? pitch : 'fpDefault';
        ajouter('texte', p);
      },
      'Nombre de lentilles epaisses:': function () {
        var v = f.nombres(7);
        var p = { s1x: v[0], s1y: v[1], s2x: v[2], s2y: v[3], r1: v[4], r2: v[5], diametre: v[6] };
        var c = f.nombres(2); p.couleurfond = c[0]; p.couleuraxe = c[1];
        p.axefocal = bool(f.ligne());
        var ind = f.nombres(3); p.indicerouge = ind[0]; p.indicebleu = ind[1]; p.indicevert = ind[2];
        p.reflechientrant = codeRefl(f.ligne()); p.reflechisortant = codeRefl(f.ligne());
        ajouter('lec', p);
      },
      'Nombre d\'angles:': function () {
        var v = f.nombres(6); ajouter('angle', { cx: v[0], cy: v[1], a1x: v[2], a1y: v[3], a2x: v[4], a2y: v[5] });
      },
      'Nombre de traits:': function () {
        var v = f.nombres(4); var p = { a1x: v[0], a1y: v[1], a2x: v[2], a2y: v[3] };
        var ec = f.nombres(2); p.epaisseur = ec[0]; p.couleur = ec[1];
        var e1 = f.ligne(), e2 = f.ligne(), st = f.ligne();
        p.ext1 = OptGeo.EXTREMITES.indexOf(e1) >= 0 ? e1 : 'trien';
        p.ext2 = OptGeo.EXTREMITES.indexOf(e2) >= 0 ? e2 : 'trien';
        p.styletrait = OptGeo.STYLES_TRAIT.indexOf(st) >= 0 ? st : 'pssolid';
        var tt = f.nombres(2); p.taille1 = tt[0]; p.taille2 = tt[1];
        ajouter('fleche', p);
      },
      'Nombre d\'oeils:': function () {
        var v = f.nombres(6); ajouter('oeil', { cx: v[0], cy: v[1], ax: v[2], ay: v[3], epaisseur: v[4], couleur: v[5] });
      },
      'Nombre de mesures de distances': function () {
        var v = f.nombres(4); ajouter('metre', { a1x: v[0], a1y: v[1], a2x: v[2], a2y: v[3] });
      },
      'Nombre de jolis points': function () {
        var v = f.nombres(2), t = f.nombres(3), st = f.ligne();
        ajouter('jolipoint', { a1x: v[0], a1y: v[1], taille: t[0], epaisseur: t[1], couleur: t[2],
          style: OptGeo.STYLES_POINT.indexOf(st) >= 0 ? st : 'tpcroixp' });
      }
    };
    function msPara(type) {
      var v = f.nombres(8);
      var p = { a1x: v[0], a1y: v[1], a2x: v[2], a2y: v[3], focale: v[4], epaisseur: v[5], couleur: v[6], couleuraxe: v[7] };
      p.hachures = bool(f.ligne()); p.axefocal = bool(f.ligne()); p.trou = bool(f.ligne()); p.diametretrou = f.nombre();
      ajouter(type, p);
    }
    function msReel(type) {
      var v = f.nombres(8);
      var p = { a1x: v[0], a1y: v[1], a2x: v[2], a2y: v[3], rayoncourbure: v[4], epaisseur: v[5], couleur: v[6], couleuraxe: v[7] };
      p.hachures = bool(f.ligne()); p.axefocal = bool(f.ligne()); p.aigu = bool(f.ligne()); p.trou = bool(f.ligne());
      p.diametretrou = f.nombre();
      ajouter(type, p);
    }
    function lm(type) {
      var v = f.nombres(8);
      var p = { a1x: v[0], a1y: v[1], a2x: v[2], a2y: v[3], focale: v[4], epaisseur: v[5], couleur: v[6], couleuraxe: v[7] };
      p.axefocal = bool(f.ligne());
      ajouter(type, p);
    }

    var TYPE_DE_SECTION = {};
    // Les objets sont validés avec l'espace de travail lu dans l'en-tête : il faut
    // donc lire l'en-tête d'abord (il est toujours en tête dans les fichiers d'OptGeo).
    while (!f.eof()) {
      var s1 = f.ligne();
      if (s1 === 'NE PAS MODIFIER CE FICHIER') continue;
      if (s1 === 'VERSION') {
        versionfichier = f.nombre();
        var e = f.nombres(4);
        o.xxmin = e[0]; o.xxmax = e[1]; o.yymin = e[2]; o.yymax = e[3];
        o.respectrapport = bool(f.ligne());
        continue;
      }
      if (s1 === 'UNITE') { o.unitelongueur = f.ligne(); continue; }
      if (s1 === 'OPTIONS GRILLE') {
        o.tracergrille = bool(f.ligne()); o.attractiongrille = bool(f.ligne());
        var gg = f.nombres(2); o.grillex = gg[0]; o.grilley = gg[1];
        continue;
      }
      if (s1 === 'OPTIONS NORMALES') {
        o.optionnormale = bool(f.ligne()); o.optionangles = bool(f.ligne());
        o.pourcentagenormale = f.nombre(); o.couleurnormale = f.nombre(); o.epaisseurnormale = f.nombre();
        o.decimalesangles = f.nombre();
        continue;
      }
      if (s1 === 'OPTIONS SEGMENTS FANTOMES') { o.fantomespresents = bool(f.ligne()); o.listefantomes = f.ligne(); continue; }
      if (s1 === 'NOMBRE POINTS TRACE SURFACE ONDE') { o.maxrayonsrecherchesurfacesonde = f.nombre(); continue; }
      if (s1 === 'INDICES PAR DEFAUT') {
        o.indice_vert_par_defaut = f.nombre(); o.indice_bleu_par_defaut = f.nombre(); o.indice_rouge_par_defaut = f.nombre();
        continue;
      }
      if (s1 === 'LAMBDA') {
        o.longueur_donde_red = f.nombre(); o.longueur_donde_blue = f.nombre(); o.longueur_donde_green = f.nombre();
        continue;
      }
      if (SECTIONS[s1]) {
        var n = f.nombre();
        for (var i = 0; i < n; i++) { f.ligne(); SECTIONS[s1](); }
        continue;
      }
      if (s1 === 'Nombre de groupes:') {
        var ng = f.nombre();
        for (var gi = 0; gi < ng; gi++) {
          f.ligne();
          var ne = f.nombre(), membres = [];
          for (var k = 0; k < ne; k++) {
            var papa = f.nombre(), md = f.ligne();
            membres.push({ indice: papa, type: MD_VERS_TYPE[md] || null, md: md });
          }
          groupesBruts.push(membres);
        }
        continue;
      }
      if (s1 === 'couleur fond simulation') { o.couleurfondsimulation = f.nombre(); continue; }
      if (s1 === 'empennage') { f.ligne(); o.positionempennage = f.nombre(); f.ligne(); o.tailleempennage = f.nombre(); continue; }
      if (s1 === 'OPTIONS AFFICHER LONGUEUR SEGMENT') { o.afficher_longueurs_segments = bool(f.ligne()); continue; }
      if (s1.trim() !== '' && /^[A-Za-z]/.test(s1) && !TYPE_DE_SECTION[s1]) inconnues.push(s1);
    }
    o.versionfichier = versionfichier;
    // Groupes : (indice dans la liste du type, type) -> id
    groupesBruts.forEach(function (membres) {
      var ids = [];
      membres.forEach(function (m) {
        if (!m.type) { if (m.md !== 'mdneant') av.push('Groupe : type inconnu « ' + m.md + ' » ignoré.'); return; }
        var id = parType[m.type][m.indice - 1];
        if (id) ids.push(id); else av.push('Groupe : élément ' + m.md + ' n° ' + m.indice + ' introuvable.');
      });
      if (ids.length) scene.groupes.push({ membres: ids });
    });
    scene._modifie();
    return { scene: scene, avertissements: av, nonPrisEnCharge: inconnues };
  }

  /* ------------------------------------------------------------------ */
  /* Octets                                                              */
  /* ------------------------------------------------------------------ */
  // Windows-1252 : caractères 0x80–0x9F
  var CP1252 = [0x20AC, 0, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0, 0x017D, 0,
    0, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0, 0x017E, 0x0178];

  /** Texte -> octets (Uint8Array) ; encodage 'utf-8' (défaut) ou 'windows-1252' / 'latin1'. */
  function versOctets(texte, encodage) {
    encodage = (encodage || 'utf-8').toLowerCase();
    if (encodage === 'utf-8' || encodage === 'utf8') {
      if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(texte);
      var u = unescape(encodeURIComponent(texte)), a = new Uint8Array(u.length);
      for (var i = 0; i < u.length; i++) a[i] = u.charCodeAt(i);
      return a;
    }
    var r = new Uint8Array(texte.length);
    for (var j = 0; j < texte.length; j++) {
      var c = texte.charCodeAt(j);
      if (c < 0x80 || (c >= 0xA0 && c <= 0xFF)) r[j] = c;
      else { var k = CP1252.indexOf(c); r[j] = k >= 0 ? 0x80 + k : 0x3F; }
    }
    return r;
  }
  /** Octets -> texte : UTF-8 si valide, sinon Windows-1252. */
  function depuisOctets(octets) {
    var b = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
    if (typeof TextDecoder !== 'undefined') {
      try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { /* pas de l'UTF-8 */ }
    }
    var s = '';
    for (var i = 0; i < b.length; i++) {
      var c = b[i];
      s += String.fromCharCode((c >= 0x80 && c < 0xA0 && CP1252[c - 0x80]) ? CP1252[c - 0x80] : c);
    }
    return s;
  }

  /**
   * Superposer une simulation à la scène (TForm1.SuperposeSimulation, ray1.pas 9198) :
   * l'espace de travail devient la réunion des deux, les objets du fichier sont
   * ajoutés à la suite et réunis dans un nouveau groupe (100 éléments au plus,
   * comme groupe.add) ; les groupes du fichier ne sont pas repris. Si
   * ecraserOptions est vrai (question « Les paramètres… » de l'original), les
   * options du fichier remplacent celles de la scène.
   * @returns {{ok, ids: string[], avertissements: string[]}}
   */
  function superposerOpt(scene, texte, opts) {
    opts = opts || {};
    var r = lireOpt(texte), o = scene.options, n = r.scene.options;
    var garde = { xxmin: Math.min(o.xxmin, n.xxmin), xxmax: Math.max(o.xxmax, n.xxmax),
      yymin: Math.min(o.yymin, n.yymin), yymax: Math.max(o.yymax, n.yymax) };
    if (opts.ecraserOptions) {
      for (var k in n) if (['xxmin', 'xxmax', 'yymin', 'yymax', 'largeurEcranPx', 'hauteurEcranPx', 'desactiverControle'].indexOf(k) < 0) o[k] = n[k];
    }
    scene.modifierOptions(garde);
    var ids = [], av = r.avertissements.slice();
    r.scene.objets.forEach(function (ob) {
      var res = scene.ajouter(ob.type, r.scene.parametres(ob.id));
      if (res.ok) ids.push(res.id); else av.push('Objet ' + ob.type + ' non importé : ' + res.erreur);
    });
    if (ids.length) scene.grouper(ids);
    return { ok: true, ids: ids, avertissements: av };
  }

  OptGeo.superposerOpt = superposerOpt;
  OptGeo.ecrireOpt = ecrireOpt;
  OptGeo.lireOpt = lireOpt;
  OptGeo.versOctets = versOctets;
  OptGeo.depuisOctets = depuisOctets;
  OptGeo._Lecteur = Lecteur;
})(typeof globalThis !== 'undefined' ? globalThis : this);
