import type { PlatformHealth, PlatformShop } from '@/services/platform.service'
import type { SubscriptionSummary } from '@/features/platform/shopsInsights'
import { healthChecks, overallLevel, type HealthLevel } from '@/features/platform/healthAlerts'

export interface HomeTodo {
  key: string
  label: string
  /** Nombre d'éléments à traiter ; 0 = rien à signaler. */
  count: number
  detail: string
  to: string
  level: HealthLevel
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

/** Ce que l'équipe doit regarder maintenant, dans l'ordre d'urgence. Chaque source est facultative (rôle sans accès). Pure — testée. */
export function buildHomeTodos(input: {
  pendingPayments?: number
  subscriptions?: SubscriptionSummary
  health?: PlatformHealth
  shops?: PlatformShop[]
  now?: number
}): HomeTodo[] {
  const now = input.now ?? Date.now()
  const todos: HomeTodo[] = []

  if (input.pendingPayments !== undefined) {
    const n = input.pendingPayments
    todos.push({
      key: 'payments',
      label: 'Paiements à vérifier',
      count: n,
      detail: n === 0 ? 'Aucune preuve en attente' : `${plural(n, 'commerçant attend', 'commerçants attendent')} l’activation de son plan`,
      to: '/plateforme/paiements',
      level: n === 0 ? 'ok' : n >= 3 ? 'critical' : 'warning',
    })
  }

  if (input.health) {
    const checks = healthChecks(input.health, now)
    const problems = checks.filter((c) => c.level !== 'ok')
    const level = overallLevel(checks)
    todos.push({
      key: 'health',
      label: 'Santé technique',
      count: problems.length,
      detail: problems.length === 0 ? 'Alertes et envois OK' : problems[0].title,
      to: '/plateforme/sante',
      level,
    })
  }

  if (input.subscriptions) {
    const n = input.subscriptions.expiringSoon.length + input.subscriptions.recentlyExpired.length
    todos.push({
      key: 'renewals',
      label: 'Abonnements à relancer',
      count: n,
      detail:
        n === 0
          ? 'Aucun renouvellement en vue'
          : `${input.subscriptions.expiringSoon.length} expirent sous 7 j · ${input.subscriptions.recentlyExpired.length} échus récemment`,
      to: '/plateforme/paiements',
      level: n === 0 ? 'ok' : 'warning',
    })
  }

  if (input.shops) {
    const suspended = input.shops.filter((s) => s.suspended_at).length
    if (suspended > 0) {
      todos.push({ key: 'suspended', label: 'Boutiques suspendues', count: suspended, detail: 'À réexaminer', to: '/plateforme/boutiques', level: 'warning' })
    }
    const fresh = input.shops.filter((s) => now - new Date(s.created_at).getTime() <= 7 * 86_400_000)
    const idle = fresh.filter((s) => s.products === 0).length
    todos.push({
      key: 'new',
      label: 'Nouvelles boutiques (7 j)',
      count: fresh.length,
      detail: fresh.length === 0 ? 'Aucune inscription cette semaine' : idle > 0 ? `dont ${idle} sans produit : à accompagner` : 'Toutes ont déjà des produits',
      to: '/plateforme/boutiques',
      level: 'ok',
    })
  }

  const rank: Record<HealthLevel, number> = { critical: 0, warning: 1, ok: 2 }
  return todos.sort((a, b) => rank[a.level] - rank[b.level])
}
