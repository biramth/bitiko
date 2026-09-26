import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, Copy, ExternalLink, PackagePlus, Scissors, ShoppingBag, Tags, Circle, CheckCircle2 } from 'lucide-react'
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
    <li className="flex items-start gap-2">
      {item.done ? (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden />
      ) : (
        <Circle size={16} className="mt-0.5 shrink-0 text-gray-300" aria-hidden />
      )}
      <span className={item.done ? 'text-gray-400 line-through' : 'text-gray-700'}>
        {item.to && !item.done ? (
          <Link to={item.to} className="font-medium text-brand-700 hover:text-brand-800">
            {item.label}
          </Link>
        ) : (
          item.label
        )}
        {!item.done && item.hint ? <span className="text-gray-500"> — {item.hint}</span> : null}
      </span>
    </li>
  )
}

function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const remaining = items.filter((i) => !i.done).length
  if (remaining === 0) return null
  const main = items.filter((i) => !i.optional)
  const extra = items.filter((i) => i.optional)
  const extraRemaining = extra.filter((i) => !i.done).length

  return (
    <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Pour bien démarrer</h2>
        <span className="text-xs font-medium text-brand-700">
          {items.length - remaining}/{items.length} terminé
        </span>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {main.map((item, i) => (
          <ChecklistRow key={i} item={item} />
        ))}
      </ul>
      {extra.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-900">
            Pour un site plus complet{extraRemaining > 0 ? ` (${extraRemaining} à faire)` : ''}
          </summary>
          <ul className="mt-2 space-y-2">
            {extra.map((item, i) => (
              <ChecklistRow key={i} item={item} />
            ))}
          </ul>
        </details>
      )}
    </div>
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
            { done: !!shop.whatsapp_number, label: 'Vérifiez votre numéro WhatsApp', to: '/admin/parametres/contact' },
            ...(hasCommerce && hasDelivery
              ? [{ done: hasDeliveryZones, label: 'Configurez vos zones de livraison', to: '/admin/parametres/shipping' }]
              : []),
            { done: !!shop.logo_url, label: 'Ajoutez votre logo', hint: 'icône du site et aperçus partagés', to: '/admin/parametres/appearance', optional: true },
            { done: !!shop.description, label: 'Décrivez votre activité', hint: 'aide à être trouvé sur Google', to: '/admin/parametres/general', optional: true },
            { done: !!shop.banner_url, label: 'Ajoutez une bannière', hint: 'aperçu quand vous partagez le lien sur WhatsApp', to: '/admin/parametres/appearance', optional: true },
            ...(hasCommerce
              ? [{ done: stats.totalOrders > 0, label: 'Recevez votre première commande', hint: 'partagez le lien de votre site' }]
              : []),
          ]}
        />
  ) : null
  // Une boutique qui a déjà reçu des commandes voit d'abord ce qui demande une action.
  const checklistLast = stats.totalOrders > 0

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle={
          hasServiceActivity && hasCommerce
            ? 'Votre agenda du jour d’abord, puis vos ventes en ligne.'
            : hasCommerce
              ? 'Vue d’ensemble de votre boutique : ventes, commandes et stock.'
              : 'Votre agenda du jour, vos prestations et votre équipe.'
        }
        actions={
          <>
            {hasServiceActivity && (showAppointments || showReservations) && (
              <Link
                to={showAppointments ? '/admin/rendez-vous' : '/admin/reservations'}
                className={buttonClass({ className: 'gap-1.5' })}
              >
                <CalendarDays size={16} aria-hidden /> {showAppointments ? 'Agenda du jour' : 'Réservations du jour'}
              </Link>
            )}
            {showServices && (
              <span className={showAppointments || showReservations ? 'hidden sm:inline-flex' : 'inline-flex'}><Link
                to="/admin/prestations?new=1"
                className={buttonClass({ variant: showAppointments || showReservations ? 'secondary' : 'primary', className: 'gap-1.5' })}
              >
                <Scissors size={16} aria-hidden /> Nouvelle prestation
              </Link></span>
            )}
            {hasProducts && (
              <span className={hasServiceActivity ? 'hidden sm:inline-flex' : 'inline-flex'}><Link
                to="/admin/produits/nouveau"
                className={buttonClass({ variant: hasServiceActivity ? 'secondary' : 'primary', className: 'gap-1.5' })}
              >
                <PackagePlus size={16} aria-hidden /> Nouveau produit
              </Link></span>
            )}
            {hasProducts && !hasServiceActivity && (
              <span className="inline-flex"><Link to="/admin/produits?tab=categories" className={buttonClass({ variant: 'secondary', className: 'gap-1.5' })}>
                <Tags size={16} aria-hidden /> Catégories
              </Link></span>
            )}
            {shop && (
              <>
                <button onClick={copyShopLink} className={buttonClass({ variant: 'secondary', className: 'gap-1.5' })}>
                  <Copy size={16} aria-hidden /> {copied ? 'Lien copié' : 'Copier le lien de mon site'}
                </button>
                <Link
                  to={shopUrl(shop.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass({ variant: 'secondary', className: 'gap-1.5' })}
                >
                  <ExternalLink size={16} aria-hidden /> Voir mon site
                </Link>
              </>
            )}
          </>
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
