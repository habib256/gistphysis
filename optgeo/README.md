# OptGeo web

Simulation d’optique géométrique à deux dimensions dans le navigateur, **d’après OptGeo 3.03 de Jean-Marie Biansan** (logiciel libre, licence GNU GPL version 2 ou ultérieure). Le moteur de calcul (tracé des rayons, objets, fichiers `.opt`) et l’interface sont portés en JavaScript ; les 56 exemples et l’aide d’OptGeo 3.03 sont repris.

L’application fonctionne sur tablette, téléphone et ordinateur, **sans Internet** et **sans rien envoyer** : aucune bibliothèque, aucune police, aucune ressource extérieure ; les fichiers et la sauvegarde automatique restent sur l’appareil.

## Lancer

Ouvrir `index.html`, en `file://` comme par un serveur web. Les exemples sont embarqués dans `js/interface/exemples-embarques.js` (pas de requête). `index.html#exemple=autocollimation.opt` ouvre directement un exemple ; si un travail est sauvegardé sur l’appareil, il n’est pas écrasé tant que l’exemple n’est pas modifié, et la boîte « Reprendre le travail en cours ? » propose d’y revenir (« Garder l’exemple » / « Reprendre »).

Dans le site, l’app est faite pour un cadre adaptatif (`"cadre": "ecran"`) : elle remplit exactement la fenêtre qu’on lui donne. Le bouton « Plein écran » n’apparaît que hors d’un cadre (dans le site, la page qui l’entoure le fournit).

## Ce qu’on peut faire

- **Tous les objets d’OptGeo** (palette en cinq familles, comme les barres d’outils d’OptGeo) : miroirs plan, sphériques idéaux et réels, coniques (concave, convexe) ; lame semi-réfléchissante ; écran, diaphragme, œil ; rayon, objet ponctuel réel et virtuel, onde plane ; lentilles minces, lentille épaisse, polygone, prisme, sphère, polycercle ; mesures de distance et d’angle, texte, trait/flèche, réseau, point. Chaque objet se construit point par point avec la consigne et l’aperçu d’OptGeo (au doigt : appuyer, viser avec la loupe, relâcher ; à la souris : un clic par point). Les petites boîtes d’OptGeo (nombre de rayons, de sommets, « Relier les points », diamètre, texte, style du point) arrivent au même moment.
- **Menu « Ajouter »** : création par coordonnées de tous les types (panneau pré-rempli).
- **Sélection et poignées** (signification d’OptGeo) : croix verte = translation, cercle bleu = point, disque rouge = rotation, croix cyan = foyer ou centre de courbure (ou bord du trou du diaphragme), croix jaune = sommet d’arc. Barre contextuelle : Propriétés, Dupliquer, Supprimer, Grouper avec…, Dissocier. Modes d’OptGeo gardés : Déplacer (toutes les poignées), Propriétés, Dupliquer, Supprimer, Grouper (« Terminer »).
- **Propriétés** de chaque objet : les champs des boîtes d’OptGeo, dans un panneau non modal ; erreurs sous le champ ; virgule ou point ; matériaux (`listen.lst`) ; aide d’origine de l’objet.
- **Affichage et options** : normales, angles, grille, attraction, longueurs des segments, coordonnées des segments (tableau, surlignage), segments fantômes (on touche le segment à cacher), empennage, surfaces d’onde, indices du milieu ambiant et longueurs d’onde, fond (couleur ou image de l’appareil), espace de travail (manuel, ajustement automatique), préférences (couleurs et épaisseurs par défaut, gardées sur l’appareil), contrôle des points trop proches.
- **Vue** : deux doigts (zoom et déplacement), molette, glisser dans une zone vide, boutons + / − / Tout voir, zooms ×1 à ×100.
- **Fichiers** : nouvelle simulation, ouvrir un `.opt` de l’appareil (avec son `.txt` de commentaire), ouvrir ou superposer un des 56 exemples, enregistrer (téléchargement d’un `.opt` lisible par OptGeo 3.03 et du `.txt`), export PNG (2000 px) et SVG (vectoriel), impression du dessin seul par le navigateur, copie de l’image (contexte sécurisé seulement). Sauvegarde automatique locale et proposition de reprise au chargement.
- **Annuler / Refaire** (50 niveaux, comme OptGeo), **clavier** : Échap, Ctrl+Z, Ctrl+Y ou Ctrl+Maj+Z, Ctrl+S (enregistrer), Ctrl+O, Ctrl+D, Ctrl+P, Ctrl+M, Ctrl+G, Ctrl+E, Ctrl+A, Suppr, flèches, + / − / 0 ; Alt et Ctrl pendant la construction pour aligner sur le point précédent.

## Fichiers

| Chemin | Rôle |
|---|---|
| `index.html`, `css/optgeo.css` | page et mise en page (paysage : palette à gauche ; portrait : en bas) |
| `js/moteur/` | moteur porté (voir `docs/MOTEUR.md`) |
| `js/interface/00-outils.js` | DOM, nombres à la française, couleurs nommées, matériaux, icônes SVG |
| `js/interface/10-poignees.js` | poignées d’OptGeo (couche d’adaptation au-dessus du moteur) |
| `js/interface/20-dessin.js` | dessin, vue, loupe, export PNG et SVG (contexte SVG) |
| `js/interface/30-creation.js` | construction point par point de chaque objet |
| `js/interface/40-proprietes.js` | panneau des propriétés de chaque objet |
| `js/interface/50-dialogues.js` | boîtes et fenêtres annexes (options, fichiers, exemples…) |
| `js/interface/60-app.js` | état, gestes, modes, menus, sauvegarde, clavier |
| `js/interface/exemples-embarques.js` | les 56 exemples (généré par `outils/embarquer-exemples.js`) |
| `aide/` | aide d’OptGeo portée (généré par `outils/porter-aide.py`) et `aide/web.html` |
| `tests/` | tests du moteur (`node optgeo/tests/tous.js`) et de l’interface |
| `docs/` | spécification de l’interface et documentation du moteur |

Le site n’a besoin ni de `tests/`, ni de `docs/`, ni de `outils/`.

## Tests

```sh
node optgeo/tests/tous.js                          # moteur
node optgeo/tests/verifier-interface.mjs           # interface, Chrome sans écran
node --experimental-websocket optgeo/tests/verifier-interface.mjs --firefox   # Chrome puis Firefox (Node 20)
```

Lancer les tests qui pilotent un navigateur un par un. `tests/SCENARIOS.md` fait le point sur les scénarios d’acceptation de la spécification.

## Écarts avec OptGeo 3.03 (voulus)

Glisser les poignées au lieu de « clic, déplacement, clic » ; Échap ou « Annuler » remet l’objet à sa place pendant un glisser ; zoom et déplacement de la vue permis pendant un mode ; Ctrl+S enregistre (OptGeo : supprimer) et Ctrl+Y refait ; angles saisis en degrés dans les propriétés (le fichier garde les radians) ; virgule acceptée ; boîtes qui restent ouvertes en cas d’erreur ; bouton « Annuler » dans toutes les petites boîtes ; indices d’un milieu créé : rouge 1,4 / vert 1,6 / bleu 1,8 par les deux chemins ; source ponctuelle créée au doigt : bords rangés pour couvrir le petit secteur ; duplication décalée de 5 % ; points trop proches = moins de 8 px à l’écran ; export PNG et SVG (pas de JPG ni de PostScript) ; impression du navigateur ; image de fond réduite pour tenir dans l’espace de travail ; pas de menu Langue, ni de base de registre, ni de répertoires.

## Crédits et licence

- OptGeo 3.03 : © Jean-Marie Biansan, GNU GPL version 2 ou ultérieure (sources, exemples, aide et images de l’aide).
- Portage web (moteur, interface, tests) : 2026, sous la même licence, GNU GPL version 2 ou ultérieure. Texte complet : `LICENSE.txt`.
