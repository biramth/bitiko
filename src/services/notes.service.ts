import { supabase } from '@/lib/supabaseClient'

export type NoteColor = 'default' | 'yellow' | 'green' | 'blue' | 'pink'

export interface ShopNote {
  id: string
  title: string | null
  body: string
  pinned: boolean
  color: NoteColor
  created_at: string
  updated_at: string
}

export interface NoteInput {
  title: string | null
  body: string
  color: NoteColor
}

const NOTE_COLUMNS = 'id, title, body, pinned, color, created_at, updated_at'

/** Notes de la boutique : épinglées d'abord, puis les plus récemment modifiées. */
export async function listNotes(shopId: string): Promise<ShopNote[]> {
  const { data, error } = await supabase
    .from('shop_notes')
    .select(NOTE_COLUMNS)
    .eq('shop_id', shopId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return (data ?? []) as ShopNote[]
}

export async function createNote(shopId: string, input: NoteInput): Promise<void> {
  const { error } = await supabase.from('shop_notes').insert({ shop_id: shopId, ...input })
  if (error) throw error
}

export async function updateNote(id: string, patch: Partial<NoteInput> & { pinned?: boolean }): Promise<void> {
  const { error } = await supabase.from('shop_notes').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('shop_notes').delete().eq('id', id)
  if (error) throw error
}

export type FeedSource =
  | 'order'
  | 'finance'
  | 'tontine'
  | 'tontine_member'
  | 'tontine_settlement'
  | 'tontine_contribution'
  | 'tontine_cancel'
  | 'appointment'
  | 'reservation'

export interface FeedNote {
  source: FeedSource
  target_id: string
  sub_id: string | null
  title: string
  person: string | null
  amount: number | null
  on_date: string | null
  note: string
  noted_at: string
}

/** Notes laissées sur les fiches (commandes, finances, tontines, rendez-vous…), les plus récentes d'abord. */
export async function listFeedNotes(shopId: string): Promise<FeedNote[]> {
  const { data, error } = await supabase.rpc('shop_notes_feed', { p_shop_id: shopId })
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    source: row.source as FeedSource,
    amount: row.amount === null ? null : Number(row.amount),
  }))
}
