# Les changements d’état de l’eau

Application web de physique-chimie (collège, cycles 3 et 4) : un « bac à sable » où l’eau tombe, coule et change d’état, une coupe du cycle de l’eau à La Réunion et l’expérience de la courbe de fusion de la glace. Vanilla JS, Canvas 2D, aucune bibliothèque, aucune étape de construction. Rien n’est chargé depuis Internet, rien n’est envoyé, pas de compte ni de suivi.

Ouvrir `index.html` dans un navigateur récent (ou par un petit serveur local). Trois parties, ouvrables par l’adresse :

| Adresse | Partie |
|---|---|
| `index.html#bac-a-sable` (par défaut) | **Bac à sable** : une pièce en coupe avec un bécher d’eau sur une plaque chauffante, un bloc de glace, une flaque, une plaque froide. Outils : glace, neige, eau liquide, paroi de verre, chauffer (plaque à 160 °C), refroidir (plaque à −25 °C), thermomètre (4 au plus), gomme ; taille du pinceau ; température de l’air de la pièce ; pause, vitesse, tout effacer, scène de départ (avec confirmation). |
| `index.html#cycle` | **Le cycle de l’eau à La Réunion** : coupe de l’île d’une côte à l’autre par le Piton des Neiges. Soleil (visible ou caché), vent (alizés), « Noms » (étiquettes sur ce qui se voit), thermomètres (3 au plus), température de l’air au bord de la mer (le sommet est plus froid de 23 °C). |
| `index.html#fusion` | **Courbe de fusion** : bécher de glace pilée à −10 °C sur une plaque chauffante réglable (0 à 6, 80 W par cran), masse de glace (100, 150 ou 200 g), agitateur. Chronomètre en temps simulé, mesure toutes les 30 s, courbe température–temps, tableau, export CSV pour le tableur (séparateur « ; », virgule décimale). |

Chaque partie a un bouton **Protocole** (étapes d’observation et de mesure, sans conclusion : l’élève conclut) et rappelle ce que simplifie la simulation. Options communes : **Montrer la vapeur** (désactivée par défaut, avec la mention « en réalité, la vapeur d’eau est invisible »), **Répartition** (masse de glace, d’eau liquide, de gouttelettes, de vapeur, d’eau du sol, d’eau partie dans le reste de la pièce).

L’app remplit exactement la fenêtre (ou le cadre qu’on lui donne), à toute taille et dans les deux orientations : commandes en colonne à droite en paysage, sous la scène en portrait. Doigt, souris, clavier (Espace : pause ou démarrage de l’expérience ; Échap : fermer une fenêtre). Elle se met en pause quand l’onglet est caché ou quand le cadre est hors de l’écran.

## Le modèle physique

Fichiers : `simulation.js` (moteur, sans affichage), `scenes.js` (les trois scènes), `app.js` (affichage, saisie, expérience), `style.css`.

**Des cases, pas des particules.** La scène est une grille de cases fines (environ 15 000 dans le bac à sable). Une case contient *une petite quantité* d’eau liquide ou de glace, ou de l’air, une paroi, du sol, de la roche, une plaque. L’interface ne parle ni de particules, ni de molécules, ni d’atomes (l’app sert aussi la 6e). L’image est agrandie avec lissage : l’eau paraît continue.

**États.** La glace en bloc garde sa forme (un bloc sans appui tombe d’un seul tenant ; sous l’eau, il remonte : la glace flotte) ; la neige, la grêle et la glace pilée tombent en grains et s’entassent. L’eau liquide coule, s’étale vers les endroits plus bas et prend la forme du récipient, avec une surface horizontale (à une case près). Un gaz occupe tout l’espace qui lui est accessible.

**Énergie et paliers.** Chaque case d’eau a une enthalpie massique *h* (J/g) comptée depuis la glace à 0 °C, avec les valeurs de l’eau : glace 2,1 J/(g·°C), liquide 4,18 J/(g·°C), fusion 334 J/g, vaporisation 2 257 J/g. Entre 0 et 334 J/g, la case est à 0 °C (réserve de fusion, ou de solidification dans l’autre sens) ; au-delà de 752 J/g, l’eau liquide est à 100 °C et accumule l’énergie de sa vaporisation : quand elle a reçu 2 257 J/g de plus, toute la case devient une bulle de vapeur, qui monte dans le liquide (elle se voit comme un trou, pas comme du blanc). Le palier n’est donc pas programmé : la température lue reste à 0 °C (ou 100 °C) tant que les deux états coexistent, parce que l’énergie reçue va dans ces réserves. La chaleur passe d’une case à l’autre par conduction ; l’eau liquide plus chaude que celle du dessus monte (convection) ; les bulles et l’agitateur remuent l’eau.

**Vapeur d’eau invisible.** Chaque case d’air porte une quantité de vapeur, jamais dessinée : une case d’air a la même couleur, qu’elle contienne beaucoup ou peu de vapeur (contrôlé par un test). Ce qui se voit dans l’air : les **gouttelettes** d’eau liquide (nuage, brume, buée, panache au-dessus de l’eau qui bout), le **givre** et la **pluie**. La quantité de vapeur qu’une case d’air peut contenir (saturation) croît avec la température (formule de Magnus, forme de Clapeyron), au-dessus de l’eau liquide ou de la glace. Au-delà, la vapeur se condense : en gouttelettes dans l’air (**condensation liquide**), en givre au contact d’une surface sous 0 °C (**condensation solide**), ou directement sur l’eau. La vapeur se répand dans l’air (brassage), est entraînée par le vent et par l’air chaud qui monte. Le mélange d’air chaud et humide avec de l’air froid forme de la brume : c’est ainsi qu’apparaît le panache.

**Évaporation et ébullition.** L’eau liquide s’**évapore** à sa surface à toute température tant que l’air qui la touche n’est pas saturé (flaque, mer chauffée par le Soleil, sol mouillé) ; l’**ébullition** (bulles dans le liquide) se fait à 100 °C (pression constante). La glace se **sublime** dans un air très sec et froid. Les énergies de changement d’état sont comptées : l’évaporation refroidit l’eau, la condensation réchauffe l’air.

**Conservation de la masse.** Chaque transformation retire exactement ce qu’elle ajoute ailleurs. La masse totale d’eau (glace + eau liquide + gouttelettes + pluie + vapeur + eau du sol + eau partie dans le reste de la pièce) est affichée en grammes et ne change pas, aux arrondis près (écart inférieur à 10⁻⁹ g sur 20 000 pas dans les tests). Elle ne change que si l’on ajoute ou efface de l’eau avec les outils.

**Cycle de l’eau.** La température de l’air baisse de 7,5 °C par kilomètre d’altitude. Le Soleil chauffe la surface de l’océan ; l’eau s’évapore ; les alizés poussent l’air humide vers l’île et le font monter le long des pentes, où il se refroidit : des nuages se forment (condensation liquide), il pleut sur la côte au vent ; l’eau ruisselle vers l’océan, s’infiltre dans le sol (qui la rend à l’océan par la côte) ; au sommet, sous 0 °C, du givre se dépose (condensation solide). Sous le vent, l’air redescend, se réchauffe et les nuages disparaissent. L’air qui sort à droite de la scène rentre à gauche.

## Simplifications (annoncées dans l’app)

- Eau pure ; pression constante (1 atm) : l’ébullition se fait à 100 °C partout, même au sommet du Piton des Neiges.
- Durées accélérées.
- **Pas à l’échelle** : une case d’air saturée à 100 °C contient autant d’eau qu’une case d’eau liquide ; en réalité, la vapeur occupe environ 1 600 fois plus de place que l’eau liquide. Dans la coupe du cycle, l’altitude est très exagérée par rapport aux distances.
- La vapeur d’eau est invisible ; seule l’option « Montrer la vapeur » la teinte, avec la mention.

## Limites connues (choix de modélisation)

- La pièce du bac à sable et la salle de l’expérience sont bien plus petites que dans la réalité, alors que la vapeur y est 1 600 fois trop « dense » : sans précaution, quelques grammes d’eau bouillie rempliraient la pièce de brume. L’air à la température de la pièce se renouvelle donc peu à peu (la vapeur en excès part « dans le reste de la pièce », masse comptée et affichée dans « Répartition »). L’air chaud d’un panache, lui, ne se renouvelle pas avant de s’être mélangé à l’air de la pièce.
- L’évaporation à la surface d’une eau chaude est plafonnée (le départ de la vapeur loin de la surface la limite), sinon, près de 100 °C, elle prendrait toute l’énergie avant l’ébullition. Au-dessus de l’océan, l’évaporation s’arrête quand l’air touché atteint 75 % de sa saturation (air marin vite brassé).
- Un bloc de glace qui flotte reste posé sur l’eau (au lieu d’y être enfoncé aux neuf dixièmes) ; un bloc ne glisse pas sur une pente.
- Pas de pression du liquide : de l’eau dans deux récipients reliés ne se met pas au même niveau.
- Dans la coupe du cycle, l’air a la température de son altitude (il ne se réchauffe pas en descendant par compression) ; un peu de nuage bas peut se former au-dessus de l’océan près de la côte au vent.
- Dans l’expérience de fusion, à la toute fin de la fusion (peu de glace), l’eau dépasse un peu 0 °C (jusqu’à 1 °C environ avec une plaque puissante), comme dans un vrai bécher ; sans agitateur, la température n’est pas la même partout dans le bécher.
- Le thermomètre lit la moyenne des cases de même nature (eau, air ou paroi) autour de son réservoir.

## Tests

Dans `tests/` (non nécessaires au fonctionnement de l’app, à exclure du site). À lancer **l’un après l’autre**, jamais en même temps qu’un autre test qui pilote un navigateur.

```sh
node tests/verifier-physique.mjs
node --experimental-websocket tests/verifier-navigateurs.mjs     # Chrome puis Firefox
node tests/verifier-navigateurs.mjs --chrome-seul                 # sans Firefox
```

- `verifier-physique.mjs` (Node seul, 3 min environ, résultats reproductibles : hasard à graine fixe) : conservation de la masse (bac à sable 20 000 pas avec toutes les transformations, cycle 12 000 pas, fusion jusqu’à l’ébullition) ; sublimation dans l’air sec et froid ; palier à 0 °C lu par le thermomètre (5 combinaisons de masse et de puissance) puis montée après la dernière glace ; la fusion dure plus longtemps avec plus de glace ; ébullition à 100 °C (bulles, lecture du thermomètre, aucune eau liquide au-dessus de 100 °C) ; évaporation d’une flaque à 20 °C dans l’air sec, sans bulle ; cycle : nuages en altitude, pluie, infiltration, retour de l’eau à l’océan, givre au sommet, moins d’évaporation sans Soleil.
- `verifier-navigateurs.mjs` (Chrome par le protocole DevTools, Firefox par WebDriver BiDi, aucune dépendance npm ; Node 22, ou Node 20 avec `--experimental-websocket`) : ouverture des trois parties par l’adresse sans erreur ni requête externe ; mise en page à 360×640, 640×360, 768×1024, 1024×768, 1366×768 et 1920×1080 (pas de défilement, cibles ≥ 44 px, rien de coupé, captures dans un dossier temporaire ou `--sortie DOSSIER`) ; vapeur invisible (air humide et air sec : mêmes pixels) ; tactile émulé (outil, trait d’eau, thermomètre posé puis déplacé) ; tableau et CSV de l’expérience ; onglets et adresse ; pause hors de l’écran ; dans Chrome, fluidité avec le processeur ralenti 4 fois. Variables : `CHROME_PATH`, `FIREFOX_PATH`.
- `cdp.mjs` (serveur local, pilotage de Chrome), `cadre.html` (l’app dans un cadre, comme dans le site).

Testé dans Chrome et Firefox sans écran, tactile émulé. **Pas essayé sur une vraie tablette** (Samsung Galaxy Tab A, Android 8.1, Firefox), ni dans Safari, ni avec un lecteur d’écran.

## Licence

GPL v2 (comme les autres applications de ce dépôt). Auteur : Arnaud Verhille.
