# Scénarios d’acceptation (SPEC-INTERFACE.md §15) : état des vérifications

État au 20/11/2026. La spécification annonce 106 scénarios ; sa liste en compte 111 (A01–A43, G01–G33, E01–E16, O01–O12, F01–F07), tous repris ci-dessous.

Légende :
- **Auto** : vérifié par `tests/verifier-interface.mjs` (Chrome sans écran, tactile émulé ; certains aussi dans Firefox 160), au doigt quand c’est indiqué.
- **Auto partiel** : une partie du scénario est vérifiée automatiquement (ce qui manque est dit).
- **Moteur** : la physique est vérifiée par les tests du moteur (`node optgeo/tests/tous.js`), l’interface seulement pour l’ouverture et le dessin.
- **Écart** : comportement volontairement différent d’OptGeo (dit pourquoi).
- **Non fait** : pas vérifié.

Aucun scénario n’a été passé sur une vraie tablette, dans Safari, ni avec OptGeo 3.03 à côté (OptGeo n’a pas été exécuté).

## Exemples (A)

| N° | Scénario | État |
|---|---|---|
| A01 | Les 56 exemples s’ouvrent | Auto : 56/56 ouverts, tracés et dessinés sans erreur (Chrome et Firefox), commentaire chargé ; options restaurées vérifiées sur A13, A27, A33, A36 |
| A02 | Anciens formats (versions 1 et 10) | Auto |
| A03 | Autocollimation, translation du miroir | Auto partiel : translation par la croix verte et par le corps vérifiée sur d’autres objets ; « l’image reste dans le plan du diaphragme » non vérifié |
| A04 | Autocollimation, inclinaison | Auto partiel : poignées d’extrémité et de rotation vérifiées ; physique non vérifiée |
| A05 | Autocollimation, contre-épreuve | Non fait |
| A06 | Lentilles, déplacement de la source | Auto partiel : poignées des sources vérifiées (toutes les poignées de tous les types) ; pas sur ces six exemples |
| A07 | Lentille convergente 1 | Moteur (conjugaison) ; dessin : Auto |
| A08 | Lentille convergente 2, prolongements | Moteur ; dessin : Auto |
| A09 | Objet virtuel, propriétés de la source | Auto partiel : objet virtuel créé au doigt avec « (1) » ; panneau ouvert et validé ; affichage des listes non vérifié |
| A10 | Lentille divergente 1 | Moteur ; dessin : Auto |
| A11 | Newton et zoom ×10 | Auto partiel : zooms ×1…×100 présents, zoom à deux doigts et à la molette vérifiés ; pas sur cet exemple |
| A12 | Zoom pendant un mode | Écart : le zoom reste permis pendant un mode (SPEC §12.2) |
| A13 | Cassegrain en mètres | Auto partiel : unité « m » ; valeurs du panneau non vérifiées |
| A14 | Pas de surfaces d’onde avec miroirs paraxiaux | Moteur ; note affichée dans le panneau ; non vérifié dans l’interface |
| A15 | Dioptre, caustique puis diaphragme | Dessin : Auto ; aspect non vérifié |
| A16 | Diaphragme modifié en direct, Ctrl+Z | Auto (poignée du trou, plus de rayons, Annuler) |
| A17 | Lentille épaisse, Gauss / hors Gauss | Dessin : Auto ; valeurs du panneau non vérifiées |
| A18 | Aberration sphérique | Dessin : Auto |
| A19 | Retournement de lentille | Dessin : Auto |
| A20 | Miroir parabolique, cinq cas | Dessin : Auto ; grille et normales non vérifiées une à une |
| A21 | Miroir parabolique, propriétés, e = 0,5 | Auto (titre « parabolique », puis « elliptique ») |
| A22 | Miroir sphérique | Dessin : Auto |
| A23 | Base vide + onde plane | Auto partiel : onde plane créée au doigt (autre scène) |
| A24 | Stigmatisme rigoureux | Moteur (parabole, ellipse, miroir plan) ; dessin : Auto |
| A25 | Miroir plan, source déplacée | Moteur ; poignée de source : Auto |
| A26 | Weierstrass | Dessin : Auto |
| A27 | Arc-en-ciel, fantômes | Auto : (3,6,9) restaurés, lumière blanche décomposée ; panneau fantômes : voir O10 |
| A28 | Arc-en-ciel, angles | Auto partiel : « Angles » coche les normales, angles calculés ; valeur 59,6° non vérifiée |
| A29 | Fibre à saut d’indice | Non fait |
| A30 | Prisme, rotation par le sommet | Auto (angle au sommet, hauteur et G conservés) |
| A31 | Lunette, focales et mesures d’angle | Auto |
| A32 | Cercle oculaire, œil | Dessin : Auto ; question de l’aide (œil absorbant) non tranchée ici |
| A33 | Coronographe, attraction | Auto partiel : attraction restaurée ; attraction à la translation vérifiée ailleurs (O02 à la création) |
| A34 | Coronographe, lumière parasite | Dessin : Auto |
| A35 | Cassegrain conique | Dessin : Auto |
| A36 | Michelson, rayons perdus | Auto partiel : (4,9) restaurée |
| A37 | Michelson, isoler un trajet | Non fait |
| A38 | Michelson, miroir symétrique | Dessin : Auto |
| A39 | Michelson, lames, longueurs | Auto partiel : commande « Longueurs des segments » essayée ; affichage non vérifié |
| A40 | Coin d’air | Dessin : Auto |
| A41 | Réseaux, propriétés | Auto (transmission, traits par mm, ordres) |
| A42 | Cardioïde, fluidité | Mesuré une fois (Chrome, processeur ralenti 4 fois) : retracer + redessiner 200 segments, médiane 4,9 ms, maximum 31 ms ; pas sur tablette |
| A43 | Aberration chromatique | Dessin : Auto |

## Création (G) — chaque objet au doigt (événements tactiles émulés) et par le menu « Ajouter »

Par le menu « Ajouter » : les 26 types créés par coordonnées (panneau « Ajout d’… », Valider), **Auto**. Le panneau de propriétés de chaque type présent s’ouvre et se valide, **Auto**.

| N° | Scénario | État |
|---|---|---|
| G01 | Rayon | Auto |
| G02 | Objet ponctuel réel | Auto (7 rayons) ; Écart : bords rangés pour couvrir le petit secteur (inverser 1 et 2 ne donne plus l’autre secteur à la création ; possible ensuite par les poignées ou le panneau) |
| G03 | Objet ponctuel virtuel | Auto |
| G04 | Onde plane | Auto (point 2 ramené par le moteur) |
| G05 | Miroir plan | Auto |
| G06 | Miroirs paraxiaux concave / convexe | Auto |
| G07 | Miroirs réels concave / convexe | Auto |
| G08 | Miroir troué | Non fait (champ présent dans le panneau) |
| G09 | Miroir conique | Auto partiel : concave au doigt ; convexe non essayé |
| G10 | Lame semi-réfléchissante | Auto |
| G11 | Lentilles minces | Auto (convergente : foyer projeté, f ≈ 110 ; divergente) |
| G12 | Lentille épaisse | Auto (boîte du diamètre) ; réduction du diamètre non vérifiée |
| G13 | Sphère | Auto |
| G14 | Polygone | Auto (3 sommets) ; polygone croisé refusé : non vérifié |
| G15 | Polycercle | Auto (2 sommets, un arc et un côté droit, sommet d’arc au doigt) |
| G16 | Prisme | Auto (Chrome et Firefox, au doigt) |
| G17 | Écran | Auto |
| G18 | Diaphragme | Auto |
| G19 | Œil | Auto |
| G20 | Réseau | Auto (le panneau s’ouvre après le tracé) |
| G21 | Texte | Auto (texte accentué) ; police non vérifiée |
| G22 | Trait, flèche | Auto (le panneau s’ouvre après le tracé) |
| G23 | Mesure de distance | Auto ; enregistrée puis relue (F01) |
| G24 | Mesure d’angle | Auto |
| G25 | Point | Auto |
| G26 | Commentaire | Auto (enregistré dans le .txt téléchargé) |
| G27 | Couleur et dispersion | Auto partiel (A27) |
| G28 | Matériau | Non fait (liste présente) |
| G29 | Réflexion partielle | Non fait |
| G30 | Rayons enfants | Non fait (moteur) |
| G31 | Nombre maximal de segments | Non fait (moteur) |
| G32 | Limite par type | Auto |
| G33 | Points trop proches | Auto partiel : refus et maintien dans l’étape ; option « Désactiver le contrôle » non essayée |

## Édition (E)

| N° | Scénario | État |
|---|---|---|
| E01 | Déplacer | Auto partiel : mode Déplacer, translation d’un groupe par « Gr » au doigt ; Écart : glisser au lieu de « clic, déplacement, clic » |
| E02 | Rotation (disque rouge) | Auto (longueur conservée) |
| E03 | Blocage vertical / horizontal en déplacement | Auto, au doigt (Chrome et Firefox) : en mode Déplacer, « Bloquer verticalement » touché avant le glisser → déplacement vertical seulement ; pendant un glisser en mode Sélection, un second doigt sur « Bloquer horizontalement » → mouvement horizontal seulement (Chrome ; Firefox avec un second pointeur souris). Le blocage ne vaut que pour ce glisser. Écart : boutons au lieu de Alt / Ctrl maintenus (touches toujours actives au clavier) |
| E04 | Alignement à la création | Auto, au doigt (Chrome et Firefox) : « Aligner horizontalement » touché, second point aligné ; l’alignement est remis à faux à la fin de la construction |
| E05 | Points confondus | Auto (Chrome et Firefox, au doigt) : écran et miroir superposés ; le premier toucher choisit l’un et affiche « 1 sur 2 éléments ici » sans décaler le dessin, le second toucher au même endroit choisit l’autre. Écart : toucher de nouveau au lieu d’une liste (liste nommée dans les modes Propriétés, Dupliquer, Supprimer, Grouper) |
| E06 | Mode Propriétés | Auto partiel : panneau ouvert par la barre contextuelle et par le menu ; mode « toucher pour les propriétés » non essayé |
| E07 | Mode Supprimer | Auto partiel : suppression et Annuler vérifiés ; mode non essayé au doigt ; Écart : suppression immédiate et annulable |
| E08 | Supprimer tout | Auto (confirmation, Annuler) |
| E09 | Dupliquer | Auto (Ctrl+D, copie décalée et sélectionnée) ; Écart : décalage de 5 % |
| E10 | Grouper (choix) | Auto (au doigt) |
| E11 | Grouper tout, translater | Auto |
| E12 | Supprimer un groupe | Non fait (commande « Dissocier » : les éléments restent) |
| E13 | Annuler une construction (Échap) | Auto ; aussi Échap pendant un glisser : l’objet revient (Écart voulu) |
| E14 | Annuler / Refaire | Auto partiel (propriétés, suppression, Ctrl+Z, Ctrl+Y, boutons) ; 50 niveaux comptés (60 modifications → 50 retours en arrière) ; les options d’affichage (normales, grille…) ne sont pas annulées (SPEC §7) |
| E15 | Coordonnées des segments | Auto partiel : panneau ouvert ; surlignage non vérifié |
| E16 | Longueurs des segments | Auto partiel : commande essayée ; affichage non vérifié |

## Options et affichage (O)

| N° | Scénario | État |
|---|---|---|
| O01 | Grille | Auto partiel : boîte ouverte ; pas changé non vérifié |
| O02 | Attraction | Auto : extrémités du miroir et bords de la lentille sur les nœuds ; foyer de la lentille non attiré (f = 113 avec une grille de 50, visé au doigt) ; aucun point projeté (foyer, centre de courbure, base du prisme, bord du diaphragme, centres de la lentille épaisse, fin du miroir conique, sommet d’arc) n’est attiré |
| O03 | Normales | Auto partiel : boîte ouverte |
| O04 | Angles | Auto partiel (A28) |
| O05 | Zoom | Auto (deux doigts ×3,25 ; molette ; Tout voir) ; Écart : zoom continu centré sous les doigts |
| O06 | Fond (couleur, image) | Auto partiel : image chargée, dessinée ; un message dit qu’elle n’est gardée ni dans le .opt ni après rechargement (elle n’est plus écrite dans le stockage local, partagé par tout le site) ; couleur non essayée |
| O07 | Milieu ambiant | Auto partiel : boîte ouverte |
| O08 | Empennage | Auto partiel : boîte ouverte |
| O09 | Surfaces d’onde | Non fait (moteur ; champs présents) |
| O10 | Fantômes | Auto (toucher le segment 4 l’ajoute, Valider le garde) |
| O11 | Dimensions de l’espace de travail | Auto (ajustement automatique) ; manuel : boîte ouverte |
| O12 | Préférences | Non fait (boîte ouverte seulement) |

## Fichiers (F)

| N° | Scénario | État |
|---|---|---|
| F01 | Enregistrer puis rouvrir | Auto partiel : scène de 11 types + groupe + commentaire, Ctrl+S, réécriture identique au caractère près ; pas tous les types ni toutes les options |
| F02 | Enregistrer sans « sous » | Non fait (retélécharge sous le même nom) |
| F03 | Compatibilité avec OptGeo 3.03 | Non fait (OptGeo non exécuté) ; le format est vérifié par les tests du moteur |
| F04 | Superposer | Auto (objets ajoutés, groupe créé) |
| F05 | Exports, impression, copie | Auto : PNG (2000 px, signature PNG), SVG bien formé, impression préparée (SVG) ; copie non essayée ; Écart : ni JPG ni PostScript |
| F06 | Nouvelle simulation | Auto (boîte de démarrage) |
| F07 | Titre | Auto partiel : nom du fichier dans la barre (captures) |

## Défauts de la relecture indépendante du 20/11/2026 (FAIL) : contrôles ajoutés

Chacun a au moins un contrôle dans `verifier-interface.mjs` (Chrome ; Firefox pour 1, 3, 4, 5 et 12) :
1. « Aligner » / « Bloquer » remis à faux en fin de construction ou de glisser ; boutons du bandeau stables pendant un glisser (même élément), second doigt reçu ;
2. panneau des propriétés rafraîchi quand l’objet change (glisser, Annuler), saisie en cours gardée, fermé si l’objet disparaît ;
3. glisser de 90 px → 90 px à 1 px près, lent ou rapide (un seul mouvement puis lever) ;
4. bandeau posé par-dessus le dessin : aucun décalage (bandeau « 1 sur 2 », début et fin de construction) ;
5. loupe au-dessus du doigt, centrée sur le point projeté (foyer, base du prisme, centre de courbure) ;
6. fichier vide, JSON, texte, PNG renommé refusés (ouvrir et superposer), scène, historique et sauvegarde gardés ;
7. valeurs bornées dans le panneau (longueurs ≤ 1 000 × la diagonale de l’espace de travail et ≥ taillemini ; angles ≤ 3 600° ; indices ≤ 100 ; autres nombres ≤ 10⁶), garde-fou sur la géométrie, objet impossible à dessiner ignoré et signalé, exports possibles ;
9. voir O02 ; 10. cibles de 44 px (radios, nuancier, « Insérer après » / « Retirer », bouton de la bulle) ;
11. bandeau compact (une ligne, « Plus ») sur petit écran, boutons de vue libres, aux six tailles ;
12. `touch-action: pan-x pan-y` sur la page, pincement sur la palette, la barre ou le bandeau sans zoom de la page ;
13. sauvegarde automatique sans image, ancienne image nettoyée, message si le stockage est plein ;
14. 50 niveaux d’annulation ; 15. sphère de rayon 0 refusée ; 16. options d’affichage non annulées ; 17. bulle de message hors du titre et des boutons du panneau, aux six tailles.

## Hors scénarios, vérifié aussi

Chargement sans erreur ni requête extérieure ; reprise après rechargement ; six tailles d’écran (360×640, 640×360, 768×1024, 1024×768, 1366×768, 1920×1080) sans défilement ni débordement, zone de dessin de 77 à 91 % de la fenêtre, boutons d’au moins 44 px, volet et panneau dans la fenêtre ; l’app dans un cadre (340×560 et 984×620) ; toutes les commandes du menu ; toutes les poignées de tous les types d’objets.
