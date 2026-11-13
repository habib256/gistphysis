let videoPlayer;
let webcamPlayer;
let visor;
let dropdown;
let dropdown2;
let dropdown3;

let xConversionFactor = 1; // Echelle de pixels en mètres
let yConversionFactor = 1; // Echelle de pixels en mètres
let timeConversionFactor = 1;
let data = new Data();
let graph;
let calibrator;

let etat = 'Pointage Vidéo';

let videoFiles = [
  { path: 'videos/chute.mp4', framerate: 25 },
  { path: 'videos/parabolique.mp4', framerate: 25 },
  { path: 'videos/disque33t.mp4', framerate: 25 },
  { path: 'videos/disque45t.mp4', framerate: 25 },
  { path: 'videos/VenusTerreMars.mp4', framerate: 25 },
  { path: 'videos/MasseRoule.mp4', framerate: 15 },
  { path: 'videos/PenduleSimpleAmorti_38cm1.mp4', framerate: 25 },
  { path: 'videos/RessortVertical_Masse24g30.mp4', framerate: 25 },
  { path: 'videos/bille1-iv5.mp4', framerate: 1000000 / 33333 },
  { path: 'videos/bille2-iv5.mp4', framerate: 1000000 / 33333 },
  { path: 'videos/bille3-iv5.mp4', framerate: 500000 / 16129 },
  { path: 'videos/billegrosse.mp4', framerate: 25 },
  { path: 'videos/billepetite.mp4', framerate: 25 },
  { path: 'videos/BilleFer_Eau25C_2g055_7mm93.mp4', framerate: 25 },
  { path: 'videos/moto-relatif.mp4', framerate: 25 },
  { path: 'videos/vague2cm5.mp4', framerate: 20 },
  { path: 'videos/vague3.mp4', framerate: 25 },
  { path: 'videos/vague3cm0.mp4', framerate: 20 },
  { path: 'videos/Eclatement2MA.mp4', framerate: 25 },
  { path: 'videos/TableHorizChocPresqueElastique_R631g7_B749g2.mp4', framerate: 25 },
  { path: 'videos/TableHorizRectiligneUniforme_631g7.mp4', framerate: 25 }
];
function setup() {

  videoPlayer = new VideoPlayer('videos/chute.mp4', 25);
  let canvas = createCanvas(LARGEUR_INTERNE, HAUTEUR_INTERNE).parent('canvas-container');
  graph = new Graph(data, canvas);
  visor = new Visor();
  calibrator = new Calibrator();
  noCursor();

  // Tablettes : pointage au doigt (avec loupe) et affichage à l'échelle de l'écran
  installerPointageTactile(canvas.elt);

  // Bouton visible « Annuler le dernier point » (équivalent de Ctrl+clic)
  document.getElementById('bouton-annuler').addEventListener('click', annulerDernierPoint);

  // Gestion des boutons de calibration
  document.getElementById('validate-calibration').addEventListener('click', validateCalibration);
  document.getElementById('reset-calibration').addEventListener('click', resetCalibration);
  document.getElementById('real-distance').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') validateCalibration();
  });

  // Créer un menu déroulant
  dropdown = createSelect();
  dropdown.parent('menu');
  dropdown.attribute('aria-label', 'Mode');
  dropdown.option(' Pointage Vidéo');
  dropdown.option(' Pointage Webcam');
  dropdown.option(' Calibration');
  dropdown.option(' Graphique');
  // Définir une fonction de rappel pour le changement d'option
  dropdown.changed(optionChanged);

  // Créer un menu déroulant 2 pour le nombre de mobiles
  dropdown2 = createSelect();
  dropdown2.parent('menu');
  dropdown2.attribute('aria-label', 'Nombre de mobiles');
  dropdown2.option('1 mobile', 1);
  dropdown2.option('2 mobiles', 2);
  dropdown2.option('3 mobiles', 3);
  dropdown2.option('4 mobiles', 4);
  dropdown2.changed(() => {
    let numMobiles = parseInt(dropdown2.value());
    data.setNumMobiles(numMobiles);
    data.clearAllPoints();
    console.log('Nombre de mobiles: ' + numMobiles);
  });

  // Créer un menu déroulant 3
  dropdown3 = createSelect();
  dropdown3.parent('menu');
  dropdown3.attribute('aria-label', 'Vidéo');
  videoFiles.forEach((videoFile, index) => {
    let emoji = "";
    if (videoFile.path.includes("chute")) {
      emoji = "😱";
    } else if (videoFile.path.includes("parabolique")) {
      emoji = "🚀";
    } else if (videoFile.path.includes("disque")) {
      emoji = "🪩";
    } else if (videoFile.path.includes("VenusTerreMars")) {
      emoji = "🪐";
    } else if (videoFile.path.includes("MasseRoule")) {
      emoji = "⚽";
    } else if (videoFile.path.includes("Pendule")) {
      emoji = "⏱️";
    } else if (videoFile.path.includes("Ressort")) {
      emoji = "🌀";
    } else if (videoFile.path.includes("bille")) {
      emoji = "⚫";
    } else if (videoFile.path.includes("moto")) {
      emoji = "🏍️";
    } else if (videoFile.path.includes("vague")) {
      emoji = "🌊";
    } else if (videoFile.path.includes("Eclatement")) {
      emoji = "💥";
    } else if (videoFile.path.includes("TableHorizChocPresqueElastique") || videoFile.path.includes("TableHorizRectiligneUniforme")) {
      emoji = "📏";
    } else {
      emoji = "🎞️";
    }
    let optionLabel = emoji + " " + videoFile.path.replace('videos/', '');
    dropdown3.option(optionLabel, index);
  });
  // Définir une fonction de rappel pour le changement de vidéo
  dropdown3.changed(() => {
    etat = 'Pointage Vidéo';
    initVideoPlayer(); // Init avant loop
    majModeAffichage();
    loop();
  });

  // Taille d'affichage adaptée à l'écran (une fois tous les menus créés)
  installerMiseAEchelle();
}

function draw() {

  switch (etat) {
    case 'Pointage Vidéo':
      if (videoPlayer) {
        videoPlayer.draw();
      }
      drawCursor();
      updateFrameInfo();
      break;
    case 'Pointage Webcam':
      if (webcamPlayer) {
        webcamPlayer.draw();
      }
      drawCursor();
      updateFrameInfo();
      break;
    case 'Calibration':
      if (videoPlayer) {
        videoPlayer.draw();
      }
      calibrator.draw();
      drawCalibrationCursor();
      updateInstructions(messagePointageTactile() || calibrator.getInstructionMessage());
      break;
    case 'Graphique':
      cursor();
      break;
    default:
      // Code pour un état inconnu
      console.log('Etat inconnu: ' + etat);
  }
}

// Dessine le curseur en mode calibration (et la loupe quand un doigt est posé)
function drawCalibrationCursor() {
  noCursor();
  let pos = positionViseur();
  if (!pos) return;
  if (pointeurTactile.actif) {
    dessinerLoupe(pos.x, pos.y, color(0, 255, 0));
  }
  push();
  stroke(0, 255, 0);
  noFill();
  ellipse(pos.x, pos.y, 20, 20);
  line(pos.x - 10, pos.y, pos.x - 2, pos.y);
  line(pos.x + 2, pos.y, pos.x + 10, pos.y);
  line(pos.x, pos.y - 10, pos.x, pos.y - 2);
  line(pos.x, pos.y + 2, pos.x, pos.y + 10);
  pop();
}

// Met à jour la zone d'instructions
function updateInstructions(message) {
  document.getElementById('instructions').textContent = message;
}

// Met à jour les informations de frame et temps
function updateFrameInfo() {
  let frameNum = 0;
  let currentTime = 0;
  
  if (videoPlayer && videoPlayer.isLoaded) {
    currentTime = videoPlayer.video.time();
    frameNum = Math.round(currentTime * videoPlayer.framerate);
  } else if (webcamPlayer && webcamPlayer.isRecorded) {
    frameNum = webcamPlayer.frameIndex;
    currentTime = frameNum / webcamPlayer.framerate;
  }
  
  // Affiche les infos de frame et le nombre de points
  let pointInfo = data.getTotalPointCount() + ' pts';
  if (data.numMobiles > 1) {
    pointInfo = 'M' + (data.getCurrentMobile() + 1) + ' | ' + pointInfo;
  }
  
  document.getElementById('frame-info').textContent =
    'Image : ' + frameNum + ' | t = ' + currentTime.toFixed(3).replace('.', ',') + ' s | ' + pointInfo;

  // Le bouton Annuler n'est actif que s'il y a un point à retirer
  let boutonAnnuler = document.getElementById('bouton-annuler');
  let sansPoint = data.getTotalPointCount() === 0;
  if (boutonAnnuler.disabled !== sansPoint) {
    boutonAnnuler.disabled = sansPoint;
  }

  // Pendant un pointage au doigt, on guide l'élève
  let messageTactile = messagePointageTactile();
  if (messageTactile) {
    updateInstructions(messageTactile);
    return;
  }

  // Met à jour les instructions selon le mode et l'état de la calibration
  let instruction = '';
  
  if (calibrator.isCalibrated) {
    instruction = '✅ Échelle : 1 px = ' + (calibrator.scaleFactor * 1000).toFixed(2).replace('.', ',') + ' mm | ';
  } else {
    instruction = '⚠️ Échelle non calibrée | ';
  }
  
  if (data.numMobiles > 1) {
    let col = data.getCurrentColor();
    instruction += 'Pointer le mobile ' + (data.getCurrentMobile() + 1) + ' | ';
  }
  
  instruction += 'Pointer : clic ou doigt | Annuler : bouton ↶ ou Ctrl+clic';
  
  updateInstructions(instruction);
}

// Lit une distance saisie : accepte la virgule (« 0,5 ») et l'unité « m » en fin de saisie
function lireDistance(texte) {
  let propre = String(texte).trim().replace(/\s+/g, '').replace(',', '.').replace(/m$/i, '');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(propre)) return NaN;
  return parseFloat(propre);
}

// Valide la calibration avec la distance entrée
function validateCalibration() {
  let distanceInput = document.getElementById('real-distance');
  let distance = lireDistance(distanceInput.value);

  if (isNaN(distance) || distance <= 0) {
    distanceInput.classList.add('erreur');
    updateInstructions('⚠️ Entrez une distance valide (nombre positif en mètres, par exemple 0,5)');
    return;
  }
  distanceInput.classList.remove('erreur');

  if (calibrator.setRealDistance(distance)) {
    // Met à jour les facteurs de conversion globaux
    xConversionFactor = calibrator.scaleFactor;
    yConversionFactor = calibrator.scaleFactor;

    distanceInput.blur(); // Referme le clavier virtuel
    majSaisieCalibration();
    updateInstructions(calibrator.getInstructionMessage());

    console.log('Calibration réussie: 1 pixel = ' + calibrator.scaleFactor + ' mètres');
  }
}

// Réinitialise la calibration
function resetCalibration() {
  calibrator.reset();
  document.getElementById('real-distance').classList.remove('erreur');
  majSaisieCalibration();
  updateInstructions(calibrator.getInstructionMessage());
}

// La barre de calibration reste visible pendant tout le mode Calibration (pas de saut
// de mise en page) ; la saisie n'est active qu'une fois les deux points placés.
function majSaisieCalibration() {
  let barre = document.getElementById('calibration-input');
  barre.style.display = etat === 'Calibration' ? 'flex' : 'none';
  let deuxPoints = calibrator.state === 'waiting_distance' || calibrator.state === 'calibrated';
  document.getElementById('real-distance').disabled = !deuxPoints;
  document.getElementById('validate-calibration').disabled = !deuxPoints;
}

// Classe CSS du mode courant (le doigt ne fait pas défiler la page pendant le pointage)
// et visibilité des barres propres à chaque mode
function majModeAffichage() {
  document.body.classList.toggle('mode-pointage', modePointageActif());
  document.getElementById('bouton-annuler').style.display =
    (etat === 'Pointage Vidéo' || etat === 'Pointage Webcam') ? '' : 'none';
  majSaisieCalibration();
}

// Vrai dans les modes où l'on pointe sur l'image (pointage et calibration)
function modePointageActif() {
  return etat === 'Pointage Vidéo' || etat === 'Pointage Webcam' || etat === 'Calibration';
}

function drawCursor() {
  noCursor();

  // Change la couleur du viseur selon le mobile courant
  let currentColor = data.getCurrentColor();
  visor.color = color(currentColor.r, currentColor.g, currentColor.b);
  visor.setMobileNumber(data.getCurrentMobile() + 1);

  // Affiche la légende des mobiles si nécessaire
  visor.drawLegend(data);

  // Dessine les points de chaque mobile avec sa couleur
  for (let m = 0; m < data.numMobiles; m++) {
    let pts = data.getPointsForMobile(m);
    let col = data.getColor(m);
    stroke(col.r, col.g, col.b);
    strokeWeight(2);
    
    pts.forEach((point, index) => {
      let x = point.x / xConversionFactor;
      let y = height - point.y / yConversionFactor;
      
      // Dessine une croix
      line(x - 5, y - 5, x + 5, y + 5);
      line(x + 5, y - 5, x - 5, y + 5);
    });
  }

  strokeWeight(1);

  // Viseur : suit la souris sur l'image, ou le doigt tant qu'il est posé (avec la loupe)
  let pos = positionViseur();
  if (pos) {
    if (pointeurTactile.actif) {
      dessinerLoupe(pos.x, pos.y, visor.color);
    }
    visor.update(pos.x, pos.y);
    visor.draw();
  }
}

function initVideoPlayer() {
  data.clearAllPoints(); // Effacer les points à chaque initialisation du lecteur vidéo
  graph.destroy();
  dropdown.selected(' Pointage Vidéo'); // Réinitialiser la valeur de dropdown à 'Pointage'
  if (webcamPlayer) {
    webcamPlayer.removeElements();
    webcamPlayer = null; // Détruire l'objet webcamPlayer
  }
  if (videoPlayer) {
    videoPlayer.removeElements();
  }
  let selectedVideoIndex = dropdown3.value();
  videoPlayer = new VideoPlayer(videoFiles[selectedVideoIndex].path, videoFiles[selectedVideoIndex].framerate);
  videoPlayer.jumpToStart(); // Remettre la vidéo au début   
}

function optionChanged() {
  etat = dropdown.value().trim(); // Mettre à jour l'état lorsque l'option change
  console.log(etat);
  annulerToucher();

  if (etat === 'Pointage Vidéo') {
    initVideoPlayer(); // Init avant loop
    frameRate(60);
    loop();
  }
  if (etat === 'Pointage Webcam') {
    data.clearAllPoints(); // Toujours effacer les points lors du passage au mode webcam
    if (videoPlayer) {
      videoPlayer.removeElements();
      videoPlayer = null; // Détruire l'objet videoPlayer
    }
    graph.destroy();
    webcamPlayer = new WebcamPlayer(15); // L'argument correspond au framerate de capture de la webcam
    webcamPlayer.addElements();
    webcamPlayer.jumpToStart(); // Remettre la vidéo au début
    loop();
  }
  if (etat === 'Calibration') {
    // Assure que le videoPlayer est visible pour la calibration
    if (!videoPlayer) {
      let selectedVideoIndex = dropdown3.value();
      videoPlayer = new VideoPlayer(videoFiles[selectedVideoIndex].path, videoFiles[selectedVideoIndex].framerate);
    }
    if (webcamPlayer) {
      webcamPlayer.removeElements();
      webcamPlayer = null;
    }
    graph.destroy();
    calibrator.reset();
    updateInstructions(calibrator.getInstructionMessage());
    frameRate(60);
    loop();
  }
  if (etat === 'Graphique') {
    noLoop();
    if (videoPlayer) {
      videoPlayer.removeElements();
      videoPlayer = null;
    }
    if (webcamPlayer) {
      webcamPlayer.removeElements();
      webcamPlayer = null;
    }
    graph.destroy();
    graph.create();
    updateInstructions('📈 Choisissez la grandeur à tracer et le mobile dans les menus ci-dessus');
  }
  majModeAffichage();
}


// Enregistre un pointage en (x, y), coordonnées internes du canevas (0..800, 0..600).
// Appelé par le clic souris comme par le doigt (au relâchement).
function traiterPointage(x, y) {
  if (x < 0 || x > width || y < 0 || y > height) return;

  // Gestion du mode calibration
  if (etat === 'Calibration') {
    calibrator.addPoint(x, y);
    majSaisieCalibration();
    updateInstructions(calibrator.getInstructionMessage());
    return;
  }

  // Gestion du pointage vidéo/webcam
  if (etat === 'Pointage Vidéo' || etat === 'Pointage Webcam') {
    let calibratedX = x * xConversionFactor;
    let calibratedY = (height - y) * yConversionFactor;

    if (videoPlayer) {
      let currentTime = videoPlayer.video.time();
      data.addPoint(currentTime, calibratedX, calibratedY);
      videoPlayer.nextFrame();
    }
    if (webcamPlayer) {
      let currentTime = webcamPlayer.frameIndex / webcamPlayer.framerate;
      data.addPoint(currentTime, calibratedX, calibratedY);
      webcamPlayer.nextFrame();
    }
  }
}

// Retire le dernier point et recule d'une image (bouton « Annuler » ou Ctrl+clic)
function annulerDernierPoint() {
  if (etat !== 'Pointage Vidéo' && etat !== 'Pointage Webcam') return;
  if (data.getTotalPointCount() === 0) return;
  data.removeLastPoint();
  if (videoPlayer) {
    videoPlayer.previousFrame();
  }
  if (webcamPlayer) {
    webcamPlayer.previousFrame();
  }
}

// Clic souris (p5.js) : pointe, ou annule le dernier point avec Ctrl+clic.
// Les touchers sur l'image ne passent pas par ici (voir interface.js).
function mouseClicked(event) {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  if (mouseButton !== LEFT) return;
  if (!event || event.target !== document.querySelector('#canvas-container canvas')) return;

  let pointage = etat === 'Pointage Vidéo' || etat === 'Pointage Webcam';
  if (pointage && (keyIsDown(CONTROL) || event.ctrlKey)) {
    if (!annulationDejaTraitee()) {
      annulerDernierPoint();
    }
    return;
  }
  traiterPointage(mouseX, mouseY);
}
