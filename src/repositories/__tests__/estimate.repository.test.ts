import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedEstimateSettings } from '@/src/__tests__/factories/estimate.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { EstimateRepository } from '@/src/repositories/estimate.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupProject() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  return seedProject(ws.id, user.id)
}

describe('EstimateRepository', () => {
  describe('findByProjectId()', () => {
    it('should return settings when they exist', async () => {
      const project = await setupProject()
      await seedEstimateSettings(project.id, {
        system: 'TIME',
        model: 'HOURS',
      })

      const result = await EstimateRepository.findByProjectId(project.id)

      expect(expectOk(result).system).toBe('TIME')
    })

    it('should return ESTIMATE_SETTINGS_NOT_FOUND when missing', async () => {
      const result = await EstimateRepository.findByProjectId('nonexistent')
      expectErr(result, 'ESTIMATE_SETTINGS_NOT_FOUND')
    })
  })

  describe('update()', () => {
    it('should update system and model', async () => {
      const project = await setupProject()
      await seedEstimateSettings(project.id)

      const result = await EstimateRepository.update(project.id, {
        system: 'CATEGORIES',
        model: 'T_SHIRT_SIZES',
      })

      const settings = expectOk(result)
      expect(settings.system).toBe('CATEGORIES')
      expect(settings.model).toBe('T_SHIRT_SIZES')
    })

    it('should return ESTIMATE_SETTINGS_NOT_FOUND when project has no settings row', async () => {
      const result = await EstimateRepository.update('nonexistent', {
        system: 'POINTS',
        model: 'FIBONACCI',
      })

      expectErr(result, 'ESTIMATE_SETTINGS_NOT_FOUND')
    })
  })
})
