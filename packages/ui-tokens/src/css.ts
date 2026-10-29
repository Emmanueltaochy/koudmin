import {
  animations,
  couleurs,
  dimensions,
  espaces,
  polices,
  rayons,
  typo,
  type StyleTexte,
} from './index';

const kebab = (s: string) => s.replace(/[A-Z0-9]+/g, (m) => '-' + m.toLowerCase());

/** Variables CSS de la charte, pour le site restaurateur. */
export function tokensCss(): string {
  const l: string[] = [];
  for (const [nom, val] of Object.entries(couleurs)) l.push(`--k-${kebab(nom)}: ${val};`);
  l.push(`--k-font-titre: ${polices.titre.web};`, `--k-font-texte: ${polices.texte.web};`);
  for (const [nom, s] of Object.entries(typo) as [string, StyleTexte][]) {
    const p = `--k-${kebab(nom)}`;
    l.push(
      `${p}-font: ${s.graisse} ${s.taille}px/${s.interligne}px var(--k-font-${s.famille});`,
      `${p}-ls: ${s.interlettrage}em;`,
    );
  }
  for (const [nom, val] of Object.entries(rayons)) l.push(`--k-rayon-${kebab(nom)}: ${val}px;`);
  for (const [nom, val] of Object.entries(espaces)) l.push(`--k-${nom}: ${val}px;`);
  for (const [nom, val] of Object.entries(dimensions)) l.push(`--k-${kebab(nom)}: ${val}px;`);
  l.push(
    `--k-spinner: ${animations.spinnerMs}ms;`,
    `--k-squelette: ${animations.squeletteMs}ms;`,
    `--k-ombre-carte: 0 1px 0 ${couleurs.trait};`,
  );
  return `/* Généré par @koudmin/ui-tokens : ne pas modifier à la main. */\n:root {\n${l.map((x) => '  ' + x).join('\n')}\n}\n`;
}
