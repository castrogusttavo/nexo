import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/repositories/user.repository')
vi.mock('@/src/cache/user.cache')
vi.mock('@/src/lib/storage/s3')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))
vi.mock('@/lib/axiom/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { auditMutation } from '@/lib/axiom/audit'
import { UserCache } from '@/src/cache/user.cache'
import { ensurePublicBucket, putObject } from '@/src/lib/storage/s3'
import { UserRepository } from '@/src/repositories/user.repository'
import { UserMediaService } from '../media/user-media.service'

const repo = vi.mocked(UserRepository)
const cache = vi.mocked(UserCache)
const s3Put = vi.mocked(putObject)
const s3Bucket = vi.mocked(ensurePublicBucket)
const audit = vi.mocked(auditMutation)

const PNG = { contentType: 'image/png', byteSize: 1024 }
const fakeBody = async () => Buffer.from('fake-image-bytes')

beforeEach(() => {
  vi.clearAllMocks()
  cache.invalidate.mockResolvedValue()
  s3Bucket.mockResolvedValue()
  s3Put.mockResolvedValue()
  repo.update.mockResolvedValue(ok({ id: 'u1' } as never))
})

describe('UserMediaService.uploadAvatar()', () => {
  it('should store the file, update the user and return the url', async () => {
    const { url } = expectOk(
      await UserMediaService.uploadAvatar({
        userId: 'u1',
        readBody: fakeBody,
        ...PNG,
      }),
    )

    expect(url).toContain('/avatars/users/u1/avatar.png')
    expect(s3Bucket).toHaveBeenCalledWith('avatars')
    expect(s3Put).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'avatars',
        key: 'users/u1/avatar.png',
      }),
    )
  })

  it('should mpa the extension from the MIME type', async () => {
    const { url } = expectOk(
      await UserMediaService.uploadAvatar({
        userId: 'u1',
        readBody: fakeBody,
        contentType: 'image/webp',
        byteSize: 1024,
      }),
    )
    expect(url).toContain('avatar.webp')
  })

  it('shoud reject unsupported MIME types without touching storage', async () => {
    const readBody = vi.fn(fakeBody)
    const error = expectErr(
      await UserMediaService.uploadAvatar({
        userId: 'u1',
        readBody,
        contentType: 'image/gif',
        byteSize: 1024,
      }),
    )

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(readBody).not.toHaveBeenCalled()
    expect(s3Put).not.toHaveBeenCalled()
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('should reject files larger than 5 MB before reading the body', async () => {
    const readBody = vi.fn(fakeBody)
    const error = expectErr(
      await UserMediaService.uploadAvatar({
        userId: 'u1',
        readBody,
        contentType: 'image/png',
        byteSize: 5 * 1024 * 1024 + 1,
      }),
    )

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(readBody).not.toHaveBeenCalled()
    expect(s3Put).not.toHaveBeenCalled()
  })

  it('should propagate repository errors and not invalidate the cache', async () => {
    repo.update.mockResolvedValue(err(databaseError()))

    const error = expectErr(
      await UserMediaService.uploadAvatar({
        userId: 'u1',
        readBody: fakeBody,
        ...PNG,
      }),
    )

    expect(error.code).toBe('DATABASE_ERROR')
    expect(cache.invalidate).not.toHaveBeenCalled()
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure' }),
    )
  })

  it('should return STORAGE_ERROR when the upload fails', async () => {
    s3Put.mockRejectedValue(new Error('connection refused'))

    const error = expectErr(
      await UserMediaService.uploadAvatar({
        userId: 'u1',
        readBody: fakeBody,
        ...PNG,
      }),
    )

    expect(error.code).toBe('STORAGE_ERROR')
    expect(repo.update).not.toHaveBeenCalled()
    expect(cache.invalidate).not.toHaveBeenCalled()
  })

  it('should return STORAGE_ERROR when the upload throws a non-Error value', async () => {
    s3Put.mockRejectedValue('connection refused')

    const error = expectErr(
      await UserMediaService.uploadAvatar({
        userId: 'u1',
        readBody: fakeBody,
        ...PNG,
      }),
    )

    expect(error.code).toBe('STORAGE_ERROR')
  })
})

describe('UserMediaService.uploadCover()', () => {
  it('should store under the user-covers bucket and update coverImage', async () => {
    const { url } = expectOk(
      await UserMediaService.uploadCover({
        userId: 'u1',
        readBody: fakeBody,
        ...PNG,
      }),
    )

    expect(url).toContain('/user-covers/users/u1/cover.png')
    expect(s3Bucket).toHaveBeenCalledWith('user-covers')
    expect(repo.update).toHaveBeenCalledWith('u1', { coverImage: url })
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { fields: ['coverImage'] } }),
    )
  })
})
