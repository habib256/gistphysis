// Encapsulation du code dans une IIFE pour éviter des redéclarations globales.
(function(){
    if (typeof window !== 'undefined' && window.Game) {
        console.warn("Game already defined, skipping reinitialization.");
        return;
    }

    // Ce fichier gère le jeu d'équilibrage de réactions chimiques et implémente un système de scoring.

    // Importation des réactions depuis "equation.js" (fichier renommé sans accent)
    const reactions = (typeof require === 'function' ? require('./equation') : (window.reactions || []));

    // Définition de la classe Game qui gère l'état du jeu et le score
    class Game {
        constructor() {
            this.score = 0;  // Score initialisé à 0
            this.currentReaction = null;
            this.questionCount = 0;   // Compteur d'essais effectués
            this.maxQuestions = 20;   // Nombre maximum d'essais
        }
        
        // Démarrer le jeu : affiche un message de bienvenue et lance la présentation
        startGame() {
            console.log("Bienvenue dans le jeu d'équilibré de réactions chimiques !");
            this.showPresentation();
        }
        
        // -----------------------------------------------------------------
        // Écran d'accueil (Présentation principale du jeu)
        // -----------------------------------------------------------------
        showPresentation() {
            // Récupération du conteneur principal (#app) ou du body par défaut
            const appContainer = document.getElementById('app') || document.body;
            // Vider le conteneur pour afficher seulement l'écran d'accueil
            appContainer.innerHTML = "";
            
            // Création du conteneur pour l'écran d'accueil
            const presentationContainer = document.createElement("div");
            presentationContainer.id = "presentation"; // Écran d'accueil isolé
            presentationContainer.style.padding = "20px";
            presentationContainer.style.fontFamily = "Arial, sans-serif";
            presentationContainer.style.maxWidth = "600px";
            presentationContainer.style.margin = "20px auto";
            presentationContainer.style.textAlign = "center";
            
            // Contenu de la présentation du jeu avec le modèle intégré
            presentationContainer.innerHTML = `
                <h1>Équilibrez des réactions chimiques</h1>
                <h2>Analyses approfondies</h2>
                <p>
                    Dans ce jeu, vous apprendrez à maîtriser l'art d'équilibrer les réactions chimiques.
                    Chaque question vous mettra au défi d'ajuster les coefficients afin de respecter la loi
                    de conservation de la masse, tout en approfondissant vos connaissances en chimie.
                    Préparez-vous à vivre une expérience éducative et interactive !
                </p>
                <!-- Conteneur du modèle (doit correspondre à ce que model.js attend) -->
                <div id="modelContainer" style="width:100%; height:200px; margin-bottom:20px;"></div>
                <button id="start-challenge-button">Commencer pour jouer</button>
            `;
            appContainer.appendChild(presentationContainer);
            
            // Gestion du clic sur le bouton pour démarrer le jeu
            const startButton = document.getElementById("start-challenge-button");
            if (startButton) {
                startButton.addEventListener("click", () => {
                    // Masquer l'écran d'accueil
                    presentationContainer.style.display = "none";
                    // Déclencher le chargement de la première réaction via équilibre.js
                    if (typeof loadReaction === "function") {
                        loadReaction();
                    }
                });
            }
        }
        
        // Sélectionne une réaction aléatoire à partir du tableau des réactions.
        pickRandomReaction() {
            if (reactions.length === 0) {
                console.warn("Aucune réaction définie dans 'equation.js'. Utilisation d'une réaction par défaut.");
                this.currentReaction = { equation: "CH4 + 2 O2 -> CO2 + 2 H2O" };
            } else {
                const index = Math.floor(Math.random() * reactions.length);
                this.currentReaction = reactions[index];
            }
        }
        
        // Vérifie la réponse de l'utilisateur en se basant sur une comparaison exacte de la chaîne.
        checkAnswer(userAnswer) {
            if (userAnswer.trim() === this.currentReaction.equation.trim()) {
                console.log("Bravo! La réaction est correctement équilibrée.");
                this.updateScore(1);  // Attribution de 1 point pour une bonne réponse
                return true;
            } else {
                console.log("Ce n'est pas la bonne équation équilibrée. Réessayez !");
                return false;
            }
        }
        
        // Traite la réponse, met à jour le score et passe à la réaction suivante.
        processAnswer(userAnswer) {
            const isCorrect = this.checkAnswer(userAnswer);
            this.questionCount++;
            // Si le nombre maximum d'essais a été atteint, on affiche le score final
            if(this.questionCount >= this.maxQuestions) {
                console.log(`Jeu terminé! Votre score final est: ${this.score} / ${this.maxQuestions}`);
            } else {
                this.nextReaction();
            }
            return isCorrect;
        }
        
        // Met à jour le score et affiche le score actuel.
        updateScore(points) {
            this.score += points;
            console.log(`Vous gagnez ${points} points. Score actuel: ${this.score}`);
        }
        
        // Permet de passer à une nouvelle réaction (optionnel)
        nextReaction() {
            this.pickRandomReaction();
            console.log(`Nouvelle réaction: ${this.currentReaction.equation}`);
        }
        
        // Mise à jour de l'interface pour afficher le score, etc.
        updateUI() {
            const scoreElem = document.getElementById("score");
            if (scoreElem) {
                scoreElem.innerText = "Score: " + this.score;
            } else {
                console.warn("L'élément 'score' n'existe pas dans le DOM.");
            }
        }
    }

    // Export de la classe Game pour une utilisation éventuelle dans d'autres modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Game;
    } else {
        window.Game = Game;
    }

    // Exemple d'utilisation si ce fichier est exécuté directement (pour Node ou dans le navigateur)
    if (typeof window !== 'undefined') {
        document.addEventListener("DOMContentLoaded", function() {
            if (typeof Game !== 'undefined') {
                const game = new Game();
                game.startGame();
                // Pour accéder à l'objet Game dans d'autres scripts
                window.currentGame = game;
            }
        });
    }
})(); 