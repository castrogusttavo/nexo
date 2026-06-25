import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeUserPreference } from '@/src/__tests__/factories/user-preference.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, notFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { UserPreferenceService } from '../user-preference.service'

vi.mock('@/src/repositories/user-preference.repository')
vi.mock('@/src/cache/user-preference.cache')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))
vi.mock('@/lib/axiom/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { UserPreferenceCache } from '@/src/cache/user-preference.cache'
import { UserPreferenceRepository } from '@/src/repositories/user-preference.repository'

const repo = vi.mocked(UserPreferenceRepository)
const cache = vi.mocked(UserPreferenceCache)

beforeEach(() => {
  vi.clearAllMocks()
  cache.get.mockResolvedValue(null)
  cache.set.mockResolvedValue()
  cache.invalidate.mockResolvedValue()
})

describe('UserPreferenceService', () => {
  describe('get()', () => {
    it('should return cached preference without hitting the repository', async () => {
      cache.get.mockResolvedValue({
        theme: 'DARK',
        smoothCursor: true,
        quickSendShortcut: 'CTRL_ENTER',
        timezone: 'America/Sao_Paulo',
        weekStartsOn: 0,
        weekendDays: [0, 6],
      })

      const dto = expectOk(await UserPreferenceService.get('user_123'))

      expect(dto.theme).toBe('DARK')
      expect(repo.findByUserId).not.toHaveBeenCalled()
    })

    it('should lazily create default when none exist', async () => {
      repo.findByUserId.mockResolvedValue(err(notFound('UserPreference')))
      repo.upsert.mockResolvedValue(ok(createFakeUserPreference()))

      const dto = expectOk(await UserPreferenceService.get('user_123'))

      expect(repo.upsert).toHaveBeenCalledWith('user_123')
      expect(dto.theme).toBe('SYSTEM')
      expect(cache.set).toHaveBeenCalled()
    })

    it('should propagate detabase errors on read', async () => {
      repo.findByUserId.mockResolvedValue(err(databaseError()))

      expect(expectErr(await UserPreferenceService.get('user_123')).code).toBe(
        'DATABASE_ERROR',
      )
      expect(repo.upsert).not.toHaveBeenCalled()
    })

    it('should propagate database errors when lazy creation fails', async () => {
      repo.findByUserId.mockResolvedValue(err(notFound('UserPreference')))
      repo.upsert.mockResolvedValue(err(databaseError()))

      expect(expectErr(await UserPreferenceService.get('user_123')).code).toBe(
        'DATABASE_ERROR',
      )
      expect(cache.set).not.toHaveBeenCalled()
    })
  })

  describe('update()', () => {
    it('should upsert, invalidate cache and return the DTO', async () => {
      repo.upsert.mockResolvedValue(
        ok(createFakeUserPreference({ theme: 'DARK' })),
      )

      const dto = expectOk(
        await UserPreferenceService.update('user_123', { theme: 'DARK' }),
      )

      expect(dto.theme).toBe('DARK')
      expect(cache.invalidate).toHaveBeenCalledWith('user_123')
    })

    it('should propagate database errors on write', async () => {
      repo.upsert.mockResolvedValue(err(databaseError()))

      expect(
        expectErr(
          await UserPreferenceService.update('user_123', { theme: 'DARK' }),
        ).code,
      ).toBe('DATABASE_ERROR')
      expect(cache.invalidate).not.toHaveBeenCalled()
    })
  })
})
