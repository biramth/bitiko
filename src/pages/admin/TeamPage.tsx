import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Trash2, Users } from 'lucide-react'
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
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'

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
  usePageSeo({ title: 'Mon équipe — Bitiko', noindex: true })
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
        title="Mon équipe"
        subtitle="Les personnes que vos clients voient sur votre site et peuvent choisir pour leur rendez-vous."
        actions={
          <Button icon={<Plus size={15} aria-hidden />} onClick={openCreate} disabled={!canCreate}>
            Ajouter une personne
          </Button>
        }
      />

      <PlanLimitBanner
        used={activeCount}
        max={plan.maxTeamMembers}
        singular="personne visible sur votre site"
        plural="personnes visibles sur votre site"
      />

      <div className="mt-5">
        {members.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={Users}
              title="Présentez votre équipe"
              description="Coiffeurs, serveurs, artisans… Vos clients aiment savoir avec qui ils viennent, et peuvent réserver avec la personne de leur choix."
              action={
                <Button icon={<Plus size={15} aria-hidden />} onClick={openCreate}>
                  Ajouter une personne
                </Button>
              }
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {[...members].sort((a, b) => Number(b.active) - Number(a.active)).map((member) => (
              <li key={member.id}>
                <Card className={`flex flex-col gap-3 sm:flex-row sm:items-center ${member.active ? '' : 'bg-gray-50'}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`truncate font-semibold ${member.active ? 'text-gray-900' : 'text-gray-500'}`}>{member.name}</p>
                        {!member.active && <Badge>Masqué</Badge>}
                        {member.show_contact && (member.phone || member.email) && (
                          <Badge tone="info"><Eye size={11} aria-hidden /> Contact visible</Badge>
                        )}
                      </div>
                      <p className="truncate text-sm text-gray-500">
                        {[member.role, member.specialty].filter(Boolean).join(' · ') || 'Aucun poste renseigné'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      checked={member.active}
                      label="Visible et réservable"
                      disabled={toggleMutation.isPending}
                      onChange={(active) => toggleMutation.mutate({ id: member.id, active })}
                    />
                    <Button size="sm" variant="secondary" icon={<Pencil size={13} aria-hidden />} onClick={() => openEdit(member)}>
                      Modifier
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(member)}
                      aria-label={`Retirer ${member.name}`}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Ici, ce sont les personnes <strong className="font-medium text-gray-700">présentées à vos clients</strong>. Pour donner à quelqu’un l’accès à votre espace de gestion (commandes, agenda…), rendez-vous dans{' '}
        <Link to="/admin/parametres/equipe" className="font-medium text-brand-700 hover:text-brand-800">Paramètres → Accès collaborateurs</Link>.
      </p>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier cette personne' : 'Ajouter une personne'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextField label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Poste"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Coiffeuse, serveur…"
            />
            <TextField
              label="Spécialité"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="Coloration, barbe…"
            />
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-700">Coordonnées</p>
            <p className="mt-0.5 text-xs text-gray-500">Facultatif. Elles ne sont montrées à vos clients que si vous cochez l’option ci-dessous.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <TextField label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="mt-3">
              <Switch
                checked={form.showContact}
                label="Afficher ces coordonnées sur mon site"
                onChange={(showContact) => setForm({ ...form, showContact })}
              />
            </div>
          </div>
          <Switch
            checked={form.active}
            label="Visible sur mon site et réservable"
            onChange={(active) => setForm({ ...form, active })}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Retirer cette personne ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.name} » ne sera plus visible ni réservable. Les rendez-vous déjà pris sont conservés. Pour la retirer temporairement, masquez-la plutôt.`
            : undefined
        }
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
