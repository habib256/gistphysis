// saisons.js — partie « Saisons » (6e, 5e) : la Terre sur son orbite, axe incliné de direction
// fixe dans l'espace ; mesures pour Saint-Denis et Paris (voir astro.js pour les formules).
(function () {
  'use strict';
  const STL = window.STL, A = window.Astro, D = STL.Dessin, C = D.COULEURS, V = D.V;
  const SD = A.LIEUX.stdenis, PA = A.LIEUX.paris;
  const $ = id => document.getElementById(id);
  const ecrire = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  const ELEV = 25 * A.RAD;   // la vue oblique regarde le plan de l'orbite de 25° au-dessus

  const etat = {n: A.jourDeDate(5, 21), incline: true, vitesse: 20};
  let geo = null, app = null, glisse = false;
  const LS = [];   // longitude du Soleil pour chaque jour (recherche d'une date d'après une position)
  for (let n = 1; n <= 366; n++) LS[n] = A.soleil(n).L;

  const axe = () => etat.incline ? [0, Math.sin(A.INCLINAISON_AXE * A.RAD), Math.cos(A.INCLINAISON_AXE * A.RAD)] : [0, 0, 1];
  // Position de la Terre (unité : UA), repère de l'écliptique (x vers le point vernal, z au nord)
  function positionTerre(n) {
    const s = A.soleil(n), t = (s.L + 180) * A.RAD;
    return [s.r * Math.cos(t), s.r * Math.sin(t), 0];
  }
  // Vue oblique : x écran = y monde ; on regarde depuis +x, 25° au-dessus du plan
  const vueOblique = W => [W[1], -W[0] * Math.sin(ELEV) + W[2] * Math.cos(ELEV), W[0] * Math.cos(ELEV) + W[2] * Math.sin(ELEV)];

  function dispositions(w, h) {
    if (w >= 1.6 * h) return [{x: 0, y: 0, w: Math.round(w * 0.6), h}, {x: Math.round(w * 0.6), y: 0, w: w - Math.round(w * 0.6), h}];
    const h1 = Math.round(h * 0.56);
    return [{x: 0, y: 0, w, h: h1}, {x: 0, y: h1, w, h: h - h1}];
  }

  function dessinerOrbite(ctx, v) {
    D.cadreVue(ctx, v);
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2 + 12;
    const R = Math.max(40, Math.min(v.w / 2 - 62, (v.h / 2 - 46) / (Math.sin(ELEV) + 0.2)));
    const rE = Math.max(9, Math.min(22, R * 0.085)), rS = Math.max(13, Math.min(38, R * 0.15));
    const ecran = P => [cx + P[1] * R, cy + P[0] * Math.sin(ELEV) * R - P[2] * Math.cos(ELEV) * R];
    // orbite (vraie forme : presque un cercle, Soleil presque au centre)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let n = 1; n <= 366; n += 1) { const [X, Y] = ecran(positionTerre(n)); n === 1 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.closePath(); ctx.stroke();
    // mois
    const t = Math.max(10, Math.min(12.5, R / 16));
    for (let m = 0; m < 12; m++) {
      const P = positionTerre(A.jourDeDate(m, 1));
      const [X0, Y0] = ecran(P);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; ctx.beginPath(); ctx.arc(X0, Y0, 2, 0, 2 * Math.PI); ctx.fill();
      const [X, Y] = ecran(V.mul(P, 1 + 18 / R + 0.08));
      D.etiquette(ctx, A.MOIS_COURT[m], X, Y, {taille: t, fond: false, couleur: C.texteDoux});
    }
    // sens de révolution
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 1.5;
    const [a1, b1] = ecran(V.mul(positionTerre(255), 0.9)), [a2, b2] = ecran(V.mul(positionTerre(275), 0.9));
    D.fleche(ctx, a1, b1, a2, b2, 8);

    const P = positionTerre(etat.n);
    const [ex, ey] = ecran(P);
    geo = {cx, cy, R, ex, ey, rE};
    const terre = () => {
      const s = vueOblique(V.norme(V.mul(P, -1)));
      D.sphere(ctx, ex, ey, rE, s, C.terreJour, C.terreNuit, 'rgba(255,255,255,0.6)');
      dessinerAxe(ctx, ex, ey, rE, vueOblique(axe()), 1.8, 'N');
    };
    if (P[0] < 0) terre();
    D.soleil(ctx, cx, cy, rS);
    if (P[0] >= 0) terre();
    const yS = cy + rS + 12, yT = ey + rE + 12;
    if (Math.abs(ex - cx) > 70 || Math.abs(yT - yS) > 18) D.etiquette(ctx, 'Soleil', cx, yS, {taille: 12, couleur: '#ffe39a'});
    D.etiquette(ctx, 'Terre', ex, yT, {taille: 12});
    D.titreVue(ctx, v, 'La Terre autour du Soleil');
    D.etiquette(ctx, etat.incline ? 'Axe de la Terre incliné de 23,5°' : 'Hypothèse : axe non incliné (0°)', v.x + 8, v.y + v.h - 14,
      {taille: 12, align: 'left', couleur: etat.incline ? C.texteDoux : '#ffd27a'});
    D.pasALEchelle(ctx, v);
  }

  // Axe de rotation (a : direction du pôle Nord en coordonnées de vue), partie cachée non dessinée
  function dessinerAxe(ctx, x, y, r, a, long, etiquettes) {
    const l = Math.hypot(a[0], a[1]);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, r / 12);
    for (const k of [1, -1]) {
      const tip = [x + k * a[0] * r * long, y - k * a[1] * r * long];
      const devant = k * a[2] >= 0;
      const depart = devant ? [x, y] : (l * long > 1 ? [x + k * a[0] / l * r, y - k * a[1] / l * r] : null);
      if (depart) { ctx.beginPath(); ctx.moveTo(depart[0], depart[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke(); }
      if (etiquettes && (k > 0 || etiquettes !== 'N')) D.etiquette(ctx, k > 0 ? 'N' : 'S', tip[0] + k * a[0] / (l || 1) * 10, tip[1] - k * a[1] / (l || 1) * 10, {taille: etiquettes === 'N' ? 11 : 13, gras: true});
    }
  }

  function dessinerCote(ctx, v) {
    D.cadreVue(ctx, v, '#0e1730');
    const r = Math.max(26, Math.min(v.w * 0.25, (v.h - 70) * 0.36, (v.w - 150) / 2.3));
    const cx = v.x + Math.min(v.w * 0.5, v.w - r - 100), cy = v.y + v.h / 2 + 10;
    const P = positionTerre(etat.n), u = V.norme(P);
    const bx = u, by = [0, 0, 1], bz = V.croix(bx, by);
    const vue = W => [V.dot(W, bx), V.dot(W, by), V.dot(W, bz)];
    // plan de l'orbite
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(v.x + 6, cy); ctx.lineTo(v.x + v.w - 6, cy); ctx.stroke(); ctx.setLineDash([]);
    if (r >= 40) D.etiquette(ctx, 'plan de l’orbite', v.x + 8, cy + 12, {taille: 11, align: 'left', fond: false, couleur: C.texteDoux});
    // lumière du Soleil
    ctx.strokeStyle = C.rayon; ctx.lineWidth = 1.4;
    for (let k = -2; k <= 2; k++) {
      const y = cy + k * r * 0.45, dy = Math.abs(y - cy);
      const x1 = cx - Math.sqrt(Math.max(0, r * r - dy * dy)) - 4;
      if (x1 - v.x > 40) D.fleche(ctx, v.x + 8, y, x1, y, 7);
    }
    if (cy - r - 18 > v.y + 34) D.etiquette(ctx, 'Soleil (à gauche, loin)', v.x + 8, cy - r - 18, {taille: 11, align: 'left', couleur: '#ffe39a'});
    // Terre
    D.sphere(ctx, cx, cy, r, [-1, 0, 0], C.terreJour, C.terreNuit);
    const a = axe(), e1 = V.norme(V.croix(a, [1, 0, 0])), e2 = V.croix(a, e1);
    const parallele = lat => {
      const pts = [], c = Math.cos(lat * A.RAD), s = Math.sin(lat * A.RAD);
      for (let k = 0; k <= 96; k++) {
        const t = k / 96 * 2 * Math.PI;
        pts.push(vue(V.add(V.mul(V.add(V.mul(e1, Math.cos(t)), V.mul(e2, Math.sin(t))), c), V.mul(a, s))));
      }
      return pts;
    };
    const lignes = [[0, r >= 45 ? 'équateur' : '', 'rgba(255,255,255,0.75)', [5, 4]], [SD.lat, 'Saint-Denis', C.stdenis, []], [PA.lat, 'Paris', C.paris, []]];
    const t = Math.max(11, Math.min(13, r / 6));
    for (const [lat, nom, coul, tirets] of lignes) {
      const pts = parallele(lat);
      ctx.strokeStyle = coul; ctx.lineWidth = 2; ctx.setLineDash(tirets);
      D.courbe(ctx, cx, cy, r, pts); ctx.stroke(); ctx.setLineDash([]);
      let m = null;
      for (const p of pts) if (p[2] >= -0.02 && (!m || p[0] > m[0])) m = p;
      if (m && nom) {
        const X = cx + r * m[0], Y = cy - r * m[1];
        ctx.strokeStyle = coul; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(cx + r + 10, Y); ctx.stroke();
        D.etiquette(ctx, nom, cx + r + 13, Y, {taille: t, align: 'left', couleur: coul === C.paris ? '#ffd0d0' : coul === C.stdenis ? '#b9ffe6' : C.texte});
      }
    }
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
    dessinerAxe(ctx, cx, cy, r, vue(a), 1.3, true);
    D.titreVue(ctx, v, 'La Terre vue de côté');
    D.etiquette(ctx, A.texteDate(etat.n), v.x + 8, v.y + v.h - 14, {taille: 13, align: 'left', gras: true});
    D.pasALEchelle(ctx, v);
  }

  function dessiner(ctx, w, h) {
    const [a, b] = dispositions(w, h);
    dessinerOrbite(ctx, a);
    dessinerCote(ctx, b);
  }

  function texteHauteur(m) {
    return A.virgule(m.hauteur, 1) + '°' + (m.cote === 'zenith' ? ' (à la verticale)' : m.cote === 'nord' ? ' (vers le nord)' : ' (vers le sud)');
  }
  function majPanneau() {
    const n = Math.floor(etat.n);
    ecrire($('sa-date-txt'), A.texteDate(n));
    if (+$('sa-date').value !== n) $('sa-date').value = String(n);
    $('sa-date').setAttribute('aria-valuetext', A.texteDate(n));
    for (const [lieu, k] of [[SD, 'sd'], [PA, 'pa']]) {
      const m = A.mesuresLieu(lieu, n, etat.incline);
      const el = $('sa-s-' + k);
      if (el.textContent !== m.saison) {
        if (m.evenement) {
          el.textContent = '';
          const petit = document.createElement('small');
          petit.className = 'evenement';
          petit.textContent = m.evenement + ' :';
          el.append(petit, ' ' + m.saison.slice(m.evenement.length + 3));
        } else el.textContent = m.saison;
      }
      ecrire($('sa-d-' + k), A.dureeTexte(m.duree));
      ecrire($('sa-h-' + k), texteHauteur(m));
    }
    ecrire($('sa-distance'), A.virgule(A.soleil(n).km / 1e6, 1) + ' millions de km');
  }

  function changerDate(n) { etat.n = 1 + A.mod(n - 1, 365); }
  function dateDepuisPointeur(x, y) {
    const Py = (x - geo.cx) / geo.R, Px = (y - geo.cy) / (geo.R * Math.sin(ELEV));
    const L = A.mod(Math.atan2(Py, Px) / A.RAD - 180, 360);
    let best = 1, bd = 1e9;
    for (let n = 1; n <= 365; n++) { const d = Math.abs(A.mod(LS[n] - L + 180, 360) - 180); if (d < bd) { bd = d; best = n; } }
    const d1 = A.mod(L - LS[best] + 180, 360) - 180, pente = A.mod(LS[best + 1] - LS[best] + 180, 360) - 180;
    changerDate(best + Math.max(-0.5, Math.min(0.99, d1 / pente)));
  }

  STL.parties.saisons = {
    titre: 'Saisons', etat,
    init(a) {
      app = a;
      $('sa-date').addEventListener('input', e => { changerDate(+e.target.value); app.demanderDessin(); });
      $('sa-vitesse').addEventListener('change', e => { etat.vitesse = +e.target.value; });
      $('sa-hypothese').addEventListener('change', e => { etat.incline = !e.target.checked; app.demanderDessin(); });
      // Raccourcis : jours des équinoxes et des solstices calculés par le modèle (année 2027, TU)
      document.querySelectorAll('#p-saisons [data-evenement]').forEach(b => {
        const k = +b.dataset.evenement, n = A.jourEvenement(k);
        b.textContent = A.texteDate(n, true);
        b.setAttribute('aria-label', A.texteDate(n) + ' (' + A.EVENEMENTS[k] + ')');
        b.title = A.EVENEMENTS[k];
        b.addEventListener('click', () => {
          if (app.lecture) app.mettreLecture(false);
          changerDate(n); app.demanderDessin();
        });
      });
    },
    avancer(dt) { changerDate(etat.n + dt * etat.vitesse); },
    pas(sens, grand) { changerDate(Math.floor(etat.n) + sens * (grand ? 10 : 1)); },
    dessiner, majPanneau,
    pointeurBas(x, y) {
      if (!geo) return false;
      const pres = Math.hypot(x - geo.ex, y - geo.ey) < Math.max(30, geo.rE * 2);
      const surOrbite = Math.abs(Math.hypot((x - geo.cx) / geo.R, (y - geo.cy) / (geo.R * Math.sin(ELEV))) - 1) < 0.2;
      if (!pres && !surOrbite) return false;
      glisse = true; dateDepuisPointeur(x, y);
      return true;
    },
    pointeurDeplace(x, y) { if (glisse) dateDepuisPointeur(x, y); },
    pointeurHaut() { glisse = false; },
    geo: () => geo,
    description() {
      const n = Math.floor(etat.n), m1 = A.mesuresLieu(SD, n, etat.incline), m2 = A.mesuresLieu(PA, n, etat.incline);
      return `La Terre sur son orbite autour du Soleil, le ${A.texteDate(n)}, axe ${etat.incline ? 'incliné de 23,5°' : 'non incliné (hypothèse)'}. ` +
        `Saint-Denis : ${m1.saison}, jour de ${A.dureeTexte(m1.duree)}, Soleil à ${A.virgule(m1.hauteur, 1)}° à midi. ` +
        `Paris : ${m2.saison}, jour de ${A.dureeTexte(m2.duree)}, Soleil à ${A.virgule(m2.hauteur, 1)}° à midi.`;
    },
    consignes: [
      'Appuie sur « Lecture » ou fais glisser la Terre sur son orbite. Observe la direction de l’axe de la Terre au fil de l’année.',
      'Avec les boutons de dates, place la Terre au solstice de juin (21 juin), puis au solstice de décembre (22 décembre) : dans la vue de côté, quel hémisphère est penché vers le Soleil ?',
      'À ces deux dates, relève pour Saint-Denis et pour Paris la durée du jour, la hauteur du Soleil à midi et la saison qui commence. Compare.',
      'Relève la distance Terre-Soleil début janvier et début juillet, et la saison de chaque ville à ces dates.',
      'Coche l’hypothèse « axe non incliné » et refais tes relevés. Rédige ta conclusion.'
    ],
    fiche: `<ul>
      <li>Position et distance du Soleil : formules approchées de l’U.S. Naval Observatory (précision meilleure que 0,01°), pour l’année 2027.</li>
      <li>Durée du jour : moment où le centre du Soleil passe à l’horizon, <strong>sans tenir compte de la réfraction</strong> par l’atmosphère (les éphémérides donnent quelques minutes de plus).</li>
      <li>Hauteur du Soleil à midi (heure solaire) : 90° − |latitude − déclinaison du Soleil|.</li>
      <li>Latitudes : Saint-Denis 20,9° S, Paris 48,9° N.</li>
      <li>Saison : saison astronomique du calendrier, donnée d’après la date seulement. Le jour d’un équinoxe ou d’un solstice, l’app l’indique (par exemple « solstice de juin : début de l’hiver » à Saint-Denis) ; la nouvelle saison est affichée à partir du lendemain.</li>
      <li>Les dates sont celles de 2027 en temps universel (TU). Selon l’année et l’heure locale (La Réunion : TU + 4 h ; Paris : TU + 1 h ou + 2 h), un équinoxe ou un solstice peut tomber un jour plus tôt ou plus tard (par exemple le 21 ou le 22 décembre).</li>
      <li>L’orbite est dessinée avec sa vraie forme (presque un cercle), mais les tailles de la Terre et du Soleil ne sont pas à l’échelle de la distance.</li>
    </ul>`
  };
})();
