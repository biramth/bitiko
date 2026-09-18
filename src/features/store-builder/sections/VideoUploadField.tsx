import { useRef, useState } from 'react'
import { Film, Loader2, Trash2 } from 'lucide-react'
import { readVideoDuration } from '@/utils/video'
import { editorLabelClass } from './shared'

const MAX_VIDEO_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_DURATION_SECONDS = 20

/** Shared upload control for the optional background video on Image/Hero
 *  sections — enforces a size cap (bandwidth matters for the shops' own
 *  customers) and a duration cap (this is a short looping background, not a
 *  video player) client-side before ever uploading, the same way the image
 *  fields already cap file size. */
export function VideoUploadField({
  videoUrl,
  onUpload,
  onRemove,
  label = 'Vidéo de fond (optionnel)',
  helpText = "Remplace l'image ci-dessus, qui reste utilisée en attendant que la vidéo charge.",
}: {
  videoUrl: string | undefined
  onUpload: (file: File) => Promise<void>
  onRemove: () => void
  label?: string
  helpText?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const resetInput = () => {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    if (!file.type.startsWith('video/')) {
      setError('Ce fichier n’est pas une vidéo.')
      resetInput()
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Vidéo trop lourde (${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))} Mo maximum).`)
      resetInput()
      return
    }

    setError(null)
    setUploading(true)
    try {
      const duration = await readVideoDuration(file)
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        setError(`Vidéo trop longue (${MAX_VIDEO_DURATION_SECONDS} secondes maximum).`)
        return
      }
      await onUpload(file)
    } catch {
      setError('L’envoi a échoué. Vérifiez votre connexion et réessayez.')
    } finally {
      setUploading(false)
      resetInput()
    }
  }

  return (
    <div className="border-t border-gray-200 pt-3">
      <label className={editorLabelClass}>{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
          {uploading ? 'Envoi…' : videoUrl ? 'Changer la vidéo' : 'Ajouter une vidéo'}
        </button>
        {videoUrl && (
          <button
            type="button"
            onClick={onRemove}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <Trash2 size={14} /> Retirer
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-gray-400">
        {helpText} {Math.round(MAX_VIDEO_BYTES / (1024 * 1024))} Mo et {MAX_VIDEO_DURATION_SECONDS} secondes maximum.
      </p>
      <input ref={fileInputRef} type="file" accept="video/mp4,video/webm" onChange={handleFileChange} className="hidden" />
    </div>
  )
}
