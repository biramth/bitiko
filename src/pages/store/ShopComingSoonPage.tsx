import { Clock } from 'lucide-react'
import { platformUrl } from '@/lib/tenant'
import { usePageSeo } from '@/hooks/usePageSeo'

/** Vitrine d'une boutique dont le propriétaire n'a pas encore confirmé son email. */
export function ShopComingSoonPage({ shopName }: { shopName: string }) {
  usePageSeo({ title: `${shopName} — bientôt en ligne`, noindex: true })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sand-50 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
        <Clock size={28} className="text-brand-500" aria-hidden />
      </span>
      <h1 className="font-heading text-xl font-bold text-ink-900">{shopName} arrive bientôt</h1>
      <p className="max-w-sm text-sm text-ink-700/60">
        Cette boutique est en cours de préparation et n’accepte pas encore de commandes. Revenez dans quelques instants.
      </p>
      <a
        href={platformUrl()}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100"
      >
        Découvrir Bitiko
      </a>
    </div>
  )
}
