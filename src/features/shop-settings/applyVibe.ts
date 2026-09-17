import { STORE_TEMPLATE_BY_KEY, STORE_TEMPLATES } from '@/config/storeTemplates'
import type { StoreVibeKey } from '@/config/ambiances'
import { buildGeneratedTheme } from '@/features/onboarding/generateStorefront'
import { updateShop } from '@/services/shop.service'
import type { Shop } from '@/types'

/** The shop's ambiance, or null for shops created before the feature existed. */
export function shopVibe(shop: Shop): StoreVibeKey | null {
  return (shop.vibe as StoreVibeKey | null) ?? null
}

/**
 * Applies an ambiance to an existing shop.
 *
 * It deliberately rebuilds the theme from the shop's genre template + its own
 * accent color, rather than merging onto the current theme_config: layering a
 * second ambiance on top of a first one would leave the previous vibe's
 * overrides behind (e.g. premium's light text on a light background). The
 * merchant's accent (theme_color) and secondary tint are carried over, so this
 * restyles without wiping their brand.
 */
export function applyVibeToShop(shop: Shop, vibe: StoreVibeKey): Promise<Shop> {
  const template = (shop.template_id && STORE_TEMPLATE_BY_KEY[shop.template_id]) || STORE_TEMPLATES[0]
  const { themeColor, themeConfig } = buildGeneratedTheme(
    template,
    { primary: shop.theme_color, secondary: shop.theme_config.secondaryColor },
    vibe,
  )
  return updateShop(shop.id, { vibe, theme_color: themeColor, theme_config: themeConfig })
}
