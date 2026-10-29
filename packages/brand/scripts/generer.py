"""Logo Kivien : vectorisation du logotype, du monogramme et du favicon.

Reproduit la géométrie CSS du composant « Kivien Logo » (design_handoff_kivien) à partir de
Bricolage Grotesque figée (wght 700, wdth 100), avec la mise en forme HarfBuzz (crénage
identique à Chromium). Toutes les cotes sont en unités de police (1 em = 1000).

Composant (lower, pill="second", taille ≥ 40 px) — span inline-flex, line-height 1,
font-variation-settings 'opsz' 96, interlettrage -0,04 em sur chaque caractère :
  « k » | « i » | « v » | [inline-block, marge 0,015 em de chaque côté : « ı » + pilule] | « en »
Chaque morceau est un élément flex distinct : le crénage n'existe qu'à l'intérieur de « en ».
Pilule : 0,24 × 0,13 em, rayon plein, centrée sur la boîte du ı (avance + interlettrage),
à 0,09 em sous le haut de la boîte de ligne. Avec ascendante 930 / descendante 270
(USE_TYPO_METRICS), la ligne de base est à 0,83 em sous ce haut : la pilule va de
0,74 à 0,61 em au-dessus de la ligne de base.

Monogramme (mono) : « k » | [« ı » + pilule], même construction, centré dans le carré
(charte : taille 168 px dans 256 px, soit 672 px dans 1024).
Favicon : « k » seul, 28 px dans 32 px, line-height 1, margin-top -4 px, centré ;
pas de font-variation-settings, donc taille optique automatique (opsz 28).

Contrôle : ces cotes sont vérifiées contre les positions mesurées dans Chromium sur la charte
(écart < 0,5 unité à 176 px, voir docs/captures/logo).

Usage : python3 generer.py   (écrit dans ../svg)
"""
import io
import math
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

RACINE = Path(__file__).resolve().parents[3]
SOURCE = RACINE / "packages/ui-tokens/polices/BricolageGrotesque-variable-latin.woff2"
SORTIE = Path(__file__).resolve().parents[1] / "svg"

BASALTE, CREME, PIMENT = "#211C18", "#FBF6EE", "#C2401E"
UPM = 1000
ASCENDANTE, DESCENDANTE = 930, 270  # OS/2 typo, USE_TYPO_METRICS
BASE = ASCENDANTE - (ASCENDANTE + DESCENDANTE - UPM) / 2  # 830 : ligne de base sous le haut de la boîte

INTERLETTRAGE = -0.04 * UPM
MARGE_PILULE = 0.015 * UPM
PILULE_L, PILULE_H, PILULE_HAUT = 0.24 * UPM, 0.13 * UPM, 0.09 * UPM

# Android, icône adaptative : le contenu doit tenir dans le cercle sûr central
# (66 dp sur 108 dp, soit un rayon de 313 px sur 1024). On vise 300 px, avec une marge.
RAYON_SUR_ANDROID = 300


class Police:
    """Bricolage figée à une taille optique donnée, avec mise en forme HarfBuzz."""

    def __init__(self, opsz: float):
        self.axes = {"wght": 700, "opsz": opsz, "wdth": 100}
        variable = TTFont(SOURCE)
        assert variable["head"].unitsPerEm == UPM
        self.ttf = instantiateVariableFont(variable, dict(self.axes))
        self.glyphes = self.ttf.getGlyphSet()
        self.cmap = self.ttf.getBestCmap()
        variable_hb = TTFont(SOURCE)
        variable_hb.flavor = None
        flux = io.BytesIO()
        variable_hb.save(flux)
        self.hb_font = hb.Font(hb.Face(hb.Blob(flux.getvalue())))
        self.hb_font.set_variations(dict(self.axes))

    def mettre_en_forme(self, texte: str) -> list[tuple[str, float]]:
        """[(nom de glyphe, avance avec crénage)] comme Chromium (kern activé)."""
        tampon = hb.Buffer()
        tampon.add_str(texte)
        tampon.guess_segment_properties()
        hb.shape(self.hb_font, tampon, {"kern": True, "liga": False})
        ordre = self.ttf.getGlyphOrder()
        return [(ordre[i.codepoint], p.x_advance) for i, p in zip(tampon.glyph_infos, tampon.glyph_positions)]

    def chemin(self, nom: str, x: float, y_base: float, echelle: float = 1.0) -> str:
        """Tracé SVG du glyphe, origine en (x, y_base), axe y vers le bas."""
        stylo = SVGPathPen(self.glyphes, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        self.glyphes[nom].draw(TransformPen(stylo, (echelle, 0, 0, -echelle, x, y_base)))
        return stylo.getCommands()

    def boite(self, nom: str):
        b = BoundsPen(self.glyphes)
        self.glyphes[nom].draw(b)
        return b.bounds


def pilule(x: float, y: float, l: float, h: float) -> str:
    r = h / 2
    return (
        f"M{x + r:.2f} {y:.2f}H{x + l - r:.2f}A{r:.2f} {r:.2f} 0 0 1 {x + l - r:.2f} {y + h:.2f}"
        f"H{x + r:.2f}A{r:.2f} {r:.2f} 0 0 1 {x + r:.2f} {y:.2f}Z"
    )


def composer(p: Police, morceaux: list[str]):
    """Place les morceaux comme le composant. « ı » = morceau à pilule (marges + pilule).

    Renvoie [(glyphe, x)], la pilule (x, y) et la largeur de la boîte, origine sur la ligne de base.
    """
    x = 0.0
    glyphes, pil = [], None
    for m in morceaux:
        if m == "ı":
            nom = p.cmap[0x131]
            boite_i = p.ttf["hmtx"][nom][0] + INTERLETTRAGE
            x += MARGE_PILULE
            glyphes.append((nom, x))
            pil = (x + boite_i / 2 - PILULE_L / 2, PILULE_HAUT - BASE)
            x += boite_i + MARGE_PILULE
            continue
        for nom, avance in p.mettre_en_forme(m):
            glyphes.append((nom, x))
            x += avance + INTERLETTRAGE
    return glyphes, pil, x


def boite_encre(p: Police, glyphes, pil):
    x0 = min(x + p.boite(n)[0] for n, x in glyphes)
    x1 = max(x + p.boite(n)[2] for n, x in glyphes)
    haut = min(-p.boite(n)[3] for n, _ in glyphes)
    bas = max(-p.boite(n)[1] for n, _ in glyphes)
    if pil:
        x0, x1 = min(x0, pil[0]), max(x1, pil[0] + PILULE_L)
        haut = min(haut, pil[1])
    return x0, haut, x1, bas


# ---------------------------------------------------------------------------
# Logo
# ---------------------------------------------------------------------------
MOT = ["k", "i", "v", "ı", "en"]


def svg_logo(p: Police, encre: str, point: str, fond: str | None, marge: float = 0) -> str:
    glyphes, pil, _ = composer(p, MOT)
    mot = " ".join(p.chemin(n, x, 0) for n, x in glyphes)
    x0, haut, x1, bas = boite_encre(p, glyphes, pil)
    vb = (x0 - marge, haut - marge, x1 - x0 + 2 * marge, bas - haut + 2 * marge)
    fond_svg = (
        f'<rect x="{vb[0]:.2f}" y="{vb[1]:.2f}" width="{vb[2]:.2f}" height="{vb[3]:.2f}" fill="{fond}"/>' if fond else ""
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.2f} {vb[1]:.2f} {vb[2]:.2f} {vb[3]:.2f}" '
        f'role="img" aria-label="Kivien">{fond_svg}'
        f'<path fill="{encre}" d="{mot}"/><path fill="{point}" d="{pilule(pil[0], pil[1], PILULE_L, PILULE_H)}"/></svg>\n'
    )


# ---------------------------------------------------------------------------
# Monogramme « ki » et favicon « k »
# ---------------------------------------------------------------------------
def chemins_monogramme(p: Police, cote: float, taille: float):
    """« k » + « ı » à pilule, boîte inline-flex (line-height 1) centrée dans le carré."""
    glyphes, pil, largeur = composer(p, ["k", "ı"])
    em = taille / UPM
    gauche = (cote - largeur * em) / 2
    base = (cote - taille) / 2 + BASE * em
    k = " ".join(p.chemin(n, gauche + x * em, base, em) for n, x in glyphes)
    pil_svg = pilule(gauche + pil[0] * em, base + pil[1] * em, PILULE_L * em, PILULE_H * em)
    # Distance maximale de l'encre au centre (pour le cercle sûr Android)
    x0, haut, x1, bas = boite_encre(p, glyphes, pil)
    coins = [(gauche + x * em, base + y * em) for x in (x0, x1) for y in (haut, bas)]
    dist = max(math.hypot(cx - cote / 2, cy - cote / 2) for cx, cy in coins)
    return k, pil_svg, dist


def svg_monogramme(p: Police, cote: int = 1024, fond=PIMENT, encre=CREME, echelle_contenu: float = 1.0):
    taille = 168 / 256 * cote * echelle_contenu
    k, pil, dist = chemins_monogramme(p, cote, taille)
    fond_svg = f'<rect width="{cote}" height="{cote}" fill="{fond}"/>' if fond else ""
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cote} {cote}" role="img" aria-label="Kivien">'
        f'{fond_svg}<path fill="{encre}" d="{k} {pil}"/></svg>\n'
    )
    return svg, dist


def svg_favicon(p: Police, cote: int = 32, fond=PIMENT, encre=CREME, rayon: float = 6) -> str:
    """Charte : « k » de 28 px dans 32 px, line-height 1, margin-top -4 px, centré.

    Chromium arrondit ascendante et descendante au pixel : à 28 px, la ligne de base tombe à
    23 px du haut de la boîte (et non 23,24). On garde cet arrondi, conçu pour 32 px.
    """
    k = cote / 32
    taille = 28 * k
    em = taille / UPM
    (nom_k, avance_k), = p.mettre_en_forme("k")
    gauche = (cote - avance_k * em) / 2
    # Boîte de 28 px, marge haute -4 : boîte marge de 24 px centrée → haut de la boîte à 0.
    haut = (cote - (taille - 4 * k)) / 2 - 4 * k
    demi_interligne = (taille - (round(ASCENDANTE * 28 / UPM) + round(DESCENDANTE * 28 / UPM)) * k) / 2
    base = haut + demi_interligne + round(ASCENDANTE * 28 / UPM) * k
    chemin = p.chemin(nom_k, gauche, base, em)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cote} {cote}" role="img" aria-label="Kivien">'
        f'<rect width="{cote}" height="{cote}" rx="{rayon * k:.2f}" fill="{fond}"/>'
        f'<path fill="{encre}" d="{chemin}"/></svg>\n'
    )


# Positions mesurées dans Chromium sur la charte (logo à 176 px), en unités de police.
MESURES_CHROMIUM = {"k": 0.0, "i": 489.08, "v": 671.16, "dotlessi": 1171.16, "e": 1368.16, "n": 1862.75}
PILULE_CHROMIUM = (1142.22, -740.07)


def controle(p: Police) -> None:
    """Vérifie la composition contre les mesures de Chromium (écart toléré : 1 unité)."""
    glyphes, pil, _ = composer(p, MOT)
    ecarts = [abs(x - MESURES_CHROMIUM[n]) for n, x in glyphes]
    ecarts += [abs(pil[0] - PILULE_CHROMIUM[0]), abs(pil[1] - PILULE_CHROMIUM[1])]
    print(f"écart maximal avec Chromium : {max(ecarts):.2f} unité(s) sur 1000")
    assert max(ecarts) < 1, "la composition ne correspond plus au rendu de la charte"


def main() -> None:
    SORTIE.mkdir(parents=True, exist_ok=True)
    for ancien in SORTIE.glob("*.svg"):
        ancien.unlink()
    maitre = Police(opsz=96)  # tracé maître du logo et du monogramme
    favicon = Police(opsz=28)  # favicon : taille optique automatique à 28 px
    controle(maitre)
    # Versions sur fond : le fond inclut la zone de protection (hauteur du « n »).
    b_n = maitre.boite(maitre.cmap[ord("n")])
    zone = b_n[3] - b_n[1]
    monogramme, dist = svg_monogramme(maitre)
    echelle_android = min(1.0, RAYON_SUR_ANDROID / dist)
    avant_plan, dist_a = svg_monogramme(maitre, fond=None, echelle_contenu=echelle_android)
    monochrome, _ = svg_monogramme(maitre, fond=None, encre="#FFFFFF", echelle_contenu=echelle_android)
    print(f"monogramme : encre à {dist:.0f} px du centre ; Android réduit à {echelle_android:.3f} ({dist_a:.0f} px)")
    fichiers = {
        "logo-pilule-piment.svg": svg_logo(maitre, BASALTE, PIMENT, None),
        "logo-pilule-basalte.svg": svg_logo(maitre, BASALTE, BASALTE, None),
        "logo-creme-sur-piment.svg": svg_logo(maitre, CREME, CREME, PIMENT, zone),
        "logo-creme-sur-basalte.svg": svg_logo(maitre, CREME, PIMENT, BASALTE, zone),
        "monogramme.svg": monogramme,
        "monogramme-avant-plan.svg": avant_plan,
        "monogramme-monochrome.svg": monochrome,
        "favicon.svg": svg_favicon(favicon),
    }
    for nom, contenu in fichiers.items():
        (SORTIE / nom).write_text(contenu, encoding="utf-8")
        print(nom)


if __name__ == "__main__":
    main()
