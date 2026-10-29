import { useCallback, useEffect } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import FileText from 'lucide-react-native/icons/file-text';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  aujourdhuiReunion,
  dateLongue,
  etiquetteJour,
  formatPlage,
  LIBELLES_POSTE,
  quandMission,
  textes as t,
} from '@koudmin/core';
import { demoAutorisee } from '../../donnees';
import { BarreAction } from '../../mission/BarreAction';
import { CarteInfos } from '../../mission/CarteInfos';
import { EcranDesistement } from '../../mission/EcranDesistement';
import { FeuillePrise } from '../../mission/FeuillePrise';
import { useDetailMission, type DemoDetail } from '../../mission/useDetailMission';
import { CarteSquelette } from '../../missions/CarteSquelette';
import { EtatPlein } from '../../ui/EtatPlein';
import { couleurs, rayons } from '../../ui/theme';
import { Texte } from '../../ui/Texte';

function retourListe() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function BoutonRetour({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onPress} style={styles.retour}>
      <ChevronLeft size={24} color={couleurs.basalte} strokeWidth={2} />
    </Pressable>
  );
}

export default function DetailMission() {
  const { id, demo } = useLocalSearchParams<{ id: string; demo?: DemoDetail }>();
  const d = useDetailMission(id, demoAutorisee(demo));
  const insets = useSafeAreaInsets();
  const aujourdhui = aujourdhuiReunion();
  const { etat, annulerDesistement } = d;

  // Mission libérée, commencée entre-temps ou disparue : retour à la liste, qui se met à jour.
  useEffect(() => {
    if (etat.nom === 'liberee' || d.expiree || d.chargement === 'introuvable') retourListe();
  }, [etat.nom, d.expiree, d.chargement]);

  // Bouton retour Android : sur le désistement, il vaut « Annuler » ; pendant l'envoi, il est bloqué.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      if (etat.nom === 'cancel') {
        annulerDesistement();
        return true;
      }
      return etat.nom === 'liberation';
    });
    return () => abonnement.remove();
  }, [etat.nom, annulerDesistement]);

  const signer = useCallback(() => router.push(`/contrat/${id}`), [id]);

  if (!d.mission) {
    return (
      <View style={[styles.ecran, { paddingTop: insets.top + 4 }]}>
        <View style={styles.entete}>
          <BoutonRetour onPress={retourListe} />
        </View>
        {d.chargement === 'horsLigne' ? (
          <EtatPlein
            icone={<WifiOff size={28} color={couleurs.braise} strokeWidth={1.75} />}
            titre={t.extra.missions.horsLigneTitre}
            couleurTitre="braise"
            texte={t.extra.missions.horsLigneTexte}
            action={t.extra.missions.horsLigneAction}
            onAction={() => void d.recharger()}
          />
        ) : (
          <View style={styles.squelettes}>
            <CarteSquelette />
            <CarteSquelette />
          </View>
        )}
      </View>
    );
  }

  const m = d.mission;
  const quand = quandMission(m.jour, m.debut, aujourdhui);
  const jour = etiquetteJour(m.jour, m.debut, aujourdhui);
  const plage = formatPlage(m.debut, m.fin);

  return (
    <View style={styles.ecran}>
      <View style={[styles.entete, { paddingTop: insets.top + 4 }]}>
        <BoutonRetour onPress={retourListe} />
        {jour.urgent ? (
          <View style={styles.badge}>
            <Texte variante="badge">{jour.texte}</Texte>
          </View>
        ) : (
          <Texte variante="legendeForte" couleur="galet" style={styles.jour}>
            {jour.texte}
          </Texte>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.quand}>
          <Texte couleur="galet">{dateLongue(m.jour)}</Texte>
          <View style={styles.piluleHoraire} accessibilityLabel={plage}>
            <Texte variante="titre">{plage}</Texte>
          </View>
        </View>

        <Texte variante="sousTitre" accessibilityRole="header">
          {LIBELLES_POSTE[m.poste].mission} · {m.restaurant}
        </Texte>

        <CarteInfos mission={m} lieu={d.detail?.lieu ?? null} tenue={d.detail?.tenue ?? null} />

        {etat.nom !== 'done' && (
          <View style={styles.contrat}>
            <View style={styles.iconeContrat}>
              <FileText size={18} color={couleurs.galet} strokeWidth={2} />
            </View>
            <Texte couleur="galet" style={styles.flex}>
              {t.extra.detail.contrat}
            </Texte>
          </View>
        )}
      </ScrollView>

      <BarreAction
        etat={etat}
        debut={m.debut}
        quand={quand}
        onMiLeLa={() => void d.accepter()}
        onSigner={signer}
        onDesister={d.desister}
      />

      {etat.nom === 'taken' && (
        <FeuillePrise missionsRestantes={d.missionsRestantes} quand={quand} onVoirMissions={retourListe} />
      )}

      {(etat.nom === 'cancel' || etat.nom === 'liberation') && (
        <EcranDesistement
          mission={m}
          quand={quand}
          envoi={etat.nom === 'liberation'}
          erreurReseau={etat.nom === 'cancel' && !!etat.erreurReseau}
          onConfirmer={() => void d.confirmerDesistement()}
          onAnnuler={annulerDesistement}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  retour: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  badge: {
    backgroundColor: couleurs.curcuma,
    borderRadius: rayons.champ,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 16,
  },
  jour: { marginRight: 16 },
  contenu: { paddingHorizontal: 16, gap: 16 },
  quand: { gap: 4 },
  piluleHoraire: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.blanc,
    borderWidth: 1,
    borderColor: couleurs.basalte,
  },
  contrat: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4, paddingBottom: 16 },
  iconeContrat: { marginTop: 3 },
  flex: { flex: 1 },
  squelettes: { paddingHorizontal: 16, gap: 16 },
});
