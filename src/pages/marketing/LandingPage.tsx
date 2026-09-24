import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  CreditCard,
  Gift,
  MapPinned,
  Menu,
  MessageCircle,
  MessageCircleMore,
  Minus,
  Package,
  Palette,
  Phone,
  Plus,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Wallet,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { formatPromoDate, useLandingPromo } from '@/features/billing/useLandingPromo'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useFaqStructuredData } from '@/hooks/useFaqStructuredData'

/** Consistent, premium icon treatment shared by every card grid on the page —
 * a soft gradient tile instead of a flat tint, so icons read as designed
 * artwork rather than default library glyphs dropped onto a colored square. */
function IconTile({
  icon: Icon,
  tone = 'brand',
  size = 'md',
  gradient,
}: {
  icon: typeof Store
  tone?: 'brand' | 'dark' | 'gold'
  size?: 'md' | 'lg'
  /** Escape hatch for a one-off gradient (e.g. a distinct color per card in a grid) instead of a shared tone. */
  gradient?: string
}) {
  const tones = {
    brand: 'from-brand-500 to-brand-700 text-white shadow-brand-900/15',
    dark: 'from-ink-800 to-ink-950 text-white shadow-ink-900/20',
    gold: 'from-gold-300 to-gold-500 text-ink-900 shadow-gold-900/10',
  }
  const sizes = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${sizes} ${gradient ?? tones[tone]}`}
    >
      <Icon size={size === 'lg' ? 24 : 19} strokeWidth={1.75} aria-hidden />
    </span>
  )
}

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

const features = [
  {
    icon: Store,
    title: 'Un vrai catalogue qui vend 24h/24',
    description:
      'Photos, prix, catégories, stock — tout est organisé, beau et accessible depuis n\'importe quel téléphone. Tes clients regardent, comparent et commandent la nuit.',
  },
  {
    icon: MessageCircleMore,
    title: 'Chaque commande arrive sur ton WhatsApp',
    description:
      'Pas besoin de downloader une appli. Le client commande en ligne, tu reçois un message formaté avec le nom, les produits, le total, la ville. Tu confirmes en 2 secondes.',
  },
  {
    icon: Package,
    title: 'Fini de vendre du stock épuisé',
    description:
      'La commande passe → le stock baisse automatiquement. Zéro risque de vendre deux fois le même article. Alerte quand le stock est bas.',
  },
  {
    icon: MapPinned,
    title: 'Livraison selon tes règles',
    description:
      'Crée tes secteurs (Dakar, Rufisque, Thiès…) avec tes tarifs. Le client choisit sa ville, le prix s\'applique. Livraison offerte au-dessus d\'un montant — c\'est toi qui décides.',
  },
  {
    icon: CreditCard,
    title: 'Espèces ou mobile money — le choix est au client',
    description:
      'Paiement à la livraison, Wave, Orange Money. Tu valides les détails directement sur WhatsApp, pas de plateforme de paiement compliquée à configurer.',
  },
  {
    icon: Wand2,
    title: 'Une boutique qui te ressemble',
    description:
      'Thème, bannière, mise en page — personnalise ta boutique en quelques clics avec l\'éditeur visuel. Aucune compétence technique requise.',
  },
]

const shopCategories = [
  'Mode & textiles',
  'Restauration & livraison',
  'Beauté & cosmétiques',
  'Artisanat & créations',
  'Électronique',
  'Épicerie',
  'Décoration',
  'Librairie & papeterie',
]

const solutions = [
  {
    icon: Shirt,
    gradient: 'from-rose-400 to-rose-600 shadow-rose-900/15',
    title: 'Mode & textiles',
    description:
      'Robes, pagnes, chaussures — chaque produit a ses photos, son prix, sa taille. Le client ne te pose plus 10 fois les mêmes questions sur WhatsApp.',
    products: 'Robes • Pagnes • Bijoux • Chaussures',
  },
  {
    icon: ChefHat,
    gradient: 'from-amber-400 to-orange-600 shadow-orange-900/15',
    title: 'Restauration & livraison',
    description:
      'Le client choisit son quartier, sa ville, valide son menu. Tu reçois la commande formatée, tu prépares, tu livres. Simple.',
    products: 'Plats • Boissons • Menus • Packages',
  },
  {
    icon: Sparkles,
    gradient: 'from-fuchsia-400 to-purple-600 shadow-purple-900/15',
    title: 'Beauté & cosmétiques',
    description:
      'Tes produits se vendent la nuit — toi tu dors. Le matin, tu lis tes commandes et tu organises les livraisons. Stock toujours à jour.',
    products: 'Crèmes • Maquillage • Soin • Parfums',
  },
  {
    icon: Palette,
    gradient: 'from-teal-400 to-emerald-600 shadow-emerald-900/15',
    title: 'Artisanat & créations',
    description:
      'Chaque pièce est unique. Bitiko lui donne une vitrine à la hauteur — photos HD, description, stock. Paiement à la livraison pour les pièces de confiance.',
    products: 'Sculptures • Tissages • Poterie • Bijoux artisanaux',
  },
]

const testimonials = [
  {
    quote: 'Je ne note plus rien sur un carnet. La commande arrive sur mon WhatsApp avec tout — nom, produits, total, quartier. Je n\'ai plus qu\'à confirmer.',
    name: 'Fatou Diop',
    role: 'Boutique de vêtements, Dakar',
    plan: 'Pro',
  },
  {
    quote: 'J\'avais peur que ce soit compliqué. En 20 minutes ma boutique était en ligne avec mes 8 produits. Le lendemain, j\'avais déjà ma première commande.',
    name: 'Aïssatou Ndiaye',
    role: 'Cosmétiques, Thiès',
    plan: 'Découverte',
  },
  {
    quote: 'Mes clients me trouvent en ligne, commandent la nuit, et je reçois tout le matin. Ma sœur s\'occupe de la livraison, moi du stock.',
    name: 'Modou Fall',
    role: 'Boutique de quartier, Rufisque',
    plan: 'Pro',
  },
]

const comparisonRows = [
  { before: 'Envoyer des photos une par une sur WhatsApp', after: 'Catalogue en ligne avec photos HD, prix et stock' },
  { before: 'Tenir un carnet de commandes à la main', after: 'Chaque commande est enregistrée et numérotée automatiquement' },
  { before: 'Vendre du stock épuisé sans le savoir', after: 'Stock synchronisé en temps réel + alertes' },
  { before: 'Calculer les totaux et frais de livraison à la main', after: 'Total recalculé automatiquement — zéro erreur' },
  { before: 'Perdre des commandes dans les DMs WhatsApp', after: 'Toutes les commandes triées par statut, claires et archivées' },
  { before: 'Demander « t\'es dans quel quartier ? » à chaque client', after: 'Le client choisit sa ville, le tarif s\'applique' },
]

const faq = [
  {
    question: 'Est-ce que Bitiko est vraiment gratuit ?',
    answer:
      'Oui. Le plan Découverte est 100% gratuit, sans engagement et sans carte bancaire. Tu peux avoir une boutique en ligne fonctionnelle avec 15 produits, commandes sur WhatsApp et livraison. Essentiel à 3 000 F ajoute le builder complet et 50 produits ; Pro à 10 000 F débloque les outils avancés et les produits illimités.',
  },
  {
    question: 'Comment les clients paient-ils ?',
    answer:
      'Les deux options principales : espèces à la livraison (le plus courant en Afrique de l\'Ouest) ou mobile money — Wave, Orange Money. Le client paie selon ce que tu actives. Tu confirmes le paiement avec lui sur WhatsApp, pas besoin de passer par un prestataire tiers.',
  },
  {
    question: 'Est-ce que je dois être développeur ?',
    answer:
      'Non. Crée ton compte, choisis un nom, ajoute tes produits avec leurs photos — c\'est tout. Pas de ligne de code. Si tu sais envoyer une photo sur WhatsApp, tu sais utiliser Bitiko.',
  },
  {
    question: 'Comment ça marche pour la livraison ?',
    answer:
      'Tu définis tes secteurs (par exemple Dakar, Rufisque, Thiès) et le tarif par secteur. À l\'intérieur de chaque secteur, tu listes les villes. Au checkout, le client choisit sa ville et le tarif s\'applique automatiquement. Tu peux aussi activer la livraison gratuite au-delà d\'un certain montant.',
  },
  {
    question: 'Qui peut voir ma boutique ?',
    answer:
      'Avec tous les plans, ta boutique est publique sur son sous-domaine bitiko.shop. La personnalisation de base est disponible gratuitement ; les images de catégories sont disponibles avec Essentiel et Pro, et la marque Bitiko se retire avec Pro.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer:
      'Chaque boutique est complètement isolée. Toi seul(e) peux voir tes produits, tes commandes et tes paramètres. Personne d\'autre — ni les autres vendeurs de Bitiko, ni nous. Nous n\'avons accès à aucune de tes données.',
  },
  {
    question: 'Est-ce que je paye une commission sur mes ventes ?',
    answer:
      'Non. Zéro commission. Quoi que tu vendes, tu gardes 100% du prix. Le plan gratuit est vraiment gratuit, puis Essentiel coûte 3 000 F/mois et Pro 10 000 F/mois — rien de plus sur tes revenus.',
  },
]

/* ─────────────────────── Components ────────────────────────── */

/** Fades + slides an element up once it scrolls into view — applied across
 * every section so the page feels alive while scrolling, not just on load. */
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="group border-b border-ink-900/10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
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

function SectionEyebrow({ children, light }: { children: string; light?: boolean }) {
  return (
    <p className={`mb-4 text-center font-mono text-sm font-semibold uppercase tracking-[0.2em] ${light ? 'text-gold-400' : 'text-brand-600'}`}>
      {children}
    </p>
  )
}

const produitLinks = [
  { label: 'Boutique en ligne', href: '#fonctionnalites', description: 'Catalogue, panier, checkout' },
  { label: 'Commandes WhatsApp', href: '#fonctionnalites', description: 'Chaque vente arrive sur ton WhatsApp' },
  { label: 'Zones de livraison', href: '#fonctionnalites', description: 'Secteurs, villes, tarifs automatiques' },
  { label: 'Tableau de bord', href: '#fonctionnalites', description: 'Suivi des ventes et du stock' },
]

/* ─────────────────────── Nav ─────────────────────────────── */

function Nav() {
  const [produitOpen, setProduitOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const produitRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (produitRef.current && !produitRef.current.contains(e.target as Node)) setProduitOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
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
            <div className="relative" ref={produitRef} onMouseEnter={() => setProduitOpen(true)} onMouseLeave={() => setProduitOpen(false)}>
              <button type="button" onClick={() => setProduitOpen((v) => !v)} aria-expanded={produitOpen} className="flex items-center gap-1 transition-opacity hover:opacity-70">
                Produit
                <ChevronDown size={14} className={`transition-transform ${produitOpen ? 'rotate-180' : ''}`} />
              </button>
              {produitOpen && (
                <div className="absolute left-0 top-full z-30 mt-3 w-72 rounded-2xl border border-sand-200 bg-white p-2 shadow-xl">
                  {produitLinks.map(({ label, href, description }) => (
                    <a key={label} href={href} onClick={() => setProduitOpen(false)} className="block rounded-xl px-3 py-2.5 hover:bg-sand-50">
                      <span className="block text-sm font-medium text-ink-900">{label}</span>
                      <span className="block text-xs text-ink-700/60">{description}</span>
                    </a>
                  ))}
                </div>
              )}
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
            Créer ma boutique <ArrowRight size={15} aria-hidden />
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
            <Link to="/admin/login" onClick={() => setMobileOpen(false)} className="rounded-full bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-md">Créer ma boutique</Link>
          </div>
        </div>
      )}
    </header>
  )
}

/* ─────────────────── Phone Mockup ──────────────────────────── */

function PhoneMockup() {
  return (
    <div className="mx-auto mt-12 w-[260px] sm:w-[300px] lg:mt-0 lg:w-[320px]">
      <div className="relative animate-float overflow-hidden rounded-[2rem] border-[3px] border-ink-800 bg-white shadow-2xl shadow-brand-900/10">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-ink-800 px-5 pb-2 pt-3 text-[10px] font-medium text-white">
          <span>9:41</span>
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-white/60" />
            <span className="h-2 w-2 rounded-full bg-white/60" />
          </div>
        </div>
        {/* Shop header */}
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-[11px] font-bold text-brand-700">B</div>
            <div>
              <p className="text-xs font-bold text-ink-900">Boutique Chez Fatou</p>
              <p className="text-[10px] text-ink-700/50">fatou.bitiko.shop</p>
            </div>
          </div>
        </div>
        {/* Products */}
        <div className="grid grid-cols-2 gap-2 p-3">
          {[
            { name: 'Robe wax', price: '12 500 F', color: 'bg-brand-100' },
            { name: 'Pagne bazin', price: '8 000 F', color: 'bg-ink-100' },
            { name: 'Sandales', price: '5 500 F', color: 'bg-gold-300' },
            { name: 'Sac à main', price: '7 000 F', color: 'bg-sand-200' },
          ].map((p) => (
            <div key={p.name} className="overflow-hidden rounded-xl border border-gray-100">
              <div className={`flex h-20 items-center justify-center ${p.color}`}>
                <ShoppingCart size={16} className="text-ink-800/30" />
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[10px] font-semibold text-ink-900">{p.name}</p>
                <p className="text-[10px] font-bold text-brand-600">{p.price}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Cart bar */}
        <div className="mx-3 mb-3 flex items-center justify-between rounded-xl bg-brand-600 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white">
            <ShoppingBag size={12} /> Panier
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">2 items</span>
        </div>
      </div>
      {/* WhatsApp bubble floating — independent drift timing so it doesn't move in lockstep with the phone. */}
      <div className="absolute right-2 top-[55%] z-10 w-[190px] rotate-2 animate-float-slow rounded-2xl border border-emerald-100 bg-emerald-50 p-2.5 shadow-lg [animation-delay:-3s] sm:right-[-20px] lg:right-[-30px]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white">
            <MessageCircle size={8} />
          </span>
          <span className="text-[8px] font-bold text-emerald-800">WhatsApp</span>
        </div>
        <p className="text-[8px] leading-tight text-emerald-900/80">
          🛒 <strong>2× Robe wax — 25 000 F</strong><br />
          📍 Parcelles Assainies<br />
          ✅ Commande reçue — confirme ton paiement Wave
        </p>
      </div>
    </div>
  )
}

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
    title: 'Bitiko — Crée ta boutique en ligne, vends sur WhatsApp',
    description:
      "Bitiko te donne une vraie boutique en ligne — catalogue, panier, commandes — et relaie tes ventes directement sur WhatsApp. Fait pour l'Afrique, gratuit pour commencer.",
  })
  useFaqStructuredData(faq)
  const promo = useLandingPromo()
  const promoDate = formatPromoDate(promo?.expires_at ?? null)

  return (
    <div className="flex min-h-screen flex-col bg-sand-50 font-sans text-ink-800">
      {promo && (
        <div className="bg-brand-600 px-4 py-2 text-center text-xs text-white sm:text-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Gift size={15} className="shrink-0" aria-hidden />
              <strong className="font-semibold">{promo.label}</strong>
            </span>
            <span className="text-white/90">
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
      )}
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
              Pour les commerçants d'Afrique de l'Ouest
              <ArrowRight size={12} className="text-ink-700/50" aria-hidden />
            </a>
            <h1 className="mx-auto max-w-[600px] animate-fade-up font-heading text-[28px] font-semibold leading-[1.1] tracking-tight text-ink-900 [animation-delay:100ms] sm:text-4xl lg:mx-0 lg:max-w-none lg:text-5xl xl:text-[3.4rem]">
              Ton commerce mérite mieux qu'un{' '}
              <span className="relative inline-block whitespace-nowrap">
                fil WhatsApp
                <SquiggleUnderline />
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-[540px] animate-fade-up text-[15px] leading-relaxed text-[#605958] [animation-delay:200ms] sm:text-base lg:mx-0">
              Bitiko transforme ton téléphone en vraie boutique en ligne : catalogue, panier, et chaque commande qui atterrit directement sur ton WhatsApp. Aucun code, aucune carte bancaire, aucune commission — juste plus de ventes.
            </p>
            <div className="mb-8 mt-8 flex animate-fade-up flex-col items-center gap-3 [animation-delay:300ms] sm:flex-row lg:justify-start">
              <Link to="/admin/login" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-4 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700 sm:w-auto">
                Créer ma boutique gratuitement
                <ArrowRight size={16} aria-hidden />
              </Link>
              <a href="#marche" className="inline-flex w-full items-center justify-center rounded-full border border-sand-300 bg-white px-6 py-4 text-sm font-medium text-ink-900 transition-colors hover:bg-sand-100 sm:w-auto">
                Comment ça marche
              </a>
            </div>
            <div className="flex animate-fade-up flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-700/60 [animation-delay:400ms] lg:justify-start">
              {['0 F pour lancer', 'Zéro commission', '15 produits offerts', 'Sans carte bancaire'].map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <Check size={12} className="text-brand-500" aria-hidden /> {t}
                </span>
              ))}
            </div>
          </div>
          <div className="animate-fade-up [animation-delay:250ms]">
            <PhoneMockup />
          </div>
        </section>

        {/* ── CATEGORY MARQUEE ── */}
        <section className="overflow-hidden border-b border-sand-200 bg-white py-6" aria-label="Secteurs d'activité couverts par Bitiko">
          <div className="flex w-max animate-marquee gap-3 [animation-play-state:running] hover:[animation-play-state:paused]">
            {shopCategories.map((category) => (
              <span
                key={category}
                className="shrink-0 whitespace-nowrap rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm font-medium text-ink-700/60 transition-colors duration-300 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                {category}
              </span>
            ))}
            <div className="contents" aria-hidden="true">
              {shopCategories.map((category) => (
                <span
                  key={`duplicate-${category}`}
                  className="shrink-0 whitespace-nowrap rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm font-medium text-ink-700/60"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <section className="border-y border-sand-200 bg-white">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:py-10">
            {[
              { icon: Clock, target: 2, suffix: ' min', label: 'Mise en ligne' },
              { icon: ShoppingCart, target: 3, suffix: ' clics', label: 'Pour commander' },
              { icon: Wallet, target: 0, suffix: ' F', label: 'Pour commencer' },
              { icon: Smartphone, target: 24, suffix: 'h/24', label: 'Votre boutique vend' },
            ].map(({ icon: Icon, target, suffix, label }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <IconTile icon={Icon} tone="gold" />
                <p className="mt-3 font-heading text-xl font-bold text-ink-900">
                  <CountUpValue target={target} suffix={suffix} />
                </p>
                <p className="text-xs text-ink-700/60">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROBLEM ── */}
        <section className="border-b border-sand-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Le problème</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Pendant que tu gères tes commandes à la main, tes clients sont en ligne.
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/60">
                Chaque matin tu reçois des dizaines de messages. Tu dois tout noter, calculer les totaux, garder en mémoire qui a payé. Il y a mieux.
              </p>
            </Reveal>
            <div className="grid gap-8 lg:grid-cols-2">
              <Reveal className="rounded-2xl border border-red-200 bg-red-50/40 p-7">
                <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-widest text-red-500">Vendre sans Bitiko</p>
                <ul className="space-y-3.5">
                  {[
                    'Envoyer des photos un par un sur WhatsApp — le client perd patience',
                    'Noter les commandes sur un carnet — des erreurs, des oublis',
                    'Calculer les totaux à la main — tu te trompes, le client se plaint',
                    'Vendre un article que tu n\'as plus en stock',
                    'Perdre des commandes dans la masse de messages',
                    'Demander « tu es dans quel quartier ? » à chaque client',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm font-medium text-ink-700/80">
                      <X size={15} className="mt-0.5 shrink-0 text-red-500" aria-hidden /> {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={120} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-7">
                <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-widest text-emerald-600">Vendre avec Bitiko</p>
                <ul className="space-y-3.5">
                  {[
                    'Un vrai catalogue en ligne — ton client voit, compare, commande à 23h',
                    'La commande arrive sur ton WhatsApp formatée : nom, produits, total',
                    'Stock mis à jour automatiquement — plus de vente d\'articles épuisés',
                    'Secteurs et villes avec tarifs — le client choisit, le prix s\'applique',
                    'Dashboard des ventes — tu vois tout sans ouvrir un carnet',
                    'Lien à partager sur WhatsApp, Facebook, Instagram — la boutique vit 24h/24',
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
        <section id="fonctionnalites" className="border-b border-sand-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Fonctionnalités</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Tout ce qu'il faut pour vendre en ligne.
                <span className="block mt-1 text-brand-600">Rien de plus.</span>
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/60">
                Chaque fonctionnalité existe parce qu'un commerçant en avait besoin. Pas de superflu, pas de compliqué.
              </p>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="group h-full rounded-2xl border border-sand-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                    <IconTile icon={Icon} />
                    <h3 className="mt-5 font-heading text-sm font-semibold text-ink-900">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-700/70">{description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHATSAPP FLOW SHOWPIECE ── */}
        <section className="border-b border-sand-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Commande sur WhatsApp</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Le client commande en ligne. Tu reçois tout sur WhatsApp.
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/60">
                Zéro appli à télécharger, zéro dashboard à apprendre. Si tu sais lire un message WhatsApp, tu sais gérer tes commandes Bitiko.
              </p>
            </Reveal>
            <div className="grid gap-8 sm:grid-cols-3 sm:items-start">
              {[
                { step: '1', title: 'Le client choisit ses produits', desc: 'Il parcourt ton catalogue, ajoute au panier, choisit sa ville et son mode de paiement.' },
                { step: '2', title: 'La commande est enregistrée', desc: 'Stock décrémenté, frais de livraison calculés, total validé — tout se passe côté serveur en 1 seconde.' },
                { step: '3', title: 'Tu reçois le message', desc: 'Un message formaté sur WhatsApp avec le nom, les produits, le total, la ville. Tu confirmes en répondant "OK".' },
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
                <span className="text-xs font-bold text-white">Nouvelle commande — Boutique Chez Fatou</span>
              </div>
              <div className="p-4">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-xs leading-relaxed text-ink-900">
                    🛒 <strong>Nouvelle commande #0017</strong><br />
                    👤 Awa Mbaye — 77 123 45 67<br />
                    📍 Parcelles Assainies, Dakar<br />
                    ━━━━━━━━━━━━━━<br />
                    2× Robe wax dentelle — 25 000 F<br />
                    1× Sandales cuir — 5 500 F<br />
                    ━━━━━━━━━━━━━━<br />
                    📦 Livraison (Rufisque) — 2 000 F<br />
                    💰 <strong>Total — 32 500 F</strong><br />
                    💳 Paiement — Espèces à la livraison
                  </p>
                </div>
                <p className="mt-2 text-[10px] text-emerald-700/60">Message reçu par le commerçant sur WhatsApp</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── SOLUTIONS / PERSONAS ── */}
        <section id="solutions" className="border-b border-sand-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Une boutique pour chaque commerce</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Bitiko s'adapte à ton activité, pas l'inverse.
            </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/60">
                Que tu vendes des vêtements, des plats, des cosmétiques ou de l'artisanat — la structure est la même, le résultat aussi.
              </p>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2">
              {solutions.map(({ icon: Icon, gradient, title, description, products }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="group h-full rounded-2xl border border-sand-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                    <IconTile icon={Icon} gradient={gradient} size="lg" />
                    <h3 className="mt-4 font-heading text-base font-semibold text-ink-900">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-700/70">{description}</p>
                    <p className="mt-3 text-xs font-medium text-brand-600">{products}</p>
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

        {/* ── TESTIMONIALS ── */}
        <section className="border-b border-sand-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Ce qu'ils en disent</SectionEyebrow>
              <h2 className="mx-auto mb-14 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Des commerçants qui ont fait le switch.
              </h2>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-3">
              {testimonials.map(({ quote, name, role, plan }, i) => (
                <Reveal key={name} delay={i * 100}>
                  <div className="h-full rounded-2xl border border-sand-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                    <div className="flex gap-1 text-gold-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-700/80">"{quote}"</p>
                    <div className="mt-5 border-t border-sand-100 pt-4">
                      <p className="text-sm font-semibold text-ink-900">{name}</p>
                      <p className="text-xs text-ink-700/50">{role}</p>
                      <span className="mt-2 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700">Plan {plan}</span>
                    </div>
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
                De l'inscription à la première commande, en 3 étapes.
              </h2>
            </Reveal>
            <div className="grid gap-10 sm:grid-cols-3">
              {[
                { n: '1', title: 'Crée ta boutique', desc: 'Choisis un nom, un sous-domaine, un numéro WhatsApp. 2 minutes.' },
                { n: '2', title: 'Ajoute tes produits', desc: 'Photos, prix, stock. En 30 secondes par produit.' },
                { n: '3', title: 'Partage ton lien', desc: 'WhatsApp, Facebook, Instagram, bouche-à-oreille. Ta boutique vend 24h/24.' },
              ].map(({ n, title, desc }, i) => (
                <Reveal key={n} delay={i * 120} className="relative text-center">
                  {i < 2 && <span className="absolute left-[calc(50%+2rem)] top-6 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-gold-400/40 to-gold-400/10 sm:block" />}
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-gold-400 to-gold-300 text-lg font-bold text-ink-900 shadow-lg">{n}</div>
                  <h3 className="mt-5 font-heading text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm text-ink-100/70">{desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="tarifs" className="border-b border-sand-200">
          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Tarifs</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Investis dans ton commerce.
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/60">
                Zéro commission. Zéro frais cachés. Tu gardes 100% de tes revenus.
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
                  <p className="mt-2 text-center text-sm text-ink-700/60">Pour démarrer et tester.</p>
                  <div className="my-6 h-px w-full bg-sand-100" />
                  <ul className="space-y-3">
                    {[
                      'Boutique en ligne complète',
                      'Commandes sur WhatsApp',
                      'Jusqu\'à 15 produits actifs',
                      'Livraison par secteurs & villes',
                      'Espace client mobile-first',
                      '1 utilisateur',
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                        <span className="text-ink-700/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/admin/login" className="mt-8 block w-full rounded-[100px] border border-brand-600 py-3.5 text-center text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50">
                    Créer ma boutique
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
                  <div className="mt-3 flex items-baseline justify-center gap-1"><span className="text-4xl font-bold text-ink-900">3 000 F</span><span className="text-sm text-ink-700/60">/mois</span></div>
                  {promo?.plan === 'essential' && (
                    <p className="mt-1 text-center text-xs font-medium text-brand-700">{promo.label}{promoDate ? ` — jusqu’au ${promoDate}` : ''}</p>
                  )}
                  <p className="mt-2 text-center text-sm text-ink-700/60">Pour structurer sa boutique.</p>
                  <div className="my-6 h-px w-full bg-brand-100" />
                  <ul className="space-y-3">
                    {['Tout le plan Découverte, plus :', 'Jusqu’à 50 produits actifs', 'Builder complet et pages personnalisées', 'Images de catégories et promotions', 'Analytics standard et import CSV'].map((f, i) => (
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
                  <p className="mt-2 text-center text-sm text-white/70">Pour les boutiques qui tournent.</p>
                  <div className="my-6 h-px w-full bg-white/20" />
                  <ul className="space-y-3">
                    {[
                      'Tout le plan Essentiel, plus :',
                      'Produits illimités',
                      'Store builder — personnalise ta page',
                      'Supprime le logo Bitiko',
                      '5 utilisateurs',
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
            <p className="mt-8 text-center text-xs text-ink-700/50">Zéro commission sur tes ventes. Tu gardes 100% du prix de vente.</p>
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
              {faq.map((item) => <FaqItem key={item.question} {...item} />)}
            </Reveal>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="border-b border-sand-200 bg-gradient-to-br from-brand-100 to-sand-100">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-32">
            <Reveal>
              <h2 className="mx-auto max-w-[650px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Prêt à vendre en ligne ?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-700/70">
                Crée ta boutique gratuitement. Aucune carte bancaire. Aucune commission. Zéro engagement. Tu peux arrêter quand tu veux.
              </p>
              <Link to="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-4 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700">
                Créer ma boutique gratuitement <ArrowRight size={16} aria-hidden />
              </Link>
              <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-700/50">
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
            <p className="mt-6 text-xs text-ink-700/40">&copy; {new Date().getFullYear()} Bitiko</p>
          </div>
          <div>
            <p className="mb-5 text-sm font-semibold text-ink-900">Solution</p>
            <ul className="flex flex-col gap-2.5">
              <li><a href="#fonctionnalites" className="text-ink-700/50 transition-colors hover:text-ink-900">Catalogue & produits</a></li>
              <li><a href="#fonctionnalites" className="text-ink-700/50 transition-colors hover:text-ink-900">Commandes WhatsApp</a></li>
              <li><a href="#fonctionnalites" className="text-ink-700/50 transition-colors hover:text-ink-900">Livraison par secteurs</a></li>
              <li><a href="#fonctionnalites" className="text-ink-700/50 transition-colors hover:text-ink-900">Dashboard de vente</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-5 text-sm font-semibold text-ink-900">Bitiko</p>
            <ul className="flex flex-col gap-2.5">
              <li><Link to="/admin/login" className="text-ink-700/50 transition-colors hover:text-ink-900">Connexion</Link></li>
              <li><Link to="/admin/login" className="text-ink-700/50 transition-colors hover:text-ink-900">Créer une boutique</Link></li>
              <li><a href="#tarifs" className="text-ink-700/50 transition-colors hover:text-ink-900">Tarifs</a></li>
              <li><a href="#faq" className="text-ink-700/50 transition-colors hover:text-ink-900">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-5 text-sm font-semibold text-ink-900">Ressources</p>
            <ul className="flex flex-col gap-2.5">
              <li><a href="#solutions" className="text-ink-700/50 transition-colors hover:text-ink-900">Pour chaque commerce</a></li>
              <li><a href="#marche" className="text-ink-700/50 transition-colors hover:text-ink-900">Comment ça marche</a></li>
              <li><a href="#fonctionnalites" className="text-ink-700/50 transition-colors hover:text-ink-900">Fonctionnalités</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center gap-1 text-center lg:hidden">
          <Logo size={18} />
          <p className="text-xs text-ink-700/40">&copy; {new Date().getFullYear()} Bitiko</p>
        </div>
      </footer>
    </div>
  )
}
