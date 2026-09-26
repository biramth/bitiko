export interface Vertical {
  key: string
  label: string
  description: string
}

/**
 * Les 10 groupes d'activité — choisis à l'onboarding, modifiables ensuite
 * dans Réglages. Les clés correspondent aux slugs du référentiel
 * `business_types` (migration 0116) ; le fallback local (DB indisponible)
 * passe par `availableVerticals` dans storeTemplates.ts, qui ne retient que
 * les groupes ayant au moins un gabarit.
 */
export const VERTICALS: Vertical[] = [
  { key: 'restauration', label: 'Restauration', description: 'Restaurant, traiteur, fast-food, snack, pâtisserie, boulangerie, café, food truck, livraison de repas.' },
  { key: 'mode', label: 'Mode & Habillement', description: 'Vêtements, prêt-à-porter, friperie, chaussures, accessoires, sacs, bijoux, lingerie, couture.' },
  { key: 'beaute', label: 'Beauté & Bien-être', description: 'Coiffure, barber, institut de beauté, maquillage, onglerie, parfumerie, soins, spa, massage.' },
  { key: 'epicerie', label: 'Commerce général', description: 'Épicerie, supérette, alimentation, boutique généraliste, grossiste, bazar.' },
  { key: 'tech', label: 'Électronique & Technologie', description: 'Téléphones, accessoires, informatique, électronique, réparation, consoles, gaming.' },
  { key: 'deco', label: 'Maison & Décoration', description: 'Meubles, décoration, ameublement, literie, cuisine, luminaires, rideaux, tapis.' },
  { key: 'cosmetiques', label: 'Cosmétiques & Soins', description: 'Cosmétiques, produits capillaires, skincare, huiles, savons, produits naturels, parfums.' },
  { key: 'epicerie_fine', label: 'Alimentation & Épicerie fine', description: 'Produits locaux, chocolaterie, épices, fruits et légumes, viande, poisson, artisanat gourmand.' },
  { key: 'fleurs_cadeaux', label: 'Fleurs & Cadeaux', description: 'Fleuriste, bouquets, cadeaux, coffrets, personnalisation, événementiel.' },
  { key: 'artisanat', label: 'Artisanat & Création', description: 'Poterie, maroquinerie, sculpture, peinture, objets faits main, créations personnalisées.' },
]

export const VERTICAL_BY_KEY: Record<string, Vertical> = Object.fromEntries(
  VERTICALS.map((vertical) => [vertical.key, vertical]),
)
