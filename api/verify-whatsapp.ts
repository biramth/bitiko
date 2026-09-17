import { createHash, randomInt } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin, getUserIdFromAuthHeader } from './_lib/supabaseAdmin.js'
import { sendWhatsAppOtp } from './_lib/whatsappCloudApi.js'

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,}$/

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/**
 * OTP verification of a merchant's shop WhatsApp number during onboarding
 * (see whatsapp_verifications, table since 0020, functions since 0043).
 * `action: 'send'` issues a fresh 6-digit code via the WhatsApp Cloud API;
 * `action: 'check'` verifies it. Both are rate-limited atomically in
 * Postgres (whatsapp_otp_request/whatsapp_otp_verify) — this endpoint only
 * generates the code and talks to Meta, never trusts a client-supplied
 * count.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userId = await getUserIdFromAuthHeader(req.headers.authorization)
  if (!userId) {
    res.status(401).json({ error: 'Non authentifié.' })
    return
  }

  const { action, phone, code } = req.body ?? {}
  if (typeof phone !== 'string' || !PHONE_RE.test(phone.trim())) {
    res.status(400).json({ error: 'Numéro WhatsApp invalide.' })
    return
  }
  const normalizedPhone = normalizePhone(phone)

  try {
    const admin = getSupabaseAdmin()

    if (action === 'send') {
      const otp = randomInt(0, 1_000_000).toString().padStart(6, '0')
      const { data: allowed, error } = await admin.rpc('whatsapp_otp_request', {
        p_user_id: userId,
        p_phone: normalizedPhone,
        p_code_hash: hashCode(otp),
      })
      if (error) throw error
      if (!allowed) {
        res.status(429).json({ error: 'Trop de tentatives, réessaie plus tard.' })
        return
      }

      await sendWhatsAppOtp(normalizedPhone, otp)
      res.status(200).json({ sent: true })
      return
    }

    if (action === 'check') {
      if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
        res.status(400).json({ error: 'Code invalide.' })
        return
      }
      const { data: verified, error } = await admin.rpc('whatsapp_otp_verify', {
        p_user_id: userId,
        p_phone: normalizedPhone,
        p_code_hash: hashCode(code),
      })
      if (error) throw error
      if (!verified) {
        res.status(400).json({ error: 'Code incorrect ou expiré.' })
        return
      }
      res.status(200).json({ verified: true })
      return
    }

    res.status(400).json({ error: 'Action inconnue.' })
  } catch (err) {
    console.error('verify-whatsapp failed', err)
    res.status(500).json({ error: 'Erreur inconnue.' })
  }
}
