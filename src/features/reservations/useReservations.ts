import { useQuery } from '@tanstack/react-query'

export interface Reservation {
  id: string
  date: string
  time: string
  partySize: number
  customerName: string
  customerPhone: string
  status: 'pending' | 'confirmed' | 'cancelled'
  tableId?: string
}

export function useReservations({ shopId, date }: { shopId: string | undefined; date: string }) {
  return useQuery({
    queryKey: ['reservations', shopId, date],
    queryFn: async () => {
      if (!shopId) return []
      // Mock implementation
      return []
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}