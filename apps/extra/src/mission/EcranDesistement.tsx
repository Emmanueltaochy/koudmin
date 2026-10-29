import { Pressable, StyleSheet, View } from 'react-native';
import CalendarX from 'lucide-react-native/icons/calendar-x';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPlage, questionDesistement, textes as t, type MissionResume } from '@kivien/core';
import { BoutonPrincipal, Lien } from '../ui/Bouton';
import { couleurs, rayons } from '../ui/theme';
import { Texte } from '../ui/Texte';

const tds = t.extra.desistement;

/** 3e · Désistement, plein écran. Le retour et « Annuler » ramènent à la mission confirmée. */
export function EcranDesistement({
  mission: m,
  quand,
  envoi,
  erreurReseau,
  onConfirmer,
  onAnnuler,
}: {
  mission: MissionResume;
  quand: string;
  envoi: boolean;
  erreurReseau: boolean;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.ecran}>
      <View style={[styles.entete, { paddingTop: insets.top + 4 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tds.annuler}
          onPress={onAnnuler}
          disabled={envoi}
          style={styles.retour}
        >
          <ChevronLeft size={24} color={couleurs.basalte} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.contenu}>
        <View style={styles.icone}>
          <CalendarX size={28} color={couleurs.basalte} strokeWidth={1.75} />
        </View>
        <Texte variante="titre" accessibilityRole="header">
          {questionDesistement(quand)}
        </Texte>
        <View style={styles.pilule}>
          <Texte variante="corpsFort">
            {formatPlage(m.debut, m.fin)} · {m.restaurant}
          </Texte>
        </View>
        <Texte couleur="galet">{tds.info}</Texte>
      </View>

      <View style={[styles.barre, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        {erreurReseau && (
          <Texte variante="legendeForte" couleur="braise" style={styles.centre} accessibilityLiveRegion="polite">
            {t.extra.missions.horsLigneTitre}
          </Texte>
        )}
        <BoutonPrincipal libelle={tds.confirmer} onPress={onConfirmer} envoi={envoi} />
        <Lien libelle={tds.annuler} onPress={onAnnuler} desactive={envoi} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: couleurs.creme },
  entete: { paddingHorizontal: 8, paddingBottom: 4 },
  retour: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  contenu: { flex: 1, paddingHorizontal: 16, paddingVertical: 32, gap: 16 },
  icone: {
    width: 56,
    height: 56,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.blanc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilule: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.blanc,
    borderWidth: 1,
    borderColor: couleurs.basalte,
  },
  barre: {
    backgroundColor: couleurs.blanc,
    borderTopWidth: 1,
    borderTopColor: couleurs.trait,
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  centre: { textAlign: 'center' },
});
