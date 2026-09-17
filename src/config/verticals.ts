export interface Vertical {
  key: string
  label: string
  description: string
}

/**
 * Business types a merchant can operate in — chosen at onboarding, and
 * changeable later from Réglages. A shop's `business_type` is independent of
 * `template_id`: switching to another template within the same vertical
 * never touches it, and switching vertical is what unlocks browsing
 * templates outside the shop's current one (see storeTemplates.ts).
 *
 * Bitiko targets around 6 verticals long-term; only the ones with at least
 * one template in STORE_TEMPLATES are ever shown to a merchant (see
 * `availableVerticals` in storeTemplates.ts) — listing a vertical here ahead
 * of its templates would just be a dead end in the UI.
 */
export const VERTICALS: Vertical[] = [
  { key: 'mode', label: 'Mode', description: 'Vêtements, accessoires, chaussures…' },
  { key: 'epicerie', label: 'Épicerie', description: 'Alimentation, produits frais, essentiels du quotidien.' },
  { key: 'beaute', label: 'Beauté', description: 'Cosmétiques, soins, parfums.' },
  { key: 'tech', label: 'High-Tech', description: 'Électronique, téléphonie, électroménager.' },
]

export const VERTICAL_BY_KEY: Record<string, Vertical> = Object.fromEntries(
  VERTICALS.map((vertical) => [vertical.key, vertical]),
)
