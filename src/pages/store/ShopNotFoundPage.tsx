import { Store } from 'lucide-react'
import { platformUrl } from '@/lib/tenant'
import { usePageSeo } from '@/hooks/usePageSeo'

export function ShopNotFoundPage() {
  usePageSeo({ title: 'Boutique introuvable', noindex: true })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <Store size={40} className="text-gray-300" aria-hidden />
      <h1 className="text-xl font-semibold text-gray-900">Boutique introuvable</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Cette adresse ne correspond à aucune boutique active. Vérifiez le lien ou contactez le
        commerçant.
      </p>
      <a
        href={platformUrl()}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Créer votre boutique
      </a>
    </div>
  )
}
