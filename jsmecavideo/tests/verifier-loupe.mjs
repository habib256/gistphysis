// tests/verifier-loupe.mjs — pointage au doigt avec la loupe, dans Chrome sans écran (tactile émulé)
//
//   node tests/verifier-loupe.mjs [--sortie DOSSIER] [--seulement 1,3,…] [--comparer COMMIT]
//
// Sert l'app avec le petit serveur de tests/cdp.mjs et pilote Chrome par le protocole DevTools
// (aucune dépendance npm). Tailles de la tablette visée (Galaxy Tab A 10,1 pouces : 1280 × 800
// et 800 × 1280 px CSS, densité 1,5), seule et dans un cadre comme dans le site.
// Parties :
//   1. précision : un « élève simulé » pose le doigt à côté de la cible, glisse doucement en
//      regardant le réticule (doigt qui tremble), attend, puis lève le doigt avec un saut de
//      9 px (le contact rétrécit) ; erreur du point enregistré, en pixels vidéo. Le point doit
//      être celui que le réticule montrait avant le lever. Avec --comparer COMMIT, la même
//      simulation (mêmes tirages) tourne aussi sur cette version (extraite par git) : avant / après ;
//   2. place de la loupe : pour une grille de positions du doigt (coins, bords, centre), la loupe
//      est entièrement dans l'image et ne touche pas le doigt ; elle montre les pixels de la vidéo
//      autour du réticule (pixel au centre = pixel vidéo visé), nets ;
//   3. étalonnage : on saisit un bout sans qu'il saute sous le doigt, réglage fin, saut au lever ;
//   4. pouce posé ailleurs sur l'écran (panneau) : le pointage marche quand même ; deuxième
//      doigt sur l'image : geste abandonné ;
//   5. annulation : glisser loin hors de l'image annule, un petit écart hors de l'image non ;
//      touchcancel du navigateur : message, rien d'enregistré ;
//   6. ni défilement ni zoom de la page (ni de la page qui contient le cadre) pendant un geste,
//      appui long sans sélection ni menu, double toucher sans zoom ;
//   7. coût du dessin d'une image pendant un geste, processeur ralenti ×6 (mesure, sans seuil).
// Le script n'est pas nécessaire au fonctionnement de l'app.

import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {servir, lancerChrome, ouvrirOnglet, ev, jusqua, pause as attendre, capture, fermer} from './cdp.mjs';

// Horloge des gestes. Chrome sans écran met parfois 100 ms à transmettre un événement : les
// intervalles réels ne ressemblent pas à ceux d'un vrai doigt (8 à 16 ms). Chaque événement
// tactile porte donc un instant « virtuel » (paramètre timestamp), qui avance de la durée des
// pauses du script : l'app voit les intervalles voulus, comme sur un vrai écran.
let horloge = 0;
const pause = (ms) => { horloge += ms / 1000; return attendre(ms); };
const tactile = (o, type, touchPoints) => {
  if (type === 'touchStart') horloge = Math.max(horloge, Date.now() / 1000); // jamais en avance sur le vrai temps
  return o.c.send('Input.dispatchTouchEvent', {type, touchPoints, timestamp: horloge}, o.s);
};
const doigtPose = (o, x, y) => tactile(o, 'touchStart', [{x, y}]);
const doigtGlisse = (o, x, y) => tactile(o, 'touchMove', [{x, y}]);
const doigtLeve = (o) => tactile(o, 'touchEnd', []);

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (nom) => { const i = process.argv.indexOf(nom); return i > 0 ? process.argv[i + 1] : null; };
const SORTIE = arg('--sortie') || mkdtempSync(path.join(tmpdir(), 'jsmeca-loupe-'));
mkdirSync(SORTIE, {recursive: true});
const PARTIES = arg('--seulement') ? arg('--seulement').split(',').map(Number) : null;
const COMPARER = arg('--comparer');

const echecs = [];
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 700) : ''));
  if (!ok) echecs.push(nom);
}

// Tirages reproductibles (mêmes « élèves » pour les deux versions comparées)
function aleatoire(graine) {
  let s = graine >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

const srv = await servir(RACINE);
let c = lancerChrome();
let partiesLancees = 0;
const partie = (n, titre) => {
  if (PARTIES && !PARTIES.includes(n)) return false;
  if (partiesLancees++ > 0) { c.quit(); c = lancerChrome(); }
  console.log(n + '. ' + titre);
  return true;
};

// L'app est dans le document principal, ou dans le cadre de tests/cadre.html
const APP = (o) => o.cadre ? `document.querySelector('iframe').contentWindow` : 'window';
const evApp = (o, expr) => ev(o, `(()=>{const w=${APP(o)};return w.eval(${JSON.stringify(expr)});})()`);
const pretApp = (o) => jusqua(o, `(()=>{try{const w=${APP(o)};return w.eval("lecteur() && lecteur().pret() && width>50 && Math.abs(width/height-dimensionsSource().w/dimensionsSource().h)<0.01");}catch(e){return false;}})()`);

async function ouvrir(base, {w, h, dpr = 1.5, cadre = null}) {
  const page = cadre ? `/tests/cadre.html?w=${cadre[0]}&h=${cadre[1]}` : '/index.html';
  const o = await ouvrirOnglet(c, base + page, w, h, {tactile: true, dpr});
  o.cadre = !!cadre;
  await pretApp(o);
  await pause(300);
  // Trace des pointages (pixels vidéo, y vers le bas) : même chose dans l'ancienne version
  await evApp(o, `(()=>{if(window.__trace)return;window.__trace=true;const f=traiterPointage;window.traiterPointage=function(x,y){window.__pt={x,y};return f(x,y);};})()`);
  return o;
}

// Repère de l'image : position à l'écran (px CSS de la page principale) d'un point vidéo, et inverse
const GEOM = `(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),s=dimensionsSource();
  let ox=0,oy=0;if(window.frameElement){const f=window.frameElement.getBoundingClientRect();ox=f.left+window.frameElement.clientLeft;oy=f.top+window.frameElement.clientTop;}
  return {l:r.left+ox,t:r.top+oy,w:r.width,h:r.height,vw:s.w,vh:s.h,k:r.width/s.w};})()`;
const geom = (o) => evApp(o, GEOM);
const ecran = (g, vx, vy) => ({x: g.l + vx * g.k, y: g.t + vy * g.k});
// Réticule affiché (pixels vidéo) ou null
const reticule = async (o) => {
  const p = await evApp(o, `(()=>{const p=positionViseur();if(!p)return null;const v=versVideo(p.x,p.y);return {x:v.x,y:v.y};})()`);
  return p;
};

// Élève simulé. Pose le doigt à `decalage` px CSS de la cible, regarde le réticule et glisse
// doucement vers la cible (1,2 px par image affichée, soit 0,075 px/ms) ; le doigt tremble
// (σ = 0,8 px à chaque événement). Il s'arrête quand l'écart vu dans la loupe est sous 1,5 px de
// loupe, attend 250 ms (en tremblant) puis lève le doigt : le contact rétrécit, deux derniers
// mouvements de 3 puis 7 px et le lever à 9 px. Renvoie l'erreur du point enregistré.
async function eleve(o, g, cible, rng, {decalage = 12, saut = 9, zoomLoupe = 3} = {}) {
  const angle = 2 * Math.PI * rng();
  const tremble = () => [0.8 * gauss(rng), 0.8 * gauss(rng)];
  const ce = ecran(g, cible.x, cible.y);
  let fx = ce.x + decalage * Math.cos(angle), fy = ce.y + decalage * Math.sin(angle);
  await evApp(o, `window.__pt=null`);
  await doigtPose(o, fx, fy); await pause(16);
  let vu = null;
  for (let i = 0; i < 90; i++) {
    vu = await reticule(o);
    if (!vu) break;
    const ex = (cible.x - vu.x) * g.k, ey = (cible.y - vu.y) * g.k; // écart en px d'écran
    const n = Math.hypot(ex, ey);
    if (n * zoomLoupe < 1.5) break;
    const pas = Math.min(1.2, n * 4); // il ralentit près du but
    const [tx, ty] = tremble();
    fx += pas * ex / n; fy += pas * ey / n;
    await doigtGlisse(o, fx + tx, fy + ty); await pause(16);
  }
  for (let i = 0; i < 15; i++) { const [tx, ty] = tremble(); await doigtGlisse(o, fx + tx, fy + ty); await pause(16); }
  await pause(100); // immobile : c'est ce que l'élève voit au moment de lever le doigt
  const avantLever = await reticule(o);
  // Lever : le centre du contact glisse (direction tirée au hasard, vers le bas le plus souvent)
  const a2 = Math.PI / 2 + (rng() - 0.5) * 2;
  await doigtGlisse(o, fx + 3 / 9 * saut * Math.cos(a2), fy + 3 / 9 * saut * Math.sin(a2)); await pause(8);
  await doigtGlisse(o, fx + 7 / 9 * saut * Math.cos(a2), fy + 7 / 9 * saut * Math.sin(a2)); await pause(8);
  await doigtGlisse(o, fx + saut * Math.cos(a2), fy + saut * Math.sin(a2));
  await doigtLeve(o); await pause(60);
  const pt = await evApp(o, `window.__pt`);
  await jusqua(o, `(()=>{const w=${APP(o)};return w.eval("lecteur().pret()");})()`);
  return {pt, avantLever, erreur: pt ? Math.hypot(pt.x - cible.x, pt.y - cible.y) : null,
    ecartAuReticule: pt && avantLever ? Math.hypot(pt.x - avantLever.x, pt.y - avantLever.y) : null};
}

// Copie de l'app à la version COMPARER (sous-dossier de l'app seulement)
function extraire(dossier) {
  const prefixe = execFileSync('git', ['-C', RACINE, 'rev-parse', '--show-prefix']).toString().trim().replace(/\/$/, '');
  const depot = execFileSync('git', ['-C', RACINE, 'rev-parse', '--show-toplevel']).toString().trim();
  execFileSync('sh', ['-c', `git -C "${depot}" archive "${COMPARER}:${prefixe}" | tar -x -C "${dossier}"`]);
}

const stats = (l) => {
  const v = l.filter(x => x !== null).sort((a, b) => a - b);
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return {n: v.length, mediane: +q(0.5).toFixed(2), p90: +q(0.9).toFixed(2), max: +v[v.length - 1].toFixed(2), moyenne: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)};
};

const CONFIGS = [
  {nom: 'tablette paysage 1280×800, densité 1,5', w: 1280, h: 800},
  {nom: 'tablette portrait 800×1280, densité 1,5', w: 800, h: 1280},
  {nom: 'dans le cadre du site (984×688) sur 1280×800', w: 1280, h: 800, cadre: [984, 688]}
];

async function simulation(base, cfg, essais, graine) {
  const o = await ouvrir(base, cfg);
  const g = await geom(o);
  const zoom = await evApp(o, `typeof zoomLoupe==='function'?zoomLoupe():3`);
  const rng = aleatoire(graine);
  const res = [];
  for (let i = 0; i < essais; i++) {
    // Cibles dans toute l'image, y compris près des bords (6 px vidéo)
    const cible = {x: 6 + rng() * (g.vw - 12), y: 6 + rng() * (g.vh - 12)};
    res.push(await eleve(o, g, cible, rng, {zoomLoupe: zoom}));
  }
  await fermer(o);
  return {g, zoom, res};
}

try {
  // ------------------------------------------------------------------ 1. Précision
  if (partie(1, 'Précision au doigt (élève simulé : tremblement, saut au lever)')) {
    let ancien = null;
    if (COMPARER) {
      const dossier = mkdtempSync(path.join(tmpdir(), 'jsmeca-ancien-'));
      extraire(dossier);
      ancien = {dossier, srv: await servir(dossier)};
    }
    for (const cfg of CONFIGS) {
      const essais = 16;
      const neuf = await simulation(srv.base, cfg, essais, 4242);
      const e = stats(neuf.res.map(r => r.erreur));
      const ecarts = neuf.res.map(r => r.ecartAuReticule);
      console.log(`     ${cfg.nom} : 1 px vidéo = ${neuf.g.k.toFixed(2)} px à l’écran, loupe ×${neuf.zoom.toFixed(2)}`);
      console.log(`     erreur (px vidéo) — cette version : ${JSON.stringify(e)}`);
      if (ancien) {
        const av = await simulation(ancien.srv.base, cfg, essais, 4242);
        console.log(`     erreur (px vidéo) — ${COMPARER} : ${JSON.stringify(stats(av.res.map(r => r.erreur)))} ; écart point / réticule vu avant le lever : ${JSON.stringify(stats(av.res.map(r => r.ecartAuReticule)))}`);
      }
      verifier(`${cfg.nom} : ${essais} pointages, tous enregistrés`, neuf.res.every(r => r.pt), neuf.res.filter(r => !r.pt).length);
      verifier(`${cfg.nom} : point enregistré = réticule affiché avant le lever (saut de 9 px au lever ignoré, écart ≤ 0,05 px vidéo)`,
        ecarts.every(x => x !== null && x <= 0.05), stats(ecarts));
      verifier(`${cfg.nom} : au pixel vidéo près (erreur médiane ≤ 0,5 px vidéo, maximum ≤ 1 px vidéo)`, e.mediane <= 0.5 && e.max <= 1, e);
    }
    if (ancien) { await ancien.srv.close(); rmSync(ancien.dossier, {recursive: true, force: true}); }
  }

  // ------------------------------------------------------------------ 2. Place et contenu de la loupe
  if (partie(2, 'Loupe : jamais sous le doigt, jamais hors de l’image, pixels de la vidéo')) {
    const tailles = [...CONFIGS, {nom: 'téléphone 360×640, densité 3', w: 360, h: 640, dpr: 3}, {nom: 'téléphone couché 640×360, densité 2', w: 640, h: 360, dpr: 2}];
    for (const cfg of tailles) {
      const o = await ouvrir(srv.base, cfg);
      const g = await geom(o);
      const fautes = [], dessous = [];
      let grandeImage = Math.min(g.w, g.h) >= 280;
      const fr = [0.01, 0.12, 0.5, 0.88, 0.99];
      for (const fy of fr) for (const fx of fr) {
        const p = {x: g.l + fx * g.w, y: g.t + fy * g.h};
        await doigtPose(o, p.x, p.y); await pause(40);
        await doigtGlisse(o, p.x + 0.5, p.y + 0.5); await pause(60);
        const L = await evApp(o, `(()=>{const d=dessinerLoupe.derniere;return d&&{...d,W:width,H:height,ecartMin:LOUPE_ECART_MIN,ecart:LOUPE_ECART};})()`);
        await doigtGlisse(o, p.x, p.y - 5000); await pause(30); await doigtLeve(o); await pause(40); // annulé (hors de l'image)
        const dedans = L.cx - L.R >= 0 && L.cy - L.R >= 0 && L.cx + L.R <= L.W && L.cy + L.R <= L.H;
        const dist = Math.hypot(L.cx - L.ax, L.cy - L.ay) - L.R;
        if (!dedans || (grandeImage && dist < L.ecartMin - 0.01)) fautes.push({doigt: [fx, fy], loupe: [Math.round(L.cx), Math.round(L.cy), L.R], bordAuDoigt: Math.round(dist)});
        if (L.cy > L.ay + 1) dessous.push([fx, fy]);
      }
      const n = await evApp(o, `data.getTotalPointCount()`);
      verifier(`${cfg.nom} : 25 positions du doigt (coins, bords, centre) : loupe entière dans l’image et à ≥ 30 px du doigt${grandeImage ? '' : ' (image trop petite : seulement « dans l’image » vérifié)'}`,
        fautes.length === 0 && n === 0, {fautes: fautes.slice(0, 4), points: n, R: (await evApp(o, `rayonLoupe()`))});
      console.log(`     loupe plus basse que le doigt pour ${dessous.length}/25 positions (doigt tout en haut de l’image) : ${JSON.stringify(dessous)}`);
      await fermer(o);
    }
    // Contenu : pixel au centre de la loupe = pixel vidéo sous le réticule ; pixels nets
    {
      const o = await ouvrir(srv.base, CONFIGS[0]);
      const g = await geom(o);
      const res = [];
      for (const [vx, vy] of [[200.5, 150.5], [321.5, 211.5], [100.5, 60.5]]) {
        const p = ecran(g, vx, vy);
        await doigtPose(o, p.x, p.y); await pause(120);
        res.push(await evApp(o, `(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const d=dessinerLoupe.derniere,pd=pixelDensity(),s=dimensionsSource();
          const v=versVideo(d.x,d.y);const c=document.createElement('canvas');c.width=s.w;c.height=s.h;const x=c.getContext('2d');x.drawImage(lecteur().elt,0,0);
          const ref=x.getImageData(Math.floor(v.x),Math.floor(v.y),1,1).data;
          const e=d.Z*width/s.w; // px de loupe par pixel vidéo
          // un point de la loupe à 1/4 de pixel vidéo du centre (hors croix) et au même endroit du pixel vidéo voisin
          const lire=(dx,dy)=>drawingContext.getImageData(Math.round((d.cx+dx)*pd),Math.round((d.cy+dy)*pd),1,1).data;
          const a=lire(e*0.3,e*0.3),b=lire(e*0.3+e,e*0.3+e);
          const ref2=x.getImageData(Math.floor(v.x)+1,Math.floor(v.y)+1,1,1).data;
          const diff=(p,q)=>Math.max(Math.abs(p[0]-q[0]),Math.abs(p[1]-q[1]),Math.abs(p[2]-q[2]));
          return {visé:[v.x,v.y],ecartCentre:diff(a,ref),ecartVoisin:diff(b,ref2),e:+e.toFixed(2)};})()`));
        await doigtGlisse(o, p.x, p.y - 5000); await pause(30); await doigtLeve(o); await pause(60);
      }
      verifier('la loupe montre les pixels de la vidéo autour du réticule (pixel au centre et pixel voisin identiques à la vidéo, écart ≤ 8/255), un pixel vidéo ≥ 5 px dans la loupe',
        res.every(r => r.ecartCentre <= 8 && r.ecartVoisin <= 8 && r.e >= 5), res);
      // Image claire et image sombre : capture de la loupe (contrôle visuel)
      const p = ecran(g, 300, 200);
      await doigtPose(o, p.x, p.y); await pause(200);
      await capture(o, path.join(SORTIE, 'loupe-1280x800.png'));
      await doigtGlisse(o, p.x, p.y - 5000); await pause(30); await doigtLeve(o);
      console.log('     capture : ' + path.join(SORTIE, 'loupe-1280x800.png'));
      await fermer(o);
    }
  }

  // ------------------------------------------------------------------ 3. Étalonnage
  if (partie(3, 'Étalonnage : bouts placés au doigt, saisis sans saut, réglage fin, saut au lever')) {
    for (const cfg of [CONFIGS[0], CONFIGS[1]]) {
      const o = await ouvrir(srv.base, cfg);
      await evApp(o, `passerAuMode('Calibration')`); await pause(400);
      const g = await geom(o);
      const zoom = await evApp(o, `zoomLoupe()`);
      const rng = aleatoire(7);
      // Les deux bouts : même geste que pour pointer (pose à côté, ajuste, lève avec un saut)
      const cibles = [{x: 270.3, y: 305.6}, {x: 270.6, y: 112.2}];
      const r = [];
      for (const cible of cibles) r.push(await eleve(o, g, cible, rng, {zoomLoupe: zoom}));
      const pts = await evApp(o, `[calibrator.point1,calibrator.point2].map(p=>p&&({x:p.x,y:p.y}))`);
      const err = pts.map((p, i) => p ? Math.hypot(p.x - cibles[i].x, p.y - cibles[i].y) : null);
      verifier(`${cfg.nom} : deux bouts posés au doigt au pixel vidéo près (≤ 1 px), égaux au réticule vu avant le lever`,
        err.every(e => e !== null && e <= 1) && r.every(x => x.ecartAuReticule <= 0.05), {err, ecarts: r.map(x => x.ecartAuReticule)});
      // Saisir le bout 2 à 20 px d'écran à côté : il ne saute pas sous le doigt
      const b2 = ecran(g, pts[1].x, pts[1].y);
      await doigtPose(o, b2.x + 20, b2.y + 8); await pause(80);
      const pendant = await evApp(o, `({x:calibrator.point2.x,y:calibrator.point2.y,glisse:pointeurTactile.glisse})`);
      verifier(`${cfg.nom} : bout saisi à 21 px du doigt sans sauter sous le doigt`, pendant.glisse === 2 && Math.hypot(pendant.x - pts[1].x, pendant.y - pts[1].y) < 1e-9, pendant);
      // Glisser lentement de 40 px vers la gauche : le bout avance de 40/zoom px d'écran
      let fx = b2.x + 20;
      for (let i = 0; i < 40; i++) { fx -= 1; await doigtGlisse(o, fx, b2.y + 8); await pause(16); }
      await pause(120);
      const avantLever = await evApp(o, `({x:calibrator.point2.x,y:calibrator.point2.y})`);
      await doigtGlisse(o, fx + 4, b2.y + 14); await pause(8); await doigtGlisse(o, fx + 8, b2.y + 17);
      await doigtLeve(o); await pause(150);
      const apres = await evApp(o, `({x:calibrator.point2.x,y:calibrator.point2.y,px:calibrator.pixelDistance})`);
      const attendu = pts[1].x - 40 / zoom / g.k;
      verifier(`${cfg.nom} : glisser lent de 40 px → bout déplacé de 40/${zoom.toFixed(2)} px d’écran (réglage fin) ; saut au lever ignoré`,
        Math.abs(avantLever.x - attendu) < 0.05 && Math.abs(apres.x - avantLever.x) < 1e-9 && Math.abs(apres.y - avantLever.y) < 1e-9, {attendu, avantLever, apres});
      await fermer(o);
    }
  }

  // ------------------------------------------------------------------ 4. Pouce posé ailleurs, deuxième doigt
  if (partie(4, 'Pouce posé sur le bord de l’écran, deuxième doigt sur l’image')) {
    const o = await ouvrir(srv.base, CONFIGS[0]);
    const g = await geom(o);
    const pouce = await ev(o, `(()=>{const r=document.getElementById('panneau').getBoundingClientRect();return {x:r.left+20,y:r.bottom-20};})()`);
    const cible = ecran(g, 200, 150);
    await tactile(o, 'touchStart', [{x: pouce.x, y: pouce.y, id: 0}]); await pause(100);
    await tactile(o, 'touchStart', [{x: pouce.x, y: pouce.y, id: 0}, {x: cible.x, y: cible.y, id: 1}]); await pause(150);
    const loupe = await evApp(o, `loupeVisible()`);
    await tactile(o, 'touchEnd', [{x: pouce.x, y: pouce.y, id: 0}]); await pause(300);
    await tactile(o, 'touchEnd', []); await pause(300);
    const n = await evApp(o, `data.getTotalPointCount()`);
    verifier('pouce posé sur le panneau, doigt sur l’image : la loupe apparaît et le point est enregistré', loupe && n === 1, {loupe, n});
    await jusqua(o, `(()=>{const w=${APP(o)};return w.eval("lecteur().pret()");})()`);
    const a = ecran(g, 220, 160);
    await doigtPose(o, a.x, a.y); await pause(100);
    await tactile(o, 'touchStart', [{x: a.x, y: a.y, id: 0}, {x: a.x + 100, y: a.y + 40, id: 1}]); await pause(100);
    await tactile(o, 'touchEnd', []); await pause(300);
    verifier('deuxième doigt sur l’image (pincement) : geste abandonné, aucun point', await evApp(o, `data.getTotalPointCount()===1 && !pointeurTactile.actif`));
    await fermer(o);
  }

  // ------------------------------------------------------------------ 5. Annulation
  if (partie(5, 'Annulation : hors de l’image, touchcancel')) {
    const o = await ouvrir(srv.base, CONFIGS[0]);
    const g = await geom(o);
    // Petit écart hors de l'image (12 px à gauche du bord) puis retour : le point est enregistré
    const p = ecran(g, 3, 150);
    await doigtPose(o, p.x, p.y); await pause(60);
    for (let i = 1; i <= 14; i++) { await doigtGlisse(o, p.x - i, p.y); await pause(16); }
    const pendant = await evApp(o, `({loupe:loupeVisible(),msg:document.getElementById('instructions').textContent})`);
    await pause(120); await doigtLeve(o); await pause(300);
    const n1 = await evApp(o, `data.getTotalPointCount()`);
    verifier('doigt 11 px hors de l’image (réglage près du bord) : loupe toujours là, point enregistré au bord', pendant.loupe && /loupe/.test(pendant.msg) && n1 === 1, {pendant, n1});
    await jusqua(o, `(()=>{const w=${APP(o)};return w.eval("lecteur().pret()");})()`);
    // Glisser franchement hors de l'image : message, rien d'enregistré
    const q = ecran(g, 100, 150);
    await doigtPose(o, q.x, q.y); await pause(60);
    for (let i = 1; i <= 10; i++) { await doigtGlisse(o, q.x - 30 * i, q.y); await pause(16); }
    const msg = await evApp(o, `document.getElementById('instructions').textContent`);
    await doigtLeve(o); await pause(300);
    const n2 = await evApp(o, `data.getTotalPointCount()`);
    verifier('glisser loin hors de l’image puis relâcher : « Relâche ici pour annuler », aucun point', /annuler/.test(msg) && n2 === 1, {msg, n2});
    await doigtPose(o, q.x, q.y); await pause(100);
    await tactile(o, 'touchCancel', []); await pause(150);
    const m3 = await evApp(o, `({n:data.getTotalPointCount(),msg:document.getElementById('instructions').textContent,actif:pointeurTactile.actif})`);
    verifier('touchcancel (le navigateur reprend le geste) : rien d’enregistré, message « Geste interrompu »', m3.n === 1 && !m3.actif && /interrompu/.test(m3.msg), m3);
    await fermer(o);
  }

  // ------------------------------------------------------------------ 6. Page immobile
  if (partie(6, 'Ni défilement ni zoom de la page pendant un geste, appui long, double toucher')) {
    // Cadre plus haut que la fenêtre : la page du site peut défiler
    const o = await ouvrir(srv.base, {w: 1280, h: 700, cadre: [984, 900]});
    await ev(o, `window.scrollTo(0, 40)`); await pause(100);
    const g = await geom(o);
    const avant = await ev(o, `({y:scrollY,s:visualViewport.scale,yi:document.querySelector('iframe').contentWindow.scrollY})`);
    const p = ecran(g, 250, 200);
    await doigtPose(o, p.x, p.y); await pause(40);
    for (let i = 1; i <= 20; i++) { await doigtGlisse(o, p.x, p.y + 15 * i); await pause(16); }
    for (let i = 20; i >= 0; i--) { await doigtGlisse(o, p.x, p.y + 15 * i); await pause(16); }
    await doigtLeve(o); await pause(300);
    const apres = await ev(o, `({y:scrollY,s:visualViewport.scale,yi:document.querySelector('iframe').contentWindow.scrollY})`);
    verifier('cadre : glisser de 300 px sur l’image ne fait défiler ni la page du site ni l’app', avant.y === apres.y && avant.yi === apres.yi && apres.s === 1, {avant, apres});
    await jusqua(o, `(()=>{const w=${APP(o)};return w.eval("lecteur().pret()");})()`);
    // Appui long (900 ms) : ni sélection, ni menu ; le point est enregistré
    const n0 = await evApp(o, `data.getTotalPointCount()`);
    const q = ecran(g, 260, 210);
    await evApp(o, `window.__menu=0;document.addEventListener('contextmenu',e=>{if(!e.defaultPrevented)window.__menu++;})`);
    await doigtPose(o, q.x, q.y); await pause(900); await doigtLeve(o); await pause(300);
    const l = await evApp(o, `({sel:String(getSelection()),menu:window.__menu,n:data.getTotalPointCount()})`);
    verifier('appui long : ni sélection ni menu contextuel, le point est enregistré', l.sel === '' && l.menu === 0 && l.n === n0 + 1, l);
    await jusqua(o, `(()=>{const w=${APP(o)};return w.eval("lecteur().pret()");})()`);
    // Double toucher rapide : pas de zoom de la page
    const d = ecran(g, 270, 220);
    await doigtPose(o, d.x, d.y); await pause(40); await doigtLeve(o); await pause(80);
    await doigtPose(o, d.x, d.y); await pause(40); await doigtLeve(o); await pause(500);
    const z = await ev(o, `({s:visualViewport.scale,si:document.querySelector('iframe').contentWindow.visualViewport.scale})`);
    verifier('double toucher sur l’image : pas de zoom', z.s === 1 && z.si === 1, z);
    await fermer(o);
    // App seule, page zoomée (pincement hors de l'image) : position du doigt (clientX) et place de
    // l'image restent dans le même repère, le toucher pointe sous le doigt. Chrome reçoit ici des
    // coordonnées CSS : cela vérifie la cohérence des repères, pas un vrai pincement à l'écran.
    const s = await ouvrir(srv.base, CONFIGS[0]);
    await s.c.send('Emulation.setPageScaleFactor', {pageScaleFactor: 1.5}, s.s); await pause(300);
    const gs = await geom(s);
    const cible = {x: 180.25, y: 140.75};
    const ce = ecran(gs, cible.x, cible.y);
    const vv = await ev(s, `({s:visualViewport.scale})`);
    await doigtPose(s, ce.x, ce.y); await pause(80); await doigtLeve(s); await pause(300);
    const pt = await evApp(s, `window.__pt`);
    verifier('page zoomée ×1,5 : le toucher pointe sous le doigt (≤ 1 px d’écran ; repères CSS seulement)', vv.s > 1.4 && pt && Math.hypot(pt.x - cible.x, pt.y - cible.y) * gs.k <= 1, {vv, pt, cible});
    await fermer(s);
  }

  // ------------------------------------------------------------------ 7. Coût du dessin
  if (partie(7, 'Coût du dessin pendant un geste, processeur ralenti ×6 (mesure)')) {
    const mesurer = async (base, nom) => {
      const o = await ouvrir(base, CONFIGS[0]);
      await o.c.send('Emulation.setCPUThrottlingRate', {rate: 6}, o.s);
      await evApp(o, `(()=>{const f=draw;window.__durees=[];window.draw=function(){const t=performance.now();f();window.__durees.push(performance.now()-t);};})()`);
      const g = await geom(o);
      const p = ecran(g, 200, 150);
      await doigtPose(o, p.x, p.y); await pause(200);
      await evApp(o, `window.__durees=[]`);
      for (let i = 0; i < 60; i++) { await doigtGlisse(o, p.x + (i % 20), p.y + (i % 7)); await pause(16); }
      const d = await evApp(o, `window.__durees.slice()`);
      await doigtGlisse(o, p.x, p.y - 5000); await doigtLeve(o);
      await o.c.send('Emulation.setCPUThrottlingRate', {rate: 1}, o.s);
      await fermer(o);
      const st = stats(d);
      console.log(`     ${nom} : dessin d’une image pendant le geste (ms, ×6) ${JSON.stringify(st)}`);
      return st;
    };
    await mesurer(srv.base, 'cette version');
    if (COMPARER) {
      const dossier = mkdtempSync(path.join(tmpdir(), 'jsmeca-ancien-'));
      extraire(dossier);
      const a = await servir(dossier);
      await mesurer(a.base, COMPARER);
      await a.close(); rmSync(dossier, {recursive: true, force: true});
    }
    verifier('mesure faite (pas de seuil : Chrome sur Mac n’est pas la tablette)', true);
  }
} catch (e) {
  verifier('déroulement sans erreur', false, String(e && e.stack || e).slice(0, 900));
} finally {
  c.quit();
  await srv.close();
}

console.log(echecs.length ? `\n${echecs.length} échec(s) :\n- ` + echecs.join('\n- ') : '\nTous les contrôles sont passés.');
console.log('Captures : ' + SORTIE);
process.exit(echecs.length ? 1 : 0);
