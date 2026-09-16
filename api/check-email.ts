import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Basic per-IP throttle. In-memory only (resets on cold start / across
// serverless instances) — not a hard guarantee, but it blunts casual
// scripted enumeration. Same-severity precedent already exists in
// SignupPage.tsx, which reveals "Un compte existe déjà" on a duplicate
// signup attempt; this endpoint formalizes that same signal for the login
// flow rather than introducing a new class of leak.
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_PER_WINDOW
}

/**
 * Powers the "email first" login/signup flow: tells the client whether to
 * reveal a password field (existing account) or a signup form (new email),
 * instead of the merchant having to guess which page to land on. Reads
 * auth.users via the email_has_account() SECURITY DEFINER function, which
 * has no execute grant for anon/authenticated — only reachable here, with
 * the service_role key.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Trop de tentatives, réessaie dans une minute.' })
    return
  }

  const { email } = req.body ?? {}
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Email invalide.' })
    return
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('email_has_account', { p_email: email.trim().toLowerCase() })
    if (error) throw error
    res.status(200).json({ exists: !!data })
  } catch (err) {
    console.error('check-email failed', err)
    res.status(500).json({ error: 'Erreur inconnue.' })
  }
}
