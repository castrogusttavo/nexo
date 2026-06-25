import { describe, expect, it } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { UserPreferenceRepository } from '../user-preference.repository'

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
  })
})
