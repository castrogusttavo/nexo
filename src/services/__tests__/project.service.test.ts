import type { ProjectMember } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { createFakeProjectState } from '@/src/__tests__/factories/project-state.factory'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, projectStateNotFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ProjectLabelRepository } from '@/src/repositories/project-label.repository'
import { ProjectStateRepository } from '@/src/repositories/project-state.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import { ProjectService } from '../project.service'
import {
  describeProjectAccessGate,
  GATE_PROJECT_ID,
} from './_project-access-gate'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/project-state.repository')
vi.mock('@/src/repositories/workspace.repository')
vi.mock('@/src/repositories/project-label.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedProjectState = vi.mocked(ProjectStateRepository)
const mockedWorkspace = vi.mocked(WorkspaceRepository)
const mockedProjectLabel = vi.mocked(ProjectLabelRepository)

const ownerMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'OWNER',
})
const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

describe('ProjectService', () => {
  describe('list()', () => {
    it('should return projects as DTOs for workspace member', async () => {
      const projects = [
        {
          ...createFakeProject({ workspaceId: 'ws1' }),
          members: [] as [],
          favourites: [] as [],
        },
      ]
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.listByWorkspace.mockResolvedValue(ok(projects))

      const result = await ProjectService.list('actor', 'ws1', {
        archived: false,
      })

      const dtos = expectOk(result)
      expect(dtos).toHaveLength(1)
      expect(mockedProject.listByWorkspace).toHaveBeenCalledWith(
        'ws1',
        'actor',
        false,
        { archived: false },
      )
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await ProjectService.list('actor', 'ws1', {
        archived: false,
      })

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate membership repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.list('actor', 'ws1', {
        archived: false,
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate listByWorkspace repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.listByWorkspace.mockResolvedValue(err(databaseError()))

      const result = await ProjectService.list('actor', 'ws1', {
        archived: false,
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('getBySlug()', () => {
    it('should return public project to any workspace member', async () => {
      const project = createFakeProject({
        isPublic: true,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.getBySlug(
        'actor',
        'ws1',
        project.slug,
      )

      expectOk(result)
    })

    it('should return PROJECT_FORBIDDEN for private project when actor is not a member', async () => {
      const project = createFakeProject({
        isPublic: false,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.getBySlug(
        'actor',
        'ws1',
        project.slug,
      )

      expectErr(result, 'PROJECT_FORBIDDEN')
    })

    it('should return private project to its lead', async () => {
      const project = createFakeProject({
        isPublic: false,
        workspaceId: 'ws1',
        leadId: 'actor',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.getBySlug(
        'actor',
        'ws1',
        project.slug,
      )

      expectOk(result)
    })

    it('should return private project to OWNER regardless of membership', async () => {
      const project = createFakeProject({
        isPublic: false,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.getBySlug(
        'actor',
        'ws1',
        project.slug,
      )

      expectOk(result)
    })

    it('should return private project to a project member', async () => {
      const project = createFakeProject({
        isPublic: false,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({
          ...project,
          members: [{ userId: 'actor' }] as ProjectMember[],
          favourites: [] as [],
        }),
      )

      const result = await ProjectService.getBySlug(
        'actor',
        'ws1',
        project.slug,
      )

      expectOk(result)
    })

    it('should propagate membership repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.getBySlug('actor', 'ws1', 'any-slug')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate findByWorkspaceAndSlug error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.getBySlug('actor', 'ws1', 'any-slug')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('create()', () => {
    it('should create project with actor as lead', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.create.mockResolvedValue(ok(project))

      const result = await ProjectService.create('actor', 'ws1', {
        name: 'New Project',
        slug: 'new-project',
        isPublic: false,
        issueTypesEnabled: true,
        modulesEnabled: true,
        cyclesEnabled: true,
        estimatesEnabled: true,
      })

      const dto = expectOk(result)
      expect(dto.leadId).toBe('actor')
      expect(mockedProject.create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: 'actor', workspaceId: 'ws1' }),
      )
    })

    it('should derive the identifier from the name: uppercase, alphanumeric, 6 chars', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.create.mockResolvedValue(
        ok(createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })),
      )

      await ProjectService.create('actor', 'ws1', {
        name: 'New Project 2!',
        slug: 'new-project',
        isPublic: false,
        issueTypesEnabled: true,
        modulesEnabled: true,
        cyclesEnabled: true,
        estimatesEnabled: true,
      })

      expect(mockedProject.create).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'NEWPRO' }),
      )
    })

    it('should pad a too-short derived identifier to two characters', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.create.mockResolvedValue(
        ok(createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })),
      )

      await ProjectService.create('actor', 'ws1', {
        name: 'Q *',
        slug: 'q',
        isPublic: false,
        issueTypesEnabled: true,
        modulesEnabled: true,
        cyclesEnabled: true,
        estimatesEnabled: true,
      })

      expect(mockedProject.create).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'QX' }),
      )
    })

    it('should retry with a numbered identifier when the derived one is taken', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.create
        .mockResolvedValueOnce(
          err({
            code: 'PROJECT_IDENTIFIER_CONFLICT',
            message: 'taken',
          }),
        )
        .mockResolvedValueOnce(
          ok(createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })),
        )

      const result = await ProjectService.create('actor', 'ws1', {
        name: 'New Project',
        slug: 'new-project',
        isPublic: false,
        issueTypesEnabled: true,
        modulesEnabled: true,
        cyclesEnabled: true,
        estimatesEnabled: true,
      })

      expectOk(result)
      expect(mockedProject.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ identifier: 'NEWPRO' }),
      )
      expect(mockedProject.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ identifier: 'NEWPRO2' }),
      )
    })

    it('should keep a caller-provided identifier instead of deriving one', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.create.mockResolvedValue(
        ok(createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })),
      )

      await ProjectService.create('actor', 'ws1', {
        name: 'New Project',
        slug: 'new-project',
        identifier: 'CUSTOM',
        isPublic: false,
        issueTypesEnabled: true,
        modulesEnabled: true,
        cyclesEnabled: true,
        estimatesEnabled: true,
      })

      expect(mockedProject.create).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'CUSTOM' }),
      )
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await ProjectService.create('actor', 'ws1', {
        name: 'New Project',
        slug: 'new-project',
        isPublic: false,
        issueTypesEnabled: true,
        modulesEnabled: true,
        cyclesEnabled: true,
        estimatesEnabled: true,
      })
      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate membership repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.create('actor', 'ws1', {
        name: 'New Project',
        slug: 'new-project',
        isPublic: false,
        issueTypesEnabled: true,
        modulesEnabled: true,
        cyclesEnabled: true,
        estimatesEnabled: true,
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedProject.create).not.toHaveBeenCalled()
    })

    it('should audit failure and propagate create repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.create.mockResolvedValue(err(databaseError()))

      const result = await ProjectService.create('actor', 'ws1', {
        name: 'New Project',
        slug: 'new-project',
        isPublic: false,
        issueTypesEnabled: true,
        modulesEnabled: true,
        cyclesEnabled: true,
        estimatesEnabled: true,
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should allow lead to update project', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      const updated = { ...project, name: 'Updated' }
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.update.mockResolvedValue(ok(updated))

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        name: 'Updated',
      })

      const dto = expectOk(result)
      expect(dto.name).toBe('Updated')
      expect(dto.leadId).toBe('actor')
    })

    it('should return PROJECT_FORBIDDEN when non-lead MEMBER tries to update', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        name: 'Hack',
      })

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedProject.update).not.toHaveBeenCalled()
    })

    it('should allow OWNER to update any project', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.update.mockResolvedValue(ok(project))

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        name: 'Fixed',
      })

      expectOk(result)
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        name: 'X',
      })

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate membership repository error', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        name: 'X',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate findByWorkspaceAndSlug error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.update('actor', 'ws1', 'slug', {
        name: 'X',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should audit failure and propagate update repository error', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.update.mockResolvedValue(err(databaseError()))

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        name: 'X',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update() stateId', () => {
    const project = createFakeProject({
      id: 'proj-1',
      leadId: 'actor',
      workspaceId: 'ws1',
    })

    function asLeadOf(workspace = createFakeWorkspace({ id: 'ws1' })) {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedWorkspace.findById.mockResolvedValue(ok(workspace))
    }

    it('should move the project to a staet of its workspace', async () => {
      asLeadOf()
      mockedProjectState.findById.mockResolvedValue(
        ok(createFakeProjectState({ id: 'pstate-2', workspaceId: 'ws1' })),
      )
      mockedProject.update.mockResolvedValue(
        ok({ ...project, stateId: 'pstate-2' }),
      )

      const dto = expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          stateId: 'pstate-2',
        }),
      )

      expect(dto.stateId).toBe('pstate-2')
      expect(mockedProject.update).toHaveBeenCalledWith('proj-1', {
        stateId: 'pstate-2',
      })
    })

    it('should return PROJECT_STATES_DISABLED when the workspace switched them off', async () => {
      asLeadOf(createFakeWorkspace({ id: 'ws1', projectStatesEnabled: false }))

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        stateId: 'pstate-2',
      })

      expectErr(result, 'PROJECT_STATES_DISABLED')
      expect(mockedProject.update).not.toHaveBeenCalled()
    })

    it('should return PROJECT_STATE_INVALID for a state of another workspace', async () => {
      asLeadOf()
      mockedProjectState.findById.mockResolvedValue(
        ok(createFakeProjectState({ id: 'pstate-9', workspaceId: 'ws2' })),
      )

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        stateId: 'pstate-9',
      })

      expectErr(result, 'PROJECT_STATE_INVALID')
      expect(mockedProject.update).not.toHaveBeenCalled()
    })

    it('should return PROJECT_STATE_INVALID for a state that does not exist', async () => {
      asLeadOf()
      mockedProjectState.findById.mockResolvedValue(err(projectStateNotFound()))

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        stateId: 'pstate-9',
      })

      expectErr(result, 'PROJECT_STATE_INVALID')
    })

    it('should propagate a database error from the state lookup', async () => {
      asLeadOf()
      mockedProjectState.findById.mockResolvedValue(err(databaseError('boom')))

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        stateId: 'pstate-9',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should check permisson before looking the state up', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, leadId: 'other', members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        stateId: 'pstate-2',
      })

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedProjectState.findById).not.toHaveBeenCalled()
    })

    it('should not look the workspace or a setup up when stateId is absent', async () => {
      asLeadOf()
      mockedProject.update.mockResolvedValue(
        ok({ ...project, name: 'Renomeado' }),
      )

      expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          name: 'Renomeado',
        }),
      )

      expect(mockedWorkspace.findById).not.toHaveBeenCalled()
      expect(mockedProjectState.findById).not.toHaveBeenCalled()
    })
  })

  describe('update() priority and dates', () => {
    function asLeadOf(stored: {
      startDate?: Date | null
      dueDate?: Date | null
    }) {
      const project = createFakeProject({
        id: 'proj-1',
        leadId: 'actor',
        workspaceId: 'ws1',
        startDate: stored.startDate ?? null,
        dueDate: stored.dueDate ?? null,
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.update.mockResolvedValue(ok(project))
      return project
    }

    it('should pass the priority and the dates as Date to the repository', async () => {
      const project = asLeadOf({})

      expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          priority: 'HIGH',
          startDate: '2026-10-01T00:00:00.000Z',
          dueDate: '2026-12-31T00:00:00-03:00',
        }),
      )

      expect(mockedProject.update).toHaveBeenCalledWith('proj-1', {
        priority: 'HIGH',
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        dueDate: new Date('2026-12-31T03:00:00.000Z'),
      })
    })

    it('should pass null through to clear a date', async () => {
      const project = asLeadOf({
        dueDate: new Date('2026-12-31T00:00:00.000Z'),
      })

      expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          dueDate: null,
        }),
      )

      expect(mockedProject.update).toHaveBeenCalledWith('proj-1', {
        dueDate: null,
      })
    })

    it('should refuse a lone due date before the stored start date', async () => {
      const project = asLeadOf({
        startDate: new Date('2026-10-10T00:00:00.000Z'),
      })

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        dueDate: '2026-10-01T00:00:00.000Z',
      })

      expectErr(result, 'PROJECT_DATE_RANGE_INVALID')
      expect(mockedProject.update).not.toHaveBeenCalled()
    })

    it('should refuse a lone start date after the stored due date', async () => {
      const project = asLeadOf({
        dueDate: new Date('2026-10-01T00:00:00.000Z'),
      })

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        startDate: '2026-10-10T00:00:00.000Z',
      })

      expectErr(result, 'PROJECT_DATE_RANGE_INVALID')
    })

    it('should accept a lone date once the stored one is being cleared', async () => {
      const project = asLeadOf({
        startDate: new Date('2026-10-10T00:00:00.000Z'),
      })

      expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          startDate: null,
          dueDate: '2026-10-01T00:00:00.000Z',
        }),
      )
    })

    it('should not look at dates for an update without them', async () => {
      const project = asLeadOf({
        startDate: new Date('2026-10-10T00:00:00.000Z'),
        dueDate: new Date('2026-10-01T00:00:00.000Z'),
      })

      // Stored data that already breaks the rule must not block other edits.
      expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          priority: 'LOW',
        }),
      )
    })
  })

  describe('update() labelIds', () => {
    const project = createFakeProject({
      id: 'proj-1',
      leadId: 'actor',
      workspaceId: 'ws1',
    })

    function asLeadOf(workspace = createFakeWorkspace({ id: 'ws1' })) {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedWorkspace.findById.mockResolvedValue(ok(workspace))
    }

    it('should set the labels of the workspace on the project', async () => {
      asLeadOf()
      mockedProjectLabel.countInWorkspace.mockResolvedValue(ok(2))
      mockedProject.update.mockResolvedValue(
        ok({
          ...project,
          labelAssignments: [{ labelId: 'plabel-1' }, { labelId: 'plabel-2' }],
        }),
      )

      const dto = expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          labelIds: ['plabel-1', 'plabel-2'],
        }),
      )

      expect(dto.labelIds).toEqual(['plabel-1', 'plabel-2'])
      expect(mockedProjectLabel.countInWorkspace).toHaveBeenCalledWith('ws1', [
        'plabel-1',
        'plabel-2',
      ])
    })

    it('should drop repeated ids before counting and saving', async () => {
      asLeadOf()
      mockedProjectLabel.countInWorkspace.mockResolvedValue(ok(1))
      mockedProject.update.mockResolvedValue(ok(project))

      expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          labelIds: ['plabel-1', 'plabel-1'],
        }),
      )

      expect(mockedProjectLabel.countInWorkspace).toHaveBeenCalledWith('ws1', [
        'plabel-1',
      ])
      expect(mockedProject.update).toHaveBeenCalledWith('proj-1', {
        labelIds: ['plabel-1'],
      })
    })

    it('should clear the labels without counting for an empty set', async () => {
      asLeadOf()
      mockedProject.update.mockResolvedValue(ok(project))

      expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          labelIds: [],
        }),
      )

      expect(mockedProjectLabel.countInWorkspace).not.toHaveBeenCalled()
      expect(mockedProject.update).toHaveBeenCalledWith('proj-1', {
        labelIds: [],
      })
    })

    it('should return PROJECT_LABEL_INVALID when an id is missing or foreign', async () => {
      asLeadOf()
      mockedProjectLabel.countInWorkspace.mockResolvedValue(ok(1))

      const result = await ProjectService.update(
        'actor',
        'ws1',
        'project.slug',
        {
          labelIds: ['plabel-1', 'plabel-2l'],
        },
      )

      expectErr(result, 'PROJECT_LABEL_INVALID')
      expect(mockedProject.update).not.toHaveBeenCalled()
    })

    it('should return PROJECT_LABELS_DISABLED while the workspace switch is off, even to clear', async () => {
      asLeadOf(createFakeWorkspace({ id: 'ws1', projectLabelsEnabled: false }))

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        labelIds: [],
      })

      expectErr(result, 'PROJECT_LABELS_DISABLED')
      expect(mockedProject.update).not.toHaveBeenCalled()
    })

    it('should propagate a database error from the count', async () => {
      asLeadOf()
      mockedProjectLabel.countInWorkspace.mockResolvedValue(
        err(databaseError('boom')),
      )

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        labelIds: ['plabel-1'],
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should check permission before looking the labels up', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, leadId: 'other', members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        labelIds: ['plabel-1'],
      })

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedProjectLabel.countInWorkspace).not.toHaveBeenCalled()
    })

    it('should read the workspace once for a state and labels together', async () => {
      asLeadOf()
      mockedProjectState.findById.mockResolvedValue(
        ok(createFakeProjectState({ id: 'pstate-2', workspaceId: 'ws1' })),
      )
      mockedProjectLabel.countInWorkspace.mockResolvedValue(ok(1))
      mockedProject.update.mockResolvedValue(ok(project))

      expectOk(
        await ProjectService.update('actor', 'ws1', project.slug, {
          stateId: 'pstate-2',
          labelIds: ['plabel-1'],
        }),
      )

      expect(mockedWorkspace.findById).toHaveBeenCalledTimes(1)
    })
  })

  describe('archive()', () => {
    it('should archive when actor is lead', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      const archived = { ...project, archivedAt: new Date() }
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.archive.mockResolvedValue(ok(archived))

      const result = await ProjectService.archive('actor', 'ws1', project.slug)

      const dto = expectOk(result)
      expect(dto.archivedAt).not.toBeNull()
    })

    it('should return PROJECT_FORBIDDEN for non-lead MEMBER', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.archive.mockResolvedValue(ok(project))

      const result = await ProjectService.archive('actor', 'ws1', project.slug)

      expectErr(result, 'PROJECT_FORBIDDEN')
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.archive('actor', 'ws1', project.slug)

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate membership repository error', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.archive('actor', 'ws1', project.slug)

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate findByWorkspaceAndSlug error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.archive('actor', 'ws1', 'slug')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate archive repository error', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.archive.mockResolvedValue(err(databaseError()))

      const result = await ProjectService.archive('actor', 'ws1', project.slug)

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('restore()', () => {
    it('should restore when actor is lead', async () => {
      const project = createFakeProject({
        leadId: 'actor',
        workspaceId: 'ws1',
        archivedAt: new Date(),
      })
      const restored = { ...project, archivedAt: null }
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.restore.mockResolvedValue(ok(restored))

      const result = await ProjectService.restore('actor', 'ws1', project.slug)

      const dto = expectOk(result)
      expect(dto.archivedAt).toBeNull()
    })

    it('should return PROJECT_FORBIDDEN for non-lead MEMBER', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.restore('actor', 'ws1', project.slug)

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedProject.restore).not.toHaveBeenCalled()
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.restore('actor', 'ws1', project.slug)

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate membership repository error', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.restore('actor', 'ws1', project.slug)

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate findByWorkspaceAndSlug error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.restore('actor', 'ws1', 'slug')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate restore repository error', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.restore.mockResolvedValue(err(databaseError()))

      const result = await ProjectService.restore('actor', 'ws1', project.slug)

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('delete()', () => {
    it('should allow OWNER to hard-delete', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.delete.mockResolvedValue(ok(undefined))

      const result = await ProjectService.delete('actor', 'ws1', project.slug)

      expectOk(result)
    })

    it('should return PROJECT_FORBIDDEN for non-OWNER', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.delete.mockResolvedValue(ok(undefined))

      const result = await ProjectService.delete('actor', 'ws1', project.slug)

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedProject.delete).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.delete.mockResolvedValue(err(databaseError()))

      const result = await ProjectService.delete('actor', 'ws1', project.slug)

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.delete('actor', 'ws1', project.slug)

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate membership repository error', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.delete('actor', 'ws1', project.slug)

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate findByWorkspaceAndSlug error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.delete('actor', 'ws1', 'slug')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('favorite()', () => {
    it('should favorite a public project for any workspace member', async () => {
      const project = createFakeProject({
        isPublic: true,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      mockedProject.addFavorite.mockResolvedValue(ok(undefined))

      const result = await ProjectService.favorite('actor', 'ws1', project.slug)

      const value = expectOk(result)
      expect(value.favorited).toBe(true)
      expect(mockedProject.addFavorite).toHaveBeenCalledWith(
        'actor',
        project.id,
      )
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await ProjectService.favorite('actor', 'ws1', 'any-slug')

      expectErr(result, 'FORBIDDEN')
      expect(mockedProject.addFavorite).not.toHaveBeenCalled()
    })

    it('should return PROJECT_FORBIDDEN when a non-member targets a private project', async () => {
      const project = createFakeProject({
        isPublic: false,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.favorite('actor', 'ws1', project.slug)

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedProject.addFavorite).not.toHaveBeenCalled()
    })

    it('should propagate addFavorite repository error', async () => {
      const project = createFakeProject({
        isPublic: true,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      mockedProject.addFavorite.mockResolvedValue(err(databaseError()))

      const result = await ProjectService.favorite('actor', 'ws1', project.slug)

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should favorite a private project for a project member', async () => {
      const project = createFakeProject({
        isPublic: false,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({
          ...project,
          members: [{ userId: 'actor' }] as ProjectMember[],
          favourites: [] as [],
        }),
      )
      mockedProject.addFavorite.mockResolvedValue(ok(undefined))

      const result = await ProjectService.favorite('actor', 'ws1', project.slug)

      expectOk(result)
    })

    it('should propagate membership repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.favorite('actor', 'ws1', 'slug')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate findByWorkspaceAndSlug error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.favorite('actor', 'ws1', 'slug')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('unfavorite()', () => {
    it('should unfavorite a project for a workspace member', async () => {
      const project = createFakeProject({ workspaceId: 'ws1', leadId: 'actor' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.removeFavorite.mockResolvedValue(ok(undefined))

      const result = await ProjectService.unfavorite(
        'actor',
        'ws1',
        project.slug,
      )

      const value = expectOk(result)
      expect(value.favorited).toBe(false)
      expect(mockedProject.removeFavorite).toHaveBeenCalledWith(
        'actor',
        project.id,
      )
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await ProjectService.unfavorite('actor', 'ws1', 'any-slug')

      expectErr(result, 'FORBIDDEN')
      expect(mockedProject.removeFavorite).not.toHaveBeenCalled()
    })

    it('should propagate removeFavorite repository error', async () => {
      const project = createFakeProject({ workspaceId: 'ws1', leadId: 'actor' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.removeFavorite.mockResolvedValue(err(databaseError()))

      const result = await ProjectService.unfavorite(
        'actor',
        'ws1',
        project.slug,
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate membership repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.unfavorite('actor', 'ws1', 'slug')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate findByWorkspaceAndSlug error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        err(databaseError()),
      )

      const result = await ProjectService.unfavorite('actor', 'ws1', 'slug')

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})

describeProjectAccessGate('ProjectService', [
  {
    name: 'getBySlug()',
    grants: 'member',
    publicGrants: true,
    forbiddenCode: 'PROJECT_FORBIDDEN',
    arrange: arrangeProjectRoundTrip,
    call: (actorId) => ProjectService.getBySlug(actorId, 'ws1', 'proj-slug'),
  },
  {
    name: 'listMembers()',
    grants: 'member',
    publicGrants: true,
    forbiddenCode: 'PROJECT_FORBIDDEN',
    arrange: arrangeProjectRoundTrip,
    call: (actorId) => ProjectService.listMembers(actorId, 'ws1', 'proj-slug'),
    sideEffects: () => [mockedProject.listMembers],
  },
  {
    name: 'favorite()',
    grants: 'member',
    publicGrants: true,
    forbiddenCode: 'PROJECT_FORBIDDEN',
    arrange: arrangeProjectRoundTrip,
    call: (actorId) => ProjectService.favorite(actorId, 'ws1', 'proj-slug'),
    sideEffects: () => [mockedProject.addFavorite],
  },
  {
    name: 'unfavorite()',
    grants: 'member',
    publicGrants: true,
    forbiddenCode: 'PROJECT_FORBIDDEN',
    arrange: arrangeProjectRoundTrip,
    call: (actorId) => ProjectService.unfavorite(actorId, 'ws1', 'proj-slug'),
    sideEffects: () => [mockedProject.removeFavorite],
  },
  {
    name: 'addMember()',
    grants: 'lead',
    forbiddenCode: 'PROJECT_FORBIDDEN',
    arrange: arrangeProjectRoundTrip,
    call: (actorId) =>
      ProjectService.addMember(actorId, 'ws1', 'proj-slug', 'target-user'),
    sideEffects: () => [mockedProject.addMember],
  },
  {
    name: 'removeMember()',
    grants: 'lead',
    forbiddenCode: 'PROJECT_FORBIDDEN',
    arrange: arrangeProjectRoundTrip,
    call: (actorId) =>
      ProjectService.removeMember(actorId, 'ws1', 'proj-slug', 'target-user'),
    sideEffects: () => [mockedProject.removeMember],
  },
  {
    name: 'update()',
    grants: 'lead',
    forbiddenCode: 'PROJECT_FORBIDDEN',
    arrange: arrangeProjectRoundTrip,
    call: (actorId) =>
      ProjectService.update(actorId, 'ws1', 'proj-slug', { name: 'Renamed' }),
    sideEffects: () => [mockedProject.update],
  },
])

function arrangeProjectRoundTrip() {
  const targetMember = {
    id: 'pm-1',
    userId: 'target-user',
    projectId: GATE_PROJECT_ID,
    createdAt: new Date(),
    user: {
      id: 'target-user',
      name: 'Bia',
      username: 'bia',
      image: null,
      email: 'bia@example.com',
    },
  }
  mockedProject.listMembers.mockResolvedValue(ok([targetMember]))
  mockedProject.addMember.mockResolvedValue(ok(targetMember))
  mockedProject.removeMember.mockResolvedValue(ok(undefined))
  mockedProject.addFavorite.mockResolvedValue(ok(undefined))
  mockedProject.removeFavorite.mockResolvedValue(ok(undefined))
  mockedProject.update.mockResolvedValue(
    ok(createFakeProject({ id: GATE_PROJECT_ID, name: 'Renamed' })),
  )
}

describe('ProjectService error propagation', () => {
  const boom = err(databaseError('boom'))

  function arrangeOwnerOfProject(members: { userId: string }[] = []) {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok({
        ...createFakeProject({
          id: GATE_PROJECT_ID,
          leadId: 'lead-1',
          workspaceId: 'ws1',
        }),
        members,
        favourites: [] as [],
      }),
    )
    arrangeProjectRoundTrip()
  }

  const calls = {
    getBySlug: () => ProjectService.getBySlug('actor', 'ws1', 'proj-slug'),
    listMembers: () => ProjectService.listMembers('actor', 'ws1', 'proj-slug'),
    addMember: () =>
      ProjectService.addMember('actor', 'ws1', 'proj-slug', 'target-user'),
    removeMember: () =>
      ProjectService.removeMember('actor', 'ws1', 'proj-slug', 'target-user'),
  }

  it.each(
    Object.entries(calls),
  )('%s() propagates a failing project lookup and stops', async (_, call) => {
    arrangeOwnerOfProject()
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(boom)

    expect(expectErr(await call(), 'DATABASE_ERROR').message).toBe('boom')
    expect(mockedProject.listMembers).not.toHaveBeenCalled()
    expect(mockedProject.addMember).not.toHaveBeenCalled()
    expect(mockedProject.removeMember).not.toHaveBeenCalled()
  })

  it.each([
    'addMember',
    'removeMember',
  ] as const)('%s() propagates a failing membership lookup and stops', async (method) => {
    arrangeOwnerOfProject()
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(boom)

    expectErr(await calls[method](), 'DATABASE_ERROR')
    expect(mockedProject.findByWorkspaceAndSlug).not.toHaveBeenCalled()
  })

  it.each([
    ['listMembers', 'listMembers'],
    ['addMember', 'addMember'],
    ['removeMember', 'removeMember'],
  ] as const)('%s() propagates a failing %s write', async (method, failing) => {
    arrangeOwnerOfProject()
    mockedProject[failing].mockResolvedValue(boom as never)

    expect(expectErr(await calls[method](), 'DATABASE_ERROR').message).toBe(
      'boom',
    )
  })

  it('addMember() refuses a target outside the workspace without writing', async () => {
    arrangeOwnerOfProject()
    mockedMembership.findByUserAndWorkspace.mockImplementation(
      async (userId) => (userId === 'actor' ? ok(ownerMembership) : ok(null)),
    )

    expectErr(await calls.addMember(), 'PROJECT_MEMBER_NOT_IN_WORKSPACE')
    expect(mockedProject.addMember).not.toHaveBeenCalled()
  })

  it('removeMember() refuses to remove the project lead', async () => {
    arrangeOwnerOfProject()

    const error = expectErr(
      await ProjectService.removeMember('actor', 'ws1', 'proj-slug', 'lead-1'),
      'PROJECT_FORBIDDEN',
    )

    expect(error.message).toBe('Não é possível remover o lead do projeto')
    expect(mockedProject.removeMember).not.toHaveBeenCalled()
  })

  it('update() refuses a new lead who is not a project member', async () => {
    arrangeOwnerOfProject([{ userId: 'member-1' }])

    expectErr(
      await ProjectService.update('actor', 'ws1', 'proj-slug', {
        leadId: 'stranger',
      }),
      'PROJECT_MEMBER_NOT_FOUND',
    )
    expect(mockedProject.update).not.toHaveBeenCalled()
  })

  it('update() hands the lead to a project member', async () => {
    arrangeOwnerOfProject([{ userId: 'member-1' }])

    expectOk(
      await ProjectService.update('actor', 'ws1', 'proj-slug', {
        leadId: 'member-1',
      }),
    )
    expect(mockedProject.update).toHaveBeenCalledWith(
      GATE_PROJECT_ID,
      expect.objectContaining({ leadId: 'member-1' }),
    )
  })

  it('update() propagates a failing workspace lookup before touching the state', async () => {
    arrangeOwnerOfProject()
    mockedWorkspace.findById.mockResolvedValue(boom)

    expectErr(
      await ProjectService.update('actor', 'ws1', 'proj-slug', {
        stateId: 'pstate-1',
      }),
      'DATABASE_ERROR',
    )
    expect(mockedProjectState.findById).not.toHaveBeenCalled()
    expect(mockedProject.update).not.toHaveBeenCalled()
  })
})
