/** Balises des pages légales : source unique pour les pages, le prérendu et les aperçus de partage (api/og.ts). */
export const LEGAL_META: Record<string, { title: string; description: string }> = {
  'legal/cgu': {
    title: "Conditions générales d'utilisation — Bitiko",
    description:
      "Conditions d'utilisation de Bitiko : création d'espace, commandes, rendez-vous, plans et tarifs, responsabilités.",
  },
  'legal/confidentialite': {
    title: 'Politique de confidentialité — Bitiko',
    description:
      'Comment Bitiko protège vos données : compte, commandes, rendez-vous, équipe, finances. Hébergement, sous-traitants, durée de conservation et vos droits.',
  },
  'legal/cookies': {
    title: 'Politique cookies — Bitiko',
    description:
      'Quels traceurs Bitiko utilise, pourquoi, combien de temps, et comment accepter, refuser ou retirer votre consentement.',
  },
  'legal/mentions-legales': {
    title: 'Mentions légales — Bitiko',
    description:
      "Identité de l'éditeur de Bitiko, contact, hébergement et propriété intellectuelle.",
  },
  'legal/cgv': {
    title: 'Conditions générales de vente — Bitiko',
    description:
      'Règles des achats sur les boutiques Bitiko : prix, commande, paiement, livraison, rétractation, garanties et litiges.',
  },
  'legal/accessibilite': {
    title: 'Accessibilité — Bitiko',
    description:
      "Engagement d'accessibilité de Bitiko, état de conformité et contact pour signaler un problème.",
  },
}
