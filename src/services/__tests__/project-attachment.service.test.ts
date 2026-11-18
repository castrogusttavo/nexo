import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ProjectAttachmentRepository } from '@/src/repositories/project-attachment.repository'
import { ProjectAttachmentService } from '../project-attachment.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/project-attachment.repository')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))
vi.mock('@/src/lib/storage/s3', () => ({
  getPresignedDownloadUrl: vi.fn().mockResolvedValue('https://signed'),
}))
vi.mock('../issue/_attachment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../issue/_attachment')>()),
  persistAttachment: vi.fn(),
  removeAttachmentObject: vi.fn(),
}))

import { persistAttachment, removeAttachmentObject } from '../issue/_attachment'

const membership = vi.mocked(MembershipRepository)
const projects = vi.mocked(ProjectRepository)
const repo = vi.mocked(ProjectAttachmentRepository)

const row = {
  id: 'a1',
  fileName: 'plano.pdf',
  contentType: 'application/pdf',
  size: 4,
  bucket: 'project-attachments',
  key: 'p1/abc',
  projectId: 'p1',
  uploadedById: 'actor',
  createdAt: new Date(),
}

const file = {
  buffer: Buffer.from('%PDF'),
  contentType: 'application/pdf',
  fileName: 'plano.pdf',
}

function asRole(role: 'OWNER' | 'MEMBER') {
  membership.findByUserAndWorkspace.mockResolvedValue(
    ok(createFakeMembership({ userId: 'actor', workspaceId: 'ws1', role })),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  asRole('OWNER')
  projects.findByWorkspaceAndSlug.mockResolvedValue(
    ok({
      id: 'p1',
      workspaceId: 'ws1',
      leadId: 'lead',
      isPublic: false,
      members: [{ userId: 'actor' }],
      favourites: [],
      labelAssignments: [],
    } as never),
  )
})

describe('ProjectAttachmentService', () => {
  it('should list with signed urls', async () => {
    repo.listByProject.mockResolvedValue(ok([row]))

    const result = await ProjectAttachmentService.list('actor', 'ws1', 'slug')

    expect(expectOk(result)[0].url).toBe('https://signed')
  })

  it('should upload, persist the object and create the row', async () => {
    repo.countByProject.mockResolvedValue(ok(0))
    vi.mocked(persistAttachment).mockResolvedValue(ok(undefined))
    repo.create.mockResolvedValue(ok(row))

    const result = await ProjectAttachmentService.upload(
      'actor',
      'ws1',
      'slug',
      file,
    )

    expect(expectOk(result).fileName).toBe('plano.pdf')
    expect(persistAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'project-attachments' }),
    )
  })

  it('should refuse a disallowed content type before storing', async () => {
    repo.countByProject.mockResolvedValue(ok(0))

    const result = await ProjectAttachmentService.upload(
      'actor',
      'ws1',
      'slug',
      { ...file, contentType: 'application/x-msdownload' },
    )

    expect(expectErr(result).code).toBe('VALIDATION_ERROR')
    expect(persistAttachment).not.toHaveBeenCalled()
  })

  it('should return PROJECT_ATTACHMENT_LIMIT_REACHED at 20', async () => {
    repo.countByProject.mockResolvedValue(ok(20))

    const result = await ProjectAttachmentService.upload(
      'actor',
      'ws1',
      'slug',
      file,
    )

    expect(expectErr(result).code).toBe('PROJECT_ATTACHMENT_LIMIT_REACHED')
  })

  it('should roll the object back when the row fails', async () => {
    repo.countByProject.mockResolvedValue(ok(0))
    vi.mocked(persistAttachment).mockResolvedValue(ok(undefined))
    repo.create.mockResolvedValue(err(databaseError('db')))

    await ProjectAttachmentService.upload('actor', 'ws1', 'slug', file)

    expect(removeAttachmentObject).toHaveBeenCalled()
  })

  it('should refuse a plain member and never store', async () => {
    asRole('MEMBER')

    const result = await ProjectAttachmentService.upload(
      'actor',
      'ws1',
      'slug',
      file,
    )

    expect(expectErr(result).code).toBe('PROJECT_FORBIDDEN')
    expect(persistAttachment).not.toHaveBeenCalled()
  })

  it('should not delete an attachment of another project', async () => {
    repo.findById.mockResolvedValue(ok({ ...row, projectId: 'outro' }))

    const result = await ProjectAttachmentService.remove(
      'actor',
      'ws1',
      'slug',
      'a1',
    )

    expect(expectErr(result).code).toBe('PROJECT_ATTACHMENT_NOT_FOUND')
    expect(repo.delete).not.toHaveBeenCalled()
  })

  it('should delete the row and then the object', async () => {
    repo.findById.mockResolvedValue(ok(row))
    repo.delete.mockResolvedValue(ok(undefined))

    expectOk(
      await ProjectAttachmentService.remove('actor', 'ws1', 'slug', 'a1'),
    )

    expect(removeAttachmentObject).toHaveBeenCalledWith(
      'project-attachments',
      'p1/abc',
    )
  })
})
