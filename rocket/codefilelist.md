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
│       ├── Trajectoire.png
│       ├── Lune.png
│       ├── Startup.png
│       └── Vectors.png
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
├── index.html      # Page HTML principale
├── README.md       # Informations générales sur le projet
└── favicon.png     # Icône du site
```

## Description des Composants

### Contrôleurs
- `GameController.js` (1197 lignes) : Contrôle principal du jeu
- `InputController.js` (226 lignes) : Gestion des entrées utilisateur
- `RenderingController.js` (204 lignes) : Gestion du rendu graphique
- `RocketAgent.js` (587 lignes) : Intelligence artificielle de la fusée
- `MissionManager.js` (173 lignes) : Gestion des missions
- `PhysicsController.js` (237 lignes) : Gestion de la physique
- `PhysicsVectors.js` (221 lignes) : Calculs vectoriels
- `ThrusterPhysics.js` (282 lignes) : Physique des propulseurs
- `CollisionHandler.js` (289 lignes) : Gestion des collisions
- `ParticleController.js` (185 lignes) : Gestion des particules
- `SynchronizationManager.js` (286 lignes) : Synchronisation des états
- `EventBus.js` (43 lignes) : Système de communication
- `BodyFactory.js` (81 lignes) : Création des corps célestes
- `RocketCargo.js` (114 lignes) : Gestion de la cargaison

### Modèles
- `RocketModel.js` (292 lignes) : Modèle de la fusée
- `CelestialBodyModel.js` (95 lignes) : Modèle des corps célestes
- `UniverseModel.js` (104 lignes) : Modèle de l'univers
- `ParticleSystemModel.js` (138 lignes) : Système de particules
- `CameraModel.js` (88 lignes) : Gestion de la caméra
- `ParticleModel.js` (63 lignes) : Modèle des particules

### Vues
- `RocketView.js` (549 lignes) : Affichage de la fusée
- `UniverseView.js` (171 lignes) : Affichage de l'univers
- `CelestialBodyView.js` (122 lignes) : Affichage des corps célestes
- `UIView.js` (583 lignes) : Interface utilisateur
- `TraceView.js` (111 lignes) : Affichage des traces
- `ParticleView.js` (96 lignes) : Affichage des particules

## Ressources
- Images : Fusée, spoutnik, crash (`assets/image/`)
- Sons : Effets sonores et ambiances spatiales (`assets/sound/`)
- Captures d'écran : Documentation visuelle (`assets/screenshots/`)

## Points d'Entrée Importants
- `main.js` (96 lignes) : Initialisation de l'application
- `GameController.js` (1197 lignes) : Logique principale du jeu
- `EventBus.js` (43 lignes) : Communication entre composants
- `constants.js` (230 lignes) : Constantes et configurations
- `index.html` (245 lignes) : Structure HTML principale

## Notes Importantes

Il serait judicieux de vérifier la présence éventuelle de fichiers dupliqués ou redondants afin de nettoyer la base de code.

Ne jamais utiliser la logique des imports : Tous les fichiers Javascript sont référencés dans le fichier index.html

L'erreur entre matter.js et matter-attractor n'est pas une erreur. Les deux numéros de version soi-disant incompatibles fonctionnent très très très bien ensemble. N'essaye jamais de réparer cette fausse erreur

l'EventBus est très important. C'est lui qui permet l'organisation du code avec le model MVC