import { useQuery } from '@tanstack/react-query'

export interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  images: string[]
  categoryId?: string
  categoryName?: string
  preparationTime?: number
  allergens?: string[]
}

interface UseActiveServicesOptions {
  shopId: string
  sort?: 'manual' | 'price_asc' | 'price_desc' | 'duration_asc' | 'duration_desc'
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  ids?: string[]
}

export function useActiveServices(options: UseActiveServicesOptions) {
  const { shopId, sort = 'manual', page = 1, limit = 12, search, categoryId, ids } = options

  return useQuery({
    queryKey: ['services', shopId, { sort, page, limit, search, categoryId, ids }],
    queryFn: async () => {
      // Mock implementation - replace with real API call
      const mockServices: Service[] = [
        {
          id: 'svc_1',
          name: 'Coupe femme',
          description: 'Coupe personnalisée avec shampooing et brushing',
          price: 3500,
          duration: 45,
          images: [],
          categoryName: 'Coiffure',
          preparationTime: 45,
        },
        {
          id: 'svc_2',
          name: 'Coloration',
          description: 'Coloration complète avec soin',
          price: 5500,
          duration: 90,
          images: [],
          categoryName: 'Coiffure',
          preparationTime: 90,
        },
        {
          id: 'svc_3',
          name: 'Barbe',
          description: 'Taille et entretien de la barbe',
          price: 1500,
          duration: 20,
          images: [],
          categoryName: 'Barbe',
          preparationTime: 20,
        },
      ]

      let filtered = mockServices
      if (ids) filtered = filtered.filter((s) => ids.includes(s.id))
      if (search) filtered = filtered.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

      const start = (page - 1) * limit
      const paginated = filtered.slice(start, start + limit)

      return {
        services: paginated,
        total: filtered.length,
      }
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}