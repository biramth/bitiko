import { createWaveCheckoutSession, getWaveCheckoutSession } from '../wave.js'
import {
  PROVIDER_NOT_SUPPORTED,
  type CreatedPayment,
  type CreatePaymentInput,
  type EnginePaymentStatus,
  type PaymentProvider,
  type WaveCheckoutSession,
} from './types.js'

/** Maps Wave's payment_status vocabulary onto the engine's. Pure — unit-tested. */
export function mapWaveStatus(paymentStatus: WaveCheckoutSession['payment_status']): EnginePaymentStatus {
  if (paymentStatus === 'succeeded') return 'succeeded'
  if (paymentStatus === 'cancelled') return 'failed'
  return 'pending'
}

/**
 * Wave as a PaymentProvider (kind TEMPORARY — see payment_providers seed).
 * Thin delegation to api/_lib/wave.ts: zero behavior change, the engine only
 * adds the interface boundary so the next provider slots in beside this one.
 */
export const waveProvider: PaymentProvider = {
  code: 'wave',

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const session = await createWaveCheckoutSession({
      amount: input.amount,
      currency: input.currency,
      clientReference: input.clientReference,
      successUrl: input.successUrl,
      errorUrl: input.errorUrl,
    })
    return { launchUrl: session.wave_launch_url, providerRef: session.id }
  },

  async getPaymentStatus(providerRef: string): Promise<EnginePaymentStatus> {
    const session = await getWaveCheckoutSession(providerRef)
    return mapWaveStatus(session.payment_status)
  },

  async cancelPayment(): Promise<void> {
    throw new Error(`${PROVIDER_NOT_SUPPORTED}: Wave Checkout has no cancel endpoint — handle in the provider portal.`)
  },

  async refundPayment(): Promise<void> {
    throw new Error(`${PROVIDER_NOT_SUPPORTED}: Wave Checkout has no refund endpoint — handle in the provider portal.`)
  },
}
