import { act, screen, waitFor } from '@testing-library/react'
import type { Value } from 'platejs'
import type { PlateEditor } from 'platejs/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'

// Slate reads the browser's beforeinput and selection events, which jsdom does
// not fire for user-event typing. The tests drive the editor through its own
// transforms instead; the instance is picked up as the component creates it.
const { captured } = vi.hoisted(() => ({
  captured: { editor: null as unknown },
}))

vi.mock('platejs/react', async (importOriginal) => {
  const original = await importOriginal<typeof import('platejs/react')>()
  return {
    ...original,
    usePlateEditor: (...args: Parameters<typeof original.usePlateEditor>) => {
      const editor = original.usePlateEditor(...args)
      captured.editor = editor
      return editor
    },
  }
})

import { TextEditor } from '../text-editor'

const editor = () => captured.editor as PlateEditor

// Puts the cursor at the end of the first block, then types.
async function typeIntoEditor(text: string) {
  await act(async () => {
    editor().tf.select(editor().api.end([]) as never)
    editor().tf.insertText(text)
  })
}

const DOC: Value = [{ type: 'p', children: [{ text: 'olá mundo' }] }]
const EMPTY: Value = [{ type: 'p', children: [{ text: '' }] }]

function renderEditor(
  props: Partial<React.ComponentProps<typeof TextEditor>> = {},
) {
  return renderWithProviders(
    <TextEditor
      workspaceId='ws-1'
      userId='user-1'
      userName='Ana'
      value={DOC}
      {...props}
    />,
  )
}

// Slate marks the editable root; other textboxes (the "/" input) can sit inside.
const textbox = () => {
  const root = document.querySelector<HTMLElement>('[data-slate-editor="true"]')
  if (!root) throw new Error('editor not rendered')
  return root
}
const editorReady = () =>
  waitFor(() =>
    expect(
      document.querySelector('[data-slate-editor="true"]'),
    ).not.toBeNull(),
  )

beforeEach(() => {
  captured.editor = null
})

describe('<TextEditor /> rendering', () => {
  it('shows the document with no wiki page behind it', async () => {
    renderEditor()

    expect(await screen.findByText('olá mundo')).toBeInTheDocument()
  })

  it('has no fixed toolbar above the text', async () => {
    renderEditor()
    await screen.findByText('olá mundo')

    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('shows the placeholder on an empty document', async () => {
    renderEditor({ value: EMPTY, placeholder: 'Escreva aqui' })

    await waitFor(() =>
      expect(
        document.querySelector('[data-slate-placeholder]'),
      ).toHaveTextContent('Escreva aqui'),
    )
  })

  it('is editable by default and not when readOnly', async () => {
    const { unmount } = renderEditor()
    await editorReady()
    expect(textbox()).toHaveAttribute('contenteditable', 'true')
    unmount()

    renderEditor({ readOnly: true })
    await editorReady()
    expect(textbox()).toHaveAttribute('contenteditable', 'false')
  })
})

describe('<TextEditor /> editing', () => {
  it('reports the new document when the text changes', async () => {
    const onChange = vi.fn()
    renderEditor({ value: EMPTY, onChange })
    await editorReady()

    await typeIntoEditor('abc')

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const last = onChange.mock.calls.at(-1)?.[0] as Value
    expect(last[0]).toMatchObject({
      type: 'p',
      children: [{ text: 'abc' }],
    })
  })

  it('shows what was typed in the page', async () => {
    renderEditor({ value: EMPTY })
    await editorReady()

    await typeIntoEditor('olá')

    expect(await screen.findByText('olá')).toBeInTheDocument()
  })

  it('works without an onChange', async () => {
    renderEditor({ value: EMPTY })
    await editorReady()

    await expect(typeIntoEditor('abc')).resolves.toBeUndefined()
  })
})

describe('<TextEditor /> "/" command menu', () => {
  it('opens the menu with the blocks when "/" is typed', async () => {
    renderEditor({ value: EMPTY })
    await editorReady()

    await typeIntoEditor('/')

    expect(await screen.findByText('Título 1')).toBeInTheDocument()
    expect(screen.getByText('Lista de tarefas')).toBeInTheDocument()
    expect(screen.getByText('Tabela')).toBeInTheDocument()
  })

  it('offers the advanced blocks too', async () => {
    renderEditor({ value: EMPTY })
    await editorReady()

    await typeIntoEditor('/')

    expect(await screen.findByText('Sumário')).toBeInTheDocument()
    expect(screen.getByText('Excalidraw')).toBeInTheDocument()
  })

  it('turns the block into the chosen type', async () => {
    const onChange = vi.fn()
    const { user } = renderEditor({ value: EMPTY, onChange })
    await editorReady()

    await typeIntoEditor('/')
    await user.click(await screen.findByText('Título 1'))

    await waitFor(() => {
      const last = onChange.mock.calls.at(-1)?.[0] as Value
      expect(last?.[0]).toMatchObject({ type: 'h1' })
    })
  })
})
