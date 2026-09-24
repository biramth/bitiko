import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Pencil, Search, Users } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  CUSTOMER_SEGMENT_LABELS,
  customerWhatsappHref,
  listCustomers,
  updateCustomer,
  type Customer,
  type CustomerSegment,
} from '@/services/customer.service'
import { formatCurrency } from '@/utils/format'
import { CUSTOMERS_PAGE_SIZE } from '@/config/constants'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'

const SEGMENTS: CustomerSegment[] = ['all', 'new', 'inactive', 'top']

function RelanceButton({ customer, shopName, compact = false }: { customer: Customer; shopName: string; compact?: boolean }) {
  return (
    <a
      href={customerWhatsappHref(customer.phone, customer.name, shopName)}
      target="_blank"
      rel="noreferrer"
      title={`Relancer ${customer.name || customer.phone} sur WhatsApp`}
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 font-medium text-emerald-700 transition-colors hover:bg-emerald-100 ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <MessageCircle size={13} aria-hidden /> Relancer
    </a>
  )
}

export function CustomersPage() {
  usePageSeo({ title: 'Clients — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [segment, setSegment] = useState<CustomerSegment>('all')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const currency = shop?.currency ?? 'XOF'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', shop?.id, segment, page, search],
    queryFn: () => listCustomers(shop!.id, page, segment, search || undefined),
    enabled: !!shop?.id,
  })

  const [editing, setEditing] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')

  const updateMutation = useMutation({
    mutationFn: () => updateCustomer(editing!.id, { name: editName.trim() || editing!.name, address: editAddress.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', shop?.id] })
      setEditing(null)
    },
  })

  const openEdit = (customer: Customer) => {
    setEditName(customer.name)
    setEditAddress(customer.address ?? '')
    updateMutation.reset()
    setEditing(customer)
  }

  const customers = data?.customers ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / CUSTOMERS_PAGE_SIZE)) : 1

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Vos clientes, dédupliquées par téléphone depuis vos commandes — relancez-les sur WhatsApp."
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => {
            const active = segment === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSegment(s)
                  setPage(1)
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                  active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CUSTOMER_SEGMENT_LABELS[s]}
              </button>
            )
          })}
        </div>

        <div className="relative sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1)
            }}
            placeholder="Nom, téléphone…"
            aria-label="Rechercher un client"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isLoading && <Spinner />}
        {isError && <ErrorMessage />}
        {!isLoading && !isError && customers.length === 0 && (
          <EmptyState icon={Users} title="Aucun client pour ce filtre" />
        )}
        {!isLoading && customers.length > 0 && (
          <>
            {/* Cards below md. */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {customers.map((customer) => (
                <li key={customer.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{customer.name || customer.phone}</p>
                      <p className="text-xs text-gray-400">{customer.phone}</p>
                    </div>
                    <p className="shrink-0 font-medium text-gray-900">{formatCurrency(Number(customer.total_spent), currency)}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {customer.orders_count} commande{customer.orders_count > 1 ? 's' : ''} · dernière le{' '}
                    {customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString('fr-FR') : '—'}
                  </p>
                  <div className="flex items-center gap-2">
                    <RelanceButton customer={customer} shopName={shop?.name ?? ''} compact />
                    <button
                      type="button"
                      onClick={() => openEdit(customer)}
                      aria-label={`Corriger ${customer.name || customer.phone}`}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      <Pencil size={12} aria-hidden /> Corriger
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Table from md up. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Commandes</th>
                    <th className="px-4 py-3 font-medium">Total dépensé</th>
                    <th className="px-4 py-3 font-medium">Dernière commande</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-3">
                        {customer.name || <span className="text-gray-400">—</span>}
                        <div className="text-xs text-gray-400">{customer.phone}</div>
                      </td>
                      <td className="px-4 py-3">{customer.orders_count}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(customer.total_spent), currency)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <RelanceButton customer={customer} shopName={shop?.name ?? ''} compact />
                          <button
                            type="button"
                            onClick={() => openEdit(customer)}
                            aria-label={`Corriger ${customer.name || customer.phone}`}
                            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Pencil size={14} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Corriger la fiche client"
        description="Nom et adresse affichés ici. Les compteurs restent calculés depuis vos commandes."
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="customer-name" className="block text-sm font-medium text-gray-700">Nom</label>
            <input
              id="customer-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="customer-address" className="block text-sm font-medium text-gray-700">Adresse</label>
            <input
              id="customer-address"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none"
            />
          </div>
          {updateMutation.isError && <p className="text-sm text-red-600">L'enregistrement a échoué. Réessayez.</p>}
        </div>
      </Dialog>
    </div>
  )
}
