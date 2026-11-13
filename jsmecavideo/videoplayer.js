class VideoPlayer {
    constructor(videoFile, framerate) {
        this.isLoaded = false;
        this.video = createVideo([videoFile], () => {
            // Le callback p5.js se déclenche sur canplaythrough
            this.video.volume(0);
            this._forceFirstFrame();
        });
        this.video.hide();
        // Tablettes (iPad, Android) : vidéo muette et lue dans la page, pas en plein écran
        this.video.elt.muted = true;
        this.video.elt.setAttribute('muted', '');
        this.video.elt.setAttribute('playsinline', '');
        this.video.elt.preload = 'auto'; // Demander le préchargement complet

        // Écouter loadeddata (readyState >= 2 = données de la première image disponibles)
        this._onLoadedData = () => {
            this._forceFirstFrame();
        };
        this.video.elt.addEventListener('loadeddata', this._onLoadedData);

        // Vérification de secours si l'événement a déjà été déclenché
        if (this.video.elt.readyState >= 2) {
            this._forceFirstFrame();
        }

        this.framerate = framerate;
        // Instant de la première image + 1 ms (voir _forceFirstFrame). Toutes les images sont
        // ensuite atteintes sur la grille debut + k / framerate : pas d'erreur qui s'accumule.
        this.debut = 0.001;

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

            // Boutons de 52×48 px et curseur de temps, utilisables au doigt (voir interface.js)
            this.buttonStart = creerBoutonIcone('Revenir au début', 'media-skip-backward.png', () => this.jumpToStart());
            this.buttonBack = creerBoutonIcone('Image précédente', 'media-step-backward.png', () => this.previousFrame());
            this.buttonPlay = creerBoutonIcone('Lire / pause', 'media-playback-start.png', () => this.play());
            this.buttonForward = creerBoutonIcone('Image suivante', 'media-step-forward.png', () => this.nextFrame());

            this.slider = creerCurseurTemps();
            this.slider.input(() => {
                if (this.video.duration() > 0) {
                    this.video.time(this.slider.value() * this.video.duration());
                }
            });
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
        // Pendant qu'on le manipule, on ne repositionne pas le curseur (il sauterait sous le doigt)
        if (this.slider.actif) return;
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
        this.video.elt.removeEventListener('loadeddata', this._onLoadedData);
        this.video.remove();
        this.buttonStart.remove();
        this.buttonBack.remove();
        this.buttonPlay.remove();
        this.buttonForward.remove();
        this.slider.remove();
        this.ElementsOff = true;
    }

    // Numéro de l'image affichée (0 = première image de la vidéo)
    indiceImage(t = this.video.time()) {
        return Math.max(0, Math.round((t - this.debut) * this.framerate));
    }

    // Va à l'image k (1 ms après son début, pour que le navigateur affiche bien cette image
    // et pas la précédente). Renvoie faux si l'image k n'existe pas.
    allerImage(k) {
        let t = this.debut + Math.max(0, k) / this.framerate;
        if (k > 0 && t >= this.video.duration()) return false;
        this.video.time(t);
        return true;
    }

    nextFrame() {
        return this.allerImage(this.indiceImage() + 1); // Avance d'une image
    }

    previousFrame() {
        this.allerImage(this.indiceImage() - 1); // Recule d'une image (pas avant la première)
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
            this.video.time(this.debut);
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
            // Certaines vidéos commencent après 0 s (première image à 0,12 s pour
            // TableHorizRectiligneUniforme) : le navigateur ramène alors la position au début réel.
            if (vid.currentTime > 0.0015) {
                this.debut = vid.currentTime + 0.001;
                vid.currentTime = this.debut;
            }
            this.isLoaded = true;
        };
    }
}

