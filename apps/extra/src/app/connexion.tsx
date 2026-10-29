import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normaliserMobileReunion, textesEcrans } from '@kivien/core';
import { source } from '../donnees';
import { BoutonPrincipal, Lien } from '../ui/Bouton';
import { ChampTexte } from '../ui/ChampTexte';
import { couleurs } from '../ui/theme';
import { Logo } from '../ui/Logo';
import { Texte } from '../ui/Texte';

const tc = textesEcrans.connexion;

/** Connexion d'un compte existant : téléphone et mot de passe. */
export default function Connexion() {
  const insets = useSafeAreaInsets();
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreurTel, setErreurTel] = useState<string | null>(null);
  const [erreurMdp, setErreurMdp] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function seConnecter() {
    setErreurTel(null);
    setErreurMdp(null);
    const e164 = normaliserMobileReunion(telephone);
    if (!e164) return setErreurTel(tc.erreurTelephoneExtra);
    if (!motDePasse) return setErreurMdp(tc.erreurMotDePasseVideExtra);
    setEnvoi(true);
    try {
      const r = await source.connecter(e164, motDePasse);
      if (r === 'ok') {
        const s = await source.session();
        router.replace(s === 'sansProfil' ? '/bienvenue?etape=profil' : '/');
        return;
      }
      setErreurMdp(r === 'attente' ? tc.tropDEssaisExtra : tc.erreurIdentifiants);
    } catch {
      setErreurMdp(tc.pasDeReseauExtra);
    }
    setEnvoi(false);
  }

  return (
    <ScrollView style={styles.ecran} contentContainerStyle={[styles.contenu, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
      <Logo />
      <Texte variante="titre" accessibilityRole="header">
        {tc.titreExtra}
      </Texte>
      <ChampTexte
        libelle={tc.telephone}
        value={telephone}
        onChangeText={setTelephone}
        erreur={erreurTel ?? undefined}
        aide={tc.telephoneAide}
        placeholder="0692 12 34 56"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="username"
      />
      <ChampTexte
        libelle={tc.motDePasse}
        value={motDePasse}
        onChangeText={setMotDePasse}
        erreur={erreurMdp ?? undefined}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={seConnecter}
      />
      <BoutonPrincipal libelle={tc.seConnecter} onPress={seConnecter} envoi={envoi} />
      <View>
        <Lien libelle={tc.creerCompte} onPress={() => router.replace('/bienvenue')} variante="legende" couleur="galet" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  contenu: { paddingHorizontal: 16, gap: 24 },
});
