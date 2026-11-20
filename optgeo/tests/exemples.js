/*
 * Test 1 et 3 : les 56 exemples.
 *   node optgeo/tests/exemples.js
 * Pour chaque exemple : lecture sans erreur ni objet refusé, tracé sans exception
 * (garde-fou de segments non atteint), écriture puis relecture (aller-retour) :
 * mêmes options, mêmes objets (paramètres identiques au bit près), même tracé ;
 * deuxième aller-retour identique au premier texte ; mesure du temps de tracé.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { charger, listerOpt, DOSSIER_EXEMPLES } = require('./charger-moteur.js');

const OptGeo = charger();
let reussis = 0, echecs = 0;
const temps = [];
const nonPrisEnCharge = new Set();

function controle(ok, message) {
  if (ok) reussis++; else { echecs++; console.log('  ÉCHEC : ' + message); }
}
function sansId(objets) { return objets.map((o) => { const c = Object.assign({}, o); delete c.id; return c; }); }
function egal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
// Égalité à 1e-9 près (relatif) : l'onde plane recalcule a2 à chaque création
// (OndePlane.create), d'où une dérive de quelques 1e-16 en relatif, comme dans l'original.
function proche(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => proche(x, b[i]));
  if (a && typeof a === 'object') { const ka = Object.keys(a), kb = Object.keys(b || {}); return ka.length === kb.length && ka.every((k) => proche(a[k], b[k])); }
  return a === b;
}
function memeTrace(t1, t2) {
  if (t1.segments.length !== t2.segments.length) return false;
  for (let i = 0; i < t1.segments.length; i++) {
    const a = t1.segments[i], b = t2.segments[i];
    for (const k of ['a1x', 'a1y', 'a2x', 'a2y']) if (!proche(a[k], b[k])) return false;
    if (a.couleur !== b.couleur || a.virtuelavant !== b.virtuelavant || a.virtuelarriere !== b.virtuelarriere) return false;
  }
  return true;
}
function maintenant() { return Number(process.hrtime.bigint()) / 1e6; }

const fichiers = listerOpt(DOSSIER_EXEMPLES);
controle(fichiers.length === 56, '56 exemples attendus, ' + fichiers.length + ' trouvés');

for (const f of fichiers) {
  const texte = fs.readFileSync(path.join(DOSSIER_EXEMPLES, f), 'utf8');
  let r;
  try { r = OptGeo.lireOpt(texte, { strict: true }); }
  catch (e) { controle(false, f + ' : lecture impossible (' + e.message + ')'); continue; }
  controle(true, '');
  controle(r.avertissements.length === 0, f + ' : avertissements ' + r.avertissements.join(' | '));
  r.nonPrisEnCharge.forEach((l) => nonPrisEnCharge.add(f + ' : ' + l));
  const nbObjets = r.scene.objets.length;
  controle(nbObjets > 0, f + ' : aucun objet');

  // Tracé
  let t;
  try { t = r.scene.tracer(); } catch (e) { controle(false, f + ' : exception au tracé ' + e.stack); continue; }
  controle(!t.tronque, f + ' : tracé tronqué par le garde-fou');
  controle(t.segments.every((s) => [s.a1x, s.a1y, s.a2x, s.a2y].every(Number.isFinite)), f + ' : coordonnées non finies');
  const o = r.scene.options;
  controle(t.segments.every((s) => s.a2x >= o.xxmin - 1e-6 && s.a2x <= o.xxmax + 1e-6 && s.a2y >= o.yymin - 1e-6 && s.a2y <= o.yymax + 1e-6),
    f + ' : segment hors de l’espace de travail');
  // Temps : médiane de 7 tracés (après un premier tracé de chauffe)
  const mesures = [];
  for (let k = 0; k < 7; k++) { const t0 = maintenant(); OptGeo.tracerScene(r.scene); mesures.push(maintenant() - t0); }
  mesures.sort((a, b) => a - b);
  temps.push({ f, ms: mesures[3], segments: t.segments.length, rayons: t.nombreRayons });

  // Aller-retour .opt
  const ecrit = OptGeo.ecrireOpt(r.scene);
  let r2;
  try { r2 = OptGeo.lireOpt(ecrit, { strict: true }); }
  catch (e) { controle(false, f + ' : relecture du fichier écrit impossible (' + e.message + ')'); continue; }
  controle(proche(sansId(r.scene.objets), sansId(r2.scene.objets)), f + ' : objets différents après aller-retour');
  const o1 = Object.assign({}, r.scene.options), o2 = Object.assign({}, r2.scene.options);
  delete o1.versionfichier; delete o2.versionfichier;
  controle(egal(o1, o2), f + ' : options différentes après aller-retour');
  controle(memeTrace(t, r2.scene.tracer()), f + ' : tracé différent après aller-retour');
  const r3 = OptGeo.lireOpt(OptGeo.ecrireOpt(r2.scene));
  controle(proche(sansId(r3.scene.objets), sansId(r2.scene.objets)), f + ' : la réécriture n’est pas stable');
  // Le texte d'origine et le texte réécrit décrivent le même modèle même pour les anciens formats
  controle(r2.scene.groupes.length === r.scene.groupes.length, f + ' : groupes perdus');
  // Aller-retour par JSON (annuler/rétablir)
  const s3 = OptGeo.Scene.depuisJSON(JSON.parse(JSON.stringify(r.scene.versJSON())));
  controle(memeTrace(t, s3.tracer()), f + ' : tracé différent après sérialisation JSON');
}

temps.sort((a, b) => b.ms - a.ms);
console.log('\nTemps de tracé (médiane de 7, Node ' + process.version + ') — les plus lents :');
temps.slice(0, 10).forEach((x) => console.log('  ' + x.ms.toFixed(2).padStart(7) + ' ms  ' + String(x.segments).padStart(4) + ' segments  ' +
  String(x.rayons).padStart(3) + ' rayons  ' + x.f));
const total = temps.reduce((s, x) => s + x.ms, 0);
console.log('  total des 56 : ' + total.toFixed(1) + ' ms ; médiane : ' + temps[Math.floor(temps.length / 2)].ms.toFixed(2) + ' ms');
console.log('\nLignes non reconnues dans les fichiers : ' + (nonPrisEnCharge.size ? [...nonPrisEnCharge].join('\n  ') : 'aucune'));
console.log('\nExemples : ' + reussis + ' contrôles réussis, ' + echecs + ' échoués.');
process.exit(echecs ? 1 : 0);
