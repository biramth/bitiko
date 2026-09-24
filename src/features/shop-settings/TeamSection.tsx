import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, MailPlus, Trash2, Users } from 'lucide-react'
import { useShopPlan } from '@/features/billing/useShopPlan'
import {
  SHOP_MEMBER_ROLE_LABELS,
  inviteShopMember,
  listShopMembers,
  removeShopMember,
  setShopMemberRole,
  type ShopMemberRole,
} from '@/services/team.service'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import type { Shop } from '@/types'

const ROLES: ShopMemberRole[] = ['manager', 'vendeur']

/** Per-shop collaborators (Classe Pro): managers run catalogue/orders/
 *  customers like the owner, vendeurs read and advance order statuses.
 *  Shop settings, billing and this list stay owner-only. Invites are
 *  claimed by email on the invitee's next login — no account needed yet. */
export function TeamSection({ shop }: { shop: Shop }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { plan, isLoading: planLoading } = useShopPlan(shop.id)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShopMemberRole>('vendeur')

  const { data: members, isLoading, isError } = useQuery({
    queryKey: ['shop-members', shop.id],
    queryFn: () => listShopMembers(shop.id),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['shop-members', shop.id] })

  const inviteMutation = useMutation({
    mutationFn: () => inviteShopMember(shop.id, email, role),
    onSuccess: () => {
      setEmail('')
      refresh()
      toast.success('Invitation envoyée — elle sera active à la prochaine connexion de ce compte.')
    },
    onError: () => toast.error("L'invitation a échoué. Réessayez."),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ShopMemberRole }) => setShopMemberRole(id, next),
    onSuccess: () => refresh(),
    onError: () => toast.error('Le rôle n’a pas pu être modifié.'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeShopMember(id),
    onSuccess: () => {
      refresh()
      toast.info('Accès retiré.')
    },
    onError: () => toast.error("Le retrait a échoué. Réessayez."),
  })

  if (planLoading) return <Spinner />
  if (!plan.teamAccess) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-500">
          <Crown size={22} aria-hidden />
        </span>
        <h2 className="font-heading text-lg font-bold text-gray-900">L'équipe, c'est Pro</h2>
        <p className="max-w-sm text-sm text-gray-600">
          Invitez un manager ou un vendeur sur cette boutique : catalogue, commandes et clients partagés,
          paramètres et facturation réservés au propriétaire.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (email.trim()) inviteMutation.mutate()
        }}
        className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row"
      >
        <label className="flex-1">
          <span className="sr-only">Email du collaborateur</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="collegue@exemple.com"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
          />
        </label>
        <label>
          <span className="sr-only">Rôle</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ShopMemberRole)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {SHOP_MEMBER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={inviteMutation.isPending || !email.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <MailPlus size={15} aria-hidden /> Inviter
        </button>
      </form>

      {isLoading && <Spinner />}
      {isError && <ErrorMessage />}
      {!isLoading && !isError && (members?.length ?? 0) === 0 && (
        <EmptyState icon={Users} title="Aucun collaborateur" />
      )}
      {(members?.length ?? 0) > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {members!.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{m.email}</p>
                <p className="text-xs text-gray-400">
                  {m.accepted_at
                    ? `Actif depuis le ${new Date(m.accepted_at).toLocaleDateString('fr-FR')}`
                    : 'Invitation en attente'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={m.role as ShopMemberRole}
                  onChange={(e) => roleMutation.mutate({ id: m.id, next: e.target.value as ShopMemberRole })}
                  disabled={roleMutation.isPending}
                  aria-label={`Rôle de ${m.email}`}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-brand-400 focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {SHOP_MEMBER_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(m.id)}
                  disabled={removeMutation.isPending}
                  aria-label={`Retirer ${m.email}`}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-500">
        Manager : catalogue, commandes et clients comme vous. Vendeur : lecture + avancement des commandes.
        Paramètres, facturation et équipe restent au propriétaire.
      </p>
    </div>
  )
}
