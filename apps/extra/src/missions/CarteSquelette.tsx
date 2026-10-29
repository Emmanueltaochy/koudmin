import { StyleSheet, View } from 'react-native';
import { commun, couleurs, rayons } from '../ui/theme';
import { Pulse } from '../ui/Pulse';

export function CarteSquelette() {
  return (
    <Pulse style={[commun.carte, styles.carte]}>
      <View style={[styles.bloc, { width: '55%', height: 24 }]} />
      <View style={[styles.bloc, { width: '70%' }]} />
      <View style={styles.ligne}>
        <View style={[styles.bloc, { width: '30%' }]} />
        <View style={[styles.bloc, { width: '25%' }]} />
      </View>
    </Pulse>
  );
}

const styles = StyleSheet.create({
  carte: { gap: 12, borderBottomWidth: 0 },
  bloc: { height: 16, borderRadius: rayons.champ, backgroundColor: couleurs.creme },
  ligne: { flexDirection: 'row', justifyContent: 'space-between' },
});
