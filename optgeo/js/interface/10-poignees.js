/*
 * OptGeo web — interface, partie 1 : poignées des objets (mode Déplacer).
 *
 * Couche d'adaptation au-dessus du moteur : OptGeo.poignees / deplacerPoignee
 * (60-interaction.js) donnent une version simplifiée ; ici sont reprises les
 * poignées d'OptGeo 3.03 décrites dans SPEC-INTERFACE.md §9 (rotation autour du
 * centre, foyers projetés sur l'axe, prisme, polycercle…), avec leur signification
 * d'origine. Chaque glisser part d'un instantané des paramètres (pas de calcul
 * itératif comme dans l'original) ; un refus du moteur laisse l'objet à sa
 * dernière position valide (comme OptGeo), l'interface le signale.
 *
 * Rôles (dessin) : 'translation' croix verte, 'point' cercle bleu, 'rotation'
 * disque rouge, 'foyer' croix cyan (foyer, centre de courbure, bord du trou),
 * 'courbure' croix jaune (sommet d'arc d'un polycercle).
 */
(function () {
  'use strict';
  var OGW = window.OGW, OptGeo = window.OptGeo;
  var PI = Math.PI;

  function H(nom, x, y, role, extra) {
    var h = { nom: nom, x: x, y: y, role: role };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function mil(ax, ay, bx, by) { return [(ax + bx) / 2, (ay + by) / 2]; }
  function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)); }
  function copie(o) { return JSON.parse(JSON.stringify(o)); }

  /** Poignées d'un objet (coordonnées monde). */
  function liste(scene, id) {
    var o = scene.objet(id), g = scene.geometrie(id), r = [], i, m;
    if (!o || !g) return r;
    switch (o.type) {
      case 'miroirplan': case 'ecran': case 'lsr':
        m = mil(g.a1x, g.a1y, g.a2x, g.a2y);
        r.push(H('centre', m[0], m[1], 'translation'), H('a1', g.a1x, g.a1y, 'point'), H('a2', g.a2x, g.a2y, 'point'));
        r.push(H('rot1', (g.a1x + m[0]) / 2, (g.a1y + m[1]) / 2, 'rotation', { px: m[0], py: m[1] }));
        r.push(H('rot2', (g.a2x + m[0]) / 2, (g.a2y + m[1]) / 2, 'rotation', { px: m[0], py: m[1] }));
        return r;
      case 'reseau':
        m = mil(g.a1x, g.a1y, g.a2x, g.a2y);
        return [H('centre', m[0], m[1], 'translation'), H('a1', g.a1x, g.a1y, 'point'), H('a2', g.a2x, g.a2y, 'point')];
      case 'fleche': case 'metre':
        m = mil(g.a1x, g.a1y, g.a2x, g.a2y);
        return [H('centre', m[0], m[1], 'translation'), H('a1', g.a1x, g.a1y, 'point'), H('a2', g.a2x, g.a2y, 'point')];
      case 'mscopa': case 'mscepa':
        r.push(H('centre', g.sx, g.sy, 'translation'), H('a1', g.a1x, g.a1y, 'point'), H('a2', g.a2x, g.a2y, 'point'),
          H('foyer', g.fx, g.fy, 'foyer'));
        r.push(H('rot1', (g.a1x + g.sx) / 2, (g.a1y + g.sy) / 2, 'rotation', { px: g.sx, py: g.sy }));
        r.push(H('rot2', (g.a2x + g.sx) / 2, (g.a2y + g.sy) / 2, 'rotation', { px: g.sx, py: g.sy }));
        return r;
      case 'mscore': case 'mscere':
        r.push(H('centre', g.sx, g.sy, 'translation'), H('a1', g.a1x, g.a1y, 'point'), H('a2', g.a2x, g.a2y, 'point'),
          H('courbure', g.cx, g.cy, 'foyer'));
        r.push(H('rot', (g.sx + g.cx) / 2, (g.sy + g.cy) / 2, 'rotation', { px: g.cx, py: g.cy }));
        return r;
      case 'miroirconique':
        r.push(H('centre', g.sx, g.sy, 'translation'), H('a1', g.a1x, g.a1y, 'point', { pivotx: g.a2x, pivoty: g.a2y }),
          H('a2', g.a2x, g.a2y, 'point', { pivotx: g.a1x, pivoty: g.a1y }), H('foyer', g.fx, g.fy, 'foyer'));
        r.push(H('rot', (g.sx + g.fx) / 2, (g.sy + g.fy) / 2, 'rotation', { px: g.fx, py: g.fy }));
        return r;
      case 'lmc': case 'lmd':
        r.push(H('centre', g.ox, g.oy, 'translation'), H('a1', g.a1x, g.a1y, 'point'), H('a2', g.a2x, g.a2y, 'point'),
          H('f1', g.f1x, g.f1y, 'foyer'), H('f2', g.f2x, g.f2y, 'foyer'));
        r.push(H('rot1', (g.a1x + g.ox) / 2, (g.a1y + g.oy) / 2, 'rotation', { px: g.ox, py: g.oy }));
        r.push(H('rot2', (g.a2x + g.ox) / 2, (g.a2y + g.oy) / 2, 'rotation', { px: g.ox, py: g.oy }));
        return r;
      case 'diaphragme':
        r.push(H('centre', g.cx, g.cy, 'translation'), H('a1', g.a1x, g.a1y, 'foyer'), H('ap1', g.ap1x, g.ap1y, 'foyer'),
          H('a2', g.a2x, g.a2y, 'point'), H('ap2', g.ap2x, g.ap2y, 'point'));
        r.push(H('rot1', (g.a1x + g.cx) / 2, (g.a1y + g.cy) / 2, 'rotation', { px: g.cx, py: g.cy }));
        r.push(H('rot2', (g.ap1x + g.cx) / 2, (g.ap1y + g.cy) / 2, 'rotation', { px: g.cx, py: g.cy }));
        return r;
      case 'lec':
        r.push(H('centre', g.ox, g.oy, 'translation'), H('s1', g.s1x, g.s1y, 'point'), H('s2', g.s2x, g.s2y, 'point'));
        r.push(H('rot1', (g.s1x + g.ox) / 2, (g.s1y + g.oy) / 2, 'rotation', { px: g.ox, py: g.oy }));
        r.push(H('rot2', (g.s2x + g.ox) / 2, (g.s2y + g.oy) / 2, 'rotation', { px: g.ox, py: g.oy }));
        return r;
      case 'rayon':
        return [H('centre', g.ax + g.kx / 2, g.ay + g.ky / 2, 'translation'), H('depart', g.ax, g.ay, 'point'),
          H('direction', g.ax + g.kx, g.ay + g.ky, 'point')];
      case 'sourceponctuelle':
        m = mil(g.a1x, g.a1y, g.a2x, g.a2y);
        return [H('centre', m[0], m[1], 'translation'), H('source', g.sx, g.sy, 'point'), H('a1', g.a1x, g.a1y, 'point'),
          H('a2', g.a2x, g.a2y, 'point')];
      case 'ondeplane':
        return [H('centre', g.a1x, g.a1y, 'translation'), H('direction', g.sx, g.sy, 'point'), H('a2', g.a2x, g.a2y, 'point')];
      case 'polyhedre':
        for (i = 1; i <= g.nombresommet; i++) r.push(H('sommet' + i, g.messommets[i].ax, g.messommets[i].ay, 'point'));
        r.push(H('centre', g.xiso, g.yiso, 'translation'));
        r.push(H('rot', (g.xiso + g.messommets[1].ax) / 2, (g.yiso + g.messommets[1].ay) / 2, 'rotation', { px: g.xiso, py: g.yiso }));
        return r;
      case 'polycercle':
        for (i = 1; i <= g.nombresommet; i++) r.push(H('sommet' + i, g.messommets[i].ax, g.messommets[i].ay, 'point'));
        for (i = 1; i <= g.nombresommet; i++) {
          if (g.nombresommet === 2 && i === 2) break;
          m = mil(g.messommets[i].ax, g.messommets[i].ay, g.messommets[i + 1].ax, g.messommets[i + 1].ay);
          r.push(H('corde' + i, m[0], m[1], 'translation'));
        }
        for (i = 1; i <= g.nombresommet; i++) if (!g.rectiligne[i]) r.push(H('arc' + i, g.mess[i].ax, g.mess[i].ay, 'courbure'));
        return r;
      case 'sphere':
        return [H('centre', g.cx, g.cy, 'translation'), H('bord1', g.cx + g.rayon, g.cy, 'point'), H('bord2', g.cx, g.cy + g.rayon, 'point'),
          H('bord3', g.cx - g.rayon, g.cy, 'point'), H('bord4', g.cx, g.cy - g.rayon, 'point')];
      case 'prisme':
        return [H('centre', g.gx, g.gy, 'translation'), H('sommet', g.ax, g.ay, 'rotation', { px: g.gx, py: g.gy }),
          H('baseB', g.bx, g.by, 'point'), H('baseC', g.cx, g.cy, 'point')];
      case 'oeil':
        return [H('centre', g.cx, g.cy, 'translation'), H('a', g.ax, g.ay, 'point')];
      case 'angle':
        m = mil(g.a1x, g.a1y, g.a2x, g.a2y);
        return [H('centre', m[0], m[1], 'translation'), H('sommet', g.cx, g.cy, 'point'), H('a1', g.a1x, g.a1y, 'point'),
          H('a2', g.a2x, g.a2y, 'point')];
      case 'texte':
        return [H('centre', g.x, g.y, 'translation')];
      case 'jolipoint':
        return [H('centre', g.a1x, g.a1y, 'translation')];
    }
    return r;
  }

  /** Point de référence d'un objet pour une translation « par le corps » (centre de la poignée verte). */
  function reference(scene, id) {
    var t = liste(scene, id).filter(function (h) { return h.role === 'translation'; })[0];
    if (t) return { x: t.x, y: t.y };
    var o = scene.objet(id);
    return OptGeo.centreObjet(o.type, scene.geometrie(id));
  }

  /**
   * Prépare un glisser de poignée (ou de l'objet entier si nom = '*corps').
   * @returns contexte à passer à appliquer()
   */
  function demarrer(scene, id, nom) {
    var o = scene.objet(id);
    var h = nom === '*corps' ? null : liste(scene, id).filter(function (q) { return q.nom === nom; })[0];
    var ref = h || reference(scene, id);
    var g = scene.geometrie(id);
    return {
      id: id, type: o.type, nom: nom, role: h ? h.role : 'translation',
      p0: scene.parametres(id), g0: copieGeometrie(g), h0: { x: ref.x, y: ref.y, px: h && h.px, py: h && h.py },
      appliques: 0
    };
  }
  function copieGeometrie(g) {
    var c = {};
    for (var k in g) if (typeof g[k] !== 'function') c[k] = g[k];
    return c;
  }

  function translaterParams(type, p, dx, dy) {
    return OptGeo.transformerParametres(type, p, function (x, y) { return [x + dx, y + dy]; }, null, 0);
  }
  function tournerParams(type, p, a, cx, cy) {
    var co = Math.cos(a), si = Math.sin(a);
    return OptGeo.transformerParametres(type, p,
      function (x, y) { var u = x - cx, v = y - cy; return [cx + co * u - si * v, cy + si * u + co * v]; },
      function (u, v) { return [co * u - si * v, si * u + co * v]; }, a);
  }
  function angleDe(x, y) { return Math.atan2(y, x); }
  function refus(msg) { return { ok: false, erreur: msg || 'Position refusée.' }; }

  /**
   * Nouveaux paramètres de l'objet quand la poignée est amenée en (x, y) monde.
   * Pour une translation, (x, y) est la position visée du point de référence.
   * @returns {{ok, p?, erreur?}}
   */
  function calculer(scene, c, x, y) {
    var p = copie(c.p0), g = c.g0, h = c.h0, t = c.type, nom = c.nom, u, n, l, a, i, m;
    if (c.role === 'translation') return { ok: true, p: translaterParams(t, c.p0, x - h.x, y - h.y) };
    if (c.role === 'rotation' && t !== 'prisme') {
      a = angleDe(x - h.px, y - h.py) - angleDe(h.x - h.px, h.y - h.py);
      return { ok: true, p: tournerParams(t, c.p0, a, h.px, h.py) };
    }
    switch (t) {
      case 'miroirplan': case 'ecran': case 'lsr': case 'reseau': case 'fleche': case 'metre':
        if (nom === 'a1') { p.a1x = x; p.a1y = y; } else { p.a2x = x; p.a2y = y; }
        return { ok: true, p: p };
      case 'mscopa': case 'mscepa': case 'mscore': case 'mscere': case 'lmc': case 'lmd':
        if (nom === 'a1') { p.a1x = x; p.a1y = y; return { ok: true, p: p }; }
        if (nom === 'a2') { p.a2x = x; p.a2y = y; return { ok: true, p: p }; }
        if (t === 'lmc' || t === 'lmd') {            // foyer : |f| = projection sur l'axe, sans borne de côté
          l = Math.abs((x - g.ox) * g.normalex + (y - g.oy) * g.normaley);
          if (!(l > 0)) return refus('Focale nulle.');
          p.focale = l;
          return { ok: true, p: p };
        }
        if (t === 'mscopa' || t === 'mscepa') {      // foyer projeté sur le demi-axe, focale > 0
          l = dist(g.fx, g.fy, g.sx, g.sy);
          u = [(g.fx - g.sx) / l, (g.fy - g.sy) / l];
          l = (x - g.sx) * u[0] + (y - g.sy) * u[1];
          if (!(l > 0)) return refus('Le foyer ne peut pas passer derrière le sommet.');
          p.focale = l;
          return { ok: true, p: p };
        }
        // miroirs réels : centre de courbure projeté sur l'axe s→C
        l = dist(g.cx, g.cy, g.sx, g.sy);
        u = [(g.cx - g.sx) / l, (g.cy - g.sy) / l];
        l = (x - g.sx) * u[0] + (y - g.sy) * u[1];
        if (!(l > 0)) return refus('Le centre ne peut pas passer derrière le sommet.');
        var cx = g.sx + l * u[0], cy = g.sy + l * u[1];
        p.rayoncourbure = dist(cx, cy, g.a1x, g.a1y);
        var meilleur = null;
        [true, false].forEach(function (b) {
          var q = copie(p); q.aigu = b;
          var r = scene.valider(t, q);
          if (r.ok) { var d = dist(r.g.cx, r.g.cy, cx, cy); if (!meilleur || d < meilleur.d) meilleur = { d: d, q: r.p }; }
        });
        return meilleur ? { ok: true, p: meilleur.q } : refus('Rayon de courbure impossible.');
      case 'miroirconique':
        if (nom === 'a1' || nom === 'a2') {          // rotation rigide autour de l'autre extrémité (comme OptGeo)
          var px = nom === 'a1' ? g.a2x : g.a1x, py = nom === 'a1' ? g.a2y : g.a1y;
          a = angleDe(x - px, y - py) - angleDe(h.x - px, h.y - py);
          return { ok: true, p: tournerParams(t, c.p0, a, px, py) };
        }
        // foyer : projeté sur la droite s→f ; s et a1 fixes, e et p recalculés
        l = dist(g.fx, g.fy, g.sx, g.sy);
        u = [(g.fx - g.sx) / l, (g.fy - g.sy) / l];
        l = (x - g.sx) * u[0] + (y - g.sy) * u[1];
        if (!(l > 0)) return refus('Le foyer ne peut pas passer derrière le sommet.');
        var q = OptGeo.types.miroirconique.depuisPoints(g.sx + l * u[0], g.sy + l * u[1], g.sx, g.sy, g.a1x, g.a1y, g.a2x, g.a2y, c.p0);
        return q ? { ok: true, p: q } : refus('Conique impossible.');
      case 'diaphragme':
        if (nom === 'a1' || nom === 'ap1') { p.rint = dist(x, y, g.cx, g.cy); return { ok: true, p: p }; }
        p.rext = dist(x, y, g.cx, g.cy);
        p.anglepolaire = OptGeo.math.donneAnglePolaireDansPiPi(nom === 'a2' ? x - g.cx : g.cx - x, nom === 'a2' ? y - g.cy : g.cy - y);
        return { ok: true, p: p };
      case 'lec':
        l = dist(g.s1x, g.s1y, g.s2x, g.s2y);
        u = [(g.s2x - g.s1x) / l, (g.s2y - g.s1y) / l];
        l = (x - g.s1x) * u[0] + (y - g.s1y) * u[1];
        if (nom === 's1') { p.s1x = g.s1x + l * u[0]; p.s1y = g.s1y + l * u[1]; }
        else { p.s2x = g.s1x + l * u[0]; p.s2y = g.s1y + l * u[1]; }
        return { ok: true, p: p };
      case 'rayon':
        if (nom === 'depart') { p.ax = x; p.ay = y; p.kx = g.ax + g.kx - x; p.ky = g.ay + g.ky - y; }
        else { p.kx = x - g.ax; p.ky = y - g.ay; }
        if (p.kx === 0 && p.ky === 0) return refus('Points confondus.');
        return { ok: true, p: p };
      case 'sourceponctuelle':
        if (nom === 'source') { p.sx = x; p.sy = y; } else if (nom === 'a1') { p.a1x = x; p.a1y = y; } else { p.a2x = x; p.a2y = y; }
        return { ok: true, p: p };
      case 'ondeplane':
        if (nom === 'direction') {                    // rotation du faisceau autour de P1
          if (x === g.a1x && y === g.a1y) return refus('Direction nulle.');
          a = angleDe(x - g.a1x, y - g.a1y) - angleDe(g.sx - g.a1x, g.sy - g.a1y);
          var co = Math.cos(a), si = Math.sin(a), dx = g.a2x - g.a1x, dy = g.a2y - g.a1y;
          p.sx = x; p.sy = y; p.a2x = g.a1x + co * dx - si * dy; p.a2y = g.a1y + si * dx + co * dy;
        } else { p.a2x = x; p.a2y = y; }             // le moteur ramène P2 sur la perpendiculaire
        return { ok: true, p: p };
      case 'polyhedre':
        i = +nom.slice(6) - 1;
        p.sommets[i] = { x: x, y: y };
        return { ok: true, p: p };
      case 'polycercle':
        n = p.sommets.length;
        if (/^sommet/.test(nom)) {
          i = +nom.slice(6) - 1;
          // côtés adjacents en arc : on garde le rapport flèche / corde et le côté du renflement
          var ancien = p.sommets.map(function (s) { return { x: s.x, y: s.y }; });
          p.sommets[i] = { x: x, y: y };
          [(i - 1 + n) % n, i].forEach(function (j) {
            if (p.rectiligne[j]) return;
            var A0 = ancien[j], B0 = ancien[(j + 1) % n], A = p.sommets[j], B = p.sommets[(j + 1) % n];
            var d0 = dist(A0.x, A0.y, B0.x, B0.y), d = dist(A.x, A.y, B.x, B.y);
            if (!d0 || !d) return;
            var I0 = mil(A0.x, A0.y, B0.x, B0.y), n0 = [-(B0.y - A0.y) / d0, (B0.x - A0.x) / d0];
            var T0 = c.p0.mess[j], s = ((T0.x - I0[0]) * n0[0] + (T0.y - I0[1]) * n0[1]) / d0;
            var I = mil(A.x, A.y, B.x, B.y), nn = [-(B.y - A.y) / d, (B.x - A.x) / d];
            p.mess[j] = { x: I[0] + s * d * nn[0], y: I[1] + s * d * nn[1] };
          });
          return { ok: true, p: p };
        }
        if (/^arc/.test(nom)) {                       // sommet d'arc projeté sur la médiatrice de la corde
          i = +nom.slice(3) - 1;
          var A1 = p.sommets[i], B1 = p.sommets[(i + 1) % n], d1 = dist(A1.x, A1.y, B1.x, B1.y);
          m = mil(A1.x, A1.y, B1.x, B1.y);
          var nn1 = [-(B1.y - A1.y) / d1, (B1.x - A1.x) / d1], s1 = (x - m[0]) * nn1[0] + (y - m[1]) * nn1[1];
          if (Math.abs(s1) < 1e-9 * d1) return refus('Arc aplati.');
          p.mess[i] = { x: m[0] + s1 * nn1[0], y: m[1] + s1 * nn1[1] };
          return { ok: true, p: p };
        }
        break;
      case 'sphere':
        p.rayon = dist(x, y, g.cx, g.cy);
        return { ok: true, p: p };
      case 'prisme': {
        var G = [g.gx, g.gy], A = [g.ax, g.ay];
        if (nom === 'sommet') {                       // rotation autour de G, forme conservée
          a = angleDe(x - G[0], y - G[1]) - angleDe(A[0] - G[0], A[1] - G[1]);
          return { ok: true, p: tournerParams(t, c.p0, a, G[0], G[1]) };
        }
        var la = dist(A[0], A[1], G[0], G[1]), w = [(A[0] - G[0]) / la, (A[1] - G[1]) / la];
        if (nom === 'baseB') {                        // B sur la droite (A, B) : la hauteur change, l'angle au sommet reste
          var lb = dist(g.bx, g.by, A[0], A[1]), v = [(g.bx - A[0]) / lb, (g.by - A[1]) / lb];
          l = (x - A[0]) * v[0] + (y - A[1]) * v[1];
          if (!(l > 0)) return refus('Prisme retourné.');
          var Bx = A[0] + l * v[0], By = A[1] + l * v[1];
          var lh = (Bx - A[0]) * w[0] + (By - A[1]) * w[1];        // < 0
          var Hx = A[0] + lh * w[0], Hy = A[1] + lh * w[1];
          p.gx = A[0] + (Hx - A[0]) * 2 / 3; p.gy = A[1] + (Hy - A[1]) * 2 / 3;
          p.ax = A[0]; p.ay = A[1]; p.bx = Bx; p.by = By;
          return { ok: true, p: p };
        }
        // C sur la base (perpendiculaire à l'axe en H) : l'angle au sommet change
        var Hx2 = G[0] - (A[0] - G[0]) / 2, Hy2 = G[1] - (A[1] - G[1]) / 2, b = [-w[1], w[0]];
        l = (x - Hx2) * b[0] + (y - Hy2) * b[1];
        p.bx = Hx2 + l * b[0]; p.by = Hy2 + l * b[1];
        return { ok: true, p: p };
      }
      case 'oeil':
        p.ax = x; p.ay = y;
        return { ok: true, p: p };
      case 'angle':
        if (nom === 'sommet') { p.cx = x; p.cy = y; } else if (nom === 'a1') { p.a1x = x; p.a1y = y; } else { p.a2x = x; p.a2y = y; }
        return { ok: true, p: p };
    }
    return refus('Poignée inconnue.');
  }

  /** Applique le glisser à la scène ; un refus laisse l'objet à sa dernière position valide. */
  function appliquer(scene, c, x, y) {
    var r = calculer(scene, c, x, y);
    if (!r.ok) return r;
    var m = scene.modifier(c.id, r.p);
    if (m.ok) c.appliques++;
    return m;
  }

  /** Texte d'information affiché pendant un glisser (valeurs utiles). */
  function info(scene, c) {
    var g = scene.geometrie(c.id), u = ' ' + (scene.options.unitelongueur || ''), N = OGW.nombre;
    if (!g) return '';
    var t = c.type, nom = c.nom;
    if (c.role === 'rotation' || (t === 'miroirconique' && (nom === 'a1' || nom === 'a2')))
      return 'Rotation' + (t === 'miroirconique' && nom !== 'rot' ? ' autour de l’autre extrémité' : '');
    if (c.role === 'translation') return 'Translation';
    switch (t) {
      case 'lmc': case 'lmd': case 'mscopa': case 'mscepa':
        return nom === 'foyer' || nom === 'f1' || nom === 'f2' ? '|f| = ' + N(g.focale, 4) + u : 'Longueur = ' + N(g.taille, 4) + u;
      case 'mscore': case 'mscere': return 'R = ' + N(g.rayoncourbure, 4) + u;
      case 'miroirconique': return OGW.natureConique(g.excentricite) + ', e = ' + N(g.excentricite, 4) + ', p = ' + N(g.parametre, 4) + u;
      case 'diaphragme': return 'Rint = ' + N(g.rint, 4) + u + ', Rext = ' + N(g.rext, 4) + u;
      case 'sphere': return 'R = ' + N(g.rayon, 4) + u;
      case 'prisme': return (nom === 'baseB' ? 'Hauteur = ' + N(g.hauteur, 4) + u : 'Angle au sommet = ' + N(OGW.deg(g.angle_sommet), 4) + '°');
      case 'lec': return 'Épaisseur = ' + N(Math.sqrt(Math.pow(g.s2x - g.s1x, 2) + Math.pow(g.s2y - g.s1y, 2)), 4) + u;
      case 'rayon': return 'Direction : ' + N(OGW.deg(Math.atan2(g.ky, g.kx)), 4) + '°';
      case 'sourceponctuelle': {
        var t1 = Math.atan2(g.a1y - g.sy, g.a1x - g.sx), t2 = Math.atan2(g.a2y - g.sy, g.a2x - g.sx), d = t2 - t1;
        while (d < 0) d += 2 * PI;
        return 'Ouverture du faisceau : ' + N(OGW.deg(d), 4) + '° (sens direct de 1 vers 2)';
      }
      case 'ondeplane': return nom === 'direction' ? 'Direction : ' + N(OGW.deg(Math.atan2(g.sy - g.a1y, g.sx - g.a1x)), 4) + '°'
        : 'Largeur = ' + N(Math.sqrt(Math.pow(g.a2x - g.a1x, 2) + Math.pow(g.a2y - g.a1y, 2)), 4) + u;
      case 'metre': case 'fleche': case 'miroirplan': case 'ecran': case 'lsr': case 'reseau':
        return 'Longueur = ' + N(Math.sqrt(Math.pow(g.a2x - g.a1x, 2) + Math.pow(g.a2y - g.a1y, 2)), 4) + u;
      case 'oeil': return 'Taille = ' + N(g.rayoncourbure, 4) + u;
    }
    return '';
  }

  /** Libellé de la poignée (choix entre poignées superposées, consignes). */
  var LIBELLES = {
    centre: 'déplacer', a1: 'point 1', a2: 'point 2', rot1: 'rotation', rot2: 'rotation', rot: 'rotation', foyer: 'foyer',
    f1: 'foyer F1', f2: 'foyer F2', courbure: 'centre de courbure', ap1: 'bord du trou', ap2: 'bord extérieur', s1: 'sommet S1', s2: 'sommet S2',
    depart: 'origine', direction: 'direction', source: 'point source', sommet: 'sommet', baseB: 'base (hauteur)', baseC: 'base (angle au sommet)', a: 'pupille'
  };
  function libelle(h, type) {
    if (type === 'diaphragme' && h.nom === 'a1') return 'bord du trou';
    if (type === 'diaphragme' && h.nom === 'a2') return 'bord extérieur';
    if (/^sommet\d/.test(h.nom)) return 'sommet ' + h.nom.slice(6);
    if (/^arc\d/.test(h.nom)) return 'sommet d’arc ' + h.nom.slice(3);
    if (/^corde\d/.test(h.nom)) return 'déplacer';
    if (/^bord\d/.test(h.nom)) return 'rayon';
    return LIBELLES[h.nom] || h.nom;
  }

  OGW.Poignees = { liste: liste, demarrer: demarrer, calculer: calculer, appliquer: appliquer, info: info, libelle: libelle, reference: reference };
})();
