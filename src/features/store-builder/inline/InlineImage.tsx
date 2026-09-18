import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Wraps an image (or a whole banner block) with a hover-to-upload overlay
 *  in the live preview — matching the 5 Mo cap already enforced by every
 *  other image field in the builder (ImageSection, LookbookSection,
 *  block image editor). Renders `children` untouched when not editable. */
export function InlineImage({
  editable,
  onUpload,
  className,
  style,
  children,
  label = "Changer l'image",
}: {
  editable: boolean
  onUpload: (file: File) => Promise<void>
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!editable) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const resetInput = () => {
      if (inputRef.current) inputRef.current.value = ''
    }
    if (!file) return
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
      await onUpload(file)
    } catch {
      setError('L’envoi a échoué. Réessayez.')
    } finally {
      setUploading(false)
      resetInput()
    }
  }

  return (
    <div className={`group/img relative ${className ?? ''}`} style={style}>
      {children}
      <button
        type="button"
        title={label}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          inputRef.current?.click()
        }}
        disabled={uploading}
        className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity group-hover/img:bg-black/40 group-hover/img:opacity-100 focus-visible:opacity-100 focus-visible:bg-black/40"
      >
        <span className="flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-xs font-medium text-white">
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          {uploading ? 'Envoi…' : label}
        </span>
      </button>
      {error && (
        <p className="absolute inset-x-0 -bottom-6 z-20 text-center text-[11px] font-medium text-red-600">{error}</p>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
    </div>
  )
}
