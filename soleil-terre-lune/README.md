# Soleil, Terre, Lune

Application web pour observer le système Soleil-Terre-Lune au collège (6e et 5e) : jour et nuit, saisons, phases de la Lune, éclipses. Elle accompagne les cours « Vitesse et mouvement » (6e, partie « Jour/nuit et saisons »), « Le système Soleil-Terre-Lune » (5e) et « Sources de lumière » (5e) du site du collège Thérésien Cadet (La Réunion).

L’app ne donne jamais la conclusion : chaque partie a un bouton « Consignes » (étapes d’observation) et l’élève conclut lui-même.

## Parties (menu, ou lien `index.html#partie`)

| Lien | Partie | Ce que l’on fait |
|---|---|---|
| `#jour-nuit` | Jour et nuit | La Terre vue au-dessus du pôle Nord (ou Sud), le Soleil à gauche ; on la fait tourner (curseur, lecture, doigt) ; heure solaire et jour/nuit à Saint-Denis et à Paris ; temps écoulé pour mesurer la durée d’un tour. |
| `#saisons` | Saisons | La Terre sur son orbite (vue en perspective), axe incliné de direction fixe, et la Terre vue de côté ; pour Saint-Denis et Paris : saison, durée du jour, hauteur du Soleil à midi ; distance Terre-Soleil à la date ; hypothèse « axe non incliné ». |
| `#phases` | Phases | Vue de dessus (rayons parallèles) et la Lune vue depuis la Terre, depuis La Réunion ou depuis la métropole (image retournée) ; nom de la phase, fraction éclairée, croissante ou décroissante. |
| `#eclipses` | Éclipses | Ombre et pénombre de la Terre et de la Lune (vue de dessus) ; vue de côté avec l’orbite de la Lune inclinée ; la Lune et le Soleil vus depuis la Terre ; nouvelle ou pleine Lune suivante, relevés sur une année ; hypothèse « orbite non inclinée ». |

Commandes : doigt ou souris (glisser la Terre, la Lune), flèches du clavier (pas en avant ou en arrière, Maj : grand pas), barre d’espace (lecture/pause). L’animation s’arrête quand l’onglet est caché ou que l’app sort de l’écran. Dans le cadre d’un cours, un doigt posé ailleurs que sur un objet à déplacer fait défiler la page.

## Sources des valeurs numériques

- Position et distance du Soleil : algorithme « Approximate Solar Coordinates » de l’U.S. Naval Observatory (Astronomical Almanac, basse précision), année 2027. Déclinaison : sin δ = sin ε · sin L.
- Saisons : saison astronomique du calendrier ; le jour d’un équinoxe ou d’un solstice (de 0 h à 24 h TU, année 2027 : 20 mars, 21 juin, 23 septembre, 22 décembre), l’app l’annonce (« solstice de juin : début de l’hiver » à Saint-Denis, « début de l’été » à Paris) ; la nouvelle saison s’affiche à partir du lendemain. Les raccourcis de dates sont calculés par le modèle.
- Durée du jour : cos H0 = −tan φ · tan δ (centre du Soleil à l’horizon, **sans réfraction**). Hauteur du Soleil à midi : 90° − |φ − δ|.
- Valeurs vérifiées par le test : Saint-Denis (20,9° S) 10 h 44 le 21 juin, 13 h 16 le 21 décembre ; Paris (48,9° N) 15 h 58 et 8 h 02 (22 décembre : mêmes valeurs) ; distance Terre-Soleil 147,1 millions de km le 4 janvier, 152,1 le 5 juillet.
- Lune : lunaison 29,530589 jours, inclinaison de l’orbite 5,145°, retour du Soleil au même nœud en 346,62 jours, distance 384 400 km. Diamètres : Terre 12 742 km, Lune 3 474 km, Soleil 1 392 000 km. Ombres calculées avec ces dimensions (ombre de la Terre à la distance de la Lune : rayon d’environ 4 600 km).
- Fraction éclairée : (1 − cos a) / 2, a = angle Soleil-Terre-Lune ; terminateur dessiné en demi-ellipse.

## Simplifications assumées (écrites aussi dans l’app, bouton « Valeurs réelles »)

- Rien n’est à l’échelle (bandeau « Pas à l’échelle »), sauf la forme de l’orbite de la Terre et les hauteurs de la vue de côté des éclipses (distances horizontales raccourcies : l’inclinaison de l’orbite de la Lune y paraît plus grande).
- Jour et nuit : inclinaison de l’axe ignorée (équinoxe) ; heure solaire, pas l’heure de la montre ; une ville de l’autre hémisphère est dessinée « par transparence ».
- Phases : orbite de la Lune dans le plan de l’orbite de la Terre ; entre les hémisphères, l’image de la Lune est tournée d’un demi-tour (haut et bas, gauche et droite échangés ; près des tropiques, le croissant est aussi plus ou moins couché selon l’heure) ; les quatre phases du cours sont les repères principaux (nommées à moins de 7° de leur position exacte) et une phase intermédiaire est située entre deux d’entre elles.
- Éclipses : la vue de côté écrase la profondeur (une mention signale une Lune qui passe devant ou derrière l’ombre) ; « le Soleil vu depuis la Terre » n’est jamais retourné (nord en haut, comme la vue de côté), seule « la Lune vue depuis la Terre » dépend de l’hémisphère choisi ; déplacer la Lune à la main ne fait pas passer le temps ; distance Terre-Lune constante (une éclipse centrale de Soleil est dite « totale ou annulaire ») ; rougeur de la Lune éclipsée seulement imitée ; éclipses relevées à l’instant exact des nouvelles et pleines Lunes ; éclipses de Lune par la pénombre non comptées.

## Technique

HTML, CSS et JavaScript sans bibliothèque ni ressource extérieure (aucune police, aucun réseau, aucun service worker, aucune donnée envoyée). Canvas 2D dessiné en pixels CSS multipliés par la densité de l’écran. L’app remplit la fenêtre qu’on lui donne (menu en colonne sur écran large, en bandeau quand l’écran est plus haut que large).

Fichiers : `index.html`, `style.css`, `astro.js` (calculs), `dessin.js` (outils de dessin), `jour-nuit.js`, `saisons.js`, `phases.js`, `eclipses.js`, `app.js` (menu, lien, animation, saisies). Le dossier `tests/` n’est pas nécessaire à l’app.

Test : `node tests/verifier.mjs` (Chrome sans écran) ; `node --experimental-websocket tests/verifier.mjs --firefox` (Chrome puis Firefox, Node 20-21 ; Node 22 sans option). Le lancer seul.

## Licence et inspiration

Licence : GNU GPL v3 ou ultérieure. Auteur : M. VERHILLE Arnaud, collège Thérésien Cadet (La Réunion).

Inspiration : idée des animations Flash « Eclipse », « Test_phases » et « Test_saisons » de sciences.colleges.free.fr ; aucun code ni dessin repris.
