let videoPlayer;
let visor;
let dropdown;

function setup() {
    videoPlayer = new VideoPlayer('jump_side_view.mp4');
    createCanvas(800, 600).parent('canvas-container');
    visor = new Visor();
    noCursor();

    // Créer un menu déroulant
  dropdown = createSelect();
  dropdown.parent('menu');

  // Ajouter des options au menu déroulant
  dropdown.option('Vidéo');
  dropdown.option('Pointage');
  dropdown.option('Graphiques');

  // Définir une fonction de rappel pour le changement d'option
  dropdown.changed(optionChanged);
}

function draw() {
    videoPlayer.draw();
    visor.update(mouseX, mouseY);
    visor.draw();
}

function optionChanged() {
    console.log(dropdown.value());
  }