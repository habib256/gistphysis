// mecavideo.js — application : modes, menus, pointage, dessin de l'image
//
// Modes (etat) : 'Pointage', 'Calibration' (étalonnage), 'Graphique'.
// Source : 'video' (vidéo de la liste) ou 'webcam'. Changer de mode ne perd rien : points
// et étalonnage restent ; seuls un changement de vidéo ou du nombre de mobiles effacent
// les points, après confirmation.

let videoPlayer = null;
let webcamPlayer = null;
let visor;
let data = new Data();
let graph;
let calibrator;

let etat = 'Pointage';
let source = 'video';
let indexVideo = 0;
// Nombre d'images dont la vidéo avance après chaque pointage (1, 2 ou 5)
let imagesParPoint = 1;
// Message affiché quelques secondes à la place de la consigne
let messageTemporaire = { texte: '', fin: 0 };
let canvasElt;

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------

function setup() {
  const canvas = createCanvas(400, 300);
  canvas.parent('canvas-container');
  canvasElt = canvas.elt;
  canvasElt.setAttribute('tabindex', '0');
  // Image interactive (on y pointe) : rôle « application », consigne et état en description
  canvasElt.setAttribute('role', 'application');
  canvasElt.setAttribute('aria-roledescription', 'image de la vidéo à pointer');
  canvasElt.setAttribute('aria-describedby', 'instructions frame-info');
  canvasElt.setAttribute('aria-label', 'Image de la vidéo');
  canvasElt.title = 'Clique (ou touche) pour pointer. Clavier : ← → image précédente / suivante ; ' +
    'Entrée sur l’image fait apparaître un réticule, flèches pour le déplacer, Entrée pour pointer, Échap pour sortir.';
  noCursor();

  visor = new Visor();
  calibrator = new Calibrator();
  // Une seule source de vérité pour l'échelle : celle du calibrateur (validée), lue à chaque fois
  Object.defineProperty(data, 'echelle', {
    get: () => (calibrator && calibrator.isCalibrated ? calibrator.scaleFactor : null),
    set: () => {},
    configurable: true
  });
  graph = new Graph(data, document.getElementById('graphique'));

  remplirMenuVideos();
  installerMenus();
  installerPointageTactile(canvasElt);
  installerRaccourcis();
  installerGuide();

  document.getElementById('bouton-annuler').addEventListener('click', annulerDernierPoint);
  document.getElementById('bouton-export').addEventListener('click', exporterCSV);
  document.getElementById('bouton-voir-graphiques').addEventListener('click', () => passerAuMode('Graphique'));
  document.getElementById('validate-calibration').addEventListener('click', validateCalibration);
  document.getElementById('reset-calibration').addEventListener('click', resetCalibration);
  document.getElementById('passer-pointage').addEventListener('click', () => passerAuMode('Pointage'));
  const saisie = document.getElementById('real-distance');
  saisie.addEventListener('keydown', (e) => { if (e.key === 'Enter') validateCalibration(); });
  saisie.addEventListener('input', () => {
    majSaisieCalibration(false);
    majApercuLongueur();
  });

  installerPleinEcran();

  const depart = Math.max(0, videoFiles.findIndex(v => v.path === VIDEO_DEPART));
  chargerVideo(depart);

  installerMiseAEchelle();
  majModeAffichage();
  proposerReprise();
}

// Bouton « Plein écran » : seulement quand l'app n'est pas dans un cadre (dans le site,
// c'est la page qui l'entoure qui le fournit)
function installerPleinEcran() {
  const bouton = document.getElementById('bouton-plein-ecran');
  let dansCadre = true;
  try { dansCadre = window.self !== window.top; } catch (e) { dansCadre = true; }
  const racine = document.documentElement;
  const demander = racine.requestFullscreen || racine.webkitRequestFullscreen;
  const possible = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (dansCadre || !demander || !possible) return;
  bouton.hidden = false;
  const actif = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const maj = () => {
    bouton.setAttribute('aria-pressed', actif() ? 'true' : 'false');
    bouton.title = actif() ? 'Quitter le plein écran (Échap)' : 'Afficher l’app sur tout l’écran';
    bouton.setAttribute('aria-label', bouton.title);
  };
  bouton.addEventListener('click', () => {
    if (actif()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const r = demander.call(racine);
      if (r && r.catch) r.catch(() => {});
    }
  });
  document.addEventListener('fullscreenchange', maj);
  document.addEventListener('webkitfullscreenchange', maj);
  maj();
}

// Menu des vidéos : groupes (« Pour commencer » en tête), titres lisibles, webcam à la fin
function remplirMenuVideos() {
  const menu = document.getElementById('choix-video');
  GROUPES_VIDEOS.forEach(nom => {
    const groupe = document.createElement('optgroup');
    groupe.label = nom;
    videoFiles.forEach((v, i) => {
      if (v.groupe !== nom) return;
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = v.titre;
      groupe.appendChild(o);
    });
    if (groupe.children.length) menu.appendChild(groupe);
  });
  // La caméra n'est proposée que si le navigateur peut l'ouvrir (https ou localhost)
  if (webcamDisponible()) {
    const groupe = document.createElement('optgroup');
    groupe.label = 'Ma caméra';
    const o = document.createElement('option');
    o.value = 'webcam';
    o.textContent = '📷 Filmer avec la caméra de l’appareil';
    groupe.appendChild(o);
    menu.appendChild(groupe);
  }
}

function installerMenus() {
  const menuMode = document.getElementById('choix-mode');
  menuMode.addEventListener('change', () => passerAuMode(menuMode.value));

  const menuVideo = document.getElementById('choix-video');
  menuVideo.addEventListener('change', () => {
    const valeur = menuVideo.value;
    const ancienne = source === 'webcam' ? 'webcam' : String(indexVideo);
    const appliquer = () => {
      if (valeur === 'webcam') chargerWebcam();
      else chargerVideo(parseInt(valeur, 10));
      sauvegarderSeance();
    };
    const n = data.getTotalPointCount();
    if (n > 0 || calibrator.isCalibrated) {
      demanderConfirmation(
        'Changer de vidéo efface ' + (n > 0 ? (n === 1 ? 'ton point' : 'tes ' + n + ' points') + ' et ' : '') +
        'l’étalonnage (l’échelle dépend de la vidéo).',
        'Changer de vidéo', 'Garder mon travail',
        appliquer,
        () => { menuVideo.value = ancienne; }
      );
    } else {
      appliquer();
    }
  });

  const menuMobiles = document.getElementById('choix-mobiles');
  menuMobiles.addEventListener('change', () => {
    const nouveau = parseInt(menuMobiles.value, 10) || 1;
    const appliquer = () => {
      data.setNumMobiles(nouveau);
      annoncer('Nombre de mobiles : ' + nouveau + '.');
      reprendrePointage();
      sauvegarderSeance();
    };
    const n = data.getTotalPointCount();
    if (n > 0) {
      demanderConfirmation('Changer le nombre de mobiles efface ' + (n === 1 ? 'ton point' : 'tes ' + n + ' points') + '. L’étalonnage est gardé.',
        'Effacer les points', 'Garder mes points', appliquer, () => { menuMobiles.value = String(data.numMobiles); });
    } else {
      appliquer();
    }
  });

  const menuPas = document.getElementById('choix-pas');
  menuPas.addEventListener('change', () => {
    imagesParPoint = parseInt(menuPas.value, 10) || 1;
    majGuide();
    sauvegarderSeance();
  });
}

// Bandeau de confirmation dans l'interface (pas de confirm() : il est bloqué dans certains cadres)
// Menus inactifs pendant une question (pas deux questions empilées)
function activerMenus(actifs) {
  ['choix-mode', 'choix-video', 'choix-mobiles', 'choix-pas'].forEach(id => { document.getElementById(id).disabled = !actifs; });
}

// Échap = « non » seulement quand « non » ne détruit rien (danger = vrai : « non » garde le
// travail). Pour « Reprendre ton pointage ? », Échap ne fait rien : il faut choisir.
let echapConfirmation = null;
function confirmationOuverte() {
  return !document.getElementById('confirmation').hidden;
}

function demanderConfirmation(texte, libelleOui, libelleNon, surOui, surNon, danger = true) {
  const boite = document.getElementById('confirmation');
  const oui = document.getElementById('confirmation-oui');
  const non = document.getElementById('confirmation-non');
  oui.classList.toggle('bouton-danger', danger);
  oui.classList.toggle('bouton-principal', !danger);
  boite.style.borderColor = danger ? '' : '#145a32';
  document.getElementById('confirmation-texte').textContent = texte;
  oui.textContent = libelleOui;
  non.textContent = libelleNon;
  const fermer = (action) => {
    boite.hidden = true;
    activerMenus(true);
    oui.onclick = null;
    non.onclick = null;
    echapConfirmation = null;
    if (action) action();
  };
  // Un toucher arrivé moins de 400 ms après l'ouverture visait autre chose : ignoré
  const ouverture = performance.now();
  const garde = (action) => () => { if (performance.now() - ouverture >= 400) fermer(action); };
  oui.onclick = garde(surOui);
  non.onclick = garde(surNon);
  echapConfirmation = danger ? () => fermer(surNon) : null;
  annulerToucher();
  activerMenus(false);
  boite.hidden = false;
  (danger ? non : oui).focus();
}

// ---------------------------------------------------------------------------
// Sources (vidéo de la liste ou webcam)
// ---------------------------------------------------------------------------

function lecteur() {
  return source === 'webcam' ? webcamPlayer : videoPlayer;
}

function dimensionsSource() {
  const l = lecteur();
  return l ? l.dims() : null;
}

function videoCourante() {
  return source === 'video' ? videoFiles[indexVideo] : null;
}

function retirerLecteurs() {
  if (videoPlayer) { videoPlayer.removeElements(); videoPlayer = null; }
  if (webcamPlayer) { webcamPlayer.removeElements(); webcamPlayer = null; }
}

// Nouvelle source : points et étalonnage effacés (ils dépendent de l'image)
function nouvelleSource() {
  data.clearAllPoints();
  oublierEtalonnage();
  annulerToucher();
  clavier.actif = false;
  messageTemporaire.fin = 0;
}

function chargerVideo(i) {
  retirerLecteurs();
  source = 'video';
  indexVideo = i;
  document.getElementById('choix-video').value = String(i);
  const v = videoFiles[i];
  data.configurer({ dureeImage: v.dureeImage || 1 / v.framerate, uniteTemps: v.uniteTemps, uniteLongueur: v.uniteLongueur });
  nouvelleSource();
  videoPlayer = new VideoPlayer(v.path, v.framerate, v.images);
  if (etat === 'Graphique') passerAuMode('Pointage');
  demanderAjustementTaille();
  majModeAffichage();
}

function chargerWebcam() {
  retirerLecteurs();
  source = 'webcam';
  document.getElementById('choix-video').value = 'webcam';
  webcamPlayer = new WebcamPlayer(15);
  data.configurer({ dureeImage: 1 / webcamPlayer.framerate, instants: [] });
  nouvelleSource();
  if (etat === 'Graphique') passerAuMode('Pointage');
  demanderAjustementTaille();
  majModeAffichage();
}

// Appelé quand la source est prête (vidéo décodée, caméra ouverte, séquence enregistrée)
let dimsAVerifier = null;
function surSourcePrete() {
  // Une sauvegarde dont les dimensions ou les points ne vont pas avec cette vidéo est ignorée
  if (dimsAVerifier && source === 'video') {
    const d = dimensionsSource();
    const horsImage = d && data.points.some(pts => pts.some(p => p.xpx > d.w || p.ypx > d.h));
    if (d && (d.w !== dimsAVerifier.w || d.h !== dimsAVerifier.h || horsImage)) {
      data.clearAllPoints();
      calibrator.reset();
      document.getElementById('real-distance').value = '';
      majSaisieCalibration(true);
      afficherMessageTemporaire('Sauvegarde incohérente avec cette vidéo : ignorée.', 4000);
      try { sessionStorage.removeItem(CLE_SEANCE); } catch (e) { /* rien */ }
    }
    dimsAVerifier = null;
  }
  // Webcam : les instants réels de chaque image enregistrée servent aux temps
  if (source === 'webcam' && webcamPlayer) data.instants = webcamPlayer.instants.slice();
  demanderAjustementTaille();
  reprendrePointage();
}

// Webcam : un nouvel enregistrement remplace la séquence ; les points pointés dessus
// n'auraient plus de sens. On demande confirmation et on les efface.
function avantNouvelEnregistrement(demarrer) {
  const n = data.getTotalPointCount();
  if (n === 0) {
    demarrer();
    return;
  }
  demanderConfirmation('Un nouvel enregistrement remplace la séquence filmée et efface ' + (n === 1 ? 'ton point' : 'tes ' + n + ' points') + '.',
    'Enregistrer à nouveau', 'Garder mes points', () => {
      data.clearAllPoints();
      annoncer('Points effacés : nouvel enregistrement.');
      demarrer();
    }, null);
}

// Passer à l'image suivante alors que tous les mobiles ne sont pas pointés : on prévient
function avantImageSuivante(k) {
  if (etat !== 'Pointage' || data.numMobiles < 2) return;
  const n = data.points.filter(pts => pts.some(p => p.image === k)).length;
  if (n > 0 && n < data.numMobiles) {
    afficherMessageTemporaire('⚠️ Image ' + k + ' : ' + n + ' mobile' + (n > 1 ? 's' : '') + ' sur ' + data.numMobiles +
      ' pointé' + (n > 1 ? 's' : '') + '. Les autres manqueront sur cette image.', 4000);
  }
}

// Image où reprendre : celle qui suit le dernier point (ou la dernière image pointée si
// tous les mobiles n'y sont pas encore pointés, ou si la vidéo est finie)
function imageDeReprise() {
  const lect = lecteur();
  const k = data.derniereImagePointee();
  if (k < 0 || !lect) return 0;
  if (data.mobileAPointer(k) >= 0) return k;
  return Math.min(k + imagesParPoint, lect.derniereImage()) === k + imagesParPoint ? k + imagesParPoint : k;
}

function reprendrePointage() {
  const lect = lecteur();
  if (!lect || data.getTotalPointCount() === 0) return;
  lect.allerImage(imageDeReprise());
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

function passerAuMode(nouveau) {
  if (['Pointage', 'Calibration', 'Graphique'].indexOf(nouveau) < 0) nouveau = 'Pointage';
  const ancien = etat;
  etat = nouveau;
  document.getElementById('choix-mode').value = nouveau;
  annulerToucher();
  clavier.actif = false;
  messageTemporaire.fin = 0; // les messages temporaires ne survivent pas à un changement de mode
  const lect = lecteur();

  if (nouveau === 'Graphique') {
    if (lect && lect.isPlaying) lect.pause(false);
    noLoop();
    // Portrait : le guide se replie pour laisser la place au graphique
    if (guide.ouvert && !guide.ouvertParEleve && document.body.classList.contains('emp')) {
      guide.ouvert = false;
      majGuide(true);
    }
    majModeAffichage();
    appliquerDisposition();
    ajusterTaille();
    graph.updateChart();
  } else {
    graph.destroy();
    majModeAffichage();
    if (nouveau === 'Pointage' && ancien !== 'Pointage') reprendrePointage();
    if (nouveau === 'Calibration') {
      majSaisieCalibration();
      // Paysage : la saisie est en haut du panneau
      if (document.body.classList.contains('lat')) document.getElementById('panneau').scrollTop = 0;
    }
    appliquerDisposition();
    loop();
    demanderAjustementTaille();
  }
  majTextes();
  sauvegarderSeance();
}

// Visibilité des zones propres à chaque mode
function majModeAffichage() {
  const graphique = etat === 'Graphique';
  document.body.classList.toggle('mode-pointage', modePointageActif());
  document.body.classList.toggle('mode-etalonnage', etat === 'Calibration');
  document.body.classList.toggle('mode-graphique', graphique);
  document.getElementById('canvas-container').hidden = graphique;
  document.getElementById('graphique-zone').hidden = !graphique;
  document.getElementById('choix-graphique').hidden = !graphique;
  document.getElementById('controls').hidden = graphique;
  document.getElementById('bouton-annuler').hidden = etat !== 'Pointage';
  const exporter = document.getElementById('bouton-export');
  exporter.hidden = !graphique;
  exporter.disabled = data.getTotalPointCount() === 0;
  if (!graphique) document.getElementById('acceleration-info').hidden = true;
  majSaisieCalibration();
}

function modePointageActif() {
  return etat === 'Pointage' || etat === 'Calibration';
}

// ---------------------------------------------------------------------------
// Dessin
// ---------------------------------------------------------------------------

function draw() {
  if (etat === 'Graphique') return;
  const lect = lecteur();
  if (lect) lect.draw();
  else background(0);

  if (etat === 'Pointage') {
    // Pendant un geste (doigt posé, loupe), les marques des autres points s'effacent presque :
    // elles ne cachent pas le mobile, ni sur l'image ni dans la loupe
    dessinerPoints(gesteEnCours() || loupeVisible() ? 'leger' : false);
    visor.drawLegend(data, mobileCourant());
  } else if (etat === 'Calibration') {
    dessinerPoints(true);
    calibrator.draw(versEcran);
  }

  // Viseur : suit la souris, le doigt (avec la loupe) ou le réticule clavier
  const pos = positionViseur();
  if (pos) {
    const m = Math.max(0, mobileCourant());
    const style = etat === 'Calibration' ? { r: 0, g: 230, b: 90, forme: 'croix', symbole: '' } : data.getColor(m);
    if (loupeVisible()) dessinerLoupe(pos.x, pos.y, color(style.r, style.g, style.b));
    visor.style = style;
    visor.setMobileNumber(etat === 'Pointage' && data.numMobiles > 1 ? m + 1 : 0);
    visor.update(pos.x, pos.y);
    visor.draw();
  }
  majTextes();
}

// Points de chaque mobile, numérotés (1, 2, 3…) comme sur une chronophotographie.
// Un numéro est omis s'il chevaucherait le précédent. En étalonnage : marques discrètes.
function dessinerPoints(discret = false) {
  const s = dimensionsSource();
  if (!s) return;
  const kCourant = lecteur() ? lecteur().image : -1;
  for (let m = 0; m < data.numMobiles; m++) {
    const style = data.getColor(m);
    let dernierNumero = null;
    data.points[m].forEach((p, i) => {
      const e = versEcran(p.xpx, s.h - p.ypx);
      if (discret) {
        push();
        noStroke();
        fill(style.r, style.g, style.b, discret === 'leger' ? 70 : 150);
        ellipse(e.x, e.y, discret === 'leger' ? 3 : 5, discret === 'leger' ? 3 : 5);
        pop();
        return;
      }
      if (p.image === kCourant) {
        push();
        noFill();
        stroke(255);
        strokeWeight(2);
        ellipse(e.x, e.y, 22, 22);
        pop();
      }
      dessinerMarque(style, e.x, e.y);
      if (!dernierNumero || dist(e.x, e.y, dernierNumero.x, dernierNumero.y) > 20) {
        dessinerNumero(i + 1, e.x, e.y);
        dernierNumero = e;
      }
    });
  }
}

// Mobile à pointer sur l'image affichée (-1 : tous les mobiles y sont déjà pointés)
function mobileCourant() {
  const lect = lecteur();
  return data.mobileAPointer(lect ? lect.image : 0);
}

// ---------------------------------------------------------------------------
// Consigne, état, annonces (le DOM n'est réécrit que si le texte change)
// ---------------------------------------------------------------------------

function ecrire(id, texte) {
  const el = document.getElementById(id);
  if (el && el.textContent !== texte) el.textContent = texte;
}

function annoncer(texte) {
  const el = document.getElementById('annonce');
  el.textContent = '';
  setTimeout(() => { el.textContent = texte; }, 30);
}

function afficherMessageTemporaire(texte, duree = 5000) {
  messageTemporaire = { texte: texte, fin: performance.now() + duree };
  ecrire('instructions', texte);
  annoncer(texte);
  // En mode Graphiques, l'image n'est plus redessinée : on remet la consigne ensuite
  clearTimeout(afficherMessageTemporaire.minuterie);
  afficherMessageTemporaire.minuterie = setTimeout(() => {
    if (etat === 'Graphique' && !messageTemporaireActif()) majTextes();
  }, duree + 50);
}

function messageTemporaireActif() {
  return performance.now() < messageTemporaire.fin ? messageTemporaire.texte : null;
}

// Vrai quand la dernière image utile est pointée : on ne peut plus avancer
function finDeVideo() {
  const lect = lecteur();
  if (!lect || !lect.pret()) return false;
  const k = lect.image;
  return data.mobileAPointer(k) < 0 && k + imagesParPoint > lect.derniereImage() && k === data.derniereImagePointee();
}

function consigneAction() {
  const temp = messagePointageTactile() || messageTemporaireActif();
  if (temp) return temp;
  const lect = lecteur();
  const tactile = typePointeur === 'tactile';
  if (etat === 'Graphique') {
    return data.getTotalPointCount() === 0
      ? 'Aucun point pour l’instant : reviens à l’étape « 🎯 Pointer ».'
      : '📈 Choisis un graphique. Les mesures sont résumées dessous.';
  }
  if (lect && lect.erreur) return lect.erreur;
  if (source === 'webcam' && lect && !lect.isRecorded) {
    return lect.isRecording ? '⏺ Enregistrement… Touche ● pour l’arrêter.' : '📷 Filme le mouvement : bouton ● pour enregistrer, puis pointe image par image.';
  }
  if (!lect || !lect.isLoaded) return 'Chargement de la vidéo…';
  if (lect.deplacementImpossible) return '⛔ Impossible d’aller à une image précise avec ce serveur : pointer donnerait des mesures fausses. Ouvre l’app depuis le site.';
  if (etat === 'Calibration') return calibrator.getInstructionMessage(tactile ? 'tactile' : 'souris');
  if (lect.isPlaying) return '▶ Lecture… Pointer met la vidéo en pause.';
  if (finDeVideo()) return '🎬 Fin de la vidéo : dernière image pointée.';
  const m = mobileCourant();
  if (m < 0) return 'Image déjà pointée : pointer à nouveau remplace son point.';
  const quoi = data.numMobiles > 1 ? 'le mobile ' + (m + 1) + ' ' + data.getColor(m).symbole : 'le centre du mobile';
  if (clavier.actif) return '⌨️ Flèches : réticule (Maj ×10) · Entrée : pointer ' + quoi + ' · Échap : sortir.';
  if (tactile) return '👆 Pose le doigt sur ' + quoi + ', ajuste avec la loupe, relâche.';
  return '🖱 Clique sur ' + quoi + '. Ctrl+clic ou « ↶ Annuler » : retirer le dernier point.';
}

function texteEtat() {
  const lect = lecteur();
  const n = data.getTotalPointCount();
  let morceaux = [];
  if (etat !== 'Graphique' && lect && (lect.isLoaded || lect.isRecorded)) {
    morceaux.push('Image ' + lect.image + '/' + lect.derniereImage());
    // Instant t : même définition que le tableau et le fichier (t = 0 au premier point)
    if (n > 0) {
      if (lect.image >= data.premiereImagePointee()) morceaux.push('t = ' + nombreFr(data.instant(lect.image), data.formats().t) + ' ' + data.libelleTemps());
      else morceaux.push('avant le 1er point');
    }
  }
  morceaux.push(n <= 1 ? n + ' point' : n + ' points');
  morceaux.push(calibrator.isCalibrated ? calibrator.texteEchelle() : 'mesures en px');
  return morceaux.join(' · ');
}

function majTextes() {
  const consigne = consigneAction();
  ecrire('instructions', consigne);
  if (etat === 'Calibration') {
    ecrire('calibration-consigne', consigne);
    marquerDebordement(document.getElementById('calibration-textes'));
  }
  ecrire('frame-info', texteEtat());
  const sansPoint = data.getTotalPointCount() === 0;
  const annuler = document.getElementById('bouton-annuler');
  if (annuler.disabled !== sansPoint) annuler.disabled = sansPoint;
  const voir = document.getElementById('bouton-voir-graphiques');
  const fin = etat === 'Pointage' && finDeVideo();
  if (voir.hidden === fin) {
    voir.hidden = !fin;
    document.getElementById('info-bar').classList.toggle('fin', fin);
  }
  const lect = lecteur();
  const v = videoCourante();
  const n = data.getTotalPointCount();
  const label = (v ? 'Vidéo « ' + v.titre + ' »' : 'Caméra') +
    (lect && lect.isLoaded ? ', image ' + lect.image + ' sur ' + lect.derniereImage() : '') +
    ', ' + (n === 0 ? 'aucun point' : n === 1 ? '1 point' : n + ' points');
  if (canvasElt.getAttribute('aria-label') !== label) canvasElt.setAttribute('aria-label', label);
  majGuide();
}

// ---------------------------------------------------------------------------
// Pointage
// ---------------------------------------------------------------------------

// Enregistre un geste en (x, y), pixels vidéo (y vers le bas)
function traiterPointage(x, y) {
  const s = dimensionsSource();
  if (!s || x < 0 || x > s.w || y < 0 || y > s.h) return;
  if (confirmationOuverte()) {
    afficherMessageTemporaire('Réponds d’abord à la question au-dessus de l’image.', 3000);
    return;
  }
  if (tropPetit) return;

  if (etat === 'Calibration') {
    messageTemporaire.fin = 0;
    const r = calibrator.addPoint(x, y);
    if (r === 'complet') {
      afficherMessageTemporaire('Deux bouts déjà placés : fais-les glisser, ou « Recommencer ».');
    } else if (r === 'point2') {
      majSaisieCalibration();
      // Panneau latéral peu haut : le champ de longueur vient à l'écran
      document.getElementById('calibration-input').scrollIntoView({ block: 'nearest' });
      // À la souris, le champ reçoit le focus ; au doigt, on n'ouvre pas le clavier tout seul
      if (typePointeur !== 'tactile') document.getElementById('real-distance').focus();
    }
    majSaisieCalibration();
    sauvegarderSeance();
    return;
  }
  if (etat !== 'Pointage') return;

  const lect = lecteur();
  if (!lect || lect.erreur) return;
  if (source === 'webcam' && !lect.isRecorded) {
    afficherMessageTemporaire('📷 Enregistre d’abord une séquence (bouton ●), puis pointe image par image.');
    return;
  }
  if (!lect.isLoaded) {
    afficherMessageTemporaire('⏳ La vidéo se charge encore : attends un instant.');
    return;
  }
  if (lect.deplacementImpossible) {
    afficherMessageTemporaire('⛔ Impossible d’aller à une image précise : pointage refusé (mesures fausses).', 4000);
    return;
  }
  if (lect.isPlaying) {
    // Un clic pendant la lecture met en pause ET ramène à l'image de travail ; le clic suivant pointe
    lect.pause(false);
    lect.aLu = false;
    const cible = imageDeTravail(lect);
    lect.allerImage(cible);
    afficherMessageTemporaire('⏸ Vidéo en pause sur l’image de travail (image ' + cible + ') : pointe maintenant.', 3000);
    return;
  }
  if (lect.enDeplacement) {
    afficherMessageTemporaire('⏳ La vidéo avance : pointe dans un instant.', 1500);
    return;
  }
  // Après une lecture : on revient d'abord à l'image de travail (celle qui suit le dernier
  // point ; la première s'il n'y a pas de point et que la lecture est allée jusqu'au bout)
  if (lect.aLu) {
    lect.aLu = false;
    const cible = imageDeTravail(lect);
    if (cible !== lect.image) {
      lect.allerImage(cible);
      afficherMessageTemporaire('↩ Retour à l’image de travail (image ' + cible + ') : pointe maintenant.', 3500);
      return;
    }
  }

  const k = lect.image;
  let m = data.mobileAPointer(k);
  if (m < 0) m = mobileLePlusProche(k, x, s.h - y);
  const type = data.placer(m, k, x, s.h - y);
  const numero = data.numeroDuPoint(m, k);
  messageTemporaire.fin = 0;

  const tousPointes = data.mobileAPointer(k) < 0;
  const nom = (data.numMobiles > 1 ? 'mobile ' + (m + 1) + ', ' : '') + 'point ' + numero;
  if (type === 'ajout') {
    annoncer('Point enregistré : ' + nom + ', image ' + k + '.');
    // Avec plusieurs mobiles, tous sont pointés sur la même image avant d'avancer
    if (tousPointes) {
      const cible = k + imagesParPoint;
      if (cible <= lect.derniereImage()) lect.allerImage(cible);
      else annoncer('Fin de la vidéo : dernière image pointée.');
    }
  } else {
    afficherMessageTemporaire(type === 'remplacement'
      ? '✏️ Point remplacé (' + nom + ', image ' + k + ').'
      : '➕ Point inséré à sa place (' + nom + ', image ' + k + ').', 3500);
    if (tousPointes) lect.allerImage(imageDeReprise());
  }
  sauvegarderSeance();
}

// Image de travail après une lecture : celle qui suit le dernier point ; sans point, l'image
// où la lecture s'est arrêtée (sauf la toute dernière : on revient au début)
function imageDeTravail(lect) {
  if (data.getTotalPointCount() > 0) return imageDeReprise();
  const k = Math.min(lect.indiceImage(), lect.derniereImage());
  return k >= lect.derniereImage() ? 0 : k;
}

// Mobile dont le point (à l'image k) est le plus proche du geste : c'est lui qu'on corrige
function mobileLePlusProche(k, xpx, ypx) {
  let meilleur = 0, dmin = Infinity;
  for (let m = 0; m < data.numMobiles; m++) {
    const p = data.pointA(m, k);
    if (p) {
      const d = Math.hypot(p.xpx - xpx, p.ypx - ypx);
      if (d < dmin) { dmin = d; meilleur = m; }
    }
  }
  return meilleur;
}

// Annule la dernière action et revient à l'image concernée
function annulerDernierPoint() {
  if (etat !== 'Pointage' || confirmationOuverte()) return;
  const r = data.annuler();
  if (!r) return;
  const lect = lecteur();
  if (lect) lect.allerImage(r.image);
  messageTemporaire.fin = 0; // « Point inséré… » ne doit pas rester affiché
  annoncer('Dernier point annulé (image ' + r.image + ').');
  sauvegarderSeance();
}

// ---------------------------------------------------------------------------
// Étalonnage
// ---------------------------------------------------------------------------

function majApercuLongueur() {
  const saisie = document.getElementById('real-distance');
  const msg = document.getElementById('calibration-message');
  saisie.classList.remove('erreur');
  msg.classList.remove('erreur');
  const r = lireLongueur(saisie.value);
  if (!saisie.value.trim()) {
    ecrire('calibration-message', texteCalibrationParDefaut());
  } else if (r.erreur) {
    ecrire('calibration-message', r.uniteManquante ? r.erreur : 'Écris un nombre et une unité : 80 cm, 0,8 m, 800 mm…');
  } else {
    let t = '= ' + longueurFr(r.metres);
    if (r.sansUnite) t += ' (sans unité, ce sont des mètres)';
    ecrire('calibration-message', t);
  }
}

function texteCalibrationParDefaut() {
  if (calibrator.isCalibrated) {
    return 'Échelle : ' + calibrator.texteLongueur() + ' pour ' + nombreFr(calibrator.pixelDistance, 1) +
      ' px, soit ' + calibrator.texteEchelle() + '. Les deux bouts se déplacent encore.';
  }
  const v = videoCourante();
  const etalon = v && v.etalon ? 'Dans cette vidéo : ' + v.etalon : '';
  if (calibrator.state === 'waiting_distance') return etalon || 'Unités acceptées : m, cm, mm (ex. : 80 cm ou 0,8 m).';
  return etalon || 'Cherche dans l’image un objet dont tu connais la longueur (une règle).';
}

function validateCalibration() {
  const saisie = document.getElementById('real-distance');
  const msg = document.getElementById('calibration-message');
  if (!calibrator.point2) {
    msg.classList.add('erreur');
    ecrire('calibration-message', 'Place d’abord les deux bouts de l’objet sur l’image.');
    return;
  }
  const r = lireLongueur(saisie.value);
  if (r.erreur) {
    saisie.classList.add('erreur');
    msg.classList.add('erreur');
    ecrire('calibration-message', r.erreur);
    saisie.focus();
    return;
  }
  // Vraisemblance : si la vidéo montre un étalon, la longueur doit lui ressembler. Sinon
  // on demande de vérifier ; « Valider » une 2e fois avec la même saisie confirme.
  const v = videoCourante();
  const proche = !v || !v.etalonValeurs || v.etalonValeurs.some(e => Math.abs(r.metres / e - 1) <= 0.15);
  if (!proche && validateCalibration.aConfirmer !== saisie.value.trim()) {
    validateCalibration.aConfirmer = saisie.value.trim();
    saisie.classList.add('erreur');
    msg.classList.add('erreur');
    ecrire('calibration-message', 'Vérifie : l’objet connu de cette vidéo mesure ' + v.etalonValeurs.map(longueurFr).join(' ou ') +
      ', tu as écrit ' + longueurFr(r.metres) + '. « Valider » à nouveau pour confirmer.');
    return;
  }
  validateCalibration.aConfirmer = null;
  if (!calibrator.setRealDistance(r.metres)) {
    msg.classList.add('erreur');
    ecrire('calibration-message', 'Les deux bouts sont trop proches : écarte-les.');
    return;
  }
  calibrator.saisie = saisie.value.trim();
  saisie.classList.remove('erreur');
  msg.classList.remove('erreur');
  majSaisieCalibration();
  // Au doigt, on referme le clavier virtuel ; au clavier ou à la souris, le focus va au
  // bouton « Passer au pointage » (il ne retombe pas sur la page)
  if (typePointeur === 'tactile') saisie.blur();
  else document.getElementById('passer-pointage').focus();
  ecrire('calibration-message', '✅ ' + calibrator.texteLongueur() + ' pour ' + nombreFr(calibrator.pixelDistance, 1) + ' px : ' + calibrator.texteEchelle() + '.');
  annoncer('Échelle validée : ' + calibrator.texteEchelle());
  sauvegarderSeance();
}

// Après un glisser d'un bout : l'échelle suit (même longueur réelle)
function surEtalonnageDeplace() {
  majSaisieCalibration(true);
  sauvegarderSeance();
}

// Oublie l'échelle (changement de vidéo). Renvoie vrai s'il y en avait une.
function oublierEtalonnage() {
  const avait = calibrator && calibrator.isCalibrated;
  if (calibrator) calibrator.reset();
  const saisie = document.getElementById('real-distance');
  saisie.value = '';
  majSaisieCalibration(true);
  return avait;
}

function resetCalibration() {
  oublierEtalonnage();
  document.getElementById('real-distance').classList.remove('erreur');
  annoncer('Étalonnage effacé : pointe les deux bouts de l’objet.');
  sauvegarderSeance();
}

// La barre d'étalonnage reste visible pendant tout le mode (pas de saut de mise en page) ;
// la saisie n'est active qu'une fois les deux points placés.
function majSaisieCalibration(majMessage = true) {
  const barre = document.getElementById('calibration-input');
  barre.hidden = etat !== 'Calibration';
  const deuxPoints = calibrator.state === 'waiting_distance' || calibrator.state === 'calibrated';
  const saisie = document.getElementById('real-distance');
  saisie.disabled = !deuxPoints;
  // Le champ n'est jamais réécrit ici : l'élève doit pouvoir l'effacer et taper autre chose
  // Une fois l'échelle validée, « Valider » laisse sa place à « Pointer → »… sauf si la saisie change
  const aJour = calibrator.isCalibrated && saisie.value.trim() === (calibrator.saisie || calibrator.texteLongueur());
  const valider = document.getElementById('validate-calibration');
  valider.disabled = !deuxPoints;
  valider.hidden = aJour;
  document.getElementById('passer-pointage').hidden = !aJour;
  if (majMessage && document.activeElement !== saisie) {
    document.getElementById('calibration-message').classList.remove('erreur');
    ecrire('calibration-message', texteCalibrationParDefaut());
  }
}

// ---------------------------------------------------------------------------
// Sauvegarde de la séance dans sessionStorage
// ---------------------------------------------------------------------------
// Le travail survit à un rechargement de la page, mais pas à la fermeture de l'onglet :
// sur une tablette de classe partagée, l'élève suivant ne retrouve pas le travail du
// précédent (c'est pourquoi on n'utilise pas localStorage). Rien n'est envoyé nulle part.

const CLE_SEANCE = 'jsmecavideo-seance-v1';
let repriseEnAttente = false;

function sauvegarderSeance() {
  if (repriseEnAttente || source !== 'video' || !calibrator) return;
  try {
    const n = data.getTotalPointCount();
    if (n === 0 && !calibrator.point1) {
      sessionStorage.removeItem(CLE_SEANCE);
      return;
    }
    const o = {
      video: videoFiles[indexVideo].path,
      dims: dimensionsSource(),
      pas: imagesParPoint,
      etat: etat,
      data: data.serialiser(),
      calibrateur: calibrator.serialiser()
    };
    if (!o.dims) return;
    o.controle = empreinteSeance(o);
    sessionStorage.setItem(CLE_SEANCE, JSON.stringify(o));
  } catch (e) {
    // Stockage refusé (navigation privée, cadre restreint…) : on continue sans sauvegarde
  }
}

// Lit la sauvegarde ; une sauvegarde incohérente est ignorée (et effacée), jamais restaurée
// Empreinte simple (FNV-1a) du contenu de la sauvegarde
function empreinteSeance(o) {
  const texte = JSON.stringify([o.video, o.dims, o.pas, o.data, o.calibrateur]);
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function lireSeance() {
  let o = null;
  try {
    o = JSON.parse(sessionStorage.getItem(CLE_SEANCE) || 'null');
  } catch (e) {
    o = null;
  }
  if (!o) return null;
  if (seanceValide(o)) return o;
  try { sessionStorage.removeItem(CLE_SEANCE); } catch (e) { /* rien */ }
  return null;
}

function seanceValide(o) {
  if (typeof o !== 'object' || typeof o.video !== 'string') return false;
  const v = videoFiles.find(f => f.path === o.video);
  if (!v) return false;
  if ([1, 2, 5].indexOf(o.pas) < 0) return false;
  if (!Data.sauvegardeValide(o.data, v.images)) return false;
  if (!(o.dims && Number.isInteger(o.dims.w) && Number.isInteger(o.dims.h))) return false;
  // Empreinte : une sauvegarde modifiée à la main (autre vidéo, autres points) est ignorée
  if (o.controle !== empreinteSeance(o)) return false;
  const c = o.calibrateur;
  if (!c || typeof c !== 'object') return false;
  const pointOk = p => p === null || p === undefined || (typeof p === 'object' && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!pointOk(c.point1) || !pointOk(c.point2)) return false;
  if (c.state === 'calibrated') {
    if (!c.point1 || !c.point2 || !(c.realDistance > 0) || !Number.isFinite(c.realDistance)) return false;
    if (Math.hypot(c.point2.x - c.point1.x, c.point2.y - c.point1.y) < 1) return false;
  }
  return true;
}

// Au chargement : « Reprendre ton pointage ? » si une séance a été enregistrée
function proposerReprise() {
  const o = lireSeance();
  if (!o) return;
  const v = videoFiles.find(f => f.path === o.video);
  const n = (o.data && Array.isArray(o.data.points)) ? o.data.points.reduce((s, p) => s + (Array.isArray(p) ? p.length : 0), 0) : 0;
  const etalonne = o.calibrateur && o.calibrateur.state === 'calibrated';
  if (n === 0 && !etalonne) return;
  repriseEnAttente = true;
  demanderConfirmation('Reprendre ton pointage ? Vidéo « ' + v.titre + ' » : ' + (n === 1 ? '1 point' : n + ' points') +
    (etalonne ? ', étalonnage fait' : '') + '.',
    'Reprendre', 'Recommencer à zéro',
    () => { repriseEnAttente = false; restaurerSeance(o); },
    () => {
      repriseEnAttente = false;
      try { sessionStorage.removeItem(CLE_SEANCE); } catch (e) { /* rien */ }
    },
    false);
}

function restaurerSeance(o) {
  const i = videoFiles.findIndex(v => v.path === o.video);
  if (i < 0) return;
  chargerVideo(i);
  imagesParPoint = [1, 2, 5].indexOf(o.pas) >= 0 ? o.pas : 1;
  document.getElementById('choix-pas').value = String(imagesParPoint);
  if (!data.restaurer(o.data, videoFiles[i].images)) return;
  // Dimensions de l'image à comparer à celles de la vidéo chargée (sauvegarde d'une autre vidéo ?)
  dimsAVerifier = o.dims || null;
  document.getElementById('choix-mobiles').value = String(data.numMobiles);
  calibrator.restaurer(o.calibrateur);
  document.getElementById('real-distance').value = calibrator.isCalibrated ? (calibrator.saisie || calibrator.texteLongueur()) : '';
  passerAuMode(o.etat === 'Calibration' || o.etat === 'Graphique' ? o.etat : 'Pointage');
  annoncer('Pointage repris : ' + data.getTotalPointCount() + ' points.');
  sauvegarderSeance();
}
