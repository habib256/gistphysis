// tests/verifier-interface.mjs — essais de l'interface web d'OptGeo dans un vrai navigateur
//
//   node optgeo/tests/verifier-interface.mjs                 Chrome sans écran (protocole DevTools)
//   node --experimental-websocket optgeo/tests/verifier-interface.mjs --firefox      Chrome puis Firefox
//   node --experimental-websocket optgeo/tests/verifier-interface.mjs --firefox-seul
//
// Aucune dépendance npm. Variables : CHROME_PATH, FIREFOX_PATH (sinon les chemins de macOS),
// CAPTURES (dossier des captures, sinon un dossier temporaire affiché à la fin).
// Firefox passe par WebDriver BiDi (Node 22, ou Node 20-21 avec --experimental-websocket).
// Lancer ce test seul : plusieurs Chrome pilotés en même temps se bloquent (constaté avec jsMecaVidéo).
//
// Contrôles (Chrome) : chargement sans erreur ni requête extérieure ; les 56 exemples s'ouvrent et
// se dessinent ; création au doigt (événements tactiles) d'un miroir, d'une lentille, d'une source,
// d'un prisme et d'autres objets ; glisser d'une poignée qui change les rayons ; Échap qui remet
// en place ; propriétés modifiées ; annuler / rétablir ; enregistrer (Ctrl+S) puis rouvrir un .opt
// identique ; reprise après rechargement ; zoom à deux doigts ; molette ; 6 tailles d'écran (rien
// ne déborde, zone de dessin non nulle, captures) ; l'app dans un cadre ; export PNG et SVG ;
// scénarios tirés des exemples (SPEC §15). Firefox : chargement, exemples, création à la souris,
// tailles d'écran, exports.

import path from 'node:path';
import {spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {servir, lancerChrome, ouvrirOnglet, ev, fermer, pause, capture, redimensionner, touche} from './cdp.mjs';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FIREFOX = process.env.FIREFOX_PATH || '/Applications/Firefox.app/Contents/MacOS/firefox';
const NAVIGATEURS = process.argv.includes('--firefox-seul') ? ['firefox'] : process.argv.includes('--firefox') ? ['chrome', 'firefox'] : ['chrome'];
const CAPTURES = process.env.CAPTURES || mkdtempSync(path.join(tmpdir(), 'optgeo-captures-'));
mkdirSync(CAPTURES, {recursive: true});

let nbOk = 0;
const echecs = [];
function verifier(nom, ok, detail) {
  console.log((ok ? '  ok   ' : '  ÉCHEC ') + nom + (detail !== undefined && !ok ? ' — ' + JSON.stringify(detail).slice(0, 600) : ''));
  if (ok) nbOk++; else echecs.push(nom);
}
const TAILLES = [[360, 640], [640, 360], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]];

// ---------------------------------------------------------------- aides injectées dans la page
const OUTILS = `(async()=>{for(let i=0;i<200&&!(window.OGW&&OGW.app&&OGW.app.dessinateur&&document.readyState==='complete');i++)await new Promise(r=>setTimeout(r,50));
  window.__attendre=async(f,n=100)=>{for(let i=0;i<n;i++){let r;try{r=f();}catch(e){}if(r)return r;await new Promise(r=>setTimeout(r,50));}return false;};
  window.__image=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))));
  window.__ecran=(x,y)=>{const v=OGW.app.dessinateur.vue(),p=v.versEcran(x,y),r=document.getElementById('dessin').getBoundingClientRect();return [r.left+p[0],r.top+p[1]];};
  window.__centre=(sel)=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];};
  window.__trace=()=>JSON.stringify(OGW.app.scene.tracer().segments.map(s=>[+s.a1x.toFixed(6),+s.a1y.toFixed(6),+s.a2x.toFixed(6),+s.a2y.toFixed(6)]));
  window.__pixels=()=>{const c=document.getElementById('dessin'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let n=0,rouges=0;
    for(let i=0;i<d.length;i+=4*7){const r=d[i],g=d[i+1],b=d[i+2];if(!(Math.abs(r-217)<4&&Math.abs(g-221)<4&&Math.abs(b-227)<4)&&!(r>250&&g>250&&b>250))n++;if(r>200&&g<80&&b<80)rouges++;}return {n,rouges};};
  window.__telechargements=[];
  OGW.telecharger=function(blob,nom){window.__telechargements.push({nom,taille:blob.size,type:blob.type});blob.arrayBuffer().then(a=>{const t=window.__telechargements.find(x=>x.nom===nom&&!x.octets);if(t)t.octets=Array.from(new Uint8Array(a.slice(0,16)));});
    if(/\\.(opt|txt|svg)$/.test(nom))blob.text().then(t=>{window.__telechargements.filter(x=>x.nom===nom).forEach(x=>x.texte=t);});};
  return true;})()`;
const DEMARRER = `(async()=>{await __attendre(()=>document.querySelector('.dialogue .pied button.principal'));
  const b=[...document.querySelectorAll('.dialogue .pied button')];const p=b.find(x=>/Valider/.test(x.textContent));if(p)p.click();await __image();return OGW.app.scene.objets.length===0;})()`;

// ---------------------------------------------------------------- Chrome
async function essaisChrome(srv) {
  const c = lancerChrome();
  try {
    // 1. Chargement : erreurs, requêtes, démarrage
    let o = await ouvrirOnglet(c, srv.base + '/index.html', 1024, 768, {tactile: true});
    await ev(o, `localStorage.clear()`);
    await ev(o, `(setTimeout(()=>location.reload(),5),true)`); await pause(1200);
    await ev(o, OUTILS);
    verifier('Chrome : boîte de démarrage « Que voulez-vous faire ? »', await ev(o, `document.querySelector('.dialogue h2').textContent`) === 'Que voulez-vous faire ?');
    verifier('Chrome : nouvelle simulation vide', await ev(o, DEMARRER));
    verifier('Chrome : chargement sans erreur JavaScript ni message d’erreur', !o.journal.erreurs.length && !o.journal.console.length, o.journal);
    const externes = o.journal.requetes.filter(u => !u.startsWith(srv.base) && !u.startsWith('data:') && !u.startsWith('blob:'));
    verifier('Chrome : aucune requête extérieure', externes.length === 0, externes);
    verifier('Chrome : aucune requête en échec', o.journal.echecs.length === 0, o.journal.echecs);
    const zone = await ev(o, `(()=>{const r=document.getElementById('dessin').getBoundingClientRect();return [r.width,r.height]})()`);
    verifier('Chrome 1024×768 : zone de dessin ' + zone.join('×'), zone[0] > 800 && zone[1] > 600, zone);

    // 2. Les 56 exemples s'ouvrent et se dessinent
    const res = await ev(o, `(async()=>{const r=[];for(const e of window.OPTGEO_EXEMPLES){
      const avant=OGW.app.dessinateur.nbDessins;OGW.app.ouvrirTexteOpt(e.opt,e.fichier.split('/').pop(),e.description,{exemple:e.fichier});OGW.app.fermerPanneau();
      await __image();const px=__pixels();
      r.push({f:e.fichier,objets:OGW.app.scene.objets.length,segments:OGW.app.scene.tracer().segments.length,dessine:OGW.app.dessinateur.nbDessins>avant,erreur:OGW.app.erreurDessin?String(OGW.app.erreurDessin):null,pixels:px.n,commentaire:OGW.app.scene.commentaire===e.description});}
      return r;})()`);
    verifier('Chrome : 56 exemples embarqués', res.length === 56, res.length);
    const mauvais = res.filter(r => !r.objets || !r.dessine || r.erreur || r.pixels < 30 || !r.commentaire);
    verifier('Chrome : les 56 exemples s’ouvrent, se tracent et se dessinent sans erreur (objets, rayons, pixels, commentaire)', mauvais.length === 0, mauvais);
    verifier('Chrome : tous les exemples avec source ont des rayons tracés', res.filter(r => r.segments > 0).length >= 50, res.filter(r => !r.segments).map(r => r.f));
    verifier('Chrome : aucune erreur JavaScript pendant les exemples', !o.journal.erreurs.length, o.journal.erreurs);

    // 3. Scénarios tirés des exemples (SPEC §15)
    const ouvrir = (f) => ev(o, `(async()=>{const e=OPTGEO_EXEMPLES.find(x=>x.fichier.endsWith(${JSON.stringify(f)}));OGW.app.ouvrirTexteOpt(e.opt,e.fichier.split('/').pop(),e.description,{exemple:e.fichier});OGW.app.fermerPanneau();await __image();return true;})()`);
    await ouvrir('arc_en_ciel_primaire.opt');
    verifier('A27 : arc-en-ciel, fantômes (3,6,9) restaurés', await ev(o, `OGW.app.scene.options.fantomespresents && OGW.app.scene.options.listefantomes==='(3,6,9)'`));
    verifier('A27 : lumière blanche décomposée en rouge, vert, bleu', await ev(o, `(()=>{const c=new Set(OGW.app.scene.tracer().segments.map(s=>s.couleur));return c.has(255)&&c.has(32768)&&c.has(16711680)})()`));
    await ev(o, `(document.querySelector('[data-action=affichage]').click(),true)`);
    await ev(o, `(document.querySelector('#popover-affichage input[data-option=optionangles]').click(),true)`);
    await ev(o, `__image()`);
    verifier('A28 : cocher « Angles » coche aussi les normales', await ev(o, `OGW.app.scene.options.optionangles && OGW.app.scene.options.optionnormale`));
    const angles = await ev(o, `OGW.app.scene.tracer().angles.length`);
    verifier('A28 : angles d’incidence et de réfraction calculés (' + angles + ')', angles > 0);
    await ev(o, `(document.querySelector('#popover-affichage input[data-option=optionangles]').click(),OGW.app.fermerVolets(),true)`);
    await ouvrir('telescope_cassegrain.opt');
    verifier('A13 : Cassegrain en mètres (unité « m »)', await ev(o, `OGW.app.scene.options.unitelongueur==='m'`));
    await ouvrir('coronographe.opt');
    verifier('A33 : coronographe, attraction de la grille cochée', await ev(o, `OGW.app.scene.options.attractiongrille===true`));
    await ouvrir('michelson2.opt');
    verifier('A36 : michelson2, liste des fantômes (4,9)', await ev(o, `OGW.app.scene.options.listefantomes==='(4,9)'`));
    await ouvrir('miroir_hyperbolique2.opt');
    const t1 = await ev(o, `__trace()`);
    await ouvrir('miroir_hyperbolique.opt');
    const t2 = await ev(o, `__trace()`);
    verifier('A02 : anciens formats (versions 1 et 10) lus et tracés', t1.length > 10 && t2.length > 10);

    // 4. Panneau des propriétés d'un exemple (A31 : focales de la lunette)
    await ouvrir('lunette_astronomique.opt');
    const focales = await ev(o, `OGW.app.scene.objetsDuType('lmc').map(x=>Math.round(x.focale))`);
    verifier('A31 : lunette, focales 300 et 50 mm', JSON.stringify(focales.sort((a, b) => a - b)) === '[50,300]', focales);
    const mesureAngles = await ev(o, `OGW.app.scene.objetsDuType('angle').length`);
    verifier('A31 : deux mesures d’angle', mesureAngles === 2, mesureAngles);

    // 5. Création au doigt
    await ev(o, `(OGW.app.nouvelleSimulation({xxmin:0,xxmax:1000,yymin:0,yymax:700}),true)`);
    await ev(o, `__image()`);
    const tap = async (x, y) => { await doigt(o, 'touchStart', x, y); await pause(40); await doigt(o, 'touchEnd'); await pause(60); };
    const point = async (wx, wy, viseeAvant = true) => {
      const [x, y] = await ev(o, `__ecran(${wx},${wy})`);
      if (viseeAvant) { await doigt(o, 'touchStart', x + 30, y + 25); await pause(30); await doigt(o, 'touchMove', x + 12, y + 8); await pause(30); await doigt(o, 'touchMove', x, y); }
      else await doigt(o, 'touchStart', x, y);
      await pause(40);
      await doigt(o, 'touchEnd'); await pause(80);
    };
    const outil = async (famille, id) => {
      const f = await ev(o, `__centre('.onglet[data-famille=${famille}]')`); await tap(f[0], f[1]);
      const b = await ev(o, `__centre('.outil[data-outil="${id}"]')`); await tap(b[0], b[1]);
      await pause(100);
    };
    const nb = (t) => ev(o, `OGW.app.scene.objetsDuType('${t}').length`);
    // miroir plan
    await outil('miroirs', 'miroirplan');
    verifier('Création au doigt : mode « ajout d’un miroir plan » et consigne', /miroir plan.*point 1/i.test(await ev(o, `document.getElementById('bandeau-texte').textContent`)));
    await point(700, 150);
    const loupe = await ev(o, `(()=>{const l=document.querySelector('.loupe');return l?l.hidden:null})()`);
    await point(700, 550);
    verifier('Création au doigt : miroir plan créé', await nb('miroirplan') === 1);
    verifier('Création au doigt : la loupe se ferme au relâcher', loupe === true);
    // lentille convergente : 2 bords + foyer
    await outil('dioptres', 'lmc');
    await point(450, 200); await point(450, 500); await point(560, 380);
    const lent = await ev(o, `(()=>{const l=OGW.app.scene.objetsDuType('lmc')[0];return l?{f:l.focale,a1x:l.a1x}:null})()`);
    verifier('Création au doigt : lentille mince convergente, foyer projeté sur l’axe (f ≈ 110)', lent && Math.abs(lent.f - 110) < 3, lent);
    // source ponctuelle réelle : S, 1, 2 + nombre de rayons
    await outil('sources', 'sourcereelle');
    await point(150, 350); await point(300, 450); await point(300, 250);
    await ev(o, `__attendre(()=>document.querySelector('.dialogue'))`);
    verifier('Création au doigt : boîte « Nombre de rayons »', await ev(o, `document.querySelector('.dialogue h2').textContent`) === 'Nombre de rayons');
    await ev(o, `(()=>{const i=document.querySelector('.dialogue input');i.value='7';document.querySelector('.dialogue .pied button.principal').click();return true})()`);
    await ev(o, `__image()`);
    const src = await ev(o, `(()=>{const s=OGW.app.scene.objetsDuType('sourceponctuelle')[0];return s?{n:s.nombrederayon,a1y:s.a1y,a2y:s.a2y}:null})()`);
    verifier('Création au doigt : source ponctuelle, 7 rayons', src && src.n === 7, src);
    verifier('Source : bords rangés dans le sens direct (petit secteur)', src && src.a1y < src.a2y, src);
    const segs = await ev(o, `OGW.app.scene.tracer().segments.length`);
    verifier('Création au doigt : rayons tracés à travers la lentille (' + segs + ' segments)', segs >= 14);
    // prisme : G, A, base
    await outil('dioptres', 'prisme');
    await point(850, 400); await point(850, 500); await point(800, 340);
    verifier('Création au doigt : prisme', await nb('prisme') === 1);
    // sphère, rayon, écran, diaphragme, lame, mesure, œil
    await outil('dioptres', 'sphere'); await point(250, 600); await point(290, 600);
    await outil('sources', 'rayon'); await point(60, 650); await point(120, 640);
    await outil('ecrans', 'ecran'); await point(980, 100); await point(980, 650);
    await outil('ecrans', 'diaphragme'); await point(620, 350); await point(620, 420); await point(620, 500);
    await outil('divers', 'metre'); await point(100, 100); await point(300, 100);
    await outil('miroirs', 'mscore'); await point(900, 60); await point(960, 120); await point(800, 0 + 300);
    const compte = await ev(o, `(()=>{const r={};OGW.app.scene.objets.forEach(x=>r[x.type]=(r[x.type]||0)+1);return r})()`);
    verifier('Création au doigt : sphère, rayon, écran, diaphragme, mesure de distance, miroir concave réel', ['sphere', 'rayon', 'ecran', 'diaphragme', 'metre', 'mscore'].every(t => compte[t] === 1), compte);
    // polyèdre : boîte du nombre de sommets puis sommets
    await outil('dioptres', 'polyhedre');
    await ev(o, `__attendre(()=>document.querySelector('.dialogue'))`);
    await ev(o, `(()=>{const i=document.querySelector('.dialogue input');i.value='3';document.querySelector('.dialogue .pied button.principal').click();return true})()`);
    await pause(100);
    await point(380, 600); await point(450, 600); await point(410, 660);
    verifier('Création au doigt : polygone à 3 sommets', await nb('polyhedre') === 1);
    // points trop proches
    await outil('miroirs', 'miroirplan');
    await point(100, 300); await point(100.5, 300.5);
    verifier('G33 : points trop proches refusés, on reste dans l’étape', await ev(o, `OGW.app.mode==='creation' && OGW.app.creation.points.length===1 && /trop proches/.test(document.getElementById('message').textContent)`));
    await touche(o, 'Escape', 'Escape', 27);
    verifier('E13 : Échap abandonne la création', await ev(o, `OGW.app.mode==='selection' && !OGW.app.creation && OGW.app.scene.objetsDuType('miroirplan').length===1`));
    await capture(o, path.join(CAPTURES, 'chrome-creation-1024x768.png'));
    verifier('Chrome : aucune erreur JavaScript pendant les créations', !o.journal.erreurs.length, o.journal.erreurs);

    // 6. Sélection et glisser d'une poignée (le foyer de la lentille) : les rayons changent
    const avant = await ev(o, `__trace()`);
    const [lx, ly] = await ev(o, `(()=>{const l=OGW.app.scene.objetsDuType('lmc')[0];return __ecran((l.a1x+l.a2x)/2,(l.a1y+l.a2y)/2-110)})()`);
    await tap(lx, ly);
    verifier('Sélection au doigt : la lentille est choisie', await ev(o, `OGW.app.selection===OGW.app.scene.objetsDuType('lmc')[0].id`));
    verifier('Sélection : barre Propriétés / Dupliquer / Supprimer visible', await ev(o, `!document.getElementById('barre-contexte').hidden`));
    const [fx, fy] = await ev(o, `(()=>{const g=OGW.app.scene.geometrie(OGW.app.selection);return __ecran(g.f1x,g.f1y)})()`);
    const [fx2, fy2] = await ev(o, `(()=>{const g=OGW.app.scene.geometrie(OGW.app.selection);return __ecran(g.ox+(g.f1x-g.ox)*1.8,g.oy+(g.f1y-g.oy)*1.8)})()`);
    await doigt(o, 'touchStart', fx, fy); await pause(40);
    for (let k = 1; k <= 6; k++) { await doigt(o, 'touchMove', fx + (fx2 - fx) * k / 6, fy + (fy2 - fy) * k / 6); await pause(40); }
    await doigt(o, 'touchEnd'); await pause(150);
    const f2 = await ev(o, `OGW.app.scene.objetsDuType('lmc')[0].focale`);
    const apres = await ev(o, `__trace()`);
    verifier('Glisser du foyer au doigt : focale changée (110 → ' + Math.round(f2) + ')', Math.abs(f2 - 198) < 8, f2);
    verifier('Glisser : les rayons sont recalculés', avant !== apres);
    // translation par le corps, puis Échap pendant le glisser : retour à la place de départ
    const pos0 = await ev(o, `OGW.app.scene.objetsDuType('lmc')[0].a1x`);
    await doigt(o, 'touchStart', lx, ly); await pause(40);
    for (let k = 1; k <= 5; k++) { await doigt(o, 'touchMove', lx - 12 * k, ly); await pause(40); }
    const pendant = await ev(o, `OGW.app.scene.objetsDuType('lmc')[0].a1x`);
    await touche(o, 'Escape', 'Escape', 27);
    await doigt(o, 'touchEnd'); await pause(100);
    const pos1 = await ev(o, `OGW.app.scene.objetsDuType('lmc')[0].a1x`);
    verifier('Glisser l’objet lui-même : translation en direct', pendant < pos0 - 20, {pos0, pendant});
    verifier('Échap pendant un glisser : l’objet revient à sa place (écart voulu à OptGeo)', Math.abs(pos1 - pos0) < 1e-9, {pos0, pos1});
    // rotation par le disque rouge du miroir plan
    await ev(o, `(OGW.app.selectionner(OGW.app.scene.objetsDuType('miroirplan')[0].id),true)`); await ev(o, `__image()`);
    const [rx, ry] = await ev(o, `(()=>{const h=OGW.Poignees.liste(OGW.app.scene,OGW.app.selection).find(h=>h.nom==='rot1');return __ecran(h.x,h.y)})()`);
    await doigt(o, 'touchStart', rx, ry); await pause(40);
    for (let k = 1; k <= 5; k++) { await doigt(o, 'touchMove', rx + 15 * k, ry); await pause(40); }
    await doigt(o, 'touchEnd'); await pause(120);
    const mp = await ev(o, `(()=>{const m=OGW.app.scene.objetsDuType('miroirplan')[0];return {l:Math.hypot(m.a2x-m.a1x,m.a2y-m.a1y),dx:m.a2x-m.a1x}})()`);
    verifier('E02 : rotation par le disque rouge, longueur conservée (400)', Math.abs(mp.l - 400) < 1e-3 && Math.abs(mp.dx) > 5, mp);

    // 7. Propriétés : focale changée dans le panneau
    await ev(o, `(OGW.app.selectionner(OGW.app.scene.objetsDuType('lmc')[0].id),true)`);
    const [pbx, pby] = await ev(o, `(OGW.app.majInterface(),__centre('[data-ctx=proprietes]'))`); await tap(pbx, pby);
    verifier('Propriétés : panneau « Propriétés de cette lentille convergente »', /Propriétés de cette lentille convergente/.test(await ev(o, `document.getElementById('panneau-titre').textContent`)));
    await ev(o, `(()=>{const l=[...document.querySelectorAll('#panneau-corps .champ')].find(c=>/Focale/.test(c.textContent));l.querySelector('input').value='150,5';[...document.querySelectorAll('#panneau-pied button')].find(b=>/Valider/.test(b.textContent)).click();return true})()`);
    verifier('Propriétés : focale 150,5 (virgule acceptée) appliquée, panneau fermé', await ev(o, `Math.abs(OGW.app.scene.objetsDuType('lmc')[0].focale-150.5)<1e-9 && document.getElementById('panneau').hidden`));
    await ev(o, `(OGW.app.ouvrirProprietes(OGW.app.scene.objetsDuType('lmc')[0].id),true)`);
    await ev(o, `(()=>{const l=[...document.querySelectorAll('#panneau-corps .champ')].find(c=>/Focale/.test(c.textContent));l.querySelector('input').value='abc';[...document.querySelectorAll('#panneau-pied button')].find(b=>/Valider/.test(b.textContent)).click();return true})()`);
    verifier('Propriétés : valeur illisible signalée sous le champ, panneau resté ouvert', await ev(o, `!document.getElementById('panneau').hidden && !!document.querySelector('#panneau .erreur-champ:not([hidden])')`));
    await ev(o, `(OGW.app.fermerPanneau(),true)`);
    // panneau de chaque type d'objet présent : s'ouvre et se valide sans changement
    const panneaux = await ev(o, `(()=>{const r=[];for(const ob of OGW.app.scene.objets){const avant=JSON.stringify(OGW.app.scene.parametres(ob.id));
      OGW.app.ouvrirProprietes(ob.id);const t=document.getElementById('panneau-titre').textContent;
      [...document.querySelectorAll('#panneau-pied button')].find(b=>/Valider/.test(b.textContent)).click();
      const ouvert=!document.getElementById('panneau').hidden;OGW.app.fermerPanneau();
      r.push({type:ob.type,t,ouvert});}return r;})()`);
    verifier('Propriétés : le panneau de chaque objet créé s’ouvre et se valide (' + panneaux.length + ' objets)', panneaux.every(p => !p.ouvert && p.t), panneaux.filter(p => p.ouvert));

    // 8. Annuler / rétablir
    await touche(o, 'z', 'KeyZ', 90, 2);
    const f3 = await ev(o, `OGW.app.scene.objetsDuType('lmc')[0].focale`);
    await touche(o, 'y', 'KeyY', 89, 2);
    const f4 = await ev(o, `OGW.app.scene.objetsDuType('lmc')[0].focale`);
    verifier('Ctrl+Z puis Ctrl+Y : focale 150,5 annulée puis rétablie', Math.abs(f3 - 150.5) > 1e-6 && Math.abs(f4 - 150.5) < 1e-9, {f3, f4});
    const nAvant = await ev(o, `OGW.app.scene.objets.length`);
    await ev(o, `(OGW.app.supprimer(OGW.app.scene.objetsDuType('prisme')[0].id),true)`);
    const nSuppr = await ev(o, `OGW.app.scene.objets.length`);
    await ev(o, `(document.querySelector('[data-action=annuler]').click(),true)`);
    const nAnnule = await ev(o, `OGW.app.scene.objets.length`);
    await ev(o, `(document.querySelector('[data-action=refaire]').click(),true)`);
    const nRefait = await ev(o, `OGW.app.scene.objets.length`);
    verifier('Annuler / rétablir (Ctrl+Z, Ctrl+Y, boutons) : suppression annulée puis refaite', nSuppr === nAvant - 1 && nAnnule === nAvant && nRefait === nAvant - 1, {nAvant, nSuppr, nAnnule, nRefait, f3, f4});
    await ev(o, `(document.querySelector('[data-action=annuler]').click(),true)`);

    // 9. Dupliquer, grouper
    await ev(o, `(OGW.app.selectionner(OGW.app.scene.objetsDuType('ecran')[0].id),true)`);
    await touche(o, 'd', 'KeyD', 68, 2);
    verifier('Ctrl+D : écran dupliqué et décalé, copie sélectionnée', await ev(o, `(()=>{const e=OGW.app.scene.objetsDuType('ecran');return e.length===2&&OGW.app.selection===e[1].id&&e[1].a1x!==e[0].a1x})()`));
    await ev(o, `(OGW.app.selection=null,OGW.app.changerMode('grouper'),true)`);
    for (const t of ['sphere', 'rayon']) {
      const [gx, gy] = await ev(o, `(()=>{const r=OGW.Poignees.reference(OGW.app.scene,OGW.app.scene.objetsDuType('${t}')[0].id);return __ecran(r.x,r.y)})()`);
      await tap(gx, gy);
    }
    await ev(o, `([...document.querySelectorAll('#bandeau-boutons button')].find(b=>/Terminer/.test(b.textContent)).click(),true)`);
    verifier('E10 : mode Grouper, deux éléments touchés, groupe créé', await ev(o, `OGW.app.scene.groupes.length===1&&OGW.app.scene.groupes[0].membres.length===2`));
    await ev(o, `(document.querySelector('.dialogue .pied button').click(),true)`);

    // 10. Enregistrer (Ctrl+S) puis rouvrir : .opt identique
    await ev(o, `(OGW.app.scene.commentaire='Essai de commentaire\\nsur deux lignes.',true)`);
    await touche(o, 's', 'KeyS', 83, 2);
    await ev(o, `__attendre(()=>document.querySelector('.dialogue input'))`);
    await ev(o, `(()=>{document.querySelector('.dialogue input').value='essai interface';[...document.querySelectorAll('.dialogue .pied button')].find(b=>/Enregistrer/.test(b.textContent)).click();return true})()`);
    await pause(1200);
    const tele = await ev(o, `window.__telechargements.map(t=>({nom:t.nom,taille:t.taille,texte:t.texte}))`);
    const opt = tele.find(t => t.nom === 'essai interface.opt'), txt = tele.find(t => t.nom === 'essai interface.txt');
    verifier('Ctrl+S : téléchargement de « essai interface.opt » et du commentaire .txt', opt && opt.texte && txt && /deux lignes/.test(txt.texte), tele.map(t => t.nom));
    verifier('Fichier .opt au format d’OptGeo (VERSION 301, fins de ligne CRLF)', opt && /^NE PAS MODIFIER CE FICHIER\r\nVERSION\r\n301/.test(opt.texte));
    const relu = await ev(o, `(()=>{const t=window.__telechargements.find(x=>x.nom==='essai interface.opt').texte;const avantObj=OGW.app.scene.objets.length,avantGr=OGW.app.scene.groupes.length;
      OGW.app.ouvrirTexteOpt(t,'essai interface.opt','');OGW.app.fermerPanneau();return {identique:OptGeo.ecrireOpt(OGW.app.scene)===t,objets:OGW.app.scene.objets.length===avantObj,groupes:OGW.app.scene.groupes.length===avantGr};})()`);
    verifier('Rouvrir le .opt enregistré : simulation identique (même fichier réécrit, mêmes objets et groupes)', relu.identique && relu.objets && relu.groupes, relu);

    // 11. Reprise après rechargement (avec une image de fond, qui reste sur l'appareil)
    await ev(o, `(async()=>{const c=document.createElement('canvas');c.width=40;c.height=30;const x=c.getContext('2d');x.fillStyle='#ffe0a0';x.fillRect(0,0,40,30);
      OGW.app.definirImageFond(c.toDataURL('image/png'));await __attendre(()=>OGW.app.imageFond);await __image();return true})()`);
    verifier('O06 : image de fond chargée et dessinée', await ev(o, `!!OGW.app.imageFond && OGW.app.imageFond.naturalWidth===40`));
    const signature = await ev(o, `OptGeo.ecrireOpt(OGW.app.scene)`);
    await ev(o, `(OGW.app.sauvegarderLocal(),setTimeout(()=>location.reload(),10),true)`); await pause(1500);
    await ev(o, OUTILS);
    verifier('Rechargement : « Reprendre le travail en cours ? »', await ev(o, `__attendre(()=>document.querySelector('.dialogue h2')&&document.querySelector('.dialogue h2').textContent==='Reprendre le travail en cours ?')`));
    await ev(o, `([...document.querySelectorAll('.dialogue .pied button')].find(b=>/Reprendre/.test(b.textContent)).click(),true)`);
    verifier('Reprise : la même simulation est retrouvée', await ev(o, `OptGeo.ecrireOpt(OGW.app.scene)`) === signature);
    verifier('Reprise : l’image de fond est retrouvée (sauvegarde locale)', await ev(o, `__attendre(()=>OGW.app.imageFond&&OGW.app.imageFond.naturalWidth===40)`));
    await ev(o, `(window.print=()=>{window.__imprime=document.querySelectorAll('#impression svg').length},OGW.app.imprimer(),true)`);
    verifier('Imprimer : le dessin (SVG) est préparé pour l’impression du navigateur', await ev(o, `window.__imprime===1`));
    await ev(o, `(OGW.app.definirImageFond(null),true)`);

    // 12. Zoom à deux doigts, molette
    const z0 = await ev(o, `OGW.app.dessinateur.zoom`);
    const [cx, cy] = await ev(o, `__centre('#dessin')`);
    await o.c.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: cx - 40, y: cy, id: 1}, {x: cx + 40, y: cy, id: 2}]}, o.s);
    for (let k = 1; k <= 6; k++) { await o.c.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: cx - 40 - 15 * k, y: cy, id: 1}, {x: cx + 40 + 15 * k, y: cy, id: 2}]}, o.s); await pause(30); }
    await o.c.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}, o.s); await pause(100);
    const z1 = await ev(o, `OGW.app.dessinateur.zoom`);
    verifier('Zoom à deux doigts : ×' + (z1 / z0).toFixed(2) + ' (écart des doigts 80 → 260 px : ×3,25 attendu)', Math.abs(z1 / z0 - 3.25) < 0.05, {z0, z1});
    verifier('Zoom à deux doigts : aucun objet modifié', await ev(o, `OptGeo.ecrireOpt(OGW.app.scene)`) === signature);
    await o.c.send('Input.dispatchMouseEvent', {type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: 300}, o.s); await pause(100);
    const z2 = await ev(o, `OGW.app.dessinateur.zoom`);
    verifier('Molette : zoom réduit', z2 < z1, {z1, z2});
    await ev(o, `(document.querySelector('[data-action=toutvoir]').click(),true)`);

    // 13. Exports PNG et SVG
    await ev(o, `(window.__telechargements=[],OGW.app.exporterPNG('essai.png'),OGW.app.exporterSVG('essai.svg'),true)`);
    await pause(1500);
    const ex = await ev(o, `window.__telechargements.map(t=>({nom:t.nom,taille:t.taille,octets:t.octets,debut:t.texte&&t.texte.slice(0,60),chemins:t.texte?(t.texte.match(/<path/g)||[]).length:0}))`);
    const png = ex.find(t => t.nom === 'essai.png'), svg = ex.find(t => t.nom === 'essai.svg');
    verifier('Export PNG non vide (' + (png && png.taille) + ' octets, signature PNG)', png && png.taille > 5000 && png.octets && png.octets[1] === 80 && png.octets[2] === 78, png);
    verifier('Export SVG (' + (svg && svg.chemins) + ' tracés)', svg && /^<\?xml/.test(svg.debut) && svg.chemins > 20, svg);
    const pngDim = await ev(o, `(async()=>{const c=OGW.canevasExport(OGW.app.scene,null,1000,2);const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=40)if(d[i]<200||d[i+1]<200||d[i+2]<200)n++;return {w:c.width,h:c.height,n};})()`);
    verifier('Export PNG : 2000 pixels de large, dessin présent', pngDim.w === 2000 && pngDim.n > 500, pngDim);
    const svgValide = await ev(o, `(()=>{const t=OGW.svgExport(OGW.app.scene,null,'x');const d=new DOMParser().parseFromString(t,'image/svg+xml');return !d.querySelector('parsererror')&&d.documentElement.nodeName==='svg'})()`);
    verifier('Export SVG : document XML bien formé', svgValide);

    // 13 bis. Menu « Ajouter » : chaque type d'objet créé par coordonnées (panneau pré-rempli, Valider)
    await ev(o, `(OGW.app.nouvelleSimulation({xxmin:0,xxmax:1000,yymin:0,yymax:700}),true)`);
    const ajouts = await ev(o, `(async()=>{const r=[];const items=[...document.querySelectorAll('#menu .item')];
      const debut=items.findIndex(b=>b.textContent==='Miroir plan');
      for(const b of items.slice(debut)){if(/Commentaire|fantômes/.test(b.textContent))continue;if(b.closest('section').querySelector('h2').textContent!=='Ajouter (par coordonnées)')break;
        const n=OGW.app.scene.objets.length;b.click();await new Promise(r=>setTimeout(r,30));
        const titre=document.getElementById('panneau-titre').textContent;
        const v=[...document.querySelectorAll('#panneau-pied button')].find(x=>/Valider/.test(x.textContent));if(v)v.click();
        const err=(document.querySelector('#panneau:not([hidden]) .erreur-generale:not([hidden])')||{}).textContent||'';
        const champ=[...document.querySelectorAll('#panneau:not([hidden]) .erreur-champ:not([hidden])')].map(e=>e.textContent).join(' ');
        r.push({nom:b.textContent,titre,cree:OGW.app.scene.objets.length===n+1,err,champ});OGW.app.fermerPanneau();
        if(OGW.app.scene.objets.length>n){const d=OGW.app.scene.objets[OGW.app.scene.objets.length-1];OGW.app.scene.supprimer(d.id);}}
      return r;})()`);
    verifier('Menu Ajouter : ' + ajouts.length + ' types d’objets créés par coordonnées (panneau « Ajout d’… » puis Valider)', ajouts.length >= 24 && ajouts.every(a => a.cree && /^Ajout d’/.test(a.titre)), ajouts.filter(a => !a.cree || !/^Ajout/.test(a.titre)));

    // 13 ter. Toutes les commandes du menu et des options s'ouvrent sans erreur
    await ouvrir('dispersion_prisme.opt');
    const menus = await ev(o, `(async()=>{const r=[];const items=[...document.querySelectorAll('#menu .item')].filter(b=>!/Licence|Utiliser|Aide d’OptGeo|Imprimer|Ajouter/.test(b.textContent)&&b.closest('section').querySelector('h2').textContent!=='Ajouter (par coordonnées)');
      for(const b of items){const err0=window.__erreurs||0;let ok=true;try{b.click();await new Promise(r=>setTimeout(r,40));}catch(e){ok=false;}
        const ouvert=document.querySelector('.dialogue h2')?document.querySelector('.dialogue h2').textContent:(!document.getElementById('panneau').hidden?document.getElementById('panneau-titre').textContent:'');
        while(document.querySelector('.dialogue'))OGW.fermerDernierDialogue();OGW.app.fermerPanneau();if(OGW.app.mode!=='selection')OGW.app.terminerMode();
        r.push({t:b.textContent,ok,ouvert});}return r;})()`);
    verifier('Menu : ' + menus.length + ' commandes essayées sans exception', menus.every(m => m.ok) && !o.journal.erreurs.length, [menus.filter(m => !m.ok), o.journal.erreurs]);
    const attendus = ['Nouvelle simulation', 'Ouvrir un exemple d’OptGeo', 'Superposer un exemple', 'Enregistrer la simulation', 'Exporter le dessin', 'Modifier l’espace de travail',
      'Préférences : propriétés par défaut à la création', 'Propriétés de la grille', 'Options pour le tracé des normales aux dioptres et miroirs', 'Coordonnées des segments',
      'Fond de la simulation', 'Indices du milieu ambiant et longueurs d’onde', 'Propriétés de l’empennage des rayons', 'Pour le tracé des surfaces d’onde', 'À propos d’OptGeo web'];
    const vus = menus.map(m => m.ouvert);
    verifier('Menu : les fenêtres annexes s’ouvrent (' + attendus.length + ')', attendus.every(a => vus.some(v => v && v.startsWith(a))), attendus.filter(a => !vus.some(v => v && v.startsWith(a))));
    // fantômes : toucher un segment le cache
    await ouvrir('michelson1.opt');
    await ev(o, `(OGW.panneauFantomes(OGW.app),true)`); await ev(o, `__image()`);
    const seg = await ev(o, `(()=>{const s=OGW.app.scene.tracer().segments[3];return __ecran((s.a1x+s.a2x)/2,(s.a1y+s.a2y)/2)})()`);
    await tap(seg[0], seg[1]);
    const fant = await ev(o, `OGW.app.scene.options.listefantomes`);
    verifier('O10 : toucher le segment 4 l’ajoute aux fantômes (' + fant + ')', /\b4\b/.test(fant), fant);
    await ev(o, `([...document.querySelectorAll('#panneau-pied button')].find(b=>/Valider/.test(b.textContent)).click(),true)`);
    verifier('O10 : segments fantômes gardés après Valider', await ev(o, `OGW.app.scene.options.fantomespresents && /4/.test(OGW.app.scene.options.listefantomes)`));
    // superposer : groupe créé
    const nAv = await ev(o, `OGW.app.scene.objets.length`);
    await ev(o, `(OGW.superposerTexte(OGW.app,OPTGEO_EXEMPLES.find(x=>x.fichier.endsWith('miroir_plan.opt')).opt),true)`);
    await ev(o, `([...document.querySelectorAll('.dialogue .pied button')].find(b=>b.textContent==='Non').click(),true)`);
    verifier('F04 : superposer une simulation : objets ajoutés et réunis dans un groupe', await ev(o, `OGW.app.scene.objets.length>${nAv}&&OGW.app.scene.groupes.length>=1`));
    await ev(o, `(()=>{while(document.querySelector('.dialogue'))OGW.fermerDernierDialogue();return true})()`);
    verifier('Chrome : aucune erreur JavaScript dans les menus', !o.journal.erreurs.length && !o.journal.console.length, [o.journal.erreurs, o.journal.console]);

    // 13 quater. Tous les autres outils de la palette, au doigt (avec leurs petites boîtes)
    await ev(o, `(OGW.app.nouvelleSimulation({xxmin:0,xxmax:1000,yymin:0,yymax:700}),true)`); await ev(o, `__image()`);
    const valider = () => ev(o, `(async()=>{await __attendre(()=>document.querySelector('.dialogue .pied button.principal'));document.querySelector('.dialogue .pied button.principal').click();await __image();return true})()`);
    const pts = async (l) => { for (const [x, y] of l) await point(x, y); };
    await outil('miroirs', 'lsr'); await pts([[520, 600], [600, 660]]);
    await outil('miroirs', 'mscopa'); await pts([[50, 560], [50, 500], [120, 530]]);
    await outil('miroirs', 'mscepa'); await pts([[880, 560], [880, 500], [810, 530]]);
    await outil('miroirs', 'mscere'); await pts([[880, 300], [880, 380], [620, 340]]);
    await outil('dioptres', 'lmd'); await pts([[300, 100], [300, 250], [380, 175]]);
    await outil('dioptres', 'lec'); await pts([[500, 300], [540, 300], [700, 300], [340, 300]]);
    verifier('Lentille épaisse : boîte « Diamètre de la lentille »', await ev(o, `(async()=>{await __attendre(()=>document.querySelector('.dialogue h2'));return document.querySelector('.dialogue h2').textContent})()`) === 'Diamètre de la lentille');
    await valider();
    await outil('dioptres', 'polycercle');
    await ev(o, `(async()=>{await __attendre(()=>document.querySelector('.dialogue input'));const i=document.querySelector('.dialogue input');i.value='2';document.querySelector('.dialogue .pied button.principal').click();return true})()`);
    await pause(80);
    await pts([[700, 450], [700, 600]]);
    await ev(o, `(async()=>{await __attendre(()=>document.querySelector('.dialogue .choix-ligne'));const l=document.querySelectorAll('.dialogue .choix-ligne');l[1].querySelector('input[value="1"]').click();document.querySelector('.dialogue .pied button.principal').click();return true})()`);
    await pause(80);
    await pts([[780, 525]]);
    await outil('miroirs', 'coniqueconcave'); await pts([[850, 520], [800, 400], [900, 400], [850, 280]]);
    await outil('sources', 'ondeplane'); await pts([[100, 650], [200, 650], [100, 600]]); await valider();
    await outil('sources', 'sourcevirtuelle'); await pts([[600, 100], [450, 50], [450, 150]]); await valider();
    await outil('divers', 'texte');
    await ev(o, `(async()=>{await __attendre(()=>document.querySelector('.dialogue input[type=text]'));document.querySelector('.dialogue input[type=text]').value='Essai, accentué : É';document.querySelector('.dialogue .pied button.principal').click();return true})()`);
    await pause(80); await pts([[150, 30]]);
    await outil('divers', 'jolipoint'); await valider(); await pts([[60, 60]]);
    await outil('divers', 'angle'); await pts([[400, 400], [500, 400], [450, 480]]);
    await outil('ecrans', 'oeil'); await pts([[950, 100], [900, 100]]);
    await outil('divers', 'fleche'); await pts([[200, 20], [300, 40]]);
    verifier('Trait : le panneau des propriétés s’ouvre après le tracé', await ev(o, `/trait/.test(document.getElementById('panneau-titre').textContent)&&!document.getElementById('panneau').hidden`));
    await ev(o, `(OGW.app.fermerPanneau(),true)`);
    await outil('divers', 'reseau'); await pts([[650, 150], [650, 250]]);
    verifier('Réseau : le panneau des propriétés s’ouvre après le tracé', await ev(o, `/réseau/.test(document.getElementById('panneau-titre').textContent)`));
    await ev(o, `([...document.querySelectorAll('#panneau-pied button')].find(b=>/Valider/.test(b.textContent)).click(),true)`);
    const tous = await ev(o, `(()=>{const r={};OGW.app.scene.objets.forEach(x=>r[x.type]=(r[x.type]||0)+1);return r})()`);
    const voulus = ['lsr', 'mscopa', 'mscepa', 'mscere', 'lmd', 'lec', 'polycercle', 'miroirconique', 'ondeplane', 'sourceponctuelle', 'texte', 'jolipoint', 'angle', 'oeil', 'fleche', 'reseau'];
    verifier('Création au doigt des 16 autres outils (lame, miroirs paraxiaux, convexe réel, divergente, lentille épaisse, polycercle, conique, onde plane, objet virtuel, texte, point, angle, œil, trait, réseau)',
      voulus.every(t => tous[t] === 1), {manquants: voulus.filter(t => tous[t] !== 1), tous});
    verifier('Objet ponctuel virtuel : drapeau « virtuelle » et prolongement (1)', await ev(o, `(()=>{const s=OGW.app.scene.objetsDuType('sourceponctuelle')[0];return !!s&&s.sourcevirtuelle&&s.vav==='(1)'})()`));
    verifier('Polycercle à deux sommets : un arc et un côté droit (lentille plan-convexe)', await ev(o, `(()=>{const p=OGW.app.scene.objetsDuType('polycercle')[0];return !!p&&p.sommets.length===2&&p.rectiligne[0]===false&&p.rectiligne[1]===true})()`));
    verifier('Milieux créés au doigt : indices rouge 1,4 / vert 1,6 / bleu 1,8', await ev(o, `['lec','polycercle'].every(t=>{const p=OGW.app.scene.objetsDuType(t)[0];return p&&p.indicerouge===1.4&&p.indicevert===1.6&&p.indicebleu===1.8})`));
    verifier('Texte accentué conservé', await ev(o, `OGW.app.scene.objetsDuType('texte')[0].texte==='Essai, accentué : É'`));
    await capture(o, path.join(CAPTURES, 'chrome-tous-les-outils.png'));

    // 13 quinquies. Chaque poignée de chaque type d'objet : le glisser modifie l'objet ou est refusé proprement
    await ev(o, `(()=>{for(const t of ['miroirplan','ecran','diaphragme','rayon','sphere','prisme','polyhedre','metre','lmc','mscopa','mscore'])OGW.app.ajouterParCoordonnees(t),[...document.querySelectorAll('#panneau-pied button')].find(b=>/Valider/.test(b.textContent)).click();return true})()`);
    const poig = await ev(o, `(()=>{const s=OGW.app.scene,res={};for(const ob of s.objets.slice()){const t=ob.type;res[t]=res[t]||{n:0,ok:0,refus:0,exc:[]};
      for(const h of OGW.Poignees.liste(s,ob.id)){const etat=s.versJSON();res[t].n++;
        try{const c=OGW.Poignees.demarrer(s,ob.id,h.nom);const avant=JSON.stringify(s.parametres(ob.id));const d=s.options.xxmax/60;
          const r=OGW.Poignees.appliquer(s,c,h.x+d,h.y+d*0.7);if(r.ok&&JSON.stringify(s.parametres(ob.id))!==avant)res[t].ok++;else if(!r.ok&&r.erreur)res[t].refus++;}
        catch(e){res[t].exc.push(h.nom+': '+e.message);}s.restaurer(etat);}}
      return res;})()`);
    const types = Object.keys(poig);
    verifier('Poignées : ' + types.length + ' types, ' + types.reduce((a, t) => a + poig[t].n, 0) + ' poignées essayées sans exception', types.every(t => !poig[t].exc.length), types.filter(t => poig[t].exc.length).map(t => [t, poig[t].exc]));
    verifier('Poignées : chaque type d’objet a des poignées qui le modifient', types.length >= 26 && types.every(t => poig[t].ok > 0), types.filter(t => !poig[t].ok).map(t => [t, poig[t]]));
    verifier('Chrome : aucune erreur JavaScript (outils et poignées)', !o.journal.erreurs.length, o.journal.erreurs);

    // 13 sexies. Autres scénarios de la spécification (SPEC §15)
    // A16 : diaphragme ouvert en direct (poignée du trou), puis Ctrl+Z
    await ouvrir('objet_infini_stigmatisme_approche.opt');
    const a16 = await ev(o, `(()=>{const s=OGW.app.scene,d=s.objetsDuType('diaphragme')[0],n0=s.tracer().segments.length,r0=d.rint;
      const c=OGW.Poignees.demarrer(s,d.id,'a1');const g=s.geometrie(d.id);const r=OGW.Poignees.appliquer(s,c,g.cx+(g.a1x-g.cx)*2.5,g.cy+(g.a1y-g.cy)*2.5);OGW.app.memoriser();
      const n1=s.tracer().segments.length,r1=s.objetsDuType('diaphragme')[0].rint;OGW.app.annuler();
      return {ok:r.ok,n0,n1,r0,r1,r2:OGW.app.scene.objetsDuType('diaphragme')[0].rint};})()`);
    verifier('A16 : bord du trou du diaphragme écarté : rayon intérieur ×2,5, plus de segments ; Ctrl+Z le remet', a16.ok && Math.abs(a16.r1 / a16.r0 - 2.5) < 1e-9 && a16.n1 > a16.n0 && a16.r2 === a16.r0, a16);
    // A21 : miroir parabolique, propriétés : e = 1 ; e = 0,5 donne un miroir elliptique
    await ouvrir('Miroir_Parabolique/stigmatisme_rigoureux.opt');
    await ev(o, `(OGW.app.ouvrirProprietes(OGW.app.scene.objetsDuType('miroirconique')[0].id),true)`);
    const titreP = await ev(o, `document.getElementById('panneau-titre').textContent`);
    await ev(o, `(()=>{const c=[...document.querySelectorAll('#panneau-corps .champ')].find(c=>/Excentricité/.test(c.textContent));c.querySelector('input').value='0,5';[...document.querySelectorAll('#panneau-pied button')].find(b=>/Valider/.test(b.textContent)).click();return true})()`);
    await ev(o, `(OGW.app.ouvrirProprietes(OGW.app.scene.objetsDuType('miroirconique')[0].id),true)`);
    const titreE = await ev(o, `document.getElementById('panneau-titre').textContent`);
    await ev(o, `(OGW.app.fermerPanneau(),true)`);
    verifier('A21 : « Propriétés de ce miroir parabolique », puis elliptique avec e = 0,5', /parabolique/.test(titreP) && /elliptique/.test(titreE), {titreP, titreE});
    // A30 : prisme, le sommet principal fait tourner le prisme autour de G sans changer sa forme
    await ouvrir('dispersion_prisme.opt');
    const a30 = await ev(o, `(()=>{const s=OGW.app.scene,p=s.objetsDuType('prisme')[0],g0=s.geometrie(p.id),av={A:g0.angle_sommet,h:g0.hauteur,gx:g0.gx,gy:g0.gy,t:g0.angle_axe};
      const c=OGW.Poignees.demarrer(s,p.id,'sommet');OGW.Poignees.appliquer(s,c,g0.gx+(g0.ax-g0.gx)*Math.cos(0.3)-(g0.ay-g0.gy)*Math.sin(0.3),g0.gy+(g0.ax-g0.gx)*Math.sin(0.3)+(g0.ay-g0.gy)*Math.cos(0.3));
      const g=s.geometrie(s.objetsDuType('prisme')[0].id);return {dA:g.angle_sommet-av.A,dh:g.hauteur-av.h,dg:Math.hypot(g.gx-av.gx,g.gy-av.gy),dt:g.angle_axe-av.t};})()`);
    verifier('A30 : prisme tourné autour de G (0,3 rad), angle au sommet, hauteur et G conservés', Math.abs(a30.dA) < 1e-9 && Math.abs(a30.dh) < 1e-9 && a30.dg < 1e-9 && Math.abs(Math.abs(a30.dt) - 0.3) < 1e-9, a30);
    // A41 : réseau, propriétés
    await ouvrir('reseau_en_transmission.opt');
    await ev(o, `(OGW.app.ouvrirProprietes(OGW.app.scene.objetsDuType('reseau')[0].id),true)`);
    const a41 = await ev(o, `(()=>{const t=document.getElementById('panneau-corps').textContent,c=[...document.querySelectorAll('#panneau-corps .champ')].find(c=>/traits par mm/.test(c.textContent));
      return {transmission:document.querySelector('#panneau-corps input[type=radio]:checked')&&/En transmission/.test(document.querySelector('#panneau-corps input[type=radio]:checked').parentNode.textContent),traits:c&&c.querySelector('input').value,ordres:/Ordre minimum/.test(t)};})()`);
    await ev(o, `(OGW.app.fermerPanneau(),true)`);
    verifier('A41 : réseau en transmission, traits par mm et ordres affichés', a41.transmission && a41.traits && a41.ordres, a41);
    // O02 : attraction de la grille à la création ; le foyer d'une lentille n'est pas attiré (axe imposé)
    await ev(o, `(OGW.app.nouvelleSimulation({xxmin:0,xxmax:1000,yymin:0,yymax:700}),OGW.app.changerOptions({attractiongrille:true,tracergrille:true,grillex:50,grilley:50},false),true)`);
    await outil('miroirs', 'miroirplan'); await point(312, 207); await point(388, 493);
    const o02 = await ev(o, `(()=>{const m=OGW.app.scene.objetsDuType('miroirplan')[0];return [m.a1x,m.a1y,m.a2x,m.a2y]})()`);
    verifier('O02 : attraction, extrémités du miroir sur les nœuds de la grille (300, 200) et (400, 500)', o02.every(v => Math.abs(v / 50 - Math.round(v / 50)) < 1e-9), o02);
    // E03 / E04 : alignement horizontal à la création (bouton du bandeau)
    await outil('miroirs', 'miroirplan'); await point(600, 100);
    await ev(o, `([...document.querySelectorAll('#bandeau-boutons button')].find(b=>/horizontalement/.test(b.textContent)).click(),true)`);
    await point(800, 160);
    const e04 = await ev(o, `(()=>{const m=OGW.app.scene.objetsDuType('miroirplan')[1];return m?[m.a1y,m.a2y]:null})()`);
    verifier('E04 : « Aligner horizontalement » : deux points sur une même horizontale', e04 && e04[0] === e04[1], e04);
    await ev(o, `(OGW.app.verrouH=false,OGW.app.changerOptions({attractiongrille:false},false),true)`);
    // E08 : supprimer tout, puis annuler ; E11 : tout grouper puis translater le groupe par « Gr »
    await ev(o, `(OGW.app.supprimerTout(),true)`);
    await ev(o, `([...document.querySelectorAll('.dialogue .pied button')].find(b=>/Tout supprimer/.test(b.textContent)).click(),true)`);
    const vide = await ev(o, `OGW.app.scene.objets.length`);
    await ev(o, `(OGW.app.annuler(),true)`);
    verifier('E08 : « Supprimer tous les éléments » (confirmation) puis Annuler', vide === 0 && await ev(o, `OGW.app.scene.objets.length`) === 2);
    await ev(o, `(OGW.app.toutGrouper(),true)`);
    await ev(o, `([...document.querySelectorAll('.dialogue .pied button')].find(b=>/Oui/.test(b.textContent)).click(),true)`);
    await ev(o, `(OGW.app.changerMode('deplacer'),true)`); await ev(o, `__image()`);
    const [grx, gry] = await ev(o, `(()=>{const c=OGW.app.scene.centre(OGW.app.scene.groupes[0].membres);return __ecran(c.x,c.y)})()`);
    const avG = await ev(o, `OGW.app.scene.objets.map(o=>o.a1x)`);
    await doigt(o, 'touchStart', grx, gry); await pause(40);
    for (let k = 1; k <= 4; k++) { await doigt(o, 'touchMove', grx - 10 * k, gry); await pause(40); }
    await doigt(o, 'touchEnd'); await pause(100);
    const apG = await ev(o, `OGW.app.scene.objets.map(o=>o.a1x)`);
    const dG = apG.map((v, i) => v - avG[i]);
    verifier('E11 : « Grouper tous les éléments » puis la croix « Gr » translate tout le groupe', dG.length === 2 && dG[0] < -20 && Math.abs(dG[0] - dG[1]) < 1e-9, dG);
    await ev(o, `(OGW.app.terminerMode(),true)`);
    // O11 : ajuster automatiquement l'espace de travail
    const o11 = await ev(o, `(()=>{OGW.ajusterEspace(OGW.app);const o=OGW.app.scene.options;return [o.xxmin,o.xxmax,o.yymin,o.yymax].map(v=>Math.round(v))})()`);
    verifier('O11 : espace de travail ajusté autour des objets (' + o11.join(', ') + ')', o11[0] > 0 && o11[1] < 1000 && o11[2] > 0 && o11[3] < 700, o11);
    // G32 : nombre maximal par type
    const g32 = await ev(o, `(()=>{const s=OGW.app.scene;for(let i=s.objetsDuType('metre').length;i<500;i++)s.ajouter('metre',{a1x:s.options.xxmin,a1y:s.options.yymin,a2x:s.options.xxmax,a2y:s.options.yymax});
      const r=OGW.app.ajouterObjet('metre',{a1x:s.options.xxmin,a1y:s.options.yymin,a2x:s.options.xxmax,a2y:s.options.yymax});return r.erreur||'';})()`);
    verifier('G32 : 500 mesures de distance au plus : « Nombre maximal… déjà atteint ! »', /Nombre maximal/.test(g32), g32);
    verifier('Chrome : aucune erreur JavaScript (scénarios)', !o.journal.erreurs.length, o.journal.erreurs);
    await fermer(o);

    // 14. Six tailles d'écran (tactile pour les tablettes et téléphones)
    for (const [w, h] of TAILLES) {
      const tactile = w < 1366;
      const p = await ouvrirOnglet(c, srv.base + '/index.html', w, h, {tactile});
      await ev(p, `localStorage.clear()`); await ev(p, `(setTimeout(()=>location.reload(),5),true)`); await pause(1200);
      await ev(p, OUTILS); await ev(p, DEMARRER);
      await ev(p, `(async()=>{const e=OPTGEO_EXEMPLES.find(x=>x.fichier.endsWith('lentille_convergente_1.opt'));OGW.app.ouvrirTexteOpt(e.opt,'l.opt','');await __image();return true})()`);
      const m = await ev(p, `(()=>{const W=innerWidth,H=innerHeight,de=document.documentElement;
        const deb=[...document.querySelectorAll('#app *')].filter(e=>{if(!e.getClientRects().length)return false;if(e.closest('#volet,#panneau,.loupe,#menu,.popover,.dialogue'))return false;
          const r=e.getBoundingClientRect();return r.width>0&&(r.right>W+1||r.bottom>H+1||r.left<-1||r.top<-1);}).map(e=>e.id||e.className||e.tagName);
        const c=document.getElementById('dessin').getBoundingClientRect();
        const petits=[...document.querySelectorAll('.bouton-barre,.onglet,#vue-boutons button')].filter(b=>b.getClientRects().length).filter(b=>{const r=b.getBoundingClientRect();return r.width<43.5||r.height<43.5}).length;
        return {sw:de.scrollWidth,sh:de.scrollHeight,W,H,deb,cw:c.width,ch:c.height,part:c.width*c.height/(W*H),px:__pixels().n,petits};})()`);
      verifier(`${w}×${h} : pas de défilement de la page`, m.sw <= m.W && m.sh <= m.H, m);
      verifier(`${w}×${h} : rien ne déborde de la fenêtre`, m.deb.length === 0, m.deb.slice(0, 8));
      verifier(`${w}×${h} : zone de dessin ${Math.round(m.cw)}×${Math.round(m.ch)} (${Math.round(m.part * 100)} % de la fenêtre), dessin présent`, m.cw > 200 && m.ch > 150 && m.part > 0.55 && m.px > 30, m);
      verifier(`${w}×${h} : boutons de la barre, de la palette et de la vue d’au moins 44 px`, m.petits === 0, m.petits);
      await capture(p, path.join(CAPTURES, `chrome-${w}x${h}.png`));
      // palette ouverte et panneau des propriétés
      await ev(p, `(document.querySelector('.onglet[data-famille=dioptres]').click(),true)`); await pause(80);
      const vol = await ev(p, `(()=>{const r=document.getElementById('volet').getBoundingClientRect();return {ok:r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&r.width>100}})()`);
      verifier(`${w}×${h} : volet des dioptres dans la fenêtre`, vol.ok, vol);
      await capture(p, path.join(CAPTURES, `chrome-${w}x${h}-palette.png`));
      await ev(p, `(OGW.app.fermerVolets(),OGW.app.ouvrirProprietes(OGW.app.scene.objetsDuType('sourceponctuelle')[0].id),true)`); await pause(80);
      const pan = await ev(p, `(()=>{const r=document.getElementById('panneau').getBoundingClientRect(),c=document.getElementById('panneau-corps');return {ok:r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&r.height>100,defile:c.scrollHeight>c.clientHeight}})()`);
      verifier(`${w}×${h} : panneau des propriétés dans la fenêtre (défilement interne)`, pan.ok, pan);
      await capture(p, path.join(CAPTURES, `chrome-${w}x${h}-proprietes.png`));
      verifier(`${w}×${h} : aucune erreur JavaScript`, !p.journal.erreurs.length && !p.journal.console.length, [p.journal.erreurs, p.journal.console]);
      await fermer(p);
    }

    // 14 bis. Ouverte en file:// (sans serveur) : exemples embarqués, sauvegarde locale
    {
      const p = await ouvrirOnglet(c, 'file://' + path.join(RACINE, 'index.html'), 1024, 768, {tactile: true});
      await pause(1200);
      const r = await ev(p, `(async()=>{while(document.querySelector('.dialogue'))OGW.fermerDernierDialogue();let n=0;for(const e of OPTGEO_EXEMPLES){OGW.app.ouvrirTexteOpt(e.opt,'x.opt','');OGW.app.fermerPanneau();
        await new Promise(r=>requestAnimationFrame(r));if(OGW.app.scene.objets.length&&!OGW.app.erreurDessin)n++;}OGW.app.sauvegarderLocal();return {n,stock:!!localStorage.getItem('optgeo-web:travail')};})()`);
      verifier('file:// : les 56 exemples s’ouvrent sans serveur, sauvegarde locale possible, aucune erreur', r.n === 56 && r.stock && !p.journal.erreurs.length, [r, p.journal.erreurs]);
      await fermer(p);
    }

    // 15. Dans un cadre (comme dans le site : iframe de la taille de la colonne)
    for (const [w, h] of [[340, 560], [984, 620]]) {
      const p = await ouvrirOnglet(c, srv.base + `/tests/cadre.html?w=${w}&h=${h}`, 1100, 760, {tactile: true});
      await pause(1200);
      const m = await ev(p, `(()=>{const W=document.querySelector('iframe').contentWindow,d=W.document;const de=d.documentElement,c=d.getElementById('dessin').getBoundingClientRect();
        return {sw:de.scrollWidth,sh:de.scrollHeight,W:W.innerWidth,H:W.innerHeight,cw:c.width,ch:c.height,plein:!d.querySelector('[data-action=pleinecran]').hidden};})()`);
      verifier(`Cadre ${w}×${h} : l’app remplit le cadre sans défilement, zone de dessin ${Math.round(m.cw)}×${Math.round(m.ch)}`, m.W === w && m.H === h && m.sw <= w && m.sh <= h && m.cw > 150 && m.ch > 150, m);
      verifier(`Cadre ${w}×${h} : pas de bouton plein écran dans le cadre (le site le fournit)`, !m.plein);
      await capture(p, path.join(CAPTURES, `chrome-cadre-${w}x${h}.png`));
      await fermer(p);
    }
  } finally {
    c.quit();
  }
}

/** Événement tactile (un doigt). */
async function doigt(o, type, x, y) {
  await o.c.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y, id: 1}]}, o.s);
}

// ---------------------------------------------------------------- Firefox (WebDriver BiDi)
async function lancerFirefox() {
  if (typeof WebSocket !== 'function') throw new Error('WebSocket absent : Node 22 ou plus, ou « node --experimental-websocket » (Node 20-21)');
  const profil = mkdtempSync(path.join(tmpdir(), 'optgeo-firefox-'));
  writeFileSync(path.join(profil, 'user.js'), ['browser.shell.checkDefaultBrowser", false', 'datareporting.policy.dataSubmissionEnabled", false']
    .map(p => 'user_pref("' + p + ');').join('\n'));
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
    attente.set(i, {res, rej, t: setTimeout(() => { attente.delete(i); rej(new Error('délai dépassé : ' + method)); }, 90000)});
    ws.send(JSON.stringify({id: i, method, params}));
  });
  const session = await send('session.new', {capabilities: {}});
  await send('session.subscribe', {events: ['log.entryAdded']});
  return {
    nom: 'Firefox ' + session.capabilities.browserVersion, send, evenements,
    quit: async () => {
      try { await send('session.end'); } catch (e) { /* déjà fermé */ }
      ws.close(); ff.kill();
      setTimeout(() => { try { rmSync(profil, {recursive: true, force: true}); } catch (e) { /* temporaire */ } }, 1000);
    }
  };
}

async function essaisFirefox(srv) {
  const f = await lancerFirefox();
  const N = f.nom;
  try {
    const {context} = await f.send('browsingContext.create', {type: 'tab'});
    const evf = async (e) => {
      const r = await f.send('script.evaluate', {expression: `(async()=>JSON.stringify(await (${e})))()`, target: {context}, awaitPromise: true, userActivation: true});
      if (r.type === 'exception') throw new Error(r.exceptionDetails.text);
      return JSON.parse(r.result.value);
    };
    const taille = (w, h) => f.send('browsingContext.setViewport', {context, viewport: {width: w, height: h}});
    const aller = async () => { await f.send('browsingContext.navigate', {context, url: srv.base + '/index.html', wait: 'complete'}); await pause(500); };
    await taille(1024, 768);
    await aller();
    await evf(`(localStorage.clear(),true)`); await aller();
    await evf(OUTILS);
    verifier(N + ' : boîte de démarrage', await evf(`!!document.querySelector('.dialogue')`));
    verifier(N + ' : nouvelle simulation vide', await evf(DEMARRER));
    const res = await evf(`(async()=>{const r=[];for(const e of window.OPTGEO_EXEMPLES){const avant=OGW.app.dessinateur.nbDessins;
      OGW.app.ouvrirTexteOpt(e.opt,'x.opt',e.description);OGW.app.fermerPanneau();await __image();
      r.push({f:e.fichier,ok:OGW.app.scene.objets.length>0&&OGW.app.dessinateur.nbDessins>avant&&!OGW.app.erreurDessin&&__pixels().n>30});}return r;})()`);
    verifier(N + ' : les 56 exemples s’ouvrent et se dessinent', res.length === 56 && res.every(r => r.ok), res.filter(r => !r.ok));
    // création à la souris : miroir plan, lentille, source
    await evf(`(OGW.app.nouvelleSimulation({xxmin:0,xxmax:1000,yymin:0,yymax:700}),true)`);
    const clic = async (wx, wy) => {
      const [x, y] = await evf(`__ecran(${wx},${wy})`);
      await f.send('input.performActions', {context, actions: [{type: 'pointer', id: 'souris', parameters: {pointerType: 'mouse'}, actions: [
        {type: 'pointerMove', x: Math.round(x), y: Math.round(y)}, {type: 'pointerDown', button: 0}, {type: 'pointerUp', button: 0}]}]});
      await pause(60);
    };
    const outil = async (fam, id) => { await evf(`(document.querySelector('.onglet[data-famille=${fam}]').click(),true)`); await evf(`(document.querySelector('.outil[data-outil="${id}"]').click(),true)`); await pause(60); };
    await outil('miroirs', 'miroirplan'); await clic(700, 150); await clic(700, 550);
    await outil('dioptres', 'lmc'); await clic(450, 200); await clic(450, 500); await clic(560, 380);
    await outil('sources', 'sourcereelle'); await clic(150, 350); await clic(300, 450); await clic(300, 250);
    await evf(`__attendre(()=>document.querySelector('.dialogue'))`);
    await evf(`(document.querySelector('.dialogue .pied button.principal').click(),true)`);
    await evf(`__image()`);
    const c = await evf(`({m:OGW.app.scene.objetsDuType('miroirplan').length,l:OGW.app.scene.objetsDuType('lmc').length,s:OGW.app.scene.objetsDuType('sourceponctuelle').length,seg:OGW.app.scene.tracer().segments.length,f:(OGW.app.scene.objetsDuType('lmc')[0]||{}).focale})`);
    verifier(N + ' : création à la souris (miroir plan, lentille f ≈ 110, source)', c.m === 1 && c.l === 1 && c.s === 1 && c.seg > 5 && Math.abs(c.f - 110) < 3, c);
    // glisser à la souris d'un foyer
    const [fx, fy] = await evf(`(()=>{OGW.app.selectionner(OGW.app.scene.objetsDuType('lmc')[0].id);const g=OGW.app.scene.geometrie(OGW.app.selection);return __ecran(g.f1x,g.f1y)})()`);
    await evf(`__image()`);
    await f.send('input.performActions', {context, actions: [{type: 'pointer', id: 'souris', parameters: {pointerType: 'mouse'}, actions: [
      {type: 'pointerMove', x: Math.round(fx), y: Math.round(fy)}, {type: 'pointerDown', button: 0},
      {type: 'pointerMove', x: Math.round(fx + 40), y: Math.round(fy), duration: 150}, {type: 'pointerMove', x: Math.round(fx + 80), y: Math.round(fy), duration: 150},
      {type: 'pointerUp', button: 0}]}]});
    await pause(200);
    const f2 = await evf(`OGW.app.scene.objetsDuType('lmc')[0].focale`);
    verifier(N + ' : glisser du foyer à la souris (focale ' + Math.round(f2) + ')', Math.abs(f2 - 110) > 20, f2);
    // au doigt (pointerType « touch » de WebDriver BiDi) : un prisme, puis zoom à deux doigts
    const doigtFF = async (points) => {
      await f.send('input.performActions', {context, actions: [{type: 'pointer', id: 'doigt', parameters: {pointerType: 'touch'}, actions: [
        {type: 'pointerMove', x: Math.round(points[0][0]), y: Math.round(points[0][1])}, {type: 'pointerDown', button: 0},
        ...points.slice(1).map(p => ({type: 'pointerMove', x: Math.round(p[0]), y: Math.round(p[1]), duration: 60})), {type: 'pointerUp', button: 0}]}]});
      await pause(80);
    };
    await outil('dioptres', 'prisme');
    for (const [wx, wy] of [[850, 400], [850, 500], [800, 340]]) { const [x, y] = await evf(`__ecran(${wx},${wy})`); await doigtFF([[x + 20, y + 20], [x + 8, y + 5], [x, y]]); }
    const typeFF = await evf(`({prisme:OGW.app.scene.objetsDuType('prisme').length,type:OGW.app.dernierType})`);
    verifier(N + ' : création au doigt (événements tactiles) d’un prisme', typeFF.prisme === 1 && typeFF.type === 'touch', typeFF);
    const zf0 = await evf(`OGW.app.dessinateur.zoom`);
    const [cxf, cyf] = await evf(`__centre('#dessin')`);
    await f.send('input.performActions', {context, actions: [
      {type: 'pointer', id: 'd1', parameters: {pointerType: 'touch'}, actions: [{type: 'pointerMove', x: Math.round(cxf - 40), y: Math.round(cyf)}, {type: 'pointerDown', button: 0},
        {type: 'pointerMove', x: Math.round(cxf - 70), y: Math.round(cyf), duration: 100}, {type: 'pointerMove', x: Math.round(cxf - 100), y: Math.round(cyf), duration: 100}, {type: 'pointerUp', button: 0}]},
      {type: 'pointer', id: 'd2', parameters: {pointerType: 'touch'}, actions: [{type: 'pointerMove', x: Math.round(cxf + 40), y: Math.round(cyf)}, {type: 'pointerDown', button: 0},
        {type: 'pointerMove', x: Math.round(cxf + 70), y: Math.round(cyf), duration: 100}, {type: 'pointerMove', x: Math.round(cxf + 100), y: Math.round(cyf), duration: 100}, {type: 'pointerUp', button: 0}]}]});
    await pause(150);
    const zf1 = await evf(`OGW.app.dessinateur.zoom`);
    verifier(N + ' : zoom à deux doigts (×' + (zf1 / zf0).toFixed(2) + ', 80 → 200 px : ×2,5 attendu)', Math.abs(zf1 / zf0 - 2.5) < 0.15, {zf0, zf1});
    await evf(`(OGW.app.dessinateur.toutVoir(),true)`);
    const ex = await evf(`(async()=>{window.__telechargements=[];OGW.app.exporterPNG('f.png');OGW.app.exporterSVG('f.svg');await new Promise(r=>setTimeout(r,1500));return window.__telechargements.map(t=>({nom:t.nom,taille:t.taille}))})()`);
    verifier(N + ' : exports PNG et SVG non vides', ex.length === 2 && ex.every(t => t.taille > 3000), ex);
    for (const [w, h] of TAILLES) {
      await taille(w, h); await pause(400);
      const m = await evf(`(async()=>{await __image();const de=document.documentElement,c=document.getElementById('dessin').getBoundingClientRect();return {sw:de.scrollWidth,sh:de.scrollHeight,W:innerWidth,H:innerHeight,cw:c.width,ch:c.height,px:__pixels().n}})()`);
      verifier(`${N} ${w}×${h} : pas de défilement, zone de dessin ${Math.round(m.cw)}×${Math.round(m.ch)}`, m.sw <= m.W && m.sh <= m.H && m.cw > 200 && m.ch > 150 && m.px > 30, m);
      const cap = await f.send('browsingContext.captureScreenshot', {context});
      writeFileSync(path.join(CAPTURES, `firefox-${w}x${h}.png`), Buffer.from(cap.data, 'base64'));
    }
    const erreurs = f.evenements.filter(e => e.method === 'log.entryAdded' && e.params.level === 'error').map(e => e.params.text);
    verifier(N + ' : aucune erreur JavaScript', erreurs.length === 0, erreurs);
  } finally {
    await f.quit();
  }
}

// ---------------------------------------------------------------- lancement
const srv = await servir(RACINE);
try {
  for (const nav of NAVIGATEURS) {
    try { if (nav === 'chrome') await essaisChrome(srv); else await essaisFirefox(srv); }
    catch (e) { console.error(e); echecs.push(nav + ' : exception ' + e.message); }
  }
} finally {
  await srv.close();
}
console.log(`\n${nbOk} contrôle(s) réussi(s), ${echecs.length} échec(s). Captures : ${CAPTURES}`);
if (echecs.length) console.log('Échecs : ' + echecs.join(' | '));
process.exit(echecs.length ? 1 : 0);
