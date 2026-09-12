import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">404</h1>
      <p className="text-gray-600">Cette page n'existe pas.</p>
      <Link to="/" className="text-sm font-medium text-brand-700">
        Retour à l'accueil
      </Link>
    </div>
  )
}
