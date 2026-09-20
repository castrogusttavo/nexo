import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'

vi.mock('@/src/lib/storage/s3')
vi.mock('@/lib/axiom/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { logger } from '@/lib/axiom/logger'
import { ensureBucket, putObject } from '@/src/lib/storage/s3'
import {
  persistWikiMedia,
  validateWikiMedia,
  WIKI_MEDIA_BUCKET,
} from '../_wiki-media'

const s3EnsureBucket = vi.mocked(ensureBucket)
const s3Put = vi.mocked(putObject)
const loggerError = vi.mocked(logger.error)

beforeEach(() => {
  vi.clearAllMocks()
  s3EnsureBucket.mockResolvedValue()
  s3Put.mockResolvedValue()
})

describe('validateWikiMedia()', () => {
  it('accepts an image within the image limit', () => {
    expectOk(validateWikiMedia('image/png', Buffer.from('x')))
  })

  it('accepts a video within the video limit', () => {
    expectOk(validateWikiMedia('video/mp4', Buffer.from('x')))
  })

  it('accepts audio within the audio limit', () => {
    expectOk(validateWikiMedia('audio/mpeg', Buffer.from('x')))
  })

  it('accepts any other content type within the generic file limit', () => {
    expectOk(validateWikiMedia('application/pdf', Buffer.from('x')))
  })

  it('rejects an empty file', () => {
    const error = expectErr(validateWikiMedia('image/png', Buffer.alloc(0)))
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  // Each content-type tier has its own cap and the cap is inclusive. The
  // message names the limit in MB, so asserting it also pins the tier lookup:
  // a mutant that collapses every tier onto one limit changes this string.
  it.each([
    ['image/png', 10],
    ['video/mp4', 200],
    ['audio/mpeg', 50],
    ['application/pdf', 25],
  ])('accepts %s at exactly its limit and rejects one byte more', (contentType, limitMb) => {
    const limit = limitMb * 1024 * 1024
    expectOk(validateWikiMedia(contentType, Buffer.alloc(limit)))

    const error = expectErr(
      validateWikiMedia(contentType, Buffer.alloc(limit + 1)),
    )
    expect(error.message).toBe(`Arquivo muito grande. Máximo ${limitMb}MB`)
  })

  it('rejects an image larger than the image limit', () => {
    const error = expectErr(
      validateWikiMedia('image/png', Buffer.alloc(10 * 1024 * 1024 + 1)),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a video larger than the video limit', () => {
    const error = expectErr(
      validateWikiMedia('video/mp4', Buffer.alloc(200 * 1024 * 1024 + 1)),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects audio larger than the audio limit', () => {
    const error = expectErr(
      validateWikiMedia('audio/mpeg', Buffer.alloc(50 * 1024 * 1024 + 1)),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a generic file larger than the file limit', () => {
    const error = expectErr(
      validateWikiMedia('application/pdf', Buffer.alloc(25 * 1024 * 1024 + 1)),
    )
    expect(error.code).toBe('VALIDATION_ERROR')
  })
})

describe('persistWikiMedia()', () => {
  it('ensures the bucket then stores the object', async () => {
    const result = await persistWikiMedia({
      key: 'ws1/file.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    })

    expectOk(result)
    expect(s3EnsureBucket).toHaveBeenCalledWith(WIKI_MEDIA_BUCKET)
    expect(s3Put).toHaveBeenCalledWith({
      bucket: WIKI_MEDIA_BUCKET,
      key: 'ws1/file.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    })
  })

  it('returns STORAGE_ERROR and logs when the upload throws an Error', async () => {
    s3Put.mockRejectedValue(new Error('connection refused'))

    const result = await persistWikiMedia({
      key: 'ws1/file.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    })

    expect(expectErr(result).code).toBe('STORAGE_ERROR')
    expect(loggerError).toHaveBeenCalledWith(
      'wiki_media.persist_failed',
      expect.objectContaining({ message: 'connection refused' }),
    )
  })

  it('returns STORAGE_ERROR when the upload throws a non-Error value', async () => {
    s3Put.mockRejectedValue('connection refused')

    const result = await persistWikiMedia({
      key: 'ws1/file.png',
      body: Buffer.from('x'),
      contentType: 'image/png',
    })

    expect(expectErr(result).code).toBe('STORAGE_ERROR')
  })
})
