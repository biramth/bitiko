import { Link, useSearchParams } from 'react-router-dom'
import { BookOpenCheck, LineChart } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { BilanView } from '@/features/finance/BilanView'
import { JournalView } from '@/features/finance/JournalView'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/PageLoader'
import { usePageSeo } from '@/hooks/usePageSeo'

type Tab = 'bilan' | 'journal'

const TABS: { key: Tab; label: string; hint: string; icon: typeof LineChart }[] = [
  { key: 'bilan', label: 'Bilan', hint: 'Ce que je gagne', icon: LineChart },
  { key: 'journal', label: 'Journal', hint: 'Mes dépenses et recettes', icon: BookOpenCheck },
]

/** Outils de gestion : un bilan simple (recettes, dépenses, bénéfice) et le journal qui l'alimente. */
export function FinancePage() {
  usePageSeo({ title: 'Finances — Bitiko', noindex: true })
  const { data: shop, isLoading } = useMyShop()
  const { role, isLoading: roleLoading } = useShopRole()
  const { plan, isLoading: planLoading } = useShopPlan(shop?.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'journal' ? 'journal' : 'bilan'

  if (isLoading || roleLoading || planLoading) return <PageLoader />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>
  if (role === 'vendeur') {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="font-heading text-lg font-bold text-gray-900">Réservé au propriétaire et aux managers</p>
        <p className="text-sm text-gray-500">Les chiffres de l’activité ne sont pas visibles depuis un compte vendeur.</p>
        <Link to="/admin" className="mt-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Retour au tableau de bord
        </Link>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Finances"
        subtitle="Suivez ce que vous gagnez et ce que vous dépensez, et sortez votre bilan en un clic."
      />

      <div role="tablist" aria-label="Sections des finances" className="mt-5 grid grid-cols-2 gap-2 sm:inline-grid sm:grid-cols-[repeat(2,max-content)]">
        {TABS.map(({ key, label, hint, icon: Icon }) => {
          const active = key === tab
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSearchParams(key === 'bilan' ? {} : { tab: key }, { replace: true })}
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left transition-colors ${
                active ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <Icon size={18} aria-hidden className={active ? 'text-brand-700' : 'text-gray-400'} />
              <span>
                <span className={`block text-sm font-semibold ${active ? 'text-brand-800' : 'text-gray-800'}`}>{label}</span>
                <span className="block text-xs text-gray-500">{hint}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5">{tab === 'bilan' ? <BilanView shop={shop} plan={plan} /> : <JournalView shop={shop} plan={plan} />}</div>
    </div>
  )
}
