import { CheckCircle2 } from 'lucide-react'
import { formatSlotTime } from './bookingUtils'

export function SlotGrid({
  slots,
  timeZone,
  value,
  onChange,
}: {
  slots: string[]
  timeZone: string
  value: string
  onChange: (slot: string) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" role="radiogroup" aria-label="Créneaux disponibles">
      {slots.map((slot) => {
        const selected = slot === value
        return (
          <button
            key={slot}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(slot)}
            style={{ borderRadius: 'var(--shop-radius)' }}
            className={`border px-2 py-2 text-sm font-medium transition-colors ${
              selected
                ? 'border-[var(--shop-button)] bg-[var(--shop-button)] text-[var(--shop-button-text)]'
                : 'border-[var(--shop-text)]/20 text-[var(--shop-text)] hover:border-[var(--shop-text)]/60'
            }`}
          >
            {formatSlotTime(slot, timeZone)}
          </button>
        )
      })}
    </div>
  )
}

export function BookingSuccess({ title, detail, onReset }: { title: string; detail: string; onReset: () => void }) {
  return (
    <div
      role="status"
      style={{ borderRadius: 'var(--shop-radius)' }}
      className="border border-emerald-300 bg-emerald-50 p-6 text-center text-emerald-900"
    >
      <CheckCircle2 className="mx-auto mb-2" size={28} aria-hidden />
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm">{detail}</p>
      <button type="button" onClick={onReset} className="mt-4 text-sm font-medium underline underline-offset-2">
        Faire une autre demande
      </button>
    </div>
  )
}
