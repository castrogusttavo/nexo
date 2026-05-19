import { describe, expect, it } from 'vitest'
import { parseCookieConsent } from '@/lib/cookie-consent/types'

describe('parseCookieConsent()', () => {
  it('returns accepted for the literal "accepted"', () => {
    expect(parseCookieConsent('accepted')).toBe('accepted')
  })

  it('returns rejected for the literal "rejected"', () => {
    expect(parseCookieConsent('rejected')).toBe('rejected')
  })

  it('returns null for undefined (no cookie yet)', () => {
    expect(parseCookieConsent(undefined)).toBeNull()
  })

  it('returns null for any other string (defensive default keeps the banner visible)', () => {
    expect(parseCookieConsent('')).toBeNull()
    expect(parseCookieConsent('true')).toBeNull()
    expect(parseCookieConsent('ACCEPTED')).toBeNull()
    expect(parseCookieConsent('yes')).toBeNull()
  })
})
