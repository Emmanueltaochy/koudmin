import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { emailValide, normaliserEmail, textesEcrans } from '@kivien/core';
import { source } from '../donnees';
import { BoutonSecondaire } from '../ui/Bouton';
import { ChampTexte } from '../ui/ChampTexte';
import { couleurs } from '../ui/theme';
import { Texte } from '../ui/Texte';

const te = textesEcrans.extra.email;

/** Adresse e-mail de l'extra : ajoutée après l'inscription, confirmée par un lien. */
export function SectionEmail() {
  const [courant, setCourant] = useState<{ email: string | null; enAttente: string | null } | null>(null);
  const [saisie, setSaisie] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);

  useEffect(() => {
    void source
      .emailDuCompte()
      .then((c) => {
        setCourant(c);
        setSaisie(c.enAttente ?? c.email ?? '');
      })
      .catch(() => undefined);
  }, []);

  async function enregistrer() {
    if (!emailValide(saisie)) return setMessage({ texte: te.erreur, ok: false });
    setEnvoi(true);
    setMessage(null);
    try {
      const adresse = normaliserEmail(saisie);
      const r = await source.changerEmail(adresse);
      if (r === 'prise') setMessage({ texte: te.prise, ok: false });
      else {
        setCourant((c) => ({ email: c?.email ?? null, enAttente: adresse }));
        setMessage({ texte: te.enAttente(adresse), ok: true });
      }
    } catch {
      setMessage({ texte: textesEcrans.connexion.pasDeReseauExtra, ok: false });
    }
    setEnvoi(false);
  }

  return (
    <View style={styles.section}>
      <Texte variante="sousTitre">{te.titre}</Texte>
      {courant?.email && !courant.enAttente ? (
        <View style={styles.ligne}>
          <Check size={16} color={couleurs.vacoa} strokeWidth={2.5} />
          <Texte variante="legendeForte" couleur="vacoa">
            {te.confirmee}
          </Texte>
        </View>
      ) : null}
      <ChampTexte
        libelle={te.titre}
        value={saisie}
        onChangeText={setSaisie}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="prenom@exemple.re"
        aide={courant?.enAttente && !message ? te.enAttente(courant.enAttente) : te.aide}
      />
      {message ? (
        <Texte variante="legendeForte" couleur={message.ok ? 'vacoa' : 'braise'} accessibilityLiveRegion="polite">
          {message.texte}
        </Texte>
      ) : null}
      <BoutonSecondaire libelle={te.enregistrer} onPress={() => void enregistrer()} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
