"""Ajoute « ≈ » (U+2248) aux polices Figtree, qui ne l'ont pas.

Sans ce glyphe, Android prend « ≈ » dans la police système, en graisse normale, au milieu
de « ≈ 63 € net » en 600. Le glyphe est un composite de deux tildes de la même graisse,
espacés verticalement et centrés sur le tilde d'origine.

Usage : python3 ajouter-approx.py assets/fonts/Figtree_*.ttf
"""
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

ECART = 0.13  # demi-écart vertical entre les deux tildes, en em


def ajouter(chemin: str) -> None:
    police = TTFont(chemin)
    cmap = police.getBestCmap()
    if 0x2248 in cmap:
        print(f"{chemin} : déjà présent")
        return
    tilde = cmap[0x7E]
    glyf = police["glyf"]
    upm = police["head"].unitsPerEm
    dy = round(ECART * upm)

    composite = Glyph()
    composite.numberOfContours = -1
    composite.components = []
    for decalage in (dy, -dy):
        c = GlyphComponent()
        c.glyphName = tilde
        c.x, c.y = 0, decalage
        c.flags = 0x0004  # ROUND_XY_TO_GRID
        composite.components.append(c)

    nom = "approxequal"
    ordre = police.getGlyphOrder() + [nom]
    police.setGlyphOrder(ordre)
    glyf.glyphs[nom] = composite
    glyf.glyphOrder = ordre
    police["hmtx"].metrics[nom] = police["hmtx"].metrics[tilde]
    for table in police["cmap"].tables:
        if table.isUnicode():
            table.cmap[0x2248] = nom
    police["maxp"].numGlyphs = len(ordre)
    composite.recalcBounds(glyf)

    police.save(chemin)
    pen = BoundsPen(police.getGlyphSet())
    police.getGlyphSet()[nom].draw(pen)
    print(f"{chemin} : ≈ ajouté {pen.bounds}")


if __name__ == "__main__":
    for chemin in sys.argv[1:]:
        ajouter(chemin)
