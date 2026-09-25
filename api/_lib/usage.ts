import { getSupabaseAdmin } from './supabaseAdmin.js'

/** First day of the UTC month containing `d` (usage_records buckets by month).
 *  Pure — unit-tested. */
export function monthStart(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Records usage for a shop (PHASE-12 metering). BEST-EFFORT, never throws:
 * metering must never break the flow it measures (here: campaign sends).
 * Writes go through the service-role client to record_usage(), which validates
 * shop + active meter and upserts idempotently.
 */
export async function recordUsage(shopId: string, meter: string, qty: number): Promise<void> {
  try {
    if (!shopId || !(qty > 0)) return
    const admin = getSupabaseAdmin()
    const { error } = await admin.rpc('record_usage', {
      p_shop_id: shopId,
      p_meter: meter,
      p_qty: qty,
      p_period: monthStart(),
    })
    if (error) throw error
  } catch (err) {
    console.error('usage recordUsage failed (non-blocking)', err)
  }
}
