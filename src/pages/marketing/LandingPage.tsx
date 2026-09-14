import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle, Package, ShieldCheck, Store } from 'lucide-react'

const features = [
  {
    icon: Store,
    title: 'Ta boutique en ligne',
    description: 'Catalogue, catégories, photos, stock — gérés depuis un dashboard simple.',
  },
  {
    icon: MessageCircle,
    title: 'Commandes via WhatsApp',
    description: 'Le client commande sur ta boutique, tu reçois le message directement sur WhatsApp.',
  },
  {
    icon: Package,
    title: 'Gestion du stock en temps réel',
    description: 'Le stock se met à jour automatiquement à chaque commande, sans double-vente.',
  },
  {
    icon: ShieldCheck,
    title: 'Sécurisé dès le départ',
    description: 'Chaque boutique est isolée et protégée ; seule la commerçante gère ses données.',
  },
]

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Store size={22} className="text-brand-600" aria-hidden />
            <span>Boutique en ligne</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/admin/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Connexion
            </Link>
            <Link
              to="/inscription"
              className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Créer ma boutique
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Vends en ligne, reçois tes commandes sur WhatsApp
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">
              Crée ta boutique en quelques minutes : catalogue, panier, commandes — sans compte
              client à gérer, sans paiement en ligne compliqué.
            </p>
            <Link
              to="/inscription"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Créer ma boutique gratuitement
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title}>
                <Icon size={24} className="text-brand-600" aria-hidden />
                <h2 className="mt-3 text-sm font-semibold text-gray-900">{title}</h2>
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Boutique en ligne.</p>
      </footer>
    </div>
  )
}
