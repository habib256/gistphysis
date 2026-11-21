// tests/verifier-navigateurs.mjs — contrôles rejouables de l'app dans Chrome et dans Firefox
//
//   node --experimental-websocket tests/verifier-navigateurs.mjs [--chrome-seul | --firefox-seul] [--sortie DOSSIER]
//
// (Node 22 ou plus : « --experimental-websocket » est inutile. Sans Firefox, utiliser --chrome-seul.)
// À lancer seul, jamais en même temps qu'un autre test qui pilote un navigateur.
//
// Sert l'app avec un petit serveur local et la pilote sans écran : Chrome par le protocole
// DevTools, Firefox par WebDriver BiDi (aucune dépendance npm). Dans chaque navigateur :
//   1. les trois parties s'ouvrent par l'adresse (#bac-a-sable, #cycle, #fusion), sans erreur
//      ni message d'erreur dans la console, sans aucune requête hors du serveur local ;
//   2. mise en page à 360×640, 640×360, 768×1024, 1024×768, 1366×768, 1920×1080 : pas de
//      défilement de la page, scène assez grande, cibles d'au moins 44 px, aucun bouton coupé ni
//      texte qui déborde ; une capture par taille et par partie ;
//   3. vapeur invisible : une zone d'air humide (90 % de la saturation) et une zone d'air sec, à
//      la même température, donnent exactement les mêmes pixels ; avec « Montrer la vapeur »,
//      elles diffèrent ;
//   3 bis. cycle : contraste sol sec / sol saturé, pluie sur le ciel, rivière visible à l'écran ;
//   4. tactile émulé : choisir l'outil au doigt, verser de l'eau d'un trait, poser puis faire
//      glisser un thermomètre ;
//   5. expérience de fusion : « Démarrer », relevé toutes les 15 s, tableau et fichier CSV
//      (séparateur « ; », virgule décimale) ;
//   6. changement de partie par les onglets : l'adresse suit ;
//   7. pause quand l'app est hors de l'écran (cadre placé loin sous le haut de la page) ;
//   8. (Chrome seulement) processeur ralenti 4 fois, à 1024×768 : coût du code de l'app par image
//      (pas de simulation + dessin) ; images par seconde observées affichées.
// Variables : CHROME_PATH, FIREFOX_PATH (sinon les chemins de macOS).
// Le script n'est pas nécessaire au fonctionnement de l'app.

import path from 'node:path';
import {spawn} from 'node:child_process';
import {mkdirSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {servir, lancerChrome, ouvrirOnglet, ev, pause, fermer} from './cdp.mjs';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FIREFOX = process.env.FIREFOX_PATH || '/Applications/Firefox.app/Contents/MacOS/firefox';
const iSortie = process.argv.indexOf('--sortie');
const SORTIE = iSortie > 0 ? process.argv[iSortie + 1] : mkdtempSync(path.join(tmpdir(), 'changements-etat-captures-'));
mkdirSync(SORTIE, {recursive: true});
const NAVIGATEURS = process.argv.includes('--firefox-seul') ? ['firefox'] : process.argv.includes('--chrome-seul') ? ['chrome'] : ['chrome', 'firefox'];
const TAILLES = [[360, 640], [640, 360], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]];
const PARTIES = ['bac-a-sable', 'cycle', 'fusion'];

const echecs = [];
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 600) : ''));
  if (!ok) echecs.push(nom);
}

// ---------------------------------------------------------------- navigateurs
async function chrome() {
  let c = lancerChrome();
  return {
    nom: 'Chrome', chrome: true,
    // Un Chrome neuf par groupe de contrôles : après une vingtaine d'onglets, Chrome sans écran se fige parfois
    async relancer() { c.quit(); await pause(300); c = lancerChrome(); },
    async ouvrir(url, w, h, {tactile = false} = {}) {
      const o = await ouvrirOnglet(c, url, w, h, {tactile});
      return {
        journal: o.journal,
        ev: async e => JSON.parse(await ev(o, `(async()=>JSON.stringify(await (${e})))()`)),
        redim: (w2, h2) => c.send('Emulation.setDeviceMetricsOverride', {width: w2, height: h2, deviceScaleFactor: 1, mobile: tactile}, o.s),
        async doigt(points, duree = 40) {
          await c.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: points[0][0], y: points[0][1]}]}, o.s);
          for (const [x, y] of points.slice(1)) { await pause(duree); await c.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y}]}, o.s); }
          await pause(duree);
          await c.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}, o.s);
        },
        async capture(fichier) { const r = await c.send('Page.captureScreenshot', {format: 'png'}, o.s); writeFileSync(fichier, Buffer.from(r.data, 'base64')); },
        cpu: rate => c.send('Emulation.setCPUThrottlingRate', {rate}, o.s),
        fermer: () => fermer(o),
      };
    },
    quit: async () => c.quit(),
  };
}

async function firefox() {
  if (typeof WebSocket !== 'function') throw new Error('WebSocket absent : Node 22 ou plus, ou « node --experimental-websocket » (Node 20-21)');
  const profil = mkdtempSync(path.join(tmpdir(), 'changements-etat-firefox-'));
  writeFileSync(path.join(profil, 'user.js'), ['browser.shell.checkDefaultBrowser", false', 'datareporting.policy.dataSubmissionEnabled", false', 'dom.w3c_touch_events.enabled", 1']
    .map(p => 'user_pref("' + p + ');').join('\n'));
  const ff = spawn(FIREFOX, ['--headless', '--no-remote', '--profile', profil, '--remote-debugging-port', '0', 'about:blank'], {stdio: ['ignore', 'pipe', 'pipe']});
  let sortie = '';
  ff.stdout.on('data', d => { sortie += d; }); ff.stderr.on('data', d => { sortie += d; });
  let adresse = null;
  for (let i = 0; i < 150 && !adresse; i++) { await pause(200); adresse = (/WebDriver BiDi listening on (ws:\/\/[^\s]+)/.exec(sortie) || [])[1]; }
  if (!adresse) { ff.kill(); throw new Error('Firefox n’a pas ouvert WebDriver BiDi : ' + sortie.slice(-300)); }
  const ws = new WebSocket(adresse.replace(/\/$/, '') + '/session');
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('connexion BiDi impossible')); });
  let id = 0;
  const attente = new Map(), journaux = new Map();
  ws.onmessage = m => {
    const o = JSON.parse(m.data);
    if (o.type === 'event') {
      if (o.method === 'log.entryAdded') {
        const j = journaux.get(o.params.source && o.params.source.context) || [...journaux.values()][0];
        if (j && o.params.level === 'error') (o.params.type === 'javascript' ? j.erreurs : j.console).push(o.params.text);
      } else if (o.method === 'network.beforeRequestSent') {
        for (const j of journaux.values()) j.requetes.push(o.params.request.url);
      }
      return;
    }
    const p = o.id && attente.get(o.id);
    if (!p) return;
    attente.delete(o.id); clearTimeout(p.t);
    o.type === 'error' ? p.rej(new Error(o.error + ' : ' + o.message)) : p.res(o.result);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    attente.set(i, {res, rej, t: setTimeout(() => { attente.delete(i); rej(new Error('délai dépassé : ' + method)); }, 120000)});
    ws.send(JSON.stringify({id: i, method, params}));
  });
  const session = await send('session.new', {capabilities: {}});
  await send('session.subscribe', {events: ['log.entryAdded', 'network.beforeRequestSent']});
  return {
    nom: 'Firefox ' + session.capabilities.browserVersion, chrome: false,
    async ouvrir(url, w, h) {
      const {context} = await send('browsingContext.create', {type: 'tab'});
      const journal = {erreurs: [], console: [], requetes: [], echecs: []};
      journaux.clear(); journaux.set(context, journal);
      await send('browsingContext.setViewport', {context, viewport: {width: w, height: h}});
      await send('browsingContext.navigate', {context, url, wait: 'complete'});
      return {
        journal,
        async ev(e) {
          const r = await send('script.evaluate', {expression: `(async()=>JSON.stringify(await (${e})))()`, target: {context}, awaitPromise: true, userActivation: true});
          if (r.type === 'exception') throw new Error(r.exceptionDetails.text);
          return JSON.parse(r.result.value);
        },
        redim: (w2, h2) => send('browsingContext.setViewport', {context, viewport: {width: w2, height: h2}}),
        async doigt(points, duree = 40) {
          const actions = [{type: 'pointerMove', x: Math.round(points[0][0]), y: Math.round(points[0][1]), origin: 'viewport'}, {type: 'pointerDown', button: 0}];
          for (const [x, y] of points.slice(1)) actions.push({type: 'pointerMove', x: Math.round(x), y: Math.round(y), origin: 'viewport', duration: duree});
          actions.push({type: 'pause', duration: duree}, {type: 'pointerUp', button: 0});
          await send('input.performActions', {context, actions: [{type: 'pointer', id: 'doigt', parameters: {pointerType: 'touch'}, actions}]});
          await send('input.releaseActions', {context});
        },
        async capture(fichier) { const r = await send('browsingContext.captureScreenshot', {context}); writeFileSync(fichier, Buffer.from(r.data, 'base64')); },
        cpu: null,
        fermer: () => send('browsingContext.close', {context}),
      };
    },
    async relancer() { /* inutile dans Firefox */ },
    quit: async () => {
      try { await send('session.end'); } catch (e) { /* Firefox déjà fermé */ }
      ws.close(); ff.kill();
      setTimeout(() => { try { rmSync(profil, {recursive: true, force: true}); } catch (e) { /* profil temporaire */ } }, 1000);
    },
  };
}

// ---------------------------------------------------------------- dans la page
const PRET = `(async()=>{for(let i=0;i<100;i++){if(window.Changements&&Changements.monde())return true;await new Promise(r=>setTimeout(r,100));}return false;})()`;

const MESURE = `(()=>{
  const W = innerWidth, H = innerHeight, d = document.documentElement;
  const cibles = [...document.querySelectorAll('button, input, select')].filter(e => e.offsetParent !== null && !e.closest('[hidden]'));
  const petits = [], coupes = [], deborde = [];
  for (const e of cibles) {
    const r = e.getBoundingClientRect(), nom = ((e.textContent || '').trim() || e.id || e.type).slice(0, 28);
    if (r.width < 43.5 || r.height < 43.5) petits.push(nom + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    if (r.left < -0.5 || r.right > W + 0.5) coupes.push(nom);
    if (e.tagName === 'BUTTON' && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) deborde.push(nom);
  }
  const v = Changements.vue(), m = Changements.monde(), app = document.getElementById('app').getBoundingClientRect();
  return {defile: d.scrollWidth > W + 1 || d.scrollHeight > H + 1, petits, coupes, deborde,
    scene: [Math.round(m.nx * v.s), Math.round(m.ny * v.s)], part: +(m.nx * m.ny * v.s * v.s / (W * H)).toFixed(3),
    remplit: Math.abs(app.width - W) < 1 && Math.abs(app.height - H) < 1};
})()`;

const VAPEUR = `(()=>{
  const CE = window.ChangementsEtat, m = Changements.monde(), e = Changements.etat;
  e.enMarche = false;
  if (e.vapeur) document.getElementById('b-vapeur').click();
  const {nx, ny} = m, sat = CE.satLiquide(20);
  for (let i = 0; i < m.n; i++) {
    if (m.typ[i] !== CE.AIR) continue;
    m.T[i] = 20; m.d[i] = 0; m.c[i] = 0; m.p[i] = 0;
    m.v[i] = (i % nx) < nx / 2 ? 0 : 0.9 * sat;
  }
  Changements.dessiner();
  const px = Changements.pixelsGrille();
  let paires = 0, differences = 0;
  // air libre seulement (dans la coupe du cycle, l'air d'une cavité souterraine est dessiné dans le noir)
  const libre = i => !(e.partie === 'cycle' && ((i / nx) | 0) > e.infos.surface[i % nx]);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx / 2 - 1; x++) {
    const i = y * nx + x, j = y * nx + (nx - 1 - x);
    if (m.typ[i] === CE.AIR && m.typ[j] === CE.AIR && libre(i) && libre(j)) { paires++; if (px[i] !== px[j]) differences++; }
  }
  const v = Changements.vue(), toile = document.getElementById('scene'), ctx = toile.getContext('2d');
  // deux points de l'écran sans dessin par-dessus (Soleil, thermomètres, étiquettes), dans l'air
  const cycle = e.partie === 'cycle';
  const ligne = Math.round(ny * (cycle ? 0.3 : 0.12)), xa = Math.floor(nx * (cycle ? 0.12 : 0.3)), xb = Math.floor(nx * (cycle ? 0.62 : 0.7));
  const point = gx => Array.from(ctx.getImageData(Math.round((v.x + (gx + 0.5) * v.s) * v.dpr), Math.round((v.y + (ligne + 0.5) * v.s) * v.dpr), 1, 1).data);
  const sec = point(xa), humide = point(xb);
  document.getElementById('b-vapeur').click(); Changements.dessiner();
  const sec2 = point(xa), humide2 = point(xb), mention = !document.getElementById('mention-vapeur').hidden;
  document.getElementById('b-vapeur').click(); Changements.dessiner();
  return {paires, differences, sec, humide, sec2, humide2, mention, cases: [m.typ[ligne * nx + xa], m.typ[ligne * nx + xb]]};
})()`;

const VERS_ECRAN = `((gx, gy) => { const v = Changements.vue(), c = document.getElementById('scene').getBoundingClientRect(); return [c.left + v.x + gx * v.s, c.top + v.y + gy * v.s]; })`;
const CENTRE = sel => `(()=>{ const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`;

// ---------------------------------------------------------------- les contrôles
async function controler(nav, base) {
  const N = nav.nom;
  const ouvrir = async (adresse, w, h, opts) => { const p = await nav.ouvrir(base + adresse, w, h, opts); await p.ev(PRET); return p; };
  const propre = (p, quoi) => {
    const externes = p.journal.requetes.filter(u => !u.startsWith(base) && !/^(data:|blob:|about:)/.test(u));
    verifier(`${N} ${quoi} : aucune erreur, aucun message d’erreur en console, aucune requête hors du serveur local`,
      !p.journal.erreurs.length && !p.journal.console.length && !externes.length && !p.journal.echecs.length,
      {erreurs: p.journal.erreurs.slice(0, 3), console: p.journal.console.slice(0, 3), externes: externes.slice(0, 3), echecs: p.journal.echecs.slice(0, 3)});
  };

  // 1 et 2. Ouverture par l'adresse, mise en page aux six tailles
  for (const partie of PARTIES) {
    await nav.relancer();
    const p = await ouvrir('/index.html#' + partie, 1366, 768);
    const ouverte = await p.ev(`({partie: document.getElementById('app').dataset.partie, presse: document.querySelector('#parties button[aria-pressed="true"]').dataset.partie})`);
    verifier(`${N} #${partie} : la partie s’ouvre par l’adresse`, ouverte.partie === partie && ouverte.presse === partie, ouverte);
    if (partie === 'fusion') await p.ev(`(document.getElementById('b-demarrer').click(), Changements.avancer(1200), true)`);
    else await p.ev(`(Changements.avancer(600), true)`);
    const problemes = [];
    for (const [w, h] of TAILLES) {
      await p.redim(w, h);
      await pause(350);
      await p.ev(`(Changements.dessiner(), true)`);
      const r = await p.ev(MESURE);
      const minScene = Math.min(...r.scene);
      const ok = !r.defile && r.remplit && !r.petits.length && !r.coupes.length && !r.deborde.length && minScene >= 140 && r.part >= 0.12;
      if (!ok) problemes.push({taille: w + '×' + h, ...r});
      await p.capture(path.join(SORTIE, `${nav.chrome ? 'chrome' : 'firefox'}-${partie}-${w}x${h}.png`));
    }
    verifier(`${N} #${partie} : aux six tailles, l’app remplit la fenêtre sans défilement, scène d’au moins 140 px et 12 % de l’écran, cibles ≥ 44 px, rien de coupé`,
      !problemes.length, problemes);
    propre(p, '#' + partie);
    await p.fermer();
  }

  // 3. Vapeur invisible
  await nav.relancer();
  for (const partie of ['bac-a-sable', 'cycle', 'fusion']) {
    const p = await ouvrir('/index.html#' + partie, 1024, 768);
    const r = await p.ev(VAPEUR);
    const egaux = (a, b) => a.every((x, k) => x === b[k]);
    verifier(`${N} #${partie} : air humide et air sec à la même température donnent les mêmes pixels (${r.paires} paires de cases, ${r.differences} différente(s) ; écran ${r.sec} / ${r.humide})`,
      r.paires > 100 && r.differences === 0 && egaux(r.sec, r.humide) && r.cases.every(t => t === 0), r.cases);
    verifier(`${N} #${partie} : avec « Montrer la vapeur », la vapeur est teintée et la mention « la vapeur d’eau est invisible » s’affiche`,
      !egaux(r.sec2, r.humide2) && r.mention, {sec: r.sec2, humide: r.humide2});
    await p.fermer();
  }

  // 3 bis. Cycle : ce qui doit se voir franchement (sol sec / sol saturé, pluie, rivières)
  await nav.relancer();
  {
    const p = await ouvrir('/index.html#cycle', 1024, 768);
    const r = await p.ev(`(()=>{
      const CE = window.ChangementsEtat, m = Changements.monde(), inf = Changements.etat.infos, e = Changements.etat;
      e.enMarche = false;
      Changements.avancer(2500); e.enMarche = false;
      const lum = px => { const c = [px & 255, (px >>> 8) & 255, (px >>> 16) & 255].map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const rapport = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      // deux cases de sol voisines : l'une sèche, l'autre saturée
      const x = Math.round((inf.xSourceVent + inf.xSommet) / 2), i1 = (inf.haut[x] + 1) * m.nx + x, i2 = i1 + m.nx;
      m.m[i1] = 0.02; m.m[i2] = m.r.capaciteSol;
      // une goutte de pluie dans le ciel, au-dessus de l'océan
      const ip = 20 * m.nx + 20, iciel = 20 * m.nx + 24;
      m.p[ip] = 0.003; m.d[ip] = 0; m.d[iciel] = 0; m.p[iciel] = 0;
      Changements.dessiner();
      const px = Changements.pixelsGrille();
      const v = Changements.vue(), toile = document.getElementById('scene'), ctx = toile.getContext('2d');
      // la pluie est dessinée à l'écran en petits traits verticaux : on lit le milieu du trait de la goutte,
      // et le même endroit au-dessus de la case de ciel voisine
      const ecran = (gx, gy) => { const d = ctx.getImageData(Math.round((v.x + gx * v.s) * v.dpr), Math.round((v.y + gy * v.s) * v.dpr), 1, 1).data; return d[0] | (d[1] << 8) | (d[2] << 16); };
      const lg = Math.max(5, v.s * 2.2) / v.s;   // longueur du trait, en cases
      const sol = rapport(lum(px[i1]), lum(px[i2]));
      const pluie = rapport(lum(ecran(20.5 - 0.06 * lg, 20.5 - lg / 2)), lum(ecran(24.5 - 0.06 * lg, 20.5 - lg / 2)));
      // le ruban de la rivière à l'écran : des pixels bleu d'eau le long du lit de gauche
      let bleus = 0, testes = 0;
      for (let xx = inf.xCote + 4; xx < inf.xSourceVent - 2; xx += 2) {
        const X = Math.round((v.x + (xx + 0.5) * v.s) * v.dpr);
        for (let dy = -3; dy <= 0; dy++) {
          const Y = Math.round((v.y + (inf.haut[xx] + dy) * v.s) * v.dpr), d = ctx.getImageData(X, Y, 1, 1).data;
          testes++; if (d[2] > 150 && d[2] > d[0] + 80) { bleus++; break; }
        }
      }
      return {sol: +sol.toFixed(2), pluie: +pluie.toFixed(2), bleus, colonnes: Math.ceil((inf.xSourceVent - 2 - inf.xCote - 4) / 2)};
    })()`);
    verifier(`${N} cycle : sol sec et sol saturé nettement différents (rapport de luminance ${r.sol}, au moins 4) ; pluie (trait dessiné) visible sur le ciel (rapport ${r.pluie}, au moins 3)`, r.sol >= 4 && r.pluie >= 3);
    verifier(`${N} cycle : la rivière de gauche se voit à l’écran tout le long de son lit (${r.bleus} colonnes sur ${r.colonnes} avec de l’eau bleue)`, r.bleus >= 0.8 * r.colonnes, r);
    await p.capture(path.join(SORTIE, `${nav.chrome ? 'chrome' : 'firefox'}-cycle-riviere.png`));
    await p.fermer();
  }

  // 4. Tactile émulé
  await nav.relancer();
  {
    const p = await ouvrir('/index.html#bac-a-sable', 1024, 768, {tactile: true});
    const avant = await p.ev(`({masse: Changements.monde().masses().total, thermos: Changements.etat.thermometres.length})`);
    await p.doigt([await p.ev(CENTRE('[data-outil="eau"]'))]);
    const outil = await p.ev(`Changements.etat.outil`);
    const trait = await p.ev(`(()=>{ const f = ${VERS_ECRAN}, m = Changements.monde(); return [0.3, 0.34, 0.38, 0.42].map(u => f(m.nx * u, m.ny * 0.2)); })()`);
    await p.doigt(trait);
    const apresEau = await p.ev(`({masse: Changements.monde().masses().total})`);
    verifier(`${N} tactile : l’outil « Eau liquide » se choisit au doigt et un trait au doigt verse de l’eau (${Math.round(avant.masse)} g → ${Math.round(apresEau.masse)} g)`,
      outil === 'eau' && apresEau.masse > avant.masse + 5, {outil});
    await p.doigt([await p.ev(CENTRE('[data-outil="thermometre"]'))]);
    const ici = await p.ev(`(${VERS_ECRAN})(Changements.monde().nx * 0.6, Changements.monde().ny * 0.35)`);
    await p.doigt([ici]);
    const pose = await p.ev(`Changements.etat.thermometres.map(t => [t.x, t.y])`);
    const la = await p.ev(`(${VERS_ECRAN})(Changements.monde().nx * 0.6, Changements.monde().ny * 0.6)`);
    await p.doigt([ici, [(ici[0] + la[0]) / 2, (ici[1] + la[1]) / 2], la], 60);
    const glisse = await p.ev(`Changements.etat.thermometres.map(t => [t.x, t.y])`);
    const dernier = pose[pose.length - 1], apres = glisse[glisse.length - 1];
    verifier(`${N} tactile : un thermomètre se pose au doigt (${avant.thermos} → ${pose.length}) et se déplace en le faisant glisser`,
      pose.length === avant.thermos + 1 && apres && apres[1] > dernier[1] + 5, {pose: dernier, apres});
    propre(p, 'tactile');
    await p.fermer();
  }

  // 4 bis. Traits d'outils au hasard dans la page (graine fixe), à 360×640 : rien de non fini ni de négatif,
  // la masse affichée reste un nombre
  await nav.relancer();
  {
    const p = await ouvrir('/index.html#bac-a-sable', 360, 640);
    const r = await p.ev(`(()=>{ const C = Changements, m = C.monde(); C.etat.enMarche = false;
      let graine = 12345; const alea = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; };
      const outils = ['glace', 'neige', 'eau', 'verre', 'chaud', 'froid', 'gomme'], nx = m.nx, ny = m.ny;
      let premier = null, traits = 0;
      for (let k = 1; k <= 12000 && !premier; k++) {
        m.avancer();
        if (k % 20 === 0) {
          const o = outils[Math.floor(alea() * outils.length)], R = [1, 2.5, 4.5][Math.floor(alea() * 3)];
          const gx = alea() * nx, gy = alea() * ny, gx2 = gx + (alea() - 0.5) * 30, gy2 = gy + (alea() - 0.5) * 30;
          const n = Math.max(1, Math.ceil(Math.hypot(gx2 - gx, gy2 - gy) / Math.max(0.5, R * 0.6)));
          for (let s = 1; s <= n; s++) { const cx = gx + (gx2 - gx) * s / n, cy = gy + (gy2 - gy) * s / n;
            for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(ny - 1, Math.ceil(cy + R)); y++) for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(nx - 1, Math.ceil(cx + R)); x++)
              if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= R * R + 0.3) m.appliquerOutil(o, y * nx + x); }
          traits++;
        }
        if (k % 10 === 0) for (let i = 0; i < m.n; i++) if (!Number.isFinite(m.T[i]) || !Number.isFinite(m.v[i]) || m.v[i] < -1e-9 || m.m[i] < -1e-9) { premier = {pas: k}; break; }
      }
      C.dessiner();
      return {traits, premier, masses: document.getElementById('masses').innerText.replace(/\\n/g, ' | ')}; })()`);
    verifier(`${N} 360×640 : ${r.traits} traits d’outils au hasard en 12 000 pas, sans valeur non finie ni négative, masse affichée (« ${r.masses.slice(0, 40)}… »)`, !r.premier && /Masse totale d’eau : [0-9]/.test(r.masses) && !/NaN/.test(r.masses), r);
    await p.fermer();
  }

  // 5. Expérience de fusion : tableau et CSV
  await nav.relancer();
  {
    const p = await ouvrir('/index.html#fusion', 1024, 768);
    await p.ev(`(document.getElementById('b-demarrer').click(), Changements.avancer(3000), true)`);
    const r = await p.ev(`({lignes: document.querySelectorAll('#tableau tbody tr').length, mesures: Changements.etat.fusion.mesures.length, temps: Changements.monde().temps, csv: Changements.csv(), bouton: document.getElementById('b-demarrer').textContent})`);
    const lignes = r.csv.trim().split('\r\n');
    const attendu = Math.floor(r.temps / 15 + 1e-6) + 1;
    verifier(`${N} fusion : une mesure toutes les 15 s (${r.mesures} mesures pour ${Math.round(r.temps)} s), autant de lignes dans le tableau`,
      r.mesures === attendu && r.lignes === r.mesures && r.bouton === 'Pause', {lignes: r.lignes, attendu});
    verifier(`${N} fusion : CSV pour le tableur (« ${lignes[0]} », puis « ${lignes[1]} », « ${lignes[2]} »…)`,
      lignes[0] === 'Temps (min);Température (°C)' && lignes[1] === '0,00;-18,0' && lignes.slice(1).every(l => /^\d+,\d\d;-?\d+,\d$/.test(l)) && lignes.length === r.mesures + 1);
    propre(p, 'fusion');
    await p.fermer();
  }
  {
    // 100 g, plaque 6 : l'eau qui bout passe sous le réservoir du thermomètre ; les relevés s'arrêtent
    const p = await ouvrir('/index.html#fusion', 1024, 768);
    const r = await p.ev(`(()=>{
      const s = document.getElementById('s-masse'); s.value = '100'; s.dispatchEvent(new Event('change', {bubbles: true}));
      const pl = document.getElementById('r-plaque'); pl.value = '6'; pl.dispatchEvent(new Event('input', {bubbles: true}));
      document.getElementById('b-demarrer').click();
      for (let k = 0; k < 40 && Changements.etat.fusion.statut === 'en-cours'; k++) Changements.avancer(1000);
      const ms = Changements.etat.fusion.mesures, th = Changements.etat.thermometres[0];
      return {statut: Changements.etat.fusion.statut, message: !document.getElementById('hors-eau').hidden, bouton: document.getElementById('b-demarrer').textContent,
        derniere: ms.length ? ms[ms.length - 1].T : null, mini: Math.min(...ms.slice(ms.length - 20).map(x => x.T)), masse: Changements.etat.fusion.masse, niveau: Changements.etat.fusion.niveau};
    })()`);
    verifier(`${N} fusion, 100 g, plaque 6 : quand l’eau passe sous le thermomètre, les relevés s’arrêtent avec un message (« ${r.bouton} » ; dernier relevé ${r.derniere} °C, aucun relevé dans l’air)`,
      r.statut === 'hors' && r.message && r.mini > 90, r);
    await p.fermer();
  }

  // 6. Onglets et adresse
  await nav.relancer();
  {
    const p = await ouvrir('/index.html', 1024, 768);
    const r = [];
    for (const partie of ['cycle', 'fusion', 'bac-a-sable']) {
      await p.ev(`(document.querySelector('#parties [data-partie="${partie}"]').click(), true)`);
      r.push(await p.ev(`[location.hash, document.getElementById('app').dataset.partie]`));
    }
    verifier(`${N} onglets : l’adresse suit la partie choisie (${r.map(x => x[0]).join(', ')})`,
      r[0][0] === '#cycle' && r[1][0] === '#fusion' && r[2][0] === '#bac-a-sable' && r.every(x => x[0] === '#' + x[1]));
    const f = await p.ev(`(async()=>{
      const $ = id => document.getElementById(id), attendre = () => new Promise(r => setTimeout(r, 150));
      $('b-effacer').click(); await attendre();
      const question = !$('confirmation').hidden, texte = $('confirmation-texte').textContent;
      $('confirmation-non').click(); await attendre();
      const garde = Changements.monde().masses().liquide > 50;
      $('b-effacer').click(); await attendre(); $('confirmation-oui').click(); await attendre();
      const m = Changements.monde().masses();
      $('b-protocole').click(); await attendre();
      const protocole = !$('protocole').hidden && $('protocole').querySelector('.pour[data-pour="bac-a-sable"] ol').offsetParent !== null;
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await attendre();
      return {question, texte, garde, vide: m.liquide === 0 && m.glace === 0, thermos: Changements.etat.thermometres.length, protocole, ferme: $('protocole').hidden};
    })()`);
    verifier(`${N} « Tout effacer » demande confirmation (« ${f.texte} ») ; « Non » ne change rien, « Oui » vide le bac ; le protocole s’ouvre et se ferme (Échap)`,
      f.question && f.garde && f.vide && f.thermos === 0 && f.protocole && f.ferme, f);
    await p.fermer();
  }

  // 7. Pause hors de l'écran
  await nav.relancer();
  {
    const p = await ouvrir('/tests/cadre.html?bas=1&partie=cycle&w=640&h=400', 1024, 768);
    const cadre = `document.querySelector('iframe').contentWindow`;
    await p.ev(`(async()=>{for(let i=0;i<100;i++){const w=${cadre};if(w&&w.Changements&&w.Changements.monde())return true;await new Promise(r=>setTimeout(r,100));}return false;})()`);
    await pause(400);
    const a = await p.ev(`${cadre}.Changements.monde().pas`);
    await pause(1200);
    const b = await p.ev(`${cadre}.Changements.monde().pas`);
    await p.ev(`(document.querySelector('iframe').scrollIntoView(), true)`);
    await pause(1500);
    const c = await p.ev(`${cadre}.Changements.monde().pas`);
    verifier(`${N} cadre hors de l’écran : la simulation est en pause (${a} → ${b} pas), puis repart une fois le cadre visible (→ ${c})`, b === a && c > b + 10);
    await p.fermer();
  }

  // 8. Fluidité, processeur ralenti 4 fois (Chrome). On mesure ce que coûte le code de l'app à
  // chaque image (les pas de simulation d'une image et le dessin) ; le nombre d'images par seconde
  // observé est seulement affiché : il dépend aussi de la charge de la machine et du dessin
  // logiciel de Chrome sans écran.
  await nav.relancer();
  if (nav.chrome) {
    const mesures = {};
    for (const partie of PARTIES) {
      const p = await ouvrir('/index.html#' + partie, 1024, 768);
      if (partie === 'fusion') await p.ev(`(document.getElementById('b-demarrer').click(), true)`);
      await pause(500);
      await p.cpu(4);
      mesures[partie] = await p.ev(`(async()=>{
        const m = Changements.monde(), e = Changements.etat, parImage = {'bac-a-sable': 2, cycle: 2, fusion: 4}[e.partie];
        const marche = e.enMarche; e.enMarche = false;
        let t0 = performance.now(); for (let k = 0; k < 30; k++) m.avancer(); const pas = (performance.now() - t0) / 30;
        t0 = performance.now(); for (let k = 0; k < 15; k++) Changements.dessiner(); const dessin = (performance.now() - t0) / 15;
        e.enMarche = marche;
        const p0 = m.pas; let n = 0; t0 = performance.now();
        await new Promise(r => { function f() { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(); } requestAnimationFrame(f); });
        const s = (performance.now() - t0) / 1000;
        return {ms_par_pas: +pas.toFixed(1), ms_dessin: +dessin.toFixed(1), ms_par_image: +(parImage * pas + dessin).toFixed(1),
          observe_images_par_s: +(n / s).toFixed(1), observe_pas_par_s: +((m.pas - p0) / s).toFixed(1)};
      })()`);
      await p.cpu(1);
      await p.fermer();
    }
    {
      // cycle avec beaucoup de nuages et les noms affichés (le cas le plus chargé à dessiner)
      const p = await ouvrir('/index.html#cycle', 1024, 768);
      await pause(300);
      const nb = await p.ev(`(()=>{const e=Changements.etat, m=Changements.monde(); e.enMarche=false; let n=0;
        for (let k = 0; k < 30000; k++) { m.avancer(); if (k % 100) continue; n = 0; for (let i = 0; i < m.n; i++) if (m.typ[i] === 0 && m.d[i] > 0.0008) n++; if (n > 600 && k > 2000) break; }
        e.noms = true; Changements.dessiner(); return n;})()`);
      await p.cpu(4);
      mesures['cycle, nuages et noms'] = await p.ev(`(()=>{
        const m = Changements.monde();
        let t0 = performance.now(); for (let k = 0; k < 30; k++) m.avancer(); const pas = (performance.now() - t0) / 30;
        t0 = performance.now(); for (let k = 0; k < 15; k++) Changements.dessiner(); const dessin = (performance.now() - t0) / 15;
        return {ms_par_pas: +pas.toFixed(1), ms_dessin: +dessin.toFixed(1), ms_par_image: +(2 * pas + dessin).toFixed(1)};
      })()`);
      mesures['cycle, nuages et noms'].cases_de_nuage = nb;
      await p.cpu(1);
      await p.fermer();
    }
    verifier(`${N} processeur ralenti 4 fois, 1024×768 (aussi le cycle avec ${mesures['cycle, nuages et noms'].cases_de_nuage} cases de nuage et les noms) : le code de l’app coûte au plus 33 ms par image (pas de simulation + dessin), soit au moins 30 images/s possibles`,
      Object.values(mesures).every(m => m.ms_par_image <= 33), mesures);
  }
}

const srv = await servir(RACINE);
try {
  for (const quel of NAVIGATEURS) {
    let nav;
    try { nav = quel === 'firefox' ? await firefox() : await chrome(); } catch (e) { verifier(quel + ' : lancement', false, e.message); continue; }
    console.log(nav.nom);
    try { await controler(nav, srv.base); } catch (e) { console.error(e); echecs.push(nav.nom + ' : exception ' + e.message); } finally { await nav.quit(); }
  }
} finally {
  await srv.close();
}
console.log('Captures : ' + SORTIE);
console.log(echecs.length ? '\n' + echecs.length + ' échec(s) : ' + echecs.join(' | ') : '\nTout est vérifié.');
process.exit(echecs.length ? 1 : 0);
