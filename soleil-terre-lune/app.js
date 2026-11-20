// app.js — coquille de « Soleil, Terre, Lune » : parties, menu, lien #partie, taille du dessin,
// boucle d'animation, saisies (doigt, souris, clavier), fenêtres « Consignes » et « Valeurs réelles ».
(function () {
  'use strict';
  const STL = window.STL;
  const ORDRE = ['jour-nuit', 'saisons', 'phases', 'eclipses'];
  const toile = document.getElementById('toile');
  const scene = document.getElementById('scene');
  const ctx = toile.getContext('2d');
  const app = STL.app = {
    partie: null, lecture: false, visibleOnglet: !document.hidden, visibleCadre: true,
    w: 0, h: 0, dpr: 1, images: 0
  };

  // ---------------------------------------------------------------- dessin à la demande
  let demande = false, tPrec = null;
  function demanderDessin() {
    if (demande) return;
    demande = true;
    requestAnimationFrame(image);
  }
  const anime = () => app.lecture && app.visibleOnglet && app.visibleCadre;
  function image(t) {
    demande = false;
    const p = STL.parties[app.partie];
    if (!p) return;
    if (anime()) {
      const dt = tPrec === null ? 0 : Math.min(0.1, Math.max(0, (t - tPrec) / 1000));
      tPrec = t;
      if (dt > 0) p.avancer(dt);
    } else tPrec = null;
    ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);
    ctx.clearRect(0, 0, app.w, app.h);
    p.dessiner(ctx, app.w, app.h);
    app.images++;
    const desc = p.description();
    if (toile.getAttribute('aria-label') !== desc) toile.setAttribute('aria-label', desc);
    if (p.majPanneau) p.majPanneau();
    if (anime()) demanderDessin();
  }
  app.demanderDessin = demanderDessin;

  function majBoutonsLecture() {
    document.querySelectorAll('.lecture').forEach(b => {
      b.setAttribute('aria-pressed', String(app.lecture));
      b.innerHTML = app.lecture
        ? '<svg aria-hidden="true"><use href="#i-pause"></use></svg>Pause'
        : '<svg aria-hidden="true"><use href="#i-lecture"></use></svg>Lecture';
    });
  }
  app.mettreLecture = function (on) {
    app.lecture = !!on;
    tPrec = null;
    majBoutonsLecture();
    demanderDessin();
  };
  document.querySelectorAll('.lecture').forEach(b => b.addEventListener('click', () => app.mettreLecture(!app.lecture)));

  // ---------------------------------------------------------------- taille (pixels CSS × densité)
  function redimensionner() {
    const r = scene.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (w === app.w && h === app.h && dpr === app.dpr) return;
    app.w = w; app.h = h; app.dpr = dpr;
    toile.style.width = w + 'px';
    toile.style.height = h + 'px';
    toile.width = Math.round(w * dpr);
    toile.height = Math.round(h * dpr);
    demanderDessin();
  }
  if (window.ResizeObserver) new ResizeObserver(redimensionner).observe(scene);
  window.addEventListener('resize', redimensionner);
  // changement de densité (zoom du navigateur, écran externe)
  (function suivreDensite() {
    if (!window.matchMedia) return;
    const m = matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
    const f = () => { redimensionner(); suivreDensite(); };
    if (m.addEventListener) m.addEventListener('change', f, {once: true});
  })();

  // ---------------------------------------------------------------- visibilité : pause hors écran
  document.addEventListener('visibilitychange', () => {
    app.visibleOnglet = !document.hidden;
    tPrec = null;
    if (app.visibleOnglet) demanderDessin();
  });
  if (window.IntersectionObserver) {
    new IntersectionObserver(entrees => {
      for (const e of entrees) app.visibleCadre = e.isIntersecting;
      tPrec = null;
      if (app.visibleCadre) demanderDessin();
    }).observe(scene);
  }

  // ---------------------------------------------------------------- parties et lien #partie
  const onglets = [...document.querySelectorAll('#onglets [role="tab"]')];
  function afficher(id, depuisLien) {
    if (!STL.parties[id]) id = 'jour-nuit';
    if (app.partie === id) return;
    if (app.lecture) app.mettreLecture(false);
    app.partie = id;
    for (const o of onglets) {
      const actif = o.dataset.partie === id;
      o.setAttribute('aria-selected', String(actif));
      o.tabIndex = actif ? 0 : -1;
    }
    for (const s of document.querySelectorAll('.partie')) s.hidden = s.id !== 'p-' + id;
    if (!depuisLien && location.hash !== '#' + id) {
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* page ouverte depuis un fichier */ }
    }
    document.getElementById('panneau').scrollTop = 0;
    const p = STL.parties[id];
    if (p.activer) p.activer();
    demanderDessin();
  }
  app.afficher = afficher;
  onglets.forEach((o, i) => {
    o.addEventListener('click', () => afficher(o.dataset.partie));
    o.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      const n = onglets[(i + d + onglets.length) % onglets.length];
      n.focus(); afficher(n.dataset.partie);
    });
  });
  const depuisLien = () => afficher(decodeURIComponent(location.hash.replace(/^#/, '')).split(/[?&]/)[0], true);
  window.addEventListener('hashchange', depuisLien);

  // ---------------------------------------------------------------- doigt et souris sur le dessin
  let actif = null;   // identifiant du pointeur qui déplace quelque chose
  const local = e => { const r = toile.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  toile.addEventListener('pointerdown', e => {
    if (actif !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = STL.parties[app.partie];
    const [x, y] = local(e);
    if (p.pointeurBas && p.pointeurBas(x, y, e)) {
      actif = e.pointerId;
      try { toile.setPointerCapture(e.pointerId); } catch (err) { /* pointeur déjà relâché */ }
      if (app.lecture) app.mettreLecture(false);
      e.preventDefault();
      demanderDessin();
    }
  });
  toile.addEventListener('pointermove', e => {
    if (e.pointerId !== actif) return;
    const [x, y] = local(e);
    STL.parties[app.partie].pointeurDeplace(x, y, e);
    e.preventDefault();
    demanderDessin();
  });
  const fin = e => {
    if (e.pointerId !== actif) return;
    actif = null;
    const p = STL.parties[app.partie];
    if (p.pointeurHaut) p.pointeurHaut();
    demanderDessin();
  };
  // Défilement de la page au doigt : le dessin laisse la page défiler (touch-action: pan-x pan-y),
  // sauf quand le doigt s'est posé sur un objet à déplacer (Terre, Lune…). Le pointerdown arrive
  // avant le touchstart : on annule alors le défilement pour ce seul geste. Ainsi, dans le cadre
  // d'un cours, l'élève peut faire défiler le cours en posant le doigt ailleurs sur le dessin.
  const bloquer = e => { if (actif !== null && e.cancelable) e.preventDefault(); };
  toile.addEventListener('touchstart', bloquer, {passive: false});
  toile.addEventListener('touchmove', bloquer, {passive: false});
  // Page ouverte seule (pas dans un cadre) : pas de « tirer pour actualiser » ni de rebond
  try { if (window.top === window) document.documentElement.style.overscrollBehavior = 'none'; } catch (e) { /* cadre d'une autre origine */ }
  toile.addEventListener('pointerup', fin);
  toile.addEventListener('pointercancel', fin);
  toile.addEventListener('lostpointercapture', fin);

  // ---------------------------------------------------------------- clavier
  document.addEventListener('keydown', e => {
    if (!document.getElementById('fenetre').hidden) {
      if (e.key === 'Escape') fermerFenetre();
      if (e.key === 'Tab') { e.preventDefault(); document.getElementById('fenetre-fermer').focus(); }   // rester dans la fenêtre
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const cible = e.target;
    const tag = cible && cible.tagName;
    const type = tag === 'INPUT' ? (cible.type || '').toLowerCase() : '';
    const champ = tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && type !== 'checkbox' && type !== 'radio' && type !== 'button');
    const p = STL.parties[app.partie];
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && !champ) {
      if (cible && cible.getAttribute && cible.getAttribute('role') === 'tab') return;
      const sens = (e.key === 'ArrowRight' || e.key === 'ArrowUp') ? 1 : -1;
      if (app.lecture) app.mettreLecture(false);
      p.pas(sens, e.shiftKey);
      e.preventDefault();
      demanderDessin();
    } else if ((e.key === ' ' || e.code === 'Space') && !champ && tag !== 'BUTTON' && tag !== 'INPUT') {
      app.mettreLecture(!app.lecture);
      e.preventDefault();
    }
  });

  // ---------------------------------------------------------------- fenêtres
  const fenetre = document.getElementById('fenetre');
  let retourFocus = null;
  function ouvrirFenetre(titre, html) {
    retourFocus = document.activeElement;
    document.getElementById('fenetre-titre').textContent = titre;
    document.getElementById('fenetre-contenu').innerHTML = html;
    fenetre.hidden = false;
    if (app.lecture) app.mettreLecture(false);
    const boite = fenetre.querySelector('.boite');
    boite.scrollTop = 0;
    boite.focus({preventScroll: true});
  }
  function fermerFenetre() {
    fenetre.hidden = true;
    if (retourFocus && retourFocus.focus) retourFocus.focus();
  }
  app.ouvrirFenetre = ouvrirFenetre;
  document.getElementById('fenetre-fermer').addEventListener('click', fermerFenetre);
  fenetre.addEventListener('click', e => { if (e.target === fenetre) fermerFenetre(); });

  const FICHE_COMMUNE = `
    <h3>Valeurs réelles (arrondies)</h3>
    <table>
      <tr><th>Diamètre de la Terre</th><td>12 742 km</td></tr>
      <tr><th>Diamètre de la Lune</th><td>3 474 km (environ 3,7 fois moins que la Terre)</td></tr>
      <tr><th>Diamètre du Soleil</th><td>1 392 000 km (environ 109 fois la Terre)</td></tr>
      <tr><th>Distance Terre-Lune</th><td>environ 384 000 km</td></tr>
      <tr><th>Distance Terre-Soleil</th><td>environ 150 millions de km (de 147 à 152 millions de km au cours de l’année)</td></tr>
      <tr><th>Rotation de la Terre</th><td>un tour sur elle-même en 24 h (par rapport au Soleil)</td></tr>
      <tr><th>Révolution de la Terre</th><td>365,25 jours</td></tr>
      <tr><th>Lunaison (de nouvelle Lune à nouvelle Lune)</th><td>environ 29,5 jours</td></tr>
      <tr><th>Inclinaison de l’axe de la Terre</th><td>23,4° (arrondie à 23,5° dans le cours)</td></tr>
      <tr><th>Inclinaison de l’orbite de la Lune</th><td>environ 5°</td></tr>
    </table>
    <p><strong>À l’échelle</strong>, si la Terre était une bille de 1 cm de diamètre, la Lune serait une bille de 3 mm à 30 cm d’elle, et le Soleil une boule de 1,09 m de diamètre à 117 m.</p>`;
  function brancherBoutons(id) {
    const s = document.getElementById('p-' + id);
    const p = STL.parties[id];
    s.querySelector('.consignes').addEventListener('click', () => ouvrirFenetre('Consignes — ' + p.titre,
      '<ol>' + p.consignes.map(c => '<li>' + c + '</li>').join('') + '</ol>'));
    s.querySelector('.fiche').addEventListener('click', () => ouvrirFenetre('Valeurs réelles et simplifications',
      '<h3>Dans cette partie</h3>' + p.fiche + FICHE_COMMUNE));
  }

  // Réglage partagé : hémisphère de l'observateur (phases et éclipses)
  function majHemisphere() {
    document.querySelectorAll('[data-hemisphere]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hemisphere === STL.reglages.hemisphere)));
  }
  document.querySelectorAll('[data-hemisphere]').forEach(b => b.addEventListener('click', () => {
    STL.reglages.hemisphere = b.dataset.hemisphere; majHemisphere(); demanderDessin();
  }));
  app.majHemisphere = majHemisphere;

  // ---------------------------------------------------------------- démarrage
  for (const id of ORDRE) { STL.parties[id].init(app); brancherBoutons(id); }
  majBoutonsLecture();
  majHemisphere();
  redimensionner();
  depuisLien();
  if (!app.partie) afficher('jour-nuit');
})();
