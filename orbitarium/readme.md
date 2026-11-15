# Orbitarium : Simulation Solaire Interactive 🚀🌌✨

## Description 🌟
"Orbitarium" est une application web qui vous permet de visualiser et d'explorer le système solaire. Cette simulation dynamique vous offre la possibilité d'observer le ballet cosmique du Soleil 🌞, des planètes 🌍, des satellites 🛸 et même de la comète de Halley ☄️ grâce à des animations basées sur des calculs orbitaux réalistes.

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
- **Fiche d'un astre** 🪪  
  Toucher ou cliquer un astre (ou le choisir dans le menu) affiche sa fiche : type (étoile, planète tellurique ou gazeuse, planète naine, satellite, comète), distance moyenne au Soleil, durée de révolution, vitesse sur l'orbite, diamètre et une remarque liée au cours. Zoomé sur une planète, on peut aussi toucher un satellite (la Lune, Io…). Le bouton ✕ ferme la fiche.
- **Horloge et mesure d'une révolution** ⏱️  
  Le panneau du haut affiche le temps écoulé dans la simulation (jours et années terrestres) et la vitesse (« 1 s ≈ 6,5 jours »). ⏸️ met en pause, ↺ remet le chrono à zéro et trace un petit trait à la place de chaque astre : quand un astre repasse sur son trait, il a fait un tour, on lit sa période sur le chrono (Terre 365 jours, Mars 687 jours, Lune 27,3 jours…).
- **Pas à l'échelle** ⚠️  
  Le bouton en bas à droite explique que tailles et distances ne sont pas à l'échelle (exemple du ballon de 10 cm) ; seules les durées sont respectées.
- **À observer** 🔭  
  Dans Options, un guide replié reprend les consignes des cours de 6e (les 8 planètes dans l'ordre, la plus rapide, la plus lente), de 5e (la Lune autour de la Terre, la révolution de la Terre) et de 3e (plus près du Soleil, plus vite ; la comète de Halley).
- **Classification** 🗂️  
  Le menu « Centrer sur » range les astres en planètes telluriques, planètes gazeuses, planètes naines (Cérès, Pluton) et comète. L'orbite de Cérès, dans la ceinture d'astéroïdes, n'est pas tracée (lisibilité).
- **Rendus Spécifiques** 🎆  
  Pluton ❄️, Saturne 🪐 et Jupiter bénéficient de traitements visuels particuliers (orbite orientée, anneaux, dégradés). Les noms des astres ne se chevauchent pas : un nom qui n'a pas de place libre n'est pas écrit en vue d'ensemble (il apparaît en zoomant).
- **Ceintures d'Astéroïdes** 💫  
  Ceinture principale (entre Mars et Jupiter) et ceinture de Kuiper (au-delà de Neptune), chacune tournant à la vitesse que donne sa distance au Soleil.

## Exactitude scientifique 🔬
- **Durées respectées** : chaque astre avance de (2π / période) × 1,74 × multiplicateur par image ; une image correspond donc à 1,74 × multiplicateur jours pour tous les astres, et l'horloge compte ce même temps. Périodes mesurées dans la simulation (test Chrome headless) : Mercure 87,97 j, Terre 365,25 j, Mars 686,98 j, Lune 27,32 j, Phobos 0,319 j.
- **Tailles et distances non à l'échelle** : rayons d'orbite resserrés (Neptune 6,4 fois plus loin que Mercure à l'écran, 78 fois en réalité), astres très agrandis.
- **Corrections (novembre 2026)** :
  - les satellites avançaient deux fois par image, avec un facteur 2,0 au lieu de 1,74 : la Lune faisait le tour de la Terre en 11,9 jours au lieu de 27,3 (30,7 tours par an au lieu de 13,4) ;
  - la comète de Halley se déplaçait régulièrement sur son ellipse, donc lentement près du Soleil, et son périhélie tombait dans le disque dessiné du Soleil. Elle suit maintenant la loi de Kepler (équation de Kepler, anomalie moyenne régulière) : très rapide près du Soleil, lente au loin ; ses distances réelles (0,575 à 35,3 UA) sont converties avec l'échelle resserrée des planètes, son périhélie passe entre les orbites de Mercure et de Vénus et son aphélie entre Neptune et Pluton. L'orbite affichée est donc une ellipse déformée par l'échelle, ce que dit sa fiche ;
  - les astéroïdes de la ceinture principale tournaient plus vite que Mars, ceux de la ceinture de Kuiper plus vite que Jupiter : leur vitesse suit maintenant la troisième loi de Kepler (période en années = distance en UA puissance 1,5) ;
  - Triton tourne dans le sens rétrograde ; « Ceres » s'écrit « Cérès » ; Io est dessiné plus gros qu'Europe, comme en réalité ;
  - Pluton n'est plus rangé parmi les planètes dans le menu ; les émojis d'étoiles (🌟, ⭐, 💫) des planètes ont été remplacés (une planète n'est pas une étoile).
- **Relecture** : textes des fiches, du guide et de l'avertissement d'échelle relus par un relecteur indépendant (valeurs recalculées et comparées aux sources) ; ses corrections ont été appliquées.
- **Sources des données des fiches** : NASA, [Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) (mise à jour du 18/03/2025) et Sun Fact Sheet ; JPL [Small-Body Database](https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html) (1 Cérès, 1P/Halley) ; JPL [Planetary Satellite Mean Elements](https://ssd.jpl.nasa.gov/sats/elem/). Valeurs arrondies pour le collège. Pour Saturne, Uranus et Neptune, les périodes de la NASA (10 747, 30 589, 59 800 jours) et les périodes sidérales usuelles utilisées par la simulation (10 759, 30 685, 60 190 jours) diffèrent de moins de 1 % ; les fiches donnent des valeurs vraies pour les deux (« environ 29 ans et demi », « 84 ans », « près de 165 ans »).

## Comment Utiliser ? 🎯
1. **Lancement** 🚀  
   Ouvrez le fichier `index.html` dans votre navigateur préféré (Chrome, Firefox, Safari, etc.).
2. **Navigation et Interaction** 🎮  
   - **Centrage** 🎯 : Utilisez le menu déroulant en haut pour centrer la vue sur une planète ou cliquez directement sur l'objet souhaité.  
   - **Zoom et Déplacement** 🔍 :  
     - Sur ordinateur 🖥️ : la molette (ou le pincement du pavé tactile) zoome autour de l'astre au centre ; glisser avec le bouton gauche déplace la vue ; un clic sur un astre le centre.  
     - Sur tablette ou téléphone 📱 : pincez à deux doigts pour zoomer autour du point situé entre vos doigts, glissez un doigt pour déplacer la vue, touchez un astre pour le suivre au centre (la zone de toucher est élargie à environ 24 px autour de l'astre, car les astres sont minuscules en vue d'ensemble), touchez deux fois le fond pour revenir à la vue d'ensemble.  
     - Le rappel de ces gestes est dans **Options → Commandes**.
   - **Mesurer une révolution** ⏱️ : ⏸️ pause, ↺ chrono à zéro (un trait marque la place de chaque astre), ⏩ accélérer, ⏸️ relancer ; quand l'astre repasse sur son trait, mettre en pause et lire le temps écoulé.
3. **Personnalisation de l'Affichage** 🎨  
   - Activez/désactivez l'affichage des orbites et des noms grâce aux boutons "Orbites" et "Noms".  
   - Dans le panneau des options situé en bas, cochez les cases correspondantes pour afficher les trajectoires de différents corps (Soleil, planètes, satellites, etc.).

## Utilisation sur tablette et dans une page web 📱
- Boutons, menu et cases à cocher ont des cibles d'au moins 44 px (en pixels de l'application ; réduite à 0,78 dans un cours, un bouton de 48 px mesure 37 px à l'écran) ; toute la ligne d'une case « Traces » se touche.
- La fiche d'un astre se place en haut à droite (en bas sur un écran de moins de 620 px de large) ; le panneau Options se ferme quand une fiche s'ouvre par-dessus en portrait, et inversement. « Options » et « Pas à l'échelle » ne restent pas ouverts ensemble.
- Le panneau Options défile au doigt si la fenêtre est basse ; l'aide des gestes y est repliée pour ne pas masquer le système.
- Le canvas est dessiné à la densité de l'écran (plafonnée à 2 pour ménager les tablettes modestes) : rendu net sur écran Retina.
- Rotation et redimensionnement conservent la portion du système observée.
- Pas de zoom de la page, de sélection de texte ni de menu contextuel sur appui long : le pincement agit sur le système solaire.
- L'application fonctionne dans un `iframe`, y compris réduit par `transform: scale(...)` : les coordonnées des doigts et de la souris sont calculées avec `getBoundingClientRect`. Le bouton « Plein écran » n'apparaît que si le plein écran est possible (iframe avec `allow="fullscreen"`, pas sur iPhone).
- Hors ligne : le service worker (`sw.js`, cache `orbitarium-v6`) garde une copie de l'application ; aucune ressource externe, aucune donnée collectée.
- **Pastilles de couleur dessinées (15 novembre 2026)**. Pourquoi : sur la tablette de l'enseignant (Samsung Galaxy Tab A, Android 8.1, émojis connus jusqu'à Unicode 10 seulement), les pastilles en émoji 🟡 🟠 🟤 et la planète 🪐 (Unicode 12) s'affichaient en carré gris, et les autres (⚪ 🔴 🔵, 🌙, ☄️…) n'avaient pas la couleur du tracé (Uranus et Neptune avaient la même). Ce qui a changé : chaque case « Traces » porte une pastille dessinée en CSS (disque de 16 px, contour clair fin), colorée en JavaScript par `getBodyColor` (`traces.js`), la fonction qui colore les traces ; la zone tactile de la case est inchangée (toute la ligne, 44 px). Un `<option>` n'accepte que du texte : les options du menu « Centrer sur » n'ont plus d'émoji, et une pastille posée dans le sélecteur, à gauche, montre la couleur de l'astre choisi (aucune en vue libre) ; elle ne capte pas le toucher. Les pastilles sont décoratives (`aria-hidden`), le nom de l'astre suit. Le cache du service worker passe à `orbitarium-v5`, et le service worker contourne désormais le cache HTTP du navigateur (`cache: 'reload'` à l'installation, `cache: 'no-cache'` ensuite) : sans cela, une tablette déjà venue recevait le nouvel index.html avec les anciens scripts (gardés une heure par le serveur) et les gardait hors réseau. Une pastille dont la couleur n'a pas été posée reste invisible (jamais de cercle vide). La marge du sélecteur n'est plus animée. Essai de mise à jour (ancienne version installée, nouvelle servie à la même adresse avec des .js en `max-age=3600`) : nouveaux scripts et pastilles colorées en ligne puis hors réseau ; défaut reproduit avec l'ancien service worker. Testé dans Chrome headless (tactile émulé, 1024×768 et 360×640) : couleur calculée de chaque pastille égale à celle de la trace, vérifiée aussi au pixel sur le canvas, pour les 12 cases et les 12 astres du menu ; mise en page du menu et des cases identique au pixel près ; aucun caractère au-delà d'Unicode 10 dans le texte affiché ; aucune erreur dans la console. Pas encore essayé sur une vraie tablette. À noter : Saturne est dessinée en #d4a26c mais sa trace (et donc sa pastille) est #ffdd00 ; Jupiter est dessinée en dégradé, sa trace est #ffaa00 ; Vénus (#ffcc00) et Saturne (#ffdd00) ont des couleurs très proches.
- **Couleurs de Halley et de Saturne (15 novembre 2026)**. Pourquoi : une relecture des pastilles a relevé que la comète de Halley avait exactement la couleur de la Lune (#cccccc), proche de Mercure (#aaa), et que la trace de Saturne (#ffdd00, jaune vif) se confondait avec Vénus (#ffcc00) et le Soleil alors que la planète est dessinée en beige (#d4a26c). Ce qui a changé (décision de l'enseignant) : Halley est cyan pâle (#99ffee) : noyau dessiné, trace, repère du chrono et pastilles ; la queue reste blanche et dégradée. Saturne prend #d4a26c, la couleur de son dessin, comme couleur unique (`planets.js`) : le dessin de la planète et de ses anneaux lit désormais `planet.color` au lieu d'une couleur écrite en dur, si bien que trace, planète, repère et pastilles ne peuvent plus diverger. Ce beige était trop proche de Pluton (#bb9977, écart ΔE2000 6,7) et de Cérès (#ccaa66, 6,9) : Pluton passe à #b0947c et Cérès à #c8ac5c, deux retouches à peine visibles (ΔE2000 3,8 et 3,3 par rapport à avant), qui rendent les trois astres distincts. Écarts ΔE2000 entre les 13 pastilles (12 cases et Cérès, qui n'est que dans le menu) : avant, Lune/Halley 0, Vénus/Saturne 5,5, Mercure/Halley 9,0, Soleil/Saturne 9,7, Cérès/Pluton 9,8 ; après, la paire la plus proche est Mercure/Lune (9,0, inchangée), puis Cérès/Saturne 10,1, Saturne/Pluton 10,3, Terre/Uranus 10,8 ; Halley est à 23,9 au moins de toute autre pastille. Cache du service worker : `orbitarium-v6` (même liste de fichiers). Testé dans Chrome headless (tactile émulé, 1024×768 et 360×640) : les 12 pastilles des cases égales à `getBodyColor` ; au pixel, la trace de Halley et celle de Saturne sur le canvas ont exactement la couleur de leur case et de la pastille du menu (orbites masquées pour la mesure, car le trait blanc semi-transparent de l'orbite recouvre la trace d'une planète et l'éclaircit à l'écran, comme pour toutes les planètes) ; Saturne dessinée comme avant ; cache v6 avec ses 12 fichiers ; aucune erreur dans la console, aucune requête externe. Pas essayé sur une vraie tablette.

## Structure du Code 📁
Le projet est divisé en plusieurs fichiers JavaScript, chacun correspondant à une partie spécifique de la simulation :
- **index.html** 📄  
  Point d'entrée de l'application : contient la structure HTML, le canvas et les éléments de contrôle.
- **canvas.js** 🎨  
  Gère l'initialisation et le redimensionnement du canvas (densité de l'écran, rotation), les bornes du zoom et le déplacement de la vue.
- **controls.js** 🎮  
  Responsable des interactions utilisateur (Pointer Events : clic ou toucher d'un astre ou d'un satellite, glisser pour déplacer, pincement et molette pour zoomer, double toucher, boutons, menu, pause, chrono, fiche).
- **drawing.js** ✏️  
  Contient les fonctions de dessin pour les orbites, les trajectoires, ainsi que les traitements de rendu spécifiques.
- **animation.js** 🎬  
  Implémente la boucle d'animation (pause, horloge de la simulation, repères de départ, placement des noms sans chevauchement).
- **planets.js** 🌍  
  Définit les caractéristiques de chaque planète, satellite et astéroïde, la comète de Halley (loi de Kepler), l'échelle des distances (`distanceAffichee`) et les fiches des astres (`INFOS_ASTRES`, avec leurs sources).
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
- Optimiser les performances et l'interface utilisateur pour une expérience mobile toujours plus intuitive 📱
- Améliorer la modularité du code et ajouter la possibilité d'extensions via une interface de configuration ⚙️

Si vous souhaitez contribuer, n'hésitez pas à forker le projet et à soumettre vos améliorations via une pull request ! 🤝

## Fichier manifest.json
Le fichier manifest.json définit les paramètres de l'application en tant que Progressive Web App (PWA). Il spécifie le nom, le mode d'affichage (standalone), les couleurs de thème et de fond, ainsi que les icônes utilisées pour l'installation sur les appareils mobiles.

---

Fait avec ❤️ pour tous les passionnés d'astronomie 🌟
