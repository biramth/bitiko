import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  canDeleteUsers,
  canManageCountries,
  canManageCatalog,
  canManageTeam,
  canSupportAccess,
  getPlatformMemberByUserId,
  getPlatformMemberFromAuthHeader,
  getPlatformOperatorFromAuthHeader,
  getSupabaseAdmin,
  type PlatformMember,
  type PlatformRole,
} from '../_lib/supabaseAdmin.js'
import { deleteUserCompletely } from '../_lib/userDeletion.js'
import { logAdminAudit } from '../_lib/auditLog.js'
import { sendEmail } from '../_lib/resendEmail.js'
import { recordUsage } from '../_lib/usage.js'
import { campaignEmailHtml, proActivatedEmailHtml, teamWelcomeEmailHtml } from '../_lib/emailTemplates.js'
import { can } from '../../src/features/platform/permissions.js'
import { PLANS } from '../../src/config/plans.js'
import { grantedSubscription, nextSubscription } from '../_lib/subscriptionPeriod.js'

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
    case 'support-access':
      return handleSupportAccess(req, res)
    case 'user-delete':
      return handleUserDelete(req, res)
    case 'campaign-list':
      return handleCampaignList(req, res)
    case 'campaign-save':
      return handleCampaignSave(req, res)
    case 'campaign-audience':
      return handleCampaignAudience(req, res)
    case 'campaign-send':
      return handleCampaignSend(req, res)
    case 'country-set':
      return handleCountrySet(req, res)
    case 'campaign-delete':
      return handleCampaignDelete(req, res)
    case 'promo-list':
      return handlePromoList(req, res)
    case 'promo-save':
      return handlePromoSave(req, res)
    case 'payment-pending':
      return handlePaymentPending(req, res)
    case 'payment-approve':
      return handlePaymentApprove(req, res)
    case 'payment-reject':
      return handlePaymentReject(req, res)
    case 'subscription-grant':
      return handleSubscriptionGrant(req, res)
    case 'audit-list':
      return handleAuditList(req, res)
    case 'biztype-list':
      return handleBizTypeList(req, res)
    case 'biztype-save':
      return handleBizTypeSave(req, res)
    case 'biztype-capabilities':
      return handleBizTypeCapabilities(req, res)
    case 'template-list':
      return handleTemplateList(req, res)
    case 'template-save':
      return handleTemplateSave(req, res)
    case 'template-compat':
      return handleTemplateCompat(req, res)
    case 'template-delete':
      return handleTemplateDelete(req, res)
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

/** Local alias kept so existing call sites don't churn — the shared helper in
 *  api/_lib/auditLog.ts is the single implementation (same best-effort /
 *  fail-closed semantics via `required`). */
async function logAudit(
  entry: {
    actorUserId: string
    actorEmail: string
    action: 'support_access' | 'user_delete' | 'team_add' | 'biztype_save' | 'promo_save' | 'template_save'
    targetUserId?: string
    targetShopId?: string
    details?: Record<string, unknown>
  },
  required = false,
): Promise<void> {
  await logAdminAudit(entry, required)
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

    const { email, role, fullName } = (req.body ?? {}) as { email?: unknown; role?: unknown; fullName?: unknown }
    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ error: 'Email invalide.' })
      return
    }
    const cleanEmail = email.trim().toLowerCase()
    if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) {
      res.status(400).json({ error: 'Nom complet invalide (2 à 100 caractères).' })
      return
    }
    const cleanName = fullName.trim()
    if (typeof role !== 'string' || !ROLES.includes(role as PlatformRole)) {
      res.status(400).json({ error: 'Rôle invalide.' })
      return
    }
    if (role === 'owner' && member.role !== 'owner') {
      res.status(403).json({ error: 'Seul un propriétaire peut nommer un propriétaire.' })
      return
    }

    const admin = getSupabaseAdmin()

    // Link a pre-existing Bitiko account if there is one, else create the
    // account right here: the invite no longer waits on the person signing up.
    // The welcome email then doubles as the password-setup carrier (its own
    // recovery link, so the invitee never has to go through onboarding).
    const directory = await loadUserDirectory()
    let targetId = [...directory.entries()].find(
      ([, value]) => value.email.toLowerCase() === cleanEmail,
    )?.[0]
    const accountCreated = !targetId
    if (!targetId) {
      const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: { full_name: cleanName },
      })
      if (createError) {
        // Détail goûté SQL ou SDK — la plupart du temps un email déjà pris.
        console.error('platform team-add createUser failed', createError)
        res.status(409).json({ error: 'Impossible de créer ce compte — l’email est peut-être déjà utilisé.' })
        return
      }
      targetId = createdUser.user.id
    }

    const { error } = await admin
      .from('platform_members')
      .upsert({ user_id: targetId, role, created_by: member.id }, { onConflict: 'user_id' })
    if (error) throw error

    // Setup link for a brand-new account: an untouched recovery token that
    // lets the invitee choose a password. generateLink builds it without
    // sending anything — the welcome email below is the only carrier.
    let setupUrl: string | undefined
    if (accountCreated) {
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: cleanEmail,
      })
      if (linkError) {
        console.error('platform team-add generateLink failed', linkError)
      } else {
        const origin = platformOrigin(req)
        setupUrl = `${origin}/reinitialiser-mot-de-passe?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=${link.properties.verification_type ?? 'recovery'}`
      }
    }

    const roleLabel = PLATFORM_ROLE_LABELS[role as PlatformRole] ?? role
    try {
      const origin = platformOrigin(req)
      await sendEmail({
        to: cleanEmail,
        subject: accountCreated ? 'Bienvenue dans l’équipe Bitiko' : 'Ton rôle sur la plateforme Bitiko',
        html: teamWelcomeEmailHtml({
          origin,
          email: cleanEmail,
          fullName: cleanName,
          roleLabel,
          isNewAccount: accountCreated,
          setupUrl,
          platformUrl: `${origin}/plateforme`,
        }),
      })
    } catch (emailErr) {
      console.error('platform team-add welcome email failed', emailErr)
    }

    await logAudit({
      actorUserId: member.id,
      actorEmail: member.email,
      action: 'team_add',
      targetUserId: targetId,
      details: { role, createdAccount: accountCreated, memberName: cleanName },
    })

    res.status(200).json({ ok: true, role, accountCreated, emailSent: true })
  } catch (err) {
    console.error('platform team-add failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

/** Role labels mirrored from src/features/platform/permissions.ts so the
 *  welcome email reads in French without importing browser-oriented code. */
const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  dev: 'Développeur',
  marketing: 'Marketing',
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

async function handleSupportAccess(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canSupportAccess(member.role)) {
      res.status(403).json({ error: 'Ton rôle ne permet pas d’ouvrir une session support.' })
      return
    }

    const shopId = (req.body ?? {}).shopId
    if (typeof shopId !== 'string' || !shopId) {
      res.status(400).json({ error: 'Boutique manquante.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: shop, error: shopError } = await admin
      .from('shops')
      .select('id, name, slug, owner_id')
      .eq('id', shopId)
      .maybeSingle()
    if (shopError) throw shopError
    if (!shop) {
      res.status(404).json({ error: 'Boutique introuvable.' })
      return
    }
    if (!shop.owner_id) {
      res.status(409).json({ error: 'Cette boutique n’a pas de propriétaire rattaché.' })
      return
    }

    const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(shop.owner_id)
    if (ownerError || !owner.user?.email) {
      res.status(404).json({ error: 'Compte du propriétaire introuvable.' })
      return
    }

    // Audit FIRST, fail-closed: the token is only handed out once the trace
    // exists. If the audit can't be written, the session must not open.
    await logAudit(
      {
        actorUserId: member.id,
        actorEmail: member.email,
        action: 'support_access',
        targetUserId: owner.user.id,
        targetShopId: shop.id,
        details: { shopName: shop.name, shopSlug: shop.slug },
      },
      true,
    )

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: owner.user.email,
    })
    if (linkError) throw linkError

    res.status(200).json({
      tokenHash: link.properties.hashed_token,
      type: link.properties.verification_type ?? 'magiclink',
      shopName: shop.name,
      shopSlug: shop.slug,
    })
  } catch (err) {
    console.error('platform support-access failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleUserDelete(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canDeleteUsers(member.role)) {
      res.status(403).json({ error: 'Ton rôle ne permet pas de supprimer des comptes.' })
      return
    }

    const userId = (req.body ?? {}).userId
    if (typeof userId !== 'string' || !userId) {
      res.status(400).json({ error: 'Utilisateur manquant.' })
      return
    }
    if (userId === member.id) {
      res.status(400).json({ error: 'Tu ne peux pas supprimer ton propre compte.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(userId)
    if (targetError || !target.user) {
      res.status(404).json({ error: 'Compte introuvable.' })
      return
    }
    const targetEmail = target.user.email ?? null

    // Guardrail one: a platform member's account can only be deleted by an
    // owner, and an owner can never delete the last owner.
    const targetMember = await getPlatformMemberByUserId(admin, userId)
    if (targetMember) {
      if (targetMember.role === 'owner') {
        if (member.role !== 'owner') {
          res.status(403).json({ error: 'Seul un propriétaire peut supprimer le compte d’un propriétaire.' })
          return
        }
        if (!(await hasOtherOwner(userId))) {
          res.status(400).json({ error: 'Impossible de supprimer le dernier propriétaire de la plateforme.' })
          return
        }
      } else if (member.role !== 'owner' && member.role !== 'admin') {
        res.status(403).json({ error: 'Seuls un propriétaire ou un administrateur peuvent supprimer ce compte.' })
        return
      }
    }

    // Audit FIRST, fail-closed: the trace of intent must exist even if the
    // deletion itself later hits a partial failure halfway through.
    await logAudit(
      {
        actorUserId: member.id,
        actorEmail: member.email,
        action: 'user_delete',
        targetUserId: userId,
        details: { targetEmail: targetEmail ?? null },
      },
      true,
    )

    await deleteUserCompletely(admin, userId, targetEmail)

    res.status(200).json({ deleted: true })
  } catch (err) {
    console.error('platform user-delete failed', err)
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

// ---------------------------------------------------------------------------
// Promotions (free months of a paid plan, redeemed through the
// redeem_promo_code RPC). A code grants real value, so beyond "is a platform
// member" the caller's role must hold the `send_campaigns` capability.
// ---------------------------------------------------------------------------

const PROMO_CODE_RE = /^[a-z0-9][a-z0-9-]{2,39}$/

async function requirePromoMember(req: VercelRequest, res: VercelResponse): Promise<PlatformMember | null> {
  const member = await requireMember(req, res)
  if (!member) return null
  if (!can(member.role, 'send_campaigns')) {
    res.status(403).json({ error: 'Votre rôle ne permet pas de gérer les promotions.' })
    return null
  }
  return member
}

async function handlePromoList(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    if (!(await requirePromoMember(req, res))) return

    const admin = getSupabaseAdmin()
    const { data: promos, error } = await admin
      .from('promo_codes')
      .select('code, label, description, plan, days, max_redemptions, starts_at, expires_at, active, show_on_landing, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error

    const { data: redemptions, error: redemptionsError } = await admin.from('promo_redemptions').select('code')
    if (redemptionsError) throw redemptionsError
    const counts = new Map<string, number>()
    for (const r of redemptions ?? []) counts.set(r.code, (counts.get(r.code) ?? 0) + 1)

    res.status(200).json({ promos: (promos ?? []).map((p) => ({ ...p, redemptions: counts.get(p.code) ?? 0 })) })
  } catch (err) {
    console.error('platform promo-list failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handlePromoSave(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const promoMember = await requirePromoMember(req, res)
    if (!promoMember) return

    const b = (req.body ?? {}) as Record<string, unknown>
    const isNew = b.create === true
    const code = typeof b.code === 'string' ? b.code.trim().toLowerCase() : ''
    if (!PROMO_CODE_RE.test(code)) {
      res.status(400).json({ error: 'Code invalide : 3 à 40 caractères, lettres minuscules, chiffres et tirets.' })
      return
    }
    const label = typeof b.label === 'string' ? b.label.trim() : ''
    if (label.length < 3 || label.length > 80) {
      res.status(400).json({ error: 'Titre invalide (3 à 80 caractères).' })
      return
    }
    const description = typeof b.description === 'string' ? b.description.trim() : ''
    if (description.length > 200) {
      res.status(400).json({ error: 'Description trop longue (200 caractères max).' })
      return
    }
    if (b.plan !== 'essential' && b.plan !== 'pro') {
      res.status(400).json({ error: 'Plan invalide.' })
      return
    }
    const days = Number(b.days)
    if (!Number.isInteger(days) || days < 1 || days > 366) {
      res.status(400).json({ error: 'Durée invalide (1 à 366 jours).' })
      return
    }
    let maxRedemptions: number | null = null
    if (b.max_redemptions !== null && b.max_redemptions !== undefined && b.max_redemptions !== '') {
      maxRedemptions = Number(b.max_redemptions)
      if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 1_000_000) {
        res.status(400).json({ error: "Nombre maximum d'utilisations invalide." })
        return
      }
    }
    const startsAt = typeof b.starts_at === 'string' && b.starts_at ? new Date(b.starts_at) : new Date()
    if (Number.isNaN(startsAt.getTime())) {
      res.status(400).json({ error: 'Date de début invalide.' })
      return
    }
    let expiresAt: Date | null = null
    if (typeof b.expires_at === 'string' && b.expires_at) {
      expiresAt = new Date(b.expires_at)
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= startsAt) {
        res.status(400).json({ error: 'La date de fin doit être après la date de début.' })
        return
      }
    }

    const fields = {
      label,
      description: description || null,
      plan: b.plan,
      days,
      max_redemptions: maxRedemptions,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      active: b.active !== false,
      show_on_landing: b.show_on_landing === true,
    }

    const admin = getSupabaseAdmin()
    if (isNew) {
      const { error } = await admin.from('promo_codes').insert({ code, ...fields })
      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ error: 'Ce code existe déjà.' })
          return
        }
        throw error
      }
    } else {
      const { data, error } = await admin.from('promo_codes').update(fields).eq('code', code).select('code')
      if (error) throw error
      if (!data || data.length === 0) {
        res.status(404).json({ error: 'Promotion introuvable.' })
        return
      }
    }

    await logAudit({
      actorUserId: promoMember.id,
      actorEmail: promoMember.email,
      action: 'promo_save',
      details: { code, plan: b.plan, days, create: isNew },
    })
    res.status(200).json({ saved: true, code })
  } catch (err) {
    console.error('platform promo-save failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

// ---------------------------------------------------------------------------
// Business catalog (PHASE-05): business_types + capabilities, owner/admin only.
// Slugs are immutable once created (compat layers reference them); types retire
// via status=deprecated, never by DELETE (shops may point at them).
// ---------------------------------------------------------------------------

const BIZTYPE_STATUSES = ['active', 'deprecated', 'draft'] as const
const SLUG_RE = /^[a-z0-9]+(_[a-z0-9]+)*$/

async function handleBizTypeList(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canManageCatalog(member.role)) {
      res.status(403).json({ error: 'Seuls les propriétaires et administrateurs gèrent le catalogue métier.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: types, error: typesError } = await admin
      .from('business_types')
      .select('id, slug, name, description, icon, status, updated_at')
      .order('slug')
    if (typesError) throw typesError

    const { data: capabilities, error: capsError } = await admin
      .from('capabilities')
      .select('id, code, label, description, category, status')
      .order('code')
    if (capsError) throw capsError

    const { data: mappings, error: mapError } = await admin
      .from('business_type_capabilities')
      .select('business_type_id, capability_id')
    if (mapError) throw mapError

    const { data: shopCounts, error: countError } = await admin
      .from('shops')
      .select('business_type_id')
    if (countError) throw countError
    const shopsByType = new Map<string, number>()
    for (const row of shopCounts ?? []) {
      const id = row.business_type_id as string | null
      if (!id) continue
      shopsByType.set(id, (shopsByType.get(id) ?? 0) + 1)
    }

    res.status(200).json({
      types: (types ?? []).map((t) => ({
        ...(t as Record<string, unknown>),
        shops: shopsByType.get((t as { id: string }).id) ?? 0,
      })),
      capabilities: capabilities ?? [],
      mappings: mappings ?? [],
    })
  } catch (err) {
    console.error('platform biztype-list failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleBizTypeSave(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canManageCatalog(member.role)) {
      res.status(403).json({ error: 'Seuls les propriétaires et administrateurs gèrent le catalogue métier.' })
      return
    }

    const { id, slug, name, description, icon, status, create } = (req.body ?? {}) as {
      id?: unknown
      slug?: unknown
      name?: unknown
      description?: unknown
      icon?: unknown
      status?: unknown
      create?: unknown
    }
    const cleanName = typeof name === 'string' ? name.trim() : ''
    if (!cleanName) {
      res.status(400).json({ error: 'Le nom est requis.' })
      return
    }
    if (!(BIZTYPE_STATUSES as readonly unknown[]).includes(status)) {
      res.status(400).json({ error: 'Statut invalide.' })
      return
    }

    const admin = getSupabaseAdmin()
    if (create) {
      const cleanSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : ''
      if (!SLUG_RE.test(cleanSlug)) {
        res.status(400).json({ error: 'Slug invalide (minuscules, chiffres, tirets bas).' })
        return
      }
      const { data, error } = await admin
        .from('business_types')
        .insert({
          slug: cleanSlug,
          name: cleanName,
          description: typeof description === 'string' ? description.trim() || null : null,
          icon: typeof icon === 'string' ? icon.trim() || null : null,
          status: status as string,
        })
        .select('id')
        .single()
      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ error: 'Ce slug existe déjà.' })
          return
        }
        throw error
      }
      await logAudit({
        actorUserId: member.id,
        actorEmail: member.email,
        action: 'biztype_save',
        details: { slug: cleanSlug },
      })
      res.status(200).json({ saved: true, id: (data as { id: string }).id })
      return
    }

    if (typeof id !== 'string' || !id) {
      res.status(400).json({ error: 'Identifiant manquant.' })
      return
    }
    // Slug is immutable: only name/description/icon/status can change.
    const { data, error } = await admin
      .from('business_types')
      .update({
        name: cleanName,
        description: typeof description === 'string' ? description.trim() || null : null,
        icon: typeof icon === 'string' ? icon.trim() || null : null,
        status: status as string,
      })
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) {
      res.status(404).json({ error: 'Type introuvable.' })
      return
    }
    await logAudit({
      actorUserId: member.id,
      actorEmail: member.email,
      action: 'biztype_save',
      details: { id, status },
    })
    res.status(200).json({ saved: true, id })
  } catch (err) {
    console.error('platform biztype-save failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleBizTypeCapabilities(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canManageCatalog(member.role)) {
      res.status(403).json({ error: 'Seuls les propriétaires et administrateurs gèrent le catalogue métier.' })
      return
    }

    const { typeId, codes } = (req.body ?? {}) as { typeId?: unknown; codes?: unknown }
    if (typeof typeId !== 'string' || !typeId) {
      res.status(400).json({ error: 'Type manquant.' })
      return
    }
    if (!Array.isArray(codes) || !codes.every((c): c is string => typeof c === 'string')) {
      res.status(400).json({ error: 'Capabilities invalides.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: typeRow, error: typeError } = await admin
      .from('business_types')
      .select('id')
      .eq('id', typeId)
      .maybeSingle()
    if (typeError) throw typeError
    if (!typeRow) {
      res.status(404).json({ error: 'Type introuvable.' })
      return
    }

    const { data: capRows, error: capsError } = await admin
      .from('capabilities')
      .select('id, code')
      .in('code', codes.length > 0 ? codes : ['__none__'])
    if (capsError) throw capsError
    const found = new Set((capRows ?? []).map((c) => (c as { code: string }).code))
    const unknown = codes.filter((c) => !found.has(c))
    if (unknown.length > 0) {
      res.status(400).json({ error: `Capabilities inconnues : ${unknown.join(', ')}` })
      return
    }

    const { error: deleteError } = await admin
      .from('business_type_capabilities')
      .delete()
      .eq('business_type_id', typeId)
    if (deleteError) throw deleteError
    if (capRows && capRows.length > 0) {
      const { error: insertError } = await admin.from('business_type_capabilities').insert(
        capRows.map((c) => ({
          business_type_id: typeId,
          capability_id: (c as { id: string }).id,
        })),
      )
      if (insertError) throw insertError
    }

    await logAudit({
      actorUserId: member.id,
      actorEmail: member.email,
      action: 'biztype_save',
      details: { typeId, codes },
    })
    res.status(200).json({ saved: true })
  } catch (err) {
    console.error('platform biztype-capabilities failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

// ---------------------------------------------------------------------------
// Catalogue gabarits : templates + compatibilités types, owner/admin only.
// `content` (jsonb) surcharge le gabarit code sans déploiement ; NULL = le
// code fait foi. Slugs immuables, retrait via status=deprecated.
// ---------------------------------------------------------------------------

const TEMPLATE_STATUSES = ['active', 'deprecated', 'draft'] as const

async function requireCatalogMember(req: VercelRequest, res: VercelResponse): Promise<PlatformMember | null> {
  const member = await requireMember(req, res)
  if (!member) return null
  if (!canManageCatalog(member.role)) {
    res.status(403).json({ error: 'Seuls les propriétaires et administrateurs gèrent le catalogue gabarits.' })
    return null
  }
  return member
}

async function handleTemplateList(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    if (!(await requireCatalogMember(req, res))) return
    const admin = getSupabaseAdmin()
    const { data: templates, error: templatesError } = await admin
      .from('templates')
      .select('id, slug, name, description, status, content, updated_at')
      .order('slug')
    if (templatesError) throw templatesError
    const { data: types, error: typesError } = await admin
      .from('business_types')
      .select('id, slug, name')
      .eq('status', 'active')
      .order('slug')
    if (typesError) throw typesError
    const { data: mappings, error: mapError } = await admin
      .from('template_business_types')
      .select('template_id, business_type_id')
    if (mapError) throw mapError
    // Boutiques utilisant chaque gabarit (template_id) : la suppression est
    // refusée tant qu'un gabarit est en usage.
    const { data: shopRows, error: shopsError } = await admin.from('shops').select('template_id')
    if (shopsError) throw shopsError
    const shopsByTemplate = new Map<string, number>()
    for (const row of shopRows ?? []) {
      const key = (row as { template_id: string | null }).template_id
      if (!key) continue
      shopsByTemplate.set(key, (shopsByTemplate.get(key) ?? 0) + 1)
    }
    res.status(200).json({
      templates: (templates ?? []).map((t) => ({
        ...(t as Record<string, unknown>),
        shops: shopsByTemplate.get((t as { slug: string }).slug) ?? 0,
      })),
      types: types ?? [],
      mappings: mappings ?? [],
    })
  } catch (err) {
    console.error('platform template-list failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleTemplateSave(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireCatalogMember(req, res)
    if (!member) return
    const { id, slug, name, description, status, content, create } = (req.body ?? {}) as {
      id?: unknown
      slug?: unknown
      name?: unknown
      description?: unknown
      status?: unknown
      content?: unknown
      create?: unknown
    }
    const cleanName = typeof name === 'string' ? name.trim() : ''
    if (!cleanName) {
      res.status(400).json({ error: 'Le nom est requis.' })
      return
    }
    if (!(TEMPLATE_STATUSES as readonly unknown[]).includes(status)) {
      res.status(400).json({ error: 'Statut invalide.' })
      return
    }
    if (content !== null && content !== undefined && (typeof content !== 'object' || Array.isArray(content))) {
      res.status(400).json({ error: 'Le contenu doit être un objet JSON ou null.' })
      return
    }

    const admin = getSupabaseAdmin()
    if (create) {
      const cleanSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : ''
      if (!SLUG_RE.test(cleanSlug)) {
        res.status(400).json({ error: 'Slug invalide (minuscules, chiffres, tirets bas).' })
        return
      }
      const { data, error } = await admin
        .from('templates')
        .insert({
          slug: cleanSlug,
          name: cleanName,
          description: typeof description === 'string' ? description.trim() || null : null,
          status: status as string,
          content: (content ?? null) as never,
        })
        .select('id')
        .single()
      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ error: 'Ce slug existe déjà.' })
          return
        }
        throw error
      }
      await logAudit({
        actorUserId: member.id,
        actorEmail: member.email,
        action: 'template_save',
        details: { slug: cleanSlug },
      })
      res.status(200).json({ saved: true, id: (data as { id: string }).id })
      return
    }

    if (typeof id !== 'string' || !id) {
      res.status(400).json({ error: 'Identifiant manquant.' })
      return
    }
    const { data, error } = await admin
      .from('templates')
      .update({
        name: cleanName,
        description: typeof description === 'string' ? description.trim() || null : null,
        status: status as string,
        content: (content ?? null) as never,
      })
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) {
      res.status(404).json({ error: 'Gabarit introuvable.' })
      return
    }
    await logAudit({
      actorUserId: member.id,
      actorEmail: member.email,
      action: 'template_save',
      details: { id, status },
    })
    res.status(200).json({ saved: true, id })
  } catch (err) {
    console.error('platform template-save failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleTemplateCompat(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireCatalogMember(req, res)
    if (!member) return
    const { templateId, typeIds } = (req.body ?? {}) as { templateId?: unknown; typeIds?: unknown }
    if (typeof templateId !== 'string' || !templateId) {
      res.status(400).json({ error: 'Gabarit manquant.' })
      return
    }
    if (!Array.isArray(typeIds) || !typeIds.every((t): t is string => typeof t === 'string')) {
      res.status(400).json({ error: 'Types invalides.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: templateRow, error: templateError } = await admin
      .from('templates')
      .select('id')
      .eq('id', templateId)
      .maybeSingle()
    if (templateError) throw templateError
    if (!templateRow) {
      res.status(404).json({ error: 'Gabarit introuvable.' })
      return
    }
    if (typeIds.length > 0) {
      const { data: typeRows, error: typesError } = await admin
        .from('business_types')
        .select('id')
        .in('id', typeIds)
      if (typesError) throw typesError
      if ((typeRows ?? []).length !== typeIds.length) {
        res.status(400).json({ error: "Un type d'activité est introuvable." })
        return
      }
    }

    const { error: deleteError } = await admin
      .from('template_business_types')
      .delete()
      .eq('template_id', templateId)
    if (deleteError) throw deleteError
    if (typeIds.length > 0) {
      const { error: insertError } = await admin.from('template_business_types').insert(
        typeIds.map((business_type_id) => ({ template_id: templateId, business_type_id })),
      )
      if (insertError) throw insertError
    }

    await logAudit({
      actorUserId: member.id,
      actorEmail: member.email,
      action: 'template_save',
      details: { templateId, typeIds },
    })
    res.status(200).json({ saved: true })
  } catch (err) {
    console.error('platform template-compat failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

async function handleTemplateDelete(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireCatalogMember(req, res)
    if (!member) return
    const { id } = (req.body ?? {}) as { id?: unknown }
    if (typeof id !== 'string' || !id) {
      res.status(400).json({ error: 'Identifiant manquant.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: template, error: templateError } = await admin
      .from('templates')
      .select('id, slug')
      .eq('id', id)
      .maybeSingle()
    if (templateError) throw templateError
    if (!template) {
      res.status(404).json({ error: 'Gabarit introuvable.' })
      return
    }
    // Garde-fou : un gabarit utilisé par des boutiques ne se supprime pas —
    // il se déprécie (les vitrines existantes continuent de fonctionner).
    const { count, error: countError } = await admin
      .from('shops')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', (template as { slug: string }).slug)
    if (countError) throw countError
    if ((count ?? 0) > 0) {
      res.status(409).json({
        error: `Impossible : ${count} boutique(s) utilisent encore ce gabarit. Passe-le en déprécié.`,
      })
      return
    }

    const { error: deleteError } = await admin.from('templates').delete().eq('id', id)
    if (deleteError) throw deleteError

    await logAudit({
      actorUserId: member.id,
      actorEmail: member.email,
      action: 'template_save',
      details: { id, deleted: true },
    })
    res.status(200).json({ deleted: true })
  } catch (err) {
    console.error('platform template-delete failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

// ---------------------------------------------------------------------------
// Manual payments (moved from api/admin/payments.ts — one fewer serverless
// function, Hobby plan limit. Behavior identical: owner/admin operators,
// manual Wave verification, audit-trailed approve/reject).
// ---------------------------------------------------------------------------

async function handlePaymentPending(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const admin = await getPlatformOperatorFromAuthHeader(req.headers.authorization)
    if (!admin) {
      res.status(403).json({ error: 'Accès réservé.' })
      return
    }

    const supabase = getSupabaseAdmin()
    const { data: payments, error } = await supabase
      .from('wave_payments')
      .select('id, shop_id, plan, amount, currency, client_reference, created_at, proof_path, payer_phone, transaction_ref, proof_submitted_at, shop:shops(name, slug, whatsapp_number, owner_id)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw error

    const enriched = await Promise.all(
      (payments ?? []).map(async (payment) => {
        const shop = payment.shop as unknown as {
          name: string
          slug: string
          whatsapp_number: string
          owner_id: string
        } | null
        let ownerEmail: string | null = null
        if (shop?.owner_id) {
          const { data } = await supabase.auth.admin.getUserById(shop.owner_id)
          ownerEmail = data.user?.email ?? null
        }
        let proofUrl: string | null = null
        if (payment.proof_path) {
          const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrl(payment.proof_path, 3600)
          proofUrl = signed?.signedUrl ?? null
        }
        return { ...payment, shop, ownerEmail, proofUrl }
      }),
    )

    res.status(200).json({ payments: enriched })
  } catch (err) {
    console.error('admin pending-payments failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

/**
 * Manual counterpart to settlePaymentFromWaveSession for the Wave manual-bridge
 * payments (see api/account.ts).
 *
 * The plan to activate is chosen explicitly by the platform admin here, in the
 * request body — it is never read from the payment row. That row only carries
 * the merchant's own claim (requested plan + its price), which cannot be
 * trusted: the admin verifies the amount that actually arrived in the Wave
 * transaction list and picks the matching plan (Essentiel = PLANS.essential,
 * Pro = PLANS.pro). Both the payment row and the subscription are rewritten to
 * that verified plan + its real price, so the audit trail reflects what was
 * actually confirmed rather than what was claimed.
 */
async function handlePaymentApprove(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const admin = await getPlatformOperatorFromAuthHeader(req.headers.authorization)
    if (!admin) {
      res.status(403).json({ error: 'Accès réservé.' })
      return
    }

    const body: { paymentId?: unknown; plan?: unknown } = req.body ?? {}
    const { paymentId, plan } = body
    if (typeof paymentId !== 'string' || !paymentId) {
      res.status(400).json({ error: 'paymentId manquant.' })
      return
    }
    if (plan !== 'essential' && plan !== 'pro') {
      res.status(400).json({ error: 'Plan payant invalide.' })
      return
    }
    const verifiedPlan = PLANS[plan]

    const supabase = getSupabaseAdmin()
    const { data: payment, error: paymentError } = await supabase
      .from('wave_payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) {
      res.status(404).json({ error: 'Paiement introuvable.' })
      return
    }
    if (payment.status === 'succeeded') {
      res.status(200).json({ status: 'succeeded' })
      return
    }

    // Renouvellement anticipé : la période s'ajoute à la fin en cours (voir
    // nextSubscription — même règle que le paiement Wave automatique).
    const { data: currentSub } = await supabase
      .from('shop_subscriptions')
      .select('plan, current_period_end')
      .eq('shop_id', payment.shop_id)
      .maybeSingle()
    const next = nextSubscription({ current: currentSub, paidPlan: plan })
    const periodEnd = next.periodEnd

    const { error: updatePaymentError } = await supabase
      .from('wave_payments')
      .update({
        status: 'succeeded',
        plan,
        amount: verifiedPlan.priceXof,
        completed_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
    if (updatePaymentError) throw updatePaymentError

    const { error: upsertSubError } = await supabase
      .from('shop_subscriptions')
      .upsert(
        { shop_id: payment.shop_id, plan: next.plan, status: 'active', current_period_end: periodEnd },
        { onConflict: 'shop_id' },
      )
    if (upsertSubError) throw upsertSubError

    try {
      const { data: shop } = await supabase.from('shops').select('name, owner_id').eq('id', payment.shop_id).maybeSingle()
      const ownerId = shop?.owner_id
      const { data: ownerData } = ownerId ? await supabase.auth.admin.getUserById(ownerId) : { data: { user: null } }
      const rootDomain = process.env.VITE_ROOT_DOMAIN
      const origin = rootDomain ? `https://${rootDomain}` : `${(req.headers['x-forwarded-proto'] as string) ?? 'https'}://${req.headers.host}`
      if (shop && ownerData.user?.email) {
        await sendEmail({
          to: ownerData.user.email,
          subject: `Bienvenue dans Bitiko ${verifiedPlan.label} — ${shop.name}`,
          html: proActivatedEmailHtml({
            origin,
            shopName: shop.name,
            periodEndLabel: new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
            planLabel: verifiedPlan.label,
          }),
        })
      }
    } catch (emailErr) {
      console.error('admin approve-payment: confirmation email failed', emailErr)
    }

    await logAdminAudit({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: 'payment_approve',
      targetShopId: payment.shop_id,
      details: { paymentId, plan, amount: verifiedPlan.priceXof },
    })
    res.status(200).json({ status: 'succeeded' })
  } catch (err) {
    console.error('admin approve-payment failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

/** For a claimed payment that never actually shows up in Wave's transaction list. */
async function handlePaymentReject(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const admin = await getPlatformOperatorFromAuthHeader(req.headers.authorization)
    if (!admin) {
      res.status(403).json({ error: 'Accès réservé.' })
      return
    }

    const { paymentId, reason } = req.body ?? {}
    if (typeof paymentId !== 'string' || !paymentId) {
      res.status(400).json({ error: 'paymentId manquant.' })
      return
    }
    const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 300) : ''

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('wave_payments')
      .update({ status: 'failed', rejection_reason: cleanReason || null })
      .eq('id', paymentId)
      .eq('status', 'pending')
    if (error) throw error

    await logAdminAudit({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: 'payment_reject',
      details: { paymentId, reason: cleanReason || null },
    })
    res.status(200).json({ status: 'failed' })
  } catch (err) {
    console.error('admin reject-payment failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

/** Opens/closes a country for merchants (`countries.is_enabled`). Sénégal is
 *  the home market and can never be turned off. */
async function handleCountrySet(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canManageCountries(member.role)) {
      res.status(403).json({ error: 'Seuls les propriétaires et administrateurs gèrent les pays.' })
      return
    }

    const { code, enabled } = (req.body ?? {}) as { code?: unknown; enabled?: unknown }
    if (typeof code !== 'string' || !/^[A-Z]{2}$/.test(code)) {
      res.status(400).json({ error: 'Code pays invalide.' })
      return
    }
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Statut invalide.' })
      return
    }
    if (code === 'SN' && !enabled) {
      res.status(400).json({ error: 'Le Sénégal ne peut pas être désactivé.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: country, error: countryError } = await admin
      .from('countries')
      .select('code')
      .eq('code', code)
      .maybeSingle()
    if (countryError) throw countryError
    if (!country) {
      res.status(404).json({ error: 'Pays introuvable.' })
      return
    }

    const { error } = await admin.from('countries').update({ is_enabled: enabled }).eq('code', code)
    if (error) throw error

    res.status(200).json({ ok: true, code, enabled })
  } catch (err) {
    console.error('platform country-set failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Offre ou prolongation manuelle d'un abonnement (geste commercial, paiement reçu hors Wave). Motif obligatoire, tracé avant l'écriture. */
async function handleSubscriptionGrant(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const operator = await getPlatformOperatorFromAuthHeader(req.headers.authorization)
    if (!operator) {
      res.status(403).json({ error: 'Accès réservé.' })
      return
    }
    const body: { shopId?: unknown; plan?: unknown; days?: unknown; reason?: unknown } = req.body ?? {}
    if (typeof body.shopId !== 'string' || !UUID_PATTERN.test(body.shopId)) {
      res.status(400).json({ error: 'Boutique invalide.' })
      return
    }
    if (body.plan !== 'essential' && body.plan !== 'pro') {
      res.status(400).json({ error: 'Plan payant invalide.' })
      return
    }
    const days = Number(body.days)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      res.status(400).json({ error: 'La durée doit être comprise entre 1 et 365 jours.' })
      return
    }
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : ''
    if (reason.length < 3) {
      res.status(400).json({ error: 'Indiquez le motif de cette offre (il est conservé dans le journal).' })
      return
    }

    const supabase = getSupabaseAdmin()
    const { data: shop } = await supabase.from('shops').select('id, name').eq('id', body.shopId).maybeSingle()
    if (!shop) {
      res.status(404).json({ error: 'Boutique introuvable.' })
      return
    }
    const { data: currentSub } = await supabase
      .from('shop_subscriptions')
      .select('plan, current_period_end')
      .eq('shop_id', body.shopId)
      .maybeSingle()
    const result = grantedSubscription({ current: currentSub, plan: body.plan, days })
    if (!result.ok) {
      res.status(409).json({ error: 'Un plan supérieur est déjà actif sur cette boutique : rien n’a été modifié.' })
      return
    }

    // La trace d'abord : sans elle, pas d'offre.
    await logAdminAudit(
      {
        actorUserId: operator.id,
        actorEmail: operator.email,
        action: 'subscription_grant',
        targetShopId: body.shopId,
        details: { plan: result.plan, days, reason, periodEnd: result.periodEnd, previousPlan: currentSub?.plan ?? 'free' },
      },
      true,
    )
    const { error: upsertError } = await supabase
      .from('shop_subscriptions')
      .upsert({ shop_id: body.shopId, plan: result.plan, status: 'active', current_period_end: result.periodEnd }, { onConflict: 'shop_id' })
    if (upsertError) throw upsertError

    res.status(200).json({ plan: result.plan, periodEnd: result.periodEnd })
  } catch (err) {
    console.error('subscription-grant failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

/** Journal des actions sensibles de l'équipe (propriétaires et administrateurs uniquement). */
async function handleAuditList(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const member = await requireMember(req, res)
    if (!member) return
    if (!canManageTeam(member.role)) {
      res.status(403).json({ error: 'Seuls les propriétaires et administrateurs consultent le journal.' })
      return
    }
    const action = typeof req.query.action_filter === 'string' ? req.query.action_filter : ''
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const admin = getSupabaseAdmin()
    let query = admin
      .from('admin_audit_log')
      .select('id, actor_email, action, target_user_id, target_shop_id, details, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + 49)
    if (action) query = query.eq('action', action)
    const { data, error } = await query
    if (error) throw error
    const rows = data ?? []
    const shopIds = [...new Set(rows.map((r) => r.target_shop_id as string | null).filter((id): id is string => !!id))]
    const shopNames = new Map<string, string>()
    if (shopIds.length > 0) {
      const { data: shops } = await admin.from('shops').select('id, name').in('id', shopIds)
      for (const shop of shops ?? []) shopNames.set(shop.id as string, shop.name as string)
    }
    res.status(200).json({
      entries: rows.map((row) => ({
        id: row.id as string,
        actorEmail: row.actor_email as string,
        action: row.action as string,
        shopId: (row.target_shop_id as string | null) ?? null,
        shopName: row.target_shop_id ? (shopNames.get(row.target_shop_id as string) ?? null) : null,
        details: (row.details ?? {}) as Record<string, unknown>,
        createdAt: row.created_at as string,
      })),
      hasMore: rows.length === 50,
    })
  } catch (err) {
    console.error('audit-list failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
