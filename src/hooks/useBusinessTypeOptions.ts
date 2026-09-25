import { useQuery } from '@tanstack/react-query'
import { availableVerticals } from '@/config/storeTemplates'
import { fetchOnboardingBusinessTypes } from '@/services/businessType.service'

export interface BusinessTypeOption {
  key: string
  label: string
  description: string | null
}

/** Activity picker options: DB referential first (types with at least one
 *  active template), legacy hardcoded list as fail-open fallback — never an
 *  empty picker. Both shapes normalized so callers never branch. */
export function useBusinessTypeOptions(): BusinessTypeOption[] {
  const { data } = useQuery({
    queryKey: ['business-type-options'],
    queryFn: fetchOnboardingBusinessTypes,
    staleTime: 10 * 60 * 1000,
    retry: false,
    throwOnError: false,
  })
  if (data) return data.map(({ slug, name, description }) => ({ key: slug, label: name, description }))
  return availableVerticals().map(({ key, label, description }) => ({ key, label, description }))
}
