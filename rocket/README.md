# Simulation de Fusée

Une simulation interactive de fusée avec une physique réaliste utilisant Matter.js et des principes de mécanique orbitale.

## 🚀 Présentation

Ce projet est une simulation web de fusée qui permet aux utilisateurs de contrôler un vaisseau spatial dans un environnement avec des corps célestes et des forces gravitationnelles. Le but est de fournir une expérience éducative et divertissante qui démontre les principes de la mécanique orbitale et de la physique newtonienne.

- [Lancer Rocket](https://habib256.github.io/gistphysis/rocket/index.html)  
  _(Cliquez pour lancer l'application Rocket)_

### Captures d'écran

![Écran de démarrage](assets/screenshots/Startup.png)
*Écran de démarrage de la simulation*

![Visualisation des vecteurs](assets/screenshots/Vectors.png)
*Visualisation des vecteurs de force et de la physique*

![Simulation lunaire](assets/screenshots/Lune.png)
*Simulation de l'orbite lunaire*

![Trajectoire de la fusée](assets/screenshots/Trajectoire.png)
*Visualisation de la trajectoire de la fusée*

## ✨ Fonctionnalités

- **Moteur de physique complet** basé sur Matter.js avec gravité réaliste
- **Contrôle de fusée** avec propulseurs multidirectionnels
- **Simulation d'orbite** autour des corps célestes
- **Effets de particules** pour les propulseurs et les collisions
- **Interface utilisateur intuitive** avec affichage des paramètres clés
- **Système de trace** pour visualiser la trajectoire de la fusée
- **Caméra dynamique** avec zoom et suivi
- **Système de dommages et santé** pour la fusée lors des collisions
- **Gestion de carburant** avec consommation différente selon les propulseurs

- **Système lunaire** avec orbite autour de la planète principale
- **Effets visuels améliorés** comme le scintillement des étoiles et les dégradés de couleurs pour les propulseurs
- **Contrôles assistés** pour faciliter la navigation et la stabilisation de la fusée
- **Effets sonores** pour les collisions et événements importants
- **Visualisation des vecteurs de force** pour comprendre les forces en jeu

## 🎮 Contrôles

- **↑ ou W** : Propulsion avant
- **↓ ou S** : Propulsion arrière
- **← ou A** : Rotation gauche
- **→ ou D** : Rotation droite
- **R** : Réinitialiser la fusée
- **C** : Centrer la caméra
- **+ / -** : Zoom molette de souris
- **T** : Afficher/masquer la trace
- **V** : Afficher/masquer les vecteurs de force

## 🧰 Architecture

Le projet est structuré selon le modèle MVC (Modèle-Vue-Contrôleur) :

### Modèles
- `CameraModel.js` : Gestion de la caméra et du viewport
- `CelestialBodyModel.js` : Corps célestes (planètes, lunes)
- `ParticleModel.js` : Système de particules
- `RocketModel.js` : Modèle de la fusée et ses propriétés
- `UniverseModel.js` : Univers et environnement
- `ParticleSystemModel.js` : Gestion des émetteurs de particules pour les propulseurs

### Vues
- `CelestialBodyView.js` : Rendu des corps célestes
- `ParticleView.js` : Rendu des particules
- `RocketView.js` : Rendu de la fusée
- `TraceView.js` : Rendu de la trajectoire
- `UIView.js` : Interface utilisateur
- `UniverseView.js` : Rendu de l'environnement spatial

### Contrôleurs
- `EventBus.js` : Communication entre les composants
- `GameController.js` : Orchestration générale
- `InputController.js` : Gestion des entrées utilisateur
- `ParticleController.js` : Gestion des systèmes de particules
- `PhysicsController.js` : Calculs physiques
- `RenderingController.js` : Gestion du rendu

## 🔧 Technologies

- **Matter.js** : Moteur de physique 2D
- **Matter-Attractors** : Plugin pour la simulation gravitationnelle
- **HTML5 Canvas** : Rendu graphique
- **JavaScript** : Logique et programmation

## 🚀 Installation

1. Clonez ce dépôt :
   ```bash
   git clone https://github.com/votre-utilisateur/simulation-fusee.git
   ```

2. Ouvrez le projet dans votre navigateur :
   ```bash
   cd simulation-fusee
   # Ouvrez index.html dans votre navigateur ou utilisez un serveur local
   ```

## 📝 Personnalisation

Le fichier `constants.js` contient de nombreux paramètres que vous pouvez ajuster pour modifier le comportement de la simulation :

- Forces gravitationnelles (`PHYSICS.G`)
- Propriétés de la fusée (`ROCKET.MASS`, `ROCKET.THRUSTER_POWER`, etc.)
- Paramètres des corps célestes (`CELESTIAL_BODY.MASS`, `CELESTIAL_BODY.MOON`)
- Configuration visuelle (`RENDER.SPACE_COLOR`, `PARTICLES.EMITTER`)
- Limites physiques (`PHYSICS.MAX_SPEED`, `PHYSICS.MAX_COORDINATE`)
- Échelle temporelle (`PHYSICS.TIME_SCALE_MIN`, `PHYSICS.TIME_SCALE_MAX`)
- Comportement des collisions (`PHYSICS.COLLISION_DAMPING`, `PHYSICS.IMPACT_DAMAGE_FACTOR`)
- Contrôles assistés (`PHYSICS.ASSISTED_CONTROLS`)
- Multiplicateur de poussée (`PHYSICS.THRUST_MULTIPLIER`)

## 📈 Perspectives futures

- Ajout de missions et d'objectifs
- Plusieurs niveaux de difficulté
- Davantage de corps célestes
- Effets visuels améliorés
- Mode multijoueur
- Ajustement dynamique de la difficulté basé sur les performances
- Système de récompenses et de progression
- Intégration de systèmes planétaires complets

## 📜 Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.

## Améliorations du positionnement de la fusée sur la lune

Nous avons apporté plusieurs améliorations pour éviter les sauts de positionnement lorsque la fusée est posée sur la lune et qu'elle passe de l'autre côté:

### 1. Amélioration du calcul de la position relative

Dans `RocketModel.js`, nous avons optimisé la méthode `updateRelativePosition()` pour :
- Stocker à la fois les coordonnées cartésiennes et polaires
- Mémoriser l'angle de rotation de référence de la lune
- Ajouter des vecteurs directionnels normalisés pour plus de précision

### 2. Stabilisation du positionnement absolu

La méthode `updateAbsolutePosition()` a été améliorée pour :
- Utiliser les coordonnées cartésiennes pour les débris (plus stables)
- Utiliser les coordonnées polaires pour les fusées posées (suivre la rotation)
- Calculer correctement la différence d'angle de rotation

### 3. Optimisation dans le PhysicsController

- Suppression du recalcul redondant de l'angle
- Utilisation de l'angle déjà calculé dans updateAbsolutePosition
- Ajout d'une vérification pour calculer la position relative si elle n'existe pas encore
- Mise à jour de la position du corps physique pour les débris

### 4. Amélioration de la détection d'atterrissage

La méthode `isRocketLanded()` a été optimisée pour :
- Considérer qu'une fusée est toujours posée si son état n'a pas changé
- Ajuster les seuils spécifiquement pour la lune
- Simplifier la logique de calcul d'angle et éviter les sauts à 2π

### 5. Synchronisation des traces

`TraceView.js` inclut déjà des améliorations pour :
- Réinitialiser les traces lors des changements d'état
- Maintenir les tableaux de traces synchronisés
- Calculer correctement les positions relatives à la lune

Ces modifications permettent maintenant à la fusée de rester correctement positionnée lorsqu'elle est posée sur la lune, même quand celle-ci tourne et passe de l'autre côté. 