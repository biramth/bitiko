import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Store, XCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { createShop, isSlugAvailable } from '@/services/shop.service'
import { ensureProfile } from '@/services/profile.service'
import { slugify } from '@/utils/format'
import { isValidSlug } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'

export function OnboardingPage() {
  const { user } = useAuth()
  const { data: existingShop, isLoading: shopLoading } = useMyShop()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name))
  }, [name, slugEdited])

  useEffect(() => {
    if (!slug) {
      setSlugStatus('idle')
      return
    }
    if (!isValidSlug(slug)) {
      setSlugStatus('invalid')
      return
    }
    setSlugStatus('checking')
    const timeout = setTimeout(async () => {
      try {
        const available = await isSlugAvailable(slug)
        setSlugStatus(available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [slug])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      await ensureProfile(user.id)
      return createShop({ ownerId: user.id, name: name.trim(), slug, whatsappNumber })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      navigate('/admin', { replace: true })
    },
    onError: () => setError('Impossible de créer la boutique. Réessayez.'),
  })

  if (shopLoading) return <Spinner />
  if (existingShop) return <Navigate to="/admin" replace />

  const canSubmit = name.trim().length > 0 && slugStatus === 'available' && whatsappNumber.trim().length > 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Store size={28} className="text-brand-600" aria-hidden />
          <h1 className="text-lg font-semibold text-gray-900">Créons ta boutique</h1>
          <p className="text-sm text-gray-500">Quelques informations pour démarrer</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            if (canSubmit) mutation.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
              Nom de la boutique
            </label>
            <input
              id="shopName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Chez Awa"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Adresse de la boutique
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-gray-200 focus-within:border-gray-400">
              <input
                id="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  setSlug(slugify(e.target.value))
                }}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
              <span className="shrink-0 pr-3 text-sm text-gray-400">.tonapp.com</span>
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
            </p>
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
            <p className="mt-1 text-xs text-gray-500">C'est ce numéro qui recevra tes commandes.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || mutation.isPending}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? 'Création…' : 'Créer ma boutique'}
          </button>
        </form>
      </div>
    </div>
  )
}
