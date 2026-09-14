import { Store } from 'lucide-react'

export function ShopNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <Store size={40} className="text-gray-300" aria-hidden />
      <h1 className="text-xl font-semibold text-gray-900">Boutique introuvable</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Cette adresse ne correspond à aucune boutique active. Vérifiez le lien ou contactez le
        commerçant.
      </p>
    </div>
  )
}
