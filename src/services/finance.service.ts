import { supabase } from '@/lib/supabaseClient'
import type { FinanceEntry, RevenueRow } from '@/features/finance/bilan'
import type { EntryKind } from '@/features/finance/categories'

const ENTRY_COLUMNS = 'id, kind, category, label, amount, entry_date, payment_method, note, created_at'

export interface TopItem {
  name: string
  kind: 'product' | 'service'
  quantity: number
  amount: number
}

export interface FinanceEntryInput {
  kind: EntryKind
  category: string
  label: string
  amount: number
  entry_date: string
  payment_method: string | null
  note: string | null
}

/** Saisies du journal sur [from, to] (dates incluses), les plus récentes d'abord. */
export async function listFinanceEntries(shopId: string, from: string, to: string): Promise<FinanceEntry[]> {
  const { data, error } = await supabase
    .from('finance_entries')
    .select(ENTRY_COLUMNS)
    .eq('shop_id', shopId)
    .gte('entry_date', from)
    .lte('entry_date', to)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FinanceEntry[]
}

export async function createFinanceEntry(shopId: string, input: FinanceEntryInput): Promise<void> {
  const { error } = await supabase.from('finance_entries').insert({ shop_id: shopId, ...input })
  if (error) throw error
}

export async function updateFinanceEntry(id: string, input: FinanceEntryInput): Promise<void> {
  const { error } = await supabase.from('finance_entries').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  const { error } = await supabase.from('finance_entries').delete().eq('id', id)
  if (error) throw error
}

/** Nombre de saisies créées ce mois-ci (le plafond du plan gratuit compte par date de création). */
export async function countEntriesCreatedThisMonth(shopId: string): Promise<number> {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const { count, error } = await supabase
    .from('finance_entries')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .gte('created_at', start.toISOString())
  if (error) throw error
  return count ?? 0
}

/** Recettes automatiques (commandes payées ou livrées, rendez-vous terminés) par mois et par source. */
export async function getRevenueByMonth(shopId: string, from: string, to: string): Promise<RevenueRow[]> {
  const { data, error } = await supabase.rpc('finance_revenue_by_month', { p_shop_id: shopId, p_from: from, p_to: to })
  if (error) throw error
  return (data ?? []).map((row) => ({
    month: String(row.month),
    source: row.source as RevenueRow['source'],
    amount: Number(row.amount),
    entries: Number(row.entries),
  }))
}

export async function getTopItems(shopId: string, from: string, to: string, limit = 5): Promise<TopItem[]> {
  const { data, error } = await supabase.rpc('finance_top_items', { p_shop_id: shopId, p_from: from, p_to: to, p_limit: limit })
  if (error) throw error
  return (data ?? []).map((row) => ({
    name: row.name,
    kind: row.kind as TopItem['kind'],
    quantity: Number(row.quantity),
    amount: Number(row.amount),
  }))
}
