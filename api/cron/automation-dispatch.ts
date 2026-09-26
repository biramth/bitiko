import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { sendEmail } from '../_lib/resendEmail.js'
import { isCronAuthorized } from '../_lib/cronAuth.js'

/**
 * Automation Engine dispatcher (PHASE-13): Business Event → rules → channel.
 * NOT scheduled yet (no vercel.json cron entry — scheduling + monitoring arrive
 * with PHASE-15); runs on demand (manual trigger, later cron). Safe to expose:
 * CRON_SECRET-gated like renewal-reminders, and with zero enabled rules it is
 * a pure no-op that only flips nothing.
 *
 * Channels today: `log` (traceability proof, no external effect) and `email`
 * (existing Resend infra, to the shop owner). `whatsapp`/`sms`/`push` rules
 * evaluate to `skipped/no_channel_adapter` until their providers exist —
 * the engine must never depend on a channel's limitations.
 */

const BATCH_LIMIT = 50

interface BusinessEvent {
  id: string
  shop_id: string
  type: string
  payload: Record<string, unknown>
}

interface AutomationRule {
  id: string
  shop_id: string
  event_type: string
  channel: string
  template: { subject?: string; body?: string }
}

/** Pure matcher — unit-tested. Enabled rules of the event's shop and type. */
export function matchRules(
  rules: AutomationRule[],
  event: Pick<BusinessEvent, 'shop_id' | 'type'>,
): AutomationRule[] {
  return rules.filter((r) => r.shop_id === event.shop_id && r.event_type === event.type)
}

/** Renders {{variables}} from the event payload (+ shop_name when known). Pure. */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key]
    return value === null || value === undefined ? '' : String(value)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req.headers.authorization)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: events, error: eventsError } = await admin
      .from('business_events')
      .select('id, shop_id, type, payload')
      .eq('processed', false)
      .order('occurred_at', { ascending: true })
      .limit(BATCH_LIMIT)
    if (eventsError) throw eventsError
    if (!events || events.length === 0) {
      res.status(200).json({ processed: 0 })
      return
    }

    const shopIds = [...new Set(events.map((e) => e.shop_id as string))]
    const { data: rules, error: rulesError } = await admin
      .from('automation_rules')
      .select('id, shop_id, event_type, channel, template')
      .in('shop_id', shopIds)
      .eq('enabled', true)
    if (rulesError) throw rulesError
    const ruleList = (rules ?? []) as unknown as AutomationRule[]

    let processed = 0
    let runs = 0
    for (const raw of events) {
      const event = { ...(raw as unknown as BusinessEvent), payload: (raw.payload ?? {}) as Record<string, unknown> }
      const matched = matchRules(ruleList, event)
      for (const rule of matched) {
        const outcome = await executeRule(event, rule)
        const { error: runError } = await admin.from('automation_runs').insert({
          rule_id: rule.id,
          event_id: event.id,
          status: outcome.status,
          detail: outcome.detail,
        })
        if (runError) throw runError
        runs += 1
      }
      const { error: markError } = await admin
        .from('business_events')
        .update({ processed: true })
        .eq('id', event.id)
      if (markError) throw markError
      processed += 1
    }

    res.status(200).json({ processed, runs })
  } catch (err) {
    console.error('automation-dispatch failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function executeRule(
  event: BusinessEvent,
  rule: AutomationRule,
): Promise<{ status: 'sent' | 'failed' | 'skipped'; detail: Record<string, unknown> }> {
  try {
    if (rule.channel === 'log') {
      return { status: 'sent', detail: { channel: 'log', event: event.type } }
    }
    if (rule.channel === 'email') {
      const admin = getSupabaseAdmin()
      const { data: shop } = await admin
        .from('shops')
        .select('name, owner_id')
        .eq('id', event.shop_id)
        .maybeSingle()
      const owner = shop
        ? await admin.auth.admin.getUserById(shop.owner_id as string)
        : { data: { user: null } }
      const to = owner.data.user?.email
      if (!to) return { status: 'skipped', detail: { reason: 'no_owner_email' } }
      const vars = { ...event.payload, shop_name: (shop?.name as string) ?? '' }
      await sendEmail({
        to,
        subject: renderTemplate(rule.template.subject ?? `Événement ${event.type}`, vars),
        html: `<p>${renderTemplate(rule.template.body ?? '', vars)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/\n/g, '<br />')}</p>`,
      })
      return { status: 'sent', detail: { channel: 'email', to: '[redacted]' } }
    }
    return { status: 'skipped', detail: { channel: rule.channel, reason: 'no_channel_adapter' } }
  } catch (err) {
    return { status: 'failed', detail: { error: err instanceof Error ? err.message.slice(0, 500) : 'unknown' } }
  }
}
