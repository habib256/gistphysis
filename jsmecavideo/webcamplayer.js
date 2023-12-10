class WebcamPlayer {
    constructor(framerate) {
        this.cam = createCapture(VIDEO);
        this.cam.hide();

        this.framerate = framerate;
        this.frameIndex = 0;
        this.isRecording = false;
        this.isRecorded = false;
        this.lastUpdateTime = millis();

        this.ElementsOff = true;
        this.addElements();

        this.playMode = false;
        this.lastUpdateTime = 0; // Variable pour stocker la dernière fois que frameIndex a été mis à jour
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
            this.ElementsOff = false;
        }
    }

    draw() {
        if (this.cam) {
            // Dessiner l'image de la webcam sur le canvas
            image(this.cam, 0, 0, width, height);
        } else {
            // Dessiner le message d'erreur sur le canvas
            fill(255, 0, 0); // Couleur du texte en rouge
            textSize(32); // Taille du texte
            textAlign(CENTER, CENTER); // Centrer le texte
            text('WEBCAM ERROR', width / 2, height / 2); // Dessiner le texte au milieu du canvas
        }
        if (this.isRecording) {
            let capture = this.cam.get();
            this.images.push(capture);
            image(capture, 0, 0, width, height);
            fill(255, 0, 0);
            textSize(40);
            text('REC', width - 100, 50); // Écrit "REC" à côté du cercle rouge   
        } else {
            if (millis() - this.lastUpdateTime >= 1000 / this.framerate) {
                if (this.playMode) {
                    if (this.frameIndex < this.images.length - 1) {
                        this.frameIndex++;
                    } else {
                        this.playMode = false;
                    }
                }
                this.lastUpdateTime = millis();
            }
            if (this.images[this.frameIndex]) {
                image(this.images[this.frameIndex], 0, 0, width, height);
            }
        }
        this.sliderUpdate();
    }

    sliderUpdate() {
            this.slider.value(this.frameIndex / (this.images.length - 1));
            this.frameIndex = Math.round(this.slider.value() * (this.images.length - 1));
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
        this.playMode = false;
        if (this.frameIndex < this.images.length - 1) {
            this.frameIndex++;
        }
    }

    previousFrame() {
        this.playMode = false;
        if (this.frameIndex > 0) {
            this.frameIndex--;
        }
    }

    play() {
        this.playMode = true;
    }

    jumpToStart() {
        this.playMode = false;
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
        this.isRecording = true;
       
    }
    stopRecording() {
        this.isRecording = false;
        this.isRecorded = true;
        this.frameNb = 0;
        this.cam.hide();
        this.images = this.images.slice(10); // Supprime les 10 premières images de this.images (Temps de démarrage de la caméra)
    }
}

