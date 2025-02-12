# Simulation Solaire Interactive 🚀🌌✨

## Description 🌟
"Simulation Solaire Interactive" est une application web qui vous permet de visualiser et d'explorer en temps réel le système solaire. Cette simulation dynamique vous offre la possibilité d'observer le ballet cosmique du Soleil 🌞, des planètes 🌍, des satellites 🛸 et même de la comète Halley ☄️ grâce à des animations basées sur des calculs orbitaux réalistes.

## Fonctionnalités Principales 🎮
- **Visualisation en Temps Réel** ⏱️  
  Suivez le ballet cosmique avec des trajectoires calculées en fonction des paramètres orbitaux réels.  
- **Interaction et Navigation** 🎯  
  - **Centre et Zoom** 🔍 : Cliquez sur une planète ou sélectionnez-la dans le menu déroulant pour centrer la vue. Utilisez la molette de la souris ou le geste de pincement sur mobile pour zoomer/dézoomer.  
  - **Contrôle du Temps** ⏰ : Accélérez ou ralentissez la simulation avec les boutons dédiés.  
  - **Réinitialisation** 🔄 : Cliquez sur le Soleil pour remettre la vue à zéro.
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
     - Sur ordinateur 🖥️ : utilisez la molette de la souris (ou Ctrl + molette dans certains cas) pour zoomer/dézoomer.  
     - Sur mobile 📱 : effectuez un geste de pincement pour ajuster le zoom et déplacez la vue en glissant.
3. **Personnalisation de l'Affichage** 🎨  
   - Activez/désactivez l'affichage des orbites et des noms grâce aux boutons "Orbites" et "Noms".  
   - Dans le panneau des options situé en bas, cochez les cases correspondantes pour afficher les trajectoires de différents corps (Soleil, planètes, satellites, etc.).

## Structure du Code 📁
Le projet est divisé en plusieurs fichiers JavaScript, chacun correspondant à une partie spécifique de la simulation :
- **index.html** 📄  
  Point d'entrée de l'application : contient la structure HTML, le canvas et les éléments de contrôle.
- **canvas.js** 🎨  
  Gère l'initialisation et le redimensionnement du canvas ainsi que les transformations pour le zoom et le déplacement.
- **controls.js** 🎮  
  Responsable des interactions utilisateur (clics, sélection, zoom par molette ou pincement).
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

---

Fait avec ❤️ pour tous les passionnés d'astronomie 🌟
