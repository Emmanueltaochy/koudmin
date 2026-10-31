import { MOT_DE_PASSE_MIN } from './inscription';
import { emailValide } from './email';
import { estSecteur } from './secteurs';
import { siretValide } from './siret';
import { normaliserMobileReunion } from './telephone';
import { textesEcrans } from './textesEcrans';
import { textesAcceptation } from './textesLegal';

const ti = textesEcrans.resto.inscription;

export interface SaisieInscriptionResto {
  etablissement: string;
  /** Secteur choisi, vide tant qu'aucun n'est choisi. */
  secteur: string;
  /** Vrai seulement si une adresse a été choisie dans la liste (géolocalisée). */
  adresseChoisie: boolean;
  siret: string;
  telephone: string;
  /** Pour le mot de passe oublié et les nouvelles des missions (confirmée par lien). */
  email: string;
  motDePasse: string;
  /** Conditions générales acceptées (absent quand on ajoute un établissement depuis l'espace). */
  cgu?: boolean;
}

export type ErreursInscriptionResto = Partial<Record<keyof SaisieInscriptionResto, string>>;

/** `compteOuvert` : la session existe déjà (seul l'établissement reste à créer). */
export function validerInscriptionResto(s: SaisieInscriptionResto, compteOuvert = false): ErreursInscriptionResto {
  const e: ErreursInscriptionResto = {};
  const nom = s.etablissement.trim();
  if (!nom || nom.length > 120) e.etablissement = ti.erreurEtablissement;
  if (!estSecteur(s.secteur)) e.secteur = ti.erreurSecteur;
  if (!s.adresseChoisie) e.adresseChoisie = ti.erreurAdresse;
  if (!siretValide(s.siret)) e.siret = ti.erreurSiret;
  if (s.cgu === false) e.cgu = textesAcceptation.erreur;
  if (!compteOuvert) {
    if (!normaliserMobileReunion(s.telephone)) e.telephone = textesEcrans.connexion.erreurTelephone;
    if (!emailValide(s.email)) e.email = textesEcrans.resto.compte.erreurEmail;
    if ([...s.motDePasse].length < MOT_DE_PASSE_MIN) e.motDePasse = ti.erreurMotDePasse;
  }
  return e;
}
