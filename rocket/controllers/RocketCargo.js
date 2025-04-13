/**
 * Classe RocketCargo - Gestion de la cargaison de la fusée
 * @class
 */
class RocketCargo {
    /**
     * Crée une instance de RocketCargo
     * @constructor
     */
    constructor() {
        /**
         * @type {Array<{type: string, quantity: number}>}
         * Liste des éléments de cargaison
         */
        this.cargoItems = [];
    }

    /**
     * Ajoute un élément à la cargaison
     * @param {string} type - Type de cargo (ex: "Fuel", "Supplies")
     * @param {number} quantity - Quantité à ajouter
     */
    addCargo(type, quantity) {
        const existingItem = this.cargoItems.find(item => item.type === type);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cargoItems.push({ type, quantity });
        }
    }

    /**
     * Retire un élément de la cargaison
     * @param {string} type - Type de cargo à retirer
     * @param {number} quantity - Quantité à retirer
     * @returns {boolean} - True si le retrait a réussi, false sinon
     */
    removeCargo(type, quantity) {
        const itemIndex = this.cargoItems.findIndex(item => item.type === type);
        if (itemIndex === -1) return false;

        const item = this.cargoItems[itemIndex];
        if (item.quantity < quantity) return false;

        item.quantity -= quantity;
        if (item.quantity === 0) {
            this.cargoItems.splice(itemIndex, 1);
        }
        return true;
    }

    /**
     * Calcule la masse totale de la cargaison
     * @returns {number} - Masse totale en kg (1 unité = 10kg)
     */
    getTotalMass() {
        return this.cargoItems.reduce((total, item) => total + (item.quantity * 10), 0);
    }

    /**
     * Retourne la liste complète de la cargaison
     * @returns {Array<{type: string, quantity: number}>}
     */
    getCargoList() {
        return [...this.cargoItems];
    }
}

// export default RocketCargo; // Supprimé car le script est chargé globalement 