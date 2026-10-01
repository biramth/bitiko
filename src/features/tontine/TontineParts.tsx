import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { STATE_LABELS, type MemberState } from './schedule'

const STATE_TONES: Record<MemberState, BadgeTone> = {
  settled: 'neutral',
  complete: 'success',
  late: 'warning',
  on_track: 'info',
}

const BAR_COLORS: Record<MemberState, string> = {
  settled: 'bg-gray-400',
  complete: 'bg-emerald-500',
  late: 'bg-amber-500',
  on_track: 'bg-brand-500',
}

export function StateBadge({ state }: { state: MemberState }) {
  return <Badge tone={STATE_TONES[state]}>{STATE_LABELS[state]}</Badge>
}

export function ProgressBar({ percent, state }: { percent: number; state: MemberState }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all ${BAR_COLORS[state]}`} style={{ width: `${percent}%` }} />
    </div>
  )
}
