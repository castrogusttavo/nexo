import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedEstimateSettings } from '@/src/__tests__/factories/estimate.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { EstimateValueRepository } from '@/src/repositories/estimate-value.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupSettings() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, user.id)
  return seedEstimateSettings(project.id)
}

describe('EstimateValueRepository', () => {
  describe('findById()', () => {
    it('should return the value', async () => {
      const settings = await setupSettings()
      const created = expectOk(
        await EstimateValueRepository.create(settings.id, '1'),
      )

      const result = await EstimateValueRepository.findById(created.id)

      expect(expectOk(result).id).toBe(created.id)
    })

    it('should return ESTIMATE_VALUE_NOT_FOUND for a missing id', async () => {
      const result = await EstimateValueRepository.findById('nonexistent')
      expectErr(result, 'ESTIMATE_VALUE_NOT_FOUND')
    })
  })

  describe('listByEstimateSettingsId()', () => {
    it('should list values ordered ascending', async () => {
      const settings = await setupSettings()
      const first = expectOk(
        await EstimateValueRepository.create(settings.id, '1'),
      )
      const second = expectOk(
        await EstimateValueRepository.create(settings.id, '2'),
      )

      const result = await EstimateValueRepository.listByEstimateSettingsId(
        settings.id,
      )

      expect(expectOk(result).map((v) => v.id)).toEqual([first.id, second.id])
    })
  })

  describe('create()', () => {
    it('should append a value with the next order', async () => {
      const settings = await setupSettings()

      const first = expectOk(
        await EstimateValueRepository.create(settings.id, '1'),
      )
      const second = expectOk(
        await EstimateValueRepository.create(settings.id, '2'),
      )

      expect(first.order).toBe(0)
      expect(second.order).toBe(1)
    })

    it('should return DATABASE_ERROR for a nonexistent settings id', async () => {
      const result = await EstimateValueRepository.create('nonexistent', '1')
      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update the value label', async () => {
      const settings = await setupSettings()
      const created = expectOk(
        await EstimateValueRepository.create(settings.id, '1'),
      )

      const result = await EstimateValueRepository.update(created.id, '2')

      expect(expectOk(result).value).toBe('2')
    })

    it('should return ESTIMATE_VALUE_NOT_FOUND for a missing id', async () => {
      const result = await EstimateValueRepository.update('nonexistent', '2')
      expectErr(result, 'ESTIMATE_VALUE_NOT_FOUND')
    })
  })

  describe('delete()', () => {
    it('should remove the value', async () => {
      const settings = await setupSettings()
      const created = expectOk(
        await EstimateValueRepository.create(settings.id, '1'),
      )

      await EstimateValueRepository.delete(created.id)

      const found = await EstimateValueRepository.findById(created.id)
      expectErr(found, 'ESTIMATE_VALUE_NOT_FOUND')
    })

    it('should return ESTIMATE_VALUE_NOT_FOUND for a missing id', async () => {
      const result = await EstimateValueRepository.delete('nonexistent')
      expectErr(result, 'ESTIMATE_VALUE_NOT_FOUND')
    })
  })

  describe('countByEstimateSettingsId()', () => {
    it('should count values scoped to the settings row', async () => {
      const settings = await setupSettings()
      await EstimateValueRepository.create(settings.id, '1')
      await EstimateValueRepository.create(settings.id, '2')

      const result = await EstimateValueRepository.countByEstimateSettingsId(
        settings.id,
      )

      expect(expectOk(result)).toBe(2)
    })
  })

  describe('reorder()', () => {
    it('should persist the new order matching the given id sequence', async () => {
      const settings = await setupSettings()
      const a = expectOk(await EstimateValueRepository.create(settings.id, 'a'))
      const b = expectOk(await EstimateValueRepository.create(settings.id, 'b'))

      const result = await EstimateValueRepository.reorder(settings.id, [
        b.id,
        a.id,
      ])

      const values = expectOk(result)
      expect(values.map((v) => v.id)).toEqual([b.id, a.id])
      expect(values.map((v) => v.order)).toEqual([0, 1])
    })

    it('should return DATABASE_ERROR when a value id does not exist', async () => {
      const settings = await setupSettings()
      const a = expectOk(await EstimateValueRepository.create(settings.id, 'a'))

      const result = await EstimateValueRepository.reorder(settings.id, [
        a.id,
        'nonexistent',
      ])

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
