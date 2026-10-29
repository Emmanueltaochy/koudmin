import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Couleur } from '@koudmin/ui-tokens';
import { BoutonPrincipal } from './Bouton';
import { couleurs, rayons } from './theme';
import { Texte } from './Texte';

/** État plein écran : icône dans un carré blanc 56, titre, texte, bouton piment. */
export function EtatPlein(p: {
  icone: ReactNode;
  titre: string;
  couleurTitre?: Couleur;
  texte: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.conteneur}>
      <View style={styles.icone}>{p.icone}</View>
      <Texte variante="sousTitre" couleur={p.couleurTitre} accessibilityRole="header">
        {p.titre}
      </Texte>
      <Texte couleur="galet">{p.texte}</Texte>
      <View style={styles.action}>
        <BoutonPrincipal libelle={p.action} onPress={p.onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, justifyContent: 'center', gap: 16, paddingHorizontal: 32, paddingBottom: 64 },
  icone: {
    width: 56,
    height: 56,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.blanc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: { marginTop: 8 },
});
