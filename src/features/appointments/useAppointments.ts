import { useQuery } from '@tanstack/react-query'

export interface Appointment {
  id: string
  serviceId: string
  teamMemberId: string
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'cancelled'
  customerName: string
  customerPhone: string
}

export function useAppointments({ shopId, date }: { shopId: string | undefined; date: string }) {
  return useQuery({
    queryKey: ['appointments', shopId, date],
    queryFn: async () => {
      if (!shopId) return []
      // Mock implementation
      return []
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}