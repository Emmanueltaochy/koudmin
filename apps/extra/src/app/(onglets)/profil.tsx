import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Check from 'lucide-react-native/icons/check';
import MapPin from 'lucide-react-native/icons/map-pin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aujourdhuiReunion, formatMobileReunion, textesEcrans } from '@kivien/core';
import { FormInfosContrat } from '../../contrat/FormInfosContrat';
import { donneesFictives, source, type InfosContrat, type MissionConfirmee, type Profil } from '../../donnees';
import { CarteConfirmee } from '../../missions/CarteConfirmee';
import { Lien } from '../../ui/Bouton';
import { Choix } from '../../ui/Choix';
import { couleurs, rayons } from '../../ui/theme';
import { Texte } from '../../ui/Texte';

const tp = textesEcrans.extra.profil;

export default function ProfilEcran() {
  const insets = useSafeAreaInsets();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [missions, setMissions] = useState<MissionConfirmee[]>([]);
  const [infos, setInfos] = useState<InfosContrat | null | undefined>(undefined);
  const [edition, setEdition] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const charger = useCallback(() => {
    void Promise.all([source.profil(), source.mesMissions(), source.infosContrat()])
      .then(([p, m, i]) => {
        setProfil(p);
        setMissions(m);
        setInfos(i);
      })
      .catch(() => setMessage(textesEcrans.connexion.pasDeReseauExtra));
  }, []);
  useFocusEffect(charger);

  async function changerVoiture(aVoiture: boolean) {
    if (!profil) return;
    setProfil({ ...profil, aVoiture });
    try {
      await source.majProfil({ aVoiture });
      setMessage(tp.enregistre);
    } catch {
      setProfil(profil);
      setMessage(textesEcrans.connexion.pasDeReseauExtra);
    }
  }

  if (!profil) return <View style={[styles.ecran, { paddingTop: insets.top + 8 }]} />;

  return (
    <ScrollView style={styles.ecran} contentContainerStyle={[styles.contenu, { paddingTop: insets.top + 8 }]}>
      <Texte variante="titre" accessibilityRole="header">
        {tp.titre}
      </Texte>

      <View style={styles.carte}>
        <Texte variante="sousTitre">
          {profil.prenom} {profil.nom}
        </Texte>
        <Texte couleur="galet">{formatMobileReunion(profil.telephone)}</Texte>
        <View style={styles.ligne}>
          <MapPin size={18} color={couleurs.galet} strokeWidth={2} />
          <Texte variante="corpsFort">{profil.commune}</Texte>
        </View>
      </View>

      <View style={styles.section}>
        <Texte variante="corpsFort">{tp.voiture}</Texte>
        <Choix
          libelle={tp.voiture}
          options={[
            { valeur: true, libelle: textesEcrans.extra.inscription.voitureOui },
            { valeur: false, libelle: textesEcrans.extra.inscription.voitureNon },
          ]}
          valeur={profil.aVoiture}
          onChange={(v) => void changerVoiture(v)}
        />
        <Texte variante="legende" couleur="galet">
          {tp.voitureAide}
        </Texte>
        {message ? (
          <Texte variante="legendeForte" couleur={message === tp.enregistre ? 'vacoa' : 'braise'} accessibilityLiveRegion="polite">
            {message}
          </Texte>
        ) : null}
      </View>

      <View style={styles.section}>
        <Texte variante="sousTitre">{tp.missionsConfirmees}</Texte>
        {missions.length === 0 ? (
          <Texte couleur="galet">{tp.aucuneMission}</Texte>
        ) : (
          missions.map((m) => (
            <CarteConfirmee key={m.id} mission={m} aujourdhui={aujourdhuiReunion()} onPress={(id) => router.push(`/mission/${id}`)} />
          ))
        )}
      </View>

      <View style={styles.section}>
        {edition ? (
          <FormInfosContrat
            initiales={infos ?? null}
            onEnregistre={() => {
              setEdition(false);
              charger();
            }}
          />
        ) : (
          <>
            <Texte variante="sousTitre">{tp.infosContrat}</Texte>
            <Texte couleur="galet">{tp.infosContratAide}</Texte>
            {infos ? (
              <View style={styles.ligne}>
                <Check size={18} color={couleurs.vacoa} strokeWidth={2.5} />
                <Texte variante="legendeForte" couleur="vacoa">
                  {tp.infosEnregistrees}
                </Texte>
              </View>
            ) : null}
            <Lien libelle={infos ? tp.modifier : tp.completer} onPress={() => setEdition(true)} />
          </>
        )}
      </View>

      {!donneesFictives && (
        <Lien
          libelle={textesEcrans.connexion.deconnexion}
          variante="legende"
          couleur="galet"
          onPress={async () => {
            await source.deconnecter();
            router.replace('/bienvenue');
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  contenu: { paddingHorizontal: 16, paddingBottom: 32, gap: 32 },
  carte: { backgroundColor: couleurs.blanc, borderRadius: rayons.carte, padding: 16, gap: 4 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { gap: 12 },
});
