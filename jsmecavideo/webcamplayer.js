class WebcamPlayer {
    constructor(framerate) {
        this.cam = createCapture(VIDEO);
        this.cam.hide();

        this.isLoaded = false;
        this.cam.elt.onloadedmetadata = () => {
            this.isLoaded = true;
        };
        // Vérification de secours
        if (this.cam.elt.readyState >= 1) {
            this.isLoaded = true;
        }

        frameRate(framerate);
        this.framerate = framerate;
        this.frameIndex = 0;

        this.isPlaying = false;
        this.isRecording = false;
        this.isRecorded = false;

        this.ElementsOff = true;
        this.addElements();

        this.images = [];
    }

    addElements() {
        if (this.ElementsOff) {
            this.buttonRecord = createButton('Enregistrer');
            this.buttonRecord.parent('controls');
            this.buttonRecord.style('width', '48px'); // Définir la largeur
            this.buttonRecord.style('height', '32px'); // Définir la hauteur
            this.buttonRecord.html('');
            this.buttonRecord.style('background-image', 'url("img/tango/media-record.png")');
            this.buttonRecord.style('background-size', 'cover'); // Pour s'assurer que l'image couvre tout le bouton
            this.buttonRecord.style('background-repeat', 'no-repeat'); // Pour éviter que l'image ne se répète
            this.buttonRecord.style('background-position', 'center'); // Pour centrer l'image
            this.buttonRecord.mousePressed(() => this.toggleRecording()); // Ajoutez une fonction de rappel pour le clic sur le bouton

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
            this.buttonBack.mousePressed(() => {
                this.previousFrame();
            });

            this.buttonPlay = createButton('Lire');
            this.buttonPlay.parent('controls');
            this.buttonPlay.style('width', '48px'); // Définir la largeur
            this.buttonPlay.style('height', '32px'); // Définir la hauteur
            this.buttonPlay.html('');
            this.buttonPlay.style('background-image', 'url("img/tango/media-playback-start.png")');
            this.buttonPlay.style('background-size', 'cover'); // Pour s'assurer que l'image couvre tout le bouton
            this.buttonPlay.style('background-repeat', 'no-repeat'); // Pour éviter que l'image ne se répète
            this.buttonPlay.style('background-position', 'center'); // Pour centrer l'image
            this.buttonPlay.mousePressed(() => {
                this.play();
            });

            this.buttonForward = createButton('Avancer');
            this.buttonForward.parent('controls');
            this.buttonForward.style('width', '48px'); // Définir la largeur
            this.buttonForward.style('height', '32px'); // Définir la hauteur
            this.buttonForward.html('');
            this.buttonForward.style('background-image', 'url("img/tango/media-step-forward.png")');
            this.buttonForward.style('background-size', 'cover'); // Pour s'assurer que l'image couvre tout le bouton
            this.buttonForward.style('background-repeat', 'no-repeat'); // Pour éviter que l'image ne se répète
            this.buttonForward.style('background-position', 'center'); // Pour centrer l'image
            this.buttonForward.mousePressed(() => {
                this.nextFrame();
            });

            this.slider = createSlider(0, 1, 0.5, 0.01);
            this.slider.parent('controls'); // Place le slider dans le conteneur 'controls'
            this.slider.style('width', '800px');
            this.slider.style('float', 'right'); // Align the slider to the right
            this.slider.input(() => this.sliderUpdate());
            this.slider.mousePressed(() => this.sliderActive = true);
            this.slider.mouseReleased(() => this.sliderActive = false);
            this.sliderActive = false;

            this.ElementsOff = false;
        }
    }

    draw() {
        background(0); // Toujours nettoyer le fond (écran noir par défaut)
        if (this.isLoaded && this.cam.width > 0 && this.cam.height > 0) {
            if (this.isRecording) {   
                    let pic = this.cam.get();
                    this.images.push(pic);
                    image(pic, 0, 0, width, height);
                    color(255, 0, 0);
                    fill(255, 0, 0);
                    textSize(40);
                    text('REC', width - 100, 50); // Écrit "REC" à côté du cercle rouge   
            }
            if (this.isRecorded) {
                    if (this.isPlaying) {
                        if (this.frameIndex < this.images.length - 1) {
                            this.frameIndex++;
                        } else {
                            this.isPlaying = false;
                        }
                    }
                if (this.images[this.frameIndex]) {
                    image(this.images[this.frameIndex], 0, 0, width, height);
                }
            }
            if (!(this.isRecording || this.isRecorded)) {
                image(this.cam, 0, 0, width, height);
            }
        
        } else {
            // background(0) est déjà fait au début
            textAlign(CENTER, CENTER);
            textSize(40);
            color(255, 255, 255);
            stroke(255, 255, 255);
            fill(255, 255, 255);
            text('NO WEBCAM', width / 2, height / 2);
        }
        this.sliderUpdate();
        this.buttonPlayUpdate();
    }

    sliderUpdate() {
        if (this.isRecorded && this.sliderActive) {
            this.frameIndex = Math.round(this.slider.value() * (this.images.length - 1));
        } else {
            this.slider.value(this.frameIndex / (this.images.length - 1));
        }
    }
    buttonPlayUpdate() {
        if (this.isPlaying) {
            this.buttonPlay.style('background-image', 'url("img/tango/media-playback-pause.png")');        
        } else {
            this.buttonPlay.style('background-image', 'url("img/tango/media-playback-start.png")');        
        }   
    }

    removeElements() {
        this.buttonRecord.remove();
        this.buttonStart.remove();
        this.buttonBack.remove();
        this.buttonPlay.remove();
        this.buttonForward.remove();
        this.slider.remove();
        this.ElementsOff = true;
    }

    nextFrame() {
        this.isPlaying = false;
        if (this.frameIndex < this.images.length - 1) {
            this.frameIndex++;
        } else {
            this.isPlaying = false;
        }
    }

    previousFrame() {
        this.isPlaying = false;
        if (this.frameIndex > 0) {
            this.frameIndex--;
        }
    }

    play() {
        this.isPlaying = !this.isPlaying;   
    }

    jumpToStart() {
        this.isPlaying = false;
        if (this.isRecording) {
            this.isRecording = !this.isRecording;
        }
        this.frameIndex = 0;
    }

    toggleRecording() {
        this.isRecording = !this.isRecording;
        if (this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    startRecording() {
        this.images = [];
        this.isRecorded = false;
        this.isRecording = true;
        // Lancer le clignotement du bouton d'enregistrement
        this.recordBlinkState = false;
        this.recordBlinkInterval = setInterval(() => {
            this.recordBlinkState = !this.recordBlinkState;
            if (this.recordBlinkState) {
                // Réduire l'opacité pour un effet clignotant
                this.buttonRecord.style('opacity', '0.3');
            } else {
                this.buttonRecord.style('opacity', '1');
            }
        }, 500);
        console.log('Start Recording');
    }
    stopRecording() {
        this.isRecording = false;
        this.isRecorded = true;
        this.frameIndex = 0;
        // Arrêter le clignotement et réinitialiser l'opacité
        clearInterval(this.recordBlinkInterval);
        this.buttonRecord.style('opacity', '1');
        console.log('Stop Recording');
    }
}
