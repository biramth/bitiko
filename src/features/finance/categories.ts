export type EntryKind = 'income' | 'expense'

export interface FinanceCategory {
  code: string
  label: string
  kind: EntryKind
  /** Exemple affiché dans le formulaire pour aider à choisir. */
  hint: string
}

/** Catégories de dépenses : peu nombreuses et parlantes, pas un plan comptable.
 *  Les codes sont stockés en base (`finance_entries.category`) : ne pas les renommer. */
export const EXPENSE_CATEGORIES: FinanceCategory[] = [
  { code: 'stock', label: 'Achats de marchandises', kind: 'expense', hint: 'Produits, matières premières, stock à revendre' },
  { code: 'loyer', label: 'Loyer et charges du local', kind: 'expense', hint: 'Loyer, gardiennage, entretien' },
  { code: 'salaires', label: 'Salaires et main-d’œuvre', kind: 'expense', hint: 'Employés, apprentis, prestataires' },
  { code: 'transport', label: 'Transport et livraison', kind: 'expense', hint: 'Carburant, livreurs, déplacements' },
  { code: 'energie', label: 'Électricité, eau, internet', kind: 'expense', hint: 'Factures et abonnements' },
  { code: 'marketing', label: 'Publicité et communication', kind: 'expense', hint: 'Réseaux sociaux, affiches, cartes de visite' },
  { code: 'materiel', label: 'Équipement et matériel', kind: 'expense', hint: 'Machines, outils, mobilier' },
  { code: 'frais_bancaires', label: 'Frais bancaires et mobile money', kind: 'expense', hint: 'Commissions, frais de retrait' },
  { code: 'taxes', label: 'Impôts et taxes', kind: 'expense', hint: 'Patente, TVA, cotisations' },
  { code: 'autres_depenses', label: 'Autres dépenses', kind: 'expense', hint: 'Tout le reste' },
]

/** Recettes saisies à la main : ce que Bitiko ne voit pas (les commandes en ligne
 *  et les rendez-vous terminés sont comptés automatiquement). */
export const INCOME_CATEGORIES: FinanceCategory[] = [
  { code: 'vente_comptoir', label: 'Ventes en boutique / au comptoir', kind: 'income', hint: 'Clients venus sans commander en ligne' },
  { code: 'autres_recettes', label: 'Autres recettes', kind: 'income', hint: 'Subvention, prêt reçu, vente de matériel…' },
]

export const FINANCE_CATEGORIES: FinanceCategory[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export const CATEGORY_BY_CODE: Record<string, FinanceCategory> = Object.fromEntries(FINANCE_CATEGORIES.map((c) => [c.code, c]))

/** Recettes comptées automatiquement (pas de catégorie saisissable). */
const AUTO_LABELS: Record<string, string> = {
  commandes_en_ligne: 'Ventes en ligne',
  prestations_terminees: 'Prestations terminées',
}

export function categoryLabel(code: string): string {
  return AUTO_LABELS[code] ?? CATEGORY_BY_CODE[code]?.label ?? 'Autre'
}

export function categoriesFor(kind: EntryKind): FinanceCategory[] {
  return kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export const PAYMENT_METHODS: { code: string; label: string }[] = [
  { code: 'cash', label: 'Espèces' },
  { code: 'mobile_money', label: 'Mobile money (Wave, Orange Money…)' },
  { code: 'bank', label: 'Banque / virement' },
  { code: 'other', label: 'Autre' },
]

export function paymentMethodLabel(code: string | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.code === code)?.label ?? ''
}
