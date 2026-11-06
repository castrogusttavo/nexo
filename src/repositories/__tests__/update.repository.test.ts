import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  seedProjectUpdate,
  seedUpdateReaction,
  seedUpdateReply,
} from '@/src/__tests__/factories/update.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { UpdateRepository } from '../update.repository'

afterEach(() => {
  vi.resetAllMocks()
})

async function setup() {
  const author = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: author.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, author.id)
  return { author, ws, project }
}

async function seedIssueIn(projectId: string, authorId: string) {
  const state = await seedState(projectId)
  const type = await seedIssueType(projectId)
  return seedIssue({ stateId: state.id, typeId: type.id, authorId, projectId })
}

describe('UpdateRepository', () => {
  describe('findById()', () => {
    it('returns the update', async () => {
      const { project, author } = await setup()
      const seeded = await seedProjectUpdate(project.id, author.id)

      const update = expectOk(await UpdateRepository.findById(seeded.id))

      expect(update.id).toBe(seeded.id)
    })
    it('returns UPDATE_NOT_FOUND for an unknown id', async () => {
      expectErr(await UpdateRepository.findById('nope'), 'UPDATE_NOT_FOUND')
    })
  })

  describe('createForProject()', () => {
    it('creates an update of the project, with no issue, and returns its author', async () => {
      const { project, author } = await setup()

      const update = expectOk(
        await UpdateRepository.createForProject({
          projectId: project.id,
          authorId: author.id,
          status: 'AT_RISK',
          content: 'Atrasado',
        }),
      )

      expect(update).toMatchObject({
        projectId: project.id,
        issueId: null,
        status: 'AT_RISK',
        content: 'Atrasado',
        editedAt: null,
      })
      expect(update.author).toMatchObject({ id: author.id })
      expect(update.reactions).toEqual([])
      expect(update._count.replies).toBe(0)
    })

    it('stores no content, as null', async () => {
      const { project, author } = await setup()

      const update = expectOk(
        await UpdateRepository.createForProject({
          projectId: project.id,
          authorId: author.id,
          status: 'ON_TRACK',
        }),
      )

      expect(update.content).toBeNull()
    })
  })

  describe('listByProject()', () => {
    it('lists the newest first, with author, reaction rows and the reply count', async () => {
      const { project, author } = await setup()
      const other = await seedUser()
      const old = await seedProjectUpdate(project.id, author.id, {
        content: 'antigo',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      })
      const recent = await seedProjectUpdate(project.id, author.id, {
        content: 'recente',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      })
      await seedUpdateReply(recent.id, other.id)
      await seedUpdateReply(recent.id, author.id)
      await seedUpdateReaction(recent.id, other.id, '👍')
      await seedUpdateReaction(recent.id, author.id, '🎉')

      const { updates, nextCursor } = expectOk(
        await UpdateRepository.listByProject(project.id, { limit: 20 }),
      )

      expect(updates.map((u) => u.id)).toEqual([recent.id, old.id])
      expect(nextCursor).toBeNull()
      expect(updates[0].author).toMatchObject({ id: author.id })
      expect(updates[0]._count.replies).toBe(2)
      expect(updates[0].reactions).toHaveLength(2)
      expect(updates[0].reactions[0]).toEqual({
        emoji: '👍',
        userId: other.id,
      })
      expect(updates[1]._count.replies).toBe(0)
    })

    it('lists only the updates of that project', async () => {
      const { project, author, ws } = await setup()
      const otherProject = await seedProject(ws.id, author.id)
      await seedProjectUpdate(otherProject.id, author.id, { content: 'outro' })
      const mine = await seedProjectUpdate(project.id, author.id)

      const { updates } = expectOk(
        await UpdateRepository.listByProject(project.id, { limit: 30 }),
      )

      expect(updates.map((u) => u.id)).toEqual([mine.id])
    })

    it('pages with a cursor; no repeats, no gaps, null on the last page', async () => {
      const { project, author } = await setup()
      const base = Date.parse('2026-01-01T00:00:00Z')
      const rows = []
      for (let i = 0; i < 5; i++) {
        rows.push(
          await seedProjectUpdate(project.id, author.id, {
            content: `u${i}`,
            createdAt: new Date(base + i * 1000),
          }),
        )
      }

      const first = expectOk(
        await UpdateRepository.listByProject(project.id, { limit: 2 }),
      )
      const second = expectOk(
        await UpdateRepository.listByProject(project.id, {
          limit: 2,
          cursor: first.nextCursor ?? undefined,
        }),
      )
      const third = expectOk(
        await UpdateRepository.listByProject(project.id, {
          limit: 2,
          cursor: second.nextCursor ?? undefined,
        }),
      )

      expect(first.updates.map((u) => u.content)).toEqual(['u4', 'u3'])
      expect(first.nextCursor).toBe(rows[3].id)
      expect(second.updates.map((u) => u.content)).toEqual(['u2', 'u1'])
      expect(third.updates.map((u) => u.content)).toEqual(['u0'])
      expect(third.nextCursor).toBeNull()
    })

    it('has no next cursor when the page is exactly full and nothing follows', async () => {
      const { project, author } = await setup()
      await seedProjectUpdate(project.id, author.id)
      await seedProjectUpdate(project.id, author.id)

      const page = expectOk(
        await UpdateRepository.listByProject(project.id, { limit: 2 }),
      )

      expect(page.updates).toHaveLength(2)
      expect(page.nextCursor).toBeNull()
    })

    it('breaks a tie on createdAt by id, so a page boundary never loses a row', async () => {
      const { project, author } = await setup()
      const at = new Date('2026-01-01T00:00:00Z')
      for (let i = 0; i < 4; i++) {
        await seedProjectUpdate(project.id, author.id, { createdAt: at })
      }

      const first = expectOk(
        await UpdateRepository.listByProject(project.id, { limit: 2 }),
      )
      const second = expectOk(
        await UpdateRepository.listByProject(project.id, {
          limit: 2,
          cursor: first.nextCursor ?? undefined,
        }),
      )

      const ids = [...first.updates, ...second.updates].map((u) => u.id)
      expect(new Set(ids).size).toBe(4)
    })
  })

  describe('update()', () => {
    it('changes status and content and stamps editedAt', async () => {
      const { project, author } = await setup()
      const seeded = await seedProjectUpdate(project.id, author.id)

      const update = expectOk(
        await UpdateRepository.update(seeded.id, {
          status: 'OFF_TRACK',
          content: 'Parou',
        }),
      )

      expect(update).toMatchObject({ status: 'OFF_TRACK', content: 'Parou' })
      expect(update.editedAt).not.toBeNull()
    })

    it('returns UPDATE_NOT_FOUND for an unknown id', async () => {
      expectErr(
        await UpdateRepository.update('nope', { status: 'ON_TRACK' }),
        'UPDATE_NOT_FOUND',
      )
    })
  })

  describe('delete()', () => {
    it('deletes the update with its replies and reactions', async () => {
      const { project, author } = await setup()
      const seeded = await seedProjectUpdate(project.id, author.id)
      await seedUpdateReply(seeded.id, author.id)
      await seedUpdateReaction(seeded.id, author.id)

      expectOk(await UpdateRepository.delete(seeded.id))

      expect(await prisma.update.count()).toBe(0)
      expect(await prisma.updateReply.count()).toBe(0)
      expect(await prisma.updateReaction.count()).toBe(0)
    })

    it('returns UPDATE_NOT_FOUND for an unknown id', async () => {
      expectErr(await UpdateRepository.delete('nope'), 'UPDATE_NOT_FOUND')
    })
  })

  describe('what the database guarantees', () => {
    it('refuses an update that belongs to nothing', async () => {
      const { author } = await setup()

      await expect(
        prisma.update.create({
          data: { status: 'ON_TRACK', authorId: author.id },
        }),
      ).rejects.toThrow()
    })

    it('refuses an update that belongs to a project and an issue', async () => {
      const { project, author } = await setup()
      const issue = await seedIssueIn(project.id, author.id)

      await expect(
        prisma.update.create({
          data: {
            status: 'ON_TRACK',
            projectId: project.id,
            issueId: issue.id,
            authorId: author.id,
          },
        }),
      ).rejects.toThrow()
    })

    it('removes the updates when the project goes', async () => {
      const { project, author } = await setup()
      await seedProjectUpdate(project.id, author.id)

      await prisma.project.delete({ where: { id: project.id } })

      expect(await prisma.update.count()).toBe(0)
    })

    it('keeps the update but forgets the author when the user goes', async () => {
      const { project } = await setup()
      const leaving = await seedUser()
      const seeded = await seedProjectUpdate(project.id, leaving.id)

      await prisma.user.delete({ where: { id: leaving.id } })

      const kept = await prisma.update.findUniqueOrThrow({
        where: { id: seeded.id },
      })
      expect(kept.authorId).toBeNull()
    })
  })
})
