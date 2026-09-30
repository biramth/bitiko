/**
 * Self-hosted storefront/platform analytics. Every page view is appended to
 * `public.page_views` with the public key; merchants read only their own
 * traffic (RLS), and the platform operator reads aggregates through the
 * get_platform_* RPCs. See migration 0033.
 *
 * CNIL (exemption de consentement pour la mesure d'audience) : cet outil
 * est configuré pour rester dans le champ de l'exemption —
 * - finalité strictement limitée à la mesure d'audience, pour le compte
 *   exclusif de l'éditeur, statistiques anonymes uniquement ;
 * - aucun identifiant partagé entre sites : la session est cloisonnée par
 *   boutique (`analyticsSessionKey`) ;
 * - aucun recoupement : `user_id` n'est jamais renseigné (toujours NULL) ;
 * - aucun paramètre d'URL collecté (`stripTrackingParams`), referrer réduit
 *   à l'hôte (`extractReferrerHost`), pas d'IP ni d'user-agent stockés ;
 * - opposition facile : signal DoNotTrack et clé d'opt-out locale
 *   (`bitiko:analytics-optout`, voir `src/lib/cookieConsent.ts`) ;
 * - durées limitées : session 6 mois absolus, lignes purgées à 13 mois
 *   (voir migration 0151).
 *
 * The insert goes over plain fetch (anon key, same RLS posture as the
 * supabase-js call it replaces) so this module — loaded on every page via
 * SelfAnalytics — never pulls supabase-js into the initial bundle.
 */

import { ANALYTICS_OPT_OUT_KEY } from '@/lib/cookieConsent'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const SESSION_KEY_PREFIX = 'bitiko:analytics-session:'
/** Durée de vie de l'identifiant de visite : 6 mois absolus, non renouvelés. */
export const SESSION_TTL_MS = 182 * 24 * 60 * 60 * 1000
const MIN_INTERVAL_MS = 3000 // de-dupe React StrictMode double effects + bfcache replays
const MAX_PATH_LENGTH = 300
const MAX_REFERRER_LENGTH = 300

const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegrambot|slackbot|twitterbot|linkedinbot|discordbot|pinterest|vkshare|wechat|line\s?bot|headlesschrome|phantomjs|lighthouse|preview|pingdom|uptimerobot/i

let lastSentAt = 0

/** Clé de session cloisonnée par périmètre : une boutique ne partage jamais son identifiant avec une autre. */
export function analyticsSessionKey(scope: string): string {
  return `${SESSION_KEY_PREFIX}${scope}`
}

/** Supprime query et ancre d'un chemin : aucun paramètre d'URL n'est collecté. */
export function stripTrackingParams(path: string): string {
  return path.split(/[?#]/, 1)[0] ?? ''
}

/** Réduit un referrer à son hôte seul (null si absent ou illisible). */
export function extractReferrerHost(referrer: string): string | null {
  if (!referrer) return null
  try {
    const host = new URL(referrer).hostname
    return host ? host.slice(0, MAX_REFERRER_LENGTH) : null
  } catch {
    return null
  }
}

function isOptedOut(): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return true
    return window.localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === '1'
  } catch {
    return false
  }
}

/** A random, locally-stored visitor id, scoped per shop. Returns null if storage is unavailable or expired. */
export function getSessionId(scope: string): string | null {
  try {
    const key = analyticsSessionKey(scope)
    const raw = window.localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; at?: number }
      // Durée absolue : jamais prolongée par les visites suivantes.
      if (parsed.id && typeof parsed.at === 'number' && Date.now() - parsed.at < SESSION_TTL_MS) {
        return parsed.id
      }
    }
    const id = crypto.randomUUID()
    window.localStorage.setItem(key, JSON.stringify({ id, at: Date.now() }))
    return id
  } catch {
    return null
  }
}

function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet'
  if (/mobi|android|iphone|ipod/i.test(ua)) return 'mobile'
  return 'desktop'
}

/**
 * Records one page view. Best-effort and silent: analytics must never affect
 * the storefront, so every failure path simply returns.
 *
 * `user_id` is always NULL (no cross-referencing with accounts — CNIL
 * exemption). The shop owner's own visits count as visits (accepted noise).
 */
export function trackPageView({ path, shopId }: { path: string; shopId: string | null }): void {
  if (import.meta.env.DEV) return // local dev shares the same Supabase project as prod — never pollute real analytics
  if (window.parent !== window) return // embedded preview (store builder iframe)
  if (BOT_PATTERN.test(navigator.userAgent)) return
  if (isOptedOut()) return // DoNotTrack signal or explicit opt-out (see /legal/cookies)

  const now = Date.now()
  if (now - lastSentAt < MIN_INTERVAL_MS) return

  const sessionId = getSessionId(shopId ?? 'plateforme')
  if (!sessionId) return

  lastSentAt = now

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return

  // Fire-and-forget after idle: analytics must never contend with first paint.
  const row = {
    shop_id: shopId,
    user_id: null,
    path: stripTrackingParams(path).slice(0, MAX_PATH_LENGTH),
    session_id: sessionId,
    referrer: extractReferrerHost(document.referrer),
    device: detectDevice(),
  }
  void fetch(`${SUPABASE_URL}/rest/v1/page_views`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  }).then(
    (res) => {
      if (!res.ok) console.warn('[analytics] page view not recorded:', res.status)
    },
    (err: unknown) => {
      console.warn('[analytics] page view not recorded:', err instanceof Error ? err.message : err)
    },
  )
}
