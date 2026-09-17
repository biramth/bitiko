/**
 * Sends a one-time password via the Meta WhatsApp Cloud API, using an
 * AUTHENTICATION-category template (required for business-initiated
 * messages to a number that has no open 24h conversation with us — a plain
 * text message would be rejected). Set up in Meta Business Manager →
 * WhatsApp Manager → Message Templates: category "Authentification", body
 * left as Meta's default ("{{1}} est votre code de vérification."), one
 * "Copier le code" button — these templates are pre-validated by Meta
 * against a fixed catalog of wordings, so they're usually approved
 * instantly. The component shape below (body text param + button url param,
 * both carrying the code) matches that exact template shape.
 *
 * WHATSAPP_CLOUD_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID left unset means no
 * WhatsApp Business app is configured yet — falls back to logging the code
 * server-side so onboarding keeps working in dev.
 */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'otp_verification'
  const templateLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || 'fr'
  const to = phone.replace(/[^0-9]/g, '')

  if (!token || !phoneNumberId) {
    console.log(`[whatsapp-otp] WHATSAPP_CLOUD_API_TOKEN not configured — code for ${to} is ${code}`)
    return
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`WhatsApp Cloud API error (${res.status}): ${body}`)
  }
}
