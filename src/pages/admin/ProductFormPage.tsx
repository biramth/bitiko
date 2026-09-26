import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, ListChecks, Eye, ImagePlus, Layers, Loader2, Lock, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useCategories } from '@/features/categories/useCategories'
import { useShopPlan } from '@/features/billing/useShopPlan'
import {
  countActiveProducts,
  createProduct,
  updateProduct,
  generateUniqueProductSlug,
} from '@/services/product.service'
import {
  createVariant,
  deleteVariant,
  updateVariant,
  uploadVariantImage,
  clearVariantImage,
} from '@/services/productVariant.service'
import { deleteProductImage, reorderProductImages, uploadProductImage } from '@/services/productImage.service'
import { createCategory } from '@/services/category.service'
import { supabase } from '@/lib/supabaseClient'
import { storefrontUrl } from '@/lib/tenant'
import { slugify } from '@/utils/format'
import { PRICE_ERROR_MESSAGES, normalizePrice } from '@/utils/price'
import { PageLoader } from '@/components/ui/PageLoader'
import { useToast } from '@/components/ui/Toast'
import type { Category, OptionField, ProductImage, ProductVariant, ProductWithRelations, Shop } from '@/types'
import type { Json } from '@/types/database.types'
import { parseOptionFields } from '@/utils/productOptions'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PLANS, canAddProductImage, canAddVariant } from '@/config/plans'
import type { PlanKey } from '@/types/billing'
import { buttonClass, controlClass } from '@/components/ui/styles'
import { inputClass, normalizeOptionFields, type VariantDraft } from '@/features/products/productFormHelpers'
import { FormCard, ProductPreview, Toggle } from '@/features/products/productFormParts'
import { OptionFieldsEditor } from '@/features/products/OptionFieldsEditor'
import { VariantsEditor } from '@/features/products/VariantsEditor'

async function getProductById(id: string): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*), variants:product_variants(*)')
    .eq('id', id)
    .order('sort_order', { foreignTable: 'product_images', ascending: true })
    .order('sort_order', { foreignTable: 'product_variants', ascending: true })
    .maybeSingle()
  if (error) throw error
  return data as ProductWithRelations | null
}

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  usePageSeo({
    title: isEditing ? 'Modifier le produit — Bitiko' : 'Nouveau produit — Bitiko',
    noindex: true,
  })
  const { data: shop } = useMyShop()
  const { data: categories } = useCategories(shop?.id)
  const { planKey } = useShopPlan(shop?.id)

  const { data: existingProduct, isLoading } = useQuery({
    queryKey: ['product-edit', id],
    queryFn: () => getProductById(id as string),
    enabled: isEditing,
  })

  const { data: activeProductCount } = useQuery({
    queryKey: ['active-product-count', shop?.id],
    queryFn: () => countActiveProducts(shop?.id as string),
    enabled: !!shop?.id,
  })

  if (isEditing && isLoading) return <PageLoader />

  return (
    <ProductForm
      key={existingProduct?.id ?? 'new'}
      isEditing={isEditing}
      shop={shop ?? null}
      categories={categories ?? []}
      existingProduct={existingProduct ?? null}
      planKey={planKey}
      activeProductCount={activeProductCount ?? 0}
    />
  )
}

function ProductForm({
  isEditing,
  shop,
  categories,
  existingProduct,
  planKey,
  activeProductCount,
}: {
  isEditing: boolean
  shop: Shop | null
  categories: Category[]
  existingProduct: ProductWithRelations | null
  planKey: PlanKey
  activeProductCount: number
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const maxActiveProducts = PLANS[planKey].maxActiveProducts
  // Toggling this product on/off doesn't move the count of every OTHER product,
  // so a product that's already active is excluded from its own limit check.
  const countExcludingSelf = activeProductCount - (existingProduct?.active ? 1 : 0)
  const limitReached = maxActiveProducts !== null && countExcludingSelf >= maxActiveProducts

  const [name, setName] = useState(existingProduct?.name ?? '')
  const [description, setDescription] = useState(existingProduct?.description ?? '')
  const [price, setPrice] = useState(existingProduct ? String(existingProduct.price) : '')
  const [stock, setStock] = useState(existingProduct ? String(existingProduct.stock) : '')
  const [categoryId, setCategoryId] = useState(existingProduct?.category_id ?? '')
  const [badge, setBadge] = useState(existingProduct?.badge ?? '')
  const [active, setActive] = useState(existingProduct?.active ?? true)
  const effectiveActive = active && !limitReached
  const [images, setImages] = useState<ProductImage[]>(existingProduct?.images ?? [])
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    (existingProduct?.variants ?? []).map((v) => ({
      key: v.id,
      id: v.id,
      name: v.name,
      sku: v.sku ?? '',
      price: v.price !== null && v.price !== undefined ? String(v.price) : '',
      stock: String(v.stock),
      active: v.active,
      imageUrl: v.image_url ?? null,
    })),
  )
  const [error, setError] = useState<string | null>(null)
  const [pendingUploads, setPendingUploads] = useState<{ file: File; url: string }[]>([])
  const pendingUrlsRef = useRef<string[]>([])

  const id = existingProduct?.id

  const [optionFields, setOptionFields] = useState<OptionField[]>(() =>
    parseOptionFields(existingProduct?.option_fields),
  )


  const validateBeforeSave = (): string | null => {
    const basePrice = Number(price)
    if (price.trim() === '' || !Number.isFinite(basePrice) || basePrice < 0) {
      return 'Indiquez un prix de base valide.'
    }
    for (const v of variants) {
      if (v.price.trim() !== '') {
        const p = Number(v.price)
        if (!Number.isFinite(p) || p < 0) {
          return `Le prix de la variante « ${v.name.trim() || 'sans nom'} » est invalide.`
        }
      }
    }
    const seenLabels = new Set<string>()
    for (const f of optionFields) {
      const label = f.label.trim()
      if (!label) return 'Chaque champ de précision doit avoir un nom.'
      const key = label.toLowerCase()
      if (seenLabels.has(key)) return `Le champ de précision « ${label} » existe en double.`
      seenLabels.add(key)
      if (f.type === 'choice') {
        const choices = f.choices.map((c) => c.trim()).filter(Boolean)
        if (choices.length < 2) return `Le champ « ${label} » doit avoir au moins 2 options.`
        const distinct = new Set(choices.map((c) => c.toLowerCase()))
        if (distinct.size !== choices.length) return `Le champ « ${label} » a des options en double.`
      }
    }
    return null
  }

  useEffect(() => {
    const revoke = () => pendingUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    return revoke
  }, [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!shop) throw new Error('Boutique introuvable')

      // Validate every price up front, before touching the network — a bad
      // variant price should never leave the product half-saved.
      let basePrice = Number(price) || 0
      if (!hasVariants) {
        const priceCheck = normalizePrice(price)
        if (!priceCheck.ok || priceCheck.value === null) {
          throw new Error(PRICE_ERROR_MESSAGES[priceCheck.error ?? 'invalid'])
        }
        basePrice = priceCheck.value
      }
      const variantPrices = variants.map((v) => {
        if (v.price.trim() === '') return null
        const check = normalizePrice(v.price)
        if (!check.ok || check.value === null) {
          throw new Error(`Variante « ${v.name || 'sans nom'} » : ${PRICE_ERROR_MESSAGES[check.error ?? 'invalid']}`)
        }
        return check.value
      })

      const baseSlug = slugify(name.trim())
      const slug = isEditing
        ? baseSlug === existingProduct?.slug
          ? existingProduct.slug
          : await generateUniqueProductSlug(shop.id, baseSlug, id)
        : await generateUniqueProductSlug(shop.id, baseSlug)
      const input = {
        shop_id: shop.id,
        category_id: categoryId || null,
        name: name.trim(),
        slug,
        description: description.trim() || null,
        price: basePrice,
        stock: Number(stock),
        badge: badge.trim() || null,
        active: effectiveActive,
        option_fields: normalizeOptionFields(optionFields) as unknown as Json,
      }
      const product = isEditing
        ? await updateProduct(id as string, input)
        : await createProduct(input)

      const previousIds = new Set((existingProduct?.variants ?? []).map((v) => v.id))
      const keptIds = new Set(variants.map((v) => v.id).filter((vid): vid is string => !!vid))

      for (const v of previousIds) {
        if (!keptIds.has(v)) await deleteVariant(v)
      }

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        const fields = {
          name: v.name.trim(),
          sku: v.sku.trim() || null,
          price: variantPrices[i],
          stock: Number(v.stock) || 0,
          active: v.active,
          sort_order: i,
        }
        let saved: ProductVariant
        if (v.id) {
          saved = await updateVariant(v.id, fields)
        } else {
          saved = await createVariant({ ...fields, product_id: product.id })
        }
        if (v.photoFile) {
          // Upload the newly-picked photo now that the variant row exists.
          await uploadVariantImage(product.id, saved.id, v.photoFile)
        } else if (v.photoCleared && v.id) {
          await clearVariantImage(saved.id)
        }
      }

      if (pendingUploads.length > 0) {
        for (let i = 0; i < pendingUploads.length; i++) {
          const uploadedImage = await uploadProductImage(
            product.id,
            pendingUploads[i].file,
            images.length + i,
          )
          setImages((prev) => [...prev, uploadedImage])
        }
      }
      return product
    },
    onSuccess: (product) => {
      pendingUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      pendingUrlsRef.current = []
      setPendingUploads([])
      queryClient.invalidateQueries({ queryKey: ['products', 'admin', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['product-edit', id] })
      queryClient.invalidateQueries({ queryKey: ['product', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['active-product-count', shop?.id] })
      toast.success(isEditing ? 'Produit enregistré.' : 'Produit créé.')
      if (!isEditing) {
        navigate(`/admin/produits/${product.id}`, { replace: true })
      }
    },
    onError: (err) => {
      setError('Impossible d\'enregistrer le produit. Vérifiez les champs.')
      toast.error(err instanceof Error && err.message ? err.message : 'Impossible d\'enregistrer le produit.')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (imageLimitReached) {
      const limit = plan.maxProductImages
      setError(limit ? `Limite du plan gratuit atteinte : ${limit} photos max par produit.` : "Impossible d'ajouter plus de photos.")
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const items = Array.from(files).map((file) => ({ file, url: URL.createObjectURL(file) }))
    pendingUrlsRef.current.push(...items.map((item) => item.url))
    setPendingUploads((prev) => [...prev, ...items])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePendingUpload = (index: number) => {
    setPendingUploads((prev) => {
      const item = prev[index]
      if (item) {
        URL.revokeObjectURL(item.url)
        pendingUrlsRef.current = pendingUrlsRef.current.filter((url) => url !== item.url)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleDeleteImage = async (image: ProductImage) => {
    try {
      await deleteProductImage(image)
      setImages((prev) => prev.filter((i) => i.id !== image.id))
    } catch {
      setError("Impossible de supprimer l'image.")
    }
  }

  const handleVariantPhotoChange = (key: string, file: File) => {
    if (imageLimitReached) {
      const limit = plan.maxProductImages
      setError(limit ? `Limite du plan gratuit atteinte : ${limit} photos max par produit.` : "Impossible d'ajouter plus de photos.")
      return
    }
    const url = URL.createObjectURL(file)
    pendingUrlsRef.current.push(url)
    setVariants((prev) =>
      prev.map((v) =>
        v.key === key ? { ...v, photoFile: file, photoPreviewUrl: url, photoCleared: false } : v,
      ),
    )
  }

  const handleRemoveVariantPhoto = (key: string) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.key !== key) return v
        if (v.photoPreviewUrl) {
          pendingUrlsRef.current = pendingUrlsRef.current.filter((u) => u !== v.photoPreviewUrl)
          URL.revokeObjectURL(v.photoPreviewUrl)
        }
        const removedPreview = !!v.photoPreviewUrl
        return {
          ...v,
          photoFile: undefined,
          photoPreviewUrl: undefined,
          // Dropping a just-picked photo keeps the persisted one (if any);
          // otherwise the persisted photo itself is being removed.
          imageUrl: removedPreview ? v.imageUrl : null,
          photoCleared: removedPreview ? false : v.photoCleared || !!v.imageUrl,
        }
      }),
    )
  }

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim()
    if (!name || !shop) return
    setCreatingCategory(true)
    setCategoryError(null)
    try {
      const category = await createCategory({ shopId: shop.id, name, slug: slugify(name) })
      queryClient.invalidateQueries({ queryKey: ['categories', shop.id] })
      setCategoryId(category.id)
      setNewCategoryName('')
      setNewCategoryOpen(false)
      toast.success(`Catégorie « ${category.name} » créée.`)
    } catch {
      setCategoryError("Impossible de créer la catégorie (nom déjà utilisé ?).")
      toast.error("Impossible de créer la catégorie (nom déjà utilisé ?).")
    } finally {
      setCreatingCategory(false)
    }
  }

  // Ctrl/Cmd+S enregistre le produit sans quitter la page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const [draggedImageId, setDraggedImageId] = useState<string | null>(null)
  const [imageDragOverId, setImageDragOverId] = useState<string | null>(null)

  const handleReorderImages = async (draggedId: string, targetId: string) => {
    const draggedIndex = images.findIndex((i) => i.id === draggedId)
    const targetIndex = images.findIndex((i) => i.id === targetId)
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return
    const next = [...images]
    const [dragged] = next.splice(draggedIndex, 1)
    next.splice(targetIndex, 0, dragged)
    setImages(next)
    try {
      await reorderProductImages(next.map((image, i) => ({ id: image.id, sort_order: i })))
    } catch {
      setError("Impossible de réorganiser les photos.")
    }
  }

  const currency = shop?.currency ?? 'XOF'
  const previewPrice = Number(price) || 0
  const previewStock = Number(stock) || 0
  const previewCategoryName = categories.find((c) => c.id === categoryId)?.name
  const previewSlug = slugify(name.trim())
  // The button below opens the product as it exists live on the storefront
  // right now, so it must use the persisted slug (existingProduct.slug) —
  // not `previewSlug`, which tracks the currently-typed name and can point
  // to a page that doesn't exist yet (a new, unsaved product) or no longer
  // matches (an unsaved rename since the last save).
  const liveSlug = existingProduct?.slug ?? null
  const previewImage = pendingUploads[0]?.url ?? images[0]?.public_url ?? null
  const hasVariants = variants.length > 0

  // Free-plan photo budget: 4 photos per product, shared between the gallery
  // and variant photos (1 main + up to 2 variant photos). Server-side trigger
  // (migration 0046) mirrors this. Variants: 2 max on free.
  const plan = PLANS[planKey]
  const variantPhotoCount = variants.filter((v) => v.imageUrl || v.photoFile).length
  const photoCount = images.length + variantPhotoCount
  const imageLimitReached = !canAddProductImage(plan, images.length, variantPhotoCount)
  const variantLimitReached = !canAddVariant(plan, variants.length)
  const photoBudgetNote = plan.maxProductImages !== null ? `${photoCount} / ${plan.maxProductImages}` : null

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/admin/produits"
        className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Retour aux produits
      </Link>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          const validationError = validateBeforeSave()
          if (validationError) {
            setError(validationError)
            toast.error(validationError)
            return
          }
          saveMutation.mutate()
        }}
        className="mt-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold text-gray-900">
              {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEditing
                ? 'Mettez à jour les informations, le stock et les photos du produit.'
                : 'Créez votre produit en une fois : informations, prix et photo.'}
            </p>
          </div>
          <a
            href={shop && liveSlug ? storefrontUrl(shop.slug, `/produits/${liveSlug}`) : undefined}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1.5 text-sm font-medium ${
              shop && liveSlug ? 'text-brand-700 hover:text-brand-800' : 'pointer-events-none text-gray-400'
            }`}
          >
            <Eye size={15} aria-hidden /> Voir sur la boutique
          </a>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <FormCard icon={Pencil} title="Informations" description="Les données principales du produit.">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex. Sac en wax"
                  className={inputClass}
                />
                {previewSlug && (
                  <p className="mt-1 break-all text-xs text-gray-500">
                    Adresse produit : /produits/{previewSlug}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre produit…"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="badge" className="block text-sm font-medium text-gray-700">
                  Pastille (optionnel)
                </label>
                <input
                  id="badge"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  maxLength={24}
                  placeholder="ex. Nouveau"
                  className={inputClass}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['Nouveau', 'Tendance', 'Promo'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBadge(preset)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        badge === preset
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  {badge && (
                    <button
                      type="button"
                      onClick={() => setBadge('')}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-gray-600"
                    >
                      Retirer
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Affichée en haut à gauche de la photo sur la boutique. Vide = aucune pastille.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    {hasVariants ? 'Prix de base' : 'Prix'}
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="price"
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                      className={`${inputClass} pr-20`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      {currency}
                    </span>
                  </div>
                  {hasVariants && (
                    <p className="mt-1 text-xs text-gray-500">
                      Prix des variantes qui n'ont pas de prix propre.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                    Stock
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="stock"
                      type="number"
                      min="0"
                      step="1"
                      required={!hasVariants}
                      disabled={hasVariants}
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="0"
                      className={`${inputClass} pr-20 disabled:cursor-not-allowed disabled:bg-gray-50`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      {hasVariants ? '' : 'unités'}
                    </span>
                  </div>
                  {hasVariants && (
                    <p className="mt-1 text-xs text-gray-500">Géré par variante</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Catégorie
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCategoryOpen((open) => !open)
                      setCategoryError(null)
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
                  >
                    <Plus size={13} aria-hidden />
                    {newCategoryOpen ? 'Fermer' : 'Nouvelle catégorie'}
                  </button>
                </div>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Aucune</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {newCategoryOpen && (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <label htmlFor="newCategoryName" className="block text-xs font-medium text-gray-600">
                      Nom de la catégorie
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id="newCategoryName"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void handleCreateCategory()
                          }
                        }}
                        placeholder="ex. Accessoires"
                        className={`${controlClass()}`}
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim() || creatingCategory}
                        className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        {creatingCategory ? <Loader2 size={14} className="animate-spin" /> : 'Créer'}
                      </button>
                    </div>
                    {categoryError && <p className="mt-2 text-xs text-red-600">{categoryError}</p>}
                  </div>
                )}
              </div>

              <Toggle
                checked={effectiveActive}
                onChange={(value) => setActive(limitReached ? false : value)}
                disabled={limitReached}
                label="Produit actif"
                description={
                  limitReached
                    ? `Limite du plan gratuit atteinte (${maxActiveProducts} produits actifs).`
                    : 'Visible et commandable dans la boutique.'
                }
              />
              {limitReached && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <Lock size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                  <p className="text-sm text-amber-800">
                    Vous avez atteint la limite de {maxActiveProducts} produits actifs du plan
                    gratuit. Ce produit sera enregistré comme inactif.{' '}
                    <Link to="/admin/parametres/facturation" className="font-semibold underline underline-offset-2">
                      Passez à Pro
                    </Link>{' '}
                    pour activer des produits illimités.
                  </p>
                </div>
              )}
            </FormCard>

            <FormCard icon={ImagePlus} title="Photos" description="Les photos affichées sur votre boutique.">
              <div className="mt-1 flex flex-wrap gap-3">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={() => setDraggedImageId(image.id)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setImageDragOverId(image.id)
                    }}
                    onDragLeave={() => setImageDragOverId((id) => (id === image.id ? null : id))}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (draggedImageId && draggedImageId !== image.id) handleReorderImages(draggedImageId, image.id)
                      setDraggedImageId(null)
                      setImageDragOverId(null)
                    }}
                    onDragEnd={() => {
                      setDraggedImageId(null)
                      setImageDragOverId(null)
                    }}
                    className={`group relative h-24 w-24 cursor-grab overflow-hidden rounded-lg border transition-colors active:cursor-grabbing ${
                      imageDragOverId === image.id && draggedImageId !== image.id
                        ? 'border-dashed border-brand-400'
                        : 'border-gray-200'
                    } ${draggedImageId === image.id ? 'opacity-40' : ''}`}
                  >
                    <img src={image.public_url} alt="" className="h-full w-full object-cover" />
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Miniature
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image)}
                      aria-label="Supprimer l'image"
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {pendingUploads.map((item, index) => (
                  <div
                    key={item.url}
                    className="group relative h-24 w-24 overflow-hidden rounded-lg border border-dashed border-brand-300 bg-brand-50"
                  >
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePendingUpload(index)}
                      aria-label="Retirer la photo"
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="absolute bottom-1 left-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Nouvelle
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageLimitReached}
                  title={imageLimitReached ? `Limite : ${plan.maxProductImages} photos max par produit` : undefined}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-400 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-400"
                >
                  <Upload size={20} />
                  <span className="text-xs">Ajouter</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={imageLimitReached}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500">
                Glissez-déposez pour réorganiser. La première photo est utilisée comme miniature
                dans le catalogue.{' '}
                {photoBudgetNote && (
                  <>
                    <span className={imageLimitReached ? 'font-semibold text-amber-600' : ''}>
                      {photoBudgetNote} photo{photoCount > 1 ? 's' : ''} utilisée{photoCount > 1 ? 's' : ''}
                    </span>{' '}
                    (photos produit + photos de variantes). Le plan gratuit plafonne à{' '}
                    {plan.maxProductImages} photos par produit.
                  </>
                )}
              </p>
            </FormCard>

            <FormCard
              icon={Layers}
              title="Variantes"
              description="Tailles, couleurs, formats… avec leur propre stock et prix."
              collapsible
              defaultOpen={variants.length > 0}
              badge={variants.length > 0 ? String(variants.length) : undefined}
            >
              <VariantsEditor
                variants={variants}
                setVariants={setVariants}
                plan={plan}
                basePrice={price}
                imageLimitReached={imageLimitReached}
                variantLimitReached={variantLimitReached}
                onPhotoChange={handleVariantPhotoChange}
                onRemovePhoto={handleRemoveVariantPhoto}
              />
            </FormCard>

            <FormCard
              icon={ListChecks}
              title="Champs de précision"
              description="Ajoutez les informations que le client doit préciser avant de commander (ton, taille, prénom à broder…). Elles apparaissent dans le panier et dans le message WhatsApp de commande."
              collapsible
              defaultOpen={optionFields.length > 0}
              badge={optionFields.length > 0 ? String(optionFields.length) : undefined}
            >
              <OptionFieldsEditor fields={optionFields} setFields={setOptionFields} />
            </FormCard>
          </div>

          <div className="space-y-6">
            <ProductPreview
              image={previewImage}
              name={name}
              active={effectiveActive}
              price={previewPrice}
              stock={previewStock}
              lowStockThreshold={shop?.low_stock_threshold ?? 5}
              currency={currency}
              categoryName={previewCategoryName}
              description={description}
            />

            {!isEditing && (
              <p className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-4 text-sm text-gray-500">
                Ajoutez une photo pour que votre produit ressorte dans le catalogue.
              </p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-5 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              {saveMutation.isPending ? (
                <span className="flex items-center gap-2 text-gray-500">
                  <Loader2 size={15} className="animate-spin text-brand-600" /> Enregistrement…
                </span>
              ) : error ? (
                <span className="text-red-600">{error}</span>
              ) : (
                <span className="text-gray-500">
                  {isEditing
                    ? 'Les modifications s\'appliqueront immédiatement.'
                    : 'Votre produit sera publié dès l\'enregistrement.'}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/produits')}
                className={buttonClass({ variant: 'secondary', size: 'lg' })}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className={buttonClass({ size: 'lg' })}
              >
                {saveMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} aria-hidden />
                )}
                {isEditing ? 'Enregistrer' : 'Enregistrer le produit'}
                {!saveMutation.isPending && <ArrowRight size={15} aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}