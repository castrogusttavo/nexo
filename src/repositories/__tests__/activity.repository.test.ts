import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { ActivityRepository } from '../activity.repository'

afterEach(() => {
  vi.resetAllMocks()
})

describe('ActivityRepository', () => {
  describe('record()', () => {
    it('should create the activity row', async () => {
      const actor = await seedUser()

      const result = await ActivityRepository.record({
        entityType: 'ISSUE',
        entityId: 'issue-1',
        actorId: actor.id,
        field: 'priority',
        oldValue: 'NONE',
        newValue: 'HIGH',
      })

      expect(expectOk(result).field).toBe('priority')
      expect(expectOk(result).newValue).toBe('HIGH')
    })

    it('should accept a null oldValue for an add event', async () => {
      const actor = await seedUser()

      const result = await ActivityRepository.record({
        entityType: 'ISSUE',
        entityId: 'issue-1',
        actorId: actor.id,
        field: 'priority',
        newValue: 'HIGH',
      })

      expect(expectOk(result).oldValue).toBeNull()
    })

    it('should return DATABASE_ERROR for a nonexistent actor', async () => {
      const result = await ActivityRepository.record({
        entityType: 'ISSUE',
        entityId: 'issue-1',
        actorId: 'nonexistent',
        field: 'priority',
        newValue: 'HIGH',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('listByEntity()', () => {
    it('should list activities for the entity, most recent first', async () => {
      const actor = await seedUser()
      const first = expectOk(
        await ActivityRepository.record({
          entityType: 'ISSUE',
          entityId: 'issue-1',
          actorId: actor.id,
          field: 'title',
          oldValue: 'Old',
          newValue: 'New',
        }),
      )
      const second = expectOk(
        await ActivityRepository.record({
          entityType: 'ISSUE',
          entityId: 'issue-1',
          actorId: actor.id,
          field: 'title',
          oldValue: 'Old',
          newValue: 'New',
        }),
      )

      const result = await ActivityRepository.listByEntity('ISSUE', 'issue-1')

      expect(expectOk(result).map((a) => a.id)).toEqual([second.id, first.id])
    })

    it('should scope by entityType, not just entityId', async () => {
      const actor = await seedUser()
      await ActivityRepository.record({
        entityType: 'ISSUE',
        entityId: 'shared-id',
        actorId: actor.id,
        field: 'title',
        newValue: 'Issue title',
      })
      await ActivityRepository.record({
        entityType: 'CYCLE',
        entityId: 'shared-id',
        actorId: actor.id,
        field: 'status',
        newValue: 'IN_PROGRESS',
      })

      const result = await ActivityRepository.listByEntity('ISSUE', 'shared-id')

      expect(expectOk(result)).toHaveLength(1)
      expect(expectOk(result)[0].field).toBe('title')
    })

    it('should return an empty list when there is no activity yet', async () => {
      const result = await ActivityRepository.listByEntity('ISSUE', 'shared-1')

      expect(expectOk(result)).toEqual([])
    })

    it('should include actor data', async () => {
      const actor = await seedUser()
      await ActivityRepository.record({
        entityType: 'ISSUE',
        entityId: 'issue-1',
        actorId: actor.id,
        field: 'title',
        newValue: 'New',
      })

      const result = await ActivityRepository.listByEntity('ISSUE', 'issue-1')
      expect(expectOk(result)[0].actor.id).toBe(actor.id)
    })
  })
})
