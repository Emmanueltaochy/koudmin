import { SvgXml } from 'react-native-svg';
import { LOGO_RATIO, LOGO_SVG } from './logoSvg';

/** Logo « kivien », pilule basalte (version application). 80 px de large minimum (charte). */
export function Logo({ largeur = 80 }: { largeur?: number }) {
  const l = Math.max(largeur, 80);
  return <SvgXml xml={LOGO_SVG} width={l} height={l / LOGO_RATIO} accessibilityLabel="Kivien" accessibilityRole="image" />;
}
