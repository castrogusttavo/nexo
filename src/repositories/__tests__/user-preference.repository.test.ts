import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { UserPreferenceRepository } from '../user-preference.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function seedUser(id = 'user_pref_test') {
  return prisma.user.create({
    data: {
      id,
      name: 'Pref User',
      email: `${id}@example.com`,
      username: id,
    },
  })
}

describe('UserPreferenceRepository', () => {
  describe('findByUserId()', () => {
    it('should return notFound when the user has no preferences yet', async () => {
      const user = await seedUser()

      const result = await UserPreferenceRepository.findByUserId(user.id)

      expect(expectErr(result).code).toBe('RESOURCE_NOT_FOUND')
    })

    it('should return the preference when it exists', async () => {
      const user = await seedUser()
      await UserPreferenceRepository.upsert(user.id, { theme: 'DARK' })

      const result = await UserPreferenceRepository.findByUserId(user.id)

      expect(expectOk(result).theme).toBe('DARK')
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.userPreference, 'findUnique').mockRejectedValueOnce(
        new Error('connection lost'),
      )

      const result = await UserPreferenceRepository.findByUserId('user_x')

      expect(expectErr(result).code).toBe('DATABASE_ERROR')
    })
  })

  describe('upsert()', () => {
    it('sohuld create with defaults on first call', async () => {
      const user = await seedUser()

      const preference = expectOk(
        await UserPreferenceRepository.upsert(user.id),
      )

      expect(preference.theme).toBe('SYSTEM')
      expect(preference.timezone).toBe('UTC')
      expect(preference.weekStartsOn).toBe(1)
      expect(preference.weekendDays).toEqual([0, 6])
    })

    it('should update existing fields without touching the others', async () => {
      const user = await seedUser()
      await UserPreferenceRepository.upsert(user.id, { theme: 'DARK' })

      const updated = expectOk(
        await UserPreferenceRepository.upsert(user.id, {
          timezone: 'America/Sao_Paulo',
          weekendDays: [5, 6],
        }),
      )

      expect(updated.theme).toBe('DARK')
      expect(updated.timezone).toBe('America/Sao_Paulo')
      expect(updated.weekendDays).toEqual([5, 6])
    })

    it('should return DATABASE_ERROR when the upsert fails (unknown user)', async () => {
      const result = await UserPreferenceRepository.upsert(
        'non-existent-user',
        {
          theme: 'DARK',
        },
      )

      expect(expectErr(result).code).toBe('DATABASE_ERROR')
    })
  })
})
