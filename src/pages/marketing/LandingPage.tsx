import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Clock, Gift, Menu, Minus, Phone, Play, Plus, ShoppingCart, Smartphone, Wallet, X, Zap } from 'lucide-react'
import { PLANS } from '@/config/plans'
import { Logo } from '@/components/ui/Logo'
import { IconTile } from '@/components/ui/IconTile'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { formatPromoDate, useLandingPromo } from '@/features/billing/useLandingPromo'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useFaqStructuredData } from '@/hooks/useFaqStructuredData'
import { useSoftwareStructuredData } from '@/hooks/useSoftwareStructuredData'
import { Audiences, DemoVideo, FeatureGroups, HeroShots, Tour } from './landing/Sections'
import { shopCategories, solutions, westAfrica } from './landing/content'
import { Reveal, SectionEyebrow } from './landing/ui'

/** Counts up from 0 to `target` once the element scrolls into view — the
 * small "alive" detail both reference sites use on their stat strips. */
function CountUpValue({ target, suffix = '' }: { target: number; suffix?: string }) {
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [value, setValue] = useState(reduceMotion ? target : 0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return
        started.current = true
        const duration = 900
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - (1 - progress) * (1 - progress)
          setValue(Math.round(eased * target))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  )
}

const comparisonRows = [
  { before: 'Envoyer des photos une par une sur WhatsApp', after: 'Catalogue en ligne avec photos, prix, stock et lien à partager' },
  { before: 'Se mettre d\'accord sur une heure par messages, oublier un rendez-vous', after: 'Le client réserve un créneau libre, tu confirmes d\'un clic' },
  { before: 'Tenir un carnet de commandes et de rendez-vous à la main', after: 'Chaque commande et réservation est enregistrée et numérotée automatiquement' },
  { before: 'Vendre du stock épuisé, doubler des rendez-vous sans le savoir', after: 'Stock et planning synchronisés en temps réel + alertes' },
  { before: 'Faire ses comptes sur un cahier en fin de mois', after: 'Recettes comptées automatiquement, dépenses en 6 champs, bilan en PDF ou Excel' },
  { before: 'Demander « t\'es dans quel quartier ? » à chaque client', after: 'Le client choisit sa ville, le tarif de livraison s\'applique' },
]

const faq = [
  {
    question: 'Est-ce que Bitiko est vraiment gratuit ?',
    answer:
      `Oui. Le plan Découverte est 100% gratuit, sans engagement et sans carte bancaire. Tu as un espace en ligne fonctionnel avec ${PLANS.free.maxActiveProducts} produits, ${PLANS.free.maxActiveServices} prestations, la prise de rendez-vous, la réservation de tables, la livraison et un bilan simple de tes finances. Essentiel à 3 000 F ajoute le builder complet, plus de produits et de prestations et 12 mois d'historique financier ; Pro à 10 000 F retire les limites et ajoute la comparaison entre périodes.`,
  },
  {
    question: 'Je vends des produits : que fait Bitiko pour moi ?',
    answer:
      'Tu obtiens une boutique en ligne à ton lien : catalogue avec photos, prix, variantes et stock, panier, livraison par secteurs et paiement en espèces ou mobile money. Chaque commande t’arrive formatée sur WhatsApp et dans ton tableau de bord, avec son statut (en attente, payée, livrée). Le stock baisse à chaque vente, tu es alerté avant la rupture, et tes clients sont enregistrés pour être relancés. Tu peux importer ton catalogue depuis un fichier CSV.',
  },
  {
    question: 'Puis-je vendre des produits et proposer des services à la fois ?',
    answer:
      'Oui. Un même espace peut avoir un catalogue de produits et des prestations réservables (par exemple un salon qui vend ses soins et ses produits). Les recettes des deux sont réunies dans le même bilan.',
  },
  {
    question: 'Comment mes clients réservent-ils, et comment suis-je prévenu ?',
    answer:
      'Le client choisit une prestation (ou une table), un jour et un créneau libre sur ton site, puis laisse son nom et son numéro. Tu reçois un email et la demande apparaît dans ton agenda : tu confirmes ou tu refuses d\'un clic, puis tu préviens ton client par téléphone ou WhatsApp depuis la même fiche. Les commandes de la boutique, elles, arrivent sur ton WhatsApp.',
  },
  {
    question: 'Les horaires peuvent-ils être différents selon les jours ?',
    answer:
      'Oui. Tu règles chaque jour séparément (par exemple samedi de 9 h à 17 h, dimanche fermé), tu peux ajouter une pause en milieu de journée et marquer des jours de congé. Le client ne voit que les créneaux réellement disponibles.',
  },
  {
    question: 'Est-ce que Bitiko fait ma comptabilité ?',
    answer:
      'Non. Bitiko te donne un bilan de gestion simple : tes recettes (commandes payées, rendez-vous terminés, ventes saisies), tes dépenses, ton bénéfice et l\'évolution mois par mois. Tu peux le télécharger en PDF ou en Excel pour ton comptable ou ta banque. Ce n\'est pas une comptabilité légale ni une déclaration fiscale.',
  },
  {
    question: 'Comment les clients paient-ils ?',
    answer:
      'Les deux options principales : espèces (à la livraison ou sur place) ou mobile money — Wave, Orange Money. Le client paie selon ce que tu actives. Tu confirmes le paiement avec lui sur WhatsApp, pas besoin de passer par un prestataire tiers.',
  },
  {
    question: 'Est-ce que je dois être développeur ?',
    answer:
      'Non. Crée ton compte, choisis un nom, ajoute tes produits ou tes prestations — c\'est tout. Pas de ligne de code. Si tu sais envoyer une photo sur WhatsApp, tu sais utiliser Bitiko.',
  },
  {
    question: 'Comment ça marche pour la livraison ?',
    answer:
      'Tu définis tes secteurs (par exemple Dakar, Rufisque, Thiès) et le tarif par secteur. À l\'intérieur de chaque secteur, tu listes les villes. Au checkout, le client choisit sa ville et le tarif s\'applique automatiquement. Tu peux aussi activer la livraison gratuite au-delà d\'un certain montant.',
  },
  {
    question: 'Puis-je utiliser Bitiko hors du Sénégal ?',
    answer:
      'Oui. Tu choisis ton pays à la création de ton espace : les numéros de téléphone, le fuseau horaire des créneaux et la devise s\'adaptent. Les prix de Bitiko sont affichés en francs CFA.',
  },
  {
    question: 'Qui peut voir mon espace ?',
    answer:
      'Avec tous les plans, ton espace est public sur son sous-domaine bitiko.shop. La personnalisation de base est disponible gratuitement ; les images de catégories sont disponibles avec Essentiel et Pro, et la marque Bitiko se retire avec Pro.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer:
      'Chaque activité est complètement isolée. Toi seul(e) et les personnes de ton équipe que tu invites peuvent voir tes commandes, tes rendez-vous et tes paramètres ; tes finances restent réservées au propriétaire et aux managers. Notre équipe support ne peut accéder à tes données que pour t\'aider, et chaque accès est tracé.',
  },
  {
    question: 'Est-ce que je paye une commission sur mes ventes ?',
    answer:
      'Non. Zéro commission. Quoi que tu vendes, tu gardes 100% du prix. Le plan gratuit est vraiment gratuit, puis Essentiel coûte 3 000 F/mois et Pro 10 000 F/mois — rien de plus sur tes revenus. L\'abonnement se renouvelle à la main : sans paiement, ton espace repasse simplement au plan gratuit.',
  },
]

/* ─────────────────────── Components ────────────────────────── */

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string
  answer: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="group border-b border-ink-900/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-heading text-sm font-semibold text-ink-900 transition-colors group-hover:text-brand-700 sm:text-base">{question}</span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${open ? 'rotate-180 bg-brand-600' : 'bg-ink-100 group-hover:bg-brand-100'}`}>
          {open ? <Minus size={13} className="text-white" /> : <Plus size={13} className="text-ink-700" />}
        </span>
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <p className="overflow-hidden pr-10 text-sm leading-relaxed text-ink-700/70">
          <span className="block pb-5">{answer}</span>
        </p>
      </div>
    </div>
  )
}

const produitLinks = [
  { label: 'Espace en ligne', href: '#fonctionnalites', description: 'Catalogue, panier, réservation, checkout' },
  { label: 'Rendez-vous & réservations', href: '#visite', description: 'Agenda, horaires par jour, tables' },
  { label: 'Finances & bilan', href: '#visite', description: 'Recettes, dépenses, export PDF et Excel' },
  { label: 'Zones de livraison', href: '#fonctionnalites', description: 'Secteurs, villes, tarifs automatiques' },
]

/* ─────────────────────── Nav ─────────────────────────────── */

function Nav() {
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
            <a href="#fonctionnalites" className="transition-opacity hover:opacity-70">Fonctionnalités</a>
            <a href="#tarifs" className="transition-opacity hover:opacity-70">Tarifs</a>
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
              href={href}
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
            <a href="#fonctionnalites" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-sand-50">Fonctionnalités</a>
            <a href="#solutions" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-sand-50">Solutions</a>
            <a href="#tarifs" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-sand-50">Tarifs</a>
            <a href="#faq" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-sand-50">FAQ</a>
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

/* ─────────────────── Hero backdrop ─────────────────────────── */

/**
 * Two soft "wing" panels flanking the hero, narrow at the top corners and
 * widening toward the bottom — traced from the actual geometry of a
 * reference SaaS hero (fetched and measured directly), not eyeballed. Each
 * wing is a frosted glass panel (blur) with a thin fading gradient line
 * along its diagonal edge — quiet, no hard shapes, warm Bitiko tones instead
 * of the reference's mint green.
 */
function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] w-full overflow-hidden sm:h-[480px] lg:h-[560px]">
      {/* Whole-hero wash — barely-there warmth, not a color statement. */}
      <div className="absolute inset-0 bg-gradient-to-b from-gold-100/50 via-transparent to-transparent" />

      {/* Fine grid, soft-light blend so it reads as texture, not lines drawn on top. */}
      <svg className="absolute inset-0 h-full w-full mix-blend-soft-light" aria-hidden>
        <defs>
          <pattern id="heroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#C2481C" strokeOpacity="0.5" strokeWidth="1" />
          </pattern>
          <radialGradient id="heroGridFade" cx="50%" cy="10%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="heroGridMask">
            <rect width="100%" height="100%" fill="url(#heroGridFade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#heroGrid)" mask="url(#heroGridMask)" />
      </svg>

      {/* Frosted wing panels — narrow at the top corners, widening down to ~1/3 of the width at the bottom.
          Kept off small screens: full-width backdrop blur is costly above the fold on low-end phones. */}
      <div
        className="absolute inset-0 hidden bg-white/40 backdrop-blur-2xl sm:block"
        style={{ clipPath: 'polygon(0% 0%, 0% 100%, 34% 100%)' }}
      />
      <div
        className="absolute inset-0 hidden bg-white/40 backdrop-blur-2xl sm:block"
        style={{ clipPath: 'polygon(100% 0%, 100% 100%, 66% 100%)' }}
      />

      {/* The diagonal edge itself — a thin line that glows brightest mid-way and fades at both ends. */}
      <svg
        className="absolute inset-0 hidden h-full w-full sm:block mix-blend-soft-light"
        viewBox="0 0 1440 520"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="wingGlowLeft" x1="0" y1="0" x2="490" y2="480" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F2B705" stopOpacity="0" />
            <stop offset="45%" stopColor="#F2B705" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#D9612E" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wingGlowRight" x1="1440" y1="0" x2="950" y2="480" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F2B705" stopOpacity="0" />
            <stop offset="45%" stopColor="#F2B705" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#D9612E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="0" x2="490" y2="480" stroke="url(#wingGlowLeft)" strokeWidth="2" />
        <line x1="1440" y1="0" x2="950" y2="480" stroke="url(#wingGlowRight)" strokeWidth="2" />
      </svg>

      {/* Soft ambient glow — slow independent drift for a little extra depth in the open center channel. */}
      <div className="absolute left-1/2 top-16 hidden h-56 w-56 -translate-x-1/2 animate-blob rounded-full bg-gold-300/25 blur-3xl sm:block" />
    </div>
  )
}

/** Hand-drawn-style animated underline, wiggling in on load — the small
 * signature detail that reads as "designed", borrowed from the reference
 * sites' habit of underlining the one phrase that matters in the headline. */
function SquiggleUnderline() {
  return (
    <svg
      className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full animate-fade-up [animation-delay:500ms]"
      viewBox="0 0 300 12"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      <path
        d="M2,8 C 60,2 100,10 150,6 C 200,2 240,9 298,4"
        stroke="url(#squiggleGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <defs>
        <linearGradient id="squiggleGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F2B705" />
          <stop offset="100%" stopColor="#D9612E" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ─────────────────── Landing Page ─────────────────────────── */

export function LandingPage() {
  usePageSeo({
    title: 'Bitiko — Le site de ton activité : boutique, rendez-vous, services',
    description:
      "Bitiko donne à chaque activité sa présence en ligne : boutique, rendez-vous avec horaires par jour, réservation de tables et finances simples (bilan PDF et Excel) — adaptée à ton métier, pilotée depuis ton téléphone. Fait pour l'Afrique de l'Ouest, gratuit pour commencer.",
  })
  useFaqStructuredData(faq)
  useSoftwareStructuredData()
  const { promo, isLoading: promoLoading } = useLandingPromo()
  const promoDate = formatPromoDate(promo?.expires_at ?? null)

  return (
    <div className="flex min-h-screen flex-col bg-sand-50 font-sans text-ink-800">
      {promo ? (
        <div className="bg-brand-600 px-4 py-2 text-center text-xs text-white sm:text-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Gift size={15} className="shrink-0" aria-hidden />
              <strong className="font-semibold">{promo.label}</strong>
            </span>
            <span>
              Activez-le gratuitement à l’inscription{promoDate ? ` · jusqu’au ${promoDate}` : ''}
            </span>
            <Link
              to="/admin/login"
              className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              J’en profite
            </Link>
          </div>
        </div>
      ) : promoLoading ? (
        // Reserved slot while the promo resolves — the bar popping in late
        // was this page's layout shift (and its LCP element).
        <div className="min-h-[33px] sm:min-h-[37px]" aria-hidden />
      ) : null}
      <Nav />

      <main className="relative mx-auto w-full">
        {/* ── HERO ── */}
        <section className="relative mx-auto max-w-6xl overflow-hidden px-4 pb-10 pt-12 sm:overflow-visible sm:px-6 lg:flex lg:items-center lg:gap-12 lg:pt-20">
          <HeroBackdrop />
          <div className="flex-1 text-center lg:text-left">
            <a
              href="#solutions"
              className="mx-auto mb-6 hidden w-fit animate-fade-up items-center gap-1.5 rounded-3xl border border-sand-200 py-1.5 pl-2.5 pr-3 text-xs font-medium text-ink-700 shadow-[inset_0_-2px_0_#E7E0D4] transition-colors hover:bg-sand-100 lg:inline-flex"
            >
              <Zap size={13} className="text-brand-500" aria-hidden />
              Commerces et services d'Afrique de l'Ouest
              <ArrowRight size={12} className="text-ink-700" aria-hidden />
            </a>
            <h1 className="mx-auto max-w-[620px] animate-fade-up font-heading text-[28px] font-semibold leading-[1.1] tracking-tight text-ink-900 [animation-delay:100ms] sm:text-4xl lg:mx-0 lg:max-w-none lg:text-5xl xl:text-[3.3rem]">
              Vends, réserve et gère ton activité.{' '}
              <span className="relative inline-block whitespace-nowrap">
                Un seul outil
                <SquiggleUnderline />
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-[540px] animate-fade-up text-[15px] leading-relaxed text-[#605958] [animation-delay:200ms] sm:text-base lg:mx-0">
              Bitiko est la plateforme tout-en-un des commerces et des services d’Afrique de l’Ouest : boutique en ligne, rendez-vous, réservation de tables et finances. Tes clients commandent ou réservent seuls, tu es prévenu tout de suite. Aucun code, aucune carte bancaire, aucune commission.
            </p>
            <div className="mb-8 mt-8 flex animate-fade-up flex-col items-center gap-3 [animation-delay:300ms] sm:flex-row lg:justify-start">
              <Link to="/admin/login" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-4 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700 sm:w-auto">
                Créer mon espace gratuitement
                <ArrowRight size={16} aria-hidden />
              </Link>
              <a href="#demo" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-sand-300 bg-white px-6 py-4 text-sm font-medium text-ink-900 transition-colors hover:bg-sand-100 sm:w-auto">
                <Play size={15} className="text-brand-600" aria-hidden />
                Voir la démo
              </a>
            </div>
            <div className="flex animate-fade-up flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-700/75 [animation-delay:400ms] lg:justify-start">
              {['0 F pour lancer', 'Zéro commission', 'Prêt en 2 minutes', 'Sans carte bancaire'].map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <Check size={12} className="text-brand-500" aria-hidden /> {t}
                </span>
              ))}
            </div>
          </div>
          <div className="animate-fade-up [animation-delay:250ms] lg:w-[560px] lg:shrink-0">
            <HeroShots />
          </div>
        </section>

        {/* ── CATEGORY MARQUEE ── */}
        <section className="overflow-hidden border-b border-sand-200 bg-white py-6" aria-label="Secteurs d'activité couverts par Bitiko">
          <div className="flex w-max animate-marquee gap-3 [animation-play-state:running] hover:[animation-play-state:paused]">
            {shopCategories.map((category) => (
              <span
                key={category}
                className="shrink-0 whitespace-nowrap rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm font-medium text-ink-700/75 transition-colors duration-300 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                {category}
              </span>
            ))}
            <div className="contents" aria-hidden="true">
              {shopCategories.map((category) => (
                <span
                  key={`duplicate-${category}`}
                  className="shrink-0 whitespace-nowrap rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm font-medium text-ink-700/75"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── DEUX FAÇONS DE TRAVAILLER ── */}
        <Audiences />

        {/* ── DEMO VIDEO ── */}
        <DemoVideo />

        {/* ── STATS STRIP ── */}
        <section className="border-y border-sand-200 bg-white">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:py-10">
            {[
              { icon: Clock, target: 2, suffix: ' min', label: 'Mise en ligne' },
              { icon: ShoppingCart, target: 3, suffix: ' clics', label: 'Pour commander' },
              { icon: Wallet, target: 0, suffix: ' F', label: 'Pour commencer' },
              { icon: Smartphone, target: 24, suffix: 'h/24', label: 'Votre activité vend' },
            ].map(({ icon: Icon, target, suffix, label }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <IconTile icon={Icon} tone="gold" />
                <p className="mt-3 font-heading text-xl font-bold text-ink-900">
                  <CountUpValue target={target} suffix={suffix} />
                </p>
                <p className="text-xs text-ink-700/75">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROBLEM ── */}
        <section className="border-b border-sand-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Le constat</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Ton activité mérite mieux qu'un carnet et 200 messages non lus.
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/75">
                Tes clients sont en ligne, pas ton organisation. Chaque commande, chaque rendez-vous, chaque compte passe par ta mémoire. Bitiko remet tout au même endroit.
              </p>
            </Reveal>
            <div className="grid gap-8 lg:grid-cols-2">
              <Reveal className="rounded-2xl border border-red-200 bg-red-50/40 p-7">
                <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-widest text-red-500">Gérer sans Bitiko</p>
                <ul className="space-y-3.5">
                  {[
                    'Envoyer des photos un par un sur WhatsApp — le client perd patience',
                    'Noter les commandes et rendez-vous sur un carnet — des erreurs, des oublis',
                    'Calculer les totaux à la main — tu te trompes, le client se plaint',
                    'Vendre un article que tu n\'as plus en stock / doubler un rendez-vous',
                    'Perdre des commandes et réservations dans la masse de messages',
                    'Demander « tu es dans quel quartier ? » à chaque client',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm font-medium text-ink-700/80">
                      <X size={15} className="mt-0.5 shrink-0 text-red-500" aria-hidden /> {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={120} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-7">
                <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-widest text-emerald-600">Gérer avec Bitiko</p>
                <ul className="space-y-3.5">
                  {[
                    'Un vrai catalogue en ligne — ton client voit, compare, commande ou réserve à 23h',
                    'Commande sur ton WhatsApp, formatée ; rendez-vous par email et dans ton agenda',
                    'Stock et planning mis à jour automatiquement — plus de double réservation ni rupture',
                    'Secteurs et villes avec tarifs — le client choisit, le prix s\'applique',
                    'Dashboard unifié — tu vois ventes, rendez-vous, stock et finances sans ouvrir un carnet',
                    'Lien à partager sur WhatsApp, Facebook, Instagram — ton activité vit 24h/24',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <Check size={12} className="text-emerald-600" aria-hidden />
                      </span>
                      <span className="text-sm font-medium text-ink-700/80">{t}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <FeatureGroups />

        {/* ── VISITE GUIDÉE (captures réelles) ── */}
        <Tour />

        {/* ── WHATSAPP FLOW SHOWPIECE ── */}
        <section className="border-b border-sand-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Alertes & WhatsApp</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Le client commande ou réserve en ligne. Tu es prévenu tout de suite.
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/75">
                Zéro appli à télécharger. Les commandes arrivent sur ton WhatsApp, les demandes de rendez-vous et de table par email et dans ton agenda.
              </p>
            </Reveal>
            <div className="grid gap-8 sm:grid-cols-3 sm:items-start">
              {[
                { step: '1', title: 'Le client choisit', desc: 'Il parcourt ton catalogue, ajoute au panier ou réserve un créneau, choisit sa ville et son mode de paiement.' },
                { step: '2', title: 'L\'opération est enregistrée', desc: 'Stock décrémenté ou créneau réservé, frais calculés, total validé — tout côté serveur en 1 seconde.' },
                { step: '3', title: 'Tu es prévenu', desc: 'Commande : un message WhatsApp formaté (nom, détails, total, ville). Rendez-vous ou table : un email et la demande dans ton agenda, à confirmer d\'un clic.' },
              ].map(({ step, title, desc }, i) => (
                <Reveal key={step} delay={i * 120} className="relative text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white shadow-md">{step}</div>
                  <h3 className="mt-4 font-heading text-sm font-semibold text-ink-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-ink-700/70">{desc}</p>
                </Reveal>
              ))}
            </div>
            {/* Mock WhatsApp message */}
            <Reveal delay={200} className="mx-auto mt-12 max-w-sm overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 shadow-md">
              <div className="flex items-center gap-2 bg-emerald-600 px-4 py-2.5">
                <Phone size={14} className="text-white" />
                <span className="text-xs font-bold text-white">Nouvelle commande — Wax &amp; Style</span>
              </div>
              <div className="p-4">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-xs leading-relaxed text-ink-900">
                    🛒 <strong>Nouvelle commande #0042</strong><br />
                    👤 Awa Mbaye — 77 123 45 67<br />
                    📍 Parcelles Assainies, Dakar<br />
                    ━━━━━━━━━━━━━━<br />
                    2× Robe wax Aminata — 50 000 F<br />
                    Livraison — 1 500 F<br />
                    ━━━━━━━━━━━━━━<br />
                    💰 <strong>Total — 51 500 F</strong><br />
                    💳 Paiement — Wave
                  </p>
                </div>
                <p className="mt-2 text-[10px] text-emerald-700/60">Exemple de message reçu par le commerçant sur WhatsApp</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── SOLUTIONS / PERSONAS ── */}
        <section id="solutions" className="border-b border-sand-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Pour chaque métier</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Bitiko s'adapte à ton activité, pas l'inverse.
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/75">
                Vêtements, plats, cosmétiques, coiffure, réparation : ton espace et ta page publique suivent ton métier, avec des modèles prêts à l'emploi.
              </p>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2">
              {solutions.map(({ icon: Icon, tint, title, description, tags }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="group h-full rounded-2xl border border-sand-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                    <IconTile icon={Icon} tint={tint} size="lg" />
                    <h3 className="mt-4 font-heading text-base font-semibold text-ink-900">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-700/70">{description}</p>
                    <p className="mt-3 text-xs font-medium text-brand-600">{tags}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section className="border-b border-sand-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Avant / Après</SectionEyebrow>
              <h2 className="mx-auto mb-14 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Ce qui change avec Bitiko.
              </h2>
            </Reveal>
            <Reveal delay={150} className="overflow-hidden rounded-2xl border border-sand-200">
              <div className="grid grid-cols-[1fr_1px_1fr] border-b border-sand-200 bg-ink-800 text-xs font-semibold uppercase tracking-wider text-white">
                <div className="px-5 py-3">Sans Bitiko</div>
                <div className="bg-ink-700" />
                <div className="px-5 py-3">Avec Bitiko</div>
              </div>
              {comparisonRows.map(({ before, after }, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[1fr_1px_1fr] transition-colors duration-200 hover:bg-emerald-50/30 ${i < comparisonRows.length - 1 ? 'border-b border-sand-100' : ''}`}
                >
                  <div className="flex items-start gap-2.5 px-5 py-3.5">
                    <X size={14} className="mt-0.5 shrink-0 text-red-400" />
                    <span className="text-sm text-ink-700/70">{before}</span>
                  </div>
                  <div className="bg-sand-200" />
                  <div className="flex items-start gap-2.5 px-5 py-3.5">
                    <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span className="text-sm font-medium text-ink-900">{after}</span>
                  </div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ── PENSÉ POUR L'AFRIQUE DE L'OUEST ── */}
        <section className="border-b border-sand-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Pensé pour ici</SectionEyebrow>
              <h2 className="mx-auto mb-14 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Fait pour la façon dont tu travailles vraiment.
              </h2>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {westAfrica.map(({ icon: Icon, title, description }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-sand-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                    <IconTile icon={Icon} />
                    <h3 className="mt-5 font-heading text-sm font-semibold text-ink-900">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-700/70">{description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="marche" className="border-b border-sand-200 bg-ink-900">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow light>Comment ça marche</SectionEyebrow>
              <h2 className="mx-auto mb-14 max-w-[700px] font-heading text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                De l'inscription au premier client, en 3 étapes.
              </h2>
            </Reveal>
            <div className="grid gap-10 sm:grid-cols-3">
              {[
                { n: '1', title: 'Décris ton activité', desc: 'Boutique, salon, restaurant… Nom, pays, WhatsApp. Bitiko te propose un modèle adapté à ton métier.' },
                { n: '2', title: 'Ajoute ton offre', desc: 'Produits, prestations, tarifs, horaires. Tu peux importer ton catalogue en CSV.' },
                { n: '3', title: 'Partage ton lien', desc: 'WhatsApp, Instagram, Facebook, bouche-à-oreille. Tes premiers clients commandent ou réservent seuls.' },
              ].map(({ n, title, desc }, i) => (
                <Reveal key={n} delay={i * 120} className="relative text-center">
                  {i < 2 && <span className="absolute left-[calc(50%+2rem)] top-6 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-gold-400/40 to-gold-400/10 sm:block" />}
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold-400 text-lg font-bold text-ink-900 ring-2 ring-inset ring-gold-500/50 shadow-lg shadow-gold-400/30">{n}</div>
                  <h3 className="mt-5 font-heading text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm text-ink-100/70">{desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="tarifs" className="border-b border-sand-200">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Tarifs</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Un prix simple. Pas de commission.
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/75">
                Commence gratuitement, passe à un plan payant quand ton activité grandit. Tu gardes 100% de tes ventes.
              </p>
            </Reveal>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Découverte */}
              <Reveal>
                <div className="rounded-[20px] border border-sand-200 bg-white p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/5">
                  <p className="text-sm font-bold text-ink-900">Découverte</p>
                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-ink-900">0 F</span>
                  </div>
                  <p className="mt-2 text-center text-sm text-ink-700/75">Pour démarrer et tester.</p>
                  <div className="my-6 h-px w-full bg-sand-100" />
                  <ul className="space-y-3">
                    {[
                      'Vitrine en ligne complète',
                      `${PLANS.free.maxActiveProducts} produits et ${PLANS.free.maxActiveServices} prestations actifs`,
                      `Rendez-vous et réservations en ligne (${PLANS.free.maxMonthlyBookings} demandes / mois)`,
                      'Commandes sur WhatsApp, livraison par secteurs',
                      'Finances : bilan du mois, export Excel et PDF',
                      `Équipe de ${PLANS.free.maxTeamMembers} personnes`,
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                        <span className="text-ink-700/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/admin/login" className="mt-8 block w-full rounded-[100px] border border-brand-600 py-3.5 text-center text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50">
                    Créer mon espace
                  </Link>
                </div>
              </Reveal>
              {/* Essentiel */}
              <Reveal delay={80}>
                <div className="relative rounded-[20px] border border-brand-200 bg-brand-50/40 p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/5">
                  {promo?.plan === 'essential' && (
                    <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-md bg-gold-400 px-2.5 py-1 text-xs font-semibold text-ink-900"><Gift size={12} aria-hidden />{promo.days} jours offerts</span>
                  )}
                  <p className="text-sm font-bold text-ink-900">Essentiel</p>
                  <div className="mt-3 flex items-baseline justify-center gap-1"><span className="text-4xl font-bold text-ink-900">3 000 F</span><span className="text-sm text-ink-700/75">/mois</span></div>
                  {promo?.plan === 'essential' && (
                    <p className="mt-1 text-center text-xs font-medium text-brand-700">{promo.label}{promoDate ? ` — jusqu’au ${promoDate}` : ''}</p>
                  )}
                  <p className="mt-2 text-center text-sm text-ink-700/75">Pour structurer son activité.</p>
                  <div className="my-6 h-px w-full bg-brand-100" />
                  <ul className="space-y-3">
                    {[
                      'Tout le plan Découverte, plus :',
                      `${PLANS.essential.maxActiveProducts} produits et ${PLANS.essential.maxActiveServices} prestations actifs`,
                      `${PLANS.essential.maxMonthlyBookings} demandes de rendez-vous / mois, équipe de ${PLANS.essential.maxTeamMembers}`,
                      'Finances : 12 mois d’historique, saisies illimitées',
                      'Builder complet et pages personnalisées',
                      'Images de catégories et promotions',
                      'Analytics standard et import CSV',
                    ].map((f, i) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm"><Check size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden /><span className={i === 0 ? 'font-semibold text-ink-900' : 'text-ink-700/80'}>{f}</span></li>
                    ))}
                  </ul>
                  <Link to="/admin/login" className="mt-8 block w-full rounded-[100px] bg-brand-600 py-3.5 text-center text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700">Choisir Essentiel</Link>
                </div>
              </Reveal>
              {/* Pro */}
              <Reveal delay={160}>
                <div className="relative rounded-[20px] border border-brand-600 bg-brand-600 p-8 text-white shadow-[0_0_60px_rgba(194,72,28,0.15)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_70px_rgba(194,72,28,0.25)]">
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-md bg-gold-400 px-2.5 py-1 text-xs font-semibold text-ink-900">
                    {promo?.plan === 'pro' ? <><Gift size={12} aria-hidden />{promo.days} jours offerts</> : 'Le plus populaire'}
                  </span>
                  <p className="text-sm font-bold text-white">Pro</p>
                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">10 000 F</span>
                    <span className="text-sm text-white/70">/mois</span>
                  </div>
                  {promo?.plan === 'pro' && (
                    <p className="mt-1 text-center text-xs font-medium text-gold-300">{promo.label}{promoDate ? ` — jusqu’au ${promoDate}` : ''}</p>
                  )}
                  <p className="mt-2 text-center text-sm text-white/70">Pour les activités qui tournent.</p>
                  <div className="my-6 h-px w-full bg-white/20" />
                  <ul className="space-y-3">
                    {[
                      'Tout le plan Essentiel, plus :',
                      'Produits, prestations, équipe et rendez-vous illimités',
                      'Finances : comparaison entre périodes, historique complet',
                      'Personnalisation illimitée et styles avancés',
                      'Bilan et vitrine sans logo Bitiko',
                      'Analytics avancées',
                      'Support prioritaire',
                    ].map((f, i) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check size={15} className={`mt-0.5 shrink-0 ${i === 0 ? 'text-gold-300' : 'text-gold-300'}`} aria-hidden />
                        <span className={i === 0 ? 'font-semibold text-white' : 'text-white/90'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/admin/login" className="mt-8 block w-full rounded-[100px] bg-white py-3.5 text-center text-sm font-medium text-brand-700 shadow-md transition-colors hover:bg-brand-50">
                    Choisir Pro
                  </Link>
                </div>
              </Reveal>
            </div>
            <p className="mt-8 text-center text-xs text-ink-700">Zéro commission sur tes ventes. Tu gardes 100% du prix de vente. Abonnement renouvelé à la main, sans prélèvement automatique.</p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="border-b border-sand-200 bg-white">
          <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>FAQ</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Questions fréquentes
              </h2>
            </Reveal>
            <Reveal delay={100} className="mx-auto mt-10 max-w-xl">
              {(() => {
                const [openIndex, setOpenIndex] = useState<number | null>(null)
                return (
                  <>
                    {faq.map((item, index) => (
                      <FaqItem
                        key={item.question}
                        {...item}
                        open={openIndex === index}
                        onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                      />
                    ))}
                  </>
                )
              })()}
            </Reveal>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="border-b border-sand-200 bg-gradient-to-br from-brand-100 to-sand-100">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-32">
            <Reveal>
              <h2 className="mx-auto max-w-[650px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Prêt à remplir ton carnet de commandes et ton agenda ?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-700/70">
                Lance ton activité gratuitement. Aucune carte bancaire. Aucune commission. Zéro engagement. Tu peux arrêter quand tu veux.
              </p>
              <Link to="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-4 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700">
                Créer mon espace gratuitement <ArrowRight size={16} aria-hidden />
              </Link>
              <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-700">
                {['0 F pour lancer', 'Zéro commission', 'Sans carte bancaire', 'Sans engagement'].map((t) => (
                  <span key={t} className="flex items-center gap-1"><Check size={11} aria-hidden />{t}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-sand-200 py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 text-sm min-[480px]:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="hidden lg:block">
            <Logo size={20} />
            <p className="mt-6 text-xs text-ink-700">&copy; {new Date().getFullYear()} Bitiko</p>
          </div>
          <div>
            <p className="mb-5 text-sm font-semibold text-ink-900">Solution</p>
            <ul className="flex flex-col gap-2.5">
              <li><a href="#fonctionnalites" className="text-ink-700 transition-colors hover:text-ink-900">Catalogue & services</a></li>
              <li><a href="#visite" className="text-ink-700 transition-colors hover:text-ink-900">Rendez-vous & réservations</a></li>
              <li><a href="#visite" className="text-ink-700 transition-colors hover:text-ink-900">Finances & bilan</a></li>
              <li><a href="#demo" className="text-ink-700 transition-colors hover:text-ink-900">Démo vidéo</a></li>
              <li><a href="#fonctionnalites" className="text-ink-700 transition-colors hover:text-ink-900">Livraison par secteurs</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-5 text-sm font-semibold text-ink-900">Bitiko</p>
            <ul className="flex flex-col gap-2.5">
              <li><Link to="/admin/login" className="text-ink-700 transition-colors hover:text-ink-900">Connexion</Link></li>
              <li><Link to="/admin/login" className="text-ink-700 transition-colors hover:text-ink-900">Créer mon espace</Link></li>
              <li><a href="#tarifs" className="text-ink-700 transition-colors hover:text-ink-900">Tarifs</a></li>
              <li><a href="#faq" className="text-ink-700 transition-colors hover:text-ink-900">FAQ</a></li>
              <li>
                <a
                  href="https://www.instagram.com/bitiko.shop/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-ink-700 transition-colors hover:text-ink-900"
                >
                  <SocialIcon platform="instagram" size={14} /> Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.tiktok.com/@bitiko.shop"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-ink-700 transition-colors hover:text-ink-900"
                >
                  <SocialIcon platform="tiktok" size={14} /> TikTok
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-5 text-sm font-semibold text-ink-900">Ressources</p>
            <ul className="flex flex-col gap-2.5">
              <li><a href="#solutions" className="text-ink-700 transition-colors hover:text-ink-900">Pour chaque activité</a></li>
              <li><a href="#marche" className="text-ink-700 transition-colors hover:text-ink-900">Comment ça marche</a></li>
              <li><a href="#fonctionnalites" className="text-ink-700 transition-colors hover:text-ink-900">Fonctionnalités</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center gap-1 text-center lg:hidden">
          <Logo size={18} />
          <p className="text-xs text-ink-700">&copy; {new Date().getFullYear()} Bitiko</p>
        </div>
      </footer>
    </div>
  )
}
