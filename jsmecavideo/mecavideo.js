let videoPlayer;
let visor;
let dropdown;
let dropdown2;

let xConversionFactor = 1; // Conversion de pixels en mètres
let yConversionFactor = 1; // Conversion de pixels en mètres
let data = new Data(xConversionFactor, yConversionFactor);
let graph;

let etat = 'Videos'; // Initialiser l'état à 'Video'

// MANY THANKS TO : https://webetab.ac-bordeaux.fr/Pedagogie/Physique/site/labo/tice/c_video_tice.htm
let videoFiles = [
  { path: 'videos/bille1-iv5.mp4', framerate: 1000000 / 33333 },
  { path: 'videos/bille2-iv5.mp4', framerate: 1000000 / 33333 },
  { path: 'videos/bille3-iv5.mp4', framerate: 500000 / 16129 },
  { path: 'videos/billegrosse.mp4', framerate: 25 },
  { path: 'videos/billepetite.mp4', framerate: 25 },
  { path: 'videos/chute.mp4', framerate: 25 },
  { path: 'videos/disque33t.mp4', framerate: 25 },
  { path: 'videos/disque45t.mp4', framerate: 25 },
  { path: 'videos/moto-relatif.mp4', framerate: 25 },
  { path: 'videos/parabolique.mp4', framerate: 25 },
  { path: 'videos/vague2cm5.mp4', framerate: 20 },
  { path: 'videos/vague3.mp4', framerate: 25 },
  { path: 'videos/vague3cm0.mp4', framerate: 20 }
]; // Ajoutez vos fichiers vidéo ici avec leur framerate respectif obtenu grace à la commande suivante
// # ffprobe -v error -select_streams v -of default=noprint_wrappers=1:nokey=1 -show_entries stream=r_frame_rate vague3.mp4 

function setup() {

  videoPlayer = new VideoPlayer('videos/chute.mp4', 25);
  let canvas = createCanvas(800, 600).parent('canvas-container');
  graph = new Graph(data, canvas);
  visor = new Visor();
  noCursor();

  // Créer un menu déroulant
  dropdown = createSelect();
  dropdown.parent('menu');
  dropdown.option(' Videos');
  dropdown.option(' Pointage');
  dropdown.option(' Graphiques');
  // Définir une fonction de rappel pour le changement d'option
  dropdown.changed(optionChanged);

  // Créer un menu déroulant 2
  dropdown2 = createSelect();
  dropdown2.parent('menu');
  videoFiles.forEach((videoFile, index) => {
    dropdown2.option(videoFile.path, index); // Utilisez l'index comme valeur
  });
  // Définir une fonction de rappel pour le changement de vidéo
  dropdown2.changed(() => {
    if (videoPlayer) {
      videoPlayer.removeElements();
    }
    let selectedVideoIndex = dropdown2.value();
    videoPlayer = new VideoPlayer(videoFiles[selectedVideoIndex].path, videoFiles[selectedVideoIndex].framerate);
  });
}

function draw() {

  switch (etat) {
    case 'Videos':
      videoPlayer.draw();
      cursor(); 
      break;
    case 'Pointage':
      videoPlayer.draw();
      data.getAllPoints().forEach((point) => {
        let x = point.x / xConversionFactor;
        let y = point.y / yConversionFactor;
        // Dessine une croix
        line(x - 3, y - 3, x + 3, y + 3);
        line(x + 3, y - 3, x - 3, y + 3);
      });
      drawCursor(); 
      break;
    case 'Graphiques':
      cursor(); 
      break;
    default:
      // Code pour un état inconnu
      console.log('Etat inconnu: ' + etat);
  }
}

function drawCursor(){
  noCursor();
  visor.update(mouseX, mouseY);
  visor.draw();
}

function optionChanged() {
  etat = dropdown.value().trim(); // Mettre à jour l'état lorsque l'option change
  console.log(etat);

  if (etat === 'Vidéo') { 
    graph.destroy();
    let selectedVideoIndex = dropdown2.value();
    videoPlayer = new VideoPlayer(videoFiles[selectedVideoIndex].path, videoFiles[selectedVideoIndex].framerate);
  }

  if (etat === 'Pointage') {
    graph.destroy();
    videoPlayer.addElements();
    videoPlayer.jumpToStart(); // Remettre la vidéo au début
  }
  if (etat === 'Graphiques') {
  videoPlayer.removeElements();
  graph.destroy();
  graph.create();
  }
}


// Ajoute une fonction pour ajouter ou retirer un point dans data à chaque clic sur la vidéo
function mouseClicked(event) {
  if (etat === 'Pointage' && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {

      if (mouseButton === LEFT && keyIsDown(CONTROL)) {
        data.removeLastPoint();
        videoPlayer.previousFrame();
      } else if (mouseButton === LEFT) {
        let calibratedX = mouseX * xConversionFactor;
        let calibratedY = mouseY * yConversionFactor;
      
          data.addPoint(videoPlayer.time, calibratedX, calibratedY);
          videoPlayer.nextFrame();
      
      }
  }
}
