import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { createCategory, deleteCategory, listCategories, updateCategory } from '@/services/category.service'
import { supabase } from '@/lib/supabaseClient'
import { slugify } from '@/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Category } from '@/types'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function CategoriesPage() {
  usePageSeo({ title: 'Catégories — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

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
  }

  const createMutation = useMutation({
    mutationFn: (categoryName: string) =>
      createCategory({ shopId: shop!.id, name: categoryName, slug: slugify(categoryName) }),
    onSuccess: () => {
      setName('')
      invalidate()
    },
    onError: () => setFormError("Impossible de créer la catégorie (nom déjà utilisé ?)."),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      updateCategory(id, { name: newName, slug: slugify(newName) }),
    onSuccess: () => {
      setEditing(null)
      invalidate()
    },
    onError: () => setFormError('Impossible de modifier cette catégorie.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
    },
    onError: () => setFormError('Impossible de supprimer une catégorie qui contient encore des produits.'),
  })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />

  return (
    <div>
      <PageHeader
        title="Catégories"
        subtitle="Organisez vos produits par catégorie pour aider vos clients à naviguer."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setFormError(null)
          if (name.trim()) createMutation.mutate(name.trim())
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nouvelle catégorie"
          aria-label="Nom de la nouvelle catégorie"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus size={16} /> Ajouter
        </button>
      </form>

      {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {(categories?.length ?? 0) === 0 ? (
          <EmptyState icon={Tags} title="Aucune catégorie" description="Créez votre première catégorie ci-dessus." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {categories!.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-3 px-4 py-3">
                {editing?.id === category.id ? (
                  <input
                    autoFocus
                    defaultValue={category.name}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateMutation.mutate({ id: category.id, newName: e.currentTarget.value })
                      }
                      if (e.key === 'Escape') setEditing(null)
                    }}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                  />
                ) : (
                  <span className="text-sm text-gray-900">
                    {category.name}{' '}
                    <span className="text-gray-400">
                      ({productCounts?.get(category.id) ?? 0} produit{(productCounts?.get(category.id) ?? 0) > 1 ? 's' : ''})
                    </span>
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {editing?.id === category.id ? (
                    <button onClick={() => setEditing(null)} aria-label="Annuler" className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditing(category)}
                      aria-label={`Modifier ${category.name}`}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(category)}
                    disabled={(productCounts?.get(category.id) ?? 0) > 0}
                    title={
                      (productCounts?.get(category.id) ?? 0) > 0
                        ? 'Supprimez d\'abord les produits de cette catégorie.'
                        : undefined
                    }
                    aria-label={`Supprimer ${category.name}`}
                    className="text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
    </div>
  )
}
