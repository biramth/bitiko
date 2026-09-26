import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Scissors, Trash2 } from 'lucide-react'
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

  const [formOpen, setFormOpen] = useState(false)
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

  return (
    <div>
      <PageHeader
        title="Prestations"
        subtitle="Vos services : tarif, durée et disponibilité en vitrine et sur rendez-vous."
        actions={
          <button
            type="button"
            onClick={openCreate}
            disabled={!canCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus size={15} aria-hidden /> Nouvelle prestation
          </button>
        }
      />

      <PlanLimitBanner
        used={activeCount}
        max={plan.maxActiveServices}
        singular="prestation active"
        plural="prestations actives"
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {services.length === 0 ? (
          <EmptyState icon={Scissors} title="Aucune prestation" description="Créez votre première prestation (coupe, soin, consultation…)." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {services.map((service) => (
              <li key={service.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{service.name}</p>
                  <p className="text-xs text-gray-500">
                    {service.duration_minutes} min · {formatCurrency(service.price, currency)}
                    {service.category ? ` · ${service.category.name}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate({ id: service.id, active: !service.active })}
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    service.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {service.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(service)}
                  aria-label={`Modifier ${service.name}`}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Pencil size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(service)}
                  aria-label={`Supprimer ${service.name}`}
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
        title={editing ? 'Modifier la prestation' : 'Nouvelle prestation'}
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
          <div>
            <label htmlFor="service-name" className="block text-sm font-medium text-gray-700">Nom</label>
            <input
              id="service-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Coupe femme, consultation…"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="service-price" className="block text-sm font-medium text-gray-700">Tarif (F CFA)</label>
              <input
                id="service-price"
                type="number"
                min={0}
                value={form.priceFcfa}
                onChange={(e) => setForm({ ...form, priceFcfa: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="service-duration" className="block text-sm font-medium text-gray-700">Durée (min)</label>
              <input
                id="service-duration"
                type="number"
                min={5}
                max={480}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="service-category" className="block text-sm font-medium text-gray-700">Catégorie</label>
            <select
              id="service-category"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            >
              <option value="">Sans catégorie</option>
              {form.categoryId && !categories.some((c) => c.id === form.categoryId) && (
                <option value={form.categoryId}>{editing?.category?.name ?? 'Catégorie actuelle'}</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="mt-2 flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nouvelle catégorie (ex. Coupes)"
                aria-label="Nom de la nouvelle catégorie"
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => categoryMutation.mutate(newCategory.trim())}
                disabled={!newCategory.trim() || categoryMutation.isPending}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Ajouter
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="service-description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="service-description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
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
        title="Supprimer cette prestation ?"
        description={deleteTarget ? `« ${deleteTarget.name} » sera définitivement supprimée.` : undefined}
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
