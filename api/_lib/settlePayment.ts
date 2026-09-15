import { getSupabaseAdmin } from './supabaseAdmin.js'
import { sendEmail } from './resendEmail.js'
import { proActivatedEmailHtml } from './emailTemplates.js'
import type { WaveCheckoutSession } from './wave.js'

const SUBSCRIPTION_PERIOD_DAYS = 30

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
    const periodEnd = new Date(Date.now() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { error: updatePaymentError } = await admin
      .from('wave_payments')
      .update({
        status: 'succeeded',
        wave_transaction_id: session.transaction_id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
    if (updatePaymentError) throw updatePaymentError

    const { error: upsertSubError } = await admin
      .from('shop_subscriptions')
      .upsert(
        { shop_id: payment.shop_id, plan: payment.plan, status: 'active', current_period_end: periodEnd },
        { onConflict: 'shop_id' },
      )
    if (upsertSubError) throw upsertSubError

    try {
      const { data: shop } = await admin.from('shops').select('name, owner_id').eq('id', payment.shop_id).maybeSingle()
      const { data: ownerData } = shop ? await admin.auth.admin.getUserById(shop.owner_id) : { data: { user: null } }
      const rootDomain = process.env.VITE_ROOT_DOMAIN
      if (shop && ownerData.user?.email && rootDomain) {
        await sendEmail({
          to: ownerData.user.email,
          subject: `Bienvenue dans Bitiko Pro — ${shop.name}`,
          html: proActivatedEmailHtml({
            origin: `https://${rootDomain}`,
            shopName: shop.name,
            periodEndLabel: new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
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
    return 'failed'
  }

  return 'pending'
}
