import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { updateShop, uploadShopLogo } from '@/services/shop.service'
import { shopUrl } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'
import { usePageSeo } from '@/hooks/usePageSeo'

export function SettingsPage() {
  usePageSeo({ title: 'Paramètres — Bitiko', noindex: true })
  const { data: shop, isLoading } = useMyShop()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [currency, setCurrency] = useState('XOF')
  const [address, setAddress] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (shop) {
      setName(shop.name)
      setDescription(shop.description ?? '')
      setWhatsappNumber(shop.whatsapp_number)
      setCurrency(shop.currency)
      setAddress(shop.address ?? '')
      setLogoUrl(shop.logo_url)
    }
  }, [shop])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateShop(shop!.id, {
        name: name.trim(),
        description: description.trim() || null,
        whatsapp_number: whatsappNumber.trim(),
        currency,
        address: address.trim() || null,
        logo_url: logoUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: () => setError('Impossible d\'enregistrer les paramètres.'),
  })

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !shop) return
    try {
      const url = await uploadShopLogo(shop.id, file)
      setLogoUrl(url)
    } catch {
      setError("Échec de l'envoi du logo.")
    }
  }

  if (isLoading) return <Spinner />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900">Paramètres de la boutique</h1>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-gray-500">Adresse de votre boutique</p>
          <p className="text-sm font-medium text-gray-900">{shopUrl(shop.slug)}</p>
        </div>
        <a
          href={shopUrl(shop.slug)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          Voir <ExternalLink size={14} />
        </a>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Domaine personnalisé bientôt disponible pour remplacer cette adresse.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          saveMutation.mutate()
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <span className="block text-sm font-medium text-gray-700">Logo</span>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {logoUrl && <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Changer le logo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </div>
        </div>

        <div>
          <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
            Nom de la boutique
          </label>
          <input
            id="shopName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="shopDescription" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="shopDescription"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
            Numéro WhatsApp (avec indicatif pays)
          </label>
          <input
            id="whatsapp"
            required
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+221771234567"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            C'est ce numéro qui recevra les commandes des clients via WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
              Devise
            </label>
            <input
              id="currency"
              required
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
