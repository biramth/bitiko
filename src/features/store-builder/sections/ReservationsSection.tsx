import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { BookingSuccess, SlotGrid } from '@/features/booking/bookingUi'
import {
  bookingDateBounds,
  bookingInputClass,
  bookingLabelClass,
  formatSlotTime,
  useShopBookingSettings,
} from '@/features/booking/bookingUtils'
import { Spinner } from '@/components/ui/Spinner'
import { createReservation, getReservationSlots } from '@/services/reservation.service'
import { bookingErrorMessage } from '@/services/bookingSettings.service'
import { kickAutomations, notifyBooking } from '@/services/bookingNotify.service'
import { PHONE_ERROR_MESSAGES, normalizePhoneNumber } from '@/utils/phone'
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
  const { data: settings } = useShopBookingSettings(shop.id)
  const timeZone = settings?.timezone ?? 'Africa/Dakar'
  const bounds = bookingDateBounds(settings?.max_days_ahead ?? 60)

  const [partySize, setPartySize] = useState('2')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [booked, setBooked] = useState<{ slot: string; party: number } | null>(null)

  const party = Math.max(1, Math.min(100, Number(partySize) || 1))

  const { data: slots = [], isFetching: slotsLoading, isError: slotsError } = useQuery({
    queryKey: ['reservation-slots', shop.id, party, date],
    queryFn: () => getReservationSlots({ shopId: shop.id, partySize: party, date }),
    enabled: !!date,
    staleTime: 30 * 1000,
  })

  const bookMutation = useMutation({
    mutationFn: async () => {
      const normalized = normalizePhoneNumber(phone, settings?.country_code)
      if (!normalized.ok || !normalized.value) {
        throw new Error(PHONE_ERROR_MESSAGES[normalized.error ?? 'invalid_length'])
      }
      return createReservation({
        shopId: shop.id,
        customerName: name.trim(),
        customerPhone: normalized.value,
        partySize: party,
        startAt: slot,
      })
    },
    onSuccess: (reservation) => {
      setBooked({ slot: reservation.start_at, party: reservation.party_size })
      void notifyBooking('reservation', reservation.id)
      void kickAutomations(shop.id)
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

  const canSubmit = !!slot && name.trim().length > 0 && phone.trim().length > 0 && !bookMutation.isPending && !editable

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

      {booked ? (
        <BookingSuccess
          title="Demande envoyée !"
          detail={`Table pour ${booked.party} — ${new Date(booked.slot).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone })} à ${formatSlotTime(booked.slot, timeZone)}. Vous serez contacté·e pour confirmation.`}
          onReset={reset}
        />
      ) : (
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
              <label htmlFor="resa-party" className={bookingLabelClass}>Couverts</label>
              <input
                id="resa-party"
                type="number"
                min={1}
                max={100}
                value={partySize}
                onChange={(e) => {
                  setPartySize(e.target.value)
                  setSlot('')
                }}
                style={{ borderRadius: 'var(--shop-radius)' }}
                className={bookingInputClass}
              />
            </div>
            <div>
              <label htmlFor="resa-date" className={bookingLabelClass}>Jour</label>
              <input
                id="resa-date"
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

          {date && (
            <div>
              <p className={bookingLabelClass}>{config.showAvailability ? 'Créneaux disponibles' : 'Horaires'}</p>
              {slotsLoading && <Spinner />}
              {slotsError && <p className="text-sm text-red-600">Impossible de charger les créneaux.</p>}
              {!slotsLoading && !slotsError && slots.length === 0 && (
                <p className="text-sm text-[var(--shop-text)]/60">Aucune table disponible ce jour-là. Essayez une autre date ou moins de couverts.</p>
              )}
              {!slotsLoading && slots.length > 0 && <SlotGrid slots={slots} timeZone={timeZone} value={slot} onChange={setSlot} />}
            </div>
          )}

          {slot && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="resa-name" className={bookingLabelClass}>Votre nom</label>
                <input
                  id="resa-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  style={{ borderRadius: 'var(--shop-radius)' }}
                  className={bookingInputClass}
                />
              </div>
              <div>
                <label htmlFor="resa-phone" className={bookingLabelClass}>Téléphone</label>
                <input
                  id="resa-phone"
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
            {bookMutation.isPending ? 'Envoi…' : editable ? 'Aperçu — réservation désactivée' : 'Demander cette table'}
          </button>
        </form>
      )}
    </section>
  )
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
          Titrer la liste « Créneaux disponibles »
        </label>
        <p className={`mt-1 ${editorHelpClass}`}>
          Les créneaux affichés sont toujours les places réellement libres. Horaires et capacité : Réservations → Horaires de réservation.
        </p>
      </div>
    </div>
  )
}
