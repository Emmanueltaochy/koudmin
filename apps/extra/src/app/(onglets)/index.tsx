import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Calendar from 'lucide-react-native/icons/calendar';
import MapPin from 'lucide-react-native/icons/map-pin';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  aujourdhuiReunion,
  filtrerMissions,
  legendeListe,
  textes as t,
  textesEcrans,
  trierMissions,
  type FiltreMissions,
  type MissionResume,
} from '@kivien/core';
import { Bandeau } from '../../missions/Bandeau';
import { BandeauEmail } from '../../missions/BandeauEmail';
import { CarteConfirmee } from '../../missions/CarteConfirmee';
import { CarteMission } from '../../missions/CarteMission';
import { CarteSquelette } from '../../missions/CarteSquelette';
import { demoAutorisee } from '../../donnees';
import { useMissions, type Demo } from '../../missions/useMissions';
import { EtatPlein } from '../../ui/EtatPlein';
import { PiluleFiltre, PiluleInfo } from '../../ui/Pilule';
import { couleurs, rayons } from '../../ui/theme';
import { Texte } from '../../ui/Texte';

const FILTRES: FiltreMissions[] = ['toutes', 'ceSoir', 'weekEnd'];
const tm = t.extra.missions;
const tv = textesEcrans.extra.vuesMissions;
type Vue = 'aVenir' | 'historique';

export default function Missions() {
  const { demo } = useLocalSearchParams<{ demo?: Demo }>();
  const { etat, profil, confirmees, recharger } = useMissions(demoAutorisee(demo));
  const [filtre, setFiltre] = useState<FiltreMissions>('toutes');
  const [vue, setVue] = useState<Vue>('aVenir');
  const insets = useSafeAreaInsets();
  const aujourdhui = aujourdhuiReunion();

  const missions = useMemo(
    () =>
      etat.statut === 'pret' && profil
        ? trierMissions(filtrerMissions(etat.missions, filtre, aujourdhui), profil)
        : [],
    [etat, profil, filtre, aujourdhui],
  );

  // « À venir » : ce qui reste à faire. « Historique » : annulées puis terminées, à part.
  const actives = useMemo(() => confirmees.filter((m) => !m.annulee && !m.passee), [confirmees]);
  const anciennes = useMemo(
    () =>
      confirmees
        .filter((m) => m.annulee || m.passee)
        .sort((a, b) => b.jour.localeCompare(a.jour) || b.debut - a.debut),
    [confirmees],
  );
  const annulees = anciennes.filter((m) => m.annulee);
  const terminees = anciennes.filter((m) => !m.annulee);
  const historique = vue === 'historique' && anciennes.length > 0;

  const ouvrir = useCallback((id: string) => router.push(`/mission/${id}`), []);
  const rendreCarte = useCallback(
    ({ item }: { item: MissionResume }) =>
      profil ? (
        <CarteMission mission={item} profil={profil} aujourdhui={aujourdhui} onPress={ouvrir} />
      ) : null,
    [profil, aujourdhui, ouvrir],
  );

  return (
    <View style={styles.ecran}>
      <View style={[styles.entete, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titre}>
          <Texte variante="titre" accessibilityRole="header">
            {tm.titre}
          </Texte>
          {profil && (
            <PiluleInfo
              icone={<MapPin size={16} color={couleurs.basalte} strokeWidth={2} />}
              libelle={`${profil.commune} · ${profil.aVoiture ? 'avec voiture' : 'sans voiture'}`}
            />
          )}
        </View>
        {anciennes.length > 0 && (
          <View style={styles.vues} accessibilityRole="tablist">
            {(['aVenir', 'historique'] as const).map((v) => (
              <Pressable
                key={v}
                accessibilityRole="tab"
                accessibilityState={{ selected: vue === v }}
                onPress={() => setVue(v)}
                style={[styles.vue, vue === v && styles.vueActive]}
              >
                <Texte
                  variante={vue === v ? 'corpsFort' : 'corps'}
                  couleur={vue === v ? 'basalte' : 'galet'}
                >
                  {v === 'aVenir' ? tv.aVenir : tv.historique(anciennes.length)}
                </Texte>
              </Pressable>
            ))}
          </View>
        )}
        {!historique && (
          <View style={styles.filtres}>
            {FILTRES.map((f) => (
              <PiluleFiltre
                key={f}
                libelle={tm.filtres[f]}
                active={filtre === f}
                onPress={() => setFiltre(f)}
              />
            ))}
          </View>
        )}
      </View>

      <BandeauEmail />

      {etat.statut === 'chargement' && (
        <View style={styles.contenu}>
          <Texte variante="legende" couleur="galet">
            {tm.chargement}
          </Texte>
          {[0, 1, 2, 3].map((i) => (
            <CarteSquelette key={i} />
          ))}
        </View>
      )}

      {etat.statut === 'horsLigne' && (
        <EtatPlein
          icone={<WifiOff size={28} color={couleurs.braise} strokeWidth={1.75} />}
          titre={tm.horsLigneTitre}
          couleurTitre="braise"
          texte={tm.horsLigneTexte}
          action={tm.horsLigneAction}
          onAction={recharger}
        />
      )}

      {etat.statut === 'pret' && missions.length === 0 && confirmees.length === 0 && (
        // Lancement : pas encore de mission dans la zone, on fait patienter et cocher ses soirées.
        <EtatPlein
          icone={<Calendar size={28} color={couleurs.basalte} strokeWidth={1.75} />}
          titre={textesEcrans.extra.attente.titre}
          texte={textesEcrans.extra.attente.texte}
          action={textesEcrans.extra.attente.action}
          onAction={() => router.navigate('/dispos')}
        />
      )}

      {etat.statut === 'pret' && historique && (
        <ScrollView contentContainerStyle={styles.liste}>
          {[
            { titre: tv.annulees, liste: annulees },
            { titre: tv.terminees, liste: terminees },
          ]
            .filter((g) => g.liste.length > 0)
            .map((g) => (
              <View key={g.titre} style={styles.groupe}>
                <Texte variante="legendeForte" couleur="galet">
                  {g.titre}
                </Texte>
                {g.liste.map((m) => (
                  <CarteConfirmee key={m.id} mission={m} aujourdhui={aujourdhui} onPress={ouvrir} />
                ))}
              </View>
            ))}
        </ScrollView>
      )}

      {etat.statut === 'pret' &&
        !historique &&
        (missions.length > 0 || confirmees.length > 0) &&
        profil && (
          <FlatList
            data={missions}
            keyExtractor={(m) => m.id}
            renderItem={rendreCarte}
            ListHeaderComponent={
              <>
                <Bandeau missions={missions} />
                {actives.length > 0 && (
                  <View style={styles.confirmees}>
                    <Texte variante="legendeForte">{textesEcrans.extra.missionsConfirmees}</Texte>
                    {actives.map((m) => (
                      <CarteConfirmee
                        key={m.id}
                        mission={m}
                        aujourdhui={aujourdhui}
                        onPress={ouvrir}
                      />
                    ))}
                  </View>
                )}
                <Texte variante="legende" couleur="galet" style={styles.legende}>
                  {missions.length > 0
                    ? legendeListe(missions.length, !profil.aVoiture)
                    : tm.videTitre}
                </Texte>
              </>
            }
            ItemSeparatorComponent={Separateur}
            contentContainerStyle={styles.liste}
            initialNumToRender={6}
            windowSize={5}
            removeClippedSubviews
          />
        )}
    </View>
  );
}

const Separateur = () => <View style={styles.separateur} />;

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  entete: { paddingHorizontal: 16, paddingBottom: 16, gap: 16 },
  // Une commune longue fait passer la pilule sous le titre au lieu de déborder.
  titre: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  filtres: { flexDirection: 'row', gap: 8 },
  contenu: { flex: 1, paddingHorizontal: 16, gap: 16 },
  liste: { paddingHorizontal: 16, paddingBottom: 16 },
  legende: { marginBottom: 16 },
  confirmees: { gap: 16, marginBottom: 24 },
  groupe: { gap: 16, marginBottom: 24 },
  // Sélecteur À venir / Historique : fond galet clair, vue choisie sur carte blanche.
  vues: {
    flexDirection: 'row',
    backgroundColor: couleurs.trait,
    borderRadius: rayons.carte,
    padding: 4,
  },
  vue: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rayons.carte - 4,
  },
  vueActive: { backgroundColor: couleurs.blanc },
  separateur: { height: 16 },
});
