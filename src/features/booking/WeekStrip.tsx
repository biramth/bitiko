import { localDateIso } from '@/utils/format'
import { addDays, startOfWeek, type DayCount } from './bookingHelpers'

/** Bandeau de la semaine : 7 jours cliquables avec le nombre de rendez-vous (et
 *  un point orange s'il y en a à confirmer). Permet de voir d'un coup d'œil les
 *  jours chargés sans ouvrir chaque journée. */
export function WeekStrip({
  date,
  onChange,
  counts,
  unit,
  isClosed,
}: {
  date: string
  onChange: (date: string) => void
  counts: Record<string, DayCount>
  /** Nom au singulier de ce qu'on compte (« rendez-vous », « réservation »). */
  unit: string
  /** Jour fermé selon les horaires de réservation : affiché grisé. */
  isClosed?: (iso: string) => boolean
}) {
  const monday = startOfWeek(date)
  const today = localDateIso()
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  return (
    <div role="group" aria-label="Semaine" className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const [year, month, dayNumber] = day.split('-').map(Number)
        const weekday = new Date(year, month - 1, dayNumber).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
        const count = counts[day]
        const selected = day === date
        const isToday = day === today
        const closed = isClosed?.(day) ?? false
        return (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            aria-pressed={selected}
            aria-label={`${weekday} ${dayNumber} : ${count?.total ?? 0} ${unit}${(count?.total ?? 0) > 1 ? 's' : ''}${count?.pending ? `, dont ${count.pending} à confirmer` : ''}`}
            className={`relative flex flex-col items-center rounded-xl px-1 py-2 text-center transition-colors ${
              selected ? 'bg-ink-900 text-white' : closed ? 'bg-gray-50 text-gray-400 ring-1 ring-gray-100 hover:bg-gray-100' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className={`text-[11px] font-medium uppercase ${selected ? 'text-white/70' : 'text-gray-400'}`}>{weekday}</span>
            <span className={`text-base font-semibold ${isToday && !selected ? 'text-brand-700' : ''}`}>{dayNumber}</span>
            <span className={`mt-0.5 h-4 text-[11px] font-medium ${selected ? 'text-white/80' : 'text-gray-500'}`}>
              {count?.total ? count.total : closed ? 'fermé' : ''}
            </span>
            {count?.pending ? (
              <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
