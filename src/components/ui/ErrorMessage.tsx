import { AlertTriangle } from 'lucide-react'

export function ErrorMessage({ message = 'Une erreur est survenue. Réessayez plus tard.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle size={26} className="text-red-500" aria-hidden />
      </span>
      <p className="text-sm text-ink-700/70">{message}</p>
    </div>
  )
}
