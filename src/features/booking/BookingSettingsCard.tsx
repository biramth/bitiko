import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Copy, Plus, X } from 'lucide-react'
import { defaultTimezoneForCountry } from '@/config/countries'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import {
  DEFAULT_BOOKING_SETTINGS,
  getBookingSettings,
  saveBookingSettings,
  type BookingSettingsRow,
} from '@/services/bookingSettings.service'
import type { Json } from '@/types/database.types'
import { localDateIso } from '@/utils/format'
import { formatLongDate } from './bookingHelpers'
import {
  WEEK_DAYS,
  legacyColumns,
  summarizeWeek,
  validateWeek,
  weeklyHoursFromSettings,
  type TimeRange,
  type WeeklyHours,
} from './weeklyHours'

interface FormValues {
  timezone: string
  weekly: WeeklyHours
  closedDates: string[]
  slot_minutes: number
  max_days_ahead: number
  table_capacity: number
  reservation_minutes: number
}

function toFormValues(saved: BookingSettingsRow | null | undefined, countryCode: string | null | undefined): FormValues {
  return {
    timezone: saved?.timezone ?? defaultTimezoneForCountry(countryCode),
    weekly: weeklyHoursFromSettings(saved),
    closedDates: saved?.closed_dates ?? [],
    slot_minutes: saved?.slot_minutes ?? DEFAULT_BOOKING_SETTINGS.slot_minutes,
    max_days_ahead: saved?.max_days_ahead ?? DEFAULT_BOOKING_SETTINGS.max_days_ahead,
    table_capacity: saved?.table_capacity ?? DEFAULT_BOOKING_SETTINGS.table_capacity,
    reservation_minutes: saved?.reservation_minutes ?? DEFAULT_BOOKING_SETTINGS.reservation_minutes,
  }
}

/** Jours et heures où vos clients peuvent réserver : chaque jour a ses propres
 *  plages (samedi plus court, pause déjeuner, dimanche fermé…), plus des jours de
 *  fermeture exceptionnels (congés). Ce que les visiteurs voient sur la vitrine et
 *  ce que le serveur applique. Réservé au propriétaire et aux managers. */
export function BookingSettingsCard({ showTables = false }: { showTables?: boolean }) {
  const { data: shop } = useMyShop()
  const { role } = useShopRole()

  const { data: saved, isLoading } = useQuery({
    queryKey: ['booking-settings', 'admin', shop?.id],
    queryFn: () => getBookingSettings(shop!.id),
    enabled: !!shop?.id,
  })

  if (!shop || isLoading) return null
  if (role && role !== 'owner' && role !== 'manager') return null
  // `key` : le formulaire repart des valeurs enregistrées après chaque sauvegarde.
  return (
    <BookingSettingsForm
      key={saved?.updated_at ?? 'default'}
      shopId={shop.id}
      countryCode={shop.country_code}
      saved={saved}
      showTables={showTables}
    />
  )
}

function BookingSettingsForm({
  shopId,
  countryCode,
  saved,
  showTables,
}: {
  shopId: string
  countryCode: string | null | undefined
  saved: BookingSettingsRow | null | undefined
  showTables: boolean
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<FormValues>(() => toFormValues(saved, countryCode))
  const [open, setOpen] = useState(false)
  const [newClosedDate, setNewClosedDate] = useState('')

  const saveMutation = useMutation({
    mutationFn: () =>
      saveBookingSettings(shopId, {
        timezone: form.timezone,
        ...legacyColumns(form.weekly),
        weekly_hours: form.weekly as unknown as Json,
        closed_dates: form.closedDates,
        slot_minutes: form.slot_minutes,
        max_days_ahead: form.max_days_ahead,
        table_capacity: form.table_capacity,
        reservation_minutes: form.reservation_minutes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-settings'] })
      queryClient.invalidateQueries({ queryKey: ['booking-settings', 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['booking-slots'] })
      queryClient.invalidateQueries({ queryKey: ['reservation-slots'] })
      toast.success('Horaires enregistrés.')
    },
    onError: () => toast.error('Enregistrement impossible. Vérifiez les horaires.'),
  })

  const validation = validateWeek(form.weekly)
  const summary = summarizeWeek(form.weekly)

  const setDay = (day: number, ranges: TimeRange[]) =>
    setForm((current) => {
      const weekly = { ...current.weekly }
      if (ranges.length === 0) delete weekly[String(day)]
      else weekly[String(day)] = ranges
      return { ...current, weekly }
    })

  const copyToAll = (day: number) =>
    setForm((current) => {
      const source = current.weekly[String(day)] ?? []
      const weekly: WeeklyHours = { ...current.weekly }
      for (const d of WEEK_DAYS) {
        if (d.value !== day && (weekly[String(d.value)] ?? []).length > 0) {
          weekly[String(d.value)] = source.map((r) => [...r] as TimeRange)
        }
      }
      return { ...current, weekly }
    })

  const addClosedDate = () => {
    if (!newClosedDate || form.closedDates.includes(newClosedDate)) return
    setForm({ ...form, closedDates: [...form.closedDates, newClosedDate].sort() })
    setNewClosedDate('')
  }

  const today = localDateIso()
  const upcomingClosed = form.closedDates.filter((d) => d >= today)
  const timeInputClass =
    'rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

  return (
    <div id="booking-hours" className="scroll-mt-4">
      <Card className="mt-6" padded={false}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-start gap-3 px-4 py-4 text-left sm:px-5"
        >
          <Clock size={18} aria-hidden className="mt-0.5 shrink-0 text-gray-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-900">Jours et heures de réservation</span>
            <span className="mt-0.5 block text-sm text-gray-500">{summary}</span>
            <span className="mt-0.5 block text-xs text-gray-400">
              Vos clients ne peuvent réserver que sur ces créneaux.
              {upcomingClosed.length > 0 &&
                ` ${upcomingClosed.length} jour${upcomingClosed.length > 1 ? 's' : ''} de fermeture à venir.`}
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium text-brand-700">{open ? 'Fermer' : 'Modifier'}</span>
        </button>

        {open && (
          <div className="space-y-6 border-t border-gray-100 p-4 sm:p-5">
            <div>
              <p className="text-sm font-medium text-gray-700">Horaires de chaque jour</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Réglez chaque jour séparément. Ajoutez une deuxième plage pour une pause (ex. 9 h – 12 h 30 puis 14 h – 19 h).
              </p>
              <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200">
                {WEEK_DAYS.map((day) => {
                  const ranges = form.weekly[String(day.value)] ?? []
                  const isOpen = ranges.length > 0
                  const error = validation.dayErrors[String(day.value)]
                  return (
                    <li key={day.value} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:gap-4">
                      <div className="flex items-center justify-between gap-3 sm:w-44 sm:shrink-0">
                        <span className={`text-sm font-medium ${isOpen ? 'text-gray-900' : 'text-gray-400'}`}>{day.long}</span>
                        <Switch
                          checked={isOpen}
                          label={isOpen ? 'Ouvert' : 'Fermé'}
                          onChange={(on) => setDay(day.value, on ? [['09:00', '18:00']] : [])}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        {isOpen ? (
                          <>
                            {ranges.map((range, index) => (
                              <div key={index} className="flex flex-wrap items-center gap-2">
                                <input
                                  type="time"
                                  aria-label={`${day.long}, début de la plage ${index + 1}`}
                                  value={range[0]}
                                  onChange={(e) =>
                                    setDay(day.value, ranges.map((r, i) => (i === index ? [e.target.value, r[1]] : r)) as TimeRange[])
                                  }
                                  className={timeInputClass}
                                />
                                <span className="text-sm text-gray-400">à</span>
                                <input
                                  type="time"
                                  aria-label={`${day.long}, fin de la plage ${index + 1}`}
                                  value={range[1]}
                                  onChange={(e) =>
                                    setDay(day.value, ranges.map((r, i) => (i === index ? [r[0], e.target.value] : r)) as TimeRange[])
                                  }
                                  className={timeInputClass}
                                />
                                {ranges.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setDay(day.value, ranges.filter((_, i) => i !== index))}
                                    aria-label={`Retirer la plage ${index + 1} du ${day.long.toLowerCase()}`}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                  >
                                    <X size={14} aria-hidden />
                                  </button>
                                )}
                              </div>
                            ))}
                            <div className="flex flex-wrap gap-3 text-xs font-medium">
                              <button
                                type="button"
                                onClick={() => setDay(day.value, [...ranges, ['14:00', '18:00']])}
                                className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-800"
                              >
                                <Plus size={12} aria-hidden /> Ajouter une plage (pause)
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToAll(day.value)}
                                className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800"
                              >
                                <Copy size={12} aria-hidden /> Copier sur les autres jours ouverts
                              </button>
                            </div>
                            {error && (
                              <p role="alert" className="text-xs text-red-600">
                                {error}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="pt-1 text-sm text-gray-400">Aucune réservation ce jour-là.</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {Object.keys(form.weekly).length === 0 && (
                <p role="alert" className="mt-2 text-xs text-red-600">
                  Ouvrez au moins un jour.
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Jours de fermeture exceptionnels</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Congés, jour férié, travaux : ces dates sont fermées même si le jour est ouvert ci-dessus.
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <TextField
                  label="Date"
                  type="date"
                  min={today}
                  value={newClosedDate}
                  onChange={(e) => setNewClosedDate(e.target.value)}
                  wrapperClassName="w-44"
                />
                <Button variant="secondary" onClick={addClosedDate} disabled={!newClosedDate}>
                  Fermer ce jour
                </Button>
              </div>
              {upcomingClosed.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {upcomingClosed.map((date) => (
                    <li key={date} className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-3 pr-1.5 text-sm text-gray-700">
                      <span className="first-letter:uppercase">{formatLongDate(date)}</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, closedDates: form.closedDates.filter((d) => d !== date) })}
                        aria-label={`Rouvrir le ${formatLongDate(date)}`}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                      >
                        <X size={13} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Un créneau toutes les"
                value={form.slot_minutes}
                onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })}
              >
                {[15, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Réservation possible jusqu’à"
                value={form.max_days_ahead}
                onChange={(e) => setForm({ ...form, max_days_ahead: Number(e.target.value) })}
                hint="à l’avance"
              >
                {[7, 14, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    {d} jours
                  </option>
                ))}
              </SelectField>
            </div>

            {showTables && (
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Nombre de places en salle"
                  type="number"
                  min={1}
                  max={1000}
                  value={form.table_capacity}
                  onChange={(e) => setForm({ ...form, table_capacity: Math.max(1, Number(e.target.value) || 1) })}
                  hint="Total de couverts que vous pouvez accueillir en même temps."
                />
                <SelectField
                  label="Durée d’une table"
                  value={form.reservation_minutes}
                  onChange={(e) => setForm({ ...form, reservation_minutes: Number(e.target.value) })}
                  hint="Temps pendant lequel une réservation occupe ses places."
                >
                  {[60, 90, 120, 150, 180].map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </SelectField>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Fuseau horaire : {form.timezone}. Vous pouvez toujours ajouter une réservation à la main, même hors de ces horaires.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!validation.ok}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
