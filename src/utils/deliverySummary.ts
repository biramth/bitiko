import type { DeliverySecteur, DeliveryVille } from '@/types'

export type DeliverySummary =
  /** Aucune zone tarifée : livraison ou retrait à convenir avec le vendeur. */
  | { kind: 'arranged' }
  | { kind: 'zones'; minFee: number; maxFee: number; freeAbove: number | null }

/** Ce que la boutique promet côté livraison, d'après ses zones actives — une
 *  ville n'est desservie que si elle et son secteur sont actifs (même règle
 *  que le checkout). */
export function summarizeDelivery(
  secteurs: Pick<DeliverySecteur, 'id' | 'fee' | 'is_active'>[],
  villes: Pick<DeliveryVille, 'secteur_id' | 'is_active'>[],
  freeDeliveryThreshold: number | null | undefined,
): DeliverySummary {
  const served = secteurs.filter((s) => s.is_active && villes.some((v) => v.is_active && v.secteur_id === s.id))
  if (served.length === 0) return { kind: 'arranged' }
  const fees = served.map((s) => Math.max(0, Number(s.fee ?? 0)))
  const threshold = freeDeliveryThreshold != null ? Number(freeDeliveryThreshold) : null
  return {
    kind: 'zones',
    minFee: Math.min(...fees),
    maxFee: Math.max(...fees),
    freeAbove: threshold != null && threshold > 0 ? threshold : null,
  }
}

/** Phrase courte pour la ligne « Livraison » (fiche produit, panier). */
export function describeDelivery(summary: DeliverySummary, formatMoney: (amount: number) => string): string {
  if (summary.kind === 'arranged') return 'Livraison ou retrait à convenir avec le vendeur'
  const { minFee, maxFee, freeAbove } = summary
  const base =
    maxFee === 0
      ? 'Livraison gratuite'
      : minFee === maxFee
        ? `Livraison ${formatMoney(minFee)}`
        : minFee === 0
          ? `Livraison gratuite ou jusqu’à ${formatMoney(maxFee)} selon votre ville`
          : `Livraison dès ${formatMoney(minFee)} selon votre ville`
  return freeAbove && maxFee > 0 ? `${base}, offerte dès ${formatMoney(freeAbove)} d’achat` : base
}
