document.addEventListener("DOMContentLoaded", function() {

    // Fonction pour charger une réaction dans le conteneur #app
    function loadReaction() {
        // On récupère le conteneur principal (on suppose qu'il existe)
        const container = document.getElementById("app") || document.body;
        // On vide le conteneur pour retirer l'ancienne question
        container.innerHTML = "";

        // Sélectionner une réaction aléatoire
        let reaction;
        if (typeof reactions !== "undefined" && reactions.length > 0) {
            const index = Math.floor(Math.random() * reactions.length);
            reaction = reactions[index];
        } else {
            console.warn("Aucune réaction définie dans 'équation.js'. Utilisation d'une réaction par défaut.");
            reaction = { equation: "CH4 + 2 O2 → CO2 + 2 H2O", description: "Réaction par défaut", type: "", niveau: "" };
        }

        // Création du conteneur de l'exercice d'équilibrage
        const reactionContainer = document.createElement("div");
        reactionContainer.id = "reaction-container";
        reactionContainer.style.padding = "20px";
        reactionContainer.style.fontFamily = "Arial, sans-serif";
        reactionContainer.style.maxWidth = "600px";
        reactionContainer.style.margin = "20px auto";
        reactionContainer.style.border = "1px solid #ccc";
        reactionContainer.style.borderRadius = "8px";
        reactionContainer.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";

        // Affichage des informations de la réaction : description, type, niveau
        const infoDiv = document.createElement("div");
        infoDiv.id = "reaction-info";
        infoDiv.innerHTML = 
            `<p><strong>Description :</strong> ${reaction.description}</p>` +
            `<p><strong>Type :</strong> ${reaction.type}</p>` +
            `<p><strong>Niveau :</strong> ${reaction.niveau}</p>`;
        reactionContainer.appendChild(infoDiv);
        
        // Insertion des indications pour réactifs et produits (affichage en flex)
        const indicationDiv = document.createElement("div");
        indicationDiv.style.display = "flex";
        indicationDiv.style.justifyContent = "center";
        indicationDiv.style.alignItems = "center";
        indicationDiv.style.fontWeight = "bold";
        indicationDiv.style.margin = "10px 0";

        const reactifText = document.createElement("span");
        reactifText.textContent = "Réactifs à gauche";
        const arrowText = document.createElement("span");
        arrowText.textContent = "⟶";
        arrowText.style.margin = "0 10px";
        const produitText = document.createElement("span");
        produitText.textContent = "Produits à droite";

        indicationDiv.appendChild(reactifText);
        indicationDiv.appendChild(arrowText);
        indicationDiv.appendChild(produitText);
        reactionContainer.appendChild(indicationDiv);

        // Création de la zone d'affichage de l'équation déséquilibrée
        const eqDiv = document.createElement("div");
        eqDiv.id = "equation";

        // Découpage de l'équation en parties (séparateur '→')
        const arrowIndex = reaction.equation.indexOf("→");
        if (arrowIndex === -1) {
            console.error("Aucun séparateur '→' trouvé dans l'équation");
            return;
        }
        const lhs = reaction.equation.substring(0, arrowIndex).trim();
        const rhs = reaction.equation.substring(arrowIndex + 1).trim();

        // Fonction pour enlever le coefficient initial d'une molécule
        function enleverCoefficient(part) {
            return part.replace(/^\s*\d+\s*/, '');
        }

        // Traitement de la partie gauche (réactifs)
        const reactifs = lhs.split("+")
                            .map(item => item.trim())
                            .map(enleverCoefficient);
        // Traitement de la partie droite (produits)
        const produits = rhs.split("+")
                            .map(item => item.trim())
                            .map(enleverCoefficient);

        // Fonction qui crée un groupe de saisie pour une liste de composés
        function createEquationGroup(composes, groupClass) {
            const groupDiv = document.createElement("span");
            groupDiv.className = groupClass;
            for (let i = 0; i < composes.length; i++) {
                // Création du champ de saisie pour le coefficient
                const input = document.createElement("input");
                input.type = "number";
                input.min = "1";
                input.value = "1";
                input.className = "coef-input";
                input.style.width = "40px";
                input.style.textAlign = "center";
                groupDiv.appendChild(input);

                // Affichage du composé sans coefficient
                const span = document.createElement("span");
                span.textContent = composes[i];
                span.style.margin = "0 5px";
                groupDiv.appendChild(span);

                // Ajout du symbole '+' si ce n'est pas le dernier élément
                if (i < composes.length - 1) {
                    const plus = document.createElement("span");
                    plus.textContent = " + ";
                    groupDiv.appendChild(plus);
                }
            }
            return groupDiv;
        }

        // Création des groupes pour réactifs et produits
        const reactifsGroup = createEquationGroup(reactifs, "reactifs-group");
        const produitsGroup = createEquationGroup(produits, "produits-group");

        // Mise en forme de l'équation : [reactifs] → [produits]
        const equationLine = document.createElement("div");
        equationLine.style.display = "flex";
        equationLine.style.justifyContent = "center";
        equationLine.style.alignItems = "center";
        equationLine.style.fontSize = "1.2em";
        equationLine.style.margin = "10px 0";
        equationLine.appendChild(reactifsGroup);

        const arrowSpan = document.createElement("span");
        arrowSpan.textContent = " → ";
        arrowSpan.style.margin = "0 5px";
        equationLine.appendChild(arrowSpan);

        equationLine.appendChild(produitsGroup);
        eqDiv.appendChild(equationLine);
        reactionContainer.appendChild(eqDiv);

        // Bouton de validation -> lorsqu'on valide, si la formule est correcte, on charge une nouvelle question
        const validateBtn = document.createElement("button");
        validateBtn.id = "validate-btn";
        validateBtn.textContent = "Valider l'équilibrage";
        validateBtn.style.marginRight = "10px";
        validateBtn.addEventListener("click", function() {
            // Récupérer les valeurs saisies pour réactifs et produits
            const reactifInputs = reactifsGroup.getElementsByTagName("input");
            const produitInputs = produitsGroup.getElementsByTagName("input");
            for (let i = 0; i < reactifInputs.length; i++) {
                let val = parseInt(reactifInputs[i].value);
                if (!val || val < 1) {
                    alert("Veuillez entrer un coefficient valide pour tous les réactifs.");
                    return;
                }
            }
            for (let i = 0; i < produitInputs.length; i++) {
                let val = parseInt(produitInputs[i].value);
                if (!val || val < 1) {
                    alert("Veuillez entrer un coefficient valide pour tous les produits.");
                    return;
                }
            }
            
            // Calcul des quantités d'atomes totaux pour les réactifs
            const leftCounts = {};
            for (let i = 0; i < reactifs.length; i++) {
                const coeff = parseInt(reactifInputs[i].value);
                const formula = reactifs[i];
                const counts = parseFormula(formula);
                for (let element in counts) {
                    leftCounts[element] = (leftCounts[element] || 0) + counts[element] * coeff;
                }
            }
            // Calcul des quantités d'atomes totaux pour les produits
            const rightCounts = {};
            for (let i = 0; i < produits.length; i++) {
                const coeff = parseInt(produitInputs[i].value);
                const formula = produits[i];
                const counts = parseFormula(formula);
                for (let element in counts) {
                    rightCounts[element] = (rightCounts[element] || 0) + counts[element] * coeff;
                }
            }

            // Fonction de comparaison des bilans d'atomes
            function countsEqual(count1, count2) {
                const keys1 = Object.keys(count1);
                const keys2 = Object.keys(count2);
                if (keys1.length !== keys2.length) return false;
                for (let key of keys1) {
                    if (count1[key] !== count2[key]) return false;
                }
                return true;
            }
            
            // Vérifier la correction de l'équation
            if (countsEqual(leftCounts, rightCounts)) {
                alert("Bravo ! L'équation est correctement équilibrée.");
                if (window.currentGame) {
                    window.currentGame.updateScore(1);
                }
            } else {
                alert("L'équation n'est pas équilibrée. Vérifiez vos coefficients.");
            }
            
            // Incrémenter le nombre d'essais, quel que soit le résultat.
            if (window.currentGame) {
                window.currentGame.questionCount++;
                window.currentGame.updateUI();
                // Si 20 essais ont été effectués, terminer le jeu.
                if (window.currentGame.questionCount >= window.currentGame.maxQuestions) {
                    alert("Jeu terminé! Votre score final est: " + window.currentGame.score + " / " + window.currentGame.maxQuestions);
                    return; // Arrêt sans charger de nouvelle question.
                }
                // Préparer la réaction suivante
                window.currentGame.pickRandomReaction();
            }
            // Charger la prochaine réaction sans recharger la page
            loadReaction();
        });
        reactionContainer.appendChild(validateBtn);

        // Bouton optionnel pour passer à une nouvelle réaction sans validation
        const newReactionBtn = document.createElement("button");
        newReactionBtn.id = "new-reaction-btn";
        newReactionBtn.textContent = "Nouvelle réaction";
        newReactionBtn.addEventListener("click", function() {
            loadReaction();
        });
        reactionContainer.appendChild(newReactionBtn);

        // Ajouter le conteneur de l'exercice à la page
        container.appendChild(reactionContainer);
    }

    // Fonction utilitaire pour normaliser une formule (gestion des indices)
    function normalizeFormula(formula) {
        const subscripts = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
        return formula.replace(/[\u2080-\u2089]/g, function(match) {
            return subscripts[match] || match;
        });
    }
    
    // Fonction qui analyse une formule et retourne le nombre d'atomes de chaque élément
    function parseFormula(formula) {
        formula = normalizeFormula(formula);
        const atomCounts = {};
        // Regex pour capturer un atome (lettre majuscule suivie d'une minuscule facultative) et un nombre éventuel
        const regex = /([A-Z][a-z]?)(\d*)/g;
        let match;
        while ((match = regex.exec(formula)) !== null) {
            const element = match[1];
            const count = match[2] ? parseInt(match[2]) : 1;
            atomCounts[element] = (atomCounts[element] || 0) + count;
        }
        return atomCounts;
    }

    // Charger la première réaction dès que le DOM est prêt
    loadReaction();
}); 