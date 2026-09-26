import { PLANS, type PlanKey } from '../../src/config/plans.js'

export const SUBSCRIPTION_PERIOD_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

const PLAN_RANK: Record<PlanKey, number> = { free: 0, essential: 1, pro: 2 }

export interface CurrentSubscription {
  plan: string
  current_period_end: string | null
}

/** Plan et fin de période d'un abonnement encore en cours (null sinon). */
export function runningSubscription(
  current: CurrentSubscription | null | undefined,
  now: number = Date.now(),
): { plan: PlanKey; endsAt: number } | null {
  if (!current || !current.current_period_end || !(current.plan in PLANS) || current.plan === 'free') return null
  const endsAt = new Date(current.current_period_end).getTime()
  return endsAt > now ? { plan: current.plan as PlanKey, endsAt } : null
}

/** Payer un plan inférieur à celui en cours n'est pas un renouvellement : à
 *  refuser au checkout (sinon Essentiel à 3 000 F prolongerait un Pro à 10 000 F). */
export function isDowngradePurchase(
  current: CurrentSubscription | null | undefined,
  paidPlan: PlanKey,
  now: number = Date.now(),
): boolean {
  const running = runningSubscription(current, now)
  return !!running && PLAN_RANK[running.plan] > PLAN_RANK[paidPlan]
}

/**
 * Abonnement résultant d'un paiement réussi.
 *  - même plan encore actif : la période s'ajoute à la fin en cours (renouveler
 *    tôt ne fait perdre aucun jour) ;
 *  - plan supérieur (upgrade) : nouveau plan immédiatement, 30 jours à partir
 *    de maintenant ;
 *  - plan inférieur déjà payé malgré tout : le plan supérieur est conservé et
 *    la période prolongée (le marchand ne perd jamais ce qu'il vient de payer).
 */
export function nextSubscription(input: {
  current: CurrentSubscription | null | undefined
  paidPlan: PlanKey
  now?: number
}): { plan: PlanKey; periodEnd: string } {
  const now = input.now ?? Date.now()
  const running = runningSubscription(input.current, now)
  const period = SUBSCRIPTION_PERIOD_DAYS * DAY_MS

  if (running && PLAN_RANK[running.plan] > PLAN_RANK[input.paidPlan]) {
    return { plan: running.plan, periodEnd: new Date(running.endsAt + period).toISOString() }
  }
  const base = running && running.plan === input.paidPlan ? running.endsAt : now
  return { plan: input.paidPlan, periodEnd: new Date(base + period).toISOString() }
}
