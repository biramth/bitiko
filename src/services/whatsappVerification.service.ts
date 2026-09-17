import { supabase } from '@/lib/supabaseClient'

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error('Non authentifié.')
  return { Authorization: `Bearer ${accessToken}` }
}

async function callVerifyWhatsapp(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch('/api/verify-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Une erreur est survenue.')
  return json
}

/** Sends a fresh 6-digit WhatsApp OTP code to `phone` via the Meta Cloud API. */
export async function sendWhatsAppOtp(phone: string): Promise<void> {
  await callVerifyWhatsapp({ action: 'send', phone })
}

/** Verifies a code sent by sendWhatsAppOtp. Returns true once confirmed. */
export async function checkWhatsAppOtp(phone: string, code: string): Promise<boolean> {
  const result = await callVerifyWhatsapp({ action: 'check', phone, code })
  return result.verified === true
}
