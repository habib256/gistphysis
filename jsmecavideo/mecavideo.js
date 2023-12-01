let videoPlayer;
let visor;

function setup() {
    videoPlayer = new VideoPlayer('jump_side_view.mp4');
    createCanvas(640, 480).parent('canvas-container');
    visor = new Visor();
    noCursor();
}

function draw() {
    videoPlayer.draw();
    visor.update(mouseX, mouseY);
    visor.draw();
}