import { useQuery } from '@tanstack/react-query'
import {
  getActiveServicesByIds,
  listActiveServices,
  type ServiceSort,
  type ServiceWithCategory,
} from '@/services/service.service'

export interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  images: string[]
  categoryId?: string
  categoryName?: string
}

interface UseActiveServicesOptions {
  shopId: string
  sort?: ServiceSort
  page?: number
  limit?: number
  /** Taille de page côté serveur (défaut : grille publique) — utile à un sélecteur qui veut tout lister. */
  pageSize?: number
  search?: string
  categoryId?: string
  ids?: string[]
}

function toUiService(row: ServiceWithCategory): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    price: row.price,
    duration: row.duration_minutes,
    images: [],
    categoryId: row.category_id ?? undefined,
    categoryName: row.category?.name,
  }
}

export function useActiveServices(options: UseActiveServicesOptions) {
  const { shopId, sort = 'manual', page = 1, limit = 12, pageSize, search, categoryId, ids } = options

  return useQuery({
    queryKey: ['services', shopId, { sort, page, limit, pageSize, search, categoryId, ids }],
    queryFn: async () => {
      if (ids) {
        const rows = await getActiveServicesByIds(shopId, ids)
        return { services: rows.map(toUiService), total: rows.length }
      }
      const result = await listActiveServices({ shopId, sort, page, pageSize, search, categoryId })
      const services = result.services.map(toUiService).slice(0, limit)
      return { services, total: result.total }
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}
