import { useQuery } from '@tanstack/react-query'
import type { PromoOffer } from '@/services/billing.service'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Same call as billing.service.getLandingPromo (public `get_landing_promo`
 * RPC with the anon key — identical security posture), but over plain fetch:
 * the landing page must not download the ~200 Ko supabase-js client just to
 * read one banner row. The promo text is the page's LCP element, so skipping
 * that download cuts its render delay by a full round-trip chain.
 */
async function fetchLandingPromo(): Promise<PromoOffer | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase non configuré.')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_landing_promo`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  if (!res.ok) throw new Error(`Promo indisponible (${res.status}).`)
  const data = (await res.json()) as PromoOffer[]
  return data[0] ?? null
}

/** Live landing-page promo campaign, or null (none / error). Exposes the
 *  loading state so the banner can reserve its slot while fetching — the
 *  bar popping in late was the page's CLS source and LCP element. */
export function useLandingPromo(): { promo: PromoOffer | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['landing-promo'],
    queryFn: fetchLandingPromo,
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
