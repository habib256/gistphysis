/*
 * OptGeo web — interface, partie 0 : outils communs.
 *
 * D'après OptGeo 3.03 de Jean-Marie Biansan (GNU GPL v2 ou ultérieure).
 * Portage web de l'interface : 2026, même licence.
 *
 * Scripts classiques (pas de module ES) : tout est rangé dans window.OGW.
 * Ce fichier : éléments DOM, nombres à la française, couleurs nommées,
 * matériaux, noms des objets, stockage local protégé, icônes SVG dessinées.
 */
(function () {
  'use strict';
  var OGW = window.OGW = window.OGW || {};
  var OptGeo = window.OptGeo;

  /* ------------------------------------------------------------------ */
  /* DOM                                                                 */
  /* ------------------------------------------------------------------ */
  OGW.$ = function (sel, racine) { return (racine || document).querySelector(sel); };
  OGW.$$ = function (sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); };
  /** el('div', {class: 'x', onclick: f}, [enfants | texte]) */
  OGW.el = function (tag, attrs, enfants) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'texte') e.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { e.style[s] = v[s]; });
      else if (v === true) e.setAttribute(k, '');
      else e.setAttribute(k, v);
    });
    if (enfants !== undefined && enfants !== null) {
      (Array.isArray(enfants) ? enfants : [enfants]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    }
    return e;
  };
  OGW.vider = function (e) { while (e.firstChild) e.removeChild(e.firstChild); return e; };

  /* ------------------------------------------------------------------ */
  /* Nombres : virgule et point acceptés, affichage à la française       */
  /* ------------------------------------------------------------------ */
  /** Lit un nombre (« 12,5 », « 12.5 », « -3e-2 ») ; NaN si illisible. */
  OGW.lireNombre = function (s) {
    if (typeof s === 'number') return s;
    s = String(s === undefined || s === null ? '' : s).trim().replace(/\s+/g, '').replace(/−/g, '-').replace(',', '.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  };
  /** Nombre court lisible (au plus 6 chiffres significatifs), virgule décimale. */
  OGW.nombre = function (x, sig) {
    if (!isFinite(x)) return '';
    if (x === 0) return '0';
    sig = sig || 6;
    var a = Math.abs(x), s;
    if (a >= 1e9 || a < 1e-5) s = x.toExponential(sig - 1).replace(/\.?0+e/, 'e');
    else {
      var dec = Math.max(0, sig - 1 - Math.floor(Math.log10(a)));
      s = x.toFixed(Math.min(dec, 10));
      if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    }
    if (s === '-0') s = '0';
    return s.replace('.', ',');
  };
  /**
   * Nombre affiché dans un champ du panneau des propriétés : 4 décimales au plus (4 chiffres
   * significatifs au-dessous de 1), zéros inutiles retirés (« 120,0000236 » → « 120 »). La valeur
   * exacte n'est pas perdue : un champ que l'élève ne touche pas garde la valeur d'origine.
   */
  OGW.nombreChamp = function (x) {
    if (!isFinite(x)) return '';
    var a = Math.abs(x);
    if (a === 0) return '0';
    if (a < 1 || a >= 1e9) return OGW.nombre(x, 4);
    var s = x.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s.replace('.', ',');
  };
  /** Vrai si tous les nombres de l'objet (et de ses tableaux, objets imbriqués) sont finis. */
  OGW.valeursFinies = function (g, profondeur) {
    profondeur = profondeur || 0;
    if (g === null || g === undefined || profondeur > 4) return true;
    if (typeof g === 'number') return isFinite(g);
    if (typeof g !== 'object') return true;
    for (var k in g) {
      if (!Object.prototype.hasOwnProperty.call(g, k)) continue;
      if (!OGW.valeursFinies(g[k], profondeur + 1)) return false;
    }
    return true;
  };
  /**
   * Le texte est-il un fichier .opt d'OptGeo ? Tous les fichiers écrits par OptGeo (depuis
   * la version 1) commencent par « NE PAS MODIFIER CE FICHIER » puis « VERSION »
   * (ray1.pas:7565, enregistrer). Un fichier vide, du JSON, du texte ou une image renommée
   * est refusé avant de toucher à la simulation en cours.
   */
  OGW.texteOptValide = function (texte) {
    var l = String(texte === undefined || texte === null ? '' : texte).replace(/^﻿/, '').split(/\r\n|\r|\n/, 40)
      .map(function (s) { return s.trim(); }).filter(Boolean);
    if (l[0] === 'NE PAS MODIFIER CE FICHIER') return l[1] === 'VERSION';
    return l[0] === 'VERSION';
  };
  /**
   * Fichier .opt coupé avant la fin (copie ou téléchargement interrompus) : sa dernière ligne est le
   * début d'un mot-clé d'OptGeo (« Nombr » pour « Nombre de prismes: »…). Le lecteur du moteur
   * prendrait ce morceau pour une partie inconnue et ouvrirait une simulation incomplète.
   * Les mots-clés sont ceux qu'écrit le moteur (OptGeo.ecrireOpt d'une scène vide).
   * @returns {string|null} la ligne coupée, ou null si le fichier ne paraît pas coupé
   */
  var motsCles = null;
  OGW.texteOptTronque = function (texte) {
    if (!motsCles) {
      motsCles = window.OptGeo.ecrireOpt(new window.OptGeo.Scene()).split(/\r\n|\r|\n/)
        .filter(function (l) { return /^[A-Za-z]/.test(l) && !/^(TRUE|FALSE)$/.test(l); });
    }
    texte = String(texte || '');
    var lignes = texte.split(/\r\n|\r|\n/).map(function (l) { return l.replace(/\s+$/, ''); }).filter(Boolean);
    var der = lignes[lignes.length - 1];
    if (!der) return null;
    // coupé au milieu d'un mot-clé (« Nombr ») : en fin de fichier, avec ou sans fin de ligne
    if (/^[A-Za-z]/.test(der) && motsCles.indexOf(der) < 0 &&
      motsCles.some(function (m) { return m.length > der.length && m.indexOf(der) === 0; })) return der;
    if (/[\r\n]\s*$/.test(texte)) return null;          // la dernière ligne est complète
    // coupé au milieu d'une valeur : booléen (« FA »), style de police (« fsu »)…
    if (['TRUE', 'FALSE', 'fsbold', 'fsitalic', 'fsunderline', 'fsstrikeout'].some(function (m) { return m.length > der.length && m.indexOf(der) === 0; })) return der;
    if (/^\(/.test(der) && !/\)$/.test(der)) return der;      // liste de segments « (1,4,1… » non refermée
    // … ou nombre à virgule sans son exposant complet (OptGeo écrit tous ses réels « 5.000…E+0001 »)
    var reels = texte.split(/\s+/).filter(function (t) { return /^[-+]?\d+\.\d/.test(t); }), dernier = reels[reels.length - 1];
    if (reels.length >= 3 && texte.replace(/\s+$/, '').slice(-dernier.length) === dernier && !/E[-+]\d{4}$/i.test(dernier) &&
      reels.slice(0, -1).every(function (t) { return /E[-+]\d{4}$/i.test(t); })) return der;
    return null;
  };
  OGW.messageOptTronque = function (ligne) {
    return 'Ce fichier .opt est incomplet : il s’arrête avant la fin (dernière ligne « ' + ligne + '… »). ' +
      'Il a peut-être été mal copié ou mal téléchargé. Rien n’a été ouvert ; la simulation en cours est conservée.';
  };
  OGW.MESSAGE_PAS_OPT = 'Ce fichier n’est pas une simulation OptGeo : un fichier .opt commence par « NE PAS MODIFIER CE FICHIER » puis « VERSION ». ' +
    'Rien n’a été ouvert ; la simulation en cours est conservée.';
  /** Nombre à d décimales fixes, virgule. */
  OGW.fixe = function (x, d) { return isFinite(x) ? x.toFixed(d).replace('.', ',') : ''; };
  OGW.deg = function (rad) { return rad * 180 / Math.PI; };
  OGW.rad = function (deg) { return deg * Math.PI / 180; };

  /* ------------------------------------------------------------------ */
  /* Couleurs nommées (liste TColorBox de la LCL : 16 standard + 4)      */
  /* ------------------------------------------------------------------ */
  var C = OptGeo.couleurs;
  OGW.COULEURS = [
    { nom: 'Noir', v: C.clBlack }, { nom: 'Marron', v: C.clMaroon }, { nom: 'Vert', v: C.clGreen }, { nom: 'Olive', v: C.clOlive },
    { nom: 'Bleu marine', v: C.clNavy }, { nom: 'Violet', v: C.clPurple }, { nom: 'Sarcelle', v: C.clTeal }, { nom: 'Gris', v: C.clGray },
    { nom: 'Argent', v: C.clSilver }, { nom: 'Rouge', v: C.clRed }, { nom: 'Vert clair', v: C.clLime }, { nom: 'Jaune', v: C.clYellow },
    { nom: 'Bleu', v: C.clBlue }, { nom: 'Fuchsia', v: C.clFuchsia }, { nom: 'Cyan', v: C.clAqua }, { nom: 'Blanc', v: C.clWhite },
    { nom: 'Vert d’eau', v: 0xC0DCC0 }, { nom: 'Bleu ciel', v: 0xF0CAA6 }, { nom: 'Crème', v: 0xF0FBFF }, { nom: 'Gris moyen', v: 0xA4A0A0 }
  ];
  OGW.nomCouleur = function (v) {
    var c = OGW.COULEURS.filter(function (k) { return k.v === v; })[0];
    return c ? c.nom : 'Personnalisée (' + OptGeo.couleurCss(v) + ')';
  };
  /** Couleurs des rayons (choix fermé d'OptGeo : le noir code la lumière blanche). */
  OGW.COULEURS_RAYON = [
    { nom: 'Rouge', v: C.clRed }, { nom: 'Vert', v: C.clGreen }, { nom: 'Bleu', v: C.clBlue }, { nom: 'Lumière blanche', v: C.clBlack }
  ];

  /* ------------------------------------------------------------------ */
  /* Matériaux (listen.lst d'OptGeo 3.03 : indices à 486,1 / 587,6 /     */
  /* 656,3 nm, lus comme bleu, vert, rouge)                              */
  /* ------------------------------------------------------------------ */
  OGW.MATERIAUX = [
    ['Verre « BK7 »', 1.52238, 1.51680, 1.51432], ['Verre « SF10 »', 1.746, 1.728, 1.721], ['Verre « SF8 »', 1.705, 1.689, 1.683],
    ['Verre « FK51 »', 1.49056, 1.48656, 1.48480], ['Verre « F2 »', 1.63208, 1.62004, 1.61503], ['Verre « SFL6 »', 1.82780, 1.80518, 1.79690],
    ['Silice fondue', 1.4630, 1.4584, 1.4565], ['Verre au fluorure de calcium', 1.437, 1.434, 1.432], ['Verre « Zerodur »', 1.549, 1.542, 1.539],
    ['Eau liquide', 1.34009, 1.33580, 1.32986], ['Glace d’eau', 1.31505, 1.31100, 1.30712], ['Diamant', 2.44256, 2.42600, 2.41336],
    ['Plexiglas (ou Lucite)', 1.498, 1.492, 1.489], ['Lustrex (ou Dylebe ou Tyron)', 1.604, 1.590, 1.585], ['NAS (copolymère)', 1.575, 1.567, 1.558],
    ['Lustran (ou Tyril)', 1.578, 1.571, 1.563], ['Lexan (ou Merlon)', 1.599, 1.585, 1.580], ['TPX', 1.473, 1.467, 1.464]
  ].map(function (m) { return { nom: m[0], bleu: m[1], vert: m[2], rouge: m[3] }; });

  /** Indices par défaut d'un milieu créé (décision : valeurs de la création à la souris d'OptGeo). */
  OGW.INDICES_DEFAUT = { indicerouge: 1.4, indicevert: 1.6, indicebleu: 1.8 };

  /* ------------------------------------------------------------------ */
  /* Noms des objets (liste de choix d'OptGeo, unit222.pas:18489-18545)  */
  /* ------------------------------------------------------------------ */
  OGW.NOMS = {
    miroirplan: 'Miroir plan', reseau: 'Réseau', mscopa: 'Miroir concave idéal', mscepa: 'Miroir convexe idéal',
    mscore: 'Miroir concave', mscere: 'Miroir convexe', miroirconique: 'Miroir conique', lmc: 'Lentille mince convergente',
    lmd: 'Lentille mince divergente', lec: 'Lentille épaisse', lsr: 'Lame semi-réfléchissante', ecran: 'Écran',
    diaphragme: 'Diaphragme', rayon: 'Rayon', sourceponctuelle: 'Source ponctuelle', ondeplane: 'Onde plane',
    polyhedre: 'Polygone réfractant', polycercle: 'Polycercle réfractant', sphere: 'Sphère réfractante', prisme: 'Prisme',
    oeil: 'Œil', fleche: 'Trait', texte: 'Texte', metre: 'Mesure de distance', angle: 'Mesure d’angle', jolipoint: 'Point'
  };
  /** « Miroir plan n° 2 » : numéro dans la liste du type (ordre du fichier). */
  OGW.nomObjet = function (scene, id) {
    var o = scene.objet(id);
    if (!o) return '';
    var n = scene.objetsDuType(o.type).indexOf(o) + 1;
    var nom = OGW.NOMS[o.type] || o.type;
    if (o.type === 'sourceponctuelle') nom = o.sourcevirtuelle ? 'Objet ponctuel virtuel' : 'Objet ponctuel réel';
    if (o.type === 'miroirconique') nom = OGW.natureConique(o.excentricite) + (o.concave ? ' concave' : ' convexe');
    return nom + ' n° ' + n;
  };
  OGW.natureConique = function (e) {
    if (e <= 0.99999999999) return e === 0 ? 'Miroir circulaire' : 'Miroir elliptique';
    if (e >= 1.00000000001) return 'Miroir hyperbolique';
    return 'Miroir parabolique';
  };

  /** Page d'aide (portée d'OptGeo) de chaque type d'objet. */
  OGW.AIDE = {
    miroirplan: 'miroirplan.html', reseau: 'reseau.html', mscopa: 'miroirspheriqueparaxial.html', mscepa: 'miroirspheriqueparaxial.html',
    mscore: 'miroirspheriquereel.html', mscere: 'miroirspheriquereel.html', miroirconique: 'miroirconique.html',
    lmc: 'lmc.html', lmd: 'lmc.html', lec: 'lentille.html', lsr: 'lsr.html', ecran: 'ecran.html', diaphragme: 'diaphragme.html',
    rayon: 'rayon.html', sourceponctuelle: 'sponct.html', ondeplane: 'op.html', polyhedre: 'polyhedre.html',
    polycercle: 'polysphere.html', sphere: 'sphere.html', prisme: 'prisme.html', oeil: 'oeil.html',
    fleche: 'web.html#placer', texte: 'web.html#placer', metre: 'web.html#placer', angle: 'web.html#placer', jolipoint: 'web.html#placer'
  };

  /* ------------------------------------------------------------------ */
  /* Stockage local (protégé : navigation privée, quota)                 */
  /* ------------------------------------------------------------------ */
  var PREFIXE = 'optgeo-web:';
  OGW.stockage = {
    lire: function (cle) {
      try { var s = window.localStorage.getItem(PREFIXE + cle); return s === null ? null : JSON.parse(s); } catch (e) { return null; }
    },
    ecrire: function (cle, v) {
      try { window.localStorage.setItem(PREFIXE + cle, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    effacer: function (cle) { try { window.localStorage.removeItem(PREFIXE + cle); } catch (e) { /* rien */ } }
  };

  /** Téléchargement d'un Blob sous un nom (aucun envoi : tout reste sur l'appareil). */
  OGW.telecharger = function (blob, nom) {
    var url = URL.createObjectURL(blob);
    var a = OGW.el('a', { href: url, download: nom, style: { display: 'none' } });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  };

  /* ------------------------------------------------------------------ */
  /* Icônes SVG dessinées (24 × 24, trait = currentColor)                */
  /* ------------------------------------------------------------------ */
  var I = {
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    annuler: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    refaire: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    deplacer: '<path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>',
    proprietes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    dupliquer: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>',
    supprimer: '<path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    grouper: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><path d="M10 6.5h4v7.5M6.5 10v4h7.5" stroke-dasharray="2 2"/>',
    affichage: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pleinecran: '<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    agrandir: '<path d="M6 15l6-6 6 6"/>',
    moins: '<path d="M5 12h14"/>',
    toutvoir: '<rect x="4" y="6" width="16" height="12"/><path d="M2 3h4M2 3v4M22 3h-4M22 3v4M2 21h4M2 21v-4M22 21h-4M22 21v-4"/>',
    fermer: '<path d="M6 6l12 12M18 6L6 18"/>',
    aide: '<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7v1"/><circle cx="12" cy="17.5" r=".6" fill="currentColor"/>',
    valider: '<path d="M4 12l5 5L20 6"/>',
    deselect: '<rect x="4" y="4" width="16" height="16" stroke-dasharray="3 2"/><path d="M9 9l6 6M15 9l-6 6"/>',
    degrouper: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><path d="M14 4l6 6M20 4l-6 6"/>',
    ouvrir: '<path d="M3 7h6l2 2h10v10H3z"/>',
    enregistrer: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    image: '<rect x="3" y="4" width="18" height="16"/><circle cx="9" cy="10" r="2"/><path d="M3 18l6-5 4 3 3-2 5 4"/>',
    // ---- objets ----
    miroirplan: '<path d="M6 20L18 4" stroke-width="2.5"/><path d="M9 16l3 2M11 13l3 2M13 10l3 2M15 7l3 2" stroke-width="1.3"/>',
    lsr: '<path d="M6 20L18 4" stroke-width="2.5" stroke-dasharray="3 1.5"/><path d="M2 12h20" stroke-width="1.2"/><path d="M12 12V2" stroke-width="1.2"/>',
    mscopa: '<path d="M10 3h3v18h-3" stroke-width="2"/><path d="M13 6l3 2M13 11l3 2M13 16l3 2" stroke-width="1.2"/><path d="M2 12h9" stroke-dasharray="2 2" stroke-width="1.2"/><path d="M4 10l2 4M6 10l-2 4" stroke-width="1.2"/>',
    mscepa: '<path d="M14 3h-3v18h3" stroke-width="2"/><path d="M11 6l3 2M11 11l3 2M11 16l3 2" stroke-width="1.2" transform="translate(3 0)"/><path d="M14 12h8" stroke-dasharray="2 2" stroke-width="1.2"/><path d="M18 10l2 4M20 10l-2 4" stroke-width="1.2"/>',
    mscore: '<path d="M10 3a14 14 0 0 1 0 18" stroke-width="2.2"/><path d="M13 7l3 1M14 12h3M13 17l3-1" stroke-width="1.2"/><path d="M2 12h10" stroke-dasharray="2 2" stroke-width="1.2"/>',
    mscere: '<path d="M14 3a14 14 0 0 0 0 18" stroke-width="2.2"/><path d="M16 6l3 1M15 12h3M16 18l3-1" stroke-width="1.2"/><path d="M14 12h8" stroke-dasharray="2 2" stroke-width="1.2"/>',
    coniqueconcave: '<path d="M16 3Q4 12 16 21" stroke-width="2.2"/><circle cx="11" cy="12" r="1.2" fill="currentColor"/><path d="M2 12h8" stroke-dasharray="2 2" stroke-width="1.2"/>',
    coniqueconvexe: '<path d="M8 3Q20 12 8 21" stroke-width="2.2"/><circle cx="19.5" cy="12" r="1.2" fill="currentColor"/><path d="M14 12h4" stroke-dasharray="2 2" stroke-width="1.2"/>',
    ecran: '<path d="M12 2v20" stroke-width="4"/>',
    diaphragme: '<path d="M12 2v7M12 15v7" stroke-width="3"/><path d="M12 9v6" stroke-width="1" stroke-dasharray="1.5 1.5"/><path d="M3 12h18" stroke-width="1" stroke-dasharray="3 2"/>',
    rayon: '<path d="M3 19L21 5"/><path d="M14 8l-1.5 3.5L16 11" stroke-width="1.5"/><circle cx="3" cy="19" r="1.6" fill="currentColor"/>',
    sourcereelle: '<circle cx="4" cy="12" r="2" fill="currentColor"/><path d="M4 12L21 4M4 12h17M4 12l17 8"/>',
    sourcevirtuelle: '<circle cx="20" cy="12" r="2"/><path d="M3 4l11 5M3 12h11M3 20l11-5"/><path d="M14 9l6 3M14 15l6-3" stroke-dasharray="2 1.5"/>',
    ondeplane: '<path d="M4 4v16" stroke-dasharray="2 2"/><path d="M4 6h17M4 12h17M4 18h17"/><path d="M17 4l3 2-3 2M17 10l3 2-3 2M17 16l3 2-3 2" stroke-width="1.3"/>',
    lmc: '<path d="M12 2v20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3" stroke-width="2"/><path d="M2 12h20" stroke-dasharray="2 2" stroke-width="1"/>',
    lmd: '<path d="M12 3v18M12 3l-3-2M12 3l3-2M12 21l-3 2M12 21l3 2" stroke-width="2"/><path d="M2 12h20" stroke-dasharray="2 2" stroke-width="1"/>',
    lec: '<path d="M10 3Q5 12 10 21h4Q19 12 14 3z" fill="currentColor" fill-opacity=".25"/><path d="M1 12h22" stroke-dasharray="2 2" stroke-width="1"/>',
    polyhedre: '<path d="M4 18L7 5l12 3 2 9-9 4z" fill="currentColor" fill-opacity=".25"/>',
    prisme: '<path d="M12 3L21 20H3z" fill="currentColor" fill-opacity=".25"/>',
    sphere: '<circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity=".25"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    polycercle: '<path d="M8 3h8v18H8Q1 12 8 3z" fill="currentColor" fill-opacity=".25"/>',
    metre: '<path d="M3 12h18"/><path d="M3 8v8M21 8v8M8 10v4M13 10v4M18 10v4" stroke-width="1.3"/>',
    angle: '<path d="M4 20h17M4 20L16 5"/><path d="M11 20a7 7 0 0 0-2.6-5.5" stroke-width="1.3"/>',
    texte: '<path d="M5 20L12 4l7 16M8 14h8" stroke-width="2.2"/>',
    fleche: '<path d="M3 21L20 4M20 4h-7M20 4v7"/>',
    fantomes: '<path d="M3 18L9 12" /><path d="M9 12l6-6" stroke-dasharray="2 2"/><path d="M15 6l6-3"/><path d="M4 4l16 16" stroke-width="1.3"/>',
    commentaire: '<path d="M4 4h16v12H10l-5 4v-4H4z"/><path d="M8 8h8M8 12h5" stroke-width="1.3"/>',
    oeil: '<path d="M14 4a8 8 0 1 0 0 16" stroke-width="2"/><path d="M14 6v12" stroke-width="2"/><circle cx="7" cy="12" r="1.5" fill="currentColor"/>',
    reseau: '<path d="M12 2v20" stroke-dasharray="1.5 1.5" stroke-width="2.5"/><path d="M2 12h9M13 12l8-6M13 12h8M13 12l8 6" stroke-width="1.2"/>',
    jolipoint: '<path d="M7 7l10 10M17 7L7 17" stroke-width="2.5"/>'
  };
  OGW.icone = function (nom, classe) {
    return '<svg class="icone' + (classe ? ' ' + classe : '') + '" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (I[nom] || '') + '</svg>';
  };
})();
