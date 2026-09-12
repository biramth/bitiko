import { Loader2 } from 'lucide-react'

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
      <Loader2 size={18} className="animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
