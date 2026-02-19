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
  let canvas = createCanvas(800, 600).parent('canvas-container');
  graph = new Graph(data, canvas);
  visor = new Visor();
  calibrator = new Calibrator();
  noCursor();
  
  // Gestion des boutons de calibration
  document.getElementById('validate-calibration').addEventListener('click', validateCalibration);
  document.getElementById('reset-calibration').addEventListener('click', resetCalibration);

  // Créer un menu déroulant
  dropdown = createSelect();
  dropdown.parent('menu');
  dropdown.style("font-size", "20px"); // Augmente la taille de la police
  dropdown.option(' Pointage Vidéo');
  dropdown.option(' Pointage Webcam');
  dropdown.option(' Calibration');
  dropdown.option(' Graphique');
  // Définir une fonction de rappel pour le changement d'option
  dropdown.changed(optionChanged);

  // Créer un menu déroulant 2 pour le nombre de mobiles
  dropdown2 = createSelect();
  dropdown2.parent('menu');
  dropdown2.style("font-size", "20px"); // Augmente la taille de la police
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
  dropdown3.style("font-size", "20px"); // Augmente la taille de la police
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
    let optionLabel = emoji + " " + videoFile.path;
    dropdown3.option(optionLabel, index);
  });
  // Définir une fonction de rappel pour le changement de vidéo
  dropdown3.changed(() => {
    etat = 'Pointage Vidéo';
    initVideoPlayer(); // Init avant loop
    loop();
  });
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
      updateInstructions(calibrator.getInstructionMessage());
      break;
    case 'Graphique':
      cursor();
      break;
    default:
      // Code pour un état inconnu
      console.log('Etat inconnu: ' + etat);
  }
}

// Dessine le curseur en mode calibration
function drawCalibrationCursor() {
  noCursor();
  stroke(0, 255, 0);
  noFill();
  ellipse(mouseX, mouseY, 20, 20);
  line(mouseX - 10, mouseY, mouseX - 2, mouseY);
  line(mouseX + 2, mouseY, mouseX + 10, mouseY);
  line(mouseX, mouseY - 10, mouseX, mouseY - 2);
  line(mouseX, mouseY + 2, mouseX, mouseY + 10);
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
    'Frame: ' + frameNum + ' | t=' + currentTime.toFixed(3) + 's | ' + pointInfo;
  
  // Met à jour les instructions selon le mode et l'état de la calibration
  let instruction = '';
  
  if (calibrator.isCalibrated) {
    instruction = '✅ Échelle: 1px = ' + (calibrator.scaleFactor * 1000).toFixed(2) + 'mm | ';
  } else {
    instruction = '⚠️ Échelle non calibrée | ';
  }
  
  if (data.numMobiles > 1) {
    let col = data.getCurrentColor();
    instruction += 'Pointer le mobile ' + (data.getCurrentMobile() + 1) + ' | ';
  }
  
  instruction += 'Clic: pointer | Ctrl+clic: annuler';
  
  updateInstructions(instruction);
}

// Valide la calibration avec la distance entrée
function validateCalibration() {
  let distanceInput = document.getElementById('real-distance');
  let distance = parseFloat(distanceInput.value);

  if (isNaN(distance) || distance <= 0) {
    distanceInput.style.border = '2px solid red';
    updateInstructions('⚠️ Entrez une distance valide (nombre positif en mètres)');
    return;
  }
  distanceInput.style.border = '';

  if (calibrator.setRealDistance(distance)) {
    // Met à jour les facteurs de conversion globaux
    xConversionFactor = calibrator.scaleFactor;
    yConversionFactor = calibrator.scaleFactor;

    // Cache l'input et affiche le message de succès
    document.getElementById('calibration-input').style.display = 'none';
    updateInstructions(calibrator.getInstructionMessage());

    console.log('Calibration réussie: 1 pixel = ' + calibrator.scaleFactor + ' mètres');
  }
}

// Réinitialise la calibration
function resetCalibration() {
  calibrator.reset();
  document.getElementById('calibration-input').style.display = 'none';
  updateInstructions(calibrator.getInstructionMessage());
}

function drawCursor() {
  noCursor();
  
  // Change la couleur du viseur selon le mobile courant
  let currentColor = data.getCurrentColor();
  visor.color = color(currentColor.r, currentColor.g, currentColor.b);
  visor.setMobileNumber(data.getCurrentMobile() + 1);
  visor.update(mouseX, mouseY);
  visor.draw();
  
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

  if (etat === 'Pointage Vidéo') {
    document.getElementById('calibration-input').style.display = 'none';
    initVideoPlayer(); // Init avant loop
    frameRate(60);
    loop();
  }
  if (etat === 'Pointage Webcam') {
    document.getElementById('calibration-input').style.display = 'none';
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
    document.getElementById('calibration-input').style.display = 'none';
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
  }
}


// Ajoute une fonction pour ajouter ou retirer un point dans data à chaque clic sur la vidéo
function mouseClicked(event) {
  // Gestion du mode calibration
  if (etat === 'Calibration' && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    if (mouseButton === LEFT) {
      let result = calibrator.addPoint(mouseX, mouseY);
      
      if (result === 'point2_set') {
        // Affiche l'input pour la distance réelle
        document.getElementById('calibration-input').style.display = 'block';
      }
      
      updateInstructions(calibrator.getInstructionMessage());
    }
    return;
  }
  
  // Gestion du pointage vidéo/webcam
  if ((etat === 'Pointage Vidéo' || etat === 'Pointage Webcam') && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {

    if (mouseButton === LEFT && keyIsDown(CONTROL)) {
      data.removeLastPoint();
      if (videoPlayer) {
        videoPlayer.previousFrame();
      }
      if (webcamPlayer) {
        webcamPlayer.previousFrame();
      }
    } else if (mouseButton === LEFT) {
      let calibratedX = mouseX * xConversionFactor;
      let calibratedY = (height - mouseY) * yConversionFactor;

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
}

