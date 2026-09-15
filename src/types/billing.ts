import type { Database } from './database.types.js'

export type PlanKey = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'past_due'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed'

// `plan`/`status` are plain `text` columns with check constraints, not real
// Postgres enums, so the generated Row types only know they're strings.
export type ShopSubscription = Omit<
  Database['public']['Tables']['shop_subscriptions']['Row'],
  'plan' | 'status'
> & { plan: PlanKey; status: SubscriptionStatus }

export type WavePayment = Omit<Database['public']['Tables']['wave_payments']['Row'], 'plan' | 'status'> & {
  plan: Extract<PlanKey, 'pro'>
  status: PaymentStatus
}
