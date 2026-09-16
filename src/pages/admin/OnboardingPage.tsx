import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
  ImageIcon,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  Pencil,
  Phone,
  Store,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { createShop, isSlugAvailable, sendWelcomeEmail, updateShop, uploadShopLogo } from '@/services/shop.service'
import { ensureProfile } from '@/services/profile.service'
import { STORE_TEMPLATES } from '@/config/storeTemplates'
import { slugify } from '@/utils/format'
import { isValidSlug, DISPLAY_ROOT_DOMAIN } from '@/lib/tenant'
import { PageLoader } from '@/components/ui/PageLoader'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { trackEvent } from '@/lib/analytics'

const STEPS = [
  { number: 1, label: 'Tes infos' },
  { number: 2, label: 'Boutique' },
  { number: 3, label: 'Thème' },
  { number: 4, label: 'Logo' },
  { number: 5, label: 'Récap' },
] as const

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

export function OnboardingPage() {
  usePageSeo({ title: 'Créer ta boutique — Bitiko', noindex: true })
  const { user } = useAuth()
  const { data: existingShop, isLoading: shopLoading } = useMyShop()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [personalPhone, setPersonalPhone] = useState('')
  const [personalAddress, setPersonalAddress] = useState('')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [templateId, setTemplateId] = useState(STORE_TEMPLATES[0].key)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogoFile = (file: File | null) => {
    const url = file ? URL.createObjectURL(file) : null
    setLogoPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return url
    })
    setLogoFile(file)
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
      await ensureProfile(ownerId, 'owner', {
        firstName,
        lastName,
        phone: personalPhone,
        address: personalAddress,
      })
      let shop = await createShop({ ownerId, name: name.trim(), slug, whatsappNumber, templateId })
      if (logoFile) {
        const logoUrl = await uploadShopLogo(shop.id, logoFile)
        shop = await updateShop(shop.id, { logo_url: logoUrl })
      }
      return shop
    },
    onSuccess: (shop) => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      trackEvent('shop_created', { shop_slug: shop.slug })
      void sendWelcomeEmail(shop.id)
      navigate('/admin', { replace: true })
    },
    onError: (err: Error) => setError(err?.message || 'Impossible de créer la boutique. Réessayez.'),
  })

  if (shopLoading) return <PageLoader />
  if (existingShop) return <Navigate to="/admin" replace />

  const selectedTemplate = STORE_TEMPLATES.find((template) => template.key === templateId) ?? STORE_TEMPLATES[0]

  const slugStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error' = !slug
    ? 'idle'
    : !isValidSlug(slug)
      ? 'invalid'
      : slug !== debouncedSlug || availability === null
        ? 'checking'
        : availability

  const step1Valid = firstName.trim().length > 0 && lastName.trim().length > 0 && personalPhone.trim().length > 0

  const step2Valid =
    name.trim().length > 0 &&
    (slugStatus === 'available' || slugStatus === 'error') &&
    !!slug &&
    whatsappNumber.trim().length > 0

  const canGoNext =
    (step === 1 && step1Valid) ||
    (step === 2 && step2Valid) ||
    (step === 3 && !!templateId) ||
    step === 4

  const canSubmit = step1Valid && step2Valid && !!templateId

  const fullShopUrl = `https://${slug || '…'}.${DISPLAY_ROOT_DOMAIN}`

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-sand-50 to-white px-4 py-12">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-100 opacity-50 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-gold-300 opacity-20 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-2xl rounded-2xl border border-sand-200 bg-white p-8 shadow-xl shadow-ink-900/5 lg:p-10">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={40} withWordmark={false} />
          <h1 className="font-heading text-xl font-bold text-ink-900">Créons ta boutique</h1>
          <p className="max-w-md text-sm text-gray-500">
            Quelques étapes rapides et ta boutique est prête.
          </p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2 sm:gap-4">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step === s.number
                    ? 'bg-brand-600 text-white'
                    : step > s.number
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > s.number ? <Check size={14} className="text-white" /> : s.number}
              </div>
              <span className={`hidden text-xs font-medium sm:block ${step === s.number ? 'text-ink-900' : 'text-gray-400'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-6 bg-gray-200 sm:block" />}
            </div>
          ))}
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
          {step === 1 && (
            <>
              <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User size={15} className="text-gray-400" aria-hidden /> Tes coordonnées
              </p>

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
                    placeholder="+221770000000"
                    className={fieldClass}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Un numéro pour te joindre, toi — différent du numéro de ta boutique.
                </p>
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
                <p className="mt-1 text-xs text-gray-500">Ce compte sera lié à ta boutique.</p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
                  Nom de ta boutique
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
                  Adresse de ta boutique
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
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+221771234567"
                    className={fieldClass}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  C'est ce numéro qui recevra les commandes. Il peut être différent de ton numéro personnel.
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Palette size={15} className="text-gray-400" aria-hidden /> Choisis le thème de ta boutique
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {STORE_TEMPLATES.map((template) => {
                  const selected = templateId === template.key
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => setTemplateId(template.key)}
                      aria-pressed={selected}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        selected ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: template.swatch[0] }}
                          aria-hidden
                        />
                        <span
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: template.swatch[1] }}
                          aria-hidden
                        />
                        <span className="ml-auto text-xs font-semibold text-brand-700">{selected ? '✓' : ''}</span>
                      </span>
                      <span className="mt-2 block text-sm font-semibold text-ink-900">{template.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-gray-500">{template.description}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">Les couleurs de ta boutique s'appliquent automatiquement.</p>
            </div>
          )}

          {step === 4 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <ImageIcon size={15} className="text-gray-400" aria-hidden /> Logo de ta boutique
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
                      <p className="mt-0.5 text-xs text-gray-500">Image prête à être utilisée.</p>
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
                      Sans logo, seul le nom de ta boutique est affiché.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users size={15} className="text-gray-400" aria-hidden /> Vérifie les informations avant de créer
              </p>

              <div className="overflow-hidden rounded-xl border border-sand-200">
                <div className="flex items-center justify-between bg-sand-50/70 px-4 py-2.5">
                  <p className="text-sm font-semibold text-ink-900">Tes coordonnées</p>
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
                    <span className="text-gray-500">Nom et prénom</span>
                    <span className="truncate text-right font-medium text-ink-900">
                      {firstName.trim()} {lastName.trim()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Téléphone personnel</span>
                    <span className="truncate text-right font-medium text-ink-900">{personalPhone}</span>
                  </div>
                  {personalAddress.trim() && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Adresse</span>
                      <span className="truncate text-right font-medium text-ink-900">{personalAddress.trim()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-sand-200">
                <div className="flex items-center justify-between bg-sand-50/70 px-4 py-2.5">
                  <p className="text-sm font-semibold text-ink-900">Ta boutique</p>
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
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Thème</span>
                    <span className="flex items-center justify-end gap-1.5 font-medium text-ink-900">
                      <Palette size={14} className="text-gray-400" aria-hidden />
                      <span>{selectedTemplate.label}</span>
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: selectedTemplate.themeColor }}
                        aria-hidden
                      />
                    </span>
                  </div>
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
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                <ArrowLeft size={15} aria-hidden /> Retour
              </button>
            )}

            <div className="flex-1" />

            {step < 5 ? (
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => {
                  setError(null)
                  setStep((s) => s + 1)
                }}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending ? 'Création…' : 'Confirmer et créer ma boutique'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}