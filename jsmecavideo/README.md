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
- **Vidéos** : titres en français (ce qu'on voit, sans la conclusion), rangés par rubriques, « Pour commencer » en tête (mobile sur une table, balle lâchée, platine de disque). Le catalogue est dans `videos.js` (titre, rubrique, fréquence, étalon).
- **Guide de l'activité** (bouton « 📋 Guide ») : cinq étapes touchables — 1 Vidéo, 2 Étalonner, 3 Pointer, 4 Observer, 5 Conclure. Toucher une étape y conduit (2 → Étalonner, 3 → Pointer, 4 → trajectoire, 5 → écarts). L'étape affichée suit ce que fait l'élève. Sur un écran étroit, le guide se replie au premier point et pendant l'étalonnage ; le bouton le rouvre.
- **Une consigne d'action** bien visible (adaptée au doigt, à la souris ou au clavier) et, dessous, une **ligne d'état** : image, instant t (compté depuis la première image : 0,000 s), nombre de points, échelle.
- **« Images pointées »** (toutes / 1 sur 2 / 1 sur 5) : après chaque point, la vidéo avance de 1, 2 ou 5 images. Pour un mouvement lent (le mobile sur la table), « 1 sur 5 » donne des écarts d'environ 6,7 cm au lieu de 1,3 cm : l'imprécision du pointage pèse beaucoup moins. À la fin de la vidéo, l'app le dit et propose « Voir les graphiques » : elle ne crée jamais de dernier intervalle plus court que les autres.
- **Points numérotés** (1, 2, 3…) comme sur une chronophotographie. Chaque mobile a sa couleur (palette Okabe-Ito, lisible par les daltoniens) **et sa forme** : × orange foncé, + bleu, ○ vert, □ jaune orangé, sur l'image comme dans les graphiques. Croix de 12 px et numéros de 14 px quelle que soit la taille de l'image, cernés de noir pour rester lisibles sur une vidéo claire ou sombre.
- **Corriger** : « ↶ Annuler » (ou Ctrl+Z, Retour arrière, Ctrl+clic) annule la dernière action et revient à son image. Pointer une image déjà pointée **remplace** son point (on corrige le point 3 sans annuler les suivants) ; pointer une image plus ancienne non pointée **insère** le point à sa place. Un double-clic ne crée qu'un point. Un clic pendant la lecture met d'abord la vidéo en pause sur une image entière.
- **Étalonnage** : pointer les deux bouts d'un objet de longueur connue (loupe au doigt et à la souris ; les deux bouts se déplacent ensuite en les faisant glisser), puis écrire la longueur : « 80 cm », « 0,8 », « 0.8 m », « 800 mm » sont acceptés et la conversion s'affiche (« = 0,80 m »). Une saisie incomprise est signalée et le reste. « Recommencer » efface les deux bouts ; « Passer au pointage → » apparaît une fois l'échelle validée. Rouvrir l'étalonnage montre l'échelle actuelle. Quand la vidéo montre une longueur connue (écrite dans l'image), la consigne d'étalonnage la rappelle (champ `etalon` de `videos.js`).
- **Un seul repère** : les pixels natifs de la vidéo (ou de la webcam), origine au coin bas-gauche de l'image, axe y vers le haut. Points et étalonnage y sont enregistrés ; les mètres sont calculés à la lecture avec l'échelle courante. Conséquence : étalonner après avoir pointé fonctionne, et un nouvel étalonnage s'applique à tous les points. Rien ne dépend de la taille d'affichage.
- **Graphiques** (étape « 📈 Graphiques ») : titres, aides de lecture (en texte qui se replie sur un écran étroit), axes et unités en français, virgule décimale, graduations rondes.
  - *Trajectoire (positions successives)* : même échelle sur les deux axes (un cercle reste un cercle, utile pour la platine de disque).
  - *Écart entre deux positions (d)* : une barre par intervalle (« 1→2 », « 2→3 »…), axe partant de 0, ligne de la moyenne.
  - *Vitesse sur chaque intervalle (v = d / Δt)* : en m/s, avec la moyenne convertie en km/h (× 3,6).
  - *Position x / y au cours du temps* (l'instant t est compté depuis le premier point) ; les graphiques de lycée (v(t) centrée, vx, vy, a(t)) restent dans un groupe « Pour aller plus loin (lycée) ».
  - Sous le graphique, un **résumé** : nombre d'écarts, plus petit, plus grand, moyenne, durée Δt entre deux points. Si les durées ne sont pas toutes égales, l'app conseille de comparer les vitesses.
- **Sans étalonnage**, tout est en **pixels vidéo** (px, px/s) et c'est écrit (ligne d'état, axes, message sous le graphique), sans alarme.
- **Tableau des mesures** (étape Graphiques → « Tableau des mesures ») : un vrai tableau, lisible au vidéoprojecteur, avec les mêmes colonnes que le fichier pour tableur.
- **Enregistrer les mesures (tableur)** (étape Graphiques) : fichier CSV pour LibreOffice Calc — séparateur `;`, virgule décimale, UTF-8 avec BOM, fins de ligne CRLF, une ligne par point. Colonnes : Mobile, Point n°, Image n°, instant t (s), x, y, d depuis le point précédent, durée Δt depuis le point précédent (s), v = d / Δt. La première ligne rappelle la vidéo, la fréquence (images/s), le pas de pointage et l'échelle. L'instant t est compté depuis le premier point (t = 0). Les décimales suivent la finesse réelle de la mesure (un pixel vidéo) : au millimètre pour une échelle de 3 mm par pixel, pas de précision illusoire. Le fichier est fabriqué dans le navigateur et enregistré sur l'appareil : **rien n'est envoyé**.
- **Travail gardé au rechargement** : en cas de rechargement de la page, l'app propose « Reprendre ton pointage ? » (vidéo, points, étalonnage, réglages). La sauvegarde est dans `sessionStorage` : elle disparaît à la fermeture de l'onglet, pour qu'un élève ne retrouve pas le travail du précédent sur une tablette partagée. Rien n'est envoyé nulle part. Pas de sauvegarde pour la webcam (les images filmées restent en mémoire).
- Messages au **tutoiement** ; vocabulaire du cours (référentiel, trajectoire, chronophotographie, uniforme, accéléré, ralenti, instant t, durée Δt, v = d / Δt).

Cas vérifié (Chrome sans écran, `tests/verifier-ergonomie.mjs`) : « Mobile lancé sur une table horizontale », étalonnage 0,80 m sur 266 px vidéo, 10 points « 1 sur 5 » : d = 0,0671 m, Δt = 0,200 s, v = 0,336 m/s sur chaque intervalle, exactement comme l'ancienne version (avant la refonte, commit `fc875fe`) pour le même pointage. Les positions x en mètres diffèrent de l'ancienne version d'une constante (l'origine est désormais le bord gauche de l'image vidéo, et non celui du cadre 800 × 600 qui avait des bandes noires) ; y, d, Δt et v sont identiques. Les valeurs en pixels sont désormais des pixels vidéo (1 px = 3,01 mm sur cette vidéo, au lieu de 1,44 mm pour un pixel du cadre 800 × 600).

---

## 📱 Écran, tablette, doigt, clavier

L'image **remplit la place disponible** : plus grand rectangle aux proportions de la vidéo (pas de bandes noires, pas de plafond de taille), mise en page sur toute la fenêtre ou le cadre qui contient l'app, sans défilement. En paysage assez large (au moins 900 px et plus large que haut), commandes, consignes et guide sont dans un **panneau latéral** et la vidéo prend toute la hauteur ; en portrait ou sur écran étroit, les barres sont compactes. Mesuré dans Chrome sans écran : l'image occupe 45 % d'un écran 360 × 640, 60 % d'un 768 × 1024, 58 % d'un 1024 × 768, 61 % d'un 1366 × 768, 63 % d'un 1920 × 1080 (vidéo de départ). Le canevas est net sur les écrans haute densité (mémoire = taille affichée × densité, plafonnée à 2 et à 6 millions de pixels).

- **Pointer au doigt** : pose le doigt sur l'objet. Une **loupe** (× 3 par rapport à l'affichage, toujours entièrement visible) apparaît au-dessus du doigt avec un réticule : fais glisser pour placer le réticule, puis **relâche**. Pour abandonner, glisse hors de l'image avant de relâcher. Si l'écran tourne ou change de taille pendant que le doigt est posé, le geste est annulé (court message) et rien n'est enregistré.
- **Souris** : le viseur suit la souris ; clic = pointer ; Ctrl+clic = annuler ; loupe pendant l'étalonnage.
- **Clavier** : quand l'image a le focus (Tab, cadre jaune), les flèches déplacent le réticule d'un pixel vidéo (Maj : 10), Entrée pointe, Retour arrière annule. Ailleurs (hors champs de saisie) : ← → image précédente / suivante, Espace lecture / pause, Début revenir au début, Ctrl+Z ou Retour arrière annuler. Les boutons rappellent ces touches dans leur info-bulle.
- **Curseur de temps** : une position par image, poignée de 44 px.
- **Accessibilité** : image avec `role="img"` et une description tenue à jour, annonce discrète de chaque point pour les lecteurs d'écran, focus visible, contrastes d'au moins 4,5:1 sur les barres.
- **Webcam** : proposée dans le menu des vidéos seulement si le navigateur peut ouvrir la caméra (adresse https:// ou localhost). Sur tablette, la caméra arrière est choisie si elle existe (640 × 480, enregistrement limité à 20 s). Si l'app est intégrée dans une page d'un autre site, ce cadre doit autoriser la caméra (`allow="camera"`).
- **Plein écran** : bouton « ⛶ Plein écran » quand l'app est ouverte seule (pas dans un cadre : dans le site, c'est la page qui le fournit), sauf sur un écran de moins de 420 px de large.
- **Vidéos chargées en entier** (15 à 400 Ko) puis lues depuis la mémoire du navigateur (adresse `blob:` de la même origine) : se déplacer image par image marche même si le serveur ne gère pas les requêtes partielles (Range). Pourcentage de chargement affiché ; repli sur l'adresse directe si ce chargement échoue (page ouverte en `file://`, par exemple).
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
| TableHorizRectiligneUniforme_631g7.mp4 | Mobile lancé sur une table horizontale (coussin d'air) | règle jaune : numéros tous les 10 cm (déduit du comptage des graduations, chiffres illisibles — à confirmer) |
| chute.mp4 | Balle lâchée devant un mur | tige verticale 1,85 m (écrit) |
| disque33t.mp4 | Platine de disque à 33 tours par minute | rayons 7,5 cm et 12 cm (écrits) |
| parabolique.mp4 | Balle lancée devant un mur | tige 1,85 m (écrit) |
| moto-relatif.mp4 | Balle lâchée par un motard qui roule | trait de 0,6 m (écrit) |
| billegrosse.mp4 / billepetite.mp4 | Grosse (2 cm) / petite (1 cm) bille qui tombe dans l'eau | trait de 20 cm (écrit) |
| bille1-iv5.mp4, bille2-iv5.mp4, bille3-iv5.mp4 | Bille de 16,7 g / 28,0 g / 43,4 g qui tombe dans un liquide | 0,50 m entre les repères (écrit) |
| BilleFer_Eau25C_2g055_7mm93.mp4 | Bille de fer qui tombe dans une éprouvette d'eau | — (règle visible, chiffres illisibles) |
| disque45t.mp4 | Platine de disque à 45 tours par minute | rayons 7,5 cm et 12 cm (écrits) |
| PenduleSimpleAmorti_38cm1.mp4 | Pendule qui oscille | — (règle visible, chiffres illisibles) |
| RessortVertical_Masse24g30.mp4 | Masse accrochée à un ressort vertical | — (règle visible, chiffres illisibles) |
| TableHorizChocPresqueElastique_R631g7_B749g2.mp4 | Deux mobiles qui se heurtent | — (règle visible, chiffres illisibles) |
| Eclatement2MA.mp4 | Deux mobiles attachés qui se séparent | — |
| MasseRoule.mp4 | Cylindre qui roule sur un rail | — |
| vague2cm5.mp4 / vague3cm0.mp4 | Vague dans un canal (2,5 / 3,0 cm d'eau) | 1 m entre les flèches (écrit) |
| vague3.mp4 | Vague dans un aquarium | trait rouge de 1 m (écrit) |
| VenusTerreMars.mp4 | Vénus, la Terre et Mars autour du Soleil (animation) | — |

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
