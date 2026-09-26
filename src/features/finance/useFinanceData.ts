import { useQuery } from '@tanstack/react-query'
import { getRevenueByMonth, getTopItems, listFinanceEntries } from '@/services/finance.service'
import { buildBilan } from './bilan'
import type { Period } from './periods'

/** Bilan d'une période : recettes automatiques + journal, calculés côté client à partir de
 *  deux requêtes légères (agrégats mensuels et saisies). `enabled=false` pour une période
 *  verrouillée par le plan : aucune donnée n'est même demandée. */
export function useBilan(shopId: string | undefined, period: Period, enabled = true) {
  const active = !!shopId && enabled

  const revenue = useQuery({
    queryKey: ['finance', 'revenue', shopId, period.from, period.to],
    queryFn: () => getRevenueByMonth(shopId!, period.from, period.to),
    enabled: active,
  })
  const entries = useQuery({
    queryKey: ['finance', 'entries', shopId, period.from, period.to],
    queryFn: () => listFinanceEntries(shopId!, period.from, period.to),
    enabled: active,
  })

  const isLoading = active && (revenue.isLoading || entries.isLoading)
  const isError = revenue.isError || entries.isError
  const bilan =
    revenue.data && entries.data ? buildBilan({ period, revenueRows: revenue.data, entries: entries.data }) : null

  return { bilan, entries: entries.data ?? [], isLoading, isError }
}

export function useTopItems(shopId: string | undefined, period: Period, enabled = true) {
  return useQuery({
    queryKey: ['finance', 'top', shopId, period.from, period.to],
    queryFn: () => getTopItems(shopId!, period.from, period.to, 5),
    enabled: !!shopId && enabled,
  })
}
