const { Engine, Render, World, Bodies, Body, Vector } = Matter;

class RocketSimulation {
    constructor() {
        // Création du moteur physique
        this.engine = Engine.create();
        this.engine.world.gravity.y = 0.5; // Gravité modérée

        // Chargement de l'image de fond
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'image/Moon.png';

        // Création du rendu
        this.render = Render.create({
            element: document.body,
            engine: this.engine,
            options: {
                width: 800,
                height: 600,
                wireframes: false,
                background: 'transparent',
                backgroundImage: this.backgroundImage
            }
        });

        // Chargement de l'image de la fusée
        this.rocketImage = new Image();
        this.rocketImage.src = 'image/rocket.png';
        this.rocketImage.onerror = () => {
            console.error('Erreur de chargement de l\'image de la fusée');
        };
        this.rocketImage.onload = () => {
            console.log('Image de la fusée chargée avec succès');
            this.initializeRocket();
        };

        // Création des limites du monde
        this.createWorldBounds();

        // Démarrage du rendu
        Render.run(this.render);
        Engine.run(this.engine);
    }

    initializeRocket() {
        // Création de la fusée
        this.rocket = new Rocket(400, 300);
        this.rocketBody = Bodies.rectangle(400, 300, 30, 60, {
            frictionAir: 0.02,
            friction: 0.01,
            density: 0.001,
            render: {
                sprite: {
                    texture: this.rocketImage.src,
                    xScale: 0.1,
                    yScale: 0.1,
                    yOffset: 0.2  // Ajusté pour aligner la base de la fusée avec le sol
                }
            }
        });
        World.add(this.engine.world, this.rocketBody);

        // Gestion des contrôles
        this.setupControls();
    }

    createWorldBounds() {
        const walls = [
            Bodies.rectangle(400, 590, 810, 60, { 
                isStatic: true,
                render: { fillStyle: 'transparent' }
            }),
            Bodies.rectangle(0, 300, 60, 600, { 
                isStatic: true,
                render: { fillStyle: 'transparent' }
            }),
            Bodies.rectangle(800, 300, 60, 600, { 
                isStatic: true,
                render: { fillStyle: 'transparent' }
            }),
            Bodies.rectangle(400, 0, 810, 60, { 
                isStatic: true,
                render: { fillStyle: 'transparent' }
            })
        ];

        World.add(this.engine.world, walls);
    }

    applyMainThrust() {
        const angle = this.rocketBody.angle;
        const force = 0.004;
        Body.applyForce(this.rocketBody, this.rocketBody.position, {
            x: Math.sin(angle) * force,
            y: -Math.cos(angle) * force
        });
    }

    setupControls() {
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'ArrowUp':
                    this.rocket.toggleEngine('main', true);
                    this.rocket.setEnginePower('main', 100);
                    this.applyMainThrust();
                    break;
                case 'ArrowLeft':
                    this.rocket.toggleEngine('right', true);
                    this.rocket.setEnginePower('right', 50);
                    Body.setAngularVelocity(this.rocketBody, -0.05);
                    break;
                case 'ArrowRight':
                    this.rocket.toggleEngine('left', true);
                    this.rocket.setEnginePower('left', 50);
                    Body.setAngularVelocity(this.rocketBody, 0.05);
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch(event.key) {
                case 'ArrowUp':
                    this.rocket.toggleEngine('main', false);
                    break;
                case 'ArrowLeft':
                    this.rocket.toggleEngine('right', false);
                    Body.setAngularVelocity(this.rocketBody, 0);
                    break;
                case 'ArrowRight':
                    this.rocket.toggleEngine('left', false);
                    Body.setAngularVelocity(this.rocketBody, 0);
                    break;
            }
        });
    }

    update() {
        if (this.rocket && this.rocketBody) {
            // Mise à jour de la position de la fusée
            this.rocket.x = this.rocketBody.position.x;
            this.rocket.y = this.rocketBody.position.y;
            
            // Application continue de la poussée si le moteur principal est actif
            if (this.rocket.engines.main.isOn) {
                this.applyMainThrust();
            }
        }
    }
}

// Création de la simulation
const simulation = new RocketSimulation();

// Boucle de mise à jour
function gameLoop() {
    simulation.update();
    requestAnimationFrame(gameLoop);
}

gameLoop(); 