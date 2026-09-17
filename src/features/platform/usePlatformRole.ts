import { useQuery } from '@tanstack/react-query'
import { getMyPlatformRole } from '@/services/platform.service'

/**
 * The signed-in user's platform role. `null` data (not an error) means they
 * are authenticated but not part of the platform team.
 */
export function usePlatformRole() {
  return useQuery({
    queryKey: ['platform-role'],
    queryFn: getMyPlatformRole,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
