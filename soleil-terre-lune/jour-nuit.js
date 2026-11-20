// jour-nuit.js — partie « Jour et nuit » (6e) : la Terre vue au-dessus d'un pôle, le Soleil à gauche.
// Simplification : l'inclinaison de l'axe est ignorée (situation des équinoxes : 12 h de jour
// partout). Heure solaire : midi quand le lieu fait face au Soleil.
(function () {
  'use strict';
  const STL = window.STL, A = window.Astro, D = STL.Dessin, C = D.COULEURS;
  const SD = A.LIEUX.stdenis, PA = A.LIEUX.paris;
  const $ = id => document.getElementById(id);
  const ecrire = (el, t) => { if (el.textContent !== t) el.textContent = t; };

  const etat = {heure: 12, vue: 'nord', vitesse: 2, ecoule: 0};
  let geo = null, glisse = null, app = null;

  const heureLieu = lieu => A.mod(etat.heure + (lieu.lon - SD.lon) / 15, 24);
  // angle (radians, sens mathématique, vue du nord) du méridien dont l'heure solaire vaut h
  const angle = h => Math.PI + (h - 12) * Math.PI / 12;
  function point(lat, h) {
    const t = angle(h), c = Math.cos(lat * A.RAD), s = Math.sin(lat * A.RAD);
    return etat.vue === 'nord' ? [c * Math.cos(t), c * Math.sin(t), s] : [c * Math.cos(t), -c * Math.sin(t), -s];
  }
  function etatLieu(lieu) {
    const h = heureLieu(lieu);
    if (Math.abs(h - 6) < 1 / 12) return 'lever du Soleil';
    if (Math.abs(h - 18) < 1 / 12) return 'coucher du Soleil';
    return h > 6 && h < 18 ? 'jour' : 'nuit';
  }

  function dessiner(ctx, w, h) {
    ctx.fillStyle = C.ciel; ctx.fillRect(0, 0, w, h);
    const haut = Math.min(46, h * 0.12);
    const r = Math.max(40, Math.min(w * 0.27, (h - haut) * 0.36));
    const cx = Math.min(w - r * 1.45, w * 0.6), cy = haut + (h - haut) / 2;
    geo = {cx, cy, r};
    // Soleil, à gauche, en partie hors du dessin
    const rs = Math.min(h * 0.32, w * 0.2);
    const sx = Math.min(cx - r * 1.5 - rs * 0.4, rs * 0.45);
    D.soleil(ctx, sx, cy, rs);
    D.etiquette(ctx, 'Soleil', Math.max(30, sx + rs * 0.3), cy - rs * 0.45, {taille: 13, gras: true, couleur: '#3a2a00', fond: false});
    // Rayons parallèles
    ctx.strokeStyle = C.rayon; ctx.lineWidth = 1.5;
    const pasR = r / 2.6;
    for (let k = -3; k <= 3; k++) {
      const y = cy + k * pasR;
      const x0 = sx + Math.sqrt(Math.max(0, rs * rs - (y - cy) ** 2)) + 6;
      const dy = Math.abs(y - cy);
      const x1 = dy < r ? cx - Math.sqrt(r * r - dy * dy) - 4 : w - 8;
      if (x1 - x0 > 30) D.fleche(ctx, x0, y, x0 + Math.min(x1 - x0, Math.max(40, (x1 - x0) * 0.55)), y, 7);
      if (x1 - x0 > 30) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    }
    D.etiquette(ctx, 'Lumière du Soleil', (Math.max(sx + rs, 0) + cx - r) / 2 + 10, cy - 2.5 * pasR, {taille: 12, couleur: '#ffe39a'});

    // Terre : moitié tournée vers le Soleil éclairée
    const s = [-1, 0, 0];
    D.sphere(ctx, cx, cy, r, s, C.terreJour, C.terreNuit);
    // méridiens tous les 30° (ils tournent avec la Terre)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'; ctx.lineWidth = 1;
    for (let lon = 0; lon < 360; lon += 30) {
      const hm = etat.heure + (lon - SD.lon) / 15;
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 6) pts.push(point(lat, hm));
      D.courbe(ctx, cx, cy, r, pts); ctx.stroke();
    }
    // parallèles des deux villes
    for (const lieu of [SD, PA]) {
      const pts = [];
      for (let k = 0; k <= 96; k++) pts.push(point(lieu.lat, k / 4));
      const visible = pts[0][2] >= 0;
      ctx.strokeStyle = lieu === SD ? 'rgba(62, 224, 168, 0.75)' : 'rgba(255, 138, 138, 0.75)';
      ctx.lineWidth = visible ? 1.6 : 1.2;
      ctx.setLineDash(visible ? [] : [5, 5]);
      D.courbe(ctx, cx, cy, r, pts, !visible); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    // pôle
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI); ctx.fill();
    D.etiquette(ctx, etat.vue === 'nord' ? 'pôle Nord' : 'pôle Sud', cx, cy + 14, {taille: 12});
    // sens de rotation
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    const ar = r * 1.13;
    if (etat.vue === 'nord') D.arcFleche(ctx, cx, cy, ar, 1.05, 2.05, true, 10);
    else D.arcFleche(ctx, cx, cy, ar, 2.05, 1.05, false, 10);
    D.etiquette(ctx, 'sens de rotation', cx, cy - ar - 12, {taille: 12});

    // repères des villes
    for (const lieu of [SD, PA]) {
      const p = point(lieu.lat, heureLieu(lieu));
      const visible = p[2] >= 0;
      const X = cx + r * p[0], Y = cy - r * p[1];
      ctx.lineWidth = 2; ctx.strokeStyle = '#0d1630';
      ctx.fillStyle = lieu === SD ? C.stdenis : C.paris;
      ctx.beginPath();
      if (lieu === SD) ctx.arc(X, Y, 7, 0, 2 * Math.PI); else ctx.rect(X - 6.5, Y - 6.5, 13, 13);
      if (visible) { ctx.fill(); ctx.stroke(); } else {
        ctx.setLineDash([3, 3]); ctx.strokeStyle = lieu === SD ? C.stdenis : C.paris; ctx.stroke(); ctx.setLineDash([]);
      }
      const l = Math.hypot(p[0], p[1]) || 1, ux = p[0], uy = p[1];
      const ex = X + (ux / l) * 16, ey = Y - (uy / l) * 16;
      const txt = lieu.nom + (visible ? '' : '\n(vu par transparence)');
      const al = ux / l > 0.35 ? 'left' : ux / l < -0.35 ? 'right' : 'center';
      D.etiquette(ctx, txt, ex + (al === 'left' ? 4 : al === 'right' ? -4 : 0), ey - (al === 'center' ? Math.sign(uy || 1) * 6 : 0), {taille: 12, align: al, couleur: lieu === SD ? '#b9ffe6' : '#ffd0d0'});
    }
    D.titreVue(ctx, {x: 0, y: 0, w}, 'La Terre vue au-dessus du pôle ' + (etat.vue === 'nord' ? 'Nord' : 'Sud'));
    D.pasALEchelle(ctx, {x: 0, y: 0, w, h});
  }

  function majPanneau() {
    ecrire($('jn-heure-txt'), A.heureTexte(etat.heure));
    const v = A.mod(etat.heure, 24);
    if (Math.abs(+$('jn-heure').value - v) > 0.04) $('jn-heure').value = String(v);
    $('jn-heure').setAttribute('aria-valuetext', A.heureTexte(etat.heure));
    ecrire($('jn-h-sd'), A.heureTexte(heureLieu(SD)));
    ecrire($('jn-h-pa'), A.heureTexte(heureLieu(PA)));
    ecrire($('jn-e-sd'), etatLieu(SD));
    ecrire($('jn-e-pa'), etatLieu(PA));
    ecrire($('jn-chrono'), (etat.ecoule < -1e-9 ? '−' : '') + A.dureeTexte(Math.abs(etat.ecoule)));
  }

  function tourner(dh) { etat.heure = A.mod(etat.heure + dh, 24); etat.ecoule += dh; }

  STL.parties['jour-nuit'] = {
    titre: 'Jour et nuit', etat,
    init(a) {
      app = a;
      $('jn-heure').addEventListener('input', e => {
        const v = +e.target.value; let d = v - etat.heure;
        if (d > 12) d -= 24; if (d < -12) d += 24;
        tourner(d); app.demanderDessin();
      });
      $('jn-vitesse').addEventListener('change', e => { etat.vitesse = +e.target.value; });
      $('jn-zero').addEventListener('click', () => { etat.ecoule = 0; app.demanderDessin(); });
      document.querySelectorAll('#p-jour-nuit [data-vue]').forEach(b => b.addEventListener('click', () => {
        etat.vue = b.dataset.vue;
        document.querySelectorAll('#p-jour-nuit [data-vue]').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
        app.demanderDessin();
      }));
    },
    avancer(dt) { tourner(dt * etat.vitesse); },
    pas(sens, grand) { tourner(sens * (grand ? 1 : 0.25)); },
    dessiner, majPanneau,
    pointeurBas(x, y) {
      if (!geo || Math.hypot(x - geo.cx, y - geo.cy) > geo.r * 1.3) return false;
      glisse = Math.atan2(-(y - geo.cy), x - geo.cx);
      return true;
    },
    pointeurDeplace(x, y) {
      const a = Math.atan2(-(y - geo.cy), x - geo.cx);
      let d = a - glisse; glisse = a;
      if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      tourner((etat.vue === 'nord' ? d : -d) * 12 / Math.PI);
    },
    pointeurHaut() { glisse = null; },
    // pour les tests : position à l'écran d'un lieu
    ecranLieu(cle) { const p = point(A.LIEUX[cle].lat, heureLieu(A.LIEUX[cle])); return {x: geo.cx + geo.r * p[0], y: geo.cy - geo.r * p[1], visible: p[2] >= 0}; },
    geo: () => geo,
    description() {
      return `La Terre vue au-dessus du pôle ${etat.vue === 'nord' ? 'Nord' : 'Sud'}, éclairée par le Soleil placé à gauche. ` +
        `Saint-Denis : ${etatLieu(SD)}, ${A.heureTexte(heureLieu(SD))} (heure solaire). Paris : ${etatLieu(PA)}, ${A.heureTexte(heureLieu(PA))}.`;
    },
    consignes: [
      'Repère le Soleil et la partie de la Terre qu’il éclaire. Que se passe-t-il pour l’autre partie ?',
      'Appuie sur « Lecture » ou fais tourner la Terre avec le doigt. Dans quel sens tourne-t-elle, vue au-dessus du pôle Nord ? Choisis ensuite « pôle Sud » et compare.',
      'Suis Saint-Denis : note l’heure à laquelle il entre dans la partie éclairée et celle à laquelle il en sort.',
      'Remets le temps écoulé à zéro, puis mesure la durée nécessaire pour que Saint-Denis revienne à la même place.',
      'Au même instant, compare l’heure solaire et l’état (jour ou nuit) de Saint-Denis et de Paris. Rédige ta conclusion.'
    ],
    fiche: `<ul>
      <li>La Terre est vue au-dessus d’un pôle : on voit tout l’hémisphère de ce pôle ; une ville de l’autre hémisphère est dessinée « par transparence » (en pointillés).</li>
      <li>L’inclinaison de l’axe de la Terre est ignorée ici (comme aux équinoxes) : chaque lieu a 12 h de jour et 12 h de nuit. La partie « Saisons » en tient compte.</li>
      <li>L’heure affichée est l’<strong>heure solaire</strong> : il est midi quand le lieu fait face au Soleil. Elle diffère de l’heure de la montre (Paris est à 2,35° E, Saint-Denis à 55,45° E : 3 h 32 min d’écart d’heure solaire).</li>
      <li>Les tailles et la distance du Soleil ne sont pas à l’échelle ; l’aube et le crépuscule sont ignorés.</li>
    </ul>`
  };
})();
