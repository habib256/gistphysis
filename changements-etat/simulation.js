// Les changements d'état de l'eau — moteur de simulation (sans affichage)
// Version 1.1 — 20/11/2026
// M. VERHILLE Arnaud
// Licence GNU GPL v3 (voir README.md)
//
// La scène est une grille de cases. Chaque case contient UNE sorte de chose :
//   - de l'air (case « gaz »), qui porte une quantité de vapeur d'eau (invisible), de minuscules
//     gouttelettes d'eau liquide (visibles : nuage, brume, buée), un dépôt de givre en formation
//     et de la pluie qui tombe ;
//   - une petite quantité d'eau liquide ou de glace (bloc, ou grain : neige, glace pilée) ;
//   - une paroi de verre, du sol (qui peut retenir de l'eau), de la roche, une plaque chaude ou froide.
// Aucune case ne représente une particule : les cases sont des « petites quantités ».
//
// Énergie : chaque case d'eau (glace ou liquide) a une enthalpie massique h (J/g), comptée à
// partir de la glace à 0 °C :
//   glace sous 0 °C        h = 2,1 × T                     (h < 0)
//   à 0 °C, glace + liquide 0 ≤ h ≤ 334                     (réserve de fusion : T reste à 0 °C)
//   liquide                h = 334 + 4,18 × T              (0 ≤ T ≤ 100)
//   à 100 °C, ébullition   h > 752 : réserve de vaporisation, T reste à 100 °C ; quand la case a
//                          reçu 2 257 J/g de plus, elle devient une bulle de vapeur.
// Le palier de température n'est donc pas programmé : il vient de ces réserves d'énergie.
// L'énergie passe d'une case à l'autre par conduction (et par brassage dans un liquide agité).
//
// Vapeur : la quantité de vapeur qu'une case d'air peut contenir (saturation) croît avec la
// température (formule de Magnus, forme de Clapeyron), au-dessus de l'eau liquide ou de la glace.
// Au-delà, la vapeur se condense : en gouttelettes dans l'air (condensation liquide), en givre au
// contact d'une surface sous 0 °C (condensation solide), ou sur l'eau elle-même. En dessous,
// l'eau liquide s'évapore à sa surface (évaporation, à toute température) et la glace se
// sublime. Les énergies de changement d'état sont comptées (refroidissement par évaporation,
// réchauffement de l'air par la condensation).
//
// Masse : chaque transformation retire exactement ce qu'elle ajoute ailleurs. La masse totale
// (glace + eau liquide + gouttelettes + pluie + vapeur + eau du sol) ne change pas, aux
// arrondis du calcul près (vérifié par tests/verifier-physique.mjs).
//
// Pas à l'échelle : une case d'air saturée à 100 °C contient autant d'eau qu'une case d'eau
// liquide. En réalité, la vapeur occupe environ 1 600 fois plus de place que l'eau liquide.

'use strict';

(function (racine) {
  // ---- Sortes de cases -------------------------------------------------
  const AIR = 0, EAU = 1, GLACE = 2, VERRE = 3, SOL = 4, ROCHE = 5, CHAUD = 6, FROID = 7;
  const NB_TYPES = 8;
  // Drapeaux
  const GRAIN = 1;           // glace en grains (neige, grêle, glace pilée) : tombe et s'entasse
  const VENUE_DU_CIEL = 2;   // eau liquide venue de la pluie (pour suivre son retour à l'océan)
  const GIVRE = 4;           // glace née d'une condensation solide (givre), pas de pluie ou d'eau gelée
  const FISSURE = 8;         // case de « sol » qui est en fait de la roche fissurée : laisse passer l'eau, pas de nappe

  // ---- Constantes physiques de l'eau (J/(g·°C), J/g) ---------------------
  const C_GLACE = 2.1, C_EAU = 4.18, L_F = 334, L_V = 2257;
  const H_EBU = L_F + 100 * C_EAU;     // enthalpie de l'eau liquide à 100 °C (752 J/g)
  const hVapeur = T => L_F + L_V + C_EAU * T;   // vapeur (chaleur latente supposée constante)
  const hLiquide = T => L_F + C_EAU * T;

  function temperatureDe(t, h) {
    if (t === GLACE) return h < 0 ? h / C_GLACE : 0;
    if (h <= L_F) return 0;
    if (h >= H_EBU) return 100;
    return (h - L_F) / C_EAU;
  }
  function enthalpieDe(t, T) {
    if (t === GLACE) return C_GLACE * Math.min(T, 0);
    return L_F + C_EAU * Math.min(Math.max(T, 0), 100);
  }

  // ---- Saturation -------------------------------------------------------
  // Quantité de vapeur d'une case d'air saturée, en « cases d'eau » : 1 à 100 °C (pas à
  // l'échelle). Au-dessus de 100 °C (pression constante), la vapeur ne se condense plus.
  const T_MIN = -80, T_MAX = 400, PAS_T = 0.05;
  const N_TAB = Math.round((T_MAX - T_MIN) / PAS_T) + 1;
  const TAB_L = new Float64Array(N_TAB), TAB_S = new Float64Array(N_TAB);
  (function () {
    const eL = T => 6.1094 * Math.exp(17.625 * T / (T + 243.04));    // hPa, au-dessus de l'eau
    const eS = T => 6.1121 * Math.exp(22.587 * T / (T + 273.86));    // hPa, au-dessus de la glace
    const rho = (T, e) => e / (T + 273.15);
    const ref = rho(100, eL(100));
    for (let k = 0; k < N_TAB; k++) {
      const T = T_MIN + k * PAS_T;
      const l = T <= 100 ? rho(T, eL(T)) / ref : 1 + (T - 100) * 0.2;
      TAB_L[k] = l;
      TAB_S[k] = T < 0 ? rho(T, eS(T)) / ref : l;
    }
  })();
  function lireTable(tab, T) {
    const x = (T - T_MIN) / PAS_T;
    if (!(x > 0)) return tab[0];
    if (x >= N_TAB - 1) return tab[N_TAB - 1];
    const k = x | 0;
    return tab[k] + (tab[k + 1] - tab[k]) * (x - k);
  }
  function penteTable(tab, T) {
    const x = (T - T_MIN) / PAS_T;
    let k = x | 0;
    if (k < 0) k = 0; else if (k > N_TAB - 2) k = N_TAB - 2;
    return (tab[k + 1] - tab[k]) / PAS_T;
  }
  const satLiquide = T => lireTable(TAB_L, T);
  const satGlace = T => lireTable(TAB_S, T);

  // ---- Hasard reproductible --------------------------------------------
  function generateur(graine) {
    let a = graine >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- Réglages par défaut ---------------------------------------------
  const DEFAUTS = {
    gParCase: 1,          // masse (g) d'eau dans une case d'eau liquide pleine
    dt: 0.5,              // durée simulée d'un pas (s) : chronomètre, plaque à puissance réglable
    cAir: 1,              // capacité thermique d'une case d'air (même unité que 4,18 × masse d'une case)
    chaleurVapeur: C_EAU, // capacité thermique (par case de masse) de la vapeur et des gouttelettes portées
                          // par l'air, comptée avec celle de l'air ; la même que dans hVapeur, pour que
                          // l'énergie soit conservée (0 : non comptée, cycle de l'eau)
    cVerre: 1.5, cSol: 3, cPlaque: 3,
    tChaud: 160, tFroid: -25,
    puissance: null,      // W : plaque à puissance réglable ; null : plaque à température fixe
    relaxAir: 0.01,       // l'air revient vers sa température ambiante (la pièce, l'atmosphère)
    relaxSol: 0.02, relaxOcean: 0.002, relaxVerre: 0,
    kEvap: 0.06,          // évaporation (et condensation) à la surface de l'eau liquide
    kEvapTerre: null,     // cycle : évaporation de l'eau liquide hors de l'océan (null : kEvap)
    evapMax: 0.05,        // plafond de l'écart à la saturation pris en compte pour l'évaporation
    evapChaud: 0,         // bac à sable : plafond d'évaporation plus haut pour l'eau très chaude
    plafondAir: 0,        // > 0 : l'évaporation s'arrête à cette fraction de la saturation de l'air touché
    kSubl: 0.01,          // sublimation (et condensation solide) à la surface de la glace
    brassage: 0.5,        // brassage de la vapeur dans l'air (0 à 0,5)
    distBrassage: 5,      // distance maximale du brassage (cases)
    brassageAir: true,    // le brassage mélange aussi la chaleur et les gouttelettes (sinon : la vapeur seule)
    brassageYMin: 0,      // au-dessus de cette ligne, brassage brassageHaut (cycle : couche d'air marin)
    brassageHaut: null,   // brassage au-dessus de brassageYMin (null : le même)
    diffGouttelettes: 0.03, chuteGouttelettes: 0.01, absorptionGouttelettes: 0.25,
    depotSurface: 0.3,    // part de l'excès de vapeur déposée par pas sur une surface plus froide que l'air
    bordsSolides: true,   // les bords de la scène sont des murs (pièce, laboratoire)
    depotGouttelettes: 0.05, // part des gouttelettes qui se dépose par pas sur une paroi touchée
    seuilPluie: 0.05,     // gouttelettes par case au-delà desquelles se forment des gouttes de pluie
    tauxPluie: 0.05, evapPluie: 0.05, seuilFlaque: 0.5, seuilGivre: 0.5,
    tailleGoutte: 0,      // dans un nuage, la pluie ne tombe qu'une fois les gouttes assez grosses
    conductionAir: 0.12,  // conduction entre deux cases d'air
    ventVariable: 0,      // cycle : période (en pas) des variations des alizés (0 : vent constant)
    mers: null,           // cycle : [{x0, x1}, {x0, x1}] les deux bassins de l'océan, mis au même niveau
    alterner: false,      // cycle : transformations lentes un pas sur deux (taux doublés)
    solFixe: false,       // cycle : sol et roche à température fixe (pas de conduction entre eux)
    kAirEau: 0.04,        // échange de chaleur entre l'eau et l'air qui la touche
    pertes: 1,            // facteur des échanges de chaleur avec l'air et le sol (voir tableConduction)
    convection: 0.6,      // montée de l'air chaud (probabilité de base)
    convectionLiquide: 0.9, // montée de l'eau liquide plus chaude que celle du dessus
    flottaison: 0.3,      // probabilité par pas qu'un grain de glace sous l'eau remonte
    dispersion: 8,        // distance d'étalement d'un liquide vers un endroit plus bas
    agitation: false, zoneAgitation: null,
    sitesBulles: false,   // la réserve d'ébullition se rassemble en quelques sites (bulles plus tôt)
    melangeLiquide: 0,    // brassage de chaque masse d'eau liquide (par °C d'écart entre la plus chaude et la plus froide)
    glissementNeige: false, // cycle : la glace épaisse sur le relief glisse en grains vers le bas
    sortieHaut: 0,        // > 0 : la vapeur au-delà de cette quantité part dans le reste de la pièce
    aeration: 0.003,      // part de l'excès de vapeur qui part à chaque pas (0,5 dans la ligne du haut)
    fenetreAeration: 3,   // écart à la température de la pièce (°C) au-delà duquel l'air ne se renouvelle pas
    vent: null,           // {fx, fy} : flux d'air sur les faces des cases (cycle de l'eau)
    ventPeriodique: false, // l'air qui sort d'un côté de la scène rentre de l'autre
    soleil: 0, colonnesSoleil: null,  // énergie apportée par pas à la surface de l'océan
    ocean: null,          // masque des cases « océan » (réservoir à température ambiante)
    sol: false,           // eau dans le sol (infiltration, écoulement souterrain, retour à l'océan)
    capaciteSol: 0.4, kInfiltration: 0.05, kSolBas: 0.06, kSolCote: 0.02, kSortieSol: 0.05, kEvapSol: 0.01,
    kNappe: 0.05, kSource: 0.2, kReservoir: 0, kProfond: 0, kCavite: 0, cavite: null, hautSol: null,   // nappe : écoulement vers le bas de la pente, sortie par les sources
    graine: 20261120,
  };

  // Conduction : fraction de l'écart de température échangée par pas entre deux voisines
  // (rapportée à la plus petite des deux capacités thermiques). Toujours ≤ 0,5 : chaque échange
  // rapproche les deux températures sans les inverser, le calcul reste stable.
  // pertes : facteur appliqué aux échanges avec l'air et avec la paillasse ou le sol (pertes
  // de chaleur vers la pièce), pour les scènes dont le pas de temps est court.
  function tableConduction(kAir = 0.12, pertes = 1, kAirEau = 0.04) {
    const K = new Float64Array(NB_TYPES * NB_TYPES);
    const poser = (a, b, k) => {
      if (a !== b && (a === AIR || b === AIR || ((a === SOL || a === ROCHE) !== (b === SOL || b === ROCHE)))) k *= pertes;
      K[a * NB_TYPES + b] = k; K[b * NB_TYPES + a] = k;
    };
    poser(EAU, EAU, 0.45); poser(GLACE, GLACE, 0.2); poser(EAU, GLACE, 0.45);
    poser(AIR, AIR, kAir); poser(AIR, EAU, kAirEau); poser(AIR, GLACE, 0.04);
    poser(VERRE, VERRE, 0.25); poser(VERRE, EAU, 0.3); poser(VERRE, GLACE, 0.25); poser(VERRE, AIR, 0.015);
    poser(SOL, SOL, 0.05); poser(SOL, ROCHE, 0.05); poser(ROCHE, ROCHE, 0.05);
    for (const s of [SOL, ROCHE]) { poser(s, AIR, 0.03); poser(s, EAU, 0.05); poser(s, GLACE, 0.05); poser(s, VERRE, 0.05); }
    for (const p of [CHAUD, FROID]) {
      poser(p, EAU, 0.25); poser(p, GLACE, 0.25); poser(p, VERRE, 0.3); poser(p, AIR, 0.04);
      poser(p, SOL, 0.02); poser(p, ROCHE, 0.01);
    }
    poser(CHAUD, CHAUD, 0.2); poser(FROID, FROID, 0.2);
    return K;
  }

  class Monde {
    constructor(nx, ny, reglages = {}) {
      this.nx = nx; this.ny = ny;
      const n = this.n = nx * ny;
      this.r = Object.assign({}, DEFAUTS, reglages);
      this.typ = new Uint8Array(n);
      this.drap = new Uint8Array(n);
      this.m = new Float64Array(n);     // eau liquide ou glace (cases d'eau), eau retenue (sol)
      this.h = new Float64Array(n);     // enthalpie massique (cases d'eau)
      this.T = new Float64Array(n);     // température (toutes les cases)
      this.v = new Float64Array(n);     // vapeur d'eau (cases d'air)
      this.d = new Float64Array(n);     // gouttelettes d'eau liquide en suspension (cases d'air)
      this.c = new Float64Array(n);     // givre en formation (cases d'air au contact d'une surface froide)
      this.p = new Float64Array(n);     // pluie qui tombe (cases d'air)
      this.tAmb = new Float64Array(n);  // température vers laquelle reviennent l'air, le sol, l'océan
      this.vu = new Uint32Array(n);     // « déjà déplacée à ce pas »
      this.etiq = new Int32Array(n);    // blocs de glace (composantes connexes)
      this.pile = new Int32Array(n);
      this.membres = new Int32Array(n);
      this.marqueEau = new Uint32Array(n); this.tamponEau = 0;
      this.finX = new Int32Array(Math.max(nx, ny));
      this.infiltrationRecente = new Float32Array(n);   // eau entrée dans le sol récemment (affichage « Infiltration »)
      this.debitColonne = new Float32Array(nx);         // eau liquide passée d'une colonne à l'autre récemment (débit)
      this.K = tableConduction(this.r.conductionAir, this.r.pertes, this.r.kAirEau);
      this.alea = generateur(this.r.graine);
      this.pas = 0;
      this.temps = 0;           // durée simulée (s)
      this.compteurs = {fusion: 0, solidification: 0, evaporation: 0, ebullition: 0, bulles: 0,
        condensationLiquide: 0, condensationSolide: 0, sublimation: 0, pluie: 0,
        infiltration: 0, versOcean: 0, pluieSurOcean: 0, source: 0, goutteCavite: 0, profond: 0, resurgence: 0};
      this.nbChaud = 0;
      this.horsChamp = 0;       // eau partie dans le reste de la pièce (expérience de fusion)
    }

    // ---- Construction ---------------------------------------------------
    // Pose une case (construction de la scène, outils). Si une case d'air est remplacée, sa vapeur,
    // ses gouttelettes, son givre et sa pluie passent dans la case d'air la plus proche : poser une
    // paroi ou une plaque ne change pas la masse d'eau, poser de l'eau l'augmente de ce qui est posé.
    poser(i, t, T, opts = {}) {
      if (this.typ[i] === AIR && t !== AIR) this.deplacerContenuAir(i);
      this.typ[i] = t; this.drap[i] = opts.drap || 0;
      this.v[i] = this.d[i] = this.c[i] = this.p[i] = 0;
      this.T[i] = T;
      if (t === EAU || t === GLACE) {
        this.m[i] = opts.m === undefined ? 1 : opts.m;
        this.h[i] = enthalpieDe(t, T);
        this.T[i] = temperatureDe(t, this.h[i]);
      } else {
        this.m[i] = opts.m || 0;
        this.h[i] = 0;
      }
      if (t === AIR) this.v[i] = opts.v || 0;
    }
    deplacerContenuAir(i) {
      const {nx, ny, typ, v, d, c, p} = this;
      if (v[i] === 0 && d[i] === 0 && c[i] === 0 && p[i] === 0) return;
      const x0 = i % nx, y0 = (i / nx) | 0;
      for (let R = 1; R <= 12; R++) {
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== R) continue;
          const x = x0 + dx, y = y0 + dy;
          if (x < 0 || y < 0 || x >= nx || y >= ny) continue;
          const j = y * nx + x;
          if (typ[j] !== AIR) continue;
          v[j] += v[i]; d[j] += d[i]; c[j] += c[i]; p[j] += p[i];
          v[i] = d[i] = c[i] = p[i] = 0;
          return;
        }
      }
      // aucune case d'air à proximité : l'eau est comptée avec celle partie dans le reste de la pièce
      this.horsChamp += v[i] + d[i] + c[i] + p[i];
      v[i] = d[i] = c[i] = p[i] = 0;
    }
    rectangle(x0, y0, x1, y1, t, T, opts) {
      for (let y = Math.max(0, y0); y <= Math.min(this.ny - 1, y1); y++)
        for (let x = Math.max(0, x0); x <= Math.min(this.nx - 1, x1); x++) this.poser(y * this.nx + x, t, T, opts);
    }

    // ---- Lecture --------------------------------------------------------
    capa(i) {
      switch (this.typ[i]) {
        case AIR: return this.r.cAir;
        case EAU: return C_EAU * this.m[i];
        case GLACE: return C_GLACE * this.m[i];
        case VERRE: return this.r.cVerre;
        case SOL: case ROCHE: return this.r.cSol;
        case CHAUD: return this.r.puissance === null ? Infinity : this.r.cPlaque;
        default: return Infinity;
      }
    }

    // Masses en grammes, par état
    masses() {
      const {n, typ, m, v, d, c, p} = this, g = this.r.gParCase, plein = 0.95 * this.r.capaciteSol;
      let glace = 0, liquide = 0, goutt = 0, vap = 0, sol = 0, nappe = 0, fissure = 0, pluie = 0;
      const drap = this.drap;
      for (let i = 0; i < n; i++) {
        const t = typ[i];
        if (t === AIR) { vap += v[i]; goutt += d[i]; glace += c[i]; pluie += p[i]; }
        else if (t === EAU) liquide += m[i];
        else if (t === GLACE) glace += m[i];
        else if (t === SOL) { if (drap[i] & FISSURE) fissure += m[i]; else if (m[i] > plein) nappe += m[i]; else sol += m[i]; }
      }
      const dehors = this.horsChamp;
      return {glace: glace * g, liquide: (liquide + pluie) * g, gouttelettes: goutt * g, vapeur: vap * g,
        sol: sol * g, nappe: nappe * g, fissure: fissure * g, pluie: pluie * g, dehors: dehors * g,
        total: (glace + liquide + pluie + goutt + vap + sol + nappe + fissure + dehors) * g};
    }

    // Température lue par un thermomètre dont le réservoir est en (x, y) (coordonnées de grille) :
    // moyenne des cases de même nature (eau, air ou paroi) autour du réservoir (dans l'eau : au niveau
    // du réservoir et juste dessous).
    // Énergie totale (J, comptée depuis la glace à 0 °C pour l'eau, depuis 0 °C pour le reste) : eau
    // et glace, air avec sa vapeur, ses gouttelettes, sa pluie et son givre, parois, plaques, sol.
    // Les plaques froides (température imposée) ne comptent pas.
    energie() {
      const {n, typ, m, h, T, v, d, c, p} = this, r = this.r;
      let E = 0;
      for (let i = 0; i < n; i++) {
        const t = typ[i], Ti = T[i];
        if (t === EAU || t === GLACE) E += m[i] * h[i];
        else if (t === AIR) E += r.cAir * Ti + v[i] * hVapeur(Ti) + (d[i] + p[i]) * hLiquide(Ti) + c[i] * C_GLACE * Ti;
        else if (t === VERRE) E += r.cVerre * Ti;
        else if (t === CHAUD && r.puissance !== null) E += r.cPlaque * Ti;
        else if (t === SOL || t === ROCHE) E += r.cSol * Ti;
      }
      return E;
    }

    // Les outils du bac à sable, sur une case (utilisé par l'app et par les tests)
    appliquerOutil(outil, i) {
      const t = this.typ[i];
      switch (outil) {
        case 'glace': if (t === AIR) this.poser(i, GLACE, -10); break;
        case 'neige': if (t === AIR) this.poser(i, GLACE, -5, {drap: GRAIN}); break;
        case 'eau': if (t === AIR) this.poser(i, EAU, 20); break;
        case 'verre': if (t === AIR) this.poser(i, VERRE, this.tAmb[i]); break;
        case 'chaud': if (t === AIR || t === VERRE || t === FROID) this.poser(i, CHAUD, this.r.tChaud); break;
        case 'froid': if (t === AIR || t === VERRE || t === CHAUD) this.poser(i, FROID, this.r.tFroid); break;
        case 'gomme':
          if (t !== AIR) this.poser(i, AIR, this.tAmb[i]);
          else { this.d[i] = 0; this.c[i] = 0; this.p[i] = 0; }
          break;
        default: break;
      }
    }

    // Le réservoir du thermomètre est-il dans l'eau (ou la glace) ? Une bulle qui passe compte comme de l'eau.
    thermometreDansLEau(th) {
      const {nx, ny, typ} = this;
      const cx = Math.min(nx - 1, Math.max(0, Math.floor(th.x))), cy = Math.min(ny - 1, Math.max(0, Math.floor(th.y)));
      const t = typ[cy * nx + cx];
      if (t === EAU || t === GLACE) return true;
      return t === AIR && cy > 0 && typ[(cy - 1) * nx + cx] === EAU;
    }

    lireTemperature(x, y) {
      const {nx, ny, typ, T} = this;
      const cx = Math.min(nx - 1, Math.max(0, Math.floor(x))), cy = Math.min(ny - 1, Math.max(0, Math.floor(y)));
      const nature = t => (t === EAU || t === GLACE ? 1 : t === AIR ? 0 : 2);
      let n0 = nature(typ[cy * nx + cx]);
      // une bulle de vapeur qui passe sur le réservoir (de l'eau au-dessus) : le thermomètre reste dans l'eau
      if (n0 === 0 && cy > 0 && typ[(cy - 1) * nx + cx] === EAU) n0 = 1;
      let s = 0, k = 0;
      // dans l'eau : seulement la ligne du réservoir et celle du dessous (pas la surface qui se refroidit)
      for (let yy = n0 === 1 ? cy : cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) {
        if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
        const i = yy * nx + xx;
        if (nature(typ[i]) === n0) { s += T[i]; k++; }
      }
      if (k === 0) return T[(cy - 1) * nx + cx];   // bulle entourée de vapeur : l'eau juste au-dessus
      return s / k;
    }

    // Cases « actives » : toutes sauf la roche entourée de roche (dans le cycle, le cœur de l'île), qui
    // n'a rien à faire. Liste par lignes, dans l'ordre de la grille, calculée au premier pas (la roche
    // ne change pas ensuite : aucun outil ne pose ou n'efface de roche). Accélère tous les parcours.
    actifs() {
      if (this.actifsListe) return this.actifsListe;
      const {n, nx, ny, typ} = this, L = new Int32Array(n), A = new Int32Array(ny + 1);
      let k = 0;
      for (let y = 0; y < ny; y++) {
        A[y] = k;
        for (let x = 0; x < nx; x++) {
          const i = y * nx + x;
          if (typ[i] === ROCHE && (y === 0 || typ[i - nx] === ROCHE) && (y === ny - 1 || typ[i + nx] === ROCHE)
            && (x === 0 || typ[i - 1] === ROCHE) && (x === nx - 1 || typ[i + 1] === ROCHE)) continue;
          L[k++] = i;
        }
      }
      A[ny] = k;
      this.actifsListe = L.subarray(0, k);
      this.actifsLignes = A;
      return this.actifsListe;
    }

    // ---- Un pas de simulation --------------------------------------------
    avancer() {
      this.pas++;
      this.temps += this.r.dt;
      this.deplacer();
      if (this.pas % 3 === 0) this.blocs();
      if (this.r.glissementNeige && this.pas % 10 === 0) this.glisserNeige();
      if (this.r.convection > 0 || this.r.convectionLiquide > 0) this.convection();
      // Cycle (option « alterner ») : les transformations lentes et régulières (brassage, gouttelettes,
      // eau du sol, regroupement) sont faites un pas sur deux, avec des taux doublés, en deux groupes
      // qui alternent ; le vent est appliqué deux fois de suite (au taux normal) un pas sur deux ; la
      // chaleur est calculée à chaque pas. Bac à sable et expérience de fusion : tout à chaque pas.
      const alt = this.r.alterner, f = alt ? 2 : 1, pair = (this.pas & 1) === 0, A = !alt || pair, B = !alt || !pair;
      // vent : deux fois avec le taux normal (un seul transport au taux doublé emporterait la vapeur sur plusieurs cases d’un coup)
      if (this.r.vent && A) { this.advecter(1); if (alt) this.advecter(1); }
      if (B) this.brasserVapeur(f);
      if (this.r.sortieHaut) this.aerer();
      if (A) this.gouttelettes(f);
      this.pluie();
      this.chaleur(1);   // la chaleur à chaque pas (la conduction eau-eau ne peut pas être doublée sans devenir instable)
      if (this.r.agitation && this.r.zoneAgitation) this.agiter();
      if (this.r.melangeLiquide > 0) this.melangerLiquides();
      this.etats(f, A);
      if (this.r.sol && B) this.eauDuSol(f);
      if (A) this.regrouper();
      if (this.r.ocean && B) this.suivreRetourOcean();
      if (this.r.mers && this.pas % 20 === 0) this.egaliserMers();
    }

    // Cycle : les deux côtes donnent sur le même océan (hors de la scène, l'océan Indien entoure
    // l'île). Si la mer monte d'un côté et baisse de l'autre, l'eau en trop passe de l'autre côté,
    // comme l'air du vent : les deux mers restent au même niveau (masse comptée, rien ne se perd).
    egaliserMers() {
      const {nx, ny, typ, m, h, T} = this, ocean = this.r.ocean;
      // niveau d'une mer : hauteur moyenne de sa surface, d'après la masse d'eau de la case du haut de
      // chaque colonne (une case à moitié pleine compte pour une demi-ligne) : pas de saut d'une ligne
      const niveau = b => {
        let s = 0, k = 0;
        for (let x = b.x0; x <= b.x1; x++) {
          let y = 0;
          while (y < ny && !(ocean[y * nx + x] && typ[y * nx + x] === EAU)) y++;
          if (y < ny) { s += y + 1 - Math.min(1, m[y * nx + x]); k++; }
        }
        return k ? s / k : ny;
      };
      const [g, d] = this.r.mers;
      const yG = niveau(g), yD = niveau(d), ecart = Math.abs(yG - yD);
      if (ecart < 0.3) return;
      const haut = yG < yD ? g : d, bas = yG < yD ? d : g;   // « haut » : la mer la plus haute
      const wH = haut.x1 - haut.x0 + 1, wB = bas.x1 - bas.x0 + 1;
      // la moitié de l'eau qu'il faudrait déplacer pour égaliser (pas d'aller-retour)
      let reste = Math.min(0.5 * ecart * wH * wB / (wH + wB), 4);
      // prendre l'eau du haut de la mer la plus haute…
      let H = 0, M = 0;
      for (let y = 0; y < ny && reste > 1e-12; y++) for (let x = haut.x0; x <= haut.x1 && reste > 1e-12; x++) {
        const i = y * nx + x;
        if (!ocean[i] || typ[i] !== EAU) continue;
        const q = Math.min(m[i], reste);
        H += q * h[i]; M += q; reste -= q;
        if (m[i] - q <= 1e-12) { const Ti = T[i]; this.viderCase(i); T[i] = Ti; } else m[i] -= q;
      }
      if (M <= 0) return;
      // … et l'ajouter à la surface de l'autre mer, réparti sur ses colonnes
      const cibles = [];
      for (let x = bas.x0; x <= bas.x1; x++) {
        let y = 0;
        while (y < ny && !(ocean[y * nx + x] && typ[y * nx + x] === EAU)) y++;
        if (y < ny) cibles.push(y * nx + x);
      }
      const hq = H / M;
      for (const i of cibles) {
        const q = M / cibles.length;
        h[i] = (h[i] * m[i] + q * hq) / (m[i] + q); m[i] += q; T[i] = temperatureDe(EAU, h[i]);
      }
    }

    echanger(i, j) {
      const {typ, drap, m, h, T, v, d, c, p} = this;
      let a;
      a = typ[i]; typ[i] = typ[j]; typ[j] = a;
      a = drap[i]; drap[i] = drap[j]; drap[j] = a;
      a = m[i]; m[i] = m[j]; m[j] = a;
      a = h[i]; h[i] = h[j]; h[j] = a;
      a = T[i]; T[i] = T[j]; T[j] = a;
      a = v[i]; v[i] = v[j]; v[j] = a;
      a = d[i]; d[i] = d[j]; d[j] = a;
      a = c[i]; c[i] = c[j]; c[j] = a;
      a = p[i]; p[i] = p[j]; p[j] = a;
    }

    // ---- Mouvements : le liquide coule, les grains tombent, les bulles montent ----
    deplacer() {
      const L = this.actifs(), A = this.actifsLignes;
      const deb = this.debitColonne;
      for (let x = 0; x < deb.length; x++) deb[x] *= 0.99;
      const {nx, ny, typ, drap, vu} = this, s = this.pas;
      for (let y = ny - 1; y >= 0; y--) {
        const versGauche = ((y + s) & 1) === 0;
        const dir = versGauche ? -1 : 1;
        const a0 = A[y], a1 = A[y + 1];
        for (let k = 0; k < a1 - a0; k++) {
          const i = L[versGauche ? a0 + k : a1 - 1 - k], x = i - y * nx;
          if (vu[i] === s) continue;
          const t = typ[i];
          if (t === EAU) this.bougerEau(i, x, y, dir, s);
          else if (t === GLACE && (drap[i] & GRAIN)) this.bougerGrain(i, x, y, dir, s);
        }
      }
    }

    // Case d'air entourée de liquide sur un côté : une bulle (elle monte d'une case par pas)
    estBulle(j) {
      const x = j % this.nx;
      return (x > 0 && this.typ[j - 1] === EAU) || (x < this.nx - 1 && this.typ[j + 1] === EAU);
    }

    bougerEau(i, x, y, dir, s) {
      const {nx, ny, typ, vu} = this;
      const enBas = y < ny - 1;
      if (enBas) {
        const b = i + nx;
        if (typ[b] === AIR && !(vu[b] === s && this.estBulle(b))) {
          const bulle = this.estBulle(b);
          this.echanger(i, b); vu[i] = vu[b] = s;
          if (bulle) this.remuer(b, x);   // la bulle qui monte remue l'eau autour d'elle
          return;
        }
        for (let e = 0; e < 2; e++) {
          const dd = e === 0 ? dir : -dir, xx = x + dd;
          if (xx < 0 || xx >= nx) continue;
          const j = b + dd;
          if (typ[j] === AIR && typ[i + dd] === AIR && vu[j] !== s) { this.debitColonne[x] += this.m[i]; this.echanger(i, j); vu[i] = vu[j] = s; return; }
        }
      }
      // Étalement : l'eau glisse sur la surface vers l'endroit plus bas le plus proche (une case d'air
      // qui a de l'air dessous), sans limite de distance, en avançant d'au plus « dispersion » cases
      // par pas. Une surface ne garde donc pas de marche de plus d'une case : elle devient horizontale.
      if (!enBas) return;
      const portee = this.r.dispersion;
      let meilleur = 0, sens = 0;
      for (let e = 0; e < 2; e++) {
        const dd = e === 0 ? dir : -dir;
        for (let k = 1; ; k++) {
          if (meilleur && k >= meilleur) break;
          const xx = x + dd * k;
          if (xx < 0 || xx >= nx) break;
          const j = i + dd * k;
          if (typ[j] !== AIR) break;
          if (typ[j + nx] === AIR) { meilleur = k; sens = dd; break; }
        }
      }
      if (meilleur) {
        const j = i + sens * Math.min(meilleur, portee);
        if (vu[j] !== s) { this.debitColonne[x] += this.m[i]; this.echanger(i, j); vu[i] = vu[j] = s; }
      }
    }

    // Une bulle qui monte remue l'eau : la partie « sensible » de l'énergie (jusqu'à 100 °C) des
    // cases d'eau voisines s'égalise ; les réserves d'ébullition restent dans leur case.
    remuer(i, x) {
      const {nx, typ, m, h, T} = this;
      for (let e = 0; e < 2; e++) {
        const xx = x + (e === 0 ? -1 : 1);
        if (xx < 0 || xx >= nx) continue;
        const j = i + (e === 0 ? -1 : 1);
        if (typ[j] !== EAU || h[j] < L_F || h[i] < L_F) continue;
        const si = Math.min(h[i], H_EBU), sj = Math.min(h[j], H_EBU);
        const moy = (si * m[i] + sj * m[j]) / (m[i] + m[j]);
        h[i] += moy - si; h[j] += moy - sj;
        T[i] = temperatureDe(EAU, h[i]); T[j] = temperatureDe(EAU, h[j]);
      }
    }

    bougerGrain(i, x, y, dir, s) {
      const {nx, ny, typ, vu} = this;
      if (y < ny - 1) {
        const b = i + nx;
        if (typ[b] === AIR) { this.echanger(i, b); vu[i] = vu[b] = s; return; }
        for (let e = 0; e < 2; e++) {
          const dd = e === 0 ? dir : -dir, xx = x + dd;
          if (xx < 0 || xx >= nx) continue;
          const j = b + dd;
          if (typ[j] === AIR && typ[i + dd] === AIR && vu[j] !== s) { this.echanger(i, j); vu[i] = vu[j] = s; return; }
        }
      }
      // La glace flotte : un grain sous de l'eau liquide remonte
      if (y > 0) {
        const a = i - nx;
        if (typ[a] === EAU && vu[a] !== s && this.alea() < this.r.flottaison) { this.echanger(i, a); vu[i] = vu[a] = s; }
      }
    }

    // Blocs de glace : ils gardent leur forme. Un bloc sans appui tombe d'une case ; un bloc
    // entièrement recouvert d'eau liquide remonte d'une case (la glace flotte).
    blocs() {
      const {n, nx, typ, drap, etiq, pile, membres} = this;
      etiq.fill(-1);
      let id = 0;
      for (let i0 = 0; i0 < n; i0++) {
        if (typ[i0] !== GLACE || (drap[i0] & GRAIN) || etiq[i0] !== -1) continue;
        let nm = 0, sp = 0;
        pile[sp++] = i0; etiq[i0] = id;
        while (sp > 0) {
          const i = pile[--sp];
          membres[nm++] = i;
          const x = i % nx;
          const vois = [x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i - nx, i + nx];
          for (let k = 0; k < 4; k++) {
            const j = vois[k];
            if (j < 0 || j >= n) continue;
            if (typ[j] === GLACE && !(drap[j] & GRAIN) && etiq[j] === -1) { etiq[j] = id; pile[sp++] = j; }
          }
        }
        let tombe = true, monte = true;
        // (parois et plaques ; sur le relief du cycle, la glace épaisse glisse : voir glisserNeige)
        const solide = t => t === VERRE || t === CHAUD || t === FROID;
        for (let k = 0; k < nm && (tombe || monte); k++) {
          const i = membres[k], b = i + nx, a = i - nx;
          if (b >= n || (etiq[b] !== id && typ[b] !== AIR)) tombe = false;
          if (a < 0 || (etiq[a] !== id && typ[a] !== EAU)) monte = false;
          // le givre reste collé à la surface où il s'est formé (même une paroi verticale)
          if (drap[i] & GIVRE) {
            const x = i % nx;
            if ((x > 0 && solide(typ[i - 1])) || (x < nx - 1 && solide(typ[i + 1])) || (a >= 0 && solide(typ[a]))) { tombe = false; monte = false; }
          }
        }
        const liste = membres.subarray(0, nm);
        if (tombe) {
          liste.sort();
          for (let k = nm - 1; k >= 0; k--) { const i = liste[k]; this.echanger(i, i + nx); etiq[i + nx] = id; etiq[i] = -2; }
        } else if (monte) {
          liste.sort();
          for (let k = 0; k < nm; k++) { const i = liste[k]; this.echanger(i, i - nx); etiq[i - nx] = id; etiq[i] = -2; }
        }
        id++;
      }
    }

    // Cycle de l'eau : sur le relief, la neige et la glace accumulées au-delà de trois cases
    // d'épaisseur glissent vers le bas de la pente (en grains), où elles finissent par fondre.
    glisserNeige() {
      const {n, nx, typ, drap} = this;
      for (let i = nx; i < n - 2 * nx; i++) {
        if (typ[i] !== GLACE || (drap[i] & GRAIN) || typ[i - nx] !== AIR) continue;
        if (typ[i + nx] === GLACE && typ[i + 2 * nx] === GLACE) drap[i] = GRAIN;
      }
    }

    // ---- Air ---------------------------------------------------------------
    // L'air plus chaud que l'air du dessus monte (il emporte sa vapeur et ses gouttelettes).
    // De même, l'eau liquide plus chaude que celle du dessus monte (convection dans le liquide).
    convection() {
      const L = this.actifs(), A = this.actifsLignes;
      const {nx, ny, typ, T, v, d, vu} = this, conv = this.r.convection, convL = this.r.convectionLiquide, s = this.pas;
      for (let y = 1; y < ny; y++) {
        for (let kk = A[y]; kk < A[y + 1]; kk++) {
          const b = L[kk], a = b - nx;
          const ta = typ[a], tb = typ[b];
          if (ta === EAU && tb === EAU) {
            const h = this.h, m = this.m;
            if (h[b] > H_EBU) {
              // Case qui accumule l'énergie de sa vaporisation (réserve d'ébullition) : elle reste là
              // où arrive la chaleur (c'est là que naissent les bulles), mais l'eau chaude qui monte
              // réchauffe l'eau du dessus jusqu'à 100 °C.
              if (convL > 0 && h[a] < H_EBU) {
                const Q = convL * Math.min((h[b] - H_EBU) * m[b], (H_EBU - h[a]) * m[a]);
                h[b] -= Q / m[b]; h[a] += Q / m[a]; T[a] = temperatureDe(EAU, h[a]);
              }
            } else if (convL > 0 && T[b] > T[a] + 0.05 && vu[b] !== s && this.alea() < convL) { this.echanger(a, b); vu[a] = vu[b] = s; }
            continue;
          }
          if (ta !== AIR || tb !== AIR) continue;
          const dT = T[b] - T[a];
          if (dT > 0.3 && this.alea() < conv * Math.min(1, dT / 5)) {
            let z = T[a]; T[a] = T[b]; T[b] = z;
            z = v[a]; v[a] = v[b]; v[b] = z;
            z = d[a]; d[a] = d[b]; d[b] = z;
          }
        }
      }
      if (convL > 0) this.convectionSousGlace();
    }

    // L'eau plus chaude que 0 °C qui se trouve sous de la glace monte (elle est plus légère que l'eau
    // froide) et cède sa chaleur à la glace, qui fond : tant qu'il reste de la glace au-dessus, le bain
    // reste proche de 0 °C. Ici, colonne par colonne : la plus grande part de l'énergie au-dessus de
    // 0 °C d'une colonne d'eau passe à la glace qui la surmonte (énergie conservée).
    convectionSousGlace() {
      const {nx, ny, typ, m, h, T} = this;
      for (let x = 0; x < nx; x++) {
        let bas = -1;
        for (let y = ny - 1; y >= -1; y--) {
          const t = y >= 0 ? typ[y * nx + x] : AIR;
          if (t === EAU) { if (bas < 0) bas = y; continue; }
          if (bas >= 0 && t === GLACE) {
            const a = y * nx + x;
            let E = 0, M = 0;
            for (let yy = y + 1; yy <= bas; yy++) {
              const i = yy * nx + x, e = Math.min(h[i], H_EBU) - L_F;
              if (e > 0) { E += e * m[i]; M += m[i]; }
            }
            const deficit = (L_F - h[a]) * m[a];
            const Q = Math.min(0.8 * E, deficit);
            if (Q > 1e-12) {
              // ce qui reste de chaleur se répartit dans la colonne (l'eau est brassée en montant)
              const reste = (E - Q) / M;
              for (let yy = y + 1; yy <= bas; yy++) {
                const i = yy * nx + x, e = Math.min(h[i], H_EBU) - L_F;
                if (e > 0) { h[i] += reste - e; T[i] = temperatureDe(EAU, h[i]); }
              }
              h[a] += Q / m[a]; T[a] = temperatureDe(GLACE, h[a]);
            }
          }
          bas = -1;
        }
      }
    }

    // Alizés qui varient (cycle) : des périodes de vent soutenu et des périodes calmes, où l'air ne
    // monte plus le long des pentes : il cesse alors de pleuvoir un moment.
    forceVent() {
      const P = this.r.ventVariable;
      if (!P) return 1;
      const phase = Math.sin(2 * Math.PI * this.pas / P);
      return Math.min(1, Math.max(0, (phase + 0.3) / 0.6));
    }

    // Vent (cycle de l'eau) : transport de la vapeur et des gouttelettes par les flux sur les
    // faces des cases (schéma décentré, conservatif : ce qui sort d'une case entre dans l'autre).
    advecter(fac = 1) {
      fac *= this.forceVent();
      const {nx, ny, typ, v, d} = this, {fx, fy} = this.r.vent;
      const periodique = this.r.ventPeriodique;
      for (let y = 0; y < ny; y++) {
        const ligne = y * (nx + 1);
        for (let x = periodique ? 0 : 1; x < nx; x++) {
          const F = fx[ligne + x];
          if (F === 0) continue;
          // x = 0 : l'air qui sort à droite de la scène rentre à gauche (et inversement)
          const b = y * nx + x, a = x === 0 ? y * nx + nx - 1 : b - 1;
          if (typ[a] !== AIR || typ[b] !== AIR) continue;
          const de = F > 0 ? a : b, vers = F > 0 ? b : a, f = (F > 0 ? F : -F) * fac;
          let q = f * v[de]; v[de] -= q; v[vers] += q;
          q = f * d[de]; d[de] -= q; d[vers] += q;
        }
      }
      for (let y = 1; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const F = fy[y * nx + x];
          if (F === 0) continue;
          const b = y * nx + x, a = b - nx;
          if (typ[a] !== AIR || typ[b] !== AIR) continue;
          const de = F > 0 ? a : b, vers = F > 0 ? b : a, f = (F > 0 ? F : -F) * fac;
          let q = f * v[de]; v[de] -= q; v[vers] += q;
          q = f * d[de]; d[de] -= q; d[vers] += q;
        }
      }
    }

    // La vapeur se répand dans tout l'air qui lui est accessible (un gaz occupe tout l'espace) :
    // mélange de l'air (sa vapeur, sa chaleur, ses gouttelettes) entre deux cases d'air alignées, sans traverser
    // de paroi ni de liquide. Mélanger de l'air chaud et humide avec de l'air froid peut former de
    // la brume : c'est ainsi qu'apparaît le panache au-dessus de l'eau qui bout.
    brasserVapeur(fac = 1) {
      const {nx, ny, typ, v, T, d, c, p, finX} = this, tout = this.r.brassageAir, R = this.r.distBrassage, yMin = this.r.brassageYMin;
      const fBas = Math.min(0.5, this.r.brassage * fac);
      const fHaut = Math.min(0.5, (this.r.brassageHaut === null ? this.r.brassage : this.r.brassageHaut) * fac);
      if (fBas <= 0 || R <= 0) return;
      // Échange entre deux cases d'air, qui conserve l'énergie. La vapeur (et, si tout l'air est
      // brassé, les gouttelettes et la chaleur de l'air) passe d'une case à l'autre en emportant sa
      // chaleur (capacité de la vapeur et des gouttelettes comptée avec celle de l'air) : la vapeur
      // à 100 °C d'une bulle réchauffe l'air où elle arrive.
      const kv = this.r.chaleurVapeur, cA = this.r.cAir;
      const echanger = (i, j, f) => {
        const pc = kv > 0 ? 1 : 0;   // pluie et givre de la case : ils restent, mais à sa température
        const ci = cA + kv * (v[i] + d[i]) + pc * (C_EAU * p[i] + C_GLACE * c[i]), cj = cA + kv * (v[j] + d[j]) + pc * (C_EAU * p[j] + C_GLACE * c[j]);
        const qv = f * (v[i] - v[j]), qd = tout ? f * (d[i] - d[j]) : 0;
        let Ei = ci * T[i], Ej = cj * T[j];
        // (seuls l'air, sa vapeur et ses gouttelettes se déplacent ; la pluie et le givre restent : la
        // chaleur échangée est celle de la part d'air déplacée, et la température reste entre les deux)
        if (tout) { const mi = cA + kv * (v[i] + d[i]), mj = cA + kv * (v[j] + d[j]), dE = f * (mi * T[i] - mj * T[j]); Ei -= dE; Ej += dE; }
        else if (kv > 0) { const dE = kv * (qv > 0 ? qv * T[i] : qv * T[j]); Ei -= dE; Ej += dE; }
        v[i] -= qv; v[j] += qv; d[i] -= qd; d[j] += qd;
        if (tout || kv > 0) { T[i] = Ei / (cA + kv * (v[i] + d[i]) + pc * (C_EAU * p[i] + C_GLACE * c[i])); T[j] = Ej / (cA + kv * (v[j] + d[j]) + pc * (C_EAU * p[j] + C_GLACE * c[j])); }
      };
      const dist = 1 + Math.floor(this.alea() * R);
      // une fois à l'horizontale, une fois à la verticale (compteur propre : quand les transformations
      // lentes sont faites un pas sur deux, le brassage doit quand même alterner les deux sens)
      this.nBrassages = (this.nBrassages || 0) + 1;
      if ((this.nBrassages & 1) === 0) {
        for (let y = 0; y < ny; y++) {
          const base = y * nx, f = y >= yMin ? fBas : fHaut;
          if (f <= 0) continue;
          for (let x = nx - 1; x >= 0; x--) {
            const i = base + x;
            finX[x] = typ[i] !== AIR ? -1 : (x + 1 < nx && typ[i + 1] === AIR ? finX[x + 1] : x);
          }
          for (let x = 0; x + dist < nx; x++) {
            if (finX[x] < x + dist) continue;
            echanger(base + x, base + x + dist, f);
          }
        }
      } else {
        const pas = dist * nx;
        for (let x = 0; x < nx; x++) {
          for (let y = ny - 1; y >= 0; y--) {
            const i = y * nx + x;
            finX[y] = typ[i] !== AIR ? -1 : (y + 1 < ny && typ[i + nx] === AIR ? finX[y + 1] : y);
          }
          for (let y = 0; y + dist < ny; y++) {
            if (finX[y] < y + dist) continue;
            const f = y >= yMin ? fBas : fHaut;
            if (f <= 0) continue;
            echanger(y * nx + x, y * nx + x + pas, f);
          }
        }
      }
    }

    // Bac à sable et expérience de fusion : la pièce est bien plus grande que la scène. La vapeur
    // en excès (au-delà de l'humidité ordinaire de la pièce) part peu à peu dans le reste de la
    // pièce, surtout par le haut de la scène (l'air chaud d'un panache, lui, ne se renouvelle
    // pas avant de s'être mélangé à l'air de la pièce). Cette masse est comptée à part (horsChamp) et reste
    // dans la masse totale d'eau.
    aerer() {
      const {n, nx, typ, v, d, T, tAmb} = this, vAmb = this.r.sortieHaut, k = this.r.aeration;
      for (let i = 0; i < n; i++) {
        if (typ[i] !== AIR) continue;
        const exces = v[i] - vAmb;
        if (exces <= 0) continue;
        // seul l'air à la température de la pièce se renouvelle (pas l'air chaud d'un panache)
        const fen = this.r.fenetreAeration;
        if (i >= nx && (T[i] - tAmb[i] > fen || tAmb[i] - T[i] > fen)) continue;
        const q = (i < nx ? 0.5 : k) * exces;
        v[i] -= q; this.horsChamp += q;
      }
      for (let x = 0; x < nx; x++) {
        if (typ[x] !== AIR) continue;
        const q = 0.5 * d[x];
        d[x] -= q; this.horsChamp += q;
      }
    }

    // Les gouttelettes se répandent un peu, tombent lentement, rejoignent l'eau liquide qu'elles touchent.
    gouttelettes(fac = 1) {
      const L = this.actifs(), A = this.actifsLignes;
      const {nx, ny, typ, d, m, h, T} = this, r = this.r;
      const D = r.diffGouttelettes * fac, chute = r.chuteGouttelettes * fac, abs = Math.min(0.9, r.absorptionGouttelettes * fac);
      for (let y = 0; y < ny; y++) {
        for (let kk = A[y]; kk < A[y + 1]; kk++) {
          const i = L[kk], x = i - y * nx;
          if (typ[i] !== AIR) continue;
          const di = d[i];
          if (x < nx - 1 && (di !== 0 || d[i + 1] !== 0) && typ[i + 1] === AIR) { const q = D * (d[i] - d[i + 1]); d[i] -= q; d[i + 1] += q; }
          if (y < ny - 1 && (d[i] !== 0 || d[i + nx] !== 0) && typ[i + nx] === AIR) { const q = D * (d[i] - d[i + nx]); d[i] -= q; d[i + nx] += q; }
        }
      }
      for (let y = ny - 2; y >= 0; y--) {
        for (let kk = A[y]; kk < A[y + 1]; kk++) {
          const i = L[kk], x = i - y * nx;
          if (typ[i] !== AIR || d[i] <= 0) continue;
          const b = i + nx, tb = typ[b];
          if (tb === AIR) { const q = chute * d[i]; d[i] -= q; d[b] += q; }
          else if (tb === EAU || tb === GLACE) {
            const q = abs * d[i];
            d[i] -= q;
            const mb = m[b];
            h[b] = (h[b] * mb + q * hLiquide(T[i] > 0 ? T[i] : 0)) / (mb + q);
            m[b] = mb + q;
            T[b] = temperatureDe(tb, h[b]);
          }
        }
      }
    }

    // Gouttes de pluie : nées des gouttelettes d'un nuage trop chargé ; elles tombent d'une
    // case par pas, s'évaporent en partie dans l'air sec, s'infiltrent ou s'accumulent au sol.
    pluie() {
      const L = this.actifs(), A = this.actifsLignes;
      const {nx, ny, typ, d, p, v, m, h, T} = this, r = this.r;
      const seuil = r.seuilPluie, taux = r.tauxPluie;
      for (let y = ny - 1; y >= 0; y--) {
        for (let kk = A[y]; kk < A[y + 1]; kk++) {
          const i = L[kk], x = i - y * nx;
          if (typ[i] !== AIR) continue;
          if (d[i] > seuil) { const q = (d[i] - seuil) * taux; d[i] -= q; p[i] += q; this.compteurs.pluie += q; }
          let pi = p[i];
          if (pi <= 0) continue;
          // dans le nuage, les gouttes de pluie grossissent avant de tomber
          if (d[i] > seuil && pi < r.tailleGoutte) continue;
          // évaporation de la pluie dans l'air non saturé
          const manque = satLiquide(T[i]) - v[i];
          if (manque > 0) {
            let q = Math.min(pi, r.evapPluie * manque, 2 * r.cAir / L_V);
            p[i] = pi -= q; v[i] += q; T[i] -= L_V * q / r.cAir;
            this.compteurs.evaporation += q;
            if (pi <= 0) continue;
          }
          if (y === ny - 1) { this.accumulerPluie(i); continue; }
          const b = i + nx, tb = typ[b];
          if (tb === AIR) { p[b] += pi; p[i] = 0; }
          else if (tb === EAU || tb === GLACE) {
            // (la case d'eau ne se remplit pas au-delà de 1,25 : le reste de la pluie attend au-dessus)
            const mb = m[b], q = r.ocean ? pi : Math.min(pi, Math.max(0, 1.25 - mb));
            if (q > 0) {
              h[b] = (h[b] * mb + q * hLiquide(T[i] > 0 ? T[i] : 0)) / (mb + q);
              m[b] = mb + q; T[b] = temperatureDe(tb, h[b]);
              if (r.ocean && r.ocean[b]) this.compteurs.pluieSurOcean += q;
              else if (tb === EAU) this.drap[b] |= VENUE_DU_CIEL;   // eau de pluie ou de source dans une rivière
            }
            p[i] = pi - q;
            if (p[i] > 0) this.accumulerPluie(i);
          } else if (tb === SOL && r.sol) {
            const place = r.capaciteSol - m[b];
            if (place > 0) {
              const q = Math.min(pi, place, r.kInfiltration * r.capaciteSol);
              m[b] += q; p[i] = pi - q; this.compteurs.infiltration += q; this.infiltrationRecente[b] += q;
            }
            this.accumulerPluie(i);
          } else this.accumulerPluie(i);
        }
      }
    }
    accumulerPluie(i) {
      if (this.p[i] >= this.r.seuilFlaque) {
        this.condenserCase(i, this.T[i] < 0 ? GLACE : EAU);
        if (this.typ[i] === EAU) this.drap[i] |= VENUE_DU_CIEL;
      }
    }

    // Une case d'air devient une case d'eau (liquide ou glace) : elle garde ses gouttelettes, sa
    // pluie et son givre ; sa vapeur passe dans une case d'air voisine (ou se condense dans la case).
    condenserCase(i, t, drapeau = 0) {
      const {nx, n, typ, v, d, c, p, T, m, h, drap} = this;
      const x = i % nx;
      const voisines = [i - nx, x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i + nx];
      let vap = v[i];
      for (const j of voisines) if (j >= 0 && j < n && typ[j] === AIR) { v[j] += vap; vap = 0; v[i] = 0; break; }
      const Ti = T[i];
      // (pas de case trop pleine : la pluie en trop passe dans l'air du dessus, s'il y en a)
      if (d[i] + p[i] + c[i] + vap > 1.25 && i >= nx && typ[i - nx] === AIR) {
        const q = Math.min(p[i], d[i] + p[i] + c[i] + vap - 1);
        p[i - nx] += q; p[i] -= q;
      }
      const M = d[i] + p[i] + c[i] + vap;
      if (M <= 0 || M > 1.25) return;   // (poche d'air fermée et très chargée : on attend)
      const H = (d[i] + p[i]) * hLiquide(Ti > 0 ? Ti : 0) + c[i] * C_GLACE * (Ti < 0 ? Ti : 0) + vap * hVapeur(Ti);
      typ[i] = t; drap[i] = drapeau;
      m[i] = M; h[i] = H / M; T[i] = temperatureDe(t, h[i]);
      v[i] = d[i] = c[i] = p[i] = 0;
    }

    // Une case d'eau épuisée redevient de l'air (à la température de l'eau)
    viderCase(i) {
      this.typ[i] = AIR; this.drap[i] = 0; this.m[i] = 0; this.h[i] = 0;
      this.v[i] = this.d[i] = this.c[i] = this.p[i] = 0;
    }

    // ---- Chaleur -------------------------------------------------------------
    ajouterEnergie(i, Q) {
      const t = this.typ[i];
      if (t === EAU || t === GLACE) {
        const mi = this.m[i];
        if (mi > 0) { this.h[i] += Q / mi; this.T[i] = temperatureDe(t, this.h[i]); }
      } else if (t === AIR) this.T[i] += Q / this.r.cAir;
      else {
        const C = this.capa(i);
        if (C !== Infinity) this.T[i] += Q / C;
      }
    }

    chaleur(fac = 1) {
      const L = this.actifs(), A = this.actifsLignes;
      const {n, nx, ny, typ, T, m, h, tAmb, K} = this, r = this.r;
      // Sources
      if (r.puissance === null) {
        for (let kk = 0; kk < L.length; kk++) {
          const i = L[kk], t = typ[i];
          if (t === CHAUD) T[i] = r.tChaud; else if (t === FROID) T[i] = r.tFroid;
        }
      } else {
        let nb = 0;
        for (let i = 0; i < n; i++) if (typ[i] === CHAUD) nb++; else if (typ[i] === FROID) T[i] = r.tFroid;
        this.nbChaud = nb;
        if (nb > 0) {
          const dT = r.puissance * r.dt / r.gParCase / nb / r.cPlaque;
          for (let i = 0; i < n; i++) if (typ[i] === CHAUD) T[i] += dT;
        }
      }
      if (r.soleil > 0 && r.colonnesSoleil) {
        // l'énergie du Soleil est absorbée par l'eau du haut de la colonne, selon sa masse (une
        // minuscule goutte n'en reçoit qu'une petite part, le reste passe à l'eau du dessous)
        for (const x of r.colonnesSoleil) {
          let reste = r.soleil * fac;
          for (let y = 0; y < ny && reste > 1e-9; y++) {
            const i = y * nx + x, t = typ[i];
            if (t === AIR) continue;
            if (t !== EAU && t !== GLACE) break;
            const q = reste * Math.min(1, m[i]);
            this.ajouterEnergie(i, q);
            reste -= q;
          }
        }
      }
      // Conduction entre voisines (droite et bas), mise à jour au fur et à mesure (stable : k ≤ 0,5),
      // puis retour de la case vers sa température ambiante (air de la pièce ou de l'atmosphère, sol, océan).
      const cAir = r.cAir, kVap = r.chaleurVapeur, v = this.v, cVerre = r.cVerre, cSol = r.cSol, cChaud = r.puissance === null ? Infinity : r.cPlaque;
      let cSolL = cSol;
      const ocean = r.ocean, rA = r.relaxAir * fac, rS = r.relaxSol * fac, rV = r.relaxVerre * fac, rO = r.relaxOcean * fac;
      // Cycle : le sol et la roche gardent leur température (celle de leur altitude, ou du sous-sol) :
      // ils échangent de la chaleur avec l'air et l'eau, mais pas entre eux (calcul plus rapide)
      const solFixe = r.solFixe;
      if (solFixe) { cSolL = Infinity; }
      for (let y = 0; y < ny; y++) {
        const base = y * nx, bas = y < ny - 1;
        for (let kk = A[y]; kk < A[y + 1]; kk++) {
          const i = L[kk], x = i - base, ti = typ[i], li = ti * NB_TYPES;
          const condI = ti === EAU || ti === GLACE;
          const terreI = ti === SOL || ti === ROCHE;
          for (let e = 0; e < 2; e++) {
            let j;
            if (e === 0) { if (x === nx - 1) continue; j = i + 1; } else { if (!bas) continue; j = i + nx; }
            const tj = typ[j];
            if (solFixe && terreI && (tj === SOL || tj === ROCHE)) continue;
            // sur le côté, de l'eau et une case d'air posée sur de l'eau : c'est la même surface d'eau,
            // déjà comptée par le dessus (sinon une ligne de surface à moitié vide perd deux fois plus)
            if (e === 0 && !ocean && ((ti === EAU && tj === AIR && j + nx < n && typ[j + nx] === EAU) || (ti === AIR && tj === EAU && i + nx < n && typ[i + nx] === EAU))) continue;
            let k = K[li + tj], reps = 1;
            if (k === 0) continue;
            // pas sur deux : taux doublé ; si ce serait instable (eau-eau), deux échanges successifs
            if (fac !== 1) { if (k * fac <= 0.45) k *= fac; else reps = fac; }
            for (let rr = 0; rr < reps; rr++) {
              const dT = T[i] - T[j];
              if (dT < 1e-4 && dT > -1e-4) break;
              // capacités qui règlent l'échange (l'air seul, sans sa vapeur : la vapeur ne rend pas
              // l'échange plus rapide) ; la variation de température, elle, tient compte de la vapeur
              const ci = ti === AIR ? cAir : ti === EAU ? C_EAU * m[i] : ti === GLACE ? C_GLACE * m[i]
                : ti === VERRE ? cVerre : terreI ? cSolL : ti === CHAUD ? cChaud : Infinity;
              const cj = tj === AIR ? cAir : tj === EAU ? C_EAU * m[j] : tj === GLACE ? C_GLACE * m[j]
                : tj === VERRE ? cVerre : (tj === SOL || tj === ROCHE) ? cSolL : tj === CHAUD ? cChaud : Infinity;
              // une case à température fixe (plaque, sol du cycle) : on prend la capacité de l'autre
              const Q = k * (ci < cj ? ci : cj === Infinity && ci === Infinity ? 0 : cj) * dT;
              const Qi = Q, Qj = Q;   // énergie que perd i, que reçoit j
              if (condI) { h[i] -= Qi / m[i]; T[i] = temperatureDe(ti, h[i]); }
              else if (ci !== Infinity) T[i] -= Qi / (ti === AIR ? ci + kVap * v[i] : ci);
              if (tj === EAU || tj === GLACE) { h[j] += Qj / m[j]; T[j] = temperatureDe(tj, h[j]); }
              else if (cj !== Infinity) T[j] += Qj / (tj === AIR ? cj + kVap * v[j] : cj);
            }
          }
          // (l'air humide a une capacité plus grande : le même échange avec le reste de la pièce le
          // change moins de température)
          if (ti === AIR) T[i] += rA * (tAmb[i] - T[i]) * (kVap > 0 ? cAir / (cAir + kVap * v[i]) : 1);
          else if (terreI) T[i] = solFixe ? tAmb[i] : T[i] + rS * (tAmb[i] - T[i]);
          else if (ti === VERRE) { if (rV > 0) T[i] += rV * (tAmb[i] - T[i]); }
          else if (ocean && condI && ocean[i]) {
            h[i] += rO * C_EAU * (tAmb[i] - T[i]);
            T[i] = temperatureDe(ti, h[i]);
          }
        }
      }
    }

    // Courants de convection dans chaque masse d'eau liquide (aussi de côté) : l'eau chauffée d'un côté
    // monte, l'eau froide descend, et toute la masse d'eau se mélange, d'autant plus vite que l'écart
    // de température y est grand. Seule la partie « sensible » de l'énergie est mélangée (les réserves
    // d'ébullition restent dans leur case) ; l'énergie totale ne change pas.
    melangerLiquides() {
      const {nx, n, typ, m, h, T, marqueEau: marque, pile, membres} = this, L = this.actifs();
      const kM = this.r.melangeLiquide, stamp = ++this.tamponEau;
      const liquide = i => typ[i] === EAU && h[i] >= L_F;
      // l'eau au contact d'une paroi ou d'une plaque plus chaude qu'elle (le fond chauffé) n'est pas
      // mélangée : elle s'y réchauffe jusqu'à 100 °C et c'est là que naissent les bulles
      const chauffee = i => {
        const x = i % nx, Ti = T[i];
        for (const j of [i + nx, i - nx, x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1]) {
          if (j < 0 || j >= n) continue;
          const tj = typ[j];
          if ((tj === CHAUD || tj === VERRE) && T[j] > Ti + 3) return true;
        }
        return false;
      };
      for (let kk = 0; kk < L.length; kk++) {
        const i0 = L[kk];
        if (marque[i0] === stamp || !liquide(i0)) continue;
        let sp = 0, nb = 0, sm = 0, sh = 0, hMin = Infinity, hMax = -Infinity;
        pile[sp++] = i0; marque[i0] = stamp;
        while (sp > 0) {
          const i = pile[--sp], x = i % nx;
          if (!chauffee(i)) {
            membres[nb++] = i;
            const sens = Math.min(h[i], H_EBU);
            sm += m[i]; sh += m[i] * sens; if (sens < hMin) hMin = sens; if (sens > hMax) hMax = sens;
          }
          if (x > 0 && marque[i - 1] !== stamp && liquide(i - 1)) { marque[i - 1] = stamp; pile[sp++] = i - 1; }
          if (x < nx - 1 && marque[i + 1] !== stamp && liquide(i + 1)) { marque[i + 1] = stamp; pile[sp++] = i + 1; }
          if (i >= nx && marque[i - nx] !== stamp && liquide(i - nx)) { marque[i - nx] = stamp; pile[sp++] = i - nx; }
          if (i + nx < n && marque[i + nx] !== stamp && liquide(i + nx)) { marque[i + nx] = stamp; pile[sp++] = i + nx; }
        }
        if (nb < 2 || sm <= 0) continue;
        const ecart = (hMax - hMin) / C_EAU;   // en °C
        const a = Math.min(0.3, kM * ecart);
        if (a < 1e-4) continue;
        const moy = sh / sm;
        for (let k = 0; k < nb; k++) {
          const i = membres[k], sens = Math.min(h[i], H_EBU), reserve = h[i] - sens;
          h[i] = sens + a * (moy - sens) + reserve;
          T[i] = temperatureDe(EAU, h[i]);
        }
      }
    }

    // Agitateur (expérience de fusion) : l'eau liquide et la glace pilée sont mélangées.
    // Le brassage échange des cases voisines et égalise la partie « sensible » de l'énergie de
    // l'eau liquide (les réserves d'ébullition restent dans leur case). L'énergie totale ne change pas.
    agiter() {
      const {nx, typ, drap, m, h, T, vu} = this, z = this.r.zoneAgitation, s = this.pas;
      let sm = 0, sh = 0;
      for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) {
        const i = y * nx + x;
        if (typ[i] === EAU && h[i] >= L_F) { sm += m[i]; sh += m[i] * Math.min(h[i], H_EBU); }
      }
      if (sm > 0) {
        const moy = sh / sm, a = 0.3;
        for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) {
          const i = y * nx + x;
          if (typ[i] !== EAU || h[i] < L_F) continue;
          const sens = Math.min(h[i], H_EBU), reserve = h[i] - sens;
          h[i] = sens + a * (moy - sens) + reserve;
          T[i] = temperatureDe(EAU, h[i]);
        }
      }
      const melangeable = i => typ[i] === EAU || (typ[i] === GLACE && (drap[i] & GRAIN));
      for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) {
        const i = y * nx + x;
        if (vu[i] === s || !melangeable(i) || this.alea() > 0.5) continue;
        const dir = Math.floor(this.alea() * 4), dist = 1 + Math.floor(this.alea() * 2);
        const xx = x + (dir === 0 ? dist : dir === 1 ? -dist : 0), yy = y + (dir === 2 ? dist : dir === 3 ? -dist : 0);
        if (xx < z.x0 || xx > z.x1 || yy < z.y0 || yy > z.y1) continue;
        const j = yy * nx + xx;
        if (vu[j] === s || !melangeable(j) || typ[j] === typ[i]) continue;
        this.echanger(i, j); vu[i] = vu[j] = s;
      }
    }

    // ---- Changements d'état --------------------------------------------------
    etats(fac = 1, deposer = true) {
      const L = this.actifs(), A = this.actifsLignes;
      const {n, nx, typ, drap, m, h, T, v, d, c, p} = this, r = this.r, cpt = this.compteurs;
      // Sites de bulles : dans une rangée de cases d'eau qui ont dépassé 100 °C (réserve d'ébullition),
      // la réserve se rassemble dans la case qui en a le plus : une bulle y naît dès qu'il y a de quoi,
      // au lieu que toutes les cases du fond bouillent ensemble bien plus tard (énergie conservée).
      if (r.sitesBulles) {
        for (let kk = 0; kk < L.length; kk++) {
          const i = L[kk];
          if (typ[i] !== EAU || h[i] <= H_EBU || m[i] < 0.5) continue;
          const x = i % nx, Ri = (h[i] - H_EBU) * m[i];
          let j = -1, Rj = -1;
          for (const k of [x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1]) {
            if (k < 0 || typ[k] !== EAU || h[k] <= H_EBU || m[k] < 0.5) continue;
            const Rk = (h[k] - H_EBU) * m[k];
            if (Rk > Rj) { Rj = Rk; j = k; }
          }
          if (j < 0) continue;
          if (Rj > Ri || (Rj === Ri && ((x * 13 + this.pas) & 1))) {
            h[i] = H_EBU; T[i] = 100;
            h[j] += Ri / m[j]; T[j] = temperatureDe(EAU, h[j]);
          }
        }
      }
      const hMax = H_EBU + L_V + 10 * r.cAir * 100;   // au-delà, une case qui ne peut pas bouillir rend l'énergie
      for (let kk = 0; kk < L.length; kk++) { const i = L[kk];
        const t = typ[i];
        if (t === EAU && h[i] > hMax) {
          // case d'eau qui accumule de l'énergie sans pouvoir bouillir (bloquée) : l'excès va à l'eau
          // voisine, ou retourne à la plaque à température imposée qui la chauffe
          const x = i % nx, E = (h[i] - hMax) * m[i];
          let fait = false;
          for (const j of [i - nx, x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i + nx]) {
            if (j < 0 || j >= n || fait) continue;
            if (typ[j] === EAU && h[j] < hMax) { h[j] += E / m[j]; T[j] = temperatureDe(EAU, h[j]); fait = true; }
            else if (typ[j] === CHAUD && r.puissance === null) fait = true;
          }
          if (fait) h[i] = hMax;
        }
        if (t === EAU) {
          if (h[i] < 0) { typ[i] = GLACE; drap[i] = 0; T[i] = temperatureDe(GLACE, h[i]); cpt.solidification += m[i]; }
          // seuil de la bulle : vaporiser toute la case, et chauffer à 100 °C l'« air » de la case
          // qu'elle devient (sa capacité thermique ; l'énergie est ainsi conservée)
          else if (m[i] >= 0.2 && h[i] >= H_EBU + L_V + r.cAir * 100 / m[i] && i >= nx && typ[i - nx] === EAU && T[i - nx] < 99) {
            // une bulle ne se forme pas dans une eau à moins de 99 °C : la vapeur s'écrase aussitôt
            // contre la paroi et rend sa chaleur à l'eau du dessus (énergie conservée)
            const a = i - nx, E = Math.min((h[i] - H_EBU) * m[i], Math.max(0, H_EBU - h[a]) * m[a]);
            h[i] -= E / m[i]; T[i] = temperatureDe(EAU, h[i]);
            h[a] += E / m[a]; T[a] = temperatureDe(EAU, h[a]);
          } else if (m[i] < 0.2 && h[i] >= H_EBU + L_V) {
            // une toute petite quantité d'eau qui bout se vaporise dans l'air voisin (pas de bulle)
            const x = i % nx;
            for (const j of [i - nx, x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i + nx]) {
              if (j < 0 || j >= n || typ[j] !== AIR) continue;
              const mi = m[i], cj = r.cAir + r.chaleurVapeur * (v[j] + d[j]);
              const E = mi * h[i] - mi * hVapeur(T[j]);   // énergie en plus de celle de la vapeur à la température de l'air
              v[j] += mi; T[j] = Math.min(Math.max(T[j], 100), T[j] + E / (cj + r.chaleurVapeur * mi));
              cpt.ebullition += mi;
              const Tj = T[j]; this.viderCase(i); T[i] = Tj;
              break;
            }
          } else if (m[i] >= 0.2 && h[i] >= H_EBU + L_V + r.cAir * 100 / m[i]) {
            // ébullition : toute la case est devenue vapeur, c'est une bulle
            const mi = m[i];
            let reste = mi * (h[i] - H_EBU - L_V) - r.cAir * 100;   // énergie en plus
            // l'énergie en plus va à l'eau voisine (la bulle naît à 100 °C)
            const x = i % nx;
            let plaque = false, receveur = -1;
            for (const j of [i + nx, x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i - nx]) {
              if (j < 0 || j >= n) continue;
              if (typ[j] === CHAUD) plaque = true;
              if (receveur < 0 && typ[j] === EAU) receveur = j;
            }
            if (reste > 0 && receveur >= 0) { h[receveur] += reste / m[receveur]; T[receveur] = temperatureDe(EAU, h[receveur]); reste = 0; }
            // sinon, contre une plaque à température imposée, elle la garde (la plaque est un thermostat)
            if (reste > 0 && plaque) reste = 0;
            if (reste > 5 * (r.cAir + r.chaleurVapeur * mi)) continue;   // pas de bulle trop chaude : attendre
            typ[i] = AIR; drap[i] = 0; m[i] = 0; h[i] = 0;
            v[i] = mi; d[i] = c[i] = p[i] = 0;
            T[i] = 100 + reste / (r.cAir + r.chaleurVapeur * mi);
            cpt.ebullition += mi; cpt.bulles++;
          }
        } else if (t === GLACE) {
          if (h[i] >= L_F) { typ[i] = EAU; drap[i] = 0; T[i] = temperatureDe(EAU, h[i]); cpt.fusion += m[i]; }
        }
      }
      // Échanges de vapeur à la surface de l'eau et de la glace
      for (let kk = 0; kk < L.length; kk++) { const i = L[kk];
        const t = typ[i];
        if (t !== EAU && t !== GLACE) continue;
        const x = i % nx;
        if (i >= nx && typ[i - nx] === AIR) { this.surface(i, i - nx); if (typ[i] === AIR) continue; }
        // (sur le côté : pas d'échange avec une case d'air posée sur de l'eau — c'est la même surface,
        // déjà comptée par le dessus de l'eau voisine ; sinon une ligne de surface à moitié vide
        // s'évaporerait deux fois plus)
        // (océan du cycle : pas concerné, son évaporation a été réglée ainsi)
        const oc = r.ocean && r.ocean[i];
        if (x > 0 && typ[i - 1] === AIR && (oc || !(i - 1 + nx < n && typ[i - 1 + nx] === EAU))) { this.surface(i, i - 1); if (typ[i] === AIR) continue; }
        if (x < nx - 1 && typ[i + 1] === AIR && (oc || !(i + 1 + nx < n && typ[i + 1 + nx] === EAU))) { this.surface(i, i + 1); if (typ[i] === AIR) continue; }
        if (i + nx < n && typ[i + nx] === AIR) this.surface(i, i + nx);
      }
      if (deposer) this.deposerSurFroid(fac);
      // Dans l'air : condensation (gouttelettes, givre), évaporation des gouttelettes, sublimation
      const cAir0 = r.cAir, kv = r.chaleurVapeur, bords = r.bordsSolides, depot = r.depotGouttelettes;
      for (let kk = 0; kk < L.length; kk++) { const i = L[kk];
        if (typ[i] !== AIR) continue;
        const Ti = T[i];
        // bulle de vapeur qui monte dans une eau plus froide que 100 °C : elle s'y condense (elle
        // « s'écrase ») et lui rend son énergie (ébullition dans une eau pas encore à 100 °C)
        if (i >= nx && typ[i - nx] === EAU && v[i] > 0 && T[i - nx] < 99) {
          const a = i - nx, f = T[a] < 98 ? 1 : Math.min(1, 0.2 + 0.8 * (99 - T[a]));
          const q = Math.min(f * v[i], Math.max(0, 1.25 - m[a])), ma = m[a];   // (sans trop remplir la case)
          if (q > 0) {
            h[a] = (h[a] * ma + q * hVapeur(Ti)) / (ma + q); m[a] = ma + q; T[a] = temperatureDe(EAU, h[a]);
            v[i] -= q; cpt.condensationLiquide += q;
          }
          // eau froide au-dessus et plus de place : le reste de la bulle se condense sur place
          if (T[a] < 98 && v[i] > 0 && typ[i] === AIR) {
            const vi = v[i];
            this.condenserCase(i, EAU);
            if (typ[i] === EAU) { cpt.condensationLiquide += vi; continue; }
          }
        }
        const cAir = cAir0 + kv * (v[i] + d[i] + p[i]) + (kv > 0 ? C_GLACE * c[i] : 0);   // l'air de la case, avec sa vapeur, ses gouttelettes, sa pluie, son givre
        const sL = satLiquide(Ti);
        // rien à faire : ni gouttelettes ni givre, et vapeur sous la saturation (sur la glace si T < 0)
        if (d[i] === 0 && c[i] === 0 && v[i] <= (Ti >= 0 ? sL : satGlace(Ti))) continue;
        const x = i % nx;
        let solide = false, liquide = false, tj, tSol = Infinity;   // tSol : la surface solide touchée la plus froide
        if (i >= nx) { tj = typ[i - nx]; if (tj === EAU) liquide = true; else if (tj !== AIR) { solide = true; if (T[i - nx] < tSol) tSol = T[i - nx]; } } else solide = solide || bords;
        if (i + nx < n) { tj = typ[i + nx]; if (tj === EAU) liquide = true; else if (tj !== AIR) { solide = true; if (T[i + nx] < tSol) tSol = T[i + nx]; } } else solide = solide || bords;
        if (x > 0) { tj = typ[i - 1]; if (tj === EAU) liquide = true; else if (tj !== AIR) { solide = true; if (T[i - 1] < tSol) tSol = T[i - 1]; } } else solide = solide || bords;
        if (x < nx - 1) { tj = typ[i + 1]; if (tj === EAU) liquide = true; else if (tj !== AIR) { solide = true; if (T[i + 1] < tSol) tSol = T[i + 1]; } } else solide = solide || bords;
        const surfaceGelee = tSol < 0;   // le givre déposé sur une surface sous 0 °C ne fond pas
        if (Ti < 0 && solide) {
          // contre une surface sous 0 °C : condensation solide (givre)
          const s = satGlace(Ti), ecart = v[i] - s;
          const Lat = L_F + L_V;
          if (ecart > 0) {
            // (la chaleur libérée ne porte pas l'air au-dessus de 0 °C, ni, plus bas, au-dessus de 100 °C :
            // sans pression, une vapeur très concentrée reste en partie sursaturée au lieu de chauffer l'air)
            const q = Math.min(0.8 * ecart / (1 + Lat / cAir * penteTable(TAB_S, Ti)), Math.max(0, -Ti) * cAir / Lat);
            v[i] -= q; c[i] += q; T[i] += Lat * q / cAir; cpt.condensationSolide += q;
          } else if (c[i] > 0) {
            const q = Math.min(c[i], -0.8 * ecart / (1 + Lat / cAir * penteTable(TAB_S, Ti)), 2 * cAir / Lat);
            c[i] -= q; v[i] += q; T[i] -= Lat * q / cAir; cpt.sublimation += q;
          }
          if (d[i] > 0) {   // les gouttelettes gèlent sur la surface froide (givre)
            const q = Math.min(d[i], 0.2 * d[i] + 1e-6);
            d[i] -= q; c[i] += q; T[i] += L_F * q / cAir; cpt.solidification += q;
          }
          if (c[i] >= r.seuilGivre) this.condenserCase(i, GLACE, GIVRE);
          continue;
        }
        if (surfaceGelee && c[i] >= r.seuilGivre) { this.condenserCase(i, GLACE, GIVRE); continue; }
        if (c[i] > 0 && !surfaceGelee) {
          if (Ti >= 0) {   // givre qui fond (fusion) en gouttelettes
            const q = Math.min(c[i], 0.2 * c[i] + 1e-6, 2 * cAir / L_F);
            c[i] -= q; d[i] += q; T[i] -= L_F * q / cAir; cpt.fusion += q;
          } else {          // givre loin de toute surface : il se sublime ou grossit
            const ecart = v[i] - satGlace(Ti);
            const q = Math.max(-c[i], Math.min(v[i], 0.5 * ecart, Math.max(0, -Ti) * cAir / (L_F + L_V)));   // (le givre ne porte pas l'air au-dessus de 0 °C)
            c[i] += q; v[i] -= q; T[i] += (L_F + L_V) * q / cAir;
            if (q < 0) cpt.sublimation -= q; else cpt.condensationSolide += q;
          }
        }
        // au contact de l'eau liquide, la vapeur se condense sur l'eau (voir surface). Au-dessus de l'eau
        // qui bout, l'air est réchauffé par la vapeur chaude : il n'est pas saturé et reste clair ; la
        // brume se forme plus haut, là où cet air se mélange à l'air plus froid. (Les gouttelettes qui
        // arrivent dans cet air non saturé s'y évaporent, comme partout ailleurs.)
        if (liquide) {
          const ecart = v[i] - sL;
          if (d[i] > 0 && ecart < 0) {
            let q = -0.8 * ecart / (1 + L_V / cAir * penteTable(TAB_L, Ti));
            if (q >= d[i] || d[i] < 1e-12) q = d[i];
            d[i] -= q; v[i] += q; T[i] -= L_V * q / cAir; cpt.evaporation += q;
          }
          continue;
        }
        if (solide && d[i] > 0) {   // les gouttelettes se déposent sur une paroi (buée) puis ruissellent
          const q = depot * d[i];
          d[i] -= q; p[i] += q;
        }
        const ecart = v[i] - sL;
        if (ecart > 0) {
          const q = Math.min(0.8 * ecart / (1 + L_V / cAir * penteTable(TAB_L, Ti)), Math.max(0, 100 - Ti) * cAir / L_V);
          v[i] -= q; d[i] += q; T[i] += L_V * q / cAir; cpt.condensationLiquide += q;
        } else if (d[i] > 0) {
          let q = -0.8 * ecart / (1 + L_V / cAir * penteTable(TAB_L, Ti));
          if (q >= d[i] || d[i] < 1e-12) q = d[i];
          d[i] -= q; v[i] += q; T[i] -= L_V * q / cAir; cpt.evaporation += q;
        }
      }
    }

    // Dépôt sur une surface froide (paroi, plaque froide, sol, roche) : la vapeur de l'air qui la
    // touche se condense à la température de la surface, en givre sous 0 °C (condensation solide),
    // en buée au-dessus (condensation liquide). L'énergie libérée va à la surface.
    deposerSurFroid(fac = 1) {
      const L = this.actifs(), A = this.actifsLignes;
      const {n, nx, typ, T, v, d, c} = this, k = Math.min(0.8, this.r.depotSurface * fac), cpt = this.compteurs;
      if (!(k > 0)) return;
      for (let kk = 0; kk < L.length; kk++) { const i = L[kk];
        const t = typ[i];
        if (t === AIR || t === EAU || t === GLACE || t === CHAUD) continue;
        const Ts = T[i];
        if (Ts > 35) continue;
        const x = i % nx;
        // d'abord : touche-t-elle de l'air plus chaud qu'elle ? (la plupart des cases de roche : non)
        if (!((i >= nx && typ[i - nx] === AIR && T[i - nx] > Ts) || (i + nx < n && typ[i + nx] === AIR && T[i + nx] > Ts)
          || (x > 0 && typ[i - 1] === AIR && T[i - 1] > Ts) || (x < nx - 1 && typ[i + 1] === AIR && T[i + 1] > Ts))) continue;
        const gele = Ts < 0, s = gele ? satGlace(Ts) : satLiquide(Ts), Lat = gele ? L_F + L_V : L_V;
        for (let e = 0; e < 4; e++) {
          const j = e === 0 ? i - nx : e === 1 ? i + nx : e === 2 ? (x > 0 ? i - 1 : -1) : (x < nx - 1 ? i + 1 : -1);
          if (j < 0 || j >= n || typ[j] !== AIR || T[j] <= Ts) continue;
          const ex = v[j] - s;
          if (ex <= 0) continue;
          // (la chaleur libérée ne porte pas la surface au-dessus de la température de l'air qui la touche)
          const C = this.capa(i);
          const q = Math.min(k * ex, C === Infinity ? Infinity : Math.max(0, T[j] - T[i]) * C / Lat);
          if (q <= 0) continue;
          v[j] -= q;
          if (gele) { c[j] += q; cpt.condensationSolide += q; } else { d[j] += q; cpt.condensationLiquide += q; }
          this.ajouterEnergie(i, Lat * q);
        }
      }
    }

    // Échange de vapeur entre une case d'eau (i) et une case d'air (j) :
    // évaporation ou condensation liquide (eau liquide) ; sublimation ou condensation solide (glace).
    // L'énergie de changement d'état est prise (ou rendue) à l'eau et à l'air, selon leurs capacités.
    surface(i, j) {
      const {typ, m, h, T, v} = this, r = this.r, cpt = this.compteurs;
      const liquide = typ[i] === EAU;
      const Ti = T[i];
      let s = liquide ? satLiquide(Ti) : satGlace(Ti);
      // Cycle de l'eau : l'air au-dessus de la mer est vite brassé ; l'évaporation s'arrête quand
      // l'air touché approche de sa propre saturation (pas de brouillard posé sur l'océan).
      if (r.plafondAir > 0 && liquide) { const sa = r.plafondAir * satLiquide(T[j]); if (sa < s) s = sa; }
      const ecart = s - v[j];
      const mi = m[i];
      const Ci = (liquide ? C_EAU : C_GLACE) * mi, phi = Ci / (Ci + r.cAir);   // part prise à l'eau
      const L = Math.max(0, hVapeur(Ti) - h[i]);   // énergie par gramme pour passer de la case à la vapeur
      if (ecart > 0) {
        // l'évaporation est limitée par le départ de la vapeur loin de la surface : son débit
        // plafonne (sinon, près de 100 °C, elle prendrait toute l'énergie avant l'ébullition)
        // (cycle : l'eau des rivières et des bassins s'évapore bien moins que la surface de l'océan,
        // chauffée par le Soleil et balayée par le vent du large)
        const kL = r.ocean && r.kEvapTerre !== null && !r.ocean[i] ? r.kEvapTerre : r.kEvap;
        // l'eau très chaude « fume » : au-dessus de 85 °C, le plafond monte (vapeur abondante à 100 °C)
        const plafond = liquide && r.evapChaud > 0 && Ti > 85 ? r.evapMax + r.evapChaud * Math.min(1, (Ti - 85) / 15) : r.evapMax;
        let q = (liquide ? kL : r.kSubl) * (ecart < plafond ? ecart : plafond);
        if (q > mi) q = mi;
        // L'énergie de vaporisation est prise à l'eau (sans la refroidir de plus de 3 °C par pas,
        // ni geler de l'eau liquide) et, pour le reste, à l'air (au plus 3 °C par pas). Une eau chaude
        // fournit elle-même toute cette énergie (c'est elle qui chauffe l'air, pas l'inverse).
        const chaude = liquide && Ti > 30 ? Math.min(1, (Ti - 30) / 30) : 0;
        const phiE = phi + (1 - phi) * chaude;
        const parCase = liquide ? Math.max(0, Math.min((3 + 5 * chaude) * C_EAU, h[i] - L_F)) : 3 * C_GLACE;
        let E = q * L, eCase = Math.min(phiE * E, (mi - q) * parCase), eAir = E - eCase;
        if (eAir > 3 * r.cAir) {
          q *= 3 * r.cAir / eAir;
          E = q * L; eCase = Math.min(phiE * E, (mi - q) * parCase); eAir = E - eCase;
        }
        if (q <= 0) return;
        const reste = mi - q;
        if (liquide) cpt.evaporation += q; else cpt.sublimation += q;
        if (reste <= 1e-9) {
          // la case est épuisée : tout ce qui reste passe dans l'air
          v[j] += mi;
          T[j] -= L * mi / (r.cAir + r.chaleurVapeur * v[j]);
          const Tair = T[j];
          this.viderCase(i);
          T[i] = Tair;
          return;
        }
        v[j] += q;
        h[i] -= eCase / reste;
        m[i] = reste;
        T[i] = temperatureDe(typ[i], h[i]);
        const cJ = r.cAir + r.chaleurVapeur * (v[j] - q);
        T[j] -= eAir / cJ;
        // la vapeur sort à la température de l'eau : en se mélangeant à l'air, elle le réchauffe
        // (ou le refroidit) — l'énergie est comptée : la vapeur est ensuite à la température de l'air
        if (liquide && r.chaleurVapeur > 0) T[j] += q * r.chaleurVapeur * (Ti - T[j]) / (cJ + q * r.chaleurVapeur);
      } else if (ecart < 0) {
        // condensation sur l'eau (ou la glace) ; une case ne se remplit pas au-delà de 1,25
        const q = Math.min(v[j], -ecart * (liquide ? r.kEvap : r.kSubl) * 2, -0.5 * ecart, 1.25 - mi);
        if (q <= 0) return;
        v[j] -= q;
        if (r.chaleurVapeur > 0) {
          // la vapeur (à la température de l'air) se condense sur l'eau ou la glace et lui donne toute
          // son énergie ; l'air perd seulement la capacité de cette vapeur (sa température ne change pas)
          h[i] = (h[i] * mi + q * hVapeur(T[j])) / (mi + q);
        } else {
          const E = q * L;
          h[i] = (h[i] * mi + q * h[i] + phi * E) / (mi + q);
          T[j] += (1 - phi) * E / r.cAir;
        }
        m[i] = mi + q;
        T[i] = temperatureDe(typ[i], h[i]);
        if (liquide) cpt.condensationLiquide += q; else cpt.condensationSolide += q;
      }
    }

    // ---- Eau du sol (cycle de l'eau) ------------------------------------------
    // Eau du sol : le sol perméable retient de l'eau dans les petits espaces entre ses grains
    // (au plus capaciteSol par case) ; la roche, elle, est bien moins perméable. L'eau infiltrée descend ;
    // presque arrêtée par la roche, elle s'accumule et remplit tous ces petits espaces : c'est
    // la nappe phréatique (cases saturées). La nappe s'écoule lentement dans le sol vers le bas de
    // la pente ; là où elle atteint la surface (au bout de la couche de sol, où la roche affleure),
    // l'eau ressort : c'est une source, qui alimente la rivière.
    eauDuSol(fac = 1) {
      const L = this.actifs(), A = this.actifsLignes;
      const {n, nx, typ, m, h, T, v, p} = this, r = this.r, cap = r.capaciteSol, cpt = this.compteurs, ocean = r.ocean;
      const haut = r.hautSol, plein = 0.95 * cap;
      if (this.pas % 10 < 2 || this.nappeMasse === undefined) this.nappeMasse = this.eauSouterraine().nappe;   // (un pas sur deux dans le cycle)
      let permisSource = r.kReservoir > 0 ? r.kReservoir * fac * this.nappeMasse : Infinity;
      const rec = this.infiltrationRecente;
      let profondM = 0, profondH = 0;
      for (let kk = 0; kk < L.length; kk++) { const i = L[kk];
        if (typ[i] !== SOL) continue;
        rec[i] *= 0.997;
        const x = i % nx;
        // infiltration : l'eau liquide posée sur le sol y entre
        const a = i - nx;
        if (a >= 0 && typ[a] === EAU && m[i] < cap && !(ocean && ocean[a])) {
          let q = Math.min(m[a], (r.kInfiltration * fac) * (cap - m[i]) * 4);
          if (m[a] - q < 1e-6) q = m[a];
          m[i] += q; m[a] -= q; cpt.infiltration += q; this.infiltrationRecente[i] += q;
          if (m[a] <= 0) { const Ta = T[a]; this.viderCase(a); T[a] = Ta; }
        }
        // l'eau du sol descend, d'autant plus vite que le sol est mouillé (un sol sec retient l'eau) :
        // après une averse, on voit un front d'humidité descendre
        const b = i + nx;
        if (b < n && typ[b] === SOL && m[b] < cap && m[i] > 0) {
          const f = m[i] / cap;
          const q = Math.min(m[i] * f * f * (r.kSolBas * fac), cap - m[b]);
          m[i] -= q; m[b] += q;
        }
        // … goutte du plafond d'une cavité (l'eau qui traverse la roche fissurée y tombe)…
        if (b < n && typ[b] === AIR && m[i] > 0.5 * cap && r.hautSol && ((b / nx) | 0) > r.hautSol[x]) {
          const q = (r.kSolBas * fac) * (m[i] - 0.5 * cap);
          m[i] -= q; p[b] += q; cpt.goutteCavite += q;
        }
        // … se répand un peu dans le sol non saturé…
        if (x < nx - 1 && typ[i + 1] === SOL) { const q = (r.kSolCote * fac) * (m[i] - m[i + 1]); m[i] -= q; m[i + 1] += q; }
        // … et, dans la nappe, s'écoule lentement vers le bas de la pente
        if (haut && m[i] > plein) {
          for (let e = -1; e <= 1; e += 2) {
            const xj = x + e;
            if (xj < 0 || xj >= nx || haut[xj] <= haut[x]) continue;   // vers la colonne plus basse seulement
            const j = i + e;
            if (typ[j] !== SOL || m[j] >= cap) continue;
            const q = Math.min((r.kNappe * fac) * (m[i] - m[j]), cap - m[j]);
            if (q > 0) { m[i] -= q; m[j] += q; }
          }
        }
        // source : une case saturée qui touche l'air, au-dessus de la roche (là où la couche de sol
        // s'arrête), laisse sortir son eau ; ailleurs, le sol saturé ne laisse plus entrer la pluie,
        // qui ruisselle. Le débit de la source est proportionnel à l'eau de la nappe : il baisse quand
        // la nappe baisse (comme une vraie source en saison sèche).
        if (m[i] > plein && permisSource > 0) {
          const voisines = [x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1];
          for (const j of voisines) {
            if (j < 0 || typ[j] !== AIR || m[i] <= 0.9 * cap) continue;
            if (j + nx >= n || (typ[j + nx] !== ROCHE && typ[j + nx] !== EAU)) continue;   // au contact de la roche (ou dans l'eau)
            const q = Math.min(permisSource, (r.kSource * fac) * (m[i] - 0.9 * cap));
            if (q <= 0) continue;
            permisSource -= q;
            m[i] -= q; p[j] += q; cpt.source += q;
            this.accumulerPluie(j);
          }
        }
        // écoulement profond : là où la nappe a plus de 2 cases d'épaisseur, une partie de son eau
        // passe dans la roche, en profondeur, et rejoint l'océan (sources sous-marines, comme sur la
        // côte de La Réunion) ; la nappe ne remplit donc pas toute la couche de sol
        if (r.kProfond > 0 && m[i] > plein && b < n && typ[b] !== SOL && i - 2 * nx >= 0
            && typ[i - nx] === SOL && m[i - nx] > plein && typ[i - 2 * nx] === SOL && m[i - 2 * nx] > plein) {
          let ep = 3;   // épaisseur saturée de la colonne (en cases)
          while (ep < 8 && i - ep * nx >= 0 && typ[i - ep * nx] === SOL && m[i - ep * nx] > plein) ep++;
          const q = Math.min(m[i] - plein, (r.kProfond * fac) * (ep - 2) * cap);   // la case du fond reste saturée
          if (q > 0) {
            // mise de côté, puis répartie à la fin sur toute la surface de la mer au vent
            profondM += q; profondH += q * hLiquide(Math.max(0, T[i]));
            m[i] -= q; cpt.versOcean += q; cpt.profond += q;
          }
        }
        // l'eau du sol rejoint l'océan là où le sol le touche
        if (ocean && m[i] > 0) {
          for (const j of [i + 1, i - 1, b]) {
            if (j < 0 || j >= n || typ[j] !== EAU || !ocean[j]) continue;
            const q = (r.kSortieSol * fac) * m[i];
            const mj = m[j];
            h[j] = (h[j] * mj + q * hLiquide(Math.max(0, T[i]))) / (mj + q);
            m[j] = mj + q; T[j] = temperatureDe(EAU, h[j]);
            m[i] -= q; cpt.versOcean += q;
          }
        }
        // le sol mouillé s'évapore un peu
        if (a >= 0 && typ[a] === AIR && m[i] > 0) {
          const manque = satLiquide(T[a]) - v[a];
          if (manque > 0) {
            const q = Math.min(m[i], (r.kEvapSol * fac) * manque * (m[i] / cap), r.cAir / L_V);
            m[i] -= q; v[a] += q; T[a] -= L_V * q / r.cAir; cpt.evaporation += q;
          }
        }
      }
      if (profondM > 0) this.verserDansLaMer(this.r.mers ? this.r.mers[0] : null, profondM, profondH / profondM);
      // la cavité se vide lentement par son conduit, vers la résurgence (débit proportionnel à son eau)
      const cav = r.cavite;
      if (cav && r.kCavite > 0 && typ[cav.sortie] === AIR) {
        let haut = -1, masse = 0;
        for (let y = cav.y0; y <= cav.y1; y++) for (let x = cav.x0; x <= cav.x1; x++) { const i = y * nx + x; if (typ[i] === EAU) { masse += m[i]; if (haut < 0) haut = i; } }
        if (haut >= 0) {
          let q = Math.min(m[haut] * 0.5, r.kCavite * fac * masse);
          if (m[haut] - q < 1e-6) q = m[haut];
          const Ti = T[haut];
          m[haut] -= q;
          p[cav.sortie] += q;
          cpt.resurgence += q;
          if (m[haut] < 1e-6) { this.viderCase(haut); T[haut] = Ti; }
          this.accumulerPluie(cav.sortie);
        }
      }
    }

    // Verse de l'eau (masse M, enthalpie massique hq) à la surface d'une mer, répartie sur toutes ses
    // colonnes (jamais dans une seule case : aucune case ne se remplit au-delà de sa place)
    verserDansLaMer(b, M, hq) {
      const {nx, ny, typ, m, h, T} = this, ocean = this.r.ocean;
      const cibles = [];
      if (b) for (let x = b.x0; x <= b.x1; x++) {
        let y = 0;
        while (y < ny && !(ocean[y * nx + x] && typ[y * nx + x] === EAU)) y++;
        if (y < ny) cibles.push(y * nx + x);
      }
      if (!cibles.length) { for (let i = 0; i < this.n; i++) if (ocean && ocean[i] && typ[i] === EAU) { cibles.push(i); break; } }
      if (!cibles.length) return;
      const q = M / cibles.length;
      for (const i of cibles) { h[i] = (h[i] * m[i] + q * hq) / (m[i] + q); m[i] += q; T[i] = temperatureDe(EAU, h[i]); }
    }

    // Masse d'eau de la nappe (cases de sol saturées) et du reste du sol, en cases d'eau
    eauSouterraine() {
      const {n, typ, m} = this, plein = 0.95 * this.r.capaciteSol;
      let nappe = 0, sol = 0;
      for (let i = 0; i < n; i++) if (typ[i] === SOL && !(this.drap[i] & FISSURE)) { if (m[i] > plein) nappe += m[i]; else sol += m[i]; }
      return {nappe, sol};
    }

    // Haut de la nappe dans la colonne x : la plus haute case saturée reliée par des cases saturées
    // au fond de la couche de sol ; -1 s'il n'y a pas de nappe dans cette colonne.
    niveauNappe(x) {
      const {nx, ny, typ, m} = this, plein = 0.95 * this.r.capaciteSol;
      const drap = this.drap, estSol = j => typ[j] === SOL && !(drap[j] & FISSURE);
      let y = ny - 1;
      while (y >= 0 && !estSol(y * nx + x)) y--;               // fond de la couche de sol (pas la roche fissurée)
      if (y < 0 || m[y * nx + x] <= plein) return -1;
      while (y - 1 >= 0 && estSol((y - 1) * nx + x) && m[(y - 1) * nx + x] > plein) y--;
      return y;
    }

    // ---- Regrouper les petites quantités d'eau liquide, partager les trop grosses -----
    regrouper() {
      this.regrouperCases();
      // pour finir, de bas en haut : aucune case d'eau ne reste trop pleine (l'excès monte jusqu'à la
      // surface ; à la surface, au-delà de 1,25, il forme une case au-dessus)
      const L = this.actifs(), {nx, typ, m, h, T} = this;
      for (let tour = 0; tour < 8; tour++) {
      let reste = false;
      for (let kk = L.length - 1; kk >= 0; kk--) {
        const i = L[kk];
        if (typ[i] === GLACE && m[i] > 1.25) {
          // glace trop pleine : l'excès va à une glace ou une eau voisine qui a de la place, sinon dans l'air
          reste = true;
          const x = i % nx;
          for (const j of [i - nx, x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i + nx]) {
            if (j < 0 || j >= this.n || m[i] <= 1.25) continue;
            if ((typ[j] === GLACE || typ[j] === EAU) && m[j] < 1.25) {
              const q = Math.min(m[i] - 1.25, 1.25 - m[j]), mj = m[j];
              h[j] = (h[j] * mj + q * h[i]) / (mj + q); m[j] = mj + q;
              if (typ[j] === GLACE && h[j] >= L_F) typ[j] = EAU; else if (typ[j] === EAU && h[j] < 0) typ[j] = GLACE;
              T[j] = temperatureDe(typ[j], h[j]); m[i] -= q;
            }
          }
          for (const j of [i - nx, x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1]) if (j >= 0 && m[i] > 1.25 && typ[j] === AIR) this.deborder(i, j);
          if (m[i] > 1.25) this.evacuerExces(i);
          continue;
        }
        if (typ[i] !== EAU || m[i] <= 1) continue;
        if (i < nx) { if (m[i] > 1.25) this.evacuerExces(i); continue; }   // (ligne du haut de la scène)
        if (m[i] > 1.25) reste = true;
        const a = i - nx;
        if (typ[a] === EAU) {
          const q = m[i] - 1, ma = m[a];
          h[a] = (h[a] * ma + q * h[i]) / (ma + q); m[a] = ma + q; T[a] = temperatureDe(EAU, h[a]);
          m[i] = 1;
        } else if (typ[a] === AIR) { if (m[i] > 1.25) { this.deborder(i, a); if (m[i] > 1.25) this.evacuerExces(i); } }
        else this.evacuerExces(i);   // couverte (paroi, glace) : l'eau en trop va ailleurs dans la même eau
      }
      if (!reste) break;
      }
    }

    regrouperCases() {
      const L = this.actifs(), A = this.actifsLignes;
      const {n, nx, typ, drap, m, h, T, v} = this;
      for (let kk = 0; kk < L.length; kk++) { const i = L[kk];
        const t = typ[i];
        if (t !== EAU && t !== GLACE) continue;
        const mi = m[i];
        if (t === EAU && mi < 0.98) {
          const x = i % nx;
          const cand = [i + nx, x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1];
          for (const j of cand) {
            if (j < 0 || j >= n || typ[j] !== EAU || m[j] >= 1) continue;
            let q = Math.min(m[i], 1 - m[j]);
            if (m[i] - q < 1e-6) q = m[i];
            const mj = m[j];
            h[j] = (h[j] * mj + q * h[i]) / (mj + q);
            m[j] = mj + q; T[j] = temperatureDe(EAU, h[j]);
            if (drap[i] & VENUE_DU_CIEL) {
              if (this.r.ocean && this.r.ocean[j]) this.compteurs.versOcean += q;   // eau de pluie arrivée à l'océan
              else drap[j] |= VENUE_DU_CIEL;
            }
            m[i] -= q;
            if (m[i] <= 0) { const Ti = T[i]; this.viderCase(i); T[i] = Ti; break; }
          }
        } else if (t === EAU && mi > 1 && i >= nx && typ[i - nx] === EAU) {
          // case trop pleine sous de l'eau : l'excès monte d'une case (il finit à la surface)
          const a = i - nx, q = mi - 1, ma = m[a];
          h[a] = (h[a] * ma + q * h[i]) / (ma + q); m[a] = ma + q; T[a] = temperatureDe(EAU, h[a]);
          m[i] = 1;
        } else if (mi > 1.25 && i >= nx && typ[i - nx] === AIR) this.deborder(i, i - nx);
      }
    }

    // Une case d'eau trop pleine, couverte (paroi, glace) : son eau en trop va à la case la plus proche
    // de la même eau qui a de la place (pas pleine, ou à la surface) ; énergie et masse conservées
    evacuerExces(i0) {
      const {nx, n, typ, m, h, T, pile, marqueEau: marque} = this, stamp = ++this.tamponEau;
      let sp = 0, debut = 0; pile[sp++] = i0; marque[i0] = stamp;
      while (debut < sp && debut < 400) {
        const i = pile[debut++], x = i % nx;
        // une case de cette eau qui a de la place, ou qui touche de l'air (même sur le côté ou dessous)
        let air = -1;
        for (const j of [i - nx, x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i + nx]) if (j >= 0 && j < n && typ[j] === AIR) { air = j; break; }
        if ((i !== i0 && m[i] < 1.25 - 1e-9) || air >= 0) {
          if (i !== i0) {
            // sans dépasser 1,25 (ou, au contact de l'air, en débordant ensuite dans cet air)
            const q = air >= 0 ? m[i0] - 1 : Math.min(m[i0] - 1, 1.25 - m[i]), mi = m[i];
            h[i] = (h[i] * mi + q * h[i0]) / (mi + q); m[i] = mi + q; T[i] = temperatureDe(EAU, h[i]);
            m[i0] -= q;
          }
          if (m[i] > 1.25 && air >= 0) this.deborder(i, air);
          if (m[i0] <= 1 + 1e-12) return;
        }
        for (const j of [x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i - nx, i + nx]) {
          if (j < 0 || j >= n || marque[j] === stamp || typ[j] !== EAU) continue;
          marque[j] = stamp; pile[sp++] = j;
        }
      }
      // aucune place dans cette eau : l'excès rejoint une glace voisine qui a de la place…
      const x0 = i0 % nx;
      for (const j of [i0 - nx, x0 > 0 ? i0 - 1 : -1, x0 < nx - 1 ? i0 + 1 : -1, i0 + nx]) {
        if (j < 0 || j >= n || typ[j] !== GLACE || m[j] >= 1.25 || m[i0] <= 1) continue;
        const q = Math.min(m[i0] - 1, 1.25 - m[j]), mj = m[j];
        h[j] = (h[j] * mj + q * h[i0]) / (mj + q); m[j] = mj + q;
        if (h[j] >= L_F) { typ[j] = EAU; this.drap[j] = 0; }
        T[j] = temperatureDe(typ[j], h[j]);
        m[i0] -= q;
      }
      // … sinon (poche fermée, toute pleine : cela n'arrive qu'après des traits d'outils qui
      // enferment de l'eau), elle tombe en pluie dans la case d'air la plus proche (masse conservée)
      if (m[i0] > 1.25) {
        const y0 = (i0 / nx) | 0, ny = this.ny;
        for (let R = 1; R <= 12 && m[i0] > 1.25; R++) {
          for (let dy = -R; dy <= R && m[i0] > 1.25; dy++) for (let dx = -R; dx <= R; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== R) continue;
            const x = x0 + dx, y = y0 + dy;
            if (x < 0 || y < 0 || x >= nx || y >= ny) continue;
            const j = y * nx + x;
            if (typ[j] !== AIR) continue;
            this.p[j] += m[i0] - 1; m[i0] = 1;
            break;
          }
        }
        if (m[i0] > 1.25) { this.horsChamp += m[i0] - 1; m[i0] = 1; }
      }
    }

    // Trop d'eau dans une case de surface : l'eau en trop forme une nouvelle case au-dessus (l'air de
    // cette case, sa vapeur, ses gouttelettes vont dans une case d'air voisine)
    deborder(i, a) {
      const {nx, typ, drap, m, h, T, v} = this, t = typ[i], mi = m[i];
      const Ta = T[a];
      const vap = v[a], dd = this.d[a], cc = this.c[a], pp = this.p[a];
      const x = a % nx;
      let place = -1;
      for (const j of [a - nx, x > 0 ? a - 1 : -1, x < nx - 1 ? a + 1 : -1]) if (j >= 0 && typ[j] === AIR) { place = j; break; }
      if (place < 0 && vap + dd + cc + pp > 0.25) {
        // l'air de cette case n'a nulle part où aller : l'eau en trop y tombe en pluie (masse conservée)
        const q = mi - 1;
        this.p[a] += q; m[i] = 1;
        return;
      }
      this.v[a] = 0; this.d[a] = 0; this.c[a] = 0; this.p[a] = 0;
      const q = Math.min(mi - 1, 1);   // (au plus une case pleine ; le reste au tour suivant)
      typ[a] = t; drap[a] = drap[i]; m[a] = q; h[a] = h[i]; T[a] = T[i];
      m[i] = mi - q;
      if (place >= 0) { v[place] += vap; this.d[place] += dd; this.c[place] += cc; this.p[place] += pp; }
      else {
        const extra = vap + dd + cc + pp;
        h[a] = (h[a] * q + vap * hVapeur(Ta) + (dd + pp) * hLiquide(Math.max(0, Ta)) + cc * C_GLACE * Math.min(0, Ta)) / (q + extra);
        m[a] = q + extra; T[a] = temperatureDe(t, h[a]);
      }
    }

    // Eau de pluie arrivée dans l'océan (par ruissellement)
    suivreRetourOcean() {
      const L = this.actifs(), A = this.actifsLignes;
      const {n, typ, drap, m} = this, ocean = this.r.ocean;
      for (let kk = 0; kk < L.length; kk++) { const i = L[kk];
        if (typ[i] === EAU && (drap[i] & VENUE_DU_CIEL) && ocean[i]) {
          this.compteurs.versOcean += m[i];
          drap[i] &= ~VENUE_DU_CIEL;
        }
      }
    }
  }

  const api = {
    Monde, AIR, EAU, GLACE, VERRE, SOL, ROCHE, CHAUD, FROID, GRAIN, VENUE_DU_CIEL, GIVRE, FISSURE,
    C_GLACE, C_EAU, L_F, L_V, H_EBU, temperatureDe, enthalpieDe, satLiquide, satGlace,
  };
  racine.ChangementsEtat = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
