/*
 * OptGeo web — interface, partie 5 : boîtes de dialogue et fenêtres annexes.
 *
 * Boîte générique (grande, au doigt, avec « Annuler »), puis les fenêtres
 * d'OptGeo 3.03 (SPEC-INTERFACE.md §11) : nouvelle simulation et espace de
 * travail, exemples, ouvrir / superposer / enregistrer, exports, grille,
 * normales, indices du milieu ambiant et longueurs d'onde, empennage, surfaces
 * d'onde, fond, préférences, coordonnées des segments, segments fantômes,
 * commentaire, à propos.
 */
(function () {
  'use strict';
  var OGW = window.OGW, OptGeo = window.OptGeo, el = OGW.el, N = OGW.nombre;

  /* ================================================================== */
  /* Boîte générique                                                     */
  /* ================================================================== */
  var pile = [];
  /**
   * @param {object} o {titre, corps (Node), boutons: [{texte, principal, annuler, classe, action(): false pour garder ouvert}], focus, large}
   */
  OGW.Dialogue = function (o) {
    var voile = el('div', { class: 'voile' });
    var titreId = 'dlg' + Math.random().toString(36).slice(2);
    var boite = el('div', { class: 'dialogue' + (o.large ? ' large' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titreId });
    boite.appendChild(el('h2', { id: titreId, texte: o.titre || '' }));
    var corps = el('div', { class: 'corps' });
    if (o.corps) corps.appendChild(typeof o.corps === 'string' ? el('p', { texte: o.corps }) : o.corps);
    boite.appendChild(corps);
    var pied = el('div', { class: 'pied' });
    var dlg = { voile: voile, boite: boite, corps: corps, fermer: fermer };
    var precedentFocus = document.activeElement;
    (o.boutons || [{ texte: 'Fermer', principal: true }]).forEach(function (b) {
      var bt = el('button', { type: 'button', class: (b.principal ? 'principal ' : '') + (b.classe || ''), html: (b.icone ? OGW.icone(b.icone) : '') + '<span></span>' });
      bt.querySelector('span').textContent = b.texte;
      bt.addEventListener('click', function () {
        var r = b.action ? b.action(dlg) : undefined;
        if (r !== false) fermer();
      });
      if (b.annuler) dlg.annuler = function () { if (b.action) b.action(dlg); fermer(); };
      if (b.principal) dlg.principal = bt;
      pied.appendChild(bt);
    });
    if (!dlg.annuler) dlg.annuler = fermer;
    boite.appendChild(pied);
    voile.appendChild(boite);
    document.body.appendChild(voile);
    pile.push(dlg);
    boite.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && dlg.principal && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); dlg.principal.click(); }
    });
    setTimeout(function () {
      var f = o.focus || boite.querySelector('input:not([type=radio]):not([type=checkbox]),select,textarea') || dlg.principal;
      try { if (f && !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches && f.tagName === 'INPUT')) f.focus(); else boite.focus(); } catch (e) { /* rien */ }
    }, 30);
    boite.tabIndex = -1;
    function fermer() {
      voile.remove();
      var i = pile.indexOf(dlg); if (i >= 0) pile.splice(i, 1);
      if (o.surFermeture) o.surFermeture();
      try { if (precedentFocus && precedentFocus.focus) precedentFocus.focus(); } catch (e) { /* rien */ }
    }
    return dlg;
  };
  OGW.dialogueOuvert = function () { return pile.length > 0; };
  /** Échap : ferme la dernière boîte (comme « Annuler »). */
  OGW.fermerDernierDialogue = function () { var d = pile[pile.length - 1]; if (d) { d.annuler(); return true; } return false; };

  OGW.message = function (texte, titre) { return OGW.Dialogue({ titre: titre || 'Attention !', corps: texte, boutons: [{ texte: 'OK', principal: true }] }); };
  OGW.confirmer = function (texte, oui, o) {
    o = o || {};
    return OGW.Dialogue({ titre: o.titre || 'Confirmation', corps: texte, boutons: [
      { texte: o.non || 'Non', annuler: true, action: function () { if (o.siNon) o.siNon(); } },
      { texte: o.oui || 'Oui', principal: true, classe: o.danger ? 'danger' : '', action: function () { oui(); } }] });
  };
  /** Petite boîte à un nombre (nombre de rayons, de sommets, diamètre…). */
  OGW.demanderNombre = function (o) {
    var champ, lire;
    if (o.decimal) {
      var inp = el('input', { type: 'text', inputmode: 'decimal', value: String(o.valeur), 'aria-label': o.texte });
      champ = el('span', { class: 'saisie' }, [inp, o.unite ? el('span', { class: 'unite', texte: o.unite }) : null]);
      lire = function () { var v = OGW.lireNombre(inp.value); return v > 0 ? v : NaN; };
    } else {
      var c = OGW.champEntier(o.valeur, o.min, o.max);
      c.input.setAttribute('aria-label', o.texte);
      champ = c.element; lire = c.lire;
    }
    var err = el('p', { class: 'erreur-champ', hidden: true });
    OGW.Dialogue({ titre: o.titre, corps: el('div', { class: 'formulaire' }, [el('p', { texte: o.texte }), champ,
      o.decimal ? null : el('p', { class: 'note', texte: 'De ' + o.min + ' à ' + o.max + '.' }), err]),
    boutons: [
      { texte: 'Annuler', annuler: true, action: function () { if (o.annuler) o.annuler(); } },
      { texte: 'Valider', principal: true, action: function () {
        var v = lire();
        if (!isFinite(v)) { err.textContent = 'Valeur inacceptable.'; err.hidden = false; return false; }
        o.ok(v);
      } }] });
  };

  /** Champ nombre simple (avec unité) pour les boîtes d'options. */
  function champ(lib, valeur, unite) {
    var id = 'o' + Math.random().toString(36).slice(2);
    var inp = el('input', { type: 'text', inputmode: 'decimal', id: id, value: valeur });
    return { input: inp, el: el('div', { class: 'champ' }, [el('label', { for: id, texte: lib }), el('span', { class: 'saisie' }, [inp, unite ? el('span', { class: 'unite', texte: unite }) : null])]),
      lire: function () { return OGW.lireNombre(inp.value); } };
  }
  function interrupteur(lib, coche) {
    var i = el('input', { type: 'checkbox', checked: !!coche });
    return { input: i, el: el('div', { class: 'champ case' }, [el('label', { class: 'interrupteur' }, [i, el('span', { texte: lib })])]) };
  }
  function erreurDans(corps) {
    var e = corps.querySelector('.erreur-generale');
    if (!e) { e = el('p', { class: 'erreur-generale', role: 'alert' }); corps.appendChild(e); }
    return function (t) { e.textContent = t; e.hidden = !t; return false; };
  }

  /* ================================================================== */
  /* Nouvelle simulation, espace de travail                              */
  /* ================================================================== */
  var UNITES = ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm', 'µm'];
  /** Espace par défaut : largeur 1000, hauteur au « rapport idéal » de la zone de dessin. */
  OGW.espaceParDefaut = function (app) {
    var d = app.dessinateur, r = (d.h - 16) / Math.max(1, d.w - 16);
    if (!(r > 0.2 && r < 5)) r = 0.7;
    return { xxmin: 0, xxmax: 1000, yymin: 0, yymax: Math.round(1000 * r) };
  };
  /** Boîte de démarrage « Que voulez-vous faire ? » (saisiech) / Nouvelle simulation. */
  OGW.dialogueNouvelle = function (app, demarrage) {
    var nomg = 'nv' + Math.random().toString(36).slice(2);
    var choix = el('div', { class: 'radios' }, [
      el('label', { class: 'radio' }, [el('input', { type: 'radio', name: nomg, value: 'defaut', checked: true }), 'Nouvelle simulation, espace de travail par défaut']),
      el('label', { class: 'radio' }, [el('input', { type: 'radio', name: nomg, value: 'definir' }), 'Nouvelle simulation en choisissant les dimensions de l’espace de travail']),
      el('label', { class: 'radio' }, [el('input', { type: 'radio', name: nomg, value: 'exemple' }), 'Ouvrir un exemple d’OptGeo'])]);
    var e = OGW.espaceParDefaut(app);
    var xmin = champ('Abscisse minimale', '0'), xmax = champ('Abscisse maximale', String(e.xxmax));
    var ymin = champ('Ordonnée minimale', '0'), ymax = champ('Ordonnée maximale', String(e.yymax));
    var respect = interrupteur('Respecter le rapport hauteur/largeur (repère orthonormé : les angles à l’écran sont justes)', true);
    var nomu = 'u' + Math.random().toString(36).slice(2), unites = el('div', { class: 'radios en-ligne' });
    UNITES.forEach(function (u) { unites.appendChild(el('label', { class: 'radio' }, [el('input', { type: 'radio', name: nomu, value: u, checked: u === 'mm' }), u])); });
    var espace = el('fieldset', { class: 'champ', hidden: true }, [el('legend', { texte: 'Dimensions de l’espace de travail' }),
      el('div', { class: 'grille-2' }, [xmin.el, xmax.el, ymin.el, ymax.el]), respect.el, el('p', { class: 'etiquette', texte: 'Unité de longueur' }), unites,
      el('p', { class: 'note', texte: 'L’unité n’est qu’une étiquette : elle ne convertit pas les valeurs.' })]);
    var ir = champ('Rouge', '1'), iv = champ('Vert', '1'), ib = champ('Bleu', '1');
    var indices = el('fieldset', { class: 'champ' }, [el('legend', { texte: 'Indices du milieu ambiant' }), el('div', { class: 'grille-3' }, [ir.el, iv.el, ib.el])]);
    choix.addEventListener('change', function () {
      var v = choix.querySelector('input:checked').value;
      espace.hidden = v !== 'definir'; indices.hidden = v === 'exemple';
    });
    var corps = el('div', { class: 'formulaire' }, [choix, espace, indices]);
    var erreur = erreurDans(corps);
    OGW.Dialogue({ titre: demarrage ? 'Que voulez-vous faire ?' : 'Nouvelle simulation', corps: corps, boutons: [
      { texte: 'Annuler', annuler: true, action: function () { if (demarrage && !app.scene.objets.length) app.nouvelleSimulation(OGW.espaceParDefaut(app)); } },
      { texte: 'Valider', principal: true, action: function () {
        var v = choix.querySelector('input:checked').value;
        if (v === 'exemple') { setTimeout(function () { OGW.dialogueExemples(app, 'ouvrir'); }, 0); if (!app.scene.objets.length && demarrage) app.nouvelleSimulation(OGW.espaceParDefaut(app)); return; }
        var ind = [ir.lire(), iv.lire(), ib.lire()].map(Math.abs);
        if (!ind.every(function (x) { return x > 0; })) return erreur('Valeur illégale d’un indice du milieu ambiant.');
        var esp = OGW.espaceParDefaut(app), unite = 'mm', resp = true;
        if (v === 'definir') {
          esp = { xxmin: xmin.lire(), xxmax: xmax.lire(), yymin: ymin.lire(), yymax: ymax.lire() };
          if (![esp.xxmin, esp.xxmax, esp.yymin, esp.yymax].every(isFinite)) return erreur('Expression illégale dans les dimensions.');
          if (esp.xxmax <= esp.xxmin) return erreur('Valeur nulle ou négative interdite pour la largeur (xmax doit être supérieur à xmin).');
          if (esp.yymax <= esp.yymin) return erreur('Valeur nulle ou négative interdite pour la hauteur (ymax doit être supérieur à ymin).');
          unite = espace.querySelector('input[name="' + nomu + '"]:checked').value; resp = respect.input.checked;
        }
        app.nouvelleSimulation(Object.assign(esp, { unitelongueur: unite, respectrapport: resp,
          indice_rouge_par_defaut: ind[0], indice_vert_par_defaut: ind[1], indice_bleu_par_defaut: ind[2] }));
      } }] });
  };

  /** Fichier › Modifier l'espace de travail › Manuellement. */
  OGW.dialogueEspace = function (app) {
    var o = app.scene.options, u = o.unitelongueur;
    var xmin = champ('Abscisse min.', N(o.xxmin, 10), u), xmax = champ('Abscisse max.', N(o.xxmax, 10), u);
    var ymin = champ('Ordonnée min.', N(o.yymin, 10), u), ymax = champ('Ordonnée max.', N(o.yymax, 10), u);
    var respect = interrupteur('Respecter le rapport hauteur/largeur pour avoir un repère orthonormé', o.respectrapport);
    var corps = el('div', { class: 'formulaire' }, [el('div', { class: 'grille-2' }, [xmin.el, xmax.el, ymin.el, ymax.el]), respect.el]);
    var erreur = erreurDans(corps);
    OGW.Dialogue({ titre: 'Modifier l’espace de travail', corps: corps, boutons: [
      { texte: 'Annuler', annuler: true },
      { texte: 'Valider', principal: true, action: function () {
        var c = { xxmin: xmin.lire(), xxmax: xmax.lire(), yymin: ymin.lire(), yymax: ymax.lire(), respectrapport: respect.input.checked };
        if (![c.xxmin, c.xxmax, c.yymin, c.yymax].every(isFinite)) return erreur('Expression illégale.');
        if (c.xxmax <= c.xxmin) return erreur('xmax doit être supérieur à xmin !');
        if (c.yymax <= c.yymin) return erreur('ymax doit être supérieur à ymin !');
        // le pas de la grille est mis à l'échelle
        c.grillex = o.grillex * (c.xxmax - c.xxmin) / (o.xxmax - o.xxmin);
        c.grilley = o.grilley * (c.yymax - c.yymin) / (o.yymax - o.yymin);
        var r = app.scene.modifierOptions(c);
        if (!r.ok) return erreur('Un au moins des objets actuels ne rentre pas sur ce nouvel espace de travail ! (' +
          r.ids.map(function (id) { return OGW.nomObjet(app.scene, id); }).join(', ') + ')');
        app.dessinateur.toutVoir(); app.memoriser(); app.majInterface();
      } }] });
  };
  /** Ajuster automatiquement à la plus petite taille (pas de 1 % par bord, xmin, xmax, ymin, ymax). */
  OGW.ajusterEspace = function (app) {
    var s = app.scene;
    if (!s.objets.length) { app.signaler('Aucun objet : rien à ajuster.'); return; }
    ['xxmin', 'xxmax', 'yymin', 'yymax'].forEach(function (b) {
      for (var i = 0; i < 400; i++) {
        var o = s.options, ax = b[0] === 'x' ? o.xxmax - o.xxmin : o.yymax - o.yymin, pas = ax / 100, c = {};
        c[b] = o[b] + (/min$/.test(b) ? pas : -pas);
        if (!s.modifierOptions(c).ok) break;
      }
    });
    app.dessinateur.toutVoir(); app.memoriser(); app.majInterface();
    app.signaler('Espace de travail ajusté.');
  };

  /* ================================================================== */
  /* Exemples, fichiers                                                  */
  /* ================================================================== */
  OGW.dialogueExemples = function (app, mode) {
    var ex = window.OPTGEO_EXEMPLES || [];
    var recherche = el('input', { type: 'search', placeholder: 'Rechercher un exemple', 'aria-label': 'Rechercher un exemple' });
    var liste = el('div', { class: 'liste-exemples' });
    var apercu = el('div', { class: 'apercu-exemple' }, [el('p', { class: 'note', texte: 'Choisissez un exemple pour lire sa description.' })]);
    var choisi = null, boutonOk;
    function remplir() {
      OGW.vider(liste);
      var q = recherche.value.trim().toLowerCase(), cat = null, grp = null;
      ex.forEach(function (e, i) {
        if (q && (e.titre + ' ' + e.categorie + ' ' + e.description + ' ' + e.fichier).toLowerCase().indexOf(q) < 0) return;
        if (e.categorie !== cat) { cat = e.categorie; grp = el('div', { class: 'groupe-exemples' }, [el('h3', { texte: cat })]); liste.appendChild(grp); }
        var b = el('button', { type: 'button', class: 'exemple', 'data-index': String(i), 'aria-pressed': String(choisi === i) }, [el('span', { texte: e.titre }), el('small', { texte: e.fichier.split('/').pop() })]);
        b.addEventListener('click', function () { choisir(i); });
        b.addEventListener('dblclick', function () { choisir(i); boutonOk.click(); });
        grp.appendChild(b);
      });
      if (!liste.firstChild) liste.appendChild(el('p', { class: 'note', texte: 'Aucun exemple ne correspond.' }));
    }
    function choisir(i) {
      choisi = i;
      OGW.$$('.exemple', liste).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-index') === i)); });
      var e = ex[i];
      OGW.vider(apercu);
      apercu.appendChild(el('h3', { texte: e.titre }));
      apercu.appendChild(el('pre', { class: 'description', texte: e.description || 'Pas de description pour cet exemple.' }));
      boutonOk.disabled = false;
    }
    recherche.addEventListener('input', remplir);
    var corps = el('div', { class: 'exemples' }, [recherche, el('div', { class: 'deux-colonnes' }, [liste, apercu])]);
    var d = OGW.Dialogue({ titre: mode === 'superposer' ? 'Superposer un exemple' : 'Ouvrir un exemple d’OptGeo', corps: corps, large: true, boutons: [
      { texte: 'Annuler', annuler: true },
      { texte: mode === 'superposer' ? 'Superposer' : 'Ouvrir', principal: true, action: function () {
        if (choisi === null) return false;
        var e = ex[choisi];
        if (mode === 'superposer') OGW.superposerTexte(app, e.opt);
        else app.ouvrirTexteOpt(e.opt, e.fichier.split('/').pop(), e.description, { exemple: e.fichier });
      } }] });
    boutonOk = d.principal; boutonOk.disabled = true;
    remplir();
  };

  /** Ouvrir un fichier de l'appareil (.opt, et son .txt de commentaire). */
  OGW.ouvrirFichier = function (app, superposer) {
    var inp = el('input', { type: 'file', accept: '.opt,.txt,text/plain', multiple: true, style: { display: 'none' } });
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var fichiers = Array.prototype.slice.call(inp.files || []);
      inp.remove();
      var opt = fichiers.filter(function (f) { return /\.opt$/i.test(f.name); })[0];
      if (!opt) { if (fichiers.length) OGW.message('Choisissez un fichier .opt (vous pouvez choisir en même temps son .txt de commentaire).', 'Fichier inaccessible !'); return; }
      var base = opt.name.replace(/\.opt$/i, '');
      var txt = fichiers.filter(function (f) { return f.name.toLowerCase() === (base + '.txt').toLowerCase(); })[0];
      lireOctets(opt, function (texteOpt) {
        if (texteOpt === null) { OGW.message('Fichier inaccessible en lecture !'); return; }
        if (superposer) { OGW.superposerTexte(app, texteOpt); return; }
        if (txt) lireOctets(txt, function (c) { app.ouvrirTexteOpt(texteOpt, opt.name, c || ''); });
        else app.ouvrirTexteOpt(texteOpt, opt.name, '');
      });
    });
    inp.click();
  };
  function lireOctets(f, rappel) {
    var r = new FileReader();
    r.onload = function () { try { rappel(OptGeo.depuisOctets(new Uint8Array(r.result))); } catch (e) { rappel(null); } };
    r.onerror = function () { rappel(null); };
    r.readAsArrayBuffer(f);
  }
  /** Superposer une simulation : question sur les paramètres, puis groupe des objets importés. */
  OGW.superposerTexte = function (app, texte) {
    if (!app.scene.objets.length) { OGW.message('Pas de simulation en cours…', 'Hélas'); return; }
    OGW.Dialogue({ titre: 'Superposer une simulation', corps: 'Les paramètres de la simulation en cours de chargement doivent-ils écraser les actuels ?', boutons: [
      { texte: 'Annuler', annuler: true },
      { texte: 'Non', action: function () { faire(false); } },
      { texte: 'Oui', principal: true, action: function () { faire(true); } }] });
    function faire(ecraser) {
      var r;
      try { r = OptGeo.superposerOpt(app.scene, texte, { ecraserOptions: ecraser }); } catch (e) { OGW.message('Fichier endommagé !!! (' + e.message + ')'); app.scene.invalider(); app.dessinateur.demander(); return; }
      app.memoriser(); app.dessinateur.toutVoir(); app.majInterface();
      OGW.message('Un nouveau groupe contenant les éléments ajoutés vient d’être créé (' + r.ids.length + ' éléments).' +
        (r.avertissements.length ? '\n' + r.avertissements.join('\n') : ''), 'Importation réussie');
    }
  };

  /** Enregistrer sous : nom du fichier, puis téléchargement du .opt (et du .txt s'il y a un commentaire). */
  OGW.dialogueEnregistrer = function (app) {
    var nom = el('input', { type: 'text', value: (app.nomFichier || 'simulation.opt').replace(/\.opt$/i, ''), 'aria-label': 'Nom du fichier', autocomplete: 'off' });
    var corps = el('div', { class: 'formulaire' }, [el('div', { class: 'champ' }, [el('label', { texte: 'Nom du fichier' }), el('span', { class: 'saisie' }, [nom, el('span', { class: 'unite', texte: '.opt' })])]),
      el('p', { class: 'note', texte: 'Le fichier .opt est téléchargé sur cet appareil (dossier des téléchargements). Il s’ouvre aussi dans OptGeo 3.03 sur ordinateur.' + (app.scene.commentaire ? ' Le commentaire est enregistré à part dans un fichier .txt de même nom.' : '') })]);
    OGW.Dialogue({ titre: 'Enregistrer la simulation', corps: corps, focus: nom, boutons: [
      { texte: 'Annuler', annuler: true },
      { texte: 'Enregistrer', principal: true, icone: 'enregistrer', action: function () {
        var n = nom.value.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'simulation';
        app.enregistrerSous(n + '.opt');
      } }] });
  };

  OGW.dialogueExporter = function (app) {
    var base = (app.nomFichier || 'simulation').replace(/\.opt$/i, '');
    OGW.Dialogue({ titre: 'Exporter le dessin', corps: el('div', { class: 'formulaire' }, [
      el('p', { texte: 'Image de tout l’espace de travail, rayons compris.' }),
      el('p', { class: 'note', texte: 'PNG : image (2000 pixels de large). SVG : dessin vectoriel, net à toute taille, pour les fiches et le traitement de texte.' })]),
    boutons: [
      { texte: 'Annuler', annuler: true },
      { texte: 'SVG', icone: 'image', action: function () { app.exporterSVG(base + '.svg'); } },
      { texte: 'PNG', principal: true, icone: 'image', action: function () { app.exporterPNG(base + '.png'); } }] });
  };

  /* ================================================================== */
  /* Options                                                             */
  /* ================================================================== */
  OGW.dialogueGrille = function (app) {
    var o = app.scene.options, u = o.unitelongueur;
    var gx = champ('Pas horizontal', N(o.grillex, 10), u), gy = champ('Pas vertical', N(o.grilley, 10), u);
    var att = interrupteur('Attraction de la grille', o.attractiongrille), aff = interrupteur('Afficher la grille', o.tracergrille);
    var avert = el('p', { class: 'note avertissement', hidden: true });
    var corps = el('div', { class: 'formulaire' }, [gx.el, gy.el, att.el, aff.el, avert]);
    var erreur = erreurDans(corps), confirme = false;
    OGW.Dialogue({ titre: 'Propriétés de la grille', corps: corps, boutons: [
      { texte: 'Annuler', annuler: true },
      { texte: 'Valider', principal: true, action: function () {
        var x = Math.abs(gx.lire()), y = Math.abs(gy.lire());
        if (!(x > 0)) return erreur('Valeur du pas horizontal illégale !');
        if (!(y > 0)) return erreur('Valeur du pas vertical illégale !');
        var lx = o.xxmax - o.xxmin, ly = o.yymax - o.yymin;
        if (!confirme && (x < lx / 1000 || x > lx / 3 || y < ly / 1000 || y > ly / 3)) {
          avert.textContent = 'Valeur du pas très faible ou très forte. Validez encore pour la garder quand même.'; avert.hidden = false; confirme = true; return false;
        }
        app.changerOptions({ grillex: x, grilley: y, attractiongrille: att.input.checked, tracergrille: aff.input.checked }, false);
      } }] });
  };

  OGW.dialogueNormales = function (app) {
    var o = app.scene.options;
    var tr = interrupteur('Tracer les normales', o.optionnormale);
    var ep = OGW.champEntier(o.epaisseurnormale, 1, 10), lg = OGW.champEntier(Math.max(1, Math.trunc(o.pourcentagenormale * 100)), 1, 100);
    var coul = OGW.champCouleur(o.couleurnormale);
    var an = interrupteur('Afficher les valeurs des angles (en degrés)', o.optionangles), dec = OGW.champEntier(o.decimalesangles, 0, 8);
    function maj() { if (an.input.checked) tr.input.checked = true; tr.input.disabled = an.input.checked; }
    an.input.addEventListener('change', maj); maj();
    var corps = el('div', { class: 'formulaire' }, [tr.el,
      el('div', { class: 'champ' }, [el('label', { texte: 'Épaisseur de la trace (pixels)' }), ep.element]),
      el('div', { class: 'champ' }, [el('span', { class: 'etiquette', texte: 'Couleur de la trace' }), coul.element]),
      el('div', { class: 'champ' }, [el('label', { texte: 'Longueur de la trace (en % de la diagonale de l’espace de travail)' }), lg.element]),
      an.el, el('p', { class: 'note', texte: 'L’affichage des angles impose le tracé des normales. L’angle de réflexion n’est pas affiché.' }),
      el('div', { class: 'champ' }, [el('label', { texte: 'Nombre de décimales des angles' }), dec.element])]);
    var erreur = erreurDans(corps);
    OGW.Dialogue({ titre: 'Options pour le tracé des normales aux dioptres et miroirs', corps: corps, boutons: [
      { texte: 'Annuler', annuler: true },
      { texte: 'Valider', principal: true, action: function () {
        var e = ep.lire(), l = lg.lire(), d = dec.lire();
        if (![e, l, d].every(isFinite)) return erreur('Valeur inacceptable.');
        app.changerOptions({ optionnormale: tr.input.checked || an.input.checked, optionangles: an.input.checked, epaisseurnormale: e,
          pourcentagenormale: l / 100, couleurnormale: coul.lire(), decimalesangles: d }, false);
      } }] });
  };

  OGW.dialogueIndices = function (app) {
    var o = app.scene.options;
    var ir = champ('Rouge', N(o.indice_rouge_par_defaut, 8)), iv = champ('Vert', N(o.indice_vert_par_defaut, 8)), ib = champ('Bleu', N(o.indice_bleu_par_defaut, 8));
    var lr = champ('Rouge', N(o.longueur_donde_red * 1e9, 6), 'nm'), lv = champ('Vert', N(o.longueur_donde_green * 1e9, 6), 'nm'), lb = champ('Bleu', N(o.longueur_donde_blue * 1e9, 6), 'nm');
    var corps = el('div', { class: 'formulaire' }, [
      el('fieldset', { class: 'champ' }, [el('legend', { texte: 'Indices du milieu ambiant' }), el('div', { class: 'grille-3' }, [ir.el, iv.el, ib.el])]),
      el('fieldset', { class: 'champ' }, [el('legend', { texte: 'Longueurs d’onde' }), el('div', { class: 'grille-3' }, [lr.el, lv.el, lb.el]),
        el('p', { class: 'note', texte: 'Les longueurs d’onde ne servent qu’aux réseaux de diffraction (380 à 780 nm).' })])]);
    var erreur = erreurDans(corps);
    OGW.Dialogue({ titre: 'Indices du milieu ambiant et longueurs d’onde', corps: corps, boutons: [
      { texte: 'Annuler', annuler: true },
      { texte: 'Valider', principal: true, action: function () {
        var i = [ir.lire(), iv.lire(), ib.lire()].map(Math.abs), l = [lr.lire(), lv.lire(), lb.lire()];
        if (!i.every(function (x) { return x > 0; })) return erreur('Valeur illégale d’un indice du milieu ambiant.');
        if (!l.every(function (x) { return x >= 380 && x <= 780; })) return erreur('Longueurs d’onde de 380 à 780 nm.');
        app.changerOptions({ indice_rouge_par_defaut: i[0], indice_vert_par_defaut: i[1], indice_bleu_par_defaut: i[2],
          longueur_donde_red: l[0] * 1e-9, longueur_donde_green: l[1] * 1e-9, longueur_donde_blue: l[2] * 1e-9 }, true);
      } }] });
  };

  OGW.dialogueEmpennage = function (app) {
    var o = app.scene.options, depart = { positionempennage: o.positionempennage, tailleempennage: o.tailleempennage };
    var pos = OGW.champEntier(o.positionempennage, 0, 1000), tai = OGW.champEntier(o.tailleempennage, 0, 1000);
    function apercu() {
      var p = pos.lire(), t = tai.lire();
      if (isFinite(p) && isFinite(t)) { app.scene.options.positionempennage = p; app.scene.options.tailleempennage = t; app.scene.invalider(); app.dessinateur.demander(); }
    }
    pos.input.addEventListener('input', apercu); tai.input.addEventListener('input', apercu);
    var corps = el('div', { class: 'formulaire' }, [
      el('div', { class: 'champ' }, [el('label', { texte: 'Position de l’empennage sur le segment (en millièmes de la longueur du segment)' }), pos.element]),
      el('div', { class: 'champ' }, [el('label', { texte: 'Taille de l’empennage (en millièmes de la diagonale de l’espace de travail ; 0 = pas d’empennage)' }), tai.element])]);
    OGW.Dialogue({ titre: 'Propriétés de l’empennage des rayons', corps: corps, boutons: [
      { texte: 'Annuler', annuler: true, action: function () { Object.assign(app.scene.options, depart); app.scene.invalider(); app.dessinateur.demander(); } },
      { texte: 'Valider', principal: true, action: function () {
        var p = pos.lire(), t = tai.lire();
        if (!isFinite(p) || !isFinite(t)) return false;
        Object.assign(app.scene.options, depart);
        app.changerOptions({ positionempennage: p, tailleempennage: t }, true);
      } }] });
  };

  OGW.dialogueSurfaces = function (app) {
    var n = OGW.champEntier(app.scene.options.maxrayonsrecherchesurfacesonde, 2, 500);
    OGW.Dialogue({ titre: 'Pour le tracé des surfaces d’onde', corps: el('div', { class: 'formulaire' }, [
      el('div', { class: 'champ' }, [el('label', { texte: 'Nombre de points calculés pour tracer une surface d’onde' }), n.element]),
      el('p', { class: 'note', texte: 'Plus de points : surfaces plus lisses, calcul plus long.' })]),
    boutons: [{ texte: 'Annuler', annuler: true }, { texte: 'Valider', principal: true, action: function () {
      var v = n.lire(); if (!isFinite(v)) return false;
      app.changerOptions({ maxrayonsrecherchesurfacesonde: v }, true);
    } }] });
  };

  OGW.dialogueFond = function (app) {
    var coul = OGW.champCouleur(app.scene.options.couleurfondsimulation);
    var info = el('p', { class: 'note', texte: app.imageFond ? 'Une image de fond est affichée.' : 'Aucune image de fond.' });
    var fichier = el('input', { type: 'file', accept: 'image/png,image/jpeg', style: { display: 'none' } });
    var d = OGW.Dialogue({ titre: 'Fond de la simulation', corps: el('div', { class: 'formulaire' }, [
      el('div', { class: 'champ' }, [el('span', { class: 'etiquette', texte: 'Couleur unie' }), coul.element]),
      el('fieldset', { class: 'champ' }, [el('legend', { texte: 'Image de fond' }), info,
        el('div', { class: 'boutons-ligne' }, [
          el('button', { type: 'button', texte: 'Choisir une image…', onclick: function () { fichier.click(); } }),
          el('button', { type: 'button', texte: 'Retirer l’image', onclick: function () { app.definirImageFond(null); d.fermer(); } })]),
        el('p', { class: 'note', texte: 'L’image reste sur cet appareil. Elle n’est pas enregistrée dans le fichier .opt (comme dans OptGeo) ; elle est gardée dans la sauvegarde automatique si sa taille le permet.' }),
        fichier])]),
    boutons: [{ texte: 'Annuler', annuler: true }, { texte: 'Valider', principal: true, action: function () {
      if (coul.lire() !== app.scene.options.couleurfondsimulation) app.changerOptions({ couleurfondsimulation: coul.lire() }, true);
    } }] });
    fichier.addEventListener('change', function () {
      var f = fichier.files && fichier.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { app.definirImageFond(r.result); d.fermer(); };
      r.readAsDataURL(f);
    });
  };

  /** Préférences : couleur, épaisseur et couleur d'axe par défaut des objets créés (stockées sur l'appareil). */
  var TYPES_PREF = [['miroirplan', 'Miroir plan'], ['mscopa', 'Miroir sphérique concave paraxial'], ['mscepa', 'Miroir sphérique convexe paraxial'],
    ['mscore', 'Miroir sphérique concave réel'], ['mscere', 'Miroir sphérique convexe réel'], ['miroirconique', 'Miroir conique'],
    ['lmc', 'Lentille mince convergente'], ['lmd', 'Lentille mince divergente'], ['lec', 'Lentille épaisse'], ['polyhedre', 'Polyèdre réfractant'],
    ['polycercle', 'Polycercle réfractant'], ['sphere', 'Sphère réfractante'], ['prisme', 'Prisme'], ['rayon', 'Rayon unique'],
    ['ondeplane', 'Onde plane'], ['sourceponctuelle', 'Source ponctuelle'], ['ecran', 'Écran'], ['lsr', 'Lame semi-réfléchissante'],
    ['diaphragme', 'Diaphragme'], ['oeil', 'Œil'], ['fleche', 'Trait, flèche'], ['reseau', 'Réseau'], ['jolipoint', 'Point']];
  OGW.dialoguePreferences = function (app) {
    var prefs = JSON.parse(JSON.stringify(app.prefs || {}));
    var sel = el('select', { 'aria-label': 'Type d’élément' }, TYPES_PREF.map(function (t) { return el('option', { value: t[0], texte: t[1] }); }));
    var zone = el('div');
    var courant = null;
    function cleCouleur(t) { return OptGeo.estMilieu(t) ? (t === 'lec' ? 'couleurfond' : 'couleurfond') : 'couleur'; }
    function afficher() {
      enregistrerCourant();
      var t = sel.value, def = Object.assign({}, OptGeo.types[t].defauts, prefs[t] || {});
      OGW.vider(zone);
      var cc = cleCouleur(t);
      var source = OptGeo.estSource(t);
      var c = OGW.champCouleur(def[cc], source ? OGW.COULEURS_RAYON.map(function (k) { return { nom: k.nom, v: k.v, blanche: k.v === 0 }; }) : null);
      zone.appendChild(el('div', { class: 'champ' }, [el('span', { class: 'etiquette', texte: 'Couleur par défaut' }), c.element]));
      var ca = null, ep = null;
      if (def.couleuraxe !== undefined) { ca = OGW.champCouleur(def.couleuraxe); zone.appendChild(el('div', { class: 'champ' }, [el('span', { class: 'etiquette', texte: 'Couleur de l’axe par défaut' }), ca.element])); }
      if (def.epaisseur !== undefined) { ep = OGW.champEntier(def.epaisseur, 1, 10); zone.appendChild(el('div', { class: 'champ' }, [el('label', { texte: 'Épaisseur par défaut (pixels)' }), ep.element])); }
      courant = { t: t, c: c, ca: ca, ep: ep, cc: cc };
    }
    function enregistrerCourant() {
      if (!courant) return;
      var p = prefs[courant.t] = prefs[courant.t] || {};
      p[courant.cc] = courant.c.lire();
      if (courant.ca) p.couleuraxe = courant.ca.lire();
      if (courant.ep && isFinite(courant.ep.lire())) p.epaisseur = courant.ep.lire();
    }
    sel.addEventListener('change', afficher);
    var corps = el('div', { class: 'formulaire' }, [el('div', { class: 'champ' }, [el('label', { texte: 'Type d’élément' }), sel]), zone,
      el('p', { class: 'note', texte: 'Ces réglages valent pour les objets créés ensuite, sur cet appareil seulement. Les objets déjà présents ne changent pas.' })]);
    afficher();
    OGW.Dialogue({ titre: 'Préférences : propriétés par défaut à la création', corps: corps, boutons: [
      { texte: 'Rétablir', classe: 'danger', action: function () { app.prefs = {}; OGW.stockage.effacer('preferences'); app.signaler('Préférences d’origine rétablies.'); } },
      { texte: 'Annuler', annuler: true },
      { texte: 'Valider', principal: true, action: function () {
        enregistrerCourant(); app.prefs = prefs;
        if (!OGW.stockage.ecrire('preferences', prefs)) app.signaler('Les préférences ne seront pas mémorisées sur cet appareil.');
      } }] });
  };

  /* ================================================================== */
  /* Panneaux non modaux : coordonnées, fantômes, commentaire            */
  /* ================================================================== */
  OGW.panneauCoordonnees = function (app) {
    var tr = app.scene.tracer(), u = app.scene.options.unitelongueur;
    var tbody = el('tbody');
    tr.segments.forEach(function (s, i) {
      var l = Math.sqrt(Math.pow(s.a2x - s.a1x, 2) + Math.pow(s.a2y - s.a1y, 2));
      var ap = OptGeo.math.donneAnglePolaireDans02Pi(s.a2x - s.a1x, s.a2y - s.a1y);
      var ligne = el('tr', { tabindex: '0' }, [i + 1, s.a1x, s.a1y, s.a2x, s.a2y, l, ap].map(function (v, k) { return el('td', { texte: k ? N(v, 10) : String(v) }); }));
      function surligner() { app.segmentSurligne = i; OGW.$$('tr.choisi', tbody).forEach(function (r) { r.classList.remove('choisi'); }); ligne.classList.add('choisi'); app.dessinateur.demander(); }
      ligne.addEventListener('click', surligner); ligne.addEventListener('focus', surligner); ligne.addEventListener('mouseenter', surligner);
      tbody.appendChild(ligne);
    });
    var table = el('table', { class: 'coordonnees' }, [el('thead', {}, [el('tr', {}, ['Segment', 'x1 (' + u + ')', 'y1 (' + u + ')', 'x2 (' + u + ')', 'y2 (' + u + ')',
      'Longueur (' + u + ')', 'Angle polaire (rad)'].map(function (t) { return el('th', { texte: t }); }))]), tbody]);
    var corps = el('div', {}, [el('p', { class: 'note', texte: tr.segments.length + ' segments, dans l’ordre du calcul. Les numéros sont écrits sur le dessin ; touchez une ligne pour surligner son segment.' }),
      el('div', { class: 'tableau-defilant' }, [table])]);
    app.modeNumeros = 'coordonnees';
    app.ouvrirPanneau({ titre: 'Coordonnées des segments', corps: corps, large: true, boutons: [{ texte: 'Fermer', principal: true, action: function () { app.fermerPanneau(); } }],
      surFermeture: function () { app.modeNumeros = null; app.segmentSurligne = null; app.dessinateur.demander(); } });
    app.dessinateur.demander();
  };

  /** Segments fantômes : liste texte + toucher un segment sur le dessin pour le cacher ou le montrer. */
  OGW.panneauFantomes = function (app) {
    var o = app.scene.options;
    var depart = { fantomespresents: o.fantomespresents, listefantomes: o.listefantomes };
    var cb = interrupteur('Créer des fantômes (cacher des segments)', o.fantomespresents);
    var liste = el('input', { type: 'text', value: o.listefantomes || '', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Liste des segments à cacher' });
    var err = el('p', { class: 'erreur-champ', hidden: true });
    function appliquer() {
      var r = OGW.normaliserListe(liste.value);
      if (!r.ok) { err.textContent = r.erreur; err.hidden = false; return false; }
      err.hidden = true;
      o.fantomespresents = cb.input.checked; o.listefantomes = r.v;
      app.scene.invalider(); app.dessinateur.demander();
      return true;
    }
    cb.input.addEventListener('change', appliquer);
    liste.addEventListener('change', appliquer);
    app.basculerFantome = function (n) {
      var r = OGW.normaliserListe(liste.value), nums = r.ok && r.v ? r.v.slice(1, -1).split(',').map(Number) : [];
      var i = nums.indexOf(n); if (i >= 0) nums.splice(i, 1); else nums.push(n);
      nums.sort(function (a, b) { return a - b; });
      liste.value = nums.length ? '(' + nums.join(',') + ')' : '';
      cb.input.checked = true;
      appliquer();
    };
    var corps = el('div', { class: 'formulaire' }, [
      el('p', { texte: 'Pour des raisons de commodité, on peut « cacher » certaines parties des rayons calculés. Les numéros des segments sont écrits sur le dessin : touchez un segment pour le cacher ou le montrer, ou écrivez la liste.' }),
      cb.el, el('div', { class: 'champ' }, [el('label', { texte: 'Segments à cacher, par exemple (3,6,9)' }), liste, err]),
      el('p', { class: 'note', texte: 'Attention : les numéros changent dès que la simulation change.' })]);
    app.modeNumeros = 'fantomes';
    var garder = false;
    app.ouvrirPanneau({ titre: 'Pour cacher des segments de rayon', corps: corps, boutons: [
      { texte: 'Tout réafficher', action: function () { liste.value = ''; cb.input.checked = false; appliquer(); return false; } },
      { texte: 'Annuler', action: function () { app.fermerPanneau(); } },
      { texte: 'Valider', principal: true, action: function () { if (!appliquer()) return false; garder = true; app.fermerPanneau(); } }],
      surFermeture: function () {
        app.modeNumeros = null; app.basculerFantome = null;
        if (garder) app.memoriser();
        else { o.fantomespresents = depart.fantomespresents; o.listefantomes = depart.listefantomes; app.scene.invalider(); }
        app.dessinateur.demander();
      } });
    app.dessinateur.demander();
  };

  OGW.panneauCommentaire = function (app) {
    var t = el('textarea', { rows: 12, 'aria-label': 'Commentaire sur la simulation', spellcheck: 'true' });
    t.value = app.scene.commentaire || '';
    var depart = t.value;
    t.addEventListener('input', function () { app.scene.commentaire = t.value; app.marquerModifie(); });
    app.ouvrirPanneau({ titre: 'Commentaire sur la simulation' + (app.nomFichier ? ' ' + app.nomFichier : ''), corps: el('div', { class: 'formulaire' }, [t,
      el('p', { class: 'note', texte: 'Le commentaire est enregistré à part, dans un fichier .txt de même nom que le .opt (comme OptGeo).' })]),
    boutons: [{ texte: 'Fermer', principal: true, action: function () { app.fermerPanneau(); } }],
    surFermeture: function () { if (t.value !== depart) app.memoriser(); app.majInterface(); } });
  };

  /* ================================================================== */
  /* À propos                                                            */
  /* ================================================================== */
  OGW.dialogueAPropos = function () {
    OGW.Dialogue({ titre: 'À propos d’OptGeo web', corps: el('div', { class: 'formulaire a-propos' }, [
      el('p', { html: '<strong>D’après OptGeo de Jean-Marie Biansan (GPL).</strong>' }),
      el('p', { texte: 'OptGeo 3.03 : logiciel libre de simulation d’optique géométrique à deux dimensions, © Jean-Marie Biansan, distribué sous licence GNU GPL version 2 ou ultérieure.' }),
      el('p', { texte: 'Cette version web (moteur de calcul et interface portés en JavaScript, 2026) est distribuée sous la même licence, GNU GPL version 2 ou ultérieure. Les 56 exemples et l’aide sont ceux d’OptGeo 3.03.' }),
      el('p', { texte: 'Elle fonctionne sans Internet. Rien n’est envoyé à un serveur : les fichiers et la sauvegarde automatique restent sur cet appareil.' }),
      el('p', { class: 'note', texte: 'Site de l’auteur d’OptGeo : jeanmarie.biansan.free.fr (nécessite Internet).' }),
      el('p', { class: 'note', texte: 'Version du moteur : ' + OptGeo.version + '.' })]) });
  };
})();
