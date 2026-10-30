import { dateLongue, type JourISO } from './dates';
import { formatEuros } from './montants';
import { libellePoste, type Poste } from './postes';
import { DEFINITION_SECTEURS, SECTEUR_PAR_DEFAUT, type Secteur } from './secteurs';
import { brutParExtraCentimes, CONGES_PAYES_POURCENT } from './salaire';
import { dureeMinutes, formatDuree, formatPlage } from './temps';

/**
 * Modèle de CDD d'usage, prérempli depuis la demande et le secteur de l'employeur.
 *
 * IMPORTANT : modèle de travail. Le texte doit être relu et validé par un juriste en droit
 * du travail avant la mise en production (mentions obligatoires, classification HCR,
 * caisses de retraite et de prévoyance de chaque employeur).
 */
export interface DonneesContrat {
  employeur: { nom: string; adresse: string; siret: string | null };
  salarie: {
    prenom: string;
    nom: string;
    dateNaissance: JourISO | null;
    lieuNaissance: string | null;
    adresse: string | null;
  };
  /** Secteur de l'employeur (hôtellerie-restauration si absent). */
  secteur?: Secteur;
  poste: Poste;
  /** Poste libre : intitulé et description écrits par l'établissement. */
  intitule?: string | null;
  descriptionPoste?: string | null;
  jour: JourISO;
  debut: number;
  fin: number;
  tauxHoraireBrutCentimes: number;
  adresseService: string;
}

export interface Article {
  titre: string;
  texte: string;
}

export function redigerContrat(d: DonneesContrat): { titre: string; articles: Article[] } {
  const secteur = DEFINITION_SECTEURS[d.secteur ?? SECTEUR_PAR_DEFAUT];
  const minutes = dureeMinutes(d.debut, d.fin) ?? 0;
  const brutSansConges = Math.round((minutes * d.tauxHoraireBrutCentimes) / 60);
  const brutTotal = brutParExtraCentimes(minutes, d.tauxHoraireBrutCentimes);
  const naissance =
    d.salarie.dateNaissance && d.salarie.lieuNaissance
      ? `, né·e le ${dateLongue(d.salarie.dateNaissance).replace(/^\S+ /, '')} ${d.salarie.dateNaissance.slice(0, 4)} à ${d.salarie.lieuNaissance}`
      : '';
  return {
    titre: "Contrat de travail à durée déterminée d'usage",
    articles: [
      {
        titre: 'Les parties',
        texte:
          `Employeur : ${d.employeur.nom}, ${d.employeur.adresse}` +
          (d.employeur.siret ? `, SIRET ${d.employeur.siret}` : '') +
          `. Salarié·e : ${d.salarie.prenom} ${d.salarie.nom}${naissance}` +
          (d.salarie.adresse ? `, demeurant ${d.salarie.adresse}` : '') +
          '.',
      },
      {
        titre: 'Motif',
        texte:
          "Contrat à durée déterminée d'usage conclu en application des articles L1242-2 3° et D1242-1 " +
          `du Code du travail, le secteur « ${secteur.libelle} » étant un secteur où il est d'usage constant ` +
          'de ne pas recourir au contrat à durée indéterminée pour ces emplois temporaires. ' +
          `${secteur.convention ?? "Convention collective : celle applicable à l'employeur"}.`,
      },
      {
        titre: 'Emploi',
        texte:
          `${libellePoste(d.poste, d.intitule)}.` +
          (d.descriptionPoste?.trim() ? ` ${d.descriptionPoste.trim().replace(/[.\s]+$/, '')}.` : '') +
          ` Lieu de travail : ${d.adresseService}.`,
      },
      {
        titre: 'Date et horaires',
        texte:
          `Le ${dateLongue(d.jour).toLowerCase()}, de ${formatPlage(d.debut, d.fin).replace(/ – /, ' à ')}, ` +
          `soit ${formatDuree(minutes)} de travail. Le contrat prend fin à l'issue de ce service. ` +
          "Pas de période d'essai.",
      },
      {
        titre: 'Rémunération',
        texte:
          `Taux horaire brut : ${formatEuros(d.tauxHoraireBrutCentimes)}. ` +
          `Salaire brut : ${formatEuros(brutSansConges)}, plus ${CONGES_PAYES_POURCENT} % d'indemnité de congés payés, ` +
          `soit ${formatEuros(brutTotal)} brut. ` +
          "L'indemnité de fin de contrat n'est pas due pour un contrat d'usage (article L1243-10 du Code du travail). " +
          'Le salaire est versé par l’employeur, avec un bulletin de paie.',
      },
      {
        titre: 'Déclarations',
        texte:
          "L'employeur effectue la déclaration préalable à l'embauche auprès de l'URSSAF avant le début du service. " +
          'Retraite complémentaire et prévoyance : organismes de l’employeur.',
      },
      {
        titre: 'Signature',
        texte:
          'Contrat signé électroniquement par les deux parties, chacune recevant un exemplaire. ' +
          'Le salarié ou la salariée reçoit son exemplaire au plus tard dans les deux jours ouvrables suivant l’embauche.',
      },
    ],
  };
}

/**
 * Numéro de sécurité sociale (NIR) : 15 caractères, clé de contrôle 97 - (n mod 97).
 * Corse : 2A → 19, 2B → 18 pour le calcul de la clé.
 */
export function nirValide(saisie: string): boolean {
  const s = saisie.replace(/\s/g, '').toUpperCase();
  if (!/^[12]\d{2}(0[1-9]|1[0-2]|[2-9]\d)(2A|2B|\d{2})\d{6}\d{2}$/.test(s)) return false;
  const corps = s.slice(0, 13).replace('2A', '19').replace('2B', '18');
  const cle = Number(s.slice(13));
  const reste = Number(BigInt(corps) % 97n);
  return 97 - reste === cle;
}
