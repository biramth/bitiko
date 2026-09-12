import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ImageOff, Minus, Plus } from 'lucide-react'
import { useShop } from '@/features/shop-settings/useShop'
import { useProduct } from '@/features/products/useProducts'
import { StockBadge } from '@/features/products/StockBadge'
import { useCart } from '@/features/cart/CartContext'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatCurrency } from '@/utils/format'

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: shop } = useShop()
  const { data: product, isLoading, isError } = useProduct(shop?.id, slug)
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />
  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-700">Ce produit n'existe pas ou n'est plus disponible.</p>
        <Link to="/catalogue" className="mt-4 inline-block text-sm font-medium text-brand-700">
          Retour au catalogue
        </Link>
      </div>
    )
  }

  const images = product.images
  const outOfStock = product.stock <= 0
  const currency = shop?.currency ?? 'XOF'

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      quantity,
      imageUrl: images[0]?.public_url ?? null,
      stock: product.stock,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
            {images[activeImage] ? (
              <img
                src={images[activeImage].public_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <ImageOff size={48} aria-hidden />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    i === activeImage ? 'border-gray-900' : 'border-transparent'
                  }`}
                >
                  <img src={img.public_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.category && (
            <p className="text-sm font-medium text-gray-500">{product.category.name}</p>
          )}
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">{product.name}</h1>
          <p className="mt-3 text-xl font-semibold text-gray-900">
            {formatCurrency(product.price, currency)}
          </p>
          <div className="mt-3">
            <StockBadge stock={product.stock} />
          </div>
          {product.description && (
            <p className="mt-4 whitespace-pre-line text-gray-600">{product.description}</p>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-200">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={outOfStock}
                aria-label="Diminuer la quantité"
                className="p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={outOfStock || quantity >= product.stock}
                aria-label="Augmenter la quantité"
                className="p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="flex-1 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {outOfStock ? 'Rupture de stock' : added ? 'Ajouté ✓' : 'Ajouter au panier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
