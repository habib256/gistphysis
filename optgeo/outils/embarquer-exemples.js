#!/usr/bin/env node
/*
 * Embarque les 56 exemples d'OptGeo (exemples/index.json + fichiers .opt) dans
 * js/interface/exemples-embarques.js, pour que l'application puisse les ouvrir
 * aussi en file:// (où fetch() est interdit) et sans aucune requête réseau.
 *
 *   node optgeo/outils/embarquer-exemples.js
 *
 * À relancer si un exemple ou index.json change. Aucune dépendance.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(racine, 'exemples', 'index.json'), 'utf8'));
const exemples = index.exemples.map(e => {
  const octets = fs.readFileSync(path.join(racine, 'exemples', e.fichier));
  // Les exemples d'OptGeo 3.03 sont en UTF-8 ; repli Windows-1252 au cas où.
  let texte = octets.toString('utf8');
  if (texte.includes('�')) texte = octets.toString('latin1');
  return { categorie: e.categorie, titre: e.titre, fichier: e.fichier, description: e.description || '', opt: texte };
});
const sortie = '/* Fichier généré par outils/embarquer-exemples.js : ne pas modifier à la main.\n' +
  ' * ' + index.source.replace(/\*\//g, '* /') + '\n */\n' +
  'window.OPTGEO_EXEMPLES = ' + JSON.stringify(exemples, null, 0).replace(/},{/g, '},\n{') + ';\n';
fs.writeFileSync(path.join(racine, 'js', 'interface', 'exemples-embarques.js'), sortie);
console.log(exemples.length + ' exemples embarqués (' + Math.round(sortie.length / 1024) + ' ko).');
