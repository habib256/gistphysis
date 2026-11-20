/*
 * Lance tous les tests du moteur OptGeo :  node optgeo/tests/tous.js
 * (exemples.js, physique.js, api.js ; capture.js à part, il faut Chrome).
 */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
let echec = false;
for (const f of ['exemples.js', 'physique.js', 'api.js']) {
  console.log('==== ' + f);
  try { execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' }); }
  catch (e) { echec = true; }
}
console.log(echec ? '\nCertains tests ont échoué.' : '\nTous les tests ont réussi.');
process.exit(echec ? 1 : 0);
