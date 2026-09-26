import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Plus } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import {
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS,
  createAppointment,
  listAppointmentsByDate,
  setAppointmentStatus,
  type AppointmentStatus,
} from '@/services/appointment.service'
import { listShopServices } from '@/services/service.service'
import { listShopTeamMembers } from '@/services/teamMember.service'
import { formatCurrency } from '@/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function AppointmentsPage() {
  usePageSeo({ title: 'Rendez-vous — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const toast = useToast()
  const currency = shop?.currency ?? 'XOF'

  const [date, setDate] = useState(todayIso())
  const [createOpen, setCreateOpen] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [teamMemberId, setTeamMemberId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [startTime, setStartTime] = useState('09:00')

  const { data: appointments = [], isLoading, isError } = useQuery({
    queryKey: ['appointments', 'admin', shop?.id, date],
    queryFn: () => listAppointmentsByDate(shop!.id, date),
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
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      setAppointmentStatus(id, status),
    onSuccess: (_d, v) => {
      invalidate()
      toast.success(`Rendez-vous ${APPOINTMENT_STATUS_LABELS[v.status].toLowerCase()}.`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Action impossible.'),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const service = services.find((s) => s.id === serviceId)
      if (!service) throw new Error('Choisissez une prestation.')
      const start = new Date(`${date}T${startTime}:00`)
      const end = new Date(start.getTime() + service.duration_minutes * 60000)
      return createAppointment({
        shopId: shop!.id,
        serviceId,
        teamMemberId: teamMemberId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      })
    },
    onSuccess: () => {
      invalidate()
      setCreateOpen(false)
      setCustomerName('')
      setCustomerPhone('')
      toast.success('Rendez-vous enregistré.')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Créneau indisponible.'),
  })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />

  return (
    <div>
      <PageHeader
        title="Rendez-vous"
        subtitle="Agenda du jour : confirmez, terminez ou annulez les créneaux réservés."
        actions={
          <button
            type="button"
            onClick={() => {
              createMutation.reset()
              setCreateOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={15} aria-hidden /> Nouveau rendez-vous
          </button>
        }
      />

      <div className="mt-4">
        <label htmlFor="appointments-date" className="text-sm font-medium text-gray-700">Journée</label>
        <input
          id="appointments-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || todayIso())}
          className="ml-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {appointments.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Aucun rendez-vous ce jour-là" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {appointments.map((rdv) => (
              <li key={rdv.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {formatTime(rdv.start_at)} · {rdv.service?.name ?? 'Prestation'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {rdv.customer_name} · {rdv.customer_phone}
                    {rdv.team_member ? ` · avec ${rdv.team_member.name}` : ''}
                    {rdv.service ? ` · ${formatCurrency(rdv.service.price, currency)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${APPOINTMENT_STATUS_COLORS[rdv.status as AppointmentStatus] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {APPOINTMENT_STATUS_LABELS[rdv.status as AppointmentStatus] ?? rdv.status}
                  </span>
                  {rdv.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ id: rdv.id, status: 'confirmed' })}
                      disabled={statusMutation.isPending}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                    >
                      Confirmer
                    </button>
                  )}
                  {rdv.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ id: rdv.id, status: 'done' })}
                      disabled={statusMutation.isPending}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                    >
                      Terminer
                    </button>
                  )}
                  {(rdv.status === 'pending' || rdv.status === 'confirmed') && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ id: rdv.id, status: 'cancelled' })}
                      disabled={statusMutation.isPending}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouveau rendez-vous"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !serviceId || !customerName.trim() || !customerPhone.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="rdv-service" className="block text-sm font-medium text-gray-700">Prestation</label>
            <select
              id="rdv-service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            >
              <option value="">Choisir…</option>
              {services.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rdv-team" className="block text-sm font-medium text-gray-700">Équipier (optionnel)</label>
            <select
              id="rdv-team"
              value={teamMemberId}
              onChange={(e) => setTeamMemberId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            >
              <option value="">Sans préférence</option>
              {team.filter((m) => m.active).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rdv-name" className="block text-sm font-medium text-gray-700">Cliente</label>
              <input
                id="rdv-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="rdv-phone" className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                id="rdv-phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+221…"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="rdv-time" className="block text-sm font-medium text-gray-700">Heure de début</label>
            <input
              id="rdv-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
