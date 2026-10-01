import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, ChevronRight, PiggyBank, Plus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/PageLoader'
import { useToast } from '@/components/ui/Toast'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { useUpgrade } from '@/features/billing/upgradeContext'
import { isPlanLimitError } from '@/features/billing/planLimit'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { frenchDate } from '@/features/finance/exportCsv'
import { TontineFormDialog } from '@/features/tontine/TontineFormDialog'
import { daysUntil, frequencyEvery } from '@/features/tontine/schedule'
import { createTontine, getTontineSummaries, listTontines, type TontineInput } from '@/services/tontine.service'
import { usePageSeo } from '@/hooks/usePageSeo'
import { formatCurrency, localDateIso } from '@/utils/format'

function countdown(endDate: string, today: string): string {
  const days = daysUntil(endDate, today)
  if (days < 0) return 'remise passée'
  if (days === 0) return 'remise aujourd’hui'
  if (days === 1) return 'remise demain'
  return `remise dans ${days} jours`
}

/** Tontine commerciale : les clients épargnent auprès de la boutique, le commerçant tient le registre ici. */
export function TontinesPage() {
  usePageSeo({ title: 'Tontines — Bitiko', noindex: true })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { openUpgrade } = useUpgrade()
  const { data: shop, isLoading } = useMyShop()
  const { plan, isLoading: planLoading } = useShopPlan(shop?.id)
  const [creating, setCreating] = useState(false)
  const shopId = shop?.id ?? ''

  const tontinesQuery = useQuery({ queryKey: ['tontine', 'list', shopId], queryFn: () => listTontines(shopId), enabled: !!shop })
  const summariesQuery = useQuery({ queryKey: ['tontine', 'summaries', shopId], queryFn: () => getTontineSummaries(shopId), enabled: !!shop })

  const createMutation = useMutation({
    mutationFn: (input: TontineInput) => createTontine(shopId, input),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['tontine'] })
      setCreating(false)
      toast.success('Tontine créée : inscrivez maintenant vos premiers membres.')
      navigate(`/admin/tontines/${id}`)
    },
    onError: (e) => (isPlanLimitError(e) ? openUpgrade('tontines') : toast.error('Création impossible. Vérifiez les champs.')),
  })

  if (isLoading || planLoading) return <PageLoader />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>

  const currency = shop.currency
  const today = localDateIso()
  const tontines = tontinesQuery.data ?? []
  const summaries = new Map((summariesQuery.data ?? []).map((s) => [s.tontine_id, s]))
  const active = tontines.filter((t) => t.status === 'active')
  const held = active.reduce((sum, t) => {
    const s = summaries.get(t.id)
    return sum + (s ? s.collected - s.paid_out : 0)
  }, 0)
  const limitReached = plan.maxActiveTontines !== null && active.length >= plan.maxActiveTontines
  const startCreate = () => (limitReached ? openUpgrade('tontines') : setCreating(true))

  return (
    <div>
      <PageHeader
        title="Tontines"
        subtitle="Vos clients épargnent chez vous pour Tabaski, la rentrée ou les fêtes : notez chaque versement, suivez les retards et faites la remise."
        actions={tontines.length > 0 && <Button data-guide="guide-nouvelle-tontine" icon={<Plus size={15} aria-hidden />} onClick={startCreate}>Nouvelle tontine</Button>}
      />

      <div className="mt-5 space-y-4">
        {tontinesQuery.isLoading ? (
          <PageLoader />
        ) : tontinesQuery.isError ? (
          <ErrorMessage />
        ) : tontines.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={PiggyBank}
              title="Lancez votre première tontine"
              description="Choisissez un montant et un rythme, inscrivez vos clients, puis encaissez leurs versements en un geste. Bitiko tient le carnet : l’argent reste entre vos mains."
              action={<Button data-guide="guide-nouvelle-tontine" icon={<Plus size={15} aria-hidden />} onClick={startCreate}>Créer une tontine</Button>}
            />
          </Card>
        ) : (
          <>
            {active.length > 0 && (
              <Card>
                <p className="text-xs text-gray-500">Épargne de vos clients en caisse</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(held, currency)}</p>
                <p className="mt-1 text-xs text-gray-500">Cet argent appartient à vos clients jusqu’à la remise : il n’est pas compté dans vos recettes.</p>
              </Card>
            )}
            <ul className="space-y-2">
              {tontines.map((t) => {
                const s = summaries.get(t.id)
                const closed = t.status === 'closed'
                return (
                  <li key={t.id}>
                    <Link to={`/admin/tontines/${t.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                      <Card className="flex items-center gap-4 !p-4 transition-colors hover:bg-gray-50">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-gray-900">{t.name}</p>
                            {closed && <Badge tone="neutral">Clôturée</Badge>}
                          </div>
                          {t.goal_label && <p className="mt-0.5 truncate text-sm text-gray-500">{t.goal_label}</p>}
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock size={13} aria-hidden /> {frenchDate(t.end_date)}
                              {!closed && ` · ${countdown(t.end_date, today)}`}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users size={13} aria-hidden /> {s?.members_count ?? 0} membre{(s?.members_count ?? 0) > 1 ? 's' : ''}
                              {s && s.settled_members > 0 && ` · ${s.settled_members} remis`}
                            </span>
                            <span>{formatCurrency(t.installment_amount, currency)} {frequencyEvery(t.frequency)}</span>
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-gray-500">{closed ? 'Total versé' : 'En caisse'}</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(s ? (closed ? s.collected : s.collected - s.paid_out) : 0, currency)}</p>
                        </div>
                        <ChevronRight size={18} className="shrink-0 text-gray-300" aria-hidden />
                      </Card>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <p className="text-xs text-gray-400">
          Bitiko ne reçoit ni ne garde l’argent des tontines : c’est un carnet de suivi. Les versements sont reçus et remis par vous.
        </p>
      </div>

      <TontineFormDialog
        open={creating}
        tontine={null}
        currency={currency}
        pending={createMutation.isPending}
        onClose={() => setCreating(false)}
        onSubmit={(input) => createMutation.mutate(input)}
      />
    </div>
  )
}
