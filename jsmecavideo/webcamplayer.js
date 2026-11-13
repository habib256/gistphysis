// Nombre maximal d'images enregistrées (20 s à 15 images/s) : au-delà, la mémoire
// d'une tablette peut saturer. L'enregistrement s'arrête alors tout seul.
const WEBCAM_MAX_IMAGES = 300;

// Message clair (en français) expliquant pourquoi la caméra est indisponible
function messageErreurCamera(err) {
  let nom = err && err.name ? err.name : '';
  if (nom === 'NotAllowedError' || nom === 'SecurityError' || nom === 'PermissionDeniedError') {
    return 'Caméra refusée. Autorisez la caméra dans le navigateur. Si l’app est intégrée dans une page, ouvrez-la plutôt dans un onglet.';
  }
  if (nom === 'NotFoundError' || nom === 'DevicesNotFoundError' || nom === 'OverconstrainedError') {
    return 'Aucune caméra n’a été trouvée sur cet appareil.';
  }
  if (nom === 'NotReadableError' || nom === 'TrackStartError' || nom === 'AbortError') {
    return 'La caméra est déjà utilisée par une autre application. Fermez-la puis réessayez.';
  }
  return 'Caméra indisponible (' + (nom || 'erreur inconnue') + ').';
}

class WebcamPlayer {
    constructor(framerate) {
        this.cam = null;
        this.erreur = null;   // message affiché si la caméra est indisponible
        this.retire = false;  // vrai une fois le lecteur supprimé (flux à couper s'il arrive après)
        this.isLoaded = false;

        if (!window.isSecureContext) {
            // Les navigateurs n'autorisent la caméra qu'en HTTPS (ou sur localhost)
            this.erreur = 'Caméra indisponible : le navigateur ne l’autorise que sur une adresse sécurisée (https://…). Ouvrez le site en https, ou utilisez une vidéo de la liste.';
        } else if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            this.erreur = 'Ce navigateur ne donne pas accès à la caméra.';
        } else {
            this.ouvrirCamera();
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

    // Ouvre la caméra (caméra arrière de préférence sur tablette, 640×480 pour limiter la mémoire)
    ouvrirCamera() {
        const elt = document.createElement('video');
        elt.setAttribute('playsinline', '');
        elt.muted = true;
        document.body.appendChild(elt);
        this.cam = new p5.MediaElement(elt, p5.instance);
        this.cam.hide();

        elt.addEventListener('loadedmetadata', () => {
            // Comme createCapture de p5.js : dimensions nécessaires à image() et get()
            elt.width = elt.videoWidth;
            elt.height = elt.videoHeight;
            this.cam.width = elt.videoWidth;
            this.cam.height = elt.videoHeight;
            this.cam.loadedmetadata = true;
            const lecture = elt.play();
            if (lecture && lecture.catch) lecture.catch(() => {});
            this.isLoaded = true;
        });

        const contraintes = {
            audio: false,
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };
        navigator.mediaDevices.getUserMedia(contraintes).then(stream => {
            if (this.retire) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            elt.srcObject = stream;
        }).catch(err => {
            console.warn('Erreur accès webcam:', err);
            this.erreur = messageErreurCamera(err);
        });
    }

    addElements() {
        if (this.ElementsOff) {
            // Boutons de 52×48 px et curseur de temps, utilisables au doigt (voir interface.js)
            this.buttonRecord = creerBoutonIcone('Enregistrer / arrêter', 'media-record.png', () => this.toggleRecording());
            this.buttonStart = creerBoutonIcone('Revenir au début', 'media-skip-backward.png', () => this.jumpToStart());
            this.buttonBack = creerBoutonIcone('Image précédente', 'media-step-backward.png', () => this.previousFrame());
            this.buttonPlay = creerBoutonIcone('Lire / pause', 'media-playback-start.png', () => this.play());
            this.buttonForward = creerBoutonIcone('Image suivante', 'media-step-forward.png', () => this.nextFrame());

            this.slider = creerCurseurTemps();
            this.slider.input(() => {
                // Déplacement au curseur (souris ou doigt) : on va à l'image correspondante
                if (this.isRecorded && this.images.length > 1) {
                    this.isPlaying = false;
                    this.frameIndex = Math.round(this.slider.value() * (this.images.length - 1));
                }
            });

            this.ElementsOff = false;
        }
    }

    draw() {
        background(0); // Toujours nettoyer le fond (écran noir par défaut)
        if (this.erreur) {
            this.dessinerMessage(this.erreur);
        } else if (this.isLoaded && this.cam && this.cam.width > 0 && this.cam.height > 0) {
            if (this.isRecording) {
                    let pic = this.cam.get();
                    this.images.push(pic);
                    if (this.images.length >= WEBCAM_MAX_IMAGES) {
                        this.stopRecording(); // Limite mémoire atteinte
                    }
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
            this.dessinerMessage('Ouverture de la caméra…\nAutorisez l’accès à la caméra si le navigateur le demande.');
        }
        this.sliderUpdate();
        this.buttonPlayUpdate();
    }

    // Texte centré sur fond noir (caméra en attente ou indisponible)
    dessinerMessage(message) {
        push();
        noStroke();
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(26);
        textWrap(WORD);
        text(message, 60, 0, width - 120, height);
        pop();
    }

    sliderUpdate() {
        if (this.images.length <= 1) {
            this.slider.value(0);
            return;
        }
        if (this.slider.actif) {
            // Pendant qu'on le manipule, c'est le curseur qui choisit l'image (voir input)
            return;
        }
        this.slider.value(this.frameIndex / (this.images.length - 1));
    }
    buttonPlayUpdate() {
        if (this.isPlaying) {
            this.buttonPlay.style('background-image', 'url("img/tango/media-playback-pause.png")');        
        } else {
            this.buttonPlay.style('background-image', 'url("img/tango/media-playback-start.png")');        
        }   
    }

    removeElements() {
        // Arrêter le flux webcam et libérer les ressources
        this.retire = true;
        if (this.cam) {
            let stream = this.cam.elt.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            this.cam.remove();
        }
        // Arrêter le clignotement d'enregistrement si actif
        if (this.recordBlinkInterval) {
            clearInterval(this.recordBlinkInterval);
            this.recordBlinkInterval = null;
        }
        this.isRecording = false;
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
        if (!this.isLoaded || this.erreur) return; // Pas de caméra : rien à enregistrer
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
