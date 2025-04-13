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
        this.deliveredQuantity = 0;
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
            status: "pending",
            deliveredQuantity: 0
        };
        this.missions.push(mission);
        console.log(`%c[MissionManager] Nouvelle mission ajoutée: ${from} -> ${to} (${cargoType} x${quantity}), déjà livré: ${mission.deliveredQuantity}`, 'color: cyan;');
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
        const missionsToUpdate = [];

        for (const mission of this.missions) {
            if (mission.status !== "pending") continue;

            // Vérifier si la destination est atteinte
            if (mission.to === currentLocation) {
                const cargoList = rocketCargo.getCargoList();
                const cargoItem = cargoList.find(item => item.type === mission.cargoType);

                if (cargoItem && cargoItem.quantity > 0) {
                    const quantityToDeliver = Math.min(cargoItem.quantity, mission.quantity - mission.deliveredQuantity);

                    if (quantityToDeliver > 0) {
                        // Retirer le cargo livré de la fusée
                        rocketCargo.removeCargo(mission.cargoType, quantityToDeliver);
                        mission.deliveredQuantity += quantityToDeliver;
                        missionsToUpdate.push(mission);

                        console.log(`%c[MissionManager] Livraison partielle pour la mission ${mission.id} à ${currentLocation}. Livré: ${quantityToDeliver} ${mission.cargoType}. Total livré: ${mission.deliveredQuantity}/${mission.quantity}`, 'color: yellow;');

                        if (mission.deliveredQuantity >= mission.quantity) {
                            console.log(`%c[MissionManager] Mission ${mission.id} (${mission.from} -> ${mission.to}) complétée à ${currentLocation}. Total livré: ${mission.deliveredQuantity}/${mission.quantity}`, 'color: green;');
                            mission.status = "completed";
                            completedMissions.push(mission);
                        } 
                    }
                } 
            }
            // Logique de rechargement sur la planète d'origine (Terre)
            else if (mission.from === currentLocation && mission.cargoType === "Fuel" && mission.from === "Terre" && mission.deliveredQuantity > 0 && mission.deliveredQuantity < mission.quantity) {
                 const fuelItem = rocketCargo.getCargoList().find(item => item.type === "Fuel");
                 const currentFuel = fuelItem ? fuelItem.quantity : 0;
                 const neededFuel = mission.quantity - mission.deliveredQuantity;

                 // Calculer l'espace disponible avant de décider combien charger
                 const currentLoad = rocketCargo.getCurrentLoad();
                 const availableSpace = rocketCargo.getMaxCapacity() - currentLoad;

                 // Charger au maximum 10 unités, le carburant nécessaire, ou l'espace disponible
                 const fuelToLoad = Math.min(neededFuel, 10, availableSpace);

                 if(fuelToLoad > 0) {
                    rocketCargo.addCargo("Fuel", fuelToLoad);
                    console.log(`%c[MissionManager] Rechargement de ${fuelToLoad} Fuel sur ${currentLocation} pour la mission ${mission.id}.`, 'color: blue;');
                    // Pas besoin de mettre à jour la mission ici, seulement le cargo
                 }
            }
        }

        // Retourner les missions complétées et mettre à jour l'UI si nécessaire
        // Note: Il faudra peut-être une logique pour déclencher la mise à jour de l'UI depuis ici
        // EventBus.emit('missionsUpdated', missionsToUpdate);

        return completedMissions;
    }

    /**
     * Retourne la liste des missions actives
     * @returns {Array<Mission>}
     */
    getActiveMissions() {
        return this.missions.filter(mission => mission.status === "pending");
    }

    /**
     * Réinitialise les missions à leur état initial.
     */
    resetMissions() {
        this.missions = []; // Vider les missions actuelles
        console.log("%c[MissionManager] Réinitialisation des missions.", 'color: orange;');
        this.createMission("Terre", "Lune", "Fuel", 20, 100); // Recréer la mission initiale
    }
}

// Mission de test initiale (sera ajoutée par resetMissions au début)
const missionManager = new MissionManager();
// missionManager.createMission("Terre", "Lune", "Fuel", 20, 100); // Plus nécessaire ici, fait dans resetMissions

// Initialisation au chargement du script
missionManager.resetMissions();

// Supprimer l'exportation par défaut si elle existe
// export default missionManager; 