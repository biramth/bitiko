import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Globe,
  ImageIcon,
  LayoutTemplate,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Pencil,
  Phone,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  User,
  Users,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { TemplateThumbnail } from '@/features/store-builder/TemplateThumbnail'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlatformRole } from '@/features/platform/usePlatformRole'
import { useMyShop, useMyShops, selectShop } from '@/features/shop-settings/useMyShop'
import { createShop, isSlugAvailable, sendWelcomeEmail, updateShop, uploadShopLogo } from '@/services/shop.service'
import { ensureProfile } from '@/services/profile.service'
import { listEnabledCountries } from '@/services/country.service'
import { getCountryPreset, phonePlaceholder } from '@/config/countries'
import { STORE_TEMPLATES, availableVerticals, templatesForVertical } from '@/config/storeTemplates'
import { extractPaletteFromFile } from '@/utils/extractColorFromImage'
import { ensureReadableAccent } from '@/utils/color'
import {
  AUDIENCE_LABELS,
  EMPTY_STORE_PROFILE,
  FAQ_SLOTS,
  PRICE_RANGE_LABELS,
  type StoreAudience,
  type StoreFaqItem,
  type StorePriceRange,
  type StoreProfileAnswers,
} from '@/features/onboarding/storeProfile'
import type { StoreBrandPalette } from '@/features/onboarding/generateStorefront'
import { VERTICAL_BY_KEY } from '@/config/verticals'
import { useBusinessTypeOptions } from '@/hooks/useBusinessTypeOptions'
import { fetchBusinessCapabilities } from '@/services/businessType.service'
import { fetchTemplateContents, fetchTemplateSlugsForTypeSlug, mergeDbTemplates, resolvePickerTemplates } from '@/services/template.service'
import { slugify } from '@/utils/format'
import { PHONE_ERROR_MESSAGES, normalizePhoneNumber, validatePhoneNumber } from '@/utils/phone'
import { isValidSlug, DISPLAY_ROOT_DOMAIN } from '@/lib/tenant'
import { PageLoader } from '@/components/ui/PageLoader'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { trackEvent } from '@/lib/analytics'
import { buttonClass } from '@/components/ui/styles'

const STEPS: { number: number; label: string; icon: LucideIcon }[] = [
  { number: 1, label: 'Activité', icon: Briefcase },
  { number: 2, label: 'Offre', icon: ShoppingBag },
  { number: 3, label: 'Vitrine', icon: Palette },
  { number: 4, label: 'Coordonnées', icon: User },
  { number: 5, label: 'Récap', icon: ClipboardCheck },
]

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Nom, page et contact — l’essentiel pour exister.',
  2: 'Ce que tu proposes et comment tu vends.',
  3: 'Style, description, logo : donne envie.',
  4: 'Pour te joindre et lier ton compte.',
  5: 'Un dernier coup d’œil avant le lancement.',
}

/** Compact step title: the step icon inline with the step name. */
function StepHeader({ step }: { step: number }) {
  const meta = STEPS[step - 1]
  if (!meta) return null
  const StepIcon = meta.icon
  return (
    <div>
      <p className="flex items-center gap-2 font-heading text-base font-bold text-ink-900">
        <StepIcon size={17} className="shrink-0 text-brand-600" aria-hidden />
        {meta.label}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">{STEP_SUBTITLES[step]}</p>
    </div>
  )
}

/** One icon per business vertical for the commerce picker cards. */
const VERTICAL_ICONS: Record<string, LucideIcon> = {
  mode: Shirt,
  epicerie: ShoppingBasket,
  beaute: Sparkles,
  tech: Smartphone,
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

const textareaClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

const AUDIENCE_OPTIONS: { key: StoreAudience; label: string; icon: LucideIcon }[] = [
  { key: 'particuliers', label: 'Particuliers', icon: User },
  { key: 'professionnels', label: 'Professionnels', icon: Briefcase },
  { key: 'mixte', label: 'Les deux', icon: Users },
]

const PRICE_OPTIONS: { key: StorePriceRange; label: string; icon: LucideIcon }[] = [
  { key: 'entree', label: 'Entrée de gamme', icon: Package },
  { key: 'milieu', label: 'Milieu de gamme', icon: Store },
  { key: 'haut', label: 'Haut de gamme', icon: Sparkles },
]

function ChoicePills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; icon?: LucideIcon }[]
  value: T
  onChange: (key: T) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const selected = value === option.key
        const Icon = option.icon
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${
              selected ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500 text-ink-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {Icon && <Icon size={16} className={selected ? 'text-brand-700' : 'text-gray-400'} aria-hidden />}
            {option.label}
            {selected && <Check size={12} className="text-brand-700" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}

function ToggleTile({
  checked,
  onChange,
  label,
  icon: Icon,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
        checked ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <Icon size={16} className={checked ? 'text-brand-700' : 'text-gray-400'} aria-hidden />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-xs font-medium text-ink-900">{label}</span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          checked ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {checked ? 'Oui' : 'Non'}
      </span>
    </button>
  )
}

export function OnboardingPage() {
  usePageSeo({ title: 'Créer ton espace — Bitiko', noindex: true })
  const { user } = useAuth()
  const { data: existingShop, isLoading: shopLoading } = useMyShop()
  const { data: allShops } = useMyShops()
  const { data: platformRole, isPending: rolePending } = usePlatformRole()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  // Second (or third…) shop: reachable from the shop switcher's
  // "Nouvelle boutique" — otherwise an existing shop always bounces home.
  const creatingAdditional = searchParams.get('new') === '1' && !!existingShop

  const [step, setStep] = useState(1)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [personalPhone, setPersonalPhone] = useState('')
  const [personalAddress, setPersonalAddress] = useState('')
  const [countryCode, setCountryCode] = useState('SN')

  const { data: enabledCountries = [] } = useQuery({
    queryKey: ['countries-enabled'],
    queryFn: listEnabledCountries,
  })
  const country = getCountryPreset(countryCode)
  const countryOptions: { code: string; name: string }[] =
    enabledCountries.length > 0 ? enabledCountries : [{ code: country.code, name: country.name }]

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [businessType, setBusinessType] = useState(availableVerticals()[0]?.key ?? '')
  const [templateId, setTemplateId] = useState(templatesForVertical(businessType)[0]?.key ?? STORE_TEMPLATES[0].key)

  // Activity picker sourced from the DB referential (types with an active
  // template), legacy hardcoded list as fail-open fallback.
  const typeOptions = useBusinessTypeOptions()

  // Template slugs + capabilities compatible with the chosen type (DB-driven,
  // Template ≠ Business Type). Null = legacy fallback (fail-open).
  const [compatSlugs, setCompatSlugs] = useState<string[] | null>(null)
  const [typeCaps, setTypeCaps] = useState<string[] | null>(null)

  useEffect(() => {
    let active = true
    setCompatSlugs(null)
    setTypeCaps(null)
    Promise.all([fetchTemplateSlugsForTypeSlug(businessType), fetchBusinessCapabilities(businessType)])
      .then(([slugs, caps]) => {
        if (!active) return
        setCompatSlugs(slugs)
        setTypeCaps(caps)
      })
      .catch(() => {
        if (!active) return
        setCompatSlugs(null)
        setTypeCaps(null)
      })
    return () => {
      active = false
    }
  }, [businessType])

  // Surcharge sans déploiement (admin plateforme) — échec = catalogue code.
  const { data: dbContents = [] } = useQuery({
    queryKey: ['template-contents'],
    queryFn: fetchTemplateContents,
    staleTime: 10 * 60 * 1000,
    retry: false,
    throwOnError: false,
  })

  const typeTemplates = mergeDbTemplates(resolvePickerTemplates(compatSlugs, businessType), dbContents)

  // Quand la liste compatible arrive (ou change de type), le défaut suit le
  // premier gabarit proposé au lieu de rester sur un choix périmé.
  useEffect(() => {
    if (typeTemplates.length > 0 && !typeTemplates.some((t) => t.key === templateId)) {
      setTemplateId(typeTemplates[0]!.key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compatSlugs, businessType, dbContents])

  const handleSelectVertical = (vertical: string) => {
    setBusinessType(vertical)
    // Template defaults follow once compatSlugs reload (effect above); set an
    // immediate legacy fallback so the choice never lags behind the click.
    const first = templatesForVertical(vertical)[0]
    if (first) setTemplateId(first.key)
  }
  const [profile, setProfile] = useState<StoreProfileAnswers>(EMPTY_STORE_PROFILE)
  const updateProfile = (patch: Partial<StoreProfileAnswers>) => setProfile((prev) => ({ ...prev, ...patch }))

  // Sale toggles only make sense for types that sell/deliver — a coiffeur never
  // sees "Livraison à domicile". Null (unknown) fails open to today's toggles.
  const showToggle = (code: string) => typeCaps === null || typeCaps.includes(code)
  const saleToggles: { icon: LucideIcon; checked: boolean; flip: () => void; label: string; cap: string }[] = [
    { icon: Truck, checked: profile.homeDelivery, flip: () => updateProfile({ homeDelivery: !profile.homeDelivery }), label: 'Livraison à domicile', cap: 'HAS_DELIVERY' },
    { icon: Banknote, checked: profile.payOnDelivery, flip: () => updateProfile({ payOnDelivery: !profile.payOnDelivery }), label: 'Paiement à la livraison', cap: 'HAS_ORDERS' },
    { icon: Zap, checked: profile.expressDelivery, flip: () => updateProfile({ expressDelivery: !profile.expressDelivery }), label: 'Livraison express', cap: 'HAS_DELIVERY' },
    { icon: Scissors, checked: profile.madeToOrder, flip: () => updateProfile({ madeToOrder: !profile.madeToOrder }), label: 'Préparé sur commande', cap: 'HAS_PRODUCTS' },
  ].filter((t) => showToggle(t.cap))
  const updateFaq = (index: number, field: keyof StoreFaqItem, value: string) =>
    setProfile((prev) => ({
      ...prev,
      faq: prev.faq.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  // Best-effort brand palette suggestion from the logo — applied instead of the
  // template's default color if found, but stays plain shop theme colors like
  // any other, editable later in Réglages.
  const [logoPalette, setLogoPalette] = useState<StoreBrandPalette | null>(null)
  const latestLogoFileRef = useRef<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogoFile = (file: File | null) => {
    const url = file ? URL.createObjectURL(file) : null
    setLogoPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return url
    })
    setLogoFile(file)
    setLogoPalette(null)
    latestLogoFileRef.current = file
    if (file) {
      void extractPaletteFromFile(file).then((palette) => {
        // The merchant may have already removed/replaced the logo by the
        // time this resolves — only apply it if this is still the same file.
        if (latestLogoFileRef.current === file && palette.primary) setLogoPalette(palette)
      })
    }
  }

  const debouncedSlug = useDebouncedValue(slug, 400)
  const [availability, setAvailability] = useState<'available' | 'taken' | 'error' | null>(null)

  useEffect(() => {
    if (!slug || !isValidSlug(slug) || slug !== debouncedSlug) return
    let active = true
    isSlugAvailable(slug)
      .then((available) => {
        if (active) setAvailability(available ? 'available' : 'taken')
      })
      .catch((err: unknown) => {
        if (active) {
          setAvailability('error')
          setError('Impossible de vérifier la disponibilité du nom pour le moment. Réessayez dans quelques instants.')
          console.error('Slug availability check failed:', err)
        }
      })
    return () => {
      active = false
    }
  }, [slug, debouncedSlug])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      // A stale or storage-restricted session (common in in-app browsers like
      // the Google app's on iOS) can leave `user` populated in React state
      // while the client's actual access token is gone — requests then go
      // out unauthenticated and fail with a cryptic RLS error. Confirming
      // the session against the server first turns that into a clear
      // "reconnect" message instead, and refreshes the token if it's just
      // close to expiring.
      const { data: freshUserData, error: freshUserError } = await supabase.auth.getUser()
      if (freshUserError || !freshUserData.user) {
        throw new Error('Ta session a expiré. Recharge la page et reconnecte-toi avant de réessayer.')
      }
      const ownerId = freshUserData.user.id
      const personalPhoneCheck = normalizePhoneNumber(personalPhone, countryCode)
      if (!personalPhoneCheck.ok || !personalPhoneCheck.value) {
        throw new Error(PHONE_ERROR_MESSAGES[personalPhoneCheck.error ?? 'invalid_length'])
      }
      const whatsappCheck = normalizePhoneNumber(whatsappNumber, countryCode)
      if (!whatsappCheck.ok || !whatsappCheck.value) {
        throw new Error(PHONE_ERROR_MESSAGES[whatsappCheck.error ?? 'invalid_length'])
      }
      await ensureProfile(ownerId, 'owner', {
        firstName,
        lastName,
        phone: personalPhoneCheck.value,
        address: personalAddress,
        countryCode,
      })
      let shop = await createShop({
        ownerId,
        name: name.trim(),
        slug,
        whatsappNumber: whatsappCheck.value,
        countryCode,
        templateId,
        profile,
        palette: logoPalette,
      })
      if (logoFile) {
        const logoUrl = await uploadShopLogo(shop.id, logoFile)
        shop = await updateShop(shop.id, { logo_url: logoUrl })
      }
      return shop
    },
    onSuccess: (shop) => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      // A new shop becomes the workspace scope immediately — otherwise the
      // admin would keep showing the previous shop after creating this one.
      selectShop(shop.id, queryClient)
      trackEvent('shop_created', { shop_slug: shop.slug })
      void sendWelcomeEmail(shop.id)
      // The `tour` param makes the admin open the welcome guided tour once.
      navigate('/admin?tour=welcome', { replace: true })
    },
    onError: (err: Error) => setError(err?.message || 'Impossible de créer ton espace. Réessayez.'),
  })

  if (shopLoading || rolePending) return <PageLoader />
  // Platform staff must never own a merchant shop — they live in /plateforme
  // (same rule as RequireShop). Bounce instead of showing the creation form.
  // A staff member who already owns shops (merchant too) keeps prior behavior.
  if (platformRole && !existingShop) return <Navigate to="/plateforme" replace />
  // Server cap is 5 shops per account (0097) — bounce instead of letting
  // the save fail at the end of the form.
  if ((allShops?.length ?? 0) >= 5) return <Navigate to="/admin" replace />
  if (existingShop && !creatingAdditional) return <Navigate to="/admin" replace />

  const selectedTemplate = typeTemplates.find((template) => template.key === templateId) ?? STORE_TEMPLATES.find((template) => template.key === templateId) ?? STORE_TEMPLATES[0]
  const selectedVertical = typeOptions.find((o) => o.key === businessType) ?? VERTICAL_BY_KEY[businessType]
  // The recap shows the color actually applied: a light logo color is deepened
  // so white text on it stays readable.
  const effectiveThemeColor = logoPalette?.primary
    ? ensureReadableAccent(logoPalette.primary)
    : selectedTemplate.themeColor

  const slugStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error' = !slug
    ? 'idle'
    : !isValidSlug(slug)
      ? 'invalid'
      : slug !== debouncedSlug || availability === null
        ? 'checking'
        : availability

  const infosValid = firstName.trim().length > 0 && lastName.trim().length > 0 && validatePhoneNumber(personalPhone, countryCode)

  const boutiqueValid =
    name.trim().length > 0 &&
    (slugStatus === 'available' || slugStatus === 'error') &&
    !!slug &&
    validatePhoneNumber(whatsappNumber, countryCode)

  const commerceValid = !!businessType && !!templateId

  const vitrineValid = profile.description.trim().length > 0

  const canGoNext =
    (step === 1 && boutiqueValid) ||
    (step === 2 && commerceValid) ||
    (step === 3 && vitrineValid) ||
    (step === 4 && infosValid)

  const canSubmit = boutiqueValid && commerceValid && vitrineValid && infosValid

  const fullShopUrl = `https://${slug || '…'}.${DISPLAY_ROOT_DOMAIN}`

  const completedFaqCount = profile.faq.filter((item) => item.question.trim() && item.answer.trim()).length

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-sand-50 to-white px-4 py-8 sm:py-12">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-100 opacity-50 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-gold-300 opacity-20 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-2xl rounded-2xl border border-sand-200 bg-white p-5 shadow-xl shadow-ink-900/5 sm:p-8 lg:p-10">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={40} withWordmark={false} />
          <h1 className="font-heading text-xl font-bold text-ink-900">Créons ton espace</h1>
          <p className="max-w-md text-sm text-gray-500">
            Quelques étapes rapides et ton activité est en ligne.
          </p>
        </div>

        <div className="mb-2 flex items-start justify-center">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon
            const done = step > s.number
            const active = step === s.number
            return (
              <div key={s.number} className="flex items-start">
                <div className="flex w-12 flex-col items-center gap-1 sm:w-16">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                      active
                        ? 'bg-brand-600 text-white'
                        : done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {done ? <Check size={14} className="text-white" /> : <StepIcon size={14} aria-hidden />}
                  </div>
                  <span
                    className={`text-center text-[10px] font-medium leading-tight ${
                      active ? 'text-ink-900' : done ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <span className="mx-0.5 mt-4 h-px w-4 shrink-0 bg-gray-200 sm:w-8" />}
              </div>
            )
          })}
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            if (step === 5 && canSubmit) {
              mutation.mutate()
            }
          }}
          className="space-y-5"
        >
          {step === 4 && (
            <>
              <StepHeader step={4} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Prénom
                  </label>
                  <input
                    id="firstName"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Awa"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Nom
                  </label>
                  <input
                    id="lastName"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ndiaye"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">
                  Pays de ta boutique
                </label>
                <div className="relative mt-1">
                  <Globe size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <select
                    id="countryCode"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className={fieldClass}
                  >
                    {countryOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Il définit le format des numéros et la devise de ta boutique.
                </p>
              </div>

              <div>
                <label htmlFor="personalPhone" className="block text-sm font-medium text-gray-700">
                  Téléphone personnel
                </label>
                <div className="relative mt-1">
                  <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    id="personalPhone"
                    required
                    type="tel"
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    placeholder={phonePlaceholder(countryCode)}
                    className={fieldClass}
                  />
                </div>
                {personalPhone.trim() && !normalizePhoneNumber(personalPhone, countryCode).ok ? (
                  <p className="mt-1 text-xs text-red-600">
                    {PHONE_ERROR_MESSAGES[normalizePhoneNumber(personalPhone, countryCode).error ?? 'invalid_length']}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Un numéro pour te joindre, toi — différent du numéro de ta boutique.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="personalAddress" className="block text-sm font-medium text-gray-700">
                  Adresse
                </label>
                <div className="relative mt-1">
                  <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    id="personalAddress"
                    value={personalAddress}
                    onChange={(e) => setPersonalAddress(e.target.value)}
                    placeholder="Dakar, Sénégal"
                    className={fieldClass}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Optionnel — complète tes coordonnées.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email de connexion</label>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                  <Mail size={15} className="shrink-0 text-gray-400" aria-hidden />
                  <span className="truncate">{user?.email ?? '—'}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Ce compte sera lié à ton espace.</p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <StepHeader step={1} />
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
                  Nom de ton activité
                </label>
                <div className="relative mt-1">
                  <Store size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    id="shopName"
                    required
                    value={name}
                    onChange={(e) => {
                      const next = e.target.value
                      setName(next)
                      if (!slugEdited) setSlug(slugify(next))
                    }}
                    placeholder="Ex : Chez Awa"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                  Adresse de ta page
                </label>
                <div className="mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors focus-within:border-brand-400">
                  <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                    <Lock size={12} className="shrink-0 text-emerald-500" aria-hidden />
                    <span className="truncate">{fullShopUrl}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="pointer-events-none pl-3 text-sm text-gray-400">https://</span>
                    <input
                      id="slug"
                      required
                      value={slug}
                      onChange={(e) => {
                        setSlugEdited(true)
                        setSlug(slugify(e.target.value))
                      }}
                      placeholder="chez-awa"
                      className="min-w-0 flex-1 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                    />
                    <span className="pointer-events-none whitespace-nowrap pr-3 text-sm font-medium text-gray-400">
                      .{DISPLAY_ROOT_DOMAIN}
                    </span>
                  </div>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs">
                  {slugStatus === 'checking' && <span className="text-gray-400">Vérification…</span>}
                  {slugStatus === 'available' && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={14} /> Disponible
                    </span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle size={14} /> Déjà utilisée
                    </span>
                  )}
                  {slugStatus === 'invalid' && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle size={14} /> 3 caractères minimum, lettres/chiffres/tirets
                    </span>
                  )}
                  {slugStatus === 'error' && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle size={14} />
                      Vérification impossible pour le moment. Réessayez dans quelques instants.
                    </span>
                  )}
                </p>
                {slugStatus === 'available' && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <Globe size={12} aria-hidden />
                    <span>Voici le lien que tes clients utiliseront&nbsp;:</span>
                    <span className="font-semibold">{fullShopUrl}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                  Numéro WhatsApp de ta boutique
                </label>
                <div className="relative mt-1">
                  <MessageCircle size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    id="whatsapp"
                    required
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder={phonePlaceholder(countryCode)}
                    className={fieldClass}
                  />
                </div>
                {whatsappNumber.trim() && !normalizePhoneNumber(whatsappNumber, countryCode).ok ? (
                  <p className="mt-1 text-xs text-red-600">
                    {PHONE_ERROR_MESSAGES[normalizePhoneNumber(whatsappNumber, countryCode).error ?? 'invalid_length']}
                  </p>
                ) : (
                <p className="mt-1 text-xs text-gray-500">
                  C'est ce numéro qui recevra commandes et réservations. Il peut être différent de ton numéro personnel.
                </p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <StepHeader step={2} />
                <div className="mt-2 grid grid-cols-2 gap-2.5">
                  {typeOptions.map((vertical) => {
                    const selected = businessType === vertical.key
                    const VerticalIcon = VERTICAL_ICONS[vertical.key] ?? Store
                    return (
                      <button
                        key={vertical.key}
                        type="button"
                        onClick={() => handleSelectVertical(vertical.key)}
                        aria-pressed={selected}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          selected ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <VerticalIcon size={16} className={`shrink-0 ${selected ? 'text-brand-700' : 'text-gray-400'}`} aria-hidden />
                            <span className="block text-sm font-semibold text-ink-900">{vertical.label}</span>
                          </span>
                          {selected && <Check size={14} className="shrink-0 text-brand-700" aria-hidden />}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-gray-500">{vertical.description}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Ton activité définit ton espace : boutique, rendez-vous, services. Modifiable plus tard dans « Personnaliser ».
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Comment vends-tu ?</label>
                {saleToggles.length > 0 ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {saleToggles.map((t) => (
                      <ToggleTile
                        key={t.label}
                        icon={t.icon}
                        checked={t.checked}
                        onChange={t.flip}
                        label={t.label}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    Ce type d'activité ne passe ni par la livraison ni par le paiement à la livraison — tu pourras
                    détailler ton offre à l'étape suivante.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <StepHeader step={3} />
                <p className="mt-1 text-xs text-gray-500">
                  Tes réponses servent à créer une vitrine qui te ressemble. Tu pourras tout modifier plus tard.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <LayoutTemplate size={15} className="text-gray-400" aria-hidden /> Quel style pour ton espace ?
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {typeTemplates.map((template) => {
                    const selected = templateId === template.key
                    return (
                      <button
                        key={template.key}
                        type="button"
                        onClick={() => setTemplateId(template.key)}
                        aria-pressed={selected}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          selected ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <TemplateThumbnail template={template} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="block truncate text-sm font-semibold text-ink-900">{template.label}</span>
                            {selected && <Check size={14} className="shrink-0 text-brand-700" aria-hidden />}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-gray-500">{template.description}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1 text-xs text-gray-500">Modifiable à tout moment dans « Personnaliser ».</p>
              </div>

              <div>
                <label htmlFor="shopDescription" className="block text-sm font-medium text-gray-700">
                  Décris ton activité en une phrase
                </label>
                <textarea
                  id="shopDescription"
                  required
                  rows={2}
                  value={profile.description}
                  onChange={(e) => updateProfile({ description: e.target.value })}
                  placeholder="Ex : Robes et accessoires en pagne, cousus et teints à Dakar."
                  className={`${textareaClass} mt-1`}
                />
                <p className="mt-1 text-xs text-gray-500">C'est ce que les clients lisent en premier sur ta page d'accueil.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">À qui t'adresses-tu ?</label>
                <div className="mt-2">
                  <ChoicePills options={AUDIENCE_OPTIONS} value={profile.audience} onChange={(audience) => updateProfile({ audience })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Ton positionnement</label>
                <div className="mt-2">
                  <ChoicePills options={PRICE_OPTIONS} value={profile.priceRange} onChange={(priceRange) => updateProfile({ priceRange })} />
                </div>
              </div>

              <details className="group rounded-xl border border-gray-200">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-gray-700">
                  Aller plus loin (optionnel)
                  <ChevronDown size={15} className="text-gray-400 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="space-y-5 border-t border-gray-100 px-4 py-4">
              <div>
                <label htmlFor="story" className="block text-sm font-medium text-gray-700">
                  Parle de ton histoire (optionnel)
                </label>
                <textarea
                  id="story"
                  rows={3}
                  value={profile.story}
                  onChange={(e) => updateProfile({ story: e.target.value })}
                  placeholder="Ex : Ce que nous vendons est cousu par notre équipe à Dakar depuis 2015. Chaque pièce est unique."
                  className={`${textareaClass} mt-1`}
                />
                <p className="mt-1 text-xs text-gray-500">Ajoute une section « Notre histoire » à ta page d'accueil.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Questions fréquentes (optionnel)
                </label>
                <p className="mt-1 text-xs text-gray-500">Rassure tes clients avant qu'ils ne commandent.</p>
                <div className="mt-2 space-y-3">
                  {profile.faq.slice(0, FAQ_SLOTS).map((item, index) => (
                    <div key={index} className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3 sm:grid-cols-2">
                      <input
                        value={item.question}
                        onChange={(e) => updateFaq(index, 'question', e.target.value)}
                        placeholder="Question"
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
                      />
                      <textarea
                        rows={1}
                        value={item.answer}
                        onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                        placeholder="Réponse"
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                {completedFaqCount > 0 && (
                  <p className="mt-1 text-xs text-emerald-600">
                    {completedFaqCount} question{completedFaqCount > 1 ? 's' : ''} prête{completedFaqCount > 1 ? 's' : ''} à être affichée
                    {completedFaqCount > 1 ? 's' : ''} sur ta boutique.
                  </p>
                )}
              </div>
                </div>
              </details>
            </div>
          )}

          {step === 3 && (
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <ImageIcon size={15} className="text-gray-400" aria-hidden /> Logo de ton activité
                </label>
              <p className="mt-1 text-xs text-gray-500">Optionnel — tu pourras l'ajouter plus tard dans Réglages.</p>
              <div className="mt-3 flex items-start gap-4">
                <label className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-brand-400 hover:bg-brand-50/30">
                  {logoPreviewUrl ? (
                    <img src={logoPreviewUrl} alt="Logo sélectionné" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon size={24} className="text-gray-400 group-hover:text-brand-500" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="min-w-0 pt-1">
                  {logoPreviewUrl && logoFile ? (
                    <>
                      <p className="truncate text-sm font-medium text-ink-900">{logoFile.name}</p>
                      {logoPalette ? (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                          <span
                            className="inline-block h-3 w-3 shrink-0 rounded-full border border-black/10"
                            style={{ backgroundColor: logoPalette.primary ?? undefined }}
                            aria-hidden
                          />
                          <span
                            className="inline-block h-3 w-3 shrink-0 rounded-full border border-black/10"
                            style={{ backgroundColor: logoPalette.secondary ?? undefined }}
                            aria-hidden
                          />
                          Couleurs de ton espace mises à jour à partir de ton logo — modifiables plus tard.
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-gray-500">Image prête à être utilisée.</p>
                      )}
                      <button
                        type="button"
                        className="mt-2 text-xs text-red-500 hover:underline"
                        onClick={() => handleLogoFile(null)}
                      >
                        Supprimer
                      </button>
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed text-gray-500">
                      Formats .png ou .jpg acceptés.<br />
                      Image carrée recommandée (256 × 256 px).<br />
                      Sans logo, seul le nom de ton activité est affiché.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <StepHeader step={5} />

              <div className="overflow-hidden rounded-xl border border-sand-200">
                <div className="flex items-center justify-between bg-sand-50/70 px-4 py-2.5">
                  <p className="text-sm font-semibold text-ink-900">Ton activité</p>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                  >
                    <Pencil size={12} aria-hidden /> Modifier
                  </button>
                </div>
                <div className="space-y-2.5 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Nom</span>
                    <span className="truncate text-right font-medium text-ink-900">{name.trim()}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Adresse</span>
                    <span className="truncate text-right font-medium text-ink-900">{slug}.{DISPLAY_ROOT_DOMAIN}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">WhatsApp</span>
                    <span className="truncate text-right font-medium text-ink-900">{whatsappNumber}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-sand-200">
                <div className="flex items-center justify-between bg-sand-50/70 px-4 py-2.5">
                  <p className="text-sm font-semibold text-ink-900">Ton offre</p>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                  >
                    <Pencil size={12} aria-hidden /> Modifier
                  </button>
                </div>
                <div className="space-y-2.5 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Type d'activité</span>
                    <span className="truncate text-right font-medium text-ink-900">{selectedVertical?.label ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Ventes</span>
                    <span className="text-right text-xs">
                      <span className="flex flex-wrap justify-end gap-1">
                        {profile.homeDelivery && <Chip>Livraison à domicile</Chip>}
                        {profile.payOnDelivery && <Chip>Paiement à la livraison</Chip>}
                        {profile.expressDelivery && <Chip>Livraison express</Chip>}
                        {profile.madeToOrder && <Chip>Sur commande</Chip>}
                        {!profile.homeDelivery && !profile.payOnDelivery && !profile.expressDelivery && !profile.madeToOrder && (
                          <span className="text-gray-400">—</span>
                        )}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-sand-200">
                <div className="flex items-center justify-between bg-sand-50/70 px-4 py-2.5">
                  <p className="text-sm font-semibold text-ink-900">Ta vitrine</p>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                  >
                    <Pencil size={12} aria-hidden /> Modifier
                  </button>
                </div>
                <div className="space-y-2.5 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Description</span>
                    <span className="truncate text-right font-medium text-ink-900">{profile.description.trim()}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Clients</span>
                    <span className="text-right font-medium text-ink-900">{AUDIENCE_LABELS[profile.audience]}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Positionnement</span>
                    <span className="text-right font-medium text-ink-900">{PRICE_RANGE_LABELS[profile.priceRange]}</span>
                  </div>
                  {logoPalette?.primary && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Couleur</span>
                      <span className="flex items-center gap-1.5 text-right text-xs text-gray-500">
                        <span className="inline-block h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: effectiveThemeColor }} aria-hidden />
                        Suggérée à partir de ton logo, assombrie pour rester lisible
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500">Logo</span>
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt="Logo sélectionné"
                        className="h-8 w-8 shrink-0 rounded-md border border-sand-200 object-cover"
                      />
                    ) : (
                      <span className="text-right font-medium text-ink-900">Sans logo</span>
                    )}
                  </div>
                  {profile.story.trim() && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Histoire</span>
                      <span className="max-w-[70%] truncate text-right font-medium text-ink-900">{profile.story.trim()}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">FAQ</span>
                    <span className="text-right font-medium text-ink-900">
                      {completedFaqCount > 0 ? `${completedFaqCount} question${completedFaqCount > 1 ? 's' : ''}` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-sand-200">
                <div className="flex items-center justify-between bg-sand-50/70 px-4 py-2.5">
                  <p className="text-sm font-semibold text-ink-900">Tes coordonnées</p>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                  >
                    <Pencil size={12} aria-hidden /> Modifier
                  </button>
                </div>
                <div className="space-y-2.5 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Nom et prénom</span>
                    <span className="truncate text-right font-medium text-ink-900">
                      {firstName.trim()} {lastName.trim()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Téléphone personnel</span>
                    <span className="truncate text-right font-medium text-ink-900">{personalPhone}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Pays</span>
                    <span className="truncate text-right font-medium text-ink-900">{country.name}</span>
                  </div>
                  {personalAddress.trim() && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Adresse</span>
                      <span className="truncate text-right font-medium text-ink-900">{personalAddress.trim()}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Tout pourra encore être modifié plus tard dans Réglages.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                aria-label="Retour"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:px-4"
              >
                <ArrowLeft size={15} aria-hidden /> <span className="hidden sm:inline">Retour</span>
              </button>
            )}

            {step < 5 && <div className="flex-1" />}

            {step < 5 ? (
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => {
                  setError(null)
                  setStep((s) => s + 1)
                }}
                className={buttonClass({ size: 'lg', className: 'shrink-0' })}
              >
                Suivant <ArrowRight size={15} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSubmit || mutation.isPending}
                onClick={() => {
                  setError(null)
                  if (canSubmit && !mutation.isPending) mutation.mutate()
                }}
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending ? 'Création…' : 'Confirmer et créer mon espace'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
      {children}
    </span>
  )
}