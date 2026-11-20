/*
 * Captures headless (Chrome) de tests/rendu.html pour quelques exemples.
 *   node optgeo/tests/capture.js [dossier_sortie] [exemple.opt …]
 * Sert le dossier optgeo/ sur un port local (le navigateur ne peut pas lire
 * les .opt en file://), lance Chrome sans interface et enregistre des PNG.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const RACINE = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sortie = process.argv[2] || '/private/tmp/optgeo-captures';
const EXEMPLES = process.argv.length > 3 ? process.argv.slice(3) : [
  'Exemples_Classiques/Lentilles/lentille_convergente_1.opt',
  'Exemples_Classiques/Lentilles/lentille_divergente_3.opt',
  'Exemples_Classiques/dispersion_prisme.opt',
  'Exemples_Classiques/arc_en_ciel_primaire.opt',
  'Exemples_Classiques/arc_en_ciel_secondaire.opt',
  'Michelson/michelson1.opt',
  'Michelson/michelson8.opt',
  'Exemples_Classiques/Telescopes/telescope_newton.opt',
  'Exemples_Classiques/Telescopes/telescope_cassegrain.opt',
  'Exemples_Classiques/lunette_astronomique.opt',
  'Reseaux/reseau_en_transmission.opt',
  'Reseaux/reseau_en_reflexion.opt',
  'Aberrations_Stigmatisme_Approche/Aberration_Chromatique/Correction_par_Doublet.opt',
  'Exemples_Classiques/filbre_saut_indice.opt',
  'Exemples_Classiques/coronographe.opt',
  'Stigmatisme_Rigoureux/weierstrass.opt'
];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.opt': 'text/plain', '.txt': 'text/plain' };

if (!fs.existsSync(CHROME)) { console.log('Chrome introuvable (' + CHROME + ') : captures non faites.'); process.exit(0); }
fs.mkdirSync(sortie, { recursive: true });

const serveur = http.createServer((req, res) => {
  const p = path.join(RACINE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(RACINE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
serveur.listen(0, '127.0.0.1', () => {
  const port = serveur.address().port;
  (async () => {
    for (const ex of EXEMPLES) {
      const png = path.join(sortie, ex.replace(/[\/]/g, '__').replace(/\.opt$/, '.png'));
      const url = `http://127.0.0.1:${port}/tests/rendu.html?ex=${encodeURIComponent(ex)}&l=1000&h=640`;
      try {
        // execFile asynchrone : le serveur doit pouvoir répondre pendant que Chrome tourne
        await new Promise((ok, ko) => execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
          '--window-size=1040,820', '--virtual-time-budget=4000', '--screenshot=' + png, url], { timeout: 60000 },
          (err) => (err ? ko(err) : ok())));
        console.log('capture :', png);
      } catch (e) { console.log('échec :', ex, e.message); }
    }
    // planches de vignettes (tous les exemples, 12 par planche)
    for (let de = 0; de < 56 && !process.argv[3]; de += 12) {
      const png = path.join(sortie, 'planche-' + String(de).padStart(2, '0') + '.png');
      const url = `http://127.0.0.1:${port}/tests/rendu.html?de=${de}&a=${de + 12}&l=400&h=260`;
      try {
        await new Promise((ok, ko) => execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
          '--window-size=1300,1050', '--virtual-time-budget=6000', '--screenshot=' + png, url], { timeout: 60000 },
          (err) => (err ? ko(err) : ok())));
        console.log('capture :', png);
      } catch (e) { console.log('échec : planche', de, e.message); }
    }
    serveur.close();
  })();
});
