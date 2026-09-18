import { useQuery } from '@tanstack/react-query'
import { getLandingPromo, type PromoOffer } from '@/services/billing.service'

/** Live landing-page promo campaign, or null (none / error). */
export function useLandingPromo(): PromoOffer | null {
  const { data } = useQuery({
    queryKey: ['landing-promo'],
    queryFn: getLandingPromo,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  return data ?? null
}

export function formatPromoDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
