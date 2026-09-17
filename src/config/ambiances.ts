import type { ThemeConfig } from '@/types/builder'

export type StoreVibeKey = 'epure' | 'cosy' | 'colorful' | 'premium'

export interface StoreVibe {
  key: StoreVibeKey
  label: string
  description: string
  /** [accent, background] sample shown in the onboarding picker. */
  swatch: [string, string]
  /**
   * Theme overrides giving each ambiance its look. Applied last — on top of
   * the vertical template AND the logo-derived palette — so a vibe still reads
   * clearly when the merchant skipped a logo. Light vibes leave the
   * logo-tinted secondary color alone; `premium` overrides it (its dark
   * background would clash with the light pastel tint).
   */
  theme: Partial<ThemeConfig>
}

export const STORE_VIBES: StoreVibe[] = [
  {
    key: 'epure',
    label: 'Épuré & éditorial',
    description: 'Lignes nettes, beaucoup d’air, une mise en page sobre et élégante.',
    swatch: ['#d9612e', '#ffffff'],
    theme: {
      font: 'inter',
      radius: 'none',
      textScale: 'lg',
      contentWidth: 'wide',
      backgroundColor: '#ffffff',
    },
  },
  {
    key: 'cosy',
    label: 'Cosy & chaleureux',
    description: 'Ambiance feutrée, coins arrondis et tons doux, comme à la maison.',
    swatch: ['#e08a4a', '#fff9f2'],
    theme: {
      font: 'sora',
      radius: 'lg',
      textScale: 'base',
      contentWidth: 'wide',
      backgroundColor: '#fff9f2',
    },
  },
  {
    key: 'colorful',
    label: 'Coloré & vitaminé',
    description: 'Couleurs vives et formes rondes pour une boutique pétillante.',
    swatch: ['#e8633c', '#fffbee'],
    theme: {
      font: 'sora',
      radius: 'lg',
      textScale: 'base',
      contentWidth: 'normal',
      backgroundColor: '#fffbee',
    },
  },
  {
    key: 'premium',
    label: 'Premium & raffiné',
    description: 'Fond sombre, contraste élégant et détails dorés pour le haut de gamme.',
    swatch: ['#f2b705', '#17141f'],
    theme: {
      font: 'sora',
      radius: 'none',
      textScale: 'base',
      contentWidth: 'normal',
      backgroundColor: '#17141f',
      textColor: '#f5f0e6',
      secondaryColor: '#262234',
    },
  },
]

export const STORE_VIBE_BY_KEY: Record<StoreVibeKey, StoreVibe> = Object.fromEntries(
  STORE_VIBES.map((vibe) => [vibe.key, vibe]),
) as Record<StoreVibeKey, StoreVibe>