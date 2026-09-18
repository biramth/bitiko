import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  canManageTeam,
  getPlatformMemberFromAuthHeader,
  getSupabaseAdmin,
  type PlatformMember,
  type PlatformRole,
} from '../_lib/supabaseAdmin.js'
import { sendEmail } from '../_lib/resendEmail.js'
import { campaignEmailHtml } from '../_lib/emailTemplates.js'

/**
 * Platform-team serverless endpoint (team management + campaign tool),
 * consolidated into one function to stay under the Hobby plan's function
 * limit — the vercel.json rewrites map the readable URLs onto `?action=`.
 *
 * Access is role-gated: team management needs `owner`/`admin`, campaigns are
 * open to every platform member (that is the marketing role's whole job).
 * The caller's role is read from platform_members, never trusted from input.
 */

const ROLES: PlatformRole[] = ['owner', 'admin', 'dev', 'marketing']

// A campaign send can fan out to a few dozen Resend calls; give the function
// room so it isn't killed mid-send (Hobby caps serverless duration at 60s).
export const config = { maxDuration: 60 }

/** Emails sent in parallel per batch — bounds memory without going so slow
 *  that a large audience hits the function timeout. */
const SEND_CONCURRENCY = 2

/** A 'sending' campaign older than this is assumed to be a killed run that can
 *  be safely taken over (already-delivered recipients are skipped). */
const STALE_SENDING_MS = 10 * 60 * 1000

interface Audience {
  vibe?: 'any' | 'missing' | 'set'
  plan?: 'any' | 'free' | 'paid' | 'essential' | 'pro'
  logo?: 'any' | 'has' | 'none'
  products?: 'any' | 'has' | 'none'
  created_within_days?: number | null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === 'string' ? req.query.action : ''

  switch (action) {
    case 'team-list':
      return handleTeamList(req, res)
    case 'team-add':
      return handleTeamAdd(req, res)
    case 'team-update':
      return handleTeamUpdate(req, res)
    case 'team-remove':
      return handleTeamRemove(req, res)
    case 'campaign-list':
      return handleCampaignList(req, res)
    case 'campaign-save':
      return handleCampaignSave(req, res)
    case 'campaign-audience':
      return handleCampaignAudience(req, res)
    case 'campaign-send':
      return handleCampaignSend(req, res)
    case 'campaign-delete':
      return handleCampaignDelete(req, res)
    default:
      res.status(404).json({ error: 'Action inconnue.' })
  }
}

function platformOrigin(req: VercelRequest): string {
  const rootDomain = process.env.VITE_ROOT_DOMAIN
  if (rootDomain) return `https://${rootDomain}`
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  return `${proto}://${req.headers.host}`
}

/** Every caller must be a platform member; the role decides what they can do. */
async function requireMember(req: VercelRequest, res: VercelResponse): Promise<PlatformMember | null> {
  const member = await getPlatformMemberFromAuthHeader(req.headers.authorization)
  if (!member) {
    res.status(403).json({ error: 'Accès réservé.' })
    return null
  }
  return member
}

/** Builds an id → {email, name} map once, so a campaign send doesn't do one
 *  auth lookup per recipient. */
async function loadUserDirectory(): Promise<Map<string, { email: string; name: string }>> {
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

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

async function handleTeamList(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canManageTeam(member.role)) {
      res.status(403).json({ error: 'Seuls les propriétaires et administrateurs gèrent l’équipe.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('platform_members')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: true })
    if (error) throw error

    const directory = await loadUserDirectory()
    const members = (data ?? []).map((row) => ({
      userId: row.user_id as string,
      role: row.role as PlatformRole,
      createdAt: row.created_at as string,
      email: directory.get(row.user_id as string)?.email ?? null,
      isSelf: row.user_id === member.id,
    }))

    res.status(200).json({ members, canManageOwners: member.role === 'owner' })
  } catch (err) {
    console.error('platform team-list failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleTeamAdd(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canManageTeam(member.role)) {
      res.status(403).json({ error: 'Seuls les propriétaires et administrateurs gèrent l’équipe.' })
      return
    }

    const { email, role } = (req.body ?? {}) as { email?: unknown; role?: unknown }
    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ error: 'Email invalide.' })
      return
    }
    if (typeof role !== 'string' || !ROLES.includes(role as PlatformRole)) {
      res.status(400).json({ error: 'Rôle invalide.' })
      return
    }
    if (role === 'owner' && member.role !== 'owner') {
      res.status(403).json({ error: 'Seul un propriétaire peut nommer un propriétaire.' })
      return
    }

    const directory = await loadUserDirectory()
    const targetId = [...directory.entries()].find(
      ([, value]) => value.email.toLowerCase() === email.trim().toLowerCase(),
    )?.[0]
    if (!targetId) {
      res.status(404).json({ error: 'Aucun compte Bitiko avec cet email. La personne doit d’abord créer son compte.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('platform_members')
      .upsert({ user_id: targetId, role, created_by: member.id }, { onConflict: 'user_id' })
    if (error) throw error

    res.status(200).json({ ok: true, role })
  } catch (err) {
    console.error('platform team-add failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleTeamUpdate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canManageTeam(member.role)) {
      res.status(403).json({ error: 'Seuls les propriétaires et administrateurs gèrent l’équipe.' })
      return
    }

    const { userId, role } = (req.body ?? {}) as { userId?: unknown; role?: unknown }
    if (typeof userId !== 'string' || !userId) {
      res.status(400).json({ error: 'Membre manquant.' })
      return
    }
    if (typeof role !== 'string' || !ROLES.includes(role as PlatformRole)) {
      res.status(400).json({ error: 'Rôle invalide.' })
      return
    }
    if (userId === member.id) {
      res.status(400).json({ error: 'Tu ne peux pas modifier ton propre rôle.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: target, error: targetError } = await admin
      .from('platform_members')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    if (targetError) throw targetError
    if (!target) {
      res.status(404).json({ error: 'Membre introuvable.' })
      return
    }
    // An admin may not touch owners, nor promote anyone to owner.
    if ((target.role === 'owner' || role === 'owner') && member.role !== 'owner') {
      res.status(403).json({ error: 'Seul un propriétaire peut gérer les propriétaires.' })
      return
    }
    if (target.role === 'owner' && role !== 'owner') {
      const stillOwner = await hasOtherOwner(userId)
      if (!stillOwner) {
        res.status(400).json({ error: 'Impossible de retirer le dernier propriétaire.' })
        return
      }
    }

    const { error } = await admin.from('platform_members').update({ role }).eq('user_id', userId)
    if (error) throw error

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('platform team-update failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleTeamRemove(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canManageTeam(member.role)) {
      res.status(403).json({ error: 'Seuls les propriétaires et administrateurs gèrent l’équipe.' })
      return
    }

    const { userId } = (req.body ?? {}) as { userId?: unknown }
    if (typeof userId !== 'string' || !userId) {
      res.status(400).json({ error: 'Membre manquant.' })
      return
    }
    if (userId === member.id) {
      res.status(400).json({ error: 'Tu ne peux pas retirer ton propre accès.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: target, error: targetError } = await admin
      .from('platform_members')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    if (targetError) throw targetError
    if (!target) {
      res.status(404).json({ error: 'Membre introuvable.' })
      return
    }
    if (target.role === 'owner') {
      if (member.role !== 'owner') {
        res.status(403).json({ error: 'Seul un propriétaire peut retirer un propriétaire.' })
        return
      }
      if (!(await hasOtherOwner(userId))) {
        res.status(400).json({ error: 'Impossible de retirer le dernier propriétaire.' })
        return
      }
    }

    const { error } = await admin.from('platform_members').delete().eq('user_id', userId)
    if (error) throw error

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('platform team-remove failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

/** True when another owner besides `excludeUserId` exists. */
async function hasOtherOwner(excludeUserId: string): Promise<boolean> {
  const admin = getSupabaseAdmin()
  const { count, error } = await admin
    .from('platform_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'owner')
    .neq('user_id', excludeUserId)
  if (error) throw error
  return (count ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

function sanitizeAudience(raw: unknown): Audience {
  const input = (raw ?? {}) as Record<string, unknown>
  const audience: Audience = {}
  const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined

  const vibe = pick(input.vibe, ['any', 'missing', 'set'] as const)
  if (vibe) audience.vibe = vibe
  const plan = pick(input.plan, ['any', 'free', 'paid', 'essential', 'pro'] as const)
  if (plan) audience.plan = plan
  const logo = pick(input.logo, ['any', 'has', 'none'] as const)
  if (logo) audience.logo = logo
  const products = pick(input.products, ['any', 'has', 'none'] as const)
  if (products) audience.products = products
  const days = Number(input.created_within_days)
  audience.created_within_days = Number.isFinite(days) && days > 0 ? Math.floor(days) : null
  return audience
}

async function handleCampaignList(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('campaigns')
      .select(
        'id, name, subject, body, audience, status, created_at, sent_at, recipient_count, sent_count, failed_count, button_label, button_url',
      )
      .order('created_at', { ascending: false })
    if (error) throw error

    res.status(200).json({ campaigns: data ?? [] })
  } catch (err) {
    console.error('platform campaign-list failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleCampaignSave(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return

    const { id, name, subject, body, audience, button_label, button_url } = (req.body ?? {}) as Record<string, unknown>
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Nom de campagne manquant.' })
      return
    }
    if (typeof subject !== 'string' || !subject.trim() || subject.length > 160) {
      res.status(400).json({ error: 'Objet invalide (160 caractères max).' })
      return
    }
    if (typeof body !== 'string' || !body.trim() || body.length > 8000) {
      res.status(400).json({ error: 'Contenu invalide (8000 caractères max).' })
      return
    }
    if (button_label != null && (typeof button_label !== 'string' || button_label.length > 60)) {
      res.status(400).json({ error: 'Texte du bouton invalide (60 caractères max).' })
      return
    }
    if (button_url != null && (typeof button_url !== 'string' || button_url.length > 2048)) {
      res.status(400).json({ error: 'Lien du bouton invalide (2048 caractères max).' })
      return
    }
    const trimmedUrl = typeof button_url === 'string' ? button_url.trim() : ''
    if (trimmedUrl && !/^(\/(?!\/)|https?:\/\/)/.test(trimmedUrl)) {
      res.status(400).json({ error: 'Lien du bouton invalide : commence par / ou https://.' })
      return
    }

    const admin = getSupabaseAdmin()
    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      body,
      audience: sanitizeAudience(audience),
      button_label: typeof button_label === 'string' && button_label.trim() ? button_label.trim() : null,
      button_url: trimmedUrl || null,
      updated_at: new Date().toISOString(),
    }

    if (typeof id === 'string' && id) {
      // Two operators can be editing the same draft. If the campaign stopped
      // being a draft (a colleague sent it), a bare UPDATE would silently hit
      // zero rows and the caller would keep editing a ghost — so check it.
      const { data, error } = await admin
        .from('campaigns')
        .update(payload)
        .eq('id', id)
        .eq('status', 'draft')
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data) {
        const { data: current, error: readError } = await admin
          .from('campaigns')
          .select('status, sent_at')
          .eq('id', id)
          .maybeSingle()
        if (readError) throw readError
        res.status(409).json({
          error:
            current?.status === 'sent'
              ? 'Cette campagne a déjà été envoyée, elle ne peut plus être modifiée.'
              : 'Impossible d’enregistrer : un envoi est en cours pour cette campagne.',
        })
        return
      }
      res.status(200).json({ id })
      return
    }

    const { data, error } = await admin
      .from('campaigns')
      .insert({ ...payload, created_by: member.id })
      .select('id')
      .single()
    if (error) throw error
    res.status(200).json({ id: data.id })
  } catch (err) {
    console.error('platform campaign-save failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleCampaignAudience(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return

    const audience = sanitizeAudience((req.body ?? {}).audience)
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('platform_audience', { audience, viewer: member.id })
    if (error) throw error

    const rows = (data ?? []) as {
      owner_id: string
      shop_name: string
      slug: string
      plan: string
      vibe: string | null
    }[]
    const directory = await loadUserDirectory()
    const withEmail = rows.filter((row) => directory.get(row.owner_id)?.email).length

    res.status(200).json({
      count: rows.length,
      withEmail,
      sample: rows.slice(0, 8).map((row) => ({
        name: row.shop_name,
        slug: row.slug,
        plan: row.plan,
        vibe: row.vibe,
      })),
    })
  } catch (err) {
    console.error('platform campaign-audience failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

/**
 * Claims a draft campaign for sending. Returns 'busy' when another run holds a
 * fresh claim (or the campaign is already sent), and takes over a stale claim
 * left behind by a run the platform killed mid-send.
 */
async function claimCampaign(id: string): Promise<'claimed' | 'busy' | 'sent'> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
  if (error) throw error
  if (data && data.length > 0) return 'claimed'

  const { data: row, error: readError } = await admin
    .from('campaigns')
    .select('status, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (readError) throw readError
  if (!row) return 'sent'
  if (row.status === 'sent') return 'sent'
  if (row.status !== 'sending') return 'busy'
  const age = Date.now() - new Date(row.updated_at as string).getTime()
  if (age < STALE_SENDING_MS) return 'busy'

  const { data: retake, error: retakeError } = await admin
    .from('campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'sending')
    .select('id')
  if (retakeError) throw retakeError
  return retake && retake.length > 0 ? 'claimed' : 'busy'
}

async function handleCampaignSend(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  let claimedId: string | null = null
  try {
    const member = await requireMember(req, res)
    if (!member) return

    const { id } = (req.body ?? {}) as { id?: unknown }
    if (typeof id !== 'string' || !id) {
      res.status(400).json({ error: 'Campagne manquante.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: campaign, error: campaignError } = await admin
      .from('campaigns')
      .select('id, subject, body, audience, status, button_label, button_url')
      .eq('id', id)
      .maybeSingle()
    if (campaignError) throw campaignError
    if (!campaign) {
      res.status(404).json({ error: 'Campagne introuvable.' })
      return
    }
    if (campaign.status === 'sent') {
      res.status(400).json({ error: 'Cette campagne a déjà été envoyée.' })
      return
    }

    const claim = await claimCampaign(id)
    if (claim === 'sent') {
      res.status(400).json({ error: 'Cette campagne a déjà été envoyée.' })
      return
    }
    if (claim !== 'claimed') {
      res.status(409).json({ error: 'Un envoi est déjà en cours pour cette campagne.' })
      return
    }
    claimedId = id

    const { data: audienceRows, error: audienceError } = await admin.rpc('platform_audience', {
      audience: campaign.audience ?? {},
      viewer: member.id,
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

    const origin = platformOrigin(req)
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
      if (logError) console.error('platform campaign-send: logging failed', logError)
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

    res.status(200).json({
      recipientCount: reachable.length,
      sent: totalSent,
      failed: totalFailed,
      sentThisRun: sent,
      failedThisRun: failed,
      skipped: recipients.length - reachable.length,
      alreadySent: alreadySent.size,
    })
  } catch (err) {
    // Release the claim so the operator can retry; already-delivered shops are
    // skipped on the next run, so a retry never double-sends.
    if (claimedId) {
      try {
        await getSupabaseAdmin()
          .from('campaigns')
          .update({ status: 'draft' })
          .eq('id', claimedId)
          .eq('status', 'sending')
      } catch (releaseErr) {
        console.error('platform campaign-send: releasing claim failed', releaseErr)
      }
    }
    console.error('platform campaign-send failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleCampaignDelete(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return

    const { id } = (req.body ?? {}) as { id?: unknown }
    if (typeof id !== 'string' || !id) {
      res.status(400).json({ error: 'Campagne manquante.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { error } = await admin.from('campaigns').delete().eq('id', id).eq('status', 'draft')
    if (error) throw error

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('platform campaign-delete failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
