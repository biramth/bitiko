import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CalendarDays, Scissors, Users, type LucideIcon } from 'lucide-react'
import { listShopServices } from '@/services/service.service'
import { listShopTeamMembers } from '@/services/teamMember.service'
import {
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS,
  listAppointmentsByDate,
  listUpcomingAppointments,
  type AppointmentStatus,
} from '@/services/appointment.service'
import {
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
  listReservationsByDate,
  listUpcomingReservations,
  type ReservationStatus,
} from '@/services/reservation.service'
import { formatCurrency } from '@/utils/format'

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function MiniStat({
  label,
  value,
  hint,
  icon: Icon,
  to,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  to: string
}) {
  return (
    <Link to={to} className="block transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
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

/** Bloc dashboard pour les business de service : prestations, rendez-vous,
 *  réservations et équipe. Affiché quand le business type porte au moins une
 *  capability service ; les boutiques 100 % commerce ne le voient jamais. */
export function ServiceDashboard({
  shopId,
  currency,
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
  const today = todayIso()

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
    queryFn: () => listUpcomingAppointments(shopId, 5),
    enabled: showAppointments,
  })
  const { data: reservationsToday = [] } = useQuery({
    queryKey: ['reservations', 'admin', shopId, today],
    queryFn: () => listReservationsByDate(shopId, today),
    enabled: showReservations,
  })
  const { data: upcomingReservations = [] } = useQuery({
    queryKey: ['reservations', 'upcoming', shopId],
    queryFn: () => listUpcomingReservations(shopId, 5),
    enabled: showReservations,
  })

  const activeServices = services.filter((s) => s.active)
  const pendingAppointments = appointmentsToday.filter((a) => a.status === 'pending').length
  const pendingReservations = reservationsToday.filter((r) => r.status === 'pending').length

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {showAppointments && (
          <MiniStat
            icon={CalendarDays}
            label="RDV aujourd'hui"
            value={String(appointmentsToday.length)}
            hint={pendingAppointments > 0 ? `${pendingAppointments} à confirmer` : undefined}
            to="/admin/rendez-vous"
          />
        )}
        {showReservations && (
          <MiniStat
            icon={BookOpen}
            label="Réservations aujourd'hui"
            value={String(reservationsToday.length)}
            hint={pendingReservations > 0 ? `${pendingReservations} à confirmer` : undefined}
            to="/admin/reservations"
          />
        )}
        {showServices && (
          <MiniStat
            icon={Scissors}
            label="Prestations actives"
            value={String(activeServices.length)}
            hint={services.length !== activeServices.length ? `${services.length} au total` : undefined}
            to="/admin/prestations"
          />
        )}
        {showTeam && (
          <MiniStat icon={Users} label="Équipe" value={String(team.length)} to="/admin/equipe" />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {showAppointments && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Prochains rendez-vous</h3>
              <Link to="/admin/rendez-vous" className="text-sm font-medium text-brand-700">Agenda</Link>
            </div>
            {upcomingAppointments.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Aucun rendez-vous à venir.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {upcomingAppointments.map((rdv) => (
                  <li key={rdv.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-gray-800">
                      {formatTime(rdv.start_at)} · {rdv.service?.name ?? 'Prestation'} — {rdv.customer_name}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${APPOINTMENT_STATUS_COLORS[rdv.status as AppointmentStatus] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {APPOINTMENT_STATUS_LABELS[rdv.status as AppointmentStatus] ?? rdv.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {showReservations && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Prochaines réservations</h3>
              <Link to="/admin/reservations" className="text-sm font-medium text-brand-700">Registre</Link>
            </div>
            {upcomingReservations.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Aucune réservation à venir.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {upcomingReservations.map((resa) => (
                  <li key={resa.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-gray-800">
                      {formatTime(resa.start_at)} · {resa.customer_name} · {resa.party_size} pers.
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${RESERVATION_STATUS_COLORS[resa.status as ReservationStatus] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {RESERVATION_STATUS_LABELS[resa.status as ReservationStatus] ?? resa.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {showServices && activeServices.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Prestation la plus chère : {formatCurrency(Math.max(...activeServices.map((s) => s.price)), currency)} ·{' '}
          <Link to="/admin/prestations" className="font-medium text-brand-700">Gérer les prestations</Link>
        </p>
      )}
    </div>
  )
}
