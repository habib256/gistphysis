// mesures.js — lecture des mesures pour des élèves de collège
//
// - Nombres écrits à la française (virgule décimale) et unités adaptées :
//   mètres et m/s après étalonnage, pixels (px) et px/s sinon (on le dit clairement).
// - Export des mesures dans un fichier CSV pour un tableur (LibreOffice Calc…) :
//   séparateur « ; », virgule décimale, UTF-8 avec BOM. Le fichier est créé dans le
//   navigateur et téléchargé sur l'appareil : rien n'est envoyé sur Internet.

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

// Construit le texte du fichier CSV (une ligne par point, tous les mobiles)
function construireCSV() {
  const SEP = ';';
  let lignes = [];
  let echelle = data.echelle
    ? 'échelle : 1 px = ' + nombreFr(data.echelle * 1000, 3) + ' mm'
    : 'sans étalonnage : distances en pixels (px)';
  lignes.push('jsMecaVidéo — vidéo : ' + nomVideoCourante() + ' — ' + echelle);
  lignes.push('');

  let mobiles = [...Array(data.numMobiles).keys()].filter(m => data.getPointCount(m) > 0);
  let unite = data.getUnite();
  let u = unite === 'm'
    ? { d: 'm', v: 'm/s', decPos: 4, decV: 3 }
    : { d: 'px', v: 'px/s', decPos: 1, decV: 1 };

  lignes.push(['Mobile', 'Point n°', 't (s)', 'x (' + u.d + ')', 'y (' + u.d + ')',
    'd depuis le point précédent (' + u.d + ')', 'durée depuis le point précédent (s)',
    'v = d / t (' + u.v + ')'].join(SEP));

  for (let m of mobiles) {
    let pts = data.getPositions(m);
    pts.forEach((p, i) => {
      let cols = [m + 1, p.numero, nombreFr(p.time, 3), nombreFr(p.x, u.decPos), nombreFr(p.y, u.decPos)];
      let prec = pts[i - 1];
      let duree = prec ? p.time - prec.time : 0;
      if (prec && duree > 1e-9) {
        let d = Math.hypot(p.x - prec.x, p.y - prec.y);
        cols.push(nombreFr(d, u.decPos), nombreFr(duree, 3), nombreFr(d / duree, u.decV));
      } else {
        cols.push('', '', '');
      }
      lignes.push(cols.join(SEP));
    });
  }
  return lignes.join('\r\n') + '\r\n';
}

// Télécharge le fichier CSV (aucun envoi : le fichier est fabriqué dans le navigateur)
function exporterCSV() {
  if (data.getTotalPointCount() === 0) {
    afficherMessageTemporaire('Aucun point à exporter : pointe d’abord le mobile (étape « 🎯 Pointer »).');
    return;
  }
  let blob = new Blob(['\uFEFF' + construireCSV()], { type: 'text/csv;charset=utf-8' });
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
