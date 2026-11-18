// tests/verifier-loupe.mjs — pointage au doigt avec la loupe, dans Chrome sans écran (tactile émulé)
//
//   node tests/verifier-loupe.mjs [--sortie DOSSIER] [--seulement 1,3,…] [--comparer COMMIT]
//
// Sert l'app avec le petit serveur de tests/cdp.mjs et pilote Chrome par le protocole DevTools
// (aucune dépendance npm). Tailles de la tablette visée (Galaxy Tab A 10,1 pouces : 1280 × 800
// et 800 × 1280 px CSS, densité 1,5), seule et dans un cadre comme dans le site.
//
// Deux façons de toucher l'écran :
//  - par le protocole DevTools (vrais événements du navigateur : défilement, zoom, appui long,
//    plusieurs doigts) pour les parties 2, 4, 5 et 6 ;
//  - par un « pilote » dans la page (parties 1, 3 et 8), qui envoie des TouchEvent en temps réel
//    au rythme voulu (16 ms, 10 par seconde…) et donne à chacun l'instant prévu (timeStamp), arrondi
//    au besoin comme Firefox (16,67 ms). Chrome sans écran met jusqu'à 100 ms à transmettre un
//    événement du protocole et ne garde l'instant fourni que s'il est proche du vrai : pour tout
//    ce qui dépend du rythme du doigt (vitesse, lever), seul le pilote donne des mesures sûres.
//    Chaque contrôle du pilote vérifie aussi que l'app a bien reçu les instants envoyés.
// Parties :
//   1. précision : un « élève simulé » (pilote) pose le doigt à côté de la cible, glisse en
//      regardant la loupe avec 100 ms de retard, tremble, attend puis lève le doigt avec un saut
//      de 9 px ; erreur du point enregistré (pixels vidéo) ; point = croix vue avant le lever.
//      Avec --comparer COMMIT, même simulation (mêmes tirages) sur cette version : avant / après ;
//   2. place de la loupe : entièrement dans l'image, jamais sur le doigt ; pixels de la vidéo ;
//   3. étalonnage : bouts posés au doigt, saisis sans saut, réglage fin, saut au lever ;
//   4. pouce posé sur le panneau ; deuxième doigt sur l'image ;
//   5. annulation : loin hors de l'image, touchcancel ;
//   6. ni défilement ni zoom de la page (ni de la page qui contient le cadre), appui long,
//      double toucher ;
//   7. coût du dessin d'une image pendant un geste, processeur ralenti ×6 (mesure, sans seuil) ;
//   8. défauts relevés en relecture (8.1 à 8.8 échouaient sur le commit 8902a62, 8.9 — deuxième
//      relecture — sur 5feed34) : lever après un
//      glissé rapide, glissé vif après une pause, bords et coins atteignables, élève qui converge
//      sans dépasser, pouce posé sur l'image ; second bout tout près du premier, loupe qui ne
//      saute pas d'un côté à l'autre, bouts d'étalonnage visibles dans la loupe à la souris.
// Le script n'est pas nécessaire au fonctionnement de l'app.

import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {servir, lancerChrome, ouvrirOnglet, ev, jusqua, pause, capture, fermer} from './cdp.mjs';

// Toucher par le protocole DevTools (instants réels)
const tactile = (o, type, touchPoints) => o.c.send('Input.dispatchTouchEvent', {type, touchPoints}, o.s);
const doigtPose = (o, x, y) => tactile(o, 'touchStart', [{x, y}]);
const doigtGlisse = (o, x, y) => tactile(o, 'touchMove', [{x, y}]);
const doigtLeve = (o) => tactile(o, 'touchEnd', []);

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (nom) => { const i = process.argv.indexOf(nom); return i > 0 ? process.argv[i + 1] : null; };
const SORTIE = arg('--sortie') || mkdtempSync(path.join(tmpdir(), 'jsmeca-loupe-'));
mkdirSync(SORTIE, {recursive: true});
const PARTIES = arg('--seulement') ? arg('--seulement').split(',').map(Number) : null;
const COMPARER = arg('--comparer');
const BLOCS = arg('--bloc') ? arg('--bloc').split(',').map(Number) : null; // sous-parties de la partie 8
let blocsLances = 0;
const bloc = (n) => {
  if (BLOCS && !BLOCS.includes(n)) return false;
  // Un Chrome neuf par sous-contrôle : après une vingtaine d'onglets, Chrome sans écran se fige parfois
  if (blocsLances++ > 0) { c.quit(); c = lancerChrome(); }
  return true;
};
// (lancer par exemple : --seulement 8 --bloc 1,7)

const echecs = [];
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 700) : ''));
  if (!ok) echecs.push(nom);
}

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
const attendrePret = (o) => jusqua(o, `(()=>{const w=${APP(o)};return w.eval("lecteur().pret()");})()`);

// Pilote dans la page : TouchEvent envoyés en temps réel, instant (timeStamp) = instant prévu,
// arrondi au besoin. Coordonnées en px CSS du canevas. Élève simulé (voir partie 1).
const PILOTE = `(()=>{if(window.__pilote)return;
const c=document.querySelector('canvas');const actifs=new Map();const recus=[];
['touchstart','touchmove','touchend','touchcancel'].forEach(t=>c.addEventListener(t,e=>recus.push(e.timeStamp),{capture:true}));
const msgs=[];const am=afficherMessageTemporaire;window.afficherMessageTemporaire=function(m,d){msgs.push(m);return am(m,d);};
const dormir=ms=>new Promise(r=>setTimeout(r,ms));
async function jusquA(t){while(performance.now()<t-0.3)await dormir(Math.max(0,Math.min(4,t-performance.now()-0.3)));}
let arrondi=0;
// changes : [{id, x, y}] (plusieurs doigts dans le même événement possibles) ; ts null : instant 0
function envoyer(type,changes,ts){const r=c.getBoundingClientRect();
  const mk=(i,p)=>new Touch({identifier:i,target:c,clientX:r.left+p.x*r.width/width,clientY:r.top+p.y*r.height/height,radiusX:8,radiusY:8,force:1});
  const ch=changes.map(q=>mk(q.id,q));
  for(const q of changes){if(type==='touchstart'||type==='touchmove')actifs.set(q.id,{x:q.x,y:q.y});else actifs.delete(q.id);}
  const tous=[...actifs].map(([i,p])=>mk(i,p));
  const e=new TouchEvent(type,{touches:tous,targetTouches:tous,changedTouches:ch,bubbles:true,cancelable:true});
  const t=ts===null?0:arrondi?Math.floor(ts/arrondi)*arrondi:ts;Object.defineProperty(e,'timeStamp',{value:t});c.dispatchEvent(e);return t;}
const croix=()=>{const p=positionViseur();return p&&{x:p.x,y:p.y};};
// Étapes {t (ms depuis le début), type:'start'|'move'|'end'|'cancel', id, x, y, ch:[{id,x,y}…], lire}.
// lu.lever : croix affichée juste avant le dernier lever ; opts.zero : instants à 0 (repli de l'app)
async function jouer(etapes,opts={}){arrondi=opts.arrondi||0;recus.length=0;msgs.length=0;window.__pt=null;window.__pts=[];
  const t0=performance.now()+30;const lu={};const envoyes=[];
  for(const s of etapes){const cible=t0+s.t;await jusquA(cible);if(s.type==='end')lu.lever=croix();
    envoyes.push(envoyer('touch'+s.type,s.ch||[{id:s.id??1,x:s.x,y:s.y}],opts.zero?null:cible));if(s.lire)lu[s.lire]=croix();}
  arrondi=0;const instantsOk=recus.length===envoyes.length&&recus.every((t,i)=>Math.abs(t-envoyes[i])<1e-6);
  return {lu,instantsOk,msgs:msgs.slice(),pts:window.__pts.slice()};}
let graine=1;const hasard=()=>{graine=(graine*1664525+1013904223)>>>0;return graine/4294967296;};
const gauss=()=>Math.sqrt(-2*Math.log(1-hasard()))*Math.cos(2*Math.PI*hasard());
// Élève simulé : cible (px CSS du canevas) ; pose à « decalage » px dans la direction « angle » ;
// voit la croix avec « delai » ms de retard ; croit que dans la loupe la croix suit son doigt ;
// glisse vers la cible à min(vmax, écart vu dans la loupe / tau) ; tremble (σ px) ; s'arrête
// quand l'écart vu est sous 1,5 px de loupe, attend, puis lève le doigt (saut de « saut » px).
async function eleve(o){const {cx,cy,decalage,angle,delai=100,vmax=0.35,tau=250,sigma=0.5,saut=9,germe=1}=o;graine=germe;
  const Z=typeof zoomLoupe==='function'?zoomLoupe():3;
  let fx=cx+decalage*Math.cos(angle),fy=cy+decalage*Math.sin(angle);
  let t=performance.now();envoyer('touchstart',[{id:1,x:fx,y:fy}],t);const vus=[{t,...croix()}];
  let stable=0,corrections=0,prec=null,fin=null;const debut=t;let parcours=0;const tenue=[];
  for(;;){await dormir(16);t=performance.now();const p=croix();if(!p){fin='annulé';break;}vus.push({t,...p});
    let vu=vus[0];for(const v of vus)if(v.t<=t-delai)vu=v;
    const ex=cx-vu.x,ey=cy-vu.y,n=Math.hypot(ex,ey);let dx=0,dy=0;
    if(n*Z<1.5){stable+=16;tenue.push(versVideo(p.x,p.y));if(stable>=150+delai)break;}
    else{stable=0;tenue.length=0;const v=Math.min(vmax,n*Z/tau);dx=v*16*ex/n;dy=v*16*ey/n;
      if(prec&&prec.x*dx+prec.y*dy<0)corrections++;prec={x:dx,y:dy};}
    fx+=dx;fy+=dy;parcours+=Math.hypot(dx,dy);envoyer('touchmove',[{id:1,x:fx+sigma*gauss(),y:fy+sigma*gauss()}],t);
    if(t-debut>6000){fin='trop long';break;}}
  const avant=croix();if(avant)tenue.push(versVideo(avant.x,avant.y));
  const a2=Math.PI/2+(hasard()-0.5)*2;
  for(const k of [3,7,9]){await dormir(8);envoyer('touchmove',[{id:1,x:fx+k/9*saut*Math.cos(a2),y:fy+k/9*saut*Math.sin(a2)}],performance.now());}
  await dormir(8);window.__pt=null;envoyer('touchend',[{id:1,x:fx,y:fy}],performance.now());
  return {fin:fin||'ok',avant,tenue,pt:window.__pt,corrections,duree:Math.round(t-debut),parcours:Math.round(parcours)};}
window.__pilote={envoyer,jouer,dormir,eleve,croix};})()`;

async function ouvrir(base, {w, h, dpr = 1.5, cadre = null, tactile = true}) {
  const page = cadre ? `/tests/cadre.html?w=${cadre[0]}&h=${cadre[1]}` : '/index.html';
  const o = await ouvrirOnglet(c, base + page, w, h, {tactile, dpr});
  o.cadre = !!cadre;
  await pretApp(o);
  await pause(300);
  // Trace des pointages (pixels vidéo, y vers le bas) : même chose dans l'ancienne version
  await evApp(o, `(()=>{if(window.__trace)return;window.__trace=true;const f=traiterPointage;window.traiterPointage=function(x,y){window.__pt={x,y};(window.__pts=window.__pts||[]).push({x,y});return f(x,y);};})()`);
  await evApp(o, PILOTE);
  return o;
}

// Repère de l'image : position à l'écran (px CSS de la page principale) d'un point vidéo
const GEOM = `(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),s=dimensionsSource();
  let ox=0,oy=0;if(window.frameElement){const f=window.frameElement.getBoundingClientRect();ox=f.left+window.frameElement.clientLeft;oy=f.top+window.frameElement.clientTop;}
  return {l:r.left+ox,t:r.top+oy,w:width,h:height,rw:r.width,rh:r.height,vw:s.w,vh:s.h,k:r.width/s.w,kc:width/s.w,kcy:height/s.h,
    vp:{l:-r.left*width/r.width,t:-r.top*height/r.height,r:(innerWidth-r.left)*width/r.width,b:(innerHeight-r.top)*height/r.height}};})()`;
const geom = (o) => evApp(o, GEOM);
const ecran = (g, vx, vy) => ({x: g.l + vx * g.k, y: g.t + vy * g.k});
const jouer = (o, etapes, opts = {}) => evApp(o, `window.__pilote.jouer(${JSON.stringify(etapes)},${JSON.stringify(opts)})`);
const enVideo = (g, p) => p && {x: p.x / g.kc, y: p.y / g.kcy};

// Copie de l'app à la version COMPARER (sous-dossier de l'app seulement)
function extraire(dossier) {
  const prefixe = execFileSync('git', ['-C', RACINE, 'rev-parse', '--show-prefix']).toString().trim().replace(/\/$/, '');
  const depot = execFileSync('git', ['-C', RACINE, 'rev-parse', '--show-toplevel']).toString().trim();
  execFileSync('sh', ['-c', `git -C "${depot}" archive "${COMPARER}:${prefixe}" | tar -x -C "${dossier}"`]);
}

const stats = (l) => {
  const v = l.filter(x => x !== null && x !== undefined).sort((a, b) => a - b);
  if (!v.length) return {n: 0};
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return {n: v.length, mediane: +q(0.5).toFixed(2), p90: +q(0.9).toFixed(2), max: +v[v.length - 1].toFixed(2), moyenne: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)};
};

const CONFIGS = [
  {nom: 'tablette paysage 1280×800, densité 1,5', w: 1280, h: 800},
  {nom: 'tablette portrait 800×1280, densité 1,5', w: 800, h: 1280},
  {nom: 'dans le cadre du site (984×688) sur 1280×800', w: 1280, h: 800, cadre: [984, 688]}
];

// Série d'élèves simulés : cibles réparties dans l'image, poses à `decalages` px, tirages fixes
async function simulation(base, cfg, {essais = 12, decalages = [12], germe = 4242, eleve = {}} = {}) {
  const o = await ouvrir(base, cfg);
  const g = await geom(o);
  const zoom = await evApp(o, `typeof zoomLoupe==='function'?zoomLoupe():3`);
  let s = germe >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const res = [];
  for (const decalage of decalages) {
    for (let i = 0; i < essais; i++) {
      const cible = {x: 0.12 * g.w + r() * 0.76 * g.w, y: 0.12 * g.h + r() * 0.76 * g.h};
      const e = await evApp(o, `window.__pilote.eleve(${JSON.stringify({cx: cible.x, cy: cible.y, decalage, angle: 2 * Math.PI * r(), germe: 1 + i, ...eleve})})`);
      const pt = e.pt, cv = enVideo(g, {x: cible.x, y: cible.y}), av = enVideo(g, e.avant);
      res.push({...e, tenue: undefined, decalage, erreur: pt ? Math.hypot(pt.x - cv.x, pt.y - cv.y) : null,
        // le point doit être l'une des positions que la croix a affichées pendant l'immobilité finale
        ecartAuReticule: pt && e.tenue.length ? Math.min(...e.tenue.map(q => Math.hypot(pt.x - q.x, pt.y - q.y))) : null});
      await attendrePret(o);
    }
  }
  await fermer(o);
  return {g, zoom, res};
}

try {
  // ------------------------------------------------------------------ 1. Précision
  if (partie(1, 'Précision au doigt (élève simulé : retard de 100 ms, tremblement, saut au lever)')) {
    let ancien = null;
    if (COMPARER) {
      const dossier = mkdtempSync(path.join(tmpdir(), 'jsmeca-ancien-'));
      extraire(dossier);
      ancien = {dossier, srv: await servir(dossier)};
    }
    for (const cfg of CONFIGS) {
      const neuf = await simulation(srv.base, cfg);
      const e = stats(neuf.res.map(r => r.erreur));
      const ecarts = neuf.res.map(r => r.ecartAuReticule);
      console.log(`     ${cfg.nom} : 1 px vidéo = ${neuf.g.kc.toFixed(2)} px à l’écran, loupe ×${neuf.zoom.toFixed(2)}`);
      console.log(`     erreur (px vidéo) — cette version : ${JSON.stringify(e)} ; corrections ${JSON.stringify(stats(neuf.res.map(r => r.corrections)))}`);
      if (ancien) {
        const av = await simulation(ancien.srv.base, cfg);
        console.log(`     erreur (px vidéo) — ${COMPARER} : ${JSON.stringify(stats(av.res.map(r => r.erreur)))} ; écart point / croix vue avant le lever : ${JSON.stringify(stats(av.res.map(r => r.ecartAuReticule)))} ; non abouties : ${av.res.filter(r => r.fin !== 'ok').length}`);
      }
      verifier(`${cfg.nom} : ${neuf.res.length} pointages, tous aboutis et enregistrés`, neuf.res.every(r => r.fin === 'ok' && r.pt), neuf.res.filter(r => r.fin !== 'ok' || !r.pt).map(r => r.fin));
      verifier(`${cfg.nom} : point enregistré = une position affichée par la croix pendant l’immobilité avant le lever (saut de 9 px au lever ignoré, écart ≤ 0,05 px vidéo)`,
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
      let grandeImage = Math.min(g.rw, g.rh) >= 280;
      const fr = [0.01, 0.12, 0.5, 0.88, 0.99];
      for (const fy of fr) for (const fx of fr) {
        const p = {x: g.l + fx * g.rw, y: g.t + fy * g.rh};
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
      // Les deux bouts : même geste que pour pointer (pose à côté, ajuste, lève avec un saut)
      const cibles = [{x: 270.3, y: 305.6}, {x: 270.6, y: 112.2}];
      const r = [];
      for (const [i, cible] of cibles.entries()) {
        r.push(await evApp(o, `window.__pilote.eleve(${JSON.stringify({cx: cible.x * g.kc, cy: cible.y * g.kcy, decalage: 12, angle: 1 + 2 * i, germe: 7 + i})})`));
        await pause(200);
      }
      const pts = await evApp(o, `[calibrator.point1,calibrator.point2].map(p=>p&&({x:p.x,y:p.y}))`);
      const err = pts.map((p, i) => p ? Math.hypot(p.x - cibles[i].x, p.y - cibles[i].y) : null);
      const ecarts = r.map((x, i) => pts[i] && x.tenue.length ? +Math.min(...x.tenue.map(q => Math.hypot(pts[i].x - q.x, pts[i].y - q.y))).toFixed(3) : null);
      verifier(`${cfg.nom} : deux bouts posés au doigt au pixel vidéo près (≤ 1 px), là où la croix était affichée pendant l’immobilité avant le lever (≤ 0,05 px)`,
        err.every(e => e !== null && e <= 1) && ecarts.every(e => e !== null && e <= 0.05), {err, ecarts});
      // Saisir le bout 2 à 21 px de lui ; glisser lentement de 40 px vers la gauche (1 px par
      // 16 ms) ; attendre ; lever avec un saut : le bout avance de 40/zoom px, sans saut
      const b = {x: pts[1].x * g.kc, y: pts[1].y * g.kcy};
      const x0 = b.x + 20, y0 = b.y + 8;
      const etapes = [{t: 0, type: 'start', x: x0, y: y0}, {t: 40, type: 'move', x: x0, y: y0, lire: 'saisi'}];
      let t = 40;
      for (let i = 1; i <= 40; i++) { t += 16; etapes.push({t, type: 'move', x: x0 - i, y: y0}); }
      for (let i = 0; i < 10; i++) { t += 16; etapes.push({t, type: 'move', x: x0 - 40, y: y0, lire: i === 9 ? 'avant' : undefined}); }
      etapes.push({t: t + 8, type: 'move', x: x0 - 36, y: y0 + 6}, {t: t + 16, type: 'move', x: x0 - 32, y: y0 + 9}, {t: t + 24, type: 'end', x: x0 - 32, y: y0 + 9});
      const j = await jouer(o, etapes);
      const apres = await evApp(o, `({x:calibrator.point2.x,y:calibrator.point2.y})`);
      verifier(`${cfg.nom} : bout saisi à 21 px du doigt sans sauter sous le doigt (la croix part du bout)`,
        Math.hypot(j.lu.saisi.x / g.kc - pts[1].x, j.lu.saisi.y / g.kcy - pts[1].y) < 1e-6, {saisi: enVideo(g, j.lu.saisi), bout: pts[1]});
      const attendu = pts[1].x - 40 / zoom / g.kc;
      verifier(`${cfg.nom} : glisser lent de 40 px → bout déplacé de 40/${zoom.toFixed(2)} px d’écran (réglage fin) ; saut au lever ignoré ; instants reçus = instants envoyés`,
        j.instantsOk && Math.abs(j.lu.avant.x / g.kc - attendu) < 0.05 && Math.abs(apres.x - j.lu.avant.x / g.kc) < 1e-6 && Math.abs(apres.y - j.lu.avant.y / g.kcy) < 1e-6,
        {attendu, avant: enVideo(g, j.lu.avant), apres, instants: j.instantsOk});
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
  // ------------------------------------------------------------------ 8. Défauts de la relecture
  if (partie(8, 'Défauts relevés en relecture (pilote dans la page, temps réel)')) {
    // Fin de geste sans point : le doigt part loin hors de l'image
    const horsImage = (t, x, y) => [{t, type: 'move', x, y: y - 5000}, {t: t + 8, type: 'end', x, y: y - 5000}];
    const immobile = (t0, duree, pas, x, y) => {
      const e = [];
      for (let t = t0, i = 0; t <= t0 + duree; t += pas, i++) e.push({t, type: 'move', x: x + (i % 2 ? 0.2 : -0.2), y});
      return e;
    };
    const dernierT = (e) => e[e.length - 1].t;

    // ---- 8.1 Lever après un glissé (rapide ou non) ; saut et roulement du lever ignorés
    if (bloc(1))
    {
      const o = await ouvrir(srv.base, CONFIGS[0]);
      const g = await geom(o);
      const x0 = 0.3 * g.w, y0 = 0.5 * g.h;
      const res = [];
      const essai = async (nom, etapes, attendu, opts = {}) => {
        const j = await jouer(o, etapes, {arrondi: opts.arrondi || 0});
        await pause(80);
        const pt = await evApp(o, `window.__pt`);
        const ecart = pt && j.lu[attendu] ? Math.hypot(pt.x - j.lu[attendu].x / g.kc, pt.y - j.lu[attendu].y / g.kcy) : null;
        res.push({nom, ecart: ecart === null ? null : +ecart.toFixed(3), instants: j.instantsOk, tolerance: opts.tolerance || 0.05});
        await evApp(o, `window.__pt=null`);
        await attendrePret(o);
      };
      for (const pas of [16, 100]) {
        for (const arrondi of pas === 16 ? [0, 16.667] : [0]) {
          const suffixe = ` (${pas === 16 ? '60' : '10'} év./s${arrondi ? ', instants arrondis à 16,67 ms' : ''})`;
          // Glissé de 60 px à 1 px/ms ou 0,3 px/ms, arrêt, lever 8 ou 40 ms après le dernier mouvement
          for (const v of [1, 0.3]) {
            for (const apres of [8, 40]) {
              const e = [{t: 0, type: 'start', x: x0, y: y0}, ...immobile(pas, 300, pas, x0, y0)];
              let t = dernierT(e), x = x0;
              while (x < x0 + 60 - 1e-9) { t += pas; x = Math.min(x0 + 60, x + v * pas); e.push({t, type: 'move', x, y: y0}); }
              e[e.length - 1].lire = 'fin';
              e.push({t: t + apres, type: 'end', x, y: y0});
              await essai(`glissé de 60 px à ${v} px/ms, lever ${apres} ms après${suffixe}`, e, 'fin', {arrondi});
            }
          }
          // Saut au lever : 9 px en 24 ms (à 10 év./s : un seul événement)
          {
            const e = [{t: 0, type: 'start', x: x0, y: y0}, ...immobile(pas, 300, pas, x0, y0)];
            e[e.length - 1].lire = 'avant';
            let t = dernierT(e);
            if (pas === 16) for (const k of [3, 7, 9]) { t += 8; e.push({t, type: 'move', x: x0, y: y0 + k}); }
            else { t += 100; e.push({t, type: 'move', x: x0, y: y0 + 9}); }
            e.push({t: t + 8, type: 'end', x: x0, y: y0 + 9});
            await essai(`saut de 9 px au lever${suffixe}`, e, 'avant', {arrondi});
          }
          // Saut au lever après une immobilité sans aucun événement (écran qui n'envoie rien quand
          // le doigt ne bouge pas, comme le pilotage de Firefox)
          {
            const e = [{t: 0, type: 'start', x: x0, y: y0}, {t: pas, type: 'move', x: x0 + 3, y: y0}, {t: 2 * pas, type: 'move', x: x0 + 6, y: y0, lire: 'avant'}];
            let t = 2 * pas + 300;
            if (pas === 16) for (const k of [3, 7, 9]) { t += 8; e.push({t, type: 'move', x: x0 + 6, y: y0 + k}); }
            else { t += 100; e.push({t, type: 'move', x: x0 + 6, y: y0 + 9}); }
            e.push({t: t + 8, type: 'end', x: x0 + 6, y: y0 + 9});
            await essai(`saut de 9 px au lever après 300 ms sans événement${suffixe}`, e, 'avant', {arrondi});
          }
          // Doigt qui roule en se levant : 12 px en 150 ms
          {
            const e = [{t: 0, type: 'start', x: x0, y: y0}, ...immobile(pas, 300, pas, x0, y0)];
            e[e.length - 1].lire = 'avant';
            let t = dernierT(e);
            const t1 = t;
            while (t + pas <= t1 + 150) { t += pas; e.push({t, type: 'move', x: x0, y: y0 + 12 * (t - t1) / 150}); }
            e.push({t: t1 + 150, type: 'end', x: x0, y: y0 + 12});
            // Le début d'un roulement lent ne se distingue pas du tremblement (immobilité jugée sur
            // 60 ms) : ignoré à un quart de pixel vidéo près
            await essai(`doigt qui roule de 12 px en 150 ms au lever${suffixe}`, e, 'avant', {arrondi, tolerance: 0.25});
          }
        }
      }
      const mauvais = res.filter(r => r.ecart === null || r.ecart > r.tolerance || !r.instants);
      verifier(`lever : point = croix affichée au dernier mouvement après un glissé (1 et 0,3 px/ms, lever 8 et 40 ms après), = croix d’avant le saut (≤ 0,05 px vidéo) ou le roulement du lever (≤ 0,25 px vidéo) ; 60 et 10 év./s, instants arrondis ou non (${res.length} cas, dont un saut après 300 ms sans événement ; instants reçus = envoyés)`,
        mauvais.length === 0, mauvais.length ? mauvais : res.map(r => r.ecart));
      await fermer(o);
    }

    // ---- 8.2 Glissé vif après une pause sans événement
    if (bloc(2))
    {
      const o = await ouvrir(srv.base, CONFIGS[0]);
      const g = await geom(o);
      const x0 = 0.3 * g.w, y0 = 0.5 * g.h;
      const mesure = async (pauseMs) => {
        const e = [{t: 0, type: 'start', x: x0, y: y0}, ...immobile(16, 200, 16, x0, y0)];
        e[e.length - 1].lire = 'a';
        let t = dernierT(e) + pauseMs;
        for (let i = 1; i <= 4; i++) { t += 10; e.push({t, type: 'move', x: x0 + 15 * i, y: y0}); }
        e[e.length - 1].lire = 'b';
        e.push(...horsImage(t + 30, x0 + 60, y0));
        const j = await jouer(o, e);
        await attendrePret(o);
        return {avance: +(j.lu.b.x - j.lu.a.x).toFixed(1), instants: j.instantsOk};
      };
      const sans = await mesure(16), avec = await mesure(1000);
      verifier('glissé vif (60 px à 1,5 px/ms) après 1 s sans événement : la croix avance d’au moins 45 px, comme sans pause (à 9 px près)',
        avec.avance >= 45 && Math.abs(avec.avance - sans.avance) <= 9 && avec.instants && sans.instants, {sansPause: sans, apresPause: avec});
      await fermer(o);
    }

    // ---- 8.3 Bords et coins : atteints sans relever le doigt
    if (bloc(3))
    for (const cfg of [CONFIGS[0], CONFIGS[1]]) {
      const o = await ouvrir(srv.base, cfg);
      const g = await geom(o);
      // Limite du doigt sur chaque axe : le bord de l'écran si l'image le touche (à 8 px près),
      // sinon 4 px au-delà du bord de l'image
      const lim = {
        g: g.vp.l > -8 ? g.vp.l + 0.5 : -4, d: g.vp.r < g.w + 8 ? g.vp.r - 0.5 : g.w + 4,
        h: g.vp.t > -8 ? g.vp.t + 0.5 : -4, b: g.vp.b < g.h + 8 ? g.vp.b - 0.5 : g.h + 4
      };
      const cas = [];
      for (const d of [10, 20]) {
        cas.push({nom: `gauche ${d}`, x: d, y: g.h / 2, vx: -1, vy: 0}, {nom: `droite ${d}`, x: g.w - d, y: g.h / 2, vx: 1, vy: 0},
          {nom: `haut ${d}`, x: g.w / 2, y: d, vx: 0, vy: -1}, {nom: `bas ${d}`, x: g.w / 2, y: g.h - d, vx: 0, vy: 1});
      }
      cas.push({nom: 'coin haut-gauche', x: 15, y: 15, vx: -1, vy: -1}, {nom: 'coin haut-droite', x: g.w - 15, y: 15, vx: 1, vy: -1},
        {nom: 'coin bas-gauche', x: 15, y: g.h - 15, vx: -1, vy: 1}, {nom: 'coin bas-droite', x: g.w - 15, y: g.h - 15, vx: 1, vy: 1});
      const fautes = [];
      for (const k of cas) {
        const e = [{t: 0, type: 'start', x: k.x, y: k.y}];
        let t = 0, x = k.x, y = k.y;
        const fx = k.vx < 0 ? lim.g : lim.d, fy = k.vy < 0 ? lim.h : lim.b;
        // Glisse doucement (0,2 px/ms) jusqu'à la limite du doigt, attend, lève
        while ((k.vx && Math.abs(x - fx) > 1e-6) || (k.vy && Math.abs(y - fy) > 1e-6)) {
          t += 16;
          if (k.vx) x = k.vx < 0 ? Math.max(fx, x - 3.2) : Math.min(fx, x + 3.2);
          if (k.vy) y = k.vy < 0 ? Math.max(fy, y - 3.2) : Math.min(fy, y + 3.2);
          e.push({t, type: 'move', x, y});
        }
        e.push(...immobile(t + 16, 200, 16, x, y));
        e[e.length - 1].lire = 'bord';
        e.push({t: dernierT(e) + 16, type: 'end', x, y});
        const j = await jouer(o, e);
        await pause(80);
        const pt = await evApp(o, `window.__pt`);
        await evApp(o, `window.__pt=null`);
        const ax = k.vx ? (k.vx < 0 ? 0 : g.vw) : null, ay = k.vy ? (k.vy < 0 ? 0 : g.vh) : null;
        const ok = pt && j.lu.bord && (ax === null || (Math.abs(pt.x - ax) <= 0.5 && Math.abs(j.lu.bord.x / g.kc - ax) <= 0.5)) &&
          (ay === null || (Math.abs(pt.y - ay) <= 0.5 && Math.abs(j.lu.bord.y / g.kcy - ay) <= 0.5));
        if (!ok) fautes.push({cas: k.nom, croix: enVideo(g, j.lu.bord), point: pt, visé: [ax, ay]});
        await attendrePret(o);
      }
      // Près d'un bord, un aller-retour du doigt (sans atteindre le bord) ramène la croix à sa place
      for (const [nom, x, y, dx, dy] of [['bas', g.w / 2, g.h - 28, 0, 1], ['gauche', 28, g.h / 2, -1, 0]]) {
        const e = [{t: 0, type: 'start', x, y}, ...immobile(16, 100, 16, x, y)];
        e[e.length - 1].lire = 'depart';
        let t = dernierT(e);
        for (let i = 1; i <= 12; i++) { t += 16; e.push({t, type: 'move', x: x + dx * i, y: y + dy * i}); }
        for (let i = 11; i >= 0; i--) { t += 16; e.push({t, type: 'move', x: x + dx * i, y: y + dy * i}); }
        e.push(...immobile(t + 16, 100, 16, x, y));
        e[e.length - 1].lire = 'retour';
        e.push(...horsImage(dernierT(e) + 16, x, y));
        const j = await jouer(o, e);
        const d = Math.hypot(j.lu.retour.x / g.kc - j.lu.depart.x / g.kc, j.lu.retour.y / g.kcy - j.lu.depart.y / g.kcy);
        if (!(d <= 0.05)) fautes.push({cas: `aller-retour de 12 px vers le bord ${nom}, à 28 px de ce bord`, decalage: +d.toFixed(3)});
        await attendrePret(o);
      }
      verifier(`${cfg.nom} : bords (doigt posé à 10 et 20 px) et coins (15 px) : en glissant doucement jusqu’au bord de l’écran (ou 4 px hors de l’image), la croix et le point arrivent sur le pixel du bord (≤ 0,5 px vidéo), sans annulation ; à 28 px d’un bord, un aller-retour de 12 px ramène la croix à sa place`,
        fautes.length === 0, {fautes: fautes.slice(0, 4), limites: lim});
      await fermer(o);
    }

    // ---- 8.4 Élève qui regarde la loupe avec 100 ms de retard : converge, sans dépasser
    if (bloc(4))
    {
      const sim = await simulation(srv.base, CONFIGS[0], {essais: 12, decalages: [6, 20, 40], germe: 99, eleve: {vmax: 0.4, tau: 250}});
      const res = sim.res;
      const parDecalage = [6, 20, 40].map(d => ({decalage: d, corrections: stats(res.filter(r => r.decalage === d).map(r => r.corrections)),
        erreur: stats(res.filter(r => r.decalage === d).map(r => r.erreur)), duree: stats(res.filter(r => r.decalage === d).map(r => r.duree))}));
      console.log('     ' + JSON.stringify(parDecalage));
      const nonAbouties = res.filter(r => r.fin !== 'ok' || !r.pt);
      const err = stats(res.map(r => r.erreur)), corr = stats(res.map(r => r.corrections));
      // Une « correction » = l'élève repart en arrière après avoir dépassé la cible
      verifier(`élève simulé (retard 100 ms, glisse à vitesse naturelle, 0,4 px/ms au plus, pose à 6, 20 et 40 px ; ${res.length} essais) : aucune divergence, erreur ≤ 1 px vidéo, presque jamais de dépassement (au plus 2 corrections, 0,3 en moyenne)`,
        nonAbouties.length === 0 && err.max <= 1 && corr.max <= 2 && corr.moyenne <= 0.3, {nonAbouties: nonAbouties.map(r => r.fin), erreur: err, corrections: corr, duree: stats(res.map(r => r.duree))});
    }

    // ---- 8.5 Pouce qui tient la tablette, posé sur le bord de l'image (portrait)
    if (bloc(5))
    {
      const o = await ouvrir(srv.base, CONFIGS[1]);
      const g = await geom(o);
      const pouce = {x: 3 * g.kc, y: 0.6 * g.h}, doigt = {x: 0.5 * g.w, y: 0.4 * g.h};
      // Pouce d'abord (immobile), puis le doigt pointe ; le pouce se lève après
      const e = [{t: 0, type: 'start', id: 9, x: pouce.x, y: pouce.y}];
      for (let t = 50; t < 400; t += 50) e.push({t, type: 'move', id: 9, x: pouce.x + (t % 100 ? 0.3 : 0), y: pouce.y});
      e.push({t: 400, type: 'start', id: 1, x: doigt.x, y: doigt.y});
      for (let i = 1; i <= 10; i++) e.push({t: 400 + 16 * i, type: 'move', id: 1, x: doigt.x + i, y: doigt.y});
      e.push(...immobile(576, 250, 16, doigt.x + 10, doigt.y).map(s => ({...s, id: 1})));
      e[e.length - 1].lire = 'croix';
      e.push({t: dernierT(e) + 16, type: 'end', id: 1, x: doigt.x + 10, y: doigt.y});
      e.push({t: dernierT(e) + 300, type: 'end', id: 9, x: pouce.x, y: pouce.y});
      const n0 = await evApp(o, `data.getTotalPointCount()`);
      await evApp(o, `window.__pt=null;window.__loupes=[];(function f(){if(dessinerLoupe.derniere)window.__loupes.push({ax:dessinerLoupe.derniere.ax,t:performance.now()});if(window.__loupes.length<400)requestAnimationFrame(f);})()`);
      const j = await jouer(o, e);
      await pause(200);
      const r1 = await evApp(o, `({pt:window.__pt,n:data.getTotalPointCount(),ancre:window.__loupes.length?window.__loupes[window.__loupes.length-1].ax:null})`);
      const ok1 = r1.pt && j.lu.croix && Math.hypot(r1.pt.x - j.lu.croix.x / g.kc, r1.pt.y - j.lu.croix.y / g.kcy) <= 0.1 && r1.n === n0 + 1 &&
        Math.abs(j.lu.croix.x - doigt.x) < 15;
      await attendrePret(o);
      // Doigt d'abord, puis le pouce se pose sur le bord pendant le geste
      const e2 = [{t: 0, type: 'start', id: 1, x: doigt.x, y: doigt.y + 30}, ...immobile(16, 200, 16, doigt.x, doigt.y + 30).map(s => ({...s, id: 1}))];
      e2.push({t: 230, type: 'start', id: 9, x: pouce.x, y: pouce.y});
      e2.push(...immobile(246, 200, 16, doigt.x, doigt.y + 30).map(s => ({...s, id: 1})));
      e2[e2.length - 1].lire = 'croix';
      e2.push({t: dernierT(e2) + 16, type: 'end', id: 1, x: doigt.x, y: doigt.y + 30}, {t: dernierT(e2) + 300, type: 'end', id: 9, x: pouce.x, y: pouce.y});
      await evApp(o, `window.__pt=null`);
      const j2 = await jouer(o, e2);
      await pause(200);
      const r2 = await evApp(o, `({pt:window.__pt,n:data.getTotalPointCount()})`);
      const ok2 = r2.pt && j2.lu.croix && Math.hypot(r2.pt.x - j2.lu.croix.x / g.kc, r2.pt.y - j2.lu.croix.y / g.kcy) <= 0.1 && r2.n === n0 + 2;
      verifier('portrait : pouce immobile posé sur le bord de l’image (3 px vidéo) puis doigt qui pointe : le doigt pointe (loupe et point au doigt, à 0,1 px vidéo près : position voisine affichée pendant l’immobilité), le pouce qui se lève n’ajoute rien ; pouce posé pendant le geste : ignoré',
        ok1 && ok2 && j.instantsOk && j2.instantsOk, {r1, croix: enVideo(g, j.lu.croix), r2, croix2: enVideo(g, j2.lu.croix)});
      await fermer(o);
    }

    // ---- 8.6 Second bout d'étalonnage tout près du premier (toucher net à 20 et 28 px)
    if (bloc(6))
    {
      const o = await ouvrir(srv.base, CONFIGS[0]);
      await evApp(o, `passerAuMode('Calibration')`); await pause(400);
      const g = await geom(o);
      const res = [];
      for (const d of [20, 28]) {
        await evApp(o, `document.getElementById('reset-calibration').click()`); await pause(200);
        const p1 = {x: 0.4 * g.w, y: 0.5 * g.h};
        await jouer(o, [{t: 0, type: 'start', x: p1.x, y: p1.y}, {t: 80, type: 'end', x: p1.x, y: p1.y}]);
        await pause(150);
        await jouer(o, [{t: 0, type: 'start', x: p1.x + d, y: p1.y}, {t: 90, type: 'end', x: p1.x + d, y: p1.y}]);
        await pause(150);
        const r = await evApp(o, `({etat:calibrator.state,p1:calibrator.point1&&{...calibrator.point1},p2:calibrator.point2&&{...calibrator.point2}})`);
        res.push({d, ok: r.etat === 'waiting_distance' && r.p2 && Math.abs(r.p2.x - (p1.x + d) / g.kc) < 0.05 && Math.abs(r.p1.x - p1.x / g.kc) < 0.05, ...r});
      }
      // Les deux bouts placés : un glisser qui part à 20 px d'un bout le déplace
      await evApp(o, `document.getElementById('reset-calibration').click()`); await pause(200);
      const p1 = {x: 0.4 * g.w, y: 0.5 * g.h};
      await jouer(o, [{t: 0, type: 'start', x: p1.x, y: p1.y}, {t: 80, type: 'end', x: p1.x, y: p1.y}]);
      await pause(150);
      await jouer(o, [{t: 0, type: 'start', x: p1.x + 150, y: p1.y}, {t: 80, type: 'end', x: p1.x + 150, y: p1.y}]);
      await pause(150);
      const e = [{t: 0, type: 'start', x: p1.x + 20, y: p1.y}];
      for (let i = 1; i <= 30; i++) e.push({t: 16 * i, type: 'move', x: p1.x + 20, y: p1.y - i});
      e.push(...immobile(500, 200, 16, p1.x + 20, p1.y - 30));
      e.push({t: dernierT(e) + 16, type: 'end', x: p1.x + 20, y: p1.y - 30});
      await jouer(o, e);
      await pause(150);
      const glisse = await evApp(o, `({etat:calibrator.state,p1:{...calibrator.point1}})`);
      const okGlisse = glisse.etat === 'waiting_distance' && glisse.p1.y < p1.y / g.kcy - 2;
      verifier('étalonnage : pendant qu’on place le second bout, un toucher à 20 ou 28 px du premier crée le second bout (là où on touche) ; les deux bouts placés, un glisser parti à 20 px d’un bout le déplace',
        res.every(r => r.ok) && okGlisse, {res, glisse});
      await fermer(o);
    }

    // ---- 8.7 La loupe ne saute pas d'un côté à l'autre quand le doigt traverse le milieu (tiers haut)
    if (bloc(7))
    for (const cfg of [CONFIGS[0], CONFIGS[1]]) {
      const o = await ouvrir(srv.base, cfg);
      const g = await geom(o);
      const y = 0.2 * g.h;
      const e = [{t: 0, type: 'start', x: 0.3 * g.w, y}];
      let t = 0;
      for (let x = 0.3 * g.w + 2; x <= 0.7 * g.w; x += 2) { t += 16; e.push({t, type: 'move', x, y}); }
      e.push(...horsImage(t + 16, 0.7 * g.w, y));
      await evApp(o, `window.__loupes=[];window.__suivre=true;(function f(){const d=dessinerLoupe.derniere;if(d&&pointeurTactile.actif)window.__loupes.push([d.cx,d.cy]);if(window.__suivre)requestAnimationFrame(f);})()`);
      await jouer(o, e);
      const sauts = await evApp(o, `(()=>{window.__suivre=false;const l=window.__loupes;let m=0;for(let i=1;i<l.length;i++)m=Math.max(m,Math.hypot(l[i][0]-l[i-1][0],l[i][1]-l[i-1][1]));return {images:l.length,sautMax:Math.round(m)};})()`);
      verifier(`${cfg.nom} : doigt qui traverse l’image de 30 % à 70 % de sa largeur dans le tiers haut : la loupe ne saute pas (≤ 40 px d’une image à l’autre)`,
        sauts.images > 20 && sauts.sautMax <= 40, sauts);
      await attendrePret(o);
      await fermer(o);
    }

    // ---- 8.8 À la souris, en étalonnage, la loupe montre les bouts
    if (bloc(8))
    {
      const o = await ouvrir(srv.base, {w: 1280, h: 800, dpr: 1, tactile: false});
      await evApp(o, `passerAuMode('Calibration');calibrator.addPoint(200,150);calibrator.addPoint(200,250);`); await pause(300);
      const g = await geom(o);
      const m = ecran(g, 206, 150);
      await o.c.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: m.x, y: m.y, button: 'none'}, o.s); await pause(300);
      const r = await evApp(o, `(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const d=dessinerLoupe.derniere;if(!d)return null;
        const s=dimensionsSource(),e=d.Z*width/s.w,v=versVideo(d.x,d.y),pd=pixelDensity();
        const bx=d.cx+(200-v.x)*e,by=d.cy+(150-v.y)*e;
        const px=[[10,0],[-10,0],[0,10],[0,-10]].map(([dx,dy])=>{const q=drawingContext.getImageData(Math.round((bx+dx)*pd)-1,Math.round((by+dy)*pd)-1,3,3).data;let m=[0,0,0];for(let i=0;i<q.length;i+=4)if(q[i+1]-q[i]>m[1]-m[0])m=[q[i],q[i+1],q[i+2]];return m;});
        return {loupe:true,anneau:px};})()`);
      const vert = r && r.anneau.filter(p => p[1] > 150 && p[0] < 100).length;
      verifier('souris, étalonnage : le bout voisin du viseur apparaît dans la loupe (anneau vert)', r && vert >= 3, r);
      await fermer(o);
    }

    // ---- 8.9 Scénarios de la deuxième relecture : le point est la croix affichée (ou aucun point)
    if (bloc(9))
    {
      const o = await ouvrir(srv.base, CONFIGS[0]);
      const g = await geom(o);
      const X = 0.4 * g.w, Y = 0.5 * g.h;
      const glisse = (t0, x0, y0, dx, dy, v, pas) => {
        const e = [], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (v * pas)));
        for (let i = 1; i <= n; i++) e.push({t: t0 + i * pas, type: 'move', x: x0 + dx * i / n, y: y0 + dy * i / n});
        return e;
      };
      const fautes = [], res = [];
      // Le point doit être la croix affichée au lever (≤ 0,05 px vidéo), ou aucun point (avec message)
      const cas = async (groupe, nom, etapes, {aucun = false, message = null, zero = false, avant = null} = {}) => {
        if (avant) await avant();
        const j = await jouer(o, etapes, {zero});
        await pause(120);
        const pts = j.pts;
        let ok, detail;
        if (aucun) {
          ok = pts.length === 0 && (!message || j.msgs.some(m => message.test(m)));
          detail = {points: pts.length, msgs: j.msgs};
        } else {
          const pt = pts[pts.length - 1], v = enVideo(g, j.lu.lever);
          const ecart = pt && v ? Math.hypot(pt.x - v.x, pt.y - v.y) : null;
          ok = pts.length === 1 && ecart !== null && ecart <= 0.05;
          detail = {points: pts.length, ecart: ecart === null ? null : +ecart.toFixed(3), croix: v, point: pt};
        }
        res.push({groupe, nom, ok});
        if (!ok) fautes.push({groupe, nom, ...detail});
        await attendrePret(o);
        await evApp(o, `annulerToucher()`);
      };
      // 1. Bord : glissé lent jusqu'à x=14, pause 150 ms, poussée à x=4 (croix au bord), lever 40 / 150 ms après
      for (const lev of [40, 150]) {
        const e = [{t: 0, type: 'start', x: X, y: Y}, ...glisse(0, X, Y, -(X - 14), 0, 0.3, 16)];
        e.push(...immobile(dernierT(e) + 16, 150, 16, 14, Y), ...glisse(dernierT(e) + 166, 14, Y, -10, 0, 0.2, 16));
        e.push({t: dernierT(e) + lev, type: 'end', x: 4, y: Y});
        await cas(1, `bord gauche après pause, lever ${lev} ms après`, e);
      }
      { const e = [{t: 0, type: 'start', x: X, y: 0.6 * g.h}, ...glisse(0, X, 0.6 * g.h, 0, -(0.6 * g.h - 14), 0.3, 16)];
        e.push(...immobile(dernierT(e) + 16, 150, 16, X, 14), ...glisse(dernierT(e) + 166, X, 14, 0, -10, 0.2, 16));
        e.push({t: dernierT(e) + 60, type: 'end', x: X, y: 4});
        await cas(1, 'bord haut après pause, lever 60 ms après', e); }
      { const e = [{t: 0, type: 'start', x: 20, y: Y}, ...glisse(0, 20, Y, -15, 0, 0.25, 16)];
        e.push({t: dernierT(e) + 40, type: 'end', x: 5, y: Y});
        await cas(1, 'toucher à x=20, glissé jusqu’à x=5, lever 40 ms après', e); }
      // 2. Correction lente de 9 px, arrêt sans événement de 80 / 150 / 250 ms, lever
      for (const arret of [80, 150, 250]) {
        const e = [{t: 0, type: 'start', x: X, y: Y}, ...glisse(0, X, Y, 9, 0, 0.12, 16)];
        e.push({t: dernierT(e) + arret, type: 'end', x: X + 9, y: Y});
        await cas(2, `correction de 9 px, arrêt ${arret} ms sans événement, lever`, e);
      }
      // 3. 10 événements par seconde : glissé lent par pas de 10 / 15 px, arrêt 200 ms ou lever en mouvement ; instants à 0
      for (const pas of [10, 15]) {
        const e = [{t: 0, type: 'start', x: X, y: Y}, ...glisse(0, X, Y, 6 * pas, 0, pas / 100, 100)];
        await cas(3, `10 év./s, pas de ${pas} px, arrêt 200 ms, lever`, [...e, {t: dernierT(e) + 200, type: 'end', x: X + 6 * pas, y: Y}]);
        await cas(3, `10 év./s, pas de ${pas} px, lever 30 ms après le dernier mouvement`, [...e, {t: dernierT(e) + 30, type: 'end', x: X + 6 * pas, y: Y}]);
        await cas(3, `10 év./s, pas de ${pas} px, lever 50 ms après, instants à 0`, [...e, {t: dernierT(e) + 50, type: 'end', x: X + 6 * pas, y: Y}], {zero: true});
      }
      // 5. Immobile 400 ms puis glissé lent continu (0,05 px/ms) pendant 280 ms, lever en mouvement
      { const e = [{t: 0, type: 'start', x: X, y: Y}, ...immobile(16, 400, 16, X, Y)];
        e.push(...glisse(dernierT(e), X, Y, 14, 0, 0.05, 16));
        e.push({t: dernierT(e) + 8, type: 'end', x: X + 14, y: Y});
        await cas(5, 'immobile 400 ms puis glissé continu à 0,05 px/ms pendant 280 ms, lever en mouvement', e); }
      // 4. Index près du bord gauche (x=30), ajusté de 6 px ; pouce au bord droit ; index puis pouce levés : aucun point, message
      { const e = [{t: 0, type: 'start', id: 1, x: 30, y: Y}, ...glisse(0, 30, Y, 6, 0, 0.05, 16).map(q => ({...q, id: 1}))];
        const t1 = dernierT(e);
        e.push({t: t1 + 30, type: 'start', id: 2, x: g.w - 10, y: Y + 100});
        e.push({t: t1 + 200, type: 'end', id: 1, x: 36, y: Y}, {t: t1 + 900, type: 'end', id: 2, x: g.w - 10, y: Y + 100});
        await cas(4, 'index près du bord gauche, pouce posé au bord droit, index puis pouce levés', e, {aucun: true, message: /Deux doigts/}); }
      // 6. Deux doigts dans le même touchstart (loin des bords) : aucun point, message
      { const e = [{t: 0, type: 'start', ch: [{id: 1, x: X, y: Y}, {id: 2, x: X + 150, y: Y}]}];
        for (let i = 1; i <= 10; i++) e.push({t: 16 * i, type: 'move', ch: [{id: 1, x: X - 4 * i, y: Y}, {id: 2, x: X + 150 + 4 * i, y: Y}]});
        e.push({t: 200, type: 'end', ch: [{id: 1, x: X - 40, y: Y}]}, {t: 210, type: 'end', ch: [{id: 2, x: X + 190, y: Y}]});
        await cas(6, 'deux doigts posés dans le même événement, écartés, levés', e, {aucun: true, message: /Deux doigts/}); }
      // Étalonnage : bout glissé jusqu'au bord (croix au bord), lever 60 ms après : bout posé sur la croix affichée
      { await evApp(o, `passerAuMode('Calibration')`); await pause(300);
        await evApp(o, `document.getElementById('reset-calibration').click()`); await pause(200);
        const e = [{t: 0, type: 'start', x: X, y: Y}, {t: 80, type: 'end', x: X, y: Y}];
        await jouer(o, e); await pause(150);
        await jouer(o, [{t: 0, type: 'start', x: X + 150, y: Y}, {t: 80, type: 'end', x: X + 150, y: Y}]); await pause(150);
        const d = [{t: 0, type: 'start', x: X + 150, y: Y}, ...glisse(0, X + 150, Y, -(X + 150 - 14), 0, 0.3, 16)];
        d.push(...immobile(dernierT(d) + 16, 150, 16, 14, Y), ...glisse(dernierT(d) + 166, 14, Y, -10, 0, 0.2, 16));
        d.push({t: dernierT(d) + 60, type: 'end', x: 4, y: Y});
        const j = await jouer(o, d); await pause(150);
        const p2 = await evApp(o, `({...calibrator.point2})`), v = enVideo(g, j.lu.lever);
        const ecart = Math.hypot(p2.x - v.x, p2.y - v.y);
        res.push({groupe: 1, nom: 'étalonnage : bout amené au bord', ok: ecart <= 0.05});
        if (!(ecart <= 0.05)) fautes.push({groupe: 1, nom: 'étalonnage : bout amené au bord', bout: p2, croix: v}); }
      const titres = {
        1: 'au bord (gauche ou haut, après une pause ou non ; bout d’étalonnage) : le point est la croix affichée, sur le bord',
        2: 'correction suivie d’un arrêt sans événement (80, 150, 250 ms) : le point est la croix affichée',
        3: '10 év./s (arrêt, lever en mouvement, instants à 0) : le point est la croix affichée',
        5: 'glissé lent continu (280 ms) après une immobilité, lever en mouvement : le point est la croix affichée',
        4: 'index près d’un bord puis pouce sur le bord opposé : aucun point, message « Deux doigts »',
        6: 'deux doigts posés dans le même événement : aucun point, message « Deux doigts »'
      };
      for (const gr of [1, 2, 3, 5, 4, 6]) {
        const r = res.filter(x => x.groupe === gr), f = fautes.filter(x => x.groupe === gr);
        verifier(`deuxième relecture, défaut ${gr} (${r.length} cas) : ${titres[gr]}${gr <= 5 && gr !== 4 ? ' (≤ 0,05 px vidéo)' : ''}`, r.length > 0 && f.length === 0, f.length ? f.slice(0, 3) : r.map(x => x.nom));
      }
      await fermer(o);
    }
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
