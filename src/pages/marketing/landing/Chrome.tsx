import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { SOLUTION_PAGES } from '../solutions/data'

const produitLinks = [
  { label: 'Espace en ligne', href: '#fonctionnalites', description: 'Catalogue, panier, réservation, checkout' },
  { label: 'Rendez-vous & réservations', href: '#visite', description: 'Agenda, horaires par jour, tables' },
  { label: 'Finances & bilan', href: '#visite', description: 'Recettes, dépenses, export PDF et Excel' },
  { label: 'Zones de livraison', href: '#fonctionnalites', description: 'Secteurs, villes, tarifs automatiques' },
]

/* ─────────────────────── Nav ─────────────────────────────── */

export function SiteNav() {
  // Sur la page d'accueil les ancres restent locales ; ailleurs elles pointent vers l'accueil.
  const home = useLocation().pathname === '/' ? '' : '/'
  const [produitOpen, setProduitOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      ) {
        setProduitOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24)
      setProduitOpen(false)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const dropdownStyle: React.CSSProperties = produitOpen && triggerRef.current
    ? {
        position: 'fixed',
        top: triggerRef.current.getBoundingClientRect().bottom + window.scrollY + 8,
        left: triggerRef.current.getBoundingClientRect().left + window.scrollX,
        zIndex: 40,
      }
    : {}

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 px-3 pt-3 transition-all duration-300 sm:px-4 ${
        scrolled ? 'pb-3 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_70%,transparent)]' : ''
      }`}
    >
      <div
        className={`mx-auto flex h-16 items-center justify-between px-4 transition-all duration-300 lg:px-6 ${
          scrolled
            ? 'max-w-4xl rounded-full border border-sand-200 bg-white/95 shadow-lg shadow-ink-900/[0.06] backdrop-blur-md'
            : 'max-w-6xl rounded-full border border-transparent bg-transparent'
        }`}
      >
        {/* Left: logo + desktop center links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="shrink-0 transition-opacity hover:opacity-80">
            <Logo size={20} />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-700 lg:flex" aria-label="Navigation principale">
            <div className="relative" onMouseEnter={() => setProduitOpen(true)} onMouseLeave={() => setProduitOpen(false)}>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setProduitOpen((v) => !v)}
                aria-expanded={produitOpen}
                aria-haspopup="true"
                className="flex items-center gap-1 transition-opacity hover:opacity-70"
              >
                Produit
                <ChevronDown size={14} className={`transition-transform ${produitOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <a href={`${home}#fonctionnalites`} className="transition-opacity hover:opacity-70">Fonctionnalités</a>
            <a href={`${home}#tarifs`} className="transition-opacity hover:opacity-70">Tarifs</a>
          </nav>
        </div>

        {/* Right: auth buttons (desktop) */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/admin/login" className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-800 transition-opacity hover:opacity-70">
            Connexion
          </Link>
          <Link to="/admin/login" className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700">
            Créer mon espace <ArrowRight size={15} aria-hidden />
          </Link>
        </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-900 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Dropdown rendered at header level to avoid clipping by rounded-full inner container */}
      {produitOpen && triggerRef.current && (
        <div
          style={dropdownStyle}
          className="w-72 rounded-2xl border border-sand-200 bg-white p-2 shadow-xl"
          role="menu"
        >
          {produitLinks.map(({ label, href, description }) => (
            <a
              key={label}
              href={`${home}${href}`}
              onClick={() => setProduitOpen(false)}
              className="block rounded-xl px-3 py-2.5 hover:bg-sand-50"
              role="menuitem"
            >
              <span className="block text-sm font-medium text-ink-900">{label}</span>
              <span className="block text-xs text-ink-700/75">{description}</span>
            </a>
          ))}
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-sand-100 bg-white px-4 pb-4 pt-3 lg:hidden">
          <div className="space-y-1">
            <a href={`${home}#fonctionnalites`} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-sand-50">Fonctionnalités</a>
            <a href={`${home}#solutions`} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-sand-50">Solutions</a>
            <a href={`${home}#tarifs`} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-sand-50">Tarifs</a>
            <a href={`${home}#faq`} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-sand-50">FAQ</a>
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-sand-100 pt-3">
            <Link to="/admin/login" onClick={() => setMobileOpen(false)} className="rounded-full border border-sand-200 px-4 py-2.5 text-center text-sm font-medium text-ink-800">Connexion</Link>
            <Link to="/admin/login" onClick={() => setMobileOpen(false)} className="rounded-full bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-md">Créer mon espace</Link>
          </div>
        </div>
      )}
    </header>
  )
}

/* ─────────────────── Phone Mockup ──────────────────────────── */

/** Pied de page commun (accueil, pages solutions, pages légales) : maillage interne vers toutes les pages indexables. */
export function SiteFooter() {
  const home = useLocation().pathname === '/' ? '' : '/'
  const linkClass = 'text-ink-700 transition-colors hover:text-ink-900'
  return (
    <footer className="border-t border-sand-200 py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 text-sm min-[480px]:grid-cols-2 sm:px-6 lg:grid-cols-5">
        <div className="hidden lg:block">
          <Logo size={20} />
          <p className="mt-6 text-xs text-ink-700">&copy; {new Date().getFullYear()} Bitiko</p>
        </div>
        <div>
          <p className="mb-5 text-sm font-semibold text-ink-900">Solutions</p>
          <ul className="flex flex-col gap-2.5">
            {SOLUTION_PAGES.map((page) => (
              <li key={page.slug}><Link to={`/solutions/${page.slug}`} className={linkClass}>{page.navLabel}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-5 text-sm font-semibold text-ink-900">Produit</p>
          <ul className="flex flex-col gap-2.5">
            <li><a href={`${home}#fonctionnalites`} className={linkClass}>Fonctionnalités</a></li>
            <li><a href={`${home}#visite`} className={linkClass}>Rendez-vous & réservations</a></li>
            <li><a href={`${home}#visite`} className={linkClass}>Finances & bilan</a></li>
            <li><a href={`${home}#demo`} className={linkClass}>Démo vidéo</a></li>
            <li><a href={`${home}#tarifs`} className={linkClass}>Tarifs</a></li>
            <li><a href={`${home}#faq`} className={linkClass}>FAQ</a></li>
          </ul>
        </div>
        <div>
          <p className="mb-5 text-sm font-semibold text-ink-900">Bitiko</p>
          <ul className="flex flex-col gap-2.5">
            <li><Link to="/admin/login" className={linkClass}>Connexion</Link></li>
            <li><Link to="/admin/login" className={linkClass}>Créer mon espace</Link></li>
            <li><a href={`${home}#marche`} className={linkClass}>Comment ça marche</a></li>
            <li>
              <a href="https://www.instagram.com/bitiko.shop/" target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 ${linkClass}`}>
                <SocialIcon platform="instagram" size={14} /> Instagram
              </a>
            </li>
            <li>
              <a href="https://www.tiktok.com/@bitiko.shop" target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 ${linkClass}`}>
                <SocialIcon platform="tiktok" size={14} /> TikTok
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-5 text-sm font-semibold text-ink-900">Informations légales</p>
          <ul className="flex flex-col gap-2.5">
            <li><Link to="/legal/cgu" className={linkClass}>Conditions d'utilisation</Link></li>
            <li><Link to="/legal/confidentialite" className={linkClass}>Confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center gap-1 text-center lg:hidden">
        <Logo size={18} />
        <p className="text-xs text-ink-700">&copy; {new Date().getFullYear()} Bitiko</p>
      </div>
    </footer>
  )
}
