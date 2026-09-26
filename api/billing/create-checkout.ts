import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertShopOwner, getSupabaseAdmin, getUserIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { getDefaultProvider } from '../_lib/payments/registry.js'
import { recordTransaction } from '../_lib/payments/engine.js'
import { PLANS, type PlanKey } from '../../src/config/plans.js'
import { isDowngradePurchase } from '../_lib/subscriptionPeriod.js'

/**
 * Starts a Wave checkout for a shop's paid subscription. Only ever called
 * from the authenticated billing page — the actual plan/price come from our
 * own config, never from the request body, so a tampered request can't buy
 * a different amount than the real price.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const userId = await getUserIdFromAuthHeader(req.headers.authorization)
    if (!userId) {
      res.status(401).json({ error: 'Non authentifié.' })
      return
    }

    const { shopId, plan: requestedPlan } = req.body ?? {}
    if (typeof shopId !== 'string' || !shopId) {
      res.status(400).json({ error: 'shopId manquant.' })
      return
    }

    const isOwner = await assertShopOwner(shopId, userId)
    if (!isOwner) {
      res.status(403).json({ error: 'Cette boutique ne vous appartient pas.' })
      return
    }

    if (requestedPlan !== 'essential' && requestedPlan !== 'pro') {
      res.status(400).json({ error: 'Plan payant invalide.' })
      return
    }
    const planKey: Exclude<PlanKey, 'free'> = requestedPlan
    const plan = PLANS[planKey]

    // Payer un plan inférieur à celui en cours n'est pas un renouvellement.
    const { data: currentSub } = await getSupabaseAdmin()
      .from('shop_subscriptions')
      .select('plan, current_period_end')
      .eq('shop_id', shopId)
      .maybeSingle()
    if (isDowngradePurchase(currentSub, planKey)) {
      res.status(409).json({
        error: `Votre abonnement ${PLANS[currentSub!.plan as PlanKey].label} est encore actif : attendez son échéance avant de passer à ${plan.label}.`,
      })
      return
    }
    const clientReference = `sub_${shopId}_${Date.now()}`
    const host = (req.headers.host ?? '').toString()
    const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
    const origin = `${proto}://${host}`

    // We generate client_reference ourselves *before* calling the provider, so it
    // can go straight into success_url — the provider session id doesn't exist
    // yet at this point, but the client_reference lets the billing page look
    // the payment row (and from it the provider ref) back up on return.
    // Routed through the Payment Engine (provider = Wave/TEMPORARY today):
    // same call, same behavior, plus the interface boundary for the next provider.
    const payment = await getDefaultProvider().createPayment({
      shopId,
      plan: plan.key,
      amount: plan.priceXof,
      currency: 'XOF',
      clientReference,
      successUrl: `${origin}/admin/parametres/facturation?reference=${clientReference}`,
      errorUrl: `${origin}/admin/parametres/facturation?paiement=echec`,
    })

    const admin = getSupabaseAdmin()
    const { error: insertError } = await admin.from('wave_payments').insert({
      shop_id: shopId,
      plan: plan.key,
      amount: plan.priceXof,
      currency: 'XOF',
      client_reference: clientReference,
      wave_checkout_id: payment.providerRef,
      status: 'pending',
    })
    if (insertError) throw insertError

    // Engine mirror (best-effort, never blocks): provider-agnostic record.
    await recordTransaction({
      providerCode: 'wave',
      shopId,
      plan: plan.key,
      amount: plan.priceXof,
      currency: 'XOF',
      clientReference,
      providerRef: payment.providerRef,
    })

    res.status(200).json({ waveLaunchUrl: payment.launchUrl })
  } catch (err) {
    console.error('create-checkout failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
