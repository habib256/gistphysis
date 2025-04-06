# Simulation de Fusée

Une simulation interactive de fusée avec une physique réaliste utilisant Matter.js et des principes de mécanique orbitale.

## 🚀 Présentation

Ce projet est une simulation web de fusée qui permet aux utilisateurs de contrôler un vaisseau spatial dans un environnement avec des corps célestes et des forces gravitationnelles. Le but est de fournir une expérience éducative et divertissante qui démontre les principes de la mécanique orbitale et de la physique newtonienne.

## ✨ Fonctionnalités

- **Moteur de physique complet** basé sur Matter.js avec gravité réaliste
- **Contrôle de fusée** avec propulseurs multidirectionnels
- **Simulation d'orbite** autour des corps célestes
- **Effets de particules** pour les propulseurs et les collisions
- **Interface utilisateur intuitive** avec affichage des paramètres clés
- **Système de trace** pour visualiser la trajectoire de la fusée
- **Caméra dynamique** avec zoom et suivi

## 🎮 Contrôles

- **↑ ou W** : Propulsion avant
- **↓ ou S** : Propulsion arrière
- **← ou A** : Rotation gauche
- **→ ou D** : Rotation droite
- **R** : Réinitialiser la fusée
- **C** : Centrer la caméra
- **+ / -** : Zoom
- **Echap** : Pause
- **P / M** : Ajuster la puissance des propulseurs
- **T** : Afficher/masquer la trace

## 🧰 Architecture

Le projet est structuré selon le modèle MVC (Modèle-Vue-Contrôleur) :

### Modèles
- `CameraModel.js` : Gestion de la caméra et du viewport
- `CelestialBodyModel.js` : Corps célestes (planètes, lunes)
- `ParticleModel.js` : Système de particules
- `RocketModel.js` : Modèle de la fusée et ses propriétés
- `UniverseModel.js` : Univers et environnement

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

- Forces gravitationnelles
- Propriétés de la fusée
- Paramètres des corps célestes
- Configuration visuelle
- Etc.

## 📈 Perspectives futures

- Ajout de missions et d'objectifs
- Plusieurs niveaux de difficulté
- Davantage de corps célestes
- Effets visuels améliorés
- Mode multijoueur

## 📜 Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails. 