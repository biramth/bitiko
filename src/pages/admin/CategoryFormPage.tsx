import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Eye, Loader2, Tags } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { createCategory, generateUniqueCategorySlug, updateCategory, uploadCategoryImage } from '@/services/category.service'
import { slugify } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'
import { usePageSeo } from '@/hooks/usePageSeo'
import { TileStyleFields } from '@/features/categories/TileStyleFields'
import { themeTileColors, readableTextColor } from '@/features/categories/categoryTile'

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Tags
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <header className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={18} aria-hidden />
        </span>
        <div>
          <h2 className="font-heading font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  )
}

export function CategoryFormPage() {
  usePageSeo({ title: 'Nouvelle catégorie — Bitiko', noindex: true })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: shop } = useMyShop()
  const { planKey, isLoading: planLoading } = useShopPlan(shop?.id)
  const isPro = planKey === 'pro'
  const availableColors = themeTileColors(shop)
  const formRef = useRef<HTMLFormElement>(null)

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewSlug = slugify(name.trim())

  const handleFileSelected = (file: File) => {
    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const shopId = shop!.id
      const slug = await generateUniqueCategorySlug(shopId, slugify(name.trim()))
      const category = await createCategory({
        shopId,
        name: name.trim(),
        slug,
        emoji,
        description,
        color: isPro ? color : color && availableColors.includes(color) ? color : null,
      })
      if (imageFile && isPro) {
        setUploadingImage(true)
        try {
          const url = await uploadCategoryImage(category.id, imageFile)
          await updateCategory(category.id, { image_url: url })
        } finally {
          setUploadingImage(false)
        }
      }
      return category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['products', 'active'] })
      toast.success('Catégorie créée.')
      navigate('/admin/categories', { replace: true })
    },
    onError: () => {
      setError('Impossible de créer la catégorie (nom dupliqué ou fichier non accepté ?).')
      toast.error('Impossible de créer la catégorie.')
    },
  })

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/admin/categories"
        className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Retour aux catégories
      </Link>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          saveMutation.mutate()
        }}
        className="mt-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold text-gray-900">Nouvelle catégorie</h1>
            <p className="mt-1 text-sm text-gray-500">
              Créez votre catégorie en une fois : nom, emoji et description.
            </p>
          </div>
          <a
            href={previewSlug ? `/catalogue?categorie=${previewSlug}` : undefined}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1.5 text-sm font-medium ${
              previewSlug ? 'text-brand-700 hover:text-brand-800' : 'pointer-events-none text-gray-400'
            }`}
          >
            <Eye size={15} aria-hidden /> Voir sur la boutique
          </a>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <Card icon={Tags} title="Informations" description="Les données principales de la catégorie.">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex. Accessoires"
                  className={inputClass}
                />
                {previewSlug && (
                  <p className="mt-1 break-all text-xs text-gray-500">
                    Lien boutique : /catalogue?categorie={previewSlug}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="emoji" className="block text-sm font-medium text-gray-700">
                  Emoji (optionnel)
                </label>
                <input
                  id="emoji"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                  maxLength={4}
                  placeholder="🛍️"
                  className="mt-1 w-24 rounded-lg border border-gray-200 px-3 py-2 text-center text-2xl focus:border-brand-400 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Appuyez sur Ctrl+Cmd+Space (macOS) pour le sélecteur d'emoji natif.
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description (optionnel)
                </label>
                <textarea
                  id="description"
                  rows={4}
                  maxLength={160}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex. Vêtements tendance pour femme…"
                  className={inputClass}
                />
                <p className="mt-1 text-right text-xs text-gray-500">{description.length}/160</p>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <TileStyleFields
                  color={color}
                  imageUrl={imageUrl}
                  uploading={uploadingImage}
                  isPro={isPro}
                  availableColors={availableColors}
                  onLockedFeature={() => navigate('/admin/facturation')}
                  onColorChange={setColor}
                  onFileSelected={handleFileSelected}
                  onRemoveImage={() => {
                    setImageFile(null)
                    setImageUrl(null)
                  }}
                />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white">
              <header className="border-b border-gray-100 px-5 py-4">
                <h2 className="font-heading font-semibold text-gray-900">Aperçu</h2>
              </header>
              <div className="p-5">
                <div className="rounded-xl border border-sand-200 bg-sand-50 p-3">
                  <div
                    className={`group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-lg p-4 ${
                      imageUrl ? 'text-white' : color ? '' : 'bg-ink-900 text-white'
                    }`}
                    style={color && !imageUrl ? { backgroundColor: color } : undefined}
                  >
                    {imageUrl && (
                      <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    {imageUrl && (
                      <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" aria-hidden />
                    )}
                    <div
                      className="relative z-10"
                      style={color && !imageUrl ? { color: readableTextColor(color) } : undefined}
                    >
                      {emoji && <span className="mb-2 block text-2xl">{emoji}</span>}
                      <span className="block text-sm font-semibold">{name.trim() || 'Nom de la catégorie'}</span>
                      {description.trim() && (
                        <span className="mt-0.5 line-clamp-2 block text-xs opacity-70">{description.trim()}</span>
                      )}
                    </div>
                    <ArrowUpRight
                      size={16}
                      className="absolute right-4 top-4 z-10 opacity-60"
                      aria-hidden
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Tuile affichée dans la section « Catégories » de votre boutique.
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              {saveMutation.isPending ? (
                <span className="flex items-center gap-2 text-gray-500">
                  <Loader2 size={15} className="animate-spin text-brand-600" /> Enregistrement…
                </span>
              ) : error ? (
                <span className="text-red-600">{error}</span>
              ) : (
                <span className="text-gray-500">Votre catégorie apparaîtra immédiatement sur la boutique.</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/categories')}
                className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending || !name.trim() || planLoading}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {saveMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} aria-hidden />
                )}
                Créer la catégorie
                {!saveMutation.isPending && <ArrowRight size={15} aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}