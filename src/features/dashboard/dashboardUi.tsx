import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

export type DashboardAccent = 'emerald' | 'sky' | 'brand' | 'ink' | 'violet' | 'amber'

const ACCENTS: Record<DashboardAccent, { pill: string }> = {
  emerald: { pill: 'bg-emerald-100 text-emerald-700' },
  sky: { pill: 'bg-sky-100 text-sky-700' },
  brand: { pill: 'bg-brand-100 text-brand-700' },
  ink: { pill: 'bg-ink-900/[0.06] text-ink-800' },
  violet: { pill: 'bg-violet-100 text-violet-700' },
  amber: { pill: 'bg-amber-100 text-amber-800' },
}

export function DashboardKpi({
  icon: Icon,
  label,
  value,
  hint,
  to,
  accent = 'ink',
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  to?: string
  accent?: DashboardAccent
}) {
  const body = (
    <div className="group h-full rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-px hover:border-brand-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${ACCENTS[accent].pill}`}>
          <Icon size={17} aria-hidden />
        </span>
        {to && (
          <ChevronRight
            size={16}
            aria-hidden
            className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500"
          />
        )}
      </div>
      <p className="mt-3 text-[13px] font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 break-words text-[22px] font-bold leading-tight tracking-tight text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : <p className="mt-1 min-h-4" aria-hidden />}
    </div>
  )
  return to ? (
    <Link to={to} className="block min-w-0 rounded-2xl focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    <div className="min-w-0">{body}</div>
  )
}

export function DashboardSectionHeader({
  icon: Icon,
  title,
  count,
  countTone = 'neutral',
  actionTo,
  actionLabel,
  accent = 'ink',
}: {
  icon: LucideIcon
  title: string
  count?: number
  countTone?: 'neutral' | 'warning' | 'danger' | 'brand'
  actionTo?: string
  actionLabel?: string
  accent?: DashboardAccent
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex min-w-0 items-center gap-2.5 text-[15px] font-semibold text-gray-900">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACCENTS[accent].pill}`}>
          <Icon size={16} aria-hidden />
        </span>
        <span className="truncate">{title}</span>
        {typeof count === 'number' && count > 0 && <Badge tone={countTone}>{count}</Badge>}
      </h3>
      {actionTo && actionLabel && (
        <Link
          to={actionTo}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
        >
          {actionLabel} <ChevronRight size={14} aria-hidden />
        </Link>
      )}
    </div>
  )
}

export function DashboardOkNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <CheckCircle2 size={18} className="mt-px shrink-0 text-emerald-600" aria-hidden />
      <span className="min-w-0">{children}</span>
    </div>
  )
}

export function DashboardIdleNotice({
  message,
  action,
}: {
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-5 text-center">
      <p className="text-sm text-gray-500">{message}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  )
}
