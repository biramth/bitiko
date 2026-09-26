import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopProducts } from '@/features/products/useProducts'
import { createOrder, type CreateOrderResult } from '@/services/order.service'
import { listDeliverySecteurs, listDeliveryVilles } from '@/services/deliverySecteur.service'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePageSeo } from '@/hooks/usePageSeo'
import { formatCurrency, resolveDeliveryFee, resolveZoneDeliveryFee } from '@/utils/format'
import { formatPhoneNumberForDisplay, normalizePhoneNumber, PHONE_ERROR_MESSAGES } from '@/utils/phone'
import { buildWhatsAppMessage, buildWhatsAppUrl } from '@/utils/whatsappMessage'
import { formatOptionsInline, resolveSelection, type OptionValues } from '@/utils/productOptions'
import {
  cartSubtotal,
  effectivePrice,
  lineStock,
  lineSubtotal,
  toCartItems,
  toManualProduct,
  type ManualOrderLine,
} from '@/utils/manualOrder'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/PageLoader'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import type { OptionField, PaymentMethod } from '@/types'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: 'Espèces à la livraison',
  mobile_money: 'Mobile money',
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

export function NewOrderPage() {
  usePageSeo({ title: 'Nouvelle commande — Bitiko', noindex: true })
  const queryClient = useQueryClient()
  const { data: shop, isLoading: shopLoading } = useMyShop()
  const currency = shop?.currency ?? 'XOF'

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [customerAddress, setCustomerAddress] = useState('')
  const [deliveryVilleId, setDeliveryVilleId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')

  const [lines, setLines] = useState<ManualOrderLine[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [optionValues, setOptionValues] = useState<OptionValues>({})
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [success, setSuccess] = useState<CreateOrderResult | null>(null)

  const { data: productsData, isLoading: productsLoading } = useShopProducts(shop?.id, { search })
  const availableProducts = (productsData?.products ?? [])
    .filter((p) => p.active)
    .map(toManualProduct)

  const selectedProduct = availableProducts.find((p) => p.id === selectedProductId) ?? null
  const selectedVariant = selectedProduct?.variants.find((v) => v.id === selectedVariantId) ?? null
  const availableStock = selectedVariant?.stock ?? selectedProduct?.stock ?? 0

  const { data: secteurs = [] } = useQuery({
    queryKey: ['delivery-secteurs', shop?.id],
    queryFn: () => listDeliverySecteurs(shop!.id),
    enabled: !!shop?.id,
  })
  const { data: villes = [] } = useQuery({
    queryKey: ['delivery-villes', shop?.id],
    queryFn: () => listDeliveryVilles(shop!.id),
    enabled: !!shop?.id,
  })

  const villesAvecSecteur = villes
    .filter((v) => v.is_active)
    .map((ville) => ({ ville, secteur: secteurs.find((s) => s.id === ville.secteur_id) ?? null }))
    .filter((row) => row.secteur?.is_active)
  const groupes = secteurs
    .filter((s) => s.is_active)
    .map((secteur) => ({
      secteur,
      villes: villesAvecSecteur.filter((row) => row.secteur?.id === secteur.id).map((row) => row.ville),
    }))
    .filter((g) => g.villes.length > 0)

  const hasZones = groupes.length > 0
  const selectedVille =
    villesAvecSecteur.find((row) => row.ville.id === deliveryVilleId)?.ville ?? villesAvecSecteur[0]?.ville ?? null
  const selectedSecteur = selectedVille
    ? (secteurs.find((s) => s.id === selectedVille.secteur_id) ?? null)
    : null

  const subtotal = cartSubtotal(toCartItems(lines))
  const deliveryFee = shop
    ? hasZones
      ? resolveZoneDeliveryFee(shop, subtotal, Number(selectedSecteur?.fee ?? 0))
      : resolveDeliveryFee(shop, subtotal)
    : 0
  const deliveryZoneName = hasZones && selectedVille ? selectedVille.name : 'Livraison standard'
  const estimate = subtotal + deliveryFee

  const mutation = useMutation({
    mutationFn: async () => {
      if (!shop) throw new Error('Boutique introuvable')
      const phone = normalizePhoneNumber(customerPhone)
      if (!phone.ok || !phone.value) throw new Error(PHONE_ERROR_MESSAGES[phone.error ?? 'invalid_length'])
      return createOrder({
        shopId: shop.id,
        customerName: customerName.trim(),
        customerPhone: phone.value,
        customerAddress: customerAddress.trim(),
        items: toCartItems(lines),
        deliveryFee,
        deliveryZoneName,
        paymentMethod,
      })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['orders-counts', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
      setSuccess(result)
      window.scrollTo({ top: 0 })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (lines.length === 0) {
      setFormError('Ajoutez au moins un produit à la commande.')
      return
    }
    if (!customerName.trim()) {
      setFormError('Le nom du client est requis.')
      return
    }
    const phone = normalizePhoneNumber(customerPhone)
    if (!phone.ok) {
      setPhoneError(PHONE_ERROR_MESSAGES[phone.error ?? 'invalid_length'])
      return
    }
    if (!customerAddress.trim()) {
      setFormError("L'adresse de livraison du client est requise.")
      return
    }
    setPhoneError(null)
    mutation.mutate()
  }

  const handleAddLine = () => {
    setPickerError(null)
    if (!selectedProduct) {
      setPickerError('Choisissez un produit.')
      return
    }
    if (selectedProduct.variants.length > 0 && !selectedVariantId) {
      setPickerError('Choisissez une variante.')
      return
    }
    const stock = lineStock({ product: selectedProduct, variant: selectedVariant, quantity, options: [] })
    if (quantity > stock) {
      setPickerError(`Stock insuffisant : ${stock} disponible${stock > 1 ? 's' : ''}.`)
      return
    }
    const checked = resolveSelection(selectedProduct.optionFields, optionValues)
    if (!checked.ok) {
      setPickerError(checked.error)
      return
    }
    setLines((prev) => [...prev, { product: selectedProduct, variant: selectedVariant, quantity, options: checked.options }])
    setSelectedProductId('')
    setSelectedVariantId('')
    setQuantity(1)
    setOptionValues({})
    setSearchInput('')
  }

  const adjustQty = (index: number, delta: number) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line
        const next = Math.max(1, Math.min(lineStock(line), line.quantity + delta))
        return { ...line, quantity: next }
      }),
    )
  }

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleReset = () => {
    setSuccess(null)
    setCustomerName('')
    setCustomerPhone('')
    setPhoneError(null)
    setCustomerAddress('')
    setDeliveryVilleId('')
    setPaymentMethod('cod')
    setLines([])
    setSelectedProductId('')
    setSelectedVariantId('')
    setQuantity(1)
    setOptionValues({})
    setPickerError(null)
    setFormError(null)
    setSearchInput('')
    window.scrollTo({ top: 0 })
  }

  const sendWhatsApp = () => {
    if (!success || !shop) return
    const normalized = normalizePhoneNumber(customerPhone)
    const message = buildWhatsAppMessage({
      orderNumber: success.orderNumber,
      items: success.items,
      deliveryFee,
      deliveryZoneName,
      paymentMethod,
      paymentInstructions: shop.payment_instructions,
      total: success.total,
      customerName: customerName.trim(),
      customerPhone: normalized.value ? formatPhoneNumberForDisplay(normalized.value) : customerPhone,
      customerAddress: customerAddress.trim(),
      formatCurrency: (amount) => formatCurrency(amount, currency),
    })
    window.open(buildWhatsAppUrl(shop.whatsapp_number, message), '_blank', 'noopener')
  }

  const renderOptionField = (field: OptionField) => {
    const value = optionValues[field.id] ?? ''
    return (
      <div key={field.id}>
        <label htmlFor={`opt-${field.id}`} className="mb-1 block text-sm font-medium text-gray-700">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        {field.type === 'choice' ? (
          <select
            id={`opt-${field.id}`}
            value={value}
            required={field.required}
            onChange={(e) => setOptionValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
            className={INPUT_CLASS}
          >
            <option value="">{field.required ? 'Choisissez…' : 'Optionnel'}</option>
            {field.choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`opt-${field.id}`}
            type="text"
            value={value}
            maxLength={200}
            required={field.required}
            onChange={(e) => setOptionValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.required ? 'Requis' : 'Optionnel'}
            className={INPUT_CLASS}
          />
        )}
      </div>
    )
  }

  if (shopLoading) return <PageLoader />

  if (success) {
    return (
      <div>
        <PageHeader title="Commande créée" />
        <div className="mx-auto mt-6 max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center sm:p-8">
          <CheckCircle2 size={40} className="mx-auto text-emerald-600" aria-hidden />
          <h2 className="mt-3 font-heading text-lg font-bold text-gray-900">
            Commande {success.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {success.items.length} article{success.items.length > 1 ? 's' : ''} · Total{' '}
            {formatCurrency(success.total, currency)} · Statut : En attente
          </p>
          <button
            type="button"
            onClick={sendWhatsApp}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1EBE5A]"
          >
            <MessageCircle size={16} aria-hidden /> Envoyer la commande au client sur WhatsApp
          </button>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Link
              to={`/admin/commandes/${success.orderId}`}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Voir la commande
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Nouvelle commande
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <ErrorMessage message="Impossible de charger votre boutique. Rechargez la page." />
    )
  }

  const errorMessage = formError ?? (mutation.isError ? mutation.error?.message : null)

  return (
    <div>
      <Link
        to="/admin/commandes"
        className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ArrowLeft size={14} aria-hidden /> Retour aux commandes
      </Link>
      <div className="mt-3">
        <PageHeader
          title="Nouvelle commande"
          subtitle="Enregistrez une commande reçue en dehors de la boutique (téléphone, WhatsApp, sur place)."
        />
      </div>

      <form className="mx-auto mt-6 max-w-3xl" noValidate onSubmit={handleSubmit}>
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-gray-900">Client</h2>
          </div>
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="customerName" className="mb-1 block text-sm font-medium text-gray-700">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex. Awa Diallo"
                  autoComplete="name"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="customerPhone" className="mb-1 block text-sm font-medium text-gray-700">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <input
                  id="customerPhone"
                  type="tel"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value)
                    setPhoneError(null)
                  }}
                  placeholder="77 123 45 67"
                  autoComplete="tel"
                  className={`${INPUT_CLASS} ${phoneError ? 'border-red-500' : ''}`}
                />
                {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="customerAddress" className="mb-1 block text-sm font-medium text-gray-700">
                Adresse de livraison <span className="text-red-500">*</span>
              </label>
              <textarea
                id="customerAddress"
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Quartier, ville, point de repère…"
                autoComplete="street-address"
                className={`${INPUT_CLASS} resize-none`}
              />
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-gray-900">Produits</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Ajoutez les articles commandés par le client.
            </p>
          </div>
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un produit…"
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>

            {productsLoading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : availableProducts.length === 0 ? (
              <div className="rounded-lg border border-gray-100">
                <EmptyState
                  icon={Search}
                  title={searchInput ? 'Aucun produit trouvé' : 'Aucun produit actif'}
                  description={
                    searchInput
                      ? 'Essayez un autre mot-clé.'
                      : 'Seuls les produits actifs peuvent être vendus.'
                  }
                />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {availableProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProductId(p.id)
                      setSelectedVariantId('')
                      setQuantity(1)
                      setOptionValues({})
                      setPickerError(null)
                    }}
                    className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                      selectedProductId === p.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                        <ShoppingBag size={16} className="text-gray-400" aria-hidden />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{p.name}</span>
                      <span className="block text-xs text-gray-500">
                        {formatCurrency(p.price, currency)}
                        {p.variants.length > 0 ? ` · ${p.variants.length} variante${p.variants.length > 1 ? 's' : ''}` : ''}
                        {p.stock === 0 ? ' · rupture' : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedProduct && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedProduct.variants.length > 0 && (
                    <div>
                      <label htmlFor="pickVariant" className="mb-1 block text-sm font-medium text-gray-700">
                        Variante <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="pickVariant"
                        value={selectedVariantId}
                        onChange={(e) => setSelectedVariantId(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Choisir une variante…</option>
                        {selectedProduct.variants.map((v) => (
                          <option key={v.id} value={v.id} disabled={v.stock === 0}>
                            {v.name} — {formatCurrency(v.price ?? selectedProduct.price, currency)} · stock {v.stock}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label htmlFor="pickQty" className="mb-1 block text-sm font-medium text-gray-700">
                      Quantité
                    </label>
                    <input
                      id="pickQty"
                      type="number"
                      min={1}
                      max={Math.max(1, availableStock)}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {selectedProduct.optionFields.length > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {selectedProduct.optionFields.map((field) => renderOptionField(field))}
                  </div>
                )}

                {pickerError && <p className="mt-3 text-sm text-red-600">{pickerError}</p>}

                <button
                  type="button"
                  onClick={handleAddLine}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                >
                  <Plus size={14} aria-hidden /> Ajouter au panier
                </button>
              </div>
            )}

            {lines.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="Panier vide"
                description="Sélectionnez un produit ci-dessus puis ajoutez-le à la commande."
              />
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {lines.map((line, index) => {
                  const label = line.variant ? `${line.product.name} (${line.variant.name})` : line.product.name
                  const optionsText = formatOptionsInline(line.options)
                  return (
                    <li key={`${line.product.id}-${line.variant?.id ?? 'base'}-${index}`} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                      {line.product.imageUrl ? (
                        <img
                          src={line.product.imageUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          <ShoppingBag size={18} className="text-gray-300" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">
                          {optionsText || `${formatCurrency(effectivePrice(line), currency)} l'unité`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(effectivePrice(line), currency)} × {line.quantity} ={' '}
                          <span className="font-medium text-gray-700">
                            {formatCurrency(lineSubtotal(line), currency)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustQty(index, -1)}
                          disabled={line.quantity <= 1}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Diminuer la quantité"
                        >
                          <Minus size={13} aria-hidden />
                        </button>
                        <span className="w-6 text-center text-sm font-medium text-gray-900">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => adjustQty(index, 1)}
                          disabled={line.quantity >= lineStock(line)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus size={13} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="ml-1 rounded-lg border border-transparent p-1.5 text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
                          aria-label="Retirer l'article"
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-gray-900">Livraison & paiement</h2>
          </div>
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div>
              <label htmlFor="deliveryVille" className="mb-1 block text-sm font-medium text-gray-700">
                Ville de livraison
              </label>
              {hasZones ? (
                <>
                  <select
                    id="deliveryVille"
                    value={selectedVille?.id ?? ''}
                    onChange={(e) => setDeliveryVilleId(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    {groupes.map(({ secteur, villes }) => (
                      <optgroup
                        key={secteur.id}
                        label={`${secteur.name} — ${Number(secteur.fee) > 0 ? formatCurrency(Number(secteur.fee), currency) : 'gratuite'}`}
                      >
                        {villes.map((ville) => (
                          <option key={ville.id} value={ville.id}>
                            {ville.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={12} aria-hidden /> Livraison{' '}
                    {deliveryFee > 0 ? formatCurrency(deliveryFee, currency) : 'gratuite'}
                  </p>
                </>
              ) : (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={12} aria-hidden /> Livraison standard{' '}
                  {deliveryFee > 0 ? formatCurrency(deliveryFee, currency) : 'gratuite'}
                </p>
              )}
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Mode de paiement</span>
              <div className="flex flex-col gap-2 sm:flex-row">
                {(['cod', 'mobile_money'] as PaymentMethod[]).map((method) => (
                  <label
                    key={method}
                    className={`flex flex-1 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      paymentMethod === method
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="accent-brand-600"
                    />
                    {PAYMENT_LABELS[method]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm sm:px-5">
          <div className="flex justify-between text-gray-600">
            <span>Sous-total</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="mt-1 flex justify-between text-gray-600">
            <span>Livraison</span>
            <span>{deliveryFee > 0 ? formatCurrency(deliveryFee, currency) : 'Gratuite'}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatCurrency(estimate, currency)}</span>
          </div>
        </div>

        {errorMessage && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        )}

        <div className="sticky bottom-0 mt-4 border-t border-gray-200 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-500">
                {lines.length} article{lines.length > 1 ? 's' : ''} · {paymentMethod === 'mobile_money' ? 'Mobile money' : 'Paiement à la livraison'}
              </p>
              <p className="text-base font-semibold text-gray-900">
                Total {formatCurrency(estimate, currency)}
              </p>
            </div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 size={15} aria-hidden />
              )}
              Créer la commande
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}