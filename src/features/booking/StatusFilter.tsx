import { BOOKING_STATUS_ORDER, type BookingStatus } from './bookingStatus'

/** Filtre par statut avec compteurs : « Tous 5 · À confirmer 2 · … ». Les statuts
 *  sans élément sont masqués pour ne pas alourdir la barre. */
export function StatusFilter({
  value,
  onChange,
  counts,
  labels,
}: {
  value: BookingStatus | 'all'
  onChange: (value: BookingStatus | 'all') => void
  counts: Record<string, number>
  labels: Record<BookingStatus, string>
}) {
  const tabs: { key: BookingStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Tous' },
    ...BOOKING_STATUS_ORDER.filter((status) => (counts[status] ?? 0) > 0).map((status) => ({
      key: status,
      label: labels[status],
    })),
  ]
  return (
    <div role="tablist" aria-label="Filtrer par statut" className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const active = tab.key === value
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'bg-ink-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${active ? 'text-white/70' : 'text-gray-400'}`}>{counts[tab.key] ?? 0}</span>
          </button>
        )
      })}
    </div>
  )
}
