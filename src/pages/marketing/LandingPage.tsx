import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle, Package, ShieldCheck, Smartphone, Wifi, Zap } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { usePageSeo } from '@/hooks/usePageSeo'

const features = [
  {
    icon: MessageCircle,
    title: 'Commandes sur WhatsApp',
    description:
      'Le client commande sur ta boutique, tu reçois le message directement sur WhatsApp — l\'appli que tout le monde utilise déjà.',
  },
  {
    icon: Package,
    title: 'Stock à jour en temps réel',
    description: 'Chaque commande met le stock à jour automatiquement, sans risque de vendre deux fois le même article.',
  },
  {
    icon: Smartphone,
    title: 'Pensé pour le mobile',
    description: 'Boutique, panier et dashboard pensés d\'abord pour l\'écran de téléphone — là où sont tes clients.',
  },
  {
    icon: Wifi,
    title: 'Rapide même en 3G',
    description: 'Pages légères, images optimisées : ta boutique se charge vite, même avec une connexion moyenne.',
  },
  {
    icon: ShieldCheck,
    title: 'Ta boutique, tes données',
    description: 'Chaque boutique est isolée et protégée. Toi seul(e) gères tes produits, tes prix et tes commandes.',
  },
  {
    icon: Zap,
    title: 'En ligne en 5 minutes',
    description: 'Crée ton compte, nomme ta boutique, ajoute tes produits — pas besoin de compétences techniques.',
  },
]

export function LandingPage() {
  usePageSeo({
    title: 'Bitiko — Crée ta boutique en ligne, vends sur WhatsApp',
    description:
      "Bitiko te donne une vraie boutique en ligne — catalogue, panier, commandes — et relaie tes ventes directement sur WhatsApp. Fait pour l'Afrique, gratuit pour commencer.",
  })

  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      <header className="border-b border-sand-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo size={24} />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/admin/login"
              className="hidden text-sm font-medium text-ink-700 hover:text-ink-900 sm:block"
            >
              Connexion
            </Link>
            <Link
              to="/inscription"
              className="rounded-full bg-brand-600 px-3 py-2 text-xs font-medium whitespace-nowrap text-white hover:bg-brand-700 sm:px-4 sm:text-sm"
            >
              Créer ma boutique
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-sand-200">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              Fait pour l'Afrique
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Ta boutique en ligne. Tes commandes sur WhatsApp.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-700/80">
              Bitiko te donne une vraie boutique en ligne — catalogue, panier, commandes — sans
              compte client à gérer et sans paiement en ligne compliqué. Le client commande, toi tu
              reçois sur WhatsApp.
            </p>
            <Link
              to="/inscription"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Créer ma boutique gratuitement
              <ArrowRight size={16} aria-hidden />
            </Link>
            <p className="mt-3 text-xs text-ink-700/60">Gratuit pour commencer. Pas de carte bancaire requise.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-sand-200 bg-white p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                  <Icon size={20} className="text-brand-700" aria-hidden />
                </span>
                <h2 className="mt-4 text-sm font-semibold text-ink-900">{title}</h2>
                <p className="mt-1 text-sm text-ink-700/70">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-sand-200 bg-ink-900">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Vends comme au marché. En ligne.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-100/80">
              Que tu vendes des vêtements, de la nourriture, des produits de beauté ou de
              l'artisanat — Bitiko s'adapte à ta manière de vendre, pas l'inverse.
            </p>
            <Link
              to="/inscription"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-400 px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-gold-300"
            >
              Commencer maintenant
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-ink-700/60">
        <p>© {new Date().getFullYear()} Bitiko.</p>
      </footer>
    </div>
  )
}
