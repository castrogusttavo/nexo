import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProjectState } from '@/src/__tests__/factories/project-state.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import {
  databaseError,
  projectStateAlreadyExists,
  projectStateNotFound,
} from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectStateRepository } from '@/src/repositories/project-state.repository'
import { ProjectStateService } from '../project-state.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project-state.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedState = vi.mocked(ProjectStateRepository)

function actingAs(role: 'OWNER' | 'ADMIN' | 'MEMBER') {
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(
    ok(createFakeMembership({ userId: 'actor', workspaceId: 'ws1', role })),
  )
}

function stateIn(workspaceId: string, overrides = {}) {
  return createFakeProjectState({ id: 'pstate-1', workspaceId, ...overrides })
}

describe('ProjectStateService', () => {
  describe('list()', () => {
    it('should list the workspace states as DTOs for any member', async () => {
      actingAs('MEMBER')
      mockedState.listByWorkspace.mockResolvedValue(ok([stateIn('ws1')]))

      const states = expectOk(await ProjectStateService.list('actor', 'ws1'))

      expect(states).toHaveLength(1)
      expect(states[0]).toMatchObject({ id: 'pstate-1', workspaceId: 'ws1' })
      expect(mockedState.listByWorkspace).toHaveBeenCalledWith('ws1')
    })

    it('should return FORBIDDEN for someone outside the workspace', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await ProjectStateService.list('actor', 'ws1')

      expectErr(result, 'FORBIDDEN')
      expect(mockedState.listByWorkspace).not.toHaveBeenCalled()
    })

    it('should propagate a repository error', async () => {
      actingAs('MEMBER')
      mockedState.listByWorkspace.mockResolvedValue(err(databaseError('boom')))

      expectErr(
        await ProjectStateService.list('actor', 'ws1'),
        'DATABASE_ERROR',
      )
    })
  })

  describe('create()', () => {
    const dto = {
      name: 'Em revisão',
      group: 'MONITORING',
      color: 'PURPLE',
    } as const

    it('should create a state in the workspace for an ADMIN', async () => {
      actingAs('ADMIN')
      mockedState.create.mockResolvedValue(ok(stateIn('ws1', dto)))

      const state = expectOk(
        await ProjectStateService.create('actor', 'ws1', dto),
      )

      expect(state.name).toBe('Em revisão')
      expect(mockedState.create).toHaveBeenCalledWith({
        ...dto,
        workspaceId: 'ws1',
      })
    })

    it('should return PROJECT_STATE_FORBIDDEN for a MEMBER', async () => {
      actingAs('MEMBER')

      const result = await ProjectStateService.create('actor', 'ws1', dto)

      expectErr(result, 'PROJECT_STATE_FORBIDDEN')
      expect(mockedState.create).not.toHaveBeenCalled()
    })

    it('should propagate a taken name', async () => {
      actingAs('OWNER')
      mockedState.create.mockResolvedValue(err(projectStateAlreadyExists()))

      const result = await ProjectStateService.create('actor', 'ws1', dto)

      expectErr(result, 'PROJECT_STATE_ALREADY_EXISTS')
    })
  })

  describe('update()', () => {
    it('should update a state of the workspace for an OWNER', async () => {
      actingAs('OWNER')
      mockedState.findById.mockResolvedValue(ok(stateIn('ws1')))
      mockedState.update.mockResolvedValue(ok(stateIn('ws1', { name: 'Novo' })))

      const state = expectOk(
        await ProjectStateService.update('actor', 'ws1', 'pstate-1', {
          name: 'Novo',
        }),
      )

      expect(state.name).toBe('Novo')
      expect(mockedState.update).toHaveBeenCalledWith('pstate-1', {
        name: 'Novo',
      })
    })

    it('should return PROJECT_STATE_FORBIDDEN for a MEMBER', async () => {
      actingAs('MEMBER')

      const result = await ProjectStateService.update(
        'actor',
        'ws1',
        'pstate-1',
        {
          name: 'Novo',
        },
      )

      expectErr(result, 'PROJECT_STATE_FORBIDDEN')
      expect(mockedState.findById)
    })

    it('should return PROJECT_STATE_NOT_FOUND for a state of another workspace', async () => {
      actingAs('OWNER')
      mockedState.findById.mockResolvedValue(ok(stateIn('ws2')))

      const result = await ProjectStateService.update(
        'actor',
        'ws1',
        'pstate-1',
        {
          name: 'Novo',
        },
      )

      expectErr(result, 'PROJECT_STATE_NOT_FOUND')
      expect(mockedState.update).not.toHaveBeenCalled()
    })

    it('should propagate a missing state', async () => {
      actingAs('OWNER')
      mockedState.findById.mockResolvedValue(err(projectStateNotFound()))

      const result = await ProjectStateService.update(
        'actor',
        'ws1',
        'pstate-1',
        {
          name: 'Novo',
        },
      )

      expectErr(result, 'PROJECT_STATE_NOT_FOUND')
    })
  })

  describe('delete()', () => {
    it('should move the projects and delete when the group keeps another state', async () => {
      actingAs('ADMIN')
      mockedState.findById.mockResolvedValue(
        ok(stateIn('ws1', { group: 'EXECUTION' })),
      )
      mockedState.countByGroup.mockResolvedValue(ok(2))
      mockedState.deleteMovingProjects.mockResolvedValue(
        ok({ movedTo: 'pstate-2', count: 3 }),
      )

      const moved = expectOk(
        await ProjectStateService.delete('actor', 'ws1', 'pstate-1'),
      )

      expect(moved).toEqual({ movedTo: 'pstate-2', count: 3 })
      expect(mockedState.countByGroup).toHaveBeenCalledWith('ws1', 'EXECUTION')
      expect(mockedState.deleteMovingProjects).toHaveBeenCalledWith('pstate-1')
    })

    it('should return PROJECT_STATE_FORBIDDEN for a MEMBER', async () => {
      actingAs('MEMBER')

      const result = await ProjectStateService.delete(
        'actor',
        'ws1',
        'pstate-1',
      )

      expectErr(result, 'PROJECT_STATE_FORBIDDEN')
      expect(mockedState.deleteMovingProjects).not.toHaveBeenCalled()
    })

    it('should return PROJECT_STATE_NOT_FOUND for a state of another workspace', async () => {
      actingAs('OWNER')
      mockedState.findById.mockResolvedValue(ok(stateIn('ws2')))

      const result = await ProjectStateService.delete(
        'actor',
        'ws1',
        'pstate-1',
      )

      expectErr(result, 'PROJECT_STATE_NOT_FOUND')
      expect(mockedState.deleteMovingProjects).not.toHaveBeenCalled()
    })

    it('should return PROJECT_STATE_NOT_FOUND for a state of another workspace', async () => {
      actingAs('OWNER')
      mockedState.findById.mockResolvedValue(ok(stateIn('ws2')))

      const result = await ProjectStateService.delete(
        'actor',
        'ws1',
        'pstate-1',
      )

      expectErr(result, 'PROJECT_STATE_NOT_FOUND')
      expect(mockedState.deleteMovingProjects).not.toHaveBeenCalled()
    })

    it('should return PROJECT_STATE_LAST_IN_GROUP for the only state of its group', async () => {
      actingAs('OWNER')
      mockedState.findById.mockResolvedValue(
        ok(stateIn('ws1', { isDefault: true })),
      )

      const result = await ProjectStateService.delete(
        'actor',
        'ws1',
        'pstate-1',
      )

      expectErr(result, 'PROJECT_STATE_IS_DEFAULT')
      expect(mockedState.deleteMovingProjects).not.toHaveBeenCalled()
    })

    it('should return PROJECT_STATE_LAST_IN_GROUP for the only state of its group', async () => {
      actingAs('OWNER')
      mockedState.findById.mockResolvedValue(ok(stateIn('ws1')))
      mockedState.countByGroup.mockResolvedValue(ok(1))

      const result = await ProjectStateService.delete(
        'actor',
        'ws1',
        'pstate-1',
      )

      expectErr(result, 'PROJECT_STATE_LAST_IN_GROUP')
      expect(mockedState.deleteMovingProjects).not.toHaveBeenCalled()
    })

    it('should propagate a repository error from the delete', async () => {
      actingAs('OWNER')
      mockedState.findById.mockResolvedValue(ok(stateIn('ws1')))
      mockedState.countByGroup.mockResolvedValue(ok(2))
      mockedState.deleteMovingProjects.mockResolvedValue(
        err(databaseError('boom')),
      )

      const result = await ProjectStateService.delete(
        'actor',
        'ws1',
        'pstate-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('setDefault()', () => {
    it('should make a state of the workspace the default for an ADMIN', async () => {
      actingAs('ADMIN')
      mockedState.findById.mockResolvedValue(ok(stateIn('ws1')))
      mockedState.setDefault.mockResolvedValue(
        ok(stateIn('ws1', { isDefault: true })),
      )

      const state = expectOk(
        await ProjectStateService.setDefault('actor', 'ws1', 'pstate-1'),
      )

      expect(state.isDefault).toBe(true)
      expect(mockedState.setDefault).toHaveBeenCalledWith('pstate-1', 'ws1')
    })

    it('should return PROJECT_STATE_FORBIDDEN for a MEMBER', async () => {
      actingAs('MEMBER')

      const result = await ProjectStateService.setDefault(
        'actor',
        'ws1',
        'pstate-1',
      )

      expectErr(result, 'PROJECT_STATE_FORBIDDEN')
      expect(mockedState.setDefault).not.toHaveBeenCalled()
    })

    it('should return PROJECT_STATE_NOT_FOUND for a state of another workspace', async () => {
      actingAs('OWNER')
      mockedState.findById.mockResolvedValue(ok(stateIn('ws2')))

      const result = await ProjectStateService.setDefault(
        'actor',
        'ws1',
        'pstate-1',
      )

      expectErr(result, 'PROJECT_STATE_NOT_FOUND')
      expect(mockedState.setDefault).not.toHaveBeenCalled()
    })
  })
})

describe('ProjectStateService error propagation', () => {
  const boom = err(databaseError('boom'))

  const writes = {
    create: () =>
      ProjectStateService.create('actor', 'ws1', {
        name: 'Em revisão',
        group: 'MONITORING',
        color: 'PURPLE',
      }),
    update: () =>
      ProjectStateService.update('actor', 'ws1', 'pstate-1', { name: 'Done' }),
    delete: () => ProjectStateService.delete('actor', 'ws1', 'pstate-1'),
    setDefault: () =>
      ProjectStateService.setDefault('actor', 'ws1', 'pstate-1'),
  }

  it.each(
    Object.entries(writes),
  )('%s() propagates a failing membership lookup and stops', async (_, call) => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(boom)

    expectErr(await call(), 'DATABASE_ERROR')
    expect(mockedState.findById).not.toHaveBeenCalled()
    expect(mockedState.create).not.toHaveBeenCalled()
  })

  it.each([
    ['update', 'update'],
    ['delete', 'countByGroup'],
    ['setDefault', 'setDefault'],
  ] as const)('%s() propagates a failing %s and stops', async (method, failing) => {
    actingAs('OWNER')
    mockedState.findById.mockResolvedValue(ok(stateIn('ws1')))
    mockedState.countByGroup.mockResolvedValue(ok(2))
    mockedState[failing].mockResolvedValue(boom as never)

    const error = expectErr(await writes[method](), 'DATABASE_ERROR')

    expect(error.message).toBe('boom')
    expect(mockedState.deleteMovingProjects).not.toHaveBeenCalled()
  })
})
