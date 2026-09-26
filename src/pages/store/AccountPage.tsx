import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogOut, Mail, MessageCircle, Package } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/AuthContext'
import { useTenant } from '@/features/tenant/TenantContext'
import { listMyOrders } from '@/services/order.service'
import { formatCurrency, whatsappHref } from '@/utils/format'
import { useStorefrontCapabilities } from '@/features/store-builder/useStorefrontCapabilities'
import { getStorefrontVocabulary } from '@/config/storefrontVocabulary'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/config/constants'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageSeo } from '@/hooks/usePageSeo'
import type { OrderStatus } from '@/types'

/** Buyer account (optional — guest checkout stays untouched): email magic
 *  code login, then the order history of that email on this shop. */
export function AccountPage() {
  const { shop } = useTenant()
  const { user, loading: authLoading, signOut } = useAuth()
  usePageSeo({ title: shop ? `Mon compte — ${shop.name}` : 'Mon compte', noindex: true, siteName: shop?.name })
  const vocab = getStorefrontVocabulary(useStorefrontCapabilities(shop))

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['my-orders', shop?.id, user?.email],
    queryFn: () => listMyOrders(shop!.id),
    enabled: !!shop?.id && !!user?.email,
  })

  const [resent, setResent] = useState(false)

  const sendCode = async (): Promise<boolean> => {
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setSending(false)
    if (error) setError('Envoi impossible. Vérifiez l’adresse email.')
    return !error
  }

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await sendCode()) setStep('code')
  }

  const resendCode = async () => {
    setResent(false)
    if (await sendCode()) setResent(true)
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setVerifying(false)
    if (error) setError('Code invalide ou expiré. Redemandez un code.')
  }

  if (authLoading || !shop) return <Spinner />

  if (!user?.email) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand-100">
          <Mail size={24} aria-hidden className="text-[var(--shop-text)]/70" />
        </span>
        <h1 className="mt-4 text-center font-heading text-xl font-bold text-[var(--shop-text)]">Mon compte</h1>
        <p className="mt-2 text-center text-sm text-[var(--shop-text)]/60">
          Recevez un code par email pour retrouver vos commandes. Sans compte, commandez librement —
          aucun compte n'est exigé pour acheter.
        </p>
        {step === 'email' ? (
          <form onSubmit={requestCode} className="mt-6 space-y-3">
            <label htmlFor="account-email" className="sr-only">Adresse email</label>
            <input
              id="account-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              autoComplete="email"
              className="w-full border border-[var(--shop-text)]/15 bg-transparent px-4 py-3 text-base text-[var(--shop-text)] placeholder:text-[var(--shop-text)]/35 focus:border-[var(--shop-text)] focus:outline-none"
              style={{ borderRadius: 'var(--shop-radius)' }}
            />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-[var(--shop-button)] py-3 text-sm font-semibold text-[var(--shop-button-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ borderRadius: 'var(--shop-radius)' }}
            >
              {sending ? 'Envoi…' : 'Recevoir mon code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-6 space-y-3">
            <p className="text-center text-sm text-[var(--shop-text)]/60">
              Code envoyé à <span className="font-semibold text-[var(--shop-text)]">{email}</span>
            </p>
            <label htmlFor="account-code" className="sr-only">Code reçu par email</label>
            <input
              id="account-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code à 6 chiffres"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full border border-[var(--shop-text)]/15 bg-transparent px-4 py-3 text-center text-base tracking-[0.3em] text-[var(--shop-text)] focus:border-[var(--shop-text)] focus:outline-none"
              style={{ borderRadius: 'var(--shop-radius)' }}
            />
            {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
            {resent && !error && <p role="status" className="text-center text-sm text-emerald-600">Nouveau code envoyé.</p>}
            <button
              type="submit"
              disabled={verifying || !code.trim()}
              className="w-full bg-[var(--shop-button)] py-3 text-sm font-semibold text-[var(--shop-button-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ borderRadius: 'var(--shop-radius)' }}
            >
              {verifying ? 'Vérification…' : 'Voir mes commandes'}
            </button>
            <button
              type="button"
              onClick={() => void resendCode()}
              disabled={sending}
              className="w-full text-center text-sm text-[var(--shop-text)]/60 underline underline-offset-2 disabled:opacity-60"
            >
              {sending ? 'Envoi…' : 'Renvoyer le code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(null)
                setResent(false)
              }}
              className="w-full text-center text-sm text-[var(--shop-text)]/60 underline underline-offset-2"
            >
              Changer d'email
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold text-[var(--shop-text)]">Mon compte</h1>
          <p className="truncate text-sm text-[var(--shop-text)]/60">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex shrink-0 items-center gap-1.5 border border-[var(--shop-text)]/15 px-3 py-2 text-sm font-medium text-[var(--shop-text)]"
          style={{ borderRadius: 'var(--shop-radius)' }}
        >
          <LogOut size={14} aria-hidden /> Déconnexion
        </button>
      </div>

      <h2 className="mt-8 font-heading text-base font-bold text-[var(--shop-text)]">Mes commandes</h2>
      {ordersLoading && <Spinner />}
      {!ordersLoading && (orders?.length ?? 0) === 0 && (
        <EmptyState
          icon={Package}
          title="Aucune commande liée à cet email"
          description="Vos commandes apparaissent ici quand vous renseignez cet email au moment de commander."
        />
      )}
      <ul className="mt-4 space-y-3">
        {(orders ?? []).map((order) => (
          <li
            key={order.id}
            className="border border-[var(--shop-text)]/10 bg-[var(--shop-bg)] p-4"
            style={{ borderRadius: 'var(--shop-radius)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--shop-text)]">{order.order_number}</p>
                <p className="text-xs text-[var(--shop-text)]/50">
                  {new Date(order.created_at).toLocaleDateString('fr-FR')} ·{' '}
                  {(order.items ?? []).reduce((n, i) => n + i.quantity, 0)} article(s)
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status as OrderStatus] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
              </span>
            </div>
            <ul className="mt-3 space-y-1 border-t border-[var(--shop-text)]/10 pt-3 text-sm text-[var(--shop-text)]/80">
              {(order.items ?? []).map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="shrink-0">{formatCurrency(Number(item.subtotal), shop.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between gap-3">
              {shop.whatsapp_number ? (
                <a
                  href={`${whatsappHref(shop.whatsapp_number)}?text=${encodeURIComponent(`Bonjour, une question sur ma commande ${order.order_number}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--shop-text)]/70 underline underline-offset-2 hover:text-[var(--shop-text)]"
                >
                  <MessageCircle size={13} aria-hidden /> Une question ? Écrire au vendeur
                </a>
              ) : (
                <span />
              )}
              <p className="text-sm font-bold text-[var(--shop-text)]">
                Total {formatCurrency(Number(order.total), shop.currency)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Link
        to={vocab.catalogHref}
        className="mt-6 inline-block text-sm font-medium text-[var(--shop-text)] underline underline-offset-2"
      >
        Continuer mes achats →
      </Link>
    </div>
  )
}
