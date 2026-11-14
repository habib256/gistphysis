# gistphysis jsmecavideo 😎🎥

[Lien vers le projet](https://habib256.github.io/gistphysis/jsmecavideo/)

**jsmecavideo** est une application web de lecture vidéo basée sur la bibliothèque [p5.js](https://p5js.org).  
Le code source comprend notamment une classe **VideoPlayer** qui gère la lecture vidéo et les interactions utilisateur (démarrage ▶, pause ⏸, avancée ⏩ et retour en arrière ⏪).  
Cette classe est utilisée dans le fichier **mecavideo.js** pour créer une instance de lecteur vidéo et la dessiner sur le canvas.

---

## 🔧 Comment utiliser l'application

L'application vous permet désormais de :
- ✅ **Sélectionner une vidéo** à partir d'un menu déroulant agrémenté d'émoticônes.
- 📹 **Enregistrer des vidéos** avec votre webcam (fonctionnalité "Support de la Webcam").
- 👆 **Contrôler la lecture** de la vidéo avec des boutons de contrôle (lecture, pause, avancée, retour en arrière).
- 🖱 **Utiliser le curseur** pour avancer ou reculer dans la vidéo.

---

## 🎓 Pour la classe (collège, 6e–5e)

L'application accompagne la démarche des chapitres « Vitesse et mouvement » (6e) et « Mouvement et vitesse » (5e) : décrire une trajectoire (rectiligne, circulaire, curviligne), reconnaître un mouvement uniforme, accéléré ou ralenti, utiliser v = d / Δt. Elle montre des mesures ; elle ne conclut jamais à la place de l'élève.

- **Trois étapes** dans le menu « Étape » : 🎯 Pointer, 📏 Étalonner, 📈 Graphiques. Passer d'une étape à l'autre ne perd rien : les points et l'étalonnage restent, et le pointage reprend à l'image qui suit le dernier point. Seuls un changement de vidéo ou du nombre de mobiles effacent les points, après une confirmation dans l'app (« Garder mon travail » rétablit le menu).
- **Vidéos** : titres en français (ce qu'on voit, sans la conclusion), rangés par rubriques, « Pour commencer » en tête (balle lâchée, mobile sur une table, platine de disque). Le catalogue est dans `videos.js` : titre, rubrique, cadence du fichier (pour aller d'image en image), nombre d'images, durée réelle entre deux images quand un repère visible la donne (billes : panneau « 30 images/s » ; animation du système solaire : 25 jours par image), unités propres (km et jours pour l'animation), référentiel, étalon.
- **Guide de l'activité** (bouton « 📋 Guide ») : cinq étapes touchables — 1 Vidéo, 2 Étalonner, 3 Pointer, 4 Observer, 5 Conclure. Toucher une étape y conduit (2 → Étalonner, 3 → Pointer, 4 → trajectoire, 5 → distances d). L'étape affichée suit ce que fait l'élève. Quand la place manque (à toute largeur), le guide se replie au chargement, au changement de taille et aux graphiques — jamais pendant le pointage ; le bouton le rouvre et il reste alors ouvert. L'étape 1 donne le référentiel propre à la vidéo ; l'étape 4 ne parle d'« intervalles de temps égaux » que si c'est vrai.
- **Une consigne d'action** bien visible (adaptée au doigt, à la souris ou au clavier) et, dessous, une **ligne d'état** : image, instant t (compté depuis le premier point, t = 0 au premier point ; « avant le 1er point » sinon), nombre de points, échelle. À la fin de la vidéo, un bouton « 📈 Voir les graphiques » apparaît dans cette barre, jamais sur l'image.
- **« Images pointées »** (toutes / 1 sur 2 / 1 sur 5) : après chaque point, la vidéo avance de 1, 2 ou 5 images. Pour un mouvement lent, « 1 sur 5 » donne des distances 5 fois plus grandes : l'imprécision du pointage pèse beaucoup moins. À la fin de la vidéo, l'app le dit et propose « Voir les graphiques » : elle ne crée jamais de dernier intervalle plus court que les autres.
- **Points numérotés** (1, 2, 3…) comme sur une chronophotographie. Chaque mobile a sa couleur (palette Okabe-Ito, lisible par les daltoniens) **et sa forme** : × orange foncé, + bleu, ○ vert, □ jaune orangé, sur l'image comme dans les graphiques. Croix de 12 px et numéros de 14 px quelle que soit la taille de l'image, cernés de noir pour rester lisibles sur une vidéo claire ou sombre.
- **Corriger** : « ↶ Annuler » (ou Ctrl+Z, Retour arrière, Ctrl+clic) annule la dernière action et revient à son image. Pointer une image déjà pointée **remplace** son point (on corrige le point 3 sans annuler les suivants) ; pointer une image plus ancienne non pointée **insère** le point à sa place. Un double-clic ne crée qu'un point. Un clic pendant la lecture met d'abord la vidéo en pause sur une image entière.
- **Étalonnage** : pointer les deux bouts d'un objet de longueur connue (loupe au doigt et à la souris ; les deux bouts se déplacent ensuite en les faisant glisser), puis écrire la longueur : « 80 cm », « 0,8 », « 0.8 m », « 800 mm » sont acceptés et la conversion s'affiche (« = 0,80 m »). Une saisie incomprise est signalée et le reste. « Recommencer » efface les deux bouts ; « Passer au pointage → » apparaît une fois l'échelle validée. Rouvrir l'étalonnage montre l'échelle actuelle. Quand la vidéo montre une longueur connue (écrite dans l'image), la consigne d'étalonnage la rappelle (champ `etalon` de `videos.js`). Sans unité, un nombre est lu en mètres jusqu'à 5 ; au-delà (« 185 », « 80 »), l'app demande l'unité. Si la vidéo montre un étalon et que la longueur écrite en est loin, l'app demande de vérifier ; « Valider » une deuxième fois confirme.
- **Un seul repère** : les pixels natifs de la vidéo (ou de la webcam), origine au coin bas-gauche de l'image, axe y vers le haut. Points et étalonnage y sont enregistrés ; les mètres sont calculés à la lecture avec l'échelle courante. Conséquence : étalonner après avoir pointé fonctionne, et un nouvel étalonnage s'applique à tous les points. Rien ne dépend de la taille d'affichage.
- **Graphiques** (étape « 📈 Graphiques ») : titres, aides de lecture (en texte qui se replie sur un écran étroit), axes et unités en français, virgule décimale, graduations rondes.
  - *Trajectoire (positions successives)* : même échelle sur les deux axes (un cercle reste un cercle, utile pour la platine de disque).
  - *Distance d entre deux points successifs* : une barre par intervalle (« 1→2 », « 2→3 »…), axe partant de 0, ligne de la moyenne.
  - *Vitesse sur chaque intervalle (v = d / Δt)* : en m/s, avec la moyenne convertie en km/h (× 3,6).
  - *Position x / y au cours du temps* (l'instant t est compté depuis le premier point) ; les graphiques de lycée (v(t) centrée, vx, vy, a(t)) restent dans un groupe « Pour aller plus loin (lycée) ».
  - Sous le graphique, un **résumé** : nombre de distances d, plus petite, plus grande, moyenne, durée Δt entre deux points. Si les durées ne sont pas toutes égales, l'app conseille de comparer les vitesses.
- **Sans étalonnage**, tout est en **pixels vidéo** (px, px/s) et c'est écrit (ligne d'état, axes, message sous le graphique), sans alarme.
- **Tableau des mesures** (étape Graphiques → « Tableau des mesures ») : un vrai tableau, lisible au vidéoprojecteur, avec les mêmes colonnes que le fichier pour tableur.
- **Enregistrer les mesures (tableur)** (étape Graphiques) : fichier CSV pour LibreOffice Calc — séparateur `;`, virgule décimale, UTF-8 avec BOM, fins de ligne CRLF, une ligne par point. La première ligne rappelle le titre de la vidéo, la cadence (images/s, ou jours entre deux images pour l'animation, ou « instants mesurés » pour la webcam), les durées Δt réelles entre les points (égales ou « INÉGALES de … à … »), l'échelle (et la longueur d'étalonnage), et que l'instant t est compté depuis le premier point. Colonnes : Mobile, Point n°, Image n°, instant t, x, y, distance d depuis le point précédent, durée Δt depuis le point précédent, v = d / Δt. Nom du fichier tiré du titre de la vidéo. Le fichier est fabriqué dans le navigateur et enregistré sur l'appareil : **rien n'est envoyé**.
- **Travail gardé au rechargement** : en cas de rechargement de la page, l'app propose « Reprendre ton pointage ? » (vidéo, points, étalonnage, réglages). La sauvegarde est dans `sessionStorage` : elle disparaît à la fermeture de l'onglet, pour qu'un élève ne retrouve pas le travail du précédent sur une tablette partagée. Rien n'est envoyé nulle part. Pas de sauvegarde pour la webcam (les images filmées restent en mémoire).
- Messages au **tutoiement** ; vocabulaire du cours (référentiel, trajectoire, chronophotographie, uniforme, accéléré, ralenti, instant t, durée Δt, v = d / Δt).

Vérifié (Chrome sans écran, `tests/verifier-ergonomie.mjs`, partie 4) : pour les mêmes positions vidéo données à l'entrée du pointage de l'ancienne version (commit `fc875fe`) et de la nouvelle, avec le même étalonnage, d et Δt sont identiques (écart relatif < 1e-9). Les positions x en mètres diffèrent d'une constante (l'origine est désormais le bord gauche de l'image vidéo, et non celui du cadre 800 × 600 qui avait des bandes noires) ; y, d, Δt et v ne changent pas. Les valeurs en pixels sont désormais des pixels vidéo.

- **Nombres cohérents partout** (ligne d'état, tableau, résumé, infobulles, fichier) : l'instant t est compté depuis le premier point ; mêmes décimales partout. Positions à un pixel vidéo près ; v est calculée avec les valeurs exactes puis arrondie à sa finesse réelle ; d et Δt sont écrits avec assez de chiffres pour que d / Δt, refait à la main avec les valeurs affichées, redonne v à l'arrondi près (une unité du dernier chiffre au plus). Arrondi correct des demi-unités (0,95 → 1,0).
- **Durées Δt inégales** (pas changé en cours de route, point inséré, mobile sauté, webcam) : avertissement sur le graphique des distances d et au-dessus du tableau, pas d'aide « de plus en plus hautes → accéléré », en-tête du fichier qui décrit les durées réelles. Avec plusieurs mobiles, les barres sont alignées par images. Passer à l'image suivante sans avoir pointé tous les mobiles affiche un avertissement.
- **Nom du fichier** tiré du titre neutre de la vidéo (« mesures-balle-lachee-devant-un-mur.csv »), jamais du nom du fichier vidéo (qui peut contenir la conclusion).

---

## 📱 Écran, tablette, doigt, clavier

L'image **remplit la place disponible** : plus grand rectangle aux proportions de la vidéo (pas de bandes noires, pas de plafond de taille), mise en page sur toute la fenêtre ou le cadre qui contient l'app. La disposition dépend de la **forme** de la fenêtre : dès qu'elle est plus large que haute (largeur ≥ 1,1 × hauteur, au moins 460 px), commandes, consignes et guide passent dans un **panneau latéral** et la vidéo prend toute la hauteur — y compris un téléphone couché (640 × 360, 844 × 390) ; sinon les barres sont empilées et compactes. Les hauteurs des textes au-dessus de l'image (consigne, ligne d'état, message d'étalonnage) sont réservées : **l'image ne change jamais de taille ni de place pendant un geste ni entre deux points**, ni en passant de Pointer à Étalonner (en portrait, la barre d'étalonnage prend exactement la place des réglages et de la consigne). Un glisser de bout d'étalonnage interrompu (deuxième doigt, rotation, question) remet le bout à sa place : l'échelle n'a qu'une source, le calibrateur. Si l'image devait faire moins de 200 × 130 px (fenêtre de 360 px de haut ou moins en portrait), l'app affiche « Tourne ton écran ou agrandis la fenêtre » au lieu d'une image minuscule. À l'étape Graphiques en portrait, la page peut défiler : graphique et tableau gardent au moins 220 px de haut. Mesures (vidéo de départ, `tests/verifier-ergonomie.mjs` partie 1) : 45 % de la fenêtre à 360 × 640, 52 % à 640 × 360, 60 % à 768 × 1024, 57 % à 1024 × 768, 61 % à 1366 × 768, 63 % à 1920 × 1080, 47 % dans un cadre de 340 × 573 comme dans 749 × 666. Le canevas est net sur les écrans haute densité (mémoire = taille affichée × densité, plafonnée à 2 et à 6 millions de pixels).

- **Pendant un geste** (doigt posé, loupe), les marques des autres points s'effacent presque : elles ne cachent pas le mobile, ni sur l'image ni dans la loupe.
- **Après une lecture** (▶), le premier toucher ramène à l'image de travail (celle qui suit le dernier point, ou la première si la lecture est allée jusqu'au bout) et le dit, au lieu de pointer une image au hasard ; un clic pendant la lecture met en pause sur cette image. Dès que l'élève choisit lui-même une image (boutons, flèches, curseur, Début, « Annuler »), y compris pendant la lecture, il pointe sur celle-ci (remplacement ou insertion). Quel que soit le chemin qui arrête une lecture (bouton, Espace, toucher de l'image, fin, passage aux graphiques, page cachée), l'app recale la vidéo par une recherche vers le milieu d'une image entière et n'accepte aucun point avant que cette image soit affichée : l'image pointée est toujours celle qu'on voit (vérifié sur 48 pauses contre les images extraites par ffmpeg). Toutes les images des vidéos sont atteignables, y compris la dernière des vidéos qui ne commencent pas à 0 s.
- **Questions** (changer de vidéo, nouvel enregistrement, reprise) : affichées au-dessus des commandes, jamais sur l'image ; tant qu'une question est ouverte, l'image ne prend aucun point, les bouts d'étalonnage ne se déplacent pas, les menus sont inactifs, et un toucher arrivé moins de 400 ms après l'ouverture est ignoré. Échap répond « garder mon travail » ; pour « Reprendre ton pointage ? », Échap ne fait rien (il faut choisir). Une sauvegarde incohérente est ignorée.
- **Pointer au doigt** : pose le doigt sur l'objet. Une **loupe** (× 3 par rapport à l'affichage, toujours entièrement visible) apparaît au-dessus du doigt avec un réticule : fais glisser pour placer le réticule, puis **relâche**. Pour abandonner, glisse hors de l'image avant de relâcher. Si l'écran tourne ou change de taille pendant que le doigt est posé, le geste est annulé (court message) et rien n'est enregistré.
- **Souris** : le viseur suit la souris ; clic = pointer ; Ctrl+clic = annuler ; loupe pendant l'étalonnage.
- **Clavier** : ← → changent toujours d'image (hors champs de saisie et menus), Espace lecture / pause, Début revenir au début, Ctrl+Z ou Retour arrière annuler. Le **réticule clavier** n'apparaît que sur demande : l'image ayant le focus (Tab, cadre jaune), Entrée le fait apparaître au centre ; les flèches le déplacent alors d'un pixel vidéo (Maj : 10), Entrée pointe, Échap le fait disparaître (les flèches changent de nouveau d'image). Un clic de souris ne l'active jamais ; un mouvement de souris ou un toucher le fait disparaître. Tant qu'il est affiché (souris immobile), un clic pointe au réticule, là où l'élève le voit. La règle est rappelée dans la consigne et dans l'info-bulle de l'image.
- **Curseur de temps** : une position par image, poignée de 44 px.
- **Accessibilité** : l'image est interactive (`role="application"`, décrite comme « image de la vidéo à pointer », avec la consigne et la ligne d'état en description), annonce discrète de chaque point pour les lecteurs d'écran, focus visible, contrastes d'au moins 4,5:1 sur les barres, cibles d'au moins 44 px.
- **Webcam** : chaque image filmée garde son instant réel (la cadence d'une caméra n'est pas régulière) : les durées Δt sont les vraies, et l'app signale quand elles sont inégales. Un nouvel enregistrement efface les points après confirmation. Proposée dans le menu des vidéos seulement si le navigateur peut ouvrir la caméra (adresse https:// ou localhost). Sur tablette, la caméra arrière est choisie si elle existe (640 × 480, enregistrement limité à 20 s). Si l'app est intégrée dans une page d'un autre site, ce cadre doit autoriser la caméra (`allow="camera"`).
- **Plein écran** : bouton « ⛶ Plein écran » quand l'app est ouverte seule (pas dans un cadre : dans le site, c'est la page qui le fournit), sauf sur un écran de moins de 420 px de large.
- **Vidéos chargées en entier** (15 à 400 Ko) puis lues depuis la mémoire du navigateur (adresse `blob:` de la même origine) : se déplacer image par image marche même si le serveur ne gère pas les requêtes partielles (Range). Pourcentage de chargement affiché ; repli sur l'adresse directe si ce chargement échoue (page ouverte en `file://`, par exemple) ; dans ce cas, l'app vérifie que chaque image demandée est bien celle affichée et, si le serveur ne permet pas d'aller à une image précise, refuse le pointage avec un message plutôt que d'enregistrer des points faux.
- Fonctionne sans Internet et n'envoie aucune donnée.

## 🎥 Support de la Webcam

Une nouvelle fonctionnalité a été ajoutée pour permettre l'enregistrement de vidéos via votre webcam.  
Vous pouvez démarrer et arrêter l'enregistrement en cliquant sur le bouton "Enregistrer" qui clignote pendant l'enregistrement pour indiquer l'état actif.  
Les vidéos enregistrées peuvent ensuite être lues, mises en pause, avancées et reculées comme les autres vidéos.

---

## 📜 Liste des vidéos et explications

*MANY THANKS TO* : [Webetab](https://webetab.ac-bordeaux.fr/Pedagogie/Physique/site/labo/tice/c_video_tice.htm)

Le catalogue (titre affiché, rubrique, fréquence, étalon) est dans **`videos.js`**. Étalon = longueur connue écrite dans la vidéo elle-même (ou donnée dans ce README) ; il n'est jamais inventé.

| Fichier | Titre affiché | Étalon |
|---|---|---|
| TableHorizRectiligneUniforme_631g7.mp4 | Mobile lancé sur une table horizontale (coussin d'air) | — (règle visible, chiffres illisibles : valeur à fournir par l'enseignant) |
| chute.mp4 | Balle lâchée devant un mur (vidéo de départ) | tige verticale 1,85 m (écrit) |
| disque33t.mp4 | Platine de disque à 33 tours par minute | rayons 7,5 cm et 12 cm (écrits) |
| parabolique.mp4 | Balle lancée devant un mur | tige 1,85 m (écrit) |
| moto-relatif.mp4 | Balle lâchée par un motard qui roule | trait de 0,6 m (écrit), visible seulement au début |
| billegrosse.mp4 / billepetite.mp4 | Grosse (2 cm) / petite (1 cm) bille qui tombe dans l'eau | trait de 20 cm (écrit) |
| bille1-iv5.mp4, bille2-iv5.mp4, bille3-iv5.mp4 | Bille de 16,7 g / 28,0 g / 43,4 g qui tombe dans un liquide | 0,50 m entre les repères (écrit). Filmées à 30 images/s (panneau) : bille3 est encodée à 31 images/s, l'app compte bien 1/30 s entre deux images |
| BilleFer_Eau25C_2g055_7mm93.mp4 | Bille de fer qui tombe dans une éprouvette d'eau | — (règle visible, chiffres illisibles) |
| disque45t.mp4 | Platine de disque à 45 tours par minute | rayons 7,5 cm et 12 cm (écrits) |
| PenduleSimpleAmorti_38cm1.mp4 | Pendule qui oscille | — (règle visible, chiffres illisibles) |
| RessortVertical_Masse24g30.mp4 | Masse accrochée à un ressort vertical | — (règle visible, chiffres illisibles) |
| TableHorizChocPresqueElastique_R631g7_B749g2.mp4 | Deux mobiles qui se heurtent | — (règle visible, chiffres illisibles) |
| Eclatement2MA.mp4 | Deux mobiles attachés qui se séparent | — |
| MasseRoule.mp4 | Cylindre qui roule sur un rail | — |
| vague2cm5.mp4 / vague3cm0.mp4 | Vague dans un canal (2,5 / 3,0 cm d'eau) | 1 m entre les flèches (écrit) |
| vague3.mp4 | Vague dans un aquarium | trait rouge de 1 m (écrit) |
| VenusTerreMars.mp4 | Vénus, la Terre et Mars autour du Soleil (animation) | barre de 200 000 000 km (écrit) ; 25 jours par image (compteur) : distances en km, temps en jours, vitesses en km/jour (le résumé donne aussi des km/s) |

`parabole.mp4` (balle devant un mur gris, trait de 1 m) est dans le dossier mais n'est pas proposée dans le menu.

---

## 🔄 Conversion de vidéos

Le script **convert2mp4.py** permet de convertir des fichiers vidéo au format `.avi` en `.mp4`.  
Les fichiers convertis sont placés dans le dossier **videos/**.

> **Astuce :**  
> Ajoutez vos fichiers vidéo dans le code en indiquant leur framerate respectif, obtenu grâce à la commande suivante :  
> 
> ```bash
> ffprobe -v error -select_streams v -of default=noprint_wrappers=1:nokey=1 -show_entries stream=r_frame_rate vague3.mp4
> ```

---

## 📄 Licence

Le projet est sous licence [GNU General Public License v2.0](LICENSE).  
Cette licence vous offre la liberté de partager et de modifier le logiciel.

---

## ⚙️ Fonctionnement Global de l'Application

- **VideoPlayer (videoplayer.js)** :  
  Gère la lecture vidéo avec des fonctionnalités telles que démarrer, mettre en pause, avancer et revenir en arrière.  
  L'instance est créée et gérée depuis **mecavideo.js**.

- **WebcamPlayer (webcamplayer.js)** :  
  Permet d'enregistrer des vidéos à partir de votre webcam.  
  Le bouton d'enregistrement clignote pendant l'enregistrement pour indiquer l'activité, et vous pouvez arrêter l'enregistrement en cliquant à nouveau.

- **interface.js** :  
  Taille d'affichage (plus grand rectangle aux proportions de la vidéo dans la zone libre, mesurée par ResizeObserver), conversions écran ↔ pixels vidéo, pointage au doigt avec loupe, à la souris et au clavier, raccourcis, boutons et curseur de temps.

- **videos.js** :  
  Catalogue des vidéos : titre, rubrique, fréquence, étalon.

- **Visor (visor.js)** :  
  Gère l'affichage d'un viseur (curseur) sur le canvas, permettant de suivre la position de la souris et d'indiquer les points tapés.

- **mecavideo.js** :  
  Regroupe l'initialisation de l'application, la création des menus déroulants (avec émoticônes pour une meilleure lisibilité 😍), et la gestion des différents modes (Vidéo, Webcam, Graphique).

- **Graph & Data (graph.js, data.js)** :  
  Ces fichiers gèrent respectivement l'affichage graphique et les points. Chaque point est rattaché à son numéro d'image et garde sa position en pixels vidéo ; les mètres sont calculés avec l'échelle courante ; `getIntervalles()` donne d, Δt et v = d / Δt pour chaque intervalle.

- **tests/** :  
  `verifier-ergonomie.mjs` (Chrome sans écran, sans dépendance npm) vérifie tailles d'écran, parcours complet, exactitude du pointage, rotation, saisie des longueurs, clavier, webcam simulée, console et requêtes. Pas nécessaire au fonctionnement de l'app.

- **guide.js** :  
  Guide de l'activité en 5 étapes (repliable), qui suit l'état de l'application.

- **mesures.js** :  
  Nombres à la française (virgule), unités m ou px, export CSV pour tableur (téléchargement local, aucun envoi).

Profitez bien de **jsmecavideo** et n'hésitez pas à explorer le code pour mieux comprendre le fonctionnement de chaque module. Amusez-vous avec les fonctionnalités et personnalisez l'interface selon vos goûts ! 🚀✨
