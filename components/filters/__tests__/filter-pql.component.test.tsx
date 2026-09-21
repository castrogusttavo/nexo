import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { describe, expect, it, vi } from 'vitest'
import { FilterPql } from '../filter-pql'

// The shared helper hides nuqs' `onUrlUpdate`, and what this component owes
// the page is exactly when the draft reaches the URL — so it is mounted with
// the testing adapter directly.
function renderPql(pql = '') {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
  const utils = render(
    <NuqsTestingAdapter
      searchParams={pql ? { mode: 'pql', pql } : { mode: 'pql' }}
      onUrlUpdate={onUrlUpdate}
      hasMemory
    >
      <FilterPql />
    </NuqsTestingAdapter>,
  )
  return { ...utils, onUrlUpdate, user: userEvent.setup() }
}

const input = () => screen.getByRole('textbox', { name: 'Consulta PQL' })
const writtenPql = (spy: ReturnType<typeof renderPql>['onUrlUpdate']) =>
  spy.mock.calls.map(([event]) => event.searchParams.get('pql'))

describe('<FilterPql />', () => {
  it('shows the lexer message for an unterminated string', async () => {
    const { user } = renderPql()

    await user.type(input(), 'title = "aberto')

    expect(screen.getByText('String não fechada')).toBeInTheDocument()
    expect(input()).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows the parser message and clears it once the query is valid', async () => {
    const { user } = renderPql()

    await user.type(input(), 'priority =')
    expect(input()).toHaveAttribute('aria-invalid', 'true')

    await user.type(input(), ' HIGH')
    expect(input()).toHaveAttribute('aria-invalid', 'false')
  })

  it('writes the draft to the URL once typing pauses', async () => {
    const { user, onUrlUpdate } = renderPql()

    await user.type(input(), 'isOverdue()')

    await waitFor(() =>
      expect(writtenPql(onUrlUpdate).at(-1)).toBe('isOverdue()'),
    )
  })

  it('flushes an edit still waiting on the pause when it unmounts', async () => {
    const { user, onUrlUpdate, unmount } = renderPql()

    await user.type(input(), 'hasNoLabel()')
    expect(onUrlUpdate).not.toHaveBeenCalled()
    unmount()

    await waitFor(() =>
      expect(writtenPql(onUrlUpdate)).toEqual(['hasNoLabel()']),
    )
  })

  it('does not write again on unmount when the URL already has the draft', async () => {
    const { user, onUrlUpdate, unmount } = renderPql()

    await user.type(input(), 'hasNoLabel()')
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1))
    unmount()

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(onUrlUpdate).toHaveBeenCalledTimes(1)
  })
})
