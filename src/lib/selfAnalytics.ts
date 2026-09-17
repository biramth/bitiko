import { supabase } from '@/lib/supabaseClient'

/**
 * Self-hosted storefront/platform analytics. Every page view is appended to
 * `public.page_views` with the public key; merchants read only their own
 * traffic (RLS), and the platform operator reads aggregates through the
 * get_platform_* RPCs. See migration 0033.
 *
 * This is intentionally tiny and privacy-light: no cookies, no third-party
 * network calls, one random session id kept locally (not tied to an account).
 */

const SESSION_STORAGE_KEY = 'bitiko:analytics-session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const MIN_INTERVAL_MS = 3000 // de-dupe React StrictMode double effects + bfcache replays
const MAX_PATH_LENGTH = 300
const MAX_REFERRER_LENGTH = 300

const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegrambot|slackbot|twitterbot|linkedinbot|discordbot|pinterest|vkshare|wechat|line\s?bot|headlesschrome|phantomjs|lighthouse|preview|pingdom|uptimerobot/i

let lastSentAt = 0

/** A random, locally-stored visitor id. Returns null if storage is unavailable. */
function getSessionId(): string | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; at?: number }
      if (parsed.id && typeof parsed.at === 'number' && Date.now() - parsed.at < SESSION_TTL_MS) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id: parsed.id, at: Date.now() }))
        return parsed.id
      }
    }
    const id = crypto.randomUUID()
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id, at: Date.now() }))
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
 */
export function trackPageView({ path, shopId }: { path: string; shopId: string | null }): void {
  if (import.meta.env.DEV) return // local dev shares the same Supabase project as prod — never pollute real analytics
  if (window.parent !== window) return // embedded preview (store builder iframe)
  if (BOT_PATTERN.test(navigator.userAgent)) return

  const now = Date.now()
  if (now - lastSentAt < MIN_INTERVAL_MS) return

  const sessionId = getSessionId()
  if (!sessionId) return

  lastSentAt = now

  void supabase
    .from('page_views')
    .insert({
      shop_id: shopId,
      path: path.slice(0, MAX_PATH_LENGTH),
      session_id: sessionId,
      referrer: document.referrer ? document.referrer.slice(0, MAX_REFERRER_LENGTH) : null,
      device: detectDevice(),
    })
    .then(({ error }) => {
      if (error) console.warn('[analytics] page view not recorded:', error.message)
    })
}
