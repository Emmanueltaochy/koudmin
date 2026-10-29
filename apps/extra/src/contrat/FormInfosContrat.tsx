import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  aujourdhuiReunion,
  lireDate,
  textesEcrans,
  validerInfosContrat,
  type SaisieInfosContrat,
} from '@koudmin/core';
import { source, type InfosContrat } from '../donnees';
import { BoutonPrincipal } from '../ui/Bouton';
import { ChampTexte } from '../ui/ChampTexte';
import { Texte } from '../ui/Texte';

const tc = textesEcrans.extra.contrat;

/** « 12052001 » → « 12/05/2001 » pendant la frappe. */
function masqueDate(v: string) {
  const c = v.replace(/\D/g, '').slice(0, 8);
  return [c.slice(0, 2), c.slice(2, 4), c.slice(4)].filter(Boolean).join('/');
}

/** Infos demandées une seule fois pour la déclaration d'embauche (DPAE). */
export function FormInfosContrat({ initiales, onEnregistre }: { initiales: InfosContrat | null; onEnregistre: () => void }) {
  const [s, setS] = useState<SaisieInfosContrat>({
    dateNaissance: initiales ? initiales.dateNaissance.split('-').reverse().join('/') : '',
    lieuNaissance: initiales?.lieuNaissance ?? '',
    nir: initiales?.nir ?? '',
    adresse: initiales?.adresse ?? '',
  });
  const [erreurs, setErreurs] = useState<Partial<Record<keyof SaisieInfosContrat, string>>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const [tente, setTente] = useState(false);
  const maj = (m: Partial<SaisieInfosContrat>) => {
    const suivante = { ...s, ...m };
    setS(suivante);
    if (tente) setErreurs(validerInfosContrat(suivante, aujourdhuiReunion()));
  };

  async function enregistrer() {
    setTente(true);
    const e = validerInfosContrat(s, aujourdhuiReunion());
    setErreurs(e);
    if (Object.keys(e).length) return;
    setEnvoi(true);
    setErreurEnvoi(null);
    try {
      await source.enregistrerInfosContrat({ dateNaissance: lireDate(s.dateNaissance)!, lieuNaissance: s.lieuNaissance, nir: s.nir, adresse: s.adresse });
      onEnregistre();
    } catch {
      setErreurEnvoi(textesEcrans.connexion.pasDeReseauExtra);
    }
    setEnvoi(false);
  }

  return (
    <View style={styles.bloc}>
      <View style={styles.intro}>
        <Texte variante="sousTitre">{tc.infosTitre}</Texte>
        <Texte couleur="galet">{tc.infosAide}</Texte>
      </View>
      <ChampTexte libelle={tc.dateNaissance} value={s.dateNaissance} onChangeText={(v) => maj({ dateNaissance: masqueDate(v) })} placeholder="JJ/MM/AAAA" keyboardType="number-pad" erreur={erreurs.dateNaissance} autoComplete="birthdate-full" />
      <ChampTexte libelle={tc.lieuNaissance} value={s.lieuNaissance} onChangeText={(v) => maj({ lieuNaissance: v })} placeholder="Saint-Pierre (974)" erreur={erreurs.lieuNaissance} />
      <ChampTexte libelle={tc.nir} value={s.nir} onChangeText={(v) => maj({ nir: v.toUpperCase() })} keyboardType="number-pad" aide={tc.nirAide} erreur={erreurs.nir} maxLength={21} />
      <ChampTexte libelle={tc.adresse} value={s.adresse} onChangeText={(v) => maj({ adresse: v })} multiline erreur={erreurs.adresse} autoComplete="street-address" />
      {erreurEnvoi ? <Texte variante="legendeForte" couleur="braise">{erreurEnvoi}</Texte> : null}
      <BoutonPrincipal libelle={textesEcrans.extra.inscription.continuer} onPress={enregistrer} envoi={envoi} />
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: 24 },
  intro: { gap: 4 },
});
