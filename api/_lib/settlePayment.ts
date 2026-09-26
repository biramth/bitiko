import { getSupabaseAdmin } from './supabaseAdmin.js'
import { sendEmail } from './resendEmail.js'
import { proActivatedEmailHtml } from './emailTemplates.js'
import { mirrorStatus } from './payments/engine.js'
import { PLANS, type PlanKey } from '../../src/config/plans.js'
import { nextSubscription } from './subscriptionPeriod.js'
import type { WaveCheckoutSession } from './wave.js'

export type SettleResult = 'succeeded' | 'pending' | 'failed'

/**
 * Applies a Wave checkout session's outcome to our own tables. Called from
 * both `confirm.ts` (customer's return trip) and `webhook.ts` (Wave's own
 * notification) — idempotent by `client_reference`, so whichever arrives
 * first does the work and the other is a harmless no-op.
 */
export async function settlePaymentFromWaveSession(session: WaveCheckoutSession): Promise<SettleResult> {
  const admin = getSupabaseAdmin()
  const clientReference = session.client_reference
  if (!clientReference) throw new Error('Checkout session has no client_reference.')

  const { data: payment, error: paymentError } = await admin
    .from('wave_payments')
    .select('*')
    .eq('client_reference', clientReference)
    .maybeSingle()
  if (paymentError) throw paymentError
  if (!payment) throw new Error(`No payment row for client_reference ${clientReference}`)

  if (payment.status === 'succeeded') return 'succeeded'

  if (session.payment_status === 'succeeded') {
    // La session Wave est l'autorité : elle doit correspondre à ce que NOUS
    // avons demandé (montant + devise), jamais seulement à la référence.
    if (Number(session.amount) !== Number(payment.amount) || session.currency !== payment.currency) {
      console.error('settlePayment: amount/currency mismatch', { clientReference, expected: payment.amount, got: session.amount })
      throw new Error(`Payment ${clientReference}: amount or currency does not match the checkout session.`)
    }

    // Prise en charge atomique : confirm.ts et le webhook peuvent arriver en
    // même temps ; un seul des deux passe de « pending » à « succeeded » et
    // applique l'abonnement (pas de double prolongation ni de double email).
    const { data: claimed, error: claimError } = await admin
      .from('wave_payments')
      .update({
        status: 'succeeded',
        wave_transaction_id: session.transaction_id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .neq('status', 'succeeded')
      .select('id')
    if (claimError) throw claimError
    if (!claimed || claimed.length === 0) return 'succeeded'

    // Engine mirror (best-effort, never blocks the money path).
    await mirrorStatus(clientReference, 'succeeded', session.transaction_id ?? null)

    const { data: currentSub } = await admin
      .from('shop_subscriptions')
      .select('plan, current_period_end')
      .eq('shop_id', payment.shop_id)
      .maybeSingle()
    const next = nextSubscription({ current: currentSub, paidPlan: payment.plan as PlanKey })
    const periodEnd = next.periodEnd

    const { error: upsertSubError } = await admin
      .from('shop_subscriptions')
      .upsert(
        { shop_id: payment.shop_id, plan: next.plan, status: 'active', current_period_end: periodEnd },
        { onConflict: 'shop_id' },
      )
    if (upsertSubError) {
      // Argent encaissé mais abonnement non appliqué : on rend la main au
      // prochain passage (confirm/webhook) en remettant le paiement en attente.
      await admin.from('wave_payments').update({ status: 'pending', completed_at: null }).eq('id', payment.id)
      throw upsertSubError
    }

    try {
      const { data: shop } = await admin.from('shops').select('name, owner_id').eq('id', payment.shop_id).maybeSingle()
      const { data: ownerData } = shop ? await admin.auth.admin.getUserById(shop.owner_id) : { data: { user: null } }
      const rootDomain = process.env.VITE_ROOT_DOMAIN
      if (shop && ownerData.user?.email && rootDomain) {
        await sendEmail({
          to: ownerData.user.email,
          subject: `Bienvenue dans Bitiko ${PLANS[payment.plan as keyof typeof PLANS].label} — ${shop.name}`,
          html: proActivatedEmailHtml({
            origin: `https://${rootDomain}`,
            shopName: shop.name,
            periodEndLabel: new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
            planLabel: PLANS[payment.plan as keyof typeof PLANS].label,
          }),
        })
      }
    } catch (emailErr) {
      console.error('settlePayment: confirmation email failed', emailErr)
    }

    return 'succeeded'
  }

  if (session.payment_status === 'cancelled') {
    const { error: updateFailedError } = await admin
      .from('wave_payments')
      .update({ status: 'failed' })
      .eq('id', payment.id)
    if (updateFailedError) throw updateFailedError
    // Engine mirror (best-effort, never blocks the money path).
    await mirrorStatus(clientReference, 'failed', null)
    return 'failed'
  }

  return 'pending'
}
