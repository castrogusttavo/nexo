import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeNotificationSetting } from '@/src/__tests__/factories/notification-setting.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, notFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { NotificationSettingService } from '../notification-setting.service'

vi.mock('@/src/repositories/notification-setting.repository')
vi.mock('@/src/cache/notification-setting.cache')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))
vi.mock('@/lib/axiom/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { NotificationSettingCache } from '@/src/cache/notification-setting.cache'
import { NotificationSettingRepository } from '@/src/repositories/notification-setting.repository'

const repo = vi.mocked(NotificationSettingRepository)
const cache = vi.mocked(NotificationSettingCache)

beforeEach(() => {
  vi.clearAllMocks()
  cache.get.mockResolvedValue(null)
  cache.set.mockResolvedValue()
  cache.invalidate.mockResolvedValue()
})

describe('NotificationSettingService', () => {
  describe('get()', () => {
    it('should return cached settings without hitting the repository', async () => {
      cache.get.mockResolvedValue({
        priorityChanges: false,
        stateChanges: false,
        comments: false,
        mentions: false,
      })

      const dto = expectOk(await NotificationSettingService.get('user_123'))

      expect(dto.comments).toBe(false)
      expect(repo.findByUserId).not.toHaveBeenCalled()
    })

    it('should lazily create defaults when none exist', async () => {
      repo.findByUserId.mockResolvedValue(err(notFound('NotificationSetting')))
      repo.upsert.mockResolvedValue(ok(createFakeNotificationSetting()))

      const dto = expectOk(await NotificationSettingService.get('user_123'))

      expect(repo.upsert).toHaveBeenCalledWith('user_123')
      expect(dto.priorityChanges).toBe(true)
      expect(cache.set).toHaveBeenCalled()
    })

    it('should cache and return the setting when it already exists', async () => {
      repo.findByUserId.mockResolvedValue(
        ok(createFakeNotificationSetting({ mentions: false })),
      )

      const dto = expectOk(await NotificationSettingService.get('user_123'))

      expect(dto.mentions).toBe(false)
      expect(repo.upsert).not.toHaveBeenCalled()
      expect(cache.set).toHaveBeenCalled()
    })

    it('should propagate database errors on read', async () => {
      repo.findByUserId.mockResolvedValue(err(databaseError()))

      expect(
        expectErr(await NotificationSettingService.get('user_123')).code,
      ).toBe('DATABASE_ERROR')
      expect(repo.upsert).not.toHaveBeenCalled()
    })

    it('should propagate database errors when lazy creation fails', async () => {
      repo.findByUserId.mockResolvedValue(err(notFound('NotificationSetting')))
      repo.upsert.mockResolvedValue(err(databaseError()))

      expect(
        expectErr(await NotificationSettingService.get('user_123')).code,
      ).toBe('DATABASE_ERROR')
      expect(cache.set).not.toHaveBeenCalled()
    })
  })

  describe('update()', () => {
    it('should upsert, invalidate cache and return the DTO', async () => {
      repo.upsert.mockResolvedValue(
        ok(createFakeNotificationSetting({ comments: false })),
      )

      const dto = expectOk(
        await NotificationSettingService.update('user_123', {
          comments: false,
        }),
      )

      expect(dto.comments).toBe(false)
      expect(cache.invalidate).toHaveBeenCalledWith('user_123')
    })

    it('should propagate database errors on write', async () => {
      repo.upsert.mockResolvedValue(err(databaseError()))

      expect(
        expectErr(
          await NotificationSettingService.update('user_123', {
            comments: false,
          }),
        ).code,
      ).toBe('DATABASE_ERROR')
      expect(cache.invalidate).not.toHaveBeenCalled()
    })
  })
})
