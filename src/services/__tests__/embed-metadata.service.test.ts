import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('../_project-scope')
vi.mock('../embed-thumbnail.service')

import { resolveProject } from '../_project-scope'
import { EmbedMetadataService } from '../embed-metadata.service'
import { EmbedThumbnailService } from '../embed-thumbnail.service'

const mockedResolve = vi.mocked(resolveProject)
const mockedGetOrFetch = vi.mocked(EmbedThumbnailService.getOrFetch)

const membership = { role: 'MEMBER' as const, isPrivileged: false }

beforeEach(() => {
  vi.clearAllMocks()
  mockedResolve.mockResolvedValue({
    ok: true,
    membership,
    project: { id: 'proj-1' } as never,
  })
  mockedGetOrFetch.mockResolvedValue(ok(null))
})

describe('EmbedMetadataService.resolve()', () => {
  it('propagates resolveProject errors before touching the url', async () => {
    mockedResolve.mockResolvedValue({ ok: false, error: databaseError() })

    const result = await EmbedMetadataService.resolve(
      'actor',
      'ws1',
      'proj-slug',
      'https://youtu.be/abc',
    )

    expectErr(result, 'DATABASE_ERROR')
    expect(mockedGetOrFetch).not.toHaveBeenCalled()
  })

  it('returns VALIDATION_ERROR for an unsupported url', async () => {
    const result = await EmbedMetadataService.resolve(
      'actor',
      'ws1',
      'proj-slug',
      'https://example.com/whatever',
    )

    expectErr(result, 'VALIDATION_ERROR')
    expect(mockedGetOrFetch).not.toHaveBeenCalled()
  })

  it('resolves metadata with a null thumbnailKey when none is found', async () => {
    const metadata = expectOk(
      await EmbedMetadataService.resolve(
        'actor',
        'ws1',
        'proj-slug',
        'https://youtu.be/abc',
      ),
    )

    expect(metadata.provider).toBe('youtube')
    expect(metadata.thumbnailKey).toBeNull()
  })

  it('resolves metadata with the fetched thumbnailKey', async () => {
    mockedGetOrFetch.mockResolvedValue(ok({ key: 'hash-1' }))

    const metadata = expectOk(
      await EmbedMetadataService.resolve(
        'actor',
        'ws1',
        'proj-slug',
        'https://youtu.be/abc',
      ),
    )

    expect(metadata.thumbnailKey).toBe('hash-1')
  })

  it('propagates thumbnail fetch errors', async () => {
    mockedGetOrFetch.mockResolvedValue(
      err({ code: 'STORAGE_ERROR', message: 'boom' } as never),
    )

    const result = await EmbedMetadataService.resolve(
      'actor',
      'ws1',
      'proj-slug',
      'https://youtu.be/abc',
    )

    expectErr(result, 'STORAGE_ERROR')
  })
})
