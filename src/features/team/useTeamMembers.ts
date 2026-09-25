import { useQuery } from '@tanstack/react-query'

export interface TeamMember {
  id: string
  name: string
  role: string
  specialty?: string
  avatarUrl?: string
  phone?: string
  email?: string
  rating?: number
}

export function useTeamMembers(shopId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', shopId],
    queryFn: async () => {
      if (!shopId) return []
      // Mock implementation
      const mockTeam: TeamMember[] = [
        {
          id: 'tm_1',
          name: 'Awa Diop',
          role: 'Coiffeuse senior',
          specialty: 'Coloration & balayage',
          avatarUrl: '',
          rating: 4.9,
        },
        {
          id: 'tm_2',
          name: 'Moussa Fall',
          role: 'Barbier',
          specialty: 'Barbe & coupe homme',
          avatarUrl: '',
          rating: 4.8,
        },
        {
          id: 'tm_3',
          name: 'Fatou Sarr',
          role: 'Coiffeuse junior',
          specialty: 'Coupe & brushing',
          avatarUrl: '',
          rating: 4.7,
        },
      ]
      return mockTeam
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}