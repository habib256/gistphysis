// astro.js — calculs astronomiques de « Soleil, Terre, Lune » (aucune dépendance).
// Chargé dans la page (window.Astro) et, pour les tests, dans Node (module.exports).
//
// Position du Soleil : algorithme « Approximate Solar Coordinates » de l'U.S. Naval
// Observatory (Astronomical Almanac, basse précision, environ 0,01° de 1950 à 2050) :
//   d = JD − 2451545,0 ; g = 357,529 + 0,98560028 d ; q = 280,459 + 0,98564736 d
//   L = q + 1,915 sin g + 0,020 sin 2g (longitude écliptique du Soleil)
//   R = 1,00014 − 0,01671 cos g − 0,00014 cos 2g (distance Terre-Soleil en UA)
//   déclinaison : sin δ = sin ε · sin L (ε = inclinaison de l'axe ; ε = 0 pour l'hypothèse)
// Durée du jour : cos H0 = −tan φ · tan δ, durée = 2 H0 / 15 (heures), centre du Soleil à
// l'horizon, SANS réfraction ni diamètre apparent du Soleil (les éphémérides ajoutent ~6 min).
// Hauteur du Soleil à midi (solaire) : 90° − |φ − δ|.
(function (racine) {
  'use strict';
  const RAD = Math.PI / 180;
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const JD_1ER_JANVIER = 2461406.5;   // 1er janvier 2027 à 0 h TU (année de référence non bissextile)
  const INCLINAISON_AXE = 23.44;      // degrés (le cours arrondit à 23,5°)
  const UA_KM = 149597870.7;
  const LUNAISON = 29.530589;         // jours (de nouvelle Lune à nouvelle Lune)
  const ANNEE_ECLIPSES = 346.62;      // jours : retour du Soleil au même nœud de l'orbite lunaire
  const INCLINAISON_LUNE = 5.145;     // degrés
  // Unités « rayon terrestre » (R⊕ = 6371 km) pour les ombres
  const RT_KM = 6371;
  const R_SOLEIL = 696000 / RT_KM, R_LUNE = 1737.4 / RT_KM;
  const D_SOLEIL = UA_KM / RT_KM, D_LUNE = 384400 / RT_KM;

  const LIEUX = {
    stdenis: {nom: 'Saint-Denis', lat: -20.9, lon: 55.45},
    paris: {nom: 'Paris', lat: 48.9, lon: 2.35}
  };

  const mod = (a, n) => ((a % n) + n) % n;

  // n : jour de l'année, de 1 (1er janvier) à 365 (31 décembre) ; partie décimale acceptée
  function dateDuJour(n) {
    let j = Math.floor(mod(n - 1, 365));
    let m = 0;
    while (j >= JOURS_MOIS[m]) { j -= JOURS_MOIS[m]; m++; }
    return {mois: m, jour: j + 1};
  }
  function jourDeDate(mois, jour) {
    let n = jour;
    for (let m = 0; m < mois; m++) n += JOURS_MOIS[m];
    return n;
  }
  function texteDate(n, court) {
    const {mois, jour} = dateDuJour(n);
    return (jour === 1 ? '1er' : String(jour)) + ' ' + (court ? MOIS_COURT : MOIS)[mois];
  }

  // Soleil à midi TU du jour n (n décimal accepté pour l'animation)
  function soleil(n, inclinaison = INCLINAISON_AXE) {
    const d = JD_1ER_JANVIER + (n - 1) + 0.5 - 2451545.0;
    const g = (357.529 + 0.98560028 * d) * RAD;
    const q = 280.459 + 0.98564736 * d;
    const L = mod(q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g), 360);
    const r = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
    const delta = Math.asin(Math.sin(inclinaison * RAD) * Math.sin(L * RAD)) / RAD;
    return {L, r, km: r * UA_KM, delta};
  }

  // Durée du jour (heures) à la latitude lat (degrés) quand la déclinaison vaut delta (degrés)
  function dureeDuJour(lat, delta) {
    const c = -Math.tan(lat * RAD) * Math.tan(delta * RAD);
    if (c >= 1) return 0;
    if (c <= -1) return 24;
    return 2 * Math.acos(c) / RAD / 15;
  }
  const hauteurMidi = (lat, delta) => 90 - Math.abs(lat - delta);

  // Saison du calendrier (astronomique) d'après la longitude du Soleil
  function saison(L, lat) {
    const k = Math.floor(mod(L, 360) / 90);
    const nord = ['printemps', 'été', 'automne', 'hiver'];
    return lat >= 0 ? nord[k] : nord[(k + 2) % 4];
  }

  // Équinoxes et solstices : jour (de 0 h à 24 h TU) où la longitude du Soleil franchit k × 90°.
  // Ce jour-là, on affiche l'événement (« solstice de juin : début de l’hiver ») ; la nouvelle
  // saison est affichée à partir du lendemain. Sans cela, le Soleil étant calculé à midi TU, le
  // 21 juin aurait encore la saison précédente.
  const EVENEMENTS = ['équinoxe de mars', 'solstice de juin', 'équinoxe de septembre', 'solstice de décembre'];
  const DEBUT = {printemps: 'du printemps', 'été': 'de l’été', automne: 'de l’automne', hiver: 'de l’hiver'};
  function evenementDuJour(n) {
    const j = Math.floor(n), a = soleil(j - 0.5).L, b = soleil(j + 0.5).L;
    for (let k = 0; k < 4; k++) if (mod(k * 90 - a, 360) < mod(b - a, 360)) return k;
    return -1;
  }
  function jourEvenement(k) {
    for (let n = 1; n <= 365; n++) if (evenementDuJour(n) === k) return n;
    return -1;
  }
  function saisonDuJour(n, lat) {
    const k = evenementDuJour(n);
    if (k >= 0) {
      const s = saison(k * 90 + 1, lat);
      return {saison: s, evenement: EVENEMENTS[k], texte: EVENEMENTS[k] + ' : début ' + DEBUT[s]};
    }
    const s = saison(soleil(Math.floor(n)).L, lat);
    return {saison: s, evenement: null, texte: s};
  }

  // Mesures de la partie « Saisons » pour un lieu
  function mesuresLieu(lieu, n, incline = true) {
    const s = soleil(Math.floor(n), incline ? INCLINAISON_AXE : 0);
    const sj = saisonDuJour(n, lieu.lat);
    return {
      duree: dureeDuJour(lieu.lat, s.delta),
      hauteur: hauteurMidi(lieu.lat, s.delta),
      cote: Math.abs(lieu.lat - s.delta) < 0.25 ? 'zenith' : (s.delta > lieu.lat ? 'nord' : 'sud'),
      saison: sj.texte, saisonSeule: sj.saison, evenement: sj.evenement,
      delta: s.delta
    };
  }

  // ---------------------------------------------------------------- Lune
  // alpha : angle Soleil-Terre-Lune compté dans le sens de la révolution (0 = nouvelle Lune)
  const fractionEclairee = alpha => (1 - Math.cos(alpha * RAD)) / 2;
  function nomPhase(alpha) {
    const a = mod(alpha, 360), tol = 7;
    if (a < tol || a > 360 - tol) return 'nouvelle Lune';
    if (Math.abs(a - 90) <= tol) return 'premier quartier';
    if (Math.abs(a - 180) <= tol) return 'pleine Lune';
    if (Math.abs(a - 270) <= tol) return 'dernier quartier';
    if (a < 90) return 'premier croissant';
    if (a < 180) return 'gibbeuse croissante';
    if (a < 270) return 'gibbeuse décroissante';
    return 'dernier croissant';
  }
  // Pour une phase intermédiaire : entre quelles phases du cours (repères principaux) se trouve-t-elle ?
  const PRINCIPALES = ['la nouvelle Lune', 'le premier quartier', 'la pleine Lune', 'le dernier quartier'];
  function reperePhase(alpha) {
    const a = mod(alpha, 360);
    if (['nouvelle Lune', 'premier quartier', 'pleine Lune', 'dernier quartier'].includes(nomPhase(a))) return '';
    const k = Math.floor(a / 90);
    return 'entre ' + PRINCIPALES[k] + ' et ' + PRINCIPALES[(k + 1) % 4];
  }
  function evolution(alpha) {
    const a = mod(alpha, 360);
    if (a < 0.5 || a > 359.5 || Math.abs(a - 180) < 0.5) return '—';
    return a < 180 ? 'croissante' : 'décroissante';
  }

  // Repère « Terre » (unité R⊕) : x vers l'opposé du Soleil, z vers le nord de l'écliptique,
  // y complète (vu du nord : x à droite, y en haut, rotations dans le sens inverse des aiguilles).
  // nu : direction du nœud ascendant de l'orbite lunaire dans ce repère (degrés).
  function positionLune(alpha, nu, inclinaison = INCLINAISON_LUNE) {
    const a = (180 + alpha) * RAD;
    const beta = Math.atan(Math.tan(inclinaison * RAD) * Math.sin(a - nu * RAD));
    return {x: D_LUNE * Math.cos(beta) * Math.cos(a), y: D_LUNE * Math.cos(beta) * Math.sin(a), z: D_LUNE * Math.sin(beta), beta: beta / RAD};
  }
  // Rayons de l'ombre et de la pénombre de la Terre à la distance x derrière elle (R⊕)
  const ombreTerre = x => ({ombre: 1 - x * (R_SOLEIL - 1) / D_SOLEIL, penombre: 1 + x * (R_SOLEIL + 1) / D_SOLEIL});
  // Ombre de la Lune à la distance s derrière elle
  const ombreLune = (s, dSL) => ({ombre: R_LUNE - s * (R_SOLEIL - R_LUNE) / dSL, penombre: R_LUNE + s * (R_SOLEIL + R_LUNE) / dSL});

  function eclipse(M) {
    if (M.x > 0) {
      const q = Math.hypot(M.y, M.z), o = ombreTerre(M.x);
      if (q + R_LUNE <= o.ombre) return {type: 'lune', degre: 'totale', q};
      if (q - R_LUNE < o.ombre) return {type: 'lune', degre: 'partielle', q};
      if (q - R_LUNE < o.penombre) return {type: 'lune', degre: 'penombre', q};
      return {type: null, q};
    }
    const p = Math.hypot(M.y, M.z) * D_SOLEIL / (D_SOLEIL + M.x);
    const o = ombreLune(-M.x, D_SOLEIL + M.x);
    if (p <= 1) return {type: 'soleil', degre: 'centrale', q: p};
    if (p < 1 + o.penombre) return {type: 'soleil', degre: 'partielle', q: p};
    return {type: null, q: p};
  }

  // ---------------------------------------------------------------- textes
  const virgule = (x, k = 1) => x.toFixed(k).replace('.', ',').replace('-', '−');
  function heureTexte(h) {
    let mn = Math.round(mod(h, 24) * 60);
    if (mn >= 1440) mn -= 1440;
    return Math.floor(mn / 60) + ' h ' + String(mn % 60).padStart(2, '0');
  }
  function dureeTexte(h) {
    const mn = Math.round(h * 60);
    return Math.floor(mn / 60) + ' h ' + String(mn % 60).padStart(2, '0');
  }
  const milliers = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');   // espace insécable (U+202F pourrait manquer dans les polices d'Android 8)

  const Astro = {
    RAD, MOIS, MOIS_COURT, JOURS_MOIS, INCLINAISON_AXE, UA_KM, LUNAISON, ANNEE_ECLIPSES, INCLINAISON_LUNE,
    RT_KM, R_SOLEIL, R_LUNE, D_SOLEIL, D_LUNE, LIEUX,
    mod, dateDuJour, jourDeDate, texteDate, soleil, dureeDuJour, hauteurMidi, saison, EVENEMENTS, evenementDuJour, jourEvenement, saisonDuJour, mesuresLieu,
    fractionEclairee, nomPhase, reperePhase, evolution, positionLune, ombreTerre, ombreLune, eclipse,
    virgule, heureTexte, dureeTexte, milliers
  };
  if (typeof module === 'object' && module.exports) module.exports = Astro;
  else racine.Astro = Astro;
})(typeof window !== 'undefined' ? window : globalThis);
