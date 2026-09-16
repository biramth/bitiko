import { supabase } from '@/lib/supabaseClient'

/**
 * Permanently deletes the signed-in merchant's account and everything it
 * owns — every shop (products, categories, orders, pages, delivery zones,
 * subscription/payments via FK cascade), the uploaded images, and the auth
 * account itself. Irreversible. The server function re-derives the owner
 * from the access token, so no id is trusted from the browser.
 */
export async function deleteAccount(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Non authentifié.')

  const res = await fetch('/api/delete-account', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? 'Impossible de supprimer le compte.')
}
