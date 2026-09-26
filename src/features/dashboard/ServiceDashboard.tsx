import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, CalendarDays, Clock, Scissors, Users, type LucideIcon } from 'lucide-react'
import { listShopServices } from '@/services/service.service'
import { listShopTeamMembers } from '@/services/teamMember.service'
import {
  APPOINTMENT_STATUS_LABELS,
  listAppointmentsByDate,
  listUpcomingAppointments,
  setAppointmentStatus,
  type AppointmentStatus,
} from '@/services/appointment.service'
import {
  RESERVATION_STATUS_LABELS,
  listReservationsByDate,
  listUpcomingReservations,
  setReservationStatus,
  type ReservationStatus,
} from '@/services/reservation.service'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { BOOKING_STATUS_TONE, type BookingStatus } from '@/features/booking/bookingStatus'
import { formatClock, formatLongDate } from '@/features/booking/bookingHelpers'
import { localDateIso } from '@/utils/format'

function ShortcutTile({
  icon: Icon,
  label,
  value,
  hint,
  to,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  to: string
}) {
  return (
    <Link to={to} className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          <Icon size={17} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold text-gray-900">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
        </div>
      </div>
    </Link>
  )
}

function DayHeading({ icon: Icon, title, count, pending, to, linkLabel }: {
  icon: LucideIcon
  title: string
  count: number
  pending: number
  to: string
  linkLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <Icon size={16} aria-hidden className="text-gray-400" /> {title}
          <span className="text-sm font-normal text-gray-500">
            {count === 0 ? 'rien de prévu' : `${count} prévu${count > 1 ? 's' : ''}`}
          </span>
        </h3>
        {pending > 0 && (
          <p className="mt-0.5 text-sm font-medium text-amber-700">
            {pending} à confirmer
          </p>
        )}
      </div>
      <Link to={to} className="text-sm font-medium text-brand-700 hover:text-brand-800">{linkLabel}</Link>
    </div>
  )
}

/** Bloc du tableau de bord pour les activités de service : ce qui se passe
 *  AUJOURD'HUI (avec les boutons pour confirmer sur place), puis les prochains
 *  jours, puis des raccourcis vers le catalogue et l'équipe. */
export function ServiceDashboard({
  shopId,
  showServices,
  showAppointments,
  showReservations,
  showTeam,
}: {
  shopId: string
  currency: string
  showServices: boolean
  showAppointments: boolean
  showReservations: boolean
  showTeam: boolean
}) {
  const today = localDateIso()
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: services = [] } = useQuery({
    queryKey: ['services', 'admin', shopId],
    queryFn: () => listShopServices(shopId),
    enabled: showServices,
  })
  const { data: team = [] } = useQuery({
    queryKey: ['team-members', 'admin', shopId],
    queryFn: () => listShopTeamMembers(shopId),
    enabled: showTeam,
  })
  const { data: appointmentsToday = [] } = useQuery({
    queryKey: ['appointments', 'admin', shopId, today],
    queryFn: () => listAppointmentsByDate(shopId, today),
    enabled: showAppointments,
  })
  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ['appointments', 'upcoming', shopId],
    queryFn: () => listUpcomingAppointments(shopId, 12),
    enabled: showAppointments,
  })
  const { data: reservationsToday = [] } = useQuery({
    queryKey: ['reservations', 'admin', shopId, today],
    queryFn: () => listReservationsByDate(shopId, today),
    enabled: showReservations,
  })
  const { data: upcomingReservations = [] } = useQuery({
    queryKey: ['reservations', 'upcoming', shopId],
    queryFn: () => listUpcomingReservations(shopId, 12),
    enabled: showReservations,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments', shopId] })
    queryClient.invalidateQueries({ queryKey: ['appointments', 'admin', shopId] })
    queryClient.invalidateQueries({ queryKey: ['appointments', 'upcoming', shopId] })
    queryClient.invalidateQueries({ queryKey: ['reservations', shopId] })
    queryClient.invalidateQueries({ queryKey: ['reservations', 'admin', shopId] })
    queryClient.invalidateQueries({ queryKey: ['reservations', 'upcoming', shopId] })
    queryClient.invalidateQueries({ queryKey: ['booking-pending'] })
  }
  const appointmentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) => setAppointmentStatus(id, status),
    onSuccess: () => {
      invalidate()
      toast.success('Rendez-vous confirmé. Pensez à prévenir votre client.')
    },
    onError: () => toast.error('Action impossible.'),
  })
  const reservationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) => setReservationStatus(id, status),
    onSuccess: () => {
      invalidate()
      toast.success('Réservation confirmée. Pensez à prévenir votre client.')
    },
    onError: () => toast.error('Action impossible.'),
  })

  const liveAppointments = appointmentsToday.filter((a) => a.status !== 'cancelled')
  const liveReservations = reservationsToday.filter((r) => r.status !== 'cancelled')
  const pendingAppointments = liveAppointments.filter((a) => a.status === 'pending').length
  const pendingReservations = liveReservations.filter((r) => r.status === 'pending').length
  const laterAppointments = upcomingAppointments.filter((a) => localDateIso(new Date(a.start_at)) !== today).slice(0, 5)
  const laterReservations = upcomingReservations.filter((r) => localDateIso(new Date(r.start_at)) !== today).slice(0, 5)
  const activeServices = services.filter((s) => s.active)

  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm text-gray-500">Aujourd’hui — {formatLongDate(today)}</p>

      {showAppointments && (
        <Card>
          <DayHeading
            icon={CalendarDays}
            title="Rendez-vous du jour"
            count={liveAppointments.length}
            pending={pendingAppointments}
            to="/admin/rendez-vous"
            linkLabel="Ouvrir l’agenda"
          />
          {liveAppointments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Aucun rendez-vous aujourd’hui. Partagez le lien de votre site pour recevoir des demandes.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {liveAppointments.map((rdv) => {
                const status = rdv.status as BookingStatus
                return (
                  <li key={rdv.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                    <span className="flex w-14 shrink-0 items-center gap-1 text-sm font-semibold text-gray-900">
                      <Clock size={13} aria-hidden className="text-gray-400" /> {formatClock(rdv.start_at)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{rdv.service?.name ?? rdv.service_name ?? 'Prestation'}</span>
                      {' — '}
                      {rdv.customer_name}
                    </span>
                    <Badge tone={BOOKING_STATUS_TONE[status] ?? 'neutral'}>
                      {APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] ?? rdv.status}
                    </Badge>
                    {status === 'pending' && (
                      <Button
                        size="sm"
                        disabled={appointmentMutation.isPending}
                        onClick={() => appointmentMutation.mutate({ id: rdv.id, status: 'confirmed' })}
                      >
                        Confirmer
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {laterAppointments.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Prochains jours</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {laterAppointments.map((rdv) => (
                  <li key={rdv.id} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="w-40 shrink-0 capitalize text-gray-500">
                      {new Date(rdv.start_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatClock(rdv.start_at)}
                    </span>
                    <span className="text-gray-800">{rdv.service?.name ?? rdv.service_name ?? 'Prestation'} — {rdv.customer_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {showReservations && (
        <Card>
          <DayHeading
            icon={BookOpen}
            title="Réservations de table du jour"
            count={liveReservations.length}
            pending={pendingReservations}
            to="/admin/reservations"
            linkLabel="Ouvrir le registre"
          />
          {liveReservations.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Aucune réservation aujourd’hui.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {liveReservations.map((resa) => {
                const status = resa.status as BookingStatus
                return (
                  <li key={resa.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                    <span className="flex w-14 shrink-0 items-center gap-1 text-sm font-semibold text-gray-900">
                      <Clock size={13} aria-hidden className="text-gray-400" /> {formatClock(resa.start_at)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{resa.customer_name}</span> · {resa.party_size} personne{resa.party_size > 1 ? 's' : ''}
                    </span>
                    <Badge tone={BOOKING_STATUS_TONE[status] ?? 'neutral'}>
                      {RESERVATION_STATUS_LABELS[status as ReservationStatus] ?? resa.status}
                    </Badge>
                    {status === 'pending' && (
                      <Button
                        size="sm"
                        disabled={reservationMutation.isPending}
                        onClick={() => reservationMutation.mutate({ id: resa.id, status: 'confirmed' })}
                      >
                        Confirmer
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {laterReservations.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Prochains jours</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {laterReservations.map((resa) => (
                  <li key={resa.id} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="w-40 shrink-0 capitalize text-gray-500">
                      {new Date(resa.start_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatClock(resa.start_at)}
                    </span>
                    <span className="text-gray-800">{resa.customer_name} · {resa.party_size} pers.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {(showServices || showTeam) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {showServices && (
            <ShortcutTile
              icon={Scissors}
              label="Prestations sur votre site"
              value={String(activeServices.length)}
              hint={services.length !== activeServices.length ? `${services.length - activeServices.length} masquée${services.length - activeServices.length > 1 ? 's' : ''}` : 'Gérer mes prestations'}
              to="/admin/prestations"
            />
          )}
          {showTeam && (
            <ShortcutTile
              icon={Users}
              label="Personnes dans votre équipe"
              value={String(team.filter((m) => m.active).length)}
              hint="Gérer mon équipe"
              to="/admin/equipe"
            />
          )}
        </div>
      )}
    </div>
  )
}
