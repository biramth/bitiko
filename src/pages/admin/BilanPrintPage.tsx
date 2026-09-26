import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { UpgradeHint } from '@/features/finance/FinanceParts'
import { useBilan, useTopItems } from '@/features/finance/useFinanceData'
import { PRESET_LABELS, isPeriodAllowed, monthLabel, resolvePeriod, type PeriodPreset } from '@/features/finance/periods'
import { PageLoader } from '@/components/ui/PageLoader'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { usePageSeo } from '@/hooks/usePageSeo'
import { formatCurrency } from '@/utils/format'

const VALID: PeriodPreset[] = ['this_month', 'last_month', 'quarter', 'year']

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={bold ? 'font-semibold' : ''}>
      <td className="border-b border-gray-200 py-1.5 pr-4">{label}</td>
      <td className="border-b border-gray-200 py-1.5 text-right tabular-nums">{value}</td>
    </tr>
  )
}

/** Bilan imprimable (tous les plans) : une page A4 sobre à enregistrer en PDF depuis la boîte d'impression
 *  du navigateur. Aucune bibliothèque PDF : rien à charger, rendu identique partout. */
export function BilanPrintPage() {
  usePageSeo({ title: 'Bilan — Bitiko', noindex: true })
  const { data: shop, isLoading } = useMyShop()
  const { plan, isLoading: planLoading } = useShopPlan(shop?.id)
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('periode') as PeriodPreset | null
  const preset: PeriodPreset = requested && VALID.includes(requested) ? requested : 'this_month'
  const period = resolvePeriod(preset)
  const allowed = isPeriodAllowed(period, plan.financeHistoryMonths)

  const { bilan, isLoading: bilanLoading, isError } = useBilan(shop?.id, period, allowed)
  const top = useTopItems(shop?.id, period, allowed)

  if (isLoading || planLoading) return <PageLoader />
  if (!shop) return null

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <UpgradeHint title="Cette période demande un plan supérieur" planLabel="Essentiel">
          Le plan gratuit permet d’imprimer le bilan du mois en cours. L’Essentiel ouvre 12 mois d’historique, le trimestre et l’année.
        </UpgradeHint>
        <Link to="/admin/gestion" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft size={14} aria-hidden /> Retour aux finances
        </Link>
      </div>
    )
  }

  const currency = shop.currency
  const money = (amount: number) => formatCurrency(amount, currency)
  const generated = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-gray-900 print:max-w-none print:p-0 sm:p-10">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link to="/admin/gestion" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft size={14} aria-hidden /> Retour
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Printer size={15} aria-hidden /> Imprimer / Enregistrer en PDF
        </button>
      </div>

      {bilanLoading ? (
        <PageLoader />
      ) : isError || !bilan ? (
        <ErrorMessage />
      ) : (
        <article>
          <header className="border-b-2 border-gray-900 pb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Bilan simple</p>
            <h1 className="mt-1 font-heading text-2xl font-bold">{shop.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {PRESET_LABELS[preset]} — {period.label} · du {period.from.split('-').reverse().join('/')} au {period.to.split('-').reverse().join('/')}
            </p>
          </header>

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Résumé</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                <Row label="Recettes" value={money(bilan.totals.revenue)} />
                <Row label="Dépenses" value={money(bilan.totals.expenses)} />
                <Row
                  label={bilan.totals.result >= 0 ? 'Bénéfice' : 'Perte'}
                  value={`${bilan.totals.result < 0 ? '− ' : ''}${money(Math.abs(bilan.totals.result))}`}
                  bold
                />
                {bilan.totals.margin !== null && <Row label="Marge (résultat / recettes)" value={`${bilan.totals.margin} %`} />}
              </tbody>
            </table>
          </section>

          <section className="mt-6 break-inside-avoid">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Recettes</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                <Row label={`Ventes en ligne (${bilan.revenueBySource.orders.count} commandes payées ou livrées)`} value={money(bilan.revenueBySource.orders.amount)} />
                <Row label={`Prestations terminées (${bilan.revenueBySource.appointments.count})`} value={money(bilan.revenueBySource.appointments.amount)} />
                <Row label={`Recettes saisies (${bilan.revenueBySource.manual.count})`} value={money(bilan.revenueBySource.manual.amount)} />
                <Row label="Total des recettes" value={money(bilan.totals.revenue)} bold />
              </tbody>
            </table>
          </section>

          <section className="mt-6 break-inside-avoid">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Dépenses par catégorie</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {bilan.expensesByCategory.length === 0 && <Row label="Aucune dépense saisie" value="—" />}
                {bilan.expensesByCategory.map((c) => (
                  <Row key={c.category} label={`${c.label} (${c.share} %)`} value={money(c.amount)} />
                ))}
                <Row label="Total des dépenses" value={money(bilan.totals.expenses)} bold />
              </tbody>
            </table>
          </section>

          {bilan.months.length > 1 && (
            <section className="mt-6 break-inside-avoid">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Mois par mois</h2>
              <table className="mt-2 w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="border-b border-gray-300 py-1.5 font-medium">Mois</th>
                    <th className="border-b border-gray-300 py-1.5 text-right font-medium">Recettes</th>
                    <th className="border-b border-gray-300 py-1.5 text-right font-medium">Dépenses</th>
                    <th className="border-b border-gray-300 py-1.5 text-right font-medium">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {bilan.months.map((m) => (
                    <tr key={m.month}>
                      <td className="border-b border-gray-200 py-1.5">{monthLabel(m.month)}</td>
                      <td className="border-b border-gray-200 py-1.5 text-right">{money(m.revenue)}</td>
                      <td className="border-b border-gray-200 py-1.5 text-right">{money(m.expenses)}</td>
                      <td className="border-b border-gray-200 py-1.5 text-right font-medium">{m.result < 0 ? '− ' : ''}{money(Math.abs(m.result))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {top.data && top.data.length > 0 && (
            <section className="mt-6 break-inside-avoid">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Ce qui rapporte le plus</h2>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {top.data.map((item) => (
                    <Row key={`${item.kind}-${item.name}`} label={`${item.name} (${item.kind === 'service' ? 'prestation' : 'produit'}, ${item.quantity})`} value={money(item.amount)} />
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <footer className="mt-8 border-t border-gray-300 pt-3 text-xs text-gray-500">
            <p>
              Document de gestion établi le {generated}. Recettes = commandes payées ou livrées + rendez-vous terminés + recettes saisies ;
              dépenses saisies dans le journal. Ce document n’est pas une comptabilité légale.
            </p>
            {!plan.removableBranding && <p className="mt-1">Généré avec Bitiko.</p>}
          </footer>
        </article>
      )}
    </div>
  )
}
