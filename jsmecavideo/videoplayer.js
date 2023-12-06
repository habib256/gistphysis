class VideoPlayer {
    constructor(videoFile, framerate) {
        this.video = createVideo([videoFile]);
        this.video.hide();
        this.framerate = framerate;

        this.buttonStart = createButton('Début');
        this.buttonStart.parent('controls');
        this.buttonStart.mousePressed(() => this.jumpToStart() );

        this.buttonBack = createButton('Retour');
        this.buttonBack.parent('controls');
        this.buttonBack.mousePressed(() => {
            this.video.pause();
            this.previousFrame();
        });

        this.buttonPlay = createButton('Lire');
        this.buttonPlay.parent('controls');
        this.buttonPlay.mousePressed(() => {
            this.video.play();
            this.video.speed(1); // Contrôle la vitesse de lecture de la vidéo
        });

        this.buttonPause = createButton('Pause');
        this.buttonPause.parent('controls');
        this.buttonPause.mousePressed(() => this.video.pause());

        this.buttonForward = createButton('Avancer');
        this.buttonForward.parent('controls');
        this.buttonForward.mousePressed(() => {
            this.video.pause();
            this.nextFrame();
        });

        this.slider = createSlider(0, 1, 0.5, 0.01);
        this.slider.parent('controls'); // Place le slider dans le conteneur 'controls'
        this.slider.style('width', this.video.width + 'px'); 
        this.slider.style('float', 'right'); // Align the slider to the right
        this.slider.input(() => this.video.time((this.video.duration() - 1/this.framerate) * this.slider.value()));
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

        stroke(0); // Couleur des bandes en noir
        fill(0);
        rect(0, 0, width, y); // Bande horizontale supérieure
        rect(0, y+h+1, width, height ); // Bande horizontale inférieure
        rect(0, 0, x, height); // Bande verticale gauche
        rect(x+w+1, 0, width, height); // Bande verticale droite
        image(this.video, x, y, w, h);

        // Update the slider value
        this.slider.value(this.video.time() / (this.video.duration() - 1/this.framerate));
    }
    removeElements() {
        this.video.remove();
        this.buttonStart.remove();
        this.buttonBack.remove();
        this.buttonPlay.remove();
        this.buttonPause.remove();
        this.buttonForward.remove();
        this.slider.remove();
    }
    nextFrame() {
       if (this.video.duration() > this.video.time()+ 1/(this.framerate)) {
        this.video.time(this.video.time() + 1/this.framerate); // Avance de 1/framerate de seconde
       }
    }

    previousFrame() {
        this.video.time( this.video.time() - 1/this.framerate); // Recule de 1/framerate de seconde
    }

    jumpToStart() {
        this.video.time(0);
    }
}