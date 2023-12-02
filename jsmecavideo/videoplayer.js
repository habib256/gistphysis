class VideoPlayer {
    constructor(videoFile) {
        this.video = createVideo([videoFile]);
        this.video.hide();

        this.buttonStart = createButton('Début');
        this.buttonStart.parent('controls');
        this.buttonStart.mousePressed(() => this.video.time(0));

        this.buttonBack = createButton('Retour');
        this.buttonBack.parent('controls');
        this.buttonBack.mousePressed(() => {
            this.video.pause();
            this.video.time(this.video.time() - 0.1);
        });

        this.buttonPlay = createButton('Lire');
        this.buttonPlay.parent('controls');
        this.buttonPlay.mousePressed(() => {
            this.video.play();
            this.video.frameRate(framerate);
        });

        this.buttonPause = createButton('Pause');
        this.buttonPause.parent('controls');
        this.buttonPause.mousePressed(() => this.video.pause());

        this.buttonForward = createButton('Avancer');
        this.buttonForward.parent('controls');
        this.buttonForward.mousePressed(() => {
            this.video.pause();
            this.video.time(this.video.time() + 0.1);
        });

        this.buttonEnd = createButton('Fin');
        this.buttonEnd.parent('controls');
        this.buttonEnd.mousePressed(() => this.video.time(this.video.duration()));

        this.slider = createSlider(0, 1, 0.5, 0.01);
        this.slider.parent('controls'); // Place le slider dans le conteneur 'controls'
        this.slider.style('width', this.video.width + 'px'); 
        this.slider.style('float', 'right'); // Align the slider to the right
        this.slider.input(() => this.video.time(this.video.duration() * this.slider.value()));
    }

    draw() {
        let ratio = this.video.width / this.video.height;
        let w = height * ratio;
        let h = height;

        if (w > width) {
            w = width;
            h = width / ratio;
        }

        let x = (width - w) / 2;
        let y = (height - h) / 2;

        stroke(0); // Couleur du viseur en rouge
        fill(0);
        rect(0, 0, width, y);
        rect(0, y+h+1, width, height );
        image(this.video, x, y, w, h);

        // Update the slider value
        this.slider.value(this.video.time() / this.video.duration());
    }
}