import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sand-100">
        <Icon size={28} className="text-brand-500" aria-hidden />
      </span>
      <p className="font-heading font-semibold text-ink-900">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-700/60">{description}</p>}
    </div>
  )
}
