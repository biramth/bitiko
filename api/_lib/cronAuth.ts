import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Cron/dispatch gate: fail CLOSED. Without CRON_SECRET configured the endpoint
 * refuses everything (a missing env var must never leave an email-sending
 * endpoint public), and the comparison is constant-time.
 */
export function isCronAuthorized(authorization: string | string[] | undefined): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || typeof authorization !== 'string') return false
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest()
  const received = createHash('sha256').update(authorization).digest()
  return timingSafeEqual(expected, received)
}
