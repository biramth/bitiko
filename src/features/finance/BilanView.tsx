import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Download, FileText, Lock, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Wallet } from 'lucide-react'
import type { Plan } from '@/config/plans'
import type { Shop } from '@/types'
import { formatCurrency } from '@/utils/format'
import { variation } from './bilan'
import { BreakdownList, MonthBars, UpgradeHint } from './FinanceParts'
import { buildBilanCsv, downloadTextFile, exportFilename } from './exportCsv'
import { PRESET_LABELS, isPeriodAllowed, previousPeriod, resolvePeriod, type PeriodPreset } from './periods'
import { useBilan, useTopItems } from './useFinanceData'

const PRESETS: PeriodPreset[] = ['this_month', 'last_month', 'quarter', 'year']

function Variation({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-400">—</span>
  if (value === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-gray-500"><Minus size={12} aria-hidden /> stable</span>
  const up = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-700' : 'text-rose-600'}`}>
      {up ? <ArrowUpRight size={13} aria-hidden /> : <ArrowDownRight size={13} aria-hidden />}
      {up ? '+' : ''}{value} %
    </span>
  )
}

function Kpi({ label, value, hint, tone, extra }: { label: string; value: string; hint?: string; tone?: 'income' | 'expense' | 'result-good' | 'result-bad'; extra?: React.ReactNode }) {
  const color =
    tone === 'income' || tone === 'result-good' ? 'text-emerald-700' : tone === 'expense' || tone === 'result-bad' ? 'text-rose-600' : 'text-gray-900'
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
      <div className="mt-1 flex min-h-5 items-center justify-between gap-2">
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
        {extra}
      </div>
    </Card>
  )
}

/** Onglet « Bilan » : ce que le commerce a gagné, dépensé et ce qu'il lui reste, sur une période,
 *  avec export selon le plan (CSV dès Essentiel, bilan PDF imprimable en Pro). */
export function BilanView({ shop, plan }: { shop: Shop; plan: Plan }) {
  const [preset, setPreset] = useState<PeriodPreset>('this_month')
  const period = resolvePeriod(preset)
  const allowed = isPeriodAllowed(period, plan.financeHistoryMonths)
  const previous = previousPeriod(period)
  const currency = shop.currency

  const current = useBilan(shop.id, period, allowed)
  const before = useBilan(shop.id, previous, allowed && plan.financeComparison)
  const top = useTopItems(shop.id, period, allowed)

  const bilan = current.bilan
  const comparison = plan.financeComparison && before.bilan ? before.bilan : null

  const downloadCsv = () => {
    if (!bilan) return
    downloadTextFile(
      exportFilename('bilan', shop.name, `${period.from.slice(0, 7)}${period.monthSpan > 1 ? `-${period.to.slice(0, 7)}` : ''}`),
      buildBilanCsv({ shopName: shop.name, periodLabel: period.label, currency, bilan }),
    )
  }

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Période du bilan" className="flex flex-wrap gap-1.5">
        {PRESETS.map((key) => {
          const locked = !isPeriodAllowed(resolvePeriod(key), plan.financeHistoryMonths)
          const active = key === preset
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPreset(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? 'bg-ink-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {PRESET_LABELS[key]}
              {locked && <Lock size={12} aria-label="Plan supérieur" className={active ? 'text-white/70' : 'text-gray-400'} />}
            </button>
          )
        })}
      </div>

      <p className="text-sm text-gray-500">
        Bilan de <strong className="font-semibold text-gray-800">{period.label}</strong>
      </p>

      {!allowed ? (
        <UpgradeHint title="Cette période demande un plan supérieur" planLabel="Essentiel">
          Le plan gratuit affiche le mois en cours. Avec l’Essentiel, retrouvez jusqu’à 12 mois d’historique, le trimestre et l’année, et téléchargez votre bilan.
        </UpgradeHint>
      ) : current.isLoading ? (
        <Spinner />
      ) : current.isError ? (
        <ErrorMessage />
      ) : !bilan ? null : bilan.isEmpty ? (
        <Card padded={false}>
          <EmptyState
            icon={Wallet}
            title="Pas encore de chiffres sur cette période"
            description="Vos commandes payées et vos rendez-vous terminés sont comptés automatiquement. Ajoutez vos dépenses dans l’onglet Journal pour voir votre résultat."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi
              label="Recettes"
              value={formatCurrency(bilan.totals.revenue, currency)}
              tone="income"
              extra={comparison ? <Variation value={variation(bilan.totals.revenue, comparison.totals.revenue)} /> : undefined}
              hint={comparison ? `vs ${previous.label}` : 'Ce que vous avez encaissé'}
            />
            <Kpi
              label="Dépenses"
              value={formatCurrency(bilan.totals.expenses, currency)}
              tone="expense"
              extra={comparison ? <Variation value={variation(bilan.totals.expenses, comparison.totals.expenses)} /> : undefined}
              hint={comparison ? `vs ${previous.label}` : 'Ce que vous avez payé'}
            />
            <Kpi
              label={bilan.totals.result >= 0 ? 'Bénéfice' : 'Perte'}
              value={`${bilan.totals.result < 0 ? '− ' : ''}${formatCurrency(Math.abs(bilan.totals.result), currency)}`}
              tone={bilan.totals.result >= 0 ? 'result-good' : 'result-bad'}
              hint={bilan.totals.margin === null ? 'Recettes moins dépenses' : `Marge : ${bilan.totals.margin} % des recettes`}
              extra={comparison ? <Variation value={variation(bilan.totals.result, comparison.totals.result)} /> : undefined}
            />
          </div>

          {!plan.financeComparison && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <Lock size={11} aria-hidden /> La comparaison avec la période précédente est incluse dans le plan Pro.
            </p>
          )}

          <Card>
            <h2 className="text-base font-semibold text-gray-900">{bilan.months.length > 1 ? 'Mois par mois' : 'Recettes et dépenses'}</h2>
            <div className="mt-4">
              <MonthBars months={bilan.months} currency={currency} />
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">D’où vient l’argent</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  { label: 'Ventes en ligne', hint: 'commandes payées ou livrées', ...bilan.revenueBySource.orders },
                  { label: 'Prestations terminées', hint: 'rendez-vous honorés', ...bilan.revenueBySource.appointments },
                  { label: 'Recettes saisies', hint: 'ventes au comptoir, autres', ...bilan.revenueBySource.manual },
                ]
                  .filter((row) => row.amount > 0 || row.count > 0)
                  .map((row) => (
                    <li key={row.label} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-gray-700">
                        {row.label} <span className="text-xs text-gray-400">· {row.count} · {row.hint}</span>
                      </span>
                      <span className="shrink-0 font-medium text-gray-900">{formatCurrency(row.amount, currency)}</span>
                    </li>
                  ))}
              </ul>
              {top.data && top.data.length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900">Ce qui rapporte le plus</h3>
                  <ol className="mt-2 space-y-1.5 text-sm">
                    {top.data.map((item, index) => (
                      <li key={`${item.kind}-${item.name}`} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-gray-700">
                          <span className="mr-2 text-xs text-gray-400">{index + 1}.</span>
                          {item.name}
                          <Badge className="ml-2">{item.kind === 'service' ? 'prestation' : 'produit'}</Badge>
                        </span>
                        <span className="shrink-0 font-medium text-gray-900">{formatCurrency(item.amount, currency)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </Card>

            <Card className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">Où part l’argent</h2>
              <BreakdownList
                items={bilan.expensesByCategory}
                currency={currency}
                tone="expense"
                emptyText="Aucune dépense saisie. Notez vos dépenses dans l’onglet Journal pour connaître votre vrai bénéfice."
              />
            </Card>
          </div>

          <Card>
            <h2 className="text-base font-semibold text-gray-900">Télécharger votre bilan</h2>
            <p className="mt-0.5 text-sm text-gray-500">Pour votre comptable, votre banque ou vos archives.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Download size={15} aria-hidden />} onClick={downloadCsv}>
                Tableur Excel (CSV)
              </Button>
              <Link
                to={`/admin/gestion/bilan?periode=${preset}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                <FileText size={15} aria-hidden /> Bilan PDF imprimable
              </Link>
            </div>
          </Card>

          <p className="text-xs text-gray-400">
            Bilan simple, à titre de gestion : recettes = commandes payées ou livrées + rendez-vous terminés + recettes saisies ; dépenses = celles de votre journal. Ce n’est pas une comptabilité légale.
          </p>
        </>
      )}
    </div>
  )
}
