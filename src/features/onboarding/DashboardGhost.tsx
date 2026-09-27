import { BarChart3, LayoutDashboard, Package, Settings, ShoppingBag, Users } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const NAV = [
  { label: 'Tableau de bord', icon: LayoutDashboard, active: true },
  { label: 'Commandes', icon: ShoppingBag },
  { label: 'Produits', icon: Package },
  { label: 'Clients', icon: Users },
  { label: 'Statistiques', icon: BarChart3 },
  { label: 'Paramètres', icon: Settings },
]

const KPIS = ['Ventes du jour', 'Commandes', 'Visiteurs', 'Clients']

/**
 * Aperçu décoratif du tableau de bord affiché derrière la fenêtre de création
 * de boutique : le marchand voit déjà où il va arriver. Purement visuel (aucune
 * donnée, aucune interaction), donc masqué aux technologies d'assistance.
 */
export function DashboardGhost() {
  return (
    <div className="pointer-events-none absolute inset-0 flex select-none overflow-hidden bg-sand-50" aria-hidden="true">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-ink-900 px-3 py-4 lg:flex">
        <div className="mb-4 flex items-center gap-2 px-2">
          <Logo size={28} withWordmark={false} />
          <span className="font-heading text-lg font-bold tracking-tight text-white">Bitiko</span>
        </div>
        {NAV.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
              active ? 'bg-white/10 text-white' : 'text-white/50'
            }`}
          >
            <Icon size={16} />
            {label}
          </div>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sand-200 bg-white px-5">
          <div className="h-3 w-40 rounded-full bg-gray-200" />
          <div className="h-8 w-8 rounded-full bg-gray-200" />
        </div>

        <div className="space-y-5 p-5 sm:p-8">
          <div className="space-y-2">
            <div className="h-5 w-56 rounded-full bg-gray-300" />
            <div className="h-3 w-80 max-w-full rounded-full bg-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {KPIS.map((kpi) => (
              <div key={kpi} className="rounded-xl border border-sand-200 bg-white p-4">
                <p className="text-xs text-gray-400">{kpi}</p>
                <p className="mt-2 font-heading text-2xl font-bold text-gray-300">0</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-sand-200 bg-white p-5 lg:col-span-2">
              <div className="h-3 w-32 rounded-full bg-gray-200" />
              <div className="mt-6 flex h-40 items-end gap-3">
                {[35, 55, 40, 70, 50, 85, 60].map((height, index) => (
                  <div key={index} className="flex-1 rounded-t-md bg-brand-100" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-sand-200 bg-white p-5">
              <div className="h-3 w-24 rounded-full bg-gray-200" />
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gray-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-3/4 rounded-full bg-gray-200" />
                    <div className="h-2 w-1/2 rounded-full bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
