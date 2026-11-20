// phases.js — partie « Phases de la Lune » (5e) : vue de dessus (pôle Nord), Soleil à gauche
// (rayons parallèles), et la Lune vue depuis la Terre. Orbite de la Lune supposée dans le plan
// de l'orbite de la Terre (l'inclinaison est traitée dans « Éclipses »).
(function () {
  'use strict';
  const STL = window.STL, A = window.Astro, D = STL.Dessin, C = D.COULEURS;
  const $ = id => document.getElementById(id);
  const ecrire = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  const PAR_JOUR = 360 / A.LUNAISON;

  const etat = {alpha: 5 * PAR_JOUR, vitesse: 2, moitie: false};
  let geo = null, geoVue = null, app = null, glisse = false;
  const maj = s => s.charAt(0).toUpperCase() + s.slice(1);

  function dispositions(w, h) {
    if (w >= 1.2 * h) { const w1 = Math.round(w * 0.6); return [{x: 0, y: 0, w: w1, h}, {x: w1, y: 0, w: w - w1, h}]; }
    const h1 = Math.round(h * 0.6);
    return [{x: 0, y: 0, w, h: h1}, {x: 0, y: h1, w, h: h - h1}];
  }

  // Direction du Soleil vue par un observateur terrestre qui regarde la Lune (plan de l'écliptique)
  function soleilVuDeLaTerre(alpha) {
    const t = (180 + alpha) * A.RAD;
    const rep = D.repereVue([Math.cos(t), Math.sin(t), 0], [0, 0, 1]);
    return rep.proj([-1, 0, 0]);
  }

  function dessinerDessus(ctx, v) {
    D.cadreVue(ctx, v);
    const m = Math.min(v.w, v.h - 40);
    const cx = v.x + v.w * 0.56, cy = v.y + v.h / 2 + 12;
    const Ro = m * 0.36, rE = Math.max(14, m * 0.1), rM = Math.max(9, m * 0.05);
    const t = (180 + etat.alpha) * A.RAD;
    const mx = cx + Ro * Math.cos(t), my = cy - Ro * Math.sin(t);
    geo = {cx, cy, Ro, rE, rM, mx, my, v};
    // rayons du Soleil (parallèles, venant de la gauche)
    ctx.strokeStyle = 'rgba(255, 214, 102, 0.32)'; ctx.lineWidth = 1.2;
    for (let k = -4; k <= 4; k++) {
      const y = cy + k * Ro * 0.3;
      if (y < v.y + 72 || y > v.y + v.h - 6) continue;
      D.fleche(ctx, v.x + 6, y, v.x + 46, y, 7);
    }
    D.etiquette(ctx, 'Lumière du Soleil\n(Soleil très loin à gauche)', v.x + 8, v.y + 46, {taille: 11, align: 'left', couleur: '#ffe39a'});
    // orbite de la Lune et sens de révolution
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, Ro, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 1.8;
    D.arcFleche(ctx, cx, cy, Ro, 0.5, 0.85, true, 9);
    // repères des quatre phases du cours : angle Soleil-Terre-Lune de 0°, 90°, 180° et 270°
    for (const a of [0, 90, 180, 270]) {
      const u = (180 + a) * A.RAD, c = Math.cos(u), s = -Math.sin(u);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + c * (Ro - 7), cy + s * (Ro - 7)); ctx.lineTo(cx + c * (Ro + 7), cy + s * (Ro + 7)); ctx.stroke();
      const ecart = Math.abs(A.mod(etat.alpha - a + 180, 360) - 180);
      if (ecart > 25) D.etiquette(ctx, a + '°', cx + c * (Ro + 20), cy + s * (Ro + 18), {taille: 11, couleur: C.texteDoux, fond: false});
    }
    // Terre vue au-dessus du pôle Nord
    D.sphere(ctx, cx, cy, rE, [-1, 0, 0], C.terreJour, C.terreNuit, 'rgba(255,255,255,0.6)');
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, 2 * Math.PI); ctx.fill();
    D.etiquette(ctx, 'Terre', cx, cy + rE + 12, {taille: 12});
    // moitié de la Lune tournée vers la Terre
    if (etat.moitie) {
      ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(126, 220, 255, 0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]);
    }
    // Lune : toujours à moitié éclairée, du côté du Soleil
    D.sphere(ctx, mx, my, rM, [-1, 0, 0], C.luneJour, '#3a3f4c', 'rgba(255,255,255,0.5)');
    if (etat.moitie) {
      const fe = t + Math.PI;   // direction de la Terre vue de la Lune
      ctx.strokeStyle = '#7edcff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(mx, my, rM + 3, -(fe - Math.PI / 2), -(fe + Math.PI / 2), true); ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(mx - Math.sin(fe) * (rM + 6), my - Math.cos(fe) * (rM + 6)); ctx.lineTo(mx + Math.sin(fe) * (rM + 6), my + Math.cos(fe) * (rM + 6)); ctx.stroke();
    }
    D.etiquette(ctx, 'Lune', mx + Math.cos(t) * (rM + 16), my - Math.sin(t) * (rM + 16), {taille: 12});
    D.titreVue(ctx, v, 'Vue au-dessus du pôle Nord');
    D.pasALEchelle(ctx, v);
  }

  function dessinerVue(ctx, v) {
    D.cadreVue(ctx, v, '#070b18');
    const rv = Math.max(24, Math.min(v.w * 0.3, (v.h - 96) * 0.38));
    const x = v.x + v.w / 2, y = v.y + 40 + (v.h - 96) / 2 + 6;
    geoVue = {x, y, r: rv};
    D.luneVue(ctx, x, y, rv, soleilVuDeLaTerre(etat.alpha), STL.reglages.hemisphere);
    D.titreVue(ctx, v, 'La Lune vue depuis la Terre', 'Lune vue de la Terre');
    const sud = STL.reglages.hemisphere === 'sud';
    D.etiquette(ctx, sud ? 'depuis La Réunion (hémisphère Sud)' : 'depuis la métropole (hémisphère Nord)', x, v.y + 36, {taille: 12, fond: false, couleur: C.texteDoux});
    const k = A.fractionEclairee(etat.alpha);
    D.etiquette(ctx, maj(A.nomPhase(etat.alpha)) + '\n' + Math.round(k * 100) + ' % éclairée', x, v.y + v.h - 28, {taille: 14, gras: true});
    const rep = A.reperePhase(etat.alpha);
    if (rep && y + rv + 10 < v.y + v.h - 66) D.etiquette(ctx, '(' + rep + ')', x, v.y + v.h - 58, {taille: 12, couleur: C.texteDoux, fond: false});
  }

  function dessiner(ctx, w, h) {
    const [a, b] = dispositions(w, h);
    dessinerDessus(ctx, a);
    dessinerVue(ctx, b);
  }

  function majPanneau() {
    const age = A.mod(etat.alpha, 360) / PAR_JOUR;
    const t = A.virgule(age, 1) + ' jour' + (age >= 1.95 ? 's' : '');
    ecrire($('ph-age-txt'), t);
    if (Math.abs(+$('ph-age').value - age) > 0.06) $('ph-age').value = String(age);
    $('ph-age').setAttribute('aria-valuetext', t);
    ecrire($('ph-nom'), maj(A.nomPhase(etat.alpha)));
    ecrire($('ph-repere'), A.reperePhase(etat.alpha));
    ecrire($('ph-fraction'), Math.round(A.fractionEclairee(etat.alpha) * 100) + ' %');
    ecrire($('ph-evolution'), A.evolution(etat.alpha));
    ecrire($('ph-angle'), Math.round(A.mod(etat.alpha, 360)) % 360 + '°');
  }

  function placer(alpha) { etat.alpha = A.mod(alpha, 360); }
  function depuisPointeur(x, y) { placer(Math.atan2(-(y - geo.cy), x - geo.cx) / A.RAD - 180); }

  STL.parties.phases = {
    titre: 'Phases de la Lune', etat,
    init(a) {
      app = a;
      $('ph-age').addEventListener('input', e => { placer(+e.target.value * PAR_JOUR); app.demanderDessin(); });
      $('ph-vitesse').addEventListener('change', e => { etat.vitesse = +e.target.value; });
      $('ph-moitie').addEventListener('change', e => { etat.moitie = e.target.checked; app.demanderDessin(); });
    },
    avancer(dt) { placer(etat.alpha + dt * etat.vitesse * PAR_JOUR); },
    pas(sens, grand) { placer(etat.alpha + sens * (grand ? A.LUNAISON / 4 : 1) * PAR_JOUR); },
    dessiner, majPanneau,
    pointeurBas(x, y) {
      if (!geo) return false;
      const v = geo.v;
      if (x < v.x || x > v.x + v.w || y < v.y || y > v.y + v.h) return false;
      const d = Math.hypot(x - geo.cx, y - geo.cy);
      const surLune = Math.hypot(x - geo.mx, y - geo.my) < Math.max(30, geo.rM * 2.2);
      if (!surLune && (Math.abs(d - geo.Ro) > 30 || d < geo.rE)) return false;
      glisse = true; depuisPointeur(x, y);
      return true;
    },
    pointeurDeplace(x, y) { if (glisse && Math.hypot(x - geo.cx, y - geo.cy) > 4) depuisPointeur(x, y); },
    pointeurHaut() { glisse = false; },
    geo: () => geo, geoVue: () => geoVue,
    soleilVuDeLaTerre,
    description() {
      return `Vue de dessus : la Lune tourne autour de la Terre, éclairée par le Soleil placé à gauche. Angle Soleil-Terre-Lune : ${Math.round(A.mod(etat.alpha, 360))}°. ` +
        `Vue depuis ${STL.reglages.hemisphere === 'sud' ? 'La Réunion' : 'la métropole'} : ${A.nomPhase(etat.alpha)}, ${Math.round(A.fractionEclairee(etat.alpha) * 100)} % de la face visible éclairée, ${A.evolution(etat.alpha)}.`;
    },
    consignes: [
      'Dans la vue de dessus, observe la Lune à plusieurs endroits de son orbite : quelle partie de la Lune est éclairée par le Soleil ?',
      'Fais tourner la Lune autour de la Terre (avec le doigt ou « Lecture ») et regarde en même temps la Lune vue depuis la Terre.',
      'Place la Lune entre la Terre et le Soleil, puis à 90°, à l’opposé du Soleil, et à 270° : note chaque fois le nom de la phase, la fraction éclairée et l’aspect de la Lune.',
      'Coche « Montrer la moitié de la Lune tournée vers la Terre » : compare cette moitié et la moitié éclairée.',
      'Compare le premier quartier vu depuis La Réunion et vu depuis la métropole. Combien de jours dure un cycle complet de phases ? Rédige ta conclusion.'
    ],
    fiche: `<ul>
      <li>Fraction éclairée de la face visible : (1 − cos a) / 2, où a est l’angle Soleil-Terre-Lune ; le bord de la partie éclairée est dessiné avec sa vraie forme (une demi-ellipse).</li>
      <li>Le Soleil est supposé très loin : ses rayons arrivent parallèles.</li>
      <li>L’orbite de la Lune est dessinée dans le plan de l’orbite de la Terre ; son inclinaison (environ 5°) est étudiée dans la partie « Éclipses ».</li>
      <li>Les noms des quatre phases principales sont donnés à moins de 7° (environ une demi-journée) de la position exacte.</li>
      <li>Orientation : entre les deux hémisphères, l’image de la Lune est tournée d’un demi-tour (haut et bas, gauche et droite échangés). En réalité, près des tropiques, le croissant apparaît aussi plus ou moins couché selon l’heure et la saison.</li>
      <li>Les quatre phases du cours (nouvelle Lune, premier quartier, pleine Lune, dernier quartier) sont les repères principaux ; entre deux, l’app donne le nom de la phase intermédiaire et les deux phases du cours qui l’entourent.</li>
      <li>Pendant une lunaison (29,5 jours), la Terre avance aussi autour du Soleil : la vue de dessus ne le montre pas.</li>
    </ul>`
  };
})();
