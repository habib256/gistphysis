#!/usr/bin/env python3
"""Porte l'aide française d'OptGeo 3.03 en pages HTML locales pour la version web.

Source (lecture seule) : l'aide d'origine d'OptGeo 3.03 (Jean-Marie Biansan,
licence GNU GPL v2 ou ultérieure), dossier ``src/aide/fr/`` du dépôt amont.
Destination : le dossier ``aide/`` voisin de ce dossier ``outils/``.

Le script régénère tout ``aide/`` (il le vide d'abord) :
  - une page UTF-8 par page d'origine, même nom de base en minuscules,
    balisage nettoyé (titres, paragraphes, listes), texte d'origine accentué
    et corrigé de ses fautes évidentes (table CORRECTIONS ci-dessous), puis
    adapté à la version web (tables ADAPTATIONS et ADAPTATIONS_COMMUNES :
    gestes, boutons et menus réels de l'application ; mention « Adapté pour
    la version web » en pied de page) ;
  - ``index.html`` (sommaire), ``web.html`` (usage de la version web),
    ``aide.css`` (feuille commune) ;
  - ``images/`` : les images utilisées par les pages (le BMP est converti en
    PNG avec ``sips``, l'outil d'images de macOS).
Puis il contrôle le résultat (HTML bien formé, liens et images présents,
ancres comprises, aucune ressource distante, aucun émoji, aucune faute connue
restante, aucune instruction de l'interface Windows restante : INTERDITS_WEB)
et s'arrête avec un code d'erreur si un contrôle échoue.

Toute modification de l'aide se fait ICI, jamais à la main dans ``aide/`` :
le script vide ce dossier et le réécrit. Si l'interface de l'application
change un libellé (menu, bouton, palette), mettre à jour les textes de
ADAPTATIONS, ADAPTATIONS_COMMUNES et page_web(), puis relancer le script.

Bibliothèque standard de Python 3 seulement. Sortie reproductible : aucune
date, ordre des fichiers fixe.

Usage : python3 outils/porter-aide.py [--source DOSSIER] [--destination DOSSIER]
"""

import argparse
import html
import re
import shutil
import struct
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ICI = Path(__file__).resolve().parent
SOURCE_DEFAUT = Path.home() / "src" / "optgeo-amont" / "src" / "aide" / "fr"
DESTINATION_DEFAUT = ICI.parent / "aide"

NBSP = " "

# Pages d'origine -> titre de l'onglet (le titre <h1> vient du texte d'origine).
PAGES = {
    "optgeo": "Aide générale d'OptGeo",
    "rayon": "Rayon lumineux unique",
    "sponct": "Source ponctuelle",
    "op": "Onde plane",
    "miroirplan": "Miroir plan",
    "miroirspheriqueparaxial": "Miroir sphérique paraxial",
    "miroirspheriquereel": "Miroir sphérique réel",
    "miroirconique": "Miroir parabolique, elliptique ou hyperbolique",
    "lmc": "Lentille mince paraxiale",
    "lentille": "Lentille épaisse",
    "sphere": "Sphère réfractante",
    "polyhedre": "Polygone réfractant",
    "polysphere": "Polycercle réfractant",
    "prisme": "Prisme réfractant",
    "ecran": "Écran",
    "diaphragme": "Diaphragme à iris",
    "lsr": "Lame semi-réfléchissante",
    "reseau": "Réseau diffractant",
    "oeil": "Œil stylisé",
    "materiaux": "Liste des matériaux",
}

# Textes de remplacement des images (les originaux n'en ont pas).
ALT = {
    "mpgrand.gif": "Miroir plan entre ses points 1 et 2 ; les hachures marquent la face absorbante",
    "mscopagrand.gif": "Symbole du miroir sphérique paraxial concave",
    "mscepagrand.gif": "Symbole du miroir sphérique paraxial convexe",
    "mscoregrand.gif": "Miroir sphérique réel concave",
    "msceregrand.gif": "Miroir sphérique réel convexe",
    "coniquegrand.gif": "Miroir conique défini par ses extrémités 1 et 2, le foyer F et le sommet S",
    "lmcgrand.gif": "Symbole de la lentille mince convergente",
    "lmdgrand.gif": "Symbole de la lentille mince divergente",
    "lecgrand.gif": "Lentille épaisse : sommets S1 et S2, centres C1 et C2, rayons R1 et R2, diamètre D",
    "gouttegrande.gif": "Sphère réfractante",
    "polyhedregrand.gif": "Polygone réfractant",
    "polycercle.gif": "Polycercle réfractant : côtés droits et arcs de cercle",
    "prismegrand.png": "Prisme réfractant",
    "ecrangrand.gif": "Écran",
    "diaphragmegrand.gif": "Diaphragme à iris",
    "lsrgrand.gif": "Lame semi-réfléchissante",
    "reseaugrand.png": "Réseau diffractant",
    "oeilgrand.gif": "Œil stylisé",
    "rayongrand.gif": "Rayon lumineux unique",
    "sponctgrand.gif": "Source ponctuelle réelle",
    "sponctvgrand.gif": "Source ponctuelle virtuelle",
    "opgrand.gif": "Onde plane",
    "segment1.gif": "Trajet d'un rayon formé de quatre segments numérotés de 1 à 4",
    "segment2.gif": "Le même trajet avec les prolongements en pointillés : segments 1, 2 et 4 vers l'avant, 3 et 4 vers l'arrière",
}

# Corrections appliquées à tout le texte (expression régulière, remplacement).
# Accents oubliés, majuscules accentuées, fautes d'orthographe évidentes.
CORRECTIONS = [
    (r"\blicense\b", "licence"),
    (r"\benvoyez moi\b", "envoyez-moi"),
    (r"\bOpt[gG][ée]o\b", "OptGeo"),
    (r"\bde OptGeo\b", "d'OptGeo"),
    (r"\bcelui ci\b", "celui-ci"),
    (r"\bpolyhèdres\b", "polyèdres"),
    (r"lumineux\.,", "lumineux,"),
    (r"\butilisaton\b", "utilisation"),
    (r"\b2ème\b", "2e"),
    (r"\bstandarts\b", "standard"),
    (r"\bles différentes points\b", "les différents points"),
    (r"\bbarre d'outil\b", "barre d'outils"),
    (r"\bboite\b", "boîte"),
    (r"\btéléscopes\b", "télescopes"),
    (r"\bau dessus\b", "au-dessus"),
    (r"\bforme désiré\b", "forme désirée"),
    (r"\bapparait\b", "apparaît"),
    (r"\baparaît\b", "apparaît"),
    (r"\bPremiére\b", "Première"),
    (r"\bdiaogue\b", "dialogue"),
    (r"\bla bouton\b", "le bouton"),
    (r"\bEléments\b", "Éléments"),
    (r"\bEcran\b", "Écran"),
    (r"\bEdition\b", "Édition"),
    (r"\bOeil\b", "Œil"),
    (r"\boeil\b", "œil"),
    (r"\bA noter\b", "À noter"),
    (r"\bles modification effectuées\b", "les modifications effectuées"),
    (r"\bplutot\b", "plutôt"),
    (r"\bdes ces éléments\b", "de ces éléments"),
    (r"\bélément optiques\b", "éléments optiques"),
    (r"\bleurs saisie\b", "leur saisie"),
    (r"\bcombinaison de touche\b", "combinaison de touches"),
    (r"\bPolygône\b", "Polygone"),
    (r"\bpolygône\b", "polygone"),
    (r"\bcotés\b", "côtés"),
    (r"\bcoté\b", "côté"),
    (r"\brégles\b", "règles"),
    (r"\barrivesur\b", "arrive sur"),
    (r"\blesommet\b", "le sommet"),
    (r"\bcônique\b", "conique"),
    (r"\bparamétre\b", "paramètre"),
    (r"\btroué on non\b", "troué ou non"),
    (r"\bla cractère obtu\b", "le caractère obtus"),
    (r"\bobtu\b", "obtus"),
    (r"\baborbant", "absorbant"),
    (r"\btailleen\b", "taille en"),
    (r"\bLe point2\b", "Le point 2"),
    (r"\bLe nomre de rayons enfant\b", "Le nombre de rayons enfants"),
    (r"\bsi il\b", "s'il"),
    (r"\bindicence\b", "incidence"),
    (r"\bchacun de rayons\b", "chacun des rayons"),
    (r"\breléve\b", "relève"),
    (r"faisceau\.L'", "faisceau. L'"),
    (r"\bpshère\b", "sphère"),
    (r"\brepertoire\b", "répertoire"),
    (r"\bsauvagarde\b", "sauvegarde"),
    (r"\bextrèmes\b", "extrêmes"),
    (r"\binifini\b", "infini"),
    (r"\bl'onde diffracté\b", "l'onde diffractée"),
    (r"\bIL est\b", "Il est"),
    (r"\bnombre de trait par\b", "nombre de traits par"),
    (r"\biinertie\b", "inertie"),
    (r"\btourne alors de son centre\b", "tourne alors autour de son centre"),
    (r"\betc\.{2,}", "etc."),
    (r"\bnombre maximal d'enfant est\b", "nombre maximal d'enfants est"),
    (r"cher\.\.\.Le\b", "cher... Le"),
    (r"'Esc'", '"Esc"'),
    (r"(\d)\s?nm\b", "\\1" + NBSP + "nm"),
]

# Corrections propres à une page : copier-coller d'une autre page dans
# l'original (« à la construction de la sphère » dans la page de la lentille…)
# et quelques cas particuliers.
CORRECTIONS_PAGE = {
    "optgeo": [
        (r"^OptGeo, version 2\.20$", "OptGeo"),
        (r"\bsur le site de l'auteur\.", "sur le site de l'auteur (nécessite Internet)."),
    ],
    "diaphragme": [
        (r"représentant l'écran à l'écran", "représentant le diaphragme à l'écran"),
        (r"à la construction de l'écran", "à la construction du diaphragme"),
    ],
    "oeil": [
        (r"à la construction de l'écran", "à la construction de l'œil"),
    ],
    "lmc": [
        (r"à la construction du miroir", "à la construction de la lentille"),
    ],
    "lsr": [
        (r"\bElle est défini par\b", "Elle est définie par"),
        (r"à la construction du miroir", "à la construction de la lame"),
        (r"la normale au miroir", "la normale à la lame"),
    ],
    "lentille": [
        (r"à la construction de la sphère", "à la construction de la lentille"),
        (r"la normale au miroir", "la normale à la lentille"),
    ],
    "prisme": [
        (r"à la construction de la sphère", "à la construction du prisme"),
    ],
    "polyhedre": [
        (r"à la construction de la sphère", "à la construction du polygone"),
        (r"la normale au miroir", "la normale au polygone"),
    ],
    "polysphere": [
        (r"à la construction de la sphère", "à la construction du polycercle"),
        (r"la normale au miroir", "la normale au polycercle"),
    ],
    "sphere": [
        (r"la normale au miroir", "la normale à la sphère"),
    ],
    "reseau": [
        # Le signe de la seconde formule manquait (une espace insécable à sa
        # place) ; « + » d'après le calcul d'OptGeo (unit222.pas, réseau en
        # réflexion : arcsin(-sin(incidence) + k·λ/pas)).
        (r"^sin i -sin i0=k\.longueur d'onde /pas en transmission$",
         "sin i − sin i0 = k × longueur d'onde / pas, en transmission"),
        (r"^sin i sin i0=k\.longueur d'onde /pas en réflexion$",
         "sin i + sin i0 = k × longueur d'onde / pas, en réflexion"),
    ],
}

# Fautes qui ne doivent plus apparaître dans les pages produites.
FAUTES_INTERDITES = [
    r"\blicense\b", r"\bboite\b", r"\bEcran\b", r"\bEléments?\b", r"\bEdition\b",
    r"\bOeil\b", r"\boeil\b", r"\bOptgéo\b", r"\bOptGéo\b", r"\bpolygône\b", r"\bPolygône\b",
    r"\bpolyhèdre", r"\bPolyhèdre", r"\bfléche", r"\bisocéle", r"\bA noter\b",
    r"\bcotés\b", r"\bindicence\b", r"\baborbant", r"\bbarre d'outil\b", r"\bsi il\b",
    r"\bplutot\b", r"\bobtu\b", r"\bcônique\b", r"\brepertoire\b",
]

def typo(texte):
    """Typographie française des textes écrits dans ce script : espace insécable
    avant : ; ! ? et à l'intérieur des guillemets « », comme dans les pages portées
    (on écrit donc ici des espaces ordinaires, et les motifs à remplacer, copiés
    des pages produites, se retrouvent tels quels)."""
    texte = texte.replace("« ", "«" + NBSP).replace(" »", NBSP + "»")
    return re.sub(r" ([:;!?])", NBSP + r"\1", texte)


BANDEAU = typo(
    '<p class="encadre">Cette page reprend l\'aide d\'OptGeo 3.03, écrite pour un ordinateur et '
    "une souris, adaptée à la version web : les gestes (au doigt ou à la souris), les boutons et les "
    "menus décrits sont ceux de cette version. Mode d'emploi détaillé : "
    '<a href="web.html">Utiliser OptGeo sur le web</a>.</p>'
)


def pied(adaptee):
    """Pied de page ; « adaptee » : la page d'origine a été modifiée pour le web."""
    if adaptee:
        texte = ("Aide d'origine : OptGeo 3.03, Jean-Marie Biansan, licence GNU GPL v2 ou ultérieure. "
                 "Adapté pour la version web (2026) : instructions d'utilisation réécrites pour les gestes, "
                 "les boutons et les menus de cette version ; explications d'optique inchangées.")
    else:
        texte = ("Aide d'origine : OptGeo 3.03, Jean-Marie Biansan, licence GNU GPL v2 ou ultérieure. "
                 "Pages de la version web : 2026.")
    return typo("<footer><p>%s</p></footer>" % texte)


# ---------------------------------------------------------------------------
# Adaptation des pages d'origine à la version web
# ---------------------------------------------------------------------------
# Les pages d'OptGeo 3.03 décrivent le logiciel pour Windows (barre d'outils,
# « Fin prop. », clic simple, touche « Esc », Ctrl+R…). Les règles ci-dessous
# remplacent ces instructions par les gestes et les libellés réels de la version
# web (index.html, js/interface/*.js), sans toucher aux explications d'optique.
# Elles s'appliquent au HTML produit, après la conversion ; chaque règle propre
# à une page doit trouver son motif exactement une fois, sinon le script échoue
# (une nouvelle version de l'aide d'origine serait ainsi repérée). Les textes sont
# écrits avec des espaces ordinaires : typo() les met aux normes des pages.
#
# Libellés de l'application (à revoir si l'interface change) :
#   palette : familles « Miroirs », « Écrans », « Sources », « Dioptres », « Divers »
#   et boutons courts de 30-creation.js (OUTILS[…].court) ;
#   menu : rubriques « Fichier », « Édition », « Ajouter (par coordonnées) »,
#   « Options », « Aide » (60-app.js, construireMenu) ;
#   bouton « Affichage » : interrupteurs « Normales », « Angles d'incidence et de
#   réfraction », « Grille », « Attraction de la grille », « Longueurs des segments » ;
#   barre en bas du dessin : « Propriétés », « Dupliquer », « Supprimer »,
#   « Grouper avec… », « Dissocier », « Désélectionner » ;
#   panneau des propriétés : « Supprimer », « Aide », « Annuler », « Valider » ;
#   bandeau de consigne : « Terminer » (Déplacer, Propriétés, Grouper),
#   « Annuler » (création, Dupliquer, Supprimer, Grouper).

VOIR_PLACER = '(voir <a href="web.html#placer">Placer un objet</a>)'


def ajout_palette(boutons, famille, suite, apres=""):
    """Puce « ajout au doigt ou à la souris » d'une page d'objet."""
    return ("<li>en touchant (ou en cliquant) le bouton %s de la palette des objets (famille « %s »), "
            "puis %s %s.%s</li>" % (boutons, famille, suite, VOIR_PLACER, apres))


def ajout_menu(element, groupe, apres=""):
    """Puce « ajout par coordonnées » d'une page d'objet."""
    return ("<li>menu « Ajouter (par coordonnées) », puis %s (sous « %s ») : le panneau des "
            "propriétés s'ouvre, déjà rempli, et le bouton « Valider » ajoute l'élément.%s</li>"
            % (element, groupe, apres))


# Puce « en cliquant sur le bouton de la barre d'outils… » et puce « menu Ajouter
# puis… » de chaque page d'objet : remplacées en entier (de leur début à </li>).
DEBUT_PALETTE = "<li>en cliquant sur le bouton de la barre d'outils"
DEBUT_MENU = "<li>menu « Ajouter » puis"

# Règles communes (appliquées partout où le motif se trouve).
ADAPTATIONS_COMMUNES = [
    ("<li>à tout instant en cliquant sur le bouton « Propriétés » de la barre d'outils, puis en "
     "cliquant sur un des cercles bleus qui apparaissent sur l'élément dont on veut obtenir les "
     "propriétés ; ne pas oublier à la fin de cliquer sur le bouton « Fin prop. » de la barre "
     "d'outils pour quitter le mode propriétés.</li>",
     "<li>à tout instant en touchant (ou en cliquant) l'élément pour le sélectionner, puis le bouton "
     "« Propriétés » de la barre qui apparaît en bas du dessin ; le panneau des propriétés s'ouvre, "
     "son bouton « Valider » applique les modifications et « Annuler » les abandonne. On peut aussi "
     "toucher le bouton « Propriétés » de la barre du haut, puis l'élément : ce mode reste actif "
     "jusqu'au bouton « Terminer » du bandeau de consigne (ou la touche Échap).</li>"),
    ("si on passe par le menu « Ajouter »",
     "si on passe par le menu « Ajouter (par coordonnées) »"),
    ("<li>dans la barre d'outils, boîte à cocher « Normales »</li>",
     "<li>bouton « Affichage » de la barre du haut, interrupteur « Normales »</li>"),
    ("<li>dans la barre d'outils, boîte à cocher « Angles d'incidence et de réfraction »</li>",
     "<li>bouton « Affichage » de la barre du haut, interrupteur « Angles d'incidence et de "
     "réfraction »</li>"),
    # choix du panneau des propriétés (40-proprietes.js, REFLECHI), cités avec leur majuscule
    ("le rayon réfléchi peut exister « toujours », « jamais », « seulement si le réfracté existe », "
     "« seulement si le réfracté n'existe pas ».",
     "le rayon réfléchi peut exister « Toujours », « Jamais », « Seulement si le réfracté existe », "
     "« Seulement si le réfracté n'existe pas » (choix de la partie « Rayon réfléchi » du panneau "
     "des propriétés)."),
    ('Pour modifier la liste des éléments proposés, <a href="materiaux.html">cliquer ici.</a>',
     'Voir la <a href="materiaux.html">liste des matériaux</a> et de leurs indices.'),
]

# Règles propres à chaque page : (motif, remplacement) remplace le motif, qui doit
# se trouver une fois ; ("BLOC", début, fin, remplacement) remplace du début à la
# fin incluse (première occurrence de la fin après le début) ; ("AVANT", début,
# fin, remplacement) s'arrête juste avant la fin.
ADAPTATIONS = {
    "optgeo": [
        ('<li><a href="#souris">Remarque importante : utilisation de la souris</a></li>',
         '<li><a href="#souris">Remarque importante : placer les points (doigt ou souris)</a></li>'),
        ("<p>Le répertoire « exemples » contient un certain nombre de simulations toutes faites.</p>",
         "<p>Le menu « Fichier », « Ouvrir un exemple… », propose 56 simulations toutes faites.</p>"
         "\n<p>Dans la version web, le bouton « Menu » (en haut à gauche) regroupe les menus d'OptGeo : "
         "« Fichier », « Édition », « Ajouter (par coordonnées) », « Options » et « Aide ». La barre du "
         "haut porte aussi les boutons « Annuler », « Refaire », les modes « Déplacer », « Propriétés », "
         "« Dupliquer », « Supprimer », « Grouper » (réunis sous le bouton « Modes » sur un écran "
         "étroit) et le bouton « Affichage » (normales, angles, grille, zoom). Les éléments s'ajoutent "
         "depuis la palette des objets, à gauche (ou en bas sur un écran tenu en hauteur).</p>"),
        ("AVANT", '<h2 id="souris">', '<h2 id="ajouter">',
         '<h2 id="souris">Remarque importante : placer les points (doigt ou souris)</h2>\n'
         "<p>Un élément optique est repéré par au moins 2 points, que l'on place l'un après l'autre en "
         "suivant la consigne du bandeau affiché en haut du dessin. Pour un miroir plan par exemple :</p>\n"
         "<ul>\n"
         "<li>au doigt : on appuie à l'endroit où doit se situer le 1er bord du miroir, on fait glisser "
         "le doigt pour viser précisément (une loupe montre ce qui est caché sous le doigt, avec les "
         "coordonnées), puis on relâche : le point est placé au moment où le doigt se lève ; on fait de "
         "même pour le 2e bord ;</li>\n"
         "<li>à la souris : un clic à l'endroit du 1er bord, puis un clic à l'endroit du 2e bord ; entre "
         "les deux, l'aperçu du miroir suit la souris.</li>\n"
         "</ul>\n"
         "<p><strong>Remarque :</strong> pour placer 2 points consécutifs sur une même horizontale, toucher "
         "le bouton « Aligner horizontalement » du bandeau avant de placer le second point (à "
         "l'ordinateur, on peut aussi maintenir la touche « Ctrl » enfoncée pendant le clic du second "
         "point). Pour les placer sur une même verticale, même procédure avec le bouton « Aligner "
         "verticalement » (ou la touche « Alt »). Ces boutons ne valent que pour l'élément en cours de "
         "construction ; tant que l'un d'eux est actif, le bandeau affiche « Alignement horizontal » "
         "(ou « Alignement vertical »). Sur un petit écran (largeur de 560 pixels au plus, ou hauteur "
         "de 420 pixels au plus), le bandeau tient sur une ligne et ces boutons sont derrière son "
         "bouton « Plus » (« Moins » les cache de nouveau).</p>\n"),
        ("AVANT", '<h2 id="ajouter">', '<h2 id="deplacer">',
         '<h2 id="ajouter">Ajouter un élément ou une source</h2>\n'
         "<p>Pour chaque élément, il existe 2 méthodes d'ajout : au doigt (ou à la souris), et par "
         "coordonnées. L'ajout au doigt est rapide, mais certaines propriétés de l'élément déposé ont "
         "des valeurs standard. L'ajout par coordonnées est plus long mais permet de régler tous les "
         "paramètres. On peut aussi utiliser les 2 méthodes : ajout rapide au doigt, puis "
         '<a href="#modifier">modification des propriétés</a>.</p>\n'
         "<p>Pour ajouter au doigt ou à la souris : il suffit de toucher une famille de la palette des "
         "objets (« Miroirs », « Écrans », « Sources », « Dioptres », « Divers »), puis le bouton de "
         "l'élément, puis de placer les différents points : voir la "
         '<a href="#souris">remarque importante</a> sur le placement des points. La case « Rester dans '
         "ce mode » du bandeau permet d'ajouter plusieurs éléments du même type à la suite.</p>\n"
         "<p>Pour ajouter par coordonnées, il faut passer par le menu « Ajouter (par coordonnées) » : "
         "le panneau des propriétés de l'élément s'ouvre, déjà rempli ; on règle les valeurs, puis on "
         "touche « Valider ».</p>\n"
         "<p>Remarque : obtention de <strong>miroirs troués</strong> : il peut être utile dans certains "
         "cas de trouer les miroirs sphériques en leur centre (combinaisons optiques de certains "
         "télescopes par exemple) ; pour cela, commencer par ajouter un miroir normal ; puis "
         '<a href="#modifier">modifier</a> le miroir, et choisir dans le panneau des propriétés du '
         "miroir de le trouer (case « Trouer ») et la taille du trou.</p>\n"),
        ("AVANT", '<h2 id="deplacer">', '<h2 id="modifier">',
         '<h2 id="deplacer">Déplacer un élément ou une source</h2>\n'
         "<p>Le plus simple : toucher (ou cliquer) l'élément ; il est sélectionné et ses poignées "
         "apparaissent. On peut aussi toucher le bouton « Déplacer » de la barre du haut, ou passer par "
         "le menu « Édition » puis « Déplacer un élément » : les poignées de tous les éléments présents "
         "apparaissent alors en même temps. Les poignées sont placées sur les points caractéristiques "
         "des éléments :</p>\n"
         "<ul>\n"
         "<li>croix verte : translater l'élément ;</li>\n"
         "<li>cercle bleu : faire bouger un point sans faire bouger les autres (ce déplacement permet "
         "aussi une dilatation ou une rétraction de l'élément) ;</li>\n"
         "<li>disque rouge : faire tourner l'élément ;</li>\n"
         "<li>croix cyan : déplacer un centre de courbure ou un foyer (ou le bord du trou d'un "
         "diaphragme) ;</li>\n"
         "<li>croix jaune : déplacer le sommet d'un arc de cercle (polycercle).</li>\n"
         "</ul>\n"
         "<p>La méthode est la suivante : on appuie sur la poignée, on la fait glisser jusqu'à "
         "destination, et on relâche ; l'élément est redessiné « en direct » au fur et à mesure du "
         "déplacement. On peut aussi faire glisser l'élément lui-même pour le translater. Pendant le "
         "glissement, la touche Échap (ou un deuxième doigt posé sur le dessin) remet l'élément à sa "
         "place.</p>\n"
         "<p><strong>Déplacement vertical :</strong> toucher le bouton « Bloquer verticalement » du "
         "bandeau, en mode « Déplacer » avant de commencer le glissement, ou pendant le glissement (avec "
         "un autre doigt) ; à l'ordinateur, on peut aussi maintenir la touche « Alt » enfoncée pendant le "
         "glissement. Le blocage ne vaut que pour ce glissement : il est relâché quand le doigt (ou le "
         "bouton de la souris) se lève. Tant que le bouton est actif, le bandeau affiche « Bloqué : "
         "vertical ».</p>\n"
         "<p><strong>Déplacement horizontal :</strong> de même avec le bouton « Bloquer "
         "horizontalement » (ou la touche « Ctrl ») ; le bandeau affiche alors « Bloqué : "
         "horizontal ».</p>\n"
         "<p><strong>Important :</strong> en mode « Déplacer », une fois les modifications effectuées, "
         "on revient au mode normal par le bouton « Terminer » du bandeau de consigne (ou la touche "
         "Échap, ou en touchant de nouveau le bouton « Déplacer »).</p>\n"
         "<p><strong>Conseil :</strong> si vous avez du mal à différencier 2 points trop proches, "
         "zoomez pour les séparer (deux doigts écartés sur le dessin, molette de la souris, boutons "
         "ronds à droite du dessin, ou zooms ×1 à ×100 du bouton « Affichage »). Si vous n'y arrivez "
         "pas comme ça, passez plutôt par « Propriétés ».</p>\n"),
        ("AVANT", '<h2 id="modifier">', '<h2 id="supprimer">',
         '<h2 id="modifier">Modifier un élément ou une source</h2>\n'
         "<p>Toucher (ou cliquer) l'élément pour le sélectionner, puis le bouton « Propriétés » de la "
         "barre qui apparaît en bas du dessin. On peut aussi toucher le bouton « Propriétés » de la barre "
         "du haut, ou passer par le menu « Édition » puis « Propriétés d'un élément » : un cercle bleu "
         "apparaît sur chacun des éléments présents, et il suffit de toucher l'élément voulu (si "
         "plusieurs éléments se trouvent à cet endroit, une liste permet de choisir).</p>\n"
         "<p>Le panneau des propriétés de l'élément s'ouvre alors (à droite du dessin, ou en bas sur un "
         "écran tenu en hauteur) ; c'est le même panneau que lors d'un ajout par le menu « Ajouter (par "
         "coordonnées) ». On valide les modifications par le bouton « Valider » du panneau, ou on "
         "abandonne par « Annuler ». Une valeur refusée est signalée sous le champ concerné.</p>\n"
         "<p><strong>Important :</strong> en mode « Propriétés », une fois les modifications "
         "effectuées, on revient au mode normal par le bouton « Terminer » du bandeau de consigne (ou la "
         "touche Échap).</p>\n"),
        ("AVANT", '<h2 id="supprimer">', '<h2 id="grouper">',
         '<h2 id="supprimer">Supprimer un élément ou une source</h2>\n'
         "<p>Toucher (ou cliquer) l'élément pour le sélectionner, puis le bouton « Supprimer » de la "
         "barre en bas du dessin (à l'ordinateur, touche Suppr, qui supprime l'élément sélectionné). On "
         "peut aussi toucher le bouton "
         "« Supprimer » de la barre du haut, ou passer par le menu « Édition » puis « Supprimer un "
         "élément » (ce mode n'a pas de raccourci clavier) : un cercle rouge apparaît sur chacun des "
         "éléments présents, et il suffit de toucher l'élément à supprimer.</p>\n"
         "<p>La suppression est immédiate, sans demande de confirmation, mais on peut la défaire par le "
         "bouton « Annuler » du message qui s'affiche alors, ou par le bouton « Annuler » de la barre du "
         "haut. Une fois la suppression effectuée, le logiciel quitte automatiquement le mode "
         "suppression. Si en fin de compte on ne veut rien supprimer, il faut toucher le bouton "
         "« Annuler » du bandeau de consigne.</p>\n"
         "<p>Remarque : pour supprimer tous les éléments, passer par le menu « Édition », puis "
         "« Supprimer tous les éléments » (une confirmation est demandée) ; pour repartir d'une "
         "simulation vierge, passer par le menu « Fichier », puis « Nouvelle simulation… ».</p>\n"),
        ("AVANT", '<h2 id="grouper">', '<h2 id="dupliquer">',
         '<h2 id="grouper">Grouper des éléments</h2>\n'
         "<p>On peut grouper des éléments afin de pouvoir les translater ensemble.</p>\n"
         "<ul>\n"
         "<li>Première méthode : toucher le bouton « Grouper » de la barre du haut (ou, un élément étant "
         "sélectionné, le bouton « Grouper avec… » de la barre en bas du dessin) ; sur chacun des "
         "éléments présents dans la simulation apparaît une croix violette ; il suffit de toucher un "
         "élément pour l'ajouter au groupe (un message le confirme ; le toucher de nouveau le retire) ; "
         "une fois tous les éléments souhaités ajoutés, toucher le bouton « Terminer » du bandeau. Une "
         "boîte de dialogue confirme la création du groupe.</li>\n"
         "<li>Deuxième méthode : menu « Édition » puis « Grouper tous les éléments » ou « Grouper des "
         "éléments à choisir ». Dans le second cas, le choix des éléments se fait comme dans la première "
         "méthode. Dans le premier cas, après confirmation, un groupe est créé qui contient tous les "
         "éléments présents.</li>\n"
         "</ul>\n"
         "<p>Déplacement d'un groupe : le groupe est représenté par une croix verte et les lettres "
         "« Gr », visibles quand un de ses éléments est sélectionné (et pour tous les groupes en mode "
         "« Déplacer ») ; on le déplace en faisant glisser cette croix, comme pour un élément classique. "
         "Ce point est l'isobarycentre des points caractéristiques des éléments constitutifs du "
         "groupe.</p>\n"
         "<p>Destruction d'un groupe : sélectionner un de ses éléments, puis toucher le bouton "
         "« Dissocier » de la barre en bas du dessin ; les éléments restent en place.</p>\n"),
        ("AVANT", '<h2 id="dupliquer">', '<h2 id="Annuler">',
         '<h2 id="dupliquer">Dupliquer un élément ou une source</h2>\n'
         "<p>Toucher (ou cliquer) l'élément pour le sélectionner, puis le bouton « Dupliquer » de la "
         "barre en bas du dessin. On peut aussi toucher le bouton « Dupliquer » de la barre du haut, ou "
         "passer par le menu « Édition » puis « Dupliquer un élément » : un cercle bleu apparaît sur "
         "chacun des éléments présents, et il suffit de toucher l'élément à dupliquer.</p>\n"
         "<p>La copie apparaît légèrement décalée et reste sélectionnée : on la fait glisser où l'on "
         "veut. Une fois la duplication effectuée, le logiciel quitte automatiquement le mode "
         "duplication. Si en fin de compte on ne veut rien dupliquer, il faut toucher le bouton "
         "« Annuler » du bandeau de consigne.</p>\n"),
        ("AVANT", '<h2 id="Annuler">', '<h2 id="annulerretablir">',
         '<h2 id="Annuler">Annuler une opération en cours</h2>\n'
         "<p>Pour annuler l'opération en cours, toucher le bouton « Annuler » du bandeau de consigne "
         "(placement des points d'un nouvel élément ; modes « Dupliquer », « Supprimer » et "
         "« Grouper »), ou appuyer sur la touche Échap du clavier, qui fait aussi sortir des modes "
         "« Déplacer » et « Propriétés ». Pendant le glissement d'une poignée, la touche Échap ou un "
         "deuxième doigt posé sur le dessin remet l'élément à sa place.</p>\n"),
        ("AVANT", '<h2 id="annulerretablir">', '<h2 id="options">',
         '<h2 id="annulerretablir">Annuler/Rétablir les dernières opérations</h2>\n'
         "<p>Les dernières opérations (à savoir : ajout ou suppression d'un élément, modification de ses "
         "propriétés, déplacement, groupement, duplication) peuvent être annulées (jusqu'à 50 niveaux "
         "d'annulation) au moyen du bouton « Annuler » de la barre du haut, ou de la combinaison de "
         "touches Ctrl+Z (ou : menu « Édition », « Annuler »). Et si en fait on ne voulait pas annuler "
         "(seuls les sots ne changent jamais d'avis !), on rétablit au moyen du bouton « Refaire », ou de "
         "la combinaison de touches Ctrl+Y (ou Ctrl+Maj+Z ; ou : menu « Édition », « Refaire »).</p>\n"
         "<p>Les options d'affichage (normales et angles, grille et son attraction, longueurs des "
         "segments, contrôle des points trop proches, zoom) ne sont pas touchées par « Annuler » et "
         "« Refaire » : elles gardent leur valeur du moment.</p>\n"
         "<p><strong>Attention :</strong> dans OptGeo 3.03, on rétablissait par Ctrl+R ; dans un "
         "navigateur, Ctrl+R recharge la page (le travail est gardé sur l'appareil, mais l'historique "
         "des annulations est perdu).</p>\n"),
        ("AVANT", '<h2 id="options">', "\n<h3>Normales</h3>",
         '<h2 id="options">Options</h2>\n'
         "<h3>Grille</h3>\n"
         "<p>On peut utiliser une grille pour le repérage des points et/ou leur saisie. Pour cela, "
         "passer par le menu « Options » (« Afficher la grille », « Attraction de la grille », "
         "« Options de la grille… »).</p>\n"
         "<p>Si « Attraction de la grille » est coché, lors de la saisie d'un point, c'est le point le "
         "plus proche appartenant à la grille qui est validé. Ceci est vrai lors de l'ajout d'éléments "
         "(sauf pour les mesures de distance et d'angle) et lors de leur translation.</p>\n"
         "<p>Dans certaines situations, l'attraction n'est pas appliquée ; c'est le cas par exemple lors "
         "de la saisie du foyer d'une lentille : les bords de la lentille étant déjà choisis, l'axe "
         "focal est imposé, et le foyer ne peut pas être placé forcément sur un point de la grille.</p>\n"
         "<p>L'affichage de la grille et son attraction peuvent être activés directement par les "
         "interrupteurs « Grille » et « Attraction de la grille » du bouton « Affichage » de la barre "
         "du haut.</p>"),
        ("BLOC", "<p>On peut demander à ce que les normales aux dioptres", "</p>",
         "<p>On peut demander à ce que les normales aux dioptres et aux miroirs soient affichées. Pour "
         "cela, passer par le menu « Options » puis « Afficher les normales », ou par l'interrupteur "
         "« Normales » du bouton « Affichage ». Un paramétrage plus fin du tracé peut être obtenu par le "
         "menu « Options », puis « Options des normales… ».</p>"),
        ("BLOC", "<p>On peut aussi demander à ce que les angles d'incidence", "</p>",
         "<p>On peut aussi demander à ce que les angles d'incidence et de réfraction soient affichés, "
         "soit par le menu « Options » puis « Afficher les angles », soit par l'interrupteur « Angles "
         "d'incidence et de réfraction » du bouton « Affichage ».</p>"),
        ("AVANT", "<h3>Association des fichiers .opt avec OptGeo</h3>", None,
         "<h3>Ouvrir un fichier .opt</h3>\n"
         "<p>L'association des fichiers de simulation .opt avec OptGeo n'existe pas dans la version "
         "web : on ouvre un fichier par le menu « Fichier », « Ouvrir un fichier de l'appareil… » (à "
         "l'ordinateur : Ctrl+O). Les fichiers enregistrés par la version web restent lisibles par "
         "OptGeo 3.03.</p>\n"
         "<h3>Couleur de fond</h3>\n"
         "<p>Permet de changer la couleur de fond de la simulation : menu « Options », « Couleur de "
         "fond ou image de fond… » (la version web permet aussi de mettre en fond une image de "
         "l'appareil, par le bouton « Choisir une image… »). Cette image reste sur l'appareil : elle "
         "n'est pas enregistrée dans le fichier .opt (comme dans OptGeo) et n'est pas gardée après un "
         "rechargement de la page ; il faut alors la choisir de nouveau.</p>\n"
         '<h2 id="preferences">Préférences</h2>\n'
         "<p>Permet de choisir les attributs par défaut des éléments à la création : menu « Fichier », "
         "« Préférences… ». Dans la version web, on règle la couleur, la couleur de l'axe et "
         "l'épaisseur de chaque type d'élément (pas la police) ; ces réglages sont gardés sur "
         "l'appareil.</p>\n"),
    ],
    "rayon": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Rayon »", "Sources", "en plaçant le premier point, puis le second")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Rayon unique »", "Source")),
    ],
    "sponct": [
        ("L'ordre des points 1 et 2 n'est pas indifférent : les rayons sont émis entre S-1 et S-2 dans "
         "le sens trigo direct.",
         "L'ordre des points 1 et 2 n'est pas indifférent : les rayons sont émis entre S-1 et S-2 dans "
         "le sens trigo direct. À la construction au doigt ou à la souris, la version web range les "
         "points 1 et 2 pour que le faisceau couvre le plus petit des deux secteurs ; pour obtenir le "
         "grand secteur, déplacer ensuite une poignée ou modifier les propriétés."),
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Objet réel » ou « Objet virtuel »", "Sources",
                       "en plaçant le point source S, puis le point 1, puis le point 2, et enfin en donnant, "
                       "dans la boîte de saisie qui s'ouvre alors, le nombre de rayons composant le faisceau")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Objet ponctuel réel ou virtuel »", "Source")),
        ("à la construction du rayon si on passe par le menu « Ajouter »",
         "à la construction de la source si on passe par le menu « Ajouter (par coordonnées) »"),
    ],
    "op": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Onde plane »", "Sources",
                       "en plaçant le point 1, puis le point D, puis le point 2, et enfin en donnant, dans la "
                       "boîte de saisie qui s'ouvre alors, le nombre de rayons composant le faisceau",
                       " Le point 2 sera automatiquement ramené sur la perpendiculaire à 1D passant par 1.")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Onde plane (faisceau parallèle) »", "Source")),
        ("à la construction du rayon si on passe par le menu « Ajouter »",
         "à la construction de l'onde plane si on passe par le menu « Ajouter (par coordonnées) »"),
    ],
    "miroirplan": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Miroir plan »", "Miroirs", "en plaçant le premier point, puis le second")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Miroir plan »", "Système optique idéal")),
    ],
    "miroirspheriqueparaxial": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Concave idéal » ou « Convexe idéal »", "Miroirs",
                       "en plaçant le premier point, puis le second, puis la position du foyer")),
        ("BLOC", DEBUT_MENU, "</li>",
         ajout_menu("« Miroir sphérique concave (paraxial) » ou « Miroir sphérique convexe (paraxial) »",
                    "Système optique idéal",
                    " On donne alors les coordonnées des points 1 et 2, puis la valeur de la focale.")),
    ],
    "miroirspheriquereel": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Concave réel » ou « Convexe réel »", "Miroirs",
                       "en plaçant le premier point, puis le second, puis le point C (il est placé "
                       "automatiquement sur la médiatrice des points 1 et 2)")),
        ("BLOC", DEBUT_MENU, "</li>",
         ajout_menu("« Miroir sphérique concave (réel) » ou « Miroir sphérique convexe (réel) »",
                    "Système optique réel",
                    " On donne alors les coordonnées des points 1 et 2, la valeur du rayon de courbure, et "
                    "le caractère aigu ou obtus de l'angle d'ouverture du miroir (en effet, pour 1 et 2 "
                    "donnés et le rayon de courbure donné, il existe deux miroirs sphériques ; celui appelé "
                    "« Obtus » correspond à un angle d'ouverture (angle entre CM1 et CM2) obtus).")),
    ],
    "miroirconique": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Conique concave » ou « Conique convexe »", "Miroirs",
                       "en plaçant le point 1, puis le foyer, puis le sommet, puis le point 2")),
        ("BLOC", DEBUT_MENU, "</li>",
         ajout_menu("« Miroir conique »", "Système optique réel",
                    " Dans ce cas, on définit le miroir par les coordonnées de F, l'angle polaire de l'axe "
                    "focal (angle entre Fx et FS, compté positif dans le sens antihoraire), les angles "
                    "polaires de FM1 et FM2 (M1 et M2 étant les extrémités du miroir), le paramètre de la "
                    "conique, et son excentricité. On donne aussi le caractère concave ou convexe du "
                    "miroir.")),
    ],
    "lmc": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Convergente » ou « Divergente »", "Dioptres",
                       "en plaçant le premier point, puis le second, puis la position du foyer")),
        ("BLOC", DEBUT_MENU, "</li>",
         ajout_menu("« Lentille mince convergente » ou « Lentille mince divergente »", "Système optique idéal",
                    " On donne alors les coordonnées des points 1 et 2, puis la valeur de la focale.")),
    ],
    "lentille": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Lentille épaisse »", "Dioptres",
                       "en plaçant chacun des sommets, puis chacun des centres de courbure (ils sont "
                       "automatiquement ramenés sur l'axe S1S2), et enfin en saisissant le diamètre de la "
                       "lentille")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Lentille épaisse »", "Système optique réel")),
    ],
    "sphere": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Sphère »", "Dioptres",
                       "en plaçant le centre, puis un point de la surface quand la bonne taille est atteinte "
                       "(l'aperçu de la sphère suit le doigt ou la souris)")),
        ("BLOC", DEBUT_MENU, "</li>",
         ajout_menu("« Sphère réfractante »", "Système optique réel",
                    " On donne alors les coordonnées du centre, et la valeur du rayon.")),
    ],
    "polyhedre": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Polygone »", "Dioptres",
                       "en choisissant le nombre de sommets dans la boîte « Nombre de sommets » qui s'ouvre "
                       "(champ « Sommets de ce polygone »), puis en plaçant chacun des sommets ; le bandeau "
                       "indique le mode « ajout d'un polygone réfractant »",
                       " On peut aussi fermer le polygone plus tôt, à partir du 3e sommet, en touchant le "
                       "sommet 1 ou le bouton « Fermer le polygone » du bandeau.")),
        ("BLOC", DEBUT_MENU, "</li>",
         ajout_menu("« Polygone réfractant »", "Système optique réel",
                    " On donne alors les coordonnées des sommets (les boutons « Insérer après » et "
                    "« Retirer » ajoutent ou enlèvent un sommet).")),
    ],
    "polysphere": [
        ("<strong>attention</strong>, le logiciel ne fait pas la vérification, et peut planter si vous ne "
         "respectez pas cette condition.",
         "<strong>attention</strong>, le logiciel ne fait pas la vérification : si vous ne respectez pas "
         "cette condition, le résultat n'est pas garanti (OptGeo 3.03 pouvait même planter)."),
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Polycercle »", "Dioptres",
                       "en choisissant le nombre de sommets dans la boîte « Nombre de sommets » qui s'ouvre "
                       "(champ « Sommets de ce polycercle »), puis en plaçant chacun des sommets (le bandeau "
                       "indique le mode « ajout d'un polycercle réfractant »), puis en choisissant dans la "
                       "boîte « Relier les points » "
                       "le caractère segment ou arc de cercle de chacun des côtés, et enfin en plaçant le "
                       "sommet de chacun des arcs de cercle (s'il y en a)")),
        ("BLOC", DEBUT_MENU, "</li>",
         ajout_menu("« Polycercle réfractant »", "Système optique réel",
                    " On donne alors les coordonnées des sommets, etc.")),
    ],
    "prisme": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Prisme »", "Dioptres",
                       "en plaçant le centre d'inertie, puis le sommet principal, puis un dernier point qui "
                       "fixe l'angle au sommet (en fixant un des 2 derniers sommets)")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Prisme »", "Système optique réel")),
        ("<p>On peut déplacer :</p>",
         "<p>Quand ses poignées sont affichées (prisme sélectionné, ou mode « Déplacer »), on peut "
         "faire glisser :</p>"),
        ("<li>le sommet principal : le prisme tourne",
         "<li>le sommet principal (disque rouge) : le prisme tourne"),
        ("<li>le centre d'inertie : translation du prisme</li>",
         "<li>le centre d'inertie (croix verte) : translation du prisme</li>"),
        ("<li>les 2 autres sommets : avec l'un",
         "<li>les 2 autres sommets (cercles bleus) : avec l'un"),
    ],
    "ecran": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Écran »", "Écrans", "en plaçant le premier point, puis le second")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Écran »", "Système optique idéal")),
    ],
    "diaphragme": [
        ("Il est défini à la souris par les points C",
         "Il est défini, à la construction, par les points C"),
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Diaphragme »", "Écrans", "en plaçant le centre, puis le premier point, puis le second")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Diaphragme »", "Système optique idéal")),
        ("<p>Quand on est en mode déplacement, on peut :</p>",
         "<p>Quand ses poignées sont affichées (diaphragme sélectionné, ou mode « Déplacer »), on "
         "peut :</p>"),
        ("<li>translater le diaphragme</li>",
         "<li>translater le diaphragme (croix verte, au centre)</li>"),
        ("<li>changer son orientation et sa taille extérieure en utilisant les points extrêmes</li>",
         "<li>changer son orientation et sa taille extérieure en utilisant les points extrêmes (cercles "
         "bleus) ; les disques rouges le font seulement tourner</li>"),
        ("<li>changer son rayon intérieur (ouverture du diaphragme) en utilisant les points intérieurs</li>",
         "<li>changer son rayon intérieur (ouverture du diaphragme) en utilisant les points intérieurs "
         "(croix cyan)</li>"),
    ],
    "lsr": [
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Lame semi-réfl. »", "Miroirs", "en plaçant le premier point, puis le second")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Lame semi-réfléchissante »", "Système optique idéal")),
    ],
    "reseau": [
        ("<p>Il est défini à la souris par les extrémités 1 et 2</p>",
         "<p>Il est défini par les extrémités 1 et 2, que l'on place au doigt ou à la souris après avoir "
         "touché le bouton « Réseau » de la palette des objets (famille « Divers ») %s ; on peut aussi "
         "passer par le menu « Ajouter (par coordonnées) », puis « Réseau diffractant » (sous "
         "« Divers »).</p>" % VOIR_PLACER),
        ("<p>Une boîte de dialogue permet ensuite de choisir</p>",
         "<p>Le panneau des propriétés s'ouvre ensuite pour choisir</p>"),
    ],
    "oeil": [
        ("Il est défini à la souris par les points 1 (rétine)",
         "Il est défini, à la construction, par les points 1 (rétine)"),
        ("BLOC", DEBUT_PALETTE, "</li>",
         ajout_palette("« Œil »", "Écrans", "en plaçant le point 1, puis le second")),
        ("BLOC", DEBUT_MENU, "</li>", ajout_menu("« Œil stylisé »", "Divers")),
        ("<p>Quand on est en mode déplacement, on peut :</p>",
         "<p>Quand ses poignées sont affichées (œil sélectionné, ou mode « Déplacer »), on peut :</p>"),
        ("<li>translater l'œil en le prenant par la rétine</li>",
         "<li>translater l'œil en le prenant par la rétine (croix verte)</li>"),
        ("<li>changer son orientation et sa taille en utilisant l'autre point</li>",
         "<li>changer son orientation et sa taille en utilisant l'autre point (cercle bleu, au centre de "
         "la pupille)</li>"),
    ],
    "materiaux": [
        ("<h1>Modification de la liste des matériaux proposés</h1>",
         "<h1>Liste des matériaux proposés</h1>\n"
         '<p>Dans la version web, la liste des matériaux est intégrée à l\'application '
         "et ne peut pas être modifiée. On choisit un matériau dans la liste « Matériau » du panneau "
         "des propriétés d'un milieu réfractant (lentille épaisse, sphère, polygone, prisme, "
         "polycercle), ou « Saisie libre » pour entrer soi-même les trois indices.</p>\n"
         "%%TABLEAU_MATERIAUX%%\n"
         "<h2>Modifier la liste dans OptGeo 3.03 (version pour ordinateur)</h2>\n"
         "<p>Ce qui suit ne concerne que le logiciel OptGeo 3.03 installé sur un ordinateur.</p>"),
    ],
}

# Instructions de l'interface Windows qui ne doivent plus apparaître (texte
# visible des pages d'origine adaptées). « Ctrl+R » n'est permis que dans la
# phrase qui prévient qu'il recharge la page.
INTERDITS_WEB = [
    r"barre d'outils", r"Fin prop", r"Fin [Dd]épl", r"Fin suppr", r"Fin dupl", r"« Fin »", r"« Gr\. »",
    r"clic simple", r"\bEsc\b", r"Ctrl\+R\b(?![^.]*recharge)", r"[Bb]oîte à cocher", r"[Cc]ase à cocher",
    r"curseur", r"double-clic", r"cliquer sur le bouton", r"cliquant sur le bouton", r"« OK »",
    r"ne pas maintenir", r"menu « Ajouter » puis", r"menu « Ajout »", r"\bmenu ajouter\b",
    r"\bà la souris par\b", r"cliquer deux fois", r"[Rr]épertoire", r"[Bb]loc-notes", r"Windows",
    r"mode déplacement", r"cliquer ici",
]
# Pages où un motif interdit est permis parce qu'il décrit explicitement OptGeo 3.03.
INTERDITS_PERMIS = {
    "materiaux": {r"[Rr]épertoire", r"[Bb]loc-notes", r"Windows"},
}


def tableau_materiaux():
    """Tableau des matériaux de la version web, lu dans js/interface/00-outils.js."""
    source = ICI.parent / "js" / "interface" / "00-outils.js"
    texte = source.read_text(encoding="utf-8")
    bloc = re.search(r"OGW\.MATERIAUX = \[(.*?)\]\.map", texte, re.S)
    if not bloc:
        raise SystemExit("Liste OGW.MATERIAUX introuvable dans %s" % source)
    lignes = re.findall(r"\['([^']+)', ([\d.]+), ([\d.]+), ([\d.]+)\]", bloc.group(1))
    if len(lignes) < 5:
        raise SystemExit("Liste OGW.MATERIAUX illisible dans %s" % source)

    def n(v):
        return v.replace(".", ",")
    corps = "".join(
        "<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>\n" % (
            html.escape(nom.replace("’", "'"), quote=False), n(b), n(v), n(r))
        for nom, b, v, r in lignes)
    return typo(
        "<h2>Matériaux proposés dans la version web</h2>\n"
        "<p>Indices de réfraction pour les longueurs d'onde de référence (bleu : 486,1 nm ; vert : "
        "587,6 nm ; rouge : 656,3 nm), repris du fichier « listen.lst » d'OptGeo 3.03.</p>\n"
        "<table>\n<thead><tr><th scope=\"col\">Matériau</th><th scope=\"col\">Indice bleu</th>"
        "<th scope=\"col\">Indice vert</th><th scope=\"col\">Indice rouge</th></tr></thead>\n"
        "<tbody>\n" + corps + "</tbody>\n</table>").replace("486,1 nm", "486,1" + NBSP + "nm") \
        .replace("587,6 nm", "587,6" + NBSP + "nm").replace("656,3 nm", "656,3" + NBSP + "nm")


ERREURS_ADAPTATION = []


def adapte(page, contenu):
    """Applique les adaptations au HTML d'une page ; renvoie (contenu, modifiée ?)."""
    avant = contenu
    for regle in ADAPTATIONS.get(page, []):
        if regle[0] in ("BLOC", "AVANT"):
            genre, debut, fin, nouveau = regle
            debut, nouveau = typo(debut), typo(nouveau)
            if contenu.count(debut) != 1:
                ERREURS_ADAPTATION.append("%s : début de bloc trouvé %d fois : %s" % (page, contenu.count(debut), debut[:70]))
                continue
            i = contenu.index(debut)
            if fin is None:            # jusqu'à la fin de la page
                fin, j = "", len(contenu)
            else:
                fin = typo(fin)
                j = contenu.find(fin, i + len(debut))
            if j < 0:
                ERREURS_ADAPTATION.append("%s : fin de bloc introuvable : %s" % (page, fin[:70]))
                continue
            if genre == "BLOC":
                j += len(fin)
            contenu = contenu[:i] + nouveau + contenu[j:]
        else:
            motif, nouveau = typo(regle[0]), typo(regle[1])
            if contenu.count(motif) != 1:
                ERREURS_ADAPTATION.append("%s : motif trouvé %d fois : %s" % (page, contenu.count(motif), motif[:70]))
                continue
            contenu = contenu.replace(motif, nouveau)
    for motif, nouveau in ADAPTATIONS_COMMUNES:
        contenu = contenu.replace(typo(motif), typo(nouveau))
    if "%%TABLEAU_MATERIAUX%%" in contenu:
        contenu = contenu.replace("%%TABLEAU_MATERIAUX%%", tableau_materiaux())
    # contrôle : plus aucune instruction de l'interface Windows
    visible = html.unescape(re.sub(r"<[^>]+>", " ", contenu)).replace(NBSP, " ")
    for motif in INTERDITS_WEB:
        if motif in INTERDITS_PERMIS.get(page, set()):
            continue
        for m in re.finditer(motif, visible):
            ERREURS_ADAPTATION.append("%s : instruction de l'interface d'origine restante « %s »" % (page, m.group(0)))
    return contenu, contenu != avant

VIDES = {"br", "hr", "img", "meta", "link", "input", "col", "area", "base", "wbr"}
FORMATS = {"u", "b", "i", "big", "small", "font", "span", "strong", "em", "sub", "sup"}


# ---------------------------------------------------------------------------
# Lecture d'une page d'origine : flux d'éléments en ligne, coupé en lignes.
# ---------------------------------------------------------------------------

class Style:
    __slots__ = ("souligne", "gras", "italique", "grand", "taille", "colore")

    def __init__(self, souligne=False, gras=False, italique=False, grand=0, taille=0, colore=False):
        self.souligne, self.gras, self.italique = souligne, gras, italique
        self.grand, self.taille, self.colore = grand, taille, colore

    def cle_rendu(self):
        fort = self.gras or (self.souligne and not self.italique) or self.grand > 0
        return (fort, self.italique)


def couleur_visible(valeur):
    v = valeur.replace(" ", "").lower()
    return v not in ("", "#000000", "#000", "black", "rgb(0,0,0)")


class LecteurOrigine(HTMLParser):
    """Transforme le HTML d'origine en lignes d'éléments en ligne."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.pile = []          # (balise, dict de propriétés de style)
        self.lignes = [[]]      # chaque ligne : liste d'éléments
        self.dans_corps = False
        self.lien = None        # élément de lien ouvert

    # -- utilitaires
    def style(self):
        st = Style()
        couleur = False
        for balise, props in self.pile:
            if balise == "u" or props.get("souligne"):
                st.souligne = True
            if balise in ("b", "strong") or props.get("gras"):
                st.gras = True
            if balise in ("i", "em") or props.get("italique"):
                st.italique = True
            if balise == "big":
                st.grand += 1
            if props.get("taille"):
                st.taille = max(st.taille, props["taille"])
            if "couleur" in props:
                couleur = props["couleur"]
        st.colore = bool(couleur)
        return st

    def coupe(self, nature="br"):
        if nature != "br":
            self.lignes.append([("vide",)])
        self.lignes.append([])

    def ajoute(self, element):
        self.lignes[-1].append(element)

    # -- HTMLParser
    def handle_starttag(self, balise, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if balise == "body":
            self.dans_corps = True
            return
        if not self.dans_corps:
            return
        if balise == "br":
            self.coupe("br")
        elif balise in ("p", "div", "hr", "h1", "h2", "h3", "li", "ul", "ol", "table", "tr"):
            self.coupe("bloc")
        elif balise == "img":
            self.ajoute(("img", a.get("src", "")))
        elif balise == "a":
            if "name" in a and "href" not in a:
                self.ajoute(("ancre", a["name"]))
            if "href" in a:
                self.ajoute(("a", a["href"]))
        elif balise in FORMATS:
            props = {}
            style = a.get("style", "").lower()
            if "underline" in style:
                props["souligne"] = True
            if "bold" in style:
                props["gras"] = True
            if "italic" in style:
                props["italique"] = True
            m = re.search(r"(?:^|;|\s)color:\s*([^;]+)", style)
            if m:
                props["couleur"] = couleur_visible(m.group(1))
            if "color" in a:
                props["couleur"] = couleur_visible(a["color"])
            if "size" in a and a["size"].strip().isdigit():
                props["taille"] = int(a["size"])
            self.pile.append((balise, props))

    def handle_startendtag(self, balise, attrs):
        self.handle_starttag(balise, attrs)

    def handle_endtag(self, balise):
        if not self.dans_corps:
            return
        if balise == "body":
            self.dans_corps = False
        elif balise in ("p", "div", "h1", "h2", "h3", "li", "ul", "ol", "table", "tr"):
            self.coupe("bloc")
        elif balise == "a":
            self.ajoute(("/a",))
        elif balise in FORMATS:
            for i in range(len(self.pile) - 1, -1, -1):
                if self.pile[i][0] == balise:
                    del self.pile[i]
                    break

    def handle_data(self, donnees):
        if self.dans_corps and donnees:
            self.ajoute(("texte", donnees, self.style()))


# ---------------------------------------------------------------------------
# Texte : espaces, corrections, guillemets, ponctuation française.
# ---------------------------------------------------------------------------

def espaces(texte):
    return re.sub(r"[\s ]+", " ", texte)


def corrige(texte, page):
    for motif, rempl in CORRECTIONS:
        texte = re.sub(motif, rempl, texte)
    return texte


def corrige_page(texte, page):
    for motif, rempl in CORRECTIONS_PAGE.get(page, []):
        texte = re.sub(motif, rempl, texte)
    return texte


def ponctuation(texte):
    # Espace insécable avant : ; ! ? (typographie française).
    return re.sub(r"(?<=[^\s (])[  ]*([:;!?])", NBSP + r"\1", texte)


def texte_de(ligne):
    return espaces("".join(e[1] for e in ligne if e[0] == "texte")).strip()


def prepare_ligne(ligne, page):
    """Corrige le texte d'une ligne ; renvoie la ligne et un avertissement éventuel."""
    # 1) espaces et corrections globales, élément par élément
    nouvelle = []
    for e in ligne:
        if e[0] == "texte":
            nouvelle.append(("texte", corrige(espaces(e[1]), page), e[2]))
        else:
            nouvelle.append(e)
    # 2) corrections de page sur la ligne entière quand elle n'a qu'un texte
    textes = [i for i, e in enumerate(nouvelle) if e[0] == "texte" and e[1].strip()]
    if len(textes) == 1:
        i = textes[0]
        brut = nouvelle[i][1]
        debut = brut[: len(brut) - len(brut.lstrip())]
        fin = brut[len(brut.rstrip()):]
        nouvelle[i] = ("texte", debut + corrige_page(brut.strip(), page) + fin, nouvelle[i][2])
    else:
        for i in textes:
            nouvelle[i] = ("texte", corrige_page(nouvelle[i][1], page), nouvelle[i][2])
    # 3) guillemets droits -> « » (ouvrant puis fermant, sur la ligne)
    ouvert = False
    for i, e in enumerate(nouvelle):
        if e[0] != "texte" or '"' not in e[1]:
            continue
        morceaux = e[1].split('"')
        sortie = morceaux[0]
        for m in morceaux[1:]:
            if not ouvert:
                sortie = sortie.rstrip() + (" " if sortie.strip() else "") + "«" + NBSP
                m = m.lstrip()
            else:
                sortie = sortie.rstrip() + NBSP + "»"
            ouvert = not ouvert
            sortie += m
        nouvelle[i] = ("texte", sortie, e[2])
    alerte = "guillemets non appariés : " + texte_de(nouvelle) if ouvert else None
    # 4) ponctuation
    nouvelle = [("texte", ponctuation(e[1]), e[2]) if e[0] == "texte" else e for e in nouvelle]
    return nouvelle, alerte


# ---------------------------------------------------------------------------
# Rendu HTML
# ---------------------------------------------------------------------------

def cible_lien(href, page):
    """Nouvelle cible d'un lien d'origine, ou None pour le supprimer."""
    href = href.strip()
    if re.match(r"^(https?|ftp|mailto):", href, re.I):
        return None
    chemin, _, ancre = href.partition("#")
    if chemin:
        nom = chemin.replace("\\", "/").rsplit("/", 1)[-1].lower()
        base = nom[:-5] if nom.endswith(".html") else nom
        if base not in PAGES:
            return None
        if base == page and ancre in ("", "hautpage"):
            return None
        return nom + ("#" + ancre if ancre else "")
    if ancre in ("", "hautpage"):
        return None
    return "#" + ancre


def taille_image(chemin):
    donnees = chemin.read_bytes()[:32]
    if donnees[:3] == b"GIF":
        return struct.unpack("<HH", donnees[6:10])
    if donnees[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", donnees[16:24])
    raise ValueError("format d'image inconnu : %s" % chemin)


class Rendu:
    def __init__(self, page, source, dest):
        self.page, self.source, self.dest = page, source, dest
        self.images = set()

    def image(self, src):
        nom = src.replace("\\", "/").rsplit("/", 1)[-1]
        origine = self.source / nom
        if not origine.exists():
            # casse différente
            for f in self.source.iterdir():
                if f.name.lower() == nom.lower():
                    origine = f
                    break
        cible = nom.lower()
        if cible.endswith(".bmp"):
            cible = cible[:-4] + ".png"
        chemin_cible = self.dest / "images" / cible
        if not chemin_cible.exists():
            chemin_cible.parent.mkdir(parents=True, exist_ok=True)
            if origine.suffix.lower() == ".bmp":
                subprocess.run(
                    ["sips", "-s", "format", "png", str(origine), "--out", str(chemin_cible)],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
            else:
                shutil.copyfile(origine, chemin_cible)
        self.images.add(cible)
        largeur, hauteur = taille_image(chemin_cible)
        alt = ALT.get(cible, "")
        return '<img src="images/%s" alt="%s" width="%d" height="%d">' % (
            cible, html.escape(alt, quote=False).replace('"', "&quot;"), largeur, hauteur)

    def en_ligne(self, elements):
        """Rendu en ligne : <strong>, <em>, <a>, <img>."""
        morceaux = []          # (cle_style ou None, html)
        pile_liens = []
        sortie = []

        def vide_morceaux():
            # fusionne les textes de même style, place les espaces hors des balises
            res = ""
            for cle, txt in fusion(morceaux):
                if cle is None:
                    res += txt
                    continue
                fort, ital = cle
                coeur = txt.strip()
                if not coeur:
                    res += txt
                    continue
                avant = txt[: len(txt) - len(txt.lstrip())]
                apres = txt[len(txt.rstrip()):]
                o = ("<strong>" if fort else "") + ("<em>" if ital else "")
                f = ("</em>" if ital else "") + ("</strong>" if fort else "")
                res += avant + o + coeur + f + apres
            morceaux.clear()
            return res

        def fusion(liste):
            res = []
            for cle, txt in liste:
                if res and res[-1][0] == cle and cle is not None:
                    res[-1] = (cle, res[-1][1] + txt)
                else:
                    res.append((cle, txt))
            return res

        for e in elements:
            if e[0] == "texte":
                cle = e[2].cle_rendu()
                morceaux.append((cle if any(cle) else None, html.escape(e[1], quote=False)))
            elif e[0] == "img":
                morceaux.append((None, " " + self.image(e[1]) + " "))
            elif e[0] == "a":
                sortie.append(vide_morceaux())
                pile_liens.append(cible_lien(e[1], self.page))
            elif e[0] == "/a":
                interieur = vide_morceaux()
                cible = pile_liens.pop() if pile_liens else None
                if cible and interieur.strip():
                    avant = interieur[: len(interieur) - len(interieur.lstrip())]
                    apres = interieur[len(interieur.rstrip()):]
                    sortie.append('%s<a href="%s">%s</a>%s' % (
                        avant, html.escape(cible, quote=True), interieur.strip(), apres))
                else:
                    sortie.append(interieur)
        sortie.append(vide_morceaux())
        res = "".join(sortie)
        res = re.sub(r"[ \t\n]+", " ", res).strip()
        res = re.sub(r"« \s+", "«" + NBSP, res)
        res = re.sub(r"\s+ »", NBSP + "»", res)
        # ponctuation juste après une balise fermante (« </strong>: »)
        res = re.sub(r"(</(?:strong|em|a)>)[  ]?([:;!?])", r"\1" + NBSP + r"\2", res)
        # espace parasite avant un point ou une virgule (« » . » devient « ». »)
        res = re.sub(r"(\S) ([.,])(?=\s|$|<)", r"\1\2", res)
        return res


def classe_ligne(ligne, page):
    """Nature d'une ligne : vide, ancre, image, lien, titre, puce, para."""
    textes = [e for e in ligne if e[0] == "texte" and e[1].strip()]
    brut = texte_de(ligne)
    images = [e for e in ligne if e[0] == "img"]
    if images:
        return "image"
    if not brut:
        return "vide"
    # ligne faite d'un seul lien
    hors_lien, profondeur, liens = "", 0, 0
    for e in ligne:
        if e[0] == "a":
            profondeur += 1
            liens += 1
        elif e[0] == "/a":
            profondeur = max(0, profondeur - 1)
        elif e[0] == "texte" and profondeur == 0:
            hors_lien += e[1]
    if liens == 1 and not hors_lien.strip():
        return "lien"
    if len(brut) <= 110 and not brut.startswith("-"):
        if all(not e[2].italique and e[2].souligne and (e[2].gras or e[2].grand > 0)
               for e in textes) and liens == 0:
            return "titre"
        if (page == "optgeo" and len(brut) < 70 and liens == 0 and not brut.endswith(".")
                and all(e[2].colore and not e[2].souligne for e in textes)):
            return "titre"
    if brut.startswith("-") and not brut.startswith("->"):
        return "puce"
    return "para"


def sans_tiret(ligne):
    res, fait = [], False
    for e in ligne:
        if not fait and e[0] == "texte" and e[1].strip():
            res.append(("texte", re.sub(r"^\s*-\s*", "", e[1]), e[2]))
            fait = True
        else:
            res.append(e)
    return res


def porte_page(fichier, page, source, dest):
    brut = fichier.read_bytes().decode("cp1252")
    lecteur = LecteurOrigine()
    lecteur.feed(brut)
    lecteur.close()

    # Lignes ; on s'arrête après le lien « Retour à la page d'accueil » (deux
    # pages d'origine contiennent ensuite une ancienne copie collée par erreur).
    lignes, retour = [], None
    for ligne in lecteur.lignes:
        if any(e[0] == "a" for e in ligne) and texte_de(ligne).startswith("Retour"):
            retour = texte_de(ligne)
            break
        lignes.append(ligne)

    rendu = Rendu(page, source, dest)
    alertes = []
    blocs = []                 # (balise, html, id, classe)
    ancres = []
    premier_titre_fait = False

    def id_suivant():
        if ancres:
            v = ancres[0]
            ancres.clear()
            return v
        return None

    for ligne in lignes:
        for e in ligne:
            if e[0] == "ancre":
                ancres.append(e[1])
        ligne = [e for e in ligne if e[0] != "ancre"]
        if any(e[0] == "vide" for e in ligne):
            blocs.append(("vide", "", None, None))
            continue
        nature = classe_ligne(ligne, page)
        if nature == "vide":
            blocs.append(("vide", "", None, None))
            continue
        ligne, alerte = prepare_ligne(ligne, page)
        if alerte:
            alertes.append(alerte)
        if nature == "titre":
            textes = [e for e in ligne if e[0] == "texte" and e[1].strip()]
            if not premier_titre_fait:
                grand_max = max(e[2].grand for e in textes)
                titre = espaces("".join(e[1] for e in textes if e[2].grand == grand_max)).strip()
                reste = espaces("".join(e[1] for e in textes if e[2].grand != grand_max)).strip()
                blocs.append(("h1", html.escape(titre, quote=False), id_suivant(), None))
                if reste:
                    blocs.append(("p", html.escape(reste, quote=False), None, "sous-titre"))
                premier_titre_fait = True
                continue
            texte = html.escape(texte_de(ligne), quote=False)
            precedent = [b for b in blocs if b[0] != "vide"]
            dernier = precedent[-1] if precedent else None
            tous_petits = all(e[2].grand == 0 and e[2].taille < 4 for e in textes)
            if dernier and (dernier[0] == "h1" or dernier[3] == "sous-titre") and tous_petits:
                blocs.append(("p", texte, id_suivant(), "sous-titre"))
            elif page == "optgeo":
                niveau = "h2" if any(e[2].taille >= 4 for e in textes) else "h3"
                blocs.append((niveau, texte, id_suivant(), None))
            else:
                blocs.append(("h2", texte, id_suivant(), None))
        elif nature == "image":
            blocs.append(("p", rendu.en_ligne(ligne), id_suivant(), "illustration"))
        elif nature == "lien":
            contenu = rendu.en_ligne(ligne)
            if "<a " not in contenu:
                continue        # lien supprimé (« Haut de la page », lien vide)
            blocs.append(("lien", contenu, id_suivant(), None))
        elif nature == "puce":
            blocs.append(("li", rendu.en_ligne(sans_tiret(ligne)), id_suivant(), None))
        else:
            contenu = rendu.en_ligne(ligne)
            classe = "ou" if contenu == "OU" else None
            blocs.append(("p", contenu, id_suivant(), classe))

    if retour:
        blocs.append(("p", '<a href="optgeo.html">%s</a>' % html.escape(
            espaces(retour).strip(), quote=False), None, "retour"))

    # Assemblage : listes de puces et listes de liens (les lignes vides entre
    # deux éléments d'une même liste sont ignorées).
    corps = []
    liste = None
    utiles = [b for b in blocs]
    for i, (balise, contenu, ident, classe) in enumerate(utiles):
        if balise == "vide":
            continue
        genre = "li" if balise == "li" else ("lien" if balise == "lien" else None)
        if genre != liste:
            if liste:
                corps.append("</ul>")
            if genre:
                corps.append('<ul class="liens">' if genre == "lien" else "<ul>")
            liste = genre
        attr_id = ' id="%s"' % html.escape(ident, quote=True) if ident else ""
        attr_cl = ' class="%s"' % classe if classe else ""
        if genre:
            corps.append("<li%s>%s</li>" % (attr_id, contenu))
        else:
            corps.append("<%s%s%s>%s</%s>" % (balise, attr_id, attr_cl, contenu, balise))
    if liste:
        corps.append("</ul>")

    titre_onglet = PAGES[page] + " – Aide d'OptGeo"
    contenu, adaptee = adapte(page, "\n".join(corps))
    page_html = gabarit(titre_onglet, BANDEAU + "\n" + contenu, adaptee=adaptee)
    (dest / (page + ".html")).write_text(page_html, encoding="utf-8")
    return alertes, rendu.images


def gabarit(titre, corps, bandeau_sommaire=True, adaptee=False):
    nav = '<nav class="haut"><a href="index.html">Sommaire de l\'aide</a></nav>\n' if bandeau_sommaire else ""
    return (
        "<!DOCTYPE html>\n"
        '<html lang="fr">\n'
        "<head>\n"
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta name="color-scheme" content="light dark">\n'
        "<title>%s</title>\n"
        '<link rel="stylesheet" href="aide.css">\n'
        "</head>\n"
        "<body>\n"
        "%s"
        "<main>\n%s\n</main>\n"
        "%s\n"
        "</body>\n"
        "</html>\n"
    ) % (html.escape(titre, quote=False), nav, corps, pied(adaptee))


# ---------------------------------------------------------------------------
# Pages nouvelles : sommaire et usage de la version web
# ---------------------------------------------------------------------------

SOMMAIRE = [
    ("Pour commencer", [
        ("web.html", "Utiliser OptGeo sur le web (tablette, téléphone, ordinateur)"),
        ("optgeo.html", "Aide générale d'OptGeo (ajouter, déplacer, modifier, supprimer, grouper, options)"),
    ]),
    ("Sources lumineuses", [
        ("rayon.html", "Rayon lumineux unique"),
        ("sponct.html", "Source ponctuelle (réelle ou virtuelle)"),
        ("op.html", "Onde plane"),
    ]),
    ("Miroirs", [
        ("miroirplan.html", "Miroir plan"),
        ("miroirspheriqueparaxial.html", "Miroirs sphériques paraxiaux (idéaux), concave ou convexe"),
        ("miroirspheriquereel.html", "Miroirs sphériques réels, concave ou convexe"),
        ("miroirconique.html", "Miroirs coniques : parabolique, elliptique, hyperbolique"),
    ]),
    ("Lentilles et dioptres", [
        ("lmc.html", "Lentilles minces (convergente ou divergente)"),
        ("lentille.html", "Lentille épaisse"),
        ("sphere.html", "Sphère réfractante"),
        ("polyhedre.html", "Polygone réfractant (polyèdre : prisme, lame à faces parallèles…)"),
        ("polysphere.html", "Polycercle réfractant (polysphère)"),
        ("prisme.html", "Prisme réfractant"),
    ]),
    ("Écrans et divers", [
        ("ecran.html", "Écran"),
        ("diaphragme.html", "Diaphragme à iris"),
        ("lsr.html", "Lame semi-réfléchissante"),
        ("reseau.html", "Réseau diffractant"),
        ("oeil.html", "Œil stylisé"),
    ]),
    ("Matériaux", [
        ("materiaux.html", "Liste des matériaux et de leurs indices"),
    ]),
]


def page_sommaire():
    morceaux = [
        "<h1>Aide d'OptGeo</h1>",
        "<p>OptGeo est un logiciel libre de simulation d'optique géométrique à deux "
        "dimensions, écrit par Jean-Marie Biansan. Cette aide reprend celle d'OptGeo 3.03 "
        "(version pour ordinateur), adaptée à la version web (gestes, boutons et menus), et ajoute "
        "une page sur l'utilisation de la version web.</p>",
    ]
    for titre, liens in SOMMAIRE:
        morceaux.append("<h2>%s</h2>" % html.escape(titre, quote=False))
        morceaux.append('<ul class="liens">')
        for cible, texte in liens:
            morceaux.append('<li><a href="%s">%s</a></li>' % (cible, html.escape(texte, quote=False)))
        morceaux.append("</ul>")
    corps = "\n".join(morceaux).replace(" : ", NBSP + ": ")
    return gabarit("Aide d'OptGeo", corps, bandeau_sommaire=False)


def poignee(nom):
    """Petit dessin d'une poignée (SVG en ligne, décoratif), comme dans 20-dessin.js."""
    def croix(couleur, bord):
        trace = "M4 4l10 10M14 4L4 14"
        return ('<path d="%s" stroke="%s" stroke-width="5" stroke-linecap="round"/>'
                '<path d="%s" stroke="%s" stroke-width="2.5" stroke-linecap="round"/>' % (trace, bord, trace, couleur))
    dessins = {
        "croix-verte": croix("#008000", "#ffffff"),
        "cercle-bleu": '<circle cx="9" cy="9" r="5.5" fill="#ffffff" stroke="#0000ff" stroke-width="2.2"/>',
        "disque-rouge": '<circle cx="9" cy="9" r="6" fill="#e00000" stroke="#ffffff" stroke-width="1.5"/>',
        "croix-cyan": croix("#00c8d8", "#0b3c44"),
        "croix-jaune": croix("#ffd400", "#5a4a00"),
    }
    return ('<svg class="poignee" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" '
            'focusable="false">%s</svg>' % dessins[nom])


def page_web():
    n = NBSP
    corps = f"""<h1>Utiliser OptGeo sur le web</h1>
<p>OptGeo est un logiciel libre d'optique géométrique écrit par Jean-Marie Biansan. Cette version web s'utilise dans le navigateur, sur une tablette, un téléphone ou un ordinateur, sans Internet. Les autres pages de l'aide reprennent l'aide d'OptGeo 3.03, adaptée à cette version{n}; cette page explique comment s'en servir.</p>
<ul class="liens sommaire-page">
<li><a href="#ecran">L'écran</a></li>
<li><a href="#placer">Placer un objet</a></li>
<li><a href="#selection">Choisir et modifier un objet</a></li>
<li><a href="#modes">Les modes d'OptGeo</a></li>
<li><a href="#vue">Se déplacer dans le dessin</a></li>
<li><a href="#fichiers">Ouvrir, enregistrer, imprimer</a></li>
<li><a href="#clavier">Raccourcis clavier</a></li>
<li><a href="#differences">Ce qui change par rapport à OptGeo 3.03</a></li>
</ul>

<h2 id="ecran">L'écran</h2>
<h3>La barre du haut</h3>
<ul>
<li><strong>Menu</strong>{n}: il regroupe les menus d'OptGeo{n}: <strong>Fichier</strong>, <strong>Édition</strong>, <strong>Ajouter (par coordonnées)</strong>, <strong>Options</strong>, <strong>Aide</strong>.</li>
<li>Le nom de la simulation, suivi de «{n}(modifiée){n}» tant qu'elle n'est pas enregistrée.</li>
<li><strong>Annuler</strong> et <strong>Refaire</strong>{n}: reviennent sur la dernière action, ou la refont. Les options d'affichage (normales, angles, grille, attraction de la grille, longueurs des segments, contrôle des points trop proches, zoom) n'en dépendent pas{n}: elles gardent leur valeur du moment.</li>
<li>Les modes d'OptGeo{n}: <strong>Déplacer</strong>, <strong>Propriétés</strong>, <strong>Dupliquer</strong>, <strong>Supprimer</strong>, <strong>Grouper</strong> (voir <a href="#modes">Les modes d'OptGeo</a>). Sur un écran étroit, ils sont réunis sous le bouton <strong>Modes</strong>.</li>
<li><strong>Affichage</strong>{n}: interrupteurs <strong>Normales</strong>, <strong>Angles d'incidence et de réfraction</strong>, <strong>Grille</strong>, <strong>Attraction de la grille</strong>, <strong>Longueurs des segments</strong>{n}; bouton <strong>Coordonnées des segments…</strong>{n}; zooms de ×1 à ×100.</li>
<li><strong>Plein écran</strong>{n}: seulement quand l'application est ouverte seule dans le navigateur (dans une page du site, elle remplit déjà son cadre).</li>
</ul>
<h3>La palette des objets</h3>
<p>Elle est à gauche quand l'écran est en paysage (plus large que haut), en bas quand il est en portrait (plus haut que large). Elle range les objets en cinq familles{n}: <strong>Miroirs</strong>, <strong>Écrans</strong>, <strong>Sources</strong>, <strong>Dioptres</strong>, <strong>Divers</strong>. Touche une famille{n}: ses objets s'affichent dans un volet{n}; touche de nouveau la famille pour refermer le volet.</p>
<h3>Le bandeau de consigne</h3>
<p>En haut du dessin, il dit quoi faire à chaque étape et porte les boutons utiles{n}: <strong>Annuler</strong>, <strong>Terminer</strong>, <strong>Aligner horizontalement</strong>, <strong>Bloquer horizontalement</strong>… Quand un de ces boutons est actif, le bandeau le rappelle{n}: <strong>Alignement horizontal</strong> (ou vertical) pendant qu'on place un objet, <strong>Bloqué{n}: horizontal</strong> (ou vertical) en mode Déplacer et pendant un glissement.</p>
<p>Sur un petit écran (largeur de 560{n}pixels au plus, ou hauteur de 420{n}pixels au plus, par exemple un téléphone), il tient sur une ligne{n}: touche <strong>Plus</strong> pour voir toute la consigne et les boutons secondaires (<strong>Aligner…</strong>, <strong>Bloquer…</strong>, <strong>Rester dans ce mode</strong>), <strong>Moins</strong> pour les cacher.</p>

<h2 id="placer">Placer un objet</h2>
<ol>
<li>Touche une famille de la palette, puis l'objet voulu.</li>
<li>Lis le bandeau en haut du dessin{n}: il dit quel point placer.</li>
<li>Place les points de l'objet un par un, dans l'ordre demandé{n}:
<ul>
<li><strong>au doigt</strong>{n}: appuie, glisse pour viser (une loupe montre ce qui est sous ton doigt, avec les coordonnées), puis relâche{n}: le point est placé quand le doigt se lève{n};</li>
<li><strong>à la souris</strong>{n}: un clic par point{n}; l'aperçu de l'objet suit la souris.</li>
</ul></li>
</ol>
<p>Certains objets demandent un réglage dans une petite boîte{n}: le nombre de sommets (polygone, polycercle) avant les points{n}; le nombre de rayons (objet ponctuel, onde plane), le diamètre (lentille épaisse) ou le choix arc ou segment de chaque côté (polycercle) après les points. Le texte et le point demandent d'abord leur réglage{n}; le réseau et le trait ouvrent le panneau des propriétés après les deux points.</p>
<p>Pour abandonner{n}: bouton <strong>Annuler</strong> du bandeau, ou touche Échap.</p>
<p>Pour t'aider{n}:</p>
<ul>
<li>la case <strong>Rester dans ce mode</strong> du bandeau permet de créer plusieurs objets du même type à la suite{n};</li>
<li>à partir du deuxième point, les boutons <strong>Aligner horizontalement</strong> et <strong>Aligner verticalement</strong> (ou les touches Ctrl et Alt maintenues à l'ordinateur) placent le point sur la même horizontale ou la même verticale que le point précédent, pour l'objet en cours de construction seulement (ils sont relâchés à l'objet suivant){n};</li>
<li>pour un polygone, à partir du 3e sommet, le bouton <strong>Fermer le polygone</strong> (ou un toucher sur le sommet 1) termine l'objet sans placer tous les sommets prévus{n};</li>
<li>si l'attraction de la grille est activée (bouton <strong>Affichage</strong>), les points se placent sur la grille (sauf pour les mesures de distance et d'angle)."""
    corps += f"""</li>
</ul>
<p>La famille <strong>Divers</strong> contient aussi <strong>Distance</strong> et <strong>Angle</strong> (mesures dont la valeur s'affiche sur le dessin), <strong>Texte</strong>, <strong>Trait, flèche</strong>, <strong>Point</strong>, <strong>Cacher segments</strong> (cacher des segments de rayon en les touchant) et <strong>Commentaire</strong> (texte qui accompagne la simulation).</p>
<p>Pour placer un objet par ses coordonnées, utilise plutôt le menu <strong>Ajouter (par coordonnées)</strong>{n}: le panneau des propriétés s'ouvre, déjà rempli{n}; règle les valeurs, puis touche <strong>Valider</strong>.</p>

<h2 id="selection">Choisir et modifier un objet</h2>
<p>Touche (ou clique) un objet{n}: il est sélectionné et ses poignées apparaissent. Elles ont la même signification que dans OptGeo{n}:</p>
<ul class="poignees">
<li>{poignee("croix-verte")} <strong>Croix verte</strong>{n}: déplace tout l'objet.</li>
<li>{poignee("cercle-bleu")} <strong>Cercle bleu</strong>{n}: déplace ce point seulement (extrémité, sommet, source…).</li>
<li>{poignee("disque-rouge")} <strong>Disque rouge</strong>{n}: fait tourner l'objet.</li>
<li>{poignee("croix-cyan")} <strong>Croix cyan</strong>{n}: foyer ou centre de courbure (la déplacer change la focale ou le rayon de courbure){n}; pour un diaphragme, bord du trou.</li>
<li>{poignee("croix-jaune")} <strong>Croix jaune</strong>{n}: sommet d'un arc de cercle d'un polycercle.</li>
</ul>
<p>Fais glisser une poignée pour modifier l'objet{n}; tu peux aussi faire glisser l'objet lui-même pour le déplacer. Les boutons <strong>Bloquer horizontalement</strong> et <strong>Bloquer verticalement</strong> du bandeau (ou les touches Ctrl et Alt maintenues) limitent le mouvement à une direction{n}: on les touche avec un autre doigt pendant le glissement, ou, en mode Déplacer, avant de commencer le glissement (un seul doigt suffit alors). Ils ne valent que pour ce glissement{n}: ils sont relâchés quand le doigt se lève. La touche Échap, ou un deuxième doigt posé sur le dessin, remet l'objet à sa place.</p>
<p>En bas du dessin, une barre propose{n}: <strong>Propriétés</strong>, <strong>Dupliquer</strong>, <strong>Supprimer</strong>, <strong>Grouper avec…</strong>, <strong>Dissocier</strong> (seulement si l'objet fait partie d'un groupe) et <strong>Désélectionner</strong>.</p>
<ul>
<li><strong>Propriétés</strong> ouvre le panneau des propriétés (à droite du dessin, ou en bas sur un écran en portrait){n}: <strong>Valider</strong> applique les changements, <strong>Annuler</strong> les abandonne, <strong>Supprimer</strong> enlève l'objet, <strong>Aide</strong> ouvre la page d'aide de l'objet. Une valeur refusée est signalée sous son champ.</li>
<li><strong>Dupliquer</strong> crée une copie légèrement décalée, qui reste sélectionnée{n}: fais-la glisser où tu veux.</li>
<li><strong>Supprimer</strong> enlève l'objet tout de suite{n}; le bouton <strong>Annuler</strong> du message qui s'affiche le remet.</li>
</ul>
<p>Plusieurs objets au même endroit{n}? Touche de nouveau au même endroit{n}: la sélection passe à l'objet suivant. Touche une zone vide pour tout désélectionner.</p>

<h2 id="modes">Les modes d'OptGeo</h2>
<p>Les boutons de mode de la barre du haut (et les commandes du menu <strong>Édition</strong>) marchent comme dans OptGeo 3.03, pour qui a l'habitude du logiciel ou suit les consignes d'un exemple{n}:</p>
<ul>
<li><strong>Déplacer</strong>{n}: les poignées de tous les objets s'affichent en même temps{n}; les boutons <strong>Bloquer horizontalement</strong> et <strong>Bloquer verticalement</strong> du bandeau peuvent être touchés avant de faire glisser une poignée, pour ce seul glissement. On sort du mode avec le bouton <strong>Terminer</strong> du bandeau.</li>
<li><strong>Propriétés</strong>{n}: touche un objet pour ouvrir son panneau des propriétés. Le mode reste actif jusqu'au bouton <strong>Terminer</strong>.</li>
<li><strong>Dupliquer</strong> et <strong>Supprimer</strong>{n}: touche l'objet à dupliquer ou à supprimer{n}; le mode s'arrête tout seul après un objet. Le bouton <strong>Annuler</strong> du bandeau sort du mode sans rien faire.</li>
<li><strong>Grouper</strong>{n}: touche les objets à grouper (une croix violette marque chaque objet{n}; toucher de nouveau un objet le retire), puis <strong>Terminer</strong> pour créer le groupe, ou <strong>Annuler</strong> pour abandonner. Un groupe se déplace d'un bloc par sa croix verte marquée «{n}Gr{n}»{n}; le bouton <strong>Dissocier</strong> le défait.</li>
</ul>
<p>Dans tous les modes, la touche Échap, ou un nouveau toucher sur le bouton du mode, ramène au fonctionnement normal. Si plusieurs objets sont sous le doigt, une liste permet de choisir.</p>

<h2 id="vue">Se déplacer dans le dessin</h2>
<ul>
<li>Au doigt{n}: pose deux doigts pour zoomer (pincer, écarter) et déplacer la vue.</li>
<li>À la souris{n}: la molette zoome{n}; Maj + molette, ou le bouton du milieu, déplace la vue.</li>
<li>Glisser dans une zone vide du dessin déplace la vue.</li>
<li>Boutons ronds à droite du dessin{n}: agrandir, réduire, tout voir.</li>
</ul>
<p>Le zoom et le déplacement de la vue restent possibles pendant un mode ou pendant qu'on place un objet.</p>

<h2 id="fichiers">Ouvrir, enregistrer, imprimer</h2>
<p>Dans le menu <strong>Fichier</strong>, tu peux{n}:</p>
<ul>
<li>commencer une <strong>Nouvelle simulation…</strong> (dimensions de l'espace de travail, indices du milieu ambiant){n};</li>
<li><strong>Ouvrir un fichier de l'appareil…</strong>{n}: un fichier <code>.opt</code>{n}; tu peux choisir en même temps le fichier <code>.txt</code> de son commentaire{n};</li>
<li><strong>Ouvrir un exemple…</strong>{n}: un des 56 exemples d'OptGeo, avec son commentaire{n};</li>
<li><strong>Superposer un fichier…</strong> ou <strong>Superposer un exemple…</strong>{n}: ajouter une simulation à celle qui est ouverte{n};</li>
<li><strong>Enregistrer</strong> ou <strong>Enregistrer sous…</strong>{n}: le navigateur télécharge un fichier <code>.opt</code>, lisible par OptGeo 3.03, et un fichier <code>.txt</code> pour le commentaire s'il y en a un{n};</li>
<li><strong>Exporter l'image (PNG ou SVG)…</strong>{n};</li>
<li><strong>Imprimer…</strong>{n}: le dessin est imprimé avec son titre et son commentaire, sans les boutons{n};</li>
<li>modifier ou ajuster l'espace de travail, et régler les <strong>Préférences…</strong> (couleur et épaisseur par défaut de chaque type d'objet, gardées sur l'appareil).</li>
</ul>
<p>Ton travail est gardé automatiquement sur l'appareil{n}: rien n'est envoyé sur Internet. Quand tu rouvres l'application, elle propose de reprendre ce travail.</p>
<p>Seule exception{n}: l'image de fond (menu <strong>Options</strong>, <strong>Couleur de fond ou image de fond…</strong>) reste sur l'appareil mais n'est pas gardée après un rechargement de la page, ni enregistrée dans le fichier <code>.opt</code>{n}: il faut la choisir de nouveau.</p>

<h2 id="clavier">Raccourcis clavier (ordinateur)</h2>
<p>Sur Mac, la touche Cmd remplace Ctrl.</p>
<table>
<thead><tr><th scope="col">Touches</th><th scope="col">Action</th></tr></thead>
<tbody>
<tr><td><kbd>Échap</kbd></td><td>abandonner ce qui est en cours (objet en construction, glissement, mode, panneau)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>annuler</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Y</kbd> ou <kbd>Ctrl</kbd>+<kbd>Maj</kbd>+<kbd>Z</kbd></td><td>refaire (attention{n}: <kbd>Ctrl</kbd>+<kbd>R</kbd>, qui refaisait dans OptGeo 3.03, recharge la page dans un navigateur)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>enregistrer (attention{n}: dans OptGeo 3.03, <kbd>Ctrl</kbd>+<kbd>S</kbd> supprimait)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Maj</kbd>+<kbd>S</kbd></td><td>enregistrer sous</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>O</kbd></td><td>ouvrir un fichier de l'appareil</td></tr>
<tr><td><kbd>Suppr</kbd> ou <kbd>Retour arrière</kbd></td><td>supprimer l'objet sélectionné (le mode Supprimer, lui, n'a pas de raccourci)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>D</kbd></td><td>dupliquer l'objet sélectionné (sans sélection{n}: mode Dupliquer)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>P</kbd></td><td>propriétés de l'objet sélectionné (sans sélection{n}: mode Propriétés)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>M</kbd></td><td>mode Déplacer</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>G</kbd></td><td>mode Grouper (éléments à choisir)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>A</kbd></td><td>grouper tous les éléments (après confirmation)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>E</kbd></td><td>commentaire de la simulation</td></tr>
<tr><td>flèches</td><td>déplacer l'objet sélectionné d'un pas de grille (grille affichée ou attraction active) ou d'un pixel{n}; avec <kbd>Maj</kbd>, dix fois plus</td></tr>
<tr><td><kbd>+</kbd> et <kbd>−</kbd></td><td>zoomer, dézoomer</td></tr>
<tr><td><kbd>0</kbd></td><td>tout voir</td></tr>
<tr><td><kbd>Ctrl</kbd> ou <kbd>Alt</kbd> maintenue</td><td>pendant qu'on place un point{n}: l'aligner horizontalement ou verticalement sur le précédent{n}; pendant un glissement{n}: le limiter à l'horizontale ou à la verticale</td></tr>
</tbody>
</table>

<h2 id="differences">Ce qui change par rapport à OptGeo 3.03</h2>
<ul>
<li>On touche un objet pour faire apparaître ses poignées, et on les fait glisser, au lieu de «{n}cliquer, déplacer, cliquer{n}» dans le mode Déplacer.</li>
<li>Les boutons <strong>Terminer</strong> et <strong>Annuler</strong> du bandeau remplacent «{n}Fin Dépl.{n}», «{n}Fin prop.{n}», «{n}Fin suppr.{n}», «{n}Fin dupl.{n}» et «{n}Fin{n}».</li>
<li>Pendant un glissement, la touche Échap ou un deuxième doigt posé sur le dessin remet l'objet à sa place.</li>
<li>La suppression d'un objet ne demande pas de confirmation, mais elle s'annule.</li>
<li>La copie d'un objet dupliqué apparaît décalée, au lieu de suivre la souris.</li>
<li>Pour un objet ponctuel, les points 1 et 2 sont rangés pour que le faisceau couvre le plus petit des deux secteurs.</li>
<li>Dans les propriétés, les angles se saisissent en degrés (le fichier <code>.opt</code> garde les radians){n}; dans les nombres, la virgule et le point sont acceptés (1,5 ou 1.5).</li>
<li><kbd>Ctrl</kbd>+<kbd>S</kbd> enregistre (dans OptGeo, il supprimait){n}; <kbd>Ctrl</kbd>+<kbd>Y</kbd> refait (dans OptGeo, c'était <kbd>Ctrl</kbd>+<kbd>R</kbd>, qui recharge la page dans un navigateur).</li>
<li>Le zoom et le déplacement de la vue restent possibles pendant un mode.</li>
<li>La liste des matériaux est fixe{n}; les préférences ne portent que sur la couleur et l'épaisseur.</li>
<li>Pas d'export JPG ni PostScript (PNG et SVG à la place){n}; l'impression passe par le navigateur.</li>
<li>Pas d'association des fichiers <code>.opt</code>, pas de répertoires, pas de menu Langue{n}: les fichiers s'ouvrent depuis l'appareil et s'enregistrent par téléchargement.</li>
</ul>
<p class="retour"><a href="index.html">Sommaire de l'aide</a></p>"""
    return gabarit("Utiliser OptGeo sur le web – Aide d'OptGeo", corps)


CSS = """/* Aide d'OptGeo, version web : feuille commune. */
:root {
  color-scheme: light dark;
  --fond: #fbfaf6;
  --texte: #1c2228;
  --doux: #55606b;
  --lien: #0b55a0;
  --bord: #d3d9df;
  --titre: #15385f;
  --encadre: #edf3fa;
  --encadre-bord: #8fb2db;
  --code: #efeee9;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fond: #14181c;
    --texte: #e4e7ea;
    --doux: #a6aeb6;
    --lien: #8cc0ff;
    --bord: #3a434c;
    --titre: #bcd5f3;
    --encadre: #1b2734;
    --encadre-bord: #36597f;
    --code: #232a31;
  }
}
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--fond);
  color: var(--texte);
  font: 1.0625rem/1.6 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  overflow-wrap: break-word;
}
main, .haut, footer { max-width: 46rem; margin: 0 auto; padding: 0 1rem; }
.haut { padding-top: .75rem; }
main { padding-bottom: 1.5rem; }
a { color: var(--lien); }
a:focus-visible { outline: 3px solid var(--lien); outline-offset: 2px; }
h1, h2, h3 { color: var(--titre); line-height: 1.25; }
h1 { font-size: 1.75rem; margin: 1rem 0 .5rem; }
h2 { font-size: 1.35rem; margin: 2rem 0 .5rem; padding-top: .75rem; border-top: 1px solid var(--bord); }
h3 { font-size: 1.15rem; margin: 1.5rem 0 .4rem; }
p, ul, ol { margin: .6rem 0; }
ul, ol { padding-left: 1.4rem; }
li { margin: .3rem 0; }
.sous-titre { font-weight: 600; color: var(--doux); margin-top: 0; }
.encadre {
  background: var(--encadre);
  border-left: 4px solid var(--encadre-bord);
  border-radius: 4px;
  padding: .6rem .8rem;
}
.ou { font-weight: 600; color: var(--doux); margin: .2rem 0 .2rem .4rem; }
.illustration { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem 1rem; }
img {
  max-width: 100%;
  height: auto;
  background: #fff;
  border: 1px solid var(--bord);
  border-radius: 4px;
}
ul.liens { list-style: none; padding-left: 0; }
ul.liens li { margin: .45rem 0; }
.poignees { list-style: none; padding-left: 0; }
.poignee { vertical-align: -3px; margin-right: .3rem; background: #fff; border-radius: 3px; }
.retour { margin-top: 2rem; }
code, kbd {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: .95em;
  background: var(--code);
  border-radius: 3px;
  padding: 0 .25em;
}
kbd { border: 1px solid var(--bord); }
table { width: 100%; border-collapse: collapse; margin: .8rem 0; }
th, td { text-align: left; vertical-align: top; padding: .45rem .5rem; border-bottom: 1px solid var(--bord); }
footer { color: var(--doux); border-top: 1px solid var(--bord); padding-top: .5rem; padding-bottom: 1.5rem; }
footer p { font-size: 1rem; }
@media print {
  .haut, .encadre { display: none; }
  body { background: #fff; color: #000; }
}
"""


# ---------------------------------------------------------------------------
# Contrôles
# ---------------------------------------------------------------------------

class Controleur(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.pile, self.erreurs, self.liens, self.sources, self.ids = [], [], [], [], set()
        self.titre, self.dans_titre = "", False
        self.meta = set()
        self.lang = None

    def handle_starttag(self, balise, attrs):
        a = dict(attrs)
        if balise == "html":
            self.lang = a.get("lang")
        if balise == "meta":
            if a.get("charset", "").lower() == "utf-8":
                self.meta.add("charset")
            if a.get("name") == "viewport":
                self.meta.add("viewport")
        if "id" in a:
            if a["id"] in self.ids:
                self.erreurs.append("id en double : " + a["id"])
            self.ids.add(a["id"])
        if "href" in a:
            self.liens.append(a["href"])
        if "src" in a:
            self.sources.append(a["src"])
        for cle in ("style", "background", "color", "bgcolor", "align"):
            if cle in a and balise not in ("svg", "path", "circle"):
                self.erreurs.append("attribut de mise en page <%s %s>" % (balise, cle))
        if balise in ("font", "big", "u", "center", "script", "iframe"):
            self.erreurs.append("balise interdite <%s>" % balise)
        if balise == "title":
            self.dans_titre = True
        if balise not in VIDES and balise not in ("path", "circle"):
            self.pile.append(balise)

    def handle_startendtag(self, balise, attrs):
        self.handle_starttag(balise, attrs)
        if balise not in VIDES and self.pile and self.pile[-1] == balise:
            self.pile.pop()

    def handle_endtag(self, balise):
        if balise == "title":
            self.dans_titre = False
        if balise in VIDES or balise in ("path", "circle"):
            return
        if not self.pile or self.pile[-1] != balise:
            self.erreurs.append("fermeture inattendue </%s> (ouvertes : %s)" % (balise, self.pile[-3:]))
            if balise in self.pile:
                while self.pile and self.pile.pop() != balise:
                    pass
        else:
            self.pile.pop()

    def handle_data(self, d):
        if self.dans_titre:
            self.titre += d


EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍]")


def controle(dest):
    erreurs = []
    pages = sorted(dest.glob("*.html"))
    for p in pages:
        texte = p.read_text(encoding="utf-8")
        c = Controleur()
        c.feed(texte)
        c.close()
        nom = p.name
        erreurs += ["%s : %s" % (nom, e) for e in c.erreurs]
        if c.pile:
            erreurs.append("%s : balises non fermées %s" % (nom, c.pile))
        if not texte.startswith("<!DOCTYPE html>"):
            erreurs.append(nom + " : DOCTYPE manquant")
        if c.lang != "fr" or c.meta != {"charset", "viewport"}:
            erreurs.append(nom + " : lang, charset ou viewport manquant")
        if not c.titre.strip():
            erreurs.append(nom + " : titre vide")
        for ref in c.liens + c.sources:
            if re.match(r"^[a-z][a-z0-9+.-]*:", ref, re.I) or ref.startswith("//"):
                erreurs.append("%s : adresse externe %s" % (nom, ref))
                continue
            chemin, _, ancre = ref.partition("#")
            cible = (dest / chemin) if chemin else p
            if not cible.exists():
                erreurs.append("%s : cible absente %s" % (nom, ref))
            elif ancre and cible.suffix == ".html":
                autre = Controleur()
                autre.feed(cible.read_text(encoding="utf-8"))
                if ancre not in autre.ids:
                    erreurs.append("%s : ancre absente %s" % (nom, ref))
        if "http" in " ".join(c.liens + c.sources):
            erreurs.append(nom + " : « http » dans un lien ou une source")
        if EMOJI.search(texte):
            erreurs.append(nom + " : émoji")
        if "&nbsp;&nbsp;" in texte or NBSP + NBSP in texte or "&nbsp;" in texte:
            erreurs.append(nom + " : espaces insécables de mise en page")
        if "<br" in texte:
            erreurs.append(nom + " : <br> restant")
        visible = html.unescape(re.sub(r"<[^>]+>", " ", texte))
        for motif in FAUTES_INTERDITES:
            for m in re.finditer(motif, visible):
                erreurs.append("%s : faute restante « %s »" % (nom, m.group(0)))
        if '"' in visible.replace("&quot;", ""):
            erreurs.append(nom + " : guillemet droit restant")
    # images inutilisées
    utilisees = set()
    for p in pages:
        utilisees |= set(re.findall(r'src="images/([^"]+)"', p.read_text(encoding="utf-8")))
    for f in sorted((dest / "images").iterdir()):
        if f.name not in utilisees:
            erreurs.append("image inutilisée : " + f.name)
    return erreurs, len(pages)


# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--source", type=Path, default=SOURCE_DEFAUT)
    ap.add_argument("--destination", type=Path, default=DESTINATION_DEFAUT)
    args = ap.parse_args()
    source, dest = args.source.resolve(), args.destination.resolve()

    if not source.is_dir():
        sys.exit("Source introuvable : %s" % source)
    if dest.name != "aide":
        sys.exit("Par sécurité, la destination doit s'appeler « aide » : %s" % dest)
    if dest.exists():
        shutil.rmtree(dest)
    (dest / "images").mkdir(parents=True)

    fichiers = {f.stem.lower(): f for f in source.glob("*.html")}
    manquantes = sorted(set(PAGES) - set(fichiers))
    if manquantes:
        sys.exit("Pages d'origine absentes : %s" % ", ".join(manquantes))

    alertes = []
    for page in PAGES:
        a, _ = porte_page(fichiers[page], page, source, dest)
        alertes += ["%s : %s" % (page, x) for x in a]

    (dest / "index.html").write_text(page_sommaire(), encoding="utf-8")
    (dest / "web.html").write_text(page_web(), encoding="utf-8")
    (dest / "aide.css").write_text(CSS, encoding="utf-8")

    for x in alertes:
        print("Avertissement :", x)
    erreurs, n = controle(dest)
    erreurs = ERREURS_ADAPTATION + erreurs
    for e in erreurs:
        print("ERREUR :", e)
    nb_images = len(list((dest / "images").iterdir()))
    print("%d pages HTML et %d images écrites dans %s" % (n, nb_images, dest))
    if erreurs:
        sys.exit(1)
    print("Contrôles réussis.")


if __name__ == "__main__":
    main()
