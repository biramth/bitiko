import { AlertTriangle } from 'lucide-react'

export function ErrorMessage({ message = 'Une erreur est survenue. Réessayez plus tard.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <AlertTriangle size={32} className="text-red-400" aria-hidden />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  )
}
