// Thin client for the Wave Business Checkout API (docs.wave.com/business/checkout).
// Amounts are strings with no decimal places for XOF, per Wave's Types section.

const WAVE_BASE_URL = 'https://api.wave.com'

export interface WaveCheckoutSession {
  id: string
  amount: string
  currency: string
  checkout_status: 'open' | 'complete' | 'expired'
  payment_status: 'processing' | 'cancelled' | 'succeeded'
  client_reference: string | null
  wave_launch_url: string
  transaction_id: string | null
  when_completed: string | null
  when_created: string
  when_expires: string
}

function waveApiKey(): string {
  const key = process.env.WAVE_API_KEY
  if (!key) throw new Error('WAVE_API_KEY is not configured on the server.')
  return key
}

async function waveFetch(path: string, init: RequestInit): Promise<WaveCheckoutSession> {
  const res = await fetch(`${WAVE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${waveApiKey()}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const body = (await res.json()) as { error?: { message?: string }; message?: string } & WaveCheckoutSession
  if (!res.ok) {
    const message = body?.error?.message ?? body?.message ?? `Wave API error (${res.status})`
    throw new Error(message)
  }
  return body
}

export function createWaveCheckoutSession(params: {
  amount: number
  currency: string
  clientReference: string
  successUrl: string
  errorUrl: string
}): Promise<WaveCheckoutSession> {
  return waveFetch('/v1/checkout/sessions', {
    method: 'POST',
    body: JSON.stringify({
      amount: String(Math.round(params.amount)),
      currency: params.currency,
      client_reference: params.clientReference,
      success_url: params.successUrl,
      error_url: params.errorUrl,
    }),
  })
}

export function getWaveCheckoutSession(id: string): Promise<WaveCheckoutSession> {
  return waveFetch(`/v1/checkout/sessions/${id}`, { method: 'GET' })
}
