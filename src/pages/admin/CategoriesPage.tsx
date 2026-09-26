import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Settings2, Tags, Trash2 } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { themeTileColors } from '@/features/categories/categoryTile'
import {
  deleteCategories,
  deleteCategory,
  listCategories,
  mergeCategories,
  moveProductsToCategory,
  reorderCategories,
  updateCategory,
  uploadCategoryImage,
} from '@/services/category.service'
import { TileStyleFields } from '@/features/categories/TileStyleFields'
import { supabase } from '@/lib/supabaseClient'
import { slugify } from '@/utils/format'
import { PageLoader } from '@/components/ui/PageLoader'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Category } from '@/types'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { buttonClass, controlClass } from '@/components/ui/styles'

/* ── Inline text editor (#1) ─────────────────────────────────────────── */

function InlineTextEdit({
  value,
  label,
  placeholder,
  className,
  inputClassName,
  multiline,
  onSave,
  onCancel,
}: {
  value: string
  label: string
  placeholder?: string
  className?: string
  inputClassName?: string
  multiline?: boolean
  onSave: (next: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = () => {
    const trimmed = draft.trim()
    onCancel()
    if (trimmed && trimmed !== value) onSave(trimmed)
  }

  const shared = {
    ref: ref as never,
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault()
        commit()
      }
      if (e.key === 'Escape') onCancel()
    },
    placeholder,
    'aria-label': label,
    className: `rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-brand-400 focus:outline-none ${inputClassName}`,
  }

  if (multiline) {
    return (
      <div className={className}>
        <textarea rows={2} {...shared} />
      </div>
    )
  }

  return <input type="text" {...shared} className={`w-full ${className ?? ''} ${inputClassName ?? ''}`} />
}

/* ── Category edit dialog (#5 + #6) ─────────────────────────────────── */

function EditCategoryDialog({
  open,
  category,
  onClose,
  onSave,
  isPending,
  isPro,
  availableColors,
  onLockedFeature,
}: {
  open: boolean
  category: Category | null
  onClose: () => void
  onSave: (data: {
    name: string
    emoji: string
    description: string
    color: string | null
    imageUrl: string | null
  }) => void
  isPending: boolean
  isPro: boolean
  availableColors: string[]
  onLockedFeature: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState(category?.name ?? '')
  const [emoji, setEmoji] = useState(category?.emoji ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [color, setColor] = useState(category?.color ?? null)
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? null)
  const [uploadingImage, setUploadingImage] = useState(false)

  if (!category) return null

  const handleFileSelected = async (file: File) => {
    setUploadingImage(true)
    try {
      const url = await uploadCategoryImage(category.id, file)
      setImageUrl(url)
    } catch {
      toast.error('Impossible de télécharger l\'image.')
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${category.emoji ?? ''} ${category.name}`.trim()}
      description="Modifier les détails de cette catégorie."
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={buttonClass({ variant: 'secondary' })}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                name: name.trim(),
                emoji: emoji.trim(),
                description: description.trim(),
                color,
                imageUrl,
              })
            }
            disabled={isPending || !name.trim()}
            className={buttonClass()}
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${controlClass()}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Emoji</label>
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
            placeholder="🛍️"
            maxLength={4}
            className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-center text-2xl focus:border-brand-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">Appuyez sur Ctrl+Cmd+Space (macOS) pour le sélecteur d'emoji natif.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description (optionnel)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={160}
            placeholder="Ex : Vêtements tendance pour femme…"
            className={`${controlClass()}`}
          />
          <p className="mt-1 text-xs text-gray-500">{description.length}/160</p>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <TileStyleFields
            color={color}
            imageUrl={imageUrl}
            uploading={uploadingImage}
            isPro={isPro}
            availableColors={availableColors}
            onLockedFeature={onLockedFeature}
            onColorChange={setColor}
            onFileSelected={(file) => void handleFileSelected(file)}
            onRemoveImage={() => setImageUrl(null)}
          />
        </div>
      </div>
    </Dialog>
  )
}

/* ── Merge dialog (#8) ──────────────────────────────────────────────── */

function MergeDialog({
  open,
  categories,
  onClose,
  onMerge,
  isPending,
}: {
  open: boolean
  categories: Category[]
  onClose: () => void
  onMerge: (sourceId: string, targetId: string) => void
  isPending: boolean
}) {
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Fusionner une catégorie"
      description="Tous les produits de la catégorie source seront déplacés vers la catégorie cible, puis la source sera supprimée."
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={buttonClass({ variant: 'secondary' })}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onMerge(sourceId, targetId)}
            disabled={isPending || !sourceId || !targetId || sourceId === targetId}
            className={buttonClass()}
          >
            {isPending ? 'Fusion…' : 'Fusionner'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie source (sera supprimée)</label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className={`${controlClass()}`}
          >
            <option value="">Choisir…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ''}
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie cible (les produits y seront transférés)</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className={`${controlClass()}`}
          >
            <option value="">Choisir…</option>
            {categories.filter((c) => c.id !== sourceId).map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ''}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Dialog>
  )
}

/* ── Bulk move dialog ────────────────────────────────────────────────── */

function MoveDialog({
  open,
  categories,
  excludeIds,
  onClose,
  onMove,
  isPending,
}: {
  open: boolean
  categories: Category[]
  excludeIds: string[]
  onClose: () => void
  onMove: (targetId: string) => void
  isPending: boolean
}) {
  const [targetId, setTargetId] = useState('')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Déplacer les produits vers…"
      description="Les produits des catégories sélectionnées seront regroupés dans la catégorie choisie."
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={buttonClass({ variant: 'secondary' })}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onMove(targetId)}
            disabled={isPending || !targetId}
            className={buttonClass()}
          >
            {isPending ? 'Déplacement…' : 'Déplacer'}
          </button>
        </div>
      }
    >
      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className={`${controlClass()}`}
      >
        <option value="">Choisir une catégorie cible…</option>
        {categories.filter((c) => !excludeIds.includes(c.id)).map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji ? `${c.emoji} ` : ''}
            {c.name}
          </option>
        ))}
      </select>
    </Dialog>
  )
}

/* ── Page ────────────────────────────────────────────────────────────── */

export function CategoriesPage() {
  usePageSeo({ title: 'Catégories — Bitiko', noindex: true })
  const navigate = useNavigate()
  const { data: shop } = useMyShop()
  const { planKey } = useShopPlan(shop?.id)
  const hasPaidPlan = planKey !== 'free'
  const availableColors = themeTileColors(shop)
  const queryClient = useQueryClient()
  const toast = useToast()

  // Inline name edit
  const [editingId, setEditingId] = useState<string | null>(null)

  // Dialogs
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveTargetIds, setMoveTargetIds] = useState<string[]>([])
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ['categories', shop?.id],
    queryFn: () => listCategories(shop!.id),
    enabled: !!shop?.id,
  })

  const { data: productCounts } = useQuery({
    queryKey: ['category-product-counts', shop?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('category_id').eq('shop_id', shop!.id)
      if (error) throw error
      const counts = new Map<string, number>()
      for (const row of data) {
        if (!row.category_id) continue
        counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1)
      }
      return counts
    },
    enabled: !!shop?.id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categories', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['category-product-counts', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['products', 'active'] })
    queryClient.invalidateQueries({ queryKey: ['products', 'admin', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      updateCategory(id, { name: newName, slug: slugify(newName) }),
    onSuccess: () => {
      setEditingId(null)
      invalidate()
      toast.success('Catégorie renommée.')
    },
    onError: () => {
      setEditingId(null)
      toast.error('Impossible de renommer cette catégorie.')
    },
  })

  const updateDetailsMutation = useMutation({
    mutationFn: ({ id, ...data }: {
      id: string
      name: string
      emoji: string
      description: string
      color: string | null
      imageUrl: string | null
    }) =>
      updateCategory(id, {
        name: data.name,
        slug: slugify(data.name),
        emoji: data.emoji || null,
        description: data.description || null,
        color: hasPaidPlan ? data.color || null : data.color && availableColors.includes(data.color) ? data.color : null,
        image_url: hasPaidPlan ? data.imageUrl || null : null,
      }),
    onSuccess: () => {
      setEditTarget(null)
      invalidate()
      toast.success('Catégorie mise à jour.')
    },
    onError: () => toast.error('Impossible de mettre à jour cette catégorie.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success('Catégorie supprimée.')
    },
    onError: () => {
      setDeleteTarget(null)
      toast.error('Impossible de supprimer cette catégorie (elle contient des produits ?).')
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCategories(shop!.id, orderedIds),
    onSuccess: () => {
      invalidate()
      toast.success('Ordre mis à jour.')
    },
    onError: () => toast.error("Impossible de réorganiser les catégories."),
  })

  const mergeMutation = useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) => mergeCategories(sourceId, targetId),
    onSuccess: () => {
      setMergeOpen(false)
      invalidate()
      toast.success('Catégorie fusionnée.')
    },
    onError: () => toast.error('Impossible de fusionner les catégories.'),
  })

  const moveMutation = useMutation({
    mutationFn: ({ sourceIds, targetId }: { sourceIds: string[]; targetId: string }) =>
      moveProductsToCategory(sourceIds, targetId),
    onSuccess: () => {
      setMoveOpen(false)
      setMoveTargetIds([])
      setSelectedIds(new Set())
      invalidate()
      toast.success('Produits déplacés.')
    },
    onError: () => toast.error('Impossible de déplacer les produits.'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteCategories(ids),
    onSuccess: () => {
      setBulkDeleteIds([])
      setSelectedIds(new Set())
      invalidate()
      toast.success('Catégories supprimées.')
    },
    onError: () => {
      setBulkDeleteIds([])
      toast.error('Certaines catégories contiennent des produits — déplacez-les d\'abord.')
      invalidate()
    },
  })

  if (isLoading) return <PageLoader />
  if (isError) return <ErrorMessage />

  const sorted = categories ?? []
  const hasProducts = (id: string) => (productCounts?.get(id) ?? 0) > 0
  const selectedArray = [...selectedIds]
  const selectedHasProducts = selectedArray.some((id) => hasProducts(id))

  const moveUp = (category: Category) => {
    const index = sorted.findIndex((c) => c.id === category.id)
    if (index <= 0) return
    const ids = sorted.map((c) => c.id)
    ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
    reorderMutation.mutate(ids)
  }

  const moveDown = (category: Category) => {
    const index = sorted.findIndex((c) => c.id === category.id)
    if (index === -1 || index >= sorted.length - 1) return
    const ids = sorted.map((c) => c.id)
    ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
    reorderMutation.mutate(ids)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(sorted.map((c) => c.id)))
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Catégories"
        subtitle="Organisez vos produits par catégorie — l'ordre ci-dessous est celui de votre boutique."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMergeOpen(true)}
              className={buttonClass({ variant: 'secondary' })}
            >
              Fusionner
            </button>
            <Link
              to="/admin/categories/nouveau"
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={16} /> Nouvelle catégorie
            </Link>
          </div>
        }
      />

      {/* List */}
      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {sorted.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="Aucune catégorie"
            description="Créez votre première catégorie pour organiser vos produits."
            action={
              <Link
                to="/admin/categories/nouveau"
                className="mt-3 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus size={16} /> Créer ma première catégorie
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2">
              <input
                type="checkbox"
                checked={selectedIds.size === sorted.length && sorted.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-gray-500">
                {selectedIds.size > 0
                  ? `${selectedIds.size} sélectionnée${selectedIds.size > 1 ? 's' : ''}`
                  : `${sorted.length} catégorie${sorted.length > 1 ? 's' : ''}`}
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {sorted.map((category) => (
                <li key={category.id} className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(category.id)}
                    onChange={() => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(category.id)) next.delete(category.id)
                        else next.add(category.id)
                        return next
                      })
                    }}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="flex shrink-0 gap-0.5 text-gray-300">
                    <button
                      type="button"
                      disabled={reorderMutation.isPending}
                      onClick={() => moveUp(category)}
                      aria-label={`Monter ${category.name}`}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={reorderMutation.isPending}
                      onClick={() => moveDown(category)}
                      aria-label={`Descendre ${category.name}`}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  {editingId === category.id ? (
                    <InlineTextEdit
                      value={category.name}
                      label={`Renommer ${category.name}`}
                      className="min-w-0 flex-1"
                      inputClassName="w-full"
                      onSave={(newName) => updateMutation.mutate({ id: category.id, newName })}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(category.id)}
                        className="group block w-full truncate text-left"
                      >
                        <span className="text-sm font-medium text-gray-900 group-hover:underline">
                          {category.image_url ? (
                            <span className="mr-1.5 inline-block h-5 w-5 overflow-hidden rounded align-[-4px]">
                              <img src={category.image_url} alt="" className="h-full w-full object-cover" />
                            </span>
                          ) : category.color ? (
                            <span
                              className="mr-1.5 inline-block h-4 w-4 rounded align-[-1px]"
                              style={{ backgroundColor: category.color }}
                              aria-hidden
                            />
                          ) : null}
                          {category.emoji && <span className="mr-1.5">{category.emoji}</span>}
                          {category.name}
                        </span>
                      </button>
                      {category.description && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">{category.description}</p>
                      )}
                    </div>
                  )}
                  <Link
                    to={`/admin/produits?category=${category.id}`}
                    className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
                    title={`Voir les produits de la catégorie « ${category.name} »`}
                  >
                    {productCounts?.get(category.id) ?? 0} produit{(productCounts?.get(category.id) ?? 0) > 1 ? 's' : ''}
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditTarget(category)}
                      aria-label={`Options de ${category.name}`}
                      className="rounded p-1 text-gray-400 hover:text-gray-700"
                    >
                      <Settings2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(category)}
                      disabled={hasProducts(category.id)}
                      title={
                        hasProducts(category.id)
                          ? 'Déplacez d\'abord les produits de cette catégorie.'
                          : `Supprimer ${category.name}`
                      }
                      aria-label={`Supprimer ${category.name}`}
                      className="rounded p-1 text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Bulk actions bar (#9) */}
      {selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white px-6 py-3 shadow-lg">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.size} catégorie{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMoveTargetIds([...selectedIds])
                  setMoveOpen(true)
                }}
                className={buttonClass({ variant: 'secondary' })}
              >
                Déplacer les produits vers…
              </button>
              <button
                type="button"
                disabled={selectedHasProducts}
                title={
                  selectedHasProducts
                    ? 'Certaines catégories sélectionnées contiennent des produits — déplacez-les d\'abord.'
                    : undefined
                }
                onClick={() => setBulkDeleteIds([...selectedIds])}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={15} />
                Supprimer{selectedHasProducts ? ' (contient des produits)' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer cette catégorie ?"
        description={
          deleteTarget
            ? `Les produits de la catégorie « ${deleteTarget.name} » ne seront pas supprimés, mais resteront sans catégorie.`
            : undefined
        }
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={bulkDeleteIds.length > 0}
        title={`Supprimer ${bulkDeleteIds.length} catégorie${bulkDeleteIds.length > 1 ? 's' : ''} ?`}
        description="Les catégories contenant des produits seront ignorées."
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(bulkDeleteIds)}
        onClose={() => setBulkDeleteIds([])}
      />

      {/* Edit details dialog */}
      <EditCategoryDialog
        key={editTarget?.id ?? 'closed'}
        open={!!editTarget}
        category={editTarget}
        onSave={(data) => {
          if (!editTarget) return
          updateDetailsMutation.mutate({ id: editTarget.id, ...data })
        }}
        isPending={updateDetailsMutation.isPending}
        isPro={hasPaidPlan}
        availableColors={availableColors}
        onLockedFeature={() => navigate('/admin/parametres/facturation')}
        onClose={() => setEditTarget(null)}
      />

      {/* Merge dialog */}
      <MergeDialog
        key={mergeOpen ? 'open' : 'closed'}
        open={mergeOpen}
        categories={sorted}
        onMerge={(sourceId, targetId) => mergeMutation.mutate({ sourceId, targetId })}
        isPending={mergeMutation.isPending}
        onClose={() => setMergeOpen(false)}
      />

      {/* Bulk move dialog */}
      <MoveDialog
        key={moveOpen ? 'open' : 'closed'}
        open={moveOpen}
        categories={sorted}
        excludeIds={moveTargetIds}
        onMove={(targetId) => moveMutation.mutate({ sourceIds: moveTargetIds, targetId })}
        isPending={moveMutation.isPending}
        onClose={() => setMoveOpen(false)}
      />
    </div>
  )
}