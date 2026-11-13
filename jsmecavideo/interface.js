// interface.js — adaptation de jsmecavideo aux tablettes et au tactile
//
// - Mise à l'échelle : le canevas garde sa résolution interne 800×600 (toutes les
//   coordonnées de pointage et de calibration restent dans ce repère), mais il est
//   affiché à la taille qui tient dans la fenêtre (ou dans l'iframe).
// - Pointage au doigt : on pose le doigt sur l'objet, une loupe (×3) apparaît au-dessus
//   du doigt avec un réticule ; on glisse pour ajuster en regardant la loupe, et le
//   point est enregistré au relâchement. Relâcher hors de l'image annule ce pointage.
// - Petits utilitaires d'interface : boutons à icône et curseur de temps adaptés au doigt.

const LARGEUR_INTERNE = 800;   // résolution interne du canevas (px)
const HAUTEUR_INTERNE = 600;
const LARGEUR_MINI = 360;      // en dessous, on accepte un défilement vertical plutôt qu'une image minuscule

// État du pointeur
let pointeurTactile = {
  actif: false,      // un doigt est posé sur l'image
  id: null,          // identifiant du toucher suivi
  x: 0,              // position en coordonnées internes du canevas (0..800, 0..600)
  y: 0,
  dansImage: false
};
let souris = {
  dansCanvas: false  // la souris survole le canevas (sinon on n'affiche pas de viseur)
};
let derniereAnnulationMenuContextuel = -Infinity;

// ---------------------------------------------------------------------------
// Mise à l'échelle
// ---------------------------------------------------------------------------

let ajustementEnAttente = false;

function demanderAjustementTaille() {
  if (ajustementEnAttente) return;
  ajustementEnAttente = true;
  requestAnimationFrame(() => {
    ajustementEnAttente = false;
    ajusterTaille();
  });
}

// Calcule la taille d'affichage du canevas : la plus grande qui tient en largeur
// (sans défilement horizontal) et en hauteur avec les barres de menus et de boutons.
function ajusterTaille() {
  const app = document.getElementById('app');
  const conteneur = document.getElementById('canvas-container');
  if (!app || !conteneur) return;

  const largeurDispo = app.clientWidth;
  const hauteurAutres = app.offsetHeight - conteneur.offsetHeight;
  const hauteurDispo = window.innerHeight - hauteurAutres;

  let largeur = Math.min(LARGEUR_INTERNE, largeurDispo, Math.floor(hauteurDispo * LARGEUR_INTERNE / HAUTEUR_INTERNE));
  largeur = Math.max(largeur, Math.min(largeurDispo, LARGEUR_MINI));
  largeur = Math.floor(largeur);
  const hauteur = Math.round(largeur * HAUTEUR_INTERNE / LARGEUR_INTERNE);

  if (conteneur.style.width !== largeur + 'px' || conteneur.style.height !== hauteur + 'px') {
    conteneur.style.width = largeur + 'px';
    conteneur.style.height = hauteur + 'px';
  }
}

function installerMiseAEchelle() {
  window.addEventListener('resize', demanderAjustementTaille);
  window.addEventListener('orientationchange', demanderAjustementTaille);
  // Les barres changent de hauteur (menus qui passent sur deux lignes, saisie de la
  // calibration affichée…) : on recalcule la taille du canevas
  if (typeof ResizeObserver !== 'undefined') {
    const observateur = new ResizeObserver(demanderAjustementTaille);
    ['menu', 'info-bar', 'calibration-input', 'acceleration-info', 'barre-outils'].forEach(id => {
      const el = document.getElementById(id);
      if (el) observateur.observe(el);
    });
  }
  ajusterTaille();
}

// ---------------------------------------------------------------------------
// Pointage tactile et souris sur le canevas
// ---------------------------------------------------------------------------

// Convertit une position écran (clientX, clientY) en coordonnées internes du canevas,
// en tenant compte de la mise à l'échelle de l'affichage
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

// Retrouve le toucher suivi dans une liste de touchers
function toucherSuivi(liste) {
  for (let i = 0; i < liste.length; i++) {
    if (liste[i].identifier === pointeurTactile.id) return liste[i];
  }
  return null;
}

function annulerToucher() {
  pointeurTactile.actif = false;
  pointeurTactile.id = null;
}

function installerPointageTactile(elt) {
  elt.addEventListener('touchstart', (e) => {
    if (!modePointageActif()) return; // mode Graphique : on laisse le navigateur gérer
    e.preventDefault(); // pas de défilement, de zoom, de menu sur appui long, ni de faux clic souris
    souris.dansCanvas = false;
    if (e.touches.length > 1) {
      // Deuxième doigt (pincement…) : on abandonne le pointage en cours
      annulerToucher();
      return;
    }
    const t = e.changedTouches[0];
    const p = coordonneesCanvas(elt, t.clientX, t.clientY);
    pointeurTactile.actif = true;
    pointeurTactile.id = t.identifier;
    pointeurTactile.x = p.x;
    pointeurTactile.y = p.y;
    pointeurTactile.dansImage = estDansImage(p);
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
  }, { passive: false });

  elt.addEventListener('touchend', (e) => {
    if (!pointeurTactile.actif) return;
    e.preventDefault();
    const t = toucherSuivi(e.changedTouches);
    if (!t) return;
    const p = coordonneesCanvas(elt, t.clientX, t.clientY);
    annulerToucher();
    // Relâcher hors de l'image annule ce pointage
    if (estDansImage(p)) {
      traiterPointage(p.x, p.y);
    }
  }, { passive: false });

  elt.addEventListener('touchcancel', annulerToucher);

  // Souris : le viseur n'est affiché que lorsque la souris survole l'image
  elt.addEventListener('mousemove', () => { souris.dansCanvas = true; });
  elt.addEventListener('mouseenter', () => { souris.dansCanvas = true; });
  elt.addEventListener('mouseleave', () => { souris.dansCanvas = false; });

  // Pas de menu contextuel sur l'image pendant le pointage. Sur Mac, Ctrl+clic ouvre
  // ce menu au lieu d'envoyer un clic : on y traite donc aussi l'annulation.
  elt.addEventListener('contextmenu', (e) => {
    if (!modePointageActif()) return;
    e.preventDefault();
    if (e.ctrlKey && (etat === 'Pointage Vidéo' || etat === 'Pointage Webcam')) {
      derniereAnnulationMenuContextuel = performance.now();
      annulerDernierPoint();
    }
  });
}

// Vrai si un Ctrl+clic vient d'être traité par le menu contextuel (évite une double annulation)
function annulationDejaTraitee() {
  return performance.now() - derniereAnnulationMenuContextuel < 600;
}

// Position du viseur (coordonnées internes) ou null s'il ne faut pas l'afficher :
// au doigt, uniquement pendant que le doigt est posé ; à la souris, pendant le survol.
function positionViseur() {
  if (pointeurTactile.actif) {
    return pointeurTactile.dansImage ? { x: pointeurTactile.x, y: pointeurTactile.y } : null;
  }
  if (souris.dansCanvas && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    return { x: mouseX, y: mouseY };
  }
  return null;
}

// Message d'aide pendant un pointage au doigt (null sinon)
function messagePointageTactile() {
  if (!pointeurTactile.actif) return null;
  if (!pointeurTactile.dansImage) return '✋ Relâchez ici pour annuler ce pointage, ou revenez sur l’image';
  return '🔍 Ajustez en regardant la loupe, puis relâchez le doigt pour pointer';
}

// Dessine une loupe (×3) de la zone autour de (x, y), placée au-dessus du doigt
// (ou sur le côté près du bord haut), avec un réticule au centre.
// À appeler après avoir dessiné l'image et les points, avant le viseur.
function dessinerLoupe(x, y, couleurReticule) {
  const R = 75;          // rayon de la loupe (unités du canevas)
  const Z = 3;           // grossissement
  const ECART = 50;      // distance entre le bord de la loupe et le doigt
  let cx = x;
  let cy = y - R - ECART;
  if (cy - R < 0) {
    // Trop près du haut : loupe sur le côté, vers le centre de l'image
    cy = constrain(y, R, height - R);
    cx = x < width / 2 ? x + R + ECART : x - R - ECART;
  }
  cx = constrain(cx, R, width - R);

  const d = pixelDensity();
  const cote = 2 * R / Z; // côté de la zone agrandie
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.clip();
  ctx.imageSmoothingEnabled = false; // pixels nets : on voit exactement ce qu'on pointe
  // Copie du canevas sur lui-même (les coordonnées source sont en pixels réels)
  ctx.drawImage(ctx.canvas, (x - cote / 2) * d, (y - cote / 2) * d, cote * d, cote * d,
    cx - R, cy - R, 2 * R, 2 * R);
  ctx.restore();

  push();
  noFill();
  stroke(255);
  strokeWeight(4);
  ellipse(cx, cy, 2 * R, 2 * R);
  stroke(0);
  strokeWeight(1);
  ellipse(cx, cy, 2 * R + 4, 2 * R + 4);
  // Réticule : trait blanc large puis trait coloré fin, avec un vide au centre
  const brins = [[-R + 8, 0, -6, 0], [6, 0, R - 8, 0], [0, -R + 8, 0, -6], [0, 6, 0, R - 8]];
  stroke(255);
  strokeWeight(3);
  brins.forEach(b => line(cx + b[0], cy + b[1], cx + b[2], cy + b[3]));
  stroke(couleurReticule);
  strokeWeight(1.5);
  brins.forEach(b => line(cx + b[0], cy + b[1], cx + b[2], cy + b[3]));
  noStroke();
  fill(couleurReticule);
  ellipse(cx, cy, 3, 3);
  pop();
}

// ---------------------------------------------------------------------------
// Éléments de contrôle adaptés au doigt
// ---------------------------------------------------------------------------

// Bouton à icône (48 px de haut), avec un libellé pour les lecteurs d'écran.
// L'action est déclenchée au « click » : souris, doigt et clavier.
function creerBoutonIcone(libelle, icone, action) {
  const bouton = createButton('');
  bouton.parent('controls');
  bouton.class('bouton-icone');
  bouton.attribute('type', 'button');
  bouton.attribute('title', libelle);
  bouton.attribute('aria-label', libelle);
  bouton.style('background-image', 'url("img/tango/' + icone + '")');
  bouton.elt.addEventListener('click', action);
  return bouton;
}

// Curseur de temps ; la propriété `actif` est vraie pendant qu'on le manipule
// (souris ou doigt), pour que le dessin ne le repositionne pas sous le doigt.
function creerCurseurTemps() {
  const curseur = createSlider(0, 1, 0, 0.01);
  curseur.parent('controls');
  curseur.class('curseur-temps');
  curseur.attribute('aria-label', 'Position dans la vidéo');
  curseur.actif = false;
  curseur.elt.addEventListener('pointerdown', () => { curseur.actif = true; });
  const relacher = () => { curseur.actif = false; };
  curseur.elt.addEventListener('pointerup', relacher);
  curseur.elt.addEventListener('pointercancel', relacher);
  curseur.elt.addEventListener('lostpointercapture', relacher);
  curseur.elt.addEventListener('change', relacher);
  return curseur;
}
