import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/format'
import type { CategoryTotal, MonthTotals } from './bilan'

/** Encadré « fonction d'un plan supérieur » : dit clairement ce qui manque et mène aux offres. */
export function UpgradeHint({ title, children, planLabel }: { title: string; children: React.ReactNode; planLabel: string }) {
  return (
    <Card className="border-brand-100 bg-brand-50">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700">
          <Lock size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-0.5 text-sm text-gray-600">{children}</p>
          <Link
            to="/admin/parametres/facturation"
            className="mt-2 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            Passer au plan {planLabel}
          </Link>
        </div>
      </div>
    </Card>
  )
}

/** Répartition par catégorie : libellé, montant, part et barre proportionnelle. */
export function BreakdownList({
  items,
  currency,
  tone,
  emptyText,
}: {
  items: CategoryTotal[]
  currency: string
  tone: 'income' | 'expense'
  emptyText: string
}) {
  if (items.length === 0) return <p className="mt-3 text-sm text-gray-500">{emptyText}</p>
  const bar = tone === 'income' ? 'bg-emerald-500' : 'bg-rose-400'
  return (
    <ul className="mt-3 space-y-3">
      {items.map((item) => (
        <li key={item.category}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-gray-700">{item.label}</span>
            <span className="shrink-0 font-medium text-gray-900">
              {formatCurrency(item.amount, currency)} <span className="text-xs font-normal text-gray-400">· {item.share} %</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-100" role="presentation">
            <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${Math.max(item.share, 3)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function shortMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const name = new Date(year, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** Recettes (vert) et dépenses (rouge) mois par mois, en barres CSS — lisible sans bibliothèque. */
export function MonthBars({ months, currency }: { months: MonthTotals[]; currency: string }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.revenue, m.expenses]))
  return (
    <div>
      <div className="flex h-36 items-end gap-2 sm:gap-4" role="img" aria-label="Recettes et dépenses mois par mois">
        {months.map((m) => (
          <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-1">
              <div
                className="w-full max-w-8 rounded-t bg-emerald-500"
                style={{ height: `${(m.revenue / max) * 100}%`, minHeight: m.revenue > 0 ? 3 : 0 }}
                title={`Recettes : ${formatCurrency(m.revenue, currency)}`}
              />
              <div
                className="w-full max-w-8 rounded-t bg-rose-400"
                style={{ height: `${(m.expenses / max) * 100}%`, minHeight: m.expenses > 0 ? 3 : 0 }}
                title={`Dépenses : ${formatCurrency(m.expenses, currency)}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 sm:gap-4">
        {months.map((m) => (
          <div key={m.month} className="min-w-0 flex-1 text-center">
            <p className="text-xs font-medium text-gray-600">{shortMonth(m.month)}</p>
            <p className={`truncate text-[11px] ${m.result >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {m.result >= 0 ? '+' : '−'}
              {formatCurrency(Math.abs(m.result), currency)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden /> Recettes</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" aria-hidden /> Dépenses</span>
        <span className="text-gray-400">Sous chaque mois : le résultat</span>
      </div>
    </div>
  )
}
