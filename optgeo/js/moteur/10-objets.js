/*
 * OptGeo (portage JavaScript) — moteur, partie 1 : modèle des objets.
 *
 * Chaque type d'objet d'OptGeo 3.03 est décrit par une entrée de
 * OptGeo.types. Un objet de la scène est un objet JS simple :
 *   { id, type, ...paramètres }       (paramètres = ce qui est écrit dans le .opt)
 * La géométrie dérivée (angles, foyers, normales…) est calculée par
 * OptGeo.types[type].calculer(paramètres, ctx), portage des fonctions
 * create / create2 de unit222.pas, qui renvoie
 *   { ok: true, g: {...}, p: paramètresNormalisés }  ou  { ok: false, erreur: '…' }.
 * ctx = { xxmin, xxmax, yymin, yymax, taillemini, desactiverControle }.
 *
 * Correspondance Pascal (unit222.pas) :
 *   MiroirPlan.create 25817, Reseau.create 25842, Ecran.create 25877,
 *   lsr.create 25903, Mscopa.create/create2 25928/27352, Mscepa 27315/27392,
 *   Mscore.create/create2 25976/26061, Mscere 26158/26239, lec.create 26344,
 *   lmc/lmd.create/create2 27169–27313, rayon.create/createenfant 27441/27479,
 *   SourcePonctuelle.create 27527, OndePlane.create 27661, JoliPoint.create 25764,
 *   fleche.create 25792, diaphragme.create/create2 2577/2901, oeil.create/create2
 *   2606/2633, texteaffiche.create 3044, MiroirConique.create/create2 3248/3170,
 *   angle.create 37028, metre.create 37054, polycercle.create 38627,
 *   prisme.create 39458, Polyhedre.create 39585, sphere.create 40016,
 *   estou : polycercle 38084, polyhedre 39711, prisme 39778, lec 39839, sphere 40003.
 */
(function (racine) {
  'use strict';
  var OptGeo = racine.OptGeo;
  var M = OptGeo.math, C = OptGeo.couleurs, PI = Math.PI;
  var sqr = M.sqr, PiPi = M.donneAnglePolaireDansPiPi, O2Pi = M.donneAnglePolaireDans02Pi;

  /** Constantes « réfléchi » (codes du fichier .opt). */
  var REFLECHI = OptGeo.REFLECHI = { TOUJOURS: 1, JAMAIS: 2, SI_REFRACTE: 3, SI_PAS_REFRACTE: 4 };
  /** Position relative à un milieu (ttypeinterieur). */
  var INT = OptGeo.INTERIEUR = { INTERIEUR: 0, EXTERIEUR: 1, BORD: 2 };

  function echec(msg) { return { ok: false, erreur: msg }; }
  function hors(ctx, x, y) { return (x < ctx.xxmin) || (x > ctx.xxmax) || (y < ctx.yymin) || (y > ctx.yymax); }
  function copier(p) { var g = {}; for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) g[k] = p[k]; return g; }
  function bool(v) { return !!v; }
  function num(v, defaut) { var n = Number(v); return isFinite(n) ? n : (defaut === undefined ? 0 : defaut); }
  function ent(v, defaut) { var n = Math.round(Number(v)); return isFinite(n) ? n : (defaut === undefined ? 0 : defaut); }

  /** Angle polaire « à la lmc.create » (arctan explicite). */
  function angleArctan(dx, dy) {
    var a;
    if (dx === 0) a = (dy > 0) ? PI / 2 : -PI / 2;
    else { a = Math.atan(dy / dx); if (dx < 0) a = a + PI; }
    if (a > PI) a = a - 2 * PI;
    return a;
  }
  /** Angle « à la mscore.create » (theta sans normalisation finale). */
  function angleArctanBrut(dx, dy) {
    var a;
    if (dx === 0) a = (dy > 0) ? PI / 2 : -PI / 2;
    else { a = Math.atan(dy / dx); if (dx < 0) a = a + PI; }
    return a;
  }

  var T = OptGeo.types = {};

  /* =================================================================== */
  /* Objets « segment » : miroir plan, écran, lame semi-réfléchissante    */
  /* =================================================================== */
  function calculerSegment(p, ctx) {
    var g = copier(p);
    g.cx = (g.a1x + g.a2x) / 2; g.cy = (g.a1y + g.a2y) / 2;
    g.taille = Math.sqrt((g.a2x - g.a1x) * (g.a2x - g.a1x) + (g.a2y - g.a1y) * (g.a2y - g.a1y));
    if (!ctx.desactiverControle && g.taille < ctx.taillemini) return echec('Objet trop petit.');
    if (hors(ctx, g.a1x, g.a1y) || hors(ctx, g.a2x, g.a2y)) return echec('Objet hors de l’espace de travail.');
    g.anglepolaire = PiPi(g.a2x - g.a1x, g.a2y - g.a1y);
    g.normalex = Math.cos(g.anglepolaire + PI / 2);
    g.normaley = Math.sin(g.anglepolaire + PI / 2);
    return { ok: true, g: g, p: p };
  }
  var PTS_A1A2 = [['a1x', 'a1y'], ['a2x', 'a2y']];

  T.miroirplan = {
    libelle: 'Miroir plan', md: 'mdmiroirplan',
    champs: ['a1x', 'a1y', 'a2x', 'a2y', 'epaisseur', 'couleur', 'hachures'],
    defauts: { epaisseur: 1, couleur: C.clBlack, hachures: true },
    points: PTS_A1A2,
    calculer: calculerSegment
  };
  T.ecran = {
    libelle: 'Écran', md: 'mdecran',
    champs: ['a1x', 'a1y', 'a2x', 'a2y', 'epaisseur', 'couleur'],
    defauts: { epaisseur: 2, couleur: C.clBlack },
    points: PTS_A1A2,
    calculer: calculerSegment
  };
  T.lsr = {
    libelle: 'Lame semi-réfléchissante', md: 'mdlsr',
    champs: ['a1x', 'a1y', 'a2x', 'a2y', 'epaisseur', 'couleur'],
    defauts: { epaisseur: 1, couleur: C.clBlack },
    points: PTS_A1A2,
    calculer: calculerSegment
  };

  /* Réseau (Reseau.create) */
  T.reseau = {
    libelle: 'Réseau', md: 'mdreseau',
    champs: ['a1x', 'a1y', 'a2x', 'a2y', 'epaisseur', 'couleur', 'pas', 'entransmission', 'hachures', 'ordre_min', 'ordre_max'],
    defauts: { epaisseur: 1, couleur: C.clBlue, pas: 1e-6, entransmission: true, hachures: false, ordre_min: -1, ordre_max: 1 },
    points: PTS_A1A2,
    calculer: function (p, ctx) {
      var r = calculerSegment(p, ctx);
      if (!r.ok) return r;
      var g = r.g;
      g.nombre_trait_par_mm = 1e-3 / g.pas;
      if (p.ordre_min > p.ordre_max) {
        var q = copier(p); q.ordre_min = p.ordre_max; q.ordre_max = p.ordre_min;
        g.ordre_min = q.ordre_min; g.ordre_max = q.ordre_max;
        return { ok: true, g: g, p: q };
      }
      return r;
    }
  };

  /* =================================================================== */
  /* Miroirs sphériques paraxiaux (Mscopa / Mscepa, create2)             */
  /* =================================================================== */
  function calculerMsPara(p, ctx, convexe) {
    var g = copier(p);
    g.sx = (g.a1x + g.a2x) / 2; g.sy = (g.a1y + g.a2y) / 2;
    g.taille = Math.sqrt((g.a2x - g.a1x) * (g.a2x - g.a1x) + (g.a2y - g.a1y) * (g.a2y - g.a1y));
    if (g.taille < ctx.taillemini || g.focale < ctx.taillemini || hors(ctx, g.a1x, g.a1y) || hors(ctx, g.a2x, g.a2y) ||
        (g.trou && g.diametretrou > g.taille)) return echec('Miroir invalide (taille, focale, trou ou position).');
    if (!convexe) {
      g.anglepolaire = PiPi(g.a2x - g.a1x, g.a2y - g.a1y);
      g.fx = g.sx + g.focale * Math.cos(g.anglepolaire + PI / 2);
      g.fy = g.sy + g.focale * Math.sin(g.anglepolaire + PI / 2);
    } else {
      g.anglepolaire = angleArctan(g.a2x - g.a1x, g.a2y - g.a1y);
      g.fx = g.sx - g.focale * Math.cos(g.anglepolaire + PI / 2);
      g.fy = g.sy - g.focale * Math.sin(g.anglepolaire + PI / 2);
    }
    g.cx = g.sx + 2 * (g.fx - g.sx); g.cy = g.sy + 2 * (g.fy - g.sy);
    g.normalex = Math.cos(g.anglepolaire + PI / 2);
    g.normaley = Math.sin(g.anglepolaire + PI / 2);
    if (!g.trou) { g.t1x = g.sx; g.t1y = g.sy; g.t2x = g.sx; g.t2y = g.sy; }
    else {
      g.t1x = g.sx + g.diametretrou / 2 * Math.cos(g.anglepolaire + PI);
      g.t1y = g.sy + g.diametretrou / 2 * Math.sin(g.anglepolaire + PI);
      g.t2x = g.sx + g.diametretrou / 2 * Math.cos(g.anglepolaire);
      g.t2y = g.sy + g.diametretrou / 2 * Math.sin(g.anglepolaire);
    }
    return { ok: true, g: g, p: p };
  }
  var CHAMPS_MSPARA = ['a1x', 'a1y', 'a2x', 'a2y', 'focale', 'epaisseur', 'couleur', 'couleuraxe', 'hachures', 'axefocal', 'trou', 'diametretrou'];
  T.mscopa = {
    libelle: 'Miroir sphérique concave (paraxial)', md: 'mdmscopa',
    champs: CHAMPS_MSPARA,
    defauts: { epaisseur: 1, couleur: C.clBlack, couleuraxe: C.clBlue, hachures: true, axefocal: true, trou: false, diametretrou: 0 },
    points: PTS_A1A2,
    calculer: function (p, ctx) { return calculerMsPara(p, ctx, false); }
  };
  T.mscepa = {
    libelle: 'Miroir sphérique convexe (paraxial)', md: 'mdmscepa',
    champs: CHAMPS_MSPARA,
    defauts: { epaisseur: 1, couleur: C.clBlack, couleuraxe: C.clBlue, hachures: true, axefocal: true, trou: false, diametretrou: 0 },
    points: PTS_A1A2,
    calculer: function (p, ctx) { return calculerMsPara(p, ctx, true); }
  };

  /* =================================================================== */
  /* Miroirs sphériques réels (Mscore / Mscere, create2)                 */
  /* =================================================================== */
  function calculerMsReel(p, ctx) {
    var g = copier(p), q = p;
    if (!g.trou && g.diametretrou !== 0) { q = copier(p); q.diametretrou = 0; g.diametretrou = 0; }
    var xI = (g.a1x + g.a2x) / 2, yI = (g.a1y + g.a2y) / 2, R = g.rayoncourbure;
    var delta = 4 * sqr((g.a1x - xI) * (g.a2y - g.a1y) + (yI - g.a1y) * (g.a2x - g.a1x)) - 4 * (sqr(g.a2y - g.a1y) +
      sqr(g.a2x - g.a1x)) * (sqr(xI - g.a1x) + sqr(yI - g.a1y) - sqr(R));
    if (delta < 0 || (g.a1x === g.a2x && g.a1y === g.a2y)) return echec('Rayon de courbure trop petit pour la corde.');
    var lambda;
    if (g.aigu) lambda = (-2 * ((g.a1x - xI) * (g.a2y - g.a1y) + (yI - g.a1y) * (g.a2x - g.a1x)) + Math.sqrt(delta)) / 2 / (sqr(g.a2y - g.a1y) + sqr(g.a2x - g.a1x));
    else lambda = (-2 * ((g.a1x - xI) * (g.a2y - g.a1y) + (yI - g.a1y) * (g.a2x - g.a1x)) - Math.sqrt(delta)) / 2 / (sqr(g.a2y - g.a1y) + sqr(g.a2x - g.a1x));
    g.cx = xI - lambda * (g.a2y - g.a1y);
    g.cy = yI + lambda * (g.a2x - g.a1x);
    g.theta2 = angleArctanBrut(g.a2x - g.cx, g.a2y - g.cy);
    g.theta1 = angleArctanBrut(g.a1x - g.cx, g.a1y - g.cy);
    if (g.theta1 < 0) g.theta1 += 2 * PI;
    if (g.theta1 > 2 * PI) g.theta1 -= 2 * PI;
    if (g.theta1 > g.theta2) g.theta2 += 2 * PI;
    if (g.theta1 > g.theta2) g.theta2 += 2 * PI;
    g.taille = Math.abs(R * (g.theta2 - g.theta1));
    if ((!ctx.desactiverControle && g.taille < ctx.taillemini) || hors(ctx, g.a1x, g.a1y) || hors(ctx, g.a2x, g.a2y) ||
        (g.trou && g.diametretrou > Math.abs(g.theta2 - g.theta1))) return echec('Miroir invalide (taille, trou ou position).');
    if (!g.trou) { g.theta1p = g.theta1; g.theta2p = g.theta2; }
    else { g.theta1p = (g.theta1 + g.theta2) / 2 - g.diametretrou / 2; g.theta2p = (g.theta1 + g.theta2) / 2 + g.diametretrou / 2; }
    g.sx = g.cx + R * Math.cos((g.theta1 + g.theta2) / 2);
    g.sy = g.cy + R * Math.sin((g.theta1 + g.theta2) / 2);
    g.circonference = Math.abs(R * (g.theta2 - g.theta1));
    // vérification que tout l'arc est dans l'espace de travail
    var mx = g.cx + R * Math.cos(g.theta1), my = g.cy + R * Math.sin(g.theta1), nx = mx, ny = my, jj, t, x, y;
    for (jj = 1; jj <= 200; jj++) {
      var liste = g.trou ? [g.theta1 + (g.theta1p - g.theta1) * jj / 200, g.theta2p + (g.theta2 - g.theta2p) * jj / 200]
                         : [g.theta1 + (g.theta2 - g.theta1) * jj / 200];
      for (var k = 0; k < liste.length; k++) {
        t = liste[k]; x = g.cx + R * Math.cos(t); y = g.cy + R * Math.sin(t);
        if (x > mx) mx = x; if (x < nx) nx = x; if (y > my) my = y; if (y < ny) ny = y;
      }
    }
    if (nx < ctx.xxmin || mx > ctx.xxmax || ny < ctx.yymin || my > ctx.yymax) return echec('Miroir partiellement hors de l’espace de travail.');
    return { ok: true, g: g, p: q };
  }
  var CHAMPS_MSREEL = ['a1x', 'a1y', 'a2x', 'a2y', 'rayoncourbure', 'epaisseur', 'couleur', 'couleuraxe', 'hachures', 'axefocal', 'aigu', 'trou', 'diametretrou'];
  T.mscore = {
    libelle: 'Miroir sphérique concave (réel)', md: 'mdmscore',
    champs: CHAMPS_MSREEL,
    defauts: { epaisseur: 1, couleur: C.clBlack, couleuraxe: C.clBlue, hachures: true, axefocal: true, aigu: true, trou: false, diametretrou: 0 },
    points: PTS_A1A2,
    calculer: calculerMsReel
  };
  T.mscere = {
    libelle: 'Miroir sphérique convexe (réel)', md: 'mdmscere',
    champs: CHAMPS_MSREEL,
    defauts: { epaisseur: 1, couleur: C.clBlack, couleuraxe: C.clBlue, hachures: true, axefocal: true, aigu: true, trou: false, diametretrou: 0 },
    points: PTS_A1A2,
    calculer: calculerMsReel
  };

  /* =================================================================== */
  /* Lentilles minces (lmc / lmd, create2)                               */
  /* =================================================================== */
  function calculerLm(p, ctx, convergente) {
    var g = copier(p), q = p;
    if (g.focale < 0) { q = copier(p); q.focale = Math.abs(p.focale); }
    g.ox = (g.a1x + g.a2x) / 2; g.oy = (g.a1y + g.a2y) / 2;
    g.focale = Math.abs(p.focale);
    g.taille = Math.sqrt((g.a2x - g.a1x) * (g.a2x - g.a1x) + (g.a2y - g.a1y) * (g.a2y - g.a1y));
    if (convergente) g.rayonmonture = g.taille / 2;
    else g.rayonmonture = g.taille / 2; // non initialisé dans lmd.create2 (inutilisé)
    if (g.taille < ctx.taillemini || g.focale < ctx.taillemini || hors(ctx, g.a1x, g.a1y) || hors(ctx, g.a2x, g.a2y))
      return echec('Lentille invalide (taille, focale ou position).');
    g.anglepolaire = angleArctan(g.a2x - g.a1x, g.a2y - g.a1y);
    g.f1x = g.ox + g.focale * Math.cos(g.anglepolaire + PI / 2);
    g.f1y = g.oy + g.focale * Math.sin(g.anglepolaire + PI / 2);
    g.f2x = g.ox - g.focale * Math.cos(g.anglepolaire + PI / 2);
    g.f2y = g.oy - g.focale * Math.sin(g.anglepolaire + PI / 2);
    g.normalex = Math.cos(g.anglepolaire + PI / 2);
    g.normaley = Math.sin(g.anglepolaire + PI / 2);
    return { ok: true, g: g, p: q };
  }
  var CHAMPS_LM = ['a1x', 'a1y', 'a2x', 'a2y', 'focale', 'epaisseur', 'couleur', 'couleuraxe', 'axefocal'];
  T.lmc = {
    libelle: 'Lentille mince convergente', md: 'mdlmc',
    champs: CHAMPS_LM,
    defauts: { epaisseur: 1, couleur: C.clBlue, couleuraxe: C.clFuchsia, axefocal: true },
    points: PTS_A1A2,
    calculer: function (p, ctx) { return calculerLm(p, ctx, true); }
  };
  T.lmd = {
    libelle: 'Lentille mince divergente', md: 'mdlmd',
    champs: CHAMPS_LM,
    defauts: { epaisseur: 1, couleur: C.clBlue, couleuraxe: C.clFuchsia, axefocal: true },
    points: PTS_A1A2,
    calculer: function (p, ctx) { return calculerLm(p, ctx, false); }
  };

  /* =================================================================== */
  /* Rayon (rayon.create / createenfant)                                 */
  /* =================================================================== */
  /** rayon.create : renvoie une géométrie de rayon ou null si refusé. */
  function creerRayon(ax, ay, kx, ky, couleur, epaisseur, vav, vaa, nombremaxenfant, maxsegment, ctx) {
    if ((kx === 0 && ky === 0) || Math.sqrt(sqr(kx) + sqr(ky)) < ctx.taillemini || hors(ctx, ax, ay) || hors(ctx, ax + kx, ay + ky)) return null;
    return {
      ax: ax, ay: ay, kx: kx, ky: ky, bx: ax + kx, by: ay + ky, couleur: couleur, epaisseur: epaisseur,
      vav: vav, vaa: vaa, nombremaxenfant: nombremaxenfant, maxsegment: maxsegment,
      cx: ax + kx / 2, cy: ay + ky / 2, anglepolaire: angleArctan(kx, ky)
    };
  }
  /** rayon.createenfant (unit222 27479) : renvoie la géométrie ou null. */
  function creerRayonEnfant(ax, ay, kx, ky, couleur, epaisseur, vav, vaa, nombremaxenfant, maxsegment, indicesegment, ctx) {
    var nvav = M.decalerListe(vav, maxsegment, indicesegment), nvaa = M.decalerListe(vaa, maxsegment, indicesegment);
    if ((kx === 0 && ky === 0) || Math.sqrt(sqr(kx) + sqr(ky)) < ctx.taillemini || hors(ctx, ax, ay) ||
        (ax + kx / 1000 < ctx.xxmin) || (ax + kx / 1000 > ctx.xxmax) || (ay + ky / 1000 < ctx.yymin) || (ay + ky / 1000 > ctx.yymax)) return null;
    return {
      ax: ax, ay: ay, kx: kx, ky: ky, couleur: couleur, epaisseur: epaisseur, vav: nvav, vaa: nvaa,
      nombremaxenfant: nombremaxenfant, maxsegment: maxsegment, anglepolaire: angleArctan(kx, ky)
    };
  }
  OptGeo.creerRayon = creerRayon;
  OptGeo.creerRayonEnfant = creerRayonEnfant;

  T.rayon = {
    libelle: 'Rayon', md: 'mdrayon',
    champs: ['ax', 'ay', 'kx', 'ky', 'couleur', 'epaisseur', 'nombremaxenfant', 'vav', 'vaa', 'maxsegment'],
    defauts: { couleur: C.clRed, epaisseur: 1, nombremaxenfant: 10, vav: '', vaa: '', maxsegment: 500 },
    points: [['ax', 'ay']],
    vecteurs: [['kx', 'ky']],
    calculer: function (p, ctx) {
      var r = creerRayon(p.ax, p.ay, p.kx, p.ky, p.couleur, p.epaisseur, p.vav, p.vaa, p.nombremaxenfant, p.maxsegment, ctx);
      if (!r) return echec('Rayon invalide (direction nulle ou hors de l’espace de travail).');
      var g = copier(p);
      for (var k in r) g[k] = r[k];
      return { ok: true, g: g, p: p };
    }
  };

  /** Lecture de la liste des chemins optiques (SourcePonctuelle.create, boucle 157). */
  function lireChemins(s) {
    var res = [], ss = String(s || '');
    if (ss.length === 0) return res;
    var morceaux = ss.split(' ');
    for (var i = 0; i < morceaux.length; i++) {
      var m = morceaux[i];
      if (i === morceaux.length - 1 && m === '') break;          // espace final (boucle infinie dans l'original)
      // StrToFloat dépend du séparateur décimal du système (« , » sous Windows en français) :
      // on accepte les deux.
      m = m.replace(',', '.');
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(m)) break;
      res.push(parseFloat(m));
      if (res.length >= OptGeo.constantes.maxsurfacesondeparsource) break;
    }
    return res;
  }
  OptGeo.lireChemins = lireChemins;

  /* Source ponctuelle (SourcePonctuelle.create) */
  T.sourceponctuelle = {
    libelle: 'Source ponctuelle', md: 'mdsourceponctuelle',
    champs: ['nombrederayon', 'sx', 'sy', 'a1x', 'a1y', 'a2x', 'a2y', 'couleur', 'epaisseur', 'maxenfantparrayon',
      'vav', 'vaa', 'sourcevirtuelle', 'tracersurfacesonde', 'listechemins', 'maxsegment'],
    defauts: { nombrederayon: 5, couleur: C.clRed, epaisseur: 1, maxenfantparrayon: 10, vav: '', vaa: '',
      sourcevirtuelle: false, tracersurfacesonde: false, listechemins: '', maxsegment: 500 },
    points: [['sx', 'sy'], ['a1x', 'a1y'], ['a2x', 'a2y']],
    calculer: function (p, ctx) {
      var g = copier(p), i, tt1, tt2, rra, r;
      if (hors(ctx, g.sx, g.sy) || hors(ctx, g.a1x, g.a1y) || hors(ctx, g.a2x, g.a2y)) return echec('Source hors de l’espace de travail.');
      g.listecheminsoptiques = lireChemins(g.listechemins);
      g.nombrecheminsoptiques = g.listecheminsoptiques.length;
      g.gx = (g.a1x + g.a2x) / 2; g.gy = (g.a1y + g.a2y) / 2;
      var n = g.nombrederayon;
      if (n <= 1 || n > OptGeo.constantes.maxrayonsparsourceponctuelle) return echec('Nombre de rayons invalide (2 à 500).');
      var ray = new Array(n + 1);
      function cr(ax, ay, kx, ky) { return creerRayon(ax, ay, kx, ky, g.couleur, g.epaisseur, g.vav, g.vaa, g.maxenfantparrayon, g.maxsegment, ctx); }
      if (!g.sourcevirtuelle) {
        if (!(ray[1] = cr(g.sx, g.sy, g.a1x - g.sx, g.a1y - g.sy))) return echec('Source : rayon extrême invalide.');
        tt1 = ray[1].anglepolaire;
        if (!(ray[n] = cr(g.sx, g.sy, g.a2x - g.sx, g.a2y - g.sy))) return echec('Source : rayon extrême invalide.');
        tt2 = ray[n].anglepolaire;
        if (n > 2) {
          rra = Math.sqrt(sqr(g.a1x - g.sx) + sqr(g.a1y - g.sy));
          if (Math.sqrt(sqr(g.a2x - g.sx) + sqr(g.a2y - g.sy)) < rra) rra = Math.sqrt(sqr(g.a2x - g.sx) + sqr(g.a2y - g.sy));
          if (tt2 < tt1) tt2 += 2 * PI;
          if (tt2 < tt1) tt2 += 2 * PI;
          for (i = 2; i <= n - 1; i++) {
            r = cr(g.sx, g.sy, rra * Math.cos(tt1 + (i - 1) * (tt2 - tt1) / (n - 1)), rra * Math.sin(tt1 + (i - 1) * (tt2 - tt1) / (n - 1)));
            if (!r) return echec('Source : rayon intermédiaire invalide.');
            ray[i] = r;
          }
        }
      } else {
        if (!(ray[1] = cr(g.a1x, g.a1y, -g.a1x + g.sx, -g.a1y + g.sy))) return echec('Source virtuelle : rayon extrême invalide.');
        tt1 = ray[1].anglepolaire;
        if (!(ray[n] = cr(g.a2x, g.a2y, -g.a2x + g.sx, -g.a2y + g.sy))) return echec('Source virtuelle : rayon extrême invalide.');
        tt2 = ray[n].anglepolaire;
        if (n > 2) {
          rra = Math.sqrt(sqr(g.a1x - g.sx) + sqr(g.a1y - g.sy));
          if (Math.sqrt(sqr(g.a2x - g.sx) + sqr(g.a2y - g.sy)) < rra) rra = Math.sqrt(sqr(g.a2x - g.sx) + sqr(g.a2y - g.sy));
          if (tt2 < tt1) tt2 += 2 * PI;
          if (tt2 < tt1) tt2 += 2 * PI;
          for (i = 2; i <= n - 1; i++) {
            var th = tt1 + (i - 1) * (tt2 - tt1) / (n - 1);
            r = cr(g.sx - rra * Math.cos(th), g.sy - rra * Math.sin(th), rra * Math.cos(th), rra * Math.sin(th));
            if (!r) return echec('Source virtuelle : rayon intermédiaire invalide.');
            ray[i] = r;
          }
        }
      }
      g.ray = ray;
      return { ok: true, g: g, p: p };
    }
  };

  /* Onde plane (OndePlane.create) */
  T.ondeplane = {
    libelle: 'Onde plane', md: 'mdondeplane',
    champs: ['nombrederayon', 'sx', 'sy', 'a1x', 'a1y', 'a2x', 'a2y', 'couleur', 'epaisseur', 'maxenfantparrayon',
      'vav', 'vaa', 'tracersurfacesonde', 'listechemins', 'maxsegment'],
    defauts: { nombrederayon: 5, couleur: C.clRed, epaisseur: 1, maxenfantparrayon: 10, vav: '', vaa: '',
      tracersurfacesonde: false, listechemins: '', maxsegment: 500 },
    points: [['sx', 'sy'], ['a1x', 'a1y'], ['a2x', 'a2y']],
    calculer: function (p, ctx) {
      var g = copier(p), q = copier(p), i;
      g.listecheminsoptiques = lireChemins(g.listechemins);
      g.nombrecheminsoptiques = g.listecheminsoptiques.length;
      g.gx = (g.a1x + g.a2x) / 2; g.gy = (g.a1y + g.a2y) / 2;
      var tyty = Math.sqrt(sqr(g.a2x - g.a1x) + sqr(g.a2y - g.a1y));
      if ((sqr(g.sx - g.a1x) + sqr(g.sy - g.a1y)) === 0) return echec('Onde plane : direction nulle.');
      var d = Math.sqrt(sqr(g.sx - g.a1x) + sqr(g.sy - g.a1y));
      if ((g.sx - g.a1x) * (g.a2y - g.a1y) - (g.sy - g.a1y) * (g.a2x - g.a1x) > 0) {
        g.a2y = g.a1y + (g.sx - g.a1x) * tyty / d;
        g.a2x = g.a1x - (g.sy - g.a1y) * tyty / d;
      } else {
        g.a2y = g.a1y - (g.sx - g.a1x) * tyty / d;
        g.a2x = g.a1x + (g.sy - g.a1y) * tyty / d;
      }
      q.a2x = g.a2x; q.a2y = g.a2y;
      if (hors(ctx, g.sx, g.sy) || hors(ctx, g.a1x, g.a1y) || hors(ctx, g.a2x, g.a2y) ||
          hors(ctx, g.a2x + g.sx - g.a1x, g.a2y + g.sy - g.a1y)) return echec('Onde plane hors de l’espace de travail.');
      var n = g.nombrederayon;
      if (n <= 1 || n > OptGeo.constantes.maxrayonsparondeplane) return echec('Nombre de rayons invalide (2 à 500).');
      var ray = new Array(n + 1);
      function cr(ax, ay, kx, ky) { return creerRayon(ax, ay, kx, ky, g.couleur, g.epaisseur, g.vav, g.vaa, g.maxenfantparrayon, g.maxsegment, ctx); }
      if (!(ray[1] = cr(g.a1x, g.a1y, -g.a1x + g.sx, -g.a1y + g.sy))) return echec('Onde plane : rayon extrême invalide.');
      if (!(ray[n] = cr(g.a2x, g.a2y, -g.a1x + g.sx, -g.a1y + g.sy))) return echec('Onde plane : rayon extrême invalide.');
      for (i = 2; i <= n - 1; i++) {
        // le résultat de create n'est pas testé dans l'original (le rayon reste tel quel)
        ray[i] = cr(g.a1x + (g.a2x - g.a1x) * (i - 1) / (n - 1), g.a1y + (g.a2y - g.a1y) * (i - 1) / (n - 1), -g.a1x + g.sx, -g.a1y + g.sy) ||
          { ax: g.a1x + (g.a2x - g.a1x) * (i - 1) / (n - 1), ay: g.a1y + (g.a2y - g.a1y) * (i - 1) / (n - 1), kx: -g.a1x + g.sx, ky: -g.a1y + g.sy,
            couleur: g.couleur, epaisseur: g.epaisseur, vav: g.vav, vaa: g.vaa, nombremaxenfant: g.maxenfantparrayon, maxsegment: g.maxsegment,
            anglepolaire: angleArctan(-g.a1x + g.sx, -g.a1y + g.sy) };
      }
      g.ray = ray;
      return { ok: true, g: g, p: q };
    }
  };

  /* =================================================================== */
  /* Diaphragme (create2 à partir de cx, cy, anglepolaire, rint, rext)  */
  /* =================================================================== */
  T.diaphragme = {
    libelle: 'Diaphragme', md: 'mddiaphragme',
    champs: ['cx', 'cy', 'anglepolaire', 'rint', 'rext', 'epaisseur', 'couleur'],
    defauts: { epaisseur: 1, couleur: C.clBlack },
    points: [['cx', 'cy']],
    angles: ['anglepolaire'],
    calculer: function (p, ctx) {
      var g = copier(p), a = g.anglepolaire;
      g.a1x = g.cx + g.rint * Math.cos(a); g.a1y = g.cy + g.rint * Math.sin(a);
      g.a2x = g.cx + g.rext * Math.cos(a); g.a2y = g.cy + g.rext * Math.sin(a);
      g.ap1x = g.cx - g.rint * Math.cos(a); g.ap1y = g.cy - g.rint * Math.sin(a);
      g.ap2x = g.cx - g.rext * Math.cos(a); g.ap2y = g.cy - g.rext * Math.sin(a);
      if (hors(ctx, g.a1x, g.a1y) || hors(ctx, g.ap1x, g.ap1y) || hors(ctx, g.a2x, g.a2y) || hors(ctx, g.ap2x, g.ap2y) ||
          (!ctx.desactiverControle && g.rint < ctx.taillemini) || (g.rint > g.rext) ||
          (!ctx.desactiverControle && Math.abs(g.rint - g.rext) < ctx.taillemini)) return echec('Diaphragme invalide (rayons ou position).');
      return { ok: true, g: g, p: p };
    }
  };
  /** diaphragme.create (à partir du centre et de deux points) : renvoie les paramètres. */
  T.diaphragme.depuisPoints = function (cx, cy, a1x, a1y, a2x, a2y, base) {
    var p = copier(base || {});
    p.cx = cx; p.cy = cy;
    p.rint = Math.sqrt(sqr(a1x - cx) + sqr(a1y - cy));
    p.rext = Math.sqrt(sqr(a2x - cx) + sqr(a2y - cy));
    p.anglepolaire = PiPi(a1x - cx, a1y - cy);
    return p;
  };

  /* =================================================================== */
  /* Polyèdre (Polyhedre.create)                                         */
  /* =================================================================== */
  function sommetsPascal(liste) {
    // tableau indicé 1..n+1 de {ax, ay} (le dernier = le premier)
    var n = liste.length, s = new Array(n + 2);
    for (var i = 0; i < n; i++) s[i + 1] = { ax: liste[i].x, ay: liste[i].y };
    s[n + 1] = { ax: liste[0].x, ay: liste[0].y };
    return s;
  }
  var CHAMPS_MILIEU = ['indicerouge', 'indicebleu', 'indicevert', 'couleurbord', 'couleurfond', 'reflechientrant', 'reflechisortant'];
  // Milieu neuf : valeurs de la création à la souris dans OptGeo (ray1.pas 1303, 1376, 1489,
  // 1696, 1723, 2858 : create(..., 1.4, 1.8, 1.6, ..., jamaisreflechi, jamaisreflechi) ;
  // saisiesphere.lfm, ItemIndex = 1 « Jamais ») : n rouge 1,4, n bleu 1,8, n vert 1,6 (milieu
  // dispersif) et réflexion « jamais » des deux côtés. Un fichier .opt garde ses propres valeurs.
  var DEFAUTS_MILIEU = { indicerouge: 1.4, indicebleu: 1.8, indicevert: 1.6, couleurbord: C.clBlack, couleurfond: C.clAqua,
    reflechientrant: REFLECHI.JAMAIS, reflechisortant: REFLECHI.JAMAIS };

  function dispersif(g) {
    return (g.indicerouge !== g.indicevert) || (g.indicevert !== g.indicebleu) || (g.indicerouge !== g.indicebleu);
  }

  T.polyhedre = {
    libelle: 'Polyèdre réfractant', md: 'mdpolyhedre',
    champs: ['sommets'].concat(CHAMPS_MILIEU),
    defauts: DEFAUTS_MILIEU,
    calculer: function (p, ctx) {
      var g = copier(p), n = p.sommets ? p.sommets.length : 0, i, j, tol = 1e-6;
      if (n < 3 || n > OptGeo.constantes.maxsommet) return echec('Un polyèdre doit avoir de 3 à 500 sommets.');
      for (i = 0; i < n; i++) if (hors(ctx, p.sommets[i].x, p.sommets[i].y)) return echec('Sommet hors de l’espace de travail.');
      var s = sommetsPascal(p.sommets), toto = new Array(2 * n + 1);
      for (i = 1; i <= n; i++) { toto[i] = s[i]; toto[i + n] = s[i]; }
      g.nombresommet = n; g.messommets = s;
      for (i = 1; i <= n - 1; i++) for (j = i + 1; j <= n; j++)
        if (!ctx.desactiverControle && Math.sqrt(sqr(s[i].ax - s[j].ax) + sqr(s[i].ay - s[j].ay)) < ctx.taillemini) return echec('Deux sommets sont trop proches.');
      if (n > 3) {
        for (i = 1; i <= n; i++) {
          if (i > 2) for (j = 1; j <= i - 3; j++) {
            var r1 = M.lePointEstIlSurUneDroite(s[i].ax, s[i].ay, s[j].ax, s[j].ay, s[j + 1].ax, s[j + 1].ay, tol);
            if (r1.sur && r1.para >= -tol && r1.para <= 1 + tol) return echec('Un sommet est sur un autre côté.');
          }
          if (i < n - 1) for (j = i + 1; j <= n - 1; j++) {
            var r2 = M.lePointEstIlSurUneDroite(s[i].ax, s[i].ay, s[j].ax, s[j].ay, s[j + 1].ax, s[j + 1].ay, tol);
            if (r2.sur && r2.para >= -tol && r2.para <= 1 + tol) return echec('Un sommet est sur un autre côté.');
          }
        }
        for (i = 1; i <= n; i++) for (j = i + 2; j <= i + n - 2; j++)
          if (M.lesDeuxSegmentsSeCoupentIls(toto[i].ax, toto[i].ay, toto[i + 1].ax, toto[i + 1].ay, toto[j].ax, toto[j].ay, toto[j + 1].ax, toto[j + 1].ay))
            return echec('Deux côtés se coupent.');
      }
      g.anglepolaire = new Array(n + 2); g.nx = new Array(n + 2); g.ny = new Array(n + 2);
      for (i = 1; i <= n; i++) g.anglepolaire[i] = PiPi(s[i + 1].ax - s[i].ax, s[i + 1].ay - s[i].ay);
      var aire = 0;
      for (i = 1; i <= n; i++) aire = aire + 0.5 * (s[i + 1].ax - s[i].ax) * (s[i + 1].ay + s[i].ay);
      g.trigodirect = (aire < 0);
      for (i = 1; i <= n; i++) {
        g.nx[i] = g.trigodirect ? Math.cos(g.anglepolaire[i] - PI / 2) : Math.cos(g.anglepolaire[i] + PI / 2);
        g.ny[i] = g.trigodirect ? Math.sin(g.anglepolaire[i] - PI / 2) : Math.sin(g.anglepolaire[i] + PI / 2);
      }
      g.xiso = 0; g.yiso = 0;
      for (i = 1; i <= n; i++) { g.xiso += s[i].ax; g.yiso += s[i].ay; }
      g.xiso /= n; g.yiso /= n;
      g.dispersif = dispersif(g);
      g.estou = function (x, y) { return estouPolyhedre(g, x, y); };
      return { ok: true, g: g, p: p };
    },
    transformer: function (p, f) { var q = copier(p); q.sommets = p.sommets.map(function (s) { var r = f(s.x, s.y); return { x: r[0], y: r[1] }; }); return q; }
  };

  /** polyhedre.estou (39711). */
  function estouPolyhedre(g, x, y) {
    var s = g.messommets, n = g.nombresommet, i, alpha;
    for (i = 1; i <= n; i++) {
      if ((x - s[i].ax) * (s[i + 1].ay - s[i].ay) - (y - s[i].ay) * (s[i + 1].ax - s[i].ax) === 0) {
        if (Math.abs(s[i + 1].ax - s[i].ax) > Math.abs(s[i + 1].ay - s[i].ay)) alpha = (x - s[i].ax) / (s[i + 1].ax - s[i].ax);
        else alpha = (y - s[i].ay) / (s[i + 1].ay - s[i].ay);
        if (alpha >= 0 && alpha <= 1) return INT.BORD;
      }
    }
    // IsPointInPolygon(x, y, messommets, nombresommet+1)
    var poly = s.slice(1, n + 2);
    return M.isPointInPolygon(x, y, poly, n + 1) ? INT.INTERIEUR : INT.EXTERIEUR;
  }

  /* =================================================================== */
  /* Prisme (prisme.create)                                              */
  /* =================================================================== */
  T.prisme = {
    libelle: 'Prisme', md: 'mdprisme',
    champs: ['gx', 'gy', 'ax', 'ay', 'bx', 'by'].concat(CHAMPS_MILIEU),
    defauts: DEFAUTS_MILIEU,
    points: [['gx', 'gy'], ['ax', 'ay'], ['bx', 'by']],
    calculer: function (p, ctx) {
      var g = copier(p), q = copier(p), i, j;
      var gx = p.gx, gy = p.gy, ax = p.ax, ay = p.ay, _3x = p.bx, _3y = p.by, bx, by, cx, cy;
      if ((_3x - gx) * (ax - gx) + (_3y - gy) * (ay - gy) > 0) return echec('Prisme : le point de base doit être du côté opposé au sommet.');
      var hx = gx - (ax - gx) / 2, hy = gy - (ay - gy) / 2;
      if ((ax - gx) * (_3y - gy) - (ay - gy) * (_3x - gx) > 0) { bx = _3x; by = _3y; cx = -bx + 2 * hx; cy = -by + 2 * hy; }
      else { cx = _3x; cy = _3y; bx = -cx + 2 * hx; by = -cy + 2 * hy; }
      g.bx = bx; g.by = by; g.cx = cx; g.cy = cy; q.bx = bx; q.by = by;
      var s = [null, { ax: ax, ay: ay }, { ax: bx, ay: by }, { ax: cx, ay: cy }, { ax: ax, ay: ay }];
      g.nombresommet = 3; g.messommets = s;
      for (i = 1; i <= 2; i++) for (j = i + 1; j <= 3; j++)
        if (!ctx.desactiverControle && Math.sqrt(sqr(s[i].ax - s[j].ax) + sqr(s[i].ay - s[j].ay)) < ctx.taillemini) return echec('Prisme trop petit.');
      g.hauteur = 3 / 2 * Math.sqrt(sqr(ax - gx) + sqr(ay - gy));
      g.angle_axe = O2Pi(ax - gx, ay - gy);
      g.angle_sommet = M.arccos(((bx - ax) * (cx - ax) + (by - ay) * (cy - ay)) / (sqr(bx - ax) + sqr(by - ay)));
      for (i = 1; i <= 3; i++) if (hors(ctx, s[i].ax, s[i].ay)) return echec('Prisme hors de l’espace de travail.');
      var toto = [null, s[1], s[2], s[3], s[1], s[2], s[3]];
      g.anglepolaire = new Array(5); g.nx = new Array(5); g.ny = new Array(5);
      for (i = 1; i <= 2; i++) g.anglepolaire[i] = angleArctan(toto[i + 1].ax - toto[i].ax, toto[i + 1].ay - toto[i].ay);
      // côté 3 (C → A) : défaut de l'original corrigé à la demande de l'enseignant (2026-11-20).
      // unit222.pas:39554 écrit anglepolaire[nombresommet]:=anglepolaire[i]-Pi*2 avec i = 2
      // (variable de la boucle précédente) : angle du côté 2 au lieu du côté 3, donc normale et
      // réfraction fausses sur ce côté (prisme pointe en haut tourné d'environ 69° à 158°).
      var a3 = angleArctanBrut(toto[1].ax - toto[3].ax, toto[1].ay - toto[3].ay);
      if (a3 > PI) a3 = a3 - 2 * PI;
      g.anglepolaire[3] = a3;
      var aire = 0;
      for (i = 1; i <= 3; i++) aire = aire + 0.5 * (s[i].ax * s[i + 1].ay - s[i].ay * s[i + 1].ax);
      g.trigodirect = (aire > 0);
      for (i = 1; i <= 3; i++) {
        g.nx[i] = g.trigodirect ? Math.cos(g.anglepolaire[i] - PI / 2) : Math.cos(g.anglepolaire[i] + PI / 2);
        g.ny[i] = g.trigodirect ? Math.sin(g.anglepolaire[i] - PI / 2) : Math.sin(g.anglepolaire[i] + PI / 2);
      }
      g.xiso = gx; g.yiso = gy;
      g.dispersif = dispersif(g);
      g.estou = function (x, y) { return estouPrisme(g, x, y); };
      return { ok: true, g: g, p: q };
    }
  };

  /** prisme.estou (39778) : méthode des pentes. */
  function estouPrisme(g, x, y) {
    var s = g.messommets, n = g.nombresommet, i, alpha, beta;
    for (i = 1; i <= n; i++) {
      if ((x - s[i].ax) * (s[i + 1].ay - s[i].ay) - (y - s[i].ay) * (s[i + 1].ax - s[i].ax) === 0) {
        if (Math.abs(s[i + 1].ax - s[i].ax) > Math.abs(s[i + 1].ay - s[i].ay)) alpha = (x - s[i].ax) / (s[i + 1].ax - s[i].ax);
        else alpha = (y - s[i].ay) / (s[i + 1].ay - s[i].ay);
        if (alpha >= 0 && alpha <= 1) return INT.BORD;
      }
    }
    var pente = new Array(2 * n + 1);
    for (i = 1; i <= n; i++) pente[i] = g.anglepolaire[i];
    for (i = 1; i <= n; i++) {
      var pp;
      if ((s[i].ax - x) === 0) pp = ((s[i].ay - y) > 0) ? PI / 2 : -PI / 2;
      else { pp = Math.atan((s[i].ay - y) / (s[i].ax - x)); if ((s[i].ax - x) < 0) pp = pp + PI; }
      if (pp > PI) pp = pp - 2 * PI;
      pente[i + n] = pp;
    }
    var p1 = pente[1], p2 = pente[1];
    for (i = 2; i <= 2 * n; i++) { if (pente[i] >= p1) p1 = pente[i]; else p2 = pente[i]; }
    for (i = 1; i <= 2 * n; i++) if (pente[i] < p1 && pente[i] > p2) p2 = pente[i];
    var bonne = (p1 + p2) / 2, ux = Math.cos(bonne), uy = Math.sin(bonne), inter = 0;
    for (i = 1; i <= n; i++) {
      var den = uy * (s[i].ax - s[i + 1].ax) - ux * (s[i].ay - s[i + 1].ay);
      if (den !== 0) beta = (uy * (s[i].ax - x) - ux * (s[i].ay - y)) / den;
      else beta = ((uy * (s[i].ax - x) - ux * (s[i].ay - y)) > 0) ? 100 : -100;
      if (Math.abs(ux) > Math.abs(uy)) alpha = (s[i].ax - x - beta * (s[i].ax - s[i + 1].ax)) / ux;
      else alpha = (s[i].ay - y - beta * (s[i].ay - s[i + 1].ay)) / uy;
      if (beta < 1 && beta > 0 && alpha > 0) inter++;
    }
    return (inter % 2 === 0) ? INT.EXTERIEUR : INT.INTERIEUR;
  }

  /* =================================================================== */
  /* Polycercle (polycercle.create)                                      */
  /* =================================================================== */
  T.polycercle = {
    libelle: 'Polycercle réfractant', md: 'mdpolycercle',
    champs: ['sommets', 'mess', 'rectiligne'].concat(CHAMPS_MILIEU),
    defauts: DEFAUTS_MILIEU,
    calculer: function (p, ctx) {
      var g = copier(p), n = p.sommets ? p.sommets.length : 0, i, j, tol = 1e-10;
      if (n < 2 || n > OptGeo.constantes.maxsommet) return echec('Un polycercle doit avoir de 2 à 500 sommets.');
      if (!p.mess || p.mess.length !== n || !p.rectiligne || p.rectiligne.length !== n) return echec('Polycercle : données incomplètes.');
      if (n === 2 && p.rectiligne[0] && p.rectiligne[1]) return echec('Cette structure est impossible.');
      if (n === 2 && !p.rectiligne[0] && !p.rectiligne[1]) return echec('Pour créer une lentille, utilisez l’objet « sphère » ou « lentille épaisse ».');
      for (i = 0; i < n; i++) if (hors(ctx, p.sommets[i].x, p.sommets[i].y)) return echec('Sommet hors de l’espace de travail.');
      var s = sommetsPascal(p.sommets), toto = new Array(2 * n + 1);
      for (i = 1; i <= n; i++) { toto[i] = s[i]; toto[i + n] = s[i]; }
      var mess = new Array(n + 2), centres = new Array(n + 2), rect = new Array(n + 2), rayon = new Array(n + 2);
      var theta1 = new Array(n + 2), theta2 = new Array(n + 2), aigu = new Array(n + 2), ltd = new Array(n + 2);
      var rentrant = new Array(n + 2), agauche = new Array(n + 2);
      for (i = 1; i <= n; i++) { mess[i] = { ax: p.mess[i - 1].x, ay: p.mess[i - 1].y }; rect[i] = !!p.rectiligne[i - 1]; }
      var ix, iy, lambda, angleaucentre;
      for (i = 1; i <= n; i++) if (!rect[i]) {
        ix = (s[i].ax + s[i + 1].ax) / 2; iy = (s[i].ay + s[i + 1].ay) / 2;
        if (mess[i].ax !== ix || mess[i].ay !== iy) {
          rayon[i] = (sqr(mess[i].ax - ix) + sqr(mess[i].ay - iy) + sqr(s[i].ax - ix) + sqr(s[i].ay - iy)) / 2 / Math.sqrt(sqr(mess[i].ax - ix) + sqr(mess[i].ay - iy));
          lambda = rayon[i] / Math.sqrt(sqr(mess[i].ax - ix) + sqr(mess[i].ay - iy));
          centres[i] = { ax: mess[i].ax - lambda * (mess[i].ax - ix), ay: mess[i].ay - lambda * (mess[i].ay - iy) };
          aigu[i] = ((s[i].ax - centres[i].ax) * (mess[i].ax - centres[i].ax) + (s[i].ay - centres[i].ay) * (mess[i].ay - centres[i].ay)) >= 0;
          angleaucentre = M.arccos(((s[i].ax - centres[i].ax) * (mess[i].ax - centres[i].ax) + (s[i].ay - centres[i].ay) * (mess[i].ay - centres[i].ay)) / sqr(rayon[i]));
          var am = O2Pi(mess[i].ax - centres[i].ax, mess[i].ay - centres[i].ay);
          theta1[i] = am - angleaucentre; theta2[i] = am + angleaucentre;
          ltd[i] = (mess[i].ax - centres[i].ax) * (s[i + 1].ay - s[i].ay) - (mess[i].ay - centres[i].ay) * (s[i + 1].ax - s[i].ax) > 0;
        } else rect[i] = true;
      }
      for (i = 1; i <= n; i++) if (rect[i]) {
        centres[i] = { ax: 0, ay: 0 };
        mess[i] = { ax: (s[i].ax + s[i + 1].ax) / 2, ay: (s[i].ay + s[i + 1].ay) / 2 };
        theta1[i] = 0; theta2[i] = 0;
      }
      for (i = 1; i <= n - 1; i++) for (j = i + 1; j <= n; j++)
        if (!ctx.desactiverControle && Math.sqrt(sqr(s[i].ax - s[j].ax) + sqr(s[i].ay - s[j].ay)) < ctx.taillemini) return echec('Deux sommets sont trop proches.');
      if (n > 3) {
        for (i = 1; i <= n; i++) {
          if (i > 2) for (j = 1; j <= i - 3; j++) {
            var r1 = M.lePointEstIlSurUneDroite(s[i].ax, s[i].ay, s[j].ax, s[j].ay, s[j + 1].ax, s[j + 1].ay, tol);
            if (r1.sur && r1.para >= -tol && r1.para <= 1 + tol) return echec('Un sommet est sur un autre côté.');
          }
          if (i < n - 1) for (j = i + 1; j <= n - 1; j++) {
            var r2 = M.lePointEstIlSurUneDroite(s[i].ax, s[i].ay, s[j].ax, s[j].ay, s[j + 1].ax, s[j + 1].ay, tol);
            if (r2.sur && r2.para >= -tol && r2.para <= 1 + tol) return echec('Un sommet est sur un autre côté.');
          }
        }
        for (i = 1; i <= n; i++) for (j = i + 2; j <= i + n - 2; j++) {
          // rectiligne[j] pour j > n n'est pas initialisé dans l'original (faux) : on garde ce comportement
          if (rect[i] && rect[j] &&
              M.lesDeuxSegmentsSeCoupentIls(toto[i].ax, toto[i].ay, toto[i + 1].ax, toto[i + 1].ay, toto[j].ax, toto[j].ay, toto[j + 1].ax, toto[j + 1].ay))
            return echec('Deux côtés se coupent.');
        }
      }
      var anglepolaire = new Array(n + 2);
      for (i = 1; i <= n; i++) anglepolaire[i] = PiPi(s[i + 1].ax - s[i].ax, s[i + 1].ay - s[i].ay);
      var aire = 0, airecalotte;
      for (i = 1; i <= n; i++) {
        aire = aire + 0.5 * (s[i + 1].ax - s[i].ax) * (s[i + 1].ay + s[i].ay);
        if (!rect[i]) {
          angleaucentre = Math.abs(theta2[i] - theta1[i]);
          airecalotte = sqr(rayon[i]) * (angleaucentre / 2 - Math.sin(angleaucentre) / 2);
          ix = (s[i].ax + s[i + 1].ax) / 2; iy = (s[i].ay + s[i + 1].ay) / 2;
          if ((s[i + 1].ax - s[i].ax) * (mess[i].ay - iy) - (s[i + 1].ay - s[i].ay) * (mess[i].ax - ix) > 0) aire += airecalotte;
          else aire -= airecalotte;
        }
      }
      var trigodirect = (aire < 0);
      for (i = 1; i <= n; i++) if (!rect[i]) {
        var pv = (mess[i].ax - centres[i].ax) * (s[i + 1].ay - s[i].ay) - (mess[i].ay - centres[i].ay) * (s[i + 1].ax - s[i].ax);
        rentrant[i] = !((trigodirect && pv > 0) || (!trigodirect && pv < 0));
        agauche[i] = ((s[i + 1].ax - s[i].ax) * (mess[i].ay - 0.5 * (s[i + 1].ay + s[i].ay)) - (s[i + 1].ay - s[i].ay) * (mess[i].ax - 0.5 * (s[i + 1].ax + s[i].ax))) > 0;
      }
      var nx = new Array(n + 2), ny = new Array(n + 2);
      for (i = 1; i <= n; i++) {
        nx[i] = trigodirect ? Math.cos(anglepolaire[i] - PI / 2) : Math.cos(anglepolaire[i] + PI / 2);
        ny[i] = trigodirect ? Math.sin(anglepolaire[i] - PI / 2) : Math.sin(anglepolaire[i] + PI / 2);
      }
      // intersections côté rectiligne / côté circulaire
      for (i = 1; i <= n; i++) if (rect[i]) {
        for (j = 1; j <= n; j++) if (j !== i && !rect[j]) {
          var sc = M.leSegmentEtLeCercleSeCoupentIls(s[i].ax, s[i].ay, s[i + 1].ax, s[i + 1].ay, centres[j].ax, centres[j].ay, rayon[j], theta1[j], theta2[j], tol);
          if (sc.n === 1 && !(((Math.abs(sc.paraseg1) < tol) || (Math.abs(sc.paraseg1 - 1) < tol)) && ((Math.abs(sc.paracer1) < tol) || (Math.abs(sc.paracer1 - 1) < tol))))
            return echec('Un côté rectiligne coupe un côté circulaire.');
          if (sc.n === 2 && !((((Math.abs(sc.paraseg1) < tol) || (Math.abs(sc.paraseg1 - 1) < tol)) && ((Math.abs(sc.paracer1) < tol) || (Math.abs(sc.paracer1 - 1) < tol))) &&
              (((Math.abs(sc.paraseg2) < tol) || (Math.abs(sc.paraseg2 - 1) < tol)) && ((Math.abs(sc.paracer2) < tol) || (Math.abs(sc.paracer2 - 1) < tol)))))
            return echec('Un côté rectiligne coupe un côté circulaire.');
        }
      }
      // intersections côté circulaire / côté circulaire
      for (i = 1; i <= n; i++) if (!rect[i]) {
        for (j = 1; j <= n; j++) if (j !== i && !rect[j]) {
          var cc = M.lesDeuxCerclesSeCoupentIls(centres[i].ax, centres[i].ay, centres[j].ax, centres[j].ay, rayon[i], rayon[j], theta1[i], theta2[i], theta1[j], theta2[j]);
          if (cc.n === 1 && !(((Math.abs(cc.para1) < tol) || (Math.abs(cc.para1 - 1) < tol)) && ((Math.abs(cc.para2) < tol) || (Math.abs(cc.para2 - 1) < tol))))
            return echec('Deux côtés circulaires se coupent.');
          if (cc.n === 2 && !((((Math.abs(cc.para1) < tol) || (Math.abs(cc.para1 - 1) < tol)) && ((Math.abs(cc.para2) < tol) || (Math.abs(cc.para2 - 1) < tol))) &&
              (((Math.abs(cc.para3) < tol) || (Math.abs(cc.para3 - 1) < tol)) && ((Math.abs(cc.para4) < tol) || (Math.abs(cc.para4 - 1) < tol)))))
            return echec('Deux côtés circulaires se coupent.');
        }
      }
      g.nombresommet = n; g.messommets = s; g.mess = mess; g.mescentres = centres; g.rectiligne = rect; g.rayon = rayon;
      g.theta1 = theta1; g.theta2 = theta2; g.aigu = aigu; g.listetrigodirect = ltd; g.rentrant = rentrant; g.agauche = agauche;
      g.anglepolaire = anglepolaire; g.nx = nx; g.ny = ny; g.trigodirect = trigodirect;
      g.xiso = 0; g.yiso = 0;
      for (i = 1; i <= n; i++) { g.xiso += s[i].ax; g.yiso += s[i].ay; }
      g.xiso /= n; g.yiso /= n;
      g.dispersif = dispersif(g);
      g.estou = function (x, y) { return estouPolycercle(g, x, y); };
      // Paramètres normalisés comme dans l'objet Pascal (écrits tels quels dans le .opt) :
      // un côté dont le point de contrôle est au milieu devient rectiligne, et le point
      // de contrôle d'un côté rectiligne est remplacé par le milieu du côté.
      var q = copier(p);
      q.mess = []; q.rectiligne = [];
      for (i = 1; i <= n; i++) { q.mess.push({ x: mess[i].ax, y: mess[i].ay }); q.rectiligne.push(!!rect[i]); }
      q.sommets = p.sommets.map(function (s) { return { x: s.x, y: s.y }; });
      return { ok: true, g: g, p: q };
    },
    transformer: function (p, f) {
      var q = copier(p);
      q.sommets = p.sommets.map(function (s) { var r = f(s.x, s.y); return { x: r[0], y: r[1] }; });
      q.mess = p.mess.map(function (s) { var r = f(s.x, s.y); return { x: r[0], y: r[1] }; });
      q.rectiligne = p.rectiligne.slice();
      return q;
    }
  };

  /** polycercle.estou (38084). */
  function estouPolycercle(g, x, y) {
    var s = g.messommets, n = g.nombresommet, nb = 0, i, xi, t, A, B, Cc, delta;
    for (i = 1; i <= n; i++) {
      if (g.rectiligne[i]) {
        if (s[i].ay === s[i + 1].ay && y === s[i].ay && x >= Math.min(s[i].ax, s[i + 1].ax) && x <= Math.max(s[i].ax, s[i + 1].ax)) return INT.BORD;
        if (s[i].ay === s[i + 1].ay && y === s[i].ay && x < Math.min(s[i].ax, s[i + 1].ax)) nb += 2;
        else if (s[i].ay === s[i + 1].ay && y === s[i].ay && x > Math.max(s[i].ax, s[i + 1].ax)) nb += 0;
        else if (y >= Math.min(s[i].ay, s[i + 1].ay) && y <= Math.max(s[i].ay, s[i + 1].ay)) {
          xi = s[i].ax + (y - s[i].ay) * (s[i + 1].ax - s[i].ax) / (s[i + 1].ay - s[i].ay);
          if (x === xi) return INT.BORD;
          if (x < xi) nb += 1;
        }
      } else {
        var ce = g.mescentres[i], t1 = g.theta1[i], t2 = g.theta2[i];
        A = 1; B = -2 * ce.ax; Cc = sqr(ce.ax) + sqr(y - ce.ay) - sqr(g.rayon[i]);
        delta = sqr(B) - 4 * A * Cc;
        if (delta < 0) { /* rien */ }
        else if (delta === 0) {
          xi = -B / 2 / A;
          t = O2Pi(xi - ce.ax, y - ce.ay);
          if ((t >= t1 && t <= t2) || (t - 2 * PI >= t1 && t - 2 * PI <= t2) || (t + 2 * PI >= t1 && t + 2 * PI <= t2)) {
            if (x === xi) return INT.BORD;
            else if (xi > x) nb += 2;
          }
        } else {
          var xi1 = (-B + Math.sqrt(delta)) / 2 / A, xi2 = (-B - Math.sqrt(delta)) / 2 / A;
          var u1 = O2Pi(xi1 - ce.ax, y - ce.ay), u2 = O2Pi(xi2 - ce.ax, y - ce.ay);
          if ((u1 >= t1 && u1 <= t2) || (u1 - 2 * PI >= t1 && u1 - 2 * PI <= t2) || (u1 + 2 * PI >= t1 && u1 + 2 * PI <= t2)) {
            if (x === xi1) return INT.BORD;
            else if (xi1 > x) nb += 1;
          }
          if ((u2 >= t1 && u2 <= t2) || (u2 - 2 * PI >= t1 && u2 - 2 * PI <= t2) || (u2 + 2 * PI >= t1 && u2 + 2 * PI <= t2)) {
            if (x === xi2) return INT.BORD;
            else if (xi2 > x) nb += 1;
          }
        }
      }
    }
    return (nb % 2 === 0) ? INT.EXTERIEUR : INT.INTERIEUR;
  }

  /* =================================================================== */
  /* Sphère (sphere.create)                                              */
  /* =================================================================== */
  T.sphere = {
    libelle: 'Sphère réfractante', md: 'mdsphere',
    champs: ['cx', 'cy', 'rayon'].concat(CHAMPS_MILIEU),
    defauts: DEFAUTS_MILIEU,
    points: [['cx', 'cy']],
    calculer: function (p, ctx) {
      if ((p.cx + p.rayon >= ctx.xxmax) || (p.cx - p.rayon <= ctx.xxmin) || (p.cy + p.rayon >= ctx.yymax) || (p.cy - p.rayon <= ctx.yymin))
        return echec('Sphère partiellement hors de l’espace de travail.');
      var g = copier(p);
      g.dispersif = dispersif(g);
      g.estou = function (x, y) {
        var d = Math.sqrt(sqr(x - g.cx) + sqr(y - g.cy));
        if (d > g.rayon) return INT.EXTERIEUR;
        if (d < g.rayon) return INT.INTERIEUR;
        return INT.BORD;
      };
      return { ok: true, g: g, p: p };
    }
  };

  /* =================================================================== */
  /* Miroir conique (MiroirConique.create2 / create)                     */
  /* =================================================================== */
  T.miroirconique = {
    libelle: 'Miroir conique', md: 'mdmiroirconique',
    champs: ['fx', 'fy', 'excentricite', 'parametre', 'theta0', 'theta1', 'theta2', 'couleur', 'couleuraxe', 'hachures', 'axefocal', 'concave'],
    defauts: { couleur: C.clBlack, couleuraxe: C.clBlue, hachures: true, axefocal: true, concave: true },
    points: [['fx', 'fy']],
    angles: ['theta0', 'theta1', 'theta2'],
    calculer: function (p, ctx) {
      var g = copier(p), q = copier(p), toto, jj;
      g.excentricite = Math.abs(p.excentricite);
      var t1 = p.theta1, t2 = p.theta2;
      if (t1 < 0) t1 = t1 + 2 * PI * (M.intp(-t1 / 2 / PI) + 1);
      if (t2 < 0) t2 = t2 + 2 * PI * (M.intp(-t2 / 2 / PI) + 1);
      t1 = M.fracp(t1 / 2 / PI) * 2 * PI;
      t2 = M.fracp(t2 / 2 / PI) * 2 * PI;
      if (t1 >= t2) t2 = t2 + 2 * PI;
      g.theta1 = t1; g.theta2 = t2;
      g.parametre = Math.abs(p.parametre);
      q.excentricite = g.excentricite; q.parametre = g.parametre; q.theta1 = t1; q.theta2 = t2;
      var e = g.excentricite, pa = g.parametre, th0 = g.theta0;
      if (hors(ctx, g.fx, g.fy)) return echec('Foyer hors de l’espace de travail.');
      if (e > 1) {
        toto = t1 - th0; if (toto < -PI) toto += 2 * PI; if (toto > PI) toto -= 2 * PI;
        if (toto > M.arccos(-1 / e) || toto < -M.arccos(-1 / e)) return echec('Hyperbole : extrémité hors de la branche.');
        toto = t2 - th0; if (toto < -PI) toto += 2 * PI; if (toto > PI) toto -= 2 * PI;
        if (toto > M.arccos(-1 / e) || toto < -M.arccos(-1 / e)) return echec('Hyperbole : extrémité hors de la branche.');
      }
      g.a1x = g.fx + Math.cos(t1) * pa / (1 + e * Math.cos(t1 - th0));
      g.a1y = g.fy + Math.sin(t1) * pa / (1 + e * Math.cos(t1 - th0));
      g.a2x = g.fx + Math.cos(t2) * pa / (1 + e * Math.cos(t2 - th0));
      g.a2y = g.fy + Math.sin(t2) * pa / (1 + e * Math.cos(t2 - th0));
      g.sx = g.fx + Math.cos(th0) * pa / (1 + e);
      g.sy = g.fy + Math.sin(th0) * pa / (1 + e);
      if (g.fx === g.sx && g.fy === g.sy) return echec('Paramètre nul.');
      var mx = g.a1x, my = g.a1y, nx = mx, ny = my, x, y, t;
      for (jj = 1; jj <= 200; jj++) {
        t = t1 + (t2 - t1) * jj / 200;
        x = g.fx + Math.cos(t) * pa / (1 + e * Math.cos(t - th0)); y = g.fy + Math.sin(t) * pa / (1 + e * Math.cos(t - th0));
        if (x > mx) mx = x; if (x < nx) nx = x; if (y > my) my = y; if (y < ny) ny = y;
      }
      if (nx < ctx.xxmin || mx > ctx.xxmax || ny < ctx.yymin || my > ctx.yymax) return echec('Miroir conique partiellement hors de l’espace de travail.');
      return { ok: true, g: g, p: q };
    }
  };
  /** MiroirConique.create (foyer, sommet, deux points) -> paramètres (ou null). */
  T.miroirconique.depuisPoints = function (fx, fy, sx, sy, a1x, a1y, a2x, a2y, base) {
    if (fx === sx && fy === sy) return null;
    var theta0 = O2Pi(sx - fx, sy - fy), fs = Math.sqrt(sqr(sx - fx) + sqr(sy - fy)), fm = Math.sqrt(sqr(a1x - fx) + sqr(a1y - fy));
    var theta1 = O2Pi(a1x - fx, a1y - fy), theta2 = O2Pi(a2x - fx, a2y - fy), e, pa;
    if (theta2 < theta1) theta2 += 2 * PI;
    if (fs === fm) { e = 0; pa = fs; }
    else {
      if (Math.cos(theta1 - theta0) === fs / fm) return null;
      e = (fs / fm - 1) / (Math.cos(theta1 - theta0) - fs / fm);
      if (e < 0) return null;
      pa = fs * (1 + e);
    }
    var p = copier(base || {});
    p.fx = fx; p.fy = fy; p.excentricite = e; p.parametre = pa; p.theta0 = theta0; p.theta1 = theta1; p.theta2 = theta2;
    return p;
  };

  /* =================================================================== */
  /* Texte (texteaffiche.create)                                         */
  /* =================================================================== */
  T.texte = {
    libelle: 'Texte', md: 'mdtexteaffiche',
    champs: ['texte', 'x', 'y', 'policecharset', 'policecolor', 'policename', 'policesize', 'policefsbold', 'policefsitalic',
      'policefsunderline', 'policefsstrikeout', 'policepitch'],
    defauts: { texte: 'Texte', policecharset: 0, policecolor: C.clBlack, policename: 'Arial', policesize: 10, policefsbold: false,
      policefsitalic: false, policefsunderline: false, policefsstrikeout: false, policepitch: 'fpDefault' },
    points: [['x', 'y']],
    calculer: function (p, ctx) {
      if (hors(ctx, p.x, p.y)) return echec('Texte hors de l’espace de travail.');
      return { ok: true, g: copier(p), p: p };
    }
  };

  /* =================================================================== */
  /* Lentille épaisse (lec.create)                                       */
  /* =================================================================== */
  T.lec = {
    libelle: 'Lentille épaisse', md: 'mdlec',
    champs: ['s1x', 's1y', 's2x', 's2y', 'r1', 'r2', 'diametre', 'couleurfond', 'couleuraxe', 'axefocal',
      'indicerouge', 'indicebleu', 'indicevert', 'reflechientrant', 'reflechisortant'],
    defauts: { couleurfond: C.clAqua, couleuraxe: C.clRed, axefocal: true, indicerouge: 1.4, indicebleu: 1.8, indicevert: 1.6,
      reflechientrant: REFLECHI.JAMAIS, reflechisortant: REFLECHI.JAMAIS },   // ray1.pas 1696
    points: [['s1x', 's1y'], ['s2x', 's2y']],
    calculer: calculerLec
  };

  function calculerLec(p, ctx) {
    var g = copier(p), q = copier(p);
    var r1 = p.r1, r2 = p.r2, s1x = p.s1x, s1y = p.s1y, s2x = p.s2x, s2y = p.s2y, diametre = p.diametre;
    var phi1, phi2, delta, theta1_1, theta2_1, theta1_2, theta2_2, diametremax, mince, tronque, tmp;
    g.ox = (s1x + s2x) / 2; g.oy = (s1y + s2y) / 2;
    if (s1x === s2x && s1y === s2y) return echec('Les deux sommets sont confondus.');
    if (r1 === 0 || r2 === 0) return echec('Rayon de courbure nul.');
    var apaf = O2Pi(s2x - s1x, s2y - s1y);
    var c1x = s1x - r1 * Math.cos(apaf), c1y = s1y - r1 * Math.sin(apaf);
    var c2x = s2x - r2 * Math.cos(apaf), c2y = s2y - r2 * Math.sin(apaf);
    var C1C2 = Math.sqrt(sqr(c2x - c1x) + sqr(c2y - c1y));
    delta = 16 * sqr(r2) * sqr(C1C2) - 4 * sqr(sqr(C1C2) + sqr(r2) - sqr(r1));
    mince = (delta > 0) && (sqr(C1C2) + sqr(r2) - sqr(r1) - 2 * Math.abs(r2) * (c2x - c1x) !== 0);
    if (!mince && ((diametre > 2 * Math.abs(r1)) || (diametre > 2 * Math.abs(r2)))) diametre = M.minimum(Math.abs(r2), Math.abs(r1)) * 2 * 0.999;
    if (diametre < ctx.taillemini || hors(ctx, s1x, s1y) || hors(ctx, s2x, s2y)) return echec('Lentille trop petite ou hors de l’espace de travail.');
    if (mince) {
      var den2 = sqr(C1C2) + sqr(r2) - sqr(r1) - 2 * Math.abs(r2) * (c2x - c1x);
      if (den2 > 0) {
        theta1_2 = 2 * Math.atan((-4 * Math.abs(r2) * (c2y - c1y) - Math.sqrt(delta)) / 2 / den2);
        theta2_2 = 2 * Math.atan((-4 * Math.abs(r2) * (c2y - c1y) + Math.sqrt(delta)) / 2 / den2);
      } else {
        theta1_2 = 2 * Math.atan((-4 * Math.abs(r2) * (c2y - c1y) + Math.sqrt(delta)) / 2 / den2);
        theta2_2 = 2 * Math.atan((-4 * Math.abs(r2) * (c2y - c1y) - Math.sqrt(delta)) / 2 / den2);
      }
      if (theta1_2 < 0) theta1_2 += 2 * PI;
      if (theta2_2 < 0) theta2_2 += 2 * PI;
      if (theta1_2 > theta2_2) { tmp = theta1_2; theta1_2 = theta2_2; theta2_2 = tmp; }
      if (((Math.abs((theta1_2 + theta2_2) / 2 - apaf) <= Math.abs(apaf * 1e-10)) && (r2 < 0)) ||
          ((Math.abs((theta1_2 + theta2_2) / 2 - apaf) > Math.abs(apaf * 1e-10)) && (r2 > 0))) {
        tmp = theta1_2; theta1_2 = theta2_2; theta2_2 = tmp; theta2_2 = theta2_2 + 2 * PI;
      }
      delta = 16 * sqr(r1) * sqr(C1C2) - 4 * sqr(sqr(C1C2) + sqr(r1) - sqr(r2));
      var den1 = sqr(C1C2) + sqr(r1) - sqr(r2) - 2 * Math.abs(r1) * (c1x - c2x);
      if (den1 > 0) {
        theta1_1 = 2 * Math.atan((-4 * Math.abs(r1) * (c1y - c2y) - Math.sqrt(delta)) / 2 / den1);
        theta2_1 = 2 * Math.atan((-4 * Math.abs(r1) * (c1y - c2y) + Math.sqrt(delta)) / 2 / den1);
      } else {
        theta1_1 = 2 * Math.atan((-4 * Math.abs(r1) * (c1y - c2y) + Math.sqrt(delta)) / 2 / den1);
        theta2_1 = 2 * Math.atan((-4 * Math.abs(r1) * (c1y - c2y) - Math.sqrt(delta)) / 2 / den1);
      }
      if (theta1_1 < 0) theta1_1 += 2 * PI;
      if (theta2_1 < 0) theta2_1 += 2 * PI;
      if (theta1_1 > theta2_1) { tmp = theta1_1; theta1_1 = theta2_1; theta2_1 = tmp; }
      if (((Math.abs((theta1_1 + theta2_1) / 2 - apaf) <= Math.abs(apaf * 1e-10)) && (r1 < 0)) ||
          ((Math.abs((theta1_1 + theta2_1) / 2 - apaf) > Math.abs(apaf * 1e-10)) && (r1 > 0))) {
        tmp = theta1_1; theta1_1 = theta2_1; theta2_1 = tmp; theta2_1 = theta2_1 + 2 * PI;
      }
      diametremax = Math.abs(r1) * Math.sqrt(sqr(Math.cos(theta2_1) - Math.cos(theta1_1)) + sqr(Math.sin(theta2_1) - Math.sin(theta1_1)));
      if (((r1 < 0) && (diametre > diametremax) && (Math.cos(theta1_1 - apaf) > 0)) ||
          ((r1 > 0) && (diametre > diametremax) && (Math.cos(theta1_1 - apaf) < 0)) ||
          ((r2 < 0) && (diametre > diametremax) && (Math.cos(theta1_2 - apaf) > 0)) ||
          ((r2 > 0) && (diametre > diametremax) && (Math.cos(theta1_2 - apaf) < 0))) return echec('Diamètre trop grand pour cette lentille.');
    }
    tronque = mince ? (diametre < diametremax) : true;
    // (Les sommets / centres internes MesSommets ne servent qu'au dessin d'origine.)
    if (tronque) {
      phi1 = (r1 > 0) ? Math.asin(diametre / 2 / Math.abs(r1)) : PI - Math.asin(diametre / 2 / Math.abs(r1));
      phi2 = (r2 > 0) ? Math.asin(diametre / 2 / Math.abs(r2)) : PI - Math.asin(diametre / 2 / Math.abs(r2));
      if (r1 > 0) { theta1_1 = apaf - phi1; theta2_1 = apaf + phi1; } else { theta1_1 = apaf + phi1; theta2_1 = apaf - phi1 + 2 * PI; }
      if (r2 > 0) { theta1_2 = apaf - phi2; theta2_2 = apaf + phi2; } else { theta1_2 = apaf + phi2; theta2_2 = apaf - phi2 + 2 * PI; }
      if (theta1_1 < 0) theta1_1 += 2 * PI;
      if (theta1_1 > theta2_1) theta2_1 += 2 * PI;
      if (theta1_1 > theta2_1) theta2_1 += 2 * PI;
      if (theta1_2 < 0) theta1_2 += 2 * PI;
      if (theta1_2 > theta2_2) theta2_2 += 2 * PI;
      if (theta1_2 > theta2_2) theta2_2 += 2 * PI;
    }
    var a1x = c1x + Math.abs(r1) * Math.cos(theta2_1), a1y = c1y + Math.abs(r1) * Math.sin(theta2_1);
    var b1x = c1x + Math.abs(r1) * Math.cos(theta1_1), b1y = c1y + Math.abs(r1) * Math.sin(theta1_1);
    var a2x, a2y, b2x, b2y;
    if (r1 * r2 > 0) {
      a2x = c2x + Math.abs(r2) * Math.cos(theta2_2); a2y = c2y + Math.abs(r2) * Math.sin(theta2_2);
      b2x = c2x + Math.abs(r2) * Math.cos(theta1_2); b2y = c2y + Math.abs(r2) * Math.sin(theta1_2);
    } else {
      a2x = c2x + Math.abs(r2) * Math.cos(theta1_2); a2y = c2y + Math.abs(r2) * Math.sin(theta1_2);
      b2x = c2x + Math.abs(r2) * Math.cos(theta2_2); b2y = c2y + Math.abs(r2) * Math.sin(theta2_2);
    }
    if (tronque && (hors(ctx, a1x, a1y) || hors(ctx, a2x, a2y) || hors(ctx, b1x, b1y) || hors(ctx, b2x, b2y)))
      return echec('Lentille partiellement hors de l’espace de travail.');
    if (diametre !== p.diametre) q.diametre = diametre;
    g.diametre = diametre; g.apaf = apaf; g.c1x = c1x; g.c1y = c1y; g.c2x = c2x; g.c2y = c2y; g.mince = mince; g.tronque = tronque;
    g.theta1_1 = theta1_1; g.theta2_1 = theta2_1; g.theta1_2 = theta1_2; g.theta2_2 = theta2_2; g.diametremax = diametremax;
    g.a1x = a1x; g.a1y = a1y; g.b1x = b1x; g.b1y = b1y; g.a2x = a2x; g.a2y = a2y; g.b2x = b2x; g.b2y = b2y;
    g.dispersif = dispersif(g);
    g.estou = function (x, y) { return estouLec(g, x, y); };
    return { ok: true, g: g, p: q };
  }

  /** lec.estou (39839), bogues d'origine conservés ((y-c2y)*(s2x-s1x), daxe>diametre). */
  function estouLec(g, x, y) {
    var r1 = g.r1, r2 = g.r2, c1x = g.c1x, c1y = g.c1y, c2x = g.c2x, c2y = g.c2y, s1x = g.s1x, s1y = g.s1y, s2x = g.s2x, s2y = g.s2y;
    var d1 = Math.sqrt(sqr(x - c1x) + sqr(y - c1y)), d2 = Math.sqrt(sqr(x - c2x) + sqr(y - c2y));
    var lambda = (x - g.ox) * Math.cos(g.apaf) + (y - g.oy) * Math.sin(g.apaf);
    var daxe = Math.sqrt(sqr(g.ox + lambda * Math.cos(g.apaf) - x) + sqr(g.oy + lambda * Math.sin(g.apaf) - y));
    var R1 = Math.abs(r1), R2 = Math.abs(r2), res;
    if (daxe > g.diametre) return INT.EXTERIEUR;
    if (g.mince) {
      if (r1 * r2 < 0) {
        if (d1 === R1 && d2 <= R2) return INT.BORD;
        if (d1 <= R1 && d2 === R2) return INT.BORD;
        if (d1 < R1 && d2 < R2) return INT.INTERIEUR;
        return INT.EXTERIEUR;
      }
      res = undefined;
      if (r1 > 0 && r2 > 0) {
        if (d1 > R1 && d2 < R2) return INT.INTERIEUR;
        if (d1 === R1 && d2 <= R2) return INT.BORD;
        if (d1 >= R1 && d2 === R2) return INT.BORD;
        res = INT.EXTERIEUR; // pas de exit dans l'original : on continue
      }
      if (r1 < 0 && r2 < 0) {
        if (d2 > R2 && d1 < R1) return INT.INTERIEUR;
        if (d1 === R1 && d2 >= R2) return INT.BORD;
        if (d1 <= R1 && d2 === R2) return INT.BORD;
        return INT.EXTERIEUR;
      }
      return res === undefined ? INT.EXTERIEUR : res; // résultat indéfini dans l'original sinon
    }
    var cond1 = (x - c1x) * (s2x - s1x) + (y - c1y) * (s2y - s1y);
    if (r1 * r2 < 0) {
      var cond2 = (x - c2x) * (s2x - s1x) + (y - c2y) * (s2x - s1x);
      if (d1 > R1 && d2 > R2 && cond1 >= 0 && cond2 <= 0) return INT.INTERIEUR;
      if (d1 === R1 && d2 > R2 && cond1 >= 0 && cond2 <= 0) return INT.BORD;
      if (d1 > R1 && d2 === R2 && cond1 >= 0 && cond2 <= 0) return INT.BORD;
      return INT.EXTERIEUR;
    }
    if (r1 > 0 && r2 > 0) {
      if (d1 > R1 && d2 < R2 && cond1 >= 0) return INT.INTERIEUR;
      if (d1 === R1 && d2 < R2 && cond1 >= 0) return INT.BORD;
      if (d1 > R1 && d2 === R2 && cond1 >= 0) return INT.BORD;
      return INT.EXTERIEUR;
    }
    if (r1 < 0 && r2 < 0) {
      if (d1 < R1 && d2 > R2 && cond1 <= 0) return INT.INTERIEUR;
      if (d1 === R1 && d2 > R2 && cond1 <= 0) return INT.BORD;
      if (d1 < R1 && d2 === R2 && cond1 <= 0) return INT.BORD;
      return INT.EXTERIEUR;
    }
    return INT.EXTERIEUR;
  }

  /* =================================================================== */
  /* Objets de dessin et de mesure                                       */
  /* =================================================================== */
  T.angle = {
    libelle: 'Mesure d’angle', md: 'mdangle',
    champs: ['cx', 'cy', 'a1x', 'a1y', 'a2x', 'a2y'],
    defauts: {},
    points: [['cx', 'cy'], ['a1x', 'a1y'], ['a2x', 'a2y']],
    calculer: function (p) { var g = copier(p); g.dx = (g.a1x + g.a2x) / 2; g.dy = (g.a1y + g.a2y) / 2; return { ok: true, g: g, p: p }; }
  };

  var EXTREMITES = ['trien', 'tffleche', 'ttrait', 'trond', 'tcroix', 'tcroixx', 'tdisque'];
  var STYLES_TRAIT = ['pssolid', 'psdot', 'psdash', 'psdashdot', 'psdashdotdot'];
  OptGeo.EXTREMITES = EXTREMITES;
  OptGeo.STYLES_TRAIT = STYLES_TRAIT;
  T.fleche = {
    libelle: 'Trait / flèche', md: 'mdfleche',
    champs: ['a1x', 'a1y', 'a2x', 'a2y', 'epaisseur', 'couleur', 'ext1', 'ext2', 'styletrait', 'taille1', 'taille2'],
    defauts: { epaisseur: 1, couleur: C.clBlack, ext1: 'trien', ext2: 'tffleche', styletrait: 'pssolid', taille1: 10, taille2: 10 },
    points: PTS_A1A2,
    calculer: function (p, ctx) {
      var g = copier(p);
      g.cx = (g.a1x + g.a2x) / 2; g.cy = (g.a1y + g.a2y) / 2;
      var taille = Math.sqrt(sqr(g.a2x - g.a1x) + sqr(g.a2y - g.a1y));
      if ((!ctx.desactiverControle && taille < ctx.taillemini) || hors(ctx, g.a1x, g.a1y) || hors(ctx, g.a2x, g.a2y)) return echec('Trait trop court ou hors de l’espace de travail.');
      g.anglepolaire = PiPi(g.a2x - g.a1x, g.a2y - g.a1y);
      return { ok: true, g: g, p: p };
    }
  };

  T.oeil = {
    libelle: 'Œil', md: 'mdoeil',
    champs: ['cx', 'cy', 'ax', 'ay', 'epaisseur', 'couleur'],
    defauts: { epaisseur: 1, couleur: C.clGreen },
    points: [['cx', 'cy'], ['ax', 'ay']],
    calculer: function (p, ctx) {
      var g = copier(p);
      g.rayoncourbure = Math.sqrt(sqr(g.ax - g.cx) + sqr(g.ay - g.cy));
      g.anglepolaire = O2Pi(g.ax - g.cx, g.ay - g.cy);
      var R = g.rayoncourbure, a = g.anglepolaire;
      g.c1x = g.cx - R * Math.sin(a); g.c1y = g.cy + R * Math.cos(a);
      g.c2x = g.cx + R * Math.sin(a); g.c2y = g.cy - R * Math.cos(a);
      g.bx = g.cx + R * Math.cos(a) * 9 / 8; g.by = g.cy + R * Math.sin(a) * 9 / 8;
      if (R < ctx.taillemini) return echec('Œil trop petit.');
      return { ok: true, g: g, p: p };
    }
  };

  T.metre = {
    libelle: 'Mesure de distance', md: 'mdmetre',
    champs: ['a1x', 'a1y', 'a2x', 'a2y'],
    defauts: {},
    points: PTS_A1A2,
    calculer: function (p, ctx) {
      if (hors(ctx, p.a1x, p.a1y) || hors(ctx, p.a2x, p.a2y)) return echec('Mesure hors de l’espace de travail.');
      var g = copier(p); g.cx = (g.a1x + g.a2x) / 2; g.cy = (g.a1y + g.a2y) / 2;
      return { ok: true, g: g, p: p };
    }
  };

  var STYLES_POINT = ['tpcroixx', 'tpcroixp', 'tpdisque', 'tpcercle', 'tpcarre', 'tpcarreplein', 'tptriangle', 'tptriangleplein'];
  OptGeo.STYLES_POINT = STYLES_POINT;
  T.jolipoint = {
    libelle: 'Point', md: 'mdjolipoint',
    champs: ['a1x', 'a1y', 'taille', 'epaisseur', 'couleur', 'style'],
    defauts: { taille: 5, epaisseur: 1, couleur: C.clBlue, style: 'tpcroixp' },
    points: [['a1x', 'a1y']],
    calculer: function (p, ctx) {
      var diag = Math.sqrt(sqr(ctx.xxmax - ctx.xxmin) + sqr(ctx.yymax - ctx.yymin));
      if (p.taille / 1000 * diag < ctx.taillemini || hors(ctx, p.a1x, p.a1y)) return echec('Point trop petit ou hors de l’espace de travail.');
      return { ok: true, g: copier(p), p: p };
    }
  };

  /* =================================================================== */
  /* Ordre officiel des types (ordre d'écriture du .opt, ray1.pas 7603+) */
  /* =================================================================== */
  OptGeo.ordreTypes = ['miroirplan', 'reseau', 'mscopa', 'mscepa', 'mscore', 'mscere', 'lmc', 'lmd', 'rayon', 'sourceponctuelle',
    'ondeplane', 'ecran', 'diaphragme', 'lsr', 'polyhedre', 'prisme', 'polycercle', 'sphere', 'miroirconique', 'texte', 'lec',
    'angle', 'fleche', 'oeil', 'metre', 'jolipoint'];
  for (var nomType in T) T[nomType].nom = nomType;

  /* =================================================================== */
  /* Transformations génériques (translation, rotation)                  */
  /* =================================================================== */
  /**
   * Applique fPoint(x,y)->[x',y'] à tous les points de position, fVecteur aux
   * vecteurs (direction d'un rayon) et ajoute dAngle aux paramètres angulaires.
   */
  OptGeo.transformerParametres = function (type, p, fPoint, fVecteur, dAngle) {
    var t = T[type];
    if (!t) throw OptGeo.Erreur('Type inconnu : ' + type);
    var q;
    if (t.transformer) q = t.transformer(p, fPoint);
    else {
      q = copier(p);
      (t.points || []).forEach(function (c) { var r = fPoint(p[c[0]], p[c[1]]); q[c[0]] = r[0]; q[c[1]] = r[1]; });
    }
    if (fVecteur) (t.vecteurs || []).forEach(function (c) { var r = fVecteur(p[c[0]], p[c[1]]); q[c[0]] = r[0]; q[c[1]] = r[1]; });
    if (dAngle) (t.angles || []).forEach(function (c) { q[c] = p[c] + dAngle; });
    return q;
  };

  /** Point de référence d'un objet (centre de rotation, isobarycentre des groupes). */
  OptGeo.centreObjet = function (type, g) {
    switch (type) {
      case 'miroirplan': case 'reseau': case 'ecran': case 'lsr': case 'fleche': case 'metre': case 'diaphragme':
      case 'oeil': case 'angle': return { x: g.cx, y: g.cy };
      case 'mscopa': case 'mscepa': case 'mscore': case 'mscere': case 'miroirconique': return { x: g.sx, y: g.sy };
      case 'lmc': case 'lmd': case 'lec': return { x: g.ox, y: g.oy };
      case 'rayon': return { x: g.ax + g.kx / 2, y: g.ay + g.ky / 2 };
      case 'sourceponctuelle': return { x: g.sx, y: g.sy };
      case 'ondeplane': return { x: g.gx, y: g.gy };
      case 'polyhedre': case 'polycercle': case 'prisme': return { x: g.xiso, y: g.yiso };
      case 'sphere': return { x: g.cx, y: g.cy };
      case 'texte': return { x: g.x, y: g.y };
      case 'jolipoint': return { x: g.a1x, y: g.a1y };
    }
    return { x: 0, y: 0 };
  };

  /** Type est-il un « milieu » réfractant ? */
  OptGeo.estMilieu = function (type) { return type === 'polyhedre' || type === 'prisme' || type === 'polycercle' || type === 'sphere' || type === 'lec'; };
  OptGeo.estSource = function (type) { return type === 'rayon' || type === 'sourceponctuelle' || type === 'ondeplane'; };

  OptGeo.objetsInternes = { estouPolyhedre: estouPolyhedre, estouPrisme: estouPrisme, estouPolycercle: estouPolycercle, estouLec: estouLec,
    angleArctan: angleArctan, num: num, ent: ent, bool: bool };
})(typeof globalThis !== 'undefined' ? globalThis : this);
