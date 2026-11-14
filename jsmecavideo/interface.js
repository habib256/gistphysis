// interface.js — affichage à la taille de l'écran, pointage au doigt, à la souris et au clavier
//
// - Un seul repère pour les données : les pixels natifs de la vidéo. Le canevas est affiché
//   au plus grand rectangle aux proportions de la vidéo qui tient dans la zone libre (#scene),
//   sans plafond ; sa mémoire vaut taille CSS × densité de l'écran (plafonnée) pour rester net.
//   Les coordonnées p5 (width, height, mouseX…) sont en pixels CSS ; un geste est converti
//   en pixels vidéo au moment où il est enregistré.
// - Pointage au doigt : on pose le doigt, une loupe (×3) apparaît au-dessus avec un réticule ;
//   on glisse pour ajuster, le point est enregistré au relâchement. Relâcher hors de l'image
//   annule. Si l'écran change de taille (rotation) pendant le geste, le geste est annulé.
// - Clavier : quand l'image a le focus, les flèches déplacent le réticule (1 pixel vidéo,
//   10 avec Maj), Entrée pointe, Retour arrière annule. Ailleurs, ← → changent d'image.

const DENSITE_MAX = 2;          // densité de pixels maximale du canevas (tablettes modestes)
const PIXELS_MAX = 6e6;         // pixels réels maximum du canevas
const LOUPE_RAYON = 60;         // rayon de la loupe (px à l'écran)
const LOUPE_ZOOM = 3;           // grossissement par rapport à l'affichage
const LOUPE_ECART = 34;         // distance entre le bord de la loupe et le doigt

// État des pointeurs (positions en pixels CSS du canevas)
let pointeurTactile = { actif: false, id: null, x: 0, y: 0, dansImage: false, glisse: 0 };
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
function pointEtalonnageProche(p) {
  if (etat !== 'Calibration' || !calibrator) return 0;
  if (typeof confirmationOuverte === 'function' && confirmationOuverte()) return 0; // pas pendant une question
  let meilleur = 0, dmin = 24;
  [calibrator.point1, calibrator.point2].forEach((q, i) => {
    if (!q) return;
    const e = versEcran(q.x, q.y);
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < dmin) { dmin = d; meilleur = i + 1; }
  });
  return meilleur;
}

function installerPointageTactile(elt) {
  elt.addEventListener('touchstart', (e) => {
    if (!modePointageActif()) return; // mode Graphiques : on laisse le navigateur gérer
    e.preventDefault(); // pas de défilement, de zoom, de menu sur appui long, ni de faux clic souris
    typePointeur = 'tactile';
    souris.dansCanvas = false;
    clavier.actif = false;
    if (e.touches.length > 1) {
      annulerToucher(); // deuxième doigt (pincement…) : on abandonne le geste (bout remis en place)
      return;
    }
    const t = e.changedTouches[0];
    const p = coordonneesCanvas(elt, t.clientX, t.clientY);
    pointeurTactile.actif = true;
    pointeurTactile.id = t.identifier;
    pointeurTactile.x = p.x;
    pointeurTactile.y = p.y;
    pointeurTactile.dansImage = estDansImage(p);
    pointeurTactile.glisse = pointEtalonnageProche(p);
    if (pointeurTactile.glisse) calibrator.debutGlisser(pointeurTactile.glisse);
  }, { passive: false });

  elt.addEventListener('touchmove', (e) => {
    if (!pointeurTactile.actif) return;
    e.preventDefault();
    const t = toucherSuivi(e.changedTouches);
    if (!t) return;
    const p = coordonneesCanvas(elt, t.clientX, t.clientY);
    pointeurTactile.x = p.x;
    pointeurTactile.y = p.y;
    pointeurTactile.dansImage = estDansImage(p);
    if (pointeurTactile.glisse && pointeurTactile.dansImage) {
      const v = versVideo(p.x, p.y);
      calibrator.deplacerPoint(pointeurTactile.glisse, v.x, v.y);
    }
  }, { passive: false });

  elt.addEventListener('touchend', (e) => {
    if (!pointeurTactile.actif) return;
    e.preventDefault();
    const t = toucherSuivi(e.changedTouches);
    if (!t) return;
    const p = coordonneesCanvas(elt, t.clientX, t.clientY);
    const glisse = pointeurTactile.glisse;
    if (glisse) {
      terminerGlisser();
      annulerToucher();
      surEtalonnageDeplace();
      return;
    }
    annulerToucher();
    if (estDansImage(p)) {
      const v = versVideo(p.x, p.y);
      traiterPointage(v.x, v.y);
    }
  }, { passive: false });

  elt.addEventListener('touchcancel', annulerToucher);

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
    clavier.actif = false;
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
    const p = coordonneesCanvas(elt, e.clientX, e.clientY);
    if (!estDansImage(p)) return;
    dernierPointageSouris = performance.now();
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
    return pointeurTactile.dansImage ? { x: pointeurTactile.x, y: pointeurTactile.y } : null;
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
  if (pointeurTactile.glisse) return '🔍 Glisse pour déplacer ce bout, puis relâche.';
  return '🔍 Ajuste en regardant la loupe, puis relâche le doigt pour pointer.';
}

// Loupe ×3 (par rapport à l'affichage) de la zone autour de (x, y), entièrement visible :
// au-dessus du doigt, sinon sur le côté. À dessiner après l'image et les points, avant le viseur.
function dessinerLoupe(x, y, couleurReticule) {
  const R = Math.max(20, Math.min(LOUPE_RAYON, Math.floor(Math.min(width, height) / 2) - 3));
  const Z = LOUPE_ZOOM;
  const ecart = pointeurTactile.actif ? LOUPE_ECART : 18;
  let cx = x, cy = y - R - ecart;
  if (cy - R < 2) {
    // Trop près du haut : loupe sur le côté, vers le centre de l'image. Hystérésis : elle ne
    // change de côté que si le viseur dépasse nettement le milieu (pas de saut de gauche à droite).
    const milieu = width / 2, marge = Math.min(40, width / 8);
    if (x < milieu - marge) dessinerLoupe.cote = 1;
    else if (x > milieu + marge) dessinerLoupe.cote = -1;
    else if (!dessinerLoupe.cote) dessinerLoupe.cote = x < milieu ? 1 : -1;
    cy = y;
    cx = x + dessinerLoupe.cote * (R + ecart);
  }
  cx = constrain(cx, R + 2, width - R - 2);
  cy = constrain(cy, R + 2, height - R - 2);

  const d = pixelDensity();
  const cote = 2 * R / Z; // côté de la zone agrandie (px CSS)
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.clip();
  ctx.imageSmoothingEnabled = false; // pixels nets : on voit exactement ce qu'on pointe
  // Copie du canevas sur lui-même (coordonnées source en pixels réels de la mémoire)
  const sx = (x - cote / 2) * d, sy = (y - cote / 2) * d, sc = cote * d;
  ctx.drawImage(ctx.canvas, sx, sy, sc, sc, cx - R, cy - R, 2 * R, 2 * R);
  ctx.restore();

  push();
  noFill();
  stroke(255);
  strokeWeight(4);
  ellipse(cx, cy, 2 * R, 2 * R);
  stroke(0);
  strokeWeight(1.5);
  ellipse(cx, cy, 2 * R + 5, 2 * R + 5);
  const brins = [[-R + 8, 0, -6, 0], [6, 0, R - 8, 0], [0, -R + 8, 0, -6], [0, 6, 0, R - 8]];
  stroke(255);
  strokeWeight(3.5);
  brins.forEach(b => line(cx + b[0], cy + b[1], cx + b[2], cy + b[3]));
  stroke(couleurReticule);
  strokeWeight(1.5);
  brins.forEach(b => line(cx + b[0], cy + b[1], cx + b[2], cy + b[3]));
  noStroke();
  fill(couleurReticule);
  ellipse(cx, cy, 3, 3);
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
