import { afterEach, describe, expect, it } from 'vitest'
import { isCronAuthorized } from './cronAuth.js'

describe('isCronAuthorized', () => {
  const original = process.env.CRON_SECRET
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = original
  })

  it('refuse tout quand CRON_SECRET est absent (fail closed)', () => {
    delete process.env.CRON_SECRET
    expect(isCronAuthorized(undefined)).toBe(false)
    expect(isCronAuthorized('Bearer ')).toBe(false)
    expect(isCronAuthorized('Bearer undefined')).toBe(false)
  })

  it('accepte uniquement le bon secret', () => {
    process.env.CRON_SECRET = 's3cret'
    expect(isCronAuthorized('Bearer s3cret')).toBe(true)
    expect(isCronAuthorized('Bearer autre')).toBe(false)
    expect(isCronAuthorized(undefined)).toBe(false)
  })
})
