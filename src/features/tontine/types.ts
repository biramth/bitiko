import type { Frequency } from './schedule'

export interface Tontine {
  id: string
  name: string
  goal_label: string | null
  installment_amount: number
  frequency: Frequency
  start_date: string
  end_date: string
  status: 'active' | 'closed'
  note: string | null
  created_at: string
}

export interface TontineSummary {
  tontine_id: string
  members_count: number
  settled_members: number
  collected: number
  paid_out: number
}

export type SettlementKind = 'goods' | 'cash'

export interface TontineMember {
  id: string
  tontine_id: string
  name: string
  phone: string | null
  target_amount: number
  target_label: string | null
  installment_amount: number | null
  note: string | null
  joined_on: string
  status: 'active' | 'settled'
  settlement_kind: SettlementKind | null
  settled_amount: number | null
  settled_on: string | null
  settlement_note: string | null
}

export interface MemberBalance {
  member_id: string
  saved: number
  contributions_count: number
  last_paid_on: string | null
}

export interface TontineContribution {
  id: string
  member_id: string
  amount: number
  paid_on: string
  payment_method: string | null
  note: string | null
  created_at: string
  cancelled_at: string | null
  cancel_reason: string | null
}
