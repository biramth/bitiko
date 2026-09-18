import { createSectionId } from './defaultLayout'
import type { LayoutSection, SystemTemplateKey } from '@/types/builder'

/**
 * Sensible zero-config body sections for each system storefront template, so
 * a merchant sees a working page the moment they open that template in the
 * builder. Everything below the header/footer (rendered globally by
 * StoreLayout) is fully movable/replaceable in the editor.
 */
export function buildDefaultSystemTemplate(key: SystemTemplateKey): LayoutSection[] {
  switch (key) {
    case 'catalogue':
      // The catalogue is a searchable, filterable product grid — the toolbox
      // lives in the Products block (enableFilters).
      return [
        {
          id: createSectionId('products'),
          type: 'products',
          visible: true,
          config: { heading: 'Catalogue', sort: 'recent', limit: 48, enableFilters: true },
        },
      ]
    case 'product':
      return [
        {
          id: createSectionId('product'),
          type: 'product',
          visible: true,
          config: {
            heading: '',
            showGallery: true,
            showTitle: true,
            showPrice: true,
            showDescription: true,
            showQuantity: true,
            showAddToCart: true,
            showTrustBadges: true,
            showRelatedProducts: true,
            showRecentlyViewed: true,
          },
        },
      ]
    case 'cart':
      return [
        {
          id: createSectionId('cart'),
          type: 'cart',
          visible: true,
          config: { heading: 'Mon panier', showFreeDeliveryProgress: true },
        },
      ]
    case 'checkout':
      return [
        {
          id: createSectionId('checkout'),
          type: 'checkout',
          visible: true,
          config: { heading: 'Finaliser la commande', showTrustBadges: true },
        },
      ]
    case 'not_found':
      return [
        {
          id: createSectionId('text'),
          type: 'text',
          visible: true,
          config: {
            heading: 'Page introuvable',
            body: "Cette page n'existe pas ou n'est plus disponible.",
            align: 'center',
          },
        },
      ]
  }
}