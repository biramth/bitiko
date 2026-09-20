import { ensurePinnedSections } from '@/config/defaultLayout'
import type { LayoutSection, StoreTemplate, SystemTemplateMap, ThemeConfig } from '@/types/builder'
import { STORE_VIBE_BY_KEY, type StoreVibe, type StoreVibeKey } from '@/config/ambiances'
import { ensureReadableAccent, softTint } from '@/utils/color'
import type { StoreProfileAnswers } from './storeProfile'

/** Brand colors suggested from the merchant's logo (best-effort, may be null). */
export interface StoreBrandPalette {
  primary?: string | null
  secondary?: string | null
}

export interface GeneratedStorefront {
  /** The one-line description used as the storefront subheading / SEO meta. */
  description: string | null
  layoutSections: LayoutSection[]
  pageTemplates: SystemTemplateMap
  themeColor: string
  themeConfig: ThemeConfig
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function compact(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** The promo band copy, rebuilt from the delivery/payment answers so it states
 *  what this shop actually offers rather than a generic "Offres du moment". */
function personaPromoConfig(answers: StoreProfileAnswers, existing: LayoutSection['config'] & { heading: string; body: string }) {
  const perks: string[] = []
  if (answers.homeDelivery) perks.push('livraison à domicile')
  if (answers.payOnDelivery) perks.push('paiement à la livraison')
  if (answers.expressDelivery) perks.push('livraison express')
  if (answers.madeToOrder) perks.push('préparé sur commande')

  if (perks.length === 0) return { heading: existing.heading, body: existing.body }

  const first = capitalize(perks[0])
  const rest = perks.slice(1).map((perk) => `, ${perk}`).join('')
  const heading = answers.madeToOrder ? 'Commandez sur mesure' : existing.heading || 'Bon à savoir'
  const body = `${first}${rest} — commandez en quelques clics sur WhatsApp, payez de la façon qui vous arrange.`
  return { heading, body }
}

/** Personalizes a single template section with the merchant's answers. The
 *  template structure is kept (it's what makes each genre visually distinct) —
 *  only the copy the merchant answered for is replaced. */
function personalizeSection(section: LayoutSection, answers: StoreProfileAnswers): LayoutSection {
  switch (section.type) {
    case 'hero': {
      const config = section.config
      return {
        ...section,
        config: {
          ...config,
          // No eyebrow: a generated store shouldn't carry a canned kicker
          // ("Collection capsule", "Produits frais et essentiels"…) above the
          // shop's name — the hero stays the name + the real description.
          eyebrow: '',
          // Empty heading → the live storefront falls back to the shop's name,
          // kept in sync automatically instead of hard-coding a stale title.
          heading: '',
          subheading: compact(answers.description) || config.subheading,
        },
      }
    }
    case 'text': {
      const story = compact(answers.story)
      if (!story) return section
      return {
        ...section,
        config: { ...section.config, heading: 'Notre histoire', body: story },
      }
    }
    case 'promo': {
      return {
        ...section,
        config: { ...section.config, ...personaPromoConfig(answers, section.config) },
      }
    }
    default:
      return section
  }
}

/**
 * Builds the home page layout a shop starts with: the merchant's chosen genre
 * template structure, with the hero/promo/text copy personalized from their
 * onboarding answers. Falls back to the template's own copy for anything the
 * merchant didn't answer.
 *
 * No FAQ section is appended here on purpose: the generated layout must stay
 * within the plan's content-block cap (free = 3) or the DB trigger
 * `enforce_shop_section_limit` rejects the shop insert during onboarding with
 * "plan_limit_exceeded". The merchant's FAQ answers stay saved in
 * `shops.onboarding_responses`, and the FAQ block remains available in the
 * store builder within the plan's budget.
 */
export function generateHomeLayout(template: StoreTemplate, answers: StoreProfileAnswers): LayoutSection[] {
  const home = template.layout.home.map((section) => personalizeSection(section, answers))

  return ensurePinnedSections(home)
}

/**
 * Theme colors from the merchant's logo with contrast guards: the primary
 * accent is darkened until white text on it stays readable, the secondary
 * color is softened into a light pastel for backgrounds (dark text readable on
 * top). Buttons always follow the accent. Without a palette, the template's own
 * (already contrast-checked) theme is used unchanged.
 *
 * The chosen ambiance is applied last (see `StoreVibe.theme`), so it wins over
 * both the template and the logo tint for the fields it sets.
 */
export function buildGeneratedTheme(
  template: StoreTemplate,
  palette: StoreBrandPalette | null | undefined,
  vibe?: StoreVibe | StoreVibeKey | null | undefined,
): { themeColor: string; themeConfig: ThemeConfig } {
  const accent = palette?.primary ?? template.themeColor
  const readableAccent = ensureReadableAccent(accent)
  const rawSecondary = palette?.secondary ?? palette?.primary
  const secondaryColor = rawSecondary ? softTint(rawSecondary) : template.themeConfig.secondaryColor
  const resolvedVibe = typeof vibe === 'string' ? STORE_VIBE_BY_KEY[vibe] : vibe

  return {
    themeColor: readableAccent,
    themeConfig: {
      ...template.themeConfig,
      secondaryColor,
      buttonColor: '',
      ...(resolvedVibe?.theme ?? {}),
    },
  }
}

/** Everything a fresh shop needs to render its personalized store. */
export function generateStorefront(input: {
  template: StoreTemplate
  answers: StoreProfileAnswers
  palette?: StoreBrandPalette | null
  vibe?: StoreVibeKey | null
}): GeneratedStorefront {
  const { template, answers, palette, vibe } = input
  const theme = buildGeneratedTheme(template, palette, vibe)
  return {
    description: compact(answers.description) || null,
    layoutSections: generateHomeLayout(template, answers),
    pageTemplates: {
      catalogue: { published: template.layout.catalogue },
      product: { published: template.layout.product },
      cart: { published: template.layout.cart },
      checkout: { published: template.layout.checkout },
    },
    themeColor: theme.themeColor,
    themeConfig: theme.themeConfig,
  }
}