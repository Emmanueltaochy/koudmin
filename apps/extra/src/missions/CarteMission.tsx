import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Bus from 'lucide-react-native/icons/bus';
import Check from 'lucide-react-native/icons/check';
import MapPin from 'lucide-react-native/icons/map-pin';
import {
  dureeMinutes,
  etiquetteJour,
  formatDistance,
  formatNet,
  formatPlage,
  legendeBrut,
  LIBELLES_POSTE,
  ligneRetour,
  salaireMission,
  type JourISO,
  type MissionResume,
  type ProfilExtra,
} from '@koudmin/core';
import { commun, couleurs, rayons } from '../ui/theme';
import { Texte } from '../ui/Texte';

type Props = {
  mission: MissionResume;
  profil: ProfilExtra;
  aujourdhui: JourISO;
  onPress: (id: string) => void;
};

/** Carte mission. Ordre imposé : horaire, lieu, poste, salaire, restaurant, retour. */
export const CarteMission = memo(function CarteMission({ mission: m, profil, aujourdhui, onPress }: Props) {
  const salaire = salaireMission(dureeMinutes(m.debut, m.fin) ?? 0, m.tauxHoraireBrutCentimes);
  const jour = etiquetteJour(m.jour, m.debut, aujourdhui);
  const retour = ligneRetour(m, profil);
  const plage = formatPlage(m.debut, m.fin);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plage}, ${jour.texte}, ${m.commune}, ${LIBELLES_POSTE[m.poste].mission}, ${formatNet(salaire.netEuros)}`}
      onPress={() => onPress(m.id)}
      style={({ pressed }) => [commun.carte, pressed && styles.appuye]}
    >
      <View style={styles.entete}>
        <Texte variante="horaire">{plage}</Texte>
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

      <View style={styles.lieu}>
        <MapPin size={18} color={couleurs.galet} strokeWidth={2} />
        <Texte variante="corpsFort" style={styles.commune} numberOfLines={1}>
          {m.commune}
        </Texte>
        <Texte couleur="galet">· {formatDistance(m.distanceMetres)}</Texte>
      </View>

      <Texte>{LIBELLES_POSTE[m.poste].mission}</Texte>

      <View style={styles.salaire}>
        <Texte variante="corpsFort">{formatNet(salaire.netEuros)}</Texte>
        <Texte variante="legende" couleur="galet">
          {legendeBrut(salaire.brutCentimes)}
        </Texte>
      </View>

      <Texte variante="legende" couleur="galet">
        {m.restaurant}
      </Texte>

      {retour.type === 'assure' && (
        <View style={styles.retour}>
          <Check size={16} color={couleurs.vacoa} strokeWidth={2.5} />
          <Texte variante="legendeForte" couleur="vacoa">
            {retour.texte}
          </Texte>
        </View>
      )}
      {retour.type === 'bus' && (
        <View style={styles.retour}>
          <Bus size={16} color={couleurs.galet} strokeWidth={2} />
          <Texte variante="legende" couleur="galet">
            {retour.texte}
          </Texte>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  appuye: { opacity: 0.85 },
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: couleurs.curcuma,
    borderRadius: rayons.champ,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  lieu: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commune: { flexShrink: 1 },
  salaire: { paddingTop: 8, borderTopWidth: 1, borderTopColor: couleurs.trait },
  retour: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
