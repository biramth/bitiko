import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, ExternalLink, Pencil, Plus, Scissors, Trash2 } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useCategories } from '@/features/categories/useCategories'
import { createCategory } from '@/services/category.service'
import { slugify } from '@/utils/format'
import {
  createService,
  deleteService,
  listShopServices,
  updateService,
  type ServiceWithCategory,
} from '@/services/service.service'
import { formatCurrency } from '@/utils/format'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { canAddService } from '@/config/plans'
import { PlanLimitBanner } from '@/features/billing/PlanLimitBanner'
import { planLimitMessage } from '@/features/billing/planLimit'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { shopUrl } from '@/lib/tenant'

interface ServiceForm {
  name: string
  priceFcfa: string
  duration: string
  description: string
  categoryId: string
  active: boolean
}

const EMPTY_FORM: ServiceForm = {
  name: '',
  priceFcfa: '',
  duration: '30',
  description: '',
  categoryId: '',
  active: true,
}

export function ServicesPage() {
  usePageSeo({ title: 'Prestations — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const { plan } = useShopPlan(shop?.id)
  const { data: categories = [] } = useCategories(shop?.id, 'service')
  const queryClient = useQueryClient()
  const toast = useToast()
  const currency = shop?.currency ?? 'XOF'

  const [searchParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(() => searchParams.get('new') === '1')
  const [editing, setEditing] = useState<ServiceWithCategory | null>(null)
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<ServiceWithCategory | null>(null)

  const { data: services = [], isLoading, isError } = useQuery({
    queryKey: ['services', 'admin', shop?.id],
    queryFn: () => listShopServices(shop!.id),
    enabled: !!shop?.id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['services', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['services', 'admin', shop?.id] })
  }

  const [newCategory, setNewCategory] = useState('')
  const categoryMutation = useMutation({
    mutationFn: (name: string) =>
      createCategory({ shopId: shop!.id, name, slug: `${slugify(name)}-s`, kind: 'service' }),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ['categories', shop?.id] })
      setForm((current) => ({ ...current, categoryId: category.id }))
      setNewCategory('')
    },
    onError: () => toast.error('Catégorie impossible (nom déjà utilisé ?).'),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        shop_id: shop!.id,
        category_id: form.categoryId || null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Math.max(0, Math.round(Number(form.priceFcfa)) || 0),
        duration_minutes: Math.max(5, Math.min(480, Number(form.duration) || 30)),
        active: form.active,
      }
      return editing ? updateService(editing.id, payload) : createService(payload)
    },
    onSuccess: () => {
      invalidate()
      setFormOpen(false)
      setEditing(null)
      toast.success(editing ? 'Prestation mise à jour.' : 'Prestation créée.')
    },
    onError: (e) => toast.error(planLimitMessage(e) ?? 'Enregistrement impossible. Vérifiez les champs.'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateService(id, { active }),
    onSuccess: (_d, v) => {
      invalidate()
      toast.success(v.active ? 'Prestation activée.' : 'Prestation désactivée.')
    },
    onError: (e) => toast.error(planLimitMessage(e) ?? 'Impossible de modifier la prestation.'),
  })

  const removeMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success('Prestation supprimée.')
    },
    onError: () => toast.error('Impossible de supprimer cette prestation.'),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    saveMutation.reset()
    setFormOpen(true)
  }

  const openEdit = (service: ServiceWithCategory) => {
    setEditing(service)
    setForm({
      name: service.name,
      priceFcfa: String(service.price),
      duration: String(service.duration_minutes),
      description: service.description ?? '',
      categoryId: service.category_id ?? '',
      active: service.active,
    })
    saveMutation.reset()
    setFormOpen(true)
  }

  const activeCount = services.filter((service) => service.active).length
  const canCreate = canAddService(plan, activeCount)

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />

  const DURATIONS = [15, 30, 45, 60, 90, 120]

  return (
    <div>
      <PageHeader
        title="Prestations"
        subtitle="Ce que vous proposez à vos clients : un nom, un prix, une durée. Ils choisissent une prestation pour réserver."
        actions={
          <>
            {shop && (
              <a
                href={`${shopUrl(shop.slug)}/prestations`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <ExternalLink size={14} aria-hidden /> Voir sur mon site
              </a>
            )}
            <Button icon={<Plus size={15} aria-hidden />} onClick={openCreate} disabled={!canCreate}>
              Nouvelle prestation
            </Button>
          </>
        }
      />

      <PlanLimitBanner
        used={activeCount}
        max={plan.maxActiveServices}
        singular="prestation visible sur votre site"
        plural="prestations visibles sur votre site"
      />

      <div className="mt-5">
        {services.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={Scissors}
              title="Commencez par votre première prestation"
              description="Exemple : « Coupe femme — 5 000 F — 45 min ». Vos clients pourront ensuite la réserver depuis votre site."
              action={
                <Button icon={<Plus size={15} aria-hidden />} onClick={openCreate}>
                  Ajouter une prestation
                </Button>
              }
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {[...services].sort((a, b) => Number(b.active) - Number(a.active)).map((service) => (
              <li key={service.id}>
                <Card className={`flex flex-col gap-3 sm:flex-row sm:items-center ${service.active ? '' : 'bg-gray-50'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-semibold ${service.active ? 'text-gray-900' : 'text-gray-500'}`}>{service.name}</p>
                      {service.category && <Badge tone="brand">{service.category.name}</Badge>}
                      {!service.active && <Badge>Masquée</Badge>}
                    </div>
                    {service.description && <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">{service.description}</p>}
                    <p className="mt-1 flex items-center gap-3 text-sm text-gray-600">
                      <strong className="text-gray-900">{formatCurrency(service.price, currency)}</strong>
                      <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden className="text-gray-400" /> {service.duration_minutes} min</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      checked={service.active}
                      label="Visible sur mon site"
                      disabled={toggleMutation.isPending}
                      onChange={(active) => toggleMutation.mutate({ id: service.id, active })}
                    />
                    <Button size="sm" variant="secondary" icon={<Pencil size={13} aria-hidden />} onClick={() => openEdit(service)}>
                      Modifier
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(service)}
                      aria-label={`Supprimer ${service.name}`}
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
        Astuce : masquez une prestation au lieu de la supprimer pour la remettre en ligne plus tard. Les horaires de réservation se règlent dans{' '}
        <Link to="/admin/rendez-vous" className="font-medium text-brand-700 hover:text-brand-800">Rendez-vous</Link>.
      </p>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier la prestation' : 'Nouvelle prestation'}
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
          <TextField
            label="Nom de la prestation"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Coupe femme, consultation…"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={`Prix (${currency === 'XOF' ? 'F CFA' : currency})`}
              type="number"
              min={0}
              value={form.priceFcfa}
              onChange={(e) => setForm({ ...form, priceFcfa: e.target.value })}
              hint="Affiché à vos clients."
            />
            <TextField
              label="Durée (minutes)"
              type="number"
              min={5}
              max={480}
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              hint="Bloque ce temps dans votre agenda."
            />
          </div>
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {DURATIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setForm({ ...form, duration: String(minutes) })}
                aria-pressed={form.duration === String(minutes)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  form.duration === String(minutes) ? 'bg-ink-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`}
              </button>
            ))}
          </div>
          <div>
            <SelectField
              label="Catégorie"
              hint="Pour regrouper vos prestations sur le site (facultatif)."
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Sans catégorie</option>
              {form.categoryId && !categories.some((c) => c.id === form.categoryId) && (
                <option value={form.categoryId}>{editing?.category?.name ?? 'Catégorie actuelle'}</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SelectField>
            <div className="mt-2 flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Créer une catégorie (ex. Coiffure)"
                aria-label="Nom de la nouvelle catégorie"
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0"
                onClick={() => categoryMutation.mutate(newCategory.trim())}
                disabled={!newCategory.trim()}
                loading={categoryMutation.isPending}
              >
                Créer
              </Button>
            </div>
          </div>
          <TextAreaField
            label="Description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            hint="Facultatif : une phrase pour expliquer ce que comprend la prestation."
          />
          <Switch
            checked={form.active}
            label="Visible sur mon site"
            onChange={(active) => setForm({ ...form, active })}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer cette prestation ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.name} » disparaîtra de votre site. Les rendez-vous déjà pris gardent son nom et son prix. Pour la retirer temporairement, masquez-la plutôt.`
            : undefined
        }
        confirmLabel="Supprimer"
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
