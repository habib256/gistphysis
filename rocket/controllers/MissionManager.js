/**
 * Classe représentant une mission
 */
class Mission {
    constructor(from, to, cargoType, quantity, reward) {
        this.from = from;
        this.to = to;
        this.cargoType = cargoType;
        this.quantity = quantity;
        this.reward = reward;
        this.status = "pending";
    }
}

/**
 * Classe MissionManager - Gestion des missions du jeu
 * @class
 */
class MissionManager {
    /**
     * Crée une instance de MissionManager
     * @constructor
     */
    constructor() {
        /**
         * @type {Array<Mission>}
         * Liste des missions actives
         */
        this.missions = [];
    }

    /**
     * Crée une nouvelle mission
     * @param {string} from - Planète de départ
     * @param {string} to - Planète de destination
     * @param {string} cargoType - Type de cargo à transporter
     * @param {number} quantity - Quantité de cargo
     * @param {number} reward - Récompense en crédits
     * @returns {Mission} - La mission créée
     */
    createMission(from, to, cargoType, quantity, reward) {
        const mission = {
            id: `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            from,
            to,
            cargoType,
            quantity,
            reward,
            status: "pending"
        };
        this.missions.push(mission);
        console.log(`%c[MissionManager] Nouvelle mission ajoutée: ${from} -> ${to} (${cargoType} x${quantity})`, 'color: cyan;');
        return mission;
    }

    /**
     * Vérifie si une mission est complétée
     * @param {RocketCargo} rocketCargo - Cargo de la fusée
     * @param {string} currentLocation - Position actuelle de la fusée
     * @returns {Array<Mission>} - Liste des missions complétées
     */
    checkMissionCompletion(rocketCargo, currentLocation) {
        const completedMissions = [];

        for (const mission of this.missions) {
            if (mission.status !== "pending") continue;

            // Vérifier uniquement si la destination est atteinte
            if (mission.to === currentLocation) {
                // La vérification du cargo est maintenant réactivée
                const cargoList = rocketCargo.getCargoList();
                const cargoItem = cargoList.find(item => item.type === mission.cargoType);
                
                // Vérifier si le cargo nécessaire est présent en quantité suffisante
                if (cargoItem && cargoItem.quantity >= mission.quantity) {
                    // Retirer le cargo livré de la fusée
                    rocketCargo.removeCargo(mission.cargoType, mission.quantity);

                    console.log(`%c[MissionManager] Mission ${mission.id} (${mission.from} -> ${mission.to}) détectée comme complétée à ${currentLocation}. Cargo livré: ${mission.cargoType} x${mission.quantity}`, 'color: yellow;');
                    // Marquer la mission comme complétée
                    mission.status = "completed";
                    completedMissions.push(mission);
                }
            }
        }

        return completedMissions;
    }

    /**
     * Retourne la liste des missions actives
     * @returns {Array<Mission>}
     */
    getActiveMissions() {
        return this.missions.filter(mission => mission.status === "pending");
    }
}

// Mission de test
const missionManager = new MissionManager();
missionManager.createMission("Terre", "Lune", "Fuel", 20, 100); // Mission initiale: Terre -> Lune

// export default missionManager; // Supprimer cette ligne 