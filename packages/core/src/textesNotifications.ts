/**
 * E-mails automatiques envoyés par le VPS (deploy/vps/notifications.sh). Le script reprend ces
 * textes mot pour mot (vérifié par test/textesNotifications.test.ts) ; les {champs} sont remplacés
 * à l'envoi : {prenom}, {extra}, {restaurant}, {commune}, {poste}, {jour} (« samedi 2 novembre »),
 * {horaire} (« 19 h à 23 h »), {distance} (« 3 km »).
 * Extras tutoyés, établissements vouvoyés, comme dans les deux apps.
 */

export type TypeNotification =
  'nouvelle_mission' | 'extra_trouve' | 'contrat_a_signer' | 'rappel_extra' | 'rappel_pro';

export interface ModeleNotification {
  sujet: string;
  /** Paragraphes du message. */
  paragraphes: string[];
  bouton: string;
  pied: string;
}

const PIED_EXTRA = 'Tu reçois ce message pour une mission sur Kivien.';
const PIED_PRO = 'Vous recevez ce message pour une mission de votre établissement sur Kivien.';

export const textesNotifications: Record<TypeNotification, ModeleNotification> = {
  nouvelle_mission: {
    sujet: 'Nouvelle mission près de chez toi : {poste}, {jour}',
    paragraphes: [
      'Bonjour {prenom},',
      '{restaurant} cherche un extra à {commune} : {poste}, {jour}, de {horaire}. C’est à {distance} de chez toi.',
      'Ouvre l’app pour voir la mission et dire « mi lé la ». La première personne qui accepte a la mission.',
    ],
    bouton: 'Voir la mission',
    pied: 'Tu reçois ce message car les alertes de missions sont activées. Pour les couper : onglet Profil de l’app, rubrique Adresse e-mail.',
  },
  extra_trouve: {
    sujet: 'Extra trouvé : {extra}, {jour}',
    paragraphes: [
      'Bonjour,',
      '{extra} a accepté votre mission {poste} du {jour}, de {horaire}, chez {restaurant}.',
      'Il reste à signer le contrat d’extra, puis à faire la DPAE avant le début de la mission.',
    ],
    bouton: 'Signer le contrat',
    pied: PIED_PRO,
  },
  contrat_a_signer: {
    sujet: 'Ton contrat du {jour} est à signer',
    paragraphes: [
      'Bonjour {prenom},',
      '{restaurant} a signé ton contrat d’extra pour la mission {poste} du {jour}, de {horaire}.',
      'Signe-le à ton tour dans l’app, avant le début de la mission.',
    ],
    bouton: 'Signer mon contrat',
    pied: PIED_EXTRA,
  },
  rappel_extra: {
    sujet: 'Demain : {poste} chez {restaurant}',
    paragraphes: [
      'Bonjour {prenom},',
      'Petit rappel : demain, {jour}, mission {poste} chez {restaurant} à {commune}, de {horaire}.',
      'L’adresse et l’itinéraire sont dans l’app. Un empêchement ? Préviens au plus vite depuis l’app.',
    ],
    bouton: 'Voir ma mission',
    pied: PIED_EXTRA,
  },
  rappel_pro: {
    sujet: 'Demain : {extra} en extra chez {restaurant}',
    paragraphes: [
      'Bonjour,',
      'Rappel : demain, {jour}, {extra} sera en extra chez {restaurant} pour la mission {poste}, de {horaire}.',
      'Pensez à la DPAE si ce n’est pas encore fait.',
    ],
    bouton: 'Voir la mission',
    pied: PIED_PRO,
  },
};

/** Alertes de missions par e-mail, réglées dans l'onglet Profil de l'app extra. */
export const textesAlertes = {
  libelle: 'Me prévenir par e-mail des nouvelles missions près de chez moi',
  aide: 'Il faut une adresse confirmée. Les missions sur tes créneaux de l’onglet Dispos, ou toutes si tu n’en as indiqué aucun.',
  erreur: 'Réglage non enregistré. Vérifie ta connexion et réessaie.',
} as const;
