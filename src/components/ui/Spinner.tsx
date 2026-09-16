export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-ink-700/60">
      <span className="relative inline-flex h-5 w-5" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-2 border-brand-200" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand-500" />
      </span>
      <span>{label}</span>
    </div>
  )
}