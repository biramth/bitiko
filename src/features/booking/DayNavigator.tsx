import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { localDateIso } from '@/utils/format'
import { addDays, formatLongDate, relativeDayLabel } from './bookingHelpers'

/** Sélecteur de journée : ‹ jour › + « Aujourd'hui » + calendrier. Remplace un
 *  champ date nu : on voit tout de suite de quel jour on parle et on avance
 *  d'un clic. */
export function DayNavigator({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const today = localDateIso()
  const relative = relativeDayLabel(date, today)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => onChange(addDays(date, -1))}
          aria-label="Jour précédent"
          className="rounded-l-xl p-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div className="min-w-44 px-2 text-center" aria-live="polite">
          <p className="text-sm font-semibold text-gray-900 first-letter:uppercase">{formatLongDate(date)}</p>
          {relative && <p className="text-xs font-medium text-brand-700">{relative}</p>}
        </div>
        <button
          type="button"
          onClick={() => onChange(addDays(date, 1))}
          aria-label="Jour suivant"
          className="rounded-r-xl p-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      {date !== today && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Aujourd’hui
        </button>
      )}

      <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
        <CalendarDays size={16} aria-hidden />
        Choisir une date
        <input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value || today)}
          aria-label="Choisir une date"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
