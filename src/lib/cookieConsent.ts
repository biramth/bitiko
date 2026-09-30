/**
 * Consentement aux traceurs de mesure d'audience, conforme aux
 * recommandations de la CNIL :
 * - aucun traceur non essentiel n'est chargé avant un choix explicite
 *   (voir `CookieBanner`, `DeferredThirdParty`, `SelfAnalytics`) ;
 * - le refus est aussi simple que l'acceptation (deux boutons équivalents) ;
 * - le consentement vaut 6 mois maximum, puis la bannière réapparaît ;
 * - le choix est stocké localement (preuve du consentement) avec sa date et
 *   la version du référentiel — un changement de version ré-affiche la
 *   bannière ;
 * - le retrait est possible à tout moment via le lien « Cookies » des pieds
 *   de page (évènement `REOPEN_EVENT`).
 */

export type ConsentStatus = 'accepted' | 'rejected'

export interface ConsentRecord {
  status: ConsentStatus
  /** ISO-8601 : date du choix, fait foi pour la durée de validité. */
  at: string
  version: number
}

export const CONSENT_STORAGE_KEY = 'bitiko:cookie-consent'
/** Incrémenter pour ré-demander le consentement (nouveau traceur, nouvelle finalité…). */
export const CONSENT_VERSION = 1
/** Durée de validité du consentement : 6 mois (recommandation CNIL). */
export const CONSENT_TTL_MS = 182 * 24 * 60 * 60 * 1000

export const CONSENT_CHANGED_EVENT = 'bitiko:cookie-consent-changed'
export const CONSENT_REOPEN_EVENT = 'bitiko:reopen-cookie-consent'

/** Opposition à la mesure d'audience interne exemptée (voir /legal/cookies). */
export const ANALYTICS_OPT_OUT_KEY = 'bitiko:analytics-optout'

/** Le visiteur s'est-il exclu de la mesure d'audience interne ? */
export function isAnalyticsOptedOut(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === '1'
  } catch {
    return false
  }
}

/** Mémorise le retrait (true) ou la réactivation (false) de la mesure interne. */
export function setAnalyticsOptOut(optOut: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (optOut) window.localStorage.setItem(ANALYTICS_OPT_OUT_KEY, '1')
    else window.localStorage.removeItem(ANALYTICS_OPT_OUT_KEY)
  } catch {
    // Stockage indisponible : sans effet persistant.
  }
}

function readRecord(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>
    if (parsed.status !== 'accepted' && parsed.status !== 'rejected') return null
    if (typeof parsed.at !== 'string' || Number.isNaN(Date.parse(parsed.at))) return null
    if (parsed.version !== CONSENT_VERSION) return null
    if (Date.now() - Date.parse(parsed.at) > CONSENT_TTL_MS) return null
    return { status: parsed.status, at: parsed.at, version: CONSENT_VERSION }
  } catch {
    return null
  }
}

/** Dernier choix valide, ou null si aucun / expiré / obsolète / illisible. */
export function getConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null
  return readRecord()
}

/** La bannière doit-elle être affichée ? */
export function needsConsent(): boolean {
  return getConsent() === null
}

/** Le visiteur a-t-il accepté la mesure d'audience (choix valide non expiré) ? */
export function hasConsented(): boolean {
  return getConsent()?.status === 'accepted'
}

function emitChanged(record: ConsentRecord): void {
  window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_CHANGED_EVENT, { detail: record }))
}

/** Enregistre le choix et prévient les traceurs en attente. */
export function setConsent(status: ConsentStatus): ConsentRecord {
  const record: ConsentRecord = { status, at: new Date().toISOString(), version: CONSENT_VERSION }
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Stockage indisponible : le choix vaut pour la session via l'évènement.
  }
  emitChanged(record)
  return record
}

/** Oublie le choix (lien « Cookies ») et demande sa re-saisie via la bannière. */
export function reopenConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY)
  } catch {
    // Pas de stockage : la bannière s'affiche quand même via l'évènement.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_REOPEN_EVENT))
}
