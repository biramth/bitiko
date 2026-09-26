import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, Check, FileText, Play, Store } from 'lucide-react'
import { IconTile } from '@/components/ui/IconTile'
import demoChapters from '../demoChapters.json'
import { featureGroups } from './content'
import { BrowserShot, PhoneShot, Reveal, SectionHeading } from './ui'

/* ───────────────────────── Hero : captures réelles ───────────────────────── */

export function HeroShots() {
  return (
    <div className="relative mx-auto mt-12 flex w-full max-w-[360px] items-end justify-center gap-3 sm:max-w-[420px] lg:mt-0 lg:block lg:h-[560px] lg:max-w-[560px]">
      <BrowserShot
        name="shop-dashboard"
        alt="Tableau de bord Bitiko d'une boutique : ventes du jour, commandes, stock à surveiller"
        eager
        className="hidden lg:absolute lg:right-0 lg:top-0 lg:block lg:w-[480px]"
      />
      <PhoneShot
        name="shop-boutique"
        alt="Boutique de mode créée avec Bitiko, vue sur téléphone"
        eager
        className="w-[46%] animate-float lg:absolute lg:bottom-0 lg:left-0 lg:w-[210px] lg:-rotate-3"
      />
      <PhoneShot
        name="reserver"
        alt="Prise de rendez-vous en ligne sur le site d'un salon créé avec Bitiko : créneaux disponibles"
        eager
        className="mb-6 w-[46%] animate-float-slow [animation-delay:-2s] lg:absolute lg:bottom-6 lg:right-6 lg:mb-0 lg:w-[190px] lg:rotate-2"
      />
    </div>
  )
}

/* ───────────────────────── Deux façons de travailler ───────────────────────── */

const audiences = [
  {
    tab: 'commerce',
    icon: Store,
    kicker: 'Tu vends des produits',
    title: 'Ta boutique en ligne, prête en 2 minutes.',
    description: 'Catalogue, panier, livraison par quartier, paiement en espèces ou mobile money. Chaque commande arrive sur ton WhatsApp.',
    points: ['Stock mis à jour à chaque vente', 'Vitrine à tes couleurs, sans code', 'Fichier clients et relances WhatsApp'],
    shot: { name: 'shop-catalogue', alt: 'Catalogue d\'une boutique Bitiko sur téléphone' },
    cta: 'Voir le côté commerce',
  },
  {
    tab: 'services',
    icon: CalendarClock,
    kicker: 'Tu proposes des services',
    title: 'Un agenda qui se remplit tout seul.',
    description: 'Tes clients réservent un créneau libre ou une table, à toute heure. Tu confirmes d\'un clic, avec tes vrais horaires.',
    points: ['Horaires différents chaque jour, pauses, congés', 'Alerte email à chaque nouvelle demande', 'Équipe, prestations et tarifs'],
    shot: { name: 'reserver', alt: 'Réservation d\'un créneau sur le site d\'un salon Bitiko' },
    cta: 'Voir le côté services',
  },
]

export function Audiences() {
  return (
    <section className="border-b border-sand-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading
          eyebrow="Pour tous les métiers"
          title={<>Que tu vendes, que tu réserves, <span className="text-brand-600">ou les deux.</span></>}
          subtitle="Un seul espace, deux façons de gagner des clients. Tu actives ce dont ton activité a besoin, le reste reste invisible."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {audiences.map(({ tab, icon, kicker, title, description, points, shot, cta }, i) => (
            <Reveal key={tab} delay={i * 100}>
              <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-sand-200 bg-sand-50 p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5 sm:p-8">
                <div className="grid flex-1 items-end gap-6 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="self-start">
                    <IconTile icon={icon} size="lg" />
                    <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{kicker}</p>
                    <h3 className="mt-2 font-heading text-2xl font-semibold leading-tight text-ink-900">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-700/80">{description}</p>
                    <ul className="mt-4 space-y-2">
                      {points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-sm text-ink-700/90">
                          <Check size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mx-auto hidden w-[180px] translate-y-10 sm:block">
                    <PhoneShot name={shot.name} alt={shot.alt} className="rotate-2" />
                  </div>
                </div>
                <a
                  href="#visite"
                  onClick={() => window.dispatchEvent(new CustomEvent('landing:tour', { detail: tab }))}
                  className="relative z-10 mt-7 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-sm ring-1 ring-sand-200 transition-colors hover:bg-brand-50"
                >
                  {cta} <ArrowRight size={14} aria-hidden />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Vidéo de démonstration ───────────────────────── */

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { duration, chapters } = demoChapters
  const minutes = Math.floor(duration / 60)
  const rest = duration % 60

  const jumpTo = (start: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = start
    void video.play().catch(() => {})
  }

  return (
    <section id="demo" className="border-b border-sand-200 bg-ink-900">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading
          light
          eyebrow="La démo"
          title={`Bitiko en ${minutes} min ${rest ? `${rest} s` : ''}, de la vente au bilan.`}
          subtitle="Une cliente commande, un client réserve, le commerçant confirme, règle ses horaires et suit ses finances. Vraie interface, données fictives."
          className="mb-10"
        />
        <Reveal delay={120}>
          <video
            ref={videoRef}
            controls
            playsInline
            preload="none"
            poster="/marketing/demo-poster.webp"
            width={1280}
            height={720}
            aria-label="Démonstration de Bitiko : boutique en ligne (commande, stock, vitrine) puis rendez-vous (agenda, horaires), et finances du commerçant. Sous-titres intégrés à l'image, sans son."
            className="aspect-video w-full rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/40"
          >
            <source src="/marketing/demo.mp4" type="video/mp4" />
            Ton navigateur ne lit pas cette vidéo. Tu peux la télécharger :{' '}
            <a href="/marketing/demo.mp4" className="underline">démo Bitiko (MP4)</a>.
          </video>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => jumpTo(chapter.start)}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                <Play size={13} className="text-gold-400" aria-hidden />
                {chapter.label}
                <span className="font-mono text-xs text-white/50">{formatClock(chapter.start)}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-ink-100/50">Vidéo sans son, sous-titrée. Commerces fictifs : « Wax &amp; Style by Fatou » et « Salon Awa Beauté ».</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────────────── Fonctionnalités par usage ───────────────────────── */

export function FeatureGroups() {
  return (
    <section id="fonctionnalites" className="border-b border-sand-200">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <SectionHeading
          eyebrow="Fonctionnalités"
          title={<>Tout ce qu'il faut pour vendre, réserver et piloter. <span className="text-brand-600">Au même endroit.</span></>}
          subtitle="Chaque fonctionnalité existe parce qu'un commerçant ou un prestataire en avait besoin. Pas de superflu, pas de compliqué."
        />
        <div className="space-y-16 lg:space-y-20">
          {featureGroups.map((group) => (
            <div key={group.id}>
              <Reveal className="mb-7 max-w-2xl">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">{group.eyebrow}</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">{group.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700/75">{group.description}</p>
              </Reveal>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.features.map(({ icon: Icon, title, description }, i) => (
                  <Reveal key={title} delay={i * 70}>
                    <div className="group h-full rounded-2xl border border-sand-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                      <IconTile icon={Icon} />
                      <h4 className="mt-5 font-heading text-sm font-semibold text-ink-900">{title}</h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-700/70">{description}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Visite guidée (onglets) ───────────────────────── */

interface TourBlock {
  eyebrow: string
  title: string
  description: string
  points: string[]
  note?: string
  shot: { name: string; alt: string }
  /** Document A4 : affiché seul, sans cadre de navigateur. */
  document?: boolean
}

interface TourTab {
  label: string
  blocks: TourBlock[]
  phones?: { heading: string; items: { name: string; alt: string }[] }
}

const TOUR: Record<string, TourTab> = {
  commerce: {
    label: 'Je vends des produits',
    blocks: [
      {
        eyebrow: 'Catalogue & stock',
        title: 'Ton catalogue et ton stock, sous contrôle.',
        description: 'Ajoute un produit en une minute avec ses photos, son prix et son stock. Bitiko te montre ce qui est faible ou épuisé avant que tu ne perdes une vente.',
        points: ['Filtres « stock faible » et « rupture » en un clic', 'Import CSV pour charger tout ton catalogue d\'un coup', 'Catégories, badges « Nouveau » et « Promo », variantes'],
        shot: { name: 'shop-produits', alt: 'Liste des produits dans Bitiko avec stock, prix et statut' },
      },
      {
        eyebrow: 'Commandes',
        title: 'Chaque commande, triée et suivie.',
        description: 'De « en attente » à « livrée », tu vois où en est chaque vente. Tu confirmes, tu marques payée ou livrée en un clic, et tu réponds au client sur WhatsApp.',
        points: ['Commande WhatsApp formatée : nom, articles, total, ville', 'Statuts clairs et recherche par client ou numéro', 'Frais de livraison calculés selon le secteur'],
        shot: { name: 'shop-commandes', alt: 'Liste des commandes Bitiko avec statuts et boutons d\'action' },
      },
      {
        eyebrow: 'Vitrine',
        title: 'Une vitrine à tes couleurs, sans développeur.',
        description: 'Choisis un modèle pensé pour ton métier, ajuste les couleurs, la typographie et les sections. Tu vois le résultat sur ordinateur et sur mobile avant de publier.',
        points: ['Modèles par métier : mode, épicerie, beauté, restauration…', 'Aperçu bureau, tablette et mobile en direct', 'Ton lien à partager sur WhatsApp, Instagram, Facebook'],
        shot: { name: 'shop-personnaliser', alt: 'Éditeur visuel de la vitrine Bitiko avec aperçu en direct' },
      },
      {
        eyebrow: 'Clients',
        title: 'Tes clients enregistrés, sans rien saisir.',
        description: 'Chaque commande crée ou met à jour la fiche du client. Retrouve tes meilleurs clients, les nouveaux et ceux qui ne sont pas revenus, et relance-les sur WhatsApp.',
        points: ['Fiche client créée automatiquement', 'Filtres nouveaux, inactifs, top dépenses', 'Relance en un clic sur WhatsApp'],
        shot: { name: 'shop-clients', alt: 'Liste des clients Bitiko avec total dépensé et bouton Relancer' },
      },
    ],
    phones: {
      heading: 'Ce que voient tes clients',
      items: [
        { name: 'shop-boutique', alt: 'Accueil d\'une boutique de mode Bitiko sur téléphone' },
        { name: 'shop-catalogue', alt: 'Catalogue avec recherche et filtres sur téléphone' },
        { name: 'shop-produit', alt: 'Fiche produit avec bouton Ajouter sur téléphone' },
      ],
    },
  },
  services: {
    label: 'Je propose des services',
    blocks: [
      {
        eyebrow: 'Rendez-vous',
        title: 'Ton agenda se remplit tout seul. Tu confirmes d\'un clic.',
        description: 'Chaque demande arrive dans ton agenda avec la prestation, l\'heure, la personne de l\'équipe et les boutons Appeler et WhatsApp. Confirme, refuse ou marque comme terminé.',
        points: ['Vue jour et semaine, demandes à confirmer en évidence', 'Email de prévenance à chaque nouvelle demande', 'Le client ne peut choisir que des créneaux réellement libres'],
        shot: { name: 'agenda', alt: 'Agenda des rendez-vous Bitiko : semaine, demandes à confirmer, boutons Confirmer et Refuser' },
      },
      {
        eyebrow: 'Horaires',
        title: 'Des horaires qui suivent ta vraie semaine.',
        description: 'Ouvert le samedi jusqu\'à 17 h, fermé le dimanche, pause de 13 h à 15 h en semaine ? Règle chaque jour séparément, ajoute une pause, copie sur les autres jours, marque tes congés.',
        points: ['Une ou plusieurs plages par jour', 'Jours de congé ponctuels', 'Fuseau horaire adapté à ton pays'],
        shot: { name: 'horaires', alt: 'Réglage des horaires de réservation jour par jour, avec pauses' },
      },
      {
        eyebrow: 'Prestations',
        title: 'Tes prestations, tes prix, tes durées.',
        description: 'Décris chaque prestation une fois : nom, durée, tarif. Elle apparaît sur ton site, réservable en ligne, et tu peux la masquer d\'un interrupteur.',
        points: ['Catégories de prestations', 'Visible ou masqué sur ton site en un clic', 'Prix figé au moment de la réservation'],
        shot: { name: 'prestations', alt: 'Liste des prestations avec durée, prix et interrupteur de visibilité' },
      },
      {
        eyebrow: 'Équipe',
        title: 'Ton équipe présentée, tes rendez-vous répartis.',
        description: 'Ajoute tes collaborateurs avec leur spécialité et leur note. Le client peut choisir avec qui réserver, et tu vois qui fait quoi.',
        points: ['Spécialités et contact optionnels', 'Rendez-vous attribués à une personne', 'Invite un manager ou un vendeur avec des droits limités'],
        shot: { name: 'equipe', alt: 'Équipe d\'un salon dans Bitiko' },
      },
    ],
    phones: {
      heading: 'Ce que voient tes clients',
      items: [
        { name: 'boutique', alt: 'Site d\'un salon de beauté Bitiko sur téléphone' },
        { name: 'reserver', alt: 'Choix du créneau sur téléphone' },
        { name: 'agenda-mobile', alt: 'Agenda du prestataire sur téléphone' },
      ],
    },
  },
  gestion: {
    label: 'Je pilote mon activité',
    blocks: [
      {
        eyebrow: 'Finances',
        title: 'Ce que tu gagnes, ce que tu dépenses, ce qu\'il te reste.',
        description: 'Les commandes payées et les rendez-vous terminés sont comptés automatiquement. Tu ajoutes tes dépenses (loyer, stock, salaires…) en quelques secondes et tu obtiens ton bénéfice, ta marge et le détail de où part l\'argent.',
        points: ['Bilan du mois, du trimestre ou de l\'année', 'Ce qui rapporte le plus : produits et prestations', 'Comparaison avec la période précédente en plan Pro'],
        note: 'Bilan de gestion pour piloter ton activité — ce n\'est pas une comptabilité légale.',
        shot: { name: 'shop-finances', alt: 'Écran Finances de Bitiko : recettes, dépenses, bénéfice et graphique mois par mois' },
      },
      {
        eyebrow: 'Ton bilan, sur papier',
        title: 'Un bilan simple à imprimer ou à envoyer à ton comptable.',
        description: 'Recettes, dépenses par catégorie, bénéfice, mois par mois et ce qui rapporte le plus : une page A4 sobre, générée sur ton appareil. Export Excel (CSV) aussi. Disponible dès le plan gratuit.',
        points: ['PDF prêt à imprimer', 'Export Excel (CSV) compatible tableur', 'Aucun logiciel à installer'],
        shot: { name: 'bilan-pdf', alt: 'Bilan de gestion imprimable : résumé, recettes et dépenses par catégorie' },
        document: true,
      },
      {
        eyebrow: 'Tableau de bord',
        title: 'Ta journée d\'abord, tes chiffres ensuite.',
        description: 'À l\'ouverture, tu vois ce qui demande ton attention : commandes à traiter, stock à surveiller, rendez-vous à confirmer. Les raccourcis sont à un clic.',
        points: ['Ventes du jour, panier moyen, visites', 'Produits les plus vendus et stock à surveiller', 'Le même outil sur téléphone et ordinateur'],
        shot: { name: 'dashboard', alt: 'Tableau de bord Bitiko : rendez-vous du jour et prochains jours' },
      },
    ],
  },
}

const TAB_ORDER = ['commerce', 'services', 'gestion'] as const
type TabKey = (typeof TAB_ORDER)[number]

function TourRow({ block, reverse }: { block: TourBlock; reverse: boolean }) {
  return (
    <div className={`grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      <Reveal>
        <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">{block.eyebrow}</p>
        <h3 className="font-heading text-2xl font-semibold leading-tight text-ink-900 sm:text-3xl">{block.title}</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-700/80">{block.description}</p>
        <ul className="mt-5 space-y-2.5">
          {block.points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700/85">
              <Check size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        {block.note && <p className="mt-4 text-xs text-ink-700/60">{block.note}</p>}
      </Reveal>
      <Reveal delay={100}>
        {block.document ? (
          <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-lg border border-sand-200 bg-white shadow-xl shadow-brand-900/10">
            <img src={`/marketing/${block.shot.name}.webp`} alt={block.shot.alt} width={1080} height={1230} loading="lazy" decoding="async" className="block h-auto w-full" />
          </div>
        ) : (
          <BrowserShot name={block.shot.name} alt={block.shot.alt} />
        )}
      </Reveal>
    </div>
  )
}

export function Tour() {
  const [tab, setTab] = useState<TabKey>('commerce')

  useEffect(() => {
    const onTour = (event: Event) => {
      const next = (event as CustomEvent<string>).detail
      if ((TAB_ORDER as readonly string[]).includes(next)) setTab(next as TabKey)
    }
    window.addEventListener('landing:tour', onTour)
    return () => window.removeEventListener('landing:tour', onTour)
  }, [])

  const current = TOUR[tab]

  return (
    <section id="visite" className="border-b border-sand-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <SectionHeading
          eyebrow="La visite"
          title={<>Voilà à quoi ça ressemble. <span className="text-brand-600">Pour de vrai.</span></>}
          subtitle="Ces images sont des captures de l'application, avec des commerces fictifs. Rien n'est dessiné à la main."
          className="mb-10"
        />
        <div role="tablist" aria-label="Choisir un usage" className="mx-auto mb-14 flex max-w-full flex-wrap justify-center gap-2">
          {TAB_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tour-tab-${key}`}
              aria-selected={tab === key}
              aria-controls="tour-panel"
              onClick={() => setTab(key)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                tab === key ? 'bg-ink-900 text-white shadow-md' : 'bg-sand-50 text-ink-700 ring-1 ring-sand-200 hover:bg-sand-100'
              }`}
            >
              {TOUR[key].label}
            </button>
          ))}
        </div>
        <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${tab}`} className="space-y-20 lg:space-y-28">
          {current.blocks.map((block, i) => (
            <TourRow key={`${tab}-${block.eyebrow}`} block={block} reverse={i % 2 === 1} />
          ))}
          {current.phones && (
            <Reveal>
              <div className="rounded-3xl border border-sand-200 bg-sand-50 px-4 pt-10 sm:px-10">
                <p className="text-center font-heading text-xl font-semibold text-ink-900">{current.phones.heading}</p>
                <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 items-end gap-3 sm:gap-8">
                  {current.phones.items.map((item, i) => (
                    <PhoneShot
                      key={item.name}
                      name={item.name}
                      alt={item.alt}
                      className={`translate-y-6 ${i === 1 ? 'sm:translate-y-2' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          )}
          {tab === 'gestion' && (
            <p className="flex items-center justify-center gap-2 text-xs text-ink-700/60">
              <FileText size={14} className="text-brand-600" aria-hidden /> Export PDF (impression) et Excel (CSV) : gratuits sur tous les plans.
            </p>
          )}
        </div>
        <div className="mt-16 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700"
          >
            Créer mon espace gratuitement <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
