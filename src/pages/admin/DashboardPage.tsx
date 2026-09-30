import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, Copy, ExternalLink, PackagePlus, Rocket, Scissors, ShoppingBag, Tags, Circle, CheckCircle2 } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { useWorkspaceModules } from '@/features/workspace/useWorkspaceModules'
import { ServiceDashboard } from '@/features/dashboard/ServiceDashboard'
import { CommerceDashboard } from '@/features/dashboard/CommerceDashboard'
import { PromoOfferCard } from '@/features/billing/PromoOfferCard'
import { getDashboardStats } from '@/services/dashboard.service'
import { listShopServices } from '@/services/service.service'
import { listShopTeamMembers } from '@/services/teamMember.service'
import { listDeliverySecteurs } from '@/services/deliverySecteur.service'
import { getBookingSettings } from '@/services/bookingSettings.service'
import { shopUrl } from '@/lib/tenant'
import { PageLoader } from '@/components/ui/PageLoader'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { CollapsibleZone } from '@/components/ui/CollapsibleZone'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { buttonClass } from '@/components/ui/styles'

interface ChecklistItem {
  done: boolean
  label: ReactNode
  hint?: string
  to?: string
  /** Confort plutôt que nécessaire : rangé dans « Pour un site plus complet ». */
  optional?: boolean
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-white/70">
      {item.done ? (
        <CheckCircle2 size={18} className="mt-px shrink-0 text-emerald-500" aria-hidden />
      ) : (
        <Circle size={18} className="mt-px shrink-0 text-brand-300" aria-hidden />
      )}
      <span className={`min-w-0 text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
        {item.to && !item.done ? (
          <Link to={item.to} className="inline-flex items-center gap-1 font-semibold text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline">
            {item.label} <ArrowRight size={13} aria-hidden className="shrink-0" />
          </Link>
        ) : (
          <span className={item.done ? undefined : 'font-medium'}>{item.label}</span>
        )}
        {!item.done && item.hint ? <span className="text-gray-500"> — {item.hint}</span> : null}
        {item.done && item.to ? (
          <Check size={13} aria-label="Terminé" className="ml-1 inline text-emerald-500" />
        ) : null}
      </span>
    </li>
  )
}

function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const remaining = items.filter((i) => !i.done).length
  if (remaining === 0) return null
  const done = items.length - remaining
  const pct = Math.round((done / items.length) * 100)
  const main = items.filter((i) => !i.optional)
  const extra = items.filter((i) => i.optional)
  const extraRemaining = extra.filter((i) => !i.done).length

  return (
    <section aria-label="Pour bien démarrer" className="mt-5 overflow-hidden rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-50 via-white to-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <Rocket size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-[15px] font-semibold text-gray-900">Pour bien démarrer</h2>
            <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800 tabular-nums">
              {done}/{items.length} · {pct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression de la configuration">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <ul className="mt-3 grid gap-0.5 sm:grid-cols-2 sm:gap-x-6">
            {main.map((item, i) => (
              <ChecklistRow key={i} item={item} />
            ))}
          </ul>
          {extra.length > 0 && (
            <details className="mt-2 rounded-xl bg-gray-50/70 px-3 py-2 text-sm">
              <summary className="cursor-pointer rounded-lg py-1 font-medium text-gray-600 hover:text-gray-900">
                Pour un site plus complet{extraRemaining > 0 ? ` (${extraRemaining} à faire)` : ' — terminé'}
              </summary>
              <ul className="mt-1 grid gap-0.5 pb-1 sm:grid-cols-2 sm:gap-x-6">
                {extra.map((item, i) => (
                  <ChecklistRow key={i} item={item} />
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </section>
  )
}

export function DashboardPage() {
  usePageSeo({ title: 'Tableau de bord — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const { plan, isLoading: planLoading } = useShopPlan(shop?.id)
  const { capabilities, capabilitiesLoading } = useWorkspaceModules()
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['dashboard-stats', shop?.id],
    queryFn: () => getDashboardStats(shop!.id, shop?.low_stock_threshold),
    enabled: !!shop?.id,
  })

  const { data: secteurs = [] } = useQuery({
    queryKey: ['delivery-secteurs', shop?.id],
    queryFn: () => listDeliverySecteurs(shop!.id),
    enabled: !!shop?.id,
  })
  // Delivery is configured once the merchant owns at least one active secteur
  // (fees are per zone, so shop.delivery_fee is not what completes this step).
  const hasDeliveryZones = secteurs.some((s) => s.is_active)

  // Le dashboard suit le business type : capabilities inconnues (boutique
  // legacy) = comportement historique 100 % commerce ; sinon chaque bloc
  // n'apparaît que si le type porte la capability correspondante.
  const hasCommerce = capabilities === null || capabilities.has('HAS_ORDERS') || capabilities.has('HAS_PRODUCTS')
  const hasProducts = capabilities === null || capabilities.has('HAS_PRODUCTS')
  const showServices = capabilities !== null && capabilities.has('HAS_SERVICES')
  const showAppointments = capabilities !== null && capabilities.has('HAS_APPOINTMENTS')
  const showReservations = capabilities !== null && capabilities.has('HAS_RESERVATIONS')
  const showTeam = capabilities !== null && capabilities.has('HAS_TEAM')
  // Le bloc « Activité services » exige une vraie brique service : la seule
  // vitrine équipe (ex. une boutique mode) ne doit pas le faire apparaître.
  const hasServiceActivity = showServices || showAppointments || showReservations
  const hasDelivery = capabilities === null || capabilities.has('HAS_DELIVERY')

  const { data: bookingSettings } = useQuery({
    queryKey: ['booking-settings', 'admin', shop?.id],
    queryFn: () => getBookingSettings(shop!.id),
    enabled: !!shop?.id && (showAppointments || showReservations),
  })

  const { data: serviceList = [] } = useQuery({
    queryKey: ['services', 'admin', shop?.id],
    queryFn: () => listShopServices(shop!.id),
    enabled: !!shop?.id && showServices,
  })
  const { data: teamList = [] } = useQuery({
    queryKey: ['team-members', 'admin', shop?.id],
    queryFn: () => listShopTeamMembers(shop!.id),
    enabled: !!shop?.id && showTeam,
  })

  const copyShopLink = async () => {
    if (!shop) return
    try {
      await navigator.clipboard.writeText(shopUrl(shop.slug))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Lien de la boutique copié.')
    } catch {
      window.location.href = shopUrl(shop.slug)
    }
  }

  if (isLoading || planLoading || capabilitiesLoading) return <PageLoader />
  if (isError) return <ErrorMessage />
  if (!stats) return null

  const currency = shop?.currency ?? 'XOF'

  const checklist = shop ? (
        <SetupChecklist
          items={[
            ...(showServices
              ? [{ done: serviceList.length > 0, label: 'Ajoutez vos prestations (nom, prix, durée)', to: '/admin/prestations?new=1' }]
              : []),
            ...(showTeam
              ? [{ done: teamList.length > 0, label: 'Présentez votre équipe', to: '/admin/equipe' }]
              : []),
            ...(showAppointments || showReservations
              ? [
                  {
                    done: !!bookingSettings,
                    label: 'Réglez vos jours et heures de réservation',
                    hint: 'sinon des horaires par défaut (9 h – 19 h) s’appliquent',
                    to: showAppointments ? '/admin/rendez-vous' : '/admin/reservations',
                  },
                ]
              : []),
            ...(hasProducts
              ? [{ done: stats.totalProducts > 0, label: 'Ajoutez vos premiers produits', to: '/admin/produits/nouveau' }]
              : []),
            { done: !!shop.whatsapp_number, label: 'Vérifiez votre numéro WhatsApp', to: '/admin/parametres/boutique' },
            ...(hasCommerce && hasDelivery
              ? [{ done: hasDeliveryZones, label: 'Configurez vos zones de livraison', to: '/admin/parametres/boutique' }]
              : []),
            { done: !!shop.logo_url, label: 'Ajoutez votre logo', hint: 'icône du site et aperçus partagés', to: '/admin/parametres/boutique', optional: true },
            { done: !!shop.description, label: 'Décrivez votre activité', hint: 'aide à être trouvé sur Google', to: '/admin/parametres/boutique', optional: true },
            { done: !!shop.banner_url, label: 'Ajoutez une bannière', hint: 'aperçu quand vous partagez le lien sur WhatsApp', to: '/admin/parametres/boutique', optional: true },
            ...(hasCommerce
              ? [{ done: stats.totalOrders > 0, label: 'Recevez votre première commande', hint: 'partagez le lien de votre site' }]
              : []),
          ]}
        />
  ) : null
  // Une boutique qui a déjà reçu des commandes voit d'abord ce qui demande une action.
  const checklistLast = stats.totalOrders > 0

  return (
    <div className="mx-auto w-full max-w-6xl space-y-1">
      <PageHeader
        title={`Tableau de bord${shop ? ` — ${shop.name}` : ''}`}
        subtitle={
          hasServiceActivity && hasCommerce
            ? 'Votre agenda du jour d’abord, puis vos ventes en ligne.'
            : hasCommerce
              ? 'Vue d’ensemble de votre boutique : ventes, commandes et stock.'
              : 'Votre agenda du jour, vos prestations et votre équipe.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hasServiceActivity && (showAppointments || showReservations) && (
              <Link
                to={showAppointments ? '/admin/rendez-vous' : '/admin/reservations'}
                className={buttonClass({ className: 'min-h-10 gap-1.5' })}
              >
                <CalendarDays size={16} aria-hidden /> {showAppointments ? 'Agenda du jour' : 'Réservations du jour'}
              </Link>
            )}
            {showServices && (
              <Link
                to="/admin/prestations?new=1"
                className={buttonClass({ variant: showAppointments || showReservations ? 'secondary' : 'primary', className: 'min-h-10 gap-1.5' })}
              >
                <Scissors size={16} aria-hidden /> <span className="whitespace-nowrap">Nouvelle prestation</span>
              </Link>
            )}
            {hasProducts && (
              <Link
                to="/admin/produits/nouveau"
                className={buttonClass({ variant: hasServiceActivity ? 'secondary' : 'primary', className: 'min-h-10 gap-1.5' })}
              >
                <PackagePlus size={16} aria-hidden /> <span className="whitespace-nowrap">Nouveau produit</span>
              </Link>
            )}
            {hasProducts && !hasServiceActivity && (
              <Link to="/admin/produits?tab=categories" className={buttonClass({ variant: 'secondary', className: 'min-h-10 gap-1.5' })}>
                <Tags size={16} aria-hidden /> Catégories
              </Link>
            )}
            {shop && (
              <>
                <button onClick={copyShopLink} className={buttonClass({ variant: 'secondary', className: 'min-h-10 gap-1.5' })} aria-live="polite">
                  <Copy size={16} aria-hidden /> {copied ? 'Lien copié' : 'Copier le lien'}
                </button>
                <Link
                  to={shopUrl(shop.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass({ variant: 'secondary', className: 'min-h-10 gap-1.5' })}
                >
                  <ExternalLink size={16} aria-hidden /> Voir mon site
                </Link>
              </>
            )}
          </div>
        }
      />

      {shop && <PromoOfferCard shopId={shop.id} />}

      {!checklistLast && checklist}

      {hasServiceActivity && shop && (
        <CollapsibleZone
          title="Agenda et prestations"
          icon={CalendarDays}
          storageKey="bitiko-dashboard-zone-services"
        >
          <ServiceDashboard
            shopId={shop.id}
            currency={currency}
            showServices={showServices}
            showAppointments={showAppointments}
            showReservations={showReservations}
            showTeam={showTeam}
          />
        </CollapsibleZone>
      )}

      {hasCommerce && shop && (
        <CollapsibleZone
          title="Ventes en ligne"
          icon={ShoppingBag}
          to={hasServiceActivity ? '/admin/commandes' : undefined}
          storageKey="bitiko-dashboard-zone-ventes"
          defaultOpen={!hasServiceActivity || stats.totalOrders > 0}
        >
          <CommerceDashboard
            shopId={shop.id}
            stats={stats}
            currency={currency}
            advancedAnalytics={plan.analytics !== 'basic'}
            lowStockThreshold={shop.low_stock_threshold ?? 5}
          />
        </CollapsibleZone>
      )}


      {checklistLast && checklist}
    </div>
  )
}
