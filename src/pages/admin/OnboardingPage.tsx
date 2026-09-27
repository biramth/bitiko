import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Pencil,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { PhoneField } from '@/components/ui/PhoneField'
import { DashboardGhost } from '@/features/onboarding/DashboardGhost'
import { defaultProfile, detectCountryCode, readUserNames } from '@/features/onboarding/defaults'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlatformRole } from '@/features/platform/usePlatformRole'
import { useMyShop, useMyShops, selectShop } from '@/features/shop-settings/useMyShop'
import { createShop, isSlugAvailable, sendWelcomeEmail } from '@/services/shop.service'
import { ensureProfile } from '@/services/profile.service'
import { listEnabledCountries } from '@/services/country.service'
import { COUNTRY_PRESETS, DEFAULT_COUNTRY_CODE, getCountryPreset, phonePlaceholder } from '@/config/countries'
import { STORE_TEMPLATES } from '@/config/storeTemplates'
import { useBusinessTypeOptions } from '@/hooks/useBusinessTypeOptions'
import { fetchBusinessCapabilities } from '@/services/businessType.service'
import { fetchTemplateContents, fetchTemplateSlugsForTypeSlug, mergeDbTemplates, resolvePickerTemplates } from '@/services/template.service'
import { slugify } from '@/utils/format'
import { PHONE_ERROR_MESSAGES, normalizePhoneNumber } from '@/utils/phone'
import { isValidSlug, DISPLAY_ROOT_DOMAIN } from '@/lib/tenant'
import { PageLoader } from '@/components/ui/PageLoader'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { trackEvent } from '@/lib/analytics'
import { buttonClass } from '@/components/ui/styles'

/** Une icône par métier historique ; les autres types utilisent l'icône boutique. */
const VERTICAL_ICONS: Record<string, LucideIcon> = {
  mode: Shirt,
  epicerie: ShoppingBasket,
  beaute: Sparkles,
  tech: Smartphone,
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

/**
 * Création de la boutique : une fenêtre posée sur un aperçu du tableau de bord,
 * trois informations (nom, activité, WhatsApp). Tout le reste — gabarit, description,
 * livraison, logo, profil — est déduit du métier ou se complète ensuite depuis
 * le tableau de bord.
 */
export function OnboardingPage() {
  usePageSeo({ title: 'Créer ton espace — Bitiko', noindex: true })
  const { user } = useAuth()
  const { data: existingShop, isLoading: shopLoading } = useMyShop()
  const { data: allShops } = useMyShops()
  const { data: platformRole, isPending: rolePending } = usePlatformRole()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  // Seconde boutique : atteinte depuis « Nouvelle boutique » du sélecteur.
  const creatingAdditional = searchParams.get('new') === '1' && !!existingShop

  const { data: enabledCountries = [] } = useQuery({
    queryKey: ['countries-enabled'],
    queryFn: listEnabledCountries,
  })
  const countryOptions = useMemo(() => {
    const presetCodes = new Set(COUNTRY_PRESETS.map((c) => c.code))
    const enabled = enabledCountries.filter((c) => presetCodes.has(c.code)).map((c) => ({ code: c.code, name: c.name }))
    // Échec ou liste vide : on ne propose que le pays par défaut, jamais tous les pays.
    const fallback = getCountryPreset(DEFAULT_COUNTRY_CODE)
    return enabled.length > 0 ? enabled : [{ code: fallback.code, name: fallback.name }]
  }, [enabledCountries])

  const [pickedCountry, setPickedCountry] = useState<string | null>(null)
  // Pays choisi, sinon déduit du fuseau horaire ; toujours parmi les pays activés.
  const countryCode =
    pickedCountry ?? detectCountryCode(Intl.DateTimeFormat().resolvedOptions().timeZone, countryOptions.map((c) => c.code))

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [editingSlug, setEditingSlug] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [error, setError] = useState<string | null>(null)

  const typeOptions = useBusinessTypeOptions()

  // Gabarits et capacités compatibles avec l'activité choisie (pilotés par la base).
  // Tant que le résultat ne correspond pas à l'activité courante, la création reste
  // bloquée : sinon la boutique partirait avec le gabarit de repli.
  const [compat, setCompat] = useState<{ type: string; slugs: string[] | null; caps: string[] | null } | null>(null)

  useEffect(() => {
    if (!businessType) return
    let active = true
    Promise.all([fetchTemplateSlugsForTypeSlug(businessType), fetchBusinessCapabilities(businessType)])
      .then(([slugs, caps]) => active && setCompat({ type: businessType, slugs, caps }))
      .catch(() => active && setCompat({ type: businessType, slugs: null, caps: null }))
    return () => {
      active = false
    }
  }, [businessType])

  const compatReady = compat?.type === businessType
  const compatSlugs = compatReady ? compat.slugs : null
  const typeCaps = compatReady ? compat.caps : null

  const { data: dbContents = [] } = useQuery({
    queryKey: ['template-contents'],
    queryFn: fetchTemplateContents,
    staleTime: 10 * 60 * 1000,
    retry: false,
    throwOnError: false,
  })
  const chosenTemplate =
    mergeDbTemplates(resolvePickerTemplates(compatSlugs, businessType), dbContents)[0] ?? STORE_TEMPLATES[0]

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
        if (active) setAvailability('error')
        console.error('Slug availability check failed:', err)
      })
    return () => {
      active = false
    }
  }, [slug, debouncedSlug])

  useEffect(() => {
    trackEvent('onboarding_started', { creating_additional: creatingAdditional })
  }, [creatingAdditional])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      // Une session périmée (navigateurs intégrés, iOS notamment) laisse `user` rempli
      // alors que le jeton a disparu : on la confirme côté serveur pour donner un message clair.
      const { data: freshUserData, error: freshUserError } = await supabase.auth.getUser()
      if (freshUserError || !freshUserData.user) {
        throw new Error('Ta session a expiré. Recharge la page et reconnecte-toi avant de réessayer.')
      }
      const owner = freshUserData.user
      const whatsappCheck = normalizePhoneNumber(whatsappNumber, countryCode)
      if (!whatsappCheck.ok || !whatsappCheck.value) {
        throw new Error(PHONE_ERROR_MESSAGES[whatsappCheck.error ?? 'invalid_length'])
      }
      const { firstName, lastName } = readUserNames(owner.user_metadata)
      // Le numéro personnel n'est plus demandé : le WhatsApp de la boutique sert de contact.
      await ensureProfile(owner.id, 'owner', { firstName, lastName, phone: whatsappCheck.value, countryCode })
      return createShop({
        ownerId: owner.id,
        name: name.trim(),
        slug,
        whatsappNumber: whatsappCheck.value,
        countryCode,
        templateId: chosenTemplate.key,
        profile: defaultProfile({ name, caps: typeCaps }),
      })
    },
    onSuccess: (shop) => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      // Une nouvelle boutique devient tout de suite l'espace de travail actif.
      selectShop(shop.id, queryClient)
      trackEvent('shop_created', { shop_slug: shop.slug, business_type: businessType })
      void sendWelcomeEmail(shop.id)
      // Le paramètre `tour` ouvre une fois la visite guidée de bienvenue.
      navigate('/admin?tour=welcome', { replace: true })
    },
    onError: (err: Error) => setError(err?.message || 'Impossible de créer ton espace. Réessaie.'),
  })

  if (shopLoading || rolePending) return <PageLoader />
  // Le personnel de la plateforme ne possède pas de boutique marchande.
  if (platformRole && !existingShop) return <Navigate to="/plateforme" replace />
  // Plafond serveur : 5 boutiques par compte (0097).
  if ((allShops?.length ?? 0) >= 5) return <Navigate to="/admin" replace />
  if (existingShop && !creatingAdditional) return <Navigate to="/admin" replace />

  const country = getCountryPreset(countryCode)
  const fullShopUrl = `https://${slug || '…'}.${DISPLAY_ROOT_DOMAIN}`
  const phoneCheck = normalizePhoneNumber(whatsappNumber, countryCode)
  const phoneError = whatsappNumber.trim() && !phoneCheck.ok ? PHONE_ERROR_MESSAGES[phoneCheck.error ?? 'invalid_length'] : null

  const slugStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error' = !slug
    ? 'idle'
    : !isValidSlug(slug)
      ? 'invalid'
      : slug !== debouncedSlug || availability === null
        ? 'checking'
        : availability
  const slugNeedsAttention = slugStatus === 'taken' || (slugStatus === 'invalid' && name.trim().length > 0)
  const showSlugInput = editingSlug || slugNeedsAttention

  const canSubmit =
    name.trim().length > 0 &&
    !!businessType &&
    compatReady &&
    (slugStatus === 'available' || slugStatus === 'error') &&
    phoneCheck.ok

  const submit = () => {
    setError(null)
    if (canSubmit && !mutation.isPending) {
      trackEvent('onboarding_submitted', { business_type: businessType, country_code: countryCode })
      mutation.mutate()
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0">
        <DashboardGhost />
        <div className="absolute inset-0 bg-ink-900/45 backdrop-blur-[3px]" aria-hidden="true" />
      </div>

      <div className="relative z-10 flex min-h-screen items-start justify-center px-4 py-6 sm:items-center sm:py-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          className="w-full max-w-lg rounded-2xl border border-sand-200 bg-white p-5 shadow-2xl shadow-ink-900/30 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <Logo size={36} withWordmark={false} />
            <div className="min-w-0">
              <h1 id="onboarding-title" className="font-heading text-lg font-bold text-ink-900">
                Bienvenue ! Crée ta boutique en 30 secondes
              </h1>
              <p className="text-sm text-gray-500">Trois infos et ton site est en ligne. Le reste, tu le feras depuis ton tableau de bord.</p>
            </div>
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
                Nom de ton activité
              </label>
              <input
                id="shopName"
                autoFocus
                required
                autoComplete="organization"
                value={name}
                onChange={(e) => {
                  const next = e.target.value
                  setName(next)
                  if (!editingSlug) setSlug(slugify(next))
                }}
                placeholder="Ex : Chez Awa"
                className={`mt-1 ${fieldClass}`}
              />
              <div className="mt-1.5 text-xs">
                {showSlugInput ? (
                  <div>
                    <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:border-brand-400">
                      <span className="pl-3 text-sm text-gray-400">https://</span>
                      <input
                        id="slug"
                        aria-label="Adresse de ta page"
                        value={slug}
                        onChange={(e) => {
                          setEditingSlug(true)
                          setSlug(slugify(e.target.value))
                        }}
                        placeholder="chez-awa"
                        className="min-w-0 flex-1 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                      />
                      <span className="whitespace-nowrap pr-3 text-sm font-medium text-gray-400">.{DISPLAY_ROOT_DOMAIN}</span>
                    </div>
                  </div>
                ) : (
                  slug && (
                    <p className="flex flex-wrap items-center gap-x-1.5 text-gray-500">
                      <span>Ton site :</span>
                      <span className="font-semibold text-ink-900">{fullShopUrl.replace('https://', '')}</span>
                      <button
                        type="button"
                        onClick={() => setEditingSlug(true)}
                        className="inline-flex items-center gap-0.5 font-medium text-brand-700 hover:underline"
                      >
                        <Pencil size={11} aria-hidden /> modifier
                      </button>
                    </p>
                  )
                )}
                <p className="mt-1 flex items-center gap-1" aria-live="polite">
                  {slugStatus === 'checking' && <span className="text-gray-400">Vérification…</span>}
                  {slugStatus === 'available' && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={14} aria-hidden /> Adresse disponible
                    </span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle size={14} aria-hidden /> Cette adresse est déjà prise, essaie-en une autre.
                    </span>
                  )}
                  {slugStatus === 'invalid' && name.trim().length > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle size={14} aria-hidden /> 3 caractères minimum, lettres, chiffres ou tirets.
                    </span>
                  )}
                  {slugStatus === 'error' && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <XCircle size={14} aria-hidden /> Disponibilité non vérifiée : on réessaiera à la création.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-gray-700">Ton activité</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {typeOptions.map((option) => {
                  const selected = businessType === option.key
                  const Icon = VERTICAL_ICONS[option.key] ?? Store
                  return (
                    <button
                      key={option.key}
                      type="button"
                      title={option.description ?? undefined}
                      onClick={() => setBusinessType(option.key)}
                      aria-pressed={selected}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        selected
                          ? 'border-brand-500 bg-brand-50/60 text-ink-900 ring-1 ring-brand-500'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={15} className={`shrink-0 ${selected ? 'text-brand-700' : 'text-gray-400'}`} aria-hidden />
                      <span className="min-w-0 flex-1 leading-tight">{option.label}</span>
                      {selected && <Check size={14} className="shrink-0 text-brand-700" aria-hidden />}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                Numéro WhatsApp
              </label>
              <div className="mt-1">
                <PhoneField
                  id="whatsapp"
                  countryCode={countryCode}
                  onCountryChange={setPickedCountry}
                  value={whatsappNumber}
                  onChange={setWhatsappNumber}
                  countries={countryOptions}
                  placeholder={phonePlaceholder(countryCode).replace(country.dialCode, '')}
                  invalid={!!phoneError}
                />
              </div>
              <p className={`mt-1 text-xs ${phoneError ? 'text-red-600' : 'text-gray-500'}`}>
                {phoneError ?? 'Tes clients te contactent et passent commande sur ce numéro.'}
              </p>
            </div>

            <button type="submit" disabled={!canSubmit || mutation.isPending} className={buttonClass({ size: 'lg', fullWidth: true })}>
              {mutation.isPending ? (
                'Création de ta boutique…'
              ) : (
                <>
                  Créer ma boutique <ArrowRight size={16} aria-hidden />
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-500">
              Gratuit, sans carte bancaire. Logo, produits et style : tout se règle ensuite.
            </p>
            {creatingAdditional && (
              <p className="text-center text-xs">
                <button type="button" onClick={() => navigate('/admin')} className="font-medium text-gray-500 hover:text-gray-800 hover:underline">
                  Annuler
                </button>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
