# Inspirations : liste de respect

Ces applications doivent beaucoup aux professeurs qui ont publié, souvent seuls et sur leur temps libre, des animations Flash de physique-chimie pour le collège. Le lecteur Flash a disparu des navigateurs fin 2020 et beaucoup de ces animations ne s’ouvrent plus. Cette page garde la trace de leur travail et dit ce qu’on leur doit.

## Notre règle

- On reprend **des idées**, jamais du code, des dessins, des sons ni des textes. Chaque application de ce dépôt est écrite de zéro.
- Les fichiers `.swf` d’origine ne sont pas redistribués, ni ici ni sur le site du collège.
- Une application inspirée par l’une de ces animations le dit dans son `README.md` (ligne « Inspiration »).
- Un auteur qui ne souhaite pas être cité, ou qui voit une ressemblance qui le gêne, peut ouvrir une *issue* sur ce dépôt : on corrige.

## Les auteurs et leurs sites

### sciences.colleges.free.fr : « Physique et chimie au collège : animations flash »
Contact du site : A. Retière. Environ 65 animations classées selon le programme du cycle 4 (Matière, Mouvements, Énergie, Signaux, autres). Toujours en ligne en novembre 2026, aucune licence indiquée (les images téléchargeables sont annoncées « libres de droit »).
Ce qu’on admire : des animations courtes, chacune centrée sur une seule notion, souvent conçues pour que l’élève vérifie lui-même (« l’animation ne donne pas les réponses : elle confirme seulement que le calcul fait par les élèves est bon »).
<http://sciences.colleges.free.fr/>

### PCCL : Physique Chimie Collège Lycée (Jean-Pierre Fournat)
La plus grande collection française d’animations de collège (ancien site physiquecollege.free.fr). Toujours en ligne. « Tous droits réservés » : reproduction et liens directs vers les `.swf` interdits. **On n’en reprend rien**, ni idée précise ni forme ; on la cite par respect et on y renvoie les collègues.
<https://www.pccl.fr/>

### Ostralo (Adrien Willm, lycée Beaupré d’Haubourdin, académie de Lille)
Animations surtout de lycée, une partie déjà réécrite en HTML5 par l’auteur. Pour le collège : chromatographie, structure de l’atome, électrisation, principe d’inertie, relativité du mouvement (« Qui bouge ? »). Aucune licence trouvée.
<https://www.ostralo.net/>

## Idées retenues, par intérêt pour nos classes

Classement fait le 20/11/2026 pour un collège à La Réunion qui a des 6e, des 4e et des 3e cette année. Le critère est l’intérêt pour les élèves, rapporté au travail de développement et à ce que nos applications ou PhET couvrent déjà.

| Idée (animation d’origine) | Source | Cours | Où on en est |
|---|---|---|---|
| Phases de la Lune, saisons, éclipses (« Test_phases », « Test_saisons », « Eclipse ») | sciences.colleges | 6e-09, 5e-05b, 5e-09 | **En cours** : `soleil-terre-lune/` (20/11/2026) |
| Multimètre en ampèremètre, voltmètre, ohmmètre (« Multimètre ») | sciences.colleges | 4e-08, TP multimètre 4e | Idée : s’entraîner avant le vrai TP |
| Barrage et turbine : hauteur d’eau et électricité produite (« Turbine ») | sciences.colleges | 3e-07, 5e-06b | Idée : à transposer à Takamaka |
| Chaînes et diagrammes de conversion d’énergie (« Diagramme_conv ») | sciences.colleges | 6e-06, 5e-06b, 3e-09 | Idée |
| Conversions dans un tableau (longueurs, volumes, temps, intensités) | sciences.colleges | 6e, 5e, 4e | Idée : exercices qui se renouvellent |
| Disjoncteur et surintensité (« Disjoncteur ») | sciences.colleges | 6e-13 | Idée |
| Loi d’Ohm : mesures puis tracé de U = f(I) (« Loi d’Ohm ») | sciences.colleges | 4e-08 | Idée (PhET couvre une partie) |
| Ombres d’une sphère éclairée par une ou deux sources (« Ombre1 », « Ombre2 ») | sciences.colleges | 6e-08, 5e-10 | Déjà couvert : LightPhysics « Ombres » |
| Synthèse additive, filtres (« Synthese additive », « Super_filtre ») | sciences.colleges | 4e-13, 5e-09 | Déjà couvert : LightPhysics « Couleurs » |
| Relativité du mouvement (« Mouvement_relatif », Ostralo « Qui bouge ? ») | sciences.colleges, Ostralo | 6e-09, 5e-05 | Déjà couvert : jsMecaVidéo, « Mouvement par rapport à » |
| Poids et masse sur différents astres (« Poids ») | sciences.colleges | 4e-11, 3e-10 | Déjà couvert : LightPhysics |
| Conservation de la masse, molécules (« Conservation_masse », « Molecule ») | sciences.colleges | 4e-04, 3e-04 | Déjà couvert : `combustion-atomes/`, `reactions/` |
| Intensités et tensions en série et en dérivation | sciences.colleges | 5e-08, 4e-08 | Couvert par PhET « Circuits DC » |

## Logiciels libres portés

À ne pas confondre avec les inspirations ci-dessus : ici, c’est un vrai portage du code, permis par la licence.

- **OptGeo**, optique géométrique, de Jean-Marie Biansan (GPL v2 ou plus) : portage en cours dans `optgeo/`.
