import { act, screen, waitFor } from '@testing-library/react'
import type { Value } from 'platejs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WikiPageDTO } from '@/types/wiki-page'
import { WikiPageEditor } from '../wiki-page-editor'

const EDITED: Value = [{ type: 'p', children: [{ text: 'editado' }] }]
const EDITED_AGAIN: Value = [{ type: 'p', children: [{ text: 'de novo' }] }]

// The rich editor is a Plate/Yjs surface with its own collaboration
// transport; stub it at the module boundary and drive `onChange` by hand so
// these tests are only about the title field and the autosave around it.
vi.mock('@/components/editor/wiki-editor', () => ({
  WikiPageRichEditor: ({
    documentName,
    userName,
    content,
    onChange,
  }: {
    documentName: string
    userName: string
    content: Value
    onChange: (content: Value) => void
  }) => (
    <div>
      <p>
        Documento {documentName} por {userName}
      </p>
      <p data-testid='editor-content'>{JSON.stringify(content)}</p>
      <button type='button' onClick={() => onChange(EDITED)}>
        Editar conteúdo
      </button>
      <button type='button' onClick={() => onChange(EDITED_AGAIN)}>
        Editar de novo
      </button>
    </div>
  ),
}))

const WORKSPACE_ID = 'ws-1'
const AUTOSAVE_DELAY_MS = 1500

function buildPage(overrides: Partial<WikiPageDTO> = {}): WikiPageDTO {
  return {
    id: 'page-1',
    workspaceId: WORKSPACE_ID,
    parentId: null,
    title: 'Manual',
    icon: null,
    coverImage: null,
    content: [{ type: 'p', children: [{ text: 'original' }] }],
    position: 0,
    createdById: 'user-1',
    updatedById: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderEditor(page = buildPage()) {
  const fetchSpy = mockFetch().mockImplementation(async () =>
    apiSuccess(buildPage()),
  )
  const utils = renderWithProviders(
    <WikiPageEditor
      workspaceId={WORKSPACE_ID}
      userId='user-1'
      userName='Ana'
      page={page}
    />,
  )
  return { ...utils, fetchSpy }
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

const titleInput = () => screen.getByPlaceholderText('Sem título')

beforeEach(() => {
  // `shouldAdvanceTime` keeps `user-event`'s own delays running on the real
  // clock while the autosave debounce stays under the test's control.
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('<WikiPageEditor /> rendering', () => {
  it('opens on the stored title and content', () => {
    renderEditor()

    expect(titleInput()).toHaveValue('Manual')
    expect(screen.getByTestId('editor-content')).toHaveTextContent('original')
  })

  it('hands the page id and the signed-in author to the editor', () => {
    renderEditor()

    expect(screen.getByText('Documento page-1 por Ana')).toBeInTheDocument()
  })

  it('follows a switch to another page', () => {
    const { rerender } = renderEditor()

    rerender(
      <WikiPageEditor
        workspaceId={WORKSPACE_ID}
        userId='user-1'
        userName='Ana'
        page={buildPage({ id: 'page-2', title: 'Arquitetura' })}
      />,
    )

    expect(titleInput()).toHaveValue('Arquitetura')
  })
})

describe('<WikiPageEditor /> title', () => {
  it('saves an edited title on blur', async () => {
    const { user, fetchSpy } = renderEditor()

    await user.clear(titleInput())
    await user.type(titleInput(), 'Manual v2')
    await user.tab()

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `/api/workspaces/${WORKSPACE_ID}/wiki/page-1`,
      method: 'PATCH',
      body: { title: 'Manual v2' },
    })
  })

  it('keeps the typed title while the field is still focused', async () => {
    const { user, fetchSpy } = renderEditor()

    await user.type(titleInput(), ' v2')

    expect(titleInput()).toHaveValue('Manual v2')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not save a title that was not changed', async () => {
    const { user, fetchSpy } = renderEditor()

    await user.click(titleInput())
    await user.tab()

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('<WikiPageEditor /> content autosave', () => {
  it('waits out the debounce before saving an edit', async () => {
    const { user, fetchSpy } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Editar conteúdo' }))
    await advance(AUTOSAVE_DELAY_MS / 3)
    expect(fetchSpy).not.toHaveBeenCalled()

    await advance(AUTOSAVE_DELAY_MS)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `/api/workspaces/${WORKSPACE_ID}/wiki/page-1`,
      method: 'PATCH',
      body: { content: EDITED },
    })
  })

  it('collapses a burst of edits into one save of the latest content', async () => {
    const { user, fetchSpy } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Editar conteúdo' }))
    await advance(AUTOSAVE_DELAY_MS / 3)
    await user.click(screen.getByRole('button', { name: 'Editar de novo' }))
    await advance(AUTOSAVE_DELAY_MS)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).toEqual({ content: EDITED_AGAIN })
  })

  it('drops a pending save when the editor unmounts', async () => {
    const { user, fetchSpy, unmount } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Editar conteúdo' }))
    unmount()
    await advance(AUTOSAVE_DELAY_MS * 2)

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
