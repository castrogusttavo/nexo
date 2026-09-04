import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'

vi.mock('@/src/lib/storage/s3')
vi.mock('@/lib/axiom/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { logger } from '@/lib/axiom/logger'
import { deleteObject, ensureBucket, putObject } from '@/src/lib/storage/s3'
import {
  ISSUE_ATTACHMENTS_BUCKET,
  persistAttachment,
  removeAttachmentObject,
  validateAttachment,
} from '../_attachment'

const s3EnsureBucket = vi.mocked(ensureBucket)
const s3Put = vi.mocked(putObject)
const s3Delete = vi.mocked(deleteObject)
const loggerError = vi.mocked(logger.error)

beforeEach(() => {
  vi.clearAllMocks()
  s3EnsureBucket.mockResolvedValue()
  s3Put.mockResolvedValue()
  s3Delete.mockResolvedValue()
})

describe('validateAttachment()', () => {
  it('accepts an allowed content type within the size limit', () => {
    expectOk(validateAttachment('application/pdf', Buffer.from('x')))
  })

  it('rejects a disallowed content type', () => {
    const error = expectErr(
      validateAttachment('application/x-msdownload', Buffer.from('x')),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects an empty file', () => {
    const error = expectErr(
      validateAttachment('application/pdf', Buffer.alloc(0)),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a file larger than the limit', () => {
    const error = expectErr(
      validateAttachment('application/pdf', Buffer.alloc(25 * 1024 * 1024 + 1)),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })
})

describe('persistAttachment()', () => {
  it('ensures the bucket then stores the object', async () => {
    const result = await persistAttachment({
      key: 'issue-1/file.pdf',
      body: Buffer.from('x'),
      contentType: 'application/pdf',
    })

    expectOk(result)
    expect(s3EnsureBucket).toHaveBeenCalledWith(ISSUE_ATTACHMENTS_BUCKET)
    expect(s3Put).toHaveBeenCalledWith({
      bucket: ISSUE_ATTACHMENTS_BUCKET,
      key: 'issue-1/file.pdf',
      body: Buffer.from('x'),
      contentType: 'application/pdf',
    })
  })

  it('returns STORAGE_ERROR and logs when the upload throws an Error', async () => {
    s3Put.mockRejectedValue(new Error('connection refused'))

    const result = await persistAttachment({
      key: 'issue-1/file.pdf',
      body: Buffer.from('x'),
      contentType: 'application/pdf',
    })

    expect(expectErr(result).code).toBe('STORAGE_ERROR')
    expect(loggerError).toHaveBeenCalledWith(
      'issue_attachment.persist_failed',
      expect.objectContaining({ message: 'connection refused' }),
    )
  })

  it('returns STORAGE_ERROR when the upload throws a non-Error value', async () => {
    s3Put.mockRejectedValue('connection refused')

    const result = await persistAttachment({
      key: 'issue-1/file.pdf',
      body: Buffer.from('x'),
      contentType: 'application/pdf',
    })

    expect(expectErr(result).code).toBe('STORAGE_ERROR')
  })
})

describe('removeAttachmentObject()', () => {
  it('deletes the object', async () => {
    await removeAttachmentObject(ISSUE_ATTACHMENTS_BUCKET, 'issue-1/file.pdf')

    expect(s3Delete).toHaveBeenCalledWith({
      bucket: ISSUE_ATTACHMENTS_BUCKET,
      key: 'issue-1/file.pdf',
    })
  })

  it('swallows and logs an Error thrown by the delete call', async () => {
    s3Delete.mockRejectedValue(new Error('connection refused'))

    await expect(
      removeAttachmentObject(ISSUE_ATTACHMENTS_BUCKET, 'issue-1/file.pdf'),
    ).resolves.toBeUndefined()

    expect(loggerError).toHaveBeenCalledWith(
      'issue_attachment.delete_failed',
      expect.objectContaining({ message: 'connection refused' }),
    )
  })

  it('swallows a non-Error value thrown by the delete call', async () => {
    s3Delete.mockRejectedValue('connection refused')

    await expect(
      removeAttachmentObject(ISSUE_ATTACHMENTS_BUCKET, 'issue-1/file.pdf'),
    ).resolves.toBeUndefined()
  })
})
