// guide.js — guide de l'activité (démarche en 5 étapes), repliable
//
// Le guide accompagne l'élève : choisir la vidéo (et le référentiel) → étalonner →
// pointer → observer la trajectoire → mesurer et conclure. L'étape affichée suit
// automatiquement ce que fait l'élève ; toucher une étape y conduit (2 → Étalonner,
// 3 → Pointer, 4 et 5 → Graphiques). Quand la place manque, le guide se replie au
// chargement ou au changement de mode (jamais pendant le pointage) ; « 📋 Guide » le rouvre.

const ETAPES_GUIDE = [
  {
    titre: 'Vidéo',
    texte: () => {
      const v = typeof videoCourante === 'function' ? videoCourante() : null;
      const ref = v ? (v.referentiel || REFERENTIEL_DEFAUT)
        : 'Avec ta caméra : garde-la immobile, le mouvement sera décrit par rapport à elle.';
      return 'Choisis une vidéo (menu « Vidéo », rubrique « Pour commencer »). ' + ref + ' C’est le référentiel.';
    }
  },
  {
    titre: 'Étalonner',
    texte: () => 'Étape « 📏 Étalonner » : pointe les deux bouts d’une longueur connue (une règle visible dans l’image), ' +
      'puis écris cette longueur (ex. : 80 cm). Pourquoi ? L’écran mesure en pixels ; l’étalonnage les convertit en mètres.'
  },
  {
    titre: 'Pointer',
    texte: () => 'Étape « 🎯 Pointer » : pointe toujours le même endroit du mobile (son centre). Après chaque point, la vidéo avance de ' +
      texteDureeEntrePoints() + '. Une erreur ? « ↶ Annuler ». Mouvement lent ? « Images pointées : 1 sur 5 » rend les distances plus faciles à comparer.'
  },
  {
    titre: 'Observer',
    texte: () => (data.dureesEgales()
      ? 'Les marques forment une chronophotographie : les positions du mobile à intervalles de temps égaux. '
      : 'Attention : tes points ne sont pas tous séparés par la même durée Δt (pas changé, point inséré…). ') +
      'Alignées → trajectoire rectiligne ; sur un cercle → circulaire ; sur une courbe → curviligne. Sont-elles régulièrement espacées ?'
  },
  {
    titre: 'Conclure',
    texte: () => data.dureesEgales()
      ? '« 📈 Graphiques » → « Distance d entre deux points » : barres de même hauteur → vitesse constante, mouvement uniforme ; ' +
        'de plus en plus hautes → accéléré ; de plus en plus basses → ralenti. « Vitesse » donne v = d / Δt.'
      : 'Tes durées Δt ne sont pas toutes égales : les distances d ne se comparent pas. « 📈 Graphiques » → « Vitesse sur chaque intervalle » : ' +
        'même hauteur → uniforme ; de plus en plus haut → accéléré ; de plus en plus bas → ralenti.'
  }
];

let guide = {
  ouvert: true,
  etape: 1,            // étape affichée (1 à 5)
  derniereAuto: null,  // dernière étape proposée automatiquement
  texteAffiche: '',
  ouvertParEleve: false // rouvert par l'élève : on ne le replie plus tout seul
};

// Durée entre deux points, même source et même écriture que le tableau : « 1 image (0,040 s) »,
// « 5 images (125 jours) ». Webcam : pas de durée fixe (chaque image a son instant mesuré).
function texteDureeEntrePoints() {
  const n = typeof imagesParPoint !== 'undefined' ? imagesParPoint : 1;
  const images = n === 1 ? '1 image' : n + ' images';
  if (typeof data === 'undefined') return images;
  if (data.instants) return images + ' (durée mesurée pour chaque image de la caméra)';
  const f = data.formats();
  return images + ' (' + nombreFr(n * data.dureeImage, f.t) + ' ' + data.libelleTemps() + ')';
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
    guide.ouvertParEleve = guide.ouvert;
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
  const libelle = '📋<span class="guide-mot"> Guide</span><span class="fleche"> ' + (guide.ouvert ? '▴' : '▾') + '</span>';
  if (bouton.innerHTML !== libelle) bouton.innerHTML = libelle;
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
  marquerDebordement(p);
}
