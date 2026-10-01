import { supabase } from '@/lib/supabaseClient'
import type {
  MemberBalance,
  SettlementKind,
  Tontine,
  TontineContribution,
  TontineMember,
  TontineSummary,
} from '@/features/tontine/types'

const TONTINE_COLUMNS = 'id, name, goal_label, installment_amount, frequency, start_date, end_date, status, note, created_at'
const MEMBER_COLUMNS =
  'id, tontine_id, name, phone, target_amount, target_label, installment_amount, note, joined_on, status, settlement_kind, settled_amount, settled_on, settlement_note'
const CONTRIBUTION_COLUMNS = 'id, member_id, amount, paid_on, payment_method, note, created_at, cancelled_at, cancel_reason'
const PAGE_SIZE = 1000

export interface TontineInput {
  name: string
  goal_label: string | null
  installment_amount: number
  frequency: Tontine['frequency']
  start_date: string
  end_date: string
  note: string | null
}

export interface MemberInput {
  name: string
  phone: string | null
  target_amount: number
  target_label: string | null
  installment_amount: number | null
  joined_on: string
  note: string | null
}

export interface ContributionInput {
  amount: number
  paid_on: string
  payment_method: string | null
  note: string | null
}

export async function listTontines(shopId: string): Promise<Tontine[]> {
  const { data, error } = await supabase
    .from('tontines')
    .select(TONTINE_COLUMNS)
    .eq('shop_id', shopId)
    .order('status', { ascending: true })
    .order('end_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as Tontine[]
}

export async function getTontine(id: string): Promise<Tontine | null> {
  const { data, error } = await supabase.from('tontines').select(TONTINE_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  return data as Tontine | null
}

export async function getTontineSummaries(shopId: string): Promise<TontineSummary[]> {
  const { data, error } = await supabase.rpc('tontine_summaries', { p_shop_id: shopId })
  if (error) throw error
  return (data ?? []).map((row) => ({
    tontine_id: row.tontine_id,
    members_count: Number(row.members_count),
    settled_members: Number(row.settled_members),
    collected: Number(row.collected),
    paid_out: Number(row.paid_out),
  }))
}

export async function createTontine(shopId: string, input: TontineInput): Promise<string> {
  const { data, error } = await supabase.from('tontines').insert({ shop_id: shopId, ...input }).select('id').single()
  if (error) throw error
  return data.id
}

export async function updateTontine(id: string, input: TontineInput): Promise<void> {
  const { error } = await supabase.from('tontines').update(input).eq('id', id)
  if (error) throw error
}

export async function setTontineStatus(id: string, status: Tontine['status']): Promise<void> {
  const { error } = await supabase.from('tontines').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteTontine(id: string): Promise<void> {
  const { error } = await supabase.from('tontines').delete().eq('id', id)
  if (error) throw error
}

export async function listMembers(tontineId: string): Promise<TontineMember[]> {
  const { data, error } = await supabase
    .from('tontine_members')
    .select(MEMBER_COLUMNS)
    .eq('tontine_id', tontineId)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as TontineMember[]
}

export async function getMemberBalances(tontineId: string): Promise<MemberBalance[]> {
  const { data, error } = await supabase.rpc('tontine_member_balances', { p_tontine_id: tontineId })
  if (error) throw error
  return (data ?? []).map((row) => ({
    member_id: row.member_id,
    saved: Number(row.saved),
    contributions_count: Number(row.contributions_count),
    last_paid_on: row.last_paid_on,
  }))
}

/** La boutique est déduite de la tontine côté base. */
export async function createMember(tontineId: string, shopId: string, input: MemberInput): Promise<void> {
  const { error } = await supabase.from('tontine_members').insert({ tontine_id: tontineId, shop_id: shopId, ...input })
  if (error) throw error
}

export async function updateMember(id: string, input: MemberInput): Promise<void> {
  const { error } = await supabase.from('tontine_members').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase.from('tontine_members').delete().eq('id', id)
  if (error) throw error
}

export async function listMemberContributions(memberId: string): Promise<TontineContribution[]> {
  const { data, error } = await supabase
    .from('tontine_contributions')
    .select(CONTRIBUTION_COLUMNS)
    .eq('member_id', memberId)
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TontineContribution[]
}

export async function listRecentContributions(tontineId: string, limit = 30): Promise<TontineContribution[]> {
  const { data, error } = await supabase
    .from('tontine_contributions')
    .select(CONTRIBUTION_COLUMNS)
    .eq('tontine_id', tontineId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as TontineContribution[]
}

/** Tous les versements d'une tontine (export) : lus par pages, l'API plafonnant chaque réponse. */
export async function listAllContributions(tontineId: string): Promise<TontineContribution[]> {
  const all: TontineContribution[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('tontine_contributions')
      .select(CONTRIBUTION_COLUMNS)
      .eq('tontine_id', tontineId)
      .order('paid_on', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    all.push(...((data ?? []) as TontineContribution[]))
    if (!data || data.length < PAGE_SIZE) return all
  }
}

/** Boutique et tontine sont déduites du membre côté base. */
export async function createContribution(memberId: string, input: ContributionInput): Promise<void> {
  const { error } = await supabase.from('tontine_contributions').insert({ member_id: memberId, ...input })
  if (error) throw error
}

export async function cancelContribution(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_tontine_contribution', { p_contribution_id: id, p_reason: reason })
  if (error) throw error
}

export async function settleMember(
  memberId: string,
  input: { kind: SettlementKind; settled_on: string; note: string | null; record_income: boolean },
): Promise<number> {
  const { data, error } = await supabase.rpc('settle_tontine_member', {
    p_member_id: memberId,
    p_kind: input.kind,
    p_settled_on: input.settled_on,
    p_note: input.note,
    p_record_income: input.record_income,
  })
  if (error) throw error
  return Number(data)
}

export async function reopenMember(memberId: string): Promise<void> {
  const { error } = await supabase.rpc('reopen_tontine_member', { p_member_id: memberId })
  if (error) throw error
}

/** Code de règle métier levé par la base (« tontine_closed: … ») pour un message clair à l'écran. */
export function tontineErrorCode(error: unknown): string | null {
  const message = typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : ''
  const code = (error as { code?: string } | null)?.code
  if (code === '23503' && /foreign key/i.test(message)) return 'has_contributions'
  return /^([a-z_]+):/.exec(message)?.[1] ?? null
}
