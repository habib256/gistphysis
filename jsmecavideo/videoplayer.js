class VideoPlayer {
    constructor(videoFile, framerate) {
        this.video = createVideo([videoFile]);
        this.video.hide();

        // Initialiser le flag de chargement
        this.isLoaded = false;

        // Écouter l'événement loadedmetadata sur l'élément DOM natif
        this.video.elt.onloadedmetadata = () => {
            this.isLoaded = true;
        };

        // Vérification de secours si l'événement a déjà été déclenché
        if (this.video.elt.readyState >= 1) {
            this.isLoaded = true;
        }

        this.framerate = framerate;

        this.isPlaying = false;

        this.ElementsOff = true;
        this.addElements();

        this.video.onended(() => {
            this.buttonPlay.style('background-image', 'url("img/tango/media-playback-start.png")');
            this.isPlaying = false;
            this.video.time(this.video.time() - (1 / this.framerate)); // Recule de 1/framerate de seconde
        });

        this.images = []; // Initialisez `images` comme tableau ou avec vos données images
    }

    addElements() {
        if (this.ElementsOff) {

            this.buttonStart = createButton('Début');
            this.buttonStart.parent('controls');
            this.buttonStart.style('width', '48px'); // Définir la largeur
            this.buttonStart.style('height', '32px'); // Définir la hauteur
            this.buttonStart.html('');
            this.buttonStart.style('background-image', 'url("img/tango/media-skip-backward.png")');
            this.buttonStart.style('background-size', 'cover'); // Pour s'assurer que l'image couvre tout le bouton
            this.buttonStart.style('background-repeat', 'no-repeat'); // Pour éviter que l'image ne se répète
            this.buttonStart.style('background-position', 'center'); // Pour centrer l'image
            this.buttonStart.mousePressed(() => this.jumpToStart());

            this.buttonBack = createButton('Retour');
            this.buttonBack.parent('controls');
            this.buttonBack.style('width', '48px'); // Définir la largeur
            this.buttonBack.style('height', '32px'); // Définir la hauteur
            this.buttonBack.html('');
            this.buttonBack.style('background-image', 'url("img/tango/media-step-backward.png")');
            this.buttonBack.style('background-size', 'cover'); // Pour s'assurer que l'image couvre tout le bouton
            this.buttonBack.style('background-repeat', 'no-repeat'); // Pour éviter que l'image ne se répète
            this.buttonBack.style('background-position', 'center'); // Pour centrer l'image
            this.buttonBack.mousePressed(() => this.previousFrame());

            this.buttonPlay = createButton('Lire');
            this.buttonPlay.parent('controls');
            this.buttonPlay.style('width', '48px'); // Définir la largeur
            this.buttonPlay.style('height', '32px'); // Définir la hauteur
            this.buttonPlay.html('');
            this.buttonPlay.style('background-image', 'url("img/tango/media-playback-start.png")');
            this.buttonPlay.style('background-size', 'cover'); // Pour s'assurer que l'image couvre tout le bouton
            this.buttonPlay.style('background-repeat', 'no-repeat'); // Pour éviter que l'image ne se répète
            this.buttonPlay.style('background-position', 'center'); // Pour centrer l'image
            this.buttonPlay.mousePressed(() => this.play());

            this.buttonForward = createButton('Avancer');
            this.buttonForward.parent('controls');
            this.buttonForward.style('width', '48px'); // Définir la largeur
            this.buttonForward.style('height', '32px'); // Définir la hauteur
            this.buttonForward.html('');
            this.buttonForward.style('background-image', 'url("img/tango/media-step-forward.png")');
            this.buttonForward.style('background-size', 'cover'); // Pour s'assurer que l'image couvre tout le bouton
            this.buttonForward.style('background-repeat', 'no-repeat'); // Pour éviter que l'image ne se répète
            this.buttonForward.style('background-position', 'center'); // Pour centrer l'image
            this.buttonForward.mousePressed(() => this.nextFrame());

            this.slider = createSlider(0, 1, 0, 0.01);
            this.slider.parent('controls'); // Place le slider dans le conteneur 'controls'
            this.slider.style('width', '800px');
            this.slider.style('float', 'right'); // Align the slider to the right
            this.slider.input(() => this.video.time(this.slider.value() * this.video.duration()));
            this.ElementsOff = false;
        }
    }

    draw() {
                if (this.isLoaded) {
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
                    rect(0, y + h + 1, width, height); // Bande horizontale inférieure
                    rect(0, 0, x, height); // Bande verticale gauche
                    rect(x + w + 1, 0, width, height); // Bande verticale droite
                    image(this.video, x, y, w, h);

                } else {
                    background(0);
                    stroke(255);
                    fill(255);
                    textSize(48);
                    textAlign(CENTER, CENTER);
                    text('Charge la vidéo', width / 2, height / 2);
                }   
                this.sliderUpdate();
    }

    sliderUpdate() {
        if (this.isLoaded && this.video.duration() > 0) {
            // Si temps actuel + incrément de 1 frame est supérieur ou égal à la durée,
            // on considère que c'est la dernière frame et on positionne le slider à 100%
            if (this.video.time() + (1 / this.framerate) >= this.video.duration()) {
                this.slider.value(1);
            } else {
                const progress = this.video.time() / this.video.duration();
                this.slider.value(progress);
            }
        }
    }

    removeElements() {
        this.video.remove();
        this.buttonStart.remove();
        this.buttonBack.remove();
        this.buttonPlay.remove();
        this.buttonForward.remove();
        this.slider.remove();
        this.ElementsOff = true;
    }

    nextFrame() {
        if (this.video.duration() > this.video.time() + (1 / (this.framerate))) {
            this.video.time(this.video.time() + (1 / this.framerate)); // Avance de 1/framerate de seconde
        }
    }

    previousFrame() {
        let newTime = this.video.time() - (1 / this.framerate);  // Recule de 1/framerate de seconde
        this.video.time(newTime < 0 ? 0 : newTime);
    }

    play() {
        if (this.isPlaying) {
            this.video.pause();
            this.video.time(this.video.time() + (1 / this.framerate)); // Avance de 1/framerate de seconde
            this.buttonPlay.style('background-image', 'url("img/tango/media-playback-start.png")');
        } else {
            this.video.play();
            this.buttonPlay.style('background-image', 'url("img/tango/media-playback-pause.png")');
        }
        this.isPlaying = !this.isPlaying;   
    }

    jumpToStart() {
        this.video.time(0);
    }
}

