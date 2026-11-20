// dessin.js — outils de dessin communs (Canvas 2D, coordonnées en pixels CSS).
// Convention des « coordonnées de vue » : x vers la droite, y vers le haut, z vers l'observateur.
(function () {
  'use strict';
  const STL = window.STL = {parties: {}, reglages: {hemisphere: 'sud'}};

  const COULEURS = {
    ciel: '#0b1226', cielClair: '#16213f', texte: '#eef2f7', texteDoux: '#b9c3d3',
    terreJour: '#4a90d9', terreNuit: '#1a2a4d', luneJour: '#e8e4d8', luneNuit: '#2a2e38',
    soleil: '#ffd34d', soleilBord: '#ffb000', rayon: 'rgba(255, 214, 102, 0.55)',
    stdenis: '#3ee0a8', paris: '#ff8a8a', ombre: '#ffffff', luneEclipse: 'rgb(110, 36, 20)'
  };

  const V = {
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    croix: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norme: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  };

  // Chemin de la partie éclairée d'une sphère de centre (x, y) et de rayon r, quand le Soleil
  // est dans la direction s (unitaire, coordonnées de vue). Le terminateur (cercle qui sépare
  // jour et nuit) se projette en demi-ellipse de demi-axes r et r·|s.z| : forme exacte des phases.
  // Renvoie 'rien', 'plein' ou 'partiel'.
  function cheminEclaire(ctx, x, y, r, s) {
    ctx.beginPath();
    const h = Math.hypot(s[0], s[1]);
    if (h < 1e-6) {
      if (s[2] > 0) { ctx.arc(x, y, r, 0, 2 * Math.PI); return 'plein'; }
      return 'rien';
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(-s[1], s[0]));          // le Soleil vers +x (écran : y vers le bas)
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);   // demi-disque tourné vers le Soleil
    ctx.ellipse(0, 0, Math.max(r * Math.abs(s[2]), 1e-3), r, 0, Math.PI / 2, 3 * Math.PI / 2, s[2] < 0);
    ctx.closePath();
    ctx.restore();
    return 'partiel';
  }

  function sphere(ctx, x, y, r, s, jour, nuit, bord) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = nuit; ctx.fill();
    if (cheminEclaire(ctx, x, y, r, s) !== 'rien') { ctx.fillStyle = jour; ctx.fill(); }
    if (bord) { ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.strokeStyle = bord; ctx.lineWidth = 1; ctx.stroke(); }
  }

  // Polyligne de points (coordonnées de vue, sphère unité) : seulement la face visible (z ≥ 0)
  // ou seulement la face cachée (arriere = true).
  function courbe(ctx, x, y, r, pts, arriere = false) {
    ctx.beginPath();
    let leve = true;
    for (const p of pts) {
      const vu = arriere ? p[2] < 0 : p[2] >= 0;
      if (!vu) { leve = true; continue; }
      const X = x + r * p[0], Y = y - r * p[1];
      if (leve) { ctx.moveTo(X, Y); leve = false; } else ctx.lineTo(X, Y);
    }
  }

  function fleche(ctx, x1, y1, x2, y2, t = 8) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - t * Math.cos(a - 0.45), y2 - t * Math.sin(a - 0.45));
    ctx.lineTo(x2 - t * Math.cos(a + 0.45), y2 - t * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
  }

  // Arc fléché (sens : true = sens inverse des aiguilles d'une montre à l'écran)
  function arcFleche(ctx, x, y, r, a1, a2, inverse, t = 9) {
    // angles mathématiques (y vers le haut) en radians
    ctx.beginPath();
    ctx.arc(x, y, r, -a1, -a2, inverse);
    ctx.stroke();
    const px = x + r * Math.cos(a2), py = y - r * Math.sin(a2);
    const tangente = inverse ? a2 + Math.PI / 2 : a2 - Math.PI / 2;  // direction du mouvement
    const dx = Math.cos(tangente), dy = -Math.sin(tangente);
    ctx.beginPath();
    ctx.moveTo(px + dx * t * 0.6, py + dy * t * 0.6);
    ctx.lineTo(px - dx * t + dy * t * 0.55, py - dy * t - dx * t * 0.55);
    ctx.lineTo(px - dx * t - dy * t * 0.55, py - dy * t + dx * t * 0.55);
    ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
  }

  const police = (taille, gras) => (gras ? '600 ' : '') + Math.round(taille) + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  // Texte avec fond sombre (lisible sur tous les fonds)
  function etiquette(ctx, txt, x, y, o = {}) {
    const taille = o.taille || 13;
    ctx.font = police(taille, o.gras);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'middle';
    const lignes = String(txt).split('\n');
    const larg = Math.max(...lignes.map(l => ctx.measureText(l).width));
    const haut = lignes.length * taille * 1.2;
    let x0 = ctx.textAlign === 'center' ? x - larg / 2 : ctx.textAlign === 'right' ? x - larg : x;
    const W = STL.app ? STL.app.w : 1e9, H = STL.app ? STL.app.h : 1e9;
    const dx = Math.min(0, W - 6 - (x0 + larg)) || Math.max(0, 6 - x0);
    x += dx; x0 += dx;
    y += Math.max(0, 6 + haut / 2 - y) + Math.min(0, H - 6 - haut / 2 - y);
    if (o.fond !== false) {
      ctx.fillStyle = o.fond || 'rgba(8, 12, 26, 0.78)';
      const p = 4;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x0 - p, y - haut / 2 - p + 1, larg + 2 * p, haut + 2 * p - 2, 4);
      else ctx.rect(x0 - p, y - haut / 2 - p + 1, larg + 2 * p, haut + 2 * p - 2);
      ctx.fill();
    }
    ctx.fillStyle = o.couleur || COULEURS.texte;
    lignes.forEach((l, i) => ctx.fillText(l, x, y - haut / 2 + taille * 0.6 + i * taille * 1.2));
    return {x: x0, y: y - haut / 2, w: larg, h: haut};
  }

  // Bandeau « Pas à l'échelle » en haut à droite d'une vue
  function pasALEchelle(ctx, v, txt = 'Pas à l’échelle') {
    const taille = Math.max(11, Math.min(13, v.w / 32));
    ctx.font = police(taille, true);
    const w = ctx.measureText(txt).width + 12;
    const x = v.x + v.w - w - 6, y = v.y + 6;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, taille + 10, 6); else ctx.rect(x, y, w, taille + 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x + 6, y + (taille + 10) / 2 + 0.5);
  }

  // Titre d'une vue, en haut à gauche
  function titreVue(ctx, v, txt, court) {
    let taille = Math.max(12, Math.min(15, v.w / 28));
    ctx.font = police(taille, true);
    if (court && ctx.measureText(txt).width > v.w - 16) txt = court;
    while (taille > 10 && ctx.measureText(txt).width > v.w - 16) { taille -= 0.5; ctx.font = police(taille, true); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = COULEURS.texte;
    ctx.fillText(txt, v.x + 8, v.y + 8);
  }

  function cadreVue(ctx, v, fond = COULEURS.ciel) {
    ctx.fillStyle = fond; ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'; ctx.lineWidth = 1;
    ctx.strokeRect(v.x + 0.5, v.y + 0.5, v.w - 1, v.h - 1);
  }

  // Soleil (disque et halo)
  function soleil(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.6);
    g.addColorStop(0, 'rgba(255, 210, 80, 0.55)'); g.addColorStop(1, 'rgba(255, 210, 80, 0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 2 * Math.PI); ctx.fill();
    const g2 = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
    g2.addColorStop(0, '#fff6c0'); g2.addColorStop(1, COULEURS.soleil);
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
  }

  // Lune vue depuis la Terre. s : direction du Soleil (coordonnées de vue de l'observateur).
  // hemisphere 'sud' : image tournée de 180° (observateur de l'hémisphère Sud).
  // ombre (facultatif) : {cx, cy, ru, rp} centre et rayons de l'ombre et de la pénombre de la
  // Terre, en rayons lunaires, dans les mêmes coordonnées de vue.
  function luneVue(ctx, x, y, r, s, hemisphere, ombre) {
    const k = hemisphere === 'sud' ? -1 : 1;
    const sv = [k * s[0], k * s[1], s[2]];
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.clip();
    sphere(ctx, x, y, r, sv, COULEURS.luneJour, '#161a24');
    // mers lunaires très discrètes (toujours la même face), sur la partie éclairée
    if (cheminEclaire(ctx, x, y, r, sv) !== 'rien') {
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(120, 118, 110, 0.16)';
      for (const [mx, my, mr] of [[-0.3, 0.35, 0.22], [0.05, 0.25, 0.18], [0.25, -0.05, 0.2], [-0.35, -0.2, 0.14], [0.1, -0.45, 0.12]]) {
        ctx.beginPath(); ctx.arc(x + k * mx * r, y - k * my * r, mr * r, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.restore();
    }
    if (ombre) {
      const ox = x + k * ombre.cx * r, oy = y - k * ombre.cy * r;
      const g = ctx.createRadialGradient(ox, oy, ombre.ru * r, ox, oy, ombre.rp * r);
      g.addColorStop(0, 'rgba(10, 6, 4, 0.55)'); g.addColorStop(1, 'rgba(10, 6, 4, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, ombre.rp * r, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(105, 34, 18, 0.93)';
      ctx.beginPath(); ctx.arc(ox, oy, ombre.ru * r, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.restore();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r + 0.5, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
  }

  // Bases : direction de l'observateur (de la Lune vers la Terre…) → repère de vue
  // f : direction regardée (unitaire), haut : vecteur « haut » de référence
  function repereVue(f, haut) {
    const z = V.mul(f, -1);
    const y = V.norme(V.sub(haut, V.mul(z, V.dot(haut, z))));
    const x = V.croix(y, z);
    return {x, y, z, proj: p => [V.dot(p, x), V.dot(p, y), V.dot(p, z)]};
  }

  STL.Dessin = {COULEURS, V, cheminEclaire, sphere, courbe, fleche, arcFleche, police, etiquette, pasALEchelle, titreVue, cadreVue, soleil, luneVue, repereVue};
})();
