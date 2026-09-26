import { useQuery } from '@tanstack/react-query'
import { listReservationsByDate } from '@/services/reservation.service'

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
    queryFn: () => {
      if (!shopId) return []
      return listReservationsByDate(shopId, date)
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}
