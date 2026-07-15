import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { ConsentRepository } from '../consent.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ConsentRepository', () => {
  describe('findLatestCookieConsentAction()', () => {
    it('should return null when the user has no cookie consent event', async () => {
      const user = await seedUser()

      const result = await ConsentRepository.findLatestCookieConsentAction(
        user.id,
      )

      expect(expectOk(result)).toBeNull()
    })

    it('should return the most recent action', async () => {
      const user = await seedUser()
      await ConsentRepository.recordCookieConsent({
        userId: user.id,
        version: '1.0',
        action: 'GRANTED',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      })
      await new Promise((r) => setTimeout(r, 5))
      await ConsentRepository.recordCookieConsent({
        userId: user.id,
        version: '1.0',
        action: 'REVOKED',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      })

      const result = await ConsentRepository.findLatestCookieConsentAction(
        user.id,
      )

      expect(expectOk(result)).toBe('REVOKED')
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.consentEvent, 'findFirst').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result =
        await ConsentRepository.findLatestCookieConsentAction('nonexistent')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('recordCookieConsent()', () => {
    it('should persist a consent event for the COOKIES document', async () => {
      const user = await seedUser()

      const result = await ConsentRepository.recordCookieConsent({
        userId: user.id,
        version: '2.0',
        action: 'GRANTED',
        ipAddress: '10.0.0.1',
        userAgent: 'test-agent',
      })

      expectOk(result)
      const found = await ConsentRepository.findLatestCookieConsentAction(
        user.id,
      )
      expect(expectOk(found)).toBe('GRANTED')
    })

    it('should return DATABASE_ERROR when the insert throws', async () => {
      vi.spyOn(prisma.consentEvent, 'create').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await ConsentRepository.recordCookieConsent({
        userId: 'nonexistent',
        version: '1.0',
        action: 'GRANTED',
        ipAddress: null,
        userAgent: null,
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
