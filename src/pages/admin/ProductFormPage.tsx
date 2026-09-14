import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageOff, Trash2, Upload } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useCategories } from '@/features/categories/useCategories'
import { createProduct, updateProduct } from '@/services/product.service'
import { deleteProductImage, uploadProductImage } from '@/services/productImage.service'
import { supabase } from '@/lib/supabaseClient'
import { slugify } from '@/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import type { ProductImage, ProductWithRelations } from '@/types'

async function getProductById(id: string): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as ProductWithRelations | null
}

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: shop } = useMyShop()
  const { data: categories } = useCategories(shop?.id)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: existingProduct, isLoading } = useQuery({
    queryKey: ['product-edit', id],
    queryFn: () => getProductById(id as string),
    enabled: isEditing,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [active, setActive] = useState(true)
  const [images, setImages] = useState<ProductImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name)
      setDescription(existingProduct.description ?? '')
      setPrice(String(existingProduct.price))
      setStock(String(existingProduct.stock))
      setCategoryId(existingProduct.category_id ?? '')
      setActive(existingProduct.active)
      setImages(existingProduct.images)
    }
  }, [existingProduct])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!shop) throw new Error('Boutique introuvable')
      const input = {
        shop_id: shop.id,
        category_id: categoryId || null,
        name: name.trim(),
        slug: slugify(name.trim()),
        description: description.trim() || null,
        price: Number(price),
        stock: Number(stock),
        active,
      }
      if (isEditing) {
        return updateProduct(id as string, input)
      }
      return createProduct(input)
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'admin', shop?.id] })
      if (!isEditing) {
        navigate(`/admin/produits/${product.id}`, { replace: true })
      }
    },
    onError: () => setError('Impossible d\'enregistrer le produit. Vérifiez les champs.'),
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !id) return
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        const newImage = await uploadProductImage(id, file, images.length)
        setImages((prev) => [...prev, newImage])
      }
    } catch {
      setError("Échec de l'envoi de l'image. Réessayez.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteImage = async (image: ProductImage) => {
    try {
      await deleteProductImage(image)
      setImages((prev) => prev.filter((i) => i.id !== image.id))
    } catch {
      setError("Impossible de supprimer l'image.")
    }
  }

  if (isEditing && isLoading) return <Spinner />

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">
        {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          saveMutation.mutate()
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nom
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          />
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
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Prix
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="1"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
              Stock
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              step="1"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Catégorie
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          >
            <option value="">Aucune</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Produit actif (visible dans la boutique)
        </label>

        {isEditing ? (
          <div>
            <span className="block text-sm font-medium text-gray-700">Images</span>
            <div className="mt-2 flex flex-wrap gap-3">
              {images.map((image) => (
                <div key={image.id} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200">
                  <img src={image.public_url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(image)}
                    aria-label="Supprimer l'image"
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"
              >
                {uploading ? <ImageOff size={20} /> : <Upload size={20} />}
                <span className="text-xs">{uploading ? 'Envoi…' : 'Ajouter'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Enregistrez le produit pour pouvoir ajouter des photos.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/produits')}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
