import type { PlatformHealth } from '@/services/platform.service'

export type HealthLevel = 'ok' | 'warning' | 'critical'

export interface HealthCheck {
  key: string
  level: HealthLevel
  title: string
  detail: string
}

const SKIP_REASONS: Record<string, string> = {
  no_owner_email: 'propriétaire sans email',
  no_channel_adapter: 'canal non branché',
}

/** Transforme les compteurs bruts en vérifications lisibles, de la plus grave à la plus anodine. Pure — testée. */
export function healthChecks(health: PlatformHealth, now: number = Date.now()): HealthCheck[] {
  const checks: HealthCheck[] = []

  if (health.stuck_events > 0) {
    const oldest = health.oldest_pending_event ? Math.round((now - new Date(health.oldest_pending_event).getTime()) / 3_600_000) : 0
    checks.push({
      key: 'events',
      level: health.stuck_events >= 20 || oldest >= 24 ? 'critical' : 'warning',
      title: `${health.stuck_events} événement${health.stuck_events > 1 ? 's' : ''} non traité${health.stuck_events > 1 ? 's' : ''} depuis plus de 15 min`,
      detail: `Les alertes (commandes, stock) ne partent pas. Le plus ancien attend depuis ${oldest} h : vérifiez le cron « automation-dispatch » et la clé d’envoi d’emails.`,
    })
  } else {
    checks.push({ key: 'events', level: 'ok', title: 'Alertes traitées à temps', detail: `${health.pending_events} événement${health.pending_events > 1 ? 's' : ''} en cours de traitement.` })
  }

  if (health.failed_runs_7d > 0) {
    checks.push({
      key: 'runs',
      level: health.failed_runs_7d >= 10 ? 'critical' : 'warning',
      title: `${health.failed_runs_7d} envoi${health.failed_runs_7d > 1 ? 's' : ''} d’alerte en échec (7 jours)`,
      detail: 'Voir le détail ci-dessous : souvent une erreur du fournisseur d’emails ou une adresse invalide.',
    })
  } else {
    checks.push({ key: 'runs', level: 'ok', title: 'Aucun échec d’envoi d’alerte', detail: 'Sur les 7 derniers jours.' })
  }

  const skipped = Object.entries(health.skipped_runs_7d ?? {})
  const skippedTotal = skipped.reduce((sum, [, n]) => sum + n, 0)
  if (skippedTotal > 0) {
    checks.push({
      key: 'skipped',
      level: 'warning',
      title: `${skippedTotal} alerte${skippedTotal > 1 ? 's' : ''} ignorée${skippedTotal > 1 ? 's' : ''} (7 jours)`,
      detail: skipped.map(([reason, n]) => `${n} × ${SKIP_REASONS[reason] ?? reason}`).join(' · '),
    })
  }

  if (health.campaign_failures.length > 0) {
    const failed = health.campaign_failures.reduce((sum, c) => sum + c.failed_count, 0)
    checks.push({
      key: 'campaigns',
      level: 'warning',
      title: `${failed} email${failed > 1 ? 's' : ''} de campagne en échec (30 jours)`,
      detail: `${health.campaign_failures.length} campagne${health.campaign_failures.length > 1 ? 's' : ''} concernée${health.campaign_failures.length > 1 ? 's' : ''} : ${health.campaign_failures.map((c) => c.name).join(', ')}.`,
    })
  }

  if (health.stale_payments > 0) {
    checks.push({
      key: 'payments',
      level: health.stale_payments >= 3 ? 'critical' : 'warning',
      title: `${health.stale_payments} paiement${health.stale_payments > 1 ? 's' : ''} à vérifier depuis plus de 24 h`,
      detail: 'Des commerçants attendent l’activation de leur plan : ouvrez la page Paiements.',
    })
  } else {
    checks.push({ key: 'payments', level: 'ok', title: 'Aucune preuve de paiement en retard', detail: 'Toutes les preuves reçues sont traitées sous 24 h.' })
  }

  const rank: Record<HealthLevel, number> = { critical: 0, warning: 1, ok: 2 }
  return checks.sort((a, b) => rank[a.level] - rank[b.level])
}

/** Niveau global : le pire des vérifications. */
export function overallLevel(checks: HealthCheck[]): HealthLevel {
  if (checks.some((c) => c.level === 'critical')) return 'critical'
  if (checks.some((c) => c.level === 'warning')) return 'warning'
  return 'ok'
}
