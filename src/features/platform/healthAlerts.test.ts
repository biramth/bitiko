import { describe, expect, it } from 'vitest'
import type { PlatformHealth } from '@/services/platform.service'
import { healthChecks, overallLevel } from './healthAlerts'

const NOW = new Date('2026-09-26T12:00:00Z').getTime()
const healthy: PlatformHealth = {
  generated_at: '2026-09-26T12:00:00Z', pending_events: 2, stuck_events: 0, oldest_pending_event: null, failed_runs_7d: 0,
  skipped_runs_7d: {}, recent_failures: [], campaign_failures: [], stale_payments: 0, suspended_shops: 0,
}

describe('healthChecks', () => {
  it('tout va bien : uniquement des vérifications « ok »', () => {
    const checks = healthChecks(healthy, NOW)
    expect(checks.every((c) => c.level === 'ok')).toBe(true)
    expect(overallLevel(checks)).toBe('ok')
  })

  it('un événement coincé depuis plus d’un jour est critique et cite l’ancienneté', () => {
    const checks = healthChecks({ ...healthy, stuck_events: 3, oldest_pending_event: '2026-09-25T06:00:00Z' }, NOW)
    expect(checks[0]).toMatchObject({ key: 'events', level: 'critical' })
    expect(checks[0].detail).toContain('30 h')
    expect(overallLevel(checks)).toBe('critical')
  })

  it('classe les problèmes du plus grave au plus anodin', () => {
    const checks = healthChecks({ ...healthy, failed_runs_7d: 2, stale_payments: 4, skipped_runs_7d: { no_owner_email: 3 } }, NOW)
    expect(checks.map((c) => c.level)).toEqual(['critical', 'warning', 'warning', 'ok', 'ok'].slice(0, checks.length))
    expect(checks.find((c) => c.key === 'skipped')?.detail).toBe('3 × propriétaire sans email')
  })

  it('signale les campagnes en échec avec leurs noms', () => {
    const checks = healthChecks({ ...healthy, campaign_failures: [{ name: 'Rentrée', sent_at: '2026-09-20T10:00:00Z', failed_count: 3, recipient_count: 40 }] }, NOW)
    const campaign = checks.find((c) => c.key === 'campaigns')
    expect(campaign?.title).toContain('3 emails')
    expect(campaign?.detail).toContain('Rentrée')
  })
})
