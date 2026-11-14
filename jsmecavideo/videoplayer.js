// videoplayer.js — lecteur d'une vidéo de la liste, image par image
//
// Les images sont atteintes sur une grille fixe : t = début + k / fréquence (pas d'erreur
// qui s'accumule). Un déplacement n'est terminé qu'à l'événement « seeked » : tant que
// l'image demandée n'est pas affichée, on n'accepte pas de nouveau point.

class VideoPlayer {
    constructor(chemin, framerate) {
        this.chemin = chemin;
        this.framerate = framerate;
        this.isLoaded = false;      // première image décodée et position de départ connue
        this.erreur = null;         // message si la vidéo ne peut pas être lue
        this.debut = 0.001;         // instant de la première image + 1 ms (voir _premiereImage)
        this.image = 0;             // numéro de l'image affichée (0 = première)
        this.enDeplacement = false; // vrai entre une demande de position et l'événement seeked
        this.isPlaying = false;

        const elt = document.createElement('video');
        elt.muted = true;
        elt.setAttribute('muted', '');
        elt.setAttribute('playsinline', ''); // iPad : lue dans la page, pas en plein écran
        elt.preload = 'auto';
        elt.style.display = 'none';
        document.body.appendChild(elt);
        this.elt = elt;
        // Compatibilité : videoPlayer.video.time() et videoPlayer.video.elt
        this.video = {
            elt: elt,
            time: (t) => {
                if (t === undefined) return elt.currentTime;
                elt.currentTime = t;
            },
            duration: () => elt.duration || 0
        };

        this._surDonnees = () => this._premiereImage();
        elt.addEventListener('loadeddata', this._surDonnees);
        elt.addEventListener('seeked', () => this._surSeeked());
        elt.addEventListener('ended', () => this._surFin());
        elt.addEventListener('error', () => {
            this.erreur = 'Impossible de lire cette vidéo. Choisis-en une autre ou recharge la page.';
        });
        this.chargerSource(chemin);
        this.addElements();
    }

    // Donne la source à l'élément vidéo
    chargerSource(chemin) {
        this.elt.src = chemin;
    }

    // Dimensions natives de l'image (pixels vidéo), null tant qu'elles ne sont pas connues
    dims() {
        const w = this.elt.videoWidth, h = this.elt.videoHeight;
        return w > 0 && h > 0 ? { w: w, h: h } : null;
    }

    // Prêt à recevoir un point : image décodée et pas de déplacement en cours
    pret() {
        return this.isLoaded && !this.enDeplacement && !this.isPlaying;
    }

    // Numéro de la dernière image de la vidéo
    derniereImage() {
        const d = this.elt.duration;
        if (!(d > 0)) return 0;
        return Math.max(0, Math.ceil((d - this.debut) * this.framerate - 1e-6) - 1);
    }

    // Numéro d'image correspondant à un instant de la vidéo
    indiceImage(t = this.elt.currentTime) {
        return Math.max(0, Math.round((t - this.debut) * this.framerate));
    }

    // Instant affiché à l'élève, compté depuis la première image (0,000 s)
    tempsAffiche() {
        return this.image / this.framerate;
    }

    // Va à l'image k. Renvoie faux si elle n'existe pas (la position ne change pas).
    allerImage(k) {
        if (!this.isLoaded) return false;
        if (k < 0 || k > this.derniereImage()) return false;
        if (this.isPlaying) this.pause(false);
        this.image = k;
        this._cible = this.debut + k / this.framerate;
        this.enDeplacement = true;
        clearTimeout(this._secours);
        // Secours : certains navigateurs n'envoient pas seeked si la position ne change pas
        this._secours = setTimeout(() => { this.enDeplacement = false; }, 1500);
        this.elt.currentTime = this._cible;
        return true;
    }

    _surSeeked() {
        if (this._cible === undefined || Math.abs(this.elt.currentTime - this._cible) < 0.0005) {
            this.enDeplacement = false;
            clearTimeout(this._secours);
        }
    }

    nextFrame() { return this.allerImage(this.image + 1); }
    previousFrame() { return this.allerImage(this.image - 1); }
    jumpToStart() { return this.allerImage(0); }

    // Lecture / pause ; à la pause, la vidéo est calée sur une image entière
    play() {
        if (!this.isLoaded) return;
        if (this.isPlaying) {
            this.pause(true);
        } else {
            if (this.image >= this.derniereImage()) this.allerImage(0);
            this.isPlaying = true;
            const lecture = this.elt.play();
            if (lecture && lecture.catch) lecture.catch(() => { this.isPlaying = false; });
        }
        this.majBoutonLecture();
    }

    pause(caler = true) {
        this.elt.pause();
        this.isPlaying = false;
        this.majBoutonLecture();
        if (caler) this.allerImage(Math.min(this.indiceImage(), this.derniereImage()));
    }

    _surFin() {
        this.isPlaying = false;
        this.majBoutonLecture();
        this.allerImage(this.derniereImage());
    }

    // Force le décodage de la première image et repère son instant
    _premiereImage() {
        if (this.isLoaded || this._attentePremiere) return;
        this._attentePremiere = true;
        const elt = this.elt;
        const fin = () => {
            elt.removeEventListener('seeked', fin);
            // Certaines vidéos commencent après 0 s (première image à 0,12 s pour
            // TableHorizRectiligneUniforme) : le navigateur ramène alors la position au début réel.
            if (elt.currentTime > 0.0015) {
                this.debut = elt.currentTime + 0.001;
                elt.currentTime = this.debut;
            }
            this.image = 0;
            this.isLoaded = true;
            if (typeof surSourcePrete === 'function') surSourcePrete();
        };
        elt.addEventListener('seeked', fin);
        elt.currentTime = 0.001;
    }

    // Dessine l'image courante sur tout le canevas (le canevas a les proportions de la vidéo)
    draw() {
        background(0);
        if (this.erreur) {
            messageSurImage(this.erreur);
        } else if (this.isLoaded && this.dims()) {
            drawingContext.drawImage(this.elt, 0, 0, width, height);
            if (this.isPlaying) {
                const k = Math.min(this.indiceImage(), this.derniereImage());
                this.image = k;
            }
        } else {
            messageSurImage('Chargement de la vidéo…');
        }
        this.sliderUpdate();
    }

    addElements() {
        if (this.boutons) return;
        this.boutons = creerControlesLecture(this, false);
        this.slider = this.boutons.curseur;
        this.buttonPlay = this.boutons.lecture;
    }

    majBoutonLecture() {
        if (!this.buttonPlay) return;
        const icone = this.isPlaying ? 'media-playback-pause.png' : 'media-playback-start.png';
        if (this._icone !== icone) {
            this._icone = icone;
            this.buttonPlay.style.backgroundImage = 'url("img/tango/' + icone + '")';
            this.buttonPlay.setAttribute('aria-label', this.isPlaying ? 'Pause (Espace)' : 'Lire la vidéo (Espace)');
            this.buttonPlay.title = this.buttonPlay.getAttribute('aria-label');
        }
    }

    // Curseur de temps : une position par image
    sliderUpdate() {
        if (!this.slider) return;
        const max = String(this.derniereImage());
        if (this.slider.max !== max) this.slider.max = max;
        if (this.slider.actif) return; // ne pas le déplacer sous le doigt
        const v = String(this.image);
        if (this.slider.value !== v) this.slider.value = v;
        const texte = 'Image ' + this.image + ' sur ' + this.derniereImage();
        if (this.slider.getAttribute('aria-valuetext') !== texte) this.slider.setAttribute('aria-valuetext', texte);
    }

    removeElements() {
        clearTimeout(this._secours);
        this.elt.removeEventListener('loadeddata', this._surDonnees);
        this.elt.pause();
        this.elt.removeAttribute('src');
        this.elt.load();
        this.elt.remove();
        if (this.boutons) this.boutons.retirer();
        this.boutons = null;
        this.slider = null;
    }
}
