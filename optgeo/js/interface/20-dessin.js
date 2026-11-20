/*
 * OptGeo web — interface, partie 2 : dessin à l'écran, vue (zoom, déplacement),
 * poignées, loupe, export PNG et SVG.
 *
 * Le dessin des objets et des rayons est celui du moteur (OptGeo.dessinerScene,
 * portage de Rafraichit) ; on ajoute le fond (couleur, image), les poignées,
 * l'aperçu de construction et les repères de l'interface.
 * L'export SVG passe le même dessin à un « contexte SVG » qui imite les quelques
 * fonctions de CanvasRenderingContext2D utilisées par le moteur.
 */
(function () {
  'use strict';
  var OGW = window.OGW, OptGeo = window.OptGeo;
  var css = OptGeo.couleurCss;

  /* ================================================================== */
  /* Rendu d'une scène (écran, PNG, SVG, impression)                     */
  /* ================================================================== */
  /**
   * Fond (hors espace, couleur de la simulation, image de fond) puis scène du moteur.
   * @param {object} opts {horsEspace, image (HTMLImageElement), numerosSegments, ignorerSegments}
   */
  /*
   * Dessin robuste : chaque dessinateur d'objet du moteur est enveloppé (sans toucher au
   * moteur) ; un objet dont la géométrie contient un nombre non fini, ou dont le dessin lève
   * une exception, est ignoré et noté, et le reste de la scène est dessiné normalement.
   */
  var enCours = null;      // {carte: Map géométrie → id, ids: [] objets non dessinés}
  function envelopperDessinateurs() {
    var D = OptGeo.dessinateurs;
    if (!D || D.__optgeoWebEnveloppe) return;
    Object.keys(D).forEach(function (t) {
      var f = D[t];
      if (typeof f !== 'function') return;
      D[t] = function (d, g) {
        if (!OGW.valeursFinies(g)) { noterNonDessine(g, null); return; }
        try { return f.apply(this, arguments); } catch (e) {
          noterNonDessine(g, e);
          try { d.ctx.setLineDash([]); d.ctx.beginPath(); } catch (x) { /* contexte partiel */ }
        }
      };
    });
    Object.defineProperty(D, '__optgeoWebEnveloppe', { value: true });
  }
  function noterNonDessine(g, e) {
    if (!enCours) return;
    var id = enCours.carte.get(g);
    if (id !== undefined && enCours.ids.indexOf(id) < 0) enCours.ids.push(id);
    if (e && window.console) console.warn('Objet non dessiné :', e);
  }
  /** Renvoie la liste des identifiants des objets qui n'ont pas pu être dessinés. */
  function rendreScene(ctx, scene, vue, opts) {
    opts = opts || {};
    envelopperDessinateurs();
    var precedent = enCours, carte = new Map();
    scene.objets.forEach(function (ob) { var g = scene.geometrie(ob.id); if (g) carte.set(g, ob.id); });
    enCours = { carte: carte, ids: [] };
    try { rendreFondEtScene(ctx, scene, vue, opts); } finally { var ids = enCours.ids; enCours = precedent; }
    return ids;
  }
  function rendreFondEtScene(ctx, scene, vue, opts) {
    var o = scene.options;
    ctx.save();
    ctx.fillStyle = opts.horsEspace || '#d9dde3';
    ctx.fillRect(0, 0, vue.largeur, vue.hauteur);
    var p0 = vue.versEcran(o.xxmin, o.yymax), p1 = vue.versEcran(o.xxmax, o.yymin);
    ctx.fillStyle = css(o.couleurfondsimulation);
    ctx.fillRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
    if (opts.image && opts.image.complete && opts.image.naturalWidth) {
      // image calée en haut à gauche de l'espace de travail (comme OptGeo), réduite pour y tenir, proportions gardées
      var W = p1[0] - p0[0], Hh = p1[1] - p0[1], k = Math.min(W / opts.image.naturalWidth, Hh / opts.image.naturalHeight);
      try { ctx.drawImage(opts.image, p0[0], p0[1], opts.image.naturalWidth * k, opts.image.naturalHeight * k); } catch (e) { /* image illisible */ }
    }
    ctx.restore();
    OptGeo.dessinerScene(ctx, scene, vue, { fond: false, numerosSegments: !!opts.numerosSegments });
  }
  OGW.rendreScene = rendreScene;

  /* ================================================================== */
  /* Dessinateur : le canevas de l'écran                                 */
  /* ================================================================== */
  function Dessinateur(canvas, app) {
    this.canvas = canvas; this.app = app;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1; this.w = 300; this.h = 150;
    this.zoom = 1; this.cx = null; this.cy = null;     // centre visé (monde) ; null = centre de l'espace
    this.retrait = { droite: 0, bas: 0 };
    this.demande = false;
    this.dureeDernierDessin = 0;
    this.nbDessins = 0;
  }
  Dessinateur.prototype.redimensionner = function () {
    var r = this.canvas.parentElement.getBoundingClientRect();
    var w = Math.max(1, Math.floor(r.width)), h = Math.max(1, Math.floor(r.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (w === this.w && h === this.h && dpr === this.dpr) return false;
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.demander();
    return true;
  };
  Dessinateur.prototype.vue = function () {
    var o = this.app.scene.options;
    var cx = this.cx === null ? (o.xxmin + o.xxmax) / 2 : this.cx, cy = this.cy === null ? (o.yymin + o.yymax) / 2 : this.cy;
    var v = OptGeo.creerVue(o, this.L(), this.H(), { zoom: this.zoom, cx: cx, cy: cy, marge: 8 });
    v.largeur = this.w; v.hauteur = this.h;      // on dessine sur tout le canevas
    var haut = this.haut();
    if (haut) {                                  // partie visible sous le bandeau de consigne
      var ve = v.versEcran, vm = v.versMonde;
      v.oy += haut;
      v.versEcran = function (x, y) { var p = ve(x, y); return [p[0], p[1] + haut]; };
      v.versMonde = function (px, py) { return vm(px, py - haut); };
    }
    return v;
  };
  Dessinateur.prototype.haut = function () { var r = this.retrait.haut || 0; return this.h - r - (this.retrait.bas || 0) > 140 ? r : 0; };
  /** Partie visible de la zone (le panneau des propriétés peut en couvrir une partie). */
  Dessinateur.prototype.L = function () { var r = this.retrait.droite || 0; return this.w - r > 160 ? this.w - r : this.w; };
  Dessinateur.prototype.H = function () { var r = this.retrait.bas || 0; return (this.h - r > 140 ? this.h - r : this.h) - this.haut(); };
  Dessinateur.prototype.definirRetrait = function (droite, bas, haut) {
    haut = haut === undefined ? (this.retrait.haut || 0) : haut;
    if ((this.retrait.droite || 0) === droite && (this.retrait.bas || 0) === bas && (this.retrait.haut || 0) === haut) return;
    this.retrait = { droite: droite, bas: bas, haut: haut }; this.demander();
  };
  Dessinateur.prototype.toutVoir = function () { this.zoom = 1; this.cx = null; this.cy = null; this.demander(); };
  /** Zoom de facteur f autour du point écran (px, py) (centre de la vue par défaut). */
  Dessinateur.prototype.zoomer = function (f, px, py) {
    var v = this.vue();
    if (px === undefined) { px = this.L() / 2; py = this.haut() + this.H() / 2; }
    var m = v.versMonde(px, py);
    var z = Math.max(0.5, Math.min(100, this.zoom * f));
    this.fixerZoom(z, m[0], m[1], px, py);
  };
  /** Zoom z en gardant le point monde (mx, my) sous le point écran (px, py). */
  Dessinateur.prototype.fixerZoom = function (z, mx, my, px, py) {
    this.zoom = Math.max(0.5, Math.min(100, z));
    var o = this.app.scene.options;
    var v = OptGeo.creerVue(o, this.L(), this.H(), { zoom: this.zoom, cx: 0, cy: 0, marge: 8 });
    this.cx = mx - (px - this.L() / 2) / v.sx;
    this.cy = my + (py - this.haut() - this.H() / 2) / v.sy;
    this.demander();
  };
  Dessinateur.prototype.deplacerVue = function (dxPx, dyPx) {
    var v = this.vue(), o = this.app.scene.options;
    var cx = this.cx === null ? (o.xxmin + o.xxmax) / 2 : this.cx, cy = this.cy === null ? (o.yymin + o.yymax) / 2 : this.cy;
    this.cx = cx - dxPx / v.sx; this.cy = cy + dyPx / v.sy;
    this.demander();
  };
  Dessinateur.prototype.demander = function () {
    if (this.demande) return;
    this.demande = true;
    var self = this;
    window.requestAnimationFrame(function () { self.demande = false; self.dessiner(); });
  };
  Dessinateur.prototype.dessiner = function () {
    var t0 = performance.now(), app = this.app, ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    var vue = this.vue();
    try {
      var nonDessines = rendreScene(ctx, app.scene, vue, { image: app.imageFond, numerosSegments: app.numerosSegmentsVisibles() });
      app.erreurDessin = null;
      if (app.signalerNonDessines) app.signalerNonDessines(nonDessines);
    } catch (e) {
      app.erreurDessin = e;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#b00020'; ctx.font = '14px sans-serif'; ctx.textBaseline = 'top';
      ctx.fillText('Erreur de dessin : ' + e.message, 10, 10);
      if (window.console) console.error(e);
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    app.dessinerSurcouche(ctx, vue);
    this.dureeDernierDessin = performance.now() - t0;
    this.nbDessins++;
    if (app.apresDessin) app.apresDessin();
  };

  /* ================================================================== */
  /* Poignées et repères                                                 */
  /* ================================================================== */
  /** Dessine une poignée au point écran (x, y). */
  function dessinerPoignee(ctx, x, y, role, opts) {
    opts = opts || {};
    ctx.save();
    ctx.setLineDash([]);
    if (opts.zone) {                 // zone sensible au doigt (repère discret)
      ctx.beginPath(); ctx.arc(x, y, opts.zone, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(30, 90, 200, 0.07)'; ctx.fill();
    }
    if (opts.actif) {
      ctx.beginPath(); ctx.arc(x, y, 13, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 170, 0, 0.35)'; ctx.fill();
    }
    var r = 6.5;
    function croix(couleur, bord) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = bord; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
      ctx.strokeStyle = couleur; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
    }
    switch (role) {
      case 'translation': croix('#008000', 'rgba(255,255,255,0.9)'); break;
      case 'foyer': croix('#00c8d8', '#0b3c44'); break;
      case 'courbure': croix('#ffd400', '#5a4a00'); break;
      case 'groupe': croix('#008000', 'rgba(255,255,255,0.9)'); break;
      case 'rotation':
        ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = '#e00000'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        break;
      case 'choix':     // mode Grouper : croix violette
        croix('#800080', 'rgba(255,255,255,0.9)'); break;
      case 'suppression':
        ctx.beginPath(); ctx.arc(x, y, r + 1, 0, 2 * Math.PI); ctx.lineWidth = 2.5; ctx.strokeStyle = '#e00000'; ctx.stroke();
        break;
      default:          // point : cercle bleu
        ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
        ctx.lineWidth = 2.2; ctx.strokeStyle = '#0000ff'; ctx.stroke();
    }
    ctx.restore();
  }
  OGW.dessinerPoignee = dessinerPoignee;

  /** Poignées d'un objet (et traits fins vers les pivots de rotation). */
  OGW.dessinerPoigneesObjet = function (ctx, vue, scene, id, opts) {
    opts = opts || {};
    var hs = OGW.Poignees.liste(scene, id);
    hs.forEach(function (h) {
      if (h.role === 'rotation' && h.px !== undefined) {
        var a = vue.versEcran(h.x, h.y), b = vue.versEcran(h.px, h.py);
        ctx.save(); ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(224,0,0,0.6)';
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
      }
    });
    hs.forEach(function (h) {
      var p = vue.versEcran(h.x, h.y);
      if (p[0] < -30 || p[1] < -30 || p[0] > vue.largeur + 30 || p[1] > vue.hauteur + 30) return;
      dessinerPoignee(ctx, p[0], p[1], h.role, { zone: opts.zone, actif: opts.actif === h.nom });
    });
  };

  /** Marque « Gr » d'un groupe à son isobarycentre. */
  OGW.dessinerGroupe = function (ctx, vue, scene, groupe, actif) {
    var c = scene.centre(groupe.membres), p = vue.versEcran(c.x, c.y);
    dessinerPoignee(ctx, p[0], p[1], 'groupe', { actif: actif });
    ctx.save(); ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#008000'; ctx.textBaseline = 'bottom';
    ctx.fillText('Gr', p[0] + 8, p[1] - 6); ctx.restore();
    return c;
  };

  /** Contour léger d'un objet sélectionné (tracé de l'objet en surbrillance). */
  OGW.surlignerObjet = function (ctx, vue, scene, id, couleur) {
    var o = scene.objet(id), g = scene.geometrie(id);
    if (!o || !g || !OptGeo.dessinateurs[o.type]) return;
    // on redessine l'objet par-dessus avec un trait large translucide
    var proxy = proxyContexte(ctx, couleur || 'rgba(255, 170, 0, 0.55)', 7);
    try {
      var d = new OptGeo.Dessin(proxy, vue, scene.options);
      OptGeo.dessinateurs[o.type](d, g, scene.options);
    } catch (e) { /* surbrillance facultative */ }
  };
  /** Contexte qui dessine tout en traits larges d'une seule couleur (pas de remplissage, pas de texte). */
  function proxyContexte(ctx, couleur, largeur) {
    var p = Object.create(null);
    ['beginPath', 'moveTo', 'lineTo', 'closePath', 'arc', 'ellipse', 'rect'].forEach(function (f) {
      p[f] = function () { return ctx[f].apply(ctx, arguments); };
    });
    p.stroke = function () { ctx.save(); ctx.setLineDash([]); ctx.lineWidth = largeur; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = couleur; ctx.stroke(); ctx.restore(); };
    p.fill = function () { p.stroke(); };
    p.fillText = function () { }; p.fillRect = function () { };
    p.measureText = function (s) { return ctx.measureText(s); };
    p.setLineDash = function () { }; p.save = function () { }; p.restore = function () { };
    return p;
  }

  /* ================================================================== */
  /* Loupe (placement d'un point au doigt)                               */
  /* ================================================================== */
  function Loupe(conteneur) {
    this.div = OGW.el('div', { class: 'loupe', hidden: true, 'aria-hidden': 'true' });
    this.canvas = OGW.el('canvas', { width: 1, height: 1 });
    this.texte = OGW.el('div', { class: 'loupe-texte' });
    this.div.appendChild(this.canvas); this.div.appendChild(this.texte);
    conteneur.appendChild(this.div);
    this.taille = 128; this.grossissement = 2.5;
  }
  /**
   * Montre la loupe. Elle grossit le voisinage du point écran (px, py) — le point visé, éventuellement
   * projeté (foyer sur l'axe…) — et se place d'après le doigt (dx, dy) : au-dessus de lui, ou à côté
   * près du haut, jamais dessous.
   */
  Loupe.prototype.montrer = function (source, dpr, px, py, texte, largeurZone, dx, dy) {
    var T = this.taille, c = this.canvas, d = Math.round(T * dpr);
    if (c.width !== d) { c.width = d; c.height = d; c.style.width = T + 'px'; c.style.height = T + 'px'; }
    var ax = dx === undefined ? px : dx, ay = dy === undefined ? py : dy;
    var x = Math.max(4, Math.min(ax - T / 2, largeurZone - T - 4)), y = ay - T - 70;
    if (y < 4) { y = Math.max(4, ay - T / 2); x = ax + 60; if (x + T > largeurZone - 4) x = ax - 60 - T; }
    this.div.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    this.div.hidden = false;
    var ctx = c.getContext('2d'), cote = T / this.grossissement;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#d9dde3'; ctx.fillRect(0, 0, d, d);
    try { ctx.drawImage(source, (px - cote / 2) * dpr, (py - cote / 2) * dpr, cote * dpr, cote * dpr, 0, 0, d, d); } catch (e) { /* bord */ }
    ctx.strokeStyle = 'rgba(200,0,0,0.85)'; ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath(); ctx.moveTo(d / 2, 0); ctx.lineTo(d / 2, d / 2 - 6 * dpr); ctx.moveTo(d / 2, d / 2 + 6 * dpr); ctx.lineTo(d / 2, d);
    ctx.moveTo(0, d / 2); ctx.lineTo(d / 2 - 6 * dpr, d / 2); ctx.moveTo(d / 2 + 6 * dpr, d / 2); ctx.lineTo(d, d / 2); ctx.stroke();
    this.texte.textContent = texte || '';
  };
  Loupe.prototype.cacher = function () { this.div.hidden = true; };
  OGW.Loupe = Loupe;

  /* ================================================================== */
  /* Contexte SVG (export vectoriel)                                     */
  /* ================================================================== */
  function echapper(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function f(x) { return Math.round(x * 100) / 100; }
  var PROPRIETES = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'font', 'textBaseline', 'textAlign', 'globalAlpha', 'miterLimit'];

  function ContexteSVG(largeur, hauteur) {
    this.largeur = largeur; this.hauteur = hauteur;
    this.morceaux = [];
    this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1; this.lineCap = 'butt'; this.lineJoin = 'miter';
    this.font = '10px sans-serif'; this.textBaseline = 'alphabetic'; this.textAlign = 'start'; this.globalAlpha = 1; this.miterLimit = 10;
    this._tirets = []; this._m = [1, 0, 0, 1, 0, 0]; this._pile = [];
    this._d = []; this._courant = false;
    this._mesure = document.createElement('canvas').getContext('2d');
  }
  ContexteSVG.prototype.save = function () {
    var s = { m: this._m.slice(), tirets: this._tirets.slice() };
    for (var i = 0; i < PROPRIETES.length; i++) s[PROPRIETES[i]] = this[PROPRIETES[i]];
    this._pile.push(s);
  };
  ContexteSVG.prototype.restore = function () {
    var s = this._pile.pop(); if (!s) return;
    this._m = s.m; this._tirets = s.tirets;
    for (var i = 0; i < PROPRIETES.length; i++) this[PROPRIETES[i]] = s[PROPRIETES[i]];
  };
  ContexteSVG.prototype.transform = function (a, b, c, d, e, g) {
    var m = this._m;
    this._m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * g + m[4], m[1] * e + m[3] * g + m[5]];
  };
  ContexteSVG.prototype.setTransform = function (a, b, c, d, e, g) { this._m = [a, b, c, d, e, g]; };
  ContexteSVG.prototype.scale = function (a, b) { this.transform(a, 0, 0, b, 0, 0); };
  ContexteSVG.prototype.translate = function (x, y) { this.transform(1, 0, 0, 1, x, y); };
  ContexteSVG.prototype.rotate = function (t) { var c = Math.cos(t), s = Math.sin(t); this.transform(c, s, -s, c, 0, 0); };
  ContexteSVG.prototype._pt = function (x, y) { var m = this._m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; };
  ContexteSVG.prototype._echelle = function () { var m = this._m; return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1; };
  ContexteSVG.prototype.setLineDash = function (t) { this._tirets = (t || []).slice(); };
  ContexteSVG.prototype.getLineDash = function () { return this._tirets.slice(); };
  ContexteSVG.prototype.beginPath = function () { this._d = []; this._courant = false; };
  ContexteSVG.prototype.moveTo = function (x, y) { var p = this._pt(x, y); this._d.push('M' + f(p[0]) + ' ' + f(p[1])); this._courant = true; };
  ContexteSVG.prototype.lineTo = function (x, y) {
    var p = this._pt(x, y); this._d.push((this._courant ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])); this._courant = true;
  };
  ContexteSVG.prototype.closePath = function () { if (this._d.length) this._d.push('Z'); };
  ContexteSVG.prototype.rect = function (x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); };
  ContexteSVG.prototype.ellipse = function (x, y, rx, ry, rot, a0, a1, acw) {
    var s = this._echelle(), self = this;
    function pointA(a) {
      var cx = rx * Math.cos(a), cy = ry * Math.sin(a), cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
      return self._pt(x + cx * cr - cy * sr, y + cx * sr + cy * cr);
    }
    var balayage = acw ? a0 - a1 : a1 - a0;
    var p0 = pointA(a0);
    this._d.push((this._courant ? 'L' : 'M') + f(p0[0]) + ' ' + f(p0[1]));
    this._courant = true;
    var R = f(rx * s) + ' ' + f(ry * s) + ' ' + f((rot || 0) * 180 / Math.PI);
    var sens = acw ? 0 : 1;
    if (balayage >= 2 * Math.PI - 1e-9 || balayage <= -2 * Math.PI + 1e-9) {
      var pm = pointA(a0 + (acw ? -Math.PI : Math.PI));
      this._d.push('A' + R + ' 0 ' + sens + ' ' + f(pm[0]) + ' ' + f(pm[1]));
      this._d.push('A' + R + ' 0 ' + sens + ' ' + f(p0[0]) + ' ' + f(p0[1]));
      return;
    }
    while (balayage < 0) balayage += 2 * Math.PI;
    var p1 = pointA(a1);
    this._d.push('A' + R + ' ' + (balayage > Math.PI ? 1 : 0) + ' ' + sens + ' ' + f(p1[0]) + ' ' + f(p1[1]));
  };
  ContexteSVG.prototype.arc = function (x, y, r, a0, a1, acw) { this.ellipse(x, y, r, r, 0, a0, a1, acw); };
  ContexteSVG.prototype._style = function (remplir) {
    var a = this.globalAlpha < 1 ? ' opacity="' + this.globalAlpha + '"' : '';
    if (remplir) return ' fill="' + echapper(this.fillStyle) + '" stroke="none"' + a;
    var s = this._echelle(), lw = f(this.lineWidth * s);
    var t = this._tirets.length ? ' stroke-dasharray="' + this._tirets.map(function (v) { return f(v * s); }).join(' ') + '"' : '';
    return ' fill="none" stroke="' + echapper(this.strokeStyle) + '" stroke-width="' + lw + '"' +
      (this.lineCap !== 'butt' ? ' stroke-linecap="' + this.lineCap + '"' : '') +
      (this.lineJoin !== 'miter' ? ' stroke-linejoin="' + this.lineJoin + '"' : '') + t + a;
  };
  ContexteSVG.prototype.stroke = function () { if (this._d.length) this.morceaux.push('<path d="' + this._d.join('') + '"' + this._style(false) + '/>'); };
  ContexteSVG.prototype.fill = function () { if (this._d.length) this.morceaux.push('<path d="' + this._d.join('') + '"' + this._style(true) + '/>'); };
  ContexteSVG.prototype.fillRect = function (x, y, w, h) {
    var d = this._d, c = this._courant; this.beginPath(); this.rect(x, y, w, h); this.fill(); this._d = d; this._courant = c;
  };
  ContexteSVG.prototype.strokeRect = function (x, y, w, h) {
    var d = this._d, c = this._courant; this.beginPath(); this.rect(x, y, w, h); this.stroke(); this._d = d; this._courant = c;
  };
  ContexteSVG.prototype.clearRect = function () { };
  ContexteSVG.prototype.clip = function () { };
  ContexteSVG.prototype.drawImage = function () { };
  ContexteSVG.prototype.measureText = function (s) { this._mesure.font = this.font; return this._mesure.measureText(s); };
  ContexteSVG.prototype.fillText = function (s, x, y) {
    this._mesure.font = this.font;
    var m = this._mesure.measureText(s);
    var asc = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent || parseFloat(this.font) * 0.8 || 10;
    var desc = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent || parseFloat(this.font) * 0.2 || 3;
    if (this.textBaseline === 'top' || this.textBaseline === 'hanging') y += asc;
    else if (this.textBaseline === 'middle') y += (asc - desc) / 2;
    else if (this.textBaseline === 'bottom') y -= desc;
    var p = this._pt(x, y), s2 = this._echelle();
    var ft = /^\s*(italic\s+|oblique\s+)?(normal\s+)?(bold\s+|\d00\s+)?(\d+(?:\.\d+)?)px\s+(.+)$/.exec(this.font) || [];
    var ancre = this.textAlign === 'center' ? 'middle' : (this.textAlign === 'right' || this.textAlign === 'end') ? 'end' : 'start';
    this.morceaux.push('<text x="' + f(p[0]) + '" y="' + f(p[1]) + '" fill="' + echapper(this.fillStyle) + '"' +
      ' font-size="' + f((parseFloat(ft[4]) || 10) * s2) + '" font-family="' + echapper((ft[5] || 'sans-serif').replace(/"/g, '\'')) + '"' +
      (ft[1] ? ' font-style="italic"' : '') + (ft[3] ? ' font-weight="bold"' : '') +
      (ancre !== 'start' ? ' text-anchor="' + ancre + '"' : '') + ' xml:space="preserve">' + echapper(s) + '</text>');
  };
  ContexteSVG.prototype.resultat = function (titre, prefixe) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      'width="' + this.largeur + '" height="' + this.hauteur + '" viewBox="0 0 ' + this.largeur + ' ' + this.hauteur + '">\n' +
      (titre ? '<title>' + echapper(titre) + '</title>\n' : '') + (prefixe || '') + this.morceaux.join('\n') + '\n</svg>\n';
  };
  OGW.ContexteSVG = ContexteSVG;

  /* ================================================================== */
  /* Exports                                                             */
  /* ================================================================== */
  /** Taille logique d'un export : largeur fixe, hauteur selon l'espace de travail. */
  function tailleExport(scene, largeur) {
    var o = scene.options, lw = o.xxmax - o.xxmin, lh = o.yymax - o.yymin;
    var h = Math.round(largeur * lh / lw);
    h = Math.max(100, Math.min(4 * largeur, h));
    return [largeur, h];
  }
  /** Canevas PNG de toute la scène (espace de travail entier). */
  OGW.canevasExport = function (scene, image, largeur, echelle) {
    var t = tailleExport(scene, largeur || 1000), e = echelle || 2;
    var c = document.createElement('canvas');
    c.width = Math.round(t[0] * e); c.height = Math.round(t[1] * e);
    var ctx = c.getContext('2d');
    ctx.scale(e, e);
    var vue = OptGeo.creerVue(scene.options, t[0], t[1], { marge: 10 });
    rendreScene(ctx, scene, vue, { horsEspace: '#ffffff', image: image });
    return c;
  };
  /** Texte SVG de toute la scène. */
  OGW.svgExport = function (scene, image, titre, largeur) {
    var t = tailleExport(scene, largeur || 1000);
    envelopperDessinateurs();
    var ctx = new ContexteSVG(t[0], t[1]);
    var vue = OptGeo.creerVue(scene.options, t[0], t[1], { marge: 10 });
    var o = scene.options, prefixe = '';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, t[0], t[1]);
    var p0 = vue.versEcran(o.xxmin, o.yymax), p1 = vue.versEcran(o.xxmax, o.yymin);
    ctx.fillStyle = css(o.couleurfondsimulation); ctx.fillRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
    if (image && image.src && image.naturalWidth) {
      var kk = Math.min((p1[0] - p0[0]) / image.naturalWidth, (p1[1] - p0[1]) / image.naturalHeight);
      ctx.morceaux.push('<image x="' + f(p0[0]) + '" y="' + f(p0[1]) + '" width="' + f(image.naturalWidth * kk) + '" height="' + f(image.naturalHeight * kk) +
        '" preserveAspectRatio="none" xlink:href="' + echapper(image.src) + '"/>');
    }
    OptGeo.dessinerScene(ctx, scene, vue, { fond: false });
    return ctx.resultat(titre, prefixe);
  };

  OGW.Dessinateur = Dessinateur;
})();
