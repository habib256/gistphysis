// mesures.js — lecture des mesures pour des élèves de collège
//
// - Nombres écrits à la française (virgule décimale) et unités adaptées :
//   mètres et m/s après étalonnage, pixels vidéo (px) et px/s sinon (on le dit clairement).
// - Un seul tableau des mesures, affiché dans l'app (étape Graphiques → « Tableau des
//   mesures ») et exporté pour un tableur (CSV : séparateur « ; », virgule décimale,
//   UTF-8 avec BOM, fins de ligne CRLF). Le fichier est créé dans le navigateur et
//   téléchargé sur l'appareil : rien n'est envoyé sur Internet.
// - Vocabulaire unique : « instant t » (compté depuis le premier point), « durée Δt »,
//   « v = d / Δt ». Décimales réglées sur la finesse réelle de la mesure (1 pixel vidéo).

// Écrit un nombre avec `decimales` chiffres après la virgule (virgule française)
function nombreFr(valeur, decimales) {
  if (!isFinite(valeur)) return '—';
  let s = Number(valeur).toFixed(decimales);
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1); // pas de « -0,00 »
  return s.replace('.', ',');
}

// Unités et nombre de décimales à afficher selon l'unité des positions ('m' ou 'px')
function unitesMesure(unite) {
  if (unite === 'm') {
    return { distance: 'm', vitesse: 'm/s', decD: 3, decV: 2, decPos: 3 };
  }
  return { distance: 'px', vitesse: 'px/s', decD: 1, decV: 0, decPos: 1 };
}

// Phrase d'information quand les mesures sont en pixels (pas d'étalonnage)
const MESSAGE_SANS_ETALONNAGE = 'Sans étalonnage, les distances sont en pixels (px) et les vitesses en px/s, pas en mètres. ' +
  'Pour des mètres : étape « 📏 Étalonner » (tes points sont gardés).';

// Nom du fichier de la vidéo courante (sans dossier ni extension)
function nomVideoCourante() {
  if (source === 'webcam') return 'webcam';
  let f = videoCourante();
  if (f) return f.path.replace('videos/', '').replace(/\.[a-z0-9]+$/i, '');
  return 'video';
}

// Décimales utiles pour une grandeur dont la plus petite variation mesurable vaut `pas`
function decimalesUtiles(pas, max = 6) {
  if (!(pas > 0)) return 0;
  return Math.max(0, Math.min(max, Math.ceil(-Math.log10(pas) - 1e-9)));
}

// Tableau des mesures : en-têtes et lignes (textes déjà écrits à la française)
function tableauMesures() {
  const unite = data.getUnite();
  const pasPos = data.echelle || 1;                       // 1 pixel vidéo, en m ou en px
  const dureeType = Math.max(imagesParPoint, 1) / data.framerate;
  const decPos = decimalesUtiles(pasPos);
  const decV = decimalesUtiles(pasPos / dureeType);
  const ud = unite === 'm' ? 'm' : 'px', uv = unite === 'm' ? 'm/s' : 'px/s';
  const plusieurs = data.numMobiles > 1;
  const entetes = (plusieurs ? ['Mobile'] : []).concat(['Point n°', 'Image n°', 'instant t (s)', 'x (' + ud + ')', 'y (' + ud + ')',
    'd depuis le point précédent (' + ud + ')', 'durée Δt depuis le point précédent (s)', 'v = d / Δt (' + uv + ')']);
  let lignes = [];
  for (let m = 0; m < data.numMobiles; m++) {
    const pts = data.getPositions(m);
    pts.forEach((p, i) => {
      let cols = (plusieurs ? [String(m + 1)] : []).concat([String(p.numero), String(p.image), nombreFr(p.time, 3),
        nombreFr(p.x, decPos), nombreFr(p.y, decPos)]);
      const prec = pts[i - 1];
      const duree = prec ? p.time - prec.time : 0;
      if (prec && duree > 1e-9) {
        const d = Math.hypot(p.x - prec.x, p.y - prec.y);
        cols.push(nombreFr(d, decPos), nombreFr(duree, 3), nombreFr(d / duree, decV));
      } else {
        cols.push('', '', '');
      }
      lignes.push(cols);
    });
  }
  return { entetes: entetes, lignes: lignes, mobileEnColonne: plusieurs };
}

// Ligne d'en-tête du fichier : vidéo, fréquence, pas de pointage, échelle
function descriptionMesures() {
  const v = videoCourante();
  const nom = v ? v.titre + ' (' + v.path.replace('videos/', '') + ')' : 'webcam';
  const fps = data.framerate;
  const pas = imagesParPoint === 1 ? '1 point par image' : '1 point toutes les ' + imagesParPoint + ' images';
  const echelle = data.echelle
    ? 'échelle : 1 px = ' + nombreFr(data.echelle * 1000, 3) + ' mm (' + metresFr(calibrator.realDistance) + ' pour ' + nombreFr(calibrator.pixelDistance, 1) + ' px vidéo)'
    : 'sans étalonnage : distances en pixels vidéo (px)';
  return 'jsMecaVidéo — vidéo : ' + nom + ' — ' + nombreFr(fps, fps % 1 ? 2 : 0) + ' images/s, ' + pas +
    ' — ' + echelle + ' — instant t compté depuis le premier point';
}

// Construit le texte du fichier CSV (une ligne par point, tous les mobiles)
function construireCSV() {
  const SEP = ';';
  const t = tableauMesures();
  let lignes = [descriptionMesures(), ''];
  // Le fichier garde toujours la colonne « Mobile » (même format pour 1 ou plusieurs mobiles)
  const entetes = t.mobileEnColonne ? t.entetes : ['Mobile'].concat(t.entetes);
  lignes.push(entetes.join(SEP));
  t.lignes.forEach(cols => lignes.push((t.mobileEnColonne ? cols : ['1'].concat(cols)).join(SEP)));
  return lignes.join('\r\n') + '\r\n';
}

// Tableau HTML des mesures (étape Graphiques → « Tableau des mesures »)
function afficherTableauMesures(zone) {
  const t = tableauMesures();
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
  zone.innerHTML = '';
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
  afficherMessageTemporaire('💾 Fichier « ' + lien.download + ' » enregistré : ouvre-le avec un tableur (LibreOffice Calc…).');
}
