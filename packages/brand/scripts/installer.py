"""Assemble favicon.ico et copie les icônes dans les apps.

Usage (après generer.py et rasteriser.cjs) : python3 installer.py
"""
import shutil
from pathlib import Path

from PIL import Image

BRAND = Path(__file__).resolve().parents[1]
RACINE = BRAND.parents[1]
PNG, SVG = BRAND / "png", BRAND / "svg"
EXTRA = RACINE / "apps/extra/assets"
RESTO = RACINE / "apps/resto/public/brand"


def main() -> None:
    # favicon.ico : 16, 32 et 48 px, chacun rendu à sa taille (pas de réduction d'une grande image).
    images = [Image.open(PNG / f"favicon-{t}.png").convert("RGBA") for t in (48, 32, 16)]
    images[0].save(BRAND / "png/favicon.ico", sizes=[(48, 48), (32, 32), (16, 16)], append_images=images[1:])

    copies = {
        PNG / "icon-1024.png": EXTRA / "icon.png",
        PNG / "android-avant-plan-1024.png": EXTRA / "android-icon-foreground.png",
        PNG / "android-monochrome-1024.png": EXTRA / "android-icon-monochrome.png",
        PNG / "favicon-48.png": EXTRA / "favicon.png",
        PNG / "favicon.ico": RESTO / "favicon.ico",
        SVG / "favicon.svg": RESTO / "icon.svg",
        PNG / "apple-icon-180.png": RESTO / "apple-icon.png",
        SVG / "logo-pilule-basalte.svg": RESTO / "logo-pilule-basalte.svg",
        SVG / "logo-pilule-piment.svg": RESTO / "logo-pilule-piment.svg",
        SVG / "monogramme.svg": RESTO / "monogramme.svg",
    }
    RESTO.mkdir(parents=True, exist_ok=True)
    for source, cible in copies.items():
        shutil.copyfile(source, cible)
        print(f"{source.relative_to(RACINE)} → {cible.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
