// tests/verifier-referentiel.mjs — contrôles rejouables du choix du référentiel (jsMecaVidéo)
//
//   node tests/verifier-referentiel.mjs [--sortie DOSSIER] [--seulement 1,4,…]
//
// Étape Graphiques, menu « Mouvement par rapport à » : l'image de la vidéo (défaut) ou un des
// mobiles pointés. Même outillage que verifier-ergonomie.mjs (Chrome sans écran, protocole
// DevTools, aucune dépendance npm). Parties :
//   1. exactitude : positions relatives = position(m, k) − position(R, k) aux seules images où
//      m et R sont pointés, recalculées ici en Node (calcul indépendant) ; d, Δt, v ; numéros de
//      points et alerte « durées Δt inégales » quand des images manquent ; cohérence graphique
//      (données, barres, infobulles, résumé) / tableau / fichier CSV ; titres, axes, en-têtes ;
//   2. référentiel par défaut inchangé : mêmes graphiques, tableau et fichier que la version
//      d'avant (HEAD, extraite par git), avec 1 et 2 mobiles, et après un aller-retour du menu ;
//   3. cas limites : aucun instant commun, pas assez de points communs, « Tous les mobiles »,
//      mobile affiché = référence, nombre de mobiles changé, nouvelle vidéo, menu caché à 1 mobile ;
//   4. reprise après rechargement (sessionStorage), sauvegardes incohérentes refusées, ancienne
//      sauvegarde (sans référentiel) acceptée ;
//   5. affichage à 360×640 (tactile), 1024×768 (tactile) et 1366×768 : pointage au doigt ou à la
//      souris de deux mobiles, menu choisi par l'interface ; rien ne déborde, cibles ≥ 44 px, et
//      l'image a la même taille et la même place aux étapes Pointer et Étalonner, avant et après
//      le choix du référentiel.
// Le script n'est pas nécessaire au fonctionnement de l'app.

import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {servir, lancerChrome, ouvrirOnglet, ev, jusqua, pause, capture, clic, toucher, fermer} from './cdp.mjs';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iSortie = process.argv.indexOf('--sortie');
const SORTIE = iSortie > 0 ? process.argv[iSortie + 1] : mkdtempSync(path.join(tmpdir(), 'jsmeca-referentiel-'));
mkdirSync(SORTIE, {recursive: true});
const iSeul = process.argv.indexOf('--seulement');
const PARTIES = iSeul > 0 ? process.argv[iSeul + 1].split(',').map(Number) : null;

const echecs = [];
let nbOk = 0;
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 600) : ''));
  if (ok) nbOk++; else echecs.push(nom);
}

const CHUTE = 'videos/chute.mp4';
const MOTO = 'videos/moto-relatif.mp4';

const srv = await servir(RACINE);
let c = lancerChrome();
let partiesLancees = 0;
const partie = (n, titre) => {
  if (PARTIES && !PARTIES.includes(n)) return false;
  if (partiesLancees++ > 0) { c.quit(); c = lancerChrome(); }
  console.log(n + '. ' + titre);
  return true;
};

const pret = (o) => jusqua(o, `lecteur() && lecteur().isLoaded && lecteur().dims() && !lecteur().enDeplacement && width>50 && Math.abs(width/height-dimensionsSource().w/dimensionsSource().h)<0.01`);
const choisir = (o, id, valeur) => ev(o, `(()=>{const s=document.getElementById(${JSON.stringify(id)});s.value=${JSON.stringify(String(valeur))};s.dispatchEvent(new Event('change'));})()`);
const repondre = async (o, quoi) => { await pause(450); await ev(o, `document.getElementById('confirmation-${quoi}').click()`); };
const ecranDe = (o, vx, vy) => ev(o, `(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),s=dimensionsSource();return {x:r.left+${vx}*r.width/s.w,y:r.top+${vy}*r.height/s.h};})()`);
const rectCanevas = (o) => ev(o, `(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(v=>Math.round(v*10)/10).join(',');})()`);
// Change le nombre de mobiles (et confirme l'effacement des points) ; attend que ce soit fait.
// La question ignore un toucher arrivé moins de 400 ms après son affichage : on réessaie.
const changerMobiles = async (o, n) => {
  await choisir(o, 'choix-mobiles', n); await pause(200);
  for (let i = 0; i < 10 && await ev(o, `data.numMobiles!==${n}`); i++) {
    if (await ev(o, `!document.getElementById('confirmation').hidden`)) await repondre(o, 'oui'); else await pause(200);
  }
  await jusqua(o, `data.numMobiles===${n}`);
};
const choisirVideo = async (o, chemin) => {
  await ev(o, `(()=>{const i=videoFiles.findIndex(v=>v.path===${JSON.stringify(chemin)});const s=document.getElementById('choix-video');s.value=String(i);s.dispatchEvent(new Event('change'));})()`);
  await pause(300);
  if (await ev(o, `!document.getElementById('confirmation').hidden`)) await repondre(o, 'oui');
  await jusqua(o, `lecteur().chemin===${JSON.stringify(chemin)}`);
  await pret(o);
};
const journalPropre = (o, nom) => {
  const origine = new URL(o.base).origin;
  const externes = o.journal.requetes.filter(u => !u.startsWith(origine) && !u.startsWith('blob:' + origine) && !u.startsWith('data:') && u !== 'about:blank');
  verifier(nom + ' : aucune erreur console, aucune requête hors origine, aucun échec', o.journal.erreurs.length === 0 && o.journal.console.length === 0 &&
    externes.length === 0 && o.journal.echecs.length === 0, [...o.journal.erreurs, ...o.journal.console, ...externes, ...o.journal.echecs].slice(0, 5));
};
async function onglet(w, h, options = {}) {
  const base = options.base || srv.base;
  const o = await ouvrirOnglet(c, base + '/index.html', w, h, options);
  o.base = base;
  await pret(o);
  return o;
}

// ---------------------------------------------------------------- Scénario de référence
// Étalonnage : deux bouts à 193,25 px vidéo l'un de l'autre, longueur 1,85 m
const ETAL = [[270.25, 305.5], [270.25, 112.25]];
const ECHELLE = 1.85 / 193.25;
// Mobile 1 (référence) : images 0 à 9 sauf 8 ; mobile 2 : sauf 3 et 6 ; mobile 3 : toutes.
// Positions en pixels vidéo, y vers le haut (comme data.placer)
const IMAGES = [[0, 1, 2, 3, 4, 5, 6, 7, 9], [0, 1, 2, 4, 5, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]];
const POS = [
  k => [100 + 12 * k, 50 + 3 * k + 0.37 * k * k],
  k => [130 + 20 * k + 0.5 * k * k, 200 - 2.1 * k * k],
  k => [300 - 9.3 * k, 150 + 4.4 * k]
];
const placerTout = (n) => IMAGES.slice(0, n).map((imgs, m) => imgs.map(k => `data.placer(${m},${k},${POS[m](k)[0]},${POS[m](k)[1]});`).join('')).join('');
// Étalonne (comme le ferait l'élève, sans passer par l'écran) puis revient au pointage
const etalonner = async (o) => {
  await ev(o, `passerAuMode('Calibration')`); await pause(200);
  for (const [vx, vy] of ETAL) await ev(o, `traiterPointage(${vx},${vy})`);
  await ev(o, `(()=>{const s=document.getElementById('real-distance');s.value='1,85 m';document.getElementById('validate-calibration').click();})()`);
  await ev(o, `passerAuMode('Pointage')`); await pret(o);
};
const preparer = async (o, nbMobiles) => {
  if (nbMobiles > 1) await choisir(o, 'choix-mobiles', nbMobiles);
  await etalonner(o);
  await ev(o, placerTout(nbMobiles));
};

// Calcul indépendant (Node) : positions relatives de m par rapport à r, intervalles, vitesses
function attendu(m, r) {
  const dt = 1 / 25; // chute.mp4 : 25 images/s
  const lignes = [];
  IMAGES[m].forEach((k, i) => {
    if (r >= 0 && !IMAGES[r].includes(k)) return;
    const [x, y] = POS[m](k);
    const [xr, yr] = r >= 0 ? POS[r](k) : [0, 0];
    lignes.push({numero: i + 1, image: k, x: (x - xr) * ECHELLE, y: (y - yr) * ECHELLE});
  });
  const t0 = Math.min(...IMAGES.slice(0, 2).flat()); // premier point (toutes images confondues)
  lignes.forEach(l => { l.t = (l.image - t0) * dt; });
  for (let i = 1; i < lignes.length; i++) {
    const a = lignes[i - 1], b = lignes[i];
    b.d = Math.hypot(b.x - a.x, b.y - a.y);
    b.dt = b.t - a.t;
    b.v = b.d / b.dt;
    b.de = a.numero;
  }
  return lignes;
}
const nombre = s => parseFloat(String(s).replace(/[\s ]/g, '').replace(',', '.'));
// Valeur affichée = valeur exacte arrondie à `dec` décimales (à une demi-unité près)
const bienArrondi = (texte, exact, dec) => Math.abs(nombre(texte) - exact) <= 0.5 * Math.pow(10, -dec) + 1e-9;

// État complet de l'étape Graphiques, pour chaque type de graphique : titre, aide, alerte,
// texte sous le graphique, données et axes du graphique, infobulles, tableau ; et le fichier
const ETAT_GRAPHIQUES = `(()=>{const types=['y(x)','ecarts','vitesse','x(t)','y(t)','v(t)','vx(t)','vy(t)','a(t)','tableau'];const r={};
  const txt=id=>{const e=document.getElementById(id);return e.hidden?'':e.textContent;};
  for(const t of types){graph.choisirType(t);graph.updateChart();const c=graph.chart;
    const e={titre:txt('graph-titre'),aide:document.getElementById('graph-aide').textContent,alerte:txt('graph-alerte'),info:txt('acceleration-info')};
    if(c){const lbl=c.options.plugins.tooltip.callbacks.label;
      e.labels=c.data.labels||null;e.axes=[c.options.scales.x.title.text,c.options.scales.y.title.text];
      e.ds=c.data.datasets.map(d=>({label:d.label,data:d.data,style:d.pointStyle||null}));
      e.infobulles=c.data.datasets.map(d=>{const i=d.data.findIndex(p=>p!==null);if(i<0)return null;const p=d.data[i];
        return lbl({dataset:d,parsed:typeof p==='object'?{x:p.x,y:p.y}:{x:i,y:p}});});}
    if(t==='tableau'){e.entetes=[...document.querySelectorAll('#tableau-mesures thead th')].map(th=>th.textContent);
      e.lignes=[...document.querySelectorAll('#tableau-mesures tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent));
      e.alerteTableau=!!document.querySelector('#tableau-zone .alerte-durees');}
    r[t]=e;}
  r.csv=construireCSV();return r;})()`;

try {
  // ------------------------------------------------------------------ 1. Exactitude
  if (partie(1, 'Exactitude des positions relatives, images non communes, cohérence graphique / tableau / fichier')) {
    const o = await onglet(1366, 768);
    await preparer(o, 2);
    const echelle = await ev(o, `data.echelle`);
    verifier('étalonnage du scénario : échelle = 1,85 m / 193,25 px', Math.abs(echelle / ECHELLE - 1) < 1e-12, echelle);
    await ev(o, `passerAuMode('Graphique')`); await pause(300);
    const visible = await ev(o, `!document.getElementById('choix-referentiel').closest('label').hidden`);
    const options = await ev(o, `[...document.getElementById('choix-referentiel').options].map(x=>x.value+':'+x.textContent)`);
    verifier('menu « Mouvement par rapport à » visible avec 2 mobiles : l’image de la vidéo (choisie), Mobile 1 ×, Mobile 2 +', visible &&
      options.join('|') === '-1:l’image de la vidéo|0:Mobile 1 ×|1:Mobile 2 +' && await ev(o, `document.getElementById('choix-referentiel').value==='-1'`), options);
    await choisir(o, 'choix-referentiel', 0); await pause(200);
    // Valeurs exactes de l'app (avant arrondi) contre le calcul indépendant
    const app = await ev(o, `({pos:data.getPositions(1),iv:data.getIntervalles(1),ref:data.getPositions(0)})`);
    const A = attendu(1, 0);
    const ecartPos = Math.max(...A.map((a, i) => Math.max(Math.abs(app.pos[i].x - a.x), Math.abs(app.pos[i].y - a.y), Math.abs(app.pos[i].time - a.t))));
    verifier('positions relatives = position(mobile 2, k) − position(mobile 1, k), seulement aux images communes 0, 1, 2, 4, 5, 7, 9 (écart < 1e-12 m)',
      app.pos.length === 7 && app.pos.map(p => p.image).join() === '0,1,2,4,5,7,9' && ecartPos < 1e-12, {images: app.pos.map(p => p.image), ecartPos});
    verifier('numéros de points = numéros du mobile 2 sur l’image (1, 2, 3, 4, 5, 6, 8 : l’image 8 manque pour le mobile 1)', app.pos.map(p => p.numero).join() === '1,2,3,4,5,6,8', app.pos.map(p => p.numero));
    const ivA = A.slice(1);
    const ecartIv = Math.max(...ivA.map((a, i) => Math.max(Math.abs(app.iv[i].d - a.d), Math.abs(app.iv[i].duree - a.dt), Math.abs(app.iv[i].v - a.v))));
    verifier('d, Δt et v = d / Δt sur les intervalles 1→2, 2→3, 3→4, 4→5, 5→6, 6→8 (Δt de 0,04 s ou 0,08 s ; écart < 1e-12)', app.iv.length === 6 &&
      app.iv.map(iv => iv.de + '→' + iv.a).join() === '1→2,2→3,3→4,4→5,5→6,6→8' && ecartIv < 1e-12, {intervalles: app.iv.map(iv => iv.de + '→' + iv.a + ' ' + iv.duree.toFixed(2)), ecartIv});
    verifier('le mobile de référence n’a pas de position (il est l’origine)', app.ref.length === 0, app.ref.length);

    const E = await ev(o, ETAT_GRAPHIQUES);
    const f = await ev(o, `data.formats()`);
    // Titres, axes, en-têtes, fichier : par rapport à quoi
    const titresOk = Object.entries(E).filter(([k]) => k !== 'csv').every(([, e]) => e.titre.endsWith(' — par rapport au mobile 1 ×'));
    const axesOk = ['y(x)', 'x(t)', 'y(t)', 'ecarts', 'vitesse', 'v(t)', 'a(t)'].every(t => Array.isArray(E[t].axes[1]) && E[t].axes[1][1] === 'par rapport au mobile 1 ×') &&
      Array.isArray(E['y(x)'].axes[0]) && E['x(t)'].axes[0] === 'instant t (s)';
    verifier('titres de tous les graphiques et du tableau : « … — par rapport au mobile 1 × » ; axes des positions, distances, vitesses : 2e ligne « par rapport au mobile 1 × » ; axe du temps inchangé',
      titresOk && axesOk, {titre: E['y(x)'].titre, axes: E['y(x)'].axes, axesT: E['x(t)'].axes});
    const entetes = E.tableau.entetes;
    verifier('en-tête du tableau : Mobile, Point n°, Image n°, instant t (s), x par rapport au mobile 1 (m), y par rapport au mobile 1 (m), distance d … par rapport au mobile 1 (m), durée Δt … (s), v = d / Δt par rapport au mobile 1 (m/s)',
      entetes.join('|') === 'Mobile|Point n°|Image n°|instant t (s)|x par rapport au mobile 1 (m)|y par rapport au mobile 1 (m)|distance d depuis le point précédent par rapport au mobile 1 (m)|durée Δt depuis le point précédent (s)|v = d / Δt par rapport au mobile 1 (m/s)', entetes);
    const csv = E.csv.split('\r\n');
    verifier('fichier : 1re ligne « mesures par rapport au mobile 1 (référence : origine (0 ; 0), pas de ligne ; axes … de l’image …) » et « durées Δt INÉGALES »',
      /mesures par rapport au mobile 1 \(référence : origine \(0 ; 0\), pas de ligne ; axes x et y dans les directions de l’image ; seulement les images où les deux mobiles sont pointés\)/.test(csv[0]) &&
      /durées Δt INÉGALES entre les points : de 0,040 à 0,080 s/.test(csv[0]), csv[0]);
    verifier('fichier : mêmes en-têtes que le tableau', csv[2] === entetes.join(';'), csv[2]);
    // Tableau : une ligne par point commun du mobile 2, aucune pour le mobile 1 ; nombres justes
    const L = E.tableau.lignes;
    const tabOk = L.length === 7 && L.every(l => l[0] === '2') && L.every((l, i) => {
      const a = A[i];
      return l[1] === String(a.numero) && l[2] === String(a.image) && bienArrondi(l[3], a.t, f.t) && bienArrondi(l[4], a.x, f.pos) && bienArrondi(l[5], a.y, f.pos) &&
        (i === 0 ? l[6] === '' && l[7] === '' && l[8] === '' : bienArrondi(l[6], a.d, f.d) && bienArrondi(l[7], a.dt, f.t) && bienArrondi(l[8], a.v, f.v));
    });
    verifier('tableau : 7 lignes du mobile 2 (aucune pour la référence), chaque nombre = valeur du calcul indépendant arrondie aux décimales de formats()', tabOk, L.slice(0, 4));
    const csvLignes = csv.slice(3).filter(l => l);
    verifier('fichier : mêmes lignes que le tableau (mêmes nombres)', csvLignes.length === L.length && csvLignes.every((l, i) => l === L[i].map(x => x.replace(/[\s ]/g, '')).join(';')), csvLignes.slice(0, 2));
    verifier('durées inégales (images manquantes) : alerte sur le graphique des distances et au-dessus du tableau, pas d’aide « plus hautes → accéléré »',
      /pas toutes égales/.test(E.ecarts.alerte) && E.tableau.alerteTableau && !/accéléré/.test(E.ecarts.aide), {alerte: E.ecarts.alerte, aide: E.ecarts.aide});
    // Graphiques : mêmes nombres que le tableau
    const traj = E['y(x)'].ds;
    const courbe = traj.find(d => /^Mobile 2/.test(d.label));
    const origine = traj.find(d => /référence/.test(d.label));
    verifier('trajectoire : courbe du mobile 2 = positions relatives ; référence marquée en (0 ; 0) avec sa forme (×) et une légende « Mobile 1 × (référence) : origine (0 ; 0) » ; pas d’autre courbe',
      traj.length === 2 && courbe.data.every((p, i) => Math.abs(p.x - A[i].x) < 1e-12 && Math.abs(p.y - A[i].y) < 1e-12) && origine &&
      origine.data.length === 1 && origine.data[0].x === 0 && origine.data[0].y === 0 && origine.style === 'crossRot' && origine.label === 'Mobile 1 × (référence) : origine (0 ; 0)', traj.map(d => d.label));
    const xt = E['x(t)'].ds[0], yt = E['y(t)'].ds[0];
    verifier('x(t) et y(t) : instants et positions relatives du mobile 2', E['x(t)'].ds.length === 1 && xt.data.every((p, i) => Math.abs(p.x - A[i].t) < 1e-12 && Math.abs(p.y - A[i].x) < 1e-12) &&
      yt.data.every((p, i) => Math.abs(p.y - A[i].y) < 1e-12), {n: xt.data.length});
    const barresD = E.ecarts, barresV = E.vitesse;
    verifier('barres d et v : une par intervalle (1→2 … 6→8), hauteurs = d et v du calcul indépendant', barresD.labels.join() === '1→2,2→3,3→4,4→5,5→6,6→8' &&
      barresD.ds[0].data.every((d, i) => Math.abs(d - ivA[i].d) < 1e-12) && barresV.ds[0].data.every((v, i) => Math.abs(v - ivA[i].v) < 1e-12), barresD.labels);
    // Infobulles et résumé : mêmes écritures que le tableau
    const ib = E['y(x)'].infobulles[0], ibV = E.vitesse.infobulles[0], ibD = E.ecarts.infobulles[0];
    verifier('infobulles : x et y comme la 1re ligne du tableau ; d et v comme la 2e ligne', ib === 'Mobile 2 : x = ' + L[0][4] + ' m ; y = ' + L[0][5] + ' m' &&
      ibD.endsWith(': ' + L[1][6] + ' m') && ibV.endsWith(': ' + L[1][8] + ' m/s'), {ib, ibD, ibV, ligne: L[1]});
    verifier('infobulle de la marque d’origine : « Mobile 1 × (référence) : origine (0 ; 0) », sans x = … ; y = …', E['y(x)'].infobulles[1] === 'Mobile 1 × (référence) : origine (0 ; 0)', E['y(x)'].infobulles[1]);
    const phraseT = 'L’instant t est compté depuis le tout premier point pointé, tous mobiles confondus (t = 0) : les mesures par rapport au mobile 1 × peuvent donc commencer après t = 0.';
    verifier('aide, référentiel mobile : « L’instant t est compté depuis le tout premier point pointé, tous mobiles confondus (t = 0) : les mesures … peuvent donc commencer après t = 0. » pour x(t), y(t), v(t), a(t) et le tableau, pas pour trajectoire, distances, vitesses ; plus de « depuis le premier point (t = 0) » seul',
      ['x(t)', 'y(t)', 'v(t)', 'a(t)', 'tableau'].every(t => E[t].aide.includes(phraseT)) && ['y(x)', 'ecarts', 'vitesse'].every(t => !E[t].aide.includes('instant t')) &&
      !E['x(t)'].aide.includes('compté depuis le premier point (t = 0)'), {xt: E['x(t)'].aide, tableau: E.tableau.aide});
    const dVals = L.slice(1).map(l => nombre(l[6]));
    verifier('résumé sous le graphique des distances : nombre, plus petite, plus grande (mêmes écritures que le tableau)',
      E.ecarts.info.startsWith('6 distances d · de ') && E.ecarts.info.includes(L.slice(1).map(l => l[6]).find(s => nombre(s) === Math.min(...dVals))) &&
      E.ecarts.info.includes(L.slice(1).map(l => l[6]).find(s => nombre(s) === Math.max(...dVals))), E.ecarts.info);
    verifier('aide de lecture : origine (0 ; 0), axes dans les directions de l’image, images où les deux mobiles sont pointés ; aucune conclusion sur le mouvement',
      /il est l’origine \(0 ; 0\) et n’a pas de courbe/.test(E['y(x)'].aide) && /gardent les directions de l’image/.test(E['y(x)'].aide) && /sans tourner/.test(E['y(x)'].aide) &&
      /les deux mobiles sont pointés/.test(E['y(x)'].aide) && /n’a pas de ligne/.test(E.tableau.aide) && !/(tombe|verticale(ment)? par rapport|immobile par rapport|est immobile)/.test(E['y(x)'].aide + E.tableau.aide), E['y(x)'].aide);
    const legendeMobile = await ev(o, `[...document.getElementById('choix-mobile-graphique').options].map(x=>x.textContent)`);
    verifier('menu « Mobile » : la référence est signalée « (référence) »', legendeMobile.join('|') === 'Tous les mobiles|Mobile 1 × (référence)|Mobile 2 +', legendeMobile);
    // Fichier nommé avec le référentiel (fabriqué dans le navigateur, intercepté ici)
    const nomFichier = await ev(o, `(()=>{let nom=null;const orig=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){nom=this.download;};exporterCSV();HTMLAnchorElement.prototype.click=orig;return nom;})()`);
    verifier('nom du fichier : « mesures-balle-lachee-devant-un-mur-par-rapport-au-mobile-1.csv »', nomFichier === 'mesures-balle-lachee-devant-un-mur-par-rapport-au-mobile-1.csv', nomFichier);
    await graphiqueCapture(o, 'y(x)', 'exactitude-trajectoire-1366x768.png');
    await graphiqueCapture(o, 'tableau', 'exactitude-tableau-1366x768.png');

    // Référence = mobile 2 : positions du mobile 1 opposées (même calcul indépendant, r = 1)
    await choisir(o, 'choix-referentiel', 1); await pause(150);
    const inv = await ev(o, `data.getPositions(0)`);
    const B = attendu(0, 1);
    verifier('référence = mobile 2 : positions du mobile 1 = position(mobile 1) − position(mobile 2) aux images communes (0, 1, 2, 4, 5, 7, 9)',
      inv.length === B.length && inv.every((p, i) => p.image === B[i].image && Math.abs(p.x - B[i].x) < 1e-12 && Math.abs(p.y - B[i].y) < 1e-12) &&
      B.map(b => b.image).join() === '0,1,2,4,5,7,9', inv.map(p => p.image));
    journalPropre(o, 'exactitude');
    await fermer(o);
  }

  // ------------------------------------------------------------------ 2. Défaut inchangé
  if (partie(2, 'Référentiel par défaut : mêmes graphiques, tableau et fichier que la version d’avant (HEAD)')) {
    let avant = null;
    try {
      avant = mkdtempSync(path.join(tmpdir(), 'jsmeca-avant-'));
      const depot = execFileSync('git', ['-C', RACINE, 'rev-parse', '--show-toplevel']).toString().trim();
      const tar = execFileSync('git', ['-C', depot, 'archive', '--format=tar', 'HEAD:jsmecavideo'], {maxBuffer: 1 << 28});
      execFileSync('tar', ['-x', '-C', avant], {input: tar});
    } catch (e) { avant = null; }
    if (!avant) {
      verifier('version d’avant extraite par git (HEAD)', false, 'git indisponible : comparaison NON faite');
    } else {
      const srvA = await servir(avant);
      for (const n of [1, 2]) {
        const a = await onglet(1366, 768, {base: srvA.base});
        await preparer(a, n);
        await ev(a, `passerAuMode('Graphique')`); await pause(300);
        const EA = await ev(a, ETAT_GRAPHIQUES);
        await fermer(a);
        const b = await onglet(1366, 768);
        await preparer(b, n);
        await ev(b, `passerAuMode('Graphique')`); await pause(300);
        const EB = await ev(b, ETAT_GRAPHIQUES);
        let EC = null;
        if (n > 1) {
          // Aller-retour du menu : mobile 1, puis de nouveau l'image
          await choisir(b, 'choix-referentiel', 0); await pause(100);
          await choisir(b, 'choix-referentiel', -1); await pause(100);
          EC = await ev(b, ETAT_GRAPHIQUES);
        }
        const menuCache = await ev(b, `document.getElementById('choix-referentiel').closest('label').hidden`);
        journalPropre(b, `défaut, ${n} mobile${n > 1 ? 's' : ''}`);
        await fermer(b);
        // Seule différence voulue : l'aide de la trajectoire se termine par l'indication du référentiel
        const differences = [];
        for (const t of Object.keys(EA)) {
          if (t === 'csv') { if (EA.csv !== EB.csv) differences.push('csv'); continue; }
          for (const champ of Object.keys(EA[t])) {
            const va = JSON.stringify(EA[t][champ]), vb = JSON.stringify(EB[t][champ]);
            if (t === 'y(x)' && champ === 'aide') { if (!EB[t].aide.startsWith(EA[t].aide) || !/Mouvement par rapport à/.test(EB[t].aide.slice(EA[t].aide.length))) differences.push(t + '.aide'); }
            else if (va !== vb) differences.push(t + '.' + champ);
          }
        }
        verifier(`${n} mobile${n > 1 ? 's' : ''}, image de la vidéo : titres, aides, alertes, résumés, données et axes des 9 graphiques, infobulles, tableau et fichier identiques à HEAD (seul ajout : l’indication en fin d’aide de la trajectoire)`,
          differences.length === 0, {differences, aideAjoutee: EB['y(x)'].aide.slice(EA['y(x)'].aide.length)});
        if (n > 1) verifier('2 mobiles : après un aller-retour du menu (mobile 1 puis image), tout est de nouveau identique', JSON.stringify(EC) === JSON.stringify(EB));
        else verifier('1 mobile : menu « Mouvement par rapport à » caché', menuCache);
      }
      await srvA.close();
      rmSync(avant, {recursive: true, force: true});
    }
  }

  // ------------------------------------------------------------------ 3. Cas limites
  if (partie(3, 'Cas limites : aucun instant commun, pas assez de points, « Tous », référence affichée, nombre de mobiles, nouvelle vidéo')) {
    const o = await onglet(1366, 768);
    await choisir(o, 'choix-mobiles', 2);
    await etalonner(o);
    // Mobile 1 aux images paires, mobile 2 aux images impaires : aucun instant commun
    await ev(o, `for(let k=0;k<6;k++){data.placer(k%2,k,100+10*k,100+5*k);}`);
    await ev(o, `passerAuMode('Graphique')`); await pause(200);
    await choisir(o, 'choix-referentiel', 0); await pause(150);
    const info = (t) => ev(o, `(()=>{graph.choisirType(${JSON.stringify(t)});graph.updateChart();const e=document.getElementById('acceleration-info');return e.hidden?'':e.textContent;})()`);
    const aucun = await info('y(x)');
    const tabAucun = await ev(o, `(()=>{graph.choisirType('tableau');graph.updateChart();return document.querySelectorAll('#tableau-mesures tbody tr').length;})()`);
    verifier('aucun instant commun : « Mobile 2 + : jamais pointé sur la même image que le mobile 1 × … Pointe les deux mobiles sur les mêmes images » ; tableau vide',
      /^Mobile 2 \+ : jamais pointé sur la même image que le mobile 1 ×, donc aucune mesure par rapport à lui\. Pointe les deux mobiles sur les mêmes images/.test(aucun) && tabAucun === 0, {aucun, tabAucun});
    const entete = await ev(o, `construireCSV().split('\\r\\n')[0]`);
    verifier('aucun instant commun : 1re ligne du fichier honnête (« moins de deux images où un mobile et la référence sont pointés tous les deux »)', /moins de deux images où un mobile et la référence sont pointés tous les deux/.test(entete), entete);
    // Un seul instant commun : pas assez de points pour les distances
    await ev(o, `data.placer(1,0,130,90)`);
    const peu = await info('ecarts');
    const trajUn = await info('y(x)');
    verifier('un seul instant commun : distances → « Pas encore assez de points pour ce graphique : il faut au moins 2 images où le mobile 2 + et le mobile 1 × sont pointés tous les deux » ; trajectoire → résumé normal',
      peu.startsWith('Pas encore assez de points pour ce graphique : il faut au moins 2 images où le mobile 2 + et le mobile 1 × sont pointés tous les deux') && !/Pas encore/.test(trajUn), {peu, trajUn});
    const aT = await info('a(t)');
    verifier('accélération (lycée) : « il faut au moins 5 images »', /il faut au moins 5 images/.test(aT), aT);
    // Mobile affiché = référence
    await choisir(o, 'choix-mobile-graphique', 0); await pause(100);
    const lui = await info('y(x)');
    const luiDs = await ev(o, `graph.chart.data.datasets.map(d=>d.label)`);
    verifier('mobile affiché = référence : « Le mobile 1 × est la référence : par rapport à lui-même, il est toujours à l’origine (0 ; 0). Choisis un autre mobile » ; seule l’origine est tracée',
      /^Le mobile 1 × est la référence : par rapport à lui-même, il est toujours à l’origine \(0 ; 0\)\. Choisis un autre mobile dans « Mobile »\.$/.test(lui) &&
      luiDs.length === 1 && /référence/.test(luiDs[0]), {lui, luiDs});
    const luiBarres = await info('vitesse');
    verifier('mobile affiché = référence, vitesses : même message, aucune barre', /est la référence/.test(luiBarres) && await ev(o, `graph.chart.data.datasets.length===0`), luiBarres);
    // Choisir comme référence le mobile affiché : on passe à « Tous les mobiles »
    await choisir(o, 'choix-referentiel', -1); await pause(100);
    await choisir(o, 'choix-mobile-graphique', 1); await pause(100);
    await choisir(o, 'choix-referentiel', 1); await pause(100);
    verifier('choisir comme référence le mobile affiché : le menu « Mobile » passe à « Tous les mobiles »', await ev(o, `document.getElementById('choix-mobile-graphique').value==='-1'`));
    // 3 mobiles, « Tous les mobiles », référence = mobile 2
    await ev(o, `passerAuMode('Pointage')`);
    await changerMobiles(o, 3);
    const garde = await ev(o, `data.refActif()`);
    await ev(o, placerTout(3));
    await ev(o, `passerAuMode('Graphique')`); await pause(200);
    const tous = await ev(o, `(()=>{graph.choisirType('y(x)');graph.updateChart();return {ds:graph.chart.data.datasets.map(d=>d.label),m:document.getElementById('choix-mobile-graphique').value,ref:document.getElementById('choix-referentiel').value};})()`);
    const tousB = await ev(o, `(()=>{graph.choisirType('ecarts');graph.updateChart();return {ds:graph.chart.data.datasets.filter(d=>d.type==='bar').map(d=>d.label),info:document.getElementById('acceleration-info').textContent,labels:graph.chart.data.labels};})()`);
    const p3 = await ev(o, `data.getPositions(2)`);
    const A3 = attendu(2, 1);
    verifier('passer de 2 à 3 mobiles garde la référence (mobile 2, toujours présent)', garde === 1 && tous.ref === '1', {garde, ref: tous.ref});
    verifier('3 mobiles, « Tous les mobiles », référence = mobile 2 : courbes des mobiles 1 et 3 + origine, pas de courbe du mobile 2 ; barres des mobiles 1 et 3 alignées par images',
      tous.m === '-1' && tous.ds.join('|') === 'Mobile 1|Mobile 3|Mobile 2 + (référence) : origine (0 ; 0)' && tousB.ds.join('|') === 'Mobile 1 ×|Mobile 3 ○' &&
      /^Mobile 1 : .*\nMobile 3 : /.test(tousB.info) && tousB.labels.every(l => /^\d+→\d+$/.test(l)), {tous, tousB: tousB.ds, info: tousB.info});
    verifier('3 mobiles : positions du mobile 3 par rapport au mobile 2 = calcul indépendant (images communes 0, 1, 2, 4, 5, 7, 8, 9)',
      p3.length === A3.length && p3.every((p, i) => p.image === A3[i].image && p.numero === A3[i].numero && Math.abs(p.x - A3[i].x) < 1e-12 && Math.abs(p.y - A3[i].y) < 1e-12), p3.map(p => p.image));
    // Nombre de mobiles changé : référence disparue → l'image ; 1 mobile → menu caché
    await choisir(o, 'choix-referentiel', 2); await pause(100);
    await ev(o, `passerAuMode('Pointage')`);
    await changerMobiles(o, 2);
    await ev(o, `passerAuMode('Graphique')`); await pause(200);
    const apres2 = await ev(o, `({ref:data.refActif(),menu:document.getElementById('choix-referentiel').value,titre:document.getElementById('graph-titre').textContent})`);
    verifier('référence = mobile 3, puis 2 mobiles : retour à « l’image de la vidéo » (menu et titres)', apres2.ref === -1 && apres2.menu === '-1' && !/par rapport/.test(apres2.titre), apres2);
    await choisir(o, 'choix-referentiel', 1); await pause(100);
    await ev(o, `passerAuMode('Pointage')`);
    await changerMobiles(o, 1);
    await ev(o, `passerAuMode('Graphique')`); await pause(200);
    const un = await ev(o, `(graph.choisirType('y(x)'),graph.updateChart(),{ref:data.refActif(),brut:data.referentiel,cache:document.getElementById('choix-referentiel').closest('label').hidden,titre:document.getElementById('graph-titre').textContent,aide:document.getElementById('graph-aide').textContent})`);
    verifier('passer à 1 mobile : référence oubliée, menu caché, titres sans « par rapport »', un.ref === -1 && un.brut === -1 && un.cache && !/par rapport au mobile/.test(un.titre), un);
    verifier('1 mobile, trajectoire : l’aide indique comment décrire le mouvement par rapport à un autre objet (sans conclusion)',
      /Pour décrire le mouvement par rapport à un autre objet, pointe aussi cet objet \(« Mobiles » : 2, avant de pointer\), puis choisis-le dans « Mouvement par rapport à »\./.test(un.aide), un.aide);
    // Nouvelle vidéo : on repart de l'image
    await ev(o, `passerAuMode('Pointage')`);
    await changerMobiles(o, 2);
    await ev(o, `data.referentiel=1`);
    await choisirVideo(o, MOTO);
    verifier('changer de vidéo : référentiel remis à « l’image de la vidéo »', await ev(o, `data.refActif()===-1`));
    // Mobile 1 : images 2 à 7 (commence plus tard) ; mobile 2 : 0 à 3 ; mobile 3 : 0 et 2
    await changerMobiles(o, 3);
    await ev(o, `for(let k=2;k<8;k++)data.placer(0,k,50+10*k,100);for(let k=0;k<4;k++)data.placer(1,k,80+12*k,150+3*k*k);data.placer(2,0,300,60);data.placer(2,2,290,70);`);
    await ev(o, `passerAuMode('Graphique')`); await pause(200);
    await choisir(o, 'choix-referentiel', -1); await choisir(o, 'choix-mobile-graphique', -1); await pause(100);
    const moyDefaut = await info('a(t)');
    verifier('a(t), 3 mobiles affichés dont un seul a assez de points (image de la vidéo) : « Moyenne mobile 1 : … » (le mobile est nommé)', /^Moyenne mobile 1 : -?[\d ]+(,\d+)? px\/s²/.test(moyDefaut), moyDefaut);
    await choisir(o, 'choix-referentiel', 0); await pause(100);
    const peuCommun = await info('ecarts');
    const barresPeu = await ev(o, `graph.chart.data.datasets.filter(d=>d.type==='bar').map(d=>d.label)`);
    verifier('distances, référence = mobile 1 : mobile 2 tracé (2 images communes) ; mobile 3 (1 image commune) : « Mobile 3 ○ : pointé en même temps que le mobile 1 × sur 1 seule image ; il en faut au moins 2 pour ce graphique, donc il n’est pas tracé. »',
      barresPeu.join('|') === 'Mobile 2 +' && peuCommun.includes('Mobile 3 ○ : pointé en même temps que le mobile 1 × sur 1 seule image ; il en faut au moins 2 pour ce graphique, donc il n’est pas tracé.'), {peuCommun, barresPeu});
    const vtPeu = await info('v(t)');
    verifier('v(t) : aucun mobile n’a 3 images communes avec la référence → message général « il faut au moins 3 images où un mobile et le mobile 1 × sont pointés tous les deux »', /il faut au moins 3 images où un mobile et le mobile 1 × sont pointés tous les deux/.test(vtPeu), vtPeu);
    const tDebut = await ev(o, `(()=>{graph.choisirType('tableau');graph.updateChart();const l=document.querySelector('#tableau-mesures tbody tr');return {t:l.children[3].textContent,aide:document.getElementById('graph-aide').textContent};})()`);
    verifier('référence qui commence plus tard (image 2) : tableau à partir de t = 0,08 s, et l’aide explique pourquoi', tDebut.t === '0,080' && /peuvent donc commencer après t = 0/.test(tDebut.aide), tDebut);
    journalPropre(o, 'cas limites');
    await fermer(o);
  }

  // ------------------------------------------------------------------ 4. Rechargement
  if (partie(4, 'Reprise après rechargement, sauvegardes incohérentes')) {
    const o = await onglet(1024, 768);
    await preparer(o, 2);
    await ev(o, `passerAuMode('Graphique')`); await pause(200);
    await choisir(o, 'choix-referentiel', 1); await pause(200);
    const avant = await ev(o, `({csv:construireCSV(),titre:document.getElementById('graph-titre').textContent})`);
    await o.c.send('Page.reload', {}, o.s); await pause(800);
    await jusqua(o, `!document.getElementById('confirmation').hidden`);
    await repondre(o, 'oui');
    await jusqua(o, `etat==='Graphique' && !!graph.chart`);
    await pause(300);
    const apres = await ev(o, `({ref:data.refActif(),menu:document.getElementById('choix-referentiel').value,titre:document.getElementById('graph-titre').textContent,csv:construireCSV()})`);
    verifier('rechargement → « Reprendre » : référence = mobile 2 (menu, titres), fichier identique', apres.ref === 1 && apres.menu === '1' &&
      apres.titre === avant.titre && /par rapport au mobile 2 \+/.test(apres.titre) && apres.csv === avant.csv, {apres: {ref: apres.ref, menu: apres.menu, titre: apres.titre}});
    // Sauvegardes incohérentes (empreinte recalculée comme l'app) : refusées par la validation
    const base = await ev(o, `JSON.parse(sessionStorage.getItem('jsmecavideo-seance-v1'))`);
    const variantes = [
      ['référence = mobile 3 avec 2 mobiles', d => { d.referentiel = 2; }],
      ['référence = mobile 1 avec 1 mobile', d => { d.numMobiles = 1; d.points = [d.points[0]]; d.historique = []; d.referentiel = 0; }],
      ['référence écrite « 1 » (texte)', d => { d.referentiel = '1'; }],
      ['référence -2', d => { d.referentiel = -2; }],
      ['référence 0,5', d => { d.referentiel = 0.5; }]
    ];
    let refusees = [];
    for (const [nom, modif] of variantes) {
      const s = JSON.parse(JSON.stringify(base));
      modif(s.data);
      await ev(o, `(()=>{const o=${JSON.stringify(s)};o.controle=empreinteSeance(o);sessionStorage.setItem('jsmecavideo-seance-v1',JSON.stringify(o));})()`);
      await o.c.send('Page.reload', {}, o.s); await pause(700);
      await pret(o);
      const r = await ev(o, `({question:!document.getElementById('confirmation').hidden, n:data.getTotalPointCount(), ref:data.refActif()})`);
      if (!r.question && r.n === 0 && r.ref === -1) refusees.push(nom);
    }
    verifier('5 sauvegardes au référentiel incohérent ignorées (pas de question, rien de restauré)', refusees.length === variantes.length, refusees);
    // Ancienne sauvegarde (avant cette version : pas de champ referentiel) : acceptée, image
    const ancienne = JSON.parse(JSON.stringify(base));
    delete ancienne.data.referentiel;
    await ev(o, `(()=>{const o=${JSON.stringify(ancienne)};o.controle=empreinteSeance(o);sessionStorage.setItem('jsmecavideo-seance-v1',JSON.stringify(o));})()`);
    await o.c.send('Page.reload', {}, o.s); await pause(800);
    await jusqua(o, `!document.getElementById('confirmation').hidden`);
    await repondre(o, 'oui');
    await jusqua(o, `etat==='Graphique' && !!graph.chart`);
    const vieille = await ev(o, `({ref:data.refActif(),n:data.getTotalPointCount(),menu:document.getElementById('choix-referentiel').value})`);
    verifier('sauvegarde sans référentiel (version précédente) : reprise acceptée, mesures dans l’image', vieille.ref === -1 && vieille.n === 17 && vieille.menu === '-1', vieille);
    verifier('rien dans localStorage', await ev(o, `localStorage.length===0`));
    journalPropre(o, 'reprise');
    await fermer(o);
  }

  // ------------------------------------------------------------------ 5. Affichage
  if (partie(5, 'Affichage à 360×640, 1024×768, 1366×768 : pointage par l’interface, rien ne déborde, image inchangée')) {
    for (const [w, h, tactile] of [[360, 640, true], [768, 1024, true], [640, 360, true], [1024, 768, true], [1366, 768, false]]) {
      const o = await onglet(w, h, {tactile});
      const nom = `${w}×${h}`;
      await choisirVideo(o, MOTO);
      await choisir(o, 'choix-mobiles', 2); await pause(200);
      // Deux mobiles sur 4 images, par de vrais gestes (doigt ou souris)
      for (let k = 0; k < 4; k++) {
        for (const [vx, vy] of [[40 + 25 * k, 225], [60 + 25 * k, 150 + 18 * k]]) {
          await jusqua(o, `lecteur().pret()`);
          const p = await ecranDe(o, vx, vy);
          if (tactile) await toucher(o, p.x, p.y); else await clic(o, p.x, p.y);
          await pause(250);
        }
      }
      await jusqua(o, `lecteur().pret()`);
      const pts = await ev(o, `data.points.map(pts=>pts.map(p=>p.image).join())`);
      // Un premier passage aux graphiques (référentiel = image) : en portrait, le guide s'y replie
      // et l'image grandit ensuite (comportement d'avant). On mesure l'image après ce passage.
      await choisir(o, 'choix-mode', 'Graphique'); await pause(300);
      await choisir(o, 'choix-mode', 'Pointage'); await pause(400);
      await jusqua(o, `lecteur().pret()`);
      const rP0 = await rectCanevas(o);
      await choisir(o, 'choix-mode', 'Calibration'); await pause(350);
      const rE0 = await rectCanevas(o);
      await choisir(o, 'choix-mode', 'Graphique'); await pause(400);
      await choisir(o, 'choix-referentiel', 0); await pause(300);
      await capture(o, path.join(SORTIE, `affichage-${w}x${h}-trajectoire.png`));
      const mise = await ev(o, `(()=>{const W=innerWidth,d=document.documentElement;
        const vis=e=>e&&!e.hidden&&e.getClientRects().length>0&&!e.closest('[hidden]');
        const champs=[...document.querySelectorAll('#choix-graphique .champ')].filter(vis).map(e=>{const b=e.getBoundingClientRect(),z=document.getElementById('choix-graphique').getBoundingClientRect();return {l:b.left,r:b.right,zl:z.left,zr:z.right};});
        const s=document.getElementById('choix-referentiel').getBoundingClientRect();
        const cibles=[...document.querySelectorAll('#panneau button,#panneau select,#barre-outils button,#graphique-zone summary')].filter(vis).filter(e=>{const b=e.getBoundingClientRect();return b.height<43.5||b.width<43.5;}).map(e=>e.id||e.className);
        const g=document.getElementById('graph-cadre').getBoundingClientRect();
        return {largeurPage:d.scrollWidth,W,champsDedans:champs.every(c=>c.l>=c.zl-0.5&&c.r<=c.zr+0.5&&c.r<=W+0.5),nbChamps:champs.length,menu:[Math.round(s.width),Math.round(s.height)],cibles,gh:g.height,
          titre:document.getElementById('graph-titre').textContent,titreDeborde:document.getElementById('graph-titre').scrollWidth>document.getElementById('graph-titre').clientWidth+1};})()`);
      verifier(`${nom} : 2 mobiles pointés sur les images 0 à 3 par ${tactile ? 'le doigt' : 'la souris'}`, pts.join('|') === '0,1,2,3|0,1,2,3', pts);
      verifier(`${nom} : Graphiques, 3 menus visibles et dans leur zone, aucun défilement horizontal, menu du référentiel ≥ 44 px, toutes les cibles ≥ 44 px, graphique ≥ 220 px, titre non coupé`,
        mise.nbChamps === 3 && mise.champsDedans && mise.largeurPage <= mise.W && mise.menu[1] >= 44 && mise.cibles.length === 0 && mise.gh >= 219.5 && !mise.titreDeborde, mise);
      // Axes de la trajectoire : les deux lignes du titre d'axe tiennent dans le canevas
      const axes = await ev(o, `(()=>{const c=graph.chart,x=c.scales.x,y=c.scales.y;return {haut:c.height,larg:c.width,xbas:x.bottom,yGauche:y.left};})()`);
      verifier(`${nom} : titres d’axes sur deux lignes dans le canevas`, axes.xbas <= axes.haut + 0.5 && axes.yGauche >= -0.5, axes);
      const nombres = await ev(o, `(()=>{const p=data.getPositions(1);const brut=data.points;const f=data.echelle?data.echelle/data.facteurLongueur():1;
        return p.every(q=>{const a=brut[1].find(z=>z.image===q.image),r=brut[0].find(z=>z.image===q.image);return Math.abs(q.x-(a.xpx-r.xpx)*f)<1e-12&&Math.abs(q.y-(a.ypx-r.ypx)*f)<1e-12;})&&p.length===4;})()`);
      verifier(`${nom} : positions relatives = différence des points réellement pointés (4 images communes)`, nombres);
      await choisir(o, 'choix-type-graphique', 'tableau'); await pause(250);
      await capture(o, path.join(SORTIE, `affichage-${w}x${h}-tableau.png`));
      // Libellés des graphiques aussi lisibles qu'avant : menu « Graphique » de même largeur avec
      // ou sans le menu du référentiel (sans lui, c'est la disposition d'avant) ; texte qui tient
      const lisible = [];
      for (const t of ['ecarts', 'vitesse']) {
        await choisir(o, 'choix-type-graphique', t); await pause(200);
        lisible.push(await ev(o, `(()=>{const s=document.getElementById('choix-type-graphique'),c=graph.champRef;
          const mesure=()=>{const st=getComputedStyle(s),x=document.createElement('canvas').getContext('2d');x.font=st.font;
            const place=s.clientWidth-parseFloat(st.paddingLeft)-parseFloat(st.paddingRight)-20;return {largeur:Math.round(s.getBoundingClientRect().width),tient:x.measureText(s.options[s.selectedIndex].textContent).width<=place};};
          const avec=mesure();c.hidden=true;const sans=mesure();c.hidden=false;return {type:${JSON.stringify(t)},avec,sans};})()`));
      }
      verifier(`${nom} : menu « Graphique » aussi large qu’avant (avec le menu du référentiel = sans lui), libellés « Distance d… » et « Vitesse … (v = d / Δt) » ${w === 768 ? 'en entier' : 'aussi lisibles qu’avant'}`,
        lisible.every(l => l.avec.largeur === l.sans.largeur && l.avec.tient === l.sans.tient) && (w !== 768 || lisible.every(l => l.avec.tient)), lisible);
      await capture(o, path.join(SORTIE, `affichage-${w}x${h}-vitesse.png`));
      // Retour au pointage et à l'étalonnage : l'image n'a changé ni de taille ni de place
      await choisir(o, 'choix-mode', 'Pointage'); await pause(400);
      const rP1 = await rectCanevas(o);
      await choisir(o, 'choix-mode', 'Calibration'); await pause(350);
      const rE1 = await rectCanevas(o);
      const cache = await ev(o, `document.getElementById('choix-graphique').hidden && document.getElementById('choix-referentiel').getClientRects().length===0`);
      verifier(`${nom} : Pointer et Étalonner : image de même taille et à la même place avant et après le choix du référentiel ; menus des graphiques cachés`,
        rP0 === rP1 && rE0 === rE1 && cache && (w > h || rP0 === rE0), {rP0, rP1, rE0, rE1});
      journalPropre(o, nom);
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

async function graphiqueCapture(o, type, fichier) {
  await ev(o, `(()=>{graph.choisirType(${JSON.stringify(type)});graph.updateChart();})()`);
  await pause(250);
  await capture(o, path.join(SORTIE, fichier));
}

console.log('Captures : ' + SORTIE);
console.log('\n' + nbOk + ' contrôle(s) réussi(s), ' + echecs.length + ' échec(s)' + (echecs.length ? ' : ' + echecs.join(' | ') : '.'));
process.exit(echecs.length ? 1 : 0);
