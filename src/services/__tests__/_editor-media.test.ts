import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'

vi.mock('@/src/lib/storage/s3')
vi.mock('@/lib/axiom/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { logger } from '@/lib/axiom/logger'
import { ensureBucket, putObject } from '@/src/lib/storage/s3'
import {
  ISSUE_EDITOR_MEDIA_BUCKET,
  persistEditorMedia,
  validateEditorMedia,
} from '../_editor-media'

const s3EnsureBucket = vi.mocked(ensureBucket)
const s3Put = vi.mocked(putObject)
const loggerError = vi.mocked(logger.error)

beforeEach(() => {
  vi.clearAllMocks()
  s3EnsureBucket.mockResolvedValue()
  s3Put.mockResolvedValue()
})

describe('validateEditorMedia()', () => {
  it('accepts an allowed image content type within the size limit', () => {
    expectOk(validateEditorMedia('image/png', Buffer.from('x')))
  })

  it('accepts an allowed video content type within the size limit', () => {
    expectOk(validateEditorMedia('video/mp4', Buffer.from('x')))
  })

  it('rejects a disallowed content type', () => {
    const error = expectErr(
      validateEditorMedia('application/pdf', Buffer.from('x')),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects an empty file', () => {
    const error = expectErr(validateEditorMedia('image/png', Buffer.alloc(0)))
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects an image larger than the image limit', () => {
    const error = expectErr(
      validateEditorMedia('image/png', Buffer.alloc(10 * 1024 * 1024 + 1)),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a video larger than the video limit', () => {
    const error = expectErr(
      validateEditorMedia('video/mp4', Buffer.alloc(200 * 1024 * 1024 + 1)),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })
})

describe('persistEditorMedia()', () => {
  it('ensures the bucket then stores the object', async () => {
    const result = await persistEditorMedia({
      key: 'proj-1/file.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    })

    expectOk(result)
    expect(s3EnsureBucket).toHaveBeenCalledWith(ISSUE_EDITOR_MEDIA_BUCKET)
    expect(s3Put).toHaveBeenCalledWith({
      bucket: ISSUE_EDITOR_MEDIA_BUCKET,
      key: 'proj-1/file.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    })
  })

  it('returns STORAGE_ERROR and logs when the upload throws an Error', async () => {
    s3Put.mockRejectedValue(new Error('connection refused'))

    const result = await persistEditorMedia({
      key: 'proj-1/file.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    })

    expect(expectErr(result).code).toBe('STORAGE_ERROR')
    expect(loggerError).toHaveBeenCalledWith(
      'issue_editor_media.persist_failed',
      expect.objectContaining({ message: 'connection refused' }),
    )
  })

  it('returns STORAGE_ERROR when the upload throws a non-Error value', async () => {
    s3Put.mockRejectedValue('connection refused')

    const result = await persistEditorMedia({
      key: 'proj-1/file.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    })

    expect(expectErr(result).code).toBe('STORAGE_ERROR')
  })
})
