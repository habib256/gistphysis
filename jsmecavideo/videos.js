// videos.js — catalogue des vidéos proposées à l'élève
//
// - titre : nom lisible en français (décrit ce qu'on voit, sans donner la conclusion :
//   c'est l'élève qui dira si le mouvement est uniforme, accéléré…). Il sert aussi à
//   nommer le fichier de mesures ;
// - groupe : rubrique du menu (« Pour commencer » en tête) ;
// - framerate : images par seconde DU FICHIER (ffprobe), pour aller d'image en image ;
// - images : nombre d'images du fichier (ffprobe : nb_frames) ;
// - dureeImage : durée réelle entre deux images, dans l'unité de temps de la vidéo, quand
//   elle diffère de 1 / framerate et qu'un repère VISIBLE dans l'image la donne (prise de
//   vue à une autre cadence, animation…). Sinon on suppose la cadence du fichier ;
// - uniteTemps, uniteLongueur : unités propres à la vidéo (défaut : s et m) ;
// - referentiel : phrase sur le référentiel (défaut : REFERENTIEL_DEFAUT) ;
// - etalon : longueur connue VISIBLE dans la vidéo (texte écrit dans l'image). Laisser vide
//   plutôt qu'inventer. etalonValeurs : les mêmes longueurs en mètres, pour vérifier la saisie.

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
  { path: 'videos/chute.mp4', framerate: 25, images: 17, groupe: 'Pour commencer',
    titre: 'Balle lâchée devant un mur',
    etalon: 'La tige verticale mesure 1,85 m, du sol jusqu’à son bout du haut (c’est écrit dans la vidéo).', etalonValeurs: [1.85] },
  { path: 'videos/TableHorizRectiligneUniforme_631g7.mp4', framerate: 25, images: 60, groupe: 'Pour commencer',
    titre: 'Mobile lancé sur une table horizontale (coussin d’air)', etalon: '' },
  { path: 'videos/disque33t.mp4', framerate: 25, images: 50, groupe: 'Pour commencer',
    titre: 'Platine de disque à 33 tours par minute',
    etalon: 'Les deux traits roses partent du centre du disque : 7,5 cm et 12 cm (c’est écrit dans la vidéo).', etalonValeurs: [0.075, 0.12] },

  { path: 'videos/parabolique.mp4', framerate: 25, images: 28, groupe: 'Chutes et lancers',
    titre: 'Balle lancée devant un mur',
    etalon: 'La tige verticale, à gauche, mesure 1,85 m (c’est écrit dans la vidéo).', etalonValeurs: [1.85] },
  { path: 'videos/moto-relatif.mp4', framerate: 25, images: 47, groupe: 'Chutes et lancers',
    titre: 'Balle lâchée par un motard qui roule',
    etalon: 'Le trait blanc vertical, en bas à gauche, mesure 0,6 m (c’est écrit dans la vidéo). Il n’est visible qu’au début : étalonne sur les premières images.', etalonValeurs: [0.6] },

  { path: 'videos/billegrosse.mp4', framerate: 25, images: 19, groupe: 'Chute dans un liquide',
    titre: 'Grosse bille (2 cm) qui tombe dans l’eau',
    etalon: 'Le trait noir vertical mesure 20 cm (c’est écrit dans la vidéo).', etalonValeurs: [0.2] },
  { path: 'videos/billepetite.mp4', framerate: 25, images: 18, groupe: 'Chute dans un liquide',
    titre: 'Petite bille (1 cm) qui tombe dans l’eau',
    etalon: 'Le trait noir vertical mesure 20 cm (c’est écrit dans la vidéo).', etalonValeurs: [0.2] },
  // Le panneau filmé indique « 30 images/s » pour les trois billes
  { path: 'videos/bille1-iv5.mp4', framerate: 1000000 / 33333, images: 21, dureeImage: 1 / 30, groupe: 'Chute dans un liquide',
    titre: 'Bille de 16,7 g qui tombe dans un liquide',
    etalon: 'Entre les deux repères noirs (flèches) du tube : 0,50 m (c’est écrit dans la vidéo).', etalonValeurs: [0.5] },
  { path: 'videos/bille2-iv5.mp4', framerate: 1000000 / 33333, images: 20, dureeImage: 1 / 30, groupe: 'Chute dans un liquide',
    titre: 'Bille de 28,0 g qui tombe dans un liquide',
    etalon: 'Entre les deux repères noirs (flèches) du tube : 0,50 m (c’est écrit dans la vidéo).', etalonValeurs: [0.5] },
  // Fichier encodé à 31,0 images/s, mais filmé à 30 images/s (panneau dans l'image)
  { path: 'videos/bille3-iv5.mp4', framerate: 500000 / 16129, images: 20, dureeImage: 1 / 30, groupe: 'Chute dans un liquide',
    titre: 'Bille de 43,4 g qui tombe dans un liquide',
    etalon: 'Entre les deux repères noirs (flèches) du tube : 0,50 m (c’est écrit dans la vidéo).', etalonValeurs: [0.5] },
  { path: 'videos/BilleFer_Eau25C_2g055_7mm93.mp4', framerate: 25, images: 12, groupe: 'Chute dans un liquide',
    titre: 'Bille de fer qui tombe dans une éprouvette d’eau', etalon: '' },

  { path: 'videos/disque45t.mp4', framerate: 25, images: 71, groupe: 'Tourner, osciller',
    titre: 'Platine de disque à 45 tours par minute',
    etalon: 'Les deux traits roses partent du centre du disque : 7,5 cm et 12 cm (c’est écrit dans la vidéo).', etalonValeurs: [0.075, 0.12] },
  { path: 'videos/PenduleSimpleAmorti_38cm1.mp4', framerate: 25, images: 392, groupe: 'Tourner, osciller',
    titre: 'Pendule qui oscille', etalon: '' },
  { path: 'videos/RessortVertical_Masse24g30.mp4', framerate: 25, images: 231, groupe: 'Tourner, osciller',
    titre: 'Masse accrochée à un ressort vertical', etalon: '' },

  { path: 'videos/TableHorizChocPresqueElastique_R631g7_B749g2.mp4', framerate: 25, images: 66, groupe: 'Mobiles sur coussin d’air',
    titre: 'Deux mobiles qui se heurtent', etalon: '' },
  { path: 'videos/Eclatement2MA.mp4', framerate: 25, images: 70, groupe: 'Mobiles sur coussin d’air',
    titre: 'Deux mobiles attachés qui se séparent', etalon: '' },

  // La 20e et dernière image est un autre plan (gros plan sur une règle) : on ne la propose pas
  { path: 'videos/MasseRoule.mp4', framerate: 15, images: 19, groupe: 'Autres mouvements',
    titre: 'Cylindre qui roule sur un rail', etalon: '' },

  { path: 'videos/vague2cm5.mp4', framerate: 20, images: 39, groupe: 'Ondes à la surface de l’eau',
    titre: 'Vague dans un canal (2,5 cm d’eau)',
    etalon: 'Entre les deux flèches ← et → sous le canal : 1 m (c’est écrit dans la vidéo).', etalonValeurs: [1] },
  { path: 'videos/vague3cm0.mp4', framerate: 20, images: 38, groupe: 'Ondes à la surface de l’eau',
    titre: 'Vague dans un canal (3,0 cm d’eau)',
    etalon: 'Entre les deux flèches ← et → sous le canal : 1 m (c’est écrit dans la vidéo).', etalonValeurs: [1] },
  { path: 'videos/vague3.mp4', framerate: 25, images: 78, groupe: 'Ondes à la surface de l’eau',
    titre: 'Vague dans un aquarium',
    etalon: 'Le trait rouge sous l’aquarium mesure 1 m (c’est écrit dans la vidéo).', etalonValeurs: [1] },

  // Animation : le compteur en bas à gauche avance de 25 jours à chaque image ;
  // la barre en haut à gauche mesure 200 000 000 km.
  { path: 'videos/VenusTerreMars.mp4', framerate: 25, images: 61, groupe: 'Astronomie (animation)',
    titre: 'Vénus, la Terre et Mars autour du Soleil',
    dureeImage: 25, uniteTemps: 'jour', uniteLongueur: 'km',
    referentiel: 'C’est une animation vue de très loin, au-dessus du système solaire : le Soleil reste immobile, on décrit le mouvement des planètes par rapport au Soleil.',
    etalon: 'La barre blanche, en haut à gauche, mesure 200 000 000 km (c’est écrit dans la vidéo). Entre deux images : 25 jours.',
    etalonValeurs: [2e11] }
];

// Vidéo affichée au démarrage
const VIDEO_DEPART = 'videos/chute.mp4';

// Référentiel par défaut (caméra fixe)
const REFERENTIEL_DEFAUT = 'La caméra ne bouge pas : on décrit le mouvement par rapport au sol.';
