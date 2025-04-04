// Liste de 60 réactions chimiques classiques avec identification du niveau et du type

const reactions = [
    {
        id: 1,
        equation: "2H₂ + O₂ → 2H₂O",
        niveau: "collège",
        type: "oxydoréduction",
        description: "Formation d'eau par combustion de l'hydrogène, réaction oxydoréduction typique."
    },
    {
        id: 2,
        equation: "HCl + NaOH → NaCl + H₂O",
        niveau: "collège",
        type: "acide-basique",
        description: "Neutralisation entre un acide fort et une base forte, réaction acide-basique classique."
    },
    {
        id: 3,
        equation: "CaCO₃ → CaO + CO₂",
        niveau: "collège",
        type: "décomposition",
        description: "Décomposition du carbonate de calcium utilisée pour démontrer la formation de dioxyde de carbone."
    },
    {
        id: 4,
        equation: "Zn + 2HCl → ZnCl₂ + H₂",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Réaction entre le zinc et l'acide chlorhydrique illustrant une réduction du proton en H₂."
    },
    {
        id: 5,
        equation: "Fe + CuSO₄ → FeSO₄ + Cu",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Réaction de déplacement impliquant le fer réduisant le cuivre dans une solution de sulfate de cuivre."
    },
    {
        id: 6,
        equation: "H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O",
        niveau: "lycée",
        type: "acide-basique",
        description: "Neutralisation de l'acide sulfurique par la soude, réaction acide-basique avec des coefficients indiqués."
    },
    {
        id: 7,
        equation: "2KClO₃ → 2KCl + 3O₂",
        niveau: "lycée",
        type: "décomposition",
        description: "Décomposition du chlorate de potassium utilisée pour obtenir de l'oxygène en laboratoire."
    },
    {
        id: 8,
        equation: "CH₄ + 2O₂ → CO₂ + 2H₂O",
        niveau: "collège",
        type: "combustion",
        description: "Combustion complète du méthane, réaction énergétique et exothermique."
    },
    {
        id: 9,
        equation: "C₃H₈ + 5O₂ → 3CO₂ + 4H₂O",
        niveau: "collège",
        type: "combustion",
        description: "Combustion du propane, typique dans les expériences de laboratoire sur la combustion."
    },
    {
        id: 10,
        equation: "2CO + O₂ → 2CO₂",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Oxydation du monoxyde de carbone en dioxyde de carbone, réaction importante pour la pollution."
    },
    {
        id: 11,
        equation: "4Fe + 3O₂ → 2Fe₂O₃",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Formation d'oxyde de fer (rouille) par la combustion ou l'oxydation du fer."
    },
    {
        id: 12,
        equation: "2Na + Cl₂ → 2NaCl",
        niveau: "collège",
        type: "synthèse",
        description: "Synthèse du chlorure de sodium, réaction classique entre un métal alcalin et le chlore."
    },
    {
        id: 13,
        equation: "2K + 2H₂O → 2KOH + H₂",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Réaction violente d'un métal alcalin (potassium) avec l'eau produisant de l'hydroxyde et de l'hydrogène."
    },
    {
        id: 14,
        equation: "Mg + 2H₂O → Mg(OH)₂ + H₂",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Réaction du magnésium avec l'eau, formant de l'hydroxyde de magnésium et du dihydrogène."
    },
    {
        id: 15,
        equation: "2H₂O₂ → 2H₂O + O₂",
        niveau: "lycée",
        type: "décomposition",
        description: "Décomposition du peroxyde d'hydrogène, souvent catalysée par de la MnO₂."
    },
    {
        id: 16,
        equation: "Cu + O₂ → CuO",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Oxydation du cuivre en oxyde de cuivre, réaction observée lors de l'oxydation prolongée."
    },
    {
        id: 17,
        equation: "N₂ + 3H₂ → 2NH₃",
        niveau: "lycée",
        type: "synthèse",
        description: "Processus de synthèse de l'ammoniac (procédé Haber), fondamental en chimie industrielle."
    },
    {
        id: 18,
        equation: "P₄ + 5O₂ → P₄O₁₀",
        niveau: "lycée",
        type: "combustion",
        description: "Combustion du phosphore menant à la formation du pentoxyde de diphosphore."
    },
    {
        id: 19,
        equation: "C + O₂ → CO₂",
        niveau: "collège",
        type: "combustion",
        description: "Combustion du carbone dans l'oxygène, réaction fondamentale pour la formation du dioxyde de carbone."
    },
    {
        id: 20,
        equation: "2NO₂ → 2NO + O₂",
        niveau: "lycée",
        type: "décomposition",
        description: "Décomposition du dioxyde d'azote, réaction illustrant la fragilité des liaisons dans certaines conditions."
    },
    {
        id: 21,
        equation: "NH₃ + HCl → NH₄Cl",
        niveau: "collège",
        type: "synthèse",
        description: "Formation de chlorure d'ammonium par réaction entre ammoniaque et acide chlorhydrique."
    },
    {
        id: 22,
        equation: "CaO + H₂O → Ca(OH)₂",
        niveau: "collège",
        type: "synthèse",
        description: "Hydratation de l'oxyde de calcium pour obtenir l'hydroxyde de calcium (chaux éteinte)."
    },
    {
        id: 23,
        equation: "Na₂CO₃ + CaCl₂ → 2NaCl + CaCO₃",
        niveau: "collège",
        type: "double remplacement",
        description: "Réaction de précipitation qui produit du carbonate de calcium insoluble."
    },
    {
        id: 24,
        equation: "AgNO₃ + NaCl → AgCl + NaNO₃",
        niveau: "collège",
        type: "double remplacement",
        description: "Formation de chlorure d'argent, précipité blanc, dans une réaction de double remplacement."
    },
    {
        id: 25,
        equation: "BaCl₂ + Na₂SO₄ → BaSO₄ + 2NaCl",
        niveau: "collège",
        type: "double remplacement",
        description: "Réaction de précipitation produisant du sulfate de baryum, insoluble dans l'eau."
    },
    {
        id: 26,
        equation: "Pb(NO₃)₂ + 2KI → PbI₂ + 2KNO₃",
        niveau: "lycée",
        type: "double remplacement",
        description: "Formation de iodure de plomb, un précipité jaune, par double remplacement."
    },
    {
        id: 27,
        equation: "C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O",
        niveau: "lycée",
        type: "combustion",
        description: "Combustion de l'éthanol illustrant la transformation d'un alcool en dioxyde de carbone et eau."
    },
    {
        id: 28,
        equation: "2C₂H₆ + 7O₂ → 4CO₂ + 6H₂O",
        niveau: "lycée",
        type: "combustion",
        description: "Combustion de l'éthane, réaction exothermique produisant du CO₂ et H₂O."
    },
    {
        id: 29,
        equation: "2NO + O₂ → 2NO₂",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Oxydation de l'oxyde nitrique en dioxyde d'azote, importante en chimie atmosphérique."
    },
    {
        id: 30,
        equation: "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O",
        niveau: "lycée",
        type: "combustion",
        description: "Combustion du glucose, réaction illustrant la libération d'énergie dans les organismes."
    },
    {
        id: 31,
        equation: "2KOH → K₂O + H₂O",
        niveau: "lycée",
        type: "décomposition",
        description: "Décomposition thermique de l'hydroxyde de potassium en oxyde de potassium et eau."
    },
    {
        id: 32,
        equation: "2Na + 2H₂O → 2NaOH + H₂",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Réaction du sodium avec l'eau, produisant de l'hydroxyde de sodium et du dihydrogène."
    },
    {
        id: 33,
        equation: "Mg + O₂ → MgO",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Oxydation du magnésium en oxyde de magnésium, réaction exothermique."
    },
    {
        id: 34,
        equation: "2Al + 3Cl₂ → 2AlCl₃",
        niveau: "lycée",
        type: "synthèse",
        description: "Synthèse du chlorure d'aluminium par réaction directe de l'aluminium avec le chlore."
    },
    {
        id: 35,
        equation: "C + S → CS₂",
        niveau: "lycée",
        type: "synthèse",
        description: "Formation du disulfure de carbone par réaction entre le carbone et le soufre."
    },
    {
        id: 36,
        equation: "Fe₂O₃ + 2Al → 2Fe + Al₂O₃",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Réaction thermite utilisée pour obtenir du fer métallique et de l'oxyde d'aluminium."
    },
    {
        id: 37,
        equation: "CO₂ + H₂O → H₂CO₃",
        niveau: "collège",
        type: "synthèse",
        description: "Formation de l'acide carbonique par dissolution du CO₂ dans l'eau."
    },
    {
        id: 38,
        equation: "H₂CO₃ → H₂O + CO₂",
        niveau: "collège",
        type: "décomposition",
        description: "Décomposition de l'acide carbonique en eau et dioxyde de carbone."
    },
    {
        id: 39,
        equation: "NaHCO₃ + HCl → NaCl + CO₂ + H₂O",
        niveau: "collège",
        type: "acide-basique",
        description: "Réaction effervescente entre bicarbonate de sodium et acide chlorhydrique."
    },
    {
        id: 40,
        equation: "Ca(OH)₂ + CO₂ → CaCO₃ + H₂O",
        niveau: "collège",
        type: "double remplacement",
        description: "Formation de carbonate de calcium, réaction utilisée dans la fabrication de la chaux."
    },
    {
        id: 41,
        equation: "SO₂ + H₂O → H₂SO₃",
        niveau: "lycée",
        type: "synthèse",
        description: "Formation de l'acide sulfite par dissolution du SO₂ dans l'eau."
    },
    {
        id: 42,
        equation: "H₂SO₃ + H₂O → H₂SO₄",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Oxydation de l'acide sulfite en acide sulfurique, réaction catalysée dans certains procédés industriels."
    },
    {
        id: 43,
        equation: "C₂H₄ + H₂ → C₂H₆",
        niveau: "lycée",
        type: "synthèse",
        description: "Hydrogénation de l'éthylène pour former de l'éthane, réaction en présence d'un catalyseur."
    },
    {
        id: 44,
        equation: "C₂H₄ + Br₂ → C₂H₄Br₂",
        niveau: "lycée",
        type: "synthèse",
        description: "Addition de brome à l'éthylène, illustrant une réaction d'addition dans les composés insaturés."
    },
    {
        id: 45,
        equation: "CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄",
        niveau: "lycée",
        type: "double remplacement",
        description: "Formation d'hydroxyde de cuivre sous forme de précipité bleu par réaction en solution."
    },
    {
        id: 46,
        equation: "FeCl₃ + 3NaOH → Fe(OH)₃ + 3NaCl",
        niveau: "lycée",
        type: "double remplacement",
        description: "Précipitation d'hydroxyde de fer sous forme de gel rougeâtre par réaction avec une base."
    },
    {
        id: 47,
        equation: "Ba(OH)₂ + 2HCl → BaCl₂ + 2H₂O",
        niveau: "collège",
        type: "acide-basique",
        description: "Neutralisation entre la chaux (hydroxyde de baryum) et l'acide chlorhydrique."
    },
    {
        id: 48,
        equation: "KOH + HNO₃ → KNO₃ + H₂O",
        niveau: "collège",
        type: "acide-basique",
        description: "Réaction de neutralisation produisant du nitrate de potassium."
    },
    {
        id: 49,
        equation: "2C₈H₁₈ + 25O₂ → 16CO₂ + 18H₂O",
        niveau: "lycée",
        type: "combustion",
        description: "Combustion complète de l'octane, typique des moteurs à combustion interne."
    },
    {
        id: 50,
        equation: "4P + 5O₂ → 2P₂O₅",
        niveau: "lycée",
        type: "synthèse",
        description: "Synthèse du pentoxyde de diphosphore par combustion du phosphore."
    },
    {
        id: 51,
        equation: "2H₂O → 2H₂ + O₂",
        niveau: "collège",
        type: "décomposition",
        description: "Électrolyse de l'eau démontrant la séparation en dihydrogène et dioxygène."
    },
    {
        id: 52,
        equation: "2NaN₃ → 2Na + 3N₂",
        niveau: "lycée",
        type: "décomposition",
        description: "Décomposition de l'azoture de sodium, utilisée dans les systèmes de déploiement d'airbags."
    },
    {
        id: 53,
        equation: "CuO + H₂ → Cu + H₂O",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Réduction de l'oxyde de cuivre par l'hydrogène, test classique de réaction rédox."
    },
    {
        id: 54,
        equation: "CO + 2H₂ → CH₃OH",
        niveau: "lycée",
        type: "synthèse",
        description: "Synthèse industrielle du méthanol par réaction du monoxyde de carbone avec le dihydrogène."
    },
    {
        id: 55,
        equation: "2C₂H₂ + 5O₂ → 4CO₂ + 2H₂O",
        niveau: "lycée",
        type: "combustion",
        description: "Combustion de l'acétylène indiquant une oxydation complète en dioxyde de carbone et eau."
    },
    {
        id: 56,
        equation: "2KCl + Pb(NO₃)₂ → 2KNO₃ + PbCl₂",
        niveau: "lycée",
        type: "double remplacement",
        description: "Double remplacement conduisant à la formation d'un précipité de chlorure de plomb."
    },
    {
        id: 57,
        equation: "H₂ + Cl₂ → 2HCl",
        niveau: "collège",
        type: "synthèse",
        description: "Synthèse de l'acide chlorhydrique par combinaison du dihydrogène et du dichlore."
    },
    {
        id: 58,
        equation: "2Li + Cl₂ → 2LiCl",
        niveau: "collège",
        type: "synthèse",
        description: "Formation du chlorure de lithium, réaction simple entre un métal alcalin et le chlore."
    },
    {
        id: 59,
        equation: "2SO₂ + O₂ → 2SO₃",
        niveau: "lycée",
        type: "oxydoréduction",
        description: "Oxydation du dioxyde de soufre en trioxyde de soufre, étape clé dans le procédé de contact."
    },
    {
        id: 60,
        equation: "Fe + S → FeS",
        niveau: "collège",
        type: "synthèse",
        description: "Synthèse du sulfure de fer, réaction simple entre fer et soufre."
    }
];

// Allonger et préciser la description de chaque réaction en ajoutant une extension basée sur le type de réaction
reactions.forEach(reaction => {
    let extension = "";
    switch(reaction.type.toLowerCase()) {
        case "oxydoréduction":
            extension = "Dans cette réaction, un transfert d'électrons se produit entre les réactifs. Les espèces oxydantes et réductrices se transforment simultanément, en respectant la conservation des électrons et de l'énergie. Ce mécanisme est fondamental pour de nombreux processus industriels et biologiques.";
            break;
        case "acide-basique":
            extension = "Cette réaction de neutralisation implique l'échange de protons (H+) entre un acide et une base. Elle conduit à la formation d'un sel et d'eau, illustrant ainsi la neutralisation des charges électriques et le respect des lois de la conservation de la masse et de l'énergie.";
            break;
        case "décomposition":
            extension = "La décomposition consiste à rompre un composé en deux ou plusieurs produits, souvent sous l'effet de la chaleur ou d'un catalyseur. Ce phénomène met en évidence la rupture des liaisons chimiques tout en respectant la loi de conservation des atomes.";
            break;
        case "combustion":
            extension = "La combustion est une réaction exothermique au cours de laquelle un combustible réagit avec l'oxygène pour produire du dioxyde de carbone et de l'eau, tout en libérant une grande quantité d'énergie sous forme de chaleur et de lumière. Ce processus est caractéristique des réactions d'oxydation complète.";
            break;
        case "synthèse":
            extension = "Dans cette réaction de synthèse, plusieurs réactifs se combinent pour former un composé unique. Ce processus démontre la création de nouvelles liaisons chimiques et met en lumière la transformation structurale des réactifs en un produit final, conformément aux principes de la conservation.";
            break;
        case "double remplacement":
            extension = "Lors d'une réaction à double remplacement, les ions des composés échangent leurs partenaires, souvent conduisant à la formation d'un précipité ou à l'émission d'un gaz. Cette réaction illustre la dynamique des échanges ioniques en solution et la réorganisation des espèces chimiques.";
            break;
        default:
            extension = "";
    }
    reaction.description = reaction.description.trim() + " " + extension;
});

// Export de la liste pour utilisation dans d'autres modules, le cas échéant
if (typeof module !== 'undefined' && module.exports) {
    module.exports = reactions;
} 