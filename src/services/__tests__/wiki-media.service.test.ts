import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { forbidden } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/lib/storage/s3', () => ({
  getPresignedDownloadUrl: vi.fn(async () => 'https://signed.example/file'),
}))
vi.mock('../_authz')
vi.mock('../_wiki-media', () => ({
  WIKI_MEDIA_BUCKET: 'wiki-media',
  persistWikiMedia: vi.fn(),
  validateWikiMedia: vi.fn(),
}))

import { getPresignedDownloadUrl } from '@/src/lib/storage/s3'
import { assertMember } from '../_authz'
import { persistWikiMedia, validateWikiMedia } from '../_wiki-media'
import { WikiMediaService } from '../wiki-media.service'

const mockedAssertMember = vi.mocked(assertMember)
const mockedPersist = vi.mocked(persistWikiMedia)
const mockedValidate = vi.mocked(validateWikiMedia)
const mockedPresign = vi.mocked(getPresignedDownloadUrl)

const membership = { role: 'MEMBER' as const, isPrivileged: false }

beforeEach(() => {
  vi.clearAllMocks()
  mockedAssertMember.mockResolvedValue(ok(membership))
  mockedPersist.mockResolvedValue(ok(undefined))
  mockedValidate.mockReturnValue(ok(undefined))
  mockedPresign.mockResolvedValue('https://signed.example/file')
})

describe('WikiMediaService.upload()', () => {
  it('stores the file and returns a signed url, keyed by content type extension', async () => {
    const { key, url } = expectOk(
      await WikiMediaService.upload('actor', 'ws1', {
        buffer: Buffer.from('x'),
        contentType: 'image/png',
        fileName: 'diagram.png',
      }),
    )

    expect(key).toMatch(/^ws1\/.+\.png$/)
    expect(url).toBe('https://signed.example/file')
    expect(mockedPersist).toHaveBeenCalled()
  })

  it('falls back to the file name extension when the content type has none', async () => {
    const { key } = expectOk(
      await WikiMediaService.upload('actor', 'ws1', {
        buffer: Buffer.from('x'),
        contentType: 'file',
        fileName: 'report.pdf',
      }),
    )

    expect(key).toMatch(/\.pdf$/)
  })

  it('returns FORBIDDEN when the actor is not a workspace member', async () => {
    mockedAssertMember.mockResolvedValue(err(forbidden()))

    const result = await WikiMediaService.upload('actor', 'ws1', {
      buffer: Buffer.from('x'),
      contentType: 'image/png',
      fileName: 'diagram.png',
    })

    expectErr(result, 'FORBIDDEN')
    expect(mockedValidate).not.toHaveBeenCalled()
  })

  it('propagates validation errors without persisting', async () => {
    mockedValidate.mockReturnValue(
      err({ code: 'VALIDATION_ERROR', message: 'bad' } as never),
    )

    const result = await WikiMediaService.upload('actor', 'ws1', {
      buffer: Buffer.from('x'),
      contentType: 'image/png',
      fileName: 'diagram.png',
    })

    expectErr(result, 'VALIDATION_ERROR')
    expect(mockedPersist).not.toHaveBeenCalled()
  })

  it('propagates persistence errors', async () => {
    mockedPersist.mockResolvedValue(
      err({ code: 'STORAGE_ERROR', message: 'boom' } as never),
    )

    const result = await WikiMediaService.upload('actor', 'ws1', {
      buffer: Buffer.from('x'),
      contentType: 'image/png',
      fileName: 'diagram.png',
    })

    expectErr(result, 'STORAGE_ERROR')
  })
})

describe('WikiMediaService.getDownloadUrl()', () => {
  it('returns a signed url for a member', async () => {
    const { url } = expectOk(
      await WikiMediaService.getDownloadUrl('actor', 'ws1', 'ws1/file.png'),
    )
    expect(url).toBe('https://signed.example/file')
  })

  it('returns FORBIDDEN when the actor is not a workspace member', async () => {
    mockedAssertMember.mockResolvedValue(err(forbidden()))

    const result = await WikiMediaService.getDownloadUrl(
      'actor',
      'ws1',
      'ws1/file.png',
    )
    expectErr(result, 'FORBIDDEN')
  })

  it('rejects a key that does not belong to the workspace', async () => {
    const result = await WikiMediaService.getDownloadUrl(
      'actor',
      'ws1',
      'other-ws/file.png',
    )
    expectErr(result, 'VALIDATION_ERROR')
    expect(mockedPresign).not.toHaveBeenCalled()
  })
})
