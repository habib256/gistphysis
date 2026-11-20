#!/usr/bin/env node
/*
 * Ajoute aux commentaires des exemples d'OptGeo écrits pour la souris et les barres d'outils de
 * Windows (« clic simple, et déplacer la souris », « bouton Fin dép. », « 2ème barre d'outil »…)
 * une note « Dans la version web : … » qui dit le geste réel de l'application web. Le texte de
 * l'auteur (Jean-Marie Biansan) n'est pas modifié : la note est ajoutée à la suite du paragraphe.
 *
 *   node optgeo/outils/adapter-commentaires.js
 *
 * Écrit exemples/<…>.txt (fins de ligne CRLF, comme les originaux) et la description de
 * exemples/index.json, puis relance outils/embarquer-exemples.js. Reproductible et idempotent :
 * une note déjà présente n'est pas ajoutée deux fois. Le script échoue (code 1) si le texte de
 * l'auteur visé par une note a changé, ou si un commentaire décrit encore un geste de la version
 * Windows (souris, clic, curseur, « Fin dép. », barre d'outils, icône) sans note pour la version web.
 * Aucune dépendance.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const dossier = path.join(racine, 'exemples');
const MARQUE = 'Dans la version web : ';

const LENTILLES = {
  apres: 'cliquer sur le bouton "Fin dép.".',
  note: 'toucher (ou cliquer) le point source pour faire apparaître ses poignées, puis faire glisser le cercle bleu posé ' +
    'sur le point source ; le point reste où on lève le doigt (ou le bouton de la souris). Il n’y a ni mode à choisir, ' +
    'ni bouton « Fin dép. ». On peut aussi passer par le bouton « Déplacer » de la barre du haut (sous « Modes » sur un ' +
    'écran étroit) : les poignées de tous les éléments s’affichent, et on sort de ce mode par « Terminer ».'
};
const FANTOMES = 'l’outil « Cacher segments » (rayons fantômes) est dans la palette des objets, famille « Divers » : ' +
  'touchez ensuite les segments de rayon à cacher.';

/** Une note par exemple : « apres » = fin exacte du passage de l'auteur que la note complète. */
const NOTES = {
  'Exemples_Classiques/Lentilles/lentille_convergente_1.txt': LENTILLES,
  'Exemples_Classiques/Lentilles/lentille_convergente_2.txt': LENTILLES,
  'Exemples_Classiques/Lentilles/lentille_convergente_3.txt': LENTILLES,
  'Exemples_Classiques/Lentilles/lentille_divergente_1.txt': LENTILLES,
  'Exemples_Classiques/Lentilles/lentille_divergente_2.txt': LENTILLES,
  'Exemples_Classiques/Lentilles/lentille_divergente_3.txt': LENTILLES,
  'Exemples_Classiques/autocollimation.txt': {
    apres: "mais en utilisant l'une ou l'autre des extrémités du miroir).",
    note: 'toucher (ou cliquer) le miroir pour faire apparaître ses poignées. Pour le translater, faire glisser la croix ' +
      'verte (son centre) ou le miroir lui-même ; pour changer son inclinaison, faire glisser un disque rouge (rotation ' +
      'autour du centre) ou un cercle bleu (une extrémité). Le miroir reste où on lève le doigt (ou le bouton de la ' +
      'souris) : pas de clic final, pas de bouton « Fin dép ».'
  },
  'Michelson/michelson2.txt': { apres: "dans la 2ème barre d'outil.", note: FANTOMES },
  'Michelson/michelson3.txt': { apres: "à l'aide de l'icone en forme de fantôme.", note: FANTOMES },
  'Exemples_Classiques/Telescopes/telescope_newton.txt': {
    apres: "l'oeil peut observer sans accomoder.",
    note: 'le zoom ×10 est dans le bouton « Affichage » de la barre du haut ; on peut aussi zoomer à deux doigts ou ' +
      'avec les boutons + et − à droite du dessin.'
  }
};
/** Gestes de la version Windows qui ne doivent plus apparaître sans note pour la version web. */
const GESTES_WINDOWS = /souris|\bclic|cliquer|curseur|courseur|Fin dép|barre d'outil|\bicone\b|\bicône\b/i;

let erreurs = 0, ajoutees = 0;
function ajouterNote(texte, n, fin) {
  if (texte.includes(MARQUE + n.note)) return texte;              // déjà fait
  const i = texte.indexOf(n.apres);
  if (i < 0) return null;
  const j = i + n.apres.length;
  ajoutees++;
  return texte.slice(0, j) + fin + fin + MARQUE + n.note + texte.slice(j);
}

const index = JSON.parse(fs.readFileSync(path.join(dossier, 'index.json'), 'utf8'));
for (const [fichierTexte, n] of Object.entries(NOTES)) {
  const e = index.exemples.find(x => x.fichierTexte === fichierTexte);
  if (!e) { console.error('Exemple introuvable dans index.json : ' + fichierTexte); erreurs++; continue; }
  const chemin = path.join(dossier, fichierTexte);
  const txt = fs.readFileSync(chemin, 'utf8');
  const nouveauTxt = ajouterNote(txt, n, '\r\n');
  const nouvelleDescription = ajouterNote(e.description, n, '\n');
  if (nouveauTxt === null || nouvelleDescription === null) { console.error('Passage de l’auteur introuvable (« ' + n.apres + ' ») : ' + fichierTexte); erreurs++; continue; }
  if (nouveauTxt !== txt) fs.writeFileSync(chemin, nouveauTxt);
  e.description = nouvelleDescription;
}
// contrôle : aucun commentaire ne décrit un geste de la version Windows sans note pour la version web
for (const e of index.exemples) {
  const d = e.description || '';
  if (GESTES_WINDOWS.test(d) && !d.includes(MARQUE)) { console.error('Geste de la version Windows sans note pour la version web : ' + e.fichier); erreurs++; }
}
if (erreurs) { console.error(erreurs + ' erreur(s) : rien n’est embarqué.'); process.exit(1); }
fs.writeFileSync(path.join(dossier, 'index.json'), JSON.stringify(index, null, 1) + '\n');
console.log(ajoutees ? ajoutees + ' note(s) ajoutée(s) (fichiers .txt et index.json).' : 'Notes déjà présentes : rien à changer.');
require('./embarquer-exemples.js');
