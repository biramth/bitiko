import { supabase } from '@/lib/supabaseClient'

export interface PendingPayment {
  id: string
  shop_id: string
  plan: string
  amount: number
  currency: string
  client_reference: string
  created_at: string
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

export async function approvePayment(paymentId: string): Promise<void> {
  const res = await fetch('/api/admin/approve-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ paymentId }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? "Impossible d'activer le Pro.")
}

export async function rejectPayment(paymentId: string): Promise<void> {
  const res = await fetch('/api/admin/reject-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ paymentId }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Impossible de rejeter le paiement.')
}
