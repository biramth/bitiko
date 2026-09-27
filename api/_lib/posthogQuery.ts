/**
 * Requêtes HogQL vers l'API PostHog (lecture serveur uniquement — jamais côté
 * client : POSTHOG_PERSONAL_API_KEY donne un accès large au projet, contrairement
 * au token public d'ingestion VITE_POSTHOG_KEY).
 *
 * Hôte : l'ingestion (VITE_POSTHOG_HOST, eu.i.posthog.com) et l'API privée
 * (POSTHOG_API_HOST, eu.posthog.com) sont deux domaines distincts côté PostHog —
 * https://posthog.com/docs/api#regional-hosts.
 */

const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const API_HOST = process.env.POSTHOG_API_HOST || 'https://eu.posthog.com'

export function isPostHogConfigured(): boolean {
  return !!API_KEY && !!PROJECT_ID
}

/** 'prod' sur la Production Vercel, 'dev' partout ailleurs (Preview, local) — un
 *  seul projet PostHog partagé entre `main` et `develop` (voir AGENTS.md), les
 *  évènements sont taggés `environment` côté client (src/lib/posthog.ts) et les
 *  requêtes HogQL filtrent dessus pour ne jamais mélanger les deux trafics. */
export function currentEnvironment(): 'prod' | 'dev' {
  return process.env.VERCEL_ENV === 'production' ? 'prod' : 'dev'
}

/** Exécute une requête HogQL et renvoie les lignes sous forme d'objets {colonne: valeur}. */
export async function runHogQL<T = Record<string, unknown>>(query: string): Promise<T[]> {
  if (!API_KEY || !PROJECT_ID) {
    throw new Error("PostHog n'est pas configuré sur ce serveur (POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID).")
  }
  const res = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query }, name: 'bitiko-platform-analytics' }),
  })
  const body = (await res.json()) as { detail?: unknown; columns?: unknown; results?: unknown }
  if (!res.ok) {
    throw new Error(typeof body.detail === 'string' ? body.detail : `PostHog a répondu ${res.status}.`)
  }
  const columns: string[] = Array.isArray(body.columns) ? body.columns : []
  const rows: unknown[][] = Array.isArray(body.results) ? body.results : []
  return rows.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]]))) as T[]
}
