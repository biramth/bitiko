import { supabase } from '@/lib/supabaseClient'
import type { ShopSubscription, WavePayment } from '@/types/billing'
import type { PlanKey } from '@/types/billing'

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
  return createPlanCheckout(shopId, 'pro')
}

export async function createPlanCheckout(shopId: string, plan: Exclude<PlanKey, 'free'>): Promise<CreateCheckoutResponse> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Non authentifié.')

  const res = await fetch('/api/billing/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ shopId, plan }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Impossible de démarrer le paiement.')
  return body as CreateCheckoutResponse
}

export interface PaymentProofInput {
  /** Storage path returned by `uploadPaymentProof`. */
  proofPath: string
  payerPhone?: string
  transactionRef?: string
}

/** Uploads the payment screenshot to the private bucket, under "<shopId>/" — the
 *  storage policy only lets the shop's owner write there. Returns the path. */
export async function uploadPaymentProof(shopId: string, file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${shopId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error("Impossible d'envoyer la capture. Vérifiez le format (JPG, PNG, WebP) et la taille (5 Mo max).")
  return path
}

/** Manual bridge while Wave's Checkout API isn't available — see WAVE_PRO_PAYMENT_LINK.
 *  Records a pending payment with its proof for the platform team to verify. */
export async function requestPlanUpgrade(shopId: string, plan: Exclude<PlanKey, 'free'>, proof: PaymentProofInput): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Non authentifié.')

  const res = await fetch('/api/request-pro-upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ shopId, plan, ...proof }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Impossible d\'envoyer la demande.')
}

export interface PromoOffer {
  code: string
  label: string
  description: string | null
  plan: Exclude<PlanKey, 'free'>
  days: number
  expires_at: string | null
}

/** The free-period offer this shop can claim right now, if any. */
export async function getPromoOffer(shopId: string): Promise<PromoOffer | null> {
  const { data, error } = await supabase.rpc('get_promo_offer', { p_shop_id: shopId })
  if (error) throw error
  return ((data ?? [])[0] as PromoOffer | undefined) ?? null
}

/** Claims a promo (a typed code, or the current offer when `code` is omitted).
 *  Resolves to the new end date of the subscription (ISO). */
export async function redeemPromo(shopId: string, code?: string): Promise<string> {
  const { data, error } = await supabase.rpc('redeem_promo_code', { p_shop_id: shopId, p_code: code?.trim() || undefined })
  if (error) throw new Error(error.message)
  return data as string
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

/** The campaign advertised on the public landing page (no login needed), if any. */
export async function getLandingPromo(): Promise<PromoOffer | null> {
  const { data, error } = await supabase.rpc('get_landing_promo')
  if (error) throw error
  return ((data ?? [])[0] as PromoOffer | undefined) ?? null
}
