/** HaveIBeenPwned breach check, free-tier friendly: k-anonymity means only
 *  the first 5 SHA-1 hex chars ever leave the browser, and the full hash is
 *  never transmitted or logged. Fail-open by design — offline mode, a down
 *  API, or no SubtleCrypto all return false so auth flows never break
 *  because of this check (Supabase's own server-side protection is the
 *  backstop on paid plans). */
export const BREACHED_PASSWORD_MESSAGE =
  'Ce mot de passe a déjà fuité sur internet — choisissez-en un autre pour protéger votre compte.'

export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    if (!password || typeof fetch !== 'function') return false
    const subtle = globalThis.crypto?.subtle
    if (typeof subtle?.digest !== 'function') return false
    const digest = await subtle.digest('SHA-1', new TextEncoder().encode(password))
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    const res = await fetch(`https://api.haveibeenpwned.com/range/${hash.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) return false
    const suffix = hash.slice(5)
    const body = await res.text()
    return body.split('\n').some((line) => line.split(':')[0]?.trim() === suffix)
  } catch {
    return false
  }
}
