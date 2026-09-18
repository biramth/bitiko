import { useRef, useState } from 'react'
import { ImageOff, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react'
import { uploadShopSectionImage } from '@/services/shop.service'
import { createSectionId } from '@/config/defaultLayout'
import type { LookbookImage, LookbookLayout, LookbookSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Mode-only editorial photo grid — the pilot template-specific section that
 *  proves the registry seam (see effectiveRegistry.ts / templateSections.ts):
 *  it's only ever wired into a Mode template's registry, so it never shows
 *  up in another vertical's "add block" menu or edits. */
export function LookbookRenderer({ config, themeConfig, sectionId, editable = false }: { config: LookbookSectionConfig; themeConfig: ThemeConfig; sectionId?: string; editable?: boolean }) {
  const patch = useInlineEdit(sectionId)
  const images = config.images.filter((img) => img.imageUrl)
  if (images.length === 0) return null

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6">
      {(config.heading.trim() || editable) && (
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading}
            onCommit={(heading) => patch({ heading })}
            placeholder="Titre"
            className={`mb-6 font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
      )}
      {(config.layout ?? 'grid') === 'masonry' ? (
        <div className="columns-2 gap-3 md:columns-3">
          {images.map((img, i) => (
            <figure key={img.id} className="mb-3 break-inside-avoid">
              <div
                className={`w-full overflow-hidden bg-sand-100 ${i % 2 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}
                style={{ borderRadius: 'var(--shop-radius)' }}
              >
                <img src={img.imageUrl!} alt={img.caption} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </div>
              {img.caption.trim() && <figcaption className="mt-2 text-xs text-[var(--shop-text)]/60" style={resolveTextStyle(config.captionStyle)}>{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {images.map((img, i) => (
            <figure key={img.id} className={i === 0 ? 'col-span-2 sm:col-span-1 sm:row-span-2' : ''}>
              <div
                className={`w-full overflow-hidden bg-sand-100 ${i === 0 ? 'aspect-[4/5] sm:aspect-[3/4]' : 'aspect-square'}`}
                style={{ borderRadius: 'var(--shop-radius)' }}
              >
                <img src={img.imageUrl!} alt={img.caption} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </div>
              {img.caption.trim() && <figcaption className="mt-2 text-xs text-[var(--shop-text)]/60" style={resolveTextStyle(config.captionStyle)}>{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}

function LookbookImageSlot({
  image,
  shopId,
  sectionId,
  onChange,
  onRemove,
}: {
  image: LookbookImage
  shopId: string
  sectionId: string
  onChange: (next: LookbookImage) => void
  onRemove: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Ce fichier n’est pas une image.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image trop lourde (5 Mo maximum).')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setError(null)
    setUploading(true)
    try {
      const url = await uploadShopSectionImage(shopId, sectionId, file, image.id)
      onChange({ ...image, imageUrl: url })
    } catch {
      setError('L’envoi a échoué. Vérifiez votre connexion et réessayez.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex gap-3 rounded-lg border border-gray-200 p-3">
      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-sand-50">
        {image.imageUrl ? (
          <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageOff size={20} aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input
          value={image.caption}
          onChange={(e) => onChange({ ...image, caption: e.target.value })}
          placeholder="Légende (optionnel)"
          className={editorInputClass}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            {uploading ? 'Envoi…' : image.imageUrl ? 'Changer' : 'Choisir une photo'}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={uploading}
            aria-label="Supprimer cette photo"
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  )
}

const LOOKBOOK_LAYOUTS: { value: LookbookLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'grid',
    label: 'Grille',
    preview: (
      <SwatchFrame className="gap-1">
        <SwatchBlock className="h-full w-1/3" />
        <span className="flex w-2/3 flex-wrap content-between gap-1">
          <SwatchBlock className="h-[45%] w-[45%]" />
          <SwatchBlock className="h-[45%] w-[45%]" />
          <SwatchBlock className="h-[45%] w-[45%]" />
          <SwatchBlock className="h-[45%] w-[45%]" />
        </span>
      </SwatchFrame>
    ),
  },
  {
    value: 'masonry',
    label: 'Mosaïque',
    preview: (
      <SwatchFrame className="gap-1">
        <span className="flex w-1/2 flex-col gap-1">
          <SwatchBlock className="h-2/3 w-full" />
          <SwatchBlock className="h-1/3 w-full" />
        </span>
        <span className="flex w-1/2 flex-col gap-1">
          <SwatchBlock className="h-1/3 w-full" />
          <SwatchBlock className="h-2/3 w-full" />
        </span>
      </SwatchFrame>
    ),
  },
]

export function LookbookEditor({ config, onChange, shopId, sectionId }: SectionEditorProps<LookbookSectionConfig>) {
  const updateImage = (id: string, next: LookbookImage) => {
    onChange({ ...config, images: config.images.map((img) => (img.id === id ? next : img)) })
  }
  const removeImage = (id: string) => {
    onChange({ ...config, images: config.images.filter((img) => img.id !== id) })
  }
  const addImage = () => {
    onChange({ ...config, images: [...config.images, { id: createSectionId('lookbook-img'), imageUrl: null, caption: '' }] })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre (optionnel)</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = aucun titre affiché.</p>
        <TextStyleField label="Style du titre" value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={2}
            value={config.layout ?? 'grid'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={LOOKBOOK_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>« Mosaïque » range les photos en colonnes, avec des hauteurs variées.</p>
      </div>
      <div>
        <span className={editorLabelClass}>Photos</span>
        <div className="mt-1.5 space-y-2">
          {config.images.map((image) => (
            <LookbookImageSlot
              key={image.id}
              image={image}
              shopId={shopId}
              sectionId={sectionId}
              onChange={(next) => updateImage(image.id, next)}
              onRemove={() => removeImage(image.id)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addImage}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700"
        >
          <Plus size={14} aria-hidden /> Ajouter une photo
        </button>
        <p className={`mt-1 ${editorHelpClass}`}>En disposition « Grille », la première photo occupe une case plus grande.</p>
        <TextStyleField label="Style des légendes" value={config.captionStyle} onChange={(captionStyle) => onChange({ ...config, captionStyle })} />
      </div>
    </div>
  )
}
