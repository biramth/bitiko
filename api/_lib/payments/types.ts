import type { WaveCheckoutSession } from '../wave.js'

/** Canonical engine-level payment status — every provider maps its own
 *  vocabulary onto this. Mirrors the wave_payments status check. */
export type EnginePaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled'

export interface CreatePaymentInput {
  shopId: string
  plan: string
  amount: number
  currency: string
  clientReference: string
  successUrl: string
  errorUrl: string
}

export interface CreatedPayment {
  /** Where to send the payer (Wave launch URL, Orange Money deep link…). */
  launchUrl: string | null
  /** Provider-side reference (wave_checkout_id…). */
  providerRef: string | null
}

/**
 * PaymentProvider — the interface every provider implements (mission §35).
 * Provider-specific details never leak above this boundary: the application
 * only ever talks Engine + this interface, so adding Orange Money or an
 * aggregator means a new implementation, never a Billing rewrite.
 */
export interface PaymentProvider {
  readonly code: string
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>
  getPaymentStatus(providerRef: string): Promise<EnginePaymentStatus>
  cancelPayment?(providerRef: string): Promise<void>
  refundPayment?(providerTxn: string, amount?: number): Promise<void>
  reconcile?(clientReference: string): Promise<{ matches: boolean; details: Record<string, unknown> }>
}

/** Wave exposes no cancel/refund/reconcile endpoints on the Checkout API we
 *  use — those operations stay manual (backoffice + provider portal) until a
 *  fuller integration exists. Calling one throws `not_supported`, never a
 *  silent partial behavior. */
export const PROVIDER_NOT_SUPPORTED = 'not_supported'

export type { WaveCheckoutSession }
