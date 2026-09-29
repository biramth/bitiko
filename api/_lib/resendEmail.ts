import { SUPPORT_EMAIL } from '../../src/config/contact.js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Bitiko <noreply@bitiko.shop>'
// noreply@ n'a pas de boîte : les emails invitent à « répondre directement », la réponse va au support.
const REPLY_TO = `Bitiko <${SUPPORT_EMAIL}>`

interface SendEmailInput {
  to: string
  subject: string
  html: string
  /** En-têtes email additionnels (ex. List-Unsubscribe pour les campagnes). */
  headers?: Record<string, string>
}

/** Transactional/marketing sends outside Supabase Auth's own mailer (which only covers signup/recovery/email-change). */
export async function sendEmail({ to, subject, html, headers }: SendEmailInput): Promise<void> {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured on the server.')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to, subject, html, ...(headers ? { headers } : {}) }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}
