import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, forbidden } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/lib/storage/s3', () => ({
  getPresignedDownloadUrl: vi.fn(async () => 'https://signed.example/file'),
}))
vi.mock('../_project-scope')
vi.mock('../_editor-media', () => ({
  ISSUE_EDITOR_MEDIA_BUCKET: 'issue-editor-media',
  persistEditorMedia: vi.fn(),
  validateEditorMedia: vi.fn(),
}))

import { getPresignedDownloadUrl } from '@/src/lib/storage/s3'
import { persistEditorMedia, validateEditorMedia } from '../_editor-media'
import { resolveProject } from '../_project-scope'
import { EditorMediaService } from '../editor-media.service'

const mockedResolve = vi.mocked(resolveProject)
const mockedPersist = vi.mocked(persistEditorMedia)
const mockedValidate = vi.mocked(validateEditorMedia)
const mockedPresign = vi.mocked(getPresignedDownloadUrl)

const membership = { role: 'MEMBER' as const, isPrivileged: false }

function projectWith(
  overrides?: Partial<ReturnType<typeof createFakeProject>>,
  members: { userId: string }[] = [{ userId: 'member-1' }],
) {
  return {
    ...createFakeProject({ id: 'proj-1', leadId: 'lead-1', ...overrides }),
    members,
    favourites: [] as { id: string }[],
  }
}

const file = { buffer: Buffer.from('x'), contentType: 'image/png' }

beforeEach(() => {
  vi.clearAllMocks()
  mockedPersist.mockResolvedValue(ok(undefined))
  mockedValidate.mockReturnValue(ok(undefined))
  mockedPresign.mockResolvedValue('https://signed.example/file')
})

describe('EditorMediaService.upload()', () => {
  it('allows the project lead to upload', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership,
      project: projectWith({ leadId: 'actor' }),
    })

    const { key, url } = expectOk(
      await EditorMediaService.upload('actor', 'ws1', 'proj-slug', file),
    )

    expect(key).toMatch(/^proj-1\/.+\.png$/)
    expect(url).toBe('https://signed.example/file')
    expect(mockedPersist).toHaveBeenCalled()
  })

  it('allows a project member to upload', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership,
      project: projectWith(undefined, [{ userId: 'actor' }]),
    })

    expectOk(await EditorMediaService.upload('actor', 'ws1', 'proj-slug', file))
  })

  it('allows a privileged workspace member to upload', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership: { role: 'ADMIN', isPrivileged: true },
      project: projectWith(),
    })

    expectOk(await EditorMediaService.upload('actor', 'ws1', 'proj-slug', file))
  })

  it('returns PROJECT_FORBIDDEN for a non-member, non-lead actor', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership,
      project: projectWith(),
    })

    const error = await EditorMediaService.upload(
      'actor',
      'ws1',
      'proj-slug',
      file,
    )
    expectErr(error, 'PROJECT_FORBIDDEN')
    expect(mockedValidate).not.toHaveBeenCalled()
  })

  it('propagates resolveProject errors', async () => {
    mockedResolve.mockResolvedValue({ ok: false, error: databaseError() })

    const result = await EditorMediaService.upload(
      'actor',
      'ws1',
      'proj-slug',
      file,
    )
    expectErr(result, 'DATABASE_ERROR')
  })

  it('propagates validation errors without persisting', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership,
      project: projectWith({ leadId: 'actor' }),
    })
    mockedValidate.mockReturnValue(
      err({ code: 'VALIDATION_ERROR', message: 'bad' } as never),
    )

    const result = await EditorMediaService.upload(
      'actor',
      'ws1',
      'proj-slug',
      file,
    )
    expectErr(result, 'VALIDATION_ERROR')
    expect(mockedPersist).not.toHaveBeenCalled()
  })

  it('propagates persistence errors', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership,
      project: projectWith({ leadId: 'actor' }),
    })
    mockedPersist.mockResolvedValue(
      err({ code: 'STORAGE_ERROR', message: 'boom' } as never),
    )

    const result = await EditorMediaService.upload(
      'actor',
      'ws1',
      'proj-slug',
      file,
    )
    expectErr(result, 'STORAGE_ERROR')
  })
})

describe('EditorMediaService.getDownloadUrl()', () => {
  it('returns a signed url for the project lead', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership,
      project: projectWith({ leadId: 'actor' }),
    })

    const { url } = expectOk(
      await EditorMediaService.getDownloadUrl(
        'actor',
        'ws1',
        'proj-slug',
        'proj-1/file.png',
      ),
    )
    expect(url).toBe('https://signed.example/file')
  })

  it('allows anyone when the project is public', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership,
      project: projectWith({ isPublic: true }),
    })

    expectOk(
      await EditorMediaService.getDownloadUrl(
        'actor',
        'ws1',
        'proj-slug',
        'proj-1/file.png',
      ),
    )
  })

  it('returns PROJECT_FORBIDDEN for a non-member on a private project', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership,
      project: projectWith(),
    })

    const result = await EditorMediaService.getDownloadUrl(
      'actor',
      'ws1',
      'proj-slug',
      'proj-1/file.png',
    )
    expectErr(result, 'PROJECT_FORBIDDEN')
  })

  it('rejects a key that does not belong to the resolved project', async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      membership,
      project: projectWith({ leadId: 'actor' }),
    })

    const result = await EditorMediaService.getDownloadUrl(
      'actor',
      'ws1',
      'proj-slug',
      'other-proj/file.png',
    )
    expectErr(result, 'VALIDATION_ERROR')
    expect(mockedPresign).not.toHaveBeenCalled()
  })

  it('propagates resolveProject errors', async () => {
    mockedResolve.mockResolvedValue({ ok: false, error: forbidden() })

    const result = await EditorMediaService.getDownloadUrl(
      'actor',
      'ws1',
      'proj-slug',
      'proj-1/file.png',
    )
    expectErr(result, 'FORBIDDEN')
  })
})
