import { useQuery } from '@tanstack/react-query'
import { getShopSubscription } from '@/services/billing.service'
import { effectivePlan, effectivePlanKey } from '@/config/plans'

/** The shop's currently-in-force plan (an expired Pro subscription silently reads back as free). */
export function useShopPlan(shopId: string | undefined) {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['shop-subscription', shopId],
    queryFn: () => getShopSubscription(shopId as string),
    enabled: !!shopId,
  })

  return {
    isLoading,
    subscription: subscription ?? null,
    plan: effectivePlan(subscription),
    planKey: effectivePlanKey(subscription),
  }
}
