import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'

vi.mock('@/src/lib/storage/s3')
vi.mock('@/lib/axiom/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { logger } from '@/lib/axiom/logger'
import { ensureBucket, putObject } from '@/src/lib/storage/s3'
import {
  ISSUE_EMBED_THUMBNAILS_BUCKET,
  persistEmbedThumbnail,
} from '../_embed-thumbnail'

const s3EnsureBucket = vi.mocked(ensureBucket)
const s3Put = vi.mocked(putObject)
const loggerWarn = vi.mocked(logger.warn)

beforeEach(() => {
  vi.clearAllMocks()
  s3EnsureBucket.mockResolvedValue()
  s3Put.mockResolvedValue()
})

describe('persistEmbedThumbnail()', () => {
  it('ensures the bucket then stores the object', async () => {
    const result = await persistEmbedThumbnail({
      key: 'hash-1',
      body: Buffer.from('x'),
      contentType: 'image/jpeg',
    })

    expectOk(result)
    expect(s3EnsureBucket).toHaveBeenCalledWith(ISSUE_EMBED_THUMBNAILS_BUCKET)
    expect(s3Put).toHaveBeenCalledWith({
      bucket: ISSUE_EMBED_THUMBNAILS_BUCKET,
      key: 'hash-1',
      body: Buffer.from('x'),
      contentType: 'image/jpeg',
    })
  })

  it('returns STORAGE_ERROR and logs when the upload throws an Error', async () => {
    s3Put.mockRejectedValue(new Error('connection refused'))

    const result = await persistEmbedThumbnail({
      key: 'hash-1',
      body: Buffer.from('x'),
      contentType: 'image/jpeg',
    })

    expect(expectErr(result).code).toBe('STORAGE_ERROR')
    expect(loggerWarn).toHaveBeenCalledWith(
      'issue_embed_thumbnail.persist_failed',
      expect.objectContaining({ message: 'connection refused' }),
    )
  })

  it('returns STORAGE_ERROR when the upload throws a non-Error value', async () => {
    s3Put.mockRejectedValue('connection refused')

    const result = await persistEmbedThumbnail({
      key: 'hash-1',
      body: Buffer.from('x'),
      contentType: 'image/jpeg',
    })

    expect(expectErr(result).code).toBe('STORAGE_ERROR')
  })
})
