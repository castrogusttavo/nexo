import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/lib/storage/s3')
vi.mock('../_embed-thumbnail', () => ({
  ISSUE_EMBED_THUMBNAILS_BUCKET: 'issue-embed-thumbnails',
  persistEmbedThumbnail: vi.fn(),
}))

import { getObjectBuffer } from '@/src/lib/storage/s3'
import { persistEmbedThumbnail } from '../_embed-thumbnail'
import { EmbedThumbnailService } from '../embed-thumbnail.service'

const mockedGetObject = vi.mocked(getObjectBuffer)
const mockedPersist = vi.mocked(persistEmbedThumbnail)
const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  mockedGetObject.mockResolvedValue(null)
  mockedPersist.mockResolvedValue(ok(undefined))
})

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

function bufferResponse(ok = true, contentType = 'image/jpeg') {
  return {
    ok,
    headers: { get: () => contentType },
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  }
}

describe('EmbedThumbnailService.getOrFetch()', () => {
  it('returns the cached key without fetching when one already exists', async () => {
    mockedGetObject.mockResolvedValue({
      body: Buffer.from('x'),
      contentType: 'image/jpeg',
    })

    const result = expectOk(
      await EmbedThumbnailService.getOrFetch('youtube', 'https://youtu.be/abc'),
    )

    expect(result?.key).toBeDefined()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockedPersist).not.toHaveBeenCalled()
  })

  it('returns null for a provider without a thumbnail fetcher', async () => {
    const result = await EmbedThumbnailService.getOrFetch(
      'figma',
      'https://figma.com/file/x',
    )

    expect(expectOk(result)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches, persists and returns the key for youtube when no cache exists', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ thumbnail_url: 'https://img.youtube.com/x.jpg' }),
      )
      .mockResolvedValueOnce(bufferResponse())

    const result = expectOk(
      await EmbedThumbnailService.getOrFetch('youtube', 'https://youtu.be/abc'),
    )

    expect(result?.key).toBeDefined()
    expect(mockedPersist).toHaveBeenCalledWith(
      expect.objectContaining({ key: result?.key, contentType: 'image/jpeg' }),
    )
  })

  // The oEmbed answer decides the next request's destination, so a payload
  // pointing anywhere but YouTube's own thumbnail hosts must not be fetched:
  // the server would be making the request on the caller's behalf.
  it.each([
    ['an internal address', 'http://169.254.169.254/latest/meta-data/'],
    ['a foreign https host', 'https://evil.example.com/x.jpg'],
    ['a non-http scheme', 'file:///etc/passwd'],
    ['a malformed url', 'not a url'],
  ])('refuses a thumbnail_url pointing at %s', async (_label, thumbnailUrl) => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ thumbnail_url: thumbnailUrl }),
    )

    const result = await EmbedThumbnailService.getOrFetch(
      'youtube',
      'https://youtu.be/abc',
    )

    expect(expectOk(result)).toBeNull()
    // Only the oEmbed call happened; the image was never requested.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockedPersist).not.toHaveBeenCalled()
  })

  it('does not follow a redirect away from the thumbnail host', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ thumbnail_url: 'https://i.ytimg.com/x.jpg' }),
      )
      .mockResolvedValueOnce(bufferResponse())

    await EmbedThumbnailService.getOrFetch('youtube', 'https://youtu.be/abc')

    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://i.ytimg.com/x.jpg',
      expect.objectContaining({ redirect: 'error' }),
    )
  })

  it('returns null when the oEmbed request fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false))

    const result = await EmbedThumbnailService.getOrFetch(
      'youtube',
      'https://youtu.be/abc',
    )
    expect(expectOk(result)).toBeNull()
    expect(mockedPersist).not.toHaveBeenCalled()
  })

  it('returns null when the oEmbed payload has no thumbnail_url', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}))

    const result = await EmbedThumbnailService.getOrFetch(
      'youtube',
      'https://youtu.be/abc',
    )
    expect(expectOk(result)).toBeNull()
  })

  it('returns null when the thumbnail image request fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ thumbnail_url: 'https://img.youtube.com/x.jpg' }),
      )
      .mockResolvedValueOnce(bufferResponse(false))

    const result = await EmbedThumbnailService.getOrFetch(
      'youtube',
      'https://youtu.be/abc',
    )
    expect(expectOk(result)).toBeNull()
  })

  it('propagates persistence errors', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ thumbnail_url: 'https://img.youtube.com/x.jpg' }),
      )
      .mockResolvedValueOnce(bufferResponse())
    mockedPersist.mockResolvedValue(
      err({ code: 'STORAGE_ERROR', message: 'boom' } as never),
    )

    const result = await EmbedThumbnailService.getOrFetch(
      'youtube',
      'https://youtu.be/abc',
    )
    expectErr(result, 'STORAGE_ERROR')
  })
})
