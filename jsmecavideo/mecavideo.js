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
  noCursor();

  // Créer un menu déroulant
  dropdown = createSelect();
  dropdown.parent('menu');
  dropdown.option(' Pointage Vidéo');
  dropdown.option(' Pointage Webcam');
  dropdown.option(' Graphique');
  // Définir une fonction de rappel pour le changement d'option
  dropdown.changed(optionChanged);

  // Créer un menu déroulant 2
  dropdown2 = createSelect();
  dropdown2.parent('menu');
  dropdown2.option('1 point');
  dropdown2.option('2 points');
  dropdown2.option('3 points');
  dropdown2.option('4 points');

  // Créer un menu déroulant 3
  dropdown3 = createSelect();
  dropdown3.parent('menu');
  videoFiles.forEach((videoFile, index) => {
    dropdown3.option(videoFile.path, index); // Utilisez l'index comme valeur
  });
  // Définir une fonction de rappel pour le changement de vidéo
  dropdown3.changed(() => {
    etat = 'Pointage Vidéo';
    data.clearAllPoints();
    initVideoPlayer();
  });
}

function draw() {

  switch (etat) {
    case 'Pointage Vidéo':
      videoPlayer.draw();
      drawCursor();
      break;
    case 'Pointage Webcam':
      if (webcamPlayer) {
        webcamPlayer.draw();
      }
      drawCursor();
      break;
    case 'Graphique':
      cursor();
      break;
    default:
      // Code pour un état inconnu
      console.log('Etat inconnu: ' + etat);
  }
}

function drawCursor() {
  noCursor();
  visor.update(mouseX, mouseY);
  visor.draw();
  data.getAllPoints().forEach((point) => {
    let x = point.x / xConversionFactor;
    let y = 600 - point.y / yConversionFactor;
    // Dessine une croix
    line(x - 3, y - 3, x + 3, y + 3);
    line(x + 3, y - 3, x - 3, y + 3);
  });
}

function initVideoPlayer() {
  graph.destroy();
  dropdown.selected(' Pointage Vidéo'); // Réinitialiser la valeur de dropdown à 'Pointage'
  if (webcamPlayer) {
    data.clearAllPoints();
    webcamPlayer.removeElements();
    webcamPlayer = null; // Détruire l'objet webcamPlayer
    videoPlayer = new VideoPlayer('videos/chute.mp4', 25);
  }
  if(videoPlayer) {
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
    initVideoPlayer();
  }
  if (etat === 'Pointage Webcam') {
    if (videoPlayer) {
      videoPlayer.removeElements();
      videoPlayer = null; // Détruire l'objet videoPlayer
      data.clearAllPoints();
    }
    graph.destroy();
    webcamPlayer = new WebcamPlayer(15); // L'argument correspond au framerate de capture de la webcam
    webcamPlayer.addElements();
    webcamPlayer.jumpToStart(); // Remettre la vidéo au début
  }
  if (etat === 'Graphique') {
    if(videoPlayer){
    videoPlayer.removeElements();
    }
    if(webcamPlayer){
      webcamPlayer.removeElements();
    }
    graph.destroy();
    graph.create();
  }
}


// Ajoute une fonction pour ajouter ou retirer un point dans data à chaque clic sur la vidéo
function mouseClicked(event) {
  if ((etat === 'Pointage Vidéo' || etat === 'Pointage Webcam') && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {

    if (mouseButton === LEFT && keyIsDown(CONTROL)) {
      data.removeLastPoint();
      videoPlayer.previousFrame();
    } else if (mouseButton === LEFT) {
      let calibratedX = mouseX * xConversionFactor;
      let calibratedY = 600 - mouseY * yConversionFactor;

      data.addPoint(videoPlayer.time, calibratedX, calibratedY);
      videoPlayer.nextFrame();

    }
  }
}

