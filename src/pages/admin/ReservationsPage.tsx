import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Clock, Copy, Plus, Users } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import {
  RESERVATION_STATUS_LABELS,
  createReservation,
  listReservationsByDate,
  listReservationsForRange,
  setReservationStatus,
  type ReservationRow,
  type ReservationStatus,
} from '@/services/reservation.service'
import { bookingErrorMessage, getBookingSettings } from '@/services/bookingSettings.service'
import { isClosedOn, weeklyHoursFromSettings } from '@/features/booking/weeklyHours'
import { localDateIso } from '@/utils/format'
import { shopUrl } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { BookingSettingsCard } from '@/features/booking/BookingSettingsCard'
import { ContactActions } from '@/features/booking/ContactActions'
import { DayNavigator } from '@/features/booking/DayNavigator'
import { WeekStrip } from '@/features/booking/WeekStrip'
import { StatusActions } from '@/features/booking/StatusActions'
import { StatusFilter } from '@/features/booking/StatusFilter'
import { BOOKING_STATUS_HELP, BOOKING_STATUS_TONE, type BookingStatus } from '@/features/booking/bookingStatus'
import { addDays, countByStatus, formatClock, formatLongDate, groupByLocalDay, startOfWeek } from '@/features/booking/bookingHelpers'

const STATUS_TOAST: Record<ReservationStatus, string> = {
  pending: 'Réservation remise à confirmer.',
  confirmed: 'Réservation confirmée. Pensez à prévenir votre client.',
  done: 'Réservation marquée comme terminée.',
  cancelled: 'Réservation annulée : les places sont de nouveau libres.',
}

function whatsappMessage(resa: ReservationRow, shopName: string): string {
  const when = `${formatLongDate(resa.start_at.slice(0, 10))} à ${formatClock(resa.start_at)}`
  if (resa.status === 'cancelled') {
    return `Bonjour ${resa.customer_name}, nous devons annuler votre réservation du ${when} chez ${shopName}. Pouvons-nous vous proposer un autre horaire ?`
  }
  if (resa.status === 'pending') {
    return `Bonjour ${resa.customer_name}, nous avons bien reçu votre demande de table pour ${resa.party_size} le ${when} chez ${shopName}. Nous revenons vers vous très vite.`
  }
  return `Bonjour ${resa.customer_name}, votre table pour ${resa.party_size} est confirmée le ${when} chez ${shopName}. À bientôt !`
}

export function ReservationsPage() {
  usePageSeo({ title: 'Réservations de table — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [date, setDate] = useState(localDateIso())
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [partySize, setPartySize] = useState('2')
  const [startTime, setStartTime] = useState('12:30')
  const [copied, setCopied] = useState(false)

  const { data: reservations = [], isLoading, isError } = useQuery({
    queryKey: ['reservations', 'admin', shop?.id, date],
    queryFn: () => listReservationsByDate(shop!.id, date),
    enabled: !!shop?.id,
  })

  const { data: bookingSettings } = useQuery({
    queryKey: ['booking-settings', 'admin', shop?.id],
    queryFn: () => getBookingSettings(shop!.id),
    enabled: !!shop?.id,
  })
  const closedOn = (iso: string) => isClosedOn(weeklyHoursFromSettings(bookingSettings), bookingSettings?.closed_dates ?? [], iso)
  const monday = startOfWeek(date)
  const { data: weekItems = [] } = useQuery({
    queryKey: ['reservations', 'admin', shop?.id, 'week', monday],
    queryFn: () => listReservationsForRange(shop!.id, monday, addDays(monday, 7)),
    enabled: !!shop?.id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['reservations', 'admin', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['reservations', 'upcoming', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['booking-pending'] })
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) => setReservationStatus(id, status),
    onSuccess: (_d, v) => {
      invalidate()
      toast.success(STATUS_TOAST[v.status])
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Action impossible.'),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createReservation({
        shopId: shop!.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        partySize: Math.max(1, Number(partySize) || 1),
        startAt: new Date(`${date}T${startTime}:00`).toISOString(),
      }),
    onSuccess: () => {
      invalidate()
      setCreateOpen(false)
      setCustomerName('')
      setCustomerPhone('')
      toast.success('Réservation ajoutée.')
    },
    onError: (e) => toast.error(bookingErrorMessage(e)),
  })

  const copyLink = async () => {
    if (!shop) return
    try {
      await navigator.clipboard.writeText(shopUrl(shop.slug))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copie impossible : sélectionnez le lien manuellement.')
    }
  }

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />

  const counts = countByStatus(reservations)
  const pending = counts.pending ?? 0
  const visible = filter === 'all' ? reservations : reservations.filter((r) => r.status === filter)
  const covers = reservations.filter((r) => r.status === 'pending' || r.status === 'confirmed').reduce((sum, r) => sum + r.party_size, 0)

  return (
    <div>
      <PageHeader
        title="Réservations de table"
        subtitle="Vos clients réservent une table sur votre site : leurs demandes arrivent ici. Confirmez-les pour garder les places."
        actions={
          <>
          <Button variant="secondary" icon={<Clock size={15} aria-hidden />} onClick={() => document.getElementById('booking-hours')?.scrollIntoView({ behavior: 'smooth' })}>
            Mes horaires
          </Button>
          <Button
            icon={<Plus size={15} aria-hidden />}
            onClick={() => {
              createMutation.reset()
              setCreateOpen(true)
            }}
          >
            Ajouter une réservation
          </Button>
          </>
        }
      />

      <div className="mt-5 flex flex-col gap-4">
        <DayNavigator
          date={date}
          onChange={(next) => {
            setDate(next)
            setFilter('all')
          }}
        />

        <WeekStrip date={date} onChange={(next) => { setDate(next); setFilter('all') }} counts={groupByLocalDay(weekItems)} unit="réservation" isClosed={closedOn} />

        {reservations.length > 0 && (
          <p className="text-sm text-gray-600">
            <Users size={15} aria-hidden className="mr-1.5 inline text-gray-400" />
            <strong className="text-gray-900">{covers} couvert{covers > 1 ? 's' : ''}</strong> attendu{covers > 1 ? 's' : ''} ce jour-là (demandes à confirmer et réservations confirmées).
          </p>
        )}

        {pending > 0 && (
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>{pending} demande{pending > 1 ? 's' : ''} à confirmer.</strong> Confirmez pour garder les places, ou refusez pour les libérer — puis prévenez votre client sur WhatsApp.
          </div>
        )}

        {reservations.length > 0 && (
          <StatusFilter value={filter} onChange={setFilter} counts={counts} labels={RESERVATION_STATUS_LABELS} />
        )}
      </div>

      <div className="mt-4">
        {reservations.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={BookOpen}
              title="Aucune réservation ce jour-là"
              description="Les demandes de vos clients apparaissent ici dès qu’ils réservent une table sur votre site."
              action={
                <Button variant="secondary" icon={<Copy size={14} aria-hidden />} onClick={copyLink}>
                  {copied ? 'Lien copié' : 'Copier le lien de mon site'}
                </Button>
              }
            />
          </Card>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Aucune réservation avec ce statut.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((resa) => {
              const status = resa.status as BookingStatus
              return (
                <li key={resa.id}>
                  <Card className={`flex flex-col gap-3 sm:flex-row sm:items-start ${status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <p className="flex items-center gap-1.5 text-lg font-semibold text-gray-900 sm:w-32 sm:shrink-0">
                      <Clock size={16} aria-hidden className="text-gray-400" />
                      {formatClock(resa.start_at)}
                    </p>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{resa.customer_name}</p>
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <Users size={14} aria-hidden className="text-gray-400" /> {resa.party_size} personne{resa.party_size > 1 ? 's' : ''}
                        </span>
                        <Badge tone={BOOKING_STATUS_TONE[status] ?? 'neutral'}>
                          {RESERVATION_STATUS_LABELS[status as ReservationStatus] ?? resa.status}
                        </Badge>
                        {resa.source === 'admin' && <Badge>Ajoutée par vous</Badge>}
                      </div>
                      <ContactActions phone={resa.customer_phone} message={whatsappMessage(resa, shop?.name ?? '')} />
                      <p className="text-xs text-gray-400">{BOOKING_STATUS_HELP[status]}</p>
                    </div>

                    <StatusActions
                      status={status}
                      disabled={statusMutation.isPending}
                      onChange={(next) => statusMutation.mutate({ id: resa.id, status: next })}
                    />
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <BookingSettingsCard showTables />

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ajouter une réservation"
        description={`Pour le ${formatLongDate(date)}. Utile quand un client vous appelle ou vous écrit sur WhatsApp.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!customerName.trim() || !customerPhone.trim()}
            >
              Ajouter
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <TextField label="Nom du client" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <TextField
            label="Téléphone du client"
            type="tel"
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="77 123 45 67"
            hint="Pour pouvoir le joindre ou le prévenir sur WhatsApp."
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Nombre de personnes"
              type="number"
              min={1}
              max={100}
              required
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
            />
            <TextField label="Heure d’arrivée" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
