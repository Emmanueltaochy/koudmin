import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  caracteresRestants,
  EXPERIENCES,
  LANGUES,
  LIBELLES_EXPERIENCE,
  LIBELLES_LANGUE,
  LIBELLES_POSTE,
  normaliserPresentation,
  POSTES,
  textesEcrans,
  trierCompetences,
  trierLangues,
  type Experience,
} from '@kivien/core';
import { source, type Profil } from '../donnees';
import { Avatar } from '../ui/Avatar';
import { BoutonSecondaire, Lien } from '../ui/Bouton';
import { ChampTexte } from '../ui/ChampTexte';
import { Choix } from '../ui/Choix';
import { ChoixMultiple } from '../ui/ChoixMultiple';
import { Spinner } from '../ui/Spinner';
import { couleurs } from '../ui/theme';
import { Texte } from '../ui/Texte';
import { choisirPhoto } from './photo';

const tp = textesEcrans.extra.profil;
const reseau = textesEcrans.connexion.pasDeReseauExtra;

type Message = { texte: string; ok: boolean } | null;

function Retour({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <Texte variante="legendeForte" couleur={message.ok ? 'vacoa' : 'braise'} accessibilityLiveRegion="polite">
      {message.texte}
    </Texte>
  );
}

/** Photo de profil : ajout depuis la galerie, recadrée et compressée avant l'envoi. */
export function SectionPhoto({ profil }: { profil: Profil }) {
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    void source
      .maPhoto()
      .then(setPhoto)
      .catch(() => setPhoto(null));
  }, []);

  async function changer() {
    setMessage(null);
    const choisie = await choisirPhoto();
    if (choisie === null) return;
    if (choisie === 'refus') return setMessage({ texte: tp.photoRefusee, ok: false });
    setEnvoi(true);
    try {
      await source.enregistrerPhoto(choisie);
      setPhoto(choisie);
      setMessage({ texte: tp.enregistre, ok: true });
    } catch {
      setMessage({ texte: tp.photoErreur, ok: false });
    }
    setEnvoi(false);
  }

  async function retirer() {
    setMessage(null);
    setEnvoi(true);
    try {
      await source.supprimerPhoto();
      setPhoto(null);
      setMessage({ texte: tp.enregistre, ok: true });
    } catch {
      setMessage({ texte: reseau, ok: false });
    }
    setEnvoi(false);
  }

  return (
    <View style={styles.section}>
      <Texte variante="sousTitre">{tp.photo}</Texte>
      <View style={styles.ligne}>
        <Avatar photo={photo ?? null} prenom={profil.prenom} nom={profil.nom} alt={tp.photoAlt} />
        <View style={styles.actionsPhoto}>
          {envoi ? (
            <View style={styles.ligne}>
              <Spinner couleur={couleurs.basalte} />
              <Texte couleur="galet">{tp.photoEnvoi}</Texte>
            </View>
          ) : (
            <>
              <BoutonSecondaire libelle={photo ? tp.changerPhoto : tp.ajouterPhoto} onPress={() => void changer()} />
              {photo ? <Lien libelle={tp.retirerPhoto} variante="legende" couleur="galet" onPress={() => void retirer()} /> : null}
            </>
          )}
        </View>
      </View>
      <Texte variante="legende" couleur="galet">
        {tp.photoAide}
      </Texte>
      <Retour message={message} />
    </View>
  );
}

/**
 * Compétences, expérience, langues et présentation : enregistrées à chaque appui
 * (la présentation, avec son bouton). En cas d'échec, l'affichage revient à l'état enregistré.
 */
export function SectionsProfilPublic({ profil, onChange }: { profil: Profil; onChange: (p: Profil) => void }) {
  const [message, setMessage] = useState<{ section: string; message: Message } | null>(null);
  const [presentation, setPresentation] = useState(profil.presentation);
  const [erreurPresentation, setErreurPresentation] = useState<string | undefined>(undefined);
  const dernier = useRef(profil);
  dernier.current = profil;

  async function enregistrer(section: string, maj: Partial<Profil>) {
    const avant = dernier.current;
    const apres = { ...avant, ...maj };
    onChange(apres);
    setMessage(null);
    try {
      await source.majProfil(maj);
      setMessage({ section, message: { texte: tp.enregistre, ok: true } });
    } catch {
      onChange(avant);
      setMessage({ section, message: { texte: reseau, ok: false } });
    }
  }

  async function enregistrerPresentation() {
    if (caracteresRestants(presentation) < 0) return setErreurPresentation(tp.erreurPresentation);
    setErreurPresentation(undefined);
    const propre = normaliserPresentation(presentation);
    setPresentation(propre);
    await enregistrer('presentation', { presentation: propre });
  }

  const retour = (section: string) => (message?.section === section ? <Retour message={message.message} /> : null);
  const restants = caracteresRestants(presentation);

  return (
    <>
      <View style={styles.section}>
        <Texte variante="sousTitre">{tp.competences}</Texte>
        <ChoixMultiple
          libelle={tp.competences}
          options={POSTES.map((p) => ({ valeur: p, libelle: LIBELLES_POSTE[p].mission }))}
          valeurs={profil.competences}
          onChange={(c) => void enregistrer('competences', { competences: trierCompetences(c) })}
        />
        <Texte variante="legende" couleur="galet">
          {tp.competencesAide}
        </Texte>
        {retour('competences')}
      </View>

      <View style={styles.section}>
        <Texte variante="sousTitre">{tp.experience}</Texte>
        <Choix<Experience>
          libelle={tp.experience}
          options={EXPERIENCES.map((e) => ({ valeur: e, libelle: LIBELLES_EXPERIENCE[e] }))}
          valeur={profil.experience}
          onChange={(e) => void enregistrer('experience', { experience: e })}
        />
        {retour('experience')}
      </View>

      <View style={styles.section}>
        <Texte variante="sousTitre">{tp.langues}</Texte>
        <ChoixMultiple
          libelle={tp.langues}
          options={LANGUES.map((l) => ({ valeur: l, libelle: LIBELLES_LANGUE[l] }))}
          valeurs={profil.langues}
          onChange={(l) => void enregistrer('langues', { langues: trierLangues(l) })}
        />
        {retour('langues')}
      </View>

      <View style={styles.section}>
        <ChampTexte
          libelle={tp.presentation}
          value={presentation}
          onChangeText={(v) => {
            setPresentation(v);
            if (erreurPresentation && caracteresRestants(v) >= 0) setErreurPresentation(undefined);
          }}
          placeholder={tp.presentationExemple}
          multiline
          numberOfLines={4}
          style={styles.zoneTexte}
          erreur={erreurPresentation}
          aide={`${tp.presentationAide} ${tp.presentationRestants(Math.max(restants, 0))}`}
        />
        <BoutonSecondaire libelle={tp.enregistrer} onPress={() => void enregistrerPresentation()} />
        {retour('presentation')}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionsPhoto: { flex: 1, gap: 8, alignItems: 'flex-start' },
  zoneTexte: { minHeight: 112, textAlignVertical: 'top' },
});
