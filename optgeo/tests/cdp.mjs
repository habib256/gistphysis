// tests/cdp.mjs — outils de test d’OptGeo web (copie adaptée de jsmecavideo/tests/cdp.mjs) (non nécessaires au fonctionnement de l'app)
//
// - un petit serveur HTTP local qui gère les requêtes Range (indispensables pour se déplacer
//   dans une vidéo : sans elles, Chrome ne peut pas aller à une image précise) ;
// - Chrome sans écran piloté par le protocole DevTools (aucune dépendance npm).
//
// Variables : CHROME_PATH (chemin de Chrome ou Chromium, sinon celui de macOS).

import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtempSync, rmSync, statSync, createReadStream, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.map': 'application/json', '.md': 'text/plain; charset=utf-8', '.opt': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.gif': 'image/gif'
};

// Serveur statique avec Range ; renvoie {base, close()}
export function servir(racine, port = 0, {sansRange = false} = {}) {
  const serveur = createServer((req, res) => {
    let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (chemin.endsWith('/')) chemin += 'index.html';
    const fichier = path.join(racine, path.normalize(chemin).replace(/^(\.\.[/\\])+/, ''));
    if (!fichier.startsWith(racine) || !existsSync(fichier) || statSync(fichier).isDirectory()) {
      res.writeHead(404); res.end('absent'); return;
    }
    const taille = statSync(fichier).size;
    const type = TYPES[path.extname(fichier).toLowerCase()] || 'application/octet-stream';
    const m = sansRange ? null : /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m) {
      let debut = m[1] === '' ? taille - Number(m[2]) : Number(m[1]);
      let fin = m[1] !== '' && m[2] !== '' ? Number(m[2]) : taille - 1;
      if (m[1] === '') fin = taille - 1;
      fin = Math.min(fin, taille - 1);
      if (debut > fin || debut < 0) { res.writeHead(416, {'Content-Range': `bytes */${taille}`}); res.end(); return; }
      res.writeHead(206, {'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${debut}-${fin}/${taille}`,
        'Content-Length': fin - debut + 1, 'Cache-Control': 'no-store'});
      createReadStream(fichier, {start: debut, end: fin}).pipe(res);
      return;
    }
    res.writeHead(200, {'Content-Type': type, ...(sansRange ? {} : {'Accept-Ranges': 'bytes'}), 'Content-Length': taille, 'Cache-Control': 'no-store'});
    createReadStream(fichier).pipe(res);
  });
  return new Promise(resolve => serveur.listen(port, '127.0.0.1', () => {
    resolve({base: 'http://127.0.0.1:' + serveur.address().port, close: () => new Promise(r => { serveur.closeAllConnections?.(); serveur.close(r); })});
  }));
}

// Lance Chrome sans écran ; renvoie un objet {send, onEvent, quit}
export function lancerChrome() {
  const profil = mkdtempSync(path.join(tmpdir(), 'optgeo-test-'));
  const chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
    '--disable-extensions', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--remote-debugging-pipe', `--user-data-dir=${profil}`, 'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']});
  let seq = 0, tampon = '';
  const attente = new Map(), ecouteurs = [];
  chrome.stdio[4].on('data', c => {
    tampon += c;
    let i;
    while ((i = tampon.indexOf('\0')) >= 0) {
      const brut = tampon.slice(0, i); tampon = tampon.slice(i + 1);
      if (!brut) continue;
      const m = JSON.parse(brut);
      if (m.id) {
        const p = attente.get(m.id);
        if (p) { attente.delete(m.id); clearTimeout(p.t); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
      } else ecouteurs.forEach(f => f(m));
    }
  });
  const send = (method, params = {}, sessionId) => {
    const id = ++seq;
    return new Promise((res, rej) => {
      const t = setTimeout(() => { attente.delete(id); rej(new Error('délai dépassé : ' + method)); }, 60000);
      attente.set(id, {res, rej, t});
      chrome.stdio[3].write(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}) + '\0');
    });
  };
  return {
    send,
    onEvent: f => ecouteurs.push(f),
    quit: () => { chrome.kill(); setTimeout(() => { try { rmSync(profil, {recursive: true, force: true}); } catch (e) { /* profil temporaire */ } }, 500); }
  };
}

// Onglet de taille donnée (tactile émulé ou non) ; journalise erreurs, console et requêtes
export async function ouvrirOnglet(c, url, w, h, {tactile = false, dpr = 1} = {}) {
  const {targetId} = await c.send('Target.createTarget', {url: 'about:blank'});
  const {sessionId: s} = await c.send('Target.attachToTarget', {targetId, flatten: true});
  const journal = {erreurs: [], console: [], requetes: [], echecs: []};
  c.onEvent(m => {
    if (m.sessionId !== s) return;
    if (m.method === 'Runtime.exceptionThrown') journal.erreurs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning' || m.params.type === 'assert'))
      journal.console.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') journal.console.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
    if (m.method === 'Network.requestWillBeSent') journal.requetes.push(m.params.request.url);
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) journal.echecs.push(m.params.response.url + ' ' + m.params.response.status);
  });
  await c.send('Page.enable', {}, s); await c.send('Page.bringToFront', {}, s); await c.send('Runtime.enable', {}, s); await c.send('Network.enable', {}, s); await c.send('Log.enable', {}, s);
  await c.send('Network.setCacheDisabled', {cacheDisabled: true}, s);
  await c.send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: dpr, mobile: tactile}, s);
  if (tactile) await c.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5}, s);
  await c.send('Page.navigate', {url}, s);
  const onglet = {c, s, targetId, journal, w, h};
  await ev(onglet, `(async()=>{for(let i=0;i<300;i++){if(document.readyState==='complete')return true;await new Promise(r=>setTimeout(r,100));}throw new Error('chargement trop long')})()`);
  return onglet;
}

export async function ev(o, expr) {
  const r = await o.c.send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true, userGesture: true}, o.s);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 900));
  return r.result.value;
}

// Attend qu'une expression soit vraie (renvoie sa valeur) ; lève une erreur sinon
export async function jusqua(o, expr, essais = 150) {
  const v = await ev(o, `(async()=>{for(let i=0;i<${essais};i++){let r;try{r=(${expr});}catch(e){}if(r)return r;await new Promise(r=>setTimeout(r,100));}return false;})()`);
  if (!v) throw new Error('condition jamais vraie : ' + expr);
  return v;
}

export const pause = ms => new Promise(r => setTimeout(r, ms));

export async function capture(o, fichier) {
  const r = await o.c.send('Page.captureScreenshot', {format: 'png'}, o.s);
  writeFileSync(fichier, Buffer.from(r.data, 'base64'));
}

export async function redimensionner(o, w, h, {tactile = false} = {}) {
  o.w = w; o.h = h;
  await o.c.send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: tactile}, o.s);
}

export async function clic(o, x, y, modificateurs = 0) {
  await o.c.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y, button: 'none', modifiers: modificateurs}, o.s);
  await o.c.send('Input.dispatchMouseEvent', {type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, modifiers: modificateurs}, o.s);
  await o.c.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, modifiers: modificateurs}, o.s);
}

export async function toucher(o, x, y, duree = 80) {
  await o.c.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]}, o.s);
  await pause(duree);
  await o.c.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}, o.s);
}

export async function doigtPose(o, x, y) { await o.c.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]}, o.s); }
export async function doigtGlisse(o, x, y) { await o.c.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y}]}, o.s); }
export async function doigtLeve(o) { await o.c.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}, o.s); }

export async function touche(o, key, code, vk, modifiers = 0, text) {
  await o.c.send('Input.dispatchKeyEvent', {type: 'keyDown', key, code, windowsVirtualKeyCode: vk, modifiers, ...(text ? {text} : {})}, o.s);
  await o.c.send('Input.dispatchKeyEvent', {type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers}, o.s);
}

export async function fermer(o) { await o.c.send('Target.closeTarget', {targetId: o.targetId}); }
