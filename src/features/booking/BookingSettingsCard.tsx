import { useState } from 'react'
import { COUNTRIES, COUNTRY_BY_CODE } from '@/config/countries'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { useToast } from '@/components/ui/Toast'
import {
  DEFAULT_BOOKING_SETTINGS,
  getBookingSettings,
  saveBookingSettings,
  type BookingSettingsInput,
  type BookingSettingsRow,
} from '@/services/bookingSettings.service'

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 7, label: 'Dim' },
]

const inputClass = 'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none'

const hhmm = (time: string) => time.slice(0, 5)

/** Horaires, jours d'ouverture, pas des créneaux, horizon et capacité de
 *  tables : ce que les visiteurs voient sur la vitrine et ce que le serveur
 *  applique aux réservations invitées. Réservé au propriétaire et aux managers. */
function toFormValues(saved: BookingSettingsRow | null | undefined): BookingSettingsInput {
  if (!saved) return DEFAULT_BOOKING_SETTINGS
  return {
    timezone: saved.timezone,
    country_code: saved.country_code,
    open_time: hhmm(saved.open_time),
    close_time: hhmm(saved.close_time),
    open_days: saved.open_days,
    slot_minutes: saved.slot_minutes,
    max_days_ahead: saved.max_days_ahead,
    table_capacity: saved.table_capacity,
    reservation_minutes: saved.reservation_minutes,
  }
}

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
  return <BookingSettingsForm key={saved?.updated_at ?? 'default'} shopId={shop.id} saved={saved} showTables={showTables} />
}

function BookingSettingsForm({
  shopId,
  saved,
  showTables,
}: {
  shopId: string
  saved: BookingSettingsRow | null | undefined
  showTables: boolean
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<BookingSettingsInput>(() => toFormValues(saved))
  const [open, setOpen] = useState(false)

  const saveMutation = useMutation({
    mutationFn: () => saveBookingSettings(shopId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-settings'] })
      queryClient.invalidateQueries({ queryKey: ['booking-settings', 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['booking-slots'] })
      queryClient.invalidateQueries({ queryKey: ['reservation-slots'] })
      toast.success('Horaires enregistrés.')
    },
    onError: () => toast.error('Enregistrement impossible. Vérifiez les horaires (fermeture après ouverture).'),
  })

  const toggleDay = (day: number) => {
    const next = form.open_days.includes(day) ? form.open_days.filter((d) => d !== day) : [...form.open_days, day]
    setForm({ ...form, open_days: next.sort((a, b) => a - b) })
  }

  const invalid = form.open_days.length === 0 || form.close_time <= form.open_time

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-800"
      >
        <Clock size={16} aria-hidden className="text-gray-500" />
        Horaires de réservation
        <span className="ml-auto text-xs font-normal text-gray-500">{open ? 'Masquer' : 'Modifier'}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-gray-100 p-4">
          <div>
            <label htmlFor="bk-country" className="block text-sm font-medium text-gray-700">Pays de la boutique</label>
            <select
              id="bk-country"
              value={form.country_code}
              onChange={(e) =>
                setForm({
                  ...form,
                  country_code: e.target.value,
                  timezone: COUNTRY_BY_CODE[e.target.value]?.timezone ?? form.timezone,
                })
              }
              className={inputClass}
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} (+{country.dialCode})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Sert à lire les numéros saisis en format local et fixe le fuseau horaire des créneaux.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Jours d’ouverture</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const on = form.open_days.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${on ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="bk-open" className="block text-sm font-medium text-gray-700">Ouverture</label>
              <input id="bk-open" type="time" value={form.open_time} onChange={(e) => setForm({ ...form, open_time: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="bk-close" className="block text-sm font-medium text-gray-700">Fermeture</label>
              <input id="bk-close" type="time" value={form.close_time} onChange={(e) => setForm({ ...form, close_time: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="bk-step" className="block text-sm font-medium text-gray-700">Pas des créneaux</label>
              <select id="bk-step" value={form.slot_minutes} onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })} className={inputClass}>
                {[15, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bk-ahead" className="block text-sm font-medium text-gray-700">Réservable jusqu’à</label>
              <select id="bk-ahead" value={form.max_days_ahead} onChange={(e) => setForm({ ...form, max_days_ahead: Number(e.target.value) })} className={inputClass}>
                {[7, 14, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>{d} jours</option>
                ))}
              </select>
            </div>
          </div>
          {showTables && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bk-cap" className="block text-sm font-medium text-gray-700">Couverts simultanés max</label>
                <input
                  id="bk-cap"
                  type="number"
                  min={1}
                  max={1000}
                  value={form.table_capacity}
                  onChange={(e) => setForm({ ...form, table_capacity: Math.max(1, Number(e.target.value) || 1) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="bk-dur" className="block text-sm font-medium text-gray-700">Durée d’occupation d’une table</label>
                <select id="bk-dur" value={form.reservation_minutes} onChange={(e) => setForm({ ...form, reservation_minutes: Number(e.target.value) })} className={inputClass}>
                  {[60, 90, 120, 150, 180].map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Fuseau : {form.timezone}. Les visiteurs ne peuvent réserver que sur ces créneaux ; vous pouvez toujours saisir un
            rendez-vous à la main, y compris hors horaires.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || invalid}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
