/**
 * Onglet Messages de l'espace admin : e-mail écrit à la main aux extras ou aux établissements,
 * envoyé par le VPS (deploy/vps/notifications.sh) depuis la boîte de Kivien. {prenom} est remplacé
 * par le prénom de l'extra. Les pieds de message sont repris mot pour mot par le script (testé).
 */

export type PublicMessage = 'extras' | 'etablissements';

export const textesMessages = {
  intro:
    'Un e-mail aux extras ou aux établissements, envoyé depuis bonjour@kivien.re dans la minute.',
  publics: { extras: 'Extras', etablissements: 'Établissements' } satisfies Record<
    PublicMessage,
    string
  >,
  destinataires: 'Destinataires',
  toutCocher: 'Tout cocher',
  toutDecocher: 'Tout décocher',
  sansAdresse: 'Pas d’adresse e-mail confirmée',
  sujet: 'Sujet',
  message: 'Message',
  aidePrenom:
    '{prenom} est remplacé par le prénom de l’extra. Une ligne vide sépare deux paragraphes ; une ligne qui commence par « - » fait une liste.',
  modele: 'Reprendre le message de bienvenue',
  envoyer: (n: number) =>
    n > 1
      ? `Envoyer à ${n} personnes`
      : n === 1
        ? 'Envoyer à 1 personne'
        : 'Choisissez au moins une personne',
  confirmer: (n: number) => `Envoyer ce message à ${n} personne${n > 1 ? 's' : ''} ?`,
  programme: (n: number) =>
    `${n} e-mail${n > 1 ? 's' : ''} programmé${n > 1 ? 's' : ''}, envoyé${n > 1 ? 's' : ''} dans la minute.`,
  erreur: 'Message non programmé. Vérifiez la connexion et réessayez.',
  historique: 'Messages envoyés',
  avancement: (envoyes: number, total: number) =>
    `${envoyes} sur ${total} envoyé${envoyes > 1 ? 's' : ''}`,
  attente: (n: number) => `${n} en attente`,
  echecs: (n: number) => `${n} échec${n > 1 ? 's' : ''}`,
  aucunMessage: 'Aucun message envoyé pour l’instant.',
} as const;

/** Pied des e-mails (repris par le script du VPS). */
export const PIEDS_MESSAGE: Record<PublicMessage, string> = {
  extras:
    'Tu reçois ce message car tu as un compte extra sur Kivien. Une question ? Réponds simplement à cet e-mail.',
  etablissements:
    'Vous recevez ce message car votre établissement a un compte sur Kivien. Une question ? Répondez simplement à cet e-mail.',
};

/** Message de bienvenue aux premiers extras, avant le lancement. */
export const modeleBienvenueExtras = {
  sujet: 'Bienvenue chez Kivien, tu fais partie des premiers',
  message: [
    'Bonjour {prenom},',
    'Merci pour ton inscription sur Kivien. Tu fais partie des tout premiers extras de l’île, avant même le lancement.',
    'Le lancement officiel arrive très bientôt. Les hôtels, restaurants et autres établissements publieront leurs missions près de chez toi, et tu les recevras en priorité.',
    'D’ici là, deux choses donnent envie aux établissements de te choisir :\n- indiquer tes créneaux libres dans l’onglet Dispos ;\n- compléter ton profil (photo, métiers, expérience).',
    'Une petite question : comment as-tu connu Kivien ? Ta réponse nous aide à savoir où en parler.',
    'À très vite,\nL’équipe Kivien',
  ].join('\n\n'),
} as const;

/** {prenom} remplacé par le prénom (retiré proprement sans prénom), comme le script du VPS. */
export function personnaliserMessage(texte: string, prenom: string | null): string {
  const p = (prenom ?? '').trim();
  return p
    ? texte.replaceAll('{prenom}', p)
    : texte.replaceAll(' {prenom}', '').replaceAll('{prenom}', '');
}

/** Lien WhatsApp vers un mobile (« +262692… »), avec le message déjà écrit. */
export function lienWhatsApp(telephone: string, texte = ''): string {
  const numero = telephone.replace(/\D/g, '');
  return `https://wa.me/${numero}${texte ? `?text=${encodeURIComponent(texte)}` : ''}`;
}

/** Lien SMS (iPhone et Android) avec le message déjà écrit. */
export function lienSms(telephone: string, texte = ''): string {
  return `sms:${telephone.replace(/[^\d+]/g, '')}${texte ? `?&body=${encodeURIComponent(texte)}` : ''}`;
}

export const textesMessagesMobile = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  aide: 'Sans adresse e-mail : envoyez le message depuis votre téléphone, par WhatsApp ou SMS, déjà écrit avec le prénom.',
} as const;
