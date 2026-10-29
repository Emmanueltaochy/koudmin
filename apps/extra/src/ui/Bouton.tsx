import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleTypo } from '@koudmin/ui-tokens';
import { Spinner } from './Spinner';
import { couleurs, dimensions, rayons } from './theme';
import { Texte } from './Texte';

type PropsPrincipal = {
  libelle: string;
  onPress: () => void;
  icone?: ReactNode;
  /** Envoi en cours : piment foncé, spinner, appuis ignorés (pas de double envoi). */
  envoi?: boolean;
  /** Désactivé : fond creme, texte galet (ex. mission déjà prise). */
  desactive?: boolean;
  hauteur?: number;
  variante?: StyleTypo;
};

/** Bouton principal piment. Un seul par écran. Appuyé : piment foncé (équivalent du survol). */
export function BoutonPrincipal({
  libelle,
  onPress,
  icone,
  envoi = false,
  desactive = false,
  hauteur = dimensions.boutonPrincipal,
  variante = 'bouton',
}: PropsPrincipal) {
  const inactif = envoi || desactive;
  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={inactif}
      aria-busy={envoi}
      disabled={inactif}
      onPress={onPress}
      style={({ pressed }) => [
        styles.principal,
        { height: hauteur },
        {
          backgroundColor: desactive
            ? couleurs.creme
            : envoi || pressed
              ? couleurs.pimentFonce
              : couleurs.piment,
        },
      ]}
    >
      {envoi ? <Spinner couleur={couleurs.blanc} /> : icone}
      <Texte
        variante={envoi ? 'bouton' : variante}
        couleur={desactive ? 'galet' : 'blanc'}
      >
        {libelle}
      </Texte>
    </Pressable>
  );
}

/** Bouton secondaire : contour basalte, fond transparent, hauteur 48. */
export function BoutonSecondaire({
  libelle,
  onPress,
  icone,
}: {
  libelle: string;
  onPress: () => void;
  icone?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.secondaire, pressed && { backgroundColor: couleurs.creme }]}
    >
      {icone}
      <Texte variante="bouton">{libelle}</Texte>
    </Pressable>
  );
}

/** Lien texte souligné (« Itinéraire », « Annuler », « Je ne peux plus venir »). */
export function Lien({
  libelle,
  onPress,
  variante = 'bouton',
  couleur = 'pimentFonce',
  icone,
  desactive = false,
}: {
  libelle: string;
  onPress: () => void;
  variante?: StyleTypo;
  couleur?: 'pimentFonce' | 'galet';
  icone?: ReactNode;
  desactive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      aria-disabled={desactive}
      disabled={desactive}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.lien, (pressed || desactive) && { opacity: 0.6 }]}
    >
      <Texte variante={variante} couleur={couleur} style={styles.souligne}>
        {libelle}
      </Texte>
      {icone ? <View>{icone}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  principal: {
    borderRadius: rayons.carte,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaire: {
    flex: 1,
    minHeight: dimensions.boutonSecondaire,
    paddingVertical: 4,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.basalte,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // Pas de marge latérale, comme la maquette : « Appeler le restaurant » tient sur une ligne.
    paddingHorizontal: 4,
  },
  lien: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 20 },
  souligne: { textDecorationLine: 'underline' },
});
