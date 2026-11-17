// tests/verifier-premiere-image.mjs — l'image affichée est la bonne, dès le chargement
//
//   node tests/verifier-premiere-image.mjs [--firefox | --firefox-seul] [--videos chute.mp4,vague3.mp4]
//
// Compare l'image réellement affichée par l'app (élément vidéo dessiné à sa taille native) aux
// images du fichier extraites par ffmpeg (ordre d'affichage, référence indépendante du
// navigateur), pour toutes les vidéos du menu (videos.js ; parabole.mp4, hors menu, n'est
// pas vérifiée) :
//   - vidéo de départ au démarrage de l'app, sans rien toucher : seule, et dans un cadre
//     (tests/cadre.html, comme dans le site) ;
//   - rechargement avec une séance enregistrée (app seule et dans le cadre) : image 0 pendant
//     la question « Reprendre ton pointage ? », puis image de reprise après « Reprendre » ;
//   - chaque vidéo choisie dans le menu : image 0 au chargement, images 1, 2, dernière, puis
//     « Début » (image 0).
// La comparaison porte sur les pixels qui changent d'une image à l'autre (le mobile) : les
// petits écarts de conversion des couleurs du décor ne comptent pas. Deux images identiques
// dans le fichier sont acceptées l'une pour l'autre.
//
// Navigateurs : Chrome sans écran (protocole DevTools, comme les autres tests ; essayé avec
// Node 20.18). Avec --firefox, la même vérification dans Firefox sans écran (WebDriver BiDi,
// aucune dépendance npm) : il faut alors Node 22 ou plus, ou Node 20-21 lancé ainsi :
//   node --experimental-websocket tests/verifier-premiere-image.mjs --firefox Variables : CHROME_PATH,
// FIREFOX_PATH (sinon les chemins de macOS), FFMPEG (sinon « ffmpeg »).
// Défaut que ce test a établi (novembre 2026) : Firefox suspend le décodage d'une vidéo
// invisible ; sans précaution, il affichait la 4e image au lieu de la 1re à chaque chargement.
// Chrome n'a jamais montré ce défaut : seul le contrôle Firefox le détecte.
// Le script n'est pas nécessaire au fonctionnement de l'app.

import path from 'node:path';
import {execFileSync, spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {servir, lancerChrome, ouvrirOnglet, ev, fermer, pause} from './cdp.mjs';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FIREFOX = process.env.FIREFOX_PATH || '/Applications/Firefox.app/Contents/MacOS/firefox';
const iVid = process.argv.indexOf('--videos');
const VIDEOS = iVid > 0 ? process.argv[iVid + 1].split(',').map(v => 'videos/' + v) : null;
const NAVIGATEURS = process.argv.includes('--firefox-seul') ? ['firefox'] : process.argv.includes('--firefox') ? ['chrome', 'firefox'] : ['chrome'];

const echecs = [];
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 500) : ''));
  if (!ok) echecs.push(nom);
}

// ---------------------------------------------------------------- références ffmpeg
const references = new Map();
function refs(video) {
  if (references.has(video)) return references.get(video);
  const fichier = path.join(RACINE, video);
  const [w, h] = execFileSync(FFMPEG.replace(/ffmpeg$/, 'ffprobe'), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', fichier])
    .toString().trim().split(',').map(Number);
  const brut = execFileSync(FFMPEG, ['-nostdin', '-v', 'error', '-i', fichier, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 1 << 30});
  const n = w * h * 3, imgs = [];
  for (let k = 0; (k + 1) * n <= brut.length; k++) imgs.push(brut.subarray(k * n, (k + 1) * n));
  // Pixels qui changent au cours de la vidéo
  const masque = [];
  for (let p = 0; p < w * h; p++) {
    let mn = 1e9, mx = -1;
    for (const r of imgs) { const v = r[3 * p] + r[3 * p + 1] + r[3 * p + 2]; if (v < mn) mn = v; if (v > mx) mx = v; }
    if (mx - mn > 60) masque.push(p);
  }
  const r = {w, h, imgs, masque: masque.length > 50 ? masque : [...Array(w * h).keys()]};
  references.set(video, r);
  return r;
}
// Image du fichier la plus proche de l'image affichée ; juste si l'image attendue est (l'une des) meilleures
function identifier(video, rgb, attendue) {
  const {imgs, masque} = refs(video);
  const d = imgs.map(r => { let s = 0; for (const p of masque) { const i = 3 * p; s += Math.abs(r[i] - rgb[i]) + Math.abs(r[i + 1] - rgb[i + 1]) + Math.abs(r[i + 2] - rgb[i + 2]); } return s / (3 * masque.length); });
  let k = 0; d.forEach((v, j) => { if (v < d[k]) k = j; });
  return {affichee: k, juste: d[attendue] <= d[k] * 1.15 + 0.3, ecart: +d[attendue].toFixed(2), meilleur: +d[k].toFixed(2)};
}

// ---------------------------------------------------------------- navigateurs
async function chrome() {
  const c = lancerChrome();
  return {
    nom: 'Chrome',
    async ouvrir(url) { const o = await ouvrirOnglet(c, url, 1024, 768); return {ev: async e => JSON.parse(await ev(o, `(async()=>JSON.stringify(await (${e})))()`)), fermer: () => fermer(o)}; },
    quit: async () => c.quit()
  };
}

async function firefox() {
  if (typeof WebSocket !== 'function') throw new Error('WebSocket absent : Node 22 ou plus, ou « node --experimental-websocket » (Node 20-21)');
  const profil = mkdtempSync(path.join(tmpdir(), 'jsmeca-firefox-'));
  writeFileSync(path.join(profil, 'user.js'), ['media.autoplay.default", 0', 'browser.shell.checkDefaultBrowser", false', 'datareporting.policy.dataSubmissionEnabled", false']
    .map(p => 'user_pref("' + p + ');').join('\n'));
  const ff = spawn(FIREFOX, ['--headless', '--no-remote', '--profile', profil, '--remote-debugging-port', '0', 'about:blank'], {stdio: ['ignore', 'pipe', 'pipe']});
  let journal = '';
  const lire = d => { journal += d; };
  ff.stdout.on('data', lire); ff.stderr.on('data', lire);
  let adresse = null;
  for (let i = 0; i < 150 && !adresse; i++) { await pause(200); adresse = (/WebDriver BiDi listening on (ws:\/\/[^\s]+)/.exec(journal) || [])[1]; }
  if (!adresse) { ff.kill(); throw new Error('Firefox n’a pas ouvert WebDriver BiDi : ' + journal.slice(-300)); }
  const ws = new WebSocket(adresse.replace(/\/$/, '') + '/session');
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('connexion BiDi impossible')); });
  let id = 0;
  const attente = new Map();
  ws.onmessage = m => {
    const o = JSON.parse(m.data);
    const p = o.id && attente.get(o.id);
    if (!p) return;
    attente.delete(o.id); clearTimeout(p.t);
    o.type === 'error' ? p.rej(new Error(o.error + ' : ' + o.message)) : p.res(o.result);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    attente.set(i, {res, rej, t: setTimeout(() => { attente.delete(i); rej(new Error('délai dépassé : ' + method)); }, 60000)});
    ws.send(JSON.stringify({id: i, method, params}));
  });
  const session = await send('session.new', {capabilities: {}});
  return {
    nom: 'Firefox ' + session.capabilities.browserVersion,
    async ouvrir(url) {
      const {context} = await send('browsingContext.create', {type: 'tab'});
      await send('browsingContext.setViewport', {context, viewport: {width: 1024, height: 768}});
      await send('browsingContext.navigate', {context, url, wait: 'complete'});
      return {
        ev: async e => {
          const r = await send('script.evaluate', {expression: `(async()=>JSON.stringify(await (${e})))()`, target: {context}, awaitPromise: true, userActivation: true});
          if (r.type === 'exception') throw new Error(r.exceptionDetails.text);
          return JSON.parse(r.result.value);
        },
        fermer: () => send('browsingContext.close', {context})
      };
    },
    quit: async () => {
      try { await send('session.end'); } catch (e) { /* Firefox déjà fermé */ }
      ws.close(); ff.kill();
      setTimeout(() => { try { rmSync(profil, {recursive: true, force: true}); } catch (e) { /* profil temporaire */ } }, 1000);
    }
  };
}

// ---------------------------------------------------------------- dans la page
// W : la fenêtre de l'app (celle du cadre s'il y en a un)
const OUTILS = `(()=>{window.__W=()=>{const f=document.querySelector('iframe');return f?f.contentWindow:window;};
  window.__attendre=async(f,n=200)=>{for(let i=0;i<n;i++){let r;try{r=f();}catch(e){}if(r)return true;await new Promise(r=>setTimeout(r,100));}return false;};
  window.__image=()=>{const W=__W(),l=W.lecteur(),v=l.elt,w=v.videoWidth,h=v.videoHeight;if(!w||!h)return null;
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(v,0,0);const d=x.getImageData(0,0,w,h).data;
    const o=new Uint8Array(w*h*3);for(let i=0,j=0;i<d.length;i+=4,j+=3){o[j]=d[i];o[j+1]=d[i+1];o[j+2]=d[i+2];}
    let s='';for(let i=0;i<o.length;i+=0x8000)s+=String.fromCharCode.apply(null,o.subarray(i,i+0x8000));
    return {b64:btoa(s),image:l.image,t:v.currentTime,question:!W.document.getElementById('confirmation').hidden};};
  return true;})()`;
const PRET = (video) => `__attendre(()=>{const l=__W().lecteur();return l&&l.chemin===${JSON.stringify(video)}&&l.isLoaded&&l.pret();})`;

// Image affichée comparée à l'image k du fichier ; aussi : l'app annonce-t-elle bien l'image k ?
async function mesurer(o, video, k) {
  await o.ev(OUTILS);
  const pret = await o.ev(PRET(video));
  await pause(350);
  const g = await o.ev('__image()');
  if (!g) return {juste: false, attendue: k, raison: 'aucune image (dimensions nulles)', pret};
  const id = identifier(video, Buffer.from(g.b64, 'base64'), k);
  return {...id, attendue: k, imageApp: g.image, question: g.question, pret, juste: id.juste && g.image === k && pret};
}
const resume = m => `${m.attendue}→${m.affichee}${m.juste ? '' : ' FAUX'}`;
const choisir = (o, video) => o.ev(`(()=>{const W=__W(),i=W.eval('videoFiles').findIndex(v=>v.path===${JSON.stringify(video)}),s=W.document.getElementById('choix-video');s.value=String(i);s.dispatchEvent(new Event('change'));return true;})()`);
const recharger = async (o) => { await o.ev(`(setTimeout(()=>location.reload(),10),true)`); await pause(1500); await o.ev(OUTILS); };
const pointer = (o, x, y) => o.ev(`(async()=>{const W=__W();W.traiterPointage(${x},${y});await __attendre(()=>W.lecteur().pret());await new Promise(r=>setTimeout(r,250));return true;})()`);

const srv = await servir(RACINE);
const DEPART = 'videos/chute.mp4';
try {
  for (const quel of NAVIGATEURS) {
    let nav;
    try { nav = quel === 'firefox' ? await firefox() : await chrome(); } catch (e) {
      verifier(quel + ' : lancement', false, e.message);
      continue;
    }
    console.log(nav.nom);
    try {
      // 1. Démarrage : vidéo de départ, rien touché (seule, puis dans un cadre)
      for (const page of ['/index.html', '/tests/cadre.html']) {
        const o = await nav.ouvrir(srv.base + page);
        const m = await mesurer(o, DEPART, 0);
        verifier(`${nav.nom} ${page} : au démarrage, la vidéo de départ montre l’image 0 du fichier`, m.juste, m);
        {
          // 2. Séance enregistrée (2 points), rechargement : question, puis « Reprendre »
          await pointer(o, 100, 100); await pointer(o, 110, 120);
          await o.ev(`(__W().sauvegarderSeance(),true)`);
          await recharger(o);
          const q = await mesurer(o, DEPART, 0);
          verifier(`${nav.nom} ${page} : rechargement, question « Reprendre ton pointage ? » ouverte : image 0`, q.juste && q.question, q);
          await pause(450);
          await o.ev(`(__W().document.getElementById('confirmation-oui').click(),true)`);
          await pause(300);
          const r = await mesurer(o, DEPART, 2);
          verifier(`${nav.nom} ${page} : après « Reprendre », image de reprise 2 affichée`, r.juste, r);
          await o.ev(`(__W().sessionStorage.clear(),true)`);
        }
        await o.fermer();
      }
      // 3. Toutes les vidéos, choisies dans le menu
      const o = await nav.ouvrir(srv.base + '/index.html');
      await o.ev(OUTILS);
      await o.ev(PRET(DEPART));
      const catalogue = await o.ev(`__W().eval('videoFiles').map(v=>({path:v.path,images:v.images}))`);
      for (const v of catalogue) {
        if (VIDEOS && !VIDEOS.includes(v.path)) continue;
        const der = v.images - 1;
        if (v.path === DEPART) { await choisir(o, 'videos/disque33t.mp4'); await o.ev(PRET('videos/disque33t.mp4')); }
        await choisir(o, v.path);
        const mesures = [await mesurer(o, v.path, 0)];
        for (const k of [1, 2, der]) { await o.ev(`(__W().lecteur().allerImageChoisie(${k}),true)`); mesures.push(await mesurer(o, v.path, k)); }
        await o.ev(`(__W().document.querySelector('.bouton-debut').click(),true)`);
        mesures.push(await mesurer(o, v.path, 0));
        verifier(`${nav.nom} ${v.path.slice(7)} : chargement ${resume(mesures[0])}, images ${mesures.slice(1, 4).map(resume).join(', ')}, Début ${resume(mesures[4])}`,
          mesures.every(m => m.juste), mesures.filter(m => !m.juste));
      }
      await o.fermer();
    } catch (e) {
      console.error(e);
      echecs.push(nav.nom + ' : exception ' + e.message);
    } finally {
      await nav.quit();
    }
  }
} finally {
  await srv.close();
}
console.log(echecs.length ? '\n' + echecs.length + ' échec(s) : ' + echecs.join(' | ') : '\nTout est vérifié.');
process.exit(echecs.length ? 1 : 0);
