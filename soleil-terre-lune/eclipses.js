// eclipses.js — partie « Éclipses » (5e).
// - Vue de dessus (schéma, pas à l'échelle) : ombre et pénombre de la Terre et de la Lune,
//   limitées par les droites qui joignent les bords du Soleil (source étendue) aux bords de
//   l'astre, comme en optique.
// - Vue de côté : projection sur le plan vertical qui contient la direction du Soleil, avec les
//   vraies dimensions verticales (unité : rayon terrestre) et les distances horizontales
//   raccourcies d'un facteur k. La profondeur (y : vers l'observateur ou à l'opposé) est écrasée :
//   une Lune dessinée dans la bande d'ombre peut passer devant ou derrière l'ombre. Dans ce cas
//   (|y| plus grand que le rayon de la pénombre augmenté de celui de la Lune), une mention
//   « devant / derrière l'ombre » est affichée. L'éclipse elle-même est calculée en trois
//   dimensions (astro.js).
// - Le temps fait avancer la Lune (lunaison 29,53 j) et tourner la ligne des nœuds de son orbite
//   par rapport au Soleil (retour en 346,62 j).
(function () {
  'use strict';
  const STL = window.STL, A = window.Astro, D = STL.Dessin, C = D.COULEURS, V = D.V;
  const $ = id => document.getElementById(id);
  const ecrire = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  const PAR_JOUR = 360 / A.LUNAISON, NOEUD_PAR_JOUR = 360 / A.ANNEE_ECLIPSES;
  // Schéma de la vue de dessus (unités arbitraires) : l'ombre de la Lune atteint la Terre
  const S = {RE: 20, RM: 8, DM: 100, RS: 75, DS: 900};

  const etat = {alpha: 27 * PAR_JOUR, nu: 8, incline: true, vitesse: 5, nl: 0, es: 0, pl: 0, el: 0, jours: 0, message: ''};
  let app = null, geo = null, geoVues = null, glisse = false;
  const maj = s => s.charAt(0).toUpperCase() + s.slice(1);
  const lune = () => A.positionLune(etat.alpha, etat.nu, etat.incline ? A.INCLINAISON_LUNE : 0);

  function texteEclipse(e) {
    if (!e.type) return 'aucune';
    if (e.type === 'soleil') return e.degre === 'centrale' ? 'éclipse de Soleil totale ou annulaire' : 'éclipse de Soleil partielle';
    if (e.degre === 'penombre') return 'éclipse de Lune par la pénombre (à peine visible)';
    return 'éclipse de Lune ' + e.degre;
  }

  // ---------------------------------------------------------------- temps
  function appliquer(j) {
    etat.alpha = A.mod(etat.alpha + j * PAR_JOUR, 360);
    etat.nu = A.mod(etat.nu - j * NOEUD_PAR_JOUR, 360);
    etat.jours += j;
  }
  function compter() {
    const e = A.eclipse(lune());
    if (etat.alpha < 90 || etat.alpha > 270) { etat.nl++; if (e.type === 'soleil') { etat.es++; return e; } }
    else { etat.pl++; if (e.type === 'lune' && e.degre !== 'penombre') { etat.el++; return e; } }
    return null;
  }
  // Avance de dj jours ; chaque nouvelle ou pleine Lune franchie est comptée (et arrête la lecture
  // s'il y a une éclipse et que arret est vrai)
  function avancerJours(dj, arret) {
    let reste = dj;
    while (reste > 1e-9) {
      let da = 180 - A.mod(etat.alpha, 180);
      if (da < 1e-7) da = 180;
      const j = da / PAR_JOUR;
      if (j <= reste + 1e-9) {
        appliquer(j);
        etat.alpha = A.mod(Math.round(etat.alpha / 180) * 180, 360);
        reste -= j;
        const e = compter();
        if (e && arret) {
          app.mettreLecture(false);
          etat.message = 'Lecture arrêtée : ' + texteEclipse(e) + '.';
          return;
        }
      } else { appliquer(reste); reste = 0; }
    }
  }
  function sauter(cible) {
    if (app.lecture) app.mettreLecture(false);
    etat.message = '';
    let da = A.mod(cible - etat.alpha, 360);
    if (da < 1e-7) da = 360;
    avancerJours(da / PAR_JOUR, false);
    etat.alpha = cible;
    app.demanderDessin();
  }

  // ---------------------------------------------------------------- géométrie plane
  // Droites tangentes au Soleil (c1, r1) et à un astre (c2, r2) : ombre (tangentes extérieures)
  // et pénombre (tangentes intérieures)
  function cones(c1, r1, c2, r2) {
    const L = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
    const u = [(c2[0] - c1[0]) / L, (c2[1] - c1[1]) / L], n = [-u[1], u[0]];
    const res = {ext: [], int: [], sommet: [c2[0] + u[0] * L * r2 / (r1 - r2), c2[1] + u[1] * L * r2 / (r1 - r2)], u};
    const se = (r1 - r2) / L, ce = Math.sqrt(1 - se * se), si = (r1 + r2) / L, ci = Math.sqrt(1 - si * si);
    for (const g of [1, -1]) {
      const N = [g * n[0] * ce + u[0] * se, g * n[1] * ce + u[1] * se];
      res.ext.push({p1: [c1[0] + r1 * N[0], c1[1] + r1 * N[1]], p2: [c2[0] + r2 * N[0], c2[1] + r2 * N[1]]});
      const M = [g * n[0] * ci + u[0] * si, g * n[1] * ci + u[1] * si];
      res.int.push({p1: [c1[0] + r1 * M[0], c1[1] + r1 * M[1]], p2: [c2[0] - r2 * M[0], c2[1] - r2 * M[1]]});
    }
    return res;
  }

  function dispositions(w, h) {
    if (w >= 1.05 * h) {
      const w1 = Math.round(w * 0.66), h1 = Math.round(h * 0.56), h2 = Math.round(h / 2);
      return {dessus: {x: 0, y: 0, w: w1, h: h1}, cote: {x: 0, y: h1, w: w1, h: h - h1},
        lune: {x: w1, y: 0, w: w - w1, h: h2}, soleil: {x: w1, y: h2, w: w - w1, h: h - h2}};
    }
    const h1 = Math.round(h * 0.47), h2 = Math.round(h * 0.29), w2 = Math.round(w / 2);
    return {dessus: {x: 0, y: 0, w, h: h1}, cote: {x: 0, y: h1, w, h: h2},
      lune: {x: 0, y: h1 + h2, w: w2, h: h - h1 - h2}, soleil: {x: w2, y: h1 + h2, w: w - w2, h: h - h1 - h2}};
  }

  function dessinerDessus(ctx, v, M, ecl) {
    D.cadreVue(ctx, v, '#26324f');
    const s = Math.max(0.2, Math.min((v.h - 12) / (2 * (S.DM + S.RM + 8)), v.w / (2 * (S.DM + S.RM + 14))));
    const XE = v.x + v.w - (S.DM + S.RM + 12) * s, YE = v.y + v.h / 2 + 4;
    const E = (x, y) => [XE + x * s, YE - y * s];
    const t = (180 + etat.alpha) * A.RAD;
    const m = [S.DM * Math.cos(t), S.DM * Math.sin(t)];
    geo = {XE, YE, s, mx: E(m[0], m[1])[0], my: E(m[0], m[1])[1], v};
    ctx.save();
    ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip();
    const sol = [-S.DS, 0];
    const LOIN = 3000;
    const ombres = (c2, r2, force) => {
      const c = cones(sol, S.RS, c2, r2);
      // pénombre
      ctx.beginPath();
      const [a, b] = c.int;
      const da = [a.p2[0] - a.p1[0], a.p2[1] - a.p1[1]], db = [b.p2[0] - b.p1[0], b.p2[1] - b.p1[1]];
      const la = Math.hypot(da[0], da[1]), lb = Math.hypot(db[0], db[1]);
      ctx.moveTo(...E(a.p2[0], a.p2[1])); ctx.lineTo(...E(a.p2[0] + da[0] / la * LOIN, a.p2[1] + da[1] / la * LOIN));
      ctx.lineTo(...E(b.p2[0] + db[0] / lb * LOIN, b.p2[1] + db[1] / lb * LOIN)); ctx.lineTo(...E(b.p2[0], b.p2[1])); ctx.closePath();
      ctx.fillStyle = `rgba(4, 6, 14, ${0.35 * force})`; ctx.fill();
      // ombre
      ctx.beginPath();
      ctx.moveTo(...E(c.ext[0].p2[0], c.ext[0].p2[1])); ctx.lineTo(...E(c.sommet[0], c.sommet[1])); ctx.lineTo(...E(c.ext[1].p2[0], c.ext[1].p2[1])); ctx.closePath();
      ctx.fillStyle = `rgba(2, 3, 8, ${0.8 * force})`; ctx.fill();
      // droites limites (depuis les bords du Soleil)
      ctx.lineWidth = 1;
      for (const e of c.ext) {
        ctx.strokeStyle = `rgba(255, 220, 120, ${0.55 * force})`;
        ctx.beginPath(); ctx.moveTo(...E(e.p1[0], e.p1[1])); ctx.lineTo(...E(c.sommet[0], c.sommet[1])); ctx.stroke();
      }
      ctx.setLineDash([5, 4]);
      for (const e of c.int) {
        const d = [e.p2[0] - e.p1[0], e.p2[1] - e.p1[1]], l = Math.hypot(d[0], d[1]);
        ctx.strokeStyle = `rgba(255, 220, 120, ${0.45 * force})`;
        ctx.beginPath(); ctx.moveTo(...E(e.p1[0], e.p1[1])); ctx.lineTo(...E(e.p2[0] + d[0] / l * LOIN, e.p2[1] + d[1] / l * LOIN)); ctx.stroke();
      }
      ctx.setLineDash([]);
      return c;
    };
    // Soleil (souvent hors du dessin, à gauche)
    const [sx, sy] = E(sol[0], sol[1]);
    if (sx + S.RS * s > v.x) D.soleil(ctx, sx, sy, S.RS * s);
    else {
      const g = ctx.createLinearGradient(v.x, 0, v.x + 40, 0);
      g.addColorStop(0, 'rgba(255, 210, 80, 0.55)'); g.addColorStop(1, 'rgba(255, 210, 80, 0)');
      ctx.fillStyle = g; ctx.fillRect(v.x, v.y, 40, v.h);
    }
    ombres([0, 0], S.RE, 1);
    const tO = Math.max(10, Math.min(12, s * 14));
    // étiquettes « ombre » et « pénombre » (au milieu de la pénombre, sous l'axe), sauf si la Lune
    // et son étiquette sont juste là
    const pres = (x, y) => Math.hypot(geo.mx - x, geo.my - S.RM * s - 11 - y) < 45;
    const [ox, oy] = E(S.DM * 0.62, 0), [px, py] = E(S.DM * 0.62, -S.RE * (1 + S.DM * 0.62 / S.DS));
    if (!pres(ox, oy)) D.etiquette(ctx, 'ombre', ox, oy, {taille: tO, fond: 'rgba(0,0,0,0.5)'});
    if (!pres(px, py)) D.etiquette(ctx, 'pénombre', px, py, {taille: tO, fond: 'rgba(0,0,0,0.25)'});
    D.sphere(ctx, XE, YE, S.RE * s, [-1, 0, 0], C.terreJour, C.terreNuit, 'rgba(255,255,255,0.6)');
    ombres(m, S.RM, 0.75);
    // orbite de la Lune : trait plein au-dessus du plan de l'orbite de la Terre, pointillés au-dessous
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 90; k++) {
      const p1 = k * 4, p2 = p1 + 4, mil = (p1 + 2) * A.RAD;
      const dessus = !etat.incline || Math.sin(mil - etat.nu * A.RAD) >= 0;
      ctx.setLineDash(dessus ? [] : [3, 4]);
      ctx.strokeStyle = dessus ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath(); ctx.arc(XE, YE, S.DM * s, -p1 * A.RAD, -p2 * A.RAD, true); ctx.stroke();
    }
    ctx.setLineDash([]);
    if (etat.incline) {
      for (const a of [etat.nu, etat.nu + 180]) {
        const [nx, ny] = E(S.DM * Math.cos(a * A.RAD), S.DM * Math.sin(a * A.RAD));
        ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(nx, ny - 5); ctx.lineTo(nx + 5, ny); ctx.lineTo(nx, ny + 5); ctx.lineTo(nx - 5, ny); ctx.closePath(); ctx.fill();
      }
    }
    // Lune
    const rM = Math.max(4, S.RM * s);
    const teinte = ecl.type !== 'lune' ? C.luneJour : ecl.degre === 'totale' ? C.luneEclipse : ecl.degre === 'partielle' ? '#b9806f' : '#bdb7a8';
    D.sphere(ctx, geo.mx, geo.my, rM, [-1, 0, 0], teinte, '#3a3f4c', 'rgba(255,255,255,0.6)');
    D.etiquette(ctx, 'Lune', geo.mx, geo.my - rM - 11, {taille: 11});
    D.etiquette(ctx, 'Terre', XE, YE + S.RE * s + 11, {taille: 11});
    if (sx + S.RS * s <= v.x) D.etiquette(ctx, '← Soleil (loin)', v.x + 6, YE - S.DM * s * 0.55, {taille: 11, align: 'left', couleur: '#ffe39a'});
    ctx.restore();
    D.titreVue(ctx, v, 'Vue de dessus');
    D.pasALEchelle(ctx, v);
    // légende de l'orbite, seulement si elle tient sur une ligne (elle est aussi dans le panneau)
    if (etat.incline && v.h > 140 && v.w >= 600)
      D.etiquette(ctx, 'Orbite de la Lune — trait plein : au-dessus du plan de l’orbite de la Terre ; pointillés : au-dessous',
        v.x + 6, v.y + v.h - 11, {taille: 10.5, align: 'left', couleur: C.texteDoux, fond: 'rgba(8,12,26,0.7)'});
  }

  function dessinerCote(ctx, v, M, ecl) {
    D.cadreVue(ctx, v, '#26324f');
    const R = A.R_SOLEIL, Ds = A.D_SOLEIL, rm = A.R_LUNE, d = A.D_LUNE;
    let sv = (v.h - 22) / 14.2;
    let k = Math.max(0.2, Math.min(0.45, (v.w / sv - 6) / (2 * d)));
    if ((2 * d * k + 6) * sv > v.w) sv = v.w / (2 * d * k + 6);
    const X0 = v.x + v.w / 2, Y0 = v.y + 12 + (v.h - 12) / 2;
    const E = (x, z) => [X0 + x * k * sv, Y0 - z * sv];
    const xmax = (v.w / 2) / (k * sv);
    ctx.save();
    ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip();
    // plan de l'orbite de la Terre
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(v.x, Y0); ctx.lineTo(v.x + v.w, Y0); ctx.stroke(); ctx.setLineDash([]);
    // ombre et pénombre de la Terre
    const oT = A.ombreTerre(xmax);
    ctx.fillStyle = 'rgba(4, 6, 14, 0.35)';
    ctx.beginPath(); ctx.moveTo(...E(0, 1)); ctx.lineTo(...E(xmax, oT.penombre)); ctx.lineTo(...E(xmax, -oT.penombre)); ctx.lineTo(...E(0, -1)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(2, 3, 8, 0.8)';
    ctx.beginPath(); ctx.moveTo(...E(0, 1)); ctx.lineTo(...E(xmax, oT.ombre)); ctx.lineTo(...E(xmax, -oT.ombre)); ctx.lineTo(...E(0, -1)); ctx.closePath(); ctx.fill();
    // ombre de la Lune
    const dSL = Ds + M.x, zAxe = x => M.z * (x + Ds) / dSL;
    const s1 = Math.max(0, xmax - M.x), o1 = A.ombreLune(s1, dSL);
    const xs = M.x + s1;
    ctx.fillStyle = 'rgba(4, 6, 14, 0.3)';
    ctx.beginPath(); ctx.moveTo(...E(M.x, M.z + rm)); ctx.lineTo(...E(xs, zAxe(xs) + o1.penombre)); ctx.lineTo(...E(xs, zAxe(xs) - o1.penombre)); ctx.lineTo(...E(M.x, M.z - rm)); ctx.closePath(); ctx.fill();
    const lo = rm * dSL / (R - rm), xo = M.x + lo;
    ctx.fillStyle = 'rgba(2, 3, 8, 0.75)';
    ctx.beginPath(); ctx.moveTo(...E(M.x, M.z + rm)); ctx.lineTo(...E(xo, zAxe(xo))); ctx.lineTo(...E(M.x, M.z - rm)); ctx.closePath(); ctx.fill();
    // orbite de la Lune vue de côté
    ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let a = 0; a <= 360; a += 3) {
      const P = A.positionLune(a, etat.nu, etat.incline ? A.INCLINAISON_LUNE : 0);
      const [X, Y] = E(P.x, P.z); a === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    const terre = () => D.sphere(ctx, X0, Y0, sv, [-1, 0, 0], C.terreJour, C.terreNuit, 'rgba(255,255,255,0.6)');
    const teinte = ecl.type !== 'lune' ? C.luneJour : ecl.degre === 'totale' ? C.luneEclipse : ecl.degre === 'partielle' ? '#b9806f' : '#bdb7a8';
    const laLune = () => D.sphere(ctx, ...E(M.x, M.z), Math.max(3, rm * sv), [-1, 0, 0], teinte, '#3a3f4c', 'rgba(255,255,255,0.6)');
    if (M.y < 0) { terre(); laLune(); } else { laLune(); terre(); }
    // Profondeur écrasée : la Lune (ou son ombre) semble sur l'ombre (ou sur la Terre) sans y être
    geoVues = geoVues || {};
    geoVues.mention = '';
    const [lx, ly] = E(M.x, M.z), rL = Math.max(3, rm * sv);
    let mention = '';
    if (Math.abs(M.x) < 1.5) {
      if (Math.abs(M.z) < 1 + rm) mention = M.y < 0 ? 'Lune devant la Terre\n(plus près de toi)' : 'Lune derrière la Terre\n(plus loin de toi)';
    } else if (M.x > 0) {
      const o = A.ombreTerre(M.x);
      if (Math.abs(M.z) < o.penombre + rm && Math.abs(M.y) > o.penombre + rm)
        mention = M.y < 0 ? 'Lune devant l’ombre\n(plus près de toi)' : 'Lune derrière l’ombre\n(plus loin de toi)';
    } else if (M.x < 0) {
      const o = A.ombreLune(-M.x, Ds + M.x);
      if (Math.abs(M.z) < 1 + o.penombre && Math.abs(M.y) > 1 + o.penombre)
        mention = M.y < 0 ? 'Lune et son ombre\ndevant la Terre' : 'Lune et son ombre\nderrière la Terre';
    }
    if (mention) {
      geoVues.mention = mention.replace('\n', ' ');
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(lx, ly, rL + 3, 0, 2 * Math.PI); ctx.stroke();
      const haut = ly - v.y > v.h / 2;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx, ly + (haut ? -rL - 3 : rL + 3)); ctx.lineTo(lx, ly + (haut ? -22 : 22)); ctx.stroke();
      ctx.font = D.police(11);
      const lg = Math.max(...mention.split('\n').map(l => ctx.measureText(l).width)) / 2 + 6;
      D.etiquette(ctx, mention, Math.max(v.x + lg, Math.min(v.x + v.w - lg, lx)), ly + (haut ? -40 : 40), {taille: 11});
    }
    ctx.restore();
    D.titreVue(ctx, v, 'Vue de côté');
    D.etiquette(ctx, '← vers le Soleil', v.x + 6, Y0 + 12, {taille: 11, align: 'left', couleur: '#ffe39a', fond: false});
    D.pasALEchelle(ctx, v, 'Pas à l’échelle');
    if (v.h > 110) D.etiquette(ctx, 'distances raccourcies,' + (v.w < 440 ? '\n' : ' ') + 'inclinaison exagérée' + (etat.incline ? ' (réelle : environ 5°)' : ''), v.x + v.w - 6, v.y + v.h - (v.w < 440 ? 18 : 11),
      {taille: 10.5, align: 'right', couleur: C.texteDoux, fond: 'rgba(8,12,26,0.6)'});
  }

  // La Lune vue depuis la Terre, avec l'ombre de la Terre
  function vueLune(M) {
    const f = V.norme([M.x, M.y, M.z]);
    const rep = D.repereVue(f, [0, 0, 1]);
    const s = rep.proj(V.norme([-A.D_SOLEIL - M.x, -M.y, -M.z]));
    let ombre = null;
    if (M.x > 0) {
      const o = A.ombreTerre(M.x), off = rep.proj([0, -M.y, -M.z]);
      const om = {cx: off[0] / A.R_LUNE, cy: off[1] / A.R_LUNE, ru: o.ombre / A.R_LUNE, rp: o.penombre / A.R_LUNE};
      if (Math.hypot(om.cx, om.cy) - om.rp < 1) ombre = om;
    }
    return {s, ombre};
  }
  // Le Soleil vu depuis l'endroit de la Terre le mieux placé : décalage de la Lune (rayons solaires)
  function vueSoleil(M) {
    if (M.x > -2) return null;
    const p = Math.hypot(M.y, M.z), dir = p > 1e-9 ? [M.y / p, M.z / p] : [0, 0];
    const th = A.R_SOLEIL / A.D_SOLEIL, dist = -M.x - 1;
    const sep = Math.max(p - 1, 0) / dist / th;
    return {dx: dir[0] * sep, dy: dir[1] * sep, sep, rl: A.R_LUNE / dist / th};
  }

  // En-tête d'une petite vue : titre et sous-titre, ou un seul titre court si la place manque.
  // Renvoie la hauteur occupée.
  function enTete(ctx, v, titre, sousTitre, court) {
    if (v.h >= 120 && v.w >= 170) {
      D.titreVue(ctx, v, titre, court.replace('\n', ' '));
      D.etiquette(ctx, sousTitre, v.x + 8, v.y + 33, {taille: 11, align: 'left', fond: false, couleur: C.texteDoux});
      return 44;
    }
    // vue étroite : titre court, sur deux lignes si besoin
    ctx.font = D.police(12, true);
    if (ctx.measureText(court.replace('\n', ' ')).width <= v.w - 16) { D.titreVue(ctx, v, court.replace('\n', ' ')); return 26; }
    D.etiquette(ctx, court, v.x + 8, v.y + 22, {taille: 12, gras: true, align: 'left', fond: false});
    return 40;
  }

  function dessinerVues(ctx, vL, vS, M, ecl) {
    const sud = STL.reglages.hemisphere === 'sud';
    // La Lune vue depuis la Terre : image tournée d'un demi-tour vue de l'hémisphère Sud
    D.cadreVue(ctx, vL, '#070b18');
    const hL = enTete(ctx, vL, 'La Lune vue depuis la Terre', sud ? 'depuis La Réunion (hémisphère Sud)' : 'depuis la métropole (hémisphère Nord)',
      sud ? 'Lune vue de\nLa Réunion' : 'Lune vue de\nmétropole');
    const rl = Math.max(12, Math.min(vL.w * 0.28, (vL.h - hL - 8) * 0.42));
    const xl = vL.x + vL.w / 2, yl = vL.y + hL + (vL.h - hL) / 2;
    const L = vueLune(M);
    geoVues = {lune: {x: xl, y: yl, r: rl}, mention: geoVues ? geoVues.mention : '', vueLune: vL, entetes: [hL]};
    D.luneVue(ctx, xl, yl, rl, L.s, STL.reglages.hemisphere, L.ombre);
    // Le Soleil vu depuis l'endroit le mieux placé : jamais retourné, nord (du plan de l'orbite de
    // la Terre) en haut, comme dans la vue de côté
    D.cadreVue(ctx, vS, '#070b18');
    const hS = enTete(ctx, vS, 'Le Soleil vu depuis la Terre', vS.w >= 260 ? 'depuis le lieu le mieux placé ; nord en haut' : 'lieu le mieux placé ; nord en haut',
      'Soleil\n(nord en haut)');
    const rs = Math.max(10, Math.min(vS.w * 0.2, (vS.h - hS - 8) * 0.3));
    const xs = vS.x + vS.w / 2, ys = vS.y + hS + (vS.h - hS) / 2;
    D.soleil(ctx, xs, ys, rs);
    geoVues.soleil = {x: xs, y: ys, r: rs};
    geoVues.vueSoleil = vS; geoVues.entetes.push(hS);
    const S2 = vueSoleil(M);
    if (S2) {
      const mx = xs + S2.dx * rs, my = ys - S2.dy * rs;
      const dansCadre = mx > vS.x + 4 && mx < vS.x + vS.w - 4 && my > vS.y + hS && my < vS.y + vS.h - 4;
      if (S2.sep < 1 + S2.rl + 0.05 || dansCadre) {
        ctx.save(); ctx.beginPath(); ctx.rect(vS.x, vS.y, vS.w, vS.h); ctx.clip();
        ctx.fillStyle = '#10131b'; ctx.beginPath(); ctx.arc(mx, my, S2.rl * rs, 0, 2 * Math.PI); ctx.fill();
        ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
      } else {
        // flèche vers la Lune, et étiquette posée à côté de la flèche, dans la vue
        const ang = Math.atan2(-(my - ys), mx - xs), c = Math.cos(ang), s = -Math.sin(ang);
        const place = Math.min(Math.abs(c) > 1e-3 ? (c > 0 ? vS.x + vS.w - xs : xs - vS.x) / Math.abs(c) : 1e9,
          Math.abs(s) > 1e-3 ? (s > 0 ? vS.y + vS.h - ys : ys - vS.y - hS) / Math.abs(s) : 1e9) - 4;
        const rr = Math.max(rs * 1.35, Math.min(rs * 1.9, place));
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
        D.fleche(ctx, xs + c * rs * 1.15, ys + s * rs * 1.15, xs + c * rr, ys + s * rr, 7);
        const cote = Math.abs(c) < 0.5 ? (c >= 0 ? 1 : -1) : 0;   // flèche presque verticale : étiquette à côté
        const ex = cote ? xs + c * rr * 0.75 + cote * 8 : xs + c * (rr + 6);
        const ey = cote ? ys + s * rr * 0.75 : ys + s * rr * 0.8;
        D.etiquette(ctx, 'Lune', ex, ey, {taille: 11, align: cote > 0 ? 'left' : cote < 0 ? 'right' : (c > 0 ? 'left' : 'right')});
        geoVues.etiquetteLune = {x: ex, y: ey};
      }
    }
  }

  function dessiner(ctx, w, h) {
    const v = dispositions(w, h), M = lune(), ecl = A.eclipse(M);
    dessinerDessus(ctx, v.dessus, M, ecl);
    dessinerCote(ctx, v.cote, M, ecl);
    dessinerVues(ctx, v.lune, v.soleil, M, ecl);
  }

  function majPanneau() {
    const M = lune(), e = A.eclipse(M);
    ecrire($('ec-phase'), maj(A.nomPhase(etat.alpha)));
    ecrire($('ec-etat'), maj(texteEclipse(e)));
    const z = M.z * A.RT_KM;
    ecrire($('ec-hauteur'), Math.abs(z) < 500 ? 'dans le plan' : 'à ' + A.milliers(Math.round(Math.abs(z) / 1000) * 1000) + ' km ' + (z > 0 ? 'au-dessus' : 'au-dessous'));
    for (const c of ['nl', 'es', 'pl', 'el']) ecrire($('ec-' + c), String(etat[c]));
    const nj = Math.floor(etat.jours + 1e-6);
    ecrire($('ec-jours'), A.milliers(nj) + (nj < 2 ? ' jour' : ' jours'));
    ecrire($('ec-arret'), etat.message);
    const ta = Math.round(etat.alpha) % 360 + '°';
    ecrire($('ec-age-txt'), ta);
    $('ec-age').setAttribute('aria-valuetext', ta + ', ' + A.nomPhase(etat.alpha));
    if (Math.abs(+$('ec-age').value - etat.alpha) > 0.3) $('ec-age').value = String(etat.alpha);
  }

  STL.parties.eclipses = {
    titre: 'Éclipses', etat,
    init(a) {
      app = a;
      $('ec-nouvelle').addEventListener('click', () => sauter(0));
      $('ec-pleine').addEventListener('click', () => sauter(180));
      $('ec-vitesse').addEventListener('change', e => { etat.vitesse = +e.target.value; });
      // déplacer la Lune à la main ne fait pas passer le temps (l'orbite ne tourne pas)
      $('ec-age').addEventListener('input', e => { etat.message = ''; etat.alpha = A.mod(+e.target.value, 360); app.demanderDessin(); });
      $('ec-hypothese').addEventListener('change', e => { etat.incline = !e.target.checked; app.demanderDessin(); });
      $('ec-zero').addEventListener('click', () => { Object.assign(etat, {nl: 0, es: 0, pl: 0, el: 0, jours: 0, message: ''}); app.demanderDessin(); });
      document.querySelectorAll('#p-eclipses .lecture').forEach(b => b.addEventListener('click', () => { if (app.lecture) etat.message = ''; }));
    },
    avancer(dt) { avancerJours(dt * etat.vitesse, true); },
    pas(sens, grand) {
      etat.message = '';
      const j = grand ? 7 : 1;
      if (sens > 0) avancerJours(j, false); else appliquer(-j);
    },
    dessiner, majPanneau, sauter,
    pointeurBas(x, y) {
      if (!geo) return false;
      const v = geo.v;
      if (x < v.x || x > v.x + v.w || y < v.y || y > v.y + v.h) return false;
      const d = Math.hypot(x - geo.XE, y - geo.YE);
      const surLune = Math.hypot(x - geo.mx, y - geo.my) < 30;
      if (!surLune && (Math.abs(d - S.DM * geo.s) > 30 || d < S.RE * geo.s)) return false;
      glisse = true; this.pointeurDeplace(x, y);
      return true;
    },
    // glisser la Lune : même chose que le curseur « Position de la Lune » (le temps ne passe pas)
    pointeurDeplace(x, y) {
      if (!glisse || Math.hypot(x - geo.XE, y - geo.YE) < 4) return;
      etat.message = '';
      etat.alpha = A.mod(Math.atan2(-(y - geo.YE), x - geo.XE) / A.RAD - 180, 360);
    },
    pointeurHaut() { glisse = false; },
    geo: () => geo, geoVues: () => geoVues, vueLune, vueSoleil, lune,
    description() {
      const M = lune(), e = A.eclipse(M);
      return `Vue de dessus et vue de côté du Soleil, de la Terre et de la Lune, avec leurs ombres et pénombres. Phase : ${A.nomPhase(etat.alpha)}. ` +
        `Éclipse : ${texteEclipse(e)}. Lune à ${A.milliers(Math.abs(M.z * A.RT_KM))} km ${M.z >= 0 ? 'au-dessus' : 'au-dessous'} du plan de l’orbite de la Terre.`;
    },
    consignes: [
      'Place la Lune entre le Soleil et la Terre, puis du côté opposé au Soleil. Observe dans la vue de dessus où tombent l’ombre de la Lune et l’ombre de la Terre, et regarde ce que l’on voit depuis la Terre.',
      'Pour ces deux positions, regarde aussi la vue de côté : où se trouve la Lune par rapport à l’ombre ? Relève sa position par rapport au plan de l’orbite de la Terre.',
      'Remets les relevés à zéro. Appuie plusieurs fois sur « Nouvelle Lune suivante » et sur « Pleine Lune suivante » jusqu’à 12 nouvelles Lunes, ou utilise « Lecture » : la lecture s’arrête à chaque éclipse.',
      'Note combien de nouvelles Lunes et de pleines Lunes ont donné une éclipse.',
      'Coche l’hypothèse « orbite de la Lune non inclinée » et recommence tes relevés. Compare, puis rédige ta conclusion.'
    ],
    fiche: `<ul>
      <li><strong>Vue de dessus</strong> : schéma pas à l’échelle. Les traits qui limitent l’ombre et la pénombre joignent les bords du Soleil (source étendue) aux bords de la Terre ou de la Lune. Comme cette vue écrase les hauteurs, la Lune peut y sembler dans l’ombre alors qu’elle passe au-dessus ou au-dessous.</li>
      <li><strong>Vue de côté</strong> : les hauteurs et les tailles de la Terre, de la Lune et des ombres sont à la même échelle, mais les distances horizontales sont raccourcies : l’inclinaison de l’orbite de la Lune paraît plus grande que sa vraie valeur (5,1°). Cette vue écrase la profondeur : la Lune peut y sembler dans la bande d’ombre alors qu’elle passe devant ou derrière (une mention l’indique alors).</li>
      <li><strong>La Lune vue depuis la Terre</strong> : vue depuis La Réunion, l’image est tournée d’un demi-tour par rapport à la vue depuis la métropole (haut et bas, gauche et droite échangés). <strong>Le Soleil vu depuis la Terre</strong> : vu depuis l’endroit de la Terre le mieux placé pour l’éclipse, jamais retourné, avec le nord du plan de l’orbite de la Terre en haut, comme dans la vue de côté.</li>
      <li>Les losanges jaunes de la vue de dessus marquent les deux points où l’orbite de la Lune traverse le plan de l’orbite de la Terre.</li>
      <li>Ombre de la Terre à la distance de la Lune : rayon d’environ 4 600 km (la Lune : 1 737 km) ; pénombre : environ 8 200 km.</li>
      <li>La distance Terre-Lune est prise constante (384 400 km). En réalité elle varie de 356 000 à 407 000 km : selon cette distance, une éclipse centrale de Soleil est totale ou annulaire. L’app ne les distingue pas.</li>
      <li>La couleur rouge sombre de la Lune éclipsée vient de la lumière du Soleil déviée par l’atmosphère de la Terre : elle est seulement imitée ici.</li>
      <li>Déplacer la Lune à la main (curseur « Position de la Lune » ou doigt) ne fait pas passer le temps : l’orbite de la Lune ne tourne pas et les relevés ne changent pas.</li>
      <li>Le temps fait avancer la Lune (29,53 jours par lunaison) et tourner l’orbite de la Lune par rapport à la direction du Soleil (retour au même nœud en 346,6 jours). Les éclipses sont relevées à l’instant exact de chaque nouvelle ou pleine Lune ; les éclipses de Lune par la pénombre, presque invisibles, ne sont pas comptées.</li>
    </ul>`
  };
})();
