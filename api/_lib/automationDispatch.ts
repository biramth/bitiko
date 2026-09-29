import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from './resendEmail.js'
import { merchantAlertEmailHtml } from './emailTemplates.js'
import { isWebPushConfigured, sendWebPushToUsers } from './webPush.js'
import { AUTOMATION_EVENTS } from '../../src/features/automations/events.js'

/**
 * Automation Engine dispatcher (PHASE-13): Business Event → rules → channel.
 * Partagé par le cron quotidien (toutes boutiques) et par le déclenchement
 * immédiat après une commande / réservation (une boutique) — voir
 * api/cron/automation-dispatch.ts et api/onboarding.ts?action=automation-kick.
 *
 * Canaux aujourd'hui : `log` (traçabilité, aucun effet externe), `email`
 * (Resend, vers le propriétaire de la boutique) et `push` (Web Push, vers les
 * appareils du propriétaire et des collaborateurs). `whatsapp`/`sms`
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
  /** `null` pour une règle par défaut (aucune ligne en base : rien à journaliser dans automation_runs). */
  id: string | null
  shop_id: string
  event_type: string
  channel: string
  enabled?: boolean
  template: { subject?: string; body?: string }
}

/** Pure matcher — unit-tested. Enabled rules of the event's shop and type. */
export function matchRules(
  rules: AutomationRule[],
  event: Pick<BusinessEvent, 'shop_id' | 'type'>,
): AutomationRule[] {
  return rules.filter((r) => r.shop_id === event.shop_id && r.event_type === event.type)
}

/** Alertes envoyées par email d'office (commande, stock) : le marchand les désactive, il ne les active pas. */
const DEFAULT_ALERTS = new Map(AUTOMATION_EVENTS.filter((e) => e.defaultEnabled).map((e) => [e.type, e]))
/** Notifications push envoyées d'office (demandes client), même logique de désactivation. */
const DEFAULT_PUSHES = new Map(AUTOMATION_EVENTS.filter((e) => e.defaultPush).map((e) => [e.type, e]))

/**
 * Règles à exécuter pour un événement : les règles activées de la boutique, plus l'email d'alerte et la
 * notification push par défaut quand l'événement en porte et que le marchand n'a pas de règle (activée ou
 * non) sur ce canal pour lui. Pure — testée.
 */
export function resolveRules(
  rules: AutomationRule[],
  event: Pick<BusinessEvent, 'shop_id' | 'type'>,
): AutomationRule[] {
  const candidates = matchRules(rules, event)
  const active = candidates.filter((r) => r.enabled !== false)
  const alert = DEFAULT_ALERTS.get(event.type)
  const hasEmailChoice = candidates.some((r) => r.channel === 'email')
  if (alert && !hasEmailChoice) {
    active.push({
      id: null,
      shop_id: event.shop_id,
      event_type: event.type,
      channel: 'email',
      enabled: true,
      template: { subject: alert.defaultSubject, body: alert.defaultBody },
    })
  }
  const push = DEFAULT_PUSHES.get(event.type)
  if (push && !candidates.some((r) => r.channel === 'push')) {
    active.push({
      id: null,
      shop_id: event.shop_id,
      event_type: event.type,
      channel: 'push',
      enabled: true,
      template: { subject: push.defaultSubject, body: push.defaultBody },
    })
  }
  return active
}

/** Chemin de l'admin à ouvrir depuis l'email, selon l'événement. */
export function alertTarget(type: string): { path: string; label: string } {
  if (type.startsWith('ORDER_')) return { path: '/admin/commandes', label: 'Ouvrir mes commandes' }
  if (type.startsWith('STOCK_')) return { path: '/admin/produits?stock=low', label: 'Voir mon stock' }
  if (type === 'APPOINTMENT_CREATED') return { path: '/admin/rendez-vous', label: 'Ouvrir mon agenda' }
  if (type === 'RESERVATION_CREATED') return { path: '/admin/reservations', label: 'Ouvrir mes réservations' }
  return { path: '/admin', label: 'Ouvrir mon tableau de bord' }
}

const PAYMENT_LABELS: Record<string, string> = { cod: 'espèces à la livraison', mobile_money: 'mobile money' }

/** Variables d'un événement, montants et modes de paiement rendus lisibles. Pure. */
export function eventVariables(
  payload: Record<string, unknown>,
  context: { shopName: string; when: string; currency: string },
): Record<string, unknown> {
  const vars: Record<string, unknown> = { ...payload, shop_name: context.shopName, when: context.when }
  if (payload.total !== undefined && payload.total !== null && Number.isFinite(Number(payload.total))) {
    try {
      vars.total = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: context.currency, maximumFractionDigits: 0 }).format(Number(payload.total))
    } catch {
      vars.total = `${Number(payload.total)} ${context.currency}`
    }
  }
  if (typeof payload.payment_method === 'string') vars.payment = PAYMENT_LABELS[payload.payment_method] ?? payload.payment_method
  return vars
}

/** Renders {{variables}} from the event payload (+ shop_name / when). Pure. */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key]
    return value === null || value === undefined ? '' : String(value)
  })
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
    .select('id, shop_id, event_type, channel, enabled, template')
    .in('shop_id', shopIds)
  if (rulesError) throw rulesError
  const ruleList = (rules ?? []) as unknown as AutomationRule[]

  let processed = 0
  let runs = 0
  for (const raw of events) {
    const event = { ...(raw as unknown as BusinessEvent), payload: (raw.payload ?? {}) as Record<string, unknown> }
    for (const rule of resolveRules(ruleList, event)) {
      const outcome = await executeRule(admin, event, rule)
      if (rule.id) {
        const { error: runError } = await admin.from('automation_runs').insert({
          rule_id: rule.id,
          event_id: event.id,
          status: outcome.status,
          detail: outcome.detail,
        })
        if (runError) throw runError
      }
      runs += 1
    }
    const { error: markError } = await admin.from('business_events').update({ processed: true }).eq('id', event.id)
    if (markError) throw markError
    processed += 1
  }
  return { processed, runs }
}

/** Boutique et variables rendues d'un événement, communes aux canaux. */
async function loadEventContext(admin: SupabaseClient, event: BusinessEvent) {
  const { data: shop } = await admin.from('shops').select('name, owner_id, currency').eq('id', event.shop_id).maybeSingle()
  const { data: settings } = await admin.from('booking_settings').select('timezone').eq('shop_id', event.shop_id).maybeSingle()
  const timeZone = (settings?.timezone as string | undefined) ?? 'Africa/Dakar'
  const vars = eventVariables(event.payload, {
    shopName: (shop?.name as string) ?? '',
    when: formatEventWhen(event.payload.start_at, timeZone),
    currency: (shop?.currency as string | undefined) ?? 'XOF',
  })
  return { shop, vars }
}

/** Comptes prévenus par push : le propriétaire et les collaborateurs qui ont rejoint la boutique. */
async function shopTeamUserIds(admin: SupabaseClient, shopId: string, ownerId: string): Promise<string[]> {
  const { data, error } = await admin.from('shop_members').select('user_id').eq('shop_id', shopId).not('user_id', 'is', null)
  if (error) throw error
  return [ownerId, ...(data ?? []).map((m) => m.user_id as string)]
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
      const { shop, vars } = await loadEventContext(admin, event)
      const owner = shop ? await admin.auth.admin.getUserById(shop.owner_id as string) : { data: { user: null } }
      const to = owner.data.user?.email
      if (!to) return { status: 'skipped', detail: { reason: 'no_owner_email' } }
      const target = alertTarget(event.type)
      const rootDomain = process.env.VITE_ROOT_DOMAIN
      await sendEmail({
        to,
        subject: renderTemplate(rule.template.subject ?? `Événement ${event.type}`, vars),
        html: merchantAlertEmailHtml({
          origin: rootDomain ? `https://${rootDomain}` : 'https://bitiko.shop',
          shopName: (shop?.name as string) ?? 'Bitiko',
          heading: renderTemplate(rule.template.subject ?? `Événement ${event.type}`, vars),
          body: renderTemplate(rule.template.body ?? '', vars),
          buttonLabel: target.label,
          path: target.path,
        }),
      })
      return { status: 'sent', detail: { channel: 'email', to: '[redacted]' } }
    }
    if (rule.channel === 'push') {
      if (!isWebPushConfigured()) return { status: 'skipped', detail: { channel: 'push', reason: 'push_not_configured' } }
      const { shop, vars } = await loadEventContext(admin, event)
      if (!shop) return { status: 'skipped', detail: { channel: 'push', reason: 'no_shop' } }
      const fallback = DEFAULT_PUSHES.get(event.type)
      const result = await sendWebPushToUsers(admin, await shopTeamUserIds(admin, event.shop_id, shop.owner_id as string), {
        title: renderTemplate(rule.template.subject || fallback?.defaultSubject || (shop.name as string), vars),
        body: renderTemplate(rule.template.body || fallback?.defaultBody || '', vars),
        url: alertTarget(event.type).path,
        tag: event.id,
      })
      if (result.subscriptions === 0) return { status: 'skipped', detail: { channel: 'push', reason: 'no_subscription' } }
      return { status: result.delivered > 0 ? 'sent' : 'failed', detail: { channel: 'push', ...result } }
    }
    return { status: 'skipped', detail: { channel: rule.channel, reason: 'no_channel_adapter' } }
  } catch (err) {
    return { status: 'failed', detail: { error: err instanceof Error ? err.message.slice(0, 500) : 'unknown' } }
  }
}
