import { Calendar, Clock, Scissors } from 'lucide-react'
import { useActiveServices } from '@/features/services/useServices'
import { useTeamMembers } from '@/features/team/useTeamMembers'
import { useAppointments } from '@/features/appointments/useAppointments'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Shop } from '@/types'
import type { AppointmentsSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { TextStyleField } from '../components/TextStyleControls'

export function AppointmentsRenderer({
  shop,
  config,
  themeConfig,
}: { shop: Shop; config: AppointmentsSectionConfig; themeConfig: ThemeConfig; sectionId?: string }) {
  const { data: result } = useActiveServices({ shopId: shop.id, limit: 100 })
  const services = result?.services ?? []
  const { data: team } = useTeamMembers(shop.id)
  const { isLoading, isError } = useAppointments({ shopId: shop.id, date: new Date().toISOString().split('T')[0] })

  if (isLoading) return <Spinner />
  if (isError) return <div className="text-center py-8 text-red-600">Erreur de chargement du calendrier</div>

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0))
  const endOfDay = new Date(today.setHours(23, 59, 59, 999))

  const availableSlots = generateSlots(team ?? [], services, config.defaultDuration, startOfDay, endOfDay)

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-end justify-between border-b border-ink-900/10 pb-4">
        <div>
          <h2 className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}>
            {config.heading || 'Réserver un créneau'}
          </h2>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableSlots.map((slot) => (
          <button
            key={`${slot.teamMemberId}-${slot.start}`}
            className={`p-4 rounded-xl border-2 transition-all ${slot.available
              ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100'
              : 'border-red-200 bg-red-50 opacity-50 cursor-not-allowed'
            }`}
            disabled={!slot.available}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-[var(--shop-text)]">
                {slot.teamMemberName}
              </span>
              <span className={`text-sm font-medium ${slot.available ? 'text-emerald-700' : 'text-red-700'}`}>
                {slot.available ? 'Disponible' : 'Complet'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--shop-text)]/70">
              <Clock size={14} />
              <span>{formatTime(slot.start)} - {formatTime(slot.end)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--shop-text)]/70">
              <Scissors size={14} />
              <span>{slot.serviceName}</span>
            </div>
            {slot.available && (
              <button
                className="mt-3 w-full rounded-full bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
                onClick={() => handleBooking(slot)}
              >
                Réserver
              </button>
            )}
          </button>
        ))}
      </div>

      {availableSlots.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="Aucun créneau disponible aujourd'hui"
          description="Vérifiez la disponibilité de votre équipe et de vos services."
        />
      )}
    </section>
  )
}

function generateSlots(team: any[], services: any[], defaultDuration: number, start: Date, end: Date) {
  // Simplified slot generation - in reality this would check existing appointments
  const slots: any[] = []
  if (!team || !services) return slots

  const firstService = services[0]
  const firstMember = team[0]

  if (!firstService || !firstMember) return slots

  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()

  for (let m = startMinutes; m + defaultDuration <= endMinutes; m += defaultDuration) {
    const slotStart = new Date(start)
    slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + defaultDuration * 60000)

    slots.push({
      teamMemberId: firstMember.id,
      teamMemberName: firstMember.name,
      serviceName: firstService.name,
      serviceId: firstService.id,
      start: slotStart,
      end: slotEnd,
      available: true,
    })
  }

  return slots
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function handleBooking(slot: any) {
  // In reality this would open a booking modal
  alert(`Réservation pour ${slot.serviceName} avec ${slot.teamMemberName} à ${formatTime(slot.start)}`)
}

export function AppointmentsEditor({ config, onChange }: SectionEditorProps<AppointmentsSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = « Réserver un créneau ».</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={config.showTeam}
            onChange={(e) => onChange({ ...config, showTeam: e.target.checked })}
            className="accent-brand-600"
          />
          Afficher le membre de l'équipe
        </label>
      </div>
      <div>
        <label className={editorLabelClass}>Durée par défaut (minutes)</label>
        <input
          type="number"
          min={5}
          max={120}
          step={5}
          value={config.defaultDuration}
          onChange={(e) => onChange({ ...config, defaultDuration: Math.max(5, Math.min(120, Number(e.target.value) || 30)) })}
          className={editorInputClass}
        />
        <p className={`mt-1 ${editorHelpClass}`}>Durée standard d'un rendez-vous.</p>
      </div>
    </div>
  )
}