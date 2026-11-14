// tests/verifier-ergonomie.mjs — contrôle rejouable de jsMecaVidéo dans Chrome sans écran
//
//   node tests/verifier-ergonomie.mjs [--sortie DOSSIER]
//
// Sert l'app avec un petit serveur local (requêtes Range gérées), puis vérifie :
//  1. six tailles de fenêtre : pas de défilement, part de la fenêtre occupée par l'image,
//     proportions de la vidéo respectées (captures dans le dossier de sortie) ;
//  2. parcours complet : étalonnage au doigt (« 80 cm ») → 10 points → graphiques →
//     retour au pointage avec les 10 points ; mesures identiques à celles de l'ancienne
//     version pour le même pointage ; format du CSV ;
//  3. un point posé au même endroit de la vidéo donne les mêmes coordonnées vidéo à deux
//     tailles de fenêtre ; la marque affichée tombe sur l'endroit pointé (moins de 1 px) ;
//  4. rotation pendant qu'un doigt est posé : geste annulé, aucun point ;
//  5. lecture des longueurs (80 cm, 0,8, 0.8 m, 800 mm…) ;
//  6. confirmation avant d'effacer (changement de vidéo), clavier, double-clic, remplacement ;
//  7. compatibilité avec browser-check.mjs du site (3 clics → 3 points, la vidéo avance) ;
//  8. webcam simulée (caméra factice de Chrome) : enregistrer, pointer ;
//  9. aucune erreur dans la console, aucune requête hors de l'origine locale.
// Le script n'est pas nécessaire au fonctionnement de l'app.

import path from 'node:path';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {servir, lancerChrome, ouvrirOnglet, ev, jusqua, pause, capture, redimensionner, clic, toucher,
  doigtPose, doigtGlisse, doigtLeve, touche, fermer} from './cdp.mjs';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iSortie = process.argv.indexOf('--sortie');
const SORTIE = iSortie > 0 ? process.argv[iSortie + 1] : mkdtempSync(path.join(tmpdir(), 'jsmeca-captures-'));
mkdirSync(SORTIE, {recursive: true});

// --seulement 2,6 : ne lancer que certaines parties
const iSeul = process.argv.indexOf('--seulement');
const PARTIES = iSeul > 0 ? process.argv[iSeul + 1].split(',').map(Number) : null;
let partiesLancees = 0;
const partie = (n) => {
  if (PARTIES && !PARTIES.includes(n)) return false;
  if (partiesLancees++ > 0) { c.quit(); c = lancerChrome(); }
  return true;
};
const echecs = [];
const rapport = {tailles: [], verifications: []};
function verifier(nom, ok, detail) {
  rapport.verifications.push({nom, ok: !!ok, detail});
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail) : ''));
  if (!ok) echecs.push(nom);
}

const VIDEO_TABLE = 'videos/TableHorizRectiligneUniforme_631g7.mp4';
// Mesures de l'ancienne version (commit fc875fe) pour le même pointage (voir README) :
// d = 0,0671 m et v = 0,336 m/s sur chaque intervalle, Δt = 0,200 s
const AVANT = {d: 0.0671, v: 0.336, duree: 0.2};

// Choisit une vidéo par son chemin (événement change, comme l'élève)
const choisirVideo = (o, chemin) => ev(o, `(()=>{const i=videoFiles.findIndex(v=>v.path===${JSON.stringify(chemin)});const s=document.getElementById('choix-video');s.value=String(i);s.dispatchEvent(new Event('change'));return i;})()`);
const pret = (o) => jusqua(o, `lecteur() && lecteur().isLoaded && lecteur().dims() && !lecteur().enDeplacement && width>50 && Math.abs(width/height-dimensionsSource().w/dimensionsSource().h)<0.01`);
// Position à l'écran d'un point de la vidéo (pixels vidéo, y vers le bas)
const ecranDe = (o, vx, vy) => ev(o, `(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),s=dimensionsSource();return {x:r.left+${vx}*r.width/s.w,y:r.top+${vy}*r.height/s.h};})()`);
const choisir = (o, id, valeur) => ev(o, `(()=>{const s=document.getElementById(${JSON.stringify(id)});s.value=${JSON.stringify(String(valeur))};s.dispatchEvent(new Event('change'));})()`);
const journalPropre = (o, nom) => {
  const origine = new URL(o.base).origin;
  const externes = o.journal.requetes.filter(u => !u.startsWith(origine) && !u.startsWith('blob:' + origine) && !u.startsWith('data:'));
  verifier(nom + ' : aucune erreur console', o.journal.erreurs.length === 0 && o.journal.console.length === 0, [...o.journal.erreurs, ...o.journal.console].slice(0, 5));
  verifier(nom + ' : aucune requête hors origine, aucun échec', externes.length === 0 && o.journal.echecs.length === 0, [...externes, ...o.journal.echecs].slice(0, 5));
};

const srv = await servir(RACINE);
// Un Chrome neuf pour chaque partie : après une vingtaine d'onglets, Chrome sans écran
// finit parfois par ne plus répondre à la création d'un onglet
let c = lancerChrome();
const page = srv.base + '/index.html';
async function onglet(w, h, options) {
  const o = await ouvrirOnglet(c, page, w, h, options);
  o.base = srv.base;
  await pret(o);
  return o;
}

try {
  // ------------------------------------------------------------------ 1. Tailles
  if (partie(1)) {
  console.log('1. Tailles de fenêtre');
  for (const [w, h, tactile] of [[360, 640, true], [768, 1024, true], [1024, 768, true], [1024, 664, true], [1366, 768, false], [1920, 1080, false]]) {
    const o = await onglet(w, h, {tactile});
    await pause(300);
    const mesure = () => ev(o, `(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),s=dimensionsSource();
      return {canevas:Math.round(r.width)+'×'+Math.round(r.height),part:Math.round(1000*r.width*r.height/(innerWidth*innerHeight))/10,
        defilement:document.documentElement.scrollHeight>innerHeight+1||document.documentElement.scrollWidth>innerWidth+1||document.body.scrollHeight>innerHeight+1,
        proportions:Math.abs(r.width/r.height-s.w/s.h)<0.01,dansFenetre:r.bottom<=innerHeight+0.5&&r.right<=innerWidth+0.5,
        memoire:document.querySelector('canvas').width+'×'+document.querySelector('canvas').height};})()`);
    const ouvert = await mesure();
    await capture(o, path.join(SORTIE, `taille-${w}x${h}-guide-ouvert.png`));
    // Premier point : sur écran étroit, le guide se replie
    const p = await ecranDe(o, 200, 160);
    if (tactile) await toucher(o, p.x, p.y); else await clic(o, p.x, p.y);
    await pause(500);
    const apres = await mesure();
    await capture(o, path.join(SORTIE, `taille-${w}x${h}-apres-1-point.png`));
    const objectif = w === 360 ? 40 : 50;
    rapport.tailles.push({taille: w + '×' + h, tactile, guideOuvert: ouvert, apresPremierPoint: apres});
    verifier(`${w}×${h} : pas de défilement, image entière et aux proportions de la vidéo`, !ouvert.defilement && !apres.defilement && ouvert.proportions && ouvert.dansFenetre, {ouvert, apres});
    verifier(`${w}×${h} : image ≥ ${objectif} % de la fenêtre`, apres.part >= objectif && ouvert.part >= objectif, [ouvert.part, apres.part]);
    journalPropre(o, `${w}×${h}`);
    await fermer(o);
  }

  }
  // ------------------------------------------------------------------ 2. Parcours complet
  if (partie(2)) {
  console.log('2. Parcours : étalonnage → 10 points → graphiques → retour');
  {
    const o = await onglet(1024, 768, {tactile: true});
    await choisirVideo(o, VIDEO_TABLE);
    await pause(200);
    await pret(o);
    await jusqua(o, `dimensionsSource().w===352`);
    // Étalonnage au doigt : deux toucher avec glissement (loupe), sur la règle
    await choisir(o, 'choix-mode', 'Calibration');
    await pause(200);
    for (const [vx, vy] of [[40.5, 230.25], [306.5, 230.25]]) {
      const a = await ecranDe(o, vx - 6, vy + 4), b = await ecranDe(o, vx, vy);
      await doigtPose(o, a.x, a.y); await pause(60);
      await doigtGlisse(o, (a.x + b.x) / 2, (a.y + b.y) / 2); await pause(60);
      await doigtGlisse(o, b.x, b.y); await pause(120);
      if (vx === 40.5) await capture(o, path.join(SORTIE, 'parcours-01-etalonnage-loupe.png'));
      await doigtLeve(o); await pause(150);
    }
    const champActif = await ev(o, `!document.getElementById('real-distance').disabled && document.getElementById('real-distance').value===''`);
    verifier('étalonnage : champ de longueur actif et vide après le 2e point', champActif);
    await ev(o, `(()=>{const s=document.getElementById('real-distance');s.value='80 cm';s.dispatchEvent(new Event('input'));})()`);
    const apercu = await ev(o, `document.getElementById('calibration-message').textContent`);
    await capture(o, path.join(SORTIE, 'parcours-02-saisie-80cm.png'));
    await ev(o, `document.getElementById('validate-calibration').click()`);
    const etal = await ev(o, `({echelle:data.echelle, px:calibrator.pixelDistance, passer:!document.getElementById('passer-pointage').hidden, msg:document.getElementById('calibration-message').textContent})`);
    verifier('« 80 cm » accepté, conversion affichée, échelle = 0,8 m / 266 px vidéo', /0,80? m/.test(apercu) && Math.abs(etal.echelle * 266 / 0.8 - 1) < 1e-5 && etal.passer, {apercu, ...etal});
    await capture(o, path.join(SORTIE, 'parcours-03-etalonnage-valide.png'));
    // Erreur de saisie visible (et pas écrasée par le dessin)
    await ev(o, `(()=>{const s=document.getElementById('real-distance');s.value='quatre-vingts';document.getElementById('validate-calibration').click();})()`);
    await pause(500);
    const erreur = await ev(o, `({classe:document.getElementById('real-distance').classList.contains('erreur'),msg:document.getElementById('calibration-message').textContent,echelle:data.echelle})`);
    verifier('saisie invalide : erreur visible qui reste, échelle inchangée', erreur.classe && /comprends pas/.test(erreur.msg) && Math.abs(erreur.echelle * 266 / 0.8 - 1) < 1e-5, erreur);
    await capture(o, path.join(SORTIE, 'parcours-04-erreur-saisie.png'));
    await ev(o, `(()=>{const s=document.getElementById('real-distance');s.value='80 cm';s.dispatchEvent(new Event('input'));})()`);
    // Passer au pointage, 1 image sur 5, 10 points à la souris
    await ev(o, `document.getElementById('passer-pointage').click()`);
    await choisir(o, 'choix-pas', 5);
    await pret(o);
    for (let k = 0; k < 10; k++) {
      await jusqua(o, `lecteur().pret()`);
      const p = await ecranDe(o, 60 + 22.3 * k, 150.4 + 0.7 * k);
      await clic(o, p.x, p.y);
      await pause(300); // plus de 250 ms : sinon c'est un double-clic, ignoré
    }
    await jusqua(o, `lecteur().pret()`);
    await capture(o, path.join(SORTIE, 'parcours-05-dix-points.png'));
    const mesures = await ev(o, `({n:data.getTotalPointCount(), iv:data.getIntervalles(0), images:data.points[0].map(p=>p.image), pts:data.points[0], image:lecteur().image})`);
    const dOk = mesures.iv.length === 9 && mesures.iv.every(iv => Math.abs(iv.d - AVANT.d) < 0.0006 && Math.abs(iv.v - AVANT.v) < 0.003 && Math.abs(iv.duree - AVANT.duree) < 1e-9);
    verifier('10 points, images 0, 5, 10… (pas de 5)', mesures.n === 10 && mesures.images.join() === '0,5,10,15,20,25,30,35,40,45', mesures.images);
    verifier('mesures identiques à l’ancienne version (d = 0,0671 m, v = 0,336 m/s, Δt = 0,200 s)', dOk, mesures.iv.slice(0, 2));
    // Chrome transmet des positions de souris entières (pixels CSS) : écart toléré = 1 px d'écran
    const unPxEcran = await ev(o, `dimensionsSource().w/width`);
    const precision = mesures.pts.map((p, k) => Math.max(Math.abs(p.xpx - (60 + 22.3 * k)), Math.abs(p.ypx - (288 - 150.4 - 0.7 * k))));
    verifier('points enregistrés en pixels vidéo (à 1 px d’écran près), y vers le haut', Math.max(...precision) <= unPxEcran, {ecartMax: Math.max(...precision), unPxEcran});
    // CSV
    const csv = await ev(o, `construireCSV()`);
    const lignes = csv.split('\r\n');
    verifier('CSV : CRLF, point-virgule, virgule décimale, 1 ligne par point', csv.endsWith('\r\n') && lignes.filter(l => /^1;\d+;/.test(l)).length === 10 && !/\d\.\d/.test(lignes.slice(2).join('')), lignes.slice(0, 5));
    writeFileSync(path.join(SORTIE, 'mesures.csv'), '\uFEFF' + csv);
    // Même pointage exact que la mesure « avant » (positions vidéo données sans arrondi d'écran)
    const exact = await ev(o, `(()=>{const sauve=JSON.stringify(data.serialiser());data.clearAllPoints();for(let k=0;k<10;k++){data.placer(0,5*k,60+22.3*k,288-(150.4+0.7*k));}
      const r={csv:construireCSV()};data.restaurer(JSON.parse(sauve));return r;})()`);
    const colonnes = exact.csv.split('\r\n').filter(l => /^1;\d+;/.test(l)).map(l => l.split(';').slice(-3).join(';'));
    verifier('pointage exact identique : colonnes d ; Δt ; v du CSV = ancienne version (0,0671 ; 0,200 ; 0,336)', colonnes.slice(1).every(c => c === '0,0671;0,200;0,336'), colonnes.slice(0, 3));
    rapport.csvExact = exact.csv;
    // Graphiques puis retour
    await choisir(o, 'choix-mode', 'Graphique');
    await pause(400);
    const g = await ev(o, `({chart:!!graph.chart, titre:document.getElementById('graph-titre').textContent, resume:document.getElementById('acceleration-info').textContent})`);
    await capture(o, path.join(SORTIE, 'parcours-06-graphique-trajectoire.png'));
    await choisir(o, 'choix-type-graphique', 'ecarts');
    await pause(300);
    await capture(o, path.join(SORTIE, 'parcours-07-graphique-ecarts.png'));
    const ticks = await ev(o, `graph.chart.scales.y.ticks.map(t=>t.label)`);
    verifier('graphiques : affichés, graduations sans doublon ni « -0 »', g.chart && new Set(ticks).size === ticks.length && !ticks.some(t => /^-0(,0*)?$/.test(t)), {titre: g.titre, ticks});
    await choisir(o, 'choix-mode', 'Pointage');
    await pause(300);
    await jusqua(o, `lecteur().pret()`);
    const retour = await ev(o, `({n:data.getTotalPointCount(), image:lecteur().image, echelle:data.echelle})`);
    verifier('retour au pointage : 10 points et étalonnage gardés, reprise à l’image suivante (50)', retour.n === 10 && retour.image === 50 && retour.echelle > 0, retour);
    // Annuler revient à l'image du point retiré
    await ev(o, `document.getElementById('bouton-annuler').click()`);
    await jusqua(o, `lecteur().pret()`);
    const annule = await ev(o, `({n:data.getTotalPointCount(), image:lecteur().image})`);
    verifier('Annuler : 9 points, retour à l’image 45', annule.n === 9 && annule.image === 45, annule);
    // Réouvrir l'étalonnage ne l'efface pas
    await choisir(o, 'choix-mode', 'Calibration');
    await pause(300);
    const reouvert = await ev(o, `({etat:calibrator.state, msg:document.getElementById('calibration-message').textContent, valeur:document.getElementById('real-distance').value})`);
    verifier('réouvrir l’étalonnage : segment et échelle gardés', reouvert.etat === 'calibrated' && /Échelle actuelle/.test(reouvert.msg), reouvert);
    await capture(o, path.join(SORTIE, 'parcours-08-etalonnage-rouvert.png'));
    await choisir(o, 'choix-mode', 'Pointage');
    // Changer de vidéo : confirmation ; refuser garde tout
    await choisirVideo(o, 'videos/chute.mp4');
    await pause(200);
    const conf = await ev(o, `({visible:!document.getElementById('confirmation').hidden, texte:document.getElementById('confirmation-texte').textContent})`);
    await capture(o, path.join(SORTIE, 'parcours-09-confirmation.png'));
    await ev(o, `document.getElementById('confirmation-non').click()`);
    const garde = await ev(o, `({n:data.getTotalPointCount(), menu:document.getElementById('choix-video').value, src:lecteur().chemin})`);
    verifier('changer de vidéo : confirmation ; « Garder » rétablit le menu et les points', conf.visible && garde.n === 9 && garde.src === VIDEO_TABLE && garde.menu === '0', {conf, garde});
    journalPropre(o, 'parcours');
    await fermer(o);
  }

  }
  // ------------------------------------------------------------------ 3. Même point, deux tailles
  if (partie(3)) {
  console.log('3. Même endroit de la vidéo à deux tailles, exactitude de l’affichage');
  {
    const resultats = [];
    for (const [w, h] of [[1024, 768], [1920, 1080], [768, 1024]]) {
      const o = await onglet(w, h);
      await choisirVideo(o, VIDEO_TABLE);
      await pause(200);
      await pret(o);
      await jusqua(o, `dimensionsSource().w===352`);
      // Centre de la tache rouge du mobile, mesuré sur l'image native de la vidéo…
      const centre = await ev(o, `(()=>{const v=videoPlayer.elt,c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');x.drawImage(v,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let sx=0,sy=0,n=0;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(r>140&&r-g>60&&r-b>60){const p=i/4;sx+=p%c.width;sy+=Math.floor(p/c.width);n++;}}return {x:sx/n+0.5,y:sy/n+0.5,n};})()`);
      // … et sur l'image affichée (mémoire du canevas), convertie en pixels vidéo
      const affiche = await ev(o, `(()=>{const c=document.querySelector('canvas'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data,s=dimensionsSource();let sx=0,sy=0,n=0;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(r>140&&r-g>60&&r-b>60){const p=i/4;sx+=p%c.width;sy+=Math.floor(p/c.width);n++;}}return {x:(sx/n+0.5)*s.w/c.width,y:(sy/n+0.5)*s.h/c.height,n};})()`);
      const p = await ecranDe(o, centre.x, centre.y);
      await clic(o, p.x, p.y);
      await pause(300);
      const pt = await ev(o, `(()=>{const p=data.points[0][0]||{xpx:NaN,ypx:NaN};return {x:p.xpx,y:dimensionsSource().h-p.ypx};})()`);
      const conversion = await ev(o, `(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),s=dimensionsSource();let e=0;
        for(const [vx,vy] of [[41.77,145.78],[0,0],[351.5,287.5],[123.456,78.9]]){const p=coordonneesCanvas(c,r.left+vx*r.width/s.w,r.top+vy*r.height/s.h),v=versVideo(p.x,p.y);e=Math.max(e,Math.abs(v.x-vx),Math.abs(v.y-vy));}return e;})()`);
      const unPx = await ev(o, `dimensionsSource().w/width`);
      resultats.push({taille: w + '×' + h, centre, affiche, point: pt, conversion, unPx});
      await capture(o, path.join(SORTIE, `exactitude-${w}x${h}.png`));
      journalPropre(o, 'exactitude ' + w + '×' + h);
      await fermer(o);
    }
    const ecart = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    // Chrome arrondit la position de la souris au pixel d'écran : tolérance = 1 px d'écran
    const tol = Math.max(...resultats.map(r => r.unPx));
    const memes = resultats.every(r => ecart(r.point, resultats[0].point) <= tol);
    verifier('même endroit cliqué → mêmes coordonnées vidéo aux trois tailles (à 1 px d’écran près)', memes, {tol, points: resultats.map(r => [r.taille, r.point.x.toFixed(3), r.point.y.toFixed(3)])});
    verifier('conversion écran → vidéo exacte à toutes les tailles (sans arrondi de la souris)', resultats.every(r => r.conversion < 1e-6), resultats.map(r => r.conversion));
    verifier('l’image affichée est calée sur le repère vidéo : tache rouge à moins de 1 px', resultats.every(r => ecart(r.affiche, r.centre) < 1), resultats.map(r => [r.taille, ecart(r.affiche, r.centre).toFixed(2)]));
    rapport.exactitude = resultats;
  }

  }
  // ------------------------------------------------------------------ 4. Rotation pendant un geste
  if (partie(4)) {
  console.log('4. Rotation avec un doigt posé');
  {
    const o = await onglet(1024, 768, {tactile: true});
    const a = await ecranDe(o, 200, 150);
    await doigtPose(o, a.x, a.y);
    await pause(150);
    await redimensionner(o, 768, 1024, {tactile: true});
    await pause(500);
    const msg = await ev(o, `document.getElementById('instructions').textContent`);
    await capture(o, path.join(SORTIE, 'rotation-pendant-geste.png'));
    await doigtLeve(o);
    await pause(300);
    const n = await ev(o, `data.getTotalPointCount()`);
    verifier('rotation pendant le geste : message, aucun point enregistré', n === 0 && /changé de taille/.test(msg), {n, msg});
    // Après rotation, un toucher normal marche
    await pret(o);
    const b = await ecranDe(o, 200, 150);
    await toucher(o, b.x, b.y);
    await pause(400);
    const pt = await ev(o, `data.points[0][0] && {x:data.points[0][0].xpx, y:dimensionsSource().h-data.points[0][0].ypx}`);
    verifier('après la rotation, le toucher pointe au bon endroit', pt && Math.abs(pt.x - 200) < 0.6 && Math.abs(pt.y - 150) < 0.6, pt);
    journalPropre(o, 'rotation');
    await fermer(o);
  }

  }
  // ------------------------------------------------------------------ 5. Lecture des longueurs
  if (partie(5)) {
  console.log('5. Saisie des longueurs');
  {
    const o = await onglet(1024, 768);
    const cas = await ev(o, `['80 cm','0,8','0.8 m','800 mm','1,85m','80cm',' 0,80 m ','12 centimètres','abc','0','-3','', '1,2,3'].map(t=>[t,lireLongueur(t).metres??null])`);
    const attendu = [0.8, 0.8, 0.8, 0.8, 1.85, 0.8, 0.8, 0.12, null, null, null, null, null];
    verifier('« 80 cm », « 0,8 », « 0.8 m », « 800 mm »… acceptés ; « abc », « 0 », vide refusés', cas.every((c, i) => attendu[i] === null ? c[1] === null : Math.abs(c[1] - attendu[i]) < 1e-12), cas);
    await fermer(o);
  }

  }
  // ------------------------------------------------------------------ 6. Clavier, double-clic, remplacement, fin de vidéo
  if (partie(6)) {
  console.log('6. Clavier, double-clic, remplacement, fin de vidéo');
  {
    const o = await onglet(1366, 768);
    await ev(o, `document.querySelector('canvas').focus()`);
    await touche(o, 'ArrowRight', 'ArrowRight', 39);
    for (let i = 0; i < 5; i++) await touche(o, 'ArrowRight', 'ArrowRight', 39);
    await touche(o, 'Enter', 'Enter', 13);
    await pause(400);
    const k1 = await ev(o, `({n:data.getTotalPointCount(), p:data.points[0][0], s:dimensionsSource(), image:lecteur().image})`);
    verifier('clavier : flèches puis Entrée pointent (centre + 5 px), la vidéo avance', k1.n === 1 && Math.abs(k1.p.xpx - (k1.s.w / 2 + 5)) < 1e-6 && k1.image === 1, k1);
    await capture(o, path.join(SORTIE, 'clavier-reticule.png'));
    await touche(o, 'Backspace', 'Backspace', 8);
    await pause(300);
    verifier('clavier : Retour arrière annule', await ev(o, `data.getTotalPointCount()===0 && lecteur().image===0`));
    await ev(o, `document.querySelector('canvas').blur()`);
    await touche(o, 'ArrowRight', 'ArrowRight', 39);
    await pause(300);
    verifier('clavier hors image : → passe à l’image suivante', await ev(o, `lecteur().image===1`));
    await touche(o, 'Home', 'Home', 36);
    await pause(300);
    // Double-clic : un seul point
    const p = await ecranDe(o, 100, 100);
    await o.c.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: p.x, y: p.y}, o.s);
    for (const n of [1, 2]) {
      await o.c.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: n}, o.s);
      await o.c.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: n}, o.s);
    }
    await pause(400);
    verifier('double-clic : un seul point', await ev(o, `data.getTotalPointCount()===1`));
    // Revenir sur l'image 0 et pointer : le point est remplacé
    await ev(o, `lecteur().allerImage(0)`);
    await jusqua(o, `lecteur().pret()`);
    const q = await ecranDe(o, 120, 110);
    await clic(o, q.x, q.y);
    await pause(400);
    const rempl = await ev(o, `({n:data.getTotalPointCount(), x:data.points[0][0].xpx, msg:document.getElementById('instructions').textContent})`);
    verifier('pointer une image déjà pointée remplace son point', rempl.n === 1 && Math.abs(rempl.x - 120) < 0.5 && /remplacé/.test(rempl.msg), rempl);
    // Fin de la vidéo : pas d'intervalle plus court, message et bouton « Voir les graphiques »
    await choisir(o, 'choix-pas', 5);
    await ev(o, `lecteur().allerImage(15)`);
    await jusqua(o, `lecteur().pret()`);
    for (let i = 0; i < 1; i++) {
      await jusqua(o, `lecteur().pret()`);
      const r = await ecranDe(o, 150 + i * 10, 150);
      await clic(o, r.x, r.y);
      await pause(350);
    }
    const fin = await ev(o, `({images:data.points[0].map(p=>p.image), image:lecteur().image, voir:!document.getElementById('bouton-voir-graphiques').hidden, msg:document.getElementById('instructions').textContent})`);
    verifier('fin de vidéo : pas de point au-delà, message et bouton « Voir les graphiques »', fin.voir && /Fin de la vidéo/.test(fin.msg) && fin.images.join() === '0,15', fin);
    await capture(o, path.join(SORTIE, 'fin-de-video.png'));
    journalPropre(o, 'clavier');
    await fermer(o);
  }

  }
  // ------------------------------------------------------------------ 7. Comme browser-check.mjs du site
  if (partie(7)) {
  console.log('7. Compatibilité avec browser-check.mjs');
  {
    const o = await onglet(1280, 1000);
    await jusqua(o, `(()=>{const v=document.querySelector('video');return !!v&&v.readyState>=2;})()`);
    const spot = await ev(o, `(()=>{const c=document.querySelector('canvas').getBoundingClientRect();return {x:c.left+c.width/2,y:c.top+120};})()`);
    for (let i = 0; i < 3; i++) {
      await clic(o, spot.x + i * 12, spot.y);
      await pause(400);
    }
    const r = await ev(o, `({points:data.getTotalPointCount(), time:videoPlayer.video.time()})`);
    verifier('3 clics → 3 points, la vidéo avance (videoPlayer.video.time() > 0)', r.points === 3 && r.time > 0, r);
    await fermer(o);
    const t = await onglet(1024, 768, {tactile: true});
    const s = await ev(t, `(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+Math.min(r.height/2,140)};})()`);
    await toucher(t, s.x, s.y);
    await pause(400);
    verifier('toucher en 1024×768 → 1 point', await ev(t, `data.getTotalPointCount()===1`));
    await fermer(t);
  }

  }
  // ------------------------------------------------------------------ 8. Webcam simulée
  if (partie(8)) {
  console.log('8. Webcam (caméra factice de Chrome)');
  {
    const o = await onglet(1024, 768);
    const propose = await ev(o, `!!document.querySelector('#choix-video option[value="webcam"]')`);
    await ev(o, `(()=>{const s=document.getElementById('choix-video');s.value='webcam';s.dispatchEvent(new Event('change'));})()`);
    await jusqua(o, `webcamPlayer && webcamPlayer.isLoaded`);
    await ev(o, `webcamPlayer.toggleRecording()`);
    await pause(1200);
    await ev(o, `webcamPlayer.toggleRecording()`);
    await jusqua(o, `webcamPlayer.isRecorded`);
    await pause(300);
    const p = await ecranDe(o, 100, 100);
    await clic(o, p.x, p.y);
    await pause(300);
    const w = await ev(o, `({images:webcamPlayer.images.length, n:data.getTotalPointCount(), image:webcamPlayer.image, dims:dimensionsSource()})`);
    await capture(o, path.join(SORTIE, 'webcam.png'));
    verifier('webcam : proposée en localhost, enregistrement, pointage, avance d’une image', propose && w.images > 5 && w.n === 1 && w.image === 1, w);
    journalPropre(o, 'webcam');
    await fermer(o);
  }
  }
} catch (e) {
  console.error(e);
  echecs.push('exception : ' + e.message);
} finally {
  c.quit();
  await srv.close();
}

writeFileSync(path.join(SORTIE, 'rapport.json'), JSON.stringify(rapport, null, 2));
console.log('\nTailles :');
console.table(rapport.tailles.map(t => ({taille: t.taille, tactile: t.tactile, 'canevas (guide ouvert)': t.guideOuvert.canevas, '% ouvert': t.guideOuvert.part,
  'canevas (après 1 point)': t.apresPremierPoint.canevas, '% après': t.apresPremierPoint.part, 'mémoire': t.apresPremierPoint.memoire})));
console.log('Captures et rapport : ' + SORTIE);
console.log(echecs.length ? '\n' + echecs.length + ' échec(s) : ' + echecs.join(' | ') : '\nTout est vérifié.');
process.exit(echecs.length ? 1 : 0);
