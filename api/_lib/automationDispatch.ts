import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from './resendEmail.js'

/**
 * Automation Engine dispatcher (PHASE-13): Business Event → rules → channel.
 * Partagé par le cron quotidien (toutes boutiques) et par le déclenchement
 * immédiat après une commande / réservation (une boutique) — voir
 * api/cron/automation-dispatch.ts et api/onboarding.ts?action=automation-kick.
 *
 * Canaux aujourd'hui : `log` (traçabilité, aucun effet externe) et `email`
 * (Resend, vers le propriétaire de la boutique). `whatsapp`/`sms`/`push`
 * évaluent à `skipped/no_channel_adapter` tant que leurs fournisseurs n'existent
 * pas : le moteur ne dépend jamais des limites d'un canal.
 */

export const DISPATCH_BATCH_LIMIT = 50

export interface BusinessEvent {
  id: string
  shop_id: string
  type: string
  payload: Record<string, unknown>
}

export interface AutomationRule {
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

/** Renders {{variables}} from the event payload (+ shop_name / when). Pure. */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key]
    return value === null || value === undefined ? '' : String(value)
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Date lisible d'un événement de réservation dans le fuseau de la boutique. */
export function formatEventWhen(startAt: unknown, timeZone: string): string {
  if (typeof startAt !== 'string') return ''
  const date = new Date(startAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

/**
 * Traite les événements non traités (d'une boutique, ou de toutes). Idempotent :
 * un événement n'est marqué `processed` qu'une fois ses règles exécutées.
 */
export async function dispatchEvents(
  admin: SupabaseClient,
  options: { shopId?: string; limit?: number } = {},
): Promise<{ processed: number; runs: number }> {
  let query = admin
    .from('business_events')
    .select('id, shop_id, type, payload')
    .eq('processed', false)
    .order('occurred_at', { ascending: true })
    .limit(options.limit ?? DISPATCH_BATCH_LIMIT)
  if (options.shopId) query = query.eq('shop_id', options.shopId)
  const { data: events, error: eventsError } = await query
  if (eventsError) throw eventsError
  if (!events || events.length === 0) return { processed: 0, runs: 0 }

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
    for (const rule of matchRules(ruleList, event)) {
      const outcome = await executeRule(admin, event, rule)
      const { error: runError } = await admin.from('automation_runs').insert({
        rule_id: rule.id,
        event_id: event.id,
        status: outcome.status,
        detail: outcome.detail,
      })
      if (runError) throw runError
      runs += 1
    }
    const { error: markError } = await admin.from('business_events').update({ processed: true }).eq('id', event.id)
    if (markError) throw markError
    processed += 1
  }
  return { processed, runs }
}

async function executeRule(
  admin: SupabaseClient,
  event: BusinessEvent,
  rule: AutomationRule,
): Promise<{ status: 'sent' | 'failed' | 'skipped'; detail: Record<string, unknown> }> {
  try {
    if (rule.channel === 'log') {
      return { status: 'sent', detail: { channel: 'log', event: event.type } }
    }
    if (rule.channel === 'email') {
      const { data: shop } = await admin.from('shops').select('name, owner_id').eq('id', event.shop_id).maybeSingle()
      const owner = shop ? await admin.auth.admin.getUserById(shop.owner_id as string) : { data: { user: null } }
      const to = owner.data.user?.email
      if (!to) return { status: 'skipped', detail: { reason: 'no_owner_email' } }
      const { data: settings } = await admin.from('booking_settings').select('timezone').eq('shop_id', event.shop_id).maybeSingle()
      const timeZone = (settings?.timezone as string | undefined) ?? 'Africa/Dakar'
      const vars = {
        ...event.payload,
        shop_name: (shop?.name as string) ?? '',
        when: formatEventWhen(event.payload.start_at, timeZone),
      }
      await sendEmail({
        to,
        subject: renderTemplate(rule.template.subject ?? `Événement ${event.type}`, vars),
        html: `<p>${escapeHtml(renderTemplate(rule.template.body ?? '', vars)).replace(/\n/g, '<br />')}</p>`,
      })
      return { status: 'sent', detail: { channel: 'email', to: '[redacted]' } }
    }
    return { status: 'skipped', detail: { channel: rule.channel, reason: 'no_channel_adapter' } }
  } catch (err) {
    return { status: 'failed', detail: { error: err instanceof Error ? err.message.slice(0, 500) : 'unknown' } }
  }
}
