/** Balises des pages légales : source unique pour les pages, le prérendu et les aperçus de partage (api/og.ts). */
export const LEGAL_META: Record<string, { title: string; description: string }> = {
  'legal/cgu': {
    title: "Conditions générales d'utilisation — Bitiko",
    description:
      "Conditions d'utilisation de Bitiko : création d'espace, commandes, rendez-vous, plans et tarifs, responsabilités. Plateforme pour les activités d'Afrique de l'Ouest.",
  },
  'legal/confidentialite': {
    title: 'Politique de confidentialité — Bitiko',
    description:
      'Comment Bitiko protège vos données : compte, commandes, rendez-vous, équipe, finances. Hébergement, sous-traitants, durée de conservation et vos droits.',
  },
}
