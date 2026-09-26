import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import { useActiveServices } from '@/features/services/useServices'
import { useTeamMembers } from '@/features/team/useTeamMembers'
import { BookingSuccess, SlotGrid } from '@/features/booking/bookingUi'
import {
  bookingDateBounds,
  bookingInputClass,
  bookingLabelClass,
  formatSlotTime,
  useShopBookingSettings,
} from '@/features/booking/bookingUtils'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { createAppointment, getBookingSlots } from '@/services/appointment.service'
import { bookingErrorMessage } from '@/services/bookingSettings.service'
import { notifyBooking } from '@/services/bookingNotify.service'
import { formatCurrency } from '@/utils/format'
import { PHONE_ERROR_MESSAGES, normalizePhoneNumber } from '@/utils/phone'
import type { Shop } from '@/types'
import type { AppointmentsSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'

export function AppointmentsRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: { shop: Shop; config: AppointmentsSectionConfig; themeConfig: ThemeConfig; sectionId?: string; editable?: boolean }) {
  const patch = useInlineEdit(sectionId)
  const { data: servicesResult, isLoading: servicesLoading } = useActiveServices({ shopId: shop.id, limit: 100 })
  const services = servicesResult?.services ?? []
  const { data: team = [] } = useTeamMembers(shop.id)
  const { data: settings } = useShopBookingSettings(shop.id)
  const timeZone = settings?.timezone ?? 'Africa/Dakar'
  const bounds = bookingDateBounds(settings?.max_days_ahead ?? 60)

  const [serviceId, setServiceId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [booked, setBooked] = useState<{ slot: string; service: string } | null>(null)

  const selectedService = services.find((s) => s.id === serviceId)

  const { data: slots = [], isFetching: slotsLoading, isError: slotsError } = useQuery({
    queryKey: ['booking-slots', shop.id, serviceId, memberId, date],
    queryFn: () => getBookingSlots({ shopId: shop.id, serviceId, teamMemberId: memberId || null, date }),
    enabled: !!serviceId && !!date,
    staleTime: 30 * 1000,
  })

  const bookMutation = useMutation({
    mutationFn: async () => {
      const normalized = normalizePhoneNumber(phone)
      if (!normalized.ok || !normalized.value) {
        throw new Error(PHONE_ERROR_MESSAGES[normalized.error ?? 'invalid_length'])
      }
      return createAppointment({
        shopId: shop.id,
        serviceId,
        teamMemberId: memberId || null,
        customerName: name.trim(),
        customerPhone: normalized.value,
        startAt: slot,
      })
    },
    onSuccess: (appointment) => {
      setBooked({ slot: appointment.start_at, service: selectedService?.name ?? 'Prestation' })
      void notifyBooking('appointment', appointment.id)
    },
    onError: (e) => setError(bookingErrorMessage(e)),
  })

  const reset = () => {
    setBooked(null)
    setSlot('')
    setName('')
    setPhone('')
    setError(null)
  }

  const canSubmit = !!serviceId && !!slot && name.trim().length > 0 && phone.trim().length > 0 && !bookMutation.isPending && !editable

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-end justify-between border-b border-ink-900/10 pb-4">
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading || 'Réserver un créneau'}
            onCommit={(heading) => patch({ heading })}
            placeholder="Titre"
            className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
      </div>

      {servicesLoading && <Spinner />}
      {!servicesLoading && services.length === 0 && (
        <EmptyState icon={Calendar} title="Réservation bientôt disponible" description="Aucune prestation n'est encore proposée à la réservation." />
      )}

      {!servicesLoading && services.length > 0 && booked && (
        <BookingSuccess
          title="Demande envoyée !"
          detail={`${booked.service} — ${new Date(booked.slot).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone })} à ${formatSlotTime(booked.slot, timeZone)}. Vous serez contacté·e pour confirmation.`}
          onReset={reset}
        />
      )}

      {!servicesLoading && services.length > 0 && !booked && (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            setError(null)
            bookMutation.mutate()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="book-service" className={bookingLabelClass}>Prestation</label>
              <select
                id="book-service"
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value)
                  setSlot('')
                }}
                style={{ borderRadius: 'var(--shop-radius)' }}
                className={bookingInputClass}
              >
                <option value="">Choisir…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.duration} min · {formatCurrency(s.price, shop.currency)}
                  </option>
                ))}
              </select>
            </div>
            {config.showTeam && team.length > 0 && (
              <div>
                <label htmlFor="book-member" className={bookingLabelClass}>Avec</label>
                <select
                  id="book-member"
                  value={memberId}
                  onChange={(e) => {
                    setMemberId(e.target.value)
                    setSlot('')
                  }}
                  style={{ borderRadius: 'var(--shop-radius)' }}
                  className={bookingInputClass}
                >
                  <option value="">Sans préférence</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="book-date" className={bookingLabelClass}>Jour</label>
              <input
                id="book-date"
                type="date"
                min={bounds.min}
                max={bounds.max}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setSlot('')
                }}
                style={{ borderRadius: 'var(--shop-radius)' }}
                className={bookingInputClass}
              />
            </div>
          </div>

          {serviceId && date && (
            <div>
              <p className={bookingLabelClass}>Créneaux disponibles</p>
              {slotsLoading && <Spinner />}
              {slotsError && <p className="text-sm text-red-600">Impossible de charger les créneaux.</p>}
              {!slotsLoading && !slotsError && slots.length === 0 && (
                <p className="text-sm text-[var(--shop-text)]/60">Aucun créneau ce jour-là. Essayez une autre date.</p>
              )}
              {!slotsLoading && slots.length > 0 && <SlotGrid slots={slots} timeZone={timeZone} value={slot} onChange={setSlot} />}
            </div>
          )}

          {slot && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="book-name" className={bookingLabelClass}>Votre nom</label>
                <input
                  id="book-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  style={{ borderRadius: 'var(--shop-radius)' }}
                  className={bookingInputClass}
                />
              </div>
              <div>
                <label htmlFor="book-phone" className={bookingLabelClass}>Téléphone</label>
                <input
                  id="book-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="77 123 45 67"
                  style={{ borderRadius: 'var(--shop-radius)' }}
                  className={bookingInputClass}
                />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{ borderRadius: 'var(--shop-radius)' }}
            className="bg-[var(--shop-button)] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-[var(--shop-button-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bookMutation.isPending ? 'Envoi…' : editable ? 'Aperçu — réservation désactivée' : 'Demander ce créneau'}
          </button>
        </form>
      )}
    </section>
  )
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
          Laisser choisir le membre de l'équipe
        </label>
      </div>
      <p className={editorHelpClass}>
        Les durées viennent des prestations ; les horaires, jours d'ouverture et l'horizon se règlent dans
        Rendez-vous → Horaires de réservation.
      </p>
    </div>
  )
}
