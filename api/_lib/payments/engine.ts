import { getSupabaseAdmin } from '../supabaseAdmin.js'

/**
 * Engine-side bookkeeping (PHASE-11). Every function here is BEST-EFFORT and
 * never throws: the money path (wave_payments + settle) is untouched and must
 * never fail because an engine mirror insert did. wave_payments stays the
 * system of record until a provider cutover — these rows are the engine's
 * provider-agnostic view, reconciliation input, and tomorrow's analytics.
 */

interface MirrorInput {
  providerCode: string
  shopId: string
  plan: string
  amount: number
  currency: string
  clientReference: string
  providerRef: string | null
}

export async function recordTransaction(input: MirrorInput): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('payment_transactions').insert({
      provider_code: input.providerCode,
      shop_id: input.shopId,
      plan: input.plan,
      amount: input.amount,
      currency: input.currency,
      client_reference: input.clientReference,
      status: 'pending',
      provider_ref: input.providerRef,
    })
    if (error) throw error
  } catch (err) {
    console.error('payment engine recordTransaction failed (non-blocking)', err)
  }
}

export async function mirrorStatus(
  clientReference: string,
  status: 'succeeded' | 'failed',
  providerTxn: string | null,
): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    const patch: Record<string, unknown> = { status }
    if (providerTxn) patch.provider_txn = providerTxn
    if (status === 'succeeded') patch.completed_at = new Date().toISOString()
    const { error } = await admin
      .from('payment_transactions')
      .update(patch)
      .eq('client_reference', clientReference)
    if (error) throw error
  } catch (err) {
    console.error('payment engine mirrorStatus failed (non-blocking)', err)
  }
}

export async function logWebhook(input: {
  providerCode: string
  eventType: string
  payload: unknown
  signatureValid: boolean
}): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('payment_webhooks').insert({
      provider_code: input.providerCode,
      event_type: input.eventType,
      payload: (input.payload ?? {}) as Record<string, unknown>,
      signature_valid: input.signatureValid,
      processed: false,
    })
    if (error) throw error
  } catch (err) {
    console.error('payment engine logWebhook failed (non-blocking)', err)
  }
}
