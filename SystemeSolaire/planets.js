// Définition des planètes, astéroïdes et fonctions associées

// Constante de mise à l'échelle pour traduire la vélocité orbitale réelle (en rad/jour) en vitesse simulée.
// Pour la Terre, (2π/365.25) * orbitSpeedScale ≈ 0,03.
const orbitSpeedScale = 1.74;
const satelliteOrbitSpeedScale = 2.0; // Nouveau facteur pour les satellites

const planets = [
    { name: "Mercure", orbit: 500.00, radius: 9.00, period: 87.97, speed: (2 * Math.PI / 87.97) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#aaa' },
    { name: "Vénus",   orbit: 700.00, radius: 12.00, period: 224.70, speed: (2 * Math.PI / 224.70) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ffcc00' },
    { name: "Terre",   orbit: 900.00, radius: 15.00, period: 365.25, speed: (2 * Math.PI / 365.25) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#00aaff',
      satellites: [
          { name: "Lune",  orbit: 35.00,  radius: 3.00, period: 27.32, speed: (2 * Math.PI / 27.32) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#cccccc' }
      ]
    },
    { name: "Mars",    orbit: 1100.00, radius: 10.50, period: 686.98, speed: (2 * Math.PI / 686.98) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ff5500',
      satellites: [
          { name: "Phobos", orbit: 35.00, radius: 3.00, period: 0.319, speed: (2 * Math.PI / 0.319) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#bbbbbb' },
          { name: "Deimos", orbit: 45.00, radius: 3.00, period: 1.263, speed: (2 * Math.PI / 1.263) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' }
      ]
    },
    { name: "Jupiter", orbit: 1650.00, radius: 24.00, period: 4332.82, speed: (2 * Math.PI / 4332.82) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ffaa00',
      satellites: [
          { name: "Io",       orbit: 50.00,  radius: 3.00, period: 1.769, speed: (2 * Math.PI / 1.769) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ffcc99' },
          { name: "Europe",   orbit: 65.00,  radius: 3.75, period: 3.551, speed: (2 * Math.PI / 3.551) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ccccff' },
          { name: "Ganymède", orbit: 85.00,  radius: 4.50, period: 7.155, speed: (2 * Math.PI / 7.155) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ff9999' },
          { name: "Callisto", orbit: 105.00, radius: 4.20, period: 16.689, speed: (2 * Math.PI / 16.689) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ccffcc' }
      ]
    },
    { name: "Saturne", orbit: 2200.00, radius: 21.00, period: 10759, speed: (2 * Math.PI / 10759) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ffdd00',
      satellites: [
          { name: "Mimas",    orbit: 40.00,  radius: 2.00, period: 0.942, speed: (2 * Math.PI / 0.942) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' },
          { name: "Encelade", orbit: 50.00,  radius: 2.25, period: 1.370, speed: (2 * Math.PI / 1.370) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#66ffff' },
          { name: "Téthys",   orbit: 60.00,  radius: 3.00, period: 1.888, speed: (2 * Math.PI / 1.888) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#eeeeee' },
          { name: "Dioné",    orbit: 65.00,  radius: 3.00, period: 2.736, speed: (2 * Math.PI / 2.736) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' },
          { name: "Rhéa",     orbit: 75.00,  radius: 3.50, period: 4.518, speed: (2 * Math.PI / 4.518) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#cccccc' },
          { name: "Titan",    orbit: 90.00,  radius: 4.50, period: 15.945, speed: (2 * Math.PI / 15.945) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#ffaa00' },
          { name: "Japet",    orbit: 110.00, radius: 3.50, period: 79.33, speed: (2 * Math.PI / 79.33) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#bbbbbb' }
      ]
    },
    { name: "Uranus",  orbit: 2800.00, radius: 18.00, period: 30685, speed: (2 * Math.PI / 30685) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#66ccff',
      satellites: [
          { name: "Miranda", orbit: 40.00,  radius: 2.00, period: 1.413, speed: (2 * Math.PI / 1.413) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#cccccc' },
          { name: "Ariel",   orbit: 50.00,  radius: 3.00, period: 2.520, speed: (2 * Math.PI / 2.520) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' },
          { name: "Umbriel", orbit: 60.00,  radius: 3.00, period: 4.144, speed: (2 * Math.PI / 4.144) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#bbbbbb' },
          { name: "Titania", orbit: 70.00,  radius: 3.50, period: 8.706, speed: (2 * Math.PI / 8.706) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#eeeeee' },
          { name: "Obéron", orbit: 80.00,  radius: 3.50, period: 13.463, speed: (2 * Math.PI / 13.463) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#dddddd' }
      ]
    },
    { name: "Neptune", orbit: 3200.00, radius: 18.00, period: 60190, speed: (2 * Math.PI / 60190) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#3366ff',
      satellites: [
          { name: "Triton", orbit: 50.00,  radius: 3.50, period: 5.877, speed: (2 * Math.PI / 5.877) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#cccccc' }
      ]
    },
    { name: "Pluton", orbit: 3600.00, radius: 8.00, period: 90560, speed: (2 * Math.PI / 90560) * orbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#bb9977',
      satellites: [
          { name: "Charon", orbit: 30.00, radius: 2.50, period: 6.387, speed: (2 * Math.PI / 6.387) * satelliteOrbitSpeedScale, angle: Math.random() * Math.PI * 2, color: '#aaaaaa' }
      ]
    },
    { name: "Halley",
      isComet: true,
      e: 0.967,
      a: 1830.00,
      b: 1830.00 * Math.sqrt(1 - 0.967 * 0.967),
      rotation: 2.83,
      period: 27759, // 76 ans environ en jours
      // Angle forcé dans le quatrième quadrant pour placer la comète vers la droite et vers le bas
      angle: (3 * Math.PI/2) + Math.random() * (Math.PI/2),
      speed: (2 * Math.PI / 27759) * orbitSpeedScale,
      radius: 6.00,
      color: '#cccccc',
      trail: []
    }
];

let asteroidBelt = [];
let asteroidBelt2 = [];

function initPlanets() {
    const numAsteroids = 200; // Nombre d'astéroïdes
    asteroidBelt = [];
    for (let i = 0; i < numAsteroids; i++) {
        const orbit = 1375.00 + (Math.random() * 200 - 100);
        const speed = 0.015 + Math.random() * 0.010;
        const radius = 0.5 + Math.random() * 1.0;
        asteroidBelt.push({ orbit, angle: Math.random() * Math.PI * 2, speed, radius, color: '#888888' });
    }

    const numAsteroids2 = 400;
    asteroidBelt2 = [];
    for (let i = 0; i < numAsteroids2; i++) {
        const orbit = 3600.00 + Math.random() * 800;
        const speed = 0.005 + Math.random() * 0.005;
        const radius = 0.5 + Math.random() * 1.0;
        asteroidBelt2.push({ orbit, angle: Math.random() * Math.PI * 2, speed, radius, color: '#888888' });
    }
}

function updateAngles(multiplier) {
    planets.forEach(planet => {
        // Si c'est une comète, enregistrer sa position actuelle avant la mise à jour de l'angle
        if (planet.isComet) {
            let x = planet.a * Math.cos(planet.angle);
            let y = planet.b * Math.sin(planet.angle);
            let cosR = Math.cos(planet.rotation);
            let sinR = Math.sin(planet.rotation);
            let xRot = x * cosR - y * sinR;
            let yRot = x * sinR + y * cosR;
            planet.trail.push({ x: xRot, y: yRot });
            if (planet.trail.length > 150) {
                planet.trail.shift();
            }
        }
        planet.angle += planet.speed * multiplier;
        if (planet.satellites) {
            planet.satellites.forEach(sat => {
                sat.angle += sat.speed * multiplier;
            });
        }
    });
} 