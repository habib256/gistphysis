// videoplayer.js — lecteur d'une vidéo de la liste, image par image
//
// Les images sont atteintes sur une grille fixe : t = début + k / fréquence (pas d'erreur
// qui s'accumule). Un déplacement n'est terminé qu'à l'événement « seeked » : tant que
// l'image demandée n'est pas affichée, on n'accepte pas de nouveau point.

class VideoPlayer {
    // framerate : images par seconde DU FICHIER (pour aller d'image en image) ;
    // nbImages : nombre d'images du fichier (ffprobe), car la durée annoncée par le navigateur
    // est fausse au début pour les vidéos qui ne commencent pas à 0 s.
    constructor(chemin, framerate, nbImages) {
        this.chemin = chemin;
        this.framerate = framerate;
        this.nbImages = nbImages || 0;
        this.deplacementImpossible = false; // vrai si le serveur ne permet pas d'aller à une image
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
        elt.addEventListener('ended', () => { if (this.isPlaying) this._surFin(); });
        // Lecture arrêtée par le navigateur lui-même (page cachée, politique de lecture…) :
        // même calage que pour une pause demandée
        elt.addEventListener('pause', () => { if (this.isPlaying && !elt.ended) this.pause(true); });
        this._surVisibilite = () => { if (document.hidden && this.isPlaying) this.pause(true); };
        document.addEventListener('visibilitychange', this._surVisibilite);
        elt.addEventListener('error', () => {
            if (this.retire || !elt.getAttribute('src')) return;
            this.erreur = 'Impossible de lire cette vidéo. Choisis-en une autre ou recharge la page.';
        });
        this.chargerSource(chemin);
        this.addElements();
    }

    // Charge tout le fichier (15 à 400 Ko) puis le donne à l'élément vidéo par une adresse
    // locale (blob:) : se déplacer dans la vidéo marche même si le serveur ne gère pas les
    // requêtes partielles (Range). Repli : adresse directe si le chargement échoue (file://…).
    chargerSource(chemin) {
        this.chargement = 0;
        const repli = () => {
            if (this.retire) return;
            this.repli = true; // lecture directe : le déplacement image par image sera vérifié
            this.elt.src = chemin;
        };
        if (typeof fetch !== 'function' || typeof URL.createObjectURL !== 'function') {
            repli();
            return;
        }
        fetch(chemin).then(reponse => {
            if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
            const total = Number(reponse.headers.get('Content-Length')) || 0;
            if (!reponse.body || !total || typeof reponse.body.getReader !== 'function') return reponse.blob();
            const lecteurFlux = reponse.body.getReader();
            const morceaux = [];
            let recu = 0;
            const lire = () => lecteurFlux.read().then(({ done, value }) => {
                if (done) return new Blob(morceaux, { type: reponse.headers.get('Content-Type') || 'video/mp4' });
                morceaux.push(value);
                recu += value.length;
                this.chargement = Math.min(1, recu / total);
                return lire();
            });
            return lire();
        }).then(blob => {
            if (this.retire) return;
            this.urlObjet = URL.createObjectURL(blob);
            this.elt.src = this.urlObjet;
        }).catch(repli);
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
        if (this.nbImages > 0) return this.nbImages - 1;
        const d = this.elt.duration;
        if (!(d > 0)) return 0;
        return Math.max(0, Math.ceil((d - this.debut) * this.framerate - 1e-6) - 1);
    }

    // Numéro de l'image affichée à l'instant t de la vidéo (image k : de début + k/fps à
    // début + (k+1)/fps ; this.debut vaut le début réel + 1 ms)
    indiceImage(t = this.elt.currentTime) {
        return Math.max(0, Math.floor((t - this.debut + 0.001) * this.framerate + 1e-6));
    }

    // Va à l'image k. Renvoie faux si elle n'existe pas (la position ne change pas).
    // Ne relance jamais une recherche vers la position déjà atteinte… sauf après une lecture :
    // pause() invalide this.image, si bien que l'image affichée à l'arrêt est TOUJOURS le
    // résultat d'une recherche (Chrome peut montrer, à l'arrêt d'une lecture, l'image qui suit
    // celle que donne currentTime). La cible est le milieu de l'image k.
    allerImage(k) {
        if (!this.isLoaded) return false;
        if (k < 0 || k > this.derniereImage()) return false;
        if (this.isPlaying) this.pause(false);
        const cible = this.debut - 0.001 + (k + 0.5) / this.framerate;
        if (k === this.image && !this.enDeplacement && !this.elt.seeking && this.indiceImage() === k) {
            return true; // déjà affichée
        }
        this.image = k;
        this._cible = cible;
        this._essais = 0;
        this.enDeplacement = true;
        clearTimeout(this._secours);
        // Secours : si aucun seeked n'arrive, on vérifie l'image affichée après 1,5 s
        this._secours = setTimeout(() => this._verifierPosition(true), 1500);
        this.elt.currentTime = cible;
        return true;
    }

    _surSeeked() {
        if (this._cible === undefined || this.elt.seeking) return;
        this._verifierPosition(false);
    }

    // L'image affichée est-elle bien l'image demandée ? Sinon on réessaie (la durée annoncée
    // grandit pendant le décodage), puis on signale que le déplacement est impossible.
    _verifierPosition(secours) {
        if (!this.enDeplacement) return;
        const k = this.indiceImage();
        if (k === this.image) {
            this.enDeplacement = false;
            clearTimeout(this._secours);
            return;
        }
        if (this._essais < 3 && !secours) {
            this._essais++;
            this.elt.currentTime = this._cible;
            return;
        }
        // Déplacement impossible (serveur sans requêtes partielles, par exemple)
        this.enDeplacement = false;
        clearTimeout(this._secours);
        this.deplacementImpossible = true;
        this.image = k;
    }

    // Navigation manuelle (boutons, flèches, curseur, Début) : l'élève choisit son image ;
    // le « retour à l'image de travail » ne vaut que pour un toucher qui suit une lecture.
    allerImageChoisie(k) {
        const ok = this.allerImage(k); // (arrête la lecture si besoin)
        this.aLu = false;              // puis : c'est l'élève qui a choisi cette image
        return ok;
    }

    nextFrame() {
        if (typeof avantImageSuivante === 'function') avantImageSuivante(this.image);
        return this.allerImageChoisie(this.image + 1);
    }
    previousFrame() { return this.allerImageChoisie(this.image - 1); }
    jumpToStart() { return this.allerImageChoisie(0); }

    // Lecture / pause ; à la pause, la vidéo est calée sur une image entière
    play() {
        if (!this.isLoaded) return;
        if (this.isPlaying) {
            this.pause(true);
        } else {
            if (this.image >= this.derniereImage()) this.allerImage(0);
            this.isPlaying = true;
            const lecture = this.elt.play();
            if (lecture && lecture.catch) lecture.catch(() => { if (this.isPlaying) this.pause(true); });
        }
        this.majBoutonLecture();
    }

    // Arrêt d'une lecture, quel que soit le chemin (bouton, Espace, toucher, changement de mode,
    // page cachée…). INVARIANT : this.image est invalidée ; la prochaine allerImage fait donc
    // toujours une vraie recherche, et aucun point n'est accepté avant son « seeked ».
    // caler = faux seulement quand l'appelant lance lui-même la recherche juste après.
    pause(caler = true) {
        const etaitEnLecture = this.isPlaying;
        this.isPlaying = false;
        this.elt.pause();
        this.majBoutonLecture();
        if (etaitEnLecture || caler) this.aLu = true; // l'élève a regardé la vidéo
        const k = Math.min(this.indiceImage(), this.derniereImage());
        this.image = -1;
        if (caler) this.allerImage(k);
    }

    // Fin d'une LECTURE (jamais déclenchée par une simple recherche)
    _surFin() {
        this.isPlaying = false;
        this.aLu = true;
        this.majBoutonLecture();
        this.image = -1; // force le calage
        this.allerImage(this.derniereImage());
    }

    // Force le décodage de la première image, repère son instant, puis cale l'image 0 en son
    // milieu (comme toute autre image : recherche vérifiée, aucun point avant son « seeked »).
    _premiereImage() {
        if (this.isLoaded || this._attentePremiere) return;
        this._attentePremiere = true;
        const elt = this.elt;
        // Firefox (ordinateur et Android) suspend le décodage d'une vidéo invisible (élément
        // display:none) ; une recherche faite dans cet état affiche ensuite une autre image que
        // celle de currentTime (la 4e image au lieu de la 1re, mesuré). Dessiner l'élément une
        // fois sur un canevas en fait une source d'image : Firefox ne le suspend plus.
        try {
            const c = document.createElement('canvas');
            c.width = c.height = 1;
            c.getContext('2d').drawImage(elt, 0, 0, 1, 1);
        } catch (e) { /* rien : seul Firefox en a besoin */ }
        const fin = () => {
            elt.removeEventListener('seeked', fin);
            // Certaines vidéos commencent après 0 s (première image à 0,12 s pour
            // TableHorizRectiligneUniforme) : Chrome ramène alors la position au début réel,
            // Firefox fait commencer la vidéo à 0 s. Dans les deux cas : début = position atteinte.
            if (elt.currentTime > 0.0015) this.debut = elt.currentTime + 0.001;
            this.isLoaded = true;
            this.image = -1;  // force une vraie recherche
            this.allerImage(0);
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
            if (this.isPlaying) this.image = Math.min(this.indiceImage(), this.derniereImage());
        } else {
            const pct = this.chargement > 0 && this.chargement < 1 ? ' ' + Math.round(this.chargement * 100) + ' %' : '';
            messageSurImage('Chargement de la vidéo…' + pct);
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
        this.retire = true;
        clearTimeout(this._secours);
        document.removeEventListener('visibilitychange', this._surVisibilite);
        this.elt.removeEventListener('loadeddata', this._surDonnees);
        this.elt.pause();
        this.elt.removeAttribute('src');
        this.elt.load();
        this.elt.remove();
        if (this.urlObjet) URL.revokeObjectURL(this.urlObjet);
        if (this.boutons) this.boutons.retirer();
        this.boutons = null;
        this.slider = null;
    }
}
