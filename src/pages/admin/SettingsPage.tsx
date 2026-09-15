import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Image,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plus,
  Store,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { updateShop, uploadShopBanner, uploadShopLogo } from '@/services/shop.service'
import {
  createDeliverySecteur,
  createDeliveryVille,
  deleteDeliverySecteur,
  deleteDeliveryVille,
  listDeliverySecteurs,
  listDeliveryVilles,
  updateDeliverySecteur,
  updateDeliveryVille,
} from '@/services/deliverySecteur.service'
import { contrastWithWhite, formatCurrency, normalizeCurrency, whatsappHref } from '@/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageSeo } from '@/hooks/usePageSeo'
import type { DeliverySecteur } from '@/types'

const CURRENCIES = ['XOF', 'XAF', 'GNF', 'NGN', 'GHS', 'KES', 'MAD', 'EUR', 'USD', 'GBP', 'CAD']

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

type SectionKey = 'general' | 'appearance' | 'contact' | 'shipping' | 'domaine' | 'compte'

const SECTIONS: { key: SectionKey; label: string; icon: typeof Phone }[] = [
  { key: 'general', label: 'Général', icon: Store },
  { key: 'appearance', label: 'Apparence', icon: ImagePlus },
  { key: 'contact', label: 'Contact & devise', icon: Phone },
  { key: 'shipping', label: 'Livraison & stock', icon: Truck },
  { key: 'domaine', label: 'Domaine personnalisé', icon: Globe },
  { key: 'compte', label: 'Mon compte', icon: User },
]

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Phone
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <header className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={18} aria-hidden />
        </span>
        <div>
          <h2 className="font-heading font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  )
}

function AccountSection() {
  const { user, updateFullName, updateEmail, updatePassword } = useAuth()

  const [fullName, setFullName] = useState((user?.user_metadata?.full_name as string | undefined) ?? '')
  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [email, setEmail] = useState(user?.email ?? '')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'saving' | 'sent' | 'error'>('idle')
  const [emailError, setEmailError] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameStatus('saving')
    const { error } = await updateFullName(fullName.trim())
    setNameStatus(error ? 'error' : 'saved')
    if (!error) setTimeout(() => setNameStatus('idle'), 2500)
  }

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)
    if (email.trim() === user?.email) return
    setEmailStatus('saving')
    const { error } = await updateEmail(email.trim())
    if (error) {
      setEmailStatus('error')
      setEmailError(error)
    } else {
      setEmailStatus('sent')
    }
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.')
      setPasswordStatus('error')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les deux mots de passe ne correspondent pas.')
      setPasswordStatus('error')
      return
    }
    setPasswordStatus('saving')
    const { error } = await updatePassword(newPassword)
    if (error) {
      setPasswordStatus('error')
      setPasswordError(error)
    } else {
      setPasswordStatus('saved')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordStatus('idle'), 2500)
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <Card icon={User} title="Profil" description="Votre nom, affiché dans l'espace d'administration.">
        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ex. Aïssatou Diop"
              className={inputClass}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {nameStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <Check size={14} /> Enregistré
                </span>
              )}
              {nameStatus === 'error' && <span className="text-red-600">Impossible d'enregistrer.</span>}
            </span>
            <button
              type="submit"
              disabled={nameStatus === 'saving' || !fullName.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {nameStatus === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Card>

      <Card icon={MessageCircle} title="Adresse e-mail" description="Utilisée pour vous connecter à Bitiko.">
        <form onSubmit={handleSaveEmail} className="space-y-3">
          <div>
            <label htmlFor="accountEmail" className="block text-sm font-medium text-gray-700">
              E-mail
            </label>
            <input
              id="accountEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          {emailStatus === 'sent' && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Un lien de confirmation a été envoyé à cette adresse. Le changement prendra effet une fois le lien
              ouvert.
            </p>
          )}
          {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={emailStatus === 'saving' || !email.trim() || email.trim() === user?.email}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {emailStatus === 'saving' ? 'Envoi…' : "Changer l'e-mail"}
            </button>
          </div>
        </form>
      </Card>

      <Card icon={Phone} title="Mot de passe" description="Choisissez un mot de passe d'au moins 6 caractères.">
        <form onSubmit={handleSavePassword} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          {passwordStatus === 'saved' && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <Check size={14} /> Mot de passe mis à jour
            </p>
          )}
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordStatus === 'saving' || !newPassword || !confirmPassword}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {passwordStatus === 'saving' ? 'Enregistrement…' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function DomainLock() {
  return (
    <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Lock size={24} aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-bold text-gray-900">Domaine personnalisé réservé au plan Pro</h2>
      <p className="max-w-sm text-sm text-gray-500">
        Passez à Pro pour connecter votre propre nom de domaine (ex. boutique.votremarque.com) à votre boutique
        Bitiko, à la place du sous-domaine gratuit.
      </p>
      <Link
        to="/admin/facturation"
        className="mt-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Passer à Pro
      </Link>
    </div>
  )
}

const DOMAIN_PATTERN = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

function DomainSection({ shop }: { shop: NonNullable<ReturnType<typeof useMyShop>['data']> }) {
  const { plan, isLoading: planLoading } = useShopPlan(shop.id)
  const queryClient = useQueryClient()

  const [domain, setDomain] = useState(shop.custom_domain ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: (value: string | null) => updateShop(shop.id, { custom_domain: value }),
    onSuccess: () => {
      setStatus('saved')
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      setTimeout(() => setStatus('idle'), 2500)
    },
    onError: (err: unknown) => {
      setStatus('error')
      const code = (err as { code?: string } | null)?.code
      setError(
        code === '23505'
          ? 'Ce domaine est déjà utilisé par une autre boutique.'
          : "Impossible d'enregistrer ce domaine.",
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = domain.trim().toLowerCase()
    if (trimmed && !DOMAIN_PATTERN.test(trimmed)) {
      setError('Domaine invalide. Exemple : boutique.votremarque.com')
      setStatus('error')
      return
    }
    setStatus('saving')
    saveMutation.mutate(trimmed || null)
  }

  if (planLoading) return <Spinner />
  if (!plan.customDomainAllowed) return <DomainLock />

  return (
    <div className="mt-6 space-y-6">
      <Card
        icon={Globe}
        title="Domaine personnalisé"
        description="Connectez votre propre nom de domaine à votre boutique."
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700">
              Domaine
            </label>
            <input
              id="customDomain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="boutique.votremarque.com"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">
              Laissez vide pour revenir au sous-domaine gratuit ({shop.slug}.bitiko.shop).
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {status === 'saved' && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <Check size={14} /> Enregistré
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={status === 'saving'}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {status === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Card>

      {shop.custom_domain && (
        <Card
          icon={Globe}
          title="Configuration DNS"
          description="Ajoutez cet enregistrement chez votre registrar pour pointer ce domaine vers Bitiko."
        >
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-700">
            <div>
              <p className="text-[10px] uppercase text-gray-400">Type</p>
              CNAME
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-400">Nom</p>
              {shop.custom_domain.split('.').length > 2 ? shop.custom_domain.split('.')[0] : '@'}
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-400">Valeur</p>
              cname.vercel-dns.com
            </div>
          </div>
          <p className="text-xs text-gray-500">
            La propagation DNS peut prendre jusqu'à 24-48h. L'activation finale (certificat sécurisé inclus) est
            confirmée par l'équipe Bitiko une fois le DNS détecté.
          </p>
        </Card>
      )}
    </div>
  )
}

export function SettingsPage() {
  usePageSeo({ title: 'Paramètres — Bitiko', noindex: true })
  const { data: shop, isLoading } = useMyShop()
  const { section: sectionParam } = useParams<{ section: string }>()

  if (isLoading) return <Spinner />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>
  if (!SECTIONS.some((s) => s.key === sectionParam)) {
    return <Navigate to="/admin/parametres/general" replace />
  }

  return <SettingsForm key={shop.id} shop={shop} section={sectionParam as SectionKey} />
}

function SettingsForm({
  shop,
  section,
}: {
  shop: NonNullable<ReturnType<typeof useMyShop>['data']>
  section: SectionKey
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(shop.name)
  const [description, setDescription] = useState(shop.description ?? '')
  const [whatsappNumber, setWhatsappNumber] = useState(shop.whatsapp_number)
  const [currency, setCurrency] = useState(shop.currency)
  const [address, setAddress] = useState(shop.address ?? '')
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(shop.social_links ?? {})
  const [logoUrl, setLogoUrl] = useState<string | null>(shop.logo_url)
  const [bannerUrl, setBannerUrl] = useState<string | null>(shop.banner_url)
  const [themeColor, setThemeColor] = useState(shop.theme_color)
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(
    shop.free_delivery_threshold != null ? String(Number(shop.free_delivery_threshold)) : '',
  )
  const [lowStockThreshold, setLowStockThreshold] = useState(String(Number(shop.low_stock_threshold ?? 5)))
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: zones = [] } = useQuery({
    queryKey: ['delivery-secteurs', shop.id],
    queryFn: () => listDeliverySecteurs(shop.id),
  })
  const { data: allVilles = [] } = useQuery({
    queryKey: ['delivery-villes', shop.id],
    queryFn: () => listDeliveryVilles(shop.id),
  })

  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [editZoneName, setEditZoneName] = useState('')
  const [editZoneFee, setEditZoneFee] = useState('')
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneFee, setNewZoneFee] = useState('')
  const [zoneError, setZoneError] = useState<string | null>(null)
  const [zoneToDelete, setZoneToDelete] = useState<DeliverySecteur | null>(null)

  const [expandedSecteurId, setExpandedSecteurId] = useState<string | null>(null)
  const [newVilleName, setNewVilleName] = useState('')
  const [editingVilleId, setEditingVilleId] = useState<string | null>(null)
  const [editVilleName, setEditVilleName] = useState('')
  const [villeError, setVilleError] = useState<string | null>(null)
  const [villeToDelete, setVilleToDelete] = useState<{ id: string; name: string } | null>(null)

  const invalidateZones = () => queryClient.invalidateQueries({ queryKey: ['delivery-secteurs', shop.id] })
  const invalidateVilles = () => queryClient.invalidateQueries({ queryKey: ['delivery-villes', shop.id] })

  const addZoneMutation = useMutation({
    mutationFn: () => createDeliverySecteur({ shopId: shop.id, name: newZoneName, fee: Number(newZoneFee) || 0 }),
    onSuccess: () => {
      setNewZoneName('')
      setNewZoneFee('')
      setZoneError(null)
      invalidateZones()
    },
    onError: () => setZoneError('Impossible d\'ajouter cette zone. Vérifiez que le nom n\'existe pas déjà.'),
  })

  const saveZoneMutation = useMutation({
    mutationFn: ({ zone }: { zone: DeliverySecteur }) =>
      updateDeliverySecteur(zone.id, { name: editZoneName, fee: Number(editZoneFee) || 0 }),
    onSuccess: () => {
      setEditingZoneId(null)
      setZoneError(null)
      invalidateZones()
    },
    onError: () => setZoneError('Impossible d\'enregistrer cette zone.'),
  })

  const toggleZoneMutation = useMutation({
    mutationFn: ({ zone }: { zone: DeliverySecteur }) => updateDeliverySecteur(zone.id, { is_active: !zone.is_active }),
    onSuccess: invalidateZones,
    onError: () => setZoneError('Impossible de modifier cette zone.'),
  })

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => deleteDeliverySecteur(zoneId),
    onSuccess: () => {
      setZoneToDelete(null)
      invalidateZones()
      invalidateVilles()
    },
    onError: () => setZoneError('Impossible de supprimer cette zone.'),
  })

  const addVilleMutation = useMutation({
    mutationFn: ({ secteurId }: { secteurId: string }) =>
      createDeliveryVille({ shopId: shop.id, secteurId, name: newVilleName }),
    onSuccess: () => {
      setNewVilleName('')
      setVilleError(null)
      invalidateVilles()
    },
    onError: () => setVilleError('Impossible d\'ajouter cette ville. Vérifiez que le nom n\'existe pas déjà.'),
  })

  const saveVilleMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateDeliveryVille(id, { name }),
    onSuccess: () => {
      setEditingVilleId(null)
      setVilleError(null)
      invalidateVilles()
    },
    onError: () => setVilleError('Impossible d\'enregistrer cette ville.'),
  })

  const toggleVilleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateDeliveryVille(id, { is_active }),
    onSuccess: invalidateVilles,
    onError: () => setVilleError('Impossible de modifier cette ville.'),
  })

  const deleteVilleMutation = useMutation({
    mutationFn: (id: string) => deleteDeliveryVille(id),
    onSuccess: () => {
      setVilleToDelete(null)
      invalidateVilles()
    },
    onError: () => setVilleError('Impossible de supprimer cette ville.'),
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      updateShop(shop.id, {
        name: name.trim(),
        description: description.trim() || null,
        whatsapp_number: whatsappNumber.trim(),
        currency: normalizeCurrency(currency),
        address: address.trim() || null,
        social_links: Object.fromEntries(
          Object.entries(socialLinks)
            .map(([key, url]) => [key, url.trim()])
            .filter(([, url]) => url),
        ),
        logo_url: logoUrl,
        banner_url: bannerUrl,
        theme_color: themeColor,
        free_delivery_threshold: freeDeliveryThreshold.trim() ? Number(freeDeliveryThreshold) : null,
        low_stock_threshold: Number(lowStockThreshold) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-shop'] })
      setSaved(true)
      setError(null)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: () => setError('Impossible d\'enregistrer les paramètres. Réessayez.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Le nom de la boutique est requis.')
      navigate('/admin/parametres/general')
      return
    }
    if (!whatsappNumber.trim()) {
      setError('Le numéro WhatsApp est requis pour recevoir les commandes.')
      navigate('/admin/parametres/contact')
      return
    }
    if (!/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) {
      setError('Code devise invalide. Utilisez un code ISO 4217 à 3 lettres (ex. XOF, EUR).')
      navigate('/admin/parametres/contact')
      return
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(themeColor)) {
      setError('Couleur invalide.')
      navigate('/admin/parametres/appearance')
      return
    }
    saveMutation.mutate()
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !shop) return
    setUploadingLogo(true)
    setError(null)
    try {
      const url = await uploadShopLogo(shop.id, file)
      setLogoUrl(url)
    } catch {
      setError("Échec de l'envoi du logo.")
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !shop) return
    setUploadingBanner(true)
    setError(null)
    try {
      const url = await uploadShopBanner(shop.id, file)
      setBannerUrl(url)
    } catch {
      setError("Échec de l'envoi de la bannière.")
    } finally {
      setUploadingBanner(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
    }
  }

  const freeDeliveryValue = Number(freeDeliveryThreshold) || 0
  const isValidThemeColor = /^#[0-9a-fA-F]{6}$/.test(themeColor)
  const lowContrast = isValidThemeColor && contrastWithWhite(themeColor) < 3

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Personnalisez l'apparence, la livraison et le stock de votre boutique.
        </p>
      </header>

      {/* Sur desktop, ces sections se naviguent depuis le menu "Paramètres" de la
          barre latérale ; cette rangée d'onglets ne sert que sur mobile, où la
          barre latérale est masquée. */}
      <nav className="mt-6 flex gap-1 overflow-x-auto pb-1 lg:hidden">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            to={`/admin/parametres/${key}`}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              section === key ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon size={15} aria-hidden className="shrink-0" />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        ))}
      </nav>

      {section === 'compte' ? (
        <AccountSection />
      ) : section === 'domaine' ? (
        <DomainSection shop={shop} />
      ) : (
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="space-y-6">
          {section === 'general' && (
            <Card icon={Store} title="Général" description="Le nom et la description de votre boutique.">
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
                  Nom de la boutique
                </label>
                <input
                  id="shopName"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex. Paletostring"
                  className={inputClass}
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
                  placeholder="Décrivez votre boutique en quelques mots…"
                  className={inputClass}
                />
              </div>
            </Card>
          )}

          {section === 'appearance' && (
            <Card icon={ImagePlus} title="Apparence" description="Logo, bannière et couleur affichés sur la boutique.">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-sand-50">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo de la boutique" className="h-full w-full object-cover" />
                  ) : (
                    <Store size={22} className="text-gray-300" aria-hidden />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {uploadingLogo ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ImagePlus size={14} />
                    )}
                    {uploadingLogo ? 'Envoi…' : 'Changer le logo'}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Trash2 size={14} /> Retirer
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700">Bannière de la boutique</span>
                <div className="mt-1.5 aspect-[3/1] w-full overflow-hidden rounded-xl border border-gray-200 bg-sand-50">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Bannière de la boutique" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <Image size={28} aria-hidden />
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {uploadingBanner ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ImagePlus size={14} />
                    )}
                    {uploadingBanner ? 'Envoi…' : bannerUrl ? 'Changer la bannière' : 'Ajouter une bannière'}
                  </button>
                  {bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setBannerUrl(null)}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Trash2 size={14} /> Retirer
                    </button>
                  )}
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Affichée en haut de la page d'accueil de votre boutique. Format large recommandé (ex. 1600×530px).
                </p>
              </div>

              <div>
                <label htmlFor="themeColor" className="block text-sm font-medium text-gray-700">
                  Couleur de la boutique
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    id="themeColor"
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-1"
                  />
                  <input
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    maxLength={7}
                    placeholder="#d9612e"
                    className={`${inputClass} mt-0 max-w-[9rem] font-mono uppercase`}
                  />
                </div>
                {lowContrast ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle size={13} aria-hidden /> Cette couleur est trop claire : le texte blanc des boutons sera difficile à lire.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Utilisée pour les boutons et accents sur votre boutique.
                  </p>
                )}
              </div>
            </Card>
          )}

          {section === 'contact' && (
            <Card icon={Phone} title="Contact & devise" description="Comment vos clients vous joignent et paient.">
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                  Numéro WhatsApp
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="whatsapp"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+221771234567"
                    className={inputClass}
                  />
                  {whatsappNumber.replace(/[^0-9]/g, '') && (
                    <a
                      href={whatsappHref(whatsappNumber)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageCircle size={14} /> Tester
                    </a>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  C'est ce numéro qui recevra les commandes de vos clients sur WhatsApp.
                </p>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Adresse
                </label>
                <input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ville, quartier…"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Devise
                </label>
                <input
                  id="currency"
                  list="currency-options"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                  placeholder="XOF"
                  className={inputClass}
                />
                <datalist id="currency-options">
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-gray-500">
                  Exemple d'affichage : {formatCurrency(12500, currency) || '—'}
                </p>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700">Réseaux sociaux</span>
                <p className="mt-0.5 text-xs text-gray-500">Affichés dans le footer de votre boutique.</p>
                <div className="mt-2 space-y-2">
                  {[
                    { key: 'facebook', placeholder: 'https://facebook.com/...' },
                    { key: 'instagram', placeholder: 'https://instagram.com/...' },
                    { key: 'tiktok', placeholder: 'https://tiktok.com/@...' },
                    { key: 'x', placeholder: 'https://x.com/...' },
                  ].map(({ key, placeholder }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs font-medium capitalize text-gray-500">{key}</span>
                      <input
                        value={socialLinks[key] ?? ''}
                        onChange={(e) => setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className={`${inputClass} mt-0`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {section === 'shipping' && (
            <Card icon={Truck} title="Livraison & stock" description="Les zones de livraison et les règles appliquées à vos commandes.">
              <p className="rounded-lg bg-sand-50 px-3 py-2 text-xs text-ink-700/70">
                La livraison est facturée selon la zone choisie par le client au moment du paiement.
                {freeDeliveryValue > 0 &&
                  ` Livraison offerte pour toute commande de ${formatCurrency(freeDeliveryValue, currency)} ou plus.`}
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="freeDeliveryThreshold" className="block text-sm font-medium text-gray-700">
                    Livraison offerte dès
                  </label>
                  <input
                    id="freeDeliveryThreshold"
                    type="number"
                    min="0"
                    step="0.01"
                    value={freeDeliveryThreshold}
                    onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                    placeholder="Laisser vide = jamais"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700">
                    Alerte stock faible sous
                  </label>
                  <input
                    id="lowStockThreshold"
                    type="number"
                    min="0"
                    step="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Package size={12} aria-hidden /> Les produits au stock égal ou inférieur sont signalés dans votre
                    tableau de bord.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <MapPin size={15} aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Zones de livraison</h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Par secteur (quartier, ville…). Ajoutez, renommez ou fixez le tarif de chaque zone comme vous le
                      souhaitez. Développez un secteur pour gérer ses villes — le tarif du secteur s'applique à toutes ses villes.
                    </p>
                  </div>
                </div>

                {zoneError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{zoneError}</p>}
                {villeError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{villeError}</p>}

                <div className="mt-3 space-y-3">
                  {zones.length === 0 && !addZoneMutation.isPending && (
                    <p className="rounded-lg bg-white px-3 py-2 text-xs text-gray-400">
                      Aucune zone configurée. Ajoutez-en une ci-dessous.
                    </p>
                  )}
                  {zones.map((zone) => {
                    const zoneVilles = allVilles.filter((v) => v.secteur_id === zone.id)
                    const isExpanded = expandedSecteurId === zone.id

                    if (editingZoneId === zone.id) {
                      return (
                        <div key={zone.id} className="rounded-lg border border-brand-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={editZoneName}
                              onChange={(e) => setEditZoneName(e.target.value)}
                              placeholder="Nom du secteur"
                              className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editZoneFee}
                                onChange={(e) => setEditZoneFee(e.target.value)}
                                className="w-28 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
                              />
                              <span className="text-xs text-gray-400">{currency}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => saveZoneMutation.mutate({ zone })}
                              disabled={saveZoneMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                            >
                              <Check size={13} /> Enregistrer
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingZoneId(null)}
                              className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                              aria-label="Annuler"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={zone.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {/* Secteur header */}
                        <div className="flex flex-wrap items-center gap-2 p-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedSecteurId(isExpanded ? null : zone.id)}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
                            aria-label={isExpanded ? 'Réduire' : 'Développer'}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <span className={`min-w-0 flex-1 text-sm ${zone.is_active ? 'font-medium text-gray-900' : 'text-gray-400 line-through'}`}>
                            {zone.name}
                          </span>
                          <span className="text-xs text-gray-500">{zoneVilles.length} ville{zoneVilles.length > 1 ? 's' : ''}</span>
                          <span className="text-sm text-gray-600">
                            {Number(zone.fee) > 0 ? formatCurrency(Number(zone.fee), currency) : 'Gratuite'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleZoneMutation.mutate({ zone })}
                            disabled={toggleZoneMutation.isPending}
                            title={zone.is_active ? 'Désactiver' : 'Activer'}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              zone.is_active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {zone.is_active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingZoneId(zone.id)
                              setEditZoneName(zone.name)
                              setEditZoneFee(String(Number(zone.fee)))
                            }}
                            className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                            aria-label="Modifier le secteur"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoneToDelete(zone)}
                            className="rounded-md border border-gray-200 p-1.5 text-red-500 hover:bg-red-50"
                            aria-label="Supprimer le secteur"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Villes panel */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-2.5">
                            {zoneVilles.length === 0 && !addVilleMutation.isPending && (
                              <p className="px-1 py-1 text-xs text-gray-400">Aucune ville dans ce secteur.</p>
                            )}
                            {zoneVilles.map((ville) =>
                              editingVilleId === ville.id ? (
                                <div key={ville.id} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5">
                                  <input
                                    type="text"
                                    value={editVilleName}
                                    onChange={(e) => setEditVilleName(e.target.value)}
                                    className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-brand-400 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => saveVilleMutation.mutate({ id: ville.id, name: editVilleName })}
                                    disabled={saveVilleMutation.isPending}
                                    className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingVilleId(null)}
                                    className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-50"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div key={ville.id} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5">
                                  <span className={`min-w-0 flex-1 text-sm ${ville.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                                    {ville.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleVilleMutation.mutate({ id: ville.id, is_active: !ville.is_active })}
                                    disabled={toggleVilleMutation.isPending}
                                    title={ville.is_active ? 'Désactiver' : 'Activer'}
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      ville.is_active
                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                  >
                                    {ville.is_active ? 'Active' : 'Inactive'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingVilleId(ville.id)
                                      setEditVilleName(ville.name)
                                    }}
                                    className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-50"
                                    aria-label="Modifier la ville"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setVilleToDelete({ id: ville.id, name: ville.name })}
                                    className="rounded-md border border-gray-200 p-1 text-red-500 hover:bg-red-50"
                                    aria-label="Supprimer la ville"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ),
                            )}
                            {/* Add ville form */}
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="text"
                                value={newVilleName}
                                onChange={(e) => setNewVilleName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (newVilleName.trim()) addVilleMutation.mutate({ secteurId: zone.id })
                                  }
                                }}
                                placeholder="Nouvelle ville…"
                                className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus:border-brand-400 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => addVilleMutation.mutate({ secteurId: zone.id })}
                                disabled={addVilleMutation.isPending || !newVilleName.trim()}
                                className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                              >
                                {addVilleMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                                Ajouter
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="ex. Rufisque"
                    className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newZoneFee}
                      onChange={(e) => setNewZoneFee(e.target.value)}
                      placeholder="0"
                      className="w-28 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
                    />
                    <span className="text-xs text-gray-400">{currency}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addZoneMutation.mutate()}
                    disabled={addZoneMutation.isPending || !newZoneName.trim()}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                  >
                    {addZoneMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Ajouter
                  </button>
                </div>
              </div>
            </Card>
          )}

          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {saveMutation.isPending ? (
                  <span className="flex items-center gap-2 text-gray-500">
                    <Loader2 size={15} className="animate-spin text-brand-600" /> Enregistrement en cours…
                  </span>
                ) : saved ? (
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <Check size={15} /> Paramètres enregistrés
                  </span>
                ) : error ? (
                  <span className="text-red-600">{error}</span>
                ) : (
                  <span className="text-gray-500">Les changements s'appliquent immédiatement.</span>
                )}
              </div>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      </form>
      )}

      <ConfirmDialog
        open={zoneToDelete !== null}
        title="Supprimer ce secteur ?"
        description={
          zoneToDelete
            ? `Le secteur « ${zoneToDelete.name} » et toutes ses villes seront supprimés. Les commandes déjà créées gardent leur tarif.`
            : ''
        }
        confirmLabel="Supprimer le secteur"
        pending={deleteZoneMutation.isPending}
        onConfirm={() => zoneToDelete && deleteZoneMutation.mutate(zoneToDelete.id)}
        onClose={() => setZoneToDelete(null)}
      />

      <ConfirmDialog
        open={villeToDelete !== null}
        title="Supprimer cette ville ?"
        description={
          villeToDelete
            ? `La ville « ${villeToDelete.name} » ne sera plus proposée lors du paiement. Les commandes déjà créées gardent leur tarif.`
            : ''
        }
        confirmLabel="Supprimer la ville"
        pending={deleteVilleMutation.isPending}
        onConfirm={() => villeToDelete && deleteVilleMutation.mutate(villeToDelete.id)}
        onClose={() => setVilleToDelete(null)}
      />
    </div>
  )
}
