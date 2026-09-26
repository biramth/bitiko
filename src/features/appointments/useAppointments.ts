import { useQuery } from '@tanstack/react-query'
import { listAppointmentsByDate } from '@/services/appointment.service'

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
    queryFn: () => {
      if (!shopId) return []
      return listAppointmentsByDate(shopId, date)
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}
