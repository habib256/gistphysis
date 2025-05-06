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
            this.attemptsLeft = 1; // Ajouter pour suivre les essais

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
            this.endTitle = document.getElementById('endTitle'); // Ajout référence titre fin

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
            this.attemptsLeft = 1; // Réinitialiser les essais pour le nouveau niveau
            
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

            this.attemptsLeft = 1; // Réinitialiser les essais pour la nouvelle question
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
                isCorrect = false; // Devrait idéalement gérer cette erreur plus robustement
            } else {
                for (let i = 0; i < correctCoefficients.length; i++) {
                    const userInput = userInputs[i];
                    // Considérer 1 si le champ est vide, invalide ou <= 0
                    const userValue = parseInt(userInput.value, 10);
                    const effectiveValue = (!userValue || userValue < 1) ? 1 : userValue; 
                    
                    // Réinitialiser le style avant la vérification
                    userInput.style.border = '1px solid #ccc'; 

                    if (effectiveValue !== correctCoefficients[i]) {
                        isCorrect = false;
                        userInput.style.border = '2px solid red'; // Mettre en évidence l'erreur
                    }
                }
            }

            if (isCorrect) {
                this.score++;
                this.feedbackDiv.textContent = '✅ Correct !';
                this.feedbackDiv.className = 'feedback correct';
                 // Passer à la question suivante après un court délai
                setTimeout(() => {
                    this.currentQuestionIndex++;
                    this.displayQuestion();
                    this.updateScoreDisplay();
                }, 1000); // Délai de 1 seconde
            } else {
                 if (this.attemptsLeft > 0) {
                    this.attemptsLeft--;
                    this.feedbackDiv.textContent = '🤔 Incorrect. Il vous reste 1 essai.';
                    this.feedbackDiv.className = 'feedback incorrect';
                } else {
                    // Aucun essai restant, afficher la bonne réponse et passer à la suite
                    this.feedbackDiv.innerHTML = `❌ Incorrect. La bonne réponse était : <div class="equation">${this.formatCorrectAnswer(question)}</div>`;
                    this.feedbackDiv.className = 'feedback final-incorrect';

                    // Désactiver les inputs pour éviter modifications pendant l'attente
                    userInputs.forEach(input => { input.disabled = true; }); // Assurer la désactivation

                    setTimeout(() => {
                        this.currentQuestionIndex++;
                        this.displayQuestion(); // Affichera la question suivante
                        this.updateScoreDisplay(); // Le score n'est pas incrémenté
                    }, 9000); // Délai plus long pour voir la réponse (12 secondes)
                }
            }
        }
        
        // Méthode pour formater l'affichage de la réponse correcte
        formatCorrectAnswer(question) {
            let htmlString = '';
            let coeffIndex = 0;
            const formatFormula = (formula) => formula.replace(/(\d+)/g, '<sub>$1</sub>');

            // Réactifs
            question.r.forEach((reactant, index) => {
                htmlString += `<span class="coeff" style="color: green; font-weight: bold; margin-right: 2px;">${question.c[coeffIndex++]}</span>`;
                htmlString += `<span>${formatFormula(reactant)}</span>`;
                if (index < question.r.length - 1) {
                    htmlString += ' + ';
                }
            });

            // Flèche
            htmlString += '<span style="margin: 0 10px;"> → </span>';

            // Produits
            question.p.forEach((product, index) => {
                htmlString += `<span class="coeff" style="color: green; font-weight: bold; margin-right: 2px;">${question.c[coeffIndex++]}</span>`;
                htmlString += `<span>${formatFormula(product)}</span>`;
                if (index < question.p.length - 1) {
                    htmlString += ' + ';
                }
            });

            return htmlString;
        }

        updateScoreDisplay() {
            this.scoreDiv.textContent = `Score: ${this.score} / ${this.questions.length} ✨`;
        }

        updateProgress() {
            this.progressDiv.textContent = `➡️ Question ${this.currentQuestionIndex + 1} sur ${this.questions.length}`;
        }

        endQuiz() {
            this.quizSection.classList.add('hidden');
            this.endSection.classList.remove('hidden');
            const score = this.score;
            const totalQuestions = this.questions.length;

            // Paliers de messages et titres en fonction du score
            if (score === totalQuestions) { // 100%
                this.endTitle.textContent = 'Félicitations !';
                this.finalScoreP.textContent = `🏆 Score parfait ! ${score} sur ${totalQuestions}.`;
            } else if (score >= totalQuestions * 0.75) { // 75% - 99% (Score 15-19 for 20 questions)
                this.endTitle.textContent = 'Excellent !';
                this.finalScoreP.textContent = `🎉 Votre score final est de ${score} sur ${totalQuestions}.`;
            } else if (score >= totalQuestions * 0.5) { // 50% - 74% (Score 10-14 for 20 questions)
                this.endTitle.textContent = 'Bon travail !';
                this.finalScoreP.textContent = `👍 Votre score final est de ${score} sur ${totalQuestions}.`;
            } else if (score >= totalQuestions * 0.25) { // 25% - 49% (Score 5-9 for 20 questions)
                this.endTitle.textContent = 'Quiz terminé'; // Titre neutre
                this.finalScoreP.textContent = `Votre score final est de ${score} sur ${totalQuestions}.`; // Message neutre
            } else { // Moins de 25% (Score < 5 for 20 questions)
                this.endTitle.textContent = 'Entraînement nécessaire';
                this.finalScoreP.textContent = `🙁 Votre score final est de ${score} sur ${totalQuestions}.`;
            }
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