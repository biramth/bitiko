import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImageOff, ImagePlus, Loader2 } from 'lucide-react'
import { uploadShopSectionImage } from '@/services/shop.service'
import type { ImageSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

export function ImageRenderer({ config }: { config: ImageSectionConfig }) {
  if (!config.imageUrl) return null

  const content = (
    <div className="aspect-[21/9] w-full overflow-hidden bg-sand-100" style={{ borderRadius: 'var(--shop-radius)' }}>
      <img src={config.imageUrl} alt={config.caption} className="h-full w-full object-cover" />
    </div>
  )

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-6 sm:px-6">
      {config.linkUrl ? <Link to={config.linkUrl}>{content}</Link> : content}
      {config.caption.trim() && <p className="mt-2 text-sm text-[var(--shop-text)]/60">{config.caption}</p>}
    </section>
  )
}

export function ImageEditor({ config, onChange, shopId, sectionId }: SectionEditorProps<ImageSectionConfig>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadShopSectionImage(shopId, sectionId, file)
      onChange({ ...config, imageUrl: url })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <span className={editorLabelClass}>Image</span>
        <div className="mt-1.5 aspect-[21/9] w-full overflow-hidden rounded-xl border border-gray-200 bg-sand-50">
          {config.imageUrl ? (
            <img src={config.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ImageOff size={28} aria-hidden />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {uploading ? 'Envoi…' : "Changer l'image"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
      <div>
        <label className={editorLabelClass}>Légende</label>
        <input
          value={config.caption}
          onChange={(e) => onChange({ ...config, caption: e.target.value })}
          className={editorInputClass}
        />
      </div>
      <div>
        <label className={editorLabelClass}>Lien (optionnel)</label>
        <input
          value={config.linkUrl}
          onChange={(e) => onChange({ ...config, linkUrl: e.target.value })}
          placeholder="/catalogue"
          className={editorInputClass}
        />
      </div>
    </div>
  )
}
