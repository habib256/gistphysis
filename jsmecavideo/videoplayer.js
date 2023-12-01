class VideoPlayer {
    constructor(videoFile) {
        this.video = createVideo([videoFile]);
        this.video.hide();

        this.buttonStart = createButton('Début');
        this.buttonStart.mousePressed(() => this.video.time(0));

        this.buttonBack = createButton('Retour');
        this.buttonBack.mousePressed(() => this.video.time(this.video.time() - 0.5));

        this.buttonPlay = createButton('Lire');
        this.buttonPlay.mousePressed(() => {
            this.video.play();
            this.video.frameRate(framerate);
        });

        this.buttonPause = createButton('Pause');
        this.buttonPause.mousePressed(() => this.video.pause());

        this.buttonForward = createButton('Avancer');
        this.buttonForward.mousePressed(() => this.video.time(this.video.time() + 0.5));

        this.buttonEnd = createButton('Fin');
        this.buttonEnd.mousePressed(() => this.video.time(this.video.duration()));

        this.slider = createSlider(0, 1, 0.5, 0.01);
        this.slider.style('width', width/2 + 'px');
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

        image(this.video, x, y, w, h);

        // Update the slider value
        this.slider.value(this.video.time() / this.video.duration());
    }
}