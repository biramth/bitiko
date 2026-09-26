import { useRef, type Dispatch, type SetStateAction } from 'react'
import { ImagePlus, Plus, Trash2, Upload } from 'lucide-react'
import type { Plan } from '@/config/plans'
import { inputClass, nextVariantKey, type VariantDraft } from '@/features/products/productFormHelpers'

/** Variantes d'un produit (taille, couleur…) : stock, prix et photo propres. État contrôlé par le formulaire. */
export function VariantsEditor({
  variants,
  setVariants,
  plan,
  basePrice,
  imageLimitReached,
  variantLimitReached,
  onPhotoChange,
  onRemovePhoto,
}: {
  variants: VariantDraft[]
  setVariants: Dispatch<SetStateAction<VariantDraft[]>>
  plan: Plan
  /** Prix saisi sur le produit : proposé comme repère quand la variante n'a pas le sien. */
  basePrice: string
  imageLimitReached: boolean
  variantLimitReached: boolean
  onPhotoChange: (key: string, file: File) => void
  onRemovePhoto: (key: string) => void
}) {
  const variantPhotoInputRefs = useRef<Record<string, HTMLInputElement>>({})

  return (
    <>
              {variants.length > 0 && (
                <ul className="space-y-3">
                  {variants.map((variant) => {
                    const displayUrl = variant.photoPreviewUrl ?? variant.imageUrl
                    return (
                    <li
                      key={variant.key}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {displayUrl ? (
                            <img src={displayUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-gray-300">
                              <ImagePlus size={18} aria-hidden />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => variantPhotoInputRefs.current[variant.key]?.click()}
                            disabled={imageLimitReached && !displayUrl}
                            title={imageLimitReached && !displayUrl ? `Limite : ${plan.maxProductImages} photos max par produit` : undefined}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Upload size={13} aria-hidden />
                            {displayUrl ? 'Changer la photo' : 'Ajouter une photo'}
                          </button>
                          {displayUrl && (
                            <button
                              type="button"
                              onClick={() => onRemovePhoto(variant.key)}
                              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:underline"
                            >
                              <Trash2 size={13} aria-hidden /> Retirer
                            </button>
                          )}
                          <input
                            ref={(el) => {
                              if (el) variantPhotoInputRefs.current[variant.key] = el
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) onPhotoChange(variant.key, file)
                              e.currentTarget.value = ''
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) =>
                              setVariants((prev) =>
                                prev.map((v) =>
                                  v.key === variant.key ? { ...v, name: e.target.value } : v,
                                ),
                              )
                            }
                            placeholder="Nom (ex. Taille M)"
                            className={inputClass}
                            aria-label={`Nom de la variante ${variants.indexOf(variant) + 1}`}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) =>
                              setVariants((prev) =>
                                prev.map((v) =>
                                  v.key === variant.key ? { ...v, sku: e.target.value } : v,
                                ),
                              )
                            }
                            placeholder="SKU (optionnel)"
                            className={inputClass}
                            aria-label={`SKU de la variante ${variants.indexOf(variant) + 1}`}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={variant.price}
                            onChange={(e) =>
                              setVariants((prev) =>
                                prev.map((v) =>
                                  v.key === variant.key ? { ...v, price: e.target.value } : v,
                                ),
                              )
                            }
                            placeholder={
                              basePrice.trim() !== ''
                                ? `Prix de base : ${Number(basePrice).toLocaleString('fr-FR')}`
                                : 'Prix de base'
                            }
                            className={inputClass}
                            aria-label={`Prix de la variante ${variants.indexOf(variant) + 1}`}
                          />
                          <p className="mt-1 text-xs text-gray-500">Laisser vide = prix de base.</p>
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={variant.stock}
                            onChange={(e) =>
                              setVariants((prev) =>
                                prev.map((v) =>
                                  v.key === variant.key ? { ...v, stock: e.target.value } : v,
                                ),
                              )
                            }
                            placeholder="Stock"
                            className={inputClass}
                            aria-label={`Stock de la variante ${variants.indexOf(variant) + 1}`}
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setVariants((prev) =>
                              prev.map((v) =>
                                v.key === variant.key ? { ...v, active: !v.active } : v,
                              ),
                            )
                          }
                          className={`text-sm font-medium ${
                            variant.active ? 'text-emerald-600' : 'text-gray-400'
                          }`}
                        >
                          {variant.active ? 'Actif' : 'Inactif'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setVariants((prev) => prev.filter((v) => v.key !== variant.key))
                          }
                          aria-label={`Supprimer la variante ${variant.name || ''}`}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    </li>
                    )
                  })}
                </ul>
              )}
              <button
                type="button"
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    {
                      key: nextVariantKey(),
                      name: '',
                      sku: '',
                      price: '',
                      stock: '0',
                      active: true,
                      imageUrl: null,
                    },
                  ])
                }
                disabled={variantLimitReached}
                title={variantLimitReached ? `Limite : ${plan.maxVariants} variantes max sur le plan gratuit` : undefined}
                className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-600"
              >
                <Plus size={16} />
                Ajouter une variante
              </button>
              <p className="text-xs text-gray-500">
                Avec des variantes, le prix et le stock du produit sont gérés par chaque variante
                (le prix peut rester vide : hérité du produit). Chaque variante peut avoir sa
                photo, affichée dans la fiche produit quand on la sélectionne.
                {plan.maxVariants !== null && (
                  <>
                    {' '}
                    <span className={variantLimitReached ? 'font-semibold text-amber-600' : ''}>
                      {variants.length} / {plan.maxVariants} variantes
                    </span>{' '}
                    sur le plan gratuit.
                  </>
                )}
              </p>
    </>
  )
}
