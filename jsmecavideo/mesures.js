// mesures.js — lecture des mesures pour des élèves de collège
//
// - Nombres écrits à la française (virgule décimale) et unités adaptées :
//   mètres et m/s après étalonnage (km et km/jour pour l'animation astronomique),
//   pixels vidéo (px) et px/s sinon (on le dit clairement).
// - Un seul tableau des mesures, affiché dans l'app (étape Graphiques → « Tableau des
//   mesures ») et exporté pour un tableur (CSV : séparateur « ; », virgule décimale,
//   UTF-8 avec BOM, fins de ligne CRLF). Le fichier est créé dans le navigateur et
//   téléchargé sur l'appareil : rien n'est envoyé sur Internet.
// - Vocabulaire unique : « instant t » (compté depuis le premier point), « durée Δt »,
//   « v = d / Δt ». Mêmes décimales partout (data.formats()) : à 1 pixel vidéo près.
//   v est calculée avec le d affiché : refaire d / Δt avec les valeurs affichées redonne v.

// Écrit un nombre avec `decimales` chiffres après la virgule (virgule française)
function nombreFr(valeur, decimales) {
  if (!isFinite(valeur)) return '—';
  let s = Number(valeur).toFixed(decimales);
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1); // pas de « -0,00 »
  return s.replace('.', ',');
}

// Comme nombreFr, avec des espaces entre les milliers (affichage seulement, pas le fichier)
function nombreLisible(valeur, decimales) {
  const s = nombreFr(valeur, decimales);
  const [entier, dec] = s.split(',');
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec !== undefined ? groupe + ',' + dec : groupe;
}

// Unités et décimales à afficher (mêmes règles que le tableau et le fichier)
function unitesMesure() {
  const f = data.formats();
  return { distance: data.getUnite(), vitesse: data.uniteVitesse(), temps: data.libelleTemps(), decD: f.pos, decV: f.v, decPos: f.pos, decT: f.t };
}

// Phrase d'information quand les mesures sont en pixels (pas d'étalonnage)
const MESSAGE_SANS_ETALONNAGE = 'Sans étalonnage : distances en pixels (px), vitesses en px/s. Pour des mètres : étape « 📏 Étalonner » (tes points sont gardés).';
const MESSAGE_DUREES_INEGALES = '⚠️ Les durées Δt entre les points ne sont pas toutes égales : les écarts d ne se comparent pas directement. Compare plutôt les vitesses v = d / Δt.';

// Nom de fichier neutre, tiré du titre de la vidéo (« mesures-balle-lachee-devant-un-mur.csv »)
function nomVideoCourante() {
  if (source === 'webcam') return 'webcam';
  const f = videoCourante();
  if (!f) return 'video';
  return f.titre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Tableau des mesures : en-têtes et lignes (textes déjà écrits à la française)
function tableauMesures(lisible = false) {
  const f = data.formats();
  const num = lisible ? nombreLisible : nombreFr;
  const ud = data.getUnite(), uv = data.uniteVitesse(), ut = data.libelleTemps();
  const plusieurs = data.numMobiles > 1;
  const entetes = (plusieurs ? ['Mobile'] : []).concat(['Point n°', 'Image n°', 'instant t (' + ut + ')', 'x (' + ud + ')', 'y (' + ud + ')',
    'd depuis le point précédent (' + ud + ')', 'durée Δt depuis le point précédent (' + ut + ')', 'v = d / Δt (' + uv + ')']);
  let lignes = [];
  for (let m = 0; m < data.numMobiles; m++) {
    const pts = data.getPositions(m);
    const intervalles = data.getIntervalles(m);
    pts.forEach((p, i) => {
      let cols = (plusieurs ? [String(m + 1)] : []).concat([String(p.numero), String(p.image), num(p.time, f.t),
        num(p.x, f.pos), num(p.y, f.pos)]);
      const iv = i > 0 ? intervalles.find(x => x.a === p.numero) : null;
      if (iv) cols.push(num(iv.d, f.pos), num(iv.duree, f.t), num(iv.v, f.v));
      else cols.push('', '', '');
      lignes.push(cols);
    });
  }
  return { entetes: entetes, lignes: lignes, mobileEnColonne: plusieurs };
}

// Texte de l'échelle, identique partout : « 1 px = 3,01 mm »
function texteEchelle() {
  return calibrator && calibrator.isCalibrated ? calibrator.texteEchelle() : '';
}

// Description des données réelles (pas du réglage courant) : durées Δt observées
function texteDurees() {
  let durees = [];
  for (let m = 0; m < data.numMobiles; m++) durees = durees.concat(data.intervallesBruts(m).map(iv => iv.duree));
  if (durees.length === 0) return 'un seul point par mobile';
  const f = data.formats(), ut = data.libelleTemps();
  const min = Math.min(...durees), max = Math.max(...durees);
  if (data.dureesEgales()) return 'durée Δt entre deux points : ' + nombreFr(min, f.t) + ' ' + ut;
  return 'durées Δt INÉGALES entre les points : de ' + nombreFr(min, f.t) + ' à ' + nombreFr(max, f.t) + ' ' + ut;
}

// Ligne d'en-tête du fichier : vidéo, cadence, durées réelles, échelle
function descriptionMesures() {
  const v = videoCourante();
  const nom = v ? v.titre : 'webcam';
  let cadence;
  if (data.uniteTemps === 'jour') cadence = 'animation : ' + nombreFr(data.dureeImage, 0) + ' jours entre deux images';
  else if (data.instants) cadence = 'webcam : instants mesurés pour chaque image';
  else cadence = nombreFr(1 / data.dureeImage, 0) + ' images/s';
  const echelle = data.echelle
    ? 'échelle : ' + texteEchelle() + ' (' + calibrator.texteLongueur() + ' pour ' + nombreFr(calibrator.pixelDistance, 1) + ' px vidéo)'
    : 'sans étalonnage : distances en pixels vidéo (px)';
  return 'jsMecaVidéo — vidéo : ' + nom + ' — ' + cadence + ' — ' + texteDurees() + ' — ' + echelle +
    ' — instant t compté depuis le premier point';
}

// Construit le texte du fichier CSV (une ligne par point, tous les mobiles)
function construireCSV() {
  const SEP = ';';
  const t = tableauMesures(false);
  let lignes = [descriptionMesures(), ''];
  // Le fichier garde toujours la colonne « Mobile » (même format pour 1 ou plusieurs mobiles)
  const entetes = t.mobileEnColonne ? t.entetes : ['Mobile'].concat(t.entetes);
  lignes.push(entetes.join(SEP));
  t.lignes.forEach(cols => lignes.push((t.mobileEnColonne ? cols : ['1'].concat(cols)).join(SEP)));
  return lignes.join('\r\n') + '\r\n';
}

// Tableau HTML des mesures (étape Graphiques → « Tableau des mesures »)
function afficherTableauMesures(zone) {
  const t = tableauMesures(true);
  zone.innerHTML = '';
  if (!data.dureesEgales()) {
    const alerte = document.createElement('p');
    alerte.className = 'alerte-durees';
    alerte.textContent = MESSAGE_DUREES_INEGALES;
    zone.appendChild(alerte);
  }
  const table = document.createElement('table');
  table.id = 'tableau-mesures';
  const legende = document.createElement('caption');
  legende.className = 'sr-only';
  legende.textContent = 'Mesures : une ligne par point';
  table.appendChild(legende);
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  t.entetes.forEach(e => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = e;
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  t.lignes.forEach(cols => {
    const ligne = document.createElement('tr');
    cols.forEach(c => {
      const td = document.createElement('td');
      td.textContent = c;
      ligne.appendChild(td);
    });
    tbody.appendChild(ligne);
  });
  table.appendChild(tbody);
  zone.appendChild(table);
  return t.lignes.length;
}

// Télécharge le fichier CSV (aucun envoi : le fichier est fabriqué dans le navigateur)
function exporterCSV() {
  if (data.getTotalPointCount() === 0) {
    afficherMessageTemporaire('Aucun point à exporter : pointe d’abord le mobile (étape « 🎯 Pointer »).');
    return;
  }
  let blob = new Blob(['﻿' + construireCSV()], { type: 'text/csv;charset=utf-8' });
  let url = URL.createObjectURL(blob);
  let lien = document.createElement('a');
  lien.href = url;
  lien.download = 'mesures-' + nomVideoCourante() + '.csv';
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  afficherMessageTemporaire('💾 Fichier « ' + lien.download + ' » enregistré : ouvre-le avec un tableur.');
}
