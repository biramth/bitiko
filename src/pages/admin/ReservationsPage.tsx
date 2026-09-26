import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import {
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
  createReservation,
  listReservationsByDate,
  setReservationStatus,
  type ReservationStatus,
} from '@/services/reservation.service'
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

export function ReservationsPage() {
  usePageSeo({ title: 'Réservations — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [date, setDate] = useState(todayIso())
  const [createOpen, setCreateOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [partySize, setPartySize] = useState('2')
  const [startTime, setStartTime] = useState('12:30')

  const { data: reservations = [], isLoading, isError } = useQuery({
    queryKey: ['reservations', 'admin', shop?.id, date],
    queryFn: () => listReservationsByDate(shop!.id, date),
    enabled: !!shop?.id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['reservations', 'admin', shop?.id] })
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) =>
      setReservationStatus(id, status),
    onSuccess: (_d, v) => {
      invalidate()
      toast.success(`Réservation ${RESERVATION_STATUS_LABELS[v.status].toLowerCase()}.`)
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
      toast.success('Réservation enregistrée.')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.'),
  })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />

  return (
    <div>
      <PageHeader
        title="Réservations"
        subtitle="Tables du jour : confirmez, terminez ou annulez les réservations."
        actions={
          <button
            type="button"
            onClick={() => {
              createMutation.reset()
              setCreateOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={15} aria-hidden /> Nouvelle réservation
          </button>
        }
      />

      <div className="mt-4">
        <label htmlFor="reservations-date" className="text-sm font-medium text-gray-700">Journée</label>
        <input
          id="reservations-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || todayIso())}
          className="ml-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {reservations.length === 0 ? (
          <EmptyState icon={BookOpen} title="Aucune réservation ce jour-là" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {reservations.map((resa) => (
              <li key={resa.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {formatTime(resa.start_at)} · {resa.customer_name} · {resa.party_size} pers.
                  </p>
                  <p className="text-sm text-gray-500">{resa.customer_phone}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RESERVATION_STATUS_COLORS[resa.status as ReservationStatus] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {RESERVATION_STATUS_LABELS[resa.status as ReservationStatus] ?? resa.status}
                  </span>
                  {resa.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ id: resa.id, status: 'confirmed' })}
                      disabled={statusMutation.isPending}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                    >
                      Confirmer
                    </button>
                  )}
                  {resa.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ id: resa.id, status: 'done' })}
                      disabled={statusMutation.isPending}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                    >
                      Terminer
                    </button>
                  )}
                  {(resa.status === 'pending' || resa.status === 'confirmed') && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ id: resa.id, status: 'cancelled' })}
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
        title="Nouvelle réservation"
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
              disabled={createMutation.isPending || !customerName.trim() || !customerPhone.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="resa-name" className="block text-sm font-medium text-gray-700">Client</label>
              <input
                id="resa-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="resa-phone" className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                id="resa-phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+221…"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="resa-party" className="block text-sm font-medium text-gray-700">Couverts</label>
              <input
                id="resa-party"
                type="number"
                min={1}
                max={100}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="resa-time" className="block text-sm font-medium text-gray-700">Heure</label>
              <input
                id="resa-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
