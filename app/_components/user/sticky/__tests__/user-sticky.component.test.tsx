import { screen, waitFor } from '@testing-library/react'
import type { JSONContent } from '@tiptap/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { StickyNoteDTO } from '@/types/sticky-note'
import { UserStick } from '../user-sticky'

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

// ProseMirror needs layout APIs jsdom does not implement (`getClientRects`),
// so the editor is replaced by a textarea that drives the same callbacks:
// typing is a doc-changing update, an arrow key is an update that leaves the
// doc alone, and blurring calls `onBlur`. `chain()` records the commands the
// toolbar runs.
const tiptap = vi.hoisted(() => ({
  commands: [] as string[],
}))

vi.mock('@tiptap/react', () => {
  type Transaction = { docChanged: boolean }
  type Options = {
    content?: JSONContent
    onUpdate?: (payload: { editor: Editor; transaction: Transaction }) => void
    onBlur?: () => void
  }
  type Chain = {
    focus: () => Chain
    toggleBold: () => Chain
    toggleItalic: () => Chain
    toggleTaskList: () => Chain
    run: () => boolean
  }
  type Editor = { getJSON: () => JSONContent; chain: () => Chain }

  let current: JSONContent = { type: 'doc', content: [] }
  let options: Options = {}

  function docOf(text: string): JSONContent {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    }
  }

  function chain(): Chain {
    const link: Chain = {
      focus: () => link,
      toggleBold: () => {
        tiptap.commands.push('bold')
        return link
      },
      toggleItalic: () => {
        tiptap.commands.push('italic')
        return link
      },
      toggleTaskList: () => {
        tiptap.commands.push('taskList')
        return link
      },
      run: () => true,
    }
    return link
  }

  const editor: Editor = { getJSON: () => current, chain }

  return {
    useEditor: (next: Options) => {
      options = next
      current = next.content ?? current
      return editor
    },
    EditorContent: () => (
      <textarea
        aria-label='Nota'
        onChange={(event) => {
          current = docOf(event.target.value)
          options.onUpdate?.({ editor, transaction: { docChanged: true } })
        }}
        onKeyUp={(event) => {
          if (event.key.startsWith('Arrow'))
            options.onUpdate?.({ editor, transaction: { docChanged: false } })
        }}
        onBlur={() => options.onBlur?.()}
      />
    ),
  }
})

const STICKY: StickyNoteDTO = {
  id: 'sticky-1',
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nota' }] }],
  },
  color: 'BLUE',
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function renderSticky(sticky: StickyNoteDTO = STICKY) {
  const utils = renderWithProviders(<UserStick sticky={sticky} />)
  const card = utils.container.firstElementChild
  if (!(card instanceof HTMLElement)) throw new Error('No sticky card')
  return { ...utils, card }
}

const noteEditor = () => screen.getByLabelText('Nota')

/** The toolbar is icon-only: each button is addressed by its aria-label. */
function toolbarButton(name: string) {
  return screen.getByRole('button', { name })
}

const DEBOUNCE = { timeout: 2000 }

function docWith(text: string): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

beforeEach(() => {
  tiptap.commands.length = 0
})

describe('<UserStick /> rendering', () => {
  it('paints the sticky in its own colour', () => {
    const { card } = renderSticky()

    expect(card).toHaveClass('bg-blue-950')
  })

  it('falls back to zinc for a colour with no swatch', () => {
    const { card } = renderSticky({
      ...STICKY,
      color: 'CYAN' as StickyNoteDTO['color'],
    })

    expect(card).toHaveClass('bg-zinc-950')
  })
})

describe('<UserStick /> content saving', () => {
  it('saves the edited content once the typing settles', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ ...STICKY, content: docWith('Nota nova') }),
    )
    const { user } = renderSticky()

    await user.type(noteEditor(), 'Nota nova')

    expect(fetchSpy).not.toHaveBeenCalled()
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1), DEBOUNCE)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/sticky-notes/sticky-1',
      method: 'PATCH',
      body: { content: docWith('Nota nova') },
    })
  })

  it('flushes the pending content on blur instead of waiting', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(STICKY))
    const { user } = renderSticky()

    await user.type(noteEditor(), 'Rascunho')
    await user.tab()

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).toEqual({
      content: docWith('Rascunho'),
    })
  })

  it('does not save when the blur has nothing pending', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderSticky()

    await user.click(noteEditor())
    await user.tab()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('ignores an update that leaves the document untouched', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderSticky()

    await user.click(noteEditor())
    await user.keyboard('{ArrowRight}')
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports a failed content save', async () => {
    mockFetch().mockResolvedValue(apiError(500, 'Erro ao atualizar sticky'))
    const { user } = renderSticky()

    await user.type(noteEditor(), 'x')
    await user.tab()

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar sticky'),
    )
  })

  it('drops a scheduled save when the sticky unmounts', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(STICKY))
    const { user, unmount } = renderSticky()

    await user.type(noteEditor(), 'x')
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('<UserStick /> toolbar', () => {
  it('runs the formatting commands on the editor', async () => {
    const { user } = renderSticky()

    await user.click(toolbarButton('Negrito'))
    await user.click(toolbarButton('Itálico'))
    await user.click(toolbarButton('Lista de tarefas'))

    expect(tiptap.commands).toEqual(['bold', 'italic', 'taskList'])
  })

  it('repaints the sticky and saves the picked colour', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ ...STICKY, color: 'RED' }),
    )
    const { user, card } = renderSticky()

    await user.click(toolbarButton('Cor da nota'))
    const swatch = await screen.findByRole('dialog')
    await user.click(
      swatch.querySelectorAll('button')[0] as HTMLButtonElement, // RED
    )

    expect(card).toHaveClass('bg-red-950')
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/sticky-notes/sticky-1',
      method: 'PATCH',
      body: { color: 'RED' },
    })
  })

  it('reports a failed colour change', async () => {
    mockFetch().mockResolvedValue(apiError(500, 'Erro ao atualizar sticky'))
    const { user } = renderSticky()

    await user.click(toolbarButton('Cor da nota'))
    const swatch = await screen.findByRole('dialog')
    await user.click(swatch.querySelectorAll('button')[0] as HTMLButtonElement)

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar sticky'),
    )
  })

  it('deletes the sticky', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(null))
    const { user } = renderSticky()

    await user.click(toolbarButton('Excluir nota'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/sticky-notes/sticky-1',
      method: 'DELETE',
    })
  })

  it('reports a failed delete', async () => {
    mockFetch().mockResolvedValue(apiError(403, 'Sem permissão'))
    const { user } = renderSticky()

    await user.click(toolbarButton('Excluir nota'))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Sem permissão'),
    )
  })
})
