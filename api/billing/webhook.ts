import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getWaveCheckoutSession } from '../_lib/wave.js'
import { settlePaymentFromWaveSession } from '../_lib/settlePayment.js'

// Wave signs the *raw* request body — re-serializing a parsed object changes
// key order/whitespace and breaks the signature (documented pitfall on
// docs.wave.com/business/webhook). Body parsing must stay off here.
export const config = { api: { bodyParser: false } }

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

const MAX_SIGNATURE_AGE_SECONDS = 5 * 60

function verifyWaveSignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header) return false
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]))
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > MAX_SIGNATURE_AGE_SECONDS) return false

  const expected = createHmac('sha256', secret).update(timestamp + rawBody).digest('hex')
  const expectedBuf = Buffer.from(expected, 'utf8')
  const signatureBuf = Buffer.from(signature, 'utf8')
  if (expectedBuf.length !== signatureBuf.length) return false
  return timingSafeEqual(expectedBuf, signatureBuf)
}

/**
 * Reconciliation safety net for `confirm.ts`: covers the case where a
 * merchant closes the tab before returning from Wave. Optional in practice —
 * only registerable in the Wave Business Portal once its Developer section
 * is enabled for the account — but both paths write through the same
 * idempotent `settlePaymentFromWaveSession`, so having one, the other, or
 * both firing for the same payment is all equally safe.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const webhookSecret = process.env.WAVE_WEBHOOK_SECRET
  if (!webhookSecret) {
    // Not configured yet for this account — accept nothing rather than skip verification.
    res.status(503).json({ error: 'Webhook not configured.' })
    return
  }

  const rawBody = await readRawBody(req)
  const signatureHeader = req.headers['wave-signature'] as string | undefined

  if (!verifyWaveSignature(rawBody, signatureHeader, webhookSecret)) {
    res.status(401).json({ error: 'Invalid signature.' })
    return
  }

  try {
    const event = JSON.parse(rawBody)
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.payment_failed') {
      // The event payload is a partial Checkout Session — fetch the full,
      // authoritative one rather than trusting webhook contents directly.
      const session = await getWaveCheckoutSession(event.data.id)
      await settlePaymentFromWaveSession(session)
    }
    res.status(200).json({ received: true })
  } catch (err) {
    console.error('webhook processing failed', err)
    // Still 200: Wave retries on non-2xx for up to 3 days, and confirm.ts is
    // the primary path anyway — no need to trigger a retry storm here.
    res.status(200).json({ received: true, processed: false })
  }
}
