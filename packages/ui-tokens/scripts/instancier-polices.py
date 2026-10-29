"""Fige Bricolage Grotesque (police variable) en instances statiques pour React Native.

Le web utilise la police variable avec `font-optical-sizing: auto` : la taille optique suit
la taille du texte. React Native ne gère pas les axes variables ; on génère donc une instance
par couple (graisse, taille) utilisé dans la charte, avec opsz = taille du texte.

Usage : python3 instancier-polices.py <dossier de sortie>
"""
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

SOURCE = Path(__file__).resolve().parent.parent / "polices" / "BricolageGrotesque-variable-latin.woff2"

# (graisse, taille) — doit suivre `typo` dans src/index.ts (familles « titre »).
INSTANCES = [(700, 56), (700, 32), (600, 22), (700, 22)]


def main(sortie: Path) -> None:
    sortie.mkdir(parents=True, exist_ok=True)
    for graisse, taille in INSTANCES:
        police = TTFont(SOURCE)
        instance = instantiateVariableFont(
            police, {"wght": graisse, "opsz": taille, "wdth": 100}, updateFontNames=False
        )
        instance.flavor = None
        nom = f"BricolageGrotesque-{graisse}-{taille}"
        instance["name"].setName(nom, 1, 3, 1, 0x409)
        instance["name"].setName(nom, 4, 3, 1, 0x409)
        instance["name"].setName(nom, 6, 3, 1, 0x409)
        instance.save(sortie / f"{nom}.ttf")
        print(nom)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
