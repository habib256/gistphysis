# Guide de Structure du Code

## Structure des Dossiers

```
├── assets/           # Ressources statiques
│   ├── image/       # Images
│   │   ├── sputnik.png
│   │   ├── rocket_crashed.png
│   │   └── rocket.png
│   ├── sound/       # Sons
│   │   ├── ambiant/ # Sons d'ambiance
│   │   │   ├── Wave Ganymede flyby_Juno.wav
│   │   │   ├── Enceladus Hiss audio 256 kbps.mp3
│   │   │   ├── whistlerWaves.mp3
│   │   │   ├── plasmawaves-chorus.mp3
│   │   │   ├── plasmatic_hiss.wav
│   │   │   ├── voyager1-TsunamiWaves.mp3
│   │   │   ├── cassini_saturn_radio_waves1.mp3
│   │   │   ├── kepler_star_KIC7671081B.mp3
│   │   │   ├── kepler_star_KIC12268220C.mp3
│   │   │   ├── cassini_saturn_radio_waves2.mp3
│   │   │   ├── sun_sonification.wav
│   │   │   ├── Voyager: Interstellar Plasma Sounds.mp3
│   │   │   └── Chorus Radio Waves within Earth's Atmosphere.mp3
│   │   ├── smallStep.mp3
│   │   ├── houston_problem.mp3
│   │   ├── sputnik-beep.mp3
│   │   ├── rocketthrustmaxx.mp3
│   │   ├── 4321.mp3
│   │   ├── crash.mp3
│   │   └── collision.mp3
│   └── screenshots/ # Captures d'écran
├── controllers/     # Contrôleurs de l'application
│   ├── MissionManager.js
│   ├── RocketCargo.js
│   ├── RenderingController.js
│   ├── SynchronizationManager.js
│   ├── ThrusterPhysics.js
│   ├── CollisionHandler.js
│   ├── GameController.js
│   ├── PhysicsController.js
│   ├── PhysicsVectors.js
│   ├── BodyFactory.js
│   ├── InputController.js
│   ├── RocketAgent.js
│   ├── EventBus.js
│   └── ParticleController.js
├── models/         # Modèles de données
│   ├── CelestialBodyModel.js
│   ├── ParticleSystemModel.js
│   ├── RocketModel.js
│   ├── SputnikModel.js
│   ├── UniverseModel.js
│   ├── CameraModel.js
│   └── ParticleModel.js
├── views/          # Composants d'interface utilisateur
│   ├── RocketView.js
│   ├── TraceView.js
│   ├── UIView.js
│   ├── CelestialBodyView.js
│   ├── UniverseView.js
│   └── ParticleView.js
├── constants.js    # Constantes et configurations
├── main.js         # Point d'entrée de l'application
└── index.html      # Page HTML principale
```

## Description des Composants

### Contrôleurs
- `GameController.js` : Contrôle principal du jeu
- `InputController.js` : Gestion des entrées utilisateur
- `RenderingController.js` : Gestion du rendu graphique
- `RocketAgent.js` : Intelligence artificielle de la fusée
- `MissionManager.js` : Gestion des missions
- `PhysicsController.js` : Gestion de la physique
- `PhysicsVectors.js` : Calculs vectoriels
- `ThrusterPhysics.js` : Physique des propulseurs
- `CollisionHandler.js` : Gestion des collisions
- `ParticleController.js` : Gestion des particules
- `SynchronizationManager.js` : Synchronisation des états
- `EventBus.js` : Système de communication
- `BodyFactory.js` : Création des corps célestes
- `RocketCargo.js` : Gestion de la cargaison

### Modèles
- `RocketModel.js` : Modèle de la fusée
- `CelestialBodyModel.js` : Modèle des corps célestes
- `UniverseModel.js` : Modèle de l'univers
- `ParticleSystemModel.js` : Système de particules
- `CameraModel.js` : Gestion de la caméra
- `ParticleModel.js` : Modèle des particules
- `SputnikModel.js` : Modèle du spoutnik

### Vues
- `RocketView.js` : Affichage de la fusée
- `UniverseView.js` : Affichage de l'univers
- `CelestialBodyView.js` : Affichage des corps célestes
- `UIView.js` : Interface utilisateur
- `TraceView.js` : Affichage des traces
- `ParticleView.js` : Affichage des particules

## Ressources
- Images : Fusée, spoutnik, crash
- Sons : Effets sonores et ambiances spatiales
- Captures d'écran : Documentation visuelle

## Points d'Entrée Importants
- `main.js` : Initialisation de l'application
- `GameController.js` : Logique principale du jeu
- `EventBus.js` : Communication entre composants 

Ne jamais utiliser la logique des imports : Tous les fichiers Javascript sont référencés dans le fichier index.html 

L'erreur entre matter.js et matter-attractor n'est pas une erreur. Les deux numéros de version soi-disant incompatibles fonctionnent très très très bien ensemble. N'essaye jamais de réparer cette fausse erreur 