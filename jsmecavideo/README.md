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

L'application accompagne la démarche des chapitres « Vitesse et mouvement » (6e) et « Mouvement et vitesse » (5e) : décrire une trajectoire (rectiligne, circulaire, curviligne), reconnaître un mouvement uniforme, accéléré ou ralenti, utiliser v = d / t.

- **Guide de l'activité** (bouton **« 📋 Guide »**, ouvert au départ, repliable) : cinq étapes touchables — 1 Vidéo (et référentiel), 2 Étalonner (et pourquoi), 3 Pointer, 4 Observer la chronophotographie, 5 Conclure. L'étape affichée suit ce que fait l'élève (mode choisi, nombre de points, graphique affiché). Le texte a une hauteur fixe : l'image ne bouge pas sous le doigt.
- **« 1 image sur … »** (menu *Chaque image / 1 image sur 2 / 1 image sur 5*) : après chaque point, la vidéo avance de 1, 2 ou 5 images. Pour un mouvement lent (« TableHorizRectiligneUniforme »), « 1 image sur 5 » donne des écarts d'environ 6,6 cm au lieu de 1,3 cm : l'imprécision du pointage (1 à 2 px) pèse beaucoup moins, la chronophotographie est plus lisible et il y a moins de points à placer.
- **Points numérotés** (1, 2, 3…) sur l'image, comme sur une chronophotographie (un numéro est omis s'il chevauche le précédent).
- **Graphiques** (menu « 📈 Graphiques ») : titres, axes et unités en français, virgule décimale.
  - *Trajectoire (positions successives)* : même échelle sur les deux axes (un cercle reste un cercle, utile pour « disque33t »).
  - *Écart entre deux positions (d)* : une barre par intervalle (« 1→2 », « 2→3 »…), axe partant de 0, ligne de la moyenne. Barres de même hauteur → vitesse constante → uniforme ; de plus en plus hautes → accéléré ; de plus en plus basses → ralenti.
  - *Vitesse sur chaque intervalle (v = d / t)* : en m/s, avec la moyenne convertie en km/h (× 3,6).
  - *Position x / y au cours du temps* ; les graphiques de lycée (v(t) centrée, vx, vy, a(t)) restent dans un groupe « Pour aller plus loin (lycée) ».
  - Sous le graphique, un **résumé** : nombre d'écarts, plus petit, plus grand, moyenne, durée entre deux points. L'application ne conclut pas à la place de l'élève : elle affiche les mesures et rappelle que de petites différences viennent du pointage. Si les durées entre points ne sont pas toutes égales, elle conseille de comparer les vitesses.
- **Sans étalonnage**, tout est en **pixels** (px, px/s) et c'est écrit : barre d'information « Pas d'étalonnage : mesures en pixels », axes en px, avertissement sous le graphique. Comparer les écarts reste possible ; une vitesse en m/s demande l'étalonnage. Changer de vidéo efface l'étalonnage (l'échelle dépend de la vidéo) et l'application le signale.
- **Enregistrer les mesures (tableur)** (mode Graphiques) : fichier CSV pour LibreOffice Calc ou un autre tableur — séparateur `;`, virgule décimale, UTF-8, une ligne par point : mobile, n° du point, t (s), x, y, d depuis le point précédent, durée, v = d / t. Une première ligne rappelle la vidéo et l'échelle. Le fichier est fabriqué dans le navigateur et enregistré sur l'appareil : **rien n'est envoyé**.
- Messages au **tutoiement**, comme les consignes du site ; vocabulaire du cours (référentiel, trajectoire, chronophotographie, uniforme, accéléré, ralenti, v = d / t).

Cas vérifié (Chrome sans écran, tactile émulé) : « TableHorizRectiligneUniforme » étalonnée sur 8 intervalles numérotés de la règle (0,80 m ; numéros tous les 10 cm, déduits du comptage des graduations car les chiffres sont illisibles à 352 × 288), 11 points « 1 image sur 5 » sur le centre du mobile : écarts de 0,062 à 0,069 m (moyenne 6,6 cm), v de 0,31 à 0,35 m/s, moyenne 0,33 m/s (1,2 km/h) ; la pente des positions mesurées image par image hors de l'application donne 0,335 m/s.

**Corrections faites en même temps** : avec plusieurs mobiles, tous les mobiles sont pointés sur la **même image** avant que la vidéo avance (avant, elle avançait après chaque mobile) ; « Annuler » revient exactement à l'image du point retiré ; les images sont atteintes sur une grille fixe (début + k / fréquence) : pour les vidéos dont la première image n'est pas à 0 s (TableHorizRectiligneUniforme, Eclatement2MA, BilleFer : 0,08 à 0,12 s), le navigateur affichait parfois l'image précédente de celle enregistrée ; le numéro « Image » compte à partir de la première image réelle.

---

## 📱 Utilisation sur tablette (et au doigt)

L'application s'adapte à l'écran : l'image garde sa résolution interne de 800 × 600 px (les mesures ne changent pas), mais elle est affichée à la taille qui tient dans la fenêtre, sans défilement horizontal (tablette en paysage ou en portrait, ou cadre intégré dans une page). Elle fonctionne sans Internet et n'envoie aucune donnée.

- **Pointer au doigt** : posez le doigt sur l'objet. Une **loupe** (× 3) apparaît au-dessus du doigt avec un réticule : faites glisser le doigt pour placer le réticule exactement sur l'objet, puis **relâchez** : le point est enregistré à cet endroit et la vidéo avance d'une image. Un simple toucher marche aussi (le point est pris là où le doigt s'est posé). Pour abandonner un pointage commencé, glissez le doigt hors de l'image avant de le relâcher.
- **Annuler** : le bouton **« ↶ Annuler le dernier point »** retire le dernier point et recule d'une image (à la souris, Ctrl+clic fait toujours la même chose).
- **Étalonnage** (mode « 📏 Étalonnage », appelé « Calibration » dans les anciennes versions) : choisissez-le, pointez les deux extrémités d'un objet de longueur connue (même loupe qu'au pointage), puis saisissez la distance réelle en mètres. Le clavier numérique s'ouvre ; la virgule est acceptée (`0,5`), l'unité « m » aussi. « Valider » ou la touche Entrée enregistre l'échelle, « Recommencer » efface les deux points.
- **Boutons et menus** : au moins 48 px de haut, espacés. Le curseur de temps se manipule au doigt. Sur l'image, le doigt ne fait ni défiler ni zoomer la page ; un appui long n'ouvre pas de menu.
- **Webcam** : sur tablette, la caméra arrière est choisie si elle existe (640 × 480, enregistrement limité à 20 s pour ne pas saturer la mémoire). Les navigateurs n'autorisent la caméra que sur une adresse **https://** (ou `localhost`) : sinon, un message l'explique et les vidéos de la liste restent utilisables. Si l'app est intégrée dans une page d'un autre site (iframe d'une autre origine), ce cadre doit autoriser la caméra (`allow="camera"`).
- À la souris, rien ne change : le viseur suit la souris, le clic pointe, Ctrl+clic annule.

---

## 🎥 Support de la Webcam

Une nouvelle fonctionnalité a été ajoutée pour permettre l'enregistrement de vidéos via votre webcam.  
Vous pouvez démarrer et arrêter l'enregistrement en cliquant sur le bouton "Enregistrer" qui clignote pendant l'enregistrement pour indiquer l'état actif.  
Les vidéos enregistrées peuvent ensuite être lues, mises en pause, avancées et reculées comme les autres vidéos.

---

## 📜 Liste des vidéos et explications

*MANY THANKS TO* : [Webetab](https://webetab.ac-bordeaux.fr/Pedagogie/Physique/site/labo/tice/c_video_tice.htm)

- **'videos/MasseRoule.mp4'** ⚽ : Une vidéo montrant une masse qui roule.
- **'videos/PenduleSimpleAmorti_38cm1.mp4'** ⏱️ : Une vidéo d'un pendule simple amorti.
- **'videos/RessortVertical_Masse24g30.mp4'** 🌀 : Une vidéo d'un ressort vertical avec une masse de 24g.
- **'videos/bille1-iv5.mp4'** ⚫ : Une vidéo d'une bille en mouvement.
- **'videos/bille2-iv5.mp4'** ⚫ : Une autre vidéo d'une bille en mouvement.
- **'videos/bille3-iv5.mp4'** ⚫ : Une troisième vidéo d'une bille en mouvement.
- **'videos/billegrosse.mp4'** 🎞️ : Une vidéo d'une grosse bille.
- **'videos/billepetite.mp4'** 🎞️ : Une vidéo d'une petite bille.
- **'videos/BilleFer_Eau25C_2g055_7mm93.mp4'** 🎞️ : Une vidéo d'une bille en fer dans l'eau (25°C).
- **'videos/moto-relatif.mp4'** 🏍️ : Une vidéo d'une moto pour étudier le mouvement relatif.
- **'videos/vague2cm5.mp4'** 🌊 : Une vidéo d'une vague de 2,5 cm.
- **'videos/vague3.mp4'** 🌊 : Une vidéo d'une vague de 3 cm.
- **'videos/vague3cm0.mp4'** 🌊 : Une autre vidéo d'une vague de 3 cm.
- **'videos/Eclatement2MA.mp4'** 💥 : Une vidéo d'un éclatement.
- *etc...* 

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
  Adaptation aux tablettes : mise à l'échelle du canevas selon la taille de la fenêtre, pointage tactile avec loupe (le point est validé au relâchement du doigt), boutons et curseur de temps adaptés au doigt.

- **Visor (visor.js)** :  
  Gère l'affichage d'un viseur (curseur) sur le canvas, permettant de suivre la position de la souris et d'indiquer les points tapés.

- **mecavideo.js** :  
  Regroupe l'initialisation de l'application, la création des menus déroulants (avec émoticônes pour une meilleure lisibilité 😍), et la gestion des différents modes (Vidéo, Webcam, Graphique).

- **Graph & Data (graph.js, data.js)** :  
  Ces fichiers gèrent respectivement l'affichage graphique et la gestion des données associées aux points que vous pouvez ajouter sur la vidéo ou la webcam. Chaque point garde sa position en pixels et sait s'il a été pointé après un étalonnage (mètres) ou non (pixels) ; `getIntervalles()` donne d, t et v = d / t pour chaque intervalle.

- **guide.js** :  
  Guide de l'activité en 5 étapes (repliable), qui suit l'état de l'application.

- **mesures.js** :  
  Nombres à la française (virgule), unités m ou px, export CSV pour tableur (téléchargement local, aucun envoi).

Profitez bien de **jsmecavideo** et n'hésitez pas à explorer le code pour mieux comprendre le fonctionnement de chaque module. Amusez-vous avec les fonctionnalités et personnalisez l'interface selon vos goûts ! 🚀✨
