// Données des réactions chimiques enrichies d'une description historique et pratique
const reactionsData = {
    "4eme": [
        { r:["H₂","O₂"], p:["H₂O"], c:[2,1,2], description:"Combustion dihydrogène/oxygène, base de la propulsion des fusées." },
        { r:["N₂","H₂"], p:["NH₃"], c:[1,3,2], description:"Synthèse Haber‑Bosch de l’ammoniac pour engrais depuis 1910." },
        { r:["Na","Cl₂"], p:["NaCl"], c:[2,1,2], description:"Production industrielle du sel par combinaison du sodium et du chlore." },
        { r:["Mg","O₂"], p:["MgO"], c:[2,1,2], description:"Combustion vive du magnésium illustrant les feux de Bengale." },
        { r:["Al","O₂"], p:["Al₂O₃"], c:[4,3,2], description:"Formation de l’alumine, couche protectrice de l’aluminium." },
        { r:["Fe","O₂"], p:["Fe₂O₃"], c:[4,3,2], description:"Rouille du fer, corrosion observée depuis l’Antiquité." },
        { r:["C","O₂"], p:["CO₂"], c:[1,1,1], description:"Combustion complète du carbone comme dans le charbon." },
        { r:["S","O₂"], p:["SO₂"], c:[1,1,1], description:"Brûlage du soufre utilisé jadis pour désinfecter les tonneaux." },
        { r:["P₄","O₂"], p:["P₂O₅"], c:[1,5,2], description:"Allumage du phosphore blanc des anciennes allumettes." },
        { r:["K","Cl₂"], p:["KCl"], c:[2,1,2], description:"Obtention du chlorure de potassium, engrais potassique." },
        { r:["H₂","Cl₂"], p:["HCl"], c:[1,1,2], description:"Synthèse directe du chlorure d’hydrogène découverte par Priestley." },
        { r:["Ca","O₂"], p:["CaO"], c:[2,1,2], description:"Calcaire à chaux vive dans les fours à chaux depuis l’Empire romain." },
        { r:["Zn","HCl"], p:["ZnCl₂","H₂"], c:[1,2,1,1], description:"Dégagement d’hydrogène en laboratoire via le zinc." },
        { r:["Fe","HCl"], p:["FeCl₂","H₂"], c:[1,2,1,1], description:"Acidification du fer pour test d’émission d’hydrogène." },
        { r:["Na","H₂O"], p:["NaOH","H₂"], c:[2,2,2,1], description:"Réaction spectaculaire du sodium dans l’eau." },
        { r:["Al","HCl"], p:["AlCl₃","H₂"], c:[2,6,2,3], description:"Préparation d’AlCl₃, catalyseur de Friedel‑Crafts." },
        { r:["CaCO₃"], p:["CaO","CO₂"], c:[1,1,1], description:"Calcination du calcaire pour fabriquer la chaux." },
        { r:["KClO₃"], p:["KCl","O₂"], c:[2,2,3], description:"Décomposition du chlorate, source d’oxygène des feux d’artifice." },
        { r:["NaHCO₃"], p:["Na₂CO₃","CO₂","H₂O"], c:[2,1,1,1], description:"Levée des gâteaux via la décomposition du bicarbonate." },
        { r:["Na₂CO₃","HCl"], p:["NaCl","H₂O","CO₂"], c:[1,2,2,1,1], description:"Réaction entre soude et acide chlorhydrique, base de la burette." }
    ],
    "3eme": [
        { r:["Fe₂O₃","C"], p:["Fe","CO₂"], c:[1,3,2,3], description:"Réduction du minerai de fer au carbone dans les hauts‑fourneaux." },
        { r:["C₂H₆","O₂"], p:["CO₂","H₂O"], c:[2,7,4,6], description:"Combustion de l’éthane, constituant du gaz naturel." },
        { r:["Al","Fe₂O₃"], p:["Al₂O₃","Fe"], c:[2,1,1,2], description:"Thermite, soudure aluminothermique des rails (Goldschmidt 1895)." },
        { r:["NH₃","O₂"], p:["NO","H₂O"], c:[4,5,4,6], description:"Étape Ostwald pour produire l’acide nitrique." },
        { r:["C₃H₈","O₂"], p:["CO₂","H₂O"], c:[1,5,3,4], description:"Combustion du propane utilisé dans les barbecues." },
        { r:["FeS₂","O₂"], p:["Fe₂O₃","SO₂"], c:[4,11,2,8], description:"Rôtissage de la pyrite pour l’obtention de SO₂ industriel." },
        { r:["KNO₃"], p:["KNO₂","O₂"], c:[2,2,1], description:"Décomposition du salpêtre des poudres noires." },
        { r:["H₂SO₄","NaOH"], p:["Na₂SO₄","H₂O"], c:[1,2,1,2], description:"Neutralisation acide‑base, base des titrages." },
        { r:["Ca(OH)₂","H₃PO₄"], p:["Ca₃(PO₄)₂","H₂O"], c:[3,2,1,6], description:"Fabrication d’engrais phosphatés." },
        { r:["Na₂S₂O₃","I₂"], p:["NaI","Na₂S₄O₆"], c:[2,1,2,1], description:"Dosage de l’iode par thiosulfate (titrage Bunsen)." },
        { r:["P₄","Cl₂"], p:["PCl₅"], c:[1,10,4], description:"Chloruration du phosphore pour synthèse organique." },
        { r:["C₆H₁₂O₆","O₂"], p:["CO₂","H₂O"], c:[1,6,6,6], description:"Respiration cellulaire libérant l’énergie du glucose." },
        { r:["Cu","HNO₃"], p:["Cu(NO₃)₂","NO","H₂O"], c:[3,8,3,2,4], description:"Réaction classique de Cu dans l’acide nitrique fumant." },
        { r:["AgNO₃","Cu"], p:["Cu(NO₃)₂","Ag"], c:[2,1,1,2], description:"Remplacement d’argent par dismutation, test du cuivre." },
        { r:["Na","O₂"], p:["Na₂O"], c:[4,1,2], description:"Formation de l’oxyde de sodium, étape dans la fabrication du verre." },
        { r:["Pb(NO₃)₂"], p:["PbO","NO₂","O₂"], c:[2,2,4,1], description:"Décomposition du nitrate de plomb utilisée dans les pigments." },
        { r:["HCl","CaCO₃"], p:["CaCl₂","CO₂","H₂O"], c:[2,1,1,1,1], description:"Effervescence du calcaire à l’acide, test de la pierre." },
        { r:["C","H₂O"], p:["CO","H₂"], c:[1,1,1,1], description:"Gaz à l’eau (water‑gas) pour carburer les lampes au XIXᵉ." },
        { r:["Zn","AgNO₃"], p:["Zn(NO₃)₂","Ag"], c:[1,2,1,2], description:"Déplacement d’argent servant au dépôt du miroir d’argent." },
        { r:["Na₂O₂","H₂O"], p:["NaOH","O₂"], c:[2,2,4,1], description:"Génération d’oxygène dans les premiers sous‑marins." }
    ],
    "seconde": [
        { r:["KMnO₄","HCl"], p:["KCl","MnCl₂","Cl₂","H₂O"], c:[2,16,2,2,5,8], description:"Oxydation classique, préparation historique du chlore (Scheele 1774)." },
        { r:["H₂SO₄","Na₂CO₃"], p:["Na₂SO₄","CO₂","H₂O"], c:[1,1,1,1,1], description:"Réaction de la soude au vitriol, procédé Leblanc." },
        { r:["NaOH","H₃PO₄"], p:["Na₃PO₄","H₂O"], c:[3,1,1,3], description:"Production de phosphates trisodiques pour détergents." },
        { r:["FeS","HCl"], p:["FeCl₂","H₂S"], c:[1,2,1,1], description:"Libération d’H₂S pour identifier le fer en laboratoire." },
        { r:["K₂Cr₂O₇","H₂SO₄","FeSO₄"], p:["K₂SO₄","Cr₂(SO₄)₃","Fe₂(SO₄)₃","H₂O"], c:[1,4,6,1,1,3,4], description:"Dosage redox à l’ion dichromate, base de la chimie analytique." },
        { r:["Na₂S₂O₃","O₂","H₂O"], p:["Na₂SO₄","Na₂S₄O₆"], c:[2,1,1,2,1], description:"Vieillissement du fixateur des pellicules photographiques." },
        { r:["Cl₂","NaOH"], p:["NaCl","NaClO","H₂O"], c:[1,2,1,1,1], description:"Réaction chloralcali produisant l’eau de Javel (Labarraque, 1820)." },
        { r:["NH₄NO₃"], p:["N₂O","H₂O"], c:[1,1,2], description:"Décomposition de nitrate d’ammonium produisant le gaz hilarant." },
        { r:["Cu","HNO₃"], p:["Cu(NO₃)₂","NO₂","H₂O"], c:[1,4,1,2,2], description:"Formation de vapeurs brunes lors de la dissolution du cuivre." },
        { r:["C₂H₅OH","O₂"], p:["CO₂","H₂O"], c:[1,3,2,3], description:"Combustion de l’éthanol, principe des alcotests." },
        { r:["Cr₂O₃","Al"], p:["Cr","Al₂O₃"], c:[1,2,2,1], description:"Thermite chromite pour métallurgie des métaux réfractaires." },
        { r:["H₂O₂"], p:["H₂O","O₂"], c:[2,2,1], description:"Disproportionation du peroxyde d’hydrogène catalysée par MnO₂." },
        { r:["PbS","O₂"], p:["PbO","SO₂"], c:[2,3,2,2], description:"Grillage du sulfure de plomb pour obtenir la céruse." }
    ]
};

// Exportation pour utilisation dans d'autres fichiers (si nécessaire via des modules ES6 ou CommonJS)
// Si vous n'utilisez pas de système de modules, cette variable sera globale.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = reactionsData; // Pour Node.js/CommonJS
} else {
    window.reactionsData = reactionsData; // Pour navigateur
}
