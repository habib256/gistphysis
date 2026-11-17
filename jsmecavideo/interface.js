// interface.js — affichage à la taille de l'écran, pointage au doigt, à la souris et au clavier
//
// - Un seul repère pour les données : les pixels natifs de la vidéo. Le canevas est affiché
//   au plus grand rectangle aux proportions de la vidéo qui tient dans la zone libre (#scene),
//   sans plafond ; sa mémoire vaut taille CSS × densité de l'écran (plafonnée) pour rester net.
//   Les coordonnées p5 (width, height, mouseX…) sont en pixels CSS ; un geste est converti
//   en pixels vidéo au moment où il est enregistré.
// - Pointage au doigt : on pose le doigt, une loupe (×3 à ×4, pixels de la vidéo elle-même)
//   apparaît au-dessus avec un réticule ; on glisse pour ajuster, le point est enregistré au
//   relâchement. Glisser lentement déplace le réticule 3 à 4 fois moins que le doigt (réglage
//   fin : dans la loupe, l'image agrandie reste immobile et la croix suit le doigt), glisser
//   vite le déplace autant que le doigt. Au relâchement, le point est celui que le réticule
//   montrait un peu avant (80 ms) : le saut du doigt qui se lève est ignoré. Glisser nettement
//   hors de l'image annule. Si l'écran change de taille (rotation) pendant le geste, il est annulé.
// - Clavier : quand l'image a le focus, les flèches déplacent le réticule (1 pixel vidéo,
//   10 avec Maj), Entrée pointe, Retour arrière annule. Ailleurs, ← → changent d'image.

const DENSITE_MAX = 2;          // densité de pixels maximale du canevas (tablettes modestes)
const PIXELS_MAX = 6e6;         // pixels réels maximum du canevas
// Loupe. Tailles en px CSS ; sur la tablette visée (10 pouces, 1280 × 800 px CSS), 6 px ≈ 1 mm.
const LOUPE_RAYON_MIN = 44;     // rayon de la loupe : 16 % du petit côté de l'image, entre 44…
const LOUPE_RAYON_MAX = 110;    // … et 110 px (3,7 cm de diamètre sur la tablette)
const LOUPE_PART = 0.16;
const LOUPE_PX_VIDEO = 6;       // taille visée d'un pixel vidéo dans la loupe (px)…
const LOUPE_ZOOM_MIN = 3;       // … avec un grossissement (par rapport à l'affichage) de 3…
const LOUPE_ZOOM_MAX = 4;       // … à 4
const LOUPE_ECART = 56;         // distance entre le doigt et le bord de la loupe (≈ 9 mm)
const LOUPE_ECART_MIN = 30;     // jamais moins (sinon la loupe change de place)
const LOUPE_HYSTERESIS = 16;    // la loupe ne revient à une place préférée qu'avec 16 px de marge
// Doigt : réglage fin et lever
const VITESSE_LENTE = 0.15;     // px/ms : en dessous, le réticule avance 1/zoom fois le doigt
const VITESSE_RAPIDE = 0.6;     // px/ms : au-dessus, il avance autant que le doigt
const FENETRE_VITESSE = 50;     // ms : vitesse du doigt mesurée sur ce temps (tremblement lissé)
const RETOUR_LEVER = 80;        // ms : au lever, on reprend la position du réticule d'avant
const MARGE_ANNULATION = 32;    // px : le geste n'est annulé qu'au-delà de cette marge hors image
const PRISE_BOUT_DOIGT = 32;    // px : distance de prise d'un bout d'étalonnage au doigt (24 à la souris)

// État des pointeurs (positions en pixels CSS du canevas). Doigt : (x, y) = doigt,
// (rx, ry) = réticule ; echantillons = positions récentes du doigt (vitesse) ;
// historique = positions récentes du réticule (retour au lever)
let pointeurTactile = { actif: false, id: null, x: 0, y: 0, rx: 0, ry: 0, dansImage: false, glisse: 0, echantillons: [], historique: [] };
let souris = { dansCanvas: false, x: 0, y: 0, glisse: 0, ignorerClic: false, clientX: -1, clientY: -1 };
let clavier = { actif: false, x: 0, y: 0 };   // réticule clavier (pixels vidéo)
let typePointeur = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'tactile' : 'souris';
let derniereAnnulationMenuContextuel = -Infinity;
let dernierPointageSouris = -Infinity;

// ---------------------------------------------------------------------------
// Taille d'affichage
// ---------------------------------------------------------------------------

let tailleAffichee = { w: 0, h: 0, d: 0 };
let sceneMesuree = { w: 0, h: 0 };
let ajustementEnAttente = false;
let tropPetit = false;              // fenêtre trop petite pour pointer
const IMAGE_MINI = { w: 200, h: 130 };

function demanderAjustementTaille() {
  if (ajustementEnAttente) return;
  ajustementEnAttente = true;
  requestAnimationFrame(() => {
    ajustementEnAttente = false;
    ajusterTaille();
  });
}

// Proportions à respecter : celles de la source, 4:3 tant qu'elle n'est pas chargée
function dimsAffichage() {
  return (typeof dimensionsSource === 'function' && dimensionsSource()) || { w: 4, h: 3 };
}

// Disposition d'après la forme et la taille de la fenêtre (ou du cadre) :
// paysage (largeur ≥ 1,1 × hauteur) → panneau latéral ; sinon barres empilées.
// Clavier virtuel ouvert : saisie au doigt dans le champ de longueur et seule la hauteur de
// la fenêtre a diminué (une rotation change aussi la largeur)
let largeurFenetre = window.innerWidth, hauteurFenetre = window.innerHeight;
function clavierVirtuelOuvert() {
  return typePointeur === 'tactile' && document.activeElement === document.getElementById('real-distance') &&
    window.innerWidth === largeurFenetre && window.innerHeight < hauteurFenetre;
}

function appliquerDisposition() {
  // Pendant la saisie au clavier virtuel, la disposition ne change pas
  if (clavierVirtuelOuvert()) return;
  largeurFenetre = window.innerWidth;
  hauteurFenetre = window.innerHeight;
  const W = window.innerWidth, H = window.innerHeight;
  const lat = W >= 1.1 * H && W >= 460;
  const panneau = Math.round(Math.max(210, Math.min(340, W * (H < 520 ? 0.3 : 0.27))));
  const largeurScene = lat ? W - panneau : W;
  const b = document.body;
  b.classList.toggle('lat', lat);
  b.classList.toggle('emp', !lat);
  b.classList.toggle('etroit', largeurScene < 600);
  b.classList.toggle('tres-etroit', largeurScene < 400);
  b.classList.toggle('bas', H < 520);
  document.documentElement.style.setProperty('--panneau', panneau + 'px');
  document.documentElement.classList.toggle('defile', !lat && typeof etat !== 'undefined' && etat === 'Graphique');
}

// Faut-il replier le guide pour laisser la place à l'image ? (jamais s'il a été rouvert)
function guideGenant(w, h) {
  if (typeof guide === 'undefined' || !guide.ouvert || guide.ouvertParEleve) return false;
  const b = document.body;
  if (b.classList.contains('lat')) return b.classList.contains('bas'); // téléphone couché
  return w * h < 0.4 * window.innerWidth * window.innerHeight || h < 0.4 * window.innerHeight;
}

// Portrait : la barre d'étalonnage prend exactement la hauteur des réglages + barre de consigne
// qu'elle remplace ; on la mesure en disposition « pointage » (classe retirée un instant).
function mesurerHauteurEtalonnage() {
  const b = document.body;
  if (!b.classList.contains('emp')) return;
  const etal = b.classList.contains('mode-etalonnage');
  if (etal) b.classList.remove('mode-etalonnage');
  const menu = document.getElementById('menu');
  const reglages = document.getElementById('reglages');
  const info = document.getElementById('info-bar');
  const ecart = parseFloat(getComputedStyle(menu).rowGap) || 0;
  const h = reglages.offsetHeight + ecart + info.offsetHeight;
  if (etal) b.classList.add('mode-etalonnage');
  if (h > 0) document.documentElement.style.setProperty('--hauteur-etalonnage', h + 'px');
}

function ajusterTaille() {
  // Clavier virtuel ouvert pour la saisie de la longueur : rien ne bouge (ni disposition, ni
  // guide, ni image) ; tout est recalculé quand le champ perd le focus
  if (clavierVirtuelOuvert()) {
    const saisie = document.getElementById('real-distance');
    if (!saisie.dataset.surveille) {
      saisie.dataset.surveille = '1';
      saisie.addEventListener('blur', demanderAjustementTaille);
    }
    return;
  }
  appliquerDisposition();
  mesurerHauteurEtalonnage();
  const scene = document.getElementById('scene');
  const conteneur = document.getElementById('canvas-container');
  if (!scene || !conteneur || typeof resizeCanvas !== 'function') return;
  const W = scene.clientWidth, H = scene.clientHeight;
  const s = dimsAffichage();
  const k = Math.min(W / s.w, H / s.h);
  let w = Math.max(1, Math.floor(s.w * k));
  let h = Math.max(1, Math.floor(s.h * k));

  // Place qui manque : on replie le guide (au chargement, au changement de mode ou de
  // taille de fenêtre — jamais pendant le pointage, l'image ne doit pas bouger entre deux points)
  if (typeof modePointageActif === 'function' && modePointageActif() && guideGenant(w, h)) {
    guide.ouvert = false;
    majGuide(true);
    demanderAjustementTaille();
    return;
  }

  // Trop petit pour pointer : on le dit
  const petit = typeof modePointageActif === 'function' && modePointageActif() && (w < IMAGE_MINI.w || h < IMAGE_MINI.h);
  if (petit !== tropPetit) {
    tropPetit = petit;
    document.getElementById('trop-petit').hidden = !petit;
    conteneur.style.visibility = petit ? 'hidden' : '';
    if (petit) annulerToucher();
  }

  // Clavier virtuel ouvert pour écrire la longueur : seule la hauteur diminue ; l'image garde
  // sa taille (calée en haut, centrée en largeur). Une rotation (largeur qui change) redimensionne.
  const saisie = document.getElementById('real-distance');
  const clavierVirtuel = typePointeur === 'tactile' && document.activeElement === saisie && tailleAffichee.w > 0 &&
    W === sceneMesuree.w && H < sceneMesuree.h && h < tailleAffichee.h;
  if (!saisie.dataset.surveille) {
    saisie.dataset.surveille = '1';
    saisie.addEventListener('blur', demanderAjustementTaille);
  }
  if (clavierVirtuel || clavierVirtuelOuvert()) {
    // Image strictement immobile : ni taille ni place ne changent pendant la saisie
    return;
  }
  sceneMesuree = { w: W, h: H };
  if (W < 20 || H < 20) return;

  let d = Math.min(window.devicePixelRatio || 1, DENSITE_MAX);
  if (w * h * d * d > PIXELS_MAX) d = Math.sqrt(PIXELS_MAX / (w * h));
  conteneur.style.left = Math.floor((W - w) / 2) + 'px';
  conteneur.style.top = Math.floor((H - h) / 2) + 'px';
  if (w === tailleAffichee.w && h === tailleAffichee.h && d === tailleAffichee.d) return;

  const avait = tailleAffichee.w > 0;
  tailleAffichee = { w: w, h: h, d: d };
  if (pixelDensity() !== d) pixelDensity(d);
  resizeCanvas(w, h);
  // Rotation ou redimensionnement pendant un geste : l'endroit visé n'est plus sous le doigt
  if (avait && gesteEnCours()) {
    annulerToucher();
    afficherMessageTemporaire('↻ L’écran a changé de taille : geste annulé. Recommence.', 2500);
  }
  if (typeof isLooping === 'function' && !isLooping()) redraw();
}

function installerMiseAEchelle() {
  window.addEventListener('resize', demanderAjustementTaille);
  window.addEventListener('orientationchange', demanderAjustementTaille);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(demanderAjustementTaille).observe(document.getElementById('scene'));
  }
  ajusterTaille();
}

// ---------------------------------------------------------------------------
// Conversions écran ↔ vidéo
// ---------------------------------------------------------------------------

// Pixels CSS du canevas → pixels vidéo (y vers le bas)
function versVideo(x, y) {
  const s = dimsAffichage();
  return { x: x * s.w / width, y: y * s.h / height };
}

// Pixels vidéo (y vers le bas) → pixels CSS du canevas
function versEcran(x, y) {
  const s = dimsAffichage();
  return { x: x * width / s.w, y: y * height / s.h };
}

// Position écran (clientX, clientY) → pixels CSS du canevas, d'après sa position réelle
function coordonneesCanvas(elt, clientX, clientY) {
  const rect = elt.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * width / rect.width,
    y: (clientY - rect.top) * height / rect.height
  };
}

function estDansImage(p) {
  return p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
}

// ---------------------------------------------------------------------------
// Gestes
// ---------------------------------------------------------------------------

function toucherSuivi(liste) {
  for (let i = 0; i < liste.length; i++) {
    if (liste[i].identifier === pointeurTactile.id) return liste[i];
  }
  return null;
}

function gesteEnCours() {
  return pointeurTactile.actif || souris.glisse > 0;
}

// Abandonne le geste en cours. Un glisser de bout d'étalonnage interrompu (deuxième doigt,
// rotation, touchcancel, question qui s'ouvre…) remet le bout à sa place d'origine.
function annulerToucher() {
  const glisse = pointeurTactile.glisse || souris.glisse;
  pointeurTactile.actif = false;
  pointeurTactile.id = null;
  pointeurTactile.glisse = 0;
  souris.glisse = 0;
  if (glisse && typeof calibrator !== 'undefined' && calibrator) {
    calibrator.annulerGlisser();
    if (typeof surEtalonnageDeplace === 'function') surEtalonnageDeplace();
  }
}

// Fin normale d'un glisser : le bout reste à sa nouvelle place
function terminerGlisser() {
  if (typeof calibrator !== 'undefined' && calibrator) calibrator.finGlisser();
  pointeurTactile.glisse = 0;
  souris.glisse = 0;
}

// Point d'étalonnage proche (1 ou 2) d'une position écran, 0 sinon
function pointEtalonnageProche(p, rayon = 24) {
  if (etat !== 'Calibration' || !calibrator) return 0;
  if (typeof confirmationOuverte === 'function' && confirmationOuverte()) return 0; // pas pendant une question
  let meilleur = 0, dmin = rayon;
  [calibrator.point1, calibrator.point2].forEach((q, i) => {
    if (!q) return;
    const e = versEcran(q.x, q.y);
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < dmin) { dmin = d; meilleur = i + 1; }
  });
  return meilleur;
}

// Instant d'un événement (ms, horloge de performance.now) : celui où l'écran l'a capté, même si
// la page, occupée, le traite en retard ; repli sur performance.now() si le navigateur en donne
// un autre repère
function instantEvenement(e) {
  const t = e && e.timeStamp, maintenant = performance.now();
  return t > 0 && t <= maintenant + 1000 && t > maintenant - 60000 ? t : maintenant;
}

// Grossissement de la loupe par rapport à l'affichage : un pixel vidéo y mesure environ
// LOUPE_PX_VIDEO px, entre ×3 et ×4
function zoomLoupe() {
  const s = dimsAffichage();
  const k = width / s.w; // px d'écran par pixel vidéo
  return constrain(LOUPE_PX_VIDEO / k, LOUPE_ZOOM_MIN, LOUPE_ZOOM_MAX);
}

// Démultiplication du doigt : 1/zoom quand il glisse lentement (l'image agrandie reste alors
// immobile dans la loupe : la croix avance exactement comme le doigt), 1 quand il va vite
function gainDoigt(vitesse) {
  const lent = 1 / zoomLoupe();
  if (vitesse <= VITESSE_LENTE) return lent;
  if (vitesse >= VITESSE_RAPIDE) return 1;
  return lent + (1 - lent) * (vitesse - VITESSE_LENTE) / (VITESSE_RAPIDE - VITESSE_LENTE);
}

// Vitesse du doigt (px/ms) sur les FENETRE_VITESSE dernières ms : un tremblement rapide se
// compense et reste « lent »
function vitesseDoigt(t, x, y) {
  const e = pointeurTactile.echantillons;
  let ref = e[0];
  for (let i = e.length - 1; i >= 0; i--) {
    if (t - e[i].t >= FENETRE_VITESSE) { ref = e[i]; break; }
  }
  if (!ref) return 0;
  return Math.hypot(x - ref.x, y - ref.y) / Math.max(t - ref.t, 16);
}

function noterReticule(t) {
  const h = pointeurTactile.historique;
  h.push({ t: t, x: pointeurTactile.rx, y: pointeurTactile.ry });
  while (h.length > 2 && t - h[1].t > 4 * RETOUR_LEVER) h.shift();
}

// Position du réticule RETOUR_LEVER ms avant le lever (celle que l'élève voyait quand il a
// décidé de lever le doigt) ; le saut du doigt qui se lève ne compte pas
function reticuleAvantLever(t) {
  const h = pointeurTactile.historique;
  let p = h[0];
  for (let i = 0; i < h.length; i++) {
    if (h[i].t <= t - RETOUR_LEVER) p = h[i];
    else break;
  }
  return p ? { x: p.x, y: p.y } : { x: pointeurTactile.rx, y: pointeurTactile.ry };
}

function dansZoneGeste(p) {
  const m = MARGE_ANNULATION;
  return p.x >= -m && p.x <= width + m && p.y >= -m && p.y <= height + m;
}

function installerPointageTactile(elt) {
  elt.addEventListener('touchstart', (e) => {
    if (!modePointageActif()) return; // mode Graphiques : on laisse le navigateur gérer
    e.preventDefault(); // pas de défilement, de zoom, de menu sur appui long, ni de faux clic souris
    typePointeur = 'tactile';
    souris.dansCanvas = false;
    clavier.actif = false;
    // Deuxième doigt SUR L'IMAGE (pincement…) : on abandonne le geste (bout remis en place).
    // Un pouce posé ailleurs (bord de l'écran, panneau) ne compte pas : e.touches les compterait.
    const surImage = e.targetTouches ? e.targetTouches.length : e.touches.length;
    if (surImage > 1 || pointeurTactile.actif) {
      if (pointeurTactile.actif) annulerToucher();
      return;
    }
    const t = e.changedTouches[0];
    const p = coordonneesCanvas(elt, t.clientX, t.clientY);
    const instant = instantEvenement(e);
    pointeurTactile.actif = true;
    pointeurTactile.id = t.identifier;
    pointeurTactile.x = p.x;
    pointeurTactile.y = p.y;
    pointeurTactile.dansImage = estDansImage(p);
    pointeurTactile.glisse = pointEtalonnageProche(p, PRISE_BOUT_DOIGT);
    pointeurTactile.echantillons = [{ t: instant, x: p.x, y: p.y }];
    // Réticule : sous le doigt, ou sur le bout d'étalonnage saisi (il ne saute pas sous le doigt)
    let r = p;
    if (pointeurTactile.glisse) {
      calibrator.debutGlisser(pointeurTactile.glisse);
      const q = pointeurTactile.glisse === 1 ? calibrator.point1 : calibrator.point2;
      r = versEcran(q.x, q.y);
    }
    pointeurTactile.rx = constrain(r.x, 0, width);
    pointeurTactile.ry = constrain(r.y, 0, height);
    pointeurTactile.historique = [];
    noterReticule(instant);
    dessinerLoupe.place = -1; // nouvelle loupe : place choisie de nouveau
  }, { passive: false });

  elt.addEventListener('touchmove', (e) => {
    if (!pointeurTactile.actif) return;
    e.preventDefault();
    const t = toucherSuivi(e.changedTouches);
    if (!t) return;
    const p = coordonneesCanvas(elt, t.clientX, t.clientY);
    const instant = instantEvenement(e);
    // Le réticule avance du déplacement du doigt, démultiplié quand le doigt va lentement
    const g = gainDoigt(vitesseDoigt(instant, p.x, p.y));
    pointeurTactile.rx = constrain(pointeurTactile.rx + g * (p.x - pointeurTactile.x), 0, width);
    pointeurTactile.ry = constrain(pointeurTactile.ry + g * (p.y - pointeurTactile.y), 0, height);
    pointeurTactile.x = p.x;
    pointeurTactile.y = p.y;
    const ech = pointeurTactile.echantillons;
    ech.push({ t: instant, x: p.x, y: p.y });
    while (ech.length > 2 && instant - ech[1].t > 3 * FENETRE_VITESSE) ech.shift();
    pointeurTactile.dansImage = dansZoneGeste(p);
    noterReticule(instant);
    if (pointeurTactile.glisse && pointeurTactile.dansImage) {
      const v = versVideo(pointeurTactile.rx, pointeurTactile.ry);
      calibrator.deplacerPoint(pointeurTactile.glisse, v.x, v.y);
    }
  }, { passive: false });

  elt.addEventListener('touchend', (e) => {
    if (!pointeurTactile.actif) return;
    e.preventDefault();
    const t = toucherSuivi(e.changedTouches);
    if (!t) return;
    // La position du lever (et les derniers mouvements) ne comptent pas : on prend le réticule
    // tel qu'il était affiché juste avant
    const garde = pointeurTactile.dansImage;
    const r = reticuleAvantLever(instantEvenement(e));
    const glisse = pointeurTactile.glisse;
    if (glisse) {
      if (garde) {
        const v = versVideo(r.x, r.y);
        calibrator.deplacerPoint(glisse, v.x, v.y);
        terminerGlisser();
      }
      annulerToucher(); // hors de l'image : le bout revient à sa place
      surEtalonnageDeplace();
      return;
    }
    annulerToucher();
    if (garde) {
      const v = versVideo(r.x, r.y);
      traiterPointage(v.x, v.y);
    }
  }, { passive: false });

  // Le navigateur reprend le geste (appui long, geste système…) : rien n'est enregistré, on le dit
  elt.addEventListener('touchcancel', () => {
    const enCours = pointeurTactile.actif;
    annulerToucher();
    if (enCours) afficherMessageTemporaire('Geste interrompu : rien n’est enregistré. Recommence.', 2500);
  });

  // Souris : le viseur suit la souris sur l'image ; glisser un point d'étalonnage
  elt.addEventListener('mousemove', (e) => {
    // Un vrai mouvement de souris (pas un événement émis sans bouger) fait disparaître le réticule clavier
    if (clavier.actif && (Math.abs(e.clientX - souris.clientX) > 2 || Math.abs(e.clientY - souris.clientY) > 2)) clavier.actif = false;
    souris.clientX = e.clientX;
    souris.clientY = e.clientY;
    const p = coordonneesCanvas(elt, e.clientX, e.clientY);
    souris.x = p.x;
    souris.y = p.y;
    souris.dansCanvas = true;
    typePointeur = 'souris';
    if (souris.glisse && estDansImage(p)) {
      const v = versVideo(p.x, p.y);
      calibrator.deplacerPoint(souris.glisse, v.x, v.y);
    }
  });
  elt.addEventListener('mouseenter', () => { souris.dansCanvas = true; });
  elt.addEventListener('mouseleave', () => {
    souris.dansCanvas = false;
    if (souris.glisse) {
      annulerToucher(); // sortie de l'image : bout remis en place
      souris.ignorerClic = true; // le relâchement qui suivra n'est pas un pointage
    }
  });
  elt.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const p = coordonneesCanvas(elt, e.clientX, e.clientY);
    souris.glisse = pointEtalonnageProche(p);
    if (souris.glisse) calibrator.debutGlisser(souris.glisse);
    souris.ignorerClic = false;
  });
  window.addEventListener('mouseup', () => {
    if (souris.glisse) {
      terminerGlisser();
      souris.ignorerClic = true; // ce n'était pas un pointage
      surEtalonnageDeplace();
    }
  });

  // Clic : pointe ; Ctrl+clic annule le dernier point. Un double-clic ne crée pas deux points.
  elt.addEventListener('click', (e) => {
    if (e.button !== 0 || !modePointageActif()) return;
    if (souris.ignorerClic) { souris.ignorerClic = false; return; }
    if (e.detail > 1 || performance.now() - dernierPointageSouris < 250) {
      afficherMessageTemporaire('Double-clic ignoré : un seul clic suffit pour pointer.', 2000);
      return;
    }
    typePointeur = 'souris';
    if ((e.ctrlKey || e.metaKey) && etat === 'Pointage') {
      if (!annulationDejaTraitee()) annulerDernierPoint();
      return;
    }
    dernierPointageSouris = performance.now();
    // Réticule clavier affiché (souris pas bougée depuis) : le clic pointe au réticule, que
    // l'élève voit — jamais sous une souris invisible
    if (clavier.actif) {
      traiterPointage(clavier.x, clavier.y);
      return;
    }
    const p = coordonneesCanvas(elt, e.clientX, e.clientY);
    if (!estDansImage(p)) return;
    const v = versVideo(p.x, p.y);
    traiterPointage(v.x, v.y);
  });

  // Pas de menu contextuel sur l'image. Sur Mac, Ctrl+clic ouvre ce menu au lieu d'envoyer
  // un clic : on y traite donc aussi l'annulation.
  elt.addEventListener('contextmenu', (e) => {
    if (!modePointageActif()) return;
    e.preventDefault();
    if (e.ctrlKey && etat === 'Pointage') {
      derniereAnnulationMenuContextuel = performance.now();
      annulerDernierPoint();
    }
  });

  installerClavierImage(elt);
}

function annulationDejaTraitee() {
  return performance.now() - derniereAnnulationMenuContextuel < 600;
}

// Pointage fin au clavier quand l'image a le focus
function installerClavierImage(elt) {
  elt.addEventListener('keydown', (e) => {
    if (!modePointageActif() || !dimensionsSource()) return;
    const s = dimensionsSource();
    const pas = e.shiftKey ? 10 : 1;
    const fleches = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] };
    // Règle : sans réticule, ← → changent d'image (raccourci de toute l'app). Le réticule
    // n'apparaît qu'avec Entrée quand l'image a le focus ; alors les flèches le déplacent,
    // Entrée pointe, Échap le fait disparaître.
    if (fleches[e.key] && clavier.actif) {
      e.preventDefault();
      e.stopPropagation();
      clavier.x = Math.min(s.w, Math.max(0, clavier.x + fleches[e.key][0]));
      clavier.y = Math.min(s.h, Math.max(0, clavier.y + fleches[e.key][1]));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!clavier.actif) {
        clavier.actif = true;
        clavier.x = s.w / 2;
        clavier.y = s.h / 2;
        typePointeur = 'clavier';
        return;
      }
      traiterPointage(clavier.x, clavier.y);
    } else if (e.key === 'Escape' && clavier.actif) {
      e.stopPropagation();
      clavier.actif = false;
      typePointeur = 'souris';
    }
  });
  elt.addEventListener('blur', () => {
    clavier.actif = false;
    if (typePointeur === 'clavier') typePointeur = 'souris';
  });
}

// Raccourcis de toute l'app (hors champs de saisie et menus)
function installerRaccourcis() {
  document.addEventListener('keydown', (e) => {
    // Échap pendant un glisser de bout d'étalonnage : le bout revient à sa place
    if (e.key === 'Escape' && (pointeurTactile.glisse || souris.glisse)) {
      e.preventDefault();
      annulerToucher();
      return;
    }
    const cible = e.target;
    const balise = cible && cible.tagName;
    if (balise === 'INPUT' || balise === 'SELECT' || balise === 'TEXTAREA' || (cible && cible.isContentEditable)) return;
    if (!document.getElementById('confirmation').hidden) {
      // Échap ne détruit jamais rien : il ne vaut « non » que si « non » garde le travail
      if (e.key === 'Escape') {
        e.preventDefault();
        if (echapConfirmation) echapConfirmation();
      }
      return;
    }
    if (e.altKey) return;
    const lect = lecteur();
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      annulerDernierPoint();
      return;
    }
    if (ctrl) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      annulerDernierPoint();
      return;
    }
    if (!lect || etat === 'Graphique') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (balise === 'BUTTON' && cible.closest('#guide-etapes')) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') lect.previousFrame();
      else lect.nextFrame();
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      if (balise === 'BUTTON') return; // Espace active le bouton qui a le focus
      e.preventDefault();
      lect.play();
    } else if (e.key === 'Home') {
      e.preventDefault();
      lect.jumpToStart();
    }
  });
}

// Position du viseur (pixels CSS du canevas) ou null s'il ne faut pas l'afficher
function positionViseur() {
  if (pointeurTactile.actif) {
    return pointeurTactile.dansImage ? { x: pointeurTactile.rx, y: pointeurTactile.ry } : null;
  }
  if (clavier.actif) return versEcran(clavier.x, clavier.y);
  if (souris.dansCanvas && souris.x >= 0 && souris.x <= width && souris.y >= 0 && souris.y <= height) {
    return { x: souris.x, y: souris.y };
  }
  return null;
}

// Faut-il une loupe ? Au doigt (toujours), au clavier, et à la souris pendant l'étalonnage
function loupeVisible() {
  if (pointeurTactile.actif) return pointeurTactile.dansImage;
  if (clavier.actif) return true;
  return etat === 'Calibration' && souris.dansCanvas;
}

// Message d'aide pendant un pointage au doigt (null sinon)
function messagePointageTactile() {
  if (!pointeurTactile.actif) return null;
  if (!pointeurTactile.dansImage) return '✋ Relâche ici pour annuler, ou reviens sur l’image.';
  if (pointeurTactile.glisse) return '🔍 Regarde la loupe : glisse doucement pour placer ce bout, puis relâche.';
  return '🔍 Regarde la loupe : glisse doucement pour placer la croix, puis relâche.';
}

// Rayon de la loupe (px) pour l'image affichée
function rayonLoupe() {
  const petit = Math.min(width, height);
  return Math.round(Math.min(constrain(LOUPE_PART * petit, LOUPE_RAYON_MIN, LOUPE_RAYON_MAX), petit / 2 - 3));
}

// Place du centre de la loupe pour un doigt (ou un viseur) en (ax, ay) : entièrement dans
// l'image et jamais sur le doigt. Par ordre de préférence : au-dessus, en diagonale vers le
// centre de l'image, sur le côté vers le centre, puis vers l'extérieur (jamais en dessous : la
// main est là). Elle reste à sa place tant qu'elle convient (pas de saut d'un côté à l'autre).
function placerLoupe(ax, ay, R, ecart, ecartMin) {
  const m = 2;
  const milieu = width / 2, marge = Math.min(40, width / 8);
  if (ax < milieu - marge) placerLoupe.cote = 1;
  else if (ax > milieu + marge) placerLoupe.cote = -1;
  else if (!placerLoupe.cote) placerLoupe.cote = ax < milieu ? 1 : -1;
  const s = placerLoupe.cote, d = R + ecart, k = Math.SQRT1_2;
  const directions = [[0, -1], [s * k, -k], [s, 0], [-s * k, -k], [-s, 0]];
  const places = directions.map(([dx, dy]) => {
    const c = { x: constrain(ax + dx * d, R + m, width - R - m), y: constrain(ay + dy * d, R + m, height - R - m) };
    c.distance = Math.hypot(c.x - ax, c.y - ay);
    return c;
  });
  const precedente = dessinerLoupe.place >= 0 ? dessinerLoupe.place : directions.length;
  let choix = -1;
  for (let i = 0; i < places.length && choix < 0; i++) {
    // Revenir à une place préférée demande une marge (hystérésis)
    const requis = R + ecartMin + (i < precedente ? LOUPE_HYSTERESIS : 0);
    if (places[i].distance >= requis || (i === precedente && places[i].distance >= R + ecartMin)) choix = i;
  }
  if (choix < 0) {
    // Image trop petite pour respecter l'écart : la place la plus éloignée du doigt
    choix = 0;
    places.forEach((c, i) => { if (c.distance > places[choix].distance) choix = i; });
  }
  dessinerLoupe.place = choix;
  return places[choix];
}

// Image à agrandir : la source elle-même (pixels de la vidéo, pas ceux de l'écran), ou null
function sourceLoupe() {
  const l = typeof lecteur === 'function' ? lecteur() : null;
  if (!l || l.erreur) return null;
  if (l.images && l.isRecorded && l.images[l.image]) return l.images[l.image]; // webcam : séquence
  if (l.cam) return l.cam.videoWidth > 0 && !l.isRecorded ? l.cam : null;       // webcam en direct
  return l.elt && l.isLoaded ? l.elt : null;
}

// Loupe de la zone autour du réticule (x, y), entièrement visible, jamais sous le doigt :
// au-dessus du doigt, sinon en diagonale ou sur le côté. Pixels nets de la vidéo, grossis
// ×3 à ×4 par rapport à l'affichage. À dessiner après l'image et les points, avant le viseur.
function dessinerLoupe(x, y, couleurReticule) {
  const R = rayonLoupe();
  const Z = zoomLoupe();
  const doigt = pointeurTactile.actif;
  const ancre = doigt ? { x: pointeurTactile.x, y: pointeurTactile.y } : { x: x, y: y };
  const c = placerLoupe(ancre.x, ancre.y, R, doigt ? LOUPE_ECART : 18, doigt ? LOUPE_ECART_MIN : 10);
  const cx = c.x, cy = c.y;
  dessinerLoupe.derniere = { cx: cx, cy: cy, R: R, Z: Z, x: x, y: y, ax: ancre.x, ay: ancre.y };

  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.clip();
  ctx.imageSmoothingEnabled = false; // pixels nets : on voit exactement ce qu'on pointe
  const src = sourceLoupe();
  const s = dimsAffichage();
  if (src) {
    // Zone de la vidéo (pixels vidéo) centrée sur le réticule, découpée aux bords de l'image
    const e = Z * width / s.w;          // px de loupe par pixel vidéo
    const v = versVideo(x, y), demi = R / e;
    const x0 = Math.max(0, v.x - demi), x1 = Math.min(s.w, v.x + demi);
    const y0 = Math.max(0, v.y - demi), y1 = Math.min(s.h, v.y + demi);
    if (x1 > x0 && y1 > y0) {
      ctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, cx + (x0 - v.x) * e, cy + (y0 - v.y) * e, (x1 - x0) * e, (y1 - y0) * e);
    }
  } else {
    // Pas de source (chargement…) : copie du canevas lui-même
    const d = pixelDensity(), cote = 2 * R / Z;
    ctx.drawImage(ctx.canvas, (x - cote / 2) * d, (y - cote / 2) * d, cote * d, cote * d, cx - R, cy - R, 2 * R, 2 * R);
  }
  ctx.restore();

  push();
  noFill();
  stroke(255);
  strokeWeight(4);
  ellipse(cx, cy, 2 * R, 2 * R);
  stroke(0);
  strokeWeight(1.5);
  ellipse(cx, cy, 2 * R + 5, 2 * R + 5);
  // Croix fine, évidée au centre (le pixel visé reste visible) : liseré sombre puis couleur,
  // lisible sur une vidéo claire comme sombre
  const trou = Math.max(5, 0.9 * Z * width / s.w);
  const brins = [[-R + 6, 0, -trou, 0], [trou, 0, R - 6, 0], [0, -R + 6, 0, -trou], [0, trou, 0, R - 6]];
  stroke(0, 0, 0, 200);
  strokeWeight(3);
  brins.forEach(b => line(cx + b[0], cy + b[1], cx + b[2], cy + b[3]));
  stroke(couleurReticule);
  strokeWeight(1.2);
  brins.forEach(b => line(cx + b[0], cy + b[1], cx + b[2], cy + b[3]));
  pop();
}

// Zone de texte qui défile : ombre en bas (indice « il y a une suite ») tant que la fin
// n'est pas visible
function marquerDebordement(el) {
  if (!el) return;
  const maj = () => el.classList.toggle('deborde', el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  if (!el.dataset.debordeSuivi) {
    el.dataset.debordeSuivi = '1';
    el.addEventListener('scroll', maj, { passive: true });
  }
  maj();
}

// Texte centré sur l'image (chargement, erreur)
function messageSurImage(message) {
  push();
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(Math.max(15, Math.min(24, width / 22)));
  textWrap(WORD);
  text(message, 20, 0, width - 40, height);
  pop();
}

// ---------------------------------------------------------------------------
// Commandes de lecture (boutons de 44 px, curseur de temps calé sur les images)
// ---------------------------------------------------------------------------

function creerBoutonIcone(parent, libelle, icone, action) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'bouton-icone';
  b.title = libelle;
  b.setAttribute('aria-label', libelle);
  b.style.backgroundImage = 'url("img/tango/' + icone + '")';
  b.addEventListener('click', action);
  parent.appendChild(b);
  return b;
}

// Boutons début / précédente / lecture / suivante et curseur de temps pour un lecteur
function creerControlesLecture(lecteur, webcam) {
  const parent = document.getElementById('controls');
  const elements = [];
  let enregistrer = null;
  if (webcam) {
    enregistrer = creerBoutonIcone(parent, 'Enregistrer / arrêter l’enregistrement', 'media-record.png', () => lecteur.toggleRecording());
    elements.push(enregistrer);
  }
  const debut = creerBoutonIcone(parent, 'Revenir au début (touche Début)', 'media-skip-backward.png', () => lecteur.jumpToStart());
  debut.classList.add('bouton-debut');
  elements.push(debut);
  elements.push(creerBoutonIcone(parent, 'Image précédente (flèche ←)', 'media-step-backward.png', () => lecteur.previousFrame()));
  const lecture = creerBoutonIcone(parent, 'Lire la vidéo (Espace)', 'media-playback-start.png', () => lecteur.play());
  elements.push(lecture);
  elements.push(creerBoutonIcone(parent, 'Image suivante (flèche →)', 'media-step-forward.png', () => lecteur.nextFrame()));

  const curseur = document.createElement('input');
  curseur.type = 'range';
  curseur.className = 'curseur-temps';
  curseur.min = '0';
  curseur.max = '0';
  curseur.step = '1';
  curseur.value = '0';
  curseur.setAttribute('aria-label', 'Position dans la vidéo (numéro d’image)');
  curseur.actif = false;
  curseur.addEventListener('pointerdown', () => { curseur.actif = true; });
  const relacher = () => { curseur.actif = false; };
  ['pointerup', 'pointercancel', 'lostpointercapture', 'change'].forEach(ev => curseur.addEventListener(ev, relacher));
  curseur.addEventListener('input', () => lecteur.allerImageChoisie(parseInt(curseur.value, 10) || 0));
  parent.appendChild(curseur);
  elements.push(curseur);

  return {
    curseur: curseur,
    lecture: lecture,
    enregistrer: enregistrer,
    retirer: () => elements.forEach(el => el.remove())
  };
}
