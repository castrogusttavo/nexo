import { act, renderHook } from '@testing-library/react'
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderHookWithProviders } from '@/src/__tests__/helpers/component'
import { useIssueLayout } from '../use-issue-layout'

// The shared helper does not expose `onUrlUpdate`; a local wrapper lets
// these tests assert what the hook writes back to the query string.
function renderWithUrlSpy(searchParams = '') {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        {children}
      </NuqsTestingAdapter>
    )
  }
  return {
    ...renderHook(() => useIssueLayout(), { wrapper: Wrapper }),
    onUrlUpdate,
  }
}

describe('useIssueLayout', () => {
  it('defaults to the list layout', () => {
    const { result } = renderHookWithProviders(() => useIssueLayout())

    expect(result.current[0]).toBe('list')
  })

  it.each([
    'kanban',
    'calendar',
    'table',
    'timeline',
  ] as const)('reads %s from ?layout=', (layout) => {
    const { result } = renderHookWithProviders(() => useIssueLayout(), {
      searchParams: { layout },
    })

    expect(result.current[0]).toBe(layout)
  })

  it('falls back to list for an unknown layout', () => {
    const { result } = renderHookWithProviders(() => useIssueLayout(), {
      searchParams: { layout: 'gantt' },
    })

    expect(result.current[0]).toBe('list')
  })

  it('writes the layout to the URL with a non-shallow update', async () => {
    const { result, onUrlUpdate } = renderWithUrlSpy()

    await act(() => result.current[1]('kanban'))

    expect(result.current[0]).toBe('kanban')
    const event = onUrlUpdate.mock.lastCall?.[0]
    expect(event?.searchParams.get('layout')).toBe('kanban')
    // Server components re-render with the new layout.
    expect(event?.options.shallow).toBe(false)
  })

  it('drops ?layout= when reset', async () => {
    const { result, onUrlUpdate } = renderWithUrlSpy('?layout=table')

    await act(() => result.current[1](null))

    expect(result.current[0]).toBe('list')
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('')
  })
})
