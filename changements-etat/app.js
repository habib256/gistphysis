// Les changements d'état de l'eau — interface, affichage, saisie au doigt et à la souris
// Version 1.1 — 20/11/2026
// M. VERHILLE Arnaud
// Licence GNU GPL v3 (voir README.md)
//
// Trois parties, ouvrables par l'adresse : #bac-a-sable (par défaut), #cycle, #fusion.
// Rien n'est envoyé, aucune ressource n'est chargée depuis Internet.
// La vapeur d'eau n'est jamais dessinée (sauf l'option « Montrer la vapeur », signalée) : une
// case d'air a la même couleur qu'elle contienne beaucoup ou peu de vapeur. Ce qui se voit dans
// l'air, ce sont les gouttelettes (nuage, brume, buée), le givre et la pluie.

'use strict';

(function () {
  const CE = window.ChangementsEtat, SC = window.ScenesEau;
  const {AIR, EAU, GLACE, VERRE, SOL, ROCHE, CHAUD, FROID, GRAIN, L_F} = CE;
  const $ = id => document.getElementById(id);

  const PARTIES = ['bac-a-sable', 'cycle', 'fusion'];
  const CASES_BAC = 15000;                       // taille de la grille du bac à sable
  const PAS_PAR_IMAGE = {'bac-a-sable': 1, cycle: 2, fusion: 4};
  const VITESSES = [0.25, 0.5, 1, 2, 4];
  const BUDGET_MS = 14;                          // au-delà, la simulation ralentit au lieu de figer l'écran
  const SOLEIL = 3;                              // énergie du Soleil par pas et par colonne d'océan
  const RAYONS_PINCEAU = [1, 2.5, 4.5], NOMS_PINCEAU = ['petit', 'moyen', 'grand'];
  const MAX_THERMOS = {'bac-a-sable': 4, cycle: 3, fusion: 1};
  const AIDE_OUTILS = {
    glace: 'Dessine un bloc de glace à −10 °C.',
    neige: 'Fais tomber de la neige : des grains de glace à −5 °C.',
    eau: 'Verse de l’eau liquide à 20 °C.',
    verre: 'Construis une paroi ou un récipient en verre.',
    chaud: 'Pose une plaque chauffante (170 °C).',
    froid: 'Pose une plaque froide (−25 °C).',
    thermometre: 'Touche la scène pour poser un thermomètre (4 au plus). Un thermomètre se déplace en le faisant glisser, quel que soit l’outil (sauf la gomme, qui l’efface).',
    gomme: 'Efface ce que tu touches : eau, glace, parois, plaques, brume, thermomètres.',
  };

  const etat = {
    partie: null, mondes: {}, monde: null, thermometres: [], infos: null,
    enMarche: true, vitesse: 1, outil: 'eau', pinceau: 1,
    vapeur: false, repartition: false, noms: false, soleil: true, vent: true, thermoCycle: false,
    tAir: 20, tMer: 20,
    fusion: {masse: 150, niveau: 3, agitation: true, statut: 'pret', mesures: [], prochaine: 0, t0: 0},
    dansLEcran: true, image: 0, reste: 0,
  };

  // ---- Nombres à la française ----------------------------------------------
  function nombre(x, dec = 1) {
    let r = (Math.round(x * Math.pow(10, dec)) / Math.pow(10, dec));
    if (Object.is(r, -0) || Math.abs(r) < Math.pow(10, -dec) / 2) r = 0;
    let s = Math.abs(r).toFixed(dec);
    const [ent, frac] = s.split('.');
    const groupe = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    s = frac ? groupe + ',' + frac : groupe;
    return (r < 0 ? '−' : '') + s;
  }
  const nombreCsv = (x, dec) => (Math.abs(x) < Math.pow(10, -dec) / 2 ? 0 : x).toFixed(dec).replace('.', ',');

  // ---- Création des scènes ---------------------------------------------------
  function dimensionsBac() {
    const z = $('zone-scene');
    const w = Math.max(200, z.clientWidth), h = Math.max(150, z.clientHeight);
    const rapport = Math.min(2.4, Math.max(0.6, w / h));
    const nx = Math.round(Math.sqrt(CASES_BAC * rapport));
    return [nx, Math.round(CASES_BAC / nx)];
  }

  function creerScene(partie, {vide = false} = {}) {
    let res;
    if (partie === 'bac-a-sable') {
      const [nx, ny] = dimensionsBac();
      res = SC.bacASable(nx, ny, etat.tAir, {vide});
    } else if (partie === 'cycle') {
      res = SC.cycle(etat.tMer);
      res.infos.vent = res.monde.r.vent;
      res.monde.r.soleil = etat.soleil ? SOLEIL : 0;
      if (!etat.vent) res.monde.r.vent = null;
    } else {
      const f = etat.fusion;
      res = SC.fusion(f.masse, f.niveau, f.agitation);
      f.statut = 'pret'; f.mesures = []; f.prochaine = 0; f.t0 = 0;
      viderTableau();
      courbeARefaire = true;
    }
    const scene = {monde: res.monde, thermometres: res.thermometres, infos: res.infos || {}};
    etat.mondes[partie] = scene;
    return scene;
  }

  function activer(scene) {
    etat.monde = scene.monde;
    etat.thermometres = scene.thermometres;
    etat.infos = scene.infos;
    preparerAffichage();
  }

  // ---- Changer de partie -------------------------------------------------------
  function partieDuHash() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    return PARTIES.includes(h) ? h : 'bac-a-sable';
  }

  function choisirPartie(partie, majHash = true) {
    if (!PARTIES.includes(partie)) partie = 'bac-a-sable';
    if (majHash && location.hash !== '#' + partie) {
      try { history.replaceState(null, '', '#' + partie); } catch (e) { /* adresse inchangée */ }
    }
    if (etat.partie === partie && etat.monde) return;
    etat.partie = partie;
    $('app').dataset.partie = partie;
    document.querySelectorAll('#parties button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.partie === partie)));
    ajusterToile();   // la zone de la scène change de taille selon la partie
    activer(etat.mondes[partie] || creerScene(partie));
    const libelles = {
      'bac-a-sable': 'Bac à sable : une pièce vue en coupe, avec de l’eau sous ses différents états, que l’on peut modifier au doigt.',
      cycle: 'Le cycle de l’eau à La Réunion, en coupe : l’océan Indien, le Soleil, l’île jusqu’au Piton des Neiges.',
      fusion: 'Expérience : un bécher de glace pilée sur une plaque chauffante, avec un thermomètre.',
    };
    toile.setAttribute('aria-label', libelles[partie]);
    majBoutons();
    majPanneau();
    dessiner();
  }

  // ---- Affichage ----------------------------------------------------------------
  const toile = $('scene'), ctx = toile.getContext('2d');
  const hors = document.createElement('canvas'), ctxHors = hors.getContext('2d');
  // Image intermédiaire agrandie 2 fois sans lissage, puis lissée à l'écran : l'eau paraît continue,
  // les parois restent nettes.
  const double = document.createElement('canvas'), ctxDouble = double.getContext('2d');
  let plaques = [], plaquesPas = -1;
  let courbeARefaire = true;   // la courbe n'est redessinée qu'après une nouvelle mesure ou un changement de taille
  let image = null, pixels = null, dpr = 1;
  let vue = {s: 1, x: 0, y: 0};
  let fond = null, bruit = null, souterrain = null;
  let placees = [];   // étiquettes déjà placées dans l'image en cours (pour éviter les chevauchements)

  // Le sol perméable change franchement de couleur avec l'eau qu'il contient : sec (clair), humide,
  // saturé (nappe phréatique : foncé, teinté de bleu). L'eau libre (rivière, cavité) est bleu vif.
  const COUL = {
    eau: [44, 122, 212], glace: [196, 230, 252], grain: [230, 243, 255], verre: [150, 190, 210],
    solSec: [226, 196, 140], solHumide: [118, 70, 34], solSature: [56, 46, 82], roche: [92, 78, 66],
    rocheVolcanique: [132, 128, 124], grotte: [26, 22, 20], paillasse: [118, 104, 90],
    froid: [104, 132, 158], gouttelettes: [242, 246, 250], givre: [250, 253, 255], pluie: [12, 46, 128],
    vapeur: [196, 124, 255], glaceTerre: [206, 222, 236],
  };

  function preparerAffichage() {
    const {nx, ny, n} = etat.monde;
    hors.width = nx; hors.height = ny;
    double.width = 2 * nx; double.height = 2 * ny;
    plaquesPas = -1;
    image = ctxHors.createImageData(nx, ny);
    pixels = new Uint32Array(image.data.buffer);
    fond = new Float32Array(ny * 3);
    for (let y = 0; y < ny; y++) {
      let c;
      if (etat.partie === 'cycle') {
        const u = Math.min(1, y / etat.infos.ySea);
        c = [72 + 100 * u, 130 + 82 * u, 192 + 48 * u];
      } else if (etat.partie === 'fusion') c = [40, 50, 62];
      else c = [30, 42, 54];
      fond[3 * y] = c[0]; fond[3 * y + 1] = c[1]; fond[3 * y + 2] = c[2];
    }
    // dans la coupe du cycle : l'air sous la surface (cavité, galerie) est dans le noir
    souterrain = new Uint8Array(n);
    if (etat.partie === 'cycle') for (let i = 0; i < n; i++) if (((i / nx) | 0) > etat.infos.haut[i % nx]) souterrain[i] = 1;
    bruit = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let a = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
      a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
      bruit[i] = ((a ^ (a >>> 16)) >>> 0) / 4294967296 * 2 - 1;
    }
    calculerVue();
  }

  function ajusterToile() {
    const z = $('zone-scene');
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(z.clientWidth * dpr)), h = Math.max(1, Math.round(z.clientHeight * dpr));
    if (toile.width !== w || toile.height !== h) { toile.width = w; toile.height = h; }
    const courbe = $('courbe');
    const cw = Math.max(1, Math.round(courbe.clientWidth * dpr)), ch = Math.max(1, Math.round(courbe.clientHeight * dpr));
    if (courbe.width !== cw || courbe.height !== ch) { courbe.width = cw; courbe.height = ch; }
    courbeARefaire = true;
    if (etat.monde) calculerVue();
  }

  function calculerVue() {
    const {nx, ny} = etat.monde;
    const w = toile.width / dpr, h = toile.height / dpr;
    const s = Math.min(w / nx, h / ny);
    vue = {s, x: (w - nx * s) / 2, y: (h - ny * s) / 2};
  }

  // Niveau de chaque bassin de l'océan (ligne médiane du haut de l'eau), pour chaque colonne de mer
  function niveauxMer(monde) {
    const {nx, ny, typ} = monde, oc = monde.r.ocean, niv = new Int16Array(nx).fill(-1);
    for (const b of monde.r.mers || []) {
      const ys = [];
      for (let x = b.x0; x <= b.x1; x++) { let y = 0; while (y < ny && !(oc[y * nx + x] && typ[y * nx + x] === EAU)) y++; ys.push(y); }
      ys.sort((a, c) => a - c);
      const med = ys[ys.length >> 1];
      for (let x = b.x0; x <= b.x1; x++) niv[x] = med;
    }
    return niv;
  }

  // Couleur de chaque case dans l'image (une case = un pixel, agrandi ensuite avec lissage)
  function rendreGrille() {
    const monde = etat.monde, {nx, ny, typ, drap, m, h, T, v, d, c, p} = monde;
    const montrerVapeur = etat.vapeur, cycle = etat.partie === 'cycle', fusion = etat.partie === 'fusion';
    const capSol = monde.r.capaciteSol, plein = 0.95 * capSol, ySea = cycle ? etat.infos.ySea : 0;
    const niveauMer = cycle ? niveauxMer(monde) : null;
    const E = COUL.eau, G = COUL.glace, GR = COUL.grain;
    for (let y = 0; y < ny; y++) {
      const fr = fond[3 * y], fg = fond[3 * y + 1], fb = fond[3 * y + 2];
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x, t = typ[i];
        let r, g, b, a;
        if (t === AIR) {
          if (souterrain[i]) { r = COUL.grotte[0]; g = COUL.grotte[1]; b = COUL.grotte[2]; }
          else { r = fr; g = fg; b = fb; }
          if (montrerVapeur && v[i] > 0) {
            a = 0.6 * Math.sqrt(Math.min(1, v[i] / 0.05));
            r += (COUL.vapeur[0] - r) * a; g += (COUL.vapeur[1] - g) * a; b += (COUL.vapeur[2] - b) * a;
          }
          if (d[i] > 0) {
            // (cycle : le nuage est surtout dessiné par-dessus, flou : voir dessinerNuages)
            a = cycle ? 0.35 * (1 - Math.exp(-d[i] / 0.0012)) : 0.97 * (1 - Math.exp(-d[i] / 0.0025));
            // cycle : un nuage épais (chargé de pluie) est gris, son bord est blanc
            const gris = cycle ? Math.min(0.55, d[i] / 0.012) : 0;
            const cr = COUL.gouttelettes[0] - 105 * gris, cg = COUL.gouttelettes[1] - 100 * gris, cb = COUL.gouttelettes[2] - 92 * gris;
            r += (cr - r) * a; g += (cg - g) * a; b += (cb - b) * a;
          }
          if (c[i] > 0) {
            a = Math.min(1, c[i] / 0.12);
            r += (COUL.givre[0] - r) * a; g += (COUL.givre[1] - g) * a; b += (COUL.givre[2] - b) * a;
          }
          if (p[i] > (souterrain[i] ? 0.004 : 0.00015)) {   // la pluie, par-dessus le nuage, d'un bleu foncé bien visible ;
            // dans la cavité, seulement de grosses gouttes, discrètes
            // (dans le cycle, la pluie qui tombe est surtout dessinée en traits, par-dessus : voir dessinerPluie)
            a = souterrain[i] ? Math.min(0.5, p[i] / 0.02) : cycle ? Math.min(0.35, p[i] / 0.006) : Math.min(0.95, 0.55 + p[i] / 0.003);
            r += (COUL.pluie[0] - r) * a; g += (COUL.pluie[1] - g) * a; b += (COUL.pluie[2] - b) * a;
          }
        } else if (t === EAU) {
          const k = 1 + 0.035 * bruit[i];
          r = E[0] * k; g = E[1] * k; b = E[2] * k;
          if (h[i] < L_F) {   // en train de geler
            a = 0.6 * (1 - Math.max(0, h[i]) / L_F);
            r += (G[0] - r) * a; g += (G[1] - g) * a; b += (G[2] - b) * a;
          }
          if (cycle && niveauMer && niveauMer[x] >= 0 && y < niveauMer[x] && monde.r.ocean[i]) {   // bosse sur la mer : discrète
            r = fr + (r - fr) * 0.35; g = fg + (g - fg) * 0.35; b = fb + (b - fb) * 0.35;
          } else if (m[i] < 0.98 && !(cycle && y <= ySea)) {  // petite quantité d'eau : plus transparente (pas un filet de rivière)
            a = 0.45 + 0.55 * Math.max(0, m[i]);
            r = fr + (r - fr) * a; g = fg + (g - fg) * a; b = fb + (b - fb) * a;
          }
        } else if (t === GLACE) {
          const base = (drap[i] & CE.GIVRE) ? COUL.givre : cycle ? COUL.glaceTerre : (drap[i] & GRAIN) ? GR : G;
          const k = 1 + ((drap[i] & GRAIN) ? 0.07 : 0.025) * bruit[i];
          r = base[0] * k; g = base[1] * k; b = Math.min(255, base[2] * k);
          if (h[i] > 0) {     // en train de fondre
            a = 0.55 * Math.min(1, h[i] / L_F);
            r += (E[0] - r) * a; g += (E[1] - g) * a; b += (E[2] - b) * a;
          }
          if (m[i] < 0.98) {
            a = 0.45 + 0.55 * Math.max(0, m[i]);
            r = fr + (r - fr) * a; g = fg + (g - fg) * a; b = fb + (b - fb) * a;
          }
        } else if (t === VERRE) { r = COUL.verre[0]; g = COUL.verre[1]; b = COUL.verre[2]; }
        else if (t === SOL && (drap[i] & CE.FISSURE)) {   // roche fissurée : de la roche, avec des fissures sombres
          const fissure = ((x * 5 + y * 3) % 7 === 0) || ((x + 2 * y) % 11 === 0);
          const k = (fissure ? 0.45 : 1) * (1 - 0.25 * Math.min(1, m[i] / capSol)) * (1 + 0.05 * bruit[i]);
          r = COUL.rocheVolcanique[0] * k; g = COUL.rocheVolcanique[1] * k; b = COUL.rocheVolcanique[2] * k;
        } else if (t === SOL) {
          if (m[i] > plein) {   // sol gorgé d'eau : le sol mouillé, foncé et bleuté, avec ses grains
            r = COUL.solSature[0]; g = COUL.solSature[1]; b = COUL.solSature[2];
            if (((x * 7 + y * 13) % 5) === 0) { r += 20; g += 16; b += 10; }   // grains plus clairs
          }
          else {
            a = Math.min(1, m[i] / plein);
            r = COUL.solSec[0] + (COUL.solHumide[0] - COUL.solSec[0]) * a;
            g = COUL.solSec[1] + (COUL.solHumide[1] - COUL.solSec[1]) * a;
            b = COUL.solSec[2] + (COUL.solHumide[2] - COUL.solSec[2]) * a;
          }
          const k = 1 + (m[i] > plein ? 0.16 : 0.08) * bruit[i]; r *= k; g *= k; b *= k;   // grain du sol, mouillé ou non
        } else if (t === ROCHE) {
          const base = fusion ? COUL.paillasse : cycle ? COUL.rocheVolcanique : COUL.roche, k = 1 + 0.05 * bruit[i];
          r = base[0] * k; g = base[1] * k; b = base[2] * k;
        } else if (t === CHAUD) {
          a = Math.min(1, Math.max(0, (T[i] - 20) / 180));
          const k = ((x + y) % 4 === 0) ? 0.72 : 1;   // rayures : un appareil, pas de la matière
          r = (92 + 163 * a) * k; g = (58 + 52 * a) * k; b = (48 - 8 * a) * k;
        } else {
          const k = ((x + y) % 4 === 0) ? 0.62 : 1;
          r = COUL.froid[0] * k; g = COUL.froid[1] * k; b = COUL.froid[2] * k;
        }
        pixels[i] = (255 << 24) | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
      }
    }
    ctxHors.putImageData(image, 0, 0);
  }

  function dessiner() {
    if (!etat.monde) return;
    rendreGrille();
    placees = [];
    const W = toile.width / dpr, H = toile.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, W, H);
    const {nx, ny} = etat.monde;
    ctxDouble.imageSmoothingEnabled = false;
    ctxDouble.drawImage(hors, 0, 0, nx, ny, 0, 0, 2 * nx, 2 * ny);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(double, 0, 0, 2 * nx, 2 * ny, vue.x, vue.y, nx * vue.s, ny * vue.s);
    dessinerThermometres();
    if (etat.partie === 'bac-a-sable') dessinerPlaques();
    if (etat.partie === 'cycle') dessinerCycle();
    if (etat.partie === 'fusion') dessinerFusion();
    if (etat.partie === 'fusion' && courbeARefaire) { courbeARefaire = false; dessinerCourbe(); }
  }

  const versEcran = (gx, gy) => [vue.x + gx * vue.s, vue.y + gy * vue.s];

  function etiquette(texte, x, y, {fond = 'rgba(10,14,20,.82)', couleur = '#fff', taille = 13, centre = true, facultative = false, decalageMax = 3} = {}) {
    ctx.font = `600 ${taille}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    const w = ctx.measureText(texte).width + 10, hh = taille + 7;
    const W = toile.width / dpr, H = toile.height / dpr;
    let x0 = centre ? x - w / 2 : x;
    x0 = Math.max(2, Math.min(W - w - 2, x0));
    // pas de chevauchement : on décale l'étiquette vers le bas puis vers le haut si la place est prise
    const yVoulu = y - hh / 2;
    let y0 = Math.max(2, Math.min(H - hh - 2, yVoulu)), trouve = false;
    const libre = yy => placees.every(r => x0 + w <= r.x || x0 >= r.x + r.w || yy + hh <= r.y || yy >= r.y + r.h);
    for (const k of [0, 1, -1, 2, -2, 3, -3]) {
      if (Math.abs(k) > decalageMax) continue;
      const yy = Math.max(2, Math.min(H - hh - 2, yVoulu + k * (hh + 2)));
      if (libre(yy)) { y0 = yy; trouve = true; break; }
    }
    if (!trouve && facultative) return null;   // pas de place : l'étiquette n'est pas affichée
    placees.push({x: x0 - 1, y: y0 - 1, w: w + 2, h: hh + 2});
    ctx.fillStyle = fond;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0, y0, w, hh, 6); else ctx.rect(x0, y0, w, hh);
    ctx.fill();
    ctx.fillStyle = couleur;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(texte, x0 + 5, y0 + hh / 2 + 0.5);
    return {x: x0, y: y0, w, h: hh};
  }

  function dessinerThermometres() {
    const monde = etat.monde;
    etat.thermometres.forEach((th, k) => {
      const [sx, sy] = versEcran(th.x, th.y);
      const haut = 38;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0b0f14'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - haut); ctx.stroke();
      ctx.strokeStyle = '#f4f7fa'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - haut); ctx.stroke();
      ctx.strokeStyle = '#d6332e'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - haut * 0.6); ctx.stroke();
      ctx.fillStyle = '#d6332e'; ctx.strokeStyle = '#0b0f14'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      placees.push({x: sx - 7, y: sy - haut - 2, w: 14, h: haut + 9});   // la tige : les noms l'évitent
      const T = monde.lireTemperature(th.x, th.y);
      const nom = etat.thermometres.length > 1 ? (k + 1) + ' : ' : '';
      // petite scène : la lecture à côté de la tige, pour ne pas cacher le haut du récipient
      if (vue.s < 3.5) etiquette(nom + nombre(T, 1) + ' °C', sx + 8, sy - haut * 0.55, {taille: 12, centre: false});
      else etiquette(nom + nombre(T, 1) + ' °C', sx, sy - haut - 12, {taille: 13});
    });
  }

  // Nom des plaques chaudes et froides (groupes de cases voisines), recalculé de temps en temps
  function dessinerPlaques() {
    const monde = etat.monde;
    if (plaquesPas < 0 || monde.pas - plaquesPas > 30 || geste) {
      plaquesPas = monde.pas;
      plaques = [];
      const {nx, ny, typ} = monde, vu = new Uint8Array(nx * ny), pile = [];
      for (let i0 = 0; i0 < nx * ny; i0++) {
        const t = typ[i0];
        if ((t !== CHAUD && t !== FROID) || vu[i0]) continue;
        let n = 0, sx = 0, ymin = Infinity, ymax = -Infinity, xmin = Infinity, xmax = -Infinity;
        pile.push(i0); vu[i0] = 1;
        while (pile.length) {
          const i = pile.pop(), x = i % nx, y = (i / nx) | 0;
          n++; sx += x; ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
          for (const j of [x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i - nx, i + nx]) {
            if (j >= 0 && j < nx * ny && !vu[j] && typ[j] === t) { vu[j] = 1; pile.push(j); }
          }
        }
        if (n >= 6) plaques.push({t, x: sx / n, ymin, ymax, xmin, xmax});
      }
    }
    for (const pl of plaques) {
      // à côté de la plaque (à droite, ou à gauche si elle touche le bord droit)
      const texte = pl.t === CHAUD ? 'Plaque chaude' : 'Plaque froide';
      ctx.font = '600 12px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
      const larg = ctx.measureText(texte).width + 10;
      const [xd, sy] = versEcran(pl.xmax + 1, (pl.ymin + pl.ymax + 1) / 2);
      const [xg] = versEcran(pl.xmin, 0);
      const aDroite = xd + 4 + larg < toile.width / dpr;
      etiquette(texte, aDroite ? xd + 4 : xg - 4 - larg, sy, {taille: 12, fond: 'rgba(10,14,20,.7)', centre: false, facultative: true, decalageMax: 2});
    }
  }

  // La plus grande zone d'un seul tenant (nuage, averse) : pour placer son nom au bon endroit
  // (masque calculé une fois, tableaux réutilisés : peu de calcul à chaque image)
  const groupes = {vu: null, pile: null, masque: null};
  function plusGrandGroupe(monde, dedans) {
    const {nx, ny} = monde, n = nx * ny;
    if (!groupes.vu || groupes.vu.length !== n) { groupes.vu = new Uint8Array(n); groupes.pile = new Int32Array(n); groupes.masque = new Uint8Array(n); }
    const vu = groupes.vu, pile = groupes.pile, M = groupes.masque;
    let nb = 0;
    for (let i = 0; i < n; i++) { M[i] = dedans(i) ? 1 : 0; vu[i] = 0; nb += M[i]; }
    let best = {n: 0, x: 0, y: 0};
    if (nb === 0) return best;
    for (let i0 = 0; i0 < n; i0++) {
      if (vu[i0] || !M[i0]) continue;
      let gn = 0, gx = 0, gy = 0, sp = 0;
      pile[sp++] = i0; vu[i0] = 1;
      while (sp > 0) {
        const i = pile[--sp], x = i % nx;
        gn++; gx += x; gy += (i - x) / nx;
        if (x > 0 && !vu[i - 1] && M[i - 1]) { vu[i - 1] = 1; pile[sp++] = i - 1; }
        if (x < nx - 1 && !vu[i + 1] && M[i + 1]) { vu[i + 1] = 1; pile[sp++] = i + 1; }
        if (i >= nx && !vu[i - nx] && M[i - nx]) { vu[i - nx] = 1; pile[sp++] = i - nx; }
        if (i + nx < n && !vu[i + nx] && M[i + nx]) { vu[i + nx] = 1; pile[sp++] = i + nx; }
      }
      if (gn > best.n) best = {n: gn, x: gx, y: gy};
    }
    return best;
  }

  // Les nuages : une image floue de la taille de la grille (une case = un pixel), agrandie avec
  // lissage par-dessus la scène (dessin seulement : le nuage reste là où sont les gouttelettes, mais il
  // a l'air d'un nuage et non d'une rangée de cases). L'image n'est recalculée que toutes les
  // 3 images affichées : peu de calcul, même avec beaucoup de nuages.
  const nuages = {toile: null, ctx: null, image: null, a: null, b: null, compte: 0};
  function dessinerNuages() {
    const monde = etat.monde, {nx, ny, typ, d} = monde, inf = etat.infos, n = nx * ny;
    if (!nuages.toile || nuages.toile.width !== nx || nuages.toile.height !== ny) {
      nuages.toile = document.createElement('canvas'); nuages.toile.width = nx; nuages.toile.height = ny;
      nuages.ctx = nuages.toile.getContext('2d');
      nuages.image = nuages.ctx.createImageData(nx, ny);
      nuages.a = new Float32Array(n); nuages.b = new Float32Array(n); nuages.g = new Float32Array(n);
      nuages.compte = 0;
    }
    if (nuages.compte++ % 3 === 0) {
      const A = nuages.a, B = nuages.b, Gr = nuages.g, px = nuages.image.data;
      for (let i = 0; i < n; i++) {
        const x = i % nx, y = (i / nx) | 0;
        const dd = typ[i] === AIR && y <= inf.haut[x] ? d[i] : 0;
        A[i] = dd < 0.0008 ? 0 : Math.min(0.8, 0.25 + dd / 0.004);
        Gr[i] = Math.min(1, dd / 0.012);
      }
      // deux passes de flou (moyenne 3 × 3) : le bord du nuage s'adoucit et déborde un peu
      for (let passe = 0; passe < 2; passe++) {
        const src = passe === 0 ? A : B, dst = passe === 0 ? B : A;
        for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
          let sum = 0, k = 0;
          for (let yy = y - 1; yy <= y + 1; yy++) { if (yy < 0 || yy >= ny) continue; for (let xx = x - 1; xx <= x + 1; xx++) { if (xx < 0 || xx >= nx) continue; sum += src[yy * nx + xx]; k++; } }
          dst[y * nx + x] = sum / k;
        }
      }
      for (let i = 0; i < n; i++) {
        const a = Math.min(0.85, 1.4 * A[i]), c = 248 - 70 * Gr[i];
        px[4 * i] = c; px[4 * i + 1] = c + 2; px[4 * i + 2] = Math.min(255, c + 5); px[4 * i + 3] = Math.round(255 * a);
      }
      nuages.ctx.putImageData(nuages.image, 0, 0);
    }
    const [x0, y0] = versEcran(0, 0), [x1, y1] = versEcran(nx, ny);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(nuages.toile, x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
  }

  // La pluie qui tombe : de petits traits verticaux bleu foncé, par-dessus les nuages
  function dessinerPluie() {
    const monde = etat.monde, {nx, ny, typ, p} = monde, s = vue.s;
    ctx.save();
    ctx.strokeStyle = 'rgb(10, 38, 115)'; ctx.lineWidth = Math.max(1.5, s * 0.3); ctx.lineCap = 'round';
    ctx.beginPath();
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = y * nx + x;
      if (typ[i] !== AIR || p[i] < 0.0004 || souterrain[i]) continue;
      const [sx, sy] = versEcran(x + 0.5, y + 0.5), lg = Math.max(5, s * 2.2) * Math.min(1, 0.5 + p[i] / 0.004);
      ctx.moveTo(sx, sy - lg); ctx.lineTo(sx - lg * 0.12, sy);
    }
    ctx.stroke();
    ctx.restore();
  }

  function dessinerCycle() {
    const inf = etat.infos, monde = etat.monde, s = vue.s;
    // Soleil
    if (etat.soleil) {
      const [cx, cy] = versEcran(monde.nx * 0.42, monde.ny * 0.12);
      const R = Math.max(10, s * 5);
      ctx.strokeStyle = '#e0a000'; ctx.lineWidth = Math.max(2, R * 0.12); ctx.lineCap = 'round';
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 1.35, cy + Math.sin(a) * R * 1.35);
        ctx.lineTo(cx + Math.cos(a) * R * 1.75, cy + Math.sin(a) * R * 1.75); ctx.stroke();
      }
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill();
      if (etat.noms) etiquette('Soleil', cx, cy + R * 2.2);
    }
    // Altitudes, sur le bord gauche
    ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    for (const alt of [0, 1000, 2000, 3000]) {
      const gy = inf.ySea + 1 - alt * (inf.ySea - inf.ySommet) / inf.altSommet;
      const [sx, sy] = versEcran(0, gy);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 8, sy); ctx.stroke();
      if (alt > 0) etiquette(nombre(alt, 0) + ' m', sx + 10, sy, {centre: false, taille: 11, fond: 'rgba(10,14,20,.55)'});
    }
    dessinerRivieres();
    dessinerNuages();
    dessinerPluie();
    // Haut de la nappe phréatique : un trait pointillé clair sur le sol saturé
    const {nx, ny, typ, d, p, m, drap} = monde;
    ctx.save();
    ctx.strokeStyle = 'rgba(170, 225, 255, .95)'; ctx.lineWidth = Math.max(1.5, s * 0.35); ctx.setLineDash([5, 4]);
    ctx.beginPath();
    let trace = false;
    for (let x = inf.xSourceVent + 1; x <= inf.xFinSol; x++) {
      const y = monde.niveauNappe(x);
      if (y < 0) { trace = false; continue; }
      const [sx0, sy] = versEcran(x, y), [sx1] = versEcran(x + 1, y);
      if (!trace) ctx.moveTo(sx0, sy); else ctx.lineTo(sx0, sy);
      ctx.lineTo(sx1, sy);
      trace = true;
    }
    ctx.stroke();
    ctx.restore();
    if (!etat.noms) return;
    // Ce qui se voit : nuage, pluie, rivières, sources, nappe, cavité, sol, roche, givre, glace
    const plein = 0.95 * monde.r.capaciteSol, rec = monde.infiltrationRecente, cav = inf.cavite;
    const groupe = () => ({n: 0, x: 0, y: 0, ajouter(xx, yy, w = 1) { this.n += w; this.x += xx * w; this.y += yy * w; }});
    const N = plusGrandGroupe(monde, i => typ[i] === AIR && d[i] > 0.0015 && !souterrain[i]);
    const P = plusGrandGroupe(monde, i => typ[i] === AIR && p[i] > 0.0005 && !souterrain[i]), RV = groupe(), RA = groupe(), NA = groupe(), CV = groupe(), GV = groupe(), GL = groupe(), IN = groupe(), FI = groupe();
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = y * nx + x, t = typ[i];
      if (t === AIR) {
      } else if (t === EAU) {
        if (x >= cav.x0 && x <= cav.x1 && y >= cav.y0 && y <= cav.y1) CV.ajouter(x, y);
        else if (y <= inf.ySea && x > inf.xCote + 1 && x <= inf.xSourceVent) RV.ajouter(x, y);
        else if (y <= inf.ySea && x >= inf.xResurgence && x < inf.xCoteSousLeVent - 1) RA.ajouter(x, y);
      } else if (t === GLACE) { if (drap[i] & CE.GIVRE) GV.ajouter(x, y); else GL.ajouter(x, y); }
      else if (t === SOL) {
        if (drap[i] & CE.FISSURE) FI.ajouter(x, y);
        else if (m[i] > plein) NA.ajouter(x, y);
        if (rec[i] > 0.0004) IN.ajouter(x, y, rec[i]);
      }
    }
    // les noms sont placés par ordre d'importance ; s'il n'y a pas la place, un nom est omis
    const taille = toile.width / dpr < 600 ? 11 : 13;
    const placer = (texte, gx, gy, dec = 1) => { const [sx, sy] = versEcran(gx, gy); return etiquette(texte, sx, sy, {taille, facultative: true, decalageMax: dec}); };
    const centre = (G, texte, dy = 0, min = 1, dec = 1) => { if (G.n >= min) placer(texte, G.x / G.n, G.y / G.n + dy, dec); };
    placer('Océan Indien', inf.xCote * 0.45, inf.ySea + 10);
    centre(RV, 'Rivière', -3, 2);
    centre(RA, 'Rivière', -3, 2);
    placer('Source', inf.xSourceVent - 3, inf.haut[inf.xSourceVent + 1] + 3);
    const petit = s < 3.2;   // scène petite (téléphone) : noms plus courts, hors de ce qu'ils nomment
    centre(CV, petit ? 'Cavité' : 'Poche d’eau souterraine (cavité)', petit ? 7 : 4, 1);
    placer('Source (résurgence)', inf.xResurgence + 7, inf.sortieCavite + 2);
    centre(NA, 'Nappe phréatique', 1, 5, 3);
    const xs = Math.round((inf.xSourceVent + inf.xSommet) / 2);
    placer('Sol perméable', xs - 4, inf.haut[xs - 4] + 1);
    if (!petit) centre(FI, 'Roche fissurée', 0, 1);
    placer('Roche (peu perméable)', xs + 2, inf.haut[xs + 2] + 24);
    placer('Piton des Neiges', inf.xSommet, inf.ySommet - 6);
    // nuage : au-dessus de son centre ; pluie : un peu en dessous et du côté de la mer (pas en pile
    // avec « Infiltration », placé plus bas sur la pente)
    centre(N, 'Nuage', -3, 40);
    if (P.n >= 6) placer('Pluie', P.x / P.n - 6, P.y / P.n + 2);
    centre(GV, 'Givre', -3, 1);
    centre(GL, 'Glace', 3, 1);
    // Infiltration : là où l'eau entre dans le sol en ce moment, avec une flèche vers le bas
    if (IN.n > 0.004) {
      const gx = IN.x / IN.n, gy = IN.y / IN.n;
      const r = placer('Infiltration', gx, gy - 9);
      if (!r) return;
      const [ax] = versEcran(gx, gy);
      const xf = Math.max(r.x + 6, Math.min(r.x + r.w - 6, ax)), y0 = r.y + r.h + 2, y1 = y0 + Math.max(14, s * 5);
      ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(xf, y0); ctx.lineTo(xf, y1 - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xf - 5, y1 - 6); ctx.lineTo(xf + 5, y1 - 6); ctx.lineTo(xf, y1); ctx.closePath(); ctx.fill();
    }
  }

  // Les rivières, dessinées par-dessus la grille : un ruban d'eau lissé qui suit le lit, de la source
  // à l'océan, entre deux berges. Sa largeur grandit vers l'aval et dépend de l'eau réellement
  // présente dans le lit à cet endroit (la masse simulée reste la vérité : lit à sec, pas de ruban).
  // Des reflets clairs descendent la pente (pointillés qui avancent).
  function dessinerRivieres() {
    const inf = etat.infos, monde = etat.monde, {nx, typ, m} = monde, s = vue.s;
    const eauColonne = x => {
      let q = 0;
      if (x < 0 || x >= nx) return 0;
      for (let y = inf.haut[x] - 4; y < inf.haut[x]; y++) { const i = y * nx + x; if (y >= 0 && typ[i] === EAU) q += m[i]; }
      return q;
    };
    const trajets = [
      {de: inf.xSourceVent, a: inf.xCote - 4, pas: -1},
      {de: inf.xResurgence, a: inf.xCoteSousLeVent + 4, pas: 1},
    ];
    const t = performance.now();
    for (const tr of trajets) {
      const pts = [];
      for (let x = tr.de; tr.pas < 0 ? x >= tr.a : x <= tr.a; x += tr.pas) {
        const fin = inf.haut[x] > inf.ySea + 1;                         // embouchure : la surface de l'océan
        let debit = 0;
        for (let k = -3; k <= 3; k++) { const xx = x + k; if (xx >= 0 && xx < nx) debit += monde.debitColonne[xx]; }
        // le ruban suit l'eau réellement présente dans la colonne (et sa voisine) : un lit à sec n'est pas dessiné
        const local = eauColonne(x) + 0.5 * Math.max(eauColonne(x - 1), eauColonne(x + 1));
        pts.push({x: x + 0.5, y: fin ? inf.ySea + 0.6 : inf.haut[x] - 0.45, eau: fin ? 1 : Math.min(1, local / 0.5), debit: Math.min(1, debit / 2)});
        if (fin) break;
      }
      if (pts.length < 3) continue;
      // lissage du tracé (pas d'escalier de pixels)
      const lisse = pts.map((pt, k) => {
        let sy = 0, n = 0;
        for (let j = Math.max(0, k - 2); j <= Math.min(pts.length - 1, k + 2); j++) { sy += pts[j].y; n++; }
        return {x: pt.x, y: k === pts.length - 1 ? pt.y : sy / n, eau: pt.eau, debit: pt.debit};
      });
      const largeur = k => (0.9 + 1.3 * k / (lisse.length - 1)) * s;
      const segments = (style, facteur, extra = 0) => {
        for (let k = 0; k < lisse.length - 1; k++) {
          const a = lisse[k], b = lisse[k + 1], e = Math.min(a.eau, b.eau);
          if (e < 0.15) continue;
          const [x0, y0] = versEcran(a.x, a.y), [x1, y1] = versEcran(b.x, b.y);
          // largeur : un filet quand il ne coule presque rien, plus large quand le débit augmente
          const dq = Math.min(a.debit, b.debit);
          ctx.strokeStyle = style; ctx.lineWidth = Math.max(2, largeur(k) * (0.35 + 0.9 * dq) * facteur + extra);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
      };
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      segments('#3b2f25', 1, Math.max(2, s * 0.5));     // berges
      segments('#2f86d6', 1);                            // eau douce
      // reflets qui descendent la pente
      ctx.setLineDash([Math.max(3, s * 1.2), Math.max(8, s * 3)]);
      ctx.lineDashOffset = -(t / 60) % 1000;
      ctx.beginPath();
      let ouvert = false;
      for (let k = 0; k < lisse.length; k++) {
        const pt = lisse[k];
        if (pt.eau < 0.15) { ouvert = false; continue; }
        const [sx, sy] = versEcran(pt.x, pt.y);
        if (!ouvert) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        ouvert = true;
      }
      ctx.strokeStyle = 'rgba(214, 238, 255, .7)'; ctx.lineWidth = Math.max(1, s * 0.3);
      ctx.stroke();
      ctx.restore();
    }
  }

  function dessinerFusion() {
    const inf = etat.infos;
    const [sx, sy] = versEcran((inf.x0 + inf.x1 + 1) / 2, inf.yFond + 7);
    etiquette('Plaque chauffante : ' + etat.fusion.niveau, sx, sy, {taille: 12, fond: 'rgba(10,14,20,.7)'});
  }

  // ---- Courbe de fusion ------------------------------------------------------------
  function dessinerCourbe() {
    const toileC = $('courbe'), c2 = toileC.getContext('2d');
    const W = toileC.width / dpr, H = toileC.height / dpr;
    if (W < 20 || H < 20) return;
    c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    c2.fillStyle = '#0e1319'; c2.fillRect(0, 0, W, H);
    const mesures = etat.fusion.mesures;
    const g = 46, dr = 12, ht = 12, bas = 36;
    const tMax = mesures.length ? mesures[mesures.length - 1].t / 60 : 0;
    const xMax = Math.max(10, Math.ceil(tMax / 2) * 2);
    let yMin = -15, yMax = 30;
    for (const m of mesures) { yMin = Math.min(yMin, Math.floor(m.T / 10) * 10); yMax = Math.max(yMax, Math.ceil(m.T / 10) * 10); }
    if (yMax >= 100) yMax = 110;
    const X = t => g + (W - g - dr) * t / xMax, Y = T => ht + (H - ht - bas) * (yMax - T) / (yMax - yMin);
    c2.font = '12px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    c2.textBaseline = 'middle';
    // Quadrillage et graduations
    // graduations assez espacées pour rester lisibles, même sur un petit écran
    const pasX = [1, 2, 5, 10].find(p => (W - g - dr) * p / xMax >= 26) || 10;
    const pasY = [10, 20, 50].find(p => (H - ht - bas) * p / (yMax - yMin) >= 18) || 50;
    c2.strokeStyle = 'rgba(255,255,255,.14)'; c2.lineWidth = 1; c2.fillStyle = '#c9d3dd';
    c2.textAlign = 'center';
    for (let t = 0; t <= xMax + 1e-9; t += pasX) {
      c2.beginPath(); c2.moveTo(X(t), Y(yMax)); c2.lineTo(X(t), Y(yMin)); c2.stroke();
      c2.fillText(nombre(t, 0), X(t), H - bas + 11);
    }
    c2.textAlign = 'right';
    for (let T = Math.ceil(yMin / pasY) * pasY; T <= yMax + 1e-9; T += pasY) {
      c2.beginPath(); c2.moveTo(X(0), Y(T)); c2.lineTo(X(xMax), Y(T)); c2.stroke();
      c2.fillText(nombre(T, 0), g - 5, Y(T));
    }
    c2.strokeStyle = '#c9d3dd'; c2.lineWidth = 1.5;
    c2.beginPath(); c2.moveTo(X(0), Y(yMax)); c2.lineTo(X(0), Y(yMin)); c2.lineTo(X(xMax), Y(yMin)); c2.stroke();
    c2.fillStyle = '#f2f5f8'; c2.textAlign = 'center'; c2.font = '600 12px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    c2.fillText('Temps (min)', (X(0) + X(xMax)) / 2, H - 9);
    c2.textAlign = 'left';
    c2.fillText('Température (°C)', g + 4, ht - 2 < 6 ? 7 : ht - 2);
    if (!mesures.length) {
      c2.fillStyle = '#c9d3dd'; c2.textAlign = 'center';
      c2.fillText('Appuie sur « Démarrer » : les mesures s’ajoutent ici.', (X(0) + X(xMax)) / 2, (Y(yMax) + Y(yMin)) / 2);
      return;
    }
    c2.strokeStyle = '#ffd166'; c2.lineWidth = 2;
    c2.beginPath();
    mesures.forEach((m, k) => { const x = X(m.t / 60), y = Y(m.T); if (k) c2.lineTo(x, y); else c2.moveTo(x, y); });
    c2.stroke();
    c2.fillStyle = '#ffd166';
    for (const m of mesures) { c2.beginPath(); c2.arc(X(m.t / 60), Y(m.T), 3, 0, 2 * Math.PI); c2.fill(); }
  }

  function viderTableau() {
    const corps = document.querySelector('#tableau tbody');
    if (corps) corps.textContent = '';
  }
  function ajouterLigne(mes) {
    const corps = document.querySelector('#tableau tbody');
    const tr = document.createElement('tr');
    for (const texte of [nombre(mes.t / 60, 2), nombre(mes.T, 1)]) { const td = document.createElement('td'); td.textContent = texte; tr.appendChild(td); }
    corps.appendChild(tr);
    const zone = $('tableau-zone');
    zone.scrollTop = zone.scrollHeight;
  }

  function lireThermoFusion() {
    const th = etat.thermometres[0];
    return etat.monde.lireTemperature(th.x, th.y);
  }

  function enregistrerSiBesoin() {
    const f = etat.fusion;
    if (f.statut !== 'en-cours' || etat.partie !== 'fusion') return;
    // l'eau qui bout s'en va : quand le réservoir du thermomètre n'est plus dans l'eau, les relevés
    // s'arrêtent (une lecture dans l'air ne ferait pas partie de la courbe)
    if (!etat.monde.thermometreDansLEau(etat.thermometres[0])) { f.statut = 'hors'; courbeARefaire = true; majBoutons(); return; }
    const t = etat.monde.temps - f.t0;
    while (t + 1e-6 >= f.prochaine) {
      const mes = {t: f.prochaine, T: lireThermoFusion()};
      f.mesures.push(mes);
      ajouterLigne(mes);
      courbeARefaire = true;
      f.prochaine += SC.FUSION.releve;
    }
  }

  function texteCsv() {
    const lignes = ['Temps (min);Température (°C)'];
    for (const m of etat.fusion.mesures) lignes.push(nombreCsv(m.t / 60, 2) + ';' + nombreCsv(m.T, 1));
    return lignes.join('\r\n') + '\r\n';
  }

  function telechargerCsv() {
    if (!etat.fusion.mesures.length) { demander('Le tableau est vide : appuie d’abord sur « Démarrer ».', null); return; }
    const blob = new Blob(['﻿' + texteCsv()], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'courbe-de-fusion.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---- Panneau --------------------------------------------------------------------------
  function majPanneau() {
    const monde = etat.monde;
    if (!monde) return;
    const ms = monde.masses(), dec = monde.r.gParCase < 1 ? 1 : 0;
    const g = x => nombre(x, dec) + ' g';
    const lignes = [];
    if (etat.partie === 'fusion') {
      const inf = etat.infos, {nx, typ, m} = monde;
      let becher = 0;
      for (let y = inf.yHaut; y < inf.yFond; y++) for (let x = inf.x0; x <= inf.x1; x++) {
        const i = y * nx + x;
        if (typ[i] === EAU || typ[i] === GLACE) becher += m[i];
      }
      lignes.push(`<span class="total">Eau dans le bécher (glace et liquide) : ${g(becher * monde.r.gParCase)}</span>`);
      lignes.push(`<span class="ligne">Masse totale d’eau, avec la vapeur déjà présente dans l’air de la salle : ${g(ms.total)}</span>`);
    } else {
      lignes.push(`<span class="total">Masse totale d’eau : ${g(ms.total)}</span>`);
      const t = monde.temps, min = Math.floor(t / 60 + 1e-9), sec = Math.floor(t - 60 * min + 1e-9);
      lignes.push(`<span class="ligne">Temps : ${min} min ${String(sec).padStart(2, '0')} s</span>`);
      if (etat.partie === 'cycle') {
        const f = monde.forceVent();
        lignes.push(`<span class="ligne">Alizés : ${!etat.vent ? 'arrêtés' : f > 0.6 ? 'soutenus' : f > 0.05 ? 'faibles' : 'presque nuls (accalmie)'}</span>`);
      }
    }
    if (etat.repartition) {
      let cavite = 0;
      if (etat.partie === 'cycle') {
        const c = etat.infos.cavite, {nx, typ, m} = monde;
        for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (typ[y * nx + x] === EAU) cavite += m[y * nx + x];
        cavite *= monde.r.gParCase;
      }
      lignes.push(`<span class="ligne">Glace (solide) : ${g(ms.glace)}</span>`);
      lignes.push(`<span class="ligne">Eau liquide${etat.partie === 'cycle' ? ' (océan, rivières, pluie)' : ''} : ${g(ms.liquide - cavite)}</span>`);
      if (etat.partie === 'cycle') lignes.push(`<span class="ligne">Poche d’eau souterraine (cavité) : ${g(cavite)}</span>`);
      lignes.push(`<span class="ligne">Gouttelettes (liquide) : ${g(ms.gouttelettes)}</span>`);
      lignes.push(`<span class="ligne">Vapeur d’eau (gaz) : ${g(ms.vapeur)}</span>`);
      if (etat.partie === 'cycle') {
        lignes.push(`<span class="ligne">Eau dans le sol (au-dessus de la nappe) : ${g(ms.sol)}</span>`);
        lignes.push(`<span class="ligne">Nappe phréatique : ${g(ms.nappe)}</span>`);
        lignes.push(`<span class="ligne">Eau dans la roche fissurée : ${g(ms.fissure)}</span>`);
      }
      if (etat.partie !== 'cycle') lignes.push(`<span class="ligne">Vapeur partie dans le reste de la pièce : ${g(ms.dehors)}</span>`);
    }
    lignes.push(`<span class="ligne petit">${etat.partie === 'fusion' ? 'Pas à l’échelle' : 'Pas à l’échelle · durées accélérées'}</span>`);
    // sur la scène : le total, le temps, l'échelle ; le détail de la répartition va dans le panneau
    const detail = lignes.filter(l => /Glace \(solide\)|Eau liquide|Poche d’eau|Gouttelettes|Vapeur|Eau dans le sol|Nappe|roche fissurée/.test(l));
    $('masses').innerHTML = lignes.filter(l => !detail.includes(l)).join('');
    $('repartition').innerHTML = detail.length ? '<h2>Répartition</h2>' + detail.map(l => l.replace('class="ligne"', 'class="ligne-rep"')).join('') : '';
    const lect = etat.thermometres.map((th, k) => `<p>Thermomètre${etat.thermometres.length > 1 ? ' ' + (k + 1) : ''} : <strong>${nombre(monde.lireTemperature(th.x, th.y), 1)} °C</strong></p>`);
    $('lectures').innerHTML = lect.join('');
    if (etat.partie === 'fusion') {
      const f = etat.fusion, t = Math.max(0, monde.temps - f.t0);
      const min = Math.floor(t / 60 + 1e-9), sec = Math.floor(t - 60 * min + 1e-9);
      $('chrono').textContent = `Temps : ${min} min ${sec} s`;
    }
  }

  function majBoutons() {
    const p = etat.partie, f = etat.fusion;
    document.querySelectorAll('[data-outil]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.outil === etat.outil)));
    $('aide-outil').textContent = AIDE_OUTILS[etat.outil];
    $('b-pinceau').textContent = 'Pinceau : ' + NOMS_PINCEAU[etat.pinceau];
    $('b-soleil').setAttribute('aria-pressed', String(etat.soleil));
    $('b-soleil').textContent = etat.soleil ? 'Soleil : visible' : 'Soleil : caché';
    $('b-vent').setAttribute('aria-pressed', String(etat.vent));
    $('b-noms').setAttribute('aria-pressed', String(etat.noms));
    $('b-thermo-cycle').setAttribute('aria-pressed', String(etat.thermoCycle));
    $('b-vapeur').setAttribute('aria-pressed', String(etat.vapeur));
    $('b-repartition').setAttribute('aria-pressed', String(etat.repartition));
    $('b-agitateur').setAttribute('aria-pressed', String(f.agitation));
    $('b-agitateur').textContent = f.agitation ? 'Agitateur : en marche' : 'Agitateur : arrêté';
    $('mention-vapeur').hidden = !etat.vapeur;
    $('b-vitesse').textContent = 'Vitesse ×' + ({0.25: '¼', 0.5: '½'}[etat.vitesse] || etat.vitesse);
    const pause = $('b-pause');
    pause.hidden = p === 'fusion';
    pause.textContent = etat.enMarche ? 'Pause' : 'Lecture';
    pause.setAttribute('aria-pressed', String(!etat.enMarche));
    $('en-pause').hidden = p === 'fusion' ? f.statut !== 'pause' : etat.enMarche;
    $('hors-eau').hidden = !(p === 'fusion' && f.statut === 'hors');
    $('b-depart').textContent = p === 'bac-a-sable' ? 'Scène de départ' : 'Remettre à zéro';
    const dem = $('b-demarrer');
    dem.textContent = f.statut === 'en-cours' ? 'Pause' : f.statut === 'pause' ? 'Reprendre' : f.statut === 'hors' ? 'Relevés terminés' : 'Démarrer';
    dem.disabled = f.statut === 'hors';
    $('s-masse').disabled = f.statut !== 'pret';
    $('s-masse').value = String(f.masse);
    $('r-plaque').value = String(f.niveau);
    $('v-plaque').textContent = String(f.niveau);
    $('r-air').value = String(etat.tAir);
    $('v-air').textContent = nombre(etat.tAir, 0) + ' °C';
    $('r-mer').value = String(etat.tMer);
    $('v-mer').textContent = nombre(etat.tMer, 0) + ' °C';
  }

  // ---- Fenêtres : confirmation, protocole -----------------------------------------------
  let siOui = null, focusAvant = null;
  function demander(texte, action) {
    focusAvant = document.activeElement;
    siOui = action;
    $('confirmation-texte').textContent = texte;
    $('confirmation-non').hidden = !action;
    $('confirmation-oui').textContent = action ? 'Oui' : 'D’accord';
    $('confirmation').hidden = false;
    $('confirmation-oui').focus();
  }
  function fermerConfirmation(oui) {
    $('confirmation').hidden = true;
    const action = siOui; siOui = null;
    if (oui && action) action();
    if (focusAvant && focusAvant.focus) focusAvant.focus();
  }
  function ouvrirProtocole(ouvrir) {
    $('protocole').hidden = !ouvrir;
    $('b-protocole').setAttribute('aria-expanded', String(ouvrir));
    if (ouvrir) $('b-fermer-protocole').focus(); else $('b-protocole').focus();
  }

  // ---- Saisie : dessiner au doigt, poser et déplacer les thermomètres ---------------------
  let geste = null;

  function versGrille(event) {
    const r = toile.getBoundingClientRect();
    const x = (event.clientX - r.left - vue.x) / vue.s, y = (event.clientY - r.top - vue.y) / vue.s;
    return {x, y};
  }
  function dansGrille(g) { return g.x >= 0 && g.y >= 0 && g.x < etat.monde.nx && g.y < etat.monde.ny; }

  function thermometreSous(g) {
    // le réservoir ou la tige (38 px au-dessus)
    let meilleur = -1, dMin = Infinity;
    etat.thermometres.forEach((th, k) => {
      const dx = (g.x - th.x) * vue.s, dy = (g.y - th.y) * vue.s;
      const dTige = Math.abs(dx) < 16 && dy < 12 && dy > -60 ? Math.abs(dx) : Infinity;
      const dRes = Math.hypot(dx, dy);
      const dd = Math.min(dRes < 22 ? dRes : Infinity, dTige);
      if (dd < dMin) { dMin = dd; meilleur = k; }
    });
    return meilleur;
  }

  function borner(g) {
    return {x: Math.max(0.5, Math.min(etat.monde.nx - 0.5, g.x)), y: Math.max(0.5, Math.min(etat.monde.ny - 0.5, g.y))};
  }

  function appliquerOutil(i) {
    const monde = etat.monde, t = monde.typ[i];
    switch (etat.outil) {
      case 'glace': if (t === AIR) monde.poser(i, GLACE, -10); break;
      case 'neige': if (t === AIR) monde.poser(i, GLACE, -5, {drap: GRAIN}); break;
      case 'eau': if (t === AIR) monde.poser(i, EAU, 20); break;
      case 'verre': if (t === AIR) monde.poser(i, VERRE, monde.tAmb[i]); break;
      case 'chaud': if (t === AIR || t === VERRE || t === FROID) monde.poser(i, CHAUD, monde.r.tChaud); break;
      case 'froid': if (t === AIR || t === VERRE || t === CHAUD) monde.poser(i, FROID, monde.r.tFroid); break;
      case 'gomme':
        if (t !== AIR) monde.poser(i, AIR, monde.tAmb[i]);
        else { monde.d[i] = 0; monde.c[i] = 0; monde.p[i] = 0; }
        break;
      default: break;
    }
  }

  function peindreEn(g) {
    const monde = etat.monde, R = RAYONS_PINCEAU[etat.pinceau];
    if (etat.outil === 'neige') {   // la neige tombe en grains épars
      for (let k = 0; k < 3; k++) {
        const x = Math.floor(g.x + (Math.random() * 2 - 1) * R * 1.5), y = Math.floor(g.y + (Math.random() * 2 - 1) * R);
        if (x >= 0 && y >= 0 && x < monde.nx && y < monde.ny) appliquerOutil(y * monde.nx + x);
      }
      return;
    }
    const x0 = Math.floor(g.x - R), x1 = Math.ceil(g.x + R), y0 = Math.floor(g.y - R), y1 = Math.ceil(g.y + R);
    for (let y = Math.max(0, y0); y <= Math.min(monde.ny - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(monde.nx - 1, x1); x++) {
        if ((x + 0.5 - g.x) ** 2 + (y + 0.5 - g.y) ** 2 <= R * R + 0.3) appliquerOutil(y * monde.nx + x);
      }
    }
    if (etat.outil === 'gomme') {
      etat.thermometres = etat.thermometres.filter(th => Math.hypot(th.x - g.x, th.y - g.y) > R + 1);
      etat.mondes[etat.partie].thermometres = etat.thermometres;
    }
  }

  function peindreTrait(a, b) {
    const R = RAYONS_PINCEAU[etat.pinceau];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(0.5, R * 0.6)));
    for (let k = 1; k <= n; k++) peindreEn({x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n});
  }

  function installerSaisie() {
    toile.addEventListener('pointerdown', event => {
      if (geste || !etat.monde) return;
      const g = versGrille(event);
      const p = etat.partie;
      const k = thermometreSous(g);
      const peutDeplacer = p !== 'bac-a-sable' || etat.outil !== 'gomme';
      if (k >= 0 && peutDeplacer && !etat.thermometres[k].fixe) {
        const th = etat.thermometres[k];
        geste = {type: 'thermometre', k, id: event.pointerId, dx: th.x - g.x, dy: th.y - g.y};
      } else if ((p === 'bac-a-sable' && etat.outil === 'thermometre') || (p === 'cycle' && etat.thermoCycle)) {
        if (!dansGrille(g)) return;
        const max = MAX_THERMOS[p];
        if (etat.thermometres.length >= max) etat.thermometres.shift();
        etat.thermometres.push(borner(g));
        etat.mondes[p].thermometres = etat.thermometres;
        geste = {type: 'thermometre', k: etat.thermometres.length - 1, id: event.pointerId, dx: 0, dy: 0};
      } else if (p === 'bac-a-sable') {
        geste = {type: 'peinture', id: event.pointerId, dernier: g};
        if (dansGrille(g)) peindreEn(g);
      } else return;
      event.preventDefault();
      try { toile.setPointerCapture(event.pointerId); } catch (e) { /* pointeur déjà relâché */ }
      dessiner(); majPanneau();
    });
    toile.addEventListener('pointermove', event => {
      if (!geste || event.pointerId !== geste.id) return;
      const g = versGrille(event);
      if (geste.type === 'thermometre') {
        const th = etat.thermometres[geste.k];
        if (th) Object.assign(th, borner({x: g.x + geste.dx, y: g.y + geste.dy}));
      } else {
        peindreTrait(geste.dernier, g);
        geste.dernier = g;
      }
      if (!etat.enMarche || (etat.partie === 'fusion' && etat.fusion.statut !== 'en-cours')) { dessiner(); majPanneau(); }
    });
    const fin = event => {
      if (!geste || event.pointerId !== geste.id) return;
      geste = null;
      majPanneau();
    };
    toile.addEventListener('pointerup', fin);
    toile.addEventListener('pointercancel', fin);
    toile.addEventListener('contextmenu', event => event.preventDefault());
  }

  // ---- Boutons -----------------------------------------------------------------------------
  function installerBoutons() {
    document.querySelectorAll('#parties button').forEach(b => b.addEventListener('click', () => choisirPartie(b.dataset.partie)));
    document.querySelectorAll('[data-outil]').forEach(b => b.addEventListener('click', () => { etat.outil = b.dataset.outil; majBoutons(); }));
    $('b-pinceau').addEventListener('click', () => { etat.pinceau = (etat.pinceau + 1) % 3; majBoutons(); });
    $('r-air').addEventListener('input', e => {
      etat.tAir = Number(e.target.value);
      const scene = etat.mondes['bac-a-sable'];
      if (scene) { scene.monde.tAmb.fill(etat.tAir); scene.monde.r.sortieHaut = 0.5 * CE.satLiquide(etat.tAir); }
      majBoutons();
    });
    $('r-mer').addEventListener('input', e => {
      etat.tMer = Number(e.target.value);
      const scene = etat.mondes.cycle;
      if (scene) {
        const {monde, infos} = scene, {nx, ny} = monde;
        for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
          const i = y * nx + x;
          if (y > infos.haut[x] + 1) continue;   // sous-sol et cavité : température moyenne de l'année, inchangée
          const ocean = y > infos.ySea && y < infos.haut[x];   // même règle que dans scenes.js
          monde.tAmb[i] = ocean ? etat.tMer : etat.tMer - infos.gradient * Math.max(0, infos.altitude(Math.min(y, infos.ySea)));
        }
      }
      majBoutons();
    });
    $('b-soleil').addEventListener('click', () => {
      etat.soleil = !etat.soleil;
      if (etat.mondes.cycle) etat.mondes.cycle.monde.r.soleil = etat.soleil ? SOLEIL : 0;
      majBoutons(); dessiner();
    });
    $('b-vent').addEventListener('click', () => {
      etat.vent = !etat.vent;
      const sc = etat.mondes.cycle;
      if (sc) sc.monde.r.vent = etat.vent ? sc.infos.vent : null;
      majBoutons();
    });
    $('b-noms').addEventListener('click', () => { etat.noms = !etat.noms; majBoutons(); dessiner(); });
    $('b-thermo-cycle').addEventListener('click', () => { etat.thermoCycle = !etat.thermoCycle; majBoutons(); });
    $('b-vapeur').addEventListener('click', () => { etat.vapeur = !etat.vapeur; majBoutons(); dessiner(); });
    $('b-repartition').addEventListener('click', () => { etat.repartition = !etat.repartition; majBoutons(); majPanneau(); });
    $('b-pause').addEventListener('click', () => { etat.enMarche = !etat.enMarche; majBoutons(); });
    $('b-vitesse').addEventListener('click', () => {
      etat.vitesse = VITESSES[(VITESSES.indexOf(etat.vitesse) + 1) % VITESSES.length];
      majBoutons();
    });
    $('b-effacer').addEventListener('click', () => demander('Tout effacer ? Le bac à sable sera vidé.', () => {
      activer(creerScene('bac-a-sable', {vide: true})); majPanneau(); dessiner();
    }));
    $('b-depart').addEventListener('click', () => {
      const p = etat.partie;
      if (p === 'fusion' && !etat.fusion.mesures.length) { activer(creerScene('fusion')); majBoutons(); majPanneau(); dessiner(); return; }
      const texte = p === 'bac-a-sable' ? 'Revenir à la scène de départ ? Ce que tu as construit sera effacé.'
        : p === 'cycle' ? 'Recommencer le cycle de l’eau depuis le début ?'
          : 'Recommencer l’expérience ? Le tableau des mesures sera effacé.';
      demander(texte, () => { activer(creerScene(p)); majBoutons(); majPanneau(); dessiner(); });
    });
    // Expérience de fusion
    $('b-demarrer').addEventListener('click', () => {
      const f = etat.fusion;
      if (f.statut === 'pret') { f.statut = 'en-cours'; f.t0 = etat.monde.temps; f.prochaine = 0; enregistrerSiBesoin(); }
      else if (f.statut !== 'hors') f.statut = f.statut === 'en-cours' ? 'pause' : 'en-cours';
      majBoutons(); dessiner();
    });
    $('r-plaque').addEventListener('input', e => {
      etat.fusion.niveau = Number(e.target.value);
      const sc = etat.mondes.fusion;
      if (sc) sc.monde.r.puissance = etat.fusion.niveau * SC.FUSION.wattsParNiveau;
      majBoutons(); dessiner();
    });
    $('s-masse').addEventListener('change', e => {
      etat.fusion.masse = Number(e.target.value);
      if (etat.fusion.statut === 'pret') { activer(creerScene('fusion')); dessiner(); }
      majBoutons(); majPanneau();
    });
    $('b-agitateur').addEventListener('click', () => {
      etat.fusion.agitation = !etat.fusion.agitation;
      const sc = etat.mondes.fusion;
      if (sc) sc.monde.r.agitation = etat.fusion.agitation;
      majBoutons();
    });
    $('b-csv').addEventListener('click', telechargerCsv);
    // Fenêtres
    $('b-protocole').addEventListener('click', () => ouvrirProtocole($('protocole').hidden));
    $('b-fermer-protocole').addEventListener('click', () => ouvrirProtocole(false));
    $('protocole').addEventListener('click', e => { if (e.target === $('protocole')) ouvrirProtocole(false); });
    $('confirmation-oui').addEventListener('click', () => fermerConfirmation(true));
    $('confirmation-non').addEventListener('click', () => fermerConfirmation(false));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!$('confirmation').hidden) fermerConfirmation(false);
        else if (!$('protocole').hidden) ouvrirProtocole(false);
        return;
      }
      const cible = e.target && e.target.tagName;
      if (e.key === ' ' && (cible === 'BODY' || cible === 'CANVAS') && $('protocole').hidden && $('confirmation').hidden) {
        e.preventDefault();
        if (etat.partie === 'fusion') $('b-demarrer').click(); else $('b-pause').click();
      }
    });
  }

  // ---- Boucle --------------------------------------------------------------------------------
  function avancer() {
    const monde = etat.monde;
    if (!monde) return;
    const fusion = etat.partie === 'fusion';
    if (fusion ? etat.fusion.statut !== 'en-cours' : !etat.enMarche) return;
    etat.reste += PAS_PAR_IMAGE[etat.partie] * etat.vitesse;   // vitesses ×¼ et ×½ : un pas toutes les 4 ou 2 images
    const voulu = Math.floor(etat.reste);
    etat.reste -= voulu;
    const debut = performance.now();
    for (let k = 0; k < voulu; k++) {
      monde.avancer();
      if (fusion) enregistrerSiBesoin();
      if (performance.now() - debut > BUDGET_MS) break;
    }
  }

  function boucle() {
    requestAnimationFrame(boucle);
    if (document.hidden || !etat.dansLEcran || !etat.monde) return;   // onglet caché ou cadre hors de l'écran : pause
    avancer();
    dessiner();
    if (++etat.image % 6 === 0) { majPanneau(); majBoutons(); }
  }

  function demarrer() {
    installerBoutons();
    installerSaisie();
    window.addEventListener('resize', () => { ajusterToile(); dessiner(); });
    if (window.ResizeObserver) new ResizeObserver(() => { ajusterToile(); dessiner(); }).observe($('zone-scene'));
    window.addEventListener('hashchange', () => choisirPartie(partieDuHash(), false));
    if (window.IntersectionObserver) {
      new IntersectionObserver(entrees => { etat.dansLEcran = entrees.some(e => e.isIntersecting); }).observe($('app'));
    }
    choisirPartie(partieDuHash(), false);
    requestAnimationFrame(boucle);
  }

  // État lisible depuis la console et par les tests automatiques
  window.Changements = {
    etat,
    monde: () => etat.monde,
    vue: () => Object.assign({}, vue, {dpr}),
    choisirPartie,
    avancer: n => { for (let k = 0; k < n; k++) { etat.monde.avancer(); if (etat.partie === 'fusion') enregistrerSiBesoin(); } dessiner(); majPanneau(); },
    dessiner: () => { dessiner(); majPanneau(); },
    pixelsGrille: () => Array.from(pixels),
    csv: texteCsv,
    lireThermometres: () => etat.thermometres.map(th => etat.monde.lireTemperature(th.x, th.y)),
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
