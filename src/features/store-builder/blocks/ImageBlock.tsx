import { useRef, useState } from 'react'
import { ImageOff, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { uploadShopSectionImage } from '@/services/shop.service'
import type { FlexibleImageBlock } from '@/types/builder'
import { editorLabelClass } from '../sections/shared'
import { FocalPointPicker } from '../sections/FocalPointPicker'
import type { BlockEditorProps, BlockRendererProps } from '../blockRegistry'
import { InlineText } from '../inline/InlineText'
import { InlineImage } from '../inline/InlineImage'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function ImageBlockRenderer({ block, editable = false, onChange, shopId, sectionId }: BlockRendererProps<FlexibleImageBlock>) {
  if (!block.imageUrl && !editable) return null
  return (
    <figure>
      <InlineImage
        editable={editable}
        onUpload={async (file) => {
          if (!shopId || !sectionId) return
          const url = await uploadShopSectionImage(shopId, sectionId, file, block.id)
          onChange?.({ ...block, imageUrl: url })
        }}
        className="aspect-[21/9] w-full overflow-hidden bg-sand-100"
        style={{ borderRadius: 'var(--shop-radius)' }}
      >
        {block.imageUrl ? (
          <img
            src={block.imageUrl}
            alt={block.caption}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={{ objectPosition: `${block.focalX ?? 50}% ${block.focalY ?? 50}%` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--shop-text)]/30">
            <ImageOff size={24} aria-hidden />
          </div>
        )}
      </InlineImage>
      {(block.caption.trim() || editable) && (
        <InlineText
          as="figcaption"
          editable={editable}
          value={block.caption}
          onCommit={(caption) => onChange?.({ ...block, caption })}
          placeholder="Légende (optionnel)"
          className="mt-2 text-sm text-[var(--shop-text)]/60"
          label="Légende"
        />
      )}
    </figure>
  )
}

export function ImageBlockEditor({ block, onChange, shopId, sectionId }: BlockEditorProps<FlexibleImageBlock>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const resetInput = () => {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    if (!file.type.startsWith('image/')) {
      setError('Ce fichier n’est pas une image.')
      resetInput()
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image trop lourde (5 Mo maximum).')
      resetInput()
      return
    }
    setError(null)
    setUploading(true)
    try {
      const url = await uploadShopSectionImage(shopId, sectionId, file, block.id)
      onChange({ ...block, imageUrl: url })
    } catch {
      setError('L’envoi a échoué. Vérifiez votre connexion et réessayez.')
    } finally {
      setUploading(false)
      resetInput()
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <span className={editorLabelClass}>Image</span>
        {block.imageUrl ? (
          <div className="mt-1.5">
            <FocalPointPicker
              imageUrl={block.imageUrl}
              focalX={block.focalX ?? 50}
              focalY={block.focalY ?? 50}
              onChange={(focalX, focalY) => onChange({ ...block, focalX, focalY })}
            />
          </div>
        ) : (
          <div className="mt-1.5 flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-sand-50 text-gray-300">
            <ImageOff size={24} aria-hidden />
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            {uploading ? 'Envoi…' : "Changer l'image"}
          </button>
          {block.imageUrl && (
            <button
              type="button"
              onClick={() => onChange({ ...block, imageUrl: null })}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
            >
              <Trash2 size={14} /> Retirer
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
      <div>
        <label className={editorLabelClass}>Légende (optionnel)</label>
        <input
          value={block.caption}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
        />
      </div>
    </div>
  )
}
