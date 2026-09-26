import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_MODULES,
  groupModules,
  resolveModules,
  type WorkspaceModule,
} from './modules'

const COMMERCE_CAPS = new Set([
  'HAS_SHOP',
  'HAS_PRODUCTS',
  'HAS_ORDERS',
  'HAS_CUSTOMERS',
  'HAS_TEAM',
  'HAS_ANALYTICS',
])

const SERVICE_CAPS = new Set(['HAS_APPOINTMENTS', 'HAS_SERVICES', 'HAS_CALENDAR', 'HAS_CUSTOMERS', 'HAS_TEAM'])

describe('resolveModules', () => {
  it('shows every legacy module for a commerce capability set', () => {
    const keys = resolveModules(WORKSPACE_MODULES, COMMERCE_CAPS, { teamAccess: true }).map((m) => m.key)
    expect(keys).toEqual(['dashboard', 'orders', 'customers', 'products', 'team', 'customize'])
  })

  it('fails open to the full workspace when capabilities are unknown (null)', () => {
    const keys = resolveModules(WORKSPACE_MODULES, null, { teamAccess: true }).map((m) => m.key)
    expect(keys).toEqual([
      'dashboard',
      'orders',
      'customers',
      'products',
      'services',
      'appointments',
      'reservations',
      'team',
      'customize',
    ])
  })

  it('shows service modules for a service business without commerce capabilities', () => {
    const keys = resolveModules(WORKSPACE_MODULES, SERVICE_CAPS, { teamAccess: true }).map((m) => m.key)
    expect(keys).toEqual(['dashboard', 'customers', 'services', 'appointments', 'team'])
  })

  it('keeps only the dashboard for a known-but-empty capability set', () => {
    const keys = resolveModules(WORKSPACE_MODULES, new Set(), { teamAccess: false }).map((m) => m.key)
    expect(keys).toEqual(['dashboard'])
  })

  it('hides disabled modules and applies entitlement gates', () => {
    const modules: WorkspaceModule[] = [
      ...WORKSPACE_MODULES,
      {
        key: 'staff',
        label: 'Staff',
        to: '/admin/parametres/equipe',
        icon: WORKSPACE_MODULES[0]!.icon,
        capabilities: ['HAS_TEAM'],
        entitlements: ['teamAccess'],
        enabled: true,
      },
      { ...WORKSPACE_MODULES[0]!, key: 'off', enabled: false },
    ]
    expect(
      resolveModules(modules, COMMERCE_CAPS, { teamAccess: false }).map((m) => m.key),
    ).not.toContain('staff')
    expect(
      resolveModules(modules, COMMERCE_CAPS, { teamAccess: true }).map((m) => m.key),
    ).toContain('staff')
  })
})

describe('groupModules', () => {
  it('keeps ungrouped entries first, then group order of first appearance', () => {
    const groups = groupModules(resolveModules(WORKSPACE_MODULES, COMMERCE_CAPS, { teamAccess: true }))
    expect(groups.map((g) => g.label)).toEqual([undefined, 'Ventes', 'Boutique', 'Services'])
    expect(groups[1]?.items.map((m) => m.key)).toEqual(['orders', 'customers'])
  })
})
