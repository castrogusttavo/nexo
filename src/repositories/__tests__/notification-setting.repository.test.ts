import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { NotificationSettingRepository } from '../notification-setting.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function seedUser(id = 'user_notif_test') {
  return prisma.user.create({
    data: {
      id,
      name: 'Notif User',
      email: `${id}@example.com`,
      username: id,
    },
  })
}

describe('NotificationSettingRepository', () => {
  describe('findByUserId()', () => {
    it('should return notFound when the user has no settings yet', async () => {
      const user = await seedUser()

      const result = await NotificationSettingRepository.findByUserId(user.id)

      expect(expectErr(result).code).toBe('RESOURCE_NOT_FOUND')
    })

    it('should return the setting when it exists', async () => {
      const user = await seedUser()
      await NotificationSettingRepository.upsert(user.id, { comments: false })

      const result = await NotificationSettingRepository.findByUserId(user.id)

      expect(expectOk(result).comments).toBe(false)
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.notificationSetting, 'findUnique').mockRejectedValueOnce(
        new Error('connection lost'),
      )

      const result = await NotificationSettingRepository.findByUserId('user_x')

      expect(expectErr(result).code).toBe('DATABASE_ERROR')
    })
  })

  describe('upsert()', () => {
    it('should create with defaults on first call', async () => {
      const user = await seedUser()

      const setting = expectOk(
        await NotificationSettingRepository.upsert(user.id),
      )

      expect(setting.priorityChanges).toBe(true)
      expect(setting.stateChanges).toBe(true)
      expect(setting.comments).toBe(true)
      expect(setting.mentions).toBe(true)
    })

    it('should update existing fields without touching the others', async () => {
      const user = await seedUser()
      await NotificationSettingRepository.upsert(user.id, { comments: false })

      const updated = expectOk(
        await NotificationSettingRepository.upsert(user.id, {
          mentions: false,
        }),
      )

      expect(updated.comments).toBe(false)
      expect(updated.mentions).toBe(false)
      expect(updated.priorityChanges).toBe(true)
    })

    it('should return DATABASE_ERROR when the upsert fails (unknown user)', async () => {
      const result = await NotificationSettingRepository.upsert(
        'non-existent-user',
        { comments: false },
      )

      expect(expectErr(result).code).toBe('DATABASE_ERROR')
    })
  })
})
