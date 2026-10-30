import { MOT_DE_PASSE_MIN } from './inscription';
import { siretValide } from './siret';
import { normaliserMobileReunion } from './telephone';
import { textesEcrans } from './textesEcrans';

const ti = textesEcrans.resto.inscription;

export interface SaisieInscriptionResto {
  etablissement: string;
  /** Vrai seulement si une adresse a été choisie dans la liste (géolocalisée). */
  adresseChoisie: boolean;
  siret: string;
  telephone: string;
  motDePasse: string;
}

export type ErreursInscriptionResto = Partial<Record<keyof SaisieInscriptionResto, string>>;

/** `compteOuvert` : la session existe déjà (seul l'établissement reste à créer). */
export function validerInscriptionResto(s: SaisieInscriptionResto, compteOuvert = false): ErreursInscriptionResto {
  const e: ErreursInscriptionResto = {};
  const nom = s.etablissement.trim();
  if (!nom || nom.length > 120) e.etablissement = ti.erreurEtablissement;
  if (!s.adresseChoisie) e.adresseChoisie = ti.erreurAdresse;
  if (!siretValide(s.siret)) e.siret = ti.erreurSiret;
  if (!compteOuvert) {
    if (!normaliserMobileReunion(s.telephone)) e.telephone = textesEcrans.connexion.erreurTelephone;
    if ([...s.motDePasse].length < MOT_DE_PASSE_MIN) e.motDePasse = ti.erreurMotDePasse;
  }
  return e;
}
