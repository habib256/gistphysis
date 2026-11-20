# OptGeo web — spécification fonctionnelle de l'interface

Spécification de l'interface d'**OptGeo 3.03** (simulation d'optique géométrique 2D, Jean-Marie Biansan, Lazarus/Free Pascal, licence GPL v2 ou ultérieure), écrite pour son portage complet en application web (tablettes, ordinateurs, téléphones). Le moteur (objets, tracé des rayons, fichiers `.opt`) est porté à part dans `optgeo/js/moteur/` ; ce document décrit **tout ce que l'utilisateur voit et fait**, et sert seul, avec la documentation du moteur, à construire l'interface.

Rédigée le 20/11/2026 par lecture des sources (`~/src/optgeo-amont/src/` : `ray1.pas`/`.lfm`, `unit222.pas`, `unit1_palette`, toutes les boîtes `saisie*`, `unit3` à `unit32`, `uchaines.pas`, `lang/optgeo.fr.po`, `aide/fr/*.html`, `exemples/`, `historique.html`). **OptGeo n'a pas été exécuté** : tout comportement vient du code ; ce qui dépend de la bibliothèque LCL et non du code d'OptGeo est signalé « (LCL) ». Une partie du travail de lecture (poignées, boîtes de propriétés, fenêtres annexes, exemples) a été confiée à des agents relecteurs du code ; leurs textes sont repris ici avec leurs références.

## 0. Conventions de lecture

- **Références** : `fichier:ligne` dans les sources d'OptGeo 3.03 (fins de ligne converties, numéros identiques à l'original). Les libellés entre « » sont exacts, fautes comprises (« fléche », « Polyhèdre », « Saissez ») ; quand le `.lfm` et le `FormCreate` du `.pas` diffèrent, **le `.pas` fait foi** (il réaffecte les libellés au lancement à partir de `uchaines.pas`).
- **INCERTAIN** : comportement que le code ne permet pas d'établir avec certitude. **Défaut de l'original** : comportement établi mais à ne pas reproduire (le texte propose alors un écart, signalé comme tel). La liste récapitulative est au §16.
- **Orthographe dans la version web** : libellés repris d'OptGeo mais **corrigés et accentués**, majuscules comprises (« Édition », « Écran », « Œil », « flèche », « Polyèdre », « Saisissez », « Éléments à choisir »). Seuls les mots-clés des fichiers `.opt` restent tels quels.
- **Vocabulaire** : « clic » = clic de souris dans OptGeo ; « toucher » = geste au doigt dans la version web ; « espace de travail » = rectangle [xmin, xmax] × [ymin, ymax] en unités de longueur ; « mode » = état dans lequel les clics dans le dessin ont un sens particulier (§1, §3).
- **Abréviations d'objets** (noms internes d'OptGeo, utiles pour lire le code et le moteur) : `miroirplan`, `reseau` (réseau diffractant), `mscopa`/`mscepa` (miroir sphérique concave/convexe paraxial, dit « idéal »), `mscore`/`mscere` (concave/convexe réel), `miroirconique`, `lmc`/`lmd` (lentille mince convergente/divergente), `lec` (lentille épaisse), `lsr` (lame semi-réfléchissante), `ecran`, `diaphragme`, `rayon`, `sourceponctuelle` (objet ponctuel réel ou virtuel), `ondeplane`, `polyhedre` (polygone réfractant), `polycercle` (« polysphère »), `sphere`, `prisme`, `oeil`, `fleche` (trait), `texteaffiche`, `metre` (mesure de distance), `angle` (mesure d'angle), `jolipoint` (point), `groupe`.

## Sommaire

1. Organisation de la fenêtre principale
2. Inventaire des commandes (menus, barres d'outils, palette « Actions »)
3. Modes, curseurs, barre d'état, clavier, points actifs
4. Démarrage et espace de travail
5. Création des objets à la souris : séquences exactes
6. Affichage, vue et aides (normales, zoom, grille, coordonnées, fantômes, empennage, surfaces d'onde, couleurs)
7. Annuler / Refaire
8. Fichiers (ouvrir, superposer, enregistrer, contenu du `.opt`, export)
9. Poignées et modes Déplacer, Supprimer, Grouper (A : miroirs, lentilles, écrans ; B : sources, dioptres, divers)
10. Boîtes de propriétés de chaque objet (A : miroirs, lentilles, écrans ; B : sources, milieux, divers ; mesures)
11. Fenêtres annexes et options globales (espace de travail, indices, préférences, fond, empennage, coordonnées, commentaire, choix d'objet…)
12. Adaptation web et tablette : modèle d'interaction recommandé
13. Ce qu'il est raisonnable de ne pas porter
14. Fiche récapitulative par objet (27 types)
15. Scénarios de test d'acceptation
16. Points incertains et défauts de l'original
- Annexe A. Catalogue des 56 exemples
- Annexe B. Fonctions introduites au fil des versions
- Annexe C. Interactions décrites dans l'aide d'OptGeo

## 1. Organisation de la fenêtre principale

Fenêtre `Form1` (`ray1.lfm:1`), ouverte en plein écran (`ray1.pas:5472`). De haut en bas :

| Zone | Contenu | Source |
|---|---|---|
| Barre de menus | Fichier, Édition, Ajouter, Options, Aide (5 menus, désactivés pendant un mode, voir §3.2) | `ray1.lfm:1117-1985` |
| Barre d'outils 1 | Boutons d'ajout d'objets, rangés sous quatre étiquettes : « Miroirs: », « Ecrans: », « Sources: », « Dioptres: » | `ray1.lfm:47-677` |
| Barre d'outils 2 | « Divers: » (mesures, texte, trait, fantômes, commentaire, œil, réseau, point), « Afficher: » (bouton « Coord. », cases Normales, Angles, Grille, Attraction, Long. segments), « Zoom: » (liste x1…x100) | `ray1.lfm:679-1090` |
| Zone de dessin | `ScrollBox1` contenant l'image `Image1` (seuls événements : `OnMouseDown`, `OnMouseMove` ; ni molette, ni relâchement, ni double clic) | `ray1.lfm:1092-1116` |
| Barre d'état | 4 panneaux : `X=` (150 px), `Y=` (150 px), consigne de l'étape en cours (438 px), mode en cours (62 px) | `ray1.lfm:22-46` |
| Palette « Actions » | Fenêtre flottante toujours visible (`form_palette`, ne peut pas être fermée : `unit1_palette.pas:466`), déplaçable en glissant sa zone de poignée | `unit1_palette.lfm`, `unit1_palette.pas:112-138` |
| Fenêtre « Commentaires sur la simulation… » | Éditeur de texte libre lié à la simulation (`formediteur`), réduite si vide | `ray1.pas:9145-9171`, `ray1.pas:10624` |

Le titre de la fenêtre affiche l'espace de travail : « Espace de travail: horiz: [xmin,xmax]; vert: [ymin,ymax] », suivi de « - Simulation: nom.opt » quand un fichier est ouvert ou enregistré (`ray1.pas:5658`, `ray1.pas:8168`, `ray1.pas:9184`).

**Repère** : x vers la droite, **y vers le haut** (conversion pixel → monde `monbitmap.pas:1669-1672`). L'unité de longueur (`unitelongueur`, « mm » par défaut, `unit222.pas:40251`, `ray1.pas:7453`) est affichée à côté de chaque champ de coordonnée des boîtes de propriétés (`logN.Caption:=unitelongueur`).

**Principe d'interaction d'OptGeo (à comprendre avant tout le reste)** : tout passe par des **modes**. On clique un bouton (ou un menu) qui met l'application dans un mode (« ajout d'un miroir plan », « déplacement », « propriétés »…) ; on clique ensuite dans le dessin une ou plusieurs fois (**clics successifs, jamais de glisser-déposer** : `Image1` n'a pas d'`OnMouseUp`, `ray1.lfm:1108-1115`) ; entre deux clics, un aperçu suit la souris (`Image1MouseMove`, `ray1.pas:2927-4184`). En mode ajout, l'application revient d'elle-même au repos après le dernier clic (`form1.activeboutons`). Les modes Déplacer, Propriétés et Grouper restent actifs jusqu'à ce qu'on reclique sur leur bouton (renommé « Fin dépl. », « Fin prop. », « Fin groupement ») ou qu'on appuie sur Échap ; les modes Dupliquer (« Fin dupl. ») et Supprimer (« Fin sup. ») se referment d'eux-mêmes après **une** duplication ou **une** suppression (`unit1_palette.pas:259-414`, `ray1.pas:5689-5703`, `unit222.pas:16450-16456`, `unit222.pas:21725-21733`).

## 2. Inventaire des commandes

Raccourcis : codes `ShortCut` de Lazarus (Ctrl = 16384, Alt = 32768). Les libellés sont ceux réaffectés au lancement dans `TForm1.FormCreate` (`ray1.pas:4201-4774`) quand ils diffèrent du `.lfm`.

### 2.1 Menu « Fichier » (`ray1.lfm:1120-1216`)

| Libellé exact | Effet | Raccourci | Source |
|---|---|---|---|
| Nouvelle simulation | Si la simulation contient des objets modifiés non enregistrés : confirmation « La simulation a été modifiée et les modifications n'ont pas été sauvegardées. Voulez vous vraiment commencer une nouvelle simulation ? » (Oui/Non). Vide tout, remet unité « mm », 20 points de surface d'onde, pas de fantômes, commentaire vide, fond blanc sans image, puis rouvre la boîte de démarrage (`saisiechoix`, sans le choix « ouvrir un exemple ») et éventuellement la boîte d'espace de travail ; remet grille et attraction à faux, normales à vrai, angles et longueurs à faux, grille = 1/20 de l'espace arrondie (voir §6.3) ; vide l'historique d'annulation | — | `ray1.pas:7411-7558` |
| Ouvrir simulation › de mon répertoire personnel | Boîte d'ouverture de fichier `.opt` dans le répertoire personnel | — | `ray1.pas:11139`, `8173` |
| Ouvrir simulation › du répertoire "exemples" | Idem dans le répertoire des exemples | — | `ray1.pas:11144` |
| Ouvrir simulation › du dernier répertoire de chargement autre que ceux ci-dessus | Idem dans le dernier répertoire utilisé | — | `ray1.pas:13191` |
| Superposer simulation › (mêmes trois sous-menus) | Ajoute le contenu d'un `.opt` à la simulation courante (voir §8.2) | — | `ray1.pas:6352-6365`, `9198-10337` |
| Enregistrer simulation sous | Boîte d'enregistrement ; si le fichier existe : « Un fichier portant ce nom existe déjà. Voulez-vous l'écraser ? » (Non → la boîte se rouvre). Écrit le `.opt` et le commentaire dans un `.txt` de même nom | — | `ray1.pas:8152-8171`, `7560-8145` |
| Enregistrer simulation | Réenregistre sous le dernier nom, sinon se comporte comme « Enregistrer sous » | — | `ray1.pas:8146-8150` |
| Modifier les dimensions de l'espace de travail › Ajuster automatiquement à la plus petite taille | Rétrécit l'espace par pas de 1 % de chaque côté tant que tous les objets restent valides (`retaille_espace_possible`) | — | `ray1.pas:11061-11094` |
| Modifier les dimensions de l'espace de travail › Manuellement | Boîte `saisieretailleespace` (xmin, xmax, ymin, ymax, respect des proportions) ; refus si un objet ne rentre plus : « Un au moins des objets actuels ne rentre pas sur ce nouvel espace de travail ! » / titre « Redimensionnement impossible » ; le pas de grille est mis à l'échelle | — | `ray1.pas:11056`, `11096-11137` |
| Préférences | Boîte `saisiepreferences` (couleurs et épaisseurs par défaut, police) | — | `ray1.pas:11188-11234` |
| Imprimer | Boîte de mise en page `configimpression` puis impression | — | `ray1.pas:5866-6207` |
| Exporter graphe › PNG / JPG / PS | Enregistre l'image affichée (taille actuelle, zoom compris) en PNG ou JPEG ; PS = PostScript vectoriel. Si le fichier existe : « Ce fichier existe déjà. » / « Voulez-vous l'écraser ? » | — | `ray1.pas:4959-4999`, `5038` |
| Quitter | Ferme ; si modifié : « La simulation a été modifiée est les modifications n'ont pas été sauvegardées. Voulez vous vraiment quitter OptGéo ? » | — | `ray1.pas:10338`, `5674-5687` |

### 2.2 Menu « Edition » (`ray1.lfm:1218-1288`)

| Libellé exact | Effet | Raccourci | Source |
|---|---|---|---|
| Défaire (« Annuler » dans le `.lfm`) | Revient à l'état précédent (voir §7) ; grisé au départ | Ctrl+Z (16474) | `ray1.lfm:1220-1225`, `ray1.pas:4641`, `13114` |
| Refaire | Rétablit l'état annulé ; grisé au départ | Ctrl+R (16466) | `ray1.lfm:1226-1231`, `ray1.pas:13120` |
| Dupliquer un élément | = bouton « Dupliquer » de la palette | Ctrl+D (16452) | `ray1.pas:6245` |
| Supprimer un élément | = bouton « Supprimer » | Ctrl+S (16467) | `ray1.pas:10704` |
| Supprimer tous les éléments | = bouton « Supprimer tout » (confirmation « Etes vous certain(e) de vouloir supprimer tous les éléments ? ») | Ctrl+Alt+S (49235) | `ray1.pas:5431`, `unit1_palette.pas:415-464` |
| Propriétés d'un élément | = bouton « Propriétés » | Ctrl+P (16464) | `ray1.pas:10709` |
| Déplacer un élément | = bouton « Déplacer » | Ctrl+M (16461) | `ray1.pas:10714` |
| Grouper des éléments › Tous les éléments | Crée un groupe de tous les objets après confirmation « Dois je créer le groupe n°N en y mettant tous les éléments présents ? » ; refus si moins de 2 éléments ou 500 groupes | Ctrl+A (16449) | `ray1.pas:10928-11021` |
| Grouper des éléments › Eléments à choisir | = bouton « Grouper » | Ctrl+G (16455) | `ray1.pas:10923` |
| Copier simulation dans le presse papier | Copie l'image affichée | Ctrl+C (16451) | `ray1.pas:5858-5864` |
| Editer le commentaire de la simulation | Affiche la fenêtre de commentaire | Ctrl+E (16453) | `ray1.pas:10698` |

Remarque : « Enregistrer » n'a pas de raccourci ; Ctrl+S supprime (piège à ne pas reproduire, voir §12.7).

### 2.3 Menu « Ajouter » (`ray1.lfm:1290-1854`)

Toutes ces commandes ouvrent la **boîte de saisie de l'objet, vide ou préremplie**, sans clic dans le dessin : on tape les coordonnées. C'est l'autre voie de création, à côté des boutons de barre d'outils (création à la souris, §5). Détail des boîtes : §10 (objets) et §11 (autres fenêtres).

| Sous-menu | Libellé | Gestionnaire |
|---|---|---|
| Système optique idéal | Miroir plan · Miroir sphérique concave (paraxial) · Miroir sphérique convexe (paraxial) · — · Lentille mince convergente · Lentille mince divergente · Lame semi réfléchissante · — · Ecran · Diaphragme | `ray1.pas:6209`, `6623`, `6664`, `6707`, `6743`, `6779`, `7035`, `7065` |
| Système optique réel | Miroir sphérique concave (réel) · Miroir sphérique convexe (réel) · Miroir cônique · — · Polyhèdre réfractant · Sphère réfractante · Prisme · Lentille · Polysphère réfractante | `ray1.pas:6810`, `6896`, `6996`, `7197`, `7095`, `5436`, `6852`, `7129` |
| Source | Rayon unique · Objet ponctuel réel ou virtuel · Onde plane (faisceau parallèle) | `ray1.pas:6590`, `7244`, `7284` |
| Divers | Texte sur le dessin · Commentaire sur la simulation · Mesure de distance · Mesure d'angle · Rayons fantomes · Trait, fléche... · Oeil stylisé · Réseau diffractant | `ray1.pas:10414`, `10719`, `10725`, `10746`, `10803`, `10809`, `10889`, `5396` |

Particularités : « Mesure de distance » et « Mesure d'angle » par le menu ouvrent une boîte de coordonnées (`saisiemetre`, `saisieangle`), alors que les boutons demandent des clics (`ray1.pas:10725-10769`). La boîte du réseau ouverte par le menu porte par erreur le titre « Ajout d'un miroir plan: » (`ray1.pas:5423`) : à corriger dans le portage (« Ajout d'un réseau: »).

### 2.4 Menu « Options » (`ray1.lfm:1856-1945`, libellé `rsOptions`)

| Libellé exact | Effet | Source |
|---|---|---|
| Afficher la grille (coché/décoché) | Synchronisé avec la case « Grille » | `ray1.pas:10439-10452` |
| Attraction de la grille | Synchronisé avec la case « Attraction » | `ray1.pas:10454-10467` |
| Options de la grille | Boîte `saisiegrille` : pas horizontal, pas vertical, attraction, affichage (se rouvre tant qu'elle renvoie « Non ») | `ray1.pas:10469-10488` |
| Afficher les normales | Synchronisé avec la case « Normales » (coché par défaut) | `ray1.pas:10507-10513` |
| Afficher les angles | Synchronisé avec la case « Angles d'incid. et de réfr. » | `ray1.pas:10515-10522` |
| Options des normales | Boîte `saisienormale` : épaisseur, couleur, longueur en % , normales, angles, décimales des angles | `ray1.pas:10550-10572` |
| Couleur de fond ou image de fond | Question « Choix du fond » / « Choisissez: » avec deux boutons « Couleur unie » (sélecteur de couleur) et « Image de fond » (fichier JPG ou PNG) ; l'image n'est **pas** enregistrée dans le `.opt` (seule la couleur l'est) | `ray1.pas:11149-11186`, `7560-8145` |
| Indices du milieu ambiant et longueurs d'onde | Boîte `saisie_indices_milieu_ambiant` : indices rouge/vert/bleu par défaut du milieu ambiant et longueurs d'onde (nm) associées aux couleurs rouge, vert, bleu | `ray1.pas:4518`, `5021-5036` |
| Désactiver le contrôle de points trop proches à la construction | Case à cocher ; supprime le refus « Points trop proches ! » lors des clics de création | `ray1.pas:6367-6372` |
| Empennage des rayons | Boîte `saisieempennage` : position (0–1000 millièmes de la longueur du segment, §6.6) et taille de la flèche dessinée sur chaque segment de rayon | `ray1.pas:11236-11253` |
| Surfaces d'onde | Boîte `saisiepointssurfaceonde` : nombre de rayons utilisés pour tracer chaque surface d'onde (20 par défaut) | `ray1.pas:10685-10696` |
| Base de registre › Associer les fichiers .opt avec OptGeo / Désassocier | Windows seulement | `ray1.pas:11023-11054` |
| Définir le répertoire personnel | Boîte `form16` (répertoires des exemples et des simulations personnelles) | `ray1.pas:13131-13189` |
| Langue | Une entrée par langue trouvée ; changer impose de relancer | `ray1.pas:4209-4217`, `5001-5019` |

### 2.5 Menu « Aide » (`ray1.lfm:1947-1984`)

Aide sur OptGeo (ouvre `aide/fr/optgeo.html` dans le navigateur, `ray1.pas:10652`), Contacter l'auteur (courriel, `10632`), Historique des versions (`historique.html`, `6374`), Site Web (`10771`), A propos (`form4`, `10639`), License GPL (texte `gpl.txt`, `13197`).

### 2.6 Barre d'outils 1 : ajout d'objets à la souris (`ray1.lfm:47-677`)

L'infobulle est le seul texte de ces boutons (icônes bitmap dans `Glyph.Data` du `.lfm`). Chaque bouton vérifie d'abord le maximum de 500 objets du type (« Nombre maximal de … deja atteint ! », `unit222.pas:25-35`), passe en mode ajout, change le curseur, écrit la consigne de la 1re étape dans la barre d'état et désactive tout le reste (`desactiveboutons`, `ray1.pas:4775`).

| Groupe | Infobulle exacte | Mode | Consigne affichée au départ | Source |
|---|---|---|---|---|
| Miroirs | Ajouter un miroir plan | ajoutmiroirplan | Positionnez le point 1 (premier bord du miroir) et cliquez... | `ray1.pas:5713` |
| | Ajouter une lame semi-réfléchissante | ajoutlsr | Positionnez le point 1 (premier bord de l'écran) et cliquez... *(sic : « de la lame »)* | `ray1.pas:5747` |
| | Ajouter un miroir sphérique concave paraxial | ajoutmscopa | Positionnez le point 1 (premier bord du miroir) et cliquez... | `ray1.pas:6440` |
| | Ajouter un miroir sphérique convexe paraxial | ajoutmscepa | idem | `ray1.pas:6490` |
| | Ajouter un miroir sphérique concave réel | ajoutmscore | idem | `ray1.pas:6456` |
| | Ajouter un miroir sphérique convexe réel | ajoutmscere | idem | `ray1.pas:6472` |
| | Ajouter un miroir parabolique (ou elliptique, hyperbolique) concave | ajoutconiqueconcave | Positionnez le premier bord du miroir (point 1) et cliquez... | `ray1.pas:10344` |
| | Ajouter un miroir parabolique (ou elliptique, hyperbolique) convexe | ajoutconiqueconvexe | idem | `ray1.pas:10363` |
| Ecrans | Ajouter un écran | ajoutecran | Positionnez le point 1 (premier bord de l'écran) et cliquez... | `ray1.pas:5786` |
| | Ajouter un diaphragme à iris | ajoutdiaphragme | Positionnez le centre du diaphragme et cliquez... | `ray1.pas:5769` |
| Sources | Ajouter un rayon | ajoutrayon | Positionnez le point 1 (origine du rayon) et cliquez... | `ray1.pas:6285` |
| | Ajouter un objet ponctuel réel | ajoutsourceponctuelle (réel) | Positionnez le point objet réel et cliquez... | `ray1.pas:6558` |
| | Ajouter un objet ponctuel virtuel | ajoutsourceponctuelle (virtuel) | Positionnez le point objet virtuel et cliquez... | `ray1.pas:6542` |
| | Ajouter une onde plane (faisceau parallèle) | ajoutondeplane | Positionnez le point 1 (origine d'un rayon et du plan d'onde) et cliquez... | `ray1.pas:6574` |
| Dioptres | Ajouter une lentille mince convergente paraxiale | ajoutlmc | Positionnez le point 1 (premier bord de la lentille) et cliquez... | `ray1.pas:6508` |
| | Ajouter une lentille mince divergente paraxiale | ajoutlmd | idem | `ray1.pas:6526` |
| | Ajouter une lentille épaisse | ajoutlec | Positionnez le sommet de la 1ère face... | `ray1.pas:10490` |
| | Ajouter un polygône réfractant | ajoutpoly (après la boîte « nombre de sommets », min 3) | Positionnez le point 1 du polyhèdre et cliquez... | `ray1.pas:6406-6438` |
| | Ajouter un prisme isocéle | ajoutprisme | Positionnez le centre d'inertie G du prisme et cliquez... | `ray1.pas:6320` |
| | Ajouter une sphère réfractante | ajoutsphere | Positionnez le centre de la sphère et cliquez... | `ray1.pas:6302` |
| | Ajouter une polycercle réfractant | ajoutpolycercle (après la boîte « nombre de sommets », min 2) | Positionnez le sommet 1 de la polysphère et cliquez... | `ray1.pas:10574-10605` |

### 2.7 Barre d'outils 2 (`ray1.lfm:679-1090`)

| Élément | Libellé / infobulle exacte | Effet | Source |
|---|---|---|---|
| Bouton | Mesurer la distance entre deux points | Mode mesure de distance, 2 clics (§5) | `ray1.pas:6255` |
| Bouton | Mesurer un angle | Mode mesure d'angle, 3 clics | `ray1.pas:6269` |
| Bouton « A » | Ajouter un texte sur le dessin | Boîte texte + police, puis 1 clic (coin supérieur gauche) | `ray1.pas:10380-10412` |
| Bouton | Ajouter un trait, une fléche... | 2 clics puis boîte de style | `ray1.pas:5730` |
| Bouton | Cacher des segments de rayon | Affiche les numéros de segments sur le dessin et ouvre la boîte « segments fantômes » (`saisiefantomes`) | `ray1.pas:10607-10622` |
| Bouton | Ajouter (ou éditer) le commentaire de la simulation | Affiche la fenêtre de commentaire | `ray1.pas:10624` |
| Bouton | Ajouter un oeil stylisé | 2 clics : rétine puis centre de la pupille | `ray1.pas:10872` |
| Bouton | Ajouter un réseau diffractant | 2 clics puis boîte des propriétés du réseau | `ray1.pas:6937` |
| Bouton | Ajouter un point | Boîte de style du point, puis 1 clic | `ray1.pas:6955-6994` |
| Bouton « Coord. » | Afficher les coordonnées et les longueurs des segments | Numérote les segments sur le dessin et ouvre un tableau : Segment, x1, y1, x2, y2, Longueur (en unité), Angle polaire (en radians) | `ray1.pas:13210-13236` |
| Case « Normales » (cochée) | Afficher les normales | Trace les normales aux points d'incidence. Décocher alors que les angles sont affichés est refusé : « L'affichage des angles impose le tracé des normales » | `ray1.pas:10524-10533` |
| Case « Angles d'incid. et de réfr. » | Afficher les valeurs des angles d'incidence et de réfraction | Cocher coche aussi les normales | `ray1.pas:10535-10548` |
| Case « Grille » | Afficher les grille *(sic)* | Grille de points (un pixel par nœud, `monbitmap.pas:196-213`) | `ray1.pas:10447` |
| Case « Attraction » | Activer/désactiver l'atraction de la grille *(sic)* | Arrondit chaque clic de création au nœud le plus proche (§6.3) | `ray1.pas:10454` |
| Case « Long. segments » | Afficher les longueurs des segments | Écrit la longueur de chaque segment de rayon | `ray1.pas:6341` |
| Liste « Zoom: » | Facteur de zoom | x1, x2, x5, x10, x20, x50, x100 (§6.2) | `ray1.lfm:952-974`, `ray1.pas:5802-5856` |

### 2.8 Palette « Actions » (`unit1_palette.lfm`, `unit1_palette.pas`)

| Bouton | Infobulle | Effet | Source |
|---|---|---|---|
| Déplacer ↔ Fin dépl. | Déplacer un élément existant: translation, rotation, changement focale ou rayon de courbure... | Bascule le mode Déplacer (ignoré s'il n'y a aucun objet) | `unit1_palette.pas:259-286` |
| Dupliquer ↔ Fin dupl. | Dupliquer un élément existant | Bascule le mode Dupliquer | `unit1_palette.pas:288-311` |
| Propriétés ↔ Fin prop. | Propriétés d'un élément existant | Bascule le mode Propriétés | `unit1_palette.pas:313-335` |
| Supprimer ↔ Fin sup. | Supprimer un élément existant | Bascule le mode Supprimer | `unit1_palette.pas:337-360` |
| Supprimer tout | Supprimer tous les éléments existant | Confirmation puis tout effacer (annulable) | `unit1_palette.pas:415-464` |
| Grouper ↔ Fin groupement | Grouper des éléments existants pour les translater ensemble | Consigne « Cliquez sur les croix violettes des éléments à grouper, puis sur Fin... » ; à la fin, si au moins 2 éléments : « Le groupe n°N vient d'être créé. Ses éléments pourront être translatés ensemble. » | `unit1_palette.pas:362-413` |
| Grouper tout | Créer un groupe contenant tous les éléments | Sans confirmation ; « Un nouveau groupe contenant tous les éléments vient d'être créé. » | `unit1_palette.pas:165-257` |
| Imprimer, Export PNG, Export JPG, Export PS, Copier | (mêmes infobulles que les menus) | Raccourcis vers les commandes du menu Fichier / Édition | `unit1_palette.pas:140-163` |

## 3. Modes, curseurs, barre d'état, clavier

### 3.1 Liste des modes et texte du panneau « mode » (`ray1.pas:4818-4857`)

Chaque mode écrit dans le panneau 4 de la barre d'état un texte du type « Mode: ajout d'un miroir plan. Esc pour annuler. ». Modes : ajout d'un rayon lumineux, d'un miroir plan, d'un réseau diffractant, d'un trait ou d'une fléche, d'un miroir conique concave / convexe, d'un polyhèdre réfractant, d'un prisme isocèle, d'une polysphère réfractante, d'un écran, d'un oeil, d'une lame semi-réfléchissante, d'un miroir sphérique concave / convexe, d'une lentille mince convergente / divergente, d'une lentille épaisse, d'une sphère réfractante, d'une source ponctuelle, d'une onde plane, d'un point, d'un texte, d'un diaphragme ; « Mode: déplacement d'un élément existant », « Mode: propriétés d'un élément existant », « Mode: duplication d'un élément existant », « Mode: suppression d'un élément existant », « Mode: mesure de distance », « Mode: mesure d'angle », « Mode: ajout d'un groupe. Esc pour annuler. "Fin" pour achever le groupement. ».

### 3.2 Ce qui est verrouillé pendant un mode

`desactiveboutons` (`ray1.pas:4775-4857`) grise les 5 menus, toutes les cases d'affichage, le zoom, tous les boutons d'ajout et tous les boutons de la palette sauf celui du mode en cours. `activeboutons` (`ray1.pas:4859-4954`) rétablit tout et remet **tous** les indicateurs de mode à faux : c'est la sortie commune.

### 3.3 Clavier

- **Échap** (seule touche gérée, `FormKeyPress`, `ray1.pas:5689-5703`) : annule le mode en cours quel qu'il soit (création interrompue sans rien créer, mode Déplacer / Propriétés / … quitté), remet le bouton « Grouper » à son libellé, efface la consigne, redessine. En mode Déplacer, Échap **ne remet pas** l'objet en cours de déplacement à sa position de départ : il reste là où l'aperçu l'a laissé (§9.A-1.4). INCERTAIN : la fiche n'a pas `KeyPreview`, Échap pourrait ne pas être reçue quand une case ou la liste de zoom a le focus.
- **Alt** maintenue pendant un clic ou un mouvement de création : l'abscisse est bloquée sur celle du dernier clic (alignement vertical) ; **Ctrl** maintenue : l'ordonnée est bloquée (alignement horizontal). Seulement à partir du 2e clic (`point1fait`) (`ray1.pas:1143-1146`, `2962-2963`).
- Raccourcis des menus : §2.2.

### 3.4 Barre d'état

- Panneaux X et Y : coordonnées monde du curseur, avec une incertitude d'un demi-pixel arrondie à un chiffre significatif, suivies de l'unité, ex. « X=123,4±0,5mm » (`affichecoordonnees`, `unit222.pas:1487-1510`). Une coordonnée nulle n'est pas réécrite (`if xx<>0`) : défaut à ne pas reproduire.
- Panneau 3 : consigne de l'étape (« Positionnez le foyer et cliquez. »…), ou, en mode Propriétés/Dupliquer, « Cliquez pour afficher les propriétés de cet élément... » / « Cliquez pour dupliquer cet élément... » quand le curseur est sur un point actif (`ray1.pas:3436`, `3615`).
- Panneau 4 : le mode (§3.1).

### 3.5 Curseurs

Un curseur dédié par étape (`ray1.pas:4728-4762`) : Point1, Point2, Foyer, Centre, Centre1, Centre2, CentreG, Sommet, Sommet1, Sommet2, Source, Direction, Suivant, Fin, Texte, Info, Prop, Dupliquer, Translation, Rotation, Depla, Deplacement, DepFoyer, DepCentre, DepSommet, Taille, Groupe, Marteau, Ancre, Viseur, Debut. Dans le web, ils sont remplacés par la consigne écrite et par l'aperçu (§12.3).

### 3.6 Zone active des points (Propriétés, Dupliquer)

Un point est « sous le curseur » si l'écart est au plus 1,1 × la taille de 3 pixels, sur x **et** sur y (carré d'environ 7 × 7 px) : `tx`, `ty` calculés par `BIBI.convert(3, hauteur-3)` (`ray1.pas:3029-3030`, `unit222.pas:16893-16894`). Si plusieurs objets ont un point actif sous le curseur, la fenêtre `form_quelobjet` (titre « Propriétés de l'objet: » ou « Objet à dupliquer: ») propose une liste déroulante « Miroir plan n° 2 », « Rayon n° 1 », etc. (`unit222.pas:18476-18562`).

Points actifs en mode **Propriétés** (`ray1.pas:3031-3437`) :

| Objet | Points actifs |
|---|---|
| Mesure de distance, trait/flèche, mesure d'angle | centre (milieu ou sommet de l'angle) |
| Texte | point d'ancrage (coin supérieur gauche) |
| Sphère | centre et les 4 points cardinaux du cercle |
| Miroir conique | sommet, foyer, les 2 extrémités |
| Miroir plan, réseau, écran, lame semi-réfléchissante | milieu et les 2 extrémités |
| Polyèdre, prisme, polycercle | chaque sommet |
| Œil | centre et point A |
| Diaphragme | centre, 2 bords extérieurs, 2 bords intérieurs |
| Point | le point |
| Miroirs sphériques paraxiaux | sommet, foyer, 2 extrémités |
| Miroirs sphériques réels | sommet, centre de courbure, 2 extrémités |
| Lentilles minces | centre optique, 2 foyers, 2 extrémités |
| Lentille épaisse | centre, 2 sommets |
| Rayon | origine, point de direction et milieu |
| Source ponctuelle | source, 2 points des rayons limites |
| Onde plane | 2 extrémités du plan d'onde, point de direction, extrémité du dernier rayon |

Points actifs en mode **Dupliquer** (`ray1.pas:3446-3607`) : un seul par objet, en général le centre : texte (ancrage), flèche, point, mesures (centre), sphère (centre), réseau, miroir plan, écran, lame, œil, diaphragme (centre), miroirs sphériques et conique (sommet), lentilles minces et épaisse (centre optique), rayon (milieu), source ponctuelle (milieu des 2 points limites), onde plane (1re extrémité), polyèdre et prisme (milieu de chaque côté), polycercle (sommets).

## 4. Démarrage et espace de travail

1. Au lancement (`FormShow`, `ray1.pas:5467-5662`) : lecture du fichier de configuration (répertoires, couleurs et épaisseurs par défaut, police, `ray1.pas:409-641`) ; l'image prend la taille de la zone visible, et cette taille en pixels devient l'espace de travail par défaut : x de 0 à la largeur, y de 0 à la hauteur, en « mm ».
2. Boîte de démarrage `saisiechoix` (indices rouge/vert/bleu par défaut du milieu ambiant, préremplis à 1 ; choix : espace par défaut, espace à définir, ouvrir un exemple). Valeur illégale → message « Valeur illégale de l'indice … par défaut; remplacé par 1 » et valeur 1 ; les valeurs sont prises en valeur absolue (`ray1.pas:5498-5526`).
3. Selon le choix : espace par défaut (proportions respectées) ; boîte `saisieespacetravail` (dimensions, rapport idéal/actuel) ; ou ouverture d'un exemple (si l'ouverture est annulée : espace par défaut) (`ray1.pas:5560-5632`).
4. Pas de grille initial : (xmax − xmin)/20 et (ymax − ymin)/20, tronqués au premier chiffre significatif (ex. 63,9 → 60) (`ray1.pas:5636-5641`).
5. Chargement de la liste des matériaux `listen.lst` (18 matériaux : nom, puis indices bleu, vert, rouge, `ray1.pas:5537-5558`) ; l'entrée 0 « ... » vaut rouge 1,5 / vert 1,6 / bleu 1,7. Fichier absent : « Fichier des indices de réfraction non trouvé ! ».
6. Longueurs d'onde par défaut : rouge 632 nm, vert 520 nm, bleu 450 nm (`unit222.pas:40260-40262`).

« Respecter les proportions » (`respectrapport`) : si vrai, l'image garde le rapport hauteur/largeur de l'espace de travail ; sinon elle remplit la zone (`retaille_image1`, `ray1.pas:4956-4980`).

## 5. Création des objets à la souris : séquences exactes

Notations : C1, C2… = clics successifs dans le dessin. « Projeté sur l'axe » = le point cliqué est remplacé par sa projection orthogonale. Après chaque clic de création : **arrondi à la grille si l'attraction est active** (`ray1.pas:1229`, sauf pour les mesures qui sont traitées avant, `ray1.pas:1135-1221`), contrôle « points trop proches » (distance < `taillemini` = 1/10 de la taille de 2 pixels, `ray1.pas:5663-5670`, désactivable §2.4). Si la création échoue, un message est affiché et **le mode est quitté sans rien créer** (sauf mention). Dans tous les cas un objet créé est enregistré dans l'historique d'annulation (`sauvevirtuel`).

Aides visuelles communes : au 1er clic, petit cercle à la position cliquée (rayon 2 × épaisseur) ; ensuite un trait pointillé du dernier point au curseur suit la souris (tracé en XOR, `ray1.pas:3656-3830`).

| Objet | Étapes (consigne exacte de la barre d'état après chaque clic) | Ce que définit chaque clic | Erreurs | Source |
|---|---|---|---|---|
| Miroir plan | C1 → « Positionnez le point 2 (autre bord du miroir) et cliquez... » ; C2 → création | C1, C2 : extrémités. Créé avec hachures, couleur et épaisseur par défaut | « Taille du miroir trop petite, ou débordant de l'écran ! » | `ray1.pas:1742-1765` |
| Réseau diffractant | C1 → « Positionnez le point 2 (autre bord du réseau) et cliquez... » ; C2 → création **puis ouverture immédiate de la boîte « Propriétés de ce réseau »** (Annuler garde les valeurs par défaut) | Extrémités ; défaut : 500 traits/mm, en transmission, sans hachures, ordres −1 à 1 | « Taille du réseau trop petite, ou débordant de l'écran ! » | `ray1.pas:1768-1840` |
| Écran | C1 → « Positionnez le point 2 (autre bord de l'écran) et cliquez... » ; C2 | Extrémités | « Taille de l'écran trop petite ! » | `ray1.pas:1875-1895` |
| Lame semi-réfléchissante | C1 → « Positionnez le point 2 (autre bord de la lame) et cliquez... » ; C2 | Extrémités | « Taille de la lame trop petite ! » | `ray1.pas:1921-1941` |
| Œil stylisé | C1 → « Positionnez le point 2 (centre pupille) et cliquez... » ; C2 | C1 : rétine (selon la consigne du bouton, `ray1.pas:10881`) ; C2 : centre de la pupille | « Taille de l'oeil trop petite ! » | `ray1.pas:1898-1918` |
| Trait, flèche | C1 → « Positionnez l'autre extrémité du trait et cliquez... » ; C2 → boîte de style (`saisiefleche`) → création | Extrémités ; style, extrémités, tailles choisis dans la boîte | « Taille du trait trop petite ! » | `ray1.pas:1843-1872` |
| Rayon | C1 → « Positionnez le point 2 (direction du rayon) et cliquez... » ; C2 | C1 : origine ; C2 : un point de la direction. Défaut : aucun prolongement virtuel, 10 rayons « enfants » au plus, 500 segments au plus | « Points trop proches ! » | `ray1.pas:1944-1964` |
| Objet ponctuel réel | C1 → « Positionnez le point 1 (rayon1 limitant le faisceau) et cliquez... » ; C2 → « Positionnez le point 2 (rayon 2 limitant le faisceau) puis cliquez... » ; C3 → boîte « Nombre de rayons émis par cette source ponctuelle » → création | C1 : source S ; C2, C3 : un point de chacun des deux rayons limites du faisceau (aperçu : segments S–C2 et S–curseur) | « Points trop proches ! » (C2 trop près de S ; C3 trop près de S ou de C2 : le clic est simplement refusé, on reste dans l'étape) | `ray1.pas:1510-1594`, `1967-1987`, `2061-2128` |
| Objet ponctuel virtuel | Idem, consigne du bouton « Positionnez le point objet virtuel et cliquez... », boîte « Nombre de rayons convergents vers cet objet virtuel » | Idem ; créé avec `sourcevirtuelle` vrai et prolongement virtuel du segment 1 (`vav = '(1)'`) | idem | `ray1.pas:2088-2118`, `6542-6556` |
| Onde plane | C1 → « Positionnez le point D (direction du rayon) et cliquez... » ; C2 → « Positionnez le point 2 (extrémité du plan d'onde) puis cliquez... » ; C3 → boîte du nombre de rayons → création | C1 : une extrémité du plan d'onde (origine d'un rayon) ; C2 : point D donnant la direction des rayons ; C3 : autre extrémité du plan d'onde | « Points trop proches ! » (refus du clic) | `ray1.pas:1989-2058` |
| Lentille mince convergente / divergente | C1 → « Positionnez le point 2 (autre bord de la lentille) et cliquez... » ; C2 → l'axe optique est tracé (droite perpendiculaire au milieu, d'un bord à l'autre de l'espace), « Positionnez un foyer et cliquez. » ; C3 | C1, C2 : bords ; C3 projeté sur l'axe (d'un côté ou de l'autre) : foyer, |f| = distance au centre | C2 : « Taille de la lentille trop petite ! » ; C3 : « Données aberrantes ! » | `ray1.pas:2569-2680`, `2881-2926` |
| Miroir sphérique paraxial concave / convexe | C1 → « Positionnez le point 2 (autre bord du miroir) et cliquez... » ; C2 → demi-axe tracé à partir du milieu, « Positionnez le foyer et cliquez. » ; C3 | C3 projeté sur le **demi-axe** (un seul côté : côté réfléchissant pour le concave, côté opposé pour le convexe ; projection bornée au sommet) : foyer | C2 : « Taille du miroir trop petite ! » ; C3 : « Taille du miroir trop petite ou focale trop courte, ou débordant de l'écran ! » | `ray1.pas:2209-2291`, `2742-2786` |
| Miroir sphérique réel concave / convexe | C1 → idem ; C2 → axe complet tracé, « Positionnez le centre de courbure et cliquez. » ; aperçu : arc de cercle pointillé passant par les bords ; C3 | C3 projeté sur l'axe : centre de courbure | « Taille du miroir trop petite ou focale trop courte, ou miroir débordant de l'écran ! » | `ray1.pas:2293-2430`, `2787-2845`, aperçu `3925-4012` |
| Miroir conique (parabolique, elliptique, hyperbolique) concave / convexe | C1 → « Positionnez le foyer de la conique et cliquez... » ; C2 → « Positionnez le sommet de la conique et cliquez... » ; C3 → la conique entière est tracée en aperçu, « Pour finir, positionnez l'autre extrémité du miroir et cliquez. » ; C4 | C1 : 1re extrémité M ; C2 : foyer F ; C3 : sommet S ; l'excentricité e et le paramètre p sont calculés pour que la conique de foyer F et de sommet S passe par M ; C4 : 2e extrémité, ramenée sur la conique dans la direction F→curseur | C3 : « Données de construction de la conique aberrantes ! » si e < 0 ou p ≤ 0 ; C4 : « Données de construction du miroir aberrantes ! » | `ray1.pas:2432-2546` |
| Diaphragme à iris | C1 → « Positionnez le bord intérieur (point 1) et cliquez... » ; C2 → demi-droite tracée du bord intérieur vers l'extérieur, « Positionnez le bord extérieur (point 2) et cliquez.. » ; C3 | C1 : centre ; C2 : bord intérieur (rayon intérieur et orientation) ; C3 projeté sur la demi-droite : bord extérieur. L'aperçu montre les deux bords symétriques | C2 : « Rayon intérieur du diaphragme trop petit ! » (refus du clic) ; C3 : « Epaisseur du diaphragme trop petite, ou diaphragme débordant de l'écran ! » | `ray1.pas:2130-2207`, `2710-2740` |
| Lentille épaisse | C1 → « Positionnez le sommet de la 2ème face... » ; C2 → « Positionnez le centre de courbure de la 1ère face puis cliquez... » ; C3 → « Positionnez le centre de courbure de la 2ème face puis cliquez... » ; C4 → « Saisissez le diamètre de la lentille... » + boîte `saisiediametre` (se rouvre tant qu'on ne valide pas par OK) | C1, C2 : sommets S1, S2 (définissent l'axe) ; C3, C4 projetés sur l'axe : centres C1, C2 (aperçu : cercle complet pointillé de chaque face) ; signe des rayons : R positif si le centre est du côté opposé à l'autre sommet. Défaut : indices rouge 1,4, bleu 1,8, vert 1,6 ; axe affiché ; jamais de réflexion | C2 : « Sommets trop proches ! » ; fin : « Données aberrantes! » | `ray1.pas:1603-1713`, aperçu `3701-3750` |
| Sphère réfractante | C1 → « Positionnez un point de la surface et cliquez... » ; C2 | C1 : centre ; C2 : point de la surface (aperçu : cercle pointillé). Défaut : indices 1,4 / 1,8 / 1,6 (rouge/bleu/vert) | « Rayon de la sphère trop petit ou trop grand! » | `ray1.pas:1716-1739` |
| Prisme isocèle | C1 → « Positionnez le point A (sommet du prisme) et cliquez... » ; C2 → « Dernier point pour l'angle au sommet... » ; C3 | C1 : centre d'inertie G ; C2 : sommet A ; la base est perpendiculaire à GA et passe par H = G − (A − G)/2 ; C3 projeté sur la base : un sommet de base, l'autre est son symétrique (aperçu : triangle pointillé et cercles rouges en G, A, H). Défaut : indices 1,4 / 1,8 / 1,6 | C2 : « Taille du prisme trop petite ! » ; C3 : « Données aberrantes ! » | `ray1.pas:2548-2567`, `2846-2879`, aperçu `4051-4089` |
| Polyèdre réfractant | Boîte « Sommets de ce polyhèdre » (nombre N, min 3 ; Annuler quitte) ; puis N clics, consigne « Positionnez le point suivant et cliquez... » ; le polygone se ferme seul au N-ième clic | Chaque clic : un sommet (aperçu : côtés tracés, côté en cours pointillé, et fermeture vers le sommet 1 au dernier) | « Points saisis aberrants ! » | `ray1.pas:1288-1321`, `6406-6438` |
| Polycercle (« polysphère ») réfractant | Boîte « Sommets de cette polysphère » (N, min 2) ; N clics (sommets) ; puis, **pour chaque côté**, une boîte modale « Relier les points i et i+1 par: » (segment ou arc de cercle) ; puis, pour chaque côté en arc, un clic « Positionnez le sommet de l'arc de cercle entre les points i et j... » | Le clic d'arc est projeté sur la médiatrice de la corde : il donne le sommet de l'arc (aperçu : polygone pointillé numéroté, extrémités de la corde en bleu, arcs déjà définis) | « Points saisis aberrants ! » | `ray1.pas:1324-1507`, aperçu `3640-3699` |
| Texte (bouton « A ») | Boîte `saisietexte` (texte et police ; Annuler quitte) ; puis C1 « Positionnez le bord supérieur gauche du texte et cliquez... » | Position du coin supérieur gauche | — | `ray1.pas:10380-10412`, `1266-1284` |
| Point | Boîte `fsaisiejolipoint` (taille, épaisseur, couleur, style) ; puis C1 « Positionnez le point » | Position | « Taille du trait trop petite ! » | `ray1.pas:6955-6994`, `1232-1263` |
| Mesure de distance | Consigne « Cliquer sur l'origine du segment... » ; C1 → « Positionnez l'extrémité du segment et cliquez... » ; C2 | Les deux points ; l'objet « mesure » reste affiché avec sa valeur. **Pas d'attraction de grille** | — | `ray1.pas:6255-6267`, `1144-1198` |
| Mesure d'angle | Consigne « Cliquer sur le centre (intersection des droites)... » ; C1 → « Positionnez l'extrémité du 1er segment et cliquez... » ; C2 → « Positionnez l'extrêmité du 2nd segment... » ; C3 | Sommet, puis un point sur chaque côté. **Pas d'attraction de grille** | — | `ray1.pas:6269-6283`, `1144-1225` |

Remarque : le « contrôle des points trop proches » refuse le clic en restant dans l'étape pour les sources et le diaphragme ; pour la lentille épaisse et le miroir conique, il quitte le mode (`ray1.pas:1605-1618`, `2453-2470`).

## 6. Affichage, vue et aides

### 6.1 Normales et angles
Normales tracées à chaque point d'incidence (longueur = pourcentage de la taille de l'espace, 5 % par défaut ; couleur noire ; épaisseur 1 : `unit222.pas:40225`). « Angles » écrit les angles d'incidence et de réfraction avec `decimalesangles` décimales (0 par défaut). Les angles imposent les normales (§2.7). Réglages : boîte `saisienormale` (`ray1.pas:10550`).

### 6.2 Zoom et déplacement de la vue
Facteurs x1, x2, x5, x10, x20, x50, x100 seulement (liste) ; l'image est agrandie d'autant et les barres de défilement apparaissent ; à chaque changement la vue revient en haut à gauche (`ray1.pas:5845-5846`). Pas de zoom à la molette ni de zoom centré sur un point ; changer le zoom est impossible pendant un mode (la liste reprend sa valeur, `ray1.pas:5804-5816`). Les incertitudes affichées dans la barre d'état tiennent compte du zoom (`unit222.pas:1494-1500`).

### 6.3 Grille et attraction
Grille de points de pas `grillex`, `grilley` (unités de l'espace). Attraction : arrondi au nœud le plus proche, nœuds comptés à partir de (xmin, ymin) (`monbitmap.pas:183-193`). S'applique aux clics de **création** (pas aux mesures) ; pour les déplacements, voir §9 (poignées). Le pas est enregistré dans le `.opt`.

### 6.4 Coordonnées et longueurs des segments
Bouton « Coord. » : tableau (§2.7) et numéros de segments affichés sur le dessin pendant que le tableau est ouvert. Case « Long. segments » : longueur écrite sur chaque segment, enregistrée dans le `.opt` (« OPTIONS AFFICHER LONGUEUR SEGMENT »).

### 6.5 Segments fantômes
Bouton « Cacher des segments de rayon » : les numéros de tous les segments s'affichent ; la boîte `saisiefantomes` (case « fantômes présents », liste de numéros `listefantomes`) choisit les segments à ne pas dessiner. Enregistré dans le `.opt` (« OPTIONS SEGMENTS FANTOMES »). Détail de la boîte : §10.

### 6.6 Empennage
Petite flèche dessinée sur chaque segment de rayon pour indiquer le sens de propagation ; position (défaut 500) et taille (défaut 5) (`unit222.pas:40257`). Position en millièmes de la longueur du segment à partir de son début ; taille en millièmes de la diagonale de l'espace de travail (`unit19.pas:76-88`, dessin `unit222.pas:31092-31117`) ; détail §11, F5.

### 6.7 Surfaces d'onde et chemin optique
Une source ponctuelle **réelle** ou une onde plane peut porter une liste de chemins optiques (`listechemins`) ; pour chaque valeur, OptGeo lance `maxrayonsrecherchesurfacesonde` rayons (20 par défaut) et trace en pointillé la surface d'égal chemin optique. **Ces surfaces ne sont jamais tracées si la scène contient une lentille mince ou un miroir sphérique paraxial** (idéaux) (`unit222.pas:3730-3790`, `ray1.pas:6127`). Réglage du nombre de rayons : Options › Surfaces d'onde.

### 6.8 Couleurs des rayons et lumière blanche
Seules quatre « couleurs » de lumière existent : rouge, vert, bleu (longueur d'onde associée, `unit222.pas:32089-32091`) et la lumière blanche, **codée par le noir** dans les fichiers et le code (`unit17.pas:1195-1200` : le choix « Blanc » donne `clBlack`). Un rayon **noir**, en présence d'un milieu dispersif ou d'un réseau, est remplacé par trois rayons rouge, vert et bleu (lumière blanche) (`unit222.pas:3636-3655`). Les boîtes des sources proposent donc un choix de couleur fermé (groupe d'options `radiocouleur`, `unit222.pas:19380`) : voir §10.

## 7. Annuler / Refaire

- Après chaque action qui modifie la scène (création, OK dans une boîte, fin de déplacement, suppression, groupement, ajustement de l'espace, couleur de fond, empennage…), l'état complet est sérialisé en mémoire (`sauvevirtuel`, `ray1.pas:12404`) — même format que le `.opt`.
- 50 états au plus (`maxannulation`, `ray1.pas:387`) ; au-delà, le plus ancien est oublié (`ray1.pas:12428-12436`).
- « Défaire » recharge l'état précédent et active « Refaire » ; une nouvelle action vide la pile de « Refaire » (`ray1.pas:13114-13129`, `12425`).
- Nouvelle simulation, ouverture d'un fichier : l'historique repart de zéro (`ray1.pas:7419`, `9186`).
- Changer l'affichage (normales, grille, zoom) n'est pas annulable.

## 8. Fichiers

### 8.1 Ouvrir
Boîte d'ouverture (`.opt`), puis lecture ; fichier illisible : « Fichier inaccessible ! », « Fichier inaccessible en lecture! » ; erreur de format : « Fichier endommagé!!! » puis nouvelle simulation vide (`ray1.pas:8217-8231`, `9136-9141`). Le commentaire est lu dans le `.txt` (ou `.rtf`) de même nom et la fenêtre de commentaire s'ouvre s'il n'est pas vide (`ray1.pas:9145-9171`). Les cases d'affichage reprennent les valeurs du fichier.

### 8.2 Superposer
Refus si la scène est vide : « Pas de simulation en cours... » / « Hélas ». Question « Les paramètres de la simulation en cours de chargement doivent-ils écraser les actuels ? » (Oui/Non). L'espace de travail devient la réunion des deux ; les objets du fichier sont ajoutés et **réunis dans un nouveau groupe** : « Un nouveau groupe contenant les éléments ajoutés vien d'être créé. » / « Importation réussie » (`ray1.pas:9226-9300`, `10240-10282`).

### 8.3 Enregistrer : contenu du `.opt`
Texte, sections dans cet ordre (`enregistrer`, `ray1.pas:7560-8145`) : « NE PAS MODIFIER CE FICHIER », « VERSION » (301), espace de travail (xmin xmax ymin ymax) et respect des proportions, « UNITE », « OPTIONS GRILLE » (affichée, attraction, pas x, pas y), « OPTIONS NORMALES » (normales, angles, pourcentage, couleur, épaisseur, décimales), « OPTIONS SEGMENTS FANTOMES » (présents, liste), « NOMBRE POINTS TRACE SURFACE ONDE », « INDICES PAR DEFAUT » (vert, bleu, rouge), « LAMBDA » (rouge, bleu, vert, en m), puis pour chaque type « Nombre de … : » et « Numero i » + données : miroirs plans, réseaux, miroirs concaves/convexes paraxiaux, concaves/convexes réels, lentilles minces convergentes/divergentes, rayons, sources ponctuelles, ondes planes, écrans, diaphragmes, lames semi-réfléchissantes, polyèdres, prismes, polycercles, sphères, miroirs coniques, textes (avec police), lentilles épaisses, angles, traits, yeux, mesures de distances, « jolis points », groupes (liste de couples indice/type), « couleur fond simulation », « empennage » (position, taille), « OPTIONS AFFICHER LONGUEUR SEGMENT ». Le **commentaire** va dans un `.txt` séparé de même nom (`ray1.pas:8131-8139`). **Non enregistrés** : image de fond, zoom, préférences (couleurs par défaut), contrôle des points trop proches. Le format exact et la lecture relèvent du moteur (autre agent).

### 8.4 Exporter, copier, imprimer
PNG, JPG : l'image affichée telle quelle (taille de la zone × zoom). PS : redessin vectoriel en PostScript. Copier : l'image dans le presse-papiers. Imprimer : boîte `configimpression` (position horizontale/verticale, pourcentage de la page, nombre de copies, respect des angles) puis redessin pour l'imprimante (`ray1.pas:5866-6207`).

## 9. Poignées et modes Déplacer, Supprimer, Grouper

Deux parties, chacune avec sa numérotation interne : un renvoi « 9.A-3.1 » désigne la section 3.1 de la partie A ; à l'intérieur d'une partie, « § n » renvoie à sa propre numérotation. Rappel commun (`ray1.lfm:1108-1115`, `ray1.pas:1088-1128`) : le mode Déplacer fonctionne par **clic (saisir) – mouvement (aperçu ; l'objet est modifié en direct) – clic (poser)**, sans glisser-déposer ; la zone de saisie d'une poignée est un carré d'environ ±3,3 px ; on reste dans le mode après chaque pose ; Échap quitte le mode sans remettre l'objet en place. La version web remplace ce fonctionnement par le glisser-déposer de poignées agrandies (§12.4) en gardant **la même signification pour chaque poignée**.

### 9.A Miroirs, réseau, lentilles, lame, écran, diaphragme, lentille épaisse

Source : OptGeo 3.03 (`~/src/optgeo-amont/src/`). Les références `fichier.pas:ligne` renvoient aux fichiers d'origine (mêmes numéros de ligne que les copies lisibles). Les textes entre « » sont les chaînes de ressource françaises exactes.

Notations utilisées dans toute la partie :

- `M` : position du pointeur convertie en coordonnées du monde (`BIBI.convert(x,y,x1,y1,…)`, `unit222.pas:4149`).
- `a1`, `a2` : extrémités ; `c` : milieu (segments) ; `s` : sommet (miroirs) ; `o` : centre optique (lentilles) ; `f`, `f1`, `f2` : foyers ; `C` ou `c` : centre de courbure (miroirs réels) ; `s1`, `s2` : sommets de la lentille épaisse ; `ap1`, `ap2` : points symétriques de `a1`, `a2` par rapport au centre du diaphragme.
- `tprot` : code interne de la poignée saisie (`tpa1`, `tpa2`, `tpa1c`, `tpa2c`, `tpfo`, `tpf1`, `tpf2`, `tpce`, `tpsc`, `tpsf`, `tpap1`, `tpap2`). « Translation » = `modetranslation`, toutes les autres = `moderotation` (même quand ce n'est pas une rotation).
- `taillemini` = 1/10 de la taille d'un pixel écran en unités du monde (min des deux axes) (`ray1.pas:5659-5670`). C'est le seuil « points trop proches » des fonctions `create` (désactivable par l'option `desactiver_controle_points_trop_proches`).

---

#### 1. Comportement général du mode « Déplacer »

##### 1.1 Entrée dans le mode

| Accès | Détail | Référence |
|---|---|---|
| Palette : bouton « Déplacer » (texte vert gras, bulle « Déplacer un élément existant: translation, rotation, changement focale ou rayon de courbure... ») | Ne fait rien s'il n'y a aucun objet (`nombrequelquechose=0`). Sinon : `modemodif:=true`, `modifencours:=false`, curseur `crdepla`, tous les autres boutons et **les 5 menus principaux** désactivés (`desactiveboutons`), ainsi que la case Grille, la case Attraction, les normales, les angles, la liste de zoom. Le bouton reste actif et son libellé devient « Fin dépl. ». Redessin complet (`Rafraichit`) pour faire apparaître les poignées. | `unit1_palette.pas:259-274`, `unit1_palette.lfm:19-32`, `ray1.pas:4775-4859` |
| Menu Édition → « Déplacer un élément », raccourci **Ctrl+M** (ShortCut 16461) | Appelle le même gestionnaire que le bouton. | `ray1.lfm:1255-1259`, `ray1.pas:10714-10717` |

Barre d'état à l'entrée : panneau 3 = « Mode: déplacement d'un élément existant. Esc pour annuler. » (`ray1.pas:4846`).

Remarque : la page d'aide parle de « Edition » → « Déplacement d'un élément » ; le libellé réel du menu est « Déplacer un élément ».

##### 1.2 Interaction : clic, déplacement, clic (pas de glisser-déposer)

Vérifié dans le code : **ce n'est pas un glisser-déposer**.

- L'image n'a que `OnMouseDown` et `OnMouseMove` ; aucun `OnMouseUp` (`ray1.lfm:1113-1114`).
- `Image1MouseDown` (`ray1.pas:1088-1128`) : si `modemodif` et pas de modification en cours → `DebutModif` (saisie d'une poignée) ; si `modemodif` et `modifencours` → `FinModif` (pose), puis `sauvevirtuel`.
- `Image1MouseMove` (`ray1.pas:2951-2954`) : en mode Déplacer, appelle toujours `TraiteModif`, bouton enfoncé ou non.
- Le bouton de la souris n'est **pas testé** : gauche, droit ou milieu déclenchent la même chose (les messages disent pourtant « clic gauche »).
- L'aide le décrit ainsi : « on clique et on relâche; on déplace la souris jusqu'à destination, on clique et on relâche; l'élément est redessiné "en direct" au fur et à mesure du déplacement » (`aide/fr/optgeo.html`, section « Déplacer un élément ou une source »).
- Conséquence : un glisser (appui, déplacement, relâchement) laisse l'objet « accroché » au pointeur ; il faut un second clic pour le poser.

Déroulement :

1. **Survol sans modification en cours** (`TraiteModif`, `unit222.pas:4160-4842`) : on teste les poignées dans un ordre fixe ; au premier point trouvé, le curseur et le panneau 2 changent (tableau 1.9) ; sinon curseur `crdepla` et « Faites passer la souris sur un des éléments colorés... ».
2. **Clic 1** (`DebutModif`, `unit222.pas:10839-14962`) : on recense **toutes** les poignées sous le pointeur (§ 2). Aucune → curseur `crdepla`, panneau 2 « Faites passer la souris sur un point cerclé... », panneau 3 « Mode: déplacement d'un élément existant. Esc pour annuler. », on reste en attente. Une seule → elle est saisie. Plusieurs → boîte de choix (§ 2).
3. **Déplacement** (`TraiteModif`, branche `moderotation` `unit222.pas:4845-8787` ou `modetranslation` `8788-9996`) : à chaque mouvement, l'objet réel est recalculé (pas un fantôme) puis toute la simulation est retracée (`Rafraichit` : rayons compris).
4. **Clic 2** (`FinModif`, `unit222.pas:20504-25753`) : même calcul qu'au déplacement, au point cliqué (vérifié : blocs identiques, à l'ordre près), avec en plus l'attraction de la grille pour une translation. Puis `sauvevirtuel` (`ray1.pas:1121`).
5. On **reste dans le mode Déplacer** (`modemodif` reste vrai ; seul `modifencours` repasse à faux). Barre d'état après pose : panneau 3 « Mode: déplacement d'un élément existant. Esc pour annuler. » ; panneau 2 « Faites passer la souris sur un des éléments colorés... » après une translation (`unit222.pas:21722-21724`), « Faites passer la souris sur un point cerclé... » après une autre poignée (`unit222.pas:25750-25752`). Le curseur n'est pas remis : il change au mouvement suivant. Exception : si le mode Déplacer a été ouvert par une duplication, la pose ferme tout (`unit222.pas:21725-21733`, hors périmètre).

##### 1.3 Validation et refus (pendant l'aperçu et à la pose)

Schéma identique pour tous les objets (ex. miroir plan `unit222.pas:5342-5372`) :

1. On agrandit la liste d'un emplacement d'essai (`retailleP…(liste, n, n+1)`).
2. On essaie `create`/`create2` avec les nouvelles valeurs sur cet emplacement.
3. Si l'essai réussit, on recrée l'objet réel avec ces valeurs ; **sinon on le recrée avec ses valeurs actuelles** (il ne bouge pas).
4. On supprime l'emplacement d'essai et on retrace (`Rafraichit`).

**Aucun message d'erreur** n'existe dans `DebutModif`, `TraiteModif` ni `FinModif` (aucun `MessageBox`/`ShowMessage` dans ces plages, vérifié). Un refus est silencieux : l'objet reste à la dernière position valide et suit de nouveau le pointeur dès qu'une position redevient valide. Les conditions de refus de chaque objet sont listées dans sa fiche.

Condition commune : chaque branche ne s'exécute que si `M` diffère exactement du point fixe de référence (ex. `x1<>a2x or y1<>a2y` pour la poignée `a1`), pour éviter une division par zéro.

##### 1.4 Sortie, Échap, annulation

| Action | Effet | Référence |
|---|---|---|
| Bouton « Fin dépl. » | `activeboutons` (réactive tout, remet « Déplacer »), `modemodif:=false`, `modifencours:=false`, curseur par défaut, panneaux 2 et 3 vidés, redessin sans poignées. | `unit1_palette.pas:275-284`, `ray1.pas:4861-4927` |
| Touche Échap (caractère 27) | `activeboutons` (qui remet `modemodif` et `modifencours` à faux), libellé du bouton Grouper remis, `Rafraichit`, panneaux 1 et 2 vidés, curseur par défaut. **Quitte complètement le mode Déplacer**, pas seulement l'opération en cours. | `ray1.pas:5689-5701` |
| Échap **pendant** une modification | L'objet a déjà été modifié « en direct » par `TraiteModif` : il **reste à sa dernière position d'aperçu**. Rien n'est restauré et `sauvevirtuel` n'est pas appelé (le message « Esc pour annuler » est donc trompeur). | déduit de `ray1.pas:5689-5701` et `unit222.pas:4845-9996` |

INCERTAIN : Échap est traité par `FormKeyPress` de la fenêtre principale sans `KeyPreview` (`ray1.lfm:18`) ; l'aide précise « alors que le curseur est au-dessus de l'espace de travail ». La réception de la touche dépend donc du focus.

Annuler / Refaire : `sauvevirtuel` (`ray1.pas:12404`) empile un instantané de toute la scène après chaque pose (`ray1.pas:1121`), **même si la pose a été refusée** (scène inchangée → entrée d'annulation sans effet visible). 50 niveaux (`maxannulation=50`, `ray1.pas:387`). Annuler recharge l'instantané précédent (`ray1.pas:11372-11378`). Les menus étant désactivés en mode Déplacer, Ctrl+Z (Annuler) et Ctrl+R (Refaire) ne sont utilisables qu'après la sortie du mode. Après un Échap en cours de modification, Annuler revient à l'état d'avant la **dernière action enregistrée** (la modification abandonnée et l'action précédente sont perdues ensemble).

##### 1.5 Grille (`attractiongrille`, `arronditalagrille`)

- Appliquée **uniquement à la pose (`FinModif`) d'une translation** : `if (modetranslation and attractiongrille) then BIBI.arronditalagrille(x1,y1,grillex,grilley)` (`unit222.pas:20522`). Le point de référence de l'objet (c, s, o ou isobarycentre du groupe) est posé sur le nœud de grille le plus proche (arrondi au plus proche sur chaque axe, origine `xmin`/`ymin`, `monbitmap.pas:183-194`).
- Jamais pendant l'aperçu (`TraiteModif` n'arrondit pas) : l'objet « saute » au nœud au moment du clic.
- Jamais pour les autres poignées (extrémités, foyers, centres, rotations). L'aide le confirme : « Ceci est vrai lors de l'ajout d'éléments et lors de leur translation ».
- La case « Attraction de la grille » est désactivée pendant le mode : on ne peut pas la changer sans sortir.

##### 1.6 Touches Alt et Ctrl (`bloqueaxe`)

- Au clic 1, si **Alt ou Ctrl** est enfoncé, `bloqueaxe:=true` et l'on mémorise `lastxr`, `lastyr` (coordonnées monde d'un point de l'objet, voir ci-dessous) (ex. `unit222.pas:11334-11338`).
- Pendant le déplacement et au clic 2, si `bloqueaxe` : **Alt enfoncé → x forcé à `lastxr`** (déplacement vertical) ; **Ctrl enfoncé → y forcé à `lastyr`** (déplacement horizontal) (`unit222.pas:4150-4153`, `20514-20527`). L'aide : « Déplacement vertical: enfoncer la touche « Alt » … Déplacement horizontal: enfoncer la touche « Ctrl » … cliquer pour le poser, et relâcher enfin la touche ».
- Le blocage n'agit que tant que la touche est tenue ; si Alt ou Ctrl n'était pas tenu au clic 1, il n'y a aucun blocage ensuite.
- À la pose d'une translation, l'arrondi de grille est fait **avant** le blocage : la coordonnée bloquée n'est pas arrondie.
- Point mémorisé (`lastxr`, `lastyr`) : celui de la poignée pour les poignées de translation, d'extrémité, de foyer et de centre ; **pour les poignées rouges de rotation (`tpa1c`, `tpa2c`, `tpsc`, `tpsf`), c'est l'extrémité `a1`** (ou `s2`/`s1` pour la lentille épaisse), et non la poignée elle-même (ex. `unit222.pas:11406-11407` pour `tpa2c` du miroir plan). Probable erreur de copier-coller ; effet : avec Alt, la direction de rotation est calculée vers (x de `a1`, y du pointeur).
- Le bouton de souris n'étant pas filtré, rien n'empêche Ctrl+clic.

##### 1.7 Groupes

- Un groupe affiche, en mode Déplacer, une **croix verte** (demi-diagonale 3 px, trait 2 px, `couleurtrans`) et le texte « Gr » à son isobarycentre `(isox, isoy)` (`unit222.pas:1894-1906`). Cet isobarycentre est la moyenne des points de référence des éléments (c, s, o…) (`unit222.pas:1727-1760`), recalculé à chaque redessin (`unit222.pas:3682`).
- Poignée du groupe : translation seulement, saisie à ±3,3 px (`unit222.pas:12631-12665`). Le groupe entier est translaté de `M − iso` (`groupe.translate`, `unit222.pas:9333-9337`, `21008-21012`), avec attraction de grille à la pose. `groupe.translate` essaie d'abord tous les éléments : si un seul est invalide (par exemple hors du monde), **rien ne bouge** (`unit222.pas:1922-…`).
- **Les poignées propres des éléments groupés restent actives** : déplacer (ou tourner, refocaliser…) un élément groupé ne modifie que cet élément ; le « Gr » se recale ensuite sur le nouvel isobarycentre. Aucun test d'appartenance à un groupe dans `DebutModif`.

##### 1.8 Dessin des poignées (légende commune)

Les poignées ne sont dessinées que si `modemodif` (et pas `modeduplication`). Couleurs fixes, non réglables dans les préférences : `couleurpoignees:=clblue` (`unit222.pas:40224`), `couleurtrans:=clgreen` (`unit222.pas:40252`).

| Rôle | Forme | Couleur | Taille (pixels écran) | Primitive |
|---|---|---|---|---|
| Translation (centre, sommet, centre optique) | croix en X | vert `clGreen` | demi-diagonale 3×épaisseur, trait 2×épaisseur | `croixx` (`monbitmap.pas:1691-1745`) |
| Extrémité / bord (« point à déplacer ») | cercle vide | bleu `clBlue` | rayon 3×épaisseur, trait épaisseur | `cercle` (`monbitmap.pas:832-890`) |
| Foyer, centre de courbure, bord du trou du diaphragme | croix en X | cyan `clAqua` | demi-diagonale 3×épaisseur, trait 2×épaisseur | `croixx` |
| Rotation (ajout version 2.5) | disque plein | rouge `clRed` (bord et fond) | rayon 3×épaisseur, bord 1 px | `disque2` (`monbitmap.pas:345-400`) |

« épaisseur » = épaisseur de trait de l'objet (défaut 1 ; écran : 2 ; réglable dans les propriétés de l'objet), d'où des poignées de 3 px de rayon par défaut. Exceptions à taille fixe (3 px, trait 1 ou 2) : miroir conique et lentille épaisse. Une poignée hors du monde visible n'est pas dessinée (test dans les primitives).

L'aide décrit ces repères : « cercles bleus, … croix vertes, et éventuellement … croix cyan » ; les disques rouges (rotation) n'y sont pas mentionnés.

##### 1.9 Curseurs et messages

Survol, sans modification en cours (`unit222.pas:4808-4842`) :

| Étiquette | Curseur | Panneau 2 |
|---|---|---|
| 314 translation | `crTranslation` | « Clic gauche pour sélectionner l'élément... » |
| 315 rotation | `crrotation` | « Clic gauche pour sélectionner l'élément... » |
| 316 foyer | `crdepfoyer` | « Clic gauche pour sélectionner ce foyer... » |
| 317 centre | `crdepcentre` | « Clic gauche pour sélectionner ce centre... » |
| 319 bord de trou | `crtaille` | « Clic gauche pour sélectionner ce bord de trou... » |
| 320 sommet d'arc | `crdepsommet` | « Clic gauche pour sélectionner ce sommet d'arc de cercle... » |
| 3221 point | `crdeplacement` | « Clic gauche pour déplacer ce point » |
| rien | `crdepla` | « Faites passer la souris sur un des éléments colorés... » |

Après le clic 1, selon la poignée saisie (`unit222.pas:14849-14961`, tests dans cet ordre, premier vrai) :

| Cas | Curseur | Panneau 2 | Panneau 3 |
|---|---|---|---|
| translation (tout objet) | `crTranslation` | « Déplacer l'élément, puis clic gauche pour le poser... » | « Mode: translation d'un élément existant. Esc pour annuler. » |
| diaphragme, `tpa1` ou `tpap1` | `crtaille` | « Déplacer le bord, puis clic gauche pour le poser... » | « Mode: changement de taille du trou. Esc pour annuler. » |
| `tpa1`/`tpa2` de lmc, lmd, miroir plan, lsr, mscopa, mscepa, mscore, mscere, écran | `crdeplacement` | « Déplacer l'élément, puis clic gauche pour le poser... » | « Mode: déplacement d'un sommet » |
| `tpa1`/`tpa2` de la lentille épaisse | `crdepsommet` | idem | « Mode: déplacement d'un sommet » |
| `tpfo`, `tpf1`, `tpf2` (foyers) | `crdepfoyer` | « Déplacer le foyer, puis clic gauche pour le poser... » | « Mode: changement focale d'un élément existant. Esc pour annuler. » |
| `tpce` (centre de courbure) | `crdepcentre` | « Déplacer le centre, puis clic gauche pour le poser... » | « Mode: chgt rayon courbure d'un élément existant. Esc pour annuler. » |
| toute autre poignée (rotations rouges, extrémités du réseau et du miroir conique, bord extérieur du diaphragme) | `crrotation` | « Déplacer l'élément, puis clic gauche pour le poser... » | « Mode: rotation d'un élément existant. Esc pour annuler. » |

Les panneaux 0 et 1 affichent en continu les coordonnées de `M` (`affichecoordonnees`).

##### 1.10 Tolérance de saisie

`unit222.pas:10853-10854` (et `4154-4155` au survol) :

```
BIBI.convert(3,form1.image1.height-3,tx,ty,true);
tx:=tx-xxmin; ty:=ty-yymin;
```

`tx`, `ty` = taille de **3 pixels écran** en unités du monde. Une poignée P est touchée si `|P.x − M.x| ≤ 1,1·tx` **et** `|P.y − M.y| ≤ 1,1·ty` : **carré de ±3,3 px** autour du point, quelle que soit la taille dessinée (une poignée d'écran dessinée en 6 px de rayon ne se saisit qu'à ±3,3 px). La variable `distance` (diagonale du monde) est calculée mais pas utilisée pour ce test. La tolérance suit le zoom (pixels de l'image affichée).

---

#### 2. Plusieurs poignées sous le pointeur : priorité et boîte de choix

`DebutModif` ne s'arrête pas au premier point : il parcourt toutes les poignées de tous les objets et ajoute chaque correspondance aux listes parallèles `liste_typeelementmodif`, `liste_indiceelementmodif`, `liste_modetranslation`, `liste_moderotation`, `liste_tprot`, `liste_tprirot`, `liste_lastxr`, `liste_lastyr`, `liste_bloqueaxe` ; `nombre_typeelementmodif` en compte le nombre (`unit222.pas:10859-14753`).

- **0** : rien n'est saisi (§ 1.2).
- **1** : la poignée est saisie directement.
- **2 ou plus** (`unit222.pas:14755-14837`) : la fenêtre modale `form_quelobjet` s'ouvre, centrée à l'écran, titre « Choix de l'objet: », une liste déroulante non modifiable (`csDropDownList`) et un bouton « OK » (`unit_quelobjet.pas`, `unit_quelobjet.lfm`). Chaque ligne nomme **l'objet**, pas la poignée : « Miroir plan n° %s », « Réseau n° %s », « Miroir concave idéal n° %s » (mscopa), « Miroir convexe idéal n° %s » (mscepa), « Miroir concave  n° %s » (mscore, deux espaces), « Miroir convexe n° %s » (mscere), « Miroir cônique n° %s », « Lentille mince convergente n° %s », « Lentille mince divergente n° %s », « Lentille épaisse n° %s », « Lame semi réfléchissante n° %s », « Ecran n° %s », « Diaphragme n° %s », « Groupe n° %s » (et les autres types). Si deux poignées d'un même objet se recouvrent (objet petit à l'écran), la même ligne apparaît deux fois sans indiquer laquelle est laquelle.
- Après fermeture, si un élément est choisi (`ItemIndex>=0`), on reprend type, indice, mode, poignée et blocage de la ligne choisie.
- INCERTAIN (`unit222.pas:14825`) : si l'on valide sans choisir (`ItemIndex = −1` après `Items.Clear`, même si le `.lfm` indique `ItemIndex = 0`) ou si l'on ferme la fenêtre, les variables gardent les valeurs de la **dernière** correspondance trouvée, qui est donc saisie.

Ordre de parcours (= ordre des lignes de la boîte), pour les objets de cette partie, entre parenthèses l'ordre de leurs poignées :

1. texte ;
2. **miroir conique** (s, (s+f)/2, a1, a2, f) ;
3. sphère, œil ;
4. **miroir plan** (c, (a1+c)/2, (a2+c)/2, a1, a2) ;
5. **réseau** (c, a1, a2) ;
6. angle, flèche, point, prisme, mètre, polyèdre, polycercle ;
7. **diaphragme** (c, a1, a2, ap1, ap2, (a1+c)/2, (ap1+c)/2) ;
8. **écran** (c) ; **groupe** (isobarycentre) ; **écran** (a1, a2, (a1+c)/2, (a2+c)/2) ;
9. **lame semi-réfléchissante** (c, a1, a2, (a1+c)/2, (a2+c)/2) ;
10. **mscopa** (s, a1, a2, f, (a1+s)/2, (a2+s)/2) ; **mscepa** (même ordre) ;
11. **mscore** ((s+C)/2, s, a1, a2, C) ; **mscere** (s, (s+C)/2, a1, a2, C) ;
12. **lmc** (o, a1, (a1+o)/2, (a2+o)/2, f1, a2, f2) ;
13. **lentille épaisse** (o, s1, s2, (s2+o)/2, (s1+o)/2) ;
14. **lmd** (o, a1, f1, a2, f2, (a1+o)/2, (a2+o)/2) ;
15. rayon, source ponctuelle, onde plane.

Le survol (§ 1.9) suit un autre ordre (`unit222.pas:4160-4808`, premier trouvé par `goto`) : le curseur affiché ne prédit donc pas toujours la poignée saisie quand plusieurs se recouvrent.

L'aide conseille : « si vous avez du mal à différencier 2 points trop proches, utilisez le zoom … Si vous n'y arrivez pas comme ça, passez plutot par "Propriétés" ». Le zoom est désactivé pendant le mode : il faut sortir, zoomer, revenir.

---

#### 3. Fiches par objet

Dans toutes les fiches : saisie à ±3,3 px (§ 1.10) ; aperçu = objet réel recalculé et rayons retracés à chaque mouvement ; pose au clic suivant ; refus silencieux (§ 1.3) ; Alt/Ctrl selon § 1.6 ; grille seulement pour la translation (§ 1.5).

##### 3.1 Miroir plan

Dessin : `miroirplan.dessine`, `unit222.pas:31672-31694`. Saisie : `unit222.pas:11313-11487`. Aperçu : rotation `5342-5475`, translation `9240-9278`. Pose : `20810-20847`, `22734-22871`. Validation : `miroirplan.create`, `unit222.pas:25817-25840`.

| Poignée | Dessin | Effet | Contraintes |
|---|---|---|---|
| c (milieu) | croix verte | Translation : a1 et a2 décalés de M − c. | — |
| a1 | cercle bleu | a1 = M ; a2 fixe ; c recalculé (longueur et orientation changent). Curseur de survol `crdeplacement`, mode « déplacement d'un sommet ». | — |
| a2 | cercle bleu | a2 = M ; a1 fixe. | — |
| (a1+c)/2 | disque rouge | Rotation autour de c : a1 placé dans la direction c→M à la distance \|a1−c\| ; a2 symétrique de a1 par rapport à c. Longueur conservée. | — |
| (a2+c)/2 | disque rouge | Rotation autour de c : a2 dans la direction c→M, à la distance \|a1−c\| ; a1 symétrique. | — |

Refus (`create`) : longueur < `taillemini`, ou a1/a2 hors du monde. Hachures, couleur, épaisseur conservées.

Adaptation tablette : glisser direct de chaque poignée ; zone de saisie ≥ 44 px CSS (un miroir court de moins de ~180 px a ses 5 zones qui se chevauchent : afficher les poignées de rotation seulement quand l'objet est sélectionné, ou les déporter au-delà des extrémités) ; remplacer Alt/Ctrl par deux boutons bascule « verrou vertical » / « verrou horizontal » ; afficher la longueur et l'angle pendant le glisser.

##### 3.2 Réseau (diffractant)

Dessin : `reseau.dessine`, `unit222.pas:28383-28411` (trait pointillé `psdot`). Saisie : `unit222.pas:11488-11589`. Aperçu : `5479-5565`, `9280-9332`. Pose : `20849-…`, `22872-22963`. Validation : `reseau.create`, `unit222.pas:25842-25875`.

| Poignée | Dessin | Effet |
|---|---|---|
| c | croix verte | Translation de M − c. |
| a1 | cercle bleu | a1 = M, a2 fixe. Curseur de survol `crrotation` ; panneau 3 « Mode: rotation d'un élément existant. » (le réseau n'est pas dans la liste « déplacement d'un sommet »). |
| a2 | cercle bleu | a2 = M, a1 fixe. Mêmes curseur et message. |

Pas de poignée de rotation rouge pour le réseau. Pas, transmission/réflexion, hachures, ordres min et max conservés (si `ordre_min > ordre_max`, `create` les échange). Refus : longueur < `taillemini`, extrémité hors du monde.

Adaptation tablette : comme le miroir plan ; ajouter une poignée de rotation (absente de l'original) serait une divergence à décider ; zones ≥ 44 px.

##### 3.3 Miroir sphérique concave paraxial (mscopa, « Miroir concave idéal »)

Dessin : `mscopa.dessine`, `unit222.pas:29438-29509`. Saisie : `unit222.pas:12981-13187`. Aperçu : `6779-7027`, `9558-9611`. Pose : `21289-21342`, `23465-23715`. Validation : `Mscopa.create` (`25928-25963`), `mscopa.create2` (`27352-27391`).

| Poignée | Dessin | Effet |
|---|---|---|
| s (sommet = milieu de a1a2) | croix verte | Translation : a1, a2 décalés de M − s ; `create2` avec la focale conservée. |
| a1 | cercle bleu | a1 = M, a2 fixe, **focale conservée** ; s = nouveau milieu ; f recalculé sur la perpendiculaire en s, à gauche de a1→a2 (`fx = sx + focale·cos(angle+π/2)`). |
| a2 | cercle bleu | a2 = M, a1 fixe ; idem. |
| f (foyer) | croix cyan (toujours dessinée en mode Déplacer, même si l'axe focal est masqué) | Changement de focale : f = projection de M sur la droite s→C (C = s + 2(f − s)). Si la projection tombe derrière le sommet (λ < 0), λ est forcé à 0,1, soit **focale × 0,2** à chaque mouvement. a1, a2 inchangés. Grille jamais appliquée. |
| (a1+s)/2 | disque rouge | Rotation autour de s : a1 dans la direction s→M à la distance \|a1−s\|, a2 symétrique ; focale conservée. |
| (a2+s)/2 | disque rouge | Rotation autour de s : a2 dans la direction s→M ; a1 symétrique. |

Refus : longueur < `taillemini`, focale < `taillemini`, a1/a2 hors du monde, miroir troué dont le diamètre du trou dépasse la longueur. Le foyer peut sortir du monde (pas testé).

INCERTAIN : `create2` place toujours le foyer à gauche de a1→a2, alors que `create` (utilisé à l'ajout et pour la poignée f) accepte un foyer de l'un ou l'autre côté. Si un miroir avait son foyer à droite, une translation ou un déplacement d'extrémité le ferait basculer de côté. Non vérifié en exécution.

Effet itératif : comme le calcul part de l'état courant à chaque mouvement, maintenir le pointeur derrière le sommet réduit la focale d'un facteur 5 à chaque événement, jusqu'au refus (`focale < taillemini`).

Adaptation tablette : glisser du foyer contraint visuellement à l'axe (afficher l'axe pendant le glisser, même masqué) ; borner la focale au lieu du facteur 0,2 répété (divergence à valider) ; afficher la valeur de f ; poignées ≥ 44 px, la poignée f souvent proche de s pour une petite focale : prévoir le choix par proximité.

##### 3.4 Miroir sphérique convexe paraxial (mscepa, « Miroir convexe idéal »)

Identique à mscopa (dessin `unit222.pas:30058-30131`, saisie `13188-13397`, aperçu `7532-7779` et `9722-9777`, pose `21454-21509` et `24214-24463`), avec une seule différence : `mscepa.create2` place le foyer **à droite** de a1→a2 (`fx = sx − focale·cos(angle+π/2)`, `unit222.pas:27422-27423`), c'est-à-dire derrière le miroir. Mêmes poignées (s croix verte, a1/a2 cercles bleus, f croix cyan, deux disques rouges), mêmes effets, mêmes refus, même règle λ < 0 → 0,1 pour le foyer (`unit222.pas:7621-7630`).

Adaptation tablette : comme mscopa.

##### 3.5 Miroir sphérique concave réel (mscore, « Miroir concave »)

Dessin : `mscore.dessine`, `unit222.pas:30267-30339` (arc de cercle). Saisie : `unit222.pas:13398-13569`. Aperçu : `7028-7244`, `9612-9670`. Pose : `21343-21401`, `24001-24213`. Validation : `Mscore.create` (`25976-26060`), `Mscore.create2` (`26061-26157`).

| Poignée | Dessin | Effet |
|---|---|---|
| s (milieu de l'arc) | croix verte | Translation de M − s (rayon et sens de l'arc conservés). |
| a1 | cercle bleu | a1 = M, a2 fixe, **rayon R conservé** : le centre C est recalculé sur la médiatrice de a1a2 à la distance R ; l'indicateur `aigu` (arc de moins ou de plus d'un demi-cercle) est conservé. |
| a2 | cercle bleu | a2 = M, a1 fixe ; idem. |
| C (centre de courbure) | croix cyan | Changement de rayon : C = projection de M sur la droite s→C ; si λ < 0, λ = 0,1 (C ramené au dixième de la distance s→C). R devient \|C − a1\| ; l'arc passe toujours par a1 et a2 ; s recalculé. |
| (s+C)/2 | disque rouge | Rotation rigide autour de C : l'arc tourne pour que la direction C→s pointe vers M (R conservé). |

Refus : corde a1a2 plus longue que 2R (`delta < 0`) ou a1 = a2 (`create2`) ; longueur d'arc < `taillemini` ; a1/a2 hors du monde ; une partie de l'arc hors du monde (échantillonnage de 200 points) ; trou plus grand que l'arc.

INCERTAIN : comportement quand C est amené entre la corde et le sommet (l'arc passe de l'autre côté du demi-cercle) — non testé.

Adaptation tablette : afficher le cercle complet en pointillé pendant les glissers de a1/a2/C pour montrer la contrainte « rayon conservé » ; le centre est souvent hors écran : prévoir un accès au rayon par la fiche Propriétés ; poignées ≥ 44 px.

##### 3.6 Miroir sphérique convexe réel (mscere, « Miroir convexe »)

Identique à mscore (dessin `unit222.pas:30473-30546`, saisie `13570-13742`, aperçu `7780-7997` et `9778-9835`, pose `21510-21566` et `24464-24677`, validation `Mscere.create` `26158`, `create2` `26239`). Mêmes poignées : s croix verte, a1/a2 cercles bleus, C croix cyan, disque rouge en (s+C)/2. Même règle λ < 0 → 0,1 pour C. Seul l'ordre dans la boîte de choix diffère (§ 2).

Adaptation tablette : comme mscore.

##### 3.7 Miroir conique (parabolique, elliptique, hyperbolique ; concave et convexe)

Un seul type interne `miroirconique` pour les deux boutons (concave, convexe) ; le drapeau `concave` est conservé par toutes les poignées. Dessin : `miroirconique.dessine`, `unit222.pas:3322-3419` (poignées `3377-3398`, **taille fixe** : rayon 3 px trait 1, croix 3 px trait 2, disque 3 px, indépendamment de l'épaisseur). Saisie : `unit222.pas:10897-11070`. Aperçu : `7245-7531`, `9671-9721`. Pose : `21402-21453`, `23716-24000`. Validation : `MiroirConique.create` (`3248-3320`), `create2` (`3170-3247`).

| Poignée | Dessin | Effet |
|---|---|---|
| s (sommet) | croix verte | Translation : f décalé de M − s ; angles θ0, θ1, θ2, excentricité e et paramètre p conservés. |
| (s+f)/2 | disque rouge | Rotation rigide autour du foyer f : la direction f→s pointe vers M. |
| a1 | cercle bleu | **Rotation rigide autour de a2** : la conique tourne de l'angle entre a2→a1 et a2→M (forme et taille conservées, la distance au pointeur est ignorée). Curseur `crrotation`, panneau 3 « Mode: rotation d'un élément existant. Esc pour annuler. » |
| a2 | cercle bleu | Rotation rigide autour de a1, même principe. |
| f (foyer) | croix cyan | f = projection de M sur la droite s→f (λ < 0 → 0,1) ; s et a1 fixes ; e et p **recalculés** pour que la conique passe par s et a1 (la nature peut changer : ellipse, parabole, hyperbole) ; a2 replacé sur la nouvelle conique au même angle polaire vu de f. Curseur `crdepfoyer`, « Mode: changement focale d'un élément existant. » |

Refus (`create`) : a1/a2 hors du monde, f = s, cas dégénéré `cos(θ1−θ0) = fs/fm`, excentricité négative, une partie de l'arc hors du monde (200 points).

Adaptation tablette : poignées dessinées plus grandes que 3 px (zone ≥ 44 px) ; pour a1/a2, indiquer par un arc fléché qu'il s'agit d'une rotation autour de l'autre extrémité (comportement peu intuitif) ; afficher e (et la nature de la conique) en direct pendant le glisser du foyer.

##### 3.8 Lentille mince convergente (lmc)

Dessin : `lmc.dessine`, `unit222.pas:29642-29716`. Saisie : `unit222.pas:13743-13985`. Aperçu : `7998-8249`, `9836-9881`. Pose : `21567-21611`, `24678-24928`. Validation : `lmc.create` (`27169-27202`), `lmc.create2` (`27240-27277`).

| Poignée | Dessin | Effet |
|---|---|---|
| o (centre optique) | croix verte | Translation de M − o (focale conservée). |
| a1 | cercle bleu | a1 = M, a2 fixe, **focale conservée** ; o = nouveau milieu ; f1 et f2 recalculés sur la perpendiculaire en o (f1 à gauche de a1→a2, f2 symétrique). |
| a2 | cercle bleu | a2 = M, a1 fixe ; idem. |
| f1 | croix cyan (toujours dessinée en mode Déplacer) | Changement de focale : f1 = projection de M sur la droite o→f1, **sans borne** (contrairement aux miroirs) ; f2 = symétrique de f1 par rapport à o. Si la projection passe de l'autre côté de o, les deux foyers échangent leur côté. |
| f2 | croix cyan | Idem avec la droite o→f2 ; f1 symétrique. |
| (a1+o)/2 | disque rouge | Rotation autour de o : a1 dans la direction o→M à la distance \|a1−o\| ; a2 symétrique ; focale conservée. |
| (a2+o)/2 | disque rouge | Rotation autour de o : a2 dans la direction o→M ; a1 symétrique. |

Refus : longueur < `taillemini`, focale < `taillemini` (projection sur o), a1/a2 hors du monde. Les foyers peuvent sortir du monde.

Adaptation tablette : 7 poignées sur un petit objet ; proposer un appui pour sélectionner la lentille, puis n'afficher que ses poignées ; glisser du foyer contraint à l'axe, valeur de f affichée ; zone ≥ 44 px.

##### 3.9 Lentille mince divergente (lmd)

Identique à lmc (dessin `unit222.pas:29850-29922`, saisie `14160-14403`, aperçu `8532-8787` et `9945-9996`, pose `21676-21719` et `25208-25457`, validation `lmd.create` `27203`, `lmd.create2` `27278`, qui place f1 et f2 comme lmc). Mêmes 7 poignées, mêmes effets ; f1/f2 sans borne. Seul l'ordre dans la boîte de choix diffère (§ 2).

Adaptation tablette : comme lmc.

##### 3.10 Lame semi-réfléchissante (lsr)

Dessin : `lsr.dessine`, `unit222.pas:29316-29340`. Saisie : `unit222.pas:12807-12980`. Aperçu : `6109-6231`, `9406-9442`. Pose : `21078-21112`, `23085-23207`. Validation : `lsr.create`, `unit222.pas:25903-25926`.

Poignées et effets **identiques au miroir plan** (§ 3.1) : c croix verte (translation), a1 et a2 cercles bleus (extrémité libre, l'autre fixe, mode « déplacement d'un sommet »), disques rouges en (a1+c)/2 et (a2+c)/2 (rotation autour de c, demi-longueur \|a1−c\|). Refus : longueur < `taillemini`, extrémité hors du monde.

Adaptation tablette : comme le miroir plan.

##### 3.11 Écran

Dessin : `ecran.dessine`, `unit222.pas:28604-28641` (épaisseur par défaut 2, donc poignées de 6 px de rayon, mais saisie toujours à ±3,3 px). Saisie : c `unit222.pas:12597-12630`, puis (après le groupe) a1, a2, (a1+c)/2, (a2+c)/2 `12666-12806`. Aperçu : `5987-6108`, `9339-9377`. Pose : `21014-21049`, `22964-23084`. Validation : `ecran.create`, `unit222.pas:25877-25901`.

Poignées et effets **identiques au miroir plan** (§ 3.1). Refus : longueur < `taillemini`, extrémité hors du monde.

Adaptation tablette : comme le miroir plan ; la poignée « Gr » d'un groupe est testée entre c et les autres poignées de l'écran : un écran au centre d'un groupe déclenche la boîte de choix, à remplacer par un choix par proximité.

##### 3.12 Diaphragme (à iris)

Géométrie : centre c, angle polaire, rayon intérieur `rint` (bord du trou, point a1 et son symétrique ap1) et rayon extérieur `rext` (point a2 et son symétrique ap2) ; deux lames a1–a2 et ap1–ap2, pointillé entre ap1 et a1 (`unit222.pas:2577-2600`, `2901-2925`). Dessin : `diaphragme.dessine`, `unit222.pas:2926-2970`. Saisie : `unit222.pas:12355-12596`. Aperçu : `6605-6778`, `9378-9405`. Pose : `21050-21077`, `23292-23464`. Validation : `diaphragme.create2`.

| Poignée | Dessin | Effet | Curseur / panneau 3 |
|---|---|---|---|
| c | croix verte | Translation (c = M). | translation |
| a1 (bord du trou) | croix cyan | `rint` = \|M − c\| ; angle et `rext` conservés ; ap1 suit par symétrie. | `crtaille`, « Mode: changement de taille du trou. Esc pour annuler. » ; panneau 2 « Déplacer le bord, puis clic gauche pour le poser... » |
| ap1 (bord du trou opposé) | croix cyan | Même effet que a1 (`tpap1` traité comme `tpa1`). | idem |
| a2 (bord extérieur) | cercle bleu | Nouvel angle = direction ap2→M ; `rext` = \|M − ap2\| / 2 ; **c ne bouge pas**. Le calcul repartant de l'état courant à chaque mouvement, a2 rejoint progressivement le pointeur (rotation autour de c et changement de taille extérieure, avec un retard). | `crrotation`, « Mode: rotation d'un élément existant. » (survol : `crdeplacement`, « Clic gauche pour déplacer ce point ») |
| ap2 | cercle bleu | Symétrique : angle = direction M→a2, `rext` = \|M − a2\| / 2. | idem |
| (a1+c)/2 | disque rouge (à mi-rayon du trou) | Rotation autour de c : la direction c→a1 pointe vers M ; `rint`, `rext` conservés. | rotation |
| (ap1+c)/2 | disque rouge | Rotation autour de c : la direction c→ap1 pointe vers M (code `tpa2c`, angle + π). | rotation |

L'aide (`aide/fr/diaphragme.html`) : « translater le diaphragme ; changer son orientation et sa taille extérieure en utilisant les points extrèmes ; changer son rayon intérieur (ouverture du diaphragme) en utilisant les points intérieurs ».

Refus : un des quatre points hors du monde, `rint` < `taillemini`, `rint` > `rext`, \|rint − rext\| < `taillemini`.

INCERTAIN : position exacte de a2 après la pose (dépend du nombre d'événements de mouvement reçus, à cause du calcul itératif « demi-distance à ap2 ») ; le portage devrait plutôt faire a2 = M (rotation autour de c + `rext` = \|M − c\|), ce qui est la limite du comportement d'origine.

Adaptation tablette : les poignées du trou sont des croix cyan proches du centre et des disques rouges à mi-rayon : pour un petit trou, c, a1, ap1 et les deux disques se chevauchent ; prévoir une sélection préalable et des poignées déportées (par exemple une poignée « ouverture » sur l'axe hors des lames) ; afficher `rint` et `rext` en direct.

##### 3.13 Lentille épaisse (lec, « Lentille épaisse »)

Dessin : `lec.dessine`, `unit222.pas:26639-26873` (poignées `26841-26870`, **taille fixe** 3 px). Saisie : `unit222.pas:13986-14159`. Aperçu : `8250-8531`, `9882-9944`. Pose : `21612-21675`, `24929-25207`. Validation : `lec.create`, `unit222.pas:26344-…`.

| Poignée | Dessin | Effet | Curseur / panneau 3 |
|---|---|---|---|
| o (milieu de s1s2) | croix verte | Translation : s1, s2 décalés de M − o. | translation |
| s1 (sommet de la face 1) | cercle bleu | s1 = **projection de M sur l'axe** (droite o–s1) ; s2 fixe ; o recalculé (milieu) ; l'épaisseur change ; r1, r2, diamètre conservés. | survol `crdepsommet` « Clic gauche pour sélectionner ce sommet d'arc de cercle... » ; saisi : `crdepsommet`, « Mode: déplacement d'un sommet » |
| s2 | cercle bleu | Idem avec s2 ; s1 fixe. | idem |
| (s1+o)/2 | disque rouge | Rotation rigide autour de o : la direction o→s1 pointe vers M. | rotation |
| (s2+o)/2 | disque rouge | Rotation rigide autour de o : la direction o→s2 pointe vers M. | rotation |

Refus (`lec.create`) : s1 = s2 ; r1 ou r2 nul ; diamètre < `taillemini` ; s1 ou s2 hors du monde ; diamètre trop grand pour une lentille « mince » au sens du code (conditions `diametremax`, `unit222.pas:26464-26476`). Si la lentille n'est pas « mince » et que le diamètre dépasse 2·min(\|r1\|, \|r2\|), le diamètre est **réduit silencieusement** à 0,999 × 2·min(\|r1\|, \|r2\|) (`unit222.pas:26391-26392`) : un glisser de sommet peut donc changer le diamètre.

INCERTAIN : la projection de s1 peut dépasser s2 (faces inversées) ; validité optique non vérifiée.

Adaptation tablette : glisser des sommets contraint à l'axe (afficher l'axe) ; afficher l'épaisseur et signaler la réduction automatique du diamètre ; poignées de 3 px à agrandir (zone ≥ 44 px).

---

#### 4. Adaptation tablette : recommandations communes

| Original (souris) | Proposition tablette / web | Remarque |
|---|---|---|
| Clic pour saisir, clic pour poser | Glisser-déposer avec Pointer Events : appui sur une poignée = `DebutModif`, mouvement = aperçu, relâchement = `FinModif`. Garder l'option « toucher, toucher » pour la souris si on veut rester fidèle. | Divergence assumée : documenter. |
| Survol (curseur et panneau 2) | Pas de survol au doigt : surligner la poignée sous le doigt au moment de l'appui, icône d'action (translation, rotation, foyer, centre, taille du trou) près du doigt, consigne dans un bandeau. | |
| Tolérance carrée ±3,3 px | Zone de saisie circulaire ≥ 44 px CSS (rayon ≥ 22 px) ; dessin visible de 12 à 16 px ; choisir la poignée **la plus proche** du doigt. | |
| Boîte modale « Choix de l'objet: » | Choix par proximité ; seulement en cas d'égalité, petit menu près du doigt qui nomme l'objet **et** la poignée (« Lentille mince convergente n° 2 — foyer F1 »). Ou : premier toucher = sélection de l'objet, poignées affichées pour lui seul. | Supprime aussi l'INCERTAIN de la validation sans choix. |
| Alt (vertical), Ctrl (horizontal) | Deux boutons bascule dans la barre d'outils pendant le mode (« Verrou vertical », « Verrou horizontal »), ou contrainte automatique quand le glisser est presque vertical ou horizontal. Bloquer sur la coordonnée de la poignée saisie (corriger l'usage de a1 pour les poignées rouges, à valider). | |
| Pas de clic droit | Le code n'en dépend pas (bouton non testé) : rien à remplacer. | |
| Échap (quitte le mode, garde l'aperçu) | Bouton « Annuler » visible pendant un glisser qui **restaure l'état d'avant** ; bouton « Terminer » (= « Fin dépl. ») ; sortie du doigt de la zone ou deuxième doigt = annulation. | Divergence : l'original ne restaure pas. |
| Grille seulement à la pose | Appliquer l'aimantation pendant l'aperçu aussi (pas de saut au lâcher), garder « translation seulement ». | Divergence légère. |
| Zoom désactivé dans le mode | Laisser le pincement (zoom) actif pendant le mode, hors glisser de poignée. | |
| Doigt qui masque la poignée | Loupe ou décalage de la poignée au-dessus du doigt pendant le glisser ; valeurs (longueur, angle, focale, rayon) affichées dans une bulle. | |
| Aperçu = retraçage complet à chaque mouvement | Limiter à une image par `requestAnimationFrame` ; sur appareil lent, tracer les rayons au lâcher. | |
| Annuler / Refaire inaccessibles dans le mode | Laisser Annuler/Refaire accessibles pendant le mode ; une entrée d'annulation par glisser **effectif** (pas pour un refus). | |

---

#### 5. Points incertains (récapitulatif)

1. Boîte de choix validée sans sélection ou fermée : la dernière correspondance trouvée est saisie (`unit222.pas:14825`, comportement LCL de `ItemIndex` à confirmer).
2. Réception d'Échap selon le focus (`FormKeyPress` sans `KeyPreview`, `ray1.lfm:18`, `ray1.pas:5689`).
3. Miroirs paraxiaux : bascule possible du foyer de côté après translation ou déplacement d'extrémité, si le foyer avait été posé à droite (`create` contre `create2`, `unit222.pas:25928` et `27352`).
4. Miroirs réels : centre amené entre la corde et le sommet (`unit222.pas:7182-7240`).
5. Diaphragme, bord extérieur : position finale itérative (`unit222.pas:6711-6776`).
6. Lentille épaisse : sommet projeté au-delà de l'autre sommet (`unit222.pas:8252-8320`).
7. Blocage Alt/Ctrl sur les poignées rouges fondé sur a1 (ou s1/s2) et non sur la poignée (ex. `unit222.pas:11406-11407`) : bogue probable de l'original, à corriger ou à reproduire (décision à prendre).

### 9.B Sources, dioptres, objets divers ; modes Supprimer et Grouper ; choix entre objets superposés

Périmètre : rayon unique, source ponctuelle (objet ponctuel réel et virtuel), onde plane, polyèdre réfractant, polycercle réfractant, sphère réfractante, prisme isocèle, œil stylisé, trait/flèche, texte sur le dessin, mesure de distance, mesure d'angle, point ; puis les modes Supprimer et Grouper, et le choix entre plusieurs objets sous le pointeur.

Références : `fichier.pas:ligne` dans les sources d'OptGeo 3.03 (`~/src/optgeo-amont/src/`). Les textes entre « » sont les chaînes françaises exactes (fichier `lang/optgeo.fr.po` et commentaires des copies annotées). Les coordonnées sont celles du **monde** de la simulation (axe y vers le haut). « M » désigne la position du pointeur convertie en coordonnées du monde.

Le comportement commun du mode Déplacer (entrée, clic–déplacement–clic sans glisser-déposer, aperçu en direct, refus silencieux, Échap, grille, Alt/Ctrl, boîte de choix) est décrit en 9.A, § 1 et § 2. Cette partie n'en reprend que ce qui est nécessaire, et le complète pour les objets ci-dessous.

---

#### 0. Rappels communs utiles à cette partie

##### 0.1 Tolérance de saisie

Identique pour le survol (`TraiteModif`, `unit222.pas:4154-4155`), la saisie (`DebutModif`, `unit222.pas:10853-10854`), la suppression (`unit222.pas:10009-10010`, `14978-14980`) et le groupement (`unit222.pas:3847-3848`, `16477-16478`) : `tx`, `ty` = 3 pixels de l'image en unités du monde ; une poignée P est touchée si `|P.x − M.x| ≤ 1,1·tx` **et** `|P.y − M.y| ≤ 1,1·ty`, soit un **carré de ±3,3 px** autour du point, **quelle que soit la taille dessinée** de la poignée (les bordures de l'image valent 0 dans OptGeo, `monbitmap.pas:1372-1436`).

##### 0.2 Couleurs et formes (valeurs par défaut fixées au démarrage)

| Nom | Couleur | Réf. |
|---|---|---|
| `couleurpoignees` | bleu `clBlue` | `unit222.pas:40224` |
| `couleurtrans` | vert `clGreen` | `unit222.pas:40252` |
| `couleursuppression` | rouge `clRed` | `unit222.pas:40195` |
| croix de groupement | violet `clPurple` (littéral) | ex. `unit222.pas:30999-31001` |
| point de sommet d'arc du polycercle | jaune `clYellow` (littéral) | `unit222.pas:39188-39192` |

Primitives (pixels de l'image) : `cercle(x, y, rayon, épaisseur, …)` = cercle vide (`monbitmap.pas:832`) ; `croixx(x, y, demi_diagonale, épaisseur, …)` = croix en X (`monbitmap.pas:1691`) ; `disque2(x, y, rayon, bord, fond)` = disque plein (`monbitmap.pas:345`). Une poignée hors du monde visible n'est pas dessinée.

« ×ép. » signifie « multiplié par l'épaisseur de trait de l'objet » (propriété de l'objet, 1 par défaut) : seuls le rayon, la source ponctuelle, l'onde plane, l'œil et le trait ont des poignées proportionnelles à leur épaisseur. Tous les autres objets de cette partie ont des poignées de taille fixe (cercle de rayon 3 px, trait 1 ; croix de demi-diagonale 3 px, trait 2).

##### 0.3 Aperçu, refus, pose

À chaque mouvement après la saisie, l'objet réel est recréé avec la nouvelle géométrie si la création d'essai réussit, sinon il garde sa dernière géométrie valide ; puis toute la scène est retracée (`Rafraichit`, `unit222.pas:3618`), rayons compris. La pose (`FinModif`) refait le même calcul au point cliqué. **Aucun message d'erreur** dans `DebutModif`, `TraiteModif`, `FinModif` pour les objets de cette partie (vérifié : les seules chaînes de `FinModif` sont les messages de barre d'état, `unit222.pas:21722-21723`, `25750-25751`). Un mouvement refusé laisse l'objet immobile ; il suit de nouveau le pointeur dès qu'une position redevient valide.

`taillemini` = (2 pixels de l'image en unités du monde, le plus petit des deux axes) / 10, soit environ 0,2 px (`ray1.pas:5658-5669`).

« Dans le monde » = dans le rectangle `[xxmin, xxmax] × [yymin, yymax]` de la simulation.

##### 0.4 Messages de barre d'état

Survol (sans modification en cours), selon l'étiquette atteinte (`unit222.pas:4808-4842`) :

| Étiquette | Curseur | Panneau 2 |
|---|---|---|
| 314 | `crTranslation` | « Clic gauche pour sélectionner l'élément... » |
| 315 | `crrotation` | « Clic gauche pour sélectionner l'élément... » |
| 320 | `crdepsommet` | « Clic gauche pour sélectionner ce sommet d'arc de cercle... » |
| 321 | `crtaille` | « Clic gauche pour sélectionner ce sommet de prisme... » |
| aucune | `crdepla` | « Faites passer la souris sur un des éléments colorés... » |

Après la saisie (`unit222.pas:14846-14960`, premier cas vrai dans cet ordre), pour les objets de cette partie :

| Cas | Curseur | Panneau 2 | Panneau 3 |
|---|---|---|---|
| T : toute translation | `crTranslation` | « Déplacer l'élément, puis clic gauche pour le poser... » | « Mode: translation d'un élément existant. Esc pour annuler. » |
| PS : polyèdre, poignée de rotation (`tpsg`) | `crrotation` | « Déplacer l'élément, puis clic gauche pour le poser... » | « Mode: déplacement d'un sommet » (sic) |
| PV : polyèdre, sommet (`tpa1`) | `crdepsommet` | idem | « Mode: déplacement d'un sommet » |
| PA : prisme, sommet principal (`tpa`) | `crrotation` | « Déplacer le sommet, puis clic gauche pour le poser... » | « Mode: changement d'orientation du prisme. Esc pour annuler. » |
| PB : prisme, sommet B (`tpb`) | `crtaille` | idem | « Mode: changement de la hauteur du prisme. Esc pour annuler. » |
| PC : prisme, sommet C (`tpc`) | `crtaille` | idem | « Mode: changement de l'angle au sommet du prisme. Esc pour annuler. » |
| CE : `tpce` (sommet de la mesure d'angle) | `crdepcentre` | « Déplacer le centre, puis clic gauche pour le poser... » | « Mode: chgt rayon courbure d'un élément existant. Esc pour annuler. » (sic, texte générique hors sujet) |
| SO : `tpso` (sommet d'arc du polycercle) | `crdepsommet` | « Déplacer le sommet, puis clic gauche pour le poser... » | « Mode: chgt rayon courbure d'un élément existant. Esc pour annuler. » |
| R : toute autre poignée | `crrotation` | « Déplacer l'élément, puis clic gauche pour le poser... » | « Mode: rotation d'un élément existant. Esc pour annuler. » |

Après la pose : panneau 3 « Mode: déplacement d'un élément existant. Esc pour annuler. » ; panneau 2 « Faites passer la souris sur un des éléments colorés... » après une translation (`unit222.pas:21722-21724`), « Faites passer la souris sur un point cerclé... » après toute autre poignée (`unit222.pas:25750-25752`). On reste dans le mode Déplacer.

##### 0.5 Alt et Ctrl

Pour **toutes** les poignées de cette partie, le point mémorisé au clic de saisie avec Alt ou Ctrl enfoncé (`lastxr`, `lastyr`) est **la poignée elle-même** (vérifié bloc par bloc dans `DebutModif`, ex. `unit222.pas:11612`, `11646`, `12146`, `12224`, `14426`, `14566`, `14706`). Ensuite, tant que la touche est tenue : Alt → x forcé à `lastxr` (déplacement vertical) ; Ctrl → y forcé à `lastyr` (déplacement horizontal) (`unit222.pas:4150-4153` ; pose : `20515-20529`). La touche Maj n'est utilisée nulle part (aucun `ssShift` dans `unit222.pas` ni `ray1.pas`). `bloqueaxe` n'est remis à faux qu'au clic de saisie suivant (`unit222.pas:10858`).

##### 0.6 Grille

À la pose d'une **translation** seulement, si « Attraction » est cochée, le point de translation est arrondi au nœud de grille le plus proche (`unit222.pas:20522`), avant le blocage Alt/Ctrl. Jamais pendant l'aperçu, jamais pour les autres poignées.

##### 0.7 Adaptation tablette (commune à toutes les fiches)

- Zone de saisie de chaque poignée ≥ 44 × 44 px CSS, centrée sur le point, même si le dessin reste petit (8 à 12 px). En cas de chevauchement de zones, choisir la poignée **la plus proche** du point d'appui ; si deux poignées sont à moins de 8 px CSS l'une de l'autre, ouvrir la feuille de choix (§ 8).
- Glisser-déposer : appui sur la poignée = saisie, déplacement du doigt = aperçu, levée du doigt = pose. Garder le fonctionnement clic–déplacement–clic d'origine pour la souris (appui et relâchement sans déplacement significatif, moins de 4 px CSS).
- Pas de survol : les poignées sont toujours visibles en mode Déplacer ; le texte d'aide du survol (« Clic gauche pour sélectionner… ») s'affiche au moment de l'appui, dans une bulle ou un bandeau.
- Le doigt cache la poignée : afficher pendant le glissement une loupe ou une bulle décalée au-dessus du doigt avec les coordonnées (équivalent des panneaux 0 et 1).
- Alt / Ctrl : remplacer par une commande à trois positions dans la barre d'actions affichée pendant le déplacement : « Libre », « Horizontal » (équivalent Ctrl), « Vertical » (équivalent Alt). Le point de référence reste la position de la poignée au moment de la saisie.
- Échap : bouton « Annuler » dans la barre d'actions pendant un déplacement. Divergence proposée et assumée : l'original ne restaure **pas** la position initiale à Échap (9.A-1.4) ; la version web devrait restaurer l'état d'avant la saisie.
- Clic droit : sans objet (l'original ne distingue pas les boutons, `ray1.pas:1088-1128`).

---

#### 1. Rayon unique (`mdrayon`)

Données (`unit222.pas:436-459`, `rayon.create` `unit222.pas:27441-27475`) : A = (`ax`, `ay`) point de départ (point 1 de la saisie) ; vecteur `k` = (`kx`, `ky`) ; B = (`bx`, `by`) = A + k (point 2, donne la direction) ; C = (`cx`, `cy`) = A + k/2 (milieu).

**Poignées dessinées** (`rayon.dessine`, `unit222.pas:30974-30985`) :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| A | cercle vide | rayon 3×ép., trait ép. | bleu |
| B | cercle vide | rayon 3×ép., trait ép. | bleu |
| C | croix en X | demi-diagonale 3×ép., trait 2×ép. | vert |

**Effet des poignées** (saisie `unit222.pas:14404-14505`) :

| Poignée | Survol | Mode après saisie | Effet | Réf. aperçu |
|---|---|---|---|---|
| C (croix verte) | 314 | T | Translation : A' = A + (M − C), k inchangé. | `unit222.pas:9443-9488` |
| A (cercle bleu) | 315 | R (`tpa1`) | Nouveau départ en M, **B reste fixe** : k = B − M (la direction et la longueur changent). Ignoré si M = B exactement. | `unit222.pas:6233-6270` |
| B (cercle bleu) | 315 | R (`tpa2`) | A fixe, B = M : la direction du rayon tourne autour de A. Ignoré si M = A. | `unit222.pas:6271-6313` |

**Refus** (`unit222.pas:27461-27467`) : longueur |k| < `taillemini`, ou A ou B hors du monde. L'objet reste alors à sa dernière position valide.

**Pose** : `FinModif` translation `unit222.pas:21113`, autres `unit222.pas:23208`. Aucun message.

**Adaptation tablette** : trois poignées alignées sur un segment souvent court ; si |AB| à l'écran < 3 × 44 px CSS, les zones se chevauchent : appliquer la règle « poignée la plus proche », et proposer d'allonger provisoirement l'affichage des poignées (A et B écartées visuellement) ou un zoom. Glisser C = translation, glisser B = orientation (afficher l'angle en degrés dans la bulle).

---

#### 2. Source ponctuelle — objet ponctuel réel et virtuel (`mdsourceponctuelle`)

Données (`unit222.pas:477-494`, `SourcePonctuelle.create` `unit222.pas:27527-27657`) : S = (`sx`, `sy`) point source (ou point de convergence pour l'objet virtuel) ; P1 = (`a1x`, `a1y`), P2 = (`a2x`, `a2y`) les deux bords du faisceau ; G = (`gx`, `gy`) = (P1 + P2)/2 (`unit222.pas:27571`). Booléen `sourcevirtuelle`.

- Objet réel : les rayons partent de S ; rayon 1 vers P1, rayon n vers P2 ; les rayons intermédiaires ont pour longueur min(|SP1|, |SP2|) et des angles répartis régulièrement **dans le sens trigonométrique de SP1 vers SP2** (si l'angle de SP2 est inférieur à celui de SP1, on lui ajoute 2π, `unit222.pas:27605-27606` ; virtuel `27645-27646`).
- Objet virtuel : les rayons partent de P1…P2 (points de l'arc de même rayon pour les intermédiaires) et se dirigent **vers S** (`unit222.pas:27620-27654`).
- Conséquence à conserver : faire passer P2 de l'autre côté de la droite (S, P1) bascule le faisceau sur l'angle complémentaire (plus de 180°).

**Poignées dessinées** (`sourceponctuelle.dessine`, `unit222.pas:31762-31775`) — identiques pour le réel et le virtuel :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| G = milieu de P1P2 | croix en X | demi-diagonale 3×ép. de la source, trait 2×ép. | vert |
| S | cercle vide | rayon 3×ép. du rayon n° 1, trait idem | bleu |
| P1, P2 | cercle vide | idem | bleu |

**Effet des poignées** (saisie `unit222.pas:14507-14646`) :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| G (croix verte) | 314 | T | Translation de S, P1, P2 de M − G. | `unit222.pas:8992-9052` |
| S | 315 | R (`tpa0`) | S = M ; P1 et P2 fixes (le sommet du faisceau se déplace, les bords passent toujours par P1 et P2). Ignoré si M = P1 ou M = P2. | `unit222.pas:6432-6493` |
| P1 | 315 | R (`tpa1`) | P1 = M ; S et P2 fixes (un bord du faisceau tourne autour de S). Ignoré si M = S. | `unit222.pas:6317-6373` |
| P2 | 315 | R (`tpa2`) | P2 = M ; S et P1 fixes. Ignoré si M = S. | `unit222.pas:6374-6431` |

**Refus** (`unit222.pas:27538-27543`, `27573-27657`) : S, P1 ou P2 hors du monde ; nombre de rayons ≤ 1 ou > 500 ; un des rayons ne peut pas être créé (longueur < `taillemini` ou extrémité hors du monde — voir § 1 ; pour l'objet réel, les rayons intermédiaires de longueur min(|SP1|, |SP2|) doivent aussi tenir dans le monde).

**Pose** : translation `unit222.pas:21159`, autres `unit222.pas:25458`.

**Adaptation tablette** : la croix verte G est au milieu de P1P2, souvent proche de P1 et P2 si le faisceau est étroit : règle de proximité plus feuille de choix. Afficher pendant le glissement de P1 ou P2 l'ouverture du faisceau (angle P1-S-P2 dans le sens où il est réellement tracé), pour que l'élève comprenne la bascule sur l'angle complémentaire.

---

#### 3. Onde plane — faisceau parallèle (`mdondeplane`)

Données (`unit222.pas:498-516`, `OndePlane.create` `unit222.pas:27661-27744`) : P1 = (`a1x`, `a1y`) départ du premier rayon (point 1) ; D = (`sx`, `sy`) point sur le premier rayon (point D, donne la direction) ; P2 = (`a2x`, `a2y`) départ du dernier rayon (point 2). À chaque création, P2 est **recalculé** pour que P1P2 soit perpendiculaire à P1D, en gardant la longueur |P1P2| demandée et le côté de P1D où se trouve le point demandé (`unit222.pas:27703-27711`). Tous les rayons sont parallèles à P1D ; les intermédiaires partent de points équirépartis sur P1P2.

**Poignées dessinées** (`OndePlane.dessine`, `unit222.pas:31867-31889`) : en permanence (tous modes), un trait pointillé de P1 au départ du dernier rayon. En mode Déplacer :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| P1 | croix en X | demi-diagonale 3×ép., trait 2×ép. | vert |
| D | cercle vide | rayon 3×ép. du rayon n° 1 | bleu |
| P2 | cercle vide | idem | bleu |

**Effet des poignées** (saisie `unit222.pas:14648-14751`) :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| P1 (croix verte) | 314 | T | Translation de P1, D, P2 de M − P1. | `unit222.pas:9489-9555` |
| D | 315 | R (`tpa1`) | D = M, P1 fixe ; P2 recalculé perpendiculaire (même largeur) : **rotation du faisceau autour de P1**. Ignoré si M = P1. | `unit222.pas:6496-6549` |
| P2 | 315 | R (`tpa2`) | P2 demandé = M, puis projeté : largeur = |P1M|, côté = côté de M par rapport à la droite (P1, D). La direction ne change pas. Ignoré si M = P1. | `unit222.pas:6550-6603` |

Remarque : la poignée P2 se trouve donc décalée par rapport au pointeur dès que celui-ci quitte la perpendiculaire (le point posé est la projection « tournée » de M, pas M).

**Refus** (`unit222.pas:27701-27725`) : D = P1 ; D, P1, P2 ou P2 + D − P1 hors du monde ; nombre de rayons ≤ 1 ou > 500 ; premier ou dernier rayon impossible à créer.

**Pose** : translation `unit222.pas:21222`, autres `unit222.pas:25637`.

**Adaptation tablette** : pendant le glissement de P2, dessiner la perpendiculaire à P1D sur laquelle P2 est contraint, et placer la poignée sur sa position réelle (projetée), pas sous le doigt. Pendant le glissement de D, afficher l'angle de la direction.

---

#### 4. Polyèdre réfractant — polygone (`mdpolyhedre`)

Données (`unit222.pas:524-540`, `Polyhedre.create` `unit222.pas:39585-39709`) : sommets S1…Sn (3 ≤ n ≤ 500), `MesSommets[n+1] = S1` ; I = (`xiso`, `yiso`) isobarycentre des sommets (`unit222.pas:39702-39707`).

**Poignées dessinées** (`polyhedre.dessine`, `unit222.pas:30699-30715`) :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| chaque sommet Sj | cercle vide | rayon 3 px, trait 1 | bleu |
| I | croix en X | demi-diagonale 3 px, trait 2 | **violet** (`clPurple`, pas vert : `unit222.pas:30705-30709`) |
| R = (I + S1)/2 | disque plein | rayon 3 px | rouge |

**Effet des poignées** (saisie `unit222.pas:12121-12235`) :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| Sj | 320 (« …ce sommet d'arc de cercle... », sic) | PV (`tpa1`, `indicepointdeplace = j`) | Sj = M ; les autres sommets fixes. | `unit222.pas:5568-5615` |
| I (croix violette) | 314 | T | Translation de tous les sommets de M − I. | `unit222.pas:9133-9180` |
| R (disque rouge) | 315 | PS (`tpsg`) | Rotation autour de I d'un angle θ = angle(M − I) − angle(S1 − I) : forme et taille conservées ; S1 s'aligne sur la direction I→M ; R reste au milieu de I et S1. | `unit222.pas:5616-5676` |

**Refus** (`unit222.pas:39598-39689`) : un sommet hors du monde ; deux sommets à moins de `taillemini` (sauf option « désactiver le contrôle des points trop proches ») ; pour n > 3, un sommet situé sur un côté non adjacent, ou deux côtés qui se coupent (polygone croisé).

**Pose** : translation `unit222.pas:20900` (ignorée si M = I exactement), autres `unit222.pas:22264`.

**Adaptation tablette** : trois natures de poignées à distinguer sans couleur seule : sommet (cercle), translation (croix), rotation (disque plein relié à I par un trait fin, à ajouter). Pendant la rotation, afficher l'angle de rotation. La croix violette se confond avec celles du mode Grouper : la version web pourrait la dessiner en vert comme les autres translations (à décider ; l'original est violet).

---

#### 5. Polycercle réfractant (« polysphère », `mdpolycercle`)

Données (`unit222.pas:567-590`, `polycercle.create` `unit222.pas:38627-…`) : sommets S1…Sn (n ≥ 2), `MesSommets[n+1] = S1` ; pour chaque côté j (de Sj à Sj+1), `rectiligne[j]` (segment ou arc) et, pour un arc, Tj = `MesS[j]`, le « sommet » de l'arc (point de l'arc sur la médiatrice de la corde) ; I = (`xiso`, `yiso`) isobarycentre (sert au groupement).

**Poignées dessinées** (`polycercle.dessine`, `unit222.pas:39175-39192`) :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| chaque sommet Sj | cercle vide | rayon 3 px, trait 1 | bleu |
| milieu de chaque **corde** Mj = (Sj + Sj+1)/2 (même pour un arc) | croix en X | demi-diagonale 3 px, trait 2 | vert |
| Tj, pour chaque côté en arc seulement | croix en X | demi-diagonale 3 px, trait 2 | jaune |

**Effet des poignées** (saisie `unit222.pas:12237-12353`) :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| Sj | 315 | R (`tpa1`, `indicepointdeplace = j`) | Sj = M. Pour chacun des deux côtés adjacents qui est un arc, son sommet d'arc est recalculé pour **garder le rapport flèche / corde** et le côté du renflement : l'arc garde sa forme, mise à l'échelle. | `unit222.pas:5679-5876` |
| Mj (croix verte) | 314 | T | Translation de tous les sommets et sommets d'arc de M − Mj. Pour n = 2, seul M1 est saisissable (M2 confondu, exclu `unit222.pas:12280`). | `unit222.pas:9181-9238` |
| Tj (croix jaune) | 320 | SO (`tpso`) | Tj = projection de M sur la médiatrice de la corde SjSj+1 : change la flèche, donc le rayon de courbure ; la projection peut passer de l'autre côté de la corde (arc rentrant), sous réserve d'acceptation par `create`. | `unit222.pas:5877-5954` |

**Refus** (`unit222.pas:38648-38800`) : un sommet hors du monde ; deux sommets trop proches ; un sommet sur un côté non adjacent ; deux côtés rectilignes qui se coupent ; autres tests d'intersection (INCERTAIN : le détail des tests entre arcs n'a pas été relu, `unit222.pas:38778` et suivantes). Pour n = 2, `create` affiche une boîte de message si les deux côtés sont des segments (« Cette structure serait un segment... », titre « Impossible ! ») ou deux arcs (« Pour créer une lentille autre que plan-convexe, utilisez l'objet lentille épaisse... ») ; ces cas ne peuvent pas survenir pendant un déplacement (le caractère segment/arc ne change pas).

**Pose** : translation `unit222.pas:20949`, autres `unit222.pas:22374`.

INCERTAIN (`unit222.pas:12121-12353`) : `indicepointdeplace` n'est pas mémorisé dans les listes de la boîte de choix (§ 8) ; s'il y a plusieurs candidats, c'est la valeur du dernier candidat trouvé qui sert, même si l'on choisit un autre polycercle ou polyèdre dans la boîte.

**Adaptation tablette** : trois types de poignées sur chaque côté ; distinguer sommet (cercle), translation (croix verte), courbure (losange ou croix jaune avec contour sombre, le jaune seul étant peu lisible sur fond blanc). Pendant le glissement d'un sommet d'arc, dessiner la médiatrice qui le contraint et afficher le rayon de courbure.

---

#### 6. Sphère réfractante (`mdsphere`)

Données (`unit222.pas:596-610`) : centre C = (`cx`, `cy`), `rayon`.

**Poignées dessinées** (`sphere.dessine`, `unit222.pas:40047-40061`) :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| C | croix en X | demi-diagonale 3 px, trait 2 | vert |
| C ± (rayon, 0), C ± (0, rayon) (4 points cardinaux) | cercle vide | rayon 3 px, trait 1 | bleu |

**Effet des poignées** (saisie `unit222.pas:11072-11242`) :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| C | 314 | T | Translation : centre = M, rayon inchangé. | `unit222.pas:9094-9132` |
| un des 4 points cardinaux | 315 | R | Centre fixe ; nouveau rayon = |M − C| (dans n'importe quelle direction : la poignée retombe ensuite sur le point cardinal). `tprot` n'est pas réglé par ces poignées (INCERTAIN : le message affiché est celui du cas R si aucune autre poignée n'a été trouvée au même clic). | `unit222.pas:4850-4893` |

**Refus** (`unit222.pas:40020-40023`) : le disque doit tenir **strictement** dans le monde (cx ± rayon et cy ± rayon strictement à l'intérieur).

**Pose** : translation `unit222.pas:20772`, rayon `unit222.pas:22219`.

**Adaptation tablette** : une seule poignée de rayon suffit (par exemple à droite) si les quatre sont trop proches sur une petite sphère ; afficher le rayon pendant le glissement.

---

#### 7. Prisme isocèle (`mdprisme`)

Données (`unit222.pas:544-560`, `prisme.create` `unit222.pas:39458-39584`) : G = (`gx`, `gy`) centre d'inertie ; A = (`ax`, `ay`) sommet principal ; B et C sommets de base, symétriques par rapport à l'axe (G, A) : B est celui qui est à gauche de la direction G→A (produit vectoriel positif), C à droite (`unit222.pas:39478-39490`). H = G − (A − G)/2 milieu de la base ; `hauteur` = 3/2·|AG| ; `angle_sommet` ; `angle_axe` = direction G→A. `xiso = gx`, `yiso = gy`.

**Poignées dessinées** (`prisme.dessine`, `unit222.pas:30837-30858`) :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| A | disque plein | rayon 3 px | rouge |
| B, C | cercle vide | rayon 3 px, trait 1 | bleu |
| G | croix en X | demi-diagonale 3 px, trait 2 | vert |

**Effet des poignées** (saisie `unit222.pas:11873-12013`) — conforme à l'aide (`aide/fr/prisme.html`, « Déplacement ») :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| G | 314 | T | Translation : G = M, A, B, C décalés d'autant. | `unit222.pas:8792-8837` |
| A (disque rouge) | 315 | PA (`tprirot = tpa`) | **Rotation autour de G** : A placé à la distance 2/3·hauteur de G dans la direction G→M ; hauteur et angle au sommet conservés. | `unit222.pas:4897-4977` |
| B | 321 | PB (`tpb`) | B = projection de M sur la droite (A, B) ; A fixe, angle au sommet conservé, **la hauteur change** (G recalculé sur l'axe). | `unit222.pas:5042-5124` |
| C | 321 | PC (`tpc`) | C = projection de M sur la droite de base (passant par H, perpendiculaire à l'axe) ; G, A et H fixes, **l'angle au sommet change** (B recalculé symétrique). | `unit222.pas:4978-5041` |

**Refus** (`unit222.pas:39470-39520`) : le troisième point est du côté du sommet (produit scalaire (P − G)·(A − G) > 0) ; deux sommets à moins de `taillemini` ; un sommet hors du monde.

**Pose** : translation `unit222.pas:20559`, autres `unit222.pas:21773`.

**Adaptation tablette** : B et C ont des rôles différents mais le même dessin : marquer B (hauteur) et C (angle) par une icône ou une étiquette au moment de l'appui (« hauteur », « angle au sommet ») et afficher la valeur en cours (hauteur, angle en degrés).

---

#### 8. Œil stylisé (`mdoeil`)

Données (`unit222.pas:88-99`, `oeil.create` `unit222.pas:2606-2631`) : C = (`cx`, `cy`) point 1 de la saisie (« rétine » selon l'aide `aide/fr/oeil.html`) ; A = (`ax`, `ay`) point 2 (« centre pupille ») ; `rayoncourbure` = |CA| ; `anglepolaire` = direction C→A. Création : `ray1.pas:1903`.

**Poignées dessinées** (`oeil.dessine`, `unit222.pas:2717-2726`) :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| A | cercle vide | rayon 3×ép., trait ép. | bleu |
| C | croix en X | demi-diagonale 3×ép., trait 2×ép. | vert |

**Effet des poignées** (saisie `unit222.pas:11244-11311`) :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| C | 314 | T | Translation : C = M, A décalé d'autant. | `unit222.pas:8838-8861` |
| A | 315 | R (`tpa1`) | C fixe, A = M : **orientation et taille** de l'œil changent ensemble. | `unit222.pas:5956-5986` |

**Refus** (`unit222.pas:2619-2628`) : seulement `rayoncourbure` < `taillemini`. Les tests « hors du monde » sont **commentés** : l'œil peut sortir du cadre.

**Pose** : translation `unit222.pas:20534`, A `unit222.pas:21741`.

**Adaptation tablette** : permettre au besoin de séparer orientation et taille (deux poignées) n'est pas dans l'original ; garder une seule poignée A et afficher taille et angle.

---

#### 9. Trait / flèche (`mdfleche`)

Données (`unit222.pas:177-191`, `fleche.create` `unit222.pas:25792-25815`) : extrémités E1 = (`a1x`, `a1y`), E2 = (`a2x`, `a2y`) ; milieu (`cx`, `cy`).

**Poignées dessinées** (`fleche.dessine`, `unit222.pas:28084-28091`, seulement si mode Déplacer et ni Propriétés ni Duplication) :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| E1, E2 | cercle vide | rayon 3×ép., trait ép. | bleu |
| milieu | croix en X | demi-diagonale 3×ép., trait 2×ép. | vert |

**Effet des poignées** (saisie `unit222.pas:11727-11832`) :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| E1 | 315 | R (`tpa1`) | E1 = M, E2 fixe. Ignoré si M = E2. | `unit222.pas:5172-5213` |
| E2 | 315 | R (`tpa2`) | E2 = M, E1 fixe. Ignoré si M = E1. | `unit222.pas:5213-5254` |
| milieu | 314 | T | Translation de M − milieu. | `unit222.pas:8921-8965` |

Les extrémités (pointe, trait, rond, croix, disque) suivent l'orientation (dessin `unit222.pas:28111` et suivantes).

**Refus** (`unit222.pas:25804-25810`) : longueur < `taillemini` (sauf option de désactivation) ou une extrémité hors du monde.

**Pose** : translation `unit222.pas:20665`, extrémités `unit222.pas:22050`.

**Adaptation tablette** : comme le rayon (§ 1).

---

#### 10. Texte sur le dessin (`mdtexteaffiche`)

Données (`unit222.pas:120-137`) : point d'ancrage (`x`, `y`) = **coin haut-gauche** du texte (`TextOut(x, y)`, `monbitmap.pas:1153`, appelé par `texteaffiche.dessine` `unit222.pas:3086-3087`).

**Poignée dessinée** (`unit222.pas:3087-3090`) : croix en X verte, demi-diagonale 3 px, trait 2, au point d'ancrage. Aucune autre poignée (ni taille, ni rotation).

**Effet** (saisie `unit222.pas:10862-10895`) : survol 314 ; mode T ; ancrage = M (`unit222.pas:9053-9093`, ignoré si M = ancrage exact). Le texte n'est pas saisissable par son corps, seulement par la croix.

**Refus** (`unit222.pas:3054-3057`) : ancrage hors du monde.

**Pose** : `unit222.pas:20732`.

**Adaptation tablette** : rendre tout le rectangle du texte saisissable pour la translation (en plus de la croix), ce qui est plus naturel au doigt ; garder le point d'ancrage haut-gauche comme référence pour la grille et Alt/Ctrl.

---

#### 11. Mesure de distance (« métre », `mdmetre`)

Données (`unit222.pas:274-280`, `metre.create` `unit222.pas:37054-37068`) : E1, E2 extrémités ; milieu (`cx`, `cy`). L'étiquette affiche |E1E2| avec l'unité (`unit222.pas:29110-29150`), mise à jour en direct.

**Poignées dessinées** (`metre.dessine`, `unit222.pas:29084-29096`) : en permanence (tous modes sauf Duplication) un trait noir et des cercles noirs de rayon 3 px aux extrémités (`unit222.pas:29084-29088`, font partie du dessin). En mode Déplacer, en plus :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| E1, E2 | cercle vide | rayon 3 px, trait 1 | bleu |
| milieu | croix en X | demi-diagonale 3 px, trait 2 | vert |

**Effet des poignées** (saisie `unit222.pas:12016-12119`) :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| E1 | 315 | R (`tpa1`) | E1 = M, E2 fixe. | `unit222.pas:5127-5148` |
| E2 | 315 | R (`tpa2`) | E2 = M, E1 fixe. | `unit222.pas:5149-5169` |
| milieu | 314 | T | Translation. | `unit222.pas:8890-8920` |

**Refus** : une extrémité hors du monde (`unit222.pas:37056-37060`). Une longueur nulle est acceptée.

**Pose** : translation `unit222.pas:20605`, extrémités `unit222.pas:22005`.

**Adaptation tablette** : comme le trait ; afficher la longueur dans la bulle de glissement.

---

#### 12. Mesure d'angle (`mdangle`)

Données (`unit222.pas:261-270`, `angle.create` `unit222.pas:37028-37052`) : sommet O = (`cx`, `cy`) ; extrémités E1 = (`a1x`, `a1y`), E2 = (`a2x`, `a2y`) ; point de translation D = (`dx`, `dy`) = (E1 + E2)/2. Valeur affichée = angle mesuré de OE1 à OE2 **dans le sens trigonométrique** (si l'angle de OE2 est inférieur à celui de OE1, on ajoute 2π, `unit222.pas:28749`) : déplacer une extrémité de l'autre côté donne 360° − θ.

**Poignées dessinées** (`angle.dessine`, `unit222.pas:28726-28739`) : en permanence, deux traits noirs O-E1, O-E2 et trois cercles noirs de rayon 3 px en O, E1, E2. En mode Déplacer, en plus :

| Point | Dessin | Taille | Couleur |
|---|---|---|---|
| E1, E2, O | cercle vide | rayon 3 px, trait 1 | bleu |
| D | croix en X | demi-diagonale 3 px, trait 2 | vert |

**Effet des poignées** (saisie `unit222.pas:11590-11725`) :

| Poignée | Survol | Mode | Effet | Réf. aperçu |
|---|---|---|---|---|
| D | 314 | T | Translation de O, E1, E2 de M − D. | `unit222.pas:8862-…` |
| O | 315 | CE (`tpce`) — messages « Déplacer le centre… », « chgt rayon courbure… » (sic) | Le sommet O = M ; E1 et E2 fixes. | `unit222.pas:5313-5339` |
| E1 | 315 | R (`tpa1`) | E1 = M ; O et E2 fixes. | `unit222.pas:5257-5284` |
| E2 | 315 | R (`tpa2`) | E2 = M ; O et E1 fixes. | `unit222.pas:5285-5312` |

**Refus** : aucun (tests commentés `unit222.pas:37030-37041`) : tout mouvement est accepté, y compris hors du monde ou avec un côté de longueur nulle.

**Pose** : translation `unit222.pas:20636`, autres `unit222.pas:22135`.

**Adaptation tablette** : afficher la valeur de l'angle dans la bulle ; corriger les messages trompeurs (« rayon de courbure ») pour le sommet : « Déplacer le sommet de l'angle ».

---

#### 13. Point (« joli point », `mdjolipoint`)

Données (`unit222.pas:193-203`) : position P = (`a1x`, `a1y`), taille, style.

**Poignée dessinée** (`JoliPoint.dessine`, `unit222.pas:27757-27760`) : croix en X verte, demi-diagonale 3 px, trait 2, en P (mode Déplacer seulement, hors Propriétés et Duplication).

**Effet** (saisie `unit222.pas:11834-11871`) : survol 314 ; mode T ; P = M (`unit222.pas:8966-8991`).

**Refus** (`unit222.pas:25778`) : P hors du monde, ou taille/1000 × diagonale du monde < `taillemini`.

**Pose** : `unit222.pas:20708`.

**Adaptation tablette** : zone de 44 px centrée sur le point ; aucune autre poignée.

---

#### 14. Groupe en mode Déplacer (rappel)

Croix verte (demi-diagonale 3 px, trait 2) et texte « Gr » à l'isobarycentre du groupe (`groupe.dessine`, `unit222.pas:1894-1905`). Saisie `unit222.pas:12631-12665` (survol 314, mode T). Translation de tout le groupe, tout ou rien : si un seul élément ne peut pas être translaté, rien ne bouge (`groupe.translate`, `unit222.pas:1922-2573`). Détails : § 16 ci-dessous et 9.A-1.7.

---

#### 15. Mode « Supprimer »

##### 15.1 Entrée

| Accès | Détail | Réf. |
|---|---|---|
| Palette : bouton « Supprimer » (bulle « Supprimer un élément existant ») | Ne fait rien s'il n'y a aucun objet (pas de message). Sinon : curseur par défaut, autres boutons désactivés (`desactiveboutons`), `modesuppression := true`, libellé du bouton → « Fin sup. », redessin. | `unit1_palette.pas:337-350`, `78-79` |
| Menu Édition → « Supprimer un élément », raccourci **Ctrl+S** (ShortCut 16467) | Appelle le même gestionnaire. | `ray1.lfm:1240-1243`, `ray1.pas:10704-10707` |

##### 15.2 Désignation de l'objet

- Chaque objet dessine des **cercles rouges** (`couleursuppression`) sur ses points caractéristiques ; aucun autre surlignage de l'objet. Taille : rayon 3×ép. et trait ép. pour rayon, source, onde plane, œil, trait ; rayon 3 px, trait 1 pour les autres. Le groupe affiche un cercle rouge et « Gr » à son isobarycentre (`unit222.pas:1901-1904`).
- Points cliquables pour les objets de cette partie (`effectuesuppression`, `unit222.pas:14966-16337` ; survol `Traitesuppression`, `unit222.pas:9997-10837`) :

| Objet | Points (cercles rouges) | Nom dans les messages |
|---|---|---|
| Rayon | C (milieu), A, B | « ce rayon » |
| Source ponctuelle | G (milieu P1P2), S, P1, P2 | « cette source ponctuelle » |
| Onde plane | P1, D, P2 | « cette onde plane » |
| Polyèdre | sommets, milieux des côtés | « ce polygône » |
| Prisme | sommets, milieux des côtés | « ce prisme » |
| Polycercle | sommets, milieux des cordes, sommets d'arc | « ce polycercle » |
| Sphère | centre, 4 points cardinaux | « cette sphère » |
| Œil | C, A | « cet oeil » |
| Trait | E1, E2, milieu | « ce trait » |
| Texte | ancrage | « ce texte » |
| Mesure de distance | E1, E2 (pas le milieu) | « cette mesure de distance » |
| Mesure d'angle | O, E1, E2 | « cette mesure d'angle » |
| Point | P | « ce point » |
| Groupe | isobarycentre | « ce groupe » |

- Tolérance : ±3,3 px (§ 0.1).
- Survol (`unit222.pas:10816-10833`) : sur un point → curseur `crmarteau` (marteau), panneau 2 « Clic gauche pour supprimer %s... » (%s = nom ci-dessus) ; ailleurs → curseur par défaut, « Faites passer la souris sur un des cercles rouges... ».

##### 15.3 Clic et confirmation

Tout bouton de souris déclenche (`ray1.pas:1108-1111`, bouton non testé). Puis `sauvevirtuel` est appelé **même si rien n'a été supprimé** (`ray1.pas:1110`).

1. Recensement de **tous** les objets dont un point est sous le pointeur (`unit222.pas:14985-16337`).
2. Aucun → rien (on reste dans le mode).
3. Plusieurs → boîte de choix `form_quelobjet`, titre « Choisissez l'objet à supprimer: », lignes « Rayon n° %s », « Source ponctuelle n° %s », « Polyhèdre réfractant n° %s », « Groupe n° %s »… (mêmes libellés qu'au § 17) ; si aucune ligne n'est choisie (`ItemIndex < 0`), rien n'est supprimé (`unit222.pas:16339-16414`).
4. Confirmation (`unit222.pas:16418-16420`) : boîte « Etes-vous sur de vouloir supprimer %s ? », titre « Attention ! », boutons Oui / Non. Non → rien, on reste dans le mode.
   - Anomalie : avec **un seul** candidat, la variable `boum` n'est jamais remplie (elle ne l'est que dans la branche « plusieurs », `unit222.pas:16413`) ; chaîne gérée initialisée vide (`{$H+}`, `unit222.pas:1`) : le message lu est « Etes-vous sur de vouloir supprimer  ? ». La version web doit nommer l'objet.
5. Si l'élément appartient à un ou plusieurs groupes : pour chacun, boîte « Le groupe n°%s qui contenait cet élément va être lui aussi détruit. », titre « Votre attention siouplait ! », bouton OK, puis le groupe est dissous (ses autres éléments restent) (ex. `unit222.pas:37256-37266` pour le rayon ; même code dans toutes les procédures `Supprime1P…`, `unit222.pas:36352-37793`).
6. Suppression. **Renumérotation** : le dernier objet du même type prend le numéro de l'objet supprimé (ex. `unit222.pas:37267-37282`), et les références des groupes sont corrigées.
7. **Sortie automatique du mode** après une suppression (`unit222.pas:16450-16456`) : boutons réactivés, `modesuppression := false`, libellé « Supprimer », curseur par défaut, panneaux 2 et 3 vidés, redessin. Une seule suppression par activation (l'aide le dit : « Une fois la suppression effectuée, le logiciel quitte automatiquement le mode suppression »).

##### 15.4 Sortie sans supprimer

Bouton « Fin sup. » (`unit1_palette.pas:351-359`) ou touche Échap (`ray1.pas:5689-5701`, via `activeboutons` qui remet `modesuppression := false`, `ray1.pas:4900-4908`).

##### 15.5 « Supprimer tout »

Accès : bouton de palette « Supprimer tout » (bulle « Supprimer tous les éléments existant ») ou menu Édition → « Supprimer tous les éléments », raccourci **Ctrl+Alt+S** (ShortCut 49235) (`unit1_palette.pas:80-81`, `ray1.lfm:1245-1248`, `ray1.pas:5431-5434`).

Confirmation obligatoire (`unit1_palette.pas:415-418`) : « Etes vous certain(e) de vouloir supprimer tous les éléments ? », titre « Attention ! », Oui / Non. Oui → tous les objets **et tous les groupes** sont supprimés, compteurs remis à zéro (y compris `decimalesangles := 0`), puis `sauvevirtuel` (donc annulable par Ctrl+Z) et redessin (`unit1_palette.pas:419-463`).

##### 15.6 Adaptation tablette

- Pas de survol : un appui sur un point rouge (zone 44 px) **sélectionne** l'objet : le surligner (contour épais, autres objets atténués) et ouvrir une barre d'actions « Supprimer cet objet » / « Annuler » nommant l'objet (« Supprimer ce rayon (n° 2) ? »). La confirmation porte toujours le nom (corrige l'anomalie du § 15.3).
- Proposition : accepter aussi un appui sur le corps de l'objet (trait, contour, disque), pas seulement sur ses points.
- Plusieurs candidats : feuille de choix (§ 17) où chaque ligne surligne l'objet correspondant quand on la touche.
- Conserver la sortie automatique après une suppression (comportement d'origine), avec un message bref « Rayon n° 2 supprimé » et un bouton « Annuler » (annulation de la dernière action).
- Groupe : annoncer dans la même confirmation que le ou les groupes contenant l'élément seront dissous (une seule boîte au lieu d'une boîte OK par groupe).
- « Supprimer tout » : confirmation plein écran avec bouton rouge, jamais déclenchable par un raccourci seul sur tablette.

---

#### 16. Mode « Grouper »

##### 16.1 Ce qu'est un groupe

- Structure `Groupe` (`unit222.pas:73-84`) : jusqu'à `maxelementsgroupe = 100` éléments (`unit222.pas:35`), chacun = (type `TTypeElementModif`, indice dans la liste de son type) ; `isox`, `isoy`. `PGroupe` = tableau dynamique de groupes ; au plus `maxgroupe = 500` groupes (`unit222.pas:35`). Une variable `groupeprovisoire` sert pendant la constitution.
- L'isobarycentre est la moyenne d'un point de référence par élément (`groupe.recalculeiso`, `unit222.pas:1727-1866`) : pour cette partie, rayon → milieu C ; source ponctuelle → **S** (et non G) ; onde plane → D ; polyèdre et polycercle → isobarycentre ; prisme → G ; sphère → centre ; œil → C ; trait → milieu ; texte → ancrage ; mesure de distance → milieu ; mesure d'angle → sommet O ; point → P. Il est recalculé à chaque redessin (`unit222.pas:3682`).
- **Seule opération : la translation** (poignée « Gr », § 14). Pas de rotation, pas de mise à l'échelle, pas de suppression en bloc des éléments. L'aide : « On peut grouper des éléments afin de pouvoir les translater ensemble ».
- Les éléments groupés gardent leurs propres poignées et peuvent être modifiés individuellement.
- Un élément peut appartenir à plusieurs groupes (rien ne l'interdit). Un groupe ne peut pas contenir un groupe (le mode Grouper ne propose pas les groupes).
- **Dissolution** : supprimer le groupe en mode Supprimer (cercle rouge « Gr ») ; seuls le groupe disparaît, ses éléments restent (`Supprime1Pgroupe`, `unit222.pas:36841-36854`). Supprimer un élément dissout aussi tous les groupes qui le contiennent (§ 15.3). Aucune commande « Dégrouper » ni retrait d'un élément d'un groupe.
- **Enregistrement dans le fichier .opt** : oui. Section « Nombre de groupes: », puis pour chaque groupe « Numero groupe<i> », le nombre d'éléments, puis pour chaque élément son indice et son type sous forme de texte (`mdrayon`, `mdsourceponctuelle`, `mdprisme`, `mdjolipoint`, … ; `mdneant` sinon) (`ray1.pas:8076-8114`). Relecture : `ray1.pas:9073-9112` ; à l'ajout d'un fichier dans la scène, les groupes du fichier sont ajoutés à la suite (`ray1.pas:10127-10133`).

##### 16.2 « Éléments à choisir » : bouton « Grouper » de la palette

Accès : bouton « Grouper » (bulle « Grouper des éléments existants pour les translater ensemble », `unit1_palette.pas:74-75`), ou menu Édition → Grouper des éléments → « Eléments à choisir », raccourci **Ctrl+G** (ShortCut 16455), qui appelle le même gestionnaire (`ray1.pas:10923-10926`). L'aide parle d'un bouton « Gr. » : le libellé réel est « Grouper ».

Début (`unit1_palette.pas:362-389`) :
- Moins de 2 éléments dans la scène → « Impossible de grouper moins de 2 éléments ! », titre « Attention ».
- Déjà 500 groupes → « Nombre maximal de groupes deja atteint ! », titre « Attention ».
- Sinon : libellé du bouton → « Fin groupement », bulle « Fin de la création d'un groupe » ; curseur `crPoint1` ; panneau 2 « Cliquez sur les croix violettes des éléments à grouper, puis sur Fin... » ; `modegroupement := true` ; groupe provisoire vidé ; autres boutons désactivés.

Croix violettes (`clPurple`, demi-diagonale 3 px, trait 2, taille fixe) : une par élément, au point de groupement :

| Objet | Point de la croix violette | Réf. dessin |
|---|---|---|
| Rayon | milieu C | `unit222.pas:30999-31001` |
| Source ponctuelle | G = (P1 + P2)/2 | `unit222.pas:31759-31761` |
| Onde plane | D | `unit222.pas:31874-31876` |
| Polyèdre, polycercle | isobarycentre | `unit222.pas:30729-30731`, `39206-39208` |
| Prisme | G (`xiso`) | `unit222.pas:30872-30874` |
| Sphère | centre | `unit222.pas:40044-40046` |
| Œil | C | `unit222.pas:2736-2738` |
| Trait | milieu | `unit222.pas:28106-28108` |
| Texte | ancrage | `unit222.pas:3093-3095` |
| Mesure de distance | milieu | `unit222.pas:29098-29100` |
| Mesure d'angle | sommet O | `unit222.pas:28776-28778` |
| Point | P | `unit222.pas:27771-27773` |

Survol (`Traitegroupement`, `unit222.pas:3836-4136`) : sur une croix → curseur `crgroupe`, panneau 2 « Clic gauche pour ajouter %s au groupe... » (%s = « ce rayon lumineux », « cette source ponctuelle », « cette onde plane », « ce polygone », « ce polycercle », « cette sphère », « ce prisme », « cet oeil », « ce trait », « ce texte », « cette mesure de distance », « cet angle », « ce point »…) ; ailleurs → curseur par défaut, « Faites passer la souris sur une des croix violettes, ou cliquez sur Fin... ».

Clic (`effectuegroupement`, `unit222.pas:16465-16872`, tout bouton) :
- Parmi les croix à ±3,3 px, on retient **la plus proche** (distance euclidienne ; à égalité, la première trouvée) : pas de boîte de choix dans ce mode.
- Aucune → rien.
- Sinon l'élément est ajouté au groupe provisoire et une boîte s'affiche : « %s ajouté au groupe n°%s en cours de constitution. » (%s = « Rayon », « Source ponctuelle », « Onde plane (faisceau parallèle) », « Polygone », « Polycercle », « Sphère », « Prisme », « Oeil », « Trait », « Texte », « Mesure de distance », « Mesure d'angle », « Point »…), titre « Fait ! », bouton OK.
- Anomalies : le message s'affiche **même si l'ajout est refusé** (élément déjà ajouté juste avant, ou 100 éléments atteints). Le test de doublon de `groupe.add` ne compare qu'avec le **dernier** élément ajouté (`unit222.pas:1570-1577`, indice `nombreelements` au lieu de `j`) : cliquer deux fois de suite sur la même croix est refusé, mais un élément re-cliqué plus tard est ajouté en double. Pas de moyen de retirer un élément du groupe provisoire.
- `sauvevirtuel` est appelé après chaque clic (`ray1.pas:1115`).

Fin :
- Bouton « Fin groupement » (même bouton, `unit1_palette.pas:390-412`) : si le groupe provisoire a **au moins 2 éléments**, le groupe est créé (n° = nombre de groupes + 1) et une boîte s'affiche : « Le groupe n°%s vient d'être créé. Ses éléments pourront être translatés ensemble. », titre « Fait ! ». Sinon, **rien n'est créé et aucun message**. Dans les deux cas : libellé « Grouper », bulle « Grouper des éléments », boutons réactivés, `modegroupement := false`, panneau 2 vidé, curseur par défaut. `sauvevirtuel` n'est pas appelé à cette étape.
- Touche Échap (`ray1.pas:5689-5701`) : quitte le mode, remet le libellé « Grouper » ; le groupe provisoire est abandonné (aucun groupe créé).
- Pas de clic droit spécifique (le bouton n'est pas testé) ; pas de bouton « Fin » distinct.

##### 16.3 « Tous les éléments » (menu)

Menu Édition → Grouper des éléments → « Tous les éléments », raccourci **Ctrl+A** (ShortCut 16449) (`ray1.pas:10928-11021`) :
1. 500 groupes atteints → « Nombre maximal de groupes deja atteint ! » / « Attention ».
2. Moins de 2 éléments → « Impossible de grouper moins de 2 éléments ! » / « Attention ».
3. Confirmation : « Dois je créer le groupe n°%s en y mettant tous les éléments présents ? », titre « Création ? », Oui / Non.
4. Oui → nouveau groupe contenant tous les éléments **sauf les prismes et les points**, qui sont oubliés par ce menu (aucune ligne `mdprisme` ni `mdjolipoint`, `ray1.pas:10942-11018`). Puis `sauvevirtuel`, redessin. Pas de message final.

##### 16.4 « Grouper tout » (bouton de la palette)

Bouton « Grouper tout » (bulle « Créer un groupe contenant tous les éléments », `unit1_palette.pas:94-95`, gestionnaire `SpeedButton7Click` `unit1_palette.pas:165-226`) — comportement **différent** du menu :
- Moins de 2 éléments → « Impossible de grouper moins de 2 éléments » (sans point d'exclamation), titre « Hélas... » (chaînes littérales non traduites).
- Pas de test du maximum de groupes, pas de confirmation.
- Ajoute tous les éléments, **prismes et points compris**.
- Message final : « Un nouveau groupe contenant tous les éléments vient d'être créé. », titre « Création réussie. ».
- Ni `sauvevirtuel` ni redessin (l'opération n'entre pas dans l'historique d'annulation ; le « Gr » n'apparaît qu'au prochain redessin).

##### 16.5 Adaptation tablette

- Mode Grouper = **sélection multiple** : chaque appui sur un objet (croix violette ou corps de l'objet) bascule son appartenance au groupe en cours (ajout ou **retrait**, ce que l'original ne permet pas) ; l'objet sélectionné est surligné et un compteur « 3 éléments sélectionnés » s'affiche dans une barre d'actions fixe avec « Créer le groupe » et « Annuler ».
- Supprimer la boîte « … ajouté au groupe … » après chaque appui (gênante au doigt) ; un bref retour visuel suffit. Refuser silencieusement les doublons.
- « Créer le groupe » désactivé tant que moins de 2 éléments sont sélectionnés (au lieu de l'abandon silencieux).
- Unifier « Tous les éléments » (menu) et « Grouper tout » (palette) : une seule commande, avec confirmation, incluant prismes et points, et enregistrée dans l'historique d'annulation (choix à valider : l'original diverge entre les deux accès).
- Proposer une action « Dégrouper » dans la barre d'actions quand un groupe est sélectionné (équivalent web de « supprimer le groupe » de l'original).

---

#### 17. Choix entre plusieurs objets sous le pointeur

##### 17.1 Dans le mode Déplacer et le mode Supprimer

- `DebutModif` (`unit222.pas:10859-14753`) et `effectuesuppression` (`unit222.pas:14985-16337`) parcourent **toutes** les poignées de tous les objets dans un ordre fixe et empilent chaque correspondance dans des listes parallèles : `liste_typeelementmodif`, `liste_indiceelementmodif`, `liste_boum` (nom pour la suppression) et, pour le Déplacer, `liste_modetranslation`, `liste_moderotation`, `liste_tprot`, `liste_tprirot`, `liste_lastxr`, `liste_lastyr`, `liste_bloqueaxe` ; `nombre_typeelementmodif` = nombre de correspondances.
- 2 correspondances ou plus → fenêtre modale `form_quelobjet` (`unit_quelobjet.pas`, `.lfm`) centrée à l'écran : titre « Choix de l'objet: » (Déplacer, `unit222.pas:14757`) ou « Choisissez l'objet à supprimer: » (Supprimer, `unit222.pas:16341`) ; liste déroulante non modifiable ; bouton « OK ». Chaque ligne nomme l'objet, pas la poignée. Libellés pour cette partie : « Rayon n° %s », « Source ponctuelle n° %s », « Onde plane n° %s », « Polyhèdre réfractant n° %s », « Polycercle réfractant n° %s », « Sphère réfractante n° %s », « Prisme n° %s », « Oeil n° %s », « Fléche n° %s » (sic), « Texte n° %s », « Mesure de distance n° %s », « Mesure d'angle n° %s », « Groupe n° %s » (`unit222.pas:14760-14815`).
- **Le point (`mdjolipoint`) n'a pas de libellé** dans cette liste (`case` sans branche `mdjolipoint`) : la ligne correspondante n'est pas ajoutée, ce qui **décale** les lignes suivantes par rapport aux listes internes (INCERTAIN quant à l'effet exact : l'indice choisi dans la boîte pointe alors vers le mauvais candidat, `unit222.pas:14825-14834`).
- Deux poignées d'un même objet sous le pointeur produisent deux lignes identiques.
- Après OK : si une ligne est choisie, on reprend toutes ses valeurs. Si aucune (`ItemIndex = −1`) : en Déplacer, les variables gardent les valeurs du **dernier** candidat trouvé, qui est saisi (INCERTAIN : `ItemIndex` vaut −1 après `Items.Clear` malgré `ItemIndex = 0` dans le `.lfm`, `unit222.pas:14825`) ; en Supprimer, rien n'est supprimé (`unit222.pas:16414`).
- `indicepointdeplace` (sommet du polyèdre ou du polycercle) n'est pas dans les listes : c'est la valeur du dernier candidat polyèdre/polycercle trouvé qui sert (INCERTAIN quant aux cas réels).

Ordre de parcours dans `DebutModif` pour les objets de cette partie (= ordre des lignes) : texte ; sphère (centre, +x, −x, +y, −y) ; œil (C, A) ; mesure d'angle (D, O, E1, E2) ; trait (E1, E2, milieu) ; point ; prisme (G, A, B, C) ; mesure de distance (E1, E2, milieu) ; polyèdre (sommets, I, R) ; polycercle (sommets, milieux, sommets d'arc) ; groupe (entre les poignées de l'écran) ; rayon (C, A, B) ; source ponctuelle (G, S, P1, P2) ; onde plane (P1, D, P2). Le survol suit un autre ordre (premier trouvé, `unit222.pas:4160-4806`).

##### 17.2 Dans le mode Grouper

Pas de boîte : la croix la plus proche est retenue (§ 16.2).

##### 17.3 Menu surgissant `Pop`

`Pop` (`ray1.pas:63`, `ray1.lfm:2064`) est un `TPopupMenu` **vide**, jamais utilisé dans le code (aucune référence hors de sa déclaration). Le seul autre menu surgissant, `PopupMenu1` (« Joindre par un segment », « Joindre par un arc de cercle », `ray1.lfm:2001-2010`), n'a pas de gestionnaire et n'est référencé que pour la traduction de ses libellés (`ray1.pas:4483-4488`) : il est lui aussi inutilisé. Le choix entre objets passe uniquement par `form_quelobjet`.

##### 17.4 Adaptation tablette

Remplacer la fenêtre modale par une feuille en bas d'écran (« Quel objet ? ») listant les candidats avec, pour chacun, le nom de l'objet **et de la poignée** (« Rayon n° 2 — extrémité », « Rayon n° 2 — translation »), une vignette ou un surlignage de l'objet au toucher de la ligne, et un bouton « Annuler » qui n'opère rien (au lieu de saisir le dernier candidat). Inclure les points (libellé « Point n° %s ») pour éviter le décalage d'indices de l'original.

---

#### 18. Points incertains et anomalies (récapitulatif)

1. INCERTAIN — boîte de choix validée sans sélection : saisie du dernier candidat (Déplacer), `unit222.pas:14825`.
2. INCERTAIN — point (`mdjolipoint`) absent de la boîte de choix : décalage des lignes (`unit222.pas:14758-14816`, `16342-16400`).
3. INCERTAIN — `indicepointdeplace` non mémorisé par candidat (polyèdre, polycercle), `unit222.pas:12128`, `12244`, `12284`, `12323`.
4. INCERTAIN — sphère : `tprot` non réglé par ses poignées de rayon ; seul le message de barre d'état peut en dépendre (`unit222.pas:11106-11242`).
5. INCERTAIN — polycercle : détail des tests d'intersection entre arcs non relu (`unit222.pas:38778` et suivantes).
6. Anomalie certaine — confirmation de suppression sans nom de l'objet quand il n'y a qu'un candidat (`unit222.pas:16413`, `16418`).
7. Anomalie certaine — message « ajouté au groupe » affiché même si l'ajout est refusé ; test de doublon limité au dernier élément (`unit222.pas:1570-1577`, `16868-16870`).
8. Divergence certaine — menu « Tous les éléments » sans prismes ni points, bouton « Grouper tout » avec ; confirmation, limite et historique différents (`ray1.pas:10928-11021`, `unit1_palette.pas:165-226`).
9. Messages trompeurs conservés tels quels dans l'original : « …ce sommet d'arc de cercle... » au survol d'un sommet de polyèdre ; « Mode: déplacement d'un sommet » pour la rotation du polyèdre ; « chgt rayon courbure » pour le sommet de la mesure d'angle.
10. La croix de translation du polyèdre est violette (comme celles du mode Grouper), toutes les autres sont vertes (`unit222.pas:30705-30709`).

## 10. Boîtes de propriétés de chaque objet

Chaque objet a une boîte de saisie, ouverte de trois façons : par le menu « Ajouter » (création par coordonnées, champs vides ou préremplis), par le mode « Propriétés » (modification, champs remplis depuis l'objet, bouton « Supprimer cet élément » actif), et pour quelques objets juste après la création à la souris (réseau, style du trait). Renvois : « 10.A » suivi du nom de l'objet, « 10.B-2.1 », « 10.M1 ».

### 10.0 Règles communes (résumé)

- OK relit chaque champ ; un champ illisible affiche « Valeur inacceptable pour … ! » ; l'objet est reconstruit par son constructeur, qui peut refuser (« Données aberrantes ! » ou message propre) ; en modification, OK crée un nouvel objet puis le recopie à l'indice de l'ancien (10.A « Règles communes »).
- Le bouton OK de toutes ces boîtes a `ModalResult = 1` (ex. `saisielmc.lfm:503`) : la boîte se ferme très probablement **même après un message d'erreur** (LCL ; §16.1 point 1). Version web : le panneau reste ouvert.
- « Supprimer cet élément » supprime sans confirmation (`ModalResult = 7` ; l'appelant traite `mrNo`, ex. `unit222.pas:18588`).
- Séparateur décimal : point imposé (`unit222.pas:40171-40172`) ; version web : virgule et point acceptés.
- L'unité affichée à côté des champs de longueur (`log1`…) est l'unité de l'espace de travail (`unitelongueur`), simple étiquette.
- Après OK : un état est empilé pour Annuler, puis la scène est retracée.

### 10.A Miroirs, réseau, lentilles, lame, écran, diaphragme, lentille épaisse, boîte de démarrage

Source : OptGeo 3.03 (`~/src/optgeo-amont/src/`). Toutes les références `fichier:ligne` renvoient aux fichiers d'origine (mêmes numéros de ligne que les copies lisibles). Les textes entre « » sont les textes français exacts des chaînes `rsXxx` (le `.pas` fait foi sur le `.lfm`). « INCERTAIN » signale un point que le code ne tranche pas.

#### Règles communes à toutes ces boîtes

**Ouverture**

- **Création par le menu** « Ajouter » : le gestionnaire de `ray1.pas` vérifie d'abord `modequelquechose` (rien ne se passe si un autre mode souris est en cours) puis le nombre maximal d'objets du type (500 pour chaque type, `unit222.pas:25-33`) ; s'il est atteint, message « Nombre maximal de … deja atteint ! », titre « Attention », et rien ne s'ouvre. Il vide ou initialise les champs, grise le bouton de suppression (`boutonsup.enabled:=false`), écrit le titre de création, met `unitelongueur` dans les étiquettes d'unité `log1…logN`, centre la boîte sur l'écran puis appelle `showmodal`. Au retour `mrOk`, il appelle `sauvevirtuel` (point d'annulation).
- **Modification** (bouton « Propriétés » de la barre d'outils, puis clic sur une poignée de l'objet) : procédure `Info`, `unit222.pas:16875-20504`. Si plusieurs objets sont sous le clic, une liste « Propriétés de l'objet: » permet de choisir (`unit222.pas:18483-18563`, libellés du type « Miroir plan n° %s »). La boîte est remplie depuis l'objet (`floattostr` : tous les chiffres significatifs, par exemple `123.456789012345`), le bouton de suppression est actif et le titre devient « Propriétés de … ».
- Les titres écrits dans `FormCreate` des unités `saisie*.pas` ne sont **jamais affichés** : `ray1.pas` ou `Info` les remplacent toujours avant `showmodal`. Ils sont donnés plus bas à titre d'information (« titre interne »).

**Fenêtre**

- Boîte modale, `BorderStyle = bsDialog`, `BorderIcons = []` : il n'y a pas de bouton de fermeture dans la barre de titre. On sort par OK, Annuler ou Supprimer.
- Entrée déclenche OK (`Default = True`). Échap déclenche Annuler (`Cancel = True`).
- En haut à gauche, une image d'illustration de 100 × 100 px (bitmap noir et blanc, `Image1`) rappelle la signification des points ; elle est décrite pour chaque boîte.

**Boutons**

| Bouton | Texte | Résultat modal | Effet |
|---|---|---|---|
| OK | « &OK » (`rsOK`) ; « OK » (`rsOK2`) pour l'écran et le diaphragme | `mrOk` (1) + gestionnaire `BitBtn1Click` | Contrôle les champs dans l'ordre et s'arrête au premier défaut avec un message. Si tout est valable, **ajoute un nouvel objet** en fin de liste avec le constructeur `create`/`create2`. Si le constructeur refuse, l'objet est retiré et un message s'affiche ; sinon `modalresult:=mrOk` puis `Rafraichit`. |
| Annuler | « Annuler » | `mrCancel` (2) | Ne change rien. |
| Supprimer | « Supprimer ce miroir », « … cette lentille », etc. | `mrNo` (7) | Grisé en création. En modification, `Info` supprime l'objet (`supprime1p…`) puis `sauvevirtuel`. **Aucune confirmation n'est demandée.** |

**Après OK en modification** (`Info`, même schéma pour tous les objets) : si le nombre d'objets a augmenté (la boîte a créé un objet valable en fin de liste), l'objet modifié est reconstruit à sa place, à son indice, avec les valeurs du nouvel objet ; le nouvel objet est ensuite retiré de la fin de liste, puis `sauvevirtuel`. L'objet garde donc son numéro. Sinon, rien ne change.

**Fermeture après une erreur** : INCERTAIN. Le bouton OK a `ModalResult = 1` dans le `.lfm`. Avec la LCL, `TCustomButton.Click` donne ce résultat au formulaire **avant** d'exécuter `OnClick` : après le message d'erreur et le `exit`, la boîte se fermerait quand même avec `mrOk`, sans créer ni modifier l'objet, et la saisie serait perdue. Ce comportement est déduit du code, pas observé. Pour la version web, garder le panneau ouvert et signaler l'erreur à côté du champ.

**Nombres**

- La lecture se fait par `strtofloat`. Le séparateur décimal est forcé au point (`unit222.pas:40172-40173`, `DefaultFormatSettings.DecimalSeparator:='.'`). Une virgule est donc refusée (« Valeur inacceptable pour … ») ; sous macOS c'est INCERTAIN, car `UpdateFormatSettings` n'y est pas désactivé.
- Message d'erreur : boîte avec un seul bouton OK, titre « Attention ! » (`rsattention`).
- Les champs numériques sont des `TEdit` libres : on peut y taper n'importe quoi, et le contrôle n'a lieu qu'à OK.

**Unités**

- `log1…logN` affichent `unitelongueur`, un simple libellé (« mm » par défaut, `ray1.pas:7366`, `unit222.pas:40251`), choisi dans la boîte « Dimensions de l'espace de travail » (`unit11.pas:117`). Il n'y a aucune conversion.
- Les angles sont en radians (étiquette « rad »).

**Bornes de l'espace de travail** : `xxmin ≤ x ≤ xxmax` et `yymin ≤ y ≤ yymax`.

**Taille minimale** : `taillemini` (`ray1.pas:5658-5670`) vaut le dixième de la plus petite des longueurs « monde » qui correspondent à 2 pixels, en largeur et en hauteur, de la zone de dessin (soit 0,2 pixel). Le menu « Désactiver le contrôle de points trop proches à la construction » (`ray1.lfm:1900-1903`, `ray1.pas:6367-6371`) lève **certains** de ces contrôles seulement ; c'est précisé pour chaque objet.

**Couleurs**

- Contrôle `TColorBox` (liste déroulante de couleurs) sans propriété `Style` dans les `.lfm`, donc avec le style par défaut de la LCL : couleurs standard (16), étendues (4) et système, nommées `clBlack`, `clBlue`… INCERTAIN : c'est le défaut de la LCL, non vérifié à l'exécution. Ce qui arrive quand la couleur de l'objet n'est pas dans la liste est aussi INCERTAIN.
- Valeurs par défaut d'usine (`unit222.pas:40196-40216`, aussi rétablies par `unit17.pas:944-966`, bouton des Préférences). L'utilisateur peut les modifier dans les Préférences :

  | Objet | Couleur du trait | Épaisseur | Couleur de l'axe |
  |---|---|---|---|
  | Miroir plan | noir | 1 | — |
  | Réseau | bleu | 1 | — |
  | Miroirs sphériques (4 sortes) | noir | 1 | bleu |
  | Lentilles minces | bleu | 1 | fuchsia |
  | Lentille épaisse | cyan (`clAqua`) | — | rouge |
  | Écran | noir | **2** | — |
  | Lame semi-réfléchissante | noir | 1 | — |
  | Miroir conique | noir | — | bleu |
  | Diaphragme | noir | 1 | — |

**Champs propres à certains objets seulement**

- Hachures : miroir plan, miroirs sphériques, miroir conique, réseau (« Hachures si réseau en réflexion »).
- Axe : miroirs sphériques (« Axe optique » pour les paraxiaux, « Axe de symétrie » pour les réels), lentilles minces (« Axe optique »), miroir conique (« Axe focal »), chacun avec une couleur d'axe.
- Trou central : les quatre miroirs sphériques. C'est une longueur pour les paraxiaux, un angle en radians pour les réels.
- « Obtu » (angle d'ouverture) : miroirs sphériques réels seulement.
- Concave / convexe : miroir conique (case). Les autres miroirs ont une boîte distincte par sorte.
- Transmission / réflexion, nombre de traits par mm, ordres min et max : réseau seulement.
- Pas d'épaisseur de trait : miroir conique et lentille épaisse.
- Indices de réfraction et matériau : lentille épaisse seulement.

---

#### Miroir plan (`saisiemp`, classe `Tsaisiemiroirplan`)

- **Création** : Ajouter › Système optique idéal › Miroir plan, `TForm1.Miroirplan2Click`, `ray1.pas:6209-6238`. Titre « Ajout d'un miroir plan: » (`ray1.pas:6231-6232`). Si le maximum est atteint : « Nombre maximal de miroirs plans deja atteint ! » (`ray1.pas:6213`).
- **Modification** : `unit222.pas:19101-19142`. Titre « Propriétés de ce miroir plan: » (`unit222.pas:19119-19120`).
- Titre interne : « Ajout d'un miroir plan » (`saisiemp.pas:176-177`).
- **Illustration** : un segment épais en diagonale de 1 (en bas à gauche) vers 2 (en haut à droite), hachuré d'un côté.

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (création par menu) | Modification | Bornes et contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Point 1 » › « x= » | texte | log1 | vide | `a1x` | nombre, sinon « Valeur inacceptable pour x1 ! » ; aussi si hors de [xxmin, xxmax] |
| 2 | « Point 1 » › « y= » | texte | log2 | vide | `a1y` | « Valeur inacceptable pour y1 ! » ; [yymin, yymax] |
| 3 | « Point 2 » › « x= » | texte | log3 | vide | `a2x` | « Valeur inacceptable pour x2 ! » ; [xxmin, xxmax] |
| 4 | « Point 2 » › « y= » | texte | log4 | vide | `a2y` | « Valeur inacceptable pour y2 ! » ; [yymin, yymax] |
| 5 | « Couleur à l'écran » | liste de couleurs | — | `couleurmiroirplan` (noir) | `couleur` | — |
| 6 | « Epaisseur trait à l'écran » | nombre à flèches (`TSpinEdit`) | px | `epaisseurmiroirplan` (1) | `epaisseur` | Min 1, Max 20, pas 1 |
| 7 | « Aspect » › « Hachures » | case à cocher | — | cochée | `hachures` | — |

- Ordre des contrôles à OK (`saisiemp.pas:81-159`) : x1, x2, y1, y2. Les messages de cette boîte sont écrits en dur, sans `rs` : « Valeur inacceptable pour x1 ! » etc.
- Refus du constructeur : « Taille du miroir trop petite ! » (`saisiemp.pas:151`).
- Constructeur `miroirplan.create` (`unit222.pas:25817-25839`). Refus si la longueur P1P2 est inférieure à `taillemini` (contrôle levé par l'option « points trop proches ») ou si une extrémité sort de l'espace de travail.
- **Effet** : segment P1P2. L'ordre des points fixe la face réfléchissante ; l'autre face est absorbante (aide `miroirplan.html`). Normale = angle polaire de P1→P2 + π/2.
- Boutons : OK, Annuler, « Supprimer ce miroir ».
- **Adaptation tablette** : panneau latéral non modal ; deux blocs « Point 1 / Point 2 » avec champs `inputmode="decimal"` qui acceptent la virgule et le point ; bouton « placer au doigt » pour chaque point ; flèche ou marque sur le canevas qui montre la face réfléchissante ; palette de couleurs nommées (« Noir », « Bleu »…) en pastilles dessinées, sans émoji ; épaisseur par boutons − / + d'au moins 44 px ; interrupteur « Hachures » ; bouton « Valider » (ou application en direct avec un seul point d'annulation par ouverture du panneau) ; « Supprimer ce miroir » avec annulation possible plutôt qu'une confirmation.

---

#### Réseau diffractant (`saisiereseau`, classe `Tsaisiereseau`, instance `Fsaisiereseau`)

- **Création par le menu** : Ajouter › Divers › Réseau diffractant, `TForm1.MenuItemreseauClick`, `ray1.pas:5396-5429`. Si le maximum est atteint : « Nombre maximal de réseaux déja atteint ! » (`ray1.pas:5400`).
  - **Titre erroné** : « Ajout d'un miroir plan: » (`ray1.pas:5422-5423`, chaîne `rsAjoutDUnMiro`). À corriger en « Ajout d'un réseau diffractant ».
- **Création à la souris** (bouton de la barre d'outils, `TForm1.boutonreseauClick`, `ray1.pas:6937-6953`, puis deux clics) : `ray1.pas:1769-1831`.
  - Le réseau est d'abord créé avec les valeurs fixes : pas = 10⁻³/500 (500 traits par mm), en transmission, sans hachures, ordres −1 à 1, `epaisseurreseau`, `couleurreseau`. Il est dessiné et `sauvevirtuel` est appelé.
  - Si la construction échoue : « Taille du réseau trop petite, ou débordant de l'écran ! » (`ray1.pas:1777`).
  - La boîte s'ouvre ensuite, titre « Propriétés de ce réseau », remplie depuis l'objet, bouton Supprimer actif.
  - OK : le réseau est remplacé par les valeurs saisies (`ray1.pas:1809-1826`). Annuler : il reste avec les valeurs fixes.
  - « Supprimer ce réseau » : **ne fait rien**, le réseau reste. `ray1.pas:1809` ne traite que `mrOk` (défaut d'origine à ne pas reproduire).
  - Défaut d'origine à ne pas reproduire, si la fermeture après une erreur se confirme (voir « Fermeture après une erreur ») : `ray1.pas:1811-1824` ne vérifie pas que le nombre de réseaux a augmenté. Il recopierait alors le réseau nouvellement créé sur le **réseau précédent** (indice n−2), puis retirerait le dernier ; pour le premier réseau, l'indice serait −1.
- **Modification** : `unit222.pas:19145-19194`. Titre « Propriétés de ce réseau » (`unit222.pas:19167-19168`).
- Titre interne : « Ajout d'un réseau diffractant » (`saisiereseau.pas:204-205`).
- **Illustration** : la même que celle du miroir plan (segment hachuré de 1 à 2).

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (menu) | Modification | Bornes et contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Point 1 » › « x= », « y= » | texte ×2 | log1, log2 | vides | `a1x`, `a1y` | « Valeur inacceptable pour x1 ! » / « … y1 ! » ; dans l'espace de travail |
| 2 | « Point 2 » › « x= », « y= » | texte ×2 | log3, log4 | vides | `a2x`, `a2y` | « … x2 ! » / « … y2 ! » ; dans l'espace de travail |
| 3 | « Couleur à l'écran » | liste de couleurs | — | `couleurReseau` (bleu) | `couleur` | — |
| 4 | « Epaisseur trait à l'écran » | nombre à flèches | px | `epaisseurReseau` (1) | `epaisseur` | Min 1, Max 20 |
| 5 | « Aspect » › « Hachures si réseau en réflexion » | case à cocher | — | **décochée** (`ray1.pas:5415` ; le `.lfm` la coche, mais la valeur est remplacée) | `hachures` | — |
| 6 | « Type de réseau » › « En transmission » / « En réflexion » | groupe d'options (1 colonne) | — | « En transmission » | `entransmission` | — |
| 7 | « Nombre de traits par mm » | nombre décimal à flèches (`TFloatSpinEdit`) | traits/mm | 500 | `nombre_trait_par_mm` | Min 1, Max 100 000, pas 1 ; décimales : 2, valeur par défaut de la LCL (INCERTAIN) |
| 8 | « Ordres à prendre en compte » › « Ordre minimum » | nombre à flèches | — | −1 | `ordre_min` | Min −10 000, Max 10 000 |
| 9 | idem › « Ordre maximum » | nombre à flèches | — | 1 | `ordre_max` | Min −10 000, Max 10 000 |
| 10 | Texte fixe 1 | étiquette | — | — | — | voir ci-dessous |
| 11 | Texte fixe 2 | étiquette | — | — | — | voir ci-dessous |

- Le cadre 7 s'intitule « Nombre de traits par mm » d'après `saisiereseau.pas:201`, alors que le `.lfm` dit « Nombre de trait par mm ».
- Texte fixe 1 (`rsRemarqueImpo`, `saisiereseau.pas:235-236`) : « Remarque importante: ce réseau diffractant doit être éclairé par une onde plane. Un rayon unique sera diffracté selon la loi des réseaux sin i=+-sin i0+k.lambda/a mais cela n'a pas de sens pour un rayon unique. » Le `.lfm` coupe la ligne après « plane. » et après « lambda/a ». La copie des sources utilisée pour cette lecture colle les lignes : les sauts de ligne de la chaîne sont INCERTAINS.
- Texte fixe 2 (`rsLesLongueurs`, `saisiereseau.pas:203`) : « Les longueurs d'onde peuvent être modifiées dans le menu options, indices du milieu ambiant et longueurs d'onde. » (saut de ligne probable après « milieu »).
- Ordre des contrôles à OK (`saisiereseau.pas:94-175`) : x1, x2, y1, y2, chacun converti puis comparé aux bornes. Refus du constructeur : « Taille du réseau trop petite ! » (`saisiereseau.pas:167`).
- Constructeur `reseau.create` (`unit222.pas:25842-25873`). Mêmes refus que le miroir plan (longueur inférieure à `taillemini`, levé par l'option ; extrémités hors de l'espace de travail).
- **Effet** : `pas = 10⁻³ / (traits par mm)` (`saisiereseau.pas:162`) et `nombre_trait_par_mm = 10⁻³ / pas` ; `entransmission` = 1re option cochée. Si l'ordre minimum dépasse l'ordre maximum, les deux sont **échangés sans message** (`unit222.pas:25866-25872`).
- Boutons : OK (bouton très haut sur toute la droite), Annuler, « Supprimer ce réseau » (`OnClick` vide, `saisiereseau.pas:177-180`).
- **Adaptation tablette** : panneau latéral ; choix « En transmission / En réflexion » en bouton segmenté ; la case « Hachures » n'est active qu'en réflexion (suggestion, l'original la laisse toujours active) ; traits/mm en champ décimal avec − / + ; ordres min et max en pas à pas entier, avec contrôle min ≤ max affiché plutôt qu'un échange silencieux ; les deux textes d'avertissement repliés sous « En savoir plus » ; titre de création corrigé ; « Supprimer » qui fonctionne aussi juste après une création au doigt.

---

#### Miroir sphérique concave paraxial (« idéal ») (`saisiemscopa`, classe `Tsaisiemiroirscopa`)

- **Création** : Ajouter › Système optique idéal › Miroir sphérique concave, `TForm1.Miroirsphriqueconvergent1Click`, `ray1.pas:6623-6662`. Titre « Ajout d'un miroir concave: » (`ray1.pas:6653-6654`). Maximum : « Nombre maximal de miroirs deja atteint ! ».
- **Modification** : `unit222.pas:19609-19666`. Titre « Propriétés de ce miroir concave: » (`unit222.pas:19636-19637`).
- Titre interne : « Ajout d'un miroir sphérique concave paraxial » (`saisiemscopa.pas:213-214`).
- **Illustration** : un trait vertical aux extrémités recourbées vers la gauche (2 en haut, 1 en bas), hachuré à droite ; axe en tirets vers la gauche jusqu'à F.

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (menu) | Modification | Contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Point 1 » › « x= », « y= » | texte ×2 | log1, log2 | vides | `a1x`, `a1y` | nombre (« Valeur inacceptable pour x1 ! », « … y1 ! ») ; **pas** de contrôle de bornes dans la boîte |
| 2 | « Point 2 » › « x= », « y= » | texte ×2 | log3, log4 | vides | `a2x`, `a2y` | « … x2 ! », « … y2 ! » |
| 3 | « Focale » › « \|f\|= » | texte | log5 | vide | `focale` | « Valeur inacceptable pour la focale ! » ; si 0 : « La focale doit être non nulle ! » ; puis valeur absolue |
| 4 | « Couleur du miroir » | liste de couleurs | — | `couleurmscopa` (noir) | `couleur` | — |
| 5 | « Couleur de l'axe » | liste de couleurs | — | `couleuraxemscopa` (bleu) | `couleuraxe` | — |
| 6 | « Epaisseur trait à l'écran » | nombre à flèches | px | `epaisseurmscopa` (1) | `epaisseur` | Min 1, Max 20 |
| 7 | « Aspect » › « Hachures » | case | — | cochée | `hachures` | — |
| 8 | « Aspect » › « Axe optique » | case | — | cochée | `axefocal` | — |
| 9 | « Trouer le miroir en son centre » › « Trouer » | case | — | décochée | `trou` | En cochant ou décochant, on active ou grise le champ 10 (`checktrouClick`, `saisiemscopa.pas:190-193`) |
| 10 | idem › « Diamètre du trou: » | texte (grisé si « Trouer » décoché) | log6 | « 0 », grisé | `diametretrou`, actif si `trou` | Lu seulement si « Trouer » est coché : « Valeur inacceptable pour le diametre du trou ! » ; sinon 0 |

- Ordre des contrôles à OK (`saisiemscopa.pas:95-188`) : diamètre du trou (si coché), x1, x2, y1, y2, focale. Refus du constructeur : « Taille du miroir trop petite ! » (`saisiemscopa.pas:181`).
- Constructeur `mscopa.create2` (`unit222.pas:27352-27389`). Refus si P1P2 < `taillemini`, ou focale < `taillemini`, ou une extrémité hors de l'espace de travail, ou trou coché avec un diamètre supérieur à P1P2. Ces contrôles **ne sont pas** levés par l'option « points trop proches ».
- **Effet** : sommet S au milieu de P1P2 ; F = S + f·n, avec n la direction (angle polaire de P1→P2 + π/2) ; C = S + 2(F − S). Le trou va de S − D/2 à S + D/2 le long du miroir. L'ordre des points fixe la face réfléchissante (aide `miroirspheriqueparaxial.html`).
- Boutons : OK, Annuler, « Supprimer ce miroir ».
- **Adaptation tablette** : panneau latéral ; la focale est saisie en valeur absolue (rappeler « |f| ») ; interrupteur « Trouer » qui affiche ou masque le champ « Diamètre du trou » plutôt que de le griser ; aperçu de F et de l'axe sur le canevas pendant la saisie ; deux palettes nommées, celle du miroir et celle de l'axe, avec une pastille d'aperçu ; champs `inputmode="decimal"`.

---

#### Miroir sphérique convexe paraxial (« idéal ») (`saisiemscepa`, classe `Tsaisiemiroirscepa`)

Même boîte que le miroir concave paraxial (le code de `BitBtn1Click` est identique ; seul le constructeur appelé change). Différences :

- **Création** : Ajouter › Système optique idéal › Miroir sphérique convexe, `TForm1.Miroirsphriqueconvexe1Click`, `ray1.pas:6664-6704`. Titre « Ajout d'un miroir convexe: » (`ray1.pas:6694-6695`).
  - Défaut d'origine : quand le maximum est atteint, le message dit « Nombre maximal de miroirs plans deja atteint ! » (`ray1.pas:6668`, chaîne réutilisée par erreur).
  - Valeurs par défaut : `epaisseurmscepa`, `couleurmscepa` (noir), `couleuraxemscepa` (bleu) ; trou décoché, diamètre « 0 » grisé.
- **Modification** : `unit222.pas:19668-19724`. Titre « Propriétés de ce miroir convexe: » (`unit222.pas:19695-19696`).
- Titre interne : « Ajout d'un miroir sphérique convexe paraxial » (`saisiemscepa.pas`, `FormCreate`).
- **Illustration** : un trait vertical aux extrémités recourbées vers la droite, hachuré à droite ; axe en tirets-points vers la droite jusqu'à F.
- Champs, unités, bornes et messages : identiques au tableau du miroir concave paraxial (« Couleur du miroir », « Couleur de l'axe », « Focale » › « |f|= », « Aspect » › « Hachures » / « Axe optique », « Trouer le miroir en son centre » › « Trouer » / « Diamètre du trou: »).
- Constructeur `mscepa.create2` (`unit222.pas:27392-27436`) : mêmes refus. **Effet** : F = S − f·n, du côté opposé à celui du miroir concave.
- **Adaptation tablette** : comme pour le miroir concave paraxial ; corriger le message de maximum.

---

#### Miroir sphérique concave réel (`saisiemscore`, classe `Tsaisiemiroirscore`)

- **Création** : Ajouter › Système optique réel › Miroir sphérique concave, `TForm1.Miroirsphriqueconcave1Click`, `ray1.pas:6810-6850`. Titre « Ajout d'un miroir concave: » (`ray1.pas:6838-6839`). Maximum : « Nombre maximal de miroirs deja atteint ! ».
- **Modification** : `unit222.pas:19726-19784`. Titre « Propriétés de ce miroir concave: » (le même que pour le paraxial).
- Titre interne : « Ajout d'un miroir sphérique concave réel » (`saisiemscore.pas:233-234`).
- **Illustration** : un arc de cercle de 1 (en bas) à 2 (en haut), creux vers la gauche, hachuré à droite ; C à gauche, relié au sommet par un tiret marqué R.

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (menu) | Modification | Contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Point 1 » › « x= », « y= » | texte ×2 | log1, log2 | vides | `a1x`, `a1y` | nombre, puis bornes de l'espace de travail : « Valeur inacceptable pour x1 ! » / « … y1 ! » |
| 2 | « Point 2 » › « x= », « y= » | texte ×2 | log3, log4 | vides | `a2x`, `a2y` | idem : « … x2 ! » / « … y2 ! » |
| 3 | « Rayon de courbure » › « R= » | texte | log5 | vide | `rayoncourbure` | « Valeur inacceptable pour le rayon de courbure ! » ; si 0 : « Le rayon de courbure doit être non nul ! » ; valeur absolue ; si P1P2 > 2R : « La distance entre les points 1 et 2 doit être inférieure au double du rayon ! » |
| 4 | « Couleur du miroir » | liste de couleurs | — | `couleurmscore` (noir) | `couleur` | — |
| 5 | « Couleur de l'axe » | liste de couleurs | — | `couleuraxemscore` (bleu) | `couleuraxe` | — |
| 6 | « Angle d'ouverture » › « Obtu » | case | — | décochée (miroir « aigu ») | cochée si `not aigu` | — |
| 7 | « Epaisseur trait à l'écran » | nombre à flèches | px | `epaisseurmscore` (1) | `epaisseur` | Min 1, Max 20 |
| 8 | « Aspect » › « Hachures » | case | — | cochée | `hachures` | — |
| 9 | « Aspect » › « Axe de symétrie » | case | — | cochée | `axefocal` | — |
| 10 | « Trouer le miroir en son centre » › « Trouer » | case | — | décochée | `trou` | — |
| 11 | idem › « Diamètre angulaire du trou: » « (vu depuis le centre C) » | texte, **toujours actif** (aucun gestionnaire sur la case) | « rad » | « 0 » | `diametretrou`, écrit seulement si `trou` (sinon le texte précédent reste) | Lu seulement si « Trouer » est coché : « Valeur inacceptable pour le diametre du trou ! » ; sinon 0 |

- Ordre des contrôles à OK (`saisiemscore.pas:98-213`) : diamètre du trou (si coché), x1, x2, y1, y2, R, distance P1P2 ≤ 2R. Refus du constructeur : « Taille du miroir trop petite, ou débordant de l'écran ! » (`saisiemscore.pas:206`).
- Constructeur `Mscore.create2` (`unit222.pas:26061-26154`). Refus si :
  - P1 = P2, ou P1P2 > 2R (discriminant négatif) ;
  - la longueur de l'arc R·|θ2 − θ1| est inférieure à `taillemini` (seul contrôle levé par l'option) ;
  - une extrémité sort de l'espace de travail ;
  - trou coché avec un diamètre angulaire supérieur à l'ouverture angulaire |θ2 − θ1| ;
  - un des 200 points de l'arc (des deux arcs restants s'il y a un trou) sort de l'espace de travail.
- **Effet** : C est sur la médiatrice de P1P2. « Obtu » choisit l'autre des deux solutions, celle dont l'angle d'ouverture (entre CM1 et CM2) est obtus (aide `miroirspheriquereel.html`). Le sommet S est le milieu de l'arc. Le trou est un arc centré sur S.
- Boutons : OK, Annuler, « Supprimer ce miroir ».
- **Adaptation tablette** : panneau latéral ; « Angle d'ouverture » en choix à deux options « aigu / obtus » avec un petit schéma, plutôt qu'une case « Obtu » ; message immédiat quand P1P2 > 2R ; diamètre du trou en radians (proposer aussi les degrés, avec conversion affichée) ; écrire « obtus », car « Obtu » est une faute de l'original (à faire valider par l'enseignant).

---

#### Miroir sphérique convexe réel (`saisiemscere`, classe `Tsaisiemiroirscere`)

Même boîte que le miroir concave réel. Différences :

- **Création** : Ajouter › Système optique réel › Miroir sphérique convexe, `TForm1.Miroirsphriqueconvexe2Click`, `ray1.pas:6896-6935`. Titre « Ajout d'un miroir convexe: » (`ray1.pas:6924-6925`). Valeurs par défaut `epaisseurmscere`, `couleurmscere`, `couleuraxemscere`.
- **Modification** : `unit222.pas:19787-19844`. Titre « Propriétés de ce miroir convexe: ».
- Titre interne : « Ajout d'un miroir sphérique convexe réel ».
- **Illustration** : arc bombé vers la droite, hachuré à droite, C à gauche, R.
- Contrôles à OK (`saisiemscere.pas`) : **pas** de contrôle de bornes sur x1, x2, y1, y2 et **pas** de contrôle P1P2 ≤ 2R dans la boîte. Ces cas tombent sur le refus du constructeur : « Taille du miroir trop petite, ou débordant de l'écran ! ».
- Constructeur `Mscere.create2` (`unit222.pas:26239-26331`) : mêmes refus que le miroir concave réel.
- Champs : identiques (« Rayon de courbure » › « R= », « Angle d'ouverture » › « Obtu », « Aspect » › « Hachures » / « Axe de symétrie », « Trouer le miroir en son centre » › « Diamètre angulaire du trou: » « (vu depuis le centre C) » « rad »).
- **Adaptation tablette** : comme pour le miroir concave réel ; faire les mêmes contrôles que lui (bornes, 2R) pour des messages précis.

---

#### Miroir parabolique, elliptique ou hyperbolique (« conique ») (`saisiemconique`, classe `Tsaisiemiroirconique`)

- **Création** : Ajouter › Système optique réel › Miroir cônique, `TForm1.Miroircnique1Click`, `ray1.pas:6996-7031`. Titre « Ajout d'un miroir cônique: » (`ray1.pas:7025-7026`). Maximum : « Nombre maximal de miroirs coniques deja atteint ! ».
- **Modification** : `unit222.pas:19550-19607`. Le titre dépend de l'excentricité (`unit222.pas:19576-19581`) :
  - e ≤ 0,99999999999 : « Propriétés de ce miroir elliptique: » ;
  - e ≥ 1,00000000001 : « Propriétés de ce miroir hyperbolique: » ;
  - sinon : « Propriétés de ce miroir parabolique: ».
- Titre interne : « Ajout d'un miroir parabolique, elliptique ou hyperbolique » (`saisiemconique.pas:215-216`).
- **Illustration** : un arc de conique avec F, S, l'axe FS et les angles t0, t1, t2 repérés à partir de F.
- **Pas de champ d'épaisseur de trait** dans cette boîte.

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (menu) | Modification | Contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Foyer F » › « x= » | texte | log1 | vide | `fx` | « Valeur inacceptable pour fx ! » ; [xxmin, xxmax] |
| 2 | « Foyer F » › « y= » | texte | log2 | vide | `fy` | « Valeur inacceptable pour fy ! » ; [yymin, yymax] |
| 3 | « Paramétre » (sic) › « P= » | texte | log3 | vide | `parametre` | « Valeur inacceptable pour p ! » ; valeur absolue |
| 4 | « Excentricité » › « e= » | texte | — | vide | `excentricite` | « Valeur inacceptable pour e ! » ; valeur absolue |
| 5 | « Couleur du miroir » | liste de couleurs | — | `couleurmiroirconique` (noir) | `couleur` | — |
| 6 | « Angle polaire de l'axe focal » › « t0= » | texte | rad | vide | `theta0` | « Valeur inacceptable pour t0 ! » |
| 7 | « Couleur de l'axe » | liste de couleurs | — | `couleuraxemiroirconique` (bleu) | `couleuraxe` | — |
| 8 | « Angles polaires FMi (extrémités) » › « t1= » | texte | rad | vide | `theta1` | « Valeur inacceptable pour t1 ! » |
| 9 | idem › « t2= » | texte | rad | vide | `theta2` | « Valeur inacceptable pour t2 ! » |
| 10 | « Aspect à l'écran » › « Hachures » | case | — | cochée | `hachures` | — |
| 11 | « Aspect à l'écran » › « Axe focal » | case | — | cochée | `axefocal` | — |
| 12 | « Concave ou convexe ? » › « Concave » | case | — | cochée | `concave` | — |

- Ordre des contrôles à OK (`saisiemconique.pas:98-198`) : fx, fy, e, p, t0, t1, t2. Refus du constructeur : « Données aberrantes ! » (`saisiemconique.pas:191`).
- Constructeur `MiroirConique.create2` (`unit222.pas:3170-3244`). Refus si :
  - F sort de l'espace de travail ;
  - pour e > 1 (hyperbole), t1 ou t2 s'écarte de t0 de plus de arccos(−1/e), c'est-à-dire au-delà des asymptotes ;
  - S = F (P = 0) ;
  - un des 200 points de l'arc sort de l'espace de travail.
  - Aucun contrôle de `taillemini` ici.
- Normalisation des angles : t1 et t2 sont ramenés dans [0, 2π[ ; si t1 ≥ t2, on ajoute 2π à t2. L'arc va donc de t1 à t2 dans le sens trigonométrique.
- Équation polaire : r = P / (1 + e·cos(θ − t0)) ; S = F + P/(1 + e)·(cos t0, sin t0).
- INCERTAIN : le cas e = 1 avec un arc qui passe par θ − t0 = π (division par zéro) n'est pas traité explicitement.
- **Effet** : l'axe focal est tracé entre F et S (aide `miroirconique.html`).
- Boutons : OK, Annuler, « Supprimer ce miroir ».
- **Adaptation tablette** : panneau latéral en deux sections, « Géométrie » (F, P, e, t0, t1, t2) et « Apparence » ; choix « Concave / Convexe » en bouton segmenté ; angles saisis en degrés avec conversion en radians affichée (suggestion ; l'original est en radians) ; nature de la conique (ellipse, parabole, hyperbole) affichée en direct d'après e, comme le titre de modification ; écrire « Paramètre » au lieu de « Paramétre ».

---

#### Lentille mince convergente (paraxiale) (`saisielmc`, classe `Tsaisielentillemc`)

- **Création** : Ajouter › Système optique idéal › Lentille mince convergente, `TForm1.Lentilleminceconvergente1Click`, `ray1.pas:6707-6741`. Titre « Ajout d'une lentille convergente: » (`ray1.pas:6733-6734`). Maximum : « Nombre maximal de lentilles deja atteint ! ».
- **Modification** : `unit222.pas:19846-19894`. Titre « Propriétés de cette lentille convergente: » (`unit222.pas:19869-19870`).
- Titre interne : « Ajout d'une lentille mince convergente paraxiale » (`saisielmc.pas:183-184`).
- **Illustration** : une double flèche verticale (pointes vers l'extérieur) de 1 (en bas) à 2 (en haut) ; axe en tirets-points avec un foyer de chaque côté.

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (menu) | Modification | Contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Point 1 » › « x= », « y= » | texte ×2 | log1, log2 | vides | `a1x`, `a1y` | nombre seulement : « Valeur inacceptable pour x1 ! » / « … y1 ! » |
| 2 | « Point 2 » › « x= », « y= » | texte ×2 | log3, log4 | vides | `a2x`, `a2y` | « … x2 ! » / « … y2 ! » |
| 3 | « Couleur de la lentille » | liste de couleurs | — | `couleurlmc` (bleu) | `couleur` | — |
| 4 | « Couleur de l'axe optique » | liste de couleurs | — | `couleuraxelmc` (fuchsia) | `couleuraxe` | — |
| 5 | « Focale (valeur absolue) » › « \|f\|= » | texte | log5 | vide | `focale` | « Valeur inacceptable pour la focale ! » ; si 0 : « La focale doit être non nulle ! » ; valeur absolue |
| 6 | « Epaisseur trait à l'écran » | nombre à flèches | px | `epaisseurlmc` (1) | `epaisseur` | Min 1, Max 20 |
| 7 | « Aspect » › « Axe optique » | case | — | cochée | `axefocal` | — |

- Ordre des contrôles à OK (`saisielmc.pas:89-166`) : x1, x2, y1, y2, focale. Refus du constructeur : « Données aberrantes ! » (`saisielmc.pas:159`).
- Constructeur `lmc.create2` (`unit222.pas:27240-27276`). Refus si P1P2 < `taillemini`, ou |f| < `taillemini`, ou une extrémité hors de l'espace de travail. L'option « points trop proches » est sans effet ici.
- **Effet** : centre O au milieu de P1P2 ; F1 = O + f·n et F2 = O − f·n (n = angle polaire de P1→P2 + π/2). Pas de hachures.
- Boutons : OK, Annuler, « Supprimer cette lentille ».
- **Adaptation tablette** : panneau latéral ; focale positive seulement, avec le rappel « valeur absolue » ; foyers F et F′ affichés en direct sur le canevas ; interrupteur « Axe optique » ; palettes nommées pour la lentille et pour l'axe.

---

#### Lentille mince divergente (paraxiale) (`saisielmd`, classe `Tsaisielentillemd`)

Même boîte que la lentille convergente (le code de `BitBtn1Click` est identique). Différences :

- **Création** : Ajouter › Système optique idéal › Lentille mince divergente, `TForm1.Lentillemincedivergente1Click`, `ray1.pas:6743-6777`. Titre « Ajout d'une lentille divergente: » (`ray1.pas:6769-6770`).
  - Défaut d'origine : l'épaisseur et les couleurs par défaut sont prises dans les réglages de la **lentille convergente** (`epaisseurlmc`, `couleurlmc`, `couleuraxelmc`, `ray1.pas:6763-6768`) et non dans `epaisseurlmd`, `couleurlmd`, `couleuraxelmd`. Les valeurs d'usine sont les mêmes (bleu, 1, fuchsia) ; la différence n'apparaît que si l'utilisateur a changé ses préférences.
- **Modification** : `unit222.pas:19956-20003`. Titre « Propriétés de cette lentille divergente: » (`unit222.pas:19978-19979`).
- Titre interne : « Ajout d'une lentille mince divergente paraxiale ».
- **Illustration** : un trait vertical aux extrémités en V tournées vers l'intérieur ; axe avec foyers.
- Champs, unités et messages : identiques à ceux de la lentille convergente (« Couleur de la lentille », « Couleur de l'axe optique », « Focale (valeur absolue) » › « |f|= », « Aspect » › « Axe optique »). Refus du constructeur : « Données aberrantes ! ».
- Constructeur `lmd.create2` (`unit222.pas:27278-27313`) : mêmes refus que la lentille convergente.
- **Adaptation tablette** : comme pour la lentille convergente ; prendre les réglages par défaut propres à la divergente.

---

#### Lame semi-réfléchissante (`saisielamesr`, classe `Tsaisielsr`)

- **Création** : Ajouter › Système optique idéal › Lame semi réfléchissante, `TForm1.Lamesemirflchissante1Click`, `ray1.pas:6779-6807`. Titre « Ajout d'une lame semi-réfléchissante: » (`ray1.pas:6800-6801`). Maximum : « Nombre maximal de lames deja atteint ! ».
- **Modification** : `unit222.pas:19321-19359`. Titre « Propriétés de cette lame semi-réfléchissante: » (`unit222.pas:19338-19339`).
- Titre interne : « Ajout d'une lame semi-réfléchissante ».
- **Illustration** : un segment en diagonale de 1 à 2, coupé par un axe horizontal et un axe vertical en tirets (rayon transmis et rayon réfléchi).

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (menu) | Modification | Contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Point 1 » › « x= », « y= » | texte ×2 | log1, log2 | vides | `a1x`, `a1y` | nombre et bornes : « Valeur inacceptable pour x1 ! » / « … y1 ! » |
| 2 | « Point 2 » › « x= », « y= » | texte ×2 | log3, log4 | vides | `a2x`, `a2y` | idem : « … x2 ! » / « … y2 ! » |
| 3 | « Couleur à l'écran » | liste de couleurs | — | `couleurlsr` (noir) | `couleur` | — |
| 4 | « Epaisseur trait à l'écran » | nombre à flèches | px | `epaisseurlsr` (1) | `epaisseur` | Min 1, Max 20 |

- Pas de hachures et pas d'axe.
- Ordre des contrôles à OK (`saisielamesr.pas:78-156`) : x1, x2, y1, y2. Refus du constructeur : « Taille du miroir trop petite ! » (`saisielamesr.pas:148`, message du miroir réutilisé).
- Constructeur `lsr.create` (`unit222.pas:25903-25925`) : mêmes refus que le miroir plan.
- **Effet** : la lame est infiniment mince ; le rayon transmis est le « rayon enfant » (aide `lsr.html`).
- Boutons : OK, Annuler, « Supprimer cette lame ».
- **Adaptation tablette** : panneau latéral minimal (deux points, couleur, épaisseur) ; message de refus adapté (« Lame trop petite ») ; application en direct possible, car aucun champ n'est coûteux.

---

#### Écran (`saisieec`, classe `Tsaisieecran`)

- **Création** : Ajouter › Système optique idéal › Ecran, `TForm1.Ecran1Click`, `ray1.pas:7035-7063`. Titre « Ajout d'un écran: » (`ray1.pas:7056-7057`). Maximum : « Nombre maximal d'écrans deja atteint ! ».
- **Modification** : `unit222.pas:19197-19235`. Titre « Propriétés de cet écran: » (`unit222.pas:19214-19215`).
- Titre interne : « Ajout d'un écran ».
- **Illustration** : un segment épais en diagonale de 1 à 2, sans hachures.

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (menu) | Modification | Contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Point 1 » › « x= », « y= » | texte ×2 | log1, log2 | vides | `a1x`, `a1y` | nombre et bornes : « Valeur inacceptable pour x1 ! » / « … y1 ! » |
| 2 | « Point 2 » › « x= », « y= » | texte ×2 | log3, log4 | vides | `a2x`, `a2y` | idem : « … x2 ! » / « … y2 ! » |
| 3 | « Couleur à l'écran » | liste de couleurs | — | `couleurecran` (noir) | `couleur` | — |
| 4 | « Epaisseur trait à l'écran » | nombre à flèches | px | `epaisseurecran` (**2**) | `epaisseur` | Min 1, Max 20 |

- Ordre des contrôles à OK (`saisieec.pas:78-156`) : x1, x2, y1, y2. Refus du constructeur : « Taille du miroir trop petite ! » (`saisieec.pas:148`, message du miroir réutilisé).
- Constructeur `ecran.create` (`unit222.pas:25877-25899`) : mêmes refus que le miroir plan.
- **Effet** : les deux faces sont absorbantes (aide `ecran.html`).
- Boutons : « OK » (sans icône, pas de `Kind`), Annuler, « Supprimer cet écran ».
- **Adaptation tablette** : comme pour la lame ; message de refus « Écran trop petit » ; écrire « Écran » avec la majuscule accentuée (l'original écrit « Ecran »).

---

#### Diaphragme (`saisiedia`, classe `Tsaisiediaphragme`)

- **Création** : Ajouter › Système optique idéal › Diaphragme, `TForm1.Diaphragme1Click`, `ray1.pas:7065-7093`. Titre « Ajout d'un diaphragme: » (`ray1.pas:7086-7087`). Maximum : « Nombre maximal de diaphragmes deja atteint ! ».
- **Modification** : `unit222.pas:19279-19318`. Titre « Propriétés de ce diaphragme: » (`unit222.pas:19296-19297`).
- Titre interne : « Ajout d'un diaphragme » (`saisiedia.pas:179`).
- **Illustration** : une droite oblique passant par C, interrompue autour de C, sur un axe horizontal en tirets ; l'angle t est repéré entre l'axe et la droite.

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (menu) | Modification | Contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Centre C » › « x= » | texte | log1 | vide | `cx` | « Valeur inacceptable pour cx ! » ; [xxmin, xxmax] |
| 2 | « Centre C » › « y= » | texte | log2 | vide | `cy` | « Valeur inacceptable pour cy ! » ; [yymin, yymax] |
| 3 | « Rayon intérieur » › « Rint= » | texte | log3 | vide | `rint` | « Valeur inacceptable pour Rint ! » ; valeur absolue |
| 4 | « Rayon extérieur » › « Rext= » | texte | log4 | vide | `rext` | « Valeur inacceptable pour Rext ! » ; valeur absolue |
| 5 | « Couleur du diaphragme » | liste de couleurs | — | `couleurdiaphragme` (noir) | `couleur` | — |
| 6 | « Angle polaire du diaphragme » › « t= » | texte | rad | vide | `anglepolaire` | « Valeur inacceptable pour t ! » |
| 7 | « Epaisseur du trait » | nombre à flèches | px | `epaisseurdiaphragme` (1) | `epaisseur` | Min 1, **Max 5** |

- Ordre des contrôles à OK (`saisiedia.pas:86-165`) : cx, cy, Rint, Rext, t. Refus du constructeur : « Données aberrantes ! » (`saisiedia.pas:158`).
- Constructeur `diaphragme.create2` (`unit222.pas:2901-2924`). Refus si :
  - un des quatre points C ± Rint·u ou C ± Rext·u, avec u = (cos t, sin t), sort de l'espace de travail ;
  - Rint < `taillemini` (levé par l'option) ;
  - Rint > Rext (toujours contrôlé) ;
  - |Rext − Rint| < `taillemini` (levé par l'option).
- **Effet** : deux segments opaques [C + Rint·u, C + Rext·u] et [C − Rint·u, C − Rext·u] ; l'ouverture, entre les deux bords intérieurs, est dessinée en pointillés (`unit222.pas:2926-2930`).
- Boutons : « OK » (très haut, à droite), Annuler, « Supprimer ce diaphragme ».
- **Adaptation tablette** : panneau latéral ; Rint et Rext avec contrôle immédiat Rint ≤ Rext ; angle saisi en degrés avec conversion en radians (suggestion) ou poignée de rotation sur le canevas ; épaisseur de 1 à 5 en − / + ; écrire « Ouverture (rayon intérieur) » en plus de « Rint ».

---

#### Lentille épaisse (`saisielec`, classe `Tsaisielentille`)

- **Création par le menu** : Ajouter › Système optique réel › Lentille, `TForm1.Lentille1Click`, `ray1.pas:6852-6893`. Titre « Ajout d'une lentille épaisse: » (`ray1.pas:6881-6882`). Maximum : « Nombre maximal de lentilles deja atteint ! ».
- **Création à la souris** : 4 clics, puis la petite boîte du diamètre (section suivante).
- **Modification** : `unit222.pas:19896-19953`. Titre « Propriétés de cette lentille épaisse: » (`unit222.pas:19918-19919`).
- Titre interne : « Ajout d'une lentille épaisse » (`saisielec.pas:255-256`).
- **Illustration** : une lentille biconvexe aux bords coupés, axe horizontal en tirets, S1 à gauche, S2 à droite.
- Disposition d'origine : les trois boutons sont **en haut**, en bandes larges (OK, puis Annuler, puis « Supprimer cette lentille ») à droite de l'image ; les champs viennent dessous.

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut (menu) | Modification | Contrôle à OK |
|---|---|---|---|---|---|---|
| 1 | « Coordonnées des sommets des faces » › « Sommet S1 » « x= » | texte | log1 | vide | `s1x` | « Valeur inacceptable pour S1x ! » (aucune borne) |
| 2 | idem › « Sommet S1 » « y= » | texte | log2 | vide | `s1y` | « Valeur inacceptable pour S1y ! » |
| 3 | idem › « Sommet S2 » « x= » | texte | log3 | vide | `s2x` | « Valeur inacceptable pour S2x ! » |
| 4 | idem › « Sommet S2 » « y= » | texte | log4 | vide | `s2y` | « Valeur inacceptable pour S2y ! » |
| 5 | « Indice de réfraction du verre » › « Pour le rouge: » | texte | — | « 1.5 » (`listenrouge[0]`) | `indicerouge` | « Valeur inacceptable pour indice rouge ! » ; aucune borne (ni n > 0 ni n ≥ 1) |
| 6 | idem › « Pour le vert: » | texte | — | « 1.6 » (`listenvert[0]`) | `indicevert` | « Valeur inacceptable pour indice vert ! » |
| 7 | idem › « Pour le bleu: » | texte | — | « 1.7 » (`listenbleu[0]`) | `indicebleu` | « Valeur inacceptable pour indice bleu ! » |
| 8 | idem › « Matériau: » | liste déroulante fermée (`csDropDownList`) | — | 1er élément « ... » | revient **toujours** à « ... » (`unit222.pas:19899-19900`) | — (voir ci-dessous) |
| 9 | « Rayons de courbure des faces » › 2 lignes d'aide, puis « R1= » | texte | log6 | vide | `r1` | « Valeur inacceptable pour R1 ! » |
| 10 | idem › « R2= » | texte | log7 | vide | `r2` | « Valeur inacceptable pour R2 ! » |
| 11 | « Couleur à l'écran » | liste de couleurs | — | `couleurlec` (cyan, `clAqua`) | `couleurfond` | — |
| 12 | « Diamètre » › « D= » | texte | log5 | vide | `diametre` | « Valeur inacceptable pour le diamètre ! » ; valeur absolue |

- Lignes d'aide du cadre « Rayons de courbure des faces » (`saisielec.pas:375-380`) : « Signe + si centre de courbure Ci à gauche de Si » / « sur l'axe orienté de S1 vers S2, signe - sinon. »
- **Matériau** (`saisielec.pas:232-238`) :
  - Choisir « ... » ne change rien. Tout autre choix remplit les trois indices depuis la liste.
  - La liste est construite au démarrage (`ray1.pas:5554-5581`) : « ... » (n rouge 1,5 ; vert 1,6 ; bleu 1,7), puis le fichier `listen.lst`, quatre lignes par matériau : nom, n bleu, n vert, n rouge. Si le fichier manque : « Fichier des indices de réfraction non trouvé ! ».
  - Contenu actuel de `listen.lst` (18 matériaux) : Verre "BK7", Verre "SF10", Verre "SF8", Verre "FK51", Verre "F2", Verre "SFL6", Silice fondue, Verre au fluorure de calcium, Verre "Zerodur", Eau liquide, Glace d'eau, Diamant, Plexiglass (ou Lucite), Lustrex (ou Dylebe ou Tyron), NAS(R) (copolymere), Lustran (ou Tyril), Lexan (ou Merlon), TPX.
  - Longueurs d'onde de référence : 486,1 nm, 587,6 nm et 656,3 nm (aide `lentille.html`).
  - Modifier un indice à la main ne remet pas la liste sur « ... ».
- `FormCreate` (`saisielec.pas:259-275`) met « 1,5 / 1,6 / 1,7 » ou « 1.5 / 1.6 / 1.7 » selon le séparateur décimal ; `Lentille1Click` les remplace aussitôt par les valeurs de la liste.
- Ordre des contrôles à OK (`saisielec.pas:101-229`) : S1x, S1y, S2x, S2y, R1, R2, n rouge, n vert, n bleu, D. Refus du constructeur : « Type de lentille incompatible avec les valeurs proposées, ou lentille débordant de l'espace de travail ! » (`saisielec.pas:222`).
- **Effet** (`saisielec.pas:217-219`) : `create(S1, S2, R1, R2, D, couleur, couleur d'axe = rouge (clRed) imposée, axe affiché = vrai imposé, n rouge, n bleu, n vert, jamaisreflechi, jamaisreflechi)`. La boîte ne propose ni la couleur de l'axe, ni son affichage, ni les conditions de réflexion.
- **Défaut d'origine en modification** (`unit222.pas:19934-19948`) : l'objet est reconstruit avec les valeurs du nouvel objet. La couleur de l'axe repasse donc à rouge, l'axe redevient affiché et les conditions de réflexion, entrante et sortante, redeviennent « jamais ». Ces réglages ne se règlent nulle part ailleurs dans l'interface ; on ne les retrouve que dans le fichier, `ray1.pas:8929-8935`. L'aide `lentille.html` annonce pourtant ces conditions (« toujours », « jamais », « seulement si le réfracté existe », « seulement si le réfracté n'existe pas ») et des indices par défaut 1,8 / 1,6 / 1,4. Ces indices ne valent que pour la création à la souris.
- Constructeur `lec.create` (`unit222.pas:26344` et suivantes). Refus si :
  - S1 = S2 ;
  - R1 = 0 ou R2 = 0 ;
  - D < `taillemini` (non levé par l'option) ;
  - S1 ou S2 sort de l'espace de travail (seuls les sommets sont contrôlés) ;
  - pour une lentille « à bords minces », D dépasse le diamètre maximal dans certaines configurations de signes (`unit222.pas:26463-26476`).
- Corrections silencieuses du diamètre :
  - à bords épais, si D > 2·min(|R1|, |R2|), D devient 0,999 × 2 × min(|R1|, |R2|) (`unit222.pas:26391-26392`) ;
  - à bords minces, si D ≥ diamètre naturel, les bords ne sont pas tronqués (`unit222.pas:26479-26481`), ce qui revient à ramener D au diamètre naturel.
  - INCERTAIN : la correspondance exacte entre la variable `mince` et les « bords minces » de l'aide.
- Boutons : OK, Annuler, « Supprimer cette lentille ».
- **Adaptation tablette** :
  - panneau latéral en sections repliables : « Sommets S1 et S2 », « Faces (R1, R2) », « Diamètre », « Verre (indices) », « Apparence » ;
  - liste « Matériau » en tête de la section « Verre », qui affiche « Personnalisé » quand un indice est modifié à la main ;
  - schéma du signe de R (centre de courbure à gauche ou à droite de S sur l'axe S1→S2) à côté des champs R1 et R2 ;
  - message qui annonce le diamètre ramené au lieu d'une correction silencieuse ;
  - ajouter, ou au moins conserver, la couleur de l'axe, l'affichage de l'axe et les conditions de réflexion en modification, au lieu de les réinitialiser ;
  - champs `inputmode="decimal"` qui acceptent la virgule.

---

#### Petite boîte « diamètre de la lentille » (`unit12.pas`, classe `Tsaisiediametre`, instance `saisiediametre`)

Elle est définie dans `unit12.pas` / `unit12.lfm` (pas dans un fichier `saisie*`).

- **Ouverture** : seulement à la création d'une lentille épaisse **à la souris**, après le 4e clic : S1, S2, puis C1 et C2 ramenés sur l'axe (`ray1.pas:1652-1709`). La barre d'état affiche « Saisissez le diamètre de la lentille... » (`ray1.pas:1671-1672`). Aucune ouverture en modification.
- **Titre** : « Saissez le diamètre de la lentille » (sic, `unit12.pas:78-79`).
- Pas d'image, pas d'Annuler, pas de bouton de fermeture (`BorderIcons = []`).

| Ordre | Cadre › libellé | Contrôle | Unité | Défaut | Contrôle à OK |
|---|---|---|---|---|---|
| 1 | « Saisissez » › « Diamètre= » | texte (`editdia`) | log1 = `unitelongueur` | vide à la première ouverture ; ensuite, la dernière valeur saisie (rien ne vide le champ) | conversion ; en cas d'échec, message « Ceci n'est pas une valeur numérique acceptable ! », titre « Attention !! », puis `modalresult:=mrcancel` |

- Bouton unique « &OK » (`ModalResult = mrOk`, `Default`).
- `ray1.pas:1680-1681` (`repeat … until showmodal=mrok`) **rouvre la boîte tant que la saisie n'est pas un nombre** : on ne peut pas abandonner la création à ce stade. INCERTAIN : l'effet de la touche Échap (pas de bouton `Cancel`).
- **Effet** (`ray1.pas:1682-1701`) :
  - R1 et R2 sont calculés à partir des clics, avec leur signe ;
  - la lentille est créée avec D tel quel (pas de valeur absolue : un D négatif est refusé par `taillemini`), n rouge 1,4, n bleu 1,8, n vert 1,6, `couleurlec`, `couleuraxelec`, axe affiché, réflexions « jamais » ;
  - refus : « Données aberrantes! » (sans espace) ; sinon `sauvevirtuel`.
- **Adaptation tablette** : pas de fenêtre bloquante. Après le 4e toucher, ouvrir le panneau latéral de la lentille épaisse prérempli (S1, S2, R1, R2), avec le champ Diamètre actif et un clavier `inputmode="decimal"`, plus un bouton « Annuler la lentille » ; corriger le titre (« Saisissez »).

---

#### `saisiech` : la boîte de démarrage « Que voulez vous faire ? » (classe `Tsaisiechoix`)

Ce n'est **pas** une boîte de propriétés d'objet. Elle est décrite ici parce qu'elle était à identifier.

- **Ouverture** :
  - au premier affichage de la fenêtre principale (`TForm1.FormShow`, `ray1.pas:5467` ; appel en `ray1.pas:5510-5518`), sauf si un fichier est passé en ligne de commande ;
  - par Fichier › Nouveau (`TForm1.Nouveau1Click`, `ray1.pas:7411` ; appel en `ray1.pas:7470-7483`), où la 3e option est retirée (`Items.Delete(2)`).
- Titre « Que voulez vous faire ? ».

| Ordre | Libellé | Contrôle | Défaut |
|---|---|---|---|
| 1 | « Voulez vous: » › « Créér une nouvelle simulation » / « Créér une nouvelle simulation en choisissant les dimensions de l'espace de travail » / « Ouvrir une simulation existante » | groupe d'options | 1re option |
| 2 | « Vous pouvez changer les indices du milieu dans lequel s'effectue la simulation: » | texte d'aide | — |
| 3 | « Pour le vert: » | texte | « 1 » |
| 4 | « Pour le rouge: » | texte | « 1 » |
| 5 | « Pour le bleu: » | texte | « 1 » |

- Bouton unique « Suivant > » (`mrOk`).
- Les indices sont lus avec `abs(strtofloat(…))` (`ray1.pas:5521-5538`). Une valeur illisible est remplacée par 1, avec un message dont les arguments sont **inversés** : le texte affiché est « Attention ! » et le titre est « Valeur illégale de l'indice vert par défaut; remplacé par 1 » (de même pour le bleu et le rouge).
- Option 2 : ouvre « Dimensions de l'espace de travail » (`unit11`). Option 3 : ouvre une simulation du dossier d'exemples.
- **Adaptation tablette** : écran d'accueil plein écran à trois grandes cartes (« Nouvelle simulation », « Nouvelle simulation aux dimensions choisies », « Ouvrir une simulation ») ; indices du milieu dans un volet « Réglages avancés » (valeur 1 par défaut, virgule acceptée, message d'erreur dans le bon sens) ; écrire « Créer » et « Que voulez-vous faire ? ».

---

#### Récapitulatif des défauts de l'original à ne pas reproduire

1. Titre « Ajout d'un miroir plan: » pour le réseau créé par le menu (`ray1.pas:5422-5423`).
2. Message « miroirs plans » quand le maximum de miroirs convexes paraxiaux est atteint (`ray1.pas:6668`).
3. Lentille divergente initialisée avec les réglages de la lentille convergente (`ray1.pas:6763-6768`).
4. « Supprimer ce réseau » sans effet juste après une création à la souris (`ray1.pas:1809`). Et, si la boîte se ferme bien après une erreur, recopie sur le réseau précédent (`ray1.pas:1811-1824`).
5. La modification d'une lentille épaisse remet la couleur et l'affichage de l'axe, ainsi que les conditions de réflexion, aux valeurs imposées (`unit222.pas:19934-19948`).
6. Messages « Taille du miroir trop petite ! » pour l'écran et la lame.
7. Contrôles de bornes présents dans certaines boîtes (miroir plan, réseau, écran, lame, miroir concave réel, conique, diaphragme) et absents dans d'autres (paraxiaux, convexe réel, lentilles) : les messages deviennent génériques (« Données aberrantes ! »).
8. Boîte du diamètre impossible à annuler (`ray1.pas:1680-1681`) ; arguments inversés dans les messages de la boîte de démarrage.
9. Fautes d'orthographe de l'original : « Obtu », « Paramétre », « Saissez », « Créér », « Ecran », « Epaisseur » sans accent (à corriger dans la version web : « Obtus », « Paramètre », « Saisissez », « Créer », « Écran », « Épaisseur »).

### 10.B Sources, milieux réfractants, objets divers, options d'affichage

Partie 10.B de la spécification fonctionnelle d’OptGeo 3.03 (J.-M. Biansan, GPL) pour le portage web. Toutes les références `fichier:ligne` renvoient aux fichiers d’origine de `~/src/optgeo-amont/src/` (numéros de ligne de l'original). Le libellé qui fait foi est celui que le `.pas` réaffecte dans `FormCreate` ou dans le gestionnaire d’ouverture ; à défaut, celui du `.lfm`. Les fautes d’orthographe de l’original sont recopiées telles quelles entre guillemets (« fléche », « polyhèdre », « Obtu »…) : la version web peut les corriger, mais la spec les cite à l’identique pour la traçabilité.

Correspondance des unités (le nom de fichier ne dit pas toujours ce que fait la boîte) :

| Boîte | Unité / variable de fiche | Usage |
|---|---|---|
| Rayon | `saisieray` / `saisierayon` | création par menu, modification |
| Source ponctuelle | `saisiesp1` / `saisiespp` | création par menu, modification |
| Onde plane | `saisieop1` / `saisieopp` | création par menu, modification |
| Nombre de rayons | `unit5` / `saisienombrerayons` | création à la souris (source, onde plane) |
| Sphère | `saisiesphere` / `saisiesph` | création par menu, modification |
| Nombre de sommets | `unit8` / `saisienombresommet` | polyèdre et polycercle (menu et souris) |
| Polygone (« polyhèdre ») | `unit6` / `saisiepolyhedre` | création par menu, modification |
| Relier les points | `unit15` / `saisiejoindre` | polycercle à la souris |
| Polycercle | `saisiecercle` / `saisiepolycercle` | création par menu, modification |
| Prisme | `saisiepri` / `saisieprisme` | création par menu, modification |
| Œil | `saisieoe` / `saisieoeil` | création par menu, modification |
| Trait, flèche (coordonnées) | `saisief1` / `saisiefle1` | création par menu, modification (ce n’est **pas** le polyèdre) |
| Trait, flèche (style après tracé) | `saisiefle` / `saisiefleche` | création à la souris |
| Point (style avant clic) | `saisiejolipoint` / `fsaisiejolipoint` | création à la souris |
| Point (propriétés) | `saisiejoli1` / `saisiejoli` | modification seulement |
| Texte (bouton) | `unit9` / `saisietexte` | création à la souris |
| Texte (coordonnées) | `unit10` / `saisietexte2` | création par menu, modification |
| Commentaire de la simulation | `unit32` / `FormEditeur` | fenêtre non modale |
| Rayons fantômes | `saisiefant` / `saisiefantomes` | options |
| Surfaces d’onde (nombre de points) | `saisieptssurfaceonde` / `saisiepointssurfaceonde` | options |
| Options des normales | `saisienor` / `saisienormale` | options |
| Options de la grille | `saisiegr` / `saisiegrille` | options |

---

#### 0. Règles communes à toutes les boîtes

##### 0.1 Ouverture

- **Création par menu** : chaque gestionnaire de `ray1.pas` (1) sort sans rien faire si un mode est en cours (`if modequelquechose then exit`), (2) refuse si le nombre maximal d’objets du type est atteint (message, titre « Attention »), (3) centre la fiche à l’écran, (4) écrit les valeurs par défaut, (5) appelle `showmodal` et, si le résultat est `mrOk`, appelle `sauvevirtuel` (point d’annulation). Le maximum vaut 500 pour chaque type (`unit222.pas:25-34` ; `maxtexte=500`).
- **Modification (bouton « Propriétés »)** : procédure `Info`, `unit222.pas:16875-20504`. Si plusieurs objets sont sous le pointeur, une liste « Propriétés de l’objet: » (`form_quelobjet`) fait choisir (`unit222.pas:18550-18565`). La boîte est remplie avec les valeurs de l’objet et le bouton « Supprimer … » est activé (`boutonsup.enabled:=true`).
- **Mécanisme de remplacement** (identique pour tous les objets, par exemple `unit222.pas:19391-19410` pour le rayon) : le bouton OK de la boîte **crée un nouvel objet en fin de liste** exactement comme en création ; au retour, si la liste s’est allongée, `Info` recopie ce nouvel objet à la place de l’ancien (en rappelant `create` avec ses champs) et supprime le doublon. Si OK échoue à la validation, rien ne change. Conséquence pour le web : « Appliquer » = construire un objet candidat, le valider entièrement, puis remplacer l’objet existant de façon atomique.
- **Bouton « Supprimer … »** : `ModalResult = 7` (`mrNo`). Au retour, `Info` supprime l’objet (`supprime1pXxx`) puis `sauvevirtuel`. **Aucune confirmation** n’est demandée. En création, le bouton est grisé.
- **Bouton « Annuler »** : `Kind = bkCancel`, `ModalResult = 2`, `Cancel = True` (touche Échap). Aucun effet.
- **Bouton « &OK »** : `Kind = bkOK`, `ModalResult = 1`, `Default = True` (touche Entrée).

##### 0.2 Comportement d’OK en cas d’erreur (à ne pas reproduire)

Dans toutes les boîtes, le bouton OK porte `ModalResult = 1` dans le `.lfm` (par exemple `saisieray.lfm:591`). Dans la LCL comme dans la VCL, `TCustomButton.Click` affecte `ModalResult` à la fiche **avant** d’appeler `OnClick` ; le gestionnaire qui détecte une erreur affiche un message puis fait `exit` sans remettre `ModalResult` à `mrNone`. INCERTAIN (non essayé) : la boîte se ferme alors probablement malgré l’erreur, sans créer l’objet, et la saisie est perdue. Seule la boîte de la grille gère ce cas proprement (`modalresult:=mrno` puis boucle `repeat … until showmodal<>mrno`, `ray1.pas:10484-10485`).
**Web** : la boîte reste ouverte, le champ fautif est signalé (bordure + message sous le champ, `aria-invalid`), le focus y est placé. Le texte du message reste celui de l’original.

##### 0.3 Saisie des nombres

- Conversion par `strtofloat` ; le séparateur décimal est forcé à « . » au démarrage (`unit222.pas:40173`, `DefaultFormatSettings.DecimalSeparator:='.'`). Une virgule est donc refusée par l’original (« Valeur inacceptable pour … »). Affichage par `floattostr` (point, jusqu’à 15 chiffres significatifs).
- **Web** : accepter « , » et « . » (remplacer la virgule par un point avant conversion), refuser le vide et tout texte non numérique ; afficher avec la virgule française et sans zéros inutiles ; `inputmode="decimal"` ; ne pas utiliser `type="number"` (il refuse la virgule selon la langue du navigateur).
- Coordonnées : bornées par l’espace de travail `[xxmin ; xxmax] × [yymin ; yymax]` (bornes incluses).
- L’unité affichée à droite de chaque coordonnée (étiquettes `log1`…`log6`) est la chaîne `unitelongueur` de la simulation (« mm » par défaut, `ray1.pas:7366`, `unit222.pas:40251`), réécrite à chaque ouverture.
- `taillemini` (`ray1.pas:5658-5670`) : longueur minimale d’un objet = min(2·(xxmax−xxmin)/largeur_zone_px ; 2·(yymax−yymin)/hauteur_zone_px)/10, soit environ 0,2 pixel écran. Le menu « désactiver le contrôle des points trop proches » (`desactiver_controle_points_trop_proches`, `ray1.pas:6370`) supprime ce contrôle pour certains objets (précisé objet par objet).

##### 0.4 Champs entiers (TSpinEdit)

Sans `MinValue`/`MaxValue`/`Increment` explicites dans le `.lfm`, les valeurs LCL par défaut s’appliquent : min 0, max 100, pas 1. Une valeur hors bornes tapée au clavier est ramenée dans les bornes par le composant. **Web** : `<input inputmode="numeric">` avec boutons − et + d’au moins 44 px, mêmes bornes, valeur ramenée dans les bornes à la sortie du champ.

##### 0.5 Listes de couleurs (TColorBox)

Les champs « Couleur … » de type `TColorBox` (`Colorgrid1`, `ColorGrid1`, `colorgrid1`) n’ont pas de `Style` dans les `.lfm` : style LCL par défaut, c’est-à-dire liste déroulante des couleurs standard, étendues et système, aux noms anglais (INCERTAIN : non vérifié à l’exécution). La couleur choisie est un `TColor` enregistré tel quel.
**Web** : palette fermée de couleurs **nommées en français** (pastille dessinée en CSS + nom écrit, jamais un émoji) couvrant au moins les 16 couleurs standard (noir, bordeaux, vert, olive, bleu marine, violet, sarcelle, gris, argent, rouge, vert clair, jaune, bleu, fuchsia, cyan, blanc) et les couleurs par défaut du logiciel ; une couleur lue dans un fichier et absente de la palette est ajoutée comme « Couleur personnalisée (#RRGGBB) ».

##### 0.6 Couleurs par défaut (préférences)

Valeurs initiales (`unit222.pas:40195-40226`), modifiables dans les préférences (`unit17`, hors de cette partie) : rayon, source ponctuelle, onde plane : rouge, épaisseur 1 ; polyèdre, prisme, polycercle, sphère : `claqua` (cyan) ; trait/flèche : noir, épaisseur 1 ; œil : vert (`clgreen`), épaisseur 1 ; normales : noir, épaisseur 1, longueur 5 %.

##### 0.7 Adaptation tablette commune

Toutes les boîtes deviennent un **panneau latéral non modal** (à droite sur écran large, feuille glissant du bas sur téléphone, hauteur ≤ 90 % de l’écran, défilement interne), qui laisse voir la simulation ; l’objet en cours d’édition est surligné. Boutons « Annuler » et « OK » collés en bas du panneau ; « Supprimer … » séparé, en rouge, avec confirmation (« Supprimer ce rayon ? » / Supprimer / Garder), car l’original supprime sans confirmer. Échap = Annuler, Entrée = OK (sauf dans une zone de texte multiligne). Cibles tactiles ≥ 44 px. Pour chaque couple de coordonnées, un bouton « Pointer sur le dessin » permet de remplir x et y d’un toucher sur la simulation (avec loupe), en plus de la saisie au clavier. Aucune information portée par la seule couleur : chaque couleur est nommée.

---

#### 1. Notions transversales (sémantique exacte)

##### 1.1 Couleur d’un rayon → indice et longueur d’onde

Les boîtes Rayon, Source ponctuelle et Onde plane proposent une liste fermée de quatre couleurs (`saisieray.pas:95-100`, `saisiesp1.pas:116-121`, `saisieop1.pas:115-120`) :

| Choix | Valeur interne | Indice utilisé dans un milieu | Longueur d’onde (réseaux) |
|---|---|---|---|
| Rouge | `clred` | `indicerouge` du milieu | `longueur_donde_red` = 632 nm |
| Vert | `clgreen` | `indicevert` | `longueur_donde_green` = 520 nm |
| Bleu | `clblue` | `indicebleu` | `longueur_donde_blue` = 450 nm |
| Lumière blanche | `clblack` | voir ci-dessous | voir ci-dessous |

Sources : choix de l’indice selon la couleur, `unit222.pas:32104-32108` et suivantes ; longueurs d’onde, `unit222.pas:32089-32091` et valeurs par défaut `unit222.pas:40260-40262` (modifiables dans « Indices du milieu ambiant », `unit_indices_milieu_ambiant.pas:74`).

**Lumière blanche** (`ray1.pas:5211-5232`, idem `unit222.pas:3639-3655` et `unit222.pas:32019-32057` pour sources et ondes) : si la simulation contient au moins un milieu dispersif (un objet dont les trois indices ne sont pas tous égaux : `prisme.dispersif`, `unit222.pas:39453-39456`, liste des objets testés `unit222.pas:3600-3615` : polyèdre, polycercle, sphère, lentille épaisse, prisme) **ou** au moins un réseau, chaque rayon blanc est remplacé au calcul par **trois rayons enfants** rouge, vert et bleu de mêmes origine, direction, épaisseur, `vav`, `vaa`, nombre d’enfants et nombre de segments. Sinon le rayon est calculé une seule fois et tracé en noir. INCERTAIN : dans ce second cas, aucune branche `clblack` n’affecte l’indice de départ (`unit222.pas:32104-32108`) ; le milieu ambiant n’est pas pris en compte dans le test « dispersif ». Recommandation web : pour un rayon blanc non décomposé, utiliser l’indice « vert » ; décomposer aussi si le milieu ambiant est dispersif.

L’aide (`aide/fr/rayon.html`) le dit ainsi : « ce n’est pas simplement la couleur représentée à l’écran, mais aussi la couleur qui détermine l’indice de réfraction pour les milieux réfractants dispersifs ; un rayon de lumière blanche est composé de trois rayons rouge, vert et bleu. »
**Web** : liste de quatre boutons radio avec pastille dessinée + nom ; la pastille de « Lumière blanche » est un dégradé ou trois bandes rouge/vert/bleu, et le rayon blanc non décomposé est tracé en noir comme l’original (le dire dans une info-bulle : « tracé en noir tant qu’aucun milieu dispersif ni réseau n’est présent »).

##### 1.2 Rayons enfants (« Rayons enfants » / « Pour chaque rayon, rayons enfants: »)

- Quand un rayon arrive sur un dioptre et qu’il existe **à la fois** un rayon réfracté et un rayon réfléchi (selon la règle de réflexion du milieu, §1.4), le rayon principal continue par le **réfracté** et le **réfléchi** naît comme rayon **enfant** (`naissance:=true`, `unit222.pas:34037-34045`). S’il n’y a pas de réfracté (réflexion totale) et que la règle autorise la réflexion, le réfléchi est la **suite du même rayon**, pas un enfant (`unit222.pas:34028-34036`).
- Budget : un enfant n’est créé que si `nombrenaissance < nombremaxenfant` (`unit222.pas:36286`). Le k-ième enfant (k = 0, 1, 2…) reçoit lui-même `nombremaxenfant − k − 1` comme maximum d’enfants (`unit222.pas:36291`, `unit222.pas:36304`). L’aide simplifie en « son nombre maximal d’enfants est celui de son rayon parent diminué de 1 » (vrai pour le premier enfant seulement). Valeur 0 : aucun rayon réfléchi partiel n’est tracé.
- Pour une source ou une onde plane, le maximum s’applique **à chacun** des rayons du faisceau.
- Un enfant hérite de la couleur, de l’épaisseur, de `vav`, `vaa` et du nombre maximal de segments du parent (`unit222.pas:36290-36291`).

##### 1.3 Nombre maximal de segments

Le calcul d’un rayon s’arrête quand il a produit `maxsegment` segments (`unit222.pas:32164`, `nombresegment<maxsegment`). Borne 1…500 (`maxmaxsegment=500`, `unit222.pas:29`). Un enfant a le même plafond que son parent (non diminué). Les objets créés à la souris reçoivent 500 (`ray1.pas:1949-1950`, `ray1.pas:2039-2040`, `ray1.pas:2096-2097`).

##### 1.4 Prolongements en pointillé (`vav` « Vers l’avant », `vaa` « Vers l’arrière »)

- Ce sont des **listes de numéros de segments** du trajet calculé, numérotés à partir de 1 dans l’ordre de propagation. Pour chaque segment listé dans `vav`, le programme trace en pointillé (`psdot`) le prolongement **au-delà de son extrémité d’arrivée** jusqu’au bord de l’espace de travail ; pour chaque segment listé dans `vaa`, le prolongement **en arrière de son point de départ** jusqu’au bord (`unit222.pas:31118-31172` pour l’arrière, `31173-…` pour l’avant ; drapeaux `virtuelavant`/`virtuelarriere` du segment, `unit222.pas:36206-36207`). Usage typique : construire une image virtuelle (prolonger vers l’arrière les rayons qui divergent après une lentille).
- **Format exigé** (libellés de la boîte) : « (entre parenthéses et séparés par des virgules » / « et sans espaces); exemple: (1,4,10) ». Analyse (`unit222.pas:27451-27458`) : le numéro i est retenu si la chaîne contient `,i,` ou `(i,` ou `,i)` ou `(i)`. Toute autre forme (espaces, point-virgule, absence de parenthèses, intervalle « 2-5 ») est **ignorée silencieusement**. Chaîne vide = aucun prolongement. Longueur maximale 255 caractères (`shortstring`).
- Numérotation des **enfants** : un enfant né après le n-ième segment du parent continue la numérotation du parent ; son premier segment porte le numéro n+1 (`createenfant`, paramètre `indicesegment`, `unit222.pas:27491-27508`). Une même liste vaut donc pour l’arbre entier du rayon.
- Pour une source ponctuelle ou une onde plane, la même liste s’applique **à chacun** des rayons du faisceau.
- Illustration de l’aide : `aide/fr/segment1.gif` (trajet numéroté) et `segment2.gif` (résultat avec (1,2,4) vers l’avant et (3,4) vers l’arrière).
- **Web** : garder le champ texte (compatibilité des fichiers), accepter aussi « 1, 4, 10 », « 1;4;10 », « 1 4 10 » et les intervalles « 2-5 » en les **normalisant** vers la forme d’origine `(1,4,10)` à l’enregistrement ; message d’erreur si un élément n’est pas un entier de 1 à 500. Proposer en plus une aide visuelle : bouton « Afficher les numéros des segments » (le tracé montre les numéros) et cases à cocher par segment.

##### 1.5 Réflexion partielle sur un milieu (« Rayon réfléchi (sens entrant) » / « (sens sortant) »)

Chaque milieu réfractant (sphère, polygone, polycercle, prisme ; lentille épaisse hors de cette partie) porte deux règles `ReflechiEntrant` et `ReflechiSortant` de type `TReflechiPolyhedre = (JamaisReflechi, ToujoursReflechi, ReflechiSiRefracte, ReflechiSiPasRefracte)` (`unit222.pas:48-49`).

| Bouton radio (index) | Valeur | Rayon réfléchi tracé quand |
|---|---|---|
| « Toujours » (0) | `ToujoursReflechi` | toujours |
| « Jamais » (1) | `JamaisReflechi` | jamais |
| « Seulement si le réfracté existe » (2) | `ReflechiSiRefracte` | il y a aussi un réfracté (le réfléchi est alors un enfant) |
| « Seulement si le réfracté n’existe pas » (3) | `ReflechiSiPasRefracte` | réflexion totale seulement |

- **Sens entrant** : le rayon arrive de l’extérieur sur le dioptre (produit scalaire direction × normale sortante < 0) ; **sens sortant** : le rayon est dans le milieu et va en sortir (> 0) (`unit222.pas:34017-34021` et `34050-34054` pour la sphère ; même logique pour les autres objets, par exemple `unit222.pas:35281`).
- S’il n’y a pas de réfracté (angle limite dépassé) et que la règle n’autorise pas la réflexion (« Jamais » ou « Seulement si le réfracté existe »), le rayon **s’arrête** sur le dioptre (`surfaceabsorbanteatteinte:=true`, `unit222.pas:33888`).
- Défaut en création par menu et à la souris : « Jamais » / « Jamais » (`ray1.pas:7120-7121`, `ray1.pas:1723`). Attention pédagogique : avec « Jamais » en sens sortant, la réflexion totale interne n’est pas tracée (le rayon s’arrête). L’aide (`polyhedre.html`) : « le rayon réfléchi peut exister "toujours", "jamais", "seulement si le réfracté existe", "seulement si le réfracté n'existe pas". Lorsqu'il y a à la fois un rayon transmis et un rayon réfléchi, le rayon réfléchi est un "rayon enfant" ».
- Aucune intensité n’est calculée : « réflexion partielle » signifie seulement « un rayon réfléchi est tracé en plus du réfracté ».
- **Web** : deux groupes de quatre boutons radio, avec une phrase d’aide sous chacun (« Sens entrant : le rayon arrive de l’extérieur » / « Sens sortant : le rayon est à l’intérieur et va sortir ») et une remarque sous « Jamais » en sens sortant : « la réflexion totale ne sera pas tracée ».

##### 1.6 Indices de réfraction et liste des matériaux

- Trois champs texte « Pour le rouge: », « Pour le vert: », « Pour le bleu: » dans le groupe « Indice de réfraction du milieu ». Aucune borne vérifiée par la boîte (un indice négatif ou nul est accepté ; INCERTAIN sur l’effet). **Web** : refuser ≤ 0, avertir (sans bloquer) hors de [1 ; 3].
- Liste « Matériau: » (`combomateriaux`, `TComboBox`, `Style = csDropDownList`) : premier élément « ... » (= saisie libre, ne change rien, `saisiesphere.pas:178`), puis les matériaux du fichier `listen.lst` lu au démarrage (`ray1.pas:5554-5581`) ; fichier absent → message « Fichier des indices de réfraction non trouvé ! » (titre « Attention ») et liste réduite à « ... ». Choisir un matériau **remplace** les trois indices (`combomateriauxChange`, par exemple `saisiesphere.pas:176-182`). La liste revient toujours sur « ... » à l’ouverture.
- Format de `listen.lst` (aide `Materiaux.html`) : 4 lignes par matériau — nom, indice à 486,1 nm, à 587,6 nm, à 656,3 nm, point décimal. Le programme lit ces trois valeurs comme **bleu, vert, rouge** dans cet ordre (`ray1.pas:5574-5579`). Remarque : ces longueurs d’onde (raies F, d, C) diffèrent de celles des rayons (450, 520, 632 nm, §1.1) ; à signaler dans l’aide web.
- Contenu livré (`src/listen.lst`, à embarquer tel quel) :

| Matériau | n bleu (486,1 nm) | n vert (587,6 nm) | n rouge (656,3 nm) |
|---|---|---|---|
| Verre "BK7" | 1.52238 | 1.51680 | 1.51432 |
| Verre "SF10" | 1.746 | 1.728 | 1.721 |
| Verre "SF8" | 1.705 | 1.689 | 1.683 |
| Verre "FK51" | 1.49056 | 1.48656 | 1.48480 |
| Verre "F2" | 1.63208 | 1.62004 | 1.61503 |
| Verre "SFL6" | 1.82780 | 1.80518 | 1.79690 |
| Silice fondue | 1.4630 | 1.4584 | 1.4565 |
| Verre au fluorure de calcium | 1.437 | 1.434 | 1.432 |
| Verre "Zerodur" | 1.549 | 1.542 | 1.539 |
| Eau liquide | 1.34009 | 1.33580 | 1.32986 |
| Glace d'eau | 1.31505 | 1.31100 | 1.30712 |
| Diamant | 2.44256 | 2.42600 | 2.41336 |
| Plexiglass (ou Lucite) | 1.498 | 1.492 | 1.489 |
| Lustrex (ou Dylebe ou Tyron) | 1.604 | 1.590 | 1.585 |
| NAS(R) (copolymere) | 1.575 | 1.567 | 1.558 |
| Lustran (ou Tyril) | 1.578 | 1.571 | 1.563 |
| Lexan (ou Merlon) | 1.599 | 1.585 | 1.580 |
| TPX | 1.473 | 1.467 | 1.464 |

- Indices par défaut : **par menu** rouge 1,5 ; vert 1,6 ; bleu 1,7 (`ray1.pas:7114-7116`, `ray1.pas:5455-5457`, `ray1.pas:7170-7172` ; pour le polygone, valeurs `listenrouge/vert/bleu.strings[0]` = mêmes 1,5/1,6/1,7, `ray1.pas:5558-5561`, `ray1.pas:7221-7223`). **À la souris** rouge 1,4 ; vert 1,6 ; bleu 1,8 (`ray1.pas:1302`, `1375`, `1488`, `1723`, `2857` ; ordre des paramètres rouge, bleu, vert). L’aide annonce « 1,8, 1,6 et 1,4 » (bleu, vert, rouge) : elle décrit le chemin souris. **Web** : un seul jeu de défauts pour les deux chemins (proposition : 1,4 / 1,6 / 1,8 comme la souris et l’aide), à faire valider.
- **Web** : la liste des matériaux est un `<select>` dont le premier choix s’appelle « Saisie libre » (au lieu de « ... ») ; quand l’utilisateur modifie un indice à la main après avoir choisi un matériau, la liste revient à « Saisie libre ».

##### 1.7 Surfaces d’onde et chemins optiques (`listechemins`)

- Champ texte « Donner les valeurs de chemins optiques pour lesquels vous voulez que soient tracées des surfaces » / « d'onde (séparez ces valeurs par un unique espace; ne mettez ni parenthèses ni virgule de séparation) » / « (exemple: 120 145  276) », case « Tracer ».
- Analyse (`unit222.pas:27545-27568`) : valeurs séparées par **un seul** espace ; l’analyse s’arrête à la première valeur illisible, sans message. Défauts de l’original : l’exemple affiché « 120 145  276 » contient deux espaces, si bien que seules 120 et 145 sont retenues ; une espace finale fait boucler l’analyse (INCERTAIN : boucle probable jusqu’au dépassement du tableau de 500 valeurs). **Web** : accepter tout séparateur blanc, la virgule décimale (puisque le séparateur de liste est l’espace, « 120,5 » est lu 120,5), ignorer les blancs en tête et en fin, et signaler toute valeur illisible.
- Unité : longueur de l’espace de travail (`unitelongueur`) × indice ; chemin optique compté **depuis la source S** (source ponctuelle) ou **depuis le plan 1-2** (onde plane, « Le plan 1-2, perpendiculaire aux rayons lumineux, est supposé être un plan d'onde, et constitue l'origine pour le calcul du chemin optique », `op.html`).
- Tracé (`ray1.pas:5312-5383` et `6127-6200`) : seulement si la simulation ne contient **aucune** lentille mince (convergente ou divergente) ni miroir sphérique paraxial (`nombrelmc+nombrelmd+nombremscopa+nombremscepa=0`) et, pour une source, si elle est **réelle**. Pour chaque valeur, le programme lance `maxrayonsrecherchesurfacesonde` rayons auxiliaires (défaut 20, boîte §2.20) répartis comme le faisceau, sans enfants ni prolongements, et relie les points où le chemin optique atteint la valeur par une ligne pointillée d’épaisseur 1 de la couleur de la source.
- Libellés d’avertissement de la boîte : « Remarque: si la simulation comprend au moins une lentille mince et/ou un miroir paraxial, le tracé  des ces surfaces » / « ne peut être et ne sera pas fait. ».

##### 1.8 Numérotation des segments pour les « fantômes »

Les numéros utilisés par la boîte « Rayons fantomes » (§2.19) sont des numéros **globaux** (index dans la liste de tous les segments calculés de la simulation, de 1 à 10 000 = `maxtotalsegment`), différents de la numérotation par rayon de `vav`/`vaa`. Pendant que la boîte est ouverte, chaque segment affiche son numéro en son milieu (police « Arial Narrow », 10 pt, noir ; `unit222.pas:31094-31104`). Ces numéros changent dès que la simulation change.

---

#### 2. Les boîtes

Dans les tableaux, « défaut création » est la valeur écrite par le gestionnaire de menu ; « (conservé) » signifie que le gestionnaire ne touche pas au champ, qui garde la valeur de la dernière utilisation de la boîte (valeur du `.lfm` à la première ouverture). **Web** : ne pas reproduire cette mémoire implicite ; utiliser les défauts indiqués en gras.

##### 2.1 Rayon unique (`saisieray`)

**Ouverture**
- Création : menu « Rayon unique » (`ray1.pas:4633`), `RayonUnique1Click`, `ray1.pas:6590-6620`. Titre « Ajout d'un rayon: » (`ray1.pas:6614-6615`). Message si plein : « Nombre maximal de rayons deja atteint ! » (`ray1.pas:6593`).
- Modification : `Info`, `unit222.pas:19361-19410`, titre « Propriétés de ce rayon: » (`unit222.pas:19385-19386`).
- Titre de fiche par défaut (jamais visible en pratique) : « Saisie d'un rayon » (`saisieray.pas:191-192`).
- Création à la souris (bouton de la barre) : sans boîte ; couleur et épaisseur des préférences, `vav`/`vaa` vides, 10 enfants, 500 segments (`ray1.pas:1945-1955`) ; refus : « Points trop proches ! ».

**Image d’illustration** (`saisieray.lfm:15-193`, bitmap 100×100, 16 couleurs) : un segment épais de 1 (point rond en bas à gauche) à 2 (point rond en haut à droite), une flèche d’empennage au milieu. Web : SVG équivalent, texte alternatif « Rayon défini par son origine 1 et un point 2 de sa direction ».

**Champs** (ordre du `.lfm`)

| # | Libellé exact | Contrôle | Unité | Défaut création | Bornes | Modification |
|---|---|---|---|---|---|---|
| 1 | Groupe « Origine (point 1) » : « x= » | texte | `unitelongueur` | vide | [xxmin ; xxmax] | `ax` |
| 2 | « y= » | texte | idem | vide | [yymin ; yymax] | `ay` |
| 3 | Groupe « Extrémité (point 2) » : « x= » | texte | idem | vide | [xxmin ; xxmax] | `bx` |
| 4 | « y= » | texte | idem | vide | [yymin ; yymax] | `by` |
| 5 | « Couleur du rayon » : « Rouge », « Vert », « Bleu », « Lumière blanche » | 4 boutons radio | — | Rouge (`ray1.pas:6612`) | — | selon `couleur` |
| 6 | « Epaisseur à l'écran » | entier (spin) | pixels | `epaisseurrayon` (préférence, 1) | 1…20 | `epaisseur` |
| 7 | Groupe « Tracer en pointillé le prolongement des différents segments du rayon » ; textes « Liste des segments concernés », « (entre parenthéses et séparés par des virgules », « et sans espaces); exemple: (1,4,10) » ; « Vers l'avant: » | texte | — | vide | §1.4 | `vav` |
| 8 | « Vers l'arrière: » | texte | — | vide | §1.4 | `vaa` |
| 9 | Groupe « Rayons enfants » : « Nombre maximal: » | entier | — | 10 | 0…50 (min LCL par défaut) | `nombremaxenfant` |
| 10 | Groupe « Nombre max. de segments » : « Nombre maximal: » | entier | — | (conservé ; 500 au départ) — **web : 500** | 1…500 | `maxsegment` |

Boutons : « Supprimer ce rayon » (grisé en création), « Annuler », « &OK ».

**Contrôles à OK** (`saisieray.pas:92-172`), dans cet ordre : x1, x2, y1, y2 ; pour chacun, conversion puis bornes ; message identique dans les deux cas : « Valeur inacceptable pour x1 ! », « … pour x2 ! », « … pour y1 ! », « … pour y2 ! » (titre « Attention ! »). Puis `rayon.create` (`unit222.pas:27441-27477`) refuse si les deux points sont confondus, si leur distance est inférieure à `taillemini`, ou si un point sort de l’espace de travail : message « Les deux points doivent être distincts ! » (`saisieray.pas:166`).

**Effet** : le rayon part de 1 dans la direction 1→2 ; le point 2 ne limite pas le rayon (il ne sert qu’à la direction ; le calcul continue jusqu’au bord, à un objet absorbant ou au plafond de segments).

**Adaptation tablette** : panneau latéral ; les deux points se placent aussi en touchant le dessin ; boutons radio de couleur avec pastille + nom ; groupes « Rayons enfants », « Nombre max. de segments » et « Prolongements en pointillé » repliés sous « Options avancées » (ouverts si une valeur diffère du défaut) ; `inputmode="decimal"` sur les coordonnées.

##### 2.2 Source ponctuelle réelle ou virtuelle (`saisiesp1`)

**Ouverture**
- Création : menu « Objet ponctuel réel ou virtuel » (`ray1.pas:4653`), `Sourceponctuelle1Click`, `ray1.pas:7244-7282`. Titre « Ajout d'une source ponctuelle: ». Message si plein : « Nombre maximal de source ponctuelle deja atteint ! ».
- Modification : `unit222.pas:19413-19484`, titre « Propriétés de cette source ponctuelle: ».
- Titre par défaut : « Saisie d'une source ponctuelle » (`saisiesp1.pas:239-240`).
- Création à la souris : boutons « source réelle » (`boutonsourceponctuelleClick`, `ray1.pas:6558`) et « objet ponctuel virtuel » (`boutonspvClick`, `ray1.pas:6542-6556`) ; trois clics S, 1, 2 puis boîte « Nombre de rayons » (§2.4) ; valeurs fixes : couleur et épaisseur des préférences, `vav`/`vaa` vides, 10 enfants, pas de surfaces d’onde, 500 segments (`ray1.pas:2096-2097`).

**Image** (`saisiesp1.lfm:15-193`) : faisceau de rayons issus de S, le rayon extrême bas vers 1 et le rayon extrême haut vers 2. Texte alternatif : « Faisceau issu de S, entre la direction S-1 et la direction S-2 ».

**Champs**

| # | Libellé exact | Contrôle | Unité | Défaut création | Bornes | Modification |
|---|---|---|---|---|---|---|
| 1 | Groupe « Source » : « x= » | texte | `unitelongueur` | vide | [xxmin ; xxmax] | `sx` |
| 2 | « y= » | texte | idem | vide | [yymin ; yymax] | `sy` |
| 3 | Groupe « Point 1 » : « x= », « y= » | 2 textes | idem | vides | espace de travail | `a1x`, `a1y` |
| 4 | Groupe « Point 2 » : « x= », « y= » | 2 textes | idem | vides | espace de travail | `a2x`, `a2y` |
| 5 | « Couleur de la source » : Rouge, Vert, Bleu, Lumière blanche | radio | — | Rouge | — | couleur du rayon 1 |
| 6 | « Epaisseur à l'écran » | entier | pixels | `epaisseursourceponctuelle` (1) | 1…20 | `epaisseur` |
| 7 | « Tracer en pointillé le prolongement des différents segments des rayons » : « Vers l'avant: », « Vers l'arrière: » (+ mêmes 3 textes d’aide) | 2 textes | — | vides | §1.4 | `vav`, `vaa` |
| 8 | « Nombre de rayons » | entier | — | 5 | 2…500 | `nombrederayon` |
| 9 | « Pour chaque rayon, rayons enfants: » : « Nombre maximal: » | entier | — | 10 | 0…50 | `maxenfantparrayon` |
| 10 | « Type de source » : « Réelle », « Virtuelle » | radio | — | Réelle | — | `sourcevirtuelle` |
| 11 | « Tracer des surfaces d'onde issues de cette source ponctuelle » : case « Tracer » | case | — | décochée | — | `tracersurfacesonde` |
| 12 | même groupe : liste des chemins optiques (5 lignes d’aide, §1.7) | texte | longueur optique | vide | §1.7 | `listechemins` |
| 13 | « Nombre max. de segment par rayon » : « Nombre maximal: » | entier | — | (conservé) — **web : 500** | 1…500 | `maxsegment` |

Libellés `x=`, `y=`, unités `log1/log2` (source), `log3/log4` (point 1), `log5/log6` (point 2) (`saisiesp1.lfm:194-570`). Les libellés « Réelle »/« Virtuelle » ne viennent que du `.lfm` (`saisiesp1.lfm:701-704`).

**Dépendance** : `radiovirtuelleClick` (`saisiesp1.pas:432-445`) grise la case « Tracer » et la liste des chemins quand « Virtuelle » est choisi, les réactive pour « Réelle ». En modification d’une source virtuelle, ces deux champs sont grisés (`unit222.pas:19453-19457`). INCERTAIN : l’original ne les réactive pas explicitement en ouvrant ensuite une source réelle (selon que la LCL déclenche ou non `OnClick` à l’affectation de `ItemIndex`). **Web** : actifs si et seulement si « Réelle ».

**Contrôles à OK** (`saisiesp1.pas:110-222`) : sx, sy, x1, x2, y1, y2 (conversion et bornes) ; messages « Valeur inacceptable pour sx ! », « … sy ! », « … x1 ! », « … x2 ! », « … y1 ! », « … y2 ! ». Puis `SourcePonctuelle.create` (`unit222.pas:27527-27659`) ; en cas de refus : « Valeurs entrées aberrantes ! ». Refus si : un point hors de l’espace de travail ; nombre de rayons ≤ 1 ou > 500 ; un des rayons ne peut être créé (longueur < `taillemini`, ou origine/extrémité hors de l’espace de travail — pour une source virtuelle, les origines des rayons intermédiaires, situées à la distance `rra` de S, doivent être dans l’espace de travail).

**Géométrie (sémantique)**
- **Réelle** : tous les rayons partent de S. Le rayon 1 vise le point 1, le dernier vise le point 2, les autres sont répartis à **angles égaux** en tournant dans le **sens trigonométrique direct** de la direction S→1 à la direction S→2 (`unit222.pas:27580-27617`) ; l’ordre de 1 et 2 compte (« les rayons sont émis entre S-1 et S-2 dans le sens trigo direct », `sponct.html`). Le faisceau peut donc dépasser 180° si 2 est « à droite » de 1.
- **Virtuelle** : les rayons **convergent vers S** sans l’atteindre comme origine : le rayon 1 part du point 1 vers S, le dernier part du point 2 vers S, les intermédiaires partent de points situés à la distance rra = min(S1, S2) de S, répartis angulairement de la même façon (`unit222.pas:27620-27657`). S est l’objet virtuel.
- Repère : y vers le haut (`monbitmap.pas`, `invconvert` : `yi = (ymax − y)…`), donc « trigo direct » = sens inverse des aiguilles d’une montre à l’écran.

**Adaptation tablette** : panneau latéral avec aperçu en direct du faisceau ; S, 1, 2 plaçables au doigt ; choix Réelle/Virtuelle en premier (il conditionne le reste) ; surfaces d’onde dans « Options avancées », grisées avec une explication si la source est virtuelle ou si la simulation contient une lentille mince ou un miroir paraxial.

##### 2.3 Onde plane (`saisieop1`)

**Ouverture**
- Création : menu « Onde plane (faisceau parallèle) » (`ray1.pas:4593`), `Ondeplane1Click`, `ray1.pas:7284-7321`. Titre « Ajout d'une cette onde plane: » (sic, `ray1.pas:7313-7314`). Message si plein : « Nombre maximal d'onde plane deja atteint ! ».
- Modification : `unit222.pas:19486-19548`, titre « Propriétés de cette onde plane: ».
- Titre par défaut : « Saisie d'une onde plane ».
- Création à la souris (`boutonondeplaneClick`, `ray1.pas:6574-6588`) : clics 1, D, 2 puis boîte « Nombre de rayons » (§2.4) ; refus « Points trop proches ! » (`ray1.pas:2013-2019`, `2041-2044`).

**Image** (`saisieop1.lfm:15-189`) : trois rayons horizontaux parallèles, le plus bas part de 1 et se termine en D, le plus haut part de 2. Texte alternatif : « Faisceau parallèle : plan d’onde 1-2, direction 1→D ».

**Champs**

| # | Libellé exact | Contrôle | Unité | Défaut création | Bornes | Modification |
|---|---|---|---|---|---|---|
| 1 | Groupe « Point 1 » : « x= », « y= » | 2 textes | `unitelongueur` | vides | espace de travail | `a1x`, `a1y` |
| 2 | Groupe « Point 2 » : « x= », « y= » | 2 textes | idem | vides | idem | `a2x`, `a2y` (corrigés, voir ci-dessous) |
| 3 | « Couleur des rayons » : Rouge, Vert, Bleu, Lumière blanche | radio | — | Rouge | — | couleur du rayon 1 |
| 4 | « Epaisseur à l'écran » | entier | pixels | `epaisseurondeplane` (1) | 1…20 | épaisseur du rayon 1 |
| 5 | « Tracer en pointillé le prolongement des différents segments des rayons » : « Vers l'avant: », « Vers l'arrière: » | 2 textes | — | vides | §1.4 | `vav`, `vaa` |
| 6 | Groupe « Extrémité rayon 1 (point D) » : « x= », « y= » | 2 textes (`editsx`, `editsy`) | idem | vides | espace de travail | `sx`, `sy` |
| 7 | « Nombre de rayons » | entier | — | 5 | 2…500 | `nombrederayon` |
| 8 | « Pour chaque rayon, rayons enfants: » : « Nombre maximal: » | entier | — | 10 | 0…50 | `maxenfantparrayon` |
| 9 | « Tracer des surfaces d'onde issues de cette onde plane » : case « Tracer » + liste (§1.7) | case + texte | — | décochée, vide | §1.7 | `tracersurfacesonde`, `listechemins` |
| 10 | « Nombre max. de segments par rayon » : « Nombre maximal: » | entier | — | (conservé) — **web : 500** | 1…500 | `maxsegment` |

**Contrôles à OK** (`saisieop1.pas:109-219`) : D (Dx, Dy), puis x1, x2, y1, y2 ; messages « Valeur inacceptable pour Dx ! », « … Dy ! », « … x1 ! », etc. Puis `OndePlane.create` (`unit222.pas:27661-27747`), refus → « Valeurs entrées aberrantes ! » si : D confondu avec 1 ; un point (1, 2 corrigé, D, ou 2 + (D − 1)) hors de l’espace de travail ; nombre de rayons ≤ 1 ou > 500 ; rayon 1 ou dernier rayon non créable.

**Géométrie** : la direction commune est 1→D ; le rayon 1 va de 1 à D. **Le point 2 est ramené** sur la perpendiculaire à (1D) passant par 1, à la même distance |1-2| et du même côté que le point saisi (`unit222.pas:27705-27711`) ; la boîte affiche ensuite, en modification, ce point corrigé. Les rayons partent de points régulièrement espacés sur le segment 1-2 (`unit222.pas:27744-27746`).

**Adaptation tablette** : comme la source ; après saisie, afficher le point 2 corrigé sur le dessin et dans les champs, avec la mention « Point 2 ramené sur la perpendiculaire à 1D ».

##### 2.4 Nombre de rayons (`unit5`)

- Titre « Nombre de rayons » (`unit5.pas:62-63`). Ouverte seulement à la souris, après le troisième clic d’une source ponctuelle (`ray1.pas:2080-2091`) ou d’une onde plane (`ray1.pas:2022-2037`).
- Texte : « Nombre de rayons convergents vers cet objet virtuel » (source virtuelle) ou « Nombre de rayons émis par cette source ponctuelle » (source réelle) (`ray1.pas:2086-2089`) ; pour l’onde plane le texte n’est pas réécrit (il reste celui de la dernière ouverture, « Nombre de rayons émis par cette source ponctuelle: » au départ, `unit5.pas:64`). **Web** : « Nombre de rayons du faisceau parallèle » pour l’onde plane.
- Champ unique : entier, défaut 5 (conservé ensuite), bornes **2…50** (`unit5.lfm:35-39`) — alors que la boîte complète accepte jusqu’à 500.
- Bouton unique « &OK » ; ni Annuler ni fermeture (`BorderIcons = []`) : on ne peut pas abandonner à ce stade. **Web** : ajouter « Annuler » (abandonne la création en cours).
- Effet : `nbsaisie` (`unit5.pas:55-58`), transmis au `create`.
- **Adaptation tablette** : petit panneau ou fenêtre contextuelle près du dernier point touché, stepper −/+ et champ numérique.

##### 2.5 Sphère réfractante (`saisiesphere`)

**Ouverture**
- Création : menu « Sphère réfractante » (`ray1.pas:4669`), `Sphrerfractante1Click`, `ray1.pas:7095-7125`. Le titre n’est pas changé : « Propriétés de cette sphère » (`saisiesphere.pas:199-200`) en création comme en modification. Message si plein : « Nombre maximal de spheres deja atteint ! ».
- Modification : `unit222.pas:18820-18876`.
- Souris : clic au centre puis clic au bord ; indices 1,4/1,6/1,8, couleur des préférences, « Jamais »/« Jamais » ; refus « Rayon de la sphère trop petit ou trop grand! » (`ray1.pas:1720-1727`).

**Champs**

| # | Libellé exact | Contrôle | Unité | Défaut création | Bornes / contrôle | Modification |
|---|---|---|---|---|---|---|
| 1 | « Rayon réfléchi (sens sortant) » : 4 choix (§1.5) | radio | — | Jamais | — | `ReflechiSortant` |
| 2 | « Rayon réfléchi (sens entrant) » : 4 choix | radio | — | Jamais | — | `ReflechiEntrant` |
| 3 | « Indice de réfraction du milieu » : « Matériau: » | liste | — | « ... » | §1.6 | toujours « ... » |
| 4 | « Pour le rouge: » | texte | — | 1,5 | nombre | `indicerouge` |
| 5 | « Pour le vert: » | texte | — | 1,6 | nombre | `indicevert` |
| 6 | « Pour le bleu: » | texte | — | 1,7 | nombre | `indicebleu` |
| 7 | « Coordonnées du centre » : « x= », « y= » | 2 textes | `unitelongueur` | (conservés) — **web : vides** | voir create | `cx`, `cy` |
| 8 | « Rayon de courbure » : « R= » | texte | idem | (conservé) — **web : vide** | valeur absolue prise | `rayon` |
| 9 | « Couleur à l'écran » | liste de couleurs | — | `couleursphere` (cyan) | — | `couleurfond` |

Boutons « Supprimer cette sphère », « Annuler », « &OK ». Pas d’image.

**Contrôles à OK** (`saisiesphere.pas:85-174`) : R (« Valeur inacceptable pour le rayon ! »), x (« Valeur inacceptable pour x ! »), y (« … pour y ! »), indices (« Valeur inacceptable pour indice rouge ! », « … indice vert ! », « … indice bleu ! »). R est remplacé par sa valeur absolue (`saisiesphere.pas:95`). Les coordonnées ne sont pas bornées par la boîte. `sphere.create` (`unit222.pas:40016-40034`) refuse si le disque touche ou dépasse un bord (cx ± R, cy ± R hors de l’intervalle **ouvert** de l’espace de travail) → « Points aberrants ! ». R = 0 est accepté (INCERTAIN : effet) — **web : refuser R < taillemini** avec « Valeur inacceptable pour le rayon ! ».

Le bord est toujours tracé en noir (`clblack` passé comme `couleurbord`, `saisiesphere.pas:164`) ; la couleur choisie est celle du fond.

**Adaptation tablette** : centre au doigt, rayon par glissé ou saisie ; matériau en premier (il remplit les indices) ; les deux règles de réflexion côte à côte sur tablette, l’une sous l’autre sur téléphone.

##### 2.6 Nombre de sommets (`unit8`)

- Titre « Nombre de sommets » (`unit8.pas:64`). Groupe : « Sommets de ce polyhèdre » (polygone, `ray1.pas:7211`, `ray1.pas:6425`) ou « Sommets de cette polysphére » (menu polycercle, `ray1.pas:7138`) / « Sommets de cette polysphère » (souris, `ray1.pas:10596`). Libellé « Nombre: ».
- Champ entier : défaut 4 (conservé ensuite) ; min **3** pour le polygone (`ray1.pas:7210`, `6426`), **2** pour le polycercle (`ray1.pas:7143`, `10594`) ; max 500 (`unit8.pas:68`, `maxsommet`).
- Bouton unique « &OK » (`nbpoly`, `unit8.pas:56-59`) ; pas d’Annuler ni de fermeture (le test `=mrcancel` de `ray1.pas:6428` est donc inopérant). **Web** : ajouter « Annuler ».
- Ouverte par : `Polyhdrerfractant1Click` (`ray1.pas:7205-7213`), `Polysphrerfractante1Click` (`ray1.pas:7138-7145`), `boutonpolyClick` (`ray1.pas:6420-6433`), `boutonpolycercleClick` (`ray1.pas:10590-10600`).
- **Adaptation tablette** : stepper −/+ ; à la souris/au doigt, proposer aussi « Terminer le polygone » en touchant le premier sommet (sans changer le format des données).

##### 2.7 Polygone réfractant, « polyhèdre » (`unit6`)

**Ouverture**
- Création : menu « Polyhèdre réfractant » (`ray1.pas:4609`), `Polyhdrerfractant1Click`, `ray1.pas:7197-7242` : boîte §2.6, puis tous les sommets mis à (0 ; 0), liste « Sommet 1 »… « Sommet n », champs du sommet 1. Titre non changé : « Propriétés de ce polygône » (`unit6.pas` FormCreate). Message si plein : « Nombre maximal de polyhedres deja atteint ! ».
- Modification : `unit222.pas:18878-18946` (`oldindex:=0`, `unit222.pas:18918`).
- Souris : n clics ; indices 1,4/1,6/1,8 ; « Jamais »/« Jamais » (`ray1.pas:1302-1303`) ; refus « Points saisis aberrants ! ».

**Champs**

| # | Libellé exact | Contrôle | Défaut création | Modification |
|---|---|---|---|---|
| 1 | « Rayon réfléchi (sens sortant) » | radio 4 choix | Jamais | `ReflechiSortant` |
| 2 | « Rayon réfléchi (sens entrant) » | radio 4 choix | Jamais | `ReflechiEntrant` |
| 3 | « Indice de réfraction du milieu » : « Matériau: », « Pour le rouge: », « Pour le vert: », « Pour le bleu: » | liste + 3 textes | « ... », 1,5 / 1,6 / 1,7 | indices de l’objet |
| 4 | Liste des sommets (`ComboBox1`, « Sommet 1 »… « Sommet n ») | liste déroulante | « Sommet 1 » | idem |
| 5 | « Coordonnées de ce sommet » : « x= », « y= » (+ unité) | 2 textes | 0 et 0 | sommet 1 |
| 6 | « Couleur à l'écran » | couleurs | `couleurpolyhedre` (cyan) | `couleurfond` |

Boutons « Supprimer ce polygône », « Annuler », « &OK ».

**Édition sommet par sommet** (`ComboBox1Change`, `unit6.pas:165-193`) : changer de sommet enregistre d’abord x et y du sommet précédent (message « Valeur inacceptable pour x ! » / « … pour y ! » et retour au sommet précédent si illisible), puis affiche le nouveau. À OK, le sommet affiché est enregistré de la même façon.

**Contrôles à OK** (`unit6.pas:81-163`) : x, y du sommet courant, indices (messages du §2.5) ; puis `Polyhedre.create` (`unit222.pas:39585-39700`) refuse → « Points aberrants ! » si : moins de 3 ou plus de 500 sommets ; un sommet hors de l’espace de travail ; deux sommets à moins de `taillemini` (sauf contrôle désactivé) ; un sommet situé sur un côté non adjacent ; deux côtés non consécutifs qui se coupent (polygone non simple). L’aide : « Le polygône doit être connexe (il ne doit pas y avoir d'intersection entre cotés non consécutifs); le logiciel vérifie cette condition ».

Défaut de l’original : en création par menu, `oldindex` n’est pas remis à 0 (`ray1.pas:7197-7242`) ; s’il vaut k > 0 d’une utilisation précédente, le premier changement de sommet écrit les champs dans le sommet k+1. **Web** : à reproduire correctement (index courant = sommet affiché).

**Adaptation tablette** : remplacer la liste déroulante par un **tableau des sommets** (une ligne par sommet : n°, x, y, bouton « pointer », bouton « supprimer », bouton « insérer après ») avec aperçu du polygone ; validation en direct (côtés qui se croisent surlignés en rouge et nommés).

##### 2.8 Relier les points (`unit15`)

- Titre « Relier les points » (`unit15.pas:62`). Ouverte uniquement à la création **à la souris** d’un polycercle, une fois par côté, après le dernier sommet (`ray1.pas:1347-1360`).
- Groupe radio, libellé réécrit à chaque côté : « Relier les points %s et %s par: » (i et i+1, puis n et 1) (`ray1.pas:1352-1357`) ; libellé de fiche par défaut « Joindre les points par: ».
- Choix : « Un arc de cercle » (index 0), « Un segment de droite » (index 1) ; défaut à la première ouverture : arc ; ensuite le dernier choix est conservé. `rere := (ItemIndex = 1)`, c’est-à-dire « côté rectiligne » (`unit15.pas:54-57`).
- Bouton unique « &OK », pas d’Annuler.
- Suite : pour chaque côté en arc, l’utilisateur clique le **sommet de l’arc** (« Positionnez le sommet d'arc de cercle suivant... », `ray1.pas:1364-1365`), projeté sur la médiatrice de la corde (`ray1.pas:1399-1415`). Si tous les côtés sont droits, l’objet est créé aussitôt (indices 1,4/1,6/1,8) ; refus « Points saisis aberrants ! ».
- **Adaptation tablette** : au lieu de n boîtes successives, afficher le polygone et, sur chaque côté, un interrupteur « droit / arc » touchable ; puis faire glisser une poignée au milieu de chaque côté en arc pour fixer son sommet.

##### 2.9 Polycercle réfractant (`saisiecercle`)

**Ouverture**
- Création : menu « Polysphère réfractante » (`ray1.pas:4613`), `Polysphrerfractante1Click`, `ray1.pas:7129-7192` : boîte §2.6 (min 2), puis pour chaque sommet : (0 ; 0), côté **en arc** (`youri:=false`), sommet de l’arc **à gauche** (`helena:=true`), Ri = 0 (`selene:=0`). Titre non changé : « Propriétés de ce polycercle ». Message si plein : « Nombre maximal de polysphères deja atteint ! ».
- Modification : `unit222.pas:19018-19099` (`oldindex:=0`).

**Champs**

| # | Libellé exact | Contrôle | Défaut création | Modification |
|---|---|---|---|---|
| 1 | « Rayon réfléchi (sens sortant) » | radio 4 | Jamais | `ReflechiSortant` |
| 2 | « Rayon réfléchi (sens entrant) » | radio 4 | Jamais | `ReflechiEntrant` |
| 3 | « Indice de réfraction du milieu » : « Matériau: », rouge, vert, bleu | liste + 3 textes | « ... », 1,5 / 1,6 / 1,7 | indices |
| 4 | Liste « Sommet 1 »… « Sommet n » | liste | Sommet 1 | idem |
| 5 | « Coordonnées de ce sommet » : « x= », « y= » | 2 textes | 0 ; 0 | Ai |
| 6 | « Ce sommet est relié au suivant par: » : « Un segment de droite » (0), « Un arc de cercle » (1) | radio | arc | `rectiligne[i]` |
| 7 | « En allant de Ai vers Ai+1, le sommet de l'arc de cercle est: » : « A gauche » (0), « A droite » (1) | radio | à gauche | `agauche[i]` |
| 8 | « Son angle au centre est: » : « Aigu » (0), « Obtu » (1) | radio | voir défaut ci-dessous | `aigu[i]` |
| 9 | « Son rayon de courbure vaut: » : « Ri= » (+ unité) | texte | 0 | `rayon[i]` |
| 10 | « Couleur à l'écran » | couleurs | `couleurpolycercle` (cyan) | `couleurfond` |

Libellés : `saisiecercle.pas:295-357` ; le groupe 8 n’est pas réécrit par le `.pas`, ses textes viennent du `.lfm` (`saisiecercle.lfm:410-431`, « Obtu » sic). Boutons « Supprimer ce polycercle », « Annuler », « &OK ».

Défauts de l’original au chargement par menu : `ray1.pas:7181-7182` écrit dans `radiorectiligne` au lieu de `radiorentrant` quand `helena[1]` est faux (sans effet ici puisque `helena[1]` vaut vrai) ; `tavarich` (aigu) n’est pas réinitialisé (valeur de la dernière utilisation, « Obtu » si jamais servi — INCERTAIN). **Web : défaut « Aigu »**.

**Sémantique** (côté i = de Ai à Ai+1, le dernier côté va de An à A1) : pour un côté en arc, le programme calcule le **sommet S de l’arc** sur la médiatrice de la corde (`saisiecercle.pas:181-200`) : d = |AiAi+1| ; dIS = Ri − √|Ri² − (d/2)²| si « Aigu » (petit arc, angle au centre < 180°), Ri + √|Ri² − (d/2)²| si « Obtu » (grand arc) ; S = I + dIS × n, où I est le milieu de la corde et n le vecteur unitaire normal à gauche (−Δy ; Δx)/d si « A gauche », à droite sinon (repère y vers le haut). Si Ri < d/2, la valeur absolue masque l’erreur et produit un arc incohérent — **web : refuser Ri < d/2** avec « Valeur inacceptable pour Ri ! ». Ri est pris en valeur absolue (`saisiecercle.pas:174`). Les trois réglages 7, 8, 9 n’ont de sens que pour un arc ; l’original les laisse actifs pour un segment.

**Contrôles à OK** (`saisiecercle.pas:91-230`) : x, y, indices (messages du §2.5), « Valeur inacceptable pour Ri ! » (côté en arc), « Deux sommets consécutifs confondus... » (corde nulle). Puis `polycercle.create` (`unit222.pas:38627-39060`) : refus avec message propre (titre « Impossible ! ») pour 2 sommets et 2 côtés droits : « Cette structure serait un segment... » ; 2 sommets et 2 arcs : « Pour créer une lentille autre que plan-convexe, utilisez l'objet lentille épaisse... » (`unit222.pas:38654-38667`) ; autres refus (sommet hors espace, sommets trop proches, sommet sur un côté, côtés droits sécants, intersections droite/arc et arc/arc, `unit222.pas:38680-39043`) → « Points aberrants ! ». L’aide `polysphere.html` dit à tort que « le logiciel ne fait pas la vérification ».

**Adaptation tablette** : même tableau de sommets que §2.7, avec par côté : interrupteur « droit / arc », et pour un arc : Ri, « petit arc / grand arc » (au lieu de Aigu/Obtu), « bombé à gauche / à droite » ; poignées déplaçables sur le dessin ; réglages d’arc masqués pour un côté droit.

##### 2.10 Prisme (`saisiepri`)

**Ouverture**
- Création : menu « Prisme » (`ray1.pas:4534`), `MenuPrismeClick`, `ray1.pas:5436-5464`. Titre « Ajout d'un prisme » (`saisiepri.pas`, FormCreate) — **non changé en modification**. Message si plein : « Nombre maximal de prismes deja atteint ! ».
- Modification : `unit222.pas:18948-19016`, champs remplis avec `gx`, `gy`, `hauteur`, `angle_sommet`, `angle_axe` stockés.
- Souris : clic G, clic sommet principal, clic fixant l’angle ; indices 1,4/1,6/1,8 (`ray1.pas:2856-2858`). Aide `prisme.html`.

**Image** (`saisiepri.lfm:18-43`, PNG 100×100) : triangle, centre d’inertie G, demi-droite horizontale issue de G et angle **t** jusqu’à l’axe G→A, angle au sommet **A**. Texte alternatif : « Prisme : centre G, sommet principal, angle au sommet A, angle t de la hauteur ».

**Champs**

| # | Libellé exact | Contrôle | Unité | Défaut création | Modification |
|---|---|---|---|---|---|
| 1 | « Centre d'inertie » : « x= », « y= » | 2 textes | `unitelongueur` | (conservés) — **web : vides** | `gx`, `gy` |
| 2 | « Angle au sommet » : « A= » … « rad » | texte | **radian** | (conservé) — **web : vide** | `angle_sommet` |
| 3 | « Angle polaire de la hauteur principale » : « t= » … « rad » | texte | radian | (conservé) | `angle_axe` |
| 4 | « Hauteur » : « Hauteur= » | texte | `unitelongueur` | (conservé) | `hauteur` |
| 5 | « Couleur du prisme » : « Couleur: » | couleurs | — | `couleurPrisme` (cyan) | `couleurfond` |
| 6 | « Indice de réfraction du milieu » : « Matériau: », rouge, vert, bleu | liste + 3 textes | — | « ... », 1,5/1,6/1,7 | indices |
| 7 | « Rayon réfléchi (sens entrant) » | radio 4 | — | Jamais | `ReflechiEntrant` |
| 8 | « Rayon réfléchi (sens sortant) » | radio 4 | — | Jamais | `ReflechiSortant` |

Boutons « &OK », « Annuler », « Supprimer ce prisme ».

**Contrôles à OK** (`saisiepri.pas:76-207`) : gx (« Valeur inacceptable pour gx ! », bornes x) ; gy (« … pour gy ! », **comparé à tort aux bornes en x**, `saisiepri.pas:101`) ; A (« Valeur inacceptable pour l'angle au sommet ! », sans bornes) ; t (« Valeur inacceptable pour l'angle polaire ! ») ; hauteur (conversion : message erroné « Valeur inacceptable pour gx ! », `saisiepri.pas:130` ; bornes 0 ≤ h ≤ xxmax : « Valeur inacceptable pour la hauteur! ») ; indices. Puis construction (`saisiepri.pas:184-189`) : sommet principal S = G + (2h/3)(cos t ; sin t) ; un second sommet B = S + (h / cos(A/2)) × (cos(t + π − A/2) ; sin(t + π − A/2)) ; `prisme.create` (`unit222.pas:39458-39580`) place le troisième sommet symétrique de B par rapport au pied de la hauteur H = G − (S − G)/2 et refuse → « Points aberrants ! » si l’angle (B − G, S − G) est aigu, si deux sommets sont à moins de `taillemini` ou si un sommet sort de l’espace de travail. Stockage : hauteur = 3/2 × |GS|, `angle_axe` dans [0 ; 2π[, `angle_sommet` recalculé.

**Web** : bornes correctes (gy dans [yymin ; yymax]) et messages corrects (« Valeur inacceptable pour la hauteur! » pour une hauteur illisible) ; A dans ]0 ; π[ ; saisie des angles **en degrés** avec conversion (afficher aussi la valeur en radians pour la compatibilité des fichiers) — à valider par l’enseignant ; sinon garder radians avec l’unité « rad » bien visible.

**Défaut majeur de l’original** : le bouton « Supprimer ce prisme » n’a ni `ModalResult` ni `OnClick` (`saisiepri.lfm:246-253`) : en modification il ne fait rien, et il n’est pas grisé en création (le gestionnaire met `enabled:=false`, `ray1.pas:5463`, mais `Info` le réactive). **Web** : il supprime le prisme comme les autres boutons « Supprimer ».

**Adaptation tablette** : G et sommet principal plaçables au doigt (le sommet principal fixe t et la hauteur), A par curseur 1°…179° + champ ; titre « Propriétés de ce prisme » en modification.

##### 2.11 Œil stylisé (`saisieoe`)

**Ouverture**
- Création : menu « Oeil stylisé » (`ray1.pas:4589`), `Oeilstylis1Click`, `ray1.pas:10889-10918`. Titre « Ajout d'un oeil stylisé: ». Message si plein : « Nombre maximal d'yeux deja atteint ! ».
- Modification : `unit222.pas:19238-19277`, titre « Propriétés de cet oeil stylisé: ».
- Titre par défaut : « Ajout d'un oeil ».
- Souris : `boutonoeilClick` (`ray1.pas:10872-10887`) : « Positionnez le point 1 (rétine) et cliquez... ».

**Image** (`saisieoe.lfm:15-189`) : œil de profil, point 1 au fond (rétine), point 2 au centre de la pupille. Texte alternatif : « Œil : 1 rétine, 2 centre de la pupille ».

**Champs**

| # | Libellé exact | Contrôle | Unité | Défaut création | Bornes | Modification |
|---|---|---|---|---|---|---|
| 1 | « Couleur de l'oeil » | couleurs | — | `couleuroeil` (vert) | — | `couleur` |
| 2 | « Epaisseur trait à l'écran » | entier | pixels | `epaisseuroeil` (1) | 1…20 | `epaisseur` |
| 3 | « Point 1 » : « x= », « y= » | 2 textes | `unitelongueur` | vides | espace de travail | `cx`, `cy` (rétine) |
| 4 | « Point 2 » : « x= », « y= » | 2 textes | idem | vides | idem | `ax`, `ay` (pupille) |

Boutons « Supprimer cet oeil », « Annuler », « &OK ».

**Contrôles à OK** (`saisieoe.pas:78-156`) : x1, x2, y1, y2 (messages « Valeur inacceptable pour x1 ! »…) ; `oeil.create` (`unit222.pas:2606-2631`) refuse si |12| < `taillemini` → « Taille de l'oeil trop petite ! » (le contrôle des points hors de l’espace de travail est commenté). Taille de l’œil = distance 1-2 ; orientation = direction 1→2.

**Sémantique** : « Toutes les parties de cet oeil sont absorbantes » ; « cet oeil est optiquement inactif » (`oeil.html`) : il arrête les rayons, il ne simule pas l’image rétinienne.

**Adaptation tablette** : deux poignées (rétine, pupille) ; libellés web « Point 1 (rétine) » et « Point 2 (centre de la pupille) ».

##### 2.12 Trait, flèche — par coordonnées et en modification (`saisief1`)

**Ouverture**
- Création : menu « Trait, fléche... » (`ray1.pas:4727`), `Traitflche1Click`, `ray1.pas:10809-10840`. Titre « Ajout d'un trait... ». Message si plein, erroné : « Nombre maximal de miroirs plans deja atteint ! » (`ray1.pas:10813`) — **web : « Nombre maximal de traits déjà atteint ! »** (texte de `boutonflecheClick`, `ray1.pas:5733`).
- Modification : `unit222.pas:18601-18671`, titre « Propriétés de ce trait... ».
- Titre par défaut : « Ajout d'un trait, fléche... ».

**Image** (`saisief1.lfm:16-190`) : trait épais de 1 (terminé par un petit trait perpendiculaire) à 2 (terminé par une flèche).

**Champs**

| # | Libellé exact | Contrôle | Unité | Défaut création | Bornes | Modification |
|---|---|---|---|---|---|---|
| 1 | « Forme de la première extrémité » : « Normale », « Fléche », « Trait perpendiculaire », « Cercle », « Croix + », « Croix x », « Disque » | radio 7 | — | Normale | — | `ext1` |
| 2 | « Forme de la seconde extrémité » : mêmes 7 choix | radio 7 | — | Normale | — | `ext2` |
| 3 | « Taille de la première extrémité » : « en 1/1000 de la diagonale » « de l'espace de travail » | entier | ‰ de la diagonale | 10 | 1…1000 | `taille1` |
| 4 | « Taille de la seconde extrémité » (mêmes textes) | entier | ‰ | 10 | 1…1000 | `taille2` |
| 5 | « Epaisseur du trait » | entier | pixels | `epaisseurfleche` (1) | 1…10 | `epaisseur` |
| 6 | « Style du trait (valable si épaisseur=1) » : « Plein », « Pointillés », « Tirés », « Tirés - Points », « Tirés - Points - Points » | radio 5 | — | Plein | — | `styletrait` |
| 7 | « Couleur du trait » | couleurs | — | `couleurfleche` (noir) | — | `couleur` |
| 8 | « Coordonnées point 1 » : « x= », « y= » | 2 textes | `unitelongueur` | vides | espace de travail | `a1x`, `a1y` |
| 9 | « Coordonnées point 2 » : « x= », « y= » | 2 textes | idem | vides | idem | `a2x`, `a2y` |

Correspondances internes : extrémités `trien, tffleche, ttrait, trond, tcroix, tcroixx, tdisque` (`saisief1.pas:99-114`, `unit222.pas:64`) ; styles `pssolid, psdot, psdash, psdashdot, psdashdotdot` (`saisief1.pas:115-121`). Le style n’a d’effet que pour une épaisseur 1 (limite du tracé Windows/LCL) — **web : les pointillés fonctionnent à toute épaisseur ; retirer « (valable si épaisseur=1) »** ou le garder pour la fidélité (à décider).

**Contrôles à OK** (`saisief1.pas:95-206`) : x1, x2, y1, y2 (conversion, bornes) ; `fleche.create` (`unit222.pas:25792-25815`) refuse si |12| < `taillemini` (sauf contrôle désactivé) ou point hors espace → « Taille du trait trop petite ou points hors de l'espace de travail ! ».

**Adaptation tablette** : les 7 formes d’extrémité en boutons-icônes (SVG dessinés, avec nom écrit) ; aperçu du trait dans le panneau.

##### 2.13 Trait, flèche — style après tracé à la souris (`saisiefle`)

- Ouverte par le second clic du mode « trait » (`boutonflecheClick`, `ray1.pas:5730-5745` ; affichage `ray1.pas:1843-1853`). Titre « Propriétés de ce trait » (`saisiefle.lfm:8` ; le `.pas` ne réaffecte aucun libellé, `saisiefle.pas` FormCreate vide).
- Mêmes champs 1 à 7 que §2.12, mêmes libellés et bornes (`saisiefle.lfm:16-231`), **sans coordonnées** ; défauts : ceux de la dernière utilisation (au départ : Normale, Normale, 10, 10, épaisseur 1, Plein, couleur = sélection initiale de la liste, INCERTAIN — probablement noir). Les préférences `couleurfleche`/`epaisseurfleche` **ne sont pas appliquées**. **Web : appliquer les préférences.**
- Bouton unique « &OK » ; pas d’Annuler. Après OK : création avec les deux points cliqués (`ray1.pas:1855-1863`) ; refus « Taille du trait trop petite ! ».
- **Adaptation tablette** : ne pas ouvrir de boîte bloquante après le tracé : créer le trait avec le style courant et ouvrir le panneau §2.12 en modification (non modal) pour retouche.

##### 2.14 Point — style avant placement (`saisiejolipoint`)

- Ouverte par le bouton « Ajouter un point » (`SpeedButtonJoliPOintClick`, `ray1.pas:6955-6988`) **avant** le clic de placement. Titre « Ajout d'un point » (FormCreate, `saisiejolipoint.pas:92-112`). Message si plein, erroné : « Nombre maximal de traits déjà atteint ! » (`ray1.pas:6959`) — **web : « Nombre maximal de points déjà atteint ! »**.
- Champs :

| # | Libellé exact | Contrôle | Défaut | Bornes |
|---|---|---|---|---|
| 1 | « Forme » : « Cercle », « Croix + », « Croix x », « Disque », « Carré », « Carré plein », « Triangle », « Triangle plein » | radio 8 | Cercle | — |
| 2 | « Taille » : « en 1/1000 de la diagonale » « de l'espace de travail » | entier | 10 | 1…1000 |
| 3 | « Couleur » | couleurs | sélection initiale (INCERTAIN, noir probable) | — |
| 4 | « Epaisseur » | entier | 1 | 1…100 (max LCL par défaut) |

- Bouton unique « &OK ». Le test `=mrcancel` (`ray1.pas:6978`) est inopérant faute de bouton Annuler. Puis « Positionnez le point » et clic ; `JoliPoint.create` (`unit222.pas:25764-25790`) refuse si taille/1000 × diagonale < `taillemini` ou point hors espace → « Taille du trait trop petite ! » (`ray1.pas:1236-1242`, message inadapté — **web : « Point trop petit ou en dehors de l'espace de travail »**).
- Styles internes : `tpcercle, tpcroixp, tpcroixx, tpdisque, tpcarre, tpcarreplein, tptriangle, tptriangleplein` (`saisiejolipoint.pas:74-83`).
- **Adaptation tablette** : barre d’options compacte (forme, taille, couleur) au-dessus du dessin pendant le mode « point », puis toucher pour placer ; pas de boîte bloquante.

##### 2.15 Point — propriétés (`saisiejoli1`)

- Ouverte seulement en modification (`unit222.pas:18673-18727`), titre « Propriétés de ce point ». Titre par défaut « Ajout d'un point ».
- Champs : « Forme » (8 choix, comme §2.14), « Taille » (« en 1/1000 de la diagonale » « de l'espace de travail », 1…1000), « Couleur » (le `.pas` réécrit le groupe en « Couleur », le `.lfm` dit « Couleur du trait »), « Epaisseur » (min 1, max 100 LCL), « Coordonnées du point » : « x= », « y= » (+ unité).
- Bouton de suppression libellé « Supprimer ce trait » (sic, `saisiejoli1.pas`, FormCreate, `rsSupprimerCeT3`) — **web : « Supprimer ce point »**.
- **Contrôles à OK** (`saisiejoli1.pas:83-152`) : « Valeur inacceptable pour x », « Valeur inacceptable pour y » (conversion et bornes) ; refus de `create` → « Point trop petit ou en dehors de l'espace de travail ».
- **Adaptation tablette** : même panneau que §2.14 avec x, y et poignée déplaçable.

##### 2.16 Texte sur le dessin — création au bouton (`unit9`)

- Bouton « Ajouter un texte sur le dessin » (`boutontexteClick`, `ray1.pas:10380-10411`). Titre « Saisir le texte à afficher ». Message si plein : « Nombre maximal de textes deja atteint ! ».
- Champs : groupe « Texte » : zone de texte une ligne (vide à l’ouverture) ; bouton « Police » qui ouvre la boîte de police **du système** (TFontDialog : nom, style gras/italique, taille, couleur, soulignement, barré). Police initiale : `policedefaut` (préférences, `ray1.pas:672-690` ; à défaut, police de la fenêtre principale, `ray1.pas:424-427`).
- Boutons « &OK » (enregistre le texte, `unit9.pas:101-104`) et « Annuler » (quitte le mode). Puis « Positionnez le bord supérieur gauche du texte et cliquez... » ; le clic fixe le **coin supérieur gauche** (`ray1.pas:1266-1283`). Pas de contrôle de longueur ; le texte est un `shortstring` (255 caractères au plus). Texte vide accepté (INCERTAIN : objet invisible).
- **Adaptation tablette** : voir §2.17.

##### 2.17 Texte sur le dessin — par coordonnées et en modification (`unit10`)

**Ouverture** : menu « Texte sur le dessin » (`ray1.pas:4717`), `Textesurledessin1Click`, `ray1.pas:10414-10437`, titre « Ajout d'un texte: » ; modification `unit222.pas:18765-18818`, titre « Propriétés de ce texte: » ; titre par défaut « Saisir le texte à afficher ».

| # | Libellé exact | Contrôle | Défaut création | Modification |
|---|---|---|---|---|
| 1 | « Texte » | texte une ligne | vide | `texteluimeme` |
| 2 | « Police » | bouton → boîte de police | `policedefaut` | police de l’objet (nom, jeu de caractères, taille, couleur, pas, gras, italique, souligné, barré) |
| 3 | « Coordonnées du point supérieur gauche du texte » : « x= », « y= » (+ unité) | 2 textes | vides | `x`, `y` |

Boutons « Supprimer ce texte », « Annuler », « &OK ».

**Contrôles à OK** (`unit10.pas:140-170`) : « Valeur incorrecte pour x », « Valeur incorrecte pour y » (titre « Attention ! ») ; puis `texteaffiche.create` (`unit222.pas:3044-3070`) refuse si le point est hors de l’espace de travail → « Valeurs non autorisées pour x ou y » (titre « Attention »).

Le texte est dessiné à taille fixe en points (il ne suit pas le zoom). Remarque : sur le dessin, une poignée apparaît en (x, y) en mode propriétés/déplacement.

**Adaptation tablette** : panneau avec champ texte, puis réglages de police **limités** : famille parmi les polices du système et une police embarquée (par exemple « Sans-serif », « Serif », « Monospace »), taille en points (stepper 6…72), gras, italique, souligné, barré, couleur nommée (§0.5). Une police inconnue lue dans un fichier est remplacée par « Sans-serif » avec mention dans le panneau. Placement au doigt (coin supérieur gauche) ou par coordonnées. Accepter le texte accentué ; limiter à 255 caractères avec compteur.

##### 2.18 Commentaire sur la simulation (`unit32`)

- Ouverture : menu « Commentaire sur la simulation » (`Commenatiresurlasimulation1Click`, `ray1.pas:10719-10722` → `SpeedButton1Click`, `ray1.pas:10624-10628`), menu « Editer le commentaire de la simulation » (`ray1.pas:10698-10702`), bouton de barre d’outils (bulle « Ajouter (ou éditer) le commentaire de la simulation », `ray1.lfm:805`). Tous font `formediteur.show` + état normal.
- Fenêtre **non modale** redimensionnable, une zone de texte multiligne (`Memo1`, `Align = alClient`) et une barre d’état qui affiche le nom de fichier. Titres : « Editeur de texte » (FormCreate), « Commentaires sur la simulation de nom non précisé... » (nouvelle simulation, `ray1.pas:7371`), « Commentaires sur la simulation %s » après enregistrement (`ray1.pas:8139`), « Commentaires sur la simulation %sopt » à l’ouverture d’un fichier (`ray1.pas:9156`).
- Fermer la fenêtre la **réduit** au lieu de la fermer (`unit32.pas:111-116`). Toute frappe marque `commentaire_change` (`unit32.pas:123-126`), pris en compte par l’alerte « La simulation a été modifiée … » à la fermeture (`ray1.pas:5677-5681`).
- Stockage : fichier texte compagnon de même nom que le `.opt`, extension `.txt` (`ray1.pas:8133-8134`) ; à l’ouverture, lecture du `.txt` ou à défaut du `.rtf` converti en texte brut (`ray1.pas:9146-9161`, `unit32.pas:67-85`) ; la fenêtre s’affiche si le commentaire n’est pas vide, sinon reste réduite. Échec d’écriture : « Impossible de sauver le commentaire » (titre « Erreur d'écriture sur le disque »).
- **Adaptation tablette** : panneau latéral « Commentaire » (zone de texte, police système, retour à la ligne automatique) ouvrable depuis la barre ; le commentaire est enregistré avec la simulation (dans le même fichier ou le `.txt` compagnon pour l’export, à décider par la spec des fichiers) ; un badge signale qu’une simulation ouverte contient un commentaire.

##### 2.19 Rayons fantômes (`saisiefant`)

- Ouverture : bouton « Cacher des segments de rayon » (`boutonfantomeClick`, `ray1.pas:10607-10622`) ou menu « Rayons fantomes » (`ray1.pas:10803-10806`). Avant l’affichage, les numéros globaux des segments sont dessinés (§1.8), puis effacés à la fermeture.
- Titre « Pour cacher des segments de rayon ». Aucun libellé réaffecté par le `.pas` (`saisiefant.pas:75-78`) : tout vient du `.lfm`.
- Groupe « Saisie des fantomes », texte : « Pour des raisons de commodité, la possibilité vous est offerte de "cacher" certaines » / « parties des rayons lumineux calculés. Pour ce faire, cocher la case "Créer des fantomes", » / « et donner la liste des segments à cacher. Les numéros des segments sont actuellement » / « visualisés sur la simulation. » ; case « Créer des fantomes » (valeur courante `fantomespresents`) ; texte « Liste des fantomes (liste entre parenthéses, numéro des segments séparés par des virgules, » / « sans espaces); exemple: (1,5,10,12) » ; champ texte (valeur courante `listefantomes`).
- Bouton unique « &OK » (`saisiefant.pas:63-72`) : enregistre la case et la liste ; analyse identique à §1.4, pour i = 1…10 000. Un segment fantôme n’est pas dessiné (`unit222.pas:31094`). Pas d’Annuler.
- **Adaptation tablette** : mode « Cacher des segments » où l’on touche directement les segments à masquer (bascule), avec la liste texte synchronisée pour la compatibilité ; bouton « Tout réafficher » ; avertir que les numéros changent quand la simulation change.

##### 2.20 Surfaces d’onde — nombre de points (`saisieptssurfaceonde`)

- Menu « Surfaces d'onde » (`ray1.pas:4705`), `Surfacesdonde1Click`, `ray1.pas:10685-10696`. Titre « Pour le tracé des surfaces d'onde: ».
- Champ « Nombre de points calculés pour tracer une surface d'onde: » : entier, valeur courante `maxrayonsrecherchesurfacesonde` (défaut 20, `unit222.pas:40251`), bornes 2…500.
- Bouton unique « &OK » ; puis recalcul (`Rafraichit`). Réglage global de la simulation (§1.7).
- **Adaptation tablette** : à placer dans le panneau d’options de la simulation (stepper), avec la phrase « Plus de points = surfaces plus lisses, calcul plus long ».

##### 2.21 Options des normales (`saisienor`)

- Menu « Options des normales » (`ray1.pas:4601`), `Optionsdesnormales1Click`, `ray1.pas:10550-10572`. Titre « Options pour le tracé des normales aux dioptres et miroirs ».

| # | Libellé exact | Contrôle | Valeur à l’ouverture | Bornes |
|---|---|---|---|---|
| 1 | « Tracer les normales » : case « Tracer » | case | `optionnormale` (vrai par défaut) | — |
| 2 | « Epaisseur de la trace » | entier | `epaisseurnormale` (1) | 1…10 |
| 3 | « Couleur de la trace » | couleurs | `couleurnormale` (noir) | — |
| 4 | « Longueur trace (en % de la diagonale de l'espace de travail) » | entier | trunc(`pourcentagenormale` × 100) (5) | 1…100 |
| 5 | « Afficher valeurs angles (en degrés) » : case « Afficher » | case | `optionangles` (faux) | — |
| 6 | même groupe : « Nombre de décimales: » | entier | `decimalesangles` (0) | 0…8 |

- Bouton unique « &OK » (`saisienor.pas:68-77`) : enregistre ; cocher « Afficher » les angles force « Tracer » les normales. Puis synchronise les menus et cases de la barre (« Normales », « Angles d'incidence et de réfraction ») et recalcule. Les normales sont tracées en tirets-points (`psdashdot`, `unit222.pas:31088-31090`) ; l’angle de réflexion n’est pas affiché (aide).
- **Adaptation tablette** : panneau d’options ; quand « Afficher les angles » est coché, cocher et griser « Tracer les normales » avec l’explication.

##### 2.22 Options de la grille (`saisiegr`)

- Menu « Options de la grille » (`ray1.pas:4597`), `Optionsdelagrille1Click`, `ray1.pas:10469-10487`. Titre « Propriétés de la grille ».

| # | Libellé exact | Contrôle | Valeur à l’ouverture |
|---|---|---|---|
| 1 | « Pas de la grille » : « Pas horizontal= » (+ unité) | texte | `grillex` |
| 2 | « Pas vertical= » (+ unité) | texte | `grilley` |
| 3 | « Attraction de la grille » : case « Attraction » | case | `attractiongrille` |
| 4 | « Afficher la grille » : case « Afficher » | case | `tracergrille` |

- Valeurs par défaut d’une simulation : pas = 1/20 de la largeur (resp. hauteur), arrondi vers le bas au chiffre significatif : int(p × 1,001 / 10^⌊log10 p⌋) × 10^⌊log10 p⌋ (`ray1.pas:5636-5640`).
- **Contrôles à OK** (`saisiegr.pas:68-124`), valeur absolue prise : illisible ou nulle → « Valeur du pas horizontal illégale ! » ; hors de [(xxmax−xxmin)/1000 ; (xxmax−xxmin)/3] → question Oui/Non « Valeur du pas horizontal très faible ou très forte. Etes-vous sûr ? » (Non = retour à la boîte) ; idem en vertical avec « Valeur du pas vertical illégale ! » / « Valeur du pas vertical très faible ou très forte. Etes-vous sûr ? » — sauf qu’une valeur verticale **illisible** affiche le message horizontal (`saisiegr.pas:98`). En cas d’erreur, `modalresult:=mrno` et la boîte est rouverte (`ray1.pas:10484-10485`) ; attention : le pas horizontal est déjà enregistré si seule la valeur verticale est fautive.
- Boutons « &OK », « Annuler ». Effet : synchronise les menus « Afficher la grille », « Attraction de la grille » et les cases de la barre ; recalcul.
- **Adaptation tablette** : panneau d’options, interrupteurs « Afficher » / « Attraction », champs `inputmode="decimal"` ; la confirmation « très faible ou très forte » devient un avertissement non bloquant sous le champ avec un bouton « Garder quand même ».

---

#### 3. Défauts de l’original relevés (à corriger dans la version web, sauf avis contraire)

1. OK ferme probablement la boîte même en cas d’erreur (§0.2, INCERTAIN).
2. La virgule décimale est refusée (`unit222.pas:40173`).
3. Champs non réinitialisés en création : nombre max. de segments (rayon, source, onde), coordonnées et rayon de la sphère, toutes les valeurs du prisme, indices d’arc du polycercle, `oldindex` du polygone et du polycercle.
4. Prisme : gy comparé aux bornes en x (`saisiepri.pas:101`) ; message « gx » pour une hauteur illisible (`saisiepri.pas:130`) ; bouton « Supprimer ce prisme » inopérant (`saisiepri.lfm:246-253`) ; titre « Ajout d'un prisme » en modification.
5. Messages de maximum erronés : trait par menu (`ray1.pas:10813`, « miroirs plans »), point (`ray1.pas:6959`, « traits ») ; message de création de point à la souris (`ray1.pas:1241`).
6. Point : bouton « Supprimer ce trait » (`saisiejoli1.pas`, FormCreate).
7. Grille : message horizontal pour une valeur verticale illisible (`saisiegr.pas:98`).
8. Chemins optiques : l’exemple « 120 145  276 » (deux espaces) n’est lu qu’en partie ; espace finale dangereuse (§1.7).
9. Polycercle : Ri < d/2 non détecté ; mauvais groupe radio écrit à `ray1.pas:7181-7182`.
10. Indices par défaut différents selon que l’objet est créé par menu (1,5/1,6/1,7) ou à la souris (1,4/1,6/1,8) (§1.6).
11. Rayon blanc non décomposé : indice de départ non affecté (§1.1, INCERTAIN).
12. Boîtes « Nombre de rayons », « Nombre de sommets », « Relier les points », style du trait, style du point, fantômes, surfaces d’onde, normales : pas de bouton Annuler.
13. Suppression sans confirmation dans toutes les boîtes.

### 10.M Mesures de distance et d'angle

#### 10.M1 Mesure de distance (`unit13`, classe `Tsaisiemetre`, instance `saisiemetre`)

- Titre : « Ajout d'une mesure de distance: » en création par le menu Ajouter › Divers › Mesure de distance (`ray1.pas:10725-10744`) ; « Propriétés de cette mesure de distance: » en modification (`unit222.pas:18578`) ; titre du `.lfm`/`FormCreate` « Modification d'une mesure de distance » écrasé dans les deux cas (`unit13.pas:145-146`).
- Champs (création : vides ; modification : valeurs de l'objet) :

| # | Cadre | Libellé | Type | Unité | Contrôle à OK (message exact) |
|---|---|---|---|---|---|
| 1 | Coordonnées du 1er point | x= | texte | `unitelongueur` | « Valeur inacceptable pour x1 ! » |
| 2 | | y= | texte | idem | « Valeur inacceptable pour y1 ! » |
| 3 | Coordonnées du 2nd point | x= | texte | idem | « Valeur inacceptable pour x2 ! » |
| 4 | | y= | texte | idem | « Valeur inacceptable pour y2 ! » |

- Refus du constructeur : « Points trop proches ou hors de l'espace de travail ! » (`unit13.pas`, `BitBtn1Click`).
- Boutons : « Supprimer cette distance » (désactivé en création ; en modification supprime sans confirmation, `unit222.pas:18588-18590`), « &OK », « Annuler ». Comme les autres boîtes, le bouton OK porte `ModalResult = 1` (`unit13.lfm:196`) : la boîte se ferme probablement même après un message d'erreur (règle commune, §10.0).
- Affichage de l'objet : segment noir avec un petit cercle à chaque bout et la longueur écrite au milieu, avec `floor(log10(zoom))` décimales puis l'unité (« 52 mm » à ×1, « 52,3 mm » à ×10) (`unit222.pas:29078-29134`).

#### 10.M2 Mesure d'angle (`unit14`, classe `Tsaisieangle`, instance `saisieangle`)

- Titre : « Ajout d'une mesure d'angle: » par le menu (`ray1.pas:10746-10769`) ; « Propriétés de cette mesure d'angle: » en modification (`unit222.pas:18745`) ; titre de base « Modification d'une mesure d'angle » (`unit14.pas:172-173`). Une image d'illustration (`Image1`, `unit14.lfm:15`) montre la figure C, point 1, point 2.
- Champs, dans l'ordre d'affichage : « Coordonnées de C » (x=, y= : sommet de l'angle), « Coordonnées du 1er point » (x=, y=), « Coordonnées du 2nd point » (x=, y=), tous en `unitelongueur`. Messages : « Valeur inacceptable pour x1 ! », « … y1 ! », « … x2 ! », « … y2 ! », « Valeur inacceptable pour cx ! », « Valeur inacceptable pour cy ! ».
- Refus : « Points trop proches ou hors de l'espace de travail ! ».
- Boutons : « Supprimer cet angle », « &OK », « Annuler ».
- Affichage : deux côtés noirs depuis C, un arc, et la valeur en degrés avec `decimalesangles` décimales suivie de « ° » (`unit222.pas:28716-28770`).

**Adaptation tablette (les deux)** : mêmes règles que les autres boîtes (panneau non modal, `inputmode="decimal"`) ; à la création au doigt, la valeur mesurée s'affiche en direct pendant le glisser du dernier point. L'étiquette de la mesure doit rester lisible quelle que soit l'orientation (pas de texte à l'envers).

## 11. Fenêtres annexes et options globales

Numérotation interne propre à cette partie, préfixée F : « § 3 » dans le texte de cette partie désigne F3 (Préférences). Ce qui n'est pas porté est au §13.2.

Cette partie couvre **toutes les fenêtres annexes**, hors boîtes de propriétés des objets (traitées au §10 ; elles sont seulement identifiées ici, F13).

### F0. Conventions de cette partie

- Références : `fichier:ligne` dans les sources d'OptGeo 3.03 (`~/src/optgeo-amont/src/`). Le texte français d'une chaîne `rsXxx` est donné entre « ». Quand le `.lfm` et le `FormCreate` du `.pas` diffèrent, **le `.pas` fait foi** (il réaffecte les libellés au démarrage).
- « INCERTAIN : … » signale ce que les sources ne permettent pas d'établir.
- Séparateur décimal : OptGeo force le **point** (`unit222.pas:40173`, `DefaultFormatSettings.DecimalSeparator:='.'`) ; une virgule saisie dans un champ numérique est refusée (exception de `strtofloat`).
- Couleurs Lazarus utilisées par défaut, avec leur équivalent web : `clBlack` #000000, `clWhite` #FFFFFF, `clRed` #FF0000, `clGreen` **#008000**, `clBlue` #0000FF, `clAqua` #00FFFF, `clFuchsia` #FF00FF.
- **Couleur des rayons** : OptGeo ne connaît que quatre couleurs de lumière. Rouge (`clRed`), vert (`clGreen`), bleu (`clBlue`) et **lumière blanche, codée par le noir `clBlack`** (`unit222.pas:5213` ; `unit17.pas:1195-1200` : le choix « Blanc » donne `clblack`). Le port doit garder cette correspondance dans les fichiers `.opt`, mais **afficher** « Blanc » ou « Lumière blanche » à l'utilisateur.
- Boutons de la LCL : un bouton dont `ModalResult` n'est pas nul ferme la fenêtre **avant** l'exécution de son `OnClick`, sauf si ce dernier remet `ModalResult` à 0 ou à `mrCancel`. Ce comportement vient de la LCL, pas des sources d'OptGeo ; il est signalé « (LCL) » quand il explique une conduite de l'original.
- Toutes les fenêtres sont centrées à l'écran par l'appelant (bloc `if screen.width>width then left:=…`, répété partout). Ce détail n'est pas repris ci-dessous.
- Règle générale web/tablette (vaut pour toutes les fenêtres, sauf mention contraire) : boîte modale centrée sur ordinateur et tablette, **plein écran sur téléphone** ; cibles tactiles d'au moins 44 × 44 px ; champs numériques en `inputmode="decimal"` ; touche Entrée = bouton par défaut ; Échap = « Annuler » quand l'original a un bouton Annuler ; aucune ressource chargée depuis Internet.

### Récapitulatif

| Unité | Classe (variable) | Titre exact (.pas) | Ouverte depuis | Sort dans le web |
|---|---|---|---|---|
| `unit11` | `Tsaisieespacetravail` (`saisieespacetravail`) | « Dimensions de l'espace de travail » | démarrage et Fichier > Nouvelle simulation, choix 2 de « Que voulez vous faire ? » | à porter (§ 1.2) |
| `modif_espace_travail` | `Tsaisieretailleespace` (`saisieretailleespace`) | « Modifier l'espace de travail » | Fichier > Modifier les dimensions de l'espace de travail > Manuellement | à porter (§ 1.3) |
| (aucune) | — | — | Fichier > … > Ajuster automatiquement à la plus petite taille | à porter, sans fenêtre (§ 1.4) |
| `unit_indices_milieu_ambiant` | `Tsaisie_indices_milieu_ambiant` | « Indices du milieu ambiant et longueurs d'onde » | Options > Indices du milieu ambiant et longueurs d'onde | à porter (§ 2) |
| `unit17` | `Tsaisiepreferences` | « Préférences: propriétés par défaut à la création » | Fichier > Préférences | à porter (§ 3) |
| `unit18` | `Tsaisiecouleurrayondefaut` | « Couleur par défaut » | bouton de l'onglet 2 des Préférences | à porter (§ 3.6) |
| (dialogues standard) | `QuestionDlg`, `ColorDialog1`, `OpenDialogImageFonds` | « Choix du fond » | Options > Couleur de fond ou image de fond | à porter (§ 4) |
| `unit19` | `Tsaisieempennage` | « Propriétés de l'empennage des rayons » | Options > Empennage des rayons | à porter (§ 5) |
| `fiche_affiche_coordonees` | `Tfiche_coordonnees_segments` | « Coordonnées des segments » | bouton « Coord. » de la 2e barre d'outils | à porter (§ 6) |
| `unit32` | `TFormEditeur` (`FormEditeur`) | variable (« Commentaires sur la simulation … ») | Edition > Editer le commentaire de la simulation ; Ajouter > Divers > Commentaire sur la simulation ; bouton de la barre d'outils | à porter (§ 7) |
| `unit_quelobjet` | `TForm_quelobjet` | variable selon l'action | clic sur un endroit où plusieurs objets se superposent | à porter (§ 8) |
| `saisieptssurfaceonde` (hors liste, gestionnaire demandé) | `Tsaisiepointssurfaceonde` | « Pour le tracé des surfaces d'onde: » | Options > Surfaces d'onde | à porter (§ 9) |
| `unit4` | `TForm4` | « A propos de ce logiciel » | Aide > A propos | à porter (§ 10) |
| `unitgpl` | `TFormgpl` | « License GPL » | Aide > License GPL | à porter (§ 11) |
| `unit5` | `Tsaisienombrerayons` | « Nombre de rayons » | création d'une onde plane ou d'une source ponctuelle | à porter (§ 12.1) |
| `unit8` | `Tsaisienombresommet` | « Nombre de sommets » | création d'un polyèdre ou d'une polysphère | à porter (§ 12.2) |
| `unit12` | `Tsaisiediametre` | « Saissez le diamètre de la lentille » | création d'une lentille épaisse | à porter (§ 12.3) |
| `unit15` | `Tsaisiejoindre` | « Relier les points » | création d'une polysphère (polycercle) | à porter (§ 12.4) |
| `unit6`, `unit9`, `unit10`, `unit13`, `unit14` | voir § 13 | voir § 13 | voir § 13 | boîtes de propriétés d'objets : §10 |
| `unit3` | `Tproprietespoints` | « Propriétés des points » | **jamais ouverte** | code mort, ne pas porter (§ 14) |
| `unit17b` | `Tsplashscreen` | « Splashscreen » | lancement du programme | ne pas porter (§ 15, § 16) |
| `unit16` | `TForm16` | « Configuration primaire d'OptGeo » | premier lancement ; Options > Définir le répertoire personnel | ne pas porter (§ 16) |
| `unit_imp` | `Tconfigimpression` | « Configuration de la page pour l'impression » | Fichier > Imprimer | ne pas porter (§ 16) |
| `unitconfigpostscript` | `TFormConfigPostScript` | « Propriétés du fichier Postscript » | Fichier > Exporter graphe > PS | ne pas porter (§ 16) |

---

### F1. Espace de travail

#### F1.1 Modèle commun

L'espace de travail est le rectangle du plan simulé, de `xxmin` à `xxmax` horizontalement et de `yymin` à `yymax` verticalement, exprimé dans l'**unité de longueur** `unitelongueur`. Quatre faits structurent les trois commandes :

- **L'unité n'est qu'une étiquette.** Elle s'affiche à côté des champs de coordonnées (`log1`, `log2`… des boîtes de propriétés, par exemple `ray1.pas:6233-6236`) et dans l'en-tête du tableau des coordonnées (§ 6). Aucune conversion n'est faite quand on la change.
- Espace par défaut : de 0 à la largeur en **pixels** de la zone de dessin à l'ouverture du programme (`largeurinitialeimage1`), et de 0 à sa hauteur en pixels (`hauteurinitialeimage1`) (`ray1.pas:5500-5503`). Unité `mm` (`unit222.pas:40251`, `ray1.pas:7453`). « Rapport idéal » `rapportideal` = hauteur ÷ largeur de la zone de dessin en pixels (`ray1.pas:5503`).
- Le **respect du rapport** (`respectrapport`) garde un repère orthonormé : une même longueur a la même taille à l'écran horizontalement et verticalement, et les angles affichés sont justes. Sans lui, l'espace est étiré pour remplir la zone de dessin. Valeur au lancement du programme : faux (`unit222.pas:40234`) ; elle passe à vrai dès qu'on choisit « Créér une nouvelle simulation » (`ray1.pas:5598`, `7507`).
- Après tout changement, le titre de la fenêtre principale devient `Format(rsEspaceDeTrav, …)` : « Espace de travail: horiz: [%s,%s]; vert: [%s,%s]   » (`ray1.pas:7544`, `11088`, `11128`).

Enregistré dans le fichier `.opt` : `xxmin xxmax yymin yymax`, `respectrapport`, puis `UNITE` et `unitelongueur` (`ray1.pas:7573-7576`). Le pas de la grille est enregistré à part (`ray1.pas:7577-7580`).

#### F1.2 `unit11` — « Dimensions de l'espace de travail »

- Classe `Tsaisieespacetravail`, variable `saisieespacetravail` (`unit11.pas:37`, `73`).
- Titre : « Dimensions de l'espace de travail » (`unit11.pas:196-197`).
- Rôle : fixer l'espace de travail et l'unité **d'une nouvelle simulation**.
- Ouverture : seulement après la fenêtre « Que voulez vous faire ? » (`saisiech`, hors de cette partie), quand l'utilisateur y choisit « Créér une nouvelle simulation en choisissant les dimensions de l'espace de travail » (`saisiech.pas:81`). Cela arrive au lancement (`ray1.pas:5510-5632`) et par Fichier > Nouvelle simulation (`Nouveau1Click`, `ray1.pas:7411-7527`). Avec le premier choix, « Créér une nouvelle simulation », la fenêtre n'est pas montrée : l'espace par défaut s'applique, le rapport est respecté (`ray1.pas:7502-7508`). Avant l'ouverture, l'appelant remplit l'abscisse et l'ordonnée maximales avec la taille en pixels de la zone de dessin, et « Rapport idéal » comme « Rapport » avec `rapportideal` (`ray1.pas:7521-7526`).

Contrôles, de haut en bas (colonne de gauche), puis colonne de droite (`unit11.lfm`) :

| # | Libellé exact | Type | Valeur initiale | Contrôle |
|---|---|---|---|---|
| 1 | cadre « Abscisse minimale » (`unit11.pas:235-236`) | texte (`editxxmin`) | « 0 » (`unit11.pas:204-206`) | nombre, sinon « Expression illégale pour la l'abcisse minimale ! » (`unit11.pas:88`) |
| 2 | cadre « Abscisse maximale » (`unit11.pas:214-215`) | texte (`editxxmax`) | largeur de la zone de dessin en pixels (`ray1.pas:7521`) | nombre, sinon « Expression illégale pour la l'abcisse maximale ! » (`unit11.pas:101`) |
| 3 | cadre « Ordonnée minimale » (`unit11.pas:239-240`) | texte (`edityymin`) | « 0 » (`unit11.pas:209-211`) | nombre, sinon « Expression illégale pour la l'ordonnée minimale ! » (`unit11.pas:94`) |
| 4 | cadre « Ordonnées maximale » (`unit11.pas:218-219`) | texte (`edityymax`) | hauteur de la zone de dessin en pixels (`ray1.pas:7522`) | nombre, sinon « Expression illégale pour la l'ordonnée maximale ! » (`unit11.pas:107`) |
| 5 | cadre « Rapport hauteur/largeur » (`unit11.pas:230-232`) : « Rapport= » suivi de la valeur ; « Rapport idéal (permettant d'occuper le maximum » / « de surface d'écran avec repére orthonormé)= » suivi de la valeur (`unit11.pas:251-260`) | texte affiché | rapport = `rapportideal` | « Rapport= » est **recalculé à chaque frappe** dans l'un des quatre champs : (ymax − ymin) ÷ (xmax − xmin), sans rien afficher si un champ n'est pas un nombre ou si la largeur est nulle (`unit11.pas:120-185`) |
| 6 | cadre « Repére orthonormé (approximativement) » (`unit11.pas:222-223`) : case « Respecter le rapport hauteur/largeur de l'écran » (`unit11.pas:200-201`), puis « Remarque: le non respect du rapport implique que » / « les angles à l'écran ne sont pas respectés. » (`unit11.pas:243-248`) | case à cocher | cochée (`unit11.lfm:109`) | — |
| 7 | (à droite) « Unité de longueur » (`unit11.pas:226-227`) | boutons radio | `mm` (`ItemIndex = 6`, `unit11.lfm:196`) | — |
| 8 | « &OK » (`unit11.pas:191-193`) | bouton par défaut | — | voir ci-dessous |

**Unités proposées**, dans l'ordre : `km`, `hm`, `dam`, `m`, `dm`, `cm`, `mm`, `µm` (`unit11.pas:270-277`). INCERTAIN : le `.lfm` déclare une neuvième entrée vide (`unit11.lfm:206`) que le `.pas` ne réaffecte pas ; elle apparaît sans doute comme un bouton radio sans libellé. Le port ne la reprend pas.

Bouton OK (`unit11.pas:82-118`) : lit dans l'ordre le respect du rapport, puis xmin, ymin, xmax, ymax (un message par champ invalide, titre « Attention ! ») ; refuse une largeur ou une hauteur nulle ou négative avec « Valeur nulle ou négative interdite pour la hauteur et/ou la largeur ! » (`unit11.pas:113-116`) ; sinon prend l'unité cochée. Aucune vérification de bornes au-delà.

Effet (`ray1.pas:7528-7553`) : nouvel espace, remise à zéro des options (grille masquée, sans attraction, normales affichées, angles masqués, longueurs des segments masquées) ; pas de grille = 1/20 de la largeur et 1/20 de la hauteur, arrondi vers le bas à un chiffre significatif (`ray1.pas:7537-7541`) ; historique d'annulation vidé (`ray1.pas:7551`).

Défaut de l'original : le bouton OK a `ModalResult = 1` (`unit11.lfm:285`) et son `OnClick` se contente de `exit` en cas d'erreur. (LCL) La fenêtre se ferme donc **quand même** après le message d'erreur, avec des valeurs à moitié lues (une largeur négative peut passer). La boîte ne se ferme jamais sans OK : ni Annuler, ni bouton de fermeture (`BorderIcons = []`, `unit11.lfm:6`). Les valeurs saisies et l'unité cochée **restent** d'une ouverture à l'autre, sauf l'abscisse et l'ordonnée maximales, remplies par l'appelant.

Enregistré : rien sur disque au moment de la saisie ; l'espace et l'unité font partie du `.opt` (§ 1.1).

**Adaptation web/tablette** : cette boîte devient la 2e étape de l'assistant « Nouvelle simulation ». La garder **ouverte** en cas d'erreur, le message sous le champ fautif. Accepter « , » et « . ». Afficher le rapport en direct, arrondi à 3 décimales. Remplacer la valeur en pixels de l'écran par une valeur indépendante de l'appareil (sinon une simulation créée sur téléphone n'a pas les mêmes dimensions que sur ordinateur) : **proposition** = rapport hauteur/largeur de la zone de dessin réelle de l'appareil, largeur arrondie à une valeur ronde, à valider par l'enseignant. Unités en liste déroulante ou en boutons segmentés ; défaut `mm`. Ajouter « Annuler » (retour à l'étape précédente) : écart assumé avec l'original.

#### F1.3 `modif_espace_travail` — « Modifier l'espace de travail »

- Classe `Tsaisieretailleespace`, variable `saisieretailleespace` (`modif_espace_travail.pas:36`, `64`).
- Titre : « Modifier l'espace de travail » (`modif_espace_travail.pas:131`).
- Rôle : changer les limites de l'espace d'une simulation **existante**, sans toucher aux objets.
- Ouverture : Fichier > « Modifier les dimensions de l'espace de travail » (`ray1.pas:4570-4571`) > « Manuellement » (`ray1.pas:4511-4512`) → `Manuellement1Click` (`ray1.pas:11056-11059`) → `Modifierdimensionsespacedetravail11Click` (`ray1.pas:11096`). L'appelant remplit les quatre champs avec les limites actuelles, les quatre étiquettes d'unité avec `unitelongueur` et la case avec `respectrapport` (`ray1.pas:11099-11107`).

| # | Libellé exact | Type | Valeur initiale | Contrôle (message, titre « Attention ») |
|---|---|---|---|---|
| 1 | « Abscisse min.: » (`modif_espace_travail.pas:137`) + unité | texte | `xxmin` | « Expression illégale pour la l'abscisse minimale ! » (`:78`) |
| 2 | « Abscisse max.: » (`:140`) + unité | texte | `xxmax` | « Expression illégale pour la l'abscisse maximale ! » (`:86`) |
| 3 | « Ordonnée min.: » (`:143`) + unité | texte | `yymin` | « Expression illégale pour la l'ordonnée minimale ! » (`:94`) |
| 4 | « Ordonnée max.: » (`:146`) + unité | texte | `yymax` | « Expression illégale pour la l'ordonnée maximale ! » (`:102`) |
| 5 | « Respecter rapport hauteur/largeur de l'écran » (`:134`), puis la ligne « pour avoir un repère approximativement orthonormé » (`:149`) | case | `respectrapport` | — |
| 6 | « &OK » (`:125`) | bouton par défaut | — | après les 4 nombres : « xmax doit être supérieur à xmin ! » (`:108`), « ymax doit être supérieur à ymin ! » (`:114`) |
| 7 | « Annuler » (`:128`) | bouton (Échap) | — | — |

Toute erreur affiche son message puis **ferme comme Annuler** (`self.ModalResult:=mrcancel`, `modif_espace_travail.pas:79-116`) : rien n'est changé et il faut rouvrir la fenêtre.

Effet de OK (`ray1.pas:11113-11136`) : le programme vérifie que **chaque objet** tient encore dans le nouvel espace, en le recréant à titre d'essai (`retaille_espace_possible`, `ray1.pas:709`). Si un objet ne tient pas : message « Un au moins des objets actuels ne rentre pas sur ce nouvel espace de travail ! », titre « Redimensionnement impossible » (`ray1.pas:11133-11134`), rien ne change. Sinon : les limites et le respect du rapport sont appliqués ; le pas de la grille est mis à l'échelle dans le même rapport que l'espace puis arrondi vers le bas à un chiffre significatif (`ray1.pas:11116-11121`) ; titre de la fenêtre principale mis à jour ; retracé ; état empilé pour l'annulation (`sauvevirtuel`). L'**unité ne se change pas ici** : elle n'est fixée qu'à la création (§ 1.2).

Enregistré : dans le `.opt` (§ 1.1), à la prochaine sauvegarde.

**Adaptation web/tablette** : boîte modale ou panneau latéral ; garder la boîte ouverte en cas d'erreur (écart assumé : l'original la ferme) ; garder le contrôle « un objet ne rentre pas » avec le même texte. Proposition : signaler quels objets débordent.

#### F1.4 « Ajuster automatiquement à la plus petite taille » (sans fenêtre)

- Libellé : « Ajuster automatiquement à la plus petite taille » (`ray1.pas:4233`), dans Fichier > Modifier les dimensions de l'espace de travail.
- Gestionnaire `Ajusterautomatiquement1Click` (`ray1.pas:11061-11093`). Sans objet, ne fait rien (`ray1.pas:11064`).
- Algorithme exact, à reproduire : pour chaque bord pris **dans cet ordre**, xmin, puis xmax, puis ymin, puis ymax, on avance le bord vers l'intérieur par pas de 1 % de l'étendue actuelle de l'axe tant que tous les objets tiennent (`retaille_espace_possible`), puis on garde le dernier pas réussi (`ray1.pas:11066-11084`). L'étendue est relue entre deux bords : le pas de xmax vaut 1 % de l'étendue déjà réduite par xmin.
- Inchangés : pas de la grille, respect du rapport, unité. Titre de la fenêtre principale mis à jour, retracé, état empilé pour l'annulation.
- INCERTAIN : l'effet visuel quand le rapport est respecté (le cadre affiché garde peut-être des marges) ; l'algorithme ne s'en occupe pas.

**Adaptation web/tablette** : commande directe dans le menu Fichier (ou Affichage), annulable par Annuler. Prévenir l'utilisateur (message bref) s'il n'y a aucun objet, au lieu de ne rien faire en silence (écart assumé).

---

### F2. `unit_indices_milieu_ambiant` — indices du milieu ambiant et longueurs d'onde

- Classe `Tsaisie_indices_milieu_ambiant`, variable `saisie_indices_milieu_ambiant`.
- Titre : « Indices du milieu ambiant et longueurs d'onde » (`unit_indices_milieu_ambiant.pas:82` ; le `.lfm` disait « Indices du milieu ambiant »).
- Rôle : indice de réfraction du milieu où baigne toute la simulation (l'« air »), pour chacune des trois couleurs ; longueurs d'onde des trois couleurs, qui ne servent qu'aux **réseaux de diffraction**.
- Ouverture : Options > « Indices du milieu ambiant et longueurs d'onde » (`ray1.pas:4518`) → `MenuItem7Click` (`ray1.pas:5021-5036`), qui remplit les champs avec les valeurs actuelles (`ray1.pas:5027-5032`). Les indices peuvent aussi être choisis au démarrage et à chaque nouvelle simulation, dans « Que voulez vous faire ? » (`saisiech`, trois champs « Pour le vert: », « Pour le rouge: », « Pour le bleu: », valeur « 1 » imposée par l'appelant, `ray1.pas:7474-7476`).

Contrôles, de haut en bas :

| # | Libellé exact | Type | Unité | Défaut | Bornes / contrôle |
|---|---|---|---|---|---|
| 1 | « Pour le vert: » (`unit_indices_milieu_ambiant.pas:83`) | texte | — | 1 | `abs()` du nombre ; sinon message « Valeur illégale de l'indice vert par défaut; remplacé par 1 », titre « Attention ! », et valeur 1 (`:56-60`) |
| 2 | « Pour le rouge: » (`:84`) | texte | — | 1 | idem, « Valeur illégale de l'indice rouge par défaut; remplacé par 1 » (`:68-72`) |
| 3 | « Pour le bleu: » (`:85`) | texte | — | 1 | idem, « Valeur illégale de l'indice bleu par défaut; remplacé par 1 » (`:62-66`) |
| 4 | « Longueur d'onde pour le rouge » (`:87`) | nombre à flèches (`FloatSpinEditrouge`) | nm | **632** (`unit222.pas:40260` ; `.lfm:139`) | 380 à 780, pas 1 (`.lfm:135-137`) |
| 5 | « Longueur d'onde pour le vert » (`:86`) | nombre à flèches | nm | **520** (`unit222.pas:40262`) | 380 à 780, pas 1 |
| 6 | « Longueur d'onde pour le bleu » (`:88`) | nombre à flèches | nm | **450** (`unit222.pas:40261`) | 380 à 780, pas 1 |
| 7 | « Les valeurs de longueur d'onde sont utilisées pour les réseaux de diffraction » (`:89`) | texte d'aide | — | — | — |
| 8 | « &OK » (en haut à droite) | bouton par défaut | — | — | — |

Les indices s'affichent dans l'ordre **vert, rouge, bleu**, les longueurs d'onde dans l'ordre **rouge, vert, bleu** (positions du `.lfm`). Le `.pas` ôte les deux-points des trois libellés de longueur d'onde (le `.lfm` les avait). Aucune borne sur les indices : 0 est accepté, une valeur négative devient positive. INCERTAIN : nombre de décimales des longueurs d'onde (aucun `DecimalPlaces` dans le `.lfm`, donc probablement 2 par défaut).

Boutons : OK applique (`:53-77`) puis la simulation est retracée (`ray1.pas:5035`). Pas de bouton Annuler ; la croix de fermeture existe (`BorderIcons = [biSystemMenu]`) et ferme **sans rien appliquer** (le `OnClick` n'est pas exécuté), avec retracé quand même. L'état n'est pas empilé pour l'annulation.

Effet sur le calcul : un rayon rouge part dans un milieu d'indice « rouge », un vert dans l'indice « vert », un bleu dans l'indice « bleu » (`unit222.pas:32104-32108`) ; la longueur d'onde est choisie de la même façon (`unit222.pas:32089-32091`). INCERTAIN : pour la lumière blanche (codée noire), le code ne choisit ni indice ni longueur d'onde à cet endroit ; elle est sans doute décomposée en trois rayons rouge, vert et bleu ailleurs (`unit222.pas:5213`), à confirmer avec le moteur.

Enregistré dans le `.opt` : `INDICES PAR DEFAUT` (vert, bleu, rouge) et `LAMBDA` (rouge, bleu, vert, **en mètres**) (`ray1.pas:7593-7600`). Indices remis à 1 à chaque ouverture d'un fichier, avant lecture (`metazero`, `ray1.pas:7329-7331`, appelé en `ray1.pas:8233`). Les longueurs d'onde ne sont remises à zéro ni par « Nouvelle simulation » ni par l'ouverture d'un fichier qui ne les contient pas.

**Adaptation web/tablette** : petite boîte à deux blocs, « Indices du milieu ambiant » et « Longueurs d'onde (réseaux de diffraction) », dans l'ordre rouge, vert, bleu pour les deux (écart d'ordre assumé, plus lisible) ; pastille de couleur **dessinée** (jamais d'émoji) devant chaque ligne. Indices : refuser plutôt qu'accepter en silence une valeur négative ou nulle (proposition : indice ≥ 1 ou > 0, à faire trancher). Longueurs d'onde : champ nombre 380–780 nm avec boutons − / + de 44 px. Ajouter « Annuler ». Valider = retracé immédiat + entrée dans l'historique d'annulation (écart assumé).

---

### F3. `unit17` — Préférences

- Classe `Tsaisiepreferences`, variable `saisiepreferences`.
- Titre : « Préférences: propriétés par défaut à la création » (`unit17.pas:775-776`).
- Rôle : couleur, épaisseur, couleur d'axe et police **par défaut** des objets créés ensuite. Les objets déjà présents ne changent pas.
- Ouverture : Fichier > « Préférences » (`ray1.pas:4617-4618`) → `Prfrences1Click` (`ray1.pas:11188-11234`) : liste sur « Miroir plan », pastilles et épaisseur du miroir plan, pastilles de l'onglet 2, description de la police dans les deux zones de texte (`ray1.pas:11195-11230`).

#### F3.1 Valeurs par défaut (au lancement, et bouton « Rétablir »)

Valeurs identiques dans `unit222.pas:40196-40220` (lancement) et `unit17.pas:946-970` (bouton « Rétablir ») :

| Élément | Couleur | Épaisseur (px) | Couleur d'axe |
|---|---|---|---|
| Miroir plan | noir | 1 | — |
| Miroir sphérique concave paraxial | noir | 1 | bleu |
| Miroir sphérique convexe paraxial | noir | 1 | bleu |
| Miroir sphérique concave réel | noir | 1 | bleu |
| Miroir sphérique convexe réel | noir | 1 | bleu |
| Miroir cônique | noir | INCERTAIN : `epaisseurmiroirconique` n'est initialisée ni au lancement ni par « Rétablir » | bleu |
| Lentille mince convergente idéale | bleu | 1 | fuchsia |
| Lentille mince divergente idéale | bleu | 1 | fuchsia |
| Lentille épaisse | cyan (`clAqua`) | 1 (non modifiable) | rouge |
| Polyhèdre réfractant | cyan | 1 (non modifiable) | — |
| Polycercle réfractant | cyan | 1 (non modifiable) | — |
| Sphère réfractante | cyan | 1 (non modifiable) | — |
| Prisme | cyan | 1 (non modifiable) | — |
| Rayon unique | rouge | 1 | — |
| Onde plane | rouge | 1 | — |
| Source ponctuelle | rouge | 1 | — |
| Ecran | noir | **2** | — |
| Lame semi-réfléchissante | noir | 1 | — |
| Diaphragme | noir | 1 | — |
| Oeil | vert (#008000) | 1 | — |
| Fléche | noir | 1 | — |
| Texte | police par défaut (non modifiable par couleur) | — | — |
| Réseau | bleu | 1 | — |

Hors préférences, initialisés de la même façon : texte noir et taille 10 (`couleurtexte`, `taillefontetexte`), mesure d'angle et mesure de distance noires d'épaisseur 1 (`unit222.pas:40215-40220`). **Police par défaut** : celle de la fenêtre principale, nom « Default » (police système de l'interface) (`ray1.pas:424-425`, `ray1.lfm:11`). « Rétablir » ne la remet pas à zéro.

#### F3.2 Onglet 1 « Element par élément » (`unit17.pas:807-808`)

Disposition (positions du `.lfm`) : en haut, trois colonnes « Type d'élément », « Couleur par défaut », « Couleur axe par défaut » ; en dessous, « Epaisseur par défaut » et « Police par défaut » ; le bouton « Rétablir » en bas à gauche.

| # | Libellé exact | Type | Comportement |
|---|---|---|---|
| 1 | « Type d'élément » (`unit17.pas:779-780`) | liste déroulante fermée | les 23 entrées, dans cet ordre (`unit17.pas:816-838`) : « Miroir plan », « Miroir sphérique concave paraxial », « Miroir sphérique convexe paraxial », « Miroir sphérique concave réel », « Miroir sphérique convexe réel », « Miroir cônique », « Lentille mince convergente idéale », « Lentille mince divergente idéale », « Lentille épaisse », « Polyhèdre réfractant », « Polycercle réfractant », « Sphère réfractante », « Rayon unique », « Onde plane (faisceau parallèle) », « Source ponctuelle », « Ecran », « Lame semi-réfléchissante », « Diaphragme », « Oeil », « Fléche », « Texte », « Prisme », « Réseau ». Changer d'entrée met à jour les trois réglages ci-dessous (`unit17.pas:95-453`). |
| 2 | « Couleur par défaut » (`:783-784`) : pastille + bouton « Modifier » | sélecteur de couleur | grisé pour « Texte » (`:436`) ; ouvre le sélecteur de couleur du système et **applique tout de suite** (`:473-662`) |
| 3 | « Couleur axe par défaut » (`:791-792`) : pastille + « Modifier » | sélecteur de couleur | actif seulement pour les 4 miroirs sphériques, le miroir cônique, les 2 lentilles minces et la lentille épaisse (`:664-727`) ; sinon grisé et pastille couleur du fond |
| 4 | « Epaisseur par défaut » (`:787-788`) | nombre à flèches | **1 à 10** px (`unit17.lfm:124-125`) ; appliqué à chaque changement (`:847-942`) ; grisé pour la lentille épaisse, le polyèdre, le polycercle, la sphère, le prisme et le texte |
| 5 | « Police par défaut » (`:795-796`) : zone de texte + « Modifier » | sélecteur de police | actif seulement pour « Texte » (`:445`). La zone affiche « Nom: … », « Taille: … », puis « Souligné », « Gras », « Italique », « Barré » selon le style (`:464-470`). |
| 6 | « &Rétablir les valeurs d'origine de tous les éléments » (`:741-742`) | bouton | remet toutes les valeurs du § 3.1, revient à « Miroir plan », **laisse la fenêtre ouverte** (`modalresult:=0`, `:983`) |

#### F3.3 Onglet 2 « Pour tous les éléments » (`unit17.pas:811-812`)

Phrase d'en-tête : « Indiquer ici les propriétés communes à appliquer à tous les éléments: » (`:799-800`). Chaque réglage **écrase** aussitôt la valeur de plusieurs types, puis remet l'onglet 1 sur « Miroir plan ».

| # | Libellé | Type | Effet exact |
|---|---|---|---|
| 1 | pastille + « Modifier » (colonne de gauche) | sélecteur de couleur | couleur des miroirs plan, sphériques et cônique, du réseau, des lentilles minces et épaisse, du polyèdre, du polycercle, du prisme, de la sphère, de l'écran, de la lame, du diaphragme et de la flèche (`unit17.pas:1117-1148`). **Ni** l'œil, **ni** les sources, **ni** le texte. Valeur de départ de la pastille : noir (`unit222.pas:40258`). |
| 2 | pastille + « Modifier » (colonne du milieu) | sélecteur de couleur | couleur d'axe des 4 miroirs sphériques, du miroir cônique et des 3 lentilles (`:1150-1170`). Pastille de départ : rouge (`unit222.pas:40258`). |
| 3 | « Couleur rayon par défaut » (`:803-804`) : pastille + « Modifier » | ouvre `unit18` (§ 3.6) | couleur du rayon unique, de l'onde plane et de la source ponctuelle (`:1172-1208`). Pastille de départ : rouge. |
| 4 | nombre à flèches sous la colonne de gauche | 1 à 10 | épaisseur de tous les types qui en ont une, œil et sources compris (`:1210-1232`). Valeur de départ : 1. |
| 5 | zone de texte sous la colonne du milieu | affichage | description de la police par défaut |

INCERTAIN : le `.lfm` de cet onglet n'a **aucun libellé** pour les réglages 1, 2 et 4 (seulement les pastilles et les boutons « Modifier » ; `unit17.lfm:179-263`), et aucun bouton pour changer la police : la procédure `boutonpolice1Click` (`unit17.pas:1234`) n'est reliée à aucun bouton. Le port doit ajouter des libellés : proposition « Couleur des éléments », « Couleur des axes », « Couleur des rayons », « Épaisseur des traits ».

#### F3.4 Boutons de la fenêtre

- « &OK » (`unit17.pas:732-734`) : ferme la fenêtre. Il **n'applique rien de plus** : tout a déjà été appliqué en direct (`BitBtn1Click` vide, `:455-458`). Il n'y a **pas de bouton Annuler**, ni de croix (`BorderIcons = []`).
- « &Ok et enregistrer sur disque » (`:737-738`) : écrit le fichier de configuration personnel (§ 3.5) puis ferme. En cas d'échec d'écriture : « Impossible d'écrire le fichier de configuration %s. La configuration ne sera pas sauvegardée. », titre « Hélas... » (`:996-998`). INCERTAIN : le bouton étant de genre `bkYes` (`unit17.lfm:272`), (LCL) il a probablement un `ModalResult` implicite et ferme aussi la fenêtre après l'échec.

#### F3.5 Ce qui est enregistré

Rien dans le `.opt`. Le fichier de configuration **personnel** `perso.cfg` (`unit_commune.pas:141`, dans le dossier de configuration de l'utilisateur) reçoit, dans l'ordre (`unit17.pas:1001-1111`) : le répertoire personnel, le dernier répertoire utilisé, puis par type la couleur, l'épaisseur et la couleur d'axe selon le type, la police (jeu de caractères, couleur, nom, taille, gras, italique, souligné, barré, chasse), le prisme et le réseau. Il est relu au lancement (`ray1.pas:565-703`).

Lacunes de l'original, à connaître pour la compatibilité : l'épaisseur n'est pas enregistrée pour la lentille épaisse, le polyèdre, le polycercle, la sphère et le prisme ; l'épaisseur du miroir cônique est écrite (`unit17.pas:1032`) et relue (`ray1.pas:608`).

**Les préférences changées avec « OK » seul finissent souvent sur le disque quand même** : `perso.cfg` est réécrit à **chaque ouverture d'une simulation** (`ray1.pas:8203-8210`) et par « Définir le répertoire personnel » (`ray1.pas:13190`).

#### F3.6 `unit18` — « Couleur par défaut » (couleur des rayons)

- Classe `Tsaisiecouleurrayondefaut`. Titre « Couleur par défaut » (`unit18.pas:65`).
- Ouverture : bouton « Modifier » sous « Couleur rayon par défaut », onglet 2 des Préférences (`unit17.pas:1172-1175`). La fenêtre est **recréée à chaque fois**, donc toujours sur « Rouge ».
- Contrôles : boutons radio « Couleur » (`unit18.pas:68`) : « Rouge », « Vert », « Bleu », « Blanc » (`unit18.pas:69-72`), défaut « Rouge » (`unit18.lfm:32`) ; bouton « &OK ». Ni Annuler, ni croix : valider sans rien toucher remet les rayons en rouge.
- Effet : rouge `clRed`, vert `clGreen`, bleu `clBlue`, **blanc → `clBlack`** (lumière blanche) (`unit17.pas:1176-1201`).

**Adaptation web/tablette (§ 3 entier)** :
- Garder les deux onglets, mais les présenter en **liste d'éléments** : une ligne par type (nom, pastille de couleur, pastille d'axe si le type en a une, épaisseur), au lieu de la liste déroulante unique. Toucher une pastille ouvre un sélecteur à **palette de pastilles dessinées** (les couleurs de base d'OptGeo + un `<input type="color">` pour les autres), car le sélecteur de couleur natif est inégal sur les tablettes Android anciennes.
- Couleur des rayons : quatre boutons à pastille (Rouge, Vert, Bleu, Blanc), jamais un sélecteur libre. Le calcul ne connaît que ces quatre couleurs.
- Police : liste de polices **présentes sur l'appareil** (aucune police téléchargée : pas d'Internet sur l'ASRock), taille, gras, italique, souligné, barré ; aperçu.
- Persistance : remplacer `perso.cfg` par un enregistrement local du navigateur (préférences de **cet appareil**), avec repli silencieux si le stockage est indisponible. Proposition de libellés : « Valider » (applique pour la session) et « Valider et mémoriser sur cet appareil ». Ne pas reproduire l'écriture automatique à l'ouverture d'un fichier. Proposition facultative : « Exporter / importer mes préférences » (fichier JSON téléchargé ou ouvert depuis l'appareil).
- Ajouter « Annuler » (retour aux valeurs d'avant l'ouverture) : écart assumé, l'original applique en direct sans retour possible.
- Ajouter les libellés manquants de l'onglet 2 (§ 3.3).

---

### F4. Couleur de fond ou image de fond (dialogues standard)

- Pas d'unité dédiée : gestionnaire `Couleurdefond1Click` (`ray1.pas:11149-11186`).
- Ouverture : Options > « Couleur de fond ou image de fond » (`ray1.pas:4399-4400`).
- Étape 1 : question `QuestionDlg`, titre « Choix du fond », message « Choisissez: », deux boutons « Couleur unie » et « Image de fond » (ce dernier par défaut) (`ray1.pas:11153-11154`). Échap ou fermeture = abandon. La palette d'outils et l'éditeur de commentaire sont masqués pendant la question, puis la palette réapparaît.
- « Couleur unie » : sélecteur de couleur du système, initialisé avec la couleur actuelle (`ray1.pas:11156`). Si l'on valide : nouvelle couleur de fond, l'image de fond est abandonnée, état empilé pour l'annulation (`ray1.pas:11158-11162`) ; retracé.
- « Image de fond » : ouverture d'un fichier, filtre « Image jpg|*.jpg|Image png|*.png » (`ray1.lfm:2076`), dossier de départ = répertoire des exemples (`ray1.pas:11170`). Si l'on choisit un fichier, il devient l'image de fond, puis retracé (`ray1.pas:11175-11178`). **Pas** d'entrée dans l'historique d'annulation.
- Rendu de l'image : dessinée **à sa taille en pixels, collée au coin haut-gauche** de la zone de dessin, sans mise à l'échelle, par-dessus un rectangle de la couleur de fond (`monbitmap.pas:1225-1238`) ; aussi à l'impression (`monimprimante.pas:948-953`). Les simulations ne sont pas recalées sur l'image.
- Défaut : fond blanc (`unit222.pas:40252`), sans image.
- Enregistré dans le `.opt` : **seulement la couleur** (`couleur fond simulation`, `ray1.pas:8120-8121`). L'image de fond n'est **ni enregistrée** dans le fichier **ni gardée** dans l'historique d'annulation : elle est perdue à la réouverture. Elle est oubliée par « Nouvelle simulation » (`ray1.pas:7467-7468`), qui garde en revanche la **couleur** de fond ; l'ouverture d'un fichier remet le fond en blanc avant lecture (`ray1.pas:7328`, `8233`).

**Adaptation web/tablette** : une seule boîte « Fond de la simulation » avec deux choix, « Couleur unie » (palette de pastilles + sélecteur) et « Image » (`<input type="file" accept="image/png,image/jpeg">`, qui ouvre aussi l'appareil photo sur tablette), plus « Annuler ». Garder le calage en haut à gauche à l'échelle 1 pixel d'image = 1 pixel de la zone de dessin, ou, **proposition** plus utile sur des écrans de tailles différentes : image ajustée à l'espace de travail ; à faire trancher par l'enseignant. Image gardée dans la sauvegarde automatique locale ; **pas** dans le `.opt` téléchargé (compatibilité), et le dire à l'utilisateur à l'enregistrement. Entrée dans l'historique d'annulation (écart assumé).

---

### F5. `unit19` — Empennage des rayons

- Classe `Tsaisieempennage`. Titre « Propriétés de l'empennage des rayons » (`unit19.pas:72`).
- Rôle : la petite flèche (deux traits en V) dessinée sur **chaque segment** de rayon pour indiquer le sens de propagation.
- Ouverture : Options > « Empennage des rayons » (`ray1.pas:4455-4456`) → `Empennagedesrayons1Click` (`ray1.pas:11236-11253`), champs remplis avec les valeurs actuelles (`ray1.pas:11239-11240`).

| # | Libellé exact | Type | Unité | Défaut | Bornes |
|---|---|---|---|---|---|
| 1 | « Position de l'empennage sur le segment: » (`unit19.pas:80`), puis « (en 1000éme de la taille du segment) » (`:76`) | nombre à flèches (`spinposition`) | millièmes de la longueur du segment, compté depuis son début | **500** (milieu) (`unit222.pas:40257`) | 0 à 1000 (`unit19.lfm:75` ; minimum non déclaré, donc 0) |
| 2 | « Taille de l'empennage: » (`:84`), puis « (en 1000éme de la diagonale de l'espace de travail) » (`:88`) | nombre à flèches (`SpinEdit1`) | millièmes de la diagonale de l'espace de travail | **5** (`unit222.pas:40257` ; le `.lfm` dit 10, valeur jamais visible car l'appelant remplit le champ) | 0 à 1000 (`unit19.lfm:89`) |
| 3 | « &OK » | bouton par défaut | — | — | — |

Dessin (`unit222.pas:31092-31117`) : au point situé à `position/1000` du segment, deux traits de longueur `taille/1000 × diagonale de l'espace / zoom`, orientés à ±135° de la direction du segment (une pointe qui suit le sens de propagation), de même couleur et même épaisseur que le segment. Taille 0 = pas d'empennage visible.

Boutons : OK seul, ni Annuler ni croix. Effet : nouvelles valeurs, état empilé pour l'annulation, retracé (`ray1.pas:11246-11252`).

Enregistré dans le `.opt` : bloc `empennage` / `position` / `taille` (`ray1.pas:8122-8126`). Remis à 500 et 5 à chaque ouverture d'un fichier, avant lecture (`metazero`, `ray1.pas:7332-7333`, appelé en `ray1.pas:8233`) ; **pas** remis à zéro par « Nouvelle simulation ».

**Adaptation web/tablette** : deux curseurs avec valeur numérique éditable (0–1000) et **aperçu en direct** sur la simulation ; boutons « Valider » et « Annuler » (Annuler absent de l'original : écart assumé). Proposition : case « Afficher l'empennage » équivalant à taille = 0.

---

### F6. `fiche_affiche_coordonees` — « Coordonnées des segments »

- Classe `Tfiche_coordonnees_segments`. Titre « Coordonnées des segments » (`fiche_affiche_coordonees.pas:40`).
- Rôle : tableau de tous les **segments de rayons calculés** (chaque morceau rectiligne d'un trajet lumineux), avec leurs extrémités, leur longueur et leur direction.
- Ouverture : bouton « Coord. » (`ray1.pas:4661-4662`), infobulle « Afficher les coordonnées  et les longueurs des segments » (`ray1.pas:4665-4666`), dans la 2e barre d'outils, groupe « Afficher: » (`ray1.lfm:853-895`) → `SpeedButton2Click` (`ray1.pas:13210-13240`). Le bouton est grisé pendant une construction (`ray1.pas:4780`, `4867`).

Contenu du tableau (`ray1.pas:13217-13235`), 7 colonnes, une ligne d'en-tête puis une ligne par segment, dans l'ordre du calcul :

| Colonne | En-tête exact (en dur, pas de `rs`) | Contenu |
|---|---|---|
| 0 | `Segment` | numéro 1…N |
| 1 | `x1 (en ` + unité + `)` | abscisse du début |
| 2 | `y1 (en ` + unité + `)` | ordonnée du début |
| 3 | `x2 (en ` + unité + `)` | abscisse de la fin |
| 4 | `y2 (en ` + unité + `)` | ordonnée de la fin |
| 5 | `Longueur (en ` + unité + `)` | √((x1−x2)² + (y1−y2)²) |
| 6 | `Angle polaire (en radians)` | angle de la direction (x2−x1, y2−y1), ramené dans [0 ; 2π[ (`donneanglepolairedans02pi`) |

Les nombres sont affichés en **pleine précision** (`floattostr`) ; les colonnes s'ajustent à leur contenu (`AutoSizeColumns`).

Interactions :
- Pendant que la fenêtre est ouverte, le **numéro de chaque segment** est écrit au milieu du segment sur le dessin (`montrernumerossegments:=true`, `ray1.pas:13237` ; police Arial Narrow 10 noire, `unit222.pas:31097-31103`).
- Survoler ou cliquer une ligne **surligne** le segment correspondant sur le dessin : trait vert, 4 fois plus épais, tirets-points (`fiche_affiche_coordonees.pas:56-82`).
- Fermer la fenêtre efface les numéros et retrace (`:44-49`).
- Fenêtre modale, redimensionnable, sans bouton (fermeture par la croix).

INCERTAIN / défaut : le test `if not(nombretotalsegment)>0 then exit` (`ray1.pas:13213`) applique un `not` binaire à un entier et ne sort jamais ; sans segment, la fenêtre s'ouvre avec le seul en-tête. Les segments « fantômes » masqués (option Rayons fantomes) figurent quand même dans le tableau.

Enregistré : rien.

**Adaptation web/tablette** : panneau **non modal** (bas de l'écran sur téléphone, côté droit sur tablette en paysage et ordinateur) pour voir le dessin et le tableau ensemble ; en-têtes figés, défilement horizontal **dans le tableau** seulement ; toucher une ligne = surlignage (le survol n'existe pas au doigt), toucher un segment du dessin = ligne correspondante mise en évidence (proposition). Nombres arrondis à l'affichage (proposition : 4 chiffres significatifs, pleine précision dans l'infobulle et la copie). Proposition : bouton « Télécharger en CSV » (séparateur `;`, virgule décimale, pour tableur français). Sans segment : message « Aucun rayon calculé » au lieu d'un tableau vide.

---

### F7. `unit32` — éditeur du commentaire de la simulation

- Classe `TFormEditeur`, variable `FormEditeur`. Titre de conception « Editeur de texte » (`unit32.pas:104`), aussitôt remplacé : « Commentaires sur la simulation de titre non précisé... » au lancement (`optgeo.lpr:170`, `rsCommentaires`), « Commentaires sur la simulation de nom non précisé... » après Nouvelle simulation (`ray1.pas:7458`), « Commentaires sur la simulation %s » après un enregistrement (`ray1.pas:8139`, nom complet du fichier), « Commentaires sur la simulation %sopt » après une ouverture (`ray1.pas:9156`).
- Rôle : texte libre accompagnant la simulation (consignes, explications).
- Ouverture (fenêtre **non modale**, `show`) : Edition > « Editer le commentaire de la simulation » (`ray1.pas:4443-4444`, `10698-10702`) ; Ajouter > Divers > « Commentaire sur la simulation » (`ray1.pas:4387-4388`, `10719-10722`) ; bouton de la 2e barre d'outils d'infobulle « Ajouter (ou éditer) le commentaire de la simulation » (`ray1.pas:4657-4658`, `10626-10630`). Elle s'ouvre aussi toute seule à l'ouverture d'un fichier qui a un commentaire (`ray1.pas:9156-9161`).
- Contrôles : une zone de texte multiligne qui occupe toute la fenêtre (texte brut, police « Sans ») ; une barre d'état qui montre le nom du fichier de commentaire (vide au départ ; `untitled.txt` dans le `.lfm`). Aucun menu, aucun bouton.
- Fermeture : la croix **ne ferme pas**, elle **réduit** la fenêtre (`unit32.pas:111-116`). « Nouvelle simulation » vide le texte et réduit la fenêtre (`ray1.pas:7455-7457`) ; ouvrir une simulation sans commentaire la laisse réduite.
- Modification : toute frappe marque le commentaire comme modifié (`commentaire_change`, `unit32.pas:123-126`), ce qui déclenche, comme une modification du dessin, l'avertissement « La simulation a été modifiée et les modifications n'ont pas été sauvegardées. Voulez vous vraiment commencer une nouvelle simulation ? » (`ray1.pas:7415-7418`).
- Enregistré : **pas dans le `.opt`**, dans un fichier texte à côté, de même nom avec l'extension `.txt` (`ray1.pas:8133-8134`). Échec : « Impossible de sauver le commentaire », titre « Erreur d'écriture sur le disque » (`ray1.pas:8136-8137`). À l'ouverture : on cherche `nom.txt`, sinon `nom.rtf` (ancien format, converti en texte brut, `unit32.pas:72-81`) (`ray1.pas:9145-9149`).

**Adaptation web/tablette** : panneau « Commentaire » rétractable (tiroir latéral sur tablette et ordinateur, plein écran sur téléphone), qu'on peut toujours rouvrir et jamais « fermer » en perdant le texte ; ouvert automatiquement quand une simulation chargée a un commentaire. Texte brut, `<textarea>` avec correcteur orthographique du navigateur. Compris dans la sauvegarde automatique locale. Pour la compatibilité des fichiers, **proposition** à faire trancher : à l'enregistrement, télécharger le `.opt` et, si le commentaire n'est pas vide, un `.txt` de même nom ; à l'ouverture, accepter la sélection simultanée du `.opt` et de son `.txt` (ou `.rtf`), ou ouvrir le `.txt` ensuite depuis le panneau.

---

### F8. `unit_quelobjet` — choix d'un objet parmi plusieurs

- Classe `TForm_quelobjet`, variable `Form_quelobjet`. Titre de conception « Propriétés de l'objet: » (`unit_quelobjet.pas:44`), remplacé selon l'action (ci-dessous).
- Rôle : quand l'utilisateur clique à un endroit où **plusieurs objets ont une poignée** (zone de tolérance autour de chaque poignée), demander lequel il vise.
- Ouverture, uniquement s'il y a **plus d'un** candidat :

| Action | Procédure | Titre exact | Liste ouverte à |
|---|---|---|---|
| Déplacer un élément (mode modification) | `DebutModif` (`unit222.pas:10839`) | « Choix de l'objet: » (`unit222.pas:14757`) | `unit222.pas:14824` |
| Supprimer un élément | `effectuesuppression` (`unit222.pas:14966`) | « Choisissez l'objet à supprimer: » (`unit222.pas:16341`) | `unit222.pas:16409` |
| Propriétés d'un élément | `Info` (`unit222.pas:16875`) | « Propriétés de l'objet: » (`unit222.pas:18485`) | `unit222.pas:18554` |
| Dupliquer un élément | `Info` en mode duplication | « Objet à dupliquer: » (`unit222.pas:18486`) | `unit222.pas:18554` |

Contrôles : une liste déroulante fermée, et « &OK » à droite (`unit_quelobjet.pas:42`). Une entrée par candidat, dans l'ordre de détection, au format « Type n° k », où k est le numéro de l'objet dans sa catégorie (`unit222.pas:14758-14820`, `16342-16404`, `18487-18548`) : « Mesure de distance n° %s », « Prisme n° %s », « Miroir plan n° %s », « Réseau n° %s », « Miroir concave idéal n° %s », « Miroir convexe idéal n° %s », « Miroir concave  n° %s » (deux espaces dans l'original), « Miroir convexe n° %s », « Lentille mince convergente n° %s », « Lentille mince divergente n° %s », « Rayon n° %s », « Source ponctuelle n° %s », « Onde plane n° %s », « Ecran n° %s », « Lame semi réfléchissante n° %s », « Polyhèdre réfractant n° %s », « Sphère réfractante n° %s », « Miroir cônique n° %s », « Texte n° %s », « Diaphragme n° %s », « Lentille épaisse n° %s », « Mesure d'angle n° %s », « Polycercle réfractant n° %s », « Fléche n° %s », « Oeil n° %s », « Néant n° %s », « Groupe n° %s ». La liste des propriétés et de la duplication ajoute « Point n° %s » (`unit222.pas:18539`). Un même objet peut apparaître deux fois s'il a deux poignées proches du clic.

Sélection : la liste est vidée avant remplissage, donc **aucune entrée n'est choisie** à l'ouverture. Valider sans choisir donne :
- en déplacement, l'objet **détecté en dernier** (les variables gardent la dernière détection, `unit222.pas:14825`) ;
- en suppression, **rien** n'est supprimé (`unit222.pas:16410-16414`) ; sinon confirmation « Etes-vous sur de vouloir supprimer %s ? » (« cette onde plane », etc.), titre « Attention ! » (`unit222.pas:16418-16420`) ;
- en propriétés et duplication, rien (`typeelementmodif:=mdneant`, `unit222.pas:18560-18562`).

La croix de fermeture existe (`BorderIcons = [biSystemMenu]`) ; elle a le même effet que valider sans choisir. Rien n'est enregistré.

**Adaptation web/tablette** : petite liste **posée près du point touché** (popover), une ligne de 44 px par candidat, toucher une ligne = choix immédiat (pas de bouton OK), « Annuler » explicite ; surligner sur le dessin l'objet de la ligne survolée ou pressée (proposition). Au doigt, la zone de tolérance est plus grande qu'à la souris : cette liste sera plus souvent utile ; la tolérance tactile est à fixer au §12.4. Valider sans choix = Annuler dans les quatre cas (écart assumé pour le déplacement).

---

### F9. `saisieptssurfaceonde` — Surfaces d'onde (gestionnaire demandé, unité hors de la liste)

- Classe `Tsaisiepointssurfaceonde`. Titre « Pour le tracé des surfaces d'onde: » (`saisieptssurfaceonde.pas`, `FormCreate` : `rsPourLeTracDe`).
- Ouverture : Options > « Surfaces d'onde » (`ray1.pas:4705-4706`) → `Surfacesdonde1Click` (`ray1.pas:10685-10696`), champ rempli avec la valeur actuelle.
- Contrôle : « Nombre de points calculés pour tracer une surface d'onde: » ; nombre à flèches **2 à 500**, défaut **20** (`saisieptssurfaceonde.lfm:33-36` ; `unit222.pas:40251` ; `ray1.pas:7452`) ; « &OK ». Pas d'Annuler, pas de croix.
- Effet : nouvelle valeur, retracé (`ray1.pas:10695`). Pas d'entrée dans l'historique d'annulation.
- Enregistré dans le `.opt` : `NOMBRE POINTS TRACE SURFACE ONDE` (`ray1.pas:7591-7592`). Remis à 20 par « Nouvelle simulation ».

**Adaptation web/tablette** : champ nombre 2–500 avec − / + ; « Valider » / « Annuler ». Avertir qu'une valeur élevée ralentit le tracé sur tablette (proposition, seuil à mesurer).

---

### F10. `unit4` — « A propos de ce logiciel »

- Classe `TForm4`, variable `Form4`. Titre « A propos de ce logiciel » (`unit4.pas:91`).
- Ouverture : Aide > « A propos » (`ray1.pas:4234`) → `Apropos2Click` (`ray1.pas:10639-10650`).
- Contenu, dans l'ordre (`unit4.pas:94-121`) : « OptGeo, logiciel de simulation d'optique géométrique » ; « à deux dimensions,  libre et gratuit, sous license GPL. » ; « Version 3.03 du 14/04/2025, écrite en Lazarus » ; « Copyright Jean-Marie Biansan, 2004, 2018 » ; « Pour toute remarque, cliquer sur: » ; lien « jeanmarie.biansan@free.fr » (ouvre la messagerie, sous Windows seulement, `unit4.pas:130-135`) ; « Vérifier que vous avez la dernière version ? Cliquer sur: » ; lien « Site Web de l'auteur » (ouvre `http://jeanmarie.biansan.free.fr/logiciel.html` dans le navigateur, `unit4.pas:137-165`) ; « En cliquant sur le bouton "OK", vous déclarez accepter les termes » / « de la license GNU GPL ».
- Boutons : « &OK » et « Annuler ». L'appelant quitte le programme si la réponse est `mrNo` (`ray1.pas:10648`) ; or « Annuler » renvoie `mrCancel` (`unit4.lfm` : `ModalResult = 2`). Les deux boutons ferment donc simplement la fenêtre ; le programme ne quitte jamais.
- Enregistré : rien.

**Adaptation web/tablette** : page ou boîte « À propos » avec le texte d'origine (titre et accents corrigés : « À propos de ce logiciel »), **plus** la mention du portage web (auteur du portage, date, licence GPL, lien vers le code source exigé par la GPL, servi localement). Un seul bouton « Fermer » ; supprimer la phrase « En cliquant sur OK, vous déclarez accepter… » (le bouton ne fait rien de tel). Le serveur de l'ASRock n'a pas Internet : afficher l'adresse du site et le courriel de l'auteur en **texte** (un lien `mailto:` est acceptable), avec la mention « nécessite une connexion à Internet » pour le site.

---

### F11. `unitgpl` — « License GPL »

- Classe `TFormgpl`. Titre « License GPL » (`unitgpl.pas:60`, en dur).
- Ouverture : Aide > « License GPL » (`ray1.pas:4507-4508`) → `LicenseGPL1Click` (`ray1.pas:13197-13208`).
- Contenu : zone de texte en **lecture seule**, défilable, remplie avec le fichier `gpl.txt` du répertoire d'installation (`ray1.pas:13206`) : le texte anglais de la GNU GPL. Aucun bouton : fermeture par la croix.
- Enregistré : rien.

**Adaptation web/tablette** : page servie localement (texte de `gpl.txt` embarqué dans l'application), police à chasse fixe, retour à la ligne automatique, bouton « Fermer » ; proposition : lien vers une traduction française non officielle, également embarquée, en précisant que seul le texte anglais fait foi.

---

### F12. Assistants de création (petites boîtes ouvertes pendant la construction d'un objet)

Elles ne sont pas des boîtes de propriétés, mais des questions posées au milieu d'une construction à la souris. À relier au §5.

#### F12.1 `unit5` — « Nombre de rayons »

- Classe `Tsaisienombrerayons`. Titre « Nombre de rayons » (`unit5.pas`, `rsNombreDeRayo3`).
- Ouverture : dans `Image1MouseDown`, au dernier clic de création d'une **onde plane** (`ray1.pas:2037`) ou d'une **source ponctuelle** (`ray1.pas:2091`).
- Contrôles : texte réaffecté par l'appelant selon le cas : « Nombre de rayons émis par cette source ponctuelle » ou « Nombre de rayons convergents vers cet objet virtuel » (`ray1.pas:2084-2088`). Pour l'onde plane, il garde son texte de création « Nombre de rayons émis par cette source ponctuelle: » (`unit5.pas`, `rsNombreDeRayo4`) : INCERTAIN, sans doute un oubli (ou le texte laissé par une source créée plus tôt). Nombre à flèches **2 à 50**, défaut **5** (`unit5.lfm:35-39`), valeur gardée d'une fois à l'autre ; « &OK » seul.
- Effet : nombre de rayons de l'objet créé (`nbsaisie`).

#### F12.2 `unit8` — « Nombre de sommets »

- Classe `Tsaisienombresommet`. Titre « Nombre de sommets ».
- Ouverture : bouton polyèdre (`boutonpolyClick`, `ray1.pas:6428`) et Ajouter > Système optique réel > « Polyhèdre réfractant » (`ray1.pas:7213`), cadre « Sommets de ce polyhèdre », minimum **3** ; bouton polycercle (`ray1.pas:10597`) et menu « Polysphère réfractante » (`ray1.pas:7145`), cadre « Sommets de cette polysphère » / « Sommets de cette polysphére » selon l'appelant, minimum **2**.
- Contrôles : « Nombre: » ; nombre à flèches, défaut 4 (`unit8.lfm:54`), maximum **500** (`maxsommet`, `definitions.pas:11`, imposé par `unit8.pas`, le `.lfm` disait 50) ; « &OK » seul. Les appelants testent `mrCancel` (`ray1.pas:6428`, `10597`), cas impossible faute de bouton Annuler ou de croix.

#### F12.3 `unit12` — « Saissez le diamètre de la lentille »

- Classe `Tsaisiediametre`. Titre exact « Saissez le diamètre de la lentille » (faute d'origine).
- Ouverture : création d'une **lentille épaisse**, après les points (`ray1.pas:1667-1681`) ; barre d'état « Saisissez le diamètre de la lentille... ».
- Contrôles : cadre « Saisissez » ; « Diamètre= », champ texte vide, puis l'unité (`log1` = `unitelongueur`, `ray1.pas:1679`) ; « &OK ». Valeur non numérique : « Ceci n'est pas une valeur numérique acceptable ! », titre « Attention !! », puis la boîte **revient** jusqu'à une saisie valide (`repeat … until showmodal=mrok`, `ray1.pas:1680-1681`). Données incohérentes ensuite : « Données aberrantes! » (`ray1.pas:1699`).

#### F12.4 `unit15` — « Relier les points »

- Classe `Tsaisiejoindre`. Titre « Relier les points ».
- Ouverture : création d'un **polycercle** (polysphère), une fois **par côté**, après la pose de tous les sommets (`ray1.pas:1347-1359`).
- Contrôles : boutons radio dont le titre est réaffecté à chaque côté : « Relier les points %s et %s par: » (k et k+1, puis le dernier et 1) (`ray1.pas:1352-1357`) ; choix « Un arc de cercle » (défaut au premier affichage) et « Un segment de droite » ; « &OK ». Le choix est **gardé** d'un côté au suivant. Ensuite, pour chaque côté en arc, l'utilisateur clique le sommet de l'arc (barre d'état « Positionnez le sommet d'arc de cercle suivant... », `ray1.pas:1365`).

**Adaptation web/tablette (§ 12)** : feuille modale compacte en bas de l'écran sur tablette et téléphone, pour que le dessin en cours reste visible ; « Annuler la construction » partout (absent de l'original : écart assumé). § 12.4 : remplacer les N boîtes successives par **une seule** liste des côtés (« côté 1–2 : arc / segment »), chaque côté surligné sur le dessin, avec « tout en arcs » / « tout en segments ». § 12.3 : garder la boîte ouverte avec le message d'erreur sous le champ.

---

### F13. Boîtes de propriétés d'objets de la liste (identification seulement)

Spécifiées au §10 : `unit6` en 10.B-2.7, `unit9` et `unit10` en 10.B-2.16 et 10.B-2.17, `unit13` et `unit14` en 10.M.

| Unité | Classe (variable) | Titre exact | Ouverte depuis |
|---|---|---|---|
| `unit6` | `Tsaisiepolyhedre` | « Propriétés de ce polygône » ; bouton « Supprimer ce polygône » | création d'un polyèdre (`ray1.pas:7241`) ; propriétés (`unit222.pas:18922`) |
| `unit9` | `Tsaisietexte` | « Saisir le texte à afficher » (cadres « Texte », « Police ») | bouton texte (`boutontexteClick`, `ray1.pas:10404`) |
| `unit10` | `Tsaisietexte2` | « Saisir le texte à afficher » ; « Coordonnées du point supérieur gauche du texte » ; « Supprimer ce texte » | Ajouter > Divers > Texte sur le dessin (`ray1.pas:10435`) ; propriétés (`unit222.pas:18797`) |
| `unit13` | `Tsaisiemetre` | « Modification d'une mesure de distance » ; « Coordonnées du 1er point », « Coordonnées du 2nd point » ; « Supprimer cette distance » | Ajouter > Divers > Mesure de distance (`ray1.pas:10743`) ; propriétés (`unit222.pas:18588`) |
| `unit14` | `Tsaisieangle` | « Modification d'une mesure d'angle » ; 1er point, 2nd point, « Coordonnées de C » ; « Supprimer cet angle » | Ajouter > Divers > Mesure d'angle (`ray1.pas:10768`) ; propriétés (`unit222.pas:18751`) |

---

### F14. `unit3` — « Propriétés des points » (code mort)

- Classe `Tproprietespoints`, créée au lancement (`optgeo.lpr:111`), mais **jamais ouverte** : aucun `show` ni `showmodal` dans `ray1.pas`, `unit222.pas` ni ailleurs.
- Contenu pour mémoire : « Style des points » (« Croix  oblique », « Croix droite », « Disque », « Cercle »), « Taille des points » (1 à 20), « Couleur des points », « Point courant » / « Repérer », « Grille de repérage » / « Tracer » (`unit3.pas:83-136`).
- Les variables qu'elle réglerait gardent leurs valeurs de lancement : taille 3, croix droite, bleu, repérage actif (`unit222.pas:40176-40179`).

**Adaptation web/tablette** : ne pas porter (écran inaccessible dans l'original).

---

### F15. `unit17b` — écran de démarrage

- Classe `Tsplashscreen` (`FormStyle = fsSplash`). Titre « Splashscreen ». Affiché au lancement, **avant** la création des autres fenêtres, avec une pause d'une seconde (`optgeo.lpr:99-107`).
- Texte (`unit17b.pas`, `FormCreate`) : « Optgeo » ; « Logiciel libre et gratuit de simulation d'optique géométrique plane » ; « Version 3.03 du 14/04/2025 » ; « Auteur: Jean-Marie Biansan ». Fond cyan ; le `.lfm` contient encore les textes d'un autre logiciel de l'auteur (Dozzzaqueux), remplacés au démarrage.
- INCERTAIN : quand il disparaît. Aucune instruction ne le masque ; il est libéré à la fin du programme (`optgeo.lpr:172-175`).

**Adaptation web/tablette** : voir § 16.

---

### F17. Récapitulatif des points INCERTAIN

1. `unit11.lfm:206` : neuvième unité vide dans la liste des unités (non reprise).
2. Effet de « Ajuster automatiquement » quand le rapport est respecté (`ray1.pas:11061-11093`).
3. Lumière blanche (noir) : choix de l'indice ambiant et de la longueur d'onde (`unit222.pas:32089-32108`, `5213`) ; à confirmer avec le moteur.
4. Nombre de décimales des longueurs d'onde (`unit_indices_milieu_ambiant.lfm`, sans `DecimalPlaces`).
5. Épaisseur par défaut du miroir cônique jamais initialisée (`unit222.pas:40214`, `unit17.pas:964`).
6. Onglet 2 des Préférences sans libellés ni bouton de police (`unit17.lfm:179-263`, `unit17.pas:1234`).
7. « Ok et enregistrer sur disque » ferme peut-être aussi après un échec d'écriture (`unit17.lfm:272`, genre `bkYes`).
8. Texte de « Nombre de rayons » pour l'onde plane (`ray1.pas:2037` ; § 12.1).
9. Disparition de l'écran de démarrage (`optgeo.lpr:99-175`).
10. Comportements « (LCL) » : fermeture de `unit11` malgré une erreur ; ils viennent de la bibliothèque, pas des sources d'OptGeo, et n'ont pas été vérifiés en exécutant le programme.

## 12. Adaptation web et tablette : modèle d'interaction recommandé

Contraintes de la cible : tablettes Android modestes (Samsung Galaxy Tab A SM-T580, Android 8.1, Firefox ; aussi Chrome), ordinateurs, téléphones ; aucun Internet sur le serveur du collège ; pas de clic droit, pas de survol, doigt imprécis (environ 1 cm), clavier virtuel seulement ; l'application remplit le cadre qu'on lui donne (iframe pleine colonne ou plein écran) ; tout en français accentué, aucun émoji d'Unicode 11 ou plus, une couleur n'est jamais portée par un émoji.

### 12.1 Mise en page

| OptGeo | Web recommandé |
|---|---|
| Barre de menus (5 menus) | Bouton « Menu » (texte ou icône SVG, pas d'émoji) ouvrant un panneau avec les mêmes rubriques : Fichier, Édition, Ajouter (saisie par coordonnées), Options, Aide. Sur ordinateur large, une vraie barre de menus peut rester. |
| Deux barres d'outils d'objets | **Palette d'objets repliable** : tiroir latéral à gauche en paysage, feuille en bas en portrait ; cinq onglets ou sections « Miroirs », « Écrans », « Sources », « Dioptres », « Divers » ; chaque bouton porte une **icône SVG et un libellé court visible** (pas d'infobulle sur tablette), cible ≥ 44 × 44 px CSS. Repliée, la palette ne laisse qu'une bande d'onglets. |
| Cases « Afficher » + zoom | Section « Affichage » du menu (Normales, Angles, Grille, Attraction, Longueurs, Coordonnées) + boutons de vue flottants : « + », « − », « Tout voir ». |
| Palette « Actions » flottante | **Barre d'actions fixe** (en haut ou en bas selon l'orientation) : Annuler, Refaire, Déplacer, Propriétés, Dupliquer, Supprimer, Grouper. |
| Barre d'état (X, Y, consigne, mode) | **Bandeau de consigne** au-dessus du dessin, gros caractères : « Mode : ajout d'un miroir plan — Touchez le premier bord du miroir. » + boutons « Annuler » (remplace Échap) et, pour les modes persistants, « Terminer » (remplace « Fin dépl. », « Fin prop. »…). Les coordonnées s'affichent dans une bulle près du doigt pendant qu'on place un point, et dans le bandeau sur ordinateur. |
| Boîtes modales | **Panneau de propriétés non modal** (côté droit en paysage, feuille en bas en portrait) ; le dessin reste visible ; « Valider », « Annuler », « Supprimer cet élément ». Les messages d'erreur s'affichent sous le champ fautif, pas dans une alerte. Les petites questions (nombre de rayons, nombre de sommets, « Relier les points i et j par : ») peuvent rester des boîtes, mais grandes et au doigt. |
| Fenêtre de commentaire | Panneau « Commentaire » repliable (zone de texte), ouvert automatiquement à l'ouverture d'un fichier dont le commentaire n'est pas vide. |

### 12.2 Gestes

| Geste | Effet |
|---|---|
| Un doigt (ou souris, bouton principal) | Outil en cours : placer un point, saisir une poignée, toucher un objet. |
| Deux doigts : pincer / écarter | Zoom continu centré entre les doigts (bornes conseillées : ×0,5 à ×100, pour garder les préréglages d'OptGeo). |
| Deux doigts : glisser | Déplacer la vue. |
| Molette (ordinateur) | Zoom centré sur le curseur ; Maj + molette ou glisser avec le bouton du milieu : déplacer la vue. |
| Appui long | **À éviter** (Firefox Android ouvre parfois un menu, et l'appui long est lent en classe). Ne lui attacher aucune fonction indispensable. |
| Double toucher | À éviter (zoom du navigateur) : `touch-action: none` sur le dessin, pas de fonction attachée. |

Le zoom et le déplacement de la vue doivent rester possibles **pendant** un mode (OptGeo l'interdit, `ray1.pas:5804-5816`, ce qui est gênant au doigt).

### 12.3 Placement d'un point (création, mesures)

OptGeo place chaque point par un clic, avec un aperçu qui suit la souris entre deux clics. Au doigt, sans survol :
- **appuyer, glisser pour viser, relâcher pour valider** : le point est fixé au relâchement ; pendant l'appui, l'aperçu (trait pointillé, cercle, axe…) suit le doigt exactement comme le survol d'OptGeo ;
- une **loupe** (ou un réticule décalé au-dessus du doigt) montre la zone cachée par le doigt, avec la bulle des coordonnées ; un point peut être corrigé avant relâchement ;
- avec la souris, garder aussi le clic simple + aperçu au survol (comportement d'origine) ;
- après le dernier point, l'objet est créé et l'application revient au repos (comme OptGeo) ; prévoir une case « Rester dans ce mode » facultative pour créer plusieurs objets du même type ;
- **Alt / Ctrl** (blocage de x ou de y sur le point précédent) : remplacer par deux boutons à bascule dans le bandeau, « Aligner verticalement » et « Aligner horizontalement », et/ou un aimantage automatique à 0°, 90°, 45° quand l'écart angulaire est inférieur à 3° (avec repère visuel) ;
- l'attraction de la grille s'applique au relâchement ; afficher le nœud visé pendant le glisser.

Chaque séquence du §5 se traduit donc par autant d'appuis-relâchers qu'OptGeo demande de clics, avec la même consigne dans le bandeau. Les boîtes intermédiaires (nombre de sommets, nombre de rayons, diamètre de la lentille épaisse, style de trait, « Relier les points ») restent au même moment de la séquence.

Le contrôle « points trop proches » d'OptGeo (1/10 de la taille de 2 pixels) est inopérant au doigt ; le remplacer par une distance minimale de **8 px CSS** entre deux points d'une même construction, désactivable comme dans OptGeo.

### 12.4 Sélection, poignées, propriétés

Les modes Déplacer, Propriétés, Dupliquer, Supprimer d'OptGeo sont des modes « clic sur un petit point actif » avec une tolérance d'environ 7 × 7 px (§3.6) : inutilisable au doigt. Modèle recommandé, qui garde toutes les fonctions :

1. **Mode par défaut « Sélection »** (aucun bouton enfoncé) : toucher un objet (sur son tracé, pas seulement sur un point actif : tolérance 22 px CSS au doigt, 8 px à la souris selon `pointerType`) le sélectionne ; ses **poignées** s'affichent (cercles de 44 px CSS de zone sensible, dessin de 12 à 16 px), avec la même signification que les poignées d'OptGeo (§9). **Glisser** une poignée fait l'action correspondante (translation, rotation, foyer, rayon de courbure…), aperçu en direct, validation au relâchement (= `FinModif`), puis une entrée d'annulation.
2. Une **barre contextuelle** apparaît près de l'objet sélectionné : « Propriétés », « Dupliquer », « Supprimer », « Grouper avec… », « Désélectionner ». Elle remplace les modes Propriétés, Dupliquer et Supprimer.
3. Si plusieurs objets sont sous le doigt (cas de `form_quelobjet`), afficher une petite liste « Miroir plan n° 2 / Rayon n° 1… » ; toucher à nouveau au même endroit peut aussi passer à l'objet suivant.
4. Les boutons de la barre d'actions « Déplacer », « Propriétés », « Dupliquer », « Supprimer » restent disponibles comme dans OptGeo (mode persistant, bouton « Terminer »), pour les enseignants habitués et pour suivre les consignes des exemples (« cliquer sur le bouton Déplacer… »). En mode « Déplacer », toutes les poignées de tous les objets sont visibles en même temps (comportement d'OptGeo).
5. **Dupliquer** : la copie apparaît décalée de 5 % de la largeur de l'espace (OptGeo la pose au même endroit puis la fait suivre la souris jusqu'au clic suivant, `unit222.pas:20491-20493` — au doigt, un objet superposé est invisible) et reste sélectionnée pour être glissée.
6. **Supprimer** : la suppression d'un objet sélectionné est immédiate et annulable (« Annuler » visible) ; « Supprimer tout » garde sa confirmation.
7. **Grouper** : mode à part : toucher successivement les objets (chacun se marque), puis « Terminer » ; un groupe se sélectionne et se translate d'un bloc ; prévoir « Dissocier » dans la barre contextuelle d'un groupe (voir §9 pour ce qu'OptGeo permet).

### 12.5 Champs de saisie

- `inputmode="decimal"`, virgule **et** point acceptés (OptGeo impose le point : `unit222.pas:40171-40172`) ; affichage avec la virgule française ; les `.opt` gardent le point.
- Unité affichée à droite de chaque champ de longueur (comme les `logN`), angles en degrés (préciser l'unité affichée par OptGeo pour chaque champ, §10).
- Bornes et pas des compteurs (`SpinEdit`) repris tels quels, avec boutons « − » et « + » de 44 px.
- Couleurs : nuancier de pastilles **dessinées** (CSS/SVG) avec le **nom écrit** de la couleur (Noir, Rouge, Vert, Bleu, Fuchsia, Aqua…) ; jamais d'émoji. Pour les rayons et sources, garder le choix fermé d'OptGeo (§10) ; la lumière blanche, codée par le noir dans les `.opt`, est **affichée** « Lumière blanche » (décomposée en rouge, vert, bleu dans un milieu dispersif ou sur un réseau) et dessinée en noir ou gris foncé sur fond clair.
- Polices du texte sur le dessin : limiter à 3 familles génériques embarquées ou système (sans empattement, avec empattement, chasse fixe), taille, gras, italique, souligné, barré. La police d'un `.opt` inconnue est remplacée par la famille sans empattement.

### 12.6 Fichiers, sauvegarde, export

| OptGeo | Web |
|---|---|
| Ouvrir (3 répertoires) | « Ouvrir un fichier de l'appareil » (`<input type="file" accept=".opt,.txt" multiple>` : on peut choisir le `.opt` et son `.txt` de commentaire ensemble) + « Ouvrir un exemple » (les 56 exemples embarqués dans l'application, classés par dossier, avec leur commentaire `.txt`). |
| Superposer | Même chose, avec la question sur les paramètres et la création d'un groupe. |
| Enregistrer / Enregistrer sous | Téléchargement du `.opt` (nom demandé, `.opt` ajouté) ; si le commentaire n'est pas vide, téléchargement du `.txt` de même nom. Le format `.opt` doit rester relisible par OptGeo 3.03 (VERSION 301). |
| — | **Sauvegarde automatique locale** (`localStorage`, clé propre à l'application) de la scène et du commentaire après chaque action annulable ; au lancement, proposer « Reprendre le travail en cours ? » ; enveloppée dans `try/catch` (navigation privée). Rien n'est jamais envoyé à un serveur. |
| Nouvelle simulation | Même confirmation si modifié ; la boîte de démarrage devient un panneau « Nouvelle simulation » (espace par défaut, espace à définir, ouvrir un exemple, indices du milieu ambiant). |
| Exporter PNG | `canvas.toBlob` à la résolution de l'espace de travail (pas seulement de l'écran), fond compris. |
| Exporter SVG | Recommandé si le moteur de dessin passe par une couche d'abstraction (un rendu Canvas et un rendu SVG) : vectoriel, idéal pour les fiches d'élèves. Remplace l'export PostScript. |
| Imprimer | `window.print()` avec une feuille de style d'impression : seul le dessin (à l'échelle de la page) et le commentaire. |
| Copier | `navigator.clipboard.write` d'une image PNG si le navigateur le permet ; sinon masquer la commande. |
| Préférences | Panneau ; stockées dans `localStorage` (propres à l'appareil), comme le fichier de configuration personnel d'OptGeo. |

### 12.7 Clavier (ordinateur)

Échap = Annuler le mode ; Ctrl+Z = Annuler ; Ctrl+Y et Ctrl+Maj+Z = Refaire ; Suppr / Retour arrière = supprimer l'objet sélectionné ; Ctrl+D = dupliquer ; Ctrl+S = enregistrer (et non « supprimer » comme dans OptGeo) ; flèches = déplacer l'objet sélectionné d'un pas de grille (ou d'1 pixel) ; Alt / Ctrl maintenues pendant la création = blocage de x / y comme dans OptGeo.

### 12.8 Performances sur tablette modeste

Recalcul du tracé à chaque mouvement de poignée limité à une image sur deux (`requestAnimationFrame`), calcul complet au relâchement ; aucune requête réseau ; aucune ressource chargée depuis Internet ; images des exemples et de l'aide embarquées.

## 13. Ce qu'il est raisonnable de ne pas porter

Principe : tout ce qui touche à la **physique** et à la **construction** est porté ; ce qui dépend du système de fichiers, de Windows, d'une imprimante ou d'Internet est remplacé par un équivalent web, ou abandonné.

### 13.1 Abandonnés ou remplacés (interface principale)

| Élément d'OptGeo | Source | Raison | Équivalent web |
|---|---|---|---|
| Curseurs de souris dessinés pour chaque étape (31 curseurs) | `ray1.pas:4728-4762` | sans objet au doigt | consigne du bandeau et aperçu (§12.3) ; sur ordinateur, curseur « réticule » unique |
| Palette « Actions » flottante déplaçable par glisser (zone « Pour déplacer cette palette, glissez-déposez à partir de cette zone... ») | `unit1_palette.pas:112-138` | fenêtres flottantes inadaptées à une page | barre d'actions fixe (§12.1) |
| Infobulles des boutons | `ray1.lfm` (`Hint`) | pas de survol sur tablette | libellés visibles sous les icônes ; infobulle `title` gardée pour la souris |
| Raccourci Ctrl+S = « Supprimer un élément », Ctrl+R = « Refaire » | `ray1.lfm:1229`, `1242` | contraire aux habitudes, risque de perte | Ctrl+S = enregistrer, Ctrl+Y / Ctrl+Maj+Z = refaire (§12.7) |
| Fenêtre en plein écran forcé, barres de défilement de l'image zoomée | `ray1.pas:5472`, `4956-4980` | l'application remplit son cadre | vue zoomable et déplaçable aux gestes (§12.2) |
| Désactivation du zoom pendant un mode | `ray1.pas:5804-5816` | gênant au doigt | zoom et déplacement de vue toujours permis |
| Copier dans le presse-papiers | `ray1.pas:5858-5864` | exige HTTPS (impossible sur l'ASRock en `http://`) | masqué si l'API manque ; export PNG |
| Image de fond (fichier JPG/PNG) | `ray1.pas:11149-11186` | non enregistrée dans le `.opt` de toute façon ; peu utile en classe | **facultatif** : à porter plus tard (image choisie sur l'appareil, gardée dans la sauvegarde locale), sinon ne garder que la couleur de fond |
| Export JPG | `ray1.pas:4982-4999` | doublon du PNG | à confirmer par l'enseignant (§13.2) |
| Version anglaise, menu « Langue » | `ray1.pas:5001-5019`, `lang/optgeo.en.po` | version française seulement | aucun |
| Lecture des commentaires `.rtf` | `ray1.pas:9147-9148` | format désuet | lire seulement le `.txt` ; un `.rtf` éventuel est ignoré (à signaler à l'ouverture) |
| Paramètre de ligne de commande (ouvrir le fichier passé à l'exécutable) | `ray1.pas:13352`, `8190-8195` | sans objet | ouverture d'un exemple par l'adresse (`#exemple=…`), facultatif |

### 13.2 Fenêtres et commandes système (détail)

Le tableau ci-dessous reprend, fenêtre par fenêtre, ce qui n'est pas porté et son remplacement.

| Fenêtre ou commande | Source | Raison | Équivalent web proposé |
|---|---|---|---|
| `unit16` « Configuration primaire d'OptGeo » : répertoire d'installation (grisé), « Répertoire des exemples », « Répertoire devant recevoir vos simulations personnelles », « Répertoire devant contenir votre configuration personnelle d'OptGeo » (grisé) (`unit16.pas:78-100`) | premier lancement (`ray1.pas:478-536`) ; Options > « Définir le répertoire personnel » (`ray1.pas:4403-4404`, `13131-13191`) ; écrit `optgeo.cfg` et `perso.cfg` | un navigateur n'a pas accès aux dossiers de l'appareil | **Exemples** : bibliothèque d'exemples servie par le site, choisie dans une liste. **Simulations personnelles** : ouverture d'un fichier de l'appareil (`<input type="file">`), enregistrement par téléchargement, sauvegarde automatique locale. **Configuration** : stockage local du navigateur (§ 3). Les sous-menus « de mon répertoire personnel » / « du répertoire "exemples" » / « du dernier répertoire de chargement… » deviennent « Ouvrir un fichier de l'appareil… » et « Ouvrir un exemple… ». |
| Messages de premier lancement : « OptGeo est exécuté pour la première fois… » (`ray1.pas:478`), « Impossible de créer le fichier de configuration primaire… » (`ray1.pas:468`), « Repertoire … introuvable et incréable » (`ray1.pas:543-559`) | `ConfigurationInitiale` | plus de fichiers de configuration | aucun ; en cas de stockage local indisponible, avertissement discret « Les préférences ne seront pas mémorisées sur cet appareil ». |
| Options > « Base de registre » : « Associer les fichiers .opt avec OptGeo » / « Désassocier » (`ray1.pas:4235`, `4239-4240`, `11023-11054`) | Windows seulement | sans objet dans un navigateur | aucun. Proposition facultative : manifeste d'application web avec `file_handlers` (ouvrir un `.opt` d'un double-clic sur ordinateur, navigateurs Chromium seulement). |
| Options > « Langue » (`ray1.pas:4530-4531`, sous-menu construit `ray1.pas:4213-4219`, `MenuItem6Click` `ray1.pas:5001-5016` : message « Pour prendre en compte le changement de langue de l'interface, Optgeo doit maintenant être arrété. Puis relancez le. », écrit `optgeo.ini`) | | version française seulement | aucun. |
| `unit_imp` « Configuration de la page pour l'impression » : « Position » (« Horizontale » : Droite, Gauche, **Centré** ; « Verticale » : Haut, Bas, **Centré**), « Nombre de copies » (« Nombre: », ≥ 1, défaut 1), « Taille (en % de la page) » (« Horizontalement », « Verticalement » ; 90 % au lancement, `unit_imp.pas` initialisation), « Orientation » (Portrait, **Paysage**), « Rapport hauteur/largeur » / « Respecter les angles à l'impression » (coché), « &OK », « Annuler » ; puis dialogue d'impression du système | Fichier > « Imprimer » (`ray1.pas:4479-4480`, `5866-5900`) | pas d'impression native | Fichier > « Imprimer… » = **impression du navigateur** d'une page préparée : feuille de style `@media print` qui ne garde que le dessin (et, en option, le commentaire), centré, à 90 % de la page, **proportions respectées** ; orientation suggérée par `@page { size: landscape }`. Nombre de copies, marges et orientation se règlent dans la boîte du navigateur. |
| `unitconfigpostscript` « Propriétés du fichier Postscript » : mêmes réglages que l'impression, plus « Taille page » (A4, A3, A2, A1, A0, A5, Letter, Legal, Ledger) et « Résolutions » horizontale/verticale (10 à 2400 DPI, défaut 72) ; son « Annuler » est ignoré, le fichier est écrit quand même (`ray1.pas:5075-5082`) | Fichier > Exporter graphe > « PS » (`ray1.pas:5038-5080`) | format sans usage pour des élèves ; aucune bibliothèque PostScript à embarquer | Fichier > Exporter > **SVG** (vectoriel, même rôle que le PostScript, s'ouvre dans un navigateur ou LibreOffice) et **PNG**. |
| Fichier > Exporter graphe > « JPG » (`ray1.pas:4525-4526`, `4982-4999`) | | le PNG suffit, sans perte pour des traits fins | Proposition : ne garder que PNG et SVG (à confirmer par l'enseignant). L'export PNG de l'original enregistre l'image de l'écran, à sa résolution (`ray1.pas:4959-4980`) ; le web peut proposer une résolution ×2 pour l'impression ou le traitement de texte. |
| Edition > « Copier simulation dans le presse papier » (`ray1.pas:5858-5862`) | | hors de cette partie ; à signaler : l'API presse-papiers des navigateurs exige un contexte **sécurisé** (HTTPS) ; l'ASRock est servi en `http://192.168.2.3/` | sur gistlabs (HTTPS) : copie de l'image PNG ; sur l'ASRock : bouton masqué ou remplacé par l'export PNG. |
| `unit17b` écran de démarrage | `optgeo.lpr:99-107` | une pause d'une seconde n'a pas lieu d'être sur le web | aucun ; le titre, la version et l'auteur sont dans « À propos ». Indicateur de chargement seulement si le chargement dure. |
| Aide > « Aide sur OptGeo » (`ray1.pas:4231`, `10652-10683` : ouvre `aide/fr/optgeo.html` dans le navigateur externe) et Aide > « Historique des versions » (`MenuItem14Click`, `ray1.pas:6374-6402` : `historique.html`) | | lancement d'un navigateur externe | pages d'aide et d'historique **embarquées** dans l'application, ouvertes dans un nouvel onglet ou un panneau ; aucune ressource extérieure (l'aide d'origine est à vérifier sur ce point). |
| Aide > « Site Web » (`ray1.pas:4645-4646`, `10771` : `http://jeanmarie.biansan.free.fr/logiciel.html`) et Aide > « Contacter l'auteur » (`ray1.pas:4391-4392`, `10632-10636` : courriel ; hors Windows, boîte « Adresse de courriel: ») | | pas d'Internet sur l'ASRock | réunis dans « À propos » (§ 10) : adresse affichée en texte, lien externe signalé comme nécessitant Internet. |
| `unit3` « Propriétés des points » | — | jamais ouverte dans l'original | aucun (§ 14). |

---

## 14. Fiche récapitulative par objet

Une ligne par type d'objet (27 types, plus le groupe). Colonnes : nom affiché dans la liste de choix d'OptGeo (`unit222.pas:18489-18545`) ; image d'origine dans l'aide (`aide/fr/`, à redessiner en SVG pour la palette ; les icônes des boutons sont des bitmaps dans `Glyph.Data` de `ray1.lfm`, lignes indiquées) ; création à la souris (§5) ; poignées (§9, renvois « 9.A-… » ou « 9.B-… » à la numérotation interne de chaque partie) ; boîte de propriétés (§10, « 10.A » suivi du nom de l'objet, ou « 10.B-… ») ; section du `.opt` (`ray1.pas:7560-8145`).

| # | Objet (nom dans la liste de choix) | Bouton (icône `ray1.lfm`) / image d'aide | Clics de création (§5) | Poignées (§9) | Boîte (§10) | Section `.opt` |
|---|---|---|---|---|---|---|
| 1 | Miroir plan n° | `boutonmiroirplan` (l. 69) / `mpgrand.gif` | 2 | 9.A-3.1 | 10.A « Miroir plan » (`saisiemp`) | Nombre de miroirs plans: |
| 2 | Réseau n° | `boutonreseau` (l. 975) / `reseaugrand.bmp` | 2 + boîte | 9.A-3.2 | 10.A « Réseau diffractant » (`saisiereseau`) | Nombre de reseaux: |
| 3 | Miroir concave idéal n° (sphérique concave paraxial) | `boutonmscopa` (l. 117) / `mscopagrand.gif` | 3 | 9.A-3.3 | 10.A (`saisiemscopa`) | Nombre de miroirs concaves paraxiaux: |
| 4 | Miroir convexe idéal n° | `boutonmscepa` (l. 141) / `mscepagrand.gif` | 3 | 9.A-3.4 | 10.A (`saisiemscepa`) | Nombre de miroirs convexes paraxiaux: |
| 5 | Miroir concave n° (sphérique réel) | `boutonmscore` (l. 165) / `mscoregrand.gif` | 3 | 9.A-3.5 | 10.A (`saisiemscore`) | Nombre de miroirs concaves reels: |
| 6 | Miroir convexe n° (sphérique réel) | `boutonmscere` (l. 189) / `msceregrand.gif` | 3 | 9.A-3.6 | 10.A (`saisiemscere`) | Nombre de miroirs convexes reels: |
| 7 | Miroir cônique n° (parabolique, elliptique, hyperbolique ; concave ou convexe) | `boutonconiqueconcave` (l. 213), `boutonconiqueconvexe` (l. 237) / `coniquegrand.gif` | 4 | 9.A-3.7 | 10.A (`saisiemconique`) | Nombre de miroirs coniques: |
| 8 | Lentille mince convergente n° | `boutonlmc` (l. 462) / `lmcgrand.gif` | 3 | 9.A-3.8 | 10.A (`saisielmc`) | Nombre de lentiles minces convergentes: |
| 9 | Lentille mince divergente n° | `boutonlmd` (l. 486) / `lmdgrand.gif` | 3 | 9.A-3.9 | 10.A (`saisielmd`) | Nombre de lentiles minces divergentes: |
| 10 | Lame semi réfléchissante n° | `boutonlsr` (l. 93) / `lsrgrand.gif` | 2 | 9.A-3.10 | 10.A (`saisielamesr`) | Nombre de lames semi reflechissantes: |
| 11 | Ecran n° | `boutonecran` (l. 280) / `ecrangrand.gif` | 2 | 9.A-3.11 | 10.A (`saisieec`) | Nombre d'ecrans: |
| 12 | Diaphragme n° | `boutondia` (l. 304) / `diaphragmegrand.gif` | 3 | 9.A-3.12 | 10.A (`saisiedia`) | Nombre de diaphragmes: |
| 13 | Lentille épaisse n° | `boutonlec` (l. 510) / `lecgrand.gif` | 4 + diamètre | 9.A-3.13 | 10.A (`saisielec`, `unit12`) | Nombre de lentilles epaisses: |
| 14 | Rayon n° | `boutonrayon` (l. 347) / `rayongrand.gif`, `segment1.gif`, `segment2.gif` | 2 | 9.B-1 | 10.B-2.1 (`saisieray`) | Nombre de rayons: |
| 15 | Source ponctuelle n° — objet réel | `boutonsourceponctuelle` (l. 371) / `sponctgrand.gif` | 3 + nombre de rayons | 9.B-2 | 10.B-2.2 (`saisiesp1`), 10.B-2.4 (`unit5`) | Nombre de sources ponctuelles: |
| 16 | Source ponctuelle n° — objet virtuel | `boutonspv` (l. 395) / `sponctvgrand.gif` | 3 + nombre de rayons | 9.B-2 | 10.B-2.2 | (même section, drapeau « virtuelle ») |
| 17 | Onde plane n° | `boutonondeplane` (l. 419) / `opgrand.gif` | 3 + nombre de rayons | 9.B-3 | 10.B-2.3 (`saisieop1`), 10.B-2.4 | Nombre d'ondes planes: |
| 18 | Polyhèdre réfractant n° (polygone) | `boutonpoly` (l. 534) / `polyhedregrand.gif` | nombre de sommets + N | 9.B-4 | 10.B-2.7 (`unit6`), 10.B-2.6 (`unit8`) | Nombre de polyhedres: |
| 19 | Polycercle réfractant n° (« polysphère ») | `boutonpolycercle` (l. 646) / `polycercle.gif` | nombre de sommets + N + « Relier » + 1 par arc | 9.B-5 | 10.B-2.9 (`saisiecercle`), 10.B-2.6, 10.B-2.8 (`unit15`) | Nombre de polycercles: |
| 20 | Sphère réfractante n° | `boutonsphere` (l. 622) / `gouttegrande.gif` | 2 | 9.B-6 | 10.B-2.5 (`saisiesphere`) | Nombre de spheres: |
| 21 | Prisme n° (isocèle) | `boutonprisme` (l. 558) / `prismegrand.png` | 3 | 9.B-7 | 10.B-2.10 (`saisiepri`) | Nombre de prismes: |
| 22 | Oeil n° (stylisé) | `boutonoeil` (l. 829) / `oeilgrand.gif` | 2 | 9.B-8 | 10.B-2.11 (`saisieoe`) | Nombre d'oeils: |
| 23 | Fléche n° (trait, flèche) | `boutonfleche` (l. 757) / — | 2 + style | 9.B-9 | 10.B-2.12 (`saisief1`), 10.B-2.13 (`saisiefle`) | Nombre de traits: |
| 24 | Texte n° | `boutontexte` « A » (l. 746) / — | boîte + 1 | 9.B-10 | 10.B-2.16 (`unit9`), 10.B-2.17 (`unit10`) | Nombre de textes: |
| 25 | Mesure de distance n° | `boutondistance` (l. 698) / — | 2 | 9.B-11 | §10.M1 (`unit13`) | Nombre de mesures de distances |
| 26 | Mesure d'angle n° | `boutonangle` (l. 722) / `anglegrand.gif` (présent dans l'aide mais référencé par aucune page : attribution INCERTAINE) | 3 | 9.B-12 | §10.M2 (`unit14`) | Nombre d'angles: |
| 27 | Point n° (« joli point ») | `SpeedButtonJoliPOint` (l. 1039) / — | boîte + 1 | 9.B-13 | 10.B-2.14 (`saisiejolipoint`), 10.B-2.15 (`saisiejoli1`) | Nombre de jolis points |
| — | Groupe n° | boutons « Grouper », « Grouper tout » de la palette | — | 9.B-14, 9.B-16 | — | Nombre de groupes: |

Commandes de scène qui ne créent pas d'objet : commentaire de la simulation (§11, `unit32`), segments fantômes (10.B-2.19, `saisiefant`), surfaces d'onde (10.B-2.20 et §11), normales (10.B-2.21), grille (10.B-2.22), espace de travail, indices du milieu ambiant, préférences, fond, empennage (§11).

## 15. Scénarios de test d'acceptation

Tirés des exemples d'OptGeo (A01-A43, catalogue en Annexe A) et de l'aide (G = création, E = édition, O = options, F = fichiers). Dans la version web, « cliquer » se lit « toucher », et « cliquer sur le bouton Déplacer » peut se faire par le bouton « Déplacer » ou par la sélection directe (§12.4) : les deux chemins doivent être testés. Les résultats attendus sont ceux d'OptGeo 3.03, sauf écart volontaire listé au §16.2. Chaque scénario doit être passé à la souris sur ordinateur et au doigt sur tablette (au moins en 1024 × 768 tactile ; sur la vraie tablette Galaxy Tab A / Firefox avant toute annonce de compatibilité).

Format : **Ouvrir** ; **faire** ; **constater**. « Ouvrir l'exemple X » = menu Fichier > Ouvrir simulation > du répertoire « exemples ». Le bouton de fin de mode est noté « Fin dépl. », « Fin prop. », « Fin suppr. », « Fin dupl. » (libellés de `lang/optgeo.fr.po:3506-3518` ; les `.txt` écrivent « Fin dép » et l'aide « Fin Dépl . »).

#### 2.1 Scénarios tirés des exemples

- **A01 — Chargement de tous les exemples.** Ouvrir successivement les 56 exemples ; constater pour chacun que les objets listés en §1 sont présents en nombre exact, que les textes s'affichent tels quels (accents compris, dossier `Miroir_Sphérique` accentué), et que les options enregistrées (grille, attraction, normales, angles, fantômes, unité) sont restaurées et reflétées par les cases « Grille », « Attraction », « Normales », « Angles d'incid. et de réfr. ».
- **A02 — Lecture des anciens formats.** Ouvrir `miroir_hyperbolique2.opt` (version 1) et `miroir_hyperbolique.opt` (version 10) ; constater le même tracé.
- **A03 — Autocollimation, translation.** Ouvrir `Exemples_Classiques/autocollimation.opt` ; cliquer sur « Déplacer » ; survoler la croix verte au centre du miroir, clic simple, déplacer, clic simple pour reposer ; constater que les rayons sont recalculés en direct et que l'image finale reste dans le plan du diaphragme ; cliquer sur « Fin dépl. » ; constater le retour au mode normal.
- **A04 — Autocollimation, inclinaison.** Même exemple ; « Déplacer » ; saisir une extrémité du miroir (cercle bleu), la déplacer et la reposer ; constater que l'image finale reste dans le plan du diaphragme ; « Fin dépl. ».
- **A05 — Autocollimation, contre-épreuve.** Même exemple ; « Déplacer » la source (ou « Propriétés » de la lentille pour changer sa focale) afin que la source ne soit plus au foyer ; translater le miroir ; constater que l'image n'est plus, en général, dans le plan du diaphragme.
- **A06 — Lentilles, déplacement de la source.** Pour chacun des six exemples `Exemples_Classiques/Lentilles/*.opt` : « Déplacer » ; survoler le cercle bleu autour du point source ; constater que le curseur prend la forme « rotation » ; clic simple, déplacer, clic simple ; constater le recalcul en direct des rayons et des prolongements en pointillés ; « Fin dépl. ».
- **A07 — Lentille convergente 1.** Ouvrir `lentille_convergente_1.opt` ; constater une image réelle renversée au-delà du foyer image.
- **A08 — Lentille convergente 2.** Ouvrir `lentille_convergente_2.opt` ; constater que le segment 2 de chaque rayon est prolongé en pointillés vers l'arrière et que les prolongements se coupent en une image virtuelle droite.
- **A09 — Lentilles avec objet virtuel.** Ouvrir `lentille_convergente_3.opt`, `lentille_divergente_2.opt`, `lentille_divergente_3.opt` ; constater que la source est virtuelle (segment 1 prolongé vers l'avant jusqu'au point objet) et que l'image a la nature annoncée en §1 ; « Propriétés » sur la source : constater que le type « virtuelle » et les listes « Vers l'avant » / « Vers l'arrière » sont affichés.
- **A10 — Lentille divergente 1.** Ouvrir `lentille_divergente_1.opt` ; constater une image virtuelle droite (prolongements vers l'arrière).
- **A11 — Newton et zoom.** Ouvrir `Telescopes/telescope_newton.opt` ; choisir « x10 » dans la liste « Zoom » ; constater que la vue est agrandie et que les rayons émergents de l'oculaire sont parallèles entre eux ; revenir à « x1 ».
- **A12 — Zoom pendant un mode.** Même exemple ; cliquer sur « Déplacer » puis changer le zoom ; constater que le zoom n'est pas modifié tant que le mode est actif (comportement de `ray1.pas:5804`) ; « Fin dépl. ».
- **A13 — Cassegrain en mètres.** Ouvrir `Telescopes/telescope_cassegrain.opt` ; constater l'unité « m » et une grille de pas 1 ; « Propriétés » sur un miroir : constater les valeurs exprimées en mètres.
- **A14 — Miroirs paraxiaux et surfaces d'onde.** Même exemple ; « Propriétés » sur l'onde plane, cocher le tracé des surfaces d'onde, donner une valeur de chemin optique, OK ; constater qu'aucune surface d'onde n'est tracée (présence de miroirs paraxiaux et d'une lentille mince, `sponct.html:69-81`, `op.html:64-78`).
- **A15 — Dioptre, caustique puis diaphragme.** Ouvrir `Dioptre_Spherique/objet_infini_caustique.opt` ; constater la caustique. Ouvrir `objet_infini_stigmatisme_approche.opt` ; constater que le diaphragme ne laisse passer que les rayons proches de l'axe, qui convergent.
- **A16 — Diaphragme modifié en direct.** Ouvrir `objet_infini_stigmatisme_approche.opt` ; « Déplacer » ; saisir un point intérieur du diaphragme et l'écarter (`diaphragme.html:46-51`) ; constater que plus de rayons passent et que la caustique réapparaît ; Ctrl+Z ; constater le retour à l'état initial.
- **A17 — Lentille épaisse, Gauss contre hors Gauss.** Ouvrir `Lentille/foyer_image.opt` puis `aberrations_objet_infini_sur_axe.opt` puis `aberrations_objet_infini_hors_axe.opt` ; constater respectivement convergence au foyer, absence de stigmatisme, absence de stigmatisme hors axe. « Propriétés » sur la lentille : constater épaisseur 50 mm et rayons de courbure 700 mm (le .txt le dit ; la fenêtre peut présenter centres ou rayons de courbure).
- **A18 — Aberration sphérique.** Ouvrir `Lentille/aberration_spherique.opt` ; constater que les rayons marginaux coupent l'axe plus près de la lentille que les rayons paraxiaux.
- **A19 — Retournement de lentille.** Ouvrir `Lentille/reduction_aberration_spherique.opt` ; constater deux montages dont l'un montre des rayons plus concentrés.
- **A20 — Miroir parabolique, cinq cas.** Ouvrir les cinq exemples de `Miroir_Parabolique` ; constater la grille de pas 50 et les normales affichées ; pour `stigmatisme_rigoureux.opt`, constater des rayons réfléchis tous parallèles ; pour `caustique_objet_infini.opt`, constater une caustique.
- **A21 — Miroir parabolique, propriétés.** Sur un de ces exemples : « Propriétés » sur le miroir ; constater excentricité 1 et le paramètre (200 ou 100) ; changer l'excentricité en 0,5, OK ; constater un miroir elliptique ; « Fin prop. » ; Ctrl+Z.
- **A22 — Miroir sphérique.** Ouvrir les quatre exemples de `Miroir_Sphérique` ; constater les caustiques (sur l'axe, hors axe), la convergence au foyer avec diaphragme, et la convergence en A' avec les textes « A » et « A' ».
- **A23 — Base vide d'éclairage.** Ouvrir `Miroir_Sphérique/base.opt` ; ajouter une onde plane à la souris (§2.2) ; constater la réflexion sur le miroir.
- **A24 — Stigmatisme rigoureux.** Ouvrir `miroir_elliptique.opt`, `miroir_hyperbolique.opt`, `miroir_parabolique.opt`, `miroir_plan.opt` ; constater pour chacun que les rayons réfléchis (ou leurs prolongements en pointillés) passent par un même point (second foyer, image symétrique pour le miroir plan).
- **A25 — Miroir plan, déplacement.** Ouvrir `miroir_plan.opt` ; « Déplacer » une source ; constater que l'image (intersection des prolongements) reste symétrique de la source par rapport au miroir.
- **A26 — Weierstrass.** Ouvrir `weierstrass.opt` ; constater que les prolongements vers l'arrière (pointillés) concourent en A'. Manipulation pour le chemin optique : non décrite par l'exemple (voir §1, n° 56) ; à préciser.
- **A27 — Arc-en-ciel.** Ouvrir `arc_en_ciel_primaire.opt` ; constater la décomposition de la lumière blanche en rouge, vert, bleu dans la goutte et l'absence des segments 3, 6, 9 (fantômes) ; cliquer sur l'icône fantôme (« Cacher des segments de rayon ») ; constater que les numéros de segments s'affichent et que la fenêtre « Pour cacher des segments de rayon » montre la case « Créer des fantomes » cochée et la liste (3,6,9) ; décocher, OK ; constater que tous les segments sont visibles. Même chose pour `arc_en_ciel_secondaire.opt` (liste (3,6,9,11,13,15)).
- **A28 — Arc-en-ciel, angles.** Même exemple ; cocher « Angles d'incid. et de réfr. » ; constater l'affichage d'un angle d'incidence de 59,6° (71,9° pour le secondaire) à l'entrée dans la goutte, et que « Normales » est cochée d'office (`optgeo.html:404-405`).
- **A29 — Fibre.** Ouvrir `filbre_saut_indice.opt` ; constater normales et angles affichés avec 1 décimale ; « Déplacer » le point de départ du rayon pour augmenter l'inclinaison ; constater la fin des réflexions totales au-delà de l'angle limite.
- **A30 — Dispersion par prisme.** Ouvrir `dispersion_prisme.opt` ; constater trois couleurs en sortie de prisme ; « Déplacer » le sommet principal du prisme ; constater que le prisme tourne autour de son centre d'inertie sans changer de forme (`prisme.html:28`).
- **A31 — Lunette.** Ouvrir `lunette_astronomique.opt` ; constater les deux mesures d'angle (≈ 28,9° et ≈ 5,3°) ; « Propriétés » sur les lentilles : focales 300 et 50 mm.
- **A32 — Cercle oculaire.** Ouvrir `cercle_oculaire.opt` ; constater la zone où les rayons sortant de l'oculaire se resserrent ; « Déplacer » l'œil (saisi par la rétine, `oeil.html:45-47`) ; constater que l'œil n'arrête pas les rayons… **à vérifier** : l'aide dit que toutes ses parties sont absorbantes (`oeil.html:13-15`) mais qu'il est optiquement inactif (`oeil.html:25-27`) ; comportement à trancher sur l'original.
- **A33 — Coronographe.** Ouvrir `coronographe.opt` ; constater que les rayons rouges s'arrêtent sur le disque occulteur (écran) et que les verts et bleus atteignent l'œil ; constater que la case « Attraction » est cochée ; « Déplacer » une lentille : constater que sa position se cale sur la grille de pas 20.
- **A34 — Coronographe, lumière parasite.** Ouvrir `coronographe_lumiere_parasite.opt` ; constater que le diaphragme de Lyot intercepte les rayons parasites.
- **A35 — Cassegrain conique.** Ouvrir `cassegrain.opt` ; constater le passage des rayons par le trou central entre les deux portions de parabole, la réflexion sur l'hyperbole, puis l'œil.
- **A36 — Michelson, rayons perdus.** Ouvrir `michelson1.opt` ; constater des rayons repartant vers le volume d'entrée. Ouvrir `michelson2.opt` ; constater qu'ils sont cachés ; ouvrir l'icône fantôme ; constater la liste (4,9).
- **A37 — Michelson, isoler un trajet.** Ouvrir `michelson3.opt` ; constater qu'un seul trajet (M1 puis séparatrice) est visible. Dans la fenêtre fantôme, saisir `(4,9)` ; constater le retour à l'affichage de `michelson2`.
- **A38 — Michelson, miroir symétrique.** Ouvrir `michelson4.opt` ; constater que les rayons issus de M2 et de M'1 sont confondus en sortie. Ouvrir `michelson5.opt` ; constater deux rayons qui se coupent en un point du volume de sortie.
- **A39 — Michelson, lames épaisses.** Ouvrir `michelson6.opt`, `michelson7.opt`, `michelson8.opt` ; constater une lame (puis deux) traversée(s) ; cocher « Long. segments » ; constater l'affichage des longueurs de chaque segment (base pour comparer les chemins).
- **A40 — Coin d'air.** Ouvrir `coin_air_equivalent.opt` ; constater les cinq traits (flèches) et les textes, les prolongements vers l'arrière (2,3) et la convergence dans le plan de la lentille d'observation.
- **A41 — Réseaux.** Ouvrir `reseau_en_transmission.opt` et `reseau_en_reflexion.opt` ; constater les ordres -1, 0, 1 sur l'écran, la lumière blanche décomposée hors de l'ordre 0 ; « Propriétés » sur le réseau : constater transmission/réflexion, nombre de traits par mm, ordres représentables (`reseau.html:13`).
- **A42 — Cardioïde.** Ouvrir `cardioide.opt` ; constater le tracé de 100 rayons et l'enveloppe en forme de cardioïde ; mesurer le temps de recalcul pendant un « Déplacer » de la source (doit rester fluide sur tablette : critère à fixer).
- **A43 — Aberration chromatique.** Ouvrir `aberration.opt` ; constater que les rayons rouge et bleu ne convergent pas au même point. Ouvrir `Correction_par_Doublet.opt` ; constater qu'ils convergent (approximativement) au même point.

#### 2.2 Scénarios génériques : création de chaque type d'objet

Pour chaque objet : (a) création à la souris par le bouton de la barre d'outils, clics simples sans maintenir le bouton entre deux points (`optgeo.html:133-140`) ; (b) création par le menu Ajouter avec saisie au clavier (`optgeo.html:159-172`) ; constater l'objet tracé et les rayons recalculés. Puis « Propriétés » sur l'objet : constater que la fenêtre est la même que celle de l'ajout par menu (`optgeo.html:255-256`).

- **G01 — Rayon unique.** Bouton « Ajouter un rayon » ; clic point 1, clic point 2. Menu Ajouter > Source > Rayon unique. Constater un rayon de 1 vers 2 ; propriétés : épaisseur, couleur, nombre maximal d'enfants (10 par défaut), prolongements avant/arrière (`rayon.html:16-64`).
- **G02 — Source ponctuelle réelle.** Bouton « Ajouter un objet ponctuel réel » ; clics S, 1, 2 ; saisir le nombre de rayons dans la boîte qui s'ouvre. Constater des rayons émis de S entre S-1 et S-2 dans le sens trigonométrique direct (`sponct.html:22-35`). Inverser l'ordre de 1 et 2 : constater l'autre secteur.
- **G03 — Source ponctuelle virtuelle.** Bouton « Ajouter un objet ponctuel virtuel » ; même saisie ; constater des rayons convergeant vers S. Menu : Ajouter > Source > Objet ponctuel réel ou virtuel.
- **G04 — Onde plane.** Bouton « Ajouter une onde plane » ; clics 1, D, 2 ; nombre de rayons ; constater que le point 2 est ramené sur la perpendiculaire à 1D passant par 1 (`op.html:18-30`).
- **G05 — Miroir plan.** Clics 1, 2 ; constater que l'ordre des points définit la face réfléchissante (hachures sur la face absorbante) (`miroirplan.html:16-27`). Menu : Ajouter > Système optique idéal > Miroir plan.
- **G06 — Miroir sphérique paraxial concave / convexe.** Clics 1, 2, puis foyer ; menu : Ajouter > Système optique idéal > Miroir sphérique concave / convexe (coordonnées et focale) (`miroirspheriqueparaxial.html:18-32`). Propriétés : hachures, axe focal, trou central.
- **G07 — Miroir sphérique réel concave / convexe.** Clics 1, 2, puis C ; constater que C est placé sur la médiatrice de 1 et 2 ; menu : Ajouter > Système optique réel > Miroir sphérique concave / convexe (rayon de courbure, caractère « obtus ») (`miroirspheriquereel.html:19-38`).
- **G08 — Miroir troué.** Créer un miroir sphérique ; « Propriétés » ; choisir de le trouer et la taille du trou ; OK ; constater que les rayons passent par le trou (`optgeo.html:174-180`).
- **G09 — Miroir conique (parabolique, elliptique, hyperbolique) concave / convexe.** Clics 1, F, S, 2 ; menu : Ajouter > Système optique réel > Miroir cônique (F, angle polaire de l'axe, angles polaires FM1 et FM2, paramètre, excentricité, concave/convexe) (`miroirconique.html:18-35`).
- **G10 — Lame semi-réfléchissante.** Clics 1, 2 ; constater un rayon réfléchi et un rayon transmis sans décalage ; le transmis est l'« enfant » (`lsr.html:45-56`).
- **G11 — Lentille mince convergente / divergente.** Clics 1, 2, foyer ; menu : Ajouter > Système optique idéal > Lentille mince convergente / divergente (`lmc.html:18-30`). Constater que normales et angles ne sont jamais tracés sur elle (`lmc.html:52-57`).
- **G12 — Lentille épaisse.** Clics S1, S2, C1, C2 ; constater que C1 et C2 sont ramenés sur l'axe S1S2 ; saisir le diamètre (`lentille.html:18-30`). Imposer un diamètre trop grand à une lentille à bords minces : constater qu'il est ramené au diamètre « naturel » (`lentille.html:58-60`).
- **G13 — Sphère réfractante.** Clic centre, clic quand la taille est bonne (`sphere.html:16-26`).
- **G14 — Polygône réfractant.** Bouton ; boîte « nombre de sommets » ; un clic par sommet ; tenter un polygône croisé : constater le refus (connexité vérifiée, `polyhedre.html:19-21`). Créer un polygône de plus de 50 sommets : accepté jusqu'à 500 (historique 3.02).
- **G15 — Polycercle réfractant.** Bouton ; nombre de sommets ; clics des sommets ; choix segment ou arc pour chaque côté (menus « Joindre par un segment » / « Joindre par un arc de cercle », `ray1.lfm`) ; clic des sommets d'arcs. Avec 2 sommets seulement : constater une lentille plan-convexe (historique 2.05). L'aide dit que le logiciel ne vérifie pas les intersections (`polysphere.html:20-22`) mais l'historique 2.10 dit que les intersections impossibles ne sont plus acceptées : **contradiction à trancher**.
- **G16 — Prisme.** Clic centre d'inertie G, clic sommet principal, dernier clic fixant l'angle au sommet (`prisme.html:14-26`). En mode Déplacer : sommet principal = rotation autour de G ; G = translation ; les deux autres sommets modifient l'un l'angle au sommet, l'autre la hauteur (`prisme.html:28`).
- **G17 — Écran.** Clics 1, 2 ; constater que les deux faces absorbent (`ecran.html:13-23`).
- **G18 — Diaphragme à iris.** Clics C, 1 (bord intérieur), 2 (bord extérieur) (`diaphragme.html:13-27`) ; en mode Déplacer : translation, orientation et taille extérieure par les points extrêmes, ouverture par les points intérieurs (`diaphragme.html:46-51`).
- **G19 — Œil stylisé.** Clics 1 (rétine), 2 (centre pupille) ; menu : Ajouter > Divers > Oeil stylisé (`oeil.html:13-23`).
- **G20 — Réseau diffractant.** Clics 1, 2 ; boîte : transmission ou réflexion, traits par mm, ordres (`reseau.html:13`). Constater la loi des réseaux sur une onde plane.
- **G21 — Texte sur le dessin.** Bouton « A » ou menu Ajouter > Divers > Texte sur le dessin ; constater police, gras, souligné enregistrés.
- **G22 — Trait, flèche.** Bouton « Ajouter un trait, une fléche... » ; formes des deux extrémités (rien, trait, flèche, rond, croix, disque), taille en 1/1000 de la diagonale, épaisseur, style (pointillé si épaisseur 1), couleur (`saisief1.lfm`).
- **G23 — Mesure de distance.** Bouton « Mesurer la distance entre deux points » ; barre d'état « Cliquer sur l'origine du segment... » (`uchaines.pas:399`) puis extrémité ; constater la distance affichée dans l'unité de la simulation ; « Déplacer » la mesure (historique 1.02) ; enregistrer, rouvrir : constater qu'elle est conservée (bug corrigé en 1.05).
- **G24 — Mesure d'angle.** Bouton « Mesurer un angle » ; barre d'état « Cliquer sur le centre (intersection des droites)... » (`uchaines.pas:400`), puis deux points ; constater l'angle en degrés. Interaction absente de l'aide : suivre les messages de la barre d'état.
- **G25 — Point (objet inactif).** Bouton « Ajouter un point » ; constater un point marqué (cercle, croix, disque, carré, triangle…) sans effet sur les rayons (historique 3.01). Absent du menu Ajouter et de l'aide.
- **G26 — Commentaire.** Bouton « Ajouter (ou éditer) le commentaire de la simulation » ou Édition > Editer le commentaire (Ctrl+E) ; enregistrer, rouvrir : constater le commentaire.
- **G27 — Couleur et dispersion.** Créer une source de couleur « Lumière blanche » traversant un polygône ; constater trois rayons rouge, vert, bleu ; avec une source rouge, constater un seul rayon.
- **G28 — Matériau.** « Propriétés » d'une région réfractante ; choisir un matériau dans la liste ; constater les trois indices (486,1 ; 587,6 ; 656,3 nm) ; valeurs par défaut 1,8 / 1,6 / 1,4 (`lentille.html:39-46`).
- **G29 — Réflexion partielle.** « Propriétés » d'une région réfractante ; régler le rayon réfléchi sur « toujours », « jamais », « seulement si le réfracté existe », « seulement si le réfracté n'existe pas », côté entrant et sortant ; constater l'effet.
- **G30 — Rayons enfants.** Source avec nombre maximal d'enfants 0 puis 10 ; constater la disparition puis l'apparition des réflexions partielles ; un enfant a au plus (parent − 1) enfants (`rayon.html:38-45`).
- **G31 — Nombre maximal de segments par rayon.** Propriétés d'une source : régler « Nombre max. de segment par rayon » ; constater que les rayons s'arrêtent après ce nombre (historique 2.00 bêta 1).
- **G32 — Limite par type.** Atteindre le nombre maximal d'un type (ex. miroirs plans) : constater le message « Attention » et l'absence d'ajout (`ray1.pas:5715`).
- **G33 — Points trop proches.** Créer un miroir plan avec deux clics presque au même endroit : constater le message « Points trop proches ! » ; cocher Options > Désactiver le contrôle de points trop proches à la construction ; recommencer : constater l'acceptation (historique 3.03).

#### 2.3 Scénarios génériques : édition

- **E01 — Déplacer.** Ouvrir un exemple ; « Déplacer » (ou Édition > Déplacer un élément, Ctrl+M) ; constater cercles bleus, croix vertes, croix cyan ; croix verte = translation ; cercle bleu = déplacement d'un point seul (curseur « rotation ») ; croix cyan = centre de courbure ou foyer (`optgeo.html:190-209`). Clic, déplacement sans bouton enfoncé, clic : redessin en direct. « Fin dépl. » : retour au mode normal.
- **E02 — Rotation.** En mode « Déplacer », saisir le point rouge d'un objet ; constater la rotation de l'objet (historique 3.00). Non décrit dans l'aide.
- **E03 — Contrainte verticale / horizontale en déplacement.** Maintenir Alt, cliquer le point, le déplacer, cliquer, relâcher Alt : constater un déplacement vertical seulement ; même chose avec Ctrl : horizontal (`optgeo.html:212-223`).
- **E04 — Alignement à la création.** Créer un miroir plan : premier clic, puis Ctrl maintenu au second clic : constater deux points sur une même horizontale ; Alt : même verticale (`optgeo.html:141-147`).
- **E05 — Points confondus.** Deux points caractéristiques superposés : constater que le programme propose de choisir (historique 2.00 bêta 1) ; l'aide conseille le zoom ou « Propriétés » (`optgeo.html:232-235`).
- **E06 — Propriétés.** « Propriétés » (Ctrl+P) ; cercles bleus ; curseur « Propriétés: clic » ; clic : fenêtre de l'objet ; OK valide, Annuler abandonne ; « Fin prop. » (`optgeo.html:246-262`).
- **E07 — Supprimer.** « Supprimer » (Édition > Supprimer un élément, **Ctrl+S**) ; cercles rouges ; curseur marteau ; clic : demande de confirmation ; après suppression, sortie automatique du mode ; sinon « Fin suppr. » (`optgeo.html:272-285`).
- **E08 — Supprimer tout.** Bouton « Supprimer tout » de la palette ou Édition > Supprimer tous les éléments (Ctrl+Alt+S) ; constater une simulation vide ; Ctrl+Z.
- **E09 — Dupliquer.** « Dupliquer » (Ctrl+D) ; clic sur un cercle bleu : copie créée, sortie automatique du mode ; sinon « Fin dupl. » (`optgeo.html:332-344`).
- **E10 — Grouper (choix).** Bouton « Grouper » ou Édition > Grouper des éléments > Eléments à choisir (Ctrl+G) ; croix violettes ; clic sur chaque croix (confirmation à chaque ajout) ; bouton « Fin » ; confirmation de création (`optgeo.html:299-312`).
- **E11 — Grouper tout.** Bouton « Grouper tout » ou Édition > Grouper des éléments > Tous les éléments (Ctrl+A) ; « Déplacer » : constater la croix verte « Gr » à l'isobarycentre ; la translater : tout bouge ensemble (`optgeo.html:313-320`).
- **E12 — Supprimer un groupe.** « Supprimer » sur le repère du groupe ; constater que le groupe disparaît (`optgeo.html:321-322`) ; vérifier si les éléments restent (non précisé par l'aide : **à vérifier**).
- **E13 — Annuler une opération en cours.** Commencer un miroir (premier clic), appuyer sur Échap le curseur au-dessus de l'espace de travail : constater l'abandon de la saisie, le curseur normal et la barre d'état vidée (`optgeo.html:353-355`, `ray1.pas:5691-5698`).
- **E14 — Annuler / Refaire.** Enchaîner ajout, suppression, modification de propriétés, déplacement, groupement, duplication ; Ctrl+Z autant de fois : constater le retour en arrière pas à pas, jusqu'à 50 niveaux ; Ctrl+R : constater le rétablissement (`optgeo.html:361-367`). Inclure couleur de fond et empennage dans l'historique d'annulation (historique 1.23).
- **E15 — Coordonnées.** Bouton « Coord. » : constater le tableau des extrémités des segments, longueurs et angles polaires ; survoler une ligne : le segment est en surbrillance (historique 2.33).
- **E16 — Longueur des segments.** Case « Long. segments » : constater la longueur affichée sur chaque segment.

#### 2.4 Scénarios génériques : options et affichage

- **O01 — Grille.** Case « Grille » ou Options > Afficher la grille : constater la grille. Options > Options de la grille : changer le pas ; constater.
- **O02 — Attraction.** Cocher « Attraction » ; créer un miroir plan : constater que ses extrémités sont sur des nœuds de la grille ; translater un objet : idem. Créer une lentille mince : constater que le foyer n'est **pas** attiré (axe imposé) (`optgeo.html:377-386`).
- **O03 — Normales.** Case « Normales » : constater la normale à chaque point d'incidence sur miroirs et dioptres, pas sur les éléments idéalisés (`optgeo.html:390-397`, `412-415`) ; Options > Options des normales : longueur (pourcentage), couleur, épaisseur, décimales.
- **O04 — Angles.** Case « Angles d'incid. et de réfr. » : constater angles d'incidence et de réfraction en degrés (pas l'angle de réflexion, `miroirplan.html:59-60`) ; constater que « Normales » est cochée d'office ; régler le nombre de décimales.
- **O05 — Zoom.** Liste « Zoom » : x1, x2, x5, x10, x20, x50, x100 ; constater l'agrandissement. Le comportement (centre, défilement) n'est pas décrit dans l'aide : **à préciser**.
- **O06 — Couleur ou image de fond.** Options > Couleur de fond ou image de fond : choisir une couleur, puis une image PNG ou JPG ; constater le fond ; Ctrl+Z (historique 2.25 et 1.23).
- **O07 — Milieu ambiant.** Options > Indices du milieu ambiant : changer les indices et les longueurs d'onde ; constater l'effet en sortie des matériaux ; enregistrer, rouvrir : valeurs conservées (bugs corrigés en 2.14 et 2.21).
- **O08 — Empennage.** Options > Empennage des rayons : « Position de l'empennage sur le segment », « Taille de l'empennage » ; constater les flèches de sens sur les rayons ; Ctrl+Z.
- **O09 — Surfaces d'onde.** Sur une source réelle avec miroirs et lentilles réels uniquement : Propriétés, cocher « Tracer des surfaces d'onde issues de cette source ponctuelle », saisir « 120 145 276 » (valeurs séparées par un espace) ; constater trois surfaces d'onde. Options > Surfaces d'onde : « Nombre de points calculés pour tracer une surface d'onde » ; constater la finesse du tracé. Sur une onde plane, constater que le plan 1-2 sert d'origine du chemin optique (`op.html:64-70`).
- **O10 — Fantômes.** Icône fantôme ou Ajouter > Divers > Rayons fantomes ; constater les numéros de segments affichés pendant la saisie et masqués après ; saisir « (1,5) » ; constater la disparition de ces segments.
- **O11 — Dimensions de l'espace de travail.** Fichier > Modifier les dimensions de l'espace de travail > Ajuster automatiquement à la plus petite taille, puis Manuellement ; constater le recadrage sans perte d'objet.
- **O12 — Préférences.** Fichier > Préférences : changer couleur et épaisseur par défaut d'un type ; créer un objet de ce type : constater les nouveaux attributs ; relancer l'application : constater qu'ils sont conservés (`optgeo.html:431-436`).

#### 2.5 Scénarios génériques : fichiers

- **F01 — Enregistrer puis rouvrir.** Construire une simulation contenant au moins un objet de chaque type (sources, miroirs, lentilles, régions réfractantes, écran, diaphragme, œil, réseau, texte, trait, mesures, point, groupe, commentaire) avec grille, attraction, normales, angles, fantômes, surfaces d'onde, prolongements, milieu ambiant et empennage réglés ; Fichier > Enregistrer simulation sous ; Fichier > Nouvelle simulation ; rouvrir : constater une simulation identique (objets, options, tracé). Constater que l'extension `.opt` est ajoutée d'office (historique 2.05).
- **F02 — Enregistrer (sans « sous »).** Modifier une simulation ouverte puis Fichier > Enregistrer simulation : constater l'écrasement du même fichier.
- **F03 — Compatibilité.** Un fichier enregistré par le portage s'ouvre dans OptGeo 3.03 et inversement (format de `ray1.pas:7560` et suivantes).
- **F04 — Superposer.** Ouvrir un exemple, puis Fichier > Superposer simulation > du répertoire « exemples » ; constater que les deux simulations sont présentes et que la dernière chargée forme automatiquement un groupe ; « Déplacer » ce groupe (historique 2.04).
- **F05 — Exports.** Boutons « Export PNG », « Export JPG », « Export PS » (et Fichier > Exporter graphe) : constater des fichiers lisibles fidèles à l'écran. « Imprimer » : aperçu fidèle. « Copier » (Ctrl+C) : image dans le presse-papiers.
- **F06 — Nouvelle simulation.** Fichier > Nouvelle simulation : constater la fenêtre de création (dimensions de l'espace de travail, unité, nombre maximal de segments selon l'historique 1.32) puis un espace vide.
- **F07 — Titre.** Constater le nom de la simulation dans le bandeau (historique 1.03).

---

## 16. Points incertains et défauts de l'original

Chaque partie garde sa propre liste détaillée (9.A-5, 9.B-18, 10.A « Récapitulatif des défauts », 10.B-3, §11, F17). Ci-dessous, les points qui comptent pour construire l'interface.

### 16.1 Points incertains (le code ne permet pas de trancher ; OptGeo n'a pas été exécuté)

1. **OK d'une boîte après une erreur.** Tous les boutons OK des boîtes de propriétés ont `ModalResult = 1` dans leur `.lfm` (ex. `saisielmc.lfm:503`, `saisiemp.lfm:461`) et leur `OnClick` fait `exit` après le message d'erreur sans remettre `ModalResult` à zéro : d'après le fonctionnement de la LCL, la boîte se ferme quand même, sans rien créer ni modifier, et la saisie est perdue ; l'appelant enregistre alors un état d'annulation inutile. **Dans la version web : garder le panneau ouvert et signaler le champ fautif** (écart volontaire).
2. Boîte de choix entre objets superposés validée ou fermée sans sélection : le dernier candidat trouvé serait saisi (`unit222.pas:14825`). Dans la version web : aucune action.
3. Le point (« joli point ») n'a pas de libellé dans les listes de choix des modes Déplacer et Supprimer : décalage probable des lignes (`unit222.pas:14758-14816`, `16342-16400`).
4. Réception de la touche Échap quand une case à cocher ou la liste de zoom a le focus (pas de `KeyPreview`, `ray1.lfm:18`).
5. Miroirs paraxiaux : le foyer pourrait changer de côté après un déplacement (`create` contre `create2`, `unit222.pas:25928`, `27352`).
6. Miroirs sphériques réels : centre de courbure amené entre la corde et le sommet (`unit222.pas:7182-7240`) ; diaphragme : bord extérieur calculé par itérations (`unit222.pas:6711-6776`) ; lentille épaisse : sommet amené au-delà de l'autre (`unit222.pas:8252-8320`).
7. Blocage Alt/Ctrl des poignées de rotation calculé sur l'extrémité a1 et non sur la poignée saisie (`unit222.pas:11406-11407`) : bogue probable ; recommandation : bloquer sur la poignée saisie.
8. Lumière blanche (rayon noir) quand la scène n'a ni milieu dispersif ni réseau : indice et longueur d'onde utilisés non affectés explicitement (`unit222.pas:32089-32108`) ; à trancher avec le moteur.
9. Polycercle : détail des tests d'intersection entre arcs (`unit222.pas:38778` et suivantes) ; indice du point déplacé non mémorisé par candidat (`unit222.pas:12128`).
10. Attribution de `anglegrand.gif` (mesure d'angle ?) ; neuvième unité vide dans la liste des unités de l'espace de travail (`unit11.lfm:206`) ; nombre de décimales des longueurs d'onde ; épaisseur par défaut du miroir conique jamais initialisée (`unit222.pas:40214`).
11. Exemples : un œil est-il absorbant ou sans effet sur les rayons ? contrôle des polycercles ; chemins optiques de `weierstrass.opt` ; `.txt` identiques pour michelson6 à 8 (Annexe A).

### 16.2 Défauts établis de l'original, à corriger dans la version web

| Défaut | Source | Correction proposée |
|---|---|---|
| Ctrl+S supprime un élément ; « Enregistrer » sans raccourci | `ray1.lfm:1242` | §12.7 |
| Virgule décimale refusée (point imposé) | `unit222.pas:40171-40172` | accepter les deux, afficher la virgule |
| Zone sensible des points de 7 × 7 px environ | `ray1.pas:3029-3030` | §12.4 |
| Échap ne remet pas en place l'objet en cours de déplacement, malgré « Esc pour annuler » | 9.A-1.4 | « Annuler » rend la position de départ |
| Aucun message quand un déplacement est refusé (l'objet garde sa dernière position valide) | 9.A-1.3, 9.B-0.3 | signaler la limite atteinte (contour rouge bref) |
| Titre « Ajout d'un miroir plan: » pour le réseau créé par le menu | `ray1.pas:5423` | « Ajout d'un réseau » |
| Messages de maximum faux (« miroirs plans » pour les miroirs convexes ou les traits, « traits » pour les points, « écran » pour lame et diaphragme) | `ray1.pas:6668`, `10813`, `6959`, `5750`, `5772` | messages propres à chaque objet |
| Consigne « premier bord de l'écran » pour la lame semi-réfléchissante | `ray1.pas:5758` | « premier bord de la lame » |
| Lentille divergente créée par le menu avec les réglages de la convergente | `ray1.pas:6763-6768` | réglages de la divergente |
| Modifier une lentille épaisse remet couleur et affichage de l'axe et réflexions aux valeurs imposées | `unit222.pas:19934-19948` | garder les valeurs de l'objet |
| « Supprimer ce prisme » sans effet ; titre « Ajout d'un prisme » en modification ; ordonnée de G comparée aux bornes en x | `saisiepri.lfm:246-253`, `saisiepri.pas:101` | corriger |
| Bouton « Supprimer ce trait » dans la boîte du point | `saisiejoli1.pas` | « Supprimer ce point » |
| Indices par défaut différents selon le mode de création : menu rouge 1,5 / vert 1,6 / bleu 1,7 ; souris rouge 1,4 / vert 1,6 / bleu 1,8 | `ray1.pas:5454-5456`, `1302` | un seul jeu de défauts ; **à décider par l'enseignant** (1,5/1,6/1,7 est plus réaliste) |
| Lentille épaisse : boîte du diamètre impossible à annuler | `ray1.pas:1680-1681` | bouton « Annuler » qui abandonne la création |
| Plusieurs petites boîtes sans « Annuler » (nombre de rayons, de sommets, « Relier les points », style du trait et du point, fantômes, surfaces d'onde, normales, empennage) | 10.B-3, §11 | ajouter « Annuler » |
| Suppression sans confirmation dans les boîtes, mais avec confirmation (sans le nom de l'objet) en mode Supprimer | 9.B-15.3 | suppression immédiate et annulable partout (§12.4) |
| « Tous les éléments » (menu) oublie prismes et points ; « Grouper tout » (palette) les prend mais sans confirmation ni état d'annulation | `ray1.pas:10928-11021`, `unit1_palette.pas:165-257` | une seule commande « Tout grouper », complète et annulable |
| Message « ajouté au groupe » même quand l'ajout est refusé | `unit222.pas:16868-16870` | message seulement en cas de succès |
| Chemins optiques : liste mal lue s'il y a deux espaces (l'exemple affiché lui-même) | 10.B-1.7 | séparateurs souples (espaces, virgules, points-virgules) |
| Coordonnée nulle non réécrite dans la barre d'état | `unit222.pas:1502-1507` | toujours afficher |
| Fautes des libellés (« Obtu », « Paramétre », « Saissez », « Créér », « fléche », « Polyhèdre », « polygône », « isocéle », « atraction », « Afficher les grille », « vien d'être créé », « est les modifications ») | divers | orthographe corrigée et accentuée |

## Annexe A. Catalogue des 56 exemples

Sources lues (lecture seule) : `~/src/optgeo-amont/src/exemples/` (56 fichiers `.opt`, 47 fichiers `.txt` dont 5 vides), `~/src/optgeo-amont/src/aide/fr/*.html`, `~/src/optgeo-amont/src/historique.html`. Pour lever des doutes de vocabulaire, ont aussi été consultés (sans les modifier) `ray1.lfm` (menus et barre d'outils), `unit1_palette.lfm` (palette « Actions »), `uchaines.pas` (messages de la barre d'état), `ray1.pas` (lecture et écriture des `.opt`) et `lang/optgeo.fr.po`.

Méthode pour les `.opt` : un petit script a lu chaque fichier selon le format d'écriture de `ray1.pas` (procédure `enregistrer`, l. 7560 et suivantes) : sections `Nombre de … :` suivies du nombre d'objets, puis en-têtes `OPTIONS GRILLE` (grille affichée, attraction, pas), `OPTIONS NORMALES` (normales, angles, …, décimales), `OPTIONS SEGMENTS FANTOMES` (activés, liste), et, pour chaque source, les champs « prolongement vers l'avant » (`vav`), « vers l'arrière » (`vaa`), « source virtuelle », « tracer des surfaces d'onde » et « liste des chemins optiques ».

Conventions de lecture utiles à l'implémentation :

- Couleur stockée en entier TColor (BGR) : `255` = rouge, `16711680` = bleu, `0` (noir) = **lumière blanche**, décomposée en rouge, vert et bleu dans un milieu dispersif ou sur un réseau (`ray1.pas:5213`).
- Prolongements en pointillés : listes de numéros de segments `(1,4,10)` ; `vav` = « Vers l'avant », `vaa` = « Vers l'arrière » (`saisiesp1.lfm`, l. 426-487).
- Aucune source des exemples n'a les surfaces d'onde activées ; aucun exemple ne contient de groupe, de mesure de distance ni d'objet « point » (sections présentes, nombre 0).
- Toutes les simulations sont en mm sauf `telescope_cassegrain.opt` (unité m).
- Version de format (`VERSION`) : 1 à 6 pour les plus anciennes, 200 ou 220 pour les récentes ; l'implémentation doit relire toutes ces versions (`ray1.pas`, lecture conditionnée par `versionfichier>=200`).

---

Légende : **Objets** = types présents (nombre) ; **Options** = options d'affichage enregistrées dans le fichier (seules les valeurs non par défaut sont notées ; « normales » vaut TRUE par défaut à la création, `ray1.pas:7387`).

#### 1.1 Aberrations_Stigmatisme_Approche/Aberration_Chromatique

1. `Aberrations_Stigmatisme_Approche/Aberration_Chromatique/aberration.opt` — **pas de .txt.**
   - Montre (déduit du contenu, non décrit) : une lentille épaisse éclairée par deux ondes planes de couleurs différentes (rouge et bleue), donc l'aberration chromatique.
   - Objets : 2 ondes planes (2 rayons chacune, une rouge `255`, une bleue `16711680`), 1 lentille épaisse.
   - Options : normales affichées.
2. `Aberrations_Stigmatisme_Approche/Aberration_Chromatique/Correction_par_Doublet.opt` — **pas de .txt.**
   - Montre (déduit) : correction de l'aberration chromatique par un doublet de deux lentilles épaisses.
   - Objets : 2 rayons uniques (un rouge, un bleu), 2 lentilles épaisses.
   - Options : normales affichées.

#### 1.2 Aberrations_Stigmatisme_Approche/Dioptre_Spherique

3. `…/Dioptre_Spherique/objet_distance_finie_stigmatisme_approche.opt`
   - Montre : objet ponctuel sur l'axe, faisceau de rayons proches de l'axe et peu inclinés : conditions de Gauss, stigmatisme approché.
   - Manipulations demandées : aucune.
   - Résultat attendu : les rayons réfractés convergent (approximativement) en un point.
   - Objets : 1 source ponctuelle (5 rayons), 1 polycercle (le dioptre).
4. `…/Dioptre_Spherique/objet_infini_caustique.opt`
   - Montre : faisceau parallèle à l'axe avec des rayons éloignés de l'axe ; pas de stigmatisme ; caustique.
   - Manipulations : aucune.
   - Résultat attendu : les rayons réfractés se concentrent près d'une courbe (caustique).
   - Objets : 1 onde plane (20 rayons), 1 polycercle, 1 texte « Dioptre sphérique: caustique ». Options : normales.
5. `…/Dioptre_Spherique/objet_infini_stigmatisme_approche.opt`
   - Montre : même montage que le précédent mais faisceau fortement diaphragmé : stigmatisme approché.
   - Manipulations : aucune (le .txt renvoie à « objet_infini_caustique »).
   - Résultat attendu : seuls les rayons proches de l'axe passent ; ils convergent en un point.
   - Objets : 1 onde plane (20 rayons), 1 diaphragme, 1 polycercle, 1 texte. Options : normales.

#### 1.3 Aberrations_Stigmatisme_Approche/Lentille

6. `…/Lentille/aberration_spherique.opt`
   - Montre : lentille convergente de grande ouverture éclairée par un objet ponctuel ; aberration sphérique.
   - Résultat attendu : les rayons proches de l'axe convergent au foyer ; les rayons marginaux coupent l'axe plus près de la lentille.
   - Objets : 1 source ponctuelle (20 rayons), 1 lentille épaisse, 1 texte « Aberration sphérique ».
7. `…/Lentille/aberrations_objet_infini_hors_axe.opt`
   - Montre : lentille épaisse (épaisseur 50 mm, rayons de courbure 700 mm) éclairée par une onde plane inclinée sur l'axe ; pas de stigmatisme.
   - Objets : 1 onde plane (20 rayons), 1 lentille épaisse.
8. `…/Lentille/aberrations_objet_infini_sur_axe.opt`
   - Montre : même lentille, onde plane parallèle à l'axe mais rayons éloignés de l'axe ; pas de stigmatisme.
   - Objets : 1 onde plane (20 rayons), 1 lentille épaisse.
9. `…/Lentille/foyer_image.opt`
   - Montre : même lentille, onde plane parallèle à l'axe, rayons proches de l'axe : conditions de Gauss.
   - Résultat attendu : les rayons transmis convergent au foyer image.
   - Objets : 1 onde plane (20 rayons), 1 lentille épaisse.
10. `…/Lentille/reduction_aberration_spherique.opt`
    - Montre : la face la plus bombée tournée vers les rayons les moins inclinés réduit l'aberration (comparaison de deux montages).
    - Objets : 2 ondes planes (20 rayons chacune), 2 lentilles épaisses.

#### 1.4 Aberrations_Stigmatisme_Approche/Miroir_Parabolique

Tous : 1 miroir conique d'excentricité 1 (parabole), grille affichée (pas 50 × 50, sans attraction), normales affichées, 1 texte.

11. `…/Miroir_Parabolique/caustique_objet_infini.opt` — source à l'infini, rayons fortement inclinés ; pas de stigmatisme approché ; rayons réfléchis denses près d'une caustique. Objets : 1 onde plane (10 rayons).
12. `…/Miroir_Parabolique/objet_distance_finie.opt` — objet ponctuel à distance finie sur l'axe focal, grand angle d'ouverture ; pas de stigmatisme approché. Objets : 1 source ponctuelle (10 rayons).
13. `…/Miroir_Parabolique/stigmatisme_approche_objet_distance_finie.opt` — même objet, petit angle d'ouverture ; stigmatisme approché. Objets : 1 source ponctuelle (10 rayons).
14. `…/Miroir_Parabolique/stigmatisme_approche_objet_infini.opt` — source à l'infini proche de l'axe ; les rayons réfléchis passent très près d'un point du plan focal image. Objets : 1 onde plane (5 rayons).
15. `…/Miroir_Parabolique/stigmatisme_rigoureux.opt` — couple (objet à l'infini sur l'axe, foyer) rigoureusement stigmatique ; le texte de l'`.opt` dit « source ponctuelle placée au foyer ». Objets : 1 source ponctuelle (10 rayons). Résultat attendu : rayons réfléchis tous parallèles à l'axe.

Aucune manipulation demandée dans ces cinq `.txt`.

#### 1.5 Aberrations_Stigmatisme_Approche/Miroir_Sphérique

(Le nom du dossier contient un « é » : l'implémentation doit accepter des chemins accentués, cf. corrections 2.20 et 2.23 de l'historique.)

16. `…/Miroir_Sphérique/base.opt` — **pas de .txt** ; montage de départ : 1 miroir sphérique concave réel, sans source. Options : normales.
17. `…/Miroir_Sphérique/caustique_objet_infini.opt` — miroir concave, faisceau parallèle à l'axe, rayons non tous proches de l'axe ; caustique. Objets : 1 miroir concave réel, 1 onde plane (20 rayons), 1 texte.
18. `…/Miroir_Sphérique/caustique_objet_infini_hors_axe.opt` — même chose avec un faisceau incliné sur l'axe. Mêmes objets.
19. `…/Miroir_Sphérique/foyer_image.opt` — faisceau parallèle fortement collimaté (diaphragme) ; conditions de Gauss ; les rayons réfléchis convergent au foyer. Objets : 1 miroir concave réel, 1 onde plane (20 rayons), 1 diaphragme, 1 texte.
20. `…/Miroir_Sphérique/stigmatisme_approche.opt` — objet ponctuel A, rayons proches de l'axe et peu inclinés ; les rayons réfléchis convergent en A'. Objets : 1 miroir concave réel, 1 source ponctuelle (10 rayons), 3 textes (« Miroir sphérique, stigmatisme approché », « A », « A' »).

Aucune manipulation demandée.

#### 1.6 Exemples_Classiques

21. `Exemples_Classiques/arc_en_ciel_primaire.opt` — **pas de .txt**. Texte de l'`.opt` : « Arc en ciel primaire; l'angle d'incidence de 59,6° correspond au minimum de déviation ». Objets : 1 rayon unique (lumière blanche, 1 enfant max), 1 sphère réfractante, 1 texte. Options : normales ; **segments fantômes activés, liste (3,6,9)**.
22. `Exemples_Classiques/arc_en_ciel_secondaire.opt` — **pas de .txt**. Texte : « Arc en ciel secondaire; l'incidence de 71,9° correspond au minimum de déviation ». Objets : 1 rayon unique (lumière blanche, 2 enfants max), 1 sphère, 1 texte. Options : normales ; fantômes (3,6,9,11,13,15).
23. `Exemples_Classiques/autocollimation.opt`
    - Montre : mesure de distance focale par autocollimation ; point source (centre du diaphragme) au foyer objet de la lentille ; l'image finale (lentille, miroir, lentille) est dans le plan du diaphragme quelles que soient la position et l'inclinaison du miroir.
    - Manipulations demandées : cliquer sur « Déplacer » ; curseur au-dessus du centre du miroir, clic simple pour le saisir, déplacer la souris pour translater, clic simple pour le reposer ; clic sur « Fin dép » pour sortir du mode. Puis même méthode avec l'une ou l'autre extrémité du miroir pour changer son inclinaison.
    - Résultat attendu : l'image finale reste dans le plan du diaphragme pendant la translation et la rotation du miroir.
    - Objets : 1 miroir plan, 1 lentille mince convergente, 1 source ponctuelle (5 rayons), 1 diaphragme, 1 texte. Options : normales.
24. `Exemples_Classiques/cardioide.opt` — **.txt vide**. D'après l'historique (v1.32, `historique.html:205-210`) : cardioïde vue au fond d'une tasse. Objets : 1 miroir sphérique concave réel, 1 source ponctuelle de **100 rayons**.
25. `Exemples_Classiques/cassegrain.opt`
    - Montre : « Miroir primaire parabolique troué. Miroir secondaire hyperbolique ».
    - Objets : 3 miroirs coniques (deux portions de parabole, excentricité 1, qui figurent le primaire troué ; une hyperbole, excentricité 1,2), 1 lentille mince convergente, 1 onde plane (6 rayons), 1 œil stylisé.
    - Remarque : le « trou » est obtenu par deux miroirs coniques séparés, l'aide ne prévoyant le trou que pour les miroirs sphériques (`optgeo.html:174-180`).
26. `Exemples_Classiques/cercle_oculaire.opt`
    - Montre : lunette astronomique ; cercle oculaire (image de l'objectif par l'oculaire), où placer l'œil.
    - Objets : 2 lentilles minces convergentes, 2 ondes planes (3 rayons chacune), 2 textes (« Position du cercle oculaire », « On peut reculer l'oeil pour mieux voir le cercle oculaire »), 1 trait, 1 œil. Options : grille (pas 10), normales.
    - Manipulation suggérée par le texte de l'`.opt` (pas par le .txt) : reculer l'œil.
27. `Exemples_Classiques/coronographe.opt`
    - Montre : coronographe (objectif L1, disque occulteur, lentille de champ Lc, diaphragme de Lyot, L2, oculaire L3, filtre Hα) ; le disque intercepte les rayons du disque solaire (rouges) et laisse passer ceux de la couronne (verts, bleus).
    - Objets : 4 lentilles minces convergentes, 8 rayons uniques, 1 écran, 1 diaphragme, 1 polygône réfractant (filtre), 10 textes, 1 œil. Options : grille et **attraction** (pas 20).
28. `Exemples_Classiques/coronographe_lumiere_parasite.opt`
    - .txt identique à celui de `coronographe` (seul le caractère BOM diffère) ; le nom indique la lumière parasite diffractée par la monture de L1, arrêtée par le diaphragme de Lyot.
    - Objets : 4 lentilles minces convergentes, 6 rayons, 1 écran, 1 diaphragme, 1 polygône, 9 textes, 1 œil. Options : grille sans attraction.
29. `Exemples_Classiques/dispersion_prisme.opt` — **.txt vide**. Objets : 1 lentille mince convergente, 1 source ponctuelle (5 rayons, lumière blanche), 1 prisme. Résultat attendu (déduit) : décomposition en rouge, vert, bleu à la traversée du prisme.
30. `Exemples_Classiques/filbre_saut_indice.opt` — **pas de .txt** (nom à lire « fibre »). Objets : 1 rayon unique, 3 polygônes réfractants, 3 textes (« n=1,4 », « n=1,8 », « n=1,4 »). Options : grille, normales et **angles affichés (1 décimale)**. Résultat attendu (déduit) : réflexions totales successives dans le cœur.
31. `Exemples_Classiques/lunette_astronomique.opt`
    - Montre : lunette, objectif f = 300 mm, oculaire f = 50 mm, grossissement théorique 6.
    - Objets : 2 lentilles minces convergentes (focales 300 et 50), 1 onde plane (6 rayons), **2 mesures d'angle**. Options : grille, normales, 1 décimale.
    - Valeurs des deux mesures d'angle calculées à partir des coordonnées du fichier : environ 28,9° et 5,3° (rapport ≈ 5,5). Une mesure d'angle est un objet à trois points, indépendant des rayons.
32. `Exemples_Classiques/Lentilles/lentille_convergente_1.opt` — objet réel avant le foyer objet : image réelle renversée après le foyer image. Objets : 1 lentille mince convergente, 1 source ponctuelle (3 rayons). Options : grille, normales.
33. `Exemples_Classiques/Lentilles/lentille_convergente_2.opt` — objet réel « après le foyer objet » (entre le foyer et la lentille) : image virtuelle droite. Source : prolongement **vers l'arrière** du segment 2.
34. `Exemples_Classiques/Lentilles/lentille_convergente_3.opt` — objet virtuel : image réelle droite avant le foyer image. Source **virtuelle**, prolongement **vers l'avant** du segment 1.
35. `Exemples_Classiques/Lentilles/lentille_divergente_1.opt` — objet réel : image virtuelle droite. Lentille mince divergente ; prolongement vers l'arrière (2).
36. `Exemples_Classiques/Lentilles/lentille_divergente_2.opt` — objet virtuel avant le foyer objet : image réelle droite. Source virtuelle, prolongement vers l'avant (1).
37. `Exemples_Classiques/Lentilles/lentille_divergente_3.opt` — objet virtuel après le foyer objet : image virtuelle renversée avant le foyer image. Source virtuelle, prolongements vers l'avant (1) et vers l'arrière (2).
    - Manipulation demandée dans les six `.txt` (32 à 37) : cliquer sur « Déplacer » ; placer le curseur au-dessus du **cercle bleu** autour du point source : le curseur prend la forme « rotation » ; clic simple, déplacer la souris ; clic simple pour refixer le point source ; cliquer sur « Fin dép. » pour quitter le mode.
    - Résultat attendu : les rayons et l'image se recalculent en direct pendant le déplacement de la source.
38. `Exemples_Classiques/Telescopes/telescope_cassegrain.opt`
    - Montre : télescope Cassegrain aux dimensions axiales du Pic du Midi (primaire sphérique R = 19,972 m troué, secondaire R = 4,465 m, 8,184 m entre sommets), onde plane parallèle à l'axe.
    - Objets : 1 miroir sphérique concave **paraxial**, 1 miroir sphérique convexe paraxial, 1 lentille mince convergente, 1 onde plane (10 rayons), 2 écrans. Options : **unité m**, grille pas 1 × 1.
    - Écart à signaler : le .txt parle de miroirs « sphériques », le fichier contient des miroirs paraxiaux (idéaux).
39. `Exemples_Classiques/Telescopes/telescope_newton.opt`
    - Montre : Newton, primaire sphérique f = 400 mm, secondaire plan à 45°, oculaire ; faisceau parallèle peu incliné sur l'axe.
    - Manipulation demandée : « En passant en zoom x10 », vérifier que les rayons émergents sont parallèles entre eux.
    - Objets : 1 miroir plan, 1 miroir sphérique concave paraxial, 1 lentille mince convergente, 1 onde plane (5 rayons), 3 écrans, 1 texte. Options : grille, normales.

#### 1.7 Michelson

40. `Michelson/coin_air_equivalent.opt` — **pas de .txt**. Textes de l'`.opt` : « Rayon incident », « Coin d'air », « Intersection des rayons qui nous intéressent », « Là se coupent réellement les rayons, grâce à la lentille d'observation », « Un rayons issu de réflexions multiples, d'intensité négligeable », « Michelson en coin d'air ». Objets : 1 miroir plan, 1 lentille mince convergente, 1 rayon (prolongements vers l'arrière (2,3)), 1 lame semi-réfléchissante, 7 textes, 5 traits.
41. `Michelson/michelson1.opt` — on perd une partie du flux, renvoyée dans le volume d'entrée. Objets : 2 miroirs plans, 1 rayon, 1 lame semi-réfléchissante, 6 textes (S, Volume de sortie, Volume d'entrée, (M1), (M2), (SC)). Options : grille.
42. `Michelson/michelson2.opt` — même chose, rayons repartant vers l'entrée cachés « à l'aide de l'icone en forme de fantôme, dans la 2ème barre d'outil ». Options : fantômes (4,9).
43. `Michelson/michelson3.opt` — seul le rayon réfléchi sur M1 puis sur la séparatrice est visible ; autres segments cachés avec l'icône fantôme. Fantômes (4,9,2,3,8).
44. `Michelson/michelson4.opt` — le trajet réfléchi sur M1 est remplacé par son symétrique M'1 par rapport à la séparatrice ; on vérifie que les rayons sont confondus en sortie. Objets : 3 miroirs plans (dont M'1), 1 rayon, 1 lame, 7 textes ; fantômes (4,9).
45. `Michelson/michelson5.opt` — source ponctuelle : construction des rayons qui interfèrent en un point du volume de sortie (construction symétrique). Objets : 1 miroir plan, 2 rayons, 2 lames semi-réfléchissantes, 4 textes ; 17 segments fantômes.
46. `Michelson/michelson6.opt` — épaisseur de la séparatrice prise en compte : différences de marche supplémentaires. Texte de l'`.opt` : « un rayon traverse une fois la lame, l'autre la traverse trois fois ». Objets : 2 miroirs plans, 1 rayon, 1 polygône réfractant (la lame), 1 texte, 1 trait. Options : attraction sans grille affichée (pas 25), fantômes (11,2,12,6), indices par défaut 1, longueurs d'onde enregistrées.
47. `Michelson/michelson7.opt` — même .txt ; `.opt` : séparatrice + compensatrice, compensation exacte en incidence normale. 2 polygônes ; 11 fantômes.
48. `Michelson/michelson8.opt` — même .txt ; `.opt` : compensation approchée en incidence oblique. 2 polygônes ; ~95 fantômes.
    - Écart à signaler : les trois `.txt` 6, 7, 8 sont identiques ; seuls les textes des `.opt` les distinguent.

Aucune manipulation demandée hors l'usage (déjà fait) de l'icône fantôme.

#### 1.8 Reseaux

49. `Reseaux/reseau_en_reflexion.opt` — **.txt vide**. Objets : 1 réseau diffractant, 2 lentilles minces convergentes, 1 source ponctuelle (10 rayons, lumière blanche), 1 écran, 4 textes (Ordre -1, Ordre 0, Ordre 1, Réseau en réflexion). Options : normales et angles.
50. `Reseaux/reseau_en_transmission.opt` — **.txt vide**. Mêmes objets ; 6 textes dont « Remarque: la lumière blanche de l'ordre 0 apparait ici en bleu » et un texte vide.

#### 1.9 Stigmatisme_Rigoureux

51. `Stigmatisme_Rigoureux/miroir_elliptique.opt` — **pas de .txt**. Texte : « Miroir elliptique: rigoureusement stimatique pour ses foyers ». Objets : 1 source ponctuelle (5 rayons), 1 miroir conique (excentricité 0,5), 1 texte.
52. `Stigmatisme_Rigoureux/miroir_hyperbolique.opt` — **.txt vide**. Texte : « Miroir hyperbolique: rigoureusement stigmatique pour ses foyers ». Source (10 rayons, prolongement vers l'arrière (2)), miroir conique (excentricité 1,5).
53. `Stigmatisme_Rigoureux/miroir_hyperbolique2.opt` — **pas de .txt** ; même contenu que le précédent en format version 1.
54. `Stigmatisme_Rigoureux/miroir_parabolique.opt` — même .txt que l'exemple 15 ; source au foyer d'une parabole (p = 100) ; grille, normales.
55. `Stigmatisme_Rigoureux/miroir_plan.opt` — rigoureusement stigmatique pour deux points symétriques par rapport au plan. Objets : 1 miroir plan, 2 sources ponctuelles (5 rayons, prolongements vers l'arrière (2)). Options : normales.
56. `Stigmatisme_Rigoureux/weierstrass.opt` — points de Weierstrass du dioptre sphérique ; chemin optique (AA') nul (portions virtuelles comptées négativement). Objets : 1 source ponctuelle (10 rayons, prolongement vers l'arrière (2)), 1 sphère réfractante, 5 textes (titre, n=1,4, n=1, A, A').
    - Écart à signaler : le .txt parle du chemin optique, mais rien dans le fichier ne l'affiche (pas de surface d'onde ni de liste de chemins) ; à faire constater par une manipulation (surfaces d'onde ou « Long. segments »), non décrite.

---

## Annexe B. Fonctions de l'interface introduites au fil des versions

Source : `historique.html` (numéros de ligne entre parenthèses).

| Version | Fonction |
|---|---|
| 3.03 (l. 33-37) | Option pour désactiver le contrôle des points trop proches à la construction (Options > Désactiver le contrôle de points trop proches…) |
| 3.02 (l. 38-42) | Polygône jusqu'à 500 sommets |
| 3.01 (l. 44-47) | Objet « point » (inactif optiquement) |
| 3.00 (l. 50-55) | Rotation des objets en mode « Déplacer » par le ou les **points rouges** ; raccourcis clavier |
| 2.33 (l. 57-66) | Bouton « Supprimer tout » dans la palette ; case « Long. segments » ; bouton « Coord. » (coordonnées, longueur et angle polaire des segments, surbrillance au survol) |
| 2.25 (l. 69-73) | Image de fond PNG ou JPG à la place d'une couleur unie |
| 2.24 (l. 78-79) | Polices mises à l'échelle à haute résolution |
| 2.20 (l. 96-98) | Objet réseau diffractant ; répertoire « MesSimulations » |
| 2.15 / 2.12 / 2.11 (l. 106-131) | Interface traduite (anglais) ; langue du système au démarrage ; Options > Langue |
| 2.05 (l. 137-142) | Polycercle à deux points (lentille plan-convexe) ; extension `.opt` ajoutée d'office |
| 2.04 (l. 143-147) | **Superposer une simulation** (groupe automatique pour la dernière chargée) ; bouton « Grouper tout » |
| 2.03 (l. 148-151) | Export PostScript (.ps) |
| 2.01 (l. 156-159) | Indices du milieu ambiant modifiables |
| 2.00 bêta 3 (l. 169-171) | Menu Options > Langue |
| 2.00 bêta 1 (l. 184-200) | Objet prisme (rotation autour du centre d'inertie) ; **choix proposé quand un clic désigne plusieurs points** ; boutons regroupés sur une palette ; commentaires en `.txt` ; fichiers en UTF-8 ; export PNG et JPG ; nombre maximal de segments par rayon |
| 1.32 (l. 205-210) | Nombre maximal de segments par rayon choisi à la création de la simulation ; jusqu'à 500 rayons par source |
| 1.30 (l. 214-216) | Affichage des coordonnées des extrémités des segments |
| 1.27 Linux (l. 217-219) | Ouverture d'une simulation depuis la ligne de commande |
| 1.24 (l. 236-237) | Ouvrir depuis le dernier répertoire utilisé |
| 1.23 (l. 242-245) | Empennage et couleur de fond pris en compte par Annuler/Rétablir |
| 1.21 (l. 253-258) | Répertoire personnel de simulations modifiable |
| 1.20 (l. 260-261) | Annuler/Rétablir sur 50 niveaux |
| 1.10 (l. 263-280) | Alignement vertical/horizontal avec Alt et Ctrl ; redimensionner l'espace de travail en cours de simulation ; couleur de fond ; **position et taille de l'empennage** ; attributs par défaut (préférences) enregistrables |
| 1.05 (l. 286-299) | Grouper des éléments ; association des `.opt` ; mesures de distance enregistrées |
| 1.04 (l. 300-304) | Objet œil stylisé |
| 1.03 (l. 308-317) | Objet « trait » (trait, flèche) ; liste de matériaux ; fenêtre de commentaire réduite si vide ; nom de la simulation dans le bandeau |
| 1.02 (l. 318-320) | Translation de l'objet « mesure de distance » |

Absents de l'historique mais présents dans l'interface 3.03 (menus de `ray1.lfm`, aides) : **surfaces d'onde** (Options > Surfaces d'onde ; case par source) et **chemin optique** (valeurs saisies pour les surfaces d'onde) ; **segments fantômes** (bouton « Cacher des segments de rayon », Ajouter > Divers > Rayons fantomes) ; mesure d'angle ; texte sur le dessin ; miroir troué ; prolongements en pointillés vers l'avant / l'arrière ; sources virtuelles ; copie dans le presse-papiers.

---

## Annexe C. Interactions décrites dans l'aide d'OptGeo

#### 4.1 `aide/fr/optgeo.html` (aide générale, annoncée « version 2.20 », l. 10)

- **Clic-relâcher, jamais de glisser** : « il ne faut pas maintenir le bouton de la souris enfoncé entre 2 points ; … on fait un clic simple … on relâche … on clique et on relâche » — `optgeo.html:133-140`.
- **Ctrl à la création = même horizontale ; Alt = même verticale** (touche maintenue pendant le second clic) — `optgeo.html:141-147`.
- **Deux modes d'ajout** : souris (valeurs standard) ou clavier par le menu Ajouter (tous les paramètres) ; combinaison possible — `optgeo.html:159-172`.
- **Miroir troué** par la fenêtre des propriétés — `optgeo.html:174-180`.
- **Mode Déplacer** : bouton « Déplacer » ou Édition > Déplacement d'un élément ; cercles bleus (point seul, curseur « rotation »), croix vertes (translation), croix cyan (centre de courbure ou foyer) ; le curseur change au survol ; clic-relâcher, déplacement, clic-relâcher ; redessin en direct — `optgeo.html:190-209`.
- **Alt en déplacement = vertical ; Ctrl = horizontal** (touche maintenue pendant toute l'opération) — `optgeo.html:212-223`.
- **Sortie du mode par « Fin Dépl . »** — `optgeo.html:225-228`.
- **Points trop proches** : utiliser le zoom ou « Propriétés » — `optgeo.html:232-235`.
- **Mode Propriétés** : bouton ou Édition > Propriétés d'un élément ; cercles bleus ; curseur « Propriétés: clic » ; clic simple ouvre la fenêtre (même que l'ajout par menu) ; OK ou abandon ; sortie par « Fin prop. » — `optgeo.html:246-262`.
- **Mode Supprimer** : cercles rouges, curseur marteau, clic simple, confirmation, sortie automatique après suppression, sinon « Fin suppr. » ; Fichier > Nouvelle simulation pour repartir de zéro — `optgeo.html:272-288`.
- **Grouper** : bouton « Gr . », croix violettes, clic par élément avec confirmation, bouton « Fin », confirmation ; ou Édition > Grouper des éléments > Tous les éléments / Eléments à choisir ; groupe déplacé par sa croix verte « Gr » (isobarycentre) ; supprimé comme un élément — `optgeo.html:296-322`.
- **Mode Dupliquer** : cercles bleus, clic simple, sortie automatique, sinon « Fin dupl. » — `optgeo.html:332-344`.
- **Échap** annule l'opération en cours si le curseur est au-dessus de l'espace de travail — `optgeo.html:353-355`.
- **Ctrl+Z** annuler, **Ctrl+R** refaire (menus Édition > Annuler / Refaire), 50 niveaux, pour ajout, suppression, propriétés, déplacement, groupement, duplication — `optgeo.html:361-367`.
- **Grille et attraction** (menu Options ; case « Afficher la grille » de la barre d'outils) ; attraction à l'ajout et à la translation, pas pour le foyer d'une lentille — `optgeo.html:373-389`.
- **Normales et angles** (menu Options ou cases de la barre d'outils ; « Options des normales » ; les angles imposent les normales ; décimales réglables ; rien sur les éléments idéalisés) — `optgeo.html:390-415`.
- **Double-clic sur un `.opt`** pour l'ouvrir si l'association est faite — `optgeo.html:419-422`.
- **Couleur de fond** — `optgeo.html:424-426` ; **Préférences** (attributs par défaut) — `optgeo.html:434-436`.

#### 4.2 Interactions décrites dans les aides des objets

- Ordre des points = face réfléchissante : `miroirplan.html:16-18`, `miroirspheriqueparaxial.html:18-21`, `miroirspheriquereel.html:19-22`.
- Ordre des points 1, 2 de la source = secteur émis dans le sens trigonométrique : `sponct.html:22-26`.
- Boîte de saisie du nombre de rayons après les clics : `sponct.html:32-33`, `op.html:26-27` ; point 2 ramené sur la perpendiculaire : `op.html:27-29`.
- C placé d'office sur la médiatrice : `miroirspheriquereel.html:27-29` ; centres ramenés sur l'axe et saisie du diamètre : `lentille.html:26-30`.
- Boîte « nombre de sommets » avant les clics : `polyhedre.html:23-26`, `polysphere.html:24-30`.
- Saisie de la sphère par « clic quand la bonne taille est atteinte » (aperçu en direct) : `sphere.html:20-22`.
- Déplacement spécifique : prisme `prisme.html:28` ; diaphragme `diaphragme.html:46-51` ; œil `oeil.html:45-47`.
- Rappel « Fin prop. » dans chaque aide d'objet (ex. `rayon.html:70-76`).
- Remarque : `diaphragme.html` contient à partir de la l. 59 une copie de l'ancienne aide générale « version 1.10 » ; ne pas la prendre pour référence.

#### 4.3 Ce que l'aide ne décrit pas (à spécifier ailleurs)

- **Molette** et **clic droit** : rien dans l'aide ; aucune gestion trouvée dans `ray1.pas` (recherche de `WheelDelta`, `mbRight` sans résultat).
- **Zoom** : seulement cité dans un conseil (`optgeo.html:233-234`) ; la liste « Zoom » (x1 à x100) est dans `ray1.lfm:952-1027`, sans description de son comportement.
- **Rotation par points rouges** (3.00), **raccourcis clavier** (3.00) autres que Ctrl+Z / Ctrl+R, boutons « Coord. », « Long. segments », « Supprimer tout », « Grouper tout », objet « point », mesures de distance et d'angle, fantômes, surfaces d'onde globales, empennage, image de fond, superposition, contrôle des points trop proches : absents de `optgeo.html`.
- Pour information (hors aide, tiré de `ray1.lfm:1223-1286`, codes LCL) : Ctrl+Z Annuler, Ctrl+R Refaire, Ctrl+D Dupliquer, **Ctrl+S Supprimer un élément** (pas « Enregistrer » : piège pour un portage web où Ctrl+S est attendu pour enregistrer), Ctrl+Alt+S Supprimer tous les éléments, Ctrl+P Propriétés, Ctrl+M Déplacer, Ctrl+A Grouper tous les éléments, Ctrl+G Éléments à choisir, Ctrl+C Copier la simulation, Ctrl+E Commentaire. Alt et Ctrl contraignent x ou y pendant le clic et le mouvement (`ray1.pas:1144-1145`, `2962-2963`).
- Écarts de vocabulaire à fixer : « Fin dép » (`.txt`), « Fin Dépl . » (aide), « Fin dépl. » (`optgeo.fr.po:3506`) ; « Gr . » (aide) contre « Grouper » (palette, `unit1_palette.lfm:637`) ; « Polygône réfractant » (aide) contre « Polyhèdre réfractant » (menu) ; « Polycercle » (aide) contre « Polysphère réfractante » (menu) ; « 2ème barre d'outil » (`michelson2.txt`) désigne le groupe « Divers » de la barre d'outils actuelle.
