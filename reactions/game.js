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
        constructor(reactionsData) {
            this.reactionsData = reactionsData;
            this.currentLevel = null;
            this.questions = [];
            this.currentQuestionIndex = 0;
            this.score = 0;

            this.menuSection = document.getElementById('menu');
            this.quizSection = document.getElementById('quiz');
            this.endSection = document.getElementById('end');
            this.progressDiv = document.getElementById('progress');
            this.reactionDescriptionDiv = document.getElementById('reactionDescription');
            this.inputsContainer = document.getElementById('inputsContainer');
            this.answerForm = document.getElementById('answerForm');
            this.feedbackDiv = document.getElementById('feedback');
            this.scoreDiv = document.getElementById('score');
            this.finalScoreP = document.getElementById('finalScore');
            this.backToMenuButton = document.getElementById('backToMenu');

            console.log("Game constructor: Binding events..."); // Log constructor
            this.bindMenuEvents();
            this.bindQuizEvents();
        }
        
        bindMenuEvents() {
            console.log("bindMenuEvents: Attaching listener to menuSection:", this.menuSection); // Log bindMenuEvents
            if (!this.menuSection) {
                console.error("Erreur: menuSection n'a pas été trouvé!");
                return;
            }
            this.menuSection.addEventListener('click', (event) => {
                // Trouver le bouton parent le plus proche (ou l'élément lui-même) qui a data-level
                const button = event.target.closest('button[data-level]');
                console.log("Menu click detected. Target:", event.target, "Found button:", button); // Log click detection + found button

                // Vérifier si un bouton correspondant a été trouvé
                if (button) {
                    const level = button.dataset.level;
                    console.log(`Bouton de niveau '${level}' (ou son contenu) cliqué. Appel de startLevel.`); // Log button click
                    this.startLevel(level);
                } else {
                    console.log("Clic détecté mais pas sur un bouton de niveau valide ou son contenu.");
                }
            });
        }

        bindQuizEvents() {
            this.answerForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.checkAnswer();
            });

            this.backToMenuButton.addEventListener('click', () => {
                this.showMenu();
            });
        }

        startLevel(level) {
            console.log(`startLevel: Début pour le niveau '${level}'.`); // Log début startLevel
            console.log("Tentative de démarrage du niveau :", level); 
            console.log("Données disponibles :", this.reactionsData); 

            // Vérification explicite que le niveau existe dans les données
            if (!this.reactionsData || !this.reactionsData[level]) {
                console.error(`Erreur : Données introuvables pour le niveau '${level}'. Vérifiez les attributs data-level et les clés dans reactionsData.`);
                alert(`Désolé, une erreur est survenue lors du chargement du niveau '${level}'.`);
                this.showMenu(); // Retourner au menu si le niveau n'est pas valide
                return;
            }

            this.currentLevel = level;
            this.questions = this.shuffleArray([...this.reactionsData[level]]); // Copie et mélange les questions
            this.currentQuestionIndex = 0;
            this.score = 0;
            
            console.log("startLevel: Masquage du menu et affichage du quiz..."); // Log avant changement de visibilité
            this.menuSection.classList.add('hidden');
            this.endSection.classList.add('hidden');
            this.quizSection.classList.remove('hidden');
            console.log("startLevel: Sections mises à jour."); // Log après changement de visibilité
            
            this.displayQuestion();
            this.updateScoreDisplay();
        }

        displayQuestion() {
            if (this.currentQuestionIndex >= this.questions.length) {
                this.endQuiz();
                return;
            }

            const question = this.questions[this.currentQuestionIndex];
            this.inputsContainer.innerHTML = '';
            this.feedbackDiv.innerHTML = '';
            this.feedbackDiv.className = 'feedback'; // Reset feedback style

            // Affichage de la description
            if (this.reactionDescriptionDiv && question.description) {
                this.reactionDescriptionDiv.textContent = question.description;
            } else if (this.reactionDescriptionDiv) {
                this.reactionDescriptionDiv.textContent = ''; // Effacer si pas de description
            }

            this.updateProgress();

            let inputIndex = 0;

            // Fonction pour créer un span avec une formule
            const createFormulaSpan = (formula) => {
                const span = document.createElement('span');
                span.innerHTML = formula.replace(/(\d+)/g, '<sub>$1</sub>'); // Ajoute les indices
                return span;
            };

            // Fonction pour créer un input pour un coefficient
            const createCoeffInput = () => {
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '1';
                input.className = 'coeff-input';
                input.dataset.index = inputIndex++;
                return input;
            };

            // Afficher les réactifs
            question.r.forEach((reactant, index) => {
                this.inputsContainer.appendChild(createCoeffInput());
                this.inputsContainer.appendChild(createFormulaSpan(reactant));
                if (index < question.r.length - 1) {
                    const plus = document.createElement('span');
                    plus.textContent = ' + ';
                    this.inputsContainer.appendChild(plus);
                }
            });

            // Flèche
            const arrow = document.createElement('span');
            arrow.textContent = ' → ';
            arrow.style.margin = '0 10px';
            this.inputsContainer.appendChild(arrow);

            // Afficher les produits
            question.p.forEach((product, index) => {
                this.inputsContainer.appendChild(createCoeffInput());
                this.inputsContainer.appendChild(createFormulaSpan(product));
                if (index < question.p.length - 1) {
                    const plus = document.createElement('span');
                    plus.textContent = ' + ';
                    this.inputsContainer.appendChild(plus);
                }
            });
        }

        checkAnswer() {
            const question = this.questions[this.currentQuestionIndex];
            const correctCoefficients = question.c;
            const userInputs = this.inputsContainer.querySelectorAll('.coeff-input');
            let isCorrect = true;

            if (userInputs.length !== correctCoefficients.length) {
                console.error("Incohérence entre le nombre d'inputs et de coefficients attendus.");
                isCorrect = false;
            } else {
                for (let i = 0; i < correctCoefficients.length; i++) {
                    const userInput = userInputs[i];
                    const userValue = parseInt(userInput.value, 10);
                    // Considérer 1 si le champ est vide ou invalide, comme souvent attendu
                    const effectiveValue = (!userValue || userValue < 1) ? 1 : userValue;
                    
                    if (effectiveValue !== correctCoefficients[i]) {
                        isCorrect = false;
                        userInput.style.border = '2px solid red'; // Highlight incorrect input
                    } else {
                        userInput.style.border = '1px solid #ccc'; // Reset border
                    }
                }
            }

            if (isCorrect) {
                this.score++;
                this.feedbackDiv.textContent = 'Correct !';
                this.feedbackDiv.style.color = 'green';
                 // Passer à la question suivante après un court délai
                setTimeout(() => {
                    this.currentQuestionIndex++;
                    this.displayQuestion();
                    this.updateScoreDisplay();
                }, 1000); // Délai de 1 seconde
            } else {
                this.feedbackDiv.textContent = 'Incorrect. Essayez encore.';
                this.feedbackDiv.style.color = 'red';
            }
           
        }
        
        updateScoreDisplay() {
            this.scoreDiv.textContent = `Score: ${this.score} / ${this.questions.length}`;
        }

        updateProgress() {
            this.progressDiv.textContent = `Question ${this.currentQuestionIndex + 1} sur ${this.questions.length}`;
        }

        endQuiz() {
            this.quizSection.classList.add('hidden');
            this.endSection.classList.remove('hidden');
            this.finalScoreP.textContent = `Votre score final est de ${this.score} sur ${this.questions.length}.`;
        }

        showMenu() {
            this.quizSection.classList.add('hidden');
            this.endSection.classList.add('hidden');
            this.menuSection.classList.remove('hidden');
        }

        // Fonction utilitaire pour mélanger un tableau (algorithme Fisher-Yates)
        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
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
                // Ne pas démarrer de niveau ici, attendre le clic de l'utilisateur dans le menu.
                // window.currentGame.startLevel(1); // <-- Suppression de cette ligne
            }
        });

        // Initialisation lorsque le DOM est prêt et que les données sont chargées
        document.addEventListener('DOMContentLoaded', () => {
            // Assurez-vous que reactionsData est disponible (chargé depuis equation.js)
            if (typeof reactionsData !== 'undefined') {
                console.log("DOM chargé et reactionsData trouvé. Création de l'instance Game...");
                // Créer l'instance du jeu et la rendre accessible globalement si besoin
                window.currentGame = new Game(reactionsData);
                console.log("Instance Game créée et assignée à window.currentGame:", window.currentGame);
                // Ne pas démarrer de niveau ici, attendre le clic de l'utilisateur dans le menu.
            } else {
                console.error('Les données des réactions (reactionsData) ne sont pas chargées.');
                // Afficher un message d'erreur à l'utilisateur ?
                const mainElement = document.querySelector('main') || document.body;
                mainElement.innerHTML = '<p style="color: red; text-align: center;">Erreur : Impossible de charger les données des équations. Veuillez vérifier la console.</p>';
            }
        });
    }
})(); 