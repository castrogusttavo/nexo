import { render, screen } from '@testing-library/react'
import { Plate, usePlateEditor } from 'platejs/react'
import { describe, expect, it, vi } from 'vitest'
import { BasicNodesKit } from '../../plugins/basic-nodes-kit'
import { FloatingToolbarButtons } from '../floating-toolbar-buttons'
import { Toolbar as ToolbarRoot } from '../toolbar'

// The real button needs the discussion plugin (and so a wiki page); what is
// tested here is only whether the toolbar renders it.
vi.mock('../comment-toolbar-button', () => ({
  CommentToolbarButton: () => <button type='button'>Comentar</button>,
}))

function Toolbar(props: React.ComponentProps<typeof FloatingToolbarButtons>) {
  const editor = usePlateEditor({ plugins: BasicNodesKit })
  return (
    <Plate editor={editor}>
      <ToolbarRoot>
        <FloatingToolbarButtons {...props} />
      </ToolbarRoot>
    </Plate>
  )
}

// The formatting buttons are icon-only toggles (role "radio") with a hover
// tooltip, so they are counted, not looked up by name.
const toolbarButtons = (container: HTMLElement) =>
  container.querySelectorAll('button').length

describe('<FloatingToolbarButtons />', () => {
  it('offers "Comentar" by default, as the wiki does', () => {
    render(<Toolbar />)

    expect(screen.getByRole('button', { name: 'Comentar' })).toBeInTheDocument()
  })

  it('offers "Comentar" when comments are on', () => {
    render(<Toolbar comments />)

    expect(screen.getByRole('button', { name: 'Comentar' })).toBeInTheDocument()
  })

  it('leaves only "Comentar" out when comments are off', () => {
    const on = render(<Toolbar comments />)
    const withComments = toolbarButtons(on.container)
    on.unmount()

    const off = render(<Toolbar comments={false} />)

    expect(
      screen.queryByRole('button', { name: 'Comentar' }),
    ).not.toBeInTheDocument()
    expect(toolbarButtons(off.container)).toBe(withComments - 1)
  })

  it('still offers the formatting toggles without comments', () => {
    render(<Toolbar comments={false} />)

    // bold, italic, underline, strikethrough, code
    expect(screen.getAllByRole('radio').length).toBeGreaterThanOrEqual(5)
  })
})
