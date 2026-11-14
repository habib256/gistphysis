// tests/verifier-ergonomie.mjs — contrôles rejouables de jsMecaVidéo dans Chrome sans écran
//
//   node tests/verifier-ergonomie.mjs [--sortie DOSSIER] [--seulement 1,4,…]
//
// Sert l'app avec un petit serveur local (requêtes Range gérées ou non), pilote Chrome par le
// protocole DevTools (aucune dépendance npm). Chaque contrôle dit exactement ce qu'il vérifie.
// Parties :
//   1. balayage de tailles de fenêtre et deux cadres (340×573, 749×666) : taille de l'image en
//      pointage et en étalonnage, du graphique et du tableau ; défilement ; textes coupés ;
//      cibles d'au moins 44 px ; message « trop petit » quand l'image ne tient plus ;
//   2. stabilité : l'image ne bouge ni pendant un geste (consigne qui change) ni entre deux points ;
//      rotation pendant un geste et pendant la saisie ; étalonnage au doigt à 334×468 ;
//   3. parcours par l'interface : étalonnage 1,85 m sur la balle lâchée → 10 points → graphiques →
//      retour (points gardés) → Annuler → étalonnage rouvert → question avant changement de vidéo ;
//   4. comparaison avec l'ancienne version (commit fc875fe, extraite par git) : mêmes positions
//      vidéo injectées à l'entrée du pointage des DEUX versions (après la conversion écran,
//      que Chrome arrondit au pixel) → mêmes d et Δt ;
//   5. exactitude : vrai clic (position entière à l'écran) au centre de la tache rouge du mobile ;
//   6. saisie des longueurs et vraisemblance de l'étalonnage ;
//   7. fin de vidéo (boucle de recherche) sur trois vidéos, lecture jusqu'au bout, clavier,
//      double-clic, remplacement, insertion ;
//   8. compatibilité avec browser-check.mjs du site ;
//   9. webcam simulée : instants réels, ré-enregistrement ;
//  10. sauvegarde de séance : Échap, blocage pendant la question, sauvegardes corrompues ;
//  11. vidéo chargée en blob (serveur sans Range), et repli quand le chargement complet échoue ;
//  12. durées inégales, plusieurs mobiles, cadence de prise de vue, unités de l'animation,
//      nom du fichier, cohérence des nombres (d / Δt affichés redonnent v affichée) ;
//  13. densité 2 et bouton plein écran.
// Le script n'est pas nécessaire au fonctionnement de l'app.

import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {servir, lancerChrome, ouvrirOnglet, ev, jusqua, pause, capture, redimensionner, clic, toucher,
  doigtPose, doigtGlisse, doigtLeve, touche, fermer} from './cdp.mjs';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iSortie = process.argv.indexOf('--sortie');
const SORTIE = iSortie > 0 ? process.argv[iSortie + 1] : mkdtempSync(path.join(tmpdir(), 'jsmeca-captures-'));
mkdirSync(SORTIE, {recursive: true});
const iSeul = process.argv.indexOf('--seulement');
const PARTIES = iSeul > 0 ? process.argv[iSeul + 1].split(',').map(Number) : null;

const echecs = [];
const rapport = {balayage: [], verifications: []};
function verifier(nom, ok, detail) {
  rapport.verifications.push({nom, ok: !!ok, detail});
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 600) : ''));
  if (!ok) echecs.push(nom);
}

const CHUTE = 'videos/chute.mp4';
const TABLE = 'videos/TableHorizRectiligneUniforme_631g7.mp4';

const srv = await servir(RACINE);
let c = lancerChrome();
let partiesLancees = 0;
const partie = (n, titre) => {
  if (PARTIES && !PARTIES.includes(n)) return false;
  // Un Chrome neuf par partie : après une vingtaine d'onglets, Chrome sans écran se fige parfois
  if (partiesLancees++ > 0) { c.quit(); c = lancerChrome(); }
  console.log(n + '. ' + titre);
  return true;
};

const pret = (o) => jusqua(o, `lecteur() && lecteur().isLoaded && lecteur().dims() && !lecteur().enDeplacement && width>50 && Math.abs(width/height-dimensionsSource().w/dimensionsSource().h)<0.01`);
const choisirVideoSansAttente = async (o, chemin) => {
  await ev(o, `(()=>{const i=videoFiles.findIndex(v=>v.path===${JSON.stringify(chemin)});const s=document.getElementById('choix-video');s.value=String(i);s.dispatchEvent(new Event('change'));})()`);
  await pause(300);
};
// Répond à la question affichée (après 450 ms : un toucher plus rapide est ignoré par l'app)
const repondre = async (o, quoi) => {
  await pause(450);
  await ev(o, `document.getElementById('confirmation-${quoi}').click()`);
};
// Vraies frappes au clavier dans le champ qui a le focus
const saisir = async (o, texte) => { await o.c.send('Input.insertText', {text: texte}, o.s); };
const effacerChamp = async (o, n = 20) => { for (let i = 0; i < n; i++) await touche(o, 'Backspace', 'Backspace', 8); };
// Change de vidéo (et répond « Changer de vidéo » si la question s'affiche)
const choisirVideo = async (o, chemin) => {
  await choisirVideoSansAttente(o, chemin);
  if (await ev(o, `!document.getElementById('confirmation').hidden`)) await repondre(o, 'oui');
  await jusqua(o, `lecteur().chemin===${JSON.stringify(chemin)}`);
  await pret(o);
};
const choisir = (o, id, valeur) => ev(o, `(()=>{const s=document.getElementById(${JSON.stringify(id)});s.value=${JSON.stringify(String(valeur))};s.dispatchEvent(new Event('change'));})()`);
// Position à l'écran d'un point de la vidéo (pixels vidéo, y vers le bas)
const ecranDe = (o, vx, vy) => ev(o, `(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),s=dimensionsSource();return {x:r.left+${vx}*r.width/s.w,y:r.top+${vy}*r.height/s.h};})()`);
const rectCanevas = (o) => ev(o, `(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(v=>Math.round(v*10)/10).join(',');})()`);
const journalPropre = (o, nom) => {
  const origine = new URL(o.base).origin;
  const externes = o.journal.requetes.filter(u => !u.startsWith(origine) && !u.startsWith('blob:' + origine) && !u.startsWith('data:') && u !== 'about:blank');
  verifier(nom + ' : aucune erreur console', o.journal.erreurs.length === 0 && o.journal.console.length === 0, [...o.journal.erreurs, ...o.journal.console].slice(0, 5));
  verifier(nom + ' : aucune requête hors origine, aucun échec', externes.length === 0 && o.journal.echecs.length === 0, [...externes, ...o.journal.echecs].slice(0, 5));
};
// Compare l'image affichée par l'app (élément vidéo, taille native) aux images k et k-1 du
// fichier extraites par ffmpeg (référence indépendante du navigateur)
async function compareReference(o, video, k) {
  let refs;
  try {
    const dossier = mkdtempSync(path.join(tmpdir(), 'jsmeca-ref-'));
    refs = [k, k - 1].map(n => {
      const f = path.join(dossier, n + '.png');
      execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path.join(RACINE, video), '-vf', `select=eq(n\\,${n})`, '-vsync', '0', '-frames:v', '1', f]);
      return 'data:image/png;base64,' + readFileSync(f).toString('base64');
    });
    rmSync(dossier, {recursive: true, force: true});
  } catch (e) {
    return {ok: false, raison: 'ffmpeg indisponible : NON vérifié'};
  }
  return ev(o, `(async()=>{const v=lecteur().elt,w=v.videoWidth,h=v.videoHeight;
    const lire=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src;});
    const pixels=img=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);return x.getImageData(0,0,w,h).data;};
    const a=pixels(v),r0=pixels(await lire(${JSON.stringify(refs[0])})),r1=pixels(await lire(${JSON.stringify(refs[1])}));
    const ecart=(p,q)=>{let s=0,n=0;for(let i=0;i<p.length;i+=4*7){s+=Math.abs(p[i]-q[i])+Math.abs(p[i+1]-q[i+1])+Math.abs(p[i+2]-q[i+2]);n+=3;}return s/n;};
    const dk=ecart(a,r0),dk1=ecart(a,r1);return {ok:dk<3&&dk<dk1,ecartImageK:Math.round(dk*100)/100,ecartImagePrecedente:Math.round(dk1*100)/100};})()`);
}

async function onglet(w, h, options = {}) {
  const o = await ouvrirOnglet(c, (options.base || srv.base) + (options.page || '/index.html'), w, h, options);
  o.base = options.base || srv.base;
  if (!options.sansAttente) await pret(o);
  return o;
}

// Mesures de mise en page dans un document (l'app seule, ou l'app dans un cadre)
const MESURE = `(()=>{const d=DOC,w=d.defaultView,c=d.querySelector('canvas'),r=c.getBoundingClientRect(),W=w.innerWidth,H=w.innerHeight;
  const vis=e=>e&&!e.hidden&&e.getClientRects().length>0&&w.getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]');
  const petit=vis(d.getElementById('trop-petit'));
  const coupe=['instructions','frame-info','calibration-message','calibration-consigne'].filter(id=>{const e=d.getElementById(id);return vis(e)&&e.scrollHeight>e.clientHeight+1;})
    .concat(['guide-texte','calibration-textes'].filter(id=>{const e=d.getElementById(id);return vis(e)&&e.scrollHeight-e.scrollTop>e.clientHeight+2&&!e.classList.contains('deborde');}).map(id=>id+' (sans indice)'));
  const cibles=[...d.querySelectorAll('#panneau button,#panneau select,#barre-outils button,#barre-outils input,#calibration-input input,#guide button,#graphique-zone summary,#info-bar button,#scene button')].filter(vis).filter(e=>{const b=e.getBoundingClientRect();return b.height<43.5||b.width<43.5;}).map(e=>(e.id||e.className)+':'+Math.round(e.getBoundingClientRect().width)+'×'+Math.round(e.getBoundingClientRect().height));
  return {W,H,disposition:d.body.classList.contains('lat')?'latérale':'empilée',image:Math.round(r.width)+'×'+Math.round(r.height),iw:r.width,ih:r.height,
    part:Math.round(1000*r.width*r.height/(W*H))/10,petit,coupe,cibles,rect:[r.left,r.top,r.width,r.height].map(Math.round).join(','),
    defile:d.documentElement.scrollHeight>H+1||d.documentElement.scrollWidth>W+1,
    entiere:r.top>=-0.5&&r.left>=-0.5&&r.bottom<=H+0.5&&r.right<=W+0.5};})()`;
const mesurer = (o, doc = 'document') => ev(o, MESURE.replace('DOC', doc));
const MESURE_GRAPH = `(()=>{const d=DOC,g=d.getElementById('graph-cadre').getBoundingClientRect(),t=d.getElementById('tableau-zone').getBoundingClientRect();
  return {graphique:Math.round(g.width)+'×'+Math.round(g.height),gh:g.height,tableau:Math.round(t.width)+'×'+Math.round(t.height),th:t.height};})()`;

try {
  // ------------------------------------------------------------------ 1. Balayage des tailles
  if (partie(1, 'Balayage des tailles de fenêtre et deux cadres')) {
    const tailles = [];
    for (const w of [320, 360, 414, 480, 568, 640, 768, 844, 1024]) for (const h of [360, 448, 568, 640, 768]) tailles.push([w, h]);
    for (const t of [[320, 240], [334, 468], [467, 350], [488, 366], [495, 371], [844, 390], [1024, 664], [768, 1024], [1366, 768], [1920, 1080]]) tailles.push(t);
    const o = await onglet(1024, 768, {tactile: true});
    // Trois points pour avoir un graphique et un tableau
    await ev(o, `(()=>{for(let k=0;k<3;k++)data.placer(0,k,100+30*k,200-20*k);})()`);
    const graphe = async (doc, o2) => {
      await ev(o2, `${doc}.defaultView.eval("graph.choisirType('y(x)');passerAuMode('Graphique')")`);
      await pause(300);
      const g = await ev(o2, MESURE_GRAPH.replace('DOC', doc));
      await ev(o2, `${doc}.defaultView.eval("graph.choisirType('tableau');graph.updateChart()")`);
      await pause(150);
      const t = await ev(o2, MESURE_GRAPH.replace('DOC', doc));
      await ev(o2, `${doc}.defaultView.passerAuMode('Pointage')`);
      return {graphique: g.graphique, gh: g.gh, tableau: t.tableau, th: t.th};
    };
    const captures = ['320x448', '334x468', '640x360', '844x390', '360x640', '467x350', '320x240', '414x568'];
    for (const [w, h] of tailles) {
      await redimensionner(o, w, h, {tactile: true});
      await ev(o, `passerAuMode('Pointage')`);
      await pause(350);
      const p = await mesurer(o);
      if (captures.includes(w + 'x' + h)) await capture(o, path.join(SORTIE, `balayage-${w}x${h}-pointage.png`));
      await ev(o, `passerAuMode('Calibration')`);
      await pause(350);
      const e = await mesurer(o);
      if (captures.includes(w + 'x' + h)) await capture(o, path.join(SORTIE, `balayage-${w}x${h}-etalonnage.png`));
      const g = await graphe('document', o);
      if (captures.includes(w + 'x' + h)) {
        await ev(o, `passerAuMode('Graphique')`); await pause(250);
        await capture(o, path.join(SORTIE, `balayage-${w}x${h}-graphique.png`));
        await ev(o, `passerAuMode('Pointage')`);
      }
      rapport.balayage.push({taille: w + '×' + h, ...p, etalonnage: e.petit ? 'trop petit' : e.image, partEtal: e.part, coupeEtal: e.coupe, ciblesEtal: e.cibles, rectP: p.rect, rectE: e.rect, ...g});
    }
    journalPropre(o, 'balayage');
    await fermer(o);
    // Deux cadres comme ceux du site (téléphone 340×573, iPad 749×666)
    for (const [w, h, fw, fh] of [[390, 640, 340, 573], [800, 720, 749, 666]]) {
      const f = await onglet(w, h, {tactile: true, page: `/tests/cadre.html?w=${fw}&h=${fh}`, sansAttente: true});
      await jusqua(f, `(()=>{const w=document.querySelector('iframe').contentWindow;return w.lecteur&&w.lecteur()&&w.lecteur().isLoaded&&w.width>50;})()`);
      await pause(600);
      const doc = `document.querySelector('iframe').contentDocument`;
      await ev(f, `${doc}.defaultView.eval("for(let k=0;k<3;k++)data.placer(0,k,100+30*k,200-20*k)")`);
      const p = await mesurer(f, doc);
      await capture(f, path.join(SORTIE, `cadre-${fw}x${fh}-pointage.png`));
      await ev(f, `${doc}.defaultView.passerAuMode('Calibration')`);
      await pause(350);
      const e = await mesurer(f, doc);
      await capture(f, path.join(SORTIE, `cadre-${fw}x${fh}-etalonnage.png`));
      const g = await graphe(doc, f);
      await ev(f, `${doc}.defaultView.passerAuMode('Graphique')`);
      await pause(300);
      await capture(f, path.join(SORTIE, `cadre-${fw}x${fh}-graphique.png`));
      rapport.balayage.push({taille: 'cadre ' + fw + '×' + fh, ...p, etalonnage: e.petit ? 'trop petit' : e.image, partEtal: e.part, coupeEtal: e.coupe, ...g});
      journalPropre(f, 'cadre ' + fw + '×' + fh);
      await fermer(f);
    }
    const B = rapport.balayage;
    verifier('pointage : jamais de défilement ; image entière ou message « trop petit »', B.every(r => !r.defile && (r.petit || r.entiere)), B.filter(r => r.defile || !(r.petit || r.entiere)).map(r => r.taille));
    verifier('pointage : image ≥ 200 × 130 px et ≥ 25 % de la fenêtre partout où elle est affichée', B.every(r => r.petit || (r.iw >= 200 && r.ih >= 130 && r.part >= 25)),
      B.filter(r => !r.petit && (r.iw < 200 || r.ih < 130 || r.part < 25)).map(r => r.taille + ' ' + r.image + ' ' + r.part + ' %'));
    verifier('« trop petit » seulement pour une fenêtre de 360 px de haut ou moins en disposition empilée (moins de 460 px de large)', B.filter(r => r.petit).every(r => r.H <= 360 && r.W < 460), B.filter(r => r.petit).map(r => r.taille));
    verifier('étalonnage : image affichée (pas « trop petit ») partout où le pointage l’est', B.every(r => r.petit || r.etalonnage !== 'trop petit'), B.filter(r => !r.petit && r.etalonnage === 'trop petit').map(r => r.taille));
    const cibles = {'360×640': 40, '768×1024': 50, '1024×768': 50, '1366×768': 50, '1920×1080': 50};
    verifier('objectifs : ≥ 50 % à 768×1024, 1024×768, 1366×768, 1920×1080 ; ≥ 40 % à 360×640', Object.entries(cibles).every(([t, m]) => (B.find(r => r.taille === t) || {}).part >= m),
      Object.keys(cibles).map(t => t + ' : ' + (B.find(r => r.taille === t) || {}).part + ' %'));
    verifier('graphique et tableau ≥ 220 px de haut partout (y compris cadres)', B.every(r => r.gh >= 219.5 && r.th >= 219.5), B.filter(r => r.gh < 219.5 || r.th < 219.5).map(r => r.taille + ' ' + r.graphique + ' / ' + r.tableau));
    verifier('aucun texte coupé (consigne, ligne d’état, message d’étalonnage)', B.every(r => r.coupe.length === 0 && r.coupeEtal.length === 0), B.filter(r => r.coupe.length || r.coupeEtal.length).map(r => r.taille + ' ' + r.coupe.concat(r.coupeEtal).join(',')));
    verifier('cibles ≥ 44 px (boutons, menus, curseur, guide, résumé ; à l’écran ou non)', B.every(r => r.cibles.length === 0 && (r.ciblesEtal || []).length === 0), [...new Set(B.flatMap(r => r.cibles.concat(r.ciblesEtal || [])))].slice(0, 12));
    verifier('portrait : l’image a la même taille et la même place pour pointer et pour étalonner', B.filter(r => r.disposition === 'empilée' && !r.petit && r.rectE).every(r => r.rectP === r.rectE),
      B.filter(r => r.disposition === 'empilée' && !r.petit && r.rectE && r.rectP !== r.rectE).map(r => r.taille + ' ' + r.rectP + ' → ' + r.rectE));
  }

  // ------------------------------------------------------------------ 2. Stabilité de l'image
  if (partie(2, 'Stabilité : geste, deux points, rotation, étalonnage au doigt à 334×468')) {
    for (const [w, h, dpr] of [[334, 468, 1], [360, 640, 3], [640, 360, 2], [1024, 768, 2]]) {
      const o = await onglet(w, h, {tactile: true, dpr});
      const r0 = await rectCanevas(o);
      const a = await ecranDe(o, 200, 150);
      await doigtPose(o, a.x, a.y); await pause(120);
      await doigtGlisse(o, a.x + 6, a.y + 4); await pause(150);
      const pendant = await rectCanevas(o);
      const consigne = await ev(o, `document.getElementById('instructions').textContent`);
      await doigtLeve(o); await pause(500);
      const r1 = await rectCanevas(o);
      const b = await ecranDe(o, 210, 160);
      await toucher(o, b.x, b.y); await pause(500);
      const r2 = await rectCanevas(o);
      const n = await ev(o, `data.getTotalPointCount()`);
      verifier(`${w}×${h} (densité ${dpr}) : image immobile pendant le geste (consigne « loupe ») et entre deux points`, r0 === pendant && pendant === r1 && r1 === r2 && n === 2 && /loupe/.test(consigne), {r0, pendant, r1, r2, n});
      if (w === 334) {
        await ev(o, `passerAuMode('Calibration')`); await pause(400);
        const e0 = await rectCanevas(o);
        for (const [vx, vy] of [[270, 305], [270, 112]]) {
          const p = await ecranDe(o, vx - 5, vy + 5), q = await ecranDe(o, vx, vy);
          await doigtPose(o, p.x, p.y); await pause(80);
          await doigtGlisse(o, q.x, q.y); await pause(150);
          await doigtLeve(o); await pause(300);
        }
        const e1 = await rectCanevas(o);
        const etat = await ev(o, `calibrator.state`);
        verifier('334×468 : étalonnage au doigt réussi, image immobile pendant les deux gestes', etat === 'waiting_distance' && e0 === e1, {etat, e0, e1});
        await capture(o, path.join(SORTIE, 'stabilite-334x468-etalonnage.png'));
      }
      journalPropre(o, `stabilité ${w}×${h}`);
      await fermer(o);
    }
    const o = await onglet(1024, 768, {tactile: true});
    const a = await ecranDe(o, 200, 150);
    await doigtPose(o, a.x, a.y); await pause(150);
    await redimensionner(o, 768, 1024, {tactile: true}); await pause(500);
    const msg = await ev(o, `document.getElementById('instructions').textContent`);
    await doigtLeve(o); await pause(300);
    const n = await ev(o, `data.getTotalPointCount()`);
    verifier('rotation pendant le geste : message, aucun point', n === 0 && /changé de taille/.test(msg), {n, msg});
    await pause(2700);
    const msg2 = await ev(o, `document.getElementById('instructions').textContent`);
    verifier('le message de rotation disparaît (2,5 s) et laisse la consigne', !/changé de taille/.test(msg2), msg2);
    await pret(o);
    await ev(o, `passerAuMode('Calibration')`); await pause(300);
    for (const [vx, vy] of [[270, 305], [270, 112]]) { const p = await ecranDe(o, vx, vy); await toucher(o, p.x, p.y); await pause(300); }
    await ev(o, `document.getElementById('real-distance').focus()`);
    await redimensionner(o, 1024, 768, {tactile: true}); await pause(600);
    const t = await ev(o, `(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),s=document.getElementById('scene').getBoundingClientRect();return {img:[r.left,r.top,r.right,r.bottom].map(Math.round),scene:[s.left,s.top,s.right,s.bottom].map(Math.round)};})()`);
    verifier('rotation pendant la saisie de la longueur : image redimensionnée, entière et centrée dans sa zone', t.img[0] >= t.scene[0] - 1 && t.img[2] <= t.scene[2] + 1 && t.img[3] <= t.scene[3] + 1 && t.img[1] >= t.scene[1] - 1, t);
    journalPropre(o, 'rotation');
    await fermer(o);
  }

  // ------------------------------------------------------------------ 3. Parcours complet
  if (partie(3, 'Parcours par l’interface : étalonnage 1,85 m → 10 points → graphiques → retour')) {
    const o = await onglet(1024, 768, {tactile: true});
    await choisir(o, 'choix-mode', 'Calibration'); await pause(200);
    for (const [vx, vy] of [[270, 305], [270, 112]]) {
      const a = await ecranDe(o, vx - 6, vy + 4), b = await ecranDe(o, vx, vy);
      await doigtPose(o, a.x, a.y); await pause(60);
      await doigtGlisse(o, b.x, b.y); await pause(120);
      await doigtLeve(o); await pause(150);
    }
    verifier('étalonnage : champ actif et vide après le 2e point', await ev(o, `!document.getElementById('real-distance').disabled && document.getElementById('real-distance').value===''`));
    await ev(o, `document.getElementById('real-distance').focus()`);
    await saisir(o, '1,85 m');
    const apercu = await ev(o, `document.getElementById('calibration-message').textContent`);
    await ev(o, `document.getElementById('validate-calibration').click()`);
    const etal = await ev(o, `({echelle:data.echelle, px:calibrator.pixelDistance, passer:!document.getElementById('passer-pointage').hidden})`);
    // Les deux touchers visaient (270 ; 305) et (270 ; 112) : 193 px vidéo, à 1 px d'écran près
    const unPx3 = await ev(o, `dimensionsSource().w/width`);
    verifier('« 1,85 m » accepté, conversion affichée ; échelle = 1,85 m / 193 px vidéo (distance visée, à 1 px d’écran près)', /1,85 m/.test(apercu) && Math.abs(etal.px - 193) <= 2 * unPx3 &&
      Math.abs(etal.echelle - 1.85 / 193) <= 1.85 / 193 * 2 * unPx3 / 193 + 1e-12 && etal.passer, {apercu, ...etal});
    await ev(o, `document.getElementById('real-distance').focus()`);
    await effacerChamp(o); await saisir(o, 'quatre-vingts');
    await ev(o, `document.getElementById('validate-calibration').click()`);
    await pause(500);
    const err = await ev(o, `({classe:document.getElementById('real-distance').classList.contains('erreur'),msg:document.getElementById('calibration-message').textContent})`);
    verifier('saisie invalide : erreur visible qui reste (pas effacée par le dessin)', err.classe && /comprends pas/.test(err.msg), err);
    await ev(o, `document.getElementById('real-distance').focus()`);
    await effacerChamp(o); await saisir(o, '1,85 m');
    await ev(o, `document.getElementById('passer-pointage').click()`);
    await pret(o);
    for (let k = 0; k < 10; k++) {
      await jusqua(o, `lecteur().pret()`);
      const p = await ecranDe(o, 200 + 3 * k, 60 + 15 * k);
      await toucher(o, p.x, p.y);
      await pause(300);
    }
    await jusqua(o, `lecteur().pret()`);
    const m = await ev(o, `({n:data.getTotalPointCount(), images:data.points[0].map(p=>p.image), image:lecteur().image})`);
    verifier('10 points sur les images 0 à 9', m.n === 10 && m.images.join() === '0,1,2,3,4,5,6,7,8,9', m);
    const csv = await ev(o, `construireCSV()`);
    const lignes = csv.split('\r\n');
    verifier('CSV : CRLF, point-virgule, virgule décimale, en-têtes « Image n° », « instant t », « durée Δt », « v = d / Δt »', csv.endsWith('\r\n') &&
      lignes.filter(l => /^1;\d+;/.test(l)).length === 10 && !/\d\.\d/.test(lignes.slice(2).join('')) && /Image n°/.test(lignes[2]) && /instant t \(s\)/.test(lignes[2]) && /durée Δt/.test(lignes[2]) && /v = d \/ Δt \(m\/s\)/.test(lignes[2]), lignes.slice(0, 4));
    writeFileSync(path.join(SORTIE, 'mesures.csv'), '﻿' + csv);
    await choisir(o, 'choix-mode', 'Graphique'); await pause(400);
    await capture(o, path.join(SORTIE, 'parcours-graphique.png'));
    await choisir(o, 'choix-type-graphique', 'ecarts'); await pause(300);
    const ticks = await ev(o, `graph.chart.scales.y.ticks.map(t=>t.label)`);
    verifier('graphique des écarts : graduations sans doublon ni « -0 »', new Set(ticks).size === ticks.length && !ticks.some(t => /^-0(,0*)?$/.test(t)), ticks);
    await choisir(o, 'choix-mode', 'Pointage'); await pause(300);
    await jusqua(o, `lecteur().pret()`);
    const retour = await ev(o, `({n:data.getTotalPointCount(), image:lecteur().image, echelle:data.echelle})`);
    verifier('retour au pointage : 10 points et étalonnage gardés, reprise à l’image 10', retour.n === 10 && retour.image === 10 && retour.echelle > 0, retour);
    await ev(o, `document.getElementById('bouton-annuler').click()`);
    await jusqua(o, `lecteur().pret()`);
    verifier('Annuler : 9 points, retour à l’image 9', await ev(o, `data.getTotalPointCount()===9 && lecteur().image===9`));
    await choisir(o, 'choix-mode', 'Calibration'); await pause(300);
    const rouvert = await ev(o, `({etat:calibrator.state, msg:document.getElementById('calibration-message').textContent, echelle:calibrator.texteEchelle()})`);
    verifier('étalonnage rouvert : segment gardé, message = échelle en vigueur', rouvert.etat === 'calibrated' && rouvert.msg.includes(rouvert.echelle), rouvert);
    await choisir(o, 'choix-mode', 'Pointage');
    await choisirVideoSansAttente(o, TABLE);
    const conf = await ev(o, `({visible:!document.getElementById('confirmation').hidden, texte:document.getElementById('confirmation-texte').textContent})`);
    const p = await ecranDe(o, 100, 250);
    await toucher(o, p.x, p.y); await pause(300);
    const pendant = await ev(o, `data.getTotalPointCount()`);
    await touche(o, 'Escape', 'Escape', 27); await pause(200);
    const garde = await ev(o, `({ferme:document.getElementById('confirmation').hidden, n:data.getTotalPointCount(), menu:document.getElementById('choix-video').value, src:lecteur().chemin})`);
    verifier('changer de vidéo : question ; toucher bloqué pendant la question ; Échap = garder (menu rétabli)', conf.visible && pendant === 9 && garde.ferme && garde.n === 9 && garde.src === CHUTE && garde.menu === '0', {conf, pendant, garde});
    journalPropre(o, 'parcours');
    await fermer(o);
  }

  // ------------------------------------------------------------------ 4. Ancienne version
  if (partie(4, 'Comparaison avec l’ancienne version (fc875fe), mêmes positions vidéo')) {
    let ancienne = null;
    try {
      ancienne = mkdtempSync(path.join(tmpdir(), 'jsmeca-ancienne-'));
      // (depuis la racine du dépôt : lancé dans un sous-dossier, git archive filtrerait tout)
      const depot = execFileSync('git', ['-C', RACINE, 'rev-parse', '--show-toplevel']).toString().trim();
      const tar = execFileSync('git', ['-C', depot, 'archive', '--format=tar', 'fc875fe:jsmecavideo'], {maxBuffer: 1 << 28});
      execFileSync('tar', ['-x', '-C', ancienne], {input: tar});
    } catch (e) { ancienne = null; }
    if (!ancienne) {
      verifier('ancienne version extraite par git (fc875fe)', false, 'git indisponible : comparaison NON faite');
    } else {
      // Chrome arrondit les positions de souris au pixel d'écran (même pour des événements
      // créés en JavaScript) : on ne peut pas donner exactement la même position vidéo aux deux
      // versions par la souris. On injecte donc les mêmes positions vidéo à l'ENTRÉE du pointage
      // de chaque version (traiterPointage, juste après la conversion écran → image) ; la
      // conversion écran → vidéo de la nouvelle version est vérifiée à part (partie 5).
      const srvA = await servir(ancienne);
      const POS = [...Array(8).keys()].map(k => [200 + 2.37 * k, 60.5 + 17.13 * k]);
      const ETAL = [[270.25, 305.5], [270.25, 112.25]];
      const a = await ouvrirOnglet(c, srvA.base + '/index.html', 1366, 768);
      await jusqua(a, `videoPlayer && videoPlayer.isLoaded`);
      // Ancienne version : repère interne 800×600, vidéo centrée (bandes noires)
      const interneA = (vx, vy) => `(()=>{const vw=videoPlayer.video.elt.videoWidth,vh=videoPlayer.video.elt.videoHeight;let h=600,w=h*vw/vh;if(w>800){w=800;h=800*vh/vw;}const x0=(800-w)/2,y0=(600-h)/2,s=w/vw;return [x0+${vx}*s,y0+${vy}*s];})()`;
      await ev(a, `dropdown.elt.value=' Calibration'; dropdown.elt.dispatchEvent(new Event('change'));`); await pause(300);
      for (const [vx, vy] of ETAL) await ev(a, `traiterPointage(...${interneA(vx, vy)})`);
      await ev(a, `document.getElementById('real-distance').value='1,85';document.getElementById('validate-calibration').click();`);
      await ev(a, `dropdown.elt.value=' Pointage Vidéo'; dropdown.elt.dispatchEvent(new Event('change'));`); await pause(300);
      await jusqua(a, `videoPlayer.isLoaded`);
      for (const [vx, vy] of POS) { await ev(a, `traiterPointage(...${interneA(vx, vy)})`); await pause(400); }
      const A = await ev(a, `data.getIntervalles(0).map(iv=>({d:iv.d,duree:iv.duree}))`);
      await fermer(a); await srvA.close();
      const n = await onglet(1366, 768);
      await choisir(n, 'choix-mode', 'Calibration'); await pause(300);
      for (const [vx, vy] of ETAL) await ev(n, `traiterPointage(${vx},${vy})`);
      await ev(n, `(()=>{const s=document.getElementById('real-distance');s.value='1,85 m';document.getElementById('validate-calibration').click();})()`);
      await ev(n, `document.getElementById('passer-pointage').click()`); await pret(n);
      for (const [vx, vy] of POS) { await jusqua(n, `lecteur().pret()`); await ev(n, `traiterPointage(${vx},${vy})`); await pause(100); }
      const N = await ev(n, `data.intervallesBruts(0).map(iv=>({d:iv.d,duree:iv.duree}))`);
      await fermer(n);
      const memes = A.length === 7 && N.length === 7 && A.every((x, i) => Math.abs(x.d / N[i].d - 1) < 1e-9 && Math.abs(x.duree - N[i].duree) < 1e-9);
      verifier('mêmes positions vidéo injectées à l’entrée du pointage des deux versions (étalonnage 1,85 m) → mêmes d et Δt (écart relatif < 1e-9)', memes,
        {ancienne: A.slice(0, 2), nouvelle: N.slice(0, 2)});
      rmSync(ancienne, {recursive: true, force: true});
    }
  }

  // ------------------------------------------------------------------ 5. Exactitude du pointage
  if (partie(5, 'Exactitude : vrai clic au centre de la tache rouge du mobile')) {
    const res = [];
    for (const [w, h] of [[1024, 768], [1920, 1080], [768, 1024]]) {
      const o = await onglet(w, h);
      await choisirVideo(o, TABLE);
      const centre = await ev(o, `(()=>{const v=videoPlayer.elt,c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');x.drawImage(v,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let sx=0,sy=0,n=0;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(r>140&&r-g>60&&r-b>60){const p=i/4;sx+=p%c.width;sy+=Math.floor(p/c.width);n++;}}return {x:sx/n+0.5,y:sy/n+0.5,n};})()`);
      const affiche = await ev(o, `(()=>{const c=document.querySelector('canvas'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data,s=dimensionsSource();let sx=0,sy=0,n=0;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(r>140&&r-g>60&&r-b>60){const p=i/4;sx+=p%c.width;sy+=Math.floor(p/c.width);n++;}}return {x:(sx/n+0.5)*s.w/c.width,y:(sy/n+0.5)*s.h/c.height,n};})()`);
      const p = await ecranDe(o, centre.x, centre.y);
      await clic(o, p.x, p.y); await pause(300);
      const pt = await ev(o, `(()=>{const p=data.points[0][0]||{xpx:NaN,ypx:NaN};return {x:p.xpx,y:dimensionsSource().h-p.ypx};})()`);
      const unPx = await ev(o, `dimensionsSource().w/width`);
      res.push({taille: w + '×' + h, centre, affiche, pt, unPx});
      await fermer(o);
    }
    const ecart = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    // Chrome envoie des positions de souris entières : écart toléré = 1 px d'écran sur chaque axe
    const ecartAxe = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    verifier('vrai clic (position entière à l’écran) au centre de la tache rouge → point à moins de 1 px d’écran du centre sur chaque axe (3 tailles)', res.every(r => ecartAxe(r.pt, r.centre) <= r.unPx), res.map(r => [r.taille, ecartAxe(r.pt, r.centre).toFixed(2) + ' px vidéo', '1 px écran = ' + r.unPx.toFixed(2) + ' px vidéo']));
    verifier('image affichée calée sur le repère vidéo : centre de la tache à moins de 1 px vidéo', res.every(r => ecart(r.affiche, r.centre) < 1), res.map(r => [r.taille, ecart(r.affiche, r.centre).toFixed(2)]));
    rapport.exactitude = res;
  }

  // ------------------------------------------------------------------ 6. Longueurs
  if (partie(6, 'Saisie des longueurs et vraisemblance')) {
    const o = await onglet(1024, 768);
    const cas = await ev(o, `['80 cm','0,8','0.8 m','800 mm','1,85m','80cm',' 0,80 m ','12 centimètres','200 000 000 km','185','80','abc','0','','1,2,3'].map(t=>[t,lireLongueur(t).metres??null,!!lireLongueur(t).uniteManquante])`);
    const attendu = [0.8, 0.8, 0.8, 0.8, 1.85, 0.8, 0.8, 0.12, 2e11, null, null, null, null, null, null];
    verifier('« 80 cm », « 0,8 », « 800 mm », « 200 000 000 km » acceptés ; « 185 » et « 80 » sans unité refusés (unité demandée)', cas.every((x, i) => attendu[i] === null ? x[1] === null : Math.abs(x[1] - attendu[i]) < 1e-9) && cas[9][2] && cas[10][2], cas);
    await choisir(o, 'choix-mode', 'Calibration'); await pause(200);
    for (const [vx, vy] of [[270, 305], [270, 112]]) { const p = await ecranDe(o, vx, vy); await clic(o, p.x, p.y); await pause(300); }
    await ev(o, `(()=>{const s=document.getElementById('real-distance');s.value='185 cm';s.dispatchEvent(new Event('input'));document.getElementById('validate-calibration').click();})()`);
    const ok185 = await ev(o, `calibrator.isCalibrated`);
    await ev(o, `resetCalibration()`);
    for (const [vx, vy] of [[270, 305], [270, 112]]) { const p = await ecranDe(o, vx, vy); await clic(o, p.x, p.y); await pause(300); }
    await ev(o, `(()=>{const s=document.getElementById('real-distance');s.value='185 m';s.dispatchEvent(new Event('input'));document.getElementById('validate-calibration').click();})()`);
    const v1 = await ev(o, `({cal:calibrator.isCalibrated,msg:document.getElementById('calibration-message').textContent})`);
    await ev(o, `document.getElementById('validate-calibration').click()`);
    const v2 = await ev(o, `calibrator.isCalibrated`);
    verifier('balle lâchée (étalon 1,85 m) : « 185 cm » accepté ; « 185 m » demande vérification, puis accepté au 2e « Valider »', ok185 && !v1.cal && /Vérifie/.test(v1.msg) && v2, {ok185, v1, v2});
    journalPropre(o, 'longueurs');
    await fermer(o);
  }

  // ------------------------------------------------------------------ 7. Fin de vidéo, clavier
  if (partie(7, 'Fin de vidéo, lecture jusqu’au bout, clavier, double-clic, remplacement, insertion')) {
    for (const [video, derniere] of [[CHUTE, 16], [TABLE, 59], ['videos/Eclatement2MA.mp4', 69]]) {
      const o = await onglet(1024, 768, {tactile: true});
      await choisirVideo(o, video);
      await ev(o, `window.__recherches=0;videoPlayer.elt.addEventListener('seeking',()=>__recherches++);videoPlayer.allerImage(videoPlayer.derniereImage())`);
      await jusqua(o, `!videoPlayer.enDeplacement`);
      const atteinte = await ev(o, `({image:videoPlayer.image, affichee:videoPlayer.indiceImage(), derniere:videoPlayer.derniereImage()})`);
      const reference = await compareReference(o, video, derniere);
      verifier(`${video.slice(7)} : l’image affichée est l’image ${derniere} du fichier (comparée aux images ${derniere} et ${derniere - 1} extraites par ffmpeg)`, reference.ok, reference);
      await ev(o, `__recherches=0`);
      for (let i = 0; i < 2; i++) { const p = await ecranDe(o, 100 + 5 * i, 100); await toucher(o, p.x, p.y); await pause(400); }
      await pause(3000);
      const r = await ev(o, `({recherches:__recherches, enDeplacement:videoPlayer.enDeplacement, voir:!document.getElementById('bouton-voir-graphiques').hidden, n:data.getTotalPointCount()})`);
      verifier(`${video.slice(7)} : dernière image (${derniere}) atteinte ; la pointer deux fois puis attendre 3 s : aucune recherche (compteur remis à zéro avant les touchers) ; « Voir les graphiques » reste`,
        atteinte.image === derniere && r.recherches === 0 && !r.enDeplacement && r.voir && r.n === 1, {atteinte, ...r});
      if (video === CHUTE) {
        await capture(o, path.join(SORTIE, 'fin-de-video.png'));
        await ev(o, `data.clearAllPoints(); videoPlayer.allerImage(0)`); await jusqua(o, `!videoPlayer.enDeplacement`);
        await ev(o, `videoPlayer.play()`); await jusqua(o, `!videoPlayer.isPlaying && !videoPlayer.enDeplacement`, 200);
        const p = await ecranDe(o, 100, 100); await toucher(o, p.x, p.y); await pause(500);
        const l = await ev(o, `({n:data.getTotalPointCount(), image:videoPlayer.image, msg:document.getElementById('instructions').textContent})`);
        verifier('lecture jusqu’au bout puis toucher : retour à la première image, aucun point, message', l.n === 0 && l.image === 0 && /Retour à l’image de travail/.test(l.msg), l);
      }
      journalPropre(o, 'fin ' + video.slice(7));
      await fermer(o);
    }
    const o = await onglet(1366, 768);
    await ev(o, `document.querySelector('canvas').focus()`);
    await touche(o, 'Enter', 'Enter', 13); // Entrée : le réticule apparaît au centre
    for (let i = 0; i < 5; i++) await touche(o, 'ArrowRight', 'ArrowRight', 39);
    await pause(200); // la consigne est réécrite à l'image suivante du dessin
    const pendant = await ev(o, `({image:lecteur().image, consigne:document.getElementById('instructions').textContent})`);
    await touche(o, 'Enter', 'Enter', 13); await pause(400);
    const k1 = await ev(o, `({n:data.getTotalPointCount(), p:data.points[0][0], s:dimensionsSource(), image:lecteur().image})`);
    verifier('clavier : Entrée fait apparaître le réticule, les flèches le déplacent (image inchangée, consigne du réticule), Entrée pointe (centre + 5 px)',
      pendant.image === 0 && /Échap/.test(pendant.consigne) && k1.n === 1 && Math.abs(k1.p.xpx - (k1.s.w / 2 + 5)) < 1e-6 && k1.image === 1, {pendant, k1});
    await touche(o, 'Backspace', 'Backspace', 8); await pause(300);
    verifier('clavier : Retour arrière annule', await ev(o, `data.getTotalPointCount()===0 && lecteur().image===0`));
    await touche(o, 'Escape', 'Escape', 27);
    await touche(o, 'ArrowRight', 'ArrowRight', 39); await pause(300);
    verifier('clavier : après Échap, → passe à l’image suivante (l’image garde le focus)', await ev(o, `lecteur().image===1 && !clavier.actif && document.activeElement.tagName==='CANVAS'`));
    await touche(o, 'Home', 'Home', 36); await pause(300);
    const p = await ecranDe(o, 100, 100);
    await o.c.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: p.x, y: p.y}, o.s);
    for (const n of [1, 2]) {
      await o.c.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: n}, o.s);
      await o.c.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: n}, o.s);
    }
    await pause(400);
    verifier('double-clic : un seul point', await ev(o, `data.getTotalPointCount()===1`));
    await ev(o, `lecteur().allerImage(0)`); await jusqua(o, `lecteur().pret()`);
    const q = await ecranDe(o, 120, 110); await clic(o, q.x, q.y); await pause(400);
    const rempl = await ev(o, `({n:data.getTotalPointCount(), x:data.points[0][0].xpx, msg:document.getElementById('instructions').textContent})`);
    verifier('pointer une image déjà pointée remplace son point', rempl.n === 1 && Math.abs(rempl.x - 120) < 0.5 && /remplacé/.test(rempl.msg), rempl);
    await ev(o, `lecteur().allerImage(5)`); await jusqua(o, `lecteur().pret()`);
    const r = await ecranDe(o, 130, 110); await clic(o, r.x, r.y); await pause(400);
    await ev(o, `lecteur().allerImage(3)`); await jusqua(o, `lecteur().pret()`);
    const s2 = await ecranDe(o, 125, 110); await clic(o, s2.x, s2.y); await pause(400);
    const ins = await ev(o, `document.getElementById('instructions').textContent`);
    await ev(o, `document.getElementById('bouton-annuler').click()`); await pause(300);
    const apres = await ev(o, `document.getElementById('instructions').textContent`);
    verifier('point inséré : message, puis Annuler efface ce message', /inséré/.test(ins) && !/inséré/.test(apres), {ins, apres});
    journalPropre(o, 'clavier');
    await fermer(o);
  }

  // ------------------------------------------------------------------ 8. browser-check.mjs
  if (partie(8, 'Compatibilité avec browser-check.mjs du site')) {
    const o = await onglet(1280, 1000);
    await jusqua(o, `(()=>{const v=document.querySelector('video');return !!v&&v.readyState>=2;})()`);
    const spot = await ev(o, `(()=>{const c=document.querySelector('canvas').getBoundingClientRect();return {x:c.left+c.width/2,y:c.top+120};})()`);
    for (let i = 0; i < 3; i++) { await clic(o, spot.x + i * 12, spot.y); await pause(400); }
    const r = await ev(o, `({points:data.getTotalPointCount(), time:videoPlayer.video.time()})`);
    verifier('3 clics → 3 points, la vidéo avance (videoPlayer.video.time() > 0)', r.points === 3 && r.time > 0, r);
    await fermer(o);
    const t = await onglet(1024, 768, {tactile: true});
    const s = await ev(t, `(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+Math.min(r.height/2,140)};})()`);
    await toucher(t, s.x, s.y); await pause(400);
    verifier('toucher en 1024×768 → 1 point', await ev(t, `data.getTotalPointCount()===1`));
    await fermer(t);
  }

  // ------------------------------------------------------------------ 9. Webcam
  if (partie(9, 'Webcam simulée : instants réels, ré-enregistrement')) {
    // Horloge indépendante : pour chaque image de la caméra, l'instant performance.now() de son
    // appel, relevé avant que l'app ne le reçoive
    const o = await ouvrirOnglet(c, 'about:blank', 1024, 768);
    o.base = srv.base;
    await o.c.send('Page.addScriptToEvaluateOnNewDocument', {source: `(()=>{const orig=HTMLVideoElement.prototype.requestVideoFrameCallback;if(!orig)return;window.__horloge=new Map();
      HTMLVideoElement.prototype.requestVideoFrameCallback=function(f){return orig.call(this,(now,meta)=>{window.__horloge.set(meta.mediaTime,performance.now()/1000);f(now,meta);});};})();`}, o.s);
    await o.c.send('Page.navigate', {url: srv.base + '/index.html'}, o.s);
    await pause(800); await pret(o);
    await ev(o, `(()=>{const s=document.getElementById('choix-video');s.value='webcam';s.dispatchEvent(new Event('change'));})()`);
    await jusqua(o, `webcamPlayer && webcamPlayer.isLoaded`);
    await ev(o, `webcamPlayer.toggleRecording()`); await pause(1500);
    await ev(o, `webcamPlayer.toggleRecording()`); await jusqua(o, `webcamPlayer.isRecorded`); await pause(300);
    for (let i = 0; i < 3; i++) { await jusqua(o, `lecteur().pret()`); const p = await ecranDe(o, 100 + 20 * i, 100); await clic(o, p.x, p.y); await pause(300); }
    const w = await ev(o, `({images:webcamPlayer.images.length, n:data.getTotalPointCount(), durees:data.intervallesBruts(0).map(i=>i.duree),
      horloge:webcamPlayer.instants.slice(0,3).map(t=>__horloge.get(t)), guide:texteDureeEntrePoints()})`);
    const attendu = w.horloge.slice(1).map((t, i) => t - w.horloge[i]);
    verifier('webcam : Δt du tableau = écarts mesurés par une horloge indépendante (à 10 ms près) ; le guide n’annonce pas de durée fixe', w.images > 5 && w.n === 3 && w.horloge.every(Number.isFinite) &&
      w.durees.every((d, i) => Math.abs(d - attendu[i]) < 0.010) && /mesurée/.test(w.guide), {durees: w.durees, horloge: attendu, guide: w.guide});
    await ev(o, `webcamPlayer.toggleRecording()`); await pause(300);
    const q = await ev(o, `({question:!document.getElementById('confirmation').hidden, enregistre:webcamPlayer.isRecording})`);
    await repondre(o, 'oui'); await pause(800);
    const apres = await ev(o, `({n:data.getTotalPointCount(), enregistre:webcamPlayer.isRecording})`);
    await ev(o, `webcamPlayer.toggleRecording()`);
    verifier('nouvel enregistrement avec des points : question, puis points effacés et enregistrement lancé', q.question && !q.enregistre && apres.n === 0 && apres.enregistre, {q, apres});
    await capture(o, path.join(SORTIE, 'webcam.png'));
    journalPropre(o, 'webcam');
    await fermer(o);
  }

  // ------------------------------------------------------------------ 10. Sauvegarde de séance
  if (partie(10, 'Reprise après rechargement : Échap, blocage, sauvegardes corrompues')) {
    const o = await onglet(1024, 768);
    for (let k = 0; k < 4; k++) { await jusqua(o, `lecteur().pret()`); const p = await ecranDe(o, 200, 60 + 20 * k); await clic(o, p.x, p.y); await pause(300); }
    await o.c.send('Page.reload', {}, o.s); await pause(800);
    await jusqua(o, `!document.getElementById('confirmation').hidden`);
    await touche(o, 'Escape', 'Escape', 27); await pause(200);
    const echap = await ev(o, `({ouverte:!document.getElementById('confirmation').hidden, sauvee:!!sessionStorage.getItem('jsmecavideo-seance-v1')})`);
    await pret(o);
    const p = await ecranDe(o, 100, 100); await clic(o, p.x, p.y); await pause(300);
    const bloque = await ev(o, `data.getTotalPointCount()`);
    await capture(o, path.join(SORTIE, 'reprise.png'));
    await repondre(o, 'oui');
    await pret(o); await jusqua(o, `lecteur().pret() && lecteur().image===4`);
    const r = await ev(o, `({n:data.getTotalPointCount(), local:localStorage.length})`);
    verifier('« Reprendre ? » : Échap ne détruit rien (question toujours là), pointage bloqué pendant la question, puis reprise des 4 points', echap.ouverte && echap.sauvee && bloque === 0 && r.n === 4 && r.local === 0, {echap, bloque, r});
    const corrompues = [
      {video: CHUTE, pas: 1, etat: 'Pointage', data: {numMobiles: 0, points: [], historique: []}, calibrateur: {}},
      {video: CHUTE, pas: 1, etat: 'Pointage', data: {numMobiles: 1, points: [[{image: 2, xpx: 1, ypx: 1}, {image: 2, xpx: 3, ypx: 3}]], historique: []}, calibrateur: {}},
      {video: CHUTE, pas: 1, etat: 'Pointage', data: {numMobiles: 1, points: [[{image: 99, xpx: 1, ypx: 1}]], historique: []}, calibrateur: {}},
      {video: CHUTE, pas: 1, etat: 'Pointage', data: {numMobiles: 7, points: [[]], historique: []}, calibrateur: {}},
      {video: CHUTE, pas: 1, etat: 'Pointage', data: {numMobiles: 1, points: [[{image: 1, xpx: 1, ypx: 1}]], historique: [{m: 3, image: 1}]}, calibrateur: {}},
      {video: CHUTE, pas: 1, etat: 'Pointage', data: {numMobiles: 1, points: [[{image: 1, xpx: 1, ypx: 1}]], historique: []}, calibrateur: {state: 'calibrated', realDistance: -2, point1: {x: 1, y: 1}, point2: {x: 1, y: 1}}},
      'pas du JSON'
    ];
    let ignorees = 0;
    for (const s of corrompues) {
      // Empreinte et dimensions recalculées comme le ferait l'app : c'est la validation de fond qui doit refuser
      if (typeof s === 'string') await ev(o, `sessionStorage.setItem('jsmecavideo-seance-v1', ${JSON.stringify(s)})`);
      else await ev(o, `(()=>{const o=${JSON.stringify(s)};o.dims={w:400,h:320};o.controle=empreinteSeance(o);sessionStorage.setItem('jsmecavideo-seance-v1',JSON.stringify(o));})()`);
      await o.c.send('Page.reload', {}, o.s); await pause(700);
      await pret(o);
      const etat = await ev(o, `({question:!document.getElementById('confirmation').hidden, n:data.getTotalPointCount()})`);
      await touche(o, 'z', 'KeyZ', 90, 2); await pause(150);
      if (!etat.question && etat.n === 0) ignorees++;
    }
    verifier('7 sauvegardes incohérentes (empreinte recalculée : rejet par la validation de fond) ignorées, Ctrl+Z sans erreur', ignorees === corrompues.length, {ignorees});
    journalPropre(o, 'reprise');
    await fermer(o);
  }

  // ------------------------------------------------------------------ 11. Chargement des vidéos
  if (partie(11, 'Vidéo chargée en blob ; repli quand le chargement complet échoue')) {
    const sansRange = await servir(RACINE, 0, {sansRange: true});
    const o = await onglet(1024, 768, {base: sansRange.base});
    await ev(o, `lecteur().allerImage(7)`); await jusqua(o, `lecteur().pret()`);
    const t = await ev(o, `({image:lecteur().image, affichee:lecteur().indiceImage(), blob:lecteur().elt.src.startsWith('blob:')})`);
    verifier('serveur sans Range, vidéo chargée en entier (blob:) : aller à l’image 7 fonctionne', t.blob && t.image === 7 && t.affichee === 7, t);
    await fermer(o);
    const f = await ouvrirOnglet(c, 'about:blank', 1024, 768);
    await f.c.send('Page.addScriptToEvaluateOnNewDocument', {source: 'window.fetch = () => Promise.reject(new Error("bloqué pour le test"));'}, f.s);
    await f.c.send('Page.navigate', {url: sansRange.base + '/index.html'}, f.s);
    f.base = sansRange.base;
    await pause(1000);
    await jusqua(f, `lecteur() && lecteur().isLoaded && lecteur().repli`);
    await ev(f, `lecteur().allerImage(7)`); await pause(2500);
    const r = await ev(f, `({impossible:lecteur().deplacementImpossible, image:lecteur().image, affichee:lecteur().indiceImage()})`);
    const p = await ecranDe(f, 100, 100); await clic(f, p.x, p.y); await pause(300);
    const n = await ev(f, `({n:data.getTotalPointCount(), msg:document.getElementById('instructions').textContent})`);
    verifier('sans blob ni Range : si l’image demandée n’est pas affichée, pointage refusé avec un message (jamais de point sur une autre image)',
      (r.impossible && n.n === 0 && /impossible/i.test(n.msg)) || (!r.impossible && r.image === r.affichee), {r, n});
    await fermer(f);
    await sansRange.close();
  }

  // ------------------------------------------------------------------ 12. Nombres justes
  if (partie(12, 'Durées inégales, plusieurs mobiles, cadence, unités, nom du fichier, cohérence')) {
    const o = await onglet(1366, 768);
    for (let k = 0; k < 3; k++) { await jusqua(o, `lecteur().pret()`); const p = await ecranDe(o, 200, 60 + 20 * k); await clic(o, p.x, p.y); await pause(300); }
    await choisir(o, 'choix-pas', 5);
    await jusqua(o, `lecteur().pret()`); const p = await ecranDe(o, 200, 200); await clic(o, p.x, p.y); await pause(300);
    await jusqua(o, `lecteur().pret()`); const p2 = await ecranDe(o, 200, 260); await clic(o, p2.x, p2.y); await pause(300);
    await choisir(o, 'choix-mode', 'Graphique'); await choisir(o, 'choix-type-graphique', 'ecarts'); await pause(300);
    const g = await ev(o, `({alerte:!document.getElementById('graph-alerte').hidden && document.getElementById('graph-alerte').textContent, aide:document.getElementById('graph-aide').textContent, guide:ETAPES_GUIDE[3].texte(), entete:construireCSV().split('\\r\\n')[0]})`);
    await capture(o, path.join(SORTIE, 'durees-inegales.png'));
    await choisir(o, 'choix-type-graphique', 'tableau'); await pause(200);
    const tab = await ev(o, `!!document.querySelector('#tableau-zone .alerte-durees')`);
    verifier('durées inégales : alerte sur le graphique et le tableau, pas d’aide « plus hautes → accéléré », guide et en-tête du CSV honnêtes',
      g.alerte && /pas toutes égales/.test(g.alerte) && !/accéléré/.test(g.aide) && /pas tous séparés/.test(g.guide) && /INÉGALES/.test(g.entete) && tab, g);
    const lignes = await ev(o, `[...document.querySelectorAll('#tableau-mesures tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent))`);
    const num = s => parseFloat(s.replace(/\u202f/g, '').replace(',', '.'));
    // Unité du dernier chiffre de v : 10^-decV (decV peut être négatif : arrondi à la dizaine…)
    const decV = await ev(o, `data.formats().v`);
    const coherent = lignes.filter(l => l[5]).every(l => Math.abs(num(l[5]) / num(l[6]) - num(l[7])) <= Math.pow(10, -decV) + 1e-9);
    verifier('tableau : d / Δt refait avec les valeurs affichées redonne v affichée à une unité du dernier chiffre près', coherent && lignes.length === 5, lignes.slice(0, 3));
    await choisir(o, 'choix-mode', 'Pointage');
    await choisir(o, 'choix-mobiles', 2); await pause(200);
    if (await ev(o, `!document.getElementById('confirmation').hidden`)) await repondre(o, 'oui');
    await choisir(o, 'choix-pas', 1);
    await ev(o, `lecteur().allerImage(0)`); await jusqua(o, `lecteur().pret()`);
    for (const [x, y] of [[100, 100], [250, 100]]) { await jusqua(o, `lecteur().pret()`); const q = await ecranDe(o, x, y); await clic(o, q.x, q.y); await pause(300); }
    await jusqua(o, `lecteur().pret()`);
    const q1 = await ecranDe(o, 110, 110); await clic(o, q1.x, q1.y); await pause(300);
    await ev(o, `lecteur().nextFrame()`); await pause(200);
    const avert = await ev(o, `document.getElementById('instructions').textContent`);
    await jusqua(o, `lecteur().pret()`);
    for (const [x, y] of [[120, 120], [240, 120]]) { await jusqua(o, `lecteur().pret()`); const q = await ecranDe(o, x, y); await clic(o, q.x, q.y); await pause(300); }
    await choisir(o, 'choix-mode', 'Graphique'); await choisir(o, 'choix-type-graphique', 'ecarts'); await pause(300);
    const barres = await ev(o, `({labels:graph.chart.data.labels, m2:graph.chart.data.datasets.find(d=>/Mobile 2/.test(d.label)).data})`);
    // Mobile 1 : images 0, 1, 2 ; mobile 2 : images 0 et 2 (sauté à l'image 1)
    verifier('2 mobiles : passer à l’image suivante sans les deux avertit ; barres alignées par images (0→1, 0→2, 1→2)', /1 mobile sur 2/.test(avert) && barres.labels.join() === '0→1,0→2,1→2' && barres.m2[0] === null && barres.m2[1] !== null && barres.m2[2] === null, {avert, barres});
    await fermer(o);
    const b = await onglet(1024, 768);
    await choisirVideo(b, 'videos/bille3-iv5.mp4');
    for (let k = 0; k < 2; k++) { await jusqua(b, `lecteur().pret()`); const q = await ecranDe(b, 300, 100 + 50 * k); await clic(b, q.x, q.y); await pause(300); }
    const bille = await ev(b, `({duree:data.intervallesBruts(0)[0].duree, guide:texteDureeEntrePoints()})`);
    verifier('bille3 : Δt = 1/30 s (panneau filmé) et non 1/31 s (fichier) ; le guide dit « 1 image (0,0333 s) »', Math.abs(bille.duree - 1 / 30) < 1e-9 && bille.guide === '1 image (0,0333 s)', bille);
    await choisirVideo(b, 'videos/VenusTerreMars.mp4');
    await choisir(b, 'choix-mode', 'Calibration'); await pause(200);
    // Barre de 200 000 000 km : de x = 10 à x = 193, y = 10 (pixels de l'image, mesurés sur l'image extraite)
    for (const [vx, vy] of [[10, 10], [193, 10]]) { const q = await ecranDe(b, vx, vy); await clic(b, q.x, q.y); await pause(300); }
    await ev(b, `document.getElementById('real-distance').focus()`);
    await saisir(b, '200 000 000 km');
    await ev(b, `document.getElementById('validate-calibration').click()`);
    await ev(b, `passerAuMode('Pointage')`); await pret(b);
    for (let k = 0; k < 2; k++) { await jusqua(b, `lecteur().pret()`); const q = await ecranDe(b, 226 + 10 * k, 120 - 5 * k); await clic(b, q.x, q.y); await pause(300); }
    const guide3 = await ev(b, `(()=>{const a=texteDureeEntrePoints();imagesParPoint=5;const c=texteDureeEntrePoints();imagesParPoint=1;return [a,c];})()`);
    verifier('guide (étape 3), animation : « 1 image (25 jours) », « 5 images (125 jours) »', guide3[0] === '1 image (25 jours)' && guide3[1] === '5 images (125 jours)', guide3);
    const venus = await ev(b, `({cal:calibrator.isCalibrated, unite:data.getUnite(), v:data.uniteVitesse(), duree:data.intervallesBruts(0)[0].duree, entetes:tableauMesures().entetes, etat:document.getElementById('frame-info').textContent, guide:ETAPES_GUIDE[0].texte()})`);
    verifier('animation : distances en km, temps en jours (25 jours par image), vitesses en km/jour, référentiel du Soleil dans le guide', venus.cal && venus.unite === 'km' && venus.v === 'km/jour' && venus.duree === 25 &&
      venus.entetes.includes('instant t (jours)') && /jours/.test(venus.etat) && /Soleil/.test(venus.guide) && !/par rapport au sol/.test(venus.guide), venus);
    await choisirVideoSansAttente(b, TABLE);
    if (await ev(b, `!document.getElementById('confirmation').hidden`)) await repondre(b, 'oui');
    await pret(b);
    const nom = await ev(b, `({fichier:'mesures-'+nomVideoCourante()+'.csv', entete:descriptionMesures()})`);
    verifier('fichier nommé d’après le titre neutre, sans le nom du fichier vidéo', nom.fichier === 'mesures-mobile-lance-sur-une-table-horizontale-coussin-d-air.csv' && !/Uniforme/i.test(nom.entete), nom);
    journalPropre(b, 'nombres');
    await fermer(b);
  }

  // ------------------------------------------------------------------ 13. Densité, plein écran
  if (partie(13, 'Densité 2, plein écran')) {
    const o = await onglet(1024, 768, {tactile: true, dpr: 2});
    const m = await ev(o, `(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return {css:[Math.round(r.width),Math.round(r.height)],memoire:[c.width,c.height]};})()`);
    verifier('écran de densité 2 : mémoire du canevas = 2 × taille affichée', m.memoire[0] === 2 * m.css[0] && Math.abs(m.memoire[1] - 2 * m.css[1]) <= 1, m);
    await fermer(o);
    const s = await onglet(1366, 768);
    const seul = await ev(s, `!document.getElementById('bouton-plein-ecran').hidden`);
    await fermer(s);
    const f = await onglet(1024, 768, {page: '/tests/cadre.html', sansAttente: true});
    await jusqua(f, `(()=>{const w=document.querySelector('iframe').contentWindow;return w.lecteur&&w.lecteur()&&w.lecteur().isLoaded;})()`);
    const cadre = await ev(f, `document.querySelector('iframe').contentDocument.getElementById('bouton-plein-ecran').hidden`);
    verifier('bouton « Plein écran » : visible hors cadre, absent dans un cadre', seul && cadre, {seul, cadre});
    await fermer(f);
  }

  // ------------------------------------------------------------------ 14. Lot 4 (deuxième relecture)
  if (partie(14, 'Glisser interrompu, saisie, guide, arrondis, clavier, bouton de fin, paysage, questions')) {
    // Étalonne la balle lâchée à 1,85 m au doigt, avec de vraies frappes
    const etalonner = async (o) => {
      await choisir(o, 'choix-mode', 'Calibration'); await pause(250);
      for (const [vx, vy] of [[270, 305], [270, 112]]) { const p = await ecranDe(o, vx, vy); await toucher(o, p.x, p.y); await pause(300); }
      await ev(o, `document.getElementById('real-distance').focus()`);
      await saisir(o, '1,85 m');
      await ev(o, `document.getElementById('validate-calibration').click()`);
    };
    // 1. Glisser d'un bout interrompu de quatre façons : le bout revient, une seule échelle partout
    for (const interruption of ['deuxième doigt', 'rotation', 'touchcancel', 'question']) {
      const o = await onglet(1024, 768, {tactile: true});
      await etalonner(o);
      await ev(o, `passerAuMode('Pointage')`); await pret(o);
      for (let k = 0; k < 6; k++) { await jusqua(o, `lecteur().pret()`); const p = await ecranDe(o, 200, 60 + 20 * k); await toucher(o, p.x, p.y); await pause(300); }
      await ev(o, `passerAuMode('Calibration')`); await pause(300);
      const avant = await ev(o, `({echelle:data.echelle, p2:Object.assign({},calibrator.point2), etat:document.getElementById('frame-info').textContent})`);
      const a = await ecranDe(o, 270, 112);
      await doigtPose(o, a.x, a.y); await pause(80);
      for (let i = 1; i <= 3; i++) { await doigtGlisse(o, a.x, a.y - 20 * i); await pause(50); }
      const pendant = await ev(o, `calibrator.scaleFactor`);
      if (interruption === 'deuxième doigt') {
        await o.c.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: a.x, y: a.y - 60, id: 0}, {x: a.x + 120, y: a.y, id: 1}]}, o.s);
      } else if (interruption === 'rotation') {
        await redimensionner(o, 768, 1024, {tactile: true});
      } else if (interruption === 'touchcancel') {
        await o.c.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []}, o.s);
      } else {
        await choisirVideoSansAttente(o, TABLE);
      }
      await pause(500);
      if (interruption !== 'touchcancel') await doigtLeve(o);
      await pause(300);
      if (interruption === 'question') { await touche(o, 'Escape', 'Escape', 27); await pause(200); }
      if (interruption === 'rotation') { await redimensionner(o, 1024, 768, {tactile: true}); await pause(500); }
      const apres = await ev(o, `({echelle:data.echelle, recalculee:1.85/Math.hypot(calibrator.point2.x-calibrator.point1.x,calibrator.point2.y-calibrator.point1.y), p2:Object.assign({},calibrator.point2), etat:document.getElementById('frame-info').textContent, entete:construireCSV().split('\\r\\n')[0]})`);
      await o.c.send('Page.reload', {}, o.s); await pause(800);
      await jusqua(o, `!document.getElementById('confirmation').hidden`); await repondre(o, 'oui'); await pret(o);
      const recharge = await ev(o, `data.echelle`);
      const echelleTexte = (t) => (t.match(/1 px = [\d, ]+ mm/) || [''])[0];
      verifier(`glisser d’un bout interrompu (${interruption}) : bout remis à sa place, une seule échelle (calibrateur = ligne d’état = CSV = après rechargement)`,
        pendant !== avant.echelle && apres.p2.x === avant.p2.x && apres.p2.y === avant.p2.y && apres.echelle === avant.echelle && Math.abs(apres.recalculee / avant.echelle - 1) < 1e-12 &&
        echelleTexte(apres.etat) === echelleTexte(avant.etat) && apres.entete.includes(echelleTexte(avant.etat)) && Math.abs(recharge / avant.echelle - 1) < 1e-12,
        {avant: avant.echelle, pendant, apres: apres.echelle, recharge});
      await fermer(o);
    }
    {
      // Pendant une question, on ne peut pas glisser un bout
      const o = await onglet(1024, 768, {tactile: true});
      await etalonner(o);
      await ev(o, `passerAuMode('Pointage')`); await pret(o);
      const p = await ecranDe(o, 200, 100); await toucher(o, p.x, p.y); await pause(300);
      await ev(o, `passerAuMode('Calibration')`); await pause(300);
      await choisirVideoSansAttente(o, TABLE);
      const avant = await ev(o, `Object.assign({},calibrator.point2)`);
      const a = await ecranDe(o, 270, 112);
      await doigtPose(o, a.x, a.y); await pause(80); await doigtGlisse(o, a.x, a.y - 60); await pause(100); await doigtLeve(o); await pause(200);
      const apres = await ev(o, `Object.assign({},calibrator.point2)`);
      verifier('question ouverte : un bout d’étalonnage ne se déplace pas', apres.x === avant.x && apres.y === avant.y, {avant, apres});
      // Deux questions ne s'empilent pas : menus inactifs pendant la question ; toucher trop rapide ignoré
      const menus = await ev(o, `['choix-mode','choix-video','choix-mobiles','choix-pas'].map(id=>document.getElementById(id).disabled)`);
      await touche(o, 'Escape', 'Escape', 27); await pause(200);
      // Question ouverte puis toucher sur « Changer de vidéo » aussitôt (même instant) : ignoré
      const toujours = await ev(o, `(()=>{const s=document.getElementById('choix-video');s.value='1';s.dispatchEvent(new Event('change'));
        document.getElementById('confirmation-oui').click();return !document.getElementById('confirmation').hidden && lecteur().chemin===${JSON.stringify(CHUTE)};})()`);
      verifier('question ouverte : les 4 menus sont inactifs ; un toucher dans les 400 ms est ignoré', menus.every(Boolean) && toujours, {menus, toujours});
      await touche(o, 'Escape', 'Escape', 27); await pause(200);
      const garde = await ev(o, `({menu:document.getElementById('choix-video').value, video:lecteur().chemin, actifs:!document.getElementById('choix-video').disabled})`);
      verifier('après la question : menu et vidéo d’accord, menus de nouveau actifs', garde.menu === '0' && garde.video === CHUTE && garde.actifs, garde);
      // La question est au-dessus des commandes, pas sur l'image
      await choisirVideoSansAttente(o, TABLE);
      const recouvre = await ev(o, `(()=>{const q=document.getElementById('confirmation').getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect();
        const x=Math.max(0,Math.min(q.right,c.right)-Math.max(q.left,c.left)),y=Math.max(0,Math.min(q.bottom,c.bottom)-Math.max(q.top,c.top));return Math.round(100*x*y/(c.width*c.height));})()`);
      await touche(o, 'Escape', 'Escape', 27);
      verifier('1024×768 : la question ne recouvre pas l’image', recouvre === 0, recouvre + ' %');
      journalPropre(o, 'questions');
      await fermer(o);
    }
    for (const [w, h, page] of [[340, 573, '/index.html'], [390, 640, '/tests/cadre.html?w=340&h=573']]) {
      // Question dans un petit écran : % de l'image recouvert
      const o = await onglet(w, h, {tactile: true, page, sansAttente: page !== '/index.html'});
      const doc = page === '/index.html' ? 'document' : `document.querySelector('iframe').contentDocument`;
      if (page !== '/index.html') await jusqua(o, `(()=>{const w=document.querySelector('iframe').contentWindow;return w.lecteur&&w.lecteur()&&w.lecteur().isLoaded&&w.width>50;})()`);
      await pause(400);
      await ev(o, `${doc}.defaultView.eval("data.placer(0,0,100,100);sauvegarderSeance()")`);
      await ev(o, `(()=>{const s=${doc}.getElementById('choix-video');s.value='1';s.dispatchEvent(new Event('change'));})()`);
      await pause(300);
      const recouvre = await ev(o, `(()=>{const d=${doc},q=d.getElementById('confirmation').getBoundingClientRect(),c=d.querySelector('canvas').getBoundingClientRect();
        const x=Math.max(0,Math.min(q.right,c.right)-Math.max(q.left,c.left)),y=Math.max(0,Math.min(q.bottom,c.bottom)-Math.max(q.top,c.top));return Math.round(100*x*y/(c.width*c.height));})()`);
      await capture(o, path.join(SORTIE, `question-${w}x${h}${page === '/index.html' ? '' : '-cadre'}.png`));
      verifier(`${page === '/index.html' ? '' : 'cadre '}340×573 : la question recouvre au plus 10 % de l’image`, recouvre <= 10, recouvre + ' %');
      await fermer(o);
    }
    // 2. Champ de longueur déjà validé : on peut l'effacer et taper autre chose (vraies frappes)
    {
      const o = await onglet(1024, 768, {tactile: true});
      await etalonner(o);
      await ev(o, `document.getElementById('real-distance').focus()`);
      await effacerChamp(o, 12);
      const vide = await ev(o, `document.getElementById('real-distance').value`);
      await saisir(o, '5');
      const cinq = await ev(o, `document.getElementById('real-distance').value`);
      await touche(o, 'Backspace', 'Backspace', 8);
      await saisir(o, '60 cm');
      const valeur = await ev(o, `document.getElementById('real-distance').value`);
      await ev(o, `document.getElementById('validate-calibration').click()`); await pause(200);
      const verif = await ev(o, `document.getElementById('calibration-message').textContent`);
      await ev(o, `document.getElementById('validate-calibration').click()`); await pause(200); // confirmation (étalon : 1,85 m)
      const reel = await ev(o, `calibrator.realDistance`);
      verifier('champ déjà validé : effacé au Retour arrière, il reste vide ; « 5 », Retour arrière, « 60 cm » : vérification (étalon 1,85 m) puis 0,60 m', vide === '' && cinq === '5' && valeur === '60 cm' && /Vérifie/.test(verif) && Math.abs(reel - 0.6) < 1e-12, {vide, cinq, valeur, verif, reel});
      journalPropre(o, 'saisie');
      await fermer(o);
    }
    // 4. Arrondis : demi-unités, v exacte puis arrondie, d / Δt à la main
    {
      const o = await onglet(1024, 768);
      const ar = await ev(o, `[nombreFr(0.95,1), nombreFr(0.038/0.04,1), nombreFr(1.005,2), nombreFr(-0.05,1), nombreFr(1095480,-4), nombreSignificatif(1095480)]`);
      verifier('arrondis : 0,95 → « 1,0 » ; 0,038 / 0,040 → « 1,0 » ; 1,005 → « 1,01 » ; 1 095 480 à 3 chiffres → « 1 100 000 »', ar[0] === '1,0' && ar[1] === '1,0' && ar[2] === '1,01' && ar[5].replace(/ /g, ' ') === '1 100 000', ar);
      // Positions connues, injectées à l'entrée du pointage ; v attendue calculée ici, indépendamment
      const POS = [[200, 60], [203.4, 71.9], [206.1, 90.35], [209.9, 115.2]];
      await choisir(o, 'choix-mode', 'Calibration'); await pause(200);
      await ev(o, `traiterPointage(270,305);traiterPointage(270,112)`);
      await ev(o, `document.getElementById('real-distance').focus()`); await saisir(o, '1,85 m');
      await ev(o, `document.getElementById('validate-calibration').click()`);
      await ev(o, `passerAuMode('Pointage')`); await pret(o);
      for (const [x, y] of POS) { await jusqua(o, `lecteur().pret()`); await ev(o, `traiterPointage(${x},${y})`); await pause(100); }
      await choisir(o, 'choix-mode', 'Graphique'); await choisir(o, 'choix-type-graphique', 'tableau'); await pause(300);
      const lignes = await ev(o, `[...document.querySelectorAll('#tableau-mesures tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent))`);
      const echelle = 1.85 / 193;
      const decV14 = await ev(o, `data.formats().v`);
      const num = t => parseFloat(t.replace(/ /g, '').replace(',', '.'));
      const res = lignes.slice(1).map((l, i) => {
        const v = Math.hypot(POS[i + 1][0] - POS[i][0], POS[i + 1][1] - POS[i][1]) * echelle / 0.04;
        const dec = decV14;
        return {affichee: l[7], attendue: v.toFixed(Math.max(0, dec) + 2), arrondieOk: Math.abs(num(l[7]) - v) <= 0.5 * Math.pow(10, -dec) + 1e-9,
          main: Math.abs(num(l[5]) / num(l[6]) - num(l[7])) <= Math.pow(10, -dec) + 1e-12};
      });
      verifier('v affichée = v exacte (calculée ici) arrondie ; d / Δt refait avec les valeurs affichées redonne v à une unité près', res.length === 3 && res.every(r => r.arrondieOk && r.main), res);
      await fermer(o);
    }
    // 5. Souris puis clavier : un clic n'active pas le réticule ; ← → changent d'image
    {
      const o = await onglet(1366, 768);
      const p = await ecranDe(o, 150, 150); await clic(o, p.x, p.y); await pause(400);
      const apresClic = await ev(o, `({image:lecteur().image, actif:clavier.actif, focus:document.activeElement.tagName})`);
      await touche(o, 'ArrowRight', 'ArrowRight', 39); await pause(300);
      await touche(o, 'Enter', 'Enter', 13); await pause(200);
      const r = await ev(o, `({image:lecteur().image, actif:clavier.actif, n:data.getTotalPointCount(), titre:document.querySelector('canvas').title})`);
      verifier('après un clic sur l’image : → change d’image (pas de réticule) ; Entrée fait apparaître le réticule sans pointer ; la règle est dans l’info-bulle',
        apresClic.image === 1 && !apresClic.actif && r.image === 2 && r.actif && r.n === 1 && /Entrée/.test(r.titre) && /Échap/.test(r.titre), {apresClic, r});
      await fermer(o);
    }
    // 6. Bouton « Voir les graphiques » hors de l'image, 7. paysage peu haut : champ visible
    for (const [w, h, page] of [[360, 640, '/index.html'], [390, 640, '/tests/cadre.html?w=340&h=573']]) {
      const o = await onglet(w, h, {tactile: true, page, sansAttente: page !== '/index.html'});
      const doc = page === '/index.html' ? 'document' : `document.querySelector('iframe').contentDocument`;
      if (page !== '/index.html') await jusqua(o, `(()=>{const w=document.querySelector('iframe').contentWindow;return w.lecteur&&w.lecteur()&&w.lecteur().isLoaded&&w.width>50;})()`);
      await pause(300);
      await ev(o, `${doc}.defaultView.eval("lecteur().allerImage(16)")`); await pause(600);
      await ev(o, `${doc}.defaultView.eval("traiterPointage(150,250)")`); await pause(400);
      const r = await ev(o, `(()=>{const d=${doc},w=d.defaultView,b=d.getElementById('bouton-voir-graphiques').getBoundingClientRect(),c=d.querySelector('canvas').getBoundingClientRect();
        return {visible:!d.getElementById('bouton-voir-graphiques').hidden,dansFenetre:b.top>=0&&b.bottom<=w.innerHeight,horsImage:b.bottom<=c.top||b.top>=c.bottom||b.right<=c.left||b.left>=c.right,consigneCoupee:d.getElementById('instructions').scrollHeight>d.getElementById('instructions').clientHeight+1};})()`);
      await capture(o, path.join(SORTIE, `fin-${w}x${h}${page === '/index.html' ? '' : '-cadre'}.png`));
      verifier(`${page === '/index.html' ? '360×640' : 'cadre 340×573'} : « Voir les graphiques » visible, hors de l’image, consigne non coupée`, r.visible && r.dansFenetre && r.horsImage && !r.consigneCoupee, r);
      await fermer(o);
    }
    for (const [w, h] of [[640, 360], [844, 390]]) {
      const o = await onglet(w, h, {tactile: true});
      await choisir(o, 'choix-mode', 'Calibration'); await pause(300);
      for (const [vx, vy] of [[270, 305], [270, 112]]) { const p = await ecranDe(o, vx, vy); await toucher(o, p.x, p.y); await pause(300); }
      const r = await ev(o, `(()=>{const H=innerHeight,ok=id=>{const b=document.getElementById(id).getBoundingClientRect();return b.height>0&&b.top>=0&&b.bottom<=H;};
        return {champ:ok('real-distance'),valider:ok('validate-calibration'),recommencer:ok('reset-calibration'),etalon:(()=>{const b=document.getElementById('calibration-message').getBoundingClientRect();return b.top>=0&&b.top+19<=H;})()};})()`);
      await capture(o, path.join(SORTIE, `etalonnage-paysage-${w}x${h}.png`));
      verifier(`${w}×${h} : après les deux bouts, champ, « Valider », « Recommencer » et étalon à l’écran`, r.champ && r.valider && r.recommencer && r.etalon, r);
      await fermer(o);
    }
    // Lecture : un clic pendant la lecture met en pause sur l'image de travail ; le clic suivant pointe
    {
      const o = await onglet(1024, 768);
      const q = await ecranDe(o, 150, 150); await clic(o, q.x, q.y); await pause(400);
      await ev(o, `lecteur().play()`); await pause(200);
      const p = await ecranDe(o, 160, 160); await clic(o, p.x, p.y); await pause(500);
      const un = await ev(o, `({n:data.getTotalPointCount(), image:lecteur().image, lecture:lecteur().isPlaying})`);
      await jusqua(o, `lecteur().pret()`);
      await clic(o, p.x + 3, p.y); await pause(400);
      const deux = await ev(o, `({n:data.getTotalPointCount(), images:data.points[0].map(p=>p.image)})`);
      verifier('pendant la lecture : 1er clic = pause sur l’image de travail (image 1), 2e clic = point', !un.lecture && un.n === 1 && un.image === 1 && deux.n === 2 && deux.images.join() === '0,1', {un, deux});
      // Ordinateur : fenêtre réduite pendant la saisie → l'image est redimensionnée (pas de « clavier virtuel »)
      await choisir(o, 'choix-mode', 'Calibration'); await pause(300);
      await ev(o, `traiterPointage(270,305);traiterPointage(270,112)`);
      await ev(o, `document.getElementById('real-distance').focus()`);
      const avant = await rectCanevas(o);
      await redimensionner(o, 1024, 560); await pause(600);
      const r = await ev(o, `(()=>{const c=document.querySelector('canvas').getBoundingClientRect(),s=document.getElementById('scene').getBoundingClientRect();return {bas:Math.round(c.bottom),scene:Math.round(s.bottom)};})()`);
      verifier('ordinateur : fenêtre moins haute pendant la saisie → image redimensionnée, entière', r.bas <= r.scene + 1, {avant, ...r});
      await fermer(o);
    }
    // Sauvegardes fabriquées : historique incohérent, image hors bornes dans l'historique, autre vidéo
    {
      const o = await onglet(1024, 768);
      for (let k = 0; k < 2; k++) { await jusqua(o, `lecteur().pret()`); const p = await ecranDe(o, 200, 60 + 20 * k); await clic(o, p.x, p.y); await pause(300); }
      const vraie = JSON.parse(await ev(o, `sessionStorage.getItem('jsmecavideo-seance-v1')`));
      const fabriquees = [
        Object.assign({}, vraie, {data: Object.assign({}, vraie.data, {historique: [{m: 0, image: 1, ancien: {image: 5, xpx: 1, ypx: 1}}]})}),
        Object.assign({}, vraie, {data: Object.assign({}, vraie.data, {historique: [{m: 0, image: 9999, ancien: null}]})}),
        Object.assign({}, vraie, {video: TABLE}),
        Object.assign({}, vraie, {calibrateur: {point1: {x: 10, y: 10}, point2: {x: 900, y: 10}, realDistance: 1, saisie: '1 m', state: 'calibrated'}})
      ];
      let ignorees = 0;
      for (const f of fabriquees) {
        // Empreinte recalculée : c'est la validation de fond qui doit refuser
        await ev(o, `(()=>{const o=${JSON.stringify(f)};o.controle=empreinteSeance(o);sessionStorage.setItem('jsmecavideo-seance-v1',JSON.stringify(o));})()`);
        await o.c.send('Page.reload', {}, o.s); await pause(700); await pret(o);
        if (await ev(o, `document.getElementById('confirmation').hidden && data.getTotalPointCount()===0`)) ignorees++;
      }
      verifier('4 sauvegardes fabriquées avec empreinte recalculée (historique incohérent, image 9999, autre vidéo, bout hors image) ignorées', ignorees === 4, {ignorees});
      // Empreinte seule : une sauvegarde valide modifiée à la main (sans recalcul) est ignorée
      const modifiee = JSON.parse(JSON.stringify(vraie));
      modifiee.data.points[0][0].xpx += 10;
      await ev(o, `sessionStorage.setItem('jsmecavideo-seance-v1', ${JSON.stringify(JSON.stringify(modifiee))})`);
      await o.c.send('Page.reload', {}, o.s); await pause(700); await pret(o);
      verifier('sauvegarde modifiée à la main sans recalcul de l’empreinte : ignorée', await ev(o, `document.getElementById('confirmation').hidden && data.getTotalPointCount()===0`));
      const masse = await ev(o, `videoFiles.find(v=>v.path.includes('MasseRoule')).images`);
      verifier('MasseRoule : la dernière image (autre plan) n’est pas proposée (19 images, 0 à 18)', masse === 19, masse);
      journalPropre(o, 'sauvegardes');
      await fermer(o);
    }
  }

  // ------------------------------------------------------------------ 15. Lot 5 (troisième relecture)
  if (partie(15, 'Lecture puis navigation, message d’échelle, garde des questions, réticule et souris, infobulles, d / Δt à 30 et 15 images/s')) {
    // 1. 9 points, lecture jusqu'au bout, « image précédente » ×11, toucher : le point va sur l'image choisie
    {
      const o = await onglet(1024, 768, {tactile: true});
      for (let k = 0; k < 9; k++) { await jusqua(o, `lecteur().pret()`); const p = await ecranDe(o, 200, 60 + 15 * k); await toucher(o, p.x, p.y); await pause(300); }
      await ev(o, `lecteur().play()`); await jusqua(o, `!lecteur().isPlaying && !lecteur().enDeplacement`, 200);
      for (let i = 0; i < 11; i++) { await ev(o, `document.querySelector('[aria-label^="Image précédente"]').click()`); await jusqua(o, `lecteur().pret()`); }
      const avant = await ev(o, `lecteur().image`);
      const p = await ecranDe(o, 230, 140); await toucher(o, p.x, p.y); await pause(400);
      const r = await ev(o, `({image:lecteur().image, pt:data.pointA(0,5), n:data.getTotalPointCount(), msg:document.getElementById('instructions').textContent})`);
      verifier('lecture jusqu’au bout puis « image précédente » ×11 (image 5) : le toucher remplace le point de l’image 5, sans retour à l’image de travail',
        avant === 5 && r.n === 9 && r.pt && Math.abs(r.pt.xpx - 230) < 1 && /remplacé/.test(r.msg), {avant, ...r});
      // Même chose avec le curseur et la touche Début
      await ev(o, `lecteur().play()`); await pause(150);
      await ev(o, `lecteur().pause(true)`); await jusqua(o, `lecteur().pret()`);
      await ev(o, `(()=>{const c=document.querySelector('.curseur-temps');c.value='3';c.dispatchEvent(new Event('input'));})()`); await jusqua(o, `lecteur().pret()`);
      const q = await ecranDe(o, 240, 120); await toucher(o, q.x, q.y); await pause(400);
      verifier('lecture, pause, curseur sur l’image 3, toucher : point remplacé sur l’image 3', await ev(o, `Math.abs(data.pointA(0,3).xpx-240)<1`));
      await fermer(o);
    }
    // 2. Message d'échelle = échelle en vigueur, même champ actif, pendant et après un glisser
    {
      const o = await onglet(1024, 768, {tactile: true});
      await choisir(o, 'choix-mode', 'Calibration'); await pause(250);
      for (const [vx, vy] of [[270, 305], [270, 112]]) { const p = await ecranDe(o, vx, vy); await toucher(o, p.x, p.y); await pause(300); }
      await ev(o, `document.getElementById('real-distance').focus()`); await saisir(o, '1,85 m');
      await ev(o, `document.getElementById('validate-calibration').click()`);
      await ev(o, `document.getElementById('real-distance').focus()`);
      const a = await ecranDe(o, 270, 112);
      await doigtPose(o, a.x, a.y); await pause(80);
      await doigtGlisse(o, a.x, a.y - 30); await pause(250);
      const echelle = t => (t.match(/1 px = [\d,  ]+ mm/) || [''])[0];
      const pendant = await ev(o, `({msg:document.getElementById('calibration-message').textContent, attendu:calibrator.texteEchelle()})`);
      await doigtGlisse(o, a.x, a.y - 60); await pause(100); await doigtLeve(o); await pause(300);
      const apres = await ev(o, `({msg:document.getElementById('calibration-message').textContent, etat:document.getElementById('frame-info').textContent, entete:construireCSV().split('\\r\\n')[0], attendu:calibrator.texteEchelle()})`);
      verifier('message d’échelle = échelle en vigueur pendant et après un glisser, champ actif (= ligne d’état = CSV)',
        pendant.msg.includes(pendant.attendu) && apres.msg.includes(apres.attendu) && apres.etat.includes(apres.attendu) && apres.entete.includes(apres.attendu), {pendant, apres});
      await fermer(o);
    }
    // 3. Garde des questions : fil principal bloqué, toucher parti 80 ms après l'ouverture → ignoré
    {
      let effaces = 0, temoins = 0;
      for (let essai = 0; essai < 3; essai++) {
        const o = await onglet(1024, 768, {tactile: true});
        const p = await ecranDe(o, 200, 100); await toucher(o, p.x, p.y); await pause(300);
        // Ouvre la question, puis bloque le fil principal 1 s
        await ev(o, `(()=>{const s=document.getElementById('choix-video');s.value='1';s.dispatchEvent(new Event('change'));
          setTimeout(()=>{const t=performance.now();while(performance.now()-t<1000){}},0);})()`);
        const b = await ev(o, `(()=>{const r=document.getElementById('confirmation-oui').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
        await pause(80);
        await o.c.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: b.x, y: b.y, button: 'left', buttons: 1, clickCount: 1}, o.s);
        await o.c.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1}, o.s);
        await pause(1500);
        if (await ev(o, `data.getTotalPointCount()===0`)) effaces++;
        // Témoin : le même clic, bien après l'affichage, est pris en compte
        await o.c.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: b.x, y: b.y, button: 'left', buttons: 1, clickCount: 1}, o.s);
        await o.c.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1}, o.s);
        await pause(500);
        if (await ev(o, `data.getTotalPointCount()===0 && document.getElementById('confirmation').hidden`)) temoins++;
        await fermer(o);
      }
      verifier('question : un clic parti 80 ms après l’ouverture (fil principal bloqué 1 s) est ignoré ; le même clic 1,5 s plus tard est pris en compte (3 essais)', effaces === 0 && temoins === 3, {travailEfface: effaces, temoins});
    }
    // 4. Réticule clavier puis souris : la souris reprend la main
    {
      const o = await onglet(1366, 768);
      await ev(o, `document.querySelector('canvas').focus()`);
      await touche(o, 'Enter', 'Enter', 13); await pause(150);
      const actif = await ev(o, `clavier.actif`);
      const p = await ecranDe(o, 120, 90);
      await o.c.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: p.x - 30, y: p.y - 30}, o.s);
      await o.c.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: p.x, y: p.y}, o.s); await pause(150);
      const viseur = await ev(o, `(()=>{const v=positionViseur();return {actif:clavier.actif,x:v&&v.x,y:v&&v.y,sx:souris.x,sy:souris.y,loupe:loupeVisible()};})()`);
      await clic(o, p.x, p.y); await pause(400);
      await touche(o, 'ArrowRight', 'ArrowRight', 39); await pause(300);
      const r = await ev(o, `({n:data.getTotalPointCount(), image:lecteur().image, actif:clavier.actif})`);
      verifier('réticule clavier puis souris : le réticule disparaît, viseur sous la souris, clic au bon endroit, → change d’image', actif && !viseur.actif && Math.abs(viseur.x - viseur.sx) < 1e-6 && !viseur.loupe && r.n === 1 && r.image === 2 && !r.actif, {viseur, r});
      await fermer(o);
    }
    // 5 et 6. Phrase d'aide vraie ; infobulles au format de leur grandeur
    {
      const o = await onglet(1366, 768);
      await choisirVideo(o, 'videos/VenusTerreMars.mp4');
      await choisir(o, 'choix-mode', 'Calibration'); await pause(200);
      await ev(o, `traiterPointage(10,10);traiterPointage(193,10)`);
      await ev(o, `document.getElementById('real-distance').focus()`); await saisir(o, '200 000 000 km');
      await ev(o, `document.getElementById('validate-calibration').click()`);
      await ev(o, `passerAuMode('Pointage')`); await pret(o);
      for (let k = 0; k < 6; k++) { await jusqua(o, `lecteur().pret()`); const a = 0.43 * k; await ev(o, `traiterPointage(${320 + 134 * Math.cos(a)},${240 - 134 * Math.sin(a)})`); await pause(100); }
      await choisir(o, 'choix-mode', 'Graphique');
      const infobulle = async (type) => {
        await choisir(o, 'choix-type-graphique', type); await pause(250);
        return ev(o, `(()=>{const ds=graph.chart.data.datasets[0],i=1,lbl=graph.chart.options.plugins.tooltip.callbacks.label;
          const y=typeof ds.data[i]==='object'?ds.data[i].y:ds.data[i],x=typeof ds.data[i]==='object'?ds.data[i].x:undefined;return {texte:lbl({dataset:ds,parsed:{x:x,y:y}}),y};})()`);
      };
      const v = await infobulle('v(t)'), a = await infobulle('a(t)'), d = await infobulle('ecarts'), vit = await infobulle('vitesse');
      const f = await ev(o, `({u:unitesMesure()})`);
      await choisir(o, 'choix-type-graphique', 'tableau'); await pause(200);
      const tab = await ev(o, `[...document.querySelectorAll('#tableau-mesures tbody tr')][2].children[7].textContent`);
      const aide = await ev(o, `document.getElementById('graph-aide').textContent`);
      const sigA = (a.texte.match(/[\d ]+(,\d+)?/) || [''])[0].replace(/ /g, '');
      verifier('infobulles au format de leur grandeur (Vénus) : v en km/jour arrondie comme le tableau, a à 3 chiffres significatifs, d et v des barres',
        /km\/jour à t =/.test(v.texte) && /km\/jour²/.test(a.texte) && Number(sigA) !== 0 && /km$/.test(d.texte) && vit.texte.endsWith(tab + ' km/jour'), {v: v.texte, a: a.texte, d: d.texte, vit: vit.texte, tableau: tab});
      verifier('aide du tableau : « v calculée avec les valeurs exactes puis arrondie … une unité »', /valeurs exactes puis arrondie/.test(aide) && !/avec le d affiché/.test(aide), aide);
      await fermer(o);
    }

    // Bouton d'export visible en portrait (page qui défile) ; bouton de fin à l'écran à 640×360
    for (const [w, h, page] of [[360, 640, '/index.html'], [390, 640, '/tests/cadre.html?w=340&h=573']]) {
      const o = await onglet(w, h, {tactile: true, page, sansAttente: page !== '/index.html'});
      const doc = page === '/index.html' ? 'document' : `document.querySelector('iframe').contentDocument`;
      if (page !== '/index.html') await jusqua(o, `(()=>{const w=document.querySelector('iframe').contentWindow;return w.lecteur&&w.lecteur()&&w.lecteur().isLoaded&&w.width>50;})()`);
      await pause(300);
      await ev(o, `${doc}.defaultView.eval("for(let k=0;k<3;k++)data.placer(0,k,100+30*k,200-20*k);passerAuMode('Graphique')")`); await pause(400);
      const r = await ev(o, `(()=>{const d=${doc},w=d.defaultView,b=d.getElementById('bouton-export').getBoundingClientRect();return {haut:Math.round(b.top),bas:Math.round(b.bottom),H:w.innerHeight};})()`);
      verifier(`${page === '/index.html' ? '360×640' : 'cadre 340×573'} : bouton d’export visible en bas de l’écran (Graphiques)`, r.bas <= r.H && r.haut >= 0, r);
      await fermer(o);
    }
    {
      const o = await onglet(640, 360, {tactile: true});
      await ev(o, `lecteur().allerImage(16)`); await jusqua(o, `lecteur().pret()`);
      await ev(o, `traiterPointage(150,250)`); await pause(500);
      const r = await ev(o, `(()=>{const b=document.getElementById('bouton-voir-graphiques').getBoundingClientRect();return {haut:Math.round(b.top),bas:Math.round(b.bottom),H:innerHeight,visible:!document.getElementById('bouton-voir-graphiques').hidden};})()`);
      verifier('640×360 : bouton « graphiques » de fin entièrement à l’écran', r.visible && r.bas <= r.H && r.haut >= 0, r);
      await fermer(o);
    }
    // Clavier virtuel (doigt, champ actif, hauteur réduite) : image immobile, puis identique à la fermeture
    for (const [w, h, hClavier] of [[1024, 768, 420], [768, 1024, 640]]) {
      const o = await onglet(w, h, {tactile: true});
      await choisir(o, 'choix-mode', 'Calibration'); await pause(300);
      for (const [vx, vy] of [[270, 305], [270, 112]]) { const p = await ecranDe(o, vx, vy); await toucher(o, p.x, p.y); await pause(300); }
      await ev(o, `document.getElementById('real-distance').focus()`);
      const avant = await rectCanevas(o);
      await redimensionner(o, w, hClavier, {tactile: true}); await pause(500);
      const pendant = await rectCanevas(o);
      await redimensionner(o, w, h, {tactile: true}); await pause(200);
      await ev(o, `document.getElementById('real-distance').blur()`); await pause(500);
      const apres = await rectCanevas(o);
      verifier(`${w}×${h} : clavier virtuel (hauteur ${hClavier}) pendant la saisie au doigt : image immobile, identique après fermeture`, avant === pendant && pendant === apres, {avant, pendant, apres});
      await fermer(o);
    }
    // d / Δt à 30 et 15 images/s (bille1, MasseRoule), positions injectées, v attendue calculée ici
    for (const [video, dt, POS] of [['videos/bille1-iv5.mp4', 1 / 30, [[300, 100], [301, 117.3], [302.5, 136.9], [303, 158.2]]], ['videos/MasseRoule.mp4', 1 / 15, [[60, 150], [81.7, 150.4], [104.1, 151], [127.9, 150.6]]]]) {
      const o = await onglet(1024, 768);
      await choisirVideo(o, video);
      for (const [x, y] of POS) { await jusqua(o, `lecteur().pret()`); await ev(o, `traiterPointage(${x},${y})`); await pause(100); }
      await choisir(o, 'choix-mode', 'Graphique'); await choisir(o, 'choix-type-graphique', 'tableau'); await pause(250);
      const lignes = await ev(o, `[...document.querySelectorAll('#tableau-mesures tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent))`);
      const decV = await ev(o, `data.formats().v`);
      const num = t => parseFloat(t.replace(/ /g, '').replace(',', '.'));
      const res = lignes.slice(1).map((l, i) => {
        const v = Math.hypot(POS[i + 1][0] - POS[i][0], POS[i + 1][1] - POS[i][1]) / dt;
        return {affichee: l[7], exacte: v, arrondie: Math.abs(num(l[7]) - v) <= 0.5 * Math.pow(10, -decV) + 1e-9, main: Math.abs(num(l[5]) / num(l[6]) - num(l[7])) <= Math.pow(10, -decV) + 1e-9, dt: l[6]};
      });
      verifier(`${video.slice(7)} (${Math.round(1 / dt)} images/s) : v = v exacte arrondie ; d / Δt affichés redonnent v à une unité près`, res.length === 3 && res.every(r => r.arrondie && r.main), res);
      await fermer(o);
    }
  }

  // ------------------------------------------------------------------ 16. Pause : image affichée = image pointée
  if (partie(16, 'Pause pendant la lecture : l’image pointée est celle réellement affichée (référence ffmpeg)')) {
    // Images de référence de chaque vidéo, réduites, extraites par ffmpeg (indépendantes du navigateur)
    const references = (video, w, h) => {
      try {
        const brut = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', path.join(RACINE, video), '-vf', `scale=${w}:${h}:flags=bilinear`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 1 << 28});
        return brut.toString('base64');
      } catch (e) { return null; }
    };
    let total = 0, decales = 0, finies = 0;
    const details = [];
    for (const [video, w, h] of [[TABLE, 176, 144], ['videos/bille1-iv5.mp4', 160, 120]]) {
      const refs = references(video, w, h);
      if (!refs) { verifier('références ffmpeg', false, 'ffmpeg indisponible : NON vérifié'); break; }
      for (const tactile of [true, false]) {
        const o = await onglet(1024, 768, {tactile});
        await choisirVideo(o, video);
        await ev(o, `(()=>{const b=atob(${JSON.stringify(refs)}),n=${w * h * 3},t=new Uint8Array(b.length);for(let i=0;i<b.length;i++)t[i]=b.charCodeAt(i);
          window.__refs=[];for(let k=0;k*n<t.length;k++)window.__refs.push(t.subarray(k*n,(k+1)*n));
          const c=document.createElement('canvas');c.width=${w};c.height=${h};window.__cx=c.getContext('2d',{willReadFrequently:true});
          window.__affichee=()=>{__cx.drawImage(lecteur().elt,0,0,${w},${h});const d=__cx.getImageData(0,0,${w},${h}).data;let best=-1,bs=Infinity,second=Infinity;
            __refs.forEach((r,k)=>{let s=0;for(let i=0,j=0;i<d.length;i+=4,j+=3)s+=Math.abs(d[i]-r[j])+Math.abs(d[i+1]-r[j+1])+Math.abs(d[i+2]-r[j+2]);
              if(s<bs){second=bs;bs=s;best=k;}else if(s<second)second=s;});return {k:best,ecart:bs/(${w * h * 3}),suivant:second/(${w * h * 3})};};})()`);
        const lecture = `#controls button[aria-label^="Lire"], #controls button[aria-label^="Pause"]`;
        const appuyer = async (sel) => {
          const b = await ev(o, `(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
          if (tactile) await toucher(o, b.x, b.y); else await clic(o, b.x, b.y);
        };
        const cible = await ecranDe(o, 150, 150);
        for (let essai = 0; essai < 12; essai++) {
          const geste = ['espace', 'bouton', 'image'][essai % 3];
          const attente = 70 + (essai * 53) % (video === TABLE ? 1500 : 450);
          await ev(o, `lecteur().allerImageChoisie(0)`); await jusqua(o, `lecteur().pret()`);
          await appuyer(lecture);
          await pause(attente);
          if (!(await ev(o, `lecteur().isPlaying`))) { finies++; continue; }
          if (geste === 'espace') await touche(o, ' ', 'Space', 32, 0, ' ');
          else if (geste === 'bouton') await appuyer(lecture);
          else if (tactile) await toucher(o, cible.x, cible.y); else await clic(o, cible.x, cible.y);
          await pause(100);
          await jusqua(o, `lecteur().pret()`); await pause(150);
          const aff = await ev(o, `__affichee()`);
          await pause(300); // (pas de double-clic)
          if (tactile) await toucher(o, cible.x, cible.y); else await clic(o, cible.x, cible.y);
          await pause(250);
          const p = await ev(o, `(data.points[0][0]||{}).image`);
          total++;
          const ok = p === aff.k;
          if (!ok) decales++;
          details.push([video.slice(7, 17), tactile ? 'doigt' : 'souris', geste, attente, 'affichée ' + aff.k, 'pointée ' + p, ok ? 'ok' : 'DÉCALÉ']);
          await ev(o, `(()=>{while(data.getTotalPointCount())data.annuler();})()`);
        }
        journalPropre(o, 'pauses ' + video.slice(7) + (tactile ? ' (doigt)' : ' (souris)'));
        await fermer(o);
      }
    }
    rapport.pauses = details;
    verifier(`pause (Espace, bouton, toucher de l’image ; doigt et souris ; vidéo commençant à 0,12 s et vidéo à 30 images/s) : ${total} pauses, ${decales} point(s) sur une autre image que celle affichée (ffmpeg)`,
      total >= 40 && decales === 0, {total, decales, lectureFinieAvantPause: finies, exemples: details.slice(0, 4)});
    // Webcam : toucher pendant la lecture de la séquence, sans point : pas d'erreur, puis le toucher pointe
    {
      const o = await onglet(1024, 768);
      await ev(o, `(()=>{const s=document.getElementById('choix-video');s.value='webcam';s.dispatchEvent(new Event('change'));})()`);
      await jusqua(o, `webcamPlayer && webcamPlayer.isLoaded`);
      await ev(o, `webcamPlayer.toggleRecording()`); await pause(1500);
      await ev(o, `webcamPlayer.toggleRecording()`); await jusqua(o, `webcamPlayer.isRecorded`); await pause(300);
      await ev(o, `webcamPlayer.play()`); await pause(300);
      const p = await ecranDe(o, 100, 100); await clic(o, p.x, p.y); await pause(400);
      const apres = await ev(o, `({lecture:webcamPlayer.isPlaying, n:data.getTotalPointCount(), image:webcamPlayer.image})`);
      await clic(o, p.x + 5, p.y); await pause(400);
      const n2 = await ev(o, `({n:data.getTotalPointCount(), image:data.points[0][0]&&data.points[0][0].image})`);
      verifier('webcam : toucher pendant la lecture = pause sans erreur, le toucher suivant pointe l’image affichée', !apres.lecture && apres.n === 0 && n2.n === 1 && n2.image === apres.image && o.journal.erreurs.length === 0, {apres, n2, erreurs: o.journal.erreurs});
      await fermer(o);
    }
    // Pendant la lecture, ◀◀ / ▶▶ / curseur / Annuler : le toucher suivant pointe l'image choisie
    {
      const o = await onglet(1024, 768, {tactile: true});
      await choisirVideo(o, TABLE);
      for (let k = 0; k < 3; k++) { await jusqua(o, `lecteur().pret()`); const p = await ecranDe(o, 100 + 10 * k, 150); await toucher(o, p.x, p.y); await pause(300); }
      const res = [];
      for (const [nom, action] of [
        ['image suivante', `document.querySelector('[aria-label^="Image suivante"]').click()`],
        ['curseur', `(()=>{const c=document.querySelector('.curseur-temps');c.value='20';c.dispatchEvent(new Event('input'));})()`],
        ['Annuler', `document.getElementById('bouton-annuler').click()`]]) {
        await ev(o, `lecteur().play()`); await pause(300);
        await ev(o, action); await jusqua(o, `lecteur().pret()`);
        const choisie = await ev(o, `lecteur().image`);
        const p = await ecranDe(o, 200, 100); await toucher(o, p.x, p.y); await pause(400);
        const r = await ev(o, `({aLu:lecteur().aLu, msg:document.getElementById('instructions').textContent})`);
        const pointee = await ev(o, `data.points[0].some(p=>p.image===${choisie} && Math.abs(p.xpx-200)<1)`);
        res.push({nom, choisie, pointee, retour: /Retour à l’image de travail/.test(r.msg)});
      }
      verifier('pendant la lecture, image suivante / curseur / Annuler : le toucher suivant pointe l’image choisie (pas de retour à l’image de travail)', res.every(r => r.pointee && !r.retour), res);
      await fermer(o);
    }
    // Réticule clavier, flèches, clic sans bouger la souris : le point va au réticule affiché
    {
      const o = await onglet(1366, 768);
      const p = await ecranDe(o, 300, 250);
      await o.c.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: p.x, y: p.y}, o.s);
      await ev(o, `document.querySelector('canvas').focus()`);
      await touche(o, 'Enter', 'Enter', 13);
      for (let i = 0; i < 4; i++) await touche(o, 'ArrowLeft', 'ArrowLeft', 37);
      const ret = await ev(o, `({x:clavier.x,y:clavier.y})`);
      await o.c.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1}, o.s);
      await o.c.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: 1}, o.s);
      await pause(400);
      const pt = await ev(o, `(()=>{const q=data.points[0][0];return q&&{x:q.xpx,y:dimensionsSource().h-q.ypx};})()`);
      verifier('réticule clavier puis clic sans bouger la souris : le point va au réticule affiché', pt && Math.abs(pt.x - ret.x) < 1e-6 && Math.abs(pt.y - ret.y) < 1e-6, {reticule: ret, point: pt});
      // Pendant une question, « Annuler » est inactif
      await choisirVideoSansAttente(o, TABLE); await pause(200);
      const annuler = await ev(o, `document.getElementById('bouton-annuler').disabled`);
      await touche(o, 'Escape', 'Escape', 27);
      verifier('pendant une question, « Annuler » est inactif (et le reste après plusieurs images)', annuler, annuler);
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
if (rapport.balayage.length) {
  console.log('\nBalayage (image en pointage, en étalonnage ; graphique ; tableau) :');
  console.table(rapport.balayage.map(r => ({taille: r.taille, disposition: r.disposition, pointage: r.petit ? 'trop petit' : r.image, '% fenêtre': r.part,
    'étalonnage': r.etalonnage, '% étal.': r.partEtal, graphique: r.graphique, tableau: r.tableau})));
}
console.log('Captures et rapport : ' + SORTIE);
console.log(echecs.length ? '\n' + echecs.length + ' échec(s) : ' + echecs.join(' | ') : '\nTout est vérifié.');
process.exit(echecs.length ? 1 : 0);
