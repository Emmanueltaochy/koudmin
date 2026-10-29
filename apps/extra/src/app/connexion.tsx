import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normaliserMobileReunion, textesEcrans } from '@koudmin/core';
import { source } from '../donnees';
import { BoutonPrincipal, Lien } from '../ui/Bouton';
import { ChampTexte } from '../ui/ChampTexte';
import { couleurs } from '../ui/theme';
import { Texte } from '../ui/Texte';

const tc = textesEcrans.connexion;

/** Connexion d'un compte existant : téléphone, puis code SMS. */
export default function Connexion() {
  const insets = useSafeAreaInsets();
  const [telephone, setTelephone] = useState('');
  const [code, setCode] = useState('');
  const [etape, setEtape] = useState<'numero' | 'code'>('numero');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function suivant() {
    setErreur(null);
    const e164 = normaliserMobileReunion(telephone);
    if (!e164) return setErreur(tc.erreurTelephoneExtra);
    setEnvoi(true);
    try {
      if (etape === 'numero') {
        await source.envoyerCode(e164);
        setEtape('code');
      } else if (await source.verifierCode(e164, code)) {
        const s = await source.session();
        router.replace(s === 'sansProfil' ? '/bienvenue?etape=profil' : '/');
      } else {
        setErreur(tc.erreurCodeExtra);
      }
    } catch {
      setErreur(tc.pasDeReseauExtra);
    }
    setEnvoi(false);
  }

  return (
    <ScrollView style={styles.ecran} contentContainerStyle={[styles.contenu, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
      <Texte variante="horaire">Koudmin</Texte>
      <Texte variante="titre" accessibilityRole="header">
        {tc.titreExtra}
      </Texte>
      {etape === 'numero' ? (
        <ChampTexte
          libelle={tc.telephone}
          value={telephone}
          onChangeText={setTelephone}
          erreur={erreur ?? undefined}
          aide={tc.telephoneAideExtra}
          placeholder="0692 12 34 56"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
      ) : (
        <ChampTexte
          libelle={tc.code}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
          erreur={erreur ?? undefined}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
        />
      )}
      <BoutonPrincipal libelle={etape === 'numero' ? tc.envoyerCode : tc.valider} onPress={suivant} envoi={envoi} />
      <View>
        {etape === 'code' ? (
          <Lien libelle={tc.autreNumero} onPress={() => setEtape('numero')} variante="legende" couleur="galet" />
        ) : (
          <Lien libelle={tc.creerCompte} onPress={() => router.replace('/bienvenue')} variante="legende" couleur="galet" />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  contenu: { paddingHorizontal: 16, gap: 24 },
});
