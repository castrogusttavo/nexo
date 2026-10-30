import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/workspace.repository')
vi.mock('@/src/cache/workspace.cache')
vi.mock('@/src/cache/user.cache')
vi.mock('@/src/lib/storage/s3')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))

import { auditMutation } from '@/lib/axiom/audit'
import { UserCache } from '@/src/cache/user.cache'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import {
  deleteObject,
  ensurePublicBucket,
  putObject,
} from '@/src/lib/storage/s3'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import { WorkspaceMediaService } from '../media/workspace-media.service'

const membership = vi.mocked(MembershipRepository)
const workspaces = vi.mocked(WorkspaceRepository)
const workspaceCache = vi.mocked(WorkspaceCache)
const userCache = vi.mocked(UserCache)
const s3Put = vi.mocked(putObject)
const s3Bucket = vi.mocked(ensurePublicBucket)
const s3Delete = vi.mocked(deleteObject)
const audit = vi.mocked(auditMutation)

const OLD_URL = 'http://silo/workspace-logos/workspace/ws1/old.png'

const baseInput = {
  actorId: 'u1',
  workspaceId: 'ws1',
  contentType: 'image/png',
  byteSize: 1024,
  readBody: async () => Buffer.from('fake-image-bytes'),
}

function asRole(role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') {
  membership.findByUserAndWorkspace.mockResolvedValue(
    ok({ id: 'm1', role } as never),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  s3Bucket.mockResolvedValue()
  s3Put.mockResolvedValue()
  s3Delete.mockResolvedValue()
  workspaceCache.invalidate.mockResolvedValue(undefined)
  userCache.invalidate.mockResolvedValue(undefined)
  membership.listUserIdsByWorkspace.mockResolvedValue(ok(['u1', 'u2']))
  asRole('OWNER')
  workspaces.findById.mockResolvedValue(
    ok(createFakeWorkspace({ id: 'ws1', image: OLD_URL })),
  )
  workspaces.update.mockResolvedValue(ok(createFakeWorkspace({ id: 'ws1' })))
})

describe('WorkspaceMediaService.uploadLogo()', () => {
  it('should store the file, save the url, drop the old logo and audit', async () => {
    const { url } = expectOk(await WorkspaceMediaService.uploadLogo(baseInput))

    expect(url).toMatch(/\/workspace-logos\/workspace\/ws1\/[\w-]+\.png$/)
    expect(s3Bucket).toHaveBeenCalledWith('workspace-logos')
    expect(s3Put).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'workspace-logos' }),
    )
    expect(workspaces.update).toHaveBeenCalledWith('ws1', { image: url })
    expect(s3Delete).toHaveBeenCalledWith({
      bucket: 'workspace-logos',
      key: 'workspace/ws1/old.png',
    })
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'workspace',
        action: 'update',
        targetId: 'ws1',
        meta: { fields: ['image'] },
      }),
    )
  })

  it('should invalidate the workspace and every member cache', async () => {
    expectOk(await WorkspaceMediaService.uploadLogo(baseInput))

    expect(workspaceCache.invalidate).toHaveBeenCalledWith('ws1')
    expect(userCache.invalidate).toHaveBeenCalledWith('u1')
    expect(userCache.invalidate).toHaveBeenCalledWith('u2')
  })

  it('should allow an ADMIN', async () => {
    asRole('ADMIN')

    expectOk(await WorkspaceMediaService.uploadLogo(baseInput))
  })

  it.each([
    'MEMBER',
    'VIEWER',
  ] as const)('should forbid a %s before touching storage', async (role) => {
    asRole(role)
    const readBody = vi.fn(baseInput.readBody)

    const error = expectErr(
      await WorkspaceMediaService.uploadLogo({ ...baseInput, readBody }),
    )

    expect(error.code).toBe('FORBIDDEN')
    expect(readBody).not.toHaveBeenCalled()
    expect(s3Put).not.toHaveBeenCalled()
    expect(workspaces.update).not.toHaveBeenCalled()
  })

  it('should forbid a non-member', async () => {
    membership.findByUserAndWorkspace.mockResolvedValue(ok(null))

    const error = expectErr(await WorkspaceMediaService.uploadLogo(baseInput))

    expect(error.code).toBe('FORBIDDEN')
    expect(s3Put).not.toHaveBeenCalled()
  })

  it('should propagate membership lookup failures', async () => {
    membership.findByUserAndWorkspace.mockResolvedValue(err(databaseError()))

    const error = expectErr(await WorkspaceMediaService.uploadLogo(baseInput))

    expect(error.code).toBe('DATABASE_ERROR')
  })

  it('should reject non-image content types without buffering the body', async () => {
    const readBody = vi.fn(baseInput.readBody)

    const error = expectErr(
      await WorkspaceMediaService.uploadLogo({
        ...baseInput,
        contentType: 'application/pdf',
        readBody,
      }),
    )

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(readBody).not.toHaveBeenCalled()
    expect(s3Put).not.toHaveBeenCalled()
  })

  it('should reject files larger than 5 MB', async () => {
    const error = expectErr(
      await WorkspaceMediaService.uploadLogo({
        ...baseInput,
        byteSize: 5 * 1024 * 1024 + 1,
      }),
    )

    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('should return NOT_FOUND when the workspace is gone', async () => {
    workspaces.findById.mockResolvedValue(
      err({ code: 'NOT_FOUND', message: 'Workspace' } as never),
    )

    const error = expectErr(await WorkspaceMediaService.uploadLogo(baseInput))

    expect(error.code).toBe('NOT_FOUND')
    expect(s3Put).not.toHaveBeenCalled()
  })

  it('should return STORAGE_ERROR and leave the row alone when storage fails', async () => {
    s3Put.mockRejectedValue(new Error('connection refused'))

    const error = expectErr(await WorkspaceMediaService.uploadLogo(baseInput))

    expect(error.code).toBe('STORAGE_ERROR')
    expect(workspaces.update).not.toHaveBeenCalled()
    expect(s3Delete).not.toHaveBeenCalled()
    expect(audit).not.toHaveBeenCalled()
  })

  it('should delete the new file and keep the old one when the row update fails', async () => {
    workspaces.update.mockResolvedValue(err(databaseError()))

    const error = expectErr(await WorkspaceMediaService.uploadLogo(baseInput))

    expect(error.code).toBe('DATABASE_ERROR')
    expect(s3Delete).toHaveBeenCalledTimes(1)
    expect(s3Delete).toHaveBeenCalledWith({
      bucket: 'workspace-logos',
      key: expect.not.stringContaining('old.png'),
    })
    expect(workspaceCache.invalidate).not.toHaveBeenCalled()
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure', reason: 'DATABASE_ERROR' }),
    )
  })

  it('should not try to delete anything when there was no previous logo', async () => {
    workspaces.findById.mockResolvedValue(
      ok(createFakeWorkspace({ id: 'ws1', image: null })),
    )

    expectOk(await WorkspaceMediaService.uploadLogo(baseInput))

    expect(s3Delete).not.toHaveBeenCalled()
  })

  it('should still succeed when deleting the old logo fails', async () => {
    s3Delete.mockRejectedValue(new Error('silo down'))

    expectOk(await WorkspaceMediaService.uploadLogo(baseInput))
  })
})

describe('WorkspaceMediaService.removeLogo()', () => {
  it('should null the image, delete the object and audit', async () => {
    expectOk(await WorkspaceMediaService.removeLogo('u1', 'ws1'))

    expect(workspaces.update).toHaveBeenCalledWith('ws1', { image: null })
    expect(s3Delete).toHaveBeenCalledWith({
      bucket: 'workspace-logos',
      key: 'workspace/ws1/old.png',
    })
    expect(workspaceCache.invalidate).toHaveBeenCalledWith('ws1')
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'workspace',
        meta: { fields: ['image'], removed: true },
      }),
    )
  })

  it.each(['MEMBER', 'VIEWER'] as const)('should forbid a %s', async (role) => {
    asRole(role)

    const error = expectErr(await WorkspaceMediaService.removeLogo('u1', 'ws1'))

    expect(error.code).toBe('FORBIDDEN')
    expect(workspaces.update).not.toHaveBeenCalled()
    expect(s3Delete).not.toHaveBeenCalled()
  })

  it('should keep the object when the row update fails', async () => {
    workspaces.update.mockResolvedValue(err(databaseError()))

    expectErr(await WorkspaceMediaService.removeLogo('u1', 'ws1'))

    expect(s3Delete).not.toHaveBeenCalled()
  })

  it('should be a no-op on storage when there is no logo', async () => {
    workspaces.findById.mockResolvedValue(
      ok(createFakeWorkspace({ id: 'ws1', image: null })),
    )

    expectOk(await WorkspaceMediaService.removeLogo('u1', 'ws1'))

    expect(s3Delete).not.toHaveBeenCalled()
  })
})
