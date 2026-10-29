import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import Pencil from 'lucide-react-native/icons/pencil';
import {
  etiquetteJour,
  formatPlage,
  LIBELLES_POSTE,
  textesEcrans,
  type JourISO,
} from '@koudmin/core';
import type { MissionConfirmee } from '../donnees';
import { commun, couleurs, rayons } from '../ui/theme';
import { Texte } from '../ui/Texte';

const tc = textesEcrans.extra.contrat;

/** Mission confirmée : horaire, lieu, et l'étape suivante (contrat à signer ou signé). */
export const CarteConfirmee = memo(function CarteConfirmee({
  mission: m,
  aujourdhui,
  onPress,
}: {
  mission: MissionConfirmee;
  aujourdhui: JourISO;
  onPress: (id: string) => void;
}) {
  const jour = etiquetteJour(m.jour, m.debut, aujourdhui);
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(m.id)} style={({ pressed }) => [commun.carte, pressed && { opacity: 0.85 }]}>
      <View style={styles.entete}>
        <Texte variante="horaire">{formatPlage(m.debut, m.fin)}</Texte>
        {jour.urgent ? (
          <View style={styles.badge}>
            <Texte variante="badge">{jour.texte}</Texte>
          </View>
        ) : (
          <Texte variante="legendeForte" couleur="galet">
            {jour.texte}
          </Texte>
        )}
      </View>
      <Texte>
        {LIBELLES_POSTE[m.poste].mission} · {m.restaurant}
      </Texte>
      <View style={styles.pied}>
        {m.contratSigne ? (
          <>
            <Check size={16} color={couleurs.vacoa} strokeWidth={2.5} />
            <Texte variante="legendeForte" couleur="vacoa">
              {tc.signeCourt}
            </Texte>
          </>
        ) : (
          <>
            <Pencil size={16} color={couleurs.basalte} strokeWidth={2} />
            <Texte variante="legendeForte">{tc.aSigner}</Texte>
          </>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: couleurs.curcuma, borderRadius: rayons.champ, paddingVertical: 4, paddingHorizontal: 8 },
  pied: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: couleurs.trait },
});
