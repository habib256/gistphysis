// tests/verifier.mjs — vérification de « Soleil, Terre, Lune » dans de vrais navigateurs sans écran.
//
//   node tests/verifier.mjs [--firefox | --firefox-seul] [--captures DOSSIER]
//
// Chrome (protocole DevTools, aucune dépendance npm ; essayé avec Node 20.18) :
//   - les 4 parties s'ouvrent par le lien (#jour-nuit, #saisons, #phases, #eclipses), sans erreur
//     ni avertissement dans la console, sans aucune requête hors du dossier de l'app ;
//   - à 360×640 (tactile, densité 2), 1024×768 (tactile), 1920×1080 et 640×360 (tactile) :
//     le dessin remplit exactement la zone prévue (pixels CSS × densité), pas de défilement de
//     la page, commandes d'au moins 44 px ;
//   - valeurs numériques (durées du jour, hauteurs du Soleil à midi, distance Terre-Soleil,
//     fraction éclairée à 0°, 90°, 180°, 270°) et valeurs affichées dans le panneau ;
//   - « axe non incliné » : 12 h 00 de jour partout, toute l'année ;
//   - glisser la Lune au doigt change la phase (aussi à densité 2) ; glisser la Terre change
//     l'heure ; flèches et barre d'espace ;
//   - orientation : premier quartier éclairé à gauche vu de La Réunion, à droite vu de métropole ;
//     Terre éclairée du côté du Soleil ; ville de l'autre hémisphère « par transparence » ;
//   - éclipses : nouvelle et pleine Lune suivantes, compteurs, rareté sur une année, hypothèse
//     « orbite non inclinée », Lune rouge sombre pendant une éclipse totale, arrêt de la lecture ;
//   - animation suspendue quand le cadre sort de l'écran (tests/cadre.html).
// Firefox (WebDriver BiDi, avec --firefox) : chargement des 4 parties sans erreur, dimensions,
// valeurs numériques, glisser la Lune, éclipses, animation. Il faut Node 22 ou plus, ou
// « node --experimental-websocket tests/verifier.mjs --firefox » avec Node 20-21.
// Variables : CHROME_PATH, FIREFOX_PATH. Lancer ce test seul (pas plusieurs Chrome en même temps).
// Le script n'est pas nécessaire au fonctionnement de l'app.

import path from 'node:path';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {servir, lancerChrome, lancerFirefox, ouvrirOnglet, ev, capture, clic, glisserDoigt, touche, fermer, pause} from './cdp.mjs';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ARGS = process.argv.slice(2);
const NAVIGATEURS = ARGS.includes('--firefox-seul') ? ['firefox'] : ARGS.includes('--firefox') ? ['chrome', 'firefox'] : ['chrome'];
const iCap = ARGS.indexOf('--captures');
const CAPTURES = iCap >= 0 ? path.resolve(ARGS[iCap + 1]) : null;
if (CAPTURES) mkdirSync(CAPTURES, {recursive: true});
const PARTIES = ['jour-nuit', 'saisons', 'phases', 'eclipses'];

const echecs = [];
let nbOk = 0;
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  if (ok) nbOk++; else echecs.push(nom);
}
const minutes = t => { const m = /^(\d+) h (\d\d)$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : NaN; };

// Outils installés dans la page (mêmes pour Chrome et Firefox)
const OUTILS = `(()=>{
  window.__image = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))));
  window.__px = (x, y) => { const c = document.getElementById('toile'), d = STL.app.dpr;
    const p = c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data; return [p[0], p[1], p[2]]; };
  window.__lum = p => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  window.__txt = id => document.getElementById(id).textContent;
  window.__tap = sel => { const e = document.querySelector(sel); e.click(); return true; };
  window.__etat = () => { const c = document.getElementById('toile'), s = document.getElementById('scene').getBoundingClientRect();
    return {partie: STL.app.partie, dpr: STL.app.dpr, cw: c.width, ch: c.height, cssW: c.getBoundingClientRect().width, cssH: c.getBoundingClientRect().height,
      sw: s.width, sh: s.height, sx: s.left, sy: s.top, iw: innerWidth, ih: innerHeight,
      defH: document.documentElement.scrollWidth, defV: document.documentElement.scrollHeight,
      onglet: document.querySelector('[role=tab][aria-selected=true]')?.dataset.partie,
      section: [...document.querySelectorAll('.partie')].filter(s => !s.hidden).map(s => s.id),
      images: STL.app.images};
  };
  window.__petites = () => { const r = [];
    const sec = document.querySelector('.partie:not([hidden])');
    for (const e of [...document.querySelectorAll('#onglets button'), ...sec.querySelectorAll('button, select, input[type=range], label.case')]) {
      const b = e.getBoundingClientRect(); if (b.width && (b.height < 43.5 || b.width < 43.5)) r.push((e.id || e.textContent.trim().slice(0, 20)) + ' ' + Math.round(b.width) + '×' + Math.round(b.height)); }
    return r; };
  window.__origine = () => { const r = document.getElementById('toile').getBoundingClientRect(); return [r.left, r.top]; };
  window.__centre = sel => { const e = document.querySelector(sel); e.scrollIntoView({block: 'center'}); const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  window.__ressources = () => performance.getEntriesByType('resource').map(e => e.name);
  return true; })()`;

// ---------------------------------------------------------------- pilotes
// Chrome sans écran avec émulation du GPU (SwiftShader) bloquait son processus graphique vers la
// 10e page ouverte avec cette app (macOS, Chrome 157) : cdp.mjs le lance avec --disable-gpu, et on
// le relance par prudence toutes les 5 pages (chaque page est fermée avant d'ouvrir la suivante).
async function piloteChrome() {
  let c = lancerChrome(), ouvertes = 0;
  return {
    nom: 'Chrome',
    async ouvrir(url, w, h, opts = {}) {
      if (++ouvertes > 5) { c.quit(); await pause(300); c = lancerChrome(); ouvertes = 1; }
      const o = await ouvrirOnglet(c, url, w, h, opts);
      const page = {
        o, journal: o.journal,
        ev: async e => JSON.parse(await ev(o, `(async()=>JSON.stringify(await (${e})))()`)),
        glisser: async (x1, y1, x2, y2) => { const [ox, oy] = await page.ev('__origine()'); await glisserDoigt(o, x1 + ox, y1 + oy, x2 + ox, y2 + oy); },
        toucher: async (x, y) => { await glisserDoigt(o, x, y, x, y, 1); },
        clic: (x, y) => clic(o, x, y),
        touche: k => k === 'ArrowRight' ? touche(o, 'ArrowRight', 'ArrowRight', 39) : k === 'ArrowLeft' ? touche(o, 'ArrowLeft', 'ArrowLeft', 37) : touche(o, ' ', 'Space', 32),
        capture: f => capture(o, f),
        erreurs: () => [...o.journal.erreurs, ...o.journal.console],
        fermer: () => fermer(o)
      };
      await page.ev(OUTILS);
      await page.ev(`(async()=>{for(let i=0;i<100&&!(window.STL&&STL.app&&STL.app.images>0);i++)await new Promise(r=>setTimeout(r,50));return true;})()`);
      return page;
    },
    quit: async () => c.quit()
  };
}

async function piloteFirefox() {
  const ff = await lancerFirefox();
  return {
    nom: ff.nom,
    async ouvrir(url, w, h, opts = {}) {
      const {context} = await ff.send('browsingContext.create', {type: 'tab'});
      try { await ff.send('browsingContext.setViewport', {context, viewport: {width: w, height: h}, devicePixelRatio: opts.dpr || 1}); }
      catch (e) { await ff.send('browsingContext.setViewport', {context, viewport: {width: w, height: h}}); }
      await ff.send('browsingContext.navigate', {context, url, wait: 'complete'});
      const actions = async (liste) => ff.send('input.performActions', {context, actions: liste});
      const pointeur = async (type, pts) => {
        const a = [{type: 'pointerMove', x: Math.round(pts[0][0]), y: Math.round(pts[0][1])}, {type: 'pointerDown', button: 0}];
        for (const p of pts.slice(1)) a.push({type: 'pointerMove', x: Math.round(p[0]), y: Math.round(p[1]), duration: 16});
        a.push({type: 'pointerUp', button: 0});
        await actions([{type: 'pointer', id: 'p-' + type, parameters: {pointerType: type}, actions: a}]);
        await ff.send('input.releaseActions', {context});
      };
      const page = {
        ev: async e => {
          const r = await ff.send('script.evaluate', {expression: `(async()=>JSON.stringify(await (${e})))()`, target: {context}, awaitPromise: true, userActivation: true});
          if (r.type === 'exception') throw new Error(r.exceptionDetails.text);
          return JSON.parse(r.result.value);
        },
        typePointeur: 'touch',
        async glisser(x1, y1, x2, y2) {
          const [ox, oy] = await page.ev('__origine()');
          x1 += ox; y1 += oy; x2 += ox; y2 += oy;
          const pts = [];
          for (let i = 0; i <= 12; i++) pts.push([x1 + (x2 - x1) * i / 12, y1 + (y2 - y1) * i / 12]);
          try { await pointeur('touch', pts); } catch (e) { page.typePointeur = 'mouse'; await pointeur('mouse', pts); }
        },
        touche: k => actions([{type: 'key', id: 'clavier', actions: [{type: 'keyDown', value: k === 'ArrowRight' ? '' : k === 'ArrowLeft' ? '' : ' '}, {type: 'keyUp', value: k === 'ArrowRight' ? '' : k === 'ArrowLeft' ? '' : ' '}]}]),
        erreurs: () => ff.evenements.filter(e => e.method === 'log.entryAdded' && e.params.source?.context === context && (e.params.level === 'error' || e.params.level === 'warn'))
          .map(e => e.params.level + ': ' + e.params.text),
        fermer: () => ff.send('browsingContext.close', {context})
      };
      await page.ev(OUTILS);
      await page.ev(`(async()=>{for(let i=0;i<100&&!(window.STL&&STL.app&&STL.app.images>0);i++)await new Promise(r=>setTimeout(r,50));return true;})()`);
      return page;
    },
    quit: () => ff.quit()
  };
}

// ---------------------------------------------------------------- contrôles communs
async function controlerChargement(nav, srv, page, partie, w, h, dpr) {
  const e = await page.ev('__etat()');
  const etiquette = `${nav.nom} ${w}×${h}${dpr > 1 ? ' densité ' + dpr : ''} #${partie}`;
  verifier(`${etiquette} : la partie s'ouvre par le lien (onglet et panneau)`, e.partie === partie && e.onglet === partie && e.section.length === 1 && e.section[0] === 'p-' + partie, e);
  const okDim = Math.abs(e.cssW - e.sw) < 0.6 && Math.abs(e.cssH - e.sh) < 0.6 && e.cw === Math.round(e.sw * dpr) && e.ch === Math.round(e.sh * dpr) && e.dpr === dpr;
  verifier(`${etiquette} : dessin aux dimensions de sa zone (${Math.round(e.sw)}×${Math.round(e.sh)} px CSS, ${e.cw}×${e.ch} pixels)`, okDim, e);
  verifier(`${etiquette} : l'app remplit la fenêtre sans défilement`, e.defH <= e.iw && e.defV <= e.ih && e.sw > 100 && e.sh > 150, e);
  const res = await page.ev('__ressources()');
  verifier(`${etiquette} : aucune ressource hors du dossier de l'app`, res.every(u => u.startsWith(srv.base + '/')), res.filter(u => !u.startsWith(srv.base + '/')));
  const petites = await page.ev('__petites()');
  verifier(`${etiquette} : commandes d'au moins 44 px`, petites.length === 0, petites);
}

async function controlerValeurs(nav, page) {
  const r = await page.ev(`(()=>{const A=Astro,L=A.LIEUX,j=(m,d)=>A.jourDeDate(m,d);
    const m=(l,n,i)=>A.mesuresLieu(l,n,i);
    let pe=[1e12,0],ap=[0,0];for(let n=1;n<=365;n++){const k=A.soleil(n).km;if(k<pe[0])pe=[k,n];if(k>ap[0])ap=[k,n];}
    return {sdJ:A.dureeTexte(m(L.stdenis,j(5,21)).duree),sdD:A.dureeTexte(m(L.stdenis,j(11,21)).duree),
      paJ:A.dureeTexte(m(L.paris,j(5,21)).duree),paD:A.dureeTexte(m(L.paris,j(11,21)).duree),
      hsdJ:m(L.stdenis,j(5,21)).hauteur,hsdD:m(L.stdenis,j(11,21)).hauteur,hpaJ:m(L.paris,j(5,21)).hauteur,hpaD:m(L.paris,j(11,21)).hauteur,
      sdJs:m(L.stdenis,j(5,21)).saison,paJs:m(L.paris,j(5,21)).saison,
      pe:[pe[0]/1e6,A.texteDate(pe[1])],ap:[ap[0]/1e6,A.texteDate(ap[1])],
      zero:[1,60,172,250,355].every(n=>A.dureeTexte(m(L.stdenis,n,false).duree)==='12 h 00'&&A.dureeTexte(m(L.paris,n,false).duree)==='12 h 00'),
      f:[0,90,180,270].map(a=>+A.fractionEclairee(a).toFixed(6)),noms:[0,90,180,270].map(A.nomPhase),evo:[45,135,225,315].map(A.evolution)};})()`);
  const proche = (t, cible, tol = 5) => Math.abs(minutes(t) - cible) <= tol;
  verifier(`${nav.nom} : durée du jour à Saint-Denis le 21 juin ≈ 10 h 45 et le 21 décembre ≈ 13 h 15 (sans réfraction)`, proche(r.sdJ, 645) && proche(r.sdD, 795), [r.sdJ, r.sdD]);
  verifier(`${nav.nom} : durée du jour à Paris le 21 juin ≈ 16 h et le 21 décembre ≈ 8 h`, proche(r.paJ, 960) && proche(r.paD, 480), [r.paJ, r.paD]);
  verifier(`${nav.nom} : hauteur du Soleil à midi (Saint-Denis 45,7° / 87,5° ; Paris 64,5° / 17,7°)`,
    Math.abs(r.hsdJ - 45.7) < 0.15 && Math.abs(r.hsdD - 87.5) < 0.15 && Math.abs(r.hpaJ - 64.5) < 0.15 && Math.abs(r.hpaD - 17.7) < 0.15, [r.hsdJ, r.hsdD, r.hpaJ, r.hpaD]);
  verifier(`${nav.nom} : saisons inversées le 21 juin (Saint-Denis : ${r.sdJs}, Paris : ${r.paJs})`, r.sdJs === 'automne' && r.paJs === 'printemps' || r.sdJs === 'hiver' && r.paJs === 'été', [r.sdJs, r.paJs]);
  verifier(`${nav.nom} : distance Terre-Soleil la plus courte début janvier (≈ 147,1 millions de km), la plus longue début juillet (≈ 152,1)`,
    Math.abs(r.pe[0] - 147.1) < 0.1 && /janvier/.test(r.pe[1]) && Math.abs(r.ap[0] - 152.1) < 0.1 && /juillet/.test(r.ap[1]), [r.pe, r.ap]);
  verifier(`${nav.nom} : axe non incliné → 12 h 00 de jour partout, toute l'année`, r.zero);
  verifier(`${nav.nom} : fraction éclairée à 0°, 90°, 180°, 270° = 0 ; 0,5 ; 1 ; 0,5`, JSON.stringify(r.f) === '[0,0.5,1,0.5]', r.f);
  verifier(`${nav.nom} : noms des phases du cours`, JSON.stringify(r.noms) === JSON.stringify(['nouvelle Lune', 'premier quartier', 'pleine Lune', 'dernier quartier']) &&
    JSON.stringify(r.evo) === JSON.stringify(['croissante', 'croissante', 'décroissante', 'décroissante']), [r.noms, r.evo]);
}

// Glisser la Lune au doigt jusqu'au point opposé de son orbite
async function glisserLune(nav, page, etiquette) {
  const g = await page.ev(`(()=>{const g=STL.parties.phases.geo();return {mx:g.mx,my:g.my,cx:g.cx,cy:g.cy,a:STL.parties.phases.etat.alpha,nom:__txt('ph-nom'),f:__txt('ph-fraction')};})()`);
  const tx = 2 * g.cx - g.mx, ty = 2 * g.cy - g.my;
  // passer à côté de la Terre : arc par un point à 90°
  const px = g.cx - (g.my - g.cy), py = g.cy + (g.mx - g.cx);
  await page.glisser(g.mx, g.my, px, py);
  await page.glisser(px, py, tx, ty);
  await page.ev('__image()');
  const a = await page.ev(`({a:STL.parties.phases.etat.alpha,nom:__txt('ph-nom'),f:__txt('ph-fraction')})`);
  const d = Math.abs(((a.a - g.a + 720) % 360) - 180);   // écart à un demi-tour
  verifier(`${etiquette} : glisser la Lune au doigt change la phase (${g.nom} ${g.f} → ${a.nom} ${a.f})`, d < 8 && a.nom !== g.nom && a.f !== g.f, {avant: g, apres: a, ecart: d});
}

// ---------------------------------------------------------------- Chrome
async function scenarioChrome(nav, srv) {
  // 1. Chargement de chaque partie à chaque taille
  const TAILLES = [[360, 640, {tactile: true, dpr: 2}], [1024, 768, {tactile: true}], [1920, 1080, {}], [640, 360, {tactile: true}], [768, 1024, {tactile: true}]];
  for (const [w, h, opts] of TAILLES) {
    for (const p of PARTIES) {
      const page = await nav.ouvrir(srv.base + '/index.html#' + p, w, h, opts);
      await pause(150);
      await controlerChargement(nav, srv, page, p, w, h, opts.dpr || 1);
      if (CAPTURES) await page.capture(path.join(CAPTURES, `${p}-${w}x${h}.png`));
      const err = page.erreurs();
      verifier(`${nav.nom} ${w}×${h} #${p} : aucune erreur ni avertissement dans la console`, err.length === 0, err);
      await page.fermer();
    }
  }
  // Sans lien : première partie
  {
    const page = await nav.ouvrir(srv.base + '/index.html', 1024, 768);
    const e = await page.ev('__etat()');
    verifier(`${nav.nom} : sans lien, la partie « Jour et nuit » s'ouvre`, e.partie === 'jour-nuit');
    // changement de partie par l'onglet : le lien suit, sans nouvelle entrée d'historique
    const hist = await page.ev('history.length');
    await page.clic(...await page.ev(`(()=>{const b=document.getElementById('onglet-eclipses').getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2];})()`));
    const apres = await page.ev(`({h:location.hash,l:history.length,p:STL.app.partie})`);
    verifier(`${nav.nom} : l'onglet « Éclipses » met #eclipses dans le lien, sans entrée d'historique`, apres.h === '#eclipses' && apres.p === 'eclipses' && apres.l === hist, apres);
    await page.ev(`(location.hash='#saisons',true)`); await pause(200);
    verifier(`${nav.nom} : changer le lien en #saisons ouvre « Saisons »`, (await page.ev('STL.app.partie')) === 'saisons');
    await page.fermer();
  }

  // 2. Valeurs numériques
  {
    const page = await nav.ouvrir(srv.base + '/index.html#saisons', 1024, 768, {tactile: true});
    await controlerValeurs(nav, page);
    // 3. Saisons : panneau, raccourcis de date, hypothèse
    const tap = async sel => { const [x, y] = await page.ev(`__centre(${JSON.stringify(sel)})`); await page.toucher(x, y); await page.ev('__image()'); };
    await tap('#p-saisons [data-date="5,21"]');
    let t = await page.ev(`({d:__txt('sa-date-txt'),sd:__txt('sa-d-sd'),pa:__txt('sa-d-pa'),hsd:__txt('sa-h-sd'),hpa:__txt('sa-h-pa'),s:__txt('sa-s-sd')+'/'+__txt('sa-s-pa'),dist:__txt('sa-distance')})`);
    verifier(`${nav.nom} : « 21 juin » au doigt → panneau : ${t.sd} / ${t.pa}, ${t.hsd} / ${t.hpa}, ${t.dist}`, t.d === '21 juin' && t.sd === '10 h 44' && t.pa === '15 h 58' && t.hsd === '45,7° (vers le nord)' && t.hpa === '64,5° (vers le sud)' && /^152,0 millions de km$/.test(t.dist), t);
    await tap('#p-saisons [data-date="11,21"]');
    t = await page.ev(`({sd:__txt('sa-d-sd'),pa:__txt('sa-d-pa'),hsd:__txt('sa-h-sd'),s:__txt('sa-s-sd')+'/'+__txt('sa-s-pa')})`);
    verifier(`${nav.nom} : « 21 déc. » → ${t.sd} / ${t.pa}, saisons ${t.s}`, t.sd === '13 h 16' && t.pa === '8 h 02' && t.s === 'printemps/automne' && t.hsd === '87,5° (vers le sud)', t);
    await tap('#sa-hypothese');
    const zero = [];
    for (const d of ['2,21', '5,21', '8,23', '11,21']) {
      await tap(`#p-saisons [data-date="${d}"]`);
      zero.push(await page.ev(`[__txt('sa-d-sd'),__txt('sa-d-pa'),__txt('sa-h-sd'),__txt('sa-h-pa')]`));
    }
    verifier(`${nav.nom} : hypothèse « axe non incliné » cochée au doigt → 12 h 00 partout, hauteur constante`, zero.every(z => z[0] === '12 h 00' && z[1] === '12 h 00' && z[2] === '69,1° (vers le nord)' && z[3] === '41,1° (vers le sud)'), zero);
    await tap('#sa-hypothese');
    // glisser la Terre sur l'orbite (vers la position de septembre, en bas)
    const g = await page.ev(`(()=>{const g=STL.parties.saisons.geo();return g;})()`);
    await page.glisser(g.ex, g.ey, g.cx, g.cy + g.R * Math.sin(25 * Math.PI / 180));
    await page.ev('__image()');
    const dd = await page.ev(`__txt('sa-date-txt')`);
    verifier(`${nav.nom} : glisser la Terre au doigt sur son orbite change la date (21 déc. → ${dd})`, /septembre/.test(dd), dd);
    await page.touche('ArrowRight'); await page.ev('__image()');
    const d2 = await page.ev(`__txt('sa-date-txt')`);
    verifier(`${nav.nom} : flèche → avance d'un jour (${dd} → ${d2})`, d2 !== dd);
    await page.fermer();
  }

  // 4. Jour et nuit
  {
    const page = await nav.ouvrir(srv.base + '/index.html#jour-nuit', 1024, 768, {tactile: true});
    const g = await page.ev(`STL.parties['jour-nuit'].geo()`);
    const jour = await page.ev(`__lum(__px(${g.cx - g.r * 0.5},${g.cy + g.r * 0.08}))`), nuit = await page.ev(`__lum(__px(${g.cx + g.r * 0.5},${g.cy + g.r * 0.08}))`);
    verifier(`${nav.nom} : la moitié de la Terre tournée vers le Soleil (à gauche) est éclairée`, jour > nuit + 40, {jour, nuit});
    let e = await page.ev(`({sd:__txt('jn-e-sd'),pa:__txt('jn-e-pa'),hsd:__txt('jn-h-sd'),hpa:__txt('jn-h-pa'),v:STL.parties['jour-nuit'].ecranLieu('stdenis').visible,vp:STL.parties['jour-nuit'].ecranLieu('paris').visible})`);
    verifier(`${nav.nom} : midi à Saint-Denis, ${e.hpa} à Paris (3 h 32 d'écart d'heure solaire) ; vue du pôle Nord : Paris visible, Saint-Denis par transparence`, e.hsd === '12 h 00' && e.hpa === '8 h 28' && e.sd === 'jour' && !e.v && e.vp, e);
    // glisser la Terre au doigt dans le sens de rotation (sens inverse des aiguilles d'une montre)
    await page.glisser(g.cx + g.r * 0.7, g.cy, g.cx, g.cy - g.r * 0.7);
    await page.ev('__image()');
    e = await page.ev(`({h:STL.parties['jour-nuit'].etat.heure,txt:__txt('jn-heure-txt'),sd:__txt('jn-e-sd')})`);
    verifier(`${nav.nom} : un quart de tour au doigt, dans le sens inverse des aiguilles d'une montre, avance de 6 h (12 h 00 → ${e.txt})`, Math.abs(e.h - 18) < 0.3, e);
    await page.touche('ArrowRight'); await page.ev('__image()');
    const h2 = await page.ev(`STL.parties['jour-nuit'].etat.heure`);
    verifier(`${nav.nom} : flèche → avance de 15 min`, Math.abs(h2 - e.h - 0.25) < 1e-6, [e.h, h2]);
    await page.touche(' '); await pause(700);
    const lec = await page.ev(`({l:STL.app.lecture,h:STL.parties['jour-nuit'].etat.heure})`);
    await page.touche(' '); await pause(100);
    const lec2 = await page.ev(`({l:STL.app.lecture,h:STL.parties['jour-nuit'].etat.heure})`);
    verifier(`${nav.nom} : barre d'espace : lecture puis pause, la Terre tourne`, lec.l && !lec2.l && lec.h > h2 + 0.3, {h2, lec, lec2});
    await page.ev(`(document.querySelector('#p-jour-nuit [data-vue=sud]').click(),true)`); await page.ev('__image()');
    e = await page.ev(`({v:STL.parties['jour-nuit'].ecranLieu('stdenis').visible,vp:STL.parties['jour-nuit'].ecranLieu('paris').visible})`);
    verifier(`${nav.nom} : vue du pôle Sud : Saint-Denis visible, Paris par transparence`, e.v && !e.vp, e);
    // vue du sud : le même glisser (sens inverse des aiguilles) fait reculer l'heure
    const h3 = await page.ev(`STL.parties['jour-nuit'].etat.heure`);
    await page.glisser(g.cx + g.r * 0.7, g.cy, g.cx, g.cy - g.r * 0.7);
    const h4 = await page.ev(`STL.parties['jour-nuit'].etat.heure`);
    verifier(`${nav.nom} : vue du pôle Sud, la rotation apparaît dans le sens des aiguilles d'une montre`, Math.abs(((h4 - h3 + 36) % 24) - 12 + 6) < 0.3, [h3, h4]);
    await page.fermer();
  }

  // 5. Phases : glisser au doigt (densité 1 et 2), orientation selon l'hémisphère
  for (const [w, h, opts] of [[1024, 768, {tactile: true}], [360, 640, {tactile: true, dpr: 2}]]) {
    const page = await nav.ouvrir(srv.base + '/index.html#phases', w, h, opts);
    await glisserLune(nav, page, `${nav.nom} ${w}×${h}${opts.dpr ? ' densité ' + opts.dpr : ''}`);
    await page.fermer();
  }
  {
    const page = await nav.ouvrir(srv.base + '/index.html#phases', 1024, 768, {tactile: true});
    const cotes = async () => page.ev(`(async()=>{await __image();const v=STL.parties.phases.geoVue();return {g:__lum(__px(v.x-v.r*0.6,v.y)),d:__lum(__px(v.x+v.r*0.6,v.y)),c:__lum(__px(v.x,v.y))};})()`);
    const placer = a => page.ev(`(STL.parties.phases.etat.alpha=${a},STL.app.demanderDessin(),true)`);
    await placer(90);
    const sud = await cotes();
    await page.ev(`(document.querySelector('#p-phases [data-hemisphere=nord]').click(),true)`);
    const nord = await cotes();
    verifier(`${nav.nom} : premier quartier éclairé à gauche vu de La Réunion, à droite vu de métropole`, sud.g > sud.d + 80 && nord.d > nord.g + 80, {sud, nord});
    await placer(270);
    const nord270 = await cotes();
    verifier(`${nav.nom} : dernier quartier vu de métropole éclairé à gauche`, nord270.g > nord270.d + 80, nord270);
    await placer(180); const plein = await cotes();
    await placer(0); const nouv = await cotes();
    verifier(`${nav.nom} : pleine Lune entièrement éclairée, nouvelle Lune sombre`, plein.g > 150 && plein.d > 150 && plein.c > 150 && nouv.c < 40 && nouv.g < 40 && nouv.d < 40, {plein, nouv});
    const t = await page.ev(`(async()=>{await __image();return [__txt('ph-nom'),__txt('ph-fraction')];})()`);
    verifier(`${nav.nom} : panneau à la nouvelle Lune : ${t.join(', ')}`, t[0] === 'Nouvelle Lune' && t[1] === '0 %', t);
    await page.fermer();
  }

  // 6. Éclipses
  {
    const page = await nav.ouvrir(srv.base + '/index.html#eclipses', 1024, 768, {tactile: true});
    const tap = async sel => { const [x, y] = await page.ev(`__centre(${JSON.stringify(sel)})`); await page.toucher(x, y); await page.ev('__image()'); };
    const lire = () => page.ev(`({etat:__txt('ec-etat'),phase:__txt('ec-phase'),nl:+__txt('ec-nl'),es:+__txt('ec-es'),pl:+__txt('ec-pl'),el:+__txt('ec-el'),h:__txt('ec-hauteur')})`);
    await tap('#ec-nouvelle');
    let e = await lire();
    verifier(`${nav.nom} : « Nouvelle Lune suivante » → ${e.etat}`, /^Éclipse de Soleil/.test(e.etat) && e.phase === 'Nouvelle Lune' && e.nl === 1 && e.es === 1, e);
    const soleil = await page.ev(`(()=>{const g=STL.parties.eclipses.geoVues().soleil;return __lum(__px(g.x,g.y));})()`);
    verifier(`${nav.nom} : pendant l'éclipse de Soleil, la Lune cache le centre du Soleil`, soleil < 60, soleil);
    await tap('#ec-pleine');
    e = await lire();
    verifier(`${nav.nom} : « Pleine Lune suivante » → ${e.etat}`, e.etat === 'Éclipse de Lune partielle' && e.pl === 1 && e.el === 1, e);
    for (let k = 0; k < 11; k++) { await tap('#ec-nouvelle'); await tap('#ec-pleine'); }
    e = await lire();
    verifier(`${nav.nom} : sur 12 lunaisons, ${e.es} éclipses de Soleil pour ${e.nl} nouvelles Lunes, ${e.el} éclipses de Lune pour ${e.pl} pleines Lunes`, e.nl === 12 && e.pl === 12 && e.es >= 1 && e.es <= 3 && e.el >= 1 && e.el <= 3, e);
    const ex = await page.ev(`STL.parties.eclipses.etat.jours`);
    // départ à 27 jours après la nouvelle Lune : 2,53 jours puis 23 demi-lunaisons
    verifier(`${nav.nom} : durée écoulée relevée (${ex.toFixed(2)} jours) = 2,53 j + 23 demi-lunaisons`, Math.abs(ex - (29.530589 - 27 + 23 * 29.530589 / 2)) < 0.01, ex);
    await tap('#ec-zero');
    await tap('#ec-hypothese');
    for (let k = 0; k < 4; k++) { await tap('#ec-nouvelle'); await tap('#ec-pleine'); }
    e = await lire();
    verifier(`${nav.nom} : hypothèse « orbite non inclinée » → éclipse à chaque nouvelle et pleine Lune (${e.es}/${e.nl}, ${e.el}/${e.pl})`, e.nl === 4 && e.es === 4 && e.pl === 4 && e.el === 4 && e.etat === 'Éclipse de Lune totale' && e.h === 'dans le plan', e);
    const rouge = await page.ev(`(()=>{const g=STL.parties.eclipses.geoVues().lune;return __px(g.x,g.y);})()`);
    verifier(`${nav.nom} : pendant l'éclipse totale, la Lune vue depuis la Terre est rouge sombre`, rouge[0] > rouge[1] + 30 && rouge[0] > rouge[2] + 30 && __lumN(rouge) < 120, rouge);
    // la lecture s'arrête à l'éclipse suivante
    await tap('#p-eclipses .lecture');
    let arret = null;
    for (let i = 0; i < 80 && !arret; i++) { await pause(100); const s = await page.ev(`({l:STL.app.lecture,m:__txt('ec-arret')})`); if (!s.l) arret = s; }
    verifier(`${nav.nom} : la lecture s'arrête d'elle-même à une éclipse (« ${arret && arret.m} »)`, arret && /^Lecture arrêtée : éclipse de Soleil/.test(arret.m), arret);
    // glisser la Lune au doigt dans la vue de dessus
    const g = await page.ev(`STL.parties.eclipses.geo()`);
    const a0 = await page.ev(`STL.parties.eclipses.etat.alpha`);
    await page.glisser(g.mx, g.my, g.XE - (g.my - g.YE), g.YE + (g.mx - g.XE));
    const a1 = await page.ev(`STL.parties.eclipses.etat.alpha`);
    verifier(`${nav.nom} : glisser la Lune au doigt dans la vue de dessus la déplace`, Math.abs(a1 - a0) > 20, [a0, a1]);
    await page.fermer();
  }

  // 7. Animation suspendue hors de l'écran (dans un cadre, comme dans le site)
  {
    const page = await nav.ouvrir(srv.base + '/tests/cadre.html?w=900&h=600&partie=jour-nuit', 1000, 700);
    await page.ev(`(async()=>{for(let i=0;i<100;i++){const W=document.querySelector('iframe').contentWindow;if(W.STL&&W.STL.app&&W.STL.app.images>0)return true;await new Promise(r=>setTimeout(r,50));}return false;})()`);
    const W = `document.querySelector('iframe').contentWindow`;
    await page.ev(`(${W}.STL.app.mettreLecture(true),true)`); await pause(500);
    const h1 = await page.ev(`${W}.STL.parties['jour-nuit'].etat.heure`); await pause(400);
    const h2 = await page.ev(`${W}.STL.parties['jour-nuit'].etat.heure`);
    await page.ev(`(scrollTo(0, 3000),true)`); await pause(500);
    const h3 = await page.ev(`({h:${W}.STL.parties['jour-nuit'].etat.heure,v:${W}.STL.app.visibleCadre,i:${W}.STL.app.images})`); await pause(600);
    const h4 = await page.ev(`({h:${W}.STL.parties['jour-nuit'].etat.heure,i:${W}.STL.app.images})`);
    await page.ev(`(scrollTo(0, 0),true)`); await pause(600);
    const h5 = await page.ev(`({h:${W}.STL.parties['jour-nuit'].etat.heure,v:${W}.STL.app.visibleCadre,l:${W}.STL.app.lecture})`);
    verifier(`${nav.nom} : dans un cadre, l'animation tourne, s'arrête quand le cadre sort de l'écran et reprend à son retour`,
      h2 !== h1 && !h3.v && h4.h === h3.h && h4.i === h3.i && h5.v && h5.l && h5.h !== h4.h, {h1, h2, h3, h4, h5});
    await page.fermer();
  }
}

// ---------------------------------------------------------------- Firefox
async function scenarioFirefox(nav, srv) {
  for (const [w, h] of [[1024, 768], [360, 640]]) {
    for (const p of PARTIES) {
      const page = await nav.ouvrir(srv.base + '/index.html#' + p, w, h);
      await pause(200);
      await controlerChargement(nav, srv, page, p, w, h, 1);
      const err = page.erreurs();
      verifier(`${nav.nom} ${w}×${h} #${p} : aucune erreur ni avertissement dans la console`, err.length === 0, err);
      await page.fermer();
    }
  }
  const page = await nav.ouvrir(srv.base + '/index.html#phases', 1024, 768);
  await controlerValeurs(nav, page);
  await glisserLune(nav, page, `${nav.nom} 1024×768 (pointeur ${page.typePointeur})`);
  const sud = await page.ev(`(async()=>{STL.parties.phases.etat.alpha=90;STL.app.demanderDessin();await __image();const v=STL.parties.phases.geoVue();return {g:__lum(__px(v.x-v.r*0.6,v.y)),d:__lum(__px(v.x+v.r*0.6,v.y))};})()`);
  verifier(`${nav.nom} : premier quartier éclairé à gauche vu de La Réunion`, sud.g > sud.d + 80, sud);
  await page.ev(`(location.hash='#jour-nuit',true)`); await pause(200);
  await page.ev(`(STL.app.mettreLecture(true),true)`);
  const h1 = await page.ev(`STL.parties['jour-nuit'].etat.heure`); await pause(700);
  const h2 = await page.ev(`STL.parties['jour-nuit'].etat.heure`);
  await page.touche(' ');
  verifier(`${nav.nom} : l'animation tourne (Jour et nuit) et la barre d'espace l'arrête`, h2 > h1 + 0.5 && !(await page.ev('STL.app.lecture')), [h1, h2]);
  await page.ev(`(location.hash='#eclipses',true)`); await pause(200);
  await page.ev(`(document.getElementById('ec-nouvelle').click(),document.getElementById('ec-pleine').click(),true)`);
  const e = await page.ev(`(async()=>{await __image();return {es:+__txt('ec-es'),el:+__txt('ec-el'),etat:__txt('ec-etat')};})()`);
  verifier(`${nav.nom} : éclipses de Soleil puis de Lune aux deux premières syzygies`, e.es === 1 && e.el === 1 && e.etat === 'Éclipse de Lune partielle', e);
  const err = page.erreurs();
  verifier(`${nav.nom} : aucune erreur pendant les manipulations`, err.length === 0, err);
  await page.fermer();
}

// luminance côté Node (pour un pixel lu dans la page)
function __lumN(p) { return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; }
globalThis.__lumN = __lumN;

// ---------------------------------------------------------------- lancement
const srv = await servir(RACINE);
try {
  for (const quel of NAVIGATEURS) {
    let nav;
    try { nav = quel === 'firefox' ? await piloteFirefox() : await piloteChrome(); } catch (e) {
      verifier(quel + ' : lancement', false, e.message);
      continue;
    }
    console.log('— ' + nav.nom);
    try { await (quel === 'firefox' ? scenarioFirefox(nav, srv) : scenarioChrome(nav, srv)); } catch (e) {
      verifier(nav.nom + ' : déroulement du test', false, e.stack || e.message);
    } finally { await nav.quit(); }
  }
} finally { await srv.close(); }
console.log(`\n${nbOk} contrôles réussis, ${echecs.length} échec(s).`);
if (echecs.length) { console.log(echecs.map(e => ' - ' + e).join('\n')); process.exitCode = 1; }
