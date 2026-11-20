# OptGeo web — le moteur (`optgeo/js/moteur/`)

Portage JavaScript du **moteur** d'OptGeo 3.03 (simulation d'optique géométrique 2D, Jean-Marie Biansan, Lazarus/Free Pascal, licence **GNU GPL v2 ou ultérieure** ; le portage est sous la même licence). Ce document s'adresse à qui construit l'interface (voir aussi `SPEC-INTERFACE.md`) : modèle de données, API, correspondance avec le Pascal, écarts connus, tests.

Sources lues : `optgeo-amont/src/unit222.pas` (objets, tracé, dessin), `ray1.pas` (lecture/écriture `.opt`, options, superposition), `monbitmap.pas` (primitives de dessin), `definitions.pas`. L'impression et le PostScript ne sont pas portés (remplacés par un export d'image).

## 1. Fichiers et chargement

| Fichier | Rôle |
|---|---|
| `00-base.js` | Espace de noms `OptGeo`, constantes, couleurs `TColor` (BGR) ↔ CSS, utilitaires mathématiques et géométriques portés tels quels (angles polaires, `arccos` maison, intersections segment/segment, segment/cercle, cercle/cercle, point dans un polygone, listes « (1,3,5) » des prolongements virtuels). |
| `10-objets.js` | Registre `OptGeo.types` : les 26 types d'objets, leurs champs, valeurs par défaut, et `calculer(p, ctx)` = portage des `create`/`create2` (validation + géométrie dérivée), les `estou` (intérieur/extérieur/bord des milieux), `transformerParametres` (translation, rotation), `creerRayon`/`creerRayonEnfant`. |
| `20-scene.js` | `OptGeo.Scene` (options, objets, groupes, commentaire), édition (ajouter, modifier, supprimer, dupliquer, translater, tourner, grouper), sérialisation JSON, `OptGeo.Historique` (annuler/rétablir). |
| `30-trace.js` | `OptGeo.tracerScene(scene)` : portage de `calculesegment0` et de la partie calcul de `Rafraichit` (rayons, sources, ondes planes, rayons enfants, lumière blanche, surfaces d'onde, normales, angles). |
| `40-opt.js` | `lireOpt`, `ecrireOpt`, `superposerOpt`, `versOctets`, `depuisOctets`, `formatReel`. |
| `50-rendu.js` | `creerVue`, `dessinerScene` (Canvas 2D, aspect d'OptGeo), `rendreCanevas` (export image). |
| `60-interaction.js` | `poignees`, `objetSousPoint` (avec tolérance pour le doigt), `deplacerPoignee`, `distanceObjet`, `objetParDefaut`. |

Scripts **classiques** (pas de module ES : l'app s'ouvre aussi en `file://`), à charger **dans l'ordre des numéros** ; tout est rangé dans `globalThis.OptGeo`. Aucune dépendance, aucune ressource externe.

```html
<script src="js/moteur/00-base.js"></script>
<script src="js/moteur/10-objets.js"></script>
<script src="js/moteur/20-scene.js"></script>
<script src="js/moteur/30-trace.js"></script>
<script src="js/moteur/40-opt.js"></script>
<script src="js/moteur/50-rendu.js"></script>
<script src="js/moteur/60-interaction.js"></script>
```

En Node (tests), `tests/charger-moteur.js` exécute ces mêmes fichiers dans un contexte `vm`.

## 2. Démarrage rapide

```js
// Ouvrir un exemple
const octets = new Uint8Array(await (await fetch('exemples/Michelson/michelson8.opt')).arrayBuffer());
const { scene, avertissements } = OptGeo.lireOpt(OptGeo.depuisOctets(octets));

// Dessiner
const vue = OptGeo.creerVue(scene.options, canvas.clientWidth, canvas.clientHeight);
OptGeo.dessinerScene(canvas.getContext('2d'), scene, vue, { selection: [] });

// Éditer, retracer, redessiner
const hist = new OptGeo.Historique(scene);
const r = scene.ajouter('lmc', OptGeo.objetParDefaut(scene, 'lmc', 500, 300));
if (r.ok) hist.memoriser(); else alert(r.erreur);
OptGeo.dessinerScene(ctx, scene, vue);            // scene.tracer() est appelé et mis en cache

// Toucher au doigt : objet / poignée sous le point
const [x, y] = vue.versMonde(ev.offsetX, ev.offsetY);
const cible = OptGeo.objetSousPoint(scene, x, y, vue.pixelsEnMonde(14));

// Enregistrer (texte CRLF ; octets UTF-8) + commentaire dans un .txt à part
const blob = new Blob([OptGeo.versOctets(OptGeo.ecrireOpt(scene))], { type: 'text/plain' });
```

## 3. Modèle de données

### 3.1 Repère, unités, couleurs

- Repère **monde** d'OptGeo : axe y **vers le haut**, angles en **radians**, sens direct. Les longueurs sont dans l'unité de la scène (`options.unitelongueur`, « mm » par défaut), sans conversion.
- Les longueurs d'onde (`longueur_donde_*`) et le pas des réseaux (`pas`) sont en **mètres** (1e-6 = 1000 traits/mm).
- Couleurs : entiers `TColor` de Lazarus, octets **BGR** (`0x0000FF` = rouge). `OptGeo.couleurCss(tcolor)` → `"#rrggbb"` ; `OptGeo.couleurDepuisCss('#ff0000')` → `255`. Les couleurs système négatives (ex. `-2147483640` = clWindowText) sont rendues en noir. `OptGeo.couleurs` : `clBlack, clRed (255), clGreen (32768), clBlue (16711680), clAqua, clFuchsia, clWhite…`
- Couleur d'un rayon : rouge, vert ou bleu (indice et longueur d'onde correspondants), ou **noir = lumière blanche** (décomposée en rouge, vert, bleu dès qu'un milieu est dispersif ou qu'il y a un réseau ; sinon tracée en noir avec l'indice « vert »).
- Épaisseurs (`epaisseur`) en pixels.

### 3.2 Options de la scène (`scene.options`)

Toutes sont écrites dans le `.opt` sauf les trois dernières.

| Champ | Sens | Défaut |
|---|---|---|
| `xxmin, xxmax, yymin, yymax` | espace de travail | 0, 1000, 0, 700 |
| `respectrapport` | même échelle en x et y | `true` |
| `unitelongueur` | unité affichée | `'mm'` |
| `tracergrille, attractiongrille, grillex, grilley` | grille (points) et attraction (l'attraction est à faire dans l'interface) | non, non, 50, 30 |
| `optionnormale, optionangles` | normales aux points d'incidence ; angles d'incidence/réfraction | oui ; non |
| `pourcentagenormale, couleurnormale, epaisseurnormale, decimalesangles` | longueur des normales (fraction de la diagonale), couleur, épaisseur, décimales des angles | 0,05 ; noir ; 1 ; 0 |
| `fantomespresents, listefantomes` | segments fantômes (cachés) : liste « (2,5,9) » de numéros de segments | non ; '' |
| `maxrayonsrecherchesurfacesonde` | nombre de points par surface d'onde | 20 |
| `indice_rouge/vert/bleu_par_defaut` | indice du milieu ambiant | 1 |
| `longueur_donde_red/blue/green` | longueurs d'onde (m) | 632e-9, 450e-9, 520e-9 |
| `couleurfondsimulation` | fond | blanc |
| `positionempennage, tailleempennage` | position (‰ du segment) et taille des petites flèches des rayons | 500, 5 |
| `afficher_longueurs_segments` | longueur écrite sur chaque segment | non |
| `versionfichier` | version du fichier lu (l'écriture met toujours 301) | 301 |
| `largeurEcranPx, hauteurEcranPx` | *non écrit* : taille d'écran supposée pour `taillemini` (taille minimale d'un objet = 2 px / 10, comme `tform1.taillemini`) | 1000, 700 |
| `desactiverControle` | *non écrit* : préférence « désactiver le contrôle des points trop proches » | `false` |

Après une modification directe de `scene.options` ou `scene.objets`, appeler `scene.invalider()` ; préférer `scene.modifierOptions({...})`, qui refuse un espace de travail dont un objet sortirait (comme `retaille_espace_possible`).

### 3.3 Les objets

Un objet est `{ id, type, ...paramètres }` ; les paramètres sont **exactement les champs du `.opt`** (noms Pascal). L'ordre de `scene.objets` donne, pour chaque type, l'ordre des listes Pascal (ordre d'écriture et de tracé, donc numérotation des segments fantômes). `OptGeo.types[type]` donne `libelle`, `md` (nom Pascal `TTypeElementModif`), `champs`, `defauts`, et les points/vecteurs/angles transformés par translation et rotation.

| `type` | Objet (md) | Paramètres |
|---|---|---|
| `miroirplan` | Miroir plan (mdmiroirplan) | `a1x a1y a2x a2y epaisseur couleur hachures` |
| `reseau` | Réseau (mdreseau) | `a1x a1y a2x a2y epaisseur couleur pas entransmission hachures ordre_min ordre_max` |
| `mscopa` / `mscepa` | Miroir sphérique concave / convexe **paraxial** (« idéal ») | `a1x a1y a2x a2y focale epaisseur couleur couleuraxe hachures axefocal trou diametretrou` (trou : longueur) |
| `mscore` / `mscere` | Miroir sphérique concave / convexe **réel** | `a1x a1y a2x a2y rayoncourbure epaisseur couleur couleuraxe hachures axefocal aigu trou diametretrou` (trou : **angle** en rad) ; `aigu` choisit l'arc (petit/grand) |
| `lmc` / `lmd` | Lentille mince convergente / divergente | `a1x a1y a2x a2y focale epaisseur couleur couleuraxe axefocal` (focale > 0 dans les deux cas) |
| `lec` | Lentille épaisse | `s1x s1y s2x s2y r1 r2 diametre couleurfond couleuraxe axefocal indicerouge indicebleu indicevert reflechientrant reflechisortant` (rayons algébriques) |
| `rayon` | Rayon | `ax ay kx ky couleur epaisseur nombremaxenfant vav vaa maxsegment` |
| `sourceponctuelle` | Source ponctuelle (objet réel ou virtuel) | `nombrederayon sx sy a1x a1y a2x a2y couleur epaisseur maxenfantparrayon vav vaa sourcevirtuelle tracersurfacesonde listechemins maxsegment` |
| `ondeplane` | Onde plane | `nombrederayon sx sy a1x a1y a2x a2y couleur epaisseur maxenfantparrayon vav vaa tracersurfacesonde listechemins maxsegment` (s : point donnant la direction depuis a1 ; a2 est recalculé perpendiculaire) |
| `ecran` | Écran (absorbe) | `a1x a1y a2x a2y epaisseur couleur` |
| `diaphragme` | Diaphragme | `cx cy anglepolaire rint rext epaisseur couleur` |
| `lsr` | Lame semi-réfléchissante | `a1x a1y a2x a2y epaisseur couleur` |
| `polyhedre` | Polyèdre (polygone) réfractant | `sommets:[{x,y}…] indicerouge indicebleu indicevert couleurbord couleurfond reflechientrant reflechisortant` |
| `prisme` | Prisme isocèle | `gx gy ax ay bx by` (centre de gravité, sommet, un sommet de base) + milieu |
| `polycercle` | Polycercle (« polysphère ») | `sommets:[{x,y}] mess:[{x,y}] rectiligne:[bool]` + milieu (`mess[i]` : point de l'arc du côté i) |
| `sphere` | Sphère (disque) réfractante | `cx cy rayon` + milieu |
| `miroirconique` | Miroir conique (parabole, ellipse, hyperbole) | `fx fy excentricite parametre theta0 theta1 theta2 couleur couleuraxe hachures axefocal concave` (r = p / (1 + e cos(θ − θ0)) depuis le foyer) |
| `texte` | Texte (mdtexteaffiche) | `texte x y policecharset policecolor policename policesize policefsbold policefsitalic policefsunderline policefsstrikeout policepitch` |
| `angle` | Mesure d'angle | `cx cy a1x a1y a2x a2y` |
| `fleche` | Trait / flèche | `a1x a1y a2x a2y epaisseur couleur ext1 ext2 styletrait taille1 taille2` (`ext` ∈ `OptGeo.EXTREMITES`, `styletrait` ∈ `OptGeo.STYLES_TRAIT`) |
| `oeil` | Œil (absorbe) | `cx cy ax ay epaisseur couleur` |
| `metre` | Mesure de distance | `a1x a1y a2x a2y` |
| `jolipoint` | Point | `a1x a1y taille epaisseur couleur style` (`OptGeo.STYLES_POINT`) |

Codes « réfléchi » des milieux (`OptGeo.REFLECHI`, codes du fichier) : **1** toujours, **2** jamais, **3** si réfracté, **4** si pas réfracté (réflexion totale). « Entrant » s'applique au rayon qui entre dans le milieu, « sortant » au rayon qui en sort, pour tous les milieux et toutes les faces (voir §6, point 21). Avec « toujours » ou « si réfracté », le rayon réfléchi partiel est un **rayon enfant** (limité par `nombremaxenfant`).

**Milieu neuf** (polyèdre, polycercle, lentille épaisse, sphère, prisme : `types[t].defauts`, utilisés par `scene.ajouter` pour tout champ absent, donc aussi pour `objetParDefaut`) : comme une création à la souris dans OptGeo (`ray1.pas` 1303, 1376, 1489, 1696, 1723, 2858 ; `saisiesphere.lfm`, `ItemIndex = 1`) — **n rouge 1,4, n vert 1,6, n bleu 1,8** (milieu dispersif : un milieu neuf décompose la lumière blanche) et réflexion **« jamais » des deux côtés** (entrant 2, sortant 2) : sans réflexion totale tant qu'on ne choisit pas « si pas réfracté ». Un fichier `.opt` garde toujours ses propres valeurs.

`vav` / `vaa` : listes « (1,3) » des numéros de segments du rayon dont on trace le **prolongement virtuel avant / arrière** (pointillés jusqu'au bord). Un rayon enfant reçoit les listes décalées du nombre de segments déjà tracés.

Validation : `scene.ajouter/modifier/translater/tourner` refusent (sans rien changer) un objet invalide — hors de l'espace de travail, trop petit, sommets qui se coupent… — et renvoient `{ok:false, erreur}`. Certains paramètres sont **normalisés** à la création comme dans OptGeo (ordres du réseau remis dans l'ordre, focale en valeur absolue, diamètre d'une lentille épaisse réduit, a2 de l'onde plane, angles du miroir conique ramenés dans [0, 2π[, points de contrôle des côtés droits d'un polycercle) : relire l'objet après coup.

### 3.4 Groupes

`scene.groupes = [{ membres: [id…] }]`. Dans le `.opt` : couples (indice dans la liste du type, nom md). `scene.grouper(ids)`, `scene.degrouper(i)`, `scene.groupesDe(id)`. Un groupe se déplace avec `scene.translater(groupe.membres, dx, dy)` (tout ou rien, comme `groupe.translate`) ; `scene.centre(ids)` = isobarycentre (`recalculeiso`).

## 4. API

### 4.1 `OptGeo.Scene`

| Méthode | Rôle |
|---|---|
| `new OptGeo.Scene(options?)` | scène vide (options complétées par les valeurs par défaut) |
| `ajouter(type, params)` → `{ok, id, erreur}` | ajoute (params complétés par `types[type].defauts`) |
| `modifier(id, changements)` → `{ok, erreur}` | change des paramètres |
| `supprimer(id)` ; `dupliquer(id, dx, dy)` | — |
| `translater(ids, dx, dy)` ; `tourner(ids, angle, cx?, cy?)` | tout ou rien ; centre par défaut : isobarycentre |
| `objet(id)`, `parametres(id)` (copie), `geometrie(id)` (géométrie dérivée : foyers, centres, normales, `estou`…), `objetsDuType(type)` | lecture |
| `grouper(ids)`, `degrouper(i)`, `groupesDe(id)`, `centre(ids)` | groupes |
| `modifierOptions(changements)` → `{ok, erreur, ids}` | options (refus si l'espace devient trop petit) |
| `tracer()` | résultat du tracé (mis en cache jusqu'à la prochaine modification) |
| `contexte()` | `{xxmin…yymax, taillemini, desactiverControle}` |
| `versJSON()`, `Scene.depuisJSON(j)`, `cloner()`, `restaurer(j)`, `invalider()` | sérialisation |
| `unMilieuDispersif()` | — |

`new OptGeo.Historique(scene, max=100)` : `memoriser()` après chaque action réussie, `annuler()`, `retablir()`, `peutAnnuler()`, `peutRetablir()` (instantanés JSON, comme `sauvevirtuel`).

### 4.2 Tracé : `OptGeo.tracerScene(scene, {surfacesOnde})` (ou `scene.tracer()`)

Renvoie :
- `segments` : `{a1x, a1y, a2x, a2y, ap (angle polaire), epaisseur, couleur, virtuelavant, virtuelarriere, fantome}` dans **l'ordre de calcul d'OptGeo** (rayons, puis sources, puis ondes planes, puis rayons enfants dans l'ordre de leur naissance) : le n-ième segment (à partir de 1) est celui que vise `listefantomes`.
- `normales` (pointillés tiret-point), `angles` (`{cx,cy,a1x,a1y,a2x,a2y}`, si `optionangles`), `surfacesOnde` (pointillés).
- `nombreRayons`, `tronque` (garde-fou de 300 000 segments atteint), `dureeMs`.

Les surfaces d'onde (`tracersurfacesonde` + `listechemins` = chemins optiques séparés par des espaces) ne sont calculées que s'il n'y a **ni lentille mince ni miroir paraxial** (comme dans OptGeo) ; sources virtuelles exclues.

### 4.3 Fichiers

- `OptGeo.lireOpt(texte, {strict, options})` → `{scene, avertissements, nonPrisEnCharge}`. Par défaut un objet invalide est écarté avec un avertissement ; `strict:true` lève une erreur « Fichier endommagé » comme OptGeo. Toutes les versions de fichier sont lues (anciens fichiers sans « Nombre maximal de segments »).
- `OptGeo.ecrireOpt(scene)` → texte (CRLF, VERSION 301, réels « ␣1.9160000000000000E+0003 »). Le **commentaire** (`scene.commentaire`) n'est pas dans le `.opt` : OptGeo l'écrit dans un `.txt` de même nom.
- `OptGeo.superposerOpt(scene, texte, {ecraserOptions})` : « Superposer une simulation ».
- `OptGeo.depuisOctets(octets)` : UTF-8 si valide, sinon Windows-1252. `OptGeo.versOctets(texte, 'utf-8'|'windows-1252')`. Les exemples d'OptGeo 3.03 sont en UTF-8 (vérifié avec `file`) ; écrire en UTF-8.

### 4.4 Rendu

- `OptGeo.creerVue(options, largeurPx, hauteurPx, {zoom, cx, cy, marge, respectrapport})` → `{versEcran(x,y), versMonde(px,py), pixelsEnMonde(n), sx, sy, zoom, zoomfactor}`. `zoom` = 1 : tout l'espace visible ; `cx, cy` = centre visé (déplacement de la vue).
- `OptGeo.dessinerScene(ctx, scene, vue, {trace, fond, selection:[ids], numerosSegments, horsEspace})` : ordre de dessin de `Rafraichit` (milieux, miroirs, lentilles…, textes, angles, surfaces d'onde, normales, rayons avec empennage et prolongements virtuels, longueurs). Pour un écran HiDPI, faire `ctx.scale(devicePixelRatio, …)` avant et passer la taille CSS à `creerVue`.
- `OptGeo.rendreCanevas(scene, l, h, {echelle})` → canevas pour un export PNG.
- `OptGeo.policeTexte(g)` → `{px, css}` : police Canvas d'un texte ; taille positive en points (× 96/72 px), taille négative = hauteur en pixels (voir §6, point 25).
- Particularités reprises : un trait n'est dessiné que si ses deux extrémités sont dans l'espace de travail ; hachures, flèches des lentilles et empennage ont une taille en fraction de la diagonale divisée par `zoomfactor` (= arrondi de `vue.zoom`).

### 4.5 Interaction

- `OptGeo.poignees(scene, id)` → `[{nom, x, y, role}]` (`role` : `'point'` déforme, `'translation'` déplace l'objet). Noms : `a1, a2, centre` (segments), `foyer` (miroirs paraxiaux), `f1, f2` (lentilles), `depart, direction` (rayon), `source` (source), `direction` (onde plane), `sommetN`/`arcN` (polyèdre, polycercle), `sommet, base` (prisme), `bord` (sphère), `s1, s2` (lentille épaisse), `sommet, foyer` (conique), `a` (œil).
- `OptGeo.objetSousPoint(scene, x, y, tol)` → `{id, poignee|null, distance}` ou `null` ; poignées prioritaires, puis le tracé (intérieur compris pour les milieux). Tolérance au doigt : `vue.pixelsEnMonde(12 à 16)`.
- `OptGeo.deplacerPoignee(scene, id, nom, x, y)` → `{ok, erreur}` (passe par `scene.modifier`, donc refus si invalide). Polycercle, comme OptGeo (`unit222.pas` 22374-22598) : le point d'un arc (`arcK`) est **projeté sur la médiatrice** de sa corde ; un sommet déplacé recalcule le point des arcs voisins (côtés i−1 et i) sur la médiatrice de leur nouvelle corde, du même côté, avec une flèche proportionnelle à la corde (rapport flèche / corde, donc angle au centre, conservé). C'est une version **simplifiée** des comportements de souris d'OptGeo ; pour reproduire exactement les poignées décrites dans `SPEC-INTERFACE.md` §9 (rotation autour du centre, Alt/Ctrl…), l'interface peut composer `modifier`, `translater` et `tourner`.
- `OptGeo.distanceObjet(scene, id, x, y)`, `OptGeo.objetParDefaut(scene, type, x, y)` (paramètres d'un objet neuf valide, pour les boutons « Ajouter »).
- Création d'objets à partir de points cliqués : `OptGeo.types.miroirconique.depuisPoints(fx, fy, sx, sy, a1x, a1y, a2x, a2y)` (`MiroirConique.create`), `OptGeo.types.diaphragme.depuisPoints(cx, cy, a1x, a1y, a2x, a2y)` (`diaphragme.create`) ; pour les autres types, les paramètres sont directement les points cliqués (ou s'en déduisent simplement : focale = distance du foyer au centre…).

## 5. Correspondance Pascal → JavaScript

| Pascal (`unit222.pas` sauf mention) | JavaScript |
|---|---|
| constantes 13–35, `maximum`, `minimum`, `partieentiere`, `puissance` 1447–1485, `DonneAnglePolaireDansPiPi/02Pi` 1513–1560, `arccos` 3152 | `00-base.js` (`OptGeo.constantes`, `OptGeo.math`) |
| `IsPointInPolygon` 1066, `Le_point_est_il_sur_une_droite` 1108, `les_deux_cercles_se_coupent_ils` 1124, `Le_segment_et_le_cercle_se_coupent_ils` 1319, `Les_deux_segments_se_coupent_ils` 1422 | `00-base.js` |
| tests `pos(','+i+',')…` des listes vav/vaa ; `rayon.createenfant` (listes décalées) | `M.jetonsListe`, `M.decalerListe` |
| `MiroirPlan/Reseau/Ecran/lsr.create` 25817–25928 ; `Mscopa/Mscepa.create2` 27352/27392 ; `Mscore/Mscere.create2` 26061/26239 ; `lmc/lmd.create2` 27240/27278 ; `lec.create` 26344 | `10-objets.js`, `T.<type>.calculer` |
| `rayon.create/createenfant` 27441/27479 ; `SourcePonctuelle.create` 27527 ; `OndePlane.create` 27661 | `OptGeo.creerRayon`, `OptGeo.creerRayonEnfant`, `T.sourceponctuelle/ondeplane.calculer`, `OptGeo.lireChemins` |
| `diaphragme.create/create2` 2577/2901 ; `oeil.create` 2606 ; `texteaffiche.create` 3044 ; `MiroirConique.create2/create` 3170/3248 ; `angle.create` 37028 ; `metre.create` 37054 ; `JoliPoint.create` 25764 ; `fleche.create` 25792 | `10-objets.js` (`depuisPoints` pour `create`) |
| `polycercle.create` 38627, `prisme.create` 39458, `Polyhedre.create` 39585, `sphere.create` 40016 ; `estou` : polycercle 38084, polyhedre 39711, prisme 39778, lec 39839, sphere 40003 ; `dispersif` | `10-objets.js` (`g.estou`, `g.dispersif`) |
| `Groupe` (add, recalculeiso, translate) 1561–1930 | `Scene.grouper`, `Scene.centre`, `Scene.translater` |
| `calculesegment0` 32064–36312 | `30-trace.js`, `calculesegment0` (même ordre des surfaces : bords, miroirs plans, écrans, diaphragmes, lames, réseaux transmission puis réflexion, miroirs paraxiaux, lentilles minces, coniques, miroirs réels concaves, œil, miroirs troués, sphères, lentilles épaisses, bords des lentilles, miroirs réels convexes, polyèdres, prismes, polycercles) |
| `sourceponctuelle.calculesegment` 32008, `ondeplane.calculesegment` 32036, `Rafraichit` 3618 (partie calcul), `unmilieudispersif` 3601 | `tracerScene`, `lancer` |
| `DessineTousLesSegments` 31082 ; `Rafraichit` (ordre de dessin) ; `*.dessine` (miroirplan 31672, reseau 28383, ecran 28604, lsr 29316, mscopa 29438, lmc 29642, lmd 29850, mscepa 30058, mscore 30267, mscere 30473, polyhedre 30684, prisme 30826, polycercle 39057, sphere 40038, lec 26639, miroirconique 3322, oeil 2662, diaphragme 2926, texteaffiche 3072, JoliPoint 27749, fleche 28079, angle 28716 et dessinebis 28913, metre 29078, OndePlane 31864) | `50-rendu.js` (`OptGeo.dessinateurs`) |
| `monbitmap.pas` : `Trait`, `cercle`, `disque`, `arcdecercle`, `tracepolygone`, `dessinergrille`, `ecrireI` | `50-rendu.js`, classe `Dessin` |
| `ray1.pas` : `enregistrer` 7555, `Ouvrirsimulation` 8173, `SuperposeSimulation` 9198, `metazero` 7324, `taillemini` 5659, initialisation `unit222.pas` 40180–40264 | `40-opt.js`, `20-scene.js` (`optionsParDefaut`, `contexte`) |
| `sauvevirtuel` / `charge_virtuel` (annuler) | `OptGeo.Historique` |
| `TraiteModif`, `DebutModif`, `FinModif` (souris) | remplacés par `60-interaction.js` (API sans DOM) |

## 6. Écarts et doutes

Principe : la physique et les particularités de l'original sont **conservées** ; ce qui suit liste ce qui paraît être un défaut de l'original (gardé) et les rares écarts (nécessaires ou de robustesse).

**Comportements d'origine conservés, probablement des défauts :**
1. *(Corrigé, voir point 20.)*
2. *(Corrigé, voir point 21.)*
3. `lec.estou` compare la distance à l'axe au **diamètre** (et non au demi-diamètre) ; pour une lentille épaisse biconcave, un terme `(y − c2y)(s2x − s1x)` au lieu de `(s2y − s1y)`.
4. Miroir paraxial concave troué, seconde moitié : `lambda` calculé avec `a1x` au lieu de `t2x` quand |kx| > |ky| (ne sert qu'au test lambda > 0).
5. Rayon tangent à un arc (discriminant exactement nul) : `lambda` a le mauvais signe et l'angle `tata` garde sa valeur précédente.
6. `Les_deux_segments_se_coupent_ils`, cas colinéaire mal écrit. Conservé. (`les_deux_cercles_se_coupent_ils` : voir point 22.)
7. Lentille mince convergente et surfaces d'onde : `distancecentre` non recalculé ; sans effet puisque les surfaces d'onde ne sont pas tracées en présence de lentilles minces ou de miroirs paraxiaux.
8. `groupe.add` ne teste les doublons que sur le dernier élément (sans effet ici : les groupes sont des listes d'identifiants).
9. Onde plane (a2 recalculé) et miroir conique (angles ramenés dans [0, 2π[) : chaque création peut décaler la valeur d'environ 1e-15 (vrai aussi dans l'original).

**Écarts :**
10. **Lumière blanche sans décomposition** (rayon noir sans milieu dispersif ni réseau) : l'original laisse l'indice et la longueur d'onde **non initialisés** ; ici indice « vert » et λ vert (même indice pour les trois couleurs dans ce cas, donc même résultat physique). Aucun exemple n'est concerné.
11. Réseau : un ordre dont la création échoue (`createenfant` faux, départ hors de l'espace) est tracé quand même par l'original avec un angle indéterminé ; ici il est ignoré.
12. Précision : `extended` (80 bits) → `double` (64 bits). Les cas limites (rayon passant exactement par un sommet, tangence) peuvent différer.
13. Lecture : par défaut un objet invalide est **écarté avec un avertissement** au lieu de faire échouer tout le fichier (`{strict:true}` pour l'original). Nombres collés (« …E+0002-6.0… ») acceptés.
14. Écriture : l'original colle certains nombres sans séparateur (réseau, `rint rext` du diaphragme, pas de la grille) — illisible si le second est négatif ; ici une espace est ajoutée devant un nombre négatif (relu sans problème par OptGeo). Chiffres : écriture décimale la plus courte qui redonne le même double, complétée de zéros (`4.1222444889779560E+0002` là où OptGeo avait `…559`, même valeur).
15. Chemins optiques des surfaces d'onde : `StrToFloat` dépend du séparateur décimal du système ; on accepte « . » et « , ». Une liste terminée par une espace faisait boucler l'original indéfiniment ; ici on s'arrête.
16. `maxrayonsrecherchesurfacesonde < 2` : division par zéro dans l'original ; ici pas de surface d'onde. Garde-fou de 300 000 segments (absent de l'original).
17. `taillemini` dépend de la taille de la fenêtre dans OptGeo ; ici d'une zone supposée de 1000 × 700 px (options `largeurEcranPx/hauteurEcranPx`, à mettre à la taille réelle du canevas si l'on veut le même seuil).
18. Rendu : les remplissages de la lentille épaisse, du polycercle et de la pupille de l'œil (cordes combinées en XOR sous Windows) sont remplacés par le remplissage exact du contour ; motifs de pointillés et polices approchés (« Arial Narrow » si disponible) ; poignées de sélection dessinées simplement (option `selection`) ; `Rafraichit` redessinait en pointillés, avant chaque point de surface d'onde, le dernier segment de la liste (invisible, recouvert ensuite) : non reproduit.
19. Superposition : les groupes du fichier superposé ne sont pas repris (un groupe est créé avec tous les objets importés, comme dans l'original).

**Défauts de l'original corrigés à la demande de l'enseignant (2026-11-20)** — la physique diffère ici d'OptGeo 3.03 :

20. **Prisme, normale du côté 3** (C → A). `unit222.pas:39554` (`prisme.create`) : `if anglepolaire[nombresommet]>Pi then anglepolaire[nombresommet]:=anglepolaire[i]-Pi*2`, avec `i` = 2 (variable de la boucle précédente) au lieu de `nombresommet` : le côté 3 prend l'angle du côté 2, donc normale, réfraction et réflexion fausses sur ce côté quand la direction C → A a un angle polaire entre π et 3π/2, soit, à partir d'un prisme pointe en haut, pour des rotations d'environ **60° à 150°** (prisme équilatéral) ou **69° à 158°** (prisme du relecteur, plus pointu) — la relecture indépendante a mesuré 13,68° d'écart sur le rayon émergent à 73° et 128°. Corrigé : `anglepolaire[3] − 2π` (`10-objets.js`, `T.prisme.calculer`). Test : `physique.js`, prisme tourné de 0 à 360° par pas de 0,25°, 8 640 rayons comparés à un calcul de Snell indépendant face par face (avant correction : 1 436 rayons faux, rotations de 60,25° à 149,75°).
21. **Lentille épaisse et faces circulaires des polycercles : réglages « réfléchi entrant / sortant » inversés.** `unit222.pas` 34343-34388 et 34680-34723 (faces 1 et 2 de la lentille épaisse), 36110-36154 (arcs de polycercle) : quand le point juste après l'impact est **à l'intérieur** (rayon qui entre), l'original applique `reflechisortant`, et `reflechientrant` sinon — l'inverse des libellés « Rayon réfléchi (sens entrant / sortant) » (`saisiecercle.lfm`, `saisiesphere.lfm`), des côtés droits (polyèdre, prisme, côtés droits des polycercles : `unit222.pas` 35281/35312, 35536/35567, 35787/35818) et de la sphère (34019/34052). Conséquence dans l'original : avec entrant = jamais et sortant = si pas réfracté, une réflexion totale à l'intérieur d'une lentille épaisse arrêtait le rayon. Corrigé (`30-trace.js`, `faceCirculaire`) : partout, « entrant » pour le rayon qui entre, « sortant » pour le rayon qui sort. Test : `physique.js`, réflexion totale d'un rayon qui sort et réflexion partielle d'un rayon qui entre, pour les 16 combinaisons des deux réglages, sur les faces 1 et 2 d'une lentille épaisse, un arc et un côté droit de polycercle, une sphère et un polyèdre.

Aucun des 56 exemples ne trace différemment après ces deux corrections (segments comparés un à un avant / après) : le seul prisme (`Exemples_Classiques/dispersion_prisme.opt`) a la pointe en haut (axe à 90,1°), et toutes les lentilles épaisses et tous les polycercles des exemples ont « jamais » des deux côtés (codes 2, 2).

**Écarts de robustesse et défauts du portage corrigés :**

22. `les_deux_cercles_se_coupent_ils` (`unit222.pas:1124`, validation des polycercles à plusieurs arcs) : l'original élimine x en divisant par y0 − y1 ; en double (64 bits au lieu des 80 bits de Pascal), ce calcul perd ses chiffres quand les centres sont presque à la même hauteur (écart des points calculés à leurs cercles : 1e-6 dès |y0 − y1| = 0,01 |x0 − x1|, plusieurs centaines d'unités vers 1e-7 |x0 − x1|) : une lentille biconvexe en polycercle d'axe horizontal tournée de 1e-9°, 3e-8°, 1e-7° ou 3e-7°, ou dont deux sommets sont décalés de 1e-9, était refusée (« Deux côtés circulaires se coupent ») ; et des arcs qui se croisent étaient acceptés quand y0 = y1 exactement (cas qui lève une exception dans l'original, donc création refusée). Remplacé par la forme vectorielle (a = (r0² − r1² + d²) / 2d sur la ligne des centres, h = √(r0² − a²) de part et d'autre), sans division par y0 − y1 ; y0 = y1 donne le bon résultat ; cercles concentriques : aucun point commun si r0 ≠ r1, refus si deux arcs d'un même cercle se recouvrent. Ailleurs, résultat inchangé : sur près d'un million de paires de cercles tirées au hasard (|y1 − y0| ≥ 0,001 |x1 − x0|), même nombre de points communs sur les arcs que l'ancienne formule ; la nouvelle est plus précise (écart aux cercles ≤ 5e-12 quelle que soit l'orientation). Les 56 exemples se lisent et tracent à l'identique. Tests : `api.js`.
23. **Valeurs par défaut des milieux neufs** : le portage mettait n = 1,5 pour les trois couleurs et réflexion (entrant 2, sortant 4) ; OptGeo crée un milieu avec 1,4 / 1,6 / 1,8 (rouge / vert / bleu) et « jamais » des deux côtés (§3.3). Corrigé ; la lecture des fichiers n'est pas concernée.
24. **Poignées du polycercle** : `deplacerPoignee` posait le point d'arc tel quel (hors de la médiatrice, alors que `polycercle.create` le suppose dessus : sommets jusqu'à 8,5 unités hors de leur cercle, arc dessiné entre de mauvaises extrémités, rayons qui fuyaient) et ne recalculait pas les arcs voisins d'un sommet déplacé. Reprend maintenant les deux calculs d'OptGeo (§4.5). Tests : `api.js` (sommets sur leur cercle à 1e-9 près après chaque déplacement, rapport flèche / corde conservé, projection sur la médiatrice, rayon horizontal qui ressort par l'arc).
25. **Texte de taille de police négative** (2026-11-21) : dans un `.opt`, la taille d'un texte est la propriété `Size` d'une `TFont` Delphi/Lazarus ; positive, elle est en points ; négative, c'est la hauteur des caractères en pixels (textes à −8 de `Reseaux/reseau_en_reflexion.opt` et `reseau_en_transmission.opt`). Le portage écrivait « -11px » dans la police Canvas, police invalide ignorée par le navigateur : ces textes prenaient la police du dessin précédent (et 10 px dans l'export SVG). `OptGeo.policeTexte(g)` → `{px, css}` donne maintenant |taille| px pour une taille négative et taille × 96/72 px pour une taille positive (inchangé) ; elle sert au dessin (`D.texte`, donc aussi aux exports PNG et SVG) et à la détection du texte touché dans l'interface. La valeur lue (`policesize`) n'est pas modifiée et se réécrit telle quelle ; le panneau de propriétés affiche l'équivalent en points (−8 → 6 points, soit 8 px). Tests : `api.js` (police produite pour −8, −13, −1, 6 à 72 points ; dessinateur factice ; tailles des deux exemples gardées à la lecture et à l'écriture, polices valides).

**Non porté** : impression et PostScript (export PNG à la place), image de fond (non enregistrée dans le `.opt`), préférences (`optgeo.cfg` : couleurs par défaut des nouveaux objets — les défauts d'`unit222.pas` sont dans `types[t].defauts`), aide, traductions, boîtes de saisie (rôle de l'interface), attraction de la grille (à faire dans l'interface : arrondir les coordonnées au multiple de `grillex/grilley`).

## 7. Tests

```sh
node optgeo/tests/tous.js        # exemples.js + physique.js + api.js
node optgeo/tests/capture.js /chemin/sortie   # captures Chrome sans interface (macOS)
```
`tests/rendu.html` (servi par un serveur local, ex. `python3 -m http.server` dans `optgeo/`) dessine tous les exemples (`?de=0&a=12`) ou un seul (`?ex=…&l=1000&h=640&repete=30` pour mesurer le temps de dessin) ; en `file://`, choisir un fichier.

- `exemples.js` : les 56 exemples se lisent en mode strict (aucun objet refusé, aucune ligne inconnue), se tracent sans exception ni garde-fou, coordonnées finies et dans l'espace ; aller-retour `.opt` (mêmes objets, options, tracé ; à 1e-9 près à cause du point 9) ; aller-retour JSON ; temps de tracé.
- `physique.js` : valeurs attendues calculées indépendamment — prisme tourné de 0 à 360° (Snell face par face, normale du côté 3), prisme neuf dispersif, réglages « réfléchi entrant / sortant » de chaque milieu (16 combinaisons), Snell (6 angles) et sortie, réflexion totale de part et d'autre de l'angle limite, lentilles minces convergente/divergente (relation de conjugaison et grandissement, images réelles et virtuelles), miroir plan, miroir paraxial (1/p + 1/q = 1/f), miroir sphérique réel (CP = R/(2 cos α) exact), parabole et ellipse (stigmatisme rigoureux), prisme (déviation minimale), réseaux en transmission et en réflexion (3 longueurs d'onde, 3 incidences, nombre d'ordres), dispersion, sources ponctuelles (réelle, virtuelle), onde plane, surface d'onde (chemin optique comparé à un minimum de Fermat calculé à part), lame semi-réfléchissante, écran, diaphragme, œil, sphère, prolongements virtuels, fantômes.
- `api.js` : les 26 types (dont ceux absents des exemples : miroir convexe réel, mesure de distance, point, groupes) écrits puis relus au bit près, normalisations, formats, encodages, lecture permissive/stricte, édition, groupes, annuler/rétablir, poignées et objet sous le doigt, superposition, objets par défaut et valeurs par défaut des milieux neufs, poignées du polycercle (sommets et arcs), validation des polycercles à deux arcs (448 angles, petits décalages, cas y0 = y1, comparaison avec la formule de l'original).
