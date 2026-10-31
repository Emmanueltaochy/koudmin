import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  normaliserMobileReunion,
  textesAcceptation,
  textesEcrans,
  VERSION_CGU,
  validerInscription,
  validerMotDePasse,
  type SaisieInscription,
} from '@kivien/core';
import { ErreurReseau, source } from '../donnees';
import { BoutonPrincipal, Lien } from '../ui/Bouton';
import { CaseACocher } from '../ui/CaseACocher';
import { ChampTexte } from '../ui/ChampTexte';
import { Choix } from '../ui/Choix';
import { ChoixCommune } from '../ui/ChoixCommune';
import { couleurs } from '../ui/theme';
import { Logo } from '../ui/Logo';
import { Texte } from '../ui/Texte';

const ti = textesEcrans.extra.inscription;
const tc = textesEcrans.connexion;

/**
 * Inscription en 5 champs : prénom, nom, téléphone, commune, voiture, plus le mot de passe.
 * `?etape=profil` : compte déjà ouvert, il ne reste que le profil à créer.
 */
export default function Bienvenue() {
  const { etape: etapeUrl } = useLocalSearchParams<{ etape?: 'profil' }>();
  const insets = useSafeAreaInsets();
  const profilSeul = etapeUrl === 'profil';
  const [saisie, setSaisie] = useState<SaisieInscription>({
    prenom: '',
    nom: '',
    telephone: '',
    commune: '',
    aVoiture: null,
  });
  const [motDePasse, setMotDePasse] = useState('');
  const [cgu, setCgu] = useState(false);
  const [erreurs, setErreurs] = useState<
    Partial<Record<keyof SaisieInscription | 'motDePasse' | 'cgu', string>>
  >({});
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  // Compte créé mais profil pas encore enregistré (coupure réseau) : on ne recrée pas le compte.
  const [compteCree, setCompteCree] = useState(profilSeul);
  const [envoi, setEnvoi] = useState(false);

  const [tente, setTente] = useState(false);
  const valider = (si: SaisieInscription, mdp: string, accepte = cgu) => {
    const e: Partial<Record<keyof SaisieInscription | 'motDePasse' | 'cgu', string>> =
      validerInscription(si);
    if (profilSeul) delete e.telephone;
    else {
      const m = validerMotDePasse(mdp);
      if (m) e.motDePasse = m;
    }
    if (!accepte) e.cgu = textesAcceptation.erreurExtra;
    return e;
  };
  // Après une première tentative, les erreurs disparaissent au fil de la correction.
  const maj = (m: Partial<SaisieInscription>) => {
    const suivante = { ...saisie, ...m };
    setSaisie(suivante);
    if (tente) setErreurs(valider(suivante, motDePasse));
  };
  const majMotDePasse = (v: string) => {
    setMotDePasse(v);
    if (tente) setErreurs(valider(saisie, v));
  };

  const cocherCgu = (v: boolean) => {
    setCgu(v);
    if (tente) setErreurs(valider(saisie, motDePasse, v));
  };

  async function continuer() {
    setTente(true);
    const e = valider(saisie, motDePasse);
    setErreurs(e);
    if (Object.keys(e).length) return;
    setEnvoi(true);
    setErreurEnvoi(null);
    try {
      const e164 = normaliserMobileReunion(saisie.telephone);
      if (!compteCree) {
        const r = await source.creerCompte(e164!, motDePasse);
        if (r !== 'ok') {
          if (r === 'dejaInscrit') setErreurs({ telephone: tc.dejaInscritExtra });
          else setErreurEnvoi(tc.tropDEssaisExtra);
          setEnvoi(false);
          return;
        }
        setCompteCree(true);
      }
      await source.inscrire({
        prenom: saisie.prenom,
        nom: saisie.nom,
        telephone: e164 ?? '',
        commune: saisie.commune,
        aVoiture: !!saisie.aVoiture,
      });
      await source.accepterCgu(VERSION_CGU).catch(() => undefined);
      router.replace('/');
      return;
    } catch (err) {
      setErreurEnvoi(err instanceof ErreurReseau ? tc.pasDeReseauExtra : tc.erreurServeurExtra);
    }
    setEnvoi(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.ecran}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.contenu,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Logo />
        <View style={styles.intro}>
          <Texte variante="titre" accessibilityRole="header">
            {ti.titre}
          </Texte>
          <Texte couleur="galet">{ti.sousTitre}</Texte>
        </View>

        <ChampTexte
          libelle={ti.prenom}
          value={saisie.prenom}
          onChangeText={(v) => maj({ prenom: v })}
          erreur={erreurs.prenom}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
        />
        <ChampTexte
          libelle={ti.nom}
          value={saisie.nom}
          onChangeText={(v) => maj({ nom: v })}
          erreur={erreurs.nom}
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
        />
        {!profilSeul && (
          <>
            <ChampTexte
              libelle={ti.telephone}
              value={saisie.telephone}
              onChangeText={(v) => maj({ telephone: v })}
              erreur={erreurs.telephone}
              aide={tc.telephoneAide}
              placeholder="0692 12 34 56"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="username"
              editable={!compteCree}
            />
            <ChampTexte
              libelle={tc.motDePasse}
              value={motDePasse}
              onChangeText={majMotDePasse}
              erreur={erreurs.motDePasse}
              aide={tc.motDePasseAide}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!compteCree}
            />
          </>
        )}
        <ChoixCommune
          libelle={ti.commune}
          valeur={saisie.commune}
          erreur={erreurs.commune}
          onChange={(c) => maj({ commune: c })}
        />
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
          <Texte
            variante={erreurs.aVoiture ? 'legendeForte' : 'legende'}
            couleur={erreurs.aVoiture ? 'braise' : 'galet'}
          >
            {erreurs.aVoiture ?? ti.voitureAide}
          </Texte>
        </View>
        <View style={styles.bloc}>
          <CaseACocher
            cochee={cgu}
            onChange={cocherCgu}
            libelle={textesAcceptation.extra}
            erreur={!!erreurs.cgu}
          />
          <Lien
            libelle={textesAcceptation.lienConditions}
            onPress={() => void Linking.openURL('https://kivien.re/conditions')}
            variante="legende"
            couleur="galet"
          />
          {erreurs.cgu ? (
            <Texte variante="legendeForte" couleur="braise">
              {erreurs.cgu}
            </Texte>
          ) : null}
        </View>
        {erreurEnvoi ? (
          <Texte variante="legendeForte" couleur="braise" accessibilityLiveRegion="polite">
            {erreurEnvoi}
          </Texte>
        ) : null}
        <BoutonPrincipal libelle={tc.creerCompte} onPress={continuer} envoi={envoi} />
        {!profilSeul && (
          <Lien
            libelle={tc.dejaCompte}
            onPress={() => router.push('/connexion')}
            variante="legende"
            couleur="galet"
          />
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
