// tests/cdp.mjs — outils de test de « Soleil, Terre, Lune » (non nécessaires à l'app) :
// petit serveur HTTP statique, Chrome sans écran piloté par le protocole DevTools (aucune
// dépendance npm), Firefox sans écran piloté par WebDriver BiDi.
// Variables : CHROME_PATH, FIREFOX_PATH (sinon les chemins de macOS).
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtempSync, rmSync, statSync, createReadStream, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8'};
export const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const FIREFOX = process.env.FIREFOX_PATH || '/Applications/Firefox.app/Contents/MacOS/firefox';
export const pause = ms => new Promise(r => setTimeout(r, ms));

export function servir(racine) {
  const serveur = createServer((req, res) => {
    let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (chemin.endsWith('/')) chemin += 'index.html';
    const fichier = path.join(racine, path.normalize(chemin).replace(/^(\.\.[/\\])+/, ''));
    if (!fichier.startsWith(racine) || !existsSync(fichier) || statSync(fichier).isDirectory()) { res.writeHead(404); res.end('absent'); return; }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(fichier).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    createReadStream(fichier).pipe(res);
  });
  return new Promise(resolve => serveur.listen(0, '127.0.0.1', () => resolve({
    base: 'http://127.0.0.1:' + serveur.address().port,
    close: () => new Promise(r => { serveur.closeAllConnections?.(); serveur.close(r); })
  })));
}

// ---------------------------------------------------------------- Chrome (DevTools Protocol)
export function lancerChrome() {
  const profil = mkdtempSync(path.join(tmpdir(), 'stl-chrome-'));
  // --disable-gpu : canevas dessiné par le processeur (Skia). Avec l'émulation SwiftShader, une image
  // de l'app coûtait 30 à 300 ms au lieu de 1 à 2 ms, et Chrome finissait par se bloquer.
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-extensions', '--remote-debugging-pipe', `--user-data-dir=${profil}`, ...(process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(' ') : []), 'about:blank'],
  {stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']});
  let seq = 0, tampon = '';
  const attente = new Map(), ecouteurs = [];
  chrome.stdio[4].on('data', c => {
    tampon += c;
    let i;
    while ((i = tampon.indexOf('\0')) >= 0) {
      const brut = tampon.slice(0, i); tampon = tampon.slice(i + 1);
      if (!brut) continue;
      const m = JSON.parse(brut);
      if (m.id) { const p = attente.get(m.id); if (p) { attente.delete(m.id); clearTimeout(p.t); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } }
      else ecouteurs.forEach(f => f(m));
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
  return {send, onEvent: f => ecouteurs.push(f),
    quit: () => { chrome.kill(); setTimeout(() => { try { rmSync(profil, {recursive: true, force: true}); } catch (e) { /* profil temporaire */ } }, 500); }};
}

export async function ouvrirOnglet(c, url, w, h, {tactile = false, dpr = 1} = {}) {
  const {targetId} = await c.send('Target.createTarget', {url: 'about:blank'});
  const {sessionId: s} = await c.send('Target.attachToTarget', {targetId, flatten: true});
  const journal = {erreurs: [], console: [], requetes: [], echecs: []};
  c.onEvent(m => {
    if (m.sessionId !== s) return;
    if (m.method === 'Runtime.exceptionThrown') journal.erreurs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(m.params.type))
      journal.console.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') journal.console.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
    if (m.method === 'Network.requestWillBeSent') journal.requetes.push(m.params.request.url);
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) journal.echecs.push(m.params.response.url + ' ' + m.params.response.status);
  });
  for (const d of ['Page', 'Runtime', 'Network', 'Log']) await c.send(d + '.enable', {}, s);
  await c.send('Page.bringToFront', {}, s);
  await c.send('Network.setCacheDisabled', {cacheDisabled: true}, s);
  await c.send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: dpr, mobile: tactile}, s);
  if (tactile) await c.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5}, s);
  await c.send('Page.navigate', {url}, s);
  const o = {c, s, targetId, journal, w, h};
  await ev(o, `(async()=>{for(let i=0;i<300;i++){if(document.readyState==='complete')return true;await new Promise(r=>setTimeout(r,100));}throw new Error('chargement trop long')})()`);
  return o;
}
export async function ev(o, expr) {
  const r = await o.c.send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true, userGesture: true}, o.s);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 900));
  return r.result.value;
}
export async function capture(o, fichier) {
  const r = await o.c.send('Page.captureScreenshot', {format: 'png'}, o.s);
  writeFileSync(fichier, Buffer.from(r.data, 'base64'));
}
export async function clic(o, x, y) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
    await o.c.send('Input.dispatchMouseEvent', {type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1}, o.s);
}
export async function glisserDoigt(o, x1, y1, x2, y2, etapes = 12) {
  await o.c.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x1, y: y1}]}, o.s);
  for (let i = 1; i <= etapes; i++) {
    await pause(16);
    await o.c.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x1 + (x2 - x1) * i / etapes, y: y1 + (y2 - y1) * i / etapes}]}, o.s);
  }
  await o.c.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}, o.s);
}
export async function glisserSouris(o, x1, y1, x2, y2, etapes = 12) {
  await o.c.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: x1, y: y1, button: 'none'}, o.s);
  await o.c.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: x1, y: y1, button: 'left', buttons: 1, clickCount: 1}, o.s);
  for (let i = 1; i <= etapes; i++)
    await o.c.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: x1 + (x2 - x1) * i / etapes, y: y1 + (y2 - y1) * i / etapes, button: 'left', buttons: 1}, o.s);
  await o.c.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: x2, y: y2, button: 'left', buttons: 0, clickCount: 1}, o.s);
}
export async function touche(o, key, code, vk) {
  await o.c.send('Input.dispatchKeyEvent', {type: 'keyDown', key, code, windowsVirtualKeyCode: vk, ...(key === ' ' ? {text: ' '} : {})}, o.s);
  await o.c.send('Input.dispatchKeyEvent', {type: 'keyUp', key, code, windowsVirtualKeyCode: vk}, o.s);
}
export async function fermer(o) { await o.c.send('Target.closeTarget', {targetId: o.targetId}); }

// ---------------------------------------------------------------- Firefox (WebDriver BiDi)
export async function lancerFirefox() {
  if (typeof WebSocket !== 'function') throw new Error('WebSocket absent : Node 22 ou plus, ou « node --experimental-websocket » (Node 20-21)');
  if (!existsSync(FIREFOX)) throw new Error('Firefox introuvable : ' + FIREFOX);
  const profil = mkdtempSync(path.join(tmpdir(), 'stl-firefox-'));
  writeFileSync(path.join(profil, 'user.js'), 'user_pref("browser.shell.checkDefaultBrowser", false);\nuser_pref("datareporting.policy.dataSubmissionEnabled", false);\n');
  const ff = spawn(FIREFOX, ['--headless', '--no-remote', '--profile', profil, '--remote-debugging-port', '0', 'about:blank'], {stdio: ['ignore', 'pipe', 'pipe']});
  let journal = '';
  ff.stdout.on('data', d => { journal += d; }); ff.stderr.on('data', d => { journal += d; });
  let adresse = null;
  for (let i = 0; i < 150 && !adresse; i++) { await pause(200); adresse = (/WebDriver BiDi listening on (ws:\/\/[^\s]+)/.exec(journal) || [])[1]; }
  if (!adresse) { ff.kill(); throw new Error('Firefox n’a pas ouvert WebDriver BiDi : ' + journal.slice(-300)); }
  const ws = new WebSocket(adresse.replace(/\/$/, '') + '/session');
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('connexion BiDi impossible')); });
  let id = 0;
  const attente = new Map(), evenements = [];
  ws.onmessage = m => {
    const o = JSON.parse(m.data);
    if (o.type === 'event') { evenements.push(o); return; }
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
  await send('session.subscribe', {events: ['log.entryAdded']});
  return {
    nom: 'Firefox ' + session.capabilities.browserVersion, send, evenements,
    quit: async () => {
      try { await send('session.end'); } catch (e) { /* déjà fermé */ }
      ws.close(); ff.kill();
      setTimeout(() => { try { rmSync(profil, {recursive: true, force: true}); } catch (e) { /* profil temporaire */ } }, 1000);
    }
  };
}
