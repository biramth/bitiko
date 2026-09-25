import type { PaymentProvider } from './types.js'
import { waveProvider } from './waveProvider.js'

/** Provider registry — the ONLY place that knows which providers exist.
 *  Adding Orange Money or an aggregator = implementing PaymentProvider +
 *  one line here + a payment_providers row. Nothing else changes. */
const PROVIDERS: Record<string, PaymentProvider> = {
  [waveProvider.code]: waveProvider,
}

export function getProvider(code: string): PaymentProvider {
  const provider = PROVIDERS[code]
  if (!provider) throw new Error(`Unknown payment provider: ${code}`)
  return provider
}

/** Today's default (and only) provider. Call sites never hardcode 'wave'. */
export function getDefaultProvider(): PaymentProvider {
  return getProvider('wave')
}
