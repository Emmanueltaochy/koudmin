import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Pencil from 'lucide-react-native/icons/pencil';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { redigerContrat, textesEcrans } from '@kivien/core';
import { FormInfosContrat } from '../../contrat/FormInfosContrat';
import { source, type ContratExtra, type InfosContrat, type MissionDetail, type Profil } from '../../donnees';
import { BoutonPrincipal, Lien } from '../../ui/Bouton';
import { CaseACocher } from '../../ui/CaseACocher';
import { PaveSignature, type PaveSignatureRef } from '../../ui/PaveSignature';
import { CarteSquelette } from '../../missions/CarteSquelette';
import { couleurs, rayons } from '../../ui/theme';
import { Texte } from '../../ui/Texte';

const tc = textesEcrans.extra.contrat;

type Donnees = { contrat: ContratExtra; mission: MissionDetail; infos: InfosContrat | null; profil: Profil };

/** Signature du contrat d'extra sur téléphone. Infos DPAE demandées une seule fois, avant. */
export default function Contrat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [d, setD] = useState<Donnees | null | 'introuvable'>(null);
  const [lu, setLu] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<{ signature?: boolean; lecture?: boolean; envoi?: string }>({});
  const pave = useRef<PaveSignatureRef>(null);

  const charger = useCallback(async () => {
    const [contrat, mission, infos, profil] = await Promise.all([source.contrat(id), source.detail(id), source.infosContrat(), source.profil()]);
    setD(contrat && mission ? { contrat, mission, infos, profil } : 'introuvable');
  }, [id]);
  useEffect(() => {
    void charger().catch(() => setD('introuvable'));
  }, [charger]);

  async function signer() {
    if (!d || d === 'introuvable') return;
    const image = pave.current?.image() ?? null;
    const e = { signature: !image, lecture: !lu };
    setErreurs(e);
    if (e.signature || e.lecture) return;
    setEnvoi(true);
    try {
      await source.signerContrat(d.contrat.affectationId, image!);
      await charger();
    } catch {
      setErreurs({ envoi: textesEcrans.connexion.pasDeReseauExtra });
    }
    setEnvoi(false);
  }

  const entete = (
    <View style={[styles.entete, { paddingTop: insets.top + 4 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.retour}>
        <ChevronLeft size={24} color={couleurs.basalte} strokeWidth={2} />
      </Pressable>
    </View>
  );

  if (d === null) return <View style={styles.ecran}>{entete}<View style={styles.contenu}><CarteSquelette /></View></View>;
  if (d === 'introuvable') {
    return (
      <View style={styles.ecran}>
        {entete}
        <View style={styles.contenu}>
          <Texte variante="sousTitre">{tc.introuvable}</Texte>
        </View>
      </View>
    );
  }

  const { contrat, mission: m, infos, profil } = d;
  const texte = redigerContrat({
    employeur: { nom: contrat.employeur, adresse: contrat.adresseEmployeur, siret: null },
    salarie: { prenom: profil.prenom, nom: profil.nom, dateNaissance: infos?.dateNaissance ?? null, lieuNaissance: infos?.lieuNaissance ?? null, adresse: infos?.adresse ?? null },
    poste: m.poste,
    jour: m.jour,
    debut: m.debut,
    fin: m.fin,
    tauxHoraireBrutCentimes: m.tauxHoraireBrutCentimes,
    adresseService: m.lieu ? `${m.lieu.adresse}, ${[m.lieu.codePostal, m.commune].filter(Boolean).join(' ')}` : m.commune,
  });

  return (
    <View style={styles.ecran}>
      {entete}
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Texte variante="titre" accessibilityRole="header">
          {tc.titre}
        </Texte>

        {!infos && !contrat.signeExtra ? (
          <FormInfosContrat initiales={null} onEnregistre={() => void charger()} />
        ) : (
          <>
            {contrat.signeExtra && (
              <View style={styles.bandeau} accessibilityLiveRegion="polite">
                <Check size={20} color={couleurs.blanc} strokeWidth={2.5} />
                <Texte variante="corpsFort" couleur="blanc" style={styles.flex}>
                  {tc.signe}
                </Texte>
              </View>
            )}
            <View style={styles.carte}>
              <Texte variante="corpsFort">{texte.titre}</Texte>
              {texte.articles.map((a, i) => (
                <View key={a.titre} style={styles.article}>
                  <Texte variante="legendeForte">
                    {i + 1}. {a.titre}
                  </Texte>
                  <Texte>{a.texte}</Texte>
                </View>
              ))}
            </View>
            {!contrat.signeExtra && (
              <>
                <View style={styles.ligneSignature}>
                  <Texte variante="corpsFort">{tc.signature}</Texte>
                  <Lien libelle={tc.effacer} onPress={() => pave.current?.effacer()} />
                </View>
                <PaveSignature ref={pave} libelle={tc.signatureAide} erreur={erreurs.signature} />
                <Texte variante={erreurs.signature ? 'legendeForte' : 'legende'} couleur={erreurs.signature ? 'braise' : 'galet'}>
                  {erreurs.signature ? tc.erreurSignature : tc.signatureAide}
                </Texte>
                <CaseACocher cochee={lu} onChange={setLu} libelle={tc.lu} erreur={erreurs.lecture} />
                {erreurs.lecture ? <Texte variante="legendeForte" couleur="braise">{tc.erreurLecture}</Texte> : null}
                {erreurs.envoi ? <Texte variante="legendeForte" couleur="braise">{erreurs.envoi}</Texte> : null}
                <BoutonPrincipal
                  libelle={envoi ? tc.envoi : tc.signer}
                  onPress={signer}
                  envoi={envoi}
                  icone={<Pencil size={18} color={couleurs.blanc} strokeWidth={2} />}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  entete: { paddingHorizontal: 8, paddingBottom: 4 },
  retour: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  contenu: { paddingHorizontal: 16, gap: 16 },
  carte: { backgroundColor: couleurs.blanc, borderRadius: rayons.carte, padding: 16, gap: 12 },
  article: { gap: 4 },
  ligneSignature: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bandeau: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: couleurs.vacoa, borderRadius: rayons.carte, paddingVertical: 12, paddingHorizontal: 16 },
  flex: { flex: 1 },
});
