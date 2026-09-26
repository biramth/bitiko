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

describe('suspension et santé', () => {
  it('réserve la suspension aux propriétaires et administrateurs', () => {
    expect(can('owner', 'suspend_shops')).toBe(true)
    expect(can('admin', 'suspend_shops')).toBe(true)
    expect(can('dev', 'suspend_shops')).toBe(false)
    expect(can('marketing', 'suspend_shops')).toBe(false)
  })

  it('ouvre la santé technique au développeur mais pas au marketing', () => {
    expect(can('dev', 'view_health')).toBe(true)
    expect(can('marketing', 'view_health')).toBe(false)
  })
})
