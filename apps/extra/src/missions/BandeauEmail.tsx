import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Mail from 'lucide-react-native/icons/mail';
import { textesEcrans } from '@kivien/core';
import { source } from '../donnees';
import { couleurs, rayons } from '../ui/theme';
import { Texte } from '../ui/Texte';

const te = textesEcrans.extra.email;

/** Sans adresse e-mail confirmée, pas d'alerte de mission : on invite à l'ajouter (onglet Profil). */
export function BandeauEmail() {
  const [etat, setEtat] = useState<{ email: string | null; enAttente: string | null } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let actif = true;
      source
        .emailDuCompte()
        .then((e) => actif && setEtat(e))
        .catch(() => undefined);
      return () => {
        actif = false;
      };
    }, []),
  );
  if (!etat || (etat.email && !etat.enAttente)) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/profil')}
      style={styles.bandeau}
    >
      <Mail size={20} color={couleurs.basalte} strokeWidth={2} />
      <View style={styles.textes}>
        <Texte variante="corpsFort">
          {etat.enAttente ? te.bandeauConfirmer(etat.enAttente) : te.bandeauAjouter}
        </Texte>
        {!etat.enAttente && (
          <Texte variante="legendeForte" style={styles.lien}>
            {te.bandeauAction}
          </Texte>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bandeau: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.curcuma,
  },
  textes: { flex: 1, gap: 4 },
  lien: { textDecorationLine: 'underline' },
});
