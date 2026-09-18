import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, MapPin, MessageCircle, Pencil, X } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import {
  getOrderById,
  updateOrderStatus,
  updateOrderDeliveryFee,
  updateOrderNotes,
  buildWhatsAppUrl,
} from '@/services/order.service'
import { formatCurrency } from '@/utils/format'
import { parseOrderOptions } from '@/utils/productOptions'
import {
  ORDER_STATUS_ACTION_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  getLinearNext,
} from '@/config/constants'
import { PageLoader } from '@/components/ui/PageLoader'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import type { OrderStatus } from '@/types'

import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'

function StatusStepper({ status }: { status: OrderStatus }) {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status)
  return (
    <ol className="mt-4 flex items-start">
      {ORDER_STATUS_FLOW.map((step, index) => {
        const reached = index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <li key={step} className="flex flex-1 flex-col items-center">
            <div className="relative w-full">
              {index < ORDER_STATUS_FLOW.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute left-1/2 top-4 h-0.5 w-full ${
                    index < currentIndex ? 'bg-brand-500' : 'bg-gray-200'
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  reached
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : isCurrent
                      ? 'border-brand-500 bg-white text-brand-600 ring-4 ring-brand-100'
                      : 'border-gray-300 bg-white text-gray-300'
                }`}
              >
                {reached ? (
                  <Check size={15} strokeWidth={3} />
                ) : isCurrent ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                ) : null}
              </span>
            </div>
            <span
              className={`mt-2 text-xs font-medium ${
                isCurrent ? 'text-brand-700' : reached ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              {ORDER_STATUS_LABELS[step]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function OrderDetailPage() {
  usePageSeo({ title: 'Commande — Bitiko', noindex: true })
  const { id } = useParams<{ id: string }>()
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const toast = useToast()
  const currency = shop?.currency ?? 'XOF'
  const [cancelOpen, setCancelOpen] = useState(false)
  const [editingFee, setEditingFee] = useState(false)
  const [feeDraft, setFeeDraft] = useState('')
  const [feeError, setFeeError] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState<string | null>(null)

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrderById(id as string),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(id as string, status),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
      toast.success(`Statut mis à jour : ${ORDER_STATUS_LABELS[status]}.`)
    },
    onError: () => toast.error('Impossible de mettre à jour le statut de la commande.'),
  })

  const feeMutation = useMutation({
    mutationFn: (fee: number) => updateOrderDeliveryFee(id as string, fee),
    onSuccess: () => {
      setEditingFee(false)
      setFeeError(null)
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
      toast.success('Frais de livraison mis à jour.')
    },
    onError: () => {
      setFeeError('Impossible de modifier le frais de livraison.')
      toast.error('Impossible de modifier le frais de livraison.')
    },
  })

  const notesMutation = useMutation({
    mutationFn: (notes: string) => updateOrderNotes(id as string, notes),
    onSuccess: () => {
      setNotesDraft(null)
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      toast.success('Notes enregistrées.')
    },
    onError: () => toast.error('Impossible d\'enregistrer les notes.'),
  })

  if (isLoading) return <PageLoader />
  if (isError || !order) return <ErrorMessage message="Commande introuvable." />

  const allowedStatuses = (ORDER_STATUS_TRANSITIONS[order.status] ?? []) as OrderStatus[]
  const allowedDestinations = allowedStatuses.filter((s) => s !== order.status)
  const next = getLinearNext(order.status)
  const cancelAllowed = allowedDestinations.includes('cancelled')
  const otherActions = allowedDestinations.filter((s) => s !== next && s !== 'cancelled')
  const isTerminal = order.status === 'delivered' || order.status === 'cancelled'
  const deliveryFee = Number(order.delivery_fee ?? 0)
  const savedNotes = order.notes ?? ''
  const notesValue = notesDraft ?? savedNotes

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/admin/commandes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Retour aux commandes
      </Link>

      <PageHeader
        title={`Commande ${order.order_number}`}
        subtitle={new Date(order.created_at).toLocaleString('fr-FR')}
        actions={
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium text-gray-500">Client</h2>
          <p className="mt-1 font-medium text-gray-900">{order.customer_name}</p>
          <a
            href={`tel:${order.customer_phone}`}
            className="block text-sm text-brand-700 hover:text-brand-800"
          >
            {order.customer_phone}
          </a>
          {order.customer_address && (
            <p className="mt-1 text-sm text-gray-600">{order.customer_address}</p>
          )}
          {order.delivery_zone_name && (
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
              <MapPin size={13} aria-hidden /> {order.delivery_zone_name}
            </p>
          )}
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              order.payment_method === 'mobile_money'
                ? 'bg-violet-50 text-violet-700'
                : 'bg-sky-50 text-sky-700'
            }`}
          >
            {order.payment_method === 'mobile_money'
              ? 'Mobile money (avant envoi)'
              : 'Espèces à la livraison'}
          </span>
          <a
            href={buildWhatsAppUrl(order.customer_phone, `À propos de votre commande #${order.order_number}.`)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <MessageCircle size={14} />
            WhatsApp
          </a>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium text-gray-500">Statut de la commande</h2>
          {order.status === 'cancelled' ? (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Cette commande a été annulée. Elle n'est plus comptée dans vos ventes.
            </div>
          ) : (
            <>
              <StatusStepper status={order.status} />
              {allowedDestinations.length > 0 ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {next && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate(next)}
                      disabled={statusMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      <Check size={15} />
                      {ORDER_STATUS_ACTION_LABELS[next]}
                    </button>
                  )}
                  {otherActions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => statusMutation.mutate(s)}
                      disabled={statusMutation.isPending}
                      className="rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                    >
                      {ORDER_STATUS_LABELS[s]}
                    </button>
                  ))}
                  {cancelAllowed && (
                    <button
                      type="button"
                      onClick={() => setCancelOpen(true)}
                      className="rounded-full border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Annuler la commande
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-500">
                  Statut final — plus aucune modification possible.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Prix unitaire</th>
              <th className="px-4 py-3 font-medium">Quantité</th>
              <th className="px-4 py-3 font-medium">Sous-total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  {item.product_name}
                  {item.variant_name && !item.product_name.includes(item.variant_name) ? ` (${item.variant_name})` : ''}
                  {parseOrderOptions(item.options).map((o) => (
                    <p key={o.label} className="text-xs text-gray-500">
                      {o.label} : {o.value}
                    </p>
                  ))}
                </td>
                <td className="px-4 py-3">{formatCurrency(Number(item.unit_price), currency)}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{formatCurrency(Number(item.subtotal), currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-xs text-gray-500">
              <td className="px-4 py-2" colSpan={3}>
                Sous-total produits
              </td>
              <td className="px-4 py-2 text-right">{formatCurrency(Number(order.total) - deliveryFee, currency)}</td>
            </tr>
            <tr className="text-xs text-gray-500">
              <td className="px-4 py-2" colSpan={3}>
                {!isTerminal ? (
                  <span className="inline-flex items-center gap-1.5">
                    Livraison (zone : {order.delivery_zone_name ?? '—'})
                    {!editingFee && (
                      <button
                        type="button"
                        onClick={() => {
                          setFeeDraft(String(Number(order.delivery_fee)))
                          setEditingFee(true)
                        }}
                        className="text-brand-600 hover:text-brand-800"
                        aria-label="Modifier le frais de livraison"
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                  </span>
                ) : (
                  <>Livraison (zone : {order.delivery_zone_name ?? '—'})</>
                )}
              </td>
              <td className="px-4 py-2 text-right">
                {editingFee ? (
                  <span className="inline-flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      autoFocus
                      value={feeDraft}
                      onChange={(e) => setFeeDraft(e.target.value)}
                      className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-xs focus:border-brand-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => feeMutation.mutate(Number(feeDraft) || 0)}
                      disabled={feeMutation.isPending}
                      className="rounded bg-brand-600 p-1 text-white hover:bg-brand-700 disabled:opacity-60"
                      aria-label="Enregistrer le frais"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFee(false)
                        setFeeError(null)
                      }}
                      className="rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50"
                      aria-label="Annuler"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ) : (
                  formatCurrency(deliveryFee, currency)
                )}
              </td>
            </tr>
            {feeError && (
              <tr className="text-xs text-red-600">
                <td className="px-4 py-1" colSpan={4}>
                  {feeError}
                </td>
              </tr>
            )}
            <tr className="border-t border-gray-100 font-semibold text-gray-900">
              <td className="px-4 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-3 text-right">{formatCurrency(Number(order.total), currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-medium text-gray-500">Notes internes</h2>
        <p className="text-xs text-gray-400">Visibles uniquement par vous, jamais par le client.</p>
        <textarea
          rows={3}
          value={notesValue}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Ex. À rappeler avant livraison…"
          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => notesMutation.mutate(notesValue)}
          disabled={notesMutation.isPending || notesValue === savedNotes}
          className="mt-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {notesMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Annuler cette commande ?"
        description={`La commande ${order.order_number} passera au statut « Annulée » et ne sera plus comptée dans vos ventes.`}
        confirmLabel="Annuler la commande"
        pending={statusMutation.isPending}
        onConfirm={() => {
          statusMutation.mutate('cancelled')
          setCancelOpen(false)
        }}
        onClose={() => setCancelOpen(false)}
      />
    </div>
  )
}
