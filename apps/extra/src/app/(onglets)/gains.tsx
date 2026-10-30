import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Check from 'lucide-react-native/icons/check';
import Pencil from 'lucide-react-native/icons/pencil';
import Wallet from 'lucide-react-native/icons/wallet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  aujourdhuiReunion,
  brutMissionCentimes,
  dateLongue,
  formatEuros,
  formatNet,
  formatPlage,
  libellePoste,
  netEstimeEuros,
  resumeGains,
  textesEcrans,
  type MissionGain,
  type TotalGains,
} from '@kivien/core';
import { source } from '../../donnees';
import { BoutonSecondaire } from '../../ui/Bouton';
import { EtatPlein } from '../../ui/EtatPlein';
import { commun, couleurs, rayons } from '../../ui/theme';
import { Texte } from '../../ui/Texte';
import { VignettePoste } from '../../ui/VignettePoste';

const tg = textesEcrans.extra.gains;

function Total({ titre, total, fort }: { titre: string; total: TotalGains; fort?: boolean }) {
  return (
    <View style={[styles.total, fort ? styles.totalFort : styles.caseTotal]}>
      <Texte variante="legendeForte" couleur={fort ? 'blanc' : 'galet'}>
        {titre}
      </Texte>
      <Texte variante={fort ? 'titre' : 'sousTitre'} couleur={fort ? 'blanc' : 'basalte'} numberOfLines={fort ? undefined : 1} adjustsFontSizeToFit={!fort}>
        {formatNet(total.netEuros)}
      </Texte>
      <Texte variante="legende" couleur={fort ? 'blanc' : 'galet'}>
        {tg.brut(formatEuros(total.brutCentimes))} · {tg.missions(total.missions)}
      </Texte>
    </View>
  );
}

/** Mes gains : ce que les missions avec contrat rapportent, au mois, à l'année et à venir. */
export default function Gains() {
  const insets = useSafeAreaInsets();
  const [missions, setMissions] = useState<MissionGain[] | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(() => {
    void source
      .mesGains()
      .then((m) => {
        setMissions(m);
        setErreur(false);
      })
      .catch(() => setErreur(true));
  }, []);
  useFocusEffect(charger);

  const resume = missions ? resumeGains(missions, aujourdhuiReunion()) : null;

  return (
    <ScrollView style={commun.ecran} contentContainerStyle={[styles.contenu, { paddingTop: insets.top + 8 }]}>
      <Texte variante="titre" accessibilityRole="header">
        {tg.titre}
      </Texte>
      {erreur && (
        <Texte variante="legendeForte" couleur="braise">
          {textesEcrans.connexion.pasDeReseauExtra}
        </Texte>
      )}
      {missions && missions.length === 0 && (
        <EtatPlein
          icone={<Wallet size={28} color={couleurs.basalte} strokeWidth={1.75} />}
          titre={tg.titre}
          texte={tg.vide}
          action={tg.videAction}
          onAction={() => router.navigate('/')}
        />
      )}
      {resume && missions && missions.length > 0 && (
        <>
          <Total titre={tg.ceMois} total={resume.ceMois} fort />
          <View style={styles.ligneTotaux}>
            <Total titre={tg.cetteAnnee} total={resume.cetteAnnee} />
            <Total titre={tg.aVenir} total={resume.aVenir} />
          </View>
          <Texte variante="legende" couleur="galet">
            {tg.note}
          </Texte>

          <Texte variante="sousTitre" style={styles.titreListe}>
            {tg.historique}
          </Texte>
          {missions.map((m) => {
            const brut = brutMissionCentimes(m);
            return (
              <Pressable
                key={m.demandeId}
                accessibilityRole="button"
                onPress={() => router.push(`/contrat/${m.demandeId}`)}
                style={({ pressed }) => [commun.carte, styles.mission, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.entete}>
                  <VignettePoste poste={m.poste} taille={40} />
                  <View style={styles.flex}>
                    <Texte variante="corpsFort">{m.restaurant}</Texte>
                    <Texte variante="legende" couleur="galet">
                      {dateLongue(m.jour)} · {formatPlage(m.debut, m.fin)} · {libellePoste(m.poste, m.intitule, 'court')}
                    </Texte>
                  </View>
                  <View style={styles.montant}>
                    <Texte variante="corpsFort">{formatNet(netEstimeEuros(brut))}</Texte>
                    <Texte variante="legende" couleur="galet">
                      {tg.brut(formatEuros(brut))}
                    </Texte>
                  </View>
                </View>
                <View style={styles.pied}>
                  {m.contratSigneExtra ? (
                    <Check size={16} color={couleurs.vacoa} strokeWidth={2.5} />
                  ) : (
                    <Pencil size={16} color={couleurs.basalte} strokeWidth={2} />
                  )}
                  <Texte variante="legendeForte" couleur={m.contratSigneExtra ? 'vacoa' : 'basalte'}>
                    {m.contratSigneExtra ? tg.contratSigne : tg.contratASigner}
                  </Texte>
                  <Texte variante="legende" couleur="galet" style={styles.etat}>
                    {m.effectuee ? tg.effectuee : tg.prevue}
                  </Texte>
                </View>
              </Pressable>
            );
          })}
          <BoutonSecondaire libelle={tg.videAction} onPress={() => router.navigate('/')} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  caseTotal: { flex: 1 },
  total: { gap: 6, paddingHorizontal: 16, paddingVertical: 18, borderRadius: rayons.carte, backgroundColor: couleurs.blanc, borderBottomWidth: 1, borderBottomColor: couleurs.trait },
  totalFort: { backgroundColor: couleurs.vacoa, borderBottomColor: couleurs.vacoa },
  ligneTotaux: { flexDirection: 'row', gap: 12 },
  titreListe: { marginTop: 8 },
  mission: { gap: 12 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  montant: { alignItems: 'flex-end', gap: 2 },
  pied: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: couleurs.trait },
  etat: { marginLeft: 'auto' },
});
