import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CalendarDays, Check, Clock, Scissors, Users, type LucideIcon } from 'lucide-react'
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
import { DashboardIdleNotice, DashboardSectionHeader, type DashboardAccent } from './dashboardUi'

function ShortcutTile({
  icon: Icon,
  label,
  value,
  hint,
  to,
  accent = 'ink',
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  to: string
  accent?: DashboardAccent
}) {
  const pills: Record<DashboardAccent, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
    brand: 'bg-brand-100 text-brand-700',
    ink: 'bg-ink-900/[0.06] text-ink-800',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-800',
  }
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-px hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pills[accent]}`}>
          <Icon size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-gray-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        </div>
        <ArrowRight size={16} aria-hidden className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
      </div>
      {hint && <p className="mt-2 text-xs text-gray-400">{hint}</p>}
    </Link>
  )
}

function DayHeading({ icon, title, count, pending, to, linkLabel, accent }: {
  icon: LucideIcon
  title: string
  count: number
  pending: number
  to: string
  linkLabel: string
  accent?: DashboardAccent
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <DashboardSectionHeader icon={icon} title={title} accent={accent} />
        {count === 0 ? (
          <span className="shrink-0 text-sm font-normal text-gray-400">rien de prévu</span>
        ) : (
          <Badge tone="neutral">{count} prévu{count > 1 ? 's' : ''}</Badge>
        )}
        {pending > 0 && <Badge tone="warning">{pending} à confirmer</Badge>}
      </div>
      <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
      >
        {linkLabel} <ArrowRight size={14} aria-hidden />
      </Link>
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
    <div className="mt-4 space-y-4 sm:space-y-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Aujourd’hui — <span className="capitalize text-gray-700">{formatLongDate(today)}</span>
      </p>

      {showAppointments && (
        <Card className="rounded-2xl">
          <DayHeading
            icon={CalendarDays}
            accent="brand"
            title="Rendez-vous du jour"
            count={liveAppointments.length}
            pending={pendingAppointments}
            to="/admin/rendez-vous"
            linkLabel="Ouvrir l’agenda"
          />
          {liveAppointments.length === 0 ? (
            <DashboardIdleNotice message="Aucun rendez-vous aujourd’hui. Partagez le lien de votre site pour recevoir des demandes." />
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {liveAppointments.map((rdv) => {
                const status = rdv.status as BookingStatus
                const isPending = status === 'pending'
                return (
                  <li key={rdv.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50 ${isPending ? 'bg-amber-50/40 hover:bg-amber-50/70' : ''}`}>
                    <span className="flex w-16 shrink-0 items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1 text-[13px] font-bold tabular-nums text-gray-900">
                      <Clock size={13} aria-hidden className="text-gray-400" /> {formatClock(rdv.start_at)}
                    </span>
                    <span className="min-w-0 flex-1 basis-40 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">{rdv.service?.name ?? rdv.service_name ?? 'Prestation'}</span>
                      {' — '}
                      {rdv.customer_name}
                    </span>
                    <Badge tone={BOOKING_STATUS_TONE[status] ?? 'neutral'}>
                      {APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] ?? rdv.status}
                    </Badge>
                    {isPending && (
                      <Button
                        size="sm"
                        icon={<Check size={14} aria-hidden />}
                        disabled={appointmentMutation.isPending}
                        onClick={() => appointmentMutation.mutate({ id: rdv.id, status: 'confirmed' })}
                        className="min-h-9"
                        aria-label={`Confirmer le rendez-vous de ${rdv.customer_name} à ${formatClock(rdv.start_at)}`}
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
            <div className="mt-4 rounded-xl bg-gray-50/70 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Prochains jours</p>
              <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                {laterAppointments.map((rdv) => (
                  <li key={rdv.id} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="w-40 shrink-0 capitalize tabular-nums text-gray-500">
                      {new Date(rdv.start_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatClock(rdv.start_at)}
                    </span>
                    <span className="min-w-0 text-gray-800">{rdv.service?.name ?? rdv.service_name ?? 'Prestation'} — {rdv.customer_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {showReservations && (
        <Card className="rounded-2xl">
          <DayHeading
            icon={BookOpen}
            accent="violet"
            title="Réservations de table du jour"
            count={liveReservations.length}
            pending={pendingReservations}
            to="/admin/reservations"
            linkLabel="Ouvrir le registre"
          />
          {liveReservations.length === 0 ? (
            <DashboardIdleNotice message="Aucune réservation aujourd’hui." />
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {liveReservations.map((resa) => {
                const status = resa.status as BookingStatus
                const isPending = status === 'pending'
                return (
                  <li key={resa.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50 ${isPending ? 'bg-amber-50/40 hover:bg-amber-50/70' : ''}`}>
                    <span className="flex w-16 shrink-0 items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1 text-[13px] font-bold tabular-nums text-gray-900">
                      <Clock size={13} aria-hidden className="text-gray-400" /> {formatClock(resa.start_at)}
                    </span>
                    <span className="min-w-0 flex-1 basis-40 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">{resa.customer_name}</span> · {resa.party_size} personne{resa.party_size > 1 ? 's' : ''}
                    </span>
                    <Badge tone={BOOKING_STATUS_TONE[status] ?? 'neutral'}>
                      {RESERVATION_STATUS_LABELS[status as ReservationStatus] ?? resa.status}
                    </Badge>
                    {isPending && (
                      <Button
                        size="sm"
                        icon={<Check size={14} aria-hidden />}
                        disabled={reservationMutation.isPending}
                        onClick={() => reservationMutation.mutate({ id: resa.id, status: 'confirmed' })}
                        className="min-h-9"
                        aria-label={`Confirmer la réservation de ${resa.customer_name} à ${formatClock(resa.start_at)}`}
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
            <div className="mt-4 rounded-xl bg-gray-50/70 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Prochains jours</p>
              <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                {laterReservations.map((resa) => (
                  <li key={resa.id} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="w-40 shrink-0 capitalize tabular-nums text-gray-500">
                      {new Date(resa.start_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatClock(resa.start_at)}
                    </span>
                    <span className="min-w-0 text-gray-800">{resa.customer_name} · {resa.party_size} pers.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {(showServices || showTeam) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {showServices && (
            <ShortcutTile
              icon={Scissors}
              accent="brand"
              label="Prestations sur votre site"
              value={String(activeServices.length)}
              hint={services.length !== activeServices.length ? `${services.length - activeServices.length} masquée${services.length - activeServices.length > 1 ? 's' : ''} — gérer` : 'Gérer mes prestations'}
              to="/admin/prestations"
            />
          )}
          {showTeam && (
            <ShortcutTile
              icon={Users}
              accent="sky"
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
