// webcamplayer.js — filmer avec la caméra de l'appareil, puis pointer image par image
//
// Les images enregistrées restent dans la mémoire du navigateur : rien n'est envoyé.
// Nombre maximal d'images enregistrées (20 s à 15 images/s) : au-delà, la mémoire
// d'une tablette peut saturer. L'enregistrement s'arrête alors tout seul.
const WEBCAM_MAX_IMAGES = 300;

// Vrai si le navigateur peut donner accès à une caméra (https ou localhost)
function webcamDisponible() {
    return !!(window.isSecureContext && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

// Message clair (en français) expliquant pourquoi la caméra est indisponible
function messageErreurCamera(err) {
    let nom = err && err.name ? err.name : '';
    if (nom === 'NotAllowedError' || nom === 'SecurityError' || nom === 'PermissionDeniedError') {
        return 'Caméra refusée. Autorise la caméra dans le navigateur. Si l’app est intégrée dans une page, ouvre-la plutôt dans un onglet.';
    }
    if (nom === 'NotFoundError' || nom === 'DevicesNotFoundError' || nom === 'OverconstrainedError') {
        return 'Aucune caméra n’a été trouvée sur cet appareil.';
    }
    if (nom === 'NotReadableError' || nom === 'TrackStartError' || nom === 'AbortError') {
        return 'La caméra est déjà utilisée par une autre application. Ferme-la puis réessaie.';
    }
    return 'Caméra indisponible (' + (nom || 'erreur inconnue') + ').';
}

class WebcamPlayer {
    constructor(framerate) {
        this.framerate = framerate;
        this.cam = null;          // élément <video> du flux de la caméra
        this.erreur = null;
        this.retire = false;
        this.isLoaded = false;    // flux de la caméra disponible
        this.images = [];         // images enregistrées (canevas)
        this.instants = [];       // instant réel de chaque image (s)
        this.image = 0;           // numéro de l'image affichée
        this.frameIndex = 0;      // (ancien nom, gardé synchronisé)
        this.isPlaying = false;
        this.isRecording = false;
        this.isRecorded = false;
        this.enDeplacement = false;

        if (!window.isSecureContext) {
            this.erreur = 'Caméra indisponible : le navigateur ne l’autorise que sur une adresse sécurisée (https://…). Ouvre le site en https, ou utilise une vidéo de la liste.';
        } else if (!webcamDisponible()) {
            this.erreur = 'Ce navigateur ne donne pas accès à la caméra.';
        } else {
            this.ouvrirCamera();
        }
        this.addElements();
    }

    // Caméra arrière de préférence sur tablette, 640×480 pour limiter la mémoire
    ouvrirCamera() {
        const elt = document.createElement('video');
        elt.setAttribute('playsinline', '');
        elt.muted = true;
        elt.style.display = 'none';
        document.body.appendChild(elt);
        this.cam = elt;
        elt.addEventListener('loadedmetadata', () => {
            const lecture = elt.play();
            if (lecture && lecture.catch) lecture.catch(() => {});
            this.isLoaded = true;
            if (typeof surSourcePrete === 'function') surSourcePrete();
        });
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
        }).then(stream => {
            if (this.retire) { stream.getTracks().forEach(t => t.stop()); return; }
            elt.srcObject = stream;
        }).catch(err => {
            console.warn('Webcam indisponible :', err && err.name);
            this.erreur = messageErreurCamera(err);
        });
    }

    dims() {
        if (this.images.length > 0) return { w: this.images[0].width, h: this.images[0].height };
        if (this.cam && this.cam.videoWidth > 0) return { w: this.cam.videoWidth, h: this.cam.videoHeight };
        return null;
    }

    // On ne pointe que sur une séquence enregistrée
    pret() { return this.isRecorded && this.images.length > 0 && !this.isPlaying; }

    derniereImage() { return Math.max(0, this.images.length - 1); }


    allerImage(k) {
        if (!this.isRecorded || k < 0 || k > this.derniereImage()) return false;
        this.isPlaying = false;
        this.image = k;
        this.frameIndex = k;
        this.majBoutonLecture();
        return true;
    }

    nextFrame() {
        if (typeof avantImageSuivante === 'function') avantImageSuivante(this.image);
        return this.allerImage(this.image + 1);
    }
    previousFrame() { return this.allerImage(this.image - 1); }
    allerImageChoisie(k) {
        const ok = this.allerImage(k);
        this.aLu = false;
        return ok;
    }

    jumpToStart() {
        if (this.isRecording) this.stopRecording();
        return this.allerImage(0);
    }

    play() {
        if (!this.isRecorded) return;
        if (this.isPlaying) {
            this.pause();
            return;
        }
        if (this.image >= this.derniereImage()) this.image = 0;
        this.isPlaying = true;
        this._dernierPas = performance.now();
        this.majBoutonLecture();
    }

    // Même interface que le lecteur vidéo : ici l'image affichée est toujours this.image
    // (des images enregistrées, pas de décodage) ; pas de recherche à attendre.
    pause() {
        if (this.isPlaying) this.aLu = true;
        this.isPlaying = false;
        this.majBoutonLecture();
    }

    indiceImage() { return Math.max(0, this.image); }

    draw() {
        background(0);
        if (this.erreur) {
            messageSurImage(this.erreur);
        } else if (this.isRecorded && this.images[this.image]) {
            if (this.isPlaying && performance.now() - this._dernierPas >= 1000 / this.framerate) {
                this._dernierPas = performance.now();
                if (this.image < this.images.length - 1) this.image++;
                else this.pause();
                this.frameIndex = this.image;
            }
            drawingContext.drawImage(this.images[this.image], 0, 0, width, height);
        } else if (this.isLoaded && this.cam && this.cam.videoWidth > 0) {
            drawingContext.drawImage(this.cam, 0, 0, width, height);
            if (this.isRecording) {
                push();
                noStroke();
                fill(220, 0, 0);
                ellipse(28, 28, 22, 22);
                fill(255);
                stroke(0);
                strokeWeight(3);
                textSize(20);
                textAlign(LEFT, CENTER);
                text('REC ' + this.images.length + ' / ' + WEBCAM_MAX_IMAGES, 46, 28);
                pop();
            }
        } else {
            messageSurImage('Ouverture de la caméra…\nAutorise l’accès à la caméra si le navigateur le demande.');
        }
        this.sliderUpdate();
    }

    addElements() {
        if (this.boutons) return;
        this.boutons = creerControlesLecture(this, true);
        this.slider = this.boutons.curseur;
        this.buttonPlay = this.boutons.lecture;
        this.buttonRecord = this.boutons.enregistrer;
    }

    majBoutonLecture() {
        if (!this.buttonPlay) return;
        const icone = this.isPlaying ? 'media-playback-pause.png' : 'media-playback-start.png';
        if (this._icone !== icone) {
            this._icone = icone;
            this.buttonPlay.style.backgroundImage = 'url("img/tango/' + icone + '")';
        }
    }

    sliderUpdate() {
        if (!this.slider) return;
        const max = String(this.derniereImage());
        if (this.slider.max !== max) this.slider.max = max;
        if (this.slider.actif) return;
        const v = String(this.image);
        if (this.slider.value !== v) this.slider.value = v;
    }

    toggleRecording() {
        if (!this.isLoaded || this.erreur) return;
        if (this.isRecording) {
            this.stopRecording();
            return;
        }
        // Un nouvel enregistrement remplace la séquence : les points pointés dessus seraient faux
        if (typeof avantNouvelEnregistrement === 'function') avantNouvelEnregistrement(() => this.startRecording());
        else this.startRecording();
    }

    // Enregistre environ `framerate` images par seconde, chacune avec son instant réel :
    // la cadence d'une caméra (et d'une tablette chargée) n'est pas régulière.
    startRecording() {
        this.images = [];
        this.instants = [];
        this.isRecorded = false;
        this.isRecording = true;
        this.image = 0;
        const capturer = (instant) => {
            const w = this.cam.videoWidth, h = this.cam.videoHeight;
            if (!w || !h || !this.isRecording) return;
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            c.getContext('2d').drawImage(this.cam, 0, 0, w, h);
            this.images.push(c);
            this.instants.push(instant);
            if (this.images.length >= WEBCAM_MAX_IMAGES) this.stopRecording();
        };
        const periode = 1 / this.framerate;
        if (typeof this.cam.requestVideoFrameCallback === 'function') {
            // Une image de la caméra = un appel, avec l'instant de sa prise (mediaTime)
            let dernier = -Infinity;
            const suivante = (maintenant, meta) => {
                if (!this.isRecording) return;
                const t = meta && isFinite(meta.mediaTime) ? meta.mediaTime : maintenant / 1000;
                if (t - dernier >= periode * 0.9) {
                    dernier = t;
                    capturer(t);
                }
                this._rvfc = this.cam.requestVideoFrameCallback(suivante);
            };
            this._rvfc = this.cam.requestVideoFrameCallback(suivante);
        } else {
            this._minuterie = setInterval(() => capturer(performance.now() / 1000), 1000 / this.framerate);
        }
        this._clignote = setInterval(() => {
            if (this.buttonRecord) this.buttonRecord.style.opacity = this.buttonRecord.style.opacity === '0.3' ? '1' : '0.3';
        }, 500);
    }

    stopRecording() {
        clearInterval(this._minuterie);
        if (this._rvfc !== undefined && this.cam && this.cam.cancelVideoFrameCallback) this.cam.cancelVideoFrameCallback(this._rvfc);
        clearInterval(this._clignote);
        if (this.buttonRecord) this.buttonRecord.style.opacity = '1';
        this.isRecording = false;
        this.isRecorded = this.images.length > 0;
        this.image = 0;
        this.frameIndex = 0;
        if (typeof surSourcePrete === 'function') surSourcePrete();
    }

    removeElements() {
        this.retire = true;
        clearInterval(this._minuterie);
        clearInterval(this._clignote);
        if (this.cam) {
            const stream = this.cam.srcObject;
            if (stream) stream.getTracks().forEach(t => t.stop());
            this.cam.remove();
        }
        this.images = [];
        if (this.boutons) this.boutons.retirer();
        this.boutons = null;
        this.slider = null;
    }
}
