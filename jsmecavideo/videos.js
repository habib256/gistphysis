// videos.js — catalogue des vidéos proposées à l'élève
//
// - titre : nom lisible en français (décrit ce qu'on voit, sans donner la conclusion :
//   c'est l'élève qui dira si le mouvement est uniforme, accéléré…) ;
// - groupe : rubrique du menu (« Pour commencer » en tête) ;
// - framerate : images par seconde de la vidéo (ffprobe, voir README) ;
// - etalon : longueur connue VISIBLE dans la vidéo (texte écrit dans l'image) ou donnée
//   par le README. Laisser vide plutôt qu'inventer : sans étalon, la consigne d'étalonnage
//   reste générale.

const GROUPES_VIDEOS = [
  'Pour commencer',
  'Chutes et lancers',
  'Chute dans un liquide',
  'Tourner, osciller',
  'Mobiles sur coussin d’air',
  'Autres mouvements',
  'Ondes à la surface de l’eau',
  'Astronomie (animation)'
];

let videoFiles = [
  { path: 'videos/TableHorizRectiligneUniforme_631g7.mp4', framerate: 25, groupe: 'Pour commencer',
    titre: 'Mobile lancé sur une table horizontale (coussin d’air)',
    etalon: 'Sur la règle jaune, deux numéros voisins sont à 10 cm l’un de l’autre (8 intervalles = 0,80 m).' },
  { path: 'videos/chute.mp4', framerate: 25, groupe: 'Pour commencer',
    titre: 'Balle lâchée devant un mur',
    etalon: 'La tige verticale mesure 1,85 m, du sol jusqu’à son bout du haut (c’est écrit dans la vidéo).' },
  { path: 'videos/disque33t.mp4', framerate: 25, groupe: 'Pour commencer',
    titre: 'Platine de disque à 33 tours par minute',
    etalon: 'Les deux traits roses partent du centre du disque : 7,5 cm et 12 cm (c’est écrit dans la vidéo).' },

  { path: 'videos/parabolique.mp4', framerate: 25, groupe: 'Chutes et lancers',
    titre: 'Balle lancée devant un mur',
    etalon: 'La tige verticale, à gauche, mesure 1,85 m (c’est écrit dans la vidéo).' },
  { path: 'videos/moto-relatif.mp4', framerate: 25, groupe: 'Chutes et lancers',
    titre: 'Balle lâchée par un motard qui roule',
    etalon: 'Le trait blanc vertical, en bas à gauche, mesure 0,6 m (c’est écrit dans la vidéo).' },

  { path: 'videos/billegrosse.mp4', framerate: 25, groupe: 'Chute dans un liquide',
    titre: 'Grosse bille (2 cm) qui tombe dans l’eau',
    etalon: 'Le trait noir vertical mesure 20 cm (c’est écrit dans la vidéo).' },
  { path: 'videos/billepetite.mp4', framerate: 25, groupe: 'Chute dans un liquide',
    titre: 'Petite bille (1 cm) qui tombe dans l’eau',
    etalon: 'Le trait noir vertical mesure 20 cm (c’est écrit dans la vidéo).' },
  { path: 'videos/bille1-iv5.mp4', framerate: 1000000 / 33333, groupe: 'Chute dans un liquide',
    titre: 'Bille de 16,7 g qui tombe dans un liquide',
    etalon: 'Entre les deux repères noirs (flèches) du tube : 0,50 m (c’est écrit dans la vidéo).' },
  { path: 'videos/bille2-iv5.mp4', framerate: 1000000 / 33333, groupe: 'Chute dans un liquide',
    titre: 'Bille de 28,0 g qui tombe dans un liquide',
    etalon: 'Entre les deux repères noirs (flèches) du tube : 0,50 m (c’est écrit dans la vidéo).' },
  { path: 'videos/bille3-iv5.mp4', framerate: 500000 / 16129, groupe: 'Chute dans un liquide',
    titre: 'Bille de 43,4 g qui tombe dans un liquide',
    etalon: 'Entre les deux repères noirs (flèches) du tube : 0,50 m (c’est écrit dans la vidéo).' },
  { path: 'videos/BilleFer_Eau25C_2g055_7mm93.mp4', framerate: 25, groupe: 'Chute dans un liquide',
    titre: 'Bille de fer qui tombe dans une éprouvette d’eau', etalon: '' },

  { path: 'videos/disque45t.mp4', framerate: 25, groupe: 'Tourner, osciller',
    titre: 'Platine de disque à 45 tours par minute',
    etalon: 'Les deux traits roses partent du centre du disque : 7,5 cm et 12 cm (c’est écrit dans la vidéo).' },
  { path: 'videos/PenduleSimpleAmorti_38cm1.mp4', framerate: 25, groupe: 'Tourner, osciller',
    titre: 'Pendule qui oscille', etalon: '' },
  { path: 'videos/RessortVertical_Masse24g30.mp4', framerate: 25, groupe: 'Tourner, osciller',
    titre: 'Masse accrochée à un ressort vertical', etalon: '' },

  { path: 'videos/TableHorizChocPresqueElastique_R631g7_B749g2.mp4', framerate: 25, groupe: 'Mobiles sur coussin d’air',
    titre: 'Deux mobiles qui se heurtent', etalon: '' },
  { path: 'videos/Eclatement2MA.mp4', framerate: 25, groupe: 'Mobiles sur coussin d’air',
    titre: 'Deux mobiles attachés qui se séparent', etalon: '' },

  { path: 'videos/MasseRoule.mp4', framerate: 15, groupe: 'Autres mouvements',
    titre: 'Cylindre qui roule sur un rail', etalon: '' },

  { path: 'videos/vague2cm5.mp4', framerate: 20, groupe: 'Ondes à la surface de l’eau',
    titre: 'Vague dans un canal (2,5 cm d’eau)',
    etalon: 'Entre les deux flèches ← et → sous le canal : 1 m (c’est écrit dans la vidéo).' },
  { path: 'videos/vague3cm0.mp4', framerate: 20, groupe: 'Ondes à la surface de l’eau',
    titre: 'Vague dans un canal (3,0 cm d’eau)',
    etalon: 'Entre les deux flèches ← et → sous le canal : 1 m (c’est écrit dans la vidéo).' },
  { path: 'videos/vague3.mp4', framerate: 25, groupe: 'Ondes à la surface de l’eau',
    titre: 'Vague dans un aquarium',
    etalon: 'Le trait rouge sous l’aquarium mesure 1 m (c’est écrit dans la vidéo).' },

  { path: 'videos/VenusTerreMars.mp4', framerate: 25, groupe: 'Astronomie (animation)',
    titre: 'Vénus, la Terre et Mars autour du Soleil', etalon: '' }
];

// Vidéo affichée au démarrage
const VIDEO_DEPART = 'videos/chute.mp4';
