import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, MapPin, MessageCircle, Pencil, Phone, Printer, X } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { getOrderById, updateOrderStatus, updateOrderDeliveryFee, updateOrderNotes, buildWhatsAppUrl } from '@/services/order.service'
import { formatCurrency, timeAgo } from '@/utils/format'
import { orderStatusMessage } from '@/utils/orderMessages'
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
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { OrderStatus } from '@/types'

import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { buttonClass, controlClass } from '@/components/ui/styles'

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
                <span aria-hidden className={`absolute left-1/2 top-4 h-0.5 w-full ${index < currentIndex ? 'bg-brand-500' : 'bg-gray-200'}`} />
              )}
              <span
                className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  reached
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : isCurrent
                      ? 'border-brand-500 bg-white text-brand-600 ring-4 ring-brand-100'
                      : 'border-gray-300 bg-white text-gray-300'
                }`}
              >
                {reached ? <Check size={15} strokeWidth={3} /> : isCurrent ? <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> : null}
              </span>
            </div>
            <span className={`mt-2 whitespace-nowrap text-center text-xs font-medium ${isCurrent ? 'text-brand-700' : reached ? 'text-gray-500' : 'text-gray-400'}`}>
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['order', id] })
    queryClient.invalidateQueries({ queryKey: ['orders', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(id as string, status),
    onSuccess: (_data, status) => {
      invalidate()
      toast.success(`Statut mis à jour : ${ORDER_STATUS_LABELS[status]}.`)
    },
    onError: () => toast.error('Impossible de mettre à jour le statut de la commande.'),
  })

  const feeMutation = useMutation({
    mutationFn: (fee: number) => updateOrderDeliveryFee(id as string, fee),
    onSuccess: () => {
      setEditingFee(false)
      setFeeError(null)
      invalidate()
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
    onError: () => toast.error('Impossible d’enregistrer les notes.'),
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
  const created = new Date(order.created_at)
  const whatsappMessage = orderStatusMessage(order, shop?.name ?? 'Bitiko', currency)

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/admin/commandes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Retour aux commandes
      </Link>

      <PageHeader
        title={`Commande ${order.order_number}`}
        subtitle={`${timeAgo(order.created_at)} · ${created.toLocaleDateString('fr-FR')} à ${created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
        actions={
          <>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
            <Link to={`/admin/commandes/${order.id}/imprimer`} target="_blank" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <Printer size={15} aria-hidden /> Bon de commande
            </Link>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <div className="order-first space-y-4 lg:order-last">
          <Card>
            <h2 className="text-sm font-medium text-gray-500">Étape de la commande</h2>
            {order.status === 'cancelled' ? (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Cette commande a été annulée. Elle n’est plus comptée dans vos ventes.</div>
            ) : (
              <>
                <StatusStepper status={order.status} />
                {allowedDestinations.length > 0 ? (
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {next && (
                      <Button onClick={() => statusMutation.mutate(next)} disabled={statusMutation.isPending} icon={<Check size={15} />}>
                        {ORDER_STATUS_ACTION_LABELS[next]}
                      </Button>
                    )}
                    {otherActions.map((s) => (
                      <Button key={s} variant="secondary" onClick={() => statusMutation.mutate(s)} disabled={statusMutation.isPending}>
                        {ORDER_STATUS_LABELS[s]}
                      </Button>
                    ))}
                    {cancelAllowed && (
                      <Button variant="secondary" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setCancelOpen(true)}>
                        Annuler
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">Statut final — plus aucune modification possible.</p>
                )}
              </>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-gray-500">Client</h2>
            <p className="mt-1 text-base font-semibold text-gray-900">{order.customer_name}</p>
            <p className="text-sm text-gray-600">{order.customer_phone}</p>
            {(order.customer_address || order.delivery_zone_name) && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-gray-600">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" aria-hidden />
                <span>
                  {order.customer_address}
                  {order.delivery_zone_name && <span className="block text-xs text-gray-400">Zone : {order.delivery_zone_name}</span>}
                </span>
              </p>
            )}
            <div className="mt-3">
              <Badge tone={order.payment_method === 'mobile_money' ? 'brand' : 'info'}>
                {order.payment_method === 'mobile_money' ? 'Mobile money (avant envoi)' : 'Espèces à la livraison'}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`tel:${order.customer_phone}`} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                <Phone size={14} aria-hidden /> Appeler
              </a>
              <a
                href={buildWhatsAppUrl(order.customer_phone, whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                className={buttonClass({ variant: 'secondary', size: 'sm', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' })}
              >
                <MessageCircle size={14} aria-hidden /> WhatsApp
              </a>
            </div>
            <p className="mt-2 text-xs text-gray-400">Le message WhatsApp est pré-rempli selon l’étape de la commande.</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card padded={false}>
            <h2 className="px-4 pt-4 text-sm font-medium text-gray-500 sm:px-5">Articles ({order.items.reduce((sum, item) => sum + Number(item.quantity), 0)})</h2>
            <ul className="mt-2 divide-y divide-gray-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {item.product_name}
                      {item.variant_name && !item.product_name.includes(item.variant_name) ? ` (${item.variant_name})` : ''}
                    </p>
                    {parseOrderOptions(item.options).map((o) => (
                      <p key={o.label} className="text-xs text-gray-500">
                        {o.label} : {o.value}
                      </p>
                    ))}
                    <p className="mt-0.5 text-sm text-gray-500">
                      {item.quantity} × {formatCurrency(Number(item.unit_price), currency)}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium text-gray-900">{formatCurrency(Number(item.subtotal), currency)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-gray-100 px-4 py-3 text-sm sm:px-5">
              <div className="flex justify-between text-gray-500">
                <dt>Sous-total produits</dt>
                <dd>{formatCurrency(Number(order.total) - deliveryFee, currency)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 text-gray-500">
                <dt className="inline-flex items-center gap-1.5">
                  Livraison{order.delivery_zone_name ? ` (${order.delivery_zone_name})` : ''}
                  {!isTerminal && !editingFee && (
                    <button
                      type="button"
                      onClick={() => {
                        setFeeDraft(String(Number(order.delivery_fee)))
                        setEditingFee(true)
                      }}
                      className="text-brand-600 hover:text-brand-800"
                      aria-label="Modifier le frais de livraison"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </dt>
                <dd>
                  {editingFee ? (
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        autoFocus
                        value={feeDraft}
                        onChange={(e) => setFeeDraft(e.target.value)}
                        className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => feeMutation.mutate(Number(feeDraft) || 0)}
                        disabled={feeMutation.isPending}
                        className="rounded bg-brand-600 p-1.5 text-white hover:bg-brand-700 disabled:opacity-60"
                        aria-label="Enregistrer le frais"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFee(false)
                          setFeeError(null)
                        }}
                        className="rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                        aria-label="Annuler"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ) : (
                    formatCurrency(deliveryFee, currency)
                  )}
                </dd>
              </div>
              {feeError && <p className="text-xs text-red-600">{feeError}</p>}
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
                <dt>Total</dt>
                <dd>{formatCurrency(Number(order.total), currency)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-gray-500">Notes internes</h2>
            <p className="text-xs text-gray-400">Visibles uniquement par vous, jamais par le client.</p>
            <textarea
              rows={3}
              value={notesValue}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Ex. À rappeler avant livraison…"
              className={`${controlClass()} mt-2`}
            />
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => notesMutation.mutate(notesValue)} disabled={notesMutation.isPending || notesValue === savedNotes}>
              {notesMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Annuler cette commande ?"
        description={`La commande ${order.order_number} passera au statut « Annulée », le stock des articles sera remis en vente et elle ne sera plus comptée dans vos ventes.`}
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
