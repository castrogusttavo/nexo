import { describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/repositories/consent.repository')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))

import { auditMutation } from '@/lib/axiom/audit'
import { ConsentRepository } from '@/src/repositories/consent.repository'
import { ConsentService } from '@/src/services/consent.service'

const mockedRepo = vi.mocked(ConsentRepository)
const mockedAudit = vi.mocked(auditMutation)

const context = { ipAddress: '127.0.0.1', userAgent: 'vitest' }

describe('ConsentService', () => {
  describe('recordCookieConsent()', () => {
    it('should short-circuit when the latest action already matches (accept)', async () => {
      mockedRepo.findLatestCookieConsentAction.mockResolvedValue(ok('GRANTED'))

      const result = await ConsentService.recordCookieConsent(
        'u1',
        true,
        context,
      )

      expect(expectOk(result)).toEqual({ accepted: true })
      expect(mockedRepo.recordCookieConsent).not.toHaveBeenCalled()
      expect(mockedAudit).not.toHaveBeenCalled()
    })

    it('should short-circuit when the latest action already matches (revoke)', async () => {
      mockedRepo.findLatestCookieConsentAction.mockResolvedValue(ok('REVOKED'))

      const result = await ConsentService.recordCookieConsent(
        'u1',
        false,
        context,
      )

      expect(expectOk(result)).toEqual({ accepted: false })
      expect(mockedRepo.recordCookieConsent).not.toHaveBeenCalled()
    })

    it('should record a new event and audit success when action changed', async () => {
      mockedRepo.findLatestCookieConsentAction.mockResolvedValue(ok('REVOKED'))
      mockedRepo.recordCookieConsent.mockResolvedValue(ok(undefined))

      const result = await ConsentService.recordCookieConsent(
        'u1',
        true,
        context,
      )

      expect(expectOk(result)).toEqual({ accepted: true })
      expect(mockedRepo.recordCookieConsent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          action: 'GRANTED',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }),
      )
      expect(mockedAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'consent',
          action: 'grant',
          actorId: 'u1',
          targetId: 'u1',
        }),
      )
    })

    it('should record and audit a revoke', async () => {
      mockedRepo.findLatestCookieConsentAction.mockResolvedValue(ok('GRANTED'))
      mockedRepo.recordCookieConsent.mockResolvedValue(ok(undefined))

      await ConsentService.recordCookieConsent('u1', false, context)

      expect(mockedRepo.recordCookieConsent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REVOKED' }),
      )
      expect(mockedAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'revoke' }),
      )
    })

    it('should proceed to record when finding the latest action fails', async () => {
      mockedRepo.findLatestCookieConsentAction.mockResolvedValue(
        err(databaseError()),
      )
      mockedRepo.recordCookieConsent.mockResolvedValue(ok(undefined))

      const result = await ConsentService.recordCookieConsent(
        'u1',
        true,
        context,
      )

      expectOk(result)
      expect(mockedRepo.recordCookieConsent).toHaveBeenCalled()
    })

    it('should audit failure and propagate the error when recording fails', async () => {
      mockedRepo.findLatestCookieConsentAction.mockResolvedValue(ok('REVOKED'))
      mockedRepo.recordCookieConsent.mockResolvedValue(err(databaseError()))

      const result = await ConsentService.recordCookieConsent(
        'u1',
        true,
        context,
      )

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'consent',
          action: 'grant',
          outcome: 'failure',
          reason: 'DATABASE_ERROR',
        }),
      )
    })
  })
})
