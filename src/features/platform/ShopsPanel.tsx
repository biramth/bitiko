import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, ExternalLink, Gift, LifeBuoy, MessageCircle, RotateCcw, Search, Store, Trash2 } from 'lucide-react'
import { deletePlatformUser, getPlatformShops, requestSupportAccess, setShopSuspended, type PlatformShop } from '@/services/platform.service'
import { usePlatformRole } from '@/features/platform/usePlatformRole'
import { can } from '@/features/platform/permissions'
import { GrantSubscriptionDialog } from '@/features/platform/GrantSubscriptionDialog'
import {
  DEFAULT_SHOP_FILTERS,
  daysLeft,
  filterShops,
  isActiveShop,
  renewalWhatsAppUrl,
  sortShops,
  type ActivityFilter,
  type PlanFilter,
  type ShopFilters,
  type ShopSort,
} from '@/features/platform/shopsInsights'
import { supabase } from '@/lib/supabaseClient'
import { saveSupportReturnSession, beginImpersonation } from '@/lib/supportSession'
import { PLAN_BADGE, PLAN_LABELS } from '@/config/plans'
import { formatCurrency, timeAgo } from '@/utils/format'
import { shopUrl } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pagination } from '@/components/ui/Pagination'
import { controlClass } from '@/components/ui/styles'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

const PAGE_SIZE = 25

const PLAN_OPTIONS: { value: PlanFilter; label: string }[] = [
  { value: 'all', label: 'Tous les plans' },
  { value: 'free', label: 'Gratuit' },
  { value: 'essential', label: 'Essentiel' },
  { value: 'pro', label: 'Pro' },
  { value: 'expiring', label: 'Expire sous 7 jours' },
  { value: 'expired', label: 'Échu depuis < 30 jours' },
  { value: 'suspended', label: 'Suspendues' },
]
const ACTIVITY_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: 'all', label: 'Toute activité' },
  { value: 'active', label: 'Commande < 30 jours' },
  { value: 'inactive', label: 'Inactive (> 30 jours)' },
  { value: 'never', label: 'Jamais de commande' },
]
const SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: 'recent', label: 'Inscription récente' },
  { value: 'last_order', label: 'Dernière commande' },
  { value: 'revenue', label: 'Chiffre d’affaires' },
  { value: 'orders', label: 'Commandes' },
  { value: 'name', label: 'Nom' },
]

function PlanCell({ shop }: { shop: PlatformShop }) {
  const left = daysLeft(shop)
  return (
    <div>
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_BADGE[shop.plan] ?? PLAN_BADGE.free}`}>
        {PLAN_LABELS[shop.plan] ?? shop.plan}
      </span>
      {shop.plan === 'free' && left !== null && left < 0 && (
        <p className="mt-0.5 text-xs text-amber-600">{PLAN_LABELS[shop.subscribed_plan] ?? shop.subscribed_plan} échu depuis {Math.abs(left)} j</p>
      )}
      {shop.plan !== 'free' && left !== null && (
        <p className={`mt-0.5 text-xs ${left <= 7 ? 'font-medium text-amber-600' : 'text-gray-400'}`}>
          {left <= 0 ? 'expire aujourd’hui' : `encore ${left} j`}
        </p>
      )}
      {shop.plan_status === 'past_due' && <p className="mt-0.5 text-xs text-amber-600">paiement en retard</p>}
    </div>
  )
}

/** Toutes les boutiques : recherche, filtres (plan, pays, activité), tri, pagination et actions d'équipe. */
export function ShopsPanel() {
  const queryClient = useQueryClient()
  const { data: role } = usePlatformRole()
  const [supportingId, setSupportingId] = useState<string | null>(null)
  const [deletingShop, setDeletingShop] = useState<PlatformShop | null>(null)
  const [grantShop, setGrantShop] = useState<PlatformShop | null>(null)
  const [suspendShop, setSuspendShop] = useState<PlatformShop | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const toast = useToast()
  const [filters, setFilters] = useState<ShopFilters>(DEFAULT_SHOP_FILTERS)
  const [sort, setSort] = useState<ShopSort>('recent')
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['platform-shops'], queryFn: getPlatformShops, retry: false })

  const canSupport = can(role, 'support_access')
  const canDelete = can(role, 'delete_users')
  const canGrant = can(role, 'manage_payments')
  const canSuspend = can(role, 'suspend_shops')

  const countries = useMemo(() => [...new Set((data ?? []).map((s) => s.country_code).filter(Boolean))].sort(), [data])
  const filtered = useMemo(() => sortShops(filterShops(data ?? [], filters), sort), [data, filters, sort])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE)

  const update = (patch: Partial<ShopFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  const enterSupport = async (shop: PlatformShop) => {
    setSupportingId(shop.id)
    try {
      const { tokenHash, type, shopName, shopSlug } = await requestSupportAccess(shop.id)
      const { data: current } = await supabase.auth.getSession()
      saveSupportReturnSession(current.session)
      beginImpersonation({ shopId: shop.id, shopName, shopSlug, startedAt: new Date().toISOString() })
      // Même navigateur : rebond par /auth/callback, qui vérifie le jeton et remplace la session de l'opérateur par celle du commerçant.
      window.location.assign(`/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`)
    } catch (err) {
      console.error('support-access failed', err)
      setSupportingId(null)
    }
  }

  const deleteUser = useMutation({
    mutationFn: (shop: PlatformShop) => deletePlatformUser(shop.owner_id),
    onSuccess: () => {
      setDeletingShop(null)
      return queryClient.invalidateQueries({ queryKey: ['platform-shops'] })
    },
  })

  const suspension = useMutation({
    mutationFn: ({ shop, suspended, reason }: { shop: PlatformShop; suspended: boolean; reason?: string }) => setShopSuspended(shop.id, suspended, reason),
    onSuccess: (_result, variables) => {
      toast.success(variables.suspended ? `« ${variables.shop.name} » est suspendue.` : `« ${variables.shop.name} » est réactivée.`)
      setSuspendShop(null)
      setSuspendReason('')
      return queryClient.invalidateQueries({ queryKey: ['platform-shops'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Action impossible.'),
  })

  if (isLoading) return <Spinner />
  if (isError) return <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Erreur.'}</p>
  if (!data || data.length === 0) return <EmptyState icon={Store} title="Aucune boutique" />

  const hasActions = canSupport || canDelete || canGrant || canSuspend

  return (
    <div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Nom, lien, email ou WhatsApp…"
            aria-label="Rechercher une boutique"
            className={`${controlClass()} pl-9`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap">
          <select aria-label="Filtrer par plan" value={filters.plan} onChange={(e) => update({ plan: e.target.value as PlanFilter })} className={controlClass()}>
            {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select aria-label="Filtrer par activité" value={filters.activity} onChange={(e) => update({ activity: e.target.value as ActivityFilter })} className={controlClass()}>
            {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {countries.length > 1 && (
            <select aria-label="Filtrer par pays" value={filters.country} onChange={(e) => update({ country: e.target.value })} className={controlClass()}>
              <option value="all">Tous les pays</option>
              {countries.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          )}
          <select aria-label="Trier" value={sort} onChange={(e) => { setSort(e.target.value as ShopSort); setPage(1) }} className={controlClass()}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Tri : {o.label}</option>)}
          </select>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {filtered.length === data.length ? `${data.length} boutiques` : `${filtered.length} boutique${filtered.length > 1 ? 's' : ''} sur ${data.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Search} title="Aucune boutique ne correspond" description="Modifiez la recherche ou les filtres." />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Offre</th>
                <th className="px-4 py-3 font-medium">Activité</th>
                <th className="px-4 py-3 font-medium">CA</th>
                <th className="px-4 py-3 font-medium">Inscrite le</th>
                {hasActions && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((shop) => (
                <tr key={shop.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900">{shop.name}</span>
                      {shop.suspended_at && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Suspendue</span>}
                      <a href={shopUrl(shop.slug)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700" aria-label={`Ouvrir ${shop.name}`}>
                        <ExternalLink size={13} aria-hidden />
                      </a>
                    </div>
                    <p className="text-xs text-gray-400">
                      {shop.slug} · {shop.country_code}
                      {shop.business_type ? ` · ${shop.business_type}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{shop.owner_email ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3"><PlanCell shop={shop} /></td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{shop.products} produit{shop.products > 1 ? 's' : ''} · {shop.orders} commande{shop.orders > 1 ? 's' : ''}</p>
                    <p className={`text-xs ${isActiveShop(shop) ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {shop.last_order_at ? `dernière ${timeAgo(shop.last_order_at)}` : 'aucune commande'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(Number(shop.revenue), shop.currency)}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(shop.created_at).toLocaleDateString('fr-FR')}</td>
                  {hasActions && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {shop.whatsapp_number && (
                          <a
                            href={renewalWhatsAppUrl(shop) ?? `https://wa.me/${shop.whatsapp_number.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Écrire au commerçant sur WhatsApp"
                            aria-label={`WhatsApp ${shop.name}`}
                            className="flex items-center rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100"
                          >
                            <MessageCircle size={14} aria-hidden />
                          </a>
                        )}
                        {canGrant && (
                          <button
                            type="button"
                            onClick={() => setGrantShop(shop)}
                            title="Offrir ou prolonger un abonnement"
                            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Gift size={13} aria-hidden /> Offrir
                          </button>
                        )}
                        {canSuspend && (
                          <button
                            type="button"
                            onClick={() => (shop.suspended_at ? suspension.mutate({ shop, suspended: false }) : setSuspendShop(shop))}
                            disabled={suspension.isPending}
                            title={shop.suspended_at ? 'Lever la suspension' : 'Suspendre la boutique (plus aucune commande possible)'}
                            aria-label={`${shop.suspended_at ? 'Réactiver' : 'Suspendre'} ${shop.name}`}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {shop.suspended_at ? <RotateCcw size={13} aria-hidden /> : <Ban size={13} aria-hidden />}
                            {shop.suspended_at ? 'Réactiver' : 'Suspendre'}
                          </button>
                        )}
                        {canSupport && (
                          <button
                            type="button"
                            onClick={() => enterSupport(shop)}
                            disabled={supportingId === shop.id || deleteUser.isPending}
                            title="Ouvrir la boutique comme si tu étais le commerçant"
                            className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100 disabled:opacity-60"
                          >
                            <LifeBuoy size={13} aria-hidden />
                            {supportingId === shop.id ? 'Ouverture…' : 'Support'}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeletingShop(shop)}
                            disabled={deleteUser.isPending || supportingId === shop.id}
                            title="Supprimer définitivement le compte et la boutique"
                            aria-label={`Supprimer ${shop.name}`}
                            className="flex items-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onPageChange={setPage} />

      <GrantSubscriptionDialog shop={grantShop} onClose={() => setGrantShop(null)} />

      <Dialog
        open={suspendShop !== null}
        onClose={() => { if (!suspension.isPending) setSuspendShop(null) }}
        title="Suspendre cette boutique ?"
        description={suspendShop ? `La vitrine de « ${suspendShop.name} » s’affichera comme indisponible et plus aucune commande, rendez-vous ni réservation ne sera possible. Ses données restent intactes ; vous pouvez lever la suspension à tout moment.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspendShop(null)} disabled={suspension.isPending}>Annuler</Button>
            <Button
              variant="danger"
              loading={suspension.isPending}
              disabled={suspendReason.trim().length < 3}
              onClick={() => suspendShop && suspension.mutate({ shop: suspendShop, suspended: true, reason: suspendReason })}
            >
              Suspendre
            </Button>
          </>
        }
      >
        <TextAreaField
          label="Motif (conservé dans le journal, jamais montré au public)"
          rows={2}
          maxLength={300}
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          placeholder="Ex. Signalements de fraude, litige en cours…"
        />
      </Dialog>

      <ConfirmDialog
        open={deletingShop !== null}
        onClose={() => { if (!deleteUser.isPending) setDeletingShop(null) }}
        title="Supprimer ce compte ?"
        description={
          deletingShop
            ? `La boutique « ${deletingShop.name} », ses produits, images et l’ensemble des données du compte ${deletingShop.owner_email ?? 'propriétaire'} seront supprimés définitivement. Il est impossible de revenir en arrière.`
            : undefined
        }
        confirmLabel="Supprimer définitivement"
        pendingLabel="Suppression…"
        pending={deleteUser.isPending}
        onConfirm={() => deletingShop && deleteUser.mutate(deletingShop)}
      >
        {deletingShop && (
          <p className="text-sm text-gray-600">
            Tu t’apprêtes à supprimer le compte de <strong>{deletingShop.owner_email ?? 'cette personne'}</strong>.
          </p>
        )}
      </ConfirmDialog>

      {deleteUser.isError && (
        <p className="px-4 py-2 text-sm text-red-600">{deleteUser.error instanceof Error ? deleteUser.error.message : 'Erreur.'}</p>
      )}
    </div>
  )
}
