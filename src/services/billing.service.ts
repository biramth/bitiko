import { supabase } from '@/lib/supabaseClient'
import type { ShopSubscription, WavePayment } from '@/types/billing'

export async function getShopSubscription(shopId: string): Promise<ShopSubscription | null> {
  const { data, error } = await supabase
    .from('shop_subscriptions')
    .select('*')
    .eq('shop_id', shopId)
    .maybeSingle()
  if (error) throw error
  return data as ShopSubscription | null
}

export async function listPayments(shopId: string): Promise<WavePayment[]> {
  const { data, error } = await supabase
    .from('wave_payments')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WavePayment[]
}

interface CreateCheckoutResponse {
  waveLaunchUrl: string
}

/** Calls the Vercel function that talks to Wave — never the Wave API directly from the browser. */
export async function createProCheckout(shopId: string): Promise<CreateCheckoutResponse> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Non authentifié.')

  const res = await fetch('/api/billing/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ shopId, plan: 'pro' }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Impossible de démarrer le paiement.')
  return body as CreateCheckoutResponse
}

interface ConfirmPaymentResponse {
  status: 'succeeded' | 'pending' | 'failed'
}

/** Called on return from Wave with our own client_reference (from the success_url) — confirms synchronously instead of waiting on a webhook. */
export async function confirmPayment(clientReference: string): Promise<ConfirmPaymentResponse> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Non authentifié.')

  const res = await fetch('/api/billing/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ clientReference }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Impossible de vérifier le paiement.')
  return body as ConfirmPaymentResponse
}
