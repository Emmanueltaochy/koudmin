import { StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import Pencil from 'lucide-react-native/icons/pencil';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirmationExtra, textes as t, type EtatMission } from '@kivien/core';
import { BoutonPrincipal, Lien } from '../ui/Bouton';
import { couleurs, dimensions, rayons } from '../ui/theme';
import { Texte } from '../ui/Texte';

const td = t.extra.detail;

/** Barre d'action en bas du détail, selon l'état de la mission. */
export function BarreAction({
  etat,
  debut,
  quand,
  onMiLeLa,
  onSigner,
  onDesister,
}: {
  etat: EtatMission;
  debut: number;
  quand: string;
  onMiLeLa: () => void;
  onSigner: () => void;
  onDesister: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.barre, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      {etat.nom === 'idle' && etat.erreurReseau && (
        <Texte variante="legendeForte" couleur="braise" style={styles.centre} accessibilityLiveRegion="polite">
          {t.extra.missions.horsLigneTitre}
        </Texte>
      )}

      {(etat.nom === 'idle' || etat.nom === 'sending' || etat.nom === 'taken') && (
        <BoutonPrincipal
          libelle={etat.nom === 'sending' ? td.envoi : td.miLeLa}
          onPress={onMiLeLa}
          envoi={etat.nom === 'sending'}
          desactive={etat.nom === 'taken'}
          hauteur={dimensions.boutonMiLeLa}
          variante="miLeLa"
        />
      )}

      {etat.nom === 'done' && (
        <>
          <View style={styles.bandeau} accessibilityLiveRegion="polite">
            <Check size={20} color={couleurs.blanc} strokeWidth={2.5} />
            <Texte variante="corpsFort" couleur="blanc" style={styles.flex}>
              {confirmationExtra(debut, quand)}
            </Texte>
          </View>
          <BoutonPrincipal
            libelle={td.signer}
            onPress={onSigner}
            icone={<Pencil size={18} color={couleurs.blanc} strokeWidth={2} />}
          />
        </>
      )}

      <Texte variante="legendeForte" style={styles.centre}>
        {td.regleAbsence}
      </Texte>

      {etat.nom === 'done' && (
        <Lien libelle={td.nePlusVenir} onPress={onDesister} variante="legende" couleur="galet" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barre: {
    backgroundColor: couleurs.blanc,
    borderTopWidth: 1,
    borderTopColor: couleurs.trait,
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  centre: { textAlign: 'center' },
  flex: { flex: 1 },
  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: couleurs.vacoa,
    borderRadius: rayons.carte,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
