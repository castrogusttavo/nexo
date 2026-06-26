import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/lib/storage/s3')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))
vi.mock('@/lib/axiom/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { auditMutation } from '@/lib/axiom/audit'
import { ensurePublicBucket, putObject } from '@/src/lib/storage/s3'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectMediaService } from '../media/project-media.service'

const membership = vi.mocked(MembershipRepository)
const s3Put = vi.mocked(putObject)
const s3Bucket = vi.mocked(ensurePublicBucket)
const audit = vi.mocked(auditMutation)

const baseInput = {
  actorId: 'u1',
  workspaceId: 'ws1',
  fileName: 'cover.PNG',
  contentType: 'image/png',
  byteSize: 1024,
  readBody: async () => Buffer.from('fake-image-bytes'),
}

beforeEach(() => {
  vi.clearAllMocks()
  s3Bucket.mockResolvedValue()
  s3Put.mockResolvedValue()
  membership.findByUserAndWorkspace.mockResolvedValue(ok({ id: 'm1' } as never))
})

describe('ProjectMediaService.uploadCover()', () => {
  it('should upload, audit and return a 201-style url for a member', async () => {
    const { url } = expectOk(await ProjectMediaService.uploadCover(baseInput))

    expect(url).toMatch(/\/projects-covers\/ws1\/[\w-]+\.png$/)
    expect(s3Bucket).toHaveBeenCalledWith('projects-covers')
    expect(s3Put).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'projects-covers' }),
    )
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'storage_object', action: 'upload' }),
    )
  })

  it('should forbig non-members before touching sotrage', async () => {
    membership.findByUserAndWorkspace.mockResolvedValue(ok(null))
    const readBody = vi.fn(baseInput.readBody)

    const error = expectErr(
      await ProjectMediaService.uploadCover({ ...baseInput, readBody }),
    )

    expect(error.code).toBe('FORBIDDEN')
    expect(readBody).not.toHaveBeenCalled()
    expect(s3Put).not.toHaveBeenCalled()
  })

  it('should reject non-image content types', async () => {
    membership.findByUserAndWorkspace.mockResolvedValue(ok(null))
    const readBody = vi.fn(baseInput.readBody)

    const error = expectErr(
      await ProjectMediaService.uploadCover({ ...baseInput, readBody }),
    )

    expect(error.code).toBe('FORBIDDEN')
    expect(readBody).not.toHaveBeenCalled()
    expect(s3Put).not.toHaveBeenCalled()
  })

  it('should propagate membership lookup failures', async () => {
    membership.findByUserAndWorkspace.mockResolvedValue(err(databaseError()))

    const error = expectErr(await ProjectMediaService.uploadCover(baseInput))
    expect(error.code).toBe('DATABASE_ERROR')
  })

  it('should reject non-image content types', async () => {
    const error = expectErr(
      await ProjectMediaService.uploadCover({
        ...baseInput,
        contentType: 'application/pdf',
      }),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(s3Put).not.toHaveBeenCalled()
  })

  it('should reject files larger than 5 MB', async () => {
    const error = expectErr(
      await ProjectMediaService.uploadCover({
        ...baseInput,
        byteSize: 5 * 1024 * 1024 + 1,
      }),
    )

    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('should return STORAGE_ERROR when the upload fails', async () => {
    s3Put.mockRejectedValue(new Error('connection refused'))

    const error = expectErr(await ProjectMediaService.uploadCover(baseInput))
    expect(error.code).toBe('STORAGE_ERROR')
    expect(audit).not.toHaveBeenCalled()
  })
})
