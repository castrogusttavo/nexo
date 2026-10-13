import { act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { copyToClipboard } from '@/lib/clipboard'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { useProjectActions } from '../use-project-actions'

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: vi.fn(async () => true),
}))

const WORKSPACE_ID = 'ws-1'
const PROJECT_BASE = '/acme/projects/alpha'
const PROJECT_URL = `/api/workspaces/${WORKSPACE_ID}/projects/alpha`

function buildProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Alpha',
    slug: 'alpha',
    identifier: 'ALP',
    description: null,
    emoji: null,
    coverImage: null,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    estimatesEnabled: true,
    isFavorited: false,
    leadId: 'user-1',
    workspaceId: WORKSPACE_ID,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderActions(project = buildProject()) {
  return renderHookWithProviders(() =>
    useProjectActions(WORKSPACE_ID, PROJECT_BASE, project),
  )
}

describe('useProjectActions toggleFavorite', () => {
  it('favorites a project that is not favorites yet', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ favourited: true }),
    )
    const { result } = renderActions()

    await act(() => result.current.toggleFavorite())

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${PROJECT_URL}/favorite`,
      method: 'POST',
    })
  })

  it('unfavorites an already favorited project', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess({}))
    const { result } = renderActions(buildProject({ isFavorited: true }))

    await act(() => result.current.toggleFavorite())

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${PROJECT_URL}/favorite`,
      method: 'DELETE',
    })
  })

  it('sends one request for a double click', async () => {
    const response = deferredResponse()
    const fetchSpy = mockFetch().mockReturnValueOnce(response.promise)
    const { result } = renderActions()

    let first: Promise<void> = Promise.resolve()
    act(() => {
      first = result.current.toggleFavorite()
      void result.current.toggleFavorite()
    })

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    response.resolve(apiSuccess({ favourited: true }))
    await act(() => first)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('toogles again once the previous request settles', async () => {
    const fetchSpy = mockFetch().mockImplementation(async () =>
      apiSuccess({ favourited: true }),
    )

    const { result } = renderActions()

    await act(() => result.current.toggleFavorite())
    await act(() => result.current.toggleFavorite())

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('reports a failed favorite without rejecting', async () => {
    mockFetch().mockResolvedValue(apiError(500, 'Erro ao favoritar projeto'))
    const { result } = renderActions()

    await act(() =>
      expect(result.current.toggleFavorite()).resolves.toBe(undefined),
    )

    expect(toast.error).toHaveBeenCalledWith('Erro ao favoritar projeto')
  })
})

describe('useProjectActions archive', () => {
  it('archives the project and confirms it', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(buildProject()))
    const { result } = renderActions()

    let archived: boolean | undefined
    await act(async () => {
      archived = await result.current.archive()
    })

    expect(archived).toBe(true)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${PROJECT_URL}/archive`,
      method: 'PATCH',
    })
    expect(toast.success).toHaveBeenCalledWith('Projeto arquivado')
  })

  it('reports a failed archive without confirming it', async () => {
    mockFetch().mockResolvedValue(apiError(403, 'Sem permissão'))
    const { result } = renderActions()

    let archived: boolean | undefined
    await act(async () => {
      archived = await result.current.archive()
    })

    expect(archived).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Sem permissão')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('sends one request for a double click', async () => {
    const response = deferredResponse()
    const fetchSpy = mockFetch().mockReturnValueOnce(response.promise)
    const { result } = renderActions()

    let first: Promise<boolean> = Promise.resolve(false)
    let second: Promise<boolean> = Promise.resolve(true)
    act(() => {
      first = result.current.archive()
      second = result.current.archive()
    })

    // The dropped click archived nothing itself, so it must not navigate away.
    await expect(second).resolves.toBe(false)
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    response.resolve(apiSuccess(buildProject()))
    await act(async () => {
      await expect(first).resolves.toBe(true)
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('is not blocked by a pending favorite', async () => {
    const favorite = deferredResponse()
    const fetchSPy = mockFetch()
      .mockReturnValueOnce(favorite.promise)
      .mockResolvedValueOnce(apiSuccess(buildProject()))
    const { result } = renderActions()

    let favoriting: Promise<void> = Promise.resolve()
    act(() => {
      favoriting = result.current.toggleFavorite()
    })
    await waitFor(() => expect(fetchSPy).toHaveBeenCalledTimes(1))
    await act(() => result.current.archive())

    expect(getFetchCall(fetchSPy, 1).url).toBe(`${PROJECT_URL}/archive`)
    favorite.resolve(apiSuccess({ favorited: true }))
    await act(() => favoriting)
  })
})

describe('useProjectActions togglePublic', () => {
  it('makes a private project public', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess(buildProject({ isPublic: true })),
    )
    const { result } = renderActions()

    await act(() => result.current.togglePublic())

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: PROJECT_URL,
      method: 'PATCH',
      body: { isPublic: true },
    })
    expect(toast.success).toHaveBeenCalledWith('Projeto tornado público')
  })

  it('makes a public project private', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(buildProject()))
    const { result } = renderActions(buildProject({ isPublic: true }))

    await act(() => result.current.togglePublic())

    expect(getFetchCall(fetchSpy).body).toEqual({ isPublic: false })
    expect(toast.success).toHaveBeenCalledWith('Projeto tornado privado')
  })

  it('reports a failed change without rejecting', async () => {
    mockFetch().mockResolvedValue(apiError(403, 'Sem permissão'))
    const { result } = renderActions()

    await act(() =>
      expect(result.current.togglePublic()).resolves.toBeUndefined(),
    )

    expect(toast.error).toHaveBeenCalledWith('Sem permissão')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('sends one request for a double click', async () => {
    const response = deferredResponse()
    const fetchSpy = mockFetch().mockReturnValueOnce(response.promise)
    const { result } = renderActions()

    let first: Promise<void> = Promise.resolve()
    act(() => {
      first = result.current.togglePublic()
      void result.current.togglePublic()
    })

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    response.resolve(apiSuccess(buildProject({ isPublic: true })))
    await act(() => first)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('useProjectActions copyLink', () => {
  it('copies the absolute project url with a link confirmation', async () => {
    const { result } = renderActions()

    await act(() => result.current.copyLink())

    expect(copyToClipboard).toHaveBeenCalledWith(
      `${window.location.origin}${PROJECT_BASE}`,
      'Link copiado',
    )
  })
})
