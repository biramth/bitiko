import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clock, Copy, Plus, Scissors, User } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import {
  APPOINTMENT_STATUS_LABELS,
  createAppointment,
  listAppointmentsByDate,
  listAppointmentsForRange,
  setAppointmentStatus,
  type AppointmentStatus,
  type AppointmentWithRelations,
} from '@/services/appointment.service'
import { bookingErrorMessage, getBookingSettings } from '@/services/bookingSettings.service'
import { isClosedOn, weeklyHoursFromSettings } from '@/features/booking/weeklyHours'
import { listShopServices } from '@/services/service.service'
import { listShopTeamMembers } from '@/services/teamMember.service'
import { formatCurrency, localDateIso } from '@/utils/format'
import { shopUrl } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
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

const STATUS_TOAST: Record<AppointmentStatus, string> = {
  pending: 'Rendez-vous remis à confirmer.',
  confirmed: 'Rendez-vous confirmé. Pensez à prévenir votre client.',
  done: 'Rendez-vous marqué comme terminé.',
  cancelled: 'Rendez-vous annulé : le créneau est de nouveau libre.',
}

function whatsappMessage(rdv: AppointmentWithRelations, shopName: string): string {
  const what = rdv.service?.name ?? rdv.service_name ?? 'votre rendez-vous'
  const when = `${formatLongDate(rdv.start_at.slice(0, 10))} à ${formatClock(rdv.start_at)}`
  if (rdv.status === 'cancelled') {
    return `Bonjour ${rdv.customer_name}, nous devons annuler votre rendez-vous « ${what} » du ${when} chez ${shopName}. Pouvons-nous en fixer un autre ?`
  }
  if (rdv.status === 'pending') {
    return `Bonjour ${rdv.customer_name}, nous avons bien reçu votre demande de rendez-vous « ${what} » le ${when} chez ${shopName}. Nous revenons vers vous très vite.`
  }
  return `Bonjour ${rdv.customer_name}, votre rendez-vous « ${what} » est confirmé le ${when} chez ${shopName}. À bientôt !`
}

export function AppointmentsPage() {
  usePageSeo({ title: 'Rendez-vous — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const toast = useToast()
  const currency = shop?.currency ?? 'XOF'

  const [date, setDate] = useState(localDateIso())
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [teamMemberId, setTeamMemberId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [copied, setCopied] = useState(false)

  const { data: appointments = [], isLoading, isError } = useQuery({
    queryKey: ['appointments', 'admin', shop?.id, date],
    queryFn: () => listAppointmentsByDate(shop!.id, date),
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
    queryKey: ['appointments', 'admin', shop?.id, 'week', monday],
    queryFn: () => listAppointmentsForRange(shop!.id, monday, addDays(monday, 7)),
    enabled: !!shop?.id,
  })
  const { data: services = [] } = useQuery({
    queryKey: ['services', 'admin', shop?.id],
    queryFn: () => listShopServices(shop!.id),
    enabled: !!shop?.id,
  })
  const { data: team = [] } = useQuery({
    queryKey: ['team-members', 'admin', shop?.id],
    queryFn: () => listShopTeamMembers(shop!.id),
    enabled: !!shop?.id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['appointments', 'admin', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['appointments', 'upcoming', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['booking-pending'] })
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) => setAppointmentStatus(id, status),
    onSuccess: (_d, v) => {
      invalidate()
      toast.success(STATUS_TOAST[v.status])
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Action impossible.'),
  })

  const activeServices = services.filter((s) => s.active)
  const selectedService = activeServices.find((s) => s.id === serviceId)

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedService) throw new Error('Choisissez une prestation.')
      return createAppointment({
        shopId: shop!.id,
        serviceId,
        teamMemberId: teamMemberId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        startAt: new Date(`${date}T${startTime}:00`).toISOString(),
      })
    },
    onSuccess: () => {
      invalidate()
      setCreateOpen(false)
      setCustomerName('')
      setCustomerPhone('')
      toast.success('Rendez-vous ajouté à l’agenda.')
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

  const counts = countByStatus(appointments)
  const pending = counts.pending ?? 0
  const visible = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter)
  const endTimePreview =
    selectedService && startTime
      ? formatClock(new Date(new Date(`${date}T${startTime}:00`).getTime() + selectedService.duration_minutes * 60000).toISOString())
      : null

  return (
    <div>
      <PageHeader
        title="Rendez-vous"
        subtitle="Vos clients réservent sur votre site : leurs demandes arrivent ici. Confirmez-les pour bloquer le créneau."
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
            Ajouter un rendez-vous
          </Button>
          </>
        }
      />

      {activeServices.length === 0 && (
        <Card className="mt-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-900">Vos clients ne peuvent pas encore réserver</p>
          <p className="mt-1 text-sm text-amber-800">
            Un rendez-vous porte sur une prestation (nom, prix, durée).{' '}
            <Link to="/admin/prestations" className="font-semibold underline">Ajoutez votre première prestation</Link>.
          </p>
        </Card>
      )}

      <div className="mt-5 flex flex-col gap-4">
        <DayNavigator
          date={date}
          onChange={(next) => {
            setDate(next)
            setFilter('all')
          }}
        />

        <WeekStrip date={date} onChange={(next) => { setDate(next); setFilter('all') }} counts={groupByLocalDay(weekItems)} unit="rendez-vous" isClosed={closedOn} />

        {pending > 0 && (
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>{pending} demande{pending > 1 ? 's' : ''} à confirmer.</strong> Confirmez pour réserver le créneau, ou refusez pour le libérer — puis prévenez votre client sur WhatsApp.
          </div>
        )}

        {appointments.length > 0 && (
          <StatusFilter value={filter} onChange={setFilter} counts={counts} labels={APPOINTMENT_STATUS_LABELS} />
        )}
      </div>

      <div className="mt-4">
        {appointments.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={CalendarDays}
              title="Aucun rendez-vous ce jour-là"
              description="Les demandes de vos clients apparaissent ici dès qu’ils réservent sur votre site."
              action={
                <Button variant="secondary" icon={<Copy size={14} aria-hidden />} onClick={copyLink}>
                  {copied ? 'Lien copié' : 'Copier le lien de mon site'}
                </Button>
              }
            />
          </Card>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Aucun rendez-vous avec ce statut.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((rdv) => {
              const status = rdv.status as BookingStatus
              const serviceName = rdv.service?.name ?? rdv.service_name ?? 'Prestation'
              const price = rdv.service_price ?? rdv.service?.price
              const duration = rdv.service_duration ?? rdv.service?.duration_minutes
              return (
                <li key={rdv.id}>
                  <Card className={`flex flex-col gap-3 sm:flex-row sm:items-start ${status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <div className="flex items-baseline gap-2 sm:w-32 sm:shrink-0 sm:flex-col sm:gap-0.5">
                      <p className="flex items-center gap-1.5 text-lg font-semibold text-gray-900">
                        <Clock size={16} aria-hidden className="text-gray-400" />
                        {formatClock(rdv.start_at)}
                      </p>
                      <p className="text-xs text-gray-500">jusqu’à {formatClock(rdv.end_at)}</p>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <Scissors size={14} aria-hidden className="text-gray-400" /> {serviceName}
                        </p>
                        <Badge tone={BOOKING_STATUS_TONE[status] ?? 'neutral'}>
                          {APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] ?? rdv.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {[duration ? `${duration} min` : null, price != null ? formatCurrency(price, currency) : null].filter(Boolean).join(' · ')}
                        {rdv.team_member && (
                          <span className="ml-2 inline-flex items-center gap-1"><User size={12} aria-hidden /> avec {rdv.team_member.name}</span>
                        )}
                      </p>
                      <p className="text-sm font-medium text-gray-800">{rdv.customer_name}</p>
                      <ContactActions phone={rdv.customer_phone} message={whatsappMessage(rdv, shop?.name ?? '')} />
                      <p className="text-xs text-gray-400">{BOOKING_STATUS_HELP[status]}</p>
                    </div>

                    <StatusActions
                      status={status}
                      disabled={statusMutation.isPending}
                      onChange={(next) => statusMutation.mutate({ id: rdv.id, status: next })}
                    />
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <BookingSettingsCard />

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ajouter un rendez-vous"
        description={`Pour le ${formatLongDate(date)}. Utile quand un client vous appelle ou passe sans avoir réservé en ligne.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!serviceId || !customerName.trim() || !customerPhone.trim()}
            >
              Ajouter à l’agenda
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SelectField label="Prestation" required value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Choisir une prestation…</option>
            {activeServices.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.duration_minutes} min — {formatCurrency(s.price, currency)}</option>
            ))}
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Heure de début"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              hint={endTimePreview ? `Fin prévue : ${endTimePreview}` : 'La fin se calcule avec la durée de la prestation.'}
            />
            <SelectField label="Avec" value={teamMemberId} onChange={(e) => setTeamMemberId(e.target.value)} hint="Facultatif">
              <option value="">Sans préférence</option>
              {team.filter((m) => m.active).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </SelectField>
          </div>
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
        </div>
      </Dialog>
    </div>
  )
}
