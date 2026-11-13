// guide.js — guide de l'activité (démarche en 5 étapes), repliable
//
// Le guide accompagne l'élève : choisir la vidéo (et le référentiel) → étalonner →
// pointer → observer la trajectoire → mesurer et conclure. L'étape affichée suit
// automatiquement ce que fait l'élève ; il peut aussi toucher une étape pour la lire.
// Le texte a une hauteur fixe : l'image ne bouge pas sous le doigt quand l'étape change.

const ETAPES_GUIDE = [
  {
    titre: 'Vidéo',
    texte: () => 'Choisis une vidéo dans le menu des vidéos, par exemple « 📏 TableHorizRectiligneUniforme » (un mobile sur une table), ' +
      '« 😱 chute » ou « 🪩 disque33t ». La caméra ne bouge pas : on décrit le mouvement par rapport au sol, c’est le référentiel.'
  },
  {
    titre: 'Étalonner',
    texte: () => 'Menu « 📏 Étalonnage » : pointe les deux bouts d’une longueur connue (deux traits d’une règle visible dans l’image), ' +
      'puis écris cette longueur en mètres. Pourquoi ? L’écran mesure en pixels ; l’étalonnage les convertit en mètres.'
  },
  {
    titre: 'Pointer',
    texte: () => 'Menu « 🎯 Pointage vidéo » : pointe toujours le même endroit du mobile (son centre). Après chaque point, la vidéo avance de ' +
      texteDureeEntrePoints() + '. Une erreur ? « ↶ Annuler ». Mouvement lent ? Choisis « 1 image sur 5 » : les écarts seront plus faciles à comparer.'
  },
  {
    titre: 'Observer',
    texte: () => 'Les croix forment une chronophotographie : les positions du mobile à intervalles de temps égaux. ' +
      'Alignées → trajectoire rectiligne ; sur un cercle → circulaire ; sur une courbe → curviligne. Sont-elles régulièrement espacées ?'
  },
  {
    titre: 'Conclure',
    texte: () => 'Menu « 📈 Graphiques » → « Écart entre deux positions » : barres de même hauteur → vitesse constante, mouvement uniforme ; ' +
      'de plus en plus hautes → accéléré ; de plus en plus basses → ralenti. « Vitesse » donne v = d / t en m/s.'
  }
];

let guide = {
  ouvert: true,
  etape: 1,            // étape affichée (1 à 5)
  derniereAuto: null,  // dernière étape proposée automatiquement
  texteAffiche: ''
};

// « 1 image (0,04 s) » ou « 5 images (0,2 s) » selon la vidéo et le choix « 1 image sur … »
function texteDureeEntrePoints() {
  let fps = 25;
  if (typeof videoPlayer !== 'undefined' && videoPlayer) fps = videoPlayer.framerate;
  else if (typeof webcamPlayer !== 'undefined' && webcamPlayer) fps = webcamPlayer.framerate;
  let n = typeof imagesParPoint !== 'undefined' ? imagesParPoint : 1;
  let duree = n / fps;
  let decimales = Math.abs(duree * 100 - Math.round(duree * 100)) < 1e-6 ? 2 : 3;
  return (n === 1 ? '1 image' : n + ' images') + ' (' + nombreFr(duree, decimales) + ' s)';
}

// Étape suggérée d'après l'état de l'application
function etapeAutomatique() {
  if (etat === 'Calibration') return 2;
  if (etat === 'Graphique') return graph && graph.graphType === 'y(x)' ? 4 : 5;
  let n = data.getTotalPointCount();
  if (n === 0) return echelleEtalonnee ? 3 : 1;
  return n < 6 ? 3 : 4;
}

function installerGuide() {
  // Bouton « Guide » dans la barre des menus
  let bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.id = 'bouton-guide';
  bouton.setAttribute('aria-controls', 'guide');
  bouton.addEventListener('click', () => {
    guide.ouvert = !guide.ouvert;
    majGuide(true);
  });
  document.getElementById('menu').appendChild(bouton);

  // Une pastille par étape (touchable : on peut relire n'importe quelle étape)
  let liste = document.getElementById('guide-etapes');
  ETAPES_GUIDE.forEach((etape, i) => {
    let li = document.createElement('li');
    let b = document.createElement('button');
    b.type = 'button';
    b.className = 'guide-etape';
    b.dataset.etape = i + 1;
    b.innerHTML = '<span class="guide-num">' + (i + 1) + '</span> <span class="guide-titre">' + etape.titre + '</span>';
    b.setAttribute('aria-label', 'Étape ' + (i + 1) + ' : ' + etape.titre);
    b.addEventListener('click', () => {
      guide.etape = i + 1;
      majGuide(true);
    });
    li.appendChild(b);
    liste.appendChild(li);
  });
  majGuide(true);
}

// Met à jour le guide (appelé souvent : ne touche au DOM que si quelque chose change)
function majGuide(force = false) {
  let auto = etapeAutomatique();
  if (auto !== guide.derniereAuto) {
    guide.derniereAuto = auto;
    guide.etape = auto;
    force = true;
  }
  let texte = ETAPES_GUIDE[guide.etape - 1].texte();
  if (!force && texte === guide.texteAffiche) return;

  let panneau = document.getElementById('guide');
  panneau.hidden = !guide.ouvert;
  let bouton = document.getElementById('bouton-guide');
  bouton.textContent = guide.ouvert ? '📋 Guide ▴' : '📋 Guide ▾';
  bouton.setAttribute('aria-expanded', guide.ouvert ? 'true' : 'false');
  bouton.title = guide.ouvert ? 'Masquer le guide de l’activité' : 'Afficher le guide de l’activité';

  document.querySelectorAll('.guide-etape').forEach(b => {
    let actif = Number(b.dataset.etape) === guide.etape;
    b.classList.toggle('actif', actif);
    if (actif) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  });
  document.getElementById('guide-texte').textContent = texte;
  guide.texteAffiche = texte;
}
