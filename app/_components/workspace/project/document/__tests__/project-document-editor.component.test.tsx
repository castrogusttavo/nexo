import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { ProjectDocumentEditor } from '../project-document-editor'

// The Plate/Yjs editor needs a socket and a real DOM; what matters here is
// what the wrapper hands it and what it does with onChange.
vi.mock('@/components/editor/collab-text-editor', () => ({
  CollabTextEditor: ({
    documentName,
    readOnly,
    content,
    onChange,
  }: {
    documentName: string
    readOnly?: boolean
    content: unknown[]
    onChange?: (value: unknown[]) => void
  }) => (
    <div>
      <span data-testid='doc-name'>{documentName}</span>
      <span data-testid='read-only'>{String(!!readOnly)}</span>
      <span data-testid='seed'>{JSON.stringify(content)}</span>
      <button
        type='button'
        onClick={() =>
          onChange?.([{ type: 'p', children: [{ text: 'novo' }] }])
        }
      >
        digitar
      </button>
    </div>
  ),
}))

const URL = '/api/workspaces/ws-1/projects/alpha/document'
const saved = {
  content: [{ type: 'p', children: [{ text: 'salvo' }] }],
  updatedAt: '2026-11-16T10:00:00.000Z',
}

function renderEditor(canManage: boolean) {
  return renderWithProviders(
    <ProjectDocumentEditor
      workspaceId='ws-1'
      projectId='proj-1'
      projectSlug='alpha'
      userId='user-1'
      userName='Ana'
      canManage={canManage}
    />,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ProjectDocumentEditor', () => {
  it('renders nothing until the snapshot arrives', () => {
    mockFetch().mockReturnValue(new Promise(() => undefined))

    renderEditor(true)

    expect(screen.queryByTestId('doc-name')).not.toBeInTheDocument()
  })

  it('joins the project:{id} document seeded with the snapshot', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(saved))

    renderEditor(true)

    expect(await screen.findByTestId('doc-name')).toHaveTextContent(
      'project:proj-1',
    )
    expect(screen.getByTestId('seed')).toHaveTextContent('salvo')
  })

  it('seeds an empty paragraph when nothing was saved yet', async () => {
    mockFetch().mockResolvedValueOnce(
      apiSuccess({ content: [], updatedAt: null }),
    )

    renderEditor(true)

    const seed = await screen.findByTestId('seed')
    expect(JSON.parse(seed.textContent ?? '[]')).toEqual([
      { type: 'p', children: [{ text: '' }] },
    ])
  })

  it('opens read-only for someone who cannot manage the project', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(saved))

    renderEditor(false)

    expect(await screen.findByTestId('read-only')).toHaveTextContent('true')
  })

  it('debounces the snapshot save into a single PUT', async () => {
    const fetchSpy = mockFetch()
      .mockResolvedValueOnce(apiSuccess(saved))
      .mockResolvedValueOnce(apiSuccess(saved))
    const { user } = renderEditor(true)

    const button = await screen.findByRole('button', { name: 'digitar' })
    await user.click(button)
    await user.click(button)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(getFetchCall(fetchSpy, 1)).toMatchObject({
      url: URL,
      method: 'PUT',
      body: { content: [{ type: 'p', children: [{ text: 'novo' }] }] },
    })
  })

  it('never saves a snapshot for a read-only viewer', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(saved))
    const { user } = renderEditor(false)

    await user.click(await screen.findByRole('button', { name: 'digitar' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
