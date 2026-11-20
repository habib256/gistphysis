/*
 * OptGeo (portage JavaScript) — moteur, partie 0 : espace de noms, constantes,
 * utilitaires mathématiques et géométriques.
 *
 * Portage du logiciel OptGeo 3.03 de Jean-Marie Biansan (Lazarus/Free Pascal),
 * distribué sous licence GNU GPL version 2 ou ultérieure. Ce portage est
 * distribué sous la même licence.
 *
 * Correspondance Pascal : unit222.pas lignes 13–35 (constantes), 1066–1560
 * (IsPointInPolygon, Le_point_est_il_sur_une_droite, les_deux_cercles_se_coupent_ils,
 * Le_segment_et_le_cercle_se_coupent_ils, Les_deux_segments_se_coupent_ils,
 * maximum, minimum, partieentiere, puissance, DonneAnglePolaireDansPiPi,
 * DonneAnglePolaireDans02Pi), 3152 (arccos).
 *
 * Script classique (pas de module ES) : tout est rangé dans globalThis.OptGeo.
 */
(function (racine) {
  'use strict';

  var OptGeo = racine.OptGeo || (racine.OptGeo = {});
  OptGeo.version = '3.03-js-1';

  var PI = Math.PI;

  /* ------------------------------------------------------------------ */
  /* Constantes reprises de unit222.pas                                  */
  /* ------------------------------------------------------------------ */
  OptGeo.constantes = {
    maxsommet: 500,
    maxmaxsegment: 500,          // nombre maximal de segments pour un rayon
    maxrayonsparsourceponctuelle: 500,
    maxrayonsparondeplane: 500,
    maxtotalsegment: 10000,      // taille du tableau des « fantômes »
    maxsurfacesondeparsource: 500,
    maxelementsgroupe: 100,
    versionprogramme: 301,       // ray1.pas : versionprogramme:=301
    // Garde-fou propre au portage (absent de l'original) : nombre total de
    // segments au-delà duquel le tracé s'arrête et signale « tronque ».
    gardeFouSegments: 300000
  };

  /* ------------------------------------------------------------------ */
  /* Couleurs Lazarus (TColor = $00BBGGRR)                               */
  /* ------------------------------------------------------------------ */
  var C = OptGeo.couleurs = {
    clBlack: 0x000000,
    clMaroon: 0x000080,
    clGreen: 0x008000,
    clOlive: 0x008080,
    clNavy: 0x800000,
    clPurple: 0x800080,
    clTeal: 0x808000,
    clGray: 0x808080,
    clSilver: 0xC0C0C0,
    clRed: 0x0000FF,
    clLime: 0x00FF00,
    clYellow: 0x00FFFF,
    clBlue: 0xFF0000,
    clFuchsia: 0xFF00FF,
    clAqua: 0xFFFF00,
    clWhite: 0xFFFFFF
  };

  // Couleurs « système » (valeurs négatives dans les fichiers, ex. -2147483640
  // = $80000008 = clWindowText). On les rend avec une couleur plausible.
  var COULEURS_SYSTEME = {
    0x80000000: 0xC8D0D4, // clScrollBar
    0x80000001: 0x000000, // clBackground
    0x80000005: 0xFFFFFF, // clWindow
    0x80000006: 0x000000, // clWindowFrame
    0x80000008: 0x000000, // clWindowText
    0x8000000F: 0xC8D0D4, // clBtnFace
    0x80000012: 0x000000  // clBtnText
  };

  /** Convertit une TColor (entier, éventuellement négatif) en couleur CSS "#rrggbb". */
  OptGeo.couleurCss = function (tcolor) {
    var v = Number(tcolor);
    if (!isFinite(v)) v = 0;
    if (v < 0) v = v + 0x100000000;          // entier signé 32 bits -> non signé
    if (v >= 0x80000000) {
      v = COULEURS_SYSTEME.hasOwnProperty(v) ? COULEURS_SYSTEME[v] : 0;
    }
    v = v & 0xFFFFFF;
    var r = v & 0xFF, g = (v >> 8) & 0xFF, b = (v >> 16) & 0xFF;
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };

  /** Convertit une couleur CSS "#rrggbb" en TColor. */
  OptGeo.couleurDepuisCss = function (css) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(css).trim());
    if (!m) return 0;
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return r | (g << 8) | (b << 16);
  };

  /* ------------------------------------------------------------------ */
  /* Utilitaires mathématiques (portage fidèle)                          */
  /* ------------------------------------------------------------------ */
  function sqr(x) { return x * x; }

  /** unit222.pas, DonneAnglePolaireDansPiPi. */
  function donneAnglePolaireDansPiPi(x, y) {
    if (x === 0 && y === 0) return 0;
    if (x === 0) return y > 0 ? PI / 2 : -PI / 2;
    if (y === 0) return x > 0 ? 0 : PI;
    var toto = Math.atan(y / x);
    if (x < 0) toto = toto + PI;
    if (toto > PI) toto = toto - 2 * PI;
    if (toto < -PI) toto = toto + 2 * PI;
    return toto;
  }

  /** unit222.pas, DonneAnglePolaireDans02Pi. */
  function donneAnglePolaireDans02Pi(x, y) {
    var toto = donneAnglePolaireDansPiPi(x, y);
    if (toto < 0) toto = toto + 2 * PI;
    return toto;
  }

  /** unit222.pas ligne 3152 : arccos « maison » (renvoie 0 si |x|>1). */
  function arccos(x) {
    if (Math.abs(x) > 1) return 0;
    if (x === 0) return PI / 2;
    if (x > 0) return Math.atan(Math.sqrt(1 - sqr(x)) / x);
    return Math.atan(Math.sqrt(1 - sqr(x)) / x) + PI;
  }

  /** Arcsin de la RTL (Math.arcsin) : NaN hors de [-1,1] en JS (exception en Pascal). */
  function arcsin(x) { return Math.asin(x); }

  function maximum(a, b) { return a > b ? a : b; }
  function minimum(a, b) { return a < b ? a : b; }

  /** Pascal int() : troncature vers zéro. */
  function intp(x) { return x < 0 ? Math.ceil(x) : Math.floor(x); }
  /** Pascal frac(). */
  function fracp(x) { return x - intp(x); }

  /** unit222.pas, partieentiere (partie entière vers -infini). */
  function partieentiere(x) {
    if (x >= 0) return intp(x);
    if (fracp(x) === 0) return x;
    return intp(x) - 1;
  }

  /** unit222.pas, puissance. */
  function puissance(x, exposant) {
    if (exposant === 0) return 1;
    if (x > 0) return Math.exp(exposant * Math.log(x));
    return 0;
  }

  /** unit222.pas, IsPointInPolygon (poly : tableau de {ax,ay}, indices 0..n-1). */
  function isPointInPolygon(AX, AY, poly, npoints) {
    var inside = false;
    if (npoints < 3) return false;
    var xold = poly[npoints - 1].ax, yold = poly[npoints - 1].ay;
    for (var i = 0; i < npoints; i++) {
      var xnew = poly[i].ax, ynew = poly[i].ay, x1, x2, y1, y2;
      if (xnew > xold) { x1 = xold; x2 = xnew; y1 = yold; y2 = ynew; }
      else { x1 = xnew; x2 = xold; y1 = ynew; y2 = yold; }
      if (((xnew < AX) === (AX <= xold)) && ((AY - y1) * (x2 - x1) < (y2 - y1) * (AX - x1))) {
        inside = !inside;
      }
      xold = xnew; yold = ynew;
    }
    return inside;
  }

  /** unit222.pas, Le_point_est_il_sur_une_droite. Renvoie {sur, para}. */
  function lePointEstIlSurUneDroite(x, y, ax, ay, bx, by, tol) {
    var para = 10;
    var angle = Math.abs(donneAnglePolaireDans02Pi(x - ax, y - ay) - donneAnglePolaireDans02Pi(bx - ax, by - ay));
    var d = Math.sqrt(sqr(x - ax) + sqr(y - ay)) * Math.abs(Math.sin(angle));
    if (d > tol * Math.sqrt(sqr(bx - ax) + sqr(by - ay))) return { sur: false, para: para };
    if (bx !== ax) para = (x - ax) / (bx - ax);
    else if (by !== ay) para = (y - ay) / (by - ay);
    else para = 10;
    return { sur: true, para: para };
  }

  /** unit222.pas, Les_deux_segments_se_coupent_ils (bogue d'origine conservé pour le cas colinéaire). */
  function lesDeuxSegmentsSeCoupentIls(Ax, Ay, Bx, By, Cx, Cy, Dx, Dy) {
    var denom = (Bx - Ax) * (Dy - Cy) - (By - Ay) * (Dx - Cx);
    var num1 = (Ay - Cy) * (Dx - Cx) - (Ax - Cx) * (Dy - Cy);
    var num2 = (Ay - Cy) * (Bx - Ax) - (Ax - Cx) * (By - Ay);
    if (denom === 0 && num1 !== 0) return false;
    if (denom === 0 && num1 === 0) {
      return !((Math.min(Cx, Dx) > Math.max(Ax, Bx)) || (Math.max(Cx, Dx) > Math.min(Ax, Bx)));
    }
    var r = num1 / denom, s = num2 / denom;
    return (r >= 0) && (r <= 1) && (s >= 0) && (s <= 1);
  }

  function paraArc(ap, theta1, theta2, tol, ancien) {
    var p = ancien;
    if (ap >= theta1 - tol && ap <= theta2 + tol) p = (ap - theta1) / (theta2 - theta1);
    if (ap + 2 * PI >= theta1 - tol && ap + 2 * PI <= theta2 + tol) p = (ap + 2 * PI - theta1) / (theta2 - theta1);
    if (ap - 2 * PI >= theta1 - tol && ap - 2 * PI <= theta2 + tol) p = (ap - 2 * PI - theta1) / (theta2 - theta1);
    return p;
  }

  /**
   * unit222.pas, Le_segment_et_le_cercle_se_coupent_ils.
   * Renvoie {n, paraseg1, paracer1, paraseg2, paracer2}.
   */
  function leSegmentEtLeCercleSeCoupentIls(Ax, Ay, Bx, By, Cx, Cy, R, theta1, theta2, tol) {
    var r = { n: 0, paraseg1: 10, paracer1: 10, paraseg2: 10, paracer2: 10 };
    var a = sqr(Bx - Ax) + sqr(By - Ay);
    var b = 2 * ((Ax - Cx) * (Bx - Ax) + (Ay - Cy) * (By - Ay));
    var c = sqr(Ax - Cx) + sqr(Ay - Cy) - sqr(R);
    var delta = sqr(b) - 4 * a * c;
    if (delta < -tol) return r;
    if (Math.abs(delta) < tol) {
      var t = -b / 2 / a;
      r.paraseg1 = t;
      if (t < -tol || t > 1 + tol) return r;
      var xi = Ax + t * (Bx - Ax), yi = Ay + t * (By - Ay);
      var ap = donneAnglePolaireDans02Pi(xi - Cx, yi - Cy);
      r.paracer1 = paraArc(ap, theta1, theta2, tol, r.paracer1);
      r.n = (r.paraseg1 >= -tol && r.paraseg1 <= 1 + tol && r.paracer1 >= -tol && r.paracer1 <= 1 + tol) ? 1 : 0;
      return r;
    }
    var t1 = (-b + Math.sqrt(delta)) / 2 / a, t2 = (-b - Math.sqrt(delta)) / 2 / a;
    if ((t1 < -tol || t1 > 1 + tol) && (t2 < -tol || t2 > 1 + tol)) return r;
    var n = 0;
    if (t1 >= -tol && t1 <= 1 + tol) {
      r.paraseg1 = t1;
      var ap1 = donneAnglePolaireDans02Pi(Ax + t1 * (Bx - Ax) - Cx, Ay + t1 * (By - Ay) - Cy);
      r.paracer1 = paraArc(ap1, theta1, theta2, tol, r.paracer1);
      if (r.paraseg1 >= -tol && r.paraseg1 <= 1 + tol && r.paracer1 >= -tol && r.paracer1 <= 1 + tol) n++;
    }
    if (t2 >= -tol && t2 <= 1 + tol) {
      r.paraseg2 = t2;
      var ap2 = donneAnglePolaireDans02Pi(Ax + t2 * (Bx - Ax) - Cx, Ay + t2 * (By - Ay) - Cy);
      r.paracer2 = paraArc(ap2, theta1, theta2, tol, r.paracer2);
      if (r.paraseg2 >= -tol && r.paraseg2 <= 1 + tol && r.paracer2 >= -tol && r.paracer2 <= 1 + tol) {
        n++;
        if (n === 1) { r.paracer1 = r.paracer2; r.paraseg1 = r.paraseg2; }
      }
    }
    r.n = n;
    return r;
  }

  function paraArcSansTol(theta, t1, t2, ancien) {
    var p = ancien;
    if (theta >= t1 && theta <= t2) p = (theta - t1) / (t2 - t1);
    if (theta - 2 * PI >= t1 && theta - 2 * PI <= t2) p = (theta - 2 * PI - t1) / (t2 - t1);
    if (theta + 2 * PI >= t1 && theta + 2 * PI <= t2) p = (theta + 2 * PI - t1) / (t2 - t1);
    return p;
  }

  /**
   * unit222.pas, les_deux_cercles_se_coupent_ils. Les bogues d'origine sont
   * conservés : dans le cas y0=y1, N n'est pas initialisé (on le prend nul) et,
   * pour une seule solution, l'original écrit para3:=para1 au lieu de para1:=para3.
   * Renvoie {n, para1, para2, para3, para4}.
   */
  function lesDeuxCerclesSeCoupentIls(x0, y0, x1, y1, r0, r1, t01, t02, t11, t12) {
    var r = { n: 0, para1: 10, para2: 10, para3: 10, para4: 10 };
    var N = 0, A, B, Cc, delta, xx, yy, xx1, yy1, th0, th1, n;
    if (y0 !== y1) {
      N = (sqr(r1) - sqr(r0) - sqr(x1) + sqr(x0) - sqr(y1) + sqr(y0)) / 2 / (y0 - y1);
      A = sqr((x0 - x1) / (y0 - y1)) + 1;
      B = 2 * y0 * (x0 - x1) / (y0 - y1) - 2 * N * (x0 - x1) / (y0 - y1) - 2 * x0;
      Cc = sqr(x0) + sqr(y0) + sqr(N) - sqr(r0) - 2 * y0 * N;
      delta = sqr(B) - 4 * A * Cc;
      if (delta < 0) return r;
      if (delta === 0) {
        xx = -B / 2 / A; yy = N - xx * (x0 - x1) / (y0 - y1);
        r.para1 = paraArcSansTol(donneAnglePolaireDans02Pi(xx - x0, yy - y0), t01, t02, r.para1);
        r.para2 = paraArcSansTol(donneAnglePolaireDans02Pi(xx - x1, yy - y1), t11, t12, r.para2);
        r.n = (r.para1 >= 0 && r.para1 <= 1 && r.para2 >= 0 && r.para2 <= 1) ? 1 : 0;
        return r;
      }
      xx1 = (-B + Math.sqrt(delta)) / 2 / A; yy1 = N - xx1 * (x0 - x1) / (y0 - y1);
      r.para1 = paraArcSansTol(donneAnglePolaireDans02Pi(xx1 - x0, yy1 - y0), t01, t02, r.para1);
      r.para2 = paraArcSansTol(donneAnglePolaireDans02Pi(xx1 - x1, yy1 - y1), t11, t12, r.para2);
      xx1 = (-B - Math.sqrt(delta)) / 2 / A; yy1 = N - xx1 * (x0 - x1) / (y0 - y1);
      r.para3 = paraArcSansTol(donneAnglePolaireDans02Pi(xx1 - x0, yy1 - y0), t01, t02, r.para3);
      r.para4 = paraArcSansTol(donneAnglePolaireDans02Pi(xx1 - x1, yy1 - y1), t11, t12, r.para4);
      n = 0;
      if (r.para1 >= 0 && r.para1 <= 1 && r.para2 >= 0 && r.para2 <= 1) n++;
      if (r.para3 >= 0 && r.para3 <= 1 && r.para4 >= 0 && r.para4 <= 1) {
        n++;
        if (n === 1) { r.para1 = r.para3; r.para2 = r.para4; }
      }
      r.n = n;
      return r;
    }
    // cas y0 = y1
    xx = (sqr(r1) - sqr(r0) - sqr(x1) + sqr(x0)) / 2 / (x0 - x1);
    A = 1; B = -2 * y1; Cc = sqr(x1) + sqr(xx) - 2 * x1 * xx + sqr(y1) - sqr(r1);
    delta = sqr(B) - 4 * A * Cc;
    if (delta < 0) return r;
    if (delta === 0) {
      xx = -B / 2 / A; yy = N - xx * (x0 - x1) / (y0 - y1);
      r.para1 = paraArcSansTol(donneAnglePolaireDans02Pi(xx - x0, yy - y0), t01, t02, r.para1);
      r.para2 = paraArcSansTol(donneAnglePolaireDans02Pi(xx - x1, yy - y1), t11, t12, r.para2);
      r.n = (r.para1 >= 0 && r.para1 <= 1 && r.para2 >= 0 && r.para2 <= 1) ? 1 : 0;
      return r;
    }
    xx1 = (-B + Math.sqrt(delta)) / 2 / A; yy1 = N - xx1 * (x0 - x1) / (y0 - y1);
    r.para1 = paraArcSansTol(donneAnglePolaireDans02Pi(xx1 - x0, yy1 - y0), t01, t02, r.para1);
    r.para2 = paraArcSansTol(donneAnglePolaireDans02Pi(xx1 - x1, yy1 - y1), t11, t12, r.para2);
    xx1 = (-B - Math.sqrt(delta)) / 2 / A; yy1 = N - xx1 * (x0 - x1) / (y0 - y1);
    r.para3 = paraArcSansTol(donneAnglePolaireDans02Pi(xx1 - x0, yy1 - y0), t01, t02, r.para3);
    r.para4 = paraArcSansTol(donneAnglePolaireDans02Pi(xx1 - x1, yy1 - y1), t11, t12, r.para4);
    n = 0;
    if (r.para1 >= 0 && r.para1 <= 1 && r.para2 >= 0 && r.para2 <= 1) n++;
    if (r.para3 >= 0 && r.para3 <= 1 && r.para4 >= 0 && r.para4 <= 1) {
      n++;
      if (n === 1) { r.para3 = r.para1; r.para2 = r.para4; } // bogue d'origine conservé
    }
    r.n = n;
    return r;
  }

  /**
   * Liste de segments « virtuels » (chaînes vav / vaa du type "(1,3,5)").
   * Équivalent exact du test Pascal pos(','+i+',') or pos('('+i+',') or
   * pos(','+i+')') or pos('('+i+')') : renvoie l'ensemble des jetons présents.
   */
  function jetonsListe(chaine) {
    var ens = Object.create(null);
    if (!chaine) return ens;
    var re = /[(,]([^(),]*)(?=[,)])/g, m;
    while ((m = re.exec(chaine)) !== null) {
      ens[m[1]] = true;
      re.lastIndex = m.index + 1;
    }
    return ens;
  }

  /** Tableau booléen indicé 1..max (l_vav[i] du Pascal). */
  function listeBooleens(chaine, max, decalage) {
    var ens = jetonsListe(chaine), t = new Array(max + 2);
    decalage = decalage || 0;
    for (var i = 1; i <= max + 1; i++) t[i] = !!ens[String(i + decalage)];
    return t;
  }

  /**
   * rayon.createenfant : liste "(…)" décalée de « decalage » et limitée à 1..max
   * (équivalent rapide de listeBooleens puis chaineListe : seuls les jetons écrits
   * comme des entiers sans zéro initial sont reconnus, comme avec pos() en Pascal).
   */
  function decalerListe(chaine, max, decalage) {
    var ens = jetonsListe(chaine), res = [];
    for (var t in ens) {
      if (!/^-?\d+$/.test(t) || String(parseInt(t, 10)) !== t) continue;
      var n = parseInt(t, 10) - (decalage || 0);
      if (n >= 1 && n <= max) res.push(n);
    }
    res.sort(function (a, b) { return a - b; });
    return '(' + res.join(',') + ')';
  }

  /** Reconstruit "(1,3)" à partir d'un tableau booléen (rayon.createenfant). */
  function chaineListe(t, max) {
    var s = '(';
    for (var i = 1; i <= max; i++) if (t[i]) s += i + ',';
    if (s.charAt(s.length - 1) === ',') s = s.slice(0, -1) + ')'; else s = s + ')';
    return s;
  }

  OptGeo.math = {
    PI: PI,
    sqr: sqr,
    donneAnglePolaireDansPiPi: donneAnglePolaireDansPiPi,
    donneAnglePolaireDans02Pi: donneAnglePolaireDans02Pi,
    arccos: arccos,
    arcsin: arcsin,
    maximum: maximum,
    minimum: minimum,
    intp: intp,
    fracp: fracp,
    partieentiere: partieentiere,
    puissance: puissance,
    isPointInPolygon: isPointInPolygon,
    lePointEstIlSurUneDroite: lePointEstIlSurUneDroite,
    lesDeuxSegmentsSeCoupentIls: lesDeuxSegmentsSeCoupentIls,
    leSegmentEtLeCercleSeCoupentIls: leSegmentEtLeCercleSeCoupentIls,
    lesDeuxCerclesSeCoupentIls: lesDeuxCerclesSeCoupentIls,
    jetonsListe: jetonsListe,
    listeBooleens: listeBooleens,
    chaineListe: chaineListe,
    decalerListe: decalerListe
  };

  /** Copie profonde simple (objets JSON). */
  OptGeo.copie = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };

  /** Erreur du moteur (message en français). */
  function ErreurOptGeo(message, details) {
    var e = new Error(message);
    e.name = 'ErreurOptGeo';
    if (details) e.details = details;
    return e;
  }
  OptGeo.Erreur = ErreurOptGeo;

  if (typeof module !== 'undefined' && module.exports) module.exports = OptGeo;
})(typeof globalThis !== 'undefined' ? globalThis : this);
