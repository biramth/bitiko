import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { sendEmail } from './resendEmail.js'
import { campaignEmailHtml } from './emailTemplates.js'
import { recordUsage } from './usage.js'

/**
 * Moteur d'envoi des campagnes, partagé entre l'envoi immédiat de l'équipe
 * (api/admin/platform.ts) et l'envoi programmé du cron quotidien
 * (api/cron/automation-dispatch.ts, Vercel Hobby limite à 2 crons).
 *
 * Garanties conservées quel que soit l'appelant : un seul envoi à la fois
 * (claim `sending`, reprise d'un claim éventé), jamais de double-envoi
 * (campaign_sends fait foi), échec → claim relâché pour reprise manuelle.
 */

/** Emails envoyés en parallèle par lot — borne la mémoire sans être si lent
 *  que les grosses audiences tuent la fonction (60 s max sur Hobby). */
const SEND_CONCURRENCY = 2

/** Un claim `sending` plus vieux que ça est un run tué en plein envoi, que
 *  l'on peut reprendre (les destinataires déjà servis sont ignorés). */
const STALE_SENDING_MS = 10 * 60 * 1000

export interface CampaignSendTotals {
  recipientCount: number
  sent: number
  failed: number
  sentThisRun: number
  failedThisRun: number
  skipped: number
  alreadySent: number
}

export type CampaignClaim = 'claimed' | 'busy' | 'sent'
export type ClaimableStatus = 'draft' | 'scheduled'

/** Builds an id → {email, name} map once, so a campaign send doesn't do one
 *  auth lookup per recipient. */
export async function loadUserDirectory(): Promise<Map<string, { email: string; name: string }>> {
  const admin = getSupabaseAdmin()
  const directory = new Map<string, { email: string; name: string }>()
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const users = data.users
    for (const user of users) {
      if (!user.email) continue
      const fullName = (user.user_metadata?.full_name as string | undefined)?.trim()
      directory.set(user.id, { email: user.email, name: fullName || user.email.split('@')[0] })
    }
    if (users.length < 1000) break
  }
  return directory
}

/**
 * Claims a draft or scheduled campaign for sending. Returns 'busy' when
 * another run holds a fresh claim (or the campaign is already sent), and
 * takes over a stale claim left behind by a run the platform killed mid-send.
 */
export async function claimCampaignSend(
  admin: SupabaseClient,
  id: string,
): Promise<{ outcome: CampaignClaim; from: ClaimableStatus | null }> {
  const { data: row, error: readError } = await admin
    .from('campaigns')
    .select('status, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (readError) throw readError
  if (!row || row.status === 'sent') return { outcome: 'sent', from: null }

  const claim = async (from: string): Promise<boolean> => {
    const { data, error } = await admin
      .from('campaigns')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', from)
      .select('id')
    if (error) throw error
    return !!data && data.length > 0
  }

  if (row.status === 'draft' || row.status === 'scheduled') {
    return (await claim(row.status)) ? { outcome: 'claimed', from: row.status } : { outcome: 'busy', from: null }
  }
  if (row.status !== 'sending') return { outcome: 'busy', from: null }
  const age = Date.now() - new Date(row.updated_at as string).getTime()
  if (age < STALE_SENDING_MS) return { outcome: 'busy', from: null }
  return (await claim('sending')) ? { outcome: 'claimed', from: 'draft' } : { outcome: 'busy', from: null }
}

async function releaseClaim(admin: SupabaseClient, id: string, to: ClaimableStatus): Promise<void> {
  const { error } = await admin.from('campaigns').update({ status: to }).eq('id', id).eq('status', 'sending')
  if (error) throw error
}

export async function runCampaignSend(
  admin: SupabaseClient,
  id: string,
  opts: {
    origin: string
    /** Membre plateforme au nom duquel l'audience est résolue (le programmant pour le cron). */
    viewer: string
    /** Où remettre le statut après un échec : la programmation (reprise) ou le brouillon. */
    releaseTo?: ClaimableStatus
  },
): Promise<{ ok: true; totals: CampaignSendTotals } | { ok: false; reason: 'sent' | 'busy' }> {
  const claim = await claimCampaignSend(admin, id)
  if (claim.outcome !== 'claimed') return { ok: false, reason: claim.outcome }
  const restoreTo = opts.releaseTo ?? claim.from ?? 'draft'

  try {
    const { data: campaign, error: campaignError } = await admin
      .from('campaigns')
      .select('id, subject, body, audience, status, button_label, button_url')
      .eq('id', id)
      .maybeSingle()
    if (campaignError) throw campaignError
    if (!campaign) throw new Error('Campagne introuvable.')

    const { data: audienceRows, error: audienceError } = await admin.rpc('platform_audience', {
      audience: campaign.audience ?? {},
      viewer: opts.viewer,
    })
    if (audienceError) throw audienceError
    const recipients = (audienceRows ?? []) as { shop_id: string; owner_id: string; shop_name: string; slug: string }[]

    const directory = await loadUserDirectory()
    // Shops whose owner isn't reachable are skipped, not attempted — they must
    // never inflate the recipient or failure counts.
    const reachable = recipients.filter((recipient) => !!directory.get(recipient.owner_id)?.email)

    // Idempotence: a resumed run must never email a shop that already got this
    // campaign (happens after a partial failure or a killed send).
    const { data: priorSends, error: priorError } = await admin
      .from('campaign_sends')
      .select('shop_id, status')
      .eq('campaign_id', id)
    if (priorError) throw priorError
    const alreadySent = new Set(
      (priorSends ?? []).filter((row) => row.status === 'sent').map((row) => row.shop_id as string),
    )
    const pending = reachable.filter((recipient) => !alreadySent.has(recipient.shop_id))

    const origin = opts.origin
    const rootDomain = process.env.VITE_ROOT_DOMAIN

    const logs: { campaign_id: string; shop_id: string; email: string; status: string; error?: string }[] = []
    let sent = 0
    let failed = 0

    for (let i = 0; i < pending.length; i += SEND_CONCURRENCY) {
      const batch = pending.slice(i, i + SEND_CONCURRENCY)
      const results = await Promise.all(
        batch.map(async (recipient) => {
          const owner = directory.get(recipient.owner_id)
          if (!owner?.email) return { recipient, skipped: true as const }
          const shopUrl = rootDomain ? `https://${recipient.slug}.${rootDomain}` : origin
          try {
            await sendEmail({
              to: owner.email,
              subject: campaign.subject,
              html: campaignEmailHtml({
                origin,
                subject: campaign.subject,
                body: campaign.body,
                shopName: recipient.shop_name,
                shopUrl,
                ownerName: owner.name,
                buttonLabel: campaign.button_label ?? undefined,
                buttonUrl: campaign.button_url ?? undefined,
              }),
            })
            return { recipient, skipped: false as const, ok: true as const, email: owner.email }
          } catch (sendErr) {
            return {
              recipient,
              skipped: false as const,
              ok: false as const,
              email: owner.email,
              error: sendErr instanceof Error ? sendErr.message.slice(0, 500) : 'Erreur inconnue.',
            }
          }
        }),
      )
      for (const result of results) {
        if (result.skipped) continue
        if (result.ok) {
          sent += 1
          logs.push({ campaign_id: id, shop_id: result.recipient.shop_id, email: result.email, status: 'sent' })
        } else {
          failed += 1
          logs.push({
            campaign_id: id,
            shop_id: result.recipient.shop_id,
            email: result.email,
            status: 'failed',
            error: result.error,
          })
        }
      }
    }

    if (logs.length > 0) {
      const { error: logError } = await admin.from('campaign_sends').insert(logs)
      if (logError) console.error('campaign-send: logging failed', logError)
    }

    // Metering (PHASE-12, best-effort): emails actually delivered, per shop,
    // into the usage ledger — never blocks or alters the send itself.
    {
      const sentByShop = new Map<string, number>()
      for (const row of logs) {
        if (row.status !== 'sent') continue
        sentByShop.set(row.shop_id, (sentByShop.get(row.shop_id) ?? 0) + 1)
      }
      for (const [shopId, count] of sentByShop) {
        await recordUsage(shopId, 'emails', count)
      }
    }

    // Totals across runs: a resumed send must report every successfully
    // delivered and failed email, not just this run's share.
    const { data: finalLogs, error: finalError } = await admin
      .from('campaign_sends')
      .select('status')
      .eq('campaign_id', id)
    if (finalError) throw finalError
    const totalSent = (finalLogs ?? []).filter((row) => row.status === 'sent').length
    const totalFailed = (finalLogs ?? []).filter((row) => row.status === 'failed').length

    const { error: updateError } = await admin
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: reachable.length,
        sent_count: totalSent,
        failed_count: totalFailed,
      })
      .eq('id', id)
    if (updateError) throw updateError

    return {
      ok: true,
      totals: {
        recipientCount: reachable.length,
        sent: totalSent,
        failed: totalFailed,
        sentThisRun: sent,
        failedThisRun: failed,
        skipped: recipients.length - reachable.length,
        alreadySent: alreadySent.size,
      },
    }
  } catch (err) {
    // Release the claim so the operator can retry; already-delivered shops are
    // skipped on the next run, so a retry never double-sends.
    try {
      await releaseClaim(admin, id, restoreTo)
    } catch (releaseErr) {
      console.error('campaign-send: releasing claim failed', releaseErr)
    }
    throw err
  }
}

/**
 * Envoie les campagnes programmées dont la date est passée. L'audience est
 * résolue au nom du membre qui a programmé (`scheduled_by`) : sans auteur
 * (ou auteur sorti de l'équipe), la campagne repasse en brouillon au lieu
 * d'échouer en boucle chaque matin.
 */
export async function runScheduledCampaigns(
  admin: SupabaseClient,
  origin: string,
): Promise<{ checked: number; sent: string[]; failed: { id: string; error: string }[] }> {
  const { data, error } = await admin
    .from('campaigns')
    .select('id, scheduled_by')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
  if (error) throw error

  const due = data ?? []
  const sent: string[] = []
  const failed: { id: string; error: string }[] = []
  for (const row of due) {
    const id = row.id as string
    const scheduledBy = row.scheduled_by as string | null
    if (!scheduledBy) {
      failed.push({ id, error: 'Programmée sans auteur : repassée en brouillon.' })
      try {
        await admin.from('campaigns').update({ status: 'draft', scheduled_at: null }).eq('id', id).eq('status', 'scheduled')
      } catch (releaseErr) {
        console.error('scheduled-campaigns: release failed', releaseErr)
      }
      continue
    }
    try {
      const result = await runCampaignSend(admin, id, { origin, viewer: scheduledBy, releaseTo: 'draft' })
      if (result.ok) sent.push(id)
      else failed.push({ id, error: result.reason === 'sent' ? 'Déjà envoyée.' : 'Envoi déjà en cours.' })
    } catch (err) {
      console.error('scheduled-campaigns: send failed', id, err)
      failed.push({ id, error: err instanceof Error ? err.message : 'Erreur inconnue.' })
    }
  }
  return { checked: due.length, sent, failed }
}
