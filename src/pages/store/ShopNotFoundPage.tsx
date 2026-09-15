import { Store } from 'lucide-react'
import { platformUrl } from '@/lib/tenant'
import { usePageSeo } from '@/hooks/usePageSeo'

export function ShopNotFoundPage() {
  usePageSeo({ title: 'Boutique introuvable', noindex: true })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sand-50 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
        <Store size={28} className="text-brand-500" aria-hidden />
      </span>
      <h1 className="font-heading text-xl font-bold text-ink-900">Boutique introuvable</h1>
      <p className="max-w-sm text-sm text-ink-700/60">
        Cette adresse ne correspond à aucune boutique active. Vérifiez le lien ou contactez le
        commerçant.
      </p>
      <a
        href={platformUrl()}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700"
      >
        Créer votre boutique
      </a>
    </div>
  )
}
