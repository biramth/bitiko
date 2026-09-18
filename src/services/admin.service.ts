import { supabase } from '@/lib/supabaseClient'

export interface PendingPayment {
  id: string
  shop_id: string
  plan: string
  amount: number
  currency: string
  client_reference: string
  created_at: string
  proof_path: string | null
  payer_phone: string | null
  transaction_ref: string | null
  proof_submitted_at: string | null
  /** Short-lived signed URL of the uploaded screenshot (null if none). */
  proofUrl: string | null
  shop: { name: string; slug: string; whatsapp_number: string; owner_id: string } | null
  ownerEmail: string | null
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Non authentifié.')
  return { Authorization: `Bearer ${token}` }
}

export async function listPendingPayments(): Promise<PendingPayment[]> {
  const res = await fetch('/api/admin/pending-payments', { headers: await authHeader() })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Impossible de charger les paiements.')
  return body.payments as PendingPayment[]
}

/** Approves a pending payment, activating the plan the admin verified in Wave. */
export async function approvePayment(paymentId: string, plan: 'essential' | 'pro'): Promise<void> {
  const res = await fetch('/api/admin/approve-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ paymentId, plan }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? "Impossible d'activer le plan.")
}

export async function rejectPayment(paymentId: string, reason?: string): Promise<void> {
  const res = await fetch('/api/admin/reject-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ paymentId, reason }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Impossible de rejeter le paiement.')
}

export interface PromoCode {
  code: string
  label: string
  description: string | null
  plan: 'essential' | 'pro'
  days: number
  max_redemptions: number | null
  starts_at: string
  expires_at: string | null
  active: boolean
  show_on_landing: boolean
  created_at: string
  /** How many shops have claimed it so far. */
  redemptions: number
}

export type PromoInput = Omit<PromoCode, 'created_at' | 'redemptions'>

export async function listPromos(): Promise<PromoCode[]> {
  const res = await fetch('/api/admin/promos', { headers: await authHeader() })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Impossible de charger les promotions.')
  return body.promos as PromoCode[]
}

/** Creates (`create: true`) or updates a promotion, identified by its code. */
export async function savePromo(input: PromoInput, create: boolean): Promise<void> {
  const res = await fetch('/api/admin/promos/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ ...input, create }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? "Impossible d'enregistrer la promotion.")
}
