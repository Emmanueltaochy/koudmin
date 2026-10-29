"""Logo Koudmin « Point pilule » : vectorisation et monogramme.

Reproduit la géométrie CSS des maquettes (design_handoff_koudmin) à partir de Bricolage
Grotesque figée en wght 700 / wdth 100, avec la mise en forme HarfBuzz (crénage identique
à Chromium). Toutes les cotes sont en unités de police (1 em = 1000).

Logo (composant « Koudmin Logo », taille ≥ 40 px) :
  - span inline-flex, line-height 1, interlettrage -0,045 em sur chaque caractère ;
  - « Koudm », « ı » (dans un inline-block), « n » : trois éléments flex, crénage
    uniquement à l'intérieur de « Koudm » ;
  - pilule 0,30 × 0,13 em, centrée sur la boîte du ı (avance + interlettrage),
    top 0,09 em sous le haut de la boîte de ligne.
  Avec ascendante 930 / descendante 270 (USE_TYPO_METRICS), la ligne de base est à
  0,83 em sous le haut de la boîte : la pilule va de 0,74 à 0,61 em au-dessus de la ligne de base.

Monogramme (section 1c du kit) : colonne flex, pilule 0,30 × 0,13 em (marge gauche 0,02 em,
marge basse 0,07 em) au-dessus d'un K en line-height 0,74 et interlettrage -0,04 em.
Favicon (section 1d) : K seul, 26 px dans 32 px, line-height 1, margin-top -1 px.

Usage : python3 generer.py   (écrit dans ../svg)
"""
import io
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

RACINE = Path(__file__).resolve().parents[3]
SOURCE = RACINE / "packages/ui-tokens/polices/BricolageGrotesque-variable-latin.woff2"
SORTIE = Path(__file__).resolve().parents[1] / "svg"

BASALTE, CREME, PIMENT = "#211C18", "#FBF6EE", "#C2401E"

# Encre du monogramme 1024 : ~390 × 611 px, soit une demi-diagonale de ~362 px.
# Le cercle sûr Android (66/108 de 1024) a un rayon de 313 px : on réduit à 0,83 (≈ 300 px).
ECHELLE_ADAPTATIVE = 0.83

ASCENDANTE, DESCENDANTE = 930, 270  # OS/2 typo, USE_TYPO_METRICS
UPM = 1000


class Police:
    """Bricolage figée à une taille optique donnée, avec mise en forme HarfBuzz."""

    def __init__(self, opsz: float):
        self.axes = {"wght": 700, "opsz": opsz, "wdth": 100}
        variable = TTFont(SOURCE)
        assert variable["head"].unitsPerEm == UPM
        self.ttf = instantiateVariableFont(variable, dict(self.axes))
        self.glyphes = self.ttf.getGlyphSet()
        self.cmap = self.ttf.getBestCmap()
        # HarfBuzz lit la police variable complète (en TTF, en mémoire) et applique les axes.
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
        return [
            (ordre[i.codepoint], p.x_advance)
            for i, p in zip(tampon.glyph_infos, tampon.glyph_positions)
        ]

    def chemin(self, nom: str, x: float, y_base: float, echelle: float = 1.0) -> str:
        """Tracé SVG du glyphe, origine en (x, y_base), axe y vers le bas."""
        stylo = SVGPathPen(self.glyphes, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        self.glyphes[nom].draw(TransformPen(stylo, (echelle, 0, 0, -echelle, x, y_base)))
        return stylo.getCommands()

    def boite(self, nom: str):
        from fontTools.pens.boundsPen import BoundsPen

        b = BoundsPen(self.glyphes)
        self.glyphes[nom].draw(b)
        return b.bounds


def pilule(x: float, y: float, l: float, h: float) -> str:
    r = h / 2
    return (
        f"M{x + r:.2f} {y:.2f}H{x + l - r:.2f}A{r:.2f} {r:.2f} 0 0 1 {x + l - r:.2f} {y + h:.2f}"
        f"H{x + r:.2f}A{r:.2f} {r:.2f} 0 0 1 {x + r:.2f} {y:.2f}Z"
    )


# ---------------------------------------------------------------------------
# Logo
# ---------------------------------------------------------------------------
def geometrie_logo(p: Police):
    """Chemins du mot et de la pilule, origine : début de la ligne de base."""
    ls = -0.045 * UPM
    x = 0.0
    mot = []
    for nom, avance in p.mettre_en_forme("Koudm"):
        mot.append(p.chemin(nom, x, 0))
        x += avance + ls
    nom_i = p.cmap[0x131]
    avance_i = p.ttf["hmtx"][nom_i][0]
    boite_i = avance_i + ls
    mot.append(p.chemin(nom_i, x, 0))
    centre_i = x + boite_i / 2
    x += boite_i
    (nom_n, avance_n), = p.mettre_en_forme("n")
    mot.append(p.chemin(nom_n, x, 0))
    x_n = x

    haut_boite = -(ASCENDANTE - (ASCENDANTE + DESCENDANTE - UPM) / 2)  # -830 : haut de la boîte de ligne
    l, h = 0.30 * UPM, 0.13 * UPM
    y_pilule = haut_boite + 0.09 * UPM
    droite = x_n + p.boite(nom_n)[2]
    return " ".join(mot), pilule(centre_i - l / 2, y_pilule, l, h), droite, (centre_i, y_pilule)


def svg_logo(p: Police, encre: str, point: str, fond: str | None, marge: float = 0) -> str:
    mot, pil, droite, _ = geometrie_logo(p)
    # Boîte d'encre serrée : de l'encre du K à celle du n, du haut de la pilule (ou des
    # ascendantes) au bas des lettres rondes, qui dépassent un peu sous la ligne de base.
    x0 = p.boite("K")[0]
    x1 = droite
    lettres = [p.cmap[ord(c)] for c in "Koudmn"] + [p.cmap[0x131]]
    haut = min(-0.74 * UPM, -max(p.boite(n)[3] for n in lettres))
    bas = -min(p.boite(n)[1] for n in lettres)
    vb = (x0 - marge, haut - marge, x1 - x0 + 2 * marge, bas - haut + 2 * marge)
    fond_svg = f'<rect x="{vb[0]:.2f}" y="{vb[1]:.2f}" width="{vb[2]:.2f}" height="{vb[3]:.2f}" fill="{fond}"/>' if fond else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.2f} {vb[1]:.2f} {vb[2]:.2f} {vb[3]:.2f}" '
        f'role="img" aria-label="Koudmin">{fond_svg}'
        f'<path fill="{encre}" d="{mot}"/><path fill="{point}" d="{pil}"/></svg>\n'
    )


# ---------------------------------------------------------------------------
# Monogramme et favicon
# ---------------------------------------------------------------------------
def geometrie_monogramme(p: Police, cote: float, taille: float, x_centre: float, y_centre: float):
    """K + pilule de la section 1c. `taille` : font-size (213 px pour un carré de 320)."""
    em = taille / UPM
    (nom_k, avance_k), = p.mettre_en_forme("K")
    largeur = max(0.32 * UPM, avance_k - 0.04 * UPM) * em
    hauteur = 0.94 * taille
    gauche = x_centre - largeur / 2
    haut = y_centre - hauteur / 2
    pil = pilule(gauche + 0.02 * taille, haut, 0.30 * taille, 0.13 * taille)
    # Boîte du K : line-height 0,74 → ligne de base à 0,74/2 - 1,2/2 + 0,93 = 0,70 em du haut.
    base = haut + 0.20 * taille + 0.70 * taille
    k = p.chemin(nom_k, gauche, base, em)
    return k, pil


def svg_monogramme(p: Police, cote: int = 1024, avec_pilule: bool = True, fond=PIMENT, encre=CREME,
                   rayon: float = 0, echelle_contenu: float = 1.0) -> str:
    taille = 213 / 320 * cote * echelle_contenu
    k, pil = geometrie_monogramme(p, cote, taille, cote / 2, cote / 2)
    fond_svg = f'<rect width="{cote}" height="{cote}" rx="{rayon}" fill="{fond}"/>' if fond else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cote} {cote}" role="img" aria-label="Koudmin">'
        f'{fond_svg}<path fill="{encre}" d="{k} {pil if avec_pilule else ""}"/></svg>\n'
    )


def svg_favicon(p: Police, cote: int = 32, fond=PIMENT, encre=CREME, rayon: float = 6) -> str:
    """Section 1d : K de 26 px dans 32 px, line-height 1, margin-top -1 px, centré."""
    k = cote / 32
    taille = 26 * k
    em = taille / UPM
    (nom_k, avance_k), = p.mettre_en_forme("K")
    gauche = (cote - avance_k * em) / 2
    boite_marge = taille - 1 * k
    haut = (cote - boite_marge) / 2 - 1 * k
    base = haut + 0.83 * taille
    chemin = p.chemin(nom_k, gauche, base, em)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cote} {cote}" role="img" aria-label="Koudmin">'
        f'<rect width="{cote}" height="{cote}" rx="{rayon * k:.2f}" fill="{fond}"/>'
        f'<path fill="{encre}" d="{chemin}"/></svg>\n'
    )


def main() -> None:
    SORTIE.mkdir(parents=True, exist_ok=True)
    maitre = Police(opsz=96)  # tracé maître du logo et du monogramme (≥ 110 px)
    petit = Police(opsz=26)   # favicon : K seul, dessiné pour 32 px dans la maquette
    # Versions sur fond : le fond inclut la zone de protection (hauteur du « o »).
    b_o = maitre.boite("o")
    zone = b_o[3] - b_o[1]
    fichiers = {
        "logo-pilule-piment.svg": svg_logo(maitre, BASALTE, PIMENT, None),
        "logo-pilule-basalte.svg": svg_logo(maitre, BASALTE, BASALTE, None),
        "logo-creme-sur-piment.svg": svg_logo(maitre, CREME, CREME, PIMENT, zone),
        "logo-creme-sur-basalte.svg": svg_logo(maitre, CREME, PIMENT, BASALTE, zone),
        "monogramme.svg": svg_monogramme(maitre),
        "favicon.svg": svg_favicon(petit),
        # Android, icône adaptative : avant-plan sans fond (le fond piment est dans app.json),
        # contenu réduit pour tenir dans le cercle sûr central (66 dp sur 108 dp).
        "monogramme-avant-plan.svg": svg_monogramme(maitre, fond=None, echelle_contenu=ECHELLE_ADAPTATIVE),
        "monogramme-monochrome.svg": svg_monogramme(maitre, fond=None, encre="#FFFFFF", echelle_contenu=ECHELLE_ADAPTATIVE),
    }
    for nom, contenu in fichiers.items():
        (SORTIE / nom).write_text(contenu, encoding="utf-8")
        print(nom)


if __name__ == "__main__":
    main()
