// guide.js — guide de l'activité (démarche en 5 étapes), repliable
//
// Le guide accompagne l'élève : choisir la vidéo (et le référentiel) → étalonner →
// pointer → observer la trajectoire → mesurer et conclure. L'étape affichée suit
// automatiquement ce que fait l'élève ; toucher une étape y conduit (2 → Étalonner,
// 3 → Pointer, 4 et 5 → Graphiques). Sur un écran étroit, le guide se replie au premier
// point pour laisser la place à l'image ; le bouton « 📋 Guide » le rouvre.

const ETAPES_GUIDE = [
  {
    titre: 'Vidéo',
    texte: () => 'Choisis une vidéo (menu « Vidéo », rubrique « Pour commencer »). La caméra ne bouge pas : ' +
      'on décrit le mouvement par rapport au sol, c’est le référentiel.'
  },
  {
    titre: 'Étalonner',
    texte: () => 'Étape « 📏 Étalonner » : pointe les deux bouts d’une longueur connue (une règle visible dans l’image), ' +
      'puis écris cette longueur (ex. : 80 cm). Pourquoi ? L’écran mesure en pixels ; l’étalonnage les convertit en mètres.'
  },
  {
    titre: 'Pointer',
    texte: () => 'Étape « 🎯 Pointer » : pointe toujours le même endroit du mobile (son centre). Après chaque point, la vidéo avance de ' +
      texteDureeEntrePoints() + '. Une erreur ? « ↶ Annuler ». Mouvement lent ? « Images pointées : 1 sur 5 » rend les écarts plus faciles à comparer.'
  },
  {
    titre: 'Observer',
    texte: () => 'Les marques forment une chronophotographie : les positions du mobile à intervalles de temps égaux. ' +
      'Alignées → trajectoire rectiligne ; sur un cercle → circulaire ; sur une courbe → curviligne. Sont-elles régulièrement espacées ?'
  },
  {
    titre: 'Conclure',
    texte: () => '« 📈 Graphiques » → « Écart entre deux positions » : barres de même hauteur → vitesse constante, mouvement uniforme ; ' +
      'de plus en plus hautes → accéléré ; de plus en plus basses → ralenti. « Vitesse » donne v = d / Δt en m/s.'
  }
];

let guide = {
  ouvert: true,
  etape: 1,            // étape affichée (1 à 5)
  derniereAuto: null,  // dernière étape proposée automatiquement
  texteAffiche: '',
  repliAuto: false     // déjà replié automatiquement une fois
};

// « 1 image (0,04 s) » ou « 5 images (0,2 s) » selon la vidéo et le réglage « Images pointées »
function texteDureeEntrePoints() {
  let fps = 25;
  const lect = typeof lecteur === 'function' ? lecteur() : null;
  if (lect) fps = lect.framerate;
  const n = typeof imagesParPoint !== 'undefined' ? imagesParPoint : 1;
  const duree = n / fps;
  const decimales = Math.abs(duree * 100 - Math.round(duree * 100)) < 1e-6 ? 2 : 3;
  return (n === 1 ? '1 image' : n + ' images') + ' (' + nombreFr(duree, decimales) + ' s)';
}

// Étape suggérée d'après l'état de l'application
function etapeAutomatique() {
  if (etat === 'Calibration') return 2;
  if (etat === 'Graphique') return graph && graph.graphType === 'y(x)' ? 4 : 5;
  const n = data.getTotalPointCount();
  if (n === 0) return calibrator && calibrator.isCalibrated ? 3 : 1;
  return n < 6 ? 3 : 4;
}

// Disposition empilée (portrait ou écran étroit) : le panneau n'est pas sur le côté
function dispositionEmpilee() {
  return !window.matchMedia('(min-width: 900px) and (min-aspect-ratio: 23/20)').matches;
}

function installerGuide() {
  document.getElementById('bouton-guide').addEventListener('click', () => {
    guide.ouvert = !guide.ouvert;
    majGuide(true);
  });

  const liste = document.getElementById('guide-etapes');
  ETAPES_GUIDE.forEach((etape, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'guide-etape';
    b.dataset.etape = i + 1;
    b.innerHTML = '<span class="guide-num">' + (i + 1) + '</span> <span class="guide-titre">' + etape.titre + '</span>';
    b.setAttribute('aria-label', 'Étape ' + (i + 1) + ' : ' + etape.titre);
    b.addEventListener('click', () => allerEtape(i + 1));
    li.appendChild(b);
    liste.appendChild(li);
  });
  majGuide(true);
}

// Toucher une étape conduit au mode correspondant
function allerEtape(n) {
  if (n === 2) passerAuMode('Calibration');
  else if (n === 3) passerAuMode('Pointage');
  else if (n === 4 || n === 5) {
    graph.choisirType(n === 4 ? 'y(x)' : 'ecarts');
    passerAuMode('Graphique');
    if (etat === 'Graphique') graph.updateChart();
  } else if (n === 1) {
    document.getElementById('choix-video').focus();
  }
  guide.etape = n;
  majGuide(true);
}

// Premier point posé : sur écran étroit, on replie le guide (une seule fois)
function replierGuideAuPremierPoint() {
  if (guide.repliAuto || !guide.ouvert || !dispositionEmpilee()) return;
  guide.repliAuto = true;
  guide.ouvert = false;
  majGuide(true);
}

// Met à jour le guide (appelé souvent : ne touche au DOM que si quelque chose change)
function majGuide(force = false) {
  const auto = etapeAutomatique();
  if (auto !== guide.derniereAuto) {
    guide.derniereAuto = auto;
    guide.etape = auto;
    force = true;
  }
  const texte = ETAPES_GUIDE[guide.etape - 1].texte();
  if (!force && texte === guide.texteAffiche) return;

  const panneau = document.getElementById('guide');
  panneau.hidden = !guide.ouvert;
  const bouton = document.getElementById('bouton-guide');
  const libelle = guide.ouvert ? '📋 Guide ▴' : '📋 Guide ▾';
  if (bouton.textContent !== libelle) bouton.textContent = libelle;
  bouton.setAttribute('aria-expanded', guide.ouvert ? 'true' : 'false');
  bouton.title = guide.ouvert ? 'Masquer le guide de l’activité' : 'Afficher le guide de l’activité';

  document.querySelectorAll('.guide-etape').forEach(b => {
    const actif = Number(b.dataset.etape) === guide.etape;
    b.classList.toggle('actif', actif);
    if (actif) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  });
  const p = document.getElementById('guide-texte');
  if (p.textContent !== texte) p.textContent = texte;
  guide.texteAffiche = texte;
}
