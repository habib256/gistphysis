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
  app.remplacerScene = function (scene) {
    app.scene = scene;
    app.hist = new OptGeo.Historique(scene, 50);       // 50 niveaux comme OptGeo (maxannulation)
    app.selection = null; app.groupeChoisi = null; app.choixGroupe = [];
    app.dessinateur.toutVoir();
    app.majInterface();
  };
  app.marquerModifie = function () { app.modifie = true; app.sauvegarderBientot(); app.majTitre(); };
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
  app.annuler = function () {
    if (app.geste) app.annulerGeste();
    if (app.hist.annuler()) { app.modifie = true; app.verifierSelection(); app.sauvegarderBientot(); app.majInterface(); app.dessinateur.demander(); }
  };
  app.retablir = function () {
    if (app.hist.retablir()) { app.modifie = true; app.verifierSelection(); app.sauvegarderBientot(); app.majInterface(); app.dessinateur.demander(); }
  };

  var minuterieSauvegarde = null, fondNonGarde = false;
  app.sauvegarderBientot = function () {
    clearTimeout(minuterieSauvegarde);
    minuterieSauvegarde = setTimeout(app.sauvegarderLocal, 400);
  };
  app.sauvegarderLocal = function () {
    clearTimeout(minuterieSauvegarde);
    if (!app.scene) return;
    var d = { v: 1, date: Date.now(), nom: app.nomFichier, modifie: app.modifie, scene: app.scene.versJSON(), fond: null };
    if (app.imageFondURL && app.imageFondURL.length < 3500000) d.fond = app.imageFondURL;
    if (!OGW.stockage.ecrire('travail', d) && d.fond) {
      d.fond = null;
      if (OGW.stockage.ecrire('travail', d) && !fondNonGarde) { fondNonGarde = true; app.signaler('Image de fond trop grande : elle n’est pas gardée dans la sauvegarde automatique.'); }
    }
  };

  app.parametresParDefaut = function (type) {
    var p = JSON.parse(JSON.stringify(app.prefs[type] || {}));
    if (OptGeo.estSource(type) && p.couleur !== undefined && !OGW.COULEURS_RAYON.some(function (c) { return c.v === p.couleur; })) delete p.couleur;
    return p;
  };
  app.ajouterObjet = function (type, p) {
    if (app.scene.objetsDuType(type).length >= MAX_PAR_TYPE) return { ok: false, erreur: 'Nombre maximal de ' + (OGW.NOMS[type] || type).toLowerCase() + ' déjà atteint !' };
    var r = app.scene.ajouter(type, p);
    if (r.ok) app.memoriser();
    return r;
  };
  app.modifierObjet = function (id, p) {
    var r = app.scene.modifier(id, p);
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
    if (!sansSauvegarde) app.sauvegarderLocal();
  };
  app.ouvrirTexteOpt = function (texte, nom, commentaire, extra) {
    var r;
    try { r = OptGeo.lireOpt(texte); } catch (e) {
      OGW.message('Fichier endommagé !!! (' + e.message + ')');
      return;
    }
    r.scene.commentaire = commentaire || '';
    app.nomFichier = nom; app.modifie = false;
    app.definirImageFond(null, true);
    app.remplacerScene(r.scene);
    app.sauvegarderLocal();
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
    if (!url) { app.imageFond = null; if (!silencieux) { app.sauvegarderBientot(); app.dessinateur.demander(); } return; }
    var img = new Image();
    img.onload = function () { app.imageFond = img; app.dessinateur.demander(); app.sauvegarderBientot(); };
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
    app.mode = 'selection';
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
    var c = new OGW.Creation(app, outil);
    c.preparer(function () { app.creation = c; app.mode = 'creation'; app.majInterface(); app.dessinateur.demander(); },
      function () { app.terminerCreation(); });
  };
  app.terminerCreation = function (silencieux) {
    app.creation = null; app.loupeEtat = null; app.loupe.cacher();
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
    app.panneau = o;
    corps.scrollTop = 0;
    app.majRetrait();
    app.majInterface();
  };
  /** Le dessin se recentre dans la partie que le panneau laisse visible. */
  app.majRetrait = function () {
    var p = $('#panneau'), z = $('#zone'), b = $('#bandeau');
    var haut = b.hidden ? 0 : Math.round(b.getBoundingClientRect().height);
    var avant = app.dessinateur.retrait.haut || 0;
    if (haut && avant) haut = Math.max(haut, avant);     // pas de va-et-vient du dessin quand le texte change de longueur
    if (p.hidden) { app.dessinateur.definirRetrait(0, 0, haut); return; }
    var r = p.getBoundingClientRect(), rz = z.getBoundingClientRect();
    if (r.top > rz.top + 10) app.dessinateur.definirRetrait(0, Math.max(0, rz.bottom - r.top), haut);
    else app.dessinateur.definirRetrait(Math.max(0, rz.right - r.left), 0, haut);
  };
  app.fermerPanneau = function () {
    var o = app.panneau;
    if (!o) return;
    app.panneau = null;
    $('#panneau').hidden = true;
    document.body.classList.remove('panneau-ouvert');
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

  /** Bandeau de consigne au-dessus du dessin. */
  app.majBandeau = function () {
    var b = $('#bandeau'), txt = $('#bandeau-texte'), bt = OGW.vider($('#bandeau-boutons'));
    var lignes = [], m = app.mode;
    function bouton(t, f, cls, aria) {
      var x = el('button', { type: 'button', class: cls || '', texte: t, onclick: f });
      if (aria !== undefined) x.setAttribute('aria-pressed', String(aria));
      bt.appendChild(x); return x;
    }
    if (app.geste && app.infoGlisser) lignes.push(app.infoGlisser);
    if (m === 'creation' && app.creation) {
      var c = app.creation;
      lignes.unshift('Mode : ' + c.outil.mode + '. ' + c.consigne());
      if (c.precedent()) {
        bouton('Aligner horizontalement', function () { app.verrouH = !app.verrouH; app.majBandeau(); }, 'bascule', app.verrouH);
        bouton('Aligner verticalement', function () { app.verrouV = !app.verrouV; app.majBandeau(); }, 'bascule', app.verrouV);
      }
      if (c.type === 'polyhedre' && c.points.length >= 3) bouton('Fermer le polygone', function () { c.data.n = c.points.length; app.apresEtape(c.terminer()); });
      var lab = el('label', { class: 'rester' }, [el('input', { type: 'checkbox', checked: app.rester, onchange: function (e) { app.rester = e.target.checked; } }), 'Rester dans ce mode']);
      bt.appendChild(lab);
      bouton('Annuler', function () { app.terminerCreation(); }, 'principal');
    } else if (m !== 'selection') {
      var consignes = {
        deplacer: 'Faites glisser une poignée : croix verte = déplacer, cercle bleu = déplacer ce point, disque rouge = tourner, croix cyan = foyer ou centre.',
        proprietes: 'Touchez l’élément dont vous voulez les propriétés.', dupliquer: 'Touchez l’élément à dupliquer.',
        supprimer: 'Touchez l’élément à supprimer.',
        grouper: 'Touchez les éléments à grouper (' + app.choixGroupe.length + ' choisi' + (app.choixGroupe.length > 1 ? 's' : '') + '), puis « Terminer ».'
      };
      lignes.unshift(NOMS_MODES[m] + ' ' + consignes[m]);
      if (m === 'grouper') bouton('Annuler', function () { app.choixGroupe = []; app.mode = 'selection'; app.majInterface(); app.dessinateur.demander(); });
      bouton(m === 'dupliquer' || m === 'supprimer' ? 'Annuler' : 'Terminer', function () { app.terminerMode(); }, 'principal');
    } else if (app.modeNumeros === 'fantomes') {
      lignes.unshift('Touchez un segment de rayon pour le cacher ou le montrer.');
    } else if (app.derniereTape && app.derniereTape.candidats.length > 1 && app.selection) {
      lignes.unshift((app.derniereTape.index + 1) + ' sur ' + app.derniereTape.candidats.length + ' éléments ici : touchez encore au même endroit pour passer au suivant.');
    }
    if (app.geste && (app.geste.kind === 'poignee' || app.geste.kind === 'corps' || app.geste.kind === 'groupe')) {
      bt.appendChild(el('button', { type: 'button', class: 'bascule', 'aria-pressed': String(app.verrouH), texte: 'Bloquer horizontalement', onclick: function () { app.verrouH = !app.verrouH; app.majBandeau(); } }));
      bt.appendChild(el('button', { type: 'button', class: 'bascule', 'aria-pressed': String(app.verrouV), texte: 'Bloquer verticalement', onclick: function () { app.verrouV = !app.verrouV; app.majBandeau(); } }));
    }
    if (app.coordTexte && (m === 'creation' || app.geste)) lignes.push(app.coordTexte);
    txt.textContent = lignes.join(' — ');
    b.hidden = !lignes.length && !bt.firstChild;
    // la scène se place sous le bandeau ; on ne la redécale pas pendant un geste (le point resterait sous le doigt)
    if (!app.geste) app.majRetrait();
  };

  /** État des boutons, barre contextuelle, cases d'affichage, titre. */
  app.majInterface = function () {
    if (!app.scene) return;
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
      var dansGroupe = sel ? app.scene.groupesDe(app.selection).length > 0 : true;
      $('[data-ctx="proprietes"]').hidden = !sel; $('[data-ctx="dupliquer"]').hidden = !sel; $('[data-ctx="supprimer"]').hidden = !sel;
      $('[data-ctx="grouper"]').hidden = !sel; $('[data-ctx="degrouper"]').hidden = !dansGroupe;
    }
    app.majBandeau();
    app.majTitre();
  };

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
  app.apresDessin = function () {
    var l = app.loupeEtat;
    if (l) app.loupe.montrer(app.dessinateur.canvas, app.dessinateur.dpr, l.px, l.py, l.texte, app.dessinateur.w);
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
        if (d <= tol && (!meilleur || d + bonus < meilleur.d)) meilleur = { id: id, nom: h.nom, d: d + bonus };
      });
    });
    var groupes = app.mode === 'deplacer' ? s.groupes.map(function (g, i) { return i; }) :
      (app.selection ? s.groupesDe(app.selection) : (app.groupeChoisi !== null ? [app.groupeChoisi] : []));
    groupes.forEach(function (i) {
      var c = s.centre(s.groupes[i].membres), e = vue.versEcran(c.x, c.y), d = Math.hypot(e[0] - p.x, e[1] - p.y);
      if (d <= tol && (!meilleur || d < meilleur.d)) meilleur = { groupe: i, d: d };
    });
    return meilleur;
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
        var px = Math.round(g.policesize * 96 / 72), e = vue.versEcran(g.x, g.y);
        mesureTexte.font = px + 'px sans-serif';
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
    if (c.attraction()) m = grille(m);
    var prec = c.precedent();
    if (prec) {
      if (app.verrouV || (e && e.altKey)) m.x = prec.x;
      if (app.verrouH || (e && (e.ctrlKey || e.metaKey))) m.y = prec.y;
    }
    return c.contraindre(m);
  }
  function montrerLoupe(p, m, type) {
    if (type === 'mouse') { app.loupeEtat = null; app.loupe.cacher(); return; }
    var v = app.dessinateur.vue().versEcran(m.x, m.y);
    app.loupeEtat = { px: v[0], py: v[1], texte: texteCoord(m).replace(', Y', '\nY') };
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
    if (app.verrouV || (mod && mod.alt)) pt.x = ref.x;
    if (app.verrouH || (mod && mod.ctrl)) pt.y = ref.y;
    return pt;
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
    app.geste = null; app.infoGlisser = ''; app.loupeEtat = null; app.loupe.cacher();
    if (app.creation) app.creation.visee = null;
    app.majInterface(); app.dessinateur.demander();
  };

  function surAppui(e) {
    if (OGW.dialogueOuvert()) return;
    var p = pos(e);
    app.dernierType = e.pointerType || 'mouse';
    try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
    app.pointeurs[e.pointerId] = { x: p.x, y: p.y };
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
    var g = app.geste = { kind: 'vide', x0: p.x, y0: p.y, dernier: p, bouge: false, type: e.pointerType };
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
    var seuil = g.type === 'mouse' ? 4 : 10;
    if (!g.bouge && Math.hypot(p.x - g.x0, p.y - g.y0) > seuil) g.bouge = true;
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
    var p = pos(e);
    delete app.pointeurs[e.pointerId];
    if (app.pincement) {
      if (!Object.keys(app.pointeurs).length) app.pincement = null;
      app.geste = null;
      return;
    }
    var g = app.geste;
    if (!g) return;
    if (annule) { app.annulerGeste(); return; }
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
        if (rafGlisser) { window.cancelAnimationFrame(rafGlisser); rafGlisser = null; appliquerGlisser(); }
        app.infoGlisser = '';
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
        case 'proprietes': app.ouvrirProprietes(id); break;          // le mode reste actif (« Fin prop. »)
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
      var b = el('button', { type: 'button', class: 'onglet', 'aria-expanded': 'false', 'aria-controls': 'volet', 'data-famille': f.id,
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
      itemMenu('Supprimer un élément', function () { app.changerMode('supprimer'); }, { raccourci: 'Suppr' }),
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
      aj('Miroir conique', 'miroirconique'), aj('Polyèdre réfractant', 'polyhedre'), aj('Sphère réfractante', 'sphere'), aj('Prisme', 'prisme'),
      aj('Lentille épaisse', 'lec'), aj('Polysphère réfractante', 'polycercle'),
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
    canvas = $('#dessin');
    app.dessinateur = new OGW.Dessinateur(canvas, app);
    app.loupe = new OGW.Loupe($('#zone'));
    app.scene = new OptGeo.Scene();
    app.hist = new OptGeo.Historique(app.scene, 50);
    construirePalette(); construireMenu(); construireAffichage(); installerPleinEcran(); brancherBoutons();
    canvas.addEventListener('pointerdown', surAppui);
    canvas.addEventListener('pointermove', surMouvement);
    canvas.addEventListener('pointerup', function (e) { surRelache(e, false); });
    canvas.addEventListener('pointercancel', function (e) { surRelache(e, true); });
    canvas.addEventListener('lostpointercapture', function (e) { if (app.pointeurs[e.pointerId]) surRelache(e, false); });
    canvas.addEventListener('wheel', surMolette, { passive: false });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && app.creation && !app.geste) { app.creation.visee = null; app.dessinateur.demander(); } });
    document.addEventListener('keydown', surTouche);
    window.addEventListener('beforeunload', function () { app.sauvegarderLocal(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) app.sauvegarderLocal(); });
    var zone = $('#zone');
    function taille() { app.majRetrait(); if (app.dessinateur.redimensionner()) app.majInterface(); }
    if (window.ResizeObserver) new ResizeObserver(taille).observe(zone);
    window.addEventListener('resize', taille);
    taille();

    // reprise du travail en cours, exemple demandé par l'adresse, ou boîte de démarrage
    var exemple = /[#&]exemple=([^&]+)/.exec(location.hash);
    var sauve = OGW.stockage.lire('travail');
    app.nouvelleSimulation(OGW.espaceParDefaut(app), true);     // sans écraser la sauvegarde avant la réponse
    if (exemple) {
      var f = decodeURIComponent(exemple[1]), e = (window.OPTGEO_EXEMPLES || []).filter(function (x) { return x.fichier === f || x.fichier.split('/').pop() === f; })[0];
      if (e) { app.ouvrirTexteOpt(e.opt, e.fichier.split('/').pop(), e.description, { exemple: e.fichier }); return; }
    }
    if (sauve && sauve.scene && ((sauve.scene.objets && sauve.scene.objets.length) || sauve.scene.commentaire)) {
      var date = new Date(sauve.date);
      OGW.Dialogue({ titre: 'Reprendre le travail en cours ?', corps: el('div', {}, [
        el('p', { texte: (sauve.nom || 'Simulation sans nom') + ' : ' + sauve.scene.objets.length + ' élément(s), enregistrée automatiquement sur cet appareil le ' +
          date.toLocaleDateString('fr-FR') + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '.' })]),
      boutons: [
        { texte: 'Nouvelle simulation', annuler: true, action: function () { setTimeout(function () { OGW.dialogueNouvelle(app, true); }, 0); } },
        { texte: 'Reprendre', principal: true, action: function () {
          try {
            var s = OptGeo.Scene.depuisJSON(sauve.scene);
            app.nomFichier = sauve.nom || null;
            app.remplacerScene(s);
            app.modifie = !!sauve.modifie;
            if (sauve.fond) app.definirImageFond(sauve.fond, true);
            app.majInterface();
          } catch (x) { OGW.message('Sauvegarde illisible : ' + x.message); }
        } }] });
    } else OGW.dialogueNouvelle(app, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
