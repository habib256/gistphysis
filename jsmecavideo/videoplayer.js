class VideoPlayer {
    constructor(videoFile, framerate) {
        this.isLoaded = false;
        this.video = createVideo([videoFile], () => {
            // Le callback p5.js se déclenche sur canplaythrough
            this.video.volume(0);
            this._forceFirstFrame();
        });
        this.video.hide();
        this.video.elt.preload = 'auto'; // Demander le préchargement complet

        // Écouter loadeddata (readyState >= 2 = données de la première image disponibles)
        this.video.elt.addEventListener('loadeddata', () => {
            this._forceFirstFrame();
        });

        // Vérification de secours si l'événement a déjà été déclenché
        if (this.video.elt.readyState >= 2) {
            this._forceFirstFrame();
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
        background(0); // Toujours nettoyer le fond (éviter les artefacts visuels)

        // Utiliser videoWidth/videoHeight natifs qui fonctionnent même si l'élément est masqué
        let vw = this.video.elt.videoWidth;
        let vh = this.video.elt.videoHeight;

        if (this.isLoaded && vw > 0 && vh > 0) {
            let ratio = vw / vh;
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
        if (this.isLoaded) {
            this.video.time(0);
        }
        // Si pas encore chargé, la première image sera affichée automatiquement
        // par _forceFirstFrame() une fois le chargement terminé
    }

    // Force le décodage de la première image via un micro-seek
    _forceFirstFrame() {
        if (this.isLoaded) return; // Déjà chargé, ne rien faire
        const vid = this.video.elt;
        vid.currentTime = 0.001; // Force le décodage de la première image
        vid.onseeked = () => {
            vid.onseeked = null; // Nettoyer le gestionnaire
            this.isLoaded = true;
        };
    }
}

