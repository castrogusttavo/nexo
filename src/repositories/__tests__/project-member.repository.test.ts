import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import {
  seedProject,
  seedProjectMember,
} from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { ProjectRepository } from '@/src/repositories/project.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function seedProjectWithLead() {
  const [lead, ws] = await Promise.all([
    seedUser({ email: `lead-${Date.now()}@example.com` }),
    seedWorkspace(),
  ])
  await seedMembership({ userId: lead.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, lead.id)
  return { lead, ws, project }
}

describe('ProjectRepository - members', () => {
  describe('addMember()', () => {
    it('should add a member and return the user projection', async () => {
      const { ws, project } = await seedProjectWithLead()
      const target = await seedUser({ email: 'target@example.com' })
      await seedMembership({ userId: target.id, workspaceId: ws.id })

      const member = expectOk(
        await ProjectRepository.addMember(target.id, project.id),
      )

      expect(member.userId).toBe(target.id)
      expect(member.user.username).toBe(target.username)
    })

    it('should return PROJECT_MEMBER_ALREADY_EXISTS on duplicate', async () => {
      const { project } = await seedProjectWithLead()
      const target = await seedUser({ email: 'dup@example.com' })
      await seedProjectMember({ userId: target.id, projectId: project.id })

      const result = await ProjectRepository.addMember(target.id, project.id)

      expectErr(result, 'PROJECT_MEMBER_ALREADY_EXISTS')
    })
  })

  describe('listMembers()', () => {
    it('should list members ordered by creation with user info', async () => {
      const { lead, project } = await seedProjectWithLead()
      await seedProjectMember({ userId: lead.id, projectId: project.id })

      const members = expectOk(await ProjectRepository.listMembers(project.id))

      expect(members).toHaveLength(1)
      expect(members[0].user.id).toBe(lead.id)
    })
  })

  describe('removeMember()', () => {
    it('should remove an existing member', async () => {
      const { project } = await seedProjectWithLead()
      const target = await seedUser({ email: 'rm@example.com' })
      await seedProjectMember({ userId: target.id, projectId: project.id })

      expectOk(await ProjectRepository.removeMember(target.id, project.id))
      const after = await ProjectRepository.listMembers(project.id)
      expect(expectOk(after)).toHaveLength(0)
    })

    it('should return PROJECT_MEMBER_NOT_FOUND when nothing was removed', async () => {
      const { project } = await seedProjectWithLead()

      const result = await ProjectRepository.removeMember('ghost', project.id)

      expectErr(result, 'PROJECT_MEMBER_NOT_FOUND')
    })
  })
})
