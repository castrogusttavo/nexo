import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeAttachment } from '@/src/__tests__/factories/attachment.factory'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { AttachmentRepository } from '@/src/repositories/attachment.repository'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { AttachmentService } from '../attachment.service'
import * as attachmentStorage from '../issue/_attachment'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/attachment.repository')
vi.mock('@/src/lib/storage/s3', () => ({
  getPresignedDownloadUrl: vi.fn(async () => 'https://signed.example/file'),
}))

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedAttachment = vi.mocked(AttachmentRepository)

const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

function projectWith(
  overrides?: Partial<ReturnType<typeof createFakeProject>>,
  members: { userId: string }[] = [{ userId: 'actor' }],
) {
  return {
    ...createFakeProject({ id: 'proj-1', leadId: 'lead-1', ...overrides }),
    members,
    favourites: [] as { id: string }[],
  }
}

function inProject() {
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(
    ok(memberMembership),
  )
  mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
    ok(projectWith({ id: 'proj-1' })),
  )
  mockedIssue.findById.mockResolvedValue(
    ok(createFakeIssue({ projectId: 'proj-1' })),
  )
}

function pngFile() {
  return {
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    contentType: 'image/png',
    fileName: 'diagram.png',
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(attachmentStorage, 'persistAttachment').mockResolvedValue(
    ok(undefined),
  )
  vi.spyOn(attachmentStorage, 'removeAttachmentObject').mockResolvedValue(
    undefined,
  )
})

describe('AttachmentService', () => {
  describe('upload()', () => {
    it('should persist the file then create the record', async () => {
      inProject()
      mockedAttachment.create.mockResolvedValue(
        ok(createFakeAttachment({ issueId: 'issue-1' })),
      )

      const result = await AttachmentService.upload(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        pngFile(),
      )

      expectOk(result)
      expect(attachmentStorage.persistAttachment).toHaveBeenCalled()
      expect(mockedAttachment.create).toHaveBeenCalled()
    })

    it('should return VALIDATION_ERROR for a disallowed content type', async () => {
      inProject()

      const result = await AttachmentService.upload(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { ...pngFile(), contentType: 'application/x-msdownload' },
      )

      expectErr(result, 'VALIDATION_ERROR')
      expect(attachmentStorage.persistAttachment).not.toHaveBeenCalled()
    })

    it('should remove the stored object when the db insert fails', async () => {
      inProject()
      mockedAttachment.create.mockResolvedValue(err(databaseError()))

      const result = await AttachmentService.upload(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        pngFile(),
      )

      expectErr(result, 'DATABASE_ERROR')
      expect(attachmentStorage.removeAttachmentObject).toHaveBeenCalled()
    })

    it('should return ISSUE_NOT_FOUND when the issue is in another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'other-proj' })),
      )

      const result = await AttachmentService.upload(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        pngFile(),
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
    })

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' }, [])),
      )

      const result = await AttachmentService.upload(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        pngFile(),
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
    })
  })

  describe('remove()', () => {
    it('should delete the record and the stored object', async () => {
      inProject()
      mockedAttachment.findById.mockResolvedValue(
        ok(createFakeAttachment({ issueId: 'issue-1' })),
      )
      mockedAttachment.delete.mockResolvedValue(ok(undefined))

      const result = await AttachmentService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'att-1',
      )

      expectOk(result)
      expect(attachmentStorage.removeAttachmentObject).toHaveBeenCalled()
    })

    it('should return ATTACHMENT_NOT_FOUND when it belongs to another issue', async () => {
      inProject()
      mockedAttachment.findById.mockResolvedValue(
        ok(createFakeAttachment({ issueId: 'other-issue' })),
      )

      const result = await AttachmentService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'att-1',
      )

      expectErr(result, 'ATTACHMENT_NOT_FOUND')
      expect(mockedAttachment.delete).not.toHaveBeenCalled()
    })
  })

  describe('list()', () => {
    it('should return attachments with presigned urls', async () => {
      inProject()
      mockedAttachment.listByIssue.mockResolvedValue(
        ok([createFakeAttachment({ issueId: 'issue-1' })]),
      )

      const result = await AttachmentService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      const dtos = expectOk(result)
      expect(dtos).toHaveLength(1)
      expect(dtos[0].url).toBe('https://signed.example/file')
    })

    it('should propagate repo error', async () => {
      inProject()
      mockedAttachment.listByIssue.mockResolvedValue(err(databaseError()))

      const result = await AttachmentService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
