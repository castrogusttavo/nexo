import { describe, expect, it } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { ProjectAttachmentRepository } from '../project-attachment.repository'
import { ProjectLinkRepository } from '../project-link.repository'
import { ProjectReactionRepository } from '../project-reaction.repository'

async function setup() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, user.id)
  return { user, project }
}

describe('ProjectReactionRepository', () => {
  it('should add idempotently and list the rows', async () => {
    const { user, project } = await setup()
    const key = { projectId: project.id, userId: user.id, emoji: '👍' }

    expectOk(await ProjectReactionRepository.add(key))
    expectOk(await ProjectReactionRepository.add(key))

    const rows = expectOk(
      await ProjectReactionRepository.listByProject(project.id),
    )
    expect(rows).toHaveLength(1)
  })

  it('should remove idempotently', async () => {
    const { user, project } = await setup()
    const key = { projectId: project.id, userId: user.id, emoji: '👍' }
    expectOk(await ProjectReactionRepository.add(key))

    expectOk(await ProjectReactionRepository.remove(key))
    expectOk(await ProjectReactionRepository.remove(key))

    const rows = expectOk(
      await ProjectReactionRepository.listByProject(project.id),
    )
    expect(rows).toHaveLength(0)
  })
})

describe('ProjectLinkRepository', () => {
  it('should create, list oldest first and count', async () => {
    const { user, project } = await setup()
    for (const url of ['https://a.com', 'https://b.com']) {
      expectOk(
        await ProjectLinkRepository.create({
          projectId: project.id,
          url,
          title: 'A',
          createdById: user.id,
        }),
      )
    }

    const list = expectOk(await ProjectLinkRepository.listByProject(project.id))
    expect(list.map((l) => l.url)).toEqual(['https://a.com', 'https://b.com'])
    expect(
      expectOk(await ProjectLinkRepository.countByProject(project.id)),
    ).toBe(2)
  })

  it('should update the url and clear the title', async () => {
    const { user, project } = await setup()
    const link = expectOk(
      await ProjectLinkRepository.create({
        projectId: project.id,
        url: 'https://a.com',
        title: 'A',
        createdById: user.id,
      }),
    )

    const updated = expectOk(
      await ProjectLinkRepository.update(link.id, {
        url: 'https://c.com',
        title: null,
      }),
    )

    expect(updated.url).toBe('https://c.com')
    expect(updated.title).toBeNull()
  })

  it('should return PROJECT_LINK_NOT_FOUND for an unknown id', async () => {
    expect(expectErr(await ProjectLinkRepository.findById('nope')).code).toBe(
      'PROJECT_LINK_NOT_FOUND',
    )
    expect(
      expectErr(await ProjectLinkRepository.update('nope', { title: 'x' }))
        .code,
    ).toBe('PROJECT_LINK_NOT_FOUND')
    expect(expectErr(await ProjectLinkRepository.delete('nope')).code).toBe(
      'PROJECT_LINK_NOT_FOUND',
    )
  })
})

describe('ProjectAttachmentRepository', () => {
  const data = (projectId: string, uploadedById: string) => ({
    fileName: 'plano.pdf',
    contentType: 'application/pdf',
    size: 10,
    bucket: 'project-attachments',
    key: `${projectId}/abc`,
    projectId,
    uploadedById,
  })

  it('should create, find, count and delete', async () => {
    const { user, project } = await setup()
    const created = expectOk(
      await ProjectAttachmentRepository.create(data(project.id, user.id)),
    )

    expect(
      expectOk(await ProjectAttachmentRepository.findById(created.id)).key,
    ).toBe(`${project.id}/abc`)
    expect(
      expectOk(await ProjectAttachmentRepository.countByProject(project.id)),
    ).toBe(1)

    expectOk(await ProjectAttachmentRepository.delete(created.id))
    expect(
      expectErr(await ProjectAttachmentRepository.findById(created.id)).code,
    ).toBe('PROJECT_ATTACHMENT_NOT_FOUND')
  })
})
