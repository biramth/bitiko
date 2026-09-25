import { useQuery } from '@tanstack/react-query'
import type { PromoOffer } from '@/services/billing.service'

/** Live landing-page promo campaign, or null (none / error). Exposes the
 *  loading state so the banner can reserve its slot while fetching — the
 *  bar popping in late was the page's CLS source and LCP element.
 *  billing.service (supabase-js) is dynamic-imported so the landing chunk
 *  itself stays free of the Supabase client. */
export function useLandingPromo(): { promo: PromoOffer | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['landing-promo'],
    queryFn: () => import('@/services/billing.service').then((m) => m.getLandingPromo()),
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
