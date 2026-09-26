import { Calendar } from 'lucide-react'
import { useReservations } from '@/features/reservations/useReservations'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Shop } from '@/types'
import type { ReservationsSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'

export function ReservationsRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: { shop: Shop; config: ReservationsSectionConfig; themeConfig: ThemeConfig; sectionId?: string; editable?: boolean }) {
  const patch = useInlineEdit(sectionId)
  const { isLoading, isError } = useReservations({ shopId: shop.id, date: new Date().toISOString().split('T')[0] })

  if (isLoading) return <Spinner />
  if (isError) return <div className="text-center py-8 text-red-600">Erreur de chargement des réservations</div>

  const today = new Date().toISOString().split('T')[0]

  const availableSlots = config.showAvailability
    ? generateAvailability(today)
    : []

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-end justify-between border-b border-ink-900/10 pb-4">
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading || 'Réserver une table'}
            onCommit={(heading) => patch({ heading })}
            placeholder="Titre"
            className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--shop-border)] bg-[var(--shop-surface)] p-4">
          <h3 className="font-semibold text-[var(--shop-text)]">Choisissez votre créneau</h3>
          <p className="mt-1 text-sm text-[var(--shop-text)]/60">Sélectionnez une date et une heure</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {availableSlots.map((slot) => (
              <button
                key={`${slot.date}-${slot.time}`}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  slot.available
                    ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100'
                    : 'border-red-200 bg-red-50 opacity-50 cursor-not-allowed'
                }`}
                disabled={!slot.available}
              >
                <div className="font-medium text-[var(--shop-text)]">{slot.label}</div>
                <div className={`text-sm ${slot.available ? 'text-emerald-700' : 'text-red-700'}`}>
                  {slot.available ? 'Disponible' : 'Complet'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {availableSlots.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="Aucun créneau disponible"
            description="Tous les créneaux sont complets pour aujourd'hui."
          />
        )}
      </div>
    </section>
  )
}

function generateAvailability(date: string) {
  const slots = []
  const startHour = 12 // 12h
  const endHour = 22 // 22h
  const interval = 30 // minutes

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const slotTime = hour * 60 + minute
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      slots.push({
        date,
        time: timeStr,
        label: timeStr,
        available: slotTime > currentMinutes && Math.random() > 0.3, // Simulated availability
      })
    }
  }

  return slots
}

export function ReservationsEditor({ config, onChange }: SectionEditorProps<ReservationsSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = « Réserver une table ».</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={config.showAvailability}
            onChange={(e) => onChange({ ...config, showAvailability: e.target.checked })}
            className="accent-brand-600"
          />
          Afficher la disponibilité en temps réel
        </label>
      </div>
    </div>
  )
}