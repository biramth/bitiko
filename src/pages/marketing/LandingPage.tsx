import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Clock, Download, Gift, Minus, Percent, Phone, Play, Plus, RefreshCcw, ShieldCheck, ShoppingCart, Smartphone, X, Zap } from 'lucide-react'
import { PLANS } from '@/config/plans'
import { IconTile } from '@/components/ui/IconTile'
import { formatPromoDate, useLandingPromo } from '@/features/billing/useLandingPromo'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useFaqStructuredData } from '@/hooks/useFaqStructuredData'
import { useSoftwareStructuredData } from '@/hooks/useSoftwareStructuredData'
import { Audiences, DemoVideo, FeatureGroups, HeroShots, Tour } from './landing/Sections'
import { realLife, shopCategories, solutions } from './landing/content'
import { faq } from './landing/faq'
import { Reveal, SectionEyebrow } from './landing/ui'
import { SiteFooter, SiteNav } from './landing/Chrome'
import { SkipLink } from '@/components/ui/SkipLink'

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
  { before: 'Envoyer les photos une par une sur WhatsApp, répéter les prix', after: 'Un catalogue en ligne avec photos, prix et stock, sur un seul lien' },
  { before: 'Se mettre d\'accord sur une heure en dix messages, oublier un rendez-vous', after: 'Le client réserve un créneau libre, tu confirmes d\'un clic' },
  { before: 'Perdre des commandes dans la masse des conversations', after: 'Chaque commande et réservation est enregistrée, numérotée et suivie' },
  { before: 'Vendre un article épuisé, doubler un rendez-vous sans le savoir', after: 'Stock et planning synchronisés en temps réel, avec alertes' },
  { before: 'Calculer les totaux à la main et se tromper', after: 'Total, livraison et paiement calculés automatiquement' },
  { before: 'Faire ses comptes sur un cahier en fin de mois', after: 'Recettes comptées toutes seules, bilan en PDF ou Excel' },
]

const commitments = [
  { icon: Percent, title: 'Zéro commission, pour toujours', text: 'Tu gardes 100 % de tes ventes, quel que soit ton plan.' },
  { icon: RefreshCcw, title: 'Sans engagement ni prélèvement', text: 'L\'abonnement se renouvelle à la main. Sans paiement, tu repasses au gratuit sans rien perdre.' },
  { icon: Download, title: 'Tes données t\'appartiennent', text: 'Commandes et finances exportables en Excel à tout moment.' },
  { icon: ShieldCheck, title: 'Ton activité bien gardée', text: 'Espace isolé, accès de l\'équipe par rôle, chaque intervention du support tracée.' },
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

function FaqList() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
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
    title: 'Boutique en ligne et prise de rendez-vous gratuites | Bitiko',
    description:
      'Crée ta boutique en ligne et ta prise de rendez-vous en 2 minutes. Commandes et réservations sur WhatsApp, stock et finances suivis. Gratuit, sans commission.',
    image: 'https://bitiko.shop/og/home.jpg',
    canonicalUrl: 'https://bitiko.shop/',
  })
  useFaqStructuredData(faq)
  useSoftwareStructuredData()
  const { promo, isLoading: promoLoading } = useLandingPromo()
  const promoDate = formatPromoDate(promo?.expires_at ?? null)

  return (
    <div className="flex min-h-screen flex-col bg-sand-50 font-sans text-ink-800">
      <SkipLink />
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
      <SiteNav />

      <main id="contenu" tabIndex={-1} className="relative mx-auto w-full focus:outline-none">
        {/* ── HERO ── */}
        <section className="relative mx-auto max-w-6xl overflow-hidden px-4 pb-10 pt-12 sm:overflow-visible sm:px-6 lg:flex lg:items-center lg:gap-12 lg:pt-20">
          <HeroBackdrop />
          <div className="flex-1 text-center lg:text-left">
            <a
              href="#solutions"
              className="mx-auto mb-6 hidden w-fit animate-fade-up items-center gap-1.5 rounded-3xl border border-sand-200 py-1.5 pl-2.5 pr-3 text-xs font-medium text-ink-700 shadow-[inset_0_-2px_0_#E7E0D4] transition-colors hover:bg-sand-100 lg:inline-flex"
            >
              <Zap size={13} className="text-brand-500" aria-hidden />
              Boutique, rendez-vous et finances, réunis
              <ArrowRight size={12} className="text-ink-700" aria-hidden />
            </a>
            <h1 className="mx-auto max-w-[620px] animate-fade-up font-heading text-[28px] font-semibold leading-[1.1] tracking-tight text-ink-900 [animation-delay:100ms] sm:text-4xl lg:mx-0 lg:max-w-none lg:text-5xl xl:text-[3.3rem]">
              Mets ton activité en ligne.{' '}
              <span className="relative inline-block whitespace-normal sm:whitespace-nowrap">
                Tes clients font le reste
                <SquiggleUnderline />
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-[540px] animate-fade-up text-[15px] leading-relaxed text-[#605958] [animation-delay:200ms] sm:text-base lg:mx-0">
              Boutique, prise de rendez-vous, réservation de tables et finances sur un seul lien à partager sur WhatsApp, Instagram ou TikTok. Chaque commande et chaque réservation t’arrive sur WhatsApp. Sans code, sans commission.
            </p>
            <div className="mb-8 mt-8 flex animate-fade-up flex-col items-center gap-3 [animation-delay:300ms] sm:flex-row lg:justify-start">
              <Link to="/admin/login" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-4 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700 sm:w-auto">
                Créer mon espace gratuit
                <ArrowRight size={16} aria-hidden />
              </Link>
              <a href="#demo" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-sand-300 bg-white px-6 py-4 text-sm font-medium text-ink-900 transition-colors hover:bg-sand-100 sm:w-auto">
                <Play size={15} className="text-brand-600" aria-hidden />
                Voir la démo
              </a>
            </div>
            <div className="flex animate-fade-up flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-700/75 [animation-delay:400ms] lg:justify-start">
              {['Gratuit pour démarrer', '0 % de commission', 'En ligne en 2 minutes', 'Sans carte bancaire'].map((t) => (
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
              { icon: Clock, target: 2, suffix: ' min', label: 'Pour être en ligne' },
              { icon: Percent, target: 0, suffix: ' %', label: 'De commission sur tes ventes' },
              { icon: ShoppingCart, target: 3, suffix: ' clics', label: 'Pour qu’un client commande' },
              { icon: Smartphone, target: 24, suffix: 'h/24', label: 'Ta boutique reste ouverte' },
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
                Tes clients sont déjà en ligne. Ton organisation, pas encore : chaque commande, chaque rendez-vous, chaque compte passe par ta mémoire. Bitiko remet tout au même endroit.
              </p>
            </Reveal>
            <Reveal delay={150} className="mx-auto max-w-4xl overflow-x-auto rounded-2xl border border-sand-200">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[1fr_1px_1fr] border-b border-sand-200 bg-ink-800 text-xs font-semibold uppercase tracking-wider text-white">
                  <div className="px-3 py-3 sm:px-5">Sans Bitiko</div>
                  <div className="bg-ink-700" />
                  <div className="px-3 py-3 sm:px-5">Avec Bitiko</div>
                </div>
                {comparisonRows.map(({ before, after }, i) => (
                  <div
                    key={before}
                    className={`grid grid-cols-[1fr_1px_1fr] transition-colors duration-200 hover:bg-emerald-50/30 ${i < comparisonRows.length - 1 ? 'border-b border-sand-100' : ''}`}
                  >
                    <div className="flex items-start gap-2.5 px-3 py-3.5 sm:px-5">
                      <X size={14} className="mt-0.5 shrink-0 text-red-400" aria-hidden />
                      <span className="text-xs text-ink-700/70 sm:text-sm">{before}</span>
                    </div>
                    <div className="bg-sand-200" />
                    <div className="flex items-start gap-2.5 px-3 py-3.5 sm:px-5">
                      <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                      <span className="text-xs font-medium text-ink-900 sm:text-sm">{after}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
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
                Zéro appli à télécharger. Commandes, demandes de rendez-vous et de table arrivent sur ton WhatsApp, et dans ton agenda.
              </p>
            </Reveal>
            <div className="grid gap-8 sm:grid-cols-3 sm:items-start">
              {[
                { step: '1', title: 'Le client choisit', desc: 'Il parcourt ton catalogue, ajoute au panier ou réserve un créneau, choisit sa ville et son mode de paiement.' },
                { step: '2', title: 'L\'opération est enregistrée', desc: 'Stock décrémenté ou créneau réservé, frais calculés, total validé — tout côté serveur en 1 seconde.' },
                { step: '3', title: 'Tu es prévenu', desc: 'Un message WhatsApp formaté (nom, détails, créneau ou total) et la demande dans ton agenda, à confirmer d\'un clic.' },
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
                    👤 Awa Mbaye<br />
                    📍 8 rue des Palmiers — Centre-ville<br />
                    ━━━━━━━━━━━━━━<br />
                    2× Robe wax Aminata — 50 000 F<br />
                    Livraison — 1 500 F<br />
                    ━━━━━━━━━━━━━━<br />
                    💰 <strong>Total — 51 500 F</strong><br />
                    💳 Paiement — Mobile money
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
              {solutions.map(({ icon: Icon, tint, title, description, tags, slug }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="group h-full rounded-2xl border border-sand-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                    <IconTile icon={Icon} tint={tint} size="lg" />
                    <h3 className="mt-4 font-heading text-base font-semibold text-ink-900">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-700/70">{description}</p>
                    <p className="mt-3 text-xs font-medium text-brand-600">{tags}</p>
                    <Link to={`/solutions/${slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
                      Découvrir la solution <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── PENSÉ POUR LA VRAIE VIE ── */}
        <section className="border-b border-sand-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
            <Reveal className="text-center">
              <SectionEyebrow>Pensé pour la vraie vie</SectionEyebrow>
              <h2 className="mx-auto mb-3 max-w-[700px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Fait pour la façon dont tu travailles vraiment.
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-ink-700/75">
                Pas besoin de changer tes habitudes : Bitiko s’installe autour de ton téléphone, de WhatsApp et de ta façon d’encaisser.
              </p>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {realLife.map(({ icon: Icon, title, description }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-sand-200 bg-sand-50 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
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
                { n: '1', title: 'Décris ton activité', desc: 'Le nom, ton métier, ton WhatsApp. Bitiko prépare une vitrine adaptée, déjà remplie de textes à ton image.' },
                { n: '2', title: 'Ajoute ton offre', desc: 'Produits, prestations, tarifs, horaires. Une minute par produit, ou tout ton catalogue d’un coup en CSV.' },
                { n: '3', title: 'Partage ton lien', desc: 'Bio Instagram, statut WhatsApp, TikTok, carte de visite. Tes clients commandent et réservent seuls.' },
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
                Commence gratuitement, sans limite de durée. Passe à un plan payant seulement quand ton activité grandit. Tu gardes 100 % de tes ventes.
              </p>
            </Reveal>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Découverte */}
              <Reveal>
                <div className="rounded-[20px] border border-sand-200 bg-white p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/5">
                  <p className="text-sm font-bold text-ink-900">Découverte</p>
                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-ink-900">Gratuit</span>
                  </div>
                  <p className="mt-2 text-center text-sm text-ink-700/75">Pour démarrer, sans limite de durée.</p>
                  <div className="my-6 h-px w-full bg-sand-100" />
                  <ul className="space-y-3">
                    {[
                      'Vitrine en ligne complète',
                      `${PLANS.free.maxActiveProducts} produits et ${PLANS.free.maxActiveServices} prestations actifs`,
                      `Rendez-vous et réservations en ligne (${PLANS.free.maxMonthlyBookings} demandes / mois)`,
                      'Commandes sur WhatsApp, livraison par zones',
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
                    <span className="absolute -top-3 left-1/2 inline-flex max-w-[90%] -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-md bg-gold-400 px-2.5 py-1 text-xs font-semibold text-ink-900"><Gift size={12} aria-hidden />{promo.days} jours offerts</span>
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
                      'SEO avancé : titre, description et image de partage par page',
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
                  <span className="absolute -top-3 left-1/2 inline-flex max-w-[90%] -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-md bg-gold-400 px-2.5 py-1 text-xs font-semibold text-ink-900">
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
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {commitments.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} delay={i * 60}>
                  <div className="flex h-full gap-3 rounded-2xl border border-sand-200 bg-white p-4">
                    <Icon size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-700/75">{text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
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
              <FaqList />
            </Reveal>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="border-b border-sand-200 bg-gradient-to-br from-brand-100 to-sand-100">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-32">
            <Reveal>
              <h2 className="mx-auto max-w-[650px] font-heading text-3xl font-semibold text-ink-900 sm:text-4xl lg:text-5xl">
                Ton lien peut être en ligne avant la fin de ton café.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-700/70">
                Crée ton espace en 2 minutes, partage ton lien, laisse tes clients commander et réserver. Gratuit, sans carte bancaire, sans engagement.
              </p>
              <Link to="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-4 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700">
                Créer mon espace gratuit <ArrowRight size={16} aria-hidden />
              </Link>
              <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-700">
                {['Gratuit pour démarrer', '0 % de commission', 'Sans carte bancaire', 'Sans engagement'].map((t) => (
                  <span key={t} className="flex items-center gap-1"><Check size={11} aria-hidden />{t}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
