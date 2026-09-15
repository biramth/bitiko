import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

/** Shared chrome for the legal pages (CGU, confidentialité) — a simple
 *  article layout, not the marketing/app shell, since these are meant to be
 *  linked to from anywhere (signup, storefront footers) and read in isolation. */
export function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={28} withWordmark={false} />
            <span className="font-heading text-base font-bold text-ink-900">Bitiko</span>
          </Link>
          <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Retour à l'accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-heading text-2xl font-bold text-ink-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : {updatedAt}</p>
        <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-gray-700">
          {children}
        </div>
      </main>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-lg font-semibold text-ink-900">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  )
}
