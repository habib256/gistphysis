import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

# --- Paramètres de la simulation ---
# Rayons orbitaux en unités astronomiques (UA)
r_terre = 1.0       # Terre
r_mars = 1.524      # Mars (valeur moyenne)

# Périodes orbitales en années
T_terre = 1.0       # Terre effectue une orbite en 1 an
T_mars  = 1.88      # Mars effectue une orbite en environ 1.88 an

# Vitesses angulaires (en radians par an)
omega_terre = 2 * np.pi / T_terre
omega_mars  = 2 * np.pi / T_mars

# Durée totale de la simulation (en années) et paramètres d'animation
t_max = 30.0        # simulation sur 30 ans pour voir une boucle rétrograde (10 fois plus longue)
fps = 30            # images par seconde
frames = int(t_max * fps)
dt = t_max / frames

# Tableau de temps
t_values = np.linspace(0, t_max, frames)

# --- Préparation de la figure ---
fig, ax = plt.subplots(figsize=(6,6))
ax.set_xlim(-3, 3)  # Vue initiale plus éloignée
ax.set_ylim(-3, 3)
ax.set_xlabel('x (UA)')
ax.set_ylabel('y (UA)')
ax.set_title("Simulation de la rétrogradation de Mars vue de la Terre")
ax.grid(True)

# On fixe la Terre à l'origine (point de vue géocentrique)
terre_point, = ax.plot(0, 0, 'bo', markersize=8, label='Terre (fixée)')

# Points et trace pour Mars (position apparente relative à la Terre)
mars_point, = ax.plot([], [], 'ro', markersize=6, label='Mars')
trace, = ax.plot([], [], 'r-', lw=1)

# Listes pour mémoriser la trajectoire de Mars
x_trace = []
y_trace = []

# --- Fonction d'actualisation de l'animation ---
def update(frame):
    # Temps courant
    t = frame * dt
    
    # Position héliocentrique de la Terre
    x_terre = r_terre * np.cos(omega_terre * t)
    y_terre = r_terre * np.sin(omega_terre * t)
    
    # Position héliocentrique de Mars
    x_mars = r_mars * np.cos(omega_mars * t)
    y_mars = r_mars * np.sin(omega_mars * t)
    
    # Position apparente de Mars depuis la Terre
    # (différence des positions, donc on passe en référentiel géocentrique)
    x_rel = x_mars - x_terre
    y_rel = y_mars - y_terre
    
    # Sauvegarder les positions pour tracer la trajectoire
    x_trace.append(x_rel)
    y_trace.append(y_rel)
    
    # Mettre à jour la position de Mars et la trace
    mars_point.set_data([x_rel], [y_rel])
    trace.set_data(x_trace, y_trace)
    
    return mars_point, trace

# Création de l'animation (sans répétition pour éviter la liaison entre le dernier et le premier point)
ani = FuncAnimation(fig, update, frames=frames, interval=1000/fps, blit=False, repeat=False)

# Ajout de la légende et affichage
ax.legend()
plt.show()