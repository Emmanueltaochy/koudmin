import { Text, type TextProps } from 'react-native';
import type { Couleur, StyleTypo } from '@kivien/ui-tokens';
import { couleurs, textes } from './theme';

type Props = TextProps & { variante?: StyleTypo; couleur?: Couleur };

export function Texte({ variante = 'corps', couleur, style, ...props }: Props) {
  return (
    <Text
      {...props}
      style={[textes[variante], couleur && { color: couleurs[couleur] }, style]}
      maxFontSizeMultiplier={1.6}
    />
  );
}
