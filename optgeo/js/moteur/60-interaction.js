/*
 * OptGeo (portage JavaScript) — moteur, partie 6 : aides à l'interaction.
 *
 * Remplace la logique de souris de ray1.pas / unit222.pas (TraiteModif, DebutModif,
 * FinModif : « quel objet, quelle poignée sous le curseur ») par une API sans DOM :
 *
 *   OptGeo.poignees(scene, id)             -> [{nom, x, y, role}]   role : 'point' | 'translation'
 *   OptGeo.objetSousPoint(scene, x, y, tol) -> {id, poignee|null, distance} | null
 *   OptGeo.deplacerPoignee(scene, id, nom, x, y) -> {ok, erreur?}
 *   OptGeo.distanceObjet(scene, id, x, y)   -> distance (monde) au tracé de l'objet
 *
 * tol est une distance monde : pour une tolérance en pixels (doigt sur tablette),
 * utiliser vue.pixelsEnMonde(px) (50-rendu.js).
 * Les poignées reprennent celles d'OptGeo (extrémités, centre de translation,
 * foyers, sommets) ; les poignées « translation » déplacent tout l'objet.
 */
(function (racine) {
  'use strict';
  var OptGeo = racine.OptGeo;
  var M = OptGeo.math, PI = Math.PI, sqr = M.sqr;

  function P(nom, x, y, role) { return { nom: nom, x: x, y: y, role: role || 'point' }; }

  /** Poignées d'un objet. */
  function poignees(scene, id) {
    var o = scene.objet(id), g = scene.geometrie(id);
    if (!o || !g) return [];
    var i, r = [];
    switch (o.type) {
      case 'miroirplan': case 'ecran': case 'lsr': case 'reseau': case 'fleche': case 'metre':
        return [P('a1', g.a1x, g.a1y), P('a2', g.a2x, g.a2y), P('centre', (g.a1x + g.a2x) / 2, (g.a1y + g.a2y) / 2, 'translation')];
      case 'mscopa': case 'mscepa':
        return [P('a1', g.a1x, g.a1y), P('a2', g.a2x, g.a2y), P('foyer', g.fx, g.fy), P('centre', g.sx, g.sy, 'translation')];
      case 'mscore': case 'mscere':
        return [P('a1', g.a1x, g.a1y), P('a2', g.a2x, g.a2y), P('centre', g.sx, g.sy, 'translation')];
      case 'lmc': case 'lmd':
        return [P('a1', g.a1x, g.a1y), P('a2', g.a2x, g.a2y), P('f1', g.f1x, g.f1y), P('f2', g.f2x, g.f2y), P('centre', g.ox, g.oy, 'translation')];
      case 'rayon':
        return [P('depart', g.ax, g.ay), P('direction', g.ax + g.kx, g.ay + g.ky), P('centre', g.ax + g.kx / 2, g.ay + g.ky / 2, 'translation')];
      case 'sourceponctuelle':
        return [P('source', g.sx, g.sy), P('a1', g.a1x, g.a1y), P('a2', g.a2x, g.a2y), P('centre', (g.a1x + g.a2x) / 2, (g.a1y + g.a2y) / 2, 'translation')];
      case 'ondeplane':
        return [P('a1', g.a1x, g.a1y), P('a2', g.a2x, g.a2y), P('direction', g.sx, g.sy), P('centre', g.gx, g.gy, 'translation')];
      case 'diaphragme':
        return [P('a1', g.a1x, g.a1y), P('a2', g.a2x, g.a2y), P('centre', g.cx, g.cy, 'translation')];
      case 'polyhedre':
        for (i = 1; i <= g.nombresommet; i++) r.push(P('sommet' + i, g.messommets[i].ax, g.messommets[i].ay));
        r.push(P('centre', g.xiso, g.yiso, 'translation'));
        return r;
      case 'polycercle':
        for (i = 1; i <= g.nombresommet; i++) r.push(P('sommet' + i, g.messommets[i].ax, g.messommets[i].ay));
        for (i = 1; i <= g.nombresommet; i++) if (!g.rectiligne[i]) r.push(P('arc' + i, g.mess[i].ax, g.mess[i].ay));
        r.push(P('centre', g.xiso, g.yiso, 'translation'));
        return r;
      case 'prisme':
        return [P('sommet', g.ax, g.ay), P('base', g.bx, g.by), P('centre', g.gx, g.gy, 'translation')];
      case 'sphere':
        return [P('bord', g.cx + g.rayon, g.cy), P('centre', g.cx, g.cy, 'translation')];
      case 'lec':
        return [P('s1', g.s1x, g.s1y), P('s2', g.s2x, g.s2y), P('centre', g.ox, g.oy, 'translation')];
      case 'miroirconique':
        return [P('a1', g.a1x, g.a1y), P('a2', g.a2x, g.a2y), P('sommet', g.sx, g.sy), P('foyer', g.fx, g.fy, 'translation')];
      case 'texte':
        return [P('centre', g.x, g.y, 'translation')];
      case 'jolipoint':
        return [P('centre', g.a1x, g.a1y, 'translation')];
      case 'angle':
        return [P('a1', g.a1x, g.a1y), P('a2', g.a2x, g.a2y), P('sommet', g.cx, g.cy), P('centre', (g.a1x + g.a2x) / 2, (g.a1y + g.a2y) / 2, 'translation')];
      case 'oeil':
        return [P('a', g.ax, g.ay), P('centre', g.cx, g.cy, 'translation')];
    }
    return [];
  }

  function distSeg(x, y, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? ((x - ax) * dx + (y - ay) * dy) / l : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(sqr(x - ax - t * dx) + sqr(y - ay - t * dy));
  }
  function distArc(x, y, cx, cy, r, t1, t2) {
    var t = M.donneAnglePolaireDans02Pi(x - cx, y - cy);
    if ((t >= t1 && t <= t2) || (t + 2 * PI >= t1 && t + 2 * PI <= t2) || (t - 2 * PI >= t1 && t - 2 * PI <= t2))
      return Math.abs(Math.sqrt(sqr(x - cx) + sqr(y - cy)) - Math.abs(r));
    return Math.min(Math.sqrt(sqr(x - cx - r * Math.cos(t1)) + sqr(y - cy - r * Math.sin(t1))),
      Math.sqrt(sqr(x - cx - r * Math.cos(t2)) + sqr(y - cy - r * Math.sin(t2))));
  }

  /** Distance (monde) d'un point au tracé d'un objet ; 0 à l'intérieur d'un milieu. */
  function distanceObjet(scene, id, x, y) {
    var o = scene.objet(id), g = scene.geometrie(id), i, d = Infinity;
    if (!o || !g) return Infinity;
    switch (o.type) {
      case 'miroirplan': case 'ecran': case 'lsr': case 'reseau': case 'fleche': case 'metre':
      case 'mscopa': case 'mscepa': case 'lmc': case 'lmd':
        return distSeg(x, y, g.a1x, g.a1y, g.a2x, g.a2y);
      case 'mscore': case 'mscere':
        return distArc(x, y, g.cx, g.cy, g.rayoncourbure, g.theta1, g.theta2);
      case 'diaphragme':
        return Math.min(distSeg(x, y, g.a1x, g.a1y, g.a2x, g.a2y), distSeg(x, y, g.ap1x, g.ap1y, g.ap2x, g.ap2y));
      case 'rayon':
        return distSeg(x, y, g.ax, g.ay, g.ax + g.kx, g.ay + g.ky);
      case 'sourceponctuelle':
        return Math.min(distSeg(x, y, g.sx, g.sy, g.a1x, g.a1y), distSeg(x, y, g.sx, g.sy, g.a2x, g.a2y));
      case 'ondeplane':
        return Math.min(distSeg(x, y, g.a1x, g.a1y, g.a2x, g.a2y), distSeg(x, y, g.a1x, g.a1y, g.sx, g.sy));
      case 'polyhedre': case 'prisme': case 'polycercle': case 'lec': case 'sphere':
        if (g.estou(x, y) !== OptGeo.INTERIEUR.EXTERIEUR) return 0;
        if (o.type === 'sphere') return Math.abs(Math.sqrt(sqr(x - g.cx) + sqr(y - g.cy)) - g.rayon);
        if (o.type === 'lec') return Math.min(distArc(x, y, g.c1x, g.c1y, g.r1, g.theta1_1, g.theta2_1), distArc(x, y, g.c2x, g.c2y, g.r2, g.theta1_2, g.theta2_2),
          g.tronque ? Math.min(distSeg(x, y, g.a1x, g.a1y, g.a2x, g.a2y), distSeg(x, y, g.b1x, g.b1y, g.b2x, g.b2y)) : Infinity);
        for (i = 1; i <= g.nombresommet; i++) {
          if (o.type === 'polycercle' && !g.rectiligne[i]) d = Math.min(d, distArc(x, y, g.mescentres[i].ax, g.mescentres[i].ay, g.rayon[i], g.theta1[i], g.theta2[i]));
          else d = Math.min(d, distSeg(x, y, g.messommets[i].ax, g.messommets[i].ay, g.messommets[i + 1].ax, g.messommets[i + 1].ay));
        }
        return d;
      case 'miroirconique': {
        var n = 200;
        for (i = 0; i < n; i++) {
          var ta = g.theta1 + (g.theta2 - g.theta1) * i / n, tb = g.theta1 + (g.theta2 - g.theta1) * (i + 1) / n;
          var ra = g.parametre / (1 + g.excentricite * Math.cos(ta - g.theta0)), rb = g.parametre / (1 + g.excentricite * Math.cos(tb - g.theta0));
          d = Math.min(d, distSeg(x, y, g.fx + ra * Math.cos(ta), g.fy + ra * Math.sin(ta), g.fx + rb * Math.cos(tb), g.fy + rb * Math.sin(tb)));
        }
        return d;
      }
      case 'oeil':
        return Math.abs(Math.sqrt(sqr(x - g.cx) + sqr(y - g.cy)) - g.rayoncourbure * 0.5);
      case 'angle':
        return Math.min(distSeg(x, y, g.cx, g.cy, g.a1x, g.a1y), distSeg(x, y, g.cx, g.cy, g.a2x, g.a2y));
      case 'texte': case 'jolipoint':
        var c = OptGeo.centreObjet(o.type, g);
        return Math.sqrt(sqr(x - c.x) + sqr(y - c.y));
    }
    return Infinity;
  }

  /**
   * Objet (et poignée) sous un point. Les poignées sont prioritaires sur le tracé ;
   * à distance égale, l'objet dessiné en dernier (au-dessus) l'emporte.
   * @param {number} tol tolérance (monde)
   */
  function objetSousPoint(scene, x, y, tol) {
    var meilleur = null, ordre = OptGeo.ORDRE_DESSIN || OptGeo.ordreTypes;
    var objets = [];
    ordre.forEach(function (t) { scene.objets.forEach(function (o) { if (o.type === t) objets.push(o); }); });
    objets.forEach(function (o) {
      poignees(scene, o.id).forEach(function (h) {
        var dd = Math.sqrt(sqr(x - h.x) + sqr(y - h.y));
        if (dd <= tol && (!meilleur || !meilleur.poignee || dd <= meilleur.distance))
          meilleur = { id: o.id, poignee: h, distance: dd };
      });
    });
    if (meilleur) return meilleur;
    objets.forEach(function (o) {
      var dd = distanceObjet(scene, o.id, x, y);
      if (dd <= tol && (!meilleur || dd <= meilleur.distance)) meilleur = { id: o.id, poignee: null, distance: dd };
    });
    return meilleur;
  }

  /**
   * Déplace une poignée en (x, y) : modifie les paramètres de l'objet (refusé si
   * l'objet deviendrait invalide, comme dans OptGeo).
   */
  function deplacerPoignee(scene, id, nom, x, y) {
    var o = scene.objet(id), g = scene.geometrie(id);
    if (!o || !g) return { ok: false, erreur: 'Objet introuvable.' };
    var h = poignees(scene, id).filter(function (q) { return q.nom === nom; })[0];
    if (!h) return { ok: false, erreur: 'Poignée inconnue : ' + nom };
    if (h.role === 'translation') return scene.translater([id], x - h.x, y - h.y);
    var p = {}, m;
    switch (o.type) {
      case 'miroirplan': case 'ecran': case 'lsr': case 'reseau': case 'fleche': case 'metre':
      case 'mscore': case 'mscere':
        if (nom === 'a1') { p.a1x = x; p.a1y = y; } else { p.a2x = x; p.a2y = y; }
        break;
      case 'mscopa': case 'mscepa': case 'lmc': case 'lmd':
        if (nom === 'a1') { p.a1x = x; p.a1y = y; }
        else if (nom === 'a2') { p.a2x = x; p.a2y = y; }
        else {   // foyer : focale = distance au centre projetée sur l'axe
          var cx = (g.a1x + g.a2x) / 2, cy = (g.a1y + g.a2y) / 2;
          p.focale = Math.max(Math.abs((x - cx) * g.normalex + (y - cy) * g.normaley), 1e-12);
        }
        break;
      case 'rayon':
        if (nom === 'depart') { p.ax = x; p.ay = y; p.kx = g.ax + g.kx - x; p.ky = g.ay + g.ky - y; }
        else { p.kx = x - g.ax; p.ky = y - g.ay; }
        break;
      case 'sourceponctuelle':
        if (nom === 'source') { p.sx = x; p.sy = y; } else if (nom === 'a1') { p.a1x = x; p.a1y = y; } else { p.a2x = x; p.a2y = y; }
        break;
      case 'ondeplane':
        if (nom === 'a1') { p.a1x = x; p.a1y = y; p.sx = x + (g.sx - g.a1x); p.sy = y + (g.sy - g.a1y); p.a2x = g.a2x; p.a2y = g.a2y; }
        else if (nom === 'a2') { p.a2x = x; p.a2y = y; }
        else { p.sx = x; p.sy = y; }
        break;
      case 'diaphragme':
        if (nom === 'a1') { p.rint = Math.sqrt(sqr(x - g.cx) + sqr(y - g.cy)); p.anglepolaire = M.donneAnglePolaireDansPiPi(x - g.cx, y - g.cy); }
        else p.rext = Math.sqrt(sqr(x - g.cx) + sqr(y - g.cy));
        break;
      case 'polyhedre': case 'polycercle':
        p = scene.parametres(id);
        if ((m = /^sommet(\d+)$/.exec(nom))) p.sommets[+m[1] - 1] = { x: x, y: y };
        else if ((m = /^arc(\d+)$/.exec(nom))) p.mess[+m[1] - 1] = { x: x, y: y };
        break;
      case 'prisme':
        if (nom === 'sommet') { p.ax = x; p.ay = y; } else { p.bx = x; p.by = y; }
        break;
      case 'sphere':
        p.rayon = Math.sqrt(sqr(x - g.cx) + sqr(y - g.cy));
        break;
      case 'lec':
        if (nom === 's1') { p.s1x = x; p.s1y = y; } else { p.s2x = x; p.s2y = y; }
        break;
      case 'miroirconique': {
        var a1x = g.a1x, a1y = g.a1y, a2x = g.a2x, a2y = g.a2y, sx = g.sx, sy = g.sy;
        if (nom === 'a1') { a1x = x; a1y = y; } else if (nom === 'a2') { a2x = x; a2y = y; } else { sx = x; sy = y; }
        var q = OptGeo.types.miroirconique.depuisPoints(g.fx, g.fy, sx, sy, a1x, a1y, a2x, a2y, scene.parametres(id));
        if (!q) return { ok: false, erreur: 'Conique impossible.' };
        p = q;
        break;
      }
      case 'angle':
        if (nom === 'a1') { p.a1x = x; p.a1y = y; } else if (nom === 'a2') { p.a2x = x; p.a2y = y; } else { p.cx = x; p.cy = y; }
        break;
      case 'oeil':
        p.ax = x; p.ay = y;
        break;
    }
    return scene.modifier(id, p);
  }

  /**
   * Paramètres d'un objet neuf centré en (x, y), à une taille raisonnable pour
   * l'espace de travail (1/8 de la diagonale) — pour les boutons « ajouter » de
   * l'interface. Couleurs et épaisseurs : valeurs par défaut d'OptGeo (unit222.pas).
   */
  function objetParDefaut(scene, type, x, y) {
    var o = scene.options, d = Math.sqrt(sqr(o.xxmax - o.xxmin) + sqr(o.yymax - o.yymin)) / 8, h = d / 2;
    switch (type) {
      case 'miroirplan': case 'ecran': case 'lsr': case 'reseau': case 'lmc': case 'lmd': case 'mscopa': case 'mscepa':
        var p = { a1x: x, a1y: y - h, a2x: x, a2y: y + h };
        if (type === 'lmc' || type === 'lmd' || type === 'mscopa' || type === 'mscepa') p.focale = d;
        return p;
      case 'mscore': case 'mscere': return { a1x: x, a1y: y - h, a2x: x, a2y: y + h, rayoncourbure: 2 * d, aigu: true };
      case 'fleche': case 'metre': return { a1x: x - h, a1y: y, a2x: x + h, a2y: y };
      case 'rayon': return { ax: x, ay: y, kx: h, ky: 0 };
      case 'sourceponctuelle': return { nombrederayon: 5, sx: x, sy: y, a1x: x + h, a1y: y - h / 2, a2x: x + h, a2y: y + h / 2 };
      case 'ondeplane': return { nombrederayon: 5, sx: x + h / 2, sy: y - h / 2, a1x: x, a1y: y - h / 2, a2x: x, a2y: y + h / 2 };
      case 'diaphragme': return { cx: x, cy: y, anglepolaire: PI / 2, rint: h / 4, rext: h };
      case 'polyhedre': return { sommets: [{ x: x - h / 2, y: y - h }, { x: x + h / 2, y: y - h }, { x: x + h / 2, y: y + h }, { x: x - h / 2, y: y + h }] };
      case 'polycercle': return { sommets: [{ x: x, y: y - h }, { x: x, y: y + h }], mess: [{ x: x + h / 3, y: y }, { x: x, y: y }], rectiligne: [false, true] };
      case 'prisme': return { gx: x, gy: y, ax: x, ay: y + h, bx: x - h * 0.866, by: y - h / 2 };
      case 'sphere': return { cx: x, cy: y, rayon: h };
      case 'lec': return { s1x: x - h / 6, s1y: y, s2x: x + h / 6, s2y: y, r1: 2 * d, r2: -2 * d, diametre: d };
      case 'miroirconique': return { fx: x, fy: y, excentricite: 1, parametre: h, theta0: PI, theta1: PI - 1, theta2: PI + 1 };
      case 'texte': return { texte: 'Texte', x: x, y: y };
      case 'angle': return { cx: x, cy: y, a1x: x + h, a1y: y, a2x: x + h * Math.cos(1), a2y: y + h * Math.sin(1) };
      case 'oeil': return { cx: x, cy: y, ax: x - h / 2, ay: y };
      case 'jolipoint': return { a1x: x, a1y: y };
    }
    return null;
  }

  OptGeo.objetParDefaut = objetParDefaut;
  OptGeo.poignees = poignees;
  OptGeo.objetSousPoint = objetSousPoint;
  OptGeo.deplacerPoignee = deplacerPoignee;
  OptGeo.distanceObjet = distanceObjet;
})(typeof globalThis !== 'undefined' ? globalThis : this);
