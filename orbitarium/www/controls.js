let selectedPlanet = null;
let timeMultiplier = 0.0009765625;
let showOrbits = true;
let showNames = true;

// Gestes sur le canvas (Pointer Events : souris, doigt et stylet avec le même code)
// - un doigt (ou la souris, bouton enfoncé) qui glisse déplace la vue ;
// - deux doigts qui pincent zooment autour du point situé entre les doigts ;
// - un toucher (ou un clic) sur un astre centre la vue sur lui ;
// - deux touchers rapides sur le fond reviennent à la vue d'ensemble.
const SEUIL_GLISSER = { mouse: 4, pen: 8, touch: 10 }; // px avant de considérer un glisser
const TOLERANCE_TOUCHER = 24; // px : un doigt est large, les astres sont minuscules
const DOUBLE_TOUCHER_MS = 350;
const DOUBLE_TOUCHER_PX = 40;

const pointeurs = new Map(); // pointerId -> {x, y}
let geste = null;            // {mode: "toucher" | "glisser" | "pincer", ...}
let ignorerClic = false;     // le clic qui suit un glisser ou un pincement ne sélectionne rien
let dernierTypePointeur = "mouse";
let dernierToucherVide = { t: 0, x: 0, y: 0 };

// Position d'un événement dans le repère de la vue (pixels CSS). getBoundingClientRect
// reste juste si la page est décalée, défilée ou si le canvas est mis à l'échelle en CSS.
function pointDansLaVue(event) {
    const rect = canvas.getBoundingClientRect();
    const echelleX = rect.width ? viewWidth / rect.width : 1;
    const echelleY = rect.height ? viewHeight / rect.height : 1;
    return {
        x: (event.clientX - rect.left) * echelleX,
        y: (event.clientY - rect.top) * echelleY
    };
}

// Le menu « Centrer sur » reflète la vue : astre suivi, Soleil ou vue libre.
function synchroniserMenu(valeur) {
    const planetSelect = document.getElementById("planetSelect");
    if (!planetSelect) return;
    const option = [...planetSelect.options].find(o => o.value === valeur);
    planetSelect.value = option ? valeur : "libre";
}

function valeurMenuPour(planet) {
    if (!planet) return "soleil";
    return planet.isComet ? "Comète HALLEY" : planet.name;
}

// Fiche d'un astre (nom, type, distance, durée de révolution…), données dans planets.js.
function afficherFiche(astre) {
    const fiche = document.getElementById("fiche");
    if (!fiche) return;
    const infos = ficheAstre(astre);
    document.getElementById("ficheNom").textContent = infos.nom;
    document.getElementById("ficheType").textContent = infos.type || "";
    const liste = document.getElementById("ficheDonnees");
    liste.textContent = "";
    for (const [titre, valeur] of infos.lignes || []) {
        const dt = document.createElement("dt");
        dt.textContent = titre;
        const dd = document.createElement("dd");
        dd.textContent = valeur;
        liste.append(dt, dd);
    }
    const note = document.getElementById("ficheNote");
    note.textContent = infos.note || "";
    note.hidden = !infos.note;
    fiche.hidden = false;
    fiche.dataset.astre = infos.nom;
    // Écran étroit (portrait) : le panneau Options ouvert recouvrirait la fiche, on le referme.
    const options = document.getElementById("optionsControls");
    if (options && options.open && seChevauchent(fiche, options)) options.open = false;
}

function seChevauchent(e1, e2) {
    const a = e1.getBoundingClientRect(), b = e2.getBoundingClientRect();
    return a.width > 0 && b.width > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function masquerFiche() {
    const fiche = document.getElementById("fiche");
    if (fiche) fiche.hidden = true;
}

// Retour à la vue d'ensemble centrée sur le Soleil.
function vueEnsemble() {
    masquerFiche();
    clearAllTraces();
    resizeCanvas(); // recalculer le zoom
    selectedPlanet = null;
    setViewOffsets(0, 0);
    synchroniserMenu("soleil");
}

// Le Soleil ne doit pas sortir trop loin de l'écran : on garde le système à portée.
function limiterDecalage(x, y) {
    const limiteX = 4400 * zoom + viewWidth / 2;
    const limiteY = 4400 * zoom + viewHeight / 2;
    return {
        x: Math.max(-limiteX, Math.min(x, limiteX)),
        y: Math.max(-limiteY, Math.min(y, limiteY))
    };
}

// Quitte le suivi d'un astre en gardant la vue telle qu'elle est à l'écran.
function passerEnVueLibre() {
    if (selectedPlanet) selectedPlanet = null;
    synchroniserMenu("libre");
}

function deplacerVue(dx, dy) {
    const avantX = viewOffsetX, avantY = viewOffsetY;
    const d = limiterDecalage(viewOffsetX + dx, viewOffsetY + dy);
    setViewOffsets(d.x, d.y);
    shiftAllTraces(viewOffsetX - avantX, viewOffsetY - avantY);
}

// Astre le plus proche du point (x, y), ou null. Le Soleil est renvoyé sous la forme "soleil".
function astreSous(x, y, tolerance) {
    const originX = viewWidth / 2 + viewOffsetX;
    const originY = viewHeight / 2 + viewOffsetY;
    let meilleur = null;
    let meilleurEcart = Infinity;

    // Soleil : disque dessiné de rayon 50 × zoom.
    const rSoleil = 50 * zoom;
    const dSoleil = Math.hypot(x - originX, y - originY);
    if (dSoleil < Math.max(rSoleil + 5, tolerance)) {
        meilleur = "soleil";
        meilleurEcart = dSoleil - rSoleil;
    }

    for (const planet of planets) {
        const pos = getPlanetPosition(planet, originX, originY, zoom);
        const r = planet.radius * zoom;
        const d = Math.hypot(x - pos.x, y - pos.y);
        if (d < Math.max(r + 5, tolerance) && d - r < meilleurEcart) {
            meilleur = planet;
            meilleurEcart = d - r;
        }
        // Satellites : seulement quand ils sont assez écartés de leur planète pour être visés.
        if (planet.satellites && zoom >= 1.5) {
            for (const sat of planet.satellites) {
                const sx = pos.x + sat.orbit * zoom * Math.cos(sat.angle);
                const sy = pos.y + sat.orbit * zoom * Math.sin(sat.angle);
                const rs = sat.radius * zoom;
                const ds = Math.hypot(x - sx, y - sy);
                if (ds < Math.max(rs + 5, tolerance) && ds - rs < meilleurEcart) {
                    meilleur = sat;
                    meilleurEcart = ds - rs;
                }
            }
        }
    }
    return meilleur;
}

function selectionnerAstre(x, y) {
    const tolerance = dernierTypePointeur === "mouse" ? 0 : TOLERANCE_TOUCHER;
    const astre = astreSous(x, y, tolerance);

    if (astre === "soleil") {
        selectedPlanet = null;
        setViewOffsets(0, 0);
        synchroniserMenu("soleil");
        dernierToucherVide.t = 0;
        afficherFiche("soleil");
        return;
    }

    if (astre) {
        // Un satellite touché : sa fiche s'affiche et sa planète reste suivie au centre.
        afficherFiche(astre);
        selectedPlanet = astre.parent || astre;
        synchroniserMenu(valeurMenuPour(selectedPlanet));
        dernierToucherVide.t = 0;
        // Si la planète possède des satellites, forcer un zoom minimal
        if (selectedPlanet.satellites && selectedPlanet.satellites.length > 0 && zoom < 1.5) {
            setZoom(1.5);
        }
        return;
    }

    // Toucher sur le fond : un double toucher ramène à la vue d'ensemble (doigt ou stylet).
    if (dernierTypePointeur !== "mouse") {
        const maintenant = performance.now();
        if (maintenant - dernierToucherVide.t < DOUBLE_TOUCHER_MS &&
            Math.hypot(x - dernierToucherVide.x, y - dernierToucherVide.y) < DOUBLE_TOUCHER_PX) {
            dernierToucherVide.t = 0;
            vueEnsemble();
        } else {
            dernierToucherVide = { t: maintenant, x, y };
        }
    }
}

function debutPincement() {
    const [a, b] = [...pointeurs.values()];
    geste = {
        mode: "pincer",
        distance0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        milieu0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        zoom0: zoom,
        decalage0: { x: viewOffsetX, y: viewOffsetY }
    };
}

function suitePincement() {
    const [a, b] = [...pointeurs.values()];
    const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const nouveauZoom = clampZoom(geste.zoom0 * distance / geste.distance0);
    if (nouveauZoom !== zoom) setZoom(nouveauZoom); // setZoom efface les traces

    if (selectedPlanet) return; // l'astre suivi reste au centre (voir drawFrame)

    // Le point du système qui était sous les doigts au début du geste reste sous les doigts
    // (le déplacement des deux doigts fait aussi glisser la vue).
    const k = nouveauZoom / geste.zoom0;
    const cx = viewWidth / 2, cy = viewHeight / 2;
    const d = limiterDecalage(
        milieu.x - cx - (geste.milieu0.x - cx - geste.decalage0.x) * k,
        milieu.y - cy - (geste.milieu0.y - cy - geste.decalage0.y) * k
    );
    if (d.x !== viewOffsetX || d.y !== viewOffsetY) {
        setViewOffsets(d.x, d.y);
        synchroniserMenu("libre");
    }
}

function initGestes() {
    canvas.addEventListener("pointerdown", function(event) {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        dernierTypePointeur = event.pointerType || "mouse";
        try { canvas.setPointerCapture(event.pointerId); } catch (e) { /* pointeur déjà relâché */ }
        pointeurs.set(event.pointerId, pointDansLaVue(event));

        if (pointeurs.size === 1) {
            ignorerClic = false;
            const p = pointDansLaVue(event);
            geste = { mode: "toucher", depart: p, dernier: p };
        } else if (pointeurs.size === 2) {
            ignorerClic = true;
            debutPincement();
        }
        // Au-delà de deux doigts : les doigts supplémentaires sont ignorés.
    });

    canvas.addEventListener("pointermove", function(event) {
        if (!pointeurs.has(event.pointerId) || !geste) return;
        const p = pointDansLaVue(event);
        pointeurs.set(event.pointerId, p);

        if (geste.mode === "pincer") {
            if (pointeurs.size >= 2) suitePincement();
            return;
        }
        if (geste.mode === "toucher") {
            const seuil = SEUIL_GLISSER[event.pointerType] || SEUIL_GLISSER.touch;
            if (Math.hypot(p.x - geste.depart.x, p.y - geste.depart.y) < seuil) return;
            geste.mode = "glisser";
            ignorerClic = true;
            passerEnVueLibre();
            canvas.classList.add("glisse");
        }
        if (geste.mode === "glisser") {
            deplacerVue(p.x - geste.dernier.x, p.y - geste.dernier.y);
            geste.dernier = p;
        }
    });

    function finPointeur(event) {
        if (!pointeurs.has(event.pointerId)) return;
        pointeurs.delete(event.pointerId);
        if (event.type === "pointercancel") ignorerClic = true;

        if (pointeurs.size === 0) {
            geste = null;
            canvas.classList.remove("glisse");
        } else if (geste && geste.mode === "pincer" && pointeurs.size === 1) {
            // Fin du pincement avec un doigt encore posé : il peut continuer à glisser,
            // sans saut, mais son relâchement ne sélectionnera rien.
            const p = [...pointeurs.values()][0];
            geste = { mode: "toucher", depart: p, dernier: p };
        } else if (geste && geste.mode === "pincer" && pointeurs.size >= 2) {
            debutPincement();
        }
    }
    canvas.addEventListener("pointerup", finPointeur);
    canvas.addEventListener("pointercancel", finPointeur);
    canvas.addEventListener("lostpointercapture", finPointeur);

    // Safari iOS ignore « user-scalable=no » : on bloque ses événements de geste propres
    // pour que le pincement zoome le système solaire et non la page entière.
    document.addEventListener("gesturestart", event => event.preventDefault());

    // Pas de menu contextuel sur un appui long au doigt (la souris garde son clic droit).
    canvas.addEventListener("contextmenu", function(event) {
        if (dernierTypePointeur !== "mouse") event.preventDefault();
    });
}

function initControls() {
    // Boutons de contrôle du temps
    const slowTimeBtn = document.getElementById("slowTime");
    const fastTimeBtn = document.getElementById("fastTime");
    if (slowTimeBtn) {
        slowTimeBtn.addEventListener("click", () => {
            timeMultiplier /= 2;
            console.log("Temps ralenti, multiplicateur =", timeMultiplier);
        });
    }
    if (fastTimeBtn) {
        fastTimeBtn.addEventListener("click", () => {
            timeMultiplier *= 2;
            console.log("Temps accéléré, multiplicateur =", timeMultiplier);
        });
    }

    // Pause et chrono (mesurer une durée de révolution).
    const pauseBtn = document.getElementById("pauseTime");
    if (pauseBtn) {
        pauseBtn.addEventListener("click", () => {
            enPause = !enPause;
            pauseBtn.textContent = enPause ? "▶️" : "⏸️";
            pauseBtn.setAttribute("aria-label", enPause ? "Reprendre" : "Mettre en pause");
            pauseBtn.title = enPause ? "Reprendre" : "Pause";
            pauseBtn.setAttribute("aria-pressed", String(enPause));
            mettreAJourHorloge(true);
        });
    }
    const chronoBtn = document.getElementById("resetChrono");
    if (chronoBtn) chronoBtn.addEventListener("click", chronoAZero);

    const ficheFermer = document.getElementById("ficheFermer");
    if (ficheFermer) ficheFermer.addEventListener("click", masquerFiche);

    // Gestion du zoom avec la molette sur le canvas (et pincement du pavé tactile, Ctrl + molette)
    canvas.addEventListener("wheel", function(event) {
        event.preventDefault();
        const newZoom = zoom * (1 - event.deltaY * 0.001);
        setZoom(clampZoom(newZoom));
    }, { passive: false });

    // Glisser, pincer, toucher (souris, doigt, stylet)
    initGestes();

    // Clic ou toucher sur le canvas : centrer la vue sur l'astre visé
    canvas.addEventListener("click", function(event) {
        if (ignorerClic) {
            ignorerClic = false;
            return;
        }
        const p = pointDansLaVue(event);
        selectionnerAstre(p.x, p.y);
    });

    // Gestion du menu déroulant pour choisir la planète centrée
    const planetSelect = document.getElementById("planetSelect");
    if (planetSelect) {
        planetSelect.value = "soleil";
        planetSelect.addEventListener("change", function() {
            const selectedName = this.value.toLowerCase();
            // Vous pouvez vider les traces ici via traces.js si nécessaire
            clearAllTraces();
            if (selectedName === "soleil") {
                vueEnsemble();
            } else if (selectedName.includes("halley")) {
                selectedPlanet = planets.find(p => p.isComet);
                afficherFiche(selectedPlanet);
            } else {
                selectedPlanet = planets.find(p => p.name.toLowerCase() === selectedName);
                if (
                    selectedPlanet &&
                    selectedPlanet.satellites &&
                    selectedPlanet.satellites.length > 0 &&
                    zoom < 1.5
                ) {
                    setZoom(1.5);
                }
                if (selectedPlanet) afficherFiche(selectedPlanet);
            }
        });
    }

    // Bouton pour afficher/masquer les orbites
    const toggleOrbitsBtn = document.getElementById("toggleOrbits");
    if (toggleOrbitsBtn) {
        toggleOrbitsBtn.addEventListener("click", () => {
            showOrbits = !showOrbits;
            toggleOrbitsBtn.textContent = showOrbits ? "Masquer les orbites" : "Afficher les orbites";
        });
    }

    // Bouton pour afficher/masquer les noms
    const toggleNamesBtn = document.getElementById("toggleNames");
    if (toggleNamesBtn) {
        toggleNamesBtn.addEventListener("click", () => {
            showNames = !showNames;
            toggleNamesBtn.textContent = showNames ? "Masquer les noms" : "Afficher les noms";
        });
    }
}
