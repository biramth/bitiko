import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Globe, MessageCircle, Store, XCircle } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { createShop, isSlugAvailable, sendWelcomeEmail } from '@/services/shop.service'
import { seedDefaultDeliverySecteurs } from '@/services/deliverySecteur.service'
import { ensureProfile } from '@/services/profile.service'
import { slugify } from '@/utils/format'
import { isValidSlug, DISPLAY_ROOT_DOMAIN } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

export function OnboardingPage() {
  usePageSeo({ title: 'Créer ta boutique — Bitiko', noindex: true })
  const { user } = useAuth()
  const { data: existingShop, isLoading: shopLoading } = useMyShop()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [error, setError] = useState<string | null>(null)

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
          setError(
            err instanceof Error ? err.message : 'Impossible de vérifier la disponibilité du nom.',
          )
        }
      })
    return () => {
      active = false
    }
  }, [slug, debouncedSlug])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      await ensureProfile(user.id)
      const shop = await createShop({ ownerId: user.id, name: name.trim(), slug, whatsappNumber })
      await seedDefaultDeliverySecteurs(shop.id)
      return shop
    },
    onSuccess: (shop) => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      void sendWelcomeEmail(shop.id)
      navigate('/admin', { replace: true })
    },
    onError: (err: Error) => setError(err?.message || 'Impossible de créer la boutique. Réessayez.'),
  })

  if (shopLoading) return <Spinner />
  if (existingShop) return <Navigate to="/admin" replace />

  const slugStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error' = !slug
    ? 'idle'
    : !isValidSlug(slug)
      ? 'invalid'
      : slug !== debouncedSlug || availability === null
        ? 'checking'
        : availability

  const canSubmit =
    name.trim().length > 0 &&
    (slugStatus === 'available' || slugStatus === 'error') &&
    whatsappNumber.trim().length > 0

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-sand-50 to-white px-4 py-12">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-100 opacity-50 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-gold-300 opacity-20 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-md rounded-2xl border border-sand-200 bg-white p-8 shadow-xl shadow-ink-900/5">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Logo size={40} withWordmark={false} />
          <h1 className="font-heading text-xl font-bold text-ink-900">Créons ta boutique</h1>
          <p className="text-sm text-gray-500">Quelques informations pour démarrer en quelques minutes.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            if (canSubmit) mutation.mutate()
          }}
          className="space-y-5"
        >
          <div>
            <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
              Nom de la boutique
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
              Adresse de la boutique
            </label>
            <div className="relative mt-1">
              <Globe size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                id="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  setSlug(slugify(e.target.value))
                }}
                placeholder="chez-awa"
                className={`${fieldClass} pr-24`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                .{DISPLAY_ROOT_DOMAIN}
              </span>
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
                  Vérification impossible — la base de données Supabase semble inaccessible
                  (as-tu appliqué les migrations SQL ?)
                </span>
              )}
            </p>
          </div>

          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
              Numéro WhatsApp
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
            <p className="mt-1 text-xs text-gray-500">C'est ce numéro qui recevra tes commandes.</p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? 'Création…' : 'Créer ma boutique'}
            {!mutation.isPending && <ArrowRight size={15} aria-hidden />}
          </button>
        </form>
      </div>
    </div>
  )
}