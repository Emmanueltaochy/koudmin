import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  normaliserMobileReunion,
  textesEcrans,
  validerInscription,
  type SaisieInscription,
} from '@koudmin/core';
import { ErreurReseau, source } from '../donnees';
import { BoutonPrincipal, Lien } from '../ui/Bouton';
import { ChampTexte } from '../ui/ChampTexte';
import { Choix } from '../ui/Choix';
import { ChoixCommune } from '../ui/ChoixCommune';
import { couleurs } from '../ui/theme';
import { Texte } from '../ui/Texte';

const ti = textesEcrans.extra.inscription;
const tc = textesEcrans.connexion;

/**
 * Inscription en 5 champs : prénom, nom, téléphone, commune, voiture. Puis le code SMS.
 * `?etape=profil` : numéro déjà vérifié, il ne reste que le profil à créer.
 */
export default function Bienvenue() {
  const { etape: etapeUrl } = useLocalSearchParams<{ etape?: 'profil' }>();
  const insets = useSafeAreaInsets();
  const sansCode = etapeUrl === 'profil';
  const [saisie, setSaisie] = useState<SaisieInscription>({ prenom: '', nom: '', telephone: '', commune: '', aVoiture: null });
  const [erreurs, setErreurs] = useState<Partial<Record<keyof SaisieInscription, string>>>({});
  const [etape, setEtape] = useState<'formulaire' | 'code'>('formulaire');
  const [code, setCode] = useState('');
  const [erreurCode, setErreurCode] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [tente, setTente] = useState(false);
  // Après une première tentative, les erreurs disparaissent au fil de la correction.
  const maj = (m: Partial<SaisieInscription>) => {
    const suivante = { ...saisie, ...m };
    setSaisie(suivante);
    if (tente) setErreurs(validerInscription(suivante));
  };

  async function inscrire() {
    const e164 = normaliserMobileReunion(saisie.telephone)!;
    await source.inscrire({ prenom: saisie.prenom, nom: saisie.nom, telephone: e164, commune: saisie.commune, aVoiture: !!saisie.aVoiture });
    router.replace('/');
  }

  async function continuer() {
    setTente(true);
    const e = validerInscription(saisie);
    setErreurs(e);
    if (Object.keys(e).length) return;
    setEnvoi(true);
    setErreurCode(null);
    try {
      if (sansCode) await inscrire();
      else {
        await source.envoyerCode(normaliserMobileReunion(saisie.telephone)!);
        setEtape('code');
      }
    } catch (err) {
      setErreurCode(err instanceof ErreurReseau ? tc.pasDeReseauExtra : tc.smsNonPartiExtra);
    }
    setEnvoi(false);
  }

  async function valider() {
    setEnvoi(true);
    setErreurCode(null);
    try {
      if (await source.verifierCode(normaliserMobileReunion(saisie.telephone)!, code)) await inscrire();
      else setErreurCode(tc.erreurCodeExtra);
    } catch {
      setErreurCode(tc.pasDeReseauExtra);
    }
    setEnvoi(false);
  }

  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.contenu, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Texte variante="horaire">Koudmin</Texte>
        <View style={styles.intro}>
          <Texte variante="titre" accessibilityRole="header">
            {ti.titre}
          </Texte>
          <Texte couleur="galet">{ti.sousTitre}</Texte>
        </View>

        {etape === 'formulaire' ? (
          <>
            <ChampTexte libelle={ti.prenom} value={saisie.prenom} onChangeText={(v) => maj({ prenom: v })} erreur={erreurs.prenom} autoComplete="given-name" textContentType="givenName" autoCapitalize="words" />
            <ChampTexte libelle={ti.nom} value={saisie.nom} onChangeText={(v) => maj({ nom: v })} erreur={erreurs.nom} autoComplete="family-name" textContentType="familyName" autoCapitalize="words" />
            {!sansCode && (
              <ChampTexte
                libelle={ti.telephone}
                value={saisie.telephone}
                onChangeText={(v) => maj({ telephone: v })}
                erreur={erreurs.telephone}
                aide={tc.telephoneAideExtra}
                placeholder="0692 12 34 56"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
            )}
            <ChoixCommune libelle={ti.commune} valeur={saisie.commune} erreur={erreurs.commune} onChange={(c) => maj({ commune: c })} />
            <View style={styles.bloc}>
              <Texte variante="corpsFort">{ti.voiture}</Texte>
              <Choix
                libelle={ti.voiture}
                options={[
                  { valeur: true, libelle: ti.voitureOui },
                  { valeur: false, libelle: ti.voitureNon },
                ]}
                valeur={saisie.aVoiture}
                onChange={(v) => maj({ aVoiture: v })}
              />
              <Texte variante={erreurs.aVoiture ? 'legendeForte' : 'legende'} couleur={erreurs.aVoiture ? 'braise' : 'galet'}>
                {erreurs.aVoiture ?? ti.voitureAide}
              </Texte>
            </View>
            {erreurCode ? <Texte variante="legendeForte" couleur="braise">{erreurCode}</Texte> : null}
            <BoutonPrincipal libelle={sansCode ? tc.creerCompte : ti.continuer} onPress={continuer} envoi={envoi} />
            {!sansCode && <Lien libelle={tc.dejaCompte} onPress={() => router.push('/connexion')} variante="legende" couleur="galet" />}
          </>
        ) : (
          <>
            <ChampTexte
              libelle={tc.code}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
              erreur={erreurCode ?? undefined}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
            />
            <BoutonPrincipal libelle={tc.creerCompte} onPress={valider} envoi={envoi} />
            <Lien libelle={tc.autreNumero} onPress={() => setEtape('formulaire')} variante="legende" couleur="galet" />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  contenu: { paddingHorizontal: 16, gap: 24 },
  intro: { gap: 4 },
  bloc: { gap: 8 },
});
