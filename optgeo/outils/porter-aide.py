#!/usr/bin/env python3
"""Porte l'aide française d'OptGeo 3.03 en pages HTML locales pour la version web.

Source (lecture seule) : l'aide d'origine d'OptGeo 3.03 (Jean-Marie Biansan,
licence GNU GPL v2 ou ultérieure), dossier ``src/aide/fr/`` du dépôt amont.
Destination : le dossier ``aide/`` voisin de ce dossier ``outils/``.

Le script régénère tout ``aide/`` (il le vide d'abord) :
  - une page UTF-8 par page d'origine, même nom de base en minuscules,
    balisage nettoyé (titres, paragraphes, listes), texte d'origine accentué
    et corrigé de ses fautes évidentes (table CORRECTIONS ci-dessous) ;
  - ``index.html`` (sommaire), ``web.html`` (usage de la version web),
    ``aide.css`` (feuille commune) ;
  - ``images/`` : les images utilisées par les pages (le BMP est converti en
    PNG avec ``sips``, l'outil d'images de macOS).
Puis il contrôle le résultat (HTML bien formé, liens et images présents,
aucune ressource distante, aucun émoji, aucune faute connue restante) et
s'arrête avec un code d'erreur si un contrôle échoue.

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

BANDEAU = (
    '<p class="encadre">Cette page reprend l\'aide d\'OptGeo 3.03 (version pour '
    "ordinateur, à la souris). Dans la version web, on touche ou on clique au lieu de "
    "«" + NBSP + "cliquer deux fois" + NBSP + "»" + NBSP + "; voir "
    '<a href="web.html">Utiliser OptGeo sur le web</a>.</p>'
)

PIED = (
    "<footer><p>Aide d'origine" + NBSP + ": OptGeo 3.03, Jean-Marie Biansan, licence GNU GPL v2 "
    "ou ultérieure. Portage web des pages" + NBSP + ": 2026.</p></footer>"
)

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
    page_html = gabarit(titre_onglet, BANDEAU + "\n" + "\n".join(corps))
    (dest / (page + ".html")).write_text(page_html, encoding="utf-8")
    return alertes, rendu.images


def gabarit(titre, corps, bandeau_sommaire=True):
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
    ) % (html.escape(titre, quote=False), nav, corps, PIED)


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
        ("polyhedre.html", "Polyèdre (polygone réfractant : prisme, lame à faces parallèles…)"),
        ("polysphere.html", "Polysphère (polycercle réfractant)"),
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
        "(version pour ordinateur) et ajoute une page sur la version web.</p>",
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
    """Petit dessin d'une poignée (SVG en ligne, décoratif)."""
    dessins = {
        "croix-verte": '<path d="M3 9h12M9 3v12" stroke="#1a9a3a" stroke-width="2.5" stroke-linecap="round"/>',
        "cercle-bleu": '<circle cx="9" cy="9" r="5.5" fill="none" stroke="#1f5fd1" stroke-width="2.5"/>',
        "disque-rouge": '<circle cx="9" cy="9" r="6" fill="#d22d2d"/>',
        "croix-cyan": '<path d="M4 4l10 10M14 4L4 14" stroke="#0aa5b8" stroke-width="2.5" stroke-linecap="round"/>',
    }
    return ('<svg class="poignee" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" '
            'focusable="false">%s</svg>' % dessins[nom])


def page_web():
    n = NBSP
    corps = f"""<h1>Utiliser OptGeo sur le web</h1>
<p>OptGeo est un logiciel libre d'optique géométrique écrit par Jean-Marie Biansan. Cette version web s'utilise dans le navigateur, sur une tablette, un téléphone ou un ordinateur. Les autres pages de l'aide reprennent l'aide d'OptGeo 3.03, écrite pour un ordinateur et une souris{n}: cette page explique comment faire dans la version web.</p>
<ul class="liens sommaire-page">
<li><a href="#ecran">L'écran</a></li>
<li><a href="#placer">Placer un objet</a></li>
<li><a href="#selection">Choisir et modifier un objet</a></li>
<li><a href="#vue">Se déplacer dans le dessin</a></li>
<li><a href="#fichiers">Ouvrir, enregistrer, imprimer</a></li>
<li><a href="#clavier">Raccourcis clavier</a></li>
<li><a href="#differences">Ce qui change par rapport à OptGeo 3.03</a></li>
</ul>

<h2 id="ecran">L'écran</h2>
<h3>La barre du haut</h3>
<ul>
<li><strong>Menu</strong>{n}: Fichier, Édition, Ajouter par coordonnées, Affichage et options, Aide.</li>
<li><strong>Annuler</strong> et <strong>Refaire</strong>{n}: reviennent sur la dernière action, ou la refont.</li>
<li>Les modes d'OptGeo{n}: <strong>Déplacer</strong>, <strong>Propriétés</strong>, <strong>Dupliquer</strong>, <strong>Supprimer</strong>, <strong>Grouper</strong>. Ils marchent comme dans OptGeo (voir l'<a href="optgeo.html">aide générale</a>). Pour sortir d'un mode, touche le bouton <strong>Terminer</strong> dans le bandeau de consigne.</li>
<li><strong>Affichage</strong>{n}: afficher ou non les normales, les angles, la grille, l'attraction de la grille, les longueurs des segments{n}; choisir le zoom, de ×1 à ×100.</li>
</ul>
<h3>La palette des objets</h3>
<p>Elle est à gauche quand l'écran est en paysage (plus large que haut), en bas quand il est en portrait (plus haut que large). Elle range les objets en cinq familles{n}: <strong>Miroirs</strong>, <strong>Écrans</strong>, <strong>Sources</strong>, <strong>Dioptres</strong>, <strong>Divers</strong>.</p>

<h2 id="placer">Placer un objet</h2>
<ol>
<li>Choisis un objet dans la palette.</li>
<li>Lis le bandeau en haut du dessin{n}: il dit quoi faire à chaque étape.</li>
<li>Place les points de l'objet un par un, comme dans OptGeo{n}:
<ul>
<li><strong>au doigt</strong>{n}: appuie, glisse pour viser (une loupe montre ce qui est sous ton doigt et les coordonnées), puis relâche pour valider le point{n};</li>
<li><strong>à la souris</strong>{n}: un clic par point{n}; l'aperçu de l'objet suit la souris.</li>
</ul></li>
</ol>
<p>Pour abandonner{n}: bouton <strong>Annuler</strong> du bandeau, ou touche Échap.</p>
<p>Pour t'aider{n}:</p>
<ul>
<li>la case <strong>Rester dans ce mode</strong> permet de créer plusieurs objets à la suite{n};</li>
<li>les boutons <strong>Aligner horizontalement</strong> et <strong>Aligner verticalement</strong> (ou les touches Ctrl et Alt à l'ordinateur) placent le point sur la même horizontale ou la même verticale que le point précédent{n};</li>
<li>si l'attraction de la grille est activée (bouton <strong>Affichage</strong>), les points se placent sur la grille.</li>
</ul>

<h2 id="selection">Choisir et modifier un objet</h2>
<p>Touche (ou clique) un objet{n}: il est sélectionné et ses poignées apparaissent.</p>
<ul class="poignees">
<li>{poignee("croix-verte")} <strong>Croix verte</strong>{n}: déplace tout l'objet.</li>
<li>{poignee("cercle-bleu")} <strong>Cercle bleu</strong>{n}: déplace ce point seulement (extrémité, sommet, source…).</li>
<li>{poignee("disque-rouge")} <strong>Disque rouge</strong>{n}: fait tourner l'objet.</li>
<li>{poignee("croix-cyan")} <strong>Croix cyan</strong>{n}: foyer ou centre de courbure{n}; la déplacer change la focale ou le rayon de courbure.</li>
</ul>
<p>Fais glisser une poignée pour modifier l'objet. Tu peux aussi faire glisser l'objet lui-même pour le déplacer.</p>
<p>Sous le dessin, une barre propose{n}: <strong>Propriétés</strong>, <strong>Dupliquer</strong>, <strong>Supprimer</strong>, <strong>Grouper</strong> / <strong>Dissocier</strong>, <strong>Désélectionner</strong>.</p>
<p>Plusieurs objets au même endroit{n}? Touche de nouveau au même endroit{n}: la sélection passe à l'objet suivant.</p>

<h2 id="vue">Se déplacer dans le dessin</h2>
<ul>
<li>Au doigt{n}: pose deux doigts pour zoomer et déplacer la vue.</li>
<li>À la souris{n}: la molette zoome.</li>
<li>Glisser dans une zone vide du dessin déplace la vue.</li>
<li>Boutons <strong>+</strong>, <strong>−</strong> et <strong>Tout voir</strong>.</li>
</ul>

<h2 id="fichiers">Ouvrir, enregistrer, imprimer</h2>
<p>Avec le bouton <strong>Menu</strong>, tu peux{n}:</p>
<ul>
<li>ouvrir un fichier <code>.opt</code> de l'appareil{n}; tu peux choisir en même temps le fichier <code>.txt</code> de son commentaire{n};</li>
<li>ouvrir un des 56 exemples d'OptGeo{n};</li>
<li>superposer une simulation{n};</li>
<li>enregistrer{n}: le navigateur télécharge un fichier <code>.opt</code>, lisible par OptGeo 3.03, et un fichier <code>.txt</code> pour le commentaire{n};</li>
<li>exporter une image PNG ou SVG{n};</li>
<li>imprimer (seul le dessin est imprimé).</li>
</ul>
<p>Ton travail est gardé automatiquement sur l'appareil{n}: rien n'est envoyé sur Internet. Quand tu rouvres l'application, elle propose de reprendre ce travail.</p>

<h2 id="clavier">Raccourcis clavier (ordinateur)</h2>
<table>
<thead><tr><th scope="col">Touches</th><th scope="col">Action</th></tr></thead>
<tbody>
<tr><td><kbd>Échap</kbd></td><td>abandonner ce qui est en cours</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>annuler</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Y</kbd> ou <kbd>Ctrl</kbd>+<kbd>Maj</kbd>+<kbd>Z</kbd></td><td>refaire</td></tr>
<tr><td><kbd>Suppr</kbd></td><td>supprimer la sélection</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>D</kbd></td><td>dupliquer</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>enregistrer (attention{n}: dans OptGeo 3.03, <kbd>Ctrl</kbd>+<kbd>S</kbd> supprimait)</td></tr>
<tr><td>flèches</td><td>déplacer la sélection</td></tr>
<tr><td><kbd>+</kbd> et <kbd>−</kbd></td><td>zoomer, dézoomer</td></tr>
<tr><td><kbd>0</kbd></td><td>tout voir</td></tr>
<tr><td><kbd>Ctrl</kbd> ou <kbd>Alt</kbd> pendant qu'on place un point</td><td>aligner le point horizontalement ou verticalement sur le précédent</td></tr>
</tbody>
</table>

<h2 id="differences">Ce qui change par rapport à OptGeo 3.03</h2>
<ul>
<li>On fait glisser les poignées, au lieu de «{n}cliquer, déplacer, cliquer{n}».</li>
<li>Pendant un déplacement, la touche Échap ou un deuxième doigt posé sur le dessin remet l'objet à sa place.</li>
<li>Dans les propriétés, les angles se saisissent en degrés (le fichier <code>.opt</code> garde les radians).</li>
<li>Dans les nombres, la virgule et le point sont acceptés (1,5 ou 1.5).</li>
<li><kbd>Ctrl</kbd>+<kbd>S</kbd> enregistre (dans OptGeo, il supprimait).</li>
<li>Pas d'export JPG ni PostScript.</li>
<li>L'impression passe par le navigateur.</li>
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
    for e in erreurs:
        print("ERREUR :", e)
    nb_images = len(list((dest / "images").iterdir()))
    print("%d pages HTML et %d images écrites dans %s" % (n, nb_images, dest))
    if erreurs:
        sys.exit(1)
    print("Contrôles réussis.")


if __name__ == "__main__":
    main()
