/*
 * OptGeo (portage JavaScript) — moteur, partie 5 : rendu Canvas 2D.
 *
 * Portage des méthodes « dessine » de unit222.pas (aspect normal, hors modes
 * d'édition), de Rafraichit (ordre de dessin) et de DessineTousLesSegments
 * (rayons, empennage, prolongements virtuels en pointillés, normales, longueurs),
 * ainsi que des primitives de monbitmap.pas (trait, cercle, arc, disque, polygone,
 * grille). Le repère monde a l'axe y vers le haut, comme dans OptGeo.
 *
 *   var vue = OptGeo.creerVue(scene.options, largeurPx, hauteurPx);
 *   OptGeo.dessinerScene(ctx, scene, vue, { selection: [id], poignees: true });
 *
 * Les épaisseurs sont en pixels (comme dans OptGeo) ; les tailles exprimées en
 * fraction de la diagonale de l'espace (hachures, flèches…) sont divisées par
 * « zoomfactor » comme dans l'original (vue.zoom, entier ≥ 1).
 * Particularité conservée : un trait n'est dessiné que si ses deux extrémités
 * sont dans l'espace de travail (TMonBitmap.Trait).
 */
(function (racine) {
  'use strict';
  var OptGeo = racine.OptGeo;
  var M = OptGeo.math, PI = Math.PI, sqr = M.sqr;
  var css = OptGeo.couleurCss, C = OptGeo.couleurs;

  /**
   * Vue : transformation monde -> écran (pixels CSS).
   * @param {object} o options de la scène (xxmin…yymax, respectrapport)
   * @param {number} largeur, hauteur taille du canevas en pixels CSS
   * @param {object} [reglages] {zoom: facteur (1 = espace entier visible), cx, cy: centre visé (monde),
   *        marge: pixels, respectrapport: forcer}
   */
  function creerVue(o, largeur, hauteur, reglages) {
    reglages = reglages || {};
    var marge = reglages.marge === undefined ? 0 : reglages.marge;
    var zoom = reglages.zoom || 1;
    var lw = o.xxmax - o.xxmin, lh = o.yymax - o.yymin;
    var respect = reglages.respectrapport !== undefined ? reglages.respectrapport : o.respectrapport;
    var sx = (largeur - 2 * marge) / lw, sy = (hauteur - 2 * marge) / lh;
    if (respect) { var s = Math.min(sx, sy); sx = s; sy = s; }
    sx *= zoom; sy *= zoom;
    var cx = reglages.cx !== undefined ? reglages.cx : (o.xxmin + o.xxmax) / 2;
    var cy = reglages.cy !== undefined ? reglages.cy : (o.yymin + o.yymax) / 2;
    var ox = largeur / 2 - cx * sx, oy = hauteur / 2 + cy * sy;
    var v = {
      largeur: largeur, hauteur: hauteur, sx: sx, sy: sy, ox: ox, oy: oy, zoom: zoom,
      zoomfactor: Math.max(1, Math.round(zoom)),
      versEcran: function (x, y) { return [ox + x * sx, oy - y * sy]; },
      versMonde: function (px, py) { return [(px - ox) / sx, (oy - py) / sy]; },
      /** Longueur monde correspondant à n pixels (pour les tolérances au doigt). */
      pixelsEnMonde: function (n) { return n / Math.min(sx, sy); }
    };
    return v;
  }
  OptGeo.creerVue = creerVue;

  var TIRETS = {
    pssolid: null, psdot: [2, 3], psdash: [9, 3], psdashdot: [9, 3, 2, 3], psdashdotdot: [9, 3, 2, 3, 2, 3]
  };

  /** Contexte de dessin : primitives de TMonBitmap. */
  function Dessin(ctx, vue, o) {
    this.ctx = ctx; this.vue = vue; this.o = o;
    this.diag = Math.sqrt(sqr(o.xxmax - o.xxmin) + sqr(o.yymax - o.yymin));
    this.zf = vue.zoomfactor;
  }
  Dessin.prototype.dans = function (x, y) {
    var o = this.o;
    return !(x > o.xxmax || x < o.xxmin || y > o.yymax || y < o.yymin);
  };
  Dessin.prototype.style = function (couleur, epaisseur, tirets) {
    var c = this.ctx;
    c.strokeStyle = css(couleur);
    c.lineWidth = Math.max(1, epaisseur || 1);
    var t = TIRETS[tirets || 'pssolid'];
    c.setLineDash(t ? t.map(function (d) { return d * Math.max(1, epaisseur || 1); }) : []);
  };
  /** Trait (monde) ; refusé si une extrémité sort de l'espace (comme l'original). */
  Dessin.prototype.trait = function (x1, y1, x2, y2, epaisseur, couleur, tirets) {
    if (!this.dans(x1, y1) || !this.dans(x2, y2)) return false;
    var a = this.vue.versEcran(x1, y1), b = this.vue.versEcran(x2, y2), c = this.ctx;
    this.style(couleur, epaisseur, tirets);
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    return true;
  };
  /** Cercle de rayon en pixels. */
  Dessin.prototype.cercle = function (x, y, rayonPx, epaisseur, couleur) {
    var o = this.o;
    if (x <= o.xxmin || x >= o.xxmax || y < o.yymin || y > o.yymax || rayonPx === 0) return;
    var p = this.vue.versEcran(x, y), c = this.ctx;
    this.style(couleur, epaisseur);
    c.beginPath(); c.arc(p[0], p[1], rayonPx, 0, 2 * PI); c.stroke();
  };
  /** Disque plein de rayon monde (TMonBitmap.disque). */
  Dessin.prototype.disque = function (x, y, rayon, couleurBord, couleurFond, transparent) {
    var c = this.ctx, v = this.vue, p = v.versEcran(x, y);
    c.setLineDash([]); c.lineWidth = 1;
    c.beginPath(); c.ellipse(p[0], p[1], Math.abs(rayon * v.sx), Math.abs(rayon * v.sy), 0, 0, 2 * PI);
    if (!transparent) { c.fillStyle = css(couleurFond); c.fill(); }
    c.strokeStyle = css(couleurBord); c.stroke();
  };
  /** Points d'un arc (monde) de t1 à t2 dans le sens direct. */
  Dessin.prototype.pointsArc = function (cx, cy, r, t1, t2) {
    var v = this.vue, n = Math.max(8, Math.min(720, Math.ceil(Math.abs(t2 - t1) * r * Math.max(v.sx, v.sy) / 3)));
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = t1 + (t2 - t1) * i / n;
      pts.push(v.versEcran(cx + r * Math.cos(t), cy + r * Math.sin(t)));
    }
    return pts;
  };
  /** Arc de cercle (TMonBitmap.arcdecercle) : de theta1 à theta2, sens direct. */
  Dessin.prototype.arc = function (cx, cy, r, epaisseur, theta1, theta2, couleur, tirets) {
    if (r === 0) return;
    var t1 = M.donneAnglePolaireDans02Pi(Math.cos(theta1), Math.sin(theta1));
    var t2 = M.donneAnglePolaireDans02Pi(Math.cos(theta2), Math.sin(theta2));
    if (t1 > t2) t1 = t1 - 2 * PI;
    var pts = this.pointsArc(cx, cy, Math.abs(r), t1, t2), c = this.ctx;
    this.style(couleur, epaisseur, tirets);
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  };
  /** Polygone plein (TMonBitmap.tracepolygone). */
  Dessin.prototype.polygone = function (xs, ys, couleurBord, couleurFond, transparent) {
    var c = this.ctx, v = this.vue;
    c.setLineDash([]); c.lineWidth = 1;
    c.beginPath();
    for (var i = 0; i < xs.length; i++) {
      var p = v.versEcran(xs[i], ys[i]);
      if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]);
    }
    c.closePath();
    if (!transparent) { c.fillStyle = css(couleurFond); c.fill(); }
    c.strokeStyle = css(couleurBord); c.stroke();
  };
  /** Chemin fermé rempli (liste de points écran). */
  Dessin.prototype.remplir = function (pts, couleur) {
    var c = this.ctx;
    c.beginPath();
    pts.forEach(function (p, i) { if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); });
    c.closePath(); c.fillStyle = css(couleur); c.fill();
  };
  Dessin.prototype.croixx = function (x, y, demi, epaisseur, couleur) {
    var p = this.vue.versEcran(x, y), c = this.ctx;
    this.style(couleur, epaisseur);
    c.beginPath(); c.moveTo(p[0] - demi, p[1] - demi); c.lineTo(p[0] + demi, p[1] + demi);
    c.moveTo(p[0] + demi, p[1] - demi); c.lineTo(p[0] - demi, p[1] + demi); c.stroke();
  };
  /** Texte en pixels écran (TMonBitmap.ecrireI : coin haut-gauche). */
  Dessin.prototype.texte = function (px, py, s, police, couleur) {
    var c = this.ctx;
    c.font = police || '13px "Arial Narrow", Arial, sans-serif';
    c.fillStyle = css(couleur === undefined ? C.clBlack : couleur);
    c.textBaseline = 'top'; c.textAlign = 'left';
    c.fillText(s, px, py);
  };
  Dessin.prototype.mesure = function (s, police) {
    var c = this.ctx; c.font = police || '13px "Arial Narrow", Arial, sans-serif';
    var m = c.measureText(s);
    return { l: m.width, h: Math.round(parseFloat(c.font) * 1.15) || 15 };
  };

  /** Nombre au format floattostrf(fffixed) à la française. */
  function fixe(x, decimales) { return x.toFixed(Math.max(0, decimales)).replace('.', ','); }
  OptGeo.formatFixe = fixe;

  /* ================================================================== */
  /* Dessin des objets                                                  */
  /* ================================================================== */
  var D = {};
  function hachuresDroites(d, g, ep, couleur, cote) {
    var ttai = d.diag, nb = (Math.trunc(g.taille / (ttai / 100)) + 1) * d.zf;
    for (var i = 1; i <= nb; i++) {
      var x = g.a1x + i / (nb + 1) * (g.a2x - g.a1x), y = g.a1y + i / (nb + 1) * (g.a2y - g.a1y);
      d.trait(x, y, x + ttai / 100 / d.zf * Math.cos(g.anglepolaire + cote), y + ttai / 100 / d.zf * Math.sin(g.anglepolaire + cote), ep, couleur);
    }
  }
  D.miroirplan = function (d, g) {
    d.trait(g.a1x, g.a1y, g.a2x, g.a2y, g.epaisseur, g.couleur);
    if (g.hachures) hachuresDroites(d, g, g.epaisseur, g.couleur, -PI / 2);
  };
  D.reseau = function (d, g) {
    d.trait(g.a1x, g.a1y, g.a2x, g.a2y, g.epaisseur, g.couleur, 'psdot');
    if (g.hachures && !g.entransmission) hachuresDroites(d, g, g.epaisseur, g.couleur, -PI / 2);
  };
  D.ecran = function (d, g) { d.trait(g.a1x, g.a1y, g.a2x, g.a2y, g.epaisseur, g.couleur); };
  D.lsr = D.ecran;
  function msPara(d, g, convexe) {
    var t = d.diag / 100 / d.zf;
    if (!g.trou) d.trait(g.a1x, g.a1y, g.a2x, g.a2y, g.epaisseur, g.couleur);
    else {
      d.trait(g.a1x, g.a1y, g.t1x, g.t1y, g.epaisseur, g.couleur);
      d.trait(g.a2x, g.a2y, g.t2x, g.t2y, g.epaisseur, g.couleur);
      d.trait(g.t1x, g.t1y, g.t2x, g.t2y, g.epaisseur, g.couleur, 'psdot');
    }
    if (g.hachures) hachuresDroites(d, g, g.epaisseur, g.couleur, -PI / 2);
    var a1 = convexe ? 5 * PI / 4 : 3 * PI / 4, a2 = convexe ? -PI / 4 : PI / 4;
    d.trait(g.a1x, g.a1y, g.a1x + t * Math.cos(g.anglepolaire + a1), g.a1y + t * Math.sin(g.anglepolaire + a1), g.epaisseur, g.couleur);
    d.trait(g.a2x, g.a2y, g.a2x + t * Math.cos(g.anglepolaire + a2), g.a2y + t * Math.sin(g.anglepolaire + a2), g.epaisseur, g.couleur);
    if (g.axefocal) {
      d.trait(g.sx, g.sy, g.fx, g.fy, g.epaisseur, g.couleuraxe, 'psdashdot');
      d.cercle(g.fx, g.fy, 2 * g.epaisseur, g.epaisseur, g.couleuraxe);
    }
  }
  D.mscopa = function (d, g) { msPara(d, g, false); };
  D.mscepa = function (d, g) { msPara(d, g, true); };
  function lm(d, g, divergente) {
    var t = d.diag / 100 / d.zf, ap = g.anglepolaire;
    d.trait(g.a1x, g.a1y, g.a2x, g.a2y, g.epaisseur, g.couleur);
    var angles = divergente ? [3 * PI / 4, 5 * PI / 4, PI / 4, -PI / 4] : [-PI / 4, PI / 4, -3 * PI / 4, 3 * PI / 4];
    d.trait(g.a1x, g.a1y, g.a1x + t * Math.cos(ap + angles[0]), g.a1y + t * Math.sin(ap + angles[0]), g.epaisseur, g.couleur);
    d.trait(g.a1x, g.a1y, g.a1x + t * Math.cos(ap + angles[1]), g.a1y + t * Math.sin(ap + angles[1]), g.epaisseur, g.couleur);
    d.trait(g.a2x, g.a2y, g.a2x + t * Math.cos(ap + angles[2]), g.a2y + t * Math.sin(ap + angles[2]), g.epaisseur, g.couleur);
    d.trait(g.a2x, g.a2y, g.a2x + t * Math.cos(ap + angles[3]), g.a2y + t * Math.sin(ap + angles[3]), g.epaisseur, g.couleur);
    if (g.axefocal) {
      d.trait(g.f1x, g.f1y, g.f2x, g.f2y, g.epaisseur, g.couleuraxe, 'psdashdot');
      d.cercle(g.f1x, g.f1y, 2 * g.epaisseur, g.epaisseur, g.couleuraxe);
      d.cercle(g.f2x, g.f2y, 2 * g.epaisseur, g.epaisseur, g.couleuraxe);
    }
  }
  D.lmc = function (d, g) { lm(d, g, false); };
  D.lmd = function (d, g) { lm(d, g, true); };
  function msReel(d, g, convexe) {
    if (!g.trou) d.arc(g.cx, g.cy, g.rayoncourbure, g.epaisseur, g.theta1, g.theta2, g.couleur);
    else {
      d.arc(g.cx, g.cy, g.rayoncourbure, g.epaisseur, g.theta1, g.theta1p, g.couleur);
      d.arc(g.cx, g.cy, g.rayoncourbure, g.epaisseur, g.theta2p, g.theta2, g.couleur);
    }
    if (g.hachures) {
      var ttai = d.diag, nb = (Math.trunc(g.circonference / (ttai / 100)) + 1) * d.zf;
      var dr = (convexe ? -1 : 1) * ttai / 100 / d.zf;
      for (var i = 1; i <= nb; i++) {
        var th = g.theta1 + i / (nb + 1) * (g.theta2 - g.theta1);
        if (!g.trou || th <= g.theta1p || th >= g.theta2p)
          d.trait(g.cx + g.rayoncourbure * Math.cos(th), g.cy + g.rayoncourbure * Math.sin(th),
            g.cx + (g.rayoncourbure + dr) * Math.cos(th), g.cy + (g.rayoncourbure + dr) * Math.sin(th), g.epaisseur, g.couleur);
      }
    }
    if (g.axefocal) {
      d.trait(g.sx, g.sy, g.cx, g.cy, g.epaisseur, g.couleuraxe, 'psdashdot');
      d.cercle(g.cx, g.cy, 2 * g.epaisseur, g.epaisseur, g.couleuraxe);
    }
  }
  D.mscore = function (d, g) { msReel(d, g, false); };
  D.mscere = function (d, g) { msReel(d, g, true); };
  D.polyhedre = function (d, g) {
    var xs = [], ys = [];
    for (var i = 1; i <= g.nombresommet; i++) { xs.push(g.messommets[i].ax); ys.push(g.messommets[i].ay); }
    d.polygone(xs, ys, g.couleurbord, g.couleurfond, false);
  };
  D.prisme = D.polyhedre;
  D.sphere = function (d, g) { d.disque(g.cx, g.cy, g.rayon, g.couleurbord, g.couleurfond, false); };
  /** Contour d'un polycercle (côtés droits et arcs) — rempli, puis bord. */
  D.polycercle = function (d, g) {
    var pts = [], i, v = d.vue;
    for (i = 1; i <= g.nombresommet; i++) {
      var A = g.messommets[i], B = g.messommets[i + 1];
      if (g.rectiligne[i]) { pts.push(v.versEcran(A.ax, A.ay)); continue; }
      var c = g.mescentres[i], r = g.rayon[i];
      var ta = Math.atan2(A.ay - c.ay, A.ax - c.ax), tb = Math.atan2(B.ay - c.ay, B.ax - c.ax);
      var tm = Math.atan2(g.mess[i].ay - c.ay, g.mess[i].ax - c.ax);
      // parcours de A à B en passant par le point de contrôle
      var dd = tb - ta; while (dd <= -PI) dd += 2 * PI; while (dd > PI) dd -= 2 * PI;
      var dm = tm - ta; while (dm < 0) dm += 2 * PI;
      var sens = (dd > 0) ? (dm <= dd ? 1 : -1) : (dm >= 2 * PI + dd ? -1 : 1);
      if (sens > 0) { while (tb < ta) tb += 2 * PI; } else { while (tb > ta) tb -= 2 * PI; }
      pts = pts.concat(d.pointsArc(c.ax, c.ay, r, ta, tb).slice(0, -1));
    }
    d.remplir(pts, g.couleurfond);
    for (i = 1; i <= g.nombresommet; i++) {
      if (g.rectiligne[i]) d.trait(g.messommets[i].ax, g.messommets[i].ay, g.messommets[i + 1].ax, g.messommets[i + 1].ay, 1, g.couleurbord);
      else d.arc(g.mescentres[i].ax, g.mescentres[i].ay, g.rayon[i], 1, g.theta1[i], g.theta2[i], g.couleurbord);
    }
  };
  /** Lentille épaisse : surface remplie (l'original combine des cordes en XOR), contour noir. */
  D.lec = function (d, g) {
    var R1 = Math.abs(g.r1), R2 = Math.abs(g.r2);
    function bout(cx, cy, R, x, y, ta, tb) {
      // angle de (x,y) ramené dans [ta, tb]
      var t = Math.atan2(y - cy, x - cx);
      while (t < ta - 1e-9) t += 2 * PI; while (t > tb + 1e-9) t -= 2 * PI;
      return t;
    }
    var ta1 = bout(g.c1x, g.c1y, R1, g.a1x, g.a1y, g.theta1_1, g.theta2_1), tb1 = bout(g.c1x, g.c1y, R1, g.b1x, g.b1y, g.theta1_1, g.theta2_1);
    var ta2 = bout(g.c2x, g.c2y, R2, g.a2x, g.a2y, g.theta1_2, g.theta2_2), tb2 = bout(g.c2x, g.c2y, R2, g.b2x, g.b2y, g.theta1_2, g.theta2_2);
    var pts = d.pointsArc(g.c1x, g.c1y, R1, ta1, tb1).concat(d.pointsArc(g.c2x, g.c2y, R2, tb2, ta2));
    d.remplir(pts, g.couleurfond);
    d.arc(g.c1x, g.c1y, R1, 1, g.theta1_1, g.theta2_1, C.clBlack);
    d.arc(g.c2x, g.c2y, R2, 1, g.theta1_2, g.theta2_2, C.clBlack);
    if (g.tronque) {
      d.trait(g.a1x, g.a1y, g.a2x, g.a2y, 1, C.clBlack);
      d.trait(g.b1x, g.b1y, g.b2x, g.b2y, 1, C.clBlack);
    }
    if (g.axefocal) {
      d.trait(g.c1x, g.c1y, g.c2x, g.c2y, 1, g.couleuraxe, 'psdashdot');
      d.trait(g.s1x, g.s1y, g.s2x, g.s2y, 1, g.couleuraxe, 'psdashdot');
    }
  };
  D.miroirconique = function (d, g) {
    var e = g.excentricite, p = g.parametre, t0 = g.theta0;
    function r(t) { return p / (1 + e * Math.cos(t - t0)); }
    var pas = Math.abs(g.theta2 - g.theta1) / 180, th = g.theta1, ta = g.theta1, ra = r(ta), rr;
    while (th < g.theta2) {
      th = ta + pas; rr = r(th);
      if (th < g.theta2) {
        d.trait(g.fx + ra * Math.cos(ta), g.fy + ra * Math.sin(ta), g.fx + rr * Math.cos(th), g.fy + rr * Math.sin(th), 1, g.couleur);
        ta = th; ra = rr;
      }
    }
    rr = r(g.theta2);
    d.trait(g.fx + ra * Math.cos(ta), g.fy + ra * Math.sin(ta), g.fx + rr * Math.cos(g.theta2), g.fy + rr * Math.sin(g.theta2), 1, g.couleur);
    if (g.hachures) {
      var ttai = d.diag, l = ttai / 100 / d.zf;
      th = g.theta1; pas = ttai / 100 / r(g.theta1) / d.zf;
      var garde = 0;
      while (th <= g.theta2 && garde++ < 100000) {
        th = th + pas; rr = r(th); pas = ttai / 100 / rr / d.zf;
        var den = 1 / Math.sqrt(1 + sqr(e) + 2 * e * Math.cos(th - t0));
        var nx = den * (-e * Math.sin(th - t0) * Math.sin(th) - (1 + e * Math.cos(th - t0)) * Math.cos(th));
        var ny = den * (e * Math.sin(th - t0) * Math.cos(th) - (1 + e * Math.cos(th - t0)) * Math.sin(th));
        if (th <= g.theta2) {
          var s = g.concave ? -1 : 1;
          d.trait(g.fx + rr * Math.cos(th), g.fy + rr * Math.sin(th), g.fx + rr * Math.cos(th) + s * nx * l, g.fy + rr * Math.sin(th) + s * ny * l, 1, g.couleur);
        }
      }
    }
    if (g.axefocal) {
      d.trait(g.fx, g.fy, g.sx, g.sy, 1, g.couleuraxe, 'psdashdot');
      d.cercle(g.fx, g.fy, 2, 1, g.couleuraxe);
      d.cercle(g.sx, g.sy, 2, 1, g.couleuraxe);
    }
  };
  D.oeil = function (d, g) {
    var R = g.rayoncourbure, ap = g.anglepolaire, a = M.arccos(21 / 36);
    d.arc(g.cx, g.cy, R, g.epaisseur, ap - PI / 6, ap + PI / 6, C.clBlack);
    d.arc(g.c1x, g.c1y, R, g.epaisseur, ap - PI / 2, ap - PI / 2 + PI / 3 + PI / 20, C.clBlack);
    d.arc(g.c2x, g.c2y, R, g.epaisseur, ap + PI / 2 - PI / 3 - PI / 20, ap + PI / 2, C.clBlack);
    d.arc(g.bx, g.by, R / 4, g.epaisseur, ap + PI - a, ap + PI + a, C.clBlack);
    // Pupille : intersection du petit disque (centre b, R/4) et du grand (centre c, R) (deux cordes pleines)
    var e3x = g.bx + R / 4 * Math.cos(ap + PI - a), e3y = g.by + R / 4 * Math.sin(ap + PI - a);
    var e4x = g.bx + R / 4 * Math.cos(ap + PI + a), e4y = g.by + R / 4 * Math.sin(ap + PI + a);
    var p1 = d.pointsArc(g.bx, g.by, R / 4, ap + PI - a, ap + PI + a);
    var t4 = Math.atan2(e4y - g.cy, e4x - g.cx), t3 = Math.atan2(e3y - g.cy, e3x - g.cx);
    while (t3 < t4) t3 += 2 * PI;
    var p2 = d.pointsArc(g.cx, g.cy, R, t4, t3);
    d.remplir(p1.concat(p2), g.couleur);
  };
  D.diaphragme = function (d, g) {
    d.trait(g.a1x, g.a1y, g.a2x, g.a2y, g.epaisseur, g.couleur);
    d.trait(g.ap1x, g.ap1y, g.ap2x, g.ap2y, g.epaisseur, g.couleur);
    d.trait(g.ap1x, g.ap1y, g.a1x, g.a1y, 1, g.couleur, 'psdot');
  };
  /**
   * Police CSS d'un texte (TFont de Delphi/Lazarus) : taille positive = points (× 96/72 px),
   * taille négative = hauteur des caractères en pixels (|taille| px), comme les textes à −8 des
   * exemples Reseaux. La valeur lue dans le fichier (policesize) n'est jamais modifiée.
   * @returns {{px: number, css: string}}
   */
  function policeTexte(g) {
    var t = Number(g.policesize);
    var px = t < 0 ? Math.round(-t) : Math.round(t * 96 / 72);
    return { px: px, css: (g.policefsitalic ? 'italic ' : '') + (g.policefsbold ? 'bold ' : '') + px + 'px "' + g.policename + '", Arial, sans-serif' };
  }
  OptGeo.policeTexte = policeTexte;
  D.texte = function (d, g) {
    var p = d.vue.versEcran(g.x, g.y);
    var pol = policeTexte(g), px = pol.px, police = pol.css;
    d.texte(p[0], p[1], g.texte, police, g.policecolor);
    if (g.policefsunderline || g.policefsstrikeout) {
      var m = d.mesure(g.texte, police), c = d.ctx;
      d.style(g.policecolor, Math.max(1, px / 14));
      c.beginPath();
      if (g.policefsunderline) { c.moveTo(p[0], p[1] + px * 1.05); c.lineTo(p[0] + m.l, p[1] + px * 1.05); }
      if (g.policefsstrikeout) { c.moveTo(p[0], p[1] + px * 0.55); c.lineTo(p[0] + m.l, p[1] + px * 0.55); }
      c.stroke();
    }
  };
  D.jolipoint = function (d, g) {
    var t = g.taille / 1000 * d.diag, x = g.a1x, y = g.a1y, k = Math.SQRT2 / 2;
    switch (g.style) {
      case 'tpcercle': {
        var r = Math.max(1, Math.round(Math.min(t * d.vue.sx, t * d.vue.sy)));
        d.cercle(x, y, r, g.epaisseur, g.couleur); d.cercle(x, y, 1, 1, g.couleur); break;
      }
      case 'tpcroixp':
        d.trait(x - t / 2, y, x + t / 2, y, g.epaisseur, g.couleur); d.trait(x, y - t / 2, x, y + t / 2, g.epaisseur, g.couleur); break;
      case 'tpcroixx':
        d.trait(x - t / 2 * k, y - t / 2 * k, x + t / 2 * k, y + t / 2 * k, g.epaisseur, g.couleur);
        d.trait(x + t / 2 * k, y - t / 2 * k, x - t / 2 * k, y + t / 2 * k, g.epaisseur, g.couleur); break;
      case 'tpdisque': d.disque(x, y, t, g.couleur, g.couleur, false); break;
      case 'tpcarre': case 'tpcarreplein':
        d.polygone([x - t / 2, x + t / 2, x + t / 2, x - t / 2], [y - t / 2, y - t / 2, y + t / 2, y + t / 2], g.couleur, g.couleur, g.style === 'tpcarre');
        if (g.style === 'tpcarre') d.cercle(x, y, 1, 1, g.couleur);
        break;
      case 'tptriangle': case 'tptriangleplein':
        d.polygone([x, x + t * Math.sqrt(3) / 2, x - t * Math.sqrt(3) / 2], [y + t, y - t / 2, y - t / 2], g.couleur, g.couleur, g.style === 'tptriangle');
        if (g.style === 'tptriangle') d.cercle(x, y, 1, 1, g.couleur);
        break;
    }
  };
  function extremite(d, g, x, y, ext, taille, sens) {
    var t = taille / 1000 * d.diag, ap = g.anglepolaire, k = Math.SQRT2 / 2;
    switch (ext) {
      case 'tffleche':
        d.trait(x, y, x + t * Math.cos(ap + sens * PI / 4), y + t * Math.sin(ap + sens * PI / 4), g.epaisseur, g.couleur);
        d.trait(x, y, x + t * Math.cos(ap - sens * PI / 4), y + t * Math.sin(ap - sens * PI / 4), g.epaisseur, g.couleur); break;
      case 'ttrait':
        d.trait(x + t / 2 * Math.cos(ap - PI / 2), y + t / 2 * Math.sin(ap - PI / 2), x + t / 2 * Math.cos(ap + PI / 2), y + t / 2 * Math.sin(ap + PI / 2), g.epaisseur, g.couleur); break;
      case 'trond': d.cercle(x, y, Math.max(1, Math.round(Math.min(t * d.vue.sx, t * d.vue.sy))), g.epaisseur, g.couleur); break;
      case 'tcroix':
        d.trait(x - t / 2, y, x + t / 2, y, g.epaisseur, g.couleur); d.trait(x, y - t / 2, x, y + t / 2, g.epaisseur, g.couleur); break;
      case 'tcroixx':
        d.trait(x - t / 2 * k, y - t / 2 * k, x + t / 2 * k, y + t / 2 * k, g.epaisseur, g.couleur);
        d.trait(x + t / 2 * k, y - t / 2 * k, x - t / 2 * k, y + t / 2 * k, g.epaisseur, g.couleur); break;
      case 'tdisque': d.disque(x, y, t, g.couleur, g.couleur, false); break;
    }
  }
  D.fleche = function (d, g) {
    d.trait(g.a1x, g.a1y, g.a2x, g.a2y, g.epaisseur, g.couleur, g.styletrait);
    extremite(d, g, g.a1x, g.a1y, g.ext1, g.taille1, 1);        // tffleche : ap ± π/4
    extremite(d, g, g.a2x, g.a2y, g.ext2, g.taille2, 3);        // tffleche : ap ± 3π/4
  };
  function texteOriente(d, xi, yi, s, agp) {
    var m = d.mesure(s);
    if (agp <= PI / 2) d.texte(xi, yi - m.h, s);
    if (agp > PI / 2 && agp <= PI) d.texte(xi - m.l, yi - m.h, s);
    if (agp > PI && agp <= 3 * PI / 2) d.texte(xi - m.l, yi, s);
    if (agp > 3 * PI / 2) d.texte(xi, yi, s);
  }
  D.angle = function (d, g, o) {
    d.trait(g.cx, g.cy, g.a1x, g.a1y, 1, C.clBlack); d.trait(g.cx, g.cy, g.a2x, g.a2y, 1, C.clBlack);
    d.cercle(g.a1x, g.a1y, 3, 1, C.clBlack); d.cercle(g.a2x, g.a2y, 3, 1, C.clBlack); d.cercle(g.cx, g.cy, 3, 1, C.clBlack);
    var t1 = M.donneAnglePolaireDans02Pi(g.a1x - g.cx, g.a1y - g.cy), t2 = M.donneAnglePolaireDans02Pi(g.a2x - g.cx, g.a2y - g.cy);
    if (t2 < t1) t2 += 2 * PI;
    var r = Math.min(Math.sqrt(sqr(g.a1x - g.cx) + sqr(g.a1y - g.cy)), Math.sqrt(sqr(g.a2x - g.cx) + sqr(g.a2y - g.cy))) / 3;
    if (t1 !== t2) d.arc(g.cx, g.cy, r, 1, t1, t2, C.clBlack);
    var agp = (t1 + t2) / 2, p = d.vue.versEcran(g.cx + r * Math.cos(agp), g.cy + r * Math.sin(agp));
    texteOriente(d, p[0], p[1], fixe((t2 - t1) * 180 / PI, o.decimalesangles) + '°', agp);
  };
  /** angle.dessinebis : angles d'incidence et de réfraction tracés par le calcul. */
  function angleBis(d, g, o) {
    var t1 = M.donneAnglePolaireDans02Pi(g.a1x - g.cx, g.a1y - g.cy), t2 = M.donneAnglePolaireDans02Pi(g.a2x - g.cx, g.a2y - g.cy);
    var signe = (t2 >= t1) ? 1 : -1, t3;
    if (signe === -1) { t3 = t1; t1 = t2; t2 = t3; }
    var dt = t2 - t1;
    if (dt > PI) { t1 = t2; t2 = t1 + 2 * PI - dt; }
    var r = Math.min(Math.sqrt(sqr(g.a1x - g.cx) + sqr(g.a1y - g.cy)), Math.sqrt(sqr(g.a2x - g.cx) + sqr(g.a2y - g.cy))) / 2;
    d.arc(g.cx, g.cy, r, 1, t1, t2, C.clBlack);
    var agp = (t1 + t2) / 2;
    dt = t2 - t1;
    var p = d.vue.versEcran(g.cx + r * Math.cos(agp), g.cy + r * Math.sin(agp));
    texteOriente(d, p[0], p[1], fixe(signe * dt * 180 / PI, o.decimalesangles) + '°', agp);
  }
  function texteLongueur(d, x1, y1, x2, y2, s) {
    var agp = M.donneAnglePolaireDans02Pi(x2 - x1, y2 - y1), m = d.mesure(s);
    var p = d.vue.versEcran((x1 + x2) / 2, (y1 + y2) / 2), xi = p[0], yi = p[1];
    if (Math.abs(agp) < 1e-10 || Math.abs(agp - 2 * PI) < 1e-10) d.texte(xi - m.l, yi - m.h, s);
    else if (Math.abs(agp - PI / 2) < 1e-10) d.texte(xi - m.l, yi - m.h, s);
    else if (Math.abs(agp - PI) < 1e-10) d.texte(xi - m.l, yi, s);
    else {
      var a = agp + PI / 2;
      if (a > 2 * PI) d.texte(xi, yi - m.h, s);
      if (a > PI / 2 && a < PI) d.texte(xi - m.l, yi - m.h, s);
      if (a > PI && a < 3 * PI / 2) d.texte(xi - m.l, yi, s);
      if (a > 3 * PI / 2 && a < 2 * PI) d.texte(xi, yi, s);
    }
  }
  function decimalesZoom(zf) { return Math.trunc(Math.log(zf) / Math.LN10); }
  D.metre = function (d, g, o) {
    d.trait(g.a1x, g.a1y, g.a2x, g.a2y, 1, C.clBlack);
    d.cercle(g.a1x, g.a1y, 3, 1, C.clBlack); d.cercle(g.a2x, g.a2y, 3, 1, C.clBlack);
    var l = Math.sqrt(sqr(g.a2x - g.a1x) + sqr(g.a2y - g.a1y));
    texteLongueur(d, g.a1x, g.a1y, g.a2x, g.a2y, fixe(l, decimalesZoom(d.zf)) + ' ' + o.unitelongueur);
  };
  D.ondeplane = function (d, g) {
    var n = g.nombrederayon;
    d.trait(g.ray[1].ax, g.ray[1].ay, g.ray[n].ax, g.ray[n].ay, g.ray[1].epaisseur, g.ray[1].couleur, 'psdot');
  };
  D.rayon = function () {};              // seules les poignées sont dessinées en mode édition
  D.sourceponctuelle = function () {};

  // Ordre de dessin de Rafraichit
  var ORDRE_DESSIN = ['polycercle', 'polyhedre', 'sphere', 'prisme', 'lec', 'miroirplan', 'reseau', 'fleche', 'jolipoint',
    'miroirconique', 'rayon', 'sourceponctuelle', 'ondeplane', 'mscopa', 'mscore', 'mscere', 'mscepa', 'lmc', 'lmd',
    'ecran', 'oeil', 'diaphragme', 'lsr', 'metre', 'angle', 'texte'];
  OptGeo.ORDRE_DESSIN = ORDRE_DESSIN;

  /** Point de bord de l'espace dans la direction (nx, ny) depuis (x, y) (DessineTousLesSegments). */
  function bordDans(o, x, y, nx, ny, prec) {
    var xm = prec[0], ym = prec[1];
    if (nx === 0) { xm = x; ym = (ny > 0) ? o.yymax : o.yymin; }
    if (ny === 0 && nx !== 0) { xm = (nx > 0) ? o.xxmax : o.xxmin; ym = y; }
    if (ny !== 0 && nx !== 0) {
      if (y + (o.xxmin - x) * ny / nx <= o.yymax && y + (o.xxmin - x) * ny / nx >= o.yymin && nx < 0) { ym = y + (o.xxmin - x) * ny / nx; xm = o.xxmin; }
      else if (y + (o.xxmax - x) * ny / nx <= o.yymax && y + (o.xxmax - x) * ny / nx >= o.yymin && nx > 0) { ym = y + (o.xxmax - x) * ny / nx; xm = o.xxmax; }
      else if (x + (o.yymin - y) * nx / ny <= o.xxmax && x + (o.yymin - y) * nx / ny >= o.xxmin && ny < 0) { xm = x + (o.yymin - y) * nx / ny; ym = o.yymin; }
      else if (x + (o.yymax - y) * nx / ny <= o.xxmax && x + (o.yymax - y) * nx / ny >= o.xxmin && ny > 0) { xm = x + (o.yymax - y) * nx / ny; ym = o.yymax; }
    }
    return [xm, ym];
  }

  /** Rayons tracés (DessineTousLesSegments). */
  function dessinerSegments(d, trace, o) {
    var i, s, ttai = d.diag, prec = [0, 0];
    if (trace.segments.length === 0) return;
    trace.normales.forEach(function (n) { d.trait(n.a1x, n.a1y, n.a2x, n.a2y, n.epaisseur, n.couleur, 'psdashdot'); });
    for (i = 0; i < trace.segments.length; i++) {
      s = trace.segments[i];
      if (o.fantomespresents && s.fantome) continue;
      d.trait(s.a1x, s.a1y, s.a2x, s.a2y, s.epaisseur, s.couleur);
      // empennage (petite flèche)
      var px = s.a1x + (s.a2x - s.a1x) * o.positionempennage / 1000, py = s.a1y + (s.a2y - s.a1y) * o.positionempennage / 1000;
      var l = ttai / 1000 / d.zf * o.tailleempennage;
      d.trait(px, py, px + Math.cos(s.ap + 3 * PI / 4) * l, py + Math.sin(s.ap + 3 * PI / 4) * l, s.epaisseur, s.couleur);
      d.trait(px, py, px + Math.cos(s.ap - 3 * PI / 4) * l, py + Math.sin(s.ap - 3 * PI / 4) * l, s.epaisseur, s.couleur);
      if (s.virtuelarriere) {
        prec = bordDans(o, s.a2x, s.a2y, s.a1x - s.a2x, s.a1y - s.a2y, prec);
        d.trait(s.a1x, s.a1y, prec[0], prec[1], s.epaisseur, s.couleur, 'psdot');
      }
      if (s.virtuelavant) {
        prec = bordDans(o, s.a2x, s.a2y, s.a2x - s.a1x, s.a2y - s.a1y, prec);
        d.trait(s.a2x, s.a2y, prec[0], prec[1], s.epaisseur, s.couleur, 'psdot');
      }
    }
    if (o.afficher_longueurs_segments) {
      trace.segments.forEach(function (sg) {
        var lg = Math.sqrt(sqr(sg.a2x - sg.a1x) + sqr(sg.a2y - sg.a1y));
        texteLongueur(d, sg.a1x, sg.a1y, sg.a2x, sg.a2y, fixe(lg, decimalesZoom(d.zf)) + ' ' + o.unitelongueur);
      });
    }
  }

  /**
   * Dessine toute la scène.
   * @param {CanvasRenderingContext2D} ctx
   * @param {OptGeo.Scene} scene
   * @param {object} vue (creerVue)
   * @param {object} [options] {trace: résultat de tracé (sinon scene.tracer()), fond: true,
   *        selection: [ids] (poignées dessinées), numerosSegments: false, horsEspace: couleur CSS
   *        de la zone hors de l'espace de travail (défaut '#d8d8d8')}
   */
  function dessinerScene(ctx, scene, vue, options) {
    options = options || {};
    var o = scene.options, d = new Dessin(ctx, vue, o);
    var trace = options.trace || scene.tracer();
    ctx.save();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    // hors espace + fond
    if (options.fond !== false) {
      ctx.fillStyle = options.horsEspace || '#d8d8d8';
      ctx.fillRect(0, 0, vue.largeur, vue.hauteur);
      var p0 = vue.versEcran(o.xxmin, o.yymax), p1 = vue.versEcran(o.xxmax, o.yymin);
      ctx.fillStyle = css(o.couleurfondsimulation);
      ctx.fillRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
    }
    // grille : points (dessinergrille)
    if (o.tracergrille && o.grillex > 0 && o.grilley > 0) {
      ctx.fillStyle = '#000';
      var nx = Math.trunc((o.xxmax - o.xxmin) / o.grillex), ny = Math.trunc((o.yymax - o.yymin) / o.grilley);
      if (nx * ny < 400000) {
        ctx.beginPath();                 // un seul remplissage pour tous les points
        for (var i = 1; i <= nx; i++) for (var j = 1; j <= ny; j++) {
          var q = vue.versEcran(o.xxmin + i * o.grillex, o.yymin + j * o.grilley);
          ctx.rect(Math.floor(q[0]), Math.floor(q[1]), 1, 1);
        }
        ctx.fill();
      }
    }
    // objets
    ORDRE_DESSIN.forEach(function (type) {
      scene.objets.forEach(function (ob) {
        if (ob.type !== type) return;
        var g = scene.geometrie(ob.id);
        if (g && D[type]) D[type](d, g, o);
      });
    });
    // angles d'incidence/réfraction
    (trace.angles || []).forEach(function (a) { angleBis(d, a, o); });
    // surfaces d'onde (pointillés)
    (trace.surfacesOnde || []).forEach(function (s) { d.trait(s.a1x, s.a1y, s.a2x, s.a2y, 1, s.couleur, 'psdot'); });
    // rayons
    dessinerSegments(d, trace, o);
    if (options.numerosSegments) {
      trace.segments.forEach(function (s, n) {
        var p = vue.versEcran((s.a1x + s.a2x) / 2, (s.a1y + s.a2y) / 2);
        d.texte(p[0], p[1], String(n + 1));
      });
    }
    // poignées des objets sélectionnés
    if (options.selection && OptGeo.poignees) {
      options.selection.forEach(function (id) {
        OptGeo.poignees(scene, id).forEach(function (h) {
          var p = vue.versEcran(h.x, h.y);
          ctx.setLineDash([]); ctx.lineWidth = 1.5;
          ctx.strokeStyle = h.role === 'translation' ? css(C.clGreen) : css(C.clBlue);
          ctx.beginPath();
          if (h.role === 'translation') { ctx.moveTo(p[0] - 5, p[1] - 5); ctx.lineTo(p[0] + 5, p[1] + 5); ctx.moveTo(p[0] + 5, p[1] - 5); ctx.lineTo(p[0] - 5, p[1] + 5); }
          else ctx.arc(p[0], p[1], 5, 0, 2 * PI);
          ctx.stroke();
        });
      });
    }
    ctx.restore();
  }

  /**
   * Export image (remplace l'impression / PostScript d'OptGeo) : dessine la scène
   * entière sur un canevas neuf de largeur × hauteur pixels et le renvoie
   * (canvas.toBlob / toDataURL pour obtenir un PNG). Navigateur uniquement.
   * @param {object} [options] celles de dessinerScene, plus {echelle: densité (défaut 1), marge: px}
   */
  function rendreCanevas(scene, largeur, hauteur, options) {
    options = options || {};
    var e = options.echelle || 1;
    var c = (typeof document !== 'undefined') ? document.createElement('canvas')
      : (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : null);
    if (!c) throw OptGeo.Erreur('Pas de canevas disponible (navigateur requis).');
    c.width = Math.round(largeur * e); c.height = Math.round(hauteur * e);
    var ctx = c.getContext('2d');
    ctx.scale(e, e);
    var vue = creerVue(scene.options, largeur, hauteur, { marge: options.marge || 0 });
    dessinerScene(ctx, scene, vue, Object.assign({ horsEspace: '#ffffff' }, options));
    return c;
  }

  OptGeo.rendreCanevas = rendreCanevas;
  OptGeo.dessinerScene = dessinerScene;
  OptGeo.Dessin = Dessin;
  OptGeo.dessinateurs = D;
})(typeof globalThis !== 'undefined' ? globalThis : this);
