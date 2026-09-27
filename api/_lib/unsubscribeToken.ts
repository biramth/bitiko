import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Jeton de désabonnement des campagnes : signé, sans session (le lien est
 * cliqué depuis une boîte mail, jamais connecté). Réutilise
 * SUPABASE_SERVICE_ROLE_KEY comme clé HMAC — déjà un secret serveur long et
 * aléatoire, pas de nouvelle variable d'environnement à configurer pour ça.
 */
function secret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.')
  return key
}

export function signUnsubscribeToken(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('hex')
}

/** Comparaison à temps constant — un jeton de désabonnement reste un secret vérifiable. */
export function isValidUnsubscribeToken(userId: string, token: string): boolean {
  const expected = Buffer.from(signUnsubscribeToken(userId), 'hex')
  let received: Buffer
  try {
    received = Buffer.from(token, 'hex')
  } catch {
    return false
  }
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export function buildUnsubscribeUrl(origin: string, userId: string): string {
  const token = signUnsubscribeToken(userId)
  return `${origin}/api/campaigns/unsubscribe?u=${encodeURIComponent(userId)}&t=${token}`
}
