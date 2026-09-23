import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, ShieldCheck, Trash2, UserPlus, UserX } from 'lucide-react'
import {
  addPlatformMember,
  deletePlatformUser,
  listPlatformMembers,
  removePlatformMember,
  updatePlatformMember,
  type PlatformMemberRow,
} from '@/services/platform.service'
import {
  CAPABILITY_LABELS,
  PLATFORM_ROLES,
  can,
  roleLabel,
  type PlatformRole,
} from '@/features/platform/permissions'
import { usePlatformRole } from '@/features/platform/usePlatformRole'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const ROLE_BADGE: Record<PlatformRole, string> = {
  owner: 'bg-amber-100 text-amber-800',
  admin: 'bg-brand-100 text-brand-800',
  dev: 'bg-blue-100 text-blue-800',
  marketing: 'bg-emerald-100 text-emerald-800',
}

export function TeamTool() {
  const queryClient = useQueryClient()
  const { data: myRole } = usePlatformRole()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['platform-team'],
    queryFn: listPlatformMembers,
    retry: false,
  })

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [newRole, setNewRole] = useState<PlatformRole>('marketing')
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState<PlatformMemberRow | null>(null)
  const [addNotice, setAddNotice] = useState<{ ok: boolean; message: string } | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['platform-team'] })

  const add = useMutation({
    mutationFn: () => addPlatformMember(email.trim(), newRole, fullName.trim()),
    onSuccess: (result) => {
      setEmail('')
      setFullName('')
      invalidate()
      setAddNotice({
        ok: true,
        message: result.accountCreated
          ? `Membre ajouté — un email avec un lien « choisir mon mot de passe » a été envoyé à ${email.trim()}.`
          : `Membre ajouté — un email de bienvenue (rôle « ${roleLabel(newRole)} ») a été envoyé à ${email.trim()}.`,
      })
    },
    onError: (err: Error) => setAddNotice({ ok: false, message: err.message }),
  })
  const update = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: PlatformRole }) => updatePlatformMember(userId, role),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: removePlatformMember, onSuccess: () => { setPendingRemove(null); invalidate() } })
  const deleteAccount = useMutation({
    mutationFn: ({ userId }: { userId: string }) => deletePlatformUser(userId),
    onSuccess: () => { setPendingDeleteAccount(null); invalidate() },
  })

  const iAmOwner = myRole === 'owner'
  const canInviteOwner = iAmOwner
  const assignableRoles = PLATFORM_ROLES.filter((r) => r.key !== 'owner' || canInviteOwner)
  const canDeleteAccounts = can(myRole, 'delete_users')

  if (isLoading) return <Spinner />
  if (isError) return <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Erreur.'}</p>

  const members = data?.members ?? []

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <UserPlus size={16} aria-hidden /> Ajouter un membre
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Si aucun compte Bitiko n’existe pour cet email, il est créé automatiquement — la personne reçoit un email pour
          choisir son mot de passe.
        </p>
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (email.trim() && fullName.trim()) add.mutate()
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nom complet"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as PlatformRole)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {assignableRoles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={add.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {add.isPending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
        {add.isError && <p className="mt-2 text-sm text-red-600">{(add.error as Error).message}</p>}
        {addNotice && (
          <p className={`mt-2 text-sm ${addNotice.ok ? 'text-green-700' : 'text-red-600'}`}>{addNotice.message}</p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Membre</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Depuis</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                iAmOwner={iAmOwner}
                canManage={can(myRole, 'manage_team')}
                canDeleteAccounts={canDeleteAccounts}
                onRoleChange={(role) => update.mutate({ userId: member.userId, role })}
                roleUpdating={update.isPending}
                pendingRemove={pendingRemove === member.userId}
                onRequestRemove={() => setPendingRemove(member.userId)}
                onCancelRemove={() => setPendingRemove(null)}
                onConfirmRemove={() => remove.mutate(member.userId)}
                removing={remove.isPending}
                onRequestDeleteAccount={() => setPendingDeleteAccount(member)}
                deletingAccount={deleteAccount.isPending}
              />
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {remove.isError && <p className="text-sm text-red-600">{(remove.error as Error).message}</p>}
      {update.isError && <p className="text-sm text-red-600">{(update.error as Error).message}</p>}
      {deleteAccount.isError && <p className="text-sm text-red-600">{(deleteAccount.error as Error).message}</p>}

      <ConfirmDialog
        open={pendingDeleteAccount !== null}
        onClose={() => { if (!deleteAccount.isPending) setPendingDeleteAccount(null) }}
        title="Supprimer ce compte ?"
        description={
          pendingDeleteAccount
            ? `Le compte de ${pendingDeleteAccount.email ?? 'ce membre'} sera supprimé définitivement : boutiques, produits, images, historique, tout. Il est impossible de revenir en arrière.`
            : undefined
        }
        confirmLabel="Supprimer définitivement"
        pendingLabel="Suppression…"
        pending={deleteAccount.isPending}
        onConfirm={() => pendingDeleteAccount && deleteAccount.mutate({ userId: pendingDeleteAccount.userId })}
      >
        {pendingDeleteAccount?.role === 'owner' && (
          <p className="text-sm text-gray-600">
            Ce membre est <strong>propriétaire</strong> — la suppression est réservée à un propriétaire et reste
            bloquée s’il est le dernier propriétaire de la plateforme.
          </p>
        )}
      </ConfirmDialog>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ShieldCheck size={16} aria-hidden /> Ce que chaque rôle peut faire
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLATFORM_ROLES.map((role) => (
            <div key={role.key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[role.key]}`}>
                  {role.label}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">{role.description}</p>
              <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
                {(['view_analytics', 'view_shops', 'manage_payments', 'send_campaigns', 'manage_team', 'support_access', 'delete_users'] as const)
                  .filter((cap) => can(role.key, cap))
                  .map((cap) => (
                    <li key={cap}>· {CAPABILITY_LABELS[cap]}</li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MemberRow({
  member,
  iAmOwner,
  canManage,
  canDeleteAccounts,
  onRoleChange,
  roleUpdating,
  pendingRemove,
  onRequestRemove,
  onCancelRemove,
  onConfirmRemove,
  removing,
  onRequestDeleteAccount,
  deletingAccount,
}: {
  member: PlatformMemberRow
  iAmOwner: boolean
  canManage: boolean
  canDeleteAccounts: boolean
  onRoleChange: (role: PlatformRole) => void
  roleUpdating: boolean
  pendingRemove: boolean
  onRequestRemove: () => void
  onCancelRemove: () => void
  onConfirmRemove: () => void
  removing: boolean
  onRequestDeleteAccount: () => void
  deletingAccount: boolean
}) {
  const isOwner = member.role === 'owner'
  const lockedByRole = !canManage || member.isSelf || (isOwner && !iAmOwner)

  // A member's account can only be deleted by someone allowed to delete
  // accounts (server: owner/admin), never yourself, and an owner row only by
  // an owner (server also blocks deleting the last owner).
  const canDeleteThis = canDeleteAccounts && !member.isSelf && (!isOwner || iAmOwner)

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-gray-300" aria-hidden />
          <span className="font-medium text-gray-900">{member.email ?? '—'}</span>
          {member.isSelf && <span className="text-xs text-gray-400">(toi)</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        {lockedByRole ? (
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[member.role]}`}>
            {roleLabel(member.role)}
          </span>
        ) : (
          <select
            value={member.role}
            disabled={roleUpdating}
            onChange={(e) => onRoleChange(e.target.value as PlatformRole)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {PLATFORM_ROLES.filter((r) => r.key !== 'owner' || iAmOwner).map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500">{new Date(member.createdAt).toLocaleDateString('fr-FR')}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {!member.isSelf && canManage && !(isOwner && !iAmOwner) && (
            <>
              {pendingRemove ? (
                <>
                  <button
                    type="button"
                    onClick={onConfirmRemove}
                    disabled={removing}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {removing ? 'Retrait…' : 'Confirmer'}
                  </button>
                  <button type="button" onClick={onCancelRemove} className="text-xs text-gray-500 hover:text-gray-700">
                    Annuler
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onRequestRemove}
                  disabled={deletingAccount}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 disabled:opacity-60"
                  aria-label={`Retirer ${member.email ?? ''}`}
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              )}
            </>
          )}
          {canDeleteThis && (
            <button
              type="button"
              onClick={onRequestDeleteAccount}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              aria-label={`Supprimer le compte ${member.email ?? ''}`}
            >
              <UserX size={14} aria-hidden />
              Supprimer le compte
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
