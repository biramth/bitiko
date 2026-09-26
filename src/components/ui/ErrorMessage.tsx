import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ErrorMessage({
  message = 'Une erreur est survenue. Réessayez plus tard.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle size={26} className="text-red-500" aria-hidden />
      </span>
      <p className="max-w-sm text-sm text-ink-700/70">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  )
}
