import { describe, expect, it } from 'vitest'
import { getDefaultProvider, getProvider } from './registry.js'
import { mapWaveStatus } from './waveProvider.js'

describe('mapWaveStatus', () => {
  it('maps the Wave vocabulary onto engine statuses', () => {
    expect(mapWaveStatus('succeeded')).toBe('succeeded')
    expect(mapWaveStatus('cancelled')).toBe('failed')
    expect(mapWaveStatus('processing')).toBe('pending')
  })
})

describe('provider registry', () => {
  it('resolves wave as the default provider', () => {
    expect(getDefaultProvider().code).toBe('wave')
    expect(getProvider('wave').code).toBe('wave')
  })

  it('rejects unknown providers', () => {
    expect(() => getProvider('orange-money')).toThrow(/Unknown payment provider/)
  })
})
