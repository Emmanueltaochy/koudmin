import { ImageBackground, StyleSheet, View } from 'react-native';
import { dureeMinutes, formatNet, salaireMission, textesEcrans, type MissionResume } from '@kivien/core';
import { couleurs } from '../ui/theme';
import { Texte } from '../ui/Texte';

const tb = textesEcrans.extra.bandeau;

/** Haut de la liste : photo, nombre de missions proches et meilleure paie du moment. */
export function Bandeau({ missions }: { missions: MissionResume[] }) {
  const meilleur = Math.max(0, ...missions.map((m) => salaireMission(dureeMinutes(m.debut, m.fin) ?? 0, m.tauxHoraireBrutCentimes).netEuros));
  return (
    <ImageBackground source={require('../../assets/visuels/bandeau.jpg')} style={styles.photo} imageStyle={styles.image} resizeMode="cover">
      <View style={styles.voile}>
        <Texte variante="sousTitre" style={styles.blanc}>
          {tb.titre(missions.length)}
        </Texte>
        <Texte style={styles.blanc}>{tb.texte}</Texte>
        {meilleur > 0 && (
          <View style={styles.pastille}>
            <Texte variante="legendeForte">{tb.jusqua(formatNet(meilleur))}</Texte>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  photo: { borderRadius: 20, overflow: 'hidden', marginBottom: 24, minHeight: 190 },
  image: { borderRadius: 20 },
  voile: { flex: 1, justifyContent: 'flex-end', gap: 6, padding: 20, backgroundColor: 'rgba(33, 28, 24, 0.55)' },
  blanc: { color: couleurs.blanc },
  pastille: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: couleurs.curcuma, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
});
