/*
 * OptGeo (portage JavaScript) — moteur, partie 3 : tracé des rayons.
 *
 * Portage fidèle de unit222.pas :
 *   - calculesegment0 (lignes 32064–36312) : propagation d'un rayon de surface en
 *     surface (bords de l'espace, miroirs plans, écrans, diaphragmes, lames
 *     semi-réfléchissantes, réseaux en transmission et en réflexion, miroirs
 *     sphériques paraxiaux (troués ou non), lentilles minces, miroirs coniques,
 *     miroirs sphériques réels (troués ou non), œil, sphères, lentilles épaisses,
 *     polyèdres, prismes, polycercles), avec réfraction (Snell-Descartes sous forme
 *     vectorielle), réflexion totale, rayons réfléchis « enfants », ordres des
 *     réseaux, prolongements virtuels (vav/vaa), normales, angles, chemin optique
 *     et surfaces d'onde ;
 *   - sourceponctuelle.calculesegment, ondeplane.calculesegment (32008, 32036) ;
 *   - la partie calcul de Rafraichit (3618) : rayons, sources, ondes planes, file
 *     des rayons enfants, décomposition de la lumière blanche (couleur noire) en
 *     rouge, vert et bleu s'il existe un milieu dispersif ou un réseau, puis
 *     surfaces d'onde.
 *
 * L'ordre des tests, les tolérances (epsilon = 1e-10, décalages de 1/10000 ou
 * 1/1000 de la diagonale), et les particularités de l'original sont conservés
 * (voir docs/MOTEUR.md, « Écarts et doutes »). Les variables locales Pascal qui
 * gardent leur valeur d'une itération à l'autre (lambda, tata, unrefracte,
 * surface_future…) sont des variables de la fonction, comme dans l'original.
 *
 * Résultat de OptGeo.tracerScene(scene) :
 *   { segments:[{a1x,a1y,a2x,a2y,ap,epaisseur,couleur,virtuelavant,virtuelarriere,fantome}],
 *     normales:[{a1x,a1y,a2x,a2y,ap,epaisseur,couleur}],
 *     angles:[{cx,cy,a1x,a1y,a2x,a2y}],          // angles à tracer (option « angles »)
 *     surfacesOnde:[{a1x,a1y,a2x,a2y,couleur}],   // pointillés
 *     nombreRayons, tronque, dureeMs }
 */
(function (racine) {
  'use strict';
  var OptGeo = racine.OptGeo;
  var M = OptGeo.math, C = OptGeo.couleurs, PI = Math.PI;
  var sqr = M.sqr, PiPi = M.donneAnglePolaireDansPiPi, O2Pi = M.donneAnglePolaireDans02Pi;
  var INT = OptGeo.INTERIEUR;
  var clred = C.clRed, clgreen = C.clGreen, clblue = C.clBlue, clblack = C.clBlack;
  var R_TOUJOURS = 1, R_SIREFRACTE = 3, R_SIPASREFRACTE = 4;

  // Types de surface (TSurface)
  var S = {
    bordure: 'bordure', miroirplan: 'miroirplan', mscopa: 'mscopa', mscepa: 'mscepa', lmc: 'lmc', lmd: 'lmd',
    mscore: 'mscore', mscere: 'mscere', ecran: 'ecran', lsr: 'lsr', polyhedre: 'polyhedre', sphere: 'sphere',
    miroirconique: 'miroirconique', diaphragme: 'diaphragme', lec: 'lec', polycercle: 'polycercle',
    oeil: 'oeil', prisme: 'prisme', reseau: 'reseau'
  };

  /**
   * Indice selon la couleur (case couleur of clred/clgreen/clblue).
   * Pour une autre couleur (lumière blanche tracée sans décomposition), l'original
   * laisse la variable non initialisée : on prend l'indice « vert » (voir MOTEUR.md).
   */
  function indiceCouleur(couleur, rouge, vert, bleu) {
    if (couleur === clred) return rouge;
    if (couleur === clblue) return bleu;
    return vert;
  }

  var TYPES_TRACE = ['miroirplan', 'ecran', 'diaphragme', 'lsr', 'reseau', 'mscopa', 'mscepa', 'lmc', 'lmd',
    'miroirconique', 'mscore', 'oeil', 'sphere', 'lec', 'mscere', 'polyhedre', 'prisme', 'polycercle',
    'rayon', 'sourceponctuelle', 'ondeplane'];

  /** Prépare le contexte de tracé : listes de géométries par type. */
  function preparer(scene) {
    var L = {};
    TYPES_TRACE.forEach(function (t) { L[t] = []; });
    scene.objets.forEach(function (o) {
      if (!L[o.type]) return;
      var g = scene.geometrie(o.id);
      if (g) L[o.type].push(g);
    });
    var o = scene.options;
    var dispersif = false;
    ['polyhedre', 'polycercle', 'sphere', 'lec', 'prisme'].forEach(function (t) {
      L[t].forEach(function (g) { if (g.dispersif) dispersif = true; });
    });
    var ctx = scene.contexte();
    return {
      L: L, o: o, ctx: ctx,
      xxmin: o.xxmin, xxmax: o.xxmax, yymin: o.yymin, yymax: o.yymax,
      diag: Math.sqrt(sqr(o.xxmax - o.xxmin) + sqr(o.yymax - o.yymin)),
      dispersif: dispersif,
      segments: [], normales: [], angles: [], surfacesOnde: [],
      enfants: [],
      optionsurfacesonde: false, premierpointsurfacesonde: false, cheminactuelaobtenir: 0,
      interx1: 0, intery1: 0, interx2: 0, intery2: 0,
      limite: OptGeo.constantes.gardeFouSegments, tronque: false, nombreRayons: 0
    };
  }

  /** Indice du milieu de sortie : défaut, puis milieux dans l'ordre donné (le dernier gagne). */
  function indiceMilieu(T, couleur, px, py, ordre) {
    var o = T.o, n = indiceCouleur(couleur, o.indice_rouge_par_defaut, o.indice_vert_par_defaut, o.indice_bleu_par_defaut);
    for (var k = 0; k < ordre.length; k++) {
      var liste = T.L[ordre[k]];
      for (var i = 0; i < liste.length; i++) {
        if (liste[i].estou(px, py) === INT.INTERIEUR)
          n = indiceCouleur(couleur, liste[i].indicerouge, liste[i].indicevert, liste[i].indicebleu);
      }
    }
    return n;
  }
  var ORDRE_STD = ['polycercle', 'polyhedre', 'prisme', 'sphere', 'lec'];
  var ORDRE_SPHERE = ['polycercle', 'polyhedre', 'sphere', 'prisme', 'lec'];

  function creerAngle(cx, cy, a1x, a1y, a2x, a2y) { return { cx: cx, cy: cy, a1x: a1x, a1y: a1y, a2x: a2x, a2y: a2y }; }

  /** reflexion autorisée selon le code « réfléchi » (1 toujours, 3 si réfracté, 4 si pas réfracté). */
  function reflechit(code, unrefracte) {
    return code === R_TOUJOURS || (unrefracte && code === R_SIREFRACTE) || (!unrefracte && code === R_SIPASREFRACTE);
  }

  /**
   * Portage de calculesegment0 : propage un rayon et ajoute ses segments à T.segments
   * (ou, en mode surface d'onde, un morceau de surface d'onde à T.surfacesOnde).
   */
  function calculesegment0(T, ax, ay, kx, ky, anglepolaire, epaisseur, couleur, vav, vaa, nombremaxenfant, maxsegment) {
    var L = T.L, o = T.o;
    var xxmin = T.xxmin, xxmax = T.xxmax, yymin = T.yymin, yymax = T.yymax, diag = T.diag;
    var i, j;
    var bordureatteinte, surfaceabsorbanteatteinte, unrefracte = false;
    var distance, xact, yact, kxact, kyact, anglepolaireact;
    var xfutur = 0, yfutur = 0, kxfutur = 0, kyfutur = 0, anglepolairefutur = 0, anglepolairenormale = 0;
    var lambda = 0, lambda1 = 0, lambda2 = 0, mu = 0, xinter = 0, yinter = 0, incidence = 0, delta = 0;
    var tata = 0, tata1 = 0, tata2 = 0, tati1 = 0, tati2 = 0;
    var surface_actuelle, surface_future, coteactuel, cotefutur, indicesurfaceactuelle, indicesurfacefuture;
    var ffx = 0, ffy = 0, xenfant = 0, yenfant = 0, kxenfant = 0, kyenfant = 0, nnx = 0, nny = 0, agp = 0;
    var enfantsReseau = [];
    var naissance, nombresegment, nombrenaissance;
    var indiceoptiqueactuel, indiceoptiquefutur, patate = 0;
    var aaa, bbb, ccc, xxx1, xxx2, rrr1, rrr2, rrr = 0, xxx, nnnx, nnny;
    var anglepolairenormaleatracer = 0, cheminoptique, cheminsup, distancecentre = 0;
    var normaleatracer, normale2cotes;
    var angleincident = creerAngle(0, 0, 0, 0, 0, 0), anglerefracte = creerAngle(0, 0, 0, 0, 0, 0);
    var incidentatracer, refracteatracer;
    var epsilon = 1e-10, xpact, ypact;
    var longueur_donde;
    var pn = o.pourcentagenormale;

    if (couleur === clred) longueur_donde = o.longueur_donde_red;
    else if (couleur === clblue) longueur_donde = o.longueur_donde_blue;
    else longueur_donde = o.longueur_donde_green;   // vert (et, faute de mieux, autres couleurs)

    var jv = M.jetonsListe(vav), ja = M.jetonsListe(vaa);
    function lvav(n) { return !!jv[String(n)]; }
    function lvaa(n) { return !!ja[String(n)]; }

    cheminoptique = 0;
    bordureatteinte = false; surfaceabsorbanteatteinte = false;
    nombresegment = 0; nombrenaissance = 0; coteactuel = 0; cotefutur = 0;
    indiceoptiqueactuel = indiceCouleur(couleur, o.indice_rouge_par_defaut, o.indice_vert_par_defaut, o.indice_bleu_par_defaut);
    indiceoptiquefutur = indiceoptiqueactuel;
    xact = ax; yact = ay; kxact = kx; kyact = ky; anglepolaireact = anglepolaire;
    surface_actuelle = S.bordure; surface_future = S.bordure;
    indicesurfaceactuelle = 0; indicesurfacefuture = 0;
    incidentatracer = false; refracteatracer = false;

    // Milieu de départ
    L.polycercle.forEach(function (g) { if (g.estou(ax, ay) === INT.INTERIEUR) indiceoptiqueactuel = indiceCouleur(couleur, g.indicerouge, g.indicevert, g.indicebleu); });
    L.polyhedre.forEach(function (g) { if (g.estou(ax, ay) === INT.INTERIEUR) indiceoptiqueactuel = indiceCouleur(couleur, g.indicerouge, g.indicevert, g.indicebleu); });
    L.prisme.forEach(function (g) { if (g.estou(ax, ay) === INT.INTERIEUR) indiceoptiqueactuel = indiceCouleur(couleur, g.indicerouge, g.indicevert, g.indicebleu); });
    L.sphere.forEach(function (g) { if (Math.sqrt(sqr(ax - g.cx) + sqr(ay - g.cy)) < g.rayon) indiceoptiqueactuel = indiceCouleur(couleur, g.indicerouge, g.indicevert, g.indicebleu); });
    L.lec.forEach(function (g) { if (g.estou(ax, ay) === INT.INTERIEUR) indiceoptiqueactuel = indiceCouleur(couleur, g.indicerouge, g.indicevert, g.indicebleu); });

    /* ---- petites aides qui modifient les variables locales, comme le code Pascal ---- */
    // Intersection avec le segment [A,B] ; lambda calculé à partir du point (lax, lay)
    // (identique à A sauf dans un cas de l'original). Renvoie faux si parallèle.
    function seg(Ax, Ay, Bx, By, lax, lay) {
      if ((kyact * (Bx - Ax)) === (kxact * (By - Ay))) return false;
      mu = (kyact * (xact - Ax) - kxact * (yact - Ay)) / (kyact * (Bx - Ax) - kxact * (By - Ay));
      if (Math.abs(kxact) > Math.abs(kyact)) lambda = (mu * (Bx - Ax) + lax - xact) / kxact;
      else lambda = (mu * (By - Ay) + lay - yact) / kyact;
      if (!((mu >= 0) && (mu <= 1) && (lambda > 0))) return false;
      xinter = Ax + mu * (Bx - Ax);
      yinter = Ay + mu * (By - Ay);
      return true;
    }
    // Test « plus proche » des surfaces (distance au point de départ du segment).
    function plusProche() {
      var d = Math.sqrt(sqr(xinter - xpact) + sqr(yinter - ypact));
      if ((d < distance * (1 - epsilon)) && (d > diag * epsilon)) { distance = d; return true; }
      return false;
    }
    function normInc() {
      if (incidence > PI) incidence = incidence - 2 * PI;
      if (incidence < -PI) incidence = incidence + 2 * PI;
    }
    function normFutur() {
      if (anglepolairefutur > PI) anglepolairefutur = anglepolairefutur - 2 * PI;
      if (anglepolairefutur < -PI) anglepolairefutur = anglepolairefutur + 2 * PI;
    }
    function dans(t, a, b) { return (t >= a && t <= b) || (t + 2 * PI >= a && t + 2 * PI <= b); }
    function dans3(t, a, b) { return dans(t, a, b) || (t - 2 * PI >= a && t - 2 * PI <= b); }
    // Intersection avec un arc de cercle (centre, rayon, test d'angle). Laisse lambda/tata
    // inchangés quand l'original ne les recalcule pas (cas delta = 0).
    function arc(cx, cy, R, test) {
      delta = 4 * sqr(kxact * (xact - cx) + kyact * (yact - cy)) - 4 *
        (sqr(kxact) + sqr(kyact)) * (sqr(xact - cx) + sqr(yact - cy) - sqr(R));
      if (!(delta >= 0)) return false;
      if (delta === 0) lambda = (kxact * (xact - cx) + kyact * (yact - cy)) / (sqr(kxact) + sqr(kyact));
      else {
        lambda1 = (-2 * (kxact * (xact - cx) + kyact * (yact - cy)) + Math.sqrt(delta)) / 2 / (sqr(kxact) + sqr(kyact));
        tata1 = O2Pi(lambda1 * kxact + xact - cx, lambda1 * kyact + yact - cy);
        lambda2 = (-2 * (kxact * (xact - cx) + kyact * (yact - cy)) - Math.sqrt(delta)) / 2 / (sqr(kxact) + sqr(kyact));
        tata2 = O2Pi(lambda2 * kxact + xact - cx, lambda2 * kyact + yact - cy);
        if (lambda2 > 0 && test(tata2)) { lambda = lambda2; tata = tata2; } else { lambda = lambda1; tata = tata1; }
      }
      if (!(lambda > 0 && test(tata))) return false;
      xinter = xact + lambda * kxact;
      yinter = yact + lambda * kyact;
      return true;
    }
    function avancer() {
      xact = xact + kxact * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
      yact = yact + kyact * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
    }
    function reculer() {
      xact = xact - kxact * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
      yact = yact - kyact * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
    }
    function bordure(xi, yi) {
      xinter = xi; yinter = yi;
      var d = Math.sqrt(sqr(xinter - xpact) + sqr(yinter - ypact));
      if (d < distance * (1 - epsilon)) {
        distance = d;
        xfutur = xinter; yfutur = yinter;
        kxfutur = kxact; kyfutur = kyact; anglepolairefutur = 0;
        bordureatteinte = true; naissance = false;
        surface_future = S.bordure;
        normaleatracer = false; normale2cotes = false;
        incidentatracer = false; refracteatracer = false;
      }
    }
    // Réflexion d'un rayon sur un dioptre (partie commune sphère/lec/polyèdre/prisme/polycercle) :
    // angle de la surface « ang » ; si réfracté, crée un enfant réfléchi, sinon le rayon est réfléchi.
    function reflexionDioptre(ang) {
      surfaceabsorbanteatteinte = false;
      incidence = PI / 2 - ang + anglepolaireact; normInc();
      if (!unrefracte) {
        indiceoptiquefutur = indiceoptiqueactuel;
        kxfutur = Math.sqrt(kxact * kxact + kyact * kyact) * Math.cos(2 * ang - anglepolaireact);
        kyfutur = Math.sqrt(kxact * kxact + kyact * kyact) * Math.sin(2 * ang - anglepolaireact);
        xfutur = xinter; yfutur = yinter;
        anglepolairefutur = 2 * ang - anglepolaireact; normFutur();
      } else {
        kxenfant = Math.sqrt(kxact * kxact + kyact * kyact) * Math.cos(2 * ang - anglepolaireact);
        kyenfant = Math.sqrt(kxact * kxact + kyact * kyact) * Math.sin(2 * ang - anglepolaireact);
        naissance = true;
        xenfant = xinter + kxenfant / Math.sqrt(sqr(kxenfant) + sqr(kyenfant)) / 10000 * diag;
        yenfant = yinter + kyenfant / Math.sqrt(sqr(kxenfant) + sqr(kyenfant)) / 10000 * diag;
      }
    }
    function angleRefracte(angNormale) {
      anglerefracte = creerAngle(xfutur, yfutur,
        xfutur + Math.cos(angNormale) * diag * pn / 2, yfutur + Math.sin(angNormale) * diag * pn / 2,
        xfutur + kxfutur * diag / Math.sqrt(sqr(kxfutur) + sqr(kyfutur)) * pn / 2,
        yfutur + kyfutur * diag / Math.sqrt(sqr(kxfutur) + sqr(kyfutur)) * pn / 2);
    }
    // Réfraction sur une face circulaire (lentille épaisse, polycercle) : centre (cx,cy), rayon |R|.
    function refractionCercle(cx, cy, Ra, entrant) {
      patate = (sqr(indiceoptiquefutur / indiceoptiqueactuel) - 1) * (sqr(kxact) + sqr(kyact)) +
        sqr(kxact * ((xinter - cx) / Ra) + kyact * ((yinter - cy) / Ra));
      unrefracte = patate > 0;
      if (!unrefracte) { surfaceabsorbanteatteinte = true; return; }
      surfaceabsorbanteatteinte = false;
      var ux = (xinter - cx) / Ra, uy = (yinter - cy) / Ra, ps = kxact * ux + kyact * uy;
      if (kxact * (xinter - cx) + kyact * (yinter - cy) < 0) {
        kxfutur = kxact - ps * ux - ux * Math.sqrt(patate);
        kyfutur = kyact - ps * uy - uy * Math.sqrt(patate);
      } else {
        kxfutur = kxact - ps * ux + ux * Math.sqrt(patate);
        kyfutur = kyact - ps * uy + uy * Math.sqrt(patate);
      }
      anglepolairefutur = PiPi(kxfutur, kyfutur);
      xfutur = xinter; yfutur = yinter;
      if (o.optionangles) {
        incidentatracer = true; refracteatracer = true;
        angleRefracte(anglepolairenormaleatracer + PI);
      }
    }
    // Face circulaire réfractante (lec face 1 ou 2, face circulaire de polycercle).
    function faceCirculaire(g, cx, cy, Ra, test, surf, ii) {
      avancer();
      if (arc(cx, cy, Ra, test) && plusProche()) {
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false; naissance = false;
        if (kxact * (xinter - cx) + kyact * (yinter - cy) < 0) { nnx = (xinter - cx); nny = (yinter - cy); }
        else { nnx = -(xinter - cx); nny = -(yinter - cy); }
        surfaceabsorbanteatteinte = false;
        surface_future = surf; indicesurfacefuture = ii;
        normaleatracer = true; normale2cotes = true;
        anglepolairenormaleatracer = O2Pi(nnx, nny);
        if (o.optionangles) {
          incidentatracer = true; refracteatracer = false;
          angleincident = creerAngle(xfutur, yfutur, xfutur + Math.cos(anglepolairenormaleatracer) * diag * pn / 2,
            yfutur + Math.sin(anglepolairenormaleatracer) * diag * pn / 2, xact, yact);
        }
        var nk = Math.sqrt(sqr(kxact) + sqr(kyact));
        var sondeX = xinter + kxact * diag / nk / 10000, sondeY = yinter + kyact * diag / nk / 10000;
        // l'original appelle estou quatre fois avec les mêmes arguments (fonction pure) : un seul calcul
        var es = g.estou(sondeX, sondeY);
        // rayon entrant
        if (es === INT.INTERIEUR) {
          indiceoptiquefutur = indiceCouleur(couleur, g.indicerouge, g.indicevert, g.indicebleu);
          refractionCercle(cx, cy, Ra, true);
        }
        // rayon sortant
        if (es === INT.EXTERIEUR) {
          indiceoptiquefutur = indiceMilieu(T, couleur, xinter + kxact * diag / nk / 1000, yinter + kyact * diag / nk / 1000, ORDRE_STD);
          refractionCercle(cx, cy, Ra, false);
        }
        if (nnx === 0) agp = (nny > 0) ? PI / 2 : -PI / 2;
        else { agp = Math.atan(nny / nnx); if (nnx < 0) agp = agp + PI; }
        // Réfléchis : l'original teste estou du point sonde (voir MOTEUR.md)
        if (es === INT.INTERIEUR && reflechit(g.reflechisortant, unrefracte)) {
          agp = agp + PI / 2; reflexionDioptre(agp);
        }
        if (es === INT.EXTERIEUR && reflechit(g.reflechientrant, unrefracte)) {
          agp = agp - PI / 2; reflexionDioptre(agp);
        }
      }
      reculer();
    }
    // Côté plan réfractant (polyèdre, prisme, côté rectiligne d'un polycercle).
    function coteRefractant(g, jj, surf, ii, ordreSortie) {
      var A = g.messommets[jj], B = g.messommets[jj + 1];
      if (!seg(A.ax, A.ay, B.ax, B.ay, A.ax, A.ay)) return;
      if (!plusProche()) return;
      var nxj = g.nx[jj], nyj = g.ny[jj];
      xfutur = xinter; yfutur = yinter;
      bordureatteinte = false; naissance = false;
      surface_future = surf; indicesurfacefuture = ii; cotefutur = jj;
      normaleatracer = true; normale2cotes = true;
      anglepolairenormaleatracer = O2Pi(nxj, nyj);
      if (o.optionangles) {
        incidentatracer = true; refracteatracer = false;
        var an = (kxact * nxj + kyact * nyj < 0) ? anglepolairenormaleatracer : anglepolairenormaleatracer + PI;
        angleincident = creerAngle(xfutur, yfutur, xfutur + Math.cos(an) * diag * pn / 2, yfutur + Math.sin(an) * diag * pn / 2, xact, yact);
      }
      var ps;
      // si le rayon sort
      if (kxact * nxj + kyact * nyj > 0) {
        indiceoptiquefutur = indiceMilieu(T, couleur, xinter + nxj / 10000 * diag, yinter + nyj / 10000 * diag, ordreSortie);
        ps = kxact * nxj + kyact * nyj;
        patate = (sqr(indiceoptiquefutur / indiceoptiqueactuel) - 1) * (sqr(kxact) + sqr(kyact)) + sqr(ps);
        unrefracte = patate > 0;
        if (!unrefracte) surfaceabsorbanteatteinte = true;
        else {
          surfaceabsorbanteatteinte = false;
          kxfutur = kxact - ps * nxj + nxj * Math.sqrt(patate);
          kyfutur = kyact - ps * nyj + nyj * Math.sqrt(patate);
          anglepolairefutur = PiPi(kxfutur, kyfutur);
          xfutur = xinter; yfutur = yinter;
          if (o.optionangles) { incidentatracer = true; refracteatracer = true; angleRefracte(anglepolairenormaleatracer); }
        }
      }
      // si le rayon rentre
      if (kxact * nxj + kyact * nyj < 0) {
        indiceoptiquefutur = indiceCouleur(couleur, g.indicerouge, g.indicevert, g.indicebleu);
        ps = kxact * nxj + kyact * nyj;
        patate = (sqr(indiceoptiquefutur / indiceoptiqueactuel) - 1) * (sqr(kxact) + sqr(kyact)) + sqr(ps);
        unrefracte = patate > 0;
        if (!unrefracte) surfaceabsorbanteatteinte = true;
        else {
          surfaceabsorbanteatteinte = false;
          kxfutur = kxact - ps * nxj - nxj * Math.sqrt(patate);
          kyfutur = kyact - ps * nyj - nyj * Math.sqrt(patate);
          anglepolairefutur = PiPi(kxfutur, kyfutur);
          xfutur = xinter; yfutur = yinter;
          if (o.optionangles) { incidentatracer = true; refracteatracer = true; angleRefracte(anglepolairenormaleatracer + PI); }
        }
      }
      if (kxact * nxj + kyact * nyj > 0 && reflechit(g.reflechisortant, unrefracte)) reflexionDioptre(g.anglepolaire[jj]);
      if (kxact * nxj + kyact * nyj < 0 && reflechit(g.reflechientrant, unrefracte)) reflexionDioptre(g.anglepolaire[jj]);
    }

    /* ======================= boucle principale ======================= */
    while (!bordureatteinte && !surfaceabsorbanteatteinte && nombresegment < maxsegment) {
      xpact = xact; ypact = yact;
      naissance = false; cheminsup = 0;
      distance = diag * 1.1;
      normaleatracer = false; normale2cotes = false;

      /* bordures (supérieure, inférieure, gauche, droite) */
      if (kyact !== 0) {
        mu = (kyact * (xact - xxmin) - kxact * (yact - yymax)) / (kyact * (xxmax - xxmin));
        lambda = (yymax - yact) / kyact;
        if (mu >= 0 && mu <= 1 && lambda > 0) bordure(xxmin + mu * (xxmax - xxmin), yymax);
      }
      if (kyact !== 0) {
        mu = (kyact * (xact - xxmin) - kxact * (yact - yymin)) / (kyact * (xxmax - xxmin));
        lambda = (yymin - yact) / kyact;
        if (mu >= 0 && mu <= 1 && lambda > 0) bordure(xxmin + mu * (xxmax - xxmin), yymin);
      }
      if (kxact !== 0) {
        mu = (kyact * (xact - xxmin) - kxact * (yact - yymin)) / (-kxact * (yymax - yymin));
        lambda = (xxmin - xact) / kxact;
        if (mu >= 0 && mu <= 1 && lambda > 0) bordure(xxmin, yymin + mu * (yymax - yymin));
      }
      if (kxact !== 0) {
        mu = (kyact * (xact - xxmax) - kxact * (yact - yymin)) / (-kxact * (yymax - yymin));
        lambda = (xxmax - xact) / kxact;
        if (mu >= 0 && mu <= 1 && lambda > 0) bordure(xxmax, yymin + mu * (yymax - yymin));
      }

      /* miroirs plans */
      for (i = 1; i <= L.miroirplan.length; i++) {
        var mp = L.miroirplan[i - 1];
        if (indicesurfaceactuelle === i && surface_actuelle === S.miroirplan) continue;
        if (!seg(mp.a1x, mp.a1y, mp.a2x, mp.a2y, mp.a1x, mp.a1y) || !plusProche()) continue;
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false; naissance = false;
        incidence = PI / 2 - mp.anglepolaire + anglepolaireact; normInc();
        if (incidence > PI / 2 || incidence < -PI / 2) surfaceabsorbanteatteinte = true;
        else {
          surfaceabsorbanteatteinte = false;
          surface_future = S.miroirplan; indicesurfacefuture = i;
          kxfutur = Math.sqrt(kxact * kxact + kyact * kyact) * Math.cos(2 * mp.anglepolaire - anglepolaireact);
          kyfutur = Math.sqrt(kxact * kxact + kyact * kyact) * Math.sin(2 * mp.anglepolaire - anglepolaireact);
          anglepolairefutur = 2 * mp.anglepolaire - anglepolaireact;
          normaleatracer = true;
          anglepolairenormaleatracer = mp.anglepolaire + PI / 2;
          normale2cotes = false;
          if (o.optionangles) {
            incidentatracer = true; refracteatracer = false;
            angleincident = creerAngle(xfutur, yfutur, xfutur + Math.cos(mp.anglepolaire + PI / 2) * diag * pn,
              yfutur + Math.sin(mp.anglepolaire + PI / 2) * diag * pn, xact, yact);
          }
          normFutur();
        }
      }

      /* écrans, diaphragmes (deux bras) : surfaces absorbantes */
      function absorbant(Ax, Ay, Bx, By) {
        if (!seg(Ax, Ay, Bx, By, Ax, Ay) || !plusProche()) return;
        xfutur = xinter; kxfutur = kxact; kyfutur = kyact; yfutur = yinter;
        bordureatteinte = false; naissance = false;
        normaleatracer = false; normale2cotes = false;
        incidentatracer = false; refracteatracer = false;
        surfaceabsorbanteatteinte = true;
      }
      for (i = 1; i <= L.ecran.length; i++) {
        if (indicesurfaceactuelle === i && surface_actuelle === S.ecran) continue;
        var ec = L.ecran[i - 1];
        absorbant(ec.a1x, ec.a1y, ec.a2x, ec.a2y);
      }
      for (i = 1; i <= L.diaphragme.length; i++) {
        if (indicesurfaceactuelle === i && surface_actuelle === S.diaphragme) continue;
        var dia = L.diaphragme[i - 1];
        absorbant(dia.a1x, dia.a1y, dia.a2x, dia.a2y);
      }
      for (i = 1; i <= L.diaphragme.length; i++) {
        if (indicesurfaceactuelle === i && surface_actuelle === S.diaphragme) continue;
        var dib = L.diaphragme[i - 1];
        absorbant(dib.ap1x, dib.ap1y, dib.ap2x, dib.ap2y);
      }

      /* lames semi-réfléchissantes */
      for (i = 1; i <= L.lsr.length; i++) {
        if (indicesurfaceactuelle === i && surface_actuelle === S.lsr) continue;
        var ls = L.lsr[i - 1];
        if (!seg(ls.a1x, ls.a1y, ls.a2x, ls.a2y, ls.a1x, ls.a1y) || !plusProche()) continue;
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false;
        incidence = PI / 2 - ls.anglepolaire + anglepolaireact; normInc();
        surfaceabsorbanteatteinte = false;
        surface_future = S.lsr; indicesurfacefuture = i;
        normaleatracer = true;
        anglepolairenormaleatracer = ls.anglepolaire + PI / 2;
        normale2cotes = true;
        if (o.optionangles) {
          incidentatracer = true; refracteatracer = false;
          var anl = (!(incidence > PI / 2 || incidence < -PI / 2)) ? ls.anglepolaire + PI / 2 : ls.anglepolaire + PI / 2 + PI;
          angleincident = creerAngle(xfutur, yfutur, xfutur + Math.cos(anl) * diag * pn, yfutur + Math.sin(anl) * diag * pn, xact, yact);
        }
        naissance = true;
        kxenfant = kxact; kyenfant = kyact;
        xenfant = xinter + kxact * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
        yenfant = yinter + kyact * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
        if (incidence > PI / 2 || incidence < -PI / 2) {
          kxfutur = Math.sqrt(kxact * kxact + kyact * kyact) * Math.cos(2 * (ls.anglepolaire + PI) - anglepolaireact);
          kyfutur = Math.sqrt(kxact * kxact + kyact * kyact) * Math.sin(2 * (ls.anglepolaire + PI) - anglepolaireact);
          anglepolairefutur = 2 * (ls.anglepolaire + PI) - anglepolaireact;
        } else {
          kxfutur = Math.sqrt(kxact * kxact + kyact * kyact) * Math.cos(2 * ls.anglepolaire - anglepolaireact);
          kyfutur = Math.sqrt(kxact * kxact + kyact * kyact) * Math.sin(2 * ls.anglepolaire - anglepolaireact);
          anglepolairefutur = 2 * ls.anglepolaire - anglepolaireact;
        }
        normFutur();
      }

      /* réseaux en transmission */
      var nk0, b, sarg;
      for (i = 1; i <= L.reseau.length; i++) {
        var rs = L.reseau[i - 1];
        if ((indicesurfaceactuelle === i && surface_actuelle === S.reseau) || !rs.entransmission) continue;
        if (!seg(rs.a1x, rs.a1y, rs.a2x, rs.a2y, rs.a1x, rs.a1y) || !plusProche()) continue;
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false;
        incidence = PI / 2 - rs.anglepolaire + anglepolaireact; normInc();
        surfaceabsorbanteatteinte = false;
        surface_future = S.reseau; indicesurfacefuture = i;
        normaleatracer = true; anglepolairenormaleatracer = rs.anglepolaire + PI / 2; normale2cotes = true;
        if (o.optionangles) {
          incidentatracer = true; refracteatracer = false;
          var anr = (!(incidence > PI / 2 || incidence < -PI / 2)) ? rs.anglepolaire + PI / 2 : rs.anglepolaire + PI / 2 + PI;
          angleincident = creerAngle(xfutur, yfutur, xfutur + Math.cos(anr) * diag * pn, yfutur + Math.sin(anr) * diag * pn, xact, yact);
        }
        naissance = true;
        enfantsReseau = [];
        nk0 = Math.sqrt(kxact * kxact + kyact * kyact);
        for (b = rs.ordre_min; b <= rs.ordre_max; b++) {
          if (b === 0) continue;
          if ((Math.abs(incidence) < PI / 2 && Math.abs(Math.sin(incidence) + b / rs.pas * longueur_donde) < 1) ||
              (Math.abs(incidence) > PI / 2 && Math.abs(Math.sin(incidence - PI) + b / rs.pas * longueur_donde) < 1)) {
            var ek = {};
            if (Math.abs(incidence) < PI / 2) {
              sarg = Math.asin(Math.sin(incidence) + b / rs.pas * longueur_donde);
              ek.kx = nk0 * Math.cos(rs.anglepolaire - PI / 2 + sarg); ek.ky = nk0 * Math.sin(rs.anglepolaire - PI / 2 + sarg);
            } else {
              sarg = Math.asin(Math.sin(incidence - PI) + b / rs.pas * longueur_donde);
              ek.kx = nk0 * Math.cos(rs.anglepolaire + PI / 2 + sarg); ek.ky = nk0 * Math.sin(rs.anglepolaire + PI / 2 + sarg);
            }
            ek.x = xinter + ek.kx * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
            ek.y = yinter + ek.ky * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
            enfantsReseau.push(ek);
          }
        }
        kxfutur = kxact; kyfutur = kyact; anglepolairefutur = anglepolaireact;
      }

      /* réseaux en réflexion */
      for (i = 1; i <= L.reseau.length; i++) {
        var rr = L.reseau[i - 1];
        if ((indicesurfaceactuelle === i && surface_actuelle === S.reseau) || rr.entransmission) continue;
        if (!seg(rr.a1x, rr.a1y, rr.a2x, rr.a2y, rr.a1x, rr.a1y) || !plusProche()) continue;
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false;
        incidence = PI / 2 - rr.anglepolaire + anglepolaireact; normInc();
        if (Math.abs(incidence) >= PI / 2) {
          xfutur = xinter; kxfutur = kxact; kyfutur = kyact; yfutur = yinter;
          bordureatteinte = false; naissance = false;
          normaleatracer = false; normale2cotes = false;
          incidentatracer = false; refracteatracer = false;
          surfaceabsorbanteatteinte = true;
        } else {
          surfaceabsorbanteatteinte = false;
          surface_future = S.reseau; indicesurfacefuture = i;
          normaleatracer = true; anglepolairenormaleatracer = rr.anglepolaire + PI / 2; normale2cotes = true;
          if (o.optionangles) {
            incidentatracer = true; refracteatracer = false;
            angleincident = creerAngle(xfutur, yfutur, xfutur + Math.cos(rr.anglepolaire + PI / 2) * diag * pn,
              yfutur + Math.sin(rr.anglepolaire + PI / 2) * diag * pn, xact, yact);
          }
          naissance = true;
          enfantsReseau = [];
          nk0 = Math.sqrt(kxact * kxact + kyact * kyact);
          for (b = rr.ordre_min; b <= rr.ordre_max; b++) {
            if (b === 0) continue;
            if (Math.abs(-Math.sin(incidence) + b / rr.pas * longueur_donde) < 1) {
              sarg = Math.asin(-Math.sin(incidence) + b / rr.pas * longueur_donde);
              var ekr = { kx: nk0 * Math.cos(rr.anglepolaire + PI / 2 + sarg), ky: nk0 * Math.sin(rr.anglepolaire + PI / 2 + sarg) };
              ekr.x = xinter + ekr.kx * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
              ekr.y = yinter + ekr.ky * diag / Math.sqrt(sqr(kxact) + sqr(kyact)) / 10000;
              enfantsReseau.push(ekr);
            }
          }
          kxfutur = nk0 * Math.cos(rr.anglepolaire + PI / 2 - incidence);
          kyfutur = nk0 * Math.sin(rr.anglepolaire + PI / 2 - incidence);
          anglepolairefutur = rr.anglepolaire + PI / 2 - incidence;
        }
      }

      /* miroirs sphériques paraxiaux (concaves puis convexes ; non troués, puis les deux moitiés des troués) */
      function msPara(m, ii, surf, convexe, Ax, Ay, Bx, By, lax, lay) {
        if (!seg(Ax, Ay, Bx, By, lax, lay) || !plusProche()) return;
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false; naissance = false;
        incidence = PI / 2 - m.anglepolaire + anglepolaireact; normInc();
        if (incidence > PI / 2 || incidence < -PI / 2) { surfaceabsorbanteatteinte = true; return; }
        surfaceabsorbanteatteinte = false;
        surface_future = surf; indicesurfacefuture = ii;
        lambda = ((m.fx - m.cx) * (m.fx - m.cx) + (m.fy - m.cy) * (m.fy - m.cy)) /
          (kxact * (m.fx - m.cx) + kyact * (m.fy - m.cy));
        var dx = m.cx - xinter + lambda * kxact, dy = m.cy - yinter + lambda * kyact;
        var s = convexe ? -1 : 1, nk = Math.sqrt(kxact * kxact + kyact * kyact), nd = Math.sqrt(dx * dx + dy * dy);
        kxfutur = s * nk * dx / nd;
        kyfutur = s * nk * dy / nd;
        anglepolairefutur = PiPi(kxfutur, kyfutur);
        normaleatracer = false; normale2cotes = false;
        incidentatracer = false; refracteatracer = false;
        if (T.optionsurfacesonde) {
          distancecentre = Math.sqrt(sqr(xinter - m.sx) + sqr(yinter - m.sy));
          cheminsup = (convexe ? 1 : -1) * sqr(distancecentre) / 2 / m.focale;
        }
      }
      for (i = 1; i <= L.mscopa.length; i++) {
        var m1 = L.mscopa[i - 1];
        if (m1.trou || (indicesurfaceactuelle === i && surface_actuelle === S.mscopa)) continue;
        msPara(m1, i, S.mscopa, false, m1.a1x, m1.a1y, m1.a2x, m1.a2y, m1.a1x, m1.a1y);
      }
      for (i = 1; i <= L.mscopa.length; i++) {
        var m2 = L.mscopa[i - 1];
        if (!m2.trou || (indicesurfaceactuelle === i && surface_actuelle === S.mscopa)) continue;
        msPara(m2, i, S.mscopa, false, m2.a1x, m2.a1y, m2.t1x, m2.t1y, m2.a1x, m2.a1y);
      }
      for (i = 1; i <= L.mscopa.length; i++) {
        var m3 = L.mscopa[i - 1];
        if (!m3.trou || (indicesurfaceactuelle === i && surface_actuelle === S.mscopa)) continue;
        // l'original calcule lambda avec a1x (et non t2x) lorsque |kx|>|ky| : conservé
        msPara(m3, i, S.mscopa, false, m3.t2x, m3.t2y, m3.a2x, m3.a2y, m3.a1x, m3.t2y);
      }
      for (i = 1; i <= L.mscepa.length; i++) {
        var m4 = L.mscepa[i - 1];
        if (m4.trou || (indicesurfaceactuelle === i && surface_actuelle === S.mscepa)) continue;
        msPara(m4, i, S.mscepa, true, m4.a1x, m4.a1y, m4.a2x, m4.a2y, m4.a1x, m4.a1y);
      }
      for (i = 1; i <= L.mscepa.length; i++) {
        var m5 = L.mscepa[i - 1];
        if (!m5.trou || (indicesurfaceactuelle === i && surface_actuelle === S.mscepa)) continue;
        msPara(m5, i, S.mscepa, true, m5.a1x, m5.a1y, m5.t1x, m5.t1y, m5.a1x, m5.a1y);
      }
      for (i = 1; i <= L.mscepa.length; i++) {
        var m6 = L.mscepa[i - 1];
        if (!m6.trou || (indicesurfaceactuelle === i && surface_actuelle === S.mscepa)) continue;
        msPara(m6, i, S.mscepa, true, m6.t2x, m6.t2y, m6.a2x, m6.a2y, m6.t2x, m6.t2y);
      }

      /* lentilles minces convergentes */
      for (i = 1; i <= L.lmc.length; i++) {
        var lc = L.lmc[i - 1];
        if (indicesurfaceactuelle === i && surface_actuelle === S.lmc) continue;
        if (!seg(lc.a1x, lc.a1y, lc.a2x, lc.a2y, lc.a1x, lc.a1y) || !plusProche()) continue;
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false; naissance = false;
        incidence = PI / 2 - lc.anglepolaire + anglepolaireact; normInc();
        surfaceabsorbanteatteinte = false;
        surface_future = S.lmc; indicesurfacefuture = i;
        if ((kxact * (lc.f1x - lc.ox) + kyact * (lc.f1y - lc.oy)) > 0) { ffx = lc.f1x; ffy = lc.f1y; }
        else { ffx = lc.f2x; ffy = lc.f2y; }
        lambda = sqr(lc.focale) / (kxact * (ffx - lc.ox) + kyact * (ffy - lc.oy));
        var cdx = lc.ox - xinter + lambda * kxact, cdy = lc.oy - yinter + lambda * kyact;
        var nkc = Math.sqrt(kxact * kxact + kyact * kyact), ndc = Math.sqrt(cdx * cdx + cdy * cdy);
        kxfutur = nkc * cdx / ndc; kyfutur = nkc * cdy / ndc;
        anglepolairefutur = PiPi(kxfutur, kyfutur);
        normaleatracer = false; normale2cotes = false;
        incidentatracer = false; refracteatracer = false;
        // distancecentre n'est pas recalculé ici dans l'original (valeur précédente)
        if (T.optionsurfacesonde) cheminsup = (sqr(lc.rayonmonture) - sqr(distancecentre)) / 2 / lc.focale;
      }

      /* lentilles minces divergentes */
      for (i = 1; i <= L.lmd.length; i++) {
        var ld = L.lmd[i - 1];
        if (indicesurfaceactuelle === i && surface_actuelle === S.lmd) continue;
        if (!seg(ld.a1x, ld.a1y, ld.a2x, ld.a2y, ld.a1x, ld.a1y) || !plusProche()) continue;
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false; naissance = false;
        incidence = PI / 2 - ld.anglepolaire + anglepolaireact; normInc();
        surfaceabsorbanteatteinte = false;
        surface_future = S.lmd; indicesurfacefuture = i;
        if ((kxact * (ld.f1x - ld.ox) + kyact * (ld.f1y - ld.oy)) < 0) { ffx = ld.f1x; ffy = ld.f1y; }
        else { ffx = ld.f2x; ffy = ld.f2y; }
        lambda = ((ffx - ld.ox) * (ffx - ld.ox) + (ffy - ld.oy) * (ffy - ld.oy)) / (kxact * (ffx - ld.ox) + kyact * (ffy - ld.oy));
        var ddx = ld.ox - xinter + lambda * kxact, ddy = ld.oy - yinter + lambda * kyact;
        var nkd = Math.sqrt(kxact * kxact + kyact * kyact), ndd = Math.sqrt(ddx * ddx + ddy * ddy);
        kxfutur = -nkd * ddx / ndd; kyfutur = -nkd * ddy / ndd;
        anglepolairefutur = PiPi(kxfutur, kyfutur);
        normaleatracer = false; normale2cotes = false;
        incidentatracer = false; refracteatracer = false;
        if (T.optionsurfacesonde) cheminsup = (sqr(xinter - ld.ox) + sqr(yinter - ld.oy)) / 2 / ld.focale;
      }

      /* miroirs coniques */
      for (i = 1; i <= L.miroirconique.length; i++) {
        var mc = L.miroirconique[i - 1];
        if (indicesurfaceactuelle === i && surface_actuelle === S.miroirconique && !mc.concave) continue;
        var decale = mc.concave && indicesurfaceactuelle === i && surface_actuelle === S.miroirconique;
        if (decale) avancer();
        var e = mc.excentricite, pa = mc.parametre, t0 = mc.theta0;
        aaa = kyact * pa + kyact * e * Math.cos(t0) * (mc.fx - xact) - kxact * e * (mc.fy - yact) * Math.cos(t0);
        bbb = kxact * pa + kxact * e * Math.sin(t0) * (mc.fy - yact) - kyact * e * (mc.fx - xact) * Math.sin(t0);
        ccc = kxact * (mc.fy - yact) - kyact * (mc.fx - xact);
        delta = 4 * (sqr(bbb) + sqr(aaa) - sqr(ccc));
        if (delta >= 0) {
          if ((aaa + ccc === 0) && (bbb !== 0)) {
            xxx = (aaa - ccc) / 2 / bbb;
            tata = 2 * Math.atan(xxx);
            rrr = pa / (1 + e * Math.cos(tata - t0));
            if (Math.abs(kxact) > Math.abs(kyact)) lambda = (mc.fx + rrr * Math.cos(tata) - xact) / kxact;
            else lambda = (mc.fy + rrr * Math.sin(tata) - yact) / kyact;
          } else if ((delta === 0) && (aaa + ccc !== 0)) {
            xxx = -bbb / (aaa + ccc);
            tata = 2 * Math.atan(xxx);
            if ((1 + e * Math.cos(tata - t0)) > 0) {
              rrr = pa / (1 + e * Math.cos(tata - t0));
              if (Math.abs(kxact) > Math.abs(kyact)) lambda = (mc.fx + rrr * Math.cos(tata) - xact) / kxact;
              else lambda = (mc.fy + rrr * Math.sin(tata) - yact) / kyact;
            } else { rrr = 0; lambda = 0; }
          } else {
            xxx1 = (-bbb + Math.sqrt(sqr(bbb) + sqr(aaa) - sqr(ccc))) / (aaa + ccc);
            tata1 = 2 * Math.atan(xxx1);
            if ((1 + e * Math.cos(tata1 - t0)) > 0) {
              rrr1 = pa / (1 + e * Math.cos(tata1 - t0));
              if (Math.abs(kxact) > Math.abs(kyact)) lambda1 = (mc.fx + rrr1 * Math.cos(tata1) - xact) / kxact;
              else lambda1 = (mc.fy + rrr1 * Math.sin(tata1) - yact) / kyact;
            } else { rrr1 = 0; lambda1 = 0; }
            if (tata1 < 0) tata1 = tata1 + 2 * PI;
            if (tata1 > 2 * PI) tata1 = tata1 - 2 * PI;
            xxx2 = (-bbb - Math.sqrt(sqr(bbb) + sqr(aaa) - sqr(ccc))) / (aaa + ccc);
            tata2 = 2 * Math.atan(xxx2);
            if ((1 + e * Math.cos(tata2 - t0)) > 0) {
              rrr2 = pa / (1 + e * Math.cos(tata2 - t0));
              if (Math.abs(kxact) > Math.abs(kyact)) lambda2 = (mc.fx + rrr2 * Math.cos(tata2) - xact) / kxact;
              else lambda2 = (mc.fy + rrr2 * Math.sin(tata2) - yact) / kyact;
            } else { rrr2 = 0; lambda2 = 0; }
            if (tata2 < 0) tata2 = tata2 + 2 * PI;
            if (tata2 > PI * 2) tata2 = tata2 - 2 * PI;
            if (lambda2 > 0 && dans(tata2, mc.theta1, mc.theta2)) { lambda = lambda2; rrr = rrr2; tata = tata2; }
            else { lambda = lambda1; rrr = rrr1; tata = tata1; }
          }
          if (lambda > 0 && dans(tata, mc.theta1, mc.theta2)) {
            xinter = xact + lambda * kxact;
            yinter = yact + lambda * kyact;
            if (plusProche()) {
              xfutur = xinter; yfutur = yinter;
              bordureatteinte = false; naissance = false;
              var den = 1 / Math.sqrt(1 + sqr(e) + 2 * e * Math.cos(tata - t0));
              nnnx = den * (-e * Math.sin(tata - t0) * Math.sin(tata) - (1 + e * Math.cos(tata - t0)) * Math.cos(tata));
              nnny = den * (e * Math.sin(tata - t0) * Math.cos(tata) - (1 + e * Math.cos(tata - t0)) * Math.sin(tata));
              if (((kxact * nnnx + kyact * nnny < 0) && !mc.concave) || ((kxact * nnnx + kyact * nnny > 0) && mc.concave))
                surfaceabsorbanteatteinte = true;
              else {
                surfaceabsorbanteatteinte = false;
                surface_future = S.miroirconique; indicesurfacefuture = i;
                kxfutur = kxact - 2 * (kxact * nnnx + kyact * nnny) * nnnx;
                kyfutur = kyact - 2 * (kxact * nnnx + kyact * nnny) * nnny;
                anglepolairefutur = PiPi(kxfutur, kyfutur);
                normaleatracer = true; normale2cotes = false;
                anglepolairenormaleatracer = O2Pi(nnnx, nnny);
                if (o.optionangles) {
                  incidentatracer = true; refracteatracer = false;
                  var anc = mc.concave ? anglepolairenormaleatracer : anglepolairenormaleatracer + PI;
                  angleincident = creerAngle(xfutur, yfutur, xfutur + Math.cos(anc) * diag * pn / 2,
                    yfutur + Math.sin(anc) * diag * pn / 2, xact, yact);
                }
                if (!mc.concave) anglepolairenormaleatracer = anglepolairenormaleatracer + PI;
              }
            }
          }
        }
        if (decale) reculer();
      }

      /* miroirs sphériques réels concaves (non troués, puis œil, puis troués) */
      function msReel(m, ii, surf, convexe, ta, tb) {
        if (!arc(m.cx, m.cy, m.rayoncourbure, function (t) { return dans(t, ta, tb); })) return;
        if (!plusProche()) return;
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false; naissance = false;
        if (xinter === m.cx) anglepolairenormale = (m.cy > yinter) ? PI / 2 : -PI / 2;
        else { anglepolairenormale = Math.atan((m.cy - yinter) / (m.cx - xinter)); if (m.cx < xinter) anglepolairenormale = anglepolairenormale + PI; }
        if (convexe) anglepolairenormale = anglepolairenormale + PI;
        incidence = -anglepolairenormale + anglepolaireact + PI; normInc();
        if (incidence > PI / 2 || incidence < -PI / 2) { surfaceabsorbanteatteinte = true; return; }
        surfaceabsorbanteatteinte = false;
        surface_future = surf; indicesurfacefuture = ii;
        anglepolairefutur = anglepolairenormale - incidence;
        normaleatracer = true; normale2cotes = false;
        anglepolairenormaleatracer = anglepolairenormale;
        if (o.optionangles) {
          incidentatracer = true; refracteatracer = false;
          var f = convexe ? 1 : 0.5;
          angleincident = creerAngle(xfutur, yfutur, xfutur + Math.cos(anglepolairenormaleatracer) * diag * pn * f,
            yfutur + Math.sin(anglepolairenormaleatracer) * diag * pn * f, xact, yact);
        }
        if (anglepolairefutur > PI) anglepolairefutur = anglepolairefutur - PI * 2;
        if (anglepolairefutur < -PI) anglepolairefutur = anglepolairefutur + 2 * PI;
        kxfutur = Math.sqrt(sqr(kxact) + sqr(kyact)) * Math.cos(anglepolairefutur);
        kyfutur = Math.sqrt(sqr(kxact) + sqr(kyact)) * Math.sin(anglepolairefutur);
      }
      function mscoreBloc(selonTrou, ta, tb) {
        for (var ii = 1; ii <= L.mscore.length; ii++) {
          var m = L.mscore[ii - 1];
          if (m.trou !== selonTrou) continue;
          var meme = (indicesurfaceactuelle === ii && surface_actuelle === S.mscore);
          if (meme) avancer();
          msReel(m, ii, S.mscore, false, m[ta], m[tb]);
          if (meme) reculer();
        }
      }
      mscoreBloc(false, 'theta1', 'theta2');

      /* œil (trois arcs absorbants) */
      function oeilArc(cx, cy, R, ta, tb, ii) {
        if (!arc(cx, cy, R, function (t) { return dans(t, ta, tb); })) return;
        if (!plusProche()) return;
        xfutur = xinter; yfutur = yinter;
        bordureatteinte = false; naissance = false;
        surfaceabsorbanteatteinte = true;
        surface_future = S.oeil; indicesurfacefuture = ii;
      }
      var oe;
      for (i = 1; i <= L.oeil.length; i++) {
        oe = L.oeil[i - 1];
        tati1 = oe.anglepolaire - PI / 6; tati2 = oe.anglepolaire + PI / 6;
        if (tati1 < 0) { tati1 += 2 * PI; tati2 += 2 * PI; }
        oeilArc(oe.cx, oe.cy, oe.rayoncourbure, tati1, tati2, i);
      }
      for (i = 1; i <= L.oeil.length; i++) {
        oe = L.oeil[i - 1];
        tati1 = oe.anglepolaire - PI / 2; tati2 = oe.anglepolaire - PI / 2 + PI / 3 + PI / 20;
        if (tati1 < 0) { tati1 += 2 * PI; tati2 += 2 * PI; }
        oeilArc(oe.c1x, oe.c1y, oe.rayoncourbure, tati1, tati2, i);
      }
      for (i = 1; i <= L.oeil.length; i++) {
        oe = L.oeil[i - 1];
        tati1 = oe.anglepolaire + PI / 2 - PI / 3 - PI / 20; tati2 = oe.anglepolaire + PI / 2;
        if (tati1 < 0) { tati1 += 2 * PI; tati2 += 2 * PI; }
        oeilArc(oe.c2x, oe.c2y, oe.rayoncourbure, tati1, tati2, i);
      }

      mscoreBloc(true, 'theta1', 'theta1p');
      mscoreBloc(true, 'theta2p', 'theta2');

      /* sphères réfractantes */
      for (i = 1; i <= L.sphere.length; i++) {
        var sp = L.sphere[i - 1];
        avancer();
        delta = 4 * sqr(kxact * (xact - sp.cx) + kyact * (yact - sp.cy)) - 4 *
          (sqr(kxact) + sqr(kyact)) * (sqr(xact - sp.cx) + sqr(yact - sp.cy) - sqr(sp.rayon));
        if (delta >= 0) {
          if (delta === 0) lambda = (kxact * (xact - sp.cx) + kyact * (yact - sp.cy)) / (sqr(kxact) + sqr(kyact));
          else {
            lambda1 = (-2 * (kxact * (xact - sp.cx) + kyact * (yact - sp.cy)) + Math.sqrt(delta)) / 2 / (sqr(kxact) + sqr(kyact));
            lambda2 = (-2 * (kxact * (xact - sp.cx) + kyact * (yact - sp.cy)) - Math.sqrt(delta)) / 2 / (sqr(kxact) + sqr(kyact));
            lambda = (lambda2 > 0) ? lambda2 : lambda1;
          }
          if (lambda > 0) {
            xinter = xact + lambda * kxact;
            yinter = yact + lambda * kyact;
            if (plusProche()) {
              xfutur = xinter; yfutur = yinter;
              bordureatteinte = false; naissance = false;
              nnx = (xinter - sp.cx); nny = (yinter - sp.cy);
              normaleatracer = true; normale2cotes = true;
              anglepolairenormaleatracer = O2Pi(nnx, nny);
              if (o.optionangles) {
                incidentatracer = true; refracteatracer = false;
                var ans = (nnx * kxact + nny * kyact < 0) ? anglepolairenormaleatracer : anglepolairenormaleatracer + PI;
                angleincident = creerAngle(xfutur, yfutur, xfutur + Math.cos(ans) * diag * pn / 2, yfutur + Math.sin(ans) * diag * pn / 2, xact, yact);
              }
              surfaceabsorbanteatteinte = false;
              surface_future = S.sphere; indicesurfacefuture = i;
              var ux = (xinter - sp.cx) / sp.rayon, uy = (yinter - sp.cy) / sp.rayon, psp = kxact * ux + kyact * uy;
              // rayon entrant
              if (nnx * kxact + nny * kyact < 0) {
                indiceoptiquefutur = indiceCouleur(couleur, sp.indicerouge, sp.indicevert, sp.indicebleu);
                patate = (sqr(indiceoptiquefutur / indiceoptiqueactuel) - 1) * (sqr(kxact) + sqr(kyact)) + sqr(psp);
                unrefracte = patate > 0;
                if (!unrefracte) surfaceabsorbanteatteinte = true;
                else {
                  surfaceabsorbanteatteinte = false;
                  kxfutur = kxact - psp * ux - ux * Math.sqrt(patate);
                  kyfutur = kyact - psp * uy - uy * Math.sqrt(patate);
                  anglepolairefutur = PiPi(kxfutur, kyfutur);
                  xfutur = xinter; yfutur = yinter;
                  if (o.optionangles) { incidentatracer = true; refracteatracer = true; angleRefracte(anglepolairenormaleatracer + PI); }
                }
              }
              // rayon sortant
              if (nnx * kxact + nny * kyact > 0) {
                indiceoptiquefutur = indiceMilieu(T, couleur, xinter + (xinter - sp.cx) / sp.rayon / 10000,
                  yinter + (yinter - sp.cy) / sp.rayon / 10000, ORDRE_SPHERE);
                patate = (sqr(indiceoptiquefutur / indiceoptiqueactuel) - 1) * (sqr(kxact) + sqr(kyact)) + sqr(psp);
                unrefracte = patate > 0;
                if (!unrefracte) surfaceabsorbanteatteinte = true;
                else {
                  surfaceabsorbanteatteinte = false;
                  kxfutur = kxact - psp * ux + ux * Math.sqrt(patate);
                  kyfutur = kyact - psp * uy + uy * Math.sqrt(patate);
                  anglepolairefutur = PiPi(kxfutur, kyfutur);
                  xfutur = xinter; yfutur = yinter;
                  if (o.optionangles) { incidentatracer = true; refracteatracer = true; angleRefracte(anglepolairenormaleatracer); }
                }
              }
              if (nnx === 0) agp = (nny > 0) ? PI / 2 : -PI / 2;
              else { agp = Math.atan(nny / nnx); if (nnx < 0) agp = agp + PI; }
              if (psp > 0 && reflechit(sp.reflechisortant, unrefracte)) { agp = agp + PI / 2; reflexionDioptre(agp); }
              if (psp < 0 && reflechit(sp.reflechientrant, unrefracte)) { agp = agp - PI / 2; reflexionDioptre(agp); }
            }
          }
        }
        reculer();
      }

      /* lentilles épaisses : face 1, face 2, puis bords (absorbants) si tronquée */
      for (i = 1; i <= L.lec.length; i++) {
        var le1 = L.lec[i - 1];
        faceCirculaire(le1, le1.c1x, le1.c1y, Math.abs(le1.r1), (function (g) { return function (t) { return dans(t, g.theta1_1, g.theta2_1); }; })(le1), S.lec, i);
      }
      for (i = 1; i <= L.lec.length; i++) {
        var le2 = L.lec[i - 1];
        faceCirculaire(le2, le2.c2x, le2.c2y, Math.abs(le2.r2), (function (g) { return function (t) { return dans(t, g.theta1_2, g.theta2_2); }; })(le2), S.lec, i);
      }
      for (i = 1; i <= L.lec.length; i++) {
        var lb = L.lec[i - 1];
        if (lb.tronque) absorbant(lb.a1x, lb.a1y, lb.a2x, lb.a2y);
      }
      for (i = 1; i <= L.lec.length; i++) {
        var lb2 = L.lec[i - 1];
        if (lb2.tronque) absorbant(lb2.b1x, lb2.b1y, lb2.b2x, lb2.b2y);
      }

      /* miroirs sphériques réels convexes */
      function mscereBloc(selonTrou, ta, tb) {
        for (var ii = 1; ii <= L.mscere.length; ii++) {
          var m = L.mscere[ii - 1];
          if (m.trou !== selonTrou || (indicesurfaceactuelle === ii && surface_actuelle === S.mscere)) continue;
          msReel(m, ii, S.mscere, true, m[ta], m[tb]);
        }
      }
      mscereBloc(false, 'theta1', 'theta2');
      mscereBloc(true, 'theta1', 'theta1p');
      mscereBloc(true, 'theta2p', 'theta2');

      /* polyèdres, prismes, côtés rectilignes des polycercles */
      for (i = 1; i <= L.polyhedre.length; i++) {
        var ph = L.polyhedre[i - 1];
        for (j = 1; j <= ph.nombresommet; j++) {
          if (indicesurfaceactuelle === i && surface_actuelle === S.polyhedre && coteactuel === j) continue;
          coteRefractant(ph, j, S.polyhedre, i, ORDRE_STD);
        }
      }
      for (i = 1; i <= L.prisme.length; i++) {
        var pr = L.prisme[i - 1];
        for (j = 1; j <= pr.nombresommet; j++) {
          if (indicesurfaceactuelle === i && surface_actuelle === S.prisme && coteactuel === j) continue;
          coteRefractant(pr, j, S.prisme, i, ORDRE_STD);
        }
      }
      for (i = 1; i <= L.polycercle.length; i++) {
        var pc = L.polycercle[i - 1];
        for (j = 1; j <= pc.nombresommet; j++) {
          if (!pc.rectiligne[j]) continue;   // pas de test « même côté » dans l'original
          coteRefractant(pc, j, S.polycercle, i, ORDRE_STD);
        }
      }
      /* faces circulaires des polycercles */
      for (i = 1; i <= L.polycercle.length; i++) {
        var pcc = L.polycercle[i - 1];
        for (j = 1; j <= pcc.nombresommet; j++) {
          if (pcc.rectiligne[j]) continue;
          faceCirculaire(pcc, pcc.mescentres[j].ax, pcc.mescentres[j].ay, Math.abs(pcc.rayon[j]),
            (function (a, bb) { return function (t) { return dans3(t, a, bb); }; })(pcc.theta1[j], pcc.theta2[j]), S.polycercle, i);
        }
      }

      /* ======================= fin de l'itération ======================= */
      if (Math.abs(kxfutur) < diag / 1e10) kxfutur = 0;
      if (Math.abs(kyfutur) < diag / 1e10) kyfutur = 0;

      if (!T.optionsurfacesonde) {
        T.segments.push({
          a1x: xact, a1y: yact, a2x: xfutur, a2y: yfutur, ap: anglepolaireact, epaisseur: epaisseur,
          couleur: couleur, virtuelavant: lvav(nombresegment + 1), virtuelarriere: lvaa(nombresegment + 1)
        });
        if (T.segments.length >= T.limite) { T.tronque = true; return; }
      }

      if (T.optionsurfacesonde) {
        var lseg = Math.sqrt(sqr(xfutur - xact) + sqr(yfutur - yact));
        cheminoptique = cheminoptique + indiceoptiqueactuel * lseg;
        if (cheminoptique > T.cheminactuelaobtenir) {
          lambda = (T.cheminactuelaobtenir - (cheminoptique - indiceoptiqueactuel * lseg)) / indiceoptiqueactuel / lseg;
          if (T.premierpointsurfacesonde) {
            T.premierpointsurfacesonde = false;
            T.interx1 = xact + lambda * (xfutur - xact);
            T.intery1 = yact + lambda * (yfutur - yact);
            return;
          }
          T.interx2 = xact + lambda * (xfutur - xact);
          T.intery2 = yact + lambda * (yfutur - yact);
          T.surfacesOnde.push({ a1x: T.interx1, a1y: T.intery1, a2x: T.interx2, a2y: T.intery2,
            ap: O2Pi(T.interx2 - T.interx1, T.intery2 - T.intery1), epaisseur: 1, couleur: couleur });
          T.interx1 = T.interx2; T.intery1 = T.intery2;
          return;
        }
        if (surface_future === S.lmc || surface_future === S.mscopa || surface_future === S.lmd || surface_future === S.mscepa)
          cheminoptique = cheminoptique + cheminsup;
      }

      if (!T.optionsurfacesonde && o.optionangles) {
        if (incidentatracer) T.angles.push(creerAngle(angleincident.cx, angleincident.cy, angleincident.a1x, angleincident.a1y, angleincident.a2x, angleincident.a2y));
        if (refracteatracer) T.angles.push(creerAngle(anglerefracte.cx, anglerefracte.cy, anglerefracte.a1x, anglerefracte.a1y, anglerefracte.a2x, anglerefracte.a2y));
      }

      if (!T.optionsurfacesonde && o.optionnormale && normaleatracer) {
        var an2 = anglepolairenormaleatracer;
        if (normale2cotes) T.normales.push({
          a1x: xfutur + Math.cos(an2) * diag * pn / 2, a1y: yfutur + Math.sin(an2) * diag * pn / 2,
          a2x: xfutur + Math.cos(an2 + PI) * diag * pn / 2, a2y: yfutur + Math.sin(an2 + PI) * diag * pn / 2,
          ap: an2, epaisseur: o.epaisseurnormale, couleur: o.couleurnormale });
        else T.normales.push({
          a1x: xfutur, a1y: yfutur, a2x: xfutur + Math.cos(an2) * diag * pn, a2y: yfutur + Math.sin(an2) * diag * pn,
          ap: an2, epaisseur: o.epaisseurnormale, couleur: o.couleurnormale });
      }

      xact = xfutur; yact = yfutur; kxact = kxfutur; kyact = kyfutur;
      anglepolaireact = anglepolairefutur; indiceoptiqueactuel = indiceoptiquefutur;
      surface_actuelle = surface_future; coteactuel = cotefutur;
      indicesurfaceactuelle = indicesurfacefuture;
      nombresegment++;

      if (!T.optionsurfacesonde && surface_future !== S.reseau && naissance && nombrenaissance < nombremaxenfant) {
        var enf = OptGeo.creerRayonEnfant(xenfant, yenfant, kxenfant, kyenfant, couleur, epaisseur, vav, vaa,
          nombremaxenfant - nombrenaissance - 1, maxsegment, nombresegment, T.ctx);
        if (enf) { T.enfants.push(enf); nombrenaissance++; }
      }
      if (!T.optionsurfacesonde && surface_future === S.reseau && enfantsReseau.length > 0 && !surfaceabsorbanteatteinte) {
        if (nombrenaissance + enfantsReseau.length < nombremaxenfant) {
          for (b = 0; b < enfantsReseau.length; b++) {
            var er = enfantsReseau[b];
            // le résultat de createenfant n'est pas testé dans l'original
            var enr = OptGeo.creerRayonEnfant(er.x, er.y, er.kx, er.ky, couleur, epaisseur, vav, vaa,
              nombremaxenfant - nombrenaissance - 1, maxsegment, nombresegment, T.ctx);
            if (enr) T.enfants.push(enr);
            nombrenaissance++;
          }
        }
      }
    }
  }

  /** Lance un rayon ; la lumière blanche (noire) est décomposée en R, V, B si besoin. */
  function lancer(T, r, vav, vaa) {
    T.nombreRayons++;
    if (!(r.couleur === clblack && (T.dispersif || T.L.reseau.length > 0))) {
      calculesegment0(T, r.ax, r.ay, r.kx, r.ky, r.anglepolaire, r.epaisseur, r.couleur, vav, vaa, r.nombremaxenfant, r.maxsegment);
    } else {
      [clred, clgreen, clblue].forEach(function (c) {
        var e = OptGeo.creerRayonEnfant(r.ax, r.ay, r.kx, r.ky, c, r.epaisseur, vav, vaa, r.nombremaxenfant, r.maxsegment, 0, T.ctx);
        if (e) T.enfants.push(e);
      });
    }
  }

  /**
   * Trace toute la scène (Rafraichit). Options : {surfacesOnde: false} pour ne pas
   * calculer les surfaces d'onde.
   */
  function tracerScene(scene, opts) {
    opts = opts || {};
    var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var T = preparer(scene), L = T.L, o = T.o, i, k;

    L.rayon.forEach(function (r) { if (!T.tronque) lancer(T, r, r.vav, r.vaa); });
    L.sourceponctuelle.forEach(function (s) {
      for (k = 1; k <= s.nombrederayon && !T.tronque; k++) lancer(T, s.ray[k], s.vav, s.vaa);
    });
    L.ondeplane.forEach(function (s) {
      for (k = 1; k <= s.nombrederayon && !T.tronque; k++) lancer(T, s.ray[k], s.ray[k].vav, s.ray[k].vaa);
    });
    for (i = 0; i < T.enfants.length && !T.tronque; i++) {
      var e = T.enfants[i];
      T.nombreRayons++;
      calculesegment0(T, e.ax, e.ay, e.kx, e.ky, e.anglepolaire, e.epaisseur, e.couleur, e.vav, e.vaa, e.nombremaxenfant, e.maxsegment);
    }

    // Segments fantômes (numérotés à partir de 1 dans l'ordre de calcul)
    if (o.fantomespresents) {
      var f = M.jetonsListe(o.listefantomes);
      T.segments.forEach(function (s, n) { if (f[String(n + 1)]) s.fantome = true; });
    }

    // Surfaces d'onde (pas de lentille mince ni de miroir paraxial dans la scène)
    var nmax = o.maxrayonsrecherchesurfacesonde;
    // (nmax < 2 : division par zéro dans l'original, qui lève alors une exception ; on s'abstient)
    if (opts.surfacesOnde !== false && !T.tronque && nmax >= 2 && (L.lmc.length + L.lmd.length + L.mscopa.length + L.mscepa.length === 0)) {
      T.optionsurfacesonde = true;
      L.sourceponctuelle.forEach(function (s) {
        if (!s.tracersurfacesonde || s.sourcevirtuelle || s.nombrecheminsoptiques <= 0) return;
        var tt1 = s.ray[1].anglepolaire, tt2 = s.ray[s.nombrederayon].anglepolaire;
        if (tt2 < tt1) tt2 += 2 * PI;
        if (tt2 < tt1) tt2 += 2 * PI;
        var rra = Math.sqrt(sqr(s.a1x - s.sx) + sqr(s.a1y - s.sy));
        if (Math.sqrt(sqr(s.a2x - s.sx) + sqr(s.a2y - s.sy)) < rra) rra = Math.sqrt(sqr(s.a2x - s.sx) + sqr(s.a2y - s.sy));
        for (var jj = 0; jj < s.nombrecheminsoptiques; jj++) {
          T.premierpointsurfacesonde = true;
          T.cheminactuelaobtenir = s.listecheminsoptiques[jj];
          for (var iii = 1; iii <= nmax; iii++) {
            var th = tt1 + (iii - 1) * (tt2 - tt1) / (nmax - 1);
            calculesegment0(T, s.sx, s.sy, rra * Math.cos(th), rra * Math.sin(th), th, 1, s.couleur, '', '', 0, s.maxsegment);
          }
        }
      });
      L.ondeplane.forEach(function (s) {
        if (!s.tracersurfacesonde || s.nombrecheminsoptiques <= 0) return;
        for (var jj = 0; jj < s.nombrecheminsoptiques; jj++) {
          T.premierpointsurfacesonde = true;
          T.cheminactuelaobtenir = s.listecheminsoptiques[jj];
          for (var iii = 1; iii <= nmax; iii++) {
            calculesegment0(T, s.a1x + (iii - 1) * (s.a2x - s.a1x) / (nmax - 1), s.a1y + (iii - 1) * (s.a2y - s.a1y) / (nmax - 1),
              s.ray[1].kx, s.ray[1].ky, s.ray[1].anglepolaire, 1, s.couleur, '', '', 0, s.maxsegment);
          }
        }
      });
      T.optionsurfacesonde = false;
    }

    var t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return {
      segments: T.segments, normales: T.normales, angles: T.angles, surfacesOnde: T.surfacesOnde,
      nombreRayons: T.nombreRayons, tronque: T.tronque, dureeMs: t1 - t0
    };
  }

  OptGeo.tracerScene = tracerScene;
  OptGeo._calculesegment0 = calculesegment0;
  OptGeo.SURFACES = S;
})(typeof globalThis !== 'undefined' ? globalThis : this);
