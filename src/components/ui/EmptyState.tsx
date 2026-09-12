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
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Icon size={40} className="text-gray-300" aria-hidden />
      <p className="font-medium text-gray-700">{title}</p>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  )
}
