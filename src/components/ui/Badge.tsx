export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-800',
  brand: 'bg-brand-100 text-brand-800',
}

export function Badge({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
