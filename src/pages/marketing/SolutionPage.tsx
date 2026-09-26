import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight } from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useJsonLd } from '@/hooks/useJsonLd'
import { breadcrumbJsonLd, faqJsonLd, solutionJsonLd, SITE_ORIGIN } from '@/seo/jsonLd'
import { SiteFooter, SiteNav } from './landing/Chrome'
import { BrowserShot, PhoneShot, Reveal, SectionHeading } from './landing/ui'
import { SOLUTION_BY_SLUG, type SolutionPageData } from './solutions/data'

/** Contenu d'une page de solution (sans hooks de route) : réutilisé tel quel par le prérendu HTML. */
export function SolutionContent({ page }: { page: SolutionPageData }) {
  const related = page.related.map((slug) => SOLUTION_BY_SLUG[slug]).filter(Boolean)
  const phones = page.shots.filter((s) => s.kind === 'phone')
  const browsers = page.shots.filter((s) => s.kind === 'browser')

  return (
    <div className="flex min-h-screen flex-col bg-sand-50 font-sans text-ink-800">
      <SiteNav />
      <main className="w-full">
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 lg:pt-16">
          <nav aria-label="Fil d’Ariane" className="mb-6 flex flex-wrap items-center gap-1 text-xs text-ink-700/70">
            <Link to="/" className="hover:text-ink-900">Accueil</Link>
            <ChevronRight size={12} aria-hidden />
            <span>Solutions</span>
            <ChevronRight size={12} aria-hidden />
            <span aria-current="page" className="font-medium text-ink-900">{page.navLabel}</span>
          </nav>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div>
              <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">{page.eyebrow}</p>
              <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-[2.6rem]">{page.h1}</h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-700/80">{page.lead}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/admin/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-4 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700">
                  Créer mon espace gratuitement <ArrowRight size={16} aria-hidden />
                </Link>
                <a href="/#demo" className="inline-flex items-center justify-center rounded-full border border-sand-300 bg-white px-6 py-4 text-sm font-medium text-ink-900 transition-colors hover:bg-sand-100">
                  Voir la démo
                </a>
              </div>
              <p className="mt-4 text-xs text-ink-700/60">0 F pour lancer · Zéro commission · Sans carte bancaire</p>
            </div>
            <div className="flex items-end justify-center gap-4">
              {phones.slice(0, 2).map((shot, i) => (
                <PhoneShot key={shot.name} name={shot.name} alt={shot.alt} eager className={`w-[44%] max-w-[210px] ${i === 1 ? 'mb-6' : ''}`} />
              ))}
              {phones.length === 0 && browsers[0] && <BrowserShot name={browsers[0].name} alt={browsers[0].alt} eager className="w-full" />}
            </div>
          </div>
        </section>

        <section className="border-y border-sand-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <SectionHeading eyebrow="Pourquoi Bitiko" title="Ce que ça change concrètement" className="mb-12" />
            <div className="grid gap-6 sm:grid-cols-2">
              {page.benefits.map((benefit, i) => (
                <Reveal key={benefit.title} delay={i * 60}>
                  <article className="h-full rounded-2xl border border-sand-200 bg-sand-50 p-6">
                    <h3 className="font-heading text-lg font-semibold text-ink-900">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-700/80">{benefit.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <SectionHeading eyebrow="Fonctionnalités" title="Tout ce qu’il faut, rien de compliqué" className="mb-10" />
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <ul className="space-y-3">
              {page.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-[15px] text-ink-700/90">
                  <Check size={17} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="space-y-6">
              {browsers.map((shot) => (
                <BrowserShot key={shot.name} name={shot.name} alt={shot.alt} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-sand-200 bg-ink-900">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionHeading light eyebrow="Démarrer" title="Prêt en trois étapes" className="mb-10" />
            <ol className="grid gap-8 sm:grid-cols-3">
              {page.steps.map((step, i) => (
                <li key={step.title} className="text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gold-400 text-lg font-bold text-ink-900">{i + 1}</span>
                  <h3 className="mt-4 font-heading text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-ink-100/70">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
          <SectionHeading eyebrow="Questions fréquentes" title={`${page.navLabel} : vos questions`} className="mb-10" />
          <dl className="divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white">
            {page.faq.map((item) => (
              <div key={item.question} className="px-6 py-5">
                <dt className="font-heading text-base font-semibold text-ink-900">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-700/80">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-sand-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-heading text-xl font-semibold text-ink-900">À lire aussi</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link to={`/solutions/${item.slug}`} className="block h-full rounded-2xl border border-sand-200 bg-sand-50 p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                    <p className="font-heading text-base font-semibold text-ink-900">{item.navLabel}</p>
                    <p className="mt-1.5 line-clamp-3 text-sm text-ink-700/75">{item.metaDescription}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700">Découvrir <ArrowRight size={14} aria-hidden /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-gradient-to-br from-brand-100 to-sand-100">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
            <h2 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">Lancez votre espace aujourd’hui</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-ink-700/75">Gratuit pour démarrer, sans carte bancaire et sans commission sur vos ventes.</p>
            <Link to="/admin/login" className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-4 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-700">
              Créer mon espace gratuitement <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

export function SolutionPage() {
  const { slug } = useParams<{ slug: string }>()
  const page = slug ? SOLUTION_BY_SLUG[slug] : undefined

  usePageSeo({
    title: page?.metaTitle ?? 'Bitiko',
    description: page?.metaDescription,
    image: `${SITE_ORIGIN}/og-cover.png`,
    canonicalUrl: page ? `${SITE_ORIGIN}/solutions/${page.slug}` : undefined,
  })
  useJsonLd('solution-page-jsonld', page ? solutionJsonLd(page) : null)
  useJsonLd('solution-faq-jsonld', page ? faqJsonLd(page.faq) : null)
  useJsonLd(
    'solution-breadcrumb-jsonld',
    page ? breadcrumbJsonLd([{ name: 'Accueil', path: '/' }, { name: page.navLabel, path: `/solutions/${page.slug}` }]) : null,
  )

  if (!page) return <Navigate to="/" replace />
  return <SolutionContent page={page} />
}
