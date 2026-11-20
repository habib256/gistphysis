/*
 * OptGeo web — interface, partie 6 : l'application (état, gestes, modes, menus,
 * fichiers, sauvegarde automatique, clavier).
 *
 * D'après OptGeo 3.03 de Jean-Marie Biansan (GNU GPL v2 ou ultérieure).
 *
 * Modèle d'interaction (SPEC-INTERFACE.md §12) : mode « Sélection » par défaut
 * (toucher un objet le choisit et montre ses poignées ; glisser une poignée),
 * modes d'OptGeo conservés (Déplacer, Propriétés, Dupliquer, Supprimer, Grouper)
 * avec un bouton « Terminer » ; création point par point (appuyer, viser avec la
 * loupe, relâcher) ; zoom et déplacement de la vue à deux doigts, à la molette,
 * ou en glissant dans une zone vide. Rien n'est envoyé à un serveur.
 */
(function () {
  'use strict';
  var OGW = window.OGW, OptGeo = window.OptGeo, el = OGW.el, $ = OGW.$, N = OGW.nombre;
  var MAX_PAR_TYPE = 500;

  var app = OGW.app = {
    scene: null, hist: null, nomFichier: null, modifie: false,
    mode: 'selection', creation: null, selection: null, groupeChoisi: null, choixGroupe: [],
    geste: null, pointeurs: {}, pincement: null,
    verrouH: false, verrouV: false, rester: false,
    modeNumeros: null, segmentSurligne: null, basculerFantome: null,
    imageFond: null, imageFondURL: null, prefs: OGW.stockage.lire('preferences') || {},
    panneau: null, loupeEtat: null, refus: null, derniereTape: null, infoGlisser: '', coordTexte: ''
  };

  /* ================================================================== */
  /* Scène, historique, sauvegarde                                       */
  /* ================================================================== */
  // 51 états mémorisés = l'état courant + 50 retours en arrière (maxannulation d'OptGeo, SPEC §7)
  var ETATS_HISTORIQUE = 51;
  app.remplacerScene = function (scene) {
    if (app.panneau) app.fermerPanneau();               // le panneau ne doit jamais viser un objet d'une autre scène
    app.scene = scene;
    app.hist = new OptGeo.Historique(scene, ETATS_HISTORIQUE);
    app.selection = null; app.groupeChoisi = null; app.choixGroupe = [];
    app.dessinateur.toutVoir();
    app.majInterface();
  };
  app.marquerModifie = function () { app.modifie = true; app.repriseEnAttente = false; app.sauvegarderBientot(); app.majTitre(); };
  /** Après chaque action annulable. */
  app.memoriser = function () {
    if (app.hist.memoriser()) app.marquerModifie();
    else app.sauvegarderBientot();
    app.verifierSelection();
    app.majInterface();
    app.dessinateur.demander();
  };
  /** Changement d'affichage (non annulable, comme OptGeo) : on met à jour l'état courant de l'historique. */
  app.majEtatCourant = function () {
    app.hist.pile[app.hist.position] = JSON.stringify(app.scene.versJSON());
    app.sauvegarderBientot();
  };
  app.changerOptions = function (c, annulable) {
    var r = app.scene.modifierOptions(c);
    if (!r.ok) { OGW.message(r.erreur); return r; }
    if (annulable) app.memoriser(); else { app.majEtatCourant(); app.marquerModifie(); app.majInterface(); }
    app.dessinateur.demander();
    return r;
  };
  app.verifierSelection = function () {
    if (app.selection && !app.scene.objet(app.selection)) app.selection = null;
    if (app.groupeChoisi !== null && !app.scene.groupes[app.groupeChoisi]) app.groupeChoisi = null;
    app.choixGroupe = app.choixGroupe.filter(function (id) { return app.scene.objet(id); });
  };
  /**
   * Options d'affichage, non annulables dans OptGeo (SPEC §7 : « Changer l'affichage (normales,
   * grille, zoom) n'est pas annulable ») : Annuler et Refaire ne touchent qu'à la scène, ces
   * options gardent leur valeur du moment.
   */
  var OPTIONS_AFFICHAGE = ['optionnormale', 'optionangles', 'epaisseurnormale', 'pourcentagenormale', 'couleurnormale', 'decimalesangles',
    'tracergrille', 'attractiongrille', 'grillex', 'grilley', 'afficher_longueurs_segments', 'desactiverControle'];
  function sansToucherAffichage(f) {
    var o = app.scene.options, garde = {};
    OPTIONS_AFFICHAGE.forEach(function (k) { if (o[k] !== undefined) garde[k] = o[k]; });
    var espace = [o.xxmin, o.xxmax, o.yymin, o.yymax].join();
    if (!f()) return false;
    var o2 = app.scene.options, diff = {}, n = 0;
    // le pas de la grille suit l'espace de travail (mis à l'échelle avec lui) : si l'annulation change
    // l'espace de travail, on reprend aussi le pas de l'état restauré
    if ([o2.xxmin, o2.xxmax, o2.yymin, o2.yymax].join() !== espace) { delete garde.grillex; delete garde.grilley; }
    Object.keys(garde).forEach(function (k) { if (o2[k] !== garde[k]) { diff[k] = garde[k]; n++; } });
    if (n) { app.scene.modifierOptions(diff); app.hist.pile[app.hist.position] = JSON.stringify(app.scene.versJSON()); }
    return true;
  }
  app.annuler = function () {
    if (app.geste) app.annulerGeste();
    if (sansToucherAffichage(function () { return app.hist.annuler(); })) { app.modifie = true; app.verifierSelection(); app.sauvegarderBientot(); app.majInterface(); app.dessinateur.demander(); }
  };
  app.retablir = function () {
    if (sansToucherAffichage(function () { return app.hist.retablir(); })) { app.modifie = true; app.verifierSelection(); app.sauvegarderBientot(); app.majInterface(); app.dessinateur.demander(); }
  };

  /*
   * Sauvegarde automatique : la scène seule (texte JSON de quelques kilo-octets), jamais l'image
   * de fond. Le stockage local est partagé par tout le site (favoris des élèves…) : une image de
   * plusieurs mégaoctets pourrait saturer le quota. Si l'écriture échoue, un message le dit.
   */
  var minuterieSauvegarde = null, echecSauvegarde = false;
  app.sauvegarderBientot = function () {
    clearTimeout(minuterieSauvegarde);
    minuterieSauvegarde = setTimeout(app.sauvegarderLocal, 400);
  };
  app.sauvegarderLocal = function () {
    clearTimeout(minuterieSauvegarde);
    if (!app.scene) return false;
    // question « Reprendre le travail en cours ? » sans réponse : la scène affichée n'est que la scène
    // vide du démarrage, elle ne doit jamais remplacer la sauvegarde (page quittée, rechargée, cachée…)
    if (app.repriseEnAttente) return false;
    var d = { v: 2, date: Date.now(), nom: app.nomFichier, modifie: app.modifie, scene: app.scene.versJSON() };
    var ok = OGW.stockage.ecrire('travail', d);
    if (!ok && !echecSauvegarde) app.signaler('Sauvegarde automatique impossible sur cet appareil (mémoire du navigateur pleine ou bloquée). Pensez à enregistrer la simulation (Menu › Enregistrer).', 'erreur');
    echecSauvegarde = !ok;
    return ok;
  };

  app.parametresParDefaut = function (type) {
    var p = JSON.parse(JSON.stringify(app.prefs[type] || {}));
    if (OptGeo.estSource(type) && p.couleur !== undefined && !OGW.COULEURS_RAYON.some(function (c) { return c.v === p.couleur; })) delete p.couleur;
    return p;
  };
  app.ajouterObjet = function (type, p) {
    if (app.scene.objetsDuType(type).length >= MAX_PAR_TYPE) return { ok: false, erreur: 'Nombre maximal de ' + (OGW.NOMS[type] || type).toLowerCase() + ' déjà atteint !' };
    var r = app.scene.ajouter(type, p);
    if (r.ok && !OGW.valeursFinies(app.scene.geometrie(r.id))) { app.scene.supprimer(r.id); r = { ok: false, erreur: ERREUR_NON_CALCULABLE }; }
    if (r.ok) app.memoriser();
    return r;
  };
  // garde-fou : un objet accepté par le moteur mais dont la géométrie déborde des nombres
  // (rayon de courbure de 1e308…) serait impossible à dessiner et finirait dans la sauvegarde
  var ERREUR_NON_CALCULABLE = 'valeurs trop grandes : l’élément ne peut pas être calculé';
  app.modifierObjet = function (id, p) {
    var avant = app.scene.versJSON();
    var r = app.scene.modifier(id, p);
    if (r.ok && !OGW.valeursFinies(app.scene.geometrie(id))) { app.scene.restaurer(avant); r = { ok: false, erreur: ERREUR_NON_CALCULABLE }; }
    if (r.ok) app.memoriser();
    return r;
  };
  app.supprimer = function (id) {
    var nom = OGW.nomObjet(app.scene, id);
    if (!app.scene.supprimer(id)) return;
    if (app.selection === id) app.selection = null;
    app.memoriser();
    app.signaler(nom + ' supprimé.', null, { texte: 'Annuler', action: app.annuler });
  };
  app.dupliquer = function (id) {
    var o = app.scene.options, d = (o.xxmax - o.xxmin) * 0.05;
    var r = app.scene.dupliquer(id, d, -d);
    if (!r.ok) r = app.scene.dupliquer(id, -d, d);
    if (!r.ok) r = app.scene.dupliquer(id, 0, 0);
    if (!r.ok) { app.signaler('Duplication impossible : ' + r.erreur, 'erreur'); return; }
    app.selection = r.id; app.groupeChoisi = null;
    app.memoriser();
    app.signaler('Copie créée, décalée : faites-la glisser où vous voulez.');
  };
  app.selectionner = function (id) { app.selection = id; app.groupeChoisi = null; app.majInterface(); app.dessinateur.demander(); };
  app.pixelsEnMonde = function (n) { return app.dessinateur.vue().pixelsEnMonde(n); };

  /* ================================================================== */
  /* Fichiers                                                            */
  /* ================================================================== */
  function siModifie(suite) {
    if (!app.modifie || !app.scene.objets.length) { suite(); return; }
    OGW.confirmer('La simulation a été modifiée et les modifications n’ont pas été enregistrées. Voulez-vous vraiment continuer ?', suite, { titre: 'Attention' });
  }
  app.siModifie = siModifie;
  app.nouvelleSimulation = function (c, sansSauvegarde) {
    var lw = c.xxmax - c.xxmin, lh = c.yymax - c.yymin;
    var o = OptGeo.optionsParDefaut(lw, lh);
    Object.keys(c).forEach(function (k) { o[k] = c[k]; });
    var s = new OptGeo.Scene(o);
    app.nomFichier = null; app.modifie = false;
    app.definirImageFond(null, true);
    app.remplacerScene(s);
    if (!sansSauvegarde) { app.repriseEnAttente = false; app.sauvegarderLocal(); }
  };
  app.ouvrirTexteOpt = function (texte, nom, commentaire, extra) {
    var r;
    if (!OGW.texteOptValide(texte)) { OGW.message(OGW.MESSAGE_PAS_OPT, 'Fichier non reconnu'); return false; }
    var coupe = OGW.texteOptTronque(texte);
    if (coupe) { OGW.message(OGW.messageOptTronque(coupe), 'Fichier incomplet'); return false; }
    try { r = OptGeo.lireOpt(texte); } catch (e) {
      OGW.message('Fichier endommagé ou incomplet (' + e.message + '). Rien n’a été ouvert ; la simulation en cours est conservée.', 'Fichier endommagé');
      return false;
    }
    r.scene.commentaire = commentaire || '';
    app.nomFichier = nom; app.modifie = false;
    app.definirImageFond(null, true);
    app.remplacerScene(r.scene);
    // extra.proteger : exemple demandé par l'adresse alors qu'un travail est sauvegardé ; la sauvegarde
    // n'est remplacée qu'à la première modification (marquerModifie) ou par un choix explicite
    if (extra && extra.proteger) app.repriseEnAttente = true;
    else { app.repriseEnAttente = false; app.sauvegarderLocal(); }
    var av = (r.avertissements || []).concat(r.nonPrisEnCharge && r.nonPrisEnCharge.length ? ['Non pris en charge : ' + r.nonPrisEnCharge.join(', ')] : []);
    if (av.length) app.signaler('Fichier ouvert avec ' + av.length + ' avertissement(s) : ' + av.slice(0, 3).join(' ; '), 'erreur');
    else app.signaler((extra && extra.exemple ? 'Exemple ouvert : ' : 'Fichier ouvert : ') + nom);
    if (r.scene.commentaire.trim()) OGW.panneauCommentaire(app);
  };
  app.enregistrer = function () {
    if (app.nomFichier) app.enregistrerSous(app.nomFichier);
    else OGW.dialogueEnregistrer(app);
  };
  app.enregistrerSous = function (nom) {
    var texte = OptGeo.ecrireOpt(app.scene);
    OGW.telecharger(new Blob([OptGeo.versOctets(texte, 'utf-8')], { type: 'application/octet-stream' }), nom);
    if (app.scene.commentaire && app.scene.commentaire.trim()) {
      var c = app.scene.commentaire.replace(/\r?\n/g, '\r\n');
      setTimeout(function () { OGW.telecharger(new Blob([OptGeo.versOctets(c, 'utf-8')], { type: 'text/plain' }), nom.replace(/\.opt$/i, '') + '.txt'); }, 600);
    }
    app.nomFichier = nom; app.modifie = false;
    app.sauvegarderLocal(); app.majTitre();
    app.signaler('Simulation enregistrée : ' + nom + ' (dossier des téléchargements).');
  };
  app.exporterPNG = function (nom) {
    var c = OGW.canevasExport(app.scene, app.imageFond, 1000, 2);
    c.toBlob(function (b) { if (b) { OGW.telecharger(b, nom); app.signaler('Image PNG exportée : ' + nom); } else app.signaler('Export PNG impossible.', 'erreur'); }, 'image/png');
  };
  app.exporterSVG = function (nom) {
    var s = OGW.svgExport(app.scene, app.imageFond, app.nomFichier || 'Simulation OptGeo');
    OGW.telecharger(new Blob([s], { type: 'image/svg+xml' }), nom);
    app.signaler('Dessin SVG exporté : ' + nom);
  };
  app.imprimer = function () {
    var zone = $('#impression');
    OGW.vider(zone);
    var svg = OGW.svgExport(app.scene, app.imageFond, app.nomFichier || 'Simulation OptGeo').replace(/^<\?xml[^>]*>\s*/, '');
    zone.appendChild(el('h1', { texte: app.nomFichier || 'Simulation OptGeo' }));
    zone.appendChild(el('div', { class: 'dessin-imprime', html: svg }));
    if (app.scene.commentaire && app.scene.commentaire.trim()) zone.appendChild(el('pre', { texte: app.scene.commentaire }));
    window.print();
  };
  app.copierImage = function () {
    var c = OGW.canevasExport(app.scene, app.imageFond, 1000, 2);
    c.toBlob(function (b) {
      try {
        navigator.clipboard.write([new window.ClipboardItem({ 'image/png': b })]).then(function () { app.signaler('Image copiée dans le presse-papiers.'); },
          function () { app.signaler('Copie impossible ici : utilisez l’export PNG.', 'erreur'); });
      } catch (e) { app.signaler('Copie impossible ici : utilisez l’export PNG.', 'erreur'); }
    }, 'image/png');
  };
  app.copiePossible = function () { return !!(window.isSecureContext && navigator.clipboard && navigator.clipboard.write && window.ClipboardItem); };
  app.definirImageFond = function (url, silencieux) {
    app.imageFondURL = url || null;
    if (!url) { app.imageFond = null; if (!silencieux) app.dessinateur.demander(); return; }
    var img = new Image();
    img.onload = function () {
      app.imageFond = img; app.dessinateur.demander();
      if (!silencieux) app.signaler('Image de fond affichée. Elle n’est enregistrée ni dans le fichier .opt ni sur l’appareil : après un rechargement de la page, il faudra la choisir de nouveau.');
    };
    img.onerror = function () { app.signaler('Image illisible.', 'erreur'); };
    img.src = url;
  };
  app.ouvrirAide = function (page) {
    var w = window.open('aide/' + (page || 'index.html'), '_blank');
    if (!w) location.href = 'aide/' + (page || 'index.html');
  };

  /* ================================================================== */
  /* Modes                                                               */
  /* ================================================================== */
  var NOMS_MODES = {
    deplacer: 'Mode : déplacement d’un élément existant.', proprietes: 'Mode : propriétés d’un élément existant.',
    dupliquer: 'Mode : duplication d’un élément existant.', supprimer: 'Mode : suppression d’un élément existant.',
    grouper: 'Mode : ajout d’un groupe.'
  };
  app.changerMode = function (m) {
    if (app.geste) app.annulerGeste();
    if (app.creation) app.terminerCreation(true);
    if (m !== 'selection' && m !== 'grouper' && !app.scene.objets.length) { app.signaler('Aucun élément dans la simulation.'); m = 'selection'; }
    if (app.mode === m && m !== 'selection') m = 'selection';
    if (m === 'grouper') app.choixGroupe = app.selection ? [app.selection] : [];
    if (m !== app.mode) app.verrouH = app.verrouV = false;
    app.mode = m;
    if (m !== 'selection') app.groupeChoisi = null;
    app.majInterface(); app.dessinateur.demander();
  };
  app.terminerMode = function () {
    if (app.mode === 'grouper') {
      var ids = app.choixGroupe.slice();
      app.choixGroupe = []; app.mode = 'selection';
      if (ids.length >= 2) {
        app.scene.grouper(ids); app.memoriser();
        OGW.message('Le groupe n° ' + app.scene.groupes.length + ' vient d’être créé. Ses éléments pourront être translatés ensemble.', 'Groupe créé');
      } else if (ids.length) app.signaler('Il faut au moins deux éléments pour faire un groupe.', 'erreur');
    }
    app.mode = 'selection'; app.verrouH = app.verrouV = false;
    app.majInterface(); app.dessinateur.demander();
  };
  app.toutGrouper = function () {
    var ids = app.scene.objets.map(function (o) { return o.id; });
    if (ids.length < 2) { app.signaler('Il faut au moins deux éléments pour faire un groupe.', 'erreur'); return; }
    OGW.confirmer('Dois-je créer le groupe n° ' + (app.scene.groupes.length + 1) + ' en y mettant tous les éléments présents ?', function () {
      app.scene.grouper(ids); app.memoriser();
      app.signaler('Un nouveau groupe contenant tous les éléments vient d’être créé.');
    });
  };
  app.supprimerTout = function () {
    if (!app.scene.objets.length) return;
    OGW.confirmer('Êtes-vous certain(e) de vouloir supprimer tous les éléments ?', function () {
      app.scene.objets.slice().forEach(function (o) { app.scene.supprimer(o.id); });
      app.selection = null; app.memoriser();
      app.signaler('Tous les éléments ont été supprimés.', null, { texte: 'Annuler', action: app.annuler });
    }, { danger: true, oui: 'Tout supprimer' });
  };
  app.degrouper = function (id) {
    var gs = app.groupeChoisi !== null ? [app.groupeChoisi] : app.scene.groupesDe(id);
    if (!gs.length) return;
    gs.sort(function (a, b) { return b - a; }).forEach(function (i) { app.scene.degrouper(i); });
    app.groupeChoisi = null; app.memoriser();
    app.signaler('Groupe dissocié : les éléments restent en place.');
  };

  /* --- création --- */
  app.demarrerCreation = function (idOutil) {
    if (idOutil === '*fantomes') { app.changerMode('selection'); OGW.panneauFantomes(app); return; }
    if (idOutil === '*commentaire') { OGW.panneauCommentaire(app); return; }
    var outil = OGW.OUTILS[idOutil];
    if (!outil) return;
    if (app.scene.objetsDuType(outil.type).length >= MAX_PAR_TYPE) { OGW.message('Nombre maximal de ' + (OGW.NOMS[outil.type] || '').toLowerCase() + ' déjà atteint !'); return; }
    app.changerMode('selection');
    app.selection = null;
    app.coordTexte = '';                         // pas de coordonnées d'un geste précédent dans le bandeau
    app.verrouH = app.verrouV = false;           // « Aligner » ne vaut que pour la construction en cours
    var c = new OGW.Creation(app, outil);
    c.preparer(function () { app.creation = c; app.mode = 'creation'; app.majInterface(); app.dessinateur.demander(); },
      function () { app.terminerCreation(); });
  };
  app.terminerCreation = function (silencieux) {
    app.creation = null; app.loupeEtat = null; app.loupe.cacher(); app.coordTexte = '';
    app.verrouH = app.verrouV = false;
    if (app.mode === 'creation') app.mode = 'selection';
    if (!silencieux) { app.majInterface(); app.dessinateur.demander(); }
  };
  app.apresEtape = function (r) {
    if (!r) return;
    if (r.etat === 'refus') { app.signaler(r.erreur, 'erreur'); app.majInterface(); return; }
    if (r.etat === 'attente') { app.majInterface(); return; }
    if (r.etat === 'suite') { app.majInterface(); app.dessinateur.demander(); return; }
    // fin
    var outil = app.creation && app.creation.outil;
    app.terminerCreation();
    if (r.erreur) { OGW.message(r.erreur); return; }
    if (r.id) {
      app.selection = r.id;
      if (r.ensuite === 'proprietes') OGW.Proprietes.ouvrir(app, app.scene.objet(r.id).type, r.id);
      else if (app.rester && outil) app.demarrerCreation(outil.id);
    }
    app.majInterface(); app.dessinateur.demander();
  };
  /** Menu Ajouter : création par coordonnées (panneau des propriétés pré-rempli). */
  app.ajouterParCoordonnees = function (type, extra) {
    if (app.scene.objetsDuType(type).length >= MAX_PAR_TYPE) { OGW.message('Nombre maximal déjà atteint !'); return; }
    app.changerMode('selection');
    var o = app.scene.options, cx = (o.xxmin + o.xxmax) / 2, cy = (o.yymin + o.yymax) / 2;
    var p = Object.assign({}, OptGeo.types[type].defauts, OptGeo.objetParDefaut(app.scene, type, cx, cy), app.parametresParDefaut(type), extra || {});
    if (OptGeo.estMilieu(type)) Object.assign(p, OGW.INDICES_DEFAUT, { reflechientrant: 2, reflechisortant: 2 });
    if (type === 'sourceponctuelle' && p.sourcevirtuelle) p.vav = '(1)';
    OGW.Proprietes.ouvrir(app, type, null, p);
  };

  /* ================================================================== */
  /* Panneau latéral (propriétés, coordonnées, fantômes, commentaire)    */
  /* ================================================================== */
  app.ouvrirPanneau = function (o) {
    if (app.panneau) app.fermerPanneau();
    var p = $('#panneau');
    $('#panneau-titre').textContent = o.titre;
    var corps = OGW.vider($('#panneau-corps'));
    corps.appendChild(o.corps);
    var pied = OGW.vider($('#panneau-pied'));
    (o.boutons || []).forEach(function (b) {
      var bt = el('button', { type: 'button', class: (b.principal ? 'principal ' : '') + (b.classe || ''), html: (b.icone ? OGW.icone(b.icone) : '') + '<span></span>' });
      bt.querySelector('span').textContent = b.texte;
      bt.addEventListener('click', function () { if (b.action) b.action(); });
      pied.appendChild(bt);
    });
    p.classList.toggle('large', !!o.large);
    p.hidden = false;
    document.body.classList.add('panneau-ouvert');
    document.body.classList.toggle('panneau-large', !!o.large);
    app.panneau = o;
    corps.scrollTop = 0;
    app.majRetrait();
    app.majInterface();
  };
  /**
   * Le dessin se recentre dans la partie que le panneau laisse visible. Le bandeau de consigne,
   * lui, est posé par-dessus le dessin sans le décaler : un point du dessin ne bouge jamais sous
   * le doigt quand le bandeau apparaît, change de hauteur ou disparaît.
   */
  app.majRetrait = function () {
    var p = $('#panneau'), z = $('#zone');
    if (p.hidden) { app.dessinateur.definirRetrait(0, 0); return; }
    var r = p.getBoundingClientRect(), rz = z.getBoundingClientRect();
    if (r.top > rz.top + 10) app.dessinateur.definirRetrait(0, Math.max(0, rz.bottom - r.top));
    else app.dessinateur.definirRetrait(Math.max(0, rz.right - r.left), 0);
  };
  /**
   * Hauteur que prend le bandeau d'une construction à la largeur actuelle (consigne la plus longue
   * des outils, boutons « Aligner… », « Rester dans ce mode », « Plus », « Annuler ») : le cadrage
   * « Tout voir » la réserve en haut (Dessinateur.haut). Mesurée sur le vrai bandeau, rempli un
   * instant puis remis tel quel (sans affichage entre les deux).
   */
  var consigneEssai = null;
  app.mesurerReserveBandeau = function () {
    var b = $('#bandeau'), txt = $('#bandeau-texte'), bt = $('#bandeau-boutons');
    if (consigneEssai === null) {
      consigneEssai = '';
      Object.keys(OGW.OUTILS).forEach(function (k) {
        var o = OGW.OUTILS[k];
        (o.consignes || []).forEach(function (c) { var x = 'Mode : ' + o.mode + '. ' + c; if (x.length > consigneEssai.length) consigneEssai = x; });
      });
    }
    var avant = { cache: b.hidden, texte: txt.textContent, deplie: b.classList.contains('deplie'), enfants: Array.prototype.slice.call(bt.childNodes) };
    avant.enfants.forEach(function (n) { bt.removeChild(n); });
    [['Aligner horizontalement', 'secondaire'], ['Aligner verticalement', 'secondaire'], ['Plus', 'deplier'], ['Annuler', 'principal']].forEach(function (d) {
      bt.appendChild(el('button', { type: 'button', class: d[1], texte: d[0] }));
    });
    bt.insertBefore(el('label', { class: 'rester secondaire' }, [el('input', { type: 'checkbox' }), 'Rester dans ce mode']), bt.lastChild);
    txt.textContent = consigneEssai;
    b.classList.remove('deplie'); b.style.visibility = 'hidden'; b.hidden = false;
    var h = Math.ceil(b.getBoundingClientRect().height);
    b.hidden = avant.cache; b.style.visibility = ''; b.classList.toggle('deplie', avant.deplie);
    txt.textContent = avant.texte;
    while (bt.firstChild) bt.removeChild(bt.firstChild);
    avant.enfants.forEach(function (n) { bt.appendChild(n); });
    return h;
  };
  /** Portrait : panneau sur la moitié de la hauteur (la scène reste visible), ou agrandi aux 7/8. */
  app.basculerTaillePanneau = function (agrandi) {
    var p = $('#panneau'), b = $('[data-action="taille-panneau"]');
    agrandi = agrandi === undefined ? !p.classList.contains('agrandi') : !!agrandi;
    p.classList.toggle('agrandi', agrandi);
    b.setAttribute('aria-pressed', String(agrandi));
    b.setAttribute('aria-label', agrandi ? 'Réduire le panneau' : 'Agrandir le panneau'); b.title = b.getAttribute('aria-label');
    app.majRetrait(); app.dessinateur.demander();
  };
  app.fermerPanneau = function () {
    var o = app.panneau;
    if (!o) return;
    app.panneau = null;
    app.basculerTaillePanneau(false);
    $('#panneau').hidden = true;
    document.body.classList.remove('panneau-ouvert', 'panneau-large');
    app.majRetrait();
    OGW.vider($('#panneau-corps'));
    if (o.surFermeture) o.surFermeture();
    app.majInterface(); app.dessinateur.demander();
  };
  app.ouvrirProprietes = function (id) {
    var o = app.scene.objet(id);
    if (o) OGW.Proprietes.ouvrir(app, o.type, id);
  };

  /* ================================================================== */
  /* Messages (bandeau et bulles)                                        */
  /* ================================================================== */
  var minuterieMessage = null;
  app.signaler = function (texte, type, action) {
    var m = $('#message');
    OGW.vider(m);
    m.className = 'message' + (type === 'erreur' ? ' erreur' : '');
    m.appendChild(el('span', { texte: texte }));
    if (action) m.appendChild(el('button', { type: 'button', texte: action.texte, onclick: function () { m.hidden = true; action.action(); } }));
    m.hidden = false;
    clearTimeout(minuterieMessage);
    minuterieMessage = setTimeout(function () { m.hidden = true; }, action ? 6000 : (type === 'erreur' ? 5000 : 3500));
  };

  app.majTitre = function () {
    var t = (app.nomFichier || 'Nouvelle simulation') + (app.modifie && app.scene.objets.length ? ' (modifiée)' : '');
    $('#titre-simulation').textContent = t;
    var o = app.scene.options;
    $('#titre-simulation').title = 'Espace de travail : horizontal [' + N(o.xxmin) + ' ; ' + N(o.xxmax) + '], vertical [' + N(o.yymin) + ' ; ' + N(o.yymax) + '] ' + o.unitelongueur;
  };

  /*
   * Bandeau de consigne, posé par-dessus le haut du dessin (il ne le décale pas).
   * Les boutons ne sont recréés que si la liste des boutons change : pendant un glisser,
   * le texte change à chaque image mais les boutons restent les mêmes éléments, donc un
   * toucher (appui puis lever sur le même bouton) est toujours reçu.
   * Petit écran : une ligne, les boutons secondaires derrière « Plus ».
   */
  var cleBandeau = null, bandeauDeplie = false;
  /**
   * Un deuxième doigt (pointeur non principal, posé pendant qu'un premier doigt glisse) ne produit
   * pas de « click » : on agit alors à son lever, s'il a été posé sur ce même bouton.
   */
  function brancherBoutonBandeau(x) {
    var fait = 0;
    x.addEventListener('pointerdown', function (e) { if (!e.isPrimary) x._appui = e.pointerId; });
    x.addEventListener('pointerup', function (e) {
      if (e.isPrimary || x._appui !== e.pointerId) return;
      x._appui = null; fait = performance.now();
      if (x._action) x._action();
    });
    x.addEventListener('click', function () { if (performance.now() - fait < 600) return; if (x._action) x._action(); });
  }
  /**
   * « Bloquer » touché pendant un glisser : l'objet est bloqué là où il est à cet instant (pas à sa
   * position de départ, sinon il sauterait). Armé avant le glisser (mode Déplacer) : position de départ.
   */
  function basculerVerrou(cote) {
    return function () {
      if (cote === 'h') app.verrouH = !app.verrouH; else app.verrouV = !app.verrouV;
      var g = app.geste;
      if (g && (g.kind === 'poignee' || g.kind === 'corps' || g.kind === 'groupe')) {
        var c = positionGlissee(g);
        if (c && cote === 'h' && app.verrouH) g.refY = c.y;
        if (c && cote === 'v' && app.verrouV) g.refX = c.x;
      }
      app.majBandeau();
    };
  }
  app.majBandeau = function () {
    var b = $('#bandeau'), txt = $('#bandeau-texte'), bt = $('#bandeau-boutons');
    var lignes = [], m = app.mode, items = [];
    function bouton(t, f, o) { o = o || {}; items.push({ k: 'b', t: t, f: f, cls: o.cls || '', aria: o.aria, sec: !!o.sec }); }
    var glisser = app.geste && (app.geste.kind === 'poignee' || app.geste.kind === 'corps' || app.geste.kind === 'groupe');
    if (app.geste && app.infoGlisser) lignes.push(app.infoGlisser);
    if (m === 'creation' && app.creation) {
      var c = app.creation;
      lignes.unshift('Mode : ' + c.outil.mode + '. ' + c.consigne());
      if (c.precedent()) {
        bouton('Aligner horizontalement', basculerVerrou('h'), { cls: 'bascule', aria: app.verrouH, sec: true });
        bouton('Aligner verticalement', basculerVerrou('v'), { cls: 'bascule', aria: app.verrouV, sec: true });
      }
      if (c.type === 'polyhedre' && c.points.length >= 3) bouton('Fermer le polygone', function () { c.data.n = c.points.length; app.apresEtape(c.terminer()); });
      items.push({ k: 'rester', t: 'Rester dans ce mode', sec: true });
      bouton('Annuler', function () { app.terminerCreation(); }, { cls: 'principal' });
    } else if (m !== 'selection') {
      var consignes = {
        deplacer: 'Faites glisser une poignée : croix verte = déplacer, cercle bleu = déplacer ce point, disque rouge = tourner, croix cyan = foyer ou centre.',
        proprietes: 'Touchez l’élément dont vous voulez les propriétés.', dupliquer: 'Touchez l’élément à dupliquer.',
        supprimer: 'Touchez l’élément à supprimer.',
        grouper: 'Touchez les éléments à grouper (' + app.choixGroupe.length + ' choisi' + (app.choixGroupe.length > 1 ? 's' : '') + '), puis « Terminer ».'
      };
      lignes.unshift(NOMS_MODES[m] + ' ' + consignes[m]);
      // mode Déplacer : « Bloquer » s'arme avant le glisser (un seul doigt suffit) et vaut pour ce seul glisser
      if (m === 'deplacer' && !glisser) {
        bouton('Bloquer horizontalement', basculerVerrou('h'), { cls: 'bascule', aria: app.verrouH, sec: true });
        bouton('Bloquer verticalement', basculerVerrou('v'), { cls: 'bascule', aria: app.verrouV, sec: true });
      }
      if (m === 'grouper') bouton('Annuler', function () { app.choixGroupe = []; app.mode = 'selection'; app.majInterface(); app.dessinateur.demander(); });
      bouton(m === 'dupliquer' || m === 'supprimer' ? 'Annuler' : 'Terminer', function () { app.terminerMode(); }, { cls: 'principal' });
    } else if (app.modeNumeros === 'fantomes') {
      lignes.unshift('Touchez un segment de rayon pour le cacher ou le montrer.');
    } else if (app.derniereTape && app.derniereTape.candidats.length > 1 && app.selection) {
      lignes.unshift((app.derniereTape.index + 1) + ' sur ' + app.derniereTape.candidats.length + ' éléments ici : touchez encore au même endroit pour passer au suivant.');
    }
    if (glisser) {      // pendant le glisser : toujours visibles (un deuxième doigt peut les toucher)
      bouton('Bloquer horizontalement', basculerVerrou('h'), { cls: 'bascule', aria: app.verrouH });
      bouton('Bloquer verticalement', basculerVerrou('v'), { cls: 'bascule', aria: app.verrouV });
    }
    if (app.verrouH || app.verrouV) lignes.push((m === 'creation' ? 'Alignement ' : 'Bloqué : ') + (app.verrouH && app.verrouV ? 'horizontal et vertical' : app.verrouH ? 'horizontal' : 'vertical'));
    if (app.coordTexte && (m === 'creation' || app.geste)) lignes.push(app.coordTexte);
    var texte = lignes.join(' — ');
    if (txt.textContent !== texte) txt.textContent = texte;
    // boutons : recréés seulement si leur liste change ; sinon, état et action mis à jour sur place
    var cle = items.map(function (i) { return i.k + ':' + i.t + ':' + i.cls + ':' + i.sec; }).join('|');
    if (cle !== cleBandeau) {
      cleBandeau = cle;
      OGW.vider(bt);
      items.forEach(function (i) {
        var x;
        if (i.k === 'rester') {
          x = el('label', { class: 'rester' }, [el('input', { type: 'checkbox', onchange: function (e) { app.rester = e.target.checked; } }), i.t]);
        } else {
          x = el('button', { type: 'button', class: i.cls });
          x.textContent = i.t;
          brancherBoutonBandeau(x);
        }
        if (i.sec) x.classList.add('secondaire');
        bt.appendChild(x);
      });
      var plus = el('button', { type: 'button', class: 'deplier', 'aria-expanded': 'false', texte: 'Plus' });
      plus.addEventListener('click', function () { bandeauDeplie = !bandeauDeplie; app.majBandeau(); });
      bt.insertBefore(plus, bt.querySelector('.principal'));
    }
    var elems = bt.children, j = 0;
    items.forEach(function (i) {
      var x = elems[j++];
      if (x && x.classList.contains('deplier')) x = elems[j++];
      if (!x) return;
      if (i.k === 'rester') { x.querySelector('input').checked = app.rester; return; }
      x._action = i.f;
      if (i.aria !== undefined) x.setAttribute('aria-pressed', String(!!i.aria)); else x.removeAttribute('aria-pressed');
    });
    var visible = !!(lignes.length || items.length);
    if (!visible) bandeauDeplie = false;
    b.classList.toggle('deplie', bandeauDeplie);
    var bp = bt.querySelector('.deplier');
    if (bp) { bp.setAttribute('aria-expanded', String(bandeauDeplie)); bp.textContent = bandeauDeplie ? 'Moins' : 'Plus'; }
    b.hidden = !visible;
  };

  /** État des boutons, barre contextuelle, cases d'affichage, titre. */
  app.majInterface = function () {
    if (!app.scene) return;
    // panneau des propriétés toujours fidèle à la scène (glisser, annuler, refaire…) ; fermé si l'objet n'existe plus
    if (app.panneau && app.panneau.rafraichir && !app.geste) app.panneau.rafraichir();
    $('[data-action="annuler"]').disabled = !app.hist.peutAnnuler();
    $('[data-action="refaire"]').disabled = !app.hist.peutRetablir();
    OGW.$$('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(app.mode === b.getAttribute('data-mode'))); });
    var o = app.scene.options;
    OGW.$$('[data-option]').forEach(function (b) {
      var v = !!o[b.getAttribute('data-option')];
      if (b.type === 'checkbox') b.checked = v; else b.setAttribute('aria-checked', String(v));
    });
    OGW.$$('[data-zoom]').forEach(function (b) { b.setAttribute('aria-pressed', String(Math.abs(app.dessinateur.zoom - +b.getAttribute('data-zoom')) < 1e-9)); });
    // barre contextuelle
    var ctxBar = $('#barre-contexte'), sel = app.selection && app.scene.objet(app.selection);
    var visible = app.mode === 'selection' && !app.creation && !app.panneau && (sel || app.groupeChoisi !== null) && !app.geste;
    ctxBar.hidden = !visible;
    if (visible) {
      $('#contexte-nom').textContent = sel ? OGW.nomObjet(app.scene, app.selection) : 'Groupe n° ' + (app.groupeChoisi + 1);
      ctxBar.title = $('#contexte-nom').textContent;           // nom en infobulle quand il est caché (faible hauteur)
      ctxBar.setAttribute('aria-label', 'Sélection : ' + ctxBar.title);
      var dansGroupe = sel ? app.scene.groupesDe(app.selection).length > 0 : true;
      $('[data-ctx="proprietes"]').hidden = !sel; $('[data-ctx="dupliquer"]').hidden = !sel; $('[data-ctx="supprimer"]').hidden = !sel;
      $('[data-ctx="grouper"]').hidden = !sel; $('[data-ctx="degrouper"]').hidden = !dansGroupe;
    }
    app.majBandeau();
    placerBarreContexte();
    app.majTitre();
  };

  /**
   * Barre de sélection : en bas du dessin, ou en haut (sous le bandeau) si elle couvrirait davantage
   * l'objet choisi et ses poignées en bas. La bulle de message se place au-dessus d'elle.
   */
  function pointsSelection() {
    var s = app.scene, vue = app.dessinateur.vue(), pts = [];
    var ids = app.selection && s.objet(app.selection) ? [app.selection] : (app.groupeChoisi !== null && s.groupes[app.groupeChoisi] ? s.groupes[app.groupeChoisi].membres : []);
    ids.forEach(function (id) {
      OGW.Poignees.liste(s, id).forEach(function (h) { pts.push(vue.versEcran(h.x, h.y)); });
      if (app.groupeChoisi !== null) { var r = OGW.Poignees.reference(s, id); pts.push(vue.versEcran(r.x, r.y)); }
    });
    return pts;
  }
  function placerBarreContexte() {
    var barre = $('#barre-contexte'), zone = $('#zone');
    if (barre.hidden) { zone.style.removeProperty('--bas-message'); return; }
    var rz = zone.getBoundingClientRect(), bd = $('#bandeau');
    var hautLibre = bd.hidden ? 8 : Math.max(8, Math.round(bd.getBoundingClientRect().bottom - rz.top) + 6);
    barre.style.setProperty('--haut-barre', hautLibre + 'px');
    var pts = pointsSelection(), marge = 24;
    function couverts() {
      var r = barre.getBoundingClientRect(), n = 0;
      pts.forEach(function (q) {
        var x = q[0] + rz.left, y = q[1] + rz.top;
        if (x > r.left - marge && x < r.right + marge && y > r.top - marge && y < r.bottom + marge) n++;
      });
      return n;
    }
    var enHaut = barre.classList.contains('en-haut');
    barre.classList.remove('en-haut'); var nBas = couverts();
    barre.classList.add('en-haut'); var nHaut = couverts();
    // on ne change de côté que si l'autre couvre moins de poignées (pas d'aller-retour pour rien)
    enHaut = enHaut ? !(nBas < nHaut) : nHaut < nBas;
    barre.classList.toggle('en-haut', enHaut);
    if (enHaut) zone.style.removeProperty('--bas-message');
    else zone.style.setProperty('--bas-message', Math.max(74, Math.round(rz.bottom - barre.getBoundingClientRect().top) + 10) + 'px');
  }
  app.placerBarreContexte = placerBarreContexte;

  /* ================================================================== */
  /* Surcouche de dessin                                                 */
  /* ================================================================== */
  app.numerosSegmentsVisibles = function () { return !!app.modeNumeros; };
  app.dessinerSurcouche = function (ctx, vue) {
    var s = app.scene, tactile = app.dernierType !== 'mouse';
    if (app.segmentSurligne !== null) {
      var sg = s.tracer().segments[app.segmentSurligne];
      if (sg) {
        var a = vue.versEcran(sg.a1x, sg.a1y), b = vue.versEcran(sg.a2x, sg.a2y);
        ctx.save(); ctx.strokeStyle = '#00a000'; ctx.lineWidth = 4; ctx.setLineDash([10, 4, 2, 4]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
      }
    }
    if (app.mode === 'grouper') {
      s.objets.forEach(function (o) {
        var choisi = app.choixGroupe.indexOf(o.id) >= 0;
        if (choisi) OGW.surlignerObjet(ctx, vue, s, o.id, 'rgba(128,0,128,0.45)');
        var r = OGW.Poignees.reference(s, o.id), p = vue.versEcran(r.x, r.y);
        OGW.dessinerPoignee(ctx, p[0], p[1], 'choix', { actif: choisi });
      });
    }
    if (app.mode === 'deplacer') {
      s.objets.forEach(function (o) { OGW.dessinerPoigneesObjet(ctx, vue, s, o.id, { actif: app.geste && app.geste.id === o.id ? app.geste.nom : null }); });
      s.groupes.forEach(function (g, i) { OGW.dessinerGroupe(ctx, vue, s, g, app.geste && app.geste.groupe === i); });
    } else if (app.mode === 'selection' || app.mode === 'creation') {
      if (app.selection && s.objet(app.selection)) {
        OGW.surlignerObjet(ctx, vue, s, app.selection);
        OGW.dessinerPoigneesObjet(ctx, vue, s, app.selection, { zone: tactile ? 22 : 0, actif: app.geste ? app.geste.nom : null });
        s.groupesDe(app.selection).forEach(function (i) { OGW.dessinerGroupe(ctx, vue, s, s.groupes[i], app.geste && app.geste.groupe === i); });
      }
      if (app.groupeChoisi !== null && s.groupes[app.groupeChoisi]) {
        s.groupes[app.groupeChoisi].membres.forEach(function (id) { OGW.surlignerObjet(ctx, vue, s, id, 'rgba(0,128,0,0.3)'); });
        OGW.dessinerGroupe(ctx, vue, s, s.groupes[app.groupeChoisi], true);
      }
    } else if (app.mode === 'proprietes' || app.mode === 'dupliquer' || app.mode === 'supprimer') {
      s.objets.forEach(function (o) {
        var r = OGW.Poignees.reference(s, o.id), p = vue.versEcran(r.x, r.y);
        OGW.dessinerPoignee(ctx, p[0], p[1], app.mode === 'supprimer' ? 'suppression' : 'point');
      });
    }
    if (app.creation) app.creation.dessinerApercu(ctx, vue);
    if (app.refus && performance.now() - app.refus.t < 700) {
      ctx.save(); ctx.strokeStyle = '#e00000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(app.refus.x, app.refus.y, 18, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
    }
  };
  /** Objets ignorés au dessin (valeurs aberrantes) : un message, une fois par changement de la liste. */
  var dernierNonDessines = '';
  app.signalerNonDessines = function (ids) {
    var cle = (ids || []).join(',');
    app.objetsNonDessines = ids || [];
    if (cle === dernierNonDessines) return;
    dernierNonDessines = cle;
    if (!cle) return;
    var noms = ids.slice(0, 3).map(function (id) { return OGW.nomObjet(app.scene, id); }).join(', ') + (ids.length > 3 ? '…' : '');
    app.signaler('Impossible de dessiner : ' + noms + ' (valeurs aberrantes). Le reste est dessiné ; corrigez ses propriétés ou supprimez-le.', 'erreur');
  };
  app.apresDessin = function () {
    var l = app.loupeEtat;
    if (l) app.loupe.montrer(app.dessinateur.canvas, app.dessinateur.dpr, l.px, l.py, l.texte, app.dessinateur.w, l.dx, l.dy);
  };

  /* ================================================================== */
  /* Coordonnées affichées (avec l'incertitude d'un demi-pixel)          */
  /* ================================================================== */
  function texteCoord(m) {
    var inc = app.pixelsEnMonde(0.5), u = app.scene.options.unitelongueur;
    var e = Math.pow(10, Math.floor(Math.log10(inc))), i1 = Math.round(inc / e) * e;
    var dec = Math.max(0, -Math.floor(Math.log10(i1)));
    function f(v) { return OGW.fixe(Math.round(v / i1) * i1, dec); }
    return 'X = ' + f(m.x) + ' ± ' + OGW.fixe(i1, dec) + ' ' + u + ', Y = ' + f(m.y) + ' ± ' + OGW.fixe(i1, dec) + ' ' + u;
  }
  function majCoord(m) {
    app.coordTexte = texteCoord(m);
    $('#coordonnees').textContent = app.coordTexte;
  }

  /* ================================================================== */
  /* Recherche sous le doigt                                             */
  /* ================================================================== */
  function tolPx(type) { return type === 'mouse' ? 9 : 22; }
  function poigneeSous(p, type) {
    var vue = app.dessinateur.vue(), s = app.scene, meilleur = null, tol = type === 'mouse' ? 10 : 24;
    var ids = app.mode === 'deplacer' ? s.objets.map(function (o) { return o.id; }) : (app.selection ? [app.selection] : []);
    ids.forEach(function (id) {
      OGW.Poignees.liste(s, id).forEach(function (h) {
        var e = vue.versEcran(h.x, h.y), d = Math.hypot(e[0] - p.x, e[1] - p.y);
        // à distance égale, la poignée de l'objet sélectionné et les points précis passent avant la translation
        var bonus = (h.role === 'translation' ? 1.5 : 0);
        if (d <= tol && (!meilleur || d + bonus < meilleur.d)) meilleur = { id: id, nom: h.nom, d: d + bonus, brut: d };
      });
    });
    if (meilleur && type !== 'mouse' && corpsPrioritaire(p, meilleur, tol)) meilleur = null;
    var groupes = app.mode === 'deplacer' ? s.groupes.map(function (g, i) { return i; }) :
      (app.selection ? s.groupesDe(app.selection) : (app.groupeChoisi !== null ? [app.groupeChoisi] : []));
    groupes.forEach(function (i) {
      var c = s.centre(s.groupes[i].membres), e = vue.versEcran(c.x, c.y), d = Math.hypot(e[0] - p.x, e[1] - p.y);
      if (d <= tol && (!meilleur || d < meilleur.d)) meilleur = { groupe: i, d: d };
    });
    return meilleur;
  }
  /**
   * Petit objet au doigt (toutes ses poignées tiennent dans 3 fois la zone d'une poignée, 72 px) : les
   * zones de ses poignées (24 px) se chevauchent et couvrent tout son corps. Hors du disque visible
   * d'une poignée (10 px), un doigt plus proche du corps que de la poignée touche alors le corps
   * (choisir l'objet, le translater). Un objet plus grand garde ses zones de 24 px.
   */
  var DISQUE_POIGNEE = 10;
  function corpsPrioritaire(p, h, tol) {
    if (h.id === undefined || h.brut <= DISQUE_POIGNEE) return false;
    var vue = app.dessinateur.vue(), s = app.scene;
    var pts = OGW.Poignees.liste(s, h.id).map(function (q) { return vue.versEcran(q.x, q.y); }), etendue = 0;
    for (var i = 0; i < pts.length; i++)
      for (var j = i + 1; j < pts.length; j++) etendue = Math.max(etendue, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
    if (etendue > 3 * tol) return false;
    var m = vue.versMonde(p.x, p.y), dm = OptGeo.distanceObjet(s, h.id, m[0], m[1]);
    if (!isFinite(dm)) return false;
    return dm / vue.pixelsEnMonde(1) < h.brut;
  }
  var mesureTexte = document.createElement('canvas').getContext('2d');
  /** Objets sous le point écran p, du plus proche au plus lointain. */
  function objetsSous(p, type) {
    var vue = app.dessinateur.vue(), s = app.scene, m = vue.versMonde(p.x, p.y), tol = tolPx(type), res = [];
    var tolM = vue.pixelsEnMonde(tol);
    s.objets.forEach(function (o, rang) {
      var d;
      if (o.type === 'texte') {
        var g = s.geometrie(o.id); if (!g) return;
        var pol = OptGeo.policeTexte(g), px = pol.px, e = vue.versEcran(g.x, g.y);
        mesureTexte.font = pol.css;
        var w = mesureTexte.measureText(g.texte || ' ').width, h = px * 1.2;
        var dx = Math.max(e[0] - p.x, 0, p.x - (e[0] + w)), dy = Math.max(e[1] - p.y, 0, p.y - (e[1] + h));
        d = Math.hypot(dx, dy);
      } else {
        var dm = OptGeo.distanceObjet(s, o.id, m[0], m[1]);
        if (!isFinite(dm)) return;
        d = dm / tolM * tol;
        if (dm === 0 && OptGeo.estMilieu(o.type)) d = tol * 0.6;     // l'intérieur d'un milieu passe après un trait fin
      }
      if (d <= tol) res.push({ id: o.id, d: d, rang: rang });
    });
    res.sort(function (a, b) { return a.d - b.d || b.rang - a.rang; });
    return res.map(function (r) { return r.id; });
  }
  /** Segment de rayon sous le point (mode fantômes). */
  function segmentSous(p) {
    var vue = app.dessinateur.vue(), segs = app.scene.tracer().segments, best = -1, bd = 14;
    segs.forEach(function (s, i) {
      var a = vue.versEcran(s.a1x, s.a1y), b = vue.versEcran(s.a2x, s.a2y);
      var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / l : 0;
      t = Math.max(0, Math.min(1, t));
      var d = Math.hypot(p.x - a[0] - t * dx, p.y - a[1] - t * dy);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  /** Plusieurs objets possibles : petite liste nommée (comme form_quelobjet). */
  function choisirParmi(ids, titre, suite) {
    if (ids.length === 1) { suite(ids[0]); return; }
    var liste = el('div', { class: 'liste-choix' });
    var d = OGW.Dialogue({ titre: titre, corps: liste, boutons: [{ texte: 'Annuler', annuler: true }] });
    ids.forEach(function (id) {
      liste.appendChild(el('button', { type: 'button', texte: OGW.nomObjet(app.scene, id), onclick: function () { d.fermer(); suite(id); } }));
    });
  }

  /* ================================================================== */
  /* Gestes                                                              */
  /* ================================================================== */
  var canvas;
  function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function monde(p) { var m = app.dessinateur.vue().versMonde(p.x, p.y); return { x: m[0], y: m[1] }; }
  function grille(m) {
    var o = app.scene.options;
    if (!o.attractiongrille || !(o.grillex > 0) || !(o.grilley > 0)) return m;
    return { x: o.xxmin + Math.round((m.x - o.xxmin) / o.grillex) * o.grillex, y: o.yymin + Math.round((m.y - o.yymin) / o.grilley) * o.grilley };
  }
  /** Point visé pendant une création : grille, alignements, projection de l'étape. */
  function viser(p, e) {
    var c = app.creation, m = monde(p);
    // les points projetés (foyer sur l'axe…) ne sont pas attirés : la projection seule les place (SPEC O02)
    if (c.attraction() && !c.etapeProjetee()) m = grille(m);
    var prec = c.precedent();
    if (prec) {
      if (app.verrouV || (e && e.altKey)) m.x = prec.x;
      if (app.verrouH || (e && (e.ctrlKey || e.metaKey))) m.y = prec.y;
    }
    return c.contraindre(m);
  }
  /** Loupe : placée d'après le doigt (p, jamais dessous), elle montre le point visé m (projeté s'il le faut). */
  function montrerLoupe(p, m, type) {
    if (type === 'mouse') { app.loupeEtat = null; app.loupe.cacher(); return; }
    var v = app.dessinateur.vue().versEcran(m.x, m.y);
    app.loupeEtat = { px: v[0], py: v[1], dx: p.x, dy: p.y, texte: texteCoord(m).replace(', Y', '\nY') };
  }

  var rafGlisser = null, dernierPointGlisser = null;
  function planifierGlisser(p, e) {
    dernierPointGlisser = { p: p, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey };
    if (rafGlisser) return;
    rafGlisser = window.requestAnimationFrame(function () { rafGlisser = null; appliquerGlisser(); });
  }
  function appliquerGlisser() {
    var g = app.geste; if (!g || !dernierPointGlisser) return;
    var p = dernierPointGlisser.p, m = monde(p), s = app.scene;
    if (g.kind === 'groupe') {
      var cible = { x: g.ref0.x + (m.x - g.prise.x), y: g.ref0.y + (m.y - g.prise.y) };
      cible = verrous(cible, g.ref0, dernierPointGlisser);
      cible = grille(cible);
      var dx = cible.x - g.ref0.x, dy = cible.y - g.ref0.y, nouveaux = [], ok = true;
      g.membres.forEach(function (id, i) {
        var q = OptGeo.transformerParametres(s.objet(id).type, g.p0[i], function (x, y) { return [x + dx, y + dy]; }, null, 0);
        var r = s.valider(s.objet(id).type, q);
        if (!r.ok) ok = false; nouveaux.push(q);
      });
      if (ok) { g.membres.forEach(function (id, i) { s.modifier(id, nouveaux[i]); }); g.change = true; }
      else refuser(p);
      app.infoGlisser = 'Translation du groupe';
    } else {
      var c = g.ctx, point;
      if (c.role === 'translation') {
        point = { x: c.h0.x + (m.x - g.prise.x), y: c.h0.y + (m.y - g.prise.y) };
        point = verrous(point, c.h0, dernierPointGlisser);
        point = grille(point);
      } else {
        point = { x: m.x + g.decalage.x, y: m.y + g.decalage.y };
        point = verrous(point, c.h0, dernierPointGlisser);
      }
      var r2 = OGW.Poignees.appliquer(s, c, point.x, point.y);
      if (r2.ok) g.change = true; else refuser(p);
      app.infoGlisser = OGW.Poignees.info(s, c);
      if (app.dernierType !== 'mouse') { var hh = OGW.Poignees.liste(s, c.id).filter(function (h) { return h.nom === c.nom; })[0] || c.h0; montrerLoupe(p, hh, app.dernierType); }
    }
    majCoord(m);
    app.majBandeau();
    app.dessinateur.demander();
  }
  function verrous(pt, ref, mod) {
    var g = app.geste, rx = g && g.refX !== undefined ? g.refX : ref.x, ry = g && g.refY !== undefined ? g.refY : ref.y;
    if (app.verrouV || (mod && mod.alt)) pt.x = rx;
    if (app.verrouH || (mod && mod.ctrl)) pt.y = ry;
    return pt;
  }
  /** Position actuelle du point que le glisser déplace (centre du groupe, poignée, ou point de référence). */
  function positionGlissee(g) {
    var s = app.scene;
    if (g.kind === 'groupe') return s.centre(g.membres);
    var c = g.ctx; if (!c || !s.objet(c.id)) return null;
    if (c.role === 'translation') return OGW.Poignees.reference(s, c.id);
    var h = OGW.Poignees.liste(s, c.id).filter(function (q) { return q.nom === c.nom; })[0];
    return h ? { x: h.x, y: h.y } : null;
  }
  function refuser(p) {
    app.refus = { x: p.x, y: p.y, t: performance.now() };
    setTimeout(function () { app.dessinateur.demander(); }, 750);
  }

  function demarrerGlisserObjet(id, nom, p) {
    var m = monde(p);
    var c = OGW.Poignees.demarrer(app.scene, id, nom);
    app.geste.kind = nom === '*corps' ? 'corps' : 'poignee';
    app.geste.id = id; app.geste.nom = nom; app.geste.ctx = c;
    app.geste.prise = m;
    app.geste.decalage = { x: c.h0.x - m.x, y: c.h0.y - m.y };     // la poignée ne saute pas sous le doigt
    app.geste.etatAvant = app.scene.versJSON();
    app.infoGlisser = OGW.Poignees.info(app.scene, c);
  }
  function demarrerGlisserGroupe(i, p) {
    var s = app.scene, g = s.groupes[i];
    app.geste.kind = 'groupe'; app.geste.groupe = i;
    app.geste.membres = g.membres.slice();
    app.geste.p0 = g.membres.map(function (id) { return s.parametres(id); });
    app.geste.ref0 = s.centre(g.membres);
    app.geste.prise = monde(p);
    app.geste.etatAvant = s.versJSON();
  }
  app.annulerGeste = function () {
    var g = app.geste;
    if (!g) return;
    if (g.etatAvant && g.change) app.scene.restaurer(g.etatAvant);
    if (rafGlisser) { window.cancelAnimationFrame(rafGlisser); rafGlisser = null; }
    if (g.kind === 'poignee' || g.kind === 'corps' || g.kind === 'groupe') app.verrouH = app.verrouV = false;   // « Bloquer » ne vaut que pour ce geste
    app.geste = null; app.infoGlisser = ''; app.loupeEtat = null; app.loupe.cacher();
    if (app.creation) app.creation.visee = null;
    app.majInterface(); app.dessinateur.demander();
  };

  /**
   * Un pointeur principal (premier doigt posé, ou la souris) ne peut pas commencer pendant qu'un autre
   * doigt du même genre est encore posé : les doigts encore enregistrés sont des doigts dont le lever
   * n'a pas été reçu (doigt sorti de l'écran, geste commencé hors du dessin…). On les oublie, sinon tout
   * toucher suivant deviendrait un pincement.
   */
  function oublierPointeursPerdus(e) {
    var type = e.pointerType || 'mouse', n = 0;
    Object.keys(app.pointeurs).forEach(function (k) {
      if (+k !== e.pointerId && (app.pointeurs[k].type || 'mouse') === type) { delete app.pointeurs[k]; n++; }
    });
    if (!Object.keys(app.pointeurs).length) app.pincement = null;
    if (n && app.geste) terminerGestePerdu();
  }
  /** Geste dont le lever n'a pas été reçu : un glisser garde son résultat, le reste est abandonné. */
  function terminerGestePerdu() {
    var g = app.geste;
    if ((g.kind === 'poignee' || g.kind === 'corps' || g.kind === 'groupe') && g.change) {
      if (rafGlisser) { window.cancelAnimationFrame(rafGlisser); rafGlisser = null; }
      app.geste = null; app.infoGlisser = ''; app.verrouH = app.verrouV = false;
      app.loupeEtat = null; app.loupe.cacher();
      app.memoriser();
    } else app.annulerGeste();
  }
  function surAppui(e) {
    if (OGW.dialogueOuvert()) return;
    var p = pos(e);
    app.dernierType = e.pointerType || 'mouse';
    if (e.isPrimary) oublierPointeursPerdus(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
    app.pointeurs[e.pointerId] = { x: p.x, y: p.y, type: e.pointerType || 'mouse' };
    var n = Object.keys(app.pointeurs).length;
    if (n >= 2) {                                   // deux doigts : zoom et déplacement de la vue
      if (app.geste) app.annulerGeste();
      var ids = Object.keys(app.pointeurs), a = app.pointeurs[ids[0]], b = app.pointeurs[ids[1]];
      var mil = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      app.pincement = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: app.dessinateur.zoom, m0: monde(mil) };
      return;
    }
    if (e.pointerType === 'mouse' && e.button === 1) { app.geste = { kind: 'vue', dernier: p, x0: p.x, y0: p.y, bouge: true }; e.preventDefault(); return; }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dernierPointGlisser = null;
    app.coordTexte = '';                            // pas de coordonnées d'un geste précédent dans le bandeau
    var g = app.geste = { kind: 'vide', x0: p.x, y0: p.y, dernier: p, bouge: false, type: e.pointerType, t0: performance.now(), dmax: 0 };
    if (app.modeNumeros === 'fantomes' && app.basculerFantome) { g.kind = 'segment'; return; }
    if (app.mode === 'creation' && app.creation) {
      g.kind = 'visee';
      var m = viser(p, e);
      app.creation.visee = m; majCoord(m); montrerLoupe(p, m, e.pointerType);
      app.majBandeau(); app.dessinateur.demander();
      return;
    }
    if (app.mode === 'proprietes' || app.mode === 'dupliquer' || app.mode === 'supprimer' || app.mode === 'grouper') { g.kind = 'tape'; return; }
    // sélection, déplacer
    var h = poigneeSous(p, e.pointerType);
    if (h) {
      if (h.groupe !== undefined) demarrerGlisserGroupe(h.groupe, p);
      else demarrerGlisserObjet(h.id, h.nom, p);
      app.majInterface(); app.dessinateur.demander();
      return;
    }
    var cands = objetsSous(p, e.pointerType);
    if (cands.length) {
      g.kind = 'objet'; g.candidats = cands;
      if (app.mode === 'selection' && cands.indexOf(app.selection) < 0) { app.selection = cands[0]; app.groupeChoisi = null; }
      g.id = app.mode === 'selection' ? app.selection : cands[0];
      app.majInterface(); app.dessinateur.demander();
    }
  }
  function surMouvement(e) {
    var p = pos(e);
    if (app.pointeurs[e.pointerId]) { app.pointeurs[e.pointerId].x = p.x; app.pointeurs[e.pointerId].y = p.y; }
    if (app.pincement) {
      var ids = Object.keys(app.pointeurs);
      if (ids.length >= 2) {
        var a = app.pointeurs[ids[0]], b = app.pointeurs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        app.dessinateur.fixerZoom(app.pincement.z0 * d / app.pincement.d0, app.pincement.m0.x, app.pincement.m0.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        app.majInterface();
      }
      return;
    }
    var g = app.geste;
    if (!g) {
      if (e.pointerType === 'mouse') {
        var m0 = monde(p);
        if (app.mode === 'creation' && app.creation) { app.creation.visee = viser(p, e); majCoord(app.creation.visee); app.majBandeau(); app.dessinateur.demander(); }
        else majCoord(m0);
      }
      return;
    }
    var seuil = g.type === 'mouse' ? 4 : 10, dist = Math.hypot(p.x - g.x0, p.y - g.y0);
    if (dist > g.dmax) g.dmax = dist;
    if (!g.bouge && dist > seuil) g.bouge = true;
    switch (g.kind) {
      case 'visee': {
        var m = viser(p, e);
        app.creation.visee = m; majCoord(m); montrerLoupe(p, m, e.pointerType);
        app.majBandeau(); app.dessinateur.demander();
        break;
      }
      case 'poignee': case 'corps': case 'groupe':
        planifierGlisser(p, e); break;
      case 'objet':
        if (g.bouge && (app.mode === 'selection' || app.mode === 'deplacer')) {
          demarrerGlisserObjet(g.id, '*corps', { x: g.x0, y: g.y0 });
          app.majInterface();
          planifierGlisser(p, e);
        }
        break;
      case 'vide': case 'tape': case 'segment': case 'vue':
        if (g.bouge) {
          g.kind = 'vue';
          app.dessinateur.deplacerVue(p.x - g.dernier.x, p.y - g.dernier.y);
        }
        break;
    }
    g.dernier = p;
  }
  function surRelache(e, annule) {
    // lostpointercapture sans pointerup : on garde la dernière position connue du doigt
    var connu = app.pointeurs[e.pointerId];
    var p = (e.type === 'lostpointercapture' && connu) ? { x: connu.x, y: connu.y } : pos(e);
    delete app.pointeurs[e.pointerId];
    if (app.pincement) {
      if (!Object.keys(app.pointeurs).length) app.pincement = null;
      app.geste = null;
      return;
    }
    var g = app.geste;
    if (!g) return;
    if (annule) { app.annulerGeste(); return; }
    // glisser très rapide (aucun pointermove reçu au-delà du seuil) : c'est quand même un glisser
    if (g.kind === 'objet' && !g.bouge && (app.mode === 'selection' || app.mode === 'deplacer') &&
      Math.hypot(p.x - g.x0, p.y - g.y0) > (g.type === 'mouse' ? 4 : 10)) {
      g.bouge = true;
      demarrerGlisserObjet(g.id, '*corps', { x: g.x0, y: g.y0 });
    }
    // simple toucher (sans glisser) sur une poignée de l'objet choisi : c'est un toucher, pas un glisser.
    // L'éventuel tremblement du doigt est annulé et, s'il y a plusieurs éléments à cet endroit, on passe
    // au suivant (E05 : « touchez encore au même endroit »), même si une poignée est sous le doigt.
    // Un petit réglage volontaire (quelques pixels, geste lent, ou doigt allé plus loin puis revenu)
    // reste un glisser : voir estUnToucher.
    if ((g.kind === 'poignee' || g.kind === 'corps') && app.mode === 'selection' && estUnToucher(g, p)) {
      if (rafGlisser) { window.cancelAnimationFrame(rafGlisser); rafGlisser = null; }
      if (g.change && g.etatAvant) app.scene.restaurer(g.etatAvant);
      app.geste = null; app.infoGlisser = ''; app.verrouH = app.verrouV = false;
      app.loupeEtat = null; app.loupe.cacher();
      g.candidats = null;
      tape(p, g);
      app.dessinateur.demander();
      return;
    }
    // fin d'un glisser : la position du relâcher est appliquée AVANT de terminer le geste
    // (sinon la dernière image, ou tout un geste rapide, était perdue)
    if (g.kind === 'poignee' || g.kind === 'corps' || g.kind === 'groupe') {
      if (rafGlisser) { window.cancelAnimationFrame(rafGlisser); rafGlisser = null; }
      dernierPointGlisser = { p: p, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey };
      appliquerGlisser();
    }
    app.geste = null;
    app.loupeEtat = null; app.loupe.cacher();
    switch (g.kind) {
      case 'visee': {
        var c = app.creation; if (!c) break;
        var m = viser(p, e);
        c.visee = null;
        app.apresEtape(c.valider(m));
        break;
      }
      case 'poignee': case 'corps': case 'groupe':
        app.infoGlisser = '';
        app.verrouH = app.verrouV = false;          // « Bloquer » ne vaut que pour ce glisser
        if (g.change) app.memoriser(); else app.majInterface();
        break;
      case 'objet':
        if (!g.bouge) tape(p, g);
        else app.majInterface();
        break;
      case 'tape': case 'segment':
        if (!g.bouge) tape(p, g);
        break;
      case 'vide':
        if (!g.bouge && app.mode === 'selection') { app.selection = null; app.groupeChoisi = null; app.derniereTape = null; app.majInterface(); }
        break;
    }
    app.dessinateur.demander();
  }
  /**
   * Geste sur une poignée compté comme un toucher : le doigt (ou la souris) n'est jamais allé à plus de
   * 4 px (2 px à la souris) du point d'appui — distance maximale, pas finale — et le geste est bref
   * (200 ms au plus), ou presque immobile (1,5 px au doigt, 0,5 px à la souris) quelle que soit sa durée.
   */
  var TOUCHER = { doigt: { max: 4, immobile: 1.5 }, souris: { max: 2, immobile: 0.5 }, duree: 200 };
  function estUnToucher(g, p) {
    var t = g.type === 'mouse' ? TOUCHER.souris : TOUCHER.doigt;
    var d = Math.max(g.dmax || 0, Math.hypot(p.x - g.x0, p.y - g.y0));
    if (d > t.max) return false;
    return d <= t.immobile || performance.now() - g.t0 <= TOUCHER.duree;
  }
  app.estUnToucher = estUnToucher;
  /** Toucher sans glisser. */
  function tape(p, g) {
    var s = app.scene;
    if (g.kind === 'segment') {
      var k = segmentSous(p);
      if (k >= 0 && app.basculerFantome) app.basculerFantome(k + 1);
      return;
    }
    var cands = g.candidats || objetsSous(p, g.type);
    if (app.mode === 'selection') {
      var dt = app.derniereTape;
      if (dt && Math.hypot(dt.x - p.x, dt.y - p.y) < 14 && dt.candidats.join() === cands.join() && cands.length > 1) {
        dt.index = (dt.index + 1) % cands.length;
        app.selection = cands[dt.index];
      } else app.derniereTape = { x: p.x, y: p.y, candidats: cands, index: Math.max(0, cands.indexOf(app.selection)) };
      app.majInterface();
      return;
    }
    if (!cands.length) return;
    var titres = { proprietes: 'Propriétés de l’objet :', dupliquer: 'Objet à dupliquer :', supprimer: 'Objet à supprimer :', grouper: 'Objet à grouper :' };
    choisirParmi(cands, titres[app.mode] || 'Choix de l’objet :', function (id) {
      switch (app.mode) {
        case 'proprietes': app.ouvrirProprietes(id); break;          // le mode Propriétés reste actif : on en sort par « Terminer » du bandeau
        case 'dupliquer': app.mode = 'selection'; app.dupliquer(id); break;
        case 'supprimer': app.mode = 'selection'; app.supprimer(id); break;
        case 'grouper': {
          var i = app.choixGroupe.indexOf(id);
          if (i >= 0) app.choixGroupe.splice(i, 1); else app.choixGroupe.push(id);
          app.signaler(OGW.nomObjet(s, id) + (i >= 0 ? ' retiré du groupe.' : ' ajouté au groupe.'));
          break;
        }
      }
      app.majInterface(); app.dessinateur.demander();
    });
  }
  function surMolette(e) {
    e.preventDefault();
    var p = pos(e);
    if (e.shiftKey) { app.dessinateur.deplacerVue(-e.deltaX - e.deltaY, 0); return; }
    var d = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    app.dessinateur.zoomer(Math.exp(-d * 0.0015), p.x, p.y);
    app.majInterface();
  }

  /* ================================================================== */
  /* Clavier                                                             */
  /* ================================================================== */
  function surTouche(e) {
    var dansChamp = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    var ctrl = e.ctrlKey || e.metaKey, k = e.key;
    if (k === 'Escape') {
      if (OGW.fermerDernierDialogue()) { e.preventDefault(); return; }
      if (app.geste) { app.annulerGeste(); e.preventDefault(); return; }       // remet l'objet à sa place
      if (app.creation) { app.terminerCreation(); return; }
      if (app.panneau) { app.fermerPanneau(); return; }
      if (fermerVolets()) return;
      if (app.mode !== 'selection') { if (app.mode === 'grouper') app.choixGroupe = []; app.mode = 'selection'; app.majInterface(); app.dessinateur.demander(); return; }
      if (app.selection) { app.selection = null; app.majInterface(); app.dessinateur.demander(); }
      return;
    }
    if (OGW.dialogueOuvert()) return;
    if (ctrl && !e.altKey) {
      var l = k.toLowerCase();
      if (l === 'z' && !e.shiftKey) { if (dansChamp) return; e.preventDefault(); app.annuler(); return; }
      if (l === 'y' || (l === 'z' && e.shiftKey)) { if (dansChamp) return; e.preventDefault(); app.retablir(); return; }
      if (l === 's') { e.preventDefault(); if (e.shiftKey) OGW.dialogueEnregistrer(app); else app.enregistrer(); return; }
      if (l === 'o') { e.preventDefault(); siModifie(function () { OGW.ouvrirFichier(app, false); }); return; }
      if (dansChamp) return;
      if (l === 'd') { e.preventDefault(); if (app.selection) app.dupliquer(app.selection); else app.changerMode('dupliquer'); return; }
      if (l === 'p') { e.preventDefault(); if (app.selection) app.ouvrirProprietes(app.selection); else app.changerMode('proprietes'); return; }
      if (l === 'm') { e.preventDefault(); app.changerMode('deplacer'); return; }
      if (l === 'g') { e.preventDefault(); app.changerMode('grouper'); return; }
      if (l === 'e') { e.preventDefault(); OGW.panneauCommentaire(app); return; }
      if (l === 'a') { e.preventDefault(); app.toutGrouper(); return; }
      return;
    }
    if (dansChamp) return;
    if ((k === 'Delete' || k === 'Backspace') && app.selection) { e.preventDefault(); app.supprimer(app.selection); return; }
    if (k === '+' || k === '=') { app.dessinateur.zoomer(1.25); app.majInterface(); return; }
    if (k === '-' || k === '_') { app.dessinateur.zoomer(0.8); app.majInterface(); return; }
    if (k === '0') { app.dessinateur.toutVoir(); app.majInterface(); return; }
    if (/^Arrow/.test(k) && app.selection) {
      e.preventDefault();
      var o = app.scene.options, pasx = (o.tracergrille || o.attractiongrille) ? o.grillex : app.pixelsEnMonde(1), pasy = (o.tracergrille || o.attractiongrille) ? o.grilley : app.pixelsEnMonde(1);
      if (e.shiftKey) { pasx *= 10; pasy *= 10; }
      var dx = k === 'ArrowLeft' ? -pasx : k === 'ArrowRight' ? pasx : 0, dy = k === 'ArrowDown' ? -pasy : k === 'ArrowUp' ? pasy : 0;
      var r = app.scene.translater([app.selection], dx, dy);
      if (r.ok) app.memoriser(); else app.signaler('Déplacement refusé : ' + r.erreur, 'erreur');
    }
  }

  /* ================================================================== */
  /* Construction de l'interface                                         */
  /* ================================================================== */
  function fermerVolets() {
    var ouvert = false;
    OGW.$$('.volet:not([hidden]), .menu:not([hidden]), .popover:not([hidden])').forEach(function (v) { v.hidden = true; ouvert = true; });
    OGW.$$('[aria-expanded="true"]').forEach(function (b) { if (!b.closest('.champ-couleur')) b.setAttribute('aria-expanded', 'false'); });
    return ouvert;
  }
  app.fermerVolets = fermerVolets;

  function construirePalette() {
    var onglets = $('#palette-onglets'), volet = $('#volet');
    OGW.FAMILLES.forEach(function (f) {
      var b = el('button', { type: 'button', class: 'onglet', 'aria-expanded': 'false', 'aria-controls': 'volet', 'data-famille': f.id, title: f.nom,
        html: OGW.icone(f.icone) + '<span>' + f.nom + '</span>' });
      b.addEventListener('click', function () {
        var deja = !volet.hidden && volet.getAttribute('data-famille') === f.id;
        fermerVolets();
        if (deja) return;
        OGW.vider(volet);
        volet.setAttribute('data-famille', f.id);
        volet.appendChild(el('h2', { texte: f.nom }));
        var grille = el('div', { class: 'outils' });
        f.outils.forEach(function (id) {
          var spec = id === '*fantomes' ? { titre: 'Cacher des segments de rayon', court: 'Cacher segments', icone: 'fantomes' } :
            id === '*commentaire' ? { titre: 'Ajouter (ou éditer) le commentaire de la simulation', court: 'Commentaire', icone: 'commentaire' } : OGW.OUTILS[id];
          var bt = el('button', { type: 'button', class: 'outil', title: spec.titre, 'data-outil': id, html: OGW.icone(spec.icone) + '<span>' + spec.court + '</span>' });
          bt.addEventListener('click', function () { fermerVolets(); app.demarrerCreation(id); });
          grille.appendChild(bt);
        });
        volet.appendChild(grille);
        volet.hidden = false; b.setAttribute('aria-expanded', 'true');
      });
      onglets.appendChild(b);
    });
  }

  function itemMenu(texte, action, o) {
    o = o || {};
    var b = el('button', { type: 'button', class: 'item', role: 'menuitem' }, [el('span', { texte: texte }), o.raccourci ? el('kbd', { texte: o.raccourci }) : null]);
    if (o.option) { b.setAttribute('data-option', o.option); b.setAttribute('role', 'menuitemcheckbox'); b.setAttribute('aria-checked', 'false'); }
    b.addEventListener('click', function () { if (!o.garder) fermerVolets(); action(); });
    return b;
  }
  function basculerOption(cle) {
    var o = app.scene.options, v = !o[cle], c = {};
    c[cle] = v;
    if (cle === 'optionnormale' && !v && o.optionangles) { OGW.message('L’affichage des angles impose le tracé des normales.'); return; }
    if (cle === 'optionangles' && v) c.optionnormale = true;
    app.changerOptions(c, false);
  }
  function construireMenu() {
    var menu = $('#menu');
    function section(titre, items) {
      menu.appendChild(el('section', {}, [el('h2', { texte: titre }), el('div', { class: 'items', role: 'menu' }, items)]));
    }
    var nouv = function () { siModifie(function () { OGW.dialogueNouvelle(app, false); }); };
    section('Fichier', [
      itemMenu('Nouvelle simulation…', nouv),
      itemMenu('Ouvrir un fichier de l’appareil…', function () { siModifie(function () { OGW.ouvrirFichier(app, false); }); }, { raccourci: 'Ctrl+O' }),
      itemMenu('Ouvrir un exemple…', function () { siModifie(function () { OGW.dialogueExemples(app, 'ouvrir'); }); }),
      itemMenu('Superposer un fichier…', function () { OGW.ouvrirFichier(app, true); }),
      itemMenu('Superposer un exemple…', function () { OGW.dialogueExemples(app, 'superposer'); }),
      itemMenu('Enregistrer', function () { app.enregistrer(); }, { raccourci: 'Ctrl+S' }),
      itemMenu('Enregistrer sous…', function () { OGW.dialogueEnregistrer(app); }, { raccourci: 'Ctrl+Maj+S' }),
      itemMenu('Exporter l’image (PNG ou SVG)…', function () { OGW.dialogueExporter(app); }),
      itemMenu('Imprimer…', function () { app.imprimer(); }),
      itemMenu('Modifier l’espace de travail…', function () { OGW.dialogueEspace(app); }),
      itemMenu('Ajuster l’espace de travail à la plus petite taille', function () { OGW.ajusterEspace(app); }),
      itemMenu('Préférences…', function () { OGW.dialoguePreferences(app); })]);
    var edition = [
      itemMenu('Annuler', app.annuler, { raccourci: 'Ctrl+Z' }), itemMenu('Refaire', app.retablir, { raccourci: 'Ctrl+Y' }),
      itemMenu('Déplacer un élément', function () { app.changerMode('deplacer'); }, { raccourci: 'Ctrl+M' }),
      itemMenu('Propriétés d’un élément', function () { app.changerMode('proprietes'); }, { raccourci: 'Ctrl+P' }),
      itemMenu('Dupliquer un élément', function () { app.changerMode('dupliquer'); }, { raccourci: 'Ctrl+D' }),
      itemMenu('Supprimer un élément', function () { app.changerMode('supprimer'); }),
      itemMenu('Supprimer tous les éléments', app.supprimerTout),
      itemMenu('Grouper des éléments à choisir', function () { app.changerMode('grouper'); }, { raccourci: 'Ctrl+G' }),
      itemMenu('Grouper tous les éléments', app.toutGrouper, { raccourci: 'Ctrl+A' }),
      itemMenu('Commentaire de la simulation', function () { OGW.panneauCommentaire(app); }, { raccourci: 'Ctrl+E' })];
    if (app.copiePossible()) edition.push(itemMenu('Copier l’image dans le presse-papiers', app.copierImage));
    section('Édition', edition);
    function aj(t, type, extra) { return itemMenu(t, function () { app.ajouterParCoordonnees(type, extra); }); }
    section('Ajouter (par coordonnées)', [
      el('h3', { texte: 'Système optique idéal' }), aj('Miroir plan', 'miroirplan'), aj('Miroir sphérique concave (paraxial)', 'mscopa'),
      aj('Miroir sphérique convexe (paraxial)', 'mscepa'), aj('Lentille mince convergente', 'lmc'), aj('Lentille mince divergente', 'lmd'),
      aj('Lame semi-réfléchissante', 'lsr'), aj('Écran', 'ecran'), aj('Diaphragme', 'diaphragme'),
      el('h3', { texte: 'Système optique réel' }), aj('Miroir sphérique concave (réel)', 'mscore'), aj('Miroir sphérique convexe (réel)', 'mscere'),
      aj('Miroir conique', 'miroirconique'), aj('Polygone réfractant', 'polyhedre'), aj('Sphère réfractante', 'sphere'), aj('Prisme', 'prisme'),
      aj('Lentille épaisse', 'lec'), aj('Polycercle réfractant', 'polycercle'),
      el('h3', { texte: 'Source' }), aj('Rayon unique', 'rayon'), aj('Objet ponctuel réel ou virtuel', 'sourceponctuelle'), aj('Onde plane (faisceau parallèle)', 'ondeplane'),
      el('h3', { texte: 'Divers' }), aj('Texte sur le dessin', 'texte', { texte: 'Texte' }), itemMenu('Commentaire sur la simulation', function () { OGW.panneauCommentaire(app); }),
      aj('Mesure de distance', 'metre'), aj('Mesure d’angle', 'angle'), itemMenu('Rayons fantômes', function () { OGW.panneauFantomes(app); }),
      aj('Trait, flèche…', 'fleche'), aj('Œil stylisé', 'oeil'), aj('Réseau diffractant', 'reseau'), aj('Point', 'jolipoint')]);
    section('Options', [
      itemMenu('Afficher la grille', function () { basculerOption('tracergrille'); }, { option: 'tracergrille', garder: true }),
      itemMenu('Attraction de la grille', function () { basculerOption('attractiongrille'); }, { option: 'attractiongrille', garder: true }),
      itemMenu('Options de la grille…', function () { OGW.dialogueGrille(app); }),
      itemMenu('Afficher les normales', function () { basculerOption('optionnormale'); }, { option: 'optionnormale', garder: true }),
      itemMenu('Afficher les angles', function () { basculerOption('optionangles'); }, { option: 'optionangles', garder: true }),
      itemMenu('Options des normales…', function () { OGW.dialogueNormales(app); }),
      itemMenu('Afficher les longueurs des segments', function () { basculerOption('afficher_longueurs_segments'); }, { option: 'afficher_longueurs_segments', garder: true }),
      itemMenu('Coordonnées des segments…', function () { OGW.panneauCoordonnees(app); }),
      itemMenu('Couleur de fond ou image de fond…', function () { OGW.dialogueFond(app); }),
      itemMenu('Indices du milieu ambiant et longueurs d’onde…', function () { OGW.dialogueIndices(app); }),
      itemMenu('Désactiver le contrôle des points trop proches à la construction', function () { basculerOption('desactiverControle'); }, { option: 'desactiverControle', garder: true }),
      itemMenu('Empennage des rayons…', function () { OGW.dialogueEmpennage(app); }),
      itemMenu('Surfaces d’onde…', function () { OGW.dialogueSurfaces(app); })]);
    section('Aide', [
      itemMenu('Utiliser OptGeo sur le web', function () { app.ouvrirAide('web.html'); }),
      itemMenu('Aide d’OptGeo (sommaire)', function () { app.ouvrirAide('index.html'); }),
      itemMenu('À propos', OGW.dialogueAPropos),
      itemMenu('Licence GNU GPL', function () { var w = window.open('LICENSE.txt', '_blank'); if (!w) location.href = 'LICENSE.txt'; })]);
  }

  function construireAffichage() {
    var pop = $('#popover-affichage');
    [['optionnormale', 'Normales'], ['optionangles', 'Angles d’incidence et de réfraction'], ['tracergrille', 'Grille'],
      ['attractiongrille', 'Attraction de la grille'], ['afficher_longueurs_segments', 'Longueurs des segments']].forEach(function (c) {
      var i = el('input', { type: 'checkbox', 'data-option': c[0] });
      i.addEventListener('change', function () { basculerOption(c[0]); app.majInterface(); });
      pop.appendChild(el('label', { class: 'interrupteur' }, [i, el('span', { texte: c[1] })]));
    });
    pop.appendChild(el('button', { type: 'button', class: 'item', texte: 'Coordonnées des segments…', onclick: function () { fermerVolets(); OGW.panneauCoordonnees(app); } }));
    var z = el('div', { class: 'zooms', role: 'group', 'aria-label': 'Zoom' }, [el('span', { class: 'etiquette', texte: 'Zoom' })]);
    [1, 2, 5, 10, 20, 50, 100].forEach(function (f) {
      z.appendChild(el('button', { type: 'button', 'data-zoom': String(f), texte: '×' + f, onclick: function () {
        var d = app.dessinateur, v = d.vue(), m = v.versMonde(d.w / 2, d.h / 2);
        if (f === 1) d.toutVoir(); else d.fixerZoom(f, m[0], m[1], d.w / 2, d.h / 2);
        app.majInterface();
      } }));
    });
    pop.appendChild(z);
  }

  function installerPleinEcran() {
    var b = $('[data-action="pleinecran"]');
    var dansCadre = true;
    try { dansCadre = window.self !== window.top; } catch (e) { dansCadre = true; }
    var r = document.documentElement, demander = r.requestFullscreen || r.webkitRequestFullscreen;
    var possible = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    if (dansCadre || !demander || !possible) { b.hidden = true; return; }
    b.hidden = false;
    b.addEventListener('click', function () {
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else { var x = demander.call(r); if (x && x.catch) x.catch(function () { }); }
    });
  }

  function brancherBoutons() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-action],[data-mode],[data-ctx]');
      if (!b || b.disabled) return;
      var a = b.getAttribute('data-action'), m = b.getAttribute('data-mode'), c = b.getAttribute('data-ctx');
      if (m) { fermerVolets(); app.changerMode(m); return; }
      if (c) {
        var id = app.selection;
        switch (c) {
          case 'proprietes': if (id) app.ouvrirProprietes(id); break;
          case 'dupliquer': if (id) app.dupliquer(id); break;
          case 'supprimer': if (id) app.supprimer(id); break;
          case 'grouper': app.changerMode('grouper'); break;
          case 'degrouper': app.degrouper(id); break;
          case 'deselect': app.selection = null; app.groupeChoisi = null; app.majInterface(); app.dessinateur.demander(); break;
        }
        return;
      }
      switch (a) {
        case 'menu': { var ouvert = !$('#menu').hidden; fermerVolets(); if (!ouvert) { $('#menu').hidden = false; b.setAttribute('aria-expanded', 'true'); } break; }
        case 'affichage': { var o2 = !$('#popover-affichage').hidden; fermerVolets(); if (!o2) { $('#popover-affichage').hidden = false; b.setAttribute('aria-expanded', 'true'); app.majInterface(); } break; }
        case 'modes': { var o3 = !$('#popover-modes').hidden; fermerVolets(); if (!o3) { $('#popover-modes').hidden = false; b.setAttribute('aria-expanded', 'true'); } break; }
        case 'annuler': app.annuler(); break;
        case 'refaire': app.retablir(); break;
        case 'zoomplus': app.dessinateur.zoomer(1.5); app.majInterface(); break;
        case 'zoommoins': app.dessinateur.zoomer(1 / 1.5); app.majInterface(); break;
        case 'toutvoir': app.dessinateur.toutVoir(); app.majInterface(); break;
        case 'fermer-panneau': app.fermerPanneau(); break;
        case 'taille-panneau': app.basculerTaillePanneau(); break;
      }
    });
    // un toucher hors des volets les ferme
    document.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('.volet, .menu, .popover, [data-action="menu"], [data-action="affichage"], [data-action="modes"], .onglet')) fermerVolets();
    }, true);
  }

  /* ================================================================== */
  /* Démarrage                                                           */
  /* ================================================================== */
  function demarrer() {
    OGW.$$('[data-icone]').forEach(function (b) { b.insertAdjacentHTML('afterbegin', OGW.icone(b.getAttribute('data-icone'))); });
    // barre de sélection : le libellé sert aussi d'infobulle (il est caché sur un écran de faible hauteur)
    OGW.$$('#barre-contexte button').forEach(function (b) { var t = b.textContent.trim(); b.title = t; b.setAttribute('aria-label', t); });
    canvas = $('#dessin');
    app.dessinateur = new OGW.Dessinateur(canvas, app);
    app.loupe = new OGW.Loupe($('#zone'));
    app.scene = new OptGeo.Scene();
    app.hist = new OptGeo.Historique(app.scene, ETATS_HISTORIQUE);
    construirePalette(); construireMenu(); construireAffichage(); installerPleinEcran(); brancherBoutons();
    canvas.addEventListener('pointerdown', surAppui);
    canvas.addEventListener('pointermove', surMouvement);
    canvas.addEventListener('pointerup', function (e) { surRelache(e, false); });
    canvas.addEventListener('pointercancel', function (e) { surRelache(e, true); });
    canvas.addEventListener('lostpointercapture', function (e) { if (app.pointeurs[e.pointerId]) surRelache(e, false); });
    // filet de sécurité : un lever ou une annulation reçus ailleurs que sur le dessin (phase de
    // remontée, donc après le dessin) retire aussi le doigt de la liste
    ['pointerup', 'pointercancel'].forEach(function (t) {
      document.addEventListener(t, function (e) {
        if (!app.pointeurs[e.pointerId]) return;
        delete app.pointeurs[e.pointerId];
        if (!Object.keys(app.pointeurs).length) app.pincement = null;
      });
    });
    canvas.addEventListener('wheel', surMolette, { passive: false });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && app.creation && !app.geste) { app.creation.visee = null; app.dessinateur.demander(); } });
    document.addEventListener('keydown', surTouche);
    window.addEventListener('beforeunload', function () { app.sauvegarderLocal(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) app.sauvegarderLocal(); });
    var zone = $('#zone');
    function taille() {
      app.majRetrait();
      var change = app.dessinateur.definirReserveHaut(app.mesurerReserveBandeau());
      if (app.dessinateur.redimensionner() || change) app.majInterface();
    }
    if (window.ResizeObserver) new ResizeObserver(taille).observe(zone);
    window.addEventListener('resize', taille);
    taille();

    // reprise du travail en cours, exemple demandé par l'adresse, ou boîte de démarrage
    var exemple = /[#&]exemple=([^&]+)/.exec(location.hash);
    var sauve = OGW.stockage.lire('travail');
    // ménage : les versions précédentes gardaient l'image de fond (jusqu'à plusieurs Mo) dans la sauvegarde
    if (sauve && sauve.fond) { delete sauve.fond; OGW.stockage.ecrire('travail', sauve); }
    OGW.stockage.effacer('fond');
    app.nouvelleSimulation(OGW.espaceParDefaut(app), true);     // sans écraser la sauvegarde avant la réponse
    var aReprendre = !!(sauve && sauve.scene && ((sauve.scene.objets && sauve.scene.objets.length) || sauve.scene.commentaire));
    if (exemple) {
      var f = decodeURIComponent(exemple[1]), e = (window.OPTGEO_EXEMPLES || []).filter(function (x) { return x.fichier === f || x.fichier.split('/').pop() === f; })[0];
      // Lien direct vers un exemple : l'exemple s'ouvre, mais un travail sauvegardé n'est pas écrasé
      // tant que l'élève ne modifie rien, et la boîte « Reprendre le travail en cours ? » le propose
      // (sauf si la sauvegarde n'est que ce même exemple, intact : page rechargée).
      if (e && app.ouvrirTexteOpt(e.opt, e.fichier.split('/').pop(), e.description, { exemple: e.fichier, proteger: aReprendre }) !== false) {
        if (aReprendre && JSON.stringify(app.scene.versJSON()) !== JSON.stringify(sauve.scene)) proposerReprise(sauve, e.fichier.split('/').pop());
        else { app.repriseEnAttente = false; app.sauvegarderLocal(); }
        return;
      }
    }
    if (aReprendre) proposerReprise(sauve, null);
    else OGW.dialogueNouvelle(app, true);
  }
  /**
   * Boîte « Reprendre le travail en cours ? ». Tant que l'élève n'a pas répondu (ou s'il a choisi
   * l'autre bouton sans rien modifier), rien n'est écrit dans la sauvegarde (repriseEnAttente).
   * @param {string|null} exempleOuvert nom de l'exemple ouvert par l'adresse (#exemple=…), ou null
   */
  function proposerReprise(sauve, exempleOuvert) {
    var date = new Date(sauve.date);
    app.repriseEnAttente = true;        // rien n'est écrit dans la sauvegarde avant la réponse de l'élève
    var corps = [el('p', { texte: (sauve.nom || 'Simulation sans nom') + ' : ' + sauve.scene.objets.length + ' élément(s), enregistrée automatiquement sur cet appareil le ' +
      date.toLocaleDateString('fr-FR') + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '.' })];
    if (exempleOuvert) corps.push(el('p', { texte: 'Le lien a ouvert l’exemple «\u00a0' + exempleOuvert + '\u00a0». Si vous le gardez, votre travail reste sauvegardé tant que vous ne modifiez pas l’exemple.' }));
    OGW.Dialogue({ titre: 'Reprendre le travail en cours ?', corps: el('div', {}, corps),
      boutons: [
        // « Nouvelle simulation » (ou Échap) : la sauvegarde reste protégée jusqu'à ce que l'élève
        // crée vraiment une nouvelle simulation ou ouvre un fichier (la boîte suivante peut être fermée).
        // « Garder l'exemple » (ou Échap) : protégée jusqu'à la première modification de l'exemple.
        exempleOuvert ? { texte: 'Garder l’exemple', annuler: true }
          : { texte: 'Nouvelle simulation', annuler: true, action: function () { setTimeout(function () { OGW.dialogueNouvelle(app, true); }, 0); } },
        { texte: 'Reprendre', principal: true, action: function () {
          app.repriseEnAttente = false;
          try {
            var s = OptGeo.Scene.depuisJSON(sauve.scene);
            app.nomFichier = sauve.nom || null;
            app.remplacerScene(s);
            app.modifie = !!sauve.modifie;
            app.majInterface();
          } catch (x) { OGW.message('Sauvegarde illisible : ' + x.message); }
        } }] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
