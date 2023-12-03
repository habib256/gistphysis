let videoPlayer;
let visor;
let dropdown;
let dropdown2;
// MANY THANKS TO : https://webetab.ac-bordeaux.fr/Pedagogie/Physique/site/labo/tice/c_video_tice.htm
let videoFiles = ['videos/bille1-iv5.mp4','videos/bille2-iv5.mp4','videos/bille3-iv5.mp4','videos/billegrosse.mp4','videos/billepetite.mp4','videos/chute.mp4', 'videos/disque33t.mp4','videos/disque45t.mp4','videos/jump_side_view.mp4', 'videos/moto-relatif.mp4', 'videos/parabolique.mp4','videos/vague2cm5.mp4','videos/vague3.mp4','videos/vague3cm0.mp4']; // Ajoutez vos fichiers vidéo ici

function setup() {
    videoPlayer = new VideoPlayer('videos/chute.mp4');
    createCanvas(800, 600).parent('canvas-container');
    visor = new Visor();
    noCursor();

    // Créer un menu déroulant
  dropdown = createSelect();
  dropdown.parent('menu');

  // Ajouter des options au menu déroulant
  dropdown.option('Ouvrir/Enregistrer Vidéo');
  dropdown.option('Calibrer les axes');
  dropdown.option('Pointer les positions');
  dropdown.option('Tracer les Graphiques');
  

  // Définir une fonction de rappel pour le changement d'option
  dropdown.changed(optionChanged);

   // Créer un menu déroulant 2
   dropdown2 = createSelect();
   dropdown2.parent('menu');

   videoFiles.forEach((videoFile, index) => {
    dropdown2.option(videoFile, index); // Utilisez l'index comme valeur
  });
   // Définir une fonction de rappel pour le changement d'option
   dropdown2.changed(() => {
    if (videoPlayer) {
      videoPlayer.removeElements();
  }
    let selectedVideoIndex = dropdown2.value();
    videoPlayer = new VideoPlayer(videoFiles[selectedVideoIndex]);
  });
}

function draw() {
    videoPlayer.draw();
    visor.update(mouseX, mouseY);
    visor.draw();
}

function optionChanged() {
    console.log(dropdown.value());
  }