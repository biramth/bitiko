import { useRef } from 'react'
import { Crown, ImageIcon, Loader2, Palette, Plus, X } from 'lucide-react'

export function TileStyleFields({
  color,
  imageUrl,
  onColorChange,
  onFileSelected,
  onRemoveImage,
  uploading = false,
  isPro,
  availableColors,
  onLockedFeature,
}: {
  color: string | null
  imageUrl: string | null
  onColorChange: (color: string | null) => void
  onFileSelected: (file: File) => void
  onRemoveImage: () => void
  uploading?: boolean
  isPro: boolean
  availableColors: string[]
  onLockedFeature: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const currentColorNotAllowed = color != null && !availableColors.includes(color)

  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Palette size={14} aria-hidden /> Couleur de fond
          {!isPro && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              3 couleurs du thème
            </span>
          )}
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onColorChange(null)}
            title="Aucune couleur (thème par défaut)"
            aria-label="Aucune couleur de fond"
            className={`h-8 w-8 rounded-full border ${!color ? 'border-2 border-brand-500' : 'border-gray-200'}`}
            style={{
              background: 'repeating-conic-gradient(#ffffff 0% 25%, #d1d5db 0% 50%) 0 0 / 8px 8px',
            }}
          />
          {availableColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              aria-label={`Fond ${c}`}
              title={c}
              className={`h-8 w-8 rounded-full border ${color === c ? 'border-2 border-brand-500' : 'border-gray-200'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          {currentColorNotAllowed && (
            <button
              type="button"
              onClick={() => (isPro ? onColorChange(color) : onLockedFeature())}
              aria-label="Couleur appliquée actuellement"
              title="Couleur appliquée — disponible en version Pro"
              className={`h-8 w-8 rounded-full border ${isPro ? '' : 'cursor-not-allowed opacity-70'}`}
              style={{ backgroundColor: color ?? undefined }}
            />
          )}

          {isPro ? (
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              aria-label="Choisir une couleur personnalisée"
              title="Couleur personnalisée"
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold text-gray-500 hover:bg-gray-50 ${
                color && !availableColors.includes(color) ? 'border-2 border-brand-500' : 'border-gray-200'
              }`}
              style={color ? { backgroundColor: color } : undefined}
            >
              +
            </button>
          ) : (
            <button
              type="button"
              onClick={onLockedFeature}
              aria-label="Personnaliser la couleur de fond (offre payante)"
              title="Disponible avec une offre payante"
              className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50"
            >
              <Crown size={12} className="text-amber-500" aria-hidden /> Couleur sur mesure
            </button>
          )}
          <input
            ref={colorInputRef}
            type="color"
            value={color ?? '#1C1917'}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-0 w-0 overflow-hidden border-0 p-0"
            aria-hidden
            tabIndex={-1}
          />
        </div>
        {!isPro && (
          <p className="mt-1 text-xs text-gray-500">
            Couleurs issues des couleurs de votre boutique (titres, accent et arrière-plan).
          </p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <ImageIcon size={14} aria-hidden /> Image de couverture
          {isPro && <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            <Crown size={10} aria-hidden /> Essentiel+
          </span>}
        </label>

        {isPro ? (
          <>
            {imageUrl ? (
              <div className="relative mt-2 inline-block">
                <img src={imageUrl} alt="" className="h-24 w-40 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={onRemoveImage}
                  disabled={uploading}
                  aria-label="Retirer l'image de couverture"
                  className="absolute -right-2 -top-2 rounded-full border border-gray-200 bg-white p-1 text-gray-500 shadow-sm hover:text-red-600 disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} aria-hidden />}
                {uploading ? 'Téléchargement…' : 'Ajouter une image'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onFileSelected(file)
                e.target.value = ''
              }}
            />
            <p className="mt-1 text-xs text-gray-500">
              Idéalement 800 × 600. L'image remplace la couleur de fond sur la tuile de la boutique.
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={onLockedFeature}
            className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-left transition-colors hover:bg-gray-100"
          >
            <span className="flex items-center gap-2 text-sm text-gray-500">
              <Crown size={16} className="text-amber-500" aria-hidden />
              Les images de couverture sont disponibles avec Essentiel ou Pro.
            </span>
            <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
              Voir les offres
            </span>
          </button>
        )}
      </div>
    </div>
  )
}