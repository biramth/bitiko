import { useQuery } from '@tanstack/react-query'
import { getLandingPromo, type PromoOffer } from '@/services/billing.service'

/** Live landing-page promo campaign, or null (none / error). Exposes the
 *  loading state so the banner can reserve its slot while fetching — the
 *  bar popping in late was the page's CLS source and LCP element. */
export function useLandingPromo(): { promo: PromoOffer | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['landing-promo'],
    queryFn: getLandingPromo,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  return { promo: data ?? null, isLoading }
}

export function formatPromoDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
