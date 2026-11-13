# Orbitarium : Simulation Solaire Interactive 🚀🌌✨

## Description 🌟
"Orbitarium" est une application web qui vous permet de visualiser et d'explorer le système solaire. Cette simulation dynamique vous offre la possibilité d'observer le ballet cosmique du Soleil 🌞, des planètes 🌍, des satellites 🛸 et même de la comète Halley ☄️ grâce à des animations basées sur des calculs orbitaux réalistes.

## Fonctionnalités Principales 🎮
- **Visualisation en Temps Réel** ⏱️  
  Suivez le ballet cosmique avec des trajectoires calculées en fonction des paramètres orbitaux réels.  
- **Interaction et Navigation** 🎯  
  - **Centre et Zoom** 🔍 : Cliquez ou touchez une planète, ou sélectionnez-la dans le menu déroulant, pour centrer la vue sur elle. Utilisez la molette de la souris ou le pincement à deux doigts pour zoomer/dézoomer.  
  - **Déplacement** 🖐️ : Glissez un doigt (ou la souris, bouton enfoncé) pour déplacer la vue ; le menu affiche alors « Vue libre ».  
  - **Contrôle du Temps** ⏰ : Accélérez ou ralentissez la simulation avec les boutons dédiés.  
  - **Réinitialisation** 🔄 : Cliquez sur le Soleil pour le recentrer ; choisissez « Soleil » dans le menu, ou touchez deux fois le fond, pour revoir tout le système.
- **Affichage Personnalisable** 🎨  
  - Activez/désactivez l'affichage des orbites et des noms via les boutons correspondants.  
  - Visualisez des trajectoires (traces) pour chaque corps céleste en activant les cases à cocher dans le panneau des options.
- **Rendus Spécifiques** 🎆  
  - L'orbite de Ceres est volontairement masquée pour faciliter la lecture de la simulation.  
  - Pluton ❄️, Saturne 🪐 et Jupiter 🌟 bénéficient de traitements visuels particuliers (orbite orientée, ellipses avec rotations et dégradés) pour enrichir l'expérience.
- **Ceintures d'Astéroïdes** 💫  
  L'ajout de deux ceintures d'astéroïdes fournissent des effets de groupe dynamiques et aléatoires, renforçant le réalisme du système solaire.

## Comment Utiliser ? 🎯
1. **Lancement** 🚀  
   Ouvrez le fichier `index.html` dans votre navigateur préféré (Chrome, Firefox, Safari, etc.).
2. **Navigation et Interaction** 🎮  
   - **Centrage** 🎯 : Utilisez le menu déroulant en haut pour centrer la vue sur une planète ou cliquez directement sur l'objet souhaité.  
   - **Zoom et Déplacement** 🔍 :  
     - Sur ordinateur 🖥️ : la molette (ou le pincement du pavé tactile) zoome autour de l'astre au centre ; glisser avec le bouton gauche déplace la vue ; un clic sur un astre le centre.  
     - Sur tablette ou téléphone 📱 : pincez à deux doigts pour zoomer autour du point situé entre vos doigts, glissez un doigt pour déplacer la vue, touchez un astre pour le suivre au centre (la zone de toucher est élargie à environ 24 px autour de l'astre, car les astres sont minuscules en vue d'ensemble), touchez deux fois le fond pour revenir à la vue d'ensemble.  
     - Le rappel de ces gestes est dans **Options → Commandes**.
3. **Personnalisation de l'Affichage** 🎨  
   - Activez/désactivez l'affichage des orbites et des noms grâce aux boutons "Orbites" et "Noms".  
   - Dans le panneau des options situé en bas, cochez les cases correspondantes pour afficher les trajectoires de différents corps (Soleil, planètes, satellites, etc.).

## Utilisation sur tablette et dans une page web 📱
- Boutons, menu et cases à cocher ont des cibles d'au moins 44 px ; toute la ligne d'une case « Traces » se touche.
- Le panneau Options défile au doigt si la fenêtre est basse ; l'aide des gestes y est repliée pour ne pas masquer le système.
- Le canvas est dessiné à la densité de l'écran (plafonnée à 2 pour ménager les tablettes modestes) : rendu net sur écran Retina.
- Rotation et redimensionnement conservent la portion du système observée.
- Pas de zoom de la page, de sélection de texte ni de menu contextuel sur appui long : le pincement agit sur le système solaire.
- L'application fonctionne dans un `iframe`, y compris réduit par `transform: scale(...)` : les coordonnées des doigts et de la souris sont calculées avec `getBoundingClientRect`. Le bouton « Plein écran » n'apparaît que si le plein écran est possible (iframe avec `allow="fullscreen"`, pas sur iPhone).
- Hors ligne : le service worker (`sw.js`, cache `orbitarium-v3`) garde une copie de l'application ; aucune ressource externe, aucune donnée collectée.

## Structure du Code 📁
Le projet est divisé en plusieurs fichiers JavaScript, chacun correspondant à une partie spécifique de la simulation :
- **index.html** 📄  
  Point d'entrée de l'application : contient la structure HTML, le canvas et les éléments de contrôle.
- **canvas.js** 🎨  
  Gère l'initialisation et le redimensionnement du canvas (densité de l'écran, rotation), les bornes du zoom et le déplacement de la vue.
- **controls.js** 🎮  
  Responsable des interactions utilisateur (Pointer Events : clic ou toucher d'un astre, glisser pour déplacer, pincement et molette pour zoomer, double toucher, boutons et menu).
- **drawing.js** ✏️  
  Contient les fonctions de dessin pour les orbites, les trajectoires, ainsi que les traitements de rendu spécifiques.
- **animation.js** 🎬  
  Implémente la boucle d'animation en temps réel pour mettre à jour l'état de la simulation.
- **planets.js** 🌍  
  Définit les caractéristiques de chaque planète, satellite et astéroïde, et intègre la comète Halley.
- **traces.js** ✨  
  Gère l'enregistrement et l'affichage des trajectoires (traces) des corps célestes.
- **simulation.js** 🎯  
  Coordonne l'ensemble de la simulation et lie les différents modules entre eux.

## Technologies Utilisées 🛠️
- **HTML5 & CSS3** 🌐 : Mise en page et styles pour l'interface.
- **JavaScript (ES6)** 📜 : Logique de simulation et interactivité.
- **Canvas API** 🎨 : Rendu graphique dynamique et animations fluides.

## Contributions et Améliorations Futures 🚀
- Ajouter de nouveaux corps célestes et satellites pour enrichir la simulation 🌠
- Intégrer des données astronomiques réelles pour un réalisme accru 📊
- Optimiser les performances et l'interface utilisateur pour une expérience mobile toujours plus intuitive 📱
- Améliorer la modularité du code et ajouter la possibilité d'extensions via une interface de configuration ⚙️

Si vous souhaitez contribuer, n'hésitez pas à forker le projet et à soumettre vos améliorations via une pull request ! 🤝

## Fichier manifest.json
Le fichier manifest.json définit les paramètres de l'application en tant que Progressive Web App (PWA). Il spécifie le nom, le mode d'affichage (standalone), les couleurs de thème et de fond, ainsi que les icônes utilisées pour l'installation sur les appareils mobiles.

---

Fait avec ❤️ pour tous les passionnés d'astronomie 🌟
