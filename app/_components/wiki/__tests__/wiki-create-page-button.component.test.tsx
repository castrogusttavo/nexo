import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  createTestQueryClient,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { WikiCreatePageButton } from '../wiki-create-page-button'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const WORKSPACE_ID = 'ws-1'
const WIKI_URL = `/api/workspaces/${WORKSPACE_ID}/wiki`

function renderButton() {
  const queryClient = createTestQueryClient()
  return {
    ...renderWithProviders(
      <WikiCreatePageButton workspaceId={WORKSPACE_ID} workspaceSlug='acme' />,
      { queryClient },
    ),
    queryClient,
  }
}

const createButton = () => screen.getByRole('button', { name: 'Nova Página' })

beforeEach(() => {
  push.mockReset()
})

describe('<WikiCreatePageButton />', () => {
  it('creates an untitled page and opens it', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ id: 'page-1' }, 201),
    )
    const { user } = renderButton()

    await user.click(createButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: WIKI_URL,
      method: 'POST',
      body: {},
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/acme/wiki/page-1'))
  })

  it('refreshes the page list once the page exists', async () => {
    mockFetch().mockResolvedValue(apiSuccess({ id: 'page-1' }, 201))
    const { user, queryClient } = renderButton()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(createButton())

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['wiki-pages', WORKSPACE_ID],
      }),
    )
  })

  it('blocks a second click while the first one is in flight', async () => {
    const deferred = deferredResponse()
    const fetchSpy = mockFetch().mockReturnValueOnce(deferred.promise)
    const { user } = renderButton()

    await user.click(createButton())
    await waitFor(() => expect(createButton()).toBeDisabled())
    await user.click(createButton())

    expect(fetchSpy).toHaveBeenCalledTimes(1)

    deferred.resolve(apiSuccess({ id: 'page-1' }, 201))
    await waitFor(() => expect(createButton()).toBeEnabled())
  })

  it('stays on the current page when the creation fails', async () => {
    mockFetch().mockResolvedValue(apiError(403, 'Sem permissão'))
    const { user } = renderButton()

    await user.click(createButton())

    await waitFor(() => expect(createButton()).toBeEnabled())
    expect(push).not.toHaveBeenCalled()
  })
})
