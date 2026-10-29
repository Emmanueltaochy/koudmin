import { StyleSheet, type TextStyle } from 'react-native';
import {
  couleurs,
  espaces,
  familleNative,
  interlettragePx,
  rayons,
  typo,
  type StyleTypo,
} from '@koudmin/ui-tokens';

export { couleurs, espaces, rayons, dimensions, animations, voile } from '@koudmin/ui-tokens';

/** Styles de texte de la charte, prêts pour React Native. Pas de fontWeight : la graisse est dans la police. */
export const textes = StyleSheet.create(
  Object.fromEntries(
    (Object.keys(typo) as StyleTypo[]).map((nom) => {
      const s = typo[nom];
      const style: TextStyle = {
        fontFamily: familleNative(s),
        fontSize: s.taille,
        lineHeight: s.interligne,
        letterSpacing: interlettragePx(s),
        color: couleurs.basalte,
      };
      return [nom, style];
    }),
  ) as Record<StyleTypo, TextStyle>,
);

export const commun = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  carte: {
    backgroundColor: couleurs.blanc,
    borderRadius: rayons.carte,
    padding: espaces.s16,
    gap: espaces.s8,
    // Ombre « 0 1px 0 trait » : une ligne pleine sous la carte, sans flou.
    borderBottomWidth: 1,
    borderBottomColor: couleurs.trait,
  },
  ligne: { flexDirection: 'row', alignItems: 'center' },
});
