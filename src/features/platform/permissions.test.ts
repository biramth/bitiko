import { describe, expect, it } from 'vitest'
import { can } from './permissions'

describe('platform capabilities', () => {
  it('grants business catalog management to owner/admin only', () => {
    expect(can('owner', 'manage_business_types')).toBe(true)
    expect(can('admin', 'manage_business_types')).toBe(true)
    expect(can('dev', 'manage_business_types')).toBe(false)
    expect(can('marketing', 'manage_business_types')).toBe(false)
    expect(can(null, 'manage_business_types')).toBe(false)
  })

  it('keeps marketing on analytics/shops/campaigns only', () => {
    expect(can('marketing', 'view_analytics')).toBe(true)
    expect(can('marketing', 'manage_payments')).toBe(false)
    expect(can('marketing', 'manage_team')).toBe(false)
  })
})
