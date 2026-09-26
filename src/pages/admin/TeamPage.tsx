import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import {
  createTeamMember,
  deleteTeamMember,
  listShopTeamMembers,
  updateTeamMember,
  type TeamMemberRow,
} from '@/services/teamMember.service'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { canAddTeamMember } from '@/config/plans'
import { PlanLimitBanner } from '@/features/billing/PlanLimitBanner'
import { planLimitMessage } from '@/features/billing/planLimit'
import { useToast } from '@/components/ui/Toast'

interface TeamForm {
  name: string
  role: string
  specialty: string
  phone: string
  email: string
  showContact: boolean
  active: boolean
}

const EMPTY_FORM: TeamForm = { name: '', role: '', specialty: '', phone: '', email: '', showContact: false, active: true }

export function TeamPage() {
  usePageSeo({ title: 'Équipe — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const { plan } = useShopPlan(shop?.id)
  const queryClient = useQueryClient()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMemberRow | null>(null)
  const [form, setForm] = useState<TeamForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberRow | null>(null)

  const { data: members = [], isLoading, isError } = useQuery({
    queryKey: ['team-members', 'admin', shop?.id],
    queryFn: () => listShopTeamMembers(shop!.id),
    enabled: !!shop?.id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['team-members', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['team-members', 'admin', shop?.id] })
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        shop_id: shop!.id,
        name: form.name.trim(),
        role: form.role.trim(),
        specialty: form.specialty.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        show_contact: form.showContact,
        avatar_url: editing?.avatar_url ?? null,
        active: form.active,
      }
      return editing ? updateTeamMember(editing.id, payload) : createTeamMember(payload)
    },
    onSuccess: () => {
      invalidate()
      setFormOpen(false)
      setEditing(null)
      toast.success(editing ? 'Membre mis à jour.' : 'Membre ajouté.')
    },
    onError: (e) => toast.error(planLimitMessage(e) ?? 'Enregistrement impossible.'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateTeamMember(id, { active }),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(planLimitMessage(e) ?? 'Impossible de modifier ce membre.'),
  })

  const removeMutation = useMutation({
    mutationFn: deleteTeamMember,
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success('Membre retiré.')
    },
    onError: () => toast.error('Impossible de retirer ce membre.'),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    saveMutation.reset()
    setFormOpen(true)
  }

  const openEdit = (member: TeamMemberRow) => {
    setEditing(member)
    setForm({
      name: member.name,
      role: member.role,
      specialty: member.specialty ?? '',
      phone: member.phone ?? '',
      email: member.email ?? '',
      showContact: member.show_contact,
      active: member.active,
    })
    saveMutation.reset()
    setFormOpen(true)
  }

  const activeCount = members.filter((member) => member.active).length
  const canCreate = canAddTeamMember(plan, activeCount)

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />

  return (
    <div>
      <PageHeader
        title="Équipe"
        subtitle="Les visages de votre vitrine et les équipiers réservables en rendez-vous."
        actions={
          <button
            type="button"
            onClick={openCreate}
            disabled={!canCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus size={15} aria-hidden /> Ajouter un membre
          </button>
        }
      />

      <PlanLimitBanner
        used={activeCount}
        max={plan.maxTeamMembers}
        singular="équipier actif"
        plural="équipiers actifs"
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {members.length === 0 ? (
          <EmptyState icon={Users} title="Aucun membre" description="Présentez votre équipe : coiffeurs, serveurs, artisans…" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{member.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {[member.role, member.specialty].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate({ id: member.id, active: !member.active })}
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    member.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {member.active ? 'Visible' : 'Masqué'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(member)}
                  aria-label={`Modifier ${member.name}`}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Pencil size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(member)}
                  aria-label={`Retirer ${member.name}`}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier le membre' : 'Nouveau membre'}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.name.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700">Nom</label>
              <input
                id="team-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="team-role" className="block text-sm font-medium text-gray-700">Rôle</label>
              <input
                id="team-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Coiffeuse senior…"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="team-specialty" className="block text-sm font-medium text-gray-700">Spécialité</label>
            <input
              id="team-specialty"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="Coloration, barbe…"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="team-phone" className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                id="team-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="team-email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="team-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.showContact}
              onChange={(e) => setForm({ ...form, showContact: e.target.checked })}
              className="accent-brand-600"
            />
            Afficher téléphone et email sur la vitrine
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="accent-brand-600"
            />
            Visible en vitrine
          </label>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Retirer ce membre ?"
        description={deleteTarget ? `« ${deleteTarget.name} » ne sera plus visible ni réservable.` : undefined}
        confirmLabel="Retirer"
        pendingLabel="Suppression…"
        pending={removeMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) removeMutation.mutate(deleteTarget.id)
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
