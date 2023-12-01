
let videoPlayer;

function setup() {
    createCanvas(640, 480);
    videoPlayer = new VideoPlayer('jump_side_view.mp4');
}

function draw() {
    videoPlayer.draw();
}