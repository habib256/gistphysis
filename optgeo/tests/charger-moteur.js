/*
 * Charge les scripts du moteur OptGeo (scripts classiques, sans module) dans un
 * contexte vm de Node, exactement comme un navigateur les chargerait l'un après
 * l'autre avec des balises <script>. Aucune dépendance npm.
 *
 *   const { charger } = require('./charger-moteur.js');
 *   const OptGeo = charger();
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DOSSIER_MOTEUR = path.join(__dirname, '..', 'js', 'moteur');

function fichiersMoteur() {
  return fs.readdirSync(DOSSIER_MOTEUR).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
}

function charger() {
  const contexte = vm.createContext({ console, performance, TextEncoder, TextDecoder });
  for (const f of fichiersMoteur()) {
    const code = fs.readFileSync(path.join(DOSSIER_MOTEUR, f), 'utf8');
    vm.runInContext(code, contexte, { filename: f });
  }
  return contexte.OptGeo;
}

/** Liste récursive des fichiers .opt d'un dossier (chemins relatifs triés). */
function listerOpt(dossier, base) {
  base = base || dossier;
  let res = [];
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) res = res.concat(listerOpt(p, base));
    else if (e.name.endsWith('.opt')) res.push(path.relative(base, p));
  }
  return res.sort();
}

module.exports = { charger, fichiersMoteur, listerOpt, DOSSIER_EXEMPLES: path.join(__dirname, '..', 'exemples') };
