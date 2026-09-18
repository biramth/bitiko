import { useMutation, useQueryClient } from '@tanstack/react-query'
import { redeemPromo } from '@/services/billing.service'
import { PLANS } from '@/config/plans'
import type { PlanKey } from '@/types/billing'
import { useToast } from '@/components/ui/Toast'

/** Redeems the current offer (no code) or a typed promo code, then refreshes
 *  the plan everywhere (useShopPlan reads ['shop-subscription', shopId]). */
export function useRedeemPromo(shopId: string, plan?: Exclude<PlanKey, 'free'>, onDone?: () => void) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (code?: string) => redeemPromo(shopId, code),
    onSuccess: (periodEnd) => {
      const date = new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      toast.success(plan ? `Plan ${PLANS[plan].label} activé jusqu'au ${date}` : `Code appliqué : plan actif jusqu'au ${date}`)
      queryClient.invalidateQueries({ queryKey: ['promo-offer', shopId] })
      queryClient.invalidateQueries({ queryKey: ['shop-subscription', shopId] })
      onDone?.()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Impossible d\'appliquer le code.'),
  })
}
