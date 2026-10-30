import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ban from 'lucide-react-native/icons/ban';
import Check from 'lucide-react-native/icons/check';
import Pencil from 'lucide-react-native/icons/pencil';
import {
  etiquetteJour,
  formatPlage,
  jourMoisCourt,
  LIBELLES_POSTE,
  textesEcrans,
  type JourISO,
} from '@kivien/core';
import type { MissionConfirmee } from '../donnees';
import { commun, couleurs, rayons } from '../ui/theme';
import { Texte } from '../ui/Texte';
import { VignettePoste } from '../ui/VignettePoste';

const tc = textesEcrans.extra.contrat;
const te = textesEcrans.extra;

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
  // Annulée par l'entreprise : carte grisée, sans action, jusqu'à l'heure de fin prévue.
  if (m.annulee) {
    return (
      <View style={[commun.carte, styles.annulee]} accessibilityLabel={`${formatPlage(m.debut, m.fin)}, ${m.restaurant}. ${te.missionAnnulee}`}>
        <View style={styles.entete}>
          <View style={styles.titre}>
            <VignettePoste poste={m.poste} taille={40} />
            <Texte variante="horaire" couleur="galet" style={styles.barre}>
              {formatPlage(m.debut, m.fin)}
            </Texte>
          </View>
          <Texte variante="legendeForte" couleur="galet">
            {jour.texte}
          </Texte>
        </View>
        <Texte couleur="galet">
          {LIBELLES_POSTE[m.poste].mission} · {m.restaurant}
        </Texte>
        <View style={styles.pied}>
          <Ban size={16} color={couleurs.braise} strokeWidth={2} />
          <View style={styles.texteAnnule}>
            <Texte variante="legendeForte" couleur="braise">
              {te.missionAnnulee}
            </Texte>
            <Texte variante="legende" couleur="galet">
              {te.missionAnnuleeAide}
            </Texte>
          </View>
        </View>
      </View>
    );
  }
  // Terminée : grisée, toujours ouvrable pour revoir le contrat.
  if (m.passee) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${formatPlage(m.debut, m.fin)}, ${m.restaurant}. ${te.missionPassee}`}
        onPress={() => onPress(m.id)}
        style={({ pressed }) => [commun.carte, styles.annulee, pressed && { opacity: 0.5 }]}
      >
        <View style={styles.entete}>
          <View style={styles.titre}>
            <VignettePoste poste={m.poste} taille={40} />
            <Texte variante="horaire" couleur="galet">
              {formatPlage(m.debut, m.fin)}
            </Texte>
          </View>
          <Texte variante="legendeForte" couleur="galet">
            {jourMoisCourt(m.jour)}
          </Texte>
        </View>
        <Texte couleur="galet">
          {LIBELLES_POSTE[m.poste].mission} · {m.restaurant}
        </Texte>
        <View style={styles.pied}>
          <Check size={16} color={couleurs.galet} strokeWidth={2.5} />
          <Texte variante="legendeForte" couleur="galet">
            {te.missionPassee}
          </Texte>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(m.id)} style={({ pressed }) => [commun.carte, pressed && { opacity: 0.85 }]}>
      <View style={styles.entete}>
        <View style={styles.titre}>
          <VignettePoste poste={m.poste} taille={40} />
          <Texte variante="horaire">{formatPlage(m.debut, m.fin)}</Texte>
        </View>
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
  titre: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  annulee: { opacity: 0.6, backgroundColor: couleurs.creme },
  barre: { textDecorationLine: 'line-through' },
  texteAnnule: { flexShrink: 1, gap: 2 },
  badge: { backgroundColor: couleurs.curcuma, borderRadius: rayons.champ, paddingVertical: 4, paddingHorizontal: 8 },
  pied: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: couleurs.trait },
});
