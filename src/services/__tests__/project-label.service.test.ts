import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProjectLabel } from '@/src/__tests__/factories/project-label.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import {
  databaseError,
  projectLabelAlreadyExists,
  projectLabelNotFound,
} from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectLabelRepository } from '@/src/repositories/project-label.repository'
import { ProjectLabelService } from '../project-label.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project-label.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedLabel = vi.mocked(ProjectLabelRepository)

function actingAs(role: 'OWNER' | 'ADMIN' | 'MEMBER') {
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(
    ok(createFakeMembership({ userId: 'actor', workspaceId: 'ws1', role })),
  )
}

function labelIn(workspaceId: string, overrides = {}) {
  return createFakeProjectLabel({ id: 'plabel-1', workspaceId, ...overrides })
}

describe('ProjectLabelService', () => {
  describe('list()', () => {
    it('should list the workspace labels as DTOs for any member', async () => {
      actingAs('MEMBER')
      mockedLabel.listByWorkspace.mockResolvedValue(ok([labelIn('ws1')]))

      const labels = expectOk(await ProjectLabelService.list('actor', 'ws1'))

      expect(labels).toHaveLength(1)
      expect(labels[0]).toMatchObject({ id: 'plabel-1', workspaceId: 'ws1' })
      expect(mockedLabel.listByWorkspace).toHaveBeenCalledWith('ws1')
    })

    it('should return FORBIDDEN for someone outside the workspace', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      expectErr(await ProjectLabelService.list('actor', 'ws1'), 'FORBIDDEN')
      expect(mockedLabel.listByWorkspace).not.toHaveBeenCalled()
    })

    it('should propagate a repository error', async () => {
      actingAs('MEMBER')
      mockedLabel.listByWorkspace.mockResolvedValue(err(databaseError('boom')))

      expectErr(
        await ProjectLabelService.list('actor', 'ws1'),
        'DATABASE_ERROR',
      )
    })
  })

  describe('create()', () => {
    const dto = { name: 'Marketing', color: 'YELLOW' } as const

    it('should create a label in the workspace for an ADMIN', async () => {
      actingAs('ADMIN')
      mockedLabel.create.mockResolvedValue(ok(labelIn('ws1', dto)))

      const label = expectOk(
        await ProjectLabelService.create('actor', 'ws1', dto),
      )

      expect(label.name).toBe('Marketing')
      expect(mockedLabel.create).toHaveBeenCalledWith({
        ...dto,
        workspaceId: 'ws1',
      })
    })

    it('should return PROJECT_LABEL_FORBIDDEN for a MEMBER', async () => {
      actingAs('MEMBER')

      const result = await ProjectLabelService.create('actor', 'ws1', dto)

      expectErr(result, 'PROJECT_LABEL_FORBIDDEN')
      expect(mockedLabel.create).not.toHaveBeenCalled()
    })

    it('should propagate a taken name', async () => {
      actingAs('OWNER')
      mockedLabel.create.mockResolvedValue(err(projectLabelAlreadyExists()))

      const result = await ProjectLabelService.create('actor', 'ws1', dto)

      expectErr(result, 'PROJECT_LABEL_ALREADY_EXISTS')
    })
  })

  describe('update()', () => {
    it('should update a label of the workspace for an OWNER', async () => {
      actingAs('OWNER')
      mockedLabel.findById.mockResolvedValue(ok(labelIn('ws1')))
      mockedLabel.update.mockResolvedValue(
        ok(labelIn('ws1', { name: 'Vendas' })),
      )

      const label = expectOk(
        await ProjectLabelService.update('actor', 'ws1', 'plabel-1', {
          name: 'Vendas',
        }),
      )

      expect(label.name).toBe('Vendas')
      expect(mockedLabel.update).toHaveBeenCalledWith('plabel-1', {
        name: 'Vendas',
      })
    })

    it('should return PROJECT_LABEL_FORBIDDEN for a MEMBER', async () => {
      actingAs('MEMBER')

      const result = await ProjectLabelService.update(
        'actor',
        'ws1',
        'plabel-1',
        { name: 'Vendas' },
      )

      expectErr(result, 'PROJECT_LABEL_FORBIDDEN')
      expect(mockedLabel.findById).not.toHaveBeenCalled()
    })

    it('should propagate a missing label', async () => {
      actingAs('OWNER')
      mockedLabel.findById.mockResolvedValue(err(projectLabelNotFound()))

      const result = await ProjectLabelService.update(
        'actor',
        'ws1',
        'plabel-1',
        { name: 'Vendas' },
      )

      expectErr(result, 'PROJECT_LABEL_NOT_FOUND')
    })
  })

  describe('delete()', () => {
    it('should delete a label of the workspace for an ADMIN', async () => {
      actingAs('ADMIN')
      mockedLabel.findById.mockResolvedValue(ok(labelIn('ws1')))
      mockedLabel.delete.mockResolvedValue(ok(undefined))

      expectOk(await ProjectLabelService.delete('actor', 'ws1', 'plabel-1'))

      expect(mockedLabel.delete).toHaveBeenLastCalledWith('plabel-1')
    })

    it('should return PROJECT_LABEL_FORBIDDEN for a MEMBER', async () => {
      actingAs('MEMBER')

      const result = await ProjectLabelService.delete(
        'actor',
        'ws1',
        'plabel-1',
      )

      expectErr(result, 'PROJECT_LABEL_FORBIDDEN')
      expect(mockedLabel.delete).not.toHaveBeenCalled()
    })

    it('should return PROJECT_LABEL_NOT_FOUND for a label of another workspace', async () => {
      actingAs('OWNER')
      mockedLabel.findById.mockResolvedValue(ok(labelIn('ws2')))

      const result = await ProjectLabelService.delete(
        'actor',
        'ws1',
        'plabel-1',
      )

      expectErr(result, 'PROJECT_LABEL_NOT_FOUND')
      expect(mockedLabel.delete).not.toHaveBeenCalled()
    })

    it('should propagate a repository error from the delete', async () => {
      actingAs('OWNER')
      mockedLabel.findById.mockResolvedValue(ok(labelIn('ws1')))
      mockedLabel.delete.mockResolvedValue(err(databaseError('boom')))

      const result = await ProjectLabelService.delete(
        'actor',
        'ws1',
        'plabel-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
